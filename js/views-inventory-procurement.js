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
  let gudangTab = 'batch';
  let mutasiFilterObat = '';
  let mutasiFilterJenis = '';

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
   * W-05: Gudang Batch FEFO (4 Sub-Menu: batch | kartu-stok | coldchain | opname)
   */
  let gudangBatchQ = '';
  let gudangBatchFilter = 'SEMUA';
  let opnameDraftQty = {};
  let opnameDraftReason = '';

  function renderGudangView() {
    const st = S().AppState;
    gudangTab = (st.subTabs && st.subTabs.gudang) || gudangTab || 'batch';
    const seeCost = S().canSeeFinancialCost();
    const sorted = st.stokBatch.slice().sort((a, b) => String(a.tgl_kadaluarsa).localeCompare(String(b.tgl_kadaluarsa)));
    const ccLogs = st.coldChain.slice(-20);

    // SVG polyline untuk grafik Cold-Chain 2-8°C
    const points = ccLogs.map((l, idx) => {
      const x = ccLogs.length > 1 ? 20 + (idx / (ccLogs.length - 1)) * 280 : 160;
      const clamped = Math.max(0, Math.min(12, Number(l.suhu_celcius || 5)));
      const y = 95 - (clamped / 12) * 80;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');

    const mutasiRows = (st.mutasiStok || []).filter((m) => {
      const okOb = !mutasiFilterObat || String(m.id_obat) === mutasiFilterObat;
      const okJn = !mutasiFilterJenis || String(m.jenis_mutasi || '').toUpperCase() === mutasiFilterJenis;
      return okOb && okJn;
    });

    const latestCc = ccLogs.length ? ccLogs[ccLogs.length - 1] : null;
    const totalNilaiGudang = seeCost ? st.stokBatch.reduce((s, b) => s + (Number(b.qty_sisa || 0) * Number(b.hpp_beli || 0)), 0) : 0;

    // Filter Batch Tab
    const gq = gudangBatchQ.trim().toLowerCase();
    const filteredBatches = sorted.filter((b) => {
      const o = st.masterObat.find((m) => m.id_obat === b.id_obat);
      const d = S().daysUntil(b.tgl_kadaluarsa);
      if (gudangBatchFilter === 'KRITIS' && !(b.status_batch === 'AKTIF' && d <= 90)) return false;
      if (gudangBatchFilter === 'KARANTINA' && b.status_batch === 'AKTIF' && !(Number(b.qty_karantina || 0) > 0)) return false;
      if (gudangBatchFilter === 'AMAN' && !(b.status_batch === 'AKTIF' && d > 90 && b.qty_sisa > 0)) return false;
      if (gq) {
        const hay = `${b.no_batch} ${b.no_faktur_pbf} ${o ? o.nama_dagang : b.id_obat}`.toLowerCase();
        if (!hay.includes(gq)) return false;
      }
      return true;
    });

    // Opname Physical Count Draft Rows
    const activeForOpname = sorted.filter((b) => b.status_batch === 'AKTIF' && (!gq || `${b.no_batch} ${(st.masterObat.find((m) => m.id_obat === b.id_obat) || {}).nama_dagang || b.id_obat}`.toLowerCase().includes(gq)));
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
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-xl font-bold">Gudang Batch FEFO, Kartu Stok, Chiller &amp; Stock Opname</h1>
          <p class="text-xs" style="color:var(--ons-text-soft)">Kelola batch ED terdekat, buku mutasi Kartu Stok BPOM, log suhu Chiller 2-8&deg;C, dan penyesuaian fisik Stock Opname.</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <div class="ons-tab-bar">
            <button onclick="window.setGudangTab('batch')" class="ons-tab-btn ${gudangTab === 'batch' ? 'active' : ''}">Batch &amp; FEFO (${sorted.length})</button>
            <button onclick="window.setGudangTab('kartu-stok')" class="ons-tab-btn ${gudangTab === 'kartu-stok' ? 'active' : ''}">Kartu Stok (${(st.mutasiStok || []).length})</button>
            <button onclick="window.setGudangTab('coldchain')" class="ons-tab-btn ${gudangTab === 'coldchain' ? 'active' : ''}">Cold-Chain 2-8&deg;C</button>
            ${seeCost ? `<button onclick="window.setGudangTab('opname')" class="ons-tab-btn ${gudangTab === 'opname' ? 'active' : ''}">Stock Opname Fisik</button>` : ''}
          </div>
        </div>
      </div>

      ${gudangTab === 'kartu-stok' ? `
        <div class="ons-card p-4 space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex flex-wrap gap-2">
              <select class="ons-select w-60 text-xs" onchange="window.setMutasiFilterObat(this.value)">
                <option value="">-- Semua Produk Obat --</option>
                ${st.masterObat.map((o) => `<option value="${S().esc(o.id_obat)}" ${mutasiFilterObat === o.id_obat ? 'selected' : ''}>${S().esc(o.nama_dagang)}</option>`).join('')}
              </select>
              <select class="ons-select w-48 text-xs" onchange="window.setMutasiFilterJenis(this.value)">
                <option value="">-- Semua Jenis Mutasi --</option>
                ${['PENJUALAN_POS', 'RETUR_PENJUALAN', 'PEMBELIAN_PBF', 'OPNAME', 'RECALL_KARANTINA', 'RETUR_PBF'].map((j) => `<option value="${j}" ${mutasiFilterJenis === j ? 'selected' : ''}>${j}</option>`).join('')}
              </select>
            </div>
            <div class="flex gap-2">
              <button onclick="window.refreshMutasiStokServer()" class="ons-btn ons-btn-ghost text-xs">Refresh Server</button>
              <button onclick="window.exportKartuStok('xlsx')" class="ons-btn ons-btn-emerald text-xs">Export Kartu Stok (.xlsx)</button>
            </div>
          </div>
          <div class="ons-table-wrap">
            <table class="ons-table">
              <thead><tr><th>Waktu</th><th>Produk Obat</th><th>No Batch</th><th>Jenis Mutasi</th><th>Qty Perubahan</th><th>Stok Akhir</th><th>Referensi</th><th>Catatan</th></tr></thead>
              <tbody>
                ${mutasiRows.length === 0 ? `<tr><td colspan="8" class="text-center py-6 text-xs" style="color:var(--ons-text-soft)">Belum ada histori mutasi pada filter ini.</td></tr>` : mutasiRows.slice(0, 120).map((m) => `<tr>
                  <td class="text-xs whitespace-nowrap font-mono-num">${S().formatTgl(m.timestamp, true)}</td>
                  <td class="font-semibold text-xs">${S().esc(m.nama_dagang || m.id_obat)}</td>
                  <td class="font-mono-num text-xs">${S().esc(m.no_batch || m.id_batch)}</td>
                  <td><span class="badge-bpom ${Number(m.qty_ubah) >= 0 ? 'bpom-bebas' : 'bpom-prekursor'}">${S().esc(m.jenis_mutasi)}</span></td>
                  <td class="font-mono-num font-bold ${Number(m.qty_ubah) >= 0 ? 'text-emerald-600' : 'text-red-600'}">${Number(m.qty_ubah) > 0 ? '+' : ''}${m.qty_ubah}</td>
                  <td class="font-mono-num font-bold">${m.stok_akhir}</td>
                  <td class="font-mono-num text-xs">${S().esc(m.referensi_id || '-')}</td>
                  <td class="text-xs" style="color:var(--ons-text-soft)">${S().esc(m.catatan || '-')}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : gudangTab === 'coldchain' ? `
        <div class="space-y-4">
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div class="ons-card p-5 lg:col-span-7">
              <div class="flex items-center justify-between mb-2">
                <div>
                  <h3 class="font-bold text-sm">Grafik Suhu Chiller Vaksin / Insulin (Batas CDOB: 2&deg;C - 8&deg;C)</h3>
                  <div class="text-[11px]" style="color:var(--ons-text-soft)">Terakhir: <b>${latestCc ? latestCc.suhu_celcius + ' °C (' + latestCc.kelembapan + '%)' : '4.8 °C'}</b> &bull; Status: <b class="${!latestCc || latestCc.status_alarm === 'NORMAL' ? 'text-emerald-600' : 'text-red-600'}">${latestCc ? S().esc(latestCc.status_alarm) : 'NORMAL'}</b></div>
                </div>
                <span class="badge-bpom bpom-terbatas">CHILLER-VAKSIN-01</span>
              </div>
              <svg viewBox="0 0 320 110" class="w-full h-44">
                <rect x="15" y="41.6" width="290" height="40" fill="rgba(16,185,129,0.12)" stroke="#10B981" stroke-dasharray="3,3"/>
                <text x="20" y="39" font-size="7" fill="#DC2626">Batas Atas 8&deg;C</text>
                <text x="20" y="90" font-size="7" fill="#0284C7">Batas Bawah 2&deg;C</text>
                ${points ? `<polyline fill="none" stroke="#0066FE" stroke-width="2.5" points="${points}"/>` : ''}
              </svg>
            </div>
            <div class="ons-card p-5 lg:col-span-5 space-y-3">
              <h3 class="font-bold text-sm">Catat Pemeriksaan Suhu Cold-Chain Baru</h3>
              <div class="grid grid-cols-2 gap-2 text-xs">
                <div><label class="font-semibold block mb-1">Unit Kulkas</label>
                  <select id="ccKulkasSelect" class="ons-select text-xs">
                    <option value="CHILLER-VAKSIN-01">CHILLER-VAKSIN-01 (2-8&deg;C)</option>
                    <option value="CHILLER-INSULIN-02">CHILLER-INSULIN-02 (2-8&deg;C)</option>
                  </select>
                </div>
                <div><label class="font-semibold block mb-1">Kelembapan (%)</label><input id="ccHumInput" type="number" value="54" class="ons-input font-mono-num"/></div>
              </div>
              <div class="text-xs"><label class="font-semibold block mb-1">Pembacaan Suhu (&deg;C) *</label><input id="ccTempInput" type="number" step="0.1" value="4.8" class="ons-input font-mono-num font-bold text-base"/></div>
              <input id="ccNoteInput" class="ons-input text-xs" placeholder="Catatan / Tindakan korektif jika suhu keluar rentang..."/>
              <button onclick="window.saveColdChainEntry()" class="ons-btn ons-btn-emerald w-full text-xs">Simpan Log Suhu &amp; Cek Alarm CDOB</button>
            </div>
          </div>
          <div class="ons-card p-4">
            <h3 class="font-bold text-sm mb-3">Histori Pencatatan Suhu Chiller (${st.coldChain.length} Log)</h3>
            <div class="ons-table-wrap">
              <table class="ons-table">
                <thead><tr><th>Waktu Catat</th><th>Unit Chiller</th><th>Suhu (&deg;C)</th><th>Kelembapan</th><th>Status Alarm</th><th>Petugas</th><th>Tindakan Korektif</th></tr></thead>
                <tbody>
                  ${st.coldChain.slice().reverse().slice(0, 40).map((c) => `<tr>
                    <td class="font-mono-num text-xs">${S().formatTgl(c.timestamp, true)}</td>
                    <td class="font-mono-num text-xs font-bold">${S().esc(c.id_kulkas)}</td>
                    <td class="font-mono-num font-bold ${Number(c.suhu_celcius) >= 2 && Number(c.suhu_celcius) <= 8 ? 'text-emerald-600' : 'text-red-600'}">${c.suhu_celcius} &deg;C</td>
                    <td class="font-mono-num text-xs">${c.kelembapan}%</td>
                    <td><span class="badge-bpom ${c.status_alarm === 'NORMAL' ? 'bpom-bebas' : 'bpom-keras'}">${S().esc(c.status_alarm)}</span></td>
                    <td class="text-xs">${S().esc(c.petugas_id)}</td>
                    <td class="text-xs" style="color:var(--ons-text-soft)">${S().esc(c.tindakan_korektif || '-')}</td>
                  </tr>`).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ` : (gudangTab === 'opname' && seeCost) ? `
        <div class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div class="ons-card p-3.5"><div class="text-xs" style="color:var(--ons-text-soft)">Batch Aktif Dipindai</div><div class="text-lg font-bold font-mono-num">${activeForOpname.length}</div></div>
            <div class="ons-card p-3.5"><div class="text-xs" style="color:var(--ons-text-soft)">Batch Sudah Diisi Hitungan</div><div class="text-lg font-bold font-mono-num text-blue-600">${opnameCounted}</div></div>
            <div class="ons-card p-3.5"><div class="text-xs" style="color:var(--ons-text-soft)">Net Selisih Unit</div><div class="text-lg font-bold font-mono-num ${opnameSelisihUnit === 0 ? 'text-emerald-600' : 'text-amber-600'}">${opnameSelisihUnit > 0 ? '+' : ''}${opnameSelisihUnit}</div></div>
            <div class="ons-card p-3.5"><div class="text-xs" style="color:var(--ons-text-soft)">Dampak Nilai HPP Selisih</div><div class="text-lg font-bold font-mono-num ${opnameSelisihRp >= 0 ? 'text-emerald-600' : 'text-red-600'}">${S().rp(opnameSelisihRp)}</div></div>
          </div>
          <div class="ons-card p-4 space-y-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <input class="ons-input text-xs w-64" placeholder="Cari obat / no. batch opname..." value="${S().esc(gudangBatchQ)}" oninput="window.setGudangBatchQ(this.value)"/>
              <div class="flex flex-wrap items-center gap-2">
                <input id="opnameWorkspaceReason" class="ons-input text-xs w-60" placeholder="Catatan/Alasan SO..." value="${S().esc(opnameDraftReason || 'Stock Opname Rutin Gudang')}" oninput="window.setOpnameDraftReason(this.value)"/>
                <button onclick="window.submitFullOpnameWorkspace()" class="ons-btn ons-btn-emerald text-xs">Simpan Hasil Opname (${opnameCounted} Batch)</button>
              </div>
            </div>
            <div class="ons-table-wrap">
              <table class="ons-table">
                <thead><tr><th>Nama Obat</th><th>No. Batch &amp; ED</th><th>Stok Sistem</th><th>Hitung Fisik Riil</th><th>Selisih Unit</th><th>Estimasi Selisih Rp</th></tr></thead>
                <tbody>
                  ${activeForOpname.map((b) => {
                    const o = st.masterObat.find((m) => m.id_obat === b.id_obat);
                    const val = opnameDraftQty[b.id_batch] !== undefined ? opnameDraftQty[b.id_batch] : '';
                    const diff = val !== '' ? (Number(val) - Number(b.qty_sisa || 0)) : null;
                    const diffRp = diff !== null ? diff * Number(b.hpp_beli || 0) : 0;
                    return `<tr>
                      <td class="font-semibold text-xs">${S().esc(o ? o.nama_dagang : b.id_obat)}</td>
                      <td class="font-mono-num text-xs"><b>${S().esc(b.no_batch)}</b> &bull; ED ${S().esc(b.tgl_kadaluarsa)}</td>
                      <td class="font-mono-num font-bold">${b.qty_sisa}</td>
                      <td><input type="number" min="0" value="${S().esc(val)}" placeholder="Isi qty riil" oninput="window.setOpnameDraftQty('${b.id_batch}', this.value)" class="ons-input font-mono-num text-xs w-28 py-1 text-right"/></td>
                      <td class="font-mono-num font-bold ${diff === null ? '' : (diff === 0 ? 'text-emerald-600' : (diff < 0 ? 'text-red-600' : 'text-blue-600'))}">${diff === null ? '-' : ((diff > 0 ? '+' : '') + diff)}</td>
                      <td class="font-mono-num text-xs ${diffRp < 0 ? 'text-red-600' : 'text-emerald-600'}">${diff === null ? '-' : S().rp(diffRp)}</td>
                    </tr>`;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ` : `
        <div class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div class="ons-card p-3.5"><div class="text-xs" style="color:var(--ons-text-soft)">Total Batch Tersedia</div><div class="text-lg font-bold font-mono-num">${sorted.length}</div></div>
            <div class="ons-card p-3.5"><div class="text-xs" style="color:var(--ons-text-soft)">ED Kritis (&le; 90 Hari)</div><div class="text-lg font-bold font-mono-num text-red-600">${sorted.filter((b) => b.status_batch === 'AKTIF' && S().daysUntil(b.tgl_kadaluarsa) <= 90).length}</div></div>
            <div class="ons-card p-3.5"><div class="text-xs" style="color:var(--ons-text-soft)">Stok Karantina Recall</div><div class="text-lg font-bold font-mono-num text-amber-600">${sorted.reduce((s, b) => s + Number(b.qty_karantina || 0), 0)} Unit</div></div>
            ${seeCost ? `<div class="ons-card p-3.5"><div class="text-xs" style="color:var(--ons-text-soft)">Valuasi Persediaan (HPP)</div><div class="text-lg font-bold font-mono-num text-blue-600">${S().rp(totalNilaiGudang)}</div></div>` : ''}
          </div>
          <div class="ons-card p-4 space-y-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex flex-wrap gap-2 items-center">
                <input class="ons-input text-xs w-60" placeholder="Cari obat, batch, faktur..." value="${S().esc(gudangBatchQ)}" oninput="window.setGudangBatchQ(this.value)"/>
                <div class="ons-tab-bar">
                  ${['SEMUA', 'KRITIS', 'KARANTINA', 'AMAN'].map((f) => `<button onclick="window.setGudangBatchFilter('${f}')" class="ons-tab-btn ${gudangBatchFilter === f ? 'active' : ''}">${f}</button>`).join('')}
                </div>
              </div>
              ${seeCost ? `<button onclick="window.setGudangTab('opname')" class="ons-btn ons-btn-primary text-xs">Buka Stock Opname Fisik &rarr;</button>` : ''}
            </div>
            <div class="ons-table-wrap">
              <table class="ons-table">
                <thead><tr><th>Obat</th><th>No. Batch / Faktur</th><th>ED</th><th>Sisa Qty</th><th>Karantina</th><th>Status</th>${seeCost ? '<th>Aksi Recall</th>' : ''}</tr></thead>
                <tbody>
                  ${filteredBatches.map((b) => {
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
                      ${seeCost ? `<td><button onclick="window.triggerRecallBatch('${b.id_batch}','${S().esc(b.no_batch)}')" ${b.status_batch !== 'AKTIF' ? 'disabled' : ''} class="ons-btn ons-btn-danger text-xs py-1 px-2.5">1-Klik Recall BPOM</button></td>` : ''}
                    </tr>`;
                  }).join('') || '<tr><td colspan="7" class="text-center py-6 text-xs">Tidak ada batch cocok dengan filter ini.</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `}
    </div>`;
  }

  global.setGudangTab = (t) => {
    gudangTab = t || 'batch';
    if (S().AppState.subTabs) S().AppState.subTabs.gudang = gudangTab;
    global.renderActiveView();
    if (typeof global.syncNavHighlight === 'function') global.syncNavHighlight();
  };
  global.setGudangBatchQ = (v) => { gudangBatchQ = v || ''; global.renderActiveView(); };
  global.setGudangBatchFilter = (v) => { gudangBatchFilter = v || 'SEMUA'; global.renderActiveView(); };
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

  global.saveColdChainEntry = async () => {
    try {
      const res = await API().callApi('coldchain.log', {
        id_kulkas: (document.getElementById('ccKulkasSelect') || {}).value || 'CHILLER-VAKSIN-01',
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
  let defectaTab = 'order';
  let defectaOrderQty = {};
  let defectaSupplierQ = '';

  function renderDefectaView() {
    const st = S().AppState;
    defectaTab = (st.subTabs && st.subTabs.defecta) || defectaTab || 'order';
    const lowStock = st.masterObat.filter((o) => S().getTotalStok(o.id_obat) <= Number(o.stok_min || 10));
    const soldMap = {};
    (st.detailPenjualan || []).forEach((d) => { soldMap[d.id_obat] = (soldMap[d.id_obat] || 0) + Number(d.qty || 0); });
    const estDos = (idObat, sisa, minStok) => {
      const rateDay = Math.max(0.5, Number(soldMap[idObat] || 0) / 7 || (Number(minStok || 10) / 14));
      return Math.max(0, Math.round(sisa / rateDay));
    };
    const groupedPbf = {};
    lowStock.forEach((o) => {
      const pbf = o.pbf_utama || 'PBF Reguler Lainnya';
      if (!groupedPbf[pbf]) groupedPbf[pbf] = [];
      groupedPbf[pbf].push(o);
    });

    const getOrderQty = (o) => {
      if (defectaOrderQty[o.id_obat] !== undefined) return Math.max(1, Number(defectaOrderQty[o.id_obat] || 1));
      const s = S().getTotalStok(o.id_obat);
      return Math.max(10, Number(o.stok_max || 100) - s);
    };

    const sq = defectaSupplierQ.trim().toLowerCase();
    const filteredSuppliers = (st.supplierPbf || []).filter((p) => {
      if (!sq) return true;
      return `${p.nama_pbf} ${p.kode_cdob} ${p.kontak_wa} ${p.id_pbf}`.toLowerCase().includes(sq);
    });

    return `<div class="space-y-5 ons-view-enter">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-xl font-bold">Smart Defecta (DOS), SP BPOM 5 Golongan &amp; Supplier PBF</h1>
          <p class="text-xs" style="color:var(--ons-text-soft)">Analisis Days-of-Stock (DOS), ubah jumlah pesanan per item, terbitkan SP BPOM ke Doc Engine, &amp; kelola Master PBF CDOB.</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <div class="ons-tab-bar">
            <button onclick="window.setDefectaTab('order')" class="ons-tab-btn ${defectaTab === 'order' ? 'active' : ''}">Defecta &amp; SP BPOM (${lowStock.length})</button>
            <button onclick="window.setDefectaTab('supplier')" class="ons-tab-btn ${defectaTab === 'supplier' ? 'active' : ''}">Direktori PBF CDOB (${(st.supplierPbf || []).length})</button>
          </div>
          ${defectaTab === 'supplier'
            ? `<button onclick="window.openSupplierPbfModal('')" class="ons-btn ons-btn-primary text-xs">+ Tambah Supplier PBF</button>`
            : `<button onclick="window.generateSpFromDefecta()" class="ons-btn ons-btn-primary text-xs">Terbitkan Draf SP Otomatis</button>`}
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
      ` : `
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
            <h3 class="font-bold text-sm">Daftar Defecta Stok Tipis (${lowStock.length} Item Memerlukan Order)</h3>
            <span class="text-xs font-mono-num font-bold text-blue-600">Est. Total PO: ${S().rp(lowStock.reduce((acc, o) => acc + getOrderQty(o) * Number(o.hpp_terakhir || o.hpp_avg || 0), 0))}</span>
          </div>
          <div class="ons-table-wrap">
            <table class="ons-table">
              <thead><tr><th>Obat</th><th>Golongan SP BPOM</th><th>Stok Sisa / Min</th><th>Est. Habis (DOS)</th><th>Qty Order (Edit)</th><th>PBF Utama</th><th>Estimasi Biaya</th></tr></thead>
              <tbody>
                ${lowStock.length ? lowStock.map((o) => {
                  const s = S().getTotalStok(o.id_obat);
                  const dos = estDos(o.id_obat, s, o.stok_min);
                  const qtyOrder = getOrderQty(o);
                  return `<tr>
                    <td class="font-bold">${S().esc(o.nama_dagang)}</td>
                    <td>${S().bpomBadge(o.golongan_bpom)}</td>
                    <td class="font-mono-num text-red-600 font-bold">${s} / ${o.stok_min}</td>
                    <td><span class="badge-bpom ${dos <= 5 ? 'bpom-keras' : 'bpom-prekursor'} font-mono-num">&plusmn; ${dos} Hari</span></td>
                    <td>
                      <div class="flex items-center gap-1">
                        <input type="number" min="1" value="${qtyOrder}" onchange="window.setDefectaOrderQty('${o.id_obat}', this.value)" class="ons-input font-mono-num text-right text-xs w-20 py-1 min-h-0 h-8"/>
                        <span class="text-[11px]" style="color:var(--ons-text-soft)">${S().esc(o.satuan_dasar)}</span>
                      </div>
                    </td>
                    <td class="text-xs">${S().esc(o.pbf_utama)}</td>
                    <td class="font-mono-num font-semibold">${S().rp(qtyOrder * Number(o.hpp_terakhir || o.hpp_avg || 0))}</td>
                  </tr>`;
                }).join('') : '<tr><td colspan="7" class="text-center py-6 text-xs">Seluruh stok produk masih aman di atas batas minimum!</td></tr>'}
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
    const pbfName = targetPbf || ((st.supplierPbf[0] && st.supplierPbf[0].nama_pbf) || 'PT Bina San Prima');
    const items = st.masterObat.filter((o) => S().getTotalStok(o.id_obat) <= Number(o.stok_min || 10) && (!targetPbf || o.pbf_utama === targetPbf));
    const ringkasan = items.map((o) => {
      const q = defectaOrderQty[o.id_obat] !== undefined ? Number(defectaOrderQty[o.id_obat]) : Math.max(10, Number(o.stok_max || 100) - S().getTotalStok(o.id_obat));
      return `${o.nama_dagang} (${q} ${o.satuan_dasar})`;
    }).join(', ') || 'Paket Reguler Apotek';
    try {
      const res = await API().callApi('doc.createDraft', {
        kode_templat: 'SP_BPOM_5_GOL',
        judul: 'SP Defecta — ' + pbfName + ' (' + new Date().toLocaleDateString('id-ID') + ')',
        data: {
          GOLONGAN_SP: 'REGULER & PREKURSOR',
          NAMA_PBF: pbfName,
          ALAMAT_PBF: 'Gudang Farmasi Terdaftar CDOB',
          NAMA_APJ: 'apt. Siti Rahma, S.Farm',
          NO_SIPA: '19920412/SIPA_35.78/2025/1042',
          NAMA_APOTEK: 'Apotek ONS Farma Enterprise',
          DAFTAR_PESANAN: ringkasan
        }
      }, { isWrite: true });
      global.toast('Draf SP BPOM (' + res.item.NomorSurat + ') diterbitkan ke Mesin Surat!', 'ok');
    } catch (e) { global.toast(e.message, 'err'); }
  };

  /**
   * W-07: Terima Faktur PBF Multi-Item GRN & Retur BAR-PBF (3 Sub-Menu: daftar | input | retur)
   */
  let fakturTab = 'daftar';
  let fakturListQ = '';
  let fakturListFilter = 'SEMUA';
  let grnHeader = {
    no_faktur_pbf: '',
    no_sp: '',
    id_pbf: '',
    tgl_jatuh_tempo: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    diskon_pbf: 0,
    ppn_masukan: 0,
    catatan: ''
  };
  let grnItems = [];

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
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-xl font-bold">Penerimaan Faktur PBF (GRN Multi-Item) &amp; Retur BAR-PBF</h1>
          <p class="text-xs" style="color:var(--ons-text-soft)">Input faktur banyak item sekaligus (GRN CDOB), ekstraksi teks OCR faktur, pelunasan PBF, &amp; retur barang mendekati ED.</p>
        </div>
        <div class="ons-tab-bar">
          <button onclick="window.setFakturTab('daftar')" class="ons-tab-btn ${fakturTab === 'daftar' ? 'active' : ''}">Daftar Faktur (${st.fakturPbf.length})</button>
          <button onclick="window.setFakturTab('input')" class="ons-tab-btn ${fakturTab === 'input' ? 'active' : ''}">Input GRN Multi-Item &amp; OCR</button>
          <button onclick="window.setFakturTab('retur')" class="ons-tab-btn ${fakturTab === 'retur' ? 'active' : ''}">Retur BAR-PBF (${returCandidates.length})</button>
        </div>
      </div>

      ${fakturTab === 'input' ? `
        <div class="space-y-4">
          <div class="ons-card p-4 space-y-3">
            <div class="flex flex-wrap justify-between items-center gap-2">
              <span class="font-bold text-xs">Smart OCR Text Parser (Tempel Teks PDF / Foto Faktur PBF)</span>
              <button type="button" onclick="window.parseGrnOcrToForm()" class="ons-btn ons-btn-primary text-xs py-1 px-3">Ekstrak ke Form GRN &darr;</button>
            </div>
            <textarea id="grnOcrRaw" rows="2" class="ons-textarea text-xs font-mono-num" placeholder="Contoh: FK-BSP-8821 PT Bina San Prima Batch B-2026-X9 ED 2028-09-30 Qty 120 Total Rp 1.450.000"></textarea>
          </div>

          <div class="ons-card p-5 space-y-4">
            <h3 class="font-bold text-sm">Header Penerimaan Barang (Goods Received Note — CDOB)</h3>
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
            </div>

            <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t" style="border-color:var(--ons-border)">
              <h4 class="font-bold text-xs">Rincian Item Batch Obat Masuk (${grnItems.length} Baris)</h4>
              <button type="button" onclick="window.addGrnItemRow()" class="ons-btn ons-btn-ghost text-xs">+ Tambah Baris Obat</button>
            </div>
            <div class="ons-table-wrap">
              <table class="ons-table">
                <thead><tr><th>Produk Obat</th><th>No. Batch</th><th>Tanggal ED</th><th>Qty Dasar</th><th>HPP / Unit (Rp)</th><th>Subtotal</th><th>Hapus</th></tr></thead>
                <tbody>
                  ${grnItems.map((it, idx) => `<tr>
                    <td>
                      <select class="ons-select text-xs min-w-[180px]" onchange="window.updateGrnItem(${idx}, 'id_obat', this.value)">
                        ${st.masterObat.map((o) => `<option value="${o.id_obat}" ${it.id_obat === o.id_obat ? 'selected' : ''}>${S().esc(o.nama_dagang)}</option>`).join('')}
                      </select>
                    </td>
                    <td><input class="ons-input font-mono-num text-xs w-32" value="${S().esc(it.no_batch)}" onchange="window.updateGrnItem(${idx}, 'no_batch', this.value)"/></td>
                    <td><input type="date" class="ons-input text-xs w-36" value="${S().esc(it.tgl_kadaluarsa)}" onchange="window.updateGrnItem(${idx}, 'tgl_kadaluarsa', this.value)"/></td>
                    <td><input type="number" min="1" class="ons-input font-mono-num text-xs w-20 text-right" value="${it.qty_dasar}" onchange="window.updateGrnItem(${idx}, 'qty_dasar', Number(this.value||1))"/></td>
                    <td><input type="number" min="0" class="ons-input font-mono-num text-xs w-28 text-right" value="${it.hpp_unit}" onchange="window.updateGrnItem(${idx}, 'hpp_unit', Number(this.value||0))"/></td>
                    <td class="font-mono-num font-bold text-xs">${S().rp(Number(it.qty_dasar || 0) * Number(it.hpp_unit || 0))}</td>
                    <td><button type="button" onclick="window.removeGrnItemRow(${idx})" ${grnItems.length <= 1 ? 'disabled' : ''} class="ons-btn ons-btn-danger text-xs px-2 py-1">&times;</button></td>
                  </tr>`).join('')}
                </tbody>
              </table>
            </div>

            <div class="flex flex-wrap items-center justify-between gap-4 pt-3 border-t" style="border-color:var(--ons-border)">
              <div class="text-xs space-y-0.5">
                <div>Total Bruto Item: <b class="font-mono-num">${S().rp(totalBruto)}</b></div>
                <div class="text-base font-extrabold text-blue-600">Netto Hutang Faktur: <span class="font-mono-num">${S().rp(nettoGrn)}</span></div>
              </div>
              <button type="button" onclick="window.submitGrnFaktur()" class="ons-btn ons-btn-emerald text-xs px-5 py-2.5">Simpan Faktur Multi-Item &amp; Masukkan ke Stok FEFO</button>
            </div>
          </div>
        </div>
      ` : fakturTab === 'retur' ? `
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

  global.parseGrnOcrToForm = () => {
    const raw = (document.getElementById('grnOcrRaw') || {}).value || '';
    if (!raw.trim()) return global.toast('Tempel teks faktur terlebih dahulu.', 'warn');
    ensureGrnInitialized();
    const fakM = raw.match(/\b((?:FK|INV|FJ)[-\/][A-Z0-9\-\/]{3,})/i);
    if (fakM) grnHeader.no_faktur_pbf = fakM[1].toUpperCase();
    const pbfMatch = S().AppState.supplierPbf.find((p) => raw.toLowerCase().includes(p.nama_pbf.toLowerCase().split(' ').slice(0, 2).join(' ')));
    if (pbfMatch) grnHeader.id_pbf = pbfMatch.nama_pbf;
    if (grnItems[0]) {
      const batM = raw.match(/BATCH[:\s#-]*([A-Z0-9\-]{3,})/i);
      if (batM) grnItems[0].no_batch = batM[1].toUpperCase();
      const edM = raw.match(/(20\d{2}-\d{2}-\d{2})/);
      if (edM) grnItems[0].tgl_kadaluarsa = edM[1];
      const qtyM = raw.match(/(?:QTY|JUMLAH)[:\s]*(\d+)|(\d+)\s*(?:BOX|TAB|KAP|BTL|PCS)/i);
      if (qtyM) grnItems[0].qty_dasar = Number(qtyM[1] || qtyM[2] || 50);
      const rpM = raw.match(/(?:RP|TOTAL|NETTO)[:.\s]*([\d.,]{4,})/i);
      if (rpM) {
        const tot = Number(rpM[1].replace(/[.,]/g, ''));
        if (tot > 0 && grnItems[0].qty_dasar > 0) grnItems[0].hpp_unit = Math.round(tot / grnItems[0].qty_dasar);
      }
    }
    global.toast('Ekstraksi teks OCR selesai diisi ke Header & Item #1 GRN!', 'ok');
    global.renderActiveView();
  };

  global.submitGrnFaktur = async () => {
    try {
      ensureGrnInitialized();
      if (!grnHeader.no_faktur_pbf.trim()) throw new Error('No. Faktur PBF wajib diisi.');
      const totalBruto = grnItems.reduce((s, it) => s + (Number(it.qty_dasar || 0) * Number(it.hpp_unit || 0)), 0);
      const netto = Math.max(0, totalBruto - Number(grnHeader.diskon_pbf || 0) + Number(grnHeader.ppn_masukan || 0));
      await API().callApi('pengadaan.fakturSave', {
        no_faktur_pbf: grnHeader.no_faktur_pbf.trim(),
        no_sp: grnHeader.no_sp,
        id_pbf: grnHeader.id_pbf,
        tgl_jatuh_tempo: grnHeader.tgl_jatuh_tempo,
        total_bruto: totalBruto,
        diskon_pbf: Number(grnHeader.diskon_pbf || 0),
        ppn_masukan: Number(grnHeader.ppn_masukan || 0),
        netto_hutang: netto,
        items: grnItems.map((it) => ({
          id_obat: it.id_obat,
          no_batch: it.no_batch,
          tgl_kadaluarsa: it.tgl_kadaluarsa,
          qty_dasar: Number(it.qty_dasar || 1),
          hpp_unit: Number(it.hpp_unit || 0)
        }))
      }, { isWrite: true });
      grnHeader.no_faktur_pbf = '';
      grnItems = [];
      global.toast('Faktur Multi-Item & semua batch FEFO berhasil masuk ke gudang!', 'ok');
      window.setFakturTab('daftar');
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

  global.ONSViewsInventoryProcurement = { renderMasterObatView, renderGudangView, renderDefectaView, renderFakturView };
})(window);
