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
      const sessRaw = sessionStorage.getItem(SESSION_KEY);
      if (sessRaw) return JSON.parse(sessRaw);
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function setSession(ses) {
    if (!ses) {
      try { sessionStorage.removeItem(SESSION_KEY); } catch (e) {}
      try { localStorage.removeItem(SESSION_KEY); } catch (e) {}
      clearCachedReads();
    } else {
      try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(ses)); } catch (e) {}
      try { localStorage.setItem(SESSION_KEY, JSON.stringify(ses)); } catch (e) {}
    }
  }

  let _lastWarmupTs = 0;

  function _hashStr(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return (hash >>> 0).toString(36);
  }

  function _cacheKey(action, data) {
    const raw = JSON.stringify(data || {});
    return 'ons_swr_' + action + '_e' + _writeEpoch + '_' + _hashStr(raw);
  }

  function getCachedReadEntry(action, data) {
    try {
      const raw = localStorage.getItem(_cacheKey(action, data));
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && typeof parsed.ts === 'number' && Object.prototype.hasOwnProperty.call(parsed, 'data')) {
        return { data: parsed.data, ts: parsed.ts, ageMs: Math.max(0, Date.now() - parsed.ts) };
      }
      return { data: parsed, ts: 0, ageMs: Infinity };
    } catch (e) { return null; }
  }

  function getCachedRead(action, data) {
    const entry = getCachedReadEntry(action, data);
    return entry ? entry.data : null;
  }

  function setCachedRead(action, data, val) {
    try {
      localStorage.setItem(_cacheKey(action, data), JSON.stringify({ ts: Date.now(), data: val }));
    } catch (e) {}
  }

  function warmUpBackend(force) {
    try {
      if (isDemoMode() || typeof fetch !== 'function') return false;
      const url = global.ONS_CONFIG && global.ONS_CONFIG.GAS_URL;
      if (!url || url.indexOf('GANTI_DENGAN_ID') !== -1) return false;
      const now = Date.now();
      if (!force && _lastWarmupTs && (now - _lastWarmupTs) < 90000) return false;
      _lastWarmupTs = now;
      const sep = url.indexOf('?') === -1 ? '?' : '&';
      Promise.resolve(fetch(url + sep + 'action=ping&t=' + now, {
        method: 'GET',
        mode: 'cors',
        redirect: 'follow',
        cache: 'no-store'
      })).catch(() => {});
      return true;
    } catch (e) { return false; }
  }

  async function _fetchWithTimeout(url, fetchOpts, timeoutMs) {
    if (typeof AbortController !== 'function' || !timeoutMs) {
      return fetch(url, fetchOpts);
    }
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const optsWithSig = Object.assign({}, fetchOpts, { signal: ctrl.signal });
      return await fetch(url, optsWithSig);
    } catch (err) {
      if (err && err.name === 'AbortError') {
        const tErr = new Error('Koneksi server melebihi batas waktu (' + Math.round(timeoutMs / 1000) + ' dtk).');
        tErr.code = 504;
        throw tErr;
      }
      throw err;
    } finally {
      clearTimeout(tid);
    }
  }

  function bumpClientEpoch() {
    _writeEpoch++;
    try { localStorage.setItem('ons_v10_epoch', String(_writeEpoch)); } catch (e) {}
    _pruneOldEpochCache();
    if (global.ONSStore && typeof global.ONSStore.invalidateStockIndex === 'function') {
      global.ONSStore.invalidateStockIndex();
    }
  }

  function _pruneOldEpochCache() {
    try {
      const prefix = 'ons_swr_';
      const keepToken = '_e' + _writeEpoch + '_';
      const toRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.indexOf(prefix) === 0 && k.indexOf(keepToken) === -1) {
          toRemove.push(k);
        }
      }
      toRemove.forEach((k) => localStorage.removeItem(k));
    } catch (e) {}
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
      const demoRes = await global.ONSDemoEngine.handleAction(action, data || {}, payloadUser);
      if (o.isWrite && global.ONSStore && typeof global.ONSStore.invalidateStockIndex === 'function') {
        global.ONSStore.invalidateStockIndex();
      }
      return demoRes;
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
          const reqTimeoutMs = o.isWrite ? 45000 : 18000;
          const resp = await _fetchWithTimeout(global.ONS_CONFIG.GAS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(bodyPayload),
            redirect: 'follow'
          }, reqTimeoutMs);

          const json = await resp.json();
          _lastLatencyMs = Math.round(performance.now() - t0);
          const doc = typeof document !== 'undefined' ? document : (global.document || null);
          const badge = doc && typeof doc.getElementById === 'function' ? doc.getElementById('apiLatencyBadge') : null;
          if (badge) {
            const verStr = (global.ONS_CONFIG && global.ONS_CONFIG.APP_VERSION) ? ('v' + global.ONS_CONFIG.APP_VERSION) : 'v18.0.0';
            badge.textContent = verStr + ' • ' + _lastLatencyMs + 'ms';
          }

          if (!json.ok) {
            if (json.code === 401) {
              setSession(null);
              clearCachedReads();
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

  let _isFlushingOfflineQueue = false;

  async function flushOfflineQueue() {
    if (_isFlushingOfflineQueue) return { synced: 0, busy: true };
    const snapshot = getOfflineQueue();
    if (!snapshot.length || !navigator.onLine) return { synced: 0 };
    _isFlushingOfflineQueue = true;
    try {
      const syncIds = new Set(snapshot.map((it) => it.offline_sync_id));
      await callApi('pos.syncOfflineQueue', { items: snapshot }, { isWrite: true });
      // CRITICAL FIX (Audit #1): Prune hanya item yang sukses disinkronkan. Transaksi baru yang masuk saat callApi tetap utuh di antrean!
      const freshQ = getOfflineQueue();
      const remainingQ = freshQ.filter((it) => !syncIds.has(it.offline_sync_id));
      localStorage.setItem(OFFLINE_Q_KEY, JSON.stringify(remainingQ));
      return { synced: snapshot.length };
    } catch (e) {
      return { synced: 0, error: e.message };
    } finally {
      _isFlushingOfflineQueue = false;
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

  function clearCachedReads() {
    try {
      const toRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.indexOf('ons_swr_') === 0) {
          toRemove.push(k);
        }
      }
      toRemove.forEach((k) => localStorage.removeItem(k));
    } catch (e) {}
  }

  function logoutSession(notifyServer) {
    const ses = getSession();
    if (notifyServer && !isDemoMode() && ses && ses.token) {
      try { callApi('auth.logout', {}, { isWrite: true }).catch(() => {}); } catch (e) {}
    }
    setSession(null);
    clearCachedReads();
  }

  global.ONSApi = {
    isDemoMode,
    setModeOverride,
    getSession,
    setSession,
    clearCachedReads,
    logoutSession,
    callApi,
    callBatched,
    getCachedRead,
    getCachedReadEntry,
    setCachedRead,
    warmUpBackend,
    bumpClientEpoch,
    getOfflineQueue,
    pushOfflineQueue,
    flushOfflineQueue,
    getLastLatency: () => _lastLatencyMs
  };
})(window);
