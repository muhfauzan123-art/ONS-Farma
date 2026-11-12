/**
 * ONS FARMA DIGITAL ENTERPRISE v10.0 - Modul W-04 (Master Obat), W-05 (Gudang FEFO & Recall),
 * W-06 (Defecta & SP BPOM 5 Golongan), dan W-07 (Faktur PBF OCR/Excel & Retur BAR-PBF)
 */
(function (global) {
  'use strict';
  const S = () => global.ONSStore;
  const API = () => global.ONSApi;

  let masterTab = 'obat'; // obat | supplier | pelanggan | dokter
  let masterFilterGol = '';
  let masterFilterStok = 'SEMUA'; // SEMUA | AMAN | KRITIS | NEAR_ED
  let masterSortBy = 'NAMA'; // NAMA | STOK_ASC | ED_ASC | HARGA_DESC
  let masterViewMode = 'TABLE'; // TABLE | CARD
  let masterSearchQ = '';
  let supplierSearchQ = '';
  let supplierStatusFilter = 'SEMUA'; // SEMUA | AKTIF | NONAKTIF
  let pelangganSearchQ = '';
  let pelangganProgFilter = 'SEMUA'; // SEMUA | MEMBER_RUTIN | UMUM | MITRA_KLINIK | ALERGI
  let dokterSearchQ = '';
  let dokterStatusFilter = 'SEMUA'; // SEMUA | AKTIF | NONAKTIF | SPESIALIS
  let wizardFullScrollMode = false;
  let wizardStep = 1;
  let importObatBuffer = [];
  let gudangTab = 'batch';
  let mutasiFilterObat = '';
  let mutasiFilterJenis = '';
  let opnameRakFilter = '';
  let opnameViewMode = 'TABLE'; // TABLE | CARD (Mobile HP)

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
      if (masterFilterStok === 'KRITIS' && !m.isCritical) return false;
      if (masterFilterStok === 'NEAR_ED' && !m.isNearEd) return false;
      if (masterSearchQ) {
        const q = masterSearchQ.toLowerCase();
        const hay = `${o.nama_dagang} ${o.zat_aktif} ${o.kode_kfa} ${o.nie_bpom} ${o.rak_lokasi}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => {
      if (masterSortBy === 'STOK_ASC') return a.stok - b.stok;
      if (masterSortBy === 'HARGA_DESC') return b.harga - a.harga;
      if (masterSortBy === 'ED_ASC') return (a.edDays === null ? 99999 : a.edDays) - (b.edDays === null ? 99999 : b.edDays);
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
    const critCount = allMeta.filter((m) => m.isCritical).length;
    const nearEdCount = allMeta.filter((m) => m.isNearEd).length;
    const totalValuasiHpp = seeCost ? allMeta.reduce((sum, m) => sum + (m.stok * m.hpp), 0) : 0;
    const hasFilter = Boolean(masterSearchQ || masterFilterGol || masterFilterStok !== 'SEMUA');

    const actionButtons = (o) => `<div class="flex flex-wrap gap-1">
      <button onclick="window.openObatDetailModal('${S().esc(o.id_obat)}')" class="ons-btn ons-btn-primary text-[11px] py-1 px-2">Detail</button>
      <button onclick="window.printCode128Obat('${S().esc(o.id_obat)}')" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2" title="Cetak Barcode Rak">Barcode</button>
      ${seeCost ? `<button onclick="window.openObatWizardModal('${S().esc(o.id_obat)}')" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2">Edit</button>` : ''}
    </div>`;

    const kpiHtml = `<div class="ons-md-kpi-strip">
      ${_renderMasterKpiBtn("window.setMasterStokFilter('SEMUA')", '', masterFilterStok === 'SEMUA', 'Total Item Obat', totalCount, seeCost ? ('Modal: ' + S().rp(totalValuasiHpp)) : 'Produk aktif apotek', '')}
      ${_renderMasterKpiBtn("window.setMasterStokFilter('AMAN')", 'is-emerald', masterFilterStok === 'AMAN', 'Stok Aman', safeCount, 'Di atas stok minimum', 'text-emerald-600')}
      ${_renderMasterKpiBtn("window.setMasterStokFilter('KRITIS')", 'is-amber', masterFilterStok === 'KRITIS', 'Perlu Restok', critCount, critCount ? 'Klik untuk filter defecta' : 'Semua stok cukup', critCount ? 'text-amber-600' : 'text-emerald-600')}
      ${_renderMasterKpiBtn("window.setMasterStokFilter('NEAR_ED')", 'is-red', masterFilterStok === 'NEAR_ED', 'Near ED (&le;90h)', nearEdCount, nearEdCount ? 'Prioritaskan FEFO' : 'Semua ED panjang', nearEdCount ? 'text-red-600' : 'text-emerald-600')}
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
        return `<div class="ons-product-card flex flex-col justify-between gap-2.5">
          <div class="space-y-1.5">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-1.5 mb-0.5">
                  ${S().bpomBadge(o.golongan_bpom)}
                  ${m.isCold ? `<span class="badge-bpom bpom-terbatas">CHILLER 2-8&deg;C</span>` : ''}
                </div>
                <h3 class="font-bold text-sm leading-snug">${S().esc(o.nama_dagang)}</h3>
                <div class="text-xs truncate" style="color:var(--ons-text-soft)">${S().esc(o.zat_aktif)} ${o.kekuatan ? ('(' + S().esc(o.kekuatan) + ')') : ''}</div>
              </div>
              <span class="font-mono-num text-[10px] px-1.5 py-0.5 rounded border shrink-0" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">${S().esc(o.rak_lokasi || 'RAK')}</span>
            </div>
            <div class="flex flex-wrap gap-2 text-[11px] font-mono-num" style="color:var(--ons-text-soft)">
              <span>KFA: <b>${S().esc(o.kode_kfa || o.id_obat)}</b></span>
              <span>&bull; NIE: ${S().esc(o.nie_bpom || '-')}</span>
            </div>
            <div class="p-2 rounded-lg border" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
              ${renderObatStockBarHtml(m)}
              <div class="text-[11px] font-mono-num mt-1" style="color:var(--ons-text-soft)">
                1 ${S().esc(o.satuan_besar || 'Box')} = ${Number(o.rasio_besar || 100)} ${S().esc(o.satuan_dasar)} &bull; 1 ${S().esc(o.satuan_sedang || 'Strip')} = ${Number(o.rasio_sedang || 10)} ${S().esc(o.satuan_dasar)}
              </div>
            </div>
          </div>
          <div class="pt-2 border-t flex flex-wrap items-end justify-between gap-2" style="border-color:var(--ons-border)">
            <div>
              <div class="text-[10px] font-semibold uppercase" style="color:var(--ons-text-soft)">Harga / ${S().esc(o.satuan_dasar)}</div>
              <div class="text-base font-extrabold font-mono-num text-blue-600">${S().rp(o.harga_umum)}</div>
              ${seeCost ? `<div class="text-[11px] font-mono-num" style="color:var(--ons-text-soft)">HPP ${S().rp(o.hpp_avg)}${m.marginPct !== null ? ` &bull; <b class="text-emerald-600">+${m.marginPct}%</b>` : ''}</div>` : `<div class="text-[11px] font-mono-num" style="color:var(--ons-text-soft)">Member: ${S().rp(o.harga_member || o.harga_umum)}</div>`}
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
              <th>Kode KFA / NIE</th>
              <th>Produk, Zat Aktif &amp; Rak</th>
              <th>Golongan</th>
              <th>Multi-Satuan</th>
              <th>Stok &amp; ED Terdekat</th>
              ${seeCost ? '<th>HPP &amp; Margin</th>' : ''}
              <th>Harga Jual</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map((m) => {
              const o = m.o;
              return `<tr>
                <td class="font-mono-num text-xs">
                  <div class="font-bold">${S().esc(o.kode_kfa || o.id_obat)}</div>
                  <div class="text-[11px]" style="color:var(--ons-text-soft)">${S().esc(o.nie_bpom || '-')}</div>
                </td>
                <td>
                  <button type="button" onclick="window.openObatDetailModal('${S().esc(o.id_obat)}')" class="font-bold text-left hover:text-blue-600 transition-colors">${S().esc(o.nama_dagang)}</button>
                  <div class="text-xs" style="color:var(--ons-text-soft)">${S().esc(o.zat_aktif)} ${o.kekuatan ? ('(' + S().esc(o.kekuatan) + ')') : ''}</div>
                  <div class="flex flex-wrap items-center gap-1 mt-0.5">
                    <span class="text-[10px] font-mono-num px-1.5 py-0.2 rounded border" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">${S().esc(o.rak_lokasi || 'RAK')}</span>
                    ${m.isCold ? `<span class="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-500/15 text-blue-600">Chiller 2-8&deg;C</span>` : ''}
                  </div>
                </td>
                <td>${S().bpomBadge(o.golongan_bpom)}</td>
                <td class="text-xs font-mono-num">
                  <div>1 ${S().esc(o.satuan_besar || 'Box')} = ${Number(o.rasio_besar || 100)} ${S().esc(o.satuan_dasar)}</div>
                  <div class="text-[11px]" style="color:var(--ons-text-soft)">1 ${S().esc(o.satuan_sedang || 'Strip')} = ${Number(o.rasio_sedang || 10)} ${S().esc(o.satuan_dasar)}</div>
                </td>
                <td>${renderObatStockBarHtml(m)}</td>
                ${seeCost ? `<td class="font-mono-num text-xs">
                  <div>${S().rp(o.hpp_avg)}</div>
                  ${m.marginPct !== null ? `<div class="text-[11px] font-bold text-emerald-600">+${m.marginPct}% Margin</div>` : ''}
                </td>` : ''}
                <td class="font-mono-num text-xs">
                  <div class="font-bold text-blue-600">${S().rp(o.harga_umum)}</div>
                  <div class="text-[11px]" style="color:var(--ons-text-soft)">Mbr: ${S().rp(o.harga_member || o.harga_umum)}</div>
                </td>
                <td>${actionButtons(o)}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>`);

    return `<div class="space-y-3">${kpiHtml}${listHtml}</div>`;
  }

  function _renderMasterObatSubTab(seeCost, allMeta, filtered) {
    const totalCount = allMeta.length;
    const golOptions = ['', 'BEBAS', 'TERBATAS', 'KERAS', 'PREKURSOR', 'OOT', 'PSIKOTROPIKA', 'NARKOTIKA'];
    const golCounts = {};
    allMeta.forEach((m) => {
      const g = String(m.o.golongan_bpom || 'BEBAS').toUpperCase();
      golCounts[g] = (golCounts[g] || 0) + 1;
    });

    return `<div class="space-y-3">
      <div class="ons-card p-2.5 space-y-2">
        <div class="flex flex-wrap items-center gap-2">
          ${_renderSearchInputWithClear('mdObatSearchInp', 'mdObatClearBtn', masterSearchQ, 'Cari Nama Dagang, Zat Aktif, Kode KFA, NIE, atau Lokasi Rak...', 'window.setMasterSearch', 'window.clearMasterObatSearch')}
          <button type="button" onclick="window.scanMasterObatBarcode()" class="ons-btn ons-btn-primary text-xs py-1.5 px-2.5" title="Cari Obat Lewat Kamera Barcode">Scan Barcode</button>
          <select class="ons-select w-36 text-xs" onchange="window.setMasterStokFilter(this.value)" aria-label="Filter Status Stok">
            <option value="SEMUA" ${masterFilterStok === 'SEMUA' ? 'selected' : ''}>Semua Status</option>
            <option value="AMAN" ${masterFilterStok === 'AMAN' ? 'selected' : ''}>Stok Aman</option>
            <option value="KRITIS" ${masterFilterStok === 'KRITIS' ? 'selected' : ''}>Menipis / Habis</option>
            <option value="NEAR_ED" ${masterFilterStok === 'NEAR_ED' ? 'selected' : ''}>Near ED (&le; 90h)</option>
          </select>
          <select class="ons-select w-36 text-xs" onchange="window.setMasterSort(this.value)" aria-label="Urutkan Produk">
            <option value="NAMA" ${masterSortBy === 'NAMA' ? 'selected' : ''}>Urut: Nama A-Z</option>
            <option value="STOK_ASC" ${masterSortBy === 'STOK_ASC' ? 'selected' : ''}>Stok Terendah</option>
            <option value="ED_ASC" ${masterSortBy === 'ED_ASC' ? 'selected' : ''}>ED Terdekat</option>
            <option value="HARGA_DESC" ${masterSortBy === 'HARGA_DESC' ? 'selected' : ''}>Harga Tertinggi</option>
          </select>
          <div class="inline-flex rounded-lg border p-0.5" style="border-color:var(--ons-border);background:var(--ons-bg-subtle)">
            <button type="button" onclick="window.setMasterViewMode('TABLE')" class="ons-btn text-[11px] py-1 px-2 ${masterViewMode === 'TABLE' ? 'ons-btn-primary' : 'ons-btn-ghost border-0'}">Tabel</button>
            <button type="button" onclick="window.setMasterViewMode('CARD')" class="ons-btn text-[11px] py-1 px-2 ${masterViewMode === 'CARD' ? 'ons-btn-primary' : 'ons-btn-ghost border-0'}">Kartu</button>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-1.5">
          ${golOptions.filter((g) => !g || golCounts[g] || masterFilterGol === g).map((g) => {
            const cnt = g ? (golCounts[g] || 0) : totalCount;
            return `<button type="button" onclick="window.setMasterGol('${g}')" class="ons-subnav-chip ${masterFilterGol === g ? 'active' : ''}">${g || 'Semua'} (${cnt})</button>`;
          }).join('')}
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
              const waHref = _buildWaLink(p.kontak_wa, 'Halo ' + (p.nama_pbf || 'PBF') + ', kami dari apotek ingin konfirmasi stok & pengadaan barang.');
              const isAktif = String(p.status_pbf || 'AKTIF').toUpperCase() === 'AKTIF';
              return `<tr>
                <td><div class="font-bold text-xs">${S().esc(p.nama_pbf)}</div><div class="font-mono-num text-[11px]" style="color:var(--ons-text-soft)">${S().esc(p.id_pbf)}</div></td>
                <td class="font-mono-num text-xs"><div>${S().esc(p.kode_cdob || '-')}</div><div class="text-[11px]" style="color:var(--ons-text-soft)">${S().esc(p.npwp_pbf || '-')}</div></td>
                <td class="text-xs">
                  <div class="flex items-center gap-1.5">
                    <span class="font-mono-num">${S().esc(p.kontak_wa || '-')}</span>
                    ${waHref ? `<a href="${S().esc(waHref)}" target="_blank" rel="noopener" class="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">WA</a>` : ''}
                  </div>
                  <div class="text-[11px]" style="color:var(--ons-text-soft)">${S().esc(p.email_pbf || '-')}</div>
                </td>
                <td class="text-xs font-mono-num"><b>${Number(p.lead_time_hari || 0)} Hari</b> &bull; TOP ${Number(p.termin_hari || 0)}h</td>
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
      const hasAllergy = String(m.alergi_list || '').trim() && !/^(tidak ada|-)$/i.test(String(m.alergi_list).trim());
      if (pelangganProgFilter === 'ALERGI' && !hasAllergy) return false;
      else if (pelangganProgFilter !== 'SEMUA' && pelangganProgFilter !== 'ALERGI' && prog !== pelangganProgFilter) return false;
      if (pq && !`${m.id_member} ${m.nama_pasien} ${m.no_hp} ${m.alergi_list} ${m.penyakit_kronis} ${prog}`.toLowerCase().includes(pq)) return false;
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
          <thead><tr><th>Pelanggan &amp; Tgl Lahir</th><th>Kontak WhatsApp</th><th>Segmen</th><th>Riwayat Penyakit &amp; Alergi</th><th>Poin</th><th>Aksi</th></tr></thead>
          <tbody>
            ${filtered.map((m) => {
              const prog = _normMemberProg(m);
              const hasAllergy = String(m.alergi_list || '').trim() && !/^(tidak ada|-)$/i.test(String(m.alergi_list).trim());
              const waHref = _buildWaLink(m.no_hp, 'Halo ' + (m.nama_pasien || 'Pelanggan') + ', salam sehat dari ' + (prof.nama_usaha || 'Apotek ONS Farma') + '.');
              return `<tr>
                <td>
                  <div class="font-bold text-xs">${S().esc(m.nama_pasien)}</div>
                  <div class="font-mono-num text-[11px]" style="color:var(--ons-text-soft)">${S().esc(m.id_member)}${m.tgl_lahir ? (' &bull; Lahir ' + S().esc(String(m.tgl_lahir).slice(0, 10))) : ''}</div>
                </td>
                <td class="text-xs">
                  <div class="flex items-center gap-1.5">
                    <span class="font-mono-num">${S().esc(m.no_hp || '-')}</span>
                    ${waHref ? `<a href="${S().esc(waHref)}" target="_blank" rel="noopener" class="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">WA</a>` : ''}
                  </div>
                </td>
                <td><span class="badge-bpom ${prog === 'MEMBER_RUTIN' ? 'bpom-bebas' : (prog === 'MITRA_KLINIK' ? 'bpom-terbatas' : 'bpom-prekursor')}">${S().esc(prog)}</span></td>
                <td class="text-xs">
                  <div>${S().esc(m.penyakit_kronis || '-')}</div>
                  <div class="mt-0.5">${hasAllergy ? `<span class="badge-bpom bpom-keras">Alergi: ${S().esc(m.alergi_list)}</span>` : `<span class="text-[11px]" style="color:var(--ons-text-soft)">Alergi: Tidak Ada</span>`}</div>
                </td>
                <td class="font-mono-num font-bold text-xs text-blue-600">${Number(m.poin_loyalitas || 0)}</td>
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
      if (dq && !`${d.id_dokter} ${d.nama_dokter} ${d.spesialisasi} ${d.no_sip} ${d.no_str} ${d.faskes_klinik} ${d.no_wa}`.toLowerCase().includes(dq)) return false;
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
              const isAktif = String(d.status_dokter || 'AKTIF').toUpperCase() === 'AKTIF';
              const waHref = _buildWaLink(d.no_wa, 'Halo ' + (d.nama_dokter || 'Dokter') + ', kami dari apotek ingin konfirmasi skrining resep pasien.');
              return `<tr>
                <td>
                  <div class="font-bold text-xs">${S().esc(d.nama_dokter)}</div>
                  <div class="text-[11px]" style="color:var(--ons-text-soft)">${S().esc(d.spesialisasi || 'Dokter Umum')} &bull; <span class="font-mono-num">${S().esc(d.id_dokter)}</span></div>
                </td>
                <td class="font-mono-num text-xs"><div>${S().esc(d.no_sip || '-')}</div><div class="text-[11px]" style="color:var(--ons-text-soft)">${d.no_str ? ('STR ' + S().esc(d.no_str)) : '-'}</div></td>
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

  function renderMasterObatView() {
    const st = S().AppState;
    const seeCost = S().canSeeFinancialCost();
    const canSupplier = S().canAccessSubTab ? S().canAccessSubTab('obat', 'supplier') : seeCost;
    masterTab = (st.subTabs && st.subTabs.obat) || masterTab || 'obat';
    if (masterTab === 'supplier' && !canSupplier) masterTab = 'obat';
    if (!['obat', 'supplier', 'pelanggan', 'dokter'].includes(masterTab)) masterTab = 'obat';

    const { allMeta, filtered } = _getFilteredMasterObatMeta();
    const obatCount = (st.masterObat || []).length;
    const supCount = (st.supplierPbf || []).length;
    const pelCount = (st.members || []).length;
    const dokCount = (st.masterDokter || []).length;

    const tabs = [
      { id: 'obat', label: 'Obat', count: obatCount },
      ...(canSupplier ? [{ id: 'supplier', label: 'Supplier', count: supCount }] : []),
      { id: 'pelanggan', label: 'Pelanggan', count: pelCount },
      { id: 'dokter', label: 'Dokter', count: dokCount }
    ];

    const exportBtns = (fnName) => `
      <button onclick="window.${fnName}('xlsx')" class="ons-btn ons-btn-ghost text-xs py-1.5 px-2.5">Excel</button>
      <button onclick="window.${fnName}('csv')" class="ons-btn ons-btn-ghost text-xs py-1.5 px-2.5">CSV</button>
      <button onclick="window.${fnName}('pdf')" class="ons-btn ons-btn-ghost text-xs py-1.5 px-2.5">PDF</button>
    `;

    let headerActions = '';
    if (masterTab === 'obat') {
      headerActions = `
        ${seeCost ? `<button onclick="window.openObatWizardModal()" class="ons-btn ons-btn-primary text-xs py-1.5 px-2.5">+ Obat</button>
        <button onclick="window.openImportObatModal()" class="ons-btn ons-btn-emerald text-xs py-1.5 px-2.5">Import</button>` : ''}
        <button onclick="window.openPrintMasterLabelsModal()" class="ons-btn ons-btn-ghost text-xs py-1.5 px-2.5" title="Cetak Stiker Barcode">Barcode</button>
        ${exportBtns('exportMasterObat')}
      `;
    } else if (masterTab === 'supplier') {
      headerActions = `
        <button onclick="window.openSupplierPbfModal('')" class="ons-btn ons-btn-primary text-xs py-1.5 px-2.5">+ Supplier</button>
        <button onclick="window.navigateView('defecta','sp')" class="ons-btn ons-btn-ghost text-xs py-1.5 px-2.5">Buat SP</button>
        ${exportBtns('exportMasterSupplier')}
      `;
    } else if (masterTab === 'pelanggan') {
      headerActions = `
        <button onclick="window.openMasterPelangganModal('')" class="ons-btn ons-btn-primary text-xs py-1.5 px-2.5">+ Pelanggan</button>
        <button onclick="window.navigateView('eresep-prb','prb')" class="ons-btn ons-btn-ghost text-xs py-1.5 px-2.5">Pantau Terapi</button>
        ${exportBtns('exportMasterPelanggan')}
      `;
    } else {
      headerActions = `
        <button onclick="window.openMasterDokterModal('')" class="ons-btn ons-btn-primary text-xs py-1.5 px-2.5">+ Dokter</button>
        <button onclick="window.navigateView('eresep-prb','erx')" class="ons-btn ons-btn-ghost text-xs py-1.5 px-2.5">E-Resep</button>
        ${exportBtns('exportMasterDokter')}
      `;
    }

    const bodyHtml = masterTab === 'supplier'
      ? _renderMasterSupplierSubTab()
      : (masterTab === 'pelanggan'
        ? _renderMasterPelangganSubTab()
        : (masterTab === 'dokter'
          ? _renderMasterDokterSubTab()
          : _renderMasterObatSubTab(seeCost, allMeta, filtered)));

    return `<div class="space-y-3 ons-view-enter">
      <div class="ons-md-shell space-y-2">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="min-w-0">
            <h1 class="text-base sm:text-lg font-extrabold tracking-tight">Master Data Apotek</h1>
            <p class="text-[11px]" style="color:var(--ons-text-soft)">Kelola terpusat katalog Obat KFA, Supplier PBF, Pelanggan Apotek &amp; Dokter Mitra.</p>
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
    masterTab = (req === 'supplier' && !canSupplier) ? 'obat' : (['obat', 'supplier', 'pelanggan', 'dokter'].includes(req) ? req : 'obat');
    if (S().AppState.subTabs) S().AppState.subTabs.obat = masterTab;
    S().AppState.activeSubTab = masterTab;
    global.renderActiveView();
    if (typeof global.syncNavHighlight === 'function') global.syncNavHighlight();
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

  global.openMasterPelangganModal = (idMember) => {
    const existing = idMember ? (S().AppState.members || []).find((m) => m.id_member === idMember) : null;
    const prog = existing ? _normMemberProg(existing) : 'UMUM';
    S().openModal(`<div class="p-6 space-y-3 text-xs">
      <div class="flex justify-between items-center">
        <h3 class="font-bold text-base">${existing ? ('Edit Pelanggan: ' + S().esc(existing.nama_pasien)) : 'Tambah Pelanggan / Member Baru'}</h3>
        <button type="button" onclick="ONSStore.closeModal()" class="text-xl">&times;</button>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><label class="font-semibold block mb-1">Nama Lengkap *</label><input id="mdPelNama" class="ons-input" value="${S().esc(existing ? existing.nama_pasien : '')}" placeholder="Cth: Tn. Ahmad Fauzi"/></div>
        <div><label class="font-semibold block mb-1">No. WhatsApp / HP</label><input id="mdPelHp" class="ons-input font-mono-num" value="${S().esc(existing ? (existing.no_hp || '') : '628')}" placeholder="62812xxxx"/></div>
        <div><label class="font-semibold block mb-1">Segmen Pelanggan</label>
          <select id="mdPelProg" class="ons-select">
            <option value="UMUM" ${prog === 'UMUM' ? 'selected' : ''}>UMUM (Reguler)</option>
            <option value="MEMBER_RUTIN" ${prog === 'MEMBER_RUTIN' ? 'selected' : ''}>MEMBER_RUTIN (Terapi Rutin / Kronis)</option>
            <option value="MITRA_KLINIK" ${prog === 'MITRA_KLINIK' ? 'selected' : ''}>MITRA_KLINIK / Faskes</option>
          </select>
        </div>
        <div><label class="font-semibold block mb-1">Tanggal Lahir</label><input id="mdPelLahir" type="date" class="ons-input font-mono-num" value="${S().esc(existing && existing.tgl_lahir ? String(existing.tgl_lahir).slice(0, 10) : '')}"/></div>
        <div><label class="font-semibold block mb-1">Riwayat Alergi Obat</label><input id="mdPelAlergi" class="ons-input" value="${S().esc(existing ? (existing.alergi_list || 'Tidak Ada') : 'Tidak Ada')}" placeholder="Tidak Ada / Penisilin / Sulfa"/></div>
        <div><label class="font-semibold block mb-1">Poin Loyalitas</label><input id="mdPelPoin" type="number" min="0" class="ons-input font-mono-num" value="${existing ? Number(existing.poin_loyalitas || 0) : 0}"/></div>
        <div class="sm:col-span-2"><label class="font-semibold block mb-1">Riwayat Penyakit / Catatan Klinis</label><input id="mdPelPenyakit" class="ons-input" value="${S().esc(existing ? (existing.penyakit_kronis || '-') : '-')}" placeholder="Cth: Hipertensi, Diabetes Tipe 2, atau -"/></div>
      </div>
      <button type="button" onclick="window.submitMasterPelanggan('${S().esc(idMember || '')}')" class="ons-btn ons-btn-emerald w-full text-xs">Simpan Data Pelanggan</button>
    </div>`, '580px');
  };

  global.submitMasterPelanggan = async (idMember) => {
    try {
      const nama = ((document.getElementById('mdPelNama') || {}).value || '').trim();
      if (!nama) throw new Error('Nama pelanggan wajib diisi!');
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
    const status = String((existing && existing.status_dokter) || 'AKTIF').toUpperCase();
    S().openModal(`<div class="p-6 space-y-3 text-xs">
      <div class="flex justify-between items-center">
        <h3 class="font-bold text-base">${existing ? ('Edit Dokter: ' + S().esc(existing.nama_dokter)) : 'Tambah Dokter Mitra Baru'}</h3>
        <button type="button" onclick="ONSStore.closeModal()" class="text-xl">&times;</button>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><label class="font-semibold block mb-1">Nama Dokter &amp; Gelar *</label><input id="mdDokNama" class="ons-input" value="${S().esc(existing ? existing.nama_dokter : '')}" placeholder="Cth: dr. Siti Aminah, Sp.PD"/></div>
        <div><label class="font-semibold block mb-1">Spesialisasi / Poli</label><input id="mdDokSpec" class="ons-input" value="${S().esc(existing ? (existing.spesialisasi || 'Dokter Umum') : 'Dokter Umum')}" placeholder="Dokter Umum / Sp.PD / Sp.A"/></div>
        <div><label class="font-semibold block mb-1">Nomor SIP Dokter</label><input id="mdDokSip" class="ons-input font-mono-num" value="${S().esc(existing ? (existing.no_sip || '') : '')}" placeholder="446/xxx/SIP-DOK/2026"/></div>
        <div><label class="font-semibold block mb-1">Nomor STR</label><input id="mdDokStr" class="ons-input font-mono-num" value="${S().esc(existing ? (existing.no_str || '') : '')}" placeholder="3111xxxxxxxxxxxx"/></div>
        <div><label class="font-semibold block mb-1">Klinik / RS Mitra</label><input id="mdDokFaskes" class="ons-input" value="${S().esc(existing ? (existing.faskes_klinik || '') : '')}" placeholder="Nama Klinik / RS / Praktek"/></div>
        <div><label class="font-semibold block mb-1">No. WhatsApp Dokter</label><input id="mdDokWa" class="ons-input font-mono-num" value="${S().esc(existing ? (existing.no_wa || '628') : '628')}" placeholder="62812xxxx"/></div>
        <div><label class="font-semibold block mb-1">Email</label><input id="mdDokEmail" class="ons-input" value="${S().esc(existing ? (existing.email || '') : '')}" placeholder="dokter@klinik.id"/></div>
        <div><label class="font-semibold block mb-1">Status Kemitraan</label>
          <select id="mdDokStatus" class="ons-select">
            <option value="AKTIF" ${status === 'AKTIF' ? 'selected' : ''}>AKTIF</option>
            <option value="NONAKTIF" ${status === 'NONAKTIF' ? 'selected' : ''}>NONAKTIF</option>
          </select>
        </div>
        <div class="sm:col-span-2"><label class="font-semibold block mb-1">Alamat Praktek / Faskes</label><input id="mdDokAlamat" class="ons-input" value="${S().esc(existing ? (existing.alamat || '') : '')}" placeholder="Jl. ..."/></div>
        <div class="sm:col-span-2"><label class="font-semibold block mb-1">Catatan Kolaborasi Apotek</label><input id="mdDokCatatan" class="ons-input" value="${S().esc(existing ? (existing.catatan || '') : '')}" placeholder="Jadwal praktek / poli / info konfirmasi resep"/></div>
      </div>
      <button type="button" onclick="window.submitMasterDokter('${S().esc(idDokter || '')}')" class="ons-btn ons-btn-emerald w-full text-xs">Simpan Data Dokter</button>
    </div>`, '600px');
  };

  global.submitMasterDokter = async (idDokter) => {
    try {
      const nama = ((document.getElementById('mdDokNama') || {}).value || '').trim();
      if (!nama) throw new Error('Nama dokter wajib diisi!');
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
      { key: 'skor_sla', label: 'SLA (%)', type: 'int', width: 10 },
      { key: 'status_pbf', label: 'Status', type: 'status', width: 12 }
    ];
    const rows = list.map((p) => ({
      id_pbf: p.id_pbf || '-',
      nama_pbf: p.nama_pbf || '-',
      kode_cdob: p.kode_cdob || '-',
      npwp_pbf: p.npwp_pbf || '-',
      kontak_wa: p.kontak_wa || '-',
      email_pbf: p.email_pbf || '-',
      lead_time_hari: Number(p.lead_time_hari || 0),
      termin_hari: Number(p.termin_hari || 0),
      skor_sla: Number(p.skor_sla || 0),
      status_pbf: p.status_pbf || 'AKTIF'
    }));
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
      { key: 'nama_pasien', label: 'Nama Pelanggan / Pasien', width: 28, wrap: true },
      { key: 'no_hp', label: 'No. WhatsApp / HP', width: 16 },
      { key: 'program_prb', label: 'Segmen', width: 15 },
      { key: 'tgl_lahir', label: 'Tanggal Lahir', type: 'date', width: 14 },
      { key: 'alergi_list', label: 'Riwayat Alergi', width: 22, wrap: true },
      { key: 'penyakit_kronis', label: 'Riwayat Penyakit', width: 28, wrap: true },
      { key: 'poin_loyalitas', label: 'Poin', type: 'int', sum: true, width: 10 }
    ];
    const rows = list.map((m) => ({
      id_member: m.id_member || '-',
      nama_pasien: m.nama_pasien || '-',
      no_hp: m.no_hp || '-',
      program_prb: _normMemberProg(m),
      tgl_lahir: m.tgl_lahir ? String(m.tgl_lahir).slice(0, 10) : '-',
      alergi_list: m.alergi_list || 'Tidak Ada',
      penyakit_kronis: m.penyakit_kronis || '-',
      poin_loyalitas: Number(m.poin_loyalitas || 0)
    }));
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
      { key: 'faskes_klinik', label: 'Klinik / RS Mitra', width: 26, wrap: true },
      { key: 'no_wa', label: 'No. WhatsApp', width: 16 },
      { key: 'email', label: 'Email', width: 24 },
      { key: 'alamat', label: 'Alamat Praktek', width: 28, wrap: true },
      { key: 'status_dokter', label: 'Status', type: 'status', width: 12 }
    ];
    const rows = list.map((d) => ({
      id_dokter: d.id_dokter || '-',
      nama_dokter: d.nama_dokter || '-',
      spesialisasi: d.spesialisasi || 'Dokter Umum',
      no_sip: d.no_sip || '-',
      no_str: d.no_str || '-',
      faskes_klinik: d.faskes_klinik || '-',
      no_wa: d.no_wa || '-',
      email: d.email || '-',
      alamat: d.alamat || '-',
      status_dokter: d.status_dokter || 'AKTIF'
    }));
    return S().exportDataset(
      fmt || 'xlsx',
      'Direktori Master Dokter Mitra & Penulis Resep' + (hasFilteredRows ? ' (Terfilter)' : ''),
      'Master_Dokter_Mitra_ONS_' + dateTag,
      headers,
      rows,
      { sheetName: 'Master_Dokter', subtitle: 'Daftar dokter penulis resep, No. SIP/STR & faskes mitra (' + rows.length + ' dokter)' }
    );
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
  global.setMasterSort = (s) => { masterSortBy = s || 'NAMA'; global.renderActiveView(); };
  global.setMasterViewMode = (m) => { masterViewMode = m === 'CARD' ? 'CARD' : 'TABLE'; global.renderActiveView(); };
  global.resetMasterFilter = () => { masterFilterGol = ''; masterFilterStok = 'SEMUA'; masterSearchQ = ''; masterSortBy = 'NAMA'; global.renderActiveView(); };

  global.openObatDetailModal = (idObat) => {
    const o = (S().AppState.masterObat || []).find((x) => x.id_obat === idObat);
    if (!o) return;
    const st = S().AppState;
    const m = buildObatMeta(o);
    const seeCost = S().canSeeFinancialCost();
    const batches = (st.stokBatch || [])
      .filter((b) => b.id_obat === idObat && String(b.status_batch || 'AKTIF') === 'AKTIF')
      .sort((a, b) => String(a.tgl_kadaluarsa).localeCompare(String(b.tgl_kadaluarsa)));
    const nearEd = S().getNearEdBatchInfo ? S().getNearEdBatchInfo(idObat, 90) : { hasNearEd: false };
    const multiOn = S().isMultiBranchEnabled ? S().isMultiBranchEnabled() : false;
    const cmpItem = ((st.branchStockCompare && st.branchStockCompare.items) || []).find((x) => x.id_obat === idObat);
    const branches = (S().getActiveBranches && S().getActiveBranches()) || ['ONS-01'];
    const perCb = (cmpItem && cmpItem.stok_per_cabang) || {};

    S().openDrawer(`<div class="p-6 space-y-4 text-xs">
      <div class="flex items-start justify-between gap-2 border-b pb-3" style="border-color:var(--ons-border)">
        <div>
          <div class="flex flex-wrap items-center gap-1.5 mb-1">
            ${S().bpomBadge(o.golongan_bpom)}
            <span class="font-mono-num px-2 py-0.5 rounded border" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">${S().esc(o.id_obat)}</span>
            ${m.isCold ? `<span class="badge-bpom bpom-terbatas">COLD CHAIN 2-8&deg;C</span>` : ''}
            ${nearEd.hasNearEd ? `<span class="badge-bpom bpom-prekursor">PROMO NEAR-ED -${nearEd.suggestedDiscPct}%</span>` : ''}
          </div>
          <h3 class="font-extrabold text-base">${S().esc(o.nama_dagang)}</h3>
          <p style="color:var(--ons-text-soft)">${S().esc(o.zat_aktif)} ${o.kekuatan ? ('&bull; ' + S().esc(o.kekuatan)) : ''}</p>
        </div>
        <button onclick="ONSStore.closeDrawer()" class="text-2xl px-1">&times;</button>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        <div class="p-2.5 rounded-xl border" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
          <div style="color:var(--ons-text-soft)">Stok Aktif (${S().esc(st.cabangId || 'ONS-01')})</div>
          <div class="text-base font-extrabold font-mono-num" style="color:${m.stokTone.color}">${m.stok} ${S().esc(o.satuan_dasar)}</div>
        </div>
        <div class="p-2.5 rounded-xl border" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
          <div style="color:var(--ons-text-soft)">Harga Umum</div>
          <div class="text-base font-extrabold font-mono-num text-blue-600">${S().rp(o.harga_umum)}</div>
        </div>
        <div class="p-2.5 rounded-xl border" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
          <div style="color:var(--ons-text-soft)">Harga Member</div>
          <div class="text-base font-extrabold font-mono-num text-emerald-600">${S().rp(o.harga_member || o.harga_umum)}</div>
        </div>
        <div class="p-2.5 rounded-xl border" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
          <div style="color:var(--ons-text-soft)">Grosir (&ge;${Number(o.min_qty_grosir || 10)} ${S().esc(o.satuan_dasar)})</div>
          <div class="text-sm font-extrabold font-mono-num text-blue-700 dark:text-blue-400">${S().rp(o.harga_grosir || o.harga_member || o.harga_umum)}</div>
        </div>
        <div class="p-2.5 rounded-xl border" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
          <div style="color:var(--ons-text-soft)">Harga Faskes / Mitra</div>
          <div class="text-sm font-extrabold font-mono-num text-slate-700 dark:text-slate-200">${S().rp(o.harga_faskes || o.harga_grosir || o.harga_umum)}</div>
        </div>
        <div class="p-2.5 rounded-xl border" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
          <div style="color:var(--ons-text-soft)">${seeCost ? 'HPP Rata-Rata' : 'Batas Min. Stok'}</div>
          <div class="text-sm font-extrabold font-mono-num">${seeCost ? S().rp(o.hpp_avg) : (m.min + ' ' + S().esc(o.satuan_dasar))}</div>
        </div>
      </div>

      ${multiOn && branches.length > 1 ? `<div class="p-3 rounded-xl border space-y-2" style="border-color:var(--ons-border)">
        <div class="font-bold">Komparasi Stok Antar-Outlet Real-Time</div>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
          ${branches.map((br) => {
            const qBr = br === (st.cabangId || 'ONS-01') ? m.stok : Number(perCb[br] || 0);
            return `<div class="p-2 rounded-lg text-center border" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
              <div class="text-[10px] font-bold">${S().esc(br)}</div>
              <div class="text-sm font-extrabold font-mono-num ${qBr > 0 ? 'text-emerald-600' : 'text-red-500'}">${qBr}</div>
            </div>`;
          }).join('')}
        </div>
      </div>` : ''}

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 rounded-xl border" style="border-color:var(--ons-border)">
        <div><b>Kode KFA:</b> <span class="font-mono-num">${S().esc(o.kode_kfa || '-')}</span></div>
        <div><b>NIE BPOM:</b> <span class="font-mono-num">${S().esc(o.nie_bpom || '-')}</span></div>
        <div><b>Lokasi Rak:</b> <span class="font-mono-num">${S().esc(o.rak_lokasi || '-')}</span></div>
        <div><b>Suhu Simpan:</b> ${S().esc(o.suhu_simpan || 'Suhu Ruang')}</div>
        <div class="sm:col-span-2"><b>Konversi:</b> 1 ${S().esc(o.satuan_besar || 'Box')} = ${Number(o.rasio_besar || 100)} ${S().esc(o.satuan_dasar)} &bull; 1 ${S().esc(o.satuan_sedang || 'Strip')} = ${Number(o.rasio_sedang || 10)} ${S().esc(o.satuan_dasar)}</div>
      </div>

      <div>
        <div class="font-bold mb-1.5">Daftar Batch Aktif FEFO (${batches.length})</div>
        <div class="ons-table-wrap max-h-44 overflow-y-auto">
          <table class="ons-table">
            <thead><tr><th>No. Batch</th><th>Kadaluarsa</th><th>Sisa Qty</th><th>Rak</th></tr></thead>
            <tbody>
              ${batches.length ? batches.map((b) => {
                const days = S().daysUntil(b.tgl_kadaluarsa);
                return `<tr>
                  <td class="font-mono-num font-bold">${S().esc(b.no_batch)}</td>
                  <td class="font-mono-num ${days <= 90 ? 'text-red-600 font-bold' : ''}">${S().esc(b.tgl_kadaluarsa)} (${days}h)</td>
                  <td class="font-mono-num font-bold">${Number(b.qty_sisa || 0)} ${S().esc(o.satuan_dasar)}</td>
                  <td class="font-mono-num">${S().esc(b.rak_penyimpanan || o.rak_lokasi || '-')}</td>
                </tr>`;
              }).join('') : '<tr><td colspan="4" class="text-center" style="color:var(--ons-text-soft)">Stok batch kosong — segera lakukan PO atau Mutasi Cabang.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>

      <div class="flex flex-wrap justify-between gap-2 pt-2 border-t" style="border-color:var(--ons-border)">
        <button onclick="ONSStore.closeDrawer();navigateView('gudang','transfer')" class="ons-btn ons-btn-ghost text-xs">Mutasi Cabang &rarr;</button>
        <div class="flex gap-2">
          <button onclick="window.printCode128Obat('${S().esc(o.id_obat)}')" class="ons-btn ons-btn-ghost text-xs">Cetak Barcode</button>
          ${seeCost ? `<button onclick="ONSStore.closeDrawer();window.openObatWizardModal('${S().esc(o.id_obat)}')" class="ons-btn ons-btn-primary text-xs">Edit Produk</button>` : ''}
        </div>
      </div>
    </div>`, '580px');
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
      return el ? Number(el.value || 0) : Number(def || 0);
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
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="p-3.5 rounded-xl border" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
                      <label class="font-bold block mb-1">HPP Beli Rata-Rata (Rp)</label>
                      <input id="wHpp" type="number" min="0" class="${inpCls} font-mono-num font-bold" value="${o.hpp_avg}"/>
                      <div class="text-[11px] mt-1" style="color:var(--ons-text-soft)">Harga pokok modal per satuan dasar.</div>
                    </div>
                    <div class="p-3.5 rounded-xl border" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
                      <label class="font-bold block mb-1">Harga Umum / Reguler (Rp)</label>
                      <input id="wHrgUmum" type="number" min="0" class="${inpCls} font-mono-num font-bold text-blue-600" value="${o.harga_umum}"/>
                      <div id="wizMarginUmumTxt" class="text-[11px] mt-1 font-semibold text-emerald-600">Margin: -</div>
                    </div>
                    <div class="p-3.5 rounded-xl border" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
                      <label class="font-bold block mb-1">Harga Member (Rp)</label>
                      <input id="wHrgMem" type="number" min="0" class="${inpCls} font-mono-num font-bold" value="${o.harga_member}"/>
                      <div class="text-[11px] mt-1" style="color:var(--ons-text-soft)">Aktif otomatis untuk pelanggan member terdaftar.</div>
                    </div>
                    <div>
                      <label class="font-bold block mb-1.5">Harga Grosir / B2B (Rp)</label>
                      <input id="wHrgGrosir" type="number" min="0" class="${inpCls} font-mono-num" value="${o.harga_grosir || o.harga_member}"/>
                    </div>
                    <div>
                      <label class="font-bold block mb-1.5">Minimal Qty Grosir</label>
                      <input id="wMinQtyGrosir" type="number" min="1" class="${inpCls} font-mono-num" value="${o.min_qty_grosir || 10}"/>
                    </div>
                    <div>
                      <label class="font-bold block mb-1.5">Harga Faskes / Klinik Mitra (Rp)</label>
                      <input id="wHrgFaskes" type="number" min="0" class="${inpCls} font-mono-num" value="${o.harga_faskes || o.harga_grosir || o.harga_member || o.harga_umum}"/>
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
      return el ? Number(el.value || 0) : 0;
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
    const hpp = Number((document.getElementById('wHpp') || {}).value || 0);
    if (hpp <= 0) {
      global.toast('Masukkan nilai HPP Beli terlebih dahulu agar markup bisa dihitung.', 'warn');
      return;
    }
    const rnd = (x) => Math.max(100, Math.round(x / 100) * 100);
    const umum = rnd(hpp * (1 + Number(pct || 25) / 100));
    const mem = rnd(Math.max(hpp, umum * 0.94));
    const grosir = rnd(Math.max(hpp, umum * 0.88));
    const faskes = rnd(Math.max(hpp, umum * 0.90));
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
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
      if (headerIdx < 0) headerIdx = 0;
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

    // Filter Batch Tab
    const gq = gudangBatchQ.trim().toLowerCase();
    const expiredCount = sorted.filter((b) => String(b.status_batch || 'AKTIF') === 'AKTIF' && Number(b.qty_sisa || 0) > 0 && S().daysUntil(b.tgl_kadaluarsa) < 0).length;
    const kritisCount = sorted.filter((b) => String(b.status_batch || 'AKTIF') === 'AKTIF' && Number(b.qty_sisa || 0) > 0 && S().daysUntil(b.tgl_kadaluarsa) >= 0 && S().daysUntil(b.tgl_kadaluarsa) <= 90).length;
    const filteredBatches = sorted.filter((b) => {
      const o = st.masterObat.find((m) => m.id_obat === b.id_obat);
      const d = S().daysUntil(b.tgl_kadaluarsa);
      const activeQty = String(b.status_batch || 'AKTIF') === 'AKTIF' && Number(b.qty_sisa || 0) > 0;
      if (gudangBatchFilter === 'KADALUARSA' && !(activeQty && d < 0)) return false;
      if (gudangBatchFilter === 'KRITIS' && !(activeQty && d >= 0 && d <= 90)) return false;
      if (gudangBatchFilter === 'KARANTINA' && !(String(b.status_batch || 'AKTIF') === 'KARANTINA_RECALL' || Number(b.qty_karantina || 0) > 0 || String(b.status_batch) === 'RETUR_PBF')) return false;
      if (gudangBatchFilter === 'AMAN' && !(activeQty && d > 90)) return false;
      if (gq) {
        const hay = `${b.no_batch} ${b.no_faktur_pbf} ${b.no_sp || ''} ${o ? o.nama_dagang : b.id_obat}`.toLowerCase();
        if (!hay.includes(gq)) return false;
      }
      return true;
    });

    // Opname Physical Count Draft Rows + Filter Lokasi Rak & Mode HP
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

    return `<div class="space-y-5 ons-view-enter">
      <div class="ons-page-header">
        <div>
          <h1 class="text-xl font-extrabold">Gudang Batch FEFO, Kartu Stok, Monitor Suhu &amp; Opname</h1>
          <p class="text-xs" style="color:var(--ons-text-soft)">Kelola batch kedaluwarsa terdekat, buku mutasi Kartu Stok BPOM, log suhu kulkas 2&ndash;8&deg;C, dan penyesuaian fisik Stock Opname.</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <div class="ons-tab-bar">
            <button onclick="window.setGudangTab('batch')" class="ons-tab-btn ${gudangTab === 'batch' ? 'active' : ''}">Stok Batch &amp; FEFO (${sorted.length})</button>
            <button onclick="window.setGudangTab('kartu-stok')" class="ons-tab-btn ${gudangTab === 'kartu-stok' ? 'active' : ''}">Kartu Stok Digital (${(st.mutasiStok || []).length})</button>
            <button onclick="window.setGudangTab('coldchain')" class="ons-tab-btn ${gudangTab === 'coldchain' ? 'active' : ''}">Monitor Suhu (2&ndash;8&deg;C) (${coldLogs.length})${hasColdAlarm ? ' &#9888;' : ''}</button>
            ${(seeCost || S().canAccessSubTab('gudang', 'opname')) ? `<button onclick="window.setGudangTab('opname')" class="ons-tab-btn ${gudangTab === 'opname' ? 'active' : ''}">Stock Opname Fisik</button>` : ''}
            ${((S().isMultiBranchEnabled && S().isMultiBranchEnabled()) && (seeCost || S().canAccessSubTab('gudang', 'transfer'))) ? `<button onclick="window.setGudangTab('transfer')" class="ons-tab-btn ${gudangTab === 'transfer' ? 'active' : ''}">Mutasi Antar-Cabang (${(st.mutasiCabang || []).length})</button>` : ''}
          </div>
        </div>
      </div>

      ${gudangTab === 'coldchain' ? (() => {
        const coldItems = (st.masterObat || []).filter((o) => /2\s*[-–]\s*8|cold|chiller|kulkas/i.test(`${o.suhu_simpan || ''} ${o.rak_lokasi || ''}`));
        const alarmCount = coldLogs.filter((c) => String(c.status_alarm || 'NORMAL') !== 'NORMAL').length;
        const unitPresets = Array.from(new Set(['CHILLER-VAKSIN-01', 'CHILLER-INSULIN-01', 'KULKAS-UMUM-01'].concat(coldLogs.map((c) => c.id_kulkas).filter(Boolean))));
        return `<div class="space-y-4">
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div class="ons-card p-3.5"><div class="text-xs" style="color:var(--ons-text-soft)">Suhu Kulkas Terakhir</div><div class="text-xl font-extrabold font-mono-num ${latestCold ? (hasColdAlarm ? 'text-red-600' : 'text-emerald-600') : 'text-amber-600'}">${latestCold ? (Number(latestCold.suhu_celcius || 0).toFixed(1) + '&deg;C') : 'Belum Dicatat'}</div></div>
            <div class="ons-card p-3.5"><div class="text-xs" style="color:var(--ons-text-soft)">Status Rentang CDOB (2&ndash;8&deg;C)</div><div class="text-sm font-extrabold mt-1">${latestCold ? `<span class="badge-bpom ${hasColdAlarm ? 'bpom-keras' : 'bpom-bebas'}">${S().esc(latestCold.status_alarm || 'NORMAL')}</span>` : '<span class="badge-bpom bpom-prekursor">MENUNGGU CATATAN</span>'}</div></div>
            <div class="ons-card p-3.5"><div class="text-xs" style="color:var(--ons-text-soft)">Kelembapan &amp; Total Log</div><div class="text-lg font-bold font-mono-num">${latestCold ? (Number(latestCold.kelembapan || 55) + '%') : '-'} <span class="text-xs font-normal" style="color:var(--ons-text-soft)">(${coldLogs.length} log${alarmCount ? `, ${alarmCount} alarm` : ''})</span></div></div>
            <div class="ons-card p-3.5"><div class="text-xs" style="color:var(--ons-text-soft)">Item Obat Cold-Chain</div><div class="text-xl font-extrabold font-mono-num text-blue-600">${coldItems.length} Produk</div></div>
          </div>

          <div class="ons-card p-4 space-y-3 text-xs">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 class="font-bold text-sm">Catat Monitoring Suhu Chiller / Kulkas (Standar CDOB 2&ndash;8&deg;C)</h3>
                <p style="color:var(--ons-text-soft)">Pencatatan otomatis mengecek rentang aman 2.0&deg;C &ndash; 8.0&deg;C dan menandai alarm bila suhu keluar batas.</p>
              </div>
              <button type="button" onclick="window.printColdChainLogCdob()" class="ons-btn ons-btn-ghost text-xs">Cetak Kartu Log Suhu (A4)</button>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
              <div class="lg:col-span-3">
                <label class="font-semibold block mb-1">ID Kulkas / Chiller *</label>
                <input id="ccKulkasInp" list="ccKulkasPresets" class="ons-input font-mono-num" value="${S().esc((latestCold && latestCold.id_kulkas) || 'CHILLER-VAKSIN-01')}"/>
                <datalist id="ccKulkasPresets">${unitPresets.map((u) => `<option value="${S().esc(u)}"></option>`).join('')}</datalist>
              </div>
              <div class="lg:col-span-2">
                <label class="font-semibold block mb-1">Suhu Terukur (&deg;C) *</label>
                <input id="ccSuhuInp" type="number" step="0.1" value="${latestCold ? Number(latestCold.suhu_celcius || 4.8).toFixed(1) : '4.8'}" class="ons-input font-mono-num font-bold"/>
              </div>
              <div class="lg:col-span-2">
                <label class="font-semibold block mb-1">Kelembapan (%)</label>
                <input id="ccHumInp" type="number" min="0" max="100" step="1" value="${latestCold ? Number(latestCold.kelembapan || 55) : '55'}" class="ons-input font-mono-num"/>
              </div>
              <div class="lg:col-span-3">
                <label class="font-semibold block mb-1">Tindakan Korektif / Catatan</label>
                <input id="ccTindakanInp" class="ons-input" placeholder="Opsional (cth. Cek segel pintu &amp; kompresor)"/>
              </div>
              <div class="lg:col-span-2">
                <button type="button" onclick="window.submitColdChainLog()" class="ons-btn ons-btn-primary w-full font-bold">+ Simpan Log Suhu</button>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div class="ons-card p-4 lg:col-span-8 space-y-3">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <h3 class="font-bold text-sm">Riwayat Pencatatan Suhu Cold-Chain (${coldLogs.length})</h3>
                <span class="text-[11px]" style="color:var(--ons-text-soft)">Rentang aman: <b>2.0&deg;C &ndash; 8.0&deg;C</b></span>
              </div>
              <div class="ons-table-wrap">
                <table class="ons-table">
                  <thead><tr><th>Waktu Catat</th><th>Unit Kulkas</th><th class="text-right">Suhu (&deg;C)</th><th class="text-right">RH %</th><th>Status</th><th>Petugas</th><th>Catatan / Korektif</th></tr></thead>
                  <tbody>
                    ${coldLogs.length ? coldLogs.slice(0, 60).map((c) => {
                      const isAlarm = String(c.status_alarm || 'NORMAL') !== 'NORMAL';
                      return `<tr>
                        <td class="font-mono-num text-xs">${S().formatTgl(c.timestamp, true)}</td>
                        <td class="font-mono-num text-xs font-semibold">${S().esc(c.id_kulkas || 'CHILLER-VAKSIN-01')}</td>
                        <td class="text-right font-mono-num font-extrabold ${isAlarm ? 'text-red-600' : 'text-emerald-600'}">${Number(c.suhu_celcius || 0).toFixed(1)}&deg;C</td>
                        <td class="text-right font-mono-num text-xs">${Number(c.kelembapan || 55)}%</td>
                        <td><span class="badge-bpom ${isAlarm ? 'bpom-keras' : 'bpom-bebas'}">${S().esc(c.status_alarm || 'NORMAL')}</span></td>
                        <td class="text-xs">${S().esc(c.petugas_id || '-')}</td>
                        <td class="text-xs">${S().esc(c.tindakan_korektif || '-')}</td>
                      </tr>`;
                    }).join('') : '<tr><td colspan="7" class="text-center py-6 text-xs">Belum ada log suhu kulkas/chiller tercatat. Gunakan form di atas untuk mencatat suhu hari ini.</td></tr>'}
                  </tbody>
                </table>
              </div>
            </div>

            <div class="ons-card p-4 lg:col-span-4 space-y-3">
              <h3 class="font-bold text-sm">Obat Penyimpanan 2&ndash;8&deg;C (${coldItems.length})</h3>
              <div class="ons-table-wrap">
                <table class="ons-table">
                  <thead><tr><th>Nama Obat</th><th class="text-right">Stok</th></tr></thead>
                  <tbody>
                    ${coldItems.length ? coldItems.map((o) => `<tr>
                      <td class="text-xs"><div class="font-bold">${S().esc(o.nama_dagang)}</div><div class="text-[10px]" style="color:var(--ons-text-soft)">${S().esc(o.rak_lokasi || 'CHILLER')} &bull; ${S().esc(o.suhu_simpan || '2-8°C')}</div></td>
                      <td class="text-right font-mono-num font-bold text-xs">${S().getSellableStok(o.id_obat)} ${S().esc(o.satuan_dasar || '')}</td>
                    </tr>`).join('') : '<tr><td colspan="2" class="text-center py-5 text-xs">Belum ada produk bertanda Chiller 2&ndash;8&deg;C di Master Obat.</td></tr>'}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>`;
      })() : ''}
      ${gudangTab === 'transfer' && (seeCost || S().canAccessSubTab('gudang', 'transfer')) ? (() => {
        const multiOn = S().isMultiBranchEnabled ? S().isMultiBranchEnabled() : false;
        if (!multiOn) {
          return `<div class="ons-card p-6 space-y-3 text-xs">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span class="badge-bpom bpom-bebas">Mode 1 Apotek Tunggal (ONS-01)</span>
                <h3 class="font-bold text-base mt-2">Mutasi Antar-Cabang Belum Diaktifkan</h3>
                <p style="color:var(--ons-text-soft)">Saat ini apotek Anda beroperasi sebagai <b>1 outlet tunggal</b> tanpa cabang tambahan, sehingga menu transfer antar-cabang disembunyikan agar tampilan tetap ringkas &amp; fokus.</p>
              </div>
            </div>
            <div class="flex flex-wrap gap-2 pt-1">
              <button type="button" onclick="window.setGudangTab('batch')" class="ons-btn ons-btn-primary text-xs">&larr; Kembali ke Stok Batch &amp; FEFO</button>
              ${S().getRole() === 'Pemilik' ? `<button type="button" onclick="window.toggleMultiBranchMode(true)" class="ons-btn ons-btn-ghost text-xs">Saya Sudah Buka Cabang Baru (Aktifkan Multi-Cabang)</button>` : ''}
            </div>
          </div>`;
        }
        const cmpObj = st.branchStockCompare && !Array.isArray(st.branchStockCompare) ? st.branchStockCompare : null;
        const branchIds = (S().getActiveBranches && S().getActiveBranches()) || ['ONS-01', 'ONS-02'];
        const compList = (cmpObj && Array.isArray(cmpObj.items)) ? cmpObj.items : (Array.isArray(st.branchStockCompare) ? st.branchStockCompare : []);
        const trfList = st.mutasiCabang || [];
        const defDest = branchIds.find((bid) => bid !== st.cabangId) || branchIds[0] || 'ONS-02';
        return `<div class="space-y-4">
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div class="ons-card p-4 lg:col-span-5 space-y-3 text-xs">
              <div class="flex items-center justify-between">
                <h3 class="font-bold text-sm">Kirim Mutasi Stok Antar-Cabang (FEFO)</h3>
                <span class="badge-bpom bpom-terbatas">Gudang ${S().esc(st.cabangId)}</span>
              </div>
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="font-semibold block mb-1">Cabang Asal</label>
                  <select id="trfAsalCab" class="ons-select text-xs">
                    ${branchIds.map((bid) => `<option value="${S().esc(bid)}" ${bid === st.cabangId ? 'selected' : ''}>${S().esc(bid)} — ${S().esc(S().getBranchLabel ? S().getBranchLabel(bid) : bid)}</option>`).join('')}
                  </select>
                </div>
                <div>
                  <label class="font-semibold block mb-1">Cabang Tujuan</label>
                  <select id="trfTujuanCab" class="ons-select text-xs">
                    ${branchIds.map((bid) => `<option value="${S().esc(bid)}" ${bid === defDest ? 'selected' : ''}>${S().esc(bid)} — ${S().esc(S().getBranchLabel ? S().getBranchLabel(bid) : bid)}</option>`).join('')}
                  </select>
                </div>
              </div>
              <div class="grid grid-cols-3 gap-2">
                <div class="col-span-2">
                  <label class="font-semibold block mb-1">Produk Obat *</label>
                  <select id="trfObatId" class="ons-select text-xs">
                    ${st.masterObat.map((o) => `<option value="${S().esc(o.id_obat)}">${S().esc(o.nama_dagang)} (Stok ${S().getSellableStok(o.id_obat)})</option>`).join('')}
                  </select>
                </div>
                <div>
                  <label class="font-semibold block mb-1">Qty Kirim *</label>
                  <input id="trfQtyInp" type="number" min="1" value="10" class="ons-input font-mono-num text-right text-xs"/>
                </div>
              </div>
              <div>
                <label class="font-semibold block mb-1">Catatan Surat Jalan</label>
                <input id="trfNoteInp" class="ons-input text-xs" placeholder="Cth: Permintaan darurat cabang / rebalancing stok ED"/>
              </div>
              <button onclick="window.submitMutasiCabangSend()" class="ons-btn ons-btn-primary w-full text-xs">Terbitkan Surat Jalan &amp; Kirim Mutasi FEFO</button>
            </div>

            <div class="ons-card p-4 lg:col-span-7 space-y-3">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <h3 class="font-bold text-sm">Komparator Stok Real-Time (${branchIds.length} Outlet)</h3>
                <span class="text-[11px]" style="color:var(--ons-text-soft)">Outlet aktif: <b class="font-mono-num">${S().esc(st.cabangId)}</b></span>
              </div>
              <div class="ons-table-wrap max-h-64 overflow-y-auto">
                <table class="ons-table">
                  <thead><tr><th>Obat</th>${branchIds.map((bid) => `<th class="text-right font-mono-num">${S().esc(bid)}</th>`).join('')}<th class="text-right">Total Grup</th></tr></thead>
                  <tbody>
                    ${(compList.length ? compList : st.masterObat.map((o) => {
                      const perBranch = {};
                      branchIds.forEach((bid) => { perBranch[bid] = bid === st.cabangId ? S().getSellableStok(o.id_obat) : 0; });
                      return { id_obat: o.id_obat, nama_dagang: o.nama_dagang, satuan_dasar: o.satuan_dasar, stok_per_cabang: perBranch, total_semua_cabang: Object.values(perBranch).reduce((a, b) => a + b, 0) };
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
            </div>
          </div>

          <div class="ons-card p-4 space-y-3">
            <h3 class="font-bold text-sm">Riwayat Surat Jalan &amp; Penerimaan Mutasi Antar-Cabang (${trfList.length})</h3>
            <div class="ons-table-wrap">
              <table class="ons-table">
                <thead><tr><th>No. Surat Jalan</th><th>Asal &rarr; Tujuan</th><th>Obat &amp; Batch</th><th>Qty</th><th>Status</th><th>Aksi Cabang</th></tr></thead>
                <tbody>
                  ${trfList.length ? trfList.map((tr) => {
                    const done = String(tr.status_transfer || '') === 'DITERIMA';
                    let trLines = [];
                    try { trLines = JSON.parse(tr.items_json || '[]'); } catch (e) {}
                    const firstLn = trLines[0] || {};
                    const prodTitle = trLines.length > 1
                      ? `${firstLn.nama_dagang || 'Item'} (+${trLines.length - 1} lainnya)`
                      : (firstLn.nama_dagang || tr.nama_dagang || '-');
                    const batchInfo = firstLn.no_batch ? `Batch: ${firstLn.no_batch} • ED ${firstLn.tgl_kadaluarsa || '-'}` : (tr.no_batch || '-');
                    const totQty = tr.total_qty_dasar !== undefined ? tr.total_qty_dasar : (tr.qty_kirim || 0);
                    return `<tr>
                      <td class="font-mono-num text-xs"><b>${S().esc(tr.no_surat_jalan || tr.id_transfer)}</b><br/><span style="color:var(--ons-text-soft)">${S().formatTgl(tr.tanggal_kirim || tr.tgl_kirim, true)}</span></td>
                      <td class="text-xs font-semibold">${S().esc(tr.cabang_asal)} &rarr; ${S().esc(tr.cabang_tujuan)}</td>
                      <td class="text-xs"><b>${S().esc(prodTitle)}</b><br/><span class="font-mono-num" style="color:var(--ons-text-soft)">${S().esc(batchInfo)}</span></td>
                      <td class="font-mono-num font-bold">${totQty}</td>
                      <td><span class="badge-bpom ${done ? 'bpom-bebas' : 'bpom-prekursor'}">${S().esc(tr.status_transfer || 'DIKIRIM')}</span></td>
                      <td>
                        <div class="flex flex-wrap gap-1.5">
                          <button onclick="window.printSuratJalanMutasi('${S().esc(tr.id_transfer)}')" class="ons-btn ons-btn-ghost text-xs py-1 px-2">Cetak SJ</button>
                          ${!done ? `<button onclick="window.receiveMutasiCabang('${S().esc(tr.id_transfer)}')" class="ons-btn ons-btn-emerald text-xs py-1 px-2.5">Terima Barang Masuk</button>` : `<span class="text-[11px]" style="color:var(--ons-text-soft)">Diterima ${S().esc(tr.diterima_oleh || '')}</span>`}
                        </div>
                      </td>
                    </tr>`;
                  }).join('') : '<tr><td colspan="6" class="text-center py-6 text-xs">Belum ada mutasi antar-cabang tercatat.</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>
        </div>`;
      })() : ''}
      ${(gudangTab === 'coldchain' || gudangTab === 'transfer') ? '' : (gudangTab === 'kartu-stok' ? `
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
                ${['PENJUALAN_POS', 'RETUR_PENJUALAN', 'PEMBELIAN_PBF', 'OPNAME', 'RECALL_KARANTINA', 'RETUR_PBF', 'PENYESUAIAN_MASUK'].map((j) => `<option value="${j}" ${mutasiFilterJenis === j ? 'selected' : ''}>${j}</option>`).join('')}
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
      ` : (gudangTab === 'opname' && (seeCost || S().canAccessSubTab('gudang', 'opname'))) ? `
        <div class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
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
                <input id="opnameWorkspaceReason" class="ons-input text-xs w-56" placeholder="Catatan/Alasan SO..." value="${S().esc(opnameDraftReason || 'Stock Opname Rutin Gudang')}" oninput="window.setOpnameDraftReason(this.value)"/>
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
        </div>
      ` : `
        <div class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div class="ons-card p-3.5"><div class="text-xs" style="color:var(--ons-text-soft)">Total Batch Tersedia</div><div class="text-lg font-bold font-mono-num">${sorted.length}</div></div>
            <div class="ons-card p-3.5"><div class="text-xs" style="color:var(--ons-text-soft)">Kadaluarsa / Kritis &le; 90h</div><div class="text-lg font-bold font-mono-num text-red-600">${expiredCount} ED &bull; ${kritisCount} Kritis</div></div>
            <div class="ons-card p-3.5"><div class="text-xs" style="color:var(--ons-text-soft)">Stok Karantina Recall</div><div class="text-lg font-bold font-mono-num text-amber-600">${sorted.reduce((s, b) => s + Number(b.qty_karantina || 0), 0)} Unit</div></div>
            ${seeCost ? `<div class="ons-card p-3.5"><div class="text-xs" style="color:var(--ons-text-soft)">Valuasi Persediaan (HPP)</div><div class="text-lg font-bold font-mono-num text-blue-600">${S().rp(totalNilaiGudang)}</div></div>` : ''}
          </div>
          <div class="ons-card p-4 space-y-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex flex-wrap gap-2 items-center">
                <input class="ons-input text-xs w-60" placeholder="Cari obat, batch, faktur, SP..." value="${S().esc(gudangBatchQ)}" oninput="window.setGudangBatchQ(this.value)"/>
                <div class="ons-tab-bar">
                  ${['SEMUA', 'KADALUARSA', 'KRITIS', 'KARANTINA', 'AMAN'].map((f) => `<button onclick="window.setGudangBatchFilter('${f}')" class="ons-tab-btn ${gudangBatchFilter === f ? 'active' : ''}">${f}</button>`).join('')}
                </div>
              </div>
              ${seeCost ? `<div class="flex flex-wrap gap-2">
                <button onclick="window.openAddManualBatchModal()" class="ons-btn ons-btn-emerald text-xs">+ Input Batch Manual</button>
                <button onclick="window.setGudangTab('opname')" class="ons-btn ons-btn-primary text-xs">Stock Opname Fisik &rarr;</button>
              </div>` : ''}
            </div>
            <div class="ons-table-wrap">
              <table class="ons-table">
                <thead><tr><th>Obat</th><th>No. Batch / Faktur</th><th>ED</th><th>Sisa Qty</th><th>Karantina</th><th>Status</th>${seeCost ? '<th>Aksi Recall</th>' : ''}</tr></thead>
                <tbody>
                  ${filteredBatches.map((b) => {
                    const o = st.masterObat.find((m) => m.id_obat === b.id_obat);
                    const d = S().daysUntil(b.tgl_kadaluarsa);
                    const isEd = d < 0 && Number(b.qty_sisa || 0) > 0;
                    const edBadge = d < 0 ? 'bpom-keras' : (d <= 90 ? 'bpom-keras' : (d <= 180 ? 'bpom-prekursor' : 'bpom-bebas'));
                    return `<tr>
                      <td class="font-semibold">${S().esc(o ? o.nama_dagang : b.id_obat)}</td>
                      <td class="font-mono-num text-xs"><b>${S().esc(b.no_batch)}</b><br/><span style="color:var(--ons-text-soft)">${S().esc(b.no_faktur_pbf)}${b.no_sp && b.no_sp !== '-' ? ' &bull; ' + S().esc(b.no_sp) : ''}</span></td>
                      <td><span class="badge-bpom ${edBadge} font-mono-num">${isEd ? 'KADALUARSA ' : ''}${S().esc(b.tgl_kadaluarsa)} (${d}h)</span></td>
                      <td class="font-mono-num font-bold">${b.qty_sisa}</td>
                      <td class="font-mono-num text-red-600">${b.qty_karantina || 0}</td>
                      <td><span class="badge-bpom ${isEd ? 'bpom-keras' : (b.status_batch === 'AKTIF' ? 'bpom-bebas' : 'bpom-keras')}">${isEd ? 'ED / BLOKIR POS' : S().esc(b.status_batch)}</span></td>
                      ${seeCost ? `<td><button onclick="window.triggerRecallBatch('${b.id_batch}','${S().esc(b.no_batch)}')" ${b.status_batch !== 'AKTIF' ? 'disabled' : ''} class="ons-btn ons-btn-danger text-xs py-1 px-2.5">1-Klik Recall BPOM</button></td>` : ''}
                    </tr>`;
                  }).join('') || '<tr><td colspan="7" class="text-center py-6 text-xs">Tidak ada batch cocok dengan filter ini.</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `)}
    </div>`;
  }

  global.setGudangTab = (t) => {
    gudangTab = t || 'batch';
    if (S().AppState.subTabs) S().AppState.subTabs.gudang = gudangTab;
    global.renderActiveView();
    if (typeof global.syncNavHighlight === 'function') global.syncNavHighlight();
  };

  global.submitColdChainLog = async () => {
    try {
      const idKulkas = ((document.getElementById('ccKulkasInp') || {}).value || 'CHILLER-VAKSIN-01').trim();
      const rawSuhu = (document.getElementById('ccSuhuInp') || {}).value;
      const suhu = Number(rawSuhu);
      if (rawSuhu === '' || rawSuhu === undefined || Number.isNaN(suhu)) {
        throw new Error('Masukkan angka suhu terukur (°C) yang valid.');
      }
      const hum = Number((document.getElementById('ccHumInp') || {}).value || 55);
      const tindakan = ((document.getElementById('ccTindakanInp') || {}).value || '').trim();
      const res = await API().callApi('coldchain.log', {
        id_kulkas: idKulkas,
        suhu_celcius: suhu,
        kelembapan: hum,
        tindakan_korektif: tindakan
      }, { isWrite: true });
      const it = res && res.item;
      const isAlarm = it && String(it.status_alarm || 'NORMAL') !== 'NORMAL';
      global.toast(
        isAlarm
          ? `PERINGATAN COLD-CHAIN: ${idKulkas} tercatat ${suhu.toFixed(1)}°C (di luar rentang 2–8°C)!`
          : `Log suhu ${idKulkas} (${suhu.toFixed(1)}°C) tersimpan.`,
        isAlarm ? 'warn' : 'ok'
      );
      await global.bootLoadState(true);
    } catch (e) { global.toast(e.message, 'err'); }
  };

  global.printColdChainLogCdob = () => {
    const st = S().AppState;
    const logs = (st.coldChain || []).slice().sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || ''))).slice(0, 60);
    const prof = S().getStoreProfile ? S().getStoreProfile() : {};
    S().printHtmlZone(`<div style="max-width:720px;margin:0 auto;font-family:Arial,sans-serif;font-size:11px;color:#111;border:1.5px solid #1e293b;padding:18px;">
      <div style="display:flex;justify-content:space-between;border-bottom:2px solid #1e293b;padding-bottom:8px;margin-bottom:10px;">
        <div>
          <div style="font-size:15px;font-weight:bold;">${S().esc((prof.nama_usaha || 'APOTEK ONS FARMA').toUpperCase())}</div>
          <div>${S().esc(prof.alamat || '')} &bull; APJ: ${S().esc(prof.nama_pemilik || 'apt. Anissa Faradifa R. Is Rumi')}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:13px;font-weight:bold;">KARTU LOG SUHU COLD-CHAIN (2&ndash;8&deg;C)</div>
          <div>Standar Penyimpanan CDOB / BPOM</div>
        </div>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:10.5px;">
        <thead><tr style="background:#f1f5f9;">
          <th style="border:1px solid #cbd5e1;padding:5px;text-align:left;">Waktu</th>
          <th style="border:1px solid #cbd5e1;padding:5px;text-align:left;">Unit Kulkas</th>
          <th style="border:1px solid #cbd5e1;padding:5px;text-align:right;">Suhu</th>
          <th style="border:1px solid #cbd5e1;padding:5px;text-align:right;">RH%</th>
          <th style="border:1px solid #cbd5e1;padding:5px;text-align:left;">Status</th>
          <th style="border:1px solid #cbd5e1;padding:5px;text-align:left;">Petugas &amp; Korektif</th>
        </tr></thead>
        <tbody>
          ${logs.length ? logs.map((c) => `<tr>
            <td style="border:1px solid #cbd5e1;padding:4px 6px;">${S().formatTgl(c.timestamp, true)}</td>
            <td style="border:1px solid #cbd5e1;padding:4px 6px;">${S().esc(c.id_kulkas || '-')}</td>
            <td style="border:1px solid #cbd5e1;padding:4px 6px;text-align:right;font-weight:bold;">${Number(c.suhu_celcius || 0).toFixed(1)}&deg;C</td>
            <td style="border:1px solid #cbd5e1;padding:4px 6px;text-align:right;">${Number(c.kelembapan || 55)}%</td>
            <td style="border:1px solid #cbd5e1;padding:4px 6px;">${S().esc(c.status_alarm || 'NORMAL')}</td>
            <td style="border:1px solid #cbd5e1;padding:4px 6px;">${S().esc(c.petugas_id || '-')}${c.tindakan_korektif && c.tindakan_korektif !== '-' ? ' — ' + S().esc(c.tindakan_korektif) : ''}</td>
          </tr>`).join('') : '<tr><td colspan="6" style="border:1px solid #cbd5e1;padding:12px;text-align:center;">Belum ada catatan log suhu.</td></tr>'}
        </tbody>
      </table>
    </div>`, 'a4');
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
    const entries = Object.keys(opnameDraftQty)
      .filter((id) => opnameDraftQty[id] !== '' && opnameDraftQty[id] !== undefined)
      .map((id) => ({ id_batch: id, qty_fisik: Number(opnameDraftQty[id]), catatan: opnameDraftReason || 'Stock Opname Rutin' }));
    if (!entries.length) { global.toast('Isi minimal 1 hitungan fisik batch sebelum menyimpan!', 'warn'); return; }
    try {
      const res = await API().callApi('stok.opnameSave', { entries, catatan: opnameDraftReason || 'Stock Opname Rutin' }, { isWrite: true });
      opnameDraftQty = {};
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

  function renderDefectaView() {
    const st = S().AppState;
    defectaTab = (st.subTabs && st.subTabs.defecta) || defectaTab || 'order';
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
    const lowStock = st.masterObat.filter((o) => forecastMap[o.id_obat] && forecastMap[o.id_obat].perlu_order);
    const estDos = (idObat) => (forecastMap[idObat] ? forecastMap[idObat].dos : 0);
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

    return `<div class="space-y-5 ons-view-enter">
      <div class="ons-page-header">
        <div>
          <h1 class="text-xl font-extrabold">Defecta Stok &amp; Surat Pesanan (SP A4)</h1>
          <p class="text-xs" style="color:var(--ons-text-soft)">Analisis stok menipis, buat SP otomatis/manual, pratinjau A4 &amp; kirim ke PBF CDOB.</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <div class="ons-tab-bar">
            <button onclick="window.setDefectaTab('order')" class="ons-tab-btn ${defectaTab === 'order' ? 'active' : ''}">Analisis Defecta (${lowStock.length})</button>
            <button onclick="window.setDefectaTab('sp')" class="ons-tab-btn ${defectaTab === 'sp' ? 'active' : ''}">Surat Pesanan (A4) (${(st.suratPesanan || []).length})</button>
          </div>
          <button onclick="window.openCreateSpModal()" class="ons-btn ons-btn-emerald text-xs">+ Buat SP Manual</button>
          <button onclick="window.generateSpFromDefecta()" class="ons-btn ons-btn-primary text-xs">Terbitkan SP Otomatis Defecta</button>
        </div>
      </div>

      ${defectaTab === 'sp' ? (global.ONSProcurementPro ? global.ONSProcurementPro.renderSuratPesananTab() : '') : `
        <div class="ons-card p-4">
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-bold text-sm">Komparator SLA &amp; Termin Supplier PBF Resmi CDOB</h3>
            <button onclick="window.navigateView('obat','supplier')" class="ons-btn ons-btn-ghost text-xs">Kelola Master Supplier &rarr;</button>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            ${st.supplierPbf.map((p) => `<div class="p-3 rounded-xl border space-y-1 ons-card-interactive">
              <div class="font-bold text-sm">${S().esc(p.nama_pbf)}</div>
              <div class="font-mono-num" style="color:var(--ons-text-soft)">${S().esc(p.kode_cdob)}</div>
              <div class="flex justify-between pt-1"><span>Lead Time: <b>${p.lead_time_hari} Hari</b></span><span class="text-emerald-600 font-bold">SLA ${p.skor_sla}%</span></div>
              <div>Termin Kredit: <b>TOP ${p.termin_hari} Hari</b></div>
            </div>`).join('')}
          </div>
        </div>

        ${Object.keys(groupedPbf).length ? `<div class="ons-card p-4 space-y-2">
          <div class="text-xs font-bold">Ringkasan Paket Order Otomatis per Supplier PBF:</div>
          <div class="flex flex-wrap gap-2">
            ${Object.keys(groupedPbf).map((pbfName) => `<button onclick="window.generateSpFromDefecta('${S().esc(pbfName)}')" class="ons-btn ons-btn-ghost text-xs">Buat SP: ${S().esc(pbfName)} (${groupedPbf[pbfName].length} item)</button>`).join('')}
          </div>
        </div>` : ''}

        <div class="ons-card p-4">
          <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <h3 class="font-bold text-sm">Smart Defecta &amp; Peramalan Kebutuhan 30 Hari (${lowStock.length} Item Perlu Reorder)</h3>
              <p class="text-[11px]" style="color:var(--ons-text-soft)">Memperhitungkan rata-rata laku harian 30 hari, Lead Time PBF, dan Safety Stock otomatis.</p>
            </div>
            <span class="text-xs font-mono-num font-bold text-blue-600">Est. Total PO: ${S().rp(lowStock.reduce((acc, o) => acc + getOrderQty(o) * Number(o.hpp_terakhir || o.hpp_avg || 0), 0))}</span>
          </div>
          <div class="ons-table-wrap">
            <table class="ons-table">
              <thead><tr><th>Obat &amp; Golongan</th><th>Stok / ROP</th><th>Laku 30h &amp; DOS</th><th>Qty Order (Forecast)</th><th>PBF &amp; Lead Time</th><th>Estimasi Biaya</th></tr></thead>
              <tbody>
                ${lowStock.length ? lowStock.map((o) => {
                  const s = S().getSellableStok(o.id_obat);
                  const totFisik = S().getTotalStok(o.id_obat);
                  const edBlocked = Math.max(0, totFisik - s);
                  const fc = forecastMap[o.id_obat] || { avg_harian: 0.5, lead_time_hari: 3, reorder_point: Number(o.stok_min || 10), rekomendasi_order: 20, dos: 0 };
                  const qtyOrder = getOrderQty(o);
                  return `<tr>
                    <td><div class="font-bold">${S().esc(o.nama_dagang)}</div><div class="mt-0.5">${S().bpomBadge(o.golongan_bpom)}</div></td>
                    <td class="font-mono-num"><span class="text-red-600 font-bold">${s}</span> / ROP ${fc.reorder_point}${edBlocked > 0 ? `<div class="text-[10px] text-amber-600">(${edBlocked} ED terblokir)</div>` : ''}</td>
                    <td>
                      <div class="font-mono-num text-[11px]" style="color:var(--ons-text-soft)">&plusmn; ${fc.avg_harian}/hr</div>
                      <span class="badge-bpom ${fc.dos <= 5 ? 'bpom-keras' : 'bpom-prekursor'} font-mono-num">&plusmn; ${fc.dos} Hari</span>
                    </td>
                    <td>
                      <div class="flex items-center gap-1">
                        <input type="number" min="1" value="${qtyOrder}" onchange="window.setDefectaOrderQty('${o.id_obat}', this.value)" class="ons-input font-mono-num text-right text-xs w-20 py-1 min-h-0 h-8"/>
                        <span class="text-[11px]" style="color:var(--ons-text-soft)">${S().esc(o.satuan_dasar)}</span>
                      </div>
                      ${fc.rekomendasi_order > 0 ? `<button type="button" onclick="window.setDefectaOrderQty('${o.id_obat}', ${fc.rekomendasi_order})" class="text-[10px] font-semibold text-blue-600 hover:underline mt-0.5">Saran Forecast: ${fc.rekomendasi_order}</button>` : ''}
                    </td>
                    <td class="text-xs"><div>${S().esc(o.pbf_utama)}</div><div class="text-[10px] font-mono-num" style="color:var(--ons-text-soft)">Lead Time: ${fc.lead_time_hari} Hari</div></td>
                    <td class="font-mono-num font-semibold">${S().rp(qtyOrder * Number(o.hpp_terakhir || o.hpp_avg || 0))}</td>
                  </tr>`;
                }).join('') : '<tr><td colspan="6" class="text-center py-6 text-xs">Seluruh stok produk masih aman di atas Reorder Point!</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>

        <div class="ons-card p-4 space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h3 class="font-bold text-sm">Riwayat &amp; Status Surat Pesanan (SP Terintegrasi Faktur &amp; Arsip) (${(st.suratPesanan || []).length})</h3>
            <button onclick="navigateView('doc-engine','surat')" class="ons-btn ons-btn-ghost text-xs">Buka Mesin Surat Resmi &rarr;</button>
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
                        ${!done
                          ? `<button onclick="window.loadSpIntoGrn('${S().esc(sp.id_sp)}')" class="ons-btn ons-btn-emerald text-xs py-1 px-2.5">Terima Faktur (GRN) &rarr;</button>`
                          : `<button onclick="navigateView('faktur','daftar')" class="ons-btn ons-btn-ghost text-xs py-1 px-2.5">Lihat Faktur</button>`}
                      </div>
                    </td>
                  </tr>`;
                }).join('') : '<tr><td colspan="6" class="text-center py-5 text-xs">Belum ada Surat Pesanan tercatat. Klik tombol "Buat SP" di atas untuk menerbitkan SP resmi.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      `}
    </div>`;
  }

  global.setDefectaTab = (t) => {
    if (t === 'supplier') {
      if (typeof global.navigateView === 'function') return global.navigateView('obat', 'supplier');
      if (typeof global.setMasterTab === 'function') return global.setMasterTab('supplier');
    }
    defectaTab = t || 'order';
    if (S().AppState.subTabs) S().AppState.subTabs.defecta = defectaTab;
    global.renderActiveView();
    if (typeof global.syncNavHighlight === 'function') global.syncNavHighlight();
  };
  global.setDefectaOrderQty = (idObat, val) => {
    defectaOrderQty[idObat] = Math.max(1, Number(val || 1));
    global.renderActiveView();
  };
  global.setDefectaSupplierQ = (v) => { global.setMasterSupplierSearch(v); };

  global.openSupplierPbfModal = (idPbf) => {
    const existing = S().AppState.supplierPbf.find((p) => p.id_pbf === idPbf);
    S().openModal(`<div class="p-6 space-y-4 text-xs">
      <div class="flex justify-between items-center">
        <h3 class="font-bold text-base">${existing ? 'Edit Supplier PBF: ' + S().esc(existing.nama_pbf) : 'Tambah Supplier PBF Resmi CDOB'}</h3>
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
        <div><label class="font-semibold block mb-1">Termin Kredit TOP (Hari)</label><input id="pbfTerminInp" type="number" min="0" class="ons-input font-mono-num" value="${existing ? existing.termin_hari : 30}"/></div>
        <div class="sm:col-span-2"><label class="font-semibold block mb-1">Skor SLA Kinerja (%)</label><input id="pbfSlaInp" type="number" min="0" max="100" class="ons-input font-mono-num" value="${existing ? existing.skor_sla : 96}"/></div>
      </div>
      <button onclick="window.submitSupplierPbf('${S().esc(idPbf || '')}')" class="ons-btn ons-btn-emerald w-full text-xs">Simpan Supplier PBF ke Database</button>
    </div>`, '580px');
  };

  global.submitSupplierPbf = async (idPbf) => {
    try {
      await API().callApi('pbf.save', {
        id_pbf: idPbf || '',
        nama_pbf: document.getElementById('pbfNamaInp').value,
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
        create_doc: true,
        catatan: 'SP dibuat otomatis dari analisa Defecta Apotek'
      }, { isWrite: true });
      global.toast('SP Resmi (' + res.item.no_sp + ') tersimpan & draf dikirim ke Arsip Doc Engine!', 'ok');
      await global.bootLoadState(true);
    } catch (e) { global.toast(e.message, 'err'); }
  };

  /**
   * W-07: Terima Faktur PBF Multi-Item GRN, Konsinyasi & Retur BAR-PBF (daftar | input | harga | retur | konsinyasi)
   */
  let fakturTab = 'daftar';
  let fakturListQ = '';
  let fakturListFilter = 'SEMUA';
  let fakturListPbfFilter = '';
  let fakturKonsinyasiPbfFilter = '';
  let returFilterMode = 'NEAR_ED';
  let returSearchQ = '';
  let grnHeader = {
    id_sp: '',
    no_faktur_pbf: '',
    no_sp: '',
    id_pbf: '',
    tgl_jatuh_tempo: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    diskon_pbf: 0,
    ppn_masukan: 0,
    jenis_penerimaan: 'BELI_PUTUS',
    status_bayar: 'BELUM_LUNAS',
    catatan: ''
  };
  let grnItems = [];

  function _getPbfTerminDays(pbfNameOrId) {
    const st = S().AppState;
    const p = (st.supplierPbf || []).find((x) => x.nama_pbf === pbfNameOrId || x.id_pbf === pbfNameOrId);
    const termin = Number((p && p.termin_hari) || 30);
    return Number.isFinite(termin) && termin > 0 ? termin : 30;
  }

  function _dueDateFromTermin(days) {
    return new Date(Date.now() + (Number(days || 30) * 86400000)).toISOString().slice(0, 10);
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
    fakturTab = (st.subTabs && st.subTabs.faktur) || fakturTab || 'daftar';
    ensureGrnInitialized();

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
      if (fq) {
        const hay = `${f.no_faktur_pbf} ${f.no_sp} ${f.id_pbf}`.toLowerCase();
        if (!hay.includes(fq)) return false;
      }
      return true;
    });

    const totalBruto = grnItems.reduce((s, it) => s + (Number(it.qty_dasar || 0) * Number(it.hpp_unit || 0)), 0);
    const nettoGrn = Math.max(0, totalBruto - Number(grnHeader.diskon_pbf || 0) + Number(grnHeader.ppn_masukan || 0));
    const isScanExpanded = Boolean(grnScanState.panelOpen || grnScanState.scanning || grnScanState.previewDataUrl || grnScanState.summary || grnScanState.error);
    const currentPbfTermin = _getPbfTerminDays(grnHeader.id_pbf);

    return `<div class="space-y-5 ons-view-enter">
      <div class="ons-page-header">
        <div>
          <h1 class="text-xl font-extrabold">Pembelian &amp; Faktur PBF</h1>
          <p class="text-xs" style="color:var(--ons-text-soft)">Monitoring faktur &amp; jatuh tempo hutang PBF, terima barang (GRN via SP / Scan OCR), analisa kenaikan HPP, konsinyasi, dan retur BAR-PBF.</p>
        </div>
        <div class="ons-tab-bar">
          <button onclick="window.setFakturTab('daftar')" class="ons-tab-btn ${fakturTab === 'daftar' ? 'active' : ''}">Daftar Faktur PBF (${allFaktur.length})</button>
          <button onclick="window.setFakturTab('input')" class="ons-tab-btn ${fakturTab === 'input' ? 'active' : ''}">Terima Faktur (GRN / Scan)</button>
          <button onclick="window.setFakturTab('harga')" class="ons-tab-btn ${fakturTab === 'harga' ? 'active' : ''}">Analisa Harga &amp; Margin</button>
          <button onclick="window.setFakturTab('retur')" class="ons-tab-btn ${fakturTab === 'retur' ? 'active' : ''}">Retur BAR-PBF (${nearEdBatches.length})</button>
          <button onclick="window.setFakturTab('konsinyasi')" class="ons-tab-btn ${fakturTab === 'konsinyasi' ? 'active' : ''}">Konsinyasi</button>
        </div>
      </div>

      ${fakturTab === 'input' ? `
        <div class="space-y-4">
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
                  <button type="button" onclick="window.navigateView('defecta','sp')" class="ons-btn ons-btn-ghost text-xs">Daftar SP &amp; A4 &rarr;</button>
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
              <h3 class="font-bold text-sm">2. Header Penerimaan Barang (GRN &mdash; CDOB)</h3>
              <span class="text-[11px]" style="color:var(--ons-text-soft)">Termin default supplier: <b class="font-mono-num">${currentPbfTermin} hari</b></span>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div><label class="font-semibold block mb-1">No. Faktur PBF *</label><input class="ons-input font-mono-num" value="${S().esc(grnHeader.no_faktur_pbf)}" oninput="window.setGrnField('no_faktur_pbf', this.value)"/></div>
              <div><label class="font-semibold block mb-1">No. Surat Pesanan (Opsional)</label><input class="ons-input font-mono-num" placeholder="Kosongkan jika beli langsung" value="${S().esc(grnHeader.no_sp)}" oninput="window.setGrnField('no_sp', this.value)"/></div>
              <div><label class="font-semibold block mb-1">Supplier PBF Resmi *</label>
                <select class="ons-select" onchange="window.setGrnField('id_pbf', this.value, true)">
                  ${st.supplierPbf.map((p) => `<option value="${S().esc(p.nama_pbf)}" ${grnHeader.id_pbf === p.nama_pbf ? 'selected' : ''}>${S().esc(p.nama_pbf)} (${Number(p.termin_hari || 30)}h)</option>`).join('')}
                </select>
              </div>
              <div><label class="font-semibold block mb-1">Jatuh Tempo Pembayaran</label><input type="date" class="ons-input" value="${S().esc(grnHeader.tgl_jatuh_tempo)}" onchange="window.setGrnField('tgl_jatuh_tempo', this.value)"/></div>
              <div><label class="font-semibold block mb-1">Diskon Faktur PBF (Rp)</label><input type="number" min="0" class="ons-input font-mono-num" value="${grnHeader.diskon_pbf}" oninput="window.setGrnField('diskon_pbf', Number(this.value||0), true)"/></div>
              <div>
                <div class="flex items-center justify-between mb-1">
                  <label class="font-semibold">PPN Masukan (Rp)</label>
                  <span class="flex gap-1">
                    <button type="button" onclick="window.applyGrnPpn11(true)" class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-600 hover:bg-blue-500/25">Hitung 11%</button>
                    ${Number(grnHeader.ppn_masukan || 0) > 0 ? `<button type="button" onclick="window.applyGrnPpn11(false)" class="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-500/15" style="color:var(--ons-text-soft)">0</button>` : ''}
                  </span>
                </div>
                <input type="number" min="0" class="ons-input font-mono-num" value="${grnHeader.ppn_masukan}" oninput="window.setGrnField('ppn_masukan', Number(this.value||0), true)"/>
              </div>
              <div><label class="font-semibold block mb-1">Jenis Penerimaan</label>
                <select class="ons-select" onchange="window.setGrnJenisPenerimaan(this.value)">
                  <option value="BELI_PUTUS" ${grnHeader.jenis_penerimaan !== 'KONSINYASI' ? 'selected' : ''}>BELI PUTUS (Reguler PBF)</option>
                  <option value="KONSINYASI" ${grnHeader.jenis_penerimaan === 'KONSINYASI' ? 'selected' : ''}>KONSINYASI (Titip Jual Distributor)</option>
                </select>
              </div>
              ${grnHeader.jenis_penerimaan === 'KONSINYASI' ? `
              <div class="sm:col-span-2"><label class="font-semibold block mb-1">Status Hutang Konsinyasi</label>
                <div class="ons-input text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-500/10 border-blue-500/30">Rp 0 Hutang Awal (Settlement saat Laku)</div>
              </div>` : `
              <div class="sm:col-span-2"><label class="font-semibold block mb-1">Status Pembayaran Awal</label>
                <select class="ons-select" onchange="window.setGrnField('status_bayar', this.value)">
                  <option value="BELUM_LUNAS" ${grnHeader.status_bayar !== 'LUNAS' ? 'selected' : ''}>BELUM LUNAS (Catat ke Hutang Dagang PBF)</option>
                  <option value="LUNAS" ${grnHeader.status_bayar === 'LUNAS' ? 'selected' : ''}>LUNAS (Bayar Langsung Kas/Transfer)</option>
                </select>
              </div>`}
            </div>

            <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t" style="border-color:var(--ons-border)">
              <h4 class="font-bold text-xs">Rincian Item Batch Obat Masuk (${grnItems.length} Baris)</h4>
              <button type="button" onclick="window.addGrnItemRow()" class="ons-btn ons-btn-ghost text-xs">+ Tambah Baris Obat</button>
            </div>
            <div class="ons-table-wrap">
              <table class="ons-table">
                <thead><tr><th>Produk Obat</th><th>No. Batch</th><th>Tanggal ED</th><th>Qty Dasar</th><th>HPP / Unit (Rp)</th><th>Subtotal</th><th>Hapus</th></tr></thead>
                <tbody>
                  ${grnItems.map((it, idx) => {
                    const obRef = st.masterObat.find((m) => m.id_obat === it.id_obat);
                    const oldHpp = obRef ? Number(obRef.hpp_terakhir || obRef.hpp_avg || 0) : 0;
                    const newHpp = Number(it.hpp_unit || 0);
                    const hppDiffPct = (oldHpp > 0 && newHpp > oldHpp) ? Math.round(((newHpp - oldHpp) / oldHpp) * 100) : 0;
                    const hppBelowJual = obRef && newHpp > 0 && Number(obRef.harga_umum || 0) > 0 && newHpp >= Number(obRef.harga_umum || 0);
                    return `<tr>
                    <td>
                      <select class="ons-select text-xs min-w-[180px]" onchange="window.updateGrnItem(${idx}, 'id_obat', this.value)">
                        ${st.masterObat.map((o) => `<option value="${o.id_obat}" ${it.id_obat === o.id_obat ? 'selected' : ''}>${S().esc(o.nama_dagang)}</option>`).join('')}
                      </select>
                      ${oldHpp > 0 ? `<div class="text-[10px] font-mono-num mt-0.5" style="color:var(--ons-text-soft)">HPP Lama: ${S().rp(oldHpp)}${hppDiffPct > 0 ? ` &bull; <span class="text-red-600 font-bold">Naik +${hppDiffPct}%</span>` : ''}${hppBelowJual ? ` &bull; <span class="text-red-600 font-bold">RUGI (&ge; Harga Umum!)</span>` : ''}</div>` : ''}
                    </td>
                    <td><input class="ons-input font-mono-num text-xs w-32" value="${S().esc(it.no_batch)}" onchange="window.updateGrnItem(${idx}, 'no_batch', this.value)"/></td>
                    <td><input type="date" class="ons-input text-xs w-36" value="${S().esc(it.tgl_kadaluarsa)}" onchange="window.updateGrnItem(${idx}, 'tgl_kadaluarsa', this.value)"/></td>
                    <td>
                      <input type="number" min="1" class="ons-input font-mono-num text-xs w-20 text-right" value="${it.qty_dasar}" onchange="window.updateGrnItem(${idx}, 'qty_dasar', Number(this.value||1))"/>
                      ${Number(it.qty_sp || 0) > 0 ? `<div class="text-[10px] font-mono-num mt-0.5 ${Number(it.qty_dasar) === Number(it.qty_sp) ? 'text-emerald-600' : (Number(it.qty_dasar) < Number(it.qty_sp) ? 'text-amber-600 font-bold' : 'text-blue-600 font-bold')}">SP: ${it.qty_sp} (${Number(it.qty_dasar) === Number(it.qty_sp) ? 'Cocok' : (Number(it.qty_dasar) < Number(it.qty_sp) ? 'Kurang' : '+' + (Number(it.qty_dasar) - Number(it.qty_sp)))})</div>` : ''}
                    </td>
                    <td><input type="number" min="0" class="ons-input font-mono-num text-xs w-28 text-right" value="${it.hpp_unit}" onchange="window.updateGrnItem(${idx}, 'hpp_unit', Number(this.value||0))"/></td>
                    <td class="font-mono-num font-bold text-xs">${S().rp(Number(it.qty_dasar || 0) * Number(it.hpp_unit || 0))}</td>
                    <td><button type="button" onclick="window.removeGrnItemRow(${idx})" ${grnItems.length <= 1 ? 'disabled' : ''} class="ons-btn ons-btn-danger text-xs px-2 py-1">&times;</button></td>
                  </tr>`;
                  }).join('')}
                </tbody>
              </table>
            </div>

            <div class="flex flex-wrap items-center justify-between gap-4 pt-3 border-t" style="border-color:var(--ons-border)">
              <div class="text-xs space-y-1">
                <div>Total Bruto Item: <b class="font-mono-num">${S().rp(totalBruto)}</b> &bull; Diskon: <b class="font-mono-num">${S().rp(grnHeader.diskon_pbf || 0)}</b> &bull; PPN: <b class="font-mono-num">${S().rp(grnHeader.ppn_masukan || 0)}</b></div>
                <div class="text-base font-extrabold text-blue-600">Netto Faktur: <span class="font-mono-num">${S().rp(nettoGrn)}</span></div>
                ${grnHeader.id_sp ? `<label class="inline-flex items-center gap-2 text-[11px] font-semibold mt-1">
                  <span>Status SP (${S().esc(grnHeader.no_sp)}):</span>
                  <select class="ons-select text-[11px] py-1 min-h-0 w-56" onchange="window.setGrnField('sp_status', this.value)">
                    <option value="SELESAI_DITERIMA" ${grnHeader.sp_status !== 'DITERIMA_SEBAGIAN' ? 'selected' : ''}>Tutup SP (Selesai Diterima Penuh)</option>
                    <option value="DITERIMA_SEBAGIAN" ${grnHeader.sp_status === 'DITERIMA_SEBAGIAN' ? 'selected' : ''}>Diterima Sebagian (Sisa Menyusul)</option>
                  </select>
                </label>` : ''}
              </div>
              <button type="button" onclick="window.submitGrnFaktur()" class="ons-btn ons-btn-emerald text-xs px-5 py-2.5">Simpan Faktur Multi-Item &amp; Masukkan ke Stok FEFO</button>
            </div>
          </div>
        </div>
      ` : fakturTab === 'harga' ? (global.ONSProcurementPro ? global.ONSProcurementPro.renderAnalisaHargaTab() : '') : fakturTab === 'retur' ? `
        <div class="ons-card p-4 space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 class="font-bold text-sm">Radar &amp; Pembuatan BAR-PBF (Retur ke Distributor)</h3>
              <p class="text-[11px]" style="color:var(--ons-text-soft)">Retur batch mendekati kadaluarsa (&le;180 hari), kemasan rusak, salah kirim, atau recall BPOM. Stok FEFO &amp; hutang PBF otomatis disesuaikan.</p>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <div class="ons-tab-bar">
                <button type="button" onclick="window.setReturFilterMode('NEAR_ED')" class="ons-tab-btn ${returFilterMode === 'NEAR_ED' ? 'active' : ''}">Near-ED &le;180h (${nearEdBatches.length})</button>
                <button type="button" onclick="window.setReturFilterMode('ALL')" class="ons-tab-btn ${returFilterMode === 'ALL' ? 'active' : ''}">Semua Batch Aktif (${allActiveBatches.length})</button>
              </div>
              <input class="ons-input text-xs w-52" placeholder="Cari Obat / Batch / PBF..." value="${S().esc(returSearchQ)}" oninput="window.setReturSearchQ(this.value)"/>
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
      ` : fakturTab === 'konsinyasi' ? renderKonsinyasiTabHtml(st) : `
        <div class="space-y-4">
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div class="ons-card p-3.5"><div class="text-[11px]" style="color:var(--ons-text-soft)">Total Nilai Pembelian</div><div class="text-lg font-extrabold font-mono-num">${S().rp(totalPembelianNetto)}</div><div class="text-[10px]" style="color:var(--ons-text-soft)">${allFaktur.length} Faktur tercatat</div></div>
            <div class="ons-card p-3.5"><div class="text-[11px]" style="color:var(--ons-text-soft)">Sisa Hutang Dagang PBF</div><div class="text-lg font-extrabold font-mono-num ${totalSisaHutang > 0 ? 'text-red-600' : 'text-emerald-600'}">${S().rp(totalSisaHutang)}</div><div class="text-[10px]" style="color:var(--ons-text-soft)">Faktur beli putus aktif</div></div>
            <div class="ons-card p-3.5 cursor-pointer hover:opacity-90" onclick="window.setFakturListFilter('JATUH_TEMPO')"><div class="text-[11px]" style="color:var(--ons-text-soft)">Jatuh Tempo &le;7 Hari</div><div class="text-lg font-extrabold font-mono-num ${dueSoonCount > 0 ? 'text-amber-600' : 'text-emerald-600'}">${dueSoonCount} Faktur</div><div class="text-[10px] font-mono-num" style="color:var(--ons-text-soft)">${S().rp(dueSoonNominal)}</div></div>
            <div class="ons-card p-3.5 cursor-pointer hover:opacity-90" onclick="window.setFakturTab('konsinyasi')"><div class="text-[11px]" style="color:var(--ons-text-soft)">Konsinyasi Belum Settle</div><div class="text-lg font-extrabold font-mono-num text-blue-600">${S().rp(konsPendingNominal)}</div><div class="text-[10px]" style="color:var(--ons-text-soft)">Klik untuk settle titip jual</div></div>
          </div>

          <div class="ons-card p-4 space-y-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex flex-wrap items-center gap-2">
                <input class="ons-input text-xs w-52" placeholder="Cari No. Faktur, SP, PBF..." value="${S().esc(fakturListQ)}" oninput="window.setFakturListQ(this.value)"/>
                <select aria-label="Filter Supplier Faktur" class="ons-select text-xs w-48" onchange="window.setFakturListPbfFilter(this.value)">
                  <option value="">Semua Supplier (${fakturSuppliers.length})</option>
                  ${fakturSuppliers.map((sup) => `<option value="${S().esc(sup)}" ${fakturListPbfFilter === sup ? 'selected' : ''}>${S().esc(sup)}</option>`).join('')}
                </select>
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
              <button onclick="window.setFakturTab('input')" class="ons-btn ons-btn-primary text-xs">+ Input GRN Multi-Item Baru</button>
            </div>
            <div class="ons-table-wrap">
              <table class="ons-table">
                <thead><tr><th>No. Faktur &amp; SP</th><th>Supplier PBF</th><th>Jatuh Tempo</th><th class="text-right">Netto Hutang</th><th class="text-right">Sisa Hutang</th><th>Status</th><th>Aksi</th></tr></thead>
                <tbody>
                  ${filteredFaktur.length ? filteredFaktur.map((f) => {
                    const isKons = isKonsFaktur(f);
                    const dTempo = f.tgl_jatuh_tempo ? S().daysUntil(f.tgl_jatuh_tempo) : 999;
                    const unpaid = !isKons && f.status_bayar !== 'LUNAS' && Number(f.sisa_hutang || 0) > 0;
                    const tempoBadge = unpaid
                      ? (dTempo < 0 ? `<span class="text-[10px] font-bold text-red-600 ml-1">(Terlambat ${Math.abs(dTempo)}h)</span>` : (dTempo <= 7 ? `<span class="text-[10px] font-bold text-amber-600 ml-1">(H-${dTempo})</span>` : ''))
                      : '';
                    return `<tr>
                    <td class="font-mono-num text-xs"><b>${S().esc(f.no_faktur_pbf)}</b><br/><span style="color:var(--ons-text-soft)">${S().esc(f.no_sp || 'Tanpa SP')}</span></td>
                    <td class="font-semibold text-xs">${S().esc(f.id_pbf)}</td>
                    <td class="font-mono-num text-xs">${S().esc(f.tgl_jatuh_tempo || '-')}${tempoBadge}</td>
                    <td class="text-right font-mono-num text-xs">${isKons ? '<span class="text-[11px] text-blue-600 font-semibold">Titip Jual</span>' : S().rp(f.netto_hutang)}</td>
                    <td class="text-right font-mono-num font-bold text-xs ${isKons ? 'text-blue-600' : (Number(f.sisa_hutang || 0) > 0 ? 'text-red-600' : 'text-emerald-600')}">${S().rp(f.sisa_hutang)}</td>
                    <td><span class="badge-bpom ${isKons ? 'bpom-terbatas' : (f.status_bayar === 'LUNAS' ? 'bpom-bebas' : 'bpom-prekursor')}">${S().esc(f.status_bayar)}</span></td>
                    <td>
                      <div class="flex flex-wrap gap-1.5">
                        <button type="button" onclick="window.openFakturDetailModal('${S().esc(f.id_faktur || f.no_faktur_pbf)}')" class="ons-btn ons-btn-ghost text-xs py-1 px-2">Detail</button>
                        ${isKons ? `<button type="button" onclick="window.setFakturTab('konsinyasi')" class="ons-btn ons-btn-primary text-xs py-1 px-2">Settle</button>` : (Number(f.sisa_hutang || 0) > 0 ? `<button type="button" onclick="navigateView('finance','hutang')" class="ons-btn ons-btn-emerald text-xs py-1 px-2">Bayar</button>` : '')}
                      </div>
                    </td>
                  </tr>`;
                  }).join('') : '<tr><td colspan="7" class="text-center py-6 text-xs">Tidak ada faktur PBF yang sesuai filter.</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `}
    </div>`;
  }

  global.setFakturTab = (t) => {
    fakturTab = t || 'daftar';
    if (S().AppState.subTabs) S().AppState.subTabs.faktur = fakturTab;
    global.renderActiveView();
    if (typeof global.syncNavHighlight === 'function') global.syncNavHighlight();
  };
  global.setFakturListQ = (v) => { fakturListQ = v || ''; global.renderActiveView(); };
  global.setFakturListFilter = (v) => { fakturListFilter = v || 'SEMUA'; global.renderActiveView(); };
  global.setFakturListPbfFilter = (v) => { fakturListPbfFilter = v || ''; global.renderActiveView(); };
  global.setReturFilterMode = (m) => { returFilterMode = m === 'ALL' ? 'ALL' : 'NEAR_ED'; global.renderActiveView(); };
  global.setReturSearchQ = (v) => { returSearchQ = v || ''; global.renderActiveView(); };
  global.toggleGrnScannerPanel = () => {
    grnScanState.panelOpen = !Boolean(grnScanState.panelOpen);
    global.renderActiveView();
  };
  global.setGrnField = (k, v, rerender) => {
    grnHeader[k] = v;
    if (k === 'id_pbf') {
      grnHeader.tgl_jatuh_tempo = _dueDateFromTermin(_getPbfTerminDays(v));
      global.renderActiveView();
      return;
    }
    if (rerender) global.renderActiveView();
  };
  global.applyGrnPpn11 = (enable) => {
    const totalBruto = grnItems.reduce((s, it) => s + (Number(it.qty_dasar || 0) * Number(it.hpp_unit || 0)), 0);
    const dpp = Math.max(0, totalBruto - Number(grnHeader.diskon_pbf || 0));
    grnHeader.ppn_masukan = enable ? Math.round(dpp * 0.11) : 0;
    global.renderActiveView();
  };
  global.resetGrnForm = () => {
    const st = S().AppState;
    const defaultPbf = st.supplierPbf && st.supplierPbf.length ? st.supplierPbf[0].nama_pbf : '';
    grnHeader = {
      id_sp: '',
      no_faktur_pbf: '',
      no_sp: '',
      id_pbf: defaultPbf,
      tgl_jatuh_tempo: _dueDateFromTermin(_getPbfTerminDays(defaultPbf)),
      diskon_pbf: 0,
      ppn_masukan: 0,
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
    grnItems[idx][key] = val;
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

  function renderKonsinyasiTabHtml(st) {
    const sum = st.konsinyasiSummary || { items: [], settlements: [], totals: { qty_terjual: 0, qty_sisa: 0, tagihan_belum_bayar: 0, sudah_dibayar: 0 } };
    const allItems = Array.isArray(sum.items) ? sum.items : [];
    const suppliers = Array.from(new Set(allItems.map((it) => it.id_pbf).filter(Boolean)));
    const filteredItems = fakturKonsinyasiPbfFilter
      ? allItems.filter((it) => String(it.id_pbf || '') === fakturKonsinyasiPbfFilter)
      : allItems;
    const filteredTagihan = filteredItems.reduce((s, it) => s + Number(it.tagihan_belum_bayar || 0), 0);
    const filteredTerjual = filteredItems.reduce((s, it) => s + Number(it.qty_terjual || 0), 0);
    const filteredSisa = filteredItems.reduce((s, it) => s + Number(it.qty_sisa || 0), 0);
    const filteredDibayar = filteredItems.reduce((s, it) => s + Number(it.nilai_sudah_dibayar || 0), 0);
    const settlements = Array.isArray(sum.settlements) ? sum.settlements : [];

    return `<div class="space-y-4">
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div class="ons-card p-4"><div class="text-xs" style="color:var(--ons-text-soft)">Unit Laku Terjual</div><div class="text-xl font-extrabold font-mono-num text-blue-600">${filteredTerjual} Unit</div></div>
        <div class="ons-card p-4"><div class="text-xs" style="color:var(--ons-text-soft)">Unit Sisa Titipan (Gudang)</div><div class="text-xl font-extrabold font-mono-num">${filteredSisa} Unit</div></div>
        <div class="ons-card p-4"><div class="text-xs" style="color:var(--ons-text-soft)">Tagihan Belum Disettle</div><div class="text-xl font-extrabold font-mono-num ${filteredTagihan > 0 ? 'text-red-600' : 'text-emerald-600'}">${S().rp(filteredTagihan)}</div></div>
        <div class="ons-card p-4"><div class="text-xs" style="color:var(--ons-text-soft)">Sudah Dibayar (Settle)</div><div class="text-xl font-extrabold font-mono-num text-emerald-600">${S().rp(filteredDibayar)}</div></div>
      </div>

      <div class="ons-card p-4 space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex flex-wrap items-center gap-2">
            <select class="ons-select text-xs w-60" onchange="window.setKonsinyasiSupplierFilter(this.value)">
              <option value="">Semua Supplier Konsinyasi (${suppliers.length})</option>
              ${suppliers.map((sup) => `<option value="${S().esc(sup)}" ${fakturKonsinyasiPbfFilter === sup ? 'selected' : ''}>${S().esc(sup)}</option>`).join('')}
            </select>
            <button type="button" onclick="window.setGrnJenisPenerimaan('KONSINYASI');window.setFakturTab('input')" class="ons-btn ons-btn-primary text-xs">+ Terima Barang Konsinyasi</button>
          </div>
          ${filteredTagihan > 0 ? `<button type="button" onclick="window.openSettleKonsinyasiModal('${S().esc(fakturKonsinyasiPbfFilter || (filteredItems.find((x) => x.qty_belum_bayar > 0) || {}).id_pbf || '')}')" class="ons-btn ons-btn-emerald text-xs font-bold">Lunasi / Settle Terjual (${S().rp(filteredTagihan)})</button>` : ''}
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
              </tr>`).join('') : '<tr><td colspan="5" class="text-center py-6 text-xs">Belum ada batch titip jual (konsinyasi). Gunakan <b>+ Terima Barang Konsinyasi</b> di atas untuk menerima faktur titip jual dengan Rp 0 hutang awal.</td></tr>'}
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
      const totalBruto = grnItems.reduce((s, it) => s + (Number(it.qty_dasar || 0) * Number(it.hpp_unit || 0)), 0);
      const netto = Math.max(0, totalBruto - Number(grnHeader.diskon_pbf || 0) + Number(grnHeader.ppn_masukan || 0));
      const jenisPenerimaan = grnHeader.jenis_penerimaan || 'BELI_PUTUS';
      const res = await API().callApi('pengadaan.fakturSave', {
        id_sp: grnHeader.id_sp || '',
        sp_status: grnHeader.id_sp ? (grnHeader.sp_status || 'SELESAI_DITERIMA') : '',
        no_faktur_pbf: grnHeader.no_faktur_pbf.trim(),
        no_sp: grnHeader.no_sp,
        id_pbf: grnHeader.id_pbf,
        tgl_jatuh_tempo: grnHeader.tgl_jatuh_tempo,
        total_bruto: totalBruto,
        diskon_pbf: Number(grnHeader.diskon_pbf || 0),
        ppn_masukan: Number(grnHeader.ppn_masukan || 0),
        netto_hutang: jenisPenerimaan === 'KONSINYASI' ? 0 : netto,
        jenis_penerimaan: jenisPenerimaan,
        status_bayar: jenisPenerimaan === 'KONSINYASI' ? 'KONSINYASI' : (grnHeader.status_bayar || 'BELUM_LUNAS'),
        items: grnItems.map((it) => ({
          id_obat: it.id_obat,
          no_batch: String(it.no_batch || '').trim(),
          tgl_kadaluarsa: it.tgl_kadaluarsa,
          qty_dasar: Number(it.qty_dasar || 1),
          hpp_unit: Number(it.hpp_unit || 0)
        }))
      }, { isWrite: true });
      grnHeader.id_sp = '';
      grnHeader.no_faktur_pbf = '';
      grnHeader.no_sp = '';
      grnHeader.sp_status = '';
      grnHeader.diskon_pbf = 0;
      grnHeader.ppn_masukan = 0;
      grnHeader.jenis_penerimaan = 'BELI_PUTUS';
      grnHeader.status_bayar = 'BELUM_LUNAS';
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
  global.setOpnameViewMode = (m) => { opnameViewMode = m === 'CARD' ? 'CARD' : 'TABLE'; global.renderActiveView(); };
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

  global.ONSViewsInventoryProcurement = { renderMasterObatView, renderGudangView, renderDefectaView, renderFakturView };
})(window);
