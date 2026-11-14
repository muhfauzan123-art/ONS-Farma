
  function generateSpNumber(gol) {
    const dStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const g = String(gol || 'REGULER').toUpperCase();
    const pfx = g === 'NARKOTIKA' ? 'SP-NARK' : (g === 'PSIKOTROPIKA' ? 'SP-PSI' : (g === 'PREKURSOR' ? 'SP-PREK' : (g === 'OOT' ? 'SP-OOT' : 'SP-REG')));
    return pfx + '/' + dStr + '/' + String(Math.floor(100 + Math.random() * 900));
  }

/**
 * ONS Farma Enterprise v16.3 - Procurement Pro, Surat Pesanan A4, Stock Flow & Price Decision Analyzer
 * Ekstensi modular untuk Surat Pesanan (Manual + Preview/Cetak A4), Alur Obat Masuk/Keluar,
 * & Analisa Keputusan Kenaikan Harga Jual berbasis HPP & Margin.
 */
(function (global) {
  'use strict';

  const S = () => global.ONSStore;
  const API = () => global.ONSApi;

  // ==========================
  // STATE INTERNAL MODUL
  // ==========================
  const SP_DRAFTS_KEY = 'ONS_SP_DRAFTS_V1';
  let spFilterStatus = 'SEMUA';
  let spFilterPbf = '';
  let spFilterGol = 'SEMUA';
  let spPreviewRangkap = 0;
  let spPreviewHideKop = false;
  let spPaperSize = 'A4';
  let spViewMode = 'PESANAN';
  let spSearchQ = '';
  let spDateFrom = '';
  let spDateTo = '';
  let spSelectedIds = new Set();
  let spPreviewShowPrice = true;

  let spEditingId = '';
  let spActiveDraftLocalId = '';
  let spDraftTanggal = '';
  let spDraftPbfId = '';
  let spDraftGol = 'REGULER';
  let spDraftNoSp = generateSpNumber('REGULER');
  let spDraftPayMethod = 'KREDIT';
  let spDraftDueDate = '';
  let spDraftPemesan = '';
  let spDraftCatatan = '';
  let spDraftSearch = '';
  let spDraftItems = [];

  function loadSpLocalDrafts() {
    try {
      const raw = global.localStorage ? global.localStorage.getItem(SP_DRAFTS_KEY) : '[]';
      const arr = JSON.parse(raw || '[]');
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }

  function saveSpLocalDrafts(list) {
    try {
      if (global.localStorage) global.localStorage.setItem(SP_DRAFTS_KEY, JSON.stringify(Array.isArray(list) ? list : []));
    } catch (e) {}
  }

  function buildPendingSpQtyMap(st) {
    const map = {};
    (st.suratPesanan || []).forEach((sp) => {
      const s = String(sp.status_sp || '').toUpperCase(); if (s === 'SELESAI_DITERIMA' || s === 'DIBATALKAN') return;
      parseSpItems(sp).forEach((it) => {
        if (it.id_obat) map[it.id_obat] = (map[it.id_obat] || 0) + Number(it.qty || it.qty_pesan || it.qty_order || 0);
      });
    });
    return map;
  }

  function computeSpDueFromPbf(pbfIdOrName, baseDate) {
    const st = S().AppState;
    const pbf = (st.supplierPbf || []).find((p) => p.id_pbf === pbfIdOrName || p.nama_pbf === pbfIdOrName);
    const termin = Number((pbf && pbf.termin_hari) || 30);
    const baseMs = baseDate ? new Date(baseDate).getTime() : Date.now();
    const validMs = Number.isFinite(baseMs) ? baseMs : Date.now();
    return new Date(validMs + termin * 86400000).toISOString().slice(0, 10);
  }

  let priceTargetMargin = 25;
  let priceHppBasis = 'LAST'; // LAST | AVG
  let priceRoundStep = 500; // 0 | 100 | 500 | 1000
  let priceFilterStatus = 'ACTION'; // SEMUA | ACTION | WAJIB_NAIK | BARU_NAIK
  let priceSearchQ = '';
  let priceDraftEdits = {}; // { [id_obat]: { harga_umum, harga_member, harga_grosir, harga_faskes } }

  function parseSpItems(sp) {
    if (!sp) return [];
    if (Array.isArray(sp.items)) return sp.items;
    try {
      const parsed = JSON.parse(sp.items_json || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function spStatusBadge(status) {
    const s = String(status || 'MENUNGGU_BARANG').toUpperCase();
    if (s === 'SELESAI_DITERIMA') return '<span class="badge-bpom bpom-bebas">SELESAI DITERIMA</span>';
    if (s === 'DITERIMA_SEBAGIAN') return '<span class="badge-bpom bpom-keras">DITERIMA SEBAGIAN</span>';
    if (s === 'DIBATALKAN') return '<span class="badge-bpom" style="background:#fee2e2;color:#991b1b;border-color:#f87171">DIBATALKAN</span>';
    return '<span class="badge-bpom bpom-prekursor">MENUNGGU BARANG</span>';
  }

  function spGolTitle(gol) {
    const g = String(gol || 'REGULER').toUpperCase();
    if (g === 'NARKOTIKA') return 'SURAT PESANAN NARKOTIKA';
    if (g === 'PSIKOTROPIKA') return 'SURAT PESANAN PSIKOTROPIKA';
    if (g === 'PREKURSOR') return 'SURAT PESANAN OBAT MENGANDUNG PREKURSOR FARMASI';
    if (g === 'OOT') return 'SURAT PESANAN OBAT-OBAT TERTENTU (OOT)';
    return 'SURAT PESANAN OBAT & ALKES (REGULER)';
  }

  function ceilToStep(val, step) {
    const n = Math.ceil(Number(val || 0));
    if (!step || step <= 1) return Math.max(0, n);
    return Math.max(step, Math.ceil(n / step) * step);
  }

  // ==========================
  // 1. KALKULATOR KEPUTUSAN HARGA & MARGIN
  // ==========================
  function computePriceDecision(obat, opts) {
    const cfg = opts || {};
    const targetPct = Math.min(85, Math.max(1, Number(cfg.targetMarginPct !== undefined ? cfg.targetMarginPct : priceTargetMargin)));
    const basis = cfg.hppBasis || priceHppBasis || 'LAST';
    const roundStep = cfg.roundStep !== undefined ? Number(cfg.roundStep) : priceRoundStep;
    const alertMap = cfg.alertMap || {};

    const hppLast = Number(obat.hpp_terakhir || 0);
    const hppAvg = Number(obat.hpp_avg || 0);
    const hppRef = basis === 'AVG' ? (hppAvg || hppLast) : (hppLast || hppAvg);
    const hppDiffPct = (hppAvg > 0 && hppLast > hppAvg)
      ? Math.round(((hppLast - hppAvg) / hppAvg) * 1000) / 10
      : 0;

    const hargaUmum = Number(obat.harga_umum || 0);
    const hargaMember = Number(obat.harga_member || hargaUmum);
    const hargaGrosir = Number(obat.harga_grosir || hargaMember);
    const hargaFaskes = Number(obat.harga_faskes || hargaGrosir);

    const marginRp = hargaUmum - hppRef;
    const marginPct = hargaUmum > 0 ? Math.round(((marginRp) / hargaUmum) * 1000) / 10 : -100;
    const markupPct = hppRef > 0 ? Math.round(((marginRp) / hppRef) * 1000) / 10 : 0;

    const targetRatio = Math.min(0.85, Math.max(0.05, targetPct / 100));
    const rawTarget = hppRef > 0 ? (hppRef / (1 - targetRatio)) : hargaUmum;
    const saranUmum = hppRef > 0 ? Math.max(ceilToStep(rawTarget, roundStep), hppRef + (roundStep || 100)) : hargaUmum;

    // Jaga hierarki harga tier agar tetap menguntungkan (> HPP + minimal 5%)
    const minSafeFloor = hppRef > 0 ? ceilToStep(hppRef * 1.08, Math.min(roundStep || 100, 100)) : 0;
    const saranMember = hppRef > 0 ? Math.max(minSafeFloor, ceilToStep(saranUmum * 0.96, Math.min(roundStep || 100, 100))) : hargaMember;
    const saranGrosir = hppRef > 0 ? Math.max(minSafeFloor, ceilToStep(saranUmum * 0.92, Math.min(roundStep || 100, 100))) : hargaGrosir;
    const saranFaskes = hppRef > 0 ? Math.max(minSafeFloor, ceilToStep(saranUmum * 0.90, Math.min(roundStep || 100, 100))) : hargaFaskes;

    const isAlerted = Boolean(alertMap[obat.id_obat]) || hppDiffPct >= 2;
    let status = 'PERTAHANKAN';
    let label = 'PERTAHANKAN (Margin Aman)';
    let tone = 'bpom-bebas';
    let needsAction = false;

    if (hppRef > 0 && (hargaUmum <= 0 || hppRef >= hargaUmum)) {
      status = 'WAJIB_NAIK';
      label = 'WAJIB NAIK (Rugi / Di Bawah HPP)';
      tone = 'bpom-narkotika';
      needsAction = true;
    } else if (hppRef > 0 && marginPct < targetPct - 0.5) {
      status = 'SARAN_NAIK';
      label = 'SARAN NAIK (< Target ' + targetPct + '%)';
      tone = 'bpom-prekursor';
      needsAction = true;
    } else if (isAlerted && marginPct < targetPct + 4) {
      status = 'PANTAU';
      label = 'PANTAU (HPP Naik, Margin Tipis)';
      tone = 'bpom-keras';
      needsAction = false;
    }

    const deltaNaikRp = Math.max(0, saranUmum - hargaUmum);
    const deltaNaikPct = hargaUmum > 0 ? Math.round(((saranUmum - hargaUmum) / hargaUmum) * 1000) / 10 : 0;

    return {
      hppRef,
      hppLast,
      hppAvg,
      hppDiffPct,
      isAlerted,
      hargaUmum,
      hargaMember,
      hargaGrosir,
      hargaFaskes,
      marginRp,
      marginPct,
      markupPct,
      saranUmum,
      saranMember,
      saranGrosir,
      saranFaskes,
      deltaNaikRp,
      deltaNaikPct,
      status,
      label,
      tone,
      needsAction
    };
  }

  function renderAnalisaHargaTab() {
    const st = S().AppState;
    const alerts = Array.isArray(st._lastHppAlerts) ? st._lastHppAlerts : [];
    const alertMap = {};
    alerts.forEach((a) => { if (a && a.id_obat) alertMap[a.id_obat] = a; });

    const q = priceSearchQ.trim().toLowerCase();
    const evaluated = (st.masterObat || []).map((o) => ({
      o,
      calc: computePriceDecision(o, {
        targetMarginPct: priceTargetMargin,
        hppBasis: priceHppBasis,
        roundStep: priceRoundStep,
        alertMap
      })
    }));

    const wajibCount = evaluated.filter((x) => x.calc.status === 'WAJIB_NAIK').length;
    const saranCount = evaluated.filter((x) => x.calc.status === 'SARAN_NAIK').length;
    const baruNaikCount = evaluated.filter((x) => x.calc.isAlerted).length;
    const amanCount = evaluated.filter((x) => x.calc.status === 'PERTAHANKAN').length;

    const filtered = evaluated.filter(({ o, calc }) => {
      if (priceFilterStatus === 'ACTION' && !calc.needsAction && calc.status !== 'PANTAU') return false;
      if (priceFilterStatus === 'WAJIB_NAIK' && calc.status !== 'WAJIB_NAIK') return false;
      if (priceFilterStatus === 'BARU_NAIK' && !calc.isAlerted) return false;
      if (q) {
        const hay = `${o.nama_dagang || ''} ${o.zat_aktif || ''} ${o.id_obat || ''} ${o.pbf_utama || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => {
      const rank = { WAJIB_NAIK: 0, SARAN_NAIK: 1, PANTAU: 2, PERTAHANKAN: 3 };
      const ra = rank[a.calc.status] !== undefined ? rank[a.calc.status] : 9;
      const rb = rank[b.calc.status] !== undefined ? rank[b.calc.status] : 9;
      if (ra !== rb) return ra - rb;
      return a.calc.marginPct - b.calc.marginPct;
    });

    const needAdjustItems = evaluated.filter((x) => x.calc.needsAction && x.calc.saranUmum > x.calc.hargaUmum);

    const kpiFilterBtn = (val, title, count, sub, cls) => {
      const active = priceFilterStatus === val;
      return `<button type="button" onclick="window.setPriceFilterStatus('${val}')" class="ons-card p-3.5 text-left cursor-pointer transition-all ${active ? 'ring-2 ring-blue-500' : ''}">
        <div class="text-[11px] font-semibold" style="color:var(--ons-text-soft)">${title}</div>
        <div class="text-2xl font-extrabold font-mono-num mt-0.5 ${cls}">${count}</div>
        <div class="text-[11px] mt-0.5 truncate" style="color:var(--ons-text-soft)">${sub}</div>
      </button>`;
    };

    return `<div class="space-y-4">
      ${alerts.length ? `
        <div class="p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-2 text-xs" style="background:rgba(245,158,11,.10);border-color:rgba(245,158,11,.45)">
          <div>
            <b class="text-amber-700">&#9888; Kenaikan HPP Faktur Terbaru Terdeteksi (${alerts.length} Produk):</b>
            <span class="ml-1">${alerts.map((a) => `${S().esc(a.nama_dagang)} (${S().rp(a.old_hpp)} &rarr; ${S().rp(a.new_hpp)})`).join(', ')}</span>
          </div>
          <button type="button" onclick="window.setPriceFilterStatus('BARU_NAIK')" class="ons-btn ons-btn-primary text-[11px] py-1 px-2.5">Fokus HPP Naik</button>
        </div>
      ` : ''}

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        ${kpiFilterBtn('WAJIB_NAIK', 'Wajib Naik (Rugi / BEP)', wajibCount, 'Harga jual <= HPP faktur', wajibCount ? 'text-red-600' : 'text-emerald-600')}
        ${kpiFilterBtn('ACTION', 'Perlu Evaluasi Naik', wajibCount + saranCount, `Margin < ${priceTargetMargin}% target apotek`, (wajibCount + saranCount) ? 'text-amber-600' : 'text-emerald-600')}
        ${kpiFilterBtn('BARU_NAIK', 'HPP Faktur Naik', baruNaikCount, 'Dibanding rata-rata HPP lama', baruNaikCount ? 'text-blue-600' : '')}
        ${kpiFilterBtn('SEMUA', 'Margin Sudah Aman', amanCount, `Total ${evaluated.length} produk katalog`, 'text-emerald-600')}
      </div>

      <div class="ons-card p-4 space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b" style="border-color:var(--ons-border)">
          <div class="flex flex-wrap items-center gap-2 text-xs">
            <span class="font-bold">Target Margin Laba:</span>
            ${[15, 20, 25, 30, 35].map((pct) => `<button type="button" onclick="window.setPriceTargetMargin(${pct})" class="px-2.5 py-1 rounded-lg font-bold border transition-all ${priceTargetMargin === pct ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-300 dark:border-slate-600'}">${pct}%</button>`).join('')}
            <input type="number" min="1" max="85" class="ons-input w-20 text-xs font-mono-num py-1 min-h-0" value="${priceTargetMargin}" onchange="window.setPriceTargetMargin(this.value)" title="Target Margin % Custom"/>
          </div>
          <div class="flex flex-wrap items-center gap-2 text-xs">
            <select class="ons-select text-xs w-48" onchange="window.setPriceHppBasis(this.value)" aria-label="Basis HPP">
              <option value="LAST" ${priceHppBasis === 'LAST' ? 'selected' : ''}>Basis: HPP Terakhir Faktur</option>
              <option value="AVG" ${priceHppBasis === 'AVG' ? 'selected' : ''}>Basis: HPP Rata-Rata</option>
            </select>
            <select class="ons-select text-xs w-44" onchange="window.setPriceRoundStep(this.value)" aria-label="Pembulatan Harga">
              <option value="500" ${priceRoundStep === 500 ? 'selected' : ''}>Bulatkan ke Rp 500</option>
              <option value="100" ${priceRoundStep === 100 ? 'selected' : ''}>Bulatkan ke Rp 100</option>
              <option value="1000" ${priceRoundStep === 1000 ? 'selected' : ''}>Bulatkan ke Rp 1.000</option>
              <option value="0" ${priceRoundStep === 0 ? 'selected' : ''}>Tanpa Pembulatan</option>
            </select>
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex flex-wrap items-center gap-2 flex-1">
            <input class="ons-input text-xs w-64" placeholder="Cari nama obat, zat aktif, atau PBF..." value="${S().esc(priceSearchQ)}" oninput="window.setPriceSearchQ(this.value)"/>
            <select class="ons-select text-xs w-48" onchange="window.setPriceFilterStatus(this.value)">
              <option value="ACTION" ${priceFilterStatus === 'ACTION' ? 'selected' : ''}>Tampilkan: Perlu Naik / Pantau</option>
              <option value="WAJIB_NAIK" ${priceFilterStatus === 'WAJIB_NAIK' ? 'selected' : ''}>Hanya Wajib Naik (Rugi)</option>
              <option value="BARU_NAIK" ${priceFilterStatus === 'BARU_NAIK' ? 'selected' : ''}>Hanya HPP Faktur Naik</option>
              <option value="SEMUA" ${priceFilterStatus === 'SEMUA' ? 'selected' : ''}>Semua Produk Katalog</option>
            </select>
          </div>
          ${needAdjustItems.length ? `<button type="button" onclick="window.applyBulkPriceAnalysis()" class="ons-btn ons-btn-emerald text-xs">Terapkan Saran Harga (${needAdjustItems.length} Produk Perlu Naik)</button>` : ''}
        </div>

        <div class="ons-table-wrap">
          <table class="ons-table">
            <thead>
              <tr>
                <th>Produk Obat &amp; Satuan</th>
                <th>HPP Modal</th>
                <th>Harga Jual Lama</th>
                <th>Status Keputusan</th>
                <th>Harga Baru (Umum / Tier)</th>
                <th>Margin Baru</th>
                <th>Aksi Cepat</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.length ? filtered.map(({ o, calc }) => {
                const draft = priceDraftEdits[o.id_obat] || {};
                const curUmum = draft.harga_umum !== undefined ? Number(draft.harga_umum) : calc.hargaUmum;
                const curMember = draft.harga_member !== undefined ? Number(draft.harga_member) : calc.hargaMember;
                const curGrosir = draft.harga_grosir !== undefined ? Number(draft.harga_grosir) : calc.hargaGrosir;
                const curFaskes = draft.harga_faskes !== undefined ? Number(draft.harga_faskes) : calc.hargaFaskes;
                const newMarginPct = curUmum > 0 ? Math.round(((curUmum - calc.hppRef) / curUmum) * 1000) / 10 : -100;
                const isDirty = draft.harga_umum !== undefined || draft.harga_member !== undefined || draft.harga_grosir !== undefined || draft.harga_faskes !== undefined;
                return `<tr>
                  <td>
                    <div class="font-bold text-xs">${S().esc(o.nama_dagang)}</div>
                    <div class="text-[11px]" style="color:var(--ons-text-soft)">${S().esc(o.satuan_dasar || 'Unit')} &bull; ${S().esc(o.pbf_utama || '-')}</div>
                  </td>
                  <td class="font-mono-num text-xs">
                    <div class="font-bold">${S().rp(calc.hppRef)}</div>
                    <div class="text-[10px]" style="color:var(--ons-text-soft)">Avg: ${S().rp(calc.hppAvg)} ${calc.hppDiffPct > 0 ? `<span class="text-red-600 font-bold">(+${calc.hppDiffPct}%)</span>` : ''}</div>
                  </td>
                  <td class="font-mono-num text-xs">
                    <div>${S().rp(calc.hargaUmum)}</div>
                    <div class="text-[10px] ${calc.marginPct < priceTargetMargin ? 'text-red-600 font-bold' : 'text-emerald-600'}">Margin: ${calc.marginPct}%</div>
                  </td>
                  <td>
                    <span class="badge-bpom ${calc.tone}">${calc.label}</span>
                    <div class="text-[11px] font-mono-num mt-1" style="color:var(--ons-text-soft)">Saran: <b class="text-blue-600">${S().rp(calc.saranUmum)}</b> ${calc.deltaNaikRp > 0 ? `(+${S().rp(calc.deltaNaikRp)} / +${calc.deltaNaikPct}%)` : ''}</div>
                  </td>
                  <td>
                    <div class="grid grid-cols-2 gap-1 min-w-[200px]">
                      <label class="text-[10px]" style="color:var(--ons-text-soft)">Umum
                        <input type="text" inputmode="numeric" class="ons-input ons-currency-input text-xs font-mono-num font-bold py-1 min-h-0 mt-0.5" value="${S().formatDots(curUmum)}" oninput="window.maskNumberInput(this)" onchange="window.setPriceDraftField('${S().esc(o.id_obat)}','harga_umum',this.value)"/>
                      </label>
                      <label class="text-[10px]" style="color:var(--ons-text-soft)">Member
                        <input type="text" inputmode="numeric" class="ons-input ons-currency-input text-xs font-mono-num py-1 min-h-0 mt-0.5" value="${S().formatDots(curMember)}" oninput="window.maskNumberInput(this)" onchange="window.setPriceDraftField('${S().esc(o.id_obat)}','harga_member',this.value)"/>
                      </label>
                      <label class="text-[10px]" style="color:var(--ons-text-soft)">Grosir
                        <input type="text" inputmode="numeric" class="ons-input ons-currency-input text-xs font-mono-num py-1 min-h-0 mt-0.5" value="${S().formatDots(curGrosir)}" oninput="window.maskNumberInput(this)" onchange="window.setPriceDraftField('${S().esc(o.id_obat)}','harga_grosir',this.value)"/>
                      </label>
                      <label class="text-[10px]" style="color:var(--ons-text-soft)">Faskes
                        <input type="text" inputmode="numeric" class="ons-input ons-currency-input text-xs font-mono-num py-1 min-h-0 mt-0.5" value="${S().formatDots(curFaskes)}" oninput="window.maskNumberInput(this)" onchange="window.setPriceDraftField('${S().esc(o.id_obat)}','harga_faskes',this.value)"/>
                      </label>
                    </div>
                  </td>
                  <td class="font-mono-num text-xs">
                    <div class="font-extrabold ${newMarginPct >= priceTargetMargin ? 'text-emerald-600' : (newMarginPct > 0 ? 'text-amber-600' : 'text-red-600')}">${newMarginPct}%</div>
                    <div class="text-[10px]" style="color:var(--ons-text-soft)">Laba: ${S().rp(curUmum - calc.hppRef)}</div>
                  </td>
                  <td>
                    <div class="flex flex-col gap-1">
                      <button type="button" onclick="window.fillSuggestedPriceRow('${S().esc(o.id_obat)}')" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2">Pakai Saran</button>
                      <button type="button" onclick="window.applySinglePriceAnalysis('${S().esc(o.id_obat)}')" class="ons-btn ${isDirty || calc.needsAction ? 'ons-btn-primary' : 'ons-btn-emerald'} text-[11px] py-1 px-2">Simpan Harga</button>
                    </div>
                  </td>
                </tr>`;
              }).join('') : `<tr><td colspan="7" class="text-center py-8 text-xs" style="color:var(--ons-text-soft)">Semua produk pada filter ini sudah memiliki margin jual yang sehat (&ge; ${priceTargetMargin}%).</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    </div>`;
  }

  // ==========================
  // 2. SURAT PESANAN (SP) & PREVIEW CETAK A4
  // ==========================
  function buildSpA4DocumentHtml(sp, showPrice, rangkapIdx = 0, hideKop = false, paperSize = 'A4') {
    const st = S().AppState;
    const prof = S().getStoreProfile();
    const items = parseSpItems(sp);
    const pbf = (st.supplierPbf || []).find((p) => p.id_pbf === sp.id_pbf || p.nama_pbf === sp.nama_pbf) || {};
    const gol = String(sp.golongan_sp || 'REGULER').toUpperCase();
    const isNarc = gol === 'NARKOTIKA';
    const isNarcPsiPreOot = gol !== 'REGULER';
    const includePrice = showPrice !== undefined ? Boolean(showPrice) : !isNarcPsiPreOot;
    const isA5 = paperSize === 'A5';
    const estSum = items.reduce((s, it) => s + (Number(it.qty || it.qty_pesan || 0) * Number(it.hpp_terakhir || it.hpp_unit || it.hpp || 0)), 0);

    const apotekName = prof.nama_usaha || prof.nama_apotek || 'APOTEK ONS FARMA';
    const apotekAddr = [prof.alamat_usaha || prof.alamat || '', prof.kota || '', prof.kode_pos || ''].filter(Boolean).join(', ') || 'Jl. Perintis Kemerdekaan No. 10, Makassar';
    const apotekTelp = prof.wa_usaha || prof.telepon_usaha || prof.telp_wa || '0812-3456-7890';
    const apotekEmail = prof.email_usaha || 'admin@onsfarma.id';
    const apotekLogo = prof.logo_usaha_url || '';
    const apjName = prof.nama_pemilik || prof.nama_apj || sp.dibuat_oleh || 'Apoteker Penanggung Jawab';
    const apjSipa = prof.sipa_pemilik || prof.no_sipa || '-';
    const apjStra = prof.no_stra || '-';
    const spTanggalFormatted = S().formatTgl(sp.tanggal || sp.tgl_sp || new Date().toISOString().slice(0, 10));

    // Rangkap Text for Narkotika / BPOM
    let rangkapLabel = '';
    if (isNarc) {
      const rNum = Number(rangkapIdx || 1);
      if (rNum === 1) rangkapLabel = 'RANGKAP 1: ASLI UNTUK DISTRIBUTOR / PEDAGANG BESAR FARMASI (PBF)';
      else if (rNum === 2) rangkapLabel = 'RANGKAP 2: ARSIP DINAS KESEHATAN KABUPATEN / KOTA';
      else if (rNum === 3) rangkapLabel = 'RANGKAP 3: ARSIP BALAI BESAR PENGAWAS OBAT DAN MAKANAN (BBPOM)';
      else if (rNum === 4) rangkapLabel = 'RANGKAP 4: ARSIP RESMI APOTEK PEMESAN';
      else rangkapLabel = 'RANGKAP 1: ASLI UNTUK PEDAGANG BESAR FARMASI (PBF)';
    } else {
      rangkapLabel = 'LEMBAR ASLI PEMESANAN RESMI APOTEK';
    }

    const isBatal = String(sp.status_sp || '').toUpperCase() === 'DIBATALKAN';
    const qrData = encodeURIComponent('ONS-FARMA|SP|' + (sp.no_sp || '-') + '|' + spTanggalFormatted + '|' + apjName + '|VALID-BPOM');
    const qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=84x84&data=' + qrData;

    const maxWidth = isA5 ? '560px' : '794px';
    const padVal = isA5 ? '18px 22px' : '28px 34px';
    const fontSize = isA5 ? '11px' : '12px';

    return `<div id="spA4PaperSheet" style="width:100%;max-width:${maxWidth};margin:0 auto;background:#ffffff;color:#0f172a;padding:${padVal};border:1px solid #cbd5e1;border-radius:4px;font-family:'Segoe UI',Arial,sans-serif;font-size:${fontSize};line-height:1.45;box-shadow:0 8px 30px rgba(15,23,42,.12);position:relative">
      ${isBatal ? `
        <div style="position:absolute;top:40%;left:50%;transform:translate(-50%,-50%) rotate(-25deg);border:6px dashed #ef4444;color:#ef4444;font-size:46px;font-weight:900;padding:12px 28px;opacity:0.35;pointer-events:none;letter-spacing:4px">
          DIBATALKAN
        </div>
      ` : ''}

      <!-- KOP SURAT APOTEK RESMI (ATAU SPACE PRE-PRINTED KOP) -->
      ${hideKop ? `
        <div class="ons-kop-preprinted" style="height:38mm;border:1px dashed #cbd5e1;border-radius:4px;margin-bottom:12px;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:10px;text-transform:uppercase;letter-spacing:1px">
          [ Ruang Cetak Kop Surat Apotek Pre-Printed ]
        </div>
      ` : `
        <div style="border-bottom:3px double #0f172a;padding-bottom:10px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:flex-start;gap:16px">
          <div style="display:flex;align-items:flex-start;gap:12px">
            ${apotekLogo ? `<img src="${S().esc(apotekLogo)}" alt="Logo Apotek" style="width:48px;height:48px;border-radius:8px;object-fit:cover;border:1px solid #cbd5e1;flex-shrink:0"/>` : ''}
            <div>
              <div style="font-size:17px;font-weight:800;letter-spacing:.3px;text-transform:uppercase;color:#003d99">${S().esc(apotekName)}</div>
              <div style="font-size:11px;color:#334155">${S().esc(apotekAddr)}</div>
              <div style="font-size:11px;color:#334155">SIA: <b>${S().esc(prof.no_sia || '503/001/SIA/DPMPTSP/2025')}</b> &bull; Telp/WA: ${S().esc(apotekTelp)}${apotekEmail ? ` &bull; ${S().esc(apotekEmail)}` : ''}</div>
            </div>
          </div>
          <div style="text-align:right;font-size:11px;white-space:nowrap">
            <div style="display:inline-block;padding:3px 8px;border:1.5px solid #003d99;border-radius:4px;font-weight:800;color:#003d99">${S().esc(gol)}</div>
            <div style="margin-top:4px;color:#475569">Format Regulasi CDOB / BPOM</div>
          </div>
        </div>
      `}

      <!-- WATERMARK / INDIKATOR RANGKAP BPOM -->
      <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 8px;background:#f1f5f9;border-left:4px solid #0050CA;margin-bottom:12px;font-size:10.5px;font-weight:700;color:#1e3a8a">
        <span>${rangkapLabel}</span>
        <span style="font-family:monospace">STATUS: ${S().esc(sp.status_sp || 'MENUNGGU_BARANG')}</span>
      </div>

      <!-- JUDUL & META SP -->
      <div style="text-align:center;margin-bottom:14px">
        <div style="font-size:15px;font-weight:800;text-decoration:underline;letter-spacing:.4px">${spGolTitle(gol)}</div>
        <div style="font-size:12px;font-family:monospace;margin-top:2px">Nomor: <b>${S().esc(sp.no_sp || '-')}</b></div>
      </div>

      <table style="width:100%;border-collapse:collapse;margin-bottom:14px;font-size:11px">
        <tr>
          <td style="width:52%;vertical-align:top;padding:4px 0">
            <div>Yang bertanda tangan di bawah ini:</div>
            <table style="width:100%;margin-top:4px">
              <tr><td style="width:110px;color:#475569">Nama Apoteker</td><td>: <b>${S().esc(apjName)}</b></td></tr>
              <tr><td style="color:#475569">No. SIPA</td><td>: ${S().esc(apjSipa)}</td></tr>
              <tr><td style="color:#475569">No. STRA</td><td>: ${S().esc(apjStra)}</td></tr>
              <tr><td style="color:#475569">Jabatan</td><td>: Apoteker Penanggung Jawab (APJ)</td></tr>
            </table>
          </td>
          <td style="width:48%;vertical-align:top;padding:6px 10px;background:#f8fafc;border:1px solid #cbd5e1;border-radius:4px">
            <div style="font-weight:700;margin-bottom:3px">Mengajukan Pesanan Kepada:</div>
            <div style="font-weight:800;font-size:12.5px">${S().esc(sp.nama_pbf || pbf.nama_pbf || '-')}</div>
            <div style="font-size:11px;color:#334155">Izin CDOB: ${S().esc(pbf.kode_cdob || 'PBF-CDOB-2025/081')}</div>
            <div style="font-size:11px;color:#334155">Telp / Email: ${S().esc(pbf.kontak_wa || '-')} / ${S().esc(pbf.email_pbf || '-')}</div>
            <div style="font-size:11px;color:#334155">Tanggal SP: <b>${spTanggalFormatted}</b></div>
          </td>
        </tr>
      </table>

      <div style="margin-bottom:8px;font-size:11px">Agar dikirimkan sediaan farmasi / alat kesehatan untuk keperluan pelayanan kefarmasian di apotek sebagai berikut:</div>

      <!-- TABEL ITEM PESANAN -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:14px;font-size:11px">
        <thead>
          <tr style="background:#e2e8f0;color:#0f172a">
            <th style="border:1px solid #64748b;padding:6px;text-align:center;width:34px">No</th>
            <th style="border:1px solid #64748b;padding:6px;text-align:left">Nama Obat / Bentuk Sediaan</th>
            <th style="border:1px solid #64748b;padding:6px;text-align:left">Zat Aktif &amp; Gol</th>
            <th style="border:1px solid #64748b;padding:6px;text-align:center;width:70px">Satuan</th>
            <th style="border:1px solid #64748b;padding:6px;text-align:right;width:76px">Qty Pesan</th>
            ${includePrice ? '<th style="border:1px solid #64748b;padding:6px;text-align:right;width:100px">Est. HPP Unit</th><th style="border:1px solid #64748b;padding:6px;text-align:right;width:110px">Est. Subtotal</th>' : ''}
          </tr>
        </thead>
        <tbody>
          ${items.length ? items.map((it, idx) => {
            const qty = Number(it.qty || it.qty_pesan || 0);
            const hpp = Number(it.hpp_terakhir !== undefined ? it.hpp_terakhir : (it.hpp_unit || it.hpp || 0));
            const obRef = (st.masterObat || []).find((m) => m.id_obat === it.id_obat) || {};
            return `<tr>
              <td style="border:1px solid #94a3b8;padding:5px;text-align:center">${idx + 1}</td>
              <td style="border:1px solid #94a3b8;padding:5px"><b>${S().esc(it.nama_dagang || obRef.nama_dagang || it.id_obat)}</b></td>
              <td style="border:1px solid #94a3b8;padding:5px;color:#334155">${S().esc(it.zat_aktif || obRef.zat_aktif || '-')} (${S().esc(it.golongan_bpom || obRef.golongan_bpom || gol)})</td>
              <td style="border:1px solid #94a3b8;padding:5px;text-align:center">${S().esc(it.satuan_dasar || it.satuan || obRef.satuan_dasar || 'Unit')}</td>
              <td style="border:1px solid #94a3b8;padding:5px;text-align:right;font-weight:800;font-family:monospace">${qty}</td>
              ${includePrice ? `<td style="border:1px solid #94a3b8;padding:5px;text-align:right;font-family:monospace">${S().rp(hpp)}</td><td style="border:1px solid #94a3b8;padding:5px;text-align:right;font-family:monospace;font-weight:700">${S().rp(qty * hpp)}</td>` : ''}
            </tr>`;
          }).join('') : `<tr><td colspan="${includePrice ? 7 : 5}" style="border:1px solid #94a3b8;padding:12px;text-align:center;color:#64748b">Belum ada item terlampir pada SP ini.</td></tr>`}
          ${includePrice ? `
            <tr style="background:#f8fafc">
              <td colspan="6" style="border:1px solid #64748b;padding:6px;text-align:right;font-weight:800">TOTAL ESTIMASI NILAI PESANAN</td>
              <td style="border:1px solid #64748b;padding:6px;text-align:right;font-weight:800;font-family:monospace">${S().rp(estSum || sp.estimasi_total || 0)}</td>
            </tr>
          ` : ''}
        </tbody>
      </table>

      ${sp.catatan ? `<div style="margin-bottom:12px;padding:6px 10px;background:#f8fafc;border-left:3px solid #0050CA;font-size:10.5px"><b>Catatan Pengadaan:</b> ${S().esc(sp.catatan)}</div>` : ''}

      <div style="font-size:10.5px;color:#334155;margin-bottom:16px">
        Obat tersebut di atas akan dipergunakan untuk memenuhi kebutuhan pelayanan kefarmasian di <b>${S().esc(apotekName)}</b> (SIA: ${S().esc(prof.no_sia || '503/001/SIA/DPMPTSP/2025')}). Atas kerja sama dan pengirimannya kami ucapkan terima kasih.
      </div>

      <!-- TANDA TANGAN APJ & VERIFIKASI QR CODE -->
      <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:14px;gap:14px">
        <div style="display:flex;align-items:center;gap:10px;border:1px dashed #94a3b8;padding:6px 10px;border-radius:4px;background:#f8fafc;max-width:300px">
          <img src="${qrUrl}" alt="QR Verifikasi Dokumen" style="width:64px;height:64px;border-radius:3px;border:1px solid #cbd5e1"/>
          <div style="font-size:9.5px;color:#475569;line-height:1.35">
            <div><b>Verifikasi Digital BPOM</b></div>
            <div style="font-family:monospace;font-size:9px">${S().esc(sp.no_sp || '-')}</div>
            <div>Status: <b>${S().esc(sp.status_sp || 'MENUNGGU_BARANG')}</b></div>
            <div style="color:#64748b">Pindai QR untuk validasi dokumen</div>
          </div>
        </div>
        <div style="text-align:center;min-width:220px">
          <div>${S().esc(prof.kota || 'Makassar')}, ${spTanggalFormatted}</div>
          <div style="font-weight:700;margin-top:2px">Pemesan / Apoteker Penanggung Jawab,</div>
          <div style="height:48px"></div>
          <div style="font-weight:800;text-decoration:underline">${S().esc(apjName)}</div>
          <div style="font-size:10.5px">SIPA: ${S().esc(apjSipa)}</div>
          <div style="font-size:10.5px">STRA: ${S().esc(apjStra)}</div>
        </div>
      </div>
    </div>`;
  }

  function renderSuratPesananTab() {
    const st = S().AppState;
    const allSp = st.suratPesanan || [];
    const q = spSearchQ.trim().toLowerCase();
    const drafts = loadSpLocalDrafts();

    const waitingCnt = allSp.filter((s) => !s.status_sp || s.status_sp === 'MENUNGGU_BARANG' || s.status_sp === 'TERBIT').length;
    const partialCnt = allSp.filter((s) => s.status_sp === 'DITERIMA_SEBAGIAN').length;
    const doneCnt = allSp.filter((s) => s.status_sp === 'SELESAI_DITERIMA').length;

    const rows = allSp.filter((sp) => {
      const s = String(sp.status_sp || 'MENUNGGU_BARANG').toUpperCase();
      if (spFilterStatus === 'MENUNGGU' && (s === 'SELESAI_DITERIMA' || s === 'DITERIMA_SEBAGIAN' || s === 'DIBATALKAN')) return false;
      if (spFilterStatus === 'SEBAGIAN' && s !== 'DITERIMA_SEBAGIAN') return false;
      if (spFilterStatus === 'SELESAI' && s !== 'SELESAI_DITERIMA') return false;
      if (spFilterStatus === 'BATAL' && s !== 'DIBATALKAN') return false;
      if (spFilterStatus !== 'BATAL' && spFilterStatus !== 'SEMUA' && s === 'DIBATALKAN') return false;
      if (spFilterPbf && sp.id_pbf !== spFilterPbf && sp.nama_pbf !== spFilterPbf) return false;
      if (spFilterGol && spFilterGol !== 'SEMUA' && String(sp.golongan_sp || 'REGULER').toUpperCase() !== spFilterGol) return false;
      const tStr = String(sp.tanggal || sp.tgl_sp || '').slice(0, 10);
      if (spDateFrom && tStr && tStr < spDateFrom) return false;
      if (spDateTo && tStr && tStr > spDateTo) return false;
      if (q) {
        const itemsText = parseSpItems(sp).map((x) => `${x.nama_dagang || ''} ${x.id_obat || ''}`).join(' ');
        const hay = `${sp.no_sp || ''} ${sp.nama_pbf || ''} ${sp.no_faktur_pbf || ''} ${sp.golongan_sp || ''} ${itemsText}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const totalNilaiPesanan = rows.reduce((sum, sp) => sum + Number(sp.estimasi_total || 0), 0);
    const allVisibleSelected = rows.length > 0 && rows.every((sp) => spSelectedIds.has(sp.id_sp));

    return `<div class="space-y-4">
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button type="button" onclick="window.setSpFilterStatus('SEMUA')" class="ons-card p-3.5 text-left cursor-pointer transition-all ${spFilterStatus === 'SEMUA' ? 'ring-2 ring-blue-500 shadow-sm' : 'hover:border-blue-400'}">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold" style="color:var(--ons-text-soft)">TOTAL PESANAN (SP)</span>
            <span class="text-sm">📋</span>
          </div>
          <div class="text-2xl font-extrabold font-mono-num mt-1 text-slate-900 dark:text-white">${allSp.length} <span class="text-xs font-normal text-slate-500">SP</span></div>
          <div class="text-[10.5px] text-slate-500 mt-0.5">Semua golongan BPOM CDOB</div>
        </button>

        <button type="button" onclick="window.setSpFilterStatus('MENUNGGU')" class="ons-card p-3.5 text-left cursor-pointer transition-all ${spFilterStatus === 'MENUNGGU' ? 'ring-2 ring-amber-500 shadow-sm' : 'hover:border-amber-400'}">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold text-amber-600 dark:text-amber-400">MENUNGGU PENGIRIMAN</span>
            <span class="text-sm">⏳</span>
          </div>
          <div class="text-2xl font-extrabold font-mono-num mt-1 text-amber-600">${waitingCnt} <span class="text-xs font-normal text-amber-500">SP</span></div>
          <div class="text-[10.5px] text-amber-600 dark:text-amber-400 mt-0.5">Siap cetak A4 / kirim WA PBF</div>
        </button>

        <button type="button" onclick="window.setSpFilterStatus('SEBAGIAN')" class="ons-card p-3.5 text-left cursor-pointer transition-all ${spFilterStatus === 'SEBAGIAN' ? 'ring-2 ring-blue-500 shadow-sm' : 'hover:border-blue-400'}">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold text-blue-600 dark:text-blue-400">DITERIMA SEBAGIAN</span>
            <span class="text-sm">📦</span>
          </div>
          <div class="text-2xl font-extrabold font-mono-num mt-1 text-blue-600">${partialCnt} <span class="text-xs font-normal text-blue-500">SP</span></div>
          <div class="text-[10.5px] text-blue-600 dark:text-blue-400 mt-0.5">Ada sisa kiriman susulan</div>
        </button>

        <button type="button" onclick="window.setSpFilterStatus('SELESAI')" class="ons-card p-3.5 text-left cursor-pointer transition-all ${spFilterStatus === 'SELESAI' ? 'ring-2 ring-emerald-500 shadow-sm' : 'hover:border-emerald-400'}">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">SELESAI DITERIMA</span>
            <span class="text-sm">✅</span>
          </div>
          <div class="text-2xl font-extrabold font-mono-num mt-1 text-emerald-600">${doneCnt} <span class="text-xs font-normal text-emerald-500">SP</span></div>
          <div class="text-[10.5px] text-emerald-600 dark:text-emerald-400 mt-0.5">Faktur &amp; kartu stok sinkron</div>
        </button>
      </div>

      <div class="ons-card p-4 space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-2 border-b pb-2" style="border-color:var(--ons-border)">
          <div class="flex items-center gap-1.5">
            <span class="text-xs font-bold text-slate-500 uppercase mr-1">Tampilan Data:</span>
            <button type="button" onclick="window.setSpViewMode('PESANAN')" class="ons-btn text-xs py-1 px-3 ${spViewMode === 'PESANAN' ? 'ons-btn-primary font-bold shadow-sm' : 'ons-btn-ghost'}">&#128221; Daftar Pesanan (SP)</button>
            <button type="button" onclick="window.setSpViewMode('PRODUK')" class="ons-btn text-xs py-1 px-3 ${spViewMode === 'PRODUK' ? 'ons-btn-primary font-bold shadow-sm' : 'ons-btn-ghost'}">&#128230; Rincian Produk Dipesan</button>
            <button type="button" onclick="window.setSpViewMode('SUPPLIER')" class="ons-btn text-xs py-1 px-3 ${spViewMode === 'SUPPLIER' ? 'ons-btn-primary font-bold shadow-sm' : 'ons-btn-ghost'}">&#127970; Rekap per Supplier PBF</button>
          </div>
          <div class="text-xs font-semibold text-slate-500">
            Terpilih: <b>${spSelectedIds.size}</b> SP &bull; Total Nilai: <b class="text-blue-600">${S().rp(totalNilaiPesanan)}</b>
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex flex-wrap items-center gap-2 flex-1">
            <select aria-label="Pilihan Data Pesanan" class="ons-select text-xs w-36" onchange="window.setSpFilterStatus(this.value)">
              <option value="SEMUA" ${spFilterStatus === 'SEMUA' ? 'selected' : ''}>Semua Status</option>
              <option value="MENUNGGU" ${spFilterStatus === 'MENUNGGU' ? 'selected' : ''}>Menunggu Pengiriman</option>
              <option value="SEBAGIAN" ${spFilterStatus === 'SEBAGIAN' ? 'selected' : ''}>Diterima Sebagian</option>
              <option value="SELESAI" ${spFilterStatus === 'SELESAI' ? 'selected' : ''}>Selesai Diterima</option>
              <option value="BATAL" ${spFilterStatus === 'BATAL' ? 'selected' : ''}>Dibatalkan</option>
            </select>
            <select aria-label="Filter Supplier PBF" class="ons-select text-xs w-36" onchange="window.setSpFilterPbf(this.value)">
              <option value="">Semua PBF</option>
              ${(st.supplierPbf || []).map((p) => `<option value="${S().esc(p.id_pbf)}" ${spFilterPbf === p.id_pbf ? 'selected' : ''}>${S().esc(p.nama_pbf)}</option>`).join('')}
            </select>
            <select aria-label="Filter Golongan SP" class="ons-select text-xs w-32" onchange="window.setSpFilterGol(this.value)">
              <option value="SEMUA" ${spFilterGol === 'SEMUA' ? 'selected' : ''}>Semua Golongan</option>
              <option value="REGULER" ${spFilterGol === 'REGULER' ? 'selected' : ''}>Reguler</option>
              <option value="PREKURSOR" ${spFilterGol === 'PREKURSOR' ? 'selected' : ''}>Prekursor</option>
              <option value="PSIKOTROPIKA" ${spFilterGol === 'PSIKOTROPIKA' ? 'selected' : ''}>Psikotropika</option>
              <option value="NARKOTIKA" ${spFilterGol === 'NARKOTIKA' ? 'selected' : ''}>Narkotika</option>
              <option value="OOT" ${spFilterGol === 'OOT' ? 'selected' : ''}>OOT</option>
            </select>
            <input class="ons-input text-xs w-56" placeholder="Cari data (No. SP, PBF, produk)..." value="${S().esc(spSearchQ)}" oninput="window.setSpSearchQ(this.value)"/>
            <div class="flex items-center gap-1 text-xs">
              <span class="text-[11px] font-semibold" style="color:var(--ons-text-soft)">Tgl:</span>
              <input type="date" aria-label="Filter Tanggal SP Dari" class="ons-input text-xs py-1 min-h-0 w-32" value="${S().esc(spDateFrom)}" onchange="window.setSpDateRange('from', this.value)"/>
              <span>&ndash;</span>
              <input type="date" aria-label="Filter Tanggal SP Sampai" class="ons-input text-xs py-1 min-h-0 w-32" value="${S().esc(spDateTo)}" onchange="window.setSpDateRange('to', this.value)"/>
              ${(spDateFrom || spDateTo) ? `<button type="button" onclick="window.setSpDateRange('clear','')" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2">Reset</button>` : ''}
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <button type="button" onclick="window.openSpDraftModal()" class="ons-btn ons-btn-emerald text-xs font-bold">Draft (${drafts.length})</button>
            <button type="button" onclick="window.exportSpList('xlsx')" class="ons-btn ons-btn-ghost text-xs">Excel</button>
            <button type="button" onclick="window.openCreateSpModal()" class="ons-btn ons-btn-primary text-xs font-bold shadow-sm">+ Pesanan Baru (A4)</button>
          </div>
        </div>

        <div class="ons-table-wrap">
          ${spViewMode === 'PRODUK' ? `
            <table class="ons-table">
              <thead><tr><th>No.</th><th>Nama Produk / Obat</th><th>No. SP</th><th>Tanggal</th><th>Supplier PBF</th><th class="text-right">Qty Pesan</th><th>Satuan</th><th class="text-right">Est. HPP Unit</th><th class="text-right">Subtotal</th><th>Status</th><th>Aksi</th></tr></thead>
              <tbody>
                ${(() => {
                  const flatItems = [];
                  rows.forEach((sp) => {
                    parseSpItems(sp).forEach((it) => {
                      flatItems.push({ sp, it });
                    });
                  });
                  if (!flatItems.length) return '<tr><td colspan="11" class="text-center py-8 text-xs">Belum ada rincian produk pada pesanan yang difilter.</td></tr>';
                  return flatItems.map((row, idx) => {
                    const it = row.it;
                    const sp = row.sp;
                    const qty = Number(it.qty || it.qty_pesan || 0);
                    const hpp = Number(it.hpp_terakhir !== undefined ? it.hpp_terakhir : (it.hpp_unit || 0));
                    return `<tr class="cursor-pointer hover:bg-blue-50/50 dark:hover:bg-slate-800/50 transition-colors" onclick="window.openSpDetailModal('${S().esc(sp.id_sp)}')">
                      <td class="font-mono-num text-xs">${idx + 1}.</td>
                      <td class="font-bold text-xs">${S().esc(it.nama_dagang || it.id_obat)}</td>
                      <td class="font-mono-num text-xs font-bold text-blue-600">${S().esc(sp.no_sp)}</td>
                      <td class="text-xs font-mono-num">${S().formatTgl(sp.tanggal || sp.tgl_sp || '')}</td>
                      <td class="text-xs">${S().esc(sp.nama_pbf || '-')}</td>
                      <td class="font-mono-num text-xs font-bold text-right">${qty}</td>
                      <td class="text-xs">${S().esc(it.satuan_dasar || it.satuan || 'Unit')}</td>
                      <td class="font-mono-num text-xs text-right">${S().rp(hpp)}</td>
                      <td class="font-mono-num text-xs font-bold text-right text-blue-600">${S().rp(qty * hpp)}</td>
                      <td>${spStatusBadge(sp.status_sp)}</td>
                      <td onclick="event.stopPropagation()">
                        <button type="button" onclick="window.openSpDetailModal('${S().esc(sp.id_sp)}')" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2">Detail SP</button>
                      </td>
                    </tr>`;
                  }).join('');
                })()}
              </tbody>
            </table>
          ` : spViewMode === 'SUPPLIER' ? `
            <table class="ons-table">
              <thead><tr><th>No.</th><th>Supplier / Distributor PBF</th><th class="text-right">Jumlah SP</th><th class="text-right">Total Item Obat</th><th class="text-right">Total Nilai Pesanan</th><th>Kontak Sales</th><th>Aksi Cepat</th></tr></thead>
              <tbody>
                ${(() => {
                  const pbfMap = {};
                  rows.forEach((sp) => {
                    const pId = sp.id_pbf || sp.nama_pbf || 'LAIN';
                    if (!pbfMap[pId]) pbfMap[pId] = { id: pId, nama: sp.nama_pbf || 'PBF', spList: [], totalItem: 0, totalRp: 0 };
                    pbfMap[pId].spList.push(sp);
                    const items = parseSpItems(sp);
                    pbfMap[pId].totalItem += items.length;
                    pbfMap[pId].totalRp += Number(sp.estimasi_total || 0);
                  });
                  const pbfRows = Object.values(pbfMap);
                  if (!pbfRows.length) return '<tr><td colspan="7" class="text-center py-8 text-xs">Belum ada rekap supplier pada pesanan yang difilter.</td></tr>';
                  return pbfRows.map((p, idx) => {
                    const pRef = (st.supplierPbf || []).find((x) => x.id_pbf === p.id || x.nama_pbf === p.nama) || {};
                    return `<tr class="cursor-pointer hover:bg-blue-50/50 dark:hover:bg-slate-800/50 transition-colors" onclick="window.setSpFilterPbf('${S().esc(p.id)}');window.setSpViewMode('PESANAN');">
                      <td class="font-mono-num text-xs">${idx + 1}.</td>
                      <td class="font-bold text-xs text-blue-700 dark:text-blue-300">${S().esc(p.nama)}</td>
                      <td class="font-mono-num text-xs font-bold text-right">${p.spList.length} SP</td>
                      <td class="font-mono-num text-xs text-right">${p.totalItem} Produk</td>
                      <td class="font-mono-num text-xs font-bold text-right text-emerald-600">${S().rp(p.totalRp)}</td>
                      <td class="text-xs">${S().esc(pRef.kontak_wa || '-')}</td>
                      <td onclick="event.stopPropagation()">
                        <button type="button" onclick="window.setSpFilterPbf('${S().esc(p.id)}');window.setSpViewMode('PESANAN');" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2.5">Lihat SP PBF Ini &rarr;</button>
                      </td>
                    </tr>`;
                  }).join('');
                })()}
              </tbody>
            </table>
          ` : `
            <table class="ons-table">
              <thead>
                <tr>
                  <th class="w-8"><input type="checkbox" aria-label="Pilih semua pesanan" ${allVisibleSelected ? 'checked' : ''} onchange="window.toggleSelectAllSp(this.checked)"/></th>
                  <th>No.</th>
                  <th>Tanggal</th>
                  <th>No. SP</th>
                  <th>Supplier</th>
                  <th>Produk</th>
                  <th>Status Penerimaan</th>
                  <th>Status &amp; Golongan</th>
                  <th class="text-right">Total</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${rows.length ? rows.map((sp, idx) => {
                  const items = parseSpItems(sp);
                  const done = String(sp.status_sp || '').toUpperCase() === 'SELESAI_DITERIMA';
                  const isBatal = String(sp.status_sp || '').toUpperCase() === 'DIBATALKAN';
                  const itemPreview = items.slice(0, 2).map((x) => `${x.nama_dagang || x.id_obat} (${x.qty || x.qty_pesan} ${x.satuan_dasar || x.satuan || ''})`).join(', ');
                  const checked = spSelectedIds.has(sp.id_sp);
                  return `<tr class="cursor-pointer hover:bg-blue-50/50 dark:hover:bg-slate-800/50 transition-colors" onclick="window.openSpDetailModal('${S().esc(sp.id_sp)}')">
                    <td onclick="event.stopPropagation()"><input type="checkbox" aria-label="Pilih ${S().esc(sp.no_sp)}" ${checked ? 'checked' : ''} onchange="window.toggleSelectSpRow('${S().esc(sp.id_sp)}', this.checked)"/></td>
                    <td class="font-mono-num text-xs">${idx + 1}.</td>
                    <td class="text-xs font-mono-num whitespace-nowrap">${S().formatTgl(sp.tanggal || sp.tgl_sp || '')}</td>
                    <td class="text-xs font-mono-num font-bold whitespace-nowrap">
                      <button type="button" onclick="event.stopPropagation();window.openSpA4PreviewModal('${S().esc(sp.id_sp)}')" class="text-blue-600 dark:text-blue-400 hover:underline font-bold text-left font-mono-num" title="Klik untuk Pratinjau &amp; Cetak A4">${S().esc(sp.no_sp)}</button>
                    </td>
                    <td class="text-xs font-bold text-slate-800 dark:text-slate-100">${S().esc(sp.nama_pbf || '-')}</td>
                    <td class="text-xs">
                      <div><b>${items.length} item</b></div>
                      <div class="text-[11px] truncate max-w-[240px]" style="color:var(--ons-text-soft)">${S().esc(itemPreview)}${items.length > 2 ? ', +' + (items.length - 2) + ' lagi' : ''}</div>
                    </td>
                    <td class="text-xs">
                      ${spStatusBadge(sp.status_sp)}
                      ${sp.no_faktur_pbf ? `<div class="text-[11px] font-mono-num mt-1" style="color:var(--ons-text-soft)">Faktur: ${S().esc(sp.no_faktur_pbf)}</div>` : ''}
                    </td>
                    <td>
                      <div class="flex flex-col gap-0.5 items-start">
                        <span class="badge-bpom bpom-keras">${S().esc(sp.golongan_sp || 'REGULER')}</span>
                        <span class="text-[10px] font-mono-num" style="color:var(--ons-text-soft)">${S().esc(sp.metode_pembayaran || 'KREDIT')}</span>
                      </div>
                    </td>
                    <td class="text-right font-mono-num text-xs font-bold whitespace-nowrap">${S().rp(sp.estimasi_total || 0)}</td>
                    <td onclick="event.stopPropagation()">
                      <div class="flex flex-wrap gap-1.5">
                        <button type="button" onclick="window.openSpDetailModal('${S().esc(sp.id_sp)}')" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2 font-bold">Detail</button>
                        <button type="button" onclick="window.openSpA4PreviewModal('${S().esc(sp.id_sp)}')" class="ons-btn ons-btn-primary text-[11px] py-1 px-2.5">Preview &amp; Cetak A4</button>
                        ${!isBatal ? `<button type="button" onclick="window.openEditSpModal('${S().esc(sp.id_sp)}')" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2">Edit SP</button>` : ''}
                        <button type="button" onclick="window.duplicateSp('${S().esc(sp.id_sp)}')" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2" title="Duplikat SP">&#128203; Duplikat</button>
                        <button type="button" onclick="window.sendSpViaWa('${S().esc(sp.id_sp)}')" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2">WA PBF</button>
                        ${!done && !isBatal ? `
                          <button type="button" onclick="window.markSpClosed('${S().esc(sp.id_sp)}')" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2 text-emerald-600 font-semibold" title="Tandai Selesai">&#10003; Selesai</button>
                          <button type="button" onclick="window.confirmCancelSp('${S().esc(sp.id_sp)}')" class="ons-btn text-[11px] py-1 px-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950">Batal</button>
                          <button type="button" onclick="window.loadSpIntoGrn('${S().esc(sp.id_sp)}')" class="ons-btn ons-btn-emerald text-[11px] py-1 px-2.5">Barang Tiba &rarr; Faktur</button>
                        ` : ''}
                      </div>
                    </td>
                  </tr>`;
                }).join('') : '<tr><td colspan="10" class="text-center py-8 text-xs">Data tidak ditemukan. Klik <b>+ Pesanan Baru</b> atau buat dari <b>Rencana Pembelian</b> / <b>Defecta</b>.</td></tr>'}
              </tbody>
            </table>
          `}
        </div>
      </div>

      <div class="ons-card p-4">
        <div class="text-xs font-extrabold text-blue-600 mb-2">Rekap Pesanan Pembelian${(spDateFrom || spDateTo) ? ` (${S().esc(spDateFrom || '...')} s.d. ${S().esc(spDateTo || '...')})` : ''}</div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div class="flex items-center justify-between p-2.5 rounded-lg border" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
            <span style="color:var(--ons-text-soft)">Total Nilai Pesanan</span>
            <b class="font-mono-num text-sm text-blue-600">${S().rp(totalNilaiPesanan)}</b>
          </div>
          <div class="flex items-center justify-between p-2.5 rounded-lg border" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
            <span style="color:var(--ons-text-soft)">Jumlah Pesanan</span>
            <b class="font-mono-num text-sm">${rows.length} &times;${spSelectedIds.size ? ` (${spSelectedIds.size} dipilih)` : ''}</b>
          </div>
        </div>
      </div>
    </div>`;
  }

  function buildCreateSpModalHtml() {
    const st = S().AppState;
    const prof = S().getStoreProfile();
    const pbfs = st.supplierPbf || [];
    if (!spDraftPbfId && pbfs[0]) spDraftPbfId = pbfs[0].id_pbf;
    if (!spDraftTanggal) spDraftTanggal = new Date().toISOString().slice(0, 10);
    if (!spDraftDueDate && spDraftPayMethod !== 'TUNAI') spDraftDueDate = computeSpDueFromPbf(spDraftPbfId, spDraftTanggal);
    if (!spDraftPemesan) spDraftPemesan = prof.nama_pemilik || prof.nama_apj || (st.user && st.user.nama) || 'Apoteker Penanggung Jawab';
    const isEdit = Boolean(spEditingId);
    const dq = spDraftSearch.trim().toLowerCase();
    const candidates = (st.masterObat || []).filter((o) => {
      if (!dq) return true;
      return `${o.nama_dagang || ''} ${o.zat_aktif || ''} ${o.pbf_utama || ''}`.toLowerCase().includes(dq);
    }).slice(0, 14);
    const pendingMap = buildPendingSpQtyMap(st);
    const estTotal = spDraftItems.reduce((s, x) => s + (Number(x.qty || 0) * Number(x.hpp_terakhir || x.hpp_unit || 0)), 0);

    return `<div class="ons-ws-modal" data-ws-custom="1">
      <div class="ons-ws-header">
        <div>
          <h2 class="text-base sm:text-lg font-extrabold tracking-tight">${isEdit ? `Edit Surat Pesanan (SP) &mdash; ${S().esc(spDraftNoSp || spEditingId)}` : 'Buat Surat Pesanan (SP) Manual &mdash; Pesanan Pembelian'}</h2>
          <p class="text-[11px]" style="color:var(--ons-text-soft)">${isEdit ? 'Ubah nomor surat, tanggal, PBF, daftar obat, satuan, atau jumlah pesanan sebelum dicetak ke kertas A4.' : 'Pilih supplier, jenis SP BPOM, metode bayar, dan item pesanan. Stok sistem &amp; qty sedang dipesan tampil otomatis.'}</p>
        </div>
        <div class="flex items-center gap-2">
          ${!isEdit ? `<button type="button" onclick="window.saveSpDraftToLocal()" class="ons-btn ons-btn-ghost text-xs">Simpan Draft</button>` : ''}
          <button type="button" onclick="window.ONSStore.closeModal()" class="ons-btn ons-btn-ghost text-xs">Tutup (Esc)</button>
        </div>
      </div>
      <div class="ons-ws-body space-y-4">
        <div class="ons-card p-3.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 text-xs">
          <div class="lg:col-span-2">
            <label class="text-[11px] font-bold block mb-1">Supplier *</label>
            <div class="flex gap-1.5">
              <select class="ons-select text-xs flex-1" onchange="window.setSpDraftField('pbf', this.value)">
                ${pbfs.map((p) => `<option value="${S().esc(p.id_pbf)}" ${spDraftPbfId === p.id_pbf ? 'selected' : ''}>${S().esc(p.nama_pbf)} (${S().esc(p.kode_cdob || 'CDOB')})</option>`).join('')}
              </select>
              <button type="button" onclick="window.ONSStore.closeModal();window.openSupplierPbfModal();" title="Tambah Supplier Baru" class="ons-btn ons-btn-primary text-xs px-2.5 shrink-0">+</button>
            </div>
          </div>
          <div>
            <label class="text-[11px] font-bold block mb-1">No. Surat Pesanan *</label>
            <div class="flex gap-1.5">
              <input id="spDraftNoInp" class="ons-input font-mono-num text-xs flex-1" value="${S().esc(spDraftNoSp)}" placeholder="Kosongkan untuk Otomatis" oninput="window.setSpDraftField('no_sp', this.value)"/>
              <button type="button" onclick="window.regenerateDraftSpNumber()" title="Generate Nomor SP Otomatis" class="ons-btn ons-btn-ghost text-xs px-2 shrink-0">&#9851; Auto</button>
            </div>
          </div>
          <div>
            <label class="text-[11px] font-bold block mb-1">Tanggal Pemesanan</label>
            <input id="spDraftTglInp" type="date" class="ons-input text-xs" value="${S().esc(spDraftTanggal)}" onchange="window.setSpDraftField('tanggal', this.value)"/>
          </div>
          <div>
            <label class="text-[11px] font-bold block mb-1">Jenis Surat Pesanan</label>
            <select class="ons-select text-xs" onchange="window.setSpDraftField('gol', this.value)">
              ${['REGULER', 'PREKURSOR', 'OOT', 'PSIKOTROPIKA', 'NARKOTIKA'].map((g) => `<option value="${g}" ${spDraftGol === g ? 'selected' : ''}>${g === 'REGULER' ? 'Biasa (Reguler)' : g}</option>`).join('')}
            </select>
          </div>
          <div class="grid grid-cols-2 gap-1.5">
            <div>
              <label class="text-[11px] font-bold block mb-1">Metode Bayar</label>
              <select class="ons-select text-xs" onchange="window.setSpDraftField('pay_method', this.value)">
                <option value="KREDIT" ${spDraftPayMethod !== 'TUNAI' ? 'selected' : ''}>Kredit</option>
                <option value="TUNAI" ${spDraftPayMethod === 'TUNAI' ? 'selected' : ''}>Tunai</option>
              </select>
            </div>
            <div>
              <label class="text-[11px] font-bold block mb-1">Jatuh Tempo</label>
              <input id="spDraftDueInp" type="date" class="ons-input text-xs" ${spDraftPayMethod === 'TUNAI' ? 'disabled' : ''} value="${S().esc(spDraftPayMethod === 'TUNAI' ? '' : spDraftDueDate)}" onchange="window.setSpDraftField('due_date', this.value)"/>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div class="lg:col-span-4 ons-card p-4 space-y-2.5">
            <div class="flex items-center justify-between gap-2">
              <div class="text-xs font-extrabold uppercase tracking-wider text-blue-600">Pilih Produk Katalog</div>
              <button type="button" onclick="window.addSpBulkLowStockItems()" class="text-[11px] font-bold text-blue-600 hover:underline">&#9889; Tambah Produk Sekaligus</button>
            </div>
            <input class="ons-input text-xs" value="${S().esc(spDraftSearch)}" placeholder="Cari produk, zat aktif, supplier..." oninput="window.setSpDraftField('search', this.value)"/>
            <div class="max-h-56 overflow-y-auto space-y-1.5 pr-1">
              ${candidates.map((o) => {
                const stok = S().getSellableStok(o.id_obat);
                const sedang = Number(pendingMap[o.id_obat] || 0);
                return `<div class="p-2 rounded-lg border flex items-center justify-between gap-2 text-xs" style="border-color:var(--ons-border);background:var(--ons-bg-subtle)">
                  <div class="min-w-0">
                    <div class="font-bold truncate">${S().esc(o.nama_dagang)}</div>
                    <div class="text-[10px]" style="color:var(--ons-text-soft)">Stok: <b>${stok}</b> &bull; Dipesan: <b>${sedang}</b> &bull; HPP: ${S().rp(o.hpp_terakhir || o.hpp_avg || 0)}</div>
                  </div>
                  <button type="button" onclick="window.addSpDraftItem('${S().esc(o.id_obat)}')" class="ons-btn ons-btn-primary text-[11px] py-1 px-2.5 shrink-0">+ Tambah</button>
                </div>`;
              }).join('')}
            </div>
            <div class="pt-2 border-t space-y-1.5" style="border-color:var(--ons-border)">
              <div class="text-[11px] font-bold" style="color:var(--ons-text-soft)">Atau Tambah Item Manual (Belum Ada di Katalog):</div>
              <div class="grid grid-cols-12 gap-1.5">
                <input id="spCustomNameInp" class="ons-input text-xs col-span-6" placeholder="Nama Obat / Alkes..."/>
                <input id="spCustomUnitInp" class="ons-input text-xs col-span-3" placeholder="Satuan" value="Box"/>
                <button type="button" onclick="window.addSpDraftCustomItem()" class="ons-btn ons-btn-ghost text-[11px] col-span-3 px-2">+ Item</button>
              </div>
            </div>
          </div>

          <div class="lg:col-span-8 ons-card p-4 space-y-3 flex flex-col">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div class="text-xs font-extrabold uppercase tracking-wider text-emerald-600">Daftar Item Pesanan (${spDraftItems.length} Produk)</div>
                <div class="text-[11px]" style="color:var(--ons-text-soft)">Nama item, kuantitas, satuan, harga beli satuan, dan keterangan dapat diedit langsung sebelum simpan/cetak A4.</div>
              </div>
              <span id="spDraftEstTotalBadge" class="font-mono-num text-sm font-extrabold text-blue-600">TOTAL ${S().rp(estTotal)}</span>
            </div>
            <div class="ons-table-wrap flex-1">
              <table class="ons-table">
                <thead><tr><th>No.</th><th>Produk</th><th class="text-right">Stok Sistem</th><th class="text-right">Sedang Dipesan</th><th>Kuantitas</th><th>Satuan</th><th>Harga Beli Satuan</th><th class="text-right">Sub Total</th><th>Keterangan</th><th></th></tr></thead>
                <tbody>
                  ${spDraftItems.length ? spDraftItems.map((it, idx) => {
                    const stokSys = it.id_obat && !String(it.id_obat).startsWith('CUSTOM-') ? S().getSellableStok(it.id_obat) : '-';
                    const sedangSys = it.id_obat ? Number(pendingMap[it.id_obat] || 0) : 0;
                    const hppVal = Number(it.hpp_terakhir !== undefined ? it.hpp_terakhir : (it.hpp_unit || 0));
                    return `<tr>
                      <td class="font-mono-num text-xs">${idx + 1}.</td>
                      <td>
                        <input class="ons-input text-xs font-bold py-1 min-h-0 min-w-[150px]" value="${S().esc(it.nama_dagang)}" onchange="window.updateSpDraftField(${idx}, 'nama_dagang', this.value)"/>
                      </td>
                      <td class="text-right font-mono-num text-xs font-semibold">${stokSys}</td>
                      <td class="text-right font-mono-num text-xs">${sedangSys > 0 ? `<span class="badge-bpom bpom-terbatas">${sedangSys}</span>` : '0'}</td>
                      <td><input type="number" min="1" class="ons-input w-20 text-xs font-mono-num py-1 min-h-0 text-right" value="${it.qty}" onchange="window.updateSpDraftQty(${idx}, this.value)"/></td>
                      <td>
                        <input class="ons-input text-xs w-20 py-1 min-h-0" value="${S().esc(it.satuan_dasar || it.satuan || 'Unit')}" onchange="window.updateSpDraftField(${idx}, 'satuan_dasar', this.value)"/>
                      </td>
                      <td><input type="number" min="0" class="ons-input w-24 text-xs font-mono-num py-1 min-h-0 text-right" value="${hppVal}" onchange="window.updateSpDraftField(${idx}, 'hpp_terakhir', this.value)"/></td>
                      <td class="font-mono-num text-xs font-bold text-right whitespace-nowrap">${S().rp(Number(it.qty || 0) * hppVal)}</td>
                      <td><input class="ons-input text-xs w-28 py-1 min-h-0" value="${S().esc(it.keterangan || '')}" placeholder="Catatan item..." onchange="window.updateSpDraftField(${idx}, 'keterangan', this.value)"/></td>
                      <td><button type="button" onclick="window.removeSpDraftItem(${idx})" class="text-xs text-red-600 font-bold px-1.5 py-1">Hapus</button></td>
                    </tr>`;
                  }).join('') : '<tr><td colspan="10" class="text-center py-10 text-xs" style="color:var(--ons-text-soft)">Pilih produk dari panel kiri atau klik <b>Tambah Produk Sekaligus</b> untuk memasukkan item Defecta/katalog.</td></tr>'}
                </tbody>
              </table>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t text-xs" style="border-color:var(--ons-border)">
              <div>
                <label class="text-[11px] font-bold block mb-1">Pemesan (APJ / Pengadaan)</label>
                <input id="spDraftPemesanInp" class="ons-input text-xs" value="${S().esc(spDraftPemesan)}" oninput="window.setSpDraftField('pemesan', this.value)"/>
              </div>
              <div>
                <label class="text-[11px] font-bold block mb-1">Catatan Pesanan</label>
                <input class="ons-input text-xs" value="${S().esc(spDraftCatatan)}" placeholder="Tulis catatan pesanan di sini..." oninput="window.setSpDraftField('catatan', this.value)"/>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="ons-ws-footer flex flex-wrap items-center justify-between gap-2">
        <div class="text-xs font-extrabold text-blue-600 font-mono-num">TOTAL PESANAN: ${S().rp(estTotal)}</div>
        <div class="flex flex-wrap gap-2">
          <button type="button" onclick="window.ONSStore.closeModal()" class="ons-btn ons-btn-ghost text-xs">Batal</button>
          ${!isEdit ? `<button type="button" onclick="window.saveSpDraftToLocal()" class="ons-btn ons-btn-ghost text-xs">Simpan Draft</button>` : ''}
          <button type="button" onclick="window.submitCreateSpManual()" class="ons-btn ons-btn-primary text-xs font-bold">${isEdit ? 'Simpan Perubahan &amp; Preview A4 &rarr;' : 'Simpan SP &amp; Buka Preview A4 &rarr;'}</button>
        </div>
      </div>
    </div>`;
  }

  // ==========================
  // 3. RINGKASAN ALUR OBAT MASUK & KELUAR
  // ==========================
  function renderStockFlowSummary(mutasiRows) {
    let masukUnit = 0;
    let keluarUnit = 0;
    let masukTrx = 0;
    let keluarTrx = 0;
    (mutasiRows || []).forEach((m) => {
      const q = Number(m.qty_ubah || 0);
      if (q > 0) { masukUnit += q; masukTrx++; }
      else if (q < 0) { keluarUnit += Math.abs(q); keluarTrx++; }
    });
    const netUnit = masukUnit - keluarUnit;
    return `<div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
      <div class="p-3 rounded-xl border" style="background:rgba(16,185,129,.08);border-color:rgba(16,185,129,.3)">
        <div class="text-[11px] font-bold text-emerald-700">&#8595; Total Obat Masuk (+)</div>
        <div class="text-2xl font-extrabold font-mono-num text-emerald-600 mt-0.5">+${masukUnit} unit</div>
        <div class="text-[11px]" style="color:var(--ons-text-soft)">${masukTrx} log penerimaan faktur / retur</div>
      </div>
      <div class="p-3 rounded-xl border" style="background:rgba(239,68,68,.08);border-color:rgba(239,68,68,.3)">
        <div class="text-[11px] font-bold text-red-700">&#8593; Total Obat Keluar (-)</div>
        <div class="text-2xl font-extrabold font-mono-num text-red-600 mt-0.5">-${keluarUnit} unit</div>
        <div class="text-[11px]" style="color:var(--ons-text-soft)">${keluarTrx} log penjualan POS / BAR-PBF</div>
      </div>
      <div class="p-3 rounded-xl border" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
        <div class="text-[11px] font-bold" style="color:var(--ons-text-soft)">Selisih Arus Bersih (Net Flow)</div>
        <div class="text-2xl font-extrabold font-mono-num mt-0.5 ${netUnit >= 0 ? 'text-emerald-600' : 'text-amber-600'}">${netUnit > 0 ? '+' : ''}${netUnit} unit</div>
        <div class="text-[11px]" style="color:var(--ons-text-soft)">Keseimbangan masuk vs keluar</div>
      </div>
      <div class="p-3 rounded-xl border flex flex-col justify-between" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
        <div>
          <div class="text-[11px] font-bold" style="color:var(--ons-text-soft)">Cetak Laporan Resmi BPOM</div>
          <div class="text-xs mt-1">Format Kartu Stok A4 siap arsip.</div>
        </div>
        <button type="button" onclick="window.printAlurObatA4()" class="ons-btn ons-btn-primary text-[11px] py-1.5 mt-2">Cetak Alur Obat A4</button>
      </div>
    </div>`;
  }

  // ==========================
  // EKSPOR GLOBAL HANDLERS
  // ==========================
  global.setSpFilterStatus = (v) => { spFilterStatus = v || 'SEMUA'; global.renderActiveView(); };
  global.setSpSearchQ = (v) => { spSearchQ = v || ''; global.renderActiveView(); };
  global.setSpDateRange = (which, val) => {
    if (which === 'from') spDateFrom = val || '';
    else if (which === 'to') spDateTo = val || '';
    else if (which === 'clear') { spDateFrom = ''; spDateTo = ''; }
    global.renderActiveView();
  };
  global.toggleSelectSpRow = (idSp, checked) => {
    if (checked) spSelectedIds.add(idSp); else spSelectedIds.delete(idSp);
    global.renderActiveView();
  };
  global.toggleSelectAllSp = (checked) => {
    const allSp = S().AppState.suratPesanan || [];
    spSelectedIds.clear();
    if (checked) allSp.forEach((sp) => spSelectedIds.add(sp.id_sp));
    global.renderActiveView();
  };
  global.exportSpList = (fmt) => {
    const allSp = (S().AppState.suratPesanan || []).filter((sp) => !spSelectedIds.size || spSelectedIds.has(sp.id_sp));
    const rows = allSp.map((sp, i) => ({
      no: i + 1,
      tanggal: String(sp.tanggal || sp.tgl_sp || '').slice(0, 10),
      no_sp: sp.no_sp || '',
      golongan: sp.golongan_sp || 'REGULER',
      supplier: sp.nama_pbf || '',
      jml_item: parseSpItems(sp).length,
      status_terima: sp.status_sp || 'MENUNGGU_BARANG',
      total: Number(sp.estimasi_total || 0)
    }));
    S().exportDataset(fmt || 'xlsx', 'Daftar Pesanan Pembelian (SP)', `pesanan-pembelian-${new Date().toISOString().slice(0, 10)}`, [
      { key: 'no', label: 'No', type: 'int', width: 6 },
      { key: 'tanggal', label: 'Tanggal', type: 'str', width: 13 },
      { key: 'no_sp', label: 'No. SP', type: 'str', width: 22 },
      { key: 'golongan', label: 'Jenis SP', type: 'str', width: 13 },
      { key: 'supplier', label: 'Supplier', type: 'wrap', width: 26 },
      { key: 'jml_item', label: 'Produk', type: 'int', width: 10 },
      { key: 'status_terima', label: 'Status Penerimaan', type: 'str', width: 18 },
      { key: 'total', label: 'Total', type: 'currency', sum: true, width: 18 }
    ], rows, { sheetName: 'PesananPembelian' });
  };

  global.openSpDraftModal = () => {
    const drafts = loadSpLocalDrafts();
    S().openModal(`<div class="p-5 sm:p-6 space-y-4">
      <div class="flex items-center justify-between gap-2 bg-blue-600 text-white -m-5 sm:-m-6 mb-4 px-5 py-3.5 rounded-t-2xl">
        <h3 class="font-extrabold text-base">Draft Pesanan Pembelian (${drafts.length})</h3>
        <button type="button" onclick="window.ONSStore.closeModal()" class="text-white/90 hover:text-white text-lg px-2">&times;</button>
      </div>
      <div class="ons-table-wrap max-h-80">
        <table class="ons-table">
          <thead><tr><th>No.</th><th>Terakhir Disimpan</th><th>Supplier</th><th>No. SP</th><th>Produk</th><th class="text-right">Total</th><th>Action</th></tr></thead>
          <tbody>
            ${drafts.length ? drafts.map((d, idx) => {
              const total = (d.items || []).reduce((s, it) => s + Number(it.qty || 0) * Number(it.hpp_terakhir || it.hpp_unit || 0), 0);
              return `<tr>
                <td class="font-mono-num text-xs">${idx + 1}.</td>
                <td class="font-mono-num text-xs">${S().formatTgl(d.saved_at || '', true)}</td>
                <td class="text-xs font-bold">${S().esc(d.nama_pbf || d.id_pbf || '-')}</td>
                <td class="font-mono-num text-xs">${S().esc(d.no_sp || '(Otomatis)')}</td>
                <td class="text-xs">${(d.items || []).length} item</td>
                <td class="text-right font-mono-num text-xs font-bold">${S().rp(total)}</td>
                <td>
                  <div class="flex gap-1.5">
                    <button type="button" onclick="window.loadSpDraftFromLocal('${S().esc(d.id_draft)}')" class="ons-btn ons-btn-primary text-[11px] py-1 px-2.5">Lanjutkan</button>
                    <button type="button" onclick="window.deleteSpDraftFromLocal('${S().esc(d.id_draft)}')" class="ons-btn ons-btn-danger text-[11px] py-1 px-2">Hapus</button>
                  </div>
                </td>
              </tr>`;
            }).join('') : '<tr><td colspan="7" class="text-center py-8 text-xs" style="color:var(--ons-text-soft)">Data tidak ditemukan.</td></tr>'}
          </tbody>
        </table>
      </div>
      <div class="flex flex-wrap items-center justify-between gap-3 pt-2 border-t text-xs" style="border-color:var(--ons-border)">
        <div class="p-2.5 rounded-xl border bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300 flex-1">
          <b>Catatan:</b> Draft ini tersimpan di perangkat &amp; browser ini. Klik <b>Lanjutkan</b> lalu <b>Simpan SP</b> untuk menerbitkan Surat Pesanan resmi.
        </div>
        <button type="button" onclick="window.ONSStore.closeModal()" class="ons-btn ons-btn-ghost text-xs">Kembali</button>
      </div>
    </div>`, { mode: 'spotlight', maxWidth: '820px' });
  };

  global.saveSpDraftToLocal = () => {
    const noEl = document.getElementById('spDraftNoInp');
    const tglEl = document.getElementById('spDraftTglInp');
    const dueEl = document.getElementById('spDraftDueInp');
    const pemEl = document.getElementById('spDraftPemesanInp');
    if (noEl) spDraftNoSp = String(noEl.value || '').trim();
    if (tglEl && tglEl.value) spDraftTanggal = String(tglEl.value || '').trim();
    if (dueEl && dueEl.value) spDraftDueDate = String(dueEl.value || '').trim();
    if (pemEl) spDraftPemesan = String(pemEl.value || '').trim();
    const pbf = (S().AppState.supplierPbf || []).find((p) => p.id_pbf === spDraftPbfId || p.nama_pbf === spDraftPbfId) || {};
    const drafts = loadSpLocalDrafts();
    const draftId = spActiveDraftLocalId || ('SPD-' + Date.now());
    const entry = {
      id_draft: draftId,
      saved_at: new Date().toISOString(),
      id_pbf: pbf.id_pbf || spDraftPbfId || '',
      nama_pbf: pbf.nama_pbf || spDraftPbfId || 'PBF Reguler',
      no_sp: spDraftNoSp,
      tanggal: spDraftTanggal || new Date().toISOString().slice(0, 10),
      golongan_sp: spDraftGol || 'REGULER',
      metode_pembayaran: spDraftPayMethod || 'KREDIT',
      tgl_jatuh_tempo: spDraftDueDate || '',
      pemesan: spDraftPemesan || '',
      catatan: spDraftCatatan || '',
      items: spDraftItems
    };
    const idx = drafts.findIndex((x) => x.id_draft === draftId);
    if (idx >= 0) drafts[idx] = entry; else drafts.unshift(entry);
    saveSpLocalDrafts(drafts);
    spActiveDraftLocalId = '';
    S().closeModal();
    global.toast('Draft Pesanan Pembelian tersimpan di browser.', 'ok');
    global.renderActiveView();
  };

  global.loadSpDraftFromLocal = (draftId) => {
    const d = loadSpLocalDrafts().find((x) => x.id_draft === draftId);
    if (!d) return global.toast('Draft pesanan tidak ditemukan.', 'warn');
    spEditingId = '';
    spActiveDraftLocalId = d.id_draft;
    spDraftNoSp = d.no_sp || '';
    spDraftTanggal = d.tanggal || new Date().toISOString().slice(0, 10);
    spDraftPbfId = d.id_pbf || '';
    spDraftGol = d.golongan_sp || 'REGULER';
    spDraftPayMethod = d.metode_pembayaran || 'KREDIT';
    spDraftDueDate = d.tgl_jatuh_tempo || '';
    spDraftPemesan = d.pemesan || '';
    spDraftCatatan = d.catatan || '';
    spDraftSearch = '';
    spDraftItems = Array.isArray(d.items) ? d.items.slice() : [];
    S().openModal(buildCreateSpModalHtml(), 'full');
  };

  global.deleteSpDraftFromLocal = (draftId) => {
    const next = loadSpLocalDrafts().filter((x) => x.id_draft !== draftId);
    saveSpLocalDrafts(next);
    global.openSpDraftModal();
  };

  global.addSpBulkLowStockItems = () => {
    const st = S().AppState;
    const pbf = (st.supplierPbf || []).find((p) => p.id_pbf === spDraftPbfId || p.nama_pbf === spDraftPbfId);
    const pbfName = pbf ? pbf.nama_pbf : '';
    const lowAll = (st.masterObat || []).filter((o) => S().getSellableStok(o.id_obat) <= Number(o.stok_min || 10));
    const filtered = pbfName ? lowAll.filter((o) => o.pbf_utama === pbfName) : lowAll;
    const picked = filtered.length ? filtered : (lowAll.length ? lowAll : (st.masterObat || []).slice(0, 3));
    let added = 0;
    picked.forEach((o) => {
      if (!spDraftItems.some((x) => x.id_obat === o.id_obat)) {
        const s = S().getSellableStok(o.id_obat);
        spDraftItems.push({
          id_obat: o.id_obat,
          nama_dagang: o.nama_dagang,
          zat_aktif: o.zat_aktif || '',
          golongan_bpom: o.golongan_bpom || 'BEBAS',
          satuan_dasar: o.satuan_dasar || 'Unit',
          qty: Math.max(10, Number(o.stok_max || 100) - s),
          hpp_terakhir: Number(o.hpp_terakhir || o.hpp_avg || 0),
          keterangan: 'Defecta stok tipis'
        });
        added++;
      }
    });
    global.toast(added ? `${added} produk stok menipis ditambahkan sekaligus.` : 'Semua produk rekomendasi sudah ada di daftar pesanan.', added ? 'ok' : 'info');
    S().openModal(buildCreateSpModalHtml(), 'full');
  };

  global.openSpModalFromPlans = (pbfName, golSp, itemsArr, catatan) => {
    const st = S().AppState;
    const pbfs = st.supplierPbf || [];
    const matchedPbf = pbfs.find((p) => p.nama_pbf === pbfName || p.id_pbf === pbfName) || pbfs[0] || {};
    spEditingId = '';
    spActiveDraftLocalId = '';
    spDraftNoSp = '';
    spDraftTanggal = new Date().toISOString().slice(0, 10);
    spDraftPbfId = matchedPbf.id_pbf || '';
    spDraftGol = String(golSp || 'REGULER').toUpperCase();
    spDraftPayMethod = 'KREDIT';
    spDraftDueDate = computeSpDueFromPbf(spDraftPbfId, spDraftTanggal);
    spDraftPemesan = '';
    spDraftCatatan = catatan || 'Dibuat dari Rencana Pembelian Apotek';
    spDraftSearch = '';
    spDraftItems = (itemsArr || []).map((it) => ({
      id_obat: it.id_obat || ('CUSTOM-' + Date.now().toString().slice(-4)),
      nama_dagang: it.nama_dagang || it.nama_produk || 'Produk',
      zat_aktif: it.zat_aktif || '',
      golongan_bpom: it.golongan_bpom || it.jenis_sp || spDraftGol,
      satuan_dasar: it.satuan_dasar || it.satuan || 'Unit',
      qty: Math.max(1, Number(it.qty || it.kuantitas || 1)),
      hpp_terakhir: Math.max(0, Number(it.hpp_terakhir || it.hpp_unit || it.harga_beli || 0)),
      keterangan: it.keterangan || ''
    }));
    S().openModal(buildCreateSpModalHtml(), 'full');
  };

  global.openCreateSpModal = () => {
    const pbfs = S().AppState.supplierPbf || [];
    spEditingId = '';
    spActiveDraftLocalId = '';
    spDraftGol = 'REGULER';
    spDraftNoSp = generateSpNumber('REGULER');
    spDraftTanggal = new Date().toISOString().slice(0, 10);
    spDraftPbfId = (pbfs[0] && pbfs[0].id_pbf) || '';
    spDraftPayMethod = 'KREDIT';
    spDraftDueDate = computeSpDueFromPbf(spDraftPbfId, spDraftTanggal);
    spDraftPemesan = '';
    spDraftItems = [];
    spDraftSearch = '';
    spDraftCatatan = '';
    S().openModal(buildCreateSpModalHtml(), 'full');
  };

  global.openEditSpModal = (idSp) => {
    const st = S().AppState;
    const sp = (st.suratPesanan || []).find((x) => x.id_sp === idSp);
    if (!sp) return global.toast('Data Surat Pesanan tidak ditemukan.', 'warn');
    const pbf = (st.supplierPbf || []).find((p) => p.id_pbf === sp.id_pbf || p.nama_pbf === sp.nama_pbf);
    spEditingId = sp.id_sp;
    spActiveDraftLocalId = '';
    spDraftNoSp = sp.no_sp || '';
    spDraftTanggal = String(sp.tanggal || sp.tgl_sp || new Date().toISOString().slice(0, 10)).slice(0, 10);
    spDraftPbfId = (pbf && pbf.id_pbf) || sp.id_pbf || ((st.supplierPbf[0] && st.supplierPbf[0].id_pbf) || '');
    spDraftGol = String(sp.golongan_sp || 'REGULER').toUpperCase();
    spDraftPayMethod = String(sp.metode_pembayaran || 'KREDIT').toUpperCase();
    spDraftDueDate = sp.tgl_jatuh_tempo || (spDraftPayMethod === 'TUNAI' ? '' : computeSpDueFromPbf(spDraftPbfId, spDraftTanggal));
    spDraftPemesan = sp.dibuat_oleh || '';
    spDraftCatatan = sp.catatan || '';
    spDraftSearch = '';
    spDraftItems = parseSpItems(sp).map((it) => {
      const obRef = (st.masterObat || []).find((m) => m.id_obat === it.id_obat) || {};
      return {
        id_obat: it.id_obat || ('CUSTOM-' + Math.random().toString(36).slice(2, 6).toUpperCase()),
        nama_dagang: it.nama_dagang || obRef.nama_dagang || it.id_obat || 'Obat',
        zat_aktif: it.zat_aktif || obRef.zat_aktif || '',
        golongan_bpom: it.golongan_bpom || obRef.golongan_bpom || spDraftGol,
        satuan_dasar: it.satuan_dasar || it.satuan || obRef.satuan_dasar || 'Unit',
        qty: Math.max(1, Number(it.qty || it.qty_pesan || 1)),
        hpp_terakhir: Math.max(0, Number(it.hpp_terakhir !== undefined ? it.hpp_terakhir : (it.hpp_unit !== undefined ? it.hpp_unit : (it.hpp || obRef.hpp_terakhir || obRef.hpp_avg || 0)))),
        keterangan: it.keterangan || ''
      };
    });
    S().openModal(buildCreateSpModalHtml(), 'full');
  };

  global.setSpDraftField = (key, val) => {
    if (key === 'no_sp') spDraftNoSp = val;
    else if (key === 'tanggal') {
      spDraftTanggal = val;
      if (spDraftPayMethod !== 'TUNAI') spDraftDueDate = computeSpDueFromPbf(spDraftPbfId, val);
    } else if (key === 'pbf') {
      spDraftPbfId = val;
      if (spDraftPayMethod !== 'TUNAI') spDraftDueDate = computeSpDueFromPbf(val, spDraftTanggal);
    } else if (key === 'gol') spDraftGol = val;
    else if (key === 'pay_method') {
      spDraftPayMethod = val;
      spDraftDueDate = val === 'TUNAI' ? '' : computeSpDueFromPbf(spDraftPbfId, spDraftTanggal);
    } else if (key === 'due_date') spDraftDueDate = val;
    else if (key === 'pemesan') spDraftPemesan = val;
    else if (key === 'catatan') spDraftCatatan = val;
    else if (key === 'search') spDraftSearch = val;
    if (!['catatan', 'no_sp', 'pemesan'].includes(key)) S().openModal(buildCreateSpModalHtml(), 'full');
  };

  global.addSpDraftCustomItem = () => {
    const nmEl = document.getElementById('spCustomNameInp');
    const unitEl = document.getElementById('spCustomUnitInp');
    const nm = nmEl ? String(nmEl.value || '').trim() : '';
    const unit = (unitEl ? String(unitEl.value || '').trim() : '') || 'Box';
    if (!nm) return global.toast('Isi nama obat/alkes terlebih dahulu.', 'warn');
    spDraftItems.push({
      id_obat: 'CUSTOM-' + Date.now().toString().slice(-5),
      nama_dagang: nm,
      zat_aktif: '-',
      golongan_bpom: spDraftGol || 'REGULER',
      satuan_dasar: unit,
      qty: 1,
      hpp_terakhir: 0,
      keterangan: ''
    });
    S().openModal(buildCreateSpModalHtml(), 'full');
  };

  global.addSpDraftItem = (idObat) => {
    const o = (S().AppState.masterObat || []).find((m) => m.id_obat === idObat);
    if (!o) return;
    const exist = spDraftItems.find((x) => x.id_obat === idObat);
    if (exist) {
      exist.qty = Number(exist.qty || 0) + 10;
    } else {
      spDraftItems.push({
        id_obat: o.id_obat,
        nama_dagang: o.nama_dagang,
        zat_aktif: o.zat_aktif || '',
        golongan_bpom: o.golongan_bpom || 'BEBAS',
        satuan_dasar: o.satuan_dasar || 'Unit',
        qty: Math.max(10, Number(o.stok_min || 10)),
        hpp_terakhir: Number(o.hpp_terakhir || o.hpp_avg || 0),
        keterangan: ''
      });
    }
    S().openModal(buildCreateSpModalHtml(), 'full');
  };

  global.updateSpDraftField = (idx, field, val) => {
    const it = spDraftItems[idx];
    if (!it) return;
    if (field === 'hpp_terakhir') it.hpp_terakhir = Math.max(0, Number(val || 0));
    else if (field === 'qty') it.qty = Math.max(1, Number(val || 1));
    else it[field] = String(val || '');
    S().openModal(buildCreateSpModalHtml(), 'full');
  };

  global.updateSpDraftQty = (idx, val) => {
    if (spDraftItems[idx]) spDraftItems[idx].qty = Math.max(1, Number(val || 1));
    S().openModal(buildCreateSpModalHtml(), 'full');
  };

  global.removeSpDraftItem = (idx) => {
    spDraftItems.splice(idx, 1);
    S().openModal(buildCreateSpModalHtml(), 'full');
  };

  global.submitCreateSpManual = async () => {
    try {
      if (!spDraftItems.length) throw new Error('Tambahkan minimal 1 item obat ke Surat Pesanan.');
      const noEl = document.getElementById('spDraftNoInp');
      const tglEl = document.getElementById('spDraftTglInp');
      const dueEl = document.getElementById('spDraftDueInp');
      const pemEl = document.getElementById('spDraftPemesanInp');
      if (noEl) spDraftNoSp = String(noEl.value || '').trim();
      if (tglEl && tglEl.value) spDraftTanggal = String(tglEl.value || '').trim();
      if (dueEl) spDraftDueDate = String(dueEl.value || '').trim();
      if (pemEl) spDraftPemesan = String(pemEl.value || '').trim();
      const pbf = (S().AppState.supplierPbf || []).find((p) => p.id_pbf === spDraftPbfId) || {};
      const payload = {
        id_pbf: pbf.id_pbf || '',
        nama_pbf: pbf.nama_pbf || 'PBF Reguler',
        golongan_sp: spDraftGol || 'REGULER',
        metode_pembayaran: spDraftPayMethod || 'KREDIT',
        tgl_jatuh_tempo: spDraftPayMethod === 'TUNAI' ? '' : spDraftDueDate,
        pemesan: spDraftPemesan,
        tanggal: spDraftTanggal || new Date().toISOString().slice(0, 10),
        items: spDraftItems,
        create_doc: false,
        catatan: spDraftCatatan
      };
      if (spEditingId) payload.id_sp = spEditingId;
      if (spDraftNoSp) payload.no_sp = spDraftNoSp;
      const wasEdit = Boolean(spEditingId);
      const res = await API().callApi('sp.save', payload, { isWrite: true });
      if (spActiveDraftLocalId) {
        saveSpLocalDrafts(loadSpLocalDrafts().filter((x) => x.id_draft !== spActiveDraftLocalId));
        spActiveDraftLocalId = '';
      }
      spEditingId = '';
      S().closeModal();
      global.toast('Surat Pesanan ' + (res && res.item ? res.item.no_sp : '') + (wasEdit ? ' berhasil diperbarui!' : ' berhasil dibuat!'), 'ok');
      await global.bootLoadState(true);
      if (typeof global.setFakturTab === 'function') global.setFakturTab('sp');
      if (res && res.item && res.item.id_sp) {
        global.openSpA4PreviewModal(res.item.id_sp);
      }
    } catch (e) {
      global.toast(e.message, 'err');
    }
  };

  global.setSpFilterPbf = (pbfId) => {
    spFilterPbf = pbfId || '';
    if (typeof global.setFakturTab === 'function') global.setFakturTab('sp');
    else global.renderActiveView();
  };

  global.setSpFilterGol = (gol) => {
    spFilterGol = gol || 'SEMUA';
    if (typeof global.setFakturTab === 'function') global.setFakturTab('sp');
    else global.renderActiveView();
  };

  global.regenerateDraftSpNumber = () => {
    spDraftNoSp = generateSpNumber(spDraftGol);
    const noInp = document.getElementById('spDraftNoInp');
    if (noInp) noInp.value = spDraftNoSp;
    S().openModal(buildCreateSpModalHtml(), 'full');
    global.toast('Nomor SP otomatis diperbarui: ' + spDraftNoSp, 'info');
  };

  global.duplicateSp = (idSp) => {
    const st = S().AppState;
    const sp = (st.suratPesanan || []).find((x) => x.id_sp === idSp);
    if (!sp) return global.toast('Surat Pesanan tidak ditemukan.', 'warn');
    const pbf = (st.supplierPbf || []).find((p) => p.id_pbf === sp.id_pbf || p.nama_pbf === sp.nama_pbf);
    spEditingId = '';
    spActiveDraftLocalId = '';
    spDraftGol = String(sp.golongan_sp || 'REGULER').toUpperCase();
    spDraftNoSp = generateSpNumber(spDraftGol);
    spDraftTanggal = new Date().toISOString().slice(0, 10);
    spDraftPbfId = (pbf && pbf.id_pbf) || sp.id_pbf || ((st.supplierPbf[0] && st.supplierPbf[0].id_pbf) || '');
    spDraftPayMethod = String(sp.metode_pembayaran || 'KREDIT').toUpperCase();
    spDraftDueDate = computeSpDueFromPbf(spDraftPbfId, spDraftTanggal);
    spDraftPemesan = (st.user && st.user.nama) || 'Apoteker Penanggung Jawab';
    spDraftCatatan = sp.catatan ? 'Duplikat dari ' + (sp.no_sp || '') + ': ' + sp.catatan : '';
    spDraftSearch = '';
    spDraftItems = parseSpItems(sp).map((it) => {
      const obRef = (st.masterObat || []).find((m) => m.id_obat === it.id_obat) || {};
      return {
        id_obat: it.id_obat || ('CUSTOM-' + Math.random().toString(36).slice(2, 6).toUpperCase()),
        nama_dagang: it.nama_dagang || obRef.nama_dagang || it.id_obat || 'Obat',
        zat_aktif: it.zat_aktif || obRef.zat_aktif || '',
        golongan_bpom: it.golongan_bpom || obRef.golongan_bpom || spDraftGol,
        satuan_dasar: it.satuan_dasar || it.satuan || obRef.satuan_dasar || 'Unit',
        qty: Math.max(1, Number(it.qty || it.qty_pesan || 1)),
        hpp_terakhir: Math.max(0, Number(it.hpp_terakhir !== undefined ? it.hpp_terakhir : (it.hpp_unit !== undefined ? it.hpp_unit : (it.hpp || obRef.hpp_terakhir || obRef.hpp_avg || 0)))),
        keterangan: it.keterangan || ''
      };
    });
    S().closeModal();
    S().openModal(buildCreateSpModalHtml(), 'full');
    global.toast('Data SP berhasil diduplikat ke draf baru dengan No. SP otomatis!', 'ok');
  };

  global.confirmCancelSp = async (idSp) => {
    const st = S().AppState;
    const sp = (st.suratPesanan || []).find((x) => x.id_sp === idSp);
    if (!sp) return global.toast('Surat Pesanan tidak ditemukan.', 'warn');
    if (String(sp.status_sp || '').toUpperCase() === 'SELESAI_DITERIMA') {
      return global.toast('Surat Pesanan yang sudah selesai diterima tidak dapat dibatalkan.', 'warn');
    }
    const alasan = prompt('Batalkan Surat Pesanan ' + (sp.no_sp || idSp) + '?\n\nMasukkan alasan pembatalan (misal: Stok PBF kosong / Revisi pemesanan):', 'Stok PBF kosong / Revisi pemesanan');
    if (alasan === null) return;
    try {
      await API().callApi('sp.cancel', { id_sp: idSp, alasan: (alasan || '').trim() || 'Dibatalkan oleh staf apotek' }, { isWrite: true });
      global.toast('Surat Pesanan ' + (sp.no_sp || idSp) + ' berhasil dibatalkan.', 'ok');
      await global.bootLoadState(true);
      if (typeof global.setFakturTab === 'function') global.setFakturTab('sp');
      else global.renderActiveView();
    } catch (e) {
      global.toast('Gagal membatalkan Surat Pesanan: ' + e.message, 'err');
    }
  };

  global.downloadSpDocument = (idSp) => {
    const sp = (S().AppState.suratPesanan || []).find((x) => x.id_sp === idSp);
    if (!sp) return global.toast('Surat Pesanan tidak ditemukan.', 'warn');
    const docHtml = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8"/>
  <title>Surat Pesanan - ${S().esc(sp.no_sp || idSp)}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm; }
    body { margin: 0; background: #e2e8f0; font-family: 'Segoe UI', Arial, sans-serif; display: flex; justify-content: center; padding: 20px; }
    @media print { body { background: #fff; padding: 0; } }
  </style>
</head>
<body>
  ${buildSpA4DocumentHtml(sp, spPreviewShowPrice, spPreviewRangkap, spPreviewHideKop, spPaperSize)}
</body>
</html>`;
    const blob = new Blob([docHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Surat_Pesanan_${String(sp.no_sp || idSp).replace(/[^a-zA-Z0-9_-]/g, '_')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    global.toast('Dokumen Surat Pesanan HTML berhasil diunduh.', 'ok');
  };

  global.changeSpRangkap = (idSp, val) => {
    spPreviewRangkap = Number(val || 0);
    global.openSpA4PreviewModal(idSp);
  };

  global.setSpViewMode = (mode) => {
    spViewMode = mode || 'PESANAN';
    if (typeof global.setFakturTab === 'function') global.setFakturTab('sp');
    else global.renderActiveView();
  };

  global.toggleSpHideKopPreview = (idSp, checked) => {
    spPreviewHideKop = Boolean(checked);
    global.openSpA4PreviewModal(idSp);
  };

  global.changeSpPaperSize = (idSp, size) => {
    spPaperSize = size || 'A4';
    global.openSpA4PreviewModal(idSp);
  };

  global.markSpClosed = async (idSp) => {
    const st = S().AppState;
    const sp = (st.suratPesanan || []).find((x) => x.id_sp === idSp);
    if (!sp) return global.toast('Surat Pesanan tidak ditemukan.', 'warn');
    if (!confirm('Tandai Surat Pesanan ' + (sp.no_sp || idSp) + ' sebagai SELESAI (CLOSED)?')) return;
    try {
      await API().callApi('sp.save', { id_sp: idSp, status_sp: 'SELESAI_DITERIMA', catatan: (sp.catatan ? sp.catatan + ' | ' : '') + 'Ditutup selesai manual' }, { isWrite: true });
      global.toast('Surat Pesanan ' + (sp.no_sp || idSp) + ' ditandai selesai (CLOSED).', 'ok');
      await global.bootLoadState(true);
      if (typeof global.setFakturTab === 'function') global.setFakturTab('sp');
      else global.renderActiveView();
    } catch (e) {
      global.toast('Gagal menandai selesai: ' + e.message, 'err');
    }
  };

  global.openSpDetailModal = (idSp) => {
    const st = S().AppState;
    const sp = (st.suratPesanan || []).find((x) => x.id_sp === idSp);
    if (!sp) return global.toast('Surat Pesanan tidak ditemukan.', 'warn');
    const items = parseSpItems(sp);
    const pbf = (st.supplierPbf || []).find((p) => p.id_pbf === sp.id_pbf || p.nama_pbf === sp.nama_pbf) || {};

    const html = `<div class="ons-ws-modal" data-ws-custom="1">
      <div class="ons-ws-header">
        <div>
          <h2 class="text-base sm:text-lg font-extrabold tracking-tight">Detail Surat Pesanan (Read-Only) &mdash; ${S().esc(sp.no_sp)}</h2>
          <p class="text-[11px]" style="color:var(--ons-text-soft)">Rincian lengkap data pemesanan obat ke supplier distributor PBF.</p>
        </div>
        <div class="flex items-center gap-2">
          <button type="button" onclick="window.openSpA4PreviewModal('${S().esc(idSp)}')" class="ons-btn ons-btn-primary text-xs font-bold">&#128424; Cetak / Preview A4</button>
          <button type="button" onclick="window.openEditSpModal('${S().esc(idSp)}')" class="ons-btn ons-btn-amber text-xs">&#9998; Edit SP</button>
          <button type="button" onclick="window.duplicateSp('${S().esc(idSp)}')" class="ons-btn ons-btn-ghost text-xs">&#128203; Duplikat</button>
          <button type="button" onclick="window.ONSStore.closeModal()" class="ons-btn ons-btn-ghost text-xs">Tutup</button>
        </div>
      </div>
      <div class="ons-ws-body space-y-4">
        <div class="ons-card p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div><span class="text-slate-500 block text-[10.5px]">No. Surat Pesanan</span><b class="font-mono-num text-sm text-blue-600">${S().esc(sp.no_sp)}</b></div>
          <div><span class="text-slate-500 block text-[10.5px]">Supplier PBF</span><b>${S().esc(sp.nama_pbf || pbf.nama_pbf || '-')}</b></div>
          <div><span class="text-slate-500 block text-[10.5px]">Tanggal SP</span><b class="font-mono-num">${S().formatTgl(sp.tanggal || sp.tgl_sp || '')}</b></div>
          <div><span class="text-slate-500 block text-[10.5px]">Jenis SP BPOM</span><span class="badge-bpom bpom-keras">${S().esc(sp.golongan_sp || 'REGULER')}</span></div>
          <div><span class="text-slate-500 block text-[10.5px]">Metode Bayar</span><b>${S().esc(sp.metode_pembayaran || 'KREDIT')}</b></div>
          <div><span class="text-slate-500 block text-[10.5px]">Jatuh Tempo</span><b class="font-mono-num">${S().esc(sp.tgl_jatuh_tempo || '-')}</b></div>
          <div><span class="text-slate-500 block text-[10.5px]">Status Dokumen</span>${spStatusBadge(sp.status_sp)}</div>
          <div><span class="text-slate-500 block text-[10.5px]">Total Estimasi Nilai</span><b class="font-mono-num text-sm text-emerald-600">${S().rp(sp.estimasi_total || 0)}</b></div>
        </div>

        <div class="ons-card p-4 space-y-2">
          <div class="text-xs font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wide">Daftar Item Obat Terlampir (${items.length} Produk)</div>
          <div class="ons-table-wrap">
            <table class="ons-table">
              <thead><tr><th>No.</th><th>Produk Obat</th><th>Zat Aktif &amp; Golongan</th><th class="text-right">Qty Pesan</th><th>Satuan</th><th class="text-right">Est. HPP Unit</th><th class="text-right">Est. Subtotal</th><th>Catatan</th></tr></thead>
              <tbody>
                ${items.map((it, idx) => {
                  const qty = Number(it.qty || it.qty_pesan || 0);
                  const hpp = Number(it.hpp_terakhir !== undefined ? it.hpp_terakhir : (it.hpp_unit || 0));
                  return `<tr>
                    <td class="font-mono-num text-xs">${idx + 1}.</td>
                    <td class="font-bold text-xs">${S().esc(it.nama_dagang || it.id_obat)}</td>
                    <td class="text-xs text-slate-500">${S().esc(it.zat_aktif || '-')}</td>
                    <td class="font-mono-num text-xs font-bold text-right">${qty}</td>
                    <td class="text-xs">${S().esc(it.satuan_dasar || it.satuan || 'Unit')}</td>
                    <td class="font-mono-num text-xs text-right">${S().rp(hpp)}</td>
                    <td class="font-mono-num text-xs font-bold text-right">${S().rp(qty * hpp)}</td>
                    <td class="text-xs text-slate-500">${S().esc(it.keterangan || '-')}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>`;
    S().openModal(html, 'full');
  };

  global.openSpA4PreviewModal = (idSp) => {
    const st = S().AppState;
    const sp = (st.suratPesanan || []).find((x) => x.id_sp === idSp);
    if (!sp) return global.toast('Data Surat Pesanan tidak ditemukan.', 'warn');
    const done = String(sp.status_sp || '').toUpperCase() === 'SELESAI_DITERIMA';
    const isBatal = String(sp.status_sp || '').toUpperCase() === 'DIBATALKAN';
    const isNarc = String(sp.golongan_sp || '').toUpperCase() === 'NARKOTIKA';

    const modalHtml = `<div class="ons-ws-modal" data-ws-custom="1">
      <div class="ons-ws-header">
        <div>
          <h2 class="text-base sm:text-lg font-extrabold tracking-tight">Preview Cetak Kertas A4 &mdash; ${S().esc(sp.no_sp)}</h2>
          <p class="text-[11px]" style="color:var(--ons-text-soft)">Pratinjau proporsi kertas A4 Portrait (210 &times; 297 mm) standar BPOM. Dilengkapi QR Code verifikasi legalitas APJ.</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <label class="text-xs flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border cursor-pointer" style="border-color:var(--ons-border)">
            <input type="checkbox" ${spPreviewShowPrice ? 'checked' : ''} onchange="window.toggleSpA4PricePreview('${S().esc(idSp)}', this.checked)"/>
            <span>Tampilkan Estimasi Harga</span>
          </label>
          <label class="text-xs flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border cursor-pointer" style="border-color:var(--ons-border)">
            <input type="checkbox" ${spPreviewHideKop ? 'checked' : ''} onchange="window.toggleSpHideKopPreview('${S().esc(idSp)}', this.checked)"/>
            <span>Sembunyikan Kop Surat (Pre-Printed)</span>
          </label>
          <select class="ons-select text-xs w-28" onchange="window.changeSpPaperSize('${S().esc(idSp)}', this.value)">
            <option value="A4" ${spPaperSize === 'A4' ? 'selected' : ''}>Ukuran A4</option>
            <option value="A5" ${spPaperSize === 'A5' ? 'selected' : ''}>Ukuran A5</option>
          </select>
          ${isNarc ? `
            <select class="ons-select text-xs w-36" onchange="window.changeSpRangkap('${S().esc(idSp)}', this.value)">
              <option value="0" ${spPreviewRangkap === 0 ? 'selected' : ''}>Semua 4 Rangkap</option>
              <option value="1" ${spPreviewRangkap === 1 ? 'selected' : ''}>Rangkap 1 (PBF)</option>
              <option value="2" ${spPreviewRangkap === 2 ? 'selected' : ''}>Rangkap 2 (Dinkes)</option>
              <option value="3" ${spPreviewRangkap === 3 ? 'selected' : ''}>Rangkap 3 (BBPOM)</option>
              <option value="4" ${spPreviewRangkap === 4 ? 'selected' : ''}>Rangkap 4 (Apotek)</option>
            </select>
          ` : ''}
          <button type="button" onclick="window.printSuratPesananA4('${S().esc(idSp)}')" class="ons-btn ons-btn-primary text-xs font-bold">&#128424; Cetak Kertas A4</button>
          <button type="button" onclick="window.downloadSpDocument('${S().esc(idSp)}')" class="ons-btn ons-btn-ghost text-xs">&#11015; Unduh HTML</button>
          ${!isBatal ? `<button type="button" onclick="window.openEditSpModal('${S().esc(idSp)}')" class="ons-btn ons-btn-amber text-xs">&#9998; Edit Isi SP</button>` : ''}
          <button type="button" onclick="window.duplicateSp('${S().esc(idSp)}')" class="ons-btn ons-btn-ghost text-xs">&#128203; Duplikat SP</button>
          <button type="button" onclick="window.sendSpViaWa('${S().esc(idSp)}')" class="ons-btn ons-btn-emerald text-xs">Kirim WA PBF</button>
          ${!done && !isBatal ? `
            <button type="button" onclick="window.confirmCancelSp('${S().esc(idSp)}')" class="ons-btn text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950">Batalkan SP</button>
            <button type="button" onclick="window.ONSStore.closeModal();window.loadSpIntoGrn('${S().esc(idSp)}')" class="ons-btn ons-btn-ghost text-xs">Barang Tiba &rarr; Terima Faktur</button>
          ` : ''}
          <button type="button" onclick="window.ONSStore.closeModal()" class="ons-btn ons-btn-ghost text-xs">Tutup</button>
        </div>
      </div>
      <div class="ons-ws-body" style="background:#cbd5e1;padding:24px 12px">
        ${buildSpA4DocumentHtml(sp, spPreviewShowPrice, spPreviewRangkap)}
      </div>
    </div>`;
    S().openModal(modalHtml, 'full');
  };

  global.toggleSpA4PricePreview = (idSp, checked) => {
    spPreviewShowPrice = Boolean(checked);
    global.openSpA4PreviewModal(idSp);
  };

  global.printSuratPesananA4 = (idSp) => {
    const sp = (S().AppState.suratPesanan || []).find((x) => x.id_sp === idSp);
    if (!sp) return global.toast('Surat Pesanan tidak ditemukan.', 'warn');
    const gol = String(sp.golongan_sp || 'REGULER').toUpperCase();
    const isNarc = gol === 'NARKOTIKA';
    const isA5 = spPaperSize === 'A5';

    let printBody = '';
    if (isNarc && (spPreviewRangkap === 0 || !spPreviewRangkap)) {
      printBody = [1, 2, 3, 4].map((rIdx) => {
        return `<div style="${rIdx < 4 ? 'page-break-after:always;' : ''}">${buildSpA4DocumentHtml(sp, spPreviewShowPrice, rIdx, spPreviewHideKop, spPaperSize)}</div>`;
      }).join('');
    } else {
      printBody = buildSpA4DocumentHtml(sp, spPreviewShowPrice, spPreviewRangkap || 1, spPreviewHideKop, spPaperSize);
    }

    const pageSizeCss = isA5 ? 'size:A5 portrait;margin:8mm;' : 'size:A4 portrait;margin:10mm;';
    const a4Html = `<style>@page{${pageSizeCss}}@media print{body{margin:0;background:#fff;}.ons-kop-preprinted{border:none !important;visibility:hidden !important;}}</style>${printBody}`;
    S().printHtmlZone(a4Html);
  };

  global.sendSpViaWa = (idSp) => {
    const st = S().AppState;
    const sp = (st.suratPesanan || []).find((x) => x.id_sp === idSp);
    if (!sp) return;
    const pbf = (st.supplierPbf || []).find((p) => p.id_pbf === sp.id_pbf || p.nama_pbf === sp.nama_pbf) || {};
    const phone = pbf.kontak_wa || '';
    if (!phone) return global.toast('Nomor WhatsApp sales PBF belum diisi di Direktori PBF.', 'warn');
    const prof = S().getStoreProfile();
    const items = parseSpItems(sp);
    const lines = items.map((it, i) => `${i + 1}. ${it.nama_dagang || it.id_obat} — ${it.qty || it.qty_pesan} ${it.satuan_dasar || it.satuan || 'Unit'}`).join('\n');
    const msg = `Halo tim *${sp.nama_pbf}*,\nBerikut pemesanan resmi dari *${prof.nama_apotek || 'Apotek ONS Farma'}* (SIA: ${prof.no_sia || '503/001/SIA/DPMPTSP/2025'}):\n\n*No. SP:* ${sp.no_sp} (${sp.golongan_sp || 'REGULER'})\n*Daftar Item:*\n${lines}\n\nMohon konfirmasi ketersediaan & estimasi pengiriman. Terima kasih.\n_${prof.nama_apj || prof.nama_pemilik || 'Apoteker Penanggung Jawab'} (APJ)_`;
    const url = S().buildWaUrl(phone, msg);
    if (url) window.open(url, '_blank', 'noopener');
  };

  global.printAlurObatA4 = () => {
    const st = S().AppState;
    const prof = S().getStoreProfile();
    const mutasi = st.mutasiStok || [];
    const masuk = mutasi.filter((m) => Number(m.qty_ubah || 0) > 0).reduce((s, m) => s + Number(m.qty_ubah || 0), 0);
    const keluar = mutasi.filter((m) => Number(m.qty_ubah || 0) < 0).reduce((s, m) => s + Math.abs(Number(m.qty_ubah || 0)), 0);
    const html = `<style>@page{size:A4 portrait;margin:12mm;}</style>
      <div style="font-family:Arial,sans-serif;color:#0f172a;font-size:11px">
        <div style="border-bottom:2px solid #0f172a;padding-bottom:8px;margin-bottom:12px">
          <div style="font-size:16px;font-weight:800">${S().esc(prof.nama_apotek || 'APOTEK ONS FARMA')}</div>
          <div>Laporan Kartu Stok &amp; Alur Obat Masuk / Keluar &bull; Dicetak: ${S().formatTgl(new Date().toISOString(), true)}</div>
        </div>
        <div style="margin-bottom:10px;font-weight:700">Ringkasan Arus: Total Masuk +${masuk} Unit | Total Keluar -${keluar} Unit | Net ${masuk - keluar} Unit</div>
        <table style="width:100%;border-collapse:collapse;font-size:10.5px">
          <thead><tr style="background:#e2e8f0"><th style="border:1px solid #64748b;padding:5px">Waktu</th><th style="border:1px solid #64748b;padding:5px">Produk</th><th style="border:1px solid #64748b;padding:5px">Batch</th><th style="border:1px solid #64748b;padding:5px">Jenis Mutasi</th><th style="border:1px solid #64748b;padding:5px">Masuk / Keluar</th><th style="border:1px solid #64748b;padding:5px">Stok Akhir</th><th style="border:1px solid #64748b;padding:5px">Referensi</th></tr></thead>
          <tbody>
            ${mutasi.slice(0, 150).map((m) => `<tr>
              <td style="border:1px solid #94a3b8;padding:4px">${S().formatTgl(m.timestamp, true)}</td>
              <td style="border:1px solid #94a3b8;padding:4px"><b>${S().esc(m.nama_dagang || m.id_obat)}</b></td>
              <td style="border:1px solid #94a3b8;padding:4px">${S().esc(m.no_batch || m.id_batch || '-')}</td>
              <td style="border:1px solid #94a3b8;padding:4px">${S().esc(m.jenis_mutasi)}</td>
              <td style="border:1px solid #94a3b8;padding:4px;text-align:right;font-weight:700">${Number(m.qty_ubah) > 0 ? '+' : ''}${m.qty_ubah}</td>
              <td style="border:1px solid #94a3b8;padding:4px;text-align:right">${m.stok_akhir}</td>
              <td style="border:1px solid #94a3b8;padding:4px">${S().esc(m.referensi_id || '-')}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
    S().printHtmlZone(html);
  };

  // Price Decision Handlers
  global.setPriceTargetMargin = (v) => { priceTargetMargin = Math.min(85, Math.max(1, Number(v || 25))); global.renderActiveView(); };
  global.setPriceHppBasis = (v) => { priceHppBasis = v || 'LAST'; global.renderActiveView(); };
  global.setPriceRoundStep = (v) => { priceRoundStep = Number(v || 0); global.renderActiveView(); };
  global.setPriceFilterStatus = (v) => { priceFilterStatus = v || 'ACTION'; global.renderActiveView(); };
  global.setPriceSearchQ = (v) => { priceSearchQ = v || ''; global.renderActiveView(); };

  global.setPriceDraftField = (idObat, field, val) => {
    if (!priceDraftEdits[idObat]) priceDraftEdits[idObat] = {};
    priceDraftEdits[idObat][field] = Math.max(0, window.parseNumber ? window.parseNumber(val || 0) : Number(val || 0));
    global.renderActiveView();
  };

  global.fillSuggestedPriceRow = (idObat) => {
    const o = (S().AppState.masterObat || []).find((m) => m.id_obat === idObat);
    if (!o) return;
    const calc = computePriceDecision(o);
    priceDraftEdits[idObat] = {
      harga_umum: calc.saranUmum,
      harga_member: calc.saranMember,
      harga_grosir: calc.saranGrosir,
      harga_faskes: calc.saranFaskes
    };
    global.toast('Saran harga (' + S().rp(calc.saranUmum) + ') diisi ke baris ' + o.nama_dagang + '. Klik Simpan Harga untuk menerapkan.', 'info');
    global.renderActiveView();
  };

  global.applySinglePriceAnalysis = async (idObat) => {
    const o = (S().AppState.masterObat || []).find((m) => m.id_obat === idObat);
    if (!o) return;
    const calc = computePriceDecision(o);
    const d = priceDraftEdits[idObat] || {};
    const payload = {
      id_obat: idObat,
      harga_umum: d.harga_umum !== undefined ? Number(d.harga_umum) : calc.saranUmum,
      harga_member: d.harga_member !== undefined ? Number(d.harga_member) : calc.saranMember,
      harga_grosir: d.harga_grosir !== undefined ? Number(d.harga_grosir) : calc.saranGrosir,
      harga_faskes: d.harga_faskes !== undefined ? Number(d.harga_faskes) : calc.saranFaskes
    };
    try {
      await API().callApi('obat.updatePrices', { items: [payload], catatan: 'Analisa Harga & Margin Satuan' }, { isWrite: true });
      delete priceDraftEdits[idObat];
      global.toast('Harga jual ' + o.nama_dagang + ' berhasil diperbarui ke ' + S().rp(payload.harga_umum) + '!', 'ok');
      await global.bootLoadState(true);
    } catch (e) {
      global.toast(e.message, 'err');
    }
  };

  global.applyBulkPriceAnalysis = async () => {
    const st = S().AppState;
    const items = (st.masterObat || []).map((o) => {
      const calc = computePriceDecision(o);
      if (!calc.needsAction || calc.saranUmum <= calc.hargaUmum) return null;
      return {
        id_obat: o.id_obat,
        harga_umum: calc.saranUmum,
        harga_member: calc.saranMember,
        harga_grosir: calc.saranGrosir,
        harga_faskes: calc.saranFaskes
      };
    }).filter(Boolean);
    if (!items.length) return global.toast('Tidak ada produk yang perlu dinaikkan saat ini.', 'info');
    try {
      await API().callApi('obat.updatePrices', { items, catatan: 'Penyesuaian Massal Target Margin ' + priceTargetMargin + '%' }, { isWrite: true });
      priceDraftEdits = {};
      st._lastHppAlerts = [];
      global.toast(items.length + ' produk berhasil diperbarui harga jualnya sesuai target margin ' + priceTargetMargin + '%!', 'ok');
      await global.bootLoadState(true);
    } catch (e) {
      global.toast(e.message, 'err');
    }
  };

  global.ONSProcurementPro = {
    parseSpItems,
    computePriceDecision,
    buildSpA4DocumentHtml,
    renderSuratPesananTab,
    renderAnalisaHargaTab,
    renderStockFlowSummary
  };
})(window);
