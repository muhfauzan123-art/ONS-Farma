/**
 * ONS FARMA DIGITAL ENTERPRISE v10.0 - Modul W-04 (Master Obat), W-05 (Gudang FEFO & Recall),
 * W-06 (Defecta & SP BPOM 5 Golongan), dan W-07 (Faktur PBF OCR/Excel & Retur BAR-PBF)
 */
(function (global) {
  'use strict';
  const S = () => global.ONSStore;
  const API = () => global.ONSApi;

  let masterFilterGol = '';
  let masterSearchQ = '';
  let wizardFullScrollMode = false;
  let wizardStep = 1;
  let importObatBuffer = [];

  /**
   * W-04: Master Obat KFA & NIE + Masking HPP Kasir + Code128 Barcode Print
   */
  function renderMasterObatView() {
    const st = S().AppState;
    const seeCost = S().canSeeFinancialCost();
    const filtered = st.masterObat.filter((o) => {
      if (masterFilterGol && String(o.golongan_bpom).toUpperCase() !== masterFilterGol) return false;
      if (masterSearchQ) {
        const h = `${o.nama_dagang} ${o.zat_aktif} ${o.kode_kfa} ${o.nie_bpom}`.toLowerCase();
        if (!h.includes(masterSearchQ.toLowerCase())) return false;
      }
      return true;
    });

    return `<div class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-xl font-bold">Master Produk Obat KFA / NIE BPOM</h1>
          <p class="text-xs" style="color:var(--ons-text-soft)">Katalog terstandar SATUSEHAT KFA, multi-satuan 3 tingkat, &amp; proteksi HPP berbasis RBAC.</p>
        </div>
        <div class="flex flex-wrap gap-2">
          ${seeCost ? `<button onclick="window.openObatWizardModal()" class="ons-btn ons-btn-primary text-xs">+ Tambah Produk (Wizard 5 Langkah)</button>
          <button onclick="window.openImportObatModal()" class="ons-btn ons-btn-emerald text-xs">&#128229; Import Excel (.xlsx)</button>` : ''}
          <button onclick="window.exportMasterObat('xlsx')" class="ons-btn ons-btn-ghost text-xs">Export Excel</button>
          <button onclick="window.exportMasterObat('pdf')" class="ons-btn ons-btn-ghost text-xs">Cetak PDF</button>
        </div>
      </div>

      <div class="ons-card p-3 flex flex-wrap items-center gap-2">
        <input class="ons-input flex-1 min-w-[200px] text-xs" placeholder="Cari Nama Dagang, Zat Aktif, Kode KFA, NIE..." value="${S().esc(masterSearchQ)}" oninput="window.setMasterSearch(this.value)"/>
        ${['', 'BEBAS', 'TERBATAS', 'KERAS', 'PREKURSOR', 'NARKOTIKA'].map((g) => `
          <button onclick="window.setMasterGol('${g}')" class="ons-btn text-xs py-1 px-3 ${masterFilterGol === g ? 'ons-btn-primary' : 'ons-btn-ghost'}">${g || 'Semua (' + st.masterObat.length + ')'}</button>
        `).join('')}
      </div>

      <div class="ons-card p-4">
        <div class="ons-table-wrap">
          <table class="ons-table">
            <thead>
              <tr>
                <th>Kode KFA / NIE</th>
                <th>Nama Obat &amp; Zat Aktif</th>
                <th>Golongan</th>
                <th>Multi-Satuan (Rasio)</th>
                <th>Stok Total</th>
                ${seeCost ? '<th>HPP Avg</th>' : ''}
                <th>Harga Umum</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map((o) => {
                const stok = S().getTotalStok(o.id_obat);
                return `<tr>
                  <td class="font-mono-num text-xs">
                    <div class="font-bold">${S().esc(o.kode_kfa || o.id_obat)}</div>
                    <div style="color:var(--ons-text-soft)">${S().esc(o.nie_bpom)}</div>
                  </td>
                  <td>
                    <div class="font-bold">${S().esc(o.nama_dagang)}</div>
                    <div class="text-xs" style="color:var(--ons-text-soft)">${S().esc(o.zat_aktif)} (${S().esc(o.kekuatan)}) &bull; ${S().esc(o.rak_lokasi)}</div>
                  </td>
                  <td>${S().bpomBadge(o.golongan_bpom)}</td>
                  <td class="text-xs font-mono-num">1 ${S().esc(o.satuan_besar)} = ${o.rasio_besar} ${S().esc(o.satuan_dasar)}</td>
                  <td class="font-mono-num font-bold ${stok <= o.stok_min ? 'text-red-600' : 'text-emerald-600'}">${stok} ${S().esc(o.satuan_dasar)}</td>
                  ${seeCost ? `<td class="font-mono-num">${S().rp(o.hpp_avg)}</td>` : ''}
                  <td class="font-mono-num font-bold text-blue-600">${S().rp(o.harga_umum)}</td>
                  <td>
                    <div class="flex gap-1">
                      <button onclick="window.printCode128Obat('${o.id_obat}')" class="ons-btn ons-btn-ghost text-xs px-2 py-1" title="Cetak Barcode Rak">Barcode</button>
                      ${seeCost ? `<button onclick="window.openObatWizardModal('${o.id_obat}')" class="ons-btn ons-btn-ghost text-xs px-2 py-1">Edit</button>` : ''}
                    </div>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>`;
  }

  global.setMasterSearch = (v) => { masterSearchQ = v; global.renderActiveView(); };
  global.setMasterGol = (g) => { masterFilterGol = g; global.renderActiveView(); };

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

  global.openObatWizardModal = (editId, stepOverride) => {
    if (stepOverride) wizardStep = Math.max(1, Math.min(5, stepOverride));
    else wizardStep = 1;
    const o = S().AppState.masterObat.find((x) => x.id_obat === editId) || {
      id_obat: '', kode_kfa: '', nama_dagang: '', zat_aktif: '', kekuatan: '', golongan_bpom: 'BEBAS',
      nie_bpom: '', suhu_simpan: 'Suhu Ruang (15-25°C)', rak_lokasi: 'RAK-A1', satuan_dasar: 'Tablet',
      satuan_sedang: 'Strip', rasio_sedang: 10, satuan_besar: 'Box', rasio_besar: 100, stok_min: 10, stok_max: 100,
      hpp_avg: 0, harga_umum: 0, harga_member: 0, harga_grosir: 0, substitusi_ids: ''
    };
    const steps = ['1. Identitas & KFA', '2. Golongan & Rak', '3. Multi-Satuan', '4. Harga & Stok', '5. Substitusi & Simpan'];
    const secCls = (n) => (!wizardFullScrollMode && wizardStep !== n) ? 'hidden' : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-3 rounded-xl border';
    const renderForm = () => `
      <div class="p-6 space-y-4">
        <div class="flex flex-wrap justify-between items-center gap-2 border-b pb-3" style="border-color:var(--ons-border)">
          <h3 class="font-bold text-lg">${o.id_obat ? 'Edit Produk Obat' : 'Wizard Tambah Produk Obat (5 Langkah)'}</h3>
          <div class="flex gap-2 items-center">
            <button type="button" onclick="window.toggleObatWizardMode('${editId || ''}')" class="ons-btn ons-btn-ghost text-xs">Mode: ${wizardFullScrollMode ? 'Scroll Penuh' : 'Stepper 5 Tahap'}</button>
            <button onclick="ONSStore.closeModal()" class="text-xl">&times;</button>
          </div>
        </div>
        ${!wizardFullScrollMode ? `<div class="grid grid-cols-5 gap-1.5 text-[11px]" id="wizStepNav">
          ${steps.map((lbl, idx) => {
            const n = idx + 1;
            const act = wizardStep === n;
            return `<button type="button" onclick="window.setObatWizardStep(${n})" class="py-1.5 px-2 rounded-lg font-semibold border text-center transition-all ${act ? 'ons-btn-primary border-blue-600' : 'ons-btn-ghost'}">${lbl}</button>`;
          }).join('')}
        </div>` : ''}
        <form id="obatWizardForm" onsubmit="event.preventDefault();window.saveObatFromWizard();" class="space-y-4 text-xs">
          <input type="hidden" id="wObatId" value="${S().esc(o.id_obat)}"/>
          <div id="wizSec1" class="${secCls(1)}" style="border-color:var(--ons-border)">
            <div class="md:col-span-2 lg:col-span-3 font-bold text-blue-600">1. Identitas &amp; Regulasi KFA / NIE BPOM</div>
            <div><label class="font-semibold block mb-1">Nama Dagang *</label><input id="wNamaDagang" class="ons-input" value="${S().esc(o.nama_dagang)}" required/></div>
            <div><label class="font-semibold block mb-1">Zat Aktif &amp; Kekuatan</label><input id="wZatAktif" class="ons-input" value="${S().esc(o.zat_aktif)}"/></div>
            <div><label class="font-semibold block mb-1">Kode KFA SATUSEHAT</label><input id="wKfa" class="ons-input font-mono-num" value="${S().esc(o.kode_kfa)}"/></div>
            <div><label class="font-semibold block mb-1">NIE BPOM</label><input id="wNie" class="ons-input font-mono-num" value="${S().esc(o.nie_bpom)}"/></div>
          </div>
          <div id="wizSec2" class="${secCls(2)}" style="border-color:var(--ons-border)">
            <div class="md:col-span-2 lg:col-span-3 font-bold text-blue-600">2. Golongan &amp; Penyimpanan CDOB</div>
            <div><label class="font-semibold block mb-1">Golongan BPOM</label>
              <select id="wGol" class="ons-select">${['BEBAS', 'TERBATAS', 'KERAS', 'PREKURSOR', 'OOT', 'PSIKOTROPIKA', 'NARKOTIKA'].map((g) => `<option ${o.golongan_bpom === g ? 'selected' : ''}>${g}</option>`).join('')}</select>
            </div>
            <div><label class="font-semibold block mb-1">Suhu Simpan</label><input id="wSuhu" class="ons-input" value="${S().esc(o.suhu_simpan)}"/></div>
            <div><label class="font-semibold block mb-1">Lokasi Rak / Chiller</label><input id="wRak" class="ons-input" value="${S().esc(o.rak_lokasi)}"/></div>
          </div>
          <div id="wizSec3" class="${secCls(3)}" style="border-color:var(--ons-border)">
            <div class="md:col-span-2 lg:col-span-3 font-bold text-blue-600">3. Multi-Satuan (Dasar / Sedang / Besar)</div>
            <div><label class="font-semibold block mb-1">Satuan Dasar (Terkecil)</label><input id="wSatDasar" class="ons-input" value="${S().esc(o.satuan_dasar)}"/></div>
            <div><label class="font-semibold block mb-1">Satuan Sedang &amp; Rasio</label><div class="flex gap-1.5"><input id="wSatSed" class="ons-input w-1/2" value="${S().esc(o.satuan_sedang || 'Strip')}"/><input id="wRasioSed" type="number" class="ons-input w-1/2 font-mono-num" value="${o.rasio_sedang}"/></div></div>
            <div><label class="font-semibold block mb-1">Satuan Besar &amp; Rasio</label><div class="flex gap-1.5"><input id="wSatBes" class="ons-input w-1/2" value="${S().esc(o.satuan_besar || 'Box')}"/><input id="wRasioBes" type="number" class="ons-input w-1/2 font-mono-num" value="${o.rasio_besar}"/></div></div>
          </div>
          <div id="wizSec4" class="${secCls(4)}" style="border-color:var(--ons-border)">
            <div class="md:col-span-2 lg:col-span-3 font-bold text-blue-600">4. Valuasi Harga &amp; Threshold Stok</div>
            <div><label class="font-semibold block mb-1">HPP Beli Rata-Rata (Rp)</label><input id="wHpp" type="number" class="ons-input font-mono-num" value="${o.hpp_avg}"/></div>
            <div><label class="font-semibold block mb-1">Harga Umum (Rp)</label><input id="wHrgUmum" type="number" class="ons-input font-mono-num" value="${o.harga_umum}"/></div>
            <div><label class="font-semibold block mb-1">Harga Member / PRB (Rp)</label><input id="wHrgMem" type="number" class="ons-input font-mono-num" value="${o.harga_member}"/></div>
            <div><label class="font-semibold block mb-1">Harga Grosir / B2B (Rp)</label><input id="wHrgGrosir" type="number" class="ons-input font-mono-num" value="${o.harga_grosir || o.harga_member}"/></div>
            <div><label class="font-semibold block mb-1">Stok Minimum (Defecta)</label><input id="wStokMin" type="number" class="ons-input font-mono-num" value="${o.stok_min}"/></div>
            <div><label class="font-semibold block mb-1">Stok Maksimum</label><input id="wStokMax" type="number" class="ons-input font-mono-num" value="${o.stok_max || 100}"/></div>
          </div>
          <div id="wizSec5" class="${secCls(5)}" style="border-color:var(--ons-border)">
            <div class="md:col-span-2 lg:col-span-3 font-bold text-blue-600">5. Substitusi Generik &amp; Konfirmasi Simpan</div>
            <div class="md:col-span-2 lg:col-span-3"><label class="font-semibold block mb-1">ID Obat Substitusi (pisahkan koma, cth: OBT-002)</label><input id="wSubstitusi" class="ons-input font-mono-num" value="${S().esc(o.substitusi_ids || '')}"/></div>
            <div class="md:col-span-2 lg:col-span-3 p-2.5 rounded-lg text-[11px]" style="background:var(--ons-bg-subtle)">Pastikan Nama Dagang, Satuan Dasar, dan Harga Jual telah terisi benar sebelum menyimpan ke database Master Obat.</div>
          </div>
          <div class="flex flex-wrap justify-between gap-2 pt-2">
            <div class="flex gap-2">
              <button type="button" onclick="ONSStore.closeModal()" class="ons-btn ons-btn-ghost">Batal</button>
              ${!wizardFullScrollMode && wizardStep > 1 ? `<button type="button" id="wizPrevBtn" onclick="window.setObatWizardStep(window._wizCurStep - 1)" class="ons-btn ons-btn-ghost">&larr; Sebelumnya</button>` : ''}
            </div>
            <div class="flex gap-2">
              ${!wizardFullScrollMode && wizardStep < 5 ? `<button type="button" id="wizNextBtn" onclick="window.setObatWizardStep(window._wizCurStep + 1)" class="ons-btn ons-btn-primary">Lanjut Langkah Berikutnya &rarr;</button>` : ''}
              ${(wizardFullScrollMode || wizardStep === 5) ? `<button type="submit" class="ons-btn ons-btn-emerald">&#9989; Simpan Produk ke Master Obat</button>` : ''}
            </div>
          </div>
        </form>
      </div>`;
    global._wizCurStep = wizardStep;
    S().openModal(renderForm(), '780px');
  };

  global.setObatWizardStep = (nextStep) => {
    wizardStep = Math.max(1, Math.min(5, Number(nextStep || 1)));
    global._wizCurStep = wizardStep;
    for (let i = 1; i <= 5; i++) {
      const sec = document.getElementById('wizSec' + i);
      if (sec) sec.className = (!wizardFullScrollMode && wizardStep !== i) ? 'hidden' : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-3 rounded-xl border';
    }
    const nav = document.getElementById('wizStepNav');
    if (nav) {
      Array.from(nav.children).forEach((btn, idx) => {
        const active = (idx + 1) === wizardStep;
        btn.className = 'py-1.5 px-2 rounded-lg font-semibold border text-center transition-all ' + (active ? 'ons-btn-primary border-blue-600' : 'ons-btn-ghost');
      });
    }
    const form = document.getElementById('obatWizardForm');
    if (form && form.lastElementChild) {
      form.lastElementChild.innerHTML = `<div class="flex gap-2">
        <button type="button" onclick="ONSStore.closeModal()" class="ons-btn ons-btn-ghost">Batal</button>
        ${wizardStep > 1 ? `<button type="button" onclick="window.setObatWizardStep(${wizardStep - 1})" class="ons-btn ons-btn-ghost">&larr; Sebelumnya</button>` : ''}
      </div>
      <div class="flex gap-2">
        ${wizardStep < 5 ? `<button type="button" onclick="window.setObatWizardStep(${wizardStep + 1})" class="ons-btn ons-btn-primary">Lanjut Langkah Berikutnya &rarr;</button>` : ''}
        ${wizardStep === 5 ? `<button type="submit" class="ons-btn ons-btn-emerald">&#9989; Simpan Produk ke Master Obat</button>` : ''}
      </div>`;
    }
  };

  global.toggleObatWizardMode = (id) => {
    wizardFullScrollMode = !wizardFullScrollMode;
    global.openObatWizardModal(id, wizardStep);
  };

  global.saveObatFromWizard = async () => {
    try {
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
        hpp_avg: Number(document.getElementById('wHpp').value || 0),
        harga_umum: Number(document.getElementById('wHrgUmum').value || 0),
        harga_member: Number(document.getElementById('wHrgMem').value || 0),
        harga_grosir: Number(document.getElementById('wHrgGrosir').value || 0),
        stok_min: Number(document.getElementById('wStokMin').value || 10),
        stok_max: Number(document.getElementById('wStokMax').value || 100),
        substitusi_ids: document.getElementById('wSubstitusi').value
      }, { isWrite: true });
      S().closeModal();
      global.toast('Produk berhasil disimpan ke Master Obat!', 'ok');
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
   * W-05: Gudang Batch FEFO, Cold-Chain 2-8°C Monitor, Blind Opname & 1-Click Emergency Recall
   */
  function renderGudangView() {
    const st = S().AppState;
    const seeCost = S().canSeeFinancialCost();
    const sorted = st.stokBatch.slice().sort((a, b) => String(a.tgl_kadaluarsa).localeCompare(String(b.tgl_kadaluarsa)));
    const ccLogs = st.coldChain.slice(-14);

    // SVG polyline untuk grafik Cold-Chain 2-8°C
    const points = ccLogs.map((l, idx) => {
      const x = ccLogs.length > 1 ? 20 + (idx / (ccLogs.length - 1)) * 280 : 160;
      const clamped = Math.max(0, Math.min(12, Number(l.suhu_celcius || 5)));
      const y = 95 - (clamped / 12) * 80;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');

    return `<div class="space-y-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-xl font-bold">Gudang Batch FEFO, Cold-Chain (2-8&deg;C) &amp; Emergency Recall</h1>
          <p class="text-xs" style="color:var(--ons-text-soft)">Pemantauan kadaluarsa real-time, blind cycle count opname, dan karantina 1 klik BPOM.</p>
        </div>
        ${seeCost ? `<div class="flex gap-2">
          <button onclick="window.openBlindOpnameModal()" class="ons-btn ons-btn-primary text-xs">&#128203; Mulai Blind Stock Opname</button>
        </div>` : ''}
      </div>

      <!-- Cold Chain 2-8°C Monitor + Logger -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div class="ons-card p-5 lg:col-span-7">
          <div class="flex items-center justify-between mb-2">
            <h3 class="font-bold text-sm">Grafik Suhu Chiller Vaksin / Insulin (Batas CDOB: 2&deg;C - 8&deg;C)</h3>
            <span class="badge-bpom bpom-terbatas">CHILLER-VAKSIN-01</span>
          </div>
          <svg viewBox="0 0 320 110" class="w-full h-36">
            <!-- Zona Aman 2-8 C -->
            <rect x="15" y="41.6" width="290" height="40" fill="rgba(16,185,129,0.12)" stroke="#10B981" stroke-dasharray="3,3"/>
            <text x="20" y="39" font-size="7" fill="#DC2626">Batas Atas 8&deg;C</text>
            <text x="20" y="90" font-size="7" fill="#0284C7">Batas Bawah 2&deg;C</text>
            ${points ? `<polyline fill="none" stroke="#0066FE" stroke-width="2.5" points="${points}"/>` : ''}
          </svg>
        </div>
        <div class="ons-card p-5 lg:col-span-5 space-y-3">
          <h3 class="font-bold text-sm">Catat Suhu Cold-Chain Baru</h3>
          <div class="grid grid-cols-2 gap-2">
            <div><label class="text-xs font-semibold">Suhu (&deg;C)</label><input id="ccTempInput" type="number" step="0.1" value="4.8" class="ons-input font-mono-num"/></div>
            <div><label class="text-xs font-semibold">Kelembapan (%)</label><input id="ccHumInput" type="number" value="54" class="ons-input font-mono-num"/></div>
          </div>
          <input id="ccNoteInput" class="ons-input text-xs" placeholder="Catatan / Tindakan korektif (opsional)"/>
          <button onclick="window.saveColdChainEntry()" class="ons-btn ons-btn-emerald w-full text-xs">Simpan Log Suhu &amp; Cek Alarm</button>
        </div>
      </div>

      <!-- Tabel Batch FEFO + 1-Click Emergency Recall -->
      <div class="ons-card p-4">
        <div class="flex justify-between items-center mb-3">
          <h3 class="font-bold text-sm">Daftar Batch Stok Aktif &amp; Karantina (Urut FEFO)</h3>
          <span class="text-xs" style="color:var(--ons-text-soft)">Merah &le; 90h &bull; Kuning 91-180h &bull; Hijau &gt; 180h</span>
        </div>
        <div class="ons-table-wrap">
          <table class="ons-table">
            <thead><tr><th>Obat</th><th>No. Batch / Faktur</th><th>ED</th><th>Sisa Qty</th><th>Karantina</th><th>Status</th>${seeCost ? '<th>Aksi Recall</th>' : ''}</tr></thead>
            <tbody>
              ${sorted.map((b) => {
                const o = st.masterObat.find((m) => m.id_obat === b.id_obat);
                const d = S().daysUntil(b.tgl_kadaluarsa);
                const edBadge = d <= 90 ? 'bpom-keras' : (d <= 180 ? 'bpom-prekursor' : 'bpom-bebas');
                return `<tr>
                  <td class="font-semibold">${S().esc(o ? o.nama_dagang : b.id_obat)}</td>
                  <td class="font-mono-num text-xs"><b>${S().esc(b.no_batch)}</b><br/><span style="color:var(--ons-text-soft)">${S().esc(b.no_faktur_pbf)}</span></td>
                  <td><span class="badge-bpom ${edBadge} font-mono-num">${S().esc(b.tgl_kadaluarsa)} (${d}h)</span></td>
                  <td class="font-mono-num font-bold">${b.qty_sisa}</td>
                  <td class="font-mono-num text-red-600">${b.qty_karantina || 0}</td>
                  <td><span class="badge-bpom ${b.status_batch === 'AKTIF' ? 'bpom-bebas' : 'bpom-keras'}">${S().esc(b.status_batch)}</span></td>
                  ${seeCost ? `<td><button onclick="window.triggerRecallBatch('${b.id_batch}','${S().esc(b.no_batch)}')" ${b.status_batch !== 'AKTIF' ? 'disabled' : ''} class="ons-btn ons-btn-danger text-xs py-1 px-2.5">&#9888;&#65039; 1-Klik Recall BPOM</button></td>` : ''}
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>`;
  }

  global.saveColdChainEntry = async () => {
    try {
      const res = await API().callApi('coldchain.log', {
        suhu_celcius: Number(document.getElementById('ccTempInput').value),
        kelembapan: Number(document.getElementById('ccHumInput').value),
        tindakan_korektif: document.getElementById('ccNoteInput').value
      }, { isWrite: true });
      global.toast(res.item.status_alarm === 'NORMAL' ? 'Suhu normal tercatat!' : 'ALARM: Suhu di luar 2-8°C! Notifikasi Owner diantrikan.', res.item.status_alarm === 'NORMAL' ? 'ok' : 'warn');
      await global.bootLoadState(true);
    } catch (e) { global.toast(e.message, 'err'); }
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
  function renderDefectaView() {
    const st = S().AppState;
    const lowStock = st.masterObat.filter((o) => S().getTotalStok(o.id_obat) <= Number(o.stok_min || 10));

    return `<div class="space-y-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-xl font-bold">Smart Defecta &amp; Surat Pesanan (SP) BPOM 5 Golongan</h1>
          <p class="text-xs" style="color:var(--ons-text-soft)">Pemisahan otomatis SP Reguler, OOT, Prekursor, Psikotropika, &amp; Narkotika terintegrasi Doc Engine.</p>
        </div>
        <button onclick="window.generateSpFromDefecta()" class="ons-btn ons-btn-primary text-xs">&#128221; Terbitkan Draf SP Otomatis (Doc Engine)</button>
      </div>

      <!-- Comparator PBF -->
      <div class="ons-card p-4">
        <h3 class="font-bold text-sm mb-3">Komparator SLA &amp; Termin Supplier PBF Resmi CDOB</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          ${st.supplierPbf.map((p) => `<div class="p-3 rounded-xl border space-y-1">
            <div class="font-bold text-sm">${S().esc(p.nama_pbf)}</div>
            <div class="font-mono-num" style="color:var(--ons-text-soft)">${S().esc(p.kode_cdob)}</div>
            <div class="flex justify-between pt-1"><span>Lead Time: <b>${p.lead_time_hari} Hari</b></span><span class="text-emerald-600 font-bold">SLA ${p.skor_sla}%</span></div>
            <div>Termin Kredit: <b>TOP ${p.termin_hari} Hari</b></div>
          </div>`).join('')}
        </div>
      </div>

      <div class="ons-card p-4">
        <h3 class="font-bold text-sm mb-3">Daftar Defecta Stok Tipis (${lowStock.length} Item Memerlukan Order)</h3>
        <div class="ons-table-wrap">
          <table class="ons-table">
            <thead><tr><th>Obat</th><th>Golongan SP BPOM</th><th>Stok Sisa / Min</th><th>Saran Order</th><th>PBF Utama</th><th>Estimasi Biaya</th></tr></thead>
            <tbody>
              ${lowStock.length ? lowStock.map((o) => {
                const s = S().getTotalStok(o.id_obat);
                const qtyOrder = Math.max(10, Number(o.stok_max || 100) - s);
                return `<tr>
                  <td class="font-bold">${S().esc(o.nama_dagang)}</td>
                  <td>${S().bpomBadge(o.golongan_bpom)}</td>
                  <td class="font-mono-num text-red-600 font-bold">${s} / ${o.stok_min}</td>
                  <td class="font-mono-num font-bold text-blue-600">${qtyOrder} ${S().esc(o.satuan_dasar)}</td>
                  <td class="text-xs">${S().esc(o.pbf_utama)}</td>
                  <td class="font-mono-num">${S().rp(qtyOrder * Number(o.hpp_terakhir || o.hpp_avg || 0))}</td>
                </tr>`;
              }).join('') : '<tr><td colspan="6" class="text-center py-6 text-xs">Seluruh stok produk masih aman di atas batas minimum!</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    </div>`;
  }

  global.generateSpFromDefecta = async () => {
    try {
      const res = await API().callApi('doc.createDraft', {
        kode_templat: 'SP_BPOM_5_GOL',
        judul: 'SP Pengadaan Defecta ' + new Date().toLocaleDateString('id-ID'),
        data: {
          GOLONGAN_SP: 'REGULER & PREKURSOR',
          NAMA_PBF: 'PT Bina San Prima',
          ALAMAT_PBF: 'Surabaya / Makassar',
          NAMA_APJ: 'apt. Siti Rahma, S.Farm',
          NO_SIPA: '19920412/SIPA_35.78/2025/1042',
          NAMA_APOTEK: 'Apotek ONS Farma Enterprise'
        }
      }, { isWrite: true });
      global.toast('Draf SP BPOM (' + res.item.NomorSurat + ') diterbitkan ke Mesin Surat! Buka menu Keuangan & Surat untuk TTD PIN APJ.', 'ok');
    } catch (e) { global.toast(e.message, 'err'); }
  };

  /**
   * W-07: Terima Faktur PBF (OCR / Excel XLSX) & Radar Retur BAR-PBF
   */
  function renderFakturView() {
    const st = S().AppState;
    const returCandidates = st.stokBatch.filter((b) => b.status_batch === 'AKTIF' && b.qty_sisa > 0 && S().daysUntil(b.tgl_kadaluarsa) <= 180);

    return `<div class="space-y-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-xl font-bold">Penerimaan Faktur PBF (OCR / Excel) &amp; Retur BAR-PBF</h1>
          <p class="text-xs" style="color:var(--ons-text-soft)">Input faktur CDOB masuk ke Hutang PBF &amp; Batch FEFO, serta pengembalian barang mendekati ED.</p>
        </div>
        <button onclick="window.openInputFakturModal()" class="ons-btn ons-btn-primary text-xs">+ Input / Import Faktur PBF</button>
      </div>

      <div class="ons-card p-4">
        <h3 class="font-bold text-sm mb-3">Daftar Faktur Pembelian PBF &amp; Status Hutang Usaha</h3>
        <div class="ons-table-wrap">
          <table class="ons-table">
            <thead><tr><th>No. Faktur &amp; SP</th><th>Supplier PBF</th><th>Jatuh Tempo</th><th>Netto Hutang</th><th>Sisa Hutang</th><th>Status</th></tr></thead>
            <tbody>
              ${st.fakturPbf.map((f) => `<tr>
                <td class="font-mono-num text-xs"><b>${S().esc(f.no_faktur_pbf)}</b><br/><span style="color:var(--ons-text-soft)">${S().esc(f.no_sp)}</span></td>
                <td class="font-semibold">${S().esc(f.id_pbf)}</td>
                <td class="font-mono-num">${S().esc(f.tgl_jatuh_tempo)}</td>
                <td class="font-mono-num">${S().rp(f.netto_hutang)}</td>
                <td class="font-mono-num font-bold text-red-600">${S().rp(f.sisa_hutang)}</td>
                <td><span class="badge-bpom ${f.status_bayar === 'LUNAS' ? 'bpom-bebas' : 'bpom-prekursor'}">${S().esc(f.status_bayar)}</span></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="ons-card p-4">
        <h3 class="font-bold text-sm mb-3">Radar Retur PBF (Batch 90-180 Hari Sebelum Kadaluarsa)</h3>
        <div class="ons-table-wrap">
          <table class="ons-table">
            <thead><tr><th>Nama Obat</th><th>Batch</th><th>Tgl ED</th><th>Qty Sisa</th><th>Aksi BAR-PBF</th></tr></thead>
            <tbody>
              ${returCandidates.map((b) => {
                const o = st.masterObat.find((m) => m.id_obat === b.id_obat);
                return `<tr>
                  <td class="font-semibold">${S().esc(o ? o.nama_dagang : b.id_obat)}</td>
                  <td class="font-mono-num">${S().esc(b.no_batch)}</td>
                  <td class="font-mono-num text-amber-600 font-bold">${S().esc(b.tgl_kadaluarsa)} (${S().daysUntil(b.tgl_kadaluarsa)}h)</td>
                  <td class="font-mono-num">${b.qty_sisa}</td>
                  <td><button onclick="window.prosesReturBar('${b.id_batch}', ${b.qty_sisa})" class="ons-btn ons-btn-amber text-xs py-1 px-2.5">Buat BAR-PBF &amp; Potong Stok</button></td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>`;
  }

  global.openInputFakturModal = () => {
    S().openModal(`<div class="p-6 space-y-4">
      <div class="flex justify-between items-center"><h3 class="font-bold text-base">Input Faktur PBF &amp; Smart OCR Text Parser</h3><button onclick="ONSStore.closeModal()" class="text-xl">&times;</button></div>
      <div class="p-3 rounded-xl border text-xs space-y-2" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
        <div class="flex justify-between items-center">
          <span class="font-bold">&#128270; Tempel Teks PDF/Foto Faktur PBF (Ekstrak Otomatis)</span>
          <button type="button" onclick="window.parseFakturTextHint()" class="ons-btn ons-btn-primary text-[11px] py-1 px-2.5">Ekstrak ke Form &darr;</button>
        </div>
        <textarea id="fOcrRaw" rows="2" class="ons-textarea text-[11px] font-mono-num" placeholder="Contoh: FK-BSP-8821 PT Bina San Prima Batch B-2026-X9 ED 2028-09-30 Qty 120 Total Rp 1.450.000"></textarea>
      </div>
      <div class="grid grid-cols-2 gap-3 text-xs">
        <div><label class="font-semibold block mb-1">No. Faktur PBF *</label><input id="fNoFak" class="ons-input font-mono-num" value="FK-BSP-${Math.floor(1000 + Math.random() * 8999)}"/></div>
        <div><label class="font-semibold block mb-1">Supplier PBF</label><select id="fPbf" class="ons-select">${S().AppState.supplierPbf.map((p) => `<option>${S().esc(p.nama_pbf)}</option>`).join('')}</select></div>
        <div><label class="font-semibold block mb-1">Produk Obat</label><select id="fObat" class="ons-select">${S().AppState.masterObat.map((o) => `<option value="${o.id_obat}">${S().esc(o.nama_dagang)}</option>`).join('')}</select></div>
        <div><label class="font-semibold block mb-1">No. Batch Baru</label><input id="fBatch" class="ons-input font-mono-num" value="B-${new Date().getFullYear()}-NEW"/></div>
        <div><label class="font-semibold block mb-1">Tanggal ED</label><input id="fEd" type="date" class="ons-input" value="2028-06-30"/></div>
        <div><label class="font-semibold block mb-1">Qty Diterima (Dasar)</label><input id="fQty" type="number" class="ons-input font-mono-num" value="100"/></div>
        <div><label class="font-semibold block mb-1">Total Tagihan Netto (Rp)</label><input id="fNetto" type="number" class="ons-input font-mono-num" value="950000"/></div>
        <div><label class="font-semibold block mb-1">Jatuh Tempo</label><input id="fJt" type="date" class="ons-input" value="${new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)}"/></div>
      </div>
      <button onclick="window.saveFakturSubmit()" class="ons-btn ons-btn-emerald w-full text-xs">Simpan Faktur &amp; Masukkan ke Stok FEFO</button>
    </div>`, '640px');
  };

  global.parseFakturTextHint = () => {
    const raw = (document.getElementById('fOcrRaw') || {}).value || '';
    if (!raw.trim()) return global.toast('Tempel teks faktur terlebih dahulu.', 'warn');
    const fakM = raw.match(/\b((?:FK|INV|FJ)[-\/][A-Z0-9\-\/]{3,})/i);
    if (fakM) document.getElementById('fNoFak').value = fakM[1].toUpperCase();
    const batM = raw.match(/BATCH[:\s#-]*([A-Z0-9\-]{3,})/i);
    if (batM) document.getElementById('fBatch').value = batM[1].toUpperCase();
    const edM = raw.match(/(20\d{2}-\d{2}-\d{2})/);
    if (edM) document.getElementById('fEd').value = edM[1];
    const qtyM = raw.match(/(?:QTY|JUMLAH)[:\s]*(\d+)|(\d+)\s*(?:BOX|TAB|KAP|BTL|PCS)/i);
    if (qtyM) document.getElementById('fQty').value = Number(qtyM[1] || qtyM[2] || 100);
    const rpM = raw.match(/(?:RP|TOTAL|NETTO)[:.\s]*([\d.,]{4,})/i);
    if (rpM) {
      const num = Number(rpM[1].replace(/[.,]/g, ''));
      if (num > 0) document.getElementById('fNetto').value = num;
    }
    const pbfSel = document.getElementById('fPbf');
    if (pbfSel) {
      Array.from(pbfSel.options).forEach((opt) => {
        if (raw.toLowerCase().includes(opt.value.toLowerCase().split(' ').slice(0, 2).join(' '))) pbfSel.value = opt.value;
      });
    }
    global.toast('Ekstraksi teks faktur selesai! Periksa kembali kolom angka.', 'ok');
  };

  global.saveFakturSubmit = async () => {
    try {
      const qty = Number(document.getElementById('fQty').value || 1);
      const netto = Number(document.getElementById('fNetto').value || 0);
      await API().callApi('pengadaan.fakturSave', {
        no_faktur_pbf: document.getElementById('fNoFak').value,
        id_pbf: document.getElementById('fPbf').value,
        tgl_jatuh_tempo: document.getElementById('fJt').value,
        netto_hutang: netto,
        items: [{
          id_obat: document.getElementById('fObat').value,
          no_batch: document.getElementById('fBatch').value,
          tgl_kadaluarsa: document.getElementById('fEd').value,
          qty_dasar: qty,
          hpp_unit: Math.round(netto / Math.max(1, qty))
        }]
      }, { isWrite: true });
      S().closeModal();
      global.toast('Faktur PBF & Batch FEFO baru berhasil ditambahkan!', 'ok');
      await global.bootLoadState(true);
    } catch (e) { global.toast(e.message, 'err'); }
  };

  global.prosesReturBar = async (idBatch, qtyMax) => {
    try {
      const res = await API().callApi('pengadaan.returBar', { id_batch: idBatch, qty_retur: qtyMax, alasan: 'Retur Batch ED Dekat' }, { isWrite: true });
      global.toast('Retur BAR-PBF dicatat (' + res.qty_retur + ' unit). Potongan hutang: ' + S().rp(res.nilai_potong_hutang), 'ok');
      await global.bootLoadState(true);
    } catch (e) { global.toast(e.message, 'err'); }
  };

  global.ONSViewsInventoryProcurement = { renderMasterObatView, renderGudangView, renderDefectaView, renderFakturView };
})(window);
