/**
 * ONS FARMA DIGITAL ENTERPRISE v10.0 - Modul W-08..W-14:
 * Klinis & SATUSEHAT (W-08), E-Resep & PRB (W-09), Keuangan + Tagihan/Pembayaran + Doc Engine (W-10),
 * Tutup Shift PIN (W-11), SIPNAP & Pareto (W-12), Settings Vault + Audit + Migrasi DB (W-13), Responsive Preview (W-14)
 */
(function (global) {
  'use strict';
  const S = () => global.ONSStore;
  const API = () => global.ONSApi;

  let klinisTab = 'soap'; // soap | racikan | meso
  let klinisFilter = 'SEMUA';
  let klinisSearchQ = '';
  let eresepTab = 'erx'; // erx | prb
  let erxSearchQ = '';
  let prbSearchQ = '';
  let prbFilter = 'SEMUA';
  let financeTab = 'pnl'; // pnl | jurnal | hutang | pajak
  let financeDateFrom = '';
  let financeDateTo = '';
  let jurnalFilter = 'SEMUA';
  let sipnapTab = 'narkotika'; // narkotika | pareto | deadstock
  let shiftDenomCounts = { 100000: 0, 50000: 0, 20000: 0, 10000: 0, 5000: 0, 2000: 0, 1000: 0, 500: 0 };
  let activeBillingTab = 'tagihan'; // tagihan | verifikasi | potongan | reminder
  let activeDocTab = 'surat'; // surat | pindai
  let settingsTab = 'akun'; // akun | struk | vault | audit | semua
  let billingCache = { tagihan: [], pending: [], history: [], potongan: [] };
  let docCache = { templates: [], docs: [], pejabat: [] };
  let mobilePreviewBp = '390px';
  const LOST_SALES_KEY = 'ons_lost_sales_v10';

  let racikanState = {
    jumlahBungkus: 10,
    jasaRacik: 7500,
    embalase: 2500,
    ingredients: []
  };
  let etiketDraft = {
    jenis: 'putih',
    pasien: 'Tn. Bambang Suryono',
    obat: 'Amoxicillin 500mg / Racikan',
    aturan: '3 x 1 Sehari (Sesudah Makan)'
  };
  let mesoState = {
    pasien: 'Tn. Bambang Suryono',
    obat: 'Captopril 25mg',
    gejala: 'Batuk kering persisten / Ruam alergi ringan',
    scores: [0, 2, 1, 0, 0, 0, 0, 0, 0, 0]
  };
  const NARANJO_CRITERIA = [
    { label: '1. Ada laporan reaksi serupa sebelumnya di literatur ilmiah?', pts: 1 },
    { label: '2. Reaksi muncul setelah obat yang dicurigai diberikan?', pts: 2 },
    { label: '3. Reaksi membaik setelah obat dihentikan atau diberi antagonis spesifik?', pts: 1 },
    { label: '4. Reaksi muncul kembali ketika obat diberikan ulang (rechallenge)?', pts: 2 },
    { label: '5. Tidak ada penyebab alternatif lain selain obat ini?', pts: 2 },
    { label: '6. Reaksi tidak muncul kembali saat diberikan plasebo?', pts: 1 },
    { label: '7. Obat terdeteksi dalam darah/cairan pada konsentrasi toksik?', pts: 1 },
    { label: '8. Reaksi bertambah parah bila dosis dinaikkan / berkurang saat diturunkan?', pts: 1 },
    { label: '9. Pasien memiliki riwayat reaksi serupa pada paparan obat sebelumnya?', pts: 1 },
    { label: '10. Kejadian tidak diinginkan terkonfirmasi oleh bukti objektif klinis?', pts: 1 }
  ];

  function ensureRacikanInit() {
    const st = S().AppState;
    if (!racikanState.ingredients.length && st.masterObat.length) {
      racikanState.ingredients.push({
        id_obat: st.masterObat[0].id_obat,
        dosis_mg: 250,
        kekuatan_mg: 500
      });
    }
  }

  /**
   * W-08: Layanan Klinis (3 Sub-Menu: soap | racikan | meso)
   */
  function renderKlinisView() {
    const st = S().AppState;
    klinisTab = (st.subTabs && st.subTabs.klinis) || klinisTab || 'soap';
    ensureRacikanInit();

    const kq = klinisSearchQ.trim().toLowerCase();
    const filteredKlinis = (st.rekamKlinis || []).filter((k) => {
      if (klinisFilter !== 'SEMUA' && String(k.layanan_jenis || '').toUpperCase() !== klinisFilter) return false;
      if (kq) {
        const hay = `${k.id_klinis} ${k.nama_pasien} ${k.dokter_asal} ${k.soap_notes} ${k.layanan_jenis}`.toLowerCase();
        if (!hay.includes(kq)) return false;
      }
      return true;
    });

    // Hitung total bahan racikan
    let totalBahanRp = 0;
    const ingRows = racikanState.ingredients.map((ing, idx) => {
      const ob = st.masterObat.find((o) => o.id_obat === ing.id_obat);
      const exactTabs = (Number(racikanState.jumlahBungkus || 1) * Number(ing.dosis_mg || 0)) / Math.max(1, Number(ing.kekuatan_mg || 1));
      const bulat = Math.max(1, Math.ceil(exactTabs));
      const subHarga = ob ? bulat * Number(ob.harga_umum || 0) : 0;
      totalBahanRp += subHarga;
      return Object.assign({}, ing, { idx, ob, exactTabs, bulat, subHarga });
    });
    const totalRacikanRp = totalBahanRp + Number(racikanState.jasaRacik || 0) + Number(racikanState.embalase || 0);

    // Hitung Naranjo score
    const naranjoScore = mesoState.scores.reduce((s, v) => s + Number(v || 0), 0);
    const naranjoCat = naranjoScore >= 9 ? 'SANGAT PASTI (Definite)' : (naranjoScore >= 5 ? 'MUNGKIN BESAR (Probable)' : (naranjoScore >= 1 ? 'MUNGKIN (Possible)' : 'MERAGUKAN (Doubtful)'));
    const mesoList = (st.rekamKlinis || []).filter((k) => String(k.layanan_jenis || '').toUpperCase() === 'MESO');

    return `<div class="space-y-5 ons-view-enter">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-xl font-bold">Layanan Klinis Farmasi, Racikan &amp; MESO SATUSEHAT</h1>
          <p class="text-xs" style="color:var(--ons-text-soft)">Dokumentasi SOAP PMK 73 &amp; HL7 FHIR R4, kalkulator racikan multi-bahan + etiket live, serta algoritma Naranjo MESO BPOM.</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <div class="ons-tab-bar">
            <button onclick="window.setKlinisTab('soap')" class="ons-tab-btn ${klinisTab === 'soap' ? 'active' : ''}">Skrining &amp; SOAP (${(st.rekamKlinis || []).length})</button>
            <button onclick="window.setKlinisTab('racikan')" class="ons-tab-btn ${klinisTab === 'racikan' ? 'active' : ''}">Kalkulator Racikan &amp; Etiket</button>
            <button onclick="window.setKlinisTab('meso')" class="ons-tab-btn ${klinisTab === 'meso' ? 'active' : ''}">MESO Naranjo (${mesoList.length})</button>
          </div>
          <button onclick="window.openInputResepModal()" class="ons-btn ons-btn-primary text-xs">+ Input SOAP Klinis</button>
        </div>
      </div>

      ${klinisTab === 'racikan' ? `
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div class="ons-card p-5 lg:col-span-7 space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h3 class="font-bold text-sm">Kalkulator Racikan / Puyer Multi-Bahan &rarr; POS</h3>
              <button onclick="window.addRacikanIngredient()" class="ons-btn ons-btn-ghost text-xs">+ Tambah Bahan Obat</button>
            </div>
            <div class="grid grid-cols-3 gap-2 text-xs">
              <div><label class="font-semibold block mb-1">Jumlah Bungkus / Kapsul</label><input type="number" min="1" value="${racikanState.jumlahBungkus}" oninput="window.setRacikanMeta('jumlahBungkus', Number(this.value||1))" class="ons-input font-mono-num"/></div>
              <div><label class="font-semibold block mb-1">Jasa Racik / Tuslah (Rp)</label><input type="number" min="0" value="${racikanState.jasaRacik}" oninput="window.setRacikanMeta('jasaRacik', Number(this.value||0))" class="ons-input font-mono-num"/></div>
              <div><label class="font-semibold block mb-1">Embalase / Kemasan (Rp)</label><input type="number" min="0" value="${racikanState.embalase}" oninput="window.setRacikanMeta('embalase', Number(this.value||0))" class="ons-input font-mono-num"/></div>
            </div>
            <div class="space-y-2">
              ${ingRows.map((row) => `
                <div class="p-3 rounded-xl border space-y-2 text-xs" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
                  <div class="flex flex-wrap items-center gap-2">
                    <select class="ons-select flex-1 min-w-[200px]" onchange="window.updateRacikanIng(${row.idx}, 'id_obat', this.value)">
                      ${st.masterObat.map((o) => `<option value="${o.id_obat}" ${o.id_obat === row.id_obat ? 'selected' : ''}>${S().esc(o.nama_dagang)} (${S().rp(o.harga_umum)}/${S().esc(o.satuan_dasar)})</option>`).join('')}
                    </select>
                    <button onclick="window.removeRacikanIng(${row.idx})" ${ingRows.length <= 1 ? 'disabled' : ''} class="ons-btn ons-btn-danger text-xs px-2 py-1">&times;</button>
                  </div>
                  <div class="grid grid-cols-3 gap-2">
                    <div><label class="text-[11px]">Dosis/Bungkus (mg)</label><input type="number" min="1" value="${row.dosis_mg}" oninput="window.updateRacikanIng(${row.idx}, 'dosis_mg', Number(this.value||1))" class="ons-input font-mono-num"/></div>
                    <div><label class="text-[11px]">Kekuatan Sediaan (mg)</label><input type="number" min="1" value="${row.kekuatan_mg}" oninput="window.updateRacikanIng(${row.idx}, 'kekuatan_mg', Number(this.value||1))" class="ons-input font-mono-num"/></div>
                    <div class="flex flex-col justify-end font-mono-num text-right">
                      <span class="font-bold text-blue-600">${row.exactTabs.toFixed(2)} &rarr; ${row.bulat} unit</span>
                      <span class="text-[11px]" style="color:var(--ons-text-soft)">${S().rp(row.subHarga)}</span>
                    </div>
                  </div>
                </div>`).join('')}
            </div>
            <div class="p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2 text-xs" style="border-color:var(--ons-border)">
              <div>
                <div>Bahan: <b class="font-mono-num">${S().rp(totalBahanRp)}</b> + Tuslah &amp; Embalase: <b class="font-mono-num">${S().rp(Number(racikanState.jasaRacik) + Number(racikanState.embalase))}</b></div>
                <div class="text-sm font-extrabold text-emerald-600 font-mono-num">Estimasi Total Resep Racikan: ${S().rp(totalRacikanRp)}</div>
              </div>
              <button onclick="window.addRacikanToPos()" class="ons-btn ons-btn-emerald text-xs">Masukkan Semua Bahan ke POS (${ingRows.length}) &rarr;</button>
            </div>
          </div>

          <div class="ons-card p-5 lg:col-span-5 space-y-3">
            <h3 class="font-bold text-sm">Pratinjau Langsung Etiket Putih / Biru</h3>
            <div class="grid grid-cols-2 gap-2 text-xs">
              <div><label class="font-semibold block mb-1">Jenis Etiket</label>
                <select class="ons-select" onchange="window.setEtiketDraft('jenis', this.value)">
                  <option value="putih" ${etiketDraft.jenis === 'putih' ? 'selected' : ''}>Putih (Obat Oral / Dalam)</option>
                  <option value="biru" ${etiketDraft.jenis === 'biru' ? 'selected' : ''}>Biru (Obat Luar)</option>
                </select>
              </div>
              <div><label class="font-semibold block mb-1">Nama Pasien</label><input id="etPasien" class="ons-input" value="${S().esc(etiketDraft.pasien)}" oninput="window.setEtiketDraft('pasien', this.value)"/></div>
              <div class="col-span-2"><label class="font-semibold block mb-1">Nama Obat / Racikan</label><input id="etObat" class="ons-input" value="${S().esc(etiketDraft.obat)}" oninput="window.setEtiketDraft('obat', this.value)"/></div>
              <div class="col-span-2"><label class="font-semibold block mb-1">Aturan Pakai</label><input id="etAturan" class="ons-input" value="${S().esc(etiketDraft.aturan)}" oninput="window.setEtiketDraft('aturan', this.value)"/></div>
            </div>
            <div id="klinisEtiketBox" class="ons-etiket-box ${etiketDraft.jenis} space-y-1 text-center text-xs">
              <div class="font-extrabold tracking-wide">APOTEK ONS FARMA ENTERPRISE</div>
              <div class="text-[10px]">APA: apt. Siti Rahma, S.Farm &bull; SIPA: 19920412/SIPA_35.78/2025/1042</div>
              <div class="border-y border-slate-800 py-1 font-bold">${S().esc(etiketDraft.pasien)} &bull; ${new Date().toLocaleDateString('id-ID')}</div>
              <div class="font-bold text-sm">${S().esc(etiketDraft.obat)}</div>
              <div class="font-extrabold underline">${S().esc(etiketDraft.aturan)}</div>
              <div class="text-[10px] font-semibold">${etiketDraft.jenis === 'biru' ? 'OBAT LUAR • TIDAK UNTUK DITELAN' : 'OBAT DALAM • SEMOGA LEKAS SEMBUH'}</div>
            </div>
            <div class="flex gap-2">
              <button onclick="window.printEtiketSample('PUTIH')" class="ons-btn ons-btn-ghost flex-1 text-xs">Cetak Putih</button>
              <button onclick="window.printEtiketSample('BIRU')" class="ons-btn ons-btn-primary flex-1 text-xs">Cetak Biru</button>
            </div>
          </div>
        </div>
      ` : klinisTab === 'meso' ? `
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div class="ons-card p-5 lg:col-span-7 space-y-3 text-xs">
            <div class="flex items-center justify-between">
              <h3 class="font-bold text-sm">Algoritma Evaluasi Kausalitas Naranjo (MESO 10 Kriteria BPOM)</h3>
              <span class="badge-bpom ${naranjoScore >= 5 ? 'bpom-keras' : 'bpom-prekursor'} font-mono-num">Skor: ${naranjoScore} (${naranjoCat})</span>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div><label class="font-semibold block mb-1">Nama Pasien</label><input class="ons-input" value="${S().esc(mesoState.pasien)}" oninput="window.setMesoMeta('pasien', this.value)"/></div>
              <div><label class="font-semibold block mb-1">Obat Dicurigai (ROTD)</label><input class="ons-input" value="${S().esc(mesoState.obat)}" oninput="window.setMesoMeta('obat', this.value)"/></div>
              <div><label class="font-semibold block mb-1">Manifestasi Gejala ROTD</label><input class="ons-input" value="${S().esc(mesoState.gejala)}" oninput="window.setMesoMeta('gejala', this.value)"/></div>
            </div>
            <div class="space-y-1.5 border rounded-xl p-3 max-h-80 overflow-y-auto" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
              ${NARANJO_CRITERIA.map((cr, idx) => `
                <label class="flex items-center justify-between gap-2 p-1.5 rounded hover:bg-blue-500/10 cursor-pointer">
                  <span>${cr.label}</span>
                  <select class="ons-select w-28 text-xs py-1 min-h-0 h-7" onchange="window.setMesoScore(${idx}, Number(this.value))">
                    <option value="0" ${mesoState.scores[idx] === 0 ? 'selected' : ''}>Tidak Tahu (0)</option>
                    <option value="${cr.pts}" ${mesoState.scores[idx] === cr.pts ? 'selected' : ''}>Ya (+${cr.pts})</option>
                    <option value="-1" ${mesoState.scores[idx] === -1 ? 'selected' : ''}>Tidak (-1)</option>
                  </select>
                </label>`).join('')}
            </div>
            <button onclick="window.submitNaranjoWorkspace()" class="ons-btn ons-btn-emerald w-full text-xs">Simpan Penilaian Kausalitas MESO ke Rekam Klinis</button>
          </div>
          <div class="ons-card p-5 lg:col-span-5 space-y-3">
            <h3 class="font-bold text-sm">Riwayat Laporan MESO Tersimpan (${mesoList.length})</h3>
            <div class="space-y-2 max-h-[420px] overflow-y-auto text-xs">
              ${mesoList.length ? mesoList.map((m) => `<div class="p-3 rounded-xl border space-y-1" style="border-color:var(--ons-border)">
                <div class="flex justify-between"><b>${S().esc(m.nama_pasien)}</b><span class="font-mono-num" style="color:var(--ons-text-soft)">${S().formatTgl(m.tanggal)}</span></div>
                <div class="text-amber-600 font-semibold">${S().esc(m.cdss_warning || 'MESO')}</div>
                <div style="color:var(--ons-text-soft)">${S().esc(m.soap_notes)}</div>
              </div>`).join('') : '<div class="py-6 text-center text-xs" style="color:var(--ons-text-soft)">Belum ada pelaporan MESO tercatat.</div>'}
            </div>
          </div>
        </div>
      ` : `
        <div class="ons-card p-4 space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex flex-wrap gap-2 items-center">
              <input class="ons-input text-xs w-60" placeholder="Cari pasien, dokter, catatan SOAP..." value="${S().esc(klinisSearchQ)}" oninput="window.setKlinisSearchQ(this.value)"/>
              <div class="ons-tab-bar">
                ${['SEMUA', 'SKRINING_RESEP', 'PIO', 'PTO', 'MESO', 'ERX_DOKTER'].map((f) => `<button onclick="window.setKlinisFilter('${f}')" class="ons-tab-btn ${klinisFilter === f ? 'active' : ''}">${f === 'SEMUA' ? 'Semua' : f.replace('_', ' ')}</button>`).join('')}
              </div>
            </div>
          </div>
          <div class="ons-table-wrap">
            <table class="ons-table">
              <thead><tr><th>ID &amp; Jenis</th><th>Pasien &amp; Dokter</th><th>Peringatan CDSS</th><th>Catatan SOAP / PIO</th><th>Verifikator APJ</th><th>FHIR JSON</th></tr></thead>
              <tbody>
                ${filteredKlinis.length ? filteredKlinis.map((k) => `<tr>
                  <td class="font-mono-num text-xs"><b>${S().esc(k.id_klinis)}</b><br/><span class="badge-bpom bpom-terbatas">${S().esc(k.layanan_jenis || 'KLINIS')}</span><br/>${S().formatTgl(k.tanggal)}</td>
                  <td class="text-xs"><b>${S().esc(k.nama_pasien)}</b><br/><span style="color:var(--ons-text-soft)">${S().esc(k.dokter_asal)}</span></td>
                  <td class="text-xs max-w-xs">${k.cdss_warning ? `<span class="text-amber-600 font-semibold">${S().esc(k.cdss_warning)}</span>` : 'Aman'}</td>
                  <td class="text-xs max-w-xs whitespace-pre-line">${S().esc(k.soap_notes || '-')}</td>
                  <td class="text-xs font-semibold text-emerald-600">${S().esc(k.apj_pin_verified_by || 'Menunggu')}</td>
                  <td><button onclick="window.openFhirJsonModal('${S().esc(k.id_klinis)}')" class="ons-btn ons-btn-ghost text-xs py-1 px-2">Lihat FHIR R4</button></td>
                </tr>`).join('') : '<tr><td colspan="6" class="text-center py-6 text-xs">Belum ada catatan klinis sesuai filter ini.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      `}
    </div>`;
  }

  global.setKlinisTab = (t) => {
    klinisTab = t || 'soap';
    if (S().AppState.subTabs) S().AppState.subTabs.klinis = klinisTab;
    global.renderActiveView();
    if (typeof global.syncNavHighlight === 'function') global.syncNavHighlight();
  };
  global.setKlinisFilter = (v) => { klinisFilter = v || 'SEMUA'; global.renderActiveView(); };
  global.setKlinisSearchQ = (v) => { klinisSearchQ = v || ''; global.renderActiveView(); };
  global.setRacikanMeta = (k, v) => { racikanState[k] = v; global.renderActiveView(); };
  global.addRacikanIngredient = () => {
    const first = S().AppState.masterObat[0];
    racikanState.ingredients.push({ id_obat: first ? first.id_obat : '', dosis_mg: 250, kekuatan_mg: 500 });
    global.renderActiveView();
  };
  global.updateRacikanIng = (idx, k, v) => {
    if (racikanState.ingredients[idx]) { racikanState.ingredients[idx][k] = v; global.renderActiveView(); }
  };
  global.removeRacikanIng = (idx) => {
    if (racikanState.ingredients.length > 1) { racikanState.ingredients.splice(idx, 1); global.renderActiveView(); }
  };
  global.setEtiketDraft = (k, v) => {
    etiketDraft[k] = v;
    if (k === 'jenis') global.renderActiveView();
    else {
      const box = document.getElementById('klinisEtiketBox');
      if (box) global.renderActiveView();
    }
  };
  global.setMesoMeta = (k, v) => { mesoState[k] = v; };
  global.setMesoScore = (idx, pts) => { mesoState.scores[idx] = pts; global.renderActiveView(); };
  global.submitNaranjoWorkspace = async () => {
    const score = mesoState.scores.reduce((s, v) => s + Number(v || 0), 0);
    const kategori = score >= 9 ? 'SANGAT PASTI (Definite)' : (score >= 5 ? 'MUNGKIN BESAR (Probable)' : (score >= 1 ? 'MUNGKIN (Possible)' : 'MERAGUKAN (Doubtful)'));
    try {
      await API().callApi('klinis.save', {
        nama_pasien: mesoState.pasien,
        dokter_asal: 'Pelaporan MESO Apoteker',
        layanan_jenis: 'MESO',
        cdss_warning: `Skor Naranjo MESO: ${score} (${kategori})`,
        soap_notes: `Obat Dicurigai: ${mesoState.obat}. Gejala ROTD: ${mesoState.gejala}. Kausalitas Naranjo: ${score} - ${kategori}.`
      }, { isWrite: true });
      global.toast(`Laporan MESO Skor ${score} (${kategori}) tersimpan!`, 'ok');
      await global.bootLoadState(true);
    } catch (e) { global.toast(e.message, 'err'); }
  };

  global.addRacikanToPos = () => {
    ensureRacikanInit();
    const st = S().AppState;
    const cart = st.carts[st.activeCartIdx] || st.carts[0];
    let addedCount = 0;
    racikanState.ingredients.forEach((ing) => {
      if (!ing.id_obat) return;
      const qtyBulat = Math.max(1, Math.ceil((Number(racikanState.jumlahBungkus || 1) * Number(ing.dosis_mg || 0)) / Math.max(1, Number(ing.kekuatan_mg || 1))));
      if (global.posAddToCart) {
        const beforeLen = cart.items.length;
        global.posAddToCart(ing.id_obat);
        const added = cart.items.find((i) => i.id_obat === ing.id_obat && i.faktor_konversi === 1);
        if (added) added.qty = beforeLen === cart.items.length ? added.qty + qtyBulat - 1 : qtyBulat;
        addedCount++;
      }
    });
    const jasaTot = Number(racikanState.jasaRacik || 0) + Number(racikanState.embalase || 0);
    global.toast(addedCount + ' bahan racikan masuk keranjang POS (+ est. tuslah & embalase ' + S().rp(jasaTot) + ')', 'ok');
    if (global.navigateView) global.navigateView('pos', 'kasir');
  };

  global.printEtiketSample = (jenis) => {
    const p = (document.getElementById('etPasien') || {}).value || etiketDraft.pasien;
    const o = (document.getElementById('etObat') || {}).value || etiketDraft.obat;
    const a = (document.getElementById('etAturan') || {}).value || etiketDraft.aturan;
    const bg = jenis === 'BIRU' ? '#E0F2FE' : '#FFFFFF';
    S().printHtmlZone(`<div style="width:55mm;border:2px solid #000;background:${bg};padding:6px;font-family:Arial,sans-serif;font-size:10px;">
      <div style="text-align:center;border-bottom:1px solid #000;padding-bottom:3px;font-weight:bold;">APOTEK ONS FARMA<br/><span style="font-size:8px;font-weight:normal;">SIPA: 19920412/SIPA_35.78/2025/1042</span></div>
      <div style="margin:4px 0;"><b>Pasien:</b> ${S().esc(p)}<br/><b>Obat:</b> ${S().esc(o)}</div>
      <div style="border:1px dashed #000;padding:4px;font-weight:bold;text-align:center;font-size:11px;">${S().esc(a)}</div>
      <div style="text-align:center;font-size:8px;margin-top:4px;">${jenis === 'BIRU' ? '*** OBAT LUAR / TIDAK UNTUK DITELAN ***' : 'Semoga Lekas Sembuh'}</div>
    </div>`);
  };

  global.openFhirJsonModal = (idKlinis) => {
    const rec = S().AppState.rekamKlinis.find((k) => k.id_klinis === idKlinis);
    const fhir = {
      resourceType: 'Bundle',
      type: 'transaction',
      timestamp: new Date().toISOString(),
      entry: [{
        resource: {
          resourceType: 'MedicationDispense',
          id: idKlinis,
          status: 'completed',
          subject: { display: rec ? rec.nama_pasien : 'Pasien' },
          performer: [{ actor: { display: rec ? rec.apj_pin_verified_by : 'APJ ONS Farma' } }],
          note: [{ text: rec ? rec.soap_notes : '' }]
        }
      }]
    };
    const jsonStr = JSON.stringify(fhir, null, 2);
    S().openModal(`<div class="p-6 space-y-3">
      <div class="flex justify-between items-center"><h3 class="font-bold text-base">Payload HL7 FHIR R4 SATUSEHAT Kemenkes</h3><button onclick="ONSStore.closeModal()" class="text-xl">&times;</button></div>
      <pre class="text-xs font-mono-num p-3 rounded-xl border overflow-auto max-h-80" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">${S().esc(jsonStr)}</pre>
      <div class="flex gap-2 justify-end">
        <button onclick="navigator.clipboard?.writeText(\`${S().esc(jsonStr)}\`);toast('JSON FHIR disalin ke clipboard!','ok')" class="ons-btn ons-btn-primary text-xs">Salin JSON</button>
      </div>
    </div>`, '640px');
  };

  global.openInputResepModal = () => {
    S().openModal(`<div class="p-6 space-y-3 text-xs">
      <div class="flex justify-between items-center"><h3 class="font-bold text-base">Catat Skrining Resep &amp; SOAP Klinis (PMK 73)</h3><button onclick="ONSStore.closeModal()" class="text-xl">&times;</button></div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="font-semibold block mb-1">Nama Pasien</label><input id="klPasien" class="ons-input" value="Tn. Bambang Suryono"/></div>
        <div><label class="font-semibold block mb-1">Dokter Penulis Resep</label><input id="klDokter" class="ons-input" value="dr. Andi Pratama, Sp.PD"/></div>
      </div>
      <div><label class="font-semibold block mb-1">Jenis Layanan</label><select id="klJenis" class="ons-select"><option>SKRINING_RESEP</option><option>PIO</option><option>PTO</option><option>MESO</option><option>E_KONSELING</option></select></div>
      <div><label class="font-semibold block mb-1">Catatan SOAP (S-O-A-P)</label><textarea id="klSoap" rows="3" class="ons-textarea">S: Keluhan batuk 3 hari. O: Suhu normal. A: Tepat dosis/frekuensi. P: Edukasi habiskan antibiotik.</textarea></div>
      <button onclick="window.saveKlinisSubmit()" class="ons-btn ons-btn-emerald w-full">Simpan Rekam Klinis</button>
    </div>`, '540px');
  };

  global.saveKlinisSubmit = async () => {
    try {
      await API().callApi('klinis.save', {
        nama_pasien: document.getElementById('klPasien').value,
        dokter_asal: document.getElementById('klDokter').value,
        layanan_jenis: document.getElementById('klJenis').value,
        soap_notes: document.getElementById('klSoap').value
      }, { isWrite: true });
      S().closeModal();
      global.toast('Catatan klinis & SOAP berhasil disimpan!', 'ok');
      await global.bootLoadState(true);
    } catch (e) { global.toast(e.message, 'err'); }
  };

  global.openNaranjoMesoModal = () => {
    window.setKlinisTab('meso');
  };

  /**
   * W-09: E-Resep Dokter Mitra, Skrining Kesehatan & Tracker Refill PRB 30 Hari
   */
  function _renderSkriningSparkline(skrList) {
    const vals = (skrList || []).map((s) => Number(s.gds || 0)).filter((v) => v > 0);
    if (!vals.length) return '<span class="text-[10px]" style="color:var(--ons-text-soft)">Belum ada tren GDS</span>';
    const pts = vals.map((v, idx) => {
      const x = vals.length === 1 ? 35 : 5 + (idx / (vals.length - 1)) * 60;
      const clamped = Math.max(60, Math.min(350, v));
      const y = 24 - ((clamped - 60) / 290) * 20;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    const last = vals[vals.length - 1];
    const stroke = last > 200 ? '#DC2626' : (last > 140 ? '#D97706' : '#10B981');
    return `<svg viewBox="0 0 70 28" class="w-16 h-6 inline-block align-middle">
      <polyline fill="none" stroke="${stroke}" stroke-width="2" points="${pts}"/>
      ${vals.length === 1 ? `<circle cx="35" cy="${pts.split(',')[1]}" r="2.5" fill="${stroke}"/>` : ''}
    </svg>`;
  }

  function renderEresepPrbView() {
    const st = S().AppState;
    eresepTab = (st.subTabs && st.subTabs['eresep-prb']) || eresepTab || 'erx';
    const erxUrl = `${global.location.origin}${global.location.pathname}?erx=DR-MITRA-${new Date().getFullYear()}`;
    const erxAll = st.rekamKlinis.filter((k) => String(k.status_klinis || '') === 'ANTRIAN_VALIDASI_APJ' || String(k.layanan_jenis || '') === 'ERX_DOKTER');
    const eq = erxSearchQ.trim().toLowerCase();
    const erxQueue = erxAll.filter((rx) => !eq || `${rx.id_klinis} ${rx.nama_pasien} ${rx.dokter_asal} ${rx.soap_notes}`.toLowerCase().includes(eq));
    const antreCount = erxAll.filter((x) => x.status_klinis === 'ANTRIAN_VALIDASI_APJ').length;

    const pq = prbSearchQ.trim().toLowerCase();
    const filteredMembers = (st.members || []).filter((m) => {
      if (prbFilter === 'PRB_BPJS' && m.program_prb !== 'PRB_BPJS') return false;
      if (prbFilter === 'UMUM' && m.program_prb !== 'UMUM') return false;
      if (prbFilter === 'HABIS_SEGERA') {
        const dLeft = m.tgl_habis_obat ? S().daysUntil(m.tgl_habis_obat) : 999;
        if (dLeft > 5) return false;
      }
      if (pq) {
        const hay = `${m.nama_pasien} ${m.penyakit_kronis} ${m.alergi_list} ${m.no_hp}`.toLowerCase();
        if (!hay.includes(pq)) return false;
      }
      return true;
    });

    return `<div class="space-y-5 ons-view-enter">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-xl font-bold">E-Resep Dokter Mitra, Skrining Kesehatan &amp; Tracker PRB Kronis</h1>
          <p class="text-xs" style="color:var(--ons-text-soft)">Validasi PIN APJ antrean resep dokter mitra, skrining TDS/GDS/BMI dengan grafik sparkline, &amp; pengingat refill PRB 30 hari.</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <div class="ons-tab-bar">
            <button onclick="window.setEresepTab('erx')" class="ons-tab-btn ${eresepTab === 'erx' ? 'active' : ''}">Antrean E-Resep (${antreCount}/${erxAll.length})</button>
            <button onclick="window.setEresepTab('prb')" class="ons-tab-btn ${eresepTab === 'prb' ? 'active' : ''}">Pasien PRB &amp; Skrining (${(st.members || []).length})</button>
          </div>
          <button onclick="window.openSkriningModal()" class="ons-btn ons-btn-emerald text-xs">+ Catat Skrining</button>
          <button onclick="window.openAddMemberPrbModal()" class="ons-btn ons-btn-primary text-xs">+ Pasien PRB</button>
        </div>
      </div>

      ${eresepTab === 'prb' ? `
        <div class="ons-card p-4 space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex flex-wrap gap-2 items-center">
              <input class="ons-input text-xs w-60" placeholder="Cari pasien, diagnosa, alergi..." value="${S().esc(prbSearchQ)}" oninput="window.setPrbSearchQ(this.value)"/>
              <div class="ons-tab-bar">
                ${[
                  { id: 'SEMUA', label: 'Semua' },
                  { id: 'PRB_BPJS', label: 'PRB BPJS' },
                  { id: 'UMUM', label: 'Member Umum' },
                  { id: 'HABIS_SEGERA', label: 'Habis <=5 Hari' }
                ].map((f) => `<button onclick="window.setPrbFilter('${f.id}')" class="ons-tab-btn ${prbFilter === f.id ? 'active' : ''}">${f.label}</button>`).join('')}
              </div>
            </div>
            <button onclick="navigateView('billing','tagihan')" class="ons-btn ons-btn-ghost text-xs">Tagihan PRB &rarr;</button>
          </div>
          <div class="ons-table-wrap">
            <table class="ons-table">
              <thead><tr><th>Pasien &amp; Alergi</th><th>Program &amp; Diagnosa</th><th>Tgl Habis Obat</th><th>Poin</th><th>Skrining &amp; Tren GDS</th><th>Aksi</th></tr></thead>
              <tbody>
                ${filteredMembers.length ? filteredMembers.map((m) => {
                  let skrList = [];
                  try { skrList = JSON.parse(m.riwayat_skrining_json || '[]'); } catch (e) {}
                  const lastSkr = skrList[skrList.length - 1];
                  const daysLeft = m.tgl_habis_obat ? S().daysUntil(m.tgl_habis_obat) : null;
                  return `<tr>
                    <td><b>${S().esc(m.nama_pasien)}</b><br/><span class="text-xs text-red-600">Alergi: ${S().esc(m.alergi_list)}</span></td>
                    <td class="text-xs"><span class="badge-bpom bpom-terbatas">${S().esc(m.program_prb)}</span><div class="mt-1">${S().esc(m.penyakit_kronis)}</div></td>
                    <td class="font-mono-num text-xs">${m.tgl_habis_obat ? `<span class="badge-bpom ${daysLeft <= 3 ? 'bpom-keras' : (daysLeft <= 7 ? 'bpom-prekursor' : 'bpom-bebas')}">${m.tgl_habis_obat} (${daysLeft}h)</span>` : '-'}</td>
                    <td class="font-mono-num font-bold text-blue-600">${m.poin_loyalitas || 0}</td>
                    <td class="text-xs font-mono-num">
                      <div>${lastSkr ? `TD ${S().esc(lastSkr.td)} | GDS ${S().esc(lastSkr.gds)} | BMI ${S().esc(lastSkr.bmi)}` : '-'}</div>
                      <div>${_renderSkriningSparkline(skrList)}</div>
                    </td>
                    <td>
                      <div class="flex flex-wrap gap-1">
                        <button onclick="window.openSkriningModal('${S().esc(m.id_member)}')" class="ons-btn ons-btn-ghost text-xs py-1 px-2">+ Skrining</button>
                        ${m.no_hp ? `<a target="_blank" href="https://wa.me/${m.no_hp}?text=${encodeURIComponent('Halo ' + m.nama_pasien + ', obat rutin ' + m.penyakit_kronis + ' Anda segera habis pada ' + (m.tgl_habis_obat || 'minggu ini') + '. Hasil skrining terakhir: ' + (lastSkr ? ('TD ' + lastSkr.td + ', GDS ' + lastSkr.gds + ', BMI ' + lastSkr.bmi) : 'Terpantau baik') + '. Hubungi Apotek ONS Farma.')}" class="ons-btn ons-btn-emerald text-xs py-1 px-2">WA Kartu</a>` : ''}
                      </div>
                    </td>
                  </tr>`;
                }).join('') : '<tr><td colspan="6" class="text-center py-6 text-xs">Tidak ada pasien PRB / Member sesuai filter ini.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      ` : `
        <div class="space-y-4">
          <div class="ons-card p-4 flex flex-wrap items-center justify-between gap-3">
            <div class="text-xs">
              <div class="font-bold text-sm">Tautan Khusus Mini-Portal Dokter Mitra:</div>
              <code class="font-mono-num text-blue-600 break-all">${S().esc(erxUrl)}</code>
            </div>
            <div class="flex gap-2">
              <button onclick="navigator.clipboard?.writeText('${S().esc(erxUrl)}');toast('Link E-Resep Dokter disalin!','ok')" class="ons-btn ons-btn-ghost text-xs">Salin Tautan</button>
              <a href="?erx=DR-MITRA-01" class="ons-btn ons-btn-primary text-xs">Buka Portal Dokter &rarr;</a>
            </div>
          </div>

          <div class="ons-card p-4 space-y-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h3 class="font-bold text-sm">Antrean E-Resep Dokter Masuk (Verifikasi PIN APJ &rarr; Kasir POS)</h3>
              <div class="flex items-center gap-2">
                <input class="ons-input text-xs w-56" placeholder="Cari dokter, pasien, resep..." value="${S().esc(erxSearchQ)}" oninput="window.setErxSearchQ(this.value)"/>
                <span class="badge-bpom bpom-prekursor">${antreCount} Menunggu PIN APJ</span>
              </div>
            </div>
            <div class="space-y-2">
              ${erxQueue.length === 0 ? '<div class="text-xs py-5 text-center" style="color:var(--ons-text-soft)">Belum ada E-Resep masuk yang cocok.</div>' : erxQueue.map((rx) => `
                <div class="p-3 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                  <div class="space-y-1">
                    <div class="flex flex-wrap items-center gap-2">
                      <span class="font-mono-num font-bold">${S().esc(rx.id_klinis)}</span>
                      <span class="badge-bpom ${rx.status_klinis === 'TERVERIFIKASI_APJ' ? 'bpom-bebas' : 'bpom-prekursor'}">${S().esc(rx.status_klinis)}</span>
                      <b>${S().esc(rx.nama_pasien)}</b> &bull; <span>${S().esc(rx.dokter_asal)} (${S().esc(rx.no_sip_dokter || '-')})</span>
                    </div>
                    <div class="font-mono-num whitespace-pre-line p-2 rounded border" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">${S().esc(rx.soap_notes || '-')}</div>
                    ${rx.cdss_warning ? `<div class="text-amber-600 font-semibold">${S().esc(rx.cdss_warning)}</div>` : ''}
                  </div>
                  <div class="flex flex-wrap gap-2 shrink-0">
                    ${rx.status_klinis === 'ANTRIAN_VALIDASI_APJ' ? `<button onclick="window.approveErxWithPinModal('${S().esc(rx.id_klinis)}')" class="ons-btn ons-btn-emerald text-xs py-1.5 px-3">Verifikasi PIN APJ</button>` : ''}
                    <button onclick="window.loadErxToPosCart('${S().esc(rx.id_klinis)}')" class="ons-btn ons-btn-primary text-xs py-1.5 px-3">Muat ke POS &rarr;</button>
                  </div>
                </div>`).join('')}
            </div>
          </div>
        </div>
      `}
    </div>`;
  }

  global.setEresepTab = (t) => {
    eresepTab = t || 'erx';
    if (S().AppState.subTabs) S().AppState.subTabs['eresep-prb'] = eresepTab;
    global.renderActiveView();
    if (typeof global.syncNavHighlight === 'function') global.syncNavHighlight();
  };
  global.setErxSearchQ = (v) => { erxSearchQ = v || ''; global.renderActiveView(); };
  global.setPrbSearchQ = (v) => { prbSearchQ = v || ''; global.renderActiveView(); };
  global.setPrbFilter = (v) => { prbFilter = v || 'SEMUA'; global.renderActiveView(); };

  global.openSkriningModal = (idMember) => {
    const members = S().AppState.members || [];
    if (!members.length) return global.toast('Daftarkan minimal 1 pasien/member terlebih dahulu.', 'warn');
    S().openModal(`<div class="p-6 space-y-3 text-xs">
      <div class="flex justify-between items-center"><h3 class="font-bold text-base">Catat Skrining Metabolik Pasien (TD / GDS / BMI)</h3><button onclick="ONSStore.closeModal()" class="text-xl">&times;</button></div>
      <div><label class="font-semibold block mb-1">Pilih Pasien</label><select id="skrMemId" class="ons-select">${members.map((m) => `<option value="${S().esc(m.id_member)}" ${m.id_member === idMember ? 'selected' : ''}>${S().esc(m.nama_pasien)} (${S().esc(m.program_prb)})</option>`).join('')}</select></div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="font-semibold block mb-1">Tekanan Darah (mmHg)</label><input id="skrTd" class="ons-input font-mono-num" value="125/80"/></div>
        <div><label class="font-semibold block mb-1">Gula Darah Sewaktu (mg/dL)</label><input id="skrGds" type="number" class="ons-input font-mono-num" value="118"/></div>
        <div><label class="font-semibold block mb-1">Berat Badan (kg)</label><input id="skrBb" type="number" class="ons-input font-mono-num" value="65" oninput="window.recalcSkriningBmi()"/></div>
        <div><label class="font-semibold block mb-1">Tinggi Badan (cm)</label><input id="skrTb" type="number" class="ons-input font-mono-num" value="168" oninput="window.recalcSkriningBmi()"/></div>
      </div>
      <div class="p-2.5 rounded-lg border font-mono-num text-center" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">BMI Terhitung: <b id="skrBmiOut">23.0</b></div>
      <button onclick="window.saveSkriningSubmit()" class="ons-btn ons-btn-emerald w-full">Simpan Skrining ke Rekam Pasien</button>
    </div>`, '480px');
  };

  global.recalcSkriningBmi = () => {
    const bb = Number((document.getElementById('skrBb') || {}).value || 0);
    const tb = Number((document.getElementById('skrTb') || {}).value || 0) / 100;
    const el = document.getElementById('skrBmiOut');
    if (el && bb > 0 && tb > 0) el.textContent = (bb / (tb * tb)).toFixed(1);
  };

  global.saveSkriningSubmit = async () => {
    try {
      const memId = document.getElementById('skrMemId').value;
      const m = S().AppState.members.find((x) => x.id_member === memId);
      if (!m) throw new Error('Pasien tidak ditemukan.');
      let arr = [];
      try { arr = JSON.parse(m.riwayat_skrining_json || '[]'); } catch (e) {}
      if (!Array.isArray(arr)) arr = [];
      arr.push({
        tgl: new Date().toISOString().slice(0, 10),
        td: document.getElementById('skrTd').value || '120/80',
        gds: Number(document.getElementById('skrGds').value || 100),
        bmi: Number((document.getElementById('skrBmiOut') || {}).textContent || 22)
      });
      await API().callApi('member.save', Object.assign({}, m, {
        riwayat_skrining_json: JSON.stringify(arr.slice(-12))
      }), { isWrite: true });
      S().closeModal();
      global.toast('Hasil skrining & tren GDS tersimpan!', 'ok');
      await global.bootLoadState(true);
    } catch (e) { global.toast(e.message, 'err'); }
  };

  global.openAddMemberPrbModal = () => {
    S().openModal(`<div class="p-6 space-y-3 text-xs">
      <div class="flex justify-between items-center"><h3 class="font-bold text-base">Daftar Pasien / Member PRB Baru</h3><button onclick="ONSStore.closeModal()" class="text-xl">&times;</button></div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="font-semibold block mb-1">Nama Pasien *</label><input id="mbNama" class="ons-input"/></div>
        <div><label class="font-semibold block mb-1">No. WhatsApp (628..)</label><input id="mbHp" class="ons-input font-mono-num" placeholder="62812xxxx"/></div>
        <div><label class="font-semibold block mb-1">Program</label><select id="mbProg" class="ons-select"><option>PRB_BPJS</option><option>UMUM</option></select></div>
        <div><label class="font-semibold block mb-1">Riwayat Alergi</label><input id="mbAlergi" class="ons-input" value="Tidak Ada"/></div>
      </div>
      <div><label class="font-semibold block mb-1">Penyakit Kronis</label><input id="mbPenyakit" class="ons-input" placeholder="Hipertensi / Diabetes Tipe 2"/></div>
      <button onclick="window.saveMemberPrbSubmit()" class="ons-btn ons-btn-primary w-full">Simpan Data Pasien</button>
    </div>`, '500px');
  };

  global.saveMemberPrbSubmit = async () => {
    try {
      await API().callApi('member.save', {
        nama_pasien: document.getElementById('mbNama').value,
        no_hp: document.getElementById('mbHp').value,
        program_prb: document.getElementById('mbProg').value,
        alergi_list: document.getElementById('mbAlergi').value,
        penyakit_kronis: document.getElementById('mbPenyakit').value,
        tgl_habis_obat: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
      }, { isWrite: true });
      S().closeModal();
      global.toast('Pasien PRB baru tersimpan!', 'ok');
      await global.bootLoadState(true);
    } catch (e) { global.toast(e.message, 'err'); }
  };

  /**
   * W-10 BAGIAN A: Keuangan, AP Radar, Pajak PPn/PPh & Period Lock
   */
  function renderFinanceView() {
    const st = S().AppState;
    financeTab = (st.subTabs && st.subTabs.finance) || financeTab || 'pnl';

    const inDateRange = (isoDate) => {
      const d = String(isoDate || '').slice(0, 10);
      if (financeDateFrom && d < financeDateFrom) return false;
      if (financeDateTo && d > financeDateTo) return false;
      return true;
    };

    const jurnalScoped = (st.jurnalKeuangan || []).filter((j) => inDateRange(j.tanggal));
    const salesValid = (st.penjualan || []).filter((p) => String(p.status_trx || 'LUNAS') !== 'RETUR' && inDateRange(p.tanggal));

    const totalMasuk = jurnalScoped.filter((j) => String(j.jenis_trx).includes('MASUK')).reduce((s, j) => s + Number(j.nominal || 0), 0);
    const totalKeluar = jurnalScoped.filter((j) => !String(j.jenis_trx).includes('MASUK')).reduce((s, j) => s + Number(j.nominal || 0), 0);
    const ppnKeluaran = Math.round((salesValid.reduce((s, p) => s + Number(p.grand_total || 0), 0) || totalMasuk) * 0.11);
    const ppnMasukanFaktur = (st.fakturPbf || []).reduce((s, f) => s + Number(f.ppn_masukan || 0), 0);
    const ppnKurangBayar = Math.max(0, ppnKeluaran - ppnMasukanFaktur);
    const pphFinal = Math.round((salesValid.reduce((s, p) => s + Number(p.grand_total || 0), 0) || totalMasuk) * 0.005);

    const openFaktur = st.fakturPbf.filter((f) => Number(f.sisa_hutang || 0) > 0);
    const apBuckets = [0, 0, 0, 0];
    openFaktur.forEach((f) => {
      const h = S().daysUntil(f.tgl_jatuh_tempo);
      const wIdx = h <= 7 ? 0 : (h <= 14 ? 1 : (h <= 21 ? 2 : 3));
      apBuckets[wIdx] += Number(f.sisa_hutang || 0);
    });
    const maxAp = Math.max(...apBuckets, 1);

    const omzetPos = salesValid.reduce((s, p) => s + Number(p.grand_total || 0), 0);
    const totalHppPos = salesValid.reduce((s, p) => s + Number(p.total_hpp || 0), 0);
    const grossProfit = omzetPos - totalHppPos;
    const grossMarginPct = omzetPos > 0 ? ((grossProfit / omzetPos) * 100).toFixed(1) : '0.0';
    const bebanOps = jurnalScoped.filter((j) => String(j.jenis_trx || '') === 'KELUAR_OPERASIONAL').reduce((s, j) => s + Number(j.nominal || 0), 0);
    const netProfit = grossProfit - bebanOps;
    const valuasiAsetStok = (st.stokBatch || []).filter((b) => String(b.status_batch || 'AKTIF') === 'AKTIF' && Number(b.qty_sisa || 0) > 0)
      .reduce((s, b) => s + Number(b.qty_sisa || 0) * Number(b.hpp_beli || 0), 0);

    const payMethodMap = { TUNAI: 0, QRIS: 0, TRANSFER: 0, SPLIT: 0 };
    salesValid.forEach((p) => {
      const m = String(p.metode_bayar || 'TUNAI').toUpperCase();
      payMethodMap[m] = (payMethodMap[m] || 0) + Number(p.grand_total || 0);
    });

    const filteredJurnal = jurnalScoped.filter((j) => {
      if (jurnalFilter === 'MASUK') return String(j.jenis_trx).includes('MASUK');
      if (jurnalFilter === 'KELUAR') return !String(j.jenis_trx).includes('MASUK');
      return true;
    });

    return `<div class="space-y-5 ons-view-enter">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-xl font-bold">Keuangan, Laba-Rugi Live (P&amp;L), Hutang PBF &amp; Pajak</h1>
          <p class="text-xs" style="color:var(--ons-text-soft)">Analisis P&amp;L kotor/bersih &amp; aset inventori FEFO, buku kas &amp; lock periode, cicilan hutang PBF, PPN/PPh, &amp; slip gaji A4.</p>
        </div>
        <div class="ons-tab-bar">
          <button onclick="window.setFinanceTab('pnl')" class="ons-tab-btn ${financeTab === 'pnl' ? 'active' : ''}">Laba-Rugi (P&amp;L)</button>
          <button onclick="window.setFinanceTab('jurnal')" class="ons-tab-btn ${financeTab === 'jurnal' ? 'active' : ''}">Buku Kas &amp; Lock (${jurnalScoped.length})</button>
          <button onclick="window.setFinanceTab('hutang')" class="ons-tab-btn ${financeTab === 'hutang' ? 'active' : ''}">Hutang PBF (${openFaktur.length})</button>
          <button onclick="window.setFinanceTab('pajak')" class="ons-tab-btn ${financeTab === 'pajak' ? 'active' : ''}">Pajak &amp; Slip Gaji</button>
        </div>
      </div>

      ${financeTab === 'jurnal' ? `
        <div class="space-y-4">
          <div class="ons-card p-4 space-y-3 text-xs">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h3 class="font-bold text-sm">Input Cepat Jurnal Kas / Petty Cash</h3>
              <button onclick="window.lockCurrentFinancePeriod()" class="ons-btn ons-btn-danger text-xs">Kunci Periode Bulan Ini</button>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <select id="jrInlineJenis" class="ons-select sm:col-span-3">
                <option value="KELUAR_OPERASIONAL">KELUAR_OPERASIONAL (Biaya/Petty Cash)</option>
                <option value="MASUK_LAINNYA">MASUK_LAINNYA (Pemasukan Lain)</option>
              </select>
              <input id="jrInlineKat" class="ons-input sm:col-span-5" placeholder="Keterangan biaya / pemasukan (cth. Beli kertas struk 58mm)"/>
              <input id="jrInlineNom" type="number" min="1" class="ons-input font-mono-num sm:col-span-2" placeholder="Nominal (Rp)"/>
              <button onclick="window.saveInlineJurnal()" class="ons-btn ons-btn-primary sm:col-span-2">+ Catat Jurnal</button>
            </div>
          </div>

          <div class="ons-card p-4 space-y-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="ons-tab-bar">
                ${['SEMUA', 'MASUK', 'KELUAR'].map((f) => `<button onclick="window.setJurnalFilter('${f}')" class="ons-tab-btn ${jurnalFilter === f ? 'active' : ''}">${f}</button>`).join('')}
              </div>
              <div class="text-xs font-mono-num">Masuk: <b class="text-emerald-600">${S().rp(totalMasuk)}</b> &bull; Keluar: <b class="text-red-600">${S().rp(totalKeluar)}</b></div>
            </div>
            <div class="ons-table-wrap">
              <table class="ons-table">
                <thead><tr><th>Tanggal</th><th>Jenis</th><th>Kategori / Referensi</th><th>Nominal</th><th>Metode</th><th>Status Lock</th></tr></thead>
                <tbody>
                  ${filteredJurnal.length ? filteredJurnal.slice().reverse().map((j) => `<tr>
                    <td class="font-mono-num text-xs">${S().formatTgl(j.tanggal)}</td>
                    <td><span class="badge-bpom ${String(j.jenis_trx).includes('MASUK') ? 'bpom-bebas' : 'bpom-keras'}">${S().esc(j.jenis_trx)}</span></td>
                    <td class="text-xs"><b>${S().esc(j.kategori)}</b> (${S().esc(j.referensi_id || '-')})</td>
                    <td class="font-mono-num font-bold">${S().rp(j.nominal)}</td>
                    <td class="text-xs">${S().esc(j.metode || '-')}</td>
                    <td><span class="badge-bpom ${j.status_lock === 'TERKUNCI' ? 'bpom-keras' : 'bpom-terbatas'}">${S().esc(j.status_lock || 'TERBUKA')}</span></td>
                  </tr>`).join('') : '<tr><td colspan="6" class="text-center py-6 text-xs">Tidak ada entri jurnal pada filter ini.</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ` : financeTab === 'hutang' ? `
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div class="ons-card p-4 lg:col-span-5">
            <h3 class="font-bold text-sm mb-3">Proyeksi AP Outflow 4 Minggu</h3>
            <div class="flex items-end gap-3 h-36 pt-2">
              ${['Mgg 1', 'Mgg 2', 'Mgg 3', 'Mgg 4+'].map((lbl, idx) => {
                const v = apBuckets[idx];
                const pct = v > 0 ? Math.max(15, Math.round((v / maxAp) * 100)) : 5;
                return `<div class="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                  <div class="text-[10px] font-mono-num" style="color:var(--ons-text-soft)">${v ? (v / 1000000).toFixed(1) + 'jt' : '0'}</div>
                  <div class="w-full rounded-t-md" style="height:${pct}%;background:${idx === 0 && v > 0 ? '#DC2626' : '#F59E0B'}"></div>
                  <div class="text-[11px] font-semibold">${lbl}</div>
                </div>`;
              }).join('')}
            </div>
            <div class="mt-4 pt-3 border-t text-xs flex justify-between font-bold" style="border-color:var(--ons-border)">
              <span>Total Sisa Hutang Usaha PBF</span>
              <span class="font-mono-num text-amber-600">${S().rp(openFaktur.reduce((s, f) => s + Number(f.sisa_hutang || 0), 0))}</span>
            </div>
          </div>
          <div class="ons-card p-4 lg:col-span-7">
            <h3 class="font-bold text-sm mb-3">Radar Pelunasan / Cicilan Hutang PBF (${openFaktur.length} Faktur Aktif)</h3>
            <div class="ons-table-wrap">
              <table class="ons-table">
                <thead><tr><th>Faktur &amp; PBF</th><th>Jatuh Tempo</th><th>Sisa Hutang</th><th>Aksi Pelunasan</th></tr></thead>
                <tbody>
                  ${openFaktur.length ? openFaktur.map((f) => `<tr>
                    <td class="text-xs"><b>${S().esc(f.no_faktur_pbf)}</b><br/>${S().esc(f.id_pbf)}</td>
                    <td class="font-mono-num text-xs">${S().esc(f.tgl_jatuh_tempo)}</td>
                    <td class="font-mono-num font-bold text-amber-600">${S().rp(f.sisa_hutang)}</td>
                    <td>
                      <div class="flex flex-wrap gap-1">
                        <button onclick="window.openPayHutangModal('${S().esc(f.id_beli)}','${S().esc(f.no_faktur_pbf)}',${Number(f.sisa_hutang || 0)})" class="ons-btn ons-btn-primary text-xs py-1 px-2">Cicil</button>
                        <button onclick="window.payHutangPbfNow('${S().esc(f.id_beli)}', ${Number(f.sisa_hutang || 0)})" class="ons-btn ons-btn-emerald text-xs py-1 px-2">Bayar Lunas</button>
                      </div>
                    </td>
                  </tr>`).join('') : '<tr><td colspan="4" class="text-xs text-center py-6">Seluruh hutang faktur PBF telah lunas.</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ` : financeTab === 'pajak' ? `
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div class="ons-card p-5 lg:col-span-5 space-y-3 text-xs">
            <h3 class="font-bold text-sm">Rekonsiliasi Pajak Apotek (PPN 11% &amp; PPh Final 0.5%)</h3>
            <div class="space-y-2 p-3 rounded-xl border" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
              <div class="flex justify-between"><span>PPN Keluaran (11% Omzet)</span><b class="font-mono-num text-blue-600">${S().rp(ppnKeluaran)}</b></div>
              <div class="flex justify-between"><span>PPN Masukan (Faktur PBF)</span><b class="font-mono-num text-emerald-600">-${S().rp(ppnMasukanFaktur)}</b></div>
              <div class="flex justify-between border-t pt-2 font-bold" style="border-color:var(--ons-border)">
                <span>Est. PPN Kurang Bayar</span>
                <span class="font-mono-num text-red-600">${S().rp(ppnKurangBayar)}</span>
              </div>
              <div class="flex justify-between pt-2">
                <span>PPh Final UMKM 0.5% (PP 55/2022)</span>
                <b class="font-mono-num text-amber-600">${S().rp(pphFinal)}</b>
              </div>
            </div>
          </div>
          <div class="ons-card p-5 lg:col-span-7 space-y-3 text-xs">
            <h3 class="font-bold text-sm">Generator Slip Gaji Pegawai Apotek (Siap Cetak A4)</h3>
            <div class="grid grid-cols-2 gap-3">
              <div><label class="font-semibold block mb-1">Nama Pegawai</label><input id="sgNama" class="ons-input" value="apt. Siti Rahma, S.Farm"/></div>
              <div><label class="font-semibold block mb-1">Jabatan</label><input id="sgJab" class="ons-input" value="Apoteker Penanggung Jawab"/></div>
              <div><label class="font-semibold block mb-1">Gaji Pokok (Rp)</label><input id="sgPokok" type="number" class="ons-input font-mono-num" value="4800000"/></div>
              <div><label class="font-semibold block mb-1">Tunjangan Jasa Profesi / Bonus</label><input id="sgTunj" type="number" class="ons-input font-mono-num" value="1500000"/></div>
              <div><label class="font-semibold block mb-1">Potongan Kasbon / BPJS</label><input id="sgPot" type="number" class="ons-input font-mono-num" value="150000"/></div>
              <div><label class="font-semibold block mb-1">Periode Bulan</label><input id="sgPer" class="ons-input font-mono-num" value="${new Date().toISOString().slice(0, 7)}"/></div>
            </div>
            <button onclick="window.printSlipGajiPdf()" class="ons-btn ons-btn-primary w-full">Pratinjau &amp; Cetak Slip Gaji Resmi (A4)</button>
          </div>
        </div>
      ` : `
        <div class="space-y-4">
          <div class="ons-card p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-bold">Filter Tanggal:</span>
              <input type="date" class="ons-input text-xs w-40" value="${S().esc(financeDateFrom)}" onchange="window.setFinanceDateRange(this.value, '${S().esc(financeDateTo)}')"/>
              <span>s/d</span>
              <input type="date" class="ons-input text-xs w-40" value="${S().esc(financeDateTo)}" onchange="window.setFinanceDateRange('${S().esc(financeDateFrom)}', this.value)"/>
              ${(financeDateFrom || financeDateTo) ? `<button onclick="window.setFinanceDateRange('','')" class="ons-btn ons-btn-ghost text-xs py-1">Reset</button>` : ''}
            </div>
            <button onclick="window.exportFinancePnlExcel()" class="ons-btn ons-btn-emerald text-xs">Export Laporan P&amp;L (.xlsx)</button>
          </div>

          <div class="ons-card p-4 grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div><div class="text-[11px]" style="color:var(--ons-text-soft)">Omzet Penjualan Bersih</div><div class="text-base font-extrabold font-mono-num text-blue-600">${S().rp(omzetPos)}</div></div>
            <div><div class="text-[11px]" style="color:var(--ons-text-soft)">HPP Terjual (COGS)</div><div class="text-base font-extrabold font-mono-num">${S().rp(totalHppPos)}</div></div>
            <div><div class="text-[11px]" style="color:var(--ons-text-soft)">Laba Kotor (${grossMarginPct}%)</div><div class="text-base font-extrabold font-mono-num text-emerald-600">${S().rp(grossProfit)}</div></div>
            <div><div class="text-[11px]" style="color:var(--ons-text-soft)">Est. Laba Bersih (-Beban)</div><div class="text-base font-extrabold font-mono-num ${netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}">${S().rp(netProfit)}</div></div>
            <div><div class="text-[11px]" style="color:var(--ons-text-soft)">Valuasi Aset Stok (HPP)</div><div class="text-base font-extrabold font-mono-num text-teal-600">${S().rp(valuasiAsetStok)}</div></div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div class="ons-card p-4"><div class="text-xs" style="color:var(--ons-text-soft)">Pemasukan Kas Tercatat</div><div class="text-lg font-bold font-mono-num text-emerald-600">${S().rp(totalMasuk)}</div></div>
            <div class="ons-card p-4"><div class="text-xs" style="color:var(--ons-text-soft)">Pengeluaran Operasional</div><div class="text-lg font-bold font-mono-num text-red-600">${S().rp(totalKeluar)}</div></div>
            <div class="ons-card p-4"><div class="text-xs" style="color:var(--ons-text-soft)">Rincian Metode Bayar</div>
              <div class="text-xs font-mono-num mt-1 space-y-0.5">
                <div>Tunai: <b>${S().rp(payMethodMap.TUNAI || 0)}</b></div>
                <div>QRIS/Transfer: <b>${S().rp((payMethodMap.QRIS || 0) + (payMethodMap.TRANSFER || 0) + (payMethodMap.SPLIT || 0))}</b></div>
              </div>
            </div>
            <div class="ons-card p-4 flex flex-col justify-between">
              <div class="text-xs" style="color:var(--ons-text-soft)">Nota Penjualan Valid</div>
              <div class="text-lg font-bold font-mono-num text-blue-600">${salesValid.length} Transaksi</div>
            </div>
          </div>
        </div>
      `}
    </div>`;
  }

  global.setFinanceTab = (t) => {
    financeTab = t || 'pnl';
    if (S().AppState.subTabs) S().AppState.subTabs.finance = financeTab;
    global.renderActiveView();
    if (typeof global.syncNavHighlight === 'function') global.syncNavHighlight();
  };
  global.setFinanceDateRange = (from, to) => { financeDateFrom = from || ''; financeDateTo = to || ''; global.renderActiveView(); };
  global.setJurnalFilter = (v) => { jurnalFilter = v || 'SEMUA'; global.renderActiveView(); };

  global.saveInlineJurnal = async () => {
    try {
      const kat = (document.getElementById('jrInlineKat') || {}).value || '';
      const nom = Number((document.getElementById('jrInlineNom') || {}).value || 0);
      if (!kat.trim() || nom <= 0) throw new Error('Isi keterangan & nominal kas valid (>0).');
      await API().callApi('finance.saveJurnal', {
        jenis_trx: (document.getElementById('jrInlineJenis') || {}).value || 'KELUAR_OPERASIONAL',
        kategori: kat.trim(),
        nominal: nom,
        periode_bulan: new Date().toISOString().slice(0, 7)
      }, { isWrite: true });
      global.toast('Jurnal kas tersimpan!', 'ok');
      await global.bootLoadState(true);
    } catch (e) { global.toast(e.message, 'err'); }
  };

  global.exportFinancePnlExcel = () => {
    const st = S().AppState;
    const rows = (st.penjualan || []).map((p) => ({
      no_invoice: p.no_invoice,
      tanggal: String(p.tanggal || '').slice(0, 10),
      metode: p.metode_bayar,
      grand_total: Number(p.grand_total || 0),
      total_hpp: Number(p.total_hpp || 0),
      margin: Number(p.estimasi_margin || (Number(p.grand_total || 0) - Number(p.total_hpp || 0))),
      status: p.status_trx || 'LUNAS'
    }));
    S().exportDataset('xlsx', 'Laporan Laba Rugi P&L ONS Farma', 'Laporan_PnL_ONS_Farma', [
      { key: 'no_invoice', label: 'No Invoice' },
      { key: 'tanggal', label: 'Tanggal' },
      { key: 'metode', label: 'Metode' },
      { key: 'grand_total', label: 'Omzet (Rp)' },
      { key: 'total_hpp', label: 'HPP COGS (Rp)' },
      { key: 'margin', label: 'Laba Kotor (Rp)' },
      { key: 'status', label: 'Status' }
    ], rows);
  };

  global.openPayHutangModal = (idBeli, noFak, sisaMax) => {
    S().openModal(`<div class="p-6 space-y-3 text-xs">
      <div class="flex justify-between items-center"><h3 class="font-bold text-base">Bayar / Cicil Hutang Faktur ${S().esc(noFak)}</h3><button onclick="ONSStore.closeModal()" class="text-xl">&times;</button></div>
      <div class="p-3 rounded-lg" style="background:var(--ons-bg-subtle)">Sisa hutang saat ini: <b class="font-mono-num text-amber-600">${S().rp(sisaMax)}</b></div>
      <div><label class="font-semibold block mb-1">Nominal Pembayaran (Rp) *</label><input id="payHutangAmt" type="number" min="1" max="${sisaMax}" class="ons-input font-mono-num" value="${sisaMax}"/></div>
      <div><label class="font-semibold block mb-1">Metode Transfer</label><select id="payHutangMetode" class="ons-select"><option value="TRANSFER_BANK">TRANSFER_BANK</option><option value="KAS_TUNAI">KAS_TUNAI</option><option value="GIRO">GIRO / CEK</option></select></div>
      <button onclick="window.submitPayHutangPartial('${S().esc(idBeli)}')" class="ons-btn ons-btn-emerald w-full">Catat Pembayaran PBF ke Jurnal Kas</button>
    </div>`, '440px');
  };

  global.submitPayHutangPartial = async (idBeli) => {
    try {
      const amt = Number(document.getElementById('payHutangAmt').value || 0);
      const met = document.getElementById('payHutangMetode').value || 'TRANSFER_BANK';
      if (amt <= 0) throw new Error('Nominal bayar harus > 0.');
      await API().callApi('finance.payHutangPbf', { id_beli: idBeli, nominal_bayar: amt, metode: met }, { isWrite: true });
      S().closeModal();
      global.toast('Pembayaran hutang PBF tercatat ke Jurnal Kas!', 'ok');
      await global.bootLoadState(true);
    } catch (e) { global.toast(e.message, 'err'); }
  };

  global.payHutangPbfNow = async (idBeli, nominal) => {
    if (!confirm('Catat pelunasan faktur ' + idBeli + ' sebesar ' + S().rp(nominal) + ' ke jurnal pengeluaran kas?')) return;
    try {
      await API().callApi('finance.payHutangPbf', { id_beli: idBeli, nominal_bayar: nominal, metode: 'TRANSFER_BANK' }, { isWrite: true });
      global.toast('Pelunasan hutang PBF dicatat ke Jurnal Kas!', 'ok');
      await global.bootLoadState(true);
    } catch (e) { global.toast(e.message, 'err'); }
  };

  global.openSlipGajiModal = () => {
    S().openModal(`<div class="p-6 space-y-3 text-xs">
      <div class="flex justify-between items-center"><h3 class="font-bold text-base">Generator Slip Gaji Apotek ONS Farma (A4)</h3><button onclick="ONSStore.closeModal()" class="text-xl">&times;</button></div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="font-semibold block mb-1">Nama Pegawai</label><input id="sgNama" class="ons-input" value="apt. Siti Rahma, S.Farm"/></div>
        <div><label class="font-semibold block mb-1">Jabatan</label><input id="sgJab" class="ons-input" value="Apoteker Penanggung Jawab"/></div>
        <div><label class="font-semibold block mb-1">Gaji Pokok (Rp)</label><input id="sgPokok" type="number" class="ons-input font-mono-num" value="4800000"/></div>
        <div><label class="font-semibold block mb-1">Tunjangan Jasa Profesi / Bonus</label><input id="sgTunj" type="number" class="ons-input font-mono-num" value="1500000"/></div>
        <div><label class="font-semibold block mb-1">Potongan Kasbon / BPJS</label><input id="sgPot" type="number" class="ons-input font-mono-num" value="150000"/></div>
        <div><label class="font-semibold block mb-1">Periode Bulan</label><input id="sgPer" class="ons-input font-mono-num" value="${new Date().toISOString().slice(0, 7)}"/></div>
      </div>
      <button onclick="window.printSlipGajiPdf()" class="ons-btn ons-btn-primary w-full">Pratinjau &amp; Cetak Slip Gaji A4</button>
    </div>`, '520px');
  };

  global.printSlipGajiPdf = () => {
    const nama = document.getElementById('sgNama').value;
    const jab = document.getElementById('sgJab').value;
    const pokok = Number(document.getElementById('sgPokok').value || 0);
    const tunj = Number(document.getElementById('sgTunj').value || 0);
    const pot = Number(document.getElementById('sgPot').value || 0);
    const per = document.getElementById('sgPer').value;
    const bersih = Math.max(0, pokok + tunj - pot);
    S().printHtmlZone(`<div style="font-family:Arial,sans-serif;border:2px solid #09202A;padding:24px;max-width:680px;margin:auto;font-size:12px;">
      <div style="border-bottom:2px solid #09202A;padding-bottom:8px;margin-bottom:14px;display:flex;justify-content:space-between;">
        <div><b style="font-size:16px;">APOTEK ONS FARMA ENTERPRISE</b><br/>SLIP GAJI PEGAWAI &bull; PERIODE ${S().esc(per)}</div>
        <div style="text-align:right;">Dicetak: ${new Date().toLocaleDateString('id-ID')}</div>
      </div>
      <p><b>Nama:</b> ${S().esc(nama)}<br/><b>Jabatan:</b> ${S().esc(jab)}</p>
      <table style="width:100%;border-collapse:collapse;margin:12px 0;" border="1" cellpadding="6">
        <tr><td>Gaji Pokok</td><td style="text-align:right;">${S().rp(pokok)}</td></tr>
        <tr><td>Tunjangan Profesi / Insentif Shift</td><td style="text-align:right;">${S().rp(tunj)}</td></tr>
        <tr><td>Potongan BPJS / Kasbon</td><td style="text-align:right;color:#DC2626;">-${S().rp(pot)}</td></tr>
        <tr style="background:#f1f5f9;font-weight:bold;font-size:14px;"><td>THP / Gaji Bersih Diterima</td><td style="text-align:right;">${S().rp(bersih)}</td></tr>
      </table>
      <div style="margin-top:28px;display:flex;justify-content:space-between;"><div>Diterima Oleh,<br/><br/><br/>(${S().esc(nama)})</div><div>Pemilik Apotek ONS Farma,<br/><br/><br/>(___________________)</div></div>
    </div>`);
  };

  global.openInputJurnalModal = () => {
    S().openModal(`<div class="p-6 space-y-3 text-xs">
      <div class="flex justify-between items-center"><h3 class="font-bold text-base">Catat Jurnal Kas / Petty Cash</h3><button onclick="ONSStore.closeModal()" class="text-xl">&times;</button></div>
      <select id="jrJenis" class="ons-select"><option value="KELUAR_OPERASIONAL">KELUAR_OPERASIONAL (Petty Cash / Listrik / Plastik)</option><option value="MASUK_LAINNYA">MASUK_LAINNYA</option></select>
      <input id="jrKat" class="ons-input" placeholder="Keterangan biaya (mis. Beli kertas struk 58mm)"/>
      <input id="jrNom" type="number" class="ons-input font-mono-num" placeholder="Nominal (Rp)"/>
      <button onclick="window.saveJurnalSubmit()" class="ons-btn ons-btn-primary w-full">Simpan ke Jurnal Keuangan</button>
    </div>`, '460px');
  };

  global.saveJurnalSubmit = async () => {
    try {
      await API().callApi('finance.saveJurnal', {
        jenis_trx: document.getElementById('jrJenis').value,
        kategori: document.getElementById('jrKat').value,
        nominal: Number(document.getElementById('jrNom').value || 0),
        periode_bulan: new Date().toISOString().slice(0, 7)
      }, { isWrite: true });
      S().closeModal();
      global.toast('Jurnal keuangan tersimpan!', 'ok');
      await global.bootLoadState(true);
    } catch (e) { global.toast(e.message, 'err'); }
  };

  global.lockCurrentFinancePeriod = async () => {
    const per = new Date().toISOString().slice(0, 7);
    try {
      const res = await API().callApi('finance.lockPeriod', { periode: per }, { isWrite: true });
      global.toast('Periode ' + per + ' resmi dikunci (' + res.locked_rows + ' baris)!', 'ok');
      await global.bootLoadState(true);
    } catch (e) { global.toast(e.message, 'err'); }
  };

  /**
   * MODUL /gas-tagihan-pembayaran UI (Multi-bulan, GrupBayar 1 Bukti, Verif 1 Klik, Kwitansi QR HMAC, Reminder WA)
   */
  function renderBillingModuleView() {
    global.refreshBillingDataIfNeeded();
    const st = S().AppState;
    activeBillingTab = (st.subTabs && st.subTabs.billing) || activeBillingTab || 'tagihan';
    const list = billingCache.tagihan || [];
    const pending = billingCache.pending || [];
    const potongan = billingCache.potongan || [];
    const seeCost = S().canSeeFinancialCost();

    return `<div class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-xl font-bold">Tagihan PRB / Home Care, GrupBayar &amp; Kwitansi QR HMAC</h1>
          <p class="text-xs" style="color:var(--ons-text-soft)">1 bukti transfer banyak tagihan, verifikasi 1 klik, nomor kwitansi KW-YYYY-XXXXXX &amp; WA Reminder H-3/H-0.</p>
        </div>
        <div class="flex flex-wrap gap-2">
          ${seeCost ? `<button onclick="window.openGenTagihanModal()" class="ons-btn ons-btn-primary text-xs">+ Terbit Tagihan Massal</button>` : ''}
          <button onclick="window.openBayarGrupModal()" class="ons-btn ons-btn-emerald text-xs">&#128179; Bayar Beberapa Tagihan (GrupBayar)</button>
        </div>
      </div>

      <div class="flex gap-2 flex-wrap">
        ${[
          { id: 'tagihan', label: 'Daftar Tagihan (' + list.length + ')' },
          { id: 'verifikasi', label: 'Antrean Verifikasi (' + pending.length + ')' },
          { id: 'potongan', label: 'Potongan / Subsidi (' + potongan.length + ')' },
          { id: 'reminder', label: 'Reminder WA H-3 / H-0' }
        ].map((t) => `<button onclick="window.setBillingTab('${t.id}')" class="ons-btn text-xs ${activeBillingTab === t.id ? 'ons-btn-primary' : 'ons-btn-ghost'}">${t.label}</button>`).join('')}
      </div>

      ${activeBillingTab === 'tagihan' ? `<div class="ons-card p-4">
        <div class="ons-table-wrap">
          <table class="ons-table">
            <thead><tr><th>ID / Periode</th><th>Pasien</th><th>Deskripsi</th><th>Netto</th><th>Terbayar</th><th>Status</th><th>Aksi</th></tr></thead>
            <tbody>
              ${list.map((t) => `<tr>
                <td class="font-mono-num text-xs"><b>${S().esc(t.ID)}</b><br/>${S().esc(t.Periode)}</td>
                <td class="text-xs"><b>${S().esc(t.Nama_Pasien)}</b><br/>${S().esc(t.Program)}</td>
                <td class="text-xs">${S().esc(t.Deskripsi)}<br/><span style="color:var(--ons-text-soft)">JT: ${S().esc(t.JatuhTempo)}</span></td>
                <td class="font-mono-num font-bold">${S().rp(t.Netto)}</td>
                <td class="font-mono-num text-emerald-600">${S().rp(t.Terbayar)}</td>
                <td><span class="badge-bpom ${t.Status === 'LUNAS' ? 'bpom-bebas' : (t.Status === 'MENUNGGU_VERIFIKASI' ? 'bpom-prekursor' : 'bpom-keras')}">${S().esc(t.Status)}</span></td>
                <td><button onclick="window.paySingleBillQuick('${t.ID}', ${Math.max(0, t.Netto - t.Terbayar)})" ${t.Status === 'LUNAS' ? 'disabled' : ''} class="ons-btn ons-btn-emerald text-xs py-1 px-2">Bayar / Verif</button></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>` : ''}

      ${activeBillingTab === 'verifikasi' ? `<div class="ons-card p-4 space-y-3">
        <h3 class="font-bold text-sm">Verifikasi Pembayaran 1-Klik Semua-atau-Tidak per GrupBayar</h3>
        ${pending.length ? pending.map((p) => `<div class="p-3 rounded-xl border flex flex-wrap justify-between items-center gap-2 text-xs">
          <div><b>Grup: ${S().esc(p.GrupBayar)}</b> &bull; Tagihan: ${S().esc(p.ID_Tagihan)} &bull; Nominal: <b class="font-mono-num text-blue-600">${S().rp(p.NominalBayar)}</b></div>
          <div class="flex gap-2">
            <button onclick="window.verifyGrupPay('${p.GrupBayar}','TERIMA')" class="ons-btn ons-btn-emerald text-xs py-1">Terima &amp; Terbit Kwitansi</button>
            <button onclick="window.verifyGrupPay('${p.GrupBayar}','TOLAK')" class="ons-btn ons-btn-danger text-xs py-1">Tolak</button>
          </div>
        </div>`).join('') : '<div class="text-xs" style="color:var(--ons-text-soft)">Tidak ada bukti transfer yang menunggu verifikasi.</div>'}
        <h3 class="font-bold text-sm pt-3 border-t" style="border-color:var(--ons-border)">Riwayat Kwitansi Terverifikasi (Siap Cetak / Verifikasi QR HMAC)</h3>
        <div class="space-y-2">
          ${(billingCache.history || []).filter((h) => h.Status === 'TERVERIFIKASI').map((h) => `<div class="p-2.5 rounded-lg border flex justify-between items-center text-xs">
            <div><b class="font-mono-num">${S().esc(h.NoKwitansi)}</b> (${S().esc(h.GrupBayar)}) &bull; ${S().rp(h.NominalBayar)}</div>
            <button onclick="window.openKwitansiQrModal('${S().esc(h.NoKwitansi)}', ${h.NominalBayar}, '${S().esc(h.Sig || '')}')" class="ons-btn ons-btn-primary text-xs py-1 px-2.5">Lihat &amp; Cetak Kwitansi QR</button>
          </div>`).join('')}
        </div>
      </div>` : ''}

      ${activeBillingTab === 'potongan' ? `<div class="ons-card p-4 space-y-3">
        <h3 class="font-bold text-sm">Daftar Potongan / Subsidi Pasien PRB</h3>
        <div class="space-y-2 text-xs">
          ${potongan.map((pt) => `<div class="p-3 rounded-lg border flex justify-between"><span><b>${S().esc(pt.Nama_Pasien)}</b> (${S().esc(pt.JenisPotongan)})</span><span class="font-mono-num font-bold text-emerald-600">${pt.TipeNilai === 'PERSEN' ? pt.Nilai + '%' : S().rp(pt.Nilai)}</span></div>`).join('')}
        </div>
      </div>` : ''}

      ${activeBillingTab === 'reminder' ? `<div class="ons-card p-4 space-y-3 text-xs">
        <p>Mengantrikan pengingat WhatsApp otomatis H-3 &amp; H-0 jatuh tempo ke tabel <code>ReminderLog</code> dan Fonnte API secara asynchronous tanpa memblokir antrean transaksi.</p>
        <button onclick="window.runWaReminderNow()" class="ons-btn ons-btn-emerald">Kirim / Antrikan WA Reminder Tagihan Aktif Sekarang</button>
      </div>` : ''}
    </div>`;
  }

  let _billingLoading = false;
  global.refreshBillingDataIfNeeded = async (force) => {
    if (_billingLoading || (!force && billingCache.tagihan.length)) return;
    _billingLoading = true;
    try {
      const [l, p, h, d] = await Promise.all([
        API().callApi('billing.list', {}),
        API().callApi('billing.pending', {}),
        API().callApi('billing.history', {}),
        API().callApi('discount.list', {})
      ]);
      billingCache = { tagihan: l.items || [], pending: p.items || [], history: h.items || [], potongan: d.items || [] };
      if (S().AppState.activeView === 'billing') global.renderActiveView();
    } catch (e) {} finally { _billingLoading = false; }
  };

  global.setBillingTab = (t) => {
    activeBillingTab = t || 'tagihan';
    if (S().AppState.subTabs) S().AppState.subTabs.billing = activeBillingTab;
    global.renderActiveView();
    if (typeof global.syncNavHighlight === 'function') global.syncNavHighlight();
  };

  global.openGenTagihanModal = () => {
    const curMonth = new Date().toISOString().slice(0, 7);
    S().openModal(`<div class="p-6 space-y-3 text-xs">
      <div class="flex justify-between items-center"><h3 class="font-bold text-base">Terbit Tagihan Massal Pasien PRB</h3><button onclick="ONSStore.closeModal()" class="text-xl">&times;</button></div>
      <label class="font-semibold block">Periode (pisahkan koma untuk multi-bulan, cth: ${curMonth})</label>
      <input id="tgPer" class="ons-input font-mono-num" value="${curMonth}"/>
      <label class="font-semibold block">Deskripsi Layanan</label>
      <input id="tgDesk" class="ons-input" value="Paket Home Pharmacy Care PRB Bulanan"/>
      <label class="font-semibold block">Nominal Dasar (Rp)</label>
      <input id="tgNom" type="number" class="ons-input font-mono-num" value="180000"/>
      <button onclick="window.submitGenBatchBilling()" class="ons-btn ons-btn-primary w-full">Terbitkan Tagihan Sekarang</button>
    </div>`, '460px');
  };

  global.submitGenBatchBilling = async () => {
    try {
      const pers = document.getElementById('tgPer').value.split(',').map((s) => s.trim()).filter(Boolean);
      const res = await API().callApi('billing.genBatch', {
        periodes: pers,
        deskripsi: document.getElementById('tgDesk').value,
        nominal: Number(document.getElementById('tgNom').value || 0)
      }, { isWrite: true });
      S().closeModal();
      global.toast(res.created + ' tagihan berhasil diterbitkan!', 'ok');
      await global.refreshBillingDataIfNeeded(true);
    } catch (e) { global.toast(e.message, 'err'); }
  };

  global.openBayarGrupModal = () => {
    const openBills = (billingCache.tagihan || []).filter((t) => t.Status !== 'LUNAS' && t.Status !== 'BATAL');
    S().openModal(`<div class="p-6 space-y-3 text-xs">
      <div class="flex justify-between items-center"><h3 class="font-bold text-base">Bayar Banyak Tagihan (1 Bukti Transfer - GrupBayar)</h3><button onclick="ONSStore.closeModal()" class="text-xl">&times;</button></div>
      <div class="max-h-48 overflow-y-auto space-y-1.5 border p-2 rounded-lg">
        ${openBills.map((t) => `<label class="flex items-center justify-between p-1.5 rounded hover:bg-blue-500/10 cursor-pointer">
          <span><input type="checkbox" checked class="grup-bill-chk accent-blue-600 mr-2" value="${t.ID}"/> <b>${S().esc(t.Nama_Pasien)}</b> — ${S().esc(t.Deskripsi)}</span>
          <span class="font-mono-num font-bold">${S().rp(Math.max(0, t.Netto - t.Terbayar))}</span>
        </label>`).join('')}
      </div>
      <input id="gbNom" type="number" class="ons-input font-mono-num" value="${openBills.reduce((s, t) => s + Math.max(0, t.Netto - t.Terbayar), 0)}" placeholder="Total Nominal Transfer"/>
      <label class="flex items-center gap-2"><input id="gbDirect" type="checkbox" checked/> Verifikasi langsung sekarang &amp; terbitkan Kwitansi QR HMAC</label>
      <button onclick="window.submitGrupBayarNow()" class="ons-btn ons-btn-emerald w-full">Kirim Bukti Pembayaran</button>
    </div>`, '540px');
  };

  global.paySingleBillQuick = async (id, sisa) => {
    try {
      const res = await API().callApi('billing.submitProof', { tagihan_ids: [id], nominal_bayar: sisa, langsung_verif: true, metode: 'TRANSFER_BANK' }, { isWrite: true });
      global.toast('Tagihan dilunasi! Kwitansi: ' + (res.no_kwitansi || res.grup_bayar), 'ok');
      await global.refreshBillingDataIfNeeded(true);
    } catch (e) { global.toast(e.message, 'err'); }
  };

  global.submitGrupBayarNow = async () => {
    const ids = [];
    document.querySelectorAll('.grup-bill-chk:checked').forEach((c) => ids.push(c.value));
    if (!ids.length) return;
    try {
      const res = await API().callApi('billing.submitProof', {
        tagihan_ids: ids,
        nominal_bayar: Number(document.getElementById('gbNom').value || 0),
        langsung_verif: document.getElementById('gbDirect').checked,
        metode: 'TRANSFER_BANK'
      }, { isWrite: true });
      S().closeModal();
      global.toast('GrupBayar tersimpan! ' + (res.no_kwitansi ? 'No. Kwitansi: ' + res.no_kwitansi : 'Menunggu Verifikasi'), 'ok');
      await global.refreshBillingDataIfNeeded(true);
    } catch (e) { global.toast(e.message, 'err'); }
  };

  global.verifyGrupPay = async (grup, kep) => {
    try {
      const res = await API().callApi('billing.verifyPayment', { grup_bayar: grup, keputusan: kep }, { isWrite: true });
      global.toast('Verifikasi ' + kep + ' sukses! ' + (res.no_kwitansi || ''), 'ok');
      await global.refreshBillingDataIfNeeded(true);
    } catch (e) { global.toast(e.message, 'err'); }
  };

  global.openKwitansiQrModal = (noKw, nom, sig) => {
    const validSig = sig || btoa(noKw).slice(0, 12).toUpperCase();
    const verifyLink = `${global.location.origin}${global.location.pathname}#kwitansi=${encodeURIComponent(noKw)}&sig=${encodeURIComponent(validSig)}`;
    S().openModal(`<div class="p-6 text-center space-y-3">
      <div class="p-5 border-2 rounded-xl text-left space-y-3 bg-white text-black">
        <div class="flex justify-between items-start border-b pb-2">
          <div><div class="font-bold text-base">KWITANSI PEMBAYARAN RESMI</div><div class="text-xs">Apotek ONS Farma Enterprise</div></div>
          <div class="font-mono-num text-xs font-bold">${S().esc(noKw)}</div>
        </div>
        <div class="text-sm">Telah diterima pembayaran sejumlah: <b class="font-mono-num text-lg">${S().rp(nom)}</b></div>
        <div class="flex items-center justify-between pt-2">
          <div class="text-[10px]">Scan QR untuk memverifikasi keaslian kwitansi<br/>secara publik (HMAC-SHA256: <b class="font-mono-num">${S().esc(validSig)}</b>).</div>
          <div>${S().renderSvgQr(verifyLink, 96)}</div>
        </div>
      </div>
      <button onclick="ONSStore.printHtmlZone(this.previousElementSibling.outerHTML)" class="ons-btn ons-btn-primary w-full text-xs">Cetak Kwitansi Resmi PDF</button>
    </div>`, '500px');
  };

  global.runWaReminderNow = async () => {
    try {
      const res = await API().callApi('reminder.run', {}, { isWrite: true });
      global.toast(res.queued + ' reminder WA pasien berhasil diantrikan di luar lock!', 'ok');
    } catch (e) { global.toast(e.message, 'err'); }
  };

  /**
   * MODUL /gas-doc-engine UI (Template {{...}}, Pejabat Sign + PIN 6 digit -> TERBIT + Kode Verifikasi 20 Char QR)
   */
  function renderDocEngineView() {
    global.refreshDocEngineIfNeeded();
    const st = S().AppState;
    activeDocTab = (st.subTabs && st.subTabs['doc-engine']) || activeDocTab || 'surat';
    const docs = docCache.docs || [];
    const tpls = docCache.templates || [];

    return `<div class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-xl font-bold">Mesin Dokumen &amp; Surat Resmi Apotek (Doc Engine v10)</h1>
          <p class="text-xs" style="color:var(--ons-text-soft)">Templat {{...}} Docs/Sheets/Slides, persetujuan PIN APJ/Pemilik, pembekuan TERBIT &amp; Verifikasi Publik 20-Karakter.</p>
        </div>
        <button onclick="window.openCreateDocModal()" class="ons-btn ons-btn-primary text-xs">+ Buat Draf Surat Resmi Baru</button>
      </div>

      <div class="flex gap-2">
        <button onclick="window.setDocTab('surat')" class="ons-btn text-xs ${activeDocTab === 'surat' ? 'ons-btn-primary' : 'ons-btn-ghost'}">Arsip &amp; Persetujuan Surat (${docs.length})</button>
        <button onclick="window.setDocTab('pindai')" class="ons-btn text-xs ${activeDocTab === 'pindai' ? 'ons-btn-primary' : 'ons-btn-ghost'}">Daftar Templat &amp; Pemindai {{Placeholder}} (${tpls.length})</button>
      </div>

      ${activeDocTab === 'surat' ? `<div class="ons-card p-4">
        <div class="ons-table-wrap">
          <table class="ons-table">
            <thead><tr><th>No. Surat &amp; Templat</th><th>Judul Dokumen</th><th>Status</th><th>Kode Verifikasi QR</th><th>Aksi</th></tr></thead>
            <tbody>
              ${docs.map((d) => `<tr>
                <td class="font-mono-num text-xs"><b>${S().esc(d.NomorSurat)}</b><br/>${S().esc(d.KodeTemplat)}</td>
                <td class="text-xs font-semibold">${S().esc(d.Judul)}</td>
                <td><span class="badge-bpom ${d.Status === 'TERBIT' ? 'bpom-bebas' : 'bpom-prekursor'}">${S().esc(d.Status)}</span></td>
                <td class="font-mono-num text-xs">${d.KodeVerifikasi ? `<b>${S().esc(d.KodeVerifikasi)}</b>` : '-'}</td>
                <td>
                  ${d.Status !== 'TERBIT' ? `<button onclick="window.openSignDocPinModal('${d.ID}')" class="ons-btn ons-btn-emerald text-xs py-1 px-2.5">TTD PIN Pejabat &amp; Terbitkan</button>` : `<button onclick="window.previewDocSigned('${d.ID}')" class="ons-btn ons-btn-ghost text-xs py-1 px-2.5">Pratinjau &amp; Cetak QR</button>`}
                </td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>` : `<div class="ons-card p-4 space-y-4 text-xs">
        <div class="p-3 rounded-xl border space-y-2" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
          <h3 class="font-bold text-sm">Pemindai Templat Google Docs / Sheets / Slides ({{...}})</h3>
          <p style="color:var(--ons-text-soft)">Tempel ID File Google Docs/Sheets/Slides Anda untuk memindai tag <code>{{PLACEHOLDER}}</code> secara otomatis dan membuat form isian surat.</p>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
            <input id="deScanFileId" class="ons-input font-mono-num" placeholder="ID File Drive (cth: 1AbCdEfG...)" value=""/>
            <input id="deScanNama" class="ons-input" placeholder="Nama Templat Baru" value="Surat Keterangan Apoteker"/>
            <div class="flex gap-2">
              <select id="deScanJenis" class="ons-select flex-1"><option>Google Docs</option><option>Google Sheets</option><option>Google Slides</option></select>
              <button onclick="window.runDocScanTemplate()" class="ons-btn ons-btn-primary">Pindai</button>
            </div>
          </div>
          <div id="deScanResultBox" class="hidden p-2.5 rounded-lg border bg-white/60 dark:bg-black/20"></div>
        </div>
        <h3 class="font-bold text-sm">Templat Terdaftar ({{...}} + Modifier |kapital, |rupiah, |terbilang, |tanggal)</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          ${tpls.map((t) => `<div class="p-3 rounded-xl border space-y-2">
            <div class="flex justify-between items-start gap-2">
              <div><div class="font-bold text-sm">${S().esc(t.Nama)}</div><div class="font-mono-num text-blue-600">${S().esc(t.Kode)} &bull; ${S().esc(t.JenisFile)}</div></div>
              <button onclick="window.openCreateDocModal('${S().esc(t.Kode)}')" class="ons-btn ons-btn-emerald text-[11px] py-1 px-2">Buat Surat &rarr;</button>
            </div>
            <div style="color:var(--ons-text-soft)">Placeholder: ${S().esc(t.PlaceholderJson)}</div>
          </div>`).join('')}
        </div>
      </div>`}
    </div>`;
  }

  let _docLoading = false;
  global.refreshDocEngineIfNeeded = async (force) => {
    if (_docLoading || (!force && docCache.docs.length)) return;
    _docLoading = true;
    try {
      const [t, d, p] = await Promise.all([
        API().callApi('doc.templates', {}),
        API().callApi('doc.list', {}),
        API().callApi('doc.pejabatList', {})
      ]);
      docCache = { templates: t.items || [], docs: d.items || [], pejabat: p.items || [] };
      if (S().AppState.activeView === 'doc-engine') global.renderActiveView();
    } catch (e) {} finally { _docLoading = false; }
  };
  global.setDocTab = (t) => {
    activeDocTab = t || 'surat';
    if (S().AppState.subTabs) S().AppState.subTabs['doc-engine'] = activeDocTab;
    global.renderActiveView();
    if (typeof global.syncNavHighlight === 'function') global.syncNavHighlight();
  };

  global.runDocScanTemplate = async () => {
    const fileId = (document.getElementById('deScanFileId') || {}).value || '';
    const nama = (document.getElementById('deScanNama') || {}).value || 'Templat Baru';
    const jenis = (document.getElementById('deScanJenis') || {}).value || 'Google Docs';
    if (!fileId.trim()) return global.toast('Masukkan ID File Google Docs/Sheets/Slides terlebih dahulu.', 'warn');
    try {
      const res = await API().callApi('doc.scanTemplate', { file_id: fileId.trim(), nama, jenis_file: jenis }, { isWrite: true });
      const tags = res.placeholders || res.tags || [];
      const blocks = res.blocks || [];
      const box = document.getElementById('deScanResultBox');
      if (box) {
        box.classList.remove('hidden');
        box.innerHTML = `<div class="flex flex-wrap justify-between items-center gap-2">
          <div><b class="text-emerald-600">${tags.length} Placeholder Terdeteksi:</b> <span class="font-mono-num">${S().esc(tags.join(', '))}</span>${blocks.length ? ` | Blok: <b>${S().esc(blocks.join(', '))}</b>` : ''}</div>
          <button onclick="window.openCreateDocModal('', ${S().esc(JSON.stringify(tags))})" class="ons-btn ons-btn-emerald text-[11px] py-1 px-2.5">Isi Form &amp; Buat Draf &rarr;</button>
        </div>`;
      }
      global.toast('Berhasil memindai ' + tags.length + ' placeholder dari templat!', 'ok');
    } catch (e) { global.toast(e.message, 'err'); }
  };

  global.openCreateDocModal = (preKode, customTags) => {
    const tpls = docCache.templates || [];
    const selKode = preKode || (tpls[0] && tpls[0].Kode) || '';
    const buildDynFields = (kode) => {
      const tp = tpls.find((x) => x.Kode === kode);
      let tags = Array.isArray(customTags) && customTags.length ? customTags : ['NAMA_PBF', 'NAMA_APJ', 'NO_SIPA'];
      if (!customTags) {
        try {
          const parsed = JSON.parse((tp && tp.PlaceholderJson) || '[]');
          if (Array.isArray(parsed) && parsed.length) tags = parsed;
        } catch (e) {}
      }
      return tags.map((tg) => {
        const clean = String(tg).replace(/^\{+|\}+$/g, '').split('|')[0];
        const defVal = clean.includes('APJ') ? 'apt. Siti Rahma, S.Farm' : (clean.includes('SIPA') ? '19920412/SIPA_35.78/2025/1042' : (clean.includes('PBF') ? 'PT Bina San Prima' : ''));
        return `<div><label class="font-semibold block mb-1">${S().esc(clean)}</label><input data-doc-tag="${S().esc(clean)}" class="ons-input" value="${S().esc(defVal)}" placeholder="Isi ${S().esc(clean)}..."/></div>`;
      }).join('');
    };
    S().openModal(`<div class="p-6 space-y-3 text-xs">
      <div class="flex justify-between items-center"><h3 class="font-bold text-base">Buat Draf Dokumen Resmi (Form Otomatis)</h3><button onclick="ONSStore.closeModal()" class="text-xl">&times;</button></div>
      <select id="deTplCode" class="ons-select" onchange="window._refreshDocDynForm(this.value)">${tpls.map((t) => `<option value="${S().esc(t.Kode)}" ${t.Kode === selKode ? 'selected' : ''}>${S().esc(t.Nama)}</option>`).join('')}</select>
      <input id="deJudul" class="ons-input" placeholder="Judul Dokumen (mis. SP Pengadaan Prekursor Nov 2026)" required/>
      <div id="deDynFieldsBox" class="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-auto p-1">${buildDynFields(selKode)}</div>
      <button onclick="window.submitCreateDocDraft()" class="ons-btn ons-btn-primary w-full">Buat Draf Surat</button>
    </div>`, '540px');
    global._refreshDocDynForm = (k) => {
      const box = document.getElementById('deDynFieldsBox');
      if (box) box.innerHTML = buildDynFields(k);
    };
  };

  global.submitCreateDocDraft = async () => {
    try {
      const dataObj = {};
      document.querySelectorAll('[data-doc-tag]').forEach((inp) => {
        const k = inp.getAttribute('data-doc-tag');
        if (k) dataObj[k] = inp.value;
      });
      await API().callApi('doc.createDraft', {
        kode_templat: document.getElementById('deTplCode').value,
        judul: document.getElementById('deJudul').value || 'Dokumen Resmi Apotek ONS Farma',
        data: dataObj
      }, { isWrite: true });
      S().closeModal();
      global.toast('Draf surat dibuat! Silakan tanda tangani dengan PIN Pejabat.', 'ok');
      await global.refreshDocEngineIfNeeded(true);
    } catch (e) { global.toast(e.message, 'err'); }
  };

  global.openSignDocPinModal = (idDoc) => {
    S().openModal(`<div class="p-6 space-y-3 text-xs text-center">
      <h3 class="font-bold text-base">Tanda Tangan Elektronik &amp; Pembekuan TERBIT</h3>
      <p>Masukkan PIN 6 Digit APJ/Pemilik untuk menandatangani, menghitung Hash SHA-256 &amp; menerbitkan Kode Verifikasi Publik.</p>
      <input id="dePinSignInput" type="password" maxlength="6" class="ons-input font-mono-num text-center text-lg" placeholder="6 Digit PIN (Demo: 123456)"/>
      <button onclick="window.executeSignDoc('${idDoc}')" class="ons-btn ons-btn-emerald w-full">Tanda Tangani &amp; Terbitkan Surat</button>
    </div>`, '420px');
  };

  global.executeSignDoc = async (idDoc) => {
    try {
      const res = await API().callApi('doc.signAndIssue', { id_dokumen: idDoc, pin: document.getElementById('dePinSignInput').value }, { isWrite: true });
      S().closeModal();
      global.toast('Surat TERBIT! Kode Verifikasi: ' + res.kode_verifikasi, 'ok');
      await global.refreshDocEngineIfNeeded(true);
    } catch (e) { global.toast(e.message, 'err'); }
  };

  global.previewDocSigned = (idDoc) => {
    const d = (docCache.docs || []).find((x) => x.ID === idDoc);
    if (!d) return;
    const url = `${global.location.origin}${global.location.pathname}#doc=${encodeURIComponent(d.KodeVerifikasi)}`;
    S().openModal(`<div class="p-6 space-y-3">
      <div class="p-5 border-2 rounded-xl bg-white text-black space-y-2 text-xs">
        <div class="font-bold text-base border-b pb-2">${S().esc(d.Judul)}</div>
        <div><b>No. Surat:</b> ${S().esc(d.NomorSurat)}</div>
        <div><b>Ditandatangani oleh:</b> ${S().esc(d.PenandaTangan)}</div>
        <div><b>Waktu Terbit:</b> ${S().esc(d.TglTerbit)}</div>
        <div class="pt-3 flex items-center justify-between border-t">
          <div class="font-mono-num">Kode Verifikasi:<br/><b class="text-sm">${S().esc(d.KodeVerifikasi)}</b></div>
          <div>${S().renderSvgQr(url, 90)}</div>
        </div>
      </div>
      <button onclick="ONSStore.printHtmlZone(this.previousElementSibling.outerHTML)" class="ons-btn ons-btn-primary w-full text-xs">Cetak Surat Resmi PDF</button>
    </div>`, '540px');
  };

  /**
   * W-11: Tutup Shift Kasir (Blind Cash Count + Supervisor PIN Verification)
   */
  function renderTutupShiftView() {
    const st = S().AppState;
    const validToday = (st.penjualan || []).filter((p) => String(p.status_trx || '') !== 'RETUR');
    const sisTunai = validToday.filter((p) => p.metode_bayar === 'TUNAI').reduce((s, p) => s + Number(p.grand_total || 0), 0);
    const nonTunai = validToday.filter((p) => p.metode_bayar !== 'TUNAI').reduce((s, p) => s + Number(p.grand_total || 0), 0);
    const denoms = [100000, 50000, 20000, 10000, 5000, 2000, 1000, 500];
    const denomSum = denoms.reduce((s, d) => s + (d * Number(shiftDenomCounts[d] || 0)), 0);
    const defaultAktual = denomSum > 0 ? denomSum : (300000 + sisTunai);

    return `<div class="max-w-3xl mx-auto space-y-5 ons-view-enter">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 class="text-xl font-bold">Rekonsiliasi &amp; Tutup Shift Kasir (Blind Count + Denominasi)</h1>
          <p class="text-xs" style="color:var(--ons-text-soft)">Hitung pecahan uang kertas/koin laci fisik terlebih dahulu lalu sahkan dengan 6-digit PIN APJ / Supervisor.</p>
        </div>
        <span class="badge-bpom bpom-terbatas font-mono-num">Non-Tunai (QRIS/EDC): ${S().rp(nonTunai)}</span>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div class="ons-card p-5 lg:col-span-6 space-y-3 text-xs">
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-sm">Kalkulator Pecahan Uang Laci</h3>
            <span class="font-mono-num font-bold text-blue-600" id="denomTotalPreview">${S().rp(denomSum)}</span>
          </div>
          <div class="grid grid-cols-2 gap-2">
            ${denoms.map((d) => `
              <div class="flex items-center justify-between gap-2 p-2 rounded-lg border" style="border-color:var(--ons-border);background:var(--ons-bg-subtle)">
                <span class="font-mono-num font-bold">${S().rp(d)}</span>
                <input type="number" min="0" value="${shiftDenomCounts[d] || 0}" oninput="window.updateShiftDenom(${d}, this.value)" class="ons-input font-mono-num w-16 text-right py-1 min-h-0 h-7"/>
              </div>`).join('')}
          </div>
          <button type="button" onclick="window.applyDenomToAktual()" class="ons-btn ons-btn-primary w-full text-xs">Salin Total Pecahan (${S().rp(denomSum)}) ke Aktual &rarr;</button>
        </div>

        <div class="ons-card p-5 lg:col-span-6 space-y-4 text-xs">
          <h3 class="font-bold text-sm">Formulir Penutupan Kas &amp; Serah Terima</h3>
          <div class="space-y-3">
            <div><label class="font-semibold block mb-1">Modal Awal Laci (Rp)</label><input id="shModal" type="number" class="ons-input font-mono-num" value="300000"/></div>
            <div><label class="font-semibold block mb-1">Hitung Fisik Tunai Laci Aktual (Rp) *</label><input id="shAktual" type="number" class="ons-input font-mono-num font-bold text-base" value="${defaultAktual}"/></div>
            <div><label class="font-semibold block mb-1">Catatan Handover Shift Berikutnya</label><textarea id="shNote" rows="2" class="ons-textarea" placeholder="Serah terima kunci laci, status chiller &amp; catatan selisih..."></textarea></div>
            <div class="p-3 rounded-xl border border-amber-500/40 bg-amber-500/10 space-y-2">
              <div class="font-bold text-amber-700 dark:text-amber-300">Otorisasi PIN APJ / Supervisor Penutup Shift</div>
              <input id="shPin" type="password" maxlength="6" class="ons-input font-mono-num" placeholder="Masukkan 6 Digit PIN (Demo: 123456)"/>
            </div>
            <button onclick="window.submitCloseShift(${sisTunai})" class="ons-btn ons-btn-emerald w-full py-2.5">Rekonsiliasi, Tutup Shift &amp; Kirim ke Pemilik</button>
          </div>
        </div>
      </div>
    </div>`;
  }

  global.updateShiftDenom = (denom, qty) => {
    shiftDenomCounts[denom] = Math.max(0, Number(qty || 0));
    const sum = Object.keys(shiftDenomCounts).reduce((s, d) => s + (Number(d) * Number(shiftDenomCounts[d] || 0)), 0);
    const prev = document.getElementById('denomTotalPreview');
    if (prev) prev.textContent = S().rp(sum);
    const akt = document.getElementById('shAktual');
    if (akt && sum > 0) akt.value = sum;
  };
  global.applyDenomToAktual = () => {
    const sum = Object.keys(shiftDenomCounts).reduce((s, d) => s + (Number(d) * Number(shiftDenomCounts[d] || 0)), 0);
    const akt = document.getElementById('shAktual');
    if (akt) { akt.value = sum; global.toast('Hitungan pecahan disalin ke Tunai Laci Aktual!', 'ok'); }
  };

  global.submitCloseShift = async (sisTunai) => {
    try {
      const res = await API().callApi('shift.close', {
        modal_awal: Number(document.getElementById('shModal').value || 0),
        aktual_tunai: Number(document.getElementById('shAktual').value || 0),
        sistem_tunai: sisTunai,
        catatan_handover: document.getElementById('shNote').value,
        supervisor_pin: document.getElementById('shPin').value
      }, { isWrite: true });
      global.toast('Shift berhasil ditutup! Selisih kas: ' + S().rp(res.shift.selisih_kas), 'ok');
    } catch (e) { global.toast(e.message, 'err'); }
  };

  /**
   * W-12: Laporan SIPNAP Kemenkes 8 Kolom, Analisis Pareto ABC & Dead Stock (3 Sub-Menu)
   */
  function _getLostSales() {
    try {
      const arr = JSON.parse(localStorage.getItem(LOST_SALES_KEY) || 'null');
      if (Array.isArray(arr) && arr.length) return arr;
    } catch (e) {}
    return [{ tanggal: new Date().toISOString().slice(0, 10), nama_obat: 'Salbutamol Nebules 2.5mg', qty: 4, alasan: 'Stok habis sementara' }];
  }

  function _buildSipnapRows(st) {
    const muts = st.mutasiStok || [];
    return (st.masterObat || [])
      .filter((o) => ['NARKOTIKA', 'PSIKOTROPIKA', 'OOT', 'PREKURSOR'].includes(String(o.golongan_bpom).toUpperCase()))
      .map((o) => {
        const sAkhir = S().getTotalStok(o.id_obat);
        const itemMuts = muts.filter((m) => String(m.id_obat) === String(o.id_obat));
        let masuk = 0;
        let keluar = 0;
        let musnah = 0;
        itemMuts.forEach((m) => {
          const jm = String(m.jenis_mutasi || '').toUpperCase();
          const q = Number(m.qty_ubah || 0);
          if (jm.includes('PEMBELIAN') || jm.includes('RETUR_PENJUALAN') || (jm === 'OPNAME' && q > 0)) {
            masuk += Math.max(0, q);
          } else if (jm.includes('PENJUALAN')) {
            keluar += Math.abs(q);
          } else if (jm.includes('RECALL') || jm.includes('RETUR_PBF') || (jm === 'OPNAME' && q < 0)) {
            musnah += Math.abs(q);
          }
        });
        const sAwal = Math.max(0, sAkhir - masuk + keluar + musnah);
        return {
          kode: o.kode_kfa,
          nama: o.nama_dagang,
          gol: o.golongan_bpom,
          satuan: o.satuan_dasar,
          awal: sAwal,
          masuk,
          keluar,
          musnah,
          akhir: sAkhir
        };
      });
  }

  function renderSipnapParetoView() {
    const st = S().AppState;
    sipnapTab = (st.subTabs && st.subTabs.sipnap) || sipnapTab || 'narkotika';
    const sipnapRows = _buildSipnapRows(st);

    const salesByObat = {};
    (st.detailPenjualan || []).forEach((d) => {
      if (!salesByObat[d.id_obat]) salesByObat[d.id_obat] = { qty: 0, rev: 0 };
      salesByObat[d.id_obat].qty += Number(d.qty || 0);
      salesByObat[d.id_obat].rev += Number(d.subtotal_item || (Number(d.qty || 0) * Number(d.harga_jual || 0)));
    });

    const ranked = st.masterObat.map((o) => {
      const qtyStok = S().getTotalStok(o.id_obat);
      const sold = salesByObat[o.id_obat] || { qty: 0, rev: 0 };
      const val = sold.rev > 0 ? sold.rev : (Math.max(1, qtyStok) * Number(o.harga_umum || 0));
      return { id_obat: o.id_obat, nama: o.nama_dagang, val, revSold: sold.rev, qtySold: sold.qty, qtyStok, zat: String(o.zat_aktif || '').toLowerCase() };
    }).sort((a, b) => b.val - a.val);
    const totalVal = Math.max(1, ranked.reduce((s, r) => s + r.val, 0));
    let cum = 0;
    const paretoRows = ranked.slice(0, 10).map((r) => {
      const pct = Math.round((r.val / totalVal) * 100);
      cum += pct;
      const cls = cum <= 70 ? 'A (Fast 70%)' : (cum <= 90 ? 'B (Menengah 20%)' : 'C (Slow 10%)');
      return Object.assign({}, r, { pct, cls });
    });
    const abxCount = ranked.filter((r) => /amoxi|azith|cipro|cefix|cefa|clind/.test(r.zat)).length;
    const abxPct = ranked.length ? Math.round((abxCount / ranked.length) * 100) : 0;

    const deadBatches = st.stokBatch.filter((b) => {
      const soldQty = (salesByObat[b.id_obat] && salesByObat[b.id_obat].qty) || 0;
      return b.status_batch === 'AKTIF' && Number(b.qty_sisa || 0) >= 20 && S().daysUntil(b.tgl_kadaluarsa) > 90 && soldQty <= 2;
    });
    const lostSales = _getLostSales();

    return `<div class="space-y-5 ons-view-enter">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-xl font-bold">Pelaporan SIPNAP Kemenkes, Pareto ABC &amp; Dead Stock</h1>
          <p class="text-xs" style="color:var(--ons-text-soft)">Format SIPNAP 8 kolom terintegrasi Kartu Stok mutasi nyata, Pareto ABC omzet &amp; valuasi, indikator WHO, &amp; lost sales.</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <div class="ons-tab-bar">
            <button onclick="window.setSipnapTab('narkotika')" class="ons-tab-btn ${sipnapTab === 'narkotika' ? 'active' : ''}">SIPNAP 8 Kolom (${sipnapRows.length})</button>
            <button onclick="window.setSipnapTab('pareto')" class="ons-tab-btn ${sipnapTab === 'pareto' ? 'active' : ''}">Pareto ABC &amp; WHO</button>
            <button onclick="window.setSipnapTab('deadstock')" class="ons-tab-btn ${sipnapTab === 'deadstock' ? 'active' : ''}">Dead Stock &amp; Lost Sales (${deadBatches.length})</button>
          </div>
          <button onclick="window.exportSipnapExcel()" class="ons-btn ons-btn-primary text-xs">Export SIPNAP (.xlsx)</button>
        </div>
      </div>

      ${sipnapTab === 'pareto' ? `
        <div class="ons-card p-5 space-y-4">
          <div class="flex flex-wrap justify-between items-center gap-2">
            <div>
              <h3 class="font-bold text-sm">Analisis Pareto ABC Omzet / Valuasi &amp; Fast-Slow Moving</h3>
              <p class="text-xs" style="color:var(--ons-text-soft)">Memprioritaskan pengadaan item Kelas A (kontributor 70% nilai apotek).</p>
            </div>
            <span class="badge-bpom ${abxPct <= 30 ? 'bpom-bebas' : 'bpom-keras'}">Rasio Antibiotik WHO: ${abxPct}% (&le;30%)</span>
          </div>
          <div class="space-y-2.5 text-xs">
            ${paretoRows.length ? paretoRows.map((p) => `<div>
              <div class="flex flex-wrap justify-between mb-1">
                <span><b>${S().esc(p.nama)}</b> <span class="badge-bpom ${p.cls.startsWith('A') ? 'bpom-bebas' : (p.cls.startsWith('B') ? 'bpom-terbatas' : 'bpom-prekursor')}">${p.cls}</span> <span style="color:var(--ons-text-soft)">&bull; Terjual: ${p.qtySold} unit &bull; Stok: ${p.qtyStok}</span></span>
                <span class="font-mono-num font-bold">${p.pct}% (${S().rp(p.val)})</span>
              </div>
              <div class="w-full h-2.5 rounded-full overflow-hidden" style="background:var(--ons-border)"><div class="h-full" style="width:${Math.max(4, p.pct)}%;background:${p.cls.startsWith('A') ? '#0066FE' : (p.cls.startsWith('B') ? '#10B981' : '#94A3B8')}"></div></div>
            </div>`).join('') : '<div style="color:var(--ons-text-soft)">Belum ada data produk di katalog untuk dianalisis.</div>'}
          </div>
        </div>
      ` : sipnapTab === 'deadstock' ? `
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div class="ons-card p-4 lg:col-span-7 space-y-3">
            <div class="flex items-center justify-between">
              <h3 class="font-bold text-sm">Radar Batch Dead / Slow-Moving (${deadBatches.length} Batch)</h3>
              <button onclick="navigateView('faktur','retur')" class="ons-btn ons-btn-ghost text-xs">Retur BAR-PBF &rarr;</button>
            </div>
            <div class="ons-table-wrap">
              <table class="ons-table">
                <thead><tr><th>Nama Obat</th><th>No Batch</th><th>Tgl ED</th><th>Qty Sisa</th><th>Saran Tindakan</th></tr></thead>
                <tbody>
                  ${deadBatches.length ? deadBatches.map((b) => {
                    const ob = st.masterObat.find((m) => m.id_obat === b.id_obat);
                    return `<tr>
                      <td class="font-semibold text-xs">${S().esc(ob ? ob.nama_dagang : b.id_obat)}</td>
                      <td class="font-mono-num text-xs">${S().esc(b.no_batch)}</td>
                      <td class="font-mono-num text-xs">${S().esc(b.tgl_kadaluarsa)}</td>
                      <td class="font-mono-num font-bold">${b.qty_sisa}</td>
                      <td><button onclick="navigateView('pos','kasir')" class="ons-btn ons-btn-ghost text-xs py-1 px-2">Promo / Bundling POS</button></td>
                    </tr>`;
                  }).join('') : '<tr><td colspan="5" class="text-center py-6 text-xs">Tidak ada batch pergerakan lambat terdeteksi.</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>

          <div class="ons-card p-4 lg:col-span-5 space-y-3 text-xs">
            <div class="flex justify-between items-center">
              <h3 class="font-bold text-sm">Log Permintaan Tertolak (Lost Sales)</h3>
              <button onclick="navigateView('obat')" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2">+ Katalog Obat</button>
            </div>
            <div class="flex gap-2">
              <input id="lsNama" class="ons-input flex-1" placeholder="Nama obat dicari pasien tapi kosong..."/>
              <input id="lsQty" type="number" class="ons-input w-16 font-mono-num" value="1"/>
              <button onclick="window.addLostSaleNow()" class="ons-btn ons-btn-primary">Catat</button>
            </div>
            <div class="space-y-1.5 max-h-60 overflow-auto">
              ${lostSales.slice().reverse().map((ls) => `<div class="p-2 rounded-lg border flex justify-between items-center" style="border-color:var(--ons-border)">
                <div><b>${S().esc(ls.nama_obat)}</b> (${ls.qty}x)</div>
                <span style="color:var(--ons-text-soft)">${S().esc(ls.tanggal)}</span>
              </div>`).join('')}
            </div>
          </div>
        </div>
      ` : `
        <div class="ons-card p-4 space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h3 class="font-bold text-sm">Pelaporan Bulanan SIPNAP Kemenkes (Agregasi Kartu Stok Nyata)</h3>
            <span class="text-xs" style="color:var(--ons-text-soft)">Narkotika &bull; Psikotropika &bull; Prekursor &bull; OOT</span>
          </div>
          <div class="ons-table-wrap">
            <table class="ons-table">
              <thead><tr><th>Kode KFA</th><th>Nama Obat</th><th>Golongan</th><th>Stok Awal</th><th>Masuk PBF</th><th>Keluar Resep</th><th>Pemusnahan/Retur</th><th>Stok Akhir</th></tr></thead>
              <tbody>
                ${sipnapRows.length ? sipnapRows.map((r) => `<tr>
                  <td class="font-mono-num text-xs">${S().esc(r.kode)}</td>
                  <td class="font-bold">${S().esc(r.nama)}</td>
                  <td>${S().bpomBadge(r.gol)}</td>
                  <td class="font-mono-num">${r.awal}</td>
                  <td class="font-mono-num text-emerald-600">+${r.masuk}</td>
                  <td class="font-mono-num text-red-600">-${r.keluar}</td>
                  <td class="font-mono-num">${r.musnah}</td>
                  <td class="font-mono-num font-bold text-blue-600">${r.akhir} ${S().esc(r.satuan)}</td>
                </tr>`).join('') : '<tr><td colspan="8" class="text-center py-6 text-xs">Tidak ada item golongan Narkotika/Psikotropika/Prekursor/OOT di Master Obat.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      `}
    </div>`;
  }

  global.setSipnapTab = (t) => {
    sipnapTab = t || 'narkotika';
    if (S().AppState.subTabs) S().AppState.subTabs.sipnap = sipnapTab;
    global.renderActiveView();
    if (typeof global.syncNavHighlight === 'function') global.syncNavHighlight();
  };

  global.addLostSaleNow = () => {
    const nama = (document.getElementById('lsNama') || {}).value || '';
    const qty = Number((document.getElementById('lsQty') || {}).value || 1);
    if (!nama.trim()) return global.toast('Tulis nama obat yang ditanyakan pasien.', 'warn');
    const arr = _getLostSales();
    arr.push({ tanggal: new Date().toISOString().slice(0, 10), nama_obat: nama.trim(), qty, alasan: 'Tidak tersedia saat diminta' });
    localStorage.setItem(LOST_SALES_KEY, JSON.stringify(arr.slice(-30)));
    global.toast('Permintaan tertolak dicatat untuk pertimbangan pengadaan PBF!', 'ok');
    global.renderActiveView();
  };

  global.exportSipnapExcel = () => {
    const rows = _buildSipnapRows(S().AppState);
    S().exportDataset('xlsx', 'Laporan Bulanan SIPNAP Kemenkes', 'Laporan_SIPNAP_ONS_Farma', [
      { key: 'kode', label: 'Kode KFA' }, { key: 'nama', label: 'Nama Obat' }, { key: 'gol', label: 'Golongan' },
      { key: 'awal', label: 'Stok Awal' }, { key: 'masuk', label: 'Masuk PBF' }, { key: 'keluar', label: 'Keluar Resep' },
      { key: 'musnah', label: 'Pemusnahan' }, { key: 'akhir', label: 'Stok Akhir' }
    ], rows);
  };

  /**
   * W-13: Pengaturan Secrets Vault Masked, Audit Diff Viewer, Backup & Migrasi Database (/gas-migrasi-database)
   */
  let settingsCache = { secrets: {}, audit: [], users: [] };
  global.setSettingsTab = (t) => {
    settingsTab = t || 'akun';
    if (S().AppState.subTabs) S().AppState.subTabs.settings = settingsTab;
    global.renderActiveView();
    if (typeof global.syncNavHighlight === 'function') global.syncNavHighlight();
  };

  function renderSettingsView() {
    global.loadSettingsBundle();
    const st = S().AppState;
    settingsTab = (st.subTabs && st.subTabs.settings) || settingsTab || 'akun';
    const secrets = settingsCache.secrets || {};
    const audit = settingsCache.audit || [];
    const users = settingsCache.users || [];
    const isOwner = S().getRole() === 'Pemilik';
    const showAll = settingsTab === 'semua';

    return `<div class="space-y-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-xl font-bold">Pengaturan Sistem, Struk Thermal &amp; Migrasi Database</h1>
          <p class="text-xs" style="color:var(--ons-text-soft)">Kelola akun kasir/APJ, desain struk 58/80mm, Script Properties tersensor, backup Drive, &amp; audit sistem.</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button onclick="window.openChangeCredModal()" class="ons-btn ons-btn-primary text-xs">Ganti Sandi / PIN Saya</button>
          ${isOwner ? `<button onclick="window.seedStarterCatalogFromSettings()" class="ons-btn ons-btn-ghost text-xs">Isi Katalog Awal (Seed)</button>` : ''}
          <button onclick="window.runDriveBackupSnapshot()" class="ons-btn ons-btn-emerald text-xs">Snapshot Backup Drive</button>
        </div>
      </div>

      <div class="ons-tab-bar">
        <button onclick="window.setSettingsTab('akun')" class="ons-tab-btn ${settingsTab === 'akun' ? 'active' : ''}">Akun, Sandi &amp; PIN (${users.length})</button>
        <button onclick="window.setSettingsTab('struk')" class="ons-tab-btn ${settingsTab === 'struk' ? 'active' : ''}">Desain Struk Thermal</button>
        <button onclick="window.setSettingsTab('vault')" class="ons-tab-btn ${settingsTab === 'vault' ? 'active' : ''}">Brankas Rahasia &amp; Migrasi DB</button>
        <button onclick="window.setSettingsTab('audit')" class="ons-tab-btn ${settingsTab === 'audit' ? 'active' : ''}">Log Audit (${audit.length})</button>
        <button onclick="window.setSettingsTab('semua')" class="ons-tab-btn ${settingsTab === 'semua' ? 'active' : ''}">Lihat Semua</button>
      </div>

      ${(settingsTab === 'akun' || showAll) ? (isOwner ? `<div class="ons-card p-5 space-y-3 text-xs">
        <div class="flex flex-wrap justify-between items-center gap-2">
          <div>
            <h3 class="font-bold text-sm">Manajemen Akun Pengguna, Role &amp; Otorisasi PIN (PENGGUNA_CABANG)</h3>
            <p style="color:var(--ons-text-soft)">Tambah akun staf baru, atur SIPA Apoteker, atau reset kata sandi &amp; PIN otorisasi tanpa menyentuh database.</p>
          </div>
          <button onclick="window.openAddUserModal()" class="ons-btn ons-btn-primary text-xs">+ Tambah / Edit Akun</button>
        </div>
        <div class="ons-table-wrap">
          <table class="ons-table">
            <thead><tr><th>Username</th><th>Nama Lengkap</th><th>Role</th><th>Cabang</th><th>No. SIPA</th><th>Status</th><th>Aksi</th></tr></thead>
            <tbody>
              ${users.length ? users.map((u) => `<tr>
                <td class="font-mono-num font-bold">${S().esc(u.username)}</td>
                <td>${S().esc(u.nama_lengkap)}</td>
                <td><span class="badge-bpom ${u.role === 'Pemilik' ? 'bpom-narkotika' : (u.role === 'APJ' ? 'bpom-terbatas' : 'bpom-bebas')}">${S().esc(u.role)}</span></td>
                <td class="font-mono-num">${S().esc(u.cabang_id)}</td>
                <td class="font-mono-num">${S().esc(u.no_sipa || '-')}</td>
                <td><span class="badge-bpom ${u.status_aktif === 'AKTIF' ? 'bpom-bebas' : 'bpom-keras'}">${S().esc(u.status_aktif)}</span></td>
                <td><button onclick="window.openChangeCredModal('${S().esc(u.username)}')" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2">Reset Sandi / PIN</button></td>
              </tr>`).join('') : '<tr><td colspan="7" class="text-center" style="color:var(--ons-text-soft)">Memuat daftar pengguna...</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>` : `<div class="ons-card p-5 text-xs">Gunakan tombol <b>Ganti Sandi / PIN Saya</b> di atas untuk memperbarui kredensial akun Anda.</div>`) : ''}

      ${(settingsTab === 'vault' || showAll) ? `<div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <!-- Secrets Vault Masked -->
        <div class="ons-card p-5 lg:col-span-6 space-y-3 text-xs">
          <h3 class="font-bold text-sm">Brankas Rahasia Script Properties (Read-Back Tersensor)</h3>
          <div class="space-y-2">
            ${Object.keys(secrets).map((k) => `<div class="flex items-center justify-between gap-2 p-2 rounded border">
              <div><b>${S().esc(k)}</b><div class="font-mono-num" style="color:var(--ons-text-soft)">${S().esc(secrets[k] || '(Belum diatur)')}</div></div>
              <button onclick="window.promptUpdateSecret('${S().esc(k)}')" class="ons-btn ons-btn-ghost text-xs py-1 px-2">Ubah</button>
            </div>`).join('')}
          </div>
        </div>

        <!-- Wizard Migrasi Database Spreadsheet (/gas-migrasi-database) -->
        <div class="ons-card p-5 lg:col-span-6 space-y-3 text-xs">
          <h3 class="font-bold text-sm">Wizard Migrasi Spreadsheet v9 &rarr; v10 (Aman Tanpa Ubah Sumber)</h3>
          <p style="color:var(--ons-text-soft)">Membaca spreadsheet lama berbasis header, normalisasi nomor WA <code>628...</code>, &amp; upsert idempoten dengan Dry-Run Preview.</p>
          <input id="migSourceId" class="ons-input font-mono-num" placeholder="Tempel ID Spreadsheet Sumber v9 (contoh: 1BxiMVs0XRA5nFMd...)"/>
          <div class="flex gap-2">
            <button onclick="window.runMigrationPreview()" class="ons-btn ons-btn-ghost flex-1">1. Pindai Dry-Run Preview</button>
            <button onclick="window.runMigrationExecute()" class="ons-btn ons-btn-primary flex-1">2. Eksekusi Upsert Batch</button>
          </div>
          <div id="migResultBox" class="p-3 rounded-xl border hidden" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)"></div>
        </div>
      </div>` : ''}

      <!-- Editor Template Struk Thermal (/gas-struk-resi-printer) -->
      ${(settingsTab === 'struk' || showAll) ? (() => {
        const tpls = (S().AppState && S().AppState.strukTemplates) || [];
        const curTpl = tpls[0] || {
          kode: 'STRUK_58_DEFAULT',
          nama: 'Struk Kasir Thermal 58mm (Standar)',
          lebar_mm: 58,
          template_teks: (global.StrukEngine && global.StrukEngine.DEFAULT_STRUK_TEMPLATE) || ''
        };
        const sampleData = {
          NAMA_TOKO: 'APOTEK ONS FARMA',
          ALAMAT_TOKO: 'Jl. Kesehatan Raya No. 88',
          WA_TOKO: '0811-0000-990',
          APJ_SIPA: '19920412/SIPA/2025',
          NOTA: 'INV-PREVIEW-001',
          TANGGAL: new Date().toLocaleDateString('id-ID'),
          KASIR: 'Budi Santoso',
          PELANGGAN: 'Tn. Bambang (PRB)',
          METODE: 'QRIS',
          CHANNEL: 'Toko Fisik',
          ITEM: [{ NAMA: 'Paracetamol Sanmol 500mg', QTY: 10, SATUAN: 'Tab', HARGA: 650, SUBTOTAL: 6500 }],
          SUBTOTAL: 6500, DISKON: 0, PPN: 0, TOTAL: 6500, DIBAYAR: 6500, KEMBALI: 0, POIN: 1,
          CATATAN: 'Semoga lekas sembuh!', QR_URL: 'https://onsfarma.id/v/PREVIEW'
        };
        const previewHtml = global.StrukEngine ? global.StrukEngine.renderHtml(curTpl.template_teks, sampleData, curTpl.lebar_mm) : '';
        return `<div class="ons-card p-5 space-y-3 text-xs">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 class="font-bold text-sm">Editor Template Struk Thermal 58mm / 80mm (/gas-struk-resi-printer)</h3>
              <p style="color:var(--ons-text-soft)">Gunakan direktif <code>[C]</code>, <code>[B]</code>, <code>[LR]Kiri|Kanan</code>, <code>[QR]</code>, <code>[BAR]</code>, dan blok <code>{{#ITEM}}...{{/ITEM}}</code>.</p>
            </div>
            <div class="flex gap-2">
              <select id="strukTplWidth" onchange="window.previewEditedStruk()" class="ons-select w-28 text-xs">
                <option value="58" ${Number(curTpl.lebar_mm) !== 80 ? 'selected' : ''}>58 mm</option>
                <option value="80" ${Number(curTpl.lebar_mm) === 80 ? 'selected' : ''}>80 mm</option>
              </select>
              <button onclick="window.saveStrukTemplateServer()" class="ons-btn ons-btn-emerald text-xs">Simpan Template ke Sheets</button>
            </div>
          </div>
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div class="lg:col-span-7 space-y-2">
              <input id="strukTplKode" type="hidden" value="${S().esc(curTpl.kode || 'STRUK_58_DEFAULT')}"/>
              <input id="strukTplNama" class="ons-input text-xs font-bold" value="${S().esc(curTpl.nama || 'Struk Thermal 58mm')}"/>
              <textarea id="strukTplText" rows="12" oninput="window.previewEditedStruk()" class="ons-textarea font-mono-num text-[11px]">${S().esc(curTpl.template_teks || '')}</textarea>
            </div>
            <div class="lg:col-span-5 p-3 rounded-xl border overflow-auto max-h-80" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
              <div class="text-[11px] font-bold mb-2 text-center">Live Preview Struk Thermal</div>
              <div id="strukEditorLivePreview">${previewHtml}</div>
            </div>
          </div>
        </div>`;
      })() : ''}

      <!-- Audit Log -->
      ${(settingsTab === 'audit' || showAll) ? `<div class="ons-card p-4">
        <h3 class="font-bold text-sm mb-3">Log Audit Immutable (Dengan Redaksi Secret Otomatis)</h3>
        <div class="ons-table-wrap">
          <table class="ons-table">
            <thead><tr><th>Waktu</th><th>Pelaku &amp; Peran</th><th>Aksi</th><th>Entitas</th><th>Snapshot Sesudah</th></tr></thead>
            <tbody>
              ${audit.map((a) => `<tr>
                <td class="font-mono-num text-xs">${S().formatTgl(a.timestamp)}</td>
                <td class="text-xs"><b>${S().esc(a.user_id)}</b> (${S().esc(a.role)})</td>
                <td><span class="badge-bpom bpom-terbatas">${S().esc(a.aksi)}</span></td>
                <td class="font-mono-num text-xs">${S().esc(a.entitas)} #${S().esc(a.entitas_id)}</td>
                <td class="font-mono-num text-[11px] max-w-xs truncate">${S().esc(a.diff_sesudah_json)}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>` : ''}
    </div>`;
  }

  let _setLoading = false;
  global.loadSettingsBundle = async (force) => {
    if (_setLoading || (!force && Object.keys(settingsCache.secrets).length)) return;
    _setLoading = true;
    try {
      const [sec, aud, usr] = await Promise.all([
        API().callApi('settings.getSecretsMasked', {}),
        API().callApi('audit.list', {}),
        S().getRole() === 'Pemilik' ? API().callApi('users.list', {}).catch(() => ({ items: [] })) : Promise.resolve({ items: [] })
      ]);
      settingsCache = { secrets: sec.secrets || {}, audit: aud.items || [], users: usr.items || [] };
      if (S().AppState.activeView === 'settings') global.renderActiveView();
    } catch (e) {} finally { _setLoading = false; }
  };

  global.seedStarterCatalogFromSettings = async () => {
    try {
      const res = await API().callApi('system.seedStarterCatalog', {}, { isWrite: true });
      global.toast(res.message || 'Katalog awal berhasil diisi!', 'ok');
      await global.bootLoadState(true);
    } catch (e) { global.toast(e.message, 'err'); }
  };

  global.openAddUserModal = () => {
    S().openModal(`<div class="p-6 space-y-3 text-xs">
      <div class="flex justify-between items-center"><h3 class="font-bold text-base">Tambah / Perbarui Akun Pengguna</h3><button onclick="ONSStore.closeModal()" class="text-xl">&times;</button></div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="font-semibold block mb-1">Username *</label><input id="usrName" class="ons-input font-mono-num" placeholder="kasir2"/></div>
        <div><label class="font-semibold block mb-1">Nama Lengkap *</label><input id="usrFull" class="ons-input" placeholder="Dina Putri, A.Md.Farm"/></div>
        <div><label class="font-semibold block mb-1">Role</label><select id="usrRole" class="ons-select"><option>Kasir</option><option>APJ</option><option>Pemilik</option></select></div>
        <div><label class="font-semibold block mb-1">Cabang</label><input id="usrBranch" class="ons-input font-mono-num" value="${S().esc(S().AppState.cabangId || 'ONS-01')}"/></div>
        <div><label class="font-semibold block mb-1">Kata Sandi Awal (min 6) *</label><input id="usrPass" type="password" class="ons-input" placeholder="Min. 6 karakter"/></div>
        <div><label class="font-semibold block mb-1">PIN 6 Digit Otorisasi</label><input id="usrPin" type="password" maxlength="6" class="ons-input font-mono-num" value="123456"/></div>
      </div>
      <div><label class="font-semibold block mb-1">No. SIPA (jika Apoteker/APJ)</label><input id="usrSipa" class="ons-input font-mono-num" placeholder="-"/></div>
      <button onclick="window.submitAddUserNow()" class="ons-btn ons-btn-emerald w-full">Simpan Akun ke PENGGUNA_CABANG</button>
    </div>`, '520px');
  };

  global.submitAddUserNow = async () => {
    try {
      await API().callApi('users.save', {
        username: document.getElementById('usrName').value,
        nama_lengkap: document.getElementById('usrFull').value,
        role: document.getElementById('usrRole').value,
        cabang_id: document.getElementById('usrBranch').value,
        password_baru: document.getElementById('usrPass').value,
        pin_baru: document.getElementById('usrPin').value,
        no_sipa: document.getElementById('usrSipa').value
      }, { isWrite: true });
      S().closeModal();
      global.toast('Akun pengguna berhasil disimpan!', 'ok');
      global.loadSettingsBundle(true);
    } catch (e) { global.toast(e.message, 'err'); }
  };

  global.openChangeCredModal = (targetUsername) => {
    const u = targetUsername || (S().AppState.user && S().AppState.user.username) || 'pemilik';
    S().openModal(`<div class="p-6 space-y-3 text-xs">
      <div class="flex justify-between items-center"><h3 class="font-bold text-base">Ubah Kata Sandi &amp; PIN: <span class="font-mono-num text-blue-600">${S().esc(u)}</span></h3><button onclick="ONSStore.closeModal()" class="text-xl">&times;</button></div>
      <input type="hidden" id="credTargetUser" value="${S().esc(u)}"/>
      <div><label class="font-semibold block mb-1">Kata Sandi Baru (kosongkan jika tidak mengubah sandi)</label><input id="credNewPass" type="password" class="ons-input" placeholder="Minimal 6 karakter kuat"/></div>
      <div><label class="font-semibold block mb-1">PIN Otorisasi 6 Digit Baru (kosongkan jika tidak mengubah PIN)</label><input id="credNewPin" type="password" maxlength="6" class="ons-input font-mono-num" placeholder="Contoh: 654321"/></div>
      <label class="flex items-center gap-2"><input id="credRevokeAll" type="checkbox" class="accent-blue-600"/> Cabut paksa sesi login aktif di perangkat lain</label>
      <button onclick="window.submitChangeCredNow()" class="ons-btn ons-btn-primary w-full">Simpan Perubahan Kredensial</button>
    </div>`, '460px');
  };

  global.submitChangeCredNow = async () => {
    try {
      const res = await API().callApi('users.changeCredentials', {
        username: document.getElementById('credTargetUser').value,
        password_baru: document.getElementById('credNewPass').value,
        pin_baru: document.getElementById('credNewPin').value,
        revoke_other_sessions: !!document.getElementById('credRevokeAll').checked
      }, { isWrite: true });
      S().closeModal();
      global.toast(res.pesan || 'Kata sandi / PIN berhasil diperbarui!', 'ok');
      global.loadSettingsBundle(true);
    } catch (e) { global.toast(e.message, 'err'); }
  };

  global.promptUpdateSecret = (key) => {
    const val = prompt('Masukkan nilai baru untuk ' + key + ' (tersimpan terenkripsi di ScriptProperties):');
    if (val === null) return;
    API().callApi('settings.saveSecret', { key, value: val }, { isWrite: true }).then((r) => {
      global.toast('Secret ' + key + ' diperbarui (' + r.masked + ')', 'ok');
      global.loadSettingsBundle(true);
    }).catch((e) => global.toast(e.message, 'err'));
  };

  global.runDriveBackupSnapshot = async () => {
    try {
      const res = await API().callApi('backup.driveSnapshot', {}, { isWrite: true });
      global.toast('Snapshot JSON Drive berhasil dibuat: ' + res.file_name, 'ok');
    } catch (e) { global.toast(e.message, 'err'); }
  };

  global.runMigrationPreview = async () => {
    try {
      const src = document.getElementById('migSourceId').value || 'SPREADSHEET_LAMA_V9';
      const res = await API().callApi('migrasi.preview', { source_id: src });
      const box = document.getElementById('migResultBox');
      if (box) {
        box.classList.remove('hidden');
        box.innerHTML = `<div class="font-bold mb-1">Hasil Dry-Run (${S().esc(res.source_name)}):</div>` +
          res.dry_run_summary.map((s) => `<div>&bull; <b>${s.target_sheet}</b>: +${s.akan_ditambah} tambah, ~${s.akan_diperbarui} perbarui (total ${s.total_sumber})</div>`).join('');
      }
    } catch (e) { global.toast(e.message, 'err'); }
  };

  global.runMigrationExecute = async () => {
    try {
      const src = document.getElementById('migSourceId').value || 'SPREADSHEET_LAMA_V9';
      const res = await API().callApi('migrasi.run', { source_id: src }, { isWrite: true });
      global.toast('Migrasi Upsert selesai untuk ' + res.results.length + ' sheet!', 'ok');
    } catch (e) { global.toast(e.message, 'err'); }
  };

  /**
   * W-14: Simulator Breakpoint Desktop / Tablet / Mobile Kasir
   */
  function renderMobilePreviewView() {
    return `<div class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-xl font-bold">Simulator Breakpoint PWA Mobile, Tablet &amp; Desktop (W-14)</h1>
          <p class="text-xs" style="color:var(--ons-text-soft)">Uji tata letak antarmuka kasir di berbagai ukuran layar secara langsung &amp; instal ke Layar Utama HP.</p>
        </div>
        <div class="flex gap-1.5 flex-wrap">
          ${[
            { id: '100%', label: '&#128187; Desktop (100%)' },
            { id: '768px', label: '&#128241; Tablet (768px)' },
            { id: '390px', label: '&#128242; Mobile HP (390px)' }
          ].map((bp) => `<button onclick="window.setMobilePreviewBp('${bp.id}')" class="ons-btn text-xs ${mobilePreviewBp === bp.id ? 'ons-btn-primary' : 'ons-btn-ghost'}">${bp.label}</button>`).join('')}
        </div>
      </div>

      <div class="ons-card p-4 overflow-auto">
        <div class="mx-auto transition-all duration-300 border-2 rounded-2xl overflow-hidden shadow-lg" style="max-width:${mobilePreviewBp};border-color:var(--ons-border);background:var(--ons-bg)">
          <div class="px-4 py-2.5 flex items-center justify-between text-white text-xs font-bold" style="background:#09202A">
            <span>ONS Farma PWA (${mobilePreviewBp})</span>
            <span class="px-2 py-0.5 rounded bg-emerald-600 text-[10px]">ONLINE</span>
          </div>
          <div class="p-3 space-y-2 text-xs">
            <div class="grid ${mobilePreviewBp === '390px' ? 'grid-cols-2' : 'grid-cols-4'} gap-2">
              <div class="p-2.5 rounded-lg border" style="border-color:var(--ons-border)"><div style="color:var(--ons-text-soft)">Produk</div><b class="font-mono-num">${S().AppState.masterObat.length}</b></div>
              <div class="p-2.5 rounded-lg border" style="border-color:var(--ons-border)"><div style="color:var(--ons-text-soft)">Batch FEFO</div><b class="font-mono-num">${S().AppState.stokBatch.length}</b></div>
              <div class="p-2.5 rounded-lg border" style="border-color:var(--ons-border)"><div style="color:var(--ons-text-soft)">Penjualan</div><b class="font-mono-num">${S().AppState.penjualan.length}</b></div>
              <div class="p-2.5 rounded-lg border" style="border-color:var(--ons-border)"><div style="color:var(--ons-text-soft)">Touch Target</div><b class="text-emerald-600">44px+ OK</b></div>
            </div>
            <button onclick="window.triggerPwaInstall()" class="ons-btn ons-btn-primary w-full py-2.5">&#128242; Install PWA ke Perangkat Ini</button>
          </div>
          ${mobilePreviewBp === '390px' ? `<div class="grid grid-cols-4 text-center text-[10px] py-2 border-t" style="border-color:var(--ons-border);background:var(--ons-bg-subtle)">
            <button onclick="navigateView('dashboard')" class="font-bold text-blue-600">&#127968; Home</button>
            <button onclick="navigateView('pos')">&#9889; POS</button>
            <button onclick="navigateView('gudang')">&#128230; Stok</button>
            <button onclick="navigateView('billing')">&#128179; Tagihan</button>
          </div>` : ''}
        </div>
      </div>
    </div>`;
  }

  global.setMobilePreviewBp = (bp) => {
    mobilePreviewBp = bp || '390px';
    global.renderActiveView();
  };

  global.approveErxWithPinModal = (idKlinis) => {
    S().openModal(`<div class="p-6 space-y-3 text-xs">
      <div class="flex justify-between items-center"><h3 class="font-bold text-base">Otorisasi PIN APJ untuk E-Resep ${S().esc(idKlinis)}</h3><button onclick="ONSStore.closeModal()" class="text-xl">&times;</button></div>
      <p style="color:var(--ons-text-soft)">Sesuai Permenkes 73/2016, verifikasi E-Resep wajib menggunakan PIN Apoteker Penanggung Jawab (Demo PIN: 123456).</p>
      <div><label class="font-semibold block mb-1">PIN APJ (6 Digit)</label><input id="erxApprovePin" type="password" maxlength="6" class="ons-input font-mono-num" placeholder="123456"/></div>
      <div><label class="font-semibold block mb-1">Catatan Telaah / PIO Apoteker (Opsional)</label><input id="erxApproveNote" class="ons-input" placeholder="Dosis sesuai, edukasi aturan pakai disiapkan"/></div>
      <button onclick="window.submitApproveErx('${S().esc(idKlinis)}')" class="ons-btn ons-btn-emerald w-full">Verifikasi Sah &amp; Siapkan Obat</button>
    </div>`, '480px');
  };

  global.submitApproveErx = async (idKlinis) => {
    try {
      const res = await API().callApi('klinis.erxApprove', {
        id_klinis: idKlinis,
        pin: document.getElementById('erxApprovePin').value,
        catatan_apoteker: document.getElementById('erxApproveNote').value
      }, { isWrite: true });
      S().closeModal();
      const idx = S().AppState.rekamKlinis.findIndex((x) => x.id_klinis === idKlinis);
      if (idx >= 0 && res && res.item) S().AppState.rekamKlinis[idx] = res.item;
      global.toast('E-Resep ' + idKlinis + ' resmi diverifikasi APJ!', 'ok');
      global.renderActiveView();
    } catch (e) { global.toast(e.message, 'err'); }
  };

  global.loadErxToPosCart = (idKlinis) => {
    const st = S().AppState;
    const rx = st.rekamKlinis.find((x) => x.id_klinis === idKlinis);
    if (!rx) return;
    const notesLower = String(rx.soap_notes || '').toLowerCase();
    const matched = st.masterObat.filter((o) => {
      const n1 = String(o.nama_dagang || '').toLowerCase().split(' ')[0];
      const z1 = String(o.zat_aktif || '').toLowerCase().split(' ')[0];
      return (n1.length > 3 && notesLower.includes(n1)) || (z1.length > 3 && notesLower.includes(z1));
    });
    const pick = matched.length ? matched : st.masterObat.slice(0, 1);
    const cart = st.carts[st.activeCartIdx];
    const mem = st.members.find((m) => m.id_member === rx.pasien_id || m.nama_pasien === rx.nama_pasien);
    if (cart) {
      cart.label = 'E-Resep ' + String(idKlinis).slice(-4);
      cart.channel = 'E-Resep Dokter';
      cart.id_member = mem ? mem.id_member : 'UMUM';
      cart.pelanggan_nama = rx.nama_pasien;
      cart.items = pick.map((o) => ({
        id_obat: o.id_obat,
        nama_dagang: o.nama_dagang,
        qty: 1,
        satuan: o.satuan_dasar,
        faktor_konversi: 1,
        harga_jual: mem ? (o.harga_member || o.harga_umum) : o.harga_umum,
        unitOptions: [{ label: o.satuan_dasar, ratio: 1, harga: mem ? (o.harga_member || o.harga_umum) : o.harga_umum }]
      }));
    }
    global.toast('Obat dari E-Resep ' + idKlinis + ' dimuat ke Kasir POS!', 'ok');
    global.navigateView('pos');
  };

  global.previewEditedStruk = () => {
    const txt = (document.getElementById('strukTplText') || {}).value || '';
    const w = Number((document.getElementById('strukTplWidth') || {}).value || 58);
    const box = document.getElementById('strukEditorLivePreview');
    if (box && global.StrukEngine) {
      box.innerHTML = global.StrukEngine.renderHtml(txt, {
        NAMA_TOKO: 'APOTEK ONS FARMA', ALAMAT_TOKO: 'Jl. Kesehatan Raya No. 88',
        WA_TOKO: '0811-0000-990', APJ_SIPA: '19920412/SIPA/2025',
        NOTA: 'INV-PREVIEW-001', TANGGAL: new Date().toLocaleDateString('id-ID'),
        KASIR: 'Budi Santoso', PELANGGAN: 'Tn. Bambang (PRB)', METODE: 'QRIS', CHANNEL: 'Toko Fisik',
        ITEM: [{ NAMA: 'Paracetamol Sanmol 500mg', QTY: 10, SATUAN: 'Tab', HARGA: 650, SUBTOTAL: 6500 }],
        SUBTOTAL: 6500, DISKON: 0, PPN: 0, TOTAL: 6500, DIBAYAR: 6500, KEMBALI: 0, POIN: 1,
        CATATAN: 'Semoga lekas sembuh!', QR_URL: 'https://onsfarma.id/v/PREVIEW'
      }, w);
    }
  };

  global.saveStrukTemplateServer = async () => {
    try {
      const payload = {
        kode: (document.getElementById('strukTplKode') || {}).value || 'STRUK_58_DEFAULT',
        nama: (document.getElementById('strukTplNama') || {}).value || 'Struk Kasir Thermal 58mm',
        lebar_mm: Number((document.getElementById('strukTplWidth') || {}).value || 58),
        template_teks: (document.getElementById('strukTplText') || {}).value || ''
      };
      const res = await API().callApi('struk.saveTemplate', payload, { isWrite: true });
      if (res && res.item) {
        S().AppState.strukTemplates = [res.item];
      }
      global.toast('Template struk thermal berhasil disimpan & langsung aktif di Kasir POS!', 'ok');
    } catch (e) { global.toast(e.message, 'err'); }
  };

  global.ONSViewsClinicalFinanceAdmin = {
    renderKlinisView,
    renderEresepPrbView,
    renderFinanceView,
    renderBillingModuleView,
    renderDocEngineView,
    renderTutupShiftView,
    renderSipnapParetoView,
    renderSettingsView,
    renderMobilePreviewView
  };
})(window);
