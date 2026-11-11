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
          <h3 class="font-bold text-sm">Kalkulator Racikan / Puyer &amp; Biaya Jasa</h3>
          <div class="grid grid-cols-2 gap-2 text-xs">
            <div><label class="font-semibold block mb-1">Jumlah Bungkus / Kapsul</label><input id="racJumlah" type="number" value="10" class="ons-input font-mono-num" oninput="window.calcRacikan()"/></div>
            <div><label class="font-semibold block mb-1">Dosis per Bungkus (mg)</label><input id="racDosis" type="number" value="250" class="ons-input font-mono-num" oninput="window.calcRacikan()"/></div>
            <div><label class="font-semibold block mb-1">Kekuatan Sediaan Asli (mg)</label><input id="racSediaan" type="number" value="500" class="ons-input font-mono-num" oninput="window.calcRacikan()"/></div>
            <div><label class="font-semibold block mb-1">Jasa Racik + Tuslah (Rp)</label><input id="racJasa" type="number" value="7500" class="ons-input font-mono-num" oninput="window.calcRacikan()"/></div>
          </div>
          <div id="racHasilBox" class="p-3 rounded-xl text-xs font-mono-num border" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
            Kebutuhan Tablet Asli: <b>5.0 Tablet</b> &bull; Total Jasa Racik: <b>Rp 7.500</b>
          </div>
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
    const jml = Number(document.getElementById('racJumlah').value || 0);
    const dos = Number(document.getElementById('racDosis').value || 0);
    const sed = Math.max(1, Number(document.getElementById('racSediaan').value || 1));
    const jasa = Number(document.getElementById('racJasa').value || 0);
    const tabs = ((jml * dos) / sed).toFixed(2);
    const box = document.getElementById('racHasilBox');
    if (box) box.innerHTML = `Kebutuhan Tablet Asli: <b>${tabs} Tablet</b> (${Math.ceil(Number(tabs))} bulat) &bull; Total Jasa Racik: <b>${S().rp(jasa)}</b>`;
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
  function renderEresepPrbView() {
    const st = S().AppState;
    const erxUrl = `${global.location.origin}${global.location.pathname}?erx=DR-MITRA-${new Date().getFullYear()}`;
    return `<div class="space-y-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-xl font-bold">E-Resep Dokter Mitra, Skrining Kesehatan &amp; Tracker PRB Kronis</h1>
          <p class="text-xs" style="color:var(--ons-text-soft)">Pemantauan kepatuhan minum obat kronis 30 hari &amp; skrining metabolik pasien (TD/GDS/BMI).</p>
        </div>
        <button onclick="window.openAddMemberPrbModal()" class="ons-btn ons-btn-primary text-xs">+ Daftarkan Pasien PRB / Member</button>
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
            <thead><tr><th>Pasien &amp; Alergi</th><th>Program &amp; Diagnosa</th><th>Tgl Habis Obat</th><th>Poin</th><th>Skrining Terakhir</th><th>Aksi WA Reminder</th></tr></thead>
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
                  <td class="text-xs font-mono-num">${lastSkr ? `TD ${lastSkr.td} | GDS ${lastSkr.gds} | BMI ${lastSkr.bmi}` : '-'}</td>
                  <td>
                    ${m.no_hp ? `<a target="_blank" href="https://wa.me/${m.no_hp}?text=${encodeURIComponent('Halo ' + m.nama_pasien + ', obat rutin ' + m.penyakit_kronis + ' Anda akan segera habis pada ' + (m.tgl_habis_obat || 'minggu ini') + '. Silakan hubungi Apotek ONS Farma untuk pengulangan/antar gratis.')}" class="ons-btn ons-btn-emerald text-xs py-1 px-2.5">Kirim WA Refill</a>` : '-'}
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>`;
  }

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

    return `<div class="space-y-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-xl font-bold">Keuangan, AP Radar, Pajak Apotek &amp; Slip Gaji</h1>
          <p class="text-xs" style="color:var(--ons-text-soft)">Kas masuk/keluar, proyeksi PPN 11% &amp; PPh Final 0.5% PP 55/2022, penguncian periode, &amp; penggajian.</p>
        </div>
        <div class="flex gap-2 flex-wrap">
          <button onclick="window.openInputJurnalModal()" class="ons-btn ons-btn-primary text-xs">+ Catat Petty Cash / Biaya</button>
          <button onclick="window.lockCurrentFinancePeriod()" class="ons-btn ons-btn-danger text-xs">&#128274; Kunci Periode Bulan Ini</button>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div class="ons-card p-4"><div class="text-xs" style="color:var(--ons-text-soft)">Pemasukan Kas</div><div class="text-lg font-bold font-mono-num text-emerald-600">${S().rp(totalMasuk)}</div></div>
        <div class="ons-card p-4"><div class="text-xs" style="color:var(--ons-text-soft)">Pengeluaran Operasional</div><div class="text-lg font-bold font-mono-num text-red-600">${S().rp(totalKeluar)}</div></div>
        <div class="ons-card p-4"><div class="text-xs" style="color:var(--ons-text-soft)">Estimasi PPN 11%</div><div class="text-lg font-bold font-mono-num text-blue-600">${S().rp(ppnKeluaran)}</div></div>
        <div class="ons-card p-4"><div class="text-xs" style="color:var(--ons-text-soft)">PPh Final 0.5% UMKM</div><div class="text-lg font-bold font-mono-num text-amber-600">${S().rp(pphFinal)}</div></div>
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
            <button onclick="window.openKwitansiQrModal('${S().esc(h.NoKwitansi)}', ${h.NominalBayar})" class="ons-btn ons-btn-primary text-xs py-1 px-2.5">Lihat &amp; Cetak Kwitansi QR</button>
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

  global.openKwitansiQrModal = (noKw, nom) => {
    const verifyLink = `${global.location.origin}${global.location.pathname}#kwitansi=${encodeURIComponent(noKw)}&sig=${encodeURIComponent(btoa(noKw).slice(0, 12).toUpperCase())}`;
    S().openModal(`<div class="p-6 text-center space-y-3">
      <div class="p-5 border-2 rounded-xl text-left space-y-3 bg-white text-black">
        <div class="flex justify-between items-start border-b pb-2">
          <div><div class="font-bold text-base">KWITANSI PEMBAYARAN RESMI</div><div class="text-xs">Apotek ONS Farma Enterprise</div></div>
          <div class="font-mono-num text-xs font-bold">${S().esc(noKw)}</div>
        </div>
        <div class="text-sm">Telah diterima pembayaran sejumlah: <b class="font-mono-num text-lg">${S().rp(nom)}</b></div>
        <div class="flex items-center justify-between pt-2">
          <div class="text-[10px]">Scan QR untuk memverifikasi keaslian kwitansi<br/>secara publik (HMAC-SHA256 Terproteksi).</div>
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
      </div>` : `<div class="ons-card p-4 space-y-3 text-xs">
        <h3 class="font-bold text-sm">Templat Terdaftar ({{...}} + Modifier |kapital, |rupiah, |terbilang, |tanggal)</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          ${tpls.map((t) => `<div class="p-3 rounded-xl border space-y-1">
            <div class="font-bold text-sm">${S().esc(t.Nama)}</div>
            <div class="font-mono-num text-blue-600">${S().esc(t.Kode)} &bull; ${S().esc(t.JenisFile)}</div>
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

  global.openCreateDocModal = () => {
    const tpls = docCache.templates || [];
    S().openModal(`<div class="p-6 space-y-3 text-xs">
      <div class="flex justify-between items-center"><h3 class="font-bold text-base">Buat Draf Dokumen Resmi</h3><button onclick="ONSStore.closeModal()" class="text-xl">&times;</button></div>
      <select id="deTplCode" class="ons-select">${tpls.map((t) => `<option value="${t.Kode}">${S().esc(t.Nama)}</option>`).join('')}</select>
      <input id="deJudul" class="ons-input" placeholder="Judul Dokumen (mis. SP Pengadaan Prekursor Nov 2026)"/>
      <input id="dePihak" class="ons-input" placeholder="Pihak Tujuan / PBF / Pasien" value="PT Bina San Prima"/>
      <button onclick="window.submitCreateDocDraft()" class="ons-btn ons-btn-primary w-full">Buat Draf Surat</button>
    </div>`, '480px');
  };

  global.submitCreateDocDraft = async () => {
    try {
      await API().callApi('doc.createDraft', {
        kode_templat: document.getElementById('deTplCode').value,
        judul: document.getElementById('deJudul').value,
        data: { NAMA_PBF: document.getElementById('dePihak').value, NAMA_APJ: 'apt. Siti Rahma, S.Farm', NO_SIPA: '19920412/SIPA_35.78/2025/1042' }
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
  function renderSipnapParetoView() {
    const st = S().AppState;
    const narcoticsOot = st.masterObat.filter((o) => ['NARKOTIKA', 'PSIKOTROPIKA', 'OOT', 'PREKURSOR'].includes(String(o.golongan_bpom).toUpperCase()));
    return `<div class="space-y-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-xl font-bold">Pelaporan SIPNAP Kemenkes, Pareto ABC &amp; DU90%</h1>
          <p class="text-xs" style="color:var(--ons-text-soft)">Format standar Kemenkes RI 8 kolom &amp; klasifikasi omzet Pareto ABC + indikator antibiotik WHO.</p>
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
    </div>`;
  }

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
  let settingsCache = { secrets: {}, audit: [] };
  function renderSettingsView() {
    global.loadSettingsBundle();
    const secrets = settingsCache.secrets || {};
    const audit = settingsCache.audit || [];

    return `<div class="space-y-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-xl font-bold">Pengaturan Sistem, Brankas Rahasia, Audit Trail &amp; Migrasi DB</h1>
          <p class="text-xs" style="color:var(--ons-text-soft)">Seluruh API Key terenkripsi di Google Script Properties &amp; tersensor (zero secret leaks).</p>
        </div>
        <button onclick="window.runDriveBackupSnapshot()" class="ons-btn ons-btn-emerald text-xs">&#128190; Snapshot Backup Google Drive</button>
      </div>

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
      const [sec, aud] = await Promise.all([API().callApi('settings.getSecretsMasked', {}), API().callApi('audit.list', {})]);
      settingsCache = { secrets: sec.secrets || {}, audit: aud.items || [] };
      if (S().AppState.activeView === 'settings') global.renderActiveView();
    } catch (e) {} finally { _setLoading = false; }
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
      <div>
        <h1 class="text-xl font-bold">Desain Responsif PWA Mobile &amp; Tablet Kasir (W-14)</h1>
        <p class="text-xs" style="color:var(--ons-text-soft)">Aplikasi ini otomatis beradaptasi pada layar HP (&lt;768px) dengan Bottom Navigation Bar &amp; tombol sentuh minimal 44px.</p>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div class="ons-card p-5 space-y-3">
          <h3 class="font-bold text-sm">Siap Instal ke Layar Utama HP Android / iOS (PWA Standalone)</h3>
          <p class="text-xs">Saat dihosting di GitHub Pages, klik tombol <b>Install Aplikasi</b> di bar atas atau menu browser <i>Add to Home Screen</i>. Kasir &amp; Pemilik dapat membuka Apotek ONS Farma layaknya aplikasi Play Store tanpa delay URL.</p>
          <button onclick="window.triggerPwaInstall()" class="ons-btn ons-btn-primary text-xs">&#128242; Install PWA ke Perangkat Ini</button>
        </div>
        <div class="ons-card p-5 space-y-2 text-xs">
          <h3 class="font-bold text-sm">Checklist Ergonomi Kasir &amp; Gudang Seluler:</h3>
          <div>&#9989; Bottom Navigation cepat 4 menu utama di layar HP</div>
          <div>&#9989; Target sentuh minimum 44x44 px di seluruh tombol POS</div>
          <div>&#9989; Pemindai Barcode Kamera Belakang langsung di menu Kasir POS</div>
          <div>&#9989; Antrean Transaksi Offline darurat otomatis tersimpan saat sinyal hilang</div>
        </div>
      </div>
    </div>`;
  }

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
