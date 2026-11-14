/**
 * ONS FARMA DIGITAL ENTERPRISE v10.0 - Modul W-04 (Master Obat), W-05 (Gudang FEFO & Recall),
 * W-06 (Defecta & SP BPOM 5 Golongan), dan W-07 (Faktur PBF OCR/Excel & Retur BAR-PBF)
 */
(function (global) {
  'use strict';
  const S = () => global.ONSStore;
  const API = () => global.ONSApi;

  let masterTab = 'obat'; // obat | supplier | pelanggan | dokter | sales
  let masterFilterGol = '';
  let masterFilterStok = 'SEMUA'; // SEMUA | AMAN | KRITIS | HABIS | NEAR_ED
  let masterFilterSediaan = 'SEMUA'; // SEMUA | TABLET | KAPSUL | SIRUP | SALEP | INJEKSI | LAINNYA
  let masterFilterStatusJual = 'SEMUA'; // SEMUA | DIJUAL | TIDAK_DIJUAL
  let masterSortBy = 'NAMA'; // NAMA | NAMA_DESC | STOK_ASC | STOK_DESC | ED_ASC | HARGA_DESC | HARGA_ASC | MARGIN_DESC | VALUASI_DESC
  let masterViewMode = 'TABLE'; // TABLE | CARD
  let masterSearchQ = '';
  let supplierSearchQ = '';
  let supplierStatusFilter = 'SEMUA'; // SEMUA | AKTIF | NONAKTIF
  let pelangganSearchQ = '';
  let pelangganProgFilter = 'SEMUA'; // SEMUA | MEMBER_RUTIN | UMUM | MITRA_KLINIK | ALERGI
  let dokterSearchQ = '';
  let dokterStatusFilter = 'SEMUA'; // SEMUA | AKTIF | NONAKTIF | SPESIALIS
  let salesSearchQ = '';
  let wizardFullScrollMode = false;
  let wizardStep = 1;
  let importObatBuffer = [];
  let gudangTab = 'batch';
  let mutasiFilterObat = '';
  let mutasiFilterJenis = '';
  let opnameRakFilter = '';
  let opnameViewMode = 'TABLE'; // TABLE | CARD (Mobile HP)
  let opnameSessionActive = false;
  let edSelectedIds = new Set();
  let edDateFrom = '';
  let edDateTo = '';
  let adjFilterType = 'SEMUA'; // SEMUA | POSITIF | NEGATIF
  let adjSearchQ = '';
  let adjDateFrom = '';
  let adjDateTo = '';
  let trfSearchQ = '';
  let trfFilterMode = 'SEMUA'; // SEMUA | INTERNAL | CABANG
  let trfDateFrom = '';
  let trfDateTo = '';
  let defectaSearchQ = '';
  let defectaStatusFilter = 'SEMUA'; // SEMUA | DIBAWAH_MIN | KOSONG
  let invRekapCollapsed = {};

  function _readJsonLs(key, fallback) {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return parsed !== null && parsed !== undefined ? parsed : fallback;
    } catch (e) { return fallback; }
  }
  function _writeJsonLs(key, val) {
    try { if (typeof localStorage !== 'undefined') localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }

  const SALES_STAFF_KEY = 'ONS_SALES_STAFF_V1';
  const PELANGGAN_EXTRA_KEY = 'ONS_PELANGGAN_EXTRA_V1';
  const DOKTER_EXTRA_KEY = 'ONS_DOKTER_EXTRA_V1';
  const SUPPLIER_EXTRA_KEY = 'ONS_SUPPLIER_EXTRA_V1';

  function _getSalesStaffList() {
    const arr = _readJsonLs(SALES_STAFF_KEY, []);
    return Array.isArray(arr) ? arr : [];
  }
  function _saveSalesStaffList(list) {
    _writeJsonLs(SALES_STAFF_KEY, Array.isArray(list) ? list : []);
  }
  global.getOnsSalesStaffList = _getSalesStaffList;

  function _getExtraRecord(storageKey, id, nama) {
    const map = _readJsonLs(storageKey, {});
    if (!map || typeof map !== 'object') return {};
    const idKey = id ? String(id).trim() : '';
    const nameKey = nama ? ('NAME::' + String(nama).trim().toLowerCase()) : '';
    return Object.assign({}, nameKey && map[nameKey] ? map[nameKey] : {}, idKey && map[idKey] ? map[idKey] : {});
  }
  function _saveExtraRecord(storageKey, id, nama, rec) {
    const map = _readJsonLs(storageKey, {});
    const safeMap = (map && typeof map === 'object') ? map : {};
    const idKey = id ? String(id).trim() : '';
    const nameKey = nama ? ('NAME::' + String(nama).trim().toLowerCase()) : '';
    if (idKey) safeMap[idKey] = rec;
    if (nameKey) safeMap[nameKey] = rec;
    _writeJsonLs(storageKey, safeMap);
  }
  function _renderInvRekapFooter(keyId, titleText, items) {
    const isCollapsed = Boolean(invRekapCollapsed[keyId]);
    const colsHtml = (items || []).map((it) => `
      <div class="flex items-center justify-between gap-2 text-xs py-1">
        <span style="color:var(--ons-text-soft)">${S().esc(it.label)}${it.sub ? `<br/><span class="text-[10px] italic">${S().esc(it.sub)}</span>` : ''}</span>
        <span class="font-bold font-mono-num ${it.cls || ''}">: ${it.valHtml}</span>
      </div>
    `).join('');
    return `<div class="ons-pos-rekap-foot">
      <div class="flex items-center justify-between gap-2 ${isCollapsed ? '' : 'mb-2'}">
        <span class="font-extrabold text-sm text-blue-600 dark:text-blue-400">${titleText}</span>
        <button type="button" onclick="window.toggleInvRekapPanel('${S().esc(keyId)}')" class="ons-btn ons-btn-ghost text-xs py-1 px-2" aria-label="Toggle Ringkasan">${isCollapsed ? '&#9660;' : '&#9650;'}</button>
      </div>
      ${isCollapsed ? '' : `<div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">${colsHtml}</div>`}
    </div>`;
  }
  global.toggleInvRekapPanel = (keyId) => {
    invRekapCollapsed[keyId] = !invRekapCollapsed[keyId];
    global.renderActiveView();
  };

  function _buildWaLink(rawPhone, msg) {
    const digits = S().normalizeWa62 ? S().normalizeWa62(rawPhone) : String(rawPhone || '').replace(/[^0-9]/g, '');
    return (digits && S().buildWaUrl) ? S().buildWaUrl(digits, msg || '') : '';
  }

  function _renderSearchInputWithClear(inpId, clearId, val, placeholder, onInputFn, onClearFn) {
    const hasVal = Boolean(String(val || '').trim());
    return `<div class="ons-md-search-wrap">
      <input id="${inpId}" class="ons-input text-xs" placeholder="${S().esc(placeholder)}" value="${S().esc(val || '')}" oninput="${onInputFn}(this.value)"/>
      <button id="${clearId}" type="button" onclick="${onClearFn}()" aria-label="Bersihkan pencarian" title="Bersihkan" class="ons-md-search-clear ${hasVal ? '' : 'hidden'}">&times;</button>
    </div>`;
  }

  function _patchMasterResults(builderFn, queryVal, clearBtnId) {
    const clearEl = clearBtnId && typeof document !== 'undefined' ? document.getElementById(clearBtnId) : null;
    if (clearEl && clearEl.classList) clearEl.classList.toggle('hidden', !String(queryVal || '').trim());
    const slot = typeof document !== 'undefined' ? document.getElementById('mdResultsSlot') : null;
    if (slot) {
      slot.innerHTML = builderFn();
      return;
    }
    global.renderActiveView();
  }

  function _openDeleteConfirmModal(opts) {
    S().openModal(`<div class="p-6 space-y-3 text-xs">
      <div class="flex justify-between items-center">
        <h3 class="font-bold text-base text-red-600">${S().esc(opts.title)}</h3>
        <button type="button" onclick="ONSStore.closeModal()" class="text-xl">&times;</button>
      </div>
      <p>Anda akan menghapus <b>${S().esc(opts.name)}</b> (<span class="font-mono-num">${S().esc(opts.id)}</span>) dari ${S().esc(opts.entityLabel)}.</p>
      <div class="flex gap-2 justify-end pt-2">
        <button type="button" onclick="ONSStore.closeModal()" class="ons-btn ons-btn-ghost text-xs">Batal</button>
        <button type="button" onclick="${opts.confirmFnName}('${S().esc(opts.id)}')" class="ons-btn ons-btn-danger text-xs">Ya, Hapus</button>
      </div>
    </div>`, '420px');
  }

  function buildObatMeta(o) {
    const stok = S().getSellableStok(o.id_obat);
    const totalFisik = S().getTotalStok(o.id_obat);
    const min = Number(o.stok_min || 10);
    const max = Math.max(Number(o.stok_max || 100), min * 2, stok, 1);
    const pct = Math.min(100, Math.round((stok / max) * 100));
    const isZero = stok <= 0;
    const isLow = stok > 0 && stok <= min;
    const isCritical = isZero || isLow;
    const nearBatch = S().getNearestSellableBatch(o.id_obat) || S().getNearestEdBatch(o.id_obat);
    const edDays = nearBatch && nearBatch.tgl_kadaluarsa ? S().daysUntil(nearBatch.tgl_kadaluarsa) : null;
    const isNearEd = edDays !== null && edDays <= 90;
    const isCold = /2\s*[-–]\s*8|chiller|dingin|kulkas/i.test(String(o.suhu_simpan || ''));
    const hpp = Number(o.hpp_avg || 0);
    const harga = Number(o.harga_umum || 0);
    const marginPct = (hpp > 0 && harga > 0) ? Math.round(((harga - hpp) / hpp) * 100) : null;
    const stokTone = isZero
      ? { label: 'Habis', color: '#DC2626', bar: '#EF4444', badge: 'bpom-keras' }
      : (isLow
        ? { label: 'Menipis', color: '#D97706', bar: '#F59E0B', badge: 'bpom-prekursor' }
        : { label: 'Aman', color: '#059669', bar: '#10B981', badge: 'bpom-bebas' });
    return { o, stok, totalFisik, min, max, pct, isZero, isLow, isCritical, nearBatch, edDays, isNearEd, isCold, hpp, harga, marginPct, stokTone };
  }

  function _getFilteredMasterObatMeta() {
    const st = S().AppState;
    const allMeta = (st.masterObat || []).map(buildObatMeta);
    const filtered = allMeta.filter((m) => {
      const o = m.o;
      if (masterFilterGol && String(o.golongan_bpom || '').toUpperCase() !== masterFilterGol) return false;
      if (masterFilterStok === 'AMAN' && m.isCritical) return false;
      if (masterFilterStok === 'KRITIS' && (!m.isCritical || m.isZero)) return false;
      if (masterFilterStok === 'HABIS' && !m.isZero) return false;
      if (masterFilterStok === 'NEAR_ED' && !m.isNearEd) return false;
      if (masterFilterSediaan && masterFilterSediaan !== 'SEMUA') {
        const sdn = String(o.bentuk_sediaan || '').toUpperCase();
        if (masterFilterSediaan === 'TABLET' && !sdn.includes('TAB') && !sdn.includes('KAPLET') && !sdn.includes('PIL')) return false;
        else if (masterFilterSediaan === 'KAPSUL' && !sdn.includes('KAPSUL') && !sdn.includes('CAPS')) return false;
        else if (masterFilterSediaan === 'SIRUP' && !sdn.includes('SIRUP') && !sdn.includes('SUSP') && !sdn.includes('DROP') && !sdn.includes('LARUTAN') && !sdn.includes('EMULSI') && !sdn.includes('ELIXIR')) return false;
        else if (masterFilterSediaan === 'SALEP' && !sdn.includes('SALEP') && !sdn.includes('KRIM') && !sdn.includes('GEL') && !sdn.includes('LOTION') && !sdn.includes('PASTA')) return false;
        else if (masterFilterSediaan === 'INJEKSI' && !sdn.includes('INJEK') && !sdn.includes('INFUS') && !sdn.includes('PEN') && !sdn.includes('VIAL') && !sdn.includes('AMPUL')) return false;
        else if (masterFilterSediaan === 'LAINNYA') {
          if (sdn.includes('TAB') || sdn.includes('KAPLET') || sdn.includes('PIL') || sdn.includes('KAPSUL') || sdn.includes('CAPS') || sdn.includes('SIRUP') || sdn.includes('SUSP') || sdn.includes('DROP') || sdn.includes('SALEP') || sdn.includes('KRIM') || sdn.includes('GEL') || sdn.includes('INJEK') || sdn.includes('INFUS') || sdn.includes('PEN')) return false;
        }
      }
      if (masterFilterStatusJual === 'DIJUAL' && String(o.status_aktif || 'AKTIF').toUpperCase() === 'NONAKTIF') return false;
      if (masterFilterStatusJual === 'TIDAK_DIJUAL' && String(o.status_aktif || 'AKTIF').toUpperCase() !== 'NONAKTIF') return false;
      if (masterSearchQ) {
        const q = masterSearchQ.toLowerCase();
        const hay = `${o.id_obat} ${o.nama_dagang} ${o.zat_aktif} ${o.kode_kfa} ${o.nie_bpom} ${o.rak_lokasi} ${o.pbf_utama} ${o.bentuk_sediaan} ${o.kekuatan}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => {
      if (masterSortBy === 'STOK_ASC') return a.stok - b.stok;
      if (masterSortBy === 'STOK_DESC') return b.stok - a.stok;
      if (masterSortBy === 'HARGA_DESC') return b.harga - a.harga;
      if (masterSortBy === 'HARGA_ASC') return a.harga - b.harga;
      if (masterSortBy === 'ED_ASC') return (a.edDays === null ? 99999 : a.edDays) - (b.edDays === null ? 99999 : b.edDays);
      if (masterSortBy === 'MARGIN_DESC') return (b.marginPct || 0) - (a.marginPct || 0);
      if (masterSortBy === 'VALUASI_DESC') return (b.stok * b.hpp) - (a.stok * a.hpp);
      if (masterSortBy === 'NAMA_DESC') return String(b.o.nama_dagang || '').localeCompare(String(a.o.nama_dagang || ''));
      return String(a.o.nama_dagang || '').localeCompare(String(b.o.nama_dagang || ''));
    });
    return { allMeta, filtered };
  }

  function renderObatStockBarHtml(m) {
    const edHtml = m.nearBatch
      ? `<div class="text-[11px] font-mono-num mt-1" style="color:${m.isNearEd ? '#DC2626' : 'var(--ons-text-soft)'}">
          ED ${S().esc(m.nearBatch.tgl_kadaluarsa)} (${m.edDays <= 0 ? 'KADALUARSA' : m.edDays + 'h lagi'})
        </div>`
      : `<div class="text-[11px] mt-1" style="color:var(--ons-text-soft)">Belum ada batch aktif</div>`;
    return `<div class="min-w-[130px]">
      <div class="flex items-center justify-between gap-2 text-xs font-mono-num">
        <span class="font-bold" style="color:${m.stokTone.color}">${m.stok} ${S().esc(m.o.satuan_dasar)}</span>
        <span class="text-[10px] font-bold uppercase" style="color:${m.stokTone.color}">${m.stokTone.label}</span>
      </div>
      <div class="ons-stock-track mt-1"><div class="ons-stock-fill" style="width:${m.pct}%;background:${m.stokTone.bar}"></div></div>
      ${edHtml}
    </div>`;
  }

  /**
   * W-04: Master Data Terpadu (Obat KFA/BPOM, Supplier PBF, Pelanggan PRB & Dokter Mitra)
   */
  function _renderMasterKpiBtn(onClickExpr, toneCls, isActive, title, val, sub, valCls) {
    return `<button type="button" onclick="${onClickExpr}" class="ons-md-kpi ${toneCls} ${isActive ? 'is-active' : ''}">
      <div class="text-[10.5px] font-semibold truncate" style="color:var(--ons-text-soft)">${title}</div>
      <div class="text-lg font-extrabold font-mono-num leading-tight mt-0.5 ${valCls || ''}">${val}</div>
      <div class="text-[10.5px] truncate mt-0.5" style="color:var(--ons-text-soft)">${sub}</div>
    </button>`;
  }

  function _renderMasterObatResultsHtml(seeCost, allMeta, filtered) {
    const totalCount = allMeta.length;
    const safeCount = allMeta.filter((m) => !m.isCritical).length;
    const critCount = allMeta.filter((m) => m.isCritical && !m.isZero).length;
    const habisCount = allMeta.filter((m) => m.isZero).length;
    const nearEdCount = allMeta.filter((m) => m.isNearEd).length;
    const dijualCount = allMeta.filter((m) => String(m.o.status_aktif || 'AKTIF').toUpperCase() !== 'NONAKTIF').length;
    const tidakDijualCount = Math.max(0, totalCount - dijualCount);
    const potensiRugiCount = seeCost ? allMeta.filter((m) => Number(m.hpp || 0) > 0 && Number(m.harga || 0) <= Number(m.hpp || 0)).length : 0;
    const totalItemFisik = allMeta.reduce((sum, m) => sum + Math.max(0, m.stok), 0);
    const totalValuasiHpp = seeCost ? allMeta.reduce((sum, m) => sum + (Math.max(0, m.stok) * m.hpp), 0) : 0;
    const hasFilter = Boolean(masterSearchQ || masterFilterGol || masterFilterStok !== 'SEMUA' || masterFilterSediaan !== 'SEMUA' || masterFilterStatusJual !== 'SEMUA');

    const actionButtons = (o) => `<div class="flex flex-wrap items-center gap-1 justify-end">
      <button type="button" onclick="window.openObatDetailModal('${S().esc(o.id_obat)}')" class="ons-btn ons-btn-primary text-[11px] py-1 px-2" title="Detail Monograf Klinis &amp; Batch FEFO">👁️ Detail</button>
      <button type="button" onclick="window.openObatRiwayatBeliModal('${S().esc(o.id_obat)}')" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2 text-blue-700 font-semibold" title="Riwayat Beli dari PBF &amp; Keputusan Harga Jual">📈 Riwayat Beli</button>
      <button type="button" onclick="window.openProductBarcodeModal('${S().esc(o.id_obat)}')" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2" title="Cetak Barcode Label Stiker 58/80mm">🏷️ Barcode</button>
      <button type="button" onclick="window.openObatKartuStok('${S().esc(o.id_obat)}')" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2" title="Buka Kartu Stok &amp; Riwayat Mutasi">📊 Mutasi</button>
      ${seeCost ? `<button type="button" onclick="window.openObatWizardModal('${S().esc(o.id_obat)}')" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2" title="Edit Data &amp; Harga">✏️ Edit</button>` : ''}
      ${seeCost ? `<button type="button" onclick="window.confirmDeleteObat('${S().esc(o.id_obat)}')" class="ons-btn ons-btn-ghost text-[11px] py-1 px-1.5 text-red-500 hover:text-red-700" title="Hapus dari Katalog">🗑️</button>` : ''}
    </div>`;

    const kpiHtml = `<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
      ${_renderMasterKpiBtn("window.setMasterStokFilter('SEMUA')", '', masterFilterStok === 'SEMUA', 'Total Katalog', `${totalCount} Obat`, `${totalItemFisik} unit fisik`, '')}
      ${seeCost ? _renderMasterKpiBtn("window.openBulkMarginWizard()", 'is-sky', false, 'Valuasi Aset HPP', S().rp(totalValuasiHpp), 'Evaluasi margin &amp; harga', 'text-blue-600') : _renderMasterKpiBtn("window.setMasterStatusJual('DIJUAL')", '', masterFilterStatusJual === 'DIJUAL', 'Status Dijual', `${dijualCount} Obat`, 'Siap transaksi POS', 'text-emerald-600')}
      ${_renderMasterKpiBtn("window.setMasterStokFilter('AMAN')", 'is-emerald', masterFilterStok === 'AMAN', 'Stok Aman', safeCount, 'Di atas stok minimum', 'text-emerald-600')}
      ${_renderMasterKpiBtn("window.setMasterStokFilter('KRITIS')", 'is-amber', masterFilterStok === 'KRITIS', 'Perlu Restok', critCount, critCount ? 'Defecta / batas min' : 'Semua stok cukup', critCount ? 'text-amber-600' : 'text-emerald-600')}
      ${_renderMasterKpiBtn("window.setMasterStokFilter('HABIS')", 'is-red', masterFilterStok === 'HABIS', 'Stok Kosong / 0', habisCount, habisCount ? 'Segera pesan ke PBF' : 'Tidak ada obat 0', habisCount ? 'text-red-600' : 'text-emerald-600')}
      ${_renderMasterKpiBtn("window.setMasterStokFilter('NEAR_ED')", 'is-red', masterFilterStok === 'NEAR_ED', 'Near ED (≤90h)', nearEdCount, nearEdCount ? 'Prioritaskan FEFO' : 'Semua ED panjang', nearEdCount ? 'text-red-600' : 'text-emerald-600')}
    </div>`;

    const listHtml = filtered.length === 0 ? `<div class="ons-card p-6 text-center space-y-2">
      ${totalCount === 0 ? `
        <div class="font-bold text-sm">Katalog Master Obat Masih Kosong</div>
        <p class="text-xs max-w-md mx-auto" style="color:var(--ons-text-soft)">Tambahkan produk obat pertama melalui Wizard 5 Langkah atau import dari Excel (<code>.xlsx</code> / <code>.csv</code>).</p>
        ${seeCost ? `<div class="flex flex-wrap justify-center gap-2 pt-1">
          <button onclick="window.openObatWizardModal()" class="ons-btn ons-btn-primary text-xs">+ Tambah Produk Obat</button>
          <button onclick="window.openImportObatModal()" class="ons-btn ons-btn-emerald text-xs">Import Excel (.xlsx / .csv)</button>
        </div>` : ''}
      ` : `
        <div class="font-bold text-sm">Tidak ada produk obat yang sesuai filter saat ini.</div>
        <button onclick="window.resetMasterFilter()" class="ons-btn ons-btn-ghost text-xs">Reset Filter</button>
      `}
    </div>` : (masterViewMode === 'CARD' ? `
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      ${filtered.map((m) => {
        const o = m.o;
        const isAktifJual = String(o.status_aktif || 'AKTIF').toUpperCase() !== 'NONAKTIF';
        const hetVal = Math.round(Number(o.harga_umum || 0) * 1.15);
        return `<div class="ons-product-card flex flex-col justify-between gap-2.5 ${!isAktifJual ? 'opacity-75' : ''}">
          <div class="space-y-1.5">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-1.5 mb-1">
                  ${S().bpomBadge(o.golongan_bpom)}
                  ${m.isCold ? `<span class="badge-bpom bpom-terbatas">CHILLER 2-8&deg;C</span>` : ''}
                  ${m.isNearEd ? `<span class="badge-bpom bpom-keras">NEAR ED</span>` : ''}
                  <span class="text-[10px] font-semibold px-1.5 py-0.2 rounded ${isAktifJual ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}">${isAktifJual ? 'Dijual' : 'Nonaktif'}</span>
                </div>
                <h3 class="font-bold text-sm leading-snug">
                  <button type="button" onclick="window.openObatDetailModal('${S().esc(o.id_obat)}')" class="hover:text-blue-600 text-left transition-colors">${S().esc(o.nama_dagang)}</button>
                </h3>
                <div class="text-xs truncate" style="color:var(--ons-text-soft)">${S().esc(o.zat_aktif || '-')} ${o.kekuatan ? ('(' + S().esc(o.kekuatan) + ')') : ''} &bull; <span class="font-semibold">${S().esc(o.bentuk_sediaan || 'Sediaan Farmasi')}</span></div>
              </div>
              <span class="font-mono-num text-[10px] px-2 py-0.5 rounded border shrink-0 font-semibold" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">${S().esc(o.rak_lokasi || 'RAK')}</span>
            </div>
            <div class="flex flex-wrap gap-2 text-[11px] font-mono-num" style="color:var(--ons-text-soft)">
              <span>KFA: <b>${S().esc(o.kode_kfa || o.id_obat)}</b></span>
              <span>&bull; NIE: ${S().esc(o.nie_bpom || '-')}</span>
              <span>&bull; PBF: ${S().esc(o.pbf_utama || 'Apotek')}</span>
            </div>
            <div class="p-2.5 rounded-lg border space-y-1" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
              <div class="flex items-center justify-between text-xs font-mono-num">
                <span class="font-bold" style="color:${m.stokTone.color}">${m.stok} ${S().esc(o.satuan_dasar || 'Unit')}</span>
                <span class="text-[10.5px] font-bold uppercase" style="color:${m.stokTone.color}">${m.stokTone.label}</span>
              </div>
              <div class="ons-stock-track"><div class="ons-stock-fill" style="width:${Math.max(4, Math.min(100, m.pct))}%;background:${m.stokTone.bar}"></div></div>
              <div class="flex items-center justify-between text-[10px] font-mono-num text-slate-400">
                <span>Min: ${m.min} &bull; Max: ${m.max}</span>
                ${m.nearBatch ? `<span class="${m.isNearEd ? 'text-red-600 font-bold' : ''}">ED: ${S().esc(m.nearBatch.tgl_kadaluarsa)} (${m.edDays <= 0 ? 'EXPIRED' : m.edDays + 'h'})</span>` : '<span>Belum ada batch</span>'}
              </div>
              <div class="text-[10.5px] font-mono-num pt-0.5 border-t border-slate-200 dark:border-slate-700" style="color:var(--ons-text-soft)">
                1 ${S().esc(o.satuan_besar || 'Box')} = ${Number(o.rasio_besar || 100)} ${S().esc(o.satuan_dasar || 'Unit')} &bull; 1 ${S().esc(o.satuan_sedang || 'Strip')} = ${Number(o.rasio_sedang || 10)} ${S().esc(o.satuan_dasar || 'Unit')}
              </div>
            </div>
          </div>
          <div class="pt-2 border-t flex flex-wrap items-end justify-between gap-2" style="border-color:var(--ons-border)">
            <div>
              <div class="text-[10px] font-semibold uppercase" style="color:var(--ons-text-soft)">Harga / ${S().esc(o.satuan_dasar || 'Unit')}</div>
              <div class="text-base font-extrabold font-mono-num text-blue-600">${S().rp(o.harga_umum)}</div>
              ${seeCost ? `<div class="text-[11px] font-mono-num" style="color:var(--ons-text-soft)">HPP ${S().rp(o.hpp_avg || 0)}${m.marginPct !== null ? ` &bull; <b class="text-emerald-600">+${m.marginPct}%</b>` : ''}</div>` : `<div class="text-[11px] font-mono-num" style="color:var(--ons-text-soft)">Member: ${S().rp(o.harga_member || o.harga_umum)}</div>`}
            </div>
            ${actionButtons(o)}
          </div>
        </div>`;
      }).join('')}
    </div>` : `
    <div class="ons-card p-3">
      <div class="flex flex-wrap items-center justify-between gap-2 mb-2 text-[11.5px]" style="color:var(--ons-text-soft)">
        <span>Menampilkan <b>${filtered.length}</b> dari ${totalCount} produk obat${hasFilter ? ' (terfilter)' : ''}</span>
        ${hasFilter ? `<button type="button" onclick="window.resetMasterFilter()" class="text-blue-600 font-semibold hover:underline">Reset Filter</button>` : '<span>Klik <b>Detail</b> untuk batch FEFO, suhu simpan &amp; substitusi generik</span>'}
      </div>
      <div class="ons-table-wrap">
        <table class="ons-table is-compact">
          <thead>
            <tr>
              <th class="w-10 text-center">No.</th>
              <th>Nama Produk &amp; Sediaan</th>
              <th>Kode KFA &amp; NIE BPOM</th>
              <th>Pabrik / PBF Utama</th>
              <th>Lokasi Rak</th>
              <th>Stok Buffer &amp; Kadaluarsa</th>
              <th>Konversi Kemasan</th>
              ${seeCost ? '<th title="Referensi Harga Beli / Harga Pokok (HPP)">HPP Modal</th>' : ''}
              <th>HET Kemenkes</th>
              <th>Harga Jual (Umum / Member)</th>
              <th class="text-center">Status</th>
              <th class="text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map((m, idx) => {
              const o = m.o;
              const isAktifJual = String(o.status_aktif || 'AKTIF').toUpperCase() !== 'NONAKTIF';
              const rugiWarn = seeCost && m.hpp > 0 && m.harga <= m.hpp;
              const hetVal = Math.round(Number(o.harga_umum || 0) * 1.15);
              return `<tr class="${!isAktifJual ? 'opacity-70 bg-slate-500/5' : ''}">
                <td class="font-mono-num text-xs text-center">${idx + 1}.</td>
                <td>
                  <div class="flex items-start gap-1.5">
                    <span class="inline-block w-2 h-2 rounded-full mt-1.5 shrink-0" style="background:${m.stokTone.color}" title="Status Stok: ${m.stokTone.label}"></span>
                    <div>
                      <button type="button" onclick="window.openObatDetailModal('${S().esc(o.id_obat)}')" class="font-bold text-left hover:text-blue-600 transition-colors leading-tight">${S().esc(o.nama_dagang)}</button>
                      <div class="text-[11px]" style="color:var(--ons-text-soft)">${S().esc(o.zat_aktif || '-')} ${o.kekuatan ? ('(' + S().esc(o.kekuatan) + ')') : ''} &bull; <span class="font-semibold">${S().esc(o.bentuk_sediaan || 'Sediaan Farmasi')}</span></div>
                      <div class="flex flex-wrap items-center gap-1 mt-1">
                        ${S().bpomBadge(o.golongan_bpom)}
                        ${m.isCold ? `<span class="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-500/15 text-blue-600">Chiller 2-8&deg;C</span>` : ''}
                        ${m.isNearEd ? `<span class="text-[10px] font-bold px-1.5 py-0.2 rounded bg-red-500/15 text-red-600">Near ED</span>` : ''}
                      </div>
                    </div>
                  </div>
                </td>
                <td class="font-mono-num text-xs whitespace-nowrap">
                  <div class="flex items-center gap-1">
                    <span class="font-semibold text-blue-600">${S().esc(o.kode_kfa || o.id_obat || '-')}</span>
                    ${o.kode_kfa ? `<button type="button" onclick="window.copyToClipboard('${S().esc(o.kode_kfa)}','Kode KFA')" class="ons-copy-btn" title="Salin KFA">📋</button>` : ''}
                  </div>
                  <div class="text-[11px] flex items-center gap-1 mt-0.5" style="color:var(--ons-text-soft)">
                    <span>NIE: ${S().esc(o.nie_bpom || '-')}</span>
                    ${o.nie_bpom ? `<button type="button" onclick="window.copyToClipboard('${S().esc(o.nie_bpom)}','NIE BPOM')" class="ons-copy-btn" title="Salin NIE">📋</button>` : ''}
                  </div>
                </td>
                <td class="text-xs">
                  <div class="font-semibold">${S().esc(o.pbf_utama || 'PBF Apotek')}</div>
                  <div class="text-[10px] text-slate-400">Distributor Resmi</div>
                </td>
                <td class="text-xs font-mono-num">
                  <span class="px-2 py-0.5 rounded border font-semibold text-[11px]" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">${S().esc(o.rak_lokasi || 'RAK-UTAMA')}</span>
                </td>
                <td class="text-xs min-w-[140px]">
                  <div class="flex items-center justify-between gap-1 text-[11px] font-mono-num">
                    <span class="font-bold text-xs" style="color:${m.stokTone.color}">${m.stok} ${S().esc(o.satuan_dasar || 'Unit')}</span>
                    <span class="text-[10px] uppercase font-bold" style="color:${m.stokTone.color}">${m.stokTone.label}</span>
                  </div>
                  <div class="ons-stock-track mt-1"><div class="ons-stock-fill" style="width:${Math.max(4, Math.min(100, m.pct))}%;background:${m.stokTone.bar}"></div></div>
                  <div class="flex items-center justify-between text-[10px] font-mono-num text-slate-400 mt-0.5">
                    <span>Min: ${m.min}</span>
                    <span>Max: ${m.max}</span>
                  </div>
                  ${m.nearBatch ? `<div class="text-[10px] font-mono-num mt-0.5 ${m.isNearEd ? 'text-red-600 font-bold' : 'text-slate-400'}">ED: ${S().esc(m.nearBatch.tgl_kadaluarsa)} (${m.edDays <= 0 ? 'EXPIRED' : m.edDays + 'h'})</div>` : '<div class="text-[10px] text-slate-400 mt-0.5">Belum ada batch</div>'}
                </td>
                <td class="font-mono-num text-[11px]" style="color:var(--ons-text-soft)">
                  <div>1 ${S().esc(o.satuan_besar || 'Box')} = ${Number(o.rasio_besar || 100)} ${S().esc(o.satuan_dasar || 'Unit')}</div>
                  <div>1 ${S().esc(o.satuan_sedang || 'Strip')} = ${Number(o.rasio_sedang || 10)} ${S().esc(o.satuan_dasar || 'Unit')}</div>
                </td>
                ${seeCost ? `<td class="font-mono-num text-xs font-semibold">${S().rp(o.hpp_avg || o.hpp_terakhir || 0)}</td>` : ''}
                <td class="font-mono-num text-xs text-slate-400 line-through">${S().rp(hetVal)}</td>
                <td class="font-mono-num text-xs">
                  <div class="font-bold text-blue-600 text-sm">${S().rp(o.harga_umum || 0)}</div>
                  <div class="text-[10.5px] flex items-center gap-1.5 mt-0.5" style="color:var(--ons-text-soft)">
                    <span>Mbr: ${S().rp(o.harga_member || o.harga_umum || 0)}</span>
                    ${m.marginPct !== null ? `<span class="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[9.5px]">+${m.marginPct}%</span>` : ''}
                  </div>
                  ${seeCost && rugiWarn ? '<div class="text-[10px] font-bold text-red-600 mt-0.5">⚠️ Di Bawah HPP</div>' : ''}
                </td>
                <td class="text-center">
                  <button type="button" onclick="window.toggleObatStatusJual('${S().esc(o.id_obat)}')" class="badge-bpom ${isAktifJual ? 'bpom-bebas' : 'bpom-prekursor'} cursor-pointer hover:opacity-80 transition-opacity" title="Klik untuk ubah status jual">
                    ${isAktifJual ? '✓ Dijual' : '✕ Nonaktif'}
                  </button>
                </td>
                <td class="text-right">${actionButtons(o)}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>`);

    const kondisiFooter = _renderInvRekapFooter('daftar-produk', 'Kondisi Produk', [
      { label: 'Produk Dijual', valHtml: `${dijualCount} produk`, cls: 'text-emerald-600' },
      { label: 'Produk Tidak Dijual', valHtml: `${tidakDijualCount} produk` },
      ...(seeCost ? [{ label: 'Produk Berpotensi Rugi', valHtml: `${potensiRugiCount} produk`, cls: potensiRugiCount ? 'text-red-600' : '' }] : []),
      { label: 'Produk Stok Kosong / Habis', valHtml: `${habisCount} produk`, cls: habisCount ? 'text-red-600' : '' },
      { label: 'Total Unit Fisik', valHtml: `${totalItemFisik} unit` }
    ]);

    return `<div class="space-y-3">${kpiHtml}${listHtml}${kondisiFooter}</div>`;
  }

  function _renderMasterObatSubTab(seeCost, allMeta, filtered) {
    const totalCount = allMeta.length;
    const golOptions = ['', 'BEBAS', 'TERBATAS', 'KERAS', 'PREKURSOR', 'OOT', 'PSIKOTROPIKA', 'NARKOTIKA'];
    const golCounts = {};
    allMeta.forEach((m) => {
      const g = String(m.o.golongan_bpom || 'BEBAS').toUpperCase();
      golCounts[g] = (golCounts[g] || 0) + 1;
    });

    const hasFilter = Boolean(masterSearchQ || masterFilterGol || masterFilterStok !== 'SEMUA' || masterFilterSediaan !== 'SEMUA' || masterFilterStatusJual !== 'SEMUA');

    return `<div class="space-y-3">
      <div class="ons-card p-3 space-y-2.5">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2 items-center">
          <div class="lg:col-span-4">
            ${_renderSearchInputWithClear('mdObatSearchInp', 'mdObatClearBtn', masterSearchQ, 'Cari Nama Dagang, Zat Aktif, KFA, NIE, Rak, Pabrik...', 'window.setMasterSearch', 'window.clearMasterObatSearch')}
          </div>
          <div class="lg:col-span-2">
            <select class="ons-select w-full text-xs" onchange="window.setMasterSediaan(this.value)" aria-label="Filter Bentuk Sediaan">
              <option value="SEMUA" ${masterFilterSediaan === 'SEMUA' ? 'selected' : ''}>Semua Sediaan</option>
              <option value="TABLET" ${masterFilterSediaan === 'TABLET' ? 'selected' : ''}>Tablet / Kaplet</option>
              <option value="KAPSUL" ${masterFilterSediaan === 'KAPSUL' ? 'selected' : ''}>Kapsul</option>
              <option value="SIRUP" ${masterFilterSediaan === 'SIRUP' ? 'selected' : ''}>Sirup / Suspensi / Drop</option>
              <option value="SALEP" ${masterFilterSediaan === 'SALEP' ? 'selected' : ''}>Salep / Krim / Gel</option>
              <option value="INJEKSI" ${masterFilterSediaan === 'INJEKSI' ? 'selected' : ''}>Injeksi / Infus / Pen</option>
              <option value="LAINNYA" ${masterFilterSediaan === 'LAINNYA' ? 'selected' : ''}>Sediaan Lainnya</option>
            </select>
          </div>
          <div class="lg:col-span-2">
            <select class="ons-select w-full text-xs" onchange="window.setMasterStokFilter(this.value)" aria-label="Filter Status Stok">
              <option value="SEMUA" ${masterFilterStok === 'SEMUA' ? 'selected' : ''}>Semua Stok</option>
              <option value="AMAN" ${masterFilterStok === 'AMAN' ? 'selected' : ''}>Stok Aman</option>
              <option value="KRITIS" ${masterFilterStok === 'KRITIS' ? 'selected' : ''}>Menipis (&le; Min)</option>
              <option value="HABIS" ${masterFilterStok === 'HABIS' ? 'selected' : ''}>Stok Habis / 0</option>
              <option value="NEAR_ED" ${masterFilterStok === 'NEAR_ED' ? 'selected' : ''}>Near ED (&le; 90h)</option>
            </select>
          </div>
          <div class="lg:col-span-2">
            <select class="ons-select w-full text-xs" onchange="window.setMasterSort(this.value)" aria-label="Urutkan Produk">
              <option value="NAMA" ${masterSortBy === 'NAMA' ? 'selected' : ''}>Nama A-Z</option>
              <option value="NAMA_DESC" ${masterSortBy === 'NAMA_DESC' ? 'selected' : ''}>Nama Z-A</option>
              <option value="STOK_ASC" ${masterSortBy === 'STOK_ASC' ? 'selected' : ''}>Stok Terendah</option>
              <option value="STOK_DESC" ${masterSortBy === 'STOK_DESC' ? 'selected' : ''}>Stok Tertinggi</option>
              <option value="ED_ASC" ${masterSortBy === 'ED_ASC' ? 'selected' : ''}>ED Terdekat (FEFO)</option>
              <option value="HARGA_DESC" ${masterSortBy === 'HARGA_DESC' ? 'selected' : ''}>Harga Tertinggi</option>
              <option value="HARGA_ASC" ${masterSortBy === 'HARGA_ASC' ? 'selected' : ''}>Harga Terendah</option>
              ${seeCost ? '<option value="MARGIN_DESC" ' + (masterSortBy === 'MARGIN_DESC' ? 'selected' : '') + '>Margin Tertinggi</option>' : ''}
              ${seeCost ? '<option value="VALUASI_DESC" ' + (masterSortBy === 'VALUASI_DESC' ? 'selected' : '') + '>Valuasi Terbesar</option>' : ''}
            </select>
          </div>
          <div class="lg:col-span-2 flex items-center gap-1.5 justify-end">
            <button type="button" onclick="window.scanMasterObatBarcode()" class="ons-btn ons-btn-primary text-xs py-1.5 px-2.5 shrink-0" title="Cari Obat Lewat Kamera Barcode">📷 Scan</button>
            <div class="inline-flex rounded-lg border p-0.5 shrink-0" style="border-color:var(--ons-border);background:var(--ons-bg-subtle)">
              <button type="button" onclick="window.setMasterViewMode('TABLE')" class="ons-btn text-[11px] py-1 px-2 ${masterViewMode === 'TABLE' ? 'ons-btn-primary' : 'ons-btn-ghost border-0'}">Tabel</button>
              <button type="button" onclick="window.setMasterViewMode('CARD')" class="ons-btn text-[11px] py-1 px-2 ${masterViewMode === 'CARD' ? 'ons-btn-primary' : 'ons-btn-ghost border-0'}">Kartu</button>
            </div>
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-2 pt-1 border-t" style="border-color:var(--ons-border)">
          <div class="flex flex-wrap items-center gap-1.5">
            <span class="text-[11px] font-bold text-slate-500 mr-1">Golongan BPOM:</span>
            ${golOptions.filter((g) => !g || golCounts[g] || masterFilterGol === g).map((g) => {
              const cnt = g ? (golCounts[g] || 0) : totalCount;
              return `<button type="button" onclick="window.setMasterGol('${g}')" class="ons-subnav-chip ${masterFilterGol === g ? 'active' : ''}">${g || 'Semua'} (${cnt})</button>`;
            }).join('')}
          </div>
          <div class="flex items-center gap-2 text-xs">
            <select class="ons-select text-xs py-0.5 px-2" onchange="window.setMasterStatusJual(this.value)" aria-label="Status Jual">
              <option value="SEMUA" ${masterFilterStatusJual === 'SEMUA' ? 'selected' : ''}>Semua Status Jual</option>
              <option value="DIJUAL" ${masterFilterStatusJual === 'DIJUAL' ? 'selected' : ''}>Hanya Dijual</option>
              <option value="TIDAK_DIJUAL" ${masterFilterStatusJual === 'TIDAK_DIJUAL' ? 'selected' : ''}>Tidak Dijual</option>
            </select>
            ${hasFilter ? `<button type="button" onclick="window.resetMasterFilter()" class="ons-btn ons-btn-ghost text-xs py-0.5 px-2 text-red-600 font-semibold">✕ Reset Filter</button>` : ''}
          </div>
        </div>
      </div>

      <div id="mdResultsSlot">${_renderMasterObatResultsHtml(seeCost, allMeta, filtered)}</div>
    </div>`;
  }

  function _getFilteredMasterSupplier() {
    const allPbf = S().AppState.supplierPbf || [];
    const sq = supplierSearchQ.trim().toLowerCase();
    const filtered = allPbf.filter((p) => {
      const status = String(p.status_pbf || 'AKTIF').toUpperCase();
      if (supplierStatusFilter !== 'SEMUA' && status !== supplierStatusFilter) return false;
      if (sq && !`${p.nama_pbf} ${p.kode_cdob} ${p.npwp_pbf} ${p.kontak_wa} ${p.email_pbf} ${p.id_pbf}`.toLowerCase().includes(sq)) return false;
      return true;
    }).sort((a, b) => String(a.nama_pbf || '').localeCompare(String(b.nama_pbf || '')));
    return { allPbf, filtered, isFiltered: Boolean(sq || supplierStatusFilter !== 'SEMUA') };
  }

  function _renderMasterSupplierResultsHtml() {
    const { allPbf, filtered, isFiltered } = _getFilteredMasterSupplier();
    const activeCount = allPbf.filter((p) => String(p.status_pbf || 'AKTIF').toUpperCase() === 'AKTIF').length;
    const avgLead = allPbf.length ? Math.round((allPbf.reduce((s, p) => s + Number(p.lead_time_hari || 0), 0) / allPbf.length) * 10) / 10 : 0;
    const avgSla = allPbf.length ? Math.round(allPbf.reduce((s, p) => s + Number(p.skor_sla || 0), 0) / allPbf.length) : 0;

    const kpiHtml = `<div class="ons-md-kpi-strip">
      ${_renderMasterKpiBtn("window.setMasterSupplierStatus('SEMUA')", '', supplierStatusFilter === 'SEMUA', 'Total Supplier PBF', allPbf.length, 'Distributor CDOB terdaftar', '')}
      ${_renderMasterKpiBtn("window.setMasterSupplierStatus('AKTIF')", 'is-emerald', supplierStatusFilter === 'AKTIF', 'Kemitraan Aktif', activeCount, 'Siap terima Surat Pesanan', 'text-emerald-600')}
      <div class="ons-md-kpi is-sky"><div class="text-[10.5px] font-semibold" style="color:var(--ons-text-soft)">Rata Lead Time</div><div class="text-lg font-extrabold font-mono-num text-sky-600 leading-tight mt-0.5">${avgLead} Hari</div><div class="text-[10.5px]" style="color:var(--ons-text-soft)">Estimasi pengantaran faktur</div></div>
      <div class="ons-md-kpi is-amber"><div class="text-[10.5px] font-semibold" style="color:var(--ons-text-soft)">Rata-Rata SLA</div><div class="text-lg font-extrabold font-mono-num text-amber-600 leading-tight mt-0.5">${avgSla}%</div><div class="text-[10.5px]" style="color:var(--ons-text-soft)">Ketepatan suplai PBF</div></div>
    </div>`;

    const actionHtml = (p) => `<div class="flex flex-wrap gap-1">
      <button type="button" onclick="window.openSupplierPbfModal('${S().esc(p.id_pbf)}')" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2">Edit</button>
      <button type="button" onclick="window.navigateView('defecta','sp')" class="ons-btn ons-btn-primary text-[11px] py-1 px-2" title="Buat Surat Pesanan PBF">Buat SP</button>
      <button type="button" onclick="window.deleteMasterSupplier('${S().esc(p.id_pbf)}')" class="ons-btn ons-btn-danger text-[11px] py-1 px-2">Hapus</button>
    </div>`;

    const bodyHtml = filtered.length === 0 ? `<div class="ons-card p-6 text-center space-y-2">
      ${allPbf.length === 0 ? `
        <div class="font-bold text-sm">Belum Ada Supplier PBF Terdaftar</div>
        <p class="text-xs" style="color:var(--ons-text-soft)">Tambahkan distributor resmi CDOB untuk menerbitkan Surat Pesanan &amp; input faktur.</p>
        <button type="button" onclick="window.openSupplierPbfModal('')" class="ons-btn ons-btn-emerald text-xs">+ Tambah Supplier</button>
      ` : `
        <div class="font-bold text-sm">Tidak ada Supplier PBF yang sesuai pencarian.</div>
        <button type="button" onclick="window.resetMasterSupplierFilter()" class="ons-btn ons-btn-ghost text-xs">Reset Filter</button>
      `}
    </div>` : `<div class="ons-card p-3 space-y-2">
      <div class="flex flex-wrap items-center justify-between gap-2 text-[11.5px]" style="color:var(--ons-text-soft)">
        <span>Menampilkan <b>${filtered.length}</b> dari ${allPbf.length} Supplier PBF${isFiltered ? ' (terfilter)' : ''}</span>
        ${isFiltered ? `<button type="button" onclick="window.resetMasterSupplierFilter()" class="text-blue-600 font-semibold hover:underline">Reset Filter</button>` : ''}
      </div>
      <div class="hidden md:block ons-table-wrap">
        <table class="ons-table is-compact">
          <thead><tr><th>Nama Supplier &amp; ID</th><th>Sertifikat CDOB &amp; NPWP</th><th>Kontak WA &amp; Email</th><th>Lead Time &amp; TOP</th><th>SLA</th><th>Status</th><th>Aksi</th></tr></thead>
          <tbody>
            ${filtered.map((p) => {
              const ex = _getExtraRecord(SUPPLIER_EXTRA_KEY, p.id_pbf, p.nama_pbf);
              const minOrd = Number(ex.min_order || 0);
              const waHref = _buildWaLink(p.kontak_wa, 'Halo ' + (p.nama_pbf || 'PBF') + ', kami dari apotek ingin konfirmasi stok & pengadaan barang.');
              const isAktif = String(p.status_pbf || 'AKTIF').toUpperCase() === 'AKTIF';
              return `<tr>
                <td>
                  <div class="font-bold text-xs">${S().esc(p.nama_pbf)}</div>
                  <div class="font-mono-num text-[11px]" style="color:var(--ons-text-soft)">${S().esc(p.id_pbf)}${ex.alamat ? (' &bull; ' + S().esc(ex.alamat)) : ''}</div>
                </td>
                <td class="font-mono-num text-xs"><div>${S().esc(p.kode_cdob || '-')}</div><div class="text-[11px]" style="color:var(--ons-text-soft)">${S().esc(p.npwp_pbf || '-')}</div></td>
                <td class="text-xs">
                  <div class="flex items-center gap-1.5">
                    <span class="font-mono-num">${S().esc(p.kontak_wa || '-')}</span>
                    ${waHref ? `<a href="${S().esc(waHref)}" target="_blank" rel="noopener" class="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">WA</a>` : ''}
                  </div>
                  <div class="text-[11px]" style="color:var(--ons-text-soft)">${S().esc(p.email_pbf || '-')}</div>
                </td>
                <td class="text-xs font-mono-num"><div><b>${Number(p.lead_time_hari || 0)} Hari</b> &bull; TOP ${Number(p.termin_hari || 0)}h</div>${minOrd > 0 ? `<div class="text-[10.5px]" style="color:var(--ons-text-soft)">Min. Order: ${S().rp(minOrd)}</div>` : ''}</td>
                <td class="font-mono-num font-bold text-emerald-600">${Number(p.skor_sla || 0)}%</td>
                <td><span class="badge-bpom ${isAktif ? 'bpom-bebas' : 'bpom-keras'}">${S().esc(p.status_pbf || 'AKTIF')}</span></td>
                <td>${actionHtml(p)}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <div class="md:hidden space-y-2">
        ${filtered.map((p) => {
          const waHref = _buildWaLink(p.kontak_wa, 'Halo ' + (p.nama_pbf || 'PBF') + ', kami dari apotek ingin konfirmasi pengadaan barang.');
          const isAktif = String(p.status_pbf || 'AKTIF').toUpperCase() === 'AKTIF';
          return `<div class="ons-md-mobile-card text-xs">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <div class="font-bold truncate">${S().esc(p.nama_pbf)}</div>
                <div class="font-mono-num text-[11px]" style="color:var(--ons-text-soft)">${S().esc(p.id_pbf)} &bull; ${S().esc(p.kode_cdob || '-')}</div>
              </div>
              <span class="badge-bpom shrink-0 ${isAktif ? 'bpom-bebas' : 'bpom-keras'}">${S().esc(p.status_pbf || 'AKTIF')}</span>
            </div>
            <div class="flex flex-wrap gap-3 text-[11px] font-mono-num" style="color:var(--ons-text-soft)">
              <span>Lead: <b>${Number(p.lead_time_hari || 0)}h</b></span>
              <span>TOP: <b>${Number(p.termin_hari || 0)}h</b></span>
              <span class="text-emerald-600 font-bold">SLA ${Number(p.skor_sla || 0)}%</span>
              ${waHref ? `<a href="${S().esc(waHref)}" target="_blank" rel="noopener" class="font-bold text-emerald-600 underline">Chat WA</a>` : ''}
            </div>
            ${actionHtml(p)}
          </div>`;
        }).join('')}
      </div>
    </div>`;

    return `<div class="space-y-3">${kpiHtml}${bodyHtml}</div>`;
  }

  function _renderMasterSupplierSubTab() {
    return `<div class="space-y-3">
      <div class="ons-card p-2.5">
        <div class="flex flex-wrap items-center gap-2">
          ${_renderSearchInputWithClear('mdSupplierSearchInp', 'mdSupplierClearBtn', supplierSearchQ, 'Cari nama PBF, nomor izin CDOB, NPWP, email, atau WA sales...', 'window.setMasterSupplierSearch', 'window.clearMasterSupplierSearch')}
          <div class="flex flex-wrap items-center gap-1">
            ${['SEMUA', 'AKTIF', 'NONAKTIF'].map((stOpt) => `<button type="button" onclick="window.setMasterSupplierStatus('${stOpt}')" class="ons-subnav-chip ${supplierStatusFilter === stOpt ? 'active' : ''}">${stOpt === 'SEMUA' ? 'Semua' : stOpt}</button>`).join('')}
          </div>
        </div>
      </div>

      <div id="mdResultsSlot">${_renderMasterSupplierResultsHtml()}</div>
    </div>`;
  }

  function _normMemberProg(m) {
    return S().formatMemberProgram ? S().formatMemberProgram(m && m.program_prb) : String((m && m.program_prb) || 'UMUM').toUpperCase();
  }

  function _getFilteredMasterPelanggan() {
    const allMbr = S().AppState.members || [];
    const pq = pelangganSearchQ.trim().toLowerCase();
    const filtered = allMbr.filter((m) => {
      const prog = _normMemberProg(m);
      const ex = _getExtraRecord(PELANGGAN_EXTRA_KEY, m.id_member, m.nama_pasien);
      const hasAllergy = String(m.alergi_list || '').trim() && !/^(tidak ada|-)$/i.test(String(m.alergi_list).trim());
      if (pelangganProgFilter === 'ALERGI' && !hasAllergy) return false;
      else if (pelangganProgFilter !== 'SEMUA' && pelangganProgFilter !== 'ALERGI' && prog !== pelangganProgFilter) return false;
      if (pq && !`${m.id_member} ${m.nama_pasien} ${m.no_hp} ${m.alergi_list} ${m.penyakit_kronis} ${prog} ${ex.no_rm || ''} ${ex.kode_pelanggan || ''} ${ex.alamat || ''} ${ex.nik || ''}`.toLowerCase().includes(pq)) return false;
      return true;
    }).sort((a, b) => String(a.nama_pasien || '').localeCompare(String(b.nama_pasien || '')));
    return { allMbr, filtered, isFiltered: Boolean(pq || pelangganProgFilter !== 'SEMUA') };
  }

  function _renderMasterPelangganResultsHtml() {
    const { allMbr, filtered, isFiltered } = _getFilteredMasterPelanggan();
    const rutinCount = allMbr.filter((m) => _normMemberProg(m) === 'MEMBER_RUTIN').length;
    const alergiCount = allMbr.filter((m) => {
      const a = String(m.alergi_list || '').trim();
      return a && !/^(tidak ada|-)$/i.test(a);
    }).length;
    const totalPoin = allMbr.reduce((s, m) => s + Number(m.poin_loyalitas || 0), 0);
    const prof = S().getStoreProfile ? S().getStoreProfile() : {};

    const kpiHtml = `<div class="ons-md-kpi-strip">
      ${_renderMasterKpiBtn("window.setMasterPelangganProg('SEMUA')", '', pelangganProgFilter === 'SEMUA', 'Total Pelanggan', allMbr.length, 'Member &amp; pasien terdaftar', '')}
      ${_renderMasterKpiBtn("window.setMasterPelangganProg('MEMBER_RUTIN')", 'is-emerald', pelangganProgFilter === 'MEMBER_RUTIN', 'Member Terapi Rutin', rutinCount, 'Pasien kontrol &amp; obat rutin', 'text-emerald-600')}
      ${_renderMasterKpiBtn("window.setMasterPelangganProg('ALERGI')", 'is-red', pelangganProgFilter === 'ALERGI', 'Catatan Alergi', alergiCount, 'Proteksi CDSS saat racik/POS', 'text-red-600')}
      <div class="ons-md-kpi is-amber"><div class="text-[10.5px] font-semibold" style="color:var(--ons-text-soft)">Akumulasi Poin</div><div class="text-lg font-extrabold font-mono-num text-amber-600 leading-tight mt-0.5">${totalPoin.toLocaleString('id-ID')}</div><div class="text-[10.5px]" style="color:var(--ons-text-soft)">Loyalitas belanja apotek</div></div>
    </div>`;

    const actionHtml = (m) => `<div class="flex flex-wrap gap-1">
      <button type="button" onclick="window.openMasterPelangganModal('${S().esc(m.id_member)}')" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2">Edit</button>
      <button type="button" onclick="window.deleteMasterPelanggan('${S().esc(m.id_member)}')" class="ons-btn ons-btn-danger text-[11px] py-1 px-2">Hapus</button>
    </div>`;

    const bodyHtml = filtered.length === 0 ? `<div class="ons-card p-6 text-center space-y-2">
      ${allMbr.length === 0 ? `
        <div class="font-bold text-sm">Data Pelanggan Masih Kosong</div>
        <p class="text-xs" style="color:var(--ons-text-soft)">Tambahkan pasien member, riwayat alergi obat, &amp; pasien terapi rutin untuk sinkronisasi POS &amp; CDSS.</p>
        <button type="button" onclick="window.openMasterPelangganModal('')" class="ons-btn ons-btn-emerald text-xs">+ Tambah Pelanggan</button>
      ` : `
        <div class="font-bold text-sm">Tidak ada pelanggan/member yang sesuai filter.</div>
        <button type="button" onclick="window.resetMasterPelangganFilter()" class="ons-btn ons-btn-ghost text-xs">Reset Filter</button>
      `}
    </div>` : `<div class="ons-card p-3 space-y-2">
      <div class="flex flex-wrap items-center justify-between gap-2 text-[11.5px]" style="color:var(--ons-text-soft)">
        <span>Menampilkan <b>${filtered.length}</b> dari ${allMbr.length} pelanggan${isFiltered ? ' (terfilter)' : ''}</span>
        ${isFiltered ? `<button type="button" onclick="window.resetMasterPelangganFilter()" class="text-blue-600 font-semibold hover:underline">Reset Filter</button>` : ''}
      </div>
      <div class="hidden md:block ons-table-wrap">
        <table class="ons-table is-compact">
          <thead><tr><th>Nama Pelanggan</th><th>No. Rekam Medis &amp; Kode</th><th>Status Member</th><th>No. Telepon/HP</th><th>Tgl. Lahir &amp; Alamat</th><th>Riwayat Penyakit &amp; Alergi</th><th>Aksi</th></tr></thead>
          <tbody>
            ${filtered.map((m, idx) => {
              const prog = _normMemberProg(m);
              const ex = _getExtraRecord(PELANGGAN_EXTRA_KEY, m.id_member, m.nama_pasien);
              const noRm = ex.no_rm || ('RM-' + (String(m.id_member || '').replace(/[^0-9A-Z]/gi, '').slice(-6) || String(idx + 1).padStart(4, '0')));
              const kodePel = ex.kode_pelanggan || m.id_member || ('PLG-' + String(idx + 1).padStart(4, '0'));
              const statusMember = ex.member_id ? `Member (${ex.member_id})` : (prog !== 'UMUM' ? prog : 'Reguler');
              const hasAllergy = String(m.alergi_list || '').trim() && !/^(tidak ada|-)$/i.test(String(m.alergi_list).trim());
              const waHref = _buildWaLink(m.no_hp, 'Halo ' + (m.nama_pasien || 'Pelanggan') + ', salam sehat dari ' + (prof.nama_usaha || 'Apotek ONS Farma') + '.');
              return `<tr>
                <td>
                  <div class="font-bold text-xs">${S().esc(m.nama_pasien)}</div>
                  <div class="font-mono-num text-[11px]" style="color:var(--ons-text-soft)">${S().esc(m.id_member)} &bull; <b class="text-blue-600">${Number(m.poin_loyalitas || 0)} poin</b></div>
                </td>
                <td class="font-mono-num text-xs">
                  <div>${S().esc(noRm)}</div>
                  <div class="text-[11px]" style="color:var(--ons-text-soft)">${S().esc(kodePel)}</div>
                </td>
                <td>
                  <span class="badge-bpom ${prog === 'MEMBER_RUTIN' ? 'bpom-bebas' : (prog === 'MITRA_KLINIK' ? 'bpom-terbatas' : 'bpom-prekursor')}">${S().esc(prog)}</span>
                  <div class="text-[10.5px] mt-0.5" style="color:var(--ons-text-soft)">${S().esc(statusMember)}</div>
                </td>
                <td class="text-xs">
                  <div class="flex items-center gap-1.5">
                    <span class="font-mono-num">${S().esc(m.no_hp || '-')}</span>
                    ${waHref ? `<a href="${S().esc(waHref)}" target="_blank" rel="noopener" class="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">WA</a>` : ''}
                  </div>
                </td>
                <td class="text-xs">
                  <div class="font-mono-num">${m.tgl_lahir ? S().esc(String(m.tgl_lahir).slice(0, 10)) : '-'}</div>
                  <div class="text-[11px] truncate max-w-[180px]" style="color:var(--ons-text-soft)">${S().esc(ex.alamat || '-')}</div>
                </td>
                <td class="text-xs">
                  <div>${S().esc(m.penyakit_kronis || '-')}</div>
                  <div class="mt-0.5">${hasAllergy ? `<span class="badge-bpom bpom-keras">Alergi: ${S().esc(m.alergi_list)}</span>` : `<span class="text-[11px]" style="color:var(--ons-text-soft)">Alergi: Tidak Ada</span>`}</div>
                </td>
                <td>${actionHtml(m)}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <div class="md:hidden space-y-2">
        ${filtered.map((m) => {
          const prog = _normMemberProg(m);
          const hasAllergy = String(m.alergi_list || '').trim() && !/^(tidak ada|-)$/i.test(String(m.alergi_list).trim());
          const waHref = _buildWaLink(m.no_hp, 'Halo ' + (m.nama_pasien || 'Pelanggan') + ', salam sehat dari ' + (prof.nama_usaha || 'Apotek ONS Farma') + '.');
          return `<div class="ons-md-mobile-card text-xs">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <div class="font-bold truncate">${S().esc(m.nama_pasien)}</div>
                <div class="font-mono-num text-[11px]" style="color:var(--ons-text-soft)">${S().esc(m.id_member)} &bull; <b class="text-blue-600">${Number(m.poin_loyalitas || 0)} poin</b></div>
              </div>
              <span class="badge-bpom shrink-0 ${prog === 'MEMBER_RUTIN' ? 'bpom-bebas' : (prog === 'MITRA_KLINIK' ? 'bpom-terbatas' : 'bpom-prekursor')}">${S().esc(prog)}</span>
            </div>
            <div class="text-[11px]" style="color:var(--ons-text-soft)">
              Penyakit: ${S().esc(m.penyakit_kronis || '-')} ${hasAllergy ? `&bull; <b class="text-red-600">Alergi: ${S().esc(m.alergi_list)}</b>` : ''}
            </div>
            <div class="flex items-center justify-between gap-2 pt-0.5">
              ${waHref ? `<a href="${S().esc(waHref)}" target="_blank" rel="noopener" class="text-[11px] font-bold text-emerald-600 underline">Chat WA (${S().esc(m.no_hp)})</a>` : `<span class="text-[11px] font-mono-num" style="color:var(--ons-text-soft)">${S().esc(m.no_hp || '-')}</span>`}
              ${actionHtml(m)}
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>`;

    return `<div class="space-y-3">${kpiHtml}${bodyHtml}</div>`;
  }

  function _renderMasterPelangganSubTab() {
    return `<div class="space-y-3">
      <div class="ons-card p-2.5">
        <div class="flex flex-wrap items-center gap-2">
          ${_renderSearchInputWithClear('mdPelangganSearchInp', 'mdPelangganClearBtn', pelangganSearchQ, 'Cari nama pelanggan, No. WA, riwayat penyakit, atau alergi obat...', 'window.setMasterPelangganSearch', 'window.clearMasterPelangganSearch')}
          <div class="flex flex-wrap items-center gap-1">
            ${[
              { k: 'SEMUA', label: 'Semua' },
              { k: 'MEMBER_RUTIN', label: 'Member Rutin' },
              { k: 'UMUM', label: 'Umum' },
              { k: 'MITRA_KLINIK', label: 'Mitra Klinik' },
              { k: 'ALERGI', label: 'Ada Alergi' }
            ].map((opt) => `<button type="button" onclick="window.setMasterPelangganProg('${opt.k}')" class="ons-subnav-chip ${pelangganProgFilter === opt.k ? 'active' : ''}">${opt.label}</button>`).join('')}
          </div>
        </div>
      </div>

      <div id="mdResultsSlot">${_renderMasterPelangganResultsHtml()}</div>
    </div>`;
  }

  function _getFilteredMasterDokter() {
    const allDocs = S().AppState.masterDokter || [];
    const dq = dokterSearchQ.trim().toLowerCase();
    const filtered = allDocs.filter((d) => {
      const status = String(d.status_dokter || 'AKTIF').toUpperCase();
      const isSpec = /sp\.|spesialis/i.test(`${d.nama_dokter || ''} ${d.spesialisasi || ''}`);
      if (dokterStatusFilter === 'SPESIALIS' && !isSpec) return false;
      else if (['AKTIF', 'NONAKTIF'].includes(dokterStatusFilter) && status !== dokterStatusFilter) return false;
      if (dq && !`${d.id_dokter} ${d.nama_dokter} ${d.spesialisasi} ${d.no_sip} ${d.no_str} ${d.faskes_klinik} ${d.no_wa} ${(_getExtraRecord(DOKTER_EXTRA_KEY, d.id_dokter, d.nama_dokter).nik_satusehat || '')}`.toLowerCase().includes(dq)) return false;
      return true;
    }).sort((a, b) => String(a.nama_dokter || '').localeCompare(String(b.nama_dokter || '')));
    return { allDocs, filtered, isFiltered: Boolean(dq || dokterStatusFilter !== 'SEMUA') };
  }

  function _renderMasterDokterResultsHtml() {
    const { allDocs, filtered, isFiltered } = _getFilteredMasterDokter();
    const activeCount = allDocs.filter((d) => String(d.status_dokter || 'AKTIF').toUpperCase() === 'AKTIF').length;
    const specCount = allDocs.filter((d) => /sp\.|spesialis/i.test(`${d.nama_dokter || ''} ${d.spesialisasi || ''}`)).length;
    const faskesSet = new Set(allDocs.map((d) => String(d.faskes_klinik || '').trim()).filter((f) => f && f !== '-'));

    const kpiHtml = `<div class="ons-md-kpi-strip">
      ${_renderMasterKpiBtn("window.setMasterDokterStatus('SEMUA')", '', dokterStatusFilter === 'SEMUA', 'Total Dokter Mitra', allDocs.length, 'Autofill E-Resep &amp; Salinan', '')}
      ${_renderMasterKpiBtn("window.setMasterDokterStatus('AKTIF')", 'is-emerald', dokterStatusFilter === 'AKTIF', 'Dokter Aktif', activeCount, 'SIP aktif terverifikasi', 'text-emerald-600')}
      ${_renderMasterKpiBtn("window.setMasterDokterStatus('SPESIALIS')", 'is-sky', dokterStatusFilter === 'SPESIALIS', 'Dokter Spesialis', specCount, 'Dokter spesialis mitra', 'text-sky-600')}
      <div class="ons-md-kpi is-amber"><div class="text-[10.5px] font-semibold" style="color:var(--ons-text-soft)">Klinik / RS Mitra</div><div class="text-lg font-extrabold font-mono-num text-amber-600 leading-tight mt-0.5">${faskesSet.size}</div><div class="text-[10.5px]" style="color:var(--ons-text-soft)">Faskes asal penulisan resep</div></div>
    </div>`;

    const actionHtml = (d) => `<div class="flex flex-wrap gap-1">
      <button type="button" onclick="window.openMasterDokterModal('${S().esc(d.id_dokter)}')" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2">Edit</button>
      <button type="button" onclick="window.deleteMasterDokter('${S().esc(d.id_dokter)}')" class="ons-btn ons-btn-danger text-[11px] py-1 px-2">Hapus</button>
    </div>`;

    const bodyHtml = filtered.length === 0 ? `<div class="ons-card p-6 text-center space-y-2">
      ${allDocs.length === 0 ? `
        <div class="font-bold text-sm">Belum Ada Dokter Mitra Terdaftar</div>
        <p class="text-xs" style="color:var(--ons-text-soft)">Tambahkan data dokter penulis resep beserta nomor SIP/STR agar otomatis muncul pada form E-Resep &amp; Salinan Resep.</p>
        <button type="button" onclick="window.openMasterDokterModal('')" class="ons-btn ons-btn-emerald text-xs">+ Tambah Dokter</button>
      ` : `
        <div class="font-bold text-sm">Tidak ada Dokter Mitra yang sesuai pencarian.</div>
        <button type="button" onclick="window.resetMasterDokterFilter()" class="ons-btn ons-btn-ghost text-xs">Reset Filter</button>
      `}
    </div>` : `<div class="ons-card p-3 space-y-2">
      <div class="flex flex-wrap items-center justify-between gap-2 text-[11.5px]" style="color:var(--ons-text-soft)">
        <span>Menampilkan <b>${filtered.length}</b> dari ${allDocs.length} Dokter Mitra${isFiltered ? ' (terfilter)' : ''}</span>
        ${isFiltered ? `<button type="button" onclick="window.resetMasterDokterFilter()" class="text-blue-600 font-semibold hover:underline">Reset Filter</button>` : ''}
      </div>
      <div class="hidden md:block ons-table-wrap">
        <table class="ons-table is-compact">
          <thead><tr><th>Nama Dokter &amp; Spesialisasi</th><th>No. SIP &amp; STR</th><th>Klinik / RS Mitra</th><th>Kontak WA &amp; Email</th><th>Status</th><th>Aksi</th></tr></thead>
          <tbody>
            ${filtered.map((d) => {
              const exDok = _getExtraRecord(DOKTER_EXTRA_KEY, d.id_dokter, d.nama_dokter);
              const isAktif = String(d.status_dokter || 'AKTIF').toUpperCase() === 'AKTIF';
              const waHref = _buildWaLink(d.no_wa, 'Halo ' + (d.nama_dokter || 'Dokter') + ', kami dari apotek ingin konfirmasi skrining resep pasien.');
              return `<tr>
                <td>
                  <div class="font-bold text-xs">${S().esc(d.nama_dokter)}</div>
                  <div class="text-[11px]" style="color:var(--ons-text-soft)">${S().esc(d.spesialisasi || 'Dokter Umum')} &bull; <span class="font-mono-num">${S().esc(d.id_dokter)}</span></div>
                </td>
                <td class="font-mono-num text-xs">
                  <div>${S().esc(d.no_sip || '-')}</div>
                  <div class="text-[11px]" style="color:var(--ons-text-soft)">${d.no_str ? ('STR ' + S().esc(d.no_str)) : '-'}${exDok.nik_satusehat ? (' &bull; NIK ' + S().esc(exDok.nik_satusehat)) : ''}</div>
                </td>
                <td class="text-xs"><div><b>${S().esc(d.faskes_klinik || '-')}</b></div><div class="text-[11px] truncate max-w-[200px]" style="color:var(--ons-text-soft)">${S().esc(d.alamat || d.catatan || '-')}</div></td>
                <td class="text-xs">
                  <div class="flex items-center gap-1.5">
                    <span class="font-mono-num">${S().esc(d.no_wa || '-')}</span>
                    ${waHref ? `<a href="${S().esc(waHref)}" target="_blank" rel="noopener" class="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">WA</a>` : ''}
                  </div>
                  <div class="text-[11px]" style="color:var(--ons-text-soft)">${S().esc(d.email || '-')}</div>
                </td>
                <td><span class="badge-bpom ${isAktif ? 'bpom-bebas' : 'bpom-keras'}">${S().esc(d.status_dokter || 'AKTIF')}</span></td>
                <td>${actionHtml(d)}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <div class="md:hidden space-y-2">
        ${filtered.map((d) => {
          const isAktif = String(d.status_dokter || 'AKTIF').toUpperCase() === 'AKTIF';
          const waHref = _buildWaLink(d.no_wa, 'Halo ' + (d.nama_dokter || 'Dokter') + ', kami dari apotek ingin konfirmasi resep pasien.');
          return `<div class="ons-md-mobile-card text-xs">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <div class="font-bold truncate">${S().esc(d.nama_dokter)}</div>
                <div class="text-[11px]" style="color:var(--ons-text-soft)">${S().esc(d.spesialisasi || 'Dokter Umum')} &bull; ${S().esc(d.faskes_klinik || '-')}</div>
              </div>
              <span class="badge-bpom shrink-0 ${isAktif ? 'bpom-bebas' : 'bpom-keras'}">${S().esc(d.status_dokter || 'AKTIF')}</span>
            </div>
            <div class="text-[11px] font-mono-num" style="color:var(--ons-text-soft)">SIP: ${S().esc(d.no_sip || '-')}</div>
            <div class="flex items-center justify-between gap-2 pt-0.5">
              ${waHref ? `<a href="${S().esc(waHref)}" target="_blank" rel="noopener" class="text-[11px] font-bold text-emerald-600 underline">Chat WA (${S().esc(d.no_wa)})</a>` : `<span class="text-[11px] font-mono-num" style="color:var(--ons-text-soft)">${S().esc(d.no_wa || '-')}</span>`}
              ${actionHtml(d)}
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>`;

    return `<div class="space-y-3">${kpiHtml}${bodyHtml}</div>`;
  }

  function _renderMasterDokterSubTab() {
    return `<div class="space-y-3">
      <div class="ons-card p-2.5">
        <div class="flex flex-wrap items-center gap-2">
          ${_renderSearchInputWithClear('mdDokterSearchInp', 'mdDokterClearBtn', dokterSearchQ, 'Cari nama dokter, spesialisasi, No. SIP/STR, atau nama klinik/RS...', 'window.setMasterDokterSearch', 'window.clearMasterDokterSearch')}
          <div class="flex flex-wrap items-center gap-1">
            ${[
              { k: 'SEMUA', label: 'Semua' },
              { k: 'AKTIF', label: 'AKTIF' },
              { k: 'SPESIALIS', label: 'Spesialis' },
              { k: 'NONAKTIF', label: 'NONAKTIF' }
            ].map((stOpt) => `<button type="button" onclick="window.setMasterDokterStatus('${stOpt.k}')" class="ons-subnav-chip ${dokterStatusFilter === stOpt.k ? 'active' : ''}">${stOpt.label}</button>`).join('')}
          </div>
        </div>
      </div>

      <div id="mdResultsSlot">${_renderMasterDokterResultsHtml()}</div>
    </div>`;
  }

  function _getFilteredMasterSales() {
    const allSales = _getSalesStaffList();
    const sq = salesSearchQ.trim().toLowerCase();
    const filtered = allSales.filter((x) => {
      if (sq && !`${x.nama_sales || ''} ${x.kode_sales || ''} ${x.no_hp || ''}`.toLowerCase().includes(sq)) return false;
      return true;
    }).sort((a, b) => String(a.nama_sales || '').localeCompare(String(b.nama_sales || '')));
    return { allSales, filtered, isFiltered: Boolean(sq) };
  }

  function _renderMasterSalesResultsHtml() {
    const { allSales, filtered, isFiltered } = _getFilteredMasterSales();
    const hasHpCount = allSales.filter((x) => String(x.no_hp || '').replace(/\D+/g, '').length >= 8).length;

    const kpiHtml = `<div class="ons-md-kpi-strip">
      <div class="ons-md-kpi"><div class="text-[10.5px] font-semibold" style="color:var(--ons-text-soft)">Total Sales / Pelayan</div><div class="text-lg font-extrabold font-mono-num leading-tight mt-0.5">${allSales.length}</div><div class="text-[10.5px]" style="color:var(--ons-text-soft)">Otomatis tampil di Kasir POS</div></div>
      <div class="ons-md-kpi is-emerald"><div class="text-[10.5px] font-semibold" style="color:var(--ons-text-soft)">Kontak WA / HP Valid</div><div class="text-lg font-extrabold font-mono-num text-emerald-600 leading-tight mt-0.5">${hasHpCount}</div><div class="text-[10.5px]" style="color:var(--ons-text-soft)">Siap dihubungi langsung</div></div>
    </div>`;

    const actionHtml = (x) => `<div class="flex flex-wrap gap-1">
      <button type="button" onclick="window.openMasterSalesModal('${S().esc(x.id_sales)}')" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2">Edit</button>
      <button type="button" onclick="window.deleteMasterSales('${S().esc(x.id_sales)}')" class="ons-btn ons-btn-danger text-[11px] py-1 px-2">Hapus</button>
    </div>`;

    const bodyHtml = filtered.length === 0 ? `<div class="ons-card p-6 text-center space-y-2">
      ${allSales.length === 0 ? `
        <div class="font-bold text-sm">Belum Ada Data Sales / Pelayan</div>
        <p class="text-xs" style="color:var(--ons-text-soft)">Tambahkan petugas kasir, apoteker pelayanan, atau sales pengantar agar dapat dipilih langsung pada transaksi POS &amp; TTF.</p>
        <button type="button" onclick="window.openMasterSalesModal('')" class="ons-btn ons-btn-emerald text-xs">+ Sales/Pelayan Baru</button>
      ` : `
        <div class="font-bold text-sm">Tidak ada Sales/Pelayan yang sesuai pencarian.</div>
        <button type="button" onclick="window.clearMasterSalesSearch()" class="ons-btn ons-btn-ghost text-xs">Reset Filter</button>
      `}
    </div>` : `<div class="ons-card p-3 space-y-2">
      <div class="flex flex-wrap items-center justify-between gap-2 text-[11.5px]" style="color:var(--ons-text-soft)">
        <span>Menampilkan <b>${filtered.length}</b> dari ${allSales.length} Sales/Pelayan${isFiltered ? ' (terfilter)' : ''}</span>
        ${isFiltered ? `<button type="button" onclick="window.clearMasterSalesSearch()" class="text-blue-600 font-semibold hover:underline">Reset Filter</button>` : ''}
      </div>
      <div class="hidden md:block ons-table-wrap">
        <table class="ons-table is-compact">
          <thead><tr><th>No.</th><th>Nama Sales</th><th>Kode Sales</th><th>No. Telepon/HP</th><th>Actions</th></tr></thead>
          <tbody>
            ${filtered.map((x, idx) => {
              const waHref = _buildWaLink(x.no_hp, 'Halo ' + (x.nama_sales || 'Rekan') + ', koordinasi pelayanan Apotek ONS Farma.');
              return `<tr>
                <td class="font-mono-num text-xs">${idx + 1}</td>
                <td><div class="font-bold text-xs">${S().esc(x.nama_sales)}</div></td>
                <td class="font-mono-num text-xs">${S().esc(x.kode_sales || '-')}</td>
                <td class="text-xs">
                  <div class="flex items-center gap-1.5">
                    <span class="font-mono-num">${S().esc(x.no_hp || '-')}</span>
                    ${waHref ? `<a href="${S().esc(waHref)}" target="_blank" rel="noopener" class="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">WA</a>` : ''}
                  </div>
                </td>
                <td>${actionHtml(x)}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <div class="md:hidden space-y-2">
        ${filtered.map((x) => {
          const waHref = _buildWaLink(x.no_hp, 'Halo ' + (x.nama_sales || 'Rekan') + ', koordinasi pelayanan Apotek ONS Farma.');
          return `<div class="ons-md-mobile-card text-xs">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <div class="font-bold truncate">${S().esc(x.nama_sales)}</div>
                <div class="font-mono-num text-[11px]" style="color:var(--ons-text-soft)">Kode: ${S().esc(x.kode_sales || '-')}</div>
              </div>
              <span class="badge-bpom bpom-bebas shrink-0">AKTIF</span>
            </div>
            <div class="flex items-center justify-between gap-2 pt-0.5">
              ${waHref ? `<a href="${S().esc(waHref)}" target="_blank" rel="noopener" class="text-[11px] font-bold text-emerald-600 underline">Chat WA (${S().esc(x.no_hp)})</a>` : `<span class="text-[11px] font-mono-num" style="color:var(--ons-text-soft)">${S().esc(x.no_hp || '-')}</span>`}
              ${actionHtml(x)}
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>`;

    return `<div class="space-y-3">${kpiHtml}${bodyHtml}</div>`;
  }

  const MASTER_KATEGORI_KEY = 'ons_master_kategori_v1';
  const MASTER_SATUAN_KEY = 'ons_master_satuan_v1';
  const MASTER_RAK_KEY = 'ons_master_rak_v1';
  const MASTER_GUDANG_KEY = 'ons_master_gudang_v1';
  const MASTER_KAT_PELANGGAN_KEY = 'ons_master_kat_pelanggan_v1';
  const MASTER_PAJAK_KEY = 'ons_master_pajak_v1';

  let mdKategoriSearchQ = '';
  let mdSatuanSearchQ = '';
  let mdRakSearchQ = '';
  let mdGudangSearchQ = '';
  let mdKatPelangganSearchQ = '';
  let mdPajakSearchQ = '';

  function _getMasterKategoriList() {
    const list = _readLocalList(MASTER_KATEGORI_KEY);
    if (list && list.length) return list;
    const def = (S().DEFAULT_MASTER_KATEGORI ? S().DEFAULT_MASTER_KATEGORI.slice() : [
      { id_kategori: 'KAT-001', nama_kategori: 'Obat Bebas', status: 'Aktif' },
      { id_kategori: 'KAT-002', nama_kategori: 'Obat Bebas Terbatas', status: 'Aktif' },
      { id_kategori: 'KAT-003', nama_kategori: 'Obat Keras', status: 'Aktif' },
      { id_kategori: 'KAT-004', nama_kategori: 'Prekursor Farmasi', status: 'Aktif' },
      { id_kategori: 'KAT-005', nama_kategori: 'Obat-Obat Tertentu (OOT)', status: 'Aktif' },
      { id_kategori: 'KAT-006', nama_kategori: 'Psikotropika', status: 'Aktif' },
      { id_kategori: 'KAT-007', nama_kategori: 'Narkotika', status: 'Aktif' },
      { id_kategori: 'KAT-008', nama_kategori: 'Herbal & Fitofarmaka', status: 'Aktif' },
      { id_kategori: 'KAT-009', nama_kategori: 'Suplemen & Vitamin', status: 'Aktif' },
      { id_kategori: 'KAT-010', nama_kategori: 'Alat Kesehatan', status: 'Aktif' },
      { id_kategori: 'KAT-011', nama_kategori: 'Perlengkapan Bayi & Ibu', status: 'Aktif' },
      { id_kategori: 'KAT-012', nama_kategori: 'Produk Konsumsi & Lainnya', status: 'Aktif' }
    ]);
    _writeLocalList(MASTER_KATEGORI_KEY, def);
    return def;
  }

  function _getMasterSatuanList() {
    const list = _readLocalList(MASTER_SATUAN_KEY);
    if (list && list.length) return list;
    const def = (S().DEFAULT_MASTER_SATUAN ? S().DEFAULT_MASTER_SATUAN.slice() : [
      { id_satuan: 'SAT-001', nama_satuan: 'Ampul', status: 'Aktif' },
      { id_satuan: 'SAT-002', nama_satuan: 'Batang', status: 'Aktif' },
      { id_satuan: 'SAT-003', nama_satuan: 'Biji', status: 'Aktif' },
      { id_satuan: 'SAT-004', nama_satuan: 'Botol', status: 'Aktif' },
      { id_satuan: 'SAT-005', nama_satuan: 'Box', status: 'Aktif' },
      { id_satuan: 'SAT-006', nama_satuan: 'Buah', status: 'Aktif' },
      { id_satuan: 'SAT-007', nama_satuan: 'Bungkus', status: 'Aktif' },
      { id_satuan: 'SAT-008', nama_satuan: 'Butir', status: 'Aktif' },
      { id_satuan: 'SAT-009', nama_satuan: 'cc', status: 'Aktif' },
      { id_satuan: 'SAT-010', nama_satuan: 'cm', status: 'Aktif' },
      { id_satuan: 'SAT-011', nama_satuan: 'Tablet', status: 'Aktif' },
      { id_satuan: 'SAT-012', nama_satuan: 'Kapsul', status: 'Aktif' },
      { id_satuan: 'SAT-013', nama_satuan: 'Strip', status: 'Aktif' },
      { id_satuan: 'SAT-014', nama_satuan: 'Tube', status: 'Aktif' },
      { id_satuan: 'SAT-015', nama_satuan: 'Sachet', status: 'Aktif' },
      { id_satuan: 'SAT-016', nama_satuan: 'Vial', status: 'Aktif' },
      { id_satuan: 'SAT-017', nama_satuan: 'Pot', status: 'Aktif' },
      { id_satuan: 'SAT-018', nama_satuan: 'Pcs', status: 'Aktif' }
    ]);
    _writeLocalList(MASTER_SATUAN_KEY, def);
    return def;
  }

  function _getMasterRakList() {
    const list = _readLocalList(MASTER_RAK_KEY);
    if (list && list.length) return list;
    const def = (S().DEFAULT_MASTER_RAK ? S().DEFAULT_MASTER_RAK.slice() : [
      { id_rak: 'RAK-001', nama_rak: 'Gudang Utama - Rak 1', status: 'Aktif' },
      { id_rak: 'RAK-002', nama_rak: 'Gudang Utama - Rak 2', status: 'Aktif' },
      { id_rak: 'RAK-003', nama_rak: 'Gudang Utama - Rak 3', status: 'Aktif' },
      { id_rak: 'RAK-004', nama_rak: 'Etalase Depan - Rak A (OTC)', status: 'Aktif' },
      { id_rak: 'RAK-005', nama_rak: 'Etalase Depan - Rak B (Suplemen)', status: 'Aktif' },
      { id_rak: 'RAK-006', nama_rak: 'Chiller Kulkas (2-8°C Vaksin & Insulin)', status: 'Aktif' },
      { id_rak: 'RAK-007', nama_rak: 'Lemari Narkotika & Psikotropika (Double Lock)', status: 'Aktif' }
    ]);
    _writeLocalList(MASTER_RAK_KEY, def);
    return def;
  }

  function _getMasterGudangList() {
    const list = _readLocalList(MASTER_GUDANG_KEY);
    if (list && list.length) return list;
    const def = (S().DEFAULT_MASTER_GUDANG ? S().DEFAULT_MASTER_GUDANG.slice() : [
      { id_gudang: 'GDG-001', nama_gudang: 'Gudang Utama', status: 'Aktif' }
    ]);
    _writeLocalList(MASTER_GUDANG_KEY, def);
    return def;
  }

  function _getMasterKatPelangganList() {
    const list = _readLocalList(MASTER_KAT_PELANGGAN_KEY);
    if (list && list.length) return list;
    const def = (S().DEFAULT_MASTER_KAT_PELANGGAN ? S().DEFAULT_MASTER_KAT_PELANGGAN.slice() : [
      { id_kat_pelanggan: 'MKP-001', nama_kategori: 'Umum / Reguler', kode: 'REG', status: 'Aktif' },
      { id_kat_pelanggan: 'MKP-002', nama_kategori: 'Member Terapi Rutin', kode: 'RUTIN', status: 'Aktif' },
      { id_kat_pelanggan: 'MKP-003', nama_kategori: 'Pasien Klinik Mitra', kode: 'KLINIK', status: 'Aktif' },
      { id_kat_pelanggan: 'MKP-004', nama_kategori: 'Karyawan / Staf Apotek', kode: 'STAF', status: 'Aktif' },
      { id_kat_pelanggan: 'MKP-005', nama_kategori: 'VIP / Prioritas', kode: 'VIP', status: 'Aktif' }
    ]);
    _writeLocalList(MASTER_KAT_PELANGGAN_KEY, def);
    return def;
  }

  function _getMasterPajakList() {
    const list = _readLocalList(MASTER_PAJAK_KEY);
    if (list && list.length) return list;
    const def = (S().DEFAULT_MASTER_PAJAK ? S().DEFAULT_MASTER_PAJAK.slice() : [
      { id_pajak: 'TAX-001', nama_pajak: 'PPN', nilai_pajak: 11, status: 'Aktif' },
      { id_pajak: 'TAX-002', nama_pajak: 'Tanpa Pajak', nilai_pajak: 0, status: 'Aktif' }
    ]);
    _writeLocalList(MASTER_PAJAK_KEY, def);
    return def;
  }

  function _renderMasterKategoriSubTab() {
    const all = _getMasterKategoriList();
    const q = mdKategoriSearchQ.toLowerCase().trim();
    const filtered = all.filter((k) => !q || String(k.nama_kategori || '').toLowerCase().includes(q));

    return `<div class="space-y-3">
      <div class="ons-cockpit-strip">
        <div class="ons-cockpit-card is-blue">
          <div class="text-[10.5px] font-semibold text-slate-500">Total Kategori</div>
          <div class="text-lg font-extrabold font-mono-num mt-0.5 text-blue-600">${all.length} Kategori</div>
          <div class="text-[10px] text-slate-400">Klasifikasi obat &amp; barang</div>
        </div>
        <div class="ons-cockpit-card is-emerald">
          <div class="text-[10.5px] font-semibold text-slate-500">Status Aktif</div>
          <div class="text-lg font-extrabold font-mono-num mt-0.5 text-emerald-600">${all.filter((k) => String(k.status || 'Aktif').toUpperCase() === 'AKTIF').length} Aktif</div>
          <div class="text-[10px] text-slate-400">Siap digunakan di POS &amp; Defecta</div>
        </div>
        <div class="ons-cockpit-card is-azure">
          <div class="text-[10.5px] font-semibold text-slate-500">Standarisasi</div>
          <div class="text-lg font-extrabold font-mono-num mt-0.5 text-blue-600">BPOM / Kemenkes</div>
          <div class="text-[10px] text-slate-400">Kepatuhan regulasi farmasi</div>
        </div>
      </div>
      <div class="ons-card p-4 space-y-3 text-xs">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <div class="relative w-64">
            <input type="text" value="${S().esc(mdKategoriSearchQ)}" oninput="window.setKategoriSearch(this.value)" placeholder="Cari data" class="ons-input text-xs pl-8 w-full"/>
            <svg class="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>
          <button type="button" class="ons-btn ons-btn-ghost text-xs flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/></svg>
            <span>Filter 0</span>
          </button>
        </div>
        <div class="flex items-center gap-1.5">
          <button type="button" onclick="window.renderActiveView()" class="ons-btn ons-btn-ghost text-xs p-2" title="Segarkan Data"><svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg></button>
          <button type="button" onclick="window.exportMasterKategoriExcel()" class="ons-btn ons-btn-ghost text-xs p-2" title="Ekspor Excel"><svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg></button>
          <button type="button" onclick="window.print()" class="ons-btn ons-btn-ghost text-xs p-2" title="Cetak"><svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg></button>
        </div>
      </div>
      <div class="ons-table-wrap">
        <table class="ons-table">
          <thead>
            <tr>
              <th style="width:50px">No.</th>
              <th>Nama Kategori</th>
              <th style="width:120px">Status</th>
              <th style="width:120px;text-align:center">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.length ? filtered.map((k, idx) => `<tr>
              <td class="font-mono-num">${idx + 1}</td>
              <td class="font-medium text-slate-800 dark:text-slate-100">${S().esc(k.nama_kategori)}</td>
              <td>
                <span class="px-2.5 py-0.5 text-[11px] font-semibold rounded-full ${String(k.status || 'Aktif').toUpperCase() === 'AKTIF' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'}">
                  ${S().esc(k.status || 'Aktif')}
                </span>
              </td>
              <td style="text-align:center">
                <div class="inline-flex items-center justify-center gap-2">
                  <button type="button" onclick="window.openAddKategoriModal('${S().esc(k.id_kategori)}')" class="px-3 py-1 rounded text-xs border border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 font-medium">Edit</button>
                  <button type="button" onclick="window.deleteKategoriConfirm('${S().esc(k.id_kategori)}')" class="p-1 text-red-500 hover:text-red-700 transition" title="Hapus"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
                </div>
              </td>
            </tr>`).join('') : '<tr><td colspan="4" class="text-center py-8 text-xs text-slate-400">Data tidak ditemukan</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
    </div>`;
  }

  function _renderMasterSatuanSubTab() {
    const all = _getMasterSatuanList();
    const q = mdSatuanSearchQ.toLowerCase().trim();
    const filtered = all.filter((s) => !q || String(s.nama_satuan || '').toLowerCase().includes(q));

    return `<div class="space-y-3">
      <div class="ons-cockpit-strip">
        <div class="ons-cockpit-card is-blue">
          <div class="text-[10.5px] font-semibold text-slate-500">Total Satuan</div>
          <div class="text-lg font-extrabold font-mono-num mt-0.5 text-blue-600">${all.length} Satuan</div>
          <div class="text-[10px] text-slate-400">Multi-tingkat kemasan obat</div>
        </div>
        <div class="ons-cockpit-card is-emerald">
          <div class="text-[10.5px] font-semibold text-slate-500">Satuan Dasar / Eceran</div>
          <div class="text-lg font-extrabold font-mono-num mt-0.5 text-emerald-600">Tablet, Kapsul, Btl</div>
          <div class="text-[10px] text-slate-400">Pemberian resep &amp; etiket</div>
        </div>
        <div class="ons-cockpit-card is-amber">
          <div class="text-[10.5px] font-semibold text-slate-500">Kemasan Distribusi</div>
          <div class="text-lg font-extrabold font-mono-num mt-0.5 text-amber-600">Box, Strip, Vial</div>
          <div class="text-[10px] text-slate-400">Faktur pembelian dari PBF</div>
        </div>
      </div>
      <div class="ons-card p-4 space-y-3 text-xs">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <div class="relative w-64">
            <input type="text" value="${S().esc(mdSatuanSearchQ)}" oninput="window.setSatuanSearch(this.value)" placeholder="Cari data" class="ons-input text-xs pl-8 w-full"/>
            <svg class="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>
          <button type="button" class="ons-btn ons-btn-ghost text-xs flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/></svg>
            <span>Filter 0</span>
          </button>
        </div>
        <div class="flex items-center gap-1.5">
          <button type="button" onclick="window.renderActiveView()" class="ons-btn ons-btn-ghost text-xs p-2" title="Segarkan Data"><svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg></button>
          <button type="button" onclick="window.exportMasterSatuanExcel()" class="ons-btn ons-btn-ghost text-xs p-2" title="Ekspor Excel"><svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg></button>
          <button type="button" onclick="window.print()" class="ons-btn ons-btn-ghost text-xs p-2" title="Cetak"><svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg></button>
        </div>
      </div>
      <div class="ons-table-wrap">
        <table class="ons-table">
          <thead>
            <tr>
              <th style="width:50px">No.</th>
              <th>Nama Satuan</th>
              <th style="width:120px">Status</th>
              <th style="width:120px;text-align:center">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.length ? filtered.map((s, idx) => `<tr>
              <td class="font-mono-num">${idx + 1}</td>
              <td class="font-medium text-slate-800 dark:text-slate-100">${S().esc(s.nama_satuan)}</td>
              <td>
                <span class="px-2.5 py-0.5 text-[11px] font-semibold rounded-full ${String(s.status || 'Aktif').toUpperCase() === 'AKTIF' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'}">
                  ${S().esc(s.status || 'Aktif')}
                </span>
              </td>
              <td style="text-align:center">
                <div class="inline-flex items-center justify-center gap-2">
                  <button type="button" onclick="window.openAddSatuanModal('${S().esc(s.id_satuan)}')" class="px-3 py-1 rounded text-xs border border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 font-medium">Edit</button>
                  <button type="button" onclick="window.deleteSatuanConfirm('${S().esc(s.id_satuan)}')" class="p-1 text-red-500 hover:text-red-700 transition" title="Hapus"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
                </div>
              </td>
            </tr>`).join('') : '<tr><td colspan="4" class="text-center py-8 text-xs text-slate-400">Data tidak ditemukan</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
    </div>`;
  }

  function _renderMasterRakSubTab() {
    const all = _getMasterRakList();
    const q = mdRakSearchQ.toLowerCase().trim();
    const filtered = all.filter((r) => !q || String(r.nama_rak || '').toLowerCase().includes(q));

    return `<div class="space-y-3">
      <div class="ons-cockpit-strip">
        <div class="ons-cockpit-card is-blue">
          <div class="text-[10.5px] font-semibold text-slate-500">Total Lokasi Rak</div>
          <div class="text-lg font-extrabold font-mono-num mt-0.5 text-blue-600">${all.length} Rak</div>
          <div class="text-[10px] text-slate-400">Gudang utama &amp; etalase</div>
        </div>
        <div class="ons-cockpit-card is-emerald">
          <div class="text-[10.5px] font-semibold text-slate-500">Suhu Kamar (15-25°C)</div>
          <div class="text-lg font-extrabold font-mono-num mt-0.5 text-emerald-600">${Math.max(1, all.length - 2)} Rak</div>
          <div class="text-[10px] text-slate-400">Penyimpanan tablet &amp; sirup</div>
        </div>
        <div class="ons-cockpit-card is-red">
          <div class="text-[10.5px] font-semibold text-slate-500">Chiller &amp; Narkotika</div>
          <div class="text-lg font-extrabold font-mono-num mt-0.5 text-red-600">2 Unit Khusus</div>
          <div class="text-[10px] text-slate-400">Cold chain (2-8°C) &amp; double lock</div>
        </div>
      </div>
      <div class="ons-card p-4 space-y-3 text-xs">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <div class="relative w-64">
            <input type="text" value="${S().esc(mdRakSearchQ)}" oninput="window.setRakSearch(this.value)" placeholder="Cari data" class="ons-input text-xs pl-8 w-full"/>
            <svg class="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>
          <button type="button" class="ons-btn ons-btn-ghost text-xs flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/></svg>
            <span>Filter 0</span>
          </button>
        </div>
        <div class="flex items-center gap-1.5">
          <button type="button" onclick="window.renderActiveView()" class="ons-btn ons-btn-ghost text-xs p-2" title="Segarkan Data"><svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg></button>
          <button type="button" onclick="window.exportMasterRakExcel()" class="ons-btn ons-btn-ghost text-xs p-2" title="Ekspor Excel"><svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg></button>
          <button type="button" onclick="window.print()" class="ons-btn ons-btn-ghost text-xs p-2" title="Cetak"><svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg></button>
        </div>
      </div>
      <div class="ons-table-wrap">
        <table class="ons-table">
          <thead>
            <tr>
              <th style="width:50px">No.</th>
              <th>Nama Rak</th>
              <th style="width:120px">Status</th>
              <th style="width:120px;text-align:center">Action</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.length ? filtered.map((r, idx) => `<tr>
              <td class="font-mono-num">${idx + 1}</td>
              <td class="font-medium text-slate-800 dark:text-slate-100">${S().esc(r.nama_rak)}</td>
              <td>
                <span class="px-2.5 py-0.5 text-[11px] font-semibold rounded-full ${String(r.status || 'Aktif').toUpperCase() === 'AKTIF' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'}">
                  ${S().esc(r.status || 'Aktif')}
                </span>
              </td>
              <td style="text-align:center">
                <div class="inline-flex items-center justify-center gap-2">
                  <button type="button" onclick="window.openAddRakModal('${S().esc(r.id_rak)}')" class="px-3 py-1 rounded text-xs border border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 font-medium">Edit</button>
                  <button type="button" onclick="window.deleteRakConfirm('${S().esc(r.id_rak)}')" class="p-1 text-red-500 hover:text-red-700 transition" title="Hapus"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
                </div>
              </td>
            </tr>`).join('') : '<tr><td colspan="4" class="text-center py-8 text-xs text-slate-400">Data tidak ditemukan</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
    </div>`;
  }

  function _renderMasterGudangSubTab() {
    const all = _getMasterGudangList();
    const q = mdGudangSearchQ.toLowerCase().trim();
    const filtered = all.filter((g) => !q || String(g.nama_gudang || '').toLowerCase().includes(q));

    return `<div class="space-y-3">
      <div class="ons-cockpit-strip">
        <div class="ons-cockpit-card is-blue">
          <div class="text-[10.5px] font-semibold text-slate-500">Total Gudang Terdaftar</div>
          <div class="text-lg font-extrabold font-mono-num mt-0.5 text-blue-600">${all.length} Lokasi</div>
          <div class="text-[10px] text-slate-400">Sentral penyimpanan fisik</div>
        </div>
        <div class="ons-cockpit-card is-emerald">
          <div class="text-[10.5px] font-semibold text-slate-500">Integrasi Persediaan</div>
          <div class="text-lg font-extrabold font-mono-num mt-0.5 text-emerald-600">Realtime FEFO</div>
          <div class="text-[10px] text-slate-400">Sinkron otomatis POS &amp; GRN</div>
        </div>
      </div>
      <div class="ons-card p-4 space-y-3 text-xs">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <div class="relative w-64">
            <input type="text" value="${S().esc(mdGudangSearchQ)}" oninput="window.setGudangSearch(this.value)" placeholder="Cari data" class="ons-input text-xs pl-8 w-full"/>
            <svg class="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>
          <button type="button" class="ons-btn ons-btn-ghost text-xs flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/></svg>
            <span>Filter 0</span>
          </button>
        </div>
        <div class="flex items-center gap-1.5">
          <button type="button" onclick="window.renderActiveView()" class="ons-btn ons-btn-ghost text-xs p-2" title="Segarkan Data"><svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg></button>
          <button type="button" onclick="window.exportMasterGudangExcel()" class="ons-btn ons-btn-ghost text-xs p-2" title="Ekspor Excel"><svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg></button>
          <button type="button" onclick="window.print()" class="ons-btn ons-btn-ghost text-xs p-2" title="Cetak"><svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg></button>
        </div>
      </div>
      <div class="ons-table-wrap">
        <table class="ons-table">
          <thead>
            <tr>
              <th style="width:50px">No.</th>
              <th>Nama Gudang</th>
              <th style="width:120px">Status</th>
              <th style="width:120px;text-align:center">Action</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.length ? filtered.map((g, idx) => `<tr>
              <td class="font-mono-num">${idx + 1}</td>
              <td class="font-medium text-slate-800 dark:text-slate-100">${S().esc(g.nama_gudang)}</td>
              <td>
                <span class="px-2.5 py-0.5 text-[11px] font-semibold rounded-full ${String(g.status || 'Aktif').toUpperCase() === 'AKTIF' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'}">
                  ${S().esc(g.status || 'Aktif')}
                </span>
              </td>
              <td style="text-align:center">
                <div class="inline-flex items-center justify-center gap-2">
                  <button type="button" onclick="window.openAddGudangModal('${S().esc(g.id_gudang)}')" class="px-3 py-1 rounded text-xs border border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 font-medium">Edit</button>
                  <button type="button" onclick="window.deleteGudangConfirm('${S().esc(g.id_gudang)}')" class="p-1 text-red-500 hover:text-red-700 transition" title="Hapus"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
                </div>
              </td>
            </tr>`).join('') : '<tr><td colspan="4" class="text-center py-8 text-xs text-slate-400">Data tidak ditemukan</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
    </div>`;
  }

  function _renderMasterKategoriPelangganSubTab() {
    const all = _getMasterKatPelangganList();
    const q = mdKatPelangganSearchQ.toLowerCase().trim();
    const filtered = all.filter((kp) => !q || String(kp.nama_kategori || '').toLowerCase().includes(q) || String(kp.kode || '').toLowerCase().includes(q));

    return `<div class="space-y-3">
      <div class="ons-cockpit-strip">
        <div class="ons-cockpit-card is-blue">
          <div class="text-[10.5px] font-semibold text-slate-500">Total Kategori Member</div>
          <div class="text-lg font-extrabold font-mono-num mt-0.5 text-blue-600">${all.length} Kelompok</div>
          <div class="text-[10px] text-slate-400">Klasifikasi segmen pelanggan</div>
        </div>
        <div class="ons-cockpit-card is-emerald">
          <div class="text-[10.5px] font-semibold text-slate-500">Tiering Harga &amp; Poin</div>
          <div class="text-lg font-extrabold font-mono-num mt-0.5 text-emerald-600">Aktif Otomatis</div>
          <div class="text-[10px] text-slate-400">Diskon khusus saat kasir scan</div>
        </div>
      </div>
      <div class="ons-card p-4 space-y-3 text-xs">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <div class="relative w-64">
            <input type="text" value="${S().esc(mdKatPelangganSearchQ)}" oninput="window.setKatPelangganSearch(this.value)" placeholder="Cari data" class="ons-input text-xs pl-8 w-full"/>
            <svg class="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>
          <button type="button" class="ons-btn ons-btn-ghost text-xs flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/></svg>
            <span>Filter 0</span>
          </button>
        </div>
        <div class="flex items-center gap-1.5">
          <button type="button" onclick="window.renderActiveView()" class="ons-btn ons-btn-ghost text-xs p-2" title="Segarkan Data"><svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg></button>
          <button type="button" onclick="window.exportMasterKatPelangganExcel()" class="ons-btn ons-btn-ghost text-xs p-2" title="Ekspor Excel"><svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg></button>
          <button type="button" onclick="window.print()" class="ons-btn ons-btn-ghost text-xs p-2" title="Cetak"><svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg></button>
        </div>
      </div>
      <div class="ons-table-wrap">
        <table class="ons-table">
          <thead>
            <tr>
              <th style="width:50px">No.</th>
              <th>Nama Kategori</th>
              <th style="width:120px">Kode</th>
              <th style="width:120px">Status</th>
              <th style="width:120px;text-align:center">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.length ? filtered.map((kp, idx) => `<tr>
              <td class="font-mono-num">${idx + 1}</td>
              <td class="font-medium text-slate-800 dark:text-slate-100">${S().esc(kp.nama_kategori)}</td>
              <td class="font-mono-num font-semibold text-blue-600">${S().esc(kp.kode)}</td>
              <td>
                <span class="px-2.5 py-0.5 text-[11px] font-semibold rounded-full ${String(kp.status || 'Aktif').toUpperCase() === 'AKTIF' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'}">
                  ${S().esc(kp.status || 'Aktif')}
                </span>
              </td>
              <td style="text-align:center">
                <div class="inline-flex items-center justify-center gap-2">
                  <button type="button" onclick="window.openAddKatPelangganModal('${S().esc(kp.id_kat_pelanggan)}')" class="px-3 py-1 rounded text-xs border border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 font-medium">Edit</button>
                  <button type="button" onclick="window.deleteKatPelangganConfirm('${S().esc(kp.id_kat_pelanggan)}')" class="p-1 text-red-500 hover:text-red-700 transition" title="Hapus"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
                </div>
              </td>
            </tr>`).join('') : '<tr><td colspan="5" class="text-center py-8 text-xs text-slate-400">Data tidak ditemukan</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
    </div>`;
  }

  function _renderMasterPajakSubTab() {
    const all = _getMasterPajakList();
    const q = mdPajakSearchQ.toLowerCase().trim();
    const filtered = all.filter((p) => !q || String(p.nama_pajak || '').toLowerCase().includes(q));

    return `<div class="space-y-3">
      <div class="ons-cockpit-strip">
        <div class="ons-cockpit-card is-blue">
          <div class="text-[10.5px] font-semibold text-slate-500">PPN Standar Transaksi</div>
          <div class="text-lg font-extrabold font-mono-num mt-0.5 text-blue-600">11%</div>
          <div class="text-[10px] text-slate-400">Tarif PPN UU Perpajakan</div>
        </div>
        <div class="ons-cockpit-card is-emerald">
          <div class="text-[10.5px] font-semibold text-slate-500">Non-Pajak / Dibebaskan</div>
          <div class="text-lg font-extrabold font-mono-num mt-0.5 text-emerald-600">0% Non-Pajak</div>
          <div class="text-[10px] text-slate-400">Sesuai ketentuan faktur apotek</div>
        </div>
      </div>
      <div class="ons-card p-4 space-y-3 text-xs">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <div class="relative w-64">
            <input type="text" value="${S().esc(mdPajakSearchQ)}" oninput="window.setPajakSearch(this.value)" placeholder="Cari data" class="ons-input text-xs pl-8 w-full"/>
            <svg class="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>
          <button type="button" class="ons-btn ons-btn-ghost text-xs flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/></svg>
            <span>Filter 0</span>
          </button>
        </div>
        <div class="flex items-center gap-1.5">
          <button type="button" onclick="window.renderActiveView()" class="ons-btn ons-btn-ghost text-xs p-2" title="Segarkan Data"><svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg></button>
          <button type="button" onclick="window.exportMasterPajakExcel()" class="ons-btn ons-btn-ghost text-xs p-2" title="Ekspor Excel"><svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg></button>
          <button type="button" onclick="window.print()" class="ons-btn ons-btn-ghost text-xs p-2" title="Cetak"><svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg></button>
        </div>
      </div>
      <div class="ons-table-wrap">
        <table class="ons-table">
          <thead>
            <tr>
              <th style="width:50px">No.</th>
              <th>Nama Pajak</th>
              <th class="text-right" style="width:140px">Nilai Pajak</th>
              <th style="width:120px;text-align:center">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.length ? filtered.map((p, idx) => `<tr>
              <td class="font-mono-num">${idx + 1}</td>
              <td class="font-medium text-slate-800 dark:text-slate-100">${S().esc(p.nama_pajak)}</td>
              <td class="text-right font-mono-num font-semibold text-slate-700 dark:text-slate-200">${Number(p.nilai_pajak || 0)}%</td>
              <td style="text-align:center">
                <div class="inline-flex items-center justify-center gap-2">
                  <button type="button" onclick="window.openAddPajakModal('${S().esc(p.id_pajak)}')" class="px-3 py-1 rounded text-xs border border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 font-medium">Edit</button>
                  <button type="button" onclick="window.deletePajakConfirm('${S().esc(p.id_pajak)}')" class="p-1 text-red-500 hover:text-red-700 transition" title="Hapus"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
                </div>
              </td>
            </tr>`).join('') : '<tr><td colspan="4" class="text-center py-8 text-xs text-slate-400">Data tidak ditemukan</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
    </div>`;
  }

  function _renderMasterSalesSubTab() {
    return `<div class="space-y-3">
      <div class="ons-card p-2.5">
        <div class="flex flex-wrap items-center gap-2">
          ${_renderSearchInputWithClear('mdSalesSearchInp', 'mdSalesClearBtn', salesSearchQ, 'Cari nama sales, kode sales, atau nomor telepon...', 'window.setMasterSalesSearch', 'window.clearMasterSalesSearch')}
        </div>
      </div>

      <div id="mdResultsSlot">${_renderMasterSalesResultsHtml()}</div>
    </div>`;
  }

  function renderMasterObatView() {
    const st = S().AppState;
    const seeCost = S().canSeeFinancialCost();
    const canSupplier = S().canAccessSubTab ? S().canAccessSubTab('obat', 'supplier') : seeCost;
    const allowedTabs = ['obat', 'kategori', 'satuan', 'rak', 'gudang', 'kategori-pelanggan', 'pajak', 'supplier', 'pelanggan', 'dokter', 'sales'];
    masterTab = (st.subTabs && st.subTabs.obat) || masterTab || 'obat';
    if (masterTab === 'supplier' && !canSupplier) masterTab = 'obat';
    if (!allowedTabs.includes(masterTab)) masterTab = 'obat';

    const { allMeta, filtered } = _getFilteredMasterObatMeta();
    const obatCount = (st.masterObat || []).length;
    const supCount = (st.supplierPbf || []).length;
    const pelCount = (st.members || []).length;
    const dokCount = (st.masterDokter || []).length;
    const salesCount = _getSalesStaffList().length;

    const tabs = [
      { id: 'obat', label: 'Master Produk', count: obatCount },
      { id: 'kategori', label: 'Master Kategori', count: _getMasterKategoriList().length },
      { id: 'satuan', label: 'Master Satuan', count: _getMasterSatuanList().length },
      { id: 'rak', label: 'Master Rak', count: _getMasterRakList().length },
      { id: 'gudang', label: 'Master Gudang', count: _getMasterGudangList().length },
      { id: 'kategori-pelanggan', label: 'Master Kategori Pelanggan', count: _getMasterKatPelangganList().length },
      { id: 'pajak', label: 'Master Pajak', count: _getMasterPajakList().length },
      ...(canSupplier ? [{ id: 'supplier', label: 'Supplier', count: supCount }] : []),
      { id: 'pelanggan', label: 'Pelanggan', count: pelCount },
      { id: 'dokter', label: 'Dokter', count: dokCount },
      { id: 'sales', label: 'Sales/Pelayan', count: salesCount }
    ];

    const exportBtns = (fnName) => `
      <button onclick="window.${fnName}('xlsx')" class="ons-btn ons-btn-ghost text-xs py-1.5 px-2.5">Excel</button>
      <button onclick="window.${fnName}('csv')" class="ons-btn ons-btn-ghost text-xs py-1.5 px-2.5">CSV</button>
      <button onclick="window.${fnName}('pdf')" class="ons-btn ons-btn-ghost text-xs py-1.5 px-2.5">PDF</button>
    `;

    let pageTitle = 'Master Data Apotek';
    let pageDesc = 'Kelola terpusat katalog Obat KFA, Supplier PBF, Pelanggan Apotek, Dokter Mitra & Sales/Pelayan.';
    let headerActions = '';

    if (masterTab === 'obat') {
      pageTitle = 'Master Produk';
      pageDesc = 'Kelola terpusat katalog Obat KFA, satuan multi-kemasan, referensi harga & rak penyimpanan.';
      headerActions = `
        <button type="button" onclick="window.openObatBatchEditModal()" class="ons-btn text-xs py-1.5 px-2.5 text-white" style="background:#0D9488"><i class="fa fa-pencil mr-1"></i> Ubah Sekaligus</button>
        <button type="button" onclick="window.openImportObatModal()" class="ons-btn text-xs py-1.5 px-2.5 text-white" style="background:#0D9488"><i class="fa fa-plus mr-1"></i> Tambah Sekaligus</button>
        <button type="button" onclick="window.openObatWizardModal()" class="ons-btn text-xs py-1.5 px-2.5 text-white" style="background:#0D9488" title="+ Tambah Produk"><i class="fa fa-plus mr-1"></i> + Produk Baru <span class="sr-only">+ Tambah Produk</span></button>
        <button type="button" onclick="window.openBulkMarginWizard()" class="ons-btn text-xs py-1.5 px-2.5 text-white" style="background:#0F766E" title="Evaluasi &amp; Kalkulator Margin Massal"><i class="fa fa-calculator mr-1"></i> Evaluasi Margin</button>
        <button type="button" onclick="window.openPrintMasterLabelsModal()" class="ons-btn ons-btn-emerald text-xs py-1.5 px-2.5" title="Cetak Stiker Barcode">Cetak Barcode</button>
        ${exportBtns('exportMasterObat')}
      `;
    } else if (masterTab === 'kategori') {
      pageTitle = 'Daftar Kategori';
      pageDesc = 'Katalog kategori produk/obat untuk mempermudah klasifikasi dan filter.';
      headerActions = `
        <button type="button" onclick="window.openAddKategoriModal('')" class="ons-btn text-xs py-1.5 px-2.5 text-white font-medium" style="background:#0D9488">+ Tambah Kategori</button>
      `;
    } else if (masterTab === 'satuan') {
      pageTitle = 'Daftar Satuan';
      pageDesc = 'Daftar satuan kemasan dasar dan multi-tingkat (Box, Strip, Tablet, dsb.).';
      headerActions = `
        <button type="button" onclick="window.openAddSatuanModal('')" class="ons-btn text-xs py-1.5 px-2.5 text-white font-medium" style="background:#0D9488">+ Tambah Satuan Kemasan</button>
      `;
    } else if (masterTab === 'rak') {
      pageTitle = 'Daftar Rak Penyimpanan';
      pageDesc = 'Lokasi penyimpanan fisik obat dan barang di apotek/gudang.';
      headerActions = `
        <button type="button" onclick="window.openAddRakModal('')" class="ons-btn text-xs py-1.5 px-2.5 text-white font-medium" style="background:#0D9488">+ Tambah Rak</button>
      `;
    } else if (masterTab === 'gudang') {
      pageTitle = 'Daftar Gudang';
      pageDesc = 'Gudang utama, instalasi farmasi, dan cabang penyimpanan stok.';
      headerActions = `
        <button type="button" onclick="window.openAddGudangModal('')" class="ons-btn text-xs py-1.5 px-2.5 text-white font-medium" style="background:#0D9488">+ Tambah Gudang</button>
      `;
    } else if (masterTab === 'kategori-pelanggan') {
      pageTitle = 'Daftar Kategori Pelanggan';
      pageDesc = 'Klasifikasi keanggotaan pelanggan (Umum, Terapi Rutin, Pasien Mitra, Karyawan, VIP).';
      headerActions = `
        <button type="button" onclick="window.openAddKatPelangganModal('')" class="ons-btn text-xs py-1.5 px-2.5 text-white font-medium" style="background:#0D9488">+ Tambah Kategori</button>
      `;
    } else if (masterTab === 'pajak') {
      pageTitle = 'Pajak';
      pageDesc = 'Konfigurasi tarif pajak pertambahan nilai (PPN) atau non-pajak untuk transaksi.';
      headerActions = `
        <button type="button" onclick="window.openAddPajakModal('')" class="ons-btn text-xs py-1.5 px-2.5 text-white font-medium" style="background:#0D9488">+ Pajak</button>
      `;
    } else if (masterTab === 'supplier') {
      pageTitle = 'Daftar Supplier PBF';
      pageDesc = 'Direktori pedagang besar farmasi (PBF) resmi dengan izin CDOB & kontak WhatsApp.';
      headerActions = `
        <button onclick="window.openSupplierPbfModal('')" class="ons-btn ons-btn-primary text-xs py-1.5 px-2.5">+ Supplier</button>
        <button onclick="window.openKontakImportModal('supplier')" class="ons-btn ons-btn-ghost text-xs py-1.5 px-2.5">Import</button>
        <button onclick="window.navigateView('defecta','sp')" class="ons-btn ons-btn-ghost text-xs py-1.5 px-2.5">Buat SP</button>
        ${exportBtns('exportMasterSupplier')}
      `;
    } else if (masterTab === 'pelanggan') {
      pageTitle = 'Daftar Pelanggan';
      pageDesc = 'Buku kontak pelanggan apotek, data rekam medis, status keanggotaan & pantauan terapi.';
      headerActions = `
        <button onclick="window.openMasterPelangganModal('')" class="ons-btn ons-btn-primary text-xs py-1.5 px-2.5">+ Pelanggan</button>
        <button onclick="window.openKontakImportModal('pelanggan')" class="ons-btn ons-btn-ghost text-xs py-1.5 px-2.5">Import</button>
        <button onclick="window.setMasterPelangganProg('MEMBER_RUTIN')" class="ons-btn ons-btn-ghost text-xs py-1.5 px-2.5">Pantau Terapi Rutin</button>
        ${exportBtns('exportMasterPelanggan')}
      `;
    } else if (masterTab === 'dokter') {
      pageTitle = 'Daftar Dokter Mitra';
      pageDesc = 'Direktori dokter penulis resep, nomor SIP, klinik mitra & integrasi SatuSehat.';
      headerActions = `
        <button onclick="window.openMasterDokterModal('')" class="ons-btn ons-btn-primary text-xs py-1.5 px-2.5">+ Dokter</button>
        <button onclick="window.openKontakImportModal('dokter')" class="ons-btn ons-btn-ghost text-xs py-1.5 px-2.5">Import</button>
        <button onclick="window.navigateView('klinis','erx')" class="ons-btn ons-btn-ghost text-xs py-1.5 px-2.5">Antrean E-Resep</button>
        ${exportBtns('exportMasterDokter')}
      `;
    } else {
      pageTitle = 'Daftar Sales & Pelayan';
      pageDesc = 'Daftar tenaga kasir & sales pelayan apotek untuk komisi dan pencatatan transaksi.';
      headerActions = `
        <button onclick="window.openMasterSalesModal('')" class="ons-btn ons-btn-primary text-xs py-1.5 px-2.5">+ Sales/Pelayan</button>
        ${exportBtns('exportMasterSales')}
      `;
    }

    const bodyHtml = masterTab === 'kategori'
      ? _renderMasterKategoriSubTab()
      : (masterTab === 'satuan'
        ? _renderMasterSatuanSubTab()
        : (masterTab === 'rak'
          ? _renderMasterRakSubTab()
          : (masterTab === 'gudang'
            ? _renderMasterGudangSubTab()
            : (masterTab === 'kategori-pelanggan'
              ? _renderMasterKategoriPelangganSubTab()
              : (masterTab === 'pajak'
                ? _renderMasterPajakSubTab()
                : (masterTab === 'supplier'
                  ? _renderMasterSupplierSubTab()
                  : (masterTab === 'pelanggan'
                    ? _renderMasterPelangganSubTab()
                    : (masterTab === 'dokter'
                      ? _renderMasterDokterSubTab()
                      : (masterTab === 'sales'
                        ? _renderMasterSalesSubTab()
                        : _renderMasterObatSubTab(seeCost, allMeta, filtered))))))))));

    return `<div class="space-y-3 ons-view-enter">
      <div class="ons-md-shell space-y-2">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="min-w-0">
            <h1 class="text-base sm:text-lg font-extrabold tracking-tight">${S().esc(pageTitle)}</h1>
            <p class="text-[11px]" style="color:var(--ons-text-soft)">${S().esc(pageDesc)}</p>
          </div>
          <div class="flex flex-wrap items-center gap-1.5">${headerActions}</div>
        </div>
        <div class="ons-md-tabs" role="tablist" aria-label="Sub Menu Master Data">
          ${tabs.map((tb) => `<button type="button" role="tab" aria-selected="${masterTab === tb.id ? 'true' : 'false'}" onclick="window.setMasterTab('${tb.id}')" class="ons-md-tab ${masterTab === tb.id ? 'active' : ''}">
            <span>${S().esc(tb.label)}</span>
            <span class="ons-md-tab-count">${tb.count}</span>
          </button>`).join('')}
        </div>
      </div>
      ${bodyHtml}
    </div>`;
  }

  global.setMasterTab = (t) => {
    const req = String(t || 'obat');
    const canSupplier = S().canAccessSubTab ? S().canAccessSubTab('obat', 'supplier') : S().canSeeFinancialCost();
    const allowed = ['obat', 'kategori', 'satuan', 'rak', 'gudang', 'kategori-pelanggan', 'pajak', 'supplier', 'pelanggan', 'dokter', 'sales'];
    masterTab = (req === 'supplier' && !canSupplier) ? 'obat' : (allowed.includes(req) ? req : 'obat');
    if (S().AppState.subTabs) S().AppState.subTabs.obat = masterTab;
    S().AppState.activeSubTab = masterTab;
    global.renderActiveView();
    if (typeof global.syncNavHighlight === 'function') global.syncNavHighlight();
  };

  /* ==========================================================================
     MASTER DATA: KATEGORI, SATUAN, RAK, GUDANG, KATEGORI PELANGGAN & PAJAK CRUD
     ========================================================================== */
  global.setKategoriSearch = (v) => { mdKategoriSearchQ = v || ''; global.renderActiveView(); };
  global.openAddKategoriModal = (id) => {
    const list = _getMasterKategoriList();
    const existing = list.find((k) => k.id_kategori === id);
    S().openModal(`<div class="p-6 space-y-4 text-xs">
      <div class="flex justify-between items-center pb-2 border-b" style="border-color:var(--ons-border)">
        <h3 class="font-bold text-base text-slate-800 dark:text-slate-100">${existing ? 'Edit Kategori' : 'Tambah Kategori'}</h3>
        <button type="button" onclick="ONSStore.closeModal()" class="text-xl">&times;</button>
      </div>
      <div class="space-y-3">
        <div>
          <label class="font-semibold block mb-1">Nama Kategori *</label>
          <input id="kategoriNamaInp" class="ons-input" value="${S().esc(existing ? existing.nama_kategori : '')}" placeholder="Contoh: Obat Bebas, Herbal, Kosmetik"/>
        </div>
        <div>
          <label class="font-semibold block mb-1">Status</label>
          <select id="kategoriStatusInp" class="ons-select">
            <option value="Aktif" ${!existing || existing.status === 'Aktif' ? 'selected' : ''}>Aktif</option>
            <option value="Nonaktif" ${existing && existing.status === 'Nonaktif' ? 'selected' : ''}>Nonaktif</option>
          </select>
        </div>
      </div>
      <div class="flex justify-end gap-2 pt-2 border-t" style="border-color:var(--ons-border)">
        <button type="button" onclick="ONSStore.closeModal()" class="ons-btn ons-btn-ghost text-xs">Batal</button>
        <button type="button" onclick="window.saveKategoriFromModal('${S().esc(id || '')}')" class="ons-btn text-xs text-white" style="background:#0D9488">Simpan</button>
      </div>
    </div>`, '440px');
  };
  global.saveKategoriFromModal = (id) => {
    const nama = ((document.getElementById('kategoriNamaInp') || {}).value || '').trim();
    const status = ((document.getElementById('kategoriStatusInp') || {}).value || 'Aktif').trim();
    if (!nama) return global.toast('Nama kategori wajib diisi!', 'warn');
    const list = _getMasterKategoriList().slice();
    if (id) {
      const idx = list.findIndex((k) => k.id_kategori === id);
      if (idx >= 0) list[idx] = { ...list[idx], nama_kategori: nama, status };
    } else {
      const newId = 'KAT-' + String(list.length + 1).padStart(3, '0');
      list.push({ id_kategori: newId, nama_kategori: nama, status });
    }
    _writeLocalList(MASTER_KATEGORI_KEY, list);
    S().AppState.masterKategori = list;
    S().closeModal();
    global.toast('Kategori berhasil disimpan', 'ok');
    global.renderActiveView();
  };
  global.deleteKategoriConfirm = (id) => {
    const list = _getMasterKategoriList();
    const item = list.find((k) => k.id_kategori === id);
    if (!item) return;
    _openDeleteConfirmModal({
      title: 'Hapus Kategori?',
      name: item.nama_kategori,
      id: item.id_kategori,
      entityLabel: 'Master Kategori',
      confirmFnName: 'window.confirmDeleteKategori'
    });
  };
  global.confirmDeleteKategori = (id) => {
    const list = _getMasterKategoriList().filter((k) => k.id_kategori !== id);
    _writeLocalList(MASTER_KATEGORI_KEY, list);
    S().AppState.masterKategori = list;
    S().closeModal();
    global.toast('Kategori berhasil dihapus', 'ok');
    global.renderActiveView();
  };
  global.exportMasterKategoriExcel = () => {
    const list = _getMasterKategoriList();
    const dateTag = new Date().toISOString().slice(0, 10);
    const headers = [
      { key: 'no', label: 'No.', type: 'int', width: 6 },
      { key: 'nama_kategori', label: 'Nama Kategori', width: 28 },
      { key: 'status', label: 'Status', width: 14 }
    ];
    const rows = list.map((k, i) => ({ no: i + 1, nama_kategori: k.nama_kategori, status: k.status || 'Aktif' }));
    return S().exportDataset('xlsx', 'Daftar Kategori Produk', 'Master_Kategori_ONS_' + dateTag, headers, rows, { sheetName: 'Kategori' });
  };

  global.setSatuanSearch = (v) => { mdSatuanSearchQ = v || ''; global.renderActiveView(); };
  global.openAddSatuanModal = (id) => {
    const list = _getMasterSatuanList();
    const existing = list.find((s) => s.id_satuan === id);
    S().openModal(`<div class="p-6 space-y-4 text-xs">
      <div class="flex justify-between items-center pb-2 border-b" style="border-color:var(--ons-border)">
        <h3 class="font-bold text-base text-slate-800 dark:text-slate-100">${existing ? 'Edit Satuan Kemasan' : 'Tambah Satuan Kemasan'}</h3>
        <button type="button" onclick="ONSStore.closeModal()" class="text-xl">&times;</button>
      </div>
      <div class="space-y-3">
        <div>
          <label class="font-semibold block mb-1">Nama Satuan Kemasan *</label>
          <input id="satuanNamaInp" class="ons-input" value="${S().esc(existing ? existing.nama_satuan : '')}" placeholder="Contoh: Box, Strip, Botol, Vial"/>
        </div>
        <div>
          <label class="font-semibold block mb-1">Status</label>
          <select id="satuanStatusInp" class="ons-select">
            <option value="Aktif" ${!existing || existing.status === 'Aktif' ? 'selected' : ''}>Aktif</option>
            <option value="Nonaktif" ${existing && existing.status === 'Nonaktif' ? 'selected' : ''}>Nonaktif</option>
          </select>
        </div>
      </div>
      <div class="flex justify-end gap-2 pt-2 border-t" style="border-color:var(--ons-border)">
        <button type="button" onclick="ONSStore.closeModal()" class="ons-btn ons-btn-ghost text-xs">Batal</button>
        <button type="button" onclick="window.saveSatuanFromModal('${S().esc(id || '')}')" class="ons-btn text-xs text-white" style="background:#0D9488">Simpan</button>
      </div>
    </div>`, '440px');
  };
  global.saveSatuanFromModal = (id) => {
    const nama = ((document.getElementById('satuanNamaInp') || {}).value || '').trim();
    const status = ((document.getElementById('satuanStatusInp') || {}).value || 'Aktif').trim();
    if (!nama) return global.toast('Nama satuan kemasan wajib diisi!', 'warn');
    const list = _getMasterSatuanList().slice();
    if (id) {
      const idx = list.findIndex((s) => s.id_satuan === id);
      if (idx >= 0) list[idx] = { ...list[idx], nama_satuan: nama, status };
    } else {
      const newId = 'SAT-' + String(list.length + 1).padStart(3, '0');
      list.push({ id_satuan: newId, nama_satuan: nama, status });
    }
    _writeLocalList(MASTER_SATUAN_KEY, list);
    S().AppState.masterSatuan = list;
    S().closeModal();
    global.toast('Satuan kemasan berhasil disimpan', 'ok');
    global.renderActiveView();
  };
  global.deleteSatuanConfirm = (id) => {
    const list = _getMasterSatuanList();
    const item = list.find((s) => s.id_satuan === id);
    if (!item) return;
    _openDeleteConfirmModal({
      title: 'Hapus Satuan Kemasan?',
      name: item.nama_satuan,
      id: item.id_satuan,
      entityLabel: 'Master Satuan',
      confirmFnName: 'window.confirmDeleteSatuan'
    });
  };
  global.confirmDeleteSatuan = (id) => {
    const list = _getMasterSatuanList().filter((s) => s.id_satuan !== id);
    _writeLocalList(MASTER_SATUAN_KEY, list);
    S().AppState.masterSatuan = list;
    S().closeModal();
    global.toast('Satuan kemasan berhasil dihapus', 'ok');
    global.renderActiveView();
  };
  global.exportMasterSatuanExcel = () => {
    const list = _getMasterSatuanList();
    const dateTag = new Date().toISOString().slice(0, 10);
    const headers = [
      { key: 'no', label: 'No.', type: 'int', width: 6 },
      { key: 'nama_satuan', label: 'Nama Satuan', width: 24 },
      { key: 'status', label: 'Status', width: 14 }
    ];
    const rows = list.map((s, i) => ({ no: i + 1, nama_satuan: s.nama_satuan, status: s.status || 'Aktif' }));
    return S().exportDataset('xlsx', 'Daftar Satuan Kemasan', 'Master_Satuan_ONS_' + dateTag, headers, rows, { sheetName: 'Satuan' });
  };

  global.setRakSearch = (v) => { mdRakSearchQ = v || ''; global.renderActiveView(); };
  global.openAddRakModal = (id) => {
    const list = _getMasterRakList();
    const existing = list.find((r) => r.id_rak === id);
    S().openModal(`<div class="p-6 space-y-4 text-xs">
      <div class="flex justify-between items-center pb-2 border-b" style="border-color:var(--ons-border)">
        <h3 class="font-bold text-base text-slate-800 dark:text-slate-100">${existing ? 'Edit Rak' : 'Tambah Rak'}</h3>
        <button type="button" onclick="ONSStore.closeModal()" class="text-xl">&times;</button>
      </div>
      <div class="space-y-3">
        <div>
          <label class="font-semibold block mb-1">Nama Rak *</label>
          <input id="rakNamaInp" class="ons-input" value="${S().esc(existing ? existing.nama_rak : '')}" placeholder="Contoh: Gudang Utama - Rak 1, Rak Chiller"/>
        </div>
        <div>
          <label class="font-semibold block mb-1">Status</label>
          <select id="rakStatusInp" class="ons-select">
            <option value="Aktif" ${!existing || existing.status === 'Aktif' ? 'selected' : ''}>Aktif</option>
            <option value="Nonaktif" ${existing && existing.status === 'Nonaktif' ? 'selected' : ''}>Nonaktif</option>
          </select>
        </div>
      </div>
      <div class="flex justify-end gap-2 pt-2 border-t" style="border-color:var(--ons-border)">
        <button type="button" onclick="ONSStore.closeModal()" class="ons-btn ons-btn-ghost text-xs">Batal</button>
        <button type="button" onclick="window.saveRakFromModal('${S().esc(id || '')}')" class="ons-btn text-xs text-white" style="background:#0D9488">Simpan</button>
      </div>
    </div>`, '440px');
  };
  global.saveRakFromModal = (id) => {
    const nama = ((document.getElementById('rakNamaInp') || {}).value || '').trim();
    const status = ((document.getElementById('rakStatusInp') || {}).value || 'Aktif').trim();
    if (!nama) return global.toast('Nama rak wajib diisi!', 'warn');
    const list = _getMasterRakList().slice();
    if (id) {
      const idx = list.findIndex((r) => r.id_rak === id);
      if (idx >= 0) list[idx] = { ...list[idx], nama_rak: nama, status };
    } else {
      const newId = 'RAK-' + String(list.length + 1).padStart(3, '0');
      list.push({ id_rak: newId, nama_rak: nama, status });
    }
    _writeLocalList(MASTER_RAK_KEY, list);
    S().AppState.masterRak = list;
    S().closeModal();
    global.toast('Rak berhasil disimpan', 'ok');
    global.renderActiveView();
  };
  global.deleteRakConfirm = (id) => {
    const list = _getMasterRakList();
    const item = list.find((r) => r.id_rak === id);
    if (!item) return;
    _openDeleteConfirmModal({
      title: 'Hapus Rak?',
      name: item.nama_rak,
      id: item.id_rak,
      entityLabel: 'Master Rak',
      confirmFnName: 'window.confirmDeleteRak'
    });
  };
  global.confirmDeleteRak = (id) => {
    const list = _getMasterRakList().filter((r) => r.id_rak !== id);
    _writeLocalList(MASTER_RAK_KEY, list);
    S().AppState.masterRak = list;
    S().closeModal();
    global.toast('Rak berhasil dihapus', 'ok');
    global.renderActiveView();
  };
  global.exportMasterRakExcel = () => {
    const list = _getMasterRakList();
    const dateTag = new Date().toISOString().slice(0, 10);
    const headers = [
      { key: 'no', label: 'No.', type: 'int', width: 6 },
      { key: 'nama_rak', label: 'Nama Rak', width: 28 },
      { key: 'status', label: 'Status', width: 14 }
    ];
    const rows = list.map((r, i) => ({ no: i + 1, nama_rak: r.nama_rak, status: r.status || 'Aktif' }));
    return S().exportDataset('xlsx', 'Daftar Rak Penyimpanan', 'Master_Rak_ONS_' + dateTag, headers, rows, { sheetName: 'Rak' });
  };

  global.setGudangSearch = (v) => { mdGudangSearchQ = v || ''; global.renderActiveView(); };
  global.openAddGudangModal = (id) => {
    const list = _getMasterGudangList();
    const existing = list.find((g) => g.id_gudang === id);
    S().openModal(`<div class="p-6 space-y-4 text-xs">
      <div class="flex justify-between items-center pb-2 border-b" style="border-color:var(--ons-border)">
        <h3 class="font-bold text-base text-slate-800 dark:text-slate-100">${existing ? 'Edit Gudang' : 'Tambah Gudang'}</h3>
        <button type="button" onclick="ONSStore.closeModal()" class="text-xl">&times;</button>
      </div>
      <div class="space-y-3">
        <div>
          <label class="font-semibold block mb-1">Nama Gudang *</label>
          <input id="gudangNamaInp" class="ons-input" value="${S().esc(existing ? existing.nama_gudang : '')}" placeholder="Contoh: Gudang Utama, Gudang Depo"/>
        </div>
        <div>
          <label class="font-semibold block mb-1">Status</label>
          <select id="gudangStatusInp" class="ons-select">
            <option value="Aktif" ${!existing || existing.status === 'Aktif' ? 'selected' : ''}>Aktif</option>
            <option value="Nonaktif" ${existing && existing.status === 'Nonaktif' ? 'selected' : ''}>Nonaktif</option>
          </select>
        </div>
      </div>
      <div class="flex justify-end gap-2 pt-2 border-t" style="border-color:var(--ons-border)">
        <button type="button" onclick="ONSStore.closeModal()" class="ons-btn ons-btn-ghost text-xs">Batal</button>
        <button type="button" onclick="window.saveGudangFromModal('${S().esc(id || '')}')" class="ons-btn text-xs text-white" style="background:#0D9488">Simpan</button>
      </div>
    </div>`, '440px');
  };
  global.saveGudangFromModal = (id) => {
    const nama = ((document.getElementById('gudangNamaInp') || {}).value || '').trim();
    const status = ((document.getElementById('gudangStatusInp') || {}).value || 'Aktif').trim();
    if (!nama) return global.toast('Nama gudang wajib diisi!', 'warn');
    const list = _getMasterGudangList().slice();
    if (id) {
      const idx = list.findIndex((g) => g.id_gudang === id);
      if (idx >= 0) list[idx] = { ...list[idx], nama_gudang: nama, status };
    } else {
      const newId = 'GDG-' + String(list.length + 1).padStart(3, '0');
      list.push({ id_gudang: newId, nama_gudang: nama, status });
    }
    _writeLocalList(MASTER_GUDANG_KEY, list);
    S().AppState.masterGudang = list;
    S().closeModal();
    global.toast('Gudang berhasil disimpan', 'ok');
    global.renderActiveView();
  };
  global.deleteGudangConfirm = (id) => {
    const list = _getMasterGudangList();
    const item = list.find((g) => g.id_gudang === id);
    if (!item) return;
    _openDeleteConfirmModal({
      title: 'Hapus Gudang?',
      name: item.nama_gudang,
      id: item.id_gudang,
      entityLabel: 'Master Gudang',
      confirmFnName: 'window.confirmDeleteGudang'
    });
  };
  global.confirmDeleteGudang = (id) => {
    const list = _getMasterGudangList().filter((g) => g.id_gudang !== id);
    _writeLocalList(MASTER_GUDANG_KEY, list);
    S().AppState.masterGudang = list;
    S().closeModal();
    global.toast('Gudang berhasil dihapus', 'ok');
    global.renderActiveView();
  };
  global.exportMasterGudangExcel = () => {
    const list = _getMasterGudangList();
    const dateTag = new Date().toISOString().slice(0, 10);
    const headers = [
      { key: 'no', label: 'No.', type: 'int', width: 6 },
      { key: 'nama_gudang', label: 'Nama Gudang', width: 28 },
      { key: 'status', label: 'Status', width: 14 }
    ];
    const rows = list.map((g, i) => ({ no: i + 1, nama_gudang: g.nama_gudang, status: g.status || 'Aktif' }));
    return S().exportDataset('xlsx', 'Daftar Gudang', 'Master_Gudang_ONS_' + dateTag, headers, rows, { sheetName: 'Gudang' });
  };

  global.setKatPelangganSearch = (v) => { mdKatPelangganSearchQ = v || ''; global.renderActiveView(); };
  global.openAddKatPelangganModal = (id) => {
    const list = _getMasterKatPelangganList();
    const existing = list.find((kp) => kp.id_kat_pelanggan === id);
    S().openModal(`<div class="p-6 space-y-4 text-xs">
      <div class="flex justify-between items-center pb-2 border-b" style="border-color:var(--ons-border)">
        <h3 class="font-bold text-base text-slate-800 dark:text-slate-100">${existing ? 'Edit Kategori Pelanggan' : 'Tambah Kategori Pelanggan'}</h3>
        <button type="button" onclick="ONSStore.closeModal()" class="text-xl">&times;</button>
      </div>
      <div class="space-y-3">
        <div>
          <label class="font-semibold block mb-1">Nama Kategori *</label>
          <input id="katPelangganNamaInp" class="ons-input" value="${S().esc(existing ? existing.nama_kategori : '')}" placeholder="Contoh: Umum / Reguler, Member VIP"/>
        </div>
        <div>
          <label class="font-semibold block mb-1">Kode *</label>
          <input id="katPelangganKodeInp" class="ons-input uppercase font-mono-num" value="${S().esc(existing ? existing.kode : '')}" placeholder="REG / VIP / RUTIN"/>
        </div>
        <div>
          <label class="font-semibold block mb-1">Status</label>
          <select id="katPelangganStatusInp" class="ons-select">
            <option value="Aktif" ${!existing || existing.status === 'Aktif' ? 'selected' : ''}>Aktif</option>
            <option value="Nonaktif" ${existing && existing.status === 'Nonaktif' ? 'selected' : ''}>Nonaktif</option>
          </select>
        </div>
      </div>
      <div class="flex justify-end gap-2 pt-2 border-t" style="border-color:var(--ons-border)">
        <button type="button" onclick="ONSStore.closeModal()" class="ons-btn ons-btn-ghost text-xs">Batal</button>
        <button type="button" onclick="window.saveKatPelangganFromModal('${S().esc(id || '')}')" class="ons-btn text-xs text-white" style="background:#0D9488">Simpan</button>
      </div>
    </div>`, '440px');
  };
  global.saveKatPelangganFromModal = (id) => {
    const nama = ((document.getElementById('katPelangganNamaInp') || {}).value || '').trim();
    const kode = (((document.getElementById('katPelangganKodeInp') || {}).value || '').trim() || 'REG').toUpperCase();
    const status = ((document.getElementById('katPelangganStatusInp') || {}).value || 'Aktif').trim();
    if (!nama) return global.toast('Nama kategori pelanggan wajib diisi!', 'warn');
    const list = _getMasterKatPelangganList().slice();
    if (id) {
      const idx = list.findIndex((kp) => kp.id_kat_pelanggan === id);
      if (idx >= 0) list[idx] = { ...list[idx], nama_kategori: nama, kode, status };
    } else {
      const newId = 'KPEL-' + String(list.length + 1).padStart(3, '0');
      list.push({ id_kat_pelanggan: newId, nama_kategori: nama, kode, status });
    }
    _writeLocalList(MASTER_KAT_PELANGGAN_KEY, list);
    S().AppState.masterKategoriPelanggan = list;
    S().closeModal();
    global.toast('Kategori pelanggan berhasil disimpan', 'ok');
    global.renderActiveView();
  };
  global.deleteKatPelangganConfirm = (id) => {
    const list = _getMasterKatPelangganList();
    const item = list.find((kp) => kp.id_kat_pelanggan === id);
    if (!item) return;
    _openDeleteConfirmModal({
      title: 'Hapus Kategori Pelanggan?',
      name: item.nama_kategori,
      id: item.id_kat_pelanggan,
      entityLabel: 'Master Kategori Pelanggan',
      confirmFnName: 'window.confirmDeleteKatPelanggan'
    });
  };
  global.confirmDeleteKatPelanggan = (id) => {
    const list = _getMasterKatPelangganList().filter((kp) => kp.id_kat_pelanggan !== id);
    _writeLocalList(MASTER_KAT_PELANGGAN_KEY, list);
    S().AppState.masterKategoriPelanggan = list;
    S().closeModal();
    global.toast('Kategori pelanggan berhasil dihapus', 'ok');
    global.renderActiveView();
  };
  global.exportMasterKatPelangganExcel = () => {
    const list = _getMasterKatPelangganList();
    const dateTag = new Date().toISOString().slice(0, 10);
    const headers = [
      { key: 'no', label: 'No.', type: 'int', width: 6 },
      { key: 'nama_kategori', label: 'Nama Kategori', width: 28 },
      { key: 'kode', label: 'Kode', width: 14 },
      { key: 'status', label: 'Status', width: 14 }
    ];
    const rows = list.map((kp, i) => ({ no: i + 1, nama_kategori: kp.nama_kategori, kode: kp.kode, status: kp.status || 'Aktif' }));
    return S().exportDataset('xlsx', 'Daftar Kategori Pelanggan', 'Master_Kategori_Pelanggan_ONS_' + dateTag, headers, rows, { sheetName: 'KategoriPelanggan' });
  };

  global.setPajakSearch = (v) => { mdPajakSearchQ = v || ''; global.renderActiveView(); };
  global.openAddPajakModal = (id) => {
    const list = _getMasterPajakList();
    const existing = list.find((p) => p.id_pajak === id);
    S().openModal(`<div class="p-6 space-y-4 text-xs">
      <div class="flex justify-between items-center pb-2 border-b" style="border-color:var(--ons-border)">
        <h3 class="font-bold text-base text-slate-800 dark:text-slate-100">${existing ? 'Edit Pajak' : 'Tambah Pajak'}</h3>
        <button type="button" onclick="ONSStore.closeModal()" class="text-xl">&times;</button>
      </div>
      <div class="space-y-3">
        <div>
          <label class="font-semibold block mb-1">Nama Pajak *</label>
          <input id="pajakNamaInp" class="ons-input" value="${S().esc(existing ? existing.nama_pajak : '')}" placeholder="Contoh: PPN 11%, Pajak Ekspor"/>
        </div>
        <div>
          <label class="font-semibold block mb-1">Nilai Pajak (%) *</label>
          <input id="pajakNilaiInp" type="number" step="0.1" min="0" max="100" class="ons-input font-mono-num" value="${existing ? Number(existing.nilai_pajak || 0) : 11}"/>
        </div>
      </div>
      <div class="flex justify-end gap-2 pt-2 border-t" style="border-color:var(--ons-border)">
        <button type="button" onclick="ONSStore.closeModal()" class="ons-btn ons-btn-ghost text-xs">Batal</button>
        <button type="button" onclick="window.savePajakFromModal('${S().esc(id || '')}')" class="ons-btn text-xs text-white" style="background:#0D9488">Simpan</button>
      </div>
    </div>`, '440px');
  };
  global.savePajakFromModal = (id) => {
    const nama = ((document.getElementById('pajakNamaInp') || {}).value || '').trim();
    const nilai = Number((document.getElementById('pajakNilaiInp') || {}).value || 0);
    if (!nama) return global.toast('Nama pajak wajib diisi!', 'warn');
    const list = _getMasterPajakList().slice();
    if (id) {
      const idx = list.findIndex((p) => p.id_pajak === id);
      if (idx >= 0) list[idx] = { ...list[idx], nama_pajak: nama, nilai_pajak: nilai };
    } else {
      const newId = 'TAX-' + String(list.length + 1).padStart(3, '0');
      list.push({ id_pajak: newId, nama_pajak: nama, nilai_pajak: nilai });
    }
    _writeLocalList(MASTER_PAJAK_KEY, list);
    S().AppState.masterPajak = list;
    S().closeModal();
    global.toast('Pajak berhasil disimpan', 'ok');
    global.renderActiveView();
  };
  global.deletePajakConfirm = (id) => {
    const list = _getMasterPajakList();
    const item = list.find((p) => p.id_pajak === id);
    if (!item) return;
    _openDeleteConfirmModal({
      title: 'Hapus Pajak?',
      name: item.nama_pajak,
      id: item.id_pajak,
      entityLabel: 'Master Pajak',
      confirmFnName: 'window.confirmDeletePajak'
    });
  };
  global.confirmDeletePajak = (id) => {
    const list = _getMasterPajakList().filter((p) => p.id_pajak !== id);
    _writeLocalList(MASTER_PAJAK_KEY, list);
    S().AppState.masterPajak = list;
    S().closeModal();
    global.toast('Pajak berhasil dihapus', 'ok');
    global.renderActiveView();
  };
  global.exportMasterPajakExcel = () => {
    const list = _getMasterPajakList();
    const dateTag = new Date().toISOString().slice(0, 10);
    const headers = [
      { key: 'no', label: 'No.', type: 'int', width: 6 },
      { key: 'nama_pajak', label: 'Nama Pajak', width: 28 },
      { key: 'nilai_pajak', label: 'Nilai Pajak (%)', type: 'int', width: 16 }
    ];
    const rows = list.map((p, i) => ({ no: i + 1, nama_pajak: p.nama_pajak, nilai_pajak: Number(p.nilai_pajak || 0) }));
    return S().exportDataset('xlsx', 'Master Pajak', 'Master_Pajak_ONS_' + dateTag, headers, rows, { sheetName: 'Pajak' });
  };
  global.setMasterSupplierSearch = (v) => {
    supplierSearchQ = v || '';
    _patchMasterResults(_renderMasterSupplierResultsHtml, supplierSearchQ, 'mdSupplierClearBtn');
  };
  global.clearMasterSupplierSearch = () => {
    supplierSearchQ = '';
    const inp = typeof document !== 'undefined' ? document.getElementById('mdSupplierSearchInp') : null;
    if (inp) { inp.value = ''; inp.focus(); }
    _patchMasterResults(_renderMasterSupplierResultsHtml, '', 'mdSupplierClearBtn');
  };
  global.setMasterSupplierStatus = (v) => { supplierStatusFilter = v || 'SEMUA'; global.renderActiveView(); };
  global.resetMasterSupplierFilter = () => { supplierSearchQ = ''; supplierStatusFilter = 'SEMUA'; global.renderActiveView(); };
  global.deleteMasterSupplier = (idPbf) => {
    const target = (S().AppState.supplierPbf || []).find((p) => p.id_pbf === idPbf);
    if (!target) return;
    _openDeleteConfirmModal({
      title: 'Hapus Supplier PBF?',
      name: target.nama_pbf,
      id: target.id_pbf,
      entityLabel: 'Master Supplier',
      confirmFnName: 'window.confirmDeleteMasterSupplier'
    });
  };
  global.confirmDeleteMasterSupplier = async (idPbf) => {
    try {
      await API().callApi('pbf.delete', { id_pbf: idPbf }, { isWrite: true });
      S().closeModal();
      global.toast('Supplier PBF dihapus dari Master Data.', 'ok');
      await global.bootLoadState(true);
    } catch (e) { global.toast(e.message, 'err'); }
  };

  global.setMasterPelangganSearch = (v) => {
    pelangganSearchQ = v || '';
    _patchMasterResults(_renderMasterPelangganResultsHtml, pelangganSearchQ, 'mdPelangganClearBtn');
  };
  global.clearMasterPelangganSearch = () => {
    pelangganSearchQ = '';
    const inp = typeof document !== 'undefined' ? document.getElementById('mdPelangganSearchInp') : null;
    if (inp) { inp.value = ''; inp.focus(); }
    _patchMasterResults(_renderMasterPelangganResultsHtml, '', 'mdPelangganClearBtn');
  };
  global.setMasterPelangganProg = (v) => { pelangganProgFilter = v || 'SEMUA'; global.renderActiveView(); };
  global.resetMasterPelangganFilter = () => { pelangganSearchQ = ''; pelangganProgFilter = 'SEMUA'; global.renderActiveView(); };

  global.setMasterDokterSearch = (v) => {
    dokterSearchQ = v || '';
    _patchMasterResults(_renderMasterDokterResultsHtml, dokterSearchQ, 'mdDokterClearBtn');
  };
  global.clearMasterDokterSearch = () => {
    dokterSearchQ = '';
    const inp = typeof document !== 'undefined' ? document.getElementById('mdDokterSearchInp') : null;
    if (inp) { inp.value = ''; inp.focus(); }
    _patchMasterResults(_renderMasterDokterResultsHtml, '', 'mdDokterClearBtn');
  };
  global.setMasterDokterStatus = (v) => { dokterStatusFilter = v || 'SEMUA'; global.renderActiveView(); };
  global.resetMasterDokterFilter = () => { dokterSearchQ = ''; dokterStatusFilter = 'SEMUA'; global.renderActiveView(); };

  global.setMasterSalesSearch = (v) => {
    salesSearchQ = v || '';
    _patchMasterResults(_renderMasterSalesResultsHtml, salesSearchQ, 'mdSalesClearBtn');
  };
  global.clearMasterSalesSearch = () => {
    salesSearchQ = '';
    const inp = typeof document !== 'undefined' ? document.getElementById('mdSalesSearchInp') : null;
    if (inp) { inp.value = ''; inp.focus(); }
    _patchMasterResults(_renderMasterSalesResultsHtml, '', 'mdSalesClearBtn');
  };

  global.openMasterSalesModal = (idSales) => {
    const existing = idSales ? _getSalesStaffList().find((x) => x.id_sales === idSales) : null;
    S().openModal(`<div class="p-6 space-y-4 text-xs">
      <div class="flex justify-between items-center pb-2 border-b" style="border-color:var(--ons-border)">
        <h3 class="font-bold text-base">${existing ? ('Edit Sales/Pelayan: ' + S().esc(existing.nama_sales)) : 'Tambah Sales'}</h3>
        <button type="button" onclick="ONSStore.closeModal()" class="text-xl">&times;</button>
      </div>
      <div class="space-y-3">
        <div><label class="font-semibold block mb-1">Nama Sales *</label><input id="mdSalesNama" class="ons-input" value="${S().esc(existing ? existing.nama_sales : '')}" placeholder="Nama petugas kasir / pelayan / sales"/></div>
        <div><label class="font-semibold block mb-1">Kode Sales</label><input id="mdSalesKode" class="ons-input font-mono-num" value="${S().esc(existing ? (existing.kode_sales || '') : '')}" placeholder="Kosongkan untuk otomatis"/></div>
        <div><label class="font-semibold block mb-1">No. Telepon</label><input id="mdSalesHp" class="ons-input font-mono-num" value="${S().esc(existing ? (existing.no_hp || '') : '')}" placeholder="contoh: 021-2345xxx atau 081234567xxx"/></div>
      </div>
      <div class="flex justify-end gap-2 pt-2">
        <button type="button" onclick="ONSStore.closeModal()" class="ons-btn ons-btn-ghost text-xs">Batal</button>
        <button type="button" onclick="window.submitMasterSales('${S().esc(idSales || '')}')" class="ons-btn ons-btn-emerald text-xs">Simpan</button>
      </div>
    </div>`, '460px');
  };

  global.submitMasterSales = (idSales) => {
    const nama = ((document.getElementById('mdSalesNama') || {}).value || '').trim();
    if (!nama) return global.toast('Nama Sales wajib diisi!', 'warn');
    const rawKode = ((document.getElementById('mdSalesKode') || {}).value || '').trim();
    const noHp = ((document.getElementById('mdSalesHp') || {}).value || '').trim();
    const list = _getSalesStaffList().slice();
    const nextNum = list.length + 1;
    const kode = rawKode || ('SLS-' + String(nextNum).padStart(3, '0'));
    if (idSales) {
      const idx = list.findIndex((x) => x.id_sales === idSales);
      if (idx >= 0) {
        list[idx] = Object.assign({}, list[idx], { nama_sales: nama, kode_sales: kode, no_hp: noHp, updated_at: new Date().toISOString() });
      }
    } else {
      list.push({
        id_sales: 'SLS-' + Date.now().toString(36).toUpperCase(),
        nama_sales: nama,
        kode_sales: kode,
        no_hp: noHp,
        created_at: new Date().toISOString()
      });
    }
    _saveSalesStaffList(list);
    S().closeModal();
    global.toast('Data Sales/Pelayan berhasil disimpan & tersinkron ke Kasir POS!', 'ok');
    global.renderActiveView();
  };

  global.deleteMasterSales = (idSales) => {
    const target = _getSalesStaffList().find((x) => x.id_sales === idSales);
    if (!target) return;
    _openDeleteConfirmModal({
      title: 'Hapus Sales/Pelayan?',
      name: target.nama_sales,
      id: target.id_sales,
      entityLabel: 'Master Sales/Pelayan',
      confirmFnName: 'window.confirmDeleteMasterSales'
    });
  };

  global.confirmDeleteMasterSales = (idSales) => {
    const list = _getSalesStaffList().filter((x) => x.id_sales !== idSales);
    _saveSalesStaffList(list);
    S().closeModal();
    global.toast('Data Sales/Pelayan dihapus.', 'ok');
    global.renderActiveView();
  };

  const _ID_PROVINCES = ['Aceh','Sumatera Utara','Sumatera Barat','Riau','Kepulauan Riau','Jambi','Sumatera Selatan','Bangka Belitung','Bengkulu','Lampung','DKI Jakarta','Jawa Barat','Banten','Jawa Tengah','DI Yogyakarta','Jawa Timur','Bali','Nusa Tenggara Barat','Nusa Tenggara Timur','Kalimantan Barat','Kalimantan Tengah','Kalimantan Selatan','Kalimantan Timur','Kalimantan Utara','Sulawesi Utara','Gorontalo','Sulawesi Tengah','Sulawesi Barat','Sulawesi Selatan','Sulawesi Tenggara','Maluku','Maluku Utara','Papua','Papua Barat','Papua Selatan','Papua Tengah','Papua Pegunungan','Papua Barat Daya'];

  global.openMasterPelangganModal = (idMember) => {
    const existing = idMember ? (S().AppState.members || []).find((m) => m.id_member === idMember) : null;
    const ex = existing ? _getExtraRecord(PELANGGAN_EXTRA_KEY, existing.id_member, existing.nama_pasien) : {};
    const prog = existing ? _normMemberProg(existing) : 'UMUM';
    S().openModal(`<div class="p-6 space-y-3 text-xs">
      <div class="flex justify-between items-center pb-2 border-b" style="border-color:var(--ons-border)">
        <h3 class="font-bold text-base">${existing ? ('Edit Pelanggan: ' + S().esc(existing.nama_pasien)) : 'Tambah Pelanggan'}</h3>
        <button type="button" onclick="ONSStore.closeModal()" class="text-xl">&times;</button>
      </div>
      <div class="max-h-[68vh] overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div class="sm:col-span-2"><label class="font-semibold block mb-1">Member ID khusus member grup apotek</label><input id="mdPelCardId" class="ons-input font-mono-num" value="${S().esc(ex.member_id || '')}" placeholder="gunakan member ID pada kartu member"/></div>
        <div><label class="font-semibold block mb-1">Nama Pelanggan *</label><input id="mdPelNama" class="ons-input" value="${S().esc(existing ? existing.nama_pasien : '')}" placeholder="Cth: Tn. Ahmad Fauzi"/></div>
        <div><label class="font-semibold block mb-1">No. Telepon / WhatsApp</label><input id="mdPelHp" class="ons-input font-mono-num" value="${S().esc(existing ? (existing.no_hp || '') : '628')}" placeholder="contoh: 021-2345xxx atau 081234567xxx"/></div>
        <div><label class="font-semibold block mb-1">No. Rekam Medis</label><input id="mdPelNoRm" class="ons-input font-mono-num" value="${S().esc(ex.no_rm || '')}" placeholder="Kosongkan untuk Otomatis"/></div>
        <div><label class="font-semibold block mb-1">Kode Pelanggan</label><input id="mdPelKode" class="ons-input font-mono-num" value="${S().esc(ex.kode_pelanggan || '')}" placeholder="Kosongkan untuk Otomatis"/></div>
        <div><label class="font-semibold block mb-1">E-mail</label><input id="mdPelEmail" type="email" class="ons-input" value="${S().esc(ex.email || '')}" placeholder="pelanggan@email.com"/></div>
        <div><label class="font-semibold block mb-1">Nomor Induk Kependudukan (NIK)</label><input id="mdPelNik" class="ons-input font-mono-num" value="${S().esc(ex.nik || '')}" placeholder="16 digit NIK KTP"/></div>
        <div><label class="font-semibold block mb-1">Tempat Lahir</label><input id="mdPelTempatLahir" class="ons-input" value="${S().esc(ex.tempat_lahir || '')}" placeholder="Kota kelahiran"/></div>
        <div><label class="font-semibold block mb-1">Tanggal Lahir</label><input id="mdPelLahir" type="date" class="ons-input font-mono-num" value="${S().esc(existing && existing.tgl_lahir ? String(existing.tgl_lahir).slice(0, 10) : '')}"/></div>
        <div><label class="font-semibold block mb-1">Provinsi</label>
          <select id="mdPelProvinsi" class="ons-select">
            <option value="">Pilih Provinsi</option>
            ${_ID_PROVINCES.map((pv) => `<option value="${S().esc(pv)}" ${ex.provinsi === pv ? 'selected' : ''}>${S().esc(pv)}</option>`).join('')}
          </select>
        </div>
        <div><label class="font-semibold block mb-1">Jenis Kelamin</label>
          <select id="mdPelGender" class="ons-select">
            <option value="">Pilih jenis kelamin</option>
            <option value="L" ${ex.gender === 'L' ? 'selected' : ''}>Laki-laki</option>
            <option value="P" ${ex.gender === 'P' ? 'selected' : ''}>Perempuan</option>
          </select>
        </div>
        <div class="sm:col-span-2"><label class="font-semibold block mb-1">Alamat</label><input id="mdPelAlamat" class="ons-input" value="${S().esc(ex.alamat || '')}" placeholder="Alamat domisili pelanggan"/></div>
        <div><label class="font-semibold block mb-1">Pekerjaan</label><input id="mdPelPekerjaan" class="ons-input" value="${S().esc(ex.pekerjaan || '')}" placeholder="Wiraswasta / ASN / Pelajar"/></div>
        <div><label class="font-semibold block mb-1">Asal Instansi</label><input id="mdPelInstansi" class="ons-input" value="${S().esc(ex.instansi || '')}" placeholder="Perusahaan / Sekolah / Klinik"/></div>
        <div><label class="font-semibold block mb-1">Segmen Pelanggan</label>
          <select id="mdPelProg" class="ons-select">
            <option value="UMUM" ${prog === 'UMUM' ? 'selected' : ''}>UMUM (Reguler)</option>
            <option value="MEMBER_RUTIN" ${prog === 'MEMBER_RUTIN' ? 'selected' : ''}>MEMBER_RUTIN (Terapi Rutin / Kronis)</option>
            <option value="MITRA_KLINIK" ${prog === 'MITRA_KLINIK' ? 'selected' : ''}>MITRA_KLINIK / Faskes</option>
          </select>
        </div>
        <div><label class="font-semibold block mb-1">Kategori Harga Alternatif</label>
          <select id="mdPelKatHarga" class="ons-select">
            ${['Tidak Terkategori', 'Reguler', 'Member Khusus', 'Reseller / Grosir', 'Karyawan / Faskes'].map((kh) => `<option value="${kh}" ${(ex.kategori_harga || 'Tidak Terkategori') === kh ? 'selected' : ''}>${kh}</option>`).join('')}
          </select>
        </div>
        <div><label class="font-semibold block mb-1">Batas Maksimal Total Piutang (Rp)</label><input id="mdPelMaxPiutang" type="number" min="0" class="ons-input font-mono-num" value="${Number(ex.max_piutang || 0)}"/></div>
        <div><label class="font-semibold block mb-1">Poin Loyalitas</label><input id="mdPelPoin" type="number" min="0" class="ons-input font-mono-num" value="${existing ? Number(existing.poin_loyalitas || 0) : 0}"/></div>
        <div class="sm:col-span-2 flex items-center gap-2 pt-1">
          <input id="mdPelMitraChk" type="checkbox" ${ex.is_mitra ? 'checked' : ''} class="w-4 h-4"/>
          <label for="mdPelMitraChk" class="font-semibold cursor-pointer">Pelanggan ini adalah mitra apotek / institusi</label>
        </div>
        <div><label class="font-semibold block mb-1">Asuransi</label><input id="mdPelAsuransi" class="ons-input" value="${S().esc(ex.asuransi || '')}" placeholder="BPJS Kesehatan / Prudential / -"/></div>
        <div><label class="font-semibold block mb-1">Nomor Asuransi</label><input id="mdPelNoAsuransi" class="ons-input font-mono-num" value="${S().esc(ex.no_asuransi || '')}" placeholder="No. kartu asuransi"/></div>
        <div class="sm:col-span-2"><label class="font-semibold block mb-1">Riwayat Alergi Obat</label><input id="mdPelAlergi" class="ons-input" value="${S().esc(existing ? (existing.alergi_list || 'Tidak Ada') : 'Tidak Ada')}" placeholder="Tidak Ada / Penisilin / Sulfa"/></div>
        <div class="sm:col-span-2"><label class="font-semibold block mb-1">Riwayat Penyakit / Catatan Klinis</label><input id="mdPelPenyakit" class="ons-input" value="${S().esc(existing ? (existing.penyakit_kronis || '-') : '-')}" placeholder="Cth: Hipertensi, Diabetes Tipe 2, atau -"/></div>
        <div class="sm:col-span-2"><label class="font-semibold block mb-1">Catatan</label><input id="mdPelCatatan" class="ons-input" value="${S().esc(ex.catatan || '')}" placeholder="Catatan pelayanan atau preferensi pelanggan"/></div>
      </div>
      <div class="flex justify-end gap-2 pt-2 border-t" style="border-color:var(--ons-border)">
        <button type="button" onclick="ONSStore.closeModal()" class="ons-btn ons-btn-ghost text-xs">Batal</button>
        <button type="button" onclick="window.submitMasterPelanggan('${S().esc(idMember || '')}')" class="ons-btn ons-btn-emerald text-xs">Simpan Data Pelanggan</button>
      </div>
    </div>`, '640px');
  };

  global.submitMasterPelanggan = async (idMember) => {
    try {
      const nama = ((document.getElementById('mdPelNama') || {}).value || '').trim();
      if (!nama) throw new Error('Nama pelanggan wajib diisi!');
      const rawRm = ((document.getElementById('mdPelNoRm') || {}).value || '').trim();
      const rawKode = ((document.getElementById('mdPelKode') || {}).value || '').trim();
      const autoSeed = String(Date.now()).slice(-6);
      const extraRec = {
        member_id: ((document.getElementById('mdPelCardId') || {}).value || '').trim(),
        no_rm: rawRm || ('RM-' + autoSeed),
        kode_pelanggan: rawKode || ('PLG-' + autoSeed),
        email: ((document.getElementById('mdPelEmail') || {}).value || '').trim(),
        nik: ((document.getElementById('mdPelNik') || {}).value || '').trim(),
        tempat_lahir: ((document.getElementById('mdPelTempatLahir') || {}).value || '').trim(),
        provinsi: ((document.getElementById('mdPelProvinsi') || {}).value || ''),
        alamat: ((document.getElementById('mdPelAlamat') || {}).value || '').trim(),
        gender: ((document.getElementById('mdPelGender') || {}).value || ''),
        pekerjaan: ((document.getElementById('mdPelPekerjaan') || {}).value || '').trim(),
        instansi: ((document.getElementById('mdPelInstansi') || {}).value || '').trim(),
        kategori_harga: ((document.getElementById('mdPelKatHarga') || {}).value || 'Tidak Terkategori'),
        max_piutang: Math.max(0, Number((document.getElementById('mdPelMaxPiutang') || {}).value || 0)),
        is_mitra: Boolean((document.getElementById('mdPelMitraChk') || {}).checked),
        asuransi: ((document.getElementById('mdPelAsuransi') || {}).value || '').trim(),
        no_asuransi: ((document.getElementById('mdPelNoAsuransi') || {}).value || '').trim(),
        catatan: ((document.getElementById('mdPelCatatan') || {}).value || '').trim()
      };
      _saveExtraRecord(PELANGGAN_EXTRA_KEY, idMember, nama, extraRec);

      await API().callApi('member.save', {
        id_member: idMember || '',
        nama_pasien: nama,
        no_hp: ((document.getElementById('mdPelHp') || {}).value || '').trim(),
        program_prb: ((document.getElementById('mdPelProg') || {}).value || 'UMUM'),
        tgl_lahir: ((document.getElementById('mdPelLahir') || {}).value || '').trim(),
        alergi_list: ((document.getElementById('mdPelAlergi') || {}).value || '').trim() || 'Tidak Ada',
        penyakit_kronis: ((document.getElementById('mdPelPenyakit') || {}).value || '').trim() || '-',
        poin_loyalitas: Math.max(0, Number((document.getElementById('mdPelPoin') || {}).value || 0))
      }, { isWrite: true });
      S().closeModal();
      global.toast('Data pelanggan berhasil disimpan!', 'ok');
      await global.bootLoadState(true);
    } catch (e) { global.toast(e.message, 'err'); }
  };

  global.deleteMasterPelanggan = (idMember) => {
    const target = (S().AppState.members || []).find((m) => m.id_member === idMember);
    if (!target) return;
    _openDeleteConfirmModal({
      title: 'Hapus Data Pelanggan?',
      name: target.nama_pasien,
      id: target.id_member,
      entityLabel: 'Master Pelanggan',
      confirmFnName: 'window.confirmDeleteMasterPelanggan'
    });
  };

  global.confirmDeleteMasterPelanggan = async (idMember) => {
    try {
      await API().callApi('member.delete', { id_member: idMember }, { isWrite: true });
      S().closeModal();
      global.toast('Pelanggan dihapus dari Master Data.', 'ok');
      await global.bootLoadState(true);
    } catch (e) { global.toast(e.message, 'err'); }
  };

  global.openMasterDokterModal = (idDokter) => {
    const existing = idDokter ? (S().AppState.masterDokter || []).find((d) => d.id_dokter === idDokter) : null;
    const exDok = existing ? _getExtraRecord(DOKTER_EXTRA_KEY, existing.id_dokter, existing.nama_dokter) : {};
    const status = String((existing && existing.status_dokter) || 'AKTIF').toUpperCase();
    S().openModal(`<div class="p-6 space-y-3 text-xs">
      <div class="flex justify-between items-center pb-2 border-b" style="border-color:var(--ons-border)">
        <h3 class="font-bold text-base">${existing ? ('Edit Dokter: ' + S().esc(existing.nama_dokter)) : 'Tambah Dokter'}</h3>
        <button type="button" onclick="ONSStore.closeModal()" class="text-xl">&times;</button>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><label class="font-semibold block mb-1">Nama Dokter &amp; Gelar *</label><input id="mdDokNama" class="ons-input" value="${S().esc(existing ? existing.nama_dokter : '')}" placeholder="Cth: dr. Siti Aminah, Sp.PD"/></div>
        <div><label class="font-semibold block mb-1">Spesialisasi / Poli</label><input id="mdDokSpec" class="ons-input" value="${S().esc(existing ? (existing.spesialisasi || 'Dokter Umum') : 'Dokter Umum')}" placeholder="Dokter Umum / Sp.PD / Sp.A"/></div>
        <div><label class="font-semibold block mb-1">Nomor SIP (Surat Izin Praktek)</label><input id="mdDokSip" class="ons-input font-mono-num" value="${S().esc(existing ? (existing.no_sip || '') : '')}" placeholder="446/xxx/SIP-DOK/2026"/></div>
        <div><label class="font-semibold block mb-1">Nomor STR</label><input id="mdDokStr" class="ons-input font-mono-num" value="${S().esc(existing ? (existing.no_str || '') : '')}" placeholder="3111xxxxxxxxxxxx"/></div>
        <div><label class="font-semibold block mb-1">Nomor KTP (Untuk Integrasi SatuSehat)</label><input id="mdDokNik" class="ons-input font-mono-num" value="${S().esc(exDok.nik_satusehat || '')}" placeholder="16 digit NIK KTP Dokter"/></div>
        <div><label class="font-semibold block mb-1">Klinik / RS Mitra</label><input id="mdDokFaskes" class="ons-input" value="${S().esc(existing ? (existing.faskes_klinik || '') : '')}" placeholder="Nama Klinik / RS / Praktek"/></div>
        <div><label class="font-semibold block mb-1">No. Telepon / WhatsApp</label><input id="mdDokWa" class="ons-input font-mono-num" value="${S().esc(existing ? (existing.no_wa || '628') : '628')}" placeholder="62812xxxx"/></div>
        <div><label class="font-semibold block mb-1">E-mail</label><input id="mdDokEmail" class="ons-input" value="${S().esc(existing ? (existing.email || '') : '')}" placeholder="dokter@klinik.id"/></div>
        <div><label class="font-semibold block mb-1">Status Kemitraan</label>
          <select id="mdDokStatus" class="ons-select">
            <option value="AKTIF" ${status === 'AKTIF' ? 'selected' : ''}>AKTIF</option>
            <option value="NONAKTIF" ${status === 'NONAKTIF' ? 'selected' : ''}>NONAKTIF</option>
          </select>
        </div>
        <div><label class="font-semibold block mb-1">Alamat Praktek / Faskes</label><input id="mdDokAlamat" class="ons-input" value="${S().esc(existing ? (existing.alamat || '') : '')}" placeholder="Jl. ..."/></div>
        <div class="sm:col-span-2"><label class="font-semibold block mb-1">Catatan Kolaborasi Apotek</label><input id="mdDokCatatan" class="ons-input" value="${S().esc(existing ? (existing.catatan || '') : '')}" placeholder="Jadwal praktek / poli / info konfirmasi resep"/></div>
      </div>
      <div class="flex justify-end gap-2 pt-2">
        <button type="button" onclick="ONSStore.closeModal()" class="ons-btn ons-btn-ghost text-xs">Batal</button>
        <button type="button" onclick="window.submitMasterDokter('${S().esc(idDokter || '')}')" class="ons-btn ons-btn-emerald text-xs">Simpan Data Dokter</button>
      </div>
    </div>`, '620px');
  };

  global.submitMasterDokter = async (idDokter) => {
    try {
      const nama = ((document.getElementById('mdDokNama') || {}).value || '').trim();
      if (!nama) throw new Error('Nama dokter wajib diisi!');
      const nikSatuSehat = ((document.getElementById('mdDokNik') || {}).value || '').trim();
      _saveExtraRecord(DOKTER_EXTRA_KEY, idDokter, nama, { nik_satusehat: nikSatuSehat });
      await API().callApi('dokter.save', {
        id_dokter: idDokter || '',
        nama_dokter: nama,
        spesialisasi: ((document.getElementById('mdDokSpec') || {}).value || '').trim() || 'Dokter Umum',
        no_sip: ((document.getElementById('mdDokSip') || {}).value || '').trim() || '-',
        no_str: ((document.getElementById('mdDokStr') || {}).value || '').trim(),
        faskes_klinik: ((document.getElementById('mdDokFaskes') || {}).value || '').trim() || '-',
        no_wa: ((document.getElementById('mdDokWa') || {}).value || '').trim(),
        email: ((document.getElementById('mdDokEmail') || {}).value || '').trim(),
        status_dokter: ((document.getElementById('mdDokStatus') || {}).value || 'AKTIF'),
        alamat: ((document.getElementById('mdDokAlamat') || {}).value || '').trim(),
        catatan: ((document.getElementById('mdDokCatatan') || {}).value || '').trim()
      }, { isWrite: true });
      S().closeModal();
      global.toast('Data Dokter Mitra berhasil disimpan!', 'ok');
      await global.bootLoadState(true);
    } catch (e) { global.toast(e.message, 'err'); }
  };

  global.deleteMasterDokter = (idDokter) => {
    const target = (S().AppState.masterDokter || []).find((d) => d.id_dokter === idDokter);
    if (!target) return;
    _openDeleteConfirmModal({
      title: 'Hapus Data Dokter?',
      name: target.nama_dokter,
      id: target.id_dokter,
      entityLabel: 'Master Dokter',
      confirmFnName: 'window.confirmDeleteMasterDokter'
    });
  };

  global.confirmDeleteMasterDokter = async (idDokter) => {
    try {
      await API().callApi('dokter.delete', { id_dokter: idDokter }, { isWrite: true });
      S().closeModal();
      global.toast('Dokter dihapus dari Master Data.', 'ok');
      await global.bootLoadState(true);
    } catch (e) { global.toast(e.message, 'err'); }
  };

  global.exportMasterSupplier = (fmt) => {
    const { allPbf, filtered } = _getFilteredMasterSupplier();
    const hasFilteredRows = filtered.length > 0 && filtered.length < allPbf.length;
    const list = hasFilteredRows ? filtered : allPbf;
    if (!list.length) return global.toast('Belum ada data Supplier PBF untuk diexport.', 'warn');
    const dateTag = new Date().toISOString().slice(0, 10);
    const headers = [
      { key: 'id_pbf', label: 'ID PBF', width: 12 },
      { key: 'nama_pbf', label: 'Nama Supplier PBF', width: 30, wrap: true },
      { key: 'kode_cdob', label: 'No. Sertifikat CDOB', width: 20 },
      { key: 'npwp_pbf', label: 'NPWP', width: 22 },
      { key: 'kontak_wa', label: 'Kontak WA', width: 16 },
      { key: 'email_pbf', label: 'Email Order', width: 24 },
      { key: 'lead_time_hari', label: 'Lead Time (Hari)', type: 'int', width: 14 },
      { key: 'termin_hari', label: 'TOP (Hari)', type: 'int', width: 12 },
      { key: 'min_order', label: 'Min. Order (Rp)', type: 'currency', width: 16 },
      { key: 'alamat', label: 'Alamat', width: 28, wrap: true },
      { key: 'skor_sla', label: 'SLA (%)', type: 'int', width: 10 },
      { key: 'status_pbf', label: 'Status', type: 'status', width: 12 }
    ];
    const rows = list.map((p) => {
      const ex = _getExtraRecord(SUPPLIER_EXTRA_KEY, p.id_pbf, p.nama_pbf);
      return {
        id_pbf: p.id_pbf || '-',
        nama_pbf: p.nama_pbf || '-',
        kode_cdob: p.kode_cdob || '-',
        npwp_pbf: p.npwp_pbf || '-',
        kontak_wa: p.kontak_wa || '-',
        email_pbf: p.email_pbf || '-',
        lead_time_hari: Number(p.lead_time_hari || 0),
        termin_hari: Number(p.termin_hari || 0),
        min_order: Number(ex.min_order || 0),
        alamat: ex.alamat || '-',
        skor_sla: Number(p.skor_sla || 0),
        status_pbf: p.status_pbf || 'AKTIF'
      };
    });
    return S().exportDataset(
      fmt || 'xlsx',
      'Direktori Master Supplier PBF CDOB' + (hasFilteredRows ? ' (Terfilter)' : ''),
      'Master_Supplier_PBF_ONS_' + dateTag,
      headers,
      rows,
      { sheetName: 'Master_Supplier', subtitle: 'Daftar distributor resmi CDOB, lead time & termin kredit (' + rows.length + ' PBF)' }
    );
  };

  global.exportMasterPelanggan = (fmt) => {
    const { allMbr, filtered } = _getFilteredMasterPelanggan();
    const hasFilteredRows = filtered.length > 0 && filtered.length < allMbr.length;
    const list = hasFilteredRows ? filtered : allMbr;
    if (!list.length) return global.toast('Belum ada data Pelanggan / Member untuk diexport.', 'warn');
    const dateTag = new Date().toISOString().slice(0, 10);
    const headers = [
      { key: 'id_member', label: 'ID Member', width: 14 },
      { key: 'no_rm', label: 'No. Rekam Medis', width: 16 },
      { key: 'kode_pelanggan', label: 'Kode Pelanggan', width: 16 },
      { key: 'nama_pasien', label: 'Nama Pelanggan / Pasien', width: 28, wrap: true },
      { key: 'no_hp', label: 'No. WhatsApp / HP', width: 16 },
      { key: 'email', label: 'Email', width: 22 },
      { key: 'alamat', label: 'Alamat', width: 28, wrap: true },
      { key: 'program_prb', label: 'Segmen', width: 15 },
      { key: 'tgl_lahir', label: 'Tanggal Lahir', type: 'date', width: 14 },
      { key: 'alergi_list', label: 'Riwayat Alergi', width: 22, wrap: true },
      { key: 'penyakit_kronis', label: 'Riwayat Penyakit', width: 28, wrap: true },
      { key: 'poin_loyalitas', label: 'Poin', type: 'int', sum: true, width: 10 }
    ];
    const rows = list.map((m) => {
      const ex = _getExtraRecord(PELANGGAN_EXTRA_KEY, m.id_member, m.nama_pasien);
      return {
        id_member: m.id_member || '-',
        no_rm: ex.no_rm || '-',
        kode_pelanggan: ex.kode_pelanggan || '-',
        nama_pasien: m.nama_pasien || '-',
        no_hp: m.no_hp || '-',
        email: ex.email || '-',
        alamat: ex.alamat || '-',
        program_prb: _normMemberProg(m),
        tgl_lahir: m.tgl_lahir ? String(m.tgl_lahir).slice(0, 10) : '-',
        alergi_list: m.alergi_list || 'Tidak Ada',
        penyakit_kronis: m.penyakit_kronis || '-',
        poin_loyalitas: Number(m.poin_loyalitas || 0)
      };
    });
    return S().exportDataset(
      fmt || 'xlsx',
      'Direktori Master Pelanggan Apotek' + (hasFilteredRows ? ' (Terfilter)' : ''),
      'Master_Pelanggan_ONS_' + dateTag,
      headers,
      rows,
      { sheetName: 'Master_Pelanggan', subtitle: 'Data member, riwayat alergi obat, segmen & poin (' + rows.length + ' pelanggan)' }
    );
  };

  global.exportMasterDokter = (fmt) => {
    const { allDocs, filtered } = _getFilteredMasterDokter();
    const hasFilteredRows = filtered.length > 0 && filtered.length < allDocs.length;
    const list = hasFilteredRows ? filtered : allDocs;
    if (!list.length) return global.toast('Belum ada data Dokter Mitra untuk diexport.', 'warn');
    const dateTag = new Date().toISOString().slice(0, 10);
    const headers = [
      { key: 'id_dokter', label: 'ID Dokter', width: 12 },
      { key: 'nama_dokter', label: 'Nama Dokter', width: 28, wrap: true },
      { key: 'spesialisasi', label: 'Spesialisasi', width: 22 },
      { key: 'no_sip', label: 'No. SIP', width: 24 },
      { key: 'no_str', label: 'No. STR', width: 20 },
      { key: 'nik_satusehat', label: 'NIK SatuSehat', width: 20 },
      { key: 'faskes_klinik', label: 'Klinik / RS Mitra', width: 26, wrap: true },
      { key: 'no_wa', label: 'No. WhatsApp', width: 16 },
      { key: 'email', label: 'Email', width: 24 },
      { key: 'alamat', label: 'Alamat Praktek', width: 28, wrap: true },
      { key: 'status_dokter', label: 'Status', type: 'status', width: 12 }
    ];
    const rows = list.map((d) => {
      const exDok = _getExtraRecord(DOKTER_EXTRA_KEY, d.id_dokter, d.nama_dokter);
      return {
        id_dokter: d.id_dokter || '-',
        nama_dokter: d.nama_dokter || '-',
        spesialisasi: d.spesialisasi || 'Dokter Umum',
        no_sip: d.no_sip || '-',
        no_str: d.no_str || '-',
        nik_satusehat: exDok.nik_satusehat || '-',
        faskes_klinik: d.faskes_klinik || '-',
        no_wa: d.no_wa || '-',
        email: d.email || '-',
        alamat: d.alamat || '-',
        status_dokter: d.status_dokter || 'AKTIF'
      };
    });
    return S().exportDataset(
      fmt || 'xlsx',
      'Direktori Master Dokter Mitra & Penulis Resep' + (hasFilteredRows ? ' (Terfilter)' : ''),
      'Master_Dokter_Mitra_ONS_' + dateTag,
      headers,
      rows,
      { sheetName: 'Master_Dokter', subtitle: 'Daftar dokter penulis resep, No. SIP/STR & faskes mitra (' + rows.length + ' dokter)' }
    );
  };

  global.exportMasterSales = (fmt) => {
    const { allSales, filtered } = _getFilteredMasterSales();
    const list = filtered.length > 0 && filtered.length < allSales.length ? filtered : allSales;
    if (!list.length) return global.toast('Belum ada data Sales/Pelayan untuk diexport.', 'warn');
    const dateTag = new Date().toISOString().slice(0, 10);
    const headers = [
      { key: 'id_sales', label: 'ID Sales', width: 16 },
      { key: 'nama_sales', label: 'Nama Sales / Pelayan', width: 28, wrap: true },
      { key: 'kode_sales', label: 'Kode Sales', width: 16 },
      { key: 'no_hp', label: 'No. Telepon/HP', width: 18 }
    ];
    const rows = list.map((x) => ({
      id_sales: x.id_sales || '-',
      nama_sales: x.nama_sales || '-',
      kode_sales: x.kode_sales || '-',
      no_hp: x.no_hp || '-'
    }));
    return S().exportDataset(
      fmt || 'xlsx',
      'Direktori Sales / Pelayan Apotek',
      'Master_Sales_Pelayan_ONS_' + dateTag,
      headers,
      rows,
      { sheetName: 'Sales_Pelayan', subtitle: 'Daftar petugas pelayanan & sales apotek (' + rows.length + ' data)' }
    );
  };

  global.openKontakImportModal = (kind) => {
    const k = String(kind || 'pelanggan').toLowerCase();
    const cfg = k === 'supplier'
      ? { title: 'Import Data Supplier (CSV)', hint: 'Format per baris: Nama Supplier, No. Telepon, Email, Alamat, TOP (hari), Min. Order', sample: 'PT Kimia Farma Trading, 08123456789, order@kftd.co.id, Jl. Industri No. 1, 30, 500000' }
      : (k === 'dokter'
        ? { title: 'Import Data Dokter (CSV)', hint: 'Format per baris: Nama Dokter, Spesialisasi, No. SIP, NIK SatuSehat, Klinik/RS, No. WA', sample: 'dr. Budi Santoso Sp.PD, Penyakit Dalam, 446/012/SIP/2026, 3273010101800001, Klinik Sehat, 628123456789' }
        : { title: 'Import Data Pelanggan (CSV)', hint: 'Format per baris: Nama Pelanggan, No. Telepon, Segmen (UMUM/MEMBER_RUTIN/MITRA_KLINIK), Alamat, Alergi', sample: 'Tn. Bambang Wijaya, 08129876543, MEMBER_RUTIN, Jl. Merdeka No. 10, Penisilin' });
    S().openModal(`<div class="p-6 space-y-3 text-xs">
      <div class="flex justify-between items-center pb-2 border-b" style="border-color:var(--ons-border)">
        <h3 class="font-bold text-base">${cfg.title}</h3>
        <button type="button" onclick="ONSStore.closeModal()" class="text-xl">&times;</button>
      </div>
      <div class="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[11px]">
        <div class="font-bold text-blue-600 dark:text-blue-400">Petunjuk Import</div>
        <div class="mt-0.5" style="color:var(--ons-text-soft)">${cfg.hint}</div>
      </div>
      <div>
        <label class="font-semibold block mb-1">Tempel Data CSV (1 data per baris)</label>
        <textarea id="kontakImportTxt" rows="6" class="ons-input font-mono-num text-[11px]" placeholder="${S().esc(cfg.sample)}"></textarea>
      </div>
      <div class="flex justify-end gap-2">
        <button type="button" onclick="ONSStore.closeModal()" class="ons-btn ons-btn-ghost text-xs">Batal</button>
        <button type="button" onclick="window.submitKontakImport('${S().esc(k)}')" class="ons-btn ons-btn-emerald text-xs">Proses Import</button>
      </div>
    </div>`, '580px');
  };

  global.submitKontakImport = async (kind) => {
    const k = String(kind || 'pelanggan').toLowerCase();
    const raw = String((document.getElementById('kontakImportTxt') || {}).value || '').trim();
    if (!raw) return global.toast('Isi minimal 1 baris data CSV untuk diimport.', 'warn');
    const lines = raw.split(/\r?\n/).map((ln) => ln.trim()).filter(Boolean);
    let okCount = 0;
    try {
      for (let i = 0; i < lines.length; i += 1) {
        const cols = lines[i].split(',').map((c) => c.trim());
        const nama = cols[0];
        if (!nama) continue;
        if (k === 'supplier') {
          _saveExtraRecord(SUPPLIER_EXTRA_KEY, '', nama, { alamat: cols[3] || '', min_order: Math.max(0, Number(cols[5] || 0)) });
          await API().callApi('pbf.save', { id_pbf: '', nama_pbf: nama, kontak_wa: cols[1] || '', email_pbf: cols[2] || '', status_pbf: 'AKTIF', lead_time_hari: 2, termin_hari: Math.max(0, Number(cols[4] || 30)), skor_sla: 95 }, { isWrite: true });
        } else if (k === 'dokter') {
          _saveExtraRecord(DOKTER_EXTRA_KEY, '', nama, { nik_satusehat: cols[3] || '' });
          await API().callApi('dokter.save', { id_dokter: '', nama_dokter: nama, spesialisasi: cols[1] || 'Dokter Umum', no_sip: cols[2] || '-', faskes_klinik: cols[4] || '-', no_wa: cols[5] || '', status_dokter: 'AKTIF' }, { isWrite: true });
        } else {
          _saveExtraRecord(PELANGGAN_EXTRA_KEY, '', nama, { alamat: cols[3] || '', no_rm: 'RM-' + String(Date.now() + i).slice(-6), kode_pelanggan: 'PLG-' + String(Date.now() + i).slice(-6) });
          await API().callApi('member.save', { id_member: '', nama_pasien: nama, no_hp: cols[1] || '', program_prb: cols[2] || 'UMUM', alergi_list: cols[4] || 'Tidak Ada', penyakit_kronis: '-', poin_loyalitas: 0 }, { isWrite: true });
        }
        okCount += 1;
      }
      S().closeModal();
      global.toast(`Berhasil mengimport ${okCount} data ${k}!`, 'ok');
      await global.bootLoadState(true);
    } catch (e) { global.toast(e.message, 'err'); }
  };

  global.setMasterSearch = (v) => {
    masterSearchQ = v || '';
    _patchMasterResults(() => {
      const { allMeta, filtered } = _getFilteredMasterObatMeta();
      return _renderMasterObatResultsHtml(S().canSeeFinancialCost(), allMeta, filtered);
    }, masterSearchQ, 'mdObatClearBtn');
  };
  global.clearMasterObatSearch = () => {
    masterSearchQ = '';
    const inp = typeof document !== 'undefined' ? document.getElementById('mdObatSearchInp') : null;
    if (inp) { inp.value = ''; inp.focus(); }
    global.setMasterSearch('');
  };
  global.setMasterGol = (g) => { masterFilterGol = g; global.renderActiveView(); };
  global.setMasterStokFilter = (f) => { masterFilterStok = f || 'SEMUA'; global.renderActiveView(); };
  global.setMasterSediaan = (s) => { masterFilterSediaan = s || 'SEMUA'; global.renderActiveView(); };
  global.setMasterStatusJual = (st) => { masterFilterStatusJual = st || 'SEMUA'; global.renderActiveView(); };
  global.setMasterSort = (s) => { masterSortBy = s || 'NAMA'; global.renderActiveView(); };
  global.setMasterViewMode = (m) => { masterViewMode = m === 'CARD' ? 'CARD' : 'TABLE'; global.renderActiveView(); };
  global.resetMasterFilter = () => {
    masterFilterGol = '';
    masterFilterStok = 'SEMUA';
    masterFilterSediaan = 'SEMUA';
    masterFilterStatusJual = 'SEMUA';
    masterSearchQ = '';
    masterSortBy = 'NAMA';
    global.renderActiveView();
  };

  global.openObatKartuStok = (idObat) => {
    if (global.setMutasiFilterObat) global.setMutasiFilterObat(idObat);
    if (global.navigateView) global.navigateView('gudang', 'kartu-stok');
  };

  global.toggleObatStatusJual = (idObat) => {
    const o = (S().AppState.masterObat || []).find((x) => x.id_obat === idObat);
    if (!o) return;
    const isAktif = String(o.status_aktif || 'AKTIF').toUpperCase() !== 'NONAKTIF';
    o.status_aktif = isAktif ? 'NONAKTIF' : 'AKTIF';
    if (typeof S().saveState === 'function') S().saveState();
    if (typeof API === 'function' && API() && typeof API().callApi === 'function') {
      try { API().callApi('obat.save', o, { isWrite: true }); } catch (e) {}
    }
    if (typeof S().logAuditEvent === 'function') S().logAuditEvent('UBAH_STATUS_OBAT', `Ubah status produk ${o.nama_dagang} (${o.id_obat}) menjadi ${o.status_aktif}`);
    if (global.toast) global.toast(`Status ${o.nama_dagang}: ${o.status_aktif === 'AKTIF' ? 'Dijual' : 'Tidak Dijual'}`, 'ok');
    global.renderActiveView();
  };

  global.confirmDeleteObat = (idObat) => {
    const o = (S().AppState.masterObat || []).find((x) => x.id_obat === idObat);
    if (!o) return;
    const stok = S().getSellableStok(idObat);
    if (stok > 0) {
      if (global.toast) global.toast(`Produk masih memiliki stok aktif (${stok} ${o.satuan_dasar || 'unit'}). Kosongkan batch terlebih dahulu atau ubah status menjadi Nonaktif!`, 'warn');
      return;
    }
    _openDeleteConfirmModal({
      title: 'Hapus Master Produk Obat',
      name: o.nama_dagang,
      id: o.id_obat,
      entityLabel: 'katalog Master Obat',
      confirmFnName: 'window.deleteMasterObat'
    });
  };

  global.deleteMasterObat = (idObat) => {
    const st = S().AppState;
    const idx = (st.masterObat || []).findIndex((x) => x.id_obat === idObat);
    if (idx !== -1) {
      const removed = st.masterObat.splice(idx, 1)[0];
      if (typeof S().saveState === 'function') S().saveState();
      if (typeof API === 'function' && API() && typeof API().callApi === 'function') {
        try { API().callApi('obat.delete', { id_obat: idObat }, { isWrite: true }); } catch (e) {}
      }
      if (typeof S().logAuditEvent === 'function') S().logAuditEvent('HAPUS_OBAT', `Hapus produk ${removed.nama_dagang} (${removed.id_obat})`);
      if (global.toast) global.toast(`Produk ${removed.nama_dagang} berhasil dihapus dari katalog.`, 'ok');
    }
    if (typeof S().closeModal === 'function') S().closeModal();
    global.renderActiveView();
  };

  global.setObatDetailTab = (tabName) => {
    const tMono = document.getElementById('detailTabContentMonograf');
    const tRiwayat = document.getElementById('detailTabContentRiwayatBeli');
    const tBatch = document.getElementById('detailTabContentBatch');
    const btnMono = document.getElementById('btnDetailTabMonograf');
    const btnRiwayat = document.getElementById('btnDetailTabRiwayatBeli');
    const btnBatch = document.getElementById('btnDetailTabBatch');
    if (!tMono && !tRiwayat && !tBatch) return;

    [tMono, tRiwayat, tBatch].forEach((t) => { if (t) t.classList.add('hidden'); });
    [btnMono, btnRiwayat, btnBatch].forEach((b) => {
      if (!b) return;
      b.classList.remove('active', 'border-blue-600', 'text-blue-600');
      b.classList.add('border-transparent', 'text-slate-500');
      b.setAttribute('aria-selected', 'false');
    });

    if (tabName === 'batch' && tBatch) {
      tBatch.classList.remove('hidden');
      if (btnBatch) {
        btnBatch.classList.add('active', 'border-blue-600', 'text-blue-600');
        btnBatch.classList.remove('border-transparent', 'text-slate-500');
        btnBatch.setAttribute('aria-selected', 'true');
      }
    } else if (tabName === 'riwayat-beli' && tRiwayat) {
      tRiwayat.classList.remove('hidden');
      if (btnRiwayat) {
        btnRiwayat.classList.add('active', 'border-blue-600', 'text-blue-600');
        btnRiwayat.classList.remove('border-transparent', 'text-slate-500');
        btnRiwayat.setAttribute('aria-selected', 'true');
      }
    } else if (tMono) {
      tMono.classList.remove('hidden');
      if (btnMono) {
        btnMono.classList.add('active', 'border-blue-600', 'text-blue-600');
        btnMono.classList.remove('border-transparent', 'text-slate-500');
        btnMono.setAttribute('aria-selected', 'true');
      }
    }
  };

  global.copyToClipboard = (text, label) => {
    if (!text) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(String(text)).then(() => {
          if (global.toast) global.toast(`${label || 'Teks'} disalin: ${text}`, 'ok');
        }).catch(() => {
          if (global.toast) global.toast(`${label || 'Teks'} disalin: ${text}`, 'ok');
        });
      } else if (typeof document !== 'undefined') {
        const t = document.createElement('textarea');
        t.value = text;
        document.body.appendChild(t);
        t.select();
        document.execCommand('copy');
        t.remove();
        if (global.toast) global.toast(`${label || 'Teks'} disalin: ${text}`, 'ok');
      }
    } catch (e) {
      if (global.toast) global.toast(`${label || 'Teks'}: ${text}`, 'info');
    }
  };

  global.openProductBarcodeModal = (idObat) => {
    const o = (S().AppState.masterObat || []).find((x) => x.id_obat === idObat);
    if (!o) return;
    const codeVal = o.kode_kfa || o.id_obat || 'OBAT-001';
    const hetVal = Math.round(Number(o.harga_umum || 0) * 1.15);
    const prof = S().getStoreProfile ? S().getStoreProfile() : {};
    const usahaNama = prof.nama_usaha || 'Apotek ONS Farma';

    S().openModal(`
      <div class="p-6 space-y-4 text-xs">
        <div class="flex items-center justify-between pb-3 border-b" style="border-color:var(--ons-border)">
          <div>
            <h3 class="font-extrabold text-base">Cetak Label Stiker Barcode Produk</h3>
            <p style="color:var(--ons-text-soft)">Pratinjau label stiker rak &amp; kemasan farmasi standar 58mm / 80mm.</p>
          </div>
          <button type="button" onclick="ONSStore.closeModal()" class="text-2xl px-1 leading-none">&times;</button>
        </div>

        <div class="py-2">
          <div class="ons-barcode-sticker space-y-1.5">
            <div class="text-[11px] font-bold tracking-wider uppercase text-blue-700">${S().esc(usahaNama)}</div>
            <div class="font-extrabold text-sm text-slate-900">${S().esc(o.nama_dagang)}</div>
            <div class="text-[10px] text-slate-500">${S().esc(o.zat_aktif || '')} ${o.kekuatan ? ('(' + S().esc(o.kekuatan) + ')') : ''}</div>
            <div class="py-2 flex flex-col items-center justify-center">
              <div class="font-mono text-xl font-bold tracking-widest px-3 py-1 bg-slate-50 border rounded text-slate-800">||| |||| || ||||| |||</div>
              <div class="font-mono text-[11px] font-bold mt-1 tracking-widest text-slate-700">${S().esc(codeVal)}</div>
            </div>
            <div class="flex items-center justify-between pt-1 border-t border-slate-200 text-[11px]">
              <div>HET: <b class="line-through text-slate-400">${S().rp(hetVal)}</b></div>
              <div class="text-base font-extrabold text-blue-700">${S().rp(o.harga_umum || 0)}</div>
            </div>
            <div class="text-[9px] text-slate-400">Rak: ${S().esc(o.rak_lokasi || 'RAK-A1')} &bull; Satuan: ${S().esc(o.satuan_dasar || 'Unit')}</div>
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-end gap-2 pt-2 border-t" style="border-color:var(--ons-border)">
          <button type="button" onclick="ONSStore.closeModal()" class="ons-btn ons-btn-ghost text-xs">Tutup</button>
          <button type="button" onclick="window.print()" class="ons-btn ons-btn-emerald text-xs font-bold px-4 py-2">🖨️ Cetak ke Thermal Printer</button>
        </div>
      </div>
    `, '440px');
  };

  global.openBulkMarginWizard = () => {
    const st = S().AppState;
    const all = st.masterObat || [];
    S().openModal(`
      <div class="p-6 space-y-4 text-xs">
        <div class="flex items-center justify-between pb-3 border-b" style="border-color:var(--ons-border)">
          <div>
            <h3 class="font-extrabold text-base">Kalkulator &amp; Evaluasi Margin Massal</h3>
            <p style="color:var(--ons-text-soft)">Sesuaikan persentase markup keuntungan obat secara serentak.</p>
          </div>
          <button type="button" onclick="ONSStore.closeModal()" class="text-2xl px-1 leading-none">&times;</button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="font-semibold block mb-1">Target Persentase Margin (%)</label>
            <input id="bulkMarginPct" type="number" min="5" max="100" class="ons-input text-xs font-mono-num font-bold" value="25"/>
          </div>
          <div>
            <label class="font-semibold block mb-1">Pembulatan Harga Jual</label>
            <select id="bulkMarginRound" class="ons-select text-xs">
              <option value="100">Bulatkan ke Rp 100 terdekat</option>
              <option value="500">Bulatkan ke Rp 500 terdekat</option>
              <option value="1000">Bulatkan ke Rp 1.000 terdekat</option>
            </select>
          </div>
        </div>

        <div class="p-3 rounded-xl border bg-slate-50 dark:bg-slate-800/50 space-y-2" style="border-color:var(--ons-border)">
          <div class="font-bold text-slate-700 dark:text-slate-200">Pratinjau Simulasi (Sampel 3 Produk):</div>
          ${all.slice(0, 3).map((o) => {
            const hpp = Number(o.hpp_avg || o.hpp_terakhir || 1000);
            const simJual = Math.round((hpp * 1.25) / 100) * 100;
            return `<div class="flex justify-between items-center text-[11px] py-1 border-b last:border-0 border-slate-200 dark:border-slate-700">
              <span class="font-medium">${S().esc(o.nama_dagang)} (HPP ${S().rp(hpp)})</span>
              <span class="font-mono-num font-bold text-blue-600">${S().rp(o.harga_umum || 0)} &rarr; ${S().rp(simJual)}</span>
            </div>`;
          }).join('')}
        </div>

        <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t" style="border-color:var(--ons-border)">
          <span class="text-[11px] text-slate-500">Total ${all.length} produk akan dievaluasi</span>
          <div class="flex gap-2">
            <button type="button" onclick="ONSStore.closeModal()" class="ons-btn ons-btn-ghost text-xs">Batal</button>
            <button type="button" onclick="window.applyBulkMarginSimulation()" class="ons-btn ons-btn-primary text-xs font-bold px-4 py-2">Terapkan Margin Baru</button>
          </div>
        </div>
      </div>
    `, '520px');
  };

  global.applyBulkMarginSimulation = async () => {
    const pct = Number((document.getElementById('bulkMarginPct') || {}).value || 25);
    const rnd = Number((document.getElementById('bulkMarginRound') || {}).value || 100);
    const st = S().AppState;
    const all = st.masterObat || [];
    let count = 0;
    all.forEach((o) => {
      const hpp = Number(o.hpp_avg || o.hpp_terakhir || 0);
      if (hpp > 0) {
        let calc = hpp * (1 + pct / 100);
        calc = Math.round(calc / rnd) * rnd;
        o.harga_umum = calc;
        o.harga_member = Math.round((calc * 0.95) / 100) * 100;
        count++;
      }
    });
    S().closeModal();
    if (global.toast) global.toast(`Berhasil menyesuaikan margin ${pct}% untuk ${count} produk obat.`, 'ok');
    if (global.renderActiveView) global.renderActiveView();
  };

  const _getObatPurchaseHistory = (idObat) => {
    const st = S().AppState || {};
    const o = (st.masterObat || []).find((x) => x.id_obat === idObat);
    if (!o) return null;

    const pbfMap = {};
    (st.supplierPbf || []).forEach((p) => {
      if (p && p.id_pbf) pbfMap[p.id_pbf] = p.nama_pbf || p.nama || p.id_pbf;
    });

    const fakturMap = {};
    (st.fakturPbf || []).forEach((f) => {
      if (f && f.no_faktur_pbf) fakturMap[f.no_faktur_pbf] = f;
    });

    const resolvePbfName = (idPbf, noFaktur) => {
      if (idPbf && pbfMap[idPbf]) return pbfMap[idPbf];
      if (noFaktur && fakturMap[noFaktur] && fakturMap[noFaktur].id_pbf) {
        const fId = fakturMap[noFaktur].id_pbf;
        if (pbfMap[fId]) return pbfMap[fId];
      }
      const fn = String(noFaktur || '').toUpperCase();
      if (fn.includes('BSP')) return 'PT Bina San Prima';
      if (fn.includes('ENS')) return 'PT Enseval Putera Megatrading';
      if (fn.includes('KFT') || fn.includes('KF')) return 'PT Kimia Farma Trading';
      if (fn.includes('AAM')) return 'PT Anugrah Argon Medika';
      if (fn.includes('MSP')) return 'PT Mensa Bina Sukses';
      if (fn.includes('APL')) return 'PT Anugerah Pharmindo Lestari';
      if (fn.includes('HBA')) return 'CV Herbal Berkah Alami';
      return idPbf || (noFaktur ? `PBF (${noFaktur.split('-')[1] || 'Distributor'})` : (o.pbf_utama || 'Distributor PBF'));
    };

    const purchases = [];
    const batches = (st.stokBatch || []).filter((b) => b.id_obat === idObat);
    batches.forEach((b) => {
      const fak = fakturMap[b.no_faktur_pbf] || {};
      const tgl = b.tgl_terima || fak.tgl_faktur || (fak.created_at ? fak.created_at.slice(0, 10) : '2026-10-01');
      const hpp = Number(b.hpp_beli || b.hpp || o.hpp_avg || 0);
      const pbfName = resolvePbfName(b.id_pbf || fak.id_pbf, b.no_faktur_pbf);
      purchases.push({
        id_batch: b.id_batch || b.no_batch,
        no_batch: b.no_batch || '-',
        no_faktur: b.no_faktur_pbf || fak.no_faktur_pbf || '-',
        tanggal: tgl,
        pbf: pbfName,
        qty: Number(b.qty_masuk || b.qty_sisa || 0),
        hpp_unit: hpp,
        status_batch: b.status_batch || 'AKTIF',
        is_konsinyasi: Boolean(b.is_konsinyasi),
        no_sp: b.no_sp || '-'
      });
    });

    (st.mutasiStok || []).forEach((m) => {
      if (m.id_obat === idObat && (m.jenis_mutasi === 'PEMBELIAN_PBF' || m.jenis_mutasi === 'KONSINYASI_MASUK')) {
        const exists = purchases.find((p) => p.no_faktur === m.referensi_id && p.hpp_unit === Number(m.hpp_unit || 0));
        if (!exists) {
          purchases.push({
            id_batch: m.id_batch || '-',
            no_batch: m.no_batch || '-',
            no_faktur: m.referensi_id || '-',
            tanggal: (m.timestamp || '').slice(0, 10) || '2026-10-01',
            pbf: resolvePbfName(null, m.referensi_id),
            qty: Number(m.jumlah_masuk || m.jumlah || 0),
            hpp_unit: Number(m.hpp_unit || o.hpp_avg || 0),
            status_batch: 'MUTASI',
            is_konsinyasi: m.jenis_mutasi === 'KONSINYASI_MASUK',
            no_sp: '-'
          });
        }
      }
    });

    purchases.sort((a, b) => String(a.tanggal).localeCompare(String(b.tanggal)));

    const rasioBesar = Number(o.rasio_besar || 100);
    const rasioSedang = Number(o.rasio_sedang || 10);
    const satDasar = o.satuan_dasar || 'Unit';
    const satBesar = o.satuan_besar || 'Box';
    const satSedang = o.satuan_sedang || 'Strip';

    for (let i = 0; i < purchases.length; i++) {
      const cur = purchases[i];
      const prev = i > 0 ? purchases[i - 1] : null;
      cur.prev_hpp_unit = prev ? prev.hpp_unit : cur.hpp_unit;
      cur.diff_rp = prev ? (cur.hpp_unit - prev.hpp_unit) : 0;
      cur.diff_pct = prev && prev.hpp_unit > 0 ? Number((((cur.hpp_unit - prev.hpp_unit) / prev.hpp_unit) * 100).toFixed(1)) : 0;
      cur.trend = cur.diff_rp > 0 ? 'NAIK' : (cur.diff_rp < 0 ? 'TURUN' : 'STABIL');
      cur.hpp_box = Math.round(cur.hpp_unit * rasioBesar);
      cur.hpp_strip = Math.round(cur.hpp_unit * rasioSedang);
    }

    const sortedDesc = [...purchases].reverse();
    const last = sortedDesc[0] || null;
    const prevLast = sortedDesc[1] || null;

    let minHppItem = null;
    let maxHppItem = null;
    if (purchases.length > 0) {
      minHppItem = purchases.reduce((min, p) => p.hpp_unit < min.hpp_unit ? p : min, purchases[0]);
      maxHppItem = purchases.reduce((max, p) => p.hpp_unit > max.hpp_unit ? p : max, purchases[0]);
    }

    const hargaUmum = Number(o.harga_umum || 0);
    const activeHpp = last ? last.hpp_unit : Number(o.hpp_avg || 0);
    const marginRp = hargaUmum - activeHpp;
    const marginPct = hargaUmum > 0 ? Number(((marginRp / hargaUmum) * 100).toFixed(1)) : 0;
    const markupPct = activeHpp > 0 ? Number(((marginRp / activeHpp) * 100).toFixed(1)) : 0;

    return {
      obat: o,
      purchasesDesc: sortedDesc,
      purchasesAsc: purchases,
      totalPurchases: purchases.length,
      lastPurchase: last,
      prevPurchase: prevLast,
      minHppItem,
      maxHppItem,
      priceSpreadRp: maxHppItem && minHppItem ? (maxHppItem.hpp_unit - minHppItem.hpp_unit) : 0,
      priceSpreadPct: minHppItem && minHppItem.hpp_unit > 0 && maxHppItem ? Number((((maxHppItem.hpp_unit - minHppItem.hpp_unit) / minHppItem.hpp_unit) * 100).toFixed(1)) : 0,
      currentHargaUmum: hargaUmum,
      currentHargaMember: Number(o.harga_member || Math.round(hargaUmum * 0.95)),
      activeHpp,
      marginRp,
      marginPct,
      markupPct,
      isLoss: activeHpp > hargaUmum,
      isThin: marginPct < 15,
      satDasar,
      satBesar,
      satSedang,
      rasioBesar,
      rasioSedang
    };
  };

  const _renderObatPurchaseHistoryTabHtml = (idObat) => {
    const data = _getObatPurchaseHistory(idObat);
    if (!data) return '<div class="p-4 text-center text-slate-500">Data obat tidak ditemukan.</div>';

    const seeCost = S().canSeeFinancialCost();
    if (!seeCost) {
      return `
        <div class="p-6 rounded-2xl border text-center space-y-3 bg-amber-500/10 border-amber-300 dark:border-amber-700/50">
          <div class="text-3xl">🔒</div>
          <div class="font-extrabold text-sm text-amber-800 dark:text-amber-200">Akses Terbatas: Laporan Finansial &amp; HPP</div>
          <p class="text-xs text-amber-700 dark:text-amber-300 max-w-md mx-auto">
            Riwayat faktur pembelian, harga beli distributor PBF, dan simulator margin harga jual hanya dapat diakses oleh Owner dan Apoteker Penanggung Jawab (APJ).
          </p>
        </div>
      `;
    }

    const {
      obat: o,
      purchasesDesc,
      totalPurchases,
      lastPurchase: last,
      prevPurchase: prev,
      minHppItem,
      maxHppItem,
      priceSpreadRp,
      priceSpreadPct,
      currentHargaUmum,
      currentHargaMember,
      activeHpp,
      marginRp,
      marginPct,
      isLoss,
      isThin,
      satDasar,
      satBesar,
      rasioBesar
    } = data;

    let trendBadgeHtml = '';
    if (!last || totalPurchases <= 1) {
      trendBadgeHtml = '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">➖ Perdana / Stabil</span>';
    } else if (last.trend === 'NAIK') {
      trendBadgeHtml = `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">🔺 +${last.diff_pct}% (Naik ${S().rp(last.diff_rp)})</span>`;
    } else if (last.trend === 'TURUN') {
      trendBadgeHtml = `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">🔻 ${last.diff_pct}% (Turun ${S().rp(Math.abs(last.diff_rp))})</span>`;
    } else {
      trendBadgeHtml = '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">➖ 0% (Stabil)</span>';
    }

    let marginBadgeClass = 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800';
    let marginLabel = 'Optimal &amp; Sehat';
    if (isLoss) {
      marginBadgeClass = 'text-red-600 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 animate-pulse';
      marginLabel = '⚠️ RUGI (Harga &le; Modal)';
    } else if (isThin) {
      marginBadgeClass = 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800';
      marginLabel = '⚠️ Tipis (&lt;15%)';
    }

    const calcPriceForMargin = (targetMarginPct) => {
      if (activeHpp <= 0) return 0;
      const raw = activeHpp / (1 - targetMarginPct / 100);
      return Math.ceil(raw / 100) * 100;
    };

    const recPrice20 = calcPriceForMargin(20);
    const recPrice25 = calcPriceForMargin(25);
    const recPrice30 = calcPriceForMargin(30);
    const recPrice35 = calcPriceForMargin(35);

    return `
      <div class="space-y-4">
        <!-- 1. RINGKASAN EKSEKUTIF HPP & PEMBELIAN TERAKHIR -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div class="p-3 rounded-xl border" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
            <div class="text-[10px] uppercase font-bold tracking-wider" style="color:var(--ons-text-soft)">Beli Terakhir</div>
            <div class="text-base font-extrabold font-mono-num text-blue-700 dark:text-blue-400 mt-0.5">
              ${last ? S().rp(last.hpp_unit) : S().rp(activeHpp)}
              <span class="text-[10px] font-normal text-slate-500">/${satDasar}</span>
            </div>
            <div class="text-[10px] font-medium text-slate-500 mt-1 truncate" title="${last ? S().esc(last.pbf) : '-'}">
              ${last ? `${S().esc(last.pbf)} &bull; ${last.tanggal}` : 'Belum ada faktur'}
            </div>
            ${last && rasioBesar > 1 ? `<div class="text-[9.5px] font-mono-num text-slate-400 mt-0.5">${S().rp(last.hpp_box)} / ${satBesar}</div>` : ''}
          </div>

          <div class="p-3 rounded-xl border" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
            <div class="text-[10px] uppercase font-bold tracking-wider" style="color:var(--ons-text-soft)">Beli Sebelumnya</div>
            <div class="text-base font-extrabold font-mono-num text-slate-700 dark:text-slate-200 mt-0.5">
              ${prev ? S().rp(prev.hpp_unit) : '-'}
              ${prev ? `<span class="text-[10px] font-normal text-slate-500">/${satDasar}</span>` : ''}
            </div>
            <div class="text-[10px] font-medium text-slate-500 mt-1 truncate" title="${prev ? S().esc(prev.pbf) : '-'}">
              ${prev ? `${S().esc(prev.pbf)} &bull; ${prev.tanggal}` : 'Pembelian Perdana'}
            </div>
            ${prev && rasioBesar > 1 ? `<div class="text-[9.5px] font-mono-num text-slate-400 mt-0.5">${S().rp(prev.hpp_box)} / ${satBesar}</div>` : ''}
          </div>

          <div class="p-3 rounded-xl border" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
            <div class="text-[10px] uppercase font-bold tracking-wider" style="color:var(--ons-text-soft)">Tren Harga PBF</div>
            <div class="mt-1">${trendBadgeHtml}</div>
            <div class="text-[10px] text-slate-500 mt-1.5">
              ${last && prev ? `Selisih: <b class="font-mono-num">${S().rp(Math.abs(last.diff_rp))}</b>/${satDasar}` : 'Data acuan perdana'}
            </div>
          </div>

          <div class="p-3 rounded-xl border ${marginBadgeClass}" style="border-width:1px;">
            <div class="text-[10px] uppercase font-bold tracking-wider opacity-80">Margin Saat Ini</div>
            <div class="text-base font-extrabold font-mono-num mt-0.5">
              ${marginPct}%
              <span class="text-[10px] font-normal opacity-90">(${S().rp(marginRp)})</span>
            </div>
            <div class="text-[10px] font-bold mt-1">${marginLabel}</div>
          </div>
        </div>

        <!-- 2. SIMULATOR & KEPUTUSAN HARGA JUAL CERDAS -->
        <div class="p-4 rounded-2xl border space-y-3.5 bg-gradient-to-br from-blue-50/70 via-indigo-50/40 to-white dark:from-slate-800/80 dark:via-slate-800/50 dark:to-slate-900" style="border-color:var(--ons-border)">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <span class="text-lg">💡</span>
              <div>
                <h4 class="font-extrabold text-sm text-slate-900 dark:text-white">Simulator Keputusan Harga Jual Cerdas</h4>
                <p class="text-[11px] text-slate-500">Tentukan harga jual baru berdasarkan HPP beli terakhir dari distributor PBF agar laba tetap terjaga.</p>
              </div>
            </div>
            <div class="text-[11px] font-mono-num px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200 font-bold border border-blue-200 dark:border-blue-800">
              HPP Acuan: ${S().rp(activeHpp)} / ${satDasar}
            </div>
          </div>

          <div class="space-y-1.5">
            <div class="text-[11px] font-bold text-slate-700 dark:text-slate-300">Pilih Target Margin Apotek:</div>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button type="button" onclick="window.calcObatPricingSim('${S().esc(o.id_obat)}', 20, 100)" class="p-2.5 rounded-xl border text-left bg-white dark:bg-slate-800 hover:border-blue-500 hover:shadow-sm transition-all text-xs group">
                <div class="flex items-center justify-between">
                  <span class="font-bold text-slate-800 dark:text-slate-200">20% Reguler</span>
                  <span class="text-[10px] text-slate-400 group-hover:text-blue-600 font-bold">Pilih &rarr;</span>
                </div>
                <div class="text-xs font-mono-num font-extrabold text-blue-600 mt-1">${S().rp(recPrice20)}</div>
                <div class="text-[9.5px] text-slate-400 mt-0.5">Laba: ${S().rp(recPrice20 - activeHpp)}/${satDasar}</div>
              </button>

              <button type="button" onclick="window.calcObatPricingSim('${S().esc(o.id_obat)}', 25, 100)" class="p-2.5 rounded-xl border-2 border-emerald-500 text-left bg-emerald-50/50 dark:bg-emerald-950/30 hover:border-emerald-600 hover:shadow-sm transition-all text-xs group relative">
                <span class="absolute -top-2 right-2 text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-emerald-600 text-white tracking-wider">Rekomendasi</span>
                <div class="flex items-center justify-between">
                  <span class="font-bold text-emerald-800 dark:text-emerald-200">25% Ideal</span>
                  <span class="text-[10px] text-emerald-600 font-bold">Pilih &rarr;</span>
                </div>
                <div class="text-xs font-mono-num font-extrabold text-emerald-600 mt-1">${S().rp(recPrice25)}</div>
                <div class="text-[9.5px] text-emerald-700 dark:text-emerald-300 mt-0.5">Laba: ${S().rp(recPrice25 - activeHpp)}/${satDasar}</div>
              </button>

              <button type="button" onclick="window.calcObatPricingSim('${S().esc(o.id_obat)}', 30, 100)" class="p-2.5 rounded-xl border text-left bg-white dark:bg-slate-800 hover:border-blue-500 hover:shadow-sm transition-all text-xs group">
                <div class="flex items-center justify-between">
                  <span class="font-bold text-slate-800 dark:text-slate-200">30% Etis</span>
                  <span class="text-[10px] text-slate-400 group-hover:text-blue-600 font-bold">Pilih &rarr;</span>
                </div>
                <div class="text-xs font-mono-num font-extrabold text-blue-600 mt-1">${S().rp(recPrice30)}</div>
                <div class="text-[9.5px] text-slate-400 mt-0.5">Laba: ${S().rp(recPrice30 - activeHpp)}/${satDasar}</div>
              </button>

              <button type="button" onclick="window.calcObatPricingSim('${S().esc(o.id_obat)}', 35, 100)" class="p-2.5 rounded-xl border text-left bg-white dark:bg-slate-800 hover:border-blue-500 hover:shadow-sm transition-all text-xs group">
                <div class="flex items-center justify-between">
                  <span class="font-bold text-slate-800 dark:text-slate-200">35% Maksimal</span>
                  <span class="text-[10px] text-slate-400 group-hover:text-blue-600 font-bold">Pilih &rarr;</span>
                </div>
                <div class="text-xs font-mono-num font-extrabold text-blue-600 mt-1">${S().rp(recPrice35)}</div>
                <div class="text-[9.5px] text-slate-400 mt-0.5">Laba: ${S().rp(recPrice35 - activeHpp)}/${satDasar}</div>
              </button>
            </div>
          </div>

          <div class="p-3.5 rounded-xl border bg-white dark:bg-slate-900 space-y-3" style="border-color:var(--ons-border)">
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div>
                <label class="font-bold text-[11px] block mb-1 text-slate-700 dark:text-slate-300">
                  Ketik Harga Jual Baru (Rp / ${satDasar}):
                </label>
                <div class="relative">
                  <span class="absolute left-3 top-2.5 font-bold text-slate-400 text-xs">Rp</span>
                  <input id="simPriceInp_${o.id_obat}" type="number" min="0" step="50"
                    class="ons-input pl-9 font-mono-num font-extrabold text-sm text-blue-700 dark:text-blue-400"
                    value="${currentHargaUmum}"
                    oninput="window.onCustomPriceInpChange('${S().esc(o.id_obat)}', this.value)"/>
                </div>
              </div>

              <div>
                <label class="font-bold text-[11px] block mb-1 text-slate-700 dark:text-slate-300">
                  Harga Member Otomatis (Disc 5%):
                </label>
                <div class="relative">
                  <span class="absolute left-3 top-2.5 font-bold text-slate-400 text-xs">Rp</span>
                  <input id="simMemberPriceInp_${o.id_obat}" type="number" min="0" readonly
                    class="ons-input pl-9 font-mono-num font-bold text-sm bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    value="${currentHargaMember}"/>
                </div>
              </div>

              <div class="flex items-center">
                <button type="button" id="btnApplyPriceSim_${o.id_obat}"
                  onclick="window.applyNewObatPrice('${S().esc(o.id_obat)}')"
                  class="ons-btn ons-btn-emerald w-full py-2.5 text-xs font-bold shadow-sm">
                  ✓ Terapkan Harga Jual Baru
                </button>
              </div>
            </div>

            <div id="simFeedbackBox_${o.id_obat}" class="p-2.5 rounded-lg border text-xs flex flex-wrap items-center justify-between gap-2 ${isLoss ? 'bg-red-50 text-red-700 border-red-200' : (isThin ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700')}">
              <div class="flex items-center gap-2">
                <span id="simStatusIcon_${o.id_obat}">${isLoss ? '❌' : (isThin ? '⚠️' : '✅')}</span>
                <span id="simStatusMsg_${o.id_obat}" class="font-medium">
                  ${isLoss ? `Harga jual rugi! HPP modal ${S().rp(activeHpp)} lebih tinggi dari harga jual saat ini ${S().rp(currentHargaUmum)}.` : `Margin aktif: <b class="font-mono-num">${marginPct}%</b> &bull; Laba kotor: <b class="font-mono-num">${S().rp(marginRp)}</b>/${satDasar}`}
                </span>
              </div>
              <div class="flex items-center gap-2 font-mono-num text-[11px]">
                ${rasioBesar > 1 ? `<span>Proyeksi Laba per ${satBesar}: <b class="font-bold text-emerald-600">${S().rp(marginRp * rasioBesar)}</b></span>` : ''}
              </div>
            </div>
          </div>
        </div>

        <!-- 3. KOMPARASI DISTRIBUTOR PBF -->
        ${totalPurchases > 1 && minHppItem && maxHppItem ? `
        <div class="p-3.5 rounded-xl border space-y-2 bg-slate-50/70 dark:bg-slate-800/40" style="border-color:var(--ons-border)">
          <div class="flex items-center justify-between">
            <div class="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <span>⚖️ Komparasi Distributor PBF</span>
              <span class="text-[10px] font-normal text-slate-500">(${totalPurchases} transaksi faktur)</span>
            </div>
            <span class="text-[10.5px] font-semibold text-slate-500">
              Rentang Harga: <b class="font-mono-num text-slate-800 dark:text-slate-200">${S().rp(priceSpreadRp)}</b> (${priceSpreadPct}%)
            </span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div class="p-2.5 rounded-lg border bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-800/50 flex items-center justify-between">
              <div>
                <span class="text-[9.5px] font-extrabold uppercase tracking-wider text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.2 rounded">PBF Termurah</span>
                <div class="font-bold text-slate-900 dark:text-white mt-1">${S().esc(minHppItem.pbf)}</div>
                <div class="text-[10px] text-slate-400">Tgl: ${minHppItem.tanggal} &bull; Faktur: ${S().esc(minHppItem.no_faktur)}</div>
              </div>
              <div class="text-right">
                <div class="text-sm font-extrabold font-mono-num text-emerald-600">${S().rp(minHppItem.hpp_unit)}</div>
                <div class="text-[10px] text-slate-400">/${satDasar}</div>
                ${rasioBesar > 1 ? `<div class="text-[9.5px] font-mono-num text-emerald-700 dark:text-emerald-400 font-bold">${S().rp(minHppItem.hpp_box)}/${satBesar}</div>` : ''}
              </div>
            </div>

            <div class="p-2.5 rounded-lg border bg-white dark:bg-slate-900 border-red-200 dark:border-red-800/50 flex items-center justify-between">
              <div>
                <span class="text-[9.5px] font-extrabold uppercase tracking-wider text-red-600 bg-red-50 dark:bg-red-950 px-1.5 py-0.2 rounded">PBF Termahal</span>
                <div class="font-bold text-slate-900 dark:text-white mt-1">${S().esc(maxHppItem.pbf)}</div>
                <div class="text-[10px] text-slate-400">Tgl: ${maxHppItem.tanggal} &bull; Faktur: ${S().esc(maxHppItem.no_faktur)}</div>
              </div>
              <div class="text-right">
                <div class="text-sm font-extrabold font-mono-num text-red-600">${S().rp(maxHppItem.hpp_unit)}</div>
                <div class="text-[10px] text-slate-400">/${satDasar}</div>
                ${rasioBesar > 1 ? `<div class="text-[9.5px] font-mono-num text-red-700 dark:text-red-400 font-bold">${S().rp(maxHppItem.hpp_box)}/${satBesar}</div>` : ''}
              </div>
            </div>
          </div>

          ${priceSpreadRp > 0 && rasioBesar > 1 ? `
          <div class="text-[11px] p-2 rounded-lg bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
            <span>💡</span>
            <span>Potensi hemat hingga <b class="font-mono-num font-bold">${S().rp(priceSpreadRp * rasioBesar)}</b> per ${satBesar} jika memesan ke <b>${S().esc(minHppItem.pbf)}</b>.</span>
          </div>` : ''}
        </div>` : ''}

        <!-- 4. TABEL LENGKAP RIWAYAT PEMBELIAN DARI PBF -->
        <div class="space-y-1.5">
          <div class="flex items-center justify-between">
            <div class="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <span>📑 Riwayat Faktur Pembelian PBF (${totalPurchases} Catatan)</span>
            </div>
            <span class="text-[10px] text-slate-400">Urutan faktur terbaru ke terlama</span>
          </div>

          <div class="ons-table-wrap max-h-72 overflow-y-auto">
            <table class="ons-table">
              <thead>
                <tr>
                  <th class="w-8">#</th>
                  <th>Tgl Faktur</th>
                  <th>Distributor PBF</th>
                  <th>No. Faktur &amp; Batch</th>
                  <th class="text-right">Qty Beli</th>
                  <th class="text-right">HPP / ${satDasar}</th>
                  <th class="text-right">HPP / ${satBesar}</th>
                  <th class="text-center">Perubahan HPP</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${purchasesDesc.length ? purchasesDesc.map((p, idx) => {
                  let deltaBadge = '';
                  if (p.trend === 'NAIK') {
                    deltaBadge = `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">🔺 +${p.diff_pct}%</span>`;
                  } else if (p.trend === 'TURUN') {
                    deltaBadge = `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">🔻 ${p.diff_pct}%</span>`;
                  } else {
                    deltaBadge = `<span class="text-slate-400 text-[10px]">➖ 0%</span>`;
                  }
                  const isLatest = idx === 0;

                  return `
                    <tr class="${isLatest ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''}">
                      <td class="font-mono-num text-[11px] text-slate-400">${idx + 1}</td>
                      <td class="font-mono-num text-xs whitespace-nowrap">
                        ${S().esc(p.tanggal)}
                        ${isLatest ? '<span class="ml-1 text-[9px] font-bold px-1 py-0.2 rounded bg-blue-600 text-white">TERBARU</span>' : ''}
                      </td>
                      <td class="font-semibold text-xs text-slate-900 dark:text-white">
                        ${S().esc(p.pbf)}
                        ${p.is_konsinyasi ? '<span class="ml-1 text-[9px] font-bold text-amber-600">[Konsinyasi]</span>' : ''}
                      </td>
                      <td class="font-mono-num text-xs">
                        <div>${S().esc(p.no_faktur)}</div>
                        <div class="text-[10px] text-slate-400">Batch: ${S().esc(p.no_batch)}</div>
                      </td>
                      <td class="font-mono-num text-xs text-right font-bold">
                        ${p.qty} ${satDasar}
                      </td>
                      <td class="font-mono-num text-xs text-right font-extrabold ${isLatest ? 'text-blue-700 dark:text-blue-400' : ''}">
                        ${S().rp(p.hpp_unit)}
                      </td>
                      <td class="font-mono-num text-xs text-right text-slate-600 dark:text-slate-300">
                        ${S().rp(p.hpp_box)}
                      </td>
                      <td class="text-center font-mono-num">
                        ${deltaBadge}
                        ${p.diff_rp !== 0 ? `<div class="text-[9px] text-slate-400">${p.diff_rp > 0 ? '+' : ''}${S().rp(p.diff_rp)}</div>` : ''}
                      </td>
                      <td class="text-xs">
                        <span class="text-[10px] font-bold px-1.5 py-0.2 rounded ${p.status_batch === 'AKTIF' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}">
                          ${S().esc(p.status_batch)}
                        </span>
                      </td>
                    </tr>
                  `;
                }).join('') : `
                  <tr>
                    <td colspan="9" class="text-center py-6 text-xs text-slate-400">
                      Belum ada riwayat pembelian faktur PBF untuk obat ini.
                    </td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  };

  const _renderWizPurchaseHistoryBanner = (idObat) => {
    if (!idObat) return '';
    const data = _getObatPurchaseHistory(idObat);
    if (!data || !data.lastPurchase) return '';
    const last = data.lastPurchase;
    const prev = data.prevPurchase;
    let trendText = 'Harga beli stabil';
    if (last.trend === 'NAIK') trendText = `🔺 Naik +${last.diff_pct}% (${S().rp(last.diff_rp)}) dibanding faktur sebelumnya`;
    else if (last.trend === 'TURUN') trendText = `🔻 Turun ${last.diff_pct}% (${S().rp(Math.abs(last.diff_rp))}) dibanding faktur sebelumnya`;

    return `
      <div class="p-3 rounded-xl border border-blue-200 bg-blue-50/70 dark:bg-blue-950/30 dark:border-blue-800/60 flex flex-wrap items-center justify-between gap-2 text-xs mb-3">
        <div class="flex items-center gap-2">
          <span class="text-base">📈</span>
          <div>
            <div class="font-bold text-slate-800 dark:text-slate-100">
              Faktur Terakhir: ${S().esc(last.pbf)} &bull; ${last.tanggal} @ <span class="font-mono-num text-blue-700 dark:text-blue-300 font-extrabold">${S().rp(last.hpp_unit)}</span> / ${S().esc(data.satDasar)}
            </div>
            <div class="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
              ${trendText} ${prev ? `(Sebelumnya: ${S().esc(prev.pbf)} @ ${S().rp(prev.hpp_unit)})` : ''}
            </div>
          </div>
        </div>
        <button type="button" onclick="ONSStore.closeModal();window.openObatRiwayatBeliModal('${S().esc(idObat)}')" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2.5 text-blue-700 font-bold border border-blue-300 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300">
          Buka Riwayat Beli &amp; Tren HPP &rarr;
        </button>
      </div>
    `;
  };

  global.calcObatPricingSim = (idObat, targetMarginPct, roundTo = 100) => {
    const data = _getObatPurchaseHistory(idObat);
    if (!data) return;
    const activeHpp = data.activeHpp || 0;
    if (activeHpp <= 0) {
      if (global.toast) global.toast('HPP produk bernilai 0, silakan masukkan harga manual.', 'info');
      return;
    }
    const raw = activeHpp / (1 - targetMarginPct / 100);
    const newPrice = Math.ceil(raw / roundTo) * roundTo;
    const inpPrice = document.getElementById(`simPriceInp_${idObat}`);
    if (inpPrice) {
      inpPrice.value = newPrice;
      global.onCustomPriceInpChange(idObat, newPrice);
    }
  };

  global.onCustomPriceInpChange = (idObat, val) => {
    const newPrice = Number(val || 0);
    const data = _getObatPurchaseHistory(idObat);
    if (!data) return;
    const activeHpp = data.activeHpp || 0;
    const memberPriceInp = document.getElementById(`simMemberPriceInp_${idObat}`);
    if (memberPriceInp) {
      memberPriceInp.value = Math.round((newPrice * 0.95) / 100) * 100;
    }

    const fbBox = document.getElementById(`simFeedbackBox_${idObat}`);
    const statusIcon = document.getElementById(`simStatusIcon_${idObat}`);
    const statusMsg = document.getElementById(`simStatusMsg_${idObat}`);
    if (!fbBox || !statusMsg) return;

    const marginRp = newPrice - activeHpp;
    const marginPct = newPrice > 0 ? Number(((marginRp / newPrice) * 100).toFixed(1)) : 0;
    const satDasar = data.satDasar || 'Unit';

    fbBox.className = 'p-2.5 rounded-lg border text-xs flex flex-wrap items-center justify-between gap-2';

    if (newPrice <= activeHpp) {
      fbBox.classList.add('bg-red-50', 'text-red-700', 'border-red-200');
      if (statusIcon) statusIcon.textContent = '❌';
      statusMsg.innerHTML = `⚠️ <b class="font-bold">Harga jual rugi!</b> HPP modal ${S().rp(activeHpp)} lebih tinggi dari harga jual ${S().rp(newPrice)}. Apotek akan rugi <b class="font-mono-num">${S().rp(Math.abs(marginRp))}</b> per ${satDasar}.`;
    } else if (marginPct < 15) {
      fbBox.classList.add('bg-amber-50', 'text-amber-700', 'border-amber-200');
      if (statusIcon) statusIcon.textContent = '⚠️';
      statusMsg.innerHTML = `⚠️ <b class="font-bold">Margin tipis (${marginPct}%)!</b> Laba: <b class="font-mono-num">${S().rp(marginRp)}</b>/${satDasar}. Di bawah rekomendasi standar apotek (15-30%).`;
    } else {
      fbBox.classList.add('bg-slate-50', 'dark:bg-slate-800/60', 'text-slate-700', 'dark:text-slate-200', 'border-slate-200', 'dark:border-slate-700');
      if (statusIcon) statusIcon.textContent = '✅';
      statusMsg.innerHTML = `Margin aktif: <b class="font-mono-num font-bold text-emerald-600">${marginPct}%</b> &bull; Laba kotor: <b class="font-mono-num text-emerald-600">${S().rp(marginRp)}</b>/${satDasar}`;
    }
  };

  global.applyNewObatPrice = (idObat) => {
    const o = (S().AppState.masterObat || []).find((x) => x.id_obat === idObat);
    if (!o) return;
    const inpPrice = document.getElementById(`simPriceInp_${idObat}`);
    const inpMember = document.getElementById(`simMemberPriceInp_${idObat}`);
    const newPrice = Number(inpPrice ? inpPrice.value : 0);
    const newMember = Number(inpMember ? inpMember.value : Math.round((newPrice * 0.95) / 100) * 100);

    if (newPrice <= 0) {
      if (global.toast) global.toast('Masukkan nominal harga jual yang valid.', 'err');
      return;
    }

    const oldPrice = o.harga_umum || 0;
    o.harga_umum = newPrice;
    o.harga_member = newMember;

    if (typeof S().saveState === 'function') S().saveState();
    if (typeof API === 'function' && API() && typeof API().callApi === 'function') {
      try { API().callApi('obat.save', o, { isWrite: true }); } catch (e) {}
    }
    if (typeof S().logAuditEvent === 'function') {
      S().logAuditEvent('UPDATE_HARGA_OBAT', `Penetapan harga jual baru ${o.nama_dagang} (${o.id_obat}): ${S().rp(oldPrice)} -> ${S().rp(newPrice)} (Member: ${S().rp(newMember)}) berdasarkan riwayat HPP faktur PBF.`);
    }

    if (global.toast) {
      global.toast(`✓ Harga jual ${o.nama_dagang} berhasil diperbarui ke ${S().rp(newPrice)} (Member: ${S().rp(newMember)}). Kasir langsung tersinkron.`, 'ok');
    }

    if (typeof global.openObatDetailModal === 'function') {
      global.openObatDetailModal(idObat, 'riwayat-beli');
    }
    if (typeof global.renderActiveView === 'function') {
      global.renderActiveView();
    }
  };

  global.openObatRiwayatBeliModal = (idObat) => {
    if (typeof global.openObatDetailModal === 'function') {
      global.openObatDetailModal(idObat, 'riwayat-beli');
    }
  };

  global.openObatDetailModal = (idObat, initialTab = 'monograf') => {
    const o = (S().AppState.masterObat || []).find((x) => x.id_obat === idObat);
    if (!o) return;
    const st = S().AppState;
    const m = buildObatMeta(o);
    const seeCost = S().canSeeFinancialCost();
    const isAktifJual = String(o.status_aktif || 'AKTIF').toUpperCase() !== 'NONAKTIF';
    const hetVal = Math.round(Number(o.harga_umum || 0) * 1.15);
    const isRiw = initialTab === 'riwayat-beli';
    const isBatch = initialTab === 'batch';
    const isMono = !isRiw && !isBatch;
    const batches = (st.stokBatch || [])
      .filter((b) => b.id_obat === idObat && String(b.status_batch || 'AKTIF') === 'AKTIF')
      .sort((a, b) => String(a.tgl_kadaluarsa).localeCompare(String(b.tgl_kadaluarsa)));
    const nearEd = S().getNearEdBatchInfo ? S().getNearEdBatchInfo(idObat, 90) : { hasNearEd: false };
    const multiOn = S().isMultiBranchEnabled ? S().isMultiBranchEnabled() : false;
    const cmpItem = ((st.branchStockCompare && st.branchStockCompare.items) || []).find((x) => x.id_obat === idObat);
    const branches = (S().getActiveBranches && S().getActiveBranches()) || ['ONS-01'];
    const perCb = (cmpItem && cmpItem.stok_per_cabang) || {};

    const subIds = String(o.substitusi_ids || '').split(',').map((s) => s.trim()).filter(Boolean);
    const subNames = subIds.map((sid) => {
      const match = (st.masterObat || []).find((x) => x.id_obat === sid);
      return match ? match.nama_dagang : sid;
    });

    S().openDrawer(`<div class="p-6 space-y-4 text-xs">
      <div class="flex items-start justify-between gap-2 border-b pb-3" style="border-color:var(--ons-border)">
        <div>
          <div class="flex flex-wrap items-center gap-1.5 mb-1.5">
            ${S().bpomBadge(o.golongan_bpom)}
            <span class="font-mono-num text-[11px] px-2 py-0.5 rounded border font-semibold" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">${S().esc(o.id_obat)}</span>
            <span class="text-[10px] font-bold px-1.5 py-0.2 rounded ${isAktifJual ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-200 text-slate-600'}">${isAktifJual ? 'Dijual' : 'Nonaktif'}</span>
            ${m.isCold ? `<span class="badge-bpom bpom-terbatas">COLD CHAIN 2-8&deg;C</span>` : ''}
            ${nearEd.hasNearEd ? `<span class="badge-bpom bpom-prekursor">PROMO NEAR-ED -${nearEd.suggestedDiscPct}%</span>` : ''}
          </div>
          <h3 class="font-extrabold text-lg leading-snug text-slate-900 dark:text-white">${S().esc(o.nama_dagang)}</h3>
          <p class="text-slate-600 dark:text-slate-300 text-xs mt-0.5">${S().esc(o.zat_aktif || '-')} ${o.kekuatan ? ('&bull; ' + S().esc(o.kekuatan)) : ''} &bull; <span class="font-semibold text-blue-600">${S().esc(o.bentuk_sediaan || 'Sediaan Farmasi')}</span></p>
        </div>
        <button type="button" onclick="ONSStore.closeDrawer()" class="text-2xl px-1 leading-none text-slate-400 hover:text-slate-700 dark:hover:text-white">&times;</button>
      </div>

      <div class="flex items-center gap-2 border-b overflow-x-auto" style="border-color:var(--ons-border)" role="tablist">
        <button id="btnDetailTabMonograf" type="button" role="tab" aria-selected="${isMono ? 'true' : 'false'}" onclick="window.setObatDetailTab('monograf')" class="pb-2 text-xs font-bold border-b-2 ${isMono ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'} transition-colors whitespace-nowrap">
          📋 Monograf &amp; Info Produk
        </button>
        <button id="btnDetailTabRiwayatBeli" type="button" role="tab" aria-selected="${isRiw ? 'true' : 'false'}" onclick="window.setObatDetailTab('riwayat-beli')" class="pb-2 text-xs font-bold border-b-2 ${isRiw ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'} transition-colors whitespace-nowrap">
          📈 Riwayat Beli &amp; Tren HPP
        </button>
        <button id="btnDetailTabBatch" type="button" role="tab" aria-selected="${isBatch ? 'true' : 'false'}" onclick="window.setObatDetailTab('batch')" class="pb-2 text-xs font-semibold border-b-2 ${isBatch ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'} transition-colors whitespace-nowrap">
          📦 Batch FEFO &amp; Stok (${batches.length})
        </button>
      </div>

      <div id="detailTabContentMonograf" class="space-y-4 ${isMono ? '' : 'hidden'}">
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          <div class="p-2.5 rounded-xl border" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
            <div style="color:var(--ons-text-soft)">Stok Aktif (${S().esc(st.cabangId || 'ONS-01')})</div>
            <div class="text-base font-extrabold font-mono-num" style="color:${m.stokTone.color}">${m.stok} ${S().esc(o.satuan_dasar || 'Unit')}</div>
            <div class="text-[10px] font-semibold mt-0.5" style="color:${m.stokTone.color}">${m.stokTone.label}</div>
          </div>
          <div class="p-2.5 rounded-xl border" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
            <div style="color:var(--ons-text-soft)">Harga Jual Umum</div>
            <div class="text-base font-extrabold font-mono-num text-blue-600">${S().rp(o.harga_umum)}</div>
            <div class="text-[10px] text-slate-400">Eceran Tertinggi</div>
          </div>
          <div class="p-2.5 rounded-xl border" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
            <div style="color:var(--ons-text-soft)">Harga Member</div>
            <div class="text-base font-extrabold font-mono-num text-emerald-600">${S().rp(o.harga_member || o.harga_umum)}</div>
            <div class="text-[10px] text-emerald-600">Diskon Pelanggan</div>
          </div>
          <div class="p-2.5 rounded-xl border" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
            <div style="color:var(--ons-text-soft)">Harga Grosir (&ge;${Number(o.min_qty_grosir || 10)} ${S().esc(o.satuan_dasar || 'Unit')})</div>
            <div class="text-sm font-extrabold font-mono-num text-blue-700 dark:text-blue-400">${S().rp(o.harga_grosir || o.harga_member || o.harga_umum)}</div>
            <div class="text-[10px] text-slate-400">Pembelian Jumlah Banyak</div>
          </div>
          <div class="p-2.5 rounded-xl border" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
            <div style="color:var(--ons-text-soft)">Harga Faskes / Mitra</div>
            <div class="text-sm font-extrabold font-mono-num text-slate-700 dark:text-slate-200">${S().rp(o.harga_faskes || o.harga_grosir || o.harga_umum)}</div>
            <div class="text-[10px] text-slate-400">Klinik &amp; Dokter Mitra</div>
          </div>
          <div class="p-2.5 rounded-xl border" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
            <div style="color:var(--ons-text-soft)">${seeCost ? 'HPP Modal Rata-rata' : 'Batas Buffer Min.'}</div>
            <div class="text-sm font-extrabold font-mono-num">${seeCost ? S().rp(o.hpp_avg) : (m.min + ' ' + S().esc(o.satuan_dasar || 'Unit'))}</div>
            <div class="text-[10px] ${m.marginPct !== null ? 'text-emerald-600 font-bold' : 'text-slate-400'}">${seeCost && m.marginPct !== null ? ('Markup +' + m.marginPct + '%') : 'Ambang Restok'}</div>
          </div>
        </div>

        <div class="p-3.5 rounded-xl border space-y-2.5" style="border-color:var(--ons-border);background:var(--ons-bg-subtle)">
          <div class="font-bold text-xs text-slate-800 dark:text-slate-200">Spesifikasi Farmasi &amp; Legalitas Regulasi</div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div class="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-700">
              <span style="color:var(--ons-text-soft)">Nomor Izin Edar (NIE BPOM):</span>
              <div class="flex items-center gap-1 font-mono-num font-semibold">
                <span>${S().esc(o.nie_bpom || '-')}</span>
                ${o.nie_bpom ? `<button type="button" onclick="window.copyToClipboard('${S().esc(o.nie_bpom)}','NIE BPOM')" class="ons-copy-btn">📋</button>` : ''}
              </div>
            </div>
            <div class="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-700">
              <span style="color:var(--ons-text-soft)">Kode KFA Kemenkes:</span>
              <div class="flex items-center gap-1 font-mono-num font-semibold">
                <span class="text-blue-600">${S().esc(o.kode_kfa || o.id_obat)}</span>
                ${o.kode_kfa ? `<button type="button" onclick="window.copyToClipboard('${S().esc(o.kode_kfa)}','Kode KFA')" class="ons-copy-btn">📋</button>` : ''}
              </div>
            </div>
            <div class="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-700">
              <span style="color:var(--ons-text-soft)">Penyimpanan &amp; Suhu:</span>
              <span class="font-semibold ${m.isCold ? 'text-blue-600 font-bold' : ''}">${S().esc(o.suhu_simpan || 'Suhu Ruang (15-25°C)')}</span>
            </div>
            <div class="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-700">
              <span style="color:var(--ons-text-soft)">Lokasi Rak Fisik:</span>
              <span class="font-mono-num font-semibold">${S().esc(o.rak_lokasi || 'RAK-UTAMA')}</span>
            </div>
            <div class="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-700">
              <span style="color:var(--ons-text-soft)">Distributor PBF Utama:</span>
              <span class="font-semibold">${S().esc(o.pbf_utama || 'PBF Resmi Apotek')}</span>
            </div>
            <div class="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-700">
              <span style="color:var(--ons-text-soft)">HET Pemerintah:</span>
              <span class="font-mono-num font-semibold text-slate-500">${S().rp(hetVal)}</span>
            </div>
            <div class="sm:col-span-2 py-1 border-b border-slate-200 dark:border-slate-700">
              <span style="color:var(--ons-text-soft)">Konversi Multi-Satuan:</span>
              <span class="font-mono-num font-semibold ml-2">1 ${S().esc(o.satuan_besar || 'Box')} = ${Number(o.rasio_besar || 100)} ${S().esc(o.satuan_dasar || 'Unit')} &bull; 1 ${S().esc(o.satuan_sedang || 'Strip')} = ${Number(o.rasio_sedang || 10)} ${S().esc(o.satuan_dasar || 'Unit')}</span>
            </div>
            ${subNames.length ? `
            <div class="sm:col-span-2 py-1">
              <span style="color:var(--ons-text-soft)">Substitusi Generik Tersedia:</span>
              <span class="font-semibold text-emerald-600 ml-2">${S().esc(subNames.join(', '))}</span>
            </div>` : ''}
          </div>
        </div>

        <div class="p-3.5 rounded-xl border space-y-2" style="border-color:var(--ons-border)">
          <div class="font-bold text-xs text-slate-800 dark:text-slate-200">Informasi Penggunaan &amp; Catatan Klinis</div>
          <div class="text-xs space-y-1.5" style="color:var(--ons-text-soft)">
            <div><b>Aturan Pakai Standar:</b> ${S().esc(o.aturan_pakai || 'Gunakan sesuai instruksi dokter atau etiket farmasi.')}</div>
            <div><b>Catatan Farmasis:</b> ${S().esc(o.catatan_klinis || o.indikasi || 'Konsultasikan dengan Apoteker Penanggung Jawab (APJ) untuk instruksi penggunaan khusus.')}</div>
          </div>
        </div>
      </div>

      <div id="detailTabContentRiwayatBeli" class="space-y-4 ${isRiw ? '' : 'hidden'}">
        ${_renderObatPurchaseHistoryTabHtml(idObat)}
      </div>

      <div id="detailTabContentBatch" class="space-y-4 ${isBatch ? '' : 'hidden'}">
        <div class="p-3.5 rounded-xl border space-y-2" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
          <div class="flex items-center justify-between text-xs font-semibold">
            <span>Buffer Stok &amp; Ambang Restok</span>
            <span class="font-mono-num font-bold" style="color:${m.stokTone.color}">${m.stok} / Min: ${m.min} (Max: ${m.max})</span>
          </div>
          <div class="ons-stock-track"><div class="ons-stock-fill" style="width:${Math.max(4, Math.min(100, m.pct))}%;background:${m.stokTone.bar}"></div></div>
          <div class="flex justify-between text-[10.5px] text-slate-400 font-mono-num">
            <span>Status: <b style="color:${m.stokTone.color}">${m.stokTone.label}</b></span>
            <span>${m.isCritical ? '⚠️ Perlu pemesanan ke distributor PBF' : '✓ Stok memenuhi cadangan aman'}</span>
          </div>
        </div>

        <div>
          <div class="flex items-center justify-between mb-1.5">
            <span class="font-bold text-xs">Daftar Batch Aktif FEFO (${batches.length} Batch)</span>
            <span class="text-[10px] text-slate-400">Urutan First Expired First Out</span>
          </div>
          <div class="ons-table-wrap max-h-56 overflow-y-auto">
            <table class="ons-table">
              <thead><tr><th>No. Batch</th><th>Kadaluarsa</th><th>Sisa Qty</th><th>Lokasi Rak</th><th>Faktur PBF</th></tr></thead>
              <tbody>
                ${batches.length ? batches.map((b) => {
                  const days = S().daysUntil(b.tgl_kadaluarsa);
                  const isExp = days <= 0;
                  const isNear = days > 0 && days <= 90;
                  return `<tr>
                    <td class="font-mono-num font-bold text-xs">${S().esc(b.no_batch)}</td>
                    <td class="font-mono-num text-xs ${isExp ? 'text-red-700 font-extrabold' : (isNear ? 'text-red-600 font-bold' : '')}">
                      ${S().esc(b.tgl_kadaluarsa)}
                      <span class="text-[10px] block ${isExp ? 'text-red-700' : (isNear ? 'text-red-600' : 'text-slate-400')}">
                        ${isExp ? 'EXPIRED' : (days + 'h lagi')}
                      </span>
                    </td>
                    <td class="font-mono-num font-bold text-xs">${Number(b.qty_sisa || 0)} ${S().esc(o.satuan_dasar || 'Unit')}</td>
                    <td class="font-mono-num text-xs">${S().esc(b.rak_penyimpanan || o.rak_lokasi || '-')}</td>
                    <td class="font-mono-num text-xs text-slate-400">${S().esc(b.no_faktur_pbf || '-')}</td>
                  </tr>`;
                }).join('') : '<tr><td colspan="5" class="text-center py-6 text-xs" style="color:var(--ons-text-soft)">Stok batch kosong — segera lakukan PO atau Mutasi Masuk.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>

        ${multiOn && branches.length > 1 ? `<div class="p-3 rounded-xl border space-y-2" style="border-color:var(--ons-border)">
          <div class="font-bold text-xs">Komparasi Stok Antar-Outlet Real-Time</div>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
            ${branches.map((br) => {
              const qBr = br === (st.cabangId || 'ONS-01') ? m.stok : Number(perCb[br] || 0);
              return `<div class="p-2 rounded-lg text-center border" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
                <div class="text-[10px] font-bold">${S().esc(br)}</div>
                <div class="text-sm font-extrabold font-mono-num ${qBr > 0 ? 'text-emerald-600' : 'text-red-500'}">${qBr} ${S().esc(o.satuan_dasar || 'Unit')}</div>
              </div>`;
            }).join('')}
          </div>
        </div>` : ''}
      </div>

      <div class="flex flex-wrap items-center justify-between gap-2 pt-3 border-t" style="border-color:var(--ons-border)">
        <div class="flex flex-wrap gap-2">
          <button type="button" onclick="ONSStore.closeDrawer();window.openObatKartuStok('${S().esc(o.id_obat)}')" class="ons-btn ons-btn-ghost text-xs py-1.5 px-2.5" title="Lihat Kartu Stok Lengkap">📊 Kartu Stok</button>
          <button type="button" onclick="window.openProductBarcodeModal('${S().esc(o.id_obat)}')" class="ons-btn ons-btn-ghost text-xs py-1.5 px-2.5" title="Cetak Barcode Label Stiker 58/80mm">🏷️ Cetak Barcode</button>
          <button type="button" onclick="window.setObatDetailTab('riwayat-beli')" class="ons-btn ons-btn-ghost text-xs py-1.5 px-2.5 text-blue-700 font-semibold" title="Buka Riwayat Pembelian PBF &amp; Hitung Margin">📈 Riwayat Beli</button>
        </div>
        <div class="flex gap-2">
          <button type="button" onclick="ONSStore.closeDrawer();navigateView('defecta','sp')" class="ons-btn ons-btn-ghost text-xs py-1.5 px-2.5" title="Buka Form Pemesanan SP Defecta">🛒 Buat SP</button>
          ${seeCost ? `<button type="button" onclick="ONSStore.closeDrawer();window.openObatWizardModal('${S().esc(o.id_obat)}')" class="ons-btn ons-btn-primary text-xs py-1.5 px-3 font-bold">✏️ Edit Produk</button>` : ''}
        </div>
      </div>
    </div>`, '660px');
  };

  global.exportMasterObat = (fmt) => {
    const mode = String(fmt || 'xlsx').toLowerCase();
    const seeCost = S().canSeeFinancialCost();
    const prof = S().getStoreProfile ? S().getStoreProfile() : {};
    const usahaNama = prof.nama_usaha || 'Apotek ONS Farma';
    const { allMeta, filtered } = _getFilteredMasterObatMeta();
    const list = filtered.length ? filtered : allMeta;
    const isFilteredView = filtered.length > 0 && filtered.length < allMeta.length;

    const rows = list.map((m, i) => {
      const o = m.o;
      const edIso = (m.nearBatch && m.nearBatch.tgl_kadaluarsa) ? String(m.nearBatch.tgl_kadaluarsa).slice(0, 10) : '';
      const valModal = seeCost ? (Number(m.stok || 0) * Number(o.hpp_avg || 0)) : 0;
      const marginDecimal = (seeCost && Number(o.hpp_avg || 0) > 0 && Number(o.harga_umum || 0) > 0)
        ? Number((((Number(o.harga_umum || 0) - Number(o.hpp_avg || 0)) / Number(o.hpp_avg || 0)) * 100).toFixed(1))
        : 0;
      return {
        no: i + 1,
        kode_kfa: o.kode_kfa || o.id_obat || '',
        nama_dagang: o.nama_dagang || '',
        zat_aktif: o.zat_aktif || '',
        kekuatan: o.kekuatan || '',
        golongan_bpom: String(o.golongan_bpom || 'BEBAS').toUpperCase(),
        bentuk_sediaan: o.bentuk_sediaan || 'Tablet',
        nie_bpom: o.nie_bpom || '-',
        rak_lokasi: o.rak_lokasi || 'RAK-A1',
        suhu_simpan: o.suhu_simpan || 'Suhu Ruang (15-25 C)',
        satuan_dasar: o.satuan_dasar || 'Tablet',
        satuan_sedang: o.satuan_sedang || 'Strip',
        rasio_sedang: Number(o.rasio_sedang || 10),
        satuan_besar: o.satuan_besar || 'Box',
        rasio_besar: Number(o.rasio_besar || 100),
        stok_jual: Number(m.stok || 0),
        stok_min: Number(o.stok_min || 10),
        stok_max: Number(o.stok_max || 100),
        status_stok: m.stokTone.label.toUpperCase(),
        ed_terdekat: edIso || '-',
        hpp_avg: seeCost ? Number(o.hpp_avg || 0) : 0,
        valuasi_modal: valModal,
        margin_pct: marginDecimal,
        harga_umum: Number(o.harga_umum || 0),
        harga_member: Number(o.harga_member || o.harga_umum || 0),
        harga_grosir: Number(o.harga_grosir || o.harga_member || o.harga_umum || 0),
        min_qty_grosir: Number(o.min_qty_grosir || 10),
        harga_faskes: Number(o.harga_faskes || o.harga_grosir || o.harga_umum || 0),
        pbf_utama: o.pbf_utama || '-',
        ed_pdf: edIso ? `${edIso} (${m.edDays <= 0 ? 'ED' : m.edDays + 'h'})` : '-'
      };
    });

    const isPrintable = mode === 'pdf' || mode === 'doc';
    const hdrs = isPrintable ? [
      { key: 'no', label: 'No', type: 'int', width: 6 },
      { key: 'kode_kfa', label: 'Kode KFA', type: 'text', width: 14 },
      { key: 'nama_dagang', label: 'Nama Dagang', type: 'wrap', width: 26 },
      { key: 'zat_aktif', label: 'Zat Aktif', type: 'wrap', width: 22 },
      { key: 'golongan_bpom', label: 'Golongan', type: 'status', width: 13 },
      { key: 'rak_lokasi', label: 'Rak', type: 'text', width: 10 },
      { key: 'satuan_dasar', label: 'Satuan', type: 'text', width: 11 },
      { key: 'stok_jual', label: 'Stok', type: 'int', sum: true, width: 10 },
      { key: 'status_stok', label: 'Status', type: 'status', width: 11 },
      { key: 'ed_pdf', label: 'ED Terdekat', type: 'text', width: 16 },
      ...(seeCost ? [{ key: 'hpp_avg', label: 'HPP Avg (Rp)', type: 'currency', width: 15 }] : []),
      { key: 'harga_umum', label: 'Harga Umum (Rp)', type: 'currency', width: 15 },
      { key: 'harga_member', label: 'Member (Rp)', type: 'currency', width: 15 }
    ] : [
      { key: 'kode_kfa', label: 'Kode KFA', type: 'text', width: 15 },
      { key: 'nama_dagang', label: 'Nama Dagang', type: 'wrap', width: 30 },
      { key: 'zat_aktif', label: 'Zat Aktif', type: 'wrap', width: 24 },
      { key: 'kekuatan', label: 'Kekuatan', type: 'text', width: 13 },
      { key: 'golongan_bpom', label: 'Golongan BPOM', type: 'status', width: 16 },
      { key: 'bentuk_sediaan', label: 'Bentuk Sediaan', type: 'text', width: 15 },
      { key: 'nie_bpom', label: 'NIE BPOM', type: 'text', width: 19 },
      { key: 'rak_lokasi', label: 'Rak Lokasi', type: 'text', width: 12 },
      { key: 'suhu_simpan', label: 'Suhu Simpan', type: 'text', width: 22 },
      { key: 'satuan_dasar', label: 'Satuan Dasar', type: 'text', width: 14 },
      { key: 'satuan_sedang', label: 'Satuan Sedang', type: 'text', width: 14 },
      { key: 'rasio_sedang', label: 'Rasio Sedang', type: 'int', width: 13 },
      { key: 'satuan_besar', label: 'Satuan Besar', type: 'text', width: 14 },
      { key: 'rasio_besar', label: 'Rasio Besar', type: 'int', width: 13 },
      { key: 'stok_jual', label: 'Stok Layak Jual', type: 'int', sum: true, width: 16 },
      { key: 'stok_min', label: 'Stok Min', type: 'int', width: 11 },
      { key: 'stok_max', label: 'Stok Max', type: 'int', width: 11 },
      { key: 'status_stok', label: 'Status Stok', type: 'status', width: 14 },
      { key: 'ed_terdekat', label: 'ED Terdekat', type: 'date', width: 14 },
      ...(seeCost ? [
        { key: 'hpp_avg', label: 'HPP Avg (Rp)', type: 'currency', width: 16 },
        { key: 'valuasi_modal', label: 'Valuasi Modal (Rp)', type: 'currency', sum: true, width: 20 },
        { key: 'margin_pct', label: 'Margin (%)', type: 'percent', width: 12 }
      ] : []),
      { key: 'harga_umum', label: 'Harga Umum (Rp)', type: 'currency', width: 16 },
      { key: 'harga_member', label: 'Harga Member (Rp)', type: 'currency', width: 16 },
      { key: 'harga_grosir', label: 'Harga Grosir (Rp)', type: 'currency', width: 16 },
      { key: 'min_qty_grosir', label: 'Min Grosir', type: 'int', width: 12 },
      { key: 'harga_faskes', label: 'Harga Faskes (Rp)', type: 'currency', width: 16 },
      { key: 'pbf_utama', label: 'PBF Utama', type: 'text', width: 20 }
    ];

    const extraSheets = [];
    if (mode === 'xlsx' && global.ONSXlsxExport) {
      const XS = global.ONSXlsxExport.STYLE;
      const c = global.ONSXlsxExport.cell;
      const totStok = list.reduce((a, m) => a + m.stok, 0);
      const totVal = seeCost ? list.reduce((a, m) => a + (m.stok * m.hpp), 0) : 0;
      const cntAman = list.filter((m) => !m.isCritical).length;
      const cntCrit = list.filter((m) => m.isCritical).length;
      const cntNearEd = list.filter((m) => m.isNearEd).length;
      const golOrder = ['BEBAS', 'TERBATAS', 'KERAS', 'PREKURSOR', 'OOT', 'PSIKOTROPIKA', 'NARKOTIKA'];
      const golRows = golOrder.map((g, gi) => {
        const sub = list.filter((m) => String(m.o.golongan_bpom || 'BEBAS').toUpperCase() === g);
        if (!sub.length) return null;
        return [c('Golongan ' + g, gi % 2 ? XS.TEXT_ALT : XS.TEXT), c(sub.length, gi % 2 ? XS.INT_ALT : XS.INT, 'n')];
      }).filter(Boolean);

      extraSheets.push({
        name: 'Ringkasan_Katalog',
        freezeRows: 2,
        widths: [36, 26],
        rowHeights: { 1: 28, 2: 20 },
        merges: ['A1:B1', 'A2:B2'],
        rows: [
          [c('RINGKASAN KATALOG MASTER OBAT', XS.TITLE), c('', XS.TITLE)],
          [c(usahaNama + ' | Dicetak: ' + new Date().toLocaleString('id-ID'), XS.SUBTITLE), c('', XS.SUBTITLE)],
          [c('Indikator Katalog', XS.HEADER), c('Nilai', XS.HEADER)],
          [c('Total Produk Terdaftar (SKU)', XS.TEXT), c(list.length, XS.INT, 'n')],
          [c('Total Stok Layak Jual (Unit)', XS.TEXT_ALT), c(totStok, XS.INT_ALT, 'n')],
          [c('Produk Stok Aman', XS.GOOD), c(cntAman, XS.INT, 'n')],
          [c('Produk Stok Menipis / Habis', cntCrit ? XS.WARN : XS.GOOD), c(cntCrit, XS.INT_ALT, 'n')],
          [c('Produk Near-ED (<= 90 Hari)', cntNearEd ? XS.DANGER : XS.GOOD), c(cntNearEd, XS.INT, 'n')],
          ...(seeCost ? [[c('Total Valuasi Modal Stok (HPP)', XS.SECTION), c(totVal, XS.TOTAL_CURRENCY, 'n')]] : []),
          [c('KOMPOSISI PER GOLONGAN BPOM', XS.SECTION), c('Jumlah SKU', XS.SECTION)],
          ...golRows,
          [c('Catatan Import Ulang', XS.GUIDE_LABEL), c('Sheet pertama (Master Data Obat) dapat langsung diedit lalu diunggah kembali ke menu Import Excel (.xlsx) / CSV.', XS.GUIDE_TEXT)]
        ]
      });
    }

    const titleText = 'Master Data Obat - ' + usahaNama + (isFilteredView ? ' (Terfilter)' : '');
    const dateTag = new Date().toISOString().slice(0, 10);
    S().exportDataset(mode, titleText, 'Master_Obat_ONS_Farma_' + dateTag, hdrs, rows, {
      sheetName: 'Master Data Obat',
      extraSheets
    });
  };

  global.printCode128Obat = (idObat) => {
    const o = S().AppState.masterObat.find((x) => x.id_obat === idObat);
    if (!o) return;
    S().openModal(`<div class="p-6 text-center space-y-4">
      <h3 class="font-bold">Label Rak Barcode Code-128</h3>
      <div class="p-4 border rounded-xl inline-block bg-white text-black">
        <div class="font-bold text-xs mb-1">${S().esc(o.nama_dagang)}</div>
        <svg id="obatBarcodeSvg"></svg>
        <div class="text-xs font-bold mt-1">${S().rp(o.harga_umum)} / ${S().esc(o.satuan_dasar)}</div>
      </div>
      <div class="flex gap-2 justify-center">
        <button onclick="ONSStore.printHtmlZone(document.getElementById('obatBarcodeSvg').parentElement.outerHTML)" class="ons-btn ons-btn-primary text-xs">Cetak Label</button>
        <button onclick="ONSStore.closeModal()" class="ons-btn ons-btn-ghost text-xs">Tutup</button>
      </div>
    </div>`, '420px');
    setTimeout(() => {
      if (global.ONSCode128) global.ONSCode128.render('#obatBarcodeSvg', o.kode_kfa || o.id_obat, { width: 1.8, height: 48 });
    }, 30);
  };

  let wizardDraftSnapshot = null;

  function readObatWizardDraftFromDom(baseObj) {
    const val = (id, def) => {
      const el = document.getElementById(id);
      return el ? el.value : def;
    };
    const num = (id, def) => {
      const el = document.getElementById(id);
      return el ? (window.parseNumber ? window.parseNumber(el.value || 0) : Number(el.value || 0)) : Number(def || 0);
    };
    return {
      ...baseObj,
      id_obat: val('wObatId', baseObj.id_obat),
      nama_dagang: val('wNamaDagang', baseObj.nama_dagang),
      zat_aktif: val('wZatAktif', baseObj.zat_aktif),
      kode_kfa: val('wKfa', baseObj.kode_kfa),
      nie_bpom: val('wNie', baseObj.nie_bpom),
      golongan_bpom: val('wGol', baseObj.golongan_bpom),
      suhu_simpan: val('wSuhu', baseObj.suhu_simpan),
      rak_lokasi: val('wRak', baseObj.rak_lokasi),
      satuan_dasar: val('wSatDasar', baseObj.satuan_dasar),
      satuan_sedang: val('wSatSed', baseObj.satuan_sedang),
      rasio_sedang: num('wRasioSed', baseObj.rasio_sedang),
      satuan_besar: val('wSatBes', baseObj.satuan_besar),
      rasio_besar: num('wRasioBes', baseObj.rasio_besar),
      hpp_avg: num('wHpp', baseObj.hpp_avg),
      harga_umum: num('wHrgUmum', baseObj.harga_umum),
      harga_member: num('wHrgMem', baseObj.harga_member),
      harga_grosir: num('wHrgGrosir', baseObj.harga_grosir),
      min_qty_grosir: num('wMinQtyGrosir', baseObj.min_qty_grosir),
      harga_faskes: num('wHrgFaskes', baseObj.harga_faskes),
      stok_min: num('wStokMin', baseObj.stok_min),
      stok_max: num('wStokMax', baseObj.stok_max),
      substitusi_ids: val('wSubstitusi', baseObj.substitusi_ids)
    };
  }

  global.openObatBatchEditModal = () => {
    global.openObatWizardModal();
  };

  global.openObatWizardModal = (editId, stepOverride, draftObj) => {
    if (stepOverride) wizardStep = Math.max(1, Math.min(5, stepOverride));
    else wizardStep = 1;
    const baseDefault = (S().AppState.masterObat || []).find((x) => x.id_obat === editId) || {
      id_obat: '', kode_kfa: '', nama_dagang: '', zat_aktif: '', kekuatan: '', golongan_bpom: 'BEBAS',
      nie_bpom: '', suhu_simpan: 'Suhu Ruang (15-25°C)', rak_lokasi: 'RAK-A1', satuan_dasar: 'Tablet',
      satuan_sedang: 'Strip', rasio_sedang: 10, satuan_besar: 'Box', rasio_besar: 100, stok_min: 10, stok_max: 100,
      hpp_avg: 0, harga_umum: 0, harga_member: 0, harga_grosir: 0, min_qty_grosir: 10, harga_faskes: 0, substitusi_ids: ''
    };
    const o = draftObj ? { ...baseDefault, ...draftObj } : baseDefault;
    wizardDraftSnapshot = o;

    const steps = [
      { n: 1, label: 'Identitas & KFA', sub: 'Nama, Zat Aktif, NIE' },
      { n: 2, label: 'Golongan & Rak', sub: 'BPOM & Suhu CDOB' },
      { n: 3, label: 'Multi-Satuan', sub: 'Dasar, Sedang, Besar' },
      { n: 4, label: 'Harga & Stok', sub: 'HPP, 4 Tier, Defecta' },
      { n: 5, label: 'Substitusi & Simpan', sub: 'Generik & Tinjauan' }
    ];
    const golList = [
      { v: 'BEBAS', label: 'Obat Bebas', dot: 'bg-emerald-500' },
      { v: 'TERBATAS', label: 'Bebas Terbatas', dot: 'bg-blue-500' },
      { v: 'KERAS', label: 'Obat Keras (K)', dot: 'bg-red-500' },
      { v: 'PREKURSOR', label: 'Prekursor', dot: 'bg-amber-500' },
      { v: 'OOT', label: 'OOT', dot: 'bg-amber-600' },
      { v: 'PSIKOTROPIKA', label: 'Psikotropika', dot: 'bg-rose-600' },
      { v: 'NARKOTIKA', label: 'Narkotika', dot: 'bg-rose-700' }
    ];
    const suhuPresets = ['Suhu Ruang (15-25°C)', 'Sejuk (8-15°C)', 'Cold Chain / Chiller (2-8°C)'];
    const rakPresets = ['RAK-A1', 'RAK-B2', 'RAK-OTC', 'LEMARI-OKT', 'CHILLER-01'];
    const unitPresets = [
      { label: 'Tablet / Strip (10) / Box (100)', d: 'Tablet', s: 'Strip', rs: 10, b: 'Box', rb: 100 },
      { label: 'Kapsul / Blister (10) / Box (30)', d: 'Kapsul', s: 'Blister', rs: 10, b: 'Box', rb: 30 },
      { label: 'Botol / Paket (1) / Box (12)', d: 'Botol', s: 'Paket', rs: 1, b: 'Box', rb: 12 },
      { label: 'Tube / Pcs Tunggal', d: 'Tube', s: 'Pack', rs: 5, b: 'Box', rb: 25 }
    ];
    const otherMeds = (S().AppState.masterObat || []).filter((m) => m.id_obat !== o.id_obat).slice(0, 10);
    const curSubs = String(o.substitusi_ids || '').split(',').map((s) => s.trim()).filter(Boolean);

    const secCls = (n) => (!wizardFullScrollMode && wizardStep !== n) ? 'hidden' : 'ons-wiz-card';
    const inpCls = 'ons-input min-h-[44px] text-sm';

    const renderForm = () => `
      <div data-ws-custom="1" class="ons-wiz-shell">
        <header class="ons-wiz-header">
          <div class="flex items-center gap-3 min-w-0">
            <button type="button" onclick="ONSStore.closeModal()" class="ons-ws-back-btn">
              <svg viewBox="0 0 24 24" class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
              <span>Kembali</span>
            </button>
            <div class="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <svg viewBox="0 0 24 24" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg>
            </div>
            <div class="min-w-0">
              <h2 class="font-extrabold text-base md:text-lg tracking-tight truncate">${o.id_obat ? 'Edit Produk Obat: ' + S().esc(o.nama_dagang) : 'Tambah Produk Obat Baru'}</h2>
              <div class="text-xs truncate" style="color:var(--ons-text-soft)">Katalog KFA SATUSEHAT &bull; Regulasi CDOB BPOM &bull; Multi-Satuan &amp; Valuasi Bertingkat</div>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2 shrink-0">
            <span id="wizCompBadge" class="ons-ws-pill font-mono-num">Kelengkapan: 0%</span>
            <button type="button" onclick="window.toggleObatWizardMode('${S().esc(editId || '')}')" class="ons-btn ons-btn-ghost text-xs min-h-[40px]">
              ${wizardFullScrollMode ? 'Ganti ke Stepper 5 Tahap' : 'Tampilkan Semua Sekaligus'}
            </button>
            <button type="button" onclick="ONSStore.closeModal()" aria-label="Tutup" class="ons-ws-close-btn" title="Tutup (Esc)">&times;</button>
          </div>
        </header>

        ${!wizardFullScrollMode ? `<div class="ons-wiz-stepper-wrap">
          <div class="max-w-[1440px] mx-auto">
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2" id="wizStepNav">
              ${steps.map((stItem) => {
                const stCls = stItem.n === wizardStep ? 'is-active' : (stItem.n < wizardStep ? 'is-done' : '');
                return `<button type="button" onclick="window.setObatWizardStep(${stItem.n})" class="ons-wiz-step-btn ${stCls}">
                  <span class="ons-wiz-step-num">${stItem.n < wizardStep ? '&#10003;' : stItem.n}</span>
                  <div class="min-w-0">
                    <div class="font-bold text-xs truncate">${stItem.label}</div>
                    <div class="text-[11px] opacity-80 truncate hidden sm:block">${stItem.sub}</div>
                  </div>
                </button>`;
              }).join('')}
            </div>
            <div class="ons-wiz-progress-track">
              <div id="wizProgFill" class="ons-wiz-progress-fill" style="width:${(wizardStep / 5) * 100}%"></div>
            </div>
          </div>
        </div>` : ''}

        <div class="ons-wiz-body">
          <form id="obatWizardForm" novalidate onsubmit="event.preventDefault();window.saveObatFromWizard();" oninput="window.updateObatWizardPreview()" onchange="window.updateObatWizardPreview()" class="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <input type="hidden" id="wObatId" value="${S().esc(o.id_obat)}"/>

            <!-- Panel Kiri: Form Pengisian Terstruktur -->
            <div class="lg:col-span-8 space-y-5">

              <!-- TAHAP 1 -->
              <section id="wizSec1" class="${secCls(1)}">
                <div class="ons-wiz-card-head">
                  <div class="flex items-center gap-2.5">
                    <span class="w-7 h-7 rounded-lg bg-blue-600 text-white font-extrabold text-xs flex items-center justify-center">1</span>
                    <div>
                      <h3 class="font-extrabold text-sm md:text-base">Identitas &amp; Regulasi KFA / NIE BPOM</h3>
                      <p class="text-xs" style="color:var(--ons-text-soft)">Isi nama dagang resmi, kandungan zat aktif, serta kode standar Kemenkes &amp; BPOM.</p>
                    </div>
                  </div>
                  ${!o.id_obat ? `<div class="flex flex-wrap gap-1.5 items-center">
                    <span class="text-[11px] font-semibold" style="color:var(--ons-text-soft)">Templat Cepat:</span>
                    <button type="button" onclick="window.applyObatProductTemplate('tablet')" class="ons-wiz-chip text-[11px] py-1 px-2.5 min-h-[32px]">Tablet Generik</button>
                    <button type="button" onclick="window.applyObatProductTemplate('sirup')" class="ons-wiz-chip text-[11px] py-1 px-2.5 min-h-[32px]">Sirup Botol</button>
                    <button type="button" onclick="window.applyObatProductTemplate('chiller')" class="ons-wiz-chip text-[11px] py-1 px-2.5 min-h-[32px]">Insulin Chiller</button>
                  </div>` : ''}
                </div>
                <div class="p-5 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div class="md:col-span-2">
                    <label class="font-bold text-sm flex items-center gap-2 mb-1.5">
                      <span>Nama Dagang Produk</span>
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-600">Wajib *</span>
                    </label>
                    <input id="wNamaDagang" class="${inpCls} font-semibold" value="${S().esc(o.nama_dagang)}" placeholder="Cth: Paracetamol 500mg Kaplet / Amoxicillin 500mg" required/>
                    <div class="text-[11px] mt-1" style="color:var(--ons-text-soft)">Gunakan nama merek + kekuatan sediaan agar mudah dicari saat transaksi Kasir POS.</div>
                  </div>
                  <div class="md:col-span-2">
                    <label class="font-bold block mb-1.5">Zat Aktif &amp; Kekuatan</label>
                    <input id="wZatAktif" class="${inpCls}" value="${S().esc(o.zat_aktif)}" placeholder="Cth: Paracetamol 500 mg"/>
                    <div class="text-[11px] mt-1" style="color:var(--ons-text-soft)">Dipakai untuk deteksi interaksi obat CDSS &amp; pencocokan substitusi generik.</div>
                  </div>
                  <div>
                    <label class="font-bold block mb-1.5">Kode KFA SATUSEHAT</label>
                    <input id="wKfa" class="${inpCls} font-mono-num" value="${S().esc(o.kode_kfa)}" placeholder="Cth: 93001024"/>
                    <div class="text-[11px] mt-1" style="color:var(--ons-text-soft)">Kode Kamus Farmasi &amp; Alkes Kemenkes (opsional untuk OTC).</div>
                  </div>
                  <div>
                    <label class="font-bold block mb-1.5">Nomor Izin Edar (NIE BPOM)</label>
                    <input id="wNie" class="${inpCls} font-mono-num" value="${S().esc(o.nie_bpom)}" placeholder="Cth: DBL8512304504A1"/>
                    <div class="text-[11px] mt-1" style="color:var(--ons-text-soft)">Tertera pada boks/blister kemasan pabrik.</div>
                  </div>
                </div>
              </section>

              <!-- TAHAP 2 -->
              <section id="wizSec2" class="${secCls(2)}">
                <div class="ons-wiz-card-head">
                  <div class="flex items-center gap-2.5">
                    <span class="w-7 h-7 rounded-lg bg-blue-600 text-white font-extrabold text-xs flex items-center justify-center">2</span>
                    <div>
                      <h3 class="font-extrabold text-sm md:text-base">Golongan BPOM &amp; Penyimpanan CDOB</h3>
                      <p class="text-xs" style="color:var(--ons-text-soft)">Menentukan aturan otorisasi PIN APJ di Kasir, pelaporan SIPNAP, suhu, serta rak gudang.</p>
                    </div>
                  </div>
                </div>
                <div class="p-5 md:p-6 space-y-5 text-xs">
                  <div>
                    <label class="font-bold block mb-2">Pilih Golongan Regulasi BPOM</label>
                    <div id="wizGolPicker" class="flex flex-wrap gap-2 mb-3">
                      ${golList.map((g) => `<button type="button" data-gol-val="${g.v}" onclick="window.pickObatGolChip('${g.v}')" class="ons-wiz-chip ${o.golongan_bpom === g.v ? 'is-selected' : ''}">
                        <span class="w-2.5 h-2.5 rounded-full ${g.dot}"></span>
                        <span>${g.label}</span>
                      </button>`).join('')}
                    </div>
                    <select id="wGol" class="${inpCls}" onchange="window.updateObatWizardPreview()">${golList.map((g) => `<option value="${g.v}" ${o.golongan_bpom === g.v ? 'selected' : ''}>${g.v} — ${g.label}</option>`).join('')}</select>
                  </div>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label class="font-bold block mb-1.5">Suhu Penyimpanan CDOB</label>
                      <input id="wSuhu" class="${inpCls}" value="${S().esc(o.suhu_simpan)}" placeholder="Suhu Ruang (15-25°C)"/>
                      <div class="flex flex-wrap gap-1.5 mt-2">
                        ${suhuPresets.map((sp) => `<button type="button" onclick="window.pickObatFieldChip('wSuhu','${S().esc(sp)}')" class="ons-wiz-chip text-[11px] py-1 px-2.5 min-h-[30px]">${S().esc(sp)}</button>`).join('')}
                      </div>
                    </div>
                    <div>
                      <label class="font-bold block mb-1.5">Lokasi Rak / Lemari</label>
                      <input id="wRak" class="${inpCls} font-mono-num" value="${S().esc(o.rak_lokasi)}" placeholder="RAK-A1"/>
                      <div class="flex flex-wrap gap-1.5 mt-2">
                        ${rakPresets.map((rpVal) => `<button type="button" onclick="window.pickObatFieldChip('wRak','${rpVal}')" class="ons-wiz-chip text-[11px] py-1 px-2.5 min-h-[30px] font-mono-num">${rpVal}</button>`).join('')}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <!-- TAHAP 3 -->
              <section id="wizSec3" class="${secCls(3)}">
                <div class="ons-wiz-card-head">
                  <div class="flex items-center gap-2.5">
                    <span class="w-7 h-7 rounded-lg bg-blue-600 text-white font-extrabold text-xs flex items-center justify-center">3</span>
                    <div>
                      <h3 class="font-extrabold text-sm md:text-base">Konversi Multi-Satuan (Dasar / Sedang / Besar)</h3>
                      <p class="text-xs" style="color:var(--ons-text-soft)">Memudahkan konversi otomatis ketika menerima Faktur PBF per Box dan menjual eceran di Kasir.</p>
                    </div>
                  </div>
                </div>
                <div class="p-5 md:p-6 space-y-4 text-xs">
                  <div class="flex flex-wrap items-center gap-1.5">
                    <span class="text-[11px] font-bold" style="color:var(--ons-text-soft)">Preset Rasio Cepat:</span>
                    ${unitPresets.map((up) => `<button type="button" onclick="window.applyObatUnitPreset('${up.d}','${up.s}',${up.rs},'${up.b}',${up.rb})" class="ons-wiz-chip text-[11px] py-1 px-2.5 min-h-[32px]">${up.label}</button>`).join('')}
                  </div>
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="p-4 rounded-xl border space-y-2" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
                      <div class="text-[11px] font-extrabold uppercase tracking-wider text-blue-600">Satuan Dasar (Eceran)</div>
                      <label class="font-semibold block">Nama Satuan Terkecil</label>
                      <input id="wSatDasar" class="${inpCls}" value="${S().esc(o.satuan_dasar)}" placeholder="Tablet / Botol / Tube"/>
                      <div class="text-[11px]" style="color:var(--ons-text-soft)">Stok batch &amp; HPP dicatat per satuan ini.</div>
                    </div>
                    <div class="p-4 rounded-xl border space-y-2" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
                      <div class="text-[11px] font-extrabold uppercase tracking-wider text-blue-600">Satuan Sedang</div>
                      <label class="font-semibold block">Nama &amp; Isi per Satuan Dasar</label>
                      <div class="grid grid-cols-2 gap-2">
                        <input id="wSatSed" class="${inpCls}" value="${S().esc(o.satuan_sedang || 'Strip')}" placeholder="Strip"/>
                        <input id="wRasioSed" type="number" min="1" class="${inpCls} font-mono-num" value="${o.rasio_sedang}" placeholder="10"/>
                      </div>
                      <div class="text-[11px]" style="color:var(--ons-text-soft)">Misal: 1 Strip = 10 Tablet.</div>
                    </div>
                    <div class="p-4 rounded-xl border space-y-2" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
                      <div class="text-[11px] font-extrabold uppercase tracking-wider text-blue-600">Satuan Besar (Boks PBF)</div>
                      <label class="font-semibold block">Nama &amp; Isi per Satuan Dasar</label>
                      <div class="grid grid-cols-2 gap-2">
                        <input id="wSatBes" class="${inpCls}" value="${S().esc(o.satuan_besar || 'Box')}" placeholder="Box"/>
                        <input id="wRasioBes" type="number" min="1" class="${inpCls} font-mono-num" value="${o.rasio_besar}" placeholder="100"/>
                      </div>
                      <div class="text-[11px]" style="color:var(--ons-text-soft)">Misal: 1 Box = 100 Tablet.</div>
                    </div>
                  </div>
                </div>
              </section>

              <!-- TAHAP 4 -->
              <section id="wizSec4" class="${secCls(4)}">
                <div class="ons-wiz-card-head">
                  <div class="flex items-center gap-2.5">
                    <span class="w-7 h-7 rounded-lg bg-blue-600 text-white font-extrabold text-xs flex items-center justify-center">4</span>
                    <div>
                      <h3 class="font-extrabold text-sm md:text-base">Valuasi Harga Bertingkat (4 Tier) &amp; Batas Stok</h3>
                      <p class="text-xs" style="color:var(--ons-text-soft)">Atur HPP modal, 4 kategori harga jual otomatis di POS, serta batas minimum alert Defecta.</p>
                    </div>
                  </div>
                  <div class="flex flex-wrap items-center gap-1.5">
                    <span class="text-[11px] font-bold" style="color:var(--ons-text-soft)">Hitung Harga Otomatis:</span>
                    <button type="button" onclick="window.applyObatMarkupHelper(20)" class="ons-wiz-chip text-[11px] py-1 px-2.5 min-h-[32px]">+20% Margin</button>
                    <button type="button" onclick="window.applyObatMarkupHelper(25)" class="ons-wiz-chip text-[11px] py-1 px-2.5 min-h-[32px]">+25% Margin</button>
                    <button type="button" onclick="window.applyObatMarkupHelper(35)" class="ons-wiz-chip text-[11px] py-1 px-2.5 min-h-[32px]">+35% Margin</button>
                  </div>
                </div>
                <div class="p-5 md:p-6 space-y-4 text-xs">
                  ${_renderWizPurchaseHistoryBanner(o.id_obat)}
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="p-3.5 rounded-xl border" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
                      <label class="font-bold block mb-1">HPP Beli Rata-Rata (Rp)</label>
                      <input id="wHpp" type="text" inputmode="numeric" class="${inpCls} ons-currency-input font-mono-num font-bold" value="${S().formatDots(o.hpp_avg)}" oninput="window.maskNumberInput(this); window.updateObatWizardPreview();"/>
                      <div class="text-[11px] mt-1" style="color:var(--ons-text-soft)">Harga pokok modal per satuan dasar.</div>
                    </div>
                    <div class="p-3.5 rounded-xl border" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
                      <label class="font-bold block mb-1">Harga Umum / Reguler (Rp)</label>
                      <input id="wHrgUmum" type="text" inputmode="numeric" class="${inpCls} ons-currency-input font-mono-num font-bold text-blue-600" value="${S().formatDots(o.harga_umum)}" oninput="window.maskNumberInput(this); window.updateObatWizardPreview();"/>
                      <div id="wizMarginUmumTxt" class="text-[11px] mt-1 font-semibold text-emerald-600">Margin: -</div>
                    </div>
                    <div class="p-3.5 rounded-xl border" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
                      <label class="font-bold block mb-1">Harga Member (Rp)</label>
                      <input id="wHrgMem" type="text" inputmode="numeric" class="${inpCls} ons-currency-input font-mono-num font-bold" value="${S().formatDots(o.harga_member)}" oninput="window.maskNumberInput(this); window.updateObatWizardPreview();"/>
                      <div class="text-[11px] mt-1" style="color:var(--ons-text-soft)">Aktif otomatis untuk pelanggan member terdaftar.</div>
                    </div>
                    <div>
                      <label class="font-bold block mb-1.5">Harga Grosir / B2B (Rp)</label>
                      <input id="wHrgGrosir" type="text" inputmode="numeric" class="${inpCls} ons-currency-input font-mono-num" value="${S().formatDots(o.harga_grosir || o.harga_member)}" oninput="window.maskNumberInput(this); window.updateObatWizardPreview();"/>
                    </div>
                    <div>
                      <label class="font-bold block mb-1.5">Minimal Qty Grosir</label>
                      <input id="wMinQtyGrosir" type="number" min="1" class="${inpCls} font-mono-num" value="${o.min_qty_grosir || 10}"/>
                    </div>
                    <div>
                      <label class="font-bold block mb-1.5">Harga Faskes / Klinik Mitra (Rp)</label>
                      <input id="wHrgFaskes" type="text" inputmode="numeric" class="${inpCls} ons-currency-input font-mono-num" value="${S().formatDots(o.harga_faskes || o.harga_grosir || o.harga_member || o.harga_umum)}" oninput="window.maskNumberInput(this); window.updateObatWizardPreview();"/>
                    </div>
                  </div>
                  <div id="wizStep4MarginHint" class="hidden p-3 rounded-xl border border-red-400 bg-red-500/10 text-red-600 font-semibold text-xs"></div>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t" style="border-color:var(--ons-border)">
                    <div>
                      <label class="font-bold block mb-1.5">Stok Minimum (Alert Defecta)</label>
                      <input id="wStokMin" type="number" min="0" class="${inpCls} font-mono-num" value="${o.stok_min}"/>
                      <div class="text-[11px] mt-1" style="color:var(--ons-text-soft)">Sistem memberi notifikasi pesan ulang jika total batch &le; angka ini.</div>
                    </div>
                    <div>
                      <label class="font-bold block mb-1.5">Stok Maksimum Gudang</label>
                      <input id="wStokMax" type="number" min="1" class="${inpCls} font-mono-num" value="${o.stok_max || 100}"/>
                      <div class="text-[11px] mt-1" style="color:var(--ons-text-soft)">Acuan kuantitas ideal saat membuat Surat Pesanan PBF.</div>
                    </div>
                  </div>
                </div>
              </section>

              <!-- TAHAP 5 -->
              <section id="wizSec5" class="${secCls(5)}">
                <div class="ons-wiz-card-head">
                  <div class="flex items-center gap-2.5">
                    <span class="w-7 h-7 rounded-lg bg-emerald-600 text-white font-extrabold text-xs flex items-center justify-center">5</span>
                    <div>
                      <h3 class="font-extrabold text-sm md:text-base">Substitusi Generik &amp; Konfirmasi Simpan</h3>
                      <p class="text-xs" style="color:var(--ons-text-soft)">Pilih produk pengganti aman jika stok utama sedang kosong atau kadaluarsa.</p>
                    </div>
                  </div>
                </div>
                <div class="p-5 md:p-6 space-y-4 text-xs">
                  <div>
                    <label class="font-bold block mb-1.5">ID Obat Substitusi Terapeutik (pisahkan koma)</label>
                    <input id="wSubstitusi" class="${inpCls} font-mono-num" value="${S().esc(o.substitusi_ids || '')}" placeholder="Cth: OBT-002, OBT-005"/>
                  </div>
                  ${otherMeds.length ? `<div>
                    <div class="font-bold mb-2" style="color:var(--ons-text-soft)">Klik Cepat Produk Apotek untuk Tambah/Hapus Substitusi:</div>
                    <div id="wizSubPicker" class="flex flex-wrap gap-1.5">
                      ${otherMeds.map((m) => {
                        const sel = curSubs.includes(m.id_obat);
                        return `<button type="button" data-sub-id="${S().esc(m.id_obat)}" onclick="window.toggleObatSubstitusiTag('${S().esc(m.id_obat)}')" class="ons-wiz-chip text-[11px] py-1 px-2.5 min-h-[34px] ${sel ? 'is-selected' : ''}">
                          <span class="font-mono-num font-bold">${S().esc(m.id_obat)}</span>
                          <span>${S().esc(m.nama_dagang)}</span>
                        </button>`;
                      }).join('')}
                    </div>
                  </div>` : ''}
                  <div class="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-1.5">
                    <div class="font-extrabold text-emerald-700 dark:text-emerald-300">Siap Disimpan ke Master Katalog &amp; Disinkronkan</div>
                    <p style="color:var(--ons-text-soft)">Produk ini akan langsung tersedia di Kasir POS FEFO, Pembelian &amp; Scan Faktur PBF, Stock Opname Gudang, serta Katalog Digital.</p>
                  </div>
                </div>
              </section>

            </div>

            <!-- Panel Kanan: Pratinjau Kartu Produk Real-Time -->
            <aside class="lg:col-span-4 space-y-4 lg:sticky lg:top-0">
              <div class="ons-wiz-preview">
                <div class="px-4 py-3 border-b flex items-center justify-between gap-2" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
                  <span class="font-extrabold text-xs uppercase tracking-wider text-blue-600">Pratinjau Kartu Produk (Live)</span>
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-600/10 text-blue-600">Preview POS</span>
                </div>
                <div class="p-4 space-y-3.5 text-xs">
                  <div class="p-3.5 rounded-xl border space-y-2" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
                    <div class="flex items-start justify-between gap-2">
                      <div class="min-w-0">
                        <div id="wizPrevNama" class="font-extrabold text-sm leading-snug break-words">-</div>
                        <div id="wizPrevZat" class="text-[11px] mt-0.5 truncate" style="color:var(--ons-text-soft)">-</div>
                      </div>
                      <span id="wizPrevBpom" class="badge-bpom bpom-bebas shrink-0">BEBAS</span>
                    </div>
                    <div id="wizPrevKode" class="text-[11px] font-mono-num" style="color:var(--ons-text-soft)">KFA: - &bull; NIE: -</div>
                    <div id="wizPrevLokasi" class="text-[11px]" style="color:var(--ons-text-soft)">Rak: - &bull; Suhu: -</div>
                  </div>

                  <div class="p-3 rounded-xl border space-y-1.5" style="border-color:var(--ons-border)">
                    <div class="text-[11px] font-bold uppercase tracking-wide" style="color:var(--ons-text-soft)">Konversi Satuan</div>
                    <div id="wizPrevRasio" class="font-mono-num font-bold text-xs text-blue-600">-</div>
                  </div>

                  <div class="p-3 rounded-xl border space-y-2" style="border-color:var(--ons-border)">
                    <div class="flex items-center justify-between">
                      <span class="text-[11px] font-bold uppercase tracking-wide" style="color:var(--ons-text-soft)">Estimasi Harga &amp; Profit</span>
                      <span id="wizPrevMargin" class="font-mono-num text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600">Margin 0%</span>
                    </div>
                    <div class="flex items-baseline justify-between">
                      <span id="wizPrevUmum" class="font-mono-num font-extrabold text-lg text-blue-600">Rp 0</span>
                      <span id="wizPrevHpp" class="font-mono-num text-[11px]" style="color:var(--ons-text-soft)">HPP: Rp 0</span>
                    </div>
                    <div id="wizPrevTierGrid" class="grid grid-cols-3 gap-1.5 pt-2 border-t text-[11px] font-mono-num" style="border-color:var(--ons-border)"></div>
                  </div>

                  <div>
                    <div class="flex justify-between text-[11px] font-semibold mb-1">
                      <span>Skor Kelengkapan Data</span>
                      <span id="wizCompPctSide" class="font-mono-num text-blue-600">0%</span>
                    </div>
                    <div class="w-full h-2 rounded-full overflow-hidden" style="background:var(--ons-bg-subtle)">
                      <div id="wizCompBar" class="h-full rounded-full transition-all duration-200 bg-blue-600" style="width:0%"></div>
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </form>
        </div>

        <footer class="ons-wiz-footer" id="wizFooterBar">
          <div class="flex gap-2">
            <button type="button" onclick="ONSStore.closeModal()" class="ons-btn ons-btn-ghost min-h-[42px]">Batal</button>
            ${!wizardFullScrollMode && wizardStep > 1 ? `<button type="button" id="wizPrevBtn" onclick="window.setObatWizardStep(window._wizCurStep - 1)" class="ons-btn ons-btn-ghost min-h-[42px]">&larr; Sebelumnya</button>` : ''}
          </div>
          <div id="wizFooterStepLabel" class="hidden sm:block text-xs font-bold font-mono-num" style="color:var(--ons-text-soft)">
            ${wizardFullScrollMode ? 'Mode Scroll Penuh &bull; Semua 5 Tahap' : 'Langkah ' + wizardStep + ' dari 5'}
          </div>
          <div class="flex gap-2" id="wizFooterRight">
            ${!wizardFullScrollMode && wizardStep < 5 ? `<button type="button" id="wizNextBtn" onclick="window.setObatWizardStep(window._wizCurStep + 1)" class="ons-btn ons-btn-primary min-h-[42px]">Lanjut Langkah Berikutnya &rarr;</button>` : ''}
            ${(wizardFullScrollMode || wizardStep === 5) ? `<button type="submit" form="obatWizardForm" class="ons-btn ons-btn-emerald min-h-[42px] px-5">&#9989; Simpan Produk ke Master Obat</button>` : ''}
          </div>
        </footer>
      </div>`;
    global._wizCurStep = wizardStep;
    S().openModal(renderForm(), 'full');
    global.updateObatWizardPreview();
  };

  global.updateObatWizardPreview = () => {
    const val = (id, fb = '') => {
      const el = document.getElementById(id);
      return el ? String(el.value || '').trim() : fb;
    };
    const num = (id) => {
      const el = document.getElementById(id);
      return el ? (window.parseNumber ? window.parseNumber(el.value || 0) : Number(el.value || 0)) : 0;
    };
    const nama = val('wNamaDagang') || 'Nama Obat Belum Diisi';
    const zat = val('wZatAktif') || 'Zat aktif & kekuatan belum diisi';
    const kfa = val('wKfa') || '-';
    const nie = val('wNie') || '-';
    const gol = val('wGol', 'BEBAS');
    const suhu = val('wSuhu') || '-';
    const rak = val('wRak') || '-';
    const satD = val('wSatDasar') || 'Unit';
    const satS = val('wSatSed') || 'Strip';
    const rasS = Math.max(1, num('wRasioSed') || 10);
    const satB = val('wSatBes') || 'Box';
    const rasB = Math.max(1, num('wRasioBes') || 100);
    const hpp = Math.max(0, num('wHpp'));
    const umum = Math.max(0, num('wHrgUmum'));
    const mem = Math.max(0, num('wHrgMem'));
    const grosir = Math.max(0, num('wHrgGrosir'));
    const faskes = Math.max(0, num('wHrgFaskes'));

    const setTxt = (id, t) => { const e = document.getElementById(id); if (e) e.textContent = t; };
    setTxt('wizPrevNama', nama);
    setTxt('wizPrevZat', zat);
    setTxt('wizPrevKode', `KFA: ${kfa} • NIE: ${nie}`);
    setTxt('wizPrevLokasi', `Rak: ${rak} • ${suhu}`);
    setTxt('wizPrevRasio', `1 ${satB} = ${rasB} ${satD}  |  1 ${satS} = ${rasS} ${satD}`);
    setTxt('wizPrevUmum', `${S().rp(umum)} / ${satD}`);
    setTxt('wizPrevHpp', `HPP: ${S().rp(hpp)}`);

    const badge = document.getElementById('wizPrevBpom');
    if (badge) {
      badge.textContent = gol;
      badge.className = 'badge-bpom shrink-0 ' + (gol === 'BEBAS' ? 'bpom-bebas' : (gol === 'TERBATAS' ? 'bpom-terbatas' : 'bpom-keras'));
    }

    const golPicker = document.getElementById('wizGolPicker');
    if (golPicker) {
      golPicker.querySelectorAll('[data-gol-val]').forEach((btn) => {
        btn.classList.toggle('is-selected', btn.getAttribute('data-gol-val') === gol);
      });
    }

    const marginPct = hpp > 0 && umum > 0 ? Math.round(((umum - hpp) / hpp) * 100) : 0;
    const laba = umum - hpp;
    const mEl = document.getElementById('wizPrevMargin');
    if (mEl) {
      mEl.textContent = hpp > 0 && umum > 0 ? `Margin ${marginPct >= 0 ? '+' : ''}${marginPct}%` : 'Belum dihitung';
      mEl.className = 'font-mono-num text-[11px] font-bold px-2 py-0.5 rounded ' + (hpp > 0 && umum > 0 && umum < hpp ? 'bg-red-500/15 text-red-600' : 'bg-emerald-500/15 text-emerald-600');
    }
    const mHint = document.getElementById('wizMarginUmumTxt');
    if (mHint) {
      if (hpp > 0 && umum > 0) {
        mHint.textContent = umum < hpp ? `Rugi ${S().rp(hpp - umum)} (${marginPct}%) di bawah HPP!` : `Margin: +${marginPct}% (Laba ${S().rp(laba)}/${satD})`;
        mHint.className = 'text-[11px] mt-1 font-semibold ' + (umum < hpp ? 'text-red-600' : 'text-emerald-600');
      } else {
        mHint.textContent = 'Isi HPP & Harga Umum untuk lihat margin.';
        mHint.className = 'text-[11px] mt-1';
      }
    }
    const antiRugiEl = document.getElementById('wizStep4MarginHint');
    if (antiRugiEl) {
      const below = hpp > 0 && ((umum > 0 && umum < hpp) || (mem > 0 && mem < hpp) || (grosir > 0 && grosir < hpp) || (faskes > 0 && faskes < hpp));
      if (below) {
        antiRugiEl.classList.remove('hidden');
        antiRugiEl.textContent = `Peringatan Anti-Rugi: Ada harga tier yang lebih rendah dari HPP (${S().rp(hpp)}).`;
      } else {
        antiRugiEl.classList.add('hidden');
      }
    }

    const tierGrid = document.getElementById('wizPrevTierGrid');
    if (tierGrid) {
      tierGrid.innerHTML = `
        <div><div style="color:var(--ons-text-soft)">Member</div><div class="font-bold">${S().rp(mem)}</div></div>
        <div><div style="color:var(--ons-text-soft)">Grosir</div><div class="font-bold">${S().rp(grosir)}</div></div>
        <div><div style="color:var(--ons-text-soft)">Faskes</div><div class="font-bold">${S().rp(faskes)}</div></div>`;
    }

    const checks = [
      Boolean(val('wNamaDagang')),
      Boolean(val('wZatAktif')),
      Boolean(val('wKfa') || val('wNie')),
      Boolean(val('wGol') && val('wRak')),
      Boolean(val('wSatDasar')),
      umum > 0
    ];
    const pct = Math.round((checks.filter(Boolean).length / checks.length) * 100);
    setTxt('wizCompBadge', `Kelengkapan: ${pct}%`);
    setTxt('wizCompPctSide', `${pct}%`);
    const bar = document.getElementById('wizCompBar');
    if (bar) bar.style.width = pct + '%';
  };

  global.pickObatGolChip = (gol) => {
    const sel = document.getElementById('wGol');
    if (sel) sel.value = gol;
    global.updateObatWizardPreview();
  };

  global.pickObatFieldChip = (inputId, v) => {
    const el = document.getElementById(inputId);
    if (el) el.value = v;
    global.updateObatWizardPreview();
  };

  global.applyObatUnitPreset = (d, s, rs, b, rb) => {
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
    set('wSatDasar', d);
    set('wSatSed', s);
    set('wRasioSed', rs);
    set('wSatBes', b);
    set('wRasioBes', rb);
    global.updateObatWizardPreview();
  };

  global.applyObatMarkupHelper = (pct) => {
    const hpp = window.parseNumber ? window.parseNumber((document.getElementById('wHpp') || {}).value || 0) : Number((document.getElementById('wHpp') || {}).value || 0);
    if (hpp <= 0) {
      global.toast('Masukkan nilai HPP Beli terlebih dahulu agar markup bisa dihitung.', 'warn');
      return;
    }
    const rnd = (x) => Math.max(100, Math.round(x / 100) * 100);
    const umum = rnd(hpp * (1 + Number(pct || 25) / 100));
    const mem = rnd(Math.max(hpp, umum * 0.94));
    const grosir = rnd(Math.max(hpp, umum * 0.88));
    const faskes = rnd(Math.max(hpp, umum * 0.90));
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.value = S().formatDots(v); };
    set('wHrgUmum', umum);
    set('wHrgMem', mem);
    set('wHrgGrosir', grosir);
    set('wHrgFaskes', faskes);
    global.updateObatWizardPreview();
  };

  global.applyObatProductTemplate = (tpl) => {
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
    if (tpl === 'tablet') {
      set('wNamaDagang', 'Paracetamol 500mg Kaplet');
      set('wZatAktif', 'Paracetamol 500 mg');
      set('wGol', 'BEBAS');
      set('wSuhu', 'Suhu Ruang (15-25°C)');
      set('wRak', 'RAK-A1');
      global.applyObatUnitPreset('Tablet', 'Strip', 10, 'Box', 100);
    } else if (tpl === 'sirup') {
      set('wNamaDagang', 'Amoxicillin Dry Syrup 125mg/5ml 60ml');
      set('wZatAktif', 'Amoxicillin Trihydrate 125mg/5ml');
      set('wGol', 'KERAS');
      set('wSuhu', 'Suhu Ruang (15-25°C)');
      set('wRak', 'RAK-B2');
      global.applyObatUnitPreset('Botol', 'Paket', 1, 'Box', 12);
    } else if (tpl === 'chiller') {
      set('wNamaDagang', 'Insulin Glargine 100 IU/ml FlexPen');
      set('wZatAktif', 'Insulin Glargine 100 IU/ml');
      set('wGol', 'KERAS');
      set('wSuhu', 'Cold Chain / Chiller (2-8°C)');
      set('wRak', 'CHILLER-01');
      global.applyObatUnitPreset('Pen', 'Box', 5, 'Karton', 20);
    }
    global.updateObatWizardPreview();
  };

  global.toggleObatSubstitusiTag = (idObat) => {
    const inp = document.getElementById('wSubstitusi');
    if (!inp) return;
    const arr = String(inp.value || '').split(',').map((s) => s.trim()).filter(Boolean);
    const idx = arr.indexOf(idObat);
    if (idx >= 0) arr.splice(idx, 1);
    else arr.push(idObat);
    inp.value = arr.join(', ');
    const picker = document.getElementById('wizSubPicker');
    if (picker) {
      picker.querySelectorAll('[data-sub-id]').forEach((b) => {
        b.classList.toggle('is-selected', arr.includes(b.getAttribute('data-sub-id')));
      });
    }
  };

  global.setObatWizardStep = (nextStep) => {
    wizardStep = Math.max(1, Math.min(5, Number(nextStep || 1)));
    global._wizCurStep = wizardStep;
    for (let i = 1; i <= 5; i++) {
      const sec = document.getElementById('wizSec' + i);
      if (sec) sec.className = (!wizardFullScrollMode && wizardStep !== i) ? 'hidden' : 'ons-wiz-card';
    }
    const nav = document.getElementById('wizStepNav');
    if (nav) {
      Array.from(nav.children).forEach((btn, idx) => {
        const n = idx + 1;
        btn.classList.toggle('is-active', n === wizardStep);
        btn.classList.toggle('is-done', n < wizardStep);
        const numBadge = btn.querySelector('.ons-wiz-step-num');
        if (numBadge) numBadge.innerHTML = n < wizardStep ? '&#10003;' : String(n);
      });
    }
    const prog = document.getElementById('wizProgFill');
    if (prog) prog.style.width = ((wizardStep / 5) * 100) + '%';
    const lbl = document.getElementById('wizFooterStepLabel');
    if (lbl) lbl.textContent = wizardFullScrollMode ? 'Mode Scroll Penuh • Semua 5 Tahap' : `Langkah ${wizardStep} dari 5`;
    const fBar = document.getElementById('wizFooterBar');
    if (fBar && fBar.children.length >= 3) {
      fBar.children[0].innerHTML = `<button type="button" onclick="ONSStore.closeModal()" class="ons-btn ons-btn-ghost min-h-[42px]">Batal</button>
        ${!wizardFullScrollMode && wizardStep > 1 ? `<button type="button" id="wizPrevBtn" onclick="window.setObatWizardStep(window._wizCurStep - 1)" class="ons-btn ons-btn-ghost min-h-[42px]">&larr; Sebelumnya</button>` : ''}`;
      fBar.children[2].innerHTML = `${!wizardFullScrollMode && wizardStep < 5 ? `<button type="button" id="wizNextBtn" onclick="window.setObatWizardStep(window._wizCurStep + 1)" class="ons-btn ons-btn-primary min-h-[42px]">Lanjut Langkah Berikutnya &rarr;</button>` : ''}
        ${(wizardFullScrollMode || wizardStep === 5) ? `<button type="submit" form="obatWizardForm" class="ons-btn ons-btn-emerald min-h-[42px] px-5">&#9989; Simpan Produk ke Master Obat</button>` : ''}`;
    }
  };

  global.toggleObatWizardMode = (id) => {
    const draft = readObatWizardDraftFromDom(wizardDraftSnapshot || {});
    wizardFullScrollMode = !wizardFullScrollMode;
    global.openObatWizardModal(id, wizardStep, draft);
  };

  global.saveObatFromWizard = async () => {
    try {
      const namaEl = document.getElementById('wNamaDagang');
      if (!namaEl || !String(namaEl.value || '').trim()) {
        if (!wizardFullScrollMode && typeof global.setObatWizardStep === 'function') {
          global.setObatWizardStep(1);
        }
        global.toast('Nama Dagang Produk wajib diisi terlebih dahulu!', 'warn');
        if (namaEl) namaEl.focus();
        return;
      }
      const hppVal = Number(document.getElementById('wHpp').value || 0);
      const hUmum = Number(document.getElementById('wHrgUmum').value || 0);
      const hMem = Number(document.getElementById('wHrgMem').value || 0);
      const hGrosir = Number(document.getElementById('wHrgGrosir').value || 0);
      const minQtyGrosir = Math.max(2, Number((document.getElementById('wMinQtyGrosir') || {}).value || 10));
      const hFaskes = Number((document.getElementById('wHrgFaskes') || {}).value || 0);
      if (hppVal > 0 && ((hUmum > 0 && hUmum < hppVal) || (hMem > 0 && hMem < hppVal) || (hGrosir > 0 && hGrosir < hppVal) || (hFaskes > 0 && hFaskes < hppVal))) {
        const ok = global.confirm('PERINGATAN MARGIN (ANTI-RUGI): Terdapat tier harga jual di bawah HPP (' + S().rp(hppVal) + '). Tetap simpan?');
        if (!ok) return;
      }
      await API().callApi('obat.save', {
        id_obat: document.getElementById('wObatId').value,
        nama_dagang: document.getElementById('wNamaDagang').value,
        zat_aktif: document.getElementById('wZatAktif').value,
        kode_kfa: document.getElementById('wKfa').value,
        nie_bpom: document.getElementById('wNie').value,
        golongan_bpom: document.getElementById('wGol').value,
        suhu_simpan: document.getElementById('wSuhu').value,
        rak_lokasi: document.getElementById('wRak').value,
        satuan_dasar: document.getElementById('wSatDasar').value,
        satuan_sedang: document.getElementById('wSatSed').value,
        rasio_sedang: Number(document.getElementById('wRasioSed').value || 10),
        satuan_besar: document.getElementById('wSatBes').value,
        rasio_besar: Number(document.getElementById('wRasioBes').value || 100),
        hpp_avg: hppVal,
        harga_umum: hUmum,
        harga_member: hMem,
        harga_grosir: hGrosir,
        min_qty_grosir: minQtyGrosir,
        harga_faskes: hFaskes,
        stok_min: Number(document.getElementById('wStokMin').value || 10),
        stok_max: Number(document.getElementById('wStokMax').value || 100),
        substitusi_ids: document.getElementById('wSubstitusi').value
      }, { isWrite: true });
      S().closeModal();
      global.toast('Produk & Harga Multi-Tier berhasil disimpan ke Master Obat!', 'ok');
      await global.bootLoadState(true);
    } catch (e) { global.toast(e.message, 'err'); }
  };

  const MASTER_OBAT_IMPORT_COLUMNS = [
    { key: 'kode_kfa', label: 'kode_kfa', ket: 'Kode KFA Kemenkes (opsional, disarankan diisi)' },
    { key: 'nama_dagang', label: 'nama_dagang', ket: 'WAJIB diisi. Nama produk dagang di etalase & struk' },
    { key: 'zat_aktif', label: 'zat_aktif', ket: 'Nama zat aktif / kandungan generik' },
    { key: 'kekuatan', label: 'kekuatan', ket: 'Dosis / kekuatan sediaan (cth: 500 mg, 10 mg/5 mL)' },
    { key: 'golongan_bpom', label: 'golongan_bpom', ket: 'BEBAS | TERBATAS | KERAS | PREKURSOR | OOT | PSIKOTROPIKA | NARKOTIKA' },
    { key: 'bentuk_sediaan', label: 'bentuk_sediaan', ket: 'Tablet | Kaplet | Kapsul | Sirup | Salep | Tetes | Injeksi | Alkes' },
    { key: 'nie_bpom', label: 'nie_bpom', ket: 'Nomor Izin Edar BPOM (cth: DKL1405048817A1)' },
    { key: 'rak_lokasi', label: 'rak_lokasi', ket: 'Lokasi rak penyimpanan (cth: RAK-A1, LEMARI-KERAS)' },
    { key: 'suhu_simpan', label: 'suhu_simpan', ket: 'Suhu Ruang (15-25 C) | Kulkas (2-8 C) | Lemari Khusus' },
    { key: 'satuan_dasar', label: 'satuan_dasar', ket: 'Satuan jual terkecil (Tablet, Kapsul, Botol, Tube, Pcs)' },
    { key: 'satuan_sedang', label: 'satuan_sedang', ket: 'Satuan menengah (Strip, Blister, Botol)' },
    { key: 'rasio_sedang', label: 'rasio_sedang', ket: 'Jumlah satuan dasar per 1 satuan sedang (angka, cth: 10)' },
    { key: 'satuan_besar', label: 'satuan_besar', ket: 'Satuan kemasan besar (Box, Karton, Dus)' },
    { key: 'rasio_besar', label: 'rasio_besar', ket: 'Jumlah satuan dasar per 1 satuan besar (angka, cth: 100)' },
    { key: 'hpp_avg', label: 'hpp_avg', ket: 'Harga pokok pembelian rata-rata per satuan dasar (angka tanpa titik/Rp)' },
    { key: 'harga_umum', label: 'harga_umum', ket: 'Harga jual eceran umum per satuan dasar (>= HPP)' },
    { key: 'harga_member', label: 'harga_member', ket: 'Harga jual khusus pelanggan member terdaftar (>= HPP)' },
    { key: 'harga_grosir', label: 'harga_grosir', ket: 'Harga jual grosir minimal qty tertentu (>= HPP)' },
    { key: 'min_qty_grosir', label: 'min_qty_grosir', ket: 'Minimal beli untuk harga grosir (angka >= 2, default 10)' },
    { key: 'harga_faskes', label: 'harga_faskes', ket: 'Harga jual khusus klinik / bidan / faskes mitra' },
    { key: 'stok_min', label: 'stok_min', ket: 'Batas peringatan stok menipis (angka, default 10)' },
    { key: 'stok_max', label: 'stok_max', ket: 'Kapasitas stok maksimal yang disarankan (angka, default 100)' },
    { key: 'pbf_utama', label: 'pbf_utama', ket: 'Nama PBF / distributor pemasok utama' }
  ];

  const MASTER_OBAT_SAMPLE_ROWS = [
    ['93001105', 'Paracetamol 500mg Kaplet KF', 'Paracetamol', '500 mg', 'BEBAS', 'Kaplet', 'GBL9812416804A1', 'RAK-A1', 'Suhu Ruang (15-25 C)', 'Kaplet', 'Strip', 10, 'Box', 100, 185, 350, 300, 260, 10, 250, 50, 500, 'PT Kimia Farma Trading'],
    ['93002110', 'Cetirizine 10mg Dexa', 'Cetirizine HCl', '10 mg', 'TERBATAS', 'Tablet', 'GKL1405048817A1', 'RAK-A2', 'Suhu Ruang (15-25 C)', 'Tablet', 'Strip', 10, 'Box', 50, 350, 700, 600, 520, 10, 500, 30, 300, 'PT Anugerah Argon Medica'],
    ['93003340', 'Amoxsan 500mg Kapsul', 'Amoxicillin Trihydrate', '500 mg', 'KERAS', 'Kapsul', 'DKL8622205901A1', 'RAK-B1', 'Suhu Ruang (15-25 C)', 'Kapsul', 'Strip', 10, 'Box', 100, 3400, 4800, 4500, 4100, 10, 4000, 20, 200, 'PT Enseval Putera Megatrading'],
    ['93004821', 'Rhinos SR Kapsul', 'Loratadine + Pseudoephedrine HCl', '5 mg + 120 mg', 'PREKURSOR', 'Kapsul SR', 'DKL9905029103A1', 'LEMARI-PREKURSOR', 'Suhu Ruang (15-25 C)', 'Kapsul', 'Strip', 10, 'Box', 50, 6800, 8900, 8400, 7800, 10, 7600, 15, 100, 'PT Anugerah Argon Medica'],
    ['92004512', 'Neurobion Forte Tablet', 'Vitamin B1, B6, B12', '100/100/5000 mcg', 'BEBAS', 'Tablet Salut', 'DBL7215806416B1', 'RAK-C1', 'Suhu Ruang (15-25 C)', 'Tablet', 'Strip', 10, 'Box', 50, 2800, 3900, 3600, 3300, 10, 3200, 20, 200, 'PT Parit Padang Global']
  ];

  function _csvSafeVal(val) {
    let s = val === null || val === undefined ? '' : String(val);
    if (/^[=+\-@\t\r]/.test(s) && !/^-\d+(\.\d+)?$/.test(s)) s = "'" + s;
    return /[",\r\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function _detectCsvDelimiter(firstLine) {
    const line = String(firstLine || '');
    let inQ = false;
    let cComma = 0, cSemi = 0, cTab = 0;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQ = !inQ; continue; }
      if (!inQ) {
        if (ch === ',') cComma++;
        else if (ch === ';') cSemi++;
        else if (ch === '\t') cTab++;
      }
    }
    if (cSemi > cComma && cSemi >= cTab) return ';';
    if (cTab > cComma && cTab > cSemi) return '\t';
    return ',';
  }

  function _parseCsvRows(rawText) {
    let txt = String(rawText || '').replace(/^\uFEFF/, '');
    if (!txt.trim()) return [];
    let forcedDelim = '';
    const sepMatch = txt.match(/^sep=([,;\t])\r?\n/i);
    if (sepMatch) {
      forcedDelim = sepMatch[1];
      txt = txt.slice(sepMatch[0].length);
    }
    const firstNonEmpty = txt.split(/\r?\n/).find((l) => l.trim().length > 0) || '';
    const delim = forcedDelim || _detectCsvDelimiter(firstNonEmpty);
    const rows = [];
    let row = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < txt.length; i++) {
      const ch = txt[i];
      if (inQuotes) {
        if (ch === '"') {
          if (txt[i + 1] === '"') { cur += '"'; i++; }
          else { inQuotes = false; }
        } else {
          cur += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === delim) {
        row.push(cur.trim());
        cur = '';
      } else if (ch === '\r' || ch === '\n') {
        if (ch === '\r' && txt[i + 1] === '\n') i++;
        row.push(cur.trim());
        if (row.some((c) => c !== '')) rows.push(row);
        row = [];
        cur = '';
      } else {
        cur += ch;
      }
    }
    if (cur.length > 0 || row.length > 0) {
      row.push(cur.trim());
      if (row.some((c) => c !== '')) rows.push(row);
    }
    return rows;
  }

  function _parseImportNum(raw, fallback) {
    if (typeof raw === 'number') return Number.isFinite(raw) ? raw : (fallback || 0);
    let s = String(raw === null || raw === undefined ? '' : raw).trim();
    if (!s || s === '-') return fallback || 0;
    if (s.startsWith("'")) s = s.slice(1).trim();
    s = s.replace(/rp\.?\s*/gi, '').replace(/[^\d.,-]/g, '');
    if (!s || s === '-') return fallback || 0;
    if (s.includes('.') && s.includes(',')) {
      if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.');
      else s = s.replace(/,/g, '');
    } else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) {
      s = s.replace(/\./g, '');
    } else if (/^-?\d{1,3}(,\d{3})+$/.test(s)) {
      s = s.replace(/,/g, '');
    } else if (s.includes(',')) {
      s = s.replace(',', '.');
    }
    const n = Number(s);
    return Number.isFinite(n) ? n : (fallback || 0);
  }

  function _normalizeImportHeader(rawH) {
    const clean = String(rawH || '').toLowerCase().trim()
      .replace(/\(rp\)|\(%\)/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    const aliases = {
      kode_kfa: 'kode_kfa', kfa: 'kode_kfa', kode_obat: 'kode_kfa',
      nama_dagang: 'nama_dagang', nama: 'nama_dagang', produk: 'nama_dagang', nama_obat: 'nama_dagang', nama_produk: 'nama_dagang',
      zat_aktif: 'zat_aktif', kandungan: 'zat_aktif', generik: 'zat_aktif',
      kekuatan: 'kekuatan', dosis: 'kekuatan',
      golongan_bpom: 'golongan_bpom', golongan: 'golongan_bpom', gol: 'golongan_bpom',
      bentuk_sediaan: 'bentuk_sediaan', sediaan: 'bentuk_sediaan',
      nie_bpom: 'nie_bpom', nie: 'nie_bpom', no_nie: 'nie_bpom',
      rak_lokasi: 'rak_lokasi', rak: 'rak_lokasi', lokasi_rak: 'rak_lokasi',
      suhu_simpan: 'suhu_simpan', suhu: 'suhu_simpan',
      satuan_dasar: 'satuan_dasar', satuan: 'satuan_dasar', unit: 'satuan_dasar',
      satuan_sedang: 'satuan_sedang',
      rasio_sedang: 'rasio_sedang',
      satuan_besar: 'satuan_besar',
      rasio_besar: 'rasio_besar',
      hpp_avg: 'hpp_avg', hpp: 'hpp_avg', harga_beli: 'hpp_avg',
      harga_umum: 'harga_umum', harga: 'harga_umum', harga_jual: 'harga_umum',
      harga_member: 'harga_member', member: 'harga_member',
      harga_grosir: 'harga_grosir', grosir: 'harga_grosir',
      min_qty_grosir: 'min_qty_grosir', min_grosir: 'min_qty_grosir',
      harga_faskes: 'harga_faskes', faskes: 'harga_faskes',
      stok_min: 'stok_min', min_stok: 'stok_min',
      stok_max: 'stok_max', max_stok: 'stok_max',
      pbf_utama: 'pbf_utama', pbf: 'pbf_utama', distributor: 'pbf_utama'
    };
    return aliases[clean] || clean;
  }

  global.openImportObatModal = () => {
    importObatBuffer = [];
    S().openModal(`<div class="p-6 space-y-4 text-xs">
      <div class="flex justify-between items-start gap-3">
        <div>
          <h3 class="font-bold text-base">Import Massal Master Obat (.xlsx / .csv)</h3>
          <p class="mt-0.5" style="color:var(--ons-text-soft)">Unggah file template resmi ONS Farma atau file hasil <b>Export Excel / CSV</b> yang sudah Anda lengkapi di Microsoft Excel.</p>
        </div>
        <button onclick="ONSStore.closeModal()" class="text-xl leading-none">&times;</button>
      </div>
      <div class="p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
        <div class="space-y-0.5">
          <div class="font-bold">1. Unduh Contoh File Import (23 Kolom Lengkap)</div>
          <div style="color:var(--ons-text-soft)">Berisi 5 contoh obat standar Kemenkes/BPOM lengkap dengan satuan, margin tier &amp; panduan pengisian.</div>
        </div>
        <div class="flex flex-wrap gap-2">
          <button type="button" onclick="window.downloadTemplateImportObat()" class="ons-btn ons-btn-ghost">&#128196; Unduh Contoh CSV (.csv)</button>
          <button type="button" onclick="window.downloadTemplateImportObatXlsx()" class="ons-btn ons-btn-emerald">&#128202; Unduh Contoh Excel (.xlsx)</button>
        </div>
      </div>
      <div class="space-y-1.5">
        <label class="font-bold block">2. Pilih File (.xlsx atau .csv) untuk Dipindai</label>
        <input id="impObatFile" type="file" accept=".xlsx,.csv" class="ons-input w-full" onchange="window.parseImportObatFile(this.files[0])"/>
      </div>
      <div class="text-[11px] leading-relaxed px-3 py-2 rounded-lg border" style="border-color:var(--ons-border);color:var(--ons-text-soft)">
        <b>Kolom wajib:</b> <code>nama_dagang</code>. <b>Kolom opsional lengkap:</b> <code>kode_kfa</code>, <code>zat_aktif</code>, <code>kekuatan</code>, <code>golongan_bpom</code>, <code>bentuk_sediaan</code>, <code>nie_bpom</code>, <code>rak_lokasi</code>, <code>suhu_simpan</code>, <code>satuan_dasar</code>, <code>satuan_sedang</code>, <code>rasio_sedang</code>, <code>satuan_besar</code>, <code>rasio_besar</code>, <code>hpp_avg</code>, <code>harga_umum</code>, <code>harga_member</code>, <code>harga_grosir</code>, <code>min_qty_grosir</code>, <code>harga_faskes</code>, <code>stok_min</code>, <code>stok_max</code>, <code>pbf_utama</code>.
      </div>
      <div id="impObatPreview" class="p-3 rounded-xl border max-h-56 overflow-auto" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">Pilih file .xlsx atau .csv untuk pratinjau...</div>
      <button onclick="window.submitImportObatBulk()" class="ons-btn ons-btn-emerald w-full min-h-[42px] font-bold">&#128229; Import ke Database Master Obat</button>
    </div>`, '720px');
  };

  global.downloadTemplateImportObat = () => {
    const headerLine = MASTER_OBAT_IMPORT_COLUMNS.map((col) => _csvSafeVal(col.label)).join(',');
    const bodyLines = MASTER_OBAT_SAMPLE_ROWS.map((row) => row.map(_csvSafeVal).join(','));
    const csv = '\uFEFF' + [headerLine, ...bodyLines].join('\r\n') + '\r\n';
    S().downloadFile(new Blob([csv], { type: 'text/csv;charset=utf-8' }), 'Template_Import_Master_Obat_ONS.csv');
    if (typeof global.toast === 'function') {
      global.toast('Contoh CSV Master Obat (UTF-8 Excel, 23 kolom & 5 contoh obat) berhasil diunduh.', 'ok');
    }
    return csv;
  };

  global.downloadTemplateImportObatXlsx = () => {
    if (!global.ONSXlsxExport) {
      return global.downloadTemplateImportObat();
    }
    const XS = global.ONSXlsxExport.STYLE;
    const c = global.ONSXlsxExport.cell;
    const intCols = new Set(['rasio_sedang', 'rasio_besar', 'min_qty_grosir', 'stok_min', 'stok_max']);
    const curCols = new Set(['hpp_avg', 'harga_umum', 'harga_member', 'harga_grosir', 'harga_faskes']);
    const headerRow = MASTER_OBAT_IMPORT_COLUMNS.map((col) => c(col.label, XS.HEADER));
    const dataRows = MASTER_OBAT_SAMPLE_ROWS.map((r, ri) => {
      const alt = ri % 2 === 1;
      return r.map((val, ci) => {
        const key = MASTER_OBAT_IMPORT_COLUMNS[ci].key;
        if (curCols.has(key)) return c(Number(val || 0), alt ? XS.CURRENCY_ALT : XS.CURRENCY, 'n');
        if (intCols.has(key)) return c(Number(val || 0), alt ? XS.INT_ALT : XS.INT, 'n');
        if (key === 'golongan_bpom') return c(val, val === 'BEBAS' ? XS.GOOD : (val === 'TERBATAS' ? XS.WARN : XS.DANGER));
        return c(val, alt ? XS.TEXT_ALT : XS.TEXT);
      });
    });
    const widths = [14, 28, 26, 16, 16, 15, 19, 18, 22, 14, 14, 14, 13, 13, 14, 14, 14, 14, 15, 14, 11, 11, 28];
    const rowHeights = { 1: 24 };
    const colGuideRows = [
      [c('PANDUAN PENGISIAN TEMPLATE IMPORT MASTER OBAT ONS FARMA', XS.TITLE), '', ''],
      [c('Silakan isi data produk pada tab Template_Master_Obat (baris 1 wajib tetap berupa nama kolom teknis)', XS.SUBTITLE), '', ''],
      [c('Nama Kolom', XS.HEADER), c('Status', XS.HEADER), c('Keterangan & Format Standar', XS.HEADER)],
      ...MASTER_OBAT_IMPORT_COLUMNS.map((col, idx) => {
        const alt = idx % 2 === 1;
        const wajib = col.key === 'nama_dagang' ? 'WAJIB' : 'OPSIONAL';
        return [
          c(col.label, alt ? XS.TEXT_ALT : XS.TEXT),
          c(wajib, wajib === 'WAJIB' ? XS.DANGER : XS.GOOD),
          c(col.ket, alt ? XS.WRAP_ALT : XS.WRAP)
        ];
      })
    ];
    global.ONSXlsxExport.download([
      {
        name: 'Template_Master_Obat',
        freezeRows: 1,
        autoFilter: 'A1:W' + (1 + dataRows.length),
        widths,
        rowHeights,
        rows: [headerRow, ...dataRows]
      },
      {
        name: 'Panduan_Pengisian',
        freezeRows: 3,
        widths: [22, 14, 62],
        rowHeights: { 1: 28, 2: 20, 3: 24 },
        merges: ['A1:C1', 'A2:C2'],
        rows: colGuideRows
      }
    ], 'Template_Import_Master_Obat_ONS.xlsx', {
      title: 'Template Import Master Obat ONS Farma',
      creator: 'Apotek ONS Farma'
    });
    if (typeof global.toast === 'function') {
      global.toast('Contoh Excel (.xlsx) 2 sheet + panduan pengisian berhasil diunduh.', 'ok');
    }
    return true;
  };

  global.parseImportObatFile = async (file) => {
    const box = document.getElementById('impObatPreview');
    if (!file || !box) return;
    try {
      // Validasi Batas Ukuran File (Audit #13): Maksimal 10 MB untuk mencegah browser freeze
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('Ukuran file (' + (file.size / (1024 * 1024)).toFixed(1) + ' MB) melebihi batas maksimal 10 MB.');
      }

      let rows = [];
      if (file.name.toLowerCase().endsWith('.xlsx') && global.ONSXlsxLite) {
        const buf = await file.arrayBuffer();
        const sheets = await global.ONSXlsxLite.read(buf);
        const picked = (sheets || []).find((sh) => !/panduan|ringkasan/i.test(sh.name || '')) || (sheets && sheets[0]);
        rows = (picked && picked.rows) || [];
      } else {
        const text = await file.text();
        rows = _parseCsvRows(text);
      }
      if (rows.length < 2) throw new Error('File minimal berisi 1 baris header + 1 baris data.');
      let headerIdx = -1;
      for (let i = 0; i < Math.min(rows.length, 6); i++) {
        const norm = rows[i].map(_normalizeImportHeader);
        if (norm.includes('nama_dagang')) {
          headerIdx = i;
          break;
        }
      }
      // Validasi Kolom Wajib (Audit #13): Beri peringatan jelas jika header nama_dagang tidak ditemukan
      if (headerIdx < 0) {
        const detectedCols = (rows[0] || []).map(_normalizeImportHeader).filter(Boolean).slice(0, 8).join(', ');
        throw new Error('Kolom wajib "nama_dagang" (atau "Nama Obat") tidak ditemukan dalam file. Kolom yang terdeteksi: [' + detectedCols + ']. Pastikan menggunakan file template yang sesuai.');
      }
      const headers = rows[headerIdx].map(_normalizeImportHeader);
      const VALID_GOL = new Set(['BEBAS', 'TERBATAS', 'KERAS', 'PREKURSOR', 'OOT', 'PSIKOTROPIKA', 'NARKOTIKA', 'HERBAL', 'ALKES']);
      importObatBuffer = rows.slice(headerIdx + 1)
        .filter((r) => r.some((v) => String(v || '').trim() !== ''))
        .map((r) => {
          const obj = {};
          headers.forEach((h, idx) => {
            if (!h) return;
            obj[h] = r[idx] !== undefined && r[idx] !== null ? String(r[idx]).trim() : '';
          });
          const nama = obj.nama_dagang || '';
          if (!nama || /^total\b/i.test(nama)) return null;
          const rawGol = String(obj.golongan_bpom || 'BEBAS').toUpperCase().trim();
          const gol = VALID_GOL.has(rawGol) ? rawGol : 'BEBAS';
          const hpp = Math.max(0, _parseImportNum(obj.hpp_avg, 0));
          const hUmum = Math.max(0, _parseImportNum(obj.harga_umum, 0));
          const hMem = Math.max(0, _parseImportNum(obj.harga_member, hUmum));
          const hGrosir = Math.max(0, _parseImportNum(obj.harga_grosir, hMem || hUmum));
          const hFaskes = Math.max(0, _parseImportNum(obj.harga_faskes, hGrosir || hUmum));
          return {
            nama_dagang: nama,
            zat_aktif: obj.zat_aktif === '-' ? '' : (obj.zat_aktif || ''),
            kekuatan: obj.kekuatan || '',
            kode_kfa: (obj.kode_kfa === '-' ? '' : (obj.kode_kfa || '')),
            nie_bpom: (obj.nie_bpom === '-' ? '' : (obj.nie_bpom || '')),
            golongan_bpom: gol,
            bentuk_sediaan: obj.bentuk_sediaan || obj.satuan_dasar || 'Tablet',
            rak_lokasi: obj.rak_lokasi || 'RAK-A1',
            suhu_simpan: obj.suhu_simpan || 'Suhu Ruang (15-25 C)',
            satuan_dasar: obj.satuan_dasar || 'Tablet',
            satuan_sedang: obj.satuan_sedang || 'Strip',
            rasio_sedang: Math.max(1, _parseImportNum(obj.rasio_sedang, 10)),
            satuan_besar: obj.satuan_besar || 'Box',
            rasio_besar: Math.max(1, _parseImportNum(obj.rasio_besar, 100)),
            hpp_avg: hpp,
            harga_umum: hUmum,
            harga_member: hMem,
            harga_grosir: hGrosir,
            min_qty_grosir: Math.max(2, _parseImportNum(obj.min_qty_grosir, 10)),
            harga_faskes: hFaskes,
            stok_min: Math.max(0, _parseImportNum(obj.stok_min, 10)),
            stok_max: Math.max(1, _parseImportNum(obj.stok_max, 100)),
            pbf_utama: obj.pbf_utama === '-' ? '' : (obj.pbf_utama || '')
          };
        }).filter(Boolean);
      if (!importObatBuffer.length) {
        throw new Error('Tidak ada baris produk dengan kolom nama_dagang yang terisi.');
      }
      const warnMargin = importObatBuffer.filter((x) => x.hpp_avg > 0 && x.harga_umum > 0 && x.harga_umum < x.hpp_avg).length;
      box.innerHTML = `<div class="flex flex-wrap items-center justify-between gap-2 mb-2">
          <span class="font-bold text-emerald-700">&#9989; Terdeteksi ${importObatBuffer.length} produk valid (header baris ${headerIdx + 1})</span>
          ${warnMargin ? `<span class="text-amber-700 font-semibold">&#9888; ${warnMargin} item Harga Umum &lt; HPP</span>` : ''}
        </div>
        <div class="overflow-x-auto"><table class="w-full text-[11px] border-collapse">
          <thead><tr class="border-b" style="border-color:var(--ons-border);color:var(--ons-text-soft)">
            <th class="text-left py-1 pr-2">#</th><th class="text-left py-1 pr-2">Nama Dagang</th><th class="text-left py-1 pr-2">Golongan</th><th class="text-left py-1 pr-2">Satuan</th><th class="text-right py-1 pr-2">HPP</th><th class="text-right py-1">Harga Umum</th>
          </tr></thead>
          <tbody>${importObatBuffer.slice(0, 8).map((x, idx) => `<tr class="border-b" style="border-color:var(--ons-border)">
            <td class="py-1 pr-2 font-mono-num">${idx + 1}</td>
            <td class="py-1 pr-2 font-semibold">${S().esc(x.nama_dagang)}</td>
            <td class="py-1 pr-2">${S().esc(x.golongan_bpom)}</td>
            <td class="py-1 pr-2">${S().esc(x.satuan_dasar)}</td>
            <td class="py-1 pr-2 text-right font-mono-num">${S().rp(x.hpp_avg)}</td>
            <td class="py-1 text-right font-mono-num font-bold">${S().rp(x.harga_umum)}</td>
          </tr>`).join('')}</tbody>
        </table></div>` +
        (importObatBuffer.length > 8 ? `<div class="mt-2 italic" style="color:var(--ons-text-soft)">... dan ${importObatBuffer.length - 8} item lainnya siap diimport.</div>` : '');
    } catch (e) {
      importObatBuffer = [];
      box.innerHTML = `<span class="text-red-600 font-bold">Gagal membaca file: ${S().esc(e.message)}</span>`;
    }
  };

  global.submitImportObatBulk = async () => {
    if (!importObatBuffer.length) return global.toast('Pilih file berisi data produk yang valid terlebih dahulu.', 'warn');
    try {
      const res = await API().callApi('obat.bulkImport', { items: importObatBuffer }, { isWrite: true });
      S().closeModal();
      const cnt = res.imported !== undefined ? res.imported : ((res.inserted || 0) + (res.updated || 0) || importObatBuffer.length);
      global.toast('Import berhasil! ' + cnt + ' produk diperbarui ke Master Obat.', 'ok');
      await global.bootLoadState(true);
    } catch (e) { global.toast(e.message, 'err'); }
  };

  /**
   * W-05: Gudang Batch FEFO (3 Sub-Menu: batch | kartu-stok | opname)
   */
  let gudangBatchQ = '';
  let gudangBatchFilter = 'SEMUA';
  let mutasiFilterArah = 'SEMUA';
  let mutasiSearchQ = '';
  let opnameDraftQty = {};
  let opnameDraftReason = '';

  const MUTASI_ALIASES = {
    PENJUALAN_POS: ['PENJUALAN_POS', 'PENJUALAN_FEFO'],
    OPNAME: ['OPNAME', 'STOK_OPNAME_BLIND'],
    RECALL_KARANTINA: ['RECALL_KARANTINA', 'RECALL_KARANTINA_BPOM'],
    RETUR_PBF: ['RETUR_PBF', 'RETUR_BAR_PBF']
  };

  function matchMutasiJenis(rawJenis, filterJenis) {
    if (!filterJenis) return true;
    const j = String(rawJenis || '').toUpperCase();
    const aliases = MUTASI_ALIASES[filterJenis];
    return aliases ? aliases.includes(j) : j === filterJenis;
  }

  function _calcBatasReturIso(tglEd) {
    if (!tglEd || String(tglEd).length < 10) return '-';
    const ms = new Date(String(tglEd).slice(0, 10) + 'T00:00:00Z').getTime();
    if (Number.isNaN(ms)) return '-';
    return new Date(ms - 90 * 86400000).toISOString().slice(0, 10);
  }

  function _resolveBatchSupplier(st, b, ob) {
    if (b && b.nama_pbf) return b.nama_pbf;
    if (b && b.no_faktur_pbf && b.no_faktur_pbf !== '-') {
      const fk = (st.fakturPbf || []).find((f) => f.no_faktur_pbf === b.no_faktur_pbf || f.no_sp === b.no_sp);
      if (fk && fk.nama_pbf) return fk.nama_pbf;
    }
    return (ob && ob.pbf_utama) || 'PBF Reguler';
  }

  function _getAdjustmentRows(st) {
    const metaMap = _readJsonLs('ONS_ADJ_META_V1', {});
    const allowedJenis = new Set(['OPNAME', 'PENYESUAIAN', 'PENYESUAIAN_MASUK', 'RECALL_KARANTINA']);
    return (st.mutasiStok || [])
      .filter((m) => allowedJenis.has(String(m.jenis_mutasi || '').toUpperCase()))
      .map((m) => {
        const meta = metaMap[m.id_mutasi] || {};
        const batch = (st.stokBatch || []).find((b) => b.id_batch === m.id_batch);
        const ob = (st.masterObat || []).find((o) => o.id_obat === m.id_obat) || {};
        const qtyUbah = Number(m.qty_ubah || 0);
        const hpp = Number(m.hpp_unit || (batch && batch.hpp_beli) || ob.hpp_avg || 0);
        const nilai = m.nilai_selisih !== undefined ? Number(m.nilai_selisih) : (qtyUbah * hpp);
        const isoDate = String(m.timestamp || '').slice(0, 10);
        return {
          raw: m,
          id_mutasi: m.id_mutasi,
          isoDate,
          timestamp: m.timestamp,
          id_obat: m.id_obat,
          nama_dagang: m.nama_dagang || ob.nama_dagang || m.id_obat || '-',
          no_batch: m.no_batch || (batch && batch.no_batch) || '-',
          id_batch: m.id_batch || '',
          petugas: m.petugas || meta.petugas || m.user_id || 'Pemilik / APJ',
          qty_ubah: qtyUbah,
          nilai_selisih: nilai,
          penyebab: m.penyebab_selisih || meta.penyebab || (String(m.jenis_mutasi) === 'OPNAME' ? 'Stok Opname' : String(m.jenis_mutasi || 'Penyesuaian')),
          catatan: m.catatan || meta.catatan || '-'
        };
      });
  }

  function _getCombinedTransferRows(st) {
    let internalList = _readJsonLs('ONS_INTERNAL_TRANSFERS_V1', []);
    if (!Array.isArray(internalList) || !internalList.length) {
      internalList = [
        {
          id: 'TRF-INT-01',
          timestamp: new Date().toISOString().slice(0, 10) + 'T08:30:00Z',
          no_transaksi: 'TRF/INT/2026/001',
          asal: 'Gudang Utama (RAK-K1)',
          tujuan: 'Etalase Depan (RAK-B1)',
          nama_dagang: 'Amoxicillin Trihydrate 500mg',
          qty: 20,
          total_nilai: 9600,
          petugas: 'Budi Santoso',
          catatan: 'Pengisian stok etalase depan kasir'
        },
        {
          id: 'TRF-INT-02',
          timestamp: new Date().toISOString().slice(0, 10) + 'T10:00:00Z',
          no_transaksi: 'TRF/INT/2026/002',
          asal: 'Gudang Utama (RAK-KERAS-2)',
          tujuan: 'Chiller Obat (CHILLER-01)',
          nama_dagang: 'Amlodipine Besylate 10mg',
          qty: 30,
          total_nilai: 12300,
          petugas: 'apt. Siti Rahma, S.Farm',
          catatan: 'Rotasi penyimpanan persediaan'
        }
      ];
    }
    const branches = (st.mutasiCabang || []).map((tr) => {
      let trLines = [];
      if (Array.isArray(tr.items) && tr.items.length) trLines = tr.items;
      else { try { trLines = JSON.parse(tr.items_json || '[]'); } catch (e) {} }
      const firstLn = trLines[0] || {};
      const totQty = tr.total_qty_dasar !== undefined ? Number(tr.total_qty_dasar) : Number(tr.qty_kirim || 0);
      const totVal = trLines.reduce((sum, ln) => sum + (Number(ln.qty || 0) * Number(ln.hpp_beli || 0)), 0);
      return {
        kind: 'CABANG',
        id: tr.id_transfer,
        isoDate: String(tr.tanggal_kirim || tr.tgl_kirim || '').slice(0, 10),
        timestamp: tr.tanggal_kirim || tr.tgl_kirim || '',
        no_transaksi: tr.no_surat_jalan || tr.id_transfer,
        asal: tr.cabang_asal || 'ONS-01',
        tujuan: tr.cabang_tujuan || 'ONS-02',
        produkLabel: trLines.length > 1 ? `${firstLn.nama_dagang || 'Item'} (+${trLines.length - 1} lainnya)` : (firstLn.nama_dagang || tr.nama_dagang || '-'),
        qty: totQty,
        totalNilai: totVal,
        status: tr.status_transfer || 'DIKIRIM',
        diterima_oleh: tr.diterima_oleh || '',
        catatan: tr.catatan || '-'
      };
    });
    const internalRows = (Array.isArray(internalList) ? internalList : []).map((it) => ({
      kind: 'INTERNAL',
      id: it.id,
      isoDate: String(it.timestamp || '').slice(0, 10),
      timestamp: it.timestamp || '',
      no_transaksi: it.no_transaksi || it.id,
      asal: it.asal || 'Gudang Utama',
      tujuan: it.tujuan || 'Etalase Depan',
      produkLabel: it.nama_dagang || '-',
      qty: Number(it.qty || 0),
      totalNilai: Number(it.total_nilai || 0),
      status: 'SELESAI',
      diterima_oleh: it.petugas || 'APJ',
      catatan: it.catatan || '-'
    }));
    return internalRows.concat(branches).sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')));
  }

  function _renderGudangKadaluarsaTab(st, sorted, expiredCount, kritisCount, totalNilaiGudang, seeCost) {
    const prof = S().getStoreProfile ? S().getStoreProfile() : {};
    const pemilikLabel = prof.nama_usaha || 'Apotek ONS Farma';
    const gq = gudangBatchQ.trim().toLowerCase();
    const filteredBatches = sorted.filter((b) => {
      const o = st.masterObat.find((m) => m.id_obat === b.id_obat);
      const d = S().daysUntil(b.tgl_kadaluarsa);
      const activeQty = String(b.status_batch || 'AKTIF') === 'AKTIF' && Number(b.qty_sisa || 0) > 0;
      if (gudangBatchFilter === 'KADALUARSA' && !(activeQty && d < 0)) return false;
      if (gudangBatchFilter === 'KRITIS' && !(activeQty && d >= 0 && d <= 90)) return false;
      if (gudangBatchFilter === 'KARANTINA' && !(String(b.status_batch || 'AKTIF') === 'KARANTINA_RECALL' || Number(b.qty_karantina || 0) > 0 || String(b.status_batch) === 'RETUR_PBF')) return false;
      if (gudangBatchFilter === 'AMAN' && !(activeQty && d > 90)) return false;
      const edIso = String(b.tgl_kadaluarsa || '').slice(0, 10);
      if (edDateFrom && edIso && edIso < edDateFrom) return false;
      if (edDateTo && edIso && edIso > edDateTo) return false;
      if (gq) {
        const supName = _resolveBatchSupplier(st, b, o);
        const hay = `${b.no_batch} ${b.no_faktur_pbf} ${b.no_sp || ''} ${o ? o.nama_dagang : b.id_obat} ${supName} ${o ? (o.rak_lokasi || '') : ''}`.toLowerCase();
        if (!hay.includes(gq)) return false;
      }
      return true;
    });

    const selectedCount = edSelectedIds.size;
    return `<div class="space-y-4">
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div class="ons-card p-3.5"><div class="text-xs" style="color:var(--ons-text-soft)">Total Batch Tersedia</div><div class="text-lg font-bold font-mono-num">${sorted.length}</div></div>
        <div class="ons-card p-3.5"><div class="text-xs" style="color:var(--ons-text-soft)">Kadaluarsa / Kritis &le; 90h</div><div class="text-lg font-bold font-mono-num text-red-600">${expiredCount} ED &bull; ${kritisCount} Kritis</div></div>
        <div class="ons-card p-3.5"><div class="text-xs" style="color:var(--ons-text-soft)">Stok Karantina Recall</div><div class="text-lg font-bold font-mono-num text-amber-600">${sorted.reduce((s, b) => s + Number(b.qty_karantina || 0), 0)} Unit</div></div>
        ${seeCost ? `<div class="ons-card p-3.5"><div class="text-xs" style="color:var(--ons-text-soft)">Valuasi Persediaan (HPP)</div><div class="text-lg font-bold font-mono-num text-blue-600">${S().rp(totalNilaiGudang)}</div></div>` : `<div class="ons-card p-3.5"><div class="text-xs" style="color:var(--ons-text-soft)">Batch Ditampilkan</div><div class="text-lg font-bold font-mono-num text-blue-600">${filteredBatches.length}</div></div>`}
      </div>

      <div class="ons-card p-4 space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex flex-wrap gap-2 items-center">
            <input class="ons-input text-xs w-56" placeholder="Cari data (produk, rak, supplier, batch)..." value="${S().esc(gudangBatchQ)}" oninput="window.setGudangBatchQ(this.value)"/>
            <div class="flex items-center gap-1 text-xs">
              <span class="text-[11px]" style="color:var(--ons-text-soft)">Filter Tgl ED:</span>
              <input type="date" value="${S().esc(edDateFrom)}" onchange="window.setEdDateRange(this.value, '${S().esc(edDateTo)}')" class="ons-input text-xs py-1 w-32 font-mono-num"/>
              <span>-</span>
              <input type="date" value="${S().esc(edDateTo)}" onchange="window.setEdDateRange('${S().esc(edDateFrom)}', this.value)" class="ons-input text-xs py-1 w-32 font-mono-num"/>
            </div>
            <div class="ons-tab-bar">
              ${['SEMUA', 'KADALUARSA', 'KRITIS', 'KARANTINA', 'AMAN'].map((f) => `<button onclick="window.setGudangBatchFilter('${f}')" class="ons-tab-btn ${gudangBatchFilter === f ? 'active' : ''}">${f}</button>`).join('')}
            </div>
          </div>
          <div class="flex flex-wrap gap-1.5">
            <button onclick="window.exportStokKadaluarsa('xlsx')" class="ons-btn ons-btn-ghost text-xs py-1.5 px-2.5">Excel</button>
            <button onclick="window.exportStokKadaluarsa('pdf')" class="ons-btn ons-btn-ghost text-xs py-1.5 px-2.5">Print</button>
            ${seeCost ? `<button onclick="window.openAddManualBatchModal()" class="ons-btn ons-btn-emerald text-xs py-1.5 px-2.5">+ Input Batch Manual</button>` : ''}
          </div>
        </div>

        ${selectedCount > 0 ? `<div class="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg border text-xs" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
          <span><b>${selectedCount}</b> batch kadaluarsa / FEFO dipilih</span>
          <div class="flex flex-wrap gap-1.5">
            ${seeCost ? `<button type="button" onclick="window.batchRecallSelected()" class="ons-btn ons-btn-danger text-xs py-1 px-2.5">Karantina Batch Terpilih</button>` : ''}
            ${seeCost ? `<button type="button" onclick="window.navigateView('faktur','retur')" class="ons-btn ons-btn-primary text-xs py-1 px-2.5">Proses Retur PBF &rarr;</button>` : ''}
            <button type="button" onclick="window.clearEdBatchSelection()" class="ons-btn ons-btn-ghost text-xs py-1 px-2">Batal Pilih</button>
          </div>
        </div>` : ''}

        <div class="ons-table-wrap">
          <table class="ons-table is-compact">
            <thead>
              <tr>
                <th>Pilih</th>
                <th>No.</th>
                <th>Nama Produk</th>
                <th>Rak</th>
                <th>Supplier</th>
                <th>Pemilik</th>
                <th>Tanggal Masuk</th>
                <th>Gudang</th>
                <th>Tgl. Kadaluarsa</th>
                <th>Batas Retur</th>
                ${seeCost ? '<th>Harga Pokok</th>' : ''}
                <th>Kuantitas</th>
                ${seeCost ? '<th>Actions</th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${filteredBatches.map((b, idx) => {
                const o = st.masterObat.find((m) => m.id_obat === b.id_obat);
                const d = S().daysUntil(b.tgl_kadaluarsa);
                const isEd = d < 0 && Number(b.qty_sisa || 0) > 0;
                const edBadge = d < 0 ? 'bpom-keras' : (d <= 90 ? 'bpom-keras' : (d <= 180 ? 'bpom-prekursor' : 'bpom-bebas'));
                const supName = _resolveBatchSupplier(st, b, o);
                const batasRetur = _calcBatasReturIso(b.tgl_kadaluarsa);
                const returLewat = batasRetur !== '-' && batasRetur < new Date().toISOString().slice(0, 10);
                const checked = edSelectedIds.has(b.id_batch);
                const tglMasuk = b.created_at || b.tgl_masuk || '-';
                const gudangName = b.gudang || (b.cabang_id && b.cabang_id !== 'ONS-01' ? b.cabang_id : 'Gudang Utama');
                return `<tr>
                  <td><input type="checkbox" data-batch-sel="${S().esc(b.id_batch)}" ${checked ? 'checked' : ''} onchange="window.toggleEdBatchSelect('${S().esc(b.id_batch)}', this.checked)" aria-label="Pilih batch ${S().esc(b.no_batch)}"/></td>
                  <td class="font-mono-num text-xs">${idx + 1}.</td>
                  <td class="text-xs">
                    <div class="font-semibold">${S().esc(o ? o.nama_dagang : b.id_obat)}</div>
                    <div class="font-mono-num text-[11px]" style="color:var(--ons-text-soft)">Batch: <b>${S().esc(b.no_batch)}</b> &bull; ${S().esc(b.no_faktur_pbf || '-')}</div>
                  </td>
                  <td class="font-mono-num text-xs">${S().esc((b.rak_penyimpanan || (o && o.rak_lokasi)) || '-')}</td>
                  <td class="text-xs">${S().esc(supName)}</td>
                  <td class="text-xs">${S().esc(pemilikLabel)}</td>
                  <td class="font-mono-num text-xs">${tglMasuk !== '-' ? S().formatTgl(tglMasuk) : '-'}</td>
                  <td class="text-xs">${S().esc(gudangName)}</td>
                  <td><span class="badge-bpom ${edBadge} font-mono-num">${isEd ? 'ED / BLOKIR POS ' : ''}${S().esc(b.tgl_kadaluarsa)} (${d}h)</span></td>
                  <td class="font-mono-num text-xs ${returLewat ? 'text-red-600 font-bold' : ''}">${S().esc(batasRetur)}</td>
                  ${seeCost ? `<td class="font-mono-num text-xs">${S().rp(b.hpp_beli || (o && o.hpp_avg) || 0)}</td>` : ''}
                  <td class="font-mono-num text-xs">
                    <span class="font-bold">${b.qty_sisa}</span>
                    ${Number(b.qty_karantina || 0) > 0 ? `<div class="text-[10px] text-red-600">Karantina: ${b.qty_karantina}</div>` : ''}
                  </td>
                  ${seeCost ? `<td><button onclick="window.triggerRecallBatch('${b.id_batch}','${S().esc(b.no_batch)}')" ${b.status_batch !== 'AKTIF' ? 'disabled' : ''} class="ons-btn ons-btn-danger text-[11px] py-1 px-2">Recall BPOM</button></td>` : ''}
                </tr>`;
              }).join('') || `<tr><td colspan="${seeCost ? 13 : 11}" class="text-center py-6 text-xs">Data tidak ditemukan.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    </div>`;
  }

  function _renderGudangOpnameTab(st, activeForOpname, rakList, opnameCounted, opnameSelisihUnit, opnameSelisihRp) {
    const infoBanner = `<div class="flex flex-wrap items-center justify-between gap-2 px-4 py-3 rounded-xl border text-xs bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200">
      <div>
        Proses <b>Stock Opname (Stok Opname)</b> dan <b>Penyesuaian Stok</b> tersedia dalam 2 tahap terstruktur agar audit apotek lebih rapi. Jika ingin penyesuaian langsung pada 1–2 item tanpa sesi penuh, gunakan menu <b>Penyesuaian Stok</b>.
      </div>
      <button type="button" onclick="window.setGudangTab('penyesuaian')" class="ons-btn ons-btn-ghost text-xs py-1 px-2.5 font-bold shrink-0">Penyesuaian Stok &rarr;</button>
    </div>`;

    if (!opnameSessionActive) {
      return `<div class="space-y-4">
        ${infoBanner}
        <div class="ons-card p-8 sm:p-10 text-center space-y-4">
          <div class="mx-auto w-20 h-20 rounded-2xl flex items-center justify-center bg-blue-500/10 text-blue-600">
            <svg viewBox="0 0 24 24" class="w-10 h-10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="m9 14 2 2 4-4"/></svg>
          </div>
          <div class="max-w-md mx-auto space-y-1">
            <h3 class="font-extrabold text-base">Belum ada opname yang dipilih</h3>
            <p class="text-xs" style="color:var(--ons-text-soft)">Silakan pilih <b>Mulai Opname Baru</b> untuk melakukan Stock Opname Fisik (${activeForOpname.length} batch aktif siap hitung), atau cek opname lainnya di <b>Riwayat Opname</b>.</p>
          </div>
          <div class="flex flex-wrap items-center justify-center gap-2.5 pt-1">
            <button type="button" onclick="window.openRiwayatOpnameModal()" class="ons-btn ons-btn-emerald text-xs px-4 py-2">Riwayat Opname</button>
            <button type="button" onclick="window.startNewOpnameSession()" class="ons-btn ons-btn-primary text-xs px-4 py-2">+ Mulai Opname Baru</button>
          </div>
        </div>
      </div>`;
    }

    return `<div class="space-y-4">
      ${infoBanner}
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div class="ons-card p-3.5"><div class="text-xs" style="color:var(--ons-text-soft)">Batch Aktif Dipindai</div><div class="text-lg font-bold font-mono-num">${activeForOpname.length}</div></div>
        <div class="ons-card p-3.5"><div class="text-xs" style="color:var(--ons-text-soft)">Batch Sudah Diisi Hitungan</div><div class="text-lg font-bold font-mono-num text-blue-600">${opnameCounted}</div></div>
        <div class="ons-card p-3.5"><div class="text-xs" style="color:var(--ons-text-soft)">Net Selisih Unit</div><div class="text-lg font-bold font-mono-num ${opnameSelisihUnit === 0 ? 'text-emerald-600' : 'text-amber-600'}">${opnameSelisihUnit > 0 ? '+' : ''}${opnameSelisihUnit}</div></div>
        <div class="ons-card p-3.5"><div class="text-xs" style="color:var(--ons-text-soft)">Dampak Nilai HPP Selisih</div><div class="text-lg font-bold font-mono-num ${opnameSelisihRp >= 0 ? 'text-emerald-600' : 'text-red-600'}">${S().rp(opnameSelisihRp)}</div></div>
      </div>
      <div class="ons-card p-4 space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex flex-wrap items-center gap-2">
            <input class="ons-input text-xs w-52" placeholder="Cari obat / KFA / batch opname..." value="${S().esc(gudangBatchQ)}" oninput="window.setGudangBatchQ(this.value)"/>
            <select class="ons-select text-xs w-40" onchange="window.setOpnameRakFilter(this.value)" aria-label="Filter Lokasi Rak">
              <option value="">-- Semua Rak --</option>
              ${rakList.map((rk) => `<option value="${S().esc(rk)}" ${opnameRakFilter === rk ? 'selected' : ''}>Rak: ${S().esc(rk)}</option>`).join('')}
            </select>
            <button type="button" onclick="window.scanOpnameBarcodeNow()" class="ons-btn ons-btn-primary text-xs">Scan Barcode</button>
            <div class="inline-flex rounded-lg border p-0.5" style="border-color:var(--ons-border);background:var(--ons-bg-subtle)">
              <button type="button" onclick="window.setOpnameViewMode('TABLE')" class="ons-btn text-xs py-1 px-2 ${opnameViewMode === 'TABLE' ? 'ons-btn-primary' : 'ons-btn-ghost border-0'}">Tabel</button>
              <button type="button" onclick="window.setOpnameViewMode('CARD')" class="ons-btn text-xs py-1 px-2 ${opnameViewMode === 'CARD' ? 'ons-btn-primary' : 'ons-btn-ghost border-0'}">Mode HP</button>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <button type="button" onclick="window.openRiwayatOpnameModal()" class="ons-btn ons-btn-ghost text-xs">Riwayat Opname</button>
            <button type="button" onclick="window.closeOpnameSession()" class="ons-btn ons-btn-ghost text-xs">Tutup Sesi</button>
            <input id="opnameWorkspaceReason" class="ons-input text-xs w-48" placeholder="Catatan/Alasan SO..." value="${S().esc(opnameDraftReason || 'Stock Opname Rutin Gudang')}" oninput="window.setOpnameDraftReason(this.value)"/>
            <button onclick="window.submitFullOpnameWorkspace()" class="ons-btn ons-btn-emerald text-xs">Simpan Hasil Opname (${opnameCounted} Batch)</button>
          </div>
        </div>
        ${opnameViewMode === 'CARD' ? `
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            ${activeForOpname.map((b) => {
              const o = st.masterObat.find((m) => m.id_obat === b.id_obat);
              const sysQty = Number(b.qty_sisa || 0);
              const val = opnameDraftQty[b.id_batch] !== undefined ? opnameDraftQty[b.id_batch] : '';
              const diff = val !== '' ? (Number(val) - sysQty) : null;
              return `<div class="p-3.5 rounded-xl border space-y-2.5" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
                <div class="flex items-start justify-between gap-2">
                  <div>
                    <div class="font-bold text-sm">${S().esc(o ? o.nama_dagang : b.id_obat)}</div>
                    <div class="font-mono-num text-[11px]" style="color:var(--ons-text-soft)">Rak: <b>${S().esc((o && o.rak_lokasi) || '-')}</b> &bull; Batch <b>${S().esc(b.no_batch)}</b> &bull; ED ${S().esc(b.tgl_kadaluarsa)}</div>
                  </div>
                  <span class="badge-bpom bpom-terbatas font-mono-num">Sistem: ${sysQty}</span>
                </div>
                <div class="flex flex-wrap items-center gap-1.5">
                  <button type="button" onclick="window.stepOpnameDraftQty('${b.id_batch}', ${sysQty}, -1)" class="ons-btn ons-btn-ghost text-xs px-2.5 py-1">-1</button>
                  <input type="number" min="0" value="${S().esc(val)}" placeholder="${sysQty}" oninput="window.setOpnameDraftQty('${b.id_batch}', this.value)" class="ons-input font-mono-num text-sm font-bold w-24 text-center py-1 min-h-0 h-8"/>
                  <button type="button" onclick="window.stepOpnameDraftQty('${b.id_batch}', ${sysQty}, 1)" class="ons-btn ons-btn-ghost text-xs px-2.5 py-1">+1</button>
                  <button type="button" onclick="window.stepOpnameDraftQty('${b.id_batch}', ${sysQty}, 10)" class="ons-btn ons-btn-ghost text-xs px-2.5 py-1">+10</button>
                  <button type="button" onclick="window.setOpnameDraftQty('${b.id_batch}', ${sysQty})" class="ons-btn ons-btn-emerald text-xs px-2.5 py-1 ml-auto">= Sistem</button>
                </div>
                ${diff !== null ? `<div class="text-xs font-mono-num font-bold ${diff === 0 ? 'text-emerald-600' : (diff < 0 ? 'text-red-600' : 'text-blue-600')}">Selisih: ${diff > 0 ? '+' : ''}${diff} unit (${S().rp(diff * Number(b.hpp_beli || 0))})</div>` : ''}
              </div>`;
            }).join('')}
          </div>
        ` : `
        <div class="ons-table-wrap">
          <table class="ons-table">
            <thead><tr><th>Nama Obat &amp; Rak</th><th>No. Batch &amp; ED</th><th>Stok Sistem</th><th>Hitung Fisik Riil</th><th>Selisih Unit</th><th>Estimasi Selisih Rp</th></tr></thead>
            <tbody>
              ${activeForOpname.map((b) => {
                const o = st.masterObat.find((m) => m.id_obat === b.id_obat);
                const val = opnameDraftQty[b.id_batch] !== undefined ? opnameDraftQty[b.id_batch] : '';
                const diff = val !== '' ? (Number(val) - Number(b.qty_sisa || 0)) : null;
                const diffRp = diff !== null ? diff * Number(b.hpp_beli || 0) : 0;
                return `<tr>
                  <td class="font-semibold text-xs">${S().esc(o ? o.nama_dagang : b.id_obat)}<br/><span class="font-mono-num text-[10px]" style="color:var(--ons-text-soft)">Rak: ${S().esc((o && o.rak_lokasi) || '-')}</span></td>
                  <td class="font-mono-num text-xs"><b>${S().esc(b.no_batch)}</b> &bull; ED ${S().esc(b.tgl_kadaluarsa)}</td>
                  <td class="font-mono-num font-bold">${b.qty_sisa}</td>
                  <td><input type="number" min="0" value="${S().esc(val)}" placeholder="Isi qty riil" oninput="window.setOpnameDraftQty('${b.id_batch}', this.value)" class="ons-input font-mono-num text-xs w-28 py-1 text-right"/></td>
                  <td class="font-mono-num font-bold ${diff === null ? '' : (diff === 0 ? 'text-emerald-600' : (diff < 0 ? 'text-red-600' : 'text-blue-600'))}">${diff === null ? '-' : ((diff > 0 ? '+' : '') + diff)}</td>
                  <td class="font-mono-num text-xs ${diffRp < 0 ? 'text-red-600' : 'text-emerald-600'}">${diff === null ? '-' : S().rp(diffRp)}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>`}
      </div>
    </div>`;
  }

  function _renderGudangPenyesuaianTab(st, seeCost) {
    const q = adjSearchQ.trim().toLowerCase();
    const allRows = _getAdjustmentRows(st);
    const filtered = allRows.filter((r) => {
      if (adjFilterType === 'POSITIF' && r.qty_ubah <= 0) return false;
      if (adjFilterType === 'NEGATIF' && r.qty_ubah >= 0) return false;
      if (adjDateFrom && r.isoDate && r.isoDate < adjDateFrom) return false;
      if (adjDateTo && r.isoDate && r.isoDate > adjDateTo) return false;
      if (q) {
        const hay = `${r.nama_dagang} ${r.no_batch} ${r.petugas} ${r.penyebab} ${r.catatan}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const posSum = filtered.filter((r) => r.qty_ubah > 0).reduce((s, r) => s + r.qty_ubah, 0);
    const negSum = filtered.filter((r) => r.qty_ubah < 0).reduce((s, r) => s + r.qty_ubah, 0);
    const prodSet = new Set(filtered.map((r) => r.id_obat));
    const totalNilai = filtered.reduce((s, r) => s + r.nilai_selisih, 0);
    const todayStr = new Date().toISOString().slice(0, 10);
    const rekapLabel = `Rekap dari ${S().formatTgl(adjDateFrom || todayStr)} s.d. ${S().formatTgl(adjDateTo || todayStr)}`;

    return `<div class="space-y-4">
      <div class="ons-card p-4 space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex flex-wrap items-center gap-2">
            <select class="ons-select text-xs w-44" onchange="window.setAdjFilterType(this.value)" aria-label="Pilihan Data Penyesuaian">
              <option value="SEMUA" ${adjFilterType === 'SEMUA' ? 'selected' : ''}>Semua Penyesuaian</option>
              <option value="POSITIF" ${adjFilterType === 'POSITIF' ? 'selected' : ''}>Penyesuaian Positif (+)</option>
              <option value="NEGATIF" ${adjFilterType === 'NEGATIF' ? 'selected' : ''}>Penyesuaian Negatif (-)</option>
            </select>
            <input class="ons-input text-xs w-52" placeholder="Cari data produk / petugas..." value="${S().esc(adjSearchQ)}" oninput="window.setAdjSearchQ(this.value)"/>
            <div class="flex items-center gap-1 text-xs">
              <span class="text-[11px]" style="color:var(--ons-text-soft)">Filter Tgl:</span>
              <input type="date" value="${S().esc(adjDateFrom)}" onchange="window.setAdjDateRange(this.value, '${S().esc(adjDateTo)}')" class="ons-input text-xs py-1 w-32 font-mono-num"/>
              <span>-</span>
              <input type="date" value="${S().esc(adjDateTo)}" onchange="window.setAdjDateRange('${S().esc(adjDateFrom)}', this.value)" class="ons-input text-xs py-1 w-32 font-mono-num"/>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-1.5">
            <button type="button" onclick="window.exportPenyesuaianStok('xlsx')" class="ons-btn ons-btn-ghost text-xs py-1.5 px-2.5">Excel</button>
            <button type="button" onclick="window.openQuickAdjustmentModal()" class="ons-btn ons-btn-primary text-xs py-1.5 px-3">+ Sesuaikan Stok</button>
          </div>
        </div>

        <div class="ons-table-wrap">
          <table class="ons-table is-compact">
            <thead>
              <tr>
                <th>No.</th>
                <th>Tanggal</th>
                <th>Nama Produk</th>
                <th>Petugas</th>
                <th>Total Selisih</th>
                ${seeCost ? '<th>Nilai Penyesuaian</th>' : ''}
                <th>Penyebab Selisih</th>
                <th>Catatan</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.length ? filtered.slice(0, 120).map((r, idx) => `<tr>
                <td class="font-mono-num text-xs">${idx + 1}.</td>
                <td class="font-mono-num text-xs whitespace-nowrap">${S().formatTgl(r.timestamp, true)}</td>
                <td class="text-xs"><div class="font-semibold">${S().esc(r.nama_dagang)}</div><div class="font-mono-num text-[11px]" style="color:var(--ons-text-soft)">Batch: ${S().esc(r.no_batch)}</div></td>
                <td class="text-xs">${S().esc(r.petugas)}</td>
                <td class="font-mono-num font-bold text-xs ${r.qty_ubah >= 0 ? 'text-emerald-600' : 'text-red-600'}">${r.qty_ubah > 0 ? '+' : ''}${r.qty_ubah}</td>
                ${seeCost ? `<td class="font-mono-num text-xs font-semibold ${r.nilai_selisih < 0 ? 'text-red-600' : 'text-emerald-600'}">${S().rp(r.nilai_selisih)}</td>` : ''}
                <td class="text-xs"><span class="badge-bpom bpom-terbatas">${S().esc(r.penyebab)}</span></td>
                <td class="text-xs" style="color:var(--ons-text-soft)">${S().esc(r.catatan)}</td>
                <td><button type="button" onclick="window.openObatDetailModal('${S().esc(r.id_obat)}')" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2">Detail</button></td>
              </tr>`).join('') : `<tr><td colspan="${seeCost ? 9 : 8}" class="text-center py-6 text-xs">Data tidak ditemukan. Klik <b>+ Sesuaikan Stok</b> untuk mencatat penyesuaian manual.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>

      ${_renderInvRekapFooter('penyesuaian-stok', rekapLabel, [
        { label: 'Penyesuaian Positif', valHtml: `+${posSum}`, cls: 'text-emerald-600' },
        { label: 'Penyesuaian Negatif', valHtml: `${negSum}`, cls: negSum < 0 ? 'text-red-600' : '' },
        { label: 'Produk yang Disesuaikan', valHtml: `${prodSet.size} produk` },
        ...(seeCost ? [{ label: 'Total Nilai Penyesuaian', valHtml: S().rp(totalNilai), cls: totalNilai < 0 ? 'text-red-600' : 'text-emerald-600' }] : [])
      ])}
    </div>`;
  }

  function _renderGudangTransferTab(st, seeCost) {
    const multiOn = S().isMultiBranchEnabled ? S().isMultiBranchEnabled() : false;
    const rows = _getCombinedTransferRows(st).filter((r) => {
      if (trfFilterMode !== 'SEMUA' && r.kind !== trfFilterMode) return false;
      if (trfDateFrom && r.isoDate && r.isoDate < trfDateFrom) return false;
      if (trfDateTo && r.isoDate && r.isoDate > trfDateTo) return false;
      const q = trfSearchQ.trim().toLowerCase();
      if (q && !`${r.no_transaksi} ${r.produkLabel} ${r.asal} ${r.tujuan} ${r.catatan}`.toLowerCase().includes(q)) return false;
      return true;
    });
    const drafts = _readJsonLs('ONS_TRANSFER_DRAFTS_V1', []);
    const totalNilai = rows.reduce((s, r) => s + Number(r.totalNilai || 0), 0);
    const todayStr = new Date().toISOString().slice(0, 10);
    const rekapLabel = `Rekap dari ${S().formatTgl(trfDateFrom || todayStr)} s.d. ${S().formatTgl(trfDateTo || todayStr)}`;

    const branchIds = (S().getActiveBranches && S().getActiveBranches()) || ['ONS-01', 'ONS-02'];
    const cmpObj = st.branchStockCompare && !Array.isArray(st.branchStockCompare) ? st.branchStockCompare : null;
    const compList = (cmpObj && Array.isArray(cmpObj.items)) ? cmpObj.items : (Array.isArray(st.branchStockCompare) ? st.branchStockCompare : []);

    return `<div class="space-y-4">
      <div class="ons-card p-4 space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex flex-wrap items-center gap-2">
            <input class="ons-input text-xs w-52" placeholder="Cari data transaksi / produk..." value="${S().esc(trfSearchQ)}" oninput="window.setTrfSearchQ(this.value)"/>
            <div class="flex items-center gap-1 text-xs">
              <span class="text-[11px]" style="color:var(--ons-text-soft)">Filter Tgl:</span>
              <input type="date" value="${S().esc(trfDateFrom)}" onchange="window.setTrfDateRange(this.value, '${S().esc(trfDateTo)}')" class="ons-input text-xs py-1 w-32 font-mono-num"/>
              <span>-</span>
              <input type="date" value="${S().esc(trfDateTo)}" onchange="window.setTrfDateRange('${S().esc(trfDateFrom)}', this.value)" class="ons-input text-xs py-1 w-32 font-mono-num"/>
            </div>
            <select class="ons-select text-xs w-36" onchange="window.setTrfFilterMode(this.value)" aria-label="Filter Jenis Perpindahan">
              <option value="SEMUA" ${trfFilterMode === 'SEMUA' ? 'selected' : ''}>Semua Mode</option>
              <option value="INTERNAL" ${trfFilterMode === 'INTERNAL' ? 'selected' : ''}>Gudang / Rak</option>
              <option value="CABANG" ${trfFilterMode === 'CABANG' ? 'selected' : ''}>Antar-Cabang</option>
            </select>
          </div>
          <div class="flex flex-wrap items-center gap-1.5">
            <button type="button" onclick="window.openTransferDraftsModal()" class="ons-btn ons-btn-emerald text-xs py-1.5 px-2.5">Draft (${drafts.length})</button>
            <button type="button" onclick="window.openImportTransferModal()" class="ons-btn ons-btn-ghost text-xs py-1.5 px-2.5">Import</button>
            <button type="button" onclick="window.exportPerpindahanStok('xlsx')" class="ons-btn ons-btn-ghost text-xs py-1.5 px-2">Excel</button>
            <button type="button" onclick="window.openPindahkanStokModal()" class="ons-btn ons-btn-primary text-xs py-1.5 px-3">+ Pindahkan Stok</button>
          </div>
        </div>

        <div class="ons-table-wrap">
          <table class="ons-table is-compact">
            <thead>
              <tr>
                <th>No.</th>
                <th>Tanggal</th>
                <th>No. Transaksi</th>
                <th>Produk &amp; Tujuan</th>
                ${seeCost ? '<th>Total Nilai Stok</th>' : ''}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${rows.length ? rows.map((r, idx) => {
                const isPendingCabang = r.kind === 'CABANG' && r.status !== 'DITERIMA';
                return `<tr>
                  <td class="font-mono-num text-xs">${idx + 1}.</td>
                  <td class="font-mono-num text-xs whitespace-nowrap">${S().formatTgl(r.timestamp, true)}</td>
                  <td class="font-mono-num text-xs font-bold">${S().esc(r.no_transaksi)}</td>
                  <td class="text-xs">
                    <div class="font-semibold">${S().esc(r.produkLabel)} <span class="font-mono-num">(${r.qty} unit)</span></div>
                    <div class="text-[11px]" style="color:var(--ons-text-soft)">${S().esc(r.asal)} &rarr; ${S().esc(r.tujuan)} &bull; <span class="badge-bpom ${r.status === 'DIKIRIM' ? 'bpom-prekursor' : 'bpom-bebas'}">${S().esc(r.status)}</span></div>
                  </td>
                  ${seeCost ? `<td class="font-mono-num text-xs font-bold">${S().rp(r.totalNilai)}</td>` : ''}
                  <td>
                    <div class="flex flex-wrap gap-1.5">
                      ${r.kind === 'CABANG'
                        ? `<button type="button" onclick="window.printSuratJalanMutasi('${S().esc(r.id)}')" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2">Cetak SJ</button>
                           ${isPendingCabang ? `<button type="button" onclick="window.receiveMutasiCabang('${S().esc(r.id)}')" class="ons-btn ons-btn-emerald text-[11px] py-1 px-2">Terima</button>` : ''}`
                        : `<button type="button" onclick="window.printInternalTransferNote('${S().esc(r.id)}')" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2">Cetak Bukti</button>`}
                    </div>
                  </td>
                </tr>`;
              }).join('') : `<tr><td colspan="${seeCost ? 6 : 5}" class="text-center py-6 text-xs">Data tidak ditemukan. Klik <b>+ Pindahkan Stok</b> untuk mencatat perpindahan rak, gudang, atau antar-cabang.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>

      ${_renderInvRekapFooter('perpindahan-stok', rekapLabel, [
        { label: 'Total Perpindahan', valHtml: seeCost ? S().rp(totalNilai) : `${rows.reduce((s, r) => s + r.qty, 0)} unit` },
        { label: 'Frek. Transaksi', valHtml: `${rows.length}x` }
      ])}

      ${multiOn ? `<div class="ons-card p-4 space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h3 class="font-bold text-sm">Komparator Stok Real-Time (${branchIds.length} Outlet Multi-Cabang)</h3>
          <span class="text-[11px]" style="color:var(--ons-text-soft)">Outlet aktif: <b class="font-mono-num">${S().esc(st.cabangId)}</b></span>
        </div>
        <div class="ons-table-wrap max-h-56 overflow-y-auto">
          <table class="ons-table">
            <thead><tr><th>Obat</th>${branchIds.map((bid) => `<th class="text-right font-mono-num">${S().esc(bid)}</th>`).join('')}<th class="text-right">Total Grup</th></tr></thead>
            <tbody>
              ${(compList.length ? compList : st.masterObat.map((o) => {
                const perBranch = {};
                branchIds.forEach((bid) => { perBranch[bid] = bid === st.cabangId ? S().getSellableStok(o.id_obat) : 0; });
                return { id_obat: o.id_obat, nama_dagang: o.nama_dagang, stok_per_cabang: perBranch, total_semua_cabang: Object.values(perBranch).reduce((a, b) => a + b, 0) };
              })).map((row) => `<tr>
                <td class="font-semibold text-xs">${S().esc(row.nama_dagang)}</td>
                ${branchIds.map((bid) => {
                  const qtyBr = Number(((row.stok_per_cabang || row.per_cabang || {})[bid]) || 0);
                  return `<td class="text-right font-mono-num text-xs ${qtyBr <= 5 ? 'text-red-600 font-bold' : 'text-emerald-600'}">${qtyBr}</td>`;
                }).join('')}
                <td class="text-right font-mono-num font-bold text-xs">${row.total_semua_cabang !== undefined ? row.total_semua_cabang : (row.total_all || 0)}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>` : `<div class="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 rounded-xl border text-xs" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
        <span><b>Mode 1 Apotek Tunggal (${S().esc(st.cabangId || 'ONS-01')})</b> aktif — mendukung pemindahan stok antar gudang, rak &amp; chiller.</span>
        ${S().getRole() === 'Pemilik' ? `<button type="button" onclick="window.toggleMultiBranchMode(true)" class="ons-btn ons-btn-ghost text-xs py-1 px-2.5">Aktifkan Mutasi Multi-Cabang</button>` : ''}
      </div>`}
    </div>`;
  }

  function renderGudangView() {
    const st = S().AppState;
    gudangTab = (st.subTabs && st.subTabs.gudang) || gudangTab || 'batch';
    const seeCost = S().canSeeFinancialCost();
    const sorted = st.stokBatch.slice().sort((a, b) => String(a.tgl_kadaluarsa).localeCompare(String(b.tgl_kadaluarsa)));

    const mq = mutasiSearchQ.trim().toLowerCase();
    const mutasiRows = (st.mutasiStok || []).filter((m) => {
      const okOb = !mutasiFilterObat || String(m.id_obat) === mutasiFilterObat;
      const okJn = matchMutasiJenis(m.jenis_mutasi, mutasiFilterJenis);
      const qU = Number(m.qty_ubah || 0);
      const okAr = mutasiFilterArah === 'MASUK' ? qU > 0 : (mutasiFilterArah === 'KELUAR' ? qU < 0 : true);
      if (!okOb || !okJn || !okAr) return false;
      if (mq) {
        const hay = `${m.nama_dagang || m.id_obat || ''} ${m.no_batch || m.id_batch || ''} ${m.referensi_id || ''} ${m.catatan || ''} ${m.jenis_mutasi || ''}`.toLowerCase();
        if (!hay.includes(mq)) return false;
      }
      return true;
    });

    const totalNilaiGudang = seeCost ? st.stokBatch.reduce((s, b) => s + (Number(b.qty_sisa || 0) * Number(b.hpp_beli || 0)), 0) : 0;
    const gq = gudangBatchQ.trim().toLowerCase();
    const expiredCount = sorted.filter((b) => String(b.status_batch || 'AKTIF') === 'AKTIF' && Number(b.qty_sisa || 0) > 0 && S().daysUntil(b.tgl_kadaluarsa) < 0).length;
    const kritisCount = sorted.filter((b) => String(b.status_batch || 'AKTIF') === 'AKTIF' && Number(b.qty_sisa || 0) > 0 && S().daysUntil(b.tgl_kadaluarsa) >= 0 && S().daysUntil(b.tgl_kadaluarsa) <= 90).length;

    const rakSet = new Set();
    st.masterObat.forEach((o) => { if (o.rak_lokasi) rakSet.add(String(o.rak_lokasi).trim()); });
    const rakList = Array.from(rakSet).sort();
    const activeForOpname = sorted.filter((b) => {
      if (String(b.status_batch || 'AKTIF') !== 'AKTIF') return false;
      const ob = st.masterObat.find((m) => m.id_obat === b.id_obat) || {};
      if (opnameRakFilter && String(ob.rak_lokasi || '').trim() !== opnameRakFilter) return false;
      if (gq) {
        const hay = `${b.no_batch} ${ob.nama_dagang || b.id_obat} ${ob.kode_kfa || ''} ${ob.rak_lokasi || ''}`.toLowerCase();
        if (!hay.includes(gq)) return false;
      }
      return true;
    });
    let opnameCounted = 0;
    let opnameSelisihUnit = 0;
    let opnameSelisihRp = 0;
    activeForOpname.forEach((b) => {
      const raw = opnameDraftQty[b.id_batch];
      if (raw !== undefined && raw !== '') {
        opnameCounted++;
        const diff = Number(raw) - Number(b.qty_sisa || 0);
        opnameSelisihUnit += diff;
        opnameSelisihRp += diff * Number(b.hpp_beli || 0);
      }
    });

    const coldLogs = (st.coldChain || []).slice().sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')));
    const latestCold = coldLogs[0] || null;
    const hasColdAlarm = latestCold && String(latestCold.status_alarm || 'NORMAL') !== 'NORMAL';

    const canOpname = seeCost || S().canAccessSubTab('gudang', 'opname');
    const canAdj = seeCost || S().canAccessSubTab('gudang', 'penyesuaian');
    const canTrf = seeCost || S().canAccessSubTab('gudang', 'transfer');

    return `<div class="space-y-5 ons-view-enter">
      <div class="ons-page-header">
        <div>
          <h1 class="text-xl font-extrabold">Persediaan &amp; Stok Apotek</h1>
          <p class="text-xs" style="color:var(--ons-text-soft)">Pantau stok kadaluarsa FEFO, stok opname, penyesuaian stok, perpindahan gudang/rak, kartu stok BPOM &amp; suhu 2&ndash;8&deg;C.</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <div class="ons-tab-bar">
            <button onclick="window.setGudangTab('batch')" class="ons-tab-btn ${gudangTab === 'batch' ? 'active' : ''}">Stok Kadaluarsa (${sorted.length})</button>
            ${canOpname ? `<button onclick="window.setGudangTab('opname')" class="ons-tab-btn ${gudangTab === 'opname' ? 'active' : ''}">Stok Opname</button>` : ''}
            ${canAdj ? `<button onclick="window.setGudangTab('penyesuaian')" class="ons-tab-btn ${gudangTab === 'penyesuaian' ? 'active' : ''}">Penyesuaian Stok</button>` : ''}
            ${canTrf ? `<button onclick="window.setGudangTab('transfer')" class="ons-tab-btn ${gudangTab === 'transfer' ? 'active' : ''}">Perpindahan Stok</button>` : ''}
            <button onclick="window.setGudangTab('kartu-stok')" class="ons-tab-btn ${gudangTab === 'kartu-stok' ? 'active' : ''}">Kartu Stok Digital (${(st.mutasiStok || []).length})</button>
            <button onclick="window.setGudangTab('coldchain')" class="ons-tab-btn ${gudangTab === 'coldchain' ? 'active' : ''}">Monitor Suhu (Ruang &amp; Kulkas) (${coldLogs.length})${hasColdAlarm ? ' &#9888;' : ''}</button>
          </div>
        </div>
      </div>

      ${gudangTab === 'coldchain' ? _renderSuhuMonitoringSuite(st, coldLogs) : (gudangTab === 'transfer' && canTrf ? _renderGudangTransferTab(st, seeCost)
      : (gudangTab === 'penyesuaian' && canAdj ? _renderGudangPenyesuaianTab(st, seeCost)
      : (gudangTab === 'opname' && canOpname ? _renderGudangOpnameTab(st, activeForOpname, rakList, opnameCounted, opnameSelisihUnit, opnameSelisihRp)
      : (gudangTab === 'kartu-stok' ? `
        <div class="ons-card p-4 space-y-4">
          ${global.ONSProcurementPro ? global.ONSProcurementPro.renderStockFlowSummary(mutasiRows) : ''}
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex flex-wrap gap-2 flex-1">
              <input class="ons-input w-56 text-xs" placeholder="Cari obat, batch, faktur/nota..." value="${S().esc(mutasiSearchQ)}" oninput="window.setMutasiSearchQ(this.value)"/>
              <select class="ons-select w-44 text-xs" onchange="window.setMutasiFilterArah(this.value)" aria-label="Filter Arah Alur Obat">
                <option value="SEMUA" ${mutasiFilterArah === 'SEMUA' ? 'selected' : ''}>Semua Arus (Masuk &amp; Keluar)</option>
                <option value="MASUK" ${mutasiFilterArah === 'MASUK' ? 'selected' : ''}>Hanya Obat Masuk (+)</option>
                <option value="KELUAR" ${mutasiFilterArah === 'KELUAR' ? 'selected' : ''}>Hanya Obat Keluar (-)</option>
              </select>
              <select class="ons-select w-56 text-xs" onchange="window.setMutasiFilterObat(this.value)">
                <option value="">-- Semua Produk Obat --</option>
                ${st.masterObat.map((o) => `<option value="${S().esc(o.id_obat)}" ${mutasiFilterObat === o.id_obat ? 'selected' : ''}>${S().esc(o.nama_dagang)}</option>`).join('')}
              </select>
              <select class="ons-select w-48 text-xs" onchange="window.setMutasiFilterJenis(this.value)">
                <option value="">-- Semua Jenis Mutasi --</option>
                ${['PENJUALAN_POS', 'RETUR_PENJUALAN', 'PEMBELIAN_PBF', 'OPNAME', 'PENYESUAIAN', 'RECALL_KARANTINA', 'RETUR_PBF', 'PENYESUAIAN_MASUK'].map((j) => `<option value="${j}" ${mutasiFilterJenis === j ? 'selected' : ''}>${j}</option>`).join('')}
              </select>
            </div>
            <div class="flex flex-wrap gap-2">
              <button onclick="window.refreshMutasiStokServer()" class="ons-btn ons-btn-ghost text-xs">Refresh Server</button>
              <button onclick="window.exportKartuStok('xlsx')" class="ons-btn ons-btn-emerald text-xs">Export Excel (.xlsx)</button>
              <button onclick="window.exportKartuStok('csv')" class="ons-btn ons-btn-ghost text-xs">Export CSV</button>
              <button onclick="window.exportKartuStok('pdf')" class="ons-btn ons-btn-ghost text-xs">Cetak PDF</button>
            </div>
          </div>
          <div class="ons-table-wrap">
            <table class="ons-table">
              <thead><tr><th>Waktu</th><th>Produk Obat</th><th>No Batch</th><th>Arah &amp; Jenis Mutasi</th><th>Qty Perubahan</th><th>Stok Akhir</th><th>Referensi</th><th>Catatan</th></tr></thead>
              <tbody>
                ${mutasiRows.length === 0 ? `<tr><td colspan="8" class="text-center py-6 text-xs" style="color:var(--ons-text-soft)">Belum ada histori mutasi pada filter ini.</td></tr>` : mutasiRows.slice(0, 120).map((m) => `<tr>
                  <td class="text-xs whitespace-nowrap font-mono-num">${S().formatTgl(m.timestamp, true)}</td>
                  <td class="font-semibold text-xs">${S().esc(m.nama_dagang || m.id_obat)}</td>
                  <td class="font-mono-num text-xs">${S().esc(m.no_batch || m.id_batch)}</td>
                  <td><span class="badge-bpom ${Number(m.qty_ubah) >= 0 ? 'bpom-bebas' : 'bpom-prekursor'}">${Number(m.qty_ubah) >= 0 ? 'MASUK' : 'KELUAR'} &bull; ${S().esc(m.jenis_mutasi)}</span></td>
                  <td class="font-mono-num font-bold ${Number(m.qty_ubah) >= 0 ? 'text-emerald-600' : 'text-red-600'}">${Number(m.qty_ubah) > 0 ? '+' : ''}${m.qty_ubah}</td>
                  <td class="font-mono-num font-bold">${m.stok_akhir}</td>
                  <td class="font-mono-num text-xs">${S().esc(m.referensi_id || '-')}</td>
                  <td class="text-xs" style="color:var(--ons-text-soft)">${S().esc(m.catatan || '-')}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : _renderGudangKadaluarsaTab(st, sorted, expiredCount, kritisCount, totalNilaiGudang, seeCost)))))}
    </div>`;
  }

  global.setGudangTab = (t) => {
    gudangTab = t || 'batch';
    if (S().AppState.subTabs) S().AppState.subTabs.gudang = gudangTab;
    global.renderActiveView();
    if (typeof global.syncNavHighlight === 'function') global.syncNavHighlight();
  };


  let suhuActiveKategori = 'kulkas'; // 'kulkas' | 'ruangan' | 'grafik'
  let suhuSelectedMonth = '2026-11';
  let suhuUnitFilter = '';

  global.setSuhuKategoriTab = (kat) => {
    suhuActiveKategori = kat || 'kulkas';
    if (typeof global.renderActiveView === 'function') global.renderActiveView();
  };

  global.setSuhuSelectedMonth = (m) => {
    suhuSelectedMonth = m || '2026-11';
    if (typeof global.renderActiveView === 'function') global.renderActiveView();
  };

  global.setSuhuUnitFilter = (u) => {
    suhuUnitFilter = u || '';
    if (typeof global.renderActiveView === 'function') global.renderActiveView();
  };

  function _isKulkasLog(log) {
    if (!log) return true;
    const k = String(log.kategori || '').toUpperCase();
    if (k === 'KULKAS') return true;
    if (k === 'RUANGAN') return false;
    const id = String(log.id_kulkas || '').toUpperCase();
    return !id.includes('RUANG') && !id.includes('GUDANG');
  }

  function _renderTemperatureSvgChart(logs, category, options) {
    const isKulkas = category === 'kulkas';
    const opt = options || {};
    const width = opt.width || 840;
    const height = opt.height || 240;
    const padL = 50;
    const padR = 30;
    const padT = 25;
    const padB = 35;
    const plotW = width - padL - padR;
    const plotH = height - padT - padB;

    const yMin = isKulkas ? 0 : 10;
    const yMax = isKulkas ? 12 : 35;
    const yRange = yMax - yMin;

    const getY = (val) => padT + Math.max(0, Math.min(plotH, ((yMax - Number(val || 0)) / yRange) * plotH));

    // Safe zone band & threshold lines
    let safeBandHtml = '';
    let linesHtml = '';
    if (isKulkas) {
      const y8 = getY(8);
      const y2 = getY(2);
      safeBandHtml = `<rect x="${padL}" y="${y8.toFixed(1)}" width="${plotW}" height="${(y2 - y8).toFixed(1)}" fill="rgba(16,185,129,0.14)" stroke="rgba(16,185,129,0.3)" stroke-dasharray="3,3" rx="3"/>`;
      linesHtml += `<line x1="${padL}" y1="${y8.toFixed(1)}" x2="${padL + plotW}" y2="${y8.toFixed(1)}" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="4,4"/>`;
      linesHtml += `<text x="${padL + plotW - 6}" y="${(y8 - 4).toFixed(1)}" fill="#ef4444" font-size="10" font-weight="bold" text-anchor="end">Batas Atas CDOB 8.0°C</text>`;
      linesHtml += `<line x1="${padL}" y1="${y2.toFixed(1)}" x2="${padL + plotW}" y2="${y2.toFixed(1)}" stroke="#3b82f6" stroke-width="1.5" stroke-dasharray="4,4"/>`;
      linesHtml += `<text x="${padL + plotW - 6}" y="${(y2 + 12).toFixed(1)}" fill="#3b82f6" font-size="10" font-weight="bold" text-anchor="end">Batas Bawah CDOB 2.0°C</text>`;
    } else {
      const y30 = getY(30);
      const y25 = getY(25);
      const y15 = getY(15);
      safeBandHtml = `<rect x="${padL}" y="${y25.toFixed(1)}" width="${plotW}" height="${(y15 - y25).toFixed(1)}" fill="rgba(16,185,129,0.14)" stroke="rgba(16,185,129,0.3)" stroke-dasharray="3,3" rx="3"/>`;
      safeBandHtml += `<rect x="${padL}" y="${y30.toFixed(1)}" width="${plotW}" height="${(y25 - y30).toFixed(1)}" fill="rgba(245,158,11,0.06)"/>`;
      linesHtml += `<line x1="${padL}" y1="${y30.toFixed(1)}" x2="${padL + plotW}" y2="${y30.toFixed(1)}" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="4,4"/>`;
      linesHtml += `<text x="${padL + plotW - 6}" y="${(y30 - 4).toFixed(1)}" fill="#ef4444" font-size="10" font-weight="bold" text-anchor="end">Batas Maks Kamar 30.0°C</text>`;
      linesHtml += `<line x1="${padL}" y1="${y25.toFixed(1)}" x2="${padL + plotW}" y2="${y25.toFixed(1)}" stroke="#10b981" stroke-width="1.5" stroke-dasharray="4,4"/>`;
      linesHtml += `<text x="${padL + plotW - 6}" y="${(y25 - 4).toFixed(1)}" fill="#10b981" font-size="10" font-weight="bold" text-anchor="end">Standar Sejuk 25.0°C</text>`;
      linesHtml += `<line x1="${padL}" y1="${y15.toFixed(1)}" x2="${padL + plotW}" y2="${y15.toFixed(1)}" stroke="#3b82f6" stroke-width="1.5" stroke-dasharray="4,4"/>`;
      linesHtml += `<text x="${padL + plotW - 6}" y="${(y15 + 12).toFixed(1)}" fill="#3b82f6" font-size="10" font-weight="bold" text-anchor="end">Batas Bawah 15.0°C</text>`;
    }

    // Horizontal grid lines
    let gridHtml = '';
    const ySteps = isKulkas ? [0, 2, 4, 6, 8, 10, 12] : [10, 15, 20, 25, 30, 35];
    ySteps.forEach((val) => {
      const y = getY(val);
      gridHtml += `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${padL + plotW}" y2="${y.toFixed(1)}" stroke="currentColor" stroke-opacity="0.08" stroke-width="1"/>`;
      gridHtml += `<text x="${padL - 8}" y="${(y + 3.5).toFixed(1)}" fill="currentColor" opacity="0.6" font-size="10" text-anchor="end">${val}°C</text>`;
    });

    // Map log points
    const points = [];
    (logs || []).forEach((log) => {
      const d = new Date(log.timestamp);
      if (Number.isNaN(d.getTime())) return;
      const day = d.getDate();
      const shift = String(log.waktu_shift || (d.getHours() < 12 ? 'PAGI' : (d.getHours() < 16 ? 'SIANG' : 'SORE'))).toUpperCase();
      const xBase = padL + ((Math.max(1, Math.min(31, day)) - 1) / 30) * plotW;
      const x = shift === 'PAGI' ? xBase - 2.5 : (shift === 'SORE' ? xBase + 2.5 : xBase);
      const y = getY(Number(log.suhu_celcius || 0));
      const isAlarm = isKulkas
        ? (Number(log.suhu_celcius || 0) < 2 || Number(log.suhu_celcius || 0) > 8)
        : (Number(log.suhu_celcius || 0) > 30 || Number(log.suhu_celcius || 0) < 15);
      points.push({ x, y, log, day, shift, isAlarm });
    });

    points.sort((a, b) => new Date(a.log.timestamp) - new Date(b.log.timestamp));

    let pathD = '';
    points.forEach((p, idx) => {
      pathD += (idx === 0 ? 'M ' : ' L ') + p.x.toFixed(1) + ' ' + p.y.toFixed(1);
    });
    const strokeColor = isKulkas ? '#2563eb' : '#059669';
    const pathHtml = pathD ? `<path d="${pathD}" fill="none" stroke="${strokeColor}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>` : '';

    let dotsHtml = '';
    points.forEach((p) => {
      const color = p.isAlarm ? '#ef4444' : (p.shift === 'PAGI' ? '#3b82f6' : '#10b981');
      if (p.isAlarm) {
        dotsHtml += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="7.5" fill="none" stroke="#ef4444" stroke-width="2" opacity="0.6"><animate attributeName="r" values="6;9;6" dur="2s" repeatCount="indefinite"/></circle>`;
      }
      dotsHtml += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4.2" fill="${color}" stroke="#ffffff" stroke-width="1.5" class="cursor-pointer transition-transform hover:scale-125">
        <title>Tgl ${p.day} [${p.shift}]: ${Number(p.log.suhu_celcius || 0).toFixed(1)}°C | RH ${Number(p.log.kelembapan || 55)}% | Petugas: ${S().esc(p.log.petugas_id || '-')}</title>
      </circle>`;
    });

    // Day labels on X axis
    let xLabelsHtml = '';
    for (let day = 1; day <= 31; day += 2) {
      const x = padL + ((day - 1) / 30) * plotW;
      xLabelsHtml += `<line x1="${x.toFixed(1)}" y1="${padT}" x2="${x.toFixed(1)}" y2="${padT + plotH}" stroke="currentColor" stroke-opacity="0.04" stroke-width="1" stroke-dasharray="2,2"/>`;
      xLabelsHtml += `<text x="${x.toFixed(1)}" y="${(height - padB + 16).toFixed(1)}" fill="currentColor" opacity="0.6" font-size="9.5" text-anchor="middle">H-${day}</text>`;
    }

    return `<svg viewBox="0 0 ${width} ${height}" class="w-full h-auto select-none" style="overflow:visible">
      ${safeBandHtml}
      ${gridHtml}
      ${linesHtml}
      ${xLabelsHtml}
      ${pathHtml}
      ${dotsHtml}
    </svg>`;
  }

  function _renderSuhuMonitoringSuite(st, coldLogs) {
    const allLogs = (st.coldChain || []).slice().sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')));
    const kulkasLogs = allLogs.filter(_isKulkasLog);
    const ruanganLogs = allLogs.filter((l) => !_isKulkasLog(l));

    // Determine current month or list of available months
    const monthSet = new Set(['2026-11', '2026-10']);
    allLogs.forEach((l) => {
      if (l.timestamp && l.timestamp.length >= 7) monthSet.add(l.timestamp.slice(0, 7));
    });
    const months = Array.from(monthSet).sort().reverse();
    if (!suhuSelectedMonth || !monthSet.has(suhuSelectedMonth)) {
      suhuSelectedMonth = months[0] || '2026-11';
    }

    // Filter logs by month and unit
    const filterByMonthAndUnit = (list) => {
      return list.filter((l) => {
        if (suhuSelectedMonth && l.timestamp && !l.timestamp.startsWith(suhuSelectedMonth)) return false;
        if (suhuUnitFilter && l.id_kulkas !== suhuUnitFilter) return false;
        return true;
      });
    };

    const activeLogs = suhuActiveKategori === 'ruangan'
      ? filterByMonthAndUnit(ruanganLogs)
      : (suhuActiveKategori === 'grafik' ? filterByMonthAndUnit(allLogs) : filterByMonthAndUnit(kulkasLogs));

    const latestKulkas = kulkasLogs[0] || null;
    const latestRuangan = ruanganLogs[0] || null;

    // Presets for unit input
    const kulkasUnits = Array.from(new Set(['CHILLER-VAKSIN-01', 'CHILLER-INSULIN-01', 'KULKAS-SUPPO-01'].concat(kulkasLogs.map((l) => l.id_kulkas).filter(Boolean))));
    const ruanganUnits = Array.from(new Set(['RUANG-APOTEK-01', 'GUDANG-OBAT-01', 'AREA-RACIKAN-LAB'].concat(ruanganLogs.map((l) => l.id_kulkas).filter(Boolean))));
    const currentUnits = suhuActiveKategori === 'ruangan' ? ruanganUnits : kulkasUnits;

    // Cold-chain drug products
    const coldItems = (st.masterObat || []).filter((o) => /2\s*[-–]\s*8|cold|chiller|kulkas|insulin|vaksin/i.test(`${o.suhu_simpan || ''} ${o.rak_lokasi || ''} ${o.nama_dagang || ''}`));

    // Compute stats for Kulkas
    const kulkasMonthLogs = filterByMonthAndUnit(kulkasLogs);
    const kTemps = kulkasMonthLogs.map((l) => Number(l.suhu_celcius || 0)).filter((n) => !Number.isNaN(n));
    const minKulkas = kTemps.length ? Math.min(...kTemps).toFixed(1) : '-';
    const maxKulkas = kTemps.length ? Math.max(...kTemps).toFixed(1) : '-';
    const avgKulkas = kTemps.length ? (kTemps.reduce((a, b) => a + b, 0) / kTemps.length).toFixed(1) : '-';
    const kCompliant = kulkasMonthLogs.filter((l) => Number(l.suhu_celcius || 0) >= 2 && Number(l.suhu_celcius || 0) <= 8).length;
    const complianceKulkasPct = kulkasMonthLogs.length ? ((kCompliant / kulkasMonthLogs.length) * 100).toFixed(1) : '100.0';

    // Compute stats for Ruangan
    const ruanganMonthLogs = filterByMonthAndUnit(ruanganLogs);
    const rTemps = ruanganMonthLogs.map((l) => Number(l.suhu_celcius || 0)).filter((n) => !Number.isNaN(n));
    const minRuangan = rTemps.length ? Math.min(...rTemps).toFixed(1) : '-';
    const maxRuangan = rTemps.length ? Math.max(...rTemps).toFixed(1) : '-';
    const avgRuangan = rTemps.length ? (rTemps.reduce((a, b) => a + b, 0) / rTemps.length).toFixed(1) : '-';
    const rCompliant = ruanganMonthLogs.filter((l) => Number(l.suhu_celcius || 0) >= 15 && Number(l.suhu_celcius || 0) <= 25 && Number(l.kelembapan || 55) <= 70).length;
    const complianceRuanganPct = ruanganMonthLogs.length ? ((rCompliant / ruanganMonthLogs.length) * 100).toFixed(1) : '100.0';

    // Has alarm check
    const hasKulkasAlarm = latestKulkas && (Number(latestKulkas.suhu_celcius || 0) < 2 || Number(latestKulkas.suhu_celcius || 0) > 8);
    const hasRuanganAlarm = latestRuangan && (Number(latestRuangan.suhu_celcius || 0) > 30 || Number(latestRuangan.suhu_celcius || 0) < 15);

    return `<div class="space-y-4 ons-view-enter">
      <!-- Sub-Tab Navigation Bar & Filter Bulan -->
      <div class="ons-card p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-1.5">
          <button onclick="window.setSuhuKategoriTab('kulkas')" class="ons-btn ${suhuActiveKategori === 'kulkas' ? 'ons-btn-primary' : 'ons-btn-ghost'} text-xs font-bold py-1.5 px-3">
            🧊 Suhu Kulkas (2&ndash;8&deg;C) <span class="ml-1 opacity-80 font-normal">(${kulkasLogs.length})</span>
            ${hasKulkasAlarm ? '<span class="ml-1 text-red-300 font-black animate-pulse">&#9888;</span>' : ''}
          </button>
          <button onclick="window.setSuhuKategoriTab('ruangan')" class="ons-btn ${suhuActiveKategori === 'ruangan' ? 'ons-btn-primary' : 'ons-btn-ghost'} text-xs font-bold py-1.5 px-3">
            🌡️ Suhu Ruangan (15&ndash;25&deg;C) <span class="ml-1 opacity-80 font-normal">(${ruanganLogs.length})</span>
            ${hasRuanganAlarm ? '<span class="ml-1 text-red-300 font-black animate-pulse">&#9888;</span>' : ''}
          </button>
          <button onclick="window.setSuhuKategoriTab('grafik')" class="ons-btn ${suhuActiveKategori === 'grafik' ? 'ons-btn-primary' : 'ons-btn-ghost'} text-xs font-bold py-1.5 px-3">
            📊 Grafik &amp; Laporan Cetak (A4)
          </button>
        </div>

        <div class="flex flex-wrap items-center gap-2 text-xs">
          <div class="flex items-center gap-1">
            <span class="font-semibold" style="color:var(--ons-text-soft)">Periode:</span>
            <select aria-label="Pilih Periode Bulan" class="ons-select text-xs py-1 min-h-0" onchange="window.setSuhuSelectedMonth(this.value)">
              ${months.map((m) => `<option value="${m}" ${suhuSelectedMonth === m ? 'selected' : ''}>${m}</option>`).join('')}
            </select>
          </div>
          <div class="flex items-center gap-1">
            <span class="font-semibold" style="color:var(--ons-text-soft)">Unit:</span>
            <select aria-label="Pilih Unit Lokasi" class="ons-select text-xs py-1 min-h-0" onchange="window.setSuhuUnitFilter(this.value)">
              <option value="">Semua Unit (${currentUnits.length})</option>
              ${currentUnits.map((u) => `<option value="${S().esc(u)}" ${suhuUnitFilter === u ? 'selected' : ''}>${S().esc(u)}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>

      <!-- 4 Executive KPI Cards -->
      ${suhuActiveKategori === 'kulkas' ? `
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div class="ons-card p-3.5 border-l-4 ${hasKulkasAlarm ? 'border-l-red-500 ring-1 ring-red-500/20' : 'border-l-blue-500'}">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-semibold" style="color:var(--ons-text-soft)">Suhu Kulkas Terkini</span>
              <span class="w-2 h-2 rounded-full ${hasKulkasAlarm ? 'bg-red-500 animate-pulse' : 'bg-blue-500'}"></span>
            </div>
            <div class="text-xl font-black font-mono-num mt-1 ${hasKulkasAlarm ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}">
              ${latestKulkas ? (Number(latestKulkas.suhu_celcius || 0).toFixed(1) + '&deg;C') : 'Belum Dicatat'}
            </div>
            <div class="text-[10px] mt-0.5" style="color:var(--ons-text-soft)">
              ${latestKulkas ? `<span class="badge-bpom ${hasKulkasAlarm ? 'bpom-keras' : 'bpom-bebas'}">${S().esc(latestKulkas.status_alarm || 'NORMAL')}</span>` : 'Menunggu input'}
            </div>
          </div>

          <div class="ons-card p-3.5 border-l-4 border-l-emerald-500">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-semibold" style="color:var(--ons-text-soft)">Kelembapan Terkini</span>
              <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
            </div>
            <div class="text-xl font-black font-mono-num mt-1 text-emerald-600 dark:text-emerald-400">
              ${latestKulkas ? (Number(latestKulkas.kelembapan || 55) + '% RH') : '-'}
            </div>
            <div class="text-[10px] mt-0.5" style="color:var(--ons-text-soft)">Target Chiller: 45&ndash;65% RH</div>
          </div>

          <div class="ons-card p-3.5 border-l-4 border-l-indigo-500">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-semibold" style="color:var(--ons-text-soft)">Rata-rata ${suhuSelectedMonth}</span>
              <span class="w-2 h-2 rounded-full bg-indigo-500"></span>
            </div>
            <div class="text-xl font-black font-mono-num mt-1 text-indigo-600 dark:text-indigo-400">${avgKulkas}&deg;C</div>
            <div class="text-[10px] mt-0.5" style="color:var(--ons-text-soft)">Min: ${minKulkas}&deg;C &bull; Max: ${maxKulkas}&deg;C</div>
          </div>

          <div class="ons-card p-3.5 border-l-4 border-l-amber-500">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-semibold" style="color:var(--ons-text-soft)">Kepatuhan CDOB (2&ndash;8&deg;C)</span>
              <span class="w-2 h-2 rounded-full bg-amber-500"></span>
            </div>
            <div class="text-xl font-black font-mono-num mt-1 ${complianceKulkasPct >= 95 ? 'text-emerald-600' : 'text-amber-600'}">${complianceKulkasPct}%</div>
            <div class="text-[10px] mt-0.5" style="color:var(--ons-text-soft)">${coldItems.length} produk obat cold-chain</div>
          </div>
        </div>
      ` : (suhuActiveKategori === 'ruangan' ? `
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div class="ons-card p-3.5 border-l-4 ${hasRuanganAlarm ? 'border-l-red-500 ring-1 ring-red-500/20' : 'border-l-emerald-500'}">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-semibold" style="color:var(--ons-text-soft)">Suhu Ruangan Terkini</span>
              <span class="w-2 h-2 rounded-full ${hasRuanganAlarm ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}"></span>
            </div>
            <div class="text-xl font-black font-mono-num mt-1 ${hasRuanganAlarm ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}">
              ${latestRuangan ? (Number(latestRuangan.suhu_celcius || 0).toFixed(1) + '&deg;C') : 'Belum Dicatat'}
            </div>
            <div class="text-[10px] mt-0.5" style="color:var(--ons-text-soft)">
              ${latestRuangan ? (Number(latestRuangan.suhu_celcius || 0) <= 25 ? '<span class="badge-bpom bpom-bebas">SEJUK AC (15–25°C)</span>' : (Number(latestRuangan.suhu_celcius || 0) <= 30 ? '<span class="badge-bpom bpom-terbatas">KAMAR (≤30°C)</span>' : '<span class="badge-bpom bpom-keras">KRITIS PANAS</span>')) : 'Menunggu input'}
            </div>
          </div>

          <div class="ons-card p-3.5 border-l-4 border-l-blue-500">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-semibold" style="color:var(--ons-text-soft)">Kelembapan Ruang Terkini</span>
              <span class="w-2 h-2 rounded-full bg-blue-500"></span>
            </div>
            <div class="text-xl font-black font-mono-num mt-1 text-blue-600 dark:text-blue-400">
              ${latestRuangan ? (Number(latestRuangan.kelembapan || 60) + '% RH') : '-'}
            </div>
            <div class="text-[10px] mt-0.5" style="color:var(--ons-text-soft)">Standar BPOM: Target &le; 70% RH</div>
          </div>

          <div class="ons-card p-3.5 border-l-4 border-l-indigo-500">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-semibold" style="color:var(--ons-text-soft)">Rata-rata ${suhuSelectedMonth}</span>
              <span class="w-2 h-2 rounded-full bg-indigo-500"></span>
            </div>
            <div class="text-xl font-black font-mono-num mt-1 text-indigo-600 dark:text-indigo-400">${avgRuangan}&deg;C</div>
            <div class="text-[10px] mt-0.5" style="color:var(--ons-text-soft)">Min: ${minRuangan}&deg;C &bull; Max: ${maxRuangan}&deg;C</div>
          </div>

          <div class="ons-card p-3.5 border-l-4 border-l-amber-500">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-semibold" style="color:var(--ons-text-soft)">Kepatuhan Suhu Ruangan</span>
              <span class="w-2 h-2 rounded-full bg-amber-500"></span>
            </div>
            <div class="text-xl font-black font-mono-num mt-1 text-emerald-600 dark:text-emerald-400">${complianceRuanganPct}%</div>
            <div class="text-[10px] mt-0.5" style="color:var(--ons-text-soft)">Stabilitas sediaan tablet, sirup &amp; salep</div>
          </div>
        </div>
      ` : `
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div class="ons-card p-3.5 border-l-4 border-l-blue-500">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-semibold" style="color:var(--ons-text-soft)">Total Log Tercatat</span>
              <span class="w-2 h-2 rounded-full bg-blue-500"></span>
            </div>
            <div class="text-xl font-black font-mono-num mt-1">${activeLogs.length} <span class="text-xs font-normal">Observasi</span></div>
            <div class="text-[10px] mt-0.5" style="color:var(--ons-text-soft)">Periode ${suhuSelectedMonth}</div>
          </div>

          <div class="ons-card p-3.5 border-l-4 border-l-emerald-500">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-semibold" style="color:var(--ons-text-soft)">Kepatuhan Kulkas 2&ndash;8&deg;C</span>
              <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
            </div>
            <div class="text-xl font-black font-mono-num mt-1 text-emerald-600">${complianceKulkasPct}%</div>
            <div class="text-[10px] mt-0.5" style="color:var(--ons-text-soft)">Rata-rata: ${avgKulkas}&deg;C</div>
          </div>

          <div class="ons-card p-3.5 border-l-4 border-l-indigo-500">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-semibold" style="color:var(--ons-text-soft)">Kepatuhan Ruang &le;25&deg;C</span>
              <span class="w-2 h-2 rounded-full bg-indigo-500"></span>
            </div>
            <div class="text-xl font-black font-mono-num mt-1 text-indigo-600">${complianceRuanganPct}%</div>
            <div class="text-[10px] mt-0.5" style="color:var(--ons-text-soft)">Rata-rata: ${avgRuangan}&deg;C</div>
          </div>

          <div class="ons-card p-3.5 border-l-4 border-l-amber-500">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-semibold" style="color:var(--ons-text-soft)">Status Laporan CDOB</span>
              <span class="w-2 h-2 rounded-full bg-amber-500"></span>
            </div>
            <div class="text-sm font-black mt-1 text-emerald-600">SIAP CETAK A4</div>
            <div class="text-[10px] mt-0.5" style="color:var(--ons-text-soft)">Siap audit BPOM / Dinkes</div>
          </div>
        </div>
      `)}

      <!-- Fast Record Input Form -->
      <div class="ons-card p-4 space-y-3 text-xs">
        <div class="flex flex-wrap items-center justify-between gap-2 border-b pb-2.5" style="border-color:var(--ons-border)">
          <div>
            <div class="font-extrabold text-sm flex items-center gap-1.5">
              <span>${suhuActiveKategori === 'ruangan' ? '🌡️ Form Pemantauan Suhu Ruangan & Gudang (CDOB 15–25°C)' : '🧊 Form Pemantauan Suhu Kulkas Cold-Chain (CDOB 2–8°C)'}</span>
            </div>
            <p class="text-[11px] mt-0.5" style="color:var(--ons-text-soft)">
              ${suhuActiveKategori === 'ruangan'
                ? 'Catat suhu ruangan apotek & kelembapan (RH target &le; 70%). Sistem otomatis mendeteksi suhu hangat/panas.'
                : 'Pencatatan harian chiller vaksin & insulin. Sistem mengecek rentang aman 2.0°C – 8.0°C dan memicu alarm bila keluar batas.'}
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-1.5">
            <button type="button" onclick="window.openTemperaturePrintPreview('${suhuActiveKategori}','${suhuSelectedMonth}')" class="ons-btn ons-btn-ghost text-xs py-1 px-2.5">
              🖨️ Cetak Lembar Kendali A4
            </button>
            <button type="button" onclick="window.exportTemperatureLogs('xlsx','${suhuActiveKategori}')" class="ons-btn ons-btn-ghost text-xs py-1 px-2.5">
              📊 Unduh Excel
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end pt-1">
          <div class="lg:col-span-2">
            <label for="suhuKategoriInp" class="font-semibold block mb-1">Kategori *</label>
            <select id="suhuKategoriInp" class="ons-select font-bold" onchange="window.handleSuhuKategoriChange(this.value)">
              <option value="KULKAS" ${suhuActiveKategori !== 'ruangan' ? 'selected' : ''}>🧊 Kulkas (2–8°C)</option>
              <option value="RUANGAN" ${suhuActiveKategori === 'ruangan' ? 'selected' : ''}>🌡️ Ruangan (15–25°C)</option>
            </select>
          </div>

          <div class="lg:col-span-2">
            <label for="suhuUnitInp" class="font-semibold block mb-1">Unit / Lokasi *</label>
            <input id="suhuUnitInp" list="suhuUnitPresets" class="ons-input font-mono-num" value="${S().esc(suhuUnitFilter || (suhuActiveKategori === 'ruangan' ? 'RUANG-APOTEK-01' : 'CHILLER-VAKSIN-01'))}"/>
            <datalist id="suhuUnitPresets">${currentUnits.map((u) => `<option value="${S().esc(u)}"></option>`).join('')}</datalist>
          </div>

          <div class="lg:col-span-2">
            <label for="suhuShiftInp" class="font-semibold block mb-1">Shift / Waktu *</label>
            <select id="suhuShiftInp" class="ons-select font-bold">
              <option value="PAGI" ${new Date().getHours() < 12 ? 'selected' : ''}>Pagi (08:00)</option>
              <option value="SIANG" ${new Date().getHours() >= 12 && new Date().getHours() < 16 ? 'selected' : ''}>Siang (14:00)</option>
              <option value="SORE" ${new Date().getHours() >= 16 ? 'selected' : ''}>Sore (16:30)</option>
            </select>
          </div>

          <div class="lg:col-span-2">
            <label for="suhuNilaiInp" class="font-semibold block mb-1">Suhu (&deg;C) *</label>
            <input id="suhuNilaiInp" type="number" step="0.1" value="${suhuActiveKategori === 'ruangan' ? '22.4' : (latestKulkas ? Number(latestKulkas.suhu_celcius || 4.8).toFixed(1) : '4.8')}" class="ons-input font-mono-num font-bold text-sm"/>
          </div>

          <div class="lg:col-span-1">
            <label for="suhuHumInp" class="font-semibold block mb-1">RH %</label>
            <input id="suhuHumInp" type="number" min="0" max="100" step="1" value="${suhuActiveKategori === 'ruangan' ? '60' : (latestKulkas ? Number(latestKulkas.kelembapan || 55) : '55')}" class="ons-input font-mono-num text-sm"/>
          </div>

          <div class="lg:col-span-3">
            <label for="suhuKorektifInp" class="font-semibold block mb-1">Tindakan Korektif</label>
            <input id="suhuKorektifInp" class="ons-input" placeholder="Opsional jika normal, wajib bila deviasi"/>
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-2 pt-1 border-t" style="border-color:var(--ons-border)">
          <div class="text-[11px]" style="color:var(--ons-text-soft)">
            Standar Batas: <b>${suhuActiveKategori === 'ruangan' ? '15.0°C – 25.0°C (Maks 30.0°C, RH ≤ 70%)' : '2.0°C – 8.0°C (Cold Chain)'}</b> &bull; Diverifikasi oleh Petugas &amp; APJ
          </div>
          <button type="button" onclick="window.submitTemperatureLog()" class="ons-btn ons-btn-primary font-bold text-xs py-2 px-4 shadow-sm">
            + Simpan Log Suhu
          </button>
        </div>
      </div>

      <!-- VISUAL LINE CHART (Grafik Sesuai Aturan) -->
      <div class="ons-card p-4 space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 class="font-extrabold text-sm flex items-center gap-1.5">
              <span>📈 Grafik Fluktuasi Suhu &mdash; Periode ${suhuSelectedMonth}</span>
              <span class="badge-bpom bpom-bebas text-[10px]">VEKTOR SVG PRESISI CDOB</span>
            </h3>
            <p class="text-[11px]" style="color:var(--ons-text-soft)">
              Arsiran hijau menunjukkan zona suhu aman sesuai aturan BPOM. Titik di luar zona menandakan alarm penyimpangan mutu.
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2 text-xs">
            <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500"></span><span style="color:var(--ons-text-soft)">Zona Aman</span></span>
            <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-blue-500"></span><span style="color:var(--ons-text-soft)">Shift Pagi</span></span>
            <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span><span style="color:var(--ons-text-soft)">Shift Sore</span></span>
            <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span><span class="font-bold text-red-600">Alarm Deviasi</span></span>
          </div>
        </div>

        ${suhuActiveKategori === 'grafik' ? `
          <div class="space-y-4">
            <div class="p-3 rounded-xl border bg-blue-500/5 border-blue-500/20">
              <div class="font-bold text-xs text-blue-700 dark:text-blue-300 mb-2">1. Grafik Suhu Kulkas &amp; Chiller (2.0&deg;C &ndash; 8.0&deg;C)</div>
              ${_renderTemperatureSvgChart(kulkasMonthLogs, 'kulkas', { width: 840, height: 210 })}
            </div>
            <div class="p-3 rounded-xl border bg-emerald-500/5 border-emerald-500/20">
              <div class="font-bold text-xs text-emerald-700 dark:text-emerald-300 mb-2">2. Grafik Suhu Ruangan Apotek &amp; Gudang (15.0&deg;C &ndash; 25.0&deg;C)</div>
              ${_renderTemperatureSvgChart(ruanganMonthLogs, 'ruangan', { width: 840, height: 210 })}
            </div>
          </div>
        ` : `
          <div class="p-2 rounded-xl border" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
            ${_renderTemperatureSvgChart(activeLogs, suhuActiveKategori === 'ruangan' ? 'ruangan' : 'kulkas', { width: 840, height: 240 })}
          </div>
        `}
      </div>

      <!-- Data Table Section -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div class="ons-card p-4 ${suhuActiveKategori === 'ruangan' ? 'lg:col-span-12' : 'lg:col-span-8'} space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h3 class="font-bold text-sm">
              Riwayat Pencatatan Suhu ${suhuActiveKategori === 'ruangan' ? 'Ruangan' : (suhuActiveKategori === 'grafik' ? 'Gabungan' : 'Kulkas')} (${activeLogs.length})
            </h3>
            <div class="flex flex-wrap gap-1.5">
              <button onclick="window.exportTemperatureLogs('xlsx','${suhuActiveKategori}')" class="ons-btn ons-btn-emerald text-xs py-1 px-2.5 font-bold">Export Excel</button>
              <button onclick="window.exportTemperatureLogs('csv','${suhuActiveKategori}')" class="ons-btn ons-btn-ghost text-xs py-1 px-2.5">Export CSV</button>
            </div>
          </div>

          <div class="ons-table-wrap">
            <table class="ons-table">
              <thead>
                <tr>
                  <th>Waktu Catat</th>
                  <th>Shift</th>
                  <th>Unit / Lokasi</th>
                  <th class="text-right">Suhu (&deg;C)</th>
                  <th class="text-right">RH %</th>
                  <th>Status</th>
                  <th>Petugas</th>
                  <th>Catatan / Tindakan Korektif</th>
                </tr>
              </thead>
              <tbody>
                ${activeLogs.length ? activeLogs.slice(0, 60).map((c) => {
                  const isK = _isKulkasLog(c);
                  const isAlarm = isK
                    ? (Number(c.suhu_celcius || 0) < 2 || Number(c.suhu_celcius || 0) > 8)
                    : (Number(c.suhu_celcius || 0) > 30 || Number(c.suhu_celcius || 0) < 15);
                  return `<tr>
                    <td class="font-mono-num text-xs">${S().formatTgl(c.timestamp, true)}</td>
                    <td class="text-xs font-semibold">${S().esc(c.waktu_shift || (new Date(c.timestamp).getHours() < 12 ? 'PAGI' : 'SORE'))}</td>
                    <td class="font-mono-num text-xs font-semibold">${S().esc(c.id_kulkas || '-')}</td>
                    <td class="text-right font-mono-num font-extrabold ${isAlarm ? 'text-red-600' : 'text-emerald-600'}">${Number(c.suhu_celcius || 0).toFixed(1)}&deg;C</td>
                    <td class="text-right font-mono-num text-xs">${Number(c.kelembapan || 55)}%</td>
                    <td><span class="badge-bpom ${isAlarm ? 'bpom-keras' : 'bpom-bebas'}">${S().esc(c.status_alarm || (isAlarm ? 'ALARM' : 'NORMAL'))}</span></td>
                    <td class="text-xs">${S().esc(c.petugas_id || '-')}</td>
                    <td class="text-xs">${S().esc(c.tindakan_korektif || '-')}</td>
                  </tr>`;
                }).join('') : `<tr><td colspan="8" class="text-center py-6 text-xs">Belum ada log suhu pada periode ini. Gunakan form di atas untuk mencatat suhu hari ini.</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>

        ${suhuActiveKategori !== 'ruangan' ? `
          <div class="ons-card p-4 lg:col-span-4 space-y-3">
            <div class="flex items-center justify-between">
              <h3 class="font-bold text-sm">Obat Cold-Chain 2&ndash;8&deg;C (${coldItems.length})</h3>
              <span class="badge-bpom bpom-bebas text-[10px]">CHILLER</span>
            </div>
            <div class="ons-table-wrap">
              <table class="ons-table">
                <thead><tr><th>Nama Obat</th><th class="text-right">Stok</th></tr></thead>
                <tbody>
                  ${coldItems.length ? coldItems.map((o) => `<tr>
                    <td class="text-xs">
                      <div class="font-bold">${S().esc(o.nama_dagang)}</div>
                      <div class="text-[10px]" style="color:var(--ons-text-soft)">${S().esc(o.rak_lokasi || 'CHILLER')} &bull; ${S().esc(o.suhu_simpan || '2-8°C')}</div>
                    </td>
                    <td class="text-right font-mono-num font-bold text-xs">${S().getSellableStok(o.id_obat)} ${S().esc(o.satuan_dasar || '')}</td>
                  </tr>`).join('') : `<tr><td colspan="2" class="text-center py-5 text-xs">Belum ada produk bertanda Chiller 2&ndash;8&deg;C di Master Obat.</td></tr>`}
                </tbody>
              </table>
            </div>
          </div>
        ` : ''}
      </div>
    </div>`;
  }

  global.handleSuhuKategoriChange = (val) => {
    suhuActiveKategori = (val || 'kulkas').toLowerCase();
    const unitInp = document.getElementById('suhuUnitInp');
    if (unitInp) {
      unitInp.value = suhuActiveKategori === 'ruangan' ? 'RUANG-APOTEK-01' : 'CHILLER-VAKSIN-01';
    }
    const nilaiInp = document.getElementById('suhuNilaiInp');
    if (nilaiInp) {
      nilaiInp.value = suhuActiveKategori === 'ruangan' ? '22.4' : '4.8';
    }
    const humInp = document.getElementById('suhuHumInp');
    if (humInp) {
      humInp.value = suhuActiveKategori === 'ruangan' ? '60' : '55';
    }
    global.renderActiveView();
  };

  global.submitTemperatureLog = async () => {
    try {
      const katEl = document.getElementById('suhuKategoriInp');
      const unitEl = document.getElementById('suhuUnitInp');
      const shiftEl = document.getElementById('suhuShiftInp');
      const nilaiEl = document.getElementById('suhuNilaiInp');
      const humEl = document.getElementById('suhuHumInp');
      const korEl = document.getElementById('suhuKorektifInp');

      const kategori = katEl ? katEl.value : (suhuActiveKategori === 'ruangan' ? 'RUANGAN' : 'KULKAS');
      const unit = unitEl ? unitEl.value.trim() : (kategori === 'RUANGAN' ? 'RUANG-APOTEK-01' : 'CHILLER-VAKSIN-01');
      const shift = shiftEl ? shiftEl.value : 'PAGI';
      const rawSuhu = nilaiEl ? nilaiEl.value : '';
      const suhu = Number(rawSuhu);
      if (rawSuhu === '' || rawSuhu === undefined || Number.isNaN(suhu)) {
        throw new Error('Masukkan angka suhu terukur (°C) yang valid.');
      }
      const hum = Number((humEl && humEl.value) || 55);
      const tindakan = (korEl && korEl.value ? korEl.value : '').trim();

      const res = await API().callApi('coldchain.log', {
        kategori,
        id_kulkas: unit,
        waktu_shift: shift,
        suhu_celcius: suhu,
        kelembapan: hum,
        tindakan_korektif: tindakan
      }, { isWrite: true });

      const it = res && res.item;
      const isAlarm = it && String(it.status_alarm || 'NORMAL') !== 'NORMAL';
      global.toast(
        isAlarm
          ? `PERINGATAN ${kategori}: ${unit} tercatat ${suhu.toFixed(1)}°C (di luar batas aman)! Segera lakukan tindakan korektif.`
          : `Log suhu ${unit} (${suhu.toFixed(1)}°C, RH ${hum}%) berhasil dicatat.`,
        isAlarm ? 'warn' : 'ok'
      );
      await global.bootLoadState(true);
    } catch (e) {
      global.toast(e.message, 'err');
    }
  };

  global.submitColdChainLog = global.submitTemperatureLog;

  function _buildTemperatureReportHtml(category, monthYear) {
    const isKulkas = category === 'kulkas';
    const st = S().AppState;
    const prof = (typeof S().getStoreProfile === 'function') ? S().getStoreProfile() : {};
    const ym = monthYear || suhuSelectedMonth || '2026-11';

    const allLogs = (st.coldChain || []).filter((l) => {
      if (l.timestamp && !l.timestamp.startsWith(ym)) return false;
      return isKulkas ? _isKulkasLog(l) : !_isKulkasLog(l);
    });

    const selectedUnit = suhuUnitFilter || (isKulkas ? 'CHILLER-VAKSIN-01' : 'RUANG-APOTEK-01');
    const unitLogs = allLogs.filter((l) => !suhuUnitFilter || l.id_kulkas === suhuUnitFilter);

    // Compute stats
    const temps = unitLogs.map((l) => Number(l.suhu_celcius || 0)).filter((n) => !Number.isNaN(n));
    const hums = unitLogs.map((l) => Number(l.kelembapan || 0)).filter((n) => !Number.isNaN(n));
    const minTemp = temps.length ? Math.min(...temps).toFixed(1) : '-';
    const maxTemp = temps.length ? Math.max(...temps).toFixed(1) : '-';
    const avgTemp = temps.length ? (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1) : '-';
    const avgHum = hums.length ? (hums.reduce((a, b) => a + b, 0) / hums.length).toFixed(0) : '-';

    const compliantCount = unitLogs.filter((l) => {
      const s = Number(l.suhu_celcius || 0);
      return isKulkas ? (s >= 2 && s <= 8) : (s >= 15 && s <= 25 && Number(l.kelembapan || 55) <= 70);
    }).length;
    const compliancePct = unitLogs.length ? ((compliantCount / unitLogs.length) * 100).toFixed(1) : '100.0';

    // Group logs by day (1..31)
    const logsByDay = {};
    unitLogs.forEach((l) => {
      const d = new Date(l.timestamp);
      if (!Number.isNaN(d.getTime())) {
        const day = d.getDate();
        if (!logsByDay[day]) logsByDay[day] = [];
        logsByDay[day].push(l);
      }
    });

    // Generate chart SVG for printable report (high contrast for white paper)
    const chartSvg = _renderTemperatureSvgChart(unitLogs, isKulkas ? 'kulkas' : 'ruangan', { width: 780, height: 200 });

    // Table matrix 1..31
    const [yStr, mStr] = ym.split('-');
    const totalDaysInMonth = new Date(Number(yStr), Number(mStr), 0).getDate() || 30;

    let matrixRowsHtml = '';
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const dayLogs = logsByDay[day] || [];
      const pagi = dayLogs.find((l) => (l.waktu_shift || '').toUpperCase() === 'PAGI' || new Date(l.timestamp).getHours() < 12);
      const sore = dayLogs.find((l) => (l.waktu_shift || '').toUpperCase() === 'SORE' || new Date(l.timestamp).getHours() >= 12);

      const pSuhu = pagi ? Number(pagi.suhu_celcius).toFixed(1) : '-';
      const pRh = pagi ? pagi.kelembapan + '%' : '-';
      const pJam = pagi ? S().formatTgl(pagi.timestamp, true).slice(11, 16) : '-';
      const pParaf = pagi ? (pagi.petugas_id ? pagi.petugas_id.split(' ')[0] : 'OK') : '-';

      const sSuhu = sore ? Number(sore.suhu_celcius).toFixed(1) : '-';
      const sRh = sore ? sore.kelembapan + '%' : '-';
      const sJam = sore ? S().formatTgl(sore.timestamp, true).slice(11, 16) : '-';
      const sParaf = sore ? (sore.petugas_id ? sore.petugas_id.split(' ')[0] : 'OK') : '-';

      const dayAlarm = (pagi && String(pagi.status_alarm || 'NORMAL') !== 'NORMAL') || (sore && String(sore.status_alarm || 'NORMAL') !== 'NORMAL');
      const dayKorektif = (sore && sore.tindakan_korektif && sore.tindakan_korektif !== '-') ? sore.tindakan_korektif : (pagi && pagi.tindakan_korektif && pagi.tindakan_korektif !== '-' ? pagi.tindakan_korektif : '-');

      matrixRowsHtml += `<tr style="border-bottom:1px solid #E2E8F0;${dayAlarm ? 'background:#FEF2F2;' : ''}">
        <td style="border:1px solid #CBD5E1;padding:3.5px 5px;font-weight:bold;">${day}</td>
        <td style="border:1px solid #CBD5E1;padding:3.5px 5px;font-family:monospace;">${pJam}</td>
        <td style="border:1px solid #CBD5E1;padding:3.5px 5px;font-weight:bold;${pagi && ((isKulkas && (pagi.suhu_celcius < 2 || pagi.suhu_celcius > 8)) || (!isKulkas && pagi.suhu_celcius > 30)) ? 'color:#DC2626;' : ''}">${pSuhu}</td>
        <td style="border:1px solid #CBD5E1;padding:3.5px 5px;font-family:monospace;">${pRh}</td>
        <td style="border:1px solid #CBD5E1;padding:3.5px 5px;font-size:9px;">${pParaf}</td>
        <td style="border:1px solid #CBD5E1;padding:3.5px 5px;font-family:monospace;">${sJam}</td>
        <td style="border:1px solid #CBD5E1;padding:3.5px 5px;font-weight:bold;${sore && ((isKulkas && (sore.suhu_celcius < 2 || sore.suhu_celcius > 8)) || (!isKulkas && sore.suhu_celcius > 30)) ? 'color:#DC2626;' : ''}">${sSuhu}</td>
        <td style="border:1px solid #CBD5E1;padding:3.5px 5px;font-family:monospace;">${sRh}</td>
        <td style="border:1px solid #CBD5E1;padding:3.5px 5px;font-size:9px;">${sParaf}</td>
        <td style="border:1px solid #CBD5E1;padding:3.5px 5px;font-weight:bold;${dayAlarm ? 'color:#DC2626;' : 'color:#059669;'}">${dayLogs.length ? (dayAlarm ? 'ALARM' : 'NORMAL') : '-'}</td>
        <td style="border:1px solid #CBD5E1;padding:3.5px 5px;text-align:left;font-size:9.5px;">${S().esc(dayKorektif)}</td>
      </tr>`;
    }

    const monthNames = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const monthLabel = (monthNames[Number(mStr)] || mStr) + ' ' + yStr;

    return `<div style="max-width:820px;margin:0 auto;background:#FFFFFF;color:#0F172A;font-family:Arial,Helvetica,sans-serif;padding:24px;border:1.5px solid #0F172A;box-sizing:border-box;">
      <!-- KOP RESMI APOTEK -->
      <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:2.5px solid #0F172A;padding-bottom:12px;margin-bottom:14px;">
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="width:48px;height:48px;border-radius:10px;background:#1D4ED8;color:#FFFFFF;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:24px;">+</div>
          <div>
            <div style="font-size:17px;font-weight:900;letter-spacing:0.5px;color:#0F172A;">${(prof.nama_usaha || 'APOTEK ONS FARMA').toUpperCase()}</div>
            <div style="font-size:11px;color:#334155;">${prof.alamat || 'Jl. Kesehatan Raya No. 45, Kota Semarang'} &bull; Telp: (024) 8412345</div>
            <div style="font-size:11px;color:#334155;"><b>No. SIA:</b> ${prof.no_sia || 'SIA.503/0021/DPMPTSP/2024'} &bull; <b>APJ:</b> ${prof.nama_pemilik || 'apt. Anissa Faradifa R. Is Rumi, S.Farm'} (<b>SIPA:</b> ${prof.sipa_pemilik || '19950812/SIPA_33.74/2023/2048'})</div>
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:10px;font-weight:bold;color:#475569;text-transform:uppercase;">DOKUMEN PENGENDALIAN MUTU CDOB</div>
          <div style="font-size:14px;font-weight:900;color:#1D4ED8;">FORM-CDOB-SUHU-01</div>
          <div style="font-size:10px;color:#64748B;">Revisi: 03 &bull; Halaman 1 dari 1</div>
        </div>
      </div>

      <!-- TITLE & METADATA -->
      <div style="text-align:center;margin-bottom:14px;">
        <h2 style="font-size:15px;font-weight:bold;margin:0 0 4px;text-transform:uppercase;color:#0F172A;">
          LEMBAR KENDALI &amp; GRAFIK PEMANTAUAN SUHU ${isKulkas ? 'KULKAS / CHILLER COLD-CHAIN' : 'RUANGAN &amp; GUDANG FARMASI'}
        </h2>
        <div style="font-size:11.5px;color:#334155;">Standar Peraturan BPOM RI tentang CDOB &amp; Permenkes RI No. 73 Tahun 2016</div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;background:#F8FAFC;border:1px solid #CBD5E1;border-radius:6px;padding:8px 12px;margin-bottom:14px;font-size:11px;">
        <div><span style="color:#64748B;">Unit / Lokasi:</span><br/><b>${selectedUnit}</b></div>
        <div><span style="color:#64748B;">Periode Pemantauan:</span><br/><b>${monthLabel}</b></div>
        <div><span style="color:#64748B;">Standar Rentang:</span><br/><b style="color:${isKulkas ? '#1D4ED8' : '#059669'};">${isKulkas ? '2.0°C – 8.0°C (Cold Chain)' : '15.0°C – 25.0°C (RH ≤ 70%)'}</b></div>
        <div><span style="color:#64748B;">Alat Thermohygrometer:</span><br/><b>Digital Calibrated (TH-2025-081)</b></div>
      </div>

      <!-- GRAFIK TREN SUHU TERCETAK JELAS -->
      <div style="border:1px solid #CBD5E1;border-radius:6px;padding:10px;margin-bottom:14px;background:#FFFFFF;">
        <div style="font-size:11px;font-weight:bold;margin-bottom:6px;color:#0F172A;display:flex;justify-content:space-between;">
          <span>GRAFIK FLUKTUASI SUHU HARIAN &mdash; ${monthLabel}</span>
          <span style="font-size:10px;color:#64748B;">Waktu Catat: Pagi (08:00) &bull; Sore (16:30)</span>
        </div>
        ${chartSvg}
      </div>

      <!-- TABEL REKAPITULASI MATRIKS 31 HARI -->
      <div style="margin-bottom:14px;">
        <table style="width:100%;border-collapse:collapse;font-size:10px;text-align:center;">
          <thead>
            <tr style="background:#F1F5F9;font-weight:bold;">
              <th style="border:1px solid #CBD5E1;padding:4px 5px;">TGL</th>
              <th style="border:1px solid #CBD5E1;padding:4px 5px;">PAGI (JAM)</th>
              <th style="border:1px solid #CBD5E1;padding:4px 5px;">SUHU (°C)</th>
              <th style="border:1px solid #CBD5E1;padding:4px 5px;">RH %</th>
              <th style="border:1px solid #CBD5E1;padding:4px 5px;">PARAF</th>
              <th style="border:1px solid #CBD5E1;padding:4px 5px;">SORE (JAM)</th>
              <th style="border:1px solid #CBD5E1;padding:4px 5px;">SUHU (°C)</th>
              <th style="border:1px solid #CBD5E1;padding:4px 5px;">RH %</th>
              <th style="border:1px solid #CBD5E1;padding:4px 5px;">PARAF</th>
              <th style="border:1px solid #CBD5E1;padding:4px 5px;">STATUS</th>
              <th style="border:1px solid #CBD5E1;padding:4px 5px;text-align:left;">TINDAKAN KOREKTIF / KETERANGAN</th>
            </tr>
          </thead>
          <tbody>
            ${matrixRowsHtml}
          </tbody>
        </table>
      </div>

      <!-- STATISTIK KEPATUHAN & TANDA TANGAN -->
      <div style="display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:12px;margin-top:14px;font-size:11px;">
        <div style="border:1px solid #CBD5E1;border-radius:6px;padding:8px 12px;background:#F8FAFC;">
          <div style="font-weight:bold;margin-bottom:4px;color:#0F172A;">Ringkasan Evaluasi Mutu CDOB:</div>
          <div>&bull; Suhu Terendah (Min): <b>${minTemp}&deg;C</b></div>
          <div>&bull; Suhu Tertinggi (Max): <b>${maxTemp}&deg;C</b></div>
          <div>&bull; Rata-rata Suhu: <b>${avgTemp}&deg;C</b> &bull; RH: <b>${avgHum}%</b></div>
          <div>&bull; Tingkat Kepatuhan: <b style="color:${compliancePct >= 95 ? '#059669' : '#DC2626'};">${compliancePct}% (${compliancePct >= 95 ? 'MEMENUHI SYARAT' : 'PERLU EVALUASI'})</b></div>
        </div>
        <div style="text-align:center;padding:8px;">
          <div>Petugas Pemantau:</div>
          <div style="height:48px;"></div>
          <div style="font-weight:bold;text-decoration:underline;">${(unitLogs[0] && unitLogs[0].petugas_id) || 'apt. Siti Rahma, S.Farm'}</div>
          <div style="font-size:10px;color:#64748B;">Staf / Asisten Tenaga Kefarmasian</div>
        </div>
        <div style="text-align:center;padding:8px;">
          <div>Mengetahui &amp; Memvalidasi:</div>
          <div style="height:48px;"></div>
          <div style="font-weight:bold;text-decoration:underline;">${prof.nama_pemilik || 'apt. Anissa Faradifa R. Is Rumi, S.Farm'}</div>
          <div style="font-size:10px;color:#64748B;">Apoteker Penanggung Jawab (APJ)<br/>SIPA: ${prof.sipa_pemilik || '19950812/SIPA_33.74/2023/2048'}</div>
        </div>
      </div>
    </div>`;
  }

  global.openTemperaturePrintPreview = (category, monthYear) => {
    const cat = category || suhuActiveKategori || 'kulkas';
    const my = monthYear || suhuSelectedMonth || '2026-11';
    const reportHtml = _buildTemperatureReportHtml(cat, my);

    S().openModal(`<div class="p-4 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
      <div class="flex flex-wrap items-center justify-between gap-2 border-b pb-3" style="border-color:var(--ons-border)">
        <div>
          <h3 class="font-extrabold text-base">Pratinjau Lembar Kendali &amp; Grafik Suhu CDOB (A4)</h3>
          <p class="text-xs" style="color:var(--ons-text-soft)">Format formulir audit resmi BPOM RI &amp; Dinas Kesehatan untuk pelaporan bulanan.</p>
        </div>
        <div class="flex items-center gap-2">
          <button type="button" onclick="window.printTemperatureReport('${cat}','${my}')" class="ons-btn ons-btn-primary text-xs font-bold py-1.5 px-3">
            🖨️ Cetak Formulir (Print / PDF)
          </button>
          <button type="button" onclick="window.exportTemperatureLogs('xlsx','${cat}')" class="ons-btn ons-btn-emerald text-xs font-bold py-1.5 px-3">
            📊 Unduh Excel
          </button>
          <button type="button" onclick="ONSStore.closeModal()" class="ons-btn ons-btn-ghost text-xs py-1.5 px-3">&times; Tutup</button>
        </div>
      </div>

      <div class="shadow-xl rounded-xl overflow-hidden border border-gray-300">
        ${reportHtml}
      </div>
    </div>`, '900px');
  };

  global.printTemperatureReport = (category, monthYear) => {
    const cat = category || suhuActiveKategori || 'kulkas';
    const my = monthYear || suhuSelectedMonth || '2026-11';
    const reportHtml = _buildTemperatureReportHtml(cat, my);
    S().printHtmlZone(reportHtml, 'a4');
  };

  global.printColdChainLogCdob = () => {
    global.printTemperatureReport('kulkas');
  };

  global.exportTemperatureLogs = (fmt, category) => {
    const st = S().AppState;
    const allLogs = (st.coldChain || []).filter((l) => {
      if (category === 'kulkas') return _isKulkasLog(l);
      if (category === 'ruangan') return !_isKulkasLog(l);
      return true;
    });

    const rows = allLogs.map((l, idx) => ({
      no: idx + 1,
      waktu: S().formatTgl(l.timestamp, true),
      kategori: l.kategori || (_isKulkasLog(l) ? 'KULKAS' : 'RUANGAN'),
      unit_lokasi: l.id_kulkas || '-',
      shift: l.waktu_shift || (new Date(l.timestamp).getHours() < 12 ? 'PAGI' : 'SORE'),
      suhu_celcius: Number(l.suhu_celcius || 0),
      kelembapan_rh: Number(l.kelembapan || 55),
      status_alarm: l.status_alarm || 'NORMAL',
      petugas: l.petugas_id || '-',
      tindakan_korektif: l.tindakan_korektif || '-'
    }));

    const prof = (typeof S().getStoreProfile === 'function') ? S().getStoreProfile() : {};
    const apotekName = prof.nama_usaha || 'Apotek ONS Farma';
    const fileBase = `log-suhu-${category || 'semua'}-${suhuSelectedMonth || '2026-11'}`;

    S().exportDataset(fmt || 'xlsx', `Monitoring Suhu & Kelembapan CDOB - ${apotekName}`, fileBase, [
      { key: 'no', label: 'No', type: 'int', width: 6 },
      { key: 'waktu', label: 'Waktu Catat', type: 'text', width: 20 },
      { key: 'kategori', label: 'Kategori', type: 'status', width: 12 },
      { key: 'unit_lokasi', label: 'Unit / Lokasi', type: 'text', width: 22 },
      { key: 'shift', label: 'Shift', type: 'text', width: 10 },
      { key: 'suhu_celcius', label: 'Suhu (°C)', type: 'num', width: 12 },
      { key: 'kelembapan_rh', label: 'RH (%)', type: 'int', width: 10 },
      { key: 'status_alarm', label: 'Status Alarm', type: 'status', width: 18 },
      { key: 'petugas', label: 'Petugas Pemantau', type: 'text', width: 22 },
      { key: 'tindakan_korektif', label: 'Tindakan Korektif', type: 'wrap', width: 35 }
    ], rows, {
      sheetName: 'Log_Suhu_CDOB',
      subtitle: `Periode: ${suhuSelectedMonth} | Dicetak: ${S().formatTgl(new Date().toISOString(), true)} | Total ${rows.length} catatan`,
      emptyMessage: 'Belum ada log suhu pada filter yang dipilih.'
    });
  };

  global.submitMutasiCabangSend = async () => {
    try {
      const asal = (document.getElementById('trfAsalCab') || {}).value || S().AppState.cabangId || 'ONS-01';
      const tujuan = (document.getElementById('trfTujuanCab') || {}).value || 'ONS-02';
      const idObat = (document.getElementById('trfObatId') || {}).value || '';
      const qty = Math.max(1, Number((document.getElementById('trfQtyInp') || {}).value || 0));
      const catatan = (document.getElementById('trfNoteInp') || {}).value || '';
      const res = await API().callApi('cabang.transferSend', { cabang_asal: asal, cabang_tujuan: tujuan, items: [{ id_obat: idObat, qty }], catatan }, { isWrite: true });
      global.toast('Surat Jalan ' + (res.item ? res.item.no_surat_jalan : 'Mutasi') + ' terkirim (' + asal + ' -> ' + tujuan + ')!', 'ok');
      await global.bootLoadState(true);
    } catch (e) { global.toast(e.message, 'err'); }
  };

  global.receiveMutasiCabang = async (idTransfer) => {
    try {
      const res = await API().callApi('cabang.transferReceive', { id_transfer: idTransfer }, { isWrite: true });
      global.toast('Barang mutasi ' + (res.item ? res.item.no_surat_jalan : '') + ' resmi diterima & masuk Batch FEFO tujuan!', 'ok');
      await global.bootLoadState(true);
    } catch (e) { global.toast(e.message, 'err'); }
  };

  global.printSuratJalanMutasi = (idTransfer) => {
    const tr = (S().AppState.mutasiCabang || []).find((m) => m.id_transfer === idTransfer);
    if (!tr) { global.toast('Data Surat Jalan tidak ditemukan.', 'warn'); return; }
    let trLines = [];
    try { trLines = JSON.parse(tr.items_json || '[]'); } catch (e) {}
    if (!trLines.length && tr.nama_dagang) {
      trLines = [{ nama_dagang: tr.nama_dagang, no_batch: tr.no_batch, tgl_kadaluarsa: tr.tgl_kadaluarsa, qty: tr.qty_kirim || tr.total_qty_dasar || 0 }];
    }
    const prof = S().getStoreProfile ? S().getStoreProfile() : {};
    S().printHtmlZone(`<div style="max-width:680px;margin:0 auto;font-family:Arial,sans-serif;font-size:12px;color:#111;border:2px solid #1e293b;padding:20px;">
      <div style="display:flex;justify-content:space-between;border-bottom:2px solid #1e293b;padding-bottom:10px;margin-bottom:12px;">
        <div>
          <div style="font-size:16px;font-weight:bold;">${S().esc((prof.nama_usaha || 'APOTEK ONS FARMA').toUpperCase())}</div>
          <div style="font-size:11px;">APJ: ${S().esc(prof.nama_pemilik || 'apt. Anissa Faradifa R. Is Rumi')} &bull; SIPA: ${S().esc(prof.sipa_pemilik || '-')}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:14px;font-weight:bold;">SURAT JALAN MUTASI STOK</div>
          <div style="font-family:monospace;font-weight:bold;">${S().esc(tr.no_surat_jalan || tr.id_transfer)}</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px;font-size:11px;">
        <div><b>Cabang Pengirim:</b> ${S().esc(tr.cabang_asal)}<br/><b>Tanggal Kirim:</b> ${S().formatTgl(tr.tanggal_kirim || tr.tgl_kirim, true)}<br/><b>Petugas Kirim:</b> ${S().esc(tr.dikirim_oleh || '-')}</div>
        <div><b>Cabang Penerima:</b> ${S().esc(tr.cabang_tujuan)}<br/><b>Status:</b> ${S().esc(tr.status_transfer || 'DIKIRIM')}<br/><b>Penerima:</b> ${S().esc(tr.diterima_oleh || 'Menunggu Konfirmasi')}</div>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:16px;">
        <thead><tr style="background:#f1f5f9;"><th style="border:1px solid #cbd5e1;padding:6px;text-align:left;">Nama Produk</th><th style="border:1px solid #cbd5e1;padding:6px;text-align:left;">No. Batch &amp; ED</th><th style="border:1px solid #cbd5e1;padding:6px;text-align:right;">Qty Kirim</th></tr></thead>
        <tbody>
          ${trLines.map((ln) => `<tr>
            <td style="border:1px solid #cbd5e1;padding:6px;font-weight:bold;">${S().esc(ln.nama_dagang || '-')}</td>
            <td style="border:1px solid #cbd5e1;padding:6px;font-family:monospace;">${S().esc(ln.no_batch || '-')} &bull; ED ${S().esc(ln.tgl_kadaluarsa || '-')}</td>
            <td style="border:1px solid #cbd5e1;padding:6px;text-align:right;font-weight:bold;">${ln.qty || 0} Unit</td>
          </tr>`).join('')}
        </tbody>
      </table>
      <div style="font-size:11px;margin-bottom:24px;"><b>Catatan:</b> ${S().esc(tr.catatan || 'Transfer antar-cabang sesuai standar CDOB & FEFO')}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;text-align:center;font-size:11px;margin-top:32px;">
        <div>Pengirim (${S().esc(tr.cabang_asal)})<br/><br/><br/>( ____________________ )</div>
        <div>Penerima (${S().esc(tr.cabang_tujuan)})<br/><br/><br/>( ____________________ )</div>
      </div>
    </div>`);
  };
  global.setGudangBatchQ = (v) => { gudangBatchQ = v || ''; global.renderActiveView(); };
  global.setGudangBatchFilter = (v) => { gudangBatchFilter = v || 'SEMUA'; global.renderActiveView(); };
  global.setEdDateRange = (f, t) => { edDateFrom = f || ''; edDateTo = t || ''; global.renderActiveView(); };
  global.toggleEdBatchSelect = (idBatch, checked) => {
    if (checked) edSelectedIds.add(idBatch);
    else edSelectedIds.delete(idBatch);
    global.renderActiveView();
  };
  global.clearEdBatchSelection = () => { edSelectedIds.clear(); global.renderActiveView(); };
  global.batchRecallSelected = async () => {
    const ids = Array.from(edSelectedIds);
    if (!ids.length) return global.toast('Pilih minimal 1 batch terlebih dahulu.', 'warn');
    try {
      let okCount = 0;
      for (let i = 0; i < ids.length; i++) {
        const b = (S().AppState.stokBatch || []).find((x) => x.id_batch === ids[i]);
        if (b && b.status_batch === 'AKTIF') {
          await API().callApi('stok.recallBatch', { id_batch: ids[i], alasan: 'Karantina Batch Kadaluarsa / FEFO' }, { isWrite: true });
          okCount++;
        }
      }
      edSelectedIds.clear();
      global.toast(`${okCount} batch terpilih masuk Karantina BPOM!`, 'ok');
      await global.bootLoadState(true);
    } catch (e) { global.toast(e.message, 'err'); }
  };
  global.exportStokKadaluarsa = (fmt) => {
    const st = S().AppState;
    const seeCost = S().canSeeFinancialCost();
    const prof = S().getStoreProfile ? S().getStoreProfile() : {};
    const rows = (st.stokBatch || []).map((b, idx) => {
      const o = (st.masterObat || []).find((m) => m.id_obat === b.id_obat) || {};
      return {
        no: idx + 1,
        nama_produk: o.nama_dagang || b.id_obat,
        no_batch: b.no_batch || '-',
        rak: b.rak_penyimpanan || o.rak_lokasi || '-',
        supplier: _resolveBatchSupplier(st, b, o),
        gudang: b.gudang || (b.cabang_id && b.cabang_id !== 'ONS-01' ? b.cabang_id : 'Gudang Utama'),
        tgl_kadaluarsa: b.tgl_kadaluarsa || '-',
        batas_retur: _calcBatasReturIso(b.tgl_kadaluarsa),
        ...(seeCost ? { hpp: Number(b.hpp_beli || o.hpp_avg || 0) } : {}),
        kuantitas: Number(b.qty_sisa || 0),
        status: b.status_batch || 'AKTIF'
      };
    });
    const hdr = [
      { key: 'no', label: 'No', type: 'int', width: 6 },
      { key: 'nama_produk', label: 'Nama Produk', type: 'wrap', width: 28 },
      { key: 'no_batch', label: 'No Batch', width: 14 },
      { key: 'rak', label: 'Rak', width: 10 },
      { key: 'supplier', label: 'Supplier', type: 'wrap', width: 22 },
      { key: 'gudang', label: 'Gudang', width: 14 },
      { key: 'tgl_kadaluarsa', label: 'Tgl. Kadaluarsa', width: 14 },
      { key: 'batas_retur', label: 'Batas Retur', width: 14 },
      ...(seeCost ? [{ key: 'hpp', label: 'Harga Pokok', type: 'currency', width: 14 }] : []),
      { key: 'kuantitas', label: 'Kuantitas', type: 'int', sum: true, width: 11 },
      { key: 'status', label: 'Status', type: 'status', width: 12 }
    ];
    S().exportDataset(fmt || 'xlsx', `Stok Kadaluarsa & Batch FEFO - ${prof.nama_usaha || 'Apotek ONS Farma'}`, `stok-kadaluarsa-${new Date().toISOString().slice(0, 10)}`, hdr, rows, { sheetName: 'Stok_Kadaluarsa' });
  };

  global.startNewOpnameSession = () => {
    opnameSessionActive = true;
    global.renderActiveView();
  };
  global.closeOpnameSession = () => {
    opnameSessionActive = false;
    global.renderActiveView();
  };
  global.openRiwayatOpnameModal = () => {
    const st = S().AppState;
    const savedSess = _readJsonLs('ONS_OPNAME_HIST_V1', []);
    const derivedMap = {};
    (st.mutasiStok || []).forEach((m) => {
      if (String(m.jenis_mutasi || '') !== 'OPNAME') return;
      const key = m.referensi_id || String(m.timestamp || '').slice(0, 10);
      if (!derivedMap[key]) {
        derivedMap[key] = {
          id: key,
          tanggal: m.timestamp,
          gudang: m.gudang || 'Gudang Utama',
          petugas: m.petugas || m.user_id || 'Pemilik / APJ',
          status: 'SELESAI',
          jumlah_batch: 0,
          catatan: m.catatan || 'Stock Opname'
        };
      }
      derivedMap[key].jumlah_batch++;
    });
    const merged = (Array.isArray(savedSess) ? savedSess : []).slice();
    Object.values(derivedMap).forEach((d) => {
      if (!merged.some((x) => x.id === d.id)) merged.push(d);
    });
    merged.sort((a, b) => String(b.tanggal || '').localeCompare(String(a.tanggal || '')));

    const renderRows = (list) => list.length ? list.map((it, idx) => `<tr>
      <td class="font-mono-num text-xs">${idx + 1}.</td>
      <td class="text-xs">
        <div class="font-bold">${S().esc(it.id)} &bull; <span class="badge-bpom bpom-bebas">${S().esc(it.status || 'SELESAI')}</span></div>
        <div style="color:var(--ons-text-soft)">${S().formatTgl(it.tanggal, true)} &bull; ${S().esc(it.gudang || 'Gudang Utama')} &bull; Petugas: ${S().esc(it.petugas || 'APJ')} &bull; <b>${Number(it.jumlah_batch || 0)}</b> batch</div>
        ${it.catatan ? `<div class="text-[11px] italic" style="color:var(--ons-text-soft)">${S().esc(it.catatan)}</div>` : ''}
      </td>
      <td><button type="button" onclick="ONSStore.closeModal();window.setGudangTab('penyesuaian')" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2">Lihat Penyesuaian</button></td>
    </tr>`).join('') : '<tr><td colspan="3" class="text-center py-6 text-xs">Data tidak ditemukan.</td></tr>';

    S().openModal(`<div class="p-6 space-y-4 text-xs">
      <div class="flex justify-between items-center">
        <h3 class="font-extrabold text-base text-blue-600">Riwayat Opname</h3>
        <button type="button" onclick="ONSStore.closeModal()" class="text-xl">&times;</button>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <select id="roStatusFilter" class="ons-select text-xs w-36" onchange="window.filterRiwayatOpnameModal()">
          <option value="">Filter Status</option>
          <option value="SELESAI">SELESAI</option>
          <option value="PROSES">PROSES</option>
        </select>
        <select id="roGudangFilter" class="ons-select text-xs w-40" onchange="window.filterRiwayatOpnameModal()">
          <option value="">Filter Gudang</option>
          <option value="Gudang Utama">Gudang Utama</option>
        </select>
        <input id="roDateFilter" type="date" class="ons-input text-xs w-36 font-mono-num" onchange="window.filterRiwayatOpnameModal()"/>
        <button type="button" onclick="ONSStore.closeModal();window.startNewOpnameSession()" class="ons-btn ons-btn-primary text-xs ml-auto">+ Mulai Opname Baru</button>
      </div>
      <div class="ons-table-wrap max-h-72 overflow-y-auto">
        <table class="ons-table is-compact">
          <thead><tr><th>No.</th><th>Info Opname</th><th>Actions</th></tr></thead>
          <tbody id="roTableBody">${renderRows(merged)}</tbody>
        </table>
      </div>
    </div>`, '680px');
    global._roAllRows = merged;
    global.filterRiwayatOpnameModal = () => {
      const stVal = (document.getElementById('roStatusFilter') || {}).value || '';
      const gdVal = (document.getElementById('roGudangFilter') || {}).value || '';
      const dtVal = (document.getElementById('roDateFilter') || {}).value || '';
      const filtered = (global._roAllRows || []).filter((x) => {
        if (stVal && String(x.status || 'SELESAI').toUpperCase() !== stVal) return false;
        if (gdVal && String(x.gudang || 'Gudang Utama') !== gdVal) return false;
        if (dtVal && String(x.tanggal || '').slice(0, 10) !== dtVal) return false;
        return true;
      });
      const tbody = document.getElementById('roTableBody');
      if (tbody) tbody.innerHTML = renderRows(filtered);
    };
  };

  global.setAdjFilterType = (v) => { adjFilterType = v || 'SEMUA'; global.renderActiveView(); };
  global.setAdjSearchQ = (v) => { adjSearchQ = v || ''; global.renderActiveView(); };
  global.setAdjDateRange = (f, t) => { adjDateFrom = f || ''; adjDateTo = t || ''; global.renderActiveView(); };
  global.openQuickAdjustmentModal = () => {
    const st = S().AppState;
    const batches = (st.stokBatch || []).filter((b) => String(b.status_batch || 'AKTIF') === 'AKTIF' || String(b.status_batch || '') === 'HABIS');
    if (!batches.length) return global.toast('Belum ada batch produk untuk disesuaikan.', 'warn');
    const firstB = batches[0];
    S().openModal(`<div class="p-6 space-y-4 text-xs">
      <div class="flex justify-between items-center">
        <h3 class="font-bold text-base">+ Sesuaikan Stok Produk</h3>
        <button type="button" onclick="ONSStore.closeModal()" class="text-xl">&times;</button>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div class="sm:col-span-2">
          <label class="font-semibold block mb-1">Pilih Produk &amp; Batch FEFO *</label>
          <select id="adjBatchInp" class="ons-select text-xs" onchange="window.onQuickAdjBatchChange()">
            ${batches.map((b) => {
              const ob = (st.masterObat || []).find((o) => o.id_obat === b.id_obat) || {};
              return `<option value="${S().esc(b.id_batch)}" data-sys="${Number(b.qty_sisa || 0)}">${S().esc(ob.nama_dagang || b.id_obat)} — Batch ${S().esc(b.no_batch)} (Sistem: ${Number(b.qty_sisa || 0)})</option>`;
            }).join('')}
          </select>
        </div>
        <div>
          <label class="font-semibold block mb-1">Stok Sistem Saat Ini</label>
          <input id="adjSysQtyInp" class="ons-input font-mono-num font-bold" readonly value="${Number(firstB.qty_sisa || 0)}"/>
        </div>
        <div>
          <label class="font-semibold block mb-1">Stok Fisik Baru *</label>
          <input id="adjNewQtyInp" type="number" min="0" class="ons-input font-mono-num font-bold text-blue-600" value="${Number(firstB.qty_sisa || 0)}" oninput="window.onQuickAdjQtyPreview()"/>
          <div id="adjSelisihPreview" class="text-[11px] font-mono-num mt-1" style="color:var(--ons-text-soft)">Selisih: 0</div>
        </div>
        <div>
          <label class="font-semibold block mb-1">Penyebab Selisih *</label>
          <select id="adjPenyebabInp" class="ons-select text-xs">
            <option value="Stok Opname">Stok Opname</option>
            <option value="Barang Rusak / Pecah">Barang Rusak / Pecah</option>
            <option value="Kadaluarsa / Musnah">Kadaluarsa / Musnah</option>
            <option value="Salah Input Awal">Salah Input Awal</option>
            <option value="Penyesuaian Lainnya">Penyesuaian Lainnya</option>
          </select>
        </div>
        <div>
          <label class="font-semibold block mb-1">Catatan</label>
          <input id="adjNoteInp" class="ons-input text-xs" placeholder="Keterangan singkat penyesuaian..."/>
        </div>
      </div>
      <button type="button" onclick="window.submitQuickAdjustmentModal()" class="ons-btn ons-btn-primary w-full py-2.5 text-xs font-bold">Simpan Penyesuaian Stok</button>
    </div>`, '540px');
  };
  global.onQuickAdjBatchChange = () => {
    const sel = document.getElementById('adjBatchInp');
    const opt = sel && sel.options ? sel.options[sel.selectedIndex] : null;
    const sys = opt ? Number(opt.getAttribute('data-sys') || 0) : 0;
    const sysEl = document.getElementById('adjSysQtyInp');
    const newEl = document.getElementById('adjNewQtyInp');
    if (sysEl) sysEl.value = sys;
    if (newEl) newEl.value = sys;
    if (typeof global.onQuickAdjQtyPreview === 'function') global.onQuickAdjQtyPreview();
  };
  global.onQuickAdjQtyPreview = () => {
    const sys = Number((document.getElementById('adjSysQtyInp') || {}).value || 0);
    const baru = Number((document.getElementById('adjNewQtyInp') || {}).value || 0);
    const diff = baru - sys;
    const prev = document.getElementById('adjSelisihPreview');
    if (prev) {
      prev.textContent = `Selisih: ${diff > 0 ? '+' : ''}${diff}`;
      prev.className = `text-[11px] font-mono-num font-bold mt-1 ${diff === 0 ? '' : (diff > 0 ? 'text-emerald-600' : 'text-red-600')}`;
    }
  };
  global.submitQuickAdjustmentModal = async () => {
    try {
      const idBatch = (document.getElementById('adjBatchInp') || {}).value;
      const qtyFisik = Math.max(0, Number((document.getElementById('adjNewQtyInp') || {}).value || 0));
      const penyebab = (document.getElementById('adjPenyebabInp') || {}).value || 'Penyesuaian Manual';
      const note = ((document.getElementById('adjNoteInp') || {}).value || '').trim() || penyebab;
      const res = await API().callApi('stok.opnameSave', {
        is_adjustment: true,
        penyebab,
        catatan: note,
        entries: [{ id_batch: idBatch, qty_fisik: qtyFisik, penyebab, catatan: note, alasan: note }]
      }, { isWrite: true });
      const userObj = S().AppState.user || {};
      const metaMap = _readJsonLs('ONS_ADJ_META_V1', {});
      (S().AppState.mutasiStok || []).slice(0, 5).forEach((m) => {
        if (m.id_batch === idBatch) {
          metaMap[m.id_mutasi] = { penyebab, catatan: note, petugas: userObj.nama_lengkap || 'Pemilik' };
        }
      });
      _writeJsonLs('ONS_ADJ_META_V1', metaMap);
      S().closeModal();
      global.toast('Penyesuaian stok berhasil disimpan (' + (res.adjusted || 1) + ' batch)!', 'ok');
      await global.bootLoadState(true);
    } catch (e) { global.toast(e.message, 'err'); }
  };
  global.exportPenyesuaianStok = (fmt) => {
    const st = S().AppState;
    const seeCost = S().canSeeFinancialCost();
    const rows = _getAdjustmentRows(st).map((r, i) => ({
      no: i + 1,
      tanggal: S().formatTgl(r.timestamp, true),
      nama_dagang: r.nama_dagang,
      no_batch: r.no_batch,
      petugas: r.petugas,
      total_selisih: r.qty_ubah,
      ...(seeCost ? { nilai: r.nilai_selisih } : {}),
      penyebab: r.penyebab,
      catatan: r.catatan
    }));
    const hdr = [
      { key: 'no', label: 'No', type: 'int', width: 6 },
      { key: 'tanggal', label: 'Tanggal', width: 20 },
      { key: 'nama_dagang', label: 'Nama Produk', type: 'wrap', width: 28 },
      { key: 'no_batch', label: 'Batch', width: 14 },
      { key: 'petugas', label: 'Petugas', width: 18 },
      { key: 'total_selisih', label: 'Total Selisih', type: 'int', sum: true, width: 14 },
      ...(seeCost ? [{ key: 'nilai', label: 'Nilai Penyesuaian', type: 'currency', sum: true, width: 16 }] : []),
      { key: 'penyebab', label: 'Penyebab Selisih', width: 20 },
      { key: 'catatan', label: 'Catatan', type: 'wrap', width: 28 }
    ];
    S().exportDataset(fmt || 'xlsx', 'Laporan Penyesuaian Stok Apotek', `penyesuaian-stok-${new Date().toISOString().slice(0, 10)}`, hdr, rows, { sheetName: 'Penyesuaian_Stok' });
  };

  global.setTrfSearchQ = (v) => { trfSearchQ = v || ''; global.renderActiveView(); };
  global.setTrfFilterMode = (v) => { trfFilterMode = v || 'SEMUA'; global.renderActiveView(); };
  global.setTrfDateRange = (f, t) => { trfDateFrom = f || ''; trfDateTo = t || ''; global.renderActiveView(); };
  global.openPindahkanStokModal = (draftPrefill) => {
    const st = S().AppState;
    const multiOn = S().isMultiBranchEnabled ? S().isMultiBranchEnabled() : false;
    const branchIds = (S().getActiveBranches && S().getActiveBranches()) || ['ONS-01'];
    const obts = st.masterObat || [];
    const pf = draftPrefill || {};
    S().openModal(`<div class="p-6 space-y-4 text-xs">
      <div class="flex justify-between items-center">
        <h3 class="font-bold text-base">+ Pindahkan Stok</h3>
        <button type="button" onclick="ONSStore.closeModal()" class="text-xl">&times;</button>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div class="sm:col-span-2">
          <label class="font-semibold block mb-1">Mode Perpindahan</label>
          <select id="mvModeInp" class="ons-select text-xs" onchange="window.togglePindahStokMode(this.value)">
            <option value="INTERNAL" ${(pf.mode || 'INTERNAL') === 'INTERNAL' ? 'selected' : ''}>Perpindahan Gudang / Rak Internal (1 Outlet)</option>
            ${multiOn ? `<option value="CABANG" ${pf.mode === 'CABANG' ? 'selected' : ''}>Mutasi Antar-Cabang (Surat Jalan FEFO)</option>` : ''}
          </select>
        </div>
        <div id="mvInternalFields" class="sm:col-span-2 grid grid-cols-2 gap-3 ${(pf.mode === 'CABANG' && multiOn) ? 'hidden' : ''}">
          <div>
            <label class="font-semibold block mb-1">Lokasi Asal</label>
            <select id="mvAsalInt" class="ons-select text-xs">
              <option value="Gudang Utama">Gudang Utama</option>
              <option value="Etalase Depan">Etalase Depan</option>
              <option value="Chiller 2–8°C">Chiller 2&ndash;8&deg;C</option>
              <option value="Rak Prekursor / OOT">Rak Prekursor / OOT</option>
            </select>
          </div>
          <div>
            <label class="font-semibold block mb-1">Lokasi Tujuan</label>
            <select id="mvTujuanInt" class="ons-select text-xs">
              <option value="Etalase Depan" ${(pf.tujuan || '') === 'Etalase Depan' ? 'selected' : ''}>Etalase Depan</option>
              <option value="Gudang Utama" ${(pf.tujuan || '') === 'Gudang Utama' ? 'selected' : ''}>Gudang Utama</option>
              <option value="Chiller 2–8°C" ${(pf.tujuan || '') === 'Chiller 2–8°C' ? 'selected' : ''}>Chiller 2&ndash;8&deg;C</option>
              <option value="Gudang Karantina" ${(pf.tujuan || '') === 'Gudang Karantina' ? 'selected' : ''}>Gudang Karantina</option>
            </select>
          </div>
        </div>
        <div id="mvCabangFields" class="sm:col-span-2 grid grid-cols-2 gap-3 ${(pf.mode === 'CABANG' && multiOn) ? '' : 'hidden'}">
          <div>
            <label class="font-semibold block mb-1">Cabang Asal</label>
            <select id="mvAsalCab" class="ons-select text-xs">${branchIds.map((b) => `<option value="${S().esc(b)}">${S().esc(b)}</option>`).join('')}</select>
          </div>
          <div>
            <label class="font-semibold block mb-1">Cabang Tujuan</label>
            <select id="mvTujuanCab" class="ons-select text-xs">${branchIds.map((b, i) => `<option value="${S().esc(b)}" ${i === 1 ? 'selected' : ''}>${S().esc(b)}</option>`).join('')}</select>
          </div>
        </div>
        <div>
          <label class="font-semibold block mb-1">Produk Obat *</label>
          <select id="mvObatInp" class="ons-select text-xs">${obts.map((o) => `<option value="${S().esc(o.id_obat)}" ${pf.id_obat === o.id_obat ? 'selected' : ''}>${S().esc(o.nama_dagang)} (Stok ${S().getSellableStok(o.id_obat)})</option>`).join('')}</select>
        </div>
        <div>
          <label class="font-semibold block mb-1">Kuantitas *</label>
          <input id="mvQtyInp" type="number" min="1" value="${Number(pf.qty || 10)}" class="ons-input font-mono-num text-right text-xs"/>
        </div>
        <div class="sm:col-span-2">
          <label class="font-semibold block mb-1">Catatan</label>
          <input id="mvNoteInp" class="ons-input text-xs" value="${S().esc(pf.catatan || '')}" placeholder="Cth: Isi ulang rak etalase depan / mutasi stok"/>
        </div>
      </div>
      <div class="flex flex-wrap gap-2">
        <button type="button" onclick="window.submitPindahkanStokModal(true)" class="ons-btn ons-btn-ghost flex-1 py-2 text-xs">Simpan Draft</button>
        <button type="button" onclick="window.submitPindahkanStokModal(false)" class="ons-btn ons-btn-primary flex-1 py-2 text-xs font-bold">Eksekusi Pindahkan Stok</button>
      </div>
    </div>`, '540px');
  };
  global.togglePindahStokMode = (modeVal) => {
    const intBox = document.getElementById('mvInternalFields');
    const cabBox = document.getElementById('mvCabangFields');
    if (intBox) intBox.classList.toggle('hidden', modeVal === 'CABANG');
    if (cabBox) cabBox.classList.toggle('hidden', modeVal !== 'CABANG');
  };
  global.submitPindahkanStokModal = async (asDraft) => {
    try {
      const mode = (document.getElementById('mvModeInp') || {}).value || 'INTERNAL';
      const idObat = (document.getElementById('mvObatInp') || {}).value || '';
      const qty = Math.max(1, Number((document.getElementById('mvQtyInp') || {}).value || 1));
      const catatan = ((document.getElementById('mvNoteInp') || {}).value || '').trim() || '-';
      const ob = (S().AppState.masterObat || []).find((o) => o.id_obat === idObat) || {};
      const asal = mode === 'CABANG' ? (document.getElementById('mvAsalCab') || {}).value : (document.getElementById('mvAsalInt') || {}).value;
      const tujuan = mode === 'CABANG' ? (document.getElementById('mvTujuanCab') || {}).value : (document.getElementById('mvTujuanInt') || {}).value;

      if (asDraft) {
        const drafts = _readJsonLs('ONS_TRANSFER_DRAFTS_V1', []);
        drafts.unshift({
          id: 'DRF-' + Date.now().toString().slice(-6),
          created_at: new Date().toISOString(),
          mode, asal, tujuan, id_obat: idObat, nama_dagang: ob.nama_dagang || idObat, qty, catatan
        });
        _writeJsonLs('ONS_TRANSFER_DRAFTS_V1', drafts);
        S().closeModal();
        global.toast('Draft perpindahan stok tersimpan.', 'ok');
        global.renderActiveView();
        return;
      }

      if (mode === 'CABANG') {
        const res = await API().callApi('cabang.transferSend', { cabang_asal: asal, cabang_tujuan: tujuan, items: [{ id_obat: idObat, qty }], catatan }, { isWrite: true });
        S().closeModal();
        global.toast('Surat Jalan ' + (res.item ? res.item.no_surat_jalan : 'Mutasi') + ' terkirim!', 'ok');
        await global.bootLoadState(true);
        return;
      }

      if (asal === tujuan) throw new Error('Lokasi tujuan wajib berbeda dari lokasi asal.');
      const avStok = S().getSellableStok(idObat);
      if (avStok < qty) throw new Error(`Stok tersedia hanya ${avStok} ${ob.satuan_dasar || 'unit'}.`);
      const hppUnit = Number(ob.hpp_avg || ob.hpp_terakhir || 0);
      const list = _readJsonLs('ONS_INTERNAL_TRANSFERS_V1', []);
      const noTrx = 'TRF-INT/' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '/' + String(list.length + 1).padStart(3, '0');
      list.unshift({
        id: 'INT-' + Date.now().toString().slice(-6),
        no_transaksi: noTrx,
        timestamp: new Date().toISOString(),
        asal, tujuan, id_obat: idObat, nama_dagang: ob.nama_dagang || idObat, qty,
        total_nilai: qty * hppUnit,
        petugas: (S().AppState.user && S().AppState.user.nama_lengkap) || 'Pemilik',
        catatan
      });
      _writeJsonLs('ONS_INTERNAL_TRANSFERS_V1', list);
      S().closeModal();
      global.toast(`Perpindahan stok ${ob.nama_dagang || idObat} (${qty} unit) ke ${tujuan} tercatat!`, 'ok');
      global.renderActiveView();
    } catch (e) { global.toast(e.message, 'err'); }
  };
  global.openTransferDraftsModal = () => {
    const drafts = _readJsonLs('ONS_TRANSFER_DRAFTS_V1', []);
    S().openModal(`<div class="p-6 space-y-4 text-xs">
      <div class="flex justify-between items-center">
        <h3 class="font-bold text-base">Draft Perpindahan Stok (${drafts.length})</h3>
        <button type="button" onclick="ONSStore.closeModal()" class="text-xl">&times;</button>
      </div>
      <div class="ons-table-wrap max-h-72 overflow-y-auto">
        <table class="ons-table is-compact">
          <thead><tr><th>No.</th><th>Produk</th><th>Asal &rarr; Tujuan</th><th>Qty</th><th>Actions</th></tr></thead>
          <tbody>
            ${drafts.length ? drafts.map((d, i) => `<tr>
              <td class="font-mono-num">${i + 1}.</td>
              <td><b>${S().esc(d.nama_dagang)}</b><br/><span style="color:var(--ons-text-soft)">${S().formatTgl(d.created_at, true)}</span></td>
              <td>${S().esc(d.asal)} &rarr; ${S().esc(d.tujuan)}</td>
              <td class="font-mono-num font-bold">${Number(d.qty || 0)}</td>
              <td class="flex gap-1">
                <button type="button" onclick="window.applyTransferDraft('${S().esc(d.id)}')" class="ons-btn ons-btn-primary text-[11px] py-1 px-2">Lanjutkan</button>
                <button type="button" onclick="window.deleteTransferDraft('${S().esc(d.id)}')" class="ons-btn ons-btn-danger text-[11px] py-1 px-2">Hapus</button>
              </td>
            </tr>`).join('') : '<tr><td colspan="5" class="text-center py-6">Belum ada draft perpindahan stok tersimpan.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>`, '600px');
  };
  global.applyTransferDraft = (idDraft) => {
    const drafts = _readJsonLs('ONS_TRANSFER_DRAFTS_V1', []);
    const target = drafts.find((d) => d.id === idDraft);
    S().closeModal();
    if (target) global.openPindahkanStokModal(target);
  };
  global.deleteTransferDraft = (idDraft) => {
    const drafts = _readJsonLs('ONS_TRANSFER_DRAFTS_V1', []).filter((d) => d.id !== idDraft);
    _writeJsonLs('ONS_TRANSFER_DRAFTS_V1', drafts);
    global.openTransferDraftsModal();
    global.renderActiveView();
  };
  global.openImportTransferModal = () => {
    S().openModal(`<div class="p-6 space-y-3 text-xs">
      <div class="flex justify-between items-center">
        <h3 class="font-bold text-base">Import Batch Perpindahan Stok (CSV)</h3>
        <button type="button" onclick="ONSStore.closeModal()" class="text-xl">&times;</button>
      </div>
      <p style="color:var(--ons-text-soft)">Tempel baris CSV dengan format: <code>kode_kfa_atau_id,qty,asal,tujuan,catatan</code></p>
      <textarea id="impTrfCsv" rows="5" class="ons-input font-mono-num text-xs" placeholder="OBT-001,10,Gudang Utama,Etalase Depan,Isi rak harian"></textarea>
      <button type="button" onclick="window.submitImportTransferCsv()" class="ons-btn ons-btn-primary w-full py-2 text-xs font-bold">Proses Import Perpindahan Stok</button>
    </div>`, '520px');
  };
  global.submitImportTransferCsv = () => {
    const txt = ((document.getElementById('impTrfCsv') || {}).value || '').trim();
    if (!txt) return global.toast('Isi minimal 1 baris CSV.', 'warn');
    const st = S().AppState;
    const list = _readJsonLs('ONS_INTERNAL_TRANSFERS_V1', []);
    let okCount = 0;
    txt.split(/\r?\n/).forEach((line) => {
      const parts = line.split(',').map((s) => s.trim());
      if (parts.length < 2) return;
      const key = parts[0];
      const qty = Math.max(1, Number(parts[1] || 1));
      const ob = (st.masterObat || []).find((o) => o.id_obat === key || o.kode_kfa === key || o.nama_dagang.toLowerCase() === key.toLowerCase());
      if (!ob) return;
      list.unshift({
        id: 'INT-' + Date.now().toString().slice(-5) + okCount,
        no_transaksi: 'TRF-IMP/' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '/' + (okCount + 1),
        timestamp: new Date().toISOString(),
        asal: parts[2] || 'Gudang Utama',
        tujuan: parts[3] || 'Etalase Depan',
        id_obat: ob.id_obat,
        nama_dagang: ob.nama_dagang,
        qty,
        total_nilai: qty * Number(ob.hpp_avg || 0),
        petugas: (st.user && st.user.nama_lengkap) || 'Pemilik',
        catatan: parts[4] || 'Import perpindahan CSV'
      });
      okCount++;
    });
    _writeJsonLs('ONS_INTERNAL_TRANSFERS_V1', list);
    S().closeModal();
    global.toast(`${okCount} baris perpindahan stok berhasil diimport!`, okCount ? 'ok' : 'warn');
    global.renderActiveView();
  };
  global.printInternalTransferNote = (idTrx) => {
    const list = _readJsonLs('ONS_INTERNAL_TRANSFERS_V1', []);
    const tr = list.find((x) => x.id === idTrx);
    if (!tr) return global.toast('Bukti perpindahan tidak ditemukan.', 'warn');
    const prof = S().getStoreProfile ? S().getStoreProfile() : {};
    S().printHtmlZone(`<div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;font-size:12px;border:1.5px solid #1e293b;padding:18px;">
      <div style="display:flex;justify-content:space-between;border-bottom:2px solid #1e293b;padding-bottom:8px;margin-bottom:10px;">
        <div><b>${S().esc((prof.nama_usaha || 'APOTEK ONS FARMA').toUpperCase())}</b><br/><span style="font-size:11px;">Bukti Perpindahan Stok Internal</span></div>
        <div style="text-align:right;font-family:monospace;"><b>${S().esc(tr.no_transaksi)}</b><br/>${S().formatTgl(tr.timestamp, true)}</div>
      </div>
      <p><b>Produk:</b> ${S().esc(tr.nama_dagang)} &bull; <b>Qty:</b> ${tr.qty} Unit<br/>
      <b>Dari:</b> ${S().esc(tr.asal)} &rarr; <b>Ke:</b> ${S().esc(tr.tujuan)}<br/>
      <b>Catatan:</b> ${S().esc(tr.catatan || '-')}</p>
    </div>`);
  };
  global.exportPerpindahanStok = (fmt) => {
    const seeCost = S().canSeeFinancialCost();
    const rows = _getCombinedTransferRows(S().AppState).map((r, i) => ({
      no: i + 1,
      tanggal: S().formatTgl(r.timestamp, true),
      no_transaksi: r.no_transaksi,
      produk: r.produkLabel,
      asal: r.asal,
      tujuan: r.tujuan,
      qty: r.qty,
      ...(seeCost ? { nilai: r.totalNilai } : {}),
      status: r.status
    }));
    const hdr = [
      { key: 'no', label: 'No', type: 'int', width: 6 },
      { key: 'tanggal', label: 'Tanggal', width: 20 },
      { key: 'no_transaksi', label: 'No. Transaksi', width: 22 },
      { key: 'produk', label: 'Produk', type: 'wrap', width: 28 },
      { key: 'asal', label: 'Asal', width: 16 },
      { key: 'tujuan', label: 'Tujuan', width: 16 },
      { key: 'qty', label: 'Qty', type: 'int', sum: true, width: 10 },
      ...(seeCost ? [{ key: 'nilai', label: 'Total Nilai Stok', type: 'currency', sum: true, width: 16 }] : []),
      { key: 'status', label: 'Status', type: 'status', width: 12 }
    ];
    S().exportDataset(fmt || 'xlsx', 'Laporan Perpindahan Stok Apotek', `perpindahan-stok-${new Date().toISOString().slice(0, 10)}`, hdr, rows, { sheetName: 'Perpindahan_Stok' });
  };
  global.openAddManualBatchModal = () => {
    const obts = S().AppState.masterObat || [];
    S().openModal(`<div class="p-6 space-y-4 text-xs">
      <div class="flex justify-between items-center">
        <h3 class="font-bold text-base">Tambah Batch Stok Gudang Manual</h3>
        <button onclick="ONSStore.closeModal()" class="text-xl">&times;</button>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div class="sm:col-span-2"><label class="font-semibold block mb-1">Produk Obat *</label>
          <select id="mbObatInp" class="ons-select">${obts.map((o) => `<option value="${S().esc(o.id_obat)}">${S().esc(o.nama_dagang)} (${S().esc(o.satuan_dasar)})</option>`).join('')}</select>
        </div>
        <div><label class="font-semibold block mb-1">Nomor Batch *</label><input id="mbNoBatchInp" class="ons-input font-mono-num" value="B-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}"/></div>
        <div><label class="font-semibold block mb-1">Tanggal Kadaluarsa *</label><input id="mbEdInp" type="date" class="ons-input font-mono-num" value="2028-12-31"/></div>
        <div><label class="font-semibold block mb-1">Qty Masuk (Satuan Dasar) *</label><input id="mbQtyInp" type="number" min="1" class="ons-input font-mono-num" value="50"/></div>
        <div><label class="font-semibold block mb-1">HPP / Unit (Rp)</label><input id="mbHppInp" type="number" min="0" class="ons-input font-mono-num" value="${obts[0] ? (obts[0].hpp_terakhir || obts[0].hpp_avg || 0) : 0}"/></div>
        <div><label class="font-semibold block mb-1">Referensi Faktur / Keterangan</label><input id="mbRefInp" class="ons-input font-mono-num" value="STOK-AWAL"/></div>
        <div><label class="font-semibold block mb-1">Catatan</label><input id="mbCatInp" class="ons-input" value="Input batch awal / penyesuaian gudang"/></div>
      </div>
      <button onclick="window.submitAddManualBatch()" class="ons-btn ons-btn-emerald w-full py-2.5 text-xs">Simpan Batch &amp; Catat ke Kartu Stok</button>
    </div>`, '540px');
  };
  global.submitAddManualBatch = async () => {
    try {
      const payload = {
        id_obat: document.getElementById('mbObatInp').value,
        no_batch: document.getElementById('mbNoBatchInp').value,
        tgl_kadaluarsa: document.getElementById('mbEdInp').value,
        qty_sisa: Number(document.getElementById('mbQtyInp').value || 0),
        hpp_beli: Number(document.getElementById('mbHppInp').value || 0),
        no_faktur_pbf: document.getElementById('mbRefInp').value,
        catatan: document.getElementById('mbCatInp').value
      };
      await API().callApi('stok.addBatch', payload, { isWrite: true });
      S().closeModal();
      global.toast('Batch baru berhasil ditambahkan & tercatat di Kartu Stok!', 'ok');
      await global.bootLoadState(true);
    } catch (e) { global.toast(e.message, 'err'); }
  };
  global.setOpnameDraftQty = (idBatch, v) => { opnameDraftQty[idBatch] = v; global.renderActiveView(); };
  global.setOpnameDraftReason = (v) => { opnameDraftReason = v || ''; };
  global.submitFullOpnameWorkspace = async () => {
    const reasonText = opnameDraftReason || 'Stock Opname Rutin';
    const entries = Object.keys(opnameDraftQty)
      .filter((id) => opnameDraftQty[id] !== '' && opnameDraftQty[id] !== undefined)
      .map((id) => ({ id_batch: id, qty_fisik: Number(opnameDraftQty[id]), penyebab: 'Stok Opname', catatan: reasonText, alasan: reasonText }));
    if (!entries.length) { global.toast('Isi minimal 1 hitungan fisik batch sebelum menyimpan!', 'warn'); return; }
    try {
      const res = await API().callApi('stok.opnameSave', { entries, penyebab: 'Stok Opname', catatan: reasonText }, { isWrite: true });
      const hist = _readJsonLs('ONS_OPNAME_HIST_V1', []);
      hist.unshift({
        id: res.ref_id || ('SO-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + Date.now().toString().slice(-3)),
        tanggal: new Date().toISOString(),
        gudang: 'Gudang Utama',
        petugas: (S().AppState.user && S().AppState.user.nama_lengkap) || 'Pemilik',
        status: 'SELESAI',
        jumlah_batch: entries.length,
        catatan: reasonText
      });
      _writeJsonLs('ONS_OPNAME_HIST_V1', hist);
      opnameDraftQty = {};
      opnameSessionActive = false;
      global.toast('Stock Opname berhasil disimpan (' + (res.adjusted || entries.length) + ' batch diperbarui ke Kartu Stok).', 'ok');
      await global.bootLoadState(true);
    } catch (e) { global.toast(e.message, 'err'); }
  };
  global.setMutasiFilterObat = (v) => { mutasiFilterObat = v; global.renderActiveView(); };
  global.setMutasiFilterJenis = (v) => { mutasiFilterJenis = v; global.renderActiveView(); };
  global.setMutasiFilterArah = (v) => { mutasiFilterArah = v || 'SEMUA'; global.renderActiveView(); };
  global.setMutasiSearchQ = (v) => { mutasiSearchQ = v || ''; global.renderActiveView(); };
  global.refreshMutasiStokServer = async () => {
    try {
      const res = await API().callApi('stok.mutasiList', { id_obat: mutasiFilterObat, jenis_mutasi: mutasiFilterJenis });
      S().AppState.mutasiStok = res.items || [];
      global.toast('Kartu Stok disegarkan (' + S().AppState.mutasiStok.length + ' baris).', 'ok');
      global.renderActiveView();
    } catch (e) { global.toast(e.message, 'err'); }
  };
  global.exportKartuStok = (fmt) => {
    const st = S().AppState;
    const mq = mutasiSearchQ.trim().toLowerCase();
    const filtered = (st.mutasiStok || []).filter((m) => {
      const okOb = !mutasiFilterObat || String(m.id_obat) === mutasiFilterObat;
      const okJn = matchMutasiJenis(m.jenis_mutasi, mutasiFilterJenis);
      const qU = Number(m.qty_ubah || 0);
      const okAr = mutasiFilterArah === 'MASUK' ? qU > 0 : (mutasiFilterArah === 'KELUAR' ? qU < 0 : true);
      if (!okOb || !okJn || !okAr) return false;
      if (mq) {
        const hay = `${m.nama_dagang || m.id_obat || ''} ${m.no_batch || m.id_batch || ''} ${m.referensi_id || ''} ${m.catatan || ''} ${m.jenis_mutasi || ''}`.toLowerCase();
        if (!hay.includes(mq)) return false;
      }
      return true;
    });
    const rows = filtered.map((m, idx) => {
      const q = Number(m.qty_ubah || 0);
      return {
        no: idx + 1,
        waktu: S().formatTgl(m.timestamp, true),
        nama_dagang: m.nama_dagang || m.id_obat || '-',
        no_batch: m.no_batch || m.id_batch || '-',
        arah: q >= 0 ? 'MASUK' : 'KELUAR',
        jenis_mutasi: m.jenis_mutasi || '-',
        qty_ubah: q,
        stok_akhir: Number(m.stok_akhir || 0),
        referensi_id: m.referensi_id || '-',
        catatan: m.catatan || '-'
      };
    });
    const prof = typeof S().getStoreProfile === 'function' ? S().getStoreProfile() : {};
    const apotekName = prof.nama_usaha || 'Apotek ONS Farma';
    const dStamp = new Date().toISOString().slice(0, 10);
    S().exportDataset(fmt || 'xlsx', `Kartu Stok Digital BPOM - ${apotekName}`, `kartu-stok-${dStamp}`, [
      { key: 'no', label: 'No', type: 'int', width: 6 },
      { key: 'waktu', label: 'Waktu Mutasi', type: 'text', width: 20 },
      { key: 'nama_dagang', label: 'Nama Obat', type: 'wrap', width: 28 },
      { key: 'no_batch', label: 'No Batch', type: 'text', width: 16 },
      { key: 'arah', label: 'Arus', type: 'status', width: 11 },
      { key: 'jenis_mutasi', label: 'Jenis Mutasi', type: 'text', width: 20 },
      { key: 'qty_ubah', label: 'Perubahan Qty', type: 'int', sum: true, width: 15 },
      { key: 'stok_akhir', label: 'Stok Akhir', type: 'int', width: 13 },
      { key: 'referensi_id', label: 'Referensi', type: 'text', width: 20 },
      { key: 'catatan', label: 'Catatan', type: 'wrap', width: 32 }
    ], rows, {
      sheetName: 'Kartu_Stok_BPOM',
      subtitle: `Dicetak ${S().formatTgl(new Date().toISOString(), true)} | Total ${rows.length} mutasi | Filter: ${mutasiFilterArah}${mutasiFilterJenis ? ' • ' + mutasiFilterJenis : ''}`,
      emptyMessage: 'Belum ada histori mutasi stok pada filter yang dipilih.'
    });
  };

  global.triggerRecallBatch = (idBatch, noBatch) => {
    S().openModal(`<div class="p-6 space-y-4">
      <h3 class="font-bold text-lg text-red-600">&#9888;&#65039; Konfirmasi Emergency Recall BPOM (${S().esc(noBatch)})</h3>
      <p class="text-xs">Tindakan ini akan membekukan/mengkarantina seluruh sisa stok batch, mencatat mutasi, melacak transaksi penjualan mundur, dan menyiapkan daftar pasien penerima untuk peringatan WhatsApp.</p>
      <input id="recallAlasan" class="ons-input text-xs" value="Instruksi Penarikan Batch BPOM RI"/>
      <div class="flex justify-end gap-2">
        <button onclick="ONSStore.closeModal()" class="ons-btn ons-btn-ghost text-xs">Batal</button>
        <button onclick="window.executeRecallBatch('${idBatch}')" class="ons-btn ons-btn-danger text-xs">Eksekusi Karantina &amp; Lacak Pasien</button>
      </div>
    </div>`, '520px');
  };

  global.executeRecallBatch = async (idBatch) => {
    try {
      const res = await API().callApi('stok.recallBatch', {
        id_batch: idBatch,
        alasan: document.getElementById('recallAlasan').value
      }, { isWrite: true });
      S().closeModal();
      S().openModal(`<div class="p-6 space-y-3">
        <h3 class="font-bold text-base text-emerald-600">&#9989; Karantina Selesai: ${res.qty_karantina} Unit Dikarantina</h3>
        <div class="text-xs font-semibold">Daftar Pasien / Struk Penerima Batch Terlacak (${res.affected_patients.length}):</div>
        <div class="space-y-2 max-h-64 overflow-y-auto text-xs">
          ${res.affected_patients.length ? res.affected_patients.map((p) => `<div class="p-2.5 rounded-lg border flex justify-between items-center">
            <div><b>${S().esc(p.nama_pasien)}</b> (${S().esc(p.no_invoice)})</div>
            ${p.no_hp ? `<a target="_blank" href="https://wa.me/${p.no_hp}?text=${encodeURIComponent('Pemberitahuan Recall Batch Obat ' + idBatch + ' pada struk ' + p.no_invoice)}" class="ons-btn ons-btn-emerald text-[11px] py-1 px-2">WA Pasien</a>` : '<span>No HP -</span>'}
          </div>`).join('') : '<div class="text-xs">Belum ada penjualan keluar dari batch ini (100% aman di gudang).</div>'}
        </div>
        <button onclick="ONSStore.closeModal();bootLoadState(true);" class="ons-btn ons-btn-primary w-full text-xs">Tutup &amp; Segarkan Stok</button>
      </div>`, '540px');
    } catch (e) { global.toast(e.message, 'err'); }
  };

  global.openBlindOpnameModal = () => {
    const activeBatches = S().AppState.stokBatch.filter((b) => b.status_batch === 'AKTIF').slice(0, 8);
    S().openModal(`<div class="p-6 space-y-4">
      <div class="flex justify-between items-center"><h3 class="font-bold text-base">Cycle Count Blind Stock Opname</h3><button onclick="ONSStore.closeModal()" class="text-xl">&times;</button></div>
      <p class="text-xs" style="color:var(--ons-text-soft)">Stok sistem sengaja disembunyikan (Blind Count). Masukkan jumlah fisik riil di rak:</p>
      <div class="space-y-2 max-h-72 overflow-y-auto text-xs">
        ${activeBatches.map((b) => {
          const o = S().AppState.masterObat.find((m) => m.id_obat === b.id_obat);
          return `<div class="flex items-center justify-between gap-2 p-2 rounded-lg border">
            <div><b>${S().esc(o ? o.nama_dagang : b.id_obat)}</b><div class="font-mono-num" style="color:var(--ons-text-soft)">Batch: ${S().esc(b.no_batch)} | ED: ${S().esc(b.tgl_kadaluarsa)}</div></div>
            <input type="number" data-opname-batch="${b.id_batch}" class="ons-input font-mono-num w-24 text-right" placeholder="Qty Fisik"/>
          </div>`;
        }).join('')}
      </div>
      <button onclick="window.submitBlindOpname()" class="ons-btn ons-btn-emerald w-full text-xs">Simpan Hasil Opname ke Kartu Stok</button>
    </div>`, '600px');
  };

  global.submitBlindOpname = async () => {
    const entries = [];
    document.querySelectorAll('[data-opname-batch]').forEach((inp) => {
      if (inp.value !== '') entries.push({ id_batch: inp.getAttribute('data-opname-batch'), qty_fisik: Number(inp.value) });
    });
    if (!entries.length) { global.toast('Isi minimal 1 batch fisik.', 'warn'); return; }
    try {
      const res = await API().callApi('stok.opnameSave', { entries }, { isWrite: true });
      S().closeModal();
      global.toast('Stock Opname tersimpan untuk ' + res.adjusted + ' batch.', 'ok');
      await global.bootLoadState(true);
    } catch (e) { global.toast(e.message, 'err'); }
  };

  /**
   * W-06: Smart Defecta, Multi-PBF Last-Price Comparator & Generator SP BPOM 5 Golongan (via Doc Engine)
   */
  let defectaTab = 'order';
  let defectaOrderQty = {};

  function _renderDefectaTabContent(st) {
    const pbfLeadMap = {};
    (st.supplierPbf || []).forEach((p) => { pbfLeadMap[String(p.nama_pbf || '').trim().toUpperCase()] = Number(p.lead_time_hari || 3); });
    const nowMs = Date.now();
    const trx30Ids = {};
    (st.penjualan || []).forEach((p) => {
      const tMs = new Date(p.tanggal || nowMs).getTime();
      if ((nowMs - tMs) <= 30 * 86400000) trx30Ids[p.id_transaksi] = true;
    });
    const sold30Map = {};
    (st.detailPenjualan || []).forEach((d) => {
      if (!Object.keys(trx30Ids).length || trx30Ids[d.id_transaksi]) {
        sold30Map[d.id_obat] = (sold30Map[d.id_obat] || 0) + Number(d.qty || 0);
      }
    });
    const forecastMap = {};
    st.masterObat.forEach((o) => {
      const s = S().getSellableStok(o.id_obat);
      const qty30 = Number(sold30Map[o.id_obat] || 0);
      const avgHarian = Math.max(0.2, Math.round((qty30 > 0 ? qty30 / 30 : Number(o.stok_min || 10) / 14) * 10) / 10);
      const leadHari = pbfLeadMap[String(o.pbf_utama || '').trim().toUpperCase()] || 3;
      const safetyStock = Math.max(Number(o.stok_min || 10), Math.ceil(avgHarian * 5));
      const rop = Math.ceil(avgHarian * leadHari) + safetyStock;
      const target14d = Math.ceil(avgHarian * (14 + leadHari)) + safetyStock;
      const rekOrder = Math.max(0, target14d - s);
      const dos = Math.max(0, Math.round(s / Math.max(0.2, avgHarian)));
      forecastMap[o.id_obat] = {
        avg_harian: avgHarian,
        lead_time_hari: leadHari,
        reorder_point: rop,
        rekomendasi_order: rekOrder,
        dos: dos,
        perlu_order: s <= rop || s <= Number(o.stok_min || 10)
      };
    });
    const pendingOrderMap = {};
    (st.suratPesanan || []).forEach((sp) => {
      if (String(sp.status_sp || '') === 'SELESAI_DITERIMA') return;
      let spArr = [];
      try { spArr = JSON.parse(sp.items_json || '[]'); } catch (e) {}
      spArr.forEach((it) => {
        if (it.id_obat) pendingOrderMap[it.id_obat] = (pendingOrderMap[it.id_obat] || 0) + Number(it.qty || 0);
      });
    });

    const dq = defectaSearchQ.trim().toLowerCase();
    const belowMinCount = st.masterObat.filter((o) => S().getSellableStok(o.id_obat) > 0 && S().getSellableStok(o.id_obat) <= Number(o.stok_min || 10)).length;
    const emptyCount = st.masterObat.filter((o) => S().getSellableStok(o.id_obat) <= 0).length;
    const lowStock = st.masterObat.filter((o) => {
      if (!forecastMap[o.id_obat] || !forecastMap[o.id_obat].perlu_order) return false;
      const s = S().getSellableStok(o.id_obat);
      if (defectaStatusFilter === 'KOSONG' && s > 0) return false;
      if (defectaStatusFilter === 'DIBAWAH_MIN' && !(s > 0 && s <= Number(o.stok_min || 10))) return false;
      if (dq && !`${o.nama_dagang} ${o.zat_aktif || ''} ${o.pbf_utama || ''} ${o.golongan_bpom || ''}`.toLowerCase().includes(dq)) return false;
      return true;
    });
    const groupedPbf = {};
    lowStock.forEach((o) => {
      const pbf = o.pbf_utama || 'PBF Reguler Lainnya';
      if (!groupedPbf[pbf]) groupedPbf[pbf] = [];
      groupedPbf[pbf].push(o);
    });

    const getOrderQty = (o) => {
      if (defectaOrderQty[o.id_obat] !== undefined) return Math.max(1, Number(defectaOrderQty[o.id_obat] || 1));
      const fc = forecastMap[o.id_obat];
      if (fc && fc.rekomendasi_order > 0) return fc.rekomendasi_order;
      const s = S().getSellableStok(o.id_obat);
      return Math.max(10, Number(o.stok_max || 100) - s);
    };

    const resolveJenisSp = (gol) => {
      const g = String(gol || '').toUpperCase();
      if (['NARKOTIKA', 'PSIKOTROPIKA', 'PREKURSOR', 'OOT'].includes(g)) return g;
      return 'REGULER';
    };

    const estTotalPo = lowStock.reduce((acc, o) => acc + getOrderQty(o) * Number(o.hpp_terakhir || o.hpp_avg || 0), 0);

    return `
      <!-- 1. EXECUTIVE KPI METRIC CARDS DEFECTA -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button type="button" onclick="window.setDefectaStatusFilter('SEMUA')" class="ons-card p-3.5 text-left cursor-pointer transition-all ${defectaStatusFilter === 'SEMUA' ? 'ring-2 ring-blue-500 shadow-sm' : 'hover:border-blue-400'}">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold" style="color:var(--ons-text-soft)">TOTAL PERLU RESTOK</span>
            <span class="text-sm">⚠️</span>
          </div>
          <div class="text-2xl font-extrabold font-mono-num text-slate-900 dark:text-white mt-1">${lowStock.length} <span class="text-xs font-normal text-slate-500">Item</span></div>
          <div class="text-[10.5px] text-slate-500 mt-0.5">Ambang ROP &amp; Buffer Minimum</div>
        </button>

        <button type="button" onclick="window.setDefectaStatusFilter('KOSONG')" class="ons-card p-3.5 text-left cursor-pointer transition-all ${defectaStatusFilter === 'KOSONG' ? 'ring-2 ring-red-500 shadow-sm' : 'hover:border-red-400'}">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold text-red-600 dark:text-red-400">STOK HABIS (OOS)</span>
            <span class="text-sm">🔴</span>
          </div>
          <div class="text-2xl font-extrabold font-mono-num text-red-600 mt-1">${emptyCount} <span class="text-xs font-normal text-red-500">Item</span></div>
          <div class="text-[10.5px] text-red-600 dark:text-red-400 mt-0.5">Prioritas Terbitkan SP Darurat</div>
        </button>

        <button type="button" onclick="window.setDefectaStatusFilter('DIBAWAH_MIN')" class="ons-card p-3.5 text-left cursor-pointer transition-all ${defectaStatusFilter === 'DIBAWAH_MIN' ? 'ring-2 ring-amber-500 shadow-sm' : 'hover:border-amber-400'}">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold text-amber-600 dark:text-amber-400">MENIPIS &le; BUFFER MIN</span>
            <span class="text-sm">🟡</span>
          </div>
          <div class="text-2xl font-extrabold font-mono-num text-amber-600 mt-1">${belowMinCount} <span class="text-xs font-normal text-amber-500">Item</span></div>
          <div class="text-[10.5px] text-amber-600 dark:text-amber-400 mt-0.5">Cadangan fisik hampir habis</div>
        </button>

        <div class="ons-card p-3.5 text-left">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold text-blue-600 dark:text-blue-400">ESTIMASI NILAI PO</span>
            <span class="text-sm">💰</span>
          </div>
          <div class="text-xl font-extrabold font-mono-num text-blue-700 dark:text-blue-300 mt-1">${S().rp(estTotalPo)}</div>
          <div class="text-[10.5px] text-slate-500 mt-0.5">${lowStock.length} produk siap dipesan</div>
        </div>
      </div>

      <!-- 2. PAKET ORDER OTOMATIS PER SUPPLIER PBF -->
      ${Object.keys(groupedPbf).length ? `
      <div class="p-3.5 rounded-2xl border bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-white dark:from-slate-800/80 dark:via-slate-800/50 dark:to-slate-900 space-y-2.5" style="border-color:var(--ons-border)">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <span class="text-base">🚚</span>
            <div>
              <span class="text-xs font-extrabold text-slate-800 dark:text-slate-100">Paket Pesanan Otomatis per Supplier PBF (${Object.keys(groupedPbf).length} Distributor):</span>
              <span class="text-[11px] text-slate-500 ml-1">Klik distributor untuk langsung membuat draft SP terkelompok</span>
            </div>
          </div>
          <button type="button" onclick="window.generateSpFromDefecta()" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2.5 text-blue-700 font-bold border border-blue-300 dark:border-blue-700">⚡ Terbitkan Semua SP Sekaligus</button>
        </div>
        <div class="flex flex-wrap gap-2">
          ${Object.keys(groupedPbf).map((pbfName) => {
            const pbfItems = groupedPbf[pbfName];
            const pbfVal = pbfItems.reduce((sum, o) => sum + getOrderQty(o) * Number(o.hpp_terakhir || o.hpp_avg || 0), 0);
            return `<button type="button" onclick="window.generateSpFromDefecta('${S().esc(pbfName)}')" class="ons-btn text-xs py-1.5 px-3 rounded-xl border border-blue-200 dark:border-blue-800/60 bg-white dark:bg-slate-900 hover:border-blue-500 hover:shadow-sm font-semibold flex items-center gap-2 group">
              <span class="group-hover:text-blue-600 transition-colors">🏢 ${S().esc(pbfName)}</span>
              <span class="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">${pbfItems.length} item</span>
              <span class="font-mono-num text-[11px] text-slate-500 dark:text-slate-400 font-bold">${S().rp(pbfVal)}</span>
            </button>`;
          }).join('')}
        </div>
      </div>` : ''}

      <!-- 3. COLLAPSIBLE PBF SLA & TERMIN KREDIT -->
      <details class="ons-card p-3.5 rounded-xl text-xs group cursor-pointer">
        <summary class="font-bold flex items-center justify-between select-none">
          <div class="flex items-center gap-2 text-slate-800 dark:text-slate-200">
            <span>📋 Direktori SLA &amp; Termin Kredit Distributor PBF Resmi (${st.supplierPbf.length} PBF)</span>
            <span class="text-[10px] text-slate-400 font-normal">(Klik untuk melihat SLA, lead time &amp; TOP)</span>
          </div>
          <span class="text-slate-400 group-open:rotate-180 transition-transform">&darr;</span>
        </summary>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-3 mt-3 border-t" style="border-color:var(--ons-border)">
          ${st.supplierPbf.map((p) => `<div class="p-2.5 rounded-xl border space-y-1 bg-slate-50/60 dark:bg-slate-800/40" style="border-color:var(--ons-border)">
            <div class="font-bold text-xs text-slate-900 dark:text-white truncate">${S().esc(p.nama_pbf)}</div>
            <div class="font-mono-num text-[10px] text-slate-500">${S().esc(p.kode_cdob || 'PBF-CDOB')}</div>
            <div class="flex justify-between pt-1 text-[11px]">
              <span>Lead Time: <b class="font-mono-num">${p.lead_time_hari} Hari</b></span>
              <span class="text-emerald-600 font-bold">SLA ${p.skor_sla}%</span>
            </div>
            <div class="text-[11px]">Termin Kredit: <b class="font-mono-num">TOP ${p.termin_hari} Hari</b></div>
          </div>`).join('')}
        </div>
      </details>

      <!-- 4. TABEL DEFECTA & RESTOK -->
      <div class="ons-card p-4 space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-2 pb-2 border-b" style="border-color:var(--ons-border)">
          <div class="flex flex-wrap items-center gap-2">
            <input class="ons-input text-xs w-60" placeholder="Cari nama obat, zat aktif, distributor..." value="${S().esc(defectaSearchQ)}" oninput="window.setDefectaSearchQ(this.value)"/>
            <div class="ons-tab-bar">
              <button onclick="window.setDefectaStatusFilter('SEMUA')" class="ons-tab-btn ${defectaStatusFilter === 'SEMUA' ? 'active font-bold' : ''}">Semua (${lowStock.length})</button>
              <button onclick="window.setDefectaStatusFilter('KOSONG')" class="ons-tab-btn ${defectaStatusFilter === 'KOSONG' ? 'active font-bold text-red-600' : ''}">Stok Kosong (${emptyCount})</button>
              <button onclick="window.setDefectaStatusFilter('DIBAWAH_MIN')" class="ons-tab-btn ${defectaStatusFilter === 'DIBAWAH_MIN' ? 'active font-bold text-amber-600' : ''}">Menipis &le; Min (${belowMinCount})</button>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-xs font-mono-num font-bold text-blue-600">Total Est. PO: ${S().rp(estTotalPo)}</span>
            <button type="button" onclick="window.exportDefectaList('xlsx')" class="ons-btn ons-btn-ghost text-xs py-1.5 px-3">📊 Unduh Excel</button>
          </div>
        </div>

        <div class="ons-table-wrap">
          <table class="ons-table is-compact">
            <thead>
              <tr>
                <th class="w-8">No.</th>
                <th>Produk Farmasi &amp; Spesifikasi</th>
                <th class="text-center">Jenis SP</th>
                <th>Stok Aktif &amp; Buffer</th>
                <th>Ambang Min - Max</th>
                <th>Distributor Utama</th>
                <th class="text-center">Sedang Dipesan</th>
                <th class="text-right">Kuantitas Pesan</th>
                <th class="text-right">Aksi Pengadaan</th>
              </tr>
            </thead>
            <tbody>
              ${lowStock.length ? lowStock.map((o, idx) => {
                const s = S().getSellableStok(o.id_obat);
                const totFisik = S().getTotalStok(o.id_obat);
                const edBlocked = Math.max(0, totFisik - s);
                const fc = forecastMap[o.id_obat] || { avg_harian: 0.5, lead_time_hari: 3, reorder_point: Number(o.stok_min || 10), rekomendasi_order: 20, dos: 0 };
                const qtyOrder = getOrderQty(o);
                const sedangDipesan = Number(pendingOrderMap[o.id_obat] || 0);
                const inPlan = (_readLocalList(PLANS_KEY) || []).find((p) => p.id_obat === o.id_obat);
                const jenisSp = resolveJenisSp(o.golongan_bpom);
                const sMin = Number(o.stok_min || 10);
                const sMax = Number(o.stok_max || 100);
                const sPct = sMax > 0 ? Math.min(100, Math.round((s / sMax) * 100)) : 0;
                const isKosong = s <= 0;

                return `<tr>
                  <td class="font-mono-num text-xs text-center text-slate-400">${idx + 1}.</td>
                  <td>
                    <div class="flex items-start gap-1.5">
                      <span class="inline-block w-2 h-2 rounded-full mt-1.5 shrink-0 ${isKosong ? 'bg-red-500' : 'bg-amber-500'}" title="${isKosong ? 'Stok Habis' : 'Stok Menipis'}"></span>
                      <div>
                        <button type="button" onclick="window.openObatDetailModal('${S().esc(o.id_obat)}')" class="font-bold text-xs text-left hover:text-blue-600 transition-colors leading-tight">
                          ${S().esc(o.nama_dagang)}
                        </button>
                        <div class="text-[11px]" style="color:var(--ons-text-soft)">
                          ${S().esc(o.zat_aktif || '-')} ${o.kekuatan ? ('(' + S().esc(o.kekuatan) + ')') : ''} &bull; <span class="font-semibold">${S().esc(o.bentuk_sediaan || o.satuan_dasar)}</span>
                        </div>
                        <div class="flex flex-wrap items-center gap-1 mt-0.5">
                          ${S().bpomBadge(o.golongan_bpom)}
                          <span class="font-mono-num text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">DOS &plusmn;${fc.dos} hari</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td class="text-center">
                    <span class="badge-bpom ${jenisSp === 'REGULER' ? 'bpom-bebas' : 'bpom-prekursor'} text-[10px] font-bold">${jenisSp}</span>
                  </td>
                  <td class="min-w-[120px]">
                    <div class="flex items-center justify-between text-xs font-mono-num">
                      <span class="${isKosong ? 'text-red-600 font-extrabold' : 'text-amber-600 font-bold'}">${s} ${S().esc(o.satuan_dasar)}</span>
                      <span class="text-[10px] font-bold ${isKosong ? 'text-red-600' : 'text-amber-600'}">${isKosong ? 'KOSONG' : 'MENIPIS'}</span>
                    </div>
                    <div class="ons-stock-track mt-1"><div class="ons-stock-fill" style="width:${Math.max(4, sPct)}%;background:${isKosong ? '#EF4444' : '#F59E0B'}"></div></div>
                    ${edBlocked > 0 ? `<div class="text-[10px] text-amber-600 font-mono-num mt-0.5">(${edBlocked} unit expired dikarantina)</div>` : ''}
                  </td>
                  <td class="font-mono-num text-xs whitespace-nowrap">
                    <div>Min: <b>${sMin}</b> &bull; Max: <b>${sMax}</b></div>
                    <div class="text-[10px] text-slate-400">ROP: ${fc.reorder_point} ${S().esc(o.satuan_dasar)}</div>
                  </td>
                  <td class="text-xs">
                    <div class="font-semibold text-slate-800 dark:text-slate-200">${S().esc(o.pbf_utama || 'Distributor Apotek')}</div>
                    <div class="text-[10px] font-mono-num text-slate-400">Lead Time &plusmn;${fc.lead_time_hari} Hari</div>
                  </td>
                  <td class="font-mono-num text-xs text-center">
                    ${sedangDipesan > 0
                      ? `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">${sedangDipesan} ${S().esc(o.satuan_dasar)}</span>`
                      : '<span class="text-slate-400 text-[11px]">-</span>'}
                  </td>
                  <td class="text-right">
                    <div class="flex items-center justify-end gap-1">
                      <input type="number" min="1" value="${qtyOrder}" onchange="window.setDefectaOrderQty('${o.id_obat}', this.value)" class="ons-input font-mono-num text-right text-xs w-16 py-1 min-h-0 h-8 font-bold"/>
                      <span class="text-[10px] text-slate-500 font-semibold">${S().esc(o.satuan_dasar)}</span>
                    </div>
                    <div class="text-[10px] font-mono-num text-slate-400 mt-0.5">
                      ${S().rp(qtyOrder * Number(o.hpp_terakhir || o.hpp_avg || 0))}
                      ${inPlan ? ` &bull; <span class="text-emerald-600 font-bold">Di Rencana (${inPlan.kuantitas})</span>` : ''}
                    </div>
                  </td>
                  <td class="text-right whitespace-nowrap">
                    <div class="flex items-center justify-end gap-1">
                      <button type="button" onclick="window.addObatToPurchasePlan('${S().esc(o.id_obat)}', ${qtyOrder}, 'Dari Defecta Stok Tipis')" class="ons-btn ons-btn-emerald text-[11px] py-1 px-2 font-bold" title="Masukkan ke Rencana Pembelian">+ Rencana</button>
                      <button type="button" onclick="window.generateSpFromDefecta('${S().esc(o.pbf_utama || '')}')" class="ons-btn ons-btn-primary text-[11px] py-1 px-2 font-bold" title="Buat SP untuk Distributor">+ Buat SP</button>
                      <button type="button" onclick="window.openObatDetailModal('${S().esc(o.id_obat)}')" class="ons-btn ons-btn-ghost text-[11px] py-1 px-1.5" title="Buka Detail Monograf &amp; Riwayat Beli">👁️</button>
                    </div>
                  </td>
                </tr>`;
              }).join('') : '<tr><td colspan="9" class="text-center py-8 text-xs text-slate-500">Seluruh stok obat memenuhi ambang cadangan aman. Tidak ada produk yang perlu restok!</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>

      <div class="ons-card p-4 space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 class="font-extrabold text-sm text-slate-900 dark:text-white">Riwayat &amp; Status Surat Pesanan (SP Terintegrasi Faktur &amp; A4) (${(st.suratPesanan || []).length})</h3>
            <p class="text-[11px] text-slate-500">Lacak surat pesanan yang sedang menunggu barang dari PBF atau telah selesai diterima.</p>
          </div>
          <button type="button" onclick="window.setFakturTab('sp')" class="ons-btn ons-btn-ghost text-xs font-bold text-blue-600">Buka Daftar Surat Pesanan (A4) &rarr;</button>
        </div>
        <div class="ons-table-wrap">
          <table class="ons-table">
            <thead><tr><th>No. SP &amp; Tanggal</th><th>Supplier PBF</th><th>Golongan &amp; Item</th><th>Est. Total</th><th>Status Pengadaan</th><th>Aksi Lanjut</th></tr></thead>
            <tbody>
              ${(st.suratPesanan || []).length ? (st.suratPesanan || []).map((sp) => {
                let itemsArr = [];
                try { itemsArr = JSON.parse(sp.items_json || '[]'); } catch (e) {}
                const done = String(sp.status_sp || '') === 'SELESAI_DITERIMA';
                return `<tr>
                  <td class="font-mono-num text-xs"><b>${S().esc(sp.no_sp)}</b><br/><span style="color:var(--ons-text-soft)">${S().formatTgl(sp.tanggal)}</span></td>
                  <td class="font-semibold text-xs">${S().esc(sp.nama_pbf || sp.id_pbf)}</td>
                  <td class="text-xs"><span class="badge-bpom bpom-prekursor">${S().esc(sp.golongan_sp || 'REGULER')}</span> <span class="ml-1">${itemsArr.length} item</span></td>
                  <td class="font-mono-num text-xs font-bold">${S().rp(sp.estimasi_total || 0)}</td>
                  <td><span class="badge-bpom ${done ? 'bpom-bebas' : 'bpom-terbatas'}">${done ? ('DITERIMA: ' + S().esc(sp.no_faktur_pbf || 'OK')) : S().esc(sp.status_sp || 'MENUNGGU_BARANG')}</span></td>
                  <td>
                    <div class="flex flex-wrap gap-1.5">
                      <button type="button" onclick="window.openSpA4PreviewModal('${S().esc(sp.id_sp)}')" class="ons-btn ons-btn-primary text-xs py-1 px-2.5">Preview A4</button>
                      <button type="button" onclick="window.openEditSpModal('${S().esc(sp.id_sp)}')" class="ons-btn ons-btn-ghost text-xs py-1 px-2">Edit</button>
                      ${!done
                        ? `<button onclick="window.loadSpIntoGrn('${S().esc(sp.id_sp)}')" class="ons-btn ons-btn-emerald text-xs py-1 px-2.5">Terima Faktur (GRN) &rarr;</button>`
                        : `<button onclick="window.setFakturTab('daftar')" class="ons-btn ons-btn-ghost text-xs py-1 px-2.5">Lihat Faktur</button>`}
                    </div>
                  </td>
                </tr>`;
              }).join('') : '<tr><td colspan="6" class="text-center py-5 text-xs text-slate-400">Belum ada Surat Pesanan tercatat. Klik tombol "Buat SP" di atas untuk menerbitkan SP resmi.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderDefectaView() {
    const st = S().AppState;
    defectaTab = (st.subTabs && st.subTabs.defecta) || defectaTab || 'defecta';
    if (defectaTab === 'order') defectaTab = 'defecta';
    if (st.subTabs) {
      st.subTabs.faktur = defectaTab;
      st.subTabs.defecta = defectaTab;
    }
    fakturTab = defectaTab;
    return renderFakturView();
  }

  global.setDefectaTab = (t) => {
    if (t === 'supplier') {
      if (typeof global.navigateView === 'function') return global.navigateView('obat', 'supplier');
      if (typeof global.setMasterTab === 'function') return global.setMasterTab('supplier');
    }
    if (t === 'order') t = 'defecta';
    global.setFakturTab(t);
  };
  global.setDefectaOrderQty = (idObat, val) => {
    defectaOrderQty[idObat] = Math.max(1, Number(val || 1));
    global.renderActiveView();
  };
  global.setDefectaSearchQ = (v) => { defectaSearchQ = v || ''; global.renderActiveView(); };
  global.setDefectaStatusFilter = (v) => { defectaStatusFilter = v || 'SEMUA'; global.renderActiveView(); };
  global.exportDefectaList = (fmt) => {
    const st = S().AppState;
    const rows = (st.masterObat || []).filter((o) => S().getSellableStok(o.id_obat) <= Number(o.stok_min || 10)).map((o, i) => ({
      no: i + 1,
      nama: o.nama_dagang,
      stok_min: Number(o.stok_min || 10),
      stok_max: Number(o.stok_max || 100),
      stok: S().getSellableStok(o.id_obat),
      supplier: o.pbf_utama || '-',
      qty_order: defectaOrderQty[o.id_obat] !== undefined ? Number(defectaOrderQty[o.id_obat]) : Math.max(10, Number(o.stok_max || 100) - S().getSellableStok(o.id_obat))
    }));
    S().exportDataset(fmt || 'xlsx', 'Daftar Defecta Stok Apotek', `defecta-${new Date().toISOString().slice(0, 10)}`, [
      { key: 'no', label: 'No', type: 'int', width: 6 },
      { key: 'nama', label: 'Nama Produk', type: 'wrap', width: 28 },
      { key: 'stok_min', label: 'Stok Minimal', type: 'int', width: 12 },
      { key: 'stok_max', label: 'Stok Maksimal', type: 'int', width: 12 },
      { key: 'stok', label: 'Stok Saat Ini', type: 'int', width: 12 },
      { key: 'supplier', label: 'Supplier Terakhir', type: 'wrap', width: 24 },
      { key: 'qty_order', label: 'Rekomendasi Order', type: 'int', sum: true, width: 15 }
    ], rows, { sheetName: 'Defecta' });
  };
  global.setDefectaSupplierQ = (v) => { global.setMasterSupplierSearch(v); };

  global.openSupplierPbfModal = (idPbf) => {
    const existing = S().AppState.supplierPbf.find((p) => p.id_pbf === idPbf);
    const ex = existing ? _getExtraRecord(SUPPLIER_EXTRA_KEY, existing.id_pbf, existing.nama_pbf) : {};
    S().openModal(`<div class="p-6 space-y-4 text-xs">
      <div class="flex justify-between items-center pb-2 border-b" style="border-color:var(--ons-border)">
        <h3 class="font-bold text-base">${existing ? 'Edit Supplier PBF: ' + S().esc(existing.nama_pbf) : 'Tambah Supplier'}</h3>
        <button onclick="ONSStore.closeModal()" class="text-xl">&times;</button>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><label class="font-semibold block mb-1">Nama Supplier PBF *</label><input id="pbfNamaInp" class="ons-input" value="${S().esc(existing ? existing.nama_pbf : '')}" placeholder="Contoh: PT Enseval Putera Megatrading"/></div>
        <div><label class="font-semibold block mb-1">Kode Sertifikat CDOB</label><input id="pbfCdobInp" class="ons-input font-mono-num" value="${S().esc(existing ? existing.kode_cdob : 'CDOB-PBF-')}"/></div>
        <div><label class="font-semibold block mb-1">NPWP Perusahaan</label><input id="pbfNpwpInp" class="ons-input font-mono-num" value="${S().esc(existing ? existing.npwp_pbf : '-')}"/></div>
        <div><label class="font-semibold block mb-1">Kontak WhatsApp Sales PBF</label><input id="pbfWaInp" class="ons-input font-mono-num" value="${S().esc(existing ? existing.kontak_wa : '62811')}"/></div>
        <div><label class="font-semibold block mb-1">Email Order PBF</label><input id="pbfEmailInp" class="ons-input" value="${S().esc(existing ? existing.email_pbf : '')}" placeholder="order@pbf.co.id"/></div>
        <div><label class="font-semibold block mb-1">Status Kemitraan</label>
          <select id="pbfStatusInp" class="ons-select">
            <option value="AKTIF" ${!existing || existing.status_pbf === 'AKTIF' ? 'selected' : ''}>AKTIF</option>
            <option value="NONAKTIF" ${existing && existing.status_pbf === 'NONAKTIF' ? 'selected' : ''}>NONAKTIF</option>
          </select>
        </div>
        <div><label class="font-semibold block mb-1">Lead Time Pengiriman (Hari)</label><input id="pbfLeadInp" type="number" min="1" class="ons-input font-mono-num" value="${existing ? existing.lead_time_hari : 2}"/></div>
        <div><label class="font-semibold block mb-1">Tempo Pembayaran Kredit / TOP (Hari)</label><input id="pbfTerminInp" type="number" min="0" class="ons-input font-mono-num" value="${existing ? existing.termin_hari : 30}"/></div>
        <div><label class="font-semibold block mb-1">Minimal Order (Rp)</label><input id="pbfMinOrderInp" type="number" min="0" class="ons-input font-mono-num" value="${Number(ex.min_order || 0)}"/></div>
        <div><label class="font-semibold block mb-1">Skor SLA Kinerja (%)</label><input id="pbfSlaInp" type="number" min="0" max="100" class="ons-input font-mono-num" value="${existing ? existing.skor_sla : 96}"/></div>
        <div class="sm:col-span-2"><label class="font-semibold block mb-1">Alamat Supplier / Gudang PBF</label><input id="pbfAlamatInp" class="ons-input" value="${S().esc(ex.alamat || '')}" placeholder="Jl. ..."/></div>
      </div>
      <div class="flex justify-end gap-2">
        <button type="button" onclick="ONSStore.closeModal()" class="ons-btn ons-btn-ghost text-xs">Batal</button>
        <button onclick="window.submitSupplierPbf('${S().esc(idPbf || '')}')" class="ons-btn ons-btn-emerald text-xs">Simpan Supplier PBF ke Database</button>
      </div>
    </div>`, '580px');
  };

  global.submitSupplierPbf = async (idPbf) => {
    try {
      const namaPbf = ((document.getElementById('pbfNamaInp') || {}).value || '').trim();
      if (!namaPbf) throw new Error('Nama supplier PBF wajib diisi!');
      _saveExtraRecord(SUPPLIER_EXTRA_KEY, idPbf, namaPbf, {
        min_order: Math.max(0, Number((document.getElementById('pbfMinOrderInp') || {}).value || 0)),
        alamat: ((document.getElementById('pbfAlamatInp') || {}).value || '').trim()
      });
      await API().callApi('pbf.save', {
        id_pbf: idPbf || '',
        nama_pbf: namaPbf,
        kode_cdob: document.getElementById('pbfCdobInp').value,
        npwp_pbf: document.getElementById('pbfNpwpInp').value,
        kontak_wa: document.getElementById('pbfWaInp').value,
        email_pbf: document.getElementById('pbfEmailInp').value,
        status_pbf: document.getElementById('pbfStatusInp').value,
        lead_time_hari: Number(document.getElementById('pbfLeadInp').value || 2),
        termin_hari: Number(document.getElementById('pbfTerminInp').value || 30),
        skor_sla: Number(document.getElementById('pbfSlaInp').value || 95)
      }, { isWrite: true });
      S().closeModal();
      global.toast('Data Supplier PBF CDOB berhasil disimpan!', 'ok');
      await global.bootLoadState(true);
    } catch (e) { global.toast(e.message, 'err'); }
  };

  global.generateSpFromDefecta = async (targetPbf) => {
    const st = S().AppState;
    const lowAll = st.masterObat.filter((o) => S().getSellableStok(o.id_obat) <= Number(o.stok_min || 10));
    const itemsFiltered = targetPbf ? lowAll.filter((o) => o.pbf_utama === targetPbf) : lowAll;
    const pickedItems = itemsFiltered.length ? itemsFiltered : st.masterObat.slice(0, 1);
    const pbfName = targetPbf || ((pickedItems[0] && pickedItems[0].pbf_utama) || (st.supplierPbf[0] && st.supplierPbf[0].nama_pbf) || 'PT Bina San Prima');
    const pbfObj = (st.supplierPbf || []).find((p) => p.nama_pbf === pbfName || p.id_pbf === pbfName);
    const spItems = pickedItems.map((o) => {
      const s = S().getSellableStok(o.id_obat);
      const q = defectaOrderQty[o.id_obat] !== undefined ? Number(defectaOrderQty[o.id_obat]) : Math.max(10, Number(o.stok_max || 100) - s);
      return {
        id_obat: o.id_obat,
        nama_dagang: o.nama_dagang,
        golongan_bpom: o.golongan_bpom || 'BEBAS',
        qty: q,
        satuan_dasar: o.satuan_dasar || 'Unit',
        hpp_unit: Number(o.hpp_terakhir || o.hpp_avg || 0)
      };
    });
    const golList = spItems.map((x) => String(x.golongan_bpom || '').toUpperCase());
    const golSp = golList.includes('NARKOTIKA') ? 'NARKOTIKA' : (golList.includes('PSIKOTROPIKA') ? 'PSIKOTROPIKA' : (golList.includes('PREKURSOR') ? 'PREKURSOR' : (golList.includes('OOT') ? 'OOT' : 'REGULER')));
    try {
      const res = await API().callApi('sp.save', {
        id_pbf: pbfObj ? pbfObj.id_pbf : '',
        nama_pbf: pbfName,
        golongan_sp: golSp,
        items: spItems,
        create_doc: false,
        catatan: 'SP dibuat otomatis dari analisa Defecta Apotek'
      }, { isWrite: true });
      global.toast('SP Resmi (' + res.item.no_sp + ') tersimpan! Siap Preview, Edit & Print A4.', 'ok');
      await global.bootLoadState(true);
      if (res && res.item && res.item.id_sp && typeof global.openSpA4PreviewModal === 'function') {
        global.setDefectaTab('sp');
        global.openSpA4PreviewModal(res.item.id_sp);
      }
    } catch (e) { global.toast(e.message, 'err'); }
  };

  /**
   * W-07: Rencana Pembelian, Faktur PBF Multi-Item GRN, Konsinyasi & Retur BAR-PBF (rencana | daftar | input | harga | retur | konsinyasi)
   */
  const PLANS_KEY = 'ONS_PURCHASE_PLANS_V1';
  const FAKTUR_DRAFTS_KEY = 'ONS_FAKTUR_DRAFTS_V1';
  const KONSINYASI_DRAFTS_KEY = 'ONS_KONSINYASI_DRAFTS_V1';
  const RETUR_DRAFTS_KEY = 'ONS_RETUR_DRAFTS_V1';

  let fakturTab = 'daftar';
  let fakturListQ = '';
  let fakturListFilter = 'SEMUA';
  let fakturListPbfFilter = '';
  let fakturDateFrom = '';
  let fakturDateTo = '';
  let fakturKonsinyasiPbfFilter = '';
  let konsSubTab = 'status';
  let konsSearchQ = '';
  let konsDateFrom = '';
  let konsDateTo = '';
  let konsEntryMode = 'faktur';
  let konsReturBannerDismissed = false;
  let planSearchQ = '';
  let planSupplierFilter = '';
  let planJenisSpFilter = '';
  let planBannerDismissed = false;
  let returFilterMode = 'NEAR_ED';
  let returSearchQ = '';
  let returDateFrom = '';
  let returDateTo = '';
  let grnActiveDraftId = '';
  let grnHeader = {
    id_sp: '',
    no_faktur_pbf: '',
    no_sp: '',
    id_pbf: '',
    tgl_faktur: new Date().toISOString().slice(0, 10),
    tgl_terima: new Date().toISOString().slice(0, 10),
    tgl_jatuh_tempo: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    tempo_hari: 30,
    jenis_faktur: 'BELUM_PAJAK',
    gudang: 'Gudang Utama',
    metode_pembayaran: 'KREDIT',
    diskon_mode: 'RP',
    diskon_pct: 0,
    diskon_pbf: 0,
    ppn_masukan: 0,
    cashback: 0,
    biaya_lainnya: 0,
    jenis_penerimaan: 'BELI_PUTUS',
    status_bayar: 'BELUM_LUNAS',
    catatan: ''
  };
  let grnItems = [];

  function _readLocalList(key) {
    try {
      const raw = global.localStorage ? global.localStorage.getItem(key) : null;
      if (raw !== null && raw !== undefined) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) return arr;
      }
    } catch (e) {}
    return [];
  }

  function _writeLocalList(key, arr) {
    try {
      if (global.localStorage) global.localStorage.setItem(key, JSON.stringify(Array.isArray(arr) ? arr : []));
    } catch (e) {}
  }

  // Pembersihan otomatis data dummy bawaan contoh lama (PLN-01, PLN-02, PLN-03) agar apotek bersih
  try {
    if (global.localStorage) {
      const storedPlansRaw = global.localStorage.getItem(PLANS_KEY);
      if (storedPlansRaw) {
        const parsed = JSON.parse(storedPlansRaw);
        if (Array.isArray(parsed) && parsed.length && parsed.every((p) => ['PLN-01', 'PLN-02', 'PLN-03'].includes(p.id_plan))) {
          global.localStorage.setItem(PLANS_KEY, '[]');
        }
      }
    }
  } catch (e) {}

  function _resolvePlanJenisSp(gol) {
    const g = String(gol || 'REGULER').toUpperCase();
    if (['NARKOTIKA', 'PSIKOTROPIKA', 'PREKURSOR', 'OOT'].includes(g)) return g;
    return 'REGULER';
  }

  function _getPbfTerminDays(pbfNameOrId) {
    const st = S().AppState;
    const p = (st.supplierPbf || []).find((x) => x.nama_pbf === pbfNameOrId || x.id_pbf === pbfNameOrId);
    const termin = Number((p && p.termin_hari) || 30);
    return Number.isFinite(termin) && termin > 0 ? termin : 30;
  }

  function _dueDateFromTermin(days, baseDateStr) {
    const baseMs = baseDateStr ? new Date(baseDateStr).getTime() : Date.now();
    const validMs = Number.isFinite(baseMs) ? baseMs : Date.now();
    return new Date(validMs + (Number(days || 30) * 86400000)).toISOString().slice(0, 10);
  }

  global.loadSpIntoGrn = (idSp) => {
    const st = S().AppState;
    const sp = (st.suratPesanan || []).find((x) => x.id_sp === idSp);
    if (!sp) return global.toast('Surat Pesanan tidak ditemukan.', 'warn');
    const termin = _getPbfTerminDays(sp.nama_pbf || sp.id_pbf);
    grnHeader.id_sp = sp.id_sp;
    grnHeader.no_sp = sp.no_sp;
    grnHeader.id_pbf = sp.nama_pbf || sp.id_pbf || grnHeader.id_pbf;
    grnHeader.sp_status = 'SELESAI_DITERIMA';
    grnHeader.tgl_jatuh_tempo = _dueDateFromTermin(termin);
    if (!grnHeader.no_faktur_pbf) grnHeader.no_faktur_pbf = 'FK-PBF-' + new Date().toISOString().slice(2, 10).replace(/-/g, '') + '-01';
    let spItems = [];
    try { spItems = JSON.parse(sp.items_json || '[]'); } catch (e) {}
    if (spItems.length) {
      grnItems = spItems.map((it, idx) => {
        const obat = st.masterObat.find((m) => m.id_obat === it.id_obat) || {};
        const qtyPesan = Number(it.qty || it.qty_pesan || it.qty_order || 10);
        return {
          id_obat: it.id_obat,
          no_batch: 'B-' + new Date().getFullYear() + '-SP' + (idx + 1),
          tgl_kadaluarsa: '2028-12-31',
          qty_sp: qtyPesan,
          qty_dasar: qtyPesan,
          hpp_unit: Number(it.hpp_unit || it.hpp_terakhir || obat.hpp_terakhir || obat.hpp_avg || 0)
        };
      });
    }
    global.toast('Item SP ' + sp.no_sp + ' berhasil dimuat ke Form Penerimaan Faktur (GRN)!', 'ok');
    global.navigateView('faktur', 'input');
  };

  let grnScanState = {
    panelOpen: false,
    previewDataUrl: '',
    processedDataUrl: '',
    fileName: '',
    sourceType: '',
    enhanceMode: 'contrast',
    rotateDeg: 0,
    scanning: false,
    progress: 0,
    statusText: '',
    rawText: '',
    summary: null,
    error: ''
  };

  function ensureGrnInitialized() {
    const st = S().AppState;
    if (!grnHeader.no_faktur_pbf) grnHeader.no_faktur_pbf = 'FK-PBF-' + new Date().toISOString().slice(2, 10).replace(/-/g, '') + '-01';
    if (!grnHeader.id_pbf && st.supplierPbf.length) {
      grnHeader.id_pbf = st.supplierPbf[0].nama_pbf;
      grnHeader.tgl_jatuh_tempo = _dueDateFromTermin(st.supplierPbf[0].termin_hari || 30);
    }
    if (!grnItems.length && st.masterObat.length) {
      const o0 = st.masterObat[0];
      grnItems.push({
        id_obat: o0.id_obat,
        no_batch: 'B-' + new Date().getFullYear() + '-GRN1',
        tgl_kadaluarsa: '2028-12-31',
        qty_dasar: 50,
        hpp_unit: Number(o0.hpp_terakhir || o0.hpp_avg || 5000)
      });
    }
  }

  function renderFakturView() {
    const st = S().AppState;
    fakturTab = (st.subTabs && st.subTabs.faktur) || fakturTab || 'defecta';
    if (fakturTab === 'order') fakturTab = 'defecta';
    ensureGrnInitialized();

    const allPlans = _readLocalList(PLANS_KEY);
    const fakturDrafts = _readLocalList(FAKTUR_DRAFTS_KEY);
    const returDrafts = _readLocalList(RETUR_DRAFTS_KEY);
    const allFaktur = st.fakturPbf || [];
    const nearEdBatches = (st.stokBatch || []).filter((b) => b.status_batch === 'AKTIF' && Number(b.qty_sisa || 0) > 0 && S().daysUntil(b.tgl_kadaluarsa) <= 180);
    const allActiveBatches = (st.stokBatch || []).filter((b) => b.status_batch === 'AKTIF' && Number(b.qty_sisa || 0) > 0);
    const rSearch = returSearchQ.trim().toLowerCase();
    const returPool = returFilterMode === 'ALL' ? allActiveBatches : nearEdBatches;
    const returCandidates = returPool.filter((b) => {
      if (!rSearch) return true;
      const ob = (st.masterObat || []).find((m) => m.id_obat === b.id_obat);
      const hay = `${ob ? ob.nama_dagang : ''} ${b.no_batch} ${b.id_pbf || ''} ${b.id_obat}`.toLowerCase();
      return hay.includes(rSearch);
    });

    const isKonsFaktur = (f) => String(f.status_bayar || '').toUpperCase() === 'KONSINYASI' || String(f.jenis_penerimaan || '').toUpperCase() === 'KONSINYASI';
    const isDueSoonFaktur = (f) => !isKonsFaktur(f) && String(f.status_bayar || '') !== 'LUNAS' && Number(f.sisa_hutang || 0) > 0 && S().daysUntil(f.tgl_jatuh_tempo) <= 7;

    const totalPembelianNetto = allFaktur.reduce((s, f) => s + Number(f.netto_hutang || 0), 0);
    const totalSisaHutang = allFaktur.reduce((s, f) => s + (isKonsFaktur(f) ? 0 : Number(f.sisa_hutang || 0)), 0);
    const dueSoonCount = allFaktur.filter(isDueSoonFaktur).length;
    const dueSoonNominal = allFaktur.filter(isDueSoonFaktur).reduce((s, f) => s + Number(f.sisa_hutang || 0), 0);
    const konsSummary = st.konsinyasiSummary || { totals: { tagihan_belum_bayar: 0, qty_terjual: 0 } };
    const konsPendingNominal = Number((konsSummary.totals && konsSummary.totals.tagihan_belum_bayar) || 0);
    const fakturSuppliers = Array.from(new Set(allFaktur.map((f) => f.id_pbf).filter(Boolean)));

    const fq = fakturListQ.trim().toLowerCase();
    const filteredFaktur = allFaktur.filter((f) => {
      const kons = isKonsFaktur(f);
      if (fakturListFilter === 'BELUM_LUNAS' && (f.status_bayar === 'LUNAS' || kons)) return false;
      if (fakturListFilter === 'LUNAS' && f.status_bayar !== 'LUNAS') return false;
      if (fakturListFilter === 'JATUH_TEMPO' && !isDueSoonFaktur(f)) return false;
      if (fakturListFilter === 'KONSINYASI' && !kons) return false;
      if (fakturListPbfFilter && String(f.id_pbf || '') !== fakturListPbfFilter) return false;
      const tTerima = String(f.tgl_faktur || f.created_at || '').slice(0, 10);
      if (fakturDateFrom && tTerima && tTerima < fakturDateFrom) return false;
      if (fakturDateTo && tTerima && tTerima > fakturDateTo) return false;
      if (fq) {
        const linkedProd = (st.stokBatch || []).filter((b) => b.no_faktur_pbf === f.no_faktur_pbf).map((b) => {
          const ob = (st.masterObat || []).find((m) => m.id_obat === b.id_obat);
          return ob ? ob.nama_dagang : b.id_obat;
        }).join(' ');
        const hay = `${f.no_faktur_pbf} ${f.no_sp} ${f.id_pbf} ${f.petugas || ''} ${linkedProd}`.toLowerCase();
        if (!hay.includes(fq)) return false;
      }
      return true;
    });

    const totalBruto = grnItems.reduce((s, it) => {
      const rowGross = Number(it.qty_dasar || 0) * Number(it.hpp_unit || 0);
      return s + Math.max(0, rowGross - Number(it.diskon_item || 0));
    }, 0);
    const headerDiskonRp = grnHeader.diskon_mode === 'PCT'
      ? Math.round(totalBruto * Math.min(100, Math.max(0, Number(grnHeader.diskon_pct || 0))) / 100)
      : Math.max(0, Number(grnHeader.diskon_pbf || 0));
    const nettoGrn = Math.max(
      0,
      totalBruto - headerDiskonRp + Number(grnHeader.ppn_masukan || 0) - Number(grnHeader.cashback || 0) + Number(grnHeader.biaya_lainnya || 0)
    );
    const isScanExpanded = Boolean(grnScanState.panelOpen || grnScanState.scanning || grnScanState.previewDataUrl || grnScanState.summary || grnScanState.error);
    const currentPbfTermin = _getPbfTerminDays(grnHeader.id_pbf);

    const pSearch = planSearchQ.trim().toLowerCase();
    const filteredPlans = allPlans.filter((p) => {
      if (planSupplierFilter && String(p.nama_supplier || '') !== planSupplierFilter) return false;
      if (planJenisSpFilter && String(p.jenis_sp || '') !== planJenisSpFilter) return false;
      if (pSearch) {
        const hay = `${p.nama_produk || ''} ${p.nama_supplier || ''} ${p.jenis_sp || ''} ${p.keterangan || ''}`.toLowerCase();
        if (!hay.includes(pSearch)) return false;
      }
      return true;
    });
    const planSuppliers = Array.from(new Set(allPlans.map((p) => p.nama_supplier).filter(Boolean)));
    const selectedPlans = allPlans.filter((p) => p.selected);
    const totalPlansRp = allPlans.reduce((s, p) => s + (Number(p.kuantitas || 0) * Number(p.harga_beli || 0)), 0);
    const selectedPlansRp = selectedPlans.reduce((s, p) => s + (Number(p.kuantitas || 0) * Number(p.harga_beli || 0)), 0);
    const allFilteredPlansChecked = filteredPlans.length > 0 && filteredPlans.every((p) => p.selected);

    const returHistory = [];
    const returByNoBar = {};
    (st.mutasiStok || []).forEach((m) => {
      if (String(m.jenis_mutasi || '').toUpperCase() !== 'RETUR_PBF') return;
      const bRef = (st.stokBatch || []).find((b) => b.id_batch === m.id_batch) || {};
      const key = String(m.referensi_id || m.id_mutasi || 'BAR');
      const qtyAbs = Math.abs(Number(m.qty_ubah || 0));
      const obRef = (st.masterObat || []).find((o) => o.id_obat === m.id_obat) || {};
      const hpp = Number(bRef.hpp_beli || obRef.hpp_terakhir || obRef.hpp_avg || 0);
      if (!returByNoBar[key]) {
        returByNoBar[key] = {
          no_bar: key,
          tanggal: String(m.timestamp || '').slice(0, 10),
          no_faktur_asal: bRef.no_faktur_pbf || '-',
          supplier: bRef.id_pbf || obRef.pbf_utama || '-',
          catatan: m.catatan || '',
          items: [],
          total_qty: 0,
          total_retur: 0
        };
        returHistory.push(returByNoBar[key]);
      }
      returByNoBar[key].items.push({ nama: m.nama_dagang || obRef.nama_dagang || m.id_obat, qty: qtyAbs, batch: m.no_batch || bRef.no_batch || '-', hpp });
      returByNoBar[key].total_qty += qtyAbs;
      returByNoBar[key].total_retur += qtyAbs * hpp;
    });
    const filteredReturHistory = returHistory.filter((r) => {
      if (returDateFrom && r.tanggal && r.tanggal < returDateFrom) return false;
      if (returDateTo && r.tanggal && r.tanggal > returDateTo) return false;
      if (rSearch) {
        const hay = `${r.no_bar} ${r.no_faktur_asal} ${r.supplier} ${r.catatan} ${r.items.map((x) => x.nama).join(' ')}`.toLowerCase();
        if (!hay.includes(rSearch)) return false;
      }
      return true;
    });

    const lowStockDefecta = (st.masterObat || []).filter((o) => {
      const s = S().getSellableStok(o.id_obat);
      return s <= Number(o.stok_min || 10);
    });

    return `<div class="space-y-5 ons-view-enter">
      <div class="ons-page-header">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="badge-bpom bpom-bebas">PENGADAAN FARMASI &amp; PBF</span>
            <span class="text-xs" style="color:var(--ons-text-soft)">CDOB Kompatibel &bull; BPOM Terintegrasi</span>
          </div>
          <h1 class="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">Pengadaan &amp; Faktur PBF</h1>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Siklus pengadaan apotek terpadu: pantau defecta stok kritis, rencana pembelian, terbitkan SP A4 resmi BPOM, terima faktur GRN/OCR, analisa riwayat harga &amp; margin jual, retur BAR-PBF, dan konsinyasi.</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          ${(fakturTab === 'defecta' || fakturTab === 'order') ? `
            <button onclick="window.openCreateSpModal()" class="ons-btn ons-btn-ghost text-xs py-2 px-3">+ Buat SP Manual</button>
            <button onclick="window.generateSpFromDefecta()" class="ons-btn ons-btn-emerald text-xs font-bold py-2 px-3.5 shadow-sm">⚡ Pesanan Otomatis</button>
          ` : fakturTab === 'sp' ? `
            <button onclick="window.openCreateSpModal()" class="ons-btn ons-btn-primary text-xs py-2 px-3.5 font-bold shadow-sm">+ Buat SP Baru (A4)</button>
          ` : ''}
          <div class="ons-tab-bar overflow-x-auto max-w-full">
            <button onclick="window.setFakturTab('defecta')" class="ons-tab-btn ${fakturTab === 'defecta' || fakturTab === 'order' ? 'active font-bold' : ''}">📦 Defecta (${lowStockDefecta.length})</button>
            <button onclick="window.setFakturTab('rencana')" class="ons-tab-btn ${fakturTab === 'rencana' ? 'active font-bold' : ''}">📋 Rencana (${allPlans.length})</button>
            <button onclick="window.setFakturTab('sp')" class="ons-tab-btn ${fakturTab === 'sp' ? 'active font-bold' : ''}">📄 Surat Pesanan (${(st.suratPesanan || []).length})</button>
            <button onclick="window.setFakturTab('input')" class="ons-tab-btn ${fakturTab === 'input' ? 'active font-bold' : ''}">📥 Terima Faktur (GRN)</button>
            <button onclick="window.setFakturTab('daftar')" class="ons-tab-btn ${fakturTab === 'daftar' ? 'active font-bold' : ''}">📑 Faktur PBF (${allFaktur.length})</button>
            <button onclick="window.setFakturTab('harga')" class="ons-tab-btn ${fakturTab === 'harga' ? 'active font-bold' : ''}">📊 Analisa Margin</button>
            <button onclick="window.setFakturTab('retur')" class="ons-tab-btn ${fakturTab === 'retur' ? 'active font-bold' : ''}">🔄 Retur (${nearEdBatches.length})</button>
            <button onclick="window.setFakturTab('konsinyasi')" class="ons-tab-btn ${fakturTab === 'konsinyasi' ? 'active font-bold' : ''}">🤝 Konsinyasi</button>
          </div>
        </div>
      </div>

      ${(fakturTab === 'defecta' || fakturTab === 'order') ? _renderDefectaTabContent(st) : fakturTab === 'sp' ? (global.ONSProcurementPro ? global.ONSProcurementPro.renderSuratPesananTab() : '') : fakturTab === 'rencana' ? `
        <div class="space-y-4">
          <!-- 4 Executive KPI Cards Rencana Pembelian -->
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div class="ons-card p-3.5 border-l-4 border-l-blue-500">
              <div class="flex items-center justify-between">
                <span class="text-[11px] font-semibold" style="color:var(--ons-text-soft)">Total Item Rencana</span>
                <span class="w-2 h-2 rounded-full bg-blue-500"></span>
              </div>
              <div class="text-xl font-black font-mono-num mt-1">${allPlans.length} <span class="text-xs font-normal" style="color:var(--ons-text-soft)">Item</span></div>
              <div class="text-[10px]" style="color:var(--ons-text-soft)">Dari defecta &amp; usulan staf</div>
            </div>
            <div class="ons-card p-3.5 border-l-4 border-l-emerald-500">
              <div class="flex items-center justify-between">
                <span class="text-[11px] font-semibold" style="color:var(--ons-text-soft)">Estimasi Nilai Total</span>
                <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
              </div>
              <div class="text-xl font-black font-mono-num mt-1 text-emerald-600 dark:text-emerald-400">${S().rp(totalPlansRp)}</div>
              <div class="text-[10px]" style="color:var(--ons-text-soft)">Kebutuhan modal pengadaan</div>
            </div>
            <div class="ons-card p-3.5 border-l-4 border-l-indigo-500">
              <div class="flex items-center justify-between">
                <span class="text-[11px] font-semibold" style="color:var(--ons-text-soft)">Item Dipilih Buat SP</span>
                <span class="w-2 h-2 rounded-full bg-indigo-500"></span>
              </div>
              <div class="text-xl font-black font-mono-num mt-1 ${selectedPlans.length > 0 ? 'text-indigo-600 dark:text-indigo-400' : ''}">${selectedPlans.length} <span class="text-xs font-normal" style="color:var(--ons-text-soft)">Item</span></div>
              <div class="text-[10px]" style="color:var(--ons-text-soft)">Siap di-generate jadi SP resmi</div>
            </div>
            <div class="ons-card p-3.5 border-l-4 border-l-amber-500">
              <div class="flex items-center justify-between">
                <span class="text-[11px] font-semibold" style="color:var(--ons-text-soft)">Nilai SP Terpilih</span>
                <span class="w-2 h-2 rounded-full bg-amber-500"></span>
              </div>
              <div class="text-xl font-black font-mono-num mt-1 text-amber-600 dark:text-amber-400">${S().rp(selectedPlansRp)}</div>
              <div class="text-[10px]" style="color:var(--ons-text-soft)">Total PO siap dikirim ke PBF</div>
            </div>
          </div>
          ${!planBannerDismissed ? `
            <div class="p-3.5 rounded-xl border bg-emerald-500/10 border-emerald-500/30 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div class="space-y-1.5">
                <div class="font-semibold text-emerald-800 dark:text-emerald-200">&#10004; Bingung merencanakan pembelian? Yuk cek rekomendasi di halaman <b>Analisis Pembelian</b> atau <b>Defecta</b>.</div>
                <div class="flex flex-wrap gap-2">
                  <button type="button" onclick="window.setFakturTab('defecta')" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2.5 font-bold">Defecta</button>
                  <button type="button" onclick="window.setFakturTab('harga')" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2.5 font-bold">Analisis Pembelian &amp; Margin</button>
                  <button type="button" onclick="window.pullLowStockToPlans()" class="ons-btn ons-btn-emerald text-[11px] py-1 px-2.5 font-bold">+ Tarik Item Defecta ke Rencana</button>
                </div>
              </div>
              <button type="button" onclick="window.dismissPlanBanner()" class="text-emerald-700 dark:text-emerald-300 font-bold text-base px-2">&times;</button>
            </div>
          ` : ''}

          <div class="ons-card p-4 space-y-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex flex-wrap items-center gap-2 flex-1">
                <input class="ons-input text-xs w-56" placeholder="Cari data (produk, supplier, keterangan)..." value="${S().esc(planSearchQ)}" oninput="window.setPlanFilter('q', this.value)"/>
                <select aria-label="Filter Supplier Rencana" class="ons-select text-xs w-44" onchange="window.setPlanFilter('supplier', this.value)">
                  <option value="">Semua Supplier (${planSuppliers.length})</option>
                  ${planSuppliers.map((sup) => `<option value="${S().esc(sup)}" ${planSupplierFilter === sup ? 'selected' : ''}>${S().esc(sup)}</option>`).join('')}
                </select>
                <select aria-label="Filter Jenis SP Rencana" class="ons-select text-xs w-36" onchange="window.setPlanFilter('jenis', this.value)">
                  <option value="">Semua Jenis SP</option>
                  ${['REGULER', 'PREKURSOR', 'OOT', 'PSIKOTROPIKA', 'NARKOTIKA'].map((g) => `<option value="${g}" ${planJenisSpFilter === g ? 'selected' : ''}>${g}</option>`).join('')}
                </select>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <button type="button" onclick="window.exportPurchasePlans('xlsx')" class="ons-btn ons-btn-ghost text-xs">Excel</button>
                ${allPlans.length ? `<button type="button" onclick="window.clearAllPurchasePlans()" class="ons-btn ons-btn-ghost text-xs text-rose-600 hover:bg-rose-50 border-rose-200">Kosongkan Rencana</button>` : ''}
                <button type="button" onclick="window.openPenawaranSalesModal()" class="ons-btn ons-btn-emerald text-xs font-bold">+ Penawaran Sales</button>
                ${selectedPlans.length ? `<button type="button" onclick="window.convertSelectedPlansToSp()" class="ons-btn ons-btn-primary text-xs font-bold">Buat Pesanan SP (${selectedPlans.length}) &rarr;</button>` : `<button type="button" onclick="window.setFakturTab('sp')" class="ons-btn ons-btn-primary text-xs">Lihat Pesanan (SP) &rarr;</button>`}
              </div>
            </div>

            <div class="ons-table-wrap">
              <table class="ons-table">
                <thead>
                  <tr>
                    <th class="w-8"><input type="checkbox" aria-label="Pilih semua rencana" ${allFilteredPlansChecked ? 'checked' : ''} onchange="window.toggleAllPlansSelected(this.checked)"/></th>
                    <th>Nama Produk</th>
                    <th>Jenis SP</th>
                    <th>Nama Supplier</th>
                    <th>Kuantitas</th>
                    <th class="text-right">Sisa Stok</th>
                    <th>Harga Beli Satuan</th>
                    <th>Keterangan</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${filteredPlans.length ? filteredPlans.map((p) => {
                    const sisaStok = p.id_obat ? S().getSellableStok(p.id_obat) : 0;
                    const pbfs = st.supplierPbf || [];
                    return `<tr>
                      <td><input type="checkbox" aria-label="Pilih ${S().esc(p.nama_produk)}" ${p.selected ? 'checked' : ''} onchange="window.togglePlanSelected('${S().esc(p.id_plan)}', this.checked)"/></td>
                      <td>
                        <div class="font-bold text-xs">${S().esc(p.nama_produk)}</div>
                        <div class="text-[10px]" style="color:var(--ons-text-soft)">${S().esc(p.satuan || 'Unit')} &bull; Subtotal: <b class="font-mono-num">${S().rp(Number(p.kuantitas || 0) * Number(p.harga_beli || 0))}</b></div>
                      </td>
                      <td>
                        <select class="ons-select text-[11px] py-1 min-h-0 w-28" onchange="window.updatePurchasePlanField('${S().esc(p.id_plan)}', 'jenis_sp', this.value)">
                          ${['REGULER', 'PREKURSOR', 'OOT', 'PSIKOTROPIKA', 'NARKOTIKA'].map((g) => `<option value="${g}" ${p.jenis_sp === g ? 'selected' : ''}>${g}</option>`).join('')}
                        </select>
                      </td>
                      <td>
                        <select class="ons-select text-[11px] py-1 min-h-0 w-44" onchange="window.updatePurchasePlanField('${S().esc(p.id_plan)}', 'nama_supplier', this.value)">
                          ${pbfs.map((sup) => `<option value="${S().esc(sup.nama_pbf)}" ${p.nama_supplier === sup.nama_pbf ? 'selected' : ''}>${S().esc(sup.nama_pbf)}</option>`).join('')}
                          ${p.nama_supplier && !pbfs.some((sup) => sup.nama_pbf === p.nama_supplier) ? `<option value="${S().esc(p.nama_supplier)}" selected>${S().esc(p.nama_supplier)}</option>` : ''}
                        </select>
                      </td>
                      <td><input type="number" min="1" class="ons-input text-xs font-mono-num text-right w-20 py-1 min-h-0" value="${Number(p.kuantitas || 1)}" onchange="window.updatePurchasePlanField('${S().esc(p.id_plan)}', 'kuantitas', Number(this.value||1))"/></td>
                      <td class="text-right font-mono-num text-xs font-bold ${sisaStok <= 0 ? 'text-red-600' : ''}">${sisaStok}</td>
                      <td><input type="text" inputmode="numeric" class="ons-input ons-currency-input text-xs font-mono-num text-right w-28 py-1 min-h-0" value="${S().formatDots(p.harga_beli || 0)}" oninput="window.maskNumberInput(this)" onchange="window.updatePurchasePlanField('${S().esc(p.id_plan)}', 'harga_beli', window.parseNumber(this.value))"/></td>
                      <td><input class="ons-input text-xs w-36 py-1 min-h-0" value="${S().esc(p.keterangan || '')}" placeholder="Catatan..." onchange="window.updatePurchasePlanField('${S().esc(p.id_plan)}', 'keterangan', this.value)"/></td>
                      <td>
                        <div class="flex gap-1.5">
                          <button type="button" onclick="window.convertSinglePlanToSp('${S().esc(p.id_plan)}')" class="ons-btn ons-btn-primary text-[11px] py-1 px-2">Buat SP</button>
                          <button type="button" onclick="window.removePurchasePlan('${S().esc(p.id_plan)}')" class="ons-btn ons-btn-danger text-[11px] py-1 px-2">&times;</button>
                        </div>
                      </td>
                    </tr>`;
                  }).join('') : '<tr><td colspan="9" class="text-center py-8 text-xs">Data tidak ditemukan. Klik <b>+ Penawaran Sales</b> atau <b>+ Tarik Item Defecta ke Rencana</b> di atas.</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>

          <div class="ons-card p-4 space-y-2">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="text-xs font-extrabold text-blue-600">Rekap Data Rencana Pembelian</div>
              ${selectedPlans.length ? `<button type="button" onclick="window.convertSelectedPlansToSp()" class="ons-btn ons-btn-emerald text-xs font-bold">Konversi ${selectedPlans.length} Produk Dipilih &rarr; Pesanan Pembelian (SP)</button>` : ''}
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div class="flex items-center justify-between p-2.5 rounded-lg border" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)"><span style="color:var(--ons-text-soft)">Jumlah Produk</span><b class="font-mono-num">${allPlans.length} produk</b></div>
              <div class="flex items-center justify-between p-2.5 rounded-lg border" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)"><span style="color:var(--ons-text-soft)">Produk Dipilih</span><b class="font-mono-num text-blue-600">${selectedPlans.length} produk</b></div>
              <div class="flex items-center justify-between p-2.5 rounded-lg border" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)"><span style="color:var(--ons-text-soft)">Total Harga</span><b class="font-mono-num">${S().rp(totalPlansRp)}</b></div>
              <div class="flex items-center justify-between p-2.5 rounded-lg border" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)"><span style="color:var(--ons-text-soft)">Harga Produk Dipilih</span><b class="font-mono-num text-emerald-600">${S().rp(selectedPlansRp)}</b></div>
            </div>
          </div>
        </div>
      ` : fakturTab === 'input' ? `
        <div class="space-y-4">
          <!-- 4-Step GRN Workflow Strip -->
          <div class="ons-card p-3 bg-gradient-to-r from-blue-500/10 via-emerald-500/10 to-transparent border-l-4 border-l-blue-600">
            <div class="flex items-center justify-between text-xs font-semibold gap-2 overflow-x-auto pb-1">
              <div class="flex items-center gap-2 shrink-0 text-blue-600 dark:text-blue-400">
                <span class="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[11px]">1</span>
                <span>Tautkan SP / Scan OCR Faktur</span>
              </div>
              <span class="text-gray-300 dark:text-gray-600">&rarr;</span>
              <div class="flex items-center gap-2 shrink-0" style="color:var(--ons-text-soft)">
                <span class="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center justify-center font-bold text-[11px]">2</span>
                <span>Header &amp; PBF Pengirim</span>
              </div>
              <span class="text-gray-300 dark:text-gray-600">&rarr;</span>
              <div class="flex items-center gap-2 shrink-0" style="color:var(--ons-text-soft)">
                <span class="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center justify-center font-bold text-[11px]">3</span>
                <span>Rincian Batch, Qty &amp; HPP</span>
              </div>
              <span class="text-gray-300 dark:text-gray-600">&rarr;</span>
              <div class="flex items-center gap-2 shrink-0" style="color:var(--ons-text-soft)">
                <span class="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center justify-center font-bold text-[11px]">4</span>
                <span>Simpan GRN &amp; Update Stok</span>
              </div>
            </div>
          </div>
          ${(() => {
            const openSps = (st.suratPesanan || []).filter((sp) => String(sp.status_sp || '').toUpperCase() !== 'SELESAI_DITERIMA');
            const activeSp = grnHeader.id_sp ? (st.suratPesanan || []).find((x) => x.id_sp === grnHeader.id_sp) : null;
            return `<div class="ons-card p-4 space-y-2.5">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div class="font-extrabold text-sm">1. Tautkan Surat Pesanan (Opsional) &amp; Scan Faktur</div>
                  <p class="text-[11px]" style="color:var(--ons-text-soft)">Pilih SP aktif jika barang datang dari Surat Pesanan, atau langsung isi faktur / gunakan Smart Scanner.</p>
                </div>
                <div class="flex flex-wrap items-center gap-1.5">
                  <button type="button" onclick="window.toggleGrnScannerPanel()" class="ons-btn ${isScanExpanded ? 'ons-btn-primary' : 'ons-btn-ghost'} text-xs">${isScanExpanded ? 'Tutup Scan OCR / PDF' : 'Scan Foto / PDF Faktur'}</button>
                  <button type="button" onclick="window.setFakturTab('sp')" class="ons-btn ons-btn-ghost text-xs">Daftar SP &amp; A4 &rarr;</button>
                  <button type="button" onclick="window.resetGrnForm()" class="ons-btn ons-btn-ghost text-xs text-red-600">Reset Form</button>
                </div>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <select aria-label="Pilih Surat Pesanan Aktif" class="ons-select text-xs flex-1 min-w-[240px]" onchange="if(this.value) window.loadSpIntoGrn(this.value); else { window.setGrnField('id_sp','',true); window.setGrnField('no_sp','',true); }">
                  <option value="">-- Terima Langsung Tanpa SP (${openSps.length} SP terbuka tersedia) --</option>
                  ${openSps.map((sp) => `<option value="${S().esc(sp.id_sp)}" ${grnHeader.id_sp === sp.id_sp ? 'selected' : ''}>${S().esc(sp.no_sp)} &bull; ${S().esc(sp.nama_pbf)} (${S().esc(sp.status_sp)})</option>`).join('')}
                </select>
              </div>
              ${activeSp ? `
                <div class="p-2.5 rounded-xl border flex flex-wrap items-center justify-between gap-2 text-xs" style="background:rgba(16,185,129,.10);border-color:rgba(16,185,129,.35)">
                  <div><b class="text-emerald-700">&#10003; Terhubung ke SP:</b> <span class="font-mono-num font-bold">${S().esc(activeSp.no_sp)}</span> (${S().esc(activeSp.nama_pbf)}) &mdash; Scan faktur tetap mempertahankan tautan SP ini.</div>
                  <div class="flex gap-1.5">
                    <button type="button" onclick="window.openSpA4PreviewModal('${S().esc(activeSp.id_sp)}')" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2">Lihat SP A4</button>
                    <button type="button" onclick="window.setGrnField('id_sp','',false);window.setGrnField('no_sp','',true);" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2 text-red-600">Lepas Tautan</button>
                  </div>
                </div>
              ` : ''}
            </div>`;
          })()}
          <div class="ons-card p-4 space-y-3">
            <div class="flex flex-wrap justify-between items-center gap-2">
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-extrabold text-sm">Smart Invoice Scanner Faktur PBF</span>
                <span class="badge-bpom bpom-bebas">OCR + PDF + AUTO-PARSE</span>
                ${grnScanState.summary ? `<span class="text-[11px] font-semibold text-emerald-700">&#10003; ${grnScanState.summary.itemCount} item diekstrak</span>` : ''}
              </div>
              <div class="flex flex-wrap gap-1.5">
                <button type="button" onclick="window.loadGrnSampleInvoice()" class="ons-btn ons-btn-ghost text-xs py-1 px-2.5">Contoh Teks Faktur</button>
                ${(grnScanState.previewDataUrl || grnScanState.rawText || grnScanState.summary) ? `<button type="button" onclick="window.clearGrnScanner()" class="ons-btn ons-btn-ghost text-xs py-1 px-2.5 text-red-600">Reset Scanner</button>` : ''}
                <button type="button" onclick="window.toggleGrnScannerPanel()" class="ons-btn ons-btn-ghost text-xs py-1 px-2.5">${isScanExpanded ? 'Sembunyikan &uarr;' : 'Buka Panel Scan &darr;'}</button>
              </div>
            </div>

            <div id="grnScanPanelBody" class="${isScanExpanded ? '' : 'hidden'} space-y-3.5 pt-2 border-t" style="border-color:var(--ons-border)">
              <div id="grnScanDropzone"
                ondragover="event.preventDefault();this.classList.add('is-dragover');"
                ondragleave="this.classList.remove('is-dragover');"
                ondrop="event.preventDefault();this.classList.remove('is-dragover');if(event.dataTransfer&&event.dataTransfer.files&&event.dataTransfer.files[0])window.handleGrnScannerFile(event.dataTransfer.files[0]);"
                class="ons-scan-zone">
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div class="space-y-1 text-xs">
                    <div class="font-bold">Seret &amp; lepas Foto / PDF Faktur di sini, atau pilih sumber scan:</div>
                    <div class="text-[11px]" style="color:var(--ons-text-soft)">Faktur kertas rangkap/dot-matrix dapat memakai mode <b>Hitam-Putih Dot Matrix</b> setelah foto diunggah.</div>
                  </div>
                  <div class="flex flex-wrap gap-2 shrink-0">
                    <button type="button" onclick="window.openGrnLiveCamera()" class="ons-btn ons-btn-primary text-xs min-h-[44px]">&#128247; Kamera Live</button>
                    <label class="ons-btn ons-btn-emerald text-xs min-h-[44px] cursor-pointer mb-0">
                      &#128193; Pilih Foto / PDF Faktur
                      <input id="grnScannerFileInp" type="file" accept="image/*,.pdf,application/pdf" capture="environment" class="hidden" onchange="if(this.files&&this.files[0])window.handleGrnScannerFile(this.files[0]);this.value='';"/>
                    </label>
                  </div>
                </div>

                <div id="grnScanProgressWrap" class="${grnScanState.scanning || grnScanState.statusText ? '' : 'hidden'} mt-3 pt-3 border-t space-y-1.5" style="border-color:var(--ons-border)">
                  <div class="flex items-center justify-between text-[11px] font-semibold">
                    <span id="grnScanStatusLabel">${S().esc(grnScanState.statusText || 'Memproses faktur...')}</span>
                    <span id="grnScanPctLabel" class="font-mono-num">${Math.round(Number(grnScanState.progress || 0))}%</span>
                  </div>
                  <div class="ons-scan-progress-track">
                    <div id="grnScanProgressBar" class="ons-scan-progress-fill" style="width:${Math.min(100, Math.max(0, Number(grnScanState.progress || 0)))}%"></div>
                  </div>
                </div>
                ${grnScanState.error ? `<div class="mt-2 p-2.5 rounded-lg text-xs border text-red-600 bg-red-500/10" style="border-color:rgba(220,38,38,.3)">${S().esc(grnScanState.error)}</div>` : ''}
              </div>

              <div class="grid grid-cols-1 ${grnScanState.previewDataUrl ? 'lg:grid-cols-12' : ''} gap-3">
                ${grnScanState.previewDataUrl ? `
                  <div class="lg:col-span-5 p-3 rounded-xl border space-y-2.5 text-xs" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
                    <div class="flex flex-wrap items-center justify-between gap-2">
                      <span class="font-bold truncate">Pratinjau Pra-OCR (${S().esc(grnScanState.fileName || 'Foto Faktur')})</span>
                      <button type="button" onclick="window.setGrnScanOption('rotate', 90)" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2 min-h-0">&#8635; Putar 90&deg;</button>
                    </div>
                    <div class="rounded-lg overflow-hidden border bg-white max-h-56 flex items-center justify-center" style="border-color:var(--ons-border)">
                      <img src="${S().esc(grnScanState.processedDataUrl || grnScanState.previewDataUrl)}" alt="Preview Faktur" class="max-h-56 w-auto object-contain"/>
                    </div>
                    <div class="flex flex-wrap items-center justify-between gap-1.5">
                      <select class="ons-select text-[11px] flex-1 min-w-[150px] py-1 min-h-[34px]" onchange="window.setGrnScanOption('enhanceMode', this.value)" aria-label="Mode Peningkat Gambar OCR">
                        <option value="contrast" ${grnScanState.enhanceMode === 'contrast' ? 'selected' : ''}>Mode: Kontras Cerah (Foto HP)</option>
                        <option value="sharp_bw" ${grnScanState.enhanceMode === 'sharp_bw' ? 'selected' : ''}>Mode: Hitam-Putih Dot Matrix</option>
                        <option value="original" ${grnScanState.enhanceMode === 'original' ? 'selected' : ''}>Mode: Warna Asli</option>
                      </select>
                      <button type="button" onclick="window.runGrnImageScan()" class="ons-btn ons-btn-primary text-[11px] py-1 px-3 min-h-[34px]">Scan Ulang Foto</button>
                    </div>
                  </div>
                ` : ''}
                <div class="${grnScanState.previewDataUrl ? 'lg:col-span-7' : ''} space-y-2">
                  <div class="flex flex-wrap justify-between items-center gap-2">
                    <label for="grnOcrRaw" class="font-bold text-xs">Teks Hasil Scan OCR / PDF atau Paste Teks Faktur</label>
                    <button type="button" onclick="window.parseGrnOcrToForm()" class="ons-btn ons-btn-primary text-xs py-1.5 px-3">Ekstrak ke Form GRN &darr;</button>
                  </div>
                  <textarea id="grnOcrRaw" rows="${grnScanState.previewDataUrl ? 6 : 3}" oninput="window.setGrnRawText(this.value)" class="ons-textarea text-xs font-mono-num" placeholder="Tempel teks faktur PDF/WA atau scan foto di atas...">${S().esc(grnScanState.rawText || '')}</textarea>
                  ${grnScanState.summary ? `
                    <div class="p-2.5 rounded-xl border text-[11px] flex flex-wrap items-center justify-between gap-2" style="background:var(--ons-emerald-tint);border-color:rgba(16,185,129,.35)">
                      <div>
                        <b class="text-emerald-700">&#10003; Hasil Ekstraksi Otomatis:</b>
                        <span>${grnScanState.summary.headerFields} kolom header &bull; <b>${grnScanState.summary.itemCount} baris obat</b> masuk ke tabel GRN di bawah.</span>
                        ${grnScanState.summary.unitConversions && grnScanState.summary.unitConversions.length ? `<div class="mt-0.5 text-emerald-800">Konversi Satuan: ${S().esc(grnScanState.summary.unitConversions.join('; '))}</div>` : ''}
                        ${grnScanState.summary.unmatchedLines && grnScanState.summary.unmatchedLines.length ? `<div class="mt-0.5 text-amber-700">Catatan: ${grnScanState.summary.unmatchedLines.length} baris batch belum cocok otomatis ke Master Obat — pilih nama obat manual di tabel bawah.</div>` : ''}
                      </div>
                    </div>
                  ` : ''}
                </div>
              </div>
            </div>
          </div>

          <div class="ons-card p-5 space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-2 pb-2 border-b" style="border-color:var(--ons-border)">
              <div>
                <h3 class="font-bold text-sm">${grnHeader.jenis_penerimaan === 'KONSINYASI' ? '2. Tambah Konsinyasi (GRN Konsinyasi Masuk)' : '2. Header Penerimaan Barang (GRN &mdash; CDOB)'}</h3>
                <div class="text-[11px]" style="color:var(--ons-text-soft)">Status PKP: <b>${S().esc((S().getStoreProfile().status_pkp || 'NON_PKP'))}</b> &bull; Termin default supplier: <b class="font-mono-num">${currentPbfTermin} hari</b>${grnHeader.jenis_penerimaan === 'KONSINYASI' ? ' &bull; <span class="font-bold text-blue-600">Mode: Konsinyasi Masuk</span>' : ''}</div>
              </div>
              <div class="flex flex-wrap gap-2">
                ${grnHeader.jenis_penerimaan === 'KONSINYASI' ? `<button type="button" onclick="window.openKonsinyasiDraftModal()" class="ons-btn ons-btn-emerald text-xs">Draft Konsinyasi (${_readLocalList(KONSINYASI_DRAFTS_KEY).length})</button>` : ''}
                <button type="button" onclick="window.saveGrnDraftToLocal()" class="ons-btn ons-btn-ghost text-xs">Simpan Draft</button>
                <button type="button" onclick="window.toggleGrnScannerPanel()" class="ons-btn ons-btn-primary text-xs">Upload &amp; Baca Faktur</button>
              </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div><label class="font-semibold block mb-1">No. Faktur PBF *</label><input class="ons-input font-mono-num" value="${S().esc(grnHeader.no_faktur_pbf)}" oninput="window.setGrnField('no_faktur_pbf', this.value)"/></div>
              <div><label class="font-semibold block mb-1">No. Surat Pesanan (Opsional)</label><input class="ons-input font-mono-num" placeholder="Kosongkan jika beli langsung" value="${S().esc(grnHeader.no_sp)}" oninput="window.setGrnField('no_sp', this.value)"/></div>
              <div><label class="font-semibold block mb-1">Supplier PBF Resmi *</label>
                <select class="ons-select" onchange="window.setGrnField('id_pbf', this.value, true)">
                  ${st.supplierPbf.map((p) => `<option value="${S().esc(p.nama_pbf)}" ${grnHeader.id_pbf === p.nama_pbf ? 'selected' : ''}>${S().esc(p.nama_pbf)} (${Number(p.termin_hari || 30)}h)</option>`).join('')}
                </select>
              </div>
              <div><label class="font-semibold block mb-1">Gudang Penerima *</label>
                <select class="ons-select" onchange="window.setGrnField('gudang', this.value)">
                  ${['Gudang Utama', 'Etalase Depan', 'Gudang Karantina'].map((g) => `<option value="${g}" ${grnHeader.gudang === g ? 'selected' : ''}>${g}</option>`).join('')}
                </select>
              </div>
              <div><label class="font-semibold block mb-1">Tanggal Faktur</label><input type="date" class="ons-input" value="${S().esc(grnHeader.tgl_faktur || new Date().toISOString().slice(0, 10))}" onchange="window.setGrnField('tgl_faktur', this.value, true)"/></div>
              <div><label class="font-semibold block mb-1">Tanggal Penerimaan</label><input type="date" class="ons-input" value="${S().esc(grnHeader.tgl_terima || new Date().toISOString().slice(0, 10))}" onchange="window.setGrnField('tgl_terima', this.value)"/></div>
              <div><label class="font-semibold block mb-1">Tempo Pembayaran (Hari)</label><input type="number" min="0" class="ons-input font-mono-num" value="${Number(grnHeader.tempo_hari !== undefined ? grnHeader.tempo_hari : currentPbfTermin)}" onchange="window.setGrnTempoDays(Number(this.value||0))"/></div>
              <div><label class="font-semibold block mb-1">Jatuh Tempo Pembayaran</label><input type="date" class="ons-input" value="${S().esc(grnHeader.tgl_jatuh_tempo)}" onchange="window.setGrnField('tgl_jatuh_tempo', this.value)"/></div>
              <div><label class="font-semibold block mb-1">Jenis Faktur Pajak</label>
                <select class="ons-select" onchange="window.setGrnField('jenis_faktur', this.value, true)">
                  <option value="BELUM_PAJAK" ${grnHeader.jenis_faktur !== 'SUDAH_PAJAK' ? 'selected' : ''}>Harga Belum Termasuk Pajak</option>
                  <option value="SUDAH_PAJAK" ${grnHeader.jenis_faktur === 'SUDAH_PAJAK' ? 'selected' : ''}>Harga Sudah Termasuk Pajak</option>
                </select>
              </div>
              <div><label class="font-semibold block mb-1">Jenis Penerimaan</label>
                <select class="ons-select" onchange="window.setGrnJenisPenerimaan(this.value)">
                  <option value="BELI_PUTUS" ${grnHeader.jenis_penerimaan !== 'KONSINYASI' ? 'selected' : ''}>BELI PUTUS (Reguler PBF)</option>
                  <option value="KONSINYASI" ${grnHeader.jenis_penerimaan === 'KONSINYASI' ? 'selected' : ''}>KONSINYASI (Titip Jual Distributor)</option>
                </select>
              </div>
              <div>
                <div class="flex items-center justify-between mb-1">
                  <label class="font-semibold">Diskon Faktur PBF (${grnHeader.diskon_mode === 'PCT' ? '%' : 'Rp'})</label>
                  <button type="button" onclick="window.toggleGrnDiskonMode()" class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-600">${grnHeader.diskon_mode === 'PCT' ? 'Ubah ke Rp' : 'Ubah ke %'}</button>
                </div>
                ${grnHeader.diskon_mode === 'PCT'
                  ? `<input type="number" min="0" max="100" step="0.5" class="ons-input font-mono-num" value="${Number(grnHeader.diskon_pct || 0)}" oninput="window.setGrnField('diskon_pct', Number(this.value||0), true)"/>`
                  : `<input type="text" inputmode="numeric" class="ons-input ons-currency-input font-mono-num" value="${S().formatDots(grnHeader.diskon_pbf)}" oninput="window.maskNumberInput(this); window.setGrnField('diskon_pbf', window.parseNumber(this.value), true)"/>`}
              </div>
              <div>
                <div class="flex items-center justify-between mb-1">
                  <label class="font-semibold">PPN Masukan (Rp)</label>
                  <span class="flex gap-1">
                    <button type="button" onclick="window.applyGrnPpn11(true)" class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-600 hover:bg-blue-500/25">Hitung 11%</button>
                    ${Number(grnHeader.ppn_masukan || 0) > 0 ? `<button type="button" onclick="window.applyGrnPpn11(false)" class="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-500/15" style="color:var(--ons-text-soft)">0</button>` : ''}
                  </span>
                </div>
                <input type="text" inputmode="numeric" class="ons-input ons-currency-input font-mono-num" value="${S().formatDots(grnHeader.ppn_masukan)}" oninput="window.maskNumberInput(this); window.setGrnField('ppn_masukan', window.parseNumber(this.value), true)"/>
              </div>
              <div><label class="font-semibold block mb-1">Cashback / Potongan (Rp)</label><input type="text" inputmode="numeric" class="ons-input ons-currency-input font-mono-num" value="${S().formatDots(grnHeader.cashback)}" oninput="window.maskNumberInput(this); window.setGrnField('cashback', window.parseNumber(this.value), true)"/></div>
              <div><label class="font-semibold block mb-1">Biaya Lainnya / Ongkir (Rp)</label><input type="text" inputmode="numeric" class="ons-input ons-currency-input font-mono-num" value="${S().formatDots(grnHeader.biaya_lainnya)}" oninput="window.maskNumberInput(this); window.setGrnField('biaya_lainnya', window.parseNumber(this.value), true)"/></div>
              ${grnHeader.jenis_penerimaan === 'KONSINYASI' ? `
              <div class="sm:col-span-2"><label class="font-semibold block mb-1">Status Hutang Konsinyasi</label>
                <div class="ons-input text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-500/10 border-blue-500/30">Rp 0 Hutang Awal (Settlement saat Laku)</div>
              </div>` : `
              <div class="sm:col-span-2"><label class="font-semibold block mb-1">Jenis &amp; Status Pembayaran Awal</label>
                <select class="ons-select" onchange="window.setGrnField('status_bayar', this.value, true)">
                  <option value="BELUM_LUNAS" ${grnHeader.status_bayar !== 'LUNAS' ? 'selected' : ''}>KREDIT / BELUM LUNAS (Catat ke Hutang Dagang PBF)</option>
                  <option value="LUNAS" ${grnHeader.status_bayar === 'LUNAS' ? 'selected' : ''}>TUNAI / LUNAS (Bayar Langsung Kas/Transfer)</option>
                </select>
              </div>`}
            </div>

            <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t" style="border-color:var(--ons-border)">
              <h4 class="font-bold text-xs">Rincian Item Batch Obat Masuk (${grnItems.length} Baris)</h4>
              <button type="button" onclick="window.addGrnItemRow()" class="ons-btn ons-btn-ghost text-xs">+ Tambah Baris Obat</button>
            </div>
            <div class="ons-table-wrap">
              <table class="ons-table">
                <thead><tr><th>Produk Obat</th><th>No. Batch</th><th>Tanggal ED</th><th>Qty Dasar</th><th>Harga Beli (Rp)</th><th>Diskon Item</th><th>Harga Pokok/Unit</th><th>Subtotal</th><th>Hapus</th></tr></thead>
                <tbody>
                  ${grnItems.map((it, idx) => {
                    const obRef = st.masterObat.find((m) => m.id_obat === it.id_obat);
                    const oldHpp = obRef ? Number(obRef.hpp_terakhir || obRef.hpp_avg || 0) : 0;
                    const newHpp = Number(it.hpp_unit || 0);
                    const qtyD = Math.max(1, Number(it.qty_dasar || 1));
                    const dItem = Math.max(0, Number(it.diskon_item || 0));
                    const rowNet = Math.max(0, (qtyD * newHpp) - dItem);
                    const taxFactor = grnHeader.jenis_faktur === 'BELUM_PAJAK' && Number(grnHeader.ppn_masukan || 0) > 0 && totalBruto > 0
                      ? (1 + (Number(grnHeader.ppn_masukan || 0) / totalBruto))
                      : 1;
                    const hargaPokokPreview = Math.round((rowNet / qtyD) * taxFactor);
                    const hppDiffPct = (oldHpp > 0 && hargaPokokPreview > oldHpp) ? Math.round(((hargaPokokPreview - oldHpp) / oldHpp) * 100) : 0;
                    const hppBelowJual = obRef && hargaPokokPreview > 0 && Number(obRef.harga_umum || 0) > 0 && hargaPokokPreview >= Number(obRef.harga_umum || 0);
                    return `<tr>
                    <td>
                      <select class="ons-select text-xs min-w-[180px]" onchange="window.updateGrnItem(${idx}, 'id_obat', this.value)">
                        ${st.masterObat.map((o) => `<option value="${o.id_obat}" ${it.id_obat === o.id_obat ? 'selected' : ''}>${S().esc(o.nama_dagang)}</option>`).join('')}
                      </select>
                      ${oldHpp > 0 ? `<div class="text-[10px] font-mono-num mt-0.5" style="color:var(--ons-text-soft)">HPP Lama: ${S().rp(oldHpp)}${hppDiffPct > 0 ? ` &bull; <span class="text-red-600 font-bold">Naik +${hppDiffPct}%</span>` : ''}${hppBelowJual ? ` &bull; <span class="text-red-600 font-bold">RUGI (&ge; Harga Umum!)</span>` : ''}</div>` : ''}
                    </td>
                    <td><input class="ons-input font-mono-num text-xs w-28" value="${S().esc(it.no_batch)}" onchange="window.updateGrnItem(${idx}, 'no_batch', this.value)"/></td>
                    <td><input type="date" class="ons-input text-xs w-32" value="${S().esc(it.tgl_kadaluarsa)}" onchange="window.updateGrnItem(${idx}, 'tgl_kadaluarsa', this.value)"/></td>
                    <td>
                      <input type="number" min="1" class="ons-input font-mono-num text-xs w-18 text-right" value="${it.qty_dasar}" onchange="window.updateGrnItem(${idx}, 'qty_dasar', Number(this.value||1))"/>
                      ${Number(it.qty_sp || 0) > 0 ? `<div class="text-[10px] font-mono-num mt-0.5 ${Number(it.qty_dasar) === Number(it.qty_sp) ? 'text-emerald-600' : (Number(it.qty_dasar) < Number(it.qty_sp) ? 'text-amber-600 font-bold' : 'text-blue-600 font-bold')}">SP: ${it.qty_sp} (${Number(it.qty_dasar) === Number(it.qty_sp) ? 'Cocok' : (Number(it.qty_dasar) < Number(it.qty_sp) ? 'Kurang' : '+' + (Number(it.qty_dasar) - Number(it.qty_sp)))})</div>` : ''}
                    </td>
                    <td><input type="text" inputmode="numeric" class="ons-input ons-currency-input font-mono-num text-xs w-24 text-right" value="${S().formatDots(it.hpp_unit)}" oninput="window.maskNumberInput(this)" onchange="window.updateGrnItem(${idx}, 'hpp_unit', window.parseNumber(this.value))"/></td>
                    <td><input type="text" inputmode="numeric" class="ons-input ons-currency-input font-mono-num text-xs w-20 text-right" value="${S().formatDots(dItem)}" oninput="window.maskNumberInput(this)" onchange="window.updateGrnItem(${idx}, 'diskon_item', window.parseNumber(this.value))"/></td>
                    <td class="font-mono-num text-xs font-semibold">${S().rp(hargaPokokPreview)}</td>
                    <td class="font-mono-num font-bold text-xs">${S().rp(rowNet)}</td>
                    <td><button type="button" onclick="window.removeGrnItemRow(${idx})" ${grnItems.length <= 1 ? 'disabled' : ''} class="ons-btn ons-btn-danger text-xs px-2 py-1">&times;</button></td>
                  </tr>`;
                  }).join('')}
                </tbody>
              </table>
            </div>

            <div class="flex flex-wrap items-end justify-between gap-4 pt-3 border-t" style="border-color:var(--ons-border)">
              <div class="text-xs space-y-1.5 flex-1 min-w-[260px]">
                <div>Total Bruto Item: <b class="font-mono-num">${S().rp(totalBruto)}</b> &bull; Diskon: <b class="font-mono-num">${S().rp(headerDiskonRp)}</b> &bull; PPN: <b class="font-mono-num">${S().rp(grnHeader.ppn_masukan || 0)}</b>${Number(grnHeader.cashback || 0) > 0 ? ` &bull; Cashback: <b class="font-mono-num text-emerald-600">-${S().rp(grnHeader.cashback)}</b>` : ''}${Number(grnHeader.biaya_lainnya || 0) > 0 ? ` &bull; Biaya Lain: <b class="font-mono-num">+${S().rp(grnHeader.biaya_lainnya)}</b>` : ''}</div>
                <div class="text-base font-extrabold text-blue-600">TOTAL / Netto Faktur: <span class="font-mono-num">${S().rp(nettoGrn)}</span></div>
                <div class="flex flex-wrap gap-2 items-center">
                  <input class="ons-input text-xs py-1 min-h-0 max-w-xs" placeholder="Catatan penerimaan faktur..." value="${S().esc(grnHeader.catatan || '')}" oninput="window.setGrnField('catatan', this.value)"/>
                  ${grnHeader.id_sp ? `<label class="inline-flex items-center gap-2 text-[11px] font-semibold">
                    <span>Status SP (${S().esc(grnHeader.no_sp)}):</span>
                    <select class="ons-select text-[11px] py-1 min-h-0 w-56" onchange="window.setGrnField('sp_status', this.value)">
                      <option value="SELESAI_DITERIMA" ${grnHeader.sp_status !== 'DITERIMA_SEBAGIAN' ? 'selected' : ''}>Tutup SP (Selesai Diterima Penuh)</option>
                      <option value="DITERIMA_SEBAGIAN" ${grnHeader.sp_status === 'DITERIMA_SEBAGIAN' ? 'selected' : ''}>Diterima Sebagian (Sisa Menyusul)</option>
                    </select>
                  </label>` : ''}
                </div>
              </div>
              <div class="flex flex-wrap gap-2">
                <button type="button" onclick="window.saveGrnDraftToLocal()" class="ons-btn ons-btn-ghost text-xs">Simpan Draft</button>
                <button type="button" onclick="window.submitGrnFaktur()" class="ons-btn ons-btn-emerald text-xs px-5 py-2.5 font-bold">Simpan Faktur Multi-Item &amp; Masukkan ke Stok FEFO</button>
              </div>
            </div>
          </div>
        </div>
      ` : fakturTab === 'harga' ? (global.ONSProcurementPro ? global.ONSProcurementPro.renderAnalisaHargaTab() : '') : fakturTab === 'retur' ? `
        <div class="space-y-4">
          <div class="ons-card p-4 space-y-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 class="font-bold text-sm">Radar &amp; Pembuatan BAR-PBF (Retur Pembelian)</h3>
                <p class="text-[11px]" style="color:var(--ons-text-soft)">Retur batch mendekati kadaluarsa (&le;180 hari), kemasan rusak, salah kirim, atau recall BPOM. Stok FEFO, Kartu Stok &amp; hutang PBF otomatis disesuaikan.</p>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <button type="button" onclick="window.openReturDraftModal()" class="ons-btn ons-btn-emerald text-xs font-bold">Draft (${returDrafts.length})</button>
                <button type="button" onclick="window.exportReturHistory('xlsx')" class="ons-btn ons-btn-ghost text-xs">Excel</button>
                <button type="button" onclick="window.openCreateReturPembelianModal()" class="ons-btn ons-btn-primary text-xs font-bold">+ Retur Pembelian</button>
              </div>
            </div>
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="ons-tab-bar">
                <button type="button" onclick="window.setReturFilterMode('NEAR_ED')" class="ons-tab-btn ${returFilterMode === 'NEAR_ED' ? 'active' : ''}">Near-ED &le;180h (${nearEdBatches.length})</button>
                <button type="button" onclick="window.setReturFilterMode('ALL')" class="ons-tab-btn ${returFilterMode === 'ALL' ? 'active' : ''}">Semua Batch Aktif (${allActiveBatches.length})</button>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <input class="ons-input text-xs w-52" placeholder="Cari data (Obat, Batch, Faktur, PBF)..." value="${S().esc(returSearchQ)}" oninput="window.setReturSearchQ(this.value)"/>
                <input type="date" aria-label="Filter Retur Dari Tanggal" class="ons-input text-xs py-1 min-h-0 w-32" value="${S().esc(returDateFrom)}" onchange="window.setReturDateRange('from', this.value)"/>
                <input type="date" aria-label="Filter Retur Sampai Tanggal" class="ons-input text-xs py-1 min-h-0 w-32" value="${S().esc(returDateTo)}" onchange="window.setReturDateRange('to', this.value)"/>
              </div>
            </div>
            <div class="ons-table-wrap">
              <table class="ons-table">
                <thead><tr><th>Nama Obat</th><th>Supplier PBF</th><th>No. Batch &amp; ED</th><th class="text-right">Qty Sisa</th><th class="text-right">HPP / Est. Potong Hutang</th><th>Aksi BAR-PBF</th></tr></thead>
                <tbody>
                  ${returCandidates.length ? returCandidates.map((b) => {
                    const o = st.masterObat.find((m) => m.id_obat === b.id_obat);
                    const dLeft = S().daysUntil(b.tgl_kadaluarsa);
                    const hpp = Number(b.hpp_beli || (o && (o.hpp_terakhir || o.hpp_avg)) || 0);
                    const estCut = Number(b.qty_sisa || 0) * hpp;
                    return `<tr>
                      <td class="font-semibold text-xs">${S().esc(o ? o.nama_dagang : b.id_obat)}</td>
                      <td class="text-xs">${S().esc(b.id_pbf || '-')}</td>
                      <td class="font-mono-num text-xs"><div>${S().esc(b.no_batch)}</div><div class="${dLeft <= 90 ? 'text-red-600 font-bold' : (dLeft <= 180 ? 'text-amber-600 font-bold' : '')}">${S().esc(String(b.tgl_kadaluarsa || '').slice(0, 10))} (${dLeft}h)</div></td>
                      <td class="text-right font-mono-num text-xs font-bold">${b.qty_sisa}</td>
                      <td class="text-right font-mono-num text-xs"><div>${S().rp(hpp)}/unit</div><div style="color:var(--ons-text-soft)">Max ${S().rp(estCut)}</div></td>
                      <td><button type="button" onclick="window.openReturBarModal('${S().esc(b.id_batch)}')" class="ons-btn ons-btn-amber text-xs py-1 px-2.5">Proses Retur BAR-PBF</button></td>
                    </tr>`;
                  }).join('') : `<tr><td colspan="6" class="text-center py-6 text-xs">${returFilterMode === 'NEAR_ED' ? 'Tidak ada batch mendekati kadaluarsa (&le;180 hari). Pilih mode "Semua Batch Aktif" untuk retur barang rusak/recall.' : 'Tidak ada batch aktif yang cocok dengan pencarian.'}</td></tr>`}
                </tbody>
              </table>
            </div>
          </div>

          <div class="ons-card p-4 space-y-3">
            <h3 class="font-bold text-sm">Riwayat Retur Pembelian (${filteredReturHistory.length})</h3>
            <div class="ons-table-wrap">
              <table class="ons-table">
                <thead><tr><th>No.</th><th>Tanggal</th><th>No. Faktur (BAR)</th><th>No. Faktur Asal</th><th>Supplier</th><th>Produk</th><th class="text-right">Total Retur</th><th>Actions</th></tr></thead>
                <tbody>
                  ${filteredReturHistory.length ? filteredReturHistory.map((r, i) => `<tr>
                    <td class="font-mono-num text-xs">${i + 1}.</td>
                    <td class="font-mono-num text-xs">${S().formatTgl(r.tanggal)}</td>
                    <td class="font-mono-num text-xs font-bold">${S().esc(r.no_bar)}</td>
                    <td class="font-mono-num text-xs">${S().esc(r.no_faktur_asal)}</td>
                    <td class="text-xs font-semibold">${S().esc(r.supplier)}</td>
                    <td class="text-xs">${S().esc(r.items.slice(0, 2).map((x) => `${x.nama} (${x.qty})`).join(', '))}${r.items.length > 2 ? ` +${r.items.length - 2} lagi` : ''}</td>
                    <td class="text-right font-mono-num text-xs font-bold text-amber-600">${S().rp(r.total_retur)}</td>
                    <td><button type="button" onclick="window.printBarPbfDocument('${S().esc(r.no_bar)}')" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2">Cetak BAR-PBF</button></td>
                  </tr>`).join('') : '<tr><td colspan="8" class="text-center py-6 text-xs">Data tidak ditemukan. Klik <b>+ Retur Pembelian</b> atau <b>Proses Retur BAR-PBF</b> untuk mencatat retur distributor.</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>

          <div class="ons-card p-4">
            <div class="text-xs font-extrabold text-blue-600 mb-2">Rekap Retur Pembelian</div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div class="flex items-center justify-between p-2.5 rounded-lg border" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)"><span style="color:var(--ons-text-soft)">Total Keseluruhan</span><b class="font-mono-num text-sm text-amber-600">${S().rp(filteredReturHistory.reduce((s, r) => s + r.total_retur, 0))}</b></div>
              <div class="flex items-center justify-between p-2.5 rounded-lg border" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)"><span style="color:var(--ons-text-soft)">Jumlah Transaksi</span><b class="font-mono-num text-sm">${filteredReturHistory.length} &times;</b></div>
            </div>
          </div>
        </div>
      ` : fakturTab === 'konsinyasi' ? renderKonsinyasiTabHtml(st) : `
        <div class="space-y-4">
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div class="ons-card p-3.5 border-l-4 border-l-blue-500 cursor-pointer hover:shadow-md transition-all" onclick="window.setFakturListFilter('SEMUA')">
              <div class="flex items-center justify-between">
                <span class="text-[11px] font-semibold" style="color:var(--ons-text-soft)">Total Pembelian Faktur</span>
                <span class="w-2 h-2 rounded-full bg-blue-500"></span>
              </div>
              <div class="text-xl font-black font-mono-num mt-1">${S().rp(totalPembelianNetto)}</div>
              <div class="text-[10px] mt-0.5" style="color:var(--ons-text-soft)">${allFaktur.length} Faktur tercatat (Klik: Semua)</div>
            </div>
            <div class="ons-card p-3.5 border-l-4 ${totalSisaHutang > 0 ? 'border-l-red-500 ring-1 ring-red-500/20' : 'border-l-emerald-500'} cursor-pointer hover:shadow-md transition-all" onclick="window.setFakturListFilter('BELUM_LUNAS')">
              <div class="flex items-center justify-between">
                <span class="text-[11px] font-semibold" style="color:var(--ons-text-soft)">Sisa Hutang Dagang PBF</span>
                <span class="w-2 h-2 rounded-full ${totalSisaHutang > 0 ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}"></span>
              </div>
              <div class="text-xl font-black font-mono-num mt-1 ${totalSisaHutang > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}">${S().rp(totalSisaHutang)}</div>
              <div class="text-[10px] mt-0.5" style="color:var(--ons-text-soft)">Klik: Filter Belum Lunas</div>
            </div>
            <div class="ons-card p-3.5 border-l-4 ${dueSoonCount > 0 ? 'border-l-amber-500 ring-1 ring-amber-500/20' : 'border-l-emerald-500'} cursor-pointer hover:shadow-md transition-all" onclick="window.setFakturListFilter('JATUH_TEMPO')">
              <div class="flex items-center justify-between">
                <span class="text-[11px] font-semibold" style="color:var(--ons-text-soft)">Jatuh Tempo &le; 7 Hari</span>
                <span class="w-2 h-2 rounded-full ${dueSoonCount > 0 ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}"></span>
              </div>
              <div class="text-xl font-black font-mono-num mt-1 ${dueSoonCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}">${dueSoonCount} <span class="text-xs font-normal">Faktur</span></div>
              <div class="text-[10px] font-mono-num mt-0.5" style="color:var(--ons-text-soft)">Nominal: ${S().rp(dueSoonNominal)}</div>
            </div>
            <div class="ons-card p-3.5 border-l-4 border-l-indigo-500 cursor-pointer hover:shadow-md transition-all" onclick="window.setFakturTab('konsinyasi')">
              <div class="flex items-center justify-between">
                <span class="text-[11px] font-semibold" style="color:var(--ons-text-soft)">Konsinyasi Belum Settle</span>
                <span class="w-2 h-2 rounded-full bg-indigo-500"></span>
              </div>
              <div class="text-xl font-black font-mono-num mt-1 text-indigo-600 dark:text-indigo-400">${S().rp(konsPendingNominal)}</div>
              <div class="text-[10px] mt-0.5" style="color:var(--ons-text-soft)">Titip jual &rarr; Klik buka tab</div>
            </div>
          </div>

          <div class="ons-card p-4 space-y-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex flex-wrap items-center gap-2">
                <input class="ons-input text-xs w-52" placeholder="Cari No. Faktur, SP, PBF, produk..." value="${S().esc(fakturListQ)}" oninput="window.setFakturListQ(this.value)"/>
                <select aria-label="Filter Supplier Faktur" class="ons-select text-xs w-44" onchange="window.setFakturListPbfFilter(this.value)">
                  <option value="">Semua Supplier (${fakturSuppliers.length})</option>
                  ${fakturSuppliers.map((sup) => `<option value="${S().esc(sup)}" ${fakturListPbfFilter === sup ? 'selected' : ''}>${S().esc(sup)}</option>`).join('')}
                </select>
                <div class="flex items-center gap-1 text-xs">
                  <span class="text-[11px] font-semibold" style="color:var(--ons-text-soft)">Tgl. Terima:</span>
                  <input type="date" aria-label="Tgl Terima Dari" class="ons-input text-xs py-1 min-h-0 w-32" value="${S().esc(fakturDateFrom)}" onchange="window.setFakturDateRange('from', this.value)"/>
                  <span>&ndash;</span>
                  <input type="date" aria-label="Tgl Terima Sampai" class="ons-input text-xs py-1 min-h-0 w-32" value="${S().esc(fakturDateTo)}" onchange="window.setFakturDateRange('to', this.value)"/>
                </div>
                <div class="ons-tab-bar">
                  ${[
                    { id: 'SEMUA', label: 'Semua' },
                    { id: 'BELUM_LUNAS', label: 'Belum Lunas' },
                    { id: 'JATUH_TEMPO', label: `Tempo <=7h (${dueSoonCount})` },
                    { id: 'LUNAS', label: 'Lunas' },
                    { id: 'KONSINYASI', label: 'Konsinyasi' }
                  ].map((f) => `<button onclick="window.setFakturListFilter('${f.id}')" class="ons-tab-btn ${fakturListFilter === f.id ? 'active' : ''}">${f.label}</button>`).join('')}
                </div>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <button type="button" onclick="window.openFakturDraftModal()" class="ons-btn ons-btn-emerald text-xs font-bold">Draft (${fakturDrafts.length})</button>
                <button type="button" onclick="window.exportFakturList('xlsx')" class="ons-btn ons-btn-ghost text-xs">Excel</button>
                <button type="button" onclick="window.setFakturTab('input')" class="ons-btn ons-btn-primary text-xs font-bold">+ Faktur Pembelian</button>
              </div>
            </div>
            <div class="ons-table-wrap">
              <table class="ons-table">
                <thead><tr><th>No.</th><th>Tanggal Terima</th><th>Petugas</th><th>No. Faktur &amp; SP</th><th>Supplier</th><th>Produk</th><th>Jatuh Tempo</th><th class="text-right">Total / Sisa Hutang</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  ${filteredFaktur.length ? filteredFaktur.map((f, idx) => {
                    const isKons = isKonsFaktur(f);
                    const dTempo = f.tgl_jatuh_tempo ? S().daysUntil(f.tgl_jatuh_tempo) : 999;
                    const unpaid = !isKons && f.status_bayar !== 'LUNAS' && Number(f.sisa_hutang || 0) > 0;
                    const tempoBadge = unpaid
                      ? (dTempo < 0 ? `<span class="text-[10px] font-bold text-red-600 ml-1">(Terlambat ${Math.abs(dTempo)}h)</span>` : (dTempo <= 7 ? `<span class="text-[10px] font-bold text-amber-600 ml-1">(H-${dTempo})</span>` : ''))
                      : '';
                    const linkedBatches = (st.stokBatch || []).filter((b) => b.no_faktur_pbf === f.no_faktur_pbf);
                    const prodNames = linkedBatches.slice(0, 2).map((b) => {
                      const ob = (st.masterObat || []).find((m) => m.id_obat === b.id_obat);
                      return ob ? ob.nama_dagang : b.id_obat;
                    }).join(', ');
                    return `<tr>
                    <td class="font-mono-num text-xs">${idx + 1}.</td>
                    <td class="font-mono-num text-xs whitespace-nowrap">${S().formatTgl(f.tgl_terima || f.tgl_faktur || f.created_at || '-')}</td>
                    <td class="text-xs">${S().esc(f.petugas || (st.user && st.user.nama) || 'APJ / Pemilik')}</td>
                    <td class="font-mono-num text-xs"><b>${S().esc(f.no_faktur_pbf)}</b><br/><span style="color:var(--ons-text-soft)">${S().esc(f.no_sp || 'Tanpa SP')}</span></td>
                    <td class="font-semibold text-xs">${S().esc(f.id_pbf)}</td>
                    <td class="text-xs">${linkedBatches.length ? `<b>${linkedBatches.length} batch</b><div class="text-[10px] truncate max-w-[160px]" style="color:var(--ons-text-soft)">${S().esc(prodNames)}</div>` : '<span style="color:var(--ons-text-soft)">-</span>'}</td>
                    <td class="font-mono-num text-xs whitespace-nowrap">${S().esc(f.tgl_jatuh_tempo || '-')}${tempoBadge}</td>
                    <td class="text-right font-mono-num text-xs">
                      <div class="font-bold">${isKons ? 'Titip Jual' : S().rp(f.netto_hutang)}</div>
                      <div class="text-[11px] font-bold ${isKons ? 'text-blue-600' : (Number(f.sisa_hutang || 0) > 0 ? 'text-red-600' : 'text-emerald-600')}">Sisa: ${S().rp(f.sisa_hutang)}</div>
                    </td>
                    <td><span class="badge-bpom ${isKons ? 'bpom-terbatas' : (f.status_bayar === 'LUNAS' ? 'bpom-bebas' : 'bpom-prekursor')}">${S().esc(f.status_bayar)}</span></td>
                    <td>
                      <div class="flex flex-wrap gap-1.5">
                        <button type="button" onclick="window.openFakturDetailModal('${S().esc(f.id_faktur || f.no_faktur_pbf)}')" class="ons-btn ons-btn-ghost text-xs py-1 px-2">Detail</button>
                        ${isKons ? `<button type="button" onclick="window.setFakturTab('konsinyasi')" class="ons-btn ons-btn-primary text-xs py-1 px-2">Settle</button>` : (Number(f.sisa_hutang || 0) > 0 ? `<button type="button" onclick="navigateView('finance','hutang')" class="ons-btn ons-btn-emerald text-xs py-1 px-2">Bayar</button>` : '')}
                      </div>
                    </td>
                  </tr>`;
                  }).join('') : '<tr><td colspan="10" class="text-center py-6 text-xs">Tidak ada faktur PBF yang sesuai filter.</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>

          <div class="ons-card p-4">
            <div class="text-xs font-extrabold text-blue-600 mb-2">Rekap Faktur Pembelian${(fakturDateFrom || fakturDateTo) ? ` (${S().esc(fakturDateFrom || '...')} s.d. ${S().esc(fakturDateTo || '...')})` : ''}</div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div class="flex items-center justify-between p-2.5 rounded-lg border" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)"><span style="color:var(--ons-text-soft)">Total Keseluruhan</span><b class="font-mono-num text-sm text-blue-600">${S().rp(filteredFaktur.reduce((s, f) => s + Number(f.netto_hutang || 0), 0))}</b></div>
              <div class="flex items-center justify-between p-2.5 rounded-lg border" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)"><span style="color:var(--ons-text-soft)">Jumlah Transaksi</span><b class="font-mono-num text-sm">${filteredFaktur.length} &times;</b></div>
            </div>
          </div>
        </div>
      `}
    </div>`;
  }

  global.setFakturTab = (t) => {
    if (t === 'order') t = 'defecta';
    fakturTab = t || 'defecta';
    if (S().AppState.subTabs) {
      S().AppState.subTabs.faktur = fakturTab;
      S().AppState.subTabs.defecta = fakturTab;
    }
    global.renderActiveView();
    if (typeof global.syncNavHighlight === 'function') global.syncNavHighlight();
  };
  global.setFakturListQ = (v) => { fakturListQ = v || ''; global.renderActiveView(); };
  global.setFakturListFilter = (v) => { fakturListFilter = v || 'SEMUA'; global.renderActiveView(); };
  global.setFakturListPbfFilter = (v) => { fakturListPbfFilter = v || ''; global.renderActiveView(); };
  global.setFakturDateRange = (which, val) => {
    if (which === 'from') fakturDateFrom = val || '';
    else if (which === 'to') fakturDateTo = val || '';
    global.renderActiveView();
  };
  global.setPlanFilter = (k, val) => {
    if (k === 'q') planSearchQ = val || '';
    else if (k === 'supplier') planSupplierFilter = val || '';
    else if (k === 'jenis') planJenisSpFilter = val || '';
    global.renderActiveView();
  };
  global.dismissPlanBanner = () => { planBannerDismissed = true; global.renderActiveView(); };

  global.addObatToPurchasePlan = (idObat, qtyCustom, keterangan, goToPlan) => {
    const st = S().AppState;
    const o = (st.masterObat || []).find((m) => m.id_obat === idObat);
    if (!o) return global.toast('Produk tidak ditemukan di katalog.', 'warn');
    const plans = _readLocalList(PLANS_KEY);
    const s = S().getSellableStok(o.id_obat);
    const defaultQty = qtyCustom !== undefined ? Math.max(1, Number(qtyCustom)) : Math.max(10, Number(o.stok_max || 100) - s);
    const exist = plans.find((p) => p.id_obat === o.id_obat);
    if (exist) {
      exist.kuantitas = Number(exist.kuantitas || 0) + defaultQty;
      exist.selected = true;
      if (keterangan) exist.keterangan = keterangan;
    } else {
      plans.unshift({
        id_plan: 'PLN-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5).toUpperCase(),
        id_obat: o.id_obat,
        nama_produk: o.nama_dagang,
        jenis_sp: _resolvePlanJenisSp(o.golongan_bpom),
        nama_supplier: o.pbf_utama || ((st.supplierPbf && st.supplierPbf[0] && st.supplierPbf[0].nama_pbf) || 'PBF Reguler'),
        kuantitas: defaultQty,
        satuan: o.satuan_dasar || 'Unit',
        harga_beli: Number(o.hpp_terakhir || o.hpp_avg || 0),
        keterangan: keterangan || 'Rencana dari Defecta',
        selected: true
      });
    }
    _writeLocalList(PLANS_KEY, plans);
    global.toast(o.nama_dagang + ' dimasukkan ke Rencana Pembelian.', 'ok');
    if (goToPlan) global.navigateView('faktur', 'rencana');
    else global.renderActiveView();
  };

  global.pullLowStockToPlans = () => {
    const st = S().AppState;
    const plans = _readLocalList(PLANS_KEY);
    const lowAll = (st.masterObat || []).filter((o) => S().getSellableStok(o.id_obat) <= Number(o.stok_min || 10));
    const candidates = lowAll.length ? lowAll : (st.masterObat || []).slice(0, 3);
    let added = 0;
    candidates.forEach((o) => {
      if (!plans.some((p) => p.id_obat === o.id_obat)) {
        const s = S().getSellableStok(o.id_obat);
        plans.push({
          id_plan: 'PLN-' + Date.now() + '-' + added + '-' + Math.random().toString(36).slice(2, 5).toUpperCase(),
          id_obat: o.id_obat,
          nama_produk: o.nama_dagang,
          jenis_sp: _resolvePlanJenisSp(o.golongan_bpom),
          nama_supplier: o.pbf_utama || ((st.supplierPbf && st.supplierPbf[0] && st.supplierPbf[0].nama_pbf) || 'PBF Reguler'),
          kuantitas: Math.max(10, Number(o.stok_max || 100) - s),
          satuan: o.satuan_dasar || 'Unit',
          harga_beli: Number(o.hpp_terakhir || o.hpp_avg || 0),
          keterangan: 'Rekomendasi Defecta',
          selected: true
        });
        added++;
      }
    });
    _writeLocalList(PLANS_KEY, plans);
    global.toast(added ? `${added} item rekomendasi Defecta ditambahkan ke Rencana Pembelian.` : 'Semua item Defecta sudah ada di Rencana Pembelian.', added ? 'ok' : 'info');
    global.renderActiveView();
  };

  global.togglePlanSelected = (idPlan, checked) => {
    const plans = _readLocalList(PLANS_KEY);
    const target = plans.find((p) => p.id_plan === idPlan);
    if (target) target.selected = Boolean(checked);
    _writeLocalList(PLANS_KEY, plans);
    global.renderActiveView();
  };

  global.toggleAllPlansSelected = (checked) => {
    const plans = _readLocalList(PLANS_KEY);
    plans.forEach((p) => { p.selected = Boolean(checked); });
    _writeLocalList(PLANS_KEY, plans);
    global.renderActiveView();
  };

  global.updatePurchasePlanField = (idPlan, field, val) => {
    const plans = _readLocalList(PLANS_KEY);
    const target = plans.find((p) => p.id_plan === idPlan);
    if (!target) return;
    target[field] = (field === 'harga_beli' || field === 'kuantitas') ? (window.parseNumber ? window.parseNumber(val) : Number(val || 0)) : val;
    _writeLocalList(PLANS_KEY, plans);
    global.renderActiveView();
  };

  global.removePurchasePlan = (idPlan) => {
    _writeLocalList(PLANS_KEY, _readLocalList(PLANS_KEY).filter((p) => p.id_plan !== idPlan));
    global.renderActiveView();
  };

  global.clearAllPurchasePlans = () => {
    const list = _readLocalList(PLANS_KEY);
    if (!list.length) {
      if (typeof global.toast === 'function') global.toast('Daftar Rencana Pembelian sudah kosong.', 'info');
      return;
    }
    if (!confirm('Kosongkan seluruh daftar Rencana Pembelian (' + list.length + ' item)? Semua draf usulan pengadaan akan dibersihkan.')) return;
    _writeLocalList(PLANS_KEY, []);
    if (typeof global.toast === 'function') global.toast('Daftar Rencana Pembelian berhasil dikosongkan.', 'ok');
    global.renderActiveView();
  };

  global.openPenawaranSalesModal = () => {
    const st = S().AppState;
    const pbfs = st.supplierPbf || [];
    const obats = st.masterObat || [];
    S().openModal(`<div class="p-5 sm:p-6 space-y-3.5 text-xs">
      <div class="flex items-center justify-between gap-2 bg-emerald-600 text-white -m-5 sm:-m-6 mb-4 px-5 py-3.5 rounded-t-2xl">
        <h3 class="font-extrabold text-base">Tambah dari Penawaran Sales PBF</h3>
        <button type="button" onclick="window.ONSStore.closeModal()" class="text-white/90 text-lg px-2">&times;</button>
      </div>
      <div>
        <label class="font-semibold block mb-1">Pilih Produk Katalog (atau kosongkan untuk input bebas)</label>
        <select id="psObatSel" class="ons-select text-xs" onchange="const opt=this.options[this.selectedIndex];if(opt&&opt.dataset.nama){document.getElementById('psNamaInp').value=opt.dataset.nama;document.getElementById('psHargaInp').value=opt.dataset.hpp||'0';document.getElementById('psSatuanInp').value=opt.dataset.satuan||'Unit';if(opt.dataset.pbf)document.getElementById('psPbfSel').value=opt.dataset.pbf;}">
          <option value="">-- Pilih Obat Katalog --</option>
          ${obats.map((o) => `<option value="${S().esc(o.id_obat)}" data-nama="${S().esc(o.nama_dagang)}" data-hpp="${Number(o.hpp_terakhir || o.hpp_avg || 0)}" data-satuan="${S().esc(o.satuan_dasar || 'Unit')}" data-pbf="${S().esc(o.pbf_utama || '')}">${S().esc(o.nama_dagang)} (Stok ${S().getSellableStok(o.id_obat)})</option>`).join('')}
        </select>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><label class="font-semibold block mb-1">Nama Produk *</label><input id="psNamaInp" class="ons-input text-xs" placeholder="Nama obat / produk penawaran"/></div>
        <div><label class="font-semibold block mb-1">Nama Supplier PBF *</label>
          <select id="psPbfSel" class="ons-select text-xs">
            ${pbfs.map((p) => `<option value="${S().esc(p.nama_pbf)}">${S().esc(p.nama_pbf)}</option>`).join('')}
          </select>
        </div>
        <div><label class="font-semibold block mb-1">Jenis SP</label>
          <select id="psJenisSel" class="ons-select text-xs">
            ${['REGULER', 'PREKURSOR', 'OOT', 'PSIKOTROPIKA', 'NARKOTIKA'].map((g) => `<option value="${g}">${g}</option>`).join('')}
          </select>
        </div>
        <div><label class="font-semibold block mb-1">Satuan</label><input id="psSatuanInp" class="ons-input text-xs" value="Box"/></div>
        <div><label class="font-semibold block mb-1">Kuantitas *</label><input id="psQtyInp" type="number" min="1" class="ons-input font-mono-num text-xs" value="20"/></div>
        <div><label class="font-semibold block mb-1">Harga Beli Satuan (Rp)</label><input id="psHargaInp" type="text" inputmode="numeric" class="ons-input ons-currency-input font-mono-num text-xs" value="0" oninput="window.maskNumberInput(this)"/></div>
      </div>
      <div><label class="font-semibold block mb-1">Keterangan Penawaran Sales</label><input id="psKetInp" class="ons-input text-xs" value="Penawaran Sales PBF (Harga Promo)"/></div>
      <div class="flex justify-end gap-2 pt-2 border-t" style="border-color:var(--ons-border)">
        <button type="button" onclick="window.ONSStore.closeModal()" class="ons-btn ons-btn-ghost text-xs">Batal</button>
        <button type="button" onclick="window.submitPenawaranSales()" class="ons-btn ons-btn-emerald text-xs font-bold">+ Masukkan ke Rencana Pembelian</button>
      </div>
    </div>`, { mode: 'spotlight', maxWidth: '580px' });
  };

  global.submitPenawaranSales = () => {
    const idObat = (document.getElementById('psObatSel') || {}).value || '';
    const nama = String((document.getElementById('psNamaInp') || {}).value || '').trim();
    const pbf = (document.getElementById('psPbfSel') || {}).value || 'PBF Reguler';
    const jenis = (document.getElementById('psJenisSel') || {}).value || 'REGULER';
    const satuan = (document.getElementById('psSatuanInp') || {}).value || 'Unit';
    const qty = Math.max(1, Number((document.getElementById('psQtyInp') || {}).value || 1));
    const harga = Math.max(0, window.parseNumber ? window.parseNumber((document.getElementById('psHargaInp') || {}).value || 0) : Number((document.getElementById('psHargaInp') || {}).value || 0));
    const ket = (document.getElementById('psKetInp') || {}).value || 'Penawaran Sales';
    if (!nama) return global.toast('Nama produk penawaran sales wajib diisi.', 'warn');
    const plans = _readLocalList(PLANS_KEY);
    plans.unshift({
      id_plan: 'PLN-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5).toUpperCase(),
      id_obat: idObat || ('CUSTOM-' + Date.now().toString().slice(-4)),
      nama_produk: nama,
      jenis_sp: jenis,
      nama_supplier: pbf,
      kuantitas: qty,
      satuan,
      harga_beli: harga,
      keterangan: ket,
      selected: true
    });
    _writeLocalList(PLANS_KEY, plans);
    S().closeModal();
    global.toast(`${nama} masuk ke Rencana Pembelian.`, 'ok');
    global.renderActiveView();
  };

  global.convertSinglePlanToSp = (idPlan) => {
    const plans = _readLocalList(PLANS_KEY);
    const p = plans.find((x) => x.id_plan === idPlan);
    if (!p) return global.toast('Item rencana tidak ditemukan.', 'warn');
    if (typeof global.openSpModalFromPlans === 'function') {
      _writeLocalList(PLANS_KEY, plans.filter((x) => x.id_plan !== idPlan));
      global.openSpModalFromPlans(p.nama_supplier, p.jenis_sp, [p], 'Dari Rencana Pembelian: ' + (p.keterangan || ''));
    }
  };

  global.convertSelectedPlansToSp = () => {
    const plans = _readLocalList(PLANS_KEY);
    const picked = plans.filter((p) => p.selected);
    if (!picked.length) return global.toast('Centang minimal 1 produk pada Rencana Pembelian.', 'warn');
    const firstSup = picked[0].nama_supplier;
    const golList = picked.map((x) => String(x.jenis_sp || 'REGULER').toUpperCase());
    const golSp = golList.includes('NARKOTIKA') ? 'NARKOTIKA' : (golList.includes('PSIKOTROPIKA') ? 'PSIKOTROPIKA' : (golList.includes('PREKURSOR') ? 'PREKURSOR' : (golList.includes('OOT') ? 'OOT' : 'REGULER')));
    _writeLocalList(PLANS_KEY, plans.filter((p) => !p.selected));
    if (typeof global.openSpModalFromPlans === 'function') {
      global.openSpModalFromPlans(firstSup, golSp, picked, 'Konversi ' + picked.length + ' item Rencana Pembelian');
    }
  };

  global.exportPurchasePlans = (fmt) => {
    const plans = _readLocalList(PLANS_KEY);
    const rows = plans.map((p, i) => ({
      no: i + 1,
      nama: p.nama_produk,
      jenis_sp: p.jenis_sp,
      supplier: p.nama_supplier,
      qty: Number(p.kuantitas || 0),
      satuan: p.satuan || 'Unit',
      harga_beli: Number(p.harga_beli || 0),
      subtotal: Number(p.kuantitas || 0) * Number(p.harga_beli || 0),
      keterangan: p.keterangan || ''
    }));
    S().exportDataset(fmt || 'xlsx', 'Rencana Pembelian Obat Apotek', `rencana-pembelian-${new Date().toISOString().slice(0, 10)}`, [
      { key: 'no', label: 'No', type: 'int', width: 6 },
      { key: 'nama', label: 'Nama Produk', type: 'wrap', width: 28 },
      { key: 'jenis_sp', label: 'Jenis SP', type: 'str', width: 13 },
      { key: 'supplier', label: 'Supplier', type: 'wrap', width: 24 },
      { key: 'qty', label: 'Kuantitas', type: 'int', sum: true, width: 12 },
      { key: 'satuan', label: 'Satuan', type: 'str', width: 10 },
      { key: 'harga_beli', label: 'Harga Beli Satuan', type: 'currency', width: 16 },
      { key: 'subtotal', label: 'Total Harga', type: 'currency', sum: true, width: 18 },
      { key: 'keterangan', label: 'Keterangan', type: 'wrap', width: 24 }
    ], rows, { sheetName: 'RencanaPembelian' });
  };

  global.exportFakturList = (fmt) => {
    const allFaktur = S().AppState.fakturPbf || [];
    const rows = allFaktur.map((f, i) => ({
      no: i + 1,
      tgl_terima: String(f.tgl_terima || f.tgl_faktur || f.created_at || '').slice(0, 10),
      no_faktur: f.no_faktur_pbf || '',
      no_sp: f.no_sp || '-',
      supplier: f.id_pbf || '',
      tempo: f.tgl_jatuh_tempo || '',
      netto: Number(f.netto_hutang || 0),
      sisa_hutang: Number(f.sisa_hutang || 0),
      status: f.status_bayar || ''
    }));
    S().exportDataset(fmt || 'xlsx', 'Daftar Faktur Pembelian PBF', `faktur-pembelian-${new Date().toISOString().slice(0, 10)}`, [
      { key: 'no', label: 'No', type: 'int', width: 6 },
      { key: 'tgl_terima', label: 'Tgl Terima', type: 'str', width: 13 },
      { key: 'no_faktur', label: 'No. Faktur', type: 'str', width: 20 },
      { key: 'no_sp', label: 'No. SP', type: 'str', width: 20 },
      { key: 'supplier', label: 'Supplier', type: 'wrap', width: 24 },
      { key: 'tempo', label: 'Jatuh Tempo', type: 'str', width: 13 },
      { key: 'netto', label: 'Total Pembelian', type: 'currency', sum: true, width: 18 },
      { key: 'sisa_hutang', label: 'Sisa Hutang', type: 'currency', sum: true, width: 18 },
      { key: 'status', label: 'Status', type: 'str', width: 14 }
    ], rows, { sheetName: 'FakturPembelian' });
  };

  global.openFakturDraftModal = () => {
    const drafts = _readLocalList(FAKTUR_DRAFTS_KEY);
    S().openModal(`<div class="p-5 sm:p-6 space-y-4">
      <div class="flex items-center justify-between gap-2 bg-blue-600 text-white -m-5 sm:-m-6 mb-4 px-5 py-3.5 rounded-t-2xl">
        <h3 class="font-extrabold text-base">Draft Faktur Pembelian (${drafts.length})</h3>
        <button type="button" onclick="window.ONSStore.closeModal()" class="text-white/90 text-lg px-2">&times;</button>
      </div>
      <div class="ons-table-wrap max-h-80">
        <table class="ons-table">
          <thead><tr><th>No.</th><th>Terakhir Disimpan</th><th>Supplier</th><th>No. Faktur</th><th>Produk</th><th class="text-right">Total</th><th>Action</th></tr></thead>
          <tbody>
            ${drafts.length ? drafts.map((d, idx) => {
              const tot = (d.items || []).reduce((s, it) => s + Math.max(0, Number(it.qty_dasar || 0) * Number(it.hpp_unit || 0) - Number(it.diskon_item || 0)), 0);
              return `<tr>
                <td class="font-mono-num text-xs">${idx + 1}.</td>
                <td class="font-mono-num text-xs">${S().formatTgl(d.saved_at || '', true)}</td>
                <td class="text-xs font-bold">${S().esc((d.header && d.header.id_pbf) || '-')}</td>
                <td class="font-mono-num text-xs">${S().esc((d.header && d.header.no_faktur_pbf) || '-')}</td>
                <td class="text-xs">${(d.items || []).length} baris</td>
                <td class="text-right font-mono-num text-xs font-bold">${S().rp(tot)}</td>
                <td>
                  <div class="flex gap-1.5">
                    <button type="button" onclick="window.loadGrnDraftFromLocal('${S().esc(d.id_draft)}')" class="ons-btn ons-btn-primary text-[11px] py-1 px-2.5">Lanjutkan</button>
                    <button type="button" onclick="window.deleteGrnDraftFromLocal('${S().esc(d.id_draft)}')" class="ons-btn ons-btn-danger text-[11px] py-1 px-2">Hapus</button>
                  </div>
                </td>
              </tr>`;
            }).join('') : '<tr><td colspan="7" class="text-center py-8 text-xs">Data tidak ditemukan.</td></tr>'}
          </tbody>
        </table>
      </div>
      <div class="flex flex-wrap items-center justify-between gap-3 pt-2 border-t text-xs" style="border-color:var(--ons-border)">
        <div class="p-2.5 rounded-xl border bg-amber-500/10 border-amber-500/30 flex-1">Draft ini hanya tersimpan di perangkat &amp; browser ini. Klik <b>Lanjutkan</b> untuk menyimpan faktur ke sistem.</div>
        <button type="button" onclick="window.ONSStore.closeModal()" class="ons-btn ons-btn-ghost text-xs">Kembali</button>
      </div>
    </div>`, { mode: 'spotlight', maxWidth: '820px' });
  };

  global.saveGrnDraftToLocal = () => {
    ensureGrnInitialized();
    const isKns = grnHeader.jenis_penerimaan === 'KONSINYASI';
    const targetKey = isKns ? KONSINYASI_DRAFTS_KEY : FAKTUR_DRAFTS_KEY;
    const drafts = _readLocalList(targetKey);
    const idDraft = grnActiveDraftId || ((isKns ? 'KND-' : 'FKD-') + Date.now());
    const entry = {
      id_draft: idDraft,
      saved_at: new Date().toISOString(),
      header: Object.assign({}, grnHeader),
      items: grnItems.map((it) => Object.assign({}, it))
    };
    const idx = drafts.findIndex((x) => x.id_draft === idDraft);
    if (idx >= 0) drafts[idx] = entry; else drafts.unshift(entry);
    _writeLocalList(targetKey, drafts);
    grnActiveDraftId = '';
    global.toast(isKns ? 'Draft Konsinyasi Masuk tersimpan di browser.' : 'Draft Faktur Pembelian tersimpan di browser.', 'ok');
    global.renderActiveView();
  };

  global.loadGrnDraftFromLocal = (idDraft) => {
    const d = _readLocalList(FAKTUR_DRAFTS_KEY).find((x) => x.id_draft === idDraft);
    if (!d) return global.toast('Draft faktur tidak ditemukan.', 'warn');
    grnActiveDraftId = d.id_draft;
    grnHeader = Object.assign({}, grnHeader, d.header || {});
    grnItems = Array.isArray(d.items) && d.items.length ? d.items.slice() : [];
    S().closeModal();
    global.setFakturTab('input');
  };

  global.deleteGrnDraftFromLocal = (idDraft) => {
    _writeLocalList(FAKTUR_DRAFTS_KEY, _readLocalList(FAKTUR_DRAFTS_KEY).filter((x) => x.id_draft !== idDraft));
    global.openFakturDraftModal();
  };

  global.setReturFilterMode = (m) => { returFilterMode = m === 'ALL' ? 'ALL' : 'NEAR_ED'; global.renderActiveView(); };
  global.setReturSearchQ = (v) => { returSearchQ = v || ''; global.renderActiveView(); };
  global.setReturDateRange = (which, val) => {
    if (which === 'from') returDateFrom = val || '';
    else if (which === 'to') returDateTo = val || '';
    global.renderActiveView();
  };
  global.toggleGrnScannerPanel = () => {
    grnScanState.panelOpen = !Boolean(grnScanState.panelOpen);
    global.renderActiveView();
  };
  global.toggleGrnDiskonMode = () => {
    grnHeader.diskon_mode = grnHeader.diskon_mode === 'PCT' ? 'RP' : 'PCT';
    global.renderActiveView();
  };
  global.setGrnTempoDays = (days) => {
    const d = Math.max(0, Number(days || 0));
    grnHeader.tempo_hari = d;
    grnHeader.tgl_jatuh_tempo = _dueDateFromTermin(d, grnHeader.tgl_faktur);
    global.renderActiveView();
  };
  global.setGrnField = (k, v, rerender) => {
    grnHeader[k] = ['diskon_pbf', 'ppn_masukan', 'cashback', 'biaya_lainnya', 'tempo_hari', 'diskon_pct'].includes(k)
      ? (window.parseNumber ? window.parseNumber(v) : Number(v || 0))
      : v;
    if (k === 'id_pbf') {
      const term = _getPbfTerminDays(v);
      grnHeader.tempo_hari = term;
      grnHeader.tgl_jatuh_tempo = _dueDateFromTermin(term, grnHeader.tgl_faktur);
      global.renderActiveView();
      return;
    }
    if (k === 'tgl_faktur' && grnHeader.tempo_hari !== undefined) {
      grnHeader.tgl_jatuh_tempo = _dueDateFromTermin(grnHeader.tempo_hari, v);
    }
    if (rerender) global.renderActiveView();
  };
  global.applyGrnPpn11 = (enable) => {
    const totalBruto = grnItems.reduce((s, it) => s + Math.max(0, (Number(it.qty_dasar || 0) * Number(it.hpp_unit || 0)) - Number(it.diskon_item || 0)), 0);
    const hdrDisc = grnHeader.diskon_mode === 'PCT'
      ? Math.round(totalBruto * Math.min(100, Math.max(0, Number(grnHeader.diskon_pct || 0))) / 100)
      : Math.max(0, Number(grnHeader.diskon_pbf || 0));
    const dpp = Math.max(0, totalBruto - hdrDisc);
    grnHeader.ppn_masukan = enable ? Math.round(dpp * 0.11) : 0;
    global.renderActiveView();
  };
  global.resetGrnForm = () => {
    const st = S().AppState;
    const defaultPbf = st.supplierPbf && st.supplierPbf.length ? st.supplierPbf[0].nama_pbf : '';
    const term = _getPbfTerminDays(defaultPbf);
    const todayStr = new Date().toISOString().slice(0, 10);
    grnActiveDraftId = '';
    grnHeader = {
      id_sp: '',
      no_faktur_pbf: '',
      no_sp: '',
      id_pbf: defaultPbf,
      tgl_faktur: todayStr,
      tgl_terima: todayStr,
      tgl_jatuh_tempo: _dueDateFromTermin(term, todayStr),
      tempo_hari: term,
      jenis_faktur: 'BELUM_PAJAK',
      gudang: 'Gudang Utama',
      metode_pembayaran: 'KREDIT',
      diskon_mode: 'RP',
      diskon_pct: 0,
      diskon_pbf: 0,
      ppn_masukan: 0,
      cashback: 0,
      biaya_lainnya: 0,
      jenis_penerimaan: 'BELI_PUTUS',
      status_bayar: 'BELUM_LUNAS',
      catatan: ''
    };
    grnItems = [];
    ensureGrnInitialized();
    global.clearGrnScanner();
  };
  global.addGrnItemRow = () => {
    const o = S().AppState.masterObat[0] || { id_obat: 'OBT-001', hpp_avg: 5000 };
    grnItems.push({
      id_obat: o.id_obat,
      no_batch: 'B-' + new Date().getFullYear() + '-R' + (grnItems.length + 1),
      tgl_kadaluarsa: '2028-12-31',
      qty_dasar: 20,
      hpp_unit: Number(o.hpp_terakhir || o.hpp_avg || 5000)
    });
    global.renderActiveView();
  };
  global.updateGrnItem = (idx, key, val) => {
    if (!grnItems[idx]) return;
    grnItems[idx][key] = ['hpp_unit', 'diskon_item', 'qty_dasar'].includes(key)
      ? (window.parseNumber ? window.parseNumber(val) : Number(val || 0))
      : val;
    if (key === 'id_obat') {
      const o = S().AppState.masterObat.find((m) => m.id_obat === val);
      if (o) grnItems[idx].hpp_unit = Number(o.hpp_terakhir || o.hpp_avg || grnItems[idx].hpp_unit);
    }
    global.renderActiveView();
  };
  global.removeGrnItemRow = (idx) => {
    if (grnItems.length > 1) { grnItems.splice(idx, 1); global.renderActiveView(); }
  };

  function _updateGrnScanProgressDom(pct, txt) {
    grnScanState.progress = Number(pct || 0);
    grnScanState.statusText = txt || '';
    const wrap = document.getElementById('grnScanProgressWrap');
    const bar = document.getElementById('grnScanProgressBar');
    const lbl = document.getElementById('grnScanStatusLabel');
    const pctLbl = document.getElementById('grnScanPctLabel');
    if (wrap) wrap.classList.remove('hidden');
    if (bar) bar.style.width = Math.min(100, Math.max(0, grnScanState.progress)) + '%';
    if (lbl) lbl.textContent = grnScanState.statusText;
    if (pctLbl) pctLbl.textContent = Math.round(grnScanState.progress) + '%';
  }

  global.setGrnRawText = (val) => {
    grnScanState.rawText = String(val || '');
  };

  global.setGrnScanOption = (key, val) => {
    if (key === 'rotate') {
      grnScanState.rotateDeg = (Number(grnScanState.rotateDeg || 0) + Number(val || 90)) % 360;
    } else if (key === 'enhanceMode') {
      grnScanState.enhanceMode = val || 'contrast';
    }
    if (grnScanState.previewDataUrl) {
      window.runGrnImageScan();
    } else {
      global.renderActiveView();
    }
  };

  global.clearGrnScanner = () => {
    grnScanState.panelOpen = false;
    grnScanState.previewDataUrl = '';
    grnScanState.processedDataUrl = '';
    grnScanState.fileName = '';
    grnScanState.sourceType = '';
    grnScanState.rotateDeg = 0;
    grnScanState.scanning = false;
    grnScanState.progress = 0;
    grnScanState.statusText = '';
    grnScanState.rawText = '';
    grnScanState.summary = null;
    grnScanState.error = '';
    const inp = document.getElementById('grnOcrRaw');
    if (inp) inp.value = '';
    global.renderActiveView();
  };

  global.loadGrnSampleInvoice = () => {
    const scanner = global.ONSInvoiceScanner;
    const sample = scanner ? scanner.getSamplePbfInvoiceText(S().AppState) : '';
    grnScanState.panelOpen = true;
    grnScanState.rawText = sample;
    grnScanState.error = '';
    const inp = document.getElementById('grnOcrRaw');
    if (inp) inp.value = sample;
    global.parseGrnOcrToForm();
  };

  global.openGrnLiveCamera = () => {
    const scanner = global.ONSInvoiceScanner;
    if (!scanner) return;
    grnScanState.panelOpen = true;
    scanner.openLiveCameraCaptureModal((dataUrl, fileName) => {
      grnScanState.panelOpen = true;
      grnScanState.previewDataUrl = dataUrl;
      grnScanState.processedDataUrl = dataUrl;
      grnScanState.fileName = fileName || 'Kamera_Faktur.jpg';
      grnScanState.sourceType = 'KAMERA';
      grnScanState.rotateDeg = 0;
      grnScanState.error = '';
      global.runGrnImageScan();
    });
  };

  global.runGrnImageScan = async () => {
    const scanner = global.ONSInvoiceScanner;
    if (!scanner || !grnScanState.previewDataUrl) return;
    grnScanState.panelOpen = true;
    grnScanState.scanning = true;
    grnScanState.error = '';
    global.renderActiveView();
    try {
      _updateGrnScanProgressDom(8, 'Meningkatkan ketajaman & kontras gambar...');
      const pre = await scanner.preprocessInvoiceImage(grnScanState.previewDataUrl, {
        enhanceMode: grnScanState.enhanceMode || 'contrast',
        rotateDeg: grnScanState.rotateDeg || 0
      });
      grnScanState.processedDataUrl = pre.dataUrl || grnScanState.previewDataUrl;
      const text = await scanner.recognizeImageText(grnScanState.processedDataUrl, _updateGrnScanProgressDom);
      grnScanState.rawText = text;
      grnScanState.scanning = false;
      if (!String(text || '').trim()) {
        grnScanState.error = 'Teks belum terbaca dari gambar. Coba putar gambar 90 derajat, ubah mode ke Hitam-Putih Dot Matrix, atau tempel teks secara manual.';
        global.renderActiveView();
        return;
      }
      global.parseGrnOcrToForm(text);
    } catch (err) {
      grnScanState.scanning = false;
      grnScanState.error = (err && err.message) ? err.message : 'Gagal menjalankan OCR browser.';
      global.toast(grnScanState.error, 'warn');
      global.renderActiveView();
    }
  };

  global.handleGrnScannerFile = async (file) => {
    const scanner = global.ONSInvoiceScanner;
    if (!file || !scanner) return;
    const fname = String(file.name || '');
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(fname);
    grnScanState.fileName = fname;
    grnScanState.error = '';
    grnScanState.rotateDeg = 0;
    grnScanState.panelOpen = true;

    if (isPdf) {
      grnScanState.sourceType = 'PDF';
      grnScanState.previewDataUrl = '';
      grnScanState.processedDataUrl = '';
      grnScanState.scanning = true;
      global.renderActiveView();
      try {
        const pdfRes = await scanner.extractFromPdfFile(file, _updateGrnScanProgressDom);
        if (pdfRes.source === 'PDF_TEXT') {
          grnScanState.rawText = pdfRes.text;
          grnScanState.scanning = false;
          global.parseGrnOcrToForm(pdfRes.text);
          return;
        }
        if (pdfRes.pageImages && pdfRes.pageImages.length) {
          grnScanState.previewDataUrl = pdfRes.pageImages[0];
          grnScanState.processedDataUrl = pdfRes.pageImages[0];
          await global.runGrnImageScan();
          return;
        }
        grnScanState.scanning = false;
        grnScanState.error = 'PDF kosong atau tidak dapat dirender.';
        global.renderActiveView();
      } catch (err) {
        grnScanState.scanning = false;
        grnScanState.error = (err && err.message) ? err.message : 'Gagal membaca file PDF faktur.';
        global.toast(grnScanState.error, 'warn');
        global.renderActiveView();
      }
      return;
    }

    // File Gambar (JPG / PNG / WebP / HEIC)
    grnScanState.sourceType = 'FOTO';
    const reader = new FileReader();
    reader.onload = (ev) => {
      grnScanState.previewDataUrl = ev.target && ev.target.result ? String(ev.target.result) : '';
      grnScanState.processedDataUrl = grnScanState.previewDataUrl;
      global.runGrnImageScan();
    };
    reader.onerror = () => {
      grnScanState.error = 'Gagal membaca file gambar dari perangkat.';
      global.renderActiveView();
    };
    reader.readAsDataURL(file);
  };

  global.parseGrnOcrToForm = (overrideText) => {
    const domVal = (document.getElementById('grnOcrRaw') || {}).value;
    const raw = typeof overrideText === 'string'
      ? overrideText
      : (domVal !== undefined ? domVal : (grnScanState.rawText || ''));
    if (!String(raw).trim()) return global.toast('Tempel teks faktur atau scan foto/PDF faktur terlebih dahulu.', 'warn');

    grnScanState.rawText = String(raw);
    grnScanState.panelOpen = true;
    ensureGrnInitialized();

    const st = S().AppState;
    const scanner = global.ONSInvoiceScanner;
    if (scanner && typeof scanner.parseInvoiceText === 'function') {
      const parsed = scanner.parseInvoiceText(raw, st.masterObat, st.supplierPbf);
      if (parsed.header.no_faktur_pbf) grnHeader.no_faktur_pbf = parsed.header.no_faktur_pbf;
      if (parsed.header.no_sp && !grnHeader.id_sp) grnHeader.no_sp = parsed.header.no_sp;
      if (parsed.header.id_pbf && !grnHeader.id_sp) grnHeader.id_pbf = parsed.header.id_pbf;
      if (parsed.header.tgl_jatuh_tempo) grnHeader.tgl_jatuh_tempo = parsed.header.tgl_jatuh_tempo;
      if (parsed.header.diskon_pbf > 0) grnHeader.diskon_pbf = parsed.header.diskon_pbf;
      if (parsed.header.status_bayar) grnHeader.status_bayar = parsed.header.status_bayar;

      if (parsed.items && parsed.items.length) {
        const spQtyMap = {};
        grnItems.forEach((oldIt) => {
          if (oldIt.id_obat && Number(oldIt.qty_sp || 0) > 0) spQtyMap[oldIt.id_obat] = Number(oldIt.qty_sp);
        });
        grnItems = parsed.items.map((it) => ({
          id_obat: it.id_obat,
          no_batch: it.no_batch,
          tgl_kadaluarsa: it.tgl_kadaluarsa,
          qty_sp: spQtyMap[it.id_obat] || 0,
          qty_dasar: Number(it.qty_dasar || 1),
          hpp_unit: Number(it.hpp_unit || 0)
        }));
      }

      if (parsed.header.ppn_masukan > 0) {
        grnHeader.ppn_masukan = parsed.header.ppn_masukan;
      } else if (parsed.meta.autoPpn11) {
        const brutoEst = grnItems.reduce((s, it) => s + (Number(it.qty_dasar || 0) * Number(it.hpp_unit || 0)), 0);
        grnHeader.ppn_masukan = Math.round(Math.max(0, brutoEst - Number(grnHeader.diskon_pbf || 0)) * 0.11);
      }

      grnScanState.summary = {
        headerFields: parsed.meta.detectedHeaderFields,
        itemCount: grnItems.length,
        matchedItemsCount: parsed.meta.matchedItemsCount,
        unitConversions: parsed.meta.unitConversions || [],
        unmatchedLines: parsed.meta.unmatchedLines || []
      };

      global.toast(`Scan faktur selesai: ${parsed.meta.detectedHeaderFields} header & ${grnItems.length} baris obat terisi ke GRN!`, 'ok');
      global.renderActiveView();
      return;
    }

    // Fallback minimalis jika scanner helper belum termuat
    const fakM = raw.match(/\b((?:FK|INV|FJ)[-\/][A-Z0-9\-\/]{3,})/i);
    if (fakM) grnHeader.no_faktur_pbf = fakM[1].toUpperCase();
    global.toast('Ekstraksi teks faktur selesai diisi ke Form GRN!', 'ok');
    global.renderActiveView();
  };

  function _konsMatchDate(isoStr) {
    const d = String(isoStr || '').slice(0, 10);
    if (konsDateFrom && (!d || d < konsDateFrom)) return false;
    if (konsDateTo && (!d || d > konsDateTo)) return false;
    return true;
  }

  function _getKonsinyasiMasukRows(st, allItems) {
    const fakList = Array.isArray(st.fakturPbf) ? st.fakturPbf : [];
    const isK = (f) => String(f.status_bayar || '').toUpperCase() === 'KONSINYASI' || String(f.jenis_penerimaan || '').toUpperCase() === 'KONSINYASI';
    const knsFakturs = fakList.filter(isK);
    const seenNos = new Set(knsFakturs.map((f) => String(f.no_faktur_pbf || f.id_faktur || '').trim()).filter(Boolean));
    const rows = knsFakturs.map((f) => {
      const noFak = f.no_faktur_pbf || f.id_faktur || '-';
      const matchBatches = allItems.filter((it) => String(it.no_faktur_pbf || '') === String(noFak));
      const prodNames = matchBatches.map((it) => it.nama_dagang).filter(Boolean);
      const totalVal = Number(f.total_bruto || f.netto_hutang || 0) || matchBatches.reduce((s, it) => s + (Number(it.qty_awal || 0) * Number(it.hpp_beli || 0)), 0);
      return {
        key: f.id_faktur || noFak,
        id_faktur: f.id_faktur || '',
        tanggal: String(f.tgl_terima || f.tgl_faktur || '').slice(0, 10),
        no_faktur_pbf: noFak,
        id_pbf: f.id_pbf || (matchBatches[0] && matchBatches[0].id_pbf) || '-',
        produk_label: prodNames.length ? `${prodNames.slice(0, 2).join(', ')}${prodNames.length > 2 ? ` (+${prodNames.length - 2})` : ''}` : `${matchBatches.length} item`,
        qty_total: matchBatches.reduce((s, it) => s + Number(it.qty_awal || 0), 0),
        total_masuk: totalVal,
        tagihan_belum_bayar: matchBatches.reduce((s, it) => s + Number(it.tagihan_belum_bayar || 0), 0),
        batches: matchBatches
      };
    });
    // Fallback grouping for seeded consignment batches not tied to fakturPbf row
    const orphanMap = new Map();
    allItems.forEach((it) => {
      const noF = String(it.no_faktur_pbf || it.id_batch || '-').trim();
      if (seenNos.has(noF)) return;
      if (!orphanMap.has(noF)) {
        orphanMap.set(noF, {
          key: 'BATCH:' + noF,
          id_faktur: '',
          tanggal: String(it.tgl_terima || new Date().toISOString().slice(0, 10)).slice(0, 10),
          no_faktur_pbf: noF,
          id_pbf: it.id_pbf || '-',
          items: [],
          total_masuk: 0,
          qty_total: 0,
          tagihan_belum_bayar: 0
        });
      }
      const g = orphanMap.get(noF);
      g.items.push(it);
      g.total_masuk += Number(it.qty_awal || 0) * Number(it.hpp_beli || 0);
      g.qty_total += Number(it.qty_awal || 0);
      g.tagihan_belum_bayar += Number(it.tagihan_belum_bayar || 0);
    });
    orphanMap.forEach((g) => {
      const names = g.items.map((x) => x.nama_dagang).filter(Boolean);
      rows.push({
        key: g.key,
        id_faktur: '',
        tanggal: g.tanggal,
        no_faktur_pbf: g.no_faktur_pbf,
        id_pbf: g.id_pbf,
        produk_label: names.length ? `${names.slice(0, 2).join(', ')}${names.length > 2 ? ` (+${names.length - 2})` : ''}` : `${g.items.length} item`,
        qty_total: g.qty_total,
        total_masuk: g.total_masuk,
        tagihan_belum_bayar: g.tagihan_belum_bayar,
        batches: g.items
      });
    });
    return rows;
  }

  function _getKonsinyasiReturRows(st, allItems) {
    const muts = Array.isArray(st.mutasiStok) ? st.mutasiStok : [];
    const batchMap = new Map();
    allItems.forEach((it) => batchMap.set(String(it.id_batch || ''), it));
    (st.stokBatch || []).forEach((b) => {
      if (!batchMap.has(String(b.id_batch || ''))) batchMap.set(String(b.id_batch || ''), b);
    });
    const rows = muts
      .filter((m) => String(m.jenis_mutasi || '').toUpperCase() === 'KONSINYASI_RETUR')
      .map((m, i) => {
        const b = batchMap.get(String(m.id_batch || '')) || {};
        const qty = Math.abs(Number(m.qty_ubah || 0));
        const hpp = Number(b.hpp_beli || 0);
        return {
          id_mutasi: m.id_mutasi || ('KRT-' + (i + 1)),
          tanggal: String(m.tanggal || '').slice(0, 10),
          no_faktur_pbf: m.referensi_id || b.no_faktur_pbf || b.no_batch || '-',
          id_pbf: b.id_pbf || '-',
          nama_dagang: b.nama_dagang || m.id_obat || '-',
          no_batch: b.no_batch || m.id_batch || '-',
          qty_retur: qty,
          satuan: b.satuan_dasar || 'unit',
          total_retur: qty * hpp,
          catatan: m.catatan || 'Retur barang konsinyasi tak laku',
          petugas: m.petugas || 'Apoteker'
        };
      });
    return rows;
  }

  function renderKonsinyasiTabHtml(st) {
    const sum = st.konsinyasiSummary || { items: [], settlements: [], totals: { qty_terjual: 0, qty_sisa: 0, tagihan_belum_bayar: 0, sudah_dibayar: 0 } };
    const allItems = Array.isArray(sum.items) ? sum.items : [];
    const suppliers = Array.from(new Set(allItems.map((it) => it.id_pbf).filter(Boolean)));
    const settlements = Array.isArray(sum.settlements) ? sum.settlements : [];
    const knsDrafts = _readLocalList(KONSINYASI_DRAFTS_KEY);
    const qLower = String(konsSearchQ || '').trim().toLowerCase();

    const filteredItems = allItems.filter((it) => {
      if (fakturKonsinyasiPbfFilter && String(it.id_pbf || '') !== fakturKonsinyasiPbfFilter) return false;
      if (qLower) {
        const hay = `${it.nama_dagang || ''} ${it.no_batch || ''} ${it.id_pbf || ''} ${it.no_faktur_pbf || ''}`.toLowerCase();
        if (!hay.includes(qLower)) return false;
      }
      return true;
    });
    const filteredTagihan = filteredItems.reduce((s, it) => s + Number(it.tagihan_belum_bayar || 0), 0);
    const filteredTerjual = filteredItems.reduce((s, it) => s + Number(it.qty_terjual || 0), 0);
    const filteredSisa = filteredItems.reduce((s, it) => s + Number(it.qty_sisa || 0), 0);
    const filteredDibayar = filteredItems.reduce((s, it) => s + Number(it.nilai_sudah_dibayar || 0), 0);
    const totalNilaiBarang = filteredItems.reduce((s, it) => s + ((Number(it.qty_sisa || 0) + Number(it.qty_belum_bayar || 0)) * Number(it.hpp_beli || 0)), 0);

    // Sub-tab switcher header
    const subNavHtml = `<div class="ons-card p-3 flex flex-wrap items-center justify-between gap-2">
      <div class="flex flex-wrap gap-1.5">
        ${[
          { id: 'status', label: 'Status Konsinyasi' },
          { id: 'masuk', label: 'Konsinyasi Masuk' },
          { id: 'retur', label: 'Retur Konsinyasi' },
          { id: 'stok', label: 'Stok Konsinyasi' }
        ].map((t) => `<button type="button" onclick="window.setKonsSubTab('${t.id}')" class="ons-tab-btn ${konsSubTab === t.id ? 'active' : ''}">${t.label}</button>`).join('')}
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button type="button" onclick="window.openKonsinyasiDraftModal()" class="ons-btn ons-btn-emerald text-xs font-bold">Draft (${knsDrafts.length})</button>
        <button type="button" onclick="window.openInputKonsinyasi()" class="ons-btn ons-btn-primary text-xs font-bold">+ Input Konsinyasi</button>
      </div>
    </div>`;

    let bodyHtml = '';

    if (konsSubTab === 'masuk') {
      const rawMasuk = _getKonsinyasiMasukRows(st, allItems);
      const masukRows = rawMasuk.filter((r) => {
        if (!_konsMatchDate(r.tanggal)) return false;
        if (fakturKonsinyasiPbfFilter && r.id_pbf !== fakturKonsinyasiPbfFilter) return false;
        if (qLower) {
          const hay = `${r.no_faktur_pbf} ${r.id_pbf} ${r.produk_label}`.toLowerCase();
          if (!hay.includes(qLower)) return false;
        }
        return true;
      });
      const masukProdRows = filteredItems.filter((it) => _konsMatchDate(it.tgl_terima || it.tgl_faktur || new Date().toISOString().slice(0, 10)));
      const totalKeseluruhan = konsEntryMode === 'produk'
        ? masukProdRows.reduce((s, it) => s + (Number(it.qty_awal || 0) * Number(it.hpp_beli || 0)), 0)
        : masukRows.reduce((s, r) => s + Number(r.total_masuk || 0), 0);
      const jumlahTx = konsEntryMode === 'produk' ? masukProdRows.length : masukRows.length;

      bodyHtml = `<div class="ons-card p-4 space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h3 class="font-bold text-sm">Daftar Konsinyasi Masuk</h3>
          <div class="flex flex-wrap items-center gap-2">
            <select class="ons-select text-xs w-36" onchange="window.setKonsEntryMode(this.value)">
              <option value="faktur" ${konsEntryMode !== 'produk' ? 'selected' : ''}>Pilihan: Faktur</option>
              <option value="produk" ${konsEntryMode === 'produk' ? 'selected' : ''}>Pilihan: Produk</option>
            </select>
            <input class="ons-input text-xs w-48" placeholder="Cari data (faktur/supplier/obat)..." value="${S().esc(konsSearchQ)}" oninput="window.setKonsSearchQ(this.value)"/>
            <input type="date" class="ons-input text-xs w-36" title="Dari tanggal" value="${S().esc(konsDateFrom)}" onchange="window.setKonsDateRange(this.value, '${S().esc(konsDateTo)}')"/>
            <input type="date" class="ons-input text-xs w-36" title="Sampai tanggal" value="${S().esc(konsDateTo)}" onchange="window.setKonsDateRange('${S().esc(konsDateFrom)}', this.value)"/>
            ${(konsDateFrom || konsDateTo || konsSearchQ) ? `<button type="button" onclick="window.setKonsSearchQ('');window.setKonsDateRange('','')" class="ons-btn ons-btn-ghost text-xs">Reset</button>` : ''}
            <button type="button" onclick="window.exportKonsinyasiData('masuk')" class="ons-btn ons-btn-ghost text-xs">Excel</button>
          </div>
        </div>
        <div class="ons-table-wrap">
          ${konsEntryMode === 'produk' ? `<table class="ons-table">
            <thead><tr><th>No.</th><th>Tanggal</th><th>No. Faktur</th><th>Supplier</th><th>Produk &amp; Batch</th><th class="text-right">Qty Masuk</th><th class="text-right">Total Konsinyasi Masuk</th></tr></thead>
            <tbody>
              ${masukProdRows.length ? masukProdRows.map((it, idx) => `<tr>
                <td class="font-mono-num text-xs">${idx + 1}</td>
                <td class="font-mono-num text-xs">${S().esc(String(it.tgl_terima || new Date().toISOString().slice(0, 10)).slice(0, 10))}</td>
                <td class="font-mono-num text-xs font-bold">${S().esc(it.no_faktur_pbf || '-')}</td>
                <td class="text-xs font-semibold">${S().esc(it.id_pbf)}</td>
                <td class="text-xs"><div class="font-bold">${S().esc(it.nama_dagang)}</div><div class="font-mono-num text-[11px]" style="color:var(--ons-text-soft)">${S().esc(it.no_batch)} &bull; ED ${S().esc(String(it.tgl_kadaluarsa || '').slice(0, 10))}</div></td>
                <td class="text-right font-mono-num text-xs">${Number(it.qty_awal || 0)} ${S().esc(it.satuan_dasar || 'unit')}</td>
                <td class="text-right font-mono-num text-xs font-bold">${S().rp(Number(it.qty_awal || 0) * Number(it.hpp_beli || 0))}</td>
              </tr>`).join('') : '<tr><td colspan="7" class="text-center py-6 text-xs">Data tidak ditemukan.</td></tr>'}
            </tbody>
          </table>` : `<table class="ons-table">
            <thead><tr><th>No.</th><th>Tanggal</th><th>No. Faktur</th><th>Supplier</th><th>Produk</th><th class="text-right">Total Konsinyasi Masuk</th><th>Actions</th></tr></thead>
            <tbody>
              ${masukRows.length ? masukRows.map((r, idx) => `<tr>
                <td class="font-mono-num text-xs">${idx + 1}</td>
                <td class="font-mono-num text-xs">${S().esc(r.tanggal || '-')}</td>
                <td class="font-mono-num text-xs font-bold">${S().esc(r.no_faktur_pbf)}</td>
                <td class="text-xs font-semibold">${S().esc(r.id_pbf)}</td>
                <td class="text-xs">${S().esc(r.produk_label)} <span class="text-[11px]" style="color:var(--ons-text-soft)">(${r.qty_total} unit)</span></td>
                <td class="text-right font-mono-num text-xs font-bold">${S().rp(r.total_masuk)}</td>
                <td>
                  <div class="flex flex-wrap gap-1.5">
                    <button type="button" onclick="window.openKonsinyasiMasukDetail('${S().esc(r.key)}')" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2">Detail</button>
                    ${r.tagihan_belum_bayar > 0 ? `<button type="button" onclick="window.openSettleKonsinyasiModal('${S().esc(r.id_pbf)}')" class="ons-btn ons-btn-emerald text-[11px] py-1 px-2">Settle</button>` : ''}
                  </div>
                </td>
              </tr>`).join('') : '<tr><td colspan="7" class="text-center py-6 text-xs">Data tidak ditemukan. Klik <b>+ Input Konsinyasi</b> untuk mencatat barang titip jual masuk.</td></tr>'}
            </tbody>
          </table>`}
        </div>
        <div class="p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 text-xs" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
          <div class="font-bold text-blue-600">Akumulasi Konsinyasi Masuk${(konsDateFrom || konsDateTo) ? ` (${S().esc(konsDateFrom || '...')} s.d. ${S().esc(konsDateTo || '...')})` : ''}</div>
          <div class="flex flex-wrap gap-6">
            <div>Total Keseluruhan : <b class="font-mono-num text-sm">${S().rp(totalKeseluruhan)}</b></div>
            <div>Jumlah Konsinyasi Masuk : <b class="font-mono-num text-sm">${jumlahTx} transaksi</b></div>
          </div>
        </div>
      </div>`;
    } else if (konsSubTab === 'retur') {
      const rawReturs = _getKonsinyasiReturRows(st, allItems);
      const returRows = rawReturs.filter((r) => {
        if (!_konsMatchDate(r.tanggal)) return false;
        if (qLower) {
          const hay = `${r.no_faktur_pbf} ${r.id_pbf} ${r.nama_dagang} ${r.no_batch}`.toLowerCase();
          if (!hay.includes(qLower)) return false;
        }
        return true;
      });
      const totalNilaiRetur = returRows.reduce((s, r) => s + Number(r.total_retur || 0), 0);

      bodyHtml = `<div class="space-y-3">
        ${!konsReturBannerDismissed ? `<div class="p-3 rounded-xl border border-emerald-500/35 bg-emerald-500/10 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div class="flex flex-wrap items-center gap-2">
            <span class="font-bold text-emerald-700 dark:text-emerald-300">&#10003; Lakukan Retur Produk Konsinyasi di halaman Status Konsinyasi</span>
            <button type="button" onclick="window.setKonsSubTab('status')" class="ons-btn ons-btn-emerald text-[11px] py-1 px-2.5 font-bold">Status Konsinyasi</button>
          </div>
          <button type="button" onclick="window.dismissKonsReturBanner()" class="text-sm px-1.5 opacity-70 hover:opacity-100">&times;</button>
        </div>` : ''}
        <div class="ons-card p-4 space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h3 class="font-bold text-sm">Retur Konsinyasi</h3>
            <div class="flex flex-wrap items-center gap-2">
              <input class="ons-input text-xs w-48" placeholder="Cari data retur..." value="${S().esc(konsSearchQ)}" oninput="window.setKonsSearchQ(this.value)"/>
              <input type="date" class="ons-input text-xs w-36" value="${S().esc(konsDateFrom)}" onchange="window.setKonsDateRange(this.value, '${S().esc(konsDateTo)}')"/>
              <input type="date" class="ons-input text-xs w-36" value="${S().esc(konsDateTo)}" onchange="window.setKonsDateRange('${S().esc(konsDateFrom)}', this.value)"/>
              <button type="button" onclick="window.exportKonsinyasiData('retur')" class="ons-btn ons-btn-ghost text-xs">Excel</button>
            </div>
          </div>
          <div class="ons-table-wrap">
            <table class="ons-table">
              <thead><tr><th>No.</th><th>Tanggal</th><th>No. Faktur</th><th>Supplier</th><th>Produk</th><th class="text-right">Total Retur</th><th>Actions</th></tr></thead>
              <tbody>
                ${returRows.length ? returRows.map((r, idx) => `<tr>
                  <td class="font-mono-num text-xs">${idx + 1}</td>
                  <td class="font-mono-num text-xs">${S().esc(r.tanggal || '-')}</td>
                  <td class="font-mono-num text-xs font-bold">${S().esc(r.no_faktur_pbf)}</td>
                  <td class="text-xs font-semibold">${S().esc(r.id_pbf)}</td>
                  <td class="text-xs"><div class="font-bold">${S().esc(r.nama_dagang)}</div><div class="font-mono-num text-[11px]" style="color:var(--ons-text-soft)">Batch ${S().esc(r.no_batch)} &bull; ${r.qty_retur} ${S().esc(r.satuan)}</div></td>
                  <td class="text-right font-mono-num text-xs font-bold text-amber-600">${S().rp(r.total_retur)}</td>
                  <td><button type="button" onclick="window.printKonsinyasiReturBukti('${S().esc(r.id_mutasi)}')" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2">Cetak Bukti</button></td>
                </tr>`).join('') : '<tr><td colspan="7" class="text-center py-6 text-xs">Data tidak ditemukan. Gunakan tombol <b>Tarik Tak Laku</b> di tab <b>Status Konsinyasi</b> untuk mencatat retur ke supplier.</td></tr>'}
              </tbody>
            </table>
          </div>
          <div class="p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 text-xs" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
            <div class="font-bold text-blue-600">Ringkasan Retur Konsinyasi</div>
            <div class="flex flex-wrap gap-6">
              <div>Jumlah Transaksi : <b class="font-mono-num text-sm">${returRows.length} transaksi</b></div>
              <div>Total Nilai Retur : <b class="font-mono-num text-sm text-amber-600">${S().rp(totalNilaiRetur)}</b></div>
            </div>
          </div>
        </div>
      </div>`;
    } else if (konsSubTab === 'stok') {
      const stokRows = filteredItems.filter((it) => {
        if (Number(it.qty_sisa || 0) <= 0) return false;
        if (!_konsMatchDate(it.tgl_kadaluarsa || it.tgl_terima || new Date().toISOString().slice(0, 10))) return false;
        return true;
      });
      const totalQtyStok = stokRows.reduce((s, it) => s + Number(it.qty_sisa || 0), 0);
      const totalValStok = stokRows.reduce((s, it) => s + (Number(it.qty_sisa || 0) * Number(it.hpp_beli || 0)), 0);

      bodyHtml = `<div class="ons-card p-4 space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h3 class="font-bold text-sm">Stok Konsinyasi</h3>
          <div class="flex flex-wrap items-center gap-2">
            <input class="ons-input text-xs w-48" placeholder="Cari produk / batch..." value="${S().esc(konsSearchQ)}" oninput="window.setKonsSearchQ(this.value)"/>
            <select class="ons-select text-xs w-48" onchange="window.setKonsinyasiSupplierFilter(this.value)">
              <option value="">Semua Supplier (${suppliers.length})</option>
              ${suppliers.map((sup) => `<option value="${S().esc(sup)}" ${fakturKonsinyasiPbfFilter === sup ? 'selected' : ''}>${S().esc(sup)}</option>`).join('')}
            </select>
            <input type="date" class="ons-input text-xs w-36" title="ED dari" value="${S().esc(konsDateFrom)}" onchange="window.setKonsDateRange(this.value, '${S().esc(konsDateTo)}')"/>
            <input type="date" class="ons-input text-xs w-36" title="ED sampai" value="${S().esc(konsDateTo)}" onchange="window.setKonsDateRange('${S().esc(konsDateFrom)}', this.value)"/>
            <button type="button" onclick="window.exportKonsinyasiData('stok')" class="ons-btn ons-btn-ghost text-xs">Excel</button>
          </div>
        </div>
        <div class="ons-table-wrap">
          <table class="ons-table">
            <thead><tr><th>No.</th><th>Nama Produk</th><th>Batch &amp; ED</th><th>No. Faktur</th><th>Supplier / Penitip</th><th class="text-right">Kuantitas</th></tr></thead>
            <tbody>
              ${stokRows.length ? stokRows.map((it, idx) => `<tr>
                <td class="font-mono-num text-xs">${idx + 1}</td>
                <td class="text-xs font-bold">${S().esc(it.nama_dagang)}</td>
                <td class="font-mono-num text-xs">${S().esc(it.no_batch)} &bull; ED ${S().esc(String(it.tgl_kadaluarsa || '').slice(0, 10))}</td>
                <td class="font-mono-num text-xs">${S().esc(it.no_faktur_pbf || '-')}</td>
                <td class="text-xs font-semibold">${S().esc(it.id_pbf)}</td>
                <td class="text-right font-mono-num text-xs font-bold">${Number(it.qty_sisa || 0)} ${S().esc(it.satuan_dasar || 'unit')}</td>
              </tr>`).join('') : '<tr><td colspan="6" class="text-center py-6 text-xs">Data tidak ditemukan.</td></tr>'}
            </tbody>
          </table>
        </div>
        <div class="p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 text-xs" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
          <div class="font-bold text-blue-600">Ringkasan Stok Konsinyasi Aktif</div>
          <div class="flex flex-wrap gap-6">
            <div>Total Kuantitas Sisa : <b class="font-mono-num text-sm">${totalQtyStok} unit (${stokRows.length} batch)</b></div>
            <div>Nilai Persediaan Titipan : <b class="font-mono-num text-sm">${S().rp(totalValStok)}</b></div>
          </div>
        </div>
      </div>`;
    } else {
      // Default: 'status' (Status Konsinyasi) - preserves DEMO-B-KNS & Tarik Tak Laku immediately
      const penitipMap = new Map();
      filteredItems.forEach((it) => {
        const key = it.id_pbf || 'Supplier Konsinyasi';
        if (!penitipMap.has(key)) penitipMap.set(key, { id_pbf: key, sisa_qty: 0, terjual_qty: 0, belum_disetor: 0 });
        const p = penitipMap.get(key);
        p.sisa_qty += Number(it.qty_sisa || 0);
        p.terjual_qty += Number(it.qty_terjual || 0);
        p.belum_disetor += Number(it.tagihan_belum_bayar || 0);
      });
      const penitipRows = Array.from(penitipMap.values());

      bodyHtml = `<div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div class="ons-card p-4"><div class="text-xs" style="color:var(--ons-text-soft)">Unit Laku Terjual</div><div class="text-xl font-extrabold font-mono-num text-blue-600">${filteredTerjual} Unit</div></div>
        <div class="ons-card p-4"><div class="text-xs" style="color:var(--ons-text-soft)">Unit Sisa Titipan (Gudang)</div><div class="text-xl font-extrabold font-mono-num">${filteredSisa} Unit</div></div>
        <div class="ons-card p-4"><div class="text-xs" style="color:var(--ons-text-soft)">Tagihan Belum Disettle</div><div class="text-xl font-extrabold font-mono-num ${filteredTagihan > 0 ? 'text-red-600' : 'text-emerald-600'}">${S().rp(filteredTagihan)}</div></div>
        <div class="ons-card p-4"><div class="text-xs" style="color:var(--ons-text-soft)">Sudah Dibayar (Settle)</div><div class="text-xl font-extrabold font-mono-num text-emerald-600">${S().rp(filteredDibayar)}</div></div>
      </div>

      <div class="ons-card p-4 space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex flex-wrap items-center gap-2">
            <input class="ons-input text-xs w-48" placeholder="Cari data..." value="${S().esc(konsSearchQ)}" oninput="window.setKonsSearchQ(this.value)"/>
            <select class="ons-select text-xs w-56" onchange="window.setKonsinyasiSupplierFilter(this.value)">
              <option value="">Semua Supplier Konsinyasi (${suppliers.length})</option>
              ${suppliers.map((sup) => `<option value="${S().esc(sup)}" ${fakturKonsinyasiPbfFilter === sup ? 'selected' : ''}>${S().esc(sup)}</option>`).join('')}
            </select>
            <button type="button" onclick="window.exportKonsinyasiData('status')" class="ons-btn ons-btn-ghost text-xs">Excel</button>
          </div>
          ${filteredTagihan > 0 ? `<button type="button" onclick="window.openSettleKonsinyasiModal('${S().esc(fakturKonsinyasiPbfFilter || (filteredItems.find((x) => x.qty_belum_bayar > 0) || {}).id_pbf || '')}')" class="ons-btn ons-btn-emerald text-xs font-bold">Lunasi / Settle Terjual (${S().rp(filteredTagihan)})</button>` : ''}
        </div>
        <div class="ons-table-wrap">
          <table class="ons-table">
            <thead><tr><th>No.</th><th>Penitip</th><th class="text-right">Sisa Produk</th><th class="text-right">Terjual</th><th class="text-right">Belum Disetor</th><th>Actions</th></tr></thead>
            <tbody>
              ${penitipRows.length ? penitipRows.map((p, idx) => `<tr>
                <td class="font-mono-num text-xs">${idx + 1}</td>
                <td class="text-xs font-bold">${S().esc(p.id_pbf)}</td>
                <td class="text-right font-mono-num text-xs">${p.sisa_qty} unit</td>
                <td class="text-right font-mono-num text-xs text-blue-600">${p.terjual_qty} unit</td>
                <td class="text-right font-mono-num text-xs font-bold ${p.belum_disetor > 0 ? 'text-red-600' : 'text-emerald-600'}">${S().rp(p.belum_disetor)}</td>
                <td>
                  <div class="flex flex-wrap gap-1.5">
                    <button type="button" onclick="window.setKonsinyasiSupplierFilter('${S().esc(fakturKonsinyasiPbfFilter === p.id_pbf ? '' : p.id_pbf)}')" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2">${fakturKonsinyasiPbfFilter === p.id_pbf ? 'Semua' : 'Filter'}</button>
                    ${p.belum_disetor > 0 ? `<button type="button" onclick="window.openSettleKonsinyasiModal('${S().esc(p.id_pbf)}')" class="ons-btn ons-btn-emerald text-[11px] py-1 px-2">Settle</button>` : ''}
                  </div>
                </td>
              </tr>`).join('') : '<tr><td colspan="6" class="text-center py-4 text-xs">Data tidak ditemukan.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>

      <div class="ons-card p-4 space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="font-bold text-sm">Rincian Batch Konsinyasi &amp; Retur Tak Laku</h3>
          <span class="text-[11px]" style="color:var(--ons-text-soft)">Klik <b>Tarik Tak Laku</b> untuk retur barang ke supplier</span>
        </div>
        <div class="ons-table-wrap">
          <table class="ons-table">
            <thead><tr><th>Obat &amp; Batch / ED</th><th>Supplier PBF &amp; Faktur</th><th class="text-right">Masuk / Laku / Retur / Sisa</th><th class="text-right">HPP &amp; Belum Settle</th><th>Aksi</th></tr></thead>
            <tbody>
              ${filteredItems.length ? filteredItems.map((it) => `<tr>
                <td class="text-xs"><div class="font-bold">${S().esc(it.nama_dagang)}</div><div class="font-mono-num text-[11px]" style="color:var(--ons-text-soft)">${S().esc(it.no_batch)} &bull; ED ${S().esc(String(it.tgl_kadaluarsa || '').slice(0, 10))}</div></td>
                <td class="text-xs"><div class="font-semibold">${S().esc(it.id_pbf)}</div><div class="font-mono-num text-[11px]" style="color:var(--ons-text-soft)">${S().esc(it.no_faktur_pbf || '-')}</div></td>
                <td class="text-right font-mono-num text-xs">Awal <b>${it.qty_awal}</b> &bull; Laku <b class="text-blue-600">${it.qty_terjual}</b> &bull; Retur <b class="text-amber-600">${it.qty_retur_supplier}</b><br/>Sisa Titipan: <b>${it.qty_sisa} ${S().esc(it.satuan_dasar)}</b></td>
                <td class="text-right font-mono-num text-xs"><div>HPP: ${S().rp(it.hpp_beli)}</div><div class="font-bold ${it.qty_belum_bayar > 0 ? 'text-red-600' : 'text-emerald-600'}">${it.qty_belum_bayar} unit (${S().rp(it.tagihan_belum_bayar)})</div></td>
                <td>
                  <div class="flex flex-wrap gap-1.5">
                    ${it.qty_belum_bayar > 0 ? `<button type="button" onclick="window.openSettleKonsinyasiModal('${S().esc(it.id_pbf)}', '${S().esc(it.id_batch)}')" class="ons-btn ons-btn-emerald text-[11px] py-1 px-2">Settle</button>` : ''}
                    ${it.qty_sisa > 0 ? `<button type="button" onclick="window.openReturnKonsinyasiModal('${S().esc(it.id_batch)}', '${S().esc(it.nama_dagang)}', ${Number(it.qty_sisa || 0)})" class="ons-btn ons-btn-amber text-[11px] py-1 px-2">Tarik Tak Laku</button>` : '<span class="text-[11px]" style="color:var(--ons-text-soft)">Kosong</span>'}
                  </div>
                </td>
              </tr>`).join('') : '<tr><td colspan="5" class="text-center py-6 text-xs">Belum ada batch titip jual (konsinyasi). Gunakan <b>+ Input Konsinyasi</b> di atas untuk menerima faktur titip jual dengan Rp 0 hutang awal.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>

      <div class="ons-card p-4 space-y-2.5">
        <h3 class="font-bold text-sm">Riwayat Settlement Konsinyasi (${settlements.length})</h3>
        <div class="ons-table-wrap">
          <table class="ons-table">
            <thead><tr><th>No. Settlement</th><th>Tanggal</th><th>Supplier PBF</th><th class="text-right">Qty Laku</th><th class="text-right">Nominal Dibayar</th><th>Metode</th><th>Status</th></tr></thead>
            <tbody>
              ${settlements.length ? settlements.map((sr) => `<tr>
                <td class="font-mono-num text-xs font-bold">${S().esc(sr.no_settlement)}</td>
                <td class="font-mono-num text-xs">${S().esc(String(sr.tanggal || '').slice(0, 10))}</td>
                <td class="text-xs font-semibold">${S().esc(sr.id_pbf)}</td>
                <td class="text-right font-mono-num text-xs">${Number(sr.total_qty_terjual || 0)} unit</td>
                <td class="text-right font-mono-num text-xs font-bold text-emerald-600">${S().rp(sr.total_nilai_hpp || 0)}</td>
                <td class="text-xs">${S().esc(sr.metode_bayar || 'TRANSFER_BANK')}</td>
                <td><span class="badge-bpom bpom-bebas">${S().esc(sr.status_settlement || 'LUNAS')}</span></td>
              </tr>`).join('') : '<tr><td colspan="7" class="text-center py-4 text-xs">Belum ada riwayat settlement konsinyasi.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>

      <div class="ons-card p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs" style="background:var(--ons-bg-subtle)">
        <div class="font-bold text-blue-600">Status Konsinyasi per ${S().esc(new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }))}</div>
        <div class="flex flex-wrap gap-6">
          <div>Total nilai barang konsinyasi : <b class="font-mono-num text-sm">${S().rp(totalNilaiBarang)}</b></div>
          <div>Total hutang konsinyasi : <b class="font-mono-num text-sm ${filteredTagihan > 0 ? 'text-red-600' : 'text-emerald-600'}">${S().rp(filteredTagihan)}</b></div>
        </div>
      </div>`;
    }

    return `<div class="space-y-4">
      ${subNavHtml}
      ${bodyHtml}
    </div>`;
  }

  global.submitGrnFaktur = async () => {
    try {
      ensureGrnInitialized();
      if (!grnHeader.no_faktur_pbf.trim()) throw new Error('No. Faktur PBF wajib diisi.');
      if (!grnItems.length) throw new Error('Minimal harus ada 1 baris item obat.');
      for (let i = 0; i < grnItems.length; i++) {
        const it = grnItems[i];
        if (!String(it.no_batch || '').trim()) throw new Error('No. Batch pada baris #' + (i + 1) + ' wajib diisi (aturan CDOB).');
        if (!String(it.tgl_kadaluarsa || '').trim()) throw new Error('Tanggal Kadaluarsa (ED) pada baris #' + (i + 1) + ' wajib diisi.');
        if (Number(it.qty_dasar || 0) <= 0) throw new Error('Qty Dasar pada baris #' + (i + 1) + ' harus lebih dari 0.');
        if (Number(it.hpp_unit || 0) < 0) throw new Error('HPP / Unit pada baris #' + (i + 1) + ' tidak valid.');
      }
      const totalBruto = grnItems.reduce((s, it) => s + Math.max(0, (Number(it.qty_dasar || 0) * Number(it.hpp_unit || 0)) - Number(it.diskon_item || 0)), 0);
      const diskonTotal = grnHeader.diskon_mode === 'PCT'
        ? Math.round(totalBruto * Math.min(100, Math.max(0, Number(grnHeader.diskon_pct || 0))) / 100)
        : Math.max(0, Number(grnHeader.diskon_pbf || 0));
      const netto = Math.max(
        0,
        totalBruto - diskonTotal + Number(grnHeader.ppn_masukan || 0) - Number(grnHeader.cashback || 0) + Number(grnHeader.biaya_lainnya || 0)
      );
      const jenisPenerimaan = grnHeader.jenis_penerimaan || 'BELI_PUTUS';
      const stUser = (S().AppState && S().AppState.user && S().AppState.user.nama) || 'APJ / Pemilik';
      const res = await API().callApi('pengadaan.fakturSave', {
        id_sp: grnHeader.id_sp || '',
        sp_status: grnHeader.id_sp ? (grnHeader.sp_status || 'SELESAI_DITERIMA') : '',
        no_faktur_pbf: grnHeader.no_faktur_pbf.trim(),
        no_sp: grnHeader.no_sp,
        id_pbf: grnHeader.id_pbf,
        tgl_faktur: grnHeader.tgl_faktur || new Date().toISOString().slice(0, 10),
        tgl_terima: grnHeader.tgl_terima || new Date().toISOString().slice(0, 10),
        tgl_jatuh_tempo: grnHeader.tgl_jatuh_tempo,
        gudang: grnHeader.gudang || 'Gudang Utama',
        petugas: stUser,
        total_bruto: totalBruto,
        diskon_pbf: diskonTotal,
        ppn_masukan: Number(grnHeader.ppn_masukan || 0),
        cashback: Number(grnHeader.cashback || 0),
        biaya_lainnya: Number(grnHeader.biaya_lainnya || 0),
        netto_hutang: jenisPenerimaan === 'KONSINYASI' ? 0 : netto,
        jenis_penerimaan: jenisPenerimaan,
        status_bayar: jenisPenerimaan === 'KONSINYASI' ? 'KONSINYASI' : (grnHeader.status_bayar || 'BELUM_LUNAS'),
        catatan: grnHeader.catatan || '',
        items: grnItems.map((it) => {
          const q = Math.max(1, Number(it.qty_dasar || 1));
          const netRowUnit = Math.max(0, Number(it.hpp_unit || 0) - (Number(it.diskon_item || 0) / q));
          return {
            id_obat: it.id_obat,
            no_batch: String(it.no_batch || '').trim(),
            tgl_kadaluarsa: it.tgl_kadaluarsa,
            qty_dasar: q,
            hpp_unit: Math.round(netRowUnit)
          };
        })
      }, { isWrite: true });
      if (grnActiveDraftId) {
        _writeLocalList(FAKTUR_DRAFTS_KEY, _readLocalList(FAKTUR_DRAFTS_KEY).filter((x) => x.id_draft !== grnActiveDraftId));
        _writeLocalList(KONSINYASI_DRAFTS_KEY, _readLocalList(KONSINYASI_DRAFTS_KEY).filter((x) => x.id_draft !== grnActiveDraftId));
        grnActiveDraftId = '';
      }
      grnHeader.id_sp = '';
      grnHeader.no_faktur_pbf = '';
      grnHeader.no_sp = '';
      grnHeader.sp_status = '';
      grnHeader.diskon_mode = 'RP';
      grnHeader.diskon_pct = 0;
      grnHeader.diskon_pbf = 0;
      grnHeader.ppn_masukan = 0;
      grnHeader.cashback = 0;
      grnHeader.biaya_lainnya = 0;
      grnHeader.jenis_penerimaan = 'BELI_PUTUS';
      grnHeader.status_bayar = 'BELUM_LUNAS';
      grnHeader.catatan = '';
      grnItems = [];
      grnScanState.panelOpen = false;
      grnScanState.rawText = '';
      grnScanState.summary = null;
      grnScanState.previewDataUrl = '';
      grnScanState.processedDataUrl = '';
      grnScanState.statusText = '';
      if (res && Array.isArray(res.hpp_alerts) && res.hpp_alerts.length) {
        S().AppState._lastHppAlerts = res.hpp_alerts;
        const listTxt = res.hpp_alerts.map((a) => `${a.nama_dagang} (HPP naik +${a.pct_naik !== undefined ? a.pct_naik : a.pct_up}% -> ${S().rp(a.new_hpp)})`).join(', ');
        global.toast('Faktur masuk gudang! HPP NAIK TERDETEKSI: ' + listTxt + ' — Mengalihkan ke Analisa Harga & Margin.', 'warn');
        window.setFakturTab('harga');
      } else if (jenisPenerimaan === 'KONSINYASI') {
        S().AppState._lastHppAlerts = [];
        global.toast('Stok konsinyasi masuk ke gudang FEFO (Rp 0 hutang AP awal)!', 'ok');
        window.setFakturTab('konsinyasi');
      } else {
        S().AppState._lastHppAlerts = [];
        global.toast('Faktur Multi-Item & semua batch FEFO berhasil masuk ke gudang!', 'ok');
        window.setFakturTab('daftar');
      }
      await global.bootLoadState(true);
    } catch (e) { global.toast(e.message, 'err'); }
  };

  global.openInputFakturModal = () => {
    if (S().AppState.activeView === 'faktur') {
      window.setFakturTab('input');
    } else {
      global.navigateView('faktur', 'input');
    }
  };

  global.openFakturDetailModal = (idOrNo) => {
    const st = S().AppState;
    const f = (st.fakturPbf || []).find((x) => x.id_faktur === idOrNo || x.no_faktur_pbf === idOrNo);
    if (!f) return global.toast('Data faktur tidak ditemukan.', 'warn');
    const isKons = String(f.status_bayar || '').toUpperCase() === 'KONSINYASI' || String(f.jenis_penerimaan || '').toUpperCase() === 'KONSINYASI';
    const dTempo = f.tgl_jatuh_tempo ? S().daysUntil(f.tgl_jatuh_tempo) : 999;
    const linkedSp = f.no_sp ? (st.suratPesanan || []).find((sp) => sp.no_sp === f.no_sp || sp.id_sp === f.id_sp) : null;
    const linkedBatches = (st.stokBatch || []).filter((b) => (f.id_faktur && b.id_faktur === f.id_faktur) || (b.no_faktur_pbf && b.no_faktur_pbf === f.no_faktur_pbf));
    const bruto = Number(f.total_bruto || f.netto_hutang || 0);
    const diskon = Number(f.diskon_pbf || 0);
    const ppn = Number(f.ppn_masukan || 0);
    const netto = Number(f.netto_hutang || 0);
    const sisa = Number(f.sisa_hutang || 0);
    const terbayar = isKons ? 0 : Math.max(0, netto - sisa);

    S().openModal(`
      <div class="p-5 sm:p-6 space-y-4">
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="text-[11px] font-bold uppercase tracking-wider text-blue-600">Detail Faktur Pembelian PBF</div>
            <h3 class="text-lg font-extrabold font-mono-num mt-0.5">${S().esc(f.no_faktur_pbf)}</h3>
            <div class="text-xs mt-0.5" style="color:var(--ons-text-soft)">${S().esc(f.id_pbf)} &bull; SP: <span class="font-mono-num font-semibold">${S().esc(f.no_sp || 'Pembelian Langsung (Tanpa SP)')}</span></div>
          </div>
          <button type="button" onclick="window.ONSStore.closeModal()" class="ons-btn ons-btn-ghost text-sm px-2.5 py-1">&times;</button>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
          <div class="p-2.5 rounded-xl border" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)"><div class="text-[10px]" style="color:var(--ons-text-soft)">Jenis &amp; Status</div><div class="font-bold mt-0.5">${isKons ? 'KONSINYASI' : S().esc(f.status_bayar || 'BELUM_LUNAS')}</div></div>
          <div class="p-2.5 rounded-xl border" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)"><div class="text-[10px]" style="color:var(--ons-text-soft)">Tanggal Faktur</div><div class="font-bold font-mono-num mt-0.5">${S().esc(String(f.tgl_faktur || f.created_at || '-').slice(0, 10))}</div></div>
          <div class="p-2.5 rounded-xl border" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)"><div class="text-[10px]" style="color:var(--ons-text-soft)">Jatuh Tempo</div><div class="font-bold font-mono-num mt-0.5 ${!isKons && sisa > 0 && dTempo <= 7 ? 'text-amber-600' : ''}">${S().esc(f.tgl_jatuh_tempo || '-')}${!isKons && sisa > 0 && dTempo <= 7 ? (dTempo < 0 ? ` (Lewat ${Math.abs(dTempo)}h)` : ` (H-${dTempo})`) : ''}</div></div>
        </div>

        <div class="p-3.5 rounded-xl border space-y-1.5 text-xs" style="border-color:var(--ons-border)">
          <div class="flex justify-between"><span>Total Bruto</span><span class="font-mono-num font-semibold">${S().rp(bruto)}</span></div>
          <div class="flex justify-between"><span>Diskon Faktur PBF</span><span class="font-mono-num text-emerald-600">- ${S().rp(diskon)}</span></div>
          <div class="flex justify-between"><span>PPN Masukan</span><span class="font-mono-num">+ ${S().rp(ppn)}</span></div>
          <div class="flex justify-between pt-1.5 border-t font-bold" style="border-color:var(--ons-border)"><span>Netto Tagihan Faktur</span><span class="font-mono-num">${isKons ? 'Titip Jual (Rp 0 Hutang Awal)' : S().rp(netto)}</span></div>
          ${!isKons ? `
            <div class="flex justify-between"><span>Sudah Dibayar / Retur</span><span class="font-mono-num text-emerald-600">${S().rp(terbayar)}</span></div>
            <div class="flex justify-between text-sm font-extrabold pt-1 border-t" style="border-color:var(--ons-border)"><span>Sisa Hutang</span><span class="font-mono-num ${sisa > 0 ? 'text-red-600' : 'text-emerald-600'}">${S().rp(sisa)}</span></div>
          ` : ''}
        </div>

        ${linkedBatches.length ? `
          <div class="space-y-1.5">
            <div class="text-xs font-bold">Batch Stok Terkait Faktur (${linkedBatches.length})</div>
            <div class="max-h-40 overflow-y-auto border rounded-xl divide-y text-xs" style="border-color:var(--ons-border)">
              ${linkedBatches.map((b) => {
                const ob = (st.masterObat || []).find((m) => m.id_obat === b.id_obat);
                return `<div class="p-2 flex items-center justify-between gap-2"><div><b>${S().esc(ob ? ob.nama_dagang : b.id_obat)}</b> <span class="font-mono-num text-[11px]" style="color:var(--ons-text-soft)">${S().esc(b.no_batch)} &bull; ED ${S().esc(b.tgl_kadaluarsa)}</span></div><span class="font-mono-num font-bold">Sisa ${b.qty_sisa}/${b.qty_awal}</span></div>`;
              }).join('')}
            </div>
          </div>
        ` : ''}

        <div class="flex flex-wrap justify-end gap-2 pt-2 border-t" style="border-color:var(--ons-border)">
          ${linkedSp ? `<button type="button" onclick="window.ONSStore.closeModal();window.openSpA4PreviewModal('${S().esc(linkedSp.id_sp)}')" class="ons-btn ons-btn-ghost text-xs">Lihat SP A4</button>` : ''}
          ${isKons ? `<button type="button" onclick="window.ONSStore.closeModal();window.setFakturTab('konsinyasi')" class="ons-btn ons-btn-primary text-xs">Kelola Settlement Konsinyasi</button>` : (sisa > 0 ? `<button type="button" onclick="window.ONSStore.closeModal();window.navigateView('finance','hutang')" class="ons-btn ons-btn-emerald text-xs">Bayar / Cicil di Hutang PBF</button>` : '')}
          <button type="button" onclick="window.ONSStore.closeModal()" class="ons-btn ons-btn-ghost text-xs">Tutup</button>
        </div>
      </div>
    `, { mode: 'spotlight', maxWidth: '600px' });
  };

  global.openReturBarModal = (idBatch) => {
    const st = S().AppState;
    const b = (st.stokBatch || []).find((x) => x.id_batch === idBatch);
    if (!b) return global.toast('Batch tidak ditemukan.', 'warn');
    const ob = (st.masterObat || []).find((m) => m.id_obat === b.id_obat);
    const hpp = Number(b.hpp_beli || (ob && (ob.hpp_terakhir || ob.hpp_avg)) || 0);
    const dLeft = S().daysUntil(b.tgl_kadaluarsa);
    const defaultReason = dLeft <= 180 ? 'Retur Batch ED Dekat' : 'Kemasan Rusak / Pecah';

    S().openModal(`
      <div class="p-5 sm:p-6 space-y-4">
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="text-[11px] font-bold uppercase tracking-wider text-amber-600">Konfirmasi Retur Distributor (BAR-PBF)</div>
            <h3 class="text-base font-extrabold mt-0.5">${S().esc(ob ? ob.nama_dagang : b.id_obat)}</h3>
            <div class="text-xs font-mono-num" style="color:var(--ons-text-soft)">Batch ${S().esc(b.no_batch)} &bull; ED ${S().esc(b.tgl_kadaluarsa)} (${dLeft}h) &bull; ${S().esc(b.id_pbf || '-')}</div>
          </div>
          <button type="button" onclick="window.ONSStore.closeModal()" class="ons-btn ons-btn-ghost text-sm px-2.5 py-1">&times;</button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label class="font-semibold block mb-1">Jumlah Retur (Maks ${b.qty_sisa})</label>
            <input id="returModalQtyInp" type="number" min="1" max="${b.qty_sisa}" value="${b.qty_sisa}" oninput="const v=Math.min(${b.qty_sisa},Math.max(1,Number(this.value||1)));document.getElementById('returModalEstCut').textContent=window.ONSStore.rp(v*${hpp});" class="ons-input font-mono-num"/>
          </div>
          <div>
            <label class="font-semibold block mb-1">Alasan Retur CDOB</label>
            <select id="returModalReasonSel" class="ons-select">
              <option value="Retur Batch ED Dekat" ${defaultReason === 'Retur Batch ED Dekat' ? 'selected' : ''}>Near-ED (&le;180 Hari) / Kadaluarsa</option>
              <option value="Kemasan Rusak / Pecah" ${defaultReason === 'Kemasan Rusak / Pecah' ? 'selected' : ''}>Kemasan Rusak / Pecah / Segel Cacat</option>
              <option value="Salah Kirim PBF">Salah Kirim Item / Varian PBF</option>
              <option value="Recall BPOM / Prinsipal">Recall BPOM / Penarikan Prinsipal</option>
            </select>
          </div>
        </div>

        <div class="p-3 rounded-xl border text-xs flex items-center justify-between" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
          <span>Estimasi Potong Hutang PBF (HPP ${S().rp(hpp)}/unit):</span>
          <b id="returModalEstCut" class="font-mono-num text-sm text-emerald-600">${S().rp(Number(b.qty_sisa || 0) * hpp)}</b>
        </div>

        <div class="flex justify-end gap-2 pt-2 border-t" style="border-color:var(--ons-border)">
          <button type="button" onclick="window.ONSStore.closeModal()" class="ons-btn ons-btn-ghost text-xs">Batal</button>
          <button type="button" onclick="window.submitReturBarModal('${S().esc(b.id_batch)}')" class="ons-btn ons-btn-amber text-xs font-bold">Konfirmasi Buat BAR-PBF &amp; Potong Stok</button>
        </div>
      </div>
    `, { mode: 'spotlight', maxWidth: '520px' });
  };

  global.submitReturBarModal = async (idBatch) => {
    const qtyEl = document.getElementById('returModalQtyInp');
    const reasonEl = document.getElementById('returModalReasonSel');
    const qty = Number(qtyEl ? qtyEl.value : 0);
    const alasan = reasonEl ? reasonEl.value : 'Retur Batch ED Dekat';
    if (!qty || qty <= 0) return global.toast('Qty retur harus lebih dari 0.', 'warn');
    S().closeModal();
    await window.prosesReturBar(idBatch, qty, alasan);
  };

  global.prosesReturBar = async (idBatch, qtyMax, alasan) => {
    try {
      const res = await API().callApi('pengadaan.returBar', {
        id_batch: idBatch,
        qty_retur: qtyMax,
        alasan: alasan || 'Retur Batch ED Dekat'
      }, { isWrite: true });
      global.toast('Retur BAR-PBF dicatat (' + res.qty_retur + ' unit). Potongan hutang: ' + S().rp(res.nilai_potong_hutang), 'ok');
      await global.bootLoadState(true);
    } catch (e) { global.toast(e.message, 'err'); }
  };

  let returFormState = {
    id_draft: '',
    supplier: '',
    gudang: 'Gudang Utama',
    tanggal: new Date().toISOString().slice(0, 10),
    no_bar: '',
    metode: 'POTONG_HUTANG',
    alasan: 'Retur Batch ED Dekat',
    catatan: '',
    items: []
  };

  function _renderCreateReturModalHtml() {
    const st = S().AppState;
    const prof = S().getStoreProfile();
    const pbfs = st.supplierPbf || [];
    if (!returFormState.supplier && pbfs[0]) returFormState.supplier = pbfs[0].nama_pbf;
    const activeBatches = (st.stokBatch || []).filter((b) => b.status_batch === 'AKTIF' && Number(b.qty_sisa || 0) > 0);
    const matchingBatches = activeBatches.filter((b) => !returFormState.supplier || !b.id_pbf || b.id_pbf === returFormState.supplier);
    const poolBatches = matchingBatches.length ? matchingBatches : activeBatches;
    const totalReturRp = (returFormState.items || []).reduce((s, it) => s + (Number(it.qty_retur || 0) * Number(it.harga_retur || 0)), 0);

    return `<div class="ons-ws-modal" data-ws-custom="1">
      <div class="ons-ws-header">
        <div>
          <h2 class="text-base sm:text-lg font-extrabold tracking-tight">Retur Pembelian (BAR-PBF)</h2>
          <p class="text-[11px]" style="color:var(--ons-text-soft)">Status PKP: <b>${S().esc(prof.status_pkp || 'NON_PKP')}</b> &bull; Otomatis potong stok batch FEFO, catat Kartu Stok &amp; sesuaikan Hutang PBF.</p>
        </div>
        <div class="flex items-center gap-2">
          <button type="button" onclick="window.saveReturDraftToLocal()" class="ons-btn ons-btn-ghost text-xs">Simpan Draft</button>
          <button type="button" onclick="window.ONSStore.closeModal()" class="ons-btn ons-btn-ghost text-xs">Tutup (Esc)</button>
        </div>
      </div>
      <div class="ons-ws-body space-y-4">
        <div class="ons-card p-3.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 text-xs">
          <div class="lg:col-span-2">
            <label class="text-[11px] font-bold block mb-1">Supplier *</label>
            <select class="ons-select text-xs" onchange="window.setReturFormField('supplier', this.value)">
              ${pbfs.map((p) => `<option value="${S().esc(p.nama_pbf)}" ${returFormState.supplier === p.nama_pbf ? 'selected' : ''}>${S().esc(p.nama_pbf)}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="text-[11px] font-bold block mb-1">Gudang Asal *</label>
            <select class="ons-select text-xs" onchange="window.setReturFormField('gudang', this.value)">
              ${['Gudang Utama', 'Etalase Depan', 'Gudang Karantina'].map((g) => `<option value="${g}" ${returFormState.gudang === g ? 'selected' : ''}>${g}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="text-[11px] font-bold block mb-1">Tanggal Retur</label>
            <input type="date" class="ons-input text-xs" value="${S().esc(returFormState.tanggal)}" onchange="window.setReturFormField('tanggal', this.value)"/>
          </div>
          <div>
            <label class="text-[11px] font-bold block mb-1">Kode Transaksi (No. BAR) *</label>
            <input id="returNoBarInp" class="ons-input font-mono-num text-xs" value="${S().esc(returFormState.no_bar)}" placeholder="Otomatis jika dikosongkan" oninput="window.setReturFormField('no_bar', this.value)"/>
          </div>
          <div>
            <label class="text-[11px] font-bold block mb-1">Metode Pengembalian *</label>
            <select class="ons-select text-xs" onchange="window.setReturFormField('metode', this.value)">
              <option value="POTONG_HUTANG" ${returFormState.metode === 'POTONG_HUTANG' ? 'selected' : ''}>Potong Hutang PBF</option>
              <option value="AKUN_KAS" ${returFormState.metode === 'AKUN_KAS' ? 'selected' : ''}>Akun Kas / Tunai</option>
              <option value="TUKAR_BARANG" ${returFormState.metode === 'TUKAR_BARANG' ? 'selected' : ''}>Tukar Barang</option>
            </select>
          </div>
          <div class="lg:col-span-3">
            <label class="text-[11px] font-bold block mb-1">Alasan Retur CDOB *</label>
            <select class="ons-select text-xs" onchange="window.setReturFormField('alasan', this.value)">
              ${['Retur Batch ED Dekat', 'Kemasan Rusak / Pecah', 'Salah Kirim PBF', 'Recall BPOM / Prinsipal'].map((al) => `<option value="${al}" ${returFormState.alasan === al ? 'selected' : ''}>${al}</option>`).join('')}
            </select>
          </div>
          <div class="lg:col-span-3">
            <label class="text-[11px] font-bold block mb-1">Catatan *</label>
            <input id="returCatatanInp" class="ons-input text-xs" value="${S().esc(returFormState.catatan)}" placeholder="Tuliskan keterangan/faktur asal retur..." oninput="window.setReturFormField('catatan', this.value)"/>
          </div>
        </div>

        <div class="ons-card p-4 space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="font-bold text-xs">Pilih Batch Stok Aktif untuk Diretur (${poolBatches.length} batch tersedia)</div>
            <div class="flex items-center gap-2">
              <select id="returAddBatchSel" class="ons-select text-xs w-72">
                ${poolBatches.map((b) => {
                  const ob = (st.masterObat || []).find((m) => m.id_obat === b.id_obat) || {};
                  return `<option value="${S().esc(b.id_batch)}">${S().esc(ob.nama_dagang || b.id_obat)} | ${S().esc(b.no_batch)} | ED ${S().esc(String(b.tgl_kadaluarsa || '').slice(0, 10))} (Sisa ${b.qty_sisa})</option>`;
                }).join('')}
              </select>
              <button type="button" onclick="window.addBatchToReturForm()" class="ons-btn ons-btn-primary text-xs">+ Tambah Produk</button>
            </div>
          </div>

          <div class="ons-table-wrap">
            <table class="ons-table">
              <thead><tr><th>No.</th><th>Produk</th><th>Expired Date</th><th>No. Batch</th><th>Kuantitas</th><th>Satuan</th><th class="text-right">Harga Pokok</th><th>Harga Retur</th><th class="text-right">Stok Gudang</th><th class="text-right">Sub Total</th><th></th></tr></thead>
              <tbody>
                ${returFormState.items.length ? returFormState.items.map((it, idx) => `<tr>
                  <td class="font-mono-num text-xs">${idx + 1}.</td>
                  <td class="text-xs font-bold">${S().esc(it.nama_dagang)}<div class="text-[10px] font-mono-num" style="color:var(--ons-text-soft)">Faktur Asal: ${S().esc(it.no_faktur_pbf || '-')}</div></td>
                  <td class="font-mono-num text-xs">${S().esc(String(it.tgl_kadaluarsa || '').slice(0, 10))}</td>
                  <td class="font-mono-num text-xs">${S().esc(it.no_batch)}</td>
                  <td><input type="number" min="1" max="${it.stok_gudang}" class="ons-input text-xs font-mono-num text-right w-20 py-1 min-h-0" value="${it.qty_retur}" onchange="window.updateReturFormItem(${idx}, 'qty_retur', Number(this.value||1))"/></td>
                  <td class="text-xs">${S().esc(it.satuan || 'Unit')}</td>
                  <td class="text-right font-mono-num text-xs">${S().rp(it.hpp)}</td>
                  <td><input type="number" min="0" class="ons-input text-xs font-mono-num text-right w-24 py-1 min-h-0" value="${it.harga_retur}" onchange="window.updateReturFormItem(${idx}, 'harga_retur', Number(this.value||0))"/></td>
                  <td class="text-right font-mono-num text-xs font-bold">${it.stok_gudang}</td>
                  <td class="text-right font-mono-num text-xs font-bold">${S().rp(Number(it.qty_retur || 0) * Number(it.harga_retur || 0))}</td>
                  <td><button type="button" onclick="window.removeReturFormItem(${idx})" class="text-xs text-red-600 font-bold px-1.5">&times;</button></td>
                </tr>`).join('') : '<tr><td colspan="11" class="text-center py-8 text-xs" style="color:var(--ons-text-soft)">Pilih batch stok di atas lalu klik <b>+ Tambah Produk</b>.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div class="ons-ws-footer flex flex-wrap items-center justify-between gap-2">
        <div class="text-xs font-extrabold text-blue-600 font-mono-num">TOTAL RETUR: ${S().rp(totalReturRp)}</div>
        <div class="flex flex-wrap gap-2">
          <button type="button" onclick="window.ONSStore.closeModal()" class="ons-btn ons-btn-ghost text-xs">Batal</button>
          <button type="button" onclick="window.saveReturDraftToLocal()" class="ons-btn ons-btn-ghost text-xs">Simpan Draft</button>
          <button type="button" onclick="window.submitCreateReturPembelian()" class="ons-btn ons-btn-primary text-xs font-bold">Simpan Retur BAR-PBF &rarr;</button>
        </div>
      </div>
    </div>`;
  }

  global.openCreateReturPembelianModal = (preBatchId) => {
    const st = S().AppState;
    const pbfs = st.supplierPbf || [];
    returFormState = {
      id_draft: '',
      supplier: (pbfs[0] && pbfs[0].nama_pbf) || '',
      gudang: 'Gudang Utama',
      tanggal: new Date().toISOString().slice(0, 10),
      no_bar: '',
      metode: 'POTONG_HUTANG',
      alasan: 'Retur Batch ED Dekat',
      catatan: 'Retur barang distributor PBF',
      items: []
    };
    if (preBatchId) {
      const b = (st.stokBatch || []).find((x) => x.id_batch === preBatchId);
      if (b) {
        const ob = (st.masterObat || []).find((m) => m.id_obat === b.id_obat) || {};
        if (b.id_pbf) returFormState.supplier = b.id_pbf;
        const hpp = Number(b.hpp_beli || ob.hpp_terakhir || ob.hpp_avg || 0);
        returFormState.items.push({
          id_batch: b.id_batch,
          nama_dagang: ob.nama_dagang || b.id_obat,
          tgl_kadaluarsa: b.tgl_kadaluarsa || '',
          no_batch: b.no_batch || '',
          no_faktur_pbf: b.no_faktur_pbf || '-',
          qty_retur: Math.max(1, Number(b.qty_sisa || 1)),
          satuan: ob.satuan_dasar || 'Unit',
          hpp,
          harga_retur: hpp,
          stok_gudang: Number(b.qty_sisa || 1)
        });
      }
    }
    S().openModal(_renderCreateReturModalHtml(), 'full');
  };

  global.setReturFormField = (k, v) => {
    returFormState[k] = v;
    if (!['no_bar', 'catatan'].includes(k)) S().openModal(_renderCreateReturModalHtml(), 'full');
  };

  global.addBatchToReturForm = () => {
    const sel = document.getElementById('returAddBatchSel');
    const idB = sel ? sel.value : '';
    const st = S().AppState;
    const b = (st.stokBatch || []).find((x) => x.id_batch === idB);
    if (!b) return global.toast('Pilih batch terlebih dahulu.', 'warn');
    if (returFormState.items.some((x) => x.id_batch === b.id_batch)) {
      return global.toast('Batch tersebut sudah ada dalam daftar retur.', 'info');
    }
    const ob = (st.masterObat || []).find((m) => m.id_obat === b.id_obat) || {};
    const hpp = Number(b.hpp_beli || ob.hpp_terakhir || ob.hpp_avg || 0);
    returFormState.items.push({
      id_batch: b.id_batch,
      nama_dagang: ob.nama_dagang || b.id_obat,
      tgl_kadaluarsa: b.tgl_kadaluarsa || '',
      no_batch: b.no_batch || '',
      no_faktur_pbf: b.no_faktur_pbf || '-',
      qty_retur: Math.max(1, Number(b.qty_sisa || 1)),
      satuan: ob.satuan_dasar || 'Unit',
      hpp,
      harga_retur: hpp,
      stok_gudang: Number(b.qty_sisa || 1)
    });
    S().openModal(_renderCreateReturModalHtml(), 'full');
  };

  global.updateReturFormItem = (idx, field, val) => {
    const it = returFormState.items[idx];
    if (!it) return;
    if (field === 'qty_retur') it.qty_retur = Math.min(it.stok_gudang, Math.max(1, Number(val || 1)));
    else if (field === 'harga_retur') it.harga_retur = Math.max(0, Number(val || 0));
    S().openModal(_renderCreateReturModalHtml(), 'full');
  };

  global.removeReturFormItem = (idx) => {
    returFormState.items.splice(idx, 1);
    S().openModal(_renderCreateReturModalHtml(), 'full');
  };

  global.openReturDraftModal = () => {
    const drafts = _readLocalList(RETUR_DRAFTS_KEY);
    S().openModal(`<div class="p-5 sm:p-6 space-y-4">
      <div class="flex items-center justify-between gap-2 bg-blue-600 text-white -m-5 sm:-m-6 mb-4 px-5 py-3.5 rounded-t-2xl">
        <h3 class="font-extrabold text-base">Draft Retur Pembelian (${drafts.length})</h3>
        <button type="button" onclick="window.ONSStore.closeModal()" class="text-white/90 text-lg px-2">&times;</button>
      </div>
      <div class="ons-table-wrap max-h-80">
        <table class="ons-table">
          <thead><tr><th>No.</th><th>Terakhir Disimpan</th><th>Supplier</th><th>Kode Retur</th><th>Produk</th><th class="text-right">Total</th><th>Action</th></tr></thead>
          <tbody>
            ${drafts.length ? drafts.map((d, idx) => {
              const tot = (d.items || []).reduce((s, it) => s + Number(it.qty_retur || 0) * Number(it.harga_retur || 0), 0);
              return `<tr>
                <td class="font-mono-num text-xs">${idx + 1}.</td>
                <td class="font-mono-num text-xs">${S().formatTgl(d.saved_at || '', true)}</td>
                <td class="text-xs font-bold">${S().esc(d.supplier || '-')}</td>
                <td class="font-mono-num text-xs">${S().esc(d.no_bar || '(Otomatis)')}</td>
                <td class="text-xs">${(d.items || []).length} batch</td>
                <td class="text-right font-mono-num text-xs font-bold">${S().rp(tot)}</td>
                <td>
                  <div class="flex gap-1.5">
                    <button type="button" onclick="window.loadReturDraftFromLocal('${S().esc(d.id_draft)}')" class="ons-btn ons-btn-primary text-[11px] py-1 px-2.5">Lanjutkan</button>
                    <button type="button" onclick="window.deleteReturDraftFromLocal('${S().esc(d.id_draft)}')" class="ons-btn ons-btn-danger text-[11px] py-1 px-2">Hapus</button>
                  </div>
                </td>
              </tr>`;
            }).join('') : '<tr><td colspan="7" class="text-center py-8 text-xs">Data tidak ditemukan.</td></tr>'}
          </tbody>
        </table>
      </div>
      <div class="flex flex-wrap items-center justify-between gap-3 pt-2 border-t text-xs" style="border-color:var(--ons-border)">
        <div class="p-2.5 rounded-xl border bg-amber-500/10 border-amber-500/30 flex-1">Draft ini hanya tersimpan di perangkat &amp; browser ini. Klik <b>Lanjutkan</b> untuk memproses BAR-PBF.</div>
        <button type="button" onclick="window.ONSStore.closeModal()" class="ons-btn ons-btn-ghost text-xs">Kembali</button>
      </div>
    </div>`, { mode: 'spotlight', maxWidth: '820px' });
  };

  global.saveReturDraftToLocal = () => {
    const drafts = _readLocalList(RETUR_DRAFTS_KEY);
    const noEl = document.getElementById('returNoBarInp');
    const catEl = document.getElementById('returCatatanInp');
    if (noEl) returFormState.no_bar = String(noEl.value || '').trim();
    if (catEl) returFormState.catatan = String(catEl.value || '').trim();
    const idDraft = returFormState.id_draft || ('RTD-' + Date.now());
    const entry = Object.assign({}, returFormState, { id_draft: idDraft, saved_at: new Date().toISOString(), items: returFormState.items.slice() });
    const idx = drafts.findIndex((x) => x.id_draft === idDraft);
    if (idx >= 0) drafts[idx] = entry; else drafts.unshift(entry);
    _writeLocalList(RETUR_DRAFTS_KEY, drafts);
    S().closeModal();
    global.toast('Draft Retur Pembelian tersimpan di browser.', 'ok');
    global.renderActiveView();
  };

  global.loadReturDraftFromLocal = (idDraft) => {
    const d = _readLocalList(RETUR_DRAFTS_KEY).find((x) => x.id_draft === idDraft);
    if (!d) return global.toast('Draft retur tidak ditemukan.', 'warn');
    returFormState = Object.assign({}, d, { items: Array.isArray(d.items) ? d.items.slice() : [] });
    S().openModal(_renderCreateReturModalHtml(), 'full');
  };

  global.deleteReturDraftFromLocal = (idDraft) => {
    _writeLocalList(RETUR_DRAFTS_KEY, _readLocalList(RETUR_DRAFTS_KEY).filter((x) => x.id_draft !== idDraft));
    global.openReturDraftModal();
  };

  global.submitCreateReturPembelian = async () => {
    try {
      const noEl = document.getElementById('returNoBarInp');
      const catEl = document.getElementById('returCatatanInp');
      if (noEl) returFormState.no_bar = String(noEl.value || '').trim();
      if (catEl) returFormState.catatan = String(catEl.value || '').trim();
      if (!returFormState.items.length) throw new Error('Tambahkan minimal 1 batch produk untuk diretur.');
      const noBar = returFormState.no_bar || ('BAR-' + (returFormState.tanggal || new Date().toISOString().slice(0, 10)).replace(/-/g, '') + '-' + String(Date.now()).slice(-3));
      const fullAlasan = `${returFormState.alasan} [${returFormState.metode}] ${returFormState.catatan || ''}`.trim();
      let totalCut = 0;
      for (let i = 0; i < returFormState.items.length; i++) {
        const it = returFormState.items[i];
        const res = await API().callApi('pengadaan.returBar', {
          id_batch: it.id_batch,
          qty_retur: Number(it.qty_retur || 1),
          no_bar: noBar,
          alasan: fullAlasan
        }, { isWrite: true });
        totalCut += Number(res.nilai_potong_hutang || 0);
      }
      if (returFormState.id_draft) {
        _writeLocalList(RETUR_DRAFTS_KEY, _readLocalList(RETUR_DRAFTS_KEY).filter((x) => x.id_draft !== returFormState.id_draft));
      }
      S().closeModal();
      global.toast(`Retur BAR-PBF ${noBar} tercatat! Penyesuaian nilai: ${S().rp(totalCut)}`, 'ok');
      await global.bootLoadState(true);
    } catch (e) { global.toast(e.message, 'err'); }
  };

  global.printBarPbfDocument = (noBar) => {
    const st = S().AppState;
    const prof = S().getStoreProfile();
    const logs = (st.mutasiStok || []).filter((m) => String(m.jenis_mutasi || '').toUpperCase() === 'RETUR_PBF' && String(m.referensi_id || m.id_mutasi) === noBar);
    if (!logs.length) return global.toast('Data BAR-PBF tidak ditemukan.', 'warn');
    const firstB = (st.stokBatch || []).find((b) => b.id_batch === logs[0].id_batch) || {};
    let totalVal = 0;
    const rowsHtml = logs.map((m, idx) => {
      const b = (st.stokBatch || []).find((x) => x.id_batch === m.id_batch) || {};
      const qty = Math.abs(Number(m.qty_ubah || 0));
      const hpp = Number(b.hpp_beli || 0);
      totalVal += qty * hpp;
      return `<tr><td style="border:1px solid #94a3b8;padding:5px">${idx + 1}</td><td style="border:1px solid #94a3b8;padding:5px"><b>${S().esc(m.nama_dagang || m.id_obat)}</b></td><td style="border:1px solid #94a3b8;padding:5px">${S().esc(m.no_batch || b.no_batch || '-')}</td><td style="border:1px solid #94a3b8;padding:5px">${S().esc(String(m.tgl_kadaluarsa || b.tgl_kadaluarsa || '-').slice(0, 10))}</td><td style="border:1px solid #94a3b8;padding:5px;text-align:right">${qty}</td><td style="border:1px solid #94a3b8;padding:5px;text-align:right">${S().rp(qty * hpp)}</td></tr>`;
    }).join('');
    const html = `<style>@page{size:A4 portrait;margin:12mm;}</style>
      <div style="font-family:Arial,sans-serif;color:#0f172a;font-size:12px">
        <div style="border-bottom:2px solid #0f172a;padding-bottom:8px;margin-bottom:14px">
          <div style="font-size:16px;font-weight:800">${S().esc(prof.nama_usaha || prof.nama_apotek || 'APOTEK ONS FARMA')}</div>
          <div>SIA: ${S().esc(prof.no_sia || '-')} &bull; Telp: ${S().esc(prof.wa_usaha || prof.telepon_usaha || '-')}</div>
        </div>
        <h2 style="text-align:center;font-size:15px;font-weight:800;margin:0 0 10px">BERITA ACARA RETUR BARANG KE PBF (BAR-PBF)</h2>
        <div style="margin-bottom:12px">No. BAR: <b>${S().esc(noBar)}</b> &bull; Tanggal: <b>${S().formatTgl(logs[0].timestamp)}</b> &bull; Supplier PBF: <b>${S().esc(firstB.id_pbf || '-')}</b> &bull; Faktur Asal: <b>${S().esc(firstB.no_faktur_pbf || '-')}</b></div>
        <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:14px">
          <thead><tr style="background:#e2e8f0"><th style="border:1px solid #64748b;padding:5px">No</th><th style="border:1px solid #64748b;padding:5px">Nama Obat</th><th style="border:1px solid #64748b;padding:5px">No. Batch</th><th style="border:1px solid #64748b;padding:5px">Expired</th><th style="border:1px solid #64748b;padding:5px">Qty Retur</th><th style="border:1px solid #64748b;padding:5px">Nilai HPP</th></tr></thead>
          <tbody>${rowsHtml}</tbody>
          <tfoot><tr style="background:#f8fafc"><td colspan="5" style="border:1px solid #64748b;padding:6px;text-align:right;font-weight:800">TOTAL NILAI RETUR</td><td style="border:1px solid #64748b;padding:6px;text-align:right;font-weight:800">${S().rp(totalVal)}</td></tr></tfoot>
        </table>
        <div><b>Catatan/Alasan:</b> ${S().esc(logs[0].catatan || '-')}</div>
      </div>`;
    S().printHtmlZone(html);
  };

  global.exportReturHistory = (fmt) => {
    const st = S().AppState;
    const rows = (st.mutasiStok || []).filter((m) => String(m.jenis_mutasi || '').toUpperCase() === 'RETUR_PBF').map((m, i) => {
      const b = (st.stokBatch || []).find((x) => x.id_batch === m.id_batch) || {};
      const qty = Math.abs(Number(m.qty_ubah || 0));
      const hpp = Number(b.hpp_beli || 0);
      return {
        no: i + 1,
        tanggal: String(m.timestamp || '').slice(0, 10),
        no_bar: m.referensi_id || m.id_mutasi,
        no_faktur_asal: b.no_faktur_pbf || '-',
        supplier: b.id_pbf || '-',
        produk: m.nama_dagang || m.id_obat,
        qty,
        total_retur: qty * hpp
      };
    });
    S().exportDataset(fmt || 'xlsx', 'Riwayat Retur Pembelian BAR-PBF', `retur-pembelian-${new Date().toISOString().slice(0, 10)}`, [
      { key: 'no', label: 'No', type: 'int', width: 6 },
      { key: 'tanggal', label: 'Tanggal', type: 'str', width: 13 },
      { key: 'no_bar', label: 'No. Faktur Retur', type: 'str', width: 18 },
      { key: 'no_faktur_asal', label: 'No. Faktur Asal', type: 'str', width: 18 },
      { key: 'supplier', label: 'Supplier', type: 'wrap', width: 22 },
      { key: 'produk', label: 'Produk', type: 'wrap', width: 26 },
      { key: 'qty', label: 'Qty', type: 'int', sum: true, width: 10 },
      { key: 'total_retur', label: 'Total Retur', type: 'currency', sum: true, width: 18 }
    ], rows, { sheetName: 'ReturPembelian' });
  };

  /**
   * Scanner & Stiker Barcode + Opname Mobile HP Helpers (v15.0)
   */
  global.openPrintMasterLabelsModal = () => {
    const items = S().AppState.masterObat || [];
    if (global.ONSBarcode && typeof global.ONSBarcode.openPrintBarcodeLabelsModal === 'function') {
      global.ONSBarcode.openPrintBarcodeLabelsModal(items);
    } else {
      global.toast('Modul cetak stiker barcode belum dimuat.', 'warn');
    }
  };

  global.scanMasterObatBarcode = () => {
    if (global.ONSBarcode && typeof global.ONSBarcode.openScannerModal === 'function') {
      global.ONSBarcode.openScannerModal({
        title: 'Cari Produk Master Obat via Barcode',
        hint: 'Scan barcode kemasan/stiker rak untuk memfilter katalog.',
        onDetect: (code) => {
          const hit = global.ONSBarcode.matchProductByBarcode(code, S().AppState.masterObat, S().AppState.stokBatch);
          const obHit = hit && hit.obat;
          masterSearchQ = obHit ? obHit.nama_dagang : code;
          global.toast(obHit ? ('Ditemukan: ' + obHit.nama_dagang) : ('Pencarian difilter: ' + code), obHit ? 'ok' : 'info');
          global.renderActiveView();
        }
      });
    }
  };

  global.setOpnameRakFilter = (rak) => { opnameRakFilter = rak || ''; global.renderActiveView(); };
  global.setOpnameViewMode = (m) => { opnameViewMode = m === 'CARD' ? 'CARD' : 'TABLE'; opnameSessionActive = true; global.renderActiveView(); };
  global.stepOpnameDraftQty = (idBatch, sysQty, delta) => {
    const cur = opnameDraftQty[idBatch] !== undefined && opnameDraftQty[idBatch] !== '' ? Number(opnameDraftQty[idBatch]) : Number(sysQty || 0);
    opnameDraftQty[idBatch] = Math.max(0, cur + Number(delta || 0));
    global.renderActiveView();
  };
  global.scanOpnameBarcodeNow = () => {
    if (global.ONSBarcode && typeof global.ONSBarcode.openScannerModal === 'function') {
      global.ONSBarcode.openScannerModal({
        title: 'Scan Barcode Stock Opname Rak',
        hint: 'Scan barcode kemasan obat untuk langsung menyaring batch & menghitung stok fisik.',
        onDetect: (code) => {
          const hit = global.ONSBarcode.matchProductByBarcode(code, S().AppState.masterObat, S().AppState.stokBatch);
          const obHit = hit && hit.obat;
          gudangBatchQ = obHit ? obHit.nama_dagang : (hit && hit.batch ? hit.batch.no_batch : code);
          global.toast(obHit ? ('Opname disaring ke: ' + obHit.nama_dagang) : ('Filter batch: ' + code), obHit ? 'ok' : 'info');
          global.renderActiveView();
        }
      });
    }
  };

  global.setKonsinyasiSupplierFilter = (pbf) => {
    fakturKonsinyasiPbfFilter = pbf || '';
    global.renderActiveView();
  };
  global.setGrnJenisPenerimaan = (val) => {
    grnHeader.jenis_penerimaan = val === 'KONSINYASI' ? 'KONSINYASI' : 'BELI_PUTUS';
    grnHeader.status_bayar = grnHeader.jenis_penerimaan === 'KONSINYASI' ? 'KONSINYASI' : 'BELUM_LUNAS';
    global.renderActiveView();
  };
  global.openSettleKonsinyasiModal = (idPbf, singleBatchId) => {
    const sum = (S().AppState.konsinyasiSummary || {}).items || [];
    const targets = sum.filter((it) => it.qty_belum_bayar > 0 && (!idPbf || it.id_pbf === idPbf) && (!singleBatchId || it.id_batch === singleBatchId));
    if (!targets.length) return global.toast('Tidak ada stok terjual yang belum disettle.', 'info');
    const totalQty = targets.reduce((s, it) => s + Number(it.qty_belum_bayar || 0), 0);
    const totalNominal = targets.reduce((s, it) => s + Number(it.tagihan_belum_bayar || 0), 0);
    const pbfName = idPbf || targets[0].id_pbf || 'Supplier Konsinyasi';
    const batchCsv = targets.map((t) => t.id_batch).join(',');
    S().openModal(`<div class="p-6 space-y-3.5 text-xs">
      <div class="flex justify-between items-center"><h3 class="font-bold text-base">Settlement Konsinyasi (${S().esc(pbfName)})</h3><button onclick="ONSStore.closeModal()" class="text-xl px-1">&times;</button></div>
      <div class="p-3.5 rounded-xl border border-emerald-500/35 bg-emerald-500/10 space-y-1">
        <div>Total Unit Terjual Belum Bayar: <b class="font-mono-num">${totalQty} unit (${targets.length} batch)</b></div>
        <div>Total Tagihan HPP Disettle: <b class="font-mono-num text-sm text-emerald-700 dark:text-emerald-300">${S().rp(totalNominal)}</b></div>
      </div>
      <div><label class="font-semibold block mb-1">Metode Pembayaran</label>
        <select id="knsMetodeInp" class="ons-select">
          <option value="TRANSFER_BANK">TRANSFER_BANK</option>
          <option value="TUNAI">TUNAI (Kas Toko)</option>
          <option value="QRIS">QRIS / Virtual Account</option>
        </select>
      </div>
      <div><label class="font-semibold block mb-1">Catatan Settlement (Opsional)</label><input id="knsCatatanInp" class="ons-input" value="Settlement konsinyasi barang laku terjual"/></div>
      <button type="button" onclick="window.submitSettleKonsinyasi('${S().esc(pbfName)}', '${S().esc(batchCsv)}')" class="ons-btn ons-btn-emerald w-full py-2.5 font-bold">Bayar &amp; Catat Jurnal Settlement</button>
    </div>`, '480px');
  };
  global.submitSettleKonsinyasi = async (idPbf, batchCsv) => {
    try {
      const batchIds = batchCsv ? batchCsv.split(',').filter(Boolean) : [];
      const res = await API().callApi('konsinyasi.settle', {
        id_pbf: idPbf,
        batch_ids: batchIds,
        metode_bayar: (document.getElementById('knsMetodeInp') || {}).value || 'TRANSFER_BANK',
        catatan: (document.getElementById('knsCatatanInp') || {}).value || ''
      }, { isWrite: true });
      S().closeModal();
      global.toast(`Settlement ${(res.settlement && res.settlement.no_settlement) || 'konsinyasi'} berhasil (${res.total_qty} unit).`, 'ok');
      await global.bootLoadState(true);
    } catch (e) { global.toast(e.message, 'err'); }
  };
  global.openReturnKonsinyasiModal = (idBatch, namaObat, maxQty) => {
    S().openModal(`<div class="p-6 space-y-3.5 text-xs">
      <div class="flex justify-between items-center"><h3 class="font-bold text-base text-amber-600">Tarik / Retur Konsinyasi Tak Laku</h3><button onclick="ONSStore.closeModal()" class="text-xl px-1">&times;</button></div>
      <div class="p-3 rounded-xl border" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
        Obat: <b>${S().esc(namaObat)}</b> &bull; Sisa Stok Titipan: <b class="font-mono-num">${maxQty}</b>
      </div>
      <div><label class="font-semibold block mb-1">Qty Ditarik Kembali Distributor *</label><input id="knsReturQty" type="number" min="1" max="${maxQty}" value="${maxQty}" class="ons-input font-mono-num"/></div>
      <div><label class="font-semibold block mb-1">Alasan Penarikan</label><input id="knsReturAlasan" class="ons-input" value="Penarikan barang konsinyasi tak laku / selesai periode"/></div>
      <button type="button" onclick="window.submitReturnKonsinyasi('${S().esc(idBatch)}')" class="ons-btn ons-btn-amber w-full py-2.5 font-bold">Proses Tarik Konsinyasi</button>
    </div>`, '440px');
  };
  global.submitReturnKonsinyasi = async (idBatch) => {
    try {
      const qtyRet = Number((document.getElementById('knsReturQty') || {}).value || 0);
      const alasan = (document.getElementById('knsReturAlasan') || {}).value || '';
      const res = await API().callApi('konsinyasi.returnUnsold', {
        id_batch: idBatch,
        qty_retur: qtyRet,
        alasan
      }, { isWrite: true });
      S().closeModal();
      global.toast(`Berhasil tarik ${res.qty_retur} unit konsinyasi dari gudang.`, 'ok');
      await global.bootLoadState(true);
    } catch (e) { global.toast(e.message, 'err'); }
  };

  global.openInputKonsinyasi = () => {
    grnHeader.jenis_penerimaan = 'KONSINYASI';
    grnHeader.status_bayar = 'KONSINYASI';
    global.setFakturTab('input');
  };
  global.setKonsSubTab = (tab) => {
    konsSubTab = ['status', 'masuk', 'retur', 'stok'].includes(tab) ? tab : 'status';
    global.renderActiveView();
  };
  global.setKonsSearchQ = (val) => {
    konsSearchQ = val || '';
    global.renderActiveView();
  };
  global.setKonsDateRange = (from, to) => {
    konsDateFrom = from || '';
    konsDateTo = to || '';
    global.renderActiveView();
  };
  global.setKonsEntryMode = (mode) => {
    konsEntryMode = mode === 'produk' ? 'produk' : 'faktur';
    global.renderActiveView();
  };
  global.dismissKonsReturBanner = () => {
    konsReturBannerDismissed = true;
    global.renderActiveView();
  };
  global.openKonsinyasiDraftModal = () => {
    const drafts = _readLocalList(KONSINYASI_DRAFTS_KEY);
    S().openModal(`<div class="p-6 space-y-4">
      <div class="flex justify-between items-center pb-2 border-b" style="border-color:var(--ons-border)">
        <h3 class="font-bold text-base text-blue-600">Draft Konsinyasi Masuk</h3>
        <button type="button" onclick="window.ONSStore.closeModal()" class="text-xl px-1">&times;</button>
      </div>
      <div class="ons-table-wrap max-h-96 overflow-y-auto">
        <table class="ons-table">
          <thead><tr><th>No.</th><th>Supplier</th><th>No. Faktur</th><th>Terakhir Disimpan</th><th>Produk</th><th class="text-right">Total</th><th>Action</th></tr></thead>
          <tbody>
            ${drafts.length ? drafts.map((d, idx) => {
              const h = d.header || {};
              const items = Array.isArray(d.items) ? d.items : [];
              const prodTxt = items.map((it) => it.nama_dagang || it.id_obat).filter(Boolean).slice(0, 2).join(', ') + (items.length > 2 ? ` (+${items.length - 2})` : '');
              const tot = items.reduce((s, it) => s + Math.max(0, (Number(it.qty_dasar || 0) * Number(it.hpp_unit || 0)) - Number(it.diskon_item || 0)), 0);
              return `<tr>
                <td class="font-mono-num text-xs">${idx + 1}</td>
                <td class="text-xs font-semibold">${S().esc(h.id_pbf || '-')}</td>
                <td class="font-mono-num text-xs">${S().esc(h.no_faktur_pbf || '-')}</td>
                <td class="font-mono-num text-xs">${S().esc(String(d.saved_at || '').slice(0, 16).replace('T', ' '))}</td>
                <td class="text-xs">${S().esc(prodTxt || (items.length + ' item'))}</td>
                <td class="text-right font-mono-num text-xs font-bold">${S().rp(tot)}</td>
                <td>
                  <div class="flex gap-1.5">
                    <button type="button" onclick="window.loadKonsinyasiDraftFromLocal('${S().esc(d.id_draft)}')" class="ons-btn ons-btn-primary text-[11px] py-1 px-2">Lanjutkan</button>
                    <button type="button" onclick="window.deleteKonsinyasiDraftFromLocal('${S().esc(d.id_draft)}')" class="ons-btn ons-btn-rose text-[11px] py-1 px-2">Hapus</button>
                  </div>
                </td>
              </tr>`;
            }).join('') : '<tr><td colspan="7" class="text-center py-8 text-xs">Data tidak ditemukan.</td></tr>'}
          </tbody>
        </table>
      </div>
      <div class="flex flex-wrap items-center justify-between gap-3 pt-2 border-t text-xs" style="border-color:var(--ons-border)">
        <div class="p-2.5 rounded-xl border bg-amber-500/10 border-amber-500/30 flex-1">Draft ini hanya tersimpan di perangkat &amp; browser ini. Klik <b>Lanjutkan</b> untuk menyelesaikan input konsinyasi ke sistem.</div>
        <button type="button" onclick="window.ONSStore.closeModal()" class="ons-btn ons-btn-ghost text-xs">Kembali</button>
      </div>
    </div>`, { mode: 'spotlight', maxWidth: '820px' });
  };
  global.loadKonsinyasiDraftFromLocal = (idDraft) => {
    const d = _readLocalList(KONSINYASI_DRAFTS_KEY).find((x) => x.id_draft === idDraft);
    if (!d) return global.toast('Draft konsinyasi tidak ditemukan.', 'warn');
    grnActiveDraftId = d.id_draft;
    grnHeader = Object.assign({}, grnHeader, d.header || {}, { jenis_penerimaan: 'KONSINYASI', status_bayar: 'KONSINYASI' });
    grnItems = Array.isArray(d.items) && d.items.length ? d.items.slice() : [];
    S().closeModal();
    global.setFakturTab('input');
  };
  global.deleteKonsinyasiDraftFromLocal = (idDraft) => {
    _writeLocalList(KONSINYASI_DRAFTS_KEY, _readLocalList(KONSINYASI_DRAFTS_KEY).filter((x) => x.id_draft !== idDraft));
    global.openKonsinyasiDraftModal();
    global.renderActiveView();
  };
  global.openKonsinyasiMasukDetail = (key) => {
    const st = S().AppState;
    const allItems = ((st.konsinyasiSummary || {}).items || []);
    const row = _getKonsinyasiMasukRows(st, allItems).find((r) => String(r.key) === String(key));
    if (!row) return global.toast('Detail konsinyasi tidak ditemukan.', 'warn');
    if (row.id_faktur && typeof global.openFakturDetailModal === 'function') {
      return global.openFakturDetailModal(row.id_faktur);
    }
    const items = row.batches || [];
    S().openModal(`<div class="p-6 space-y-3 text-xs">
      <div class="flex justify-between items-center pb-2 border-b" style="border-color:var(--ons-border)">
        <h3 class="font-bold text-base">Detail Konsinyasi Masuk &bull; ${S().esc(row.no_faktur_pbf)}</h3>
        <button type="button" onclick="window.ONSStore.closeModal()" class="text-xl px-1">&times;</button>
      </div>
      <div class="grid grid-cols-2 gap-2 p-3 rounded-xl border" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
        <div>Supplier: <b>${S().esc(row.id_pbf)}</b></div>
        <div>Tanggal: <b class="font-mono-num">${S().esc(row.tanggal || '-')}</b></div>
        <div>Total Nilai: <b class="font-mono-num">${S().rp(row.total_masuk)}</b></div>
        <div>Belum Disetor: <b class="font-mono-num text-red-600">${S().rp(row.tagihan_belum_bayar)}</b></div>
      </div>
      <div class="ons-table-wrap">
        <table class="ons-table">
          <thead><tr><th>Obat &amp; Batch</th><th class="text-right">Awal</th><th class="text-right">Laku</th><th class="text-right">Sisa</th><th class="text-right">HPP</th></tr></thead>
          <tbody>
            ${items.map((it) => `<tr>
              <td><div class="font-bold">${S().esc(it.nama_dagang)}</div><div class="font-mono-num text-[11px]" style="color:var(--ons-text-soft)">${S().esc(it.no_batch)}</div></td>
              <td class="text-right font-mono-num">${it.qty_awal}</td>
              <td class="text-right font-mono-num text-blue-600">${it.qty_terjual}</td>
              <td class="text-right font-mono-num font-bold">${it.qty_sisa}</td>
              <td class="text-right font-mono-num">${S().rp(it.hpp_beli)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`, '620px');
  };
  global.printKonsinyasiReturBukti = (idMutasi) => {
    const st = S().AppState;
    const allItems = ((st.konsinyasiSummary || {}).items || []);
    const row = _getKonsinyasiReturRows(st, allItems).find((r) => String(r.id_mutasi) === String(idMutasi));
    if (!row) return global.toast('Bukti retur konsinyasi tidak ditemukan.', 'warn');
    const html = `<div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;padding:24px;border:1px solid #cbd5e1;border-radius:10px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #0f172a;padding-bottom:10px;margin-bottom:14px">
        <div><h2 style="margin:0;font-size:16px">BUKTI RETUR KONSINYASI (PENARIKAN BARANG)</h2><div style="font-size:12px;color:#475569">${S().esc(S().getStoreProfile().nama_toko || 'Apotek ONS Farma')}</div></div>
        <div style="text-align:right;font-size:12px"><div>Ref: <b>${S().esc(row.id_mutasi)}</b></div><div>Tgl: <b>${S().esc(row.tanggal)}</b></div></div>
      </div>
      <div style="font-size:12px;margin-bottom:12px">
        <div>Supplier / Penitip: <b>${S().esc(row.id_pbf)}</b></div>
        <div>No. Faktur / Ref: <b>${S().esc(row.no_faktur_pbf)}</b></div>
        <div>Keterangan: ${S().esc(row.catatan)}</div>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:18px">
        <thead><tr style="background:#f1f5f9"><th style="border:1px solid #cbd5e1;padding:6px;text-align:left">Produk &amp; Batch</th><th style="border:1px solid #cbd5e1;padding:6px;text-align:right">Qty Retur</th><th style="border:1px solid #cbd5e1;padding:6px;text-align:right">Nilai Retur</th></tr></thead>
        <tbody><tr>
          <td style="border:1px solid #cbd5e1;padding:6px"><b>${S().esc(row.nama_dagang)}</b><br/><span style="color:#64748b">Batch: ${S().esc(row.no_batch)}</span></td>
          <td style="border:1px solid #cbd5e1;padding:6px;text-align:right">${row.qty_retur} ${S().esc(row.satuan)}</td>
          <td style="border:1px solid #cbd5e1;padding:6px;text-align:right">${S().rp(row.total_retur)}</td>
        </tr></tbody>
      </table>
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-top:24px">
        <div>Petugas Apotek,<br/><br/><br/><b>(${S().esc(row.petugas)})</b></div>
        <div style="text-align:right">Sales / Kurir Supplier,<br/><br/><br/><b>(................................)</b></div>
      </div>
    </div>`;
    S().openModal(`<div class="p-6 space-y-3">
      <div class="flex justify-between items-center"><h3 class="font-bold text-base">Bukti Retur Konsinyasi</h3><button type="button" onclick="window.ONSStore.closeModal()" class="text-xl px-1">&times;</button></div>
      <div id="konsReturPrintArea">${html}</div>
      <div class="flex justify-end gap-2">
        <button type="button" onclick="window.ONSStore.closeModal()" class="ons-btn ons-btn-ghost text-xs">Tutup</button>
        <button type="button" onclick="ONSStore.printHtmlZone(document.getElementById('konsReturPrintArea').innerHTML,'Bukti Retur Konsinyasi')" class="ons-btn ons-btn-primary text-xs font-bold">Cetak / Print</button>
      </div>
    </div>`, { mode: 'spotlight', maxWidth: '760px' });
  };
  global.exportKonsinyasiData = (mode) => {
    const st = S().AppState;
    const allItems = ((st.konsinyasiSummary || {}).items || []);
    const dt = new Date().toISOString().slice(0, 10);
    if (mode === 'masuk') {
      const rows = _getKonsinyasiMasukRows(st, allItems).map((r, i) => ({ no: i + 1, tanggal: r.tanggal, no_faktur: r.no_faktur_pbf, supplier: r.id_pbf, produk: r.produk_label, qty: r.qty_total, total: r.total_masuk }));
      if (!rows.length) return global.toast('Belum ada data konsinyasi masuk.', 'warn');
      return S().exportDataset('xlsx', 'Daftar Konsinyasi Masuk', `konsinyasi-masuk-${dt}`, [
        { key: 'no', label: 'No', type: 'int', width: 6 },
        { key: 'tanggal', label: 'Tanggal', type: 'str', width: 13 },
        { key: 'no_faktur', label: 'No. Faktur', type: 'str', width: 20 },
        { key: 'supplier', label: 'Supplier', type: 'wrap', width: 24 },
        { key: 'produk', label: 'Produk', type: 'wrap', width: 28 },
        { key: 'qty', label: 'Qty', type: 'int', width: 10 },
        { key: 'total', label: 'Total Konsinyasi Masuk', type: 'currency', sum: true, width: 20 }
      ], rows, { sheetName: 'KonsinyasiMasuk' });
    }
    if (mode === 'retur') {
      const rows = _getKonsinyasiReturRows(st, allItems).map((r, i) => ({ no: i + 1, tanggal: r.tanggal, no_faktur: r.no_faktur_pbf, supplier: r.id_pbf, produk: r.nama_dagang, batch: r.no_batch, qty_retur: r.qty_retur, total_retur: r.total_retur }));
      if (!rows.length) return global.toast('Belum ada data retur konsinyasi.', 'warn');
      return S().exportDataset('xlsx', 'Retur Konsinyasi', `retur-konsinyasi-${dt}`, [
        { key: 'no', label: 'No', type: 'int', width: 6 },
        { key: 'tanggal', label: 'Tanggal', type: 'str', width: 13 },
        { key: 'no_faktur', label: 'No. Faktur', type: 'str', width: 20 },
        { key: 'supplier', label: 'Supplier', type: 'wrap', width: 24 },
        { key: 'produk', label: 'Produk', type: 'wrap', width: 26 },
        { key: 'batch', label: 'Batch', type: 'str', width: 16 },
        { key: 'qty_retur', label: 'Qty Retur', type: 'int', width: 10 },
        { key: 'total_retur', label: 'Total Retur', type: 'currency', sum: true, width: 18 }
      ], rows, { sheetName: 'ReturKonsinyasi' });
    }
    if (mode === 'stok') {
      const rows = allItems.filter((it) => Number(it.qty_sisa || 0) > 0).map((it, i) => ({ no: i + 1, produk: it.nama_dagang, batch: it.no_batch, ed: String(it.tgl_kadaluarsa || '').slice(0, 10), faktur: it.no_faktur_pbf || '-', supplier: it.id_pbf, kuantitas: Number(it.qty_sisa || 0), satuan: it.satuan_dasar || 'unit' }));
      if (!rows.length) return global.toast('Belum ada stok konsinyasi aktif.', 'warn');
      return S().exportDataset('xlsx', 'Stok Konsinyasi', `stok-konsinyasi-${dt}`, [
        { key: 'no', label: 'No', type: 'int', width: 6 },
        { key: 'produk', label: 'Nama Produk', type: 'wrap', width: 28 },
        { key: 'batch', label: 'Batch', type: 'str', width: 16 },
        { key: 'ed', label: 'ED', type: 'str', width: 13 },
        { key: 'faktur', label: 'No. Faktur', type: 'str', width: 18 },
        { key: 'supplier', label: 'Supplier', type: 'wrap', width: 24 },
        { key: 'kuantitas', label: 'Kuantitas', type: 'int', width: 12 },
        { key: 'satuan', label: 'Satuan', type: 'str', width: 12 }
      ], rows, { sheetName: 'StokKonsinyasi' });
    }
    const rows = allItems.map((it, i) => ({ no: i + 1, penitip: it.id_pbf, produk: it.nama_dagang, batch: it.no_batch, masuk: Number(it.qty_awal || 0), laku: Number(it.qty_terjual || 0), retur: Number(it.qty_retur_supplier || 0), sisa: Number(it.qty_sisa || 0), belum_disetor: Number(it.tagihan_belum_bayar || 0) }));
    if (!rows.length) return global.toast('Belum ada data status konsinyasi.', 'warn');
    return S().exportDataset('xlsx', 'Status Konsinyasi', `status-konsinyasi-${dt}`, [
      { key: 'no', label: 'No', type: 'int', width: 6 },
      { key: 'penitip', label: 'Penitip / Supplier', type: 'wrap', width: 24 },
      { key: 'produk', label: 'Nama Produk', type: 'wrap', width: 26 },
      { key: 'batch', label: 'Batch', type: 'str', width: 16 },
      { key: 'masuk', label: 'Masuk', type: 'int', width: 8 },
      { key: 'laku', label: 'Laku', type: 'int', width: 8 },
      { key: 'retur', label: 'Retur', type: 'int', width: 8 },
      { key: 'sisa', label: 'Sisa', type: 'int', width: 8 },
      { key: 'belum_disetor', label: 'Belum Disetor', type: 'currency', sum: true, width: 18 }
    ], rows, { sheetName: 'StatusKonsinyasi' });
  };

  global.ONSViewsInventoryProcurement = { renderMasterObatView, renderGudangView, renderDefectaView, renderFakturView };
})(window);
