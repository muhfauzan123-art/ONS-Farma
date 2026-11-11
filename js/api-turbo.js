/**
 * ONS FARMA DIGITAL ENTERPRISE v10.0 - Scale Turbo REST Client & Offline Sync Engine
 * Memenuhi penuh panduan /gas-pro-api dan /gas-scale-turbo:
 * - Mengirim POST dengan header WAJIB 'Content-Type': 'text/plain;charset=utf-8' agar bebas CORS preflight
 * - Deduplikasi in-flight request (klik berulang tidak mengirim request kembar)
 * - Cache SWR instan (<50ms) + invalidasi epoch saat ada mutasi (_writeEpoch)
 * - Bundling otomatis panggilan paralel ke action="batch"
 * - Offline Emergency Queue + Sinkronisasi otomatis saat kembali online
 */
(function (global) {
  'use strict';

  const SESSION_KEY = 'ons_farma_v10_session';
  const OFFLINE_Q_KEY = 'ons_farma_v10_offline_queue';
  const MODE_KEY = 'ons_farma_v10_mode_override';

  const _inflight = new Map();
  let _writeEpoch = Number(localStorage.getItem('ons_v10_epoch') || '1');
  let _lastLatencyMs = 0;
  let _batchQueue = [];
  let _batchScheduled = false;

  function isDemoMode() {
    const ovr = String(localStorage.getItem(MODE_KEY) || '').toUpperCase();
    if (ovr === 'DEMO') return true;
    if (ovr === 'LIVE') return false;
    const url = (global.ONS_CONFIG && global.ONS_CONFIG.GAS_URL) || '';
    return !url || url.indexOf('GANTI_DENGAN_ID') !== -1;
  }

  function setModeOverride(mode) {
    const clean = String(mode || 'AUTO').toUpperCase();
    if (clean === 'AUTO') localStorage.removeItem(MODE_KEY);
    else localStorage.setItem(MODE_KEY, clean);
  }

  function getSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function setSession(ses) {
    if (!ses) localStorage.removeItem(SESSION_KEY);
    else localStorage.setItem(SESSION_KEY, JSON.stringify(ses));
  }

  function _cacheKey(action, data) {
    return 'ons_swr_' + action + '_e' + _writeEpoch + '_' + JSON.stringify(data || {}).slice(0, 64);
  }

  function getCachedRead(action, data) {
    try {
      const raw = localStorage.getItem(_cacheKey(action, data));
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function setCachedRead(action, data, val) {
    try {
      localStorage.setItem(_cacheKey(action, data), JSON.stringify(val));
    } catch (e) {}
  }

  function bumpClientEpoch() {
    _writeEpoch++;
    try { localStorage.setItem('ons_v10_epoch', String(_writeEpoch)); } catch (e) {}
  }

  async function callApi(action, data, opts) {
    const o = opts || {};
    const ses = getSession();
    const token = o.token !== undefined ? o.token : (ses && ses.token ? ses.token : '');
    const cabang = (ses && ses.user && ses.user.cabang_id) || (global.ONS_CONFIG && global.ONS_CONFIG.DEFAULT_BRANCH) || 'ONS-01';

    if (isDemoMode()) {
      const payloadUser = ses && ses.user ? {
        uid: ses.user.id_user,
        nama: ses.user.nama_lengkap,
        role: ses.user.role,
        sipa: ses.user.no_sipa,
        branch: cabang
      } : null;
      return global.ONSDemoEngine.handleAction(action, data || {}, payloadUser);
    }

    const reqKey = !o.isWrite ? (action + ':' + JSON.stringify(data || {})) : null;
    if (reqKey && _inflight.has(reqKey)) {
      return _inflight.get(reqKey);
    }

    const execFetch = async () => {
      const reqId = o.requestId || (o.isWrite ? ('REQ-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6)) : '');
      const bodyPayload = {
        action: action,
        token: token,
        cabang_id: cabang,
        request_id: reqId,
        data: data || {}
      };
      const maxAttempts = o.isWrite ? 1 : 2;
      let lastErr = null;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const t0 = performance.now();
          // WAJIB text/plain;charset=utf-8 untuk bebas CORS preflight ke GAS Web App!
          const resp = await fetch(global.ONS_CONFIG.GAS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(bodyPayload),
            redirect: 'follow'
          });

          const json = await resp.json();
          _lastLatencyMs = Math.round(performance.now() - t0);
          const badge = document.getElementById('apiLatencyBadge');
          if (badge) badge.textContent = 'v13.2 • ' + _lastLatencyMs + 'ms';

          if (!json.ok) {
            if (json.code === 401) {
              setSession(null);
              if (typeof global.renderApp === 'function') global.renderApp();
            }
            const apiErr = new Error(json.error || 'Terjadi kesalahan pada server GAS.');
            apiErr.code = json.code || 500;
            throw apiErr;
          }

          if (o.isWrite) {
            bumpClientEpoch();
          } else {
            setCachedRead(action, data, json.data);
          }
          return json.data;
        } catch (err) {
          lastErr = err;
          if (attempt < maxAttempts && (!err.code || err.code >= 500)) {
            await new Promise((res) => setTimeout(res, 350));
            continue;
          }
          throw err;
        }
      }
      throw lastErr;
    };

    const p = execFetch().finally(() => {
      if (reqKey) _inflight.delete(reqKey);
    });
    if (reqKey) _inflight.set(reqKey, p);
    return p;
  }

  /**
   * Tick Batcher: Menggabungkan beberapa panggilan paralel dalam satu event-loop tick
   */
  function callBatched(action, data) {
    if (isDemoMode()) return callApi(action, data);
    return new Promise((resolve, reject) => {
      _batchQueue.push({ action, data, resolve, reject });
      if (!_batchScheduled) {
        _batchScheduled = true;
        queueMicrotask(async () => {
          const jobs = _batchQueue.splice(0, _batchQueue.length);
          _batchScheduled = false;
          if (jobs.length === 1) {
            try { resolve(await callApi(jobs[0].action, jobs[0].data)); } catch (e) { jobs[0].reject(e); }
            return;
          }
          try {
            const batchRes = await callApi('batch', {
              calls: jobs.map((j) => ({ action: j.action, data: j.data }))
            });
            const list = (batchRes && batchRes.calls) || [];
            jobs.forEach((j, idx) => {
              const r = list[idx];
              if (r && r.ok) j.resolve(r.data);
              else j.reject(new Error((r && r.error) || 'Batch call failed'));
            });
          } catch (err) {
            jobs.forEach((j) => j.reject(err));
          }
        });
      }
    });
  }

  /**
   * Offline Emergency POS Queue Manager
   */
  function getOfflineQueue() {
    try {
      return JSON.parse(localStorage.getItem(OFFLINE_Q_KEY) || '[]');
    } catch (e) { return []; }
  }

  function pushOfflineQueue(txPayload) {
    const q = getOfflineQueue();
    const item = Object.assign({ offline_sync_id: 'OFF-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6), saved_at: new Date().toISOString() }, txPayload);
    q.push(item);
    localStorage.setItem(OFFLINE_Q_KEY, JSON.stringify(q));
    return item;
  }

  async function flushOfflineQueue() {
    const q = getOfflineQueue();
    if (!q.length || !navigator.onLine) return { synced: 0 };
    try {
      await callApi('pos.syncOfflineQueue', { items: q }, { isWrite: true });
      localStorage.setItem(OFFLINE_Q_KEY, '[]');
      return { synced: q.length };
    } catch (e) {
      return { synced: 0, error: e.message };
    }
  }

  global.addEventListener('online', () => {
    flushOfflineQueue().then((res) => {
      if (res.synced > 0 && typeof global.toast === 'function') {
        global.toast(res.synced + ' transaksi antrean offline berhasil disinkronkan ke Google Sheets.', 'ok');
        if (typeof global.bootLoadState === 'function') global.bootLoadState(true);
      }
    });
  });

  global.ONSApi = {
    isDemoMode,
    setModeOverride,
    getSession,
    setSession,
    callApi,
    callBatched,
    getCachedRead,
    bumpClientEpoch,
    getOfflineQueue,
    pushOfflineQueue,
    flushOfflineQueue,
    getLastLatency: () => _lastLatencyMs
  };
})(window);
