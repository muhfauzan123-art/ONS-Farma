/**
 * ONS FARMA DIGITAL ENTERPRISE v10.0 - Modul W-04 (Master Obat), W-05 (Gudang FEFO & Recall),
 * W-06 (Defecta & SP BPOM 5 Golongan), dan W-07 (Faktur PBF OCR/Excel & Retur BAR-PBF)
 */
(function (global) {
  'use strict';
  const S = () => global.ONSStore;
  const API = () => global.ONSApi;

  let masterFilterGol = '';
  let masterFilterStok = 'SEMUA'; // SEMUA | AMAN | KRITIS | NEAR_ED
  let masterSortBy = 'NAMA'; // NAMA | STOK_ASC | ED_ASC | HARGA_DESC
  let masterViewMode = 'TABLE'; // TABLE | CARD
  let masterSearchQ = '';
  let wizardFullScrollMode = false;
  let wizardStep = 1;
  let importObatBuffer = [];
  let gudangTab = 'batch';
  let mutasiFilterObat = '';
  let mutasiFilterJenis = '';
  let opnameRakFilter = '';
  let opnameViewMode = 'TABLE'; // TABLE | CARD (Mobile HP)

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
    return { o, stok, min, max, pct, isZero, isLow, isCritical, nearBatch, edDays, isNearEd, isCold, hpp, harga, marginPct, stokTone };
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
   * W-04: Master Obat KFA & NIE + Masking HPP Kasir + Code128 Barcode Print
   */
  function renderMasterObatView() {
    const st = S().AppState;
    const seeCost = S().canSeeFinancialCost();
    const allMeta = (st.masterObat || []).map(buildObatMeta);

    const totalCount = allMeta.length;
    const safeCount = allMeta.filter((m) => !m.isCritical).length;
    const critCount = allMeta.filter((m) => m.isCritical).length;
    const nearEdCount = allMeta.filter((m) => m.isNearEd).length;
    const totalValuasiHpp = seeCost ? allMeta.reduce((sum, m) => sum + (m.stok * m.hpp), 0) : 0;

    const golOptions = ['', 'BEBAS', 'TERBATAS', 'KERAS', 'PREKURSOR', 'OOT', 'PSIKOTROPIKA', 'NARKOTIKA'];
    const golCounts = {};
    allMeta.forEach((m) => {
      const g = String(m.o.golongan_bpom || 'BEBAS').toUpperCase();
      golCounts[g] = (golCounts[g] || 0) + 1;
    });

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

    const kpiCard = (filterVal, title, val, sub, toneBorder, valCls) => {
      const isAct = masterFilterStok === filterVal;
      return `<button type="button" onclick="window.setMasterStokFilter('${filterVal}')" class="ons-card p-3.5 text-left transition-all cursor-pointer ${isAct ? 'ring-2 ring-blue-500' : ''}" style="${isAct ? ('border-color:' + toneBorder) : ''}">
        <div class="text-[11px] font-semibold" style="color:var(--ons-text-soft)">${title}</div>
        <div class="text-2xl font-extrabold font-mono-num mt-0.5 ${valCls}">${val}</div>
        <div class="text-[11px] mt-0.5 truncate" style="color:var(--ons-text-soft)">${sub}</div>
      </button>`;
    };

    const actionButtons = (o) => `<div class="flex flex-wrap gap-1.5">
      <button onclick="window.openObatDetailModal('${S().esc(o.id_obat)}')" class="ons-btn ons-btn-primary text-[11px] py-1 px-2.5">Detail</button>
      <button onclick="window.printCode128Obat('${S().esc(o.id_obat)}')" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2" title="Cetak Barcode Rak">Barcode</button>
      ${seeCost ? `<button onclick="window.openObatWizardModal('${S().esc(o.id_obat)}')" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2">Edit</button>` : ''}
    </div>`;

    return `<div class="space-y-4 ons-view-enter">
      <!-- Header -->
      <div class="ons-page-header">
        <div>
          <h1 class="text-xl font-extrabold tracking-tight">Master Katalog Produk Obat (KFA &amp; NIE BPOM)</h1>
          <p class="text-xs" style="color:var(--ons-text-soft)">Katalog terstandar SATUSEHAT, rasio 3 satuan, pemantauan ED batch FEFO, &amp; kendali akses HPP.</p>
        </div>
        <div class="flex flex-wrap gap-2">
          ${seeCost ? `<button onclick="window.openObatWizardModal()" class="ons-btn ons-btn-primary text-xs">+ Tambah Produk (Wizard)</button>
          <button onclick="window.navigateView('faktur','harga')" class="ons-btn ons-btn-ghost text-xs">Analisa Harga &amp; Margin</button>
          <button onclick="window.openImportObatModal()" class="ons-btn ons-btn-emerald text-xs">Import Excel (.xlsx)</button>` : ''}
          <button onclick="window.openPrintMasterLabelsModal()" class="ons-btn ons-btn-ghost text-xs" title="Cetak Stiker Barcode Obat / Rak Mandiri">Cetak Label Barcode</button>
          <button onclick="window.exportMasterObat('xlsx')" class="ons-btn ons-btn-ghost text-xs">Export Excel</button>
          <button onclick="window.exportMasterObat('pdf')" class="ons-btn ons-btn-ghost text-xs">Cetak PDF</button>
        </div>
      </div>

      <!-- 4 KPI Katalog Klik-Cepat -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        ${kpiCard('SEMUA', 'Total Item Katalog', totalCount, seeCost ? ('Valuasi Modal: ' + S().rp(totalValuasiHpp)) : 'Produk aktif apotek', '#0050CA', '')}
        ${kpiCard('AMAN', 'Stok Aman Tersedia', safeCount, 'Di atas ambang batas minimum', '#059669', 'text-emerald-600')}
        ${kpiCard('KRITIS', 'Perlu Restok / Habis', critCount, critCount ? 'Klik untuk lihat item defecta' : 'Semua stok mencukupi', '#D97706', critCount ? 'text-amber-600' : 'text-emerald-600')}
        ${kpiCard('NEAR_ED', 'Near ED (&le; 90 Hari)', nearEdCount, nearEdCount ? 'Segera prioritaskan FEFO / retur' : 'Semua batch ED panjang', '#DC2626', nearEdCount ? 'text-red-600' : 'text-emerald-600')}
      </div>

      <!-- Filter Bar Pintar & Mode Tampilan -->
      <div class="ons-card p-3.5 space-y-3">
        <div class="flex flex-wrap items-center gap-2">
          <input class="ons-input flex-1 min-w-[210px] text-xs" placeholder="Cari Nama Dagang, Zat Aktif, Kode KFA, NIE, atau Lokasi Rak..." value="${S().esc(masterSearchQ)}" oninput="window.setMasterSearch(this.value)"/>
          <button type="button" onclick="window.scanMasterObatBarcode()" class="ons-btn ons-btn-primary text-xs" title="Cari Obat Lewat Kamera Barcode">Scan Barcode</button>
          <select class="ons-select w-40 text-xs" onchange="window.setMasterStokFilter(this.value)" aria-label="Filter Status Stok">
            <option value="SEMUA" ${masterFilterStok === 'SEMUA' ? 'selected' : ''}>Semua Status Stok</option>
            <option value="AMAN" ${masterFilterStok === 'AMAN' ? 'selected' : ''}>Stok Aman</option>
            <option value="KRITIS" ${masterFilterStok === 'KRITIS' ? 'selected' : ''}>Stok Menipis / Habis</option>
            <option value="NEAR_ED" ${masterFilterStok === 'NEAR_ED' ? 'selected' : ''}>Near ED (&le; 90 Hari)</option>
          </select>
          <select class="ons-select w-40 text-xs" onchange="window.setMasterSort(this.value)" aria-label="Urutkan Produk">
            <option value="NAMA" ${masterSortBy === 'NAMA' ? 'selected' : ''}>Urut: Nama A &ndash; Z</option>
            <option value="STOK_ASC" ${masterSortBy === 'STOK_ASC' ? 'selected' : ''}>Urut: Stok Terendah</option>
            <option value="ED_ASC" ${masterSortBy === 'ED_ASC' ? 'selected' : ''}>Urut: ED Terdekat</option>
            <option value="HARGA_DESC" ${masterSortBy === 'HARGA_DESC' ? 'selected' : ''}>Urut: Harga Tertinggi</option>
          </select>
          <div class="inline-flex rounded-lg border p-0.5" style="border-color:var(--ons-border);background:var(--ons-bg-subtle)">
            <button type="button" onclick="window.setMasterViewMode('TABLE')" class="ons-btn text-xs py-1 px-2.5 ${masterViewMode === 'TABLE' ? 'ons-btn-primary' : 'ons-btn-ghost border-0'}">Tabel</button>
            <button type="button" onclick="window.setMasterViewMode('CARD')" class="ons-btn text-xs py-1 px-2.5 ${masterViewMode === 'CARD' ? 'ons-btn-primary' : 'ons-btn-ghost border-0'}">Kartu</button>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-1.5">
          ${golOptions.filter((g) => !g || golCounts[g] || masterFilterGol === g).map((g) => {
            const cnt = g ? (golCounts[g] || 0) : totalCount;
            return `<button type="button" onclick="window.setMasterGol('${g}')" class="ons-subnav-chip ${masterFilterGol === g ? 'active' : ''}">${g || 'Semua'} (${cnt})</button>`;
          }).join('')}
        </div>
      </div>

      ${filtered.length === 0 ? `<div class="ons-card p-10 text-center space-y-2">
        <div class="font-bold text-sm">Tidak ada produk obat yang sesuai dengan filter saat ini.</div>
        <button onclick="window.resetMasterFilter()" class="ons-btn ons-btn-ghost text-xs">Reset Semua Filter</button>
      </div>` : (masterViewMode === 'CARD' ? `
      <!-- Mode Kartu Katalog Modern -->
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
        ${filtered.map((m) => {
          const o = m.o;
          return `<div class="ons-product-card flex flex-col justify-between gap-3">
            <div class="space-y-2">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-1.5 mb-1">
                    ${S().bpomBadge(o.golongan_bpom)}
                    ${m.isCold ? `<span class="badge-bpom bpom-terbatas">CHILLER 2-8&deg;C</span>` : ''}
                  </div>
                  <h3 class="font-bold text-sm leading-snug">${S().esc(o.nama_dagang)}</h3>
                  <div class="text-xs truncate" style="color:var(--ons-text-soft)">${S().esc(o.zat_aktif)} ${o.kekuatan ? ('(' + S().esc(o.kekuatan) + ')') : ''}</div>
                </div>
                <span class="font-mono-num text-[10px] px-2 py-0.5 rounded border shrink-0" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">${S().esc(o.rak_lokasi || 'RAK')}</span>
              </div>

              <div class="flex flex-wrap gap-2 text-[11px] font-mono-num" style="color:var(--ons-text-soft)">
                <span>KFA: <b>${S().esc(o.kode_kfa || o.id_obat)}</b></span>
                <span>&bull; NIE: ${S().esc(o.nie_bpom || '-')}</span>
              </div>

              <div class="p-2.5 rounded-lg border" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
                ${renderObatStockBarHtml(m)}
                <div class="text-[11px] font-mono-num mt-1" style="color:var(--ons-text-soft)">
                  1 ${S().esc(o.satuan_besar || 'Box')} = ${Number(o.rasio_besar || 100)} ${S().esc(o.satuan_dasar)} &bull; 1 ${S().esc(o.satuan_sedang || 'Strip')} = ${Number(o.rasio_sedang || 10)} ${S().esc(o.satuan_dasar)}
                </div>
              </div>
            </div>

            <div class="pt-2 border-t flex flex-wrap items-end justify-between gap-2" style="border-color:var(--ons-border)">
              <div>
                <div class="text-[10px] font-semibold uppercase" style="color:var(--ons-text-soft)">Harga Umum / ${S().esc(o.satuan_dasar)}</div>
                <div class="text-base font-extrabold font-mono-num text-blue-600">${S().rp(o.harga_umum)}</div>
                ${seeCost ? `<div class="text-[11px] font-mono-num" style="color:var(--ons-text-soft)">HPP ${S().rp(o.hpp_avg)}${m.marginPct !== null ? ` &bull; Margin <b class="text-emerald-600">${m.marginPct}%</b>` : ''}</div>` : `<div class="text-[11px] font-mono-num" style="color:var(--ons-text-soft)">Member: ${S().rp(o.harga_member || o.harga_umum)}</div>`}
              </div>
              ${actionButtons(o)}
            </div>
          </div>`;
        }).join('')}
      </div>` : `
      <!-- Mode Tabel Enterprise -->
      <div class="ons-card p-4">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-3 text-xs" style="color:var(--ons-text-soft)">
          <span>Menampilkan <b>${filtered.length}</b> dari ${totalCount} produk obat</span>
          <span>Klik <b>Detail</b> untuk melihat batch FEFO, suhu simpan &amp; substitusi generik</span>
        </div>
        <div class="ons-table-wrap">
          <table class="ons-table">
            <thead>
              <tr>
                <th>Kode KFA / NIE</th>
                <th>Produk, Zat Aktif &amp; Penyimpanan</th>
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
                    <div class="flex flex-wrap items-center gap-1.5 mt-1">
                      <span class="text-[10px] font-mono-num px-1.5 py-0.5 rounded border" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">${S().esc(o.rak_lokasi || 'RAK')}</span>
                      ${m.isCold ? `<span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-600">Chiller 2-8&deg;C</span>` : ''}
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
      </div>`)}
    </div>`;
  }

  global.setMasterSearch = (v) => { masterSearchQ = v; global.renderActiveView(); };
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
    const cmpItem = ((st.branchStockCompare && st.branchStockCompare.items) || []).find((x) => x.id_obat === idObat);
    const branches = (st.branchStockCompare && st.branchStockCompare.branches) || st.branchesList || ['ONS-01', 'ONS-02', 'ONS-03'];
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
          <div style="color:var(--ons-text-soft)">Member / PRB</div>
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

      <div class="p-3 rounded-xl border space-y-2" style="border-color:var(--ons-border)">
        <div class="font-bold">Komparasi Stok Antar-Cabang Real-Time</div>
        <div class="grid grid-cols-3 gap-2">
          ${branches.map((br) => {
            const qBr = br === (st.cabangId || 'ONS-01') ? m.stok : Number(perCb[br] || 0);
            return `<div class="p-2 rounded-lg text-center border" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
              <div class="text-[10px] font-bold">${S().esc(br)}</div>
              <div class="text-sm font-extrabold font-mono-num ${qBr > 0 ? 'text-emerald-600' : 'text-red-500'}">${qBr}</div>
            </div>`;
          }).join('')}
        </div>
      </div>

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
    const seeCost = S().canSeeFinancialCost();
    const hdrs = [
      { key: 'kode_kfa', label: 'Kode KFA' },
      { key: 'nama_dagang', label: 'Nama Dagang' },
      { key: 'zat_aktif', label: 'Zat Aktif' },
      { key: 'golongan_bpom', label: 'Golongan' },
      { key: 'nie_bpom', label: 'NIE BPOM' },
      ...(seeCost ? [{ key: 'hpp_avg', label: 'HPP Avg' }] : []),
      { key: 'harga_umum', label: 'Harga Umum' }
    ];
    S().exportDataset(fmt, 'Master Data Obat ONS Farma', 'Master_Obat_ONS_Farma', hdrs, S().AppState.masterObat);
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
                      <label class="font-bold block mb-1">Harga Member / PRB (Rp)</label>
                      <input id="wHrgMem" type="number" min="0" class="${inpCls} font-mono-num font-bold" value="${o.harga_member}"/>
                      <div class="text-[11px] mt-1" style="color:var(--ons-text-soft)">Aktif otomatis untuk pasien PRB terdaftar.</div>
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

  global.openImportObatModal = () => {
    importObatBuffer = [];
    S().openModal(`<div class="p-6 space-y-4 text-xs">
      <div class="flex justify-between items-center"><h3 class="font-bold text-base">Import Massal Master Obat (.xlsx / .csv)</h3><button onclick="ONSStore.closeModal()" class="text-xl">&times;</button></div>
      <p style="color:var(--ons-text-soft)">Unggah file Excel <code>.xlsx</code> atau <code>.csv</code> dengan header kolom: <code>nama_dagang</code>, <code>zat_aktif</code>, <code>kode_kfa</code>, <code>golongan_bpom</code>, <code>satuan_dasar</code>, <code>hpp_avg</code>, <code>harga_umum</code>, <code>harga_member</code>.</p>
      <div class="flex flex-wrap gap-2 items-center">
        <input id="impObatFile" type="file" accept=".xlsx,.csv" class="ons-input flex-1" onchange="window.parseImportObatFile(this.files[0])"/>
        <button type="button" onclick="window.downloadTemplateImportObat()" class="ons-btn ons-btn-ghost">Unduh Contoh CSV</button>
      </div>
      <div id="impObatPreview" class="p-3 rounded-xl border max-h-48 overflow-auto" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">Pilih file .xlsx atau .csv untuk pratinjau...</div>
      <button onclick="window.submitImportObatBulk()" class="ons-btn ons-btn-emerald w-full">&#128229; Import ke Database Master Obat</button>
    </div>`, '640px');
  };

  global.downloadTemplateImportObat = () => {
    const csv = 'nama_dagang,zat_aktif,kode_kfa,nie_bpom,golongan_bpom,satuan_dasar,hpp_avg,harga_umum,harga_member,stok_min\n' +
      'Cetirizine 10mg Dexa,Cetirizine HCl 10mg,93002110,GKL1405048817A1,TERBATAS,Tablet,350,700,600,30\n' +
      'Neurobion Forte Tab,Vitamin B1 B6 B12,92004512,DBL7215806416B1,BEBAS,Tablet,2800,3900,3600,20\n';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'Template_Import_Master_Obat_ONS.csv';
    a.click();
  };

  global.parseImportObatFile = async (file) => {
    const box = document.getElementById('impObatPreview');
    if (!file || !box) return;
    try {
      let rows = [];
      if (file.name.toLowerCase().endsWith('.xlsx') && global.ONSXlsxLite) {
        const buf = await file.arrayBuffer();
        const sheets = await global.ONSXlsxLite.read(buf);
        rows = (sheets[0] && sheets[0].rows) || [];
      } else {
        const text = await file.text();
        rows = text.split(/\r?\n/).filter((l) => l.trim()).map((l) => l.split(l.includes(';') ? ';' : ',').map((c) => c.trim().replace(/^"|"$/g, '')));
      }
      if (rows.length < 2) throw new Error('File minimal berisi 1 baris header + 1 baris data.');
      const headers = rows[0].map((h) => String(h || '').toLowerCase().trim().replace(/\s+/g, '_'));
      importObatBuffer = rows.slice(1).filter((r) => r.some((v) => String(v || '').trim())).map((r) => {
        const obj = {};
        headers.forEach((h, idx) => { obj[h] = r[idx] !== undefined ? r[idx] : ''; });
        return {
          nama_dagang: obj.nama_dagang || obj.nama || obj.produk || '',
          zat_aktif: obj.zat_aktif || '',
          kode_kfa: obj.kode_kfa || '',
          nie_bpom: obj.nie_bpom || '',
          golongan_bpom: obj.golongan_bpom || obj.golongan || 'BEBAS',
          satuan_dasar: obj.satuan_dasar || obj.satuan || 'Tablet',
          hpp_avg: Number(obj.hpp_avg || obj.hpp || 0),
          harga_umum: Number(obj.harga_umum || obj.harga || 0),
          harga_member: Number(obj.harga_member || obj.harga_umum || 0),
          stok_min: Number(obj.stok_min || 10)
        };
      }).filter((x) => x.nama_dagang);
      box.innerHTML = `<div class="font-bold text-emerald-600 mb-1">Terdeteksi ${importObatBuffer.length} produk siap diimport:</div>` +
        importObatBuffer.slice(0, 8).map((x, idx) => `<div>${idx + 1}. <b>${S().esc(x.nama_dagang)}</b> (${S().esc(x.golongan_bpom)}) &bull; HPP ${S().rp(x.hpp_avg)} &rarr; Umum ${S().rp(x.harga_umum)}</div>`).join('') +
        (importObatBuffer.length > 8 ? `<div class="mt-1 italic">... dan ${importObatBuffer.length - 8} item lainnya.</div>` : '');
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
    if (gudangTab === 'coldchain') gudangTab = 'batch';
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

    return `<div class="space-y-5 ons-view-enter">
      <div class="ons-page-header">
        <div>
          <h1 class="text-xl font-extrabold">Gudang Batch FEFO, Kartu Stok &amp; Stock Opname</h1>
          <p class="text-xs" style="color:var(--ons-text-soft)">Kelola batch kedaluwarsa terdekat, buku mutasi Kartu Stok BPOM, dan penyesuaian fisik Stock Opname.</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <div class="ons-tab-bar">
            <button onclick="window.setGudangTab('batch')" class="ons-tab-btn ${gudangTab === 'batch' ? 'active' : ''}">Batch &amp; FEFO (${sorted.length})</button>
            <button onclick="window.setGudangTab('kartu-stok')" class="ons-tab-btn ${gudangTab === 'kartu-stok' ? 'active' : ''}">Kartu Stok (${(st.mutasiStok || []).length})</button>
            ${(seeCost || S().canAccessSubTab('gudang', 'opname')) ? `<button onclick="window.setGudangTab('opname')" class="ons-tab-btn ${gudangTab === 'opname' ? 'active' : ''}">Stock Opname Fisik</button>` : ''}
            ${(seeCost || S().canAccessSubTab('gudang', 'transfer')) ? `<button onclick="window.setGudangTab('transfer')" class="ons-tab-btn ${gudangTab === 'transfer' ? 'active' : ''}">Mutasi Antar-Cabang (${(st.mutasiCabang || []).length})</button>` : ''}
          </div>
        </div>
      </div>

      ${gudangTab === 'transfer' && (seeCost || S().canAccessSubTab('gudang', 'transfer')) ? (() => {
        const cmpObj = st.branchStockCompare && !Array.isArray(st.branchStockCompare) ? st.branchStockCompare : null;
        const branchIds = (cmpObj && Array.isArray(cmpObj.branches) && cmpObj.branches.length)
          ? cmpObj.branches
          : (Array.isArray(st.branchesList) && st.branchesList.length ? st.branchesList : ['ONS-01', 'ONS-02', 'ONS-03']);
        const branchLabels = { 'ONS-01': 'Pusat (Jaksel)', 'ONS-02': 'Cabang Bekasi', 'ONS-03': 'Cabang Depok' };
        const compList = (cmpObj && Array.isArray(cmpObj.items)) ? cmpObj.items : (Array.isArray(st.branchStockCompare) ? st.branchStockCompare : []);
        const trfList = st.mutasiCabang || [];
        const defDest = branchIds.find((bid) => bid !== st.cabangId) || 'ONS-02';
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
                    ${branchIds.map((bid) => `<option value="${S().esc(bid)}" ${bid === st.cabangId ? 'selected' : ''}>${S().esc(bid)} — ${S().esc(branchLabels[bid] || bid)}</option>`).join('')}
                  </select>
                </div>
                <div>
                  <label class="font-semibold block mb-1">Cabang Tujuan</label>
                  <select id="trfTujuanCab" class="ons-select text-xs">
                    ${branchIds.map((bid) => `<option value="${S().esc(bid)}" ${bid === defDest ? 'selected' : ''}>${S().esc(bid)} — ${S().esc(branchLabels[bid] || bid)}</option>`).join('')}
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
                <h3 class="font-bold text-sm">Komparator Stok Real-Time 3 Cabang</h3>
                <span class="text-[11px]" style="color:var(--ons-text-soft)">Cabang aktif: <b class="font-mono-num">${S().esc(st.cabangId)}</b></span>
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
      ${gudangTab === 'transfer' ? '' : (gudangTab === 'kartu-stok' ? `
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
            <div class="flex gap-2">
              <button onclick="window.refreshMutasiStokServer()" class="ons-btn ons-btn-ghost text-xs">Refresh Server</button>
              <button onclick="window.exportKartuStok('xlsx')" class="ons-btn ons-btn-emerald text-xs">Export Kartu Stok (.xlsx)</button>
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
    gudangTab = (t && t !== 'coldchain') ? t : 'batch';
    if (S().AppState.subTabs) S().AppState.subTabs.gudang = gudangTab;
    global.renderActiveView();
    if (typeof global.syncNavHighlight === 'function') global.syncNavHighlight();
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
    const rows = (S().AppState.mutasiStok || []).filter((m) => !mutasiFilterObat || m.id_obat === mutasiFilterObat);
    S().exportDataset(fmt || 'xlsx', 'Kartu Stok Digital BPOM - Apotek ONS Farma', 'kartu-stok-ons-farma', [
      { key: 'timestamp', label: 'Waktu' },
      { key: 'nama_dagang', label: 'Nama Obat' },
      { key: 'no_batch', label: 'No Batch' },
      { key: 'jenis_mutasi', label: 'Jenis Mutasi' },
      { key: 'qty_ubah', label: 'Perubahan Qty' },
      { key: 'stok_akhir', label: 'Stok Akhir' },
      { key: 'referensi_id', label: 'Referensi' },
      { key: 'catatan', label: 'Catatan' }
    ], rows);
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
  let defectaSupplierQ = '';

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

    const sq = defectaSupplierQ.trim().toLowerCase();
    const filteredSuppliers = (st.supplierPbf || []).filter((p) => {
      if (!sq) return true;
      return `${p.nama_pbf} ${p.kode_cdob} ${p.kontak_wa} ${p.id_pbf}`.toLowerCase().includes(sq);
    });

    return `<div class="space-y-5 ons-view-enter">
      <div class="ons-page-header">
        <div>
          <h1 class="text-xl font-extrabold">Defecta Stok, Surat Pesanan (SP A4) &amp; Supplier PBF</h1>
          <p class="text-xs" style="color:var(--ons-text-soft)">Analisis stok menipis, buat SP otomatis atau manual, pratinjau/cetak Kertas A4 sebelum print, kirim WA PBF, &amp; kelola PBF CDOB.</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <div class="ons-tab-bar">
            <button onclick="window.setDefectaTab('order')" class="ons-tab-btn ${defectaTab === 'order' ? 'active' : ''}">Defecta Order (${lowStock.length})</button>
            <button onclick="window.setDefectaTab('sp')" class="ons-tab-btn ${defectaTab === 'sp' ? 'active' : ''}">Surat Pesanan &amp; A4 (${(st.suratPesanan || []).length})</button>
            <button onclick="window.setDefectaTab('supplier')" class="ons-tab-btn ${defectaTab === 'supplier' ? 'active' : ''}">Direktori PBF CDOB (${(st.supplierPbf || []).length})</button>
          </div>
          ${defectaTab === 'supplier'
            ? `<button onclick="window.openSupplierPbfModal('')" class="ons-btn ons-btn-primary text-xs">+ Tambah Supplier PBF</button>`
            : `<button onclick="window.openCreateSpModal()" class="ons-btn ons-btn-emerald text-xs">+ Buat SP Manual</button><button onclick="window.generateSpFromDefecta()" class="ons-btn ons-btn-primary text-xs">Terbitkan SP Otomatis Defecta</button>`}
        </div>
      </div>

      ${defectaTab === 'supplier' ? `
        <div class="ons-card p-4 space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <input class="ons-input text-xs w-64" placeholder="Cari nama PBF, kode CDOB, kontak WA..." value="${S().esc(defectaSupplierQ)}" oninput="window.setDefectaSupplierQ(this.value)"/>
            <button onclick="window.openSupplierPbfModal('')" class="ons-btn ons-btn-emerald text-xs">+ Tambah PBF Baru</button>
          </div>
          <div class="ons-table-wrap">
            <table class="ons-table">
              <thead><tr><th>Nama PBF &amp; ID</th><th>Izin CDOB / NPWP</th><th>Kontak WA &amp; Email</th><th>Lead Time &amp; TOP</th><th>SLA</th><th>Status</th><th>Aksi</th></tr></thead>
              <tbody>
                ${filteredSuppliers.length ? filteredSuppliers.map((p) => `<tr>
                  <td><div class="font-bold text-xs">${S().esc(p.nama_pbf)}</div><div class="font-mono-num text-[11px]" style="color:var(--ons-text-soft)">${S().esc(p.id_pbf)}</div></td>
                  <td class="font-mono-num text-xs"><div>${S().esc(p.kode_cdob || '-')}</div><div style="color:var(--ons-text-soft)">${S().esc(p.npwp_pbf || '-')}</div></td>
                  <td class="text-xs"><div class="font-mono-num">${S().esc(p.kontak_wa || '-')}</div><div style="color:var(--ons-text-soft)">${S().esc(p.email_pbf || '-')}</div></td>
                  <td class="text-xs font-mono-num"><b>${p.lead_time_hari} Hari</b> &bull; TOP ${p.termin_hari} Hari</td>
                  <td class="font-mono-num font-bold text-emerald-600">${p.skor_sla}%</td>
                  <td><span class="badge-bpom ${String(p.status_pbf || 'AKTIF') === 'AKTIF' ? 'bpom-bebas' : 'bpom-keras'}">${S().esc(p.status_pbf || 'AKTIF')}</span></td>
                  <td><button onclick="window.openSupplierPbfModal('${S().esc(p.id_pbf)}')" class="ons-btn ons-btn-ghost text-xs py-1 px-2.5">Edit PBF</button></td>
                </tr>`).join('') : '<tr><td colspan="7" class="text-center py-6 text-xs">Belum ada Supplier PBF yang sesuai pencarian.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      ` : defectaTab === 'sp' ? (global.ONSProcurementPro ? global.ONSProcurementPro.renderSuratPesananTab() : '') : `
        <div class="ons-card p-4">
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-bold text-sm">Komparator SLA &amp; Termin Supplier PBF Resmi CDOB</h3>
            <button onclick="window.setDefectaTab('supplier')" class="ons-btn ons-btn-ghost text-xs">Kelola Master PBF &rarr;</button>
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
    defectaTab = t || 'order';
    if (S().AppState.subTabs) S().AppState.subTabs.defecta = defectaTab;
    global.renderActiveView();
    if (typeof global.syncNavHighlight === 'function') global.syncNavHighlight();
  };
  global.setDefectaOrderQty = (idObat, val) => {
    defectaOrderQty[idObat] = Math.max(1, Number(val || 1));
    global.renderActiveView();
  };
  global.setDefectaSupplierQ = (v) => { defectaSupplierQ = v || ''; global.renderActiveView(); };

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
   * W-07: Terima Faktur PBF Multi-Item GRN & Retur BAR-PBF (3 Sub-Menu: daftar | input | retur)
   */
  let fakturTab = 'daftar';
  let fakturListQ = '';
  let fakturListFilter = 'SEMUA';
  let grnHeader = {
    id_sp: '',
    no_faktur_pbf: '',
    no_sp: '',
    id_pbf: '',
    tgl_jatuh_tempo: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    diskon_pbf: 0,
    ppn_masukan: 0,
    status_bayar: 'BELUM_LUNAS',
    catatan: ''
  };
  let grnItems = [];

  global.loadSpIntoGrn = (idSp) => {
    const st = S().AppState;
    const sp = (st.suratPesanan || []).find((x) => x.id_sp === idSp);
    if (!sp) return global.toast('Surat Pesanan tidak ditemukan.', 'warn');
    const pbfObj = (st.supplierPbf || []).find((p) => p.id_pbf === sp.id_pbf || p.nama_pbf === sp.nama_pbf);
    const termin = Number((pbfObj && pbfObj.termin_hari) || 30);
    grnHeader.id_sp = sp.id_sp;
    grnHeader.no_sp = sp.no_sp;
    grnHeader.id_pbf = sp.nama_pbf || sp.id_pbf || grnHeader.id_pbf;
    grnHeader.sp_status = 'SELESAI_DITERIMA';
    grnHeader.tgl_jatuh_tempo = new Date(Date.now() + termin * 86400000).toISOString().slice(0, 10);
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
    if (!grnHeader.no_sp) grnHeader.no_sp = 'SP-' + new Date().toISOString().slice(0, 7).replace('-', '') + '-001';
    if (!grnHeader.id_pbf && st.supplierPbf.length) grnHeader.id_pbf = st.supplierPbf[0].nama_pbf;
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
    const returCandidates = st.stokBatch.filter((b) => b.status_batch === 'AKTIF' && b.qty_sisa > 0 && S().daysUntil(b.tgl_kadaluarsa) <= 180);

    const fq = fakturListQ.trim().toLowerCase();
    const filteredFaktur = (st.fakturPbf || []).filter((f) => {
      if (fakturListFilter === 'BELUM_LUNAS' && f.status_bayar === 'LUNAS') return false;
      if (fakturListFilter === 'LUNAS' && f.status_bayar !== 'LUNAS') return false;
      if (fq) {
        const hay = `${f.no_faktur_pbf} ${f.no_sp} ${f.id_pbf}`.toLowerCase();
        if (!hay.includes(fq)) return false;
      }
      return true;
    });

    const totalBruto = grnItems.reduce((s, it) => s + (Number(it.qty_dasar || 0) * Number(it.hpp_unit || 0)), 0);
    const nettoGrn = Math.max(0, totalBruto - Number(grnHeader.diskon_pbf || 0) + Number(grnHeader.ppn_masukan || 0));

    return `<div class="space-y-5 ons-view-enter">
      <div class="ons-page-header">
        <div>
          <h1 class="text-xl font-extrabold">Terima Faktur (Scan / SP), Analisa Harga &amp; Retur PBF</h1>
          <p class="text-xs" style="color:var(--ons-text-soft)">Sinkronkan barang datang dari Surat Pesanan (SP), scan foto/PDF faktur (OCR Multi-Item), analisa kenaikan harga &amp; margin, serta kelola hutang/retur PBF.</p>
        </div>
        <div class="ons-tab-bar">
          <button onclick="window.setFakturTab('daftar')" class="ons-tab-btn ${fakturTab === 'daftar' ? 'active' : ''}">Daftar Faktur (${st.fakturPbf.length})</button>
          <button onclick="window.setFakturTab('input')" class="ons-tab-btn ${fakturTab === 'input' ? 'active' : ''}">Terima Faktur (Scan OCR / SP)</button>
          <button onclick="window.setFakturTab('harga')" class="ons-tab-btn ${fakturTab === 'harga' ? 'active' : ''}">Analisa Harga &amp; Margin</button>
          <button onclick="window.setFakturTab('retur')" class="ons-tab-btn ${fakturTab === 'retur' ? 'active' : ''}">Retur BAR-PBF (${returCandidates.length})</button>
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
                  <div class="font-extrabold text-sm">1. Sinkronisasi Barang Tiba dari Surat Pesanan (SP &rarr; Terima Faktur)</div>
                  <p class="text-[11px]" style="color:var(--ons-text-soft)">Pilih SP aktif di bawah agar daftar item terisi otomatis &amp; status SP sinkron otomatis setelah faktur disimpan. Anda tetap bisa scan faktur di panel berikutnya.</p>
                </div>
                <button type="button" onclick="window.navigateView('defecta','sp')" class="ons-btn ons-btn-ghost text-xs">Buka Daftar SP &amp; Preview A4 &rarr;</button>
              </div>
              ${activeSp ? `
                <div class="p-2.5 rounded-xl border flex flex-wrap items-center justify-between gap-2 text-xs" style="background:rgba(16,185,129,.10);border-color:rgba(16,185,129,.35)">
                  <div><b class="text-emerald-700">&#10003; Terhubung ke SP:</b> <span class="font-mono-num font-bold">${S().esc(activeSp.no_sp)}</span> (${S().esc(activeSp.nama_pbf)}) &mdash; Scan faktur tidak akan melepas tautan SP ini.</div>
                  <div class="flex gap-1.5">
                    <button type="button" onclick="window.openSpA4PreviewModal('${S().esc(activeSp.id_sp)}')" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2">Lihat SP A4</button>
                    <button type="button" onclick="window.setGrnField('id_sp','',true);window.setGrnField('no_sp','',true);" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2 text-red-600">Lepas Tautan SP</button>
                  </div>
                </div>
              ` : ''}
              ${openSps.length ? `
                <div class="flex flex-wrap gap-2">
                  ${openSps.map((sp) => `<button type="button" onclick="window.loadSpIntoGrn('${S().esc(sp.id_sp)}')" class="ons-btn ${grnHeader.id_sp === sp.id_sp ? 'ons-btn-primary' : 'ons-btn-ghost'} text-xs py-1.5 px-3">
                    Tarik SP: <span class="font-mono-num ml-1">${S().esc(sp.no_sp)}</span> (${S().esc(sp.nama_pbf)})
                  </button>`).join('')}
                </div>
              ` : `<div class="text-xs" style="color:var(--ons-text-soft)">Semua SP sudah selesai diterima. Gunakan Smart Invoice Scanner di bawah untuk terima faktur langsung, atau buat SP baru di menu Defecta &amp; Surat Pesanan.</div>`}
            </div>`;
          })()}
          <div class="ons-card p-4 sm:p-5 space-y-3.5">
            <div class="flex flex-wrap justify-between items-start gap-3">
              <div>
                <div class="flex flex-wrap items-center gap-2">
                  <span class="font-extrabold text-sm">Smart Invoice Scanner Faktur PBF</span>
                  <span class="badge-bpom bpom-bebas">100% GRATIS &bull; OCR + PDF + AUTO-PARSE</span>
                </div>
                <p class="text-[11px] mt-0.5" style="color:var(--ons-text-soft)">Foto lewat kamera HP, unggah gambar JPG/PNG atau file PDF faktur PBF, lalu ekstrak banyak item obat, nomor batch, ED &amp; harga sekaligus ke Form GRN.</p>
              </div>
              <div class="flex flex-wrap gap-1.5">
                <button type="button" onclick="window.loadGrnSampleInvoice()" class="ons-btn ons-btn-ghost text-xs py-1.5 px-2.5">Contoh Teks Faktur</button>
                ${(grnScanState.previewDataUrl || grnScanState.rawText || grnScanState.summary) ? `<button type="button" onclick="window.clearGrnScanner()" class="ons-btn ons-btn-ghost text-xs py-1.5 px-2.5 text-red-600">Reset Scanner</button>` : ''}
              </div>
            </div>

            <div id="grnScanDropzone"
              ondragover="event.preventDefault();this.classList.add('is-dragover');"
              ondragleave="this.classList.remove('is-dragover');"
              ondrop="event.preventDefault();this.classList.remove('is-dragover');if(event.dataTransfer&&event.dataTransfer.files&&event.dataTransfer.files[0])window.handleGrnScannerFile(event.dataTransfer.files[0]);"
              class="ons-scan-zone">
              <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div class="space-y-1 text-xs">
                  <div class="font-bold">Seret &amp; lepas Foto / PDF Faktur di sini, atau pilih sumber scan:</div>
                  <div class="text-[11px]" style="color:var(--ons-text-soft)">Tips akurasi maksimal: pastikan pencahayaan merata; untuk faktur kertas rangkap/dot-matrix gunakan mode <b>Hitam-Putih Dot Matrix</b> di bawah.</div>
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
                  <label for="grnOcrRaw" class="font-bold text-xs">Teks Hasil Scan OCR / PDF atau Paste Teks Faktur (Dapat Diedit Sebelum Ekstrak)</label>
                  <button type="button" onclick="window.parseGrnOcrToForm()" class="ons-btn ons-btn-primary text-xs py-1.5 px-3">Ekstrak ke Form GRN &darr;</button>
                </div>
                <textarea id="grnOcrRaw" rows="${grnScanState.previewDataUrl ? 6 : 3}" oninput="window.setGrnRawText(this.value)" class="ons-textarea text-xs font-mono-num" placeholder="Tempel teks faktur PDF/WA atau scan foto di atas... Contoh:&#10;FK-BSP-2026-8821 PT Bina San Prima TOP 30 Hari&#10;Amoxicillin 500mg Batch B-2026-X9 ED 30/09/2028 Qty 10 Box Total Rp 1.450.000">${S().esc(grnScanState.rawText || '')}</textarea>
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

          <div class="ons-card p-5 space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-2 pb-2 border-b" style="border-color:var(--ons-border)">
              <h3 class="font-bold text-sm">Header Penerimaan Barang (Goods Received Note — CDOB)</h3>
              <div class="flex items-center gap-2 text-xs">
                <span class="font-semibold" style="color:var(--ons-text-soft)">Tarik dari SP Aktif:</span>
                <select class="ons-select text-xs w-64" onchange="if(this.value) window.loadSpIntoGrn(this.value);">
                  <option value="">-- Pilih Surat Pesanan (Opsional) --</option>
                  ${(st.suratPesanan || []).filter((sp) => String(sp.status_sp || '') !== 'SELESAI_DITERIMA').map((sp) => `<option value="${S().esc(sp.id_sp)}" ${grnHeader.id_sp === sp.id_sp ? 'selected' : ''}>${S().esc(sp.no_sp)} (${S().esc(sp.nama_pbf)})</option>`).join('')}
                </select>
              </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div><label class="font-semibold block mb-1">No. Faktur PBF *</label><input class="ons-input font-mono-num" value="${S().esc(grnHeader.no_faktur_pbf)}" oninput="window.setGrnField('no_faktur_pbf', this.value)"/></div>
              <div><label class="font-semibold block mb-1">No. Surat Pesanan (SP)</label><input class="ons-input font-mono-num" value="${S().esc(grnHeader.no_sp)}" oninput="window.setGrnField('no_sp', this.value)"/></div>
              <div><label class="font-semibold block mb-1">Supplier PBF Resmi *</label>
                <select class="ons-select" onchange="window.setGrnField('id_pbf', this.value)">
                  ${st.supplierPbf.map((p) => `<option value="${S().esc(p.nama_pbf)}" ${grnHeader.id_pbf === p.nama_pbf ? 'selected' : ''}>${S().esc(p.nama_pbf)}</option>`).join('')}
                </select>
              </div>
              <div><label class="font-semibold block mb-1">Jatuh Tempo Pembayaran</label><input type="date" class="ons-input" value="${S().esc(grnHeader.tgl_jatuh_tempo)}" onchange="window.setGrnField('tgl_jatuh_tempo', this.value)"/></div>
              <div><label class="font-semibold block mb-1">Diskon Faktur PBF (Rp)</label><input type="number" min="0" class="ons-input font-mono-num" value="${grnHeader.diskon_pbf}" oninput="window.setGrnField('diskon_pbf', Number(this.value||0), true)"/></div>
              <div><label class="font-semibold block mb-1">PPN Masukan 11% (Rp)</label><input type="number" min="0" class="ons-input font-mono-num" value="${grnHeader.ppn_masukan}" oninput="window.setGrnField('ppn_masukan', Number(this.value||0), true)"/></div>
              <div><label class="font-semibold block mb-1">Status Pembayaran Awal</label>
                <select class="ons-select" onchange="window.setGrnField('status_bayar', this.value)">
                  <option value="BELUM_LUNAS" ${grnHeader.status_bayar !== 'LUNAS' ? 'selected' : ''}>BELUM LUNAS (Hutang Dagang PBF)</option>
                  <option value="LUNAS" ${grnHeader.status_bayar === 'LUNAS' ? 'selected' : ''}>LUNAS (Bayar Langsung Kas/Transfer)</option>
                </select>
              </div>
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
                <div>Total Bruto Item: <b class="font-mono-num">${S().rp(totalBruto)}</b></div>
                <div class="text-base font-extrabold text-blue-600">Netto Hutang Faktur: <span class="font-mono-num">${S().rp(nettoGrn)}</span></div>
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
          <h3 class="font-bold text-sm">Radar Retur PBF (Batch &le; 180 Hari Sebelum Kadaluarsa)</h3>
          <div class="ons-table-wrap">
            <table class="ons-table">
              <thead><tr><th>Nama Obat</th><th>No. Batch</th><th>Tgl ED</th><th>Qty Sisa</th><th>Qty Retur</th><th>Aksi BAR-PBF</th></tr></thead>
              <tbody>
                ${returCandidates.length ? returCandidates.map((b) => {
                  const o = st.masterObat.find((m) => m.id_obat === b.id_obat);
                  return `<tr>
                    <td class="font-semibold">${S().esc(o ? o.nama_dagang : b.id_obat)}</td>
                    <td class="font-mono-num">${S().esc(b.no_batch)}</td>
                    <td class="font-mono-num text-amber-600 font-bold">${S().esc(b.tgl_kadaluarsa)} (${S().daysUntil(b.tgl_kadaluarsa)}h)</td>
                    <td class="font-mono-num">${b.qty_sisa}</td>
                    <td><input id="returQty_${b.id_batch}" type="number" min="1" max="${b.qty_sisa}" value="${b.qty_sisa}" class="ons-input font-mono-num text-xs w-20 text-right py-1"/></td>
                    <td><button onclick="window.prosesReturBar('${b.id_batch}', Number((document.getElementById('returQty_${b.id_batch}')||{}).value || ${b.qty_sisa}))" class="ons-btn ons-btn-amber text-xs py-1 px-2.5">Buat BAR-PBF &amp; Potong Stok</button></td>
                  </tr>`;
                }).join('') : '<tr><td colspan="6" class="text-center py-6 text-xs">Tidak ada batch mendekati kadaluarsa (&le;180 hari) yang perlu diretur.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      ` : `
        <div class="ons-card p-4 space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex flex-wrap gap-2">
              <input class="ons-input text-xs w-56" placeholder="Cari No. Faktur, SP, PBF..." value="${S().esc(fakturListQ)}" oninput="window.setFakturListQ(this.value)"/>
              <div class="ons-tab-bar">
                ${['SEMUA', 'BELUM_LUNAS', 'LUNAS'].map((f) => `<button onclick="window.setFakturListFilter('${f}')" class="ons-tab-btn ${fakturListFilter === f ? 'active' : ''}">${f.replace('_', ' ')}</button>`).join('')}
              </div>
            </div>
            <button onclick="window.setFakturTab('input')" class="ons-btn ons-btn-primary text-xs">+ Input GRN Multi-Item Baru</button>
          </div>
          <div class="ons-table-wrap">
            <table class="ons-table">
              <thead><tr><th>No. Faktur &amp; SP</th><th>Supplier PBF</th><th>Jatuh Tempo</th><th>Netto Hutang</th><th>Sisa Hutang</th><th>Status</th><th>Aksi</th></tr></thead>
              <tbody>
                ${filteredFaktur.length ? filteredFaktur.map((f) => `<tr>
                  <td class="font-mono-num text-xs"><b>${S().esc(f.no_faktur_pbf)}</b><br/><span style="color:var(--ons-text-soft)">${S().esc(f.no_sp)}</span></td>
                  <td class="font-semibold">${S().esc(f.id_pbf)}</td>
                  <td class="font-mono-num">${S().esc(f.tgl_jatuh_tempo)}</td>
                  <td class="font-mono-num">${S().rp(f.netto_hutang)}</td>
                  <td class="font-mono-num font-bold ${Number(f.sisa_hutang || 0) > 0 ? 'text-red-600' : 'text-emerald-600'}">${S().rp(f.sisa_hutang)}</td>
                  <td><span class="badge-bpom ${f.status_bayar === 'LUNAS' ? 'bpom-bebas' : 'bpom-prekursor'}">${S().esc(f.status_bayar)}</span></td>
                  <td>${Number(f.sisa_hutang || 0) > 0 ? `<button onclick="navigateView('finance','hutang')" class="ons-btn ons-btn-emerald text-xs py-1 px-2.5">Bayar / Cicil</button>` : '<span class="text-xs text-emerald-600 font-semibold">Selesai</span>'}</td>
                </tr>`).join('') : '<tr><td colspan="7" class="text-center py-6 text-xs">Tidak ada faktur PBF yang sesuai filter.</td></tr>'}
              </tbody>
            </table>
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
  global.setGrnField = (k, v, rerender) => { grnHeader[k] = v; if (rerender) global.renderActiveView(); };
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
    grnScanState.rawText = sample;
    grnScanState.error = '';
    const inp = document.getElementById('grnOcrRaw');
    if (inp) inp.value = sample;
    global.parseGrnOcrToForm();
  };

  global.openGrnLiveCamera = () => {
    const scanner = global.ONSInvoiceScanner;
    if (!scanner) return;
    scanner.openLiveCameraCaptureModal((dataUrl, fileName) => {
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

  global.submitGrnFaktur = async () => {
    try {
      ensureGrnInitialized();
      if (!grnHeader.no_faktur_pbf.trim()) throw new Error('No. Faktur PBF wajib diisi.');
      const totalBruto = grnItems.reduce((s, it) => s + (Number(it.qty_dasar || 0) * Number(it.hpp_unit || 0)), 0);
      const netto = Math.max(0, totalBruto - Number(grnHeader.diskon_pbf || 0) + Number(grnHeader.ppn_masukan || 0));
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
        netto_hutang: netto,
        status_bayar: grnHeader.status_bayar || 'BELUM_LUNAS',
        items: grnItems.map((it) => ({
          id_obat: it.id_obat,
          no_batch: it.no_batch,
          tgl_kadaluarsa: it.tgl_kadaluarsa,
          qty_dasar: Number(it.qty_dasar || 1),
          hpp_unit: Number(it.hpp_unit || 0)
        }))
      }, { isWrite: true });
      grnHeader.id_sp = '';
      grnHeader.no_faktur_pbf = '';
      grnHeader.no_sp = '';
      grnHeader.status_bayar = 'BELUM_LUNAS';
      grnItems = [];
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

  global.prosesReturBar = async (idBatch, qtyMax) => {
    try {
      const res = await API().callApi('pengadaan.returBar', { id_batch: idBatch, qty_retur: qtyMax, alasan: 'Retur Batch ED Dekat' }, { isWrite: true });
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

  global.ONSViewsInventoryProcurement = { renderMasterObatView, renderGudangView, renderDefectaView, renderFakturView };
})(window);
