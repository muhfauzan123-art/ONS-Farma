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
  let financeTab = 'pnl'; // pnl | akun-kas | jurnal | piutang | hutang | pajak
  let financeDateFrom = '';
  let financeDateTo = '';
  let jurnalFilter = 'SEMUA';
  let akunKasSearchQ = '';
  let akunKasStatusFilter = 'SEMUA';
  let kasBookAccountFilter = 'SEMUA';
  let kasBookSearchQ = '';
  let hutangSubView = 'list'; // list | riwayat
  let hutangSearchQ = '';
  let hutangDueFilter = '';
  let hutangStatusFilter = 'SEMUA';
  let piutangSubView = 'list'; // list | ttf | riwayat
  let piutangSearchQ = '';
  let piutangDueFilter = '';
  let piutangStatusFilter = 'SEMUA';
  let sipnapTab = 'narkotika'; // narkotika | pareto | deadstock
  let shiftDenomCounts = { 100000: 0, 50000: 0, 20000: 0, 10000: 0, 5000: 0, 2000: 0, 1000: 0, 500: 0, 200: 0, 100: 0 };
  let shiftBlindRevealed = false;
  let shiftAktualCustom = null;
  let shiftFloatNext = null;
  let shiftVarianceReason = '';
  let activeBillingTab = 'tagihan'; // tagihan | verifikasi | potongan | reminder
  let activeDocTab = 'surat'; // surat | pindai
  let settingsTab = 'profil'; // profil | akun | struk | vault | audit
  let profileMediaDraft = { foto: null, logo: null };
  let billingCache = { tagihan: [], pending: [], history: [], potongan: [] };
  let docCache = { templates: [], docs: [], pejabat: [] };
  let mobilePreviewBp = '390px';
  let strukPreviewMode = 'paper'; // paper | text
  let strukPreviewExtras = true;
  let strukActiveIdx = 0;
  const STRUK_TOKEN_SNIPPETS = [
    { label: '+ Nama Apotek', token: '{{NAMA_TOKO}}' },
    { label: '+ Izin SIA', token: '{{SIA_TOKO}}' },
    { label: '+ SIPA APJ', token: '{{APJ_SIPA}}' },
    { label: '+ No Nota', token: '{{NOTA}}' },
    { label: '+ Pasien', token: '{{PELANGGAN}}' },
    { label: '+ Diskon Opsional', token: '{{?DISKON}}[LR]Diskon||-{{DISKON|rp}}\n{{/DISKON}}' },
    { label: '+ Garis Ganda', token: '[=]' },
    { label: '+ Garis Putus', token: '[-]' },
    { label: '+ QR Verifikasi', token: '[QR]{{QR_URL}}' },
    { label: '+ Barcode Nota', token: '[BAR]{{NOTA}}' }
  ];
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
  let pioState = {
    pasien: 'Tn. Bambang Suryono',
    noWa: '081234567890',
    idMember: 'MBR-001',
    itemsText: 'Amoxicillin 500mg (3x1 sesudah makan)\nParacetamol 500mg (Bila demam)\nAmlodipine 10mg (1x1 pagi hari)',
    jadwalKeys: ['PAGI', 'SIANG', 'MALAM'],
    catatan: 'Habiskan antibiotik hingga tuntas. Hindari konsumsi kopi berlebih bersamaan.'
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
      <div class="ons-page-header">
        <div>
          <h1 class="text-xl font-extrabold">Layanan Klinis Farmasi, Racikan &amp; MESO SATUSEHAT</h1>
          <p class="text-xs" style="color:var(--ons-text-soft)">Dokumentasi SOAP PMK 73 &amp; HL7 FHIR R4, kalkulator racikan multi-bahan + etiket live, serta algoritma Naranjo MESO BPOM.</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <div class="ons-tab-bar">
            <button onclick="window.setKlinisTab('soap')" class="ons-tab-btn ${klinisTab === 'soap' ? 'active' : ''}">Skrining &amp; SOAP (${(st.rekamKlinis || []).length})</button>
            <button onclick="window.setKlinisTab('racikan')" class="ons-tab-btn ${klinisTab === 'racikan' ? 'active' : ''}">Racikan &amp; Etiket</button>
            <button onclick="window.setKlinisTab('pio')" class="ons-tab-btn ${klinisTab === 'pio' ? 'active' : ''}">Kartu PIO &amp; Jadwal</button>
            <button onclick="window.setKlinisTab('meso')" class="ons-tab-btn ${klinisTab === 'meso' ? 'active' : ''}">MESO (Naranjo) (${mesoList.length})</button>
          </div>
          <button onclick="window.openCopyResepArchiveModal()" class="ons-btn ons-btn-ghost text-xs">Arsip Copy Resep (${(st.copyResep || []).length})</button>
          <button onclick="window.openInputResepModal()" class="ons-btn ons-btn-primary text-xs">+ Input SOAP Klinis</button>
        </div>
      </div>

      ${klinisTab === 'pio' ? (() => {
        const jKeys = pioState.jadwalKeys || [];
        const pioItems = String(pioState.itemsText || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => {
          const m = l.match(/^(.*?)\((.*?)\)\s*$/);
          return {
            nama_obat: m ? m[1].trim() : l,
            dosis: m ? m[2].trim() : 'Sesuai anjuran dokter',
            pagi: jKeys.includes('PAGI'),
            siang: jKeys.includes('SIANG'),
            sore: jKeys.includes('SORE'),
            malam: jKeys.includes('MALAM')
          };
        });
        const waPreview = S().buildPioScheduleWaText ? S().buildPioScheduleWaText({ nama_pasien: pioState.pasien, items: pioItems, catatan_apoteker: pioState.catatan }) : '';
        const waHref = (S().buildWaUrl && pioState.noWa) ? S().buildWaUrl(pioState.noWa, waPreview) : ('https://wa.me/?text=' + encodeURIComponent(waPreview));
        const pioHistory = (st.rekamKlinis || []).filter((k) => String(k.layanan_jenis || '').toUpperCase() === 'PIO');
        return `<div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div class="ons-card p-5 lg:col-span-6 space-y-3 text-xs">
            <h3 class="font-bold text-sm">Builder Kartu PIO &amp; Jadwal Minum Obat Pasien (PMK 73)</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div><label class="font-semibold block mb-1">Pilih Pasien / Member</label>
                <select class="ons-select text-xs" onchange="window.pickPioMember(this.value)">
                  <option value="">-- Custom / Pasien Umum --</option>
                  ${(st.members || []).map((m) => `<option value="${S().esc(m.id_member)}" ${pioState.idMember === m.id_member ? 'selected' : ''}>${S().esc(m.nama_pasien)} (${S().esc(m.no_hp || '-')})</option>`).join('')}
                </select>
              </div>
              <div><label class="font-semibold block mb-1">Nama Pasien *</label><input class="ons-input text-xs" value="${S().esc(pioState.pasien)}" oninput="window.setPioMeta('pasien', this.value)"/></div>
              <div class="sm:col-span-2"><label class="font-semibold block mb-1">No. WhatsApp Pasien (Gratis Kirim via wa.me)</label><input class="ons-input font-mono-num text-xs" value="${S().esc(pioState.noWa)}" oninput="window.setPioMeta('noWa', this.value)"/></div>
            </div>
            <div>
              <label class="font-semibold block mb-1">Pilih Waktu Minum Obat Utama</label>
              <div class="flex flex-wrap gap-2">
                ${[
                  { k: 'PAGI', l: '07:00 Pagi' },
                  { k: 'SIANG', l: '13:00 Siang' },
                  { k: 'SORE', l: '17:00 Sore' },
                  { k: 'MALAM', l: '21:00 Malam' }
                ].map((slot) => {
                  const active = (pioState.jadwalKeys || []).includes(slot.k);
                  return `<button type="button" onclick="window.togglePioJadwal('${slot.k}')" class="ons-btn text-xs py-1 px-3 ${active ? 'ons-btn-primary' : 'ons-btn-ghost'}">${slot.l}</button>`;
                }).join('')}
              </div>
            </div>
            <div><label class="font-semibold block mb-1">Daftar Obat &amp; Aturan Pakai (1 obat per baris, format: Nama (Aturan))</label><textarea rows="4" class="ons-textarea font-mono-num text-xs" oninput="window.setPioMeta('itemsText', this.value)">${S().esc(pioState.itemsText)}</textarea></div>
            <div><label class="font-semibold block mb-1">Catatan Edukasi / Interaksi Apoteker</label><input class="ons-input text-xs" value="${S().esc(pioState.catatan)}" oninput="window.setPioMeta('catatan', this.value)"/></div>
            <div class="flex flex-wrap gap-2 pt-1">
              <button onclick="window.submitPioRecord()" class="ons-btn ons-btn-emerald text-xs">Simpan Arsip PIO &rarr; SOAP</button>
              <button onclick="window.printPioCard()" class="ons-btn ons-btn-ghost text-xs">Cetak Kartu PIO</button>
              <a target="_blank" rel="noopener" href="${S().esc(waHref)}" class="ons-btn ons-btn-primary text-xs">Kirim Jadwal WA (Gratis)</a>
            </div>
          </div>

          <div class="ons-card p-5 lg:col-span-6 space-y-3 text-xs">
            <h3 class="font-bold text-sm">Pratinjau Kartu PIO &amp; Pesan WhatsApp Otomatis</h3>
            <pre class="p-3 rounded-xl border whitespace-pre-wrap font-sans text-xs max-h-64 overflow-y-auto" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">${S().esc(waPreview)}</pre>
            <div class="pt-2 border-t space-y-2" style="border-color:var(--ons-border)">
              <div class="font-bold text-xs">Riwayat Edukasi PIO Tersimpan (${pioHistory.length})</div>
              <div class="space-y-1.5 max-h-40 overflow-y-auto">
                ${pioHistory.length ? pioHistory.map((p) => `<div class="p-2 rounded-lg border text-[11px]" style="border-color:var(--ons-border)">
                  <div class="flex justify-between"><b>${S().esc(p.nama_pasien)}</b><span class="font-mono-num" style="color:var(--ons-text-soft)">${S().formatTgl(p.tanggal)}</span></div>
                  <div style="color:var(--ons-text-soft)">${S().esc(p.soap_notes)}</div>
                </div>`).join('') : '<div style="color:var(--ons-text-soft)">Belum ada log PIO baru sesi ini.</div>'}
              </div>
            </div>
          </div>
        </div>`;
      })() : klinisTab === 'racikan' ? `
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
              ${(() => {
                const prof = S().getStoreProfile ? S().getStoreProfile() : {};
                return `<div class="font-extrabold tracking-wide">${S().esc((prof.nama_usaha || 'APOTEK ONS FARMA').toUpperCase())}</div>
                  <div class="text-[10px]">${S().esc(prof.nama_pemilik || 'apt. Anissa Faradifa R. Is Rumi')} &bull; SIPA: ${S().esc(prof.sipa_pemilik || '19920412/SIPA_35.78/2025/1042')}</div>`;
              })()}
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

  global.setPioMeta = (k, v) => { pioState[k] = v; global.renderActiveView(); };
  global.togglePioJadwal = (slotKey) => {
    const arr = Array.isArray(pioState.jadwalKeys) ? pioState.jadwalKeys.slice() : [];
    const idx = arr.indexOf(slotKey);
    if (idx >= 0) arr.splice(idx, 1);
    else arr.push(slotKey);
    pioState.jadwalKeys = arr;
    global.renderActiveView();
  };
  global.pickPioMember = (idMbr) => {
    const m = (S().AppState.members || []).find((x) => x.id_member === idMbr);
    pioState.idMember = idMbr || '';
    if (m) {
      pioState.pasien = m.nama_pasien || pioState.pasien;
      pioState.noWa = m.no_hp || pioState.noWa;
    }
    global.renderActiveView();
  };
  global.submitPioRecord = async () => {
    try {
      const itemsList = String(pioState.itemsText || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean).join('; ');
      await API().callApi('klinis.save', {
        id_member: pioState.idMember || 'UMUM',
        nama_pasien: pioState.pasien || 'Pasien Umum',
        dokter_asal: 'Pelayanan Informasi Obat (PIO) Apoteker',
        layanan_jenis: 'PIO',
        cdss_warning: 'Jadwal Minum: ' + (pioState.jadwalKeys || []).join(', '),
        soap_notes: 'Obat: ' + itemsList + ' | Catatan PIO: ' + (pioState.catatan || '-')
      }, { isWrite: true });
      global.toast('Kartu PIO & Edukasi Pasien berhasil tersimpan ke arsip SOAP!', 'ok');
      await global.bootLoadState(true);
    } catch (e) { global.toast(e.message, 'err'); }
  };
  global.printPioCard = () => {
    const prof = S().getStoreProfile ? S().getStoreProfile() : {};
    const rows = String(pioState.itemsText || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    S().printHtmlZone(`<div style="max-width:520px;margin:0 auto;border:2px solid #0f172a;padding:16px;font-family:Arial,sans-serif;font-size:12px;">
      <div style="text-align:center;border-bottom:2px solid #0f172a;padding-bottom:8px;margin-bottom:10px;">
        <div style="font-size:15px;font-weight:bold;">KARTU INFORMASI OBAT (PIO)</div>
        <div style="font-size:12px;font-weight:bold;">${S().esc((prof.nama_usaha || 'APOTEK ONS FARMA').toUpperCase())}</div>
        <div style="font-size:10px;">Apoteker: ${S().esc(prof.nama_pemilik || 'apt. Anissa Faradifa R. Is Rumi')} &bull; SIPA: ${S().esc(prof.sipa_pemilik || '-')}</div>
      </div>
      <div style="margin-bottom:10px;"><b>Nama Pasien:</b> ${S().esc(pioState.pasien)} &bull; <b>Jadwal Utama:</b> ${S().esc((pioState.jadwalKeys || []).join(', ') || 'Sesuai etiket')}</div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:10px;">
        <thead><tr style="background:#f1f5f9;"><th style="border:1px solid #cbd5e1;padding:6px;text-align:left;">No</th><th style="border:1px solid #cbd5e1;padding:6px;text-align:left;">Obat &amp; Aturan Minum</th></tr></thead>
        <tbody>${rows.map((r, i) => `<tr><td style="border:1px solid #cbd5e1;padding:6px;">${i + 1}</td><td style="border:1px solid #cbd5e1;padding:6px;">${S().esc(r)}</td></tr>`).join('')}</tbody>
      </table>
      <div style="background:#f8fafc;border:1px dashed #64748b;padding:8px;font-size:11px;"><b>Pesan Apoteker:</b> ${S().esc(pioState.catatan || '-')}</div>
    </div>`);
  };
  global.openPioFromMember = (idMbr) => {
    global.pickPioMember(idMbr);
    S().closeDrawer();
    if (global.navigateView) global.navigateView('klinis', 'pio');
  };
  global.openMemberProfileDrawer = (idMember) => {
    const m = (S().AppState.members || []).find((x) => x.id_member === idMember);
    if (!m) return;
    let skr = [];
    try { skr = JSON.parse(m.riwayat_skrining_json || '[]'); } catch (e) {}
    const klinisLogs = (S().AppState.rekamKlinis || []).filter((k) => k.id_member === m.id_member || String(k.nama_pasien || '').toLowerCase() === String(m.nama_pasien || '').toLowerCase());
    S().openDrawer(`<div class="p-5 space-y-4 text-xs">
      <div class="flex items-start justify-between gap-2 pb-3 border-b" style="border-color:var(--ons-border)">
        <div>
          <span class="badge-bpom bpom-terbatas">${S().esc(S().formatMemberProgram ? S().formatMemberProgram(m.program_prb) : (m.program_prb || 'MEMBER'))}</span>
          <h3 class="text-base font-extrabold mt-1">${S().esc(m.nama_pasien)}</h3>
          <div class="font-mono-num" style="color:var(--ons-text-soft)">ID: ${S().esc(m.id_member)} &bull; WA: ${S().esc(m.no_hp || '-')}</div>
        </div>
        <button onclick="ONSStore.closeDrawer()" class="text-xl px-2">&times;</button>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div class="p-3 rounded-xl border border-red-500/30 bg-red-500/5">
          <div class="text-[11px] font-bold text-red-600">ALERGI OBAT</div>
          <div class="font-semibold mt-0.5">${S().esc(m.alergi_list || 'Tidak Ada')}</div>
        </div>
        <div class="p-3 rounded-xl border" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
          <div class="text-[11px]" style="color:var(--ons-text-soft)">Poin &amp; Jadwal Refill</div>
          <div class="font-bold font-mono-num mt-0.5">${m.poin_loyalitas || 0} Poin &bull; ${S().esc(m.tgl_habis_obat || '-')}</div>
        </div>
      </div>
      <div>
        <div class="font-bold mb-1.5">Riwayat Skrining Klinis (${skr.length})</div>
        <div class="space-y-1.5 max-h-40 overflow-y-auto">
          ${skr.length ? skr.slice().reverse().map((s) => `<div class="p-2 rounded-lg border font-mono-num flex justify-between" style="border-color:var(--ons-border)">
            <span>${S().esc(s.tgl || '-')}</span><span>TD ${S().esc(s.td)} | GDS ${S().esc(s.gds)} | BMI ${S().esc(s.bmi)}</span>
          </div>`).join('') : '<div style="color:var(--ons-text-soft)">Belum ada riwayat skrining.</div>'}
        </div>
      </div>
      <div>
        <div class="font-bold mb-1.5">Catatan SOAP &amp; PIO Terkait (${klinisLogs.length})</div>
        <div class="space-y-1.5 max-h-44 overflow-y-auto">
          ${klinisLogs.length ? klinisLogs.slice(0, 6).map((k) => `<div class="p-2 rounded-lg border" style="border-color:var(--ons-border)">
            <div class="flex justify-between font-semibold"><span>${S().esc(k.layanan_jenis)}</span><span class="font-mono-num">${S().formatTgl(k.tanggal)}</span></div>
            <div style="color:var(--ons-text-soft)">${S().esc(k.soap_notes || '-')}</div>
          </div>`).join('') : '<div style="color:var(--ons-text-soft)">Belum ada rekam SOAP/PIO tercatat.</div>'}
        </div>
      </div>
      <div class="flex gap-2 pt-2 border-t" style="border-color:var(--ons-border)">
        <button onclick="window.openSkriningModal('${S().esc(m.id_member)}')" class="ons-btn ons-btn-ghost flex-1">+ Catat Skrining</button>
        <button onclick="window.openPioFromMember('${S().esc(m.id_member)}')" class="ons-btn ons-btn-primary flex-1">Buat Kartu PIO WA &rarr;</button>
      </div>
    </div>`, '430px');
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
    const prof = S().getStoreProfile ? S().getStoreProfile() : {};
    S().printHtmlZone(`<div style="width:55mm;border:2px solid #000;background:${bg};padding:6px;font-family:Arial,sans-serif;font-size:10px;">
      <div style="text-align:center;border-bottom:1px solid #000;padding-bottom:3px;font-weight:bold;">${S().esc((prof.nama_usaha || 'APOTEK ONS FARMA').toUpperCase())}<br/><span style="font-size:8px;font-weight:normal;">SIPA: ${S().esc(prof.sipa_pemilik || '19920412/SIPA_35.78/2025/1042')}</span></div>
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
        <div><label class="font-semibold block mb-1">Dokter Penulis Resep</label><input id="klDokter" list="onsDokterDatalist" class="ons-input" value="dr. Andi Pratama, Sp.PD"/></div>
      </div>
      ${S().renderDokterDatalistHtml ? S().renderDokterDatalistHtml('onsDokterDatalist') : ''}
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
    const stroke = last >= 200 ? '#DC2626' : (last >= 140 ? '#D97706' : '#10B981');
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

    const fmtProg = (p) => (S().formatMemberProgram ? S().formatMemberProgram(p) : (p || 'MEMBER'));
    const pq = prbSearchQ.trim().toLowerCase();
    const filteredMembers = (st.members || []).filter((m) => {
      const prog = fmtProg(m.program_prb);
      if (prbFilter === 'MEMBER_RUTIN' && prog !== 'MEMBER_RUTIN' && prog !== 'TERAPI_RUTIN') return false;
      if (prbFilter === 'UMUM' && prog !== 'UMUM') return false;
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
      <div class="ons-page-header">
        <div>
          <h1 class="text-xl font-extrabold">E-Resep Dokter Mitra, Skrining Kesehatan &amp; Pantau Pasien Rutin</h1>
          <p class="text-xs" style="color:var(--ons-text-soft)">Validasi PIN APJ antrean resep dokter mitra, skrining TDS/GDS/BMI dengan grafik sparkline, &amp; pengingat refill obat rutin apotek.</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <div class="ons-tab-bar">
            <button onclick="window.setEresepTab('erx')" class="ons-tab-btn ${eresepTab === 'erx' ? 'active' : ''}">Antrean E-Resep (${antreCount}/${erxAll.length})</button>
            <button onclick="window.setEresepTab('prb')" class="ons-tab-btn ${eresepTab === 'prb' ? 'active' : ''}">Pasien Rutin &amp; Skrining (${(st.members || []).length})</button>
          </div>
          <button onclick="window.openSkriningModal()" class="ons-btn ons-btn-emerald text-xs">+ Catat Skrining</button>
          <button onclick="window.openAddMemberPrbModal()" class="ons-btn ons-btn-primary text-xs">+ Pasien / Member</button>
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
                  { id: 'MEMBER_RUTIN', label: 'Pasien Terapi Rutin' },
                  { id: 'UMUM', label: 'Member Umum' },
                  { id: 'HABIS_SEGERA', label: 'Habis <=5 Hari' }
                ].map((f) => `<button onclick="window.setPrbFilter('${f.id}')" class="ons-tab-btn ${prbFilter === f.id ? 'active' : ''}">${f.label}</button>`).join('')}
              </div>
            </div>
            <button onclick="navigateView('billing','tagihan')" class="ons-btn ons-btn-ghost text-xs">Tagihan Pasien &rarr;</button>
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
                    <td class="text-xs"><span class="badge-bpom bpom-terbatas">${S().esc(fmtProg(m.program_prb))}</span><div class="mt-1">${S().esc(m.penyakit_kronis)}</div></td>
                    <td class="font-mono-num text-xs">${m.tgl_habis_obat ? `<span class="badge-bpom ${daysLeft <= 3 ? 'bpom-keras' : (daysLeft <= 7 ? 'bpom-prekursor' : 'bpom-bebas')}">${m.tgl_habis_obat} (${daysLeft}h)</span>` : '-'}</td>
                    <td class="font-mono-num font-bold text-blue-600">${m.poin_loyalitas || 0}</td>
                    <td class="text-xs font-mono-num">
                      <div>${lastSkr ? `TD ${S().esc(lastSkr.td)} | GDS ${S().esc(lastSkr.gds)} | BMI ${S().esc(lastSkr.bmi)}` : '-'}</div>
                      <div>${_renderSkriningSparkline(skrList)}</div>
                    </td>
                    <td>
                      <div class="flex flex-wrap gap-1">
                        <button onclick="window.openMemberProfileDrawer('${S().esc(m.id_member)}')" class="ons-btn ons-btn-primary text-xs py-1 px-2">Profil</button>
                        <button onclick="window.openSkriningModal('${S().esc(m.id_member)}')" class="ons-btn ons-btn-ghost text-xs py-1 px-2">+ Skrining</button>
                        ${(() => {
                          if (!m.no_hp) return '';
                          const profPrb = S().getStoreProfile ? S().getStoreProfile() : {};
                          const apotekNm = profPrb.nama_usaha || 'Apotek ONS Farma';
                          const eApotekUrl = global.location.origin + global.location.pathname + '?katalog=1';
                          const waBody = [
                            'Halo *' + m.nama_pasien + '*,',
                            'Pengingat Refill Obat Rutin (' + (m.penyakit_kronis || fmtProg(m.program_prb)) + ') dari *' + apotekNm + '*.',
                            'Jadwal habis obat: *' + (m.tgl_habis_obat || 'minggu ini') + '*.',
                            'Skrining terakhir: ' + (lastSkr ? ('TD ' + lastSkr.td + ', GDS ' + lastSkr.gds + ', BMI ' + lastSkr.bmi) : 'Terpantau baik') + '.',
                            'Pesan ulang online langsung: ' + eApotekUrl,
                            'Apoteker: ' + (profPrb.nama_pemilik || 'apt. Anissa Faradifa R. Is Rumi')
                          ].join('\n');
                          const hrefWa = S().buildWaUrl ? S().buildWaUrl(m.no_hp, waBody) : ('https://wa.me/' + m.no_hp + '?text=' + encodeURIComponent(waBody));
                          return `<a target="_blank" rel="noopener" href="${S().esc(hrefWa)}" class="ons-btn ons-btn-emerald text-xs py-1 px-2">WA Refill (Gratis)</a>`;
                        })()}
                      </div>
                    </td>
                  </tr>`;
                }).join('') : '<tr><td colspan="6" class="text-center py-6 text-xs">Tidak ada pasien / member sesuai filter ini.</td></tr>'}
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
      <div class="flex justify-between items-center"><h3 class="font-bold text-base">Catat Skrining Metabolik Pasien (TD / GDS / IMT)</h3><button onclick="ONSStore.closeModal()" class="text-xl">&times;</button></div>
      <div class="p-2.5 rounded-lg border text-[11px]" style="background:var(--ons-bg-subtle);border-color:var(--ons-border);color:var(--ons-text-soft)">
        <b>Acuan Normal (Kemenkes RI / PERKI / PERKENI):</b> TD &lt;120/80 mmHg (L/P) &bull; GDS &lt;140 mg/dL (L/P) &bull; IMT Kemenkes <b>18.5–25.0</b> (Asia-Pasifik 18.5–22.9 &bull; Gemuk 25.1–27.0 &bull; Obesitas &gt;27.0) &bull; Lingkar Perut aman: <b>L &lt;90 / P &lt;80 cm</b>.
      </div>
      <div><label class="font-semibold block mb-1">Pilih Pasien</label><select id="skrMemId" class="ons-select">${members.map((m) => `<option value="${S().esc(m.id_member)}" ${m.id_member === idMember ? 'selected' : ''}>${S().esc(m.nama_pasien)} (${S().esc(S().formatMemberProgram ? S().formatMemberProgram(m.program_prb) : m.program_prb)})</option>`).join('')}</select></div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="font-semibold block mb-1">Tekanan Darah (mmHg)</label><input id="skrTd" class="ons-input font-mono-num" value="125/80"/></div>
        <div><label class="font-semibold block mb-1">Gula Darah Sewaktu (mg/dL)</label><input id="skrGds" type="number" class="ons-input font-mono-num" value="118"/></div>
        <div><label class="font-semibold block mb-1">Berat Badan (kg)</label><input id="skrBb" type="number" class="ons-input font-mono-num" value="65" oninput="window.recalcSkriningBmi()"/></div>
        <div><label class="font-semibold block mb-1">Tinggi Badan (cm)</label><input id="skrTb" type="number" class="ons-input font-mono-num" value="168" oninput="window.recalcSkriningBmi()"/></div>
      </div>
      <div class="p-2.5 rounded-lg border font-mono-num text-center" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">IMT Terhitung: <b id="skrBmiOut">23.0</b> <span id="skrBmiCat" class="font-sans font-semibold text-[11px] text-emerald-700 dark:text-emerald-300">(Normal Kemenkes · Waspada Asia-Pasifik ≥23)</span></div>
      <button onclick="window.saveSkriningSubmit()" class="ons-btn ons-btn-emerald w-full">Simpan Skrining ke Rekam Pasien</button>
    </div>`, '500px');
    setTimeout(() => { if (typeof global.recalcSkriningBmi === 'function') global.recalcSkriningBmi(); }, 10);
  };

  global.recalcSkriningBmi = () => {
    const bb = Number((document.getElementById('skrBb') || {}).value || 0);
    const tb = Number((document.getElementById('skrTb') || {}).value || 0) / 100;
    const el = document.getElementById('skrBmiOut');
    const catEl = document.getElementById('skrBmiCat');
    if (el && bb > 0 && tb > 0) {
      const imt = Math.round((bb / (tb * tb)) * 10) / 10;
      el.textContent = imt.toFixed(1);
      if (catEl) {
        if (imt < 18.5) {
          catEl.className = 'font-sans font-semibold text-[11px] text-sky-600 dark:text-sky-300';
          catEl.textContent = '(BB Kurang / Kurus <18.5)';
        } else if (imt <= 25.0) {
          catEl.className = 'font-sans font-semibold text-[11px] text-emerald-700 dark:text-emerald-300';
          catEl.textContent = imt >= 23.0 ? '(Normal Kemenkes · Waspada Asia-Pasifik ≥23)' : '(Normal Ideal L/P)';
        } else if (imt <= 27.0) {
          catEl.className = 'font-sans font-semibold text-[11px] text-amber-600 dark:text-amber-300';
          catEl.textContent = '(Gemuk Ringan / Overweight 25.1–27.0)';
        } else {
          catEl.className = 'font-sans font-semibold text-[11px] text-red-600 dark:text-red-300';
          catEl.textContent = '(Obesitas >27.0 Kemenkes RI)';
        }
      }
    }
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
      <div class="flex justify-between items-center"><h3 class="font-bold text-base">Daftar Pasien / Member Baru</h3><button onclick="ONSStore.closeModal()" class="text-xl">&times;</button></div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="font-semibold block mb-1">Nama Pasien *</label><input id="mbNama" class="ons-input"/></div>
        <div><label class="font-semibold block mb-1">No. WhatsApp (628..)</label><input id="mbHp" class="ons-input font-mono-num" placeholder="62812xxxx"/></div>
        <div><label class="font-semibold block mb-1">Segmen / Kategori</label><select id="mbProg" class="ons-select"><option value="UMUM">UMUM</option><option value="MEMBER_RUTIN">MEMBER_RUTIN</option><option value="MITRA_KLINIK">MITRA_KLINIK</option></select></div>
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
      global.toast('Data pasien baru tersimpan!', 'ok');
      await global.bootLoadState(true);
    } catch (e) { global.toast(e.message, 'err'); }
  };

  /**
   * W-10 BAGIAN A: Keuangan Apotek Digital v17.28 (Daftar Akun Kas, Buku Kas, Utang Usaha, Piutang Usaha, Laba-Rugi P&L, Pajak & Slip Gaji)
   */
  const KAS_ACCOUNTS_KEY = 'ONS_KAS_ACCOUNTS_V1';
  const MANUAL_UTANG_KEY = 'ONS_MANUAL_UTANG_V1';
  const MANUAL_PIUTANG_KEY = 'ONS_MANUAL_PIUTANG_V1';
  const TTF_PIUTANG_KEY = 'ONS_TTF_PIUTANG_V1';

  function _readFinLocalList(key) {
    try {
      const raw = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(raw) ? raw : [];
    } catch (e) { return []; }
  }
  function _writeFinLocalList(key, arr) {
    try { localStorage.setItem(key, JSON.stringify(arr || [])); } catch (e) {}
  }
  function _getKasAccountsList() {
    let list = _readFinLocalList(KAS_ACCOUNTS_KEY);
    if (!list.length) {
      list = [{ id_akun: 'KAS-01', nama: 'Kas Utama', deskripsi: 'Akun Kas Utama', kode_kustom: '1-101', catatan: '', jenis: 'other', saldo_awal: 0, status: 'Aktif' }];
      _writeFinLocalList(KAS_ACCOUNTS_KEY, list);
    }
    return list;
  }
  function _resolveJurnalAkunId(j, accounts) {
    const ref = String(j.referensi_id || '');
    const mTag = ref.match(/\[AKUN:([A-Z0-9_-]+)\]/i);
    if (mTag) {
      const found = accounts.find((a) => a.id_akun === mTag[1]);
      if (found) return found.id_akun;
    }
    if (j.id_akun && accounts.some((a) => a.id_akun === j.id_akun)) return j.id_akun;
    const metLower = String(j.metode || '').toLowerCase();
    const byName = accounts.find((a) => metLower && (metLower === String(a.nama || '').toLowerCase() || metLower.includes(String(a.nama || '').toLowerCase())));
    if (byName) return byName.id_akun;
    return (accounts[0] && accounts[0].id_akun) || 'KAS-01';
  }
  function _computeKasAccountsWithBalance(st) {
    const accounts = _getKasAccountsList();
    const balMap = new Map();
    accounts.forEach((a) => balMap.set(a.id_akun, Number(a.saldo_awal || 0)));
    (st.jurnalKeuangan || []).forEach((j) => {
      const akId = _resolveJurnalAkunId(j, accounts);
      const isMasuk = String(j.jenis_trx || '').toUpperCase().includes('MASUK');
      const delta = isMasuk ? Number(j.nominal || 0) : -Number(j.nominal || 0);
      balMap.set(akId, (balMap.get(akId) || 0) + delta);
    });
    return accounts.map((a) => Object.assign({}, a, { saldo_saat_ini: balMap.get(a.id_akun) || 0 }));
  }

  function renderFinanceView() {
    const st = S().AppState;
    financeTab = (st.subTabs && st.subTabs.finance) || financeTab || 'pnl';

    const inDateRange = (isoDate) => {
      const d = String(isoDate || '').slice(0, 10);
      if (financeDateFrom && (!d || d < financeDateFrom)) return false;
      if (financeDateTo && (!d || d > financeDateTo)) return false;
      return true;
    };

    const kasAccounts = _computeKasAccountsWithBalance(st);
    const jurnalAll = (st.jurnalKeuangan || []);
    const jurnalScoped = jurnalAll.filter((j) => inDateRange(j.tanggal));
    const salesValid = (st.penjualan || []).filter((p) => String(p.status_trx || 'LUNAS') !== 'RETUR' && inDateRange(p.tanggal));

    const totalMasuk = jurnalScoped.filter((j) => String(j.jenis_trx).includes('MASUK')).reduce((s, j) => s + Number(j.nominal || 0), 0);
    const totalKeluar = jurnalScoped.filter((j) => !String(j.jenis_trx).includes('MASUK')).reduce((s, j) => s + Number(j.nominal || 0), 0);
    const ppnKeluaran = Math.round((salesValid.reduce((s, p) => s + Number(p.grand_total || 0), 0) || totalMasuk) * 0.11);
    const ppnMasukanFaktur = (st.fakturPbf || []).reduce((s, f) => s + Number(f.ppn_masukan || 0), 0);
    const ppnKurangBayar = Math.max(0, ppnKeluaran - ppnMasukanFaktur);
    const pphFinal = Math.round((salesValid.reduce((s, p) => s + Number(p.grand_total || 0), 0) || totalMasuk) * 0.005);

    const openFakturPbf = st.fakturPbf.filter((f) => Number(f.sisa_hutang || 0) > 0 && String(f.status_bayar || '').toUpperCase() !== 'KONSINYASI' && String(f.jenis_penerimaan || '').toUpperCase() !== 'KONSINYASI');
    const manualUtang = _readFinLocalList(MANUAL_UTANG_KEY).filter((u) => Number(u.sisa_utang || 0) > 0);
    const combinedOpenUtang = [
      ...openFakturPbf.map((f) => ({
        is_manual: false,
        id_row: f.id_beli,
        waktu_trx: String(f.tgl_terima || f.tgl_faktur || '').slice(0, 10),
        kreditur: f.id_pbf || '-',
        no_faktur: f.no_faktur_pbf || f.id_beli || '-',
        keterangan: f.catatan || ('Faktur Pembelian ' + (f.no_sp || '')),
        tgl_jatuh_tempo: f.tgl_jatuh_tempo || '',
        nominal_awal: Number(f.netto_hutang || f.total_bruto || f.sisa_hutang || 0),
        nominal_sisa: Number(f.sisa_hutang || 0)
      })),
      ...manualUtang.map((u) => ({
        is_manual: true,
        id_row: u.id_utang,
        waktu_trx: String(u.waktu_trx || '').slice(0, 10),
        kreditur: u.id_pbf || '-',
        no_faktur: u.kode_faktur || u.kode_eksternal || u.id_utang,
        keterangan: u.catatan || ('Utang Manual (' + (u.akun_lawan || '-') + ')'),
        tgl_jatuh_tempo: u.tgl_jatuh_tempo || '',
        nominal_awal: Number(u.jumlah_utang || 0),
        nominal_sisa: Number(u.sisa_utang || 0)
      }))
    ];

    const apBuckets = [0, 0, 0, 0];
    combinedOpenUtang.forEach((f) => {
      const h = S().daysUntil(f.tgl_jatuh_tempo);
      const wIdx = h <= 7 ? 0 : (h <= 14 ? 1 : (h <= 21 ? 2 : 3));
      apBuckets[wIdx] += Number(f.nominal_sisa || 0);
    });
    const maxAp = Math.max(...apBuckets, 1);

    const omzetPos = salesValid.reduce((s, p) => s + Number(p.grand_total || 0), 0);
    const totalHppPos = salesValid.reduce((s, p) => s + Number(p.total_hpp || 0), 0);
    const grossProfit = omzetPos - totalHppPos;
    const grossMarginPct = omzetPos > 0 ? ((grossProfit / omzetPos) * 100).toFixed(1) : '0.0';
    const bebanOps = jurnalScoped.filter((j) => String(j.jenis_trx || '') === 'KELUAR_OPERASIONAL').reduce((s, j) => s + Number(j.nominal || 0), 0);
    const netProfit = grossProfit - bebanOps;
    const isKonsinyasiStock = (b) => String(b.is_konsinyasi || '').toUpperCase() === 'YA' || String(b.is_konsinyasi || '').toUpperCase() === 'TRUE';
    const activeBatches = (st.stokBatch || []).filter((b) => String(b.status_batch || 'AKTIF') === 'AKTIF' && Number(b.qty_sisa || 0) > 0);
    const valuasiAsetStok = activeBatches.filter((b) => !isKonsinyasiStock(b))
      .reduce((s, b) => s + Number(b.qty_sisa || 0) * Number(b.hpp_beli || 0), 0);
    const valuasiKonsinyasi = activeBatches.filter((b) => isKonsinyasiStock(b))
      .reduce((s, b) => s + Number(b.qty_sisa || 0) * Number(b.hpp_beli || 0), 0);

    const payMethodMap = { TUNAI: 0, QRIS: 0, TRANSFER: 0, SPLIT: 0 };
    salesValid.forEach((p) => {
      const m = String(p.metode_bayar || 'TUNAI').toUpperCase();
      payMethodMap[m] = (payMethodMap[m] || 0) + Number(p.grand_total || 0);
    });

    const filteredJurnal = jurnalScoped.filter((j) => {
      if (jurnalFilter === 'MASUK' && !String(j.jenis_trx).includes('MASUK')) return false;
      if (jurnalFilter === 'KELUAR' && String(j.jenis_trx).includes('MASUK')) return false;
      if (kasBookAccountFilter && kasBookAccountFilter !== 'SEMUA') {
        if (_resolveJurnalAkunId(j, kasAccounts) !== kasBookAccountFilter) return false;
      }
      if (kasBookSearchQ) {
        const hay = `${j.kategori || ''} ${j.referensi_id || ''} ${j.jenis_trx || ''} ${j.metode || ''}`.toLowerCase();
        if (!hay.includes(kasBookSearchQ.toLowerCase())) return false;
      }
      return true;
    });

    const manualPiutang = _readFinLocalList(MANUAL_PIUTANG_KEY);
    const piutangList = [
      ...(st.piutangPelanggan || []).map((pt) => Object.assign({}, pt, { is_manual: false })),
      ...manualPiutang.map((pt) => Object.assign({}, pt, { is_manual: true }))
    ];
    const openPiutang = piutangList.filter((pt) => String(pt.status_piutang || '').toUpperCase() !== 'LUNAS');
    const totalPiutangOpen = openPiutang.reduce((s, pt) => s + Number(pt.sisa_piutang || 0), 0);

    return `<div class="space-y-5 ons-view-enter">
      <div class="ons-page-header">
        <div>
          <h1 class="text-xl font-extrabold">Keuangan, Akun Kas, Buku Kas, Utang &amp; Piutang Usaha</h1>
          <p class="text-xs" style="color:var(--ons-text-soft)">Analisis P&amp;L &amp; aset FEFO, daftar akun kas, buku kas harian &amp; lock periode, piutang usaha &amp; TTF, utang PBF, pajak &amp; slip gaji A4.</p>
        </div>
        <div class="ons-tab-bar">
          <button onclick="window.setFinanceTab('pnl')" class="ons-tab-btn ${financeTab === 'pnl' ? 'active' : ''}">Laba-Rugi (P&amp;L)</button>
          <button onclick="window.setFinanceTab('akun-kas')" class="ons-tab-btn ${financeTab === 'akun-kas' ? 'active' : ''}">Daftar Akun Kas (${kasAccounts.length})</button>
          <button onclick="window.setFinanceTab('jurnal')" class="ons-tab-btn ${financeTab === 'jurnal' ? 'active' : ''}">Buku Kas &amp; Lock (${jurnalScoped.length})</button>
          <button onclick="window.setFinanceTab('piutang')" class="ons-tab-btn ${financeTab === 'piutang' ? 'active' : ''}">Piutang Pelanggan (${openPiutang.length})</button>
          <button onclick="window.setFinanceTab('hutang')" class="ons-tab-btn ${financeTab === 'hutang' ? 'active' : ''}">Hutang Faktur PBF (${combinedOpenUtang.length})</button>
          <button onclick="window.setFinanceTab('pajak')" class="ons-tab-btn ${financeTab === 'pajak' ? 'active' : ''}">Pajak &amp; Slip Gaji</button>
        </div>
      </div>

      ${financeTab === 'akun-kas' ? (() => {
        const akFiltered = kasAccounts.filter((a) => {
          if (akunKasStatusFilter !== 'SEMUA' && String(a.status || 'Aktif').toUpperCase() !== akunKasStatusFilter) return false;
          if (akunKasSearchQ) {
            const hay = `${a.nama || ''} ${a.deskripsi || ''} ${a.kode_kustom || ''}`.toLowerCase();
            if (!hay.includes(akunKasSearchQ.toLowerCase())) return false;
          }
          return true;
        });
        const totalSaldoKas = akFiltered.reduce((s, a) => s + Number(a.saldo_saat_ini || 0), 0);
        return `<div class="ons-card p-4 space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 class="font-bold text-base">Daftar Akun Kas</h3>
              <p class="text-[11px]" style="color:var(--ons-text-soft)">Kelola akun kas tunai, rekening bank &amp; e-wallet serta transfer saldo antar kas.</p>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <button type="button" onclick="window.exportAkunKasExcel()" class="ons-btn ons-btn-ghost text-xs">Excel</button>
              <button type="button" onclick="window.openAddAkunKasModal()" class="ons-btn ons-btn-emerald text-xs font-bold">+ Akun Kas Baru</button>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <input class="ons-input text-xs w-56" placeholder="Cari data akun kas..." value="${S().esc(akunKasSearchQ)}" oninput="window.setAkunKasSearchQ(this.value)"/>
            <select class="ons-select text-xs w-40" onchange="window.setAkunKasStatusFilter(this.value)">
              <option value="SEMUA" ${akunKasStatusFilter === 'SEMUA' ? 'selected' : ''}>Filter: Semua</option>
              <option value="AKTIF" ${akunKasStatusFilter === 'AKTIF' ? 'selected' : ''}>Status: Aktif</option>
              <option value="NONAKTIF" ${akunKasStatusFilter === 'NONAKTIF' ? 'selected' : ''}>Status: Nonaktif</option>
            </select>
          </div>
          <div class="ons-table-wrap">
            <table class="ons-table">
              <thead><tr><th>No.</th><th>Nama</th><th>Deskripsi</th><th>Jenis</th><th class="text-right">Saldo Saat Ini</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                ${akFiltered.length ? akFiltered.map((a, idx) => `<tr>
                  <td class="font-mono-num text-xs">${idx + 1}</td>
                  <td class="text-xs font-bold">${S().esc(a.nama)}${a.kode_kustom ? `<div class="font-mono-num text-[10px]" style="color:var(--ons-text-soft)">${S().esc(a.kode_kustom)}</div>` : ''}</td>
                  <td class="text-xs">${S().esc(a.deskripsi || '-')}</td>
                  <td><span class="badge-bpom bpom-terbatas uppercase">${S().esc(a.jenis || 'other')}</span></td>
                  <td class="text-right font-mono-num text-xs font-bold ${a.saldo_saat_ini >= 0 ? 'text-emerald-600' : 'text-red-600'}">${S().rp(a.saldo_saat_ini)}</td>
                  <td><span class="badge-bpom bpom-bebas">${S().esc(a.status || 'Aktif')}</span></td>
                  <td>
                    <div class="flex flex-wrap gap-1.5">
                      <button type="button" onclick="window.openTransferKasModal('${S().esc(a.id_akun)}')" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2.5">Transfer</button>
                      <button type="button" onclick="window.openBukuKasForAkun('${S().esc(a.id_akun)}')" class="ons-btn ons-btn-primary text-[11px] py-1 px-2.5">Buku Kas</button>
                    </div>
                  </td>
                </tr>`).join('') : '<tr><td colspan="7" class="text-center py-6 text-xs">Data akun kas tidak ditemukan.</td></tr>'}
              </tbody>
            </table>
          </div>
          <div class="p-3 rounded-xl border flex flex-wrap justify-between items-center text-xs" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
            <span>Total Akun Aktif: <b class="font-mono-num">${akFiltered.length} akun</b></span>
            <span>Total Saldo Kas &amp; Bank: <b class="font-mono-num text-sm text-emerald-600">${S().rp(totalSaldoKas)}</b></span>
          </div>
        </div>`;
      })() : financeTab === 'jurnal' ? (() => {
        // Compute chronological running balance for Buku Kas
        let runBal = 0;
        const ascScoped = filteredJurnal.slice().map((j) => {
          const isM = String(j.jenis_trx || '').includes('MASUK');
          const nom = Number(j.nominal || 0);
          runBal += isM ? nom : -nom;
          return Object.assign({}, j, { _isMasuk: isM, _masuk: isM ? nom : 0, _keluar: isM ? 0 : nom, _saldo: runBal });
        });
        const scopedMasuk = ascScoped.reduce((s, x) => s + x._masuk, 0);
        const scopedKeluar = ascScoped.reduce((s, x) => s + x._keluar, 0);
        return `<div class="space-y-4">
          <div class="ons-card p-4 space-y-3 text-xs">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 class="font-bold text-base">Buku Kas</h3>
                <span class="text-[11px]" style="color:var(--ons-text-soft)">Catatan pemasukan/pengeluaran kas apotek &amp; penguncian periode bulanan.</span>
              </div>
              <div class="flex flex-wrap gap-2">
                <button type="button" onclick="window.openCreateKasTransaksiModal('KELUAR')" class="ons-btn ons-btn-emerald text-xs font-bold">+ Transaksi Baru</button>
                <button type="button" onclick="window.lockCurrentFinancePeriod()" class="ons-btn ons-btn-danger text-xs">Kunci Periode Bulan Ini</button>
              </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-2 border-t" style="border-color:var(--ons-border)">
              <select id="jrInlineJenis" class="ons-select sm:col-span-3">
                <option value="KELUAR_OPERASIONAL">KELUAR_OPERASIONAL (Biaya/Petty Cash)</option>
                <option value="MASUK_LAINNYA">MASUK_LAINNYA (Pemasukan Lain)</option>
              </select>
              <input id="jrInlineKat" class="ons-input sm:col-span-5" placeholder="Input cepat: keterangan biaya / pemasukan (cth. Beli kertas struk 58mm)"/>
              <input id="jrInlineNom" type="number" min="1" class="ons-input font-mono-num sm:col-span-2" placeholder="Nominal (Rp)"/>
              <button onclick="window.saveInlineJurnal()" class="ons-btn ons-btn-primary sm:col-span-2">+ Catat Jurnal</button>
            </div>
          </div>

          <div class="ons-card p-4 space-y-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex flex-wrap items-center gap-2">
                <select class="ons-select text-xs w-44" onchange="window.setKasBookAccountFilter(this.value)">
                  <option value="SEMUA" ${kasBookAccountFilter === 'SEMUA' ? 'selected' : ''}>Semua Akun Kas</option>
                  ${kasAccounts.map((a) => `<option value="${S().esc(a.id_akun)}" ${kasBookAccountFilter === a.id_akun ? 'selected' : ''}>${S().esc(a.nama)}</option>`).join('')}
                </select>
                <input class="ons-input text-xs w-44" placeholder="Cari data aktivitas..." value="${S().esc(kasBookSearchQ)}" oninput="window.setKasBookSearchQ(this.value)"/>
                <input type="date" class="ons-input text-xs w-36" value="${S().esc(financeDateFrom)}" onchange="window.setFinanceDateRange(this.value, '${S().esc(financeDateTo)}')"/>
                <input type="date" class="ons-input text-xs w-36" value="${S().esc(financeDateTo)}" onchange="window.setFinanceDateRange('${S().esc(financeDateFrom)}', this.value)"/>
                <div class="ons-tab-bar">
                  ${['SEMUA', 'MASUK', 'KELUAR'].map((f) => `<button onclick="window.setJurnalFilter('${f}')" class="ons-tab-btn ${jurnalFilter === f ? 'active' : ''}">${f}</button>`).join('')}
                </div>
              </div>
              <button type="button" onclick="window.exportBukuKasExcel()" class="ons-btn ons-btn-ghost text-xs">Excel</button>
            </div>
            <div class="ons-table-wrap">
              <table class="ons-table">
                <thead><tr><th>No.</th><th>Tanggal</th><th>Aktivitas</th><th class="text-right">Masuk</th><th class="text-right">Keluar</th><th class="text-right">Saldo</th><th>Status Lock</th><th>Action</th></tr></thead>
                <tbody>
                  ${ascScoped.length ? ascScoped.slice().reverse().map((j, idx) => `<tr>
                    <td class="font-mono-num text-xs">${idx + 1}</td>
                    <td class="font-mono-num text-xs">${S().formatTgl(j.tanggal)}</td>
                    <td class="text-xs"><b>${S().esc(j.kategori)}</b><div class="text-[10px]" style="color:var(--ons-text-soft)">${S().esc(j.jenis_trx)} &bull; Ref: ${S().esc(j.referensi_id || '-')} &bull; ${S().esc(j.metode || 'Kas Utama')}</div></td>
                    <td class="text-right font-mono-num text-xs font-bold text-emerald-600">${j._masuk > 0 ? S().rp(j._masuk) : '-'}</td>
                    <td class="text-right font-mono-num text-xs font-bold text-red-600">${j._keluar > 0 ? S().rp(j._keluar) : '-'}</td>
                    <td class="text-right font-mono-num text-xs font-bold">${S().rp(j._saldo)}</td>
                    <td><span class="badge-bpom ${j.status_lock === 'TERKUNCI' ? 'bpom-keras' : 'bpom-terbatas'}">${S().esc(j.status_lock || 'TERBUKA')}</span></td>
                    <td><button type="button" onclick="window.openKasTrxDetailModal('${S().esc(j.id_jurnal || '')}')" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2">Detail</button></td>
                  </tr>`).join('') : '<tr><td colspan="8" class="text-center py-6 text-xs">Tidak ada entri buku kas pada filter ini.</td></tr>'}
                </tbody>
              </table>
            </div>
            <div class="p-3 rounded-xl border flex flex-wrap justify-between gap-4 text-xs" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
              <div class="font-bold text-blue-600">Rekap Buku Kas (${ascScoped.length} transaksi)</div>
              <div class="flex flex-wrap gap-6 font-mono-num">
                <div>Masuk: <b class="text-emerald-600">${S().rp(scopedMasuk)}</b></div>
                <div>Keluar: <b class="text-red-600">${S().rp(scopedKeluar)}</b></div>
                <div>Saldo Akhir: <b class="text-sm">${S().rp(runBal)}</b></div>
              </div>
            </div>
          </div>
        </div>`;
      })() : financeTab === 'piutang' ? (() => {
        if (piutangSubView === 'ttf') {
          const ttfList = _readFinLocalList(TTF_PIUTANG_KEY).filter((t) => {
            if (piutangSearchQ) {
              const hay = `${t.no_ttf || ''} ${t.kode_faktur || ''} ${t.nama_pelanggan || ''} ${t.sales || ''}`.toLowerCase();
              if (!hay.includes(piutangSearchQ.toLowerCase())) return false;
            }
            return true;
          });
          const totalTtfNom = ttfList.reduce((s, t) => s + Number(t.tagihan_awal || 0), 0);
          return `<div class="ons-card p-4 space-y-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <button type="button" onclick="window.setPiutangSubView('list')" class="ons-btn ons-btn-ghost text-xs">&larr; Kembali</button>
                <h3 class="font-bold text-base">Daftar Tanda Terima Faktur (TTF)</h3>
              </div>
              <div class="flex flex-wrap gap-2">
                <button type="button" onclick="window.openBuatTtfModal('','','0')" class="ons-btn ons-btn-emerald text-xs font-bold">+ Buat TTF</button>
              </div>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <input class="ons-input text-xs w-56" placeholder="Cari no TTF / faktur / pelanggan..." value="${S().esc(piutangSearchQ)}" oninput="window.setPiutangSearchQ(this.value)"/>
            </div>
            <div class="ons-table-wrap">
              <table class="ons-table">
                <thead><tr><th>No.</th><th>Waktu Terbit</th><th>No. Tanda Terima Faktur</th><th>Kode Faktur</th><th>Pelanggan</th><th>Jadwal Penyerahan TTF</th><th>Sales</th><th>Status</th><th class="text-right">Tagihan Awal</th></tr></thead>
                <tbody>
                  ${ttfList.length ? ttfList.map((t, i) => `<tr>
                    <td class="font-mono-num text-xs">${i + 1}</td>
                    <td class="font-mono-num text-xs">${S().esc(String(t.waktu_terbit || '').slice(0, 10))}</td>
                    <td class="font-mono-num text-xs font-bold">${S().esc(t.no_ttf)}</td>
                    <td class="font-mono-num text-xs">${S().esc(t.kode_faktur)}</td>
                    <td class="text-xs font-semibold">${S().esc(t.nama_pelanggan || '-')}</td>
                    <td class="font-mono-num text-xs">${S().esc(t.jadwal_serah || '-')}</td>
                    <td class="text-xs">${S().esc(t.sales || '-')}</td>
                    <td><span class="badge-bpom bpom-terbatas">${S().esc(t.status || 'TERBIT')}</span></td>
                    <td class="text-right font-mono-num text-xs font-bold">${S().rp(t.tagihan_awal || 0)}</td>
                  </tr>`).join('') : '<tr><td colspan="9" class="text-center py-6 text-xs">Data tidak ditemukan. Klik <b>+ Buat TTF</b> atau tombol <b>TTF</b> di daftar Piutang Usaha.</td></tr>'}
                </tbody>
              </table>
            </div>
            <div class="p-3.5 rounded-xl border flex flex-wrap justify-between gap-4 text-xs" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
              <div class="font-bold text-blue-600">Rekap Tanda Terima Faktur</div>
              <div class="flex flex-wrap gap-6">
                <div>Total Nominal Tanda Terima Faktur : <b class="font-mono-num text-sm">${S().rp(totalTtfNom)}</b></div>
                <div>Jumlah Tanda Terima Faktur : <b class="font-mono-num text-sm">${ttfList.length} data</b></div>
              </div>
            </div>
          </div>`;
        }
        if (piutangSubView === 'riwayat') {
          const payRows = jurnalAll.filter((j) => String(j.jenis_trx || '').startsWith('MASUK_PIUTANG')).filter((j) => {
            if (piutangSearchQ) {
              const hay = `${j.id_jurnal || ''} ${j.kategori || ''} ${j.referensi_id || ''}`.toLowerCase();
              if (!hay.includes(piutangSearchQ.toLowerCase())) return false;
            }
            return true;
          });
          const totalBayar = payRows.reduce((s, r) => s + Number(r.nominal || 0), 0);
          return `<div class="ons-card p-4 space-y-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <button type="button" onclick="window.setPiutangSubView('list')" class="ons-btn ons-btn-ghost text-xs">&larr; Kembali</button>
                <h3 class="font-bold text-base">Pembayaran Piutang</h3>
              </div>
              <button type="button" onclick="window.exportPiutangUsahaExcel('riwayat')" class="ons-btn ons-btn-ghost text-xs">Excel</button>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <input class="ons-input text-xs w-56" placeholder="Cari transaksi pembayaran piutang..." value="${S().esc(piutangSearchQ)}" oninput="window.setPiutangSearchQ(this.value)"/>
            </div>
            <div class="ons-table-wrap">
              <table class="ons-table">
                <thead><tr><th>No.</th><th>Waktu Transaksi</th><th>No. Transaksi</th><th>Detail Transaksi Asal</th><th>Akun Kas</th><th>Catatan Transaksi</th><th class="text-right">Nominal Bayar</th><th>Action</th></tr></thead>
                <tbody>
                  ${payRows.length ? payRows.slice().reverse().map((r, i) => `<tr>
                    <td class="font-mono-num text-xs">${i + 1}</td>
                    <td class="font-mono-num text-xs">${S().formatTgl(r.tanggal)}</td>
                    <td class="font-mono-num text-xs font-bold">${S().esc(r.id_jurnal || '-')}</td>
                    <td class="font-mono-num text-xs">${S().esc(r.referensi_id || '-')}</td>
                    <td class="text-xs">${S().esc(r.metode || 'Kas Utama')}</td>
                    <td class="text-xs">${S().esc(r.kategori || '-')}</td>
                    <td class="text-right font-mono-num text-xs font-bold text-emerald-600">${S().rp(r.nominal || 0)}</td>
                    <td><button type="button" onclick="window.printKwitansiPiutang('${S().esc(r.id_jurnal || '')}')" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2">Kwitansi</button></td>
                  </tr>`).join('') : '<tr><td colspan="8" class="text-center py-6 text-xs">Belum ada riwayat pembayaran piutang.</td></tr>'}
                </tbody>
              </table>
            </div>
            <div class="p-3.5 rounded-xl border flex flex-wrap justify-between gap-4 text-xs" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
              <div class="font-bold text-blue-600">Rekap Pembayaran Piutang</div>
              <div class="flex flex-wrap gap-6">
                <div>Total Pembayaran Piutang Usaha : <b class="font-mono-num text-sm text-emerald-600">${S().rp(totalBayar)}</b></div>
                <div>Jumlah Transaksi Pembayaran Piutang Usaha : <b class="font-mono-num text-sm">${payRows.length} kali</b></div>
              </div>
            </div>
          </div>`;
        }
        const filteredPiutang = piutangList.filter((pt) => {
          if (piutangStatusFilter !== 'SEMUA' && String(pt.status_piutang || '').toUpperCase() !== piutangStatusFilter) return false;
          if (piutangDueFilter && String(pt.tgl_jatuh_tempo || '').slice(0, 10) > piutangDueFilter) return false;
          if (piutangSearchQ) {
            const hay = `${pt.no_invoice || ''} ${pt.kode_faktur || ''} ${pt.nama_pelanggan || ''} ${pt.catatan || ''}`.toLowerCase();
            if (!hay.includes(piutangSearchQ.toLowerCase())) return false;
          }
          return true;
        });
        const totalPiutangFiltered = filteredPiutang.filter((p) => String(p.status_piutang || '').toUpperCase() !== 'LUNAS').reduce((s, p) => s + Number(p.sisa_piutang || 0), 0);
        return `<div class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div class="ons-card p-4"><div class="text-xs" style="color:var(--ons-text-soft)">Total Sisa Piutang Berjalan</div><div class="text-xl font-extrabold font-mono-num text-amber-600">${S().rp(totalPiutangOpen)}</div></div>
            <div class="ons-card p-4"><div class="text-xs" style="color:var(--ons-text-soft)">Nota Tempo Aktif / Sebagian</div><div class="text-xl font-extrabold font-mono-num text-blue-600">${openPiutang.length} Nota</div></div>
            <div class="ons-card p-4"><div class="text-xs" style="color:var(--ons-text-soft)">Jatuh Tempo &le; 3 Hari / Terlambat</div><div class="text-xl font-extrabold font-mono-num text-red-600">${openPiutang.filter((pt) => S().daysUntil(pt.tgl_jatuh_tempo) <= 3).length} Tagihan</div></div>
          </div>
          <div class="ons-card p-4 space-y-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 class="font-bold text-sm">Piutang Usaha &amp; Buku Piutang Pelanggan (${filteredPiutang.length})</h3>
                <span class="text-xs" style="color:var(--ons-text-soft)">Pelunasan otomatis mencatat kas masuk (<code>MASUK_PIUTANG</code>) &amp; melunaskan invoice POS.</span>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <button type="button" onclick="window.setPiutangSubView('ttf')" class="ons-btn ons-btn-emerald text-xs">Daftar TTF</button>
                <button type="button" onclick="window.setPiutangSubView('riwayat')" class="ons-btn ons-btn-emerald text-xs">Riwayat Pembayaran</button>
                <button type="button" onclick="window.openImportPiutangInfoModal()" class="ons-btn ons-btn-ghost text-xs">Import</button>
                <button type="button" onclick="window.openCatatPiutangModal()" class="ons-btn ons-btn-emerald text-xs font-bold">+ Catat Piutang</button>
              </div>
            </div>
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex flex-wrap items-center gap-2">
                <input class="ons-input text-xs w-48" placeholder="Cari data debitur / faktur..." value="${S().esc(piutangSearchQ)}" oninput="window.setPiutangSearchQ(this.value)"/>
                <input type="date" class="ons-input text-xs w-40" title="Tgl. Jatuh Tempo maks" value="${S().esc(piutangDueFilter)}" onchange="window.setPiutangDueFilter(this.value)"/>
                <select class="ons-select text-xs w-36" onchange="window.setPiutangStatusFilter(this.value)">
                  <option value="SEMUA" ${piutangStatusFilter === 'SEMUA' ? 'selected' : ''}>Semua Status</option>
                  <option value="BELUM_LUNAS" ${piutangStatusFilter === 'BELUM_LUNAS' ? 'selected' : ''}>Belum Lunas</option>
                  <option value="SEBAGIAN" ${piutangStatusFilter === 'SEBAGIAN' ? 'selected' : ''}>Sebagian</option>
                  <option value="LUNAS" ${piutangStatusFilter === 'LUNAS' ? 'selected' : ''}>Lunas</option>
                </select>
              </div>
              <button type="button" onclick="window.exportPiutangUsahaExcel('list')" class="ons-btn ons-btn-ghost text-xs">Excel</button>
            </div>
            <div class="ons-table-wrap">
              <table class="ons-table">
                <thead><tr><th>No.</th><th>Waktu &amp; Debitur</th><th>No. Faktur</th><th>Metode Bayar</th><th>Keterangan</th><th>Jatuh Tempo</th><th class="text-right">Nominal Awal</th><th class="text-right">Nominal Sisa</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  ${filteredPiutang.length ? filteredPiutang.map((pt, idx) => {
                    const days = S().daysUntil(pt.tgl_jatuh_tempo);
                    const isPaid = String(pt.status_piutang || '').toUpperCase() === 'LUNAS';
                    const invNo = pt.no_invoice || pt.kode_faktur || pt.id_piutang;
                    const waMsg = 'Yth. ' + (pt.nama_pelanggan || 'Pelanggan') + ', pengingat tagihan tempo Apotek ONS Farma untuk nota ' + invNo + ' jatuh tempo ' + (pt.tgl_jatuh_tempo || '-') + ' sebesar ' + S().rp(pt.sisa_piutang || 0) + '. Terima kasih.';
                    const waUrl = S().buildWaUrl ? S().buildWaUrl(pt.no_wa || '', waMsg) : ('https://wa.me/?text=' + encodeURIComponent(waMsg));
                    return `<tr>
                      <td class="font-mono-num text-xs">${idx + 1}</td>
                      <td class="text-xs"><b>${S().esc(pt.nama_pelanggan)}</b><div class="font-mono-num text-[10px]" style="color:var(--ons-text-soft)">${S().esc(String(pt.waktu_trx || pt.tanggal || '').slice(0, 10))}</div></td>
                      <td class="font-mono-num text-xs font-bold">${S().esc(invNo)}</td>
                      <td class="text-xs">${S().esc(pt.metode_bayar || 'TEMPO')}</td>
                      <td class="text-xs">${S().esc(pt.catatan || '-')}</td>
                      <td class="font-mono-num text-xs ${!isPaid && days < 0 ? 'text-red-600 font-bold' : ''}">${S().esc(pt.tgl_jatuh_tempo || '-')}${!isPaid && days < 0 ? ' (Lewat ' + Math.abs(days) + 'h)' : ''}</td>
                      <td class="text-right font-mono-num text-xs">${S().rp(pt.total_tagihan)}</td>
                      <td class="text-right font-mono-num text-xs font-bold ${isPaid ? 'text-emerald-600' : 'text-amber-600'}">${S().rp(pt.sisa_piutang || 0)}</td>
                      <td><span class="badge-bpom ${isPaid ? 'bpom-bebas' : 'bpom-terbatas'}">${S().esc(pt.status_piutang)}</span></td>
                      <td>
                        <div class="flex flex-wrap gap-1">
                          ${!isPaid ? `<button onclick="window.openPayPiutangModal('${S().esc(pt.id_piutang)}','${S().esc(invNo)}','${S().esc(pt.nama_pelanggan)}',${Number(pt.sisa_piutang || 0)},${pt.is_manual ? 'true' : 'false'})" class="ons-btn ons-btn-emerald text-[11px] py-1 px-2">Cicil / Lunas</button>` : ''}
                          ${!isPaid ? `<button type="button" onclick="window.openBuatTtfModal('${S().esc(invNo)}','${S().esc(pt.nama_pelanggan)}',${Number(pt.total_tagihan || 0)})" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2">TTF</button>` : ''}
                          ${!isPaid ? `<a target="_blank" rel="noopener" href="${S().esc(waUrl)}" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2">WA Tagih</a>` : ''}
                        </div>
                      </td>
                    </tr>`;
                  }).join('') : '<tr><td colspan="10" class="text-center py-6 text-xs">Belum ada transaksi piutang usaha.</td></tr>'}
                </tbody>
              </table>
            </div>
            <div class="p-3.5 rounded-xl border flex flex-wrap justify-between gap-4 text-xs" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
              <div class="font-bold text-blue-600">Rekap Data Piutang Usaha</div>
              <div class="flex flex-wrap gap-6">
                <div>Total Piutang Usaha : <b class="font-mono-num text-sm text-amber-600">${S().rp(totalPiutangFiltered)}</b></div>
                <div>Jumlah Transaksi Piutang Usaha : <b class="font-mono-num text-sm">${filteredPiutang.length} kali</b></div>
              </div>
            </div>
          </div>
        </div>`;
      })() : financeTab === 'hutang' ? (() => {
        if (hutangSubView === 'riwayat') {
          const payRows = jurnalAll.filter((j) => String(j.jenis_trx || '').includes('PEMBAYARAN_PBF') || String(j.jenis_trx || '').includes('PEMBAYARAN_UTANG')).filter((j) => {
            if (hutangSearchQ) {
              const hay = `${j.id_jurnal || ''} ${j.kategori || ''} ${j.referensi_id || ''}`.toLowerCase();
              if (!hay.includes(hutangSearchQ.toLowerCase())) return false;
            }
            return true;
          });
          const totPay = payRows.reduce((s, x) => s + Number(x.nominal || 0), 0);
          return `<div class="ons-card p-4 space-y-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <button type="button" onclick="window.setHutangSubView('list')" class="ons-btn ons-btn-ghost text-xs">&larr; Kembali</button>
                <h3 class="font-bold text-base">Riwayat Pembayaran Utang Usaha</h3>
              </div>
              <button type="button" onclick="window.exportUtangUsahaExcel('riwayat')" class="ons-btn ons-btn-ghost text-xs">Excel</button>
            </div>
            <input class="ons-input text-xs w-56" placeholder="Cari faktur / supplier..." value="${S().esc(hutangSearchQ)}" oninput="window.setHutangSearchQ(this.value)"/>
            <div class="ons-table-wrap">
              <table class="ons-table">
                <thead><tr><th>No.</th><th>Waktu Transaksi</th><th>No. Transaksi</th><th>No. Faktur</th><th>Akun Kas</th><th>Keterangan</th><th class="text-right">Nominal Bayar</th></tr></thead>
                <tbody>
                  ${payRows.length ? payRows.slice().reverse().map((r, i) => `<tr>
                    <td class="font-mono-num text-xs">${i + 1}</td>
                    <td class="font-mono-num text-xs">${S().formatTgl(r.tanggal)}</td>
                    <td class="font-mono-num text-xs font-bold">${S().esc(r.id_jurnal || '-')}</td>
                    <td class="font-mono-num text-xs">${S().esc(r.referensi_id || '-')}</td>
                    <td class="text-xs">${S().esc(r.metode || 'TRANSFER_BANK')}</td>
                    <td class="text-xs">${S().esc(r.kategori || '-')}</td>
                    <td class="text-right font-mono-num text-xs font-bold text-emerald-600">${S().rp(r.nominal || 0)}</td>
                  </tr>`).join('') : '<tr><td colspan="7" class="text-center py-6 text-xs">Belum ada riwayat pembayaran utang usaha.</td></tr>'}
                </tbody>
              </table>
            </div>
            <div class="p-3.5 rounded-xl border flex flex-wrap justify-between gap-4 text-xs" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
              <div class="font-bold text-blue-600">Rekap Pembayaran Utang</div>
              <div class="flex flex-wrap gap-6">
                <div>Total Pembayaran Utang : <b class="font-mono-num text-sm text-emerald-600">${S().rp(totPay)}</b></div>
                <div>Jumlah Transaksi : <b class="font-mono-num text-sm">${payRows.length} kali</b></div>
              </div>
            </div>
          </div>`;
        }
        const filteredUtang = combinedOpenUtang.filter((u) => {
          if (hutangStatusFilter === 'TEMPO_7H' && S().daysUntil(u.tgl_jatuh_tempo) > 7) return false;
          if (hutangDueFilter && String(u.tgl_jatuh_tempo || '').slice(0, 10) > hutangDueFilter) return false;
          if (hutangSearchQ) {
            const hay = `${u.kreditur} ${u.no_faktur} ${u.keterangan}`.toLowerCase();
            if (!hay.includes(hutangSearchQ.toLowerCase())) return false;
          }
          return true;
        });
        const totalUtangFiltered = filteredUtang.reduce((s, u) => s + Number(u.nominal_sisa || 0), 0);
        return `<div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div class="ons-card p-4 lg:col-span-4">
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
              <span>Total Sisa Hutang Usaha</span>
              <span class="font-mono-num text-amber-600">${S().rp(combinedOpenUtang.reduce((s, f) => s + Number(f.nominal_sisa || 0), 0))}</span>
            </div>
          </div>
          <div class="ons-card p-4 lg:col-span-8 space-y-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h3 class="font-bold text-base">Utang Usaha (${filteredUtang.length} Aktif)</h3>
              <div class="flex flex-wrap items-center gap-2">
                <button type="button" onclick="window.setHutangSubView('riwayat')" class="ons-btn ons-btn-emerald text-xs">Riwayat Pembayaran</button>
                <button type="button" onclick="window.openImportUtangInfoModal()" class="ons-btn ons-btn-ghost text-xs">Import</button>
                <button type="button" onclick="window.openCatatUtangModal()" class="ons-btn ons-btn-emerald text-xs font-bold">+ Catat Utang</button>
              </div>
            </div>
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex flex-wrap items-center gap-2">
                <input class="ons-input text-xs w-44" placeholder="Cari kreditur / faktur..." value="${S().esc(hutangSearchQ)}" oninput="window.setHutangSearchQ(this.value)"/>
                <input type="date" class="ons-input text-xs w-36" title="Tgl. Jatuh Tempo maks" value="${S().esc(hutangDueFilter)}" onchange="window.setHutangDueFilter(this.value)"/>
                <select class="ons-select text-xs w-36" onchange="window.setHutangStatusFilter(this.value)">
                  <option value="SEMUA" ${hutangStatusFilter === 'SEMUA' ? 'selected' : ''}>Semua Tempo</option>
                  <option value="TEMPO_7H" ${hutangStatusFilter === 'TEMPO_7H' ? 'selected' : ''}>Tempo &le; 7 Hari</option>
                </select>
              </div>
              <button type="button" onclick="window.exportUtangUsahaExcel('list')" class="ons-btn ons-btn-ghost text-xs">Excel</button>
            </div>
            <div class="ons-table-wrap">
              <table class="ons-table">
                <thead><tr><th>Waktu Transaksi</th><th>Kreditur &amp; No. Faktur</th><th>Keterangan</th><th>Jatuh Tempo</th><th class="text-right">Nominal Awal</th><th class="text-right">Nominal Sisa</th><th>Actions</th></tr></thead>
                <tbody>
                  ${filteredUtang.length ? filteredUtang.map((u) => `<tr>
                    <td class="font-mono-num text-xs">${S().esc(u.waktu_trx || '-')}</td>
                    <td class="text-xs"><b>${S().esc(u.no_faktur)}</b><div style="color:var(--ons-text-soft)">${S().esc(u.kreditur)}</div></td>
                    <td class="text-xs">${S().esc(u.keterangan || '-')}</td>
                    <td class="font-mono-num text-xs">${S().esc(u.tgl_jatuh_tempo || '-')}</td>
                    <td class="text-right font-mono-num text-xs">${S().rp(u.nominal_awal)}</td>
                    <td class="text-right font-mono-num text-xs font-bold text-amber-600">${S().rp(u.nominal_sisa)}</td>
                    <td>
                      <div class="flex flex-wrap gap-1">
                        ${u.is_manual ? `
                          <button type="button" onclick="window.payManualUtang('${S().esc(u.id_row)}', ${Number(u.nominal_sisa || 0)})" class="ons-btn ons-btn-emerald text-[11px] py-1 px-2">Bayar Lunas</button>
                        ` : `
                          <button onclick="window.openPayHutangModal('${S().esc(u.id_row)}','${S().esc(u.no_faktur)}',${Number(u.nominal_sisa || 0)})" class="ons-btn ons-btn-primary text-[11px] py-1 px-2">Cicil</button>
                          <button onclick="window.payHutangPbfNow('${S().esc(u.id_row)}', ${Number(u.nominal_sisa || 0)})" class="ons-btn ons-btn-emerald text-[11px] py-1 px-2">Bayar Lunas</button>
                        `}
                      </div>
                    </td>
                  </tr>`).join('') : '<tr><td colspan="7" class="text-xs text-center py-6">Seluruh hutang faktur PBF telah lunas.</td></tr>'}
                </tbody>
              </table>
            </div>
            <div class="p-3.5 rounded-xl border flex flex-wrap justify-between gap-4 text-xs" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
              <div class="font-bold text-blue-600">Rekap Data Utang Usaha</div>
              <div class="flex flex-wrap gap-6">
                <div>Total Utang Usaha : <b class="font-mono-num text-sm text-amber-600">${S().rp(totalUtangFiltered)}</b></div>
                <div>Jumlah Transaksi Utang Usaha : <b class="font-mono-num text-sm">${filteredUtang.length} kali</b></div>
              </div>
            </div>
          </div>
        </div>`;
      })() : financeTab === 'pajak' ? `
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
              <div><label class="font-semibold block mb-1">Potongan Kasbon / Lainnya</label><input id="sgPot" type="number" class="ons-input font-mono-num" value="150000"/></div>
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
            <div><div class="text-[11px]" style="color:var(--ons-text-soft)">Valuasi Aset Stok (HPP)</div><div class="text-base font-extrabold font-mono-num text-emerald-600">${S().rp(valuasiAsetStok)}</div>${valuasiKonsinyasi > 0 ? `<div class="text-[10px]" style="color:var(--ons-text-soft)">+Titipan Konsinyasi: ${S().rp(valuasiKonsinyasi)}</div>` : ''}</div>
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
  global.setAkunKasSearchQ = (q) => { akunKasSearchQ = q || ''; global.renderActiveView(); };
  global.setAkunKasStatusFilter = (s) => { akunKasStatusFilter = s || 'SEMUA'; global.renderActiveView(); };
  global.setKasBookAccountFilter = (id) => { kasBookAccountFilter = id || 'SEMUA'; global.renderActiveView(); };
  global.setKasBookSearchQ = (q) => { kasBookSearchQ = q || ''; global.renderActiveView(); };
  global.openBukuKasForAkun = (idAkun) => {
    kasBookAccountFilter = idAkun || 'SEMUA';
    global.setFinanceTab('jurnal');
  };

  let akunKasJenisTemp = 'bank';
  global.openAddAkunKasModal = () => {
    akunKasJenisTemp = 'bank';
    S().openModal(`<div class="p-6 space-y-3.5 text-xs">
      <div class="flex justify-between items-center pb-2 border-b" style="border-color:var(--ons-border)">
        <h3 class="font-bold text-base text-blue-600">Tambah Akun Kas</h3>
        <button type="button" onclick="ONSStore.closeModal()" class="text-xl px-1">&times;</button>
      </div>
      <div><label class="font-semibold block mb-1">Nama Akun Kas *</label><input id="akNamaInp" class="ons-input" placeholder="Mis. Bank BCA Operasional / QRIS Toko"/></div>
      <div><label class="font-semibold block mb-1">Deskripsi</label><input id="akDescInp" class="ons-input" placeholder="Rekening operasional utama apotek"/></div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="font-semibold block mb-1">Kode Akun Kustom</label><input id="akKodeInp" class="ons-input font-mono-num" placeholder="1-102"/></div>
        <div><label class="font-semibold block mb-1">Saldo Awal (Rp)</label><input id="akSaldoAwalInp" type="number" min="0" class="ons-input font-mono-num" value="0"/></div>
      </div>
      <div><label class="font-semibold block mb-1">Catatan</label><input id="akCatatanInp" class="ons-input" placeholder="Opsional"/></div>
      <div>
        <label class="font-semibold block mb-1">Jenis Akun *</label>
        <div class="grid grid-cols-3 gap-2">
          ${['bank', 'ewallet', 'other'].map((j) => `<button type="button" id="akJenisBtn_${j}" onclick="window.setAkunKasJenisInp('${j}')" class="ons-btn ${j === 'bank' ? 'ons-btn-primary' : 'ons-btn-ghost'} text-xs py-2">${j}</button>`).join('')}
        </div>
      </div>
      <div class="flex justify-end gap-2 pt-2">
        <button type="button" onclick="ONSStore.closeModal()" class="ons-btn ons-btn-ghost text-xs">Batal</button>
        <button type="button" onclick="window.saveAkunKasModal()" class="ons-btn ons-btn-emerald text-xs font-bold">Simpan</button>
      </div>
    </div>`, '460px');
  };
  global.setAkunKasJenisInp = (j) => {
    akunKasJenisTemp = j || 'other';
    ['bank', 'ewallet', 'other'].forEach((k) => {
      const btn = document.getElementById('akJenisBtn_' + k);
      if (btn) btn.className = `ons-btn ${k === akunKasJenisTemp ? 'ons-btn-primary' : 'ons-btn-ghost'} text-xs py-2`;
    });
  };
  global.saveAkunKasModal = () => {
    const nama = String((document.getElementById('akNamaInp') || {}).value || '').trim();
    if (!nama) return global.toast('Nama Akun Kas wajib diisi.', 'warn');
    const list = _getKasAccountsList();
    list.push({
      id_akun: 'KAS-' + Date.now().toString().slice(-5),
      nama,
      deskripsi: String((document.getElementById('akDescInp') || {}).value || '').trim() || ('Akun ' + nama),
      kode_kustom: String((document.getElementById('akKodeInp') || {}).value || '').trim(),
      catatan: String((document.getElementById('akCatatanInp') || {}).value || '').trim(),
      jenis: akunKasJenisTemp || 'other',
      saldo_awal: Math.max(0, Number((document.getElementById('akSaldoAwalInp') || {}).value || 0)),
      status: 'Aktif'
    });
    _writeFinLocalList(KAS_ACCOUNTS_KEY, list);
    S().closeModal();
    global.toast('Akun Kas "' + nama + '" berhasil ditambahkan.', 'ok');
    global.renderActiveView();
  };
  global.openTransferKasModal = (fromAkunId) => {
    const accounts = _computeKasAccountsWithBalance(S().AppState);
    if (accounts.length < 2) {
      return global.toast('Tambahkan minimal 1 akun kas tujuan terlebih dahulu (+ Akun Kas Baru).', 'warn');
    }
    const targets = accounts.filter((a) => a.id_akun !== fromAkunId);
    S().openModal(`<div class="p-6 space-y-3 text-xs">
      <div class="flex justify-between items-center pb-2 border-b" style="border-color:var(--ons-border)">
        <h3 class="font-bold text-base">Transfer Saldo Antar Akun Kas</h3>
        <button type="button" onclick="ONSStore.closeModal()" class="text-xl px-1">&times;</button>
      </div>
      <div><label class="font-semibold block mb-1">Dari Akun Kas</label>
        <select id="trfKasFrom" class="ons-select">
          ${accounts.map((a) => `<option value="${S().esc(a.id_akun)}" ${a.id_akun === fromAkunId ? 'selected' : ''}>${S().esc(a.nama)} (Saldo: ${S().rp(a.saldo_saat_ini)})</option>`).join('')}
        </select>
      </div>
      <div><label class="font-semibold block mb-1">Ke Akun Kas Tujuan</label>
        <select id="trfKasTo" class="ons-select">
          ${targets.map((a) => `<option value="${S().esc(a.id_akun)}">${S().esc(a.nama)} (Saldo: ${S().rp(a.saldo_saat_ini)})</option>`).join('')}
        </select>
      </div>
      <div><label class="font-semibold block mb-1">Nominal Transfer (Rp) *</label><input id="trfKasAmt" type="number" min="1" class="ons-input font-mono-num" value="100000"/></div>
      <div><label class="font-semibold block mb-1">Keterangan</label><input id="trfKasNote" class="ons-input" value="Setor / pemindahan saldo antar kas"/></div>
      <button type="button" onclick="window.submitTransferKas()" class="ons-btn ons-btn-primary w-full font-bold py-2.5">Proses Transfer Antar Kas</button>
    </div>`, '440px');
  };
  global.submitTransferKas = async () => {
    try {
      const fromId = (document.getElementById('trfKasFrom') || {}).value || '';
      const toId = (document.getElementById('trfKasTo') || {}).value || '';
      const amt = Number((document.getElementById('trfKasAmt') || {}).value || 0);
      const note = String((document.getElementById('trfKasNote') || {}).value || '').trim();
      if (!fromId || !toId || fromId === toId) throw new Error('Pilih akun asal & tujuan yang berbeda.');
      if (amt <= 0) throw new Error('Nominal transfer harus > 0.');
      const accounts = _getKasAccountsList();
      const akFrom = accounts.find((a) => a.id_akun === fromId) || { nama: fromId };
      const akTo = accounts.find((a) => a.id_akun === toId) || { nama: toId };
      const refCode = 'TRF-' + Date.now().toString().slice(-6);
      const per = new Date().toISOString().slice(0, 7);
      await API().callApi('finance.saveJurnal', { jenis_trx: 'KELUAR_TRANSFER_KAS', kategori: `Transfer ke ${akTo.nama}${note ? ' (' + note + ')' : ''}`, nominal: amt, metode: akFrom.nama, referensi_id: `${refCode} [AKUN:${fromId}]`, periode_bulan: per }, { isWrite: true });
      await API().callApi('finance.saveJurnal', { jenis_trx: 'MASUK_TRANSFER_KAS', kategori: `Transfer dari ${akFrom.nama}${note ? ' (' + note + ')' : ''}`, nominal: amt, metode: akTo.nama, referensi_id: `${refCode} [AKUN:${toId}]`, periode_bulan: per }, { isWrite: true });
      S().closeModal();
      global.toast(`Transfer ${S().rp(amt)} dari ${akFrom.nama} ke ${akTo.nama} tercatat.`, 'ok');
      await global.bootLoadState(true);
    } catch (e) { global.toast(e.message, 'err'); }
  };
  global.exportAkunKasExcel = () => {
    const rows = _computeKasAccountsWithBalance(S().AppState).map((a, i) => ({ no: i + 1, nama: a.nama, kode: a.kode_kustom || '-', deskripsi: a.deskripsi || '-', jenis: a.jenis || 'other', saldo: a.saldo_saat_ini, status: a.status || 'Aktif' }));
    S().exportDataset('xlsx', 'Daftar Akun Kas', `daftar-akun-kas-${new Date().toISOString().slice(0, 10)}`, [
      { key: 'no', label: 'No', type: 'int', width: 6 },
      { key: 'nama', label: 'Nama Akun Kas', type: 'wrap', width: 24 },
      { key: 'kode', label: 'Kode Akun', type: 'str', width: 12 },
      { key: 'deskripsi', label: 'Deskripsi', type: 'wrap', width: 28 },
      { key: 'jenis', label: 'Jenis', type: 'str', width: 12 },
      { key: 'saldo', label: 'Saldo Saat Ini', type: 'currency', sum: true, width: 18 },
      { key: 'status', label: 'Status', type: 'str', width: 12 }
    ], rows, { sheetName: 'AkunKas' });
  };

  let kasTrxTabTemp = 'KELUAR';
  global.openCreateKasTransaksiModal = (mode) => {
    kasTrxTabTemp = mode === 'MASUK' ? 'MASUK' : 'KELUAR';
    const accounts = _getKasAccountsList();
    const autoNo = 'TRXB' + new Date().toISOString().slice(2, 10).replace(/-/g, '') + '-' + Math.floor(10 + Math.random() * 89);
    const nowDt = new Date().toISOString().slice(0, 16);
    const outCats = ['Pembayaran Sewa Tempat', 'Biaya Listrik, Air & Internet', 'Gaji & Tunjangan Karyawan', 'Biaya Kemasan & Struk', 'Biaya Operasional Lainnya'];
    const inCats = ['Pendapatan Lainnya', 'Penambahan Modal Pemilik', 'Pendapatan Jasa Klinik / Praktek', 'Cashback / Rebate PBF'];
    S().openModal(`<div class="p-6 space-y-3 text-xs">
      <div class="flex justify-between items-center pb-2 border-b" style="border-color:var(--ons-border)">
        <h3 class="font-bold text-base text-blue-600">Buat Transaksi Baru (Buku Kas)</h3>
        <button type="button" onclick="ONSStore.closeModal()" class="text-xl px-1">&times;</button>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <button type="button" id="kasTrxBtnKeluar" onclick="window.switchKasTrxModalTab('KELUAR')" class="ons-btn ${kasTrxTabTemp === 'KELUAR' ? 'ons-btn-primary' : 'ons-btn-ghost'} text-xs py-2 font-bold">Pengeluaran</button>
        <button type="button" id="kasTrxBtnMasuk" onclick="window.switchKasTrxModalTab('MASUK')" class="ons-btn ${kasTrxTabTemp === 'MASUK' ? 'ons-btn-primary' : 'ons-btn-ghost'} text-xs py-2 font-bold">Pemasukan</button>
      </div>
      <div><label class="font-semibold block mb-1">Pilih Transaksi</label>
        <select id="kasTrxKatSel" class="ons-select">
          ${(kasTrxTabTemp === 'KELUAR' ? outCats : inCats).map((c) => `<option value="${S().esc(c)}">${S().esc(c)}</option>`).join('')}
        </select>
      </div>
      <div><label id="kasTrxAkunLbl" class="font-semibold block mb-1">${kasTrxTabTemp === 'KELUAR' ? 'Pilih Akun Pembayaran' : 'Pilih Akun Penerima'}</label>
        <select id="kasTrxAkunSel" class="ons-select">
          ${accounts.map((a) => `<option value="${S().esc(a.id_akun)}">${S().esc(a.nama)}</option>`).join('')}
        </select>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="font-semibold block mb-1">Waktu Transaksi</label><input id="kasTrxWaktu" type="datetime-local" class="ons-input font-mono-num" value="${nowDt}"/></div>
        <div><label class="font-semibold block mb-1">Nilai Bayar (Rp) *</label><input id="kasTrxNominal" type="number" min="1" class="ons-input font-mono-num" value="0"/></div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="font-semibold block mb-1">No. Transaksi</label><input id="kasTrxNo" class="ons-input font-mono-num" value="${autoNo}"/></div>
        <div><label class="font-semibold block mb-1">Keterangan</label><input id="kasTrxKet" class="ons-input" placeholder="Opsional"/></div>
      </div>
      <div><label class="font-semibold block mb-1">Upload Bukti Transaksi (Opsional)</label><input id="kasTrxBuktiInp" type="file" accept="image/*,.pdf" class="ons-input text-xs"/></div>
      <div class="flex justify-end gap-2 pt-2">
        <button type="button" onclick="ONSStore.closeModal()" class="ons-btn ons-btn-ghost text-xs">Batal</button>
        <button type="button" onclick="window.submitCreateKasTransaksi()" class="ons-btn ons-btn-emerald text-xs font-bold">Simpan</button>
      </div>
    </div>`, '480px');
  };
  global.switchKasTrxModalTab = (tab) => {
    kasTrxTabTemp = tab === 'MASUK' ? 'MASUK' : 'KELUAR';
    const bKel = document.getElementById('kasTrxBtnKeluar');
    const bMas = document.getElementById('kasTrxBtnMasuk');
    if (bKel) bKel.className = `ons-btn ${kasTrxTabTemp === 'KELUAR' ? 'ons-btn-primary' : 'ons-btn-ghost'} text-xs py-2 font-bold`;
    if (bMas) bMas.className = `ons-btn ${kasTrxTabTemp === 'MASUK' ? 'ons-btn-primary' : 'ons-btn-ghost'} text-xs py-2 font-bold`;
    const lbl = document.getElementById('kasTrxAkunLbl');
    if (lbl) lbl.textContent = kasTrxTabTemp === 'KELUAR' ? 'Pilih Akun Pembayaran' : 'Pilih Akun Penerima';
    const sel = document.getElementById('kasTrxKatSel');
    if (sel) {
      const cats = kasTrxTabTemp === 'KELUAR'
        ? ['Pembayaran Sewa Tempat', 'Biaya Listrik, Air & Internet', 'Gaji & Tunjangan Karyawan', 'Biaya Kemasan & Struk', 'Biaya Operasional Lainnya']
        : ['Pendapatan Lainnya', 'Penambahan Modal Pemilik', 'Pendapatan Jasa Klinik / Praktek', 'Cashback / Rebate PBF'];
      sel.innerHTML = cats.map((c) => `<option value="${S().esc(c)}">${S().esc(c)}</option>`).join('');
    }
  };
  global.submitCreateKasTransaksi = async () => {
    try {
      const kat = (document.getElementById('kasTrxKatSel') || {}).value || 'Transaksi Kas';
      const akunId = (document.getElementById('kasTrxAkunSel') || {}).value || 'KAS-01';
      const waktu = (document.getElementById('kasTrxWaktu') || {}).value || new Date().toISOString();
      const nom = Number((document.getElementById('kasTrxNominal') || {}).value || 0);
      const noTrx = String((document.getElementById('kasTrxNo') || {}).value || '').trim();
      const ket = String((document.getElementById('kasTrxKet') || {}).value || '').trim();
      const fileInp = document.getElementById('kasTrxBuktiInp');
      const fileName = (fileInp && fileInp.files && fileInp.files[0]) ? fileInp.files[0].name : '';
      if (nom <= 0) throw new Error('Nilai bayar harus lebih dari 0.');
      const accounts = _getKasAccountsList();
      const akObj = accounts.find((a) => a.id_akun === akunId) || { nama: 'Kas Utama' };
      const fullKat = `${kat}${ket ? ' - ' + ket : ''}${fileName ? ' [Bukti: ' + fileName + ']' : ''}`;
      await API().callApi('finance.saveJurnal', {
        tanggal: waktu.length === 16 ? waktu + ':00Z' : waktu,
        jenis_trx: kasTrxTabTemp === 'MASUK' ? 'MASUK_LAINNYA' : 'KELUAR_OPERASIONAL',
        kategori: fullKat,
        nominal: nom,
        metode: akObj.nama,
        referensi_id: `${noTrx || ('TRX-' + Date.now())} [AKUN:${akunId}]`,
        periode_bulan: String(waktu || '').slice(0, 7) || new Date().toISOString().slice(0, 7)
      }, { isWrite: true });
      S().closeModal();
      global.toast('Transaksi Buku Kas berhasil disimpan!', 'ok');
      await global.bootLoadState(true);
    } catch (e) { global.toast(e.message, 'err'); }
  };
  global.openKasTrxDetailModal = (idJurnal) => {
    const j = (S().AppState.jurnalKeuangan || []).find((x) => String(x.id_jurnal || '') === String(idJurnal));
    if (!j) return global.toast('Detail entri buku kas tidak ditemukan.', 'warn');
    S().openModal(`<div class="p-6 space-y-3 text-xs">
      <div class="flex justify-between items-center pb-2 border-b" style="border-color:var(--ons-border)"><h3 class="font-bold text-base">Detail Transaksi Kas</h3><button onclick="ONSStore.closeModal()" class="text-xl">&times;</button></div>
      <div class="p-3.5 rounded-xl border space-y-1.5" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
        <div>ID Jurnal: <b class="font-mono-num">${S().esc(j.id_jurnal || '-')}</b></div>
        <div>Waktu: <b class="font-mono-num">${S().formatTgl(j.tanggal, true)}</b></div>
        <div>Jenis: <b>${S().esc(j.jenis_trx)}</b></div>
        <div>Aktivitas / Kategori: <b>${S().esc(j.kategori)}</b></div>
        <div>Nominal: <b class="font-mono-num text-sm">${S().rp(j.nominal)}</b></div>
        <div>Akun / Metode: <b>${S().esc(j.metode || '-')}</b></div>
        <div>Referensi: <b class="font-mono-num">${S().esc(j.referensi_id || '-')}</b></div>
        <div>Status Lock: <b>${S().esc(j.status_lock || 'TERBUKA')}</b></div>
      </div>
    </div>`, '440px');
  };
  global.exportBukuKasExcel = () => {
    const rows = (S().AppState.jurnalKeuangan || []).map((j, i) => ({
      no: i + 1, tanggal: String(j.tanggal || '').slice(0, 10), jenis: j.jenis_trx, aktivitas: j.kategori,
      masuk: String(j.jenis_trx || '').includes('MASUK') ? Number(j.nominal || 0) : 0,
      keluar: String(j.jenis_trx || '').includes('MASUK') ? 0 : Number(j.nominal || 0),
      akun: j.metode || 'Kas Utama', ref: j.referensi_id || '-'
    }));
    if (!rows.length) return global.toast('Belum ada data Buku Kas.', 'warn');
    S().exportDataset('xlsx', 'Buku Kas Apotek', `buku-kas-${new Date().toISOString().slice(0, 10)}`, [
      { key: 'no', label: 'No', type: 'int', width: 6 },
      { key: 'tanggal', label: 'Tanggal', type: 'str', width: 13 },
      { key: 'jenis', label: 'Jenis', type: 'str', width: 20 },
      { key: 'aktivitas', label: 'Aktivitas', type: 'wrap', width: 32 },
      { key: 'masuk', label: 'Masuk (Rp)', type: 'currency', sum: true, width: 16 },
      { key: 'keluar', label: 'Keluar (Rp)', type: 'currency', sum: true, width: 16 },
      { key: 'akun', label: 'Akun Kas', type: 'str', width: 16 },
      { key: 'ref', label: 'Referensi', type: 'str', width: 20 }
    ], rows, { sheetName: 'BukuKas' });
  };

  global.setHutangSubView = (v) => { hutangSubView = v === 'riwayat' ? 'riwayat' : 'list'; global.renderActiveView(); };
  global.setHutangSearchQ = (q) => { hutangSearchQ = q || ''; global.renderActiveView(); };
  global.setHutangDueFilter = (d) => { hutangDueFilter = d || ''; global.renderActiveView(); };
  global.setHutangStatusFilter = (s) => { hutangStatusFilter = s || 'SEMUA'; global.renderActiveView(); };
  global.openCatatUtangModal = () => {
    const pbfs = S().AppState.supplierPbf || [];
    const autoNo = 'INVB' + new Date().toISOString().slice(2, 10).replace(/-/g, '') + '-1';
    const today = new Date().toISOString().slice(0, 10);
    const dueDef = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    S().openModal(`<div class="p-6 space-y-3 text-xs">
      <div class="flex justify-between items-center pb-2 border-b" style="border-color:var(--ons-border)">
        <h3 class="font-bold text-base text-blue-600">Detail Utang Usaha</h3>
        <button type="button" onclick="ONSStore.closeModal()" class="text-xl px-1">&times;</button>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="font-semibold block mb-1">Kode Faktur</label><input id="cuKodeFak" class="ons-input font-mono-num" value="${autoNo}"/></div>
        <div><label class="font-semibold block mb-1">Kode Invoice Eksternal</label><input id="cuKodeEks" class="ons-input font-mono-num" placeholder="Opsional"/></div>
      </div>
      <div>
        <label class="font-semibold block mb-1">Supplier *</label>
        <div class="flex gap-2">
          <select id="cuSupplier" class="ons-select flex-1">
            ${pbfs.length ? pbfs.map((p) => `<option value="${S().esc(p.nama_pbf)}">${S().esc(p.nama_pbf)}</option>`).join('') : '<option value="Supplier Umum">Supplier Umum</option>'}
          </select>
          <button type="button" onclick="ONSStore.closeModal();navigateView('obat','supplier')" class="ons-btn ons-btn-primary text-xs px-3" title="Kelola Supplier">+</button>
        </div>
      </div>
      <div class="grid grid-cols-3 gap-3">
        <div><label class="font-semibold block mb-1">Jumlah Utang (Rp) *</label><input id="cuJumlah" type="number" min="1" class="ons-input font-mono-num" value="0" oninput="window.refreshUtangJurnalPreview()"/></div>
        <div><label class="font-semibold block mb-1">Waktu Transaksi</label><input id="cuWaktu" type="date" class="ons-input" value="${today}"/></div>
        <div><label class="font-semibold block mb-1">Tanggal Jatuh Tempo</label><input id="cuTempo" type="date" class="ons-input" value="${dueDef}"/></div>
      </div>
      <div><label class="font-semibold block mb-1">Catatan</label><input id="cuCatatan" class="ons-input" placeholder="Opsional keterangan utang"/></div>
      <div><label class="font-semibold block mb-1">Pilih Akun Lawan</label>
        <select id="cuAkunLawan" class="ons-select" onchange="window.refreshUtangJurnalPreview()">
          <option value="Persediaan Obat & Alkes">Persediaan Obat &amp; Alkes</option>
          <option value="Beban Sewa & Operasional">Beban Sewa &amp; Operasional</option>
          <option value="Saldo Awal Utang Usaha">Saldo Awal Utang Usaha</option>
          <option value="Utang Biaya / Lainnya">Utang Biaya / Lainnya</option>
        </select>
      </div>
      <div class="pt-1">
        <div class="font-bold text-blue-600 mb-1.5">Jurnal Transaksi</div>
        <div class="ons-table-wrap">
          <table class="ons-table"><thead><tr><th>No.</th><th>Akun</th><th class="text-right">Debit</th><th class="text-right">Kredit</th></tr></thead><tbody id="cuJurnalPrev">
            <tr><td>1</td><td>Hutang Usaha</td><td class="text-right">-</td><td class="text-right font-mono-num">Rp 0</td></tr>
            <tr><td>2</td><td>Persediaan Obat &amp; Alkes</td><td class="text-right font-mono-num">Rp 0</td><td class="text-right">-</td></tr>
          </tbody></table>
        </div>
      </div>
      <div class="flex justify-end gap-2 pt-2">
        <button type="button" onclick="ONSStore.closeModal()" class="ons-btn ons-btn-ghost text-xs">Batal</button>
        <button type="button" onclick="window.submitCatatUtangModal()" class="ons-btn ons-btn-emerald text-xs font-bold">Simpan</button>
      </div>
    </div>`, '560px');
  };
  global.refreshUtangJurnalPreview = () => {
    const val = Math.max(0, Number((document.getElementById('cuJumlah') || {}).value || 0));
    const akun = (document.getElementById('cuAkunLawan') || {}).value || 'Persediaan Obat & Alkes';
    const tb = document.getElementById('cuJurnalPrev');
    if (tb) tb.innerHTML = `<tr><td>1</td><td>Hutang Usaha</td><td class="text-right">-</td><td class="text-right font-mono-num">${S().rp(val)}</td></tr><tr><td>2</td><td>${S().esc(akun)}</td><td class="text-right font-mono-num">${S().rp(val)}</td><td class="text-right">-</td></tr>`;
  };
  global.submitCatatUtangModal = () => {
    const amt = Math.max(0, Number((document.getElementById('cuJumlah') || {}).value || 0));
    if (amt <= 0) return global.toast('Jumlah Utang harus lebih dari 0.', 'warn');
    const list = _readFinLocalList(MANUAL_UTANG_KEY);
    list.unshift({
      id_utang: 'UTG-' + Date.now().toString().slice(-6),
      kode_faktur: String((document.getElementById('cuKodeFak') || {}).value || '').trim() || ('INVB-' + Date.now()),
      kode_eksternal: String((document.getElementById('cuKodeEks') || {}).value || '').trim(),
      id_pbf: (document.getElementById('cuSupplier') || {}).value || 'Supplier Umum',
      jumlah_utang: amt,
      sisa_utang: amt,
      waktu_trx: (document.getElementById('cuWaktu') || {}).value || new Date().toISOString().slice(0, 10),
      tgl_jatuh_tempo: (document.getElementById('cuTempo') || {}).value || new Date().toISOString().slice(0, 10),
      catatan: String((document.getElementById('cuCatatan') || {}).value || '').trim(),
      akun_lawan: (document.getElementById('cuAkunLawan') || {}).value || 'Persediaan Obat & Alkes',
      status_bayar: 'BELUM_LUNAS'
    });
    _writeFinLocalList(MANUAL_UTANG_KEY, list);
    S().closeModal();
    global.toast('Catatan Utang Usaha baru berhasil disimpan.', 'ok');
    global.renderActiveView();
  };
  global.payManualUtang = async (idUtang, nom) => {
    try {
      const list = _readFinLocalList(MANUAL_UTANG_KEY);
      const target = list.find((u) => u.id_utang === idUtang);
      if (!target) throw new Error('Data utang manual tidak ditemukan.');
      await API().callApi('finance.saveJurnal', {
        jenis_trx: 'KELUAR_PEMBAYARAN_UTANG',
        kategori: `Bayar Utang ${target.kode_faktur} (${target.id_pbf})`,
        nominal: Number(nom || target.sisa_utang || 0),
        metode: 'TRANSFER_BANK',
        referensi_id: target.kode_faktur,
        periode_bulan: new Date().toISOString().slice(0, 7)
      }, { isWrite: true });
      target.sisa_utang = 0;
      target.status_bayar = 'LUNAS';
      _writeFinLocalList(MANUAL_UTANG_KEY, list);
      global.toast('Pelunasan Utang Usaha dicatat ke Buku Kas!', 'ok');
      await global.bootLoadState(true);
    } catch (e) { global.toast(e.message, 'err'); }
  };
  global.openImportUtangInfoModal = () => {
    global.toast('Gunakan Import Faktur PBF di menu Pembelian & Faktur atau + Catat Utang untuk saldo awal.', 'info');
  };
  global.exportUtangUsahaExcel = (mode) => {
    const st = S().AppState;
    if (mode === 'riwayat') {
      const rows = (st.jurnalKeuangan || []).filter((j) => String(j.jenis_trx || '').includes('PEMBAYARAN_PBF') || String(j.jenis_trx || '').includes('PEMBAYARAN_UTANG')).map((r, i) => ({ no: i + 1, tanggal: String(r.tanggal || '').slice(0, 10), faktur: r.referensi_id || '-', keterangan: r.kategori, metode: r.metode, nominal: Number(r.nominal || 0) }));
      if (!rows.length) return global.toast('Belum ada riwayat pembayaran utang.', 'warn');
      return S().exportDataset('xlsx', 'Riwayat Pembayaran Utang', `riwayat-utang-${new Date().toISOString().slice(0, 10)}`, [
        { key: 'no', label: 'No', type: 'int', width: 6 },
        { key: 'tanggal', label: 'Tanggal', type: 'str', width: 13 },
        { key: 'faktur', label: 'No. Faktur', type: 'str', width: 18 },
        { key: 'keterangan', label: 'Keterangan', type: 'wrap', width: 28 },
        { key: 'metode', label: 'Akun Kas', type: 'str', width: 16 },
        { key: 'nominal', label: 'Nominal Bayar', type: 'currency', sum: true, width: 18 }
      ], rows, { sheetName: 'RiwayatUtang' });
    }
    const rows = (st.fakturPbf || []).filter((f) => Number(f.sisa_hutang || 0) > 0).map((f, i) => ({ no: i + 1, faktur: f.no_faktur_pbf, supplier: f.id_pbf, tempo: f.tgl_jatuh_tempo, sisa: Number(f.sisa_hutang || 0) }));
    if (!rows.length) return global.toast('Tidak ada utang aktif.', 'warn');
    S().exportDataset('xlsx', 'Daftar Utang Usaha PBF', `utang-usaha-${new Date().toISOString().slice(0, 10)}`, [
      { key: 'no', label: 'No', type: 'int', width: 6 },
      { key: 'faktur', label: 'No. Faktur', type: 'str', width: 20 },
      { key: 'supplier', label: 'Kreditur', type: 'wrap', width: 24 },
      { key: 'tempo', label: 'Jatuh Tempo', type: 'str', width: 14 },
      { key: 'sisa', label: 'Nominal Sisa', type: 'currency', sum: true, width: 18 }
    ], rows, { sheetName: 'UtangUsaha' });
  };

  global.setPiutangSubView = (v) => { piutangSubView = ['list', 'ttf', 'riwayat'].includes(v) ? v : 'list'; global.renderActiveView(); };
  global.setPiutangSearchQ = (q) => { piutangSearchQ = q || ''; global.renderActiveView(); };
  global.setPiutangDueFilter = (d) => { piutangDueFilter = d || ''; global.renderActiveView(); };
  global.setPiutangStatusFilter = (s) => { piutangStatusFilter = s || 'SEMUA'; global.renderActiveView(); };
  global.openCatatPiutangModal = () => {
    const members = S().AppState.members || [];
    const autoNo = 'INVP' + new Date().toISOString().slice(2, 10).replace(/-/g, '') + '-1';
    const today = new Date().toISOString().slice(0, 10);
    const dueDef = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
    S().openModal(`<div class="p-6 space-y-3 text-xs">
      <div class="flex justify-between items-center pb-2 border-b" style="border-color:var(--ons-border)">
        <h3 class="font-bold text-base text-blue-600">Detail Piutang Usaha</h3>
        <button type="button" onclick="ONSStore.closeModal()" class="text-xl px-1">&times;</button>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="font-semibold block mb-1">Kode Faktur</label><input id="cpKodeFak" class="ons-input font-mono-num" value="${autoNo}"/></div>
        <div><label class="font-semibold block mb-1">Kode Invoice Eksternal</label><input id="cpKodeEks" class="ons-input font-mono-num" placeholder="Opsional"/></div>
      </div>
      <div><label class="font-semibold block mb-1">Customer *</label>
        <input id="cpCustomer" list="cpCustList" class="ons-input" placeholder="Ketik atau pilih nama pelanggan / klinik / dokter"/>
        <datalist id="cpCustList">${members.map((m) => `<option value="${S().esc(m.nama_lengkap || m.nama || '')}">`).join('')}</datalist>
      </div>
      <div class="grid grid-cols-3 gap-3">
        <div><label class="font-semibold block mb-1">Jumlah Piutang (Rp) *</label><input id="cpJumlah" type="number" min="1" class="ons-input font-mono-num" value="0" oninput="window.refreshPiutangJurnalPreview()"/></div>
        <div><label class="font-semibold block mb-1">Waktu Transaksi</label><input id="cpWaktu" type="date" class="ons-input" value="${today}"/></div>
        <div><label class="font-semibold block mb-1">Tanggal Jatuh Tempo</label><input id="cpTempo" type="date" class="ons-input" value="${dueDef}"/></div>
      </div>
      <div><label class="font-semibold block mb-1">Catatan</label><input id="cpCatatan" class="ons-input" placeholder="Opsional keterangan piutang"/></div>
      <div><label class="font-semibold block mb-1">Pilih Akun Lawan</label>
        <select id="cpAkunLawan" class="ons-select" onchange="window.refreshPiutangJurnalPreview()">
          <option value="Pendapatan Penjualan Obat">Pendapatan Penjualan Obat</option>
          <option value="Pendapatan Jasa Klinik / Praktek">Pendapatan Jasa Klinik / Praktek</option>
          <option value="Saldo Awal Piutang Usaha">Saldo Awal Piutang Usaha</option>
        </select>
      </div>
      <div class="pt-1">
        <div class="font-bold text-blue-600 mb-1.5">Jurnal Transaksi</div>
        <div class="ons-table-wrap">
          <table class="ons-table"><thead><tr><th>No.</th><th>Akun</th><th class="text-right">Debit</th><th class="text-right">Kredit</th></tr></thead><tbody id="cpJurnalPrev">
            <tr><td>1</td><td>Piutang Usaha</td><td class="text-right font-mono-num">Rp 0</td><td class="text-right">-</td></tr>
            <tr><td>2</td><td>Pendapatan Penjualan Obat</td><td class="text-right">-</td><td class="text-right font-mono-num">Rp 0</td></tr>
          </tbody></table>
        </div>
      </div>
      <div class="flex justify-end gap-2 pt-2">
        <button type="button" onclick="ONSStore.closeModal()" class="ons-btn ons-btn-ghost text-xs">Batal</button>
        <button type="button" onclick="window.submitCatatPiutangModal()" class="ons-btn ons-btn-emerald text-xs font-bold">Simpan</button>
      </div>
    </div>`, '560px');
  };
  global.refreshPiutangJurnalPreview = () => {
    const val = Math.max(0, Number((document.getElementById('cpJumlah') || {}).value || 0));
    const akun = (document.getElementById('cpAkunLawan') || {}).value || 'Pendapatan Penjualan Obat';
    const tb = document.getElementById('cpJurnalPrev');
    if (tb) tb.innerHTML = `<tr><td>1</td><td>Piutang Usaha</td><td class="text-right font-mono-num">${S().rp(val)}</td><td class="text-right">-</td></tr><tr><td>2</td><td>${S().esc(akun)}</td><td class="text-right">-</td><td class="text-right font-mono-num">${S().rp(val)}</td></tr>`;
  };
  global.submitCatatPiutangModal = () => {
    const cust = String((document.getElementById('cpCustomer') || {}).value || '').trim();
    const amt = Math.max(0, Number((document.getElementById('cpJumlah') || {}).value || 0));
    if (!cust) return global.toast('Customer wajib diisi.', 'warn');
    if (amt <= 0) return global.toast('Jumlah Piutang harus lebih dari 0.', 'warn');
    const list = _readFinLocalList(MANUAL_PIUTANG_KEY);
    list.unshift({
      id_piutang: 'PTGM-' + Date.now().toString().slice(-6),
      kode_faktur: String((document.getElementById('cpKodeFak') || {}).value || '').trim() || ('INVP-' + Date.now()),
      kode_eksternal: String((document.getElementById('cpKodeEks') || {}).value || '').trim(),
      nama_pelanggan: cust,
      metode_bayar: 'TEMPO',
      total_tagihan: amt,
      total_dibayar: 0,
      sisa_piutang: amt,
      waktu_trx: (document.getElementById('cpWaktu') || {}).value || new Date().toISOString().slice(0, 10),
      tgl_jatuh_tempo: (document.getElementById('cpTempo') || {}).value || new Date().toISOString().slice(0, 10),
      catatan: String((document.getElementById('cpCatatan') || {}).value || '').trim(),
      akun_lawan: (document.getElementById('cpAkunLawan') || {}).value || 'Pendapatan Penjualan Obat',
      status_piutang: 'BELUM_LUNAS'
    });
    _writeFinLocalList(MANUAL_PIUTANG_KEY, list);
    S().closeModal();
    global.toast('Catatan Piutang Usaha berhasil disimpan.', 'ok');
    global.renderActiveView();
  };
  global.openBuatTtfModal = (kodeFaktur, namaPel, tagihan) => {
    const autoTtf = 'TTF-' + new Date().toISOString().slice(2, 10).replace(/-/g, '') + '-' + Math.floor(10 + Math.random() * 89);
    const today = new Date().toISOString().slice(0, 10);
    S().openModal(`<div class="p-6 space-y-3 text-xs">
      <div class="flex justify-between items-center pb-2 border-b" style="border-color:var(--ons-border)"><h3 class="font-bold text-base text-blue-600">Terbitkan Tanda Terima Faktur (TTF)</h3><button onclick="ONSStore.closeModal()" class="text-xl">&times;</button></div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="font-semibold block mb-1">No. TTF *</label><input id="ttfNoInp" class="ons-input font-mono-num" value="${autoTtf}"/></div>
        <div><label class="font-semibold block mb-1">Kode Faktur *</label><input id="ttfFakInp" class="ons-input font-mono-num" value="${S().esc(kodeFaktur || '')}"/></div>
      </div>
      <div><label class="font-semibold block mb-1">Nama Pelanggan / Debitur</label><input id="ttfPelInp" class="ons-input" value="${S().esc(namaPel || '')}"/></div>
      <div class="grid grid-cols-3 gap-3">
        <div><label class="font-semibold block mb-1">Jadwal Penyerahan</label><input id="ttfJadwalInp" type="date" class="ons-input" value="${today}"/></div>
        <div><label class="font-semibold block mb-1">Sales / Kurir</label><input id="ttfSalesInp" list="ttfSalesDatalist" class="ons-input" value="Sales Apotek"/><datalist id="ttfSalesDatalist">${(typeof global.getOnsSalesStaffList === 'function' ? global.getOnsSalesStaffList() : []).map((x) => `<option value="${S().esc(x.nama_sales)}"></option>`).join('')}</datalist></div>
        <div><label class="font-semibold block mb-1">Tagihan Awal (Rp)</label><input id="ttfTagihanInp" type="number" class="ons-input font-mono-num" value="${Number(tagihan || 0)}"/></div>
      </div>
      <button type="button" onclick="window.submitBuatTtfModal()" class="ons-btn ons-btn-emerald w-full font-bold py-2">Simpan Tanda Terima Faktur</button>
    </div>`, '500px');
  };
  global.submitBuatTtfModal = () => {
    const noTtf = String((document.getElementById('ttfNoInp') || {}).value || '').trim();
    const kodeF = String((document.getElementById('ttfFakInp') || {}).value || '').trim();
    if (!noTtf || !kodeF) return global.toast('No. TTF dan Kode Faktur wajib diisi.', 'warn');
    const list = _readFinLocalList(TTF_PIUTANG_KEY);
    list.unshift({
      id_ttf: 'TTF-' + Date.now().toString().slice(-6),
      waktu_terbit: new Date().toISOString().slice(0, 10),
      no_ttf: noTtf,
      kode_faktur: kodeF,
      nama_pelanggan: String((document.getElementById('ttfPelInp') || {}).value || '').trim() || '-',
      jadwal_serah: (document.getElementById('ttfJadwalInp') || {}).value || new Date().toISOString().slice(0, 10),
      sales: String((document.getElementById('ttfSalesInp') || {}).value || '').trim() || 'Sales Apotek',
      status: 'TERBIT',
      tagihan_awal: Number((document.getElementById('ttfTagihanInp') || {}).value || 0)
    });
    _writeFinLocalList(TTF_PIUTANG_KEY, list);
    S().closeModal();
    piutangSubView = 'ttf';
    global.toast('Tanda Terima Faktur (TTF) berhasil diterbitkan.', 'ok');
    global.renderActiveView();
  };
  global.printKwitansiPiutang = (idJurnal) => {
    const j = (S().AppState.jurnalKeuangan || []).find((x) => String(x.id_jurnal || '') === String(idJurnal));
    if (!j) return global.toast('Data pembayaran piutang tidak ditemukan.', 'warn');
    const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;border:1px solid #cbd5e1;border-radius:8px">
      <h2 style="margin:0 0 6px;font-size:16px">KWITANSI PEMBAYARAN PIUTANG</h2>
      <div style="font-size:12px;color:#475569;margin-bottom:12px">${S().esc(S().getStoreProfile().nama_usaha || 'Apotek ONS Farma')}</div>
      <div style="font-size:12px;line-height:1.7">
        <div>No. Transaksi: <b>${S().esc(j.id_jurnal)}</b></div>
        <div>Tanggal: <b>${S().formatTgl(j.tanggal, true)}</b></div>
        <div>Referensi Nota / Faktur: <b>${S().esc(j.referensi_id || '-')}</b></div>
        <div>Keterangan: <b>${S().esc(j.kategori)}</b></div>
        <div>Nominal Diterima: <b style="font-size:15px">${S().rp(j.nominal)}</b> (${S().esc(j.metode || 'TUNAI')})</div>
      </div>
    </div>`;
    S().printHtmlZone(html, 'Kwitansi Pembayaran Piutang');
  };
  global.openImportPiutangInfoModal = () => {
    global.toast('Gunakan + Catat Piutang untuk mencatat saldo awal piutang manual, atau transaksi POS Tempo.', 'info');
  };
  global.exportPiutangUsahaExcel = (mode) => {
    const st = S().AppState;
    if (mode === 'riwayat') {
      const rows = (st.jurnalKeuangan || []).filter((j) => String(j.jenis_trx || '').startsWith('MASUK_PIUTANG')).map((r, i) => ({ no: i + 1, tanggal: String(r.tanggal || '').slice(0, 10), no_trx: r.id_jurnal, ref: r.referensi_id, keterangan: r.kategori, akun: r.metode, nominal: Number(r.nominal || 0) }));
      if (!rows.length) return global.toast('Belum ada riwayat pembayaran piutang.', 'warn');
      return S().exportDataset('xlsx', 'Riwayat Pembayaran Piutang', `riwayat-piutang-${new Date().toISOString().slice(0, 10)}`, [
        { key: 'no', label: 'No', type: 'int', width: 6 },
        { key: 'tanggal', label: 'Tanggal', type: 'str', width: 13 },
        { key: 'no_trx', label: 'No. Transaksi', type: 'str', width: 16 },
        { key: 'ref', label: 'Asal Faktur', type: 'str', width: 18 },
        { key: 'keterangan', label: 'Keterangan', type: 'wrap', width: 28 },
        { key: 'akun', label: 'Akun Kas', type: 'str', width: 16 },
        { key: 'nominal', label: 'Nominal Bayar', type: 'currency', sum: true, width: 18 }
      ], rows, { sheetName: 'PembayaranPiutang' });
    }
    const rows = (st.piutangPelanggan || []).map((pt, i) => ({ no: i + 1, invoice: pt.no_invoice || pt.id_piutang, debitur: pt.nama_pelanggan, tempo: pt.tgl_jatuh_tempo || '-', tagihan: Number(pt.total_tagihan || 0), sisa: Number(pt.sisa_piutang || 0), status: pt.status_piutang }));
    if (!rows.length) return global.toast('Belum ada data piutang.', 'warn');
    S().exportDataset('xlsx', 'Daftar Piutang Usaha', `piutang-usaha-${new Date().toISOString().slice(0, 10)}`, [
      { key: 'no', label: 'No', type: 'int', width: 6 },
      { key: 'invoice', label: 'No. Invoice', type: 'str', width: 20 },
      { key: 'debitur', label: 'Debitur', type: 'wrap', width: 24 },
      { key: 'tempo', label: 'Jatuh Tempo', type: 'str', width: 13 },
      { key: 'tagihan', label: 'Nominal Awal', type: 'currency', sum: true, width: 18 },
      { key: 'sisa', label: 'Nominal Sisa', type: 'currency', sum: true, width: 18 },
      { key: 'status', label: 'Status', type: 'str', width: 14 }
    ], rows, { sheetName: 'PiutangUsaha' });
  };

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

  global.exportFinancePnlExcel = (fmt) => {
    const st = S().AppState;
    const rows = (st.penjualan || []).map((p, idx) => ({
      no: idx + 1,
      no_invoice: p.no_invoice || '-',
      tanggal: String(p.tanggal || '').slice(0, 10),
      metode: p.metode_bayar || 'TUNAI',
      grand_total: Number(p.grand_total || 0),
      total_hpp: Number(p.total_hpp || 0),
      margin: Number(p.estimasi_margin !== undefined ? p.estimasi_margin : (Number(p.grand_total || 0) - Number(p.total_hpp || 0))),
      status: p.status_trx || 'LUNAS'
    }));
    const prof = typeof S().getStoreProfile === 'function' ? S().getStoreProfile() : {};
    const apotekName = prof.nama_usaha || 'Apotek ONS Farma';
    const dStamp = new Date().toISOString().slice(0, 10);
    S().exportDataset(fmt || 'xlsx', `Laporan Laba Rugi (P&L) - ${apotekName}`, `Laporan_PnL_${dStamp}`, [
      { key: 'no', label: 'No', type: 'int', width: 6 },
      { key: 'no_invoice', label: 'No Invoice', type: 'text', width: 22 },
      { key: 'tanggal', label: 'Tanggal', type: 'date', width: 13 },
      { key: 'metode', label: 'Metode Bayar', type: 'text', width: 15 },
      { key: 'grand_total', label: 'Omzet (Rp)', type: 'currency', sum: true, width: 17 },
      { key: 'total_hpp', label: 'HPP / COGS (Rp)', type: 'currency', sum: true, width: 17 },
      { key: 'margin', label: 'Laba Kotor (Rp)', type: 'currency', sum: true, width: 17 },
      { key: 'status', label: 'Status', type: 'status', width: 14 }
    ], rows, {
      sheetName: 'Laporan_PnL',
      subtitle: `Dicetak ${S().formatTgl(new Date().toISOString(), true)} | Total ${rows.length} transaksi`,
      emptyMessage: 'Belum ada transaksi penjualan pada laporan Laba Rugi.'
    });
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
        <div><label class="font-semibold block mb-1">Potongan Kasbon / Lainnya</label><input id="sgPot" type="number" class="ons-input font-mono-num" value="150000"/></div>
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
    const prof = S().getStoreProfile ? S().getStoreProfile() : {};
    S().printHtmlZone(`<div style="font-family:Arial,sans-serif;border:2px solid #09202A;padding:24px;max-width:680px;margin:auto;font-size:12px;">
      <div style="border-bottom:2px solid #09202A;padding-bottom:10px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;">
        <div style="display:flex;align-items:center;gap:10px;">
          <img src="${S().esc(prof.logo_usaha_url || './icons/ons-farma-app-icon.png')}" style="width:40px;height:40px;object-fit:contain;border-radius:6px;"/>
          <div><b style="font-size:16px;">${S().esc((prof.nama_usaha || 'APOTEK ONS FARMA').toUpperCase())}</b><br/><span style="font-size:10px;color:#555;">${S().esc(prof.alamat_usaha || '')}</span><br/>SLIP GAJI PEGAWAI &bull; PERIODE ${S().esc(per)}</div>
        </div>
        <div style="text-align:right;">Dicetak: ${new Date().toLocaleDateString('id-ID')}</div>
      </div>
      <p><b>Nama:</b> ${S().esc(nama)}<br/><b>Jabatan:</b> ${S().esc(jab)}</p>
      <table style="width:100%;border-collapse:collapse;margin:12px 0;" border="1" cellpadding="6">
        <tr><td>Gaji Pokok</td><td style="text-align:right;">${S().rp(pokok)}</td></tr>
        <tr><td>Tunjangan Profesi / Insentif Shift</td><td style="text-align:right;">${S().rp(tunj)}</td></tr>
        <tr><td>Potongan Kasbon / Lainnya</td><td style="text-align:right;color:#DC2626;">-${S().rp(pot)}</td></tr>
        <tr style="background:#f1f5f9;font-weight:bold;font-size:14px;"><td>THP / Gaji Bersih Diterima</td><td style="text-align:right;">${S().rp(bersih)}</td></tr>
      </table>
      <div style="margin-top:28px;display:flex;justify-content:space-between;"><div>Diterima Oleh,<br/><br/><br/>(${S().esc(nama)})</div><div>Pemilik ${S().esc(prof.nama_usaha || 'Apotek ONS Farma')},<br/><br/><br/><b>${S().esc(prof.nama_pemilik || 'apt. Anissa Faradifa R. Is Rumi')}</b></div></div>
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

    return `<div class="space-y-4 ons-view-enter">
      <div class="ons-page-header">
        <div>
          <h1 class="text-xl font-extrabold">Tagihan Home Care / Pelanggan, GrupBayar &amp; Kwitansi QR HMAC</h1>
          <p class="text-xs" style="color:var(--ons-text-soft)">1 bukti transfer banyak tagihan, verifikasi 1 klik, nomor kwitansi KW-YYYY-XXXXXX &amp; WA Reminder H-3/H-0.</p>
        </div>
        <div class="flex flex-wrap gap-2">
          ${seeCost ? `<button onclick="window.openGenTagihanModal()" class="ons-btn ons-btn-primary text-xs">+ Terbit Tagihan Massal</button>` : ''}
          <button onclick="window.openBayarGrupModal()" class="ons-btn ons-btn-emerald text-xs">&#128179; Bayar Beberapa Tagihan (GrupBayar)</button>
        </div>
      </div>

      <div class="ons-tab-bar">
        ${[
          { id: 'tagihan', label: 'Daftar Tagihan (' + list.length + ')' },
          { id: 'verifikasi', label: 'Verifikasi Bayar (' + pending.length + ')' },
          { id: 'potongan', label: 'Potongan & Subsidi (' + potongan.length + ')' },
          { id: 'reminder', label: 'Pengingat WA' }
        ].map((t) => `<button onclick="window.setBillingTab('${t.id}')" class="ons-tab-btn ${activeBillingTab === t.id ? 'active' : ''}">${t.label}</button>`).join('')}
      </div>

      ${activeBillingTab === 'tagihan' ? `<div class="ons-card p-4">
        <div class="ons-table-wrap">
          <table class="ons-table">
            <thead><tr><th>ID / Periode</th><th>Pasien</th><th>Deskripsi</th><th>Netto</th><th>Terbayar</th><th>Status</th><th>Aksi</th></tr></thead>
            <tbody>
              ${list.map((t) => `<tr>
                <td class="font-mono-num text-xs"><b>${S().esc(t.ID)}</b><br/>${S().esc(t.Periode)}</td>
                <td class="text-xs"><b>${S().esc(t.Nama_Pasien)}</b><br/>${S().esc(S().formatMemberProgram ? S().formatMemberProgram(t.Program) : t.Program)}</td>
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
        <h3 class="font-bold text-sm">Daftar Potongan / Subsidi Tagihan Pasien</h3>
        <div class="space-y-2 text-xs">
          ${potongan.map((pt) => `<div class="p-3 rounded-lg border flex justify-between"><span><b>${S().esc(pt.Nama_Pasien)}</b> (${S().esc(pt.JenisPotongan)})</span><span class="font-mono-num font-bold text-emerald-600">${pt.TipeNilai === 'PERSEN' ? pt.Nilai + '%' : S().rp(pt.Nilai)}</span></div>`).join('')}
        </div>
      </div>` : ''}

      ${activeBillingTab === 'reminder' ? `<div class="ons-card p-5 space-y-4 text-xs">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 class="font-bold text-sm">Pengingat Tagihan Pasien — Manual WA Gratis &amp; Antrean Fonnte</h3>
            <p style="color:var(--ons-text-soft)">Klik <b>Kirim WA Manual (Gratis)</b> untuk langsung membuka chat WhatsApp pasien tanpa biaya token API.</p>
          </div>
          <button onclick="window.runWaReminderNow()" class="ons-btn ons-btn-ghost text-xs">Antrikan via Fonnte API (Opsional)</button>
        </div>
        <div class="space-y-2">
          ${(() => {
            const prof = S().getStoreProfile ? S().getStoreProfile() : {};
            const namaApotek = prof.nama_usaha || 'Apotek ONS Farma';
            const openBills = list.filter((t) => t.Status !== 'LUNAS' && t.Status !== 'BATAL');
            if (!openBills.length) return '<div class="p-4 text-center rounded-xl border" style="color:var(--ons-text-soft);border-color:var(--ons-border)">Semua tagihan periode ini sudah lunas.</div>';
            return openBills.map((t) => {
              const sisa = Math.max(0, Number(t.Netto || 0) - Number(t.Terbayar || 0));
              const msg = `Halo Kak ${t.Nama_Pasien}, mengingatkan tagihan ${namaApotek} (${t.Deskripsi || t.ID}) sebesar ${S().rp(sisa)} dengan jatuh tempo ${t.JatuhTempo || '-'}. Terima kasih.`;
              const href = S().buildWaUrl ? S().buildWaUrl(t.HP_Pasien || '', msg) : ('https://wa.me/?text=' + encodeURIComponent(msg));
              return `<div class="p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
                <div>
                  <div class="font-bold">${S().esc(t.Nama_Pasien)} <span class="font-mono-num" style="color:var(--ons-text-soft)">(${S().esc(t.HP_Pasien || 'Pilih kontak di WA')})</span></div>
                  <div style="color:var(--ons-text-soft)">${S().esc(t.Deskripsi)} &bull; Sisa: <b class="text-red-600 font-mono-num">${S().rp(sisa)}</b> &bull; JT: ${S().esc(t.JatuhTempo || '-')}</div>
                </div>
                <a target="_blank" rel="noopener" href="${S().esc(href)}" class="ons-btn ons-btn-emerald text-xs py-1.5 px-3 font-bold">Kirim WA Manual (Gratis)</a>
              </div>`;
            }).join('');
          })()}
        </div>
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
      <div class="flex justify-between items-center"><h3 class="font-bold text-base">Terbit Tagihan Massal Pasien &amp; Home Care</h3><button onclick="ONSStore.closeModal()" class="text-xl">&times;</button></div>
      <label class="font-semibold block">Periode (pisahkan koma untuk multi-bulan, cth: ${curMonth})</label>
      <input id="tgPer" class="ons-input font-mono-num" value="${curMonth}"/>
      <label class="font-semibold block">Deskripsi Layanan</label>
      <input id="tgDesk" class="ons-input" value="Paket Home Pharmacy Care / Terapi Bulanan"/>
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
    const prof = S().getStoreProfile ? S().getStoreProfile() : {};
    const verifyLink = `${global.location.origin}${global.location.pathname}#kwitansi=${encodeURIComponent(noKw)}&sig=${encodeURIComponent(validSig)}`;
    S().openModal(`<div class="p-6 text-center space-y-3">
      <div class="p-5 border-2 rounded-xl text-left space-y-3 bg-white text-black">
        <div class="flex justify-between items-start border-b pb-2">
          <div class="flex items-center gap-2"><img src="${S().esc(prof.logo_usaha_url || './icons/ons-farma-app-icon.png')}" class="w-8 h-8 rounded object-contain"/><div><div class="font-bold text-base">KWITANSI PEMBAYARAN RESMI</div><div class="text-xs">${S().esc(prof.nama_usaha || 'Apotek ONS Farma')} &bull; ${S().esc(prof.alamat_usaha || '')}</div></div></div>
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
    if (Array.isArray(st.deDokumen) && st.deDokumen.length && (!docCache.docs.length || st.deDokumen.length > docCache.docs.length)) {
      docCache.docs = st.deDokumen.slice();
    }
    const docs = docCache.docs || st.deDokumen || [];
    const tpls = docCache.templates || [];
    const spAll = st.suratPesanan || [];
    const shiftAll = st.shiftHistory || [];

    return `<div class="space-y-4 ons-view-enter">
      <div class="ons-page-header">
        <div>
          <h1 class="text-xl font-extrabold">Mesin Dokumen &amp; Arsip Resmi Apotek (Doc Engine)</h1>
          <p class="text-xs" style="color:var(--ons-text-soft)">Templat {{...}} Docs/Sheets/Slides, persetujuan PIN APJ/Pemilik, pembekuan TERBIT, Arsip SP &amp; Verifikasi Publik 20-Karakter.</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button onclick="window.refreshDocEngineIfNeeded(true)" class="ons-btn ons-btn-ghost text-xs">Sinkron Server</button>
          <button onclick="window.openCreateDocModal()" class="ons-btn ons-btn-primary text-xs">+ Buat Draf Surat Resmi Baru</button>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
        <div class="ons-card p-3.5"><div style="color:var(--ons-text-soft)">Surat Resmi Terbit</div><div class="text-lg font-bold font-mono-num text-emerald-600">${docs.filter((x) => x.Status === 'TERBIT').length}</div></div>
        <div class="ons-card p-3.5"><div style="color:var(--ons-text-soft)">Menunggu TTD Pejabat</div><div class="text-lg font-bold font-mono-num text-amber-600">${docs.filter((x) => x.Status !== 'TERBIT').length}</div></div>
        <div class="ons-card p-3.5"><div style="color:var(--ons-text-soft)">Arsip Surat Pesanan (SP)</div><div class="text-lg font-bold font-mono-num text-blue-600">${spAll.length} (${spAll.filter((s) => s.status_sp === 'SELESAI_DITERIMA').length} Diterima)</div></div>
        <div class="ons-card p-3.5"><div style="color:var(--ons-text-soft)">Arsip Tutup Shift Kasir</div><div class="text-lg font-bold font-mono-num">${shiftAll.length} Shift</div></div>
      </div>

      <div class="ons-tab-bar">
        <button onclick="window.setDocTab('surat')" class="ons-tab-btn ${activeDocTab === 'surat' ? 'active' : ''}">Arsip &amp; Surat QR (${docs.length})</button>
        <button onclick="window.setDocTab('pindai')" class="ons-tab-btn ${activeDocTab === 'pindai' ? 'active' : ''}">Pemindai Templat (${tpls.length})</button>
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
      const prof = S().getStoreProfile();
      return tags.map((tg) => {
        const clean = String(tg).replace(/^\{+|\}+$/g, '').split('|')[0];
        const defVal = clean.includes('APJ') ? (prof.nama_pemilik || 'apt. Anissa Faradifa R. Is Rumi') : (clean.includes('SIPA') ? (prof.sipa_pemilik || '19920412/SIPA_35.78/2025/1042') : (clean.includes('APOTEK') ? (prof.nama_usaha || 'Apotek ONS Farma') : (clean.includes('PBF') ? 'PT Bina San Prima' : '')));
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
      await global.bootLoadState(true);
    } catch (e) { global.toast(e.message, 'err'); }
  };

  global.openSignDocPinModal = (idDoc) => {
    S().openModal(`<div class="p-6 space-y-3 text-xs text-center">
      <h3 class="font-bold text-base">Tanda Tangan Elektronik &amp; Pembekuan TERBIT</h3>
      <p>Masukkan PIN 6 Digit APJ/Pemilik untuk menandatangani, menghitung Hash SHA-256 &amp; menerbitkan Kode Verifikasi Publik.</p>
      <input id="dePinSignInput" type="password" maxlength="6" autocomplete="off" class="ons-input font-mono-num text-center text-lg" placeholder="6 Digit PIN${API().isDemoMode() ? ' (Demo: 123456)' : ''}"/>
      <button onclick="window.executeSignDoc('${idDoc}')" class="ons-btn ons-btn-emerald w-full">Tanda Tangani &amp; Terbitkan Surat</button>
    </div>`, '420px');
  };

  global.executeSignDoc = async (idDoc) => {
    try {
      const res = await API().callApi('doc.signAndIssue', { id_dokumen: idDoc, pin: document.getElementById('dePinSignInput').value }, { isWrite: true });
      S().closeModal();
      global.toast('Surat TERBIT! Kode Verifikasi: ' + res.kode_verifikasi, 'ok');
      await global.refreshDocEngineIfNeeded(true);
      await global.bootLoadState(true);
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
  function _parseSplitTunai(detailSplit) {
    if (!detailSplit) return 0;
    if (typeof detailSplit === 'object') return Number(detailSplit.tunai || 0);
    const s = String(detailSplit || '');
    if (s.trim().startsWith('{')) {
      try { const o = JSON.parse(s); return Number(o.tunai || 0); } catch (e) {}
    }
    const m = s.match(/Tunai\s*(?:Rp)?\s*([\d.,]+)/i);
    if (m) return Number(String(m[1]).replace(/[^\d]/g, '')) || 0;
    return 0;
  }

  const SHIFT_BILLS = [
    { val: 100000, label: 'Rp 100.000', tone: 'bg-red-500/12 text-red-700 dark:text-red-300 border-red-500/30' },
    { val: 50000, label: 'Rp 50.000', tone: 'bg-blue-500/12 text-blue-700 dark:text-blue-300 border-blue-500/30' },
    { val: 20000, label: 'Rp 20.000', tone: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' },
    { val: 10000, label: 'Rp 10.000', tone: 'bg-sky-500/12 text-sky-700 dark:text-sky-300 border-sky-500/30' },
    { val: 5000, label: 'Rp 5.000', tone: 'bg-amber-500/12 text-amber-700 dark:text-amber-300 border-amber-500/30' },
    { val: 2000, label: 'Rp 2.000', tone: 'bg-slate-500/12 text-slate-700 dark:text-slate-300 border-slate-500/30' }
  ];
  const SHIFT_COINS = [
    { val: 1000, label: 'Rp 1.000', tone: 'bg-slate-500/12 text-slate-700 dark:text-slate-300 border-slate-500/30' },
    { val: 500, label: 'Rp 500', tone: 'bg-amber-500/12 text-amber-700 dark:text-amber-300 border-amber-500/30' },
    { val: 200, label: 'Rp 200', tone: 'bg-slate-500/12 text-slate-700 dark:text-slate-300 border-slate-500/30' },
    { val: 100, label: 'Rp 100', tone: 'bg-slate-500/12 text-slate-700 dark:text-slate-300 border-slate-500/30' }
  ];
  let shiftMetaCtx = { expectedBase: 0, sisTunai: 0, canReveal: false };

  function _calcDenomSum() {
    return Object.keys(shiftDenomCounts).reduce((s, d) => s + (Number(d) * Number(shiftDenomCounts[d] || 0)), 0);
  }

  function _shiftDurationText(tglBuka) {
    if (!tglBuka) return '-';
    const startMs = Date.parse(tglBuka);
    if (!Number.isFinite(startMs)) return '-';
    const diffMin = Math.max(0, Math.round((Date.now() - startMs) / 60000));
    const h = Math.floor(diffMin / 60);
    const m = diffMin % 60;
    return h > 0 ? `${h} jam ${m} mnt` : `${m} menit`;
  }

  function _syncShiftSplitPreview() {
    const aktEl = document.getElementById('shAktual');
    const modalEl = document.getElementById('shModal');
    const floatEl = document.getElementById('shFloatNext');
    const aktVal = aktEl ? Math.max(0, Number(aktEl.value || 0)) : (shiftAktualCustom !== null ? shiftAktualCustom : _calcDenomSum());
    const modalVal = modalEl ? Math.max(0, Number(modalEl.value || 0)) : 0;
    const floatVal = floatEl ? Math.max(0, Number(floatEl.value || 0)) : (shiftFloatNext !== null ? shiftFloatNext : modalVal);
    const bankDrop = Math.max(0, aktVal - floatVal);
    const dropEl = document.getElementById('shBankDropPreview');
    if (dropEl) dropEl.textContent = S().rp(bankDrop);

    const varEl = document.getElementById('shLiveVariancePreview');
    if (varEl && shiftMetaCtx.canReveal && shiftBlindRevealed) {
      const target = modalVal + Number(shiftMetaCtx.sisTunai || 0);
      const diff = aktVal - target;
      const cls = diff === 0 ? 'text-emerald-600' : (diff > 0 ? 'text-blue-600' : 'text-red-600');
      const txt = diff === 0 ? 'Klop (Rp 0)' : (diff > 0 ? ('Lebih +' + S().rp(diff)) : ('Kurang -' + S().rp(Math.abs(diff))));
      varEl.className = 'font-mono-num font-extrabold text-sm ' + cls;
      varEl.textContent = txt;
    }
  }

  function renderDenomRowHtml(item) {
    const qty = Number(shiftDenomCounts[item.val] || 0);
    const sub = item.val * qty;
    return `<div id="denomRow_${item.val}" class="ons-denom-row ${qty > 0 ? 'is-nonzero' : ''}">
      <div class="flex items-center gap-2 min-w-0">
        <span class="ons-denom-pill border ${item.tone} shrink-0">${item.label}</span>
        <span class="text-[11px] hidden sm:inline truncate" style="color:var(--ons-text-soft)">&times;</span>
      </div>
      <div class="ons-denom-ctrl">
        <button type="button" onclick="window.stepShiftDenom(${item.val}, -1)" aria-label="Kurangi 1 lembar ${item.label}" class="ons-denom-stepbtn">&minus;</button>
        <input id="denomInp_${item.val}" type="number" min="0" value="${qty}" oninput="window.updateShiftDenom(${item.val}, this.value)" aria-label="Jumlah ${item.label}" class="ons-input font-mono-num w-14 text-center py-1 min-h-0 h-9 font-bold"/>
        <button type="button" onclick="window.stepShiftDenom(${item.val}, 1)" aria-label="Tambah 1 lembar ${item.label}" class="ons-denom-stepbtn">+1</button>
        <button type="button" onclick="window.stepShiftDenom(${item.val}, 5)" aria-label="Tambah 5 lembar ${item.label}" class="ons-denom-stepbtn hidden sm:inline-flex items-center justify-center">+5</button>
      </div>
      <div id="denomSub_${item.val}" class="font-mono-num font-bold text-right text-xs truncate ${qty > 0 ? 'text-blue-600 dark:text-blue-400' : ''}" style="${qty > 0 ? '' : 'color:var(--ons-text-soft)'}">${S().rp(sub)}</div>
    </div>`;
  }

  function renderTutupShiftView(opts) {
    const st = S().AppState;
    const todayIso = new Date().toISOString().slice(0, 10);
    const allToday = (st.penjualan || []).filter((p) => {
      const tgl = String(p.tanggal || '').slice(0, 10);
      return !tgl || tgl === todayIso;
    });
    const validToday = allToday.filter((p) => String(p.status_trx || '') !== 'RETUR');
    const returToday = allToday.length - validToday.length;
    let sisTunai = 0;
    let sisQris = 0;
    let sisTransfer = 0;
    let sisPiutang = 0;
    let totalBruto = 0;
    validToday.forEach((p) => {
      const tot = Number(p.grand_total || 0);
      totalBruto += tot;
      const met = String(p.metode_bayar || 'TUNAI').toUpperCase();
      if (met === 'TUNAI') {
        sisTunai += tot;
      } else if (met === 'SPLIT') {
        const cashPart = Math.min(tot, _parseSplitTunai(p.detail_split));
        sisTunai += cashPart;
        sisQris += Math.max(0, tot - cashPart);
      } else if (met === 'QRIS') {
        sisQris += tot;
      } else if (met === 'PIUTANG') {
        sisPiutang += tot;
      } else {
        sisTransfer += tot;
      }
    });
    const actShift = st.activeShift || (st.shiftHistory || []).find((sh) => String(sh.status_shift || '').toUpperCase() === 'TERBUKA') || null;
    const modalDefault = actShift ? Number(actShift.modal_awal || 0) : 300000;
    const expectedTunai = modalDefault + sisTunai;
    const canReveal = S().canSeeFinancialCost ? S().canSeeFinancialCost() : false;
    shiftMetaCtx = { expectedBase: expectedTunai, sisTunai, canReveal };

    const denomSum = _calcDenomSum();
    const currentAktual = shiftAktualCustom !== null ? shiftAktualCustom : denomSum;
    const floatDefault = shiftFloatNext !== null ? shiftFloatNext : modalDefault;
    const bankDrop = Math.max(0, currentAktual - floatDefault);
    const liveDiff = currentAktual - expectedTunai;
    const shiftHist = (st.shiftHistory || []).filter((sh) => String(sh.status_shift || '').toUpperCase() !== 'TERBUKA');
    const latestClosed = shiftHist[0] || null;

    return `<div class="space-y-4 ons-view-enter">
      ${(opts && opts.subTabHeader) ? opts.subTabHeader : ''}

      <!-- Shift Status Workstation Header -->
      <div class="ons-pos-bar p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div class="flex flex-wrap items-center gap-3 min-w-0">
          ${actShift
            ? `<span class="ons-pos-live-dot"></span>`
            : `<span class="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></span>`}
          <div class="min-w-0 space-y-0.5">
            <div class="flex flex-wrap items-center gap-2">
              <span class="badge-bpom ${actShift ? 'bpom-bebas' : 'bpom-prekursor'}">${actShift ? 'SHIFT TERBUKA' : 'BELUM BUKA SHIFT'}</span>
              <h1 class="text-base sm:text-lg font-extrabold tracking-tight">Tutup Shift &amp; Rekonsiliasi Laci Kas</h1>
            </div>
            <p class="text-[11px] truncate" style="color:var(--ons-text-soft)">
              ${actShift
                ? `<span class="font-mono-num font-bold">${S().esc(actShift.id_shift)}</span> &bull; Kasir: <b>${S().esc(actShift.kasir_id || '-')}</b> &bull; Buka: ${S().formatTgl(actShift.tgl_buka, true)} (${_shiftDurationText(actShift.tgl_buka)}) &bull; Modal Laci: <b class="font-mono-num text-emerald-600">${S().rp(modalDefault)}</b>`
                : 'Belum ada shift aktif dibuka. Anda dapat membuka shift baru atau langsung melakukan penutupan kas harian.'}
            </p>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-2 shrink-0">
          ${!actShift && typeof global.openBukaShiftModal === 'function'
            ? `<button type="button" onclick="window.openBukaShiftModal()" class="ons-btn ons-btn-primary text-xs">+ Buka Shift Baru</button>`
            : ''}
          ${canReveal
            ? `<button type="button" onclick="window.toggleShiftBlindView()" class="ons-btn ${shiftBlindRevealed ? 'ons-btn-amber' : 'ons-btn-ghost'} text-xs" title="Pemilik/APJ dapat membuka target sistem untuk mencocokkan selisih">${shiftBlindRevealed ? 'Sembunyikan Target Sistem' : 'Intip Target Sistem (APJ/Pemilik)'}</button>`
            : `<span class="badge-bpom bpom-terbatas">Blind Count Terjaga</span>`}
          ${latestClosed
            ? `<button type="button" onclick="window.openZReportModal(0)" class="ons-btn ons-btn-ghost text-xs">Z-Report Terakhir</button>`
            : ''}
        </div>
      </div>

      <!-- 4 Tender Reconciliation Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 text-xs">
        <div class="ons-kpi-card is-blue">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <div style="color:var(--ons-text-soft)">Total Penjualan (${todayIso})</div>
              <div class="text-xl font-extrabold font-mono-num mt-1 text-blue-600 truncate">${S().rp(totalBruto)}</div>
            </div>
            <span class="ons-kpi-ico bg-blue-500/10 text-blue-600"><svg viewBox="0 0 24 24"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></span>
          </div>
          <div class="mt-2 pt-2 border-t text-[11px] flex justify-between" style="border-color:var(--ons-border);color:var(--ons-text-soft)">
            <span>${validToday.length} nota lunas</span>
            <span>${returToday > 0 ? returToday + ' retur/void' : '0 retur'}</span>
          </div>
        </div>

        <div class="ons-kpi-card is-emerald">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <div style="color:var(--ons-text-soft)">Non-Tunai QRIS</div>
              <div class="text-xl font-extrabold font-mono-num mt-1 text-emerald-600 truncate">${S().rp(sisQris)}</div>
            </div>
            <span class="ons-kpi-ico bg-emerald-500/10 text-emerald-600"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h7v7h-7z"/></svg></span>
          </div>
          <div class="mt-2 pt-2 border-t text-[11px]" style="border-color:var(--ons-border);color:var(--ons-text-soft)">Cocokkan dengan mutasi settlement QRIS</div>
        </div>

        <div class="ons-kpi-card is-blue">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <div style="color:var(--ons-text-soft)">Transfer Bank / EDC</div>
              <div class="text-xl font-extrabold font-mono-num mt-1 truncate">${S().rp(sisTransfer)}</div>
            </div>
            <span class="ons-kpi-ico bg-sky-500/10 text-sky-600"><svg viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg></span>
          </div>
          <div class="mt-2 pt-2 border-t text-[11px]" style="border-color:var(--ons-border);color:var(--ons-text-soft)">${sisPiutang > 0 ? ('Tempo/Piutang: ' + S().rp(sisPiutang)) : 'Settlement mesin EDC & mutasi rekening'}</div>
        </div>

        <div class="ons-kpi-card ${canReveal && shiftBlindRevealed ? 'is-emerald' : 'is-amber'}">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <div style="color:var(--ons-text-soft)">Target Kas Tunai Laci</div>
              <div class="text-xl font-extrabold font-mono-num mt-1 truncate ${canReveal && shiftBlindRevealed ? 'text-emerald-600' : 'text-amber-600'}">
                ${(canReveal && shiftBlindRevealed) ? S().rp(expectedTunai) : 'Blind Count'}
              </div>
            </div>
            <span class="ons-kpi-ico ${canReveal && shiftBlindRevealed ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}"><svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>
          </div>
          <div class="mt-2 pt-2 border-t text-[11px] truncate" style="border-color:var(--ons-border);color:var(--ons-text-soft)">
            ${(canReveal && shiftBlindRevealed) ? ('Modal ' + S().rp(modalDefault) + ' + Tunai ' + S().rp(sisTunai)) : 'Hitung fisik uang terlebih dahulu'}
          </div>
        </div>
      </div>

      <!-- Workspace 2-Kolom Ergonomis: Pecahan Rupiah vs Rekonsiliasi & Setoran -->
      <div class="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        <div class="ons-card p-5 xl:col-span-7 space-y-4 text-xs">
          <div class="flex flex-wrap items-center justify-between gap-2 pb-2 border-b" style="border-color:var(--ons-border)">
            <div>
              <h2 class="font-bold text-sm">1. Kalkulator Pecahan Uang Fisik Laci (Rupiah)</h2>
              <p class="text-[11px]" style="color:var(--ons-text-soft)">Ketuk tombol <b>+1 / +5</b> atau isi jumlah lembar &amp; keping. Total fisik otomatis tersinkron.</p>
            </div>
            <button type="button" onclick="window.resetShiftDenom()" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2.5">Reset 0</button>
          </div>

          <div class="space-y-2">
            <div class="text-[11px] font-bold uppercase tracking-wider" style="color:var(--ons-text-soft)">Uang Kertas</div>
            <div class="space-y-1.5">
              ${SHIFT_BILLS.map((item) => renderDenomRowHtml(item)).join('')}
            </div>
          </div>

          <div class="space-y-2 pt-1">
            <div class="text-[11px] font-bold uppercase tracking-wider" style="color:var(--ons-text-soft)">Uang Koin / Receh</div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              ${SHIFT_COINS.map((item) => renderDenomRowHtml(item)).join('')}
            </div>
          </div>

          <div class="p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
            <div>
              <div class="text-[11px] font-semibold" style="color:var(--ons-text-soft)">Total Hitungan Pecahan Laci</div>
              <div id="denomTotalPreview" class="text-xl font-extrabold font-mono-num text-blue-600">${S().rp(denomSum)}</div>
            </div>
            <button type="button" onclick="window.applyDenomToAktual()" class="ons-btn ons-btn-primary text-xs">Salin ke Fisik Aktual &rarr;</button>
          </div>
        </div>

        <div class="ons-card p-5 xl:col-span-5 space-y-4 text-xs">
          <div class="pb-2 border-b" style="border-color:var(--ons-border)">
            <h2 class="font-bold text-sm">2. Alokasi Setoran, Audit Selisih &amp; Pengesahan Z-Report</h2>
            <p class="text-[11px]" style="color:var(--ons-text-soft)">Tentukan modal receh yang ditinggal di laci dan setoran kas untuk Pemilik.</p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="font-semibold block mb-1">Modal Awal Laci (Rp)</label>
              <input id="shModal" type="number" min="0" oninput="window.onShiftModalChange(this.value)" class="ons-input font-mono-num" value="${modalDefault}"/>
            </div>
            <div>
              <label class="font-semibold block mb-1">Fisik Tunai Laci Aktual (Rp) *</label>
              <input id="shAktual" type="number" min="0" oninput="window.onShiftAktualManualInput(this.value)" class="ons-input font-mono-num font-extrabold text-base text-blue-600" value="${currentAktual}"/>
            </div>
          </div>

          <!-- Cash Management Split Wizard -->
          <div class="ons-shift-split-card space-y-3">
            <div class="flex items-center justify-between gap-2">
              <span class="font-bold text-xs">Pembagian Uang Laci (Float vs Setoran)</span>
              <span class="badge-bpom bpom-bebas text-[10px]">Anti-Keliru Setoran</span>
            </div>
            <div>
              <label class="font-semibold block mb-1">Sisakan Modal Shift Berikutnya / Float (Rp)</label>
              <input id="shFloatNext" type="number" min="0" oninput="window.onShiftFloatChange(this.value)" class="ons-input font-mono-num font-bold" value="${floatDefault}"/>
              <div class="flex flex-wrap gap-1.5 mt-1.5">
                ${[0, 200000, 300000, 500000].map((v) => `<button type="button" onclick="window.setShiftFloatPreset(${v})" class="ons-quick-denom">${v === 0 ? 'Rp 0' : S().rp(v)}</button>`).join('')}
              </div>
            </div>
            <div class="p-3 rounded-xl border flex items-center justify-between gap-2" style="background:var(--ons-bg-card);border-color:var(--ons-border)">
              <div>
                <div class="font-bold">Setoran Kas ke Brankas / Pemilik</div>
                <div class="text-[10px]" style="color:var(--ons-text-soft)">Fisik Tunai &minus; Modal Shift Berikutnya</div>
              </div>
              <div id="shBankDropPreview" class="text-lg font-extrabold font-mono-num text-emerald-600">${S().rp(bankDrop)}</div>
            </div>
          </div>

          <!-- Blind / Variance Evaluation -->
          <div class="p-3 rounded-xl border space-y-2" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
            <div class="flex items-center justify-between gap-2">
              <span class="font-bold">Evaluasi Selisih Kas</span>
              ${(canReveal && shiftBlindRevealed)
                ? `<span id="shLiveVariancePreview" class="font-mono-num font-extrabold text-sm ${liveDiff === 0 ? 'text-emerald-600' : (liveDiff > 0 ? 'text-blue-600' : 'text-red-600')}">${liveDiff === 0 ? 'Klop (Rp 0)' : (liveDiff > 0 ? ('Lebih +' + S().rp(liveDiff)) : ('Kurang -' + S().rp(Math.abs(liveDiff))))}</span>`
                : `<span id="shLiveVariancePreview" class="badge-bpom bpom-terbatas">Dihitung Otomatis Saat Simpan</span>`}
            </div>
            <div>
              <label class="font-semibold block mb-1">Keterangan / Alasan Selisih (Bila Ada)</label>
              <select id="shVarianceReason" onchange="window.onShiftReasonChange(this.value)" class="ons-select text-xs">
                <option value="" ${!shiftVarianceReason ? 'selected' : ''}>Tidak ada selisih / hitung fisik normal</option>
                <option value="Kembalian selisih receh" ${shiftVarianceReason === 'Kembalian selisih receh' ? 'selected' : ''}>Kembalian selisih uang receh</option>
                <option value="Pengeluaran kas kecil belum dicatat" ${shiftVarianceReason === 'Pengeluaran kas kecil belum dicatat' ? 'selected' : ''}>Pengeluaran kas kecil / ongkir belum dicatat</option>
                <option value="Salah metode QRIS / Transfer tercatat Tunai" ${shiftVarianceReason === 'Salah metode QRIS / Transfer tercatat Tunai' ? 'selected' : ''}>Salah metode pembayaran (QRIS / Transfer)</option>
                <option value="Kelebihan/kekurangan uang laci" ${shiftVarianceReason === 'Kelebihan/kekurangan uang laci' ? 'selected' : ''}>Selisih hitung laci lainnya (jelaskan di catatan)</option>
              </select>
            </div>
          </div>

          <div>
            <label class="font-semibold block mb-1">Catatan Serah Terima (Handover Shift Berikutnya)</label>
            <textarea id="shNote" rows="2" class="ons-textarea" placeholder="Serah terima kunci laci, modal receh &amp; catatan penting untuk kasir berikutnya..."></textarea>
          </div>

          <div class="p-3.5 rounded-xl border border-amber-500/40 bg-amber-500/10 space-y-2">
            <div class="font-bold text-amber-700 dark:text-amber-300">Otorisasi PIN 6 Digit APJ / Pemilik</div>
            <input id="shPin" type="password" maxlength="6" autocomplete="off" class="ons-input font-mono-num font-bold tracking-widest" placeholder="Masukkan 6 Digit PIN${API().isDemoMode() ? ' (Demo: 123456)' : ''}"/>
          </div>

          <button type="button" onclick="window.submitCloseShift(${sisTunai}, ${sisQris}, ${sisTransfer})" class="ons-btn ons-btn-emerald w-full py-3 font-bold text-xs shadow-sm">Tutup Shift, Simpan &amp; Terbitkan Z-Report</button>
          <p class="text-[10px] text-center" style="color:var(--ons-text-soft)">Setelah ditutup, Z-Report resmi langsung terbit dan rekap terkirim ke email/WA Pemilik.</p>
        </div>
      </div>

      <!-- Arsip Riwayat Tutup Shift & Cetak Z-Report -->
      <div class="ons-card p-5 space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 class="font-bold text-sm">Arsip Riwayat Tutup Shift &amp; Z-Report (${shiftHist.length})</h3>
            <p class="text-[11px]" style="color:var(--ons-text-soft)">Klik tombol <b>Z-Report</b> untuk melihat rincian tender, cetak struk 58/80mm, atau kirim laporan ke WhatsApp Pemilik.</p>
          </div>
        </div>
        <div class="ons-table-wrap">
          <table class="ons-table">
            <thead><tr><th>ID Shift &amp; Waktu Tutup</th><th>Kasir / Supervisor</th><th>Penjualan Sistem</th><th>Tunai Aktual</th><th>Selisih Kas</th><th>Catatan Handover</th><th class="text-right">Aksi</th></tr></thead>
            <tbody>
              ${shiftHist.length ? shiftHist.slice(0, 20).map((sh, idx) => {
                const diff = Number(sh.selisih_kas || 0);
                const sysTot = Number(sh.sistem_tunai || 0) + Number(sh.sistem_qris || 0) + Number(sh.sistem_transfer || 0);
                const diffBadgeCls = diff === 0 ? 'bpom-bebas' : (diff > 0 ? 'bpom-terbatas' : 'bpom-keras');
                const diffTxt = diff === 0 ? 'Klop Rp 0' : ((diff > 0 ? '+' : '-') + S().rp(Math.abs(diff)));
                return `<tr>
                  <td class="font-mono-num text-xs"><b>${S().esc(sh.id_shift)}</b><br/><span style="color:var(--ons-text-soft)">${S().formatTgl(sh.tgl_tutup, true)}</span></td>
                  <td class="text-xs"><b>${S().esc(sh.kasir_id || '-')}</b><br/><span style="color:var(--ons-text-soft)">SPV: ${S().esc(sh.supervisor_id || '-')}</span></td>
                  <td class="font-mono-num text-xs"><b>${S().rp(sysTot)}</b><br/><span class="text-[10px]" style="color:var(--ons-text-soft)">T:${S().rp(sh.sistem_tunai || 0)} &bull; Q:${S().rp(sh.sistem_qris || 0)}</span></td>
                  <td class="font-mono-num text-xs font-bold">${S().rp(sh.aktual_tunai || 0)}</td>
                  <td><span class="badge-bpom ${diffBadgeCls} font-mono-num">${diffTxt}</span></td>
                  <td class="text-xs max-w-[240px]" style="color:var(--ons-text-soft)">${S().esc(sh.catatan_handover || '-')}</td>
                  <td class="text-right"><button type="button" onclick="window.openZReportModal(${idx})" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2.5">Z-Report</button></td>
                </tr>`;
              }).join('') : '<tr><td colspan="7" class="text-center py-6 text-xs" style="color:var(--ons-text-soft)">Belum ada arsip penutupan shift tersimpan.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    </div>`;
  }

  function _refreshDenomRowDom(denomVal) {
    const qty = Number(shiftDenomCounts[denomVal] || 0);
    const inp = document.getElementById('denomInp_' + denomVal);
    if (inp && Number(inp.value) !== qty) inp.value = qty;
    const subEl = document.getElementById('denomSub_' + denomVal);
    if (subEl) {
      subEl.textContent = S().rp(denomVal * qty);
      subEl.className = 'font-mono-num font-bold text-right text-xs truncate ' + (qty > 0 ? 'text-blue-600 dark:text-blue-400' : '');
    }
    const rowEl = document.getElementById('denomRow_' + denomVal);
    if (rowEl && rowEl.classList) {
      rowEl.classList.toggle('is-nonzero', qty > 0);
    }
    const sum = _calcDenomSum();
    shiftAktualCustom = sum;
    const prev = document.getElementById('denomTotalPreview');
    if (prev) prev.textContent = S().rp(sum);
    const akt = document.getElementById('shAktual');
    if (akt) akt.value = sum;
    _syncShiftSplitPreview();
  }

  global.stepShiftDenom = (denom, delta) => {
    const d = Number(denom || 0);
    shiftDenomCounts[d] = Math.max(0, Number(shiftDenomCounts[d] || 0) + Number(delta || 0));
    _refreshDenomRowDom(d);
  };

  global.updateShiftDenom = (denom, qty) => {
    const d = Number(denom || 0);
    shiftDenomCounts[d] = Math.max(0, Number(qty || 0));
    _refreshDenomRowDom(d);
  };

  global.resetShiftDenom = () => {
    Object.keys(shiftDenomCounts).forEach((k) => { shiftDenomCounts[k] = 0; });
    shiftAktualCustom = 0;
    global.renderActiveView();
    global.toast('Hitungan pecahan direset ke Rp 0.', 'info');
  };

  global.onShiftAktualManualInput = (v) => {
    shiftAktualCustom = Math.max(0, Number(v || 0));
    _syncShiftSplitPreview();
  };

  global.onShiftModalChange = () => { _syncShiftSplitPreview(); };

  global.onShiftFloatChange = (v) => {
    shiftFloatNext = Math.max(0, Number(v || 0));
    _syncShiftSplitPreview();
  };

  global.setShiftFloatPreset = (v) => {
    shiftFloatNext = Math.max(0, Number(v || 0));
    const el = document.getElementById('shFloatNext');
    if (el) el.value = shiftFloatNext;
    _syncShiftSplitPreview();
  };

  global.onShiftReasonChange = (v) => { shiftVarianceReason = String(v || ''); };

  global.toggleShiftBlindView = () => {
    if (!(S().canSeeFinancialCost && S().canSeeFinancialCost())) {
      global.toast('Mode Blind Count terkunci untuk peran Kasir.', 'warn');
      return;
    }
    shiftBlindRevealed = !shiftBlindRevealed;
    global.renderActiveView();
  };

  global.applyDenomToAktual = () => {
    const sum = _calcDenomSum();
    shiftAktualCustom = sum;
    const akt = document.getElementById('shAktual');
    if (akt) {
      akt.value = sum;
      _syncShiftSplitPreview();
      global.toast('Hitungan pecahan disalin ke Tunai Laci Aktual!', 'ok');
    }
  };

  let lastClosedZReport = null;

  global.openZReportModal = (idxOrObj) => {
    const st = S().AppState;
    const hist = (st.shiftHistory || []).filter((sh) => String(sh.status_shift || '').toUpperCase() !== 'TERBUKA');
    const sh = (typeof idxOrObj === 'object' && idxOrObj) ? idxOrObj : (hist[Number(idxOrObj) || 0] || lastClosedZReport);
    if (!sh) return global.toast('Data Z-Report shift belum tersedia.', 'warn');
    lastClosedZReport = sh;
    const prof = S().getStoreProfile ? S().getStoreProfile() : {};
    const modal = Number(sh.modal_awal || 0);
    const tunai = Number(sh.sistem_tunai || 0);
    const qris = Number(sh.sistem_qris || 0);
    const trf = Number(sh.sistem_transfer || 0);
    const totalOmzet = tunai + qris + trf;
    const targetLaci = modal + tunai;
    const aktual = Number(sh.aktual_tunai || 0);
    const selisih = Number(sh.selisih_kas !== undefined ? sh.selisih_kas : (aktual - targetLaci));
    const selisihTxt = selisih === 0 ? 'Klop (Rp 0)' : ((selisih > 0 ? 'Lebih +' : 'Kurang -') + S().rp(Math.abs(selisih)));

    S().openModal(`<div class="p-6 space-y-4 text-xs">
      <div class="flex items-start justify-between gap-2 pb-2 border-b" style="border-color:var(--ons-border)">
        <div>
          <span class="badge-bpom bpom-bebas">Z-REPORT RESMI SHIFT KASIR</span>
          <h3 class="font-extrabold text-base mt-1">${S().esc(prof.nama_usaha || 'Apotek ONS Farma')}</h3>
          <div class="font-mono-num text-[11px]" style="color:var(--ons-text-soft)">${S().esc(sh.id_shift)} &bull; Ditutup ${S().formatTgl(sh.tgl_tutup, true)}</div>
        </div>
        <button onclick="ONSStore.closeModal()" class="text-xl px-2">&times;</button>
      </div>

      <div id="zReportPrintBody" class="p-4 rounded-xl border space-y-3" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
        <div class="grid grid-cols-2 gap-2 text-[11px]">
          <div>Kasir: <b>${S().esc(sh.kasir_id || '-')}</b></div>
          <div>Supervisor PIN: <b>${S().esc(sh.supervisor_id || '-')}</b></div>
          <div>Waktu Buka: <span class="font-mono-num">${S().formatTgl(sh.tgl_buka, true)}</span></div>
          <div>Waktu Tutup: <span class="font-mono-num">${S().formatTgl(sh.tgl_tutup, true)}</span></div>
        </div>
        <div class="border-t pt-2 space-y-1.5" style="border-color:var(--ons-border)">
          <div class="flex justify-between"><span>Penjualan Tunai</span><b class="font-mono-num">${S().rp(tunai)}</b></div>
          <div class="flex justify-between"><span>Non-Tunai QRIS</span><b class="font-mono-num">${S().rp(qris)}</b></div>
          <div class="flex justify-between"><span>Transfer Bank / EDC</span><b class="font-mono-num">${S().rp(trf)}</b></div>
          <div class="flex justify-between pt-1.5 border-t font-extrabold text-sm" style="border-color:var(--ons-border)">
            <span>Total Penjualan Shift</span><span class="font-mono-num text-blue-600">${S().rp(totalOmzet)}</span>
          </div>
        </div>
        <div class="border-t pt-2 space-y-1.5" style="border-color:var(--ons-border)">
          <div class="flex justify-between"><span>Modal Awal Laci</span><span class="font-mono-num">${S().rp(modal)}</span></div>
          <div class="flex justify-between"><span>Target Tunai Laci (Modal + Tunai)</span><span class="font-mono-num">${S().rp(targetLaci)}</span></div>
          <div class="flex justify-between"><span>Fisik Tunai Laci Aktual</span><b class="font-mono-num">${S().rp(aktual)}</b></div>
          <div class="flex justify-between font-extrabold">
            <span>Selisih Kas</span>
            <span class="font-mono-num ${selisih === 0 ? 'text-emerald-600' : 'text-amber-600'}">${selisihTxt}</span>
          </div>
        </div>
        <div class="border-t pt-2 text-[11px]" style="border-color:var(--ons-border)">
          <b>Catatan Handover:</b> ${S().esc(sh.catatan_handover || '-')}
        </div>
      </div>

      <div class="flex flex-wrap gap-2">
        <button type="button" onclick="window.printShiftZReport()" class="ons-btn ons-btn-primary flex-1 text-xs">Cetak Z-Report (Thermal / PDF)</button>
        <button type="button" onclick="window.sendZReportWaOwner()" class="ons-btn ons-btn-emerald flex-1 text-xs">Kirim ke WA Pemilik</button>
      </div>
    </div>`, '520px');
  };

  global.printShiftZReport = () => {
    const sh = lastClosedZReport;
    if (!sh) return;
    const prof = S().getStoreProfile ? S().getStoreProfile() : {};
    const selisih = Number(sh.selisih_kas || 0);
    const kv = (lbl, val, bold) => `<div style="display:flex;justify-content:space-between;align-items:baseline;gap:6px;line-height:1.45;${bold ? 'font-weight:700;' : ''}"><span>${lbl}</span><span style="text-align:right;font-variant-numeric:tabular-nums">${val}</span></div>`;
    const hr = '<div style="border-top:1px dashed #334155;margin:6px 0"></div>';
    const html = `<div style="font-family:'Courier New',monospace;font-size:11px;color:#0f172a;max-width:210px;margin:0 auto">
      <div style="text-align:center">
        <div style="font-weight:800;font-size:13px;letter-spacing:.3px">${S().esc(prof.nama_usaha || 'APOTEK ONS FARMA')}</div>
        ${(prof.alamat_usaha || prof.alamat) ? `<div style="font-size:9.5px;color:#334155">${S().esc([prof.alamat_usaha || prof.alamat, prof.kota].filter(Boolean).join(', '))}</div>` : ''}
        ${(prof.no_sia || prof.sia) ? `<div style="font-size:9.5px;color:#334155">SIA: ${S().esc(prof.no_sia || prof.sia)}</div>` : ''}
        <div style="font-weight:700;font-size:11px;margin-top:4px;padding:2px 0;border-top:1px solid #0f172a;border-bottom:1px solid #0f172a">Z-REPORT TUTUP SHIFT KASIR</div>
      </div>
      ${hr}
      ${kv('ID Shift', S().esc(sh.id_shift || '-'))}
      ${kv('Kasir', S().esc(sh.kasir_id || '-'))}
      ${kv('Otorisasi SPV', S().esc(sh.supervisor_id || '-'))}
      ${sh.tgl_buka ? kv('Waktu Buka', S().formatTgl(sh.tgl_buka, true)) : ''}
      ${kv('Waktu Tutup', S().formatTgl(sh.tgl_tutup, true))}
      ${hr}
      <div style="font-weight:700;margin-bottom:2px">REKAP PENJUALAN &amp; KAS</div>
      ${kv('Tunai Sistem', S().rp(sh.sistem_tunai || 0))}
      ${kv('QRIS', S().rp(sh.sistem_qris || 0))}
      ${kv('Transfer / EDC', S().rp(sh.sistem_transfer || 0))}
      ${kv('Modal Awal', S().rp(sh.modal_awal || 0))}
      ${kv('Fisik Laci', S().rp(sh.aktual_tunai || 0), true)}
      ${hr}
      ${kv('Selisih Kas', (selisih > 0 ? '+' : '') + S().rp(selisih), true)}
      ${kv('Status Laci', selisih === 0 ? 'PAS / SEIMBANG' : (selisih > 0 ? 'LEBIH (SURPLUS)' : 'KURANG (DEFISIT)'), true)}
      ${hr}
      <div style="font-size:10px;line-height:1.4"><b>Catatan Handover:</b><br/>${S().esc(sh.catatan_handover || '-')}</div>
      <div style="margin-top:12px;display:flex;justify-content:space-between;font-size:9.5px;text-align:center">
        <div>Kasir<br/><br/>(${S().esc(sh.kasir_id || '.......')})</div>
        <div>Supervisor/APJ<br/><br/>(${S().esc(sh.supervisor_id || '.......')})</div>
      </div>
    </div>`;
    if (S().printHtmlZone) {
      S().printHtmlZone('Z-Report ' + (sh.id_shift || ''), html, { widthMm: 58 });
    }
  };

  global.sendZReportWaOwner = () => {
    const sh = lastClosedZReport;
    if (!sh) return;
    const prof = S().getStoreProfile ? S().getStoreProfile() : {};
    const targetWa = prof.wa_pemilik || prof.wa_usaha || '';
    const msg = [
      '*Z-REPORT TUTUP SHIFT - ' + String(prof.nama_usaha || 'APOTEK ONS FARMA').toUpperCase() + '*',
      'ID Shift   : ' + sh.id_shift,
      'Kasir      : ' + (sh.kasir_id || '-') + ' (SPV: ' + (sh.supervisor_id || '-') + ')',
      'Tunai Sis  : ' + S().rp(sh.sistem_tunai || 0),
      'QRIS       : ' + S().rp(sh.sistem_qris || 0),
      'Trf/EDC    : ' + S().rp(sh.sistem_transfer || 0),
      'Modal Awal : ' + S().rp(sh.modal_awal || 0),
      'Fisik Laci : ' + S().rp(sh.aktual_tunai || 0),
      'Selisih    : ' + S().rp(sh.selisih_kas || 0),
      'Catatan    : ' + (sh.catatan_handover || '-')
    ].join('\n');
    if (S().buildWaUrl && targetWa) {
      const url = S().buildWaUrl(targetWa, msg);
      if (url && global.open) global.open(url, '_blank');
    } else {
      global.toast('Nomor WA Pemilik belum diisi di Profil Usaha. Gunakan tombol Cetak Z-Report.', 'info');
    }
  };

  global.submitCloseShift = async (sisTunai, sisQris, sisTransfer) => {
    try {
      const act = S().AppState.activeShift || (S().AppState.shiftHistory || []).find((s) => String(s.status_shift || '').toUpperCase() === 'TERBUKA');
      const modalVal = Number((document.getElementById('shModal') || {}).value || 0);
      const aktVal = Number((document.getElementById('shAktual') || {}).value || 0);
      const floatVal = Number((document.getElementById('shFloatNext') || {}).value || 0);
      const bankDrop = Math.max(0, aktVal - floatVal);
      const reasonSel = ((document.getElementById('shVarianceReason') || {}).value || '').trim();
      const rawNote = ((document.getElementById('shNote') || {}).value || '').trim();
      const noteParts = [];
      if (reasonSel) noteParts.push('[Alasan: ' + reasonSel + ']');
      noteParts.push('[Float Laci: ' + S().rp(floatVal) + ' | Setor Brankas: ' + S().rp(bankDrop) + ']');
      if (rawNote) noteParts.push(rawNote);

      const res = await API().callApi('shift.close', {
        id_shift: act ? act.id_shift : '',
        tgl_buka: act ? act.tgl_buka : '',
        modal_awal: modalVal,
        aktual_tunai: aktVal,
        sistem_tunai: Number(sisTunai || 0),
        sistem_qris: Number(sisQris || 0),
        sistem_transfer: Number(sisTransfer || 0),
        catatan_handover: noteParts.join(' '),
        supervisor_pin: (document.getElementById('shPin') || {}).value || ''
      }, { isWrite: true });

      Object.keys(shiftDenomCounts).forEach((k) => { shiftDenomCounts[k] = 0; });
      shiftAktualCustom = null;
      shiftFloatNext = null;
      shiftVarianceReason = '';
      lastClosedZReport = res && res.shift ? res.shift : null;

      global.toast('Shift berhasil ditutup! Selisih kas: ' + S().rp(res.shift.selisih_kas), 'ok');
      await global.bootLoadState(true);
      if (res && res.shift) {
        global.openZReportModal(res.shift);
      }
    } catch (e) { global.toast(e.message, 'err'); }
  };

  /**
   * Piutang Pelanggan & Arsip Salinan Resep (p.c.c) Handlers (v15.0)
   */
  global.openPayPiutangModal = (idPiutang, noInv, namaPel, sisaMax, isManual) => {
    const kasAccounts = _getKasAccountsList();
    S().openModal(`<div class="p-6 space-y-3 text-xs">
      <div class="flex justify-between items-center">
        <h3 class="font-bold text-base">Terima Pembayaran Piutang (${S().esc(noInv || idPiutang)})</h3>
        <button onclick="ONSStore.closeModal()" class="text-xl">&times;</button>
      </div>
      <div class="p-3 rounded-lg" style="background:var(--ons-bg-subtle)">
        Pelanggan: <b>${S().esc(namaPel)}</b><br/>
        Sisa Tagihan: <b class="font-mono-num text-amber-600">${S().rp(sisaMax)}</b>
      </div>
      <div><label class="font-semibold block mb-1">Nominal Diterima (Rp) *</label><input id="payPiutangAmt" type="number" min="1" max="${sisaMax}" class="ons-input font-mono-num" value="${sisaMax}"/></div>
      <div><label class="font-semibold block mb-1">Akun Kas / Metode Penerimaan</label>
        <select id="payPiutangMetode" class="ons-select">
          ${kasAccounts.map((a) => `<option value="${S().esc(a.nama)}">${S().esc(a.nama)}</option>`).join('')}
          <option value="TRANSFER_BANK">TRANSFER_BANK</option>
          <option value="TUNAI">KAS TUNAI</option>
          <option value="QRIS">QRIS</option>
        </select>
      </div>
      <div><label class="font-semibold block mb-1">Catatan</label><input id="payPiutangNote" class="ons-input" placeholder="Opsional: transfer BCA an ..."/></div>
      <button onclick="window.submitPayPiutang('${S().esc(idPiutang)}', ${isManual ? 'true' : 'false'})" class="ons-btn ons-btn-emerald w-full py-2.5 text-xs">Catat Pembayaran ke Buku Kas (MASUK_PIUTANG)</button>
    </div>`, '440px');
  };

  global.submitPayPiutang = async (idPiutang, isManual) => {
    try {
      const nom = Number((document.getElementById('payPiutangAmt') || {}).value || 0);
      const met = (document.getElementById('payPiutangMetode') || {}).value || 'TRANSFER_BANK';
      const cat = (document.getElementById('payPiutangNote') || {}).value || '';
      if (nom <= 0) throw new Error('Nominal bayar harus lebih dari 0.');
      if (isManual) {
        const list = _readFinLocalList(MANUAL_PIUTANG_KEY);
        const target = list.find((p) => p.id_piutang === idPiutang);
        if (!target) throw new Error('Data piutang manual tidak ditemukan.');
        const sisa = Math.max(0, Number(target.sisa_piutang || 0));
        if (nom > sisa) throw new Error('Nominal bayar melebihi sisa piutang (' + sisa + ').');
        await API().callApi('finance.saveJurnal', {
          jenis_trx: 'MASUK_PIUTANG',
          kategori: `Pelunasan Piutang ${target.nama_pelanggan} (${target.kode_faktur})${cat ? ' - ' + cat : ''}`,
          nominal: nom,
          metode: met,
          referensi_id: target.kode_faktur || target.id_piutang,
          periode_bulan: new Date().toISOString().slice(0, 7)
        }, { isWrite: true });
        target.total_dibayar = Number(target.total_dibayar || 0) + nom;
        target.sisa_piutang = Math.max(0, sisa - nom);
        target.status_piutang = target.sisa_piutang <= 0 ? 'LUNAS' : 'SEBAGIAN';
        _writeFinLocalList(MANUAL_PIUTANG_KEY, list);
        S().closeModal();
        global.toast('Pembayaran piutang dicatat! Status: ' + target.status_piutang, 'ok');
        await global.bootLoadState(true);
        return;
      }
      const res = await API().callApi('piutang.pay', { id_piutang: idPiutang, nominal_bayar: nom, metode: met, catatan: cat }, { isWrite: true });
      S().closeModal();
      global.toast('Pembayaran piutang dicatat! Status: ' + res.item.status_piutang, 'ok');
      await global.bootLoadState(true);
    } catch (e) { global.toast(e.message, 'err'); }
  };

  global.openCopyResepArchiveModal = () => {
    const list = S().AppState.copyResep || [];
    S().openModal(`<div class="p-6 space-y-3 text-xs">
      <div class="flex justify-between items-center">
        <h3 class="font-bold text-base">Arsip Salinan Resep (Apograph / p.c.c) (${list.length})</h3>
        <button onclick="ONSStore.closeModal()" class="text-xl">&times;</button>
      </div>
      <p style="color:var(--ons-text-soft)">Riwayat salinan resep tebus sebagian sesuai PMK 73/2016. Klik Cetak untuk mencetak ulang dokumen p.c.c.</p>
      <div class="space-y-2 max-h-80 overflow-y-auto">
        ${list.length ? list.map((cr, idx) => `<div class="p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
          <div>
            <div class="font-bold font-mono-num">${S().esc(cr.no_salinan)} &bull; <span class="text-blue-600">${S().esc(cr.status_serah || 'DET')}</span></div>
            <div>Pasien: <b>${S().esc(cr.nama_pasien)}</b> &bull; Dokter: ${S().esc(cr.nama_dokter)}</div>
            <div class="text-[11px]" style="color:var(--ons-text-soft)">Tgl: ${S().esc(cr.tanggal)} &bull; No. R/: ${S().esc(cr.no_resep_asal || '-')}</div>
          </div>
          <button type="button" onclick="window.reprintCopyResepIdx(${idx})" class="ons-btn ons-btn-primary text-xs py-1 px-3">Cetak p.c.c</button>
        </div>`).join('') : '<div class="text-center py-6">Belum ada arsip salinan resep tersimpan.</div>'}
      </div>
    </div>`, '580px');
  };

  global.reprintCopyResepIdx = (idx) => {
    const list = S().AppState.copyResep || [];
    if (list[idx] && typeof global.printCopyResepDocument === 'function') {
      global.printCopyResepDocument(list[idx]);
    }
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
      <div class="ons-page-header">
        <div>
          <h1 class="text-xl font-extrabold">Pelaporan SIPNAP Kemenkes, Pareto ABC &amp; Dead Stock</h1>
          <p class="text-xs" style="color:var(--ons-text-soft)">Format SIPNAP 8 kolom terintegrasi Kartu Stok mutasi nyata, Pareto ABC omzet &amp; valuasi, indikator WHO, &amp; lost sales.</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <div class="ons-tab-bar">
            <button onclick="window.setSipnapTab('narkotika')" class="ons-tab-btn ${sipnapTab === 'narkotika' ? 'active' : ''}">SIPNAP Kemenkes (${sipnapRows.length})</button>
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

  global.exportSipnapExcel = (fmt) => {
    const rows = _buildSipnapRows(S().AppState).map((r, idx) => Object.assign({ no: idx + 1 }, r));
    const prof = typeof S().getStoreProfile === 'function' ? S().getStoreProfile() : {};
    const apotekName = prof.nama_usaha || 'Apotek ONS Farma';
    const dStamp = new Date().toISOString().slice(0, 10);
    S().exportDataset(fmt || 'xlsx', `Laporan Bulanan SIPNAP Kemenkes - ${apotekName}`, `Laporan_SIPNAP_${dStamp}`, [
      { key: 'no', label: 'No', type: 'int', width: 6 },
      { key: 'kode', label: 'Kode KFA', type: 'text', width: 16 },
      { key: 'nama', label: 'Nama Obat (Narkotika/Psikotropika)', type: 'wrap', width: 32 },
      { key: 'gol', label: 'Golongan', type: 'status', width: 16 },
      { key: 'awal', label: 'Stok Awal', type: 'int', sum: true, width: 13 },
      { key: 'masuk', label: 'Masuk PBF', type: 'int', sum: true, width: 13 },
      { key: 'keluar', label: 'Keluar Resep', type: 'int', sum: true, width: 14 },
      { key: 'musnah', label: 'Pemusnahan', type: 'int', sum: true, width: 14 },
      { key: 'akhir', label: 'Stok Akhir', type: 'int', sum: true, width: 13 }
    ], rows, {
      sheetName: 'SIPNAP_Kemenkes',
      subtitle: `Pelaporan Sediaan Narkotika & Psikotropika • Dicetak ${S().formatTgl(new Date().toISOString(), true)}`,
      emptyMessage: 'Belum ada item golongan Narkotika/Psikotropika/OOT di Master Obat.'
    });
  };

  /**
   * W-13: Pengaturan Konfirmasi Pemilik & Usaha (Foto & Logo), Akun, Struk Thermal, Secrets Vault & Audit
   */
  let settingsCache = { secrets: {}, audit: [], users: [] };
  let auditDraft = null;
  let auditLogSearchQ = '';

  function ensureAuditDraft() {
    if (!auditDraft) {
      const src = S().getAuditSystem ? S().getAuditSystem() : { items: [] };
      auditDraft = Object.assign({}, src, {
        items: (src.items || []).map((it) => Object.assign({}, it))
      });
    }
    return auditDraft;
  }

  function resetAuditDraftFromStore() {
    auditDraft = null;
    return ensureAuditDraft();
  }

  global.setSettingsTab = (t) => {
    settingsTab = t || 'profil';
    if (S().AppState.subTabs) S().AppState.subTabs.settings = settingsTab;
    global.renderActiveView();
    if (typeof global.syncNavHighlight === 'function') global.syncNavHighlight();
  };

  function getOwnerInitials(name) {
    const clean = String(name || 'AF').replace(/\b(apt|dr|drs|hj|h)\.?\s+/gi, '').trim();
    const parts = clean.split(/\s+/).filter(Boolean);
    return ((parts[0] && parts[0][0]) || 'A').toUpperCase() + ((parts[1] && parts[1][0]) || '').toUpperCase();
  }

  function renderProfileMediaInner(kind, url, ownerName) {
    const cleanUrl = String(url || '').trim();
    if (cleanUrl) {
      return `<img src="${S().esc(cleanUrl)}" alt="${kind === 'foto' ? 'Foto Pemilik' : 'Logo Usaha'}"/>`;
    }
    if (kind === 'foto') {
      return `<span>${S().esc(getOwnerInitials(ownerName))}</span>`;
    }
    return `<span class="text-xs font-extrabold" style="color:var(--ons-primary)">LOGO</span>`;
  }

  function renderProfileUploadCard(cfg) {
    const frameCls = cfg.kind === 'foto' ? 'ons-avatar-frame' : 'ons-logo-frame';
    return `<div class="ons-upload-zone space-y-2.5">
      <div class="flex items-center gap-3.5">
        <div id="${cfg.previewId}" class="${frameCls}">${renderProfileMediaInner(cfg.kind, cfg.currentUrl, cfg.ownerName)}</div>
        <div class="min-w-0 flex-1 space-y-1">
          <div class="font-bold text-xs">${S().esc(cfg.title)}</div>
          <p class="text-[11px] leading-snug" style="color:var(--ons-text-soft)">${S().esc(cfg.hint)}</p>
          <div class="flex flex-wrap gap-1.5 pt-1">
            ${cfg.canEdit ? `<label class="ons-btn ons-btn-primary text-[11px] py-1 px-2.5 cursor-pointer">
              <span>${S().esc(cfg.uploadLabel)}</span>
              <input type="file" accept="image/png,image/jpeg,image/webp" class="hidden" onchange="window.handleProfileImageUpload('${cfg.kind}', this)"/>
            </label>
            <button type="button" onclick="window.resetProfileMedia('${cfg.kind}')" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2">${S().esc(cfg.resetLabel)}</button>` : ''}
          </div>
        </div>
      </div>
      <div>
        <label class="text-[11px] font-semibold block mb-1" style="color:var(--ons-text-soft)">Atau Tempel URL Gambar / Data URI</label>
        <input id="${cfg.inputId}" ${cfg.canEdit ? '' : 'readonly'} class="ons-input text-[11px] font-mono-num" value="${S().esc(cfg.currentUrl)}" oninput="window.refreshProfileLivePreview('${cfg.kind}', this.value)" placeholder="https://... atau unggah dari tombol di atas"/>
      </div>
    </div>`;
  }

  function renderProfileTabHtml(prof, canEdit) {
    const fotoUrl = profileMediaDraft.foto !== null ? profileMediaDraft.foto : (prof.foto_pemilik_url || '');
    const logoUrl = profileMediaDraft.logo !== null ? profileMediaDraft.logo : (prof.logo_usaha_url || '');
    const merged = Object.assign({}, prof, { foto_pemilik_url: fotoUrl, logo_usaha_url: logoUrl });
    const comp = S().getProfileCompleteness(merged);
    const isConfirmed = String(merged.terkonfirmasi || '').toUpperCase() === 'YA';
    const ro = canEdit ? '' : 'readonly';
    const field = (id, label, val, opts) => {
      const o = opts || {};
      return `<div>
        <label class="font-semibold text-[11px] block mb-1" style="color:var(--ons-text-soft)">${label}${o.req ? ' *' : ''}</label>
        <input id="${id}" ${ro} class="ons-input text-xs ${o.mono ? 'font-mono-num' : ''}" value="${S().esc(val || '')}" placeholder="${S().esc(o.ph || '')}" oninput="window.refreshProfileKopPreview()"/>
      </div>`;
    };

    return `<div class="space-y-4">
      <!-- Identity Hero + Profile Completeness -->
      <div class="ons-identity-hero p-5">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div class="flex items-center gap-4 min-w-0">
            <div class="ons-avatar-frame">${renderProfileMediaInner('foto', fotoUrl, merged.nama_pemilik)}</div>
            <div class="ons-logo-frame">${renderProfileMediaInner('logo', logoUrl, merged.nama_usaha)}</div>
            <div class="min-w-0 space-y-1">
              <div class="flex flex-wrap items-center gap-2">
                <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/15">Profil Resmi Apotek</span>
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${isConfirmed ? 'bg-emerald-400/20 text-emerald-200 border border-emerald-300/30' : 'bg-amber-400/20 text-amber-200 border border-amber-300/30'}">
                  ${isConfirmed ? 'Terkonfirmasi Resmi' : 'Menunggu Konfirmasi'}
                </span>
              </div>
              <h2 class="text-base md:text-lg font-extrabold tracking-tight truncate">${S().esc(merged.nama_usaha || 'Apotek ONS Farma')}</h2>
              <p class="text-xs text-sky-100 truncate">Pemilik / APJ: <b>${S().esc(merged.nama_pemilik || 'apt. Anissa Faradifa R. Is Rumi')}</b></p>
              <p class="text-[11px] text-sky-200/80 font-mono-num truncate">SIA: ${S().esc(merged.no_sia || '-')} &bull; SIPA: ${S().esc(merged.sipa_pemilik || '-')}</p>
            </div>
          </div>

          <div class="w-full sm:w-64 p-3 rounded-xl bg-white/10 border border-white/15 space-y-1.5 text-xs">
            <div class="flex items-center justify-between font-bold">
              <span>Kelengkapan Data</span>
              <span class="font-mono-num">${comp.pct}% (${comp.done}/${comp.total})</span>
            </div>
            <div class="ons-progress-track"><div class="ons-progress-fill" style="width:${comp.pct}%"></div></div>
            <div class="text-[11px] text-sky-100/90">
              ${merged.dikonfirmasi_pada ? `Dikonfirmasi: ${S().formatTgl(merged.dikonfirmasi_pada)} (${S().esc(S().sanitizeLegacyOwnerName ? S().sanitizeLegacyOwnerName(merged.dikonfirmasi_oleh, merged.nama_pemilik) : (merged.dikonfirmasi_oleh || merged.nama_pemilik))})` : 'Lengkapi foto, logo & legalitas lalu klik Konfirmasi & Simpan.'}
            </div>
          </div>
        </div>
      </div>

      <!-- Foto Pemilik & Logo Usaha -->
      <div class="ons-card p-5 space-y-3 text-xs">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 class="font-bold text-sm">Foto Pemilik &amp; Logo Tempat Usaha</h3>
            <p style="color:var(--ons-text-soft)">Otomatis dikompres &amp; disinkronkan ke Sidebar, Layar Login, Etiket Obat, Struk Thermal, Slip Gaji PDF, &amp; Katalog E-Apotek.</p>
          </div>
          ${!canEdit ? `<span class="badge-bpom bpom-keras">Mode Baca Saja (Khusus Pemilik / APJ)</span>` : ''}
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          ${renderProfileUploadCard({
            kind: 'foto',
            previewId: 'profPhotoPreview',
            inputId: 'profFotoUrl',
            title: 'Foto Pemilik / Apoteker Penanggung Jawab',
            hint: 'Format JPG/PNG/WebP. Otomatis disesuaikan ke ukuran avatar ringan agar cepat dimuat.',
            uploadLabel: 'Pilih Foto',
            resetLabel: 'Hapus Foto',
            currentUrl: fotoUrl,
            ownerName: merged.nama_pemilik,
            canEdit
          })}
          ${renderProfileUploadCard({
            kind: 'logo',
            previewId: 'profLogoPreview',
            inputId: 'profLogoUrl',
            title: 'Logo Resmi Tempat Usaha / Apotek',
            hint: 'Tampil di Header Aplikasi, Struk Kasir, Etiket Resep, Slip Gaji & Etalase Publik.',
            uploadLabel: 'Upload Logo',
            resetLabel: 'Reset Default',
            currentUrl: logoUrl,
            ownerName: merged.nama_usaha,
            canEdit
          })}
        </div>
      </div>

      <!-- Data Identitas Pemilik & Tempat Usaha -->
      <div class="grid grid-cols-1 xl:grid-cols-12 gap-4 text-xs">
        <div class="ons-card p-5 xl:col-span-5 space-y-3">
          <div>
            <h3 class="font-bold text-sm">1. Konfirmasi Data Pemilik &amp; APJ</h3>
            <p style="color:var(--ons-text-soft)">Otomatis menyinkronkan akun Pemilik &amp; pejabat penanda tangan Mesin Surat.</p>
          </div>
          <div class="space-y-2.5">
            ${field('profNamaPemilik', 'Nama Lengkap Pemilik / Apoteker', merged.nama_pemilik, { req: true })}
            ${field('profJabatanPemilik', 'Jabatan Resmi', merged.jabatan_pemilik)}
            ${field('profSipaPemilik', 'Nomor SIPA', merged.sipa_pemilik, { mono: true, req: true })}
            ${field('profStraPemilik', 'Nomor STRA', merged.stra_pemilik, { mono: true })}
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              ${field('profWaPemilik', 'No. HP / WhatsApp Pemilik', merged.wa_pemilik, { mono: true })}
              ${field('profEmailPemilik', 'Email Pemilik', merged.email_pemilik)}
            </div>
            ${field('profNpwpPemilik', 'NPWP Pemilik (Opsional)', merged.npwp_pemilik, { mono: true })}
          </div>
        </div>

        <div class="ons-card p-5 xl:col-span-7 space-y-3">
          <div>
            <h3 class="font-bold text-sm">2. Konfirmasi Data Tempat Usaha &amp; Legalitas Apotek</h3>
            <p style="color:var(--ons-text-soft)">Identitas outlet resmi untuk faktur PBF, laporan pajak/SIPNAP, &amp; portal pasien.</p>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            ${field('profNamaUsaha', 'Nama Tempat Usaha / Apotek', merged.nama_usaha, { req: true })}
            ${field('profNoSia', 'Nomor SIA (Surat Izin Apotek)', merged.no_sia, { mono: true, req: true })}
            ${field('profNibOss', 'NIB OSS RBA', merged.nib_oss, { mono: true })}
            ${field('profNpwpUsaha', 'NPWP Badan / Usaha', merged.npwp_usaha, { mono: true })}
            <div>
              <label class="font-semibold text-[11px] block mb-1" style="color:var(--ons-text-soft)">Status Pajak (PKP)</label>
              <select id="profStatusPkp" ${canEdit ? '' : 'disabled'} onchange="window.refreshProfileKopPreview()" class="ons-select text-xs">
                <option value="PKP (PPN 11%)" ${String(merged.status_pkp || '').includes('PKP') && !String(merged.status_pkp || '').includes('Non') ? 'selected' : ''}>PKP (PPN 11%)</option>
                <option value="Non-PKP / UMKM Final" ${String(merged.status_pkp || '').includes('Non') ? 'selected' : ''}>Non-PKP / UMKM Final</option>
              </select>
            </div>
            ${field('profZonaWaktu', 'Zona Waktu Operasional', merged.zona_waktu)}
          </div>
          ${field('profAlamatUsaha', 'Alamat Lengkap Tempat Usaha', merged.alamat_usaha, { req: true })}
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            ${field('profKota', 'Kota / Kabupaten', merged.kota, { req: true })}
            ${field('profKodePos', 'Kode Pos', merged.kode_pos, { mono: true })}
            ${field('profJamOps', 'Jam Operasional', merged.jam_operasional)}
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            ${field('profTelpUsaha', 'Telepon Toko', merged.telepon_usaha, { mono: true })}
            ${field('profWaUsaha', 'WhatsApp Resmi (628...)', merged.wa_usaha, { mono: true })}
            ${field('profEmailUsaha', 'Email Apotek', merged.email_usaha)}
          </div>
        </div>
      </div>

      <!-- Preview Kop Surat & Konfirmasi Simpan -->
      <div class="ons-card p-5 space-y-4 text-xs">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h3 class="font-bold text-sm">3. Pratinjau Kop Resmi &amp; Konfirmasi Data</h3>
          <span class="text-[11px]" style="color:var(--ons-text-soft)">Menampilkan pratinjau langsung pada Etiket, Kwitansi, &amp; Surat Pesanan (SP A4).</span>
        </div>
        <div id="profKopPreviewBox" class="p-4 rounded-xl border flex flex-wrap items-center justify-between gap-4" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
          <div class="flex items-center gap-3">
            <div class="ons-logo-frame">${renderProfileMediaInner('logo', logoUrl, merged.nama_usaha)}</div>
            <div>
              <div class="font-extrabold text-sm">${S().esc(merged.nama_usaha || 'Apotek ONS Farma')}</div>
              <div class="text-[11px]" style="color:var(--ons-text-soft)">${S().esc(merged.alamat_usaha || '-')}, ${S().esc(merged.kota || '-')} ${S().esc(merged.kode_pos || '')}</div>
              <div class="text-[11px] font-mono-num" style="color:var(--ons-text-soft)">Telp/WA: ${S().esc(merged.wa_usaha || merged.telepon_usaha || '-')} &bull; SIA: ${S().esc(merged.no_sia || '-')}</div>
            </div>
          </div>
          <div class="text-left sm:text-right">
            <div class="text-[10px] font-bold uppercase" style="color:var(--ons-text-soft)">Pemilik &amp; Apoteker Penanggung Jawab</div>
            <div class="font-bold text-xs">${S().esc(merged.nama_pemilik || 'apt. Anissa Faradifa R. Is Rumi')}</div>
            <div class="text-[11px] font-mono-num" style="color:var(--ons-text-soft)">SIPA: ${S().esc(merged.sipa_pemilik || '-')}</div>
          </div>
        </div>

        ${canEdit ? `<div class="flex flex-wrap items-center justify-between gap-3 pt-2 border-t" style="border-color:var(--ons-border)">
          <label class="flex items-center gap-2 cursor-pointer font-semibold">
            <input id="profConfirmChk" type="checkbox" checked class="w-4 h-4 accent-blue-600"/>
            <span>Saya menyatakan data pemilik, foto/logo, izin SIA/SIPA, &amp; alamat tempat usaha di atas adalah benar dan sah.</span>
          </label>
          <button type="button" onclick="window.submitStoreProfileForm()" class="ons-btn ons-btn-emerald text-xs px-5 py-2.5 font-bold">Konfirmasi &amp; Simpan Data Resmi</button>
        </div>` : `<div class="p-3 rounded-xl border text-[11px]" style="background:var(--ons-bg-subtle);border-color:var(--ons-border);color:var(--ons-text-soft)">
          Hanya peran <b>Pemilik</b> atau <b>APJ</b> yang dapat mengonfirmasi dan mengubah identitas resmi apotek.
        </div>`}
      </div>

      <!-- Skala Outlet: Mode 1 Apotek Tunggal vs Multi-Cabang -->
      <div class="ons-card p-5 space-y-3 text-xs">
        ${(() => {
          const multiOn = S().isMultiBranchEnabled ? S().isMultiBranchEnabled() : false;
          const activeBranches = (S().getActiveBranches && S().getActiveBranches()) || ['ONS-01'];
          return `<div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div class="flex items-center gap-2">
                <h3 class="font-bold text-sm">Skala Outlet Apotek</h3>
                <span class="badge-bpom ${multiOn ? 'bpom-terbatas' : 'bpom-bebas'}">${multiOn ? 'Multi-Cabang Aktif (' + activeBranches.length + ' Outlet)' : 'Mode 1 Apotek Tunggal (ONS-01)'}</span>
              </div>
              <p class="mt-0.5" style="color:var(--ons-text-soft)">
                ${multiOn
                  ? 'Menu Mutasi Antar-Cabang, pilihan cabang saat login, &amp; pembanding stok antar-outlet sedang aktif.'
                  : 'Apotek berjalan dalam mode 1 outlet utama tanpa cabang fiktif (tombol Cabang &amp; menu Mutasi Antar-Cabang disembunyikan agar simpel).'}
              </p>
            </div>
            ${S().getRole() === 'Pemilik' ? `<div class="flex flex-wrap gap-2">
              ${multiOn
                ? `<button type="button" onclick="window.toggleMultiBranchMode(false)" class="ons-btn ons-btn-ghost text-xs">Kembalikan ke Mode 1 Apotek</button>`
                : `<button type="button" onclick="window.toggleMultiBranchMode(true)" class="ons-btn ons-btn-primary text-xs">Buka Cabang Baru (Aktifkan Multi-Cabang)</button>`}
            </div>` : ''}
          </div>
          ${multiOn ? `<div class="p-3 rounded-xl border flex flex-wrap items-end gap-2" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
            <div class="flex-1 min-w-[220px]">
              <label class="font-semibold block mb-1">Daftar Kode Outlet / Cabang Aktif (pisahkan dengan koma)</label>
              <input id="profMultiBranchCodes" class="ons-input font-mono-num text-xs" value="${S().esc(activeBranches.join(', '))}" placeholder="ONS-01, ONS-02"/>
            </div>
            ${S().getRole() === 'Pemilik' ? `<button type="button" onclick="window.saveMultiBranchCodes()" class="ons-btn ons-btn-emerald text-xs">Simpan Daftar Cabang</button>` : ''}
          </div>` : ''}`;
        })()}
      </div>
    </div>`;
  }

  function renderSettingsView() {
    global.loadSettingsBundle();
    const st = S().AppState;
    settingsTab = (st.subTabs && st.subTabs.settings) || settingsTab || 'profil';
    if (!['profil', 'akun', 'struk', 'vault', 'audit'].includes(settingsTab)) settingsTab = 'profil';
    const secrets = settingsCache.secrets || {};
    const audit = settingsCache.audit || [];
    const users = settingsCache.users || [];
    const role = S().getRole();
    const isOwner = role === 'Pemilik';
    const canEditProfile = role === 'Pemilik' || role === 'APJ';
    const prof = S().getStoreProfile();

    return `<div class="space-y-5 ons-view-enter">
      <div class="ons-page-header">
        <div>
          <h1 class="text-xl font-extrabold">Pengaturan Apotek, Konfirmasi Identitas &amp; Sistem</h1>
          <p class="text-xs" style="color:var(--ons-text-soft)">Konfirmasi pemilik, foto/logo usaha, legalitas SIA/SIPA, manajemen akun, desain struk 58/80mm, &amp; audit sistem.</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button onclick="window.openChangeCredModal()" class="ons-btn ons-btn-primary text-xs">Ganti Sandi / PIN Saya</button>
          <button onclick="window.runDriveBackupSnapshot()" class="ons-btn ons-btn-emerald text-xs">Snapshot Backup Drive</button>
        </div>
      </div>

      <div class="ons-tab-bar">
        <button onclick="window.setSettingsTab('profil')" class="ons-tab-btn ${settingsTab === 'profil' ? 'active' : ''}">Profil Pemilik &amp; Usaha</button>
        <button onclick="window.setSettingsTab('akun')" class="ons-tab-btn ${settingsTab === 'akun' ? 'active' : ''}">Pengguna &amp; Akses (${users.length})</button>
        <button onclick="window.setSettingsTab('struk')" class="ons-tab-btn ${settingsTab === 'struk' ? 'active' : ''}">Desain Struk Thermal</button>
        <button onclick="window.setSettingsTab('vault')" class="ons-tab-btn ${settingsTab === 'vault' ? 'active' : ''}">Audit DB, Brankas &amp; Reset</button>
        <button onclick="window.setSettingsTab('audit')" class="ons-tab-btn ${settingsTab === 'audit' ? 'active' : ''}">Log Audit Aktivitas (${audit.length})</button>
      </div>

      ${settingsTab === 'profil' ? renderProfileTabHtml(prof, canEditProfile) : ''}

      ${settingsTab === 'akun' ? (isOwner ? (() => {
        const staffList = users.length ? users : (S().AppState.staffDirectory || []);
        const apjAcc = staffList.find((u) => u.role === 'APJ' && String(u.status_aktif || 'AKTIF') === 'AKTIF') || staffList.find((u) => u.role === 'APJ') || { id_user: 'USR-002', username: 'apj', nama_lengkap: 'apt. Siti Rahma, S.Farm', role: 'APJ', no_sipa: '19920412/SIPA_35.78/2025/1042' };
        const kasirAcc = staffList.find((u) => u.role === 'Kasir' && String(u.status_aktif || 'AKTIF') === 'AKTIF') || staffList.find((u) => u.role === 'Kasir') || { id_user: 'USR-003', username: 'kasir', nama_lengkap: 'Budi Santoso (Kasir)', role: 'Kasir', status_aktif: 'AKTIF' };
        return `<div class="space-y-4 text-xs">
          <!-- Panel Edit Cepat Identitas APJ & Kasir Aktif -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div class="ons-card p-4 space-y-2.5 border-l-4" style="border-left-color:#0284C7">
              <div class="flex items-center justify-between gap-2">
                <div>
                  <h3 class="font-bold text-sm">Edit Cepat Identitas APJ Penanggung Jawab</h3>
                  <p class="text-[11px]" style="color:var(--ons-text-soft)">Otomatis memperbarui akun APJ, penanda tangan Surat Pesanan / E-Resep &amp; Audit BPOM.</p>
                </div>
                <span class="badge-bpom bpom-terbatas">APJ</span>
              </div>
              <input type="hidden" id="quickApjId" value="${S().esc(apjAcc.id_user || 'USR-002')}"/>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div class="sm:col-span-2"><label class="font-semibold block mb-1">Nama Lengkap APJ *</label><input id="quickApjNama" class="ons-input text-xs" value="${S().esc(apjAcc.nama_lengkap || '')}" placeholder="Contoh: apt. Dewi Kartika, S.Farm"/></div>
                <div><label class="font-semibold block mb-1">Username Login APJ *</label><input id="quickApjUser" class="ons-input font-mono-num text-xs" value="${S().esc(apjAcc.username || 'apj')}"/></div>
                <div><label class="font-semibold block mb-1">Nomor SIPA APJ</label><input id="quickApjSipa" class="ons-input font-mono-num text-xs" value="${S().esc(apjAcc.no_sipa || '-')}"/></div>
              </div>
              <div class="flex flex-wrap gap-2 pt-1">
                <button type="button" onclick="window.saveQuickStaffCard('APJ')" class="ons-btn ons-btn-primary text-xs">Simpan Nama &amp; SIPA APJ</button>
                <button type="button" onclick="window.openAddUserModal('${S().esc(apjAcc.id_user || apjAcc.username)}')" class="ons-btn ons-btn-ghost text-xs">Atur Hak Akses APJ</button>
              </div>
            </div>

            <div class="ons-card p-4 space-y-2.5 border-l-4" style="border-left-color:#10B981">
              <div class="flex items-center justify-between gap-2">
                <div>
                  <h3 class="font-bold text-sm">Edit Cepat Identitas Kasir Aktif</h3>
                  <p class="text-[11px]" style="color:var(--ons-text-soft)">Otomatis memperbarui akun Kasir pada struk POS, Tutup Shift, Pemeriksaan &amp; Audit Harian.</p>
                </div>
                <span class="badge-bpom bpom-bebas">KASIR</span>
              </div>
              <input type="hidden" id="quickKasirId" value="${S().esc(kasirAcc.id_user || 'USR-003')}"/>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div class="sm:col-span-2"><label class="font-semibold block mb-1">Nama Lengkap Kasir *</label><input id="quickKasirNama" class="ons-input text-xs" value="${S().esc(kasirAcc.nama_lengkap || '')}" placeholder="Contoh: Rina Marlina (Kasir Shift 1)"/></div>
                <div><label class="font-semibold block mb-1">Username Login Kasir *</label><input id="quickKasirUser" class="ons-input font-mono-num text-xs" value="${S().esc(kasirAcc.username || 'kasir')}"/></div>
                <div><label class="font-semibold block mb-1">Status Akun Kasir</label>
                  <select id="quickKasirStatus" class="ons-select text-xs">
                    <option value="AKTIF" ${String(kasirAcc.status_aktif || 'AKTIF') === 'AKTIF' ? 'selected' : ''}>AKTIF</option>
                    <option value="NONAKTIF" ${String(kasirAcc.status_aktif || '') === 'NONAKTIF' ? 'selected' : ''}>NONAKTIF</option>
                  </select>
                </div>
              </div>
              <div class="flex flex-wrap gap-2 pt-1">
                <button type="button" onclick="window.saveQuickStaffCard('Kasir')" class="ons-btn ons-btn-emerald text-xs">Simpan Nama Kasir</button>
                <button type="button" onclick="window.openAddUserModal('${S().esc(kasirAcc.id_user || kasirAcc.username)}')" class="ons-btn ons-btn-ghost text-xs">Atur Hak Akses Kasir</button>
              </div>
            </div>
          </div>

          <!-- Tabel Penuh Akun & Hak Akses RBAC -->
          <div class="ons-card p-5 space-y-3">
            <div class="flex flex-wrap justify-between items-center gap-2">
              <div>
                <h3 class="font-bold text-sm">Manajemen Akun Pengguna, Matriks Hak Akses &amp; Otorisasi PIN (PENGGUNA_CABANG)</h3>
                <p style="color:var(--ons-text-soft)">Edit nama Pemilik / APJ / Kasir, atur modul yang boleh diakses per pengguna (bukan sekadar centang statis), atau reset sandi &amp; PIN.</p>
              </div>
              <button onclick="window.openAddUserModal()" class="ons-btn ons-btn-primary text-xs">+ Tambah Akun Staf Baru</button>
            </div>
            <div class="ons-table-wrap">
              <table class="ons-table">
                <thead><tr><th>Username</th><th>Nama Lengkap</th><th>Role ${(S().isMultiBranchEnabled && S().isMultiBranchEnabled()) ? '&amp; Cabang' : 'Outlet'}</th><th>No. SIPA</th><th>Hak Akses Modul</th><th>Status</th><th>Aksi</th></tr></thead>
                <tbody>
                  ${staffList.length ? staffList.map((u) => {
                    const effPerms = S().getUserPermissions ? S().getUserPermissions(u) : [];
                    const isCustom = Array.isArray(u.hak_akses) && u.hak_akses.length > 0;
                    return `<tr>
                      <td class="font-mono-num font-bold">${S().esc(u.username)}</td>
                      <td class="font-semibold">${S().esc((u.role === 'Pemilik' && S().sanitizeLegacyOwnerName) ? S().sanitizeLegacyOwnerName(u.nama_lengkap, prof.nama_pemilik) : u.nama_lengkap)}</td>
                      <td>
                        <span class="badge-bpom ${u.role === 'Pemilik' ? 'bpom-narkotika' : (u.role === 'APJ' ? 'bpom-terbatas' : 'bpom-bebas')}">${S().esc(u.role)}</span>
                        <span class="font-mono-num text-[11px] ml-1" style="color:var(--ons-text-soft)">${S().esc(u.cabang_id)}</span>
                      </td>
                      <td class="font-mono-num">${S().esc(u.no_sipa || '-')}</td>
                      <td>
                        <span class="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-500/10">
                          ${u.role === 'Pemilik' ? 'Penuh (Pemilik)' : `${isCustom ? 'Custom' : 'Standar'} (${effPerms.length} Izin)`}
                        </span>
                      </td>
                      <td><span class="badge-bpom ${u.status_aktif === 'AKTIF' ? 'bpom-bebas' : 'bpom-keras'}">${S().esc(u.status_aktif)}</span></td>
                      <td>
                        <div class="flex flex-wrap gap-1.5">
                          <button onclick="window.openAddUserModal('${S().esc(u.id_user || u.username)}')" class="ons-btn ons-btn-primary text-[11px] py-1 px-2">Edit Nama &amp; Hak</button>
                          <button onclick="window.openChangeCredModal('${S().esc(u.username)}')" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2">Sandi / PIN</button>
                        </div>
                      </td>
                    </tr>`;
                  }).join('') : '<tr><td colspan="7" class="text-center" style="color:var(--ons-text-soft)">Memuat daftar pengguna...</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Panel Audit Keamanan, Enkripsi & Cabut Sesi Aktif -->
          <div class="ons-card p-5 space-y-3 border-l-4" style="border-left-color:#10B981">
            ${S().AppState.needsPasswordUpgrade && !API().isDemoMode() ? `<div class="p-3 rounded-xl border border-amber-500/40 bg-amber-500/10 flex flex-wrap items-center justify-between gap-2 text-amber-800 dark:text-amber-200">
              <div><b>&#9888;&#65039; Peringatan Keamanan:</b> Akun Anda masih menggunakan kata sandi / PIN bawaan atau lemah. Segera ganti sekarang demi mencegah akses ilegal!</div>
              <button type="button" onclick="window.openChangeCredModal()" class="ons-btn ons-btn-primary text-xs">Ganti Sandi &amp; PIN Sekarang</button>
            </div>` : ''}
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 class="font-bold text-sm">&#128737;&#65039; Perisai Keamanan &amp; Kontrol Sesi Perangkat</h3>
                <p class="text-[11px]" style="color:var(--ons-text-soft)">Enkripsi 250x SHA-256 + Salt + Pepper, Token HMAC-SHA256, Proteksi Lockout 5x/15m, &amp; Pembersihan Cache Otomatis.</p>
              </div>
              <div class="flex flex-wrap gap-2">
                <button type="button" onclick="window.runSecurityHealthCheck()" class="ons-btn ons-btn-primary text-xs">Audit Kesehatan Keamanan</button>
                <button type="button" onclick="window.revokeAllActiveSessions()" class="ons-btn ons-btn-danger text-xs">Cabut Semua Sesi Aktif</button>
              </div>
            </div>
            <div id="secAuditResultBox" class="p-3 rounded-xl border hidden text-[11px]" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)"></div>
          </div>
        </div>`;
      })() : `<div class="ons-card p-5 space-y-2 text-xs">
        ${S().AppState.needsPasswordUpgrade && !API().isDemoMode() ? `<div class="p-3 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200"><b>Peringatan:</b> Anda masih memakai sandi awal. Klik tombol <b>Ganti Sandi / PIN Saya</b> di kanan atas untuk mengamankan akun Anda.</div>` : ''}
        <div>Gunakan tombol <b>Ganti Sandi / PIN Saya</b> di atas untuk memperbarui kredensial akun Anda (wajib memasukkan kata sandi saat ini untuk keamanan).</div>
      </div>`) : ''}

      ${settingsTab === 'vault' ? `<div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div class="ons-card p-5 lg:col-span-12 space-y-3 text-xs border-2 border-emerald-400/80" style="background:linear-gradient(135deg,rgba(16,185,129,0.06),transparent)">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="max-w-3xl">
              <div class="flex items-center gap-2">
                <h3 class="font-extrabold text-sm" style="color:var(--ons-primary-ink)">Audit, Pembersihan &amp; Sinkronisasi Database Sheets</h3>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">Langsung ke DB Aktif &bull; Tanpa ID</span>
              </div>
              <p class="mt-1" style="color:var(--ons-text-soft)">Berjalan langsung pada Google Sheets database utama aplikasi ini. Menghapus tab tidak penting/kosong (<code>Sheet1</code>, tab legacy, tab multi-cabang kosong), menghapus baris kosong, melengkapi kolom skema terbaru, menormalisasi sisa label lama, &amp; menyinkronkan ulang Piutang, Hutang PBF, Batch Stok, SP, Tagihan, dan Jurnal Keuangan.</p>
            </div>
            <div class="flex flex-wrap gap-2">
              <button type="button" onclick="window.runDbAuditAndRepair(true)" class="ons-btn ons-btn-ghost text-xs">1. Pindai Kesehatan DB</button>
              <button type="button" onclick="window.runDbAuditAndRepair(false)" class="ons-btn ons-btn-emerald text-xs">2. Perbaiki, Bersihkan &amp; Sinkronkan DB</button>
            </div>
          </div>
          <div id="dbAuditResultBox" class="p-3 rounded-xl border hidden" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)"></div>
        </div>

        <div class="ons-card p-5 lg:col-span-12 space-y-3 text-xs">
          <h3 class="font-bold text-sm">Brankas Rahasia Script Properties (Read-Back Tersensor)</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
            ${Object.keys(secrets).map((k) => `<div class="flex items-center justify-between gap-2 p-2.5 rounded-lg border" style="border-color:var(--ons-border)">
              <div><b>${S().esc(k)}</b><div class="font-mono-num" style="color:var(--ons-text-soft)">${S().esc(secrets[k] || '(Belum diatur)')}</div></div>
              <button onclick="window.promptUpdateSecret('${S().esc(k)}')" class="ons-btn ons-btn-ghost text-xs py-1 px-2">Ubah</button>
            </div>`).join('')}
          </div>
        </div>

        <div class="ons-card p-5 lg:col-span-12 space-y-3 text-xs border-red-200">
          ${renderFactoryResetPanelHtml(isOwner, 'vault')}
        </div>

        ${isOwner ? `<div class="ons-card p-5 lg:col-span-12 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div>
            <h3 class="font-bold text-sm">Data Sampel Uji Coba (Saat Katalog Kosong)</h3>
            <p style="color:var(--ons-text-soft)">Khusus mode uji coba pada Google Sheets yang masih kosong: mengisi 6 contoh produk obat KFA, batch FEFO, PBF, &amp; pelanggan apotek. Tidak menimpa data obat yang sudah ada.</p>
          </div>
          <button type="button" onclick="window.seedStarterCatalogFromSettings()" class="ons-btn ons-btn-ghost text-xs">Muat 6 Produk Sampel</button>
        </div>` : ''}

        <details class="ons-card p-4 lg:col-span-12 text-xs">
          <summary class="font-bold text-xs cursor-pointer select-none flex items-center justify-between gap-2" style="color:var(--ons-text-soft)">
            <span>&#9656; Impor Data dari File Spreadsheet v9 Terpisah (Opsional &mdash; Tidak Perlu untuk Merapikan DB Aktif)</span>
            <span class="text-[11px] font-normal">Klik untuk buka</span>
          </summary>
          <div class="mt-3 pt-3 border-t space-y-3" style="border-color:var(--ons-border)">
            <h3 class="font-bold text-sm">Wizard Migrasi Spreadsheet v9 &rarr; v13 (Impor dari File Lama Lain)</h3>
            <p style="color:var(--ons-text-soft)">Hanya gunakan jika ingin mengimpor data dari file Google Sheets versi lama terpisah. Membaca berbasis header, normalisasi nomor WA <code>628...</code>, &amp; upsert idempoten dengan Dry-Run Preview.</p>
            <input id="migSourceId" class="ons-input font-mono-num" placeholder="Tempel ID atau URL Google Sheets Sumber v9 (contoh: 1BxiMVs0XRA5nFMd...)"/>
            <div class="flex flex-wrap gap-2">
              <button type="button" onclick="window.runMigrationPreview()" class="ons-btn ons-btn-ghost">1. Pindai Dry-Run Preview</button>
              <button type="button" onclick="window.runMigrationExecute()" class="ons-btn ons-btn-primary">2. Eksekusi Upsert Batch</button>
            </div>
            <div id="migResultBox" class="p-3 rounded-xl border hidden" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)"></div>
          </div>
        </details>
      </div>` : ''}

      ${settingsTab === 'struk' ? (() => {
        const tpls = (S().AppState && S().AppState.strukTemplates) || [];
        const safeIdx = (strukActiveIdx >= 0 && strukActiveIdx < tpls.length) ? strukActiveIdx : 0;
        const curTpl = tpls[safeIdx] || {
          id_tpl: 'TPL-58-DEFAULT',
          kode: 'STRUK_POS_58MM',
          nama: 'Struk Kasir Standar 58mm (Apotek ONS Farma)',
          lebar_mm: 58,
          template_teks: (global.StrukEngine && global.StrukEngine.DEFAULT_STRUK_TEMPLATE) || ''
        };
        const widthNum = Number(curTpl.lebar_mm) === 80 ? 80 : 58;
        const sampleData = buildStrukEditorSampleData(prof);
        const previewHtml = renderStrukPreviewContent(curTpl.template_teks, sampleData, widthNum);
        const presets = (global.StrukEngine && global.StrukEngine.TEMPLATE_PRESETS) || [];
        return `<div class="ons-card p-5 space-y-4 text-xs">
          <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b" style="border-color:var(--ons-border)">
            <div>
              <h3 class="font-bold text-sm">Desain &amp; Pratinjau Struk Thermal 58mm / 80mm</h3>
              <p style="color:var(--ons-text-soft)">Atur tata letak struk kasir dengan direktif <code>[C]</code>, <code>[B]</code>, <code>[LR]Kiri||Kanan</code>, blok item <code>{{#ITEM}}...{{/ITEM}}</code>, dan <code>[QR]</code>.</p>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <select id="strukTplWidth" onchange="window.previewEditedStruk()" class="ons-select w-32 text-xs font-semibold">
                <option value="58" ${widthNum !== 80 ? 'selected' : ''}>58 mm (32 Kolom)</option>
                <option value="80" ${widthNum === 80 ? 'selected' : ''}>80 mm (46 Kolom)</option>
              </select>
              <button type="button" onclick="window.testPrintEditedStruk()" class="ons-btn ons-btn-ghost text-xs">Uji Cetak</button>
              <button type="button" onclick="window.downloadEditedStrukPng()" class="ons-btn ons-btn-ghost text-xs">Unduh PNG</button>
              <button type="button" onclick="window.saveStrukTemplateServer()" class="ons-btn ons-btn-emerald text-xs font-bold">Simpan Template ke Sheets</button>
            </div>
          </div>

          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex flex-wrap items-center gap-1.5">
              <span class="text-[11px] font-semibold mr-1" style="color:var(--ons-text-soft)">Preset Cepat:</span>
              ${presets.map((pr) => `<button type="button" onclick="window.applyStrukPreset('${S().esc(pr.id)}')" class="ons-struk-preset-btn ${curTpl.kode === pr.kode ? 'active' : ''}">${S().esc(pr.label)}</button>`).join('')}
            </div>
            ${tpls.length > 1 ? `<div class="flex items-center gap-1.5">
              <span class="text-[11px] font-semibold" style="color:var(--ons-text-soft)">Template Tersimpan:</span>
              <select onchange="window.selectStrukTemplateIdx(this.value)" class="ons-select text-xs w-56">
                ${tpls.map((t, idx) => `<option value="${idx}" ${idx === safeIdx ? 'selected' : ''}>${S().esc(t.nama || t.kode)} (${Number(t.lebar_mm) === 80 ? '80mm' : '58mm'})</option>`).join('')}
              </select>
            </div>` : ''}
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <div class="lg:col-span-7 space-y-2.5">
              <input id="strukTplKode" type="hidden" value="${S().esc(curTpl.kode || 'STRUK_POS_58MM')}"/>
              <div>
                <label class="font-semibold text-[11px] block mb-1" style="color:var(--ons-text-soft)">Nama Template Struk</label>
                <input id="strukTplNama" class="ons-input text-xs font-bold" value="${S().esc(curTpl.nama || 'Struk Kasir Standar 58mm')}"/>
              </div>
              <div>
                <div class="flex flex-wrap items-center justify-between gap-2 mb-1">
                  <label class="font-semibold text-[11px]" style="color:var(--ons-text-soft)">Kode Tata Letak Struk</label>
                  <button type="button" onclick="window.resetEditedStrukPreset()" class="text-[11px] font-semibold text-blue-600 hover:underline">Pulihkan Template Bawaan</button>
                </div>
                <textarea id="strukTplText" rows="16" oninput="window.previewEditedStruk()" class="ons-textarea font-mono-num text-[11.5px] leading-relaxed">${S().esc(curTpl.template_teks || '')}</textarea>
              </div>
              <div class="p-2.5 rounded-xl border space-y-1.5" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
                <div class="text-[11px] font-semibold" style="color:var(--ons-text-soft)">Sisipkan Variabel / Direktif Cepat (klik untuk menambah ke editor):</div>
                <div class="flex flex-wrap gap-1.5">
                  ${STRUK_TOKEN_SNIPPETS.map((c, idx) => `<button type="button" onclick="window.insertStrukToken(${idx})" class="ons-struk-chip">${S().esc(c.label)}</button>`).join('')}
                </div>
              </div>
            </div>

            <div class="lg:col-span-5 space-y-2.5">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="flex items-center gap-1.5">
                  <span class="font-bold text-xs">Live Preview</span>
                  <span id="strukPreviewWidthPill" class="badge-bpom bpom-terbatas">${widthNum} mm &bull; ${widthNum === 80 ? '46' : '32'} Kolom</span>
                </div>
                <div class="flex items-center gap-1">
                  <button type="button" onclick="window.setStrukPreviewMode('paper')" class="ons-btn ${strukPreviewMode === 'paper' ? 'ons-btn-primary' : 'ons-btn-ghost'} text-[11px] py-1 px-2">Kertas</button>
                  <button type="button" onclick="window.setStrukPreviewMode('text')" class="ons-btn ${strukPreviewMode === 'text' ? 'ons-btn-primary' : 'ons-btn-ghost'} text-[11px] py-1 px-2">ESC/POS</button>
                </div>
              </div>
              <label class="flex items-center gap-2 text-[11px] cursor-pointer" style="color:var(--ons-text-soft)">
                <input type="checkbox" ${strukPreviewExtras ? 'checked' : ''} onchange="window.toggleStrukPreviewExtras(this.checked)" class="w-3.5 h-3.5 accent-blue-600"/>
                <span>Tampilkan contoh diskon, aturan pakai &amp; kembalian di pratinjau</span>
              </label>
              <div id="strukEditorLivePreview" class="ons-struk-paper-tray">${previewHtml}</div>
            </div>
          </div>
        </div>`;
      })() : ''}

      ${settingsTab === 'audit' ? (() => {
        const draft = ensureAuditDraft();
        const items = draft.items || [];
        const canEditAuditMeta = isOwner || role === 'APJ' || S().canAccessSubTab('settings', 'audit');
        const aq = auditLogSearchQ.trim().toLowerCase();
        const filteredAuditLogs = audit.filter((a) => {
          if (!aq) return true;
          return `${a.user_id} ${a.role} ${a.aksi} ${a.entitas} ${a.entitas_id} ${a.diff_sesudah_json} ${a.diff_sebelum_json}`.toLowerCase().includes(aq);
        });
        return `<div class="space-y-4 text-xs">
          <!-- Panel 1: Editor Sistem Audit Kepatuhan, Nama APJ & Kasir -->
          <div class="ons-card p-5 space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 class="font-bold text-sm">Editor Sistem Audit Kepatuhan BPOM, Nama APJ &amp; Nama Kasir</h3>
                <p style="color:var(--ons-text-soft)">Bukan hanya dicentang: edit butir pemeriksaan audit, ubah nama APJ &amp; Kasir penanggung jawab, dan sinkronkan ke sistem.</p>
              </div>
              <div class="flex flex-wrap gap-2">
                ${isOwner ? `<button type="button" onclick="window.setSettingsTab('akun')" class="ons-btn ons-btn-ghost text-xs">Kelola Matriks Hak Akses Staf &rarr;</button>` : ''}
                ${canEditAuditMeta ? `<button type="button" onclick="window.addAuditChecklistRow()" class="ons-btn ons-btn-ghost text-xs">+ Tambah Poin Audit</button>` : ''}
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              <div>
                <label class="font-semibold block mb-1">Nama APJ Pengaudit *</label>
                <input id="audSysApjNama" ${canEditAuditMeta ? '' : 'readonly'} class="ons-input text-xs" value="${S().esc(draft.apj_nama || '')}" oninput="window.updateAuditHeaderField('apj_nama', this.value)" placeholder="Nama Apoteker Penanggung Jawab"/>
              </div>
              <div>
                <label class="font-semibold block mb-1">No. SIPA APJ</label>
                <input id="audSysApjSipa" ${canEditAuditMeta ? '' : 'readonly'} class="ons-input font-mono-num text-xs" value="${S().esc(draft.apj_sipa || '-')}" oninput="window.updateAuditHeaderField('apj_sipa', this.value)" placeholder="No. SIPA APJ"/>
              </div>
              <div>
                <label class="font-semibold block mb-1">Nama Kasir Pelaksana *</label>
                <input id="audSysKasirNama" ${canEditAuditMeta ? '' : 'readonly'} class="ons-input text-xs" value="${S().esc(draft.kasir_nama || '')}" oninput="window.updateAuditHeaderField('kasir_nama', this.value)" placeholder="Nama Kasir Aktif"/>
              </div>
              <div>
                <label class="font-semibold block mb-1">Catatan Evaluasi Audit</label>
                <input id="audSysCatatan" class="ons-input text-xs" value="${S().esc(draft.catatan_audit || '')}" oninput="window.updateAuditHeaderField('catatan_audit', this.value)" placeholder="Ringkasan temuan CDOB hari ini"/>
              </div>
            </div>

            <div class="ons-table-wrap">
              <table class="ons-table">
                <thead><tr><th style="width:48px">Cek</th><th>Butir Pemeriksaan Audit (Dapat Diedit)</th><th style="width:120px">Penanggung Jawab</th><th>Keterangan / Hasil Verifikasi</th><th style="width:60px">Hapus</th></tr></thead>
                <tbody>
                  ${items.map((it, idx) => `<tr>
                    <td><input type="checkbox" ${it.checked ? 'checked' : ''} onchange="window.updateAuditChecklistRow(${idx}, 'checked', this.checked)" class="w-4 h-4 accent-blue-600 cursor-pointer"/></td>
                    <td><input ${canEditAuditMeta ? '' : 'readonly'} class="ons-input text-xs" value="${S().esc(it.label || '')}" oninput="window.updateAuditChecklistRow(${idx}, 'label', this.value)"/></td>
                    <td>
                      <select ${canEditAuditMeta ? '' : 'disabled'} class="ons-select text-xs" onchange="window.updateAuditChecklistRow(${idx}, 'pj_role', this.value)">
                        <option value="APJ" ${(it.pj_role || 'APJ') === 'APJ' ? 'selected' : ''}>APJ</option>
                        <option value="Kasir" ${it.pj_role === 'Kasir' ? 'selected' : ''}>Kasir</option>
                        <option value="Pemilik" ${it.pj_role === 'Pemilik' ? 'selected' : ''}>Pemilik</option>
                      </select>
                    </td>
                    <td><input class="ons-input text-xs" value="${S().esc(it.keterangan || '')}" oninput="window.updateAuditChecklistRow(${idx}, 'keterangan', this.value)" placeholder="Catatan pemeriksaan..."/></td>
                    <td>${canEditAuditMeta && items.length > 1 ? `<button type="button" onclick="window.removeAuditChecklistRow(${idx})" class="ons-btn ons-btn-danger text-xs px-2 py-1">&times;</button>` : '-'}</td>
                  </tr>`).join('')}
                </tbody>
              </table>
            </div>

            <div class="flex flex-wrap items-center justify-between gap-3 pt-2 border-t" style="border-color:var(--ons-border)">
              ${isOwner ? `<label class="flex items-center gap-2 cursor-pointer font-semibold">
                <input id="audSysSyncStaff" type="checkbox" checked class="w-4 h-4 accent-blue-600"/>
                <span>Sekaligus perbarui Nama APJ, No. SIPA &amp; Nama Kasir di akun <code>PENGGUNA_CABANG</code> &amp; Pejabat Surat</span>
              </label>` : `<span style="color:var(--ons-text-soft)">Terakhir diperbarui: <b>${S().esc(draft.updated_by || '-')}</b></span>`}
              <button type="button" onclick="window.submitAuditSystemForm()" class="ons-btn ons-btn-emerald text-xs px-5 py-2 font-bold">Simpan Sistem Audit &amp; Nama APJ/Kasir</button>
            </div>
          </div>

          <!-- Panel 2: Log Audit Immutable -->
          <div class="ons-card p-4 space-y-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h3 class="font-bold text-sm">Log Audit Immutable (Dengan Redaksi Secret Otomatis)</h3>
              <input class="ons-input text-xs w-64" value="${S().esc(auditLogSearchQ)}" oninput="window.setAuditLogSearch(this.value)" placeholder="Cari aksi, user, nama APJ/kasir, entitas..."/>
            </div>
            <div class="ons-table-wrap">
              <table class="ons-table">
                <thead><tr><th>Waktu</th><th>Pelaku &amp; Peran</th><th>Aksi</th><th>Entitas</th><th>Snapshot Perubahan</th></tr></thead>
                <tbody>
                  ${filteredAuditLogs.length ? filteredAuditLogs.map((a) => `<tr>
                    <td class="font-mono-num text-xs">${S().formatTgl(a.timestamp)}</td>
                    <td class="text-xs"><b>${S().esc(a.user_id)}</b> (${S().esc(a.role)})</td>
                    <td><span class="badge-bpom bpom-terbatas">${S().esc(a.aksi)}</span></td>
                    <td class="font-mono-num text-xs">${S().esc(a.entitas)} #${S().esc(a.entitas_id)}</td>
                    <td class="font-mono-num text-[11px] max-w-md truncate">${S().esc(a.diff_sesudah_json)}</td>
                  </tr>`).join('') : '<tr><td colspan="5" class="text-center py-6" style="color:var(--ons-text-soft)">Tidak ada log audit yang sesuai pencarian.</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>
        </div>`;
      })() : ''}
    </div>`;
  }

  global.refreshProfileLivePreview = (kind, rawUrl) => {
    const clean = String(rawUrl || '').trim();
    if (kind === 'foto') profileMediaDraft.foto = clean;
    else profileMediaDraft.logo = clean;
    const ownerEl = document.getElementById('profNamaPemilik');
    const usahaEl = document.getElementById('profNamaUsaha');
    const targetId = kind === 'foto' ? 'profPhotoPreview' : 'profLogoPreview';
    const box = document.getElementById(targetId);
    if (box) {
      box.innerHTML = renderProfileMediaInner(kind, clean, kind === 'foto' ? ((ownerEl && ownerEl.value) || '') : ((usahaEl && usahaEl.value) || ''));
    }
    if (typeof global.refreshProfileKopPreview === 'function') global.refreshProfileKopPreview();
  };

  global.refreshProfileKopPreview = () => {
    const box = document.getElementById('profKopPreviewBox');
    if (!box) return;
    const val = (id, fb) => {
      const el = document.getElementById(id);
      return el ? el.value : (fb || '');
    };
    const prof = S().getStoreProfile();
    const logoUrl = val('profLogoUrl', prof.logo_usaha_url);
    const namaUsaha = val('profNamaUsaha', prof.nama_usaha);
    const alamat = val('profAlamatUsaha', prof.alamat_usaha);
    const kota = val('profKota', prof.kota);
    const kodePos = val('profKodePos', prof.kode_pos);
    const waUsaha = val('profWaUsaha', prof.wa_usaha) || val('profTelpUsaha', prof.telepon_usaha);
    const noSia = val('profNoSia', prof.no_sia);
    const namaPemilik = val('profNamaPemilik', prof.nama_pemilik);
    const sipa = val('profSipaPemilik', prof.sipa_pemilik);
    box.innerHTML = `<div class="flex items-center gap-3">
      <div class="ons-logo-frame">${renderProfileMediaInner('logo', logoUrl, namaUsaha)}</div>
      <div>
        <div class="font-extrabold text-sm">${S().esc(namaUsaha || 'Apotek ONS Farma')}</div>
        <div class="text-[11px]" style="color:var(--ons-text-soft)">${S().esc(alamat || '-')}, ${S().esc(kota || '-')} ${S().esc(kodePos || '')}</div>
        <div class="text-[11px] font-mono-num" style="color:var(--ons-text-soft)">Telp/WA: ${S().esc(waUsaha || '-')} &bull; SIA: ${S().esc(noSia || '-')}</div>
      </div>
    </div>
    <div class="text-left sm:text-right">
      <div class="text-[10px] font-bold uppercase" style="color:var(--ons-text-soft)">Pemilik &amp; Apoteker Penanggung Jawab</div>
      <div class="font-bold text-xs">${S().esc(namaPemilik || 'apt. Anissa Faradifa R. Is Rumi')}</div>
      <div class="text-[11px] font-mono-num" style="color:var(--ons-text-soft)">SIPA: ${S().esc(sipa || '-')}</div>
    </div>`;
  };

  global.handleProfileImageUpload = async (kind, inputEl) => {
    const file = inputEl && inputEl.files && inputEl.files[0];
    if (!file) return;
    try {
      const dataUrl = await S().compressImageFile(file, kind === 'foto' ? 220 : 240, 0.82);
      const urlInput = document.getElementById(kind === 'foto' ? 'profFotoUrl' : 'profLogoUrl');
      if (urlInput) urlInput.value = dataUrl;
      global.refreshProfileLivePreview(kind, dataUrl);
      global.toast((kind === 'foto' ? 'Foto pemilik' : 'Logo usaha') + ' siap — klik Konfirmasi & Simpan untuk menyimpan permanen.', 'ok');
    } catch (e) {
      global.toast(e.message || 'Gagal memproses gambar.', 'err');
    }
  };

  global.resetProfileMedia = (kind) => {
    const val = kind === 'logo' ? './icons/ons-farma-app-icon.png' : '';
    const urlInput = document.getElementById(kind === 'foto' ? 'profFotoUrl' : 'profLogoUrl');
    if (urlInput) urlInput.value = val;
    global.refreshProfileLivePreview(kind, val);
  };

  global.submitStoreProfileForm = async () => {
    const chk = document.getElementById('profConfirmChk');
    if (chk && !chk.checked) {
      global.toast('Centang pernyataan konfirmasi keabsahan data terlebih dahulu.', 'err');
      return;
    }
    const v = (id) => {
      const el = document.getElementById(id);
      return el ? String(el.value || '').trim() : '';
    };
    const payload = {
      nama_pemilik: v('profNamaPemilik'),
      jabatan_pemilik: v('profJabatanPemilik'),
      sipa_pemilik: v('profSipaPemilik'),
      stra_pemilik: v('profStraPemilik'),
      wa_pemilik: v('profWaPemilik'),
      email_pemilik: v('profEmailPemilik'),
      npwp_pemilik: v('profNpwpPemilik'),
      foto_pemilik_url: v('profFotoUrl'),
      nama_usaha: v('profNamaUsaha'),
      no_sia: v('profNoSia'),
      nib_oss: v('profNibOss'),
      npwp_usaha: v('profNpwpUsaha'),
      status_pkp: v('profStatusPkp'),
      alamat_usaha: v('profAlamatUsaha'),
      kota: v('profKota'),
      kode_pos: v('profKodePos'),
      telepon_usaha: v('profTelpUsaha'),
      wa_usaha: v('profWaUsaha'),
      email_usaha: v('profEmailUsaha'),
      jam_operasional: v('profJamOps'),
      zona_waktu: v('profZonaWaktu'),
      logo_usaha_url: v('profLogoUrl'),
      terkonfirmasi: 'YA',
      dikonfirmasi_oleh: (document.getElementById('profNamaPemilik') || {}).value || (cur.nama_pemilik || 'apt. Anissa Faradifa R. Is Rumi')
    };
    if (!payload.nama_pemilik || !payload.nama_usaha) {
      global.toast('Nama Pemilik dan Nama Tempat Usaha wajib diisi.', 'err');
      return;
    }
    try {
      const res = await API().callApi('profil.save', payload, { isWrite: true });
      const rawProf = (res && (res.profile || res.item)) || (res && res.nama_usaha ? res : null);
      const saved = S().setStoreProfile(rawProf || payload);
      if (S().AppState.user && S().AppState.user.role === 'Pemilik') {
        S().AppState.user.nama_lengkap = saved.nama_pemilik;
        S().AppState.user.no_sipa = saved.sipa_pemilik;
        const ses = API().getSession && API().getSession();
        if (ses && ses.user) {
          ses.user = Object.assign({}, ses.user, {
            nama_lengkap: saved.nama_pemilik,
            no_sipa: saved.sipa_pemilik || ses.user.no_sipa
          });
          API().setSession(ses);
        }
      }
      profileMediaDraft = { foto: null, logo: null };
      settingsCache.users = [];
      settingsCache.audit = [];
      if (typeof global.renderApp === 'function') global.renderApp();
      global.toast('Data Pemilik, Foto/Logo & Tempat Usaha berhasil dikonfirmasi dan disimpan!', 'ok');
    } catch (e) {
      global.toast(e.message || 'Gagal menyimpan profil apotek.', 'err');
    }
  };

  global.toggleMultiBranchMode = (enabled) => {
    if (!S().setMultiBranchMode) return;
    S().setMultiBranchMode(!!enabled);
    if (typeof global.renderApp === 'function') global.renderApp();
    global.toast(enabled ? 'Mode Multi-Cabang diaktifkan (Mutasi & Pembanding Cabang tersedia).' : 'Mode 1 Apotek Tunggal aktif (tampilan cabang disederhanakan).', 'ok');
  };

  global.saveMultiBranchCodes = () => {
    const raw = ((document.getElementById('profMultiBranchCodes') || {}).value || '').split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
    const list = Array.from(new Set(['ONS-01'].concat(raw)));
    if (list.length < 2) {
      global.toast('Masukkan minimal 2 kode outlet (mis. ONS-01, ONS-02) atau kembalikan ke Mode 1 Apotek.', 'warn');
      return;
    }
    S().setMultiBranchMode(true, list);
    if (typeof global.renderApp === 'function') global.renderApp();
    global.toast('Daftar outlet cabang diperbarui: ' + list.join(', '), 'ok');
  };

  let _setLoading = false;
  let _setLoadPromise = null;
  global.loadSettingsBundle = async (force) => {
    if (_setLoading) {
      if (!force) return _setLoadPromise;
      try { await _setLoadPromise; } catch (e) {}
    }
    if (!force && (settingsCache.audit.length || Object.keys(settingsCache.secrets).length)) return;
    _setLoading = true;
    _setLoadPromise = (async () => {
      try {
        const [sec, aud, usr, profRes, chkRes] = await Promise.all([
          API().callApi('settings.getSecretsMasked', {}).catch(() => ({ secrets: {} })),
          API().callApi('audit.list', {}).catch(() => ({ items: [] })),
          S().getRole() === 'Pemilik' ? API().callApi('users.list', {}).catch(() => ({ items: [] })) : Promise.resolve({ items: [] }),
          API().callApi('profil.get', {}).catch(() => null),
          API().callApi('audit.getChecklist', {}).catch(() => null)
        ]);
        const rawProf = profRes && ((profRes.profile || profRes.item) || (profRes.nama_usaha ? profRes : null));
        if (rawProf && S().setStoreProfile) S().setStoreProfile(rawProf);
        if (usr && usr.rbac_permissions) S().AppState.rbacPermissions = usr.rbac_permissions;
        if (chkRes && chkRes.items && S().setAuditSystem) {
          S().setAuditSystem(chkRes);
          resetAuditDraftFromStore();
        } else if (usr && usr.audit_system && S().setAuditSystem) {
          S().setAuditSystem(usr.audit_system);
          resetAuditDraftFromStore();
        }
        settingsCache = { secrets: sec.secrets || {}, audit: aud.items || [], users: usr.items || [] };
        if (settingsCache.users.length) {
          S().AppState.staffDirectory = settingsCache.users.map((u) => Object.assign({}, u));
        }
        if (S().AppState.activeView === 'settings') global.renderActiveView();
      } catch (e) {} finally {
        _setLoading = false;
        _setLoadPromise = null;
      }
    })();
    return _setLoadPromise;
  };

  global.seedStarterCatalogFromSettings = async () => {
    try {
      const res = await API().callApi('system.seedStarterCatalog', {}, { isWrite: true });
      global.toast(res.message || 'Katalog awal berhasil diisi!', 'ok');
      await global.bootLoadState(true);
    } catch (e) { global.toast(e.message, 'err'); }
  };

  global.updateAuditHeaderField = (key, val) => {
    const d = ensureAuditDraft();
    d[key] = val;
  };

  global.updateAuditChecklistRow = (idx, key, val) => {
    const d = ensureAuditDraft();
    if (!d.items || !d.items[idx]) return;
    d.items[idx][key] = val;
    if (key === 'pj_role') {
      d.items[idx].pj_nama = val === 'Kasir' ? (d.kasir_nama || '') : (d.apj_nama || '');
    }
  };

  global.addAuditChecklistRow = () => {
    const d = ensureAuditDraft();
    d.items.push({
      id: 'AUDC-' + Date.now().toString().slice(-5),
      label: 'Poin Pemeriksaan Audit Baru',
      checked: false,
      pj_role: 'APJ',
      pj_nama: d.apj_nama || '',
      keterangan: ''
    });
    global.renderActiveView();
  };

  global.removeAuditChecklistRow = (idx) => {
    const d = ensureAuditDraft();
    if ((d.items || []).length <= 1) return;
    d.items.splice(idx, 1);
    global.renderActiveView();
  };

  global.setAuditLogSearch = (q) => {
    auditLogSearchQ = q || '';
    global.renderActiveView();
  };

  global.submitAuditSystemForm = async () => {
    const d = ensureAuditDraft();
    const apjEl = document.getElementById('audSysApjNama');
    const sipaEl = document.getElementById('audSysApjSipa');
    const kasirEl = document.getElementById('audSysKasirNama');
    const catEl = document.getElementById('audSysCatatan');
    const syncEl = document.getElementById('audSysSyncStaff');
    const payload = {
      cabang_id: S().AppState.cabangId || 'ONS-01',
      apj_user_id: d.apj_user_id || 'USR-002',
      apj_nama: apjEl ? apjEl.value.trim() : d.apj_nama,
      apj_sipa: sipaEl ? sipaEl.value.trim() : d.apj_sipa,
      kasir_user_id: d.kasir_user_id || 'USR-003',
      kasir_nama: kasirEl ? kasirEl.value.trim() : d.kasir_nama,
      catatan_audit: catEl ? catEl.value.trim() : d.catatan_audit,
      sync_staff_accounts: syncEl ? !!syncEl.checked : false,
      items: (d.items || []).map((it) => Object.assign({}, it))
    };
    if (!payload.apj_nama || !payload.kasir_nama) {
      global.toast('Nama APJ Pengaudit dan Nama Kasir wajib diisi.', 'err');
      return;
    }
    try {
      const res = await API().callApi('audit.saveChecklist', payload, { isWrite: true });
      if (res && res.audit_system && S().setAuditSystem) {
        S().setAuditSystem(res.audit_system);
        resetAuditDraftFromStore();
      }
      if (res && Array.isArray(res.staff_directory)) {
        S().AppState.staffDirectory = res.staff_directory;
      }
      if (S().AppState.user) {
        if (S().AppState.user.role === 'APJ' && payload.sync_staff_accounts) {
          S().AppState.user.nama_lengkap = payload.apj_nama;
          if (payload.apj_sipa) S().AppState.user.no_sipa = payload.apj_sipa;
        }
      }
      await global.loadSettingsBundle(true);
      if (typeof global.renderApp === 'function') global.renderApp();
      global.toast('Sistem Audit, Nama APJ & Nama Kasir berhasil diperbarui!', 'ok');
    } catch (e) {
      global.toast(e.message || 'Gagal menyimpan sistem audit.', 'err');
    }
  };

  global.saveQuickStaffCard = async (targetRole) => {
    const isApj = targetRole === 'APJ';
    const idUser = (document.getElementById(isApj ? 'quickApjId' : 'quickKasirId') || {}).value || (isApj ? 'USR-002' : 'USR-003');
    const nama = ((document.getElementById(isApj ? 'quickApjNama' : 'quickKasirNama') || {}).value || '').trim();
    const username = ((document.getElementById(isApj ? 'quickApjUser' : 'quickKasirUser') || {}).value || '').trim();
    const sipa = isApj ? (((document.getElementById('quickApjSipa') || {}).value || '-').trim()) : undefined;
    const statusAktif = isApj ? 'AKTIF' : (((document.getElementById('quickKasirStatus') || {}).value || 'AKTIF'));
    if (!nama || !username) {
      global.toast('Username dan Nama ' + targetRole + ' wajib diisi.', 'err');
      return;
    }
    const existing = (settingsCache.users || []).find((u) => u.id_user === idUser || u.role === targetRole) || {};
    try {
      const res = await API().callApi('users.save', {
        id_user: existing.id_user || idUser,
        username,
        nama_lengkap: nama,
        role: targetRole,
        cabang_id: existing.cabang_id || S().AppState.cabangId || 'ONS-01',
        no_sipa: sipa !== undefined ? sipa : (existing.no_sipa || '-'),
        masa_berlaku_sipa: existing.masa_berlaku_sipa || '-',
        status_aktif: statusAktif
      }, { isWrite: true });
      if (res && res.audit_system && S().setAuditSystem) {
        S().setAuditSystem(res.audit_system);
        resetAuditDraftFromStore();
      }
      await global.loadSettingsBundle(true);
      if (typeof global.renderApp === 'function') global.renderApp();
      global.toast('Nama ' + targetRole + ' (' + nama + ') berhasil diperbarui & disinkronkan!', 'ok');
    } catch (e) {
      global.toast(e.message || 'Gagal memperbarui nama ' + targetRole, 'err');
    }
  };

  global.applyRolePresetPerms = (presetMode) => {
    const defMap = S().DEFAULT_ROLE_PERMS || {};
    let keys = [];
    if (presetMode === 'ALL') {
      keys = (S().RBAC_MODULE_CATALOG || []).map((m) => m.key);
    } else if (presetMode === 'KASIR_AUDIT') {
      keys = (defMap.Kasir || []).concat(['gudang:opname', 'settings:audit']);
    } else {
      keys = defMap[presetMode] || defMap.Kasir || [];
    }
    document.querySelectorAll('.usr-perm-chk').forEach((chk) => {
      chk.checked = keys.includes(chk.value);
    });
  };

  global.openAddUserModal = (targetIdOrUsername) => {
    const allUsers = settingsCache.users.length ? settingsCache.users : (S().AppState.staffDirectory || []);
    const target = targetIdOrUsername
      ? allUsers.find((u) => u.id_user === targetIdOrUsername || String(u.username).toLowerCase() === String(targetIdOrUsername).toLowerCase())
      : null;
    const isEdit = !!target;
    const initRole = (target && target.role) || 'Kasir';
    const effPerms = target
      ? (S().getUserPermissions ? S().getUserPermissions(target) : [])
      : ((S().DEFAULT_ROLE_PERMS && S().DEFAULT_ROLE_PERMS[initRole]) || []);
    const catalog = S().RBAC_MODULE_CATALOG || [];

    S().openModal(`<div class="p-6 space-y-4 text-xs">
      <div class="flex justify-between items-center pb-2 border-b" style="border-color:var(--ons-border)">
        <div>
          <h3 class="font-bold text-base">${isEdit ? 'Edit Akun, Nama &amp; Sistem Hak Akses: ' + S().esc(target.nama_lengkap) : 'Tambah Akun Pengguna Baru &amp; Hak Akses'}</h3>
          <p class="text-[11px]" style="color:var(--ons-text-soft)">Ubah nama APJ/Kasir/Pemilik, No. SIPA, status aktif, sekaligus centang modul &amp; hak audit yang diizinkan.</p>
        </div>
        <button onclick="ONSStore.closeModal()" class="text-xl px-2">&times;</button>
      </div>

      <input type="hidden" id="usrEditId" value="${S().esc((target && target.id_user) || '')}"/>
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div class="lg:col-span-5 space-y-2.5">
          <div class="font-bold text-xs uppercase tracking-wide" style="color:var(--ons-primary)">1. Identitas &amp; Peran Staf</div>
          <div class="grid grid-cols-2 gap-2.5">
            <div><label class="font-semibold block mb-1">Username *</label><input id="usrName" class="ons-input font-mono-num" value="${S().esc((target && target.username) || '')}" placeholder="kasir2"/></div>
            <div><label class="font-semibold block mb-1">Role *</label>
              <select id="usrRole" class="ons-select" ${isEdit ? '' : 'onchange="window.applyRolePresetPerms(this.value)"'}>
                <option value="Kasir" ${initRole === 'Kasir' ? 'selected' : ''}>Kasir</option>
                <option value="APJ" ${initRole === 'APJ' ? 'selected' : ''}>APJ</option>
                <option value="Pemilik" ${initRole === 'Pemilik' ? 'selected' : ''}>Pemilik</option>
              </select>
            </div>
          </div>
          <div><label class="font-semibold block mb-1">Nama Lengkap (Pemilik / APJ / Kasir) *</label><input id="usrFull" class="ons-input" value="${S().esc((target && target.nama_lengkap) || '')}" placeholder="Contoh: apt. Dewi Kartika, S.Farm"/></div>
          <div class="grid grid-cols-2 gap-2.5">
            <div><label class="font-semibold block mb-1">${(S().isMultiBranchEnabled && S().isMultiBranchEnabled()) ? 'Cabang' : 'Outlet Apotek'}</label><input id="usrBranch" ${(S().isMultiBranchEnabled && S().isMultiBranchEnabled()) ? '' : 'readonly'} class="ons-input font-mono-num" value="${S().esc((target && target.cabang_id) || S().AppState.cabangId || 'ONS-01')}"/></div>
            <div><label class="font-semibold block mb-1">Status Aktif</label>
              <select id="usrStatus" class="ons-select">
                <option value="AKTIF" ${(!target || String(target.status_aktif || 'AKTIF') === 'AKTIF') ? 'selected' : ''}>AKTIF</option>
                <option value="NONAKTIF" ${(target && target.status_aktif === 'NONAKTIF') ? 'selected' : ''}>NONAKTIF</option>
              </select>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-2.5">
            <div><label class="font-semibold block mb-1">No. SIPA (Apoteker/APJ)</label><input id="usrSipa" class="ons-input font-mono-num" value="${S().esc((target && target.no_sipa) || '-')}" placeholder="-"/></div>
            <div><label class="font-semibold block mb-1">Berlaku SIPA s/d</label><input id="usrSipaExp" class="ons-input font-mono-num" value="${S().esc((target && target.masa_berlaku_sipa) || '-')}" placeholder="2029-12-31"/></div>
          </div>
          <div class="grid grid-cols-2 gap-2.5">
            <div>
              <label class="font-semibold block mb-1">${isEdit ? 'Kata Sandi Baru (Opsional)' : 'Kata Sandi Awal (min 8 huruf+angka) *'}</label>
              <input id="usrPass" type="password" autocomplete="new-password" oninput="window.evaluatePwStrengthHint('usrPass','usrPwHint')" class="ons-input" placeholder="${isEdit ? 'Kosongkan jika tetap' : 'Min. 8 karakter kuat'}"/>
              <div id="usrPwHint" class="mt-0.5 text-[10px]"></div>
            </div>
            <div>
              <label class="font-semibold block mb-1">${isEdit ? 'PIN 6 Digit Baru (Opsional)' : 'PIN 6 Digit Otorisasi'}</label>
              <input id="usrPin" type="password" maxlength="6" autocomplete="off" class="ons-input font-mono-num" value="" placeholder="${isEdit ? 'Kosongkan jika tetap' : '6 digit acak (wajib APJ/Pemilik)'}"/>
            </div>
          </div>
        </div>

        <div class="lg:col-span-7 space-y-2.5 p-3.5 rounded-xl border" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div class="font-bold text-xs uppercase tracking-wide" style="color:var(--ons-primary)">2. Matriks Hak Akses &amp; Audit Modul</div>
              <div class="text-[11px]" style="color:var(--ons-text-soft)">Centang menu &amp; wewenang audit yang diizinkan untuk akun ini. (Pemilik selalu memiliki akses penuh)</div>
            </div>
            <div class="flex flex-wrap gap-1">
              <button type="button" onclick="window.applyRolePresetPerms('ALL')" class="ons-btn ons-btn-ghost text-[10px] py-1 px-2">Semua</button>
              <button type="button" onclick="window.applyRolePresetPerms('APJ')" class="ons-btn ons-btn-ghost text-[10px] py-1 px-2">Standar APJ</button>
              <button type="button" onclick="window.applyRolePresetPerms('KASIR_AUDIT')" class="ons-btn ons-btn-ghost text-[10px] py-1 px-2">Kasir + Audit</button>
              <button type="button" onclick="window.applyRolePresetPerms('Kasir')" class="ons-btn ons-btn-ghost text-[10px] py-1 px-2">Standar Kasir</button>
            </div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-64 overflow-y-auto pr-1">
            ${catalog.map((m) => `<label class="flex items-center gap-2 p-1.5 rounded-lg border cursor-pointer" style="background:var(--ons-surface);border-color:var(--ons-border)">
              <input type="checkbox" value="${S().esc(m.key)}" ${effPerms.includes(m.key) ? 'checked' : ''} class="usr-perm-chk w-3.5 h-3.5 accent-blue-600 shrink-0"/>
              <span class="leading-tight"><b>${S().esc(m.label)}</b><span class="block text-[10px]" style="color:var(--ons-text-soft)">${S().esc(m.group)}</span></span>
            </label>`).join('')}
          </div>
        </div>
      </div>

      <div class="flex justify-end gap-2 pt-2 border-t" style="border-color:var(--ons-border)">
        <button type="button" onclick="ONSStore.closeModal()" class="ons-btn ons-btn-ghost text-xs">Batal</button>
        <button type="button" onclick="window.submitAddUserNow()" class="ons-btn ons-btn-emerald text-xs px-5 font-bold">Simpan Perubahan Akun &amp; Hak Akses</button>
      </div>
    </div>`, '880px');
  };

  global.submitAddUserNow = async () => {
    try {
      const idUser = (document.getElementById('usrEditId') || {}).value || '';
      const perms = Array.from(document.querySelectorAll('.usr-perm-chk:checked')).map((c) => c.value);
      const payload = {
        id_user: idUser || undefined,
        username: document.getElementById('usrName').value.trim(),
        nama_lengkap: document.getElementById('usrFull').value.trim(),
        role: document.getElementById('usrRole').value,
        cabang_id: document.getElementById('usrBranch').value.trim(),
        status_aktif: (document.getElementById('usrStatus') || {}).value || 'AKTIF',
        no_sipa: document.getElementById('usrSipa').value.trim(),
        masa_berlaku_sipa: ((document.getElementById('usrSipaExp') || {}).value || '-').trim(),
        password_baru: document.getElementById('usrPass').value,
        pin_baru: document.getElementById('usrPin').value,
        hak_akses: perms
      };
      const res = await API().callApi('users.save', payload, { isWrite: true });
      if (res && res.rbac_permissions) {
        S().AppState.rbacPermissions = res.rbac_permissions;
      }
      if (res && res.audit_system && S().setAuditSystem) {
        S().setAuditSystem(res.audit_system);
        resetAuditDraftFromStore();
      }
      if (S().AppState.user && ((idUser && S().AppState.user.id_user === idUser) || String(S().AppState.user.username || '').toLowerCase() === payload.username.toLowerCase())) {
        S().AppState.user.nama_lengkap = payload.nama_lengkap;
        S().AppState.user.no_sipa = payload.no_sipa;
        S().AppState.user.role = payload.role;
        S().AppState.user.hak_akses = perms;
      }
      S().closeModal();
      global.toast('Akun "' + payload.nama_lengkap + '" & hak akses berhasil disimpan!', 'ok');
      await global.loadSettingsBundle(true);
      if (typeof global.renderApp === 'function') global.renderApp();
    } catch (e) { global.toast(e.message, 'err'); }
  };

  global.evaluatePwStrengthHint = (pwInputId, hintElId) => {
    const pw = String((document.getElementById(pwInputId) || {}).value || '');
    const hint = document.getElementById(hintElId);
    if (!hint) return;
    if (!pw) {
      hint.innerHTML = '';
      return;
    }
    const hasLen = pw.length >= 8;
    const hasMix = /[A-Za-z]/.test(pw) && /\d/.test(pw);
    const hasSym = /[^A-Za-z0-9]/.test(pw) && pw.length >= 10;
    if (!hasLen || !hasMix) {
      hint.innerHTML = '<span class="text-red-600 font-semibold">Lemah: wajib min. 8 karakter kombinasi huruf &amp; angka.</span>';
    } else if (!hasSym) {
      hint.innerHTML = '<span class="text-amber-600 font-semibold">Cukup kuat (tambah simbol &amp; >=10 karakter agar maksimal).</span>';
    } else {
      hint.innerHTML = '<span class="text-emerald-600 font-semibold">Sandi sangat kuat (enkripsi 250x SHA-256).</span>';
    }
  };

  global.openChangeCredModal = (targetUsername) => {
    const sesUser = (API().getSession() && API().getSession().user) || {};
    const curUser = (S().AppState.user && S().AppState.user.username) ? S().AppState.user : sesUser;
    const u = targetUsername || curUser.username || 'pemilik';
    const isSelf = String(u).toLowerCase() === String(curUser.username || '').toLowerCase();
    S().openModal(`<div class="p-6 space-y-3 text-xs">
      <div class="flex justify-between items-center"><h3 class="font-bold text-base">Ubah Kata Sandi &amp; PIN: <span class="font-mono-num text-blue-600">${S().esc(u)}</span></h3><button onclick="ONSStore.closeModal()" class="text-xl">&times;</button></div>
      <input type="hidden" id="credTargetUser" value="${S().esc(u)}"/>
      <input type="hidden" id="credIsSelf" value="${isSelf ? '1' : '0'}"/>
      ${isSelf ? `<div>
        <label class="font-semibold block mb-1">Kata Sandi Saat Ini (Verifikasi Identitas) *</label>
        <input id="credOldPass" type="password" autocomplete="current-password" class="ons-input" placeholder="Masukkan kata sandi anda saat ini"/>
      </div>` : `<div class="p-2.5 rounded-lg border border-amber-500/40 bg-amber-500/10 space-y-1.5">
        <label class="font-bold block text-amber-800 dark:text-amber-200">Otorisasi Reset Staf &mdash; PIN Pemilik (6 Digit) *</label>
        <input id="credOwnerPin" type="password" maxlength="6" autocomplete="off" class="ons-input font-mono-num" placeholder="Masukkan 6 digit PIN Pemilik"/>
      </div>`}
      <div>
        <label class="font-semibold block mb-1">Kata Sandi Baru (min. 8 huruf + angka, kosongkan jika tetap)</label>
        <input id="credNewPass" type="password" autocomplete="new-password" oninput="window.evaluatePwStrengthHint('credNewPass','credPwHint')" class="ons-input" placeholder="Min. 8 karakter (contoh: Apotek@2026)"/>
        <div id="credPwHint" class="mt-1 text-[11px]"></div>
      </div>
      <div>
        <label class="font-semibold block mb-1">PIN Otorisasi 6 Digit Baru (kosongkan jika tetap)</label>
        <input id="credNewPin" type="password" maxlength="6" autocomplete="off" class="ons-input font-mono-num" placeholder="6 digit acak (hindari pola berulang/urut)"/>
      </div>
      <label class="flex items-center gap-2"><input id="credRevokeAll" type="checkbox" checked class="accent-blue-600"/> Cabut paksa seluruh sesi perangkat lain secara global</label>
      <button onclick="window.submitChangeCredNow()" class="ons-btn ons-btn-primary w-full py-2.5 font-bold">Simpan Perubahan Kredensial</button>
    </div>`, '470px');
  };

  global.submitChangeCredNow = async () => {
    try {
      const isSelf = (document.getElementById('credIsSelf') || {}).value === '1';
      const payload = {
        username: document.getElementById('credTargetUser').value,
        password_baru: document.getElementById('credNewPass').value,
        pin_baru: document.getElementById('credNewPin').value,
        revoke_other_sessions: !!document.getElementById('credRevokeAll').checked
      };
      if (isSelf) {
        payload.password_lama = (document.getElementById('credOldPass') || {}).value || '';
        if (!payload.password_lama && !API().isDemoMode()) {
          global.toast('Masukkan kata sandi Anda saat ini untuk konfirmasi.', 'warn');
          return;
        }
      } else {
        payload.pin_pemilik = (document.getElementById('credOwnerPin') || {}).value || '';
        if (!payload.pin_pemilik && !API().isDemoMode()) {
          global.toast('Masukkan PIN Pemilik 6 digit untuk mereset sandi/PIN staf.', 'warn');
          return;
        }
      }
      const res = await API().callApi('users.changeCredentials', payload, { isWrite: true });
      if (res && res.new_token) {
        const curSes = API().getSession() || {};
        API().setSession(Object.assign({}, curSes, { token: res.new_token }));
      }
      S().AppState.needsPasswordUpgrade = false;
      S().closeModal();
      global.toast(res.pesan || 'Kata sandi / PIN berhasil diperbarui!', 'ok');
      global.loadSettingsBundle(true);
    } catch (e) { global.toast(e.message, 'err'); }
  };

  global.promptUpdateSecret = (key) => {
    S().openModal(`<div class="p-6 space-y-3 text-xs">
      <div class="flex justify-between items-center">
        <h3 class="font-bold text-base">Perbarui Rahasia: <span class="font-mono-num text-blue-600">${S().esc(key)}</span></h3>
        <button onclick="ONSStore.closeModal()" class="text-xl">&times;</button>
      </div>
      <p style="color:var(--ons-text-soft)">Nilai disimpan aman di Google Apps Script <code>ScriptProperties</code> dan tidak pernah tampil polos setelah disimpan.</p>
      <div>
        <label class="font-semibold block mb-1">Nilai Baru (Tersensor) *</label>
        <div class="relative flex items-center">
          <input id="vaultSecretInput" type="password" autocomplete="off" class="ons-input pr-16 font-mono-num" placeholder="Tempel token / rahasia baru"/>
          <button type="button" onclick="if(window.togglePasswordFieldVis)window.togglePasswordFieldVis('vaultSecretInput', this)" class="absolute right-2 px-2 py-1 text-[11px] font-semibold" style="color:var(--ons-text-soft)">Lihat</button>
        </div>
      </div>
      <div class="flex justify-end gap-2 pt-1">
        <button type="button" onclick="ONSStore.closeModal()" class="ons-btn ons-btn-ghost">Batal</button>
        <button type="button" onclick="window.submitUpdateSecret('${S().esc(key)}')" class="ons-btn ons-btn-primary">Simpan ke ScriptProperties</button>
      </div>
    </div>`, '440px');
  };

  global.submitUpdateSecret = async (key) => {
    const val = String((document.getElementById('vaultSecretInput') || {}).value || '').trim();
    if (!val) {
      global.toast('Nilai rahasia tidak boleh kosong.', 'warn');
      return;
    }
    try {
      const r = await API().callApi('settings.saveSecret', { key, value: val }, { isWrite: true });
      S().closeModal();
      global.toast('Secret ' + key + ' diperbarui (' + r.masked + ')', 'ok');
      global.loadSettingsBundle(true);
    } catch (e) { global.toast(e.message, 'err'); }
  };

  global.revokeAllActiveSessions = async () => {
    try {
      const r = await API().callApi('auth.logoutAll', {}, { isWrite: true });
      global.toast('Seluruh sesi aktif global telah dicabut (Epoch Rev #' + r.session_rev + '). Silakan login ulang.', 'ok');
      setTimeout(() => { if (typeof global.logoutUser === 'function') global.logoutUser('Seluruh sesi dicabut oleh Pemilik.'); }, 700);
    } catch (e) { global.toast(e.message, 'err'); }
  };

  global.runSecurityHealthCheck = async () => {
    try {
      const rep = await API().callApi('security.auditStatus', {});
      const box = document.getElementById('secAuditResultBox');
      if (box) {
        const secs = Object.keys(rep.secrets_configured || {}).map((k) =>
          `<span class="badge-bpom ${rep.secrets_configured[k] ? 'bpom-bebas' : 'bpom-narkotika'}">${S().esc(k)}: ${rep.secrets_configured[k] ? 'AKTIF' : 'BELUM'}</span>`
        ).join(' ');
        box.innerHTML = `<div class="space-y-1.5">
          <div><b>Algoritma:</b> ${S().esc(rep.hash_algorithm)} &bull; <b>Akun Aktif:</b> ${rep.active_users_count} &bull; <b>Hash Valid:</b> ${rep.all_passwords_hashed ? '100% Terhash' : 'Perlu Cek'}</div>
          <div><b>Insiden Gagal Login/PIN Terakhir:</b> ${Number(rep.recent_security_alerts || 0)} &bull; <b>Epoch Cabut Sesi:</b> #${Number(rep.session_rev_epoch || 1)}</div>
          <div class="flex flex-wrap gap-1 pt-1">${secs}</div>
        </div>`;
        box.classList.remove('hidden');
      }
      global.toast('Pemeriksaan keamanan sistem selesai.', 'ok');
    } catch (e) { global.toast(e.message, 'err'); }
  };

  global.runDriveBackupSnapshot = async () => {
    try {
      const res = await API().callApi('backup.driveSnapshot', {}, { isWrite: true });
      global.toast('Snapshot JSON Drive berhasil dibuat: ' + res.file_name, 'ok');
    } catch (e) { global.toast(e.message, 'err'); }
  };

  function extractSpreadsheetId_(raw) {
    const val = String(raw || '').trim();
    if (!val || val.toUpperCase() === 'SPREADSHEET_LAMA_V9') return '';
    const match = val.match(/\/spreadsheets\/d\/([A-Za-z0-9_-]+)/);
    return match ? match[1] : val;
  }

  global.runMigrationPreview = async () => {
    try {
      const inputEl = document.getElementById('migSourceId');
      const src = extractSpreadsheetId_(inputEl ? inputEl.value : '');
      if (!src) {
        if (inputEl) inputEl.focus();
        return global.toast('Tempel ID atau URL Google Sheets lama terlebih dahulu. Untuk merapikan DB aktif, klik tombol "2. Perbaiki, Bersihkan & Sinkronkan DB" di kartu hijau paling atas.', 'warn');
      }
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
      const inputEl = document.getElementById('migSourceId');
      const src = extractSpreadsheetId_(inputEl ? inputEl.value : '');
      if (!src) {
        if (inputEl) inputEl.focus();
        return global.toast('Tempel ID atau URL Google Sheets lama terlebih dahulu. Untuk merapikan DB aktif, klik tombol "2. Perbaiki, Bersihkan & Sinkronkan DB" di kartu hijau paling atas.', 'warn');
      }
      const res = await API().callApi('migrasi.run', { source_id: src }, { isWrite: true });
      global.toast('Migrasi Upsert selesai untuk ' + res.results.length + ' sheet!', 'ok');
    } catch (e) { global.toast(e.message, 'err'); }
  };

  global.runDbAuditAndRepair = async (dryRun) => {
    try {
      const res = await API().callApi('db.auditAndRepair', { dry_run: !!dryRun, hapus_tab_sampah: true }, { isWrite: !dryRun });
      const box = document.getElementById('dbAuditResultBox');
      if (box) {
        box.classList.remove('hidden');
        const iss = Array.isArray(res.issues) ? res.issues : [];
        box.innerHTML = `<div class="font-bold mb-1.5">${S().esc(res.pesan || 'Audit selesai.')}</div>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] mb-2">
            <div class="p-2 rounded border" style="border-color:var(--ons-border)">Tab Dihapus: <b>${(res.sheets_deleted || []).length}</b></div>
            <div class="p-2 rounded border" style="border-color:var(--ons-border)">Batch Disinkron: <b>${Number(res.stok_batch_synced || 0)}</b></div>
            <div class="p-2 rounded border" style="border-color:var(--ons-border)">Piutang/Hutang: <b>${Number(res.piutang_synced || 0) + Number(res.hutang_pbf_synced || 0)}</b></div>
            <div class="p-2 rounded border" style="border-color:var(--ons-border)">Jurnal/SP/Tagihan: <b>${Number(res.jurnal_backfilled || 0) + Number(res.sp_synced || 0) + Number(res.tagihan_synced || 0)}</b></div>
          </div>` +
          (iss.length
            ? `<div class="text-[11px] space-y-0.5"><div class="font-semibold">Rincian Temuan (${iss.length}):</div>${iss.slice(0, 15).map((x) => `<div>&bull; ${S().esc(x)}</div>`).join('')}${iss.length > 15 ? `<div>... dan ${iss.length - 15} lainnya</div>` : ''}</div>`
            : '<div class="text-[11px] text-emerald-700 font-semibold">&#10003; Seluruh skema, sheet &amp; transaksi sudah 100% bersih dan sinkron!</div>');
      }
      global.toast(res.pesan || 'Audit & Sinkronisasi DB selesai!', 'ok');
      if (!dryRun) await global.bootLoadState(true);
    } catch (e) { global.toast(e.message || 'Gagal audit database.', 'err'); }
  };

  function renderFactoryResetPanelHtml(isOwner, scope) {
    const sfx = scope || 'vault';
    const isDemo = API().isDemoMode && API().isDemoMode();
    if (!isOwner) {
      return `<div class="p-3 rounded-xl border bg-amber-50 text-amber-800 border-amber-200 text-xs">
        <b>Zona Reset Data Pabrik:</b> Fitur pembersihan data pabrik hanya dapat dijalankan oleh akun berhak akses <b>Pemilik</b>.
      </div>`;
    }
    return `<div class="space-y-3 text-xs">
      <div class="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div class="flex items-center gap-2">
            <h3 class="font-extrabold text-sm text-red-700">Zona Reset Data Pabrik &amp; Inisialisasi Produksi</h3>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">Khusus Pemilik + PIN</span>
          </div>
          <p class="mt-1" style="color:var(--ons-text-soft)">Gunakan fitur ini sebelum apotek mulai beroperasi nyata untuk membersihkan seluruh data dummy, transaksi simulasi POS, stok uji coba, E-Resep, Tagihan, CRM &amp; riwayat pemeriksaan.</p>
        </div>
        ${isDemo ? `<button type="button" onclick="window.restoreDemoSampleData()" class="ons-btn ons-btn-ghost text-xs">Pulihkan Data Contoh Demo</button>` : ''}
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div class="p-3 rounded-xl border border-red-200 bg-red-50/70 text-red-900 space-y-1">
          <div class="font-bold">Data yang Dibersihkan:</div>
          <ul class="list-disc pl-4 space-y-0.5 text-[11px]">
            <li>Seluruh Transaksi POS, Nota, Mutasi Stok &amp; Batch FEFO</li>
            <li>Surat Pesanan (SP), Faktur Masuk PBF &amp; Piutang Tempo</li>
            <li>Kas, Jurnal Keuangan, Tutup Shift &amp; Log Cold-Chain</li>
            <li>Rekam Klinis E-Resep, Pemeriksaan Pasien, Tagihan &amp; CRM WA</li>
          </ul>
        </div>
        <div class="p-3 rounded-xl border border-emerald-200 bg-emerald-50/70 text-emerald-900 space-y-1">
          <div class="font-bold">Data yang Tetap Aman Terjaga:</div>
          <ul class="list-disc pl-4 space-y-0.5 text-[11px]">
            <li>Akun Login Pengguna, Password &amp; PIN (<code>PENGGUNA_CABANG</code>)</li>
            <li>Identitas Pemilik, Apotek, SIPA/SIA &amp; Logo (<code>PROFIL_USAHA</code>)</li>
            <li>Desain Struk Thermal, Template Dokumen Resmi &amp; Script Properties</li>
            <li>Pencatatan Log Audit Reset Pabrik baru sebagai jejak resmi</li>
          </ul>
        </div>
      </div>

      <label class="flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer" style="border-color:var(--ons-border);background:var(--ons-bg-subtle)">
        <input id="rstHapusMaster_${sfx}" type="checkbox" checked class="accent-red-600"/>
        <span><b>Reset Total 0%</b> &mdash; Hapus juga data Master Obat, Supplier PBF &amp; Pelanggan Member (hapus centang jika Master Obat sudah diisi data asli dan ingin dipertahankan).</span>
      </label>

      <div class="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
        <div class="md:col-span-5">
          <label class="font-semibold block mb-1">Ketik Konfirmasi: <code class="text-red-700 font-bold">RESET PABRIK</code></label>
          <input id="rstConfirm_${sfx}" class="ons-input font-mono-num uppercase" placeholder="RESET PABRIK"/>
        </div>
        <div class="md:col-span-3">
          <label class="font-semibold block mb-1">PIN Pemilik (6 Digit)</label>
          <input id="rstPin_${sfx}" type="password" maxlength="6" class="ons-input font-mono-num" placeholder="******"/>
        </div>
        <div class="md:col-span-4">
          <button type="button" onclick="window.executeFactoryReset('${sfx}')" class="ons-btn ons-btn-danger w-full min-h-[42px]">Jalankan Reset Data Pabrik</button>
        </div>
      </div>
    </div>`;
  }

  global.openFactoryResetModal = () => {
    const isOwner = S().getRole() === 'Pemilik';
    S().openModal(`<div class="ons-ws-modal" data-ws-custom="1">
      <div class="ons-ws-topbar">
        <div>
          <h3 class="font-extrabold text-base text-red-700">Reset Data Pabrik (Siap Operasional Produksi)</h3>
          <p class="text-xs" style="color:var(--ons-text-soft)">Bersihkan data uji coba dengan aman &mdash; identitas apotek &amp; akun login tetap dipertahankan.</p>
        </div>
        <button onclick="ONSStore.closeModal()" class="ons-btn ons-btn-ghost text-xs">Tutup &times;</button>
      </div>
      <div class="ons-ws-pane">${renderFactoryResetPanelHtml(isOwner, 'modal')}</div>
    </div>`, 'full');
  };

  global.executeFactoryReset = async (scope) => {
    const sfx = scope || 'vault';
    const conf = String((document.getElementById('rstConfirm_' + sfx) || {}).value || '').trim().toUpperCase();
    const pin = String((document.getElementById('rstPin_' + sfx) || {}).value || '').trim();
    const hapusMasterEl = document.getElementById('rstHapusMaster_' + sfx);
    const hapusMaster = hapusMasterEl ? !!hapusMasterEl.checked : true;

    if (conf !== 'RESET PABRIK') {
      global.toast('Ketik tepat RESET PABRIK pada kotak konfirmasi.', 'err');
      return;
    }
    if (!pin) {
      global.toast('Masukkan PIN Pemilik 6 digit untuk otorisasi.', 'err');
      return;
    }
    try {
      const res = await API().callApi('system.factoryReset', {
        konfirmasi: conf,
        pin,
        hapus_master: hapusMaster
      }, { isWrite: true });

      const st = S().AppState;
      st.carts = [{ id: 'K1', label: 'Pelanggan #1', channel: 'Toko Fisik', id_member: 'UMUM', tier_harga: 'UMUM', items: [], diskon_global: 0, held_note: '', held_at: '' }];
      st.activeCartIdx = 0;
      settingsCache = { secrets: settingsCache.secrets || {}, audit: [], users: settingsCache.users || [] };
      resetAuditDraftFromStore();

      S().closeModal();
      global.toast((res && res.pesan) || 'Reset Data Pabrik selesai! Sistem bersih siap produksi.', 'ok');
      await global.bootLoadState(true);
      if (typeof global.loadSettingsBundle === 'function') await global.loadSettingsBundle(true);
    } catch (e) {
      global.toast(e.message || 'Gagal melakukan Reset Data Pabrik.', 'err');
    }
  };

  global.restoreDemoSampleData = async () => {
    try {
      const res = await API().callApi('system.factoryReset', { demo_mode: 'restore_demo' }, { isWrite: true });
      S().closeModal();
      global.toast((res && res.pesan) || 'Data contoh Demo berhasil dipulihkan!', 'ok');
      await global.bootLoadState(true);
      if (typeof global.loadSettingsBundle === 'function') await global.loadSettingsBundle(true);
    } catch (e) {
      global.toast(e.message || 'Gagal memulihkan data contoh Demo.', 'err');
    }
  };

  /**
   * W-14: Simulator Breakpoint Desktop / Tablet / Mobile Kasir
   */
  function renderMobilePreviewView() {
    return `<div class="space-y-4 ons-view-enter">
      <div class="ons-page-header">
        <div>
          <h1 class="text-xl font-extrabold">Simulator Breakpoint PWA Mobile, Tablet &amp; Desktop (W-14)</h1>
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
    const isDemo = API().isDemoMode();
    S().openModal(`<div class="p-6 space-y-3 text-xs">
      <div class="flex justify-between items-center"><h3 class="font-bold text-base">Otorisasi PIN APJ untuk E-Resep ${S().esc(idKlinis)}</h3><button onclick="ONSStore.closeModal()" class="text-xl">&times;</button></div>
      <p style="color:var(--ons-text-soft)">Sesuai Permenkes 73/2016, verifikasi E-Resep wajib menggunakan PIN Apoteker Penanggung Jawab${isDemo ? ' (Demo PIN: 123456)' : ''}.</p>
      <div><label class="font-semibold block mb-1">PIN APJ (6 Digit)</label><input id="erxApprovePin" type="password" maxlength="6" autocomplete="off" class="ons-input font-mono-num" placeholder="${isDemo ? 'Contoh: 123456' : 'Masukkan 6 digit PIN APJ'}"/></div>
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
      cart.channel = 'Resep WA';
      cart.id_member = mem ? mem.id_member : 'UMUM';
      cart.pelanggan_nama = rx.nama_pasien;
      cart.no_wa = rx.no_wa_pasien || (mem && mem.no_hp) || '';
      cart.items = pick.map((o) => {
        const unitSell = Number(mem ? (o.harga_member || o.harga_umum) : o.harga_umum);
        return {
          id_obat: o.id_obat,
          nama_dagang: o.nama_dagang,
          qty: 1,
          satuan: o.satuan_dasar,
          faktor_konversi: 1,
          harga_jual: unitSell,
          aturan_pakai: '',
          unitOptions: [
            { label: o.satuan_dasar, faktor: 1, harga: unitSell },
            { label: o.satuan_sedang || 'Strip', faktor: Number(o.rasio_sedang || 10), harga: unitSell * Number(o.rasio_sedang || 10) },
            { label: o.satuan_besar || 'Box', faktor: Number(o.rasio_besar || 100), harga: Number(o.harga_grosir || unitSell) * Number(o.rasio_besar || 100) }
          ]
        };
      });
    }
    global.toast('Obat dari E-Resep ' + idKlinis + ' dimuat ke Kasir POS!', 'ok');
    global.navigateView('pos');
  };

  function buildStrukEditorSampleData(profObj) {
    const prof = profObj || (S().getStoreProfile ? S().getStoreProfile() : {});
    const kasirRaw = (S().AppState.user && S().AppState.user.nama_lengkap) || prof.nama_pemilik || 'Kasir Apotek';
    const items = strukPreviewExtras
      ? [
          { NAMA: 'Paracetamol Sanmol 500mg', QTY: 10, SATUAN: 'Tab', HARGA: 650, SUBTOTAL: 6500, ATURAN_PAKAI: '3 x 1 Tab sesudah makan (bila demam)' },
          { NAMA: 'Vitamin C 500mg IPI', QTY: 1, SATUAN: 'Btl', HARGA: 8500, SUBTOTAL: 8500, ATURAN_PAKAI: '1 x 1 Tab pagi hari' }
        ]
      : [{ NAMA: 'Paracetamol Sanmol 500mg', QTY: 10, SATUAN: 'Tab', HARGA: 650, SUBTOTAL: 6500, ATURAN_PAKAI: '' }];
    const sub = items.reduce((s, it) => s + Number(it.SUBTOTAL || 0), 0);
    const disc = strukPreviewExtras ? 1000 : 0;
    const tot = Math.max(0, sub - disc);
    const paid = strukPreviewExtras ? 20000 : tot;
    return {
      NAMA_TOKO: (prof.nama_usaha || 'APOTEK ONS FARMA').toUpperCase(),
      ALAMAT_TOKO: [prof.alamat_usaha, prof.kota].filter(Boolean).join(', ') || 'Jl. Kesehatan Raya No. 88',
      SIA_TOKO: prof.no_sia || '449/SIA-DPMPTSP/2025/0088',
      WA_TOKO: prof.wa_usaha || prof.telepon_usaha || '0811-0000-990',
      APJ_NAMA: prof.nama_pemilik || 'apt. Anissa Faradifa R. Is Rumi',
      APJ_SIPA: prof.sipa_pemilik || '19920412/SIPA_35.78/2025/1042',
      LOGO_URL: prof.logo_url || '',
      NOTA: 'INV-PREVIEW-001',
      TANGGAL: new Date().toLocaleDateString('id-ID'),
      KASIR: kasirRaw,
      PELANGGAN: 'Tn. Bambang (Member)',
      METODE: strukPreviewExtras ? 'TUNAI' : 'QRIS',
      CHANNEL: 'Toko Fisik',
      STATUS: 'LUNAS',
      ITEM: items,
      SUBTOTAL: sub,
      DISKON: disc,
      PPN: 0,
      TOTAL: tot,
      DIBAYAR: paid,
      KEMBALI: Math.max(0, paid - tot),
      POIN: Math.floor(tot / 10000),
      CATATAN: 'Konsultasi obat gratis bersama Apoteker.',
      QR_URL: 'https://onsfarma.id/v/PREVIEW'
    };
  }

  function renderStrukPreviewContent(tplText, sampleData, lebarMm) {
    if (!global.StrukEngine) return '';
    const w = Number(lebarMm) === 80 ? 80 : 58;
    if (strukPreviewMode === 'text') {
      const plain = global.StrukEngine.formatPlainText(tplText, sampleData, w);
      return `<pre class="ons-struk-pre">${S().esc(plain)}</pre>`;
    }
    return global.StrukEngine.renderHtml(tplText, sampleData, w);
  }

  global.previewEditedStruk = () => {
    const txt = (document.getElementById('strukTplText') || {}).value || '';
    const w = Number((document.getElementById('strukTplWidth') || {}).value || 58) === 80 ? 80 : 58;
    const box = document.getElementById('strukEditorLivePreview');
    const pill = document.getElementById('strukPreviewWidthPill');
    if (pill) pill.textContent = `${w} mm • ${w === 80 ? '46' : '32'} Kolom`;
    if (box && global.StrukEngine) {
      box.innerHTML = renderStrukPreviewContent(txt, buildStrukEditorSampleData(), w);
    }
  };

  global.setStrukPreviewMode = (mode) => {
    strukPreviewMode = mode === 'text' ? 'text' : 'paper';
    if (document.getElementById('strukTplText')) {
      global.renderActiveView();
    }
  };

  global.toggleStrukPreviewExtras = (checked) => {
    strukPreviewExtras = !!checked;
    global.previewEditedStruk();
  };

  global.selectStrukTemplateIdx = (idx) => {
    strukActiveIdx = Math.max(0, Number(idx || 0));
    global.renderActiveView();
  };

  global.applyStrukPreset = (presetId) => {
    const presets = (global.StrukEngine && global.StrukEngine.TEMPLATE_PRESETS) || [];
    const found = presets.find((p) => p.id === presetId) || presets[0];
    if (!found) return;
    const txtEl = document.getElementById('strukTplText');
    const wEl = document.getElementById('strukTplWidth');
    const nameEl = document.getElementById('strukTplNama');
    const codeEl = document.getElementById('strukTplKode');
    if (txtEl) txtEl.value = found.template_teks;
    if (wEl) wEl.value = String(found.lebar_mm);
    if (nameEl) nameEl.value = found.nama;
    if (codeEl) codeEl.value = found.kode;
    global.previewEditedStruk();
    global.toast('Preset "' + found.label + '" dimuat ke editor (klik Simpan Template ke Sheets untuk menyimpan permanen).', 'info');
  };

  global.resetEditedStrukPreset = () => {
    const w = Number((document.getElementById('strukTplWidth') || {}).value || 58);
    global.applyStrukPreset(w === 80 ? '80_KLINIS' : '58_STANDAR');
  };

  global.insertStrukToken = (tokenOrIdx) => {
    const ta = document.getElementById('strukTplText');
    if (!ta) return;
    const resolved = typeof tokenOrIdx === 'number'
      ? ((STRUK_TOKEN_SNIPPETS[tokenOrIdx] && STRUK_TOKEN_SNIPPETS[tokenOrIdx].token) || '')
      : String(tokenOrIdx || '');
    if (!resolved) return;
    const val = String(ta.value || '');
    const start = typeof ta.selectionStart === 'number' ? ta.selectionStart : val.length;
    const end = typeof ta.selectionEnd === 'number' ? ta.selectionEnd : val.length;
    ta.value = val.slice(0, start) + resolved + val.slice(end);
    if (typeof ta.focus === 'function') ta.focus();
    if (typeof ta.setSelectionRange === 'function') {
      const pos = start + resolved.length;
      ta.setSelectionRange(pos, pos);
    }
    global.previewEditedStruk();
  };

  global.testPrintEditedStruk = () => {
    const txt = (document.getElementById('strukTplText') || {}).value || (global.StrukEngine && global.StrukEngine.DEFAULT_STRUK_TEMPLATE) || '';
    const w = Number((document.getElementById('strukTplWidth') || {}).value || 58) === 80 ? 80 : 58;
    if (!global.StrukEngine || !S().printHtmlZone) return;
    const html = global.StrukEngine.renderHtml(txt, buildStrukEditorSampleData(), w);
    document.body.classList.add('printing-thermal');
    S().printHtmlZone(html, { widthMm: w });
    setTimeout(() => document.body.classList.remove('printing-thermal'), 900);
  };

  global.downloadEditedStrukPng = () => {
    const txt = (document.getElementById('strukTplText') || {}).value || (global.StrukEngine && global.StrukEngine.DEFAULT_STRUK_TEMPLATE) || '';
    const w = Number((document.getElementById('strukTplWidth') || {}).value || 58) === 80 ? 80 : 58;
    if (global.StrukEngine) global.StrukEngine.downloadStrukPng(txt, buildStrukEditorSampleData(), w);
  };

  global.saveStrukTemplateServer = async () => {
    try {
      const payload = {
        kode: (document.getElementById('strukTplKode') || {}).value || 'STRUK_POS_58MM',
        nama: (document.getElementById('strukTplNama') || {}).value || 'Struk Kasir Standar 58mm',
        lebar_mm: Number((document.getElementById('strukTplWidth') || {}).value || 58),
        template_teks: (document.getElementById('strukTplText') || {}).value || ''
      };
      const res = await API().callApi('struk.saveTemplate', payload, { isWrite: true });
      if (res && res.item) {
        const list = Array.isArray(S().AppState.strukTemplates) ? S().AppState.strukTemplates.slice() : [];
        const existIdx = list.findIndex((t) => t.kode === res.item.kode);
        if (existIdx >= 0) {
          list[existIdx] = res.item;
          strukActiveIdx = existIdx;
        } else {
          list.unshift(res.item);
          strukActiveIdx = 0;
        }
        S().AppState.strukTemplates = list;
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
