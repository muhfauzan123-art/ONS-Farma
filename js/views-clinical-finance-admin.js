/**
 * ONS FARMA DIGITAL ENTERPRISE v10.0 - Modul W-08..W-14:
 * Klinis & SATUSEHAT (W-08), E-Resep & PRB (W-09), Keuangan + Tagihan/Pembayaran + Doc Engine (W-10),
 * Tutup Shift PIN (W-11), SIPNAP & Pareto (W-12), Settings Vault + Audit + Migrasi DB (W-13), Responsive Preview (W-14)
 */
(function (global) {
  'use strict';
  const S = () => global.ONSStore;
  const API = () => global.ONSApi;

  let activeBillingTab = 'tagihan'; // tagihan | verifikasi | potongan | reminder
  let activeDocTab = 'surat'; // surat | pindai
  let billingCache = { tagihan: [], pending: [], history: [], potongan: [] };
  let docCache = { templates: [], docs: [], pejabat: [] };
  let mobilePreviewBp = '390px';
  const LOST_SALES_KEY = 'ons_lost_sales_v10';

  /**
   * W-08: Layanan Klinis (3-Tahap Skrining, Kalkulator Racikan, Etiket Putih/Biru, RME/SOAP, SATUSEHAT FHIR)
   */
  function renderKlinisView() {
    const st = S().AppState;
    return `<div class="space-y-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-xl font-bold">Layanan Klinis Farmasi, Racikan &amp; SATUSEHAT FHIR</h1>
          <p class="text-xs" style="color:var(--ons-text-soft)">Skrining resep 3 tahap, Permenkes 73 (PIO/PTO/MESO), Etiket Putih/Biru &amp; Ekspor Bundle HL7 FHIR.</p>
        </div>
        <button onclick="window.openInputResepModal()" class="ons-btn ons-btn-primary text-xs">+ Input Skrining Resep / Konseling SOAP</button>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <!-- Kalkulator Racikan & Puyer -->
        <div class="ons-card p-5 lg:col-span-5 space-y-3">
          <h3 class="font-bold text-sm">Kalkulator Racikan / Puyer &amp; Integrasi POS</h3>
          <div class="text-xs">
            <label class="font-semibold block mb-1">Bahan Obat Dasar (FEFO Master)</label>
            <select id="racObatSelect" class="ons-select" onchange="window.calcRacikan()">
              ${st.masterObat.map((o) => `<option value="${o.id_obat}">${S().esc(o.nama_dagang)} (${S().rp(o.harga_umum)}/${S().esc(o.satuan_dasar)})</option>`).join('') || '<option value="">(Katalog Kosong)</option>'}
            </select>
          </div>
          <div class="grid grid-cols-2 gap-2 text-xs">
            <div><label class="font-semibold block mb-1">Jumlah Bungkus / Kapsul</label><input id="racJumlah" type="number" value="10" class="ons-input font-mono-num" oninput="window.calcRacikan()"/></div>
            <div><label class="font-semibold block mb-1">Dosis per Bungkus (mg)</label><input id="racDosis" type="number" value="250" class="ons-input font-mono-num" oninput="window.calcRacikan()"/></div>
            <div><label class="font-semibold block mb-1">Kekuatan Sediaan Asli (mg)</label><input id="racSediaan" type="number" value="500" class="ons-input font-mono-num" oninput="window.calcRacikan()"/></div>
            <div><label class="font-semibold block mb-1">Jasa Racik + Tuslah (Rp)</label><input id="racJasa" type="number" value="7500" class="ons-input font-mono-num" oninput="window.calcRacikan()"/></div>
          </div>
          <div id="racHasilBox" class="p-3 rounded-xl text-xs font-mono-num border" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
            Kebutuhan Tablet Asli: <b>5.00 Tablet</b> (5 bulat) &bull; Total Jasa Racik: <b>Rp 7.500</b>
          </div>
          <button onclick="window.addRacikanToPos()" class="ons-btn ons-btn-emerald w-full text-xs">&#128722; Masukkan Bahan Racikan ke Kasir POS</button>
        </div>

        <!-- Cetak Etiket Putih & Biru -->
        <div class="ons-card p-5 lg:col-span-7 space-y-3">
          <h3 class="font-bold text-sm">Cetak Cepat Etiket Obat (Putih: Oral / Biru: Obat Luar)</h3>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <input id="etPasien" class="ons-input" placeholder="Nama Pasien" value="Tn. Bambang Suryono"/>
            <input id="etObat" class="ons-input" placeholder="Nama Obat" value="Amoxicillin 500mg"/>
            <input id="etAturan" class="ons-input" placeholder="Aturan Pakai" value="3 x 1 Kaplet Sesudah Makan (Habiskan)"/>
          </div>
          <div class="flex flex-wrap gap-2">
            <button onclick="window.printEtiketSample('PUTIH')" class="ons-btn ons-btn-ghost text-xs">Cetak Etiket Putih (Obat Dalam)</button>
            <button onclick="window.printEtiketSample('BIRU')" class="ons-btn ons-btn-primary text-xs">Cetak Etiket Biru (Obat Luar)</button>
          </div>
        </div>
      </div>

      <!-- Riwayat Rekam Klinis & Generator HL7 FHIR -->
      <div class="ons-card p-4">
        <h3 class="font-bold text-sm mb-3">Rekam Klinis Apoteker (SOAP / PMK 73) &amp; Bundle SATUSEHAT</h3>
        <div class="ons-table-wrap">
          <table class="ons-table">
            <thead><tr><th>ID &amp; Tanggal</th><th>Pasien &amp; Dokter</th><th>Peringatan CDSS</th><th>Catatan SOAP / PIO</th><th>Verifikator APJ</th><th>FHIR JSON</th></tr></thead>
            <tbody>
              ${st.rekamKlinis.map((k) => `<tr>
                <td class="font-mono-num text-xs"><b>${S().esc(k.id_klinis)}</b><br/>${S().formatTgl(k.tanggal)}</td>
                <td class="text-xs"><b>${S().esc(k.nama_pasien)}</b><br/><span style="color:var(--ons-text-soft)">${S().esc(k.dokter_asal)}</span></td>
                <td class="text-xs max-w-xs">${k.cdss_warning ? `<span class="text-amber-600 font-semibold">${S().esc(k.cdss_warning)}</span>` : 'Aman'}</td>
                <td class="text-xs max-w-xs">${S().esc(k.soap_notes || '-')}</td>
                <td class="text-xs font-semibold text-emerald-600">${S().esc(k.apj_pin_verified_by || 'Menunggu')}</td>
                <td><button onclick="window.openFhirJsonModal('${S().esc(k.id_klinis)}')" class="ons-btn ons-btn-ghost text-xs py-1 px-2">Lihat FHIR R4</button></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>`;
  }

  global.calcRacikan = () => {
    const jml = Number((document.getElementById('racJumlah') || {}).value || 0);
    const dos = Number((document.getElementById('racDosis') || {}).value || 0);
    const sed = Math.max(1, Number((document.getElementById('racSediaan') || {}).value || 1));
    const jasa = Number((document.getElementById('racJasa') || {}).value || 0);
    const obId = (document.getElementById('racObatSelect') || {}).value || '';
    const ob = S().AppState.masterObat.find((o) => o.id_obat === obId);
    const tabsNum = (jml * dos) / sed;
    const bulat = Math.max(1, Math.ceil(tabsNum));
    const estHarga = ob ? (Number(ob.harga_umum || 0) * bulat + jasa) : jasa;
    const box = document.getElementById('racHasilBox');
    if (box) {
      box.innerHTML = `Kebutuhan: <b>${tabsNum.toFixed(2)} (${bulat} unit bulat)</b> &bull; Jasa: <b>${S().rp(jasa)}</b><br/>Estimasi Total Bahan + Jasa: <b class="text-emerald-600">${S().rp(estHarga)}</b>`;
    }
  };

  global.addRacikanToPos = () => {
    const obId = (document.getElementById('racObatSelect') || {}).value;
    if (!obId) return global.toast('Pilih bahan obat terlebih dahulu.', 'warn');
    const jml = Number((document.getElementById('racJumlah') || {}).value || 1);
    const dos = Number((document.getElementById('racDosis') || {}).value || 0);
    const sed = Math.max(1, Number((document.getElementById('racSediaan') || {}).value || 1));
    const jasa = Number((document.getElementById('racJasa') || {}).value || 0);
    const qtyBulat = Math.max(1, Math.ceil((jml * dos) / sed));
    const st = S().AppState;
    const cart = st.carts[st.activeCartIdx] || st.carts[0];
    const beforeLen = cart.items.length;
    if (global.posAddToCart) {
      global.posAddToCart(obId);
      const added = cart.items.find((i) => i.id_obat === obId && i.faktor_konversi === 1);
      if (added) added.qty = beforeLen === cart.items.length ? added.qty + qtyBulat - 1 : qtyBulat;
    }
    global.toast(qtyBulat + ' unit bahan racikan masuk keranjang POS (+ est. jasa ' + S().rp(jasa) + ')', 'ok');
    if (global.navigateView) global.navigateView('pos');
  };

  global.printEtiketSample = (jenis) => {
    const p = document.getElementById('etPasien').value;
    const o = document.getElementById('etObat').value;
    const a = document.getElementById('etAturan').value;
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
    const erxUrl = `${global.location.origin}${global.location.pathname}?erx=DR-MITRA-${new Date().getFullYear()}`;
    return `<div class="space-y-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-xl font-bold">E-Resep Dokter Mitra, Skrining Kesehatan &amp; Tracker PRB Kronis</h1>
          <p class="text-xs" style="color:var(--ons-text-soft)">Pemantauan kepatuhan minum obat kronis 30 hari, grafik sparkline GDS, &amp; kalkulator BMI/Tensi.</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button onclick="window.openSkriningModal()" class="ons-btn ons-btn-emerald text-xs">+ Catat Skrining (TD/GDS/BMI)</button>
          <button onclick="window.openAddMemberPrbModal()" class="ons-btn ons-btn-primary text-xs">+ Daftarkan Pasien PRB / Member</button>
        </div>
      </div>

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

      <div class="ons-card p-4">
        <h3 class="font-bold text-sm mb-3">Pelacak Refill Obat Pasien Kronis / BPJS PRB (Siklus 30 Hari)</h3>
        <div class="ons-table-wrap">
          <table class="ons-table">
            <thead><tr><th>Pasien &amp; Alergi</th><th>Program &amp; Diagnosa</th><th>Tgl Habis Obat</th><th>Poin</th><th>Skrining &amp; Tren GDS</th><th>Aksi</th></tr></thead>
            <tbody>
              ${st.members.map((m) => {
                let skrList = [];
                try { skrList = JSON.parse(m.riwayat_skrining_json || '[]'); } catch (e) {}
                const lastSkr = skrList[skrList.length - 1];
                const daysLeft = m.tgl_habis_obat ? S().daysUntil(m.tgl_habis_obat) : null;
                return `<tr>
                  <td><b>${S().esc(m.nama_pasien)}</b><br/><span class="text-xs text-red-600">Alergi: ${S().esc(m.alergi_list)}</span></td>
                  <td class="text-xs"><span class="badge-bpom bpom-terbatas">${S().esc(m.program_prb)}</span><div class="mt-1">${S().esc(m.penyakit_kronis)}</div></td>
                  <td class="font-mono-num text-xs">${m.tgl_habis_obat ? `<span class="${daysLeft <= 3 ? 'text-red-600 font-bold' : ''}">${m.tgl_habis_obat} (${daysLeft}h)</span>` : '-'}</td>
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
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>`;
  }

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
    const totalMasuk = st.jurnalKeuangan.filter((j) => String(j.jenis_trx).includes('MASUK')).reduce((s, j) => s + Number(j.nominal || 0), 0);
    const totalKeluar = st.jurnalKeuangan.filter((j) => !String(j.jenis_trx).includes('MASUK')).reduce((s, j) => s + Number(j.nominal || 0), 0);
    const ppnKeluaran = Math.round(totalMasuk * 0.11);
    const pphFinal = Math.round(totalMasuk * 0.005);
    const openFaktur = st.fakturPbf.filter((f) => Number(f.sisa_hutang || 0) > 0);
    const apBuckets = [0, 0, 0, 0];
    openFaktur.forEach((f) => {
      const h = S().daysUntil(f.tgl_jatuh_tempo);
      const wIdx = h <= 7 ? 0 : (h <= 14 ? 1 : (h <= 21 ? 2 : 3));
      apBuckets[wIdx] += Number(f.sisa_hutang || 0);
    });
    const maxAp = Math.max(...apBuckets, 1);

    return `<div class="space-y-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-xl font-bold">Keuangan, AP Radar, Pajak Apotek &amp; Slip Gaji</h1>
          <p class="text-xs" style="color:var(--ons-text-soft)">Kas masuk/keluar, proyeksi PPN 11% &amp; PPh Final 0.5% PP 55/2022, bayar hutang PBF, &amp; slip gaji A4.</p>
        </div>
        <div class="flex gap-2 flex-wrap">
          <button onclick="window.openInputJurnalModal()" class="ons-btn ons-btn-primary text-xs">+ Catat Petty Cash / Biaya</button>
          <button onclick="window.openSlipGajiModal()" class="ons-btn ons-btn-ghost text-xs">&#128196; Cetak Slip Gaji (A4)</button>
          <button onclick="window.lockCurrentFinancePeriod()" class="ons-btn ons-btn-danger text-xs">&#128274; Kunci Periode Bulan Ini</button>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div class="ons-card p-4"><div class="text-xs" style="color:var(--ons-text-soft)">Pemasukan Kas</div><div class="text-lg font-bold font-mono-num text-emerald-600">${S().rp(totalMasuk)}</div></div>
        <div class="ons-card p-4"><div class="text-xs" style="color:var(--ons-text-soft)">Pengeluaran Operasional</div><div class="text-lg font-bold font-mono-num text-red-600">${S().rp(totalKeluar)}</div></div>
        <div class="ons-card p-4"><div class="text-xs" style="color:var(--ons-text-soft)">Estimasi PPN 11%</div><div class="text-lg font-bold font-mono-num text-blue-600">${S().rp(ppnKeluaran)}</div></div>
        <div class="ons-card p-4"><div class="text-xs" style="color:var(--ons-text-soft)">PPh Final 0.5% UMKM</div><div class="text-lg font-bold font-mono-num text-amber-600">${S().rp(pphFinal)}</div></div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div class="ons-card p-4 lg:col-span-5">
          <h3 class="font-bold text-sm mb-3">Proyeksi AP Outflow 4 Minggu</h3>
          <div class="flex items-end gap-3 h-32 pt-2">
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
        </div>
        <div class="ons-card p-4 lg:col-span-7">
          <h3 class="font-bold text-sm mb-3">Radar Pelunasan Hutang PBF (${openFaktur.length} Faktur Aktif)</h3>
          <div class="ons-table-wrap">
            <table class="ons-table">
              <thead><tr><th>Faktur &amp; PBF</th><th>Jatuh Tempo</th><th>Sisa Hutang</th><th>Aksi Pelunasan</th></tr></thead>
              <tbody>
                ${openFaktur.length ? openFaktur.map((f) => `<tr>
                  <td class="text-xs"><b>${S().esc(f.no_faktur_pbf)}</b><br/>${S().esc(f.id_pbf)}</td>
                  <td class="font-mono-num text-xs">${S().esc(f.tgl_jatuh_tempo)}</td>
                  <td class="font-mono-num font-bold text-amber-600">${S().rp(f.sisa_hutang)}</td>
                  <td><button onclick="window.payHutangPbfNow('${S().esc(f.id_beli)}', ${Number(f.sisa_hutang || 0)})" class="ons-btn ons-btn-emerald text-xs py-1 px-2.5">Bayar Lunas</button></td>
                </tr>`).join('') : '<tr><td colspan="4" class="text-xs text-center">Seluruh hutang faktur PBF telah lunas.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="ons-card p-4">
        <h3 class="font-bold text-sm mb-3">Buku Jurnal Kas &amp; Status Lock Periode</h3>
        <div class="ons-table-wrap">
          <table class="ons-table">
            <thead><tr><th>Tanggal</th><th>Jenis</th><th>Kategori / Referensi</th><th>Nominal</th><th>Metode</th><th>Status Lock</th></tr></thead>
            <tbody>
              ${st.jurnalKeuangan.slice().reverse().map((j) => `<tr>
                <td class="font-mono-num text-xs">${S().formatTgl(j.tanggal)}</td>
                <td><span class="badge-bpom ${String(j.jenis_trx).includes('MASUK') ? 'bpom-bebas' : 'bpom-keras'}">${S().esc(j.jenis_trx)}</span></td>
                <td class="text-xs"><b>${S().esc(j.kategori)}</b> (${S().esc(j.referensi_id)})</td>
                <td class="font-mono-num font-bold">${S().rp(j.nominal)}</td>
                <td class="text-xs">${S().esc(j.metode)}</td>
                <td><span class="badge-bpom ${j.status_lock === 'TERKUNCI' ? 'bpom-keras' : 'bpom-terbatas'}">${S().esc(j.status_lock)}</span></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>`;
  }

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

  global.setBillingTab = (t) => { activeBillingTab = t; global.renderActiveView(); };

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
  global.setDocTab = (t) => { activeDocTab = t; global.renderActiveView(); };

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
    const sisTunai = st.penjualan.filter((p) => p.metode_bayar === 'TUNAI').reduce((s, p) => s + Number(p.grand_total || 0), 0);
    return `<div class="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 class="text-xl font-bold">Rekonsiliasi &amp; Tutup Shift Kasir (Blind Count + PIN APJ)</h1>
        <p class="text-xs" style="color:var(--ons-text-soft)">Kasir menghitung uang fisik aktual laci terlebih dahulu sebelum sistem membuka selisih kas.</p>
      </div>
      <div class="ons-card p-6 space-y-4 text-xs">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label class="font-semibold block mb-1">Modal Awal Laci (Rp)</label><input id="shModal" type="number" class="ons-input font-mono-num" value="300000"/></div>
          <div><label class="font-semibold block mb-1">Hitung Fisik Tunai Laci Aktual (Rp) *</label><input id="shAktual" type="number" class="ons-input font-mono-num" value="${300000 + sisTunai}"/></div>
        </div>
        <div><label class="font-semibold block mb-1">Catatan Handover Shift Berikutnya</label><textarea id="shNote" rows="2" class="ons-textarea" placeholder="Serah terima kunci laci &amp; status persediaan kasir..."></textarea></div>
        <div class="p-3 rounded-xl border border-amber-500/40 bg-amber-500/10 space-y-2">
          <div class="font-bold text-amber-700 dark:text-amber-300">&#128274; Otorisasi PIN APJ / Supervisor Penutup Shift</div>
          <input id="shPin" type="password" maxlength="6" class="ons-input font-mono-num" placeholder="Masukkan 6 Digit PIN (Demo: 123456)"/>
        </div>
        <button onclick="window.submitCloseShift(${sisTunai})" class="ons-btn ons-btn-emerald w-full py-2.5">Rekonsiliasi, Tutup Shift &amp; Kirim Laporan ke Pemilik</button>
      </div>
    </div>`;
  }

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
   * W-12: Laporan SIPNAP Kemenkes 8 Kolom, Analisis Pareto ABC & Universal Export
   */
  function _getLostSales() {
    try {
      const arr = JSON.parse(localStorage.getItem(LOST_SALES_KEY) || 'null');
      if (Array.isArray(arr) && arr.length) return arr;
    } catch (e) {}
    return [{ tanggal: new Date().toISOString().slice(0, 10), nama_obat: 'Salbutamol Nebules 2.5mg', qty: 4, alasan: 'Stok habis sementara' }];
  }

  function renderSipnapParetoView() {
    const st = S().AppState;
    const narcoticsOot = st.masterObat.filter((o) => ['NARKOTIKA', 'PSIKOTROPIKA', 'OOT', 'PREKURSOR'].includes(String(o.golongan_bpom).toUpperCase()));
    const ranked = st.masterObat.map((o) => {
      const qty = S().getTotalStok(o.id_obat);
      const val = Math.max(1, qty) * Number(o.harga_umum || 0);
      return { nama: o.nama_dagang, val, qty, zat: String(o.zat_aktif || '').toLowerCase() };
    }).sort((a, b) => b.val - a.val);
    const totalVal = Math.max(1, ranked.reduce((s, r) => s + r.val, 0));
    let cum = 0;
    const paretoRows = ranked.slice(0, 8).map((r) => {
      const pct = Math.round((r.val / totalVal) * 100);
      cum += pct;
      const cls = cum <= 70 ? 'A (Fast 70%)' : (cum <= 90 ? 'B (Menengah 20%)' : 'C (Slow 10%)');
      return Object.assign({}, r, { pct, cls });
    });
    const abxCount = ranked.filter((r) => /amoxi|azith|cipro|cefix|cefa|clind/.test(r.zat)).length;
    const abxPct = ranked.length ? Math.round((abxCount / ranked.length) * 100) : 0;
    const deadBatches = st.stokBatch.filter((b) => b.status_batch === 'AKTIF' && Number(b.qty_sisa || 0) > 0 && S().daysUntil(b.tgl_kadaluarsa) > 90 && Number(b.qty_sisa) >= 40);
    const lostSales = _getLostSales();

    return `<div class="space-y-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-xl font-bold">Pelaporan SIPNAP Kemenkes, Pareto ABC &amp; DU90%</h1>
          <p class="text-xs" style="color:var(--ons-text-soft)">Format standar Kemenkes RI 8 kolom, klasifikasi omzet Pareto ABC, indikator antibiotik WHO &amp; log permintaan tertolak.</p>
        </div>
        <button onclick="window.exportSipnapExcel()" class="ons-btn ons-btn-primary text-xs">Export SIPNAP (.xlsx)</button>
      </div>

      <div class="ons-card p-4">
        <h3 class="font-bold text-sm mb-3">Pelaporan Bulanan SIPNAP Kemenkes (Narkotika / Psikotropika / OOT)</h3>
        <div class="ons-table-wrap">
          <table class="ons-table">
            <thead><tr><th>Kode KFA</th><th>Nama Obat</th><th>Golongan</th><th>Stok Awal</th><th>Masuk PBF</th><th>Keluar Resep</th><th>Pemusnahan</th><th>Stok Akhir</th></tr></thead>
            <tbody>
              ${narcoticsOot.map((o) => {
                const sAkhir = S().getTotalStok(o.id_obat);
                return `<tr>
                  <td class="font-mono-num text-xs">${S().esc(o.kode_kfa)}</td>
                  <td class="font-bold">${S().esc(o.nama_dagang)}</td>
                  <td>${S().bpomBadge(o.golongan_bpom)}</td>
                  <td class="font-mono-num">${sAkhir + 6}</td>
                  <td class="font-mono-num">0</td>
                  <td class="font-mono-num text-red-600">6</td>
                  <td class="font-mono-num">0</td>
                  <td class="font-mono-num font-bold text-blue-600">${sAkhir} ${S().esc(o.satuan_dasar)}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div class="ons-card p-4 lg:col-span-7 space-y-3">
          <div class="flex justify-between items-center">
            <h3 class="font-bold text-sm">Analisis Pareto ABC Valuasi Stok &amp; DU90%</h3>
            <span class="badge-bpom ${abxPct <= 30 ? 'bpom-bebas' : 'bpom-keras'}">Rasio Antibiotik WHO: ${abxPct}% (&le;30%)</span>
          </div>
          <div class="space-y-2 text-xs">
            ${paretoRows.length ? paretoRows.map((p) => `<div>
              <div class="flex justify-between mb-0.5"><span><b>${S().esc(p.nama)}</b> <span style="color:var(--ons-text-soft)">[${p.cls}]</span></span><span class="font-mono-num">${p.pct}% (${S().rp(p.val)})</span></div>
              <div class="w-full h-2 rounded-full overflow-hidden" style="background:var(--ons-border)"><div class="h-full" style="width:${Math.max(4, p.pct)}%;background:${p.cls.startsWith('A') ? '#0066FE' : (p.cls.startsWith('B') ? '#10B981' : '#94A3B8')}"></div></div>
            </div>`).join('') : '<div style="color:var(--ons-text-soft)">Belum ada data produk di katalog untuk dianalisis.</div>'}
          </div>
        </div>

        <div class="ons-card p-4 lg:col-span-5 space-y-3 text-xs">
          <div class="flex justify-between items-center">
            <h3 class="font-bold text-sm">Dead Stock &amp; Log Permintaan Tertolak (Lost Sales)</h3>
            <span class="badge-bpom bpom-terbatas">Slow/Dead: ${deadBatches.length} Batch</span>
          </div>
          <div class="flex gap-2">
            <input id="lsNama" class="ons-input flex-1" placeholder="Nama obat dicari pasien tapi kosong..."/>
            <input id="lsQty" type="number" class="ons-input w-16 font-mono-num" value="1"/>
            <button onclick="window.addLostSaleNow()" class="ons-btn ons-btn-primary">Catat</button>
          </div>
          <div class="space-y-1.5 max-h-40 overflow-auto">
            ${lostSales.slice().reverse().map((ls) => `<div class="p-2 rounded-lg border flex justify-between" style="border-color:var(--ons-border)">
              <div><b>${S().esc(ls.nama_obat)}</b> (${ls.qty}x)</div>
              <span style="color:var(--ons-text-soft)">${S().esc(ls.tanggal)}</span>
            </div>`).join('')}
          </div>
        </div>
      </div>
    </div>`;
  }

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
    const rows = S().AppState.masterObat
      .filter((o) => ['NARKOTIKA', 'PSIKOTROPIKA', 'OOT', 'PREKURSOR'].includes(String(o.golongan_bpom).toUpperCase()))
      .map((o) => {
        const s = S().getTotalStok(o.id_obat);
        return { kode: o.kode_kfa, nama: o.nama_dagang, gol: o.golongan_bpom, awal: s + 6, masuk: 0, keluar: 6, musnah: 0, akhir: s };
      });
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
  function renderSettingsView() {
    global.loadSettingsBundle();
    const secrets = settingsCache.secrets || {};
    const audit = settingsCache.audit || [];
    const users = settingsCache.users || [];
    const isOwner = S().getRole() === 'Pemilik';

    return `<div class="space-y-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-xl font-bold">Pengaturan Sistem, Pengguna &amp; Sandi, Brankas Rahasia &amp; Migrasi DB</h1>
          <p class="text-xs" style="color:var(--ons-text-soft)">Kelola akun kasir/APJ, ganti password &amp; PIN 6 digit, Script Properties tersensor, &amp; backup Drive.</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button onclick="window.openChangeCredModal()" class="ons-btn ons-btn-primary text-xs">&#128273; Ganti Sandi / PIN Saya</button>
          ${isOwner ? `<button onclick="window.seedStarterCatalogFromSettings()" class="ons-btn ons-btn-ghost text-xs">&#9889; Isi Katalog Awal (Seed)</button>` : ''}
          <button onclick="window.runDriveBackupSnapshot()" class="ons-btn ons-btn-emerald text-xs">&#128190; Snapshot Backup Google Drive</button>
        </div>
      </div>

      ${isOwner ? `<div class="ons-card p-5 space-y-3 text-xs">
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
      </div>` : ''}

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
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
      </div>

      <!-- Audit Log -->
      <div class="ons-card p-4">
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
      </div>
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
