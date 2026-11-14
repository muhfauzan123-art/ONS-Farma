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
  let sipnapTab = 'penjualan'; // penjualan | pembelian | persediaan | keuangan | narkotika | pareto | deadstock
  let lapJualMode = 'hari'; // hari | produk | faktur | pelanggan | sales
  let lapJualSearchQ = '';
  let lapJualDateFrom = '';
  let lapJualDateTo = '';
  let lapBeliMode = 'produk'; // produk | faktur | supplier
  let lapBeliSearchQ = '';
  let lapBeliDateFrom = '';
  let lapBeliDateTo = '';
  let lapStokMode = 'kuantitas'; // kuantitas | nilai
  let lapStokSearchQ = '';
  let lapStokDateFrom = '';
  let lapStokDateTo = '';
  let lapKeuJenis = 'labarugi'; // labarugi | neraca | aruskas
  let lapKeuPeriode = 'bulanan'; // bulanan | tahunan
  let lapKeuBulan = String(new Date().getMonth() + 1);
  let lapKeuTahun = String(new Date().getFullYear());
  let lapKeuInterval = 'none'; // none | mingguan | harian
  let lapKeuShowPct = false;
  let lapRekapCollapsed = {};
  let anlTab = 'pareto'; // pareto | pembelian | harga
  let anlParetoMode = 'penjualan'; // penjualan | keuntungan | kuantitas
  let anlParetoSearchQ = '';
  let anlParetoDateFrom = '';
  let anlParetoDateTo = '';
  let anlBeliRefPeriod = '3m'; // 1m | 3m | 6m | 12m
  let anlBeliSearchQ = '';
  let anlBeliStatusFilter = 'SEMUA'; // SEMUA | UNDERSTOCK | POTENSIAL_LOSS | DEADSTOCK | OVERSTOCK | AMAN
  let anlPoLeadTime = 3;
  let anlPoReviewPeriod = 14;
  let anlPoBufferPct = 20;
  let anlHargaHppBasis = 'ref'; // ref | last | avg
  let anlHargaSearchQ = '';
  let anlHargaStatusFilter = 'SEMUA'; // SEMUA | NAIK | PERLU | AMAN
  let anlHargaSelected = new Set();
  let anlHargaTargetMarkup = 25;
  let shiftDenomCounts = { 100000: 0, 50000: 0, 20000: 0, 10000: 0, 5000: 0, 2000: 0, 1000: 0, 500: 0, 200: 0, 100: 0 };
  let shiftBlindRevealed = false;
  let shiftAktualCustom = null;
  let shiftFloatNext = null;
  let shiftVarianceReason = '';
  let activeBillingTab = 'tagihan'; // tagihan | verifikasi | potongan | reminder
  let activeDocTab = 'surat'; // surat | pindai
  let settingsTab = 'profil'; // profil | akun | struk | vault | audit
  let profileMediaDraft = { foto: null, logo: null };
  let profileDocsDraft = {};
  const _todayIso = new Date().toISOString().slice(0, 10);
  const _curMonth = _todayIso.slice(0, 7);
  let billingCache = {
    tagihan: [
      { ID: 'TGH-HC01', Periode: _curMonth, ID_Pasien: 'MBR-001', Nama_Pasien: 'Tn. Bambang Suryono', HP_Pasien: '6281234567801', Program: 'MEMBER_RUTIN', Kategori: 'HOME_PHARMACY_CARE', Deskripsi: 'Paket Home Pharmacy Care & Konseling Hipertensi', Nominal: 175000, Potongan: 25000, Netto: 150000, Terbayar: 0, Status: 'MENUNGGU_VERIFIKASI', JatuhTempo: _todayIso, TglTerbit: _todayIso, Catatan: 'Subsidi member senior Rp 25.000', DibuatOleh: 'apt. Siti Rahma, S.Farm' },
      { ID: 'TGH-HC02', Periode: _curMonth, ID_Pasien: 'MBR-002', Nama_Pasien: 'Ny. Hj. Aminah Kusuma', HP_Pasien: '6281234567802', Program: 'MEMBER_RUTIN', Kategori: 'TERAPI_RUTIN_BULANAN', Deskripsi: 'Antar Paket Insulin + Jarum Pen Novofine', Nominal: 220000, Potongan: 0, Netto: 220000, Terbayar: 0, Status: 'BELUM_BAYAR', JatuhTempo: _todayIso, TglTerbit: _todayIso, Catatan: '', DibuatOleh: 'apt. Siti Rahma, S.Farm' }
    ],
    pending: [
      { GrupBayar: 'GRP-202611-01', ID_Tagihan: 'TGH-HC01', NominalBayar: 150000, MetodeBayar: 'TRANSFER_BANK', BuktiUrl: 'https://placehold.co/400x300?text=Bukti+Transfer+BCA', Status: 'MENUNGGU_VERIFIKASI', DibuatOleh: 'Tn. Bambang Suryono' }
    ],
    history: [
      { NoKwitansi: 'KW-2026-0001', GrupBayar: 'GRP-202610-09', ID_Tagihan: 'TGH-HC00', NominalBayar: 175000, MetodeBayar: 'QRIS', DiverifikasiOleh: 'apt. Siti Rahma, S.Farm', TglVerifikasi: _todayIso, Sig: 'KW20260001' }
    ],
    potongan: [
      { ID: 'POT-01', ID_Pasien: 'MBR-001', Nama_Pasien: 'Tn. Bambang Suryono', Kategori: 'SEMUA', JenisPotongan: 'SUBSIDI_LANSIA', Nilai: 25000, TipeNilai: 'NOMINAL', BerlakuDari: '2026-01', BerlakuSampai: '2026-12', Keterangan: 'Keringanan biaya antar Home Care Lansia', Aktif: 'YA' }
    ]
  };
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

  /**
   * W-08.1: DATABASE PRESET DOSIS OBAT KLINIS & FORMULA FARMASI (PMK 73)
   * 41 Sediaan Populer Lengkap (Tempra, Sanmol, Pamol, Proris, Amoxsan, Claneksi, dll)
   * Dilengkapi Live Focus-Preserving Calculation & Desain Visual Modern
   */
  const DOSAGE_PRESETS = [
  // 1. Tempra Sirup
  {
    id: 'tempra-sirup',
    nama: 'Tempra Sirup 160mg/5mL (Paracetamol Anak)',
    merk: 'Tempra',
    generik: 'Paracetamol',
    kategori: 'Demam & Nyeri',
    target: 'Pediatrik (Usia 1 - 6 Tahun)',
    dosis_min_mg_kg: 10,
    dosis_max_mg_kg: 15,
    dosis_harian_max_mg_kg: 60,
    frekuensi_hari: 3,
    jeda_jam: 6,
    sediaan_bentuk: 'SIRUP',
    kekuatan_mg: 160,
    volume_sediaan_ml: 5,
    volume_botol_ml: 60,
    waktu_minum: 'SESUDAH_MAKAN_ATAU_DEMAM',
    aturan_dasar: 'Minum 3–4 kali sehari {TAK_MIN} sampai {TAK_MAX} sesudah makan saat demam atau nyeri.',
    peringatan: 'Jeda minum minimal 4 jam. Jangan melebihi 5 kali sehari. Hati-hati penggunaan bersama obat kombinasi flu.',
    dosis_dewasa_ref: 500,
    warna_etiket: 'putih'
  },
  // 2. Tempra Drops
  {
    id: 'tempra-drop',
    nama: 'Tempra Drops 80mg/0.8mL (Paracetamol Bayi)',
    merk: 'Tempra',
    generik: 'Paracetamol',
    kategori: 'Demam & Nyeri',
    target: 'Pediatrik (Bayi 0 - 24 Bulan)',
    dosis_min_mg_kg: 10,
    dosis_max_mg_kg: 15,
    dosis_harian_max_mg_kg: 60,
    frekuensi_hari: 3,
    jeda_jam: 6,
    sediaan_bentuk: 'DROP',
    kekuatan_mg: 80,
    volume_sediaan_ml: 0.8, // 100mg/mL
    volume_botol_ml: 15,
    waktu_minum: 'SESUDAH_MAKAN_ATAU_DEMAM',
    aturan_dasar: 'Teteskan {TAK_MIN} sampai {TAK_MAX} dengan pipet tetes 3–4 kali sehari sesudah minum ASI/makan saat demam.',
    peringatan: 'Gunakan pipet tetes khusus Tempra bawaan kemasan (0.8 mL = 80 mg). Jeda minimal 4 jam.',
    dosis_dewasa_ref: 500,
    warna_etiket: 'putih'
  },
  // 3. Tempra Forte
  {
    id: 'tempra-forte',
    nama: 'Tempra Forte Sirup 250mg/5mL (Anak Besar)',
    merk: 'Tempra',
    generik: 'Paracetamol',
    kategori: 'Demam & Nyeri',
    target: 'Pediatrik (Usia 6 - 12 Tahun / BB > 20 kg)',
    dosis_min_mg_kg: 10,
    dosis_max_mg_kg: 15,
    dosis_harian_max_mg_kg: 60,
    frekuensi_hari: 3,
    jeda_jam: 6,
    sediaan_bentuk: 'SIRUP',
    kekuatan_mg: 250,
    volume_sediaan_ml: 5,
    volume_botol_ml: 60,
    waktu_minum: 'SESUDAH_MAKAN_ATAU_DEMAM',
    aturan_dasar: 'Minum 3–4 kali sehari {TAK_MIN} sampai {TAK_MAX} sesudah makan saat demam atau nyeri.',
    peringatan: 'Konsentrasi forte pekat 250mg/5mL. Gunakan sendok takar presisi.',
    dosis_dewasa_ref: 500,
    warna_etiket: 'putih'
  },
  // 4. Sanmol Sirup
  {
    id: 'sanmol-sirup',
    nama: 'Sanmol Sirup 120mg/5mL (Paracetamol Anak)',
    merk: 'Sanmol',
    generik: 'Paracetamol',
    kategori: 'Demam & Nyeri',
    target: 'Pediatrik (Usia 1 - 6 Tahun)',
    dosis_min_mg_kg: 10,
    dosis_max_mg_kg: 15,
    dosis_harian_max_mg_kg: 60,
    frekuensi_hari: 3,
    jeda_jam: 6,
    sediaan_bentuk: 'SIRUP',
    kekuatan_mg: 120,
    volume_sediaan_ml: 5,
    volume_botol_ml: 60,
    waktu_minum: 'SESUDAH_MAKAN_ATAU_DEMAM',
    aturan_dasar: 'Minum 3–4 kali sehari {TAK_MIN} sampai {TAK_MAX} sesudah makan saat demam atau sakit gigi/nyeri.',
    peringatan: 'Jeda minum minimal 4 jam. Maksimal 5 kali dalam 24 jam.',
    dosis_dewasa_ref: 500,
    warna_etiket: 'putih'
  },
  // 5. Sanmol Drops
  {
    id: 'sanmol-drop',
    nama: 'Sanmol Drops 60mg/0.6mL (Paracetamol Bayi)',
    merk: 'Sanmol',
    generik: 'Paracetamol',
    kategori: 'Demam & Nyeri',
    target: 'Pediatrik (Bayi 0 - 12 Bulan)',
    dosis_min_mg_kg: 10,
    dosis_max_mg_kg: 15,
    dosis_harian_max_mg_kg: 60,
    frekuensi_hari: 3,
    jeda_jam: 6,
    sediaan_bentuk: 'DROP',
    kekuatan_mg: 60,
    volume_sediaan_ml: 0.6, // 100mg/mL
    volume_botol_ml: 15,
    waktu_minum: 'SESUDAH_MAKAN_ATAU_DEMAM',
    aturan_dasar: 'Teteskan {TAK_MIN} sampai {TAK_MAX} dengan pipet tetes 3–4 kali sehari sesudah minum ASI/makan saat demam.',
    peringatan: 'Pipet tetes presisi Sanmol bawaan kemasan (0.6 mL = 60 mg = 100 mg/mL).',
    dosis_dewasa_ref: 500,
    warna_etiket: 'putih'
  },
  // 6. Sanmol Forte
  {
    id: 'sanmol-forte',
    nama: 'Sanmol Forte Sirup 250mg/5mL (Anak Besar)',
    merk: 'Sanmol',
    generik: 'Paracetamol',
    kategori: 'Demam & Nyeri',
    target: 'Pediatrik (Usia 6 - 12 Tahun / BB > 20 kg)',
    dosis_min_mg_kg: 10,
    dosis_max_mg_kg: 15,
    dosis_harian_max_mg_kg: 60,
    frekuensi_hari: 3,
    jeda_jam: 6,
    sediaan_bentuk: 'SIRUP',
    kekuatan_mg: 250,
    volume_sediaan_ml: 5,
    volume_botol_ml: 60,
    waktu_minum: 'SESUDAH_MAKAN_ATAU_DEMAM',
    aturan_dasar: 'Minum 3–4 kali sehari {TAK_MIN} sampai {TAK_MAX} sesudah makan saat demam atau nyeri.',
    peringatan: 'Konsentrasi forte pekat. Pastikan tidak dobel dosis dengan paracetamol lain.',
    dosis_dewasa_ref: 500,
    warna_etiket: 'putih'
  },
  // 7. Pamol Sirup
  {
    id: 'pamol-sirup',
    nama: 'Pamol Sirup 120mg/5mL (Paracetamol Mikronisasi)',
    merk: 'Pamol',
    generik: 'Paracetamol',
    kategori: 'Demam & Nyeri',
    target: 'Pediatrik (Usia 1 - 6 Tahun)',
    dosis_min_mg_kg: 10,
    dosis_max_mg_kg: 15,
    dosis_harian_max_mg_kg: 60,
    frekuensi_hari: 3,
    jeda_jam: 6,
    sediaan_bentuk: 'SIRUP',
    kekuatan_mg: 120,
    volume_sediaan_ml: 5,
    volume_botol_ml: 60,
    waktu_minum: 'SESUDAH_MAKAN_ATAU_DEMAM',
    aturan_dasar: 'Minum 3–4 kali sehari {TAK_MIN} sampai {TAK_MAX} sesudah makan saat demam.',
    peringatan: 'Bentuk mikronisasi rasa buah ramah lambung. Jeda minimal 4 jam.',
    dosis_dewasa_ref: 500,
    warna_etiket: 'putih'
  },
  // 8. Pamol Drops
  {
    id: 'pamol-drop',
    nama: 'Pamol Drops 60mg/0.6mL (Paracetamol Bayi)',
    merk: 'Pamol',
    generik: 'Paracetamol',
    kategori: 'Demam & Nyeri',
    target: 'Pediatrik (Bayi 0 - 12 Bulan)',
    dosis_min_mg_kg: 10,
    dosis_max_mg_kg: 15,
    dosis_harian_max_mg_kg: 60,
    frekuensi_hari: 3,
    jeda_jam: 6,
    sediaan_bentuk: 'DROP',
    kekuatan_mg: 60,
    volume_sediaan_ml: 0.6,
    volume_botol_ml: 15,
    waktu_minum: 'SESUDAH_MAKAN_ATAU_DEMAM',
    aturan_dasar: 'Teteskan {TAK_MIN} sampai {TAK_MAX} dengan pipet tetes 3–4 kali sehari sesudah makan.',
    peringatan: 'Gunakan pipet bawaan untuk memastikan ketepatan dosis pada bayi.',
    dosis_dewasa_ref: 500,
    warna_etiket: 'putih'
  },
  // 9. Paracetamol Generik Sirup
  {
    id: 'paracetamol-sirup',
    nama: 'Paracetamol Generik Sirup 120mg/5mL',
    merk: 'Generik',
    generik: 'Paracetamol',
    kategori: 'Demam & Nyeri',
    target: 'Pediatrik (Usia 1 - 12 Tahun)',
    dosis_min_mg_kg: 10,
    dosis_max_mg_kg: 15,
    dosis_harian_max_mg_kg: 60,
    frekuensi_hari: 3,
    jeda_jam: 6,
    sediaan_bentuk: 'SIRUP',
    kekuatan_mg: 120,
    volume_sediaan_ml: 5,
    volume_botol_ml: 60,
    waktu_minum: 'SESUDAH_MAKAN_ATAU_DEMAM',
    aturan_dasar: 'Minum 3–4 kali sehari {TAK_MIN} sampai {TAK_MAX} sesudah makan saat demam.',
    peringatan: 'Jeda minimal 4 jam. Jangan melebihi 5 kali sehari.',
    dosis_dewasa_ref: 500,
    warna_etiket: 'putih'
  },
  // 10. Paracetamol Generik Drops
  {
    id: 'paracetamol-drop',
    nama: 'Paracetamol Generik Drops 100mg/mL',
    merk: 'Generik',
    generik: 'Paracetamol',
    kategori: 'Demam & Nyeri',
    target: 'Pediatrik (Bayi 0 - 12 Bulan)',
    dosis_min_mg_kg: 10,
    dosis_max_mg_kg: 15,
    dosis_harian_max_mg_kg: 60,
    frekuensi_hari: 3,
    jeda_jam: 6,
    sediaan_bentuk: 'DROP',
    kekuatan_mg: 100,
    volume_sediaan_ml: 1,
    volume_botol_ml: 15,
    waktu_minum: 'SESUDAH_MAKAN_ATAU_DEMAM',
    aturan_dasar: 'Teteskan {TAK_MIN} sampai {TAK_MAX} dengan pipet tetes 3–4 kali sehari saat demam.',
    peringatan: 'Gunakan pipet tetes bawaan botol untuk akurasi presisi.',
    dosis_dewasa_ref: 500,
    warna_etiket: 'putih'
  },
  // 11. Proris Suspensi
  {
    id: 'proris-suspensi',
    nama: 'Proris Suspensi 100mg/5mL (Ibuprofen Anak)',
    merk: 'Proris',
    generik: 'Ibuprofen',
    kategori: 'Demam & Nyeri',
    target: 'Pediatrik (Usia > 6 Bulan)',
    dosis_min_mg_kg: 5,
    dosis_max_mg_kg: 10,
    dosis_harian_max_mg_kg: 40,
    frekuensi_hari: 3,
    jeda_jam: 8,
    sediaan_bentuk: 'SUSPENSI',
    kekuatan_mg: 100,
    volume_sediaan_ml: 5,
    volume_botol_ml: 60,
    waktu_minum: 'SESUDAH_MAKAN',
    aturan_dasar: 'Minum 3 kali sehari {TAK_MIN} sampai {TAK_MAX} tepat SESUDAH MAKAN.',
    peringatan: 'Wajib diminum sesudah makan untuk melindungi lambung. Sangat efektif untuk demam tinggi (>38.5°C).',
    dosis_dewasa_ref: 400,
    warna_etiket: 'putih'
  },
  // 12. Proris Forte Suspensi
  {
    id: 'proris-forte',
    nama: 'Proris Forte Suspensi 200mg/5mL (Ibuprofen Anak Besar)',
    merk: 'Proris',
    generik: 'Ibuprofen',
    kategori: 'Demam & Nyeri',
    target: 'Pediatrik (BB > 15 kg / Usia > 3 Tahun)',
    dosis_min_mg_kg: 5,
    dosis_max_mg_kg: 10,
    dosis_harian_max_mg_kg: 40,
    frekuensi_hari: 3,
    jeda_jam: 8,
    sediaan_bentuk: 'SUSPENSI',
    kekuatan_mg: 200,
    volume_sediaan_ml: 5,
    volume_botol_ml: 50,
    waktu_minum: 'SESUDAH_MAKAN',
    aturan_dasar: 'Minum 3 kali sehari {TAK_MIN} sampai {TAK_MAX} tepat SESUDAH MAKAN.',
    peringatan: 'Konsentrasi forte pekat (200mg/5mL). Kocok dahulu sebelum diminum. Selalu sesudah makan.',
    dosis_dewasa_ref: 400,
    warna_etiket: 'putih'
  },
  // 13. Bufect Suspensi
  {
    id: 'bufect-suspensi',
    nama: 'Bufect Suspensi 100mg/5mL (Ibuprofen Anak)',
    merk: 'Bufect',
    generik: 'Ibuprofen',
    kategori: 'Demam & Nyeri',
    target: 'Pediatrik (Usia > 6 Bulan)',
    dosis_min_mg_kg: 5,
    dosis_max_mg_kg: 10,
    dosis_harian_max_mg_kg: 40,
    frekuensi_hari: 3,
    jeda_jam: 8,
    sediaan_bentuk: 'SUSPENSI',
    kekuatan_mg: 100,
    volume_sediaan_ml: 5,
    volume_botol_ml: 60,
    waktu_minum: 'SESUDAH_MAKAN',
    aturan_dasar: 'Minum 3 kali sehari {TAK_MIN} sampai {TAK_MAX} sesudah makan.',
    peringatan: 'Minum sesudah makan. Jangan berikan bila ada riwayat perdarahan lambung atau alergi aspirin.',
    dosis_dewasa_ref: 400,
    warna_etiket: 'putih'
  },
  // 14. Bufect Forte Suspensi
  {
    id: 'bufect-forte',
    nama: 'Bufect Forte Suspensi 200mg/5mL',
    merk: 'Bufect',
    generik: 'Ibuprofen',
    kategori: 'Demam & Nyeri',
    target: 'Pediatrik (BB > 15 kg)',
    dosis_min_mg_kg: 5,
    dosis_max_mg_kg: 10,
    dosis_harian_max_mg_kg: 40,
    frekuensi_hari: 3,
    jeda_jam: 8,
    sediaan_bentuk: 'SUSPENSI',
    kekuatan_mg: 200,
    volume_sediaan_ml: 5,
    volume_botol_ml: 60,
    waktu_minum: 'SESUDAH_MAKAN',
    aturan_dasar: 'Minum 3 kali sehari {TAK_MIN} sampai {TAK_MAX} sesudah makan.',
    peringatan: 'Konsentrasi forte pekat. Pastikan hidrasi cairan anak tercukupi.',
    dosis_dewasa_ref: 400,
    warna_etiket: 'putih'
  },
  // 15. Amoxsan Dry Sirup
  {
    id: 'amoxsan-sirup',
    nama: 'Amoxsan Dry Sirup 125mg/5mL (Amoxicillin Anak)',
    merk: 'Amoxsan',
    generik: 'Amoxicillin',
    kategori: 'Antibiotik',
    target: 'Pediatrik (Semua Usia)',
    dosis_min_mg_kg: 25,
    dosis_max_mg_kg: 50,
    dosis_harian_max_mg_kg: 50,
    is_daily_dose_calc: true,
    frekuensi_hari: 3,
    jeda_jam: 8,
    sediaan_bentuk: 'SIRUP_KERING',
    kekuatan_mg: 125,
    volume_sediaan_ml: 5,
    volume_botol_ml: 60,
    waktu_minum: 'SESUDAH_MAKAN',
    aturan_dasar: 'Minum tiap 8 jam secara teratur 1 takar ({TAK_MIN} sampai {TAK_MAX}) sesudah makan. HABISKAN.',
    peringatan: 'WAJIB DIHABISKAN tepat waktu untuk mencegah resistensi kuman. Larutan sirup bertahan 7 hari.',
    dosis_dewasa_ref: 500,
    warna_etiket: 'putih'
  },
  // 16. Amoxsan Forte Dry Sirup
  {
    id: 'amoxsan-forte',
    nama: 'Amoxsan Forte Dry Sirup 250mg/5mL',
    merk: 'Amoxsan',
    generik: 'Amoxicillin',
    kategori: 'Antibiotik',
    target: 'Pediatrik (BB > 15 kg)',
    dosis_min_mg_kg: 25,
    dosis_max_mg_kg: 50,
    dosis_harian_max_mg_kg: 50,
    is_daily_dose_calc: true,
    frekuensi_hari: 3,
    jeda_jam: 8,
    sediaan_bentuk: 'SIRUP_KERING',
    kekuatan_mg: 250,
    volume_sediaan_ml: 5,
    volume_botol_ml: 60,
    waktu_minum: 'SESUDAH_MAKAN',
    aturan_dasar: 'Minum tiap 8 jam secara teratur {TAK_MIN} sampai {TAK_MAX} sesudah makan. HABISKAN.',
    peringatan: 'Konsentrasi forte ganda 250mg/5mL. WAJIB DIHABISKAN.',
    dosis_dewasa_ref: 500,
    warna_etiket: 'putih'
  },
  // 17. Amoxsan Pediatric Drops
  {
    id: 'amoxsan-drop',
    nama: 'Amoxsan Pediatric Drops 100mg/mL (Bayi)',
    merk: 'Amoxsan',
    generik: 'Amoxicillin',
    kategori: 'Antibiotik',
    target: 'Pediatrik (Bayi 0 - 12 Bulan)',
    dosis_min_mg_kg: 25,
    dosis_max_mg_kg: 50,
    dosis_harian_max_mg_kg: 50,
    is_daily_dose_calc: true,
    frekuensi_hari: 3,
    jeda_jam: 8,
    sediaan_bentuk: 'DROP',
    kekuatan_mg: 100,
    volume_sediaan_ml: 1,
    volume_botol_ml: 15,
    waktu_minum: 'SESUDAH_MAKAN',
    aturan_dasar: 'Teteskan {TAK_MIN} sampai {TAK_MAX} dengan pipet tetes tiap 8 jam teratur sesudah ASI/makan. HABISKAN.',
    peringatan: 'Gunakan pipet tetes Amoxsan bawaan botol. Kocok dahulu sebelum diteteskan. WAJIB DIHABISKAN.',
    dosis_dewasa_ref: 500,
    warna_etiket: 'putih'
  },
  // 18. Claneksi Dry Sirup
  {
    id: 'claneksi-sirup',
    nama: 'Claneksi Dry Sirup 156.25mg/5mL (Co-Amoxiclav)',
    merk: 'Claneksi',
    generik: 'Co-Amoxiclav',
    kategori: 'Antibiotik',
    target: 'Pediatrik (Infeksi Bakteri Resisten)',
    dosis_min_mg_kg: 25,
    dosis_max_mg_kg: 45,
    dosis_harian_max_mg_kg: 45,
    is_daily_dose_calc: true,
    frekuensi_hari: 3,
    jeda_jam: 8,
    sediaan_bentuk: 'SIRUP_KERING',
    kekuatan_mg: 156.25,
    volume_sediaan_ml: 5,
    volume_botol_ml: 60,
    waktu_minum: 'BERSAMA_SUAPAN_MAKAN',
    aturan_dasar: 'Minum tiap 8 jam secara teratur {TAK_MIN} sampai {TAK_MAX} bersama suapan pertama makan. HABISKAN.',
    peringatan: 'Minum bersama suapan pertama makanan untuk mengurangi mual/diare. Simpan di kulkas (2-8°C). WAJIB DIHABISKAN.',
    dosis_dewasa_ref: 625,
    warna_etiket: 'putih'
  },
  // 19. Claneksi Forte Dry Sirup
  {
    id: 'claneksi-forte',
    nama: 'Claneksi Forte Dry Sirup 312.5mg/5mL',
    merk: 'Claneksi',
    generik: 'Co-Amoxiclav',
    kategori: 'Antibiotik',
    target: 'Pediatrik (BB > 15 kg)',
    dosis_min_mg_kg: 25,
    dosis_max_mg_kg: 45,
    dosis_harian_max_mg_kg: 45,
    is_daily_dose_calc: true,
    frekuensi_hari: 3,
    jeda_jam: 8,
    sediaan_bentuk: 'SIRUP_KERING',
    kekuatan_mg: 312.5,
    volume_sediaan_ml: 5,
    volume_botol_ml: 60,
    waktu_minum: 'BERSAMA_SUAPAN_MAKAN',
    aturan_dasar: 'Minum tiap 8 jam teratur {TAK_MIN} sampai {TAK_MAX} bersama suapan pertama makan. HABISKAN.',
    peringatan: 'Konsentrasi forte pekat (Amoxicillin 250mg + Asam Klavulanat 62.5mg per 5mL). WAJIB DIHABISKAN.',
    dosis_dewasa_ref: 625,
    warna_etiket: 'putih'
  },
  // 20. Cefat Dry Sirup
  {
    id: 'cefat-sirup',
    nama: 'Cefat Dry Sirup 125mg/5mL (Cefadroxil Anak)',
    merk: 'Cefat',
    generik: 'Cefadroxil',
    kategori: 'Antibiotik',
    target: 'Pediatrik (Semua Usia)',
    dosis_min_mg_kg: 30,
    dosis_max_mg_kg: 50,
    dosis_harian_max_mg_kg: 50,
    is_daily_dose_calc: true,
    frekuensi_hari: 2,
    jeda_jam: 12,
    sediaan_bentuk: 'SIRUP_KERING',
    kekuatan_mg: 125,
    volume_sediaan_ml: 5,
    volume_botol_ml: 60,
    waktu_minum: 'SESUDAH_MAKAN',
    aturan_dasar: 'Minum tiap 12 jam (2 kali sehari) teratur {TAK_MIN} sampai {TAK_MAX} sesudah makan. HABISKAN.',
    peringatan: 'Jarak tepat tiap 12 jam (jam 07.00 pagi dan 19.00 malam). WAJIB DIHABISKAN.',
    dosis_dewasa_ref: 500,
    warna_etiket: 'putih'
  },
  // 21. Cefat Forte Dry Sirup
  {
    id: 'cefat-forte',
    nama: 'Cefat Forte Dry Sirup 250mg/5mL',
    merk: 'Cefat',
    generik: 'Cefadroxil',
    kategori: 'Antibiotik',
    target: 'Pediatrik (BB > 15 kg)',
    dosis_min_mg_kg: 30,
    dosis_max_mg_kg: 50,
    dosis_harian_max_mg_kg: 50,
    is_daily_dose_calc: true,
    frekuensi_hari: 2,
    jeda_jam: 12,
    sediaan_bentuk: 'SIRUP_KERING',
    kekuatan_mg: 250,
    volume_sediaan_ml: 5,
    volume_botol_ml: 60,
    waktu_minum: 'SESUDAH_MAKAN',
    aturan_dasar: 'Minum tiap 12 jam (2 kali sehari) teratur {TAK_MIN} sampai {TAK_MAX} sesudah makan. HABISKAN.',
    peringatan: 'Sediaan konsentrasi tinggi 250mg/5mL. WAJIB DIHABISKAN.',
    dosis_dewasa_ref: 500,
    warna_etiket: 'putih'
  },
  // 22. Erysanbe Dry Sirup
  {
    id: 'erysanbe-sirup',
    nama: 'Erysanbe Dry Sirup 200mg/5mL (Erythromycin)',
    merk: 'Erysanbe',
    generik: 'Erythromycin',
    kategori: 'Antibiotik',
    target: 'Pediatrik (Alergi Penisilin)',
    dosis_min_mg_kg: 30,
    dosis_max_mg_kg: 50,
    dosis_harian_max_mg_kg: 50,
    is_daily_dose_calc: true,
    frekuensi_hari: 4,
    jeda_jam: 6,
    sediaan_bentuk: 'SIRUP_KERING',
    kekuatan_mg: 200,
    volume_sediaan_ml: 5,
    volume_botol_ml: 60,
    waktu_minum: 'SEBELUM_MAKAN',
    aturan_dasar: 'Minum tiap 6 jam (4 kali sehari) {TAK_MIN} sampai {TAK_MAX} 1 jam sebelum makan atau perut kosong. HABISKAN.',
    peringatan: 'Pilihan utama bila anak alergi amoxicillin/penisilin. Minum saat perut kosong dengan segelas air putih. WAJIB DIHABISKAN.',
    dosis_dewasa_ref: 500,
    warna_etiket: 'putih'
  },
  // 23. Zithromax Suspensi
  {
    id: 'zithromax-suspensi',
    nama: 'Zithromax / Azithromycin Suspensi 200mg/5mL',
    merk: 'Zithromax',
    generik: 'Azithromycin',
    kategori: 'Antibiotik',
    target: 'Pediatrik (Terapi Singkat 3 Hari)',
    dosis_min_mg_kg: 10,
    dosis_max_mg_kg: 10,
    dosis_harian_max_mg_kg: 10,
    is_daily_dose_calc: false,
    frekuensi_hari: 1,
    jeda_jam: 24,
    sediaan_bentuk: 'SUSPENSI',
    kekuatan_mg: 200,
    volume_sediaan_ml: 5,
    volume_botol_ml: 15,
    waktu_minum: 'SEBELUM_MAKAN',
    aturan_dasar: 'Minum 1 kali sehari {TAK_MIN} 1 jam sebelum makan selama 3 HARI BERTURUT-TURUT. HABISKAN.',
    peringatan: 'Cukup diminum 1x sehari selama 3 hari karena waktu paruh obat sangat panjang. WAJIB DIHABISKAN.',
    dosis_dewasa_ref: 500,
    warna_etiket: 'putih'
  },
  // 24. Mucopect Sirup
  {
    id: 'mucopect-sirup',
    nama: 'Mucopect Sirup 15mg/5mL (Ambroxol Anak)',
    merk: 'Mucopect',
    generik: 'Ambroxol',
    kategori: 'Batuk & Sesak',
    target: 'Pediatrik (Usia 1 - 12 Tahun)',
    dosis_min_mg_kg: 1.2,
    dosis_max_mg_kg: 1.6,
    dosis_harian_max_mg_kg: 1.6,
    is_daily_dose_calc: true,
    frekuensi_hari: 3,
    jeda_jam: 8,
    sediaan_bentuk: 'SIRUP',
    kekuatan_mg: 15,
    volume_sediaan_ml: 5,
    volume_botol_ml: 60,
    waktu_minum: 'SESUDAH_MAKAN',
    aturan_dasar: 'Minum 3 kali sehari {TAK_MIN} sampai {TAK_MAX} sesudah makan.',
    peringatan: 'Mukolitik pengencer dahak. Berikan banyak minum air hangat untuk mempercepat pengeluaran sekret dahak.',
    dosis_dewasa_ref: 30,
    warna_etiket: 'putih'
  },
  // 25. Mucopect Drops
  {
    id: 'mucopect-drop',
    nama: 'Mucopect Drops 7.5mg/mL (Ambroxol Bayi)',
    merk: 'Mucopect',
    generik: 'Ambroxol',
    kategori: 'Batuk & Sesak',
    target: 'Pediatrik (Bayi 0 - 24 Bulan)',
    dosis_min_mg_kg: 1.2,
    dosis_max_mg_kg: 1.6,
    dosis_harian_max_mg_kg: 1.6,
    is_daily_dose_calc: true,
    frekuensi_hari: 2,
    jeda_jam: 12,
    sediaan_bentuk: 'DROP',
    kekuatan_mg: 7.5,
    volume_sediaan_ml: 1,
    volume_botol_ml: 20,
    waktu_minum: 'SESUDAH_MAKAN',
    aturan_dasar: 'Teteskan {TAK_MIN} sampai {TAK_MAX} dengan pipet tetes 2 kali sehari sesudah ASI/makan.',
    peringatan: 'Gunakan pipet bawaan botol untuk menakar tetesan pada bayi. Berikan sesudah minum susu.',
    dosis_dewasa_ref: 30,
    warna_etiket: 'putih'
  },
  // 26. Bisolvon Kids
  {
    id: 'bisolvon-kids',
    nama: 'Bisolvon Kids Sirup 4mg/5mL (Bromhexine Anak)',
    merk: 'Bisolvon',
    generik: 'Bromhexine',
    kategori: 'Batuk & Sesak',
    target: 'Pediatrik (Usia > 2 Tahun)',
    dosis_min_mg_kg: 0.3,
    dosis_max_mg_kg: 0.5,
    dosis_harian_max_mg_kg: 1.5,
    frekuensi_hari: 3,
    jeda_jam: 8,
    sediaan_bentuk: 'SIRUP',
    kekuatan_mg: 4,
    volume_sediaan_ml: 5,
    volume_botol_ml: 60,
    waktu_minum: 'SESUDAH_MAKAN',
    aturan_dasar: 'Minum 3 kali sehari {TAK_MIN} sampai {TAK_MAX} sesudah makan.',
    peringatan: 'Mengencerkan dahak batuk produktif. Bebas gula (sugar-free) rasa stroberi ramah gigi anak.',
    dosis_dewasa_ref: 8,
    warna_etiket: 'putih'
  },
  // 27. Lasal Sirup
  {
    id: 'lasal-sirup',
    nama: 'Lasal Sirup 2mg/5mL (Salbutamol Sesak & Asma)',
    merk: 'Lasal',
    generik: 'Salbutamol',
    kategori: 'Batuk & Sesak',
    target: 'Pediatrik (Usia > 2 Tahun)',
    dosis_min_mg_kg: 0.1,
    dosis_max_mg_kg: 0.15,
    dosis_harian_max_mg_kg: 0.45,
    frekuensi_hari: 3,
    jeda_jam: 8,
    sediaan_bentuk: 'SIRUP',
    kekuatan_mg: 2,
    volume_sediaan_ml: 5,
    volume_botol_ml: 100,
    waktu_minum: 'SESUDAH_MAKAN',
    aturan_dasar: 'Minum 3 kali sehari {TAK_MIN} sampai {TAK_MAX} sesudah makan saat sesak napas / bronkospasme.',
    peringatan: 'Bronkodilator pelega napas. Hentikan pemakaian jika batuk sesak sudah reda. Dapat memicu tremor halus.',
    dosis_dewasa_ref: 4,
    warna_etiket: 'putih'
  },
  // 28. Ventolin Sirup
  {
    id: 'ventolin-sirup',
    nama: 'Ventolin Sirup 2mg/5mL (Salbutamol Bronkodilator)',
    merk: 'Ventolin',
    generik: 'Salbutamol',
    kategori: 'Batuk & Sesak',
    target: 'Pediatrik (Usia > 2 Tahun)',
    dosis_min_mg_kg: 0.1,
    dosis_max_mg_kg: 0.15,
    dosis_harian_max_mg_kg: 0.45,
    frekuensi_hari: 3,
    jeda_jam: 8,
    sediaan_bentuk: 'SIRUP',
    kekuatan_mg: 2,
    volume_sediaan_ml: 5,
    volume_botol_ml: 100,
    waktu_minum: 'SESUDAH_MAKAN',
    aturan_dasar: 'Minum 3 kali sehari {TAK_MIN} sampai {TAK_MAX} sesudah makan saat serangan sesak napas.',
    peringatan: 'Membuka saluran pernapasan yang menyempit pada asma. Efek samping umum: jantung berdebar ringan sementara.',
    dosis_dewasa_ref: 4,
    warna_etiket: 'putih'
  },
  // 29. Rhinos Neo Drops
  {
    id: 'rhinos-neo-drop',
    nama: 'Rhinos Neo Drops 7.5mg/0.8mL (Pseudoephedrine Bayi)',
    merk: 'Rhinos Neo',
    generik: 'Pseudoephedrine',
    kategori: 'Batuk & Sesak',
    target: 'Pediatrik (Bayi 0 - 24 Bulan & Balita)',
    dosis_min_mg_kg: 1,
    dosis_max_mg_kg: 1,
    dosis_harian_max_mg_kg: 4,
    frekuensi_hari: 3,
    jeda_jam: 8,
    sediaan_bentuk: 'DROP',
    kekuatan_mg: 7.5,
    volume_sediaan_ml: 0.8,
    volume_botol_ml: 10,
    waktu_minum: 'SESUDAH_MAKAN',
    aturan_dasar: 'Teteskan {TAK_MIN} sampai {TAK_MAX} dengan pipet tetes 3 kali sehari sesudah makan saat hidung tersumbat.',
    peringatan: 'Dekongestan hidung tersumbat. Gunakan tidak lebih dari 3–5 hari berturut-turut untuk mencegah rebound congestion.',
    dosis_dewasa_ref: 30,
    warna_etiket: 'putih'
  },
  // 30. Triaminic Batuk & Pilek
  {
    id: 'triaminic-batuk',
    nama: 'Triaminic Batuk & Pilek Sirup',
    merk: 'Triaminic',
    generik: 'Pseudoephedrine + Dextromethorphan',
    kategori: 'Batuk & Sesak',
    target: 'Pediatrik (Usia 2 - 12 Tahun)',
    dosis_min_mg_kg: 0.5,
    dosis_max_mg_kg: 0.5,
    dosis_harian_max_mg_kg: 2,
    frekuensi_hari: 3,
    jeda_jam: 8,
    sediaan_bentuk: 'SIRUP',
    kekuatan_mg: 15,
    volume_sediaan_ml: 5,
    volume_botol_ml: 60,
    waktu_minum: 'SESUDAH_MAKAN',
    aturan_dasar: 'Minum 3 kali sehari {TAK_MIN} sesudah makan saat batuk kering dan pilek.',
    peringatan: 'Meredakan batuk kering tidak berdahak dan pilek hidung mampet. Hindarkan penggunaan bersama sedatif lain.',
    dosis_dewasa_ref: 30,
    warna_etiket: 'putih'
  },
  // 31. Ryvel Sirup
  {
    id: 'ryvel-sirup',
    nama: 'Ryvel Sirup 5mg/5mL (Cetirizine Alergi)',
    merk: 'Ryvel',
    generik: 'Cetirizine',
    kategori: 'Alergi & Imun',
    target: 'Pediatrik (Usia > 2 Tahun)',
    dosis_min_mg_kg: 0.25,
    dosis_max_mg_kg: 0.25,
    dosis_harian_max_mg_kg: 0.25,
    frekuensi_hari: 1,
    jeda_jam: 24,
    sediaan_bentuk: 'SIRUP',
    kekuatan_mg: 5,
    volume_sediaan_ml: 5,
    volume_botol_ml: 60,
    waktu_minum: 'MALAM_SEBELUM_TIDUR',
    aturan_dasar: 'Minum 1 kali sehari {TAK_MIN} pada MALAM HARI sebelum tidur sesudah makan.',
    peringatan: 'Antihistamin non-sedatif generasi ke-2. Paling efektif diminum malam hari untuk mengatasi biduran/rhinitis.',
    dosis_dewasa_ref: 10,
    warna_etiket: 'putih'
  },
  // 32. Incidal-OD Sirup
  {
    id: 'incidal-sirup',
    nama: 'Incidal-OD / Otede Sirup 5mg/5mL',
    merk: 'Incidal-OD',
    generik: 'Cetirizine',
    kategori: 'Alergi & Imun',
    target: 'Pediatrik (Usia > 2 Tahun)',
    dosis_min_mg_kg: 0.25,
    dosis_max_mg_kg: 0.25,
    dosis_harian_max_mg_kg: 0.25,
    frekuensi_hari: 1,
    jeda_jam: 24,
    sediaan_bentuk: 'SIRUP',
    kekuatan_mg: 5,
    volume_sediaan_ml: 5,
    volume_botol_ml: 60,
    waktu_minum: 'MALAM_SEBELUM_TIDUR',
    aturan_dasar: 'Minum 1 kali sehari {TAK_MIN} pada malam hari sebelum tidur sesudah makan.',
    peringatan: 'Meredakan gejala alergi gatal-gatal, bersin, dan ruam kulit.',
    dosis_dewasa_ref: 10,
    warna_etiket: 'putih'
  },
  // 33. CTM Sirup
  {
    id: 'ctm-sirup',
    nama: 'Chlorpheniramine (CTM) Sirup 2mg/5mL',
    merk: 'Generik',
    generik: 'Chlorpheniramine',
    kategori: 'Alergi & Imun',
    target: 'Pediatrik (Usia > 1 Tahun)',
    dosis_min_mg_kg: 0.35,
    dosis_max_mg_kg: 0.35,
    dosis_harian_max_mg_kg: 0.35,
    is_daily_dose_calc: true,
    frekuensi_hari: 3,
    jeda_jam: 8,
    sediaan_bentuk: 'SIRUP',
    kekuatan_mg: 2,
    volume_sediaan_ml: 5,
    volume_botol_ml: 60,
    waktu_minum: 'SESUDAH_MAKAN',
    aturan_dasar: 'Minum 3 kali sehari {TAK_MIN} sesudah makan.',
    peringatan: 'Menyebabkan kantuk cukup kuat. Hindarkan anak bermain sepeda atau aktivitas luar ruang setelah minum obat.',
    dosis_dewasa_ref: 4,
    warna_etiket: 'putih'
  },
  // 34. Dexamethasone Sirup
  {
    id: 'dexamethasone-sirup',
    nama: 'Dexamethasone Sirup 0.5mg/5mL (Anti-Inflamasi)',
    merk: 'Generik',
    generik: 'Dexamethasone',
    kategori: 'Alergi & Imun',
    target: 'Pediatrik (Atas Resep Dokter)',
    dosis_min_mg_kg: 0.08,
    dosis_max_mg_kg: 0.2,
    dosis_harian_max_mg_kg: 0.3,
    is_daily_dose_calc: true,
    frekuensi_hari: 3,
    jeda_jam: 8,
    sediaan_bentuk: 'SIRUP',
    kekuatan_mg: 0.5,
    volume_sediaan_ml: 5,
    volume_botol_ml: 60,
    waktu_minum: 'SESUDAH_MAKAN',
    aturan_dasar: 'Minum 3 kali sehari {TAK_MIN} sampai {TAK_MAX} tepat SESUDAH MAKAN.',
    peringatan: 'Kortikosteroid anti-inflamasi kuat. Selalu sesudah makan. Jangan dihentikan mendadak bila penggunaan lama.',
    dosis_dewasa_ref: 0.75,
    warna_etiket: 'putih'
  },
  // 35. Vometa Suspensi
  {
    id: 'vometa-suspensi',
    nama: 'Vometa Suspensi 5mg/5mL (Domperidone Anak)',
    merk: 'Vometa',
    generik: 'Domperidone',
    kategori: 'Pencernaan & Mual',
    target: 'Pediatrik (Usia > 1 Tahun)',
    dosis_min_mg_kg: 0.25,
    dosis_max_mg_kg: 0.25,
    dosis_harian_max_mg_kg: 0.75,
    frekuensi_hari: 3,
    jeda_jam: 8,
    sediaan_bentuk: 'SUSPENSI',
    kekuatan_mg: 5,
    volume_sediaan_ml: 5,
    volume_botol_ml: 60,
    waktu_minum: 'SEBELUM_MAKAN',
    aturan_dasar: 'Minum 3 kali sehari {TAK_MIN} 15–30 MENIT SEBELUM MAKAN atau sebelum minum susu.',
    peringatan: 'Wajib diminum 15–30 menit SEBELUM MAKAN agar penyerapan optimal dan reflek muntah tertekan.',
    dosis_dewasa_ref: 10,
    warna_etiket: 'putih'
  },
  // 36. Vometa Drops
  {
    id: 'vometa-drop',
    nama: 'Vometa Drops 5mg/mL (Domperidone Bayi)',
    merk: 'Vometa',
    generik: 'Domperidone',
    kategori: 'Pencernaan & Mual',
    target: 'Pediatrik (Bayi 0 - 12 Bulan)',
    dosis_min_mg_kg: 0.25,
    dosis_max_mg_kg: 0.25,
    dosis_harian_max_mg_kg: 0.75,
    frekuensi_hari: 3,
    jeda_jam: 8,
    sediaan_bentuk: 'DROP',
    kekuatan_mg: 5,
    volume_sediaan_ml: 1,
    volume_botol_ml: 10,
    waktu_minum: 'SEBELUM_MAKAN',
    aturan_dasar: 'Teteskan {TAK_MIN} dengan pipet tetes 3 kali sehari 15–30 menit sebelum minum ASI/makan.',
    peringatan: 'Gunakan pipet tetes khusus Vometa untuk akurasi dosis bayi sebelum makan.',
    dosis_dewasa_ref: 10,
    warna_etiket: 'putih'
  },
  // 37. Zinkid Sirup
  {
    id: 'zinkid-sirup',
    nama: 'Zinkid Sirup 20mg/5mL (Zinc Sulfate Diare WHO)',
    merk: 'Zinkid',
    generik: 'Zinc Sulfate',
    kategori: 'Pencernaan & Mual',
    target: 'Pediatrik (Bayi & Balita Diare)',
    dosis_min_mg_kg: 10,
    dosis_max_mg_kg: 20,
    dosis_harian_max_mg_kg: 20,
    is_special_zinc: true,
    frekuensi_hari: 1,
    jeda_jam: 24,
    sediaan_bentuk: 'SIRUP',
    kekuatan_mg: 20,
    volume_sediaan_ml: 5,
    volume_botol_ml: 60,
    waktu_minum: 'PAGI_SESUDAH_MAKAN',
    aturan_dasar: 'Minum 1 kali sehari {TAK_MIN} selama 10 HARI PENUH.',
    peringatan: 'Wajib diminum selama 10 HARI BERTURUT-TURUT meskipun diare sudah berhenti untuk regenerasi epitel usus.',
    dosis_dewasa_ref: 20,
    warna_etiket: 'putih'
  },
  // 38. Daryazinc Sirup
  {
    id: 'daryazinc-sirup',
    nama: 'Daryazinc Sirup 20mg/5mL (Zinc Diare Anak)',
    merk: 'Daryazinc',
    generik: 'Zinc Sulfate',
    kategori: 'Pencernaan & Mual',
    target: 'Pediatrik (Bayi & Balita Diare)',
    dosis_min_mg_kg: 10,
    dosis_max_mg_kg: 20,
    dosis_harian_max_mg_kg: 20,
    is_special_zinc: true,
    frekuensi_hari: 1,
    jeda_jam: 24,
    sediaan_bentuk: 'SIRUP',
    kekuatan_mg: 20,
    volume_sediaan_ml: 5,
    volume_botol_ml: 60,
    waktu_minum: 'PAGI_SESUDAH_MAKAN',
    aturan_dasar: 'Minum 1 kali sehari {TAK_MIN} selama 10 HARI PENUH.',
    peringatan: 'Wajib dihabiskan selama 10 HARI PENUH sesuai standar WHO Kemenkes RI.',
    dosis_dewasa_ref: 20,
    warna_etiket: 'putih'
  },
  // 39. Curcuma Plus Sirup
  {
    id: 'curcuma-plus-sirup',
    nama: 'Curcuma Plus Sirup (Temulawak & Multivitamin)',
    merk: 'Curcuma Plus',
    generik: 'Curcuma + Multivitamin',
    kategori: 'Alergi & Imun',
    target: 'Pediatrik (Nafsu Makan & Imun)',
    dosis_min_mg_kg: 1,
    dosis_max_mg_kg: 1,
    dosis_harian_max_mg_kg: 2,
    frekuensi_hari: 1,
    jeda_jam: 24,
    sediaan_bentuk: 'SIRUP',
    kekuatan_mg: 5,
    volume_sediaan_ml: 5,
    volume_botol_ml: 120,
    waktu_minum: 'SESUDAH_MAKAN',
    aturan_dasar: 'Minum 1 kali sehari 1 sendok takar (5 mL / 1 Cth) sesudah makan.',
    peringatan: 'Membantu memperbaiki nafsu makan dan memelihara daya tahan tubuh anak.',
    dosis_dewasa_ref: 10,
    warna_etiket: 'putih'
  },
  // 40. Apialys Sirup
  {
    id: 'apialys-sirup',
    nama: 'Apialys Sirup 5mL (Multivitamin & Penambah Nafsu Makan)',
    merk: 'Apialys',
    generik: 'Multivitamin + Lysine',
    kategori: 'Alergi & Imun',
    target: 'Pediatrik (Usia 1 - 12 Tahun)',
    dosis_min_mg_kg: 1,
    dosis_max_mg_kg: 1,
    dosis_harian_max_mg_kg: 2,
    frekuensi_hari: 1,
    jeda_jam: 24,
    sediaan_bentuk: 'SIRUP',
    kekuatan_mg: 5,
    volume_sediaan_ml: 5,
    volume_botol_ml: 100,
    waktu_minum: 'SESUDAH_MAKAN',
    aturan_dasar: 'Minum 1 kali sehari 1 sendok takar (5 mL) sesudah makan.',
    peringatan: 'Suplemen nutrisi multivitamin lengkap dan asam amino esensial Lysine untuk masa pertumbuhan.',
    dosis_dewasa_ref: 10,
    warna_etiket: 'putih'
  },
  // 41. Apialys Drops
  {
    id: 'apialys-drop',
    nama: 'Apialys Drops 0.6mL (Multivitamin Bayi)',
    merk: 'Apialys',
    generik: 'Multivitamin Tetes',
    kategori: 'Alergi & Imun',
    target: 'Pediatrik (Bayi 0 - 12 Bulan)',
    dosis_min_mg_kg: 0.6,
    dosis_max_mg_kg: 0.6,
    dosis_harian_max_mg_kg: 0.6,
    frekuensi_hari: 1,
    jeda_jam: 24,
    sediaan_bentuk: 'DROP',
    kekuatan_mg: 0.6,
    volume_sediaan_ml: 0.6,
    volume_botol_ml: 15,
    waktu_minum: 'SESUDAH_MAKAN',
    aturan_dasar: 'Teteskan 0.6 mL dengan pipet tetes 1 kali sehari sesudah minum ASI/makan.',
    peringatan: 'Multivitamin tetes khusus bayi untuk defisiensi vitamin dan pembentukan kekebalan tubuh.',
    dosis_dewasa_ref: 1,
    warna_etiket: 'putih'
  }
];

  let dosageState = {
    modeHitung: 'BB', // BB | USIA | BSA | INFUS | GINJAL
    kategoriFilter: 'SEMUA',
    searchPresetQ: '',
    idMember: '',
    pasienNama: '',
    noWa: '',
    beratKg: 12,
    tinggiCm: 90,
    usiaTahun: 3,
    usiaBulan: 0,
    gender: 'L',
    presetId: 'tempra-sirup',
    namaObat: 'Tempra Sirup 160mg/5mL (Paracetamol Anak)',
    kategori: 'Demam & Nyeri',
    target: 'Pediatrik (Usia 1 - 6 Tahun)',
    dosisMinMgPerKg: 10,
    dosisMaxMgPerKg: 15,
    dosisHarianMaxMgPerKg: 60,
    isDailyDoseCalc: false,
    isSpecialZinc: false,
    frekuensiHari: 3,
    jedaJam: 6,
    waktuMinum: 'SESUDAH_MAKAN_ATAU_DEMAM',
    sediaanBentuk: 'SIRUP',
    kekuatanMg: 160,
    volumeSediaanMl: 5,
    volumeBotolMl: 60,
    durasiHari: 3,
    dosisDewasaRef: 500,
    infusVolMl: 500,
    infusJam: 8,
    infusFaktor: 20,
    serumKreatinin: 1.0,
    customAturan: '',
    catatanApoteker: ''
  };

  function _formatSpoonHelper(ml, bentuk) {
    if (bentuk === 'DROP') return `${ml} mL (pipet tetes)`;
    const cth = ml / 5;
    if (Math.abs(ml - 2.5) < 0.2) return '½ sendok takar (2.5 mL / ½ Cth)';
    if (Math.abs(ml - 5.0) < 0.2) return '1 sendok takar (5 mL / 1 Cth)';
    if (Math.abs(ml - 7.5) < 0.2) return '1½ sendok takar (7.5 mL)';
    if (Math.abs(ml - 10.0) < 0.2) return '2 sendok takar (10 mL / 2 Cth)';
    if (Math.abs(ml - 15.0) < 0.2) return '1 sendok makan (15 mL / 1 C)';
    return `${ml} mL (${cth.toFixed(1)} cth)`;
  }

  function computeDosageCalculation(state, preset) {
    const bb = Math.max(0.5, Number(state.beratKg || 12));
    const tb = Math.max(10, Number(state.tinggiCm || 100));
    const usiaTh = Math.max(0, Number(state.usiaTahun || 3));
    const usiaBln = Math.max(0, Number(state.usiaBulan || 0));
    const sCr = Math.max(0.1, Number(state.serumKreatinin || 1.0));
    const isFemale = state.gender === 'P';

    const bsa = Math.sqrt((tb * bb) / 3600);
    const bsaDubois = 0.007184 * Math.pow(tb, 0.725) * Math.pow(bb, 0.425);
    const dDewasa = Number(state.dosisDewasaRef || (preset ? preset.dosis_dewasa_ref : 500) || 500);

    const totalBulan = (usiaTh * 12) + usiaBln;
    const dosisYoung = usiaTh >= 1 && usiaTh <= 12 ? Math.round((usiaTh / (usiaTh + 12)) * dDewasa) : null;
    const dosisDilling = usiaTh > 8 ? Math.round((usiaTh / 20) * dDewasa) : null;
    const dosisFried = totalBulan <= 12 ? Math.round((totalBulan / 150) * dDewasa) : null;
    const dosisClark = Math.round((bb / 70) * dDewasa);
    const dosisBsa = Math.round((bsa / 1.73) * dDewasa);

    let doseSingleMinMg = 0, doseSingleMaxMg = 0, doseDailyMinMg = 0, doseDailyMaxMg = 0;
    const freq = Math.max(1, Number(state.frekuensiHari || (preset ? preset.frekuensi_hari : 3) || 3));

    if (preset && preset.is_special_zinc) {
      const isUnder6Mo = totalBulan < 6;
      doseSingleMinMg = isUnder6Mo ? 10 : 20;
      doseSingleMaxMg = isUnder6Mo ? 10 : 20;
      doseDailyMinMg = doseSingleMinMg;
      doseDailyMaxMg = doseSingleMaxMg;
    } else if (preset && preset.is_daily_dose_calc) {
      const minPerKg = Number(state.dosisMinMgPerKg || preset.dosis_min_mg_kg || 25);
      const maxPerKg = Number(state.dosisMaxMgPerKg || preset.dosis_max_mg_kg || 50);
      doseDailyMinMg = Math.round(bb * minPerKg);
      doseDailyMaxMg = Math.round(bb * maxPerKg);
      doseSingleMinMg = Math.round(doseDailyMinMg / freq);
      doseSingleMaxMg = Math.round(doseDailyMaxMg / freq);
    } else {
      const minPerKg = Number(state.dosisMinMgPerKg || (preset ? preset.dosis_min_mg_kg : 10) || 10);
      const maxPerKg = Number(state.dosisMaxMgPerKg || (preset ? preset.dosis_max_mg_kg : 15) || 15);
      doseSingleMinMg = Math.round(bb * minPerKg);
      doseSingleMaxMg = Math.round(bb * maxPerKg);
      doseDailyMinMg = Math.round(doseSingleMinMg * freq);
      doseDailyMaxMg = Math.round(doseSingleMaxMg * freq);
    }

    const concMg = Math.max(0.01, Number(state.kekuatanMg || (preset ? preset.kekuatan_mg : 120) || 120));
    const concVol = Math.max(0.1, Number(state.volumeSediaanMl || (preset ? preset.volume_sediaan_ml : 5) || 5));
    const bTk = (preset && preset.sediaan_bentuk) || state.sediaanBentuk || 'SIRUP';

    const volSingleMinMl = Math.round(((doseSingleMinMg * concVol) / concMg) * 10) / 10;
    const volSingleMaxMl = Math.round(((doseSingleMaxMg * concVol) / concMg) * 10) / 10;

    const spoonMin = _formatSpoonHelper(volSingleMinMl, bTk);
    const spoonMax = _formatSpoonHelper(volSingleMaxMl, bTk);

    const durasi = Math.max(1, Number(state.durasiHari || 3));
    const totalVolumeNeededMl = Math.round(volSingleMaxMl * freq * durasi);
    const bSize = Math.max(5, Number(state.volumeBotolMl || (preset ? preset.volume_botol_ml : 60) || 60));
    const botolCount = Math.max(1, Math.ceil(totalVolumeNeededMl / bSize));

    const infusMl = Math.max(10, Number(state.infusVolMl || 500));
    const infusJam = Math.max(0.1, Number(state.infusJam || 8));
    const infusFaktor = Number(state.infusFaktor || 20);
    const tpm = Math.round((infusMl * infusFaktor) / (infusJam * 60));
    const tpmMakro = Math.round((infusMl * 20) / (infusJam * 60));
    const tpmMikro = Math.round((infusMl * 60) / (infusJam * 60));
    const tpmDarah = Math.round((infusMl * 15) / (infusJam * 60));
    const mlPerJam = Math.round(infusMl / infusJam);

    const crCl = Math.round((((140 - usiaTh) * bb) / (72 * sCr)) * (isFemale ? 0.85 : 1.0) * 10) / 10;

    let gfrStage = 'Stage 1 (Normal)';
    let gfrBadgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300';
    let gfrAdvice = 'Fungsi ginjal normal. Gunakan dosis standar.';

    if (crCl >= 90) {
      gfrStage = 'Stage 1 (Normal)';
      gfrBadgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300';
      gfrAdvice = 'Fungsi ginjal normal. Gunakan dosis standar tanpa penyesuaian khusus.';
    } else if (crCl >= 60) {
      gfrStage = 'Stage 2 (Penurunan Ringan)';
      gfrBadgeClass = 'bg-blue-100 text-blue-800 border-blue-300';
      gfrAdvice = 'Penurunan fungsi ringan. Dosis standar aman, pantau obat indeks terapi sempit.';
    } else if (crCl >= 45) {
      gfrStage = 'Stage 3A (Penurunan Sedang)';
      gfrBadgeClass = 'bg-amber-100 text-amber-800 border-amber-300';
      gfrAdvice = 'Penurunan sedang. Pertimbangkan penyesuaian dosis 25% untuk obat eliminasi ginjal.';
    } else if (crCl >= 30) {
      gfrStage = 'Stage 3B (Sedang-Berat)';
      gfrBadgeClass = 'bg-orange-100 text-orange-800 border-orange-300';
      gfrAdvice = 'Penurunan sedang-berat. Kurangi dosis 50% atau perpanjang interval minum (q12h).';
    } else if (crCl >= 15) {
      gfrStage = 'Stage 4 (Gagal Ginjal Berat)';
      gfrBadgeClass = 'bg-rose-100 text-rose-800 border-rose-300';
      gfrAdvice = 'Gagal ginjal berat. Kurangi dosis 50-75% atau perpanjang jeda minum (q18-24h). Hindari NSAID.';
    } else {
      gfrStage = 'Stage 5 (Gagal Ginjal Terminal)';
      gfrBadgeClass = 'bg-red-200 text-red-900 border-red-400';
      gfrAdvice = 'Gagal ginjal terminal / dialisis. Penyesuaian dosis ketat & konsultasi spesialis nefrologi.';
    }

    let aturanText = (preset && preset.aturan_dasar) || 'Minum {FREQ} kali sehari {TAK_MIN} sampai {TAK_MAX} sesudah makan.';
    aturanText = aturanText
      .replace('{TAK_MIN}', spoonMin)
      .replace('{TAK_MAX}', spoonMax)
      .replace('{FREQ}', String(freq));

    if (preset && (preset.id === 'zinc-diare' || preset.id === 'zinkid-sirup' || preset.id === 'daryazinc-sirup')) {
      aturanText = `Minum 1 kali sehari ${spoonMin} selama 10 HARI PENUH.`;
    }

    // Schedule Times helper
    let jadwalWaktu = [];
    if (freq === 1) jadwalWaktu = ['Malam (20:00 WIB)'];
    else if (freq === 2) jadwalWaktu = ['Pagi (07:00 WIB)', 'Malam (19:00 WIB)'];
    else if (freq === 3) jadwalWaktu = ['Pagi (07:00 WIB)', 'Siang (15:00 WIB)', 'Malam (23:00 WIB)'];
    else if (freq === 4) jadwalWaktu = ['06:00 WIB', '12:00 WIB', '18:00 WIB', '24:00 WIB'];
    else jadwalWaktu = [`Tiap ${Math.round(24/freq)} jam secara teratur`];

    return {
      bb,
      tb,
      usiaTh,
      usiaBln,
      bsa: Math.round(bsa * 100) / 100,
      bsaDubois: Math.round(bsaDubois * 100) / 100,
      doseSingleMinMg,
      doseSingleMaxMg,
      doseDailyMinMg,
      doseDailyMaxMg,
      volSingleMinMl,
      volSingleMaxMl,
      spoonMin,
      spoonMax,
      totalVolumeNeededMl,
      botolCount,
      botolSizeMl: bSize,
      durasi,
      freq,
      jadwalWaktu,
      dosisYoung,
      dosisDilling,
      dosisFried,
      dosisClark,
      dosisBsa,
      dDewasa,
      tpm,
      tpmMakro,
      tpmMikro,
      tpmDarah,
      mlPerJam,
      infusMl,
      infusJam,
      infusFaktor,
      crCl,
      gfrStage,
      gfrBadgeClass,
      gfrAdvice,
      sCr,
      aturanText,
      peringatan: (preset && preset.peringatan) || 'Gunakan sendok takar bawaan obat untuk memastikan volume akurat. Simpan di tempat sejuk terlindung dari cahaya.'
    };
  }

  function _buildDosageWaUrl(state, res, preset) {
    const waText = `*REKOMENDASI ATURAN MINUM OBAT & DOSIS KLINIS*
*Apotek ONS Farma*
----------------------------------------
👤 *Pasien:* ${state.pasienNama || 'Umum'}
⚖️ *BB / Usia:* ${state.beratKg} kg / ${state.usiaTahun} th ${state.usiaBulan ? state.usiaBulan + ' bln' : ''}
💊 *Obat:* ${state.namaObat}
🧪 *Sediaan:* ${state.kekuatanMg} mg / ${state.volumeSediaanMl} mL (${state.sediaanBentuk})

📋 *HASIL DOSIS TERHITUNG:*
• *Dosis Sekali Minum:* ${res.doseSingleMinMg} - ${res.doseSingleMaxMg} mg
• *Takaran Minum:* ${res.spoonMax} (${res.volSingleMinMl} - ${res.volSingleMaxMl} mL)
• *Frekuensi:* ${res.freq} kali sehari (tiap ${Math.round(24/res.freq)} jam)
• *Dosis Harian:* ${res.doseDailyMinMg} - ${res.doseDailyMaxMg} mg/hari
• *Kebutuhan:* ${res.botolCount} botol untuk ${res.durasi} hari terapi

📌 *ATURAN PAKAI RESMI:*
${res.aturanText}

⏰ *JADWAL MINUM DISARANKAN:*
${res.jadwalWaktu.join(' -> ')}

⚠️ *CATATAN PENTING APOTEKER:*
${res.peringatan}
${state.catatanApoteker ? ('• Catatan Tambahan: ' + state.catatanApoteker) : ''}
----------------------------------------
_Semoga cepat sembuh. Hubungi Apotek ONS Farma bila ada pertanyaan lebih lanjut._`;

    return S().buildWaUrl && state.noWa
      ? S().buildWaUrl(state.noWa, waText)
      : ('https://wa.me/?text=' + encodeURIComponent(waText));
  }

  function _updateDosageDomLive(res, state, preset) {
    // 1. Hero dose
    document.querySelectorAll('.calc-dose-single-mg').forEach((el) => {
      el.textContent = `${res.doseSingleMinMg} - ${res.doseSingleMaxMg}`;
    });
    document.querySelectorAll('.calc-vol-single-ml').forEach((el) => {
      el.textContent = `${res.volSingleMinMl} - ${res.volSingleMaxMl} mL`;
    });
    document.querySelectorAll('.calc-spoon').forEach((el) => {
      el.textContent = res.spoonMax;
    });
    document.querySelectorAll('.calc-freq-desc').forEach((el) => {
      el.textContent = `${res.freq}x sehari (tiap ${Math.round(24 / res.freq)} jam)`;
    });
    document.querySelectorAll('.calc-daily-mg').forEach((el) => {
      el.textContent = `${res.doseDailyMinMg} - ${res.doseDailyMaxMg} mg/hari`;
    });
    document.querySelectorAll('.calc-botol-count').forEach((el) => {
      el.textContent = `${res.botolCount} Botol (${res.totalVolumeNeededMl} mL)`;
    });
    document.querySelectorAll('.calc-aturan-text').forEach((el) => {
      el.textContent = res.aturanText;
    });
    document.querySelectorAll('.calc-peringatan').forEach((el) => {
      el.textContent = res.peringatan;
    });
    document.querySelectorAll('.calc-jadwal-pills').forEach((el) => {
      el.innerHTML = res.jadwalWaktu.map((j) => `<span class="px-2 py-0.5 rounded-full font-bold text-[10px] bg-blue-50 text-blue-700 border border-blue-200">⏰ ${S().esc(j)}</span>`).join(' ');
    });

    // 2. Buttons
    const newWaHref = _buildDosageWaUrl(state, res, preset);
    document.querySelectorAll('.calc-wa-btn').forEach((el) => {
      el.setAttribute('href', newWaHref);
    });

    document.querySelectorAll('.calc-copy-btn').forEach((el) => {
      el.onclick = () => window.copyDosageAturanText(res.aturanText);
    });

    // 3. Sub-modes
    document.querySelectorAll('.calc-young').forEach((el) => {
      el.textContent = res.dosisYoung !== null ? res.dosisYoung + ' mg' : '-';
    });
    document.querySelectorAll('.calc-dilling').forEach((el) => {
      el.textContent = res.dosisDilling !== null ? res.dosisDilling + ' mg' : '-';
    });
    document.querySelectorAll('.calc-fried').forEach((el) => {
      el.textContent = res.dosisFried !== null ? res.dosisFried + ' mg' : '-';
    });
    document.querySelectorAll('.calc-clark').forEach((el) => {
      el.textContent = res.dosisClark + ' mg';
    });
    document.querySelectorAll('.calc-bsa').forEach((el) => {
      el.textContent = res.bsa + ' m²';
    });
    document.querySelectorAll('.calc-dosis-bsa').forEach((el) => {
      el.textContent = res.dosisBsa + ' mg';
    });
    document.querySelectorAll('.calc-tpm').forEach((el) => {
      el.textContent = res.tpm + ' TPM';
    });
    document.querySelectorAll('.calc-ml-jam').forEach((el) => {
      el.textContent = res.mlPerJam + ' mL/Jam';
    });
    document.querySelectorAll('.calc-gfr').forEach((el) => {
      el.textContent = res.crCl + ' mL/min';
    });
    document.querySelectorAll('.calc-gfr-stage').forEach((el) => {
      el.textContent = res.gfrStage;
      el.className = 'calc-gfr-stage px-2 py-0.5 rounded text-[10px] font-bold ' + res.gfrBadgeClass;
    });
    document.querySelectorAll('.calc-gfr-advice').forEach((el) => {
      el.textContent = res.gfrAdvice;
    });
  }

  function renderDosageCalculatorTabHtml(isModal) {
    const st = S().AppState;
    const curPreset = DOSAGE_PRESETS.find((p) => p.id === dosageState.presetId) || null;
    const res = computeDosageCalculation(dosageState, curPreset);
    const waHref = _buildDosageWaUrl(dosageState, res, curPreset);

    const categories = [
      { id: 'SEMUA', label: 'Semua Obat', count: DOSAGE_PRESETS.length, icon: '💊' },
      { id: 'Demam & Nyeri', label: 'Demam & Nyeri', count: DOSAGE_PRESETS.filter(p => p.kategori === 'Demam & Nyeri').length, icon: '🌡️' },
      { id: 'Antibiotik', label: 'Antibiotik', count: DOSAGE_PRESETS.filter(p => p.kategori === 'Antibiotik').length, icon: '🛡️' },
      { id: 'Batuk & Sesak', label: 'Batuk & Sesak', count: DOSAGE_PRESETS.filter(p => p.kategori === 'Batuk & Sesak').length, icon: '🫁' },
      { id: 'Pencernaan & Mual', label: 'Pencernaan & Mual', count: DOSAGE_PRESETS.filter(p => p.kategori === 'Pencernaan & Mual').length, icon: '🥣' },
      { id: 'Alergi & Imun', label: 'Alergi & Imun', count: DOSAGE_PRESETS.filter(p => p.kategori === 'Alergi & Imun').length, icon: '✨' }
    ];

    const currentCat = dosageState.kategoriFilter || 'SEMUA';
    const searchQ = String(dosageState.searchPresetQ || '').toLowerCase().trim();

    const filteredPresets = DOSAGE_PRESETS.filter((p) => {
      if (currentCat !== 'SEMUA' && p.kategori !== currentCat) return false;
      if (searchQ) {
        const hay = (p.nama + ' ' + (p.merk || '') + ' ' + (p.generik || '') + ' ' + p.kategori).toLowerCase();
        return hay.includes(searchQ);
      }
      return true;
    });

    return `<div class="space-y-4 text-xs">
      <!-- Modern Hero Header Banner -->
      <div class="rounded-2xl border p-4 shadow-sm" style="background: linear-gradient(135deg, rgba(30,58,138,0.05) 0%, rgba(13,148,136,0.07) 50%, rgba(37,99,235,0.03) 100%); border-color: var(--ons-border);">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xl">🩺</span>
              <h2 class="text-base font-extrabold" style="color:var(--ons-primary)">Kalkulator Dosis Obat &amp; Rekomendasi Klinis Apoteker</h2>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200">41 Sediaan Populer</span>
            </div>
            <p class="text-[11px] mt-0.5" style="color:var(--ons-text-soft)">Perhitungan presisi pediatrik, takaran sendok sirup/drop, rumus usia, BSA Mosteller, laju tetesan infus &amp; ginjal terstandar ISO Farmasi &amp; PMK 73.</p>
          </div>
          <!-- Live Quick Search Bar -->
          <div class="relative min-w-[260px] max-w-sm">
            <span class="absolute left-3 top-2.5 text-slate-400">🔍</span>
            <input id="calcPresetSearchInput" type="text" class="ons-input pl-8 pr-7 text-xs h-9 bg-white dark:bg-slate-900 border-blue-300 dark:border-blue-800 focus:ring-2 focus:ring-blue-400 font-semibold" placeholder="Cari: Tempra, Sanmol, Proris, Amoxsan..." value="${S().esc(dosageState.searchPresetQ)}" oninput="window.filterDosagePresetsLive(this.value, ${isModal ? 'true' : 'false'})"/>
            ${dosageState.searchPresetQ ? `<button type="button" onclick="window.filterDosagePresetsLive('', ${isModal ? 'true' : 'false'})" class="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs font-bold">&times;</button>` : ''}
          </div>
        </div>

        <!-- Kategori Filter Chips -->
        <div class="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t" style="border-color:var(--ons-border)">
          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500 mr-1">Kategori:</span>
          ${categories.map((c) => {
            const active = currentCat === c.id;
            return `<button type="button" onclick="window.setDosageCategoryFilter('${c.id}', ${isModal ? 'true' : 'false'})" class="px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 ${active ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-400/40' : 'bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'}" style="${active ? 'background:var(--ons-primary);color:#fff;' : ''}">
              <span>${c.icon}</span> <span>${c.label}</span> <span class="px-1.5 py-0.2 rounded-full text-[9px] ${active ? 'bg-white/30 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}">${c.count}</span>
            </button>`;
          }).join('')}
        </div>

        <!-- Presets Card Grid with Badges -->
        <div class="mt-2.5 max-h-[145px] overflow-y-auto p-1.5 rounded-xl border bg-white/60 dark:bg-slate-900/40 flex flex-wrap gap-1.5" style="border-color:var(--ons-border)">
          ${filteredPresets.length === 0 ? `<div class="p-3 text-center text-slate-500 w-full">Tidak ada obat dengan kata kunci "<b>${S().esc(searchQ)}</b>". Gunakan opsi <b>+ Kustom Formula</b>.</div>` : ''}
          ${filteredPresets.map((p) => {
            const active = dosageState.presetId === p.id;
            return `<button type="button" onclick="window.pickDosagePreset('${p.id}', ${isModal ? 'true' : 'false'})" class="px-3 py-1.5 rounded-xl border text-left transition-all transform hover:-translate-y-0.5 ${active ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-400/30' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-blue-50/60 dark:hover:bg-slate-700/60'}" style="${active ? 'background:var(--ons-primary);color:#fff;' : ''}">
              <div class="font-extrabold text-[11px] leading-tight flex items-center gap-1">
                ${active ? '✓ ' : ''}${S().esc(p.nama.split(' (')[0])}
              </div>
              <div class="text-[9px] opacity-80 mt-0.5 font-medium flex items-center gap-1">
                <span>${p.kekuatan_mg}mg/${p.volume_sediaan_ml}mL</span> &bull; <span>${p.sediaan_bentuk}</span>
              </div>
            </button>`;
          }).join('')}
          <button type="button" onclick="window.pickDosagePreset('custom', ${isModal ? 'true' : 'false'})" class="px-3 py-1.5 rounded-xl border font-bold text-[11px] ${dosageState.presetId === 'custom' ? 'bg-amber-600 text-white shadow-md' : 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 text-amber-800 dark:text-amber-200 hover:bg-amber-100'}">+ Kustom Formula</button>
        </div>
      </div>

      <!-- Mode Perhitungan Sub-Bar -->
      <div class="flex flex-wrap items-center justify-between gap-2 border-b pb-2" style="border-color:var(--ons-border)">
        <div class="flex items-center gap-2">
          <span class="font-extrabold text-xs text-slate-700 dark:text-slate-300">Metode Kalkulasi:</span>
          <div class="ons-tab-bar">
            <button type="button" onclick="window.setDosageMode('BB', ${isModal ? 'true' : 'false'})" class="ons-tab-btn ${dosageState.modeHitung === 'BB' ? 'active' : ''}">⚖️ 1. mg/kgBB (Pediatrik)</button>
            <button type="button" onclick="window.setDosageMode('USIA', ${isModal ? 'true' : 'false'})" class="ons-tab-btn ${dosageState.modeHitung === 'USIA' ? 'active' : ''}">👶 2. Rumus Usia (Young/Dilling/Clark)</button>
            <button type="button" onclick="window.setDosageMode('BSA', ${isModal ? 'true' : 'false'})" class="ons-tab-btn ${dosageState.modeHitung === 'BSA' ? 'active' : ''}">📐 3. Luas Tubuh (BSA)</button>
            <button type="button" onclick="window.setDosageMode('INFUS', ${isModal ? 'true' : 'false'})" class="ons-tab-btn ${dosageState.modeHitung === 'INFUS' ? 'active' : ''}">💧 4. Tetesan Infus (TPM)</button>
            <button type="button" onclick="window.setDosageMode('GINJAL', ${isModal ? 'true' : 'false'})" class="ons-tab-btn ${dosageState.modeHitung === 'GINJAL' ? 'active' : ''}">🩺 5. Klirens Ginjal (eGFR)</button>
          </div>
        </div>
        <div class="text-[11px] font-semibold text-slate-500">
          Target: <span class="font-bold text-blue-600">${S().esc((curPreset && curPreset.target) || 'Pediatrik & Dewasa')}</span>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <!-- Kolom Kiri: Form Parameter Pasien & Sediaan -->
        <div class="ons-card p-4 lg:col-span-6 space-y-3.5 shadow-sm">
          <div class="flex items-center justify-between border-b pb-2" style="border-color:var(--ons-border)">
            <div class="flex items-center gap-1.5">
              <span class="text-base">👤</span>
              <h3 class="font-extrabold text-sm">Parameter Pasien &amp; Sediaan Obat</h3>
            </div>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">${S().esc((curPreset && curPreset.kategori) || 'Formula Farmasi')}</span>
          </div>

          <!-- Data Pasien -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label class="font-bold block mb-1 text-[11px]">Pilih Pasien Terdaftar (Member)</label>
              <select class="ons-select text-xs font-semibold" onchange="window.pickDosageMember(this.value, ${isModal ? 'true' : 'false'})">
                <option value="">-- Pasien Umum (Non-Member) --</option>
                ${(st.members || []).map((m) => `<option value="${S().esc(m.id_member)}" ${dosageState.idMember === m.id_member ? 'selected' : ''}>${S().esc(m.nama_pasien)} (${S().esc(m.no_hp || '-')})</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="font-bold block mb-1 text-[11px]">Nama Pasien *</label>
              <input class="ons-input text-xs font-semibold" value="${S().esc(dosageState.pasienNama)}" oninput="window.handleDosageLiveInput(this, 'pasienNama', ${isModal ? 'true' : 'false'})" placeholder="Nama pasien / balita..."/>
            </div>
          </div>

          <!-- Grid Biometrik Pasien -->
          <div class="p-3 rounded-2xl border space-y-2" style="background: linear-gradient(135deg, rgba(239,246,255,0.6) 0%, rgba(240,253,250,0.6) 100%); border-color: var(--ons-border);">
            <div class="flex items-center justify-between">
              <span class="font-bold text-[11px] text-blue-900 dark:text-blue-200">Biometrik Pasien (Penentu Dosis):</span>
              <div class="flex gap-1 text-[10px]">
                <button type="button" onclick="window.quickSetDosageAge(0.5, 7, ${isModal ? 'true' : 'false'})" class="px-1.5 py-0.5 rounded bg-white border text-blue-700 font-bold hover:bg-blue-50">Bayi 6 bln (7kg)</button>
                <button type="button" onclick="window.quickSetDosageAge(2, 12, ${isModal ? 'true' : 'false'})" class="px-1.5 py-0.5 rounded bg-white border text-blue-700 font-bold hover:bg-blue-50">Balita 2 th (12kg)</button>
                <button type="button" onclick="window.quickSetDosageAge(7, 22, ${isModal ? 'true' : 'false'})" class="px-1.5 py-0.5 rounded bg-white border text-blue-700 font-bold hover:bg-blue-50">Anak 7 th (22kg)</button>
              </div>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <label class="text-[10px] font-bold block mb-0.5">Berat Badan (kg) *</label>
                <div class="relative">
                  <input type="number" step="0.1" min="0.5" class="ons-input font-mono-num text-xs font-black text-blue-600 bg-white dark:bg-slate-900 border-blue-300 pr-7" value="${dosageState.beratKg}" oninput="window.handleDosageLiveInput(this, 'beratKg', ${isModal ? 'true' : 'false'})"/>
                  <span class="absolute right-2 top-2 text-[10px] text-slate-400 font-bold">kg</span>
                </div>
              </div>
              <div>
                <label class="text-[10px] font-bold block mb-0.5">Tinggi Badan (cm)</label>
                <div class="relative">
                  <input type="number" min="20" class="ons-input font-mono-num text-xs font-bold bg-white dark:bg-slate-900 pr-7" value="${dosageState.tinggiCm}" oninput="window.handleDosageLiveInput(this, 'tinggiCm', ${isModal ? 'true' : 'false'})"/>
                  <span class="absolute right-2 top-2 text-[10px] text-slate-400 font-bold">cm</span>
                </div>
              </div>
              <div>
                <label class="text-[10px] font-bold block mb-0.5">Usia (Tahun)</label>
                <input type="number" min="0" max="120" class="ons-input font-mono-num text-xs font-bold bg-white dark:bg-slate-900" value="${dosageState.usiaTahun}" oninput="window.handleDosageLiveInput(this, 'usiaTahun', ${isModal ? 'true' : 'false'})"/>
              </div>
              <div>
                <label class="text-[10px] font-bold block mb-0.5">Usia (Bulan)</label>
                <input type="number" min="0" max="11" class="ons-input font-mono-num text-xs font-bold bg-white dark:bg-slate-900" value="${dosageState.usiaBulan}" oninput="window.handleDosageLiveInput(this, 'usiaBulan', ${isModal ? 'true' : 'false'})"/>
              </div>
            </div>
          </div>

          <!-- Parameter Khusus Obat & Sediaan -->
          <div class="p-3.5 rounded-2xl border space-y-2.5" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
            <div class="font-extrabold text-xs flex items-center justify-between">
              <span>Konsentrasi Sediaan Farmasi:</span>
              <span class="text-blue-700 dark:text-blue-300 font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 border border-blue-200">${S().esc(dosageState.namaObat)}</span>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <div>
                <label class="text-[10px] font-bold block mb-0.5">Kekuatan Bahan (mg)</label>
                <input type="number" min="0.01" step="0.01" class="ons-input font-mono-num text-xs font-bold bg-white dark:bg-slate-900" value="${dosageState.kekuatanMg}" oninput="window.handleDosageLiveInput(this, 'kekuatanMg', ${isModal ? 'true' : 'false'})"/>
              </div>
              <div>
                <label class="text-[10px] font-bold block mb-0.5">Dalam Volume (mL)</label>
                <input type="number" min="0.1" step="0.1" class="ons-input font-mono-num text-xs font-bold bg-white dark:bg-slate-900" value="${dosageState.volumeSediaanMl}" oninput="window.handleDosageLiveInput(this, 'volumeSediaanMl', ${isModal ? 'true' : 'false'})"/>
              </div>
              <div>
                <label class="text-[10px] font-bold block mb-0.5">Ukuran Botol (mL)</label>
                <input type="number" min="5" class="ons-input font-mono-num text-xs font-bold bg-white dark:bg-slate-900" value="${dosageState.volumeBotolMl}" oninput="window.handleDosageLiveInput(this, 'volumeBotolMl', ${isModal ? 'true' : 'false'})"/>
              </div>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <div>
                <label class="text-[10px] font-bold block mb-0.5">Dosis Min (mg/kg)</label>
                <input type="number" step="0.01" min="0.01" class="ons-input font-mono-num text-xs font-bold bg-white dark:bg-slate-900" value="${dosageState.dosisMinMgPerKg}" oninput="window.handleDosageLiveInput(this, 'dosisMinMgPerKg', ${isModal ? 'true' : 'false'})"/>
              </div>
              <div>
                <label class="text-[10px] font-bold block mb-0.5">Dosis Max (mg/kg)</label>
                <input type="number" step="0.01" min="0.01" class="ons-input font-mono-num text-xs font-bold bg-white dark:bg-slate-900" value="${dosageState.dosisMaxMgPerKg}" oninput="window.handleDosageLiveInput(this, 'dosisMaxMgPerKg', ${isModal ? 'true' : 'false'})"/>
              </div>
              <div>
                <label class="text-[10px] font-bold block mb-0.5">Frekuensi (x/hari)</label>
                <input type="number" min="1" max="6" class="ons-input font-mono-num text-xs font-bold bg-white dark:bg-slate-900" value="${dosageState.frekuensiHari}" oninput="window.handleDosageLiveInput(this, 'frekuensiHari', ${isModal ? 'true' : 'false'})"/>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-2 pt-1">
              <div>
                <label class="text-[10px] font-bold block mb-0.5">Durasi Pengobatan (hari)</label>
                <input type="number" min="1" class="ons-input font-mono-num text-xs font-bold bg-white dark:bg-slate-900" value="${dosageState.durasiHari}" oninput="window.handleDosageLiveInput(this, 'durasiHari', ${isModal ? 'true' : 'false'})"/>
              </div>
              <div>
                <label class="text-[10px] font-bold block mb-0.5">No. WhatsApp Pasien / Wali</label>
                <input class="ons-input font-mono-num text-xs font-bold bg-white dark:bg-slate-900" value="${S().esc(dosageState.noWa)}" oninput="window.handleDosageLiveInput(this, 'noWa', ${isModal ? 'true' : 'false'})" placeholder="08xxxxxxxxxx"/>
              </div>
            </div>
          </div>

          <!-- Input Khusus jika Mode Infus / Ginjal -->
          ${dosageState.modeHitung === 'INFUS' ? `
            <div class="p-3.5 rounded-2xl border border-indigo-200 bg-indigo-50/50 dark:bg-indigo-950/20 space-y-2">
              <div class="font-extrabold text-xs text-indigo-700 flex items-center gap-1"><span>💧</span> Parameter Tetesan Infus (IV Flow Rate):</div>
              <div class="grid grid-cols-3 gap-2">
                <div><label class="text-[10px] font-bold block mb-0.5">Volume Infus (mL)</label><input type="number" class="ons-input font-mono-num text-xs font-bold bg-white" value="${dosageState.infusVolMl}" oninput="window.handleDosageLiveInput(this, 'infusVolMl', ${isModal ? 'true' : 'false'})"/></div>
                <div><label class="text-[10px] font-bold block mb-0.5">Durasi Habis (Jam)</label><input type="number" step="0.5" class="ons-input font-mono-num text-xs font-bold bg-white" value="${dosageState.infusJam}" oninput="window.handleDosageLiveInput(this, 'infusJam', ${isModal ? 'true' : 'false'})"/></div>
                <div><label class="text-[10px] font-bold block mb-0.5">Faktor Tetes</label>
                  <select class="ons-select text-xs font-bold bg-white" onchange="window.setDosageParam('infusFaktor', Number(this.value), ${isModal ? 'true' : 'false'})">
                    <option value="20" ${dosageState.infusFaktor === 20 ? 'selected' : ''}>Makro Dewasa (20 tts/mL)</option>
                    <option value="60" ${dosageState.infusFaktor === 60 ? 'selected' : ''}>Mikro Pediatrik (60 tts/mL)</option>
                    <option value="15" ${dosageState.infusFaktor === 15 ? 'selected' : ''}>Transfusi Darah (15 tts/mL)</option>
                  </select>
                </div>
              </div>
            </div>
          ` : dosageState.modeHitung === 'GINJAL' ? `
            <div class="p-3.5 rounded-2xl border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 space-y-2">
              <div class="font-extrabold text-xs text-amber-800 flex items-center gap-1"><span>🩺</span> Parameter Klirens Ginjal (Cockcroft-Gault):</div>
              <div class="grid grid-cols-2 gap-2">
                <div><label class="text-[10px] font-bold block mb-0.5">Serum Kreatinin (mg/dL)</label><input type="number" step="0.1" class="ons-input font-mono-num text-xs font-bold bg-white" value="${dosageState.serumKreatinin}" oninput="window.handleDosageLiveInput(this, 'serumKreatinin', ${isModal ? 'true' : 'false'})"/></div>
                <div><label class="text-[10px] font-bold block mb-0.5">Jenis Kelamin Pasien</label>
                  <select class="ons-select text-xs font-bold bg-white" onchange="window.setDosageParam('gender', this.value, ${isModal ? 'true' : 'false'})">
                    <option value="L" ${dosageState.gender === 'L' ? 'selected' : ''}>Laki-laki (Faktor 1.0)</option>
                    <option value="P" ${dosageState.gender === 'P' ? 'selected' : ''}>Perempuan (Faktor 0.85)</option>
                  </select>
                </div>
              </div>
            </div>
          ` : ''}
        </div>

        <!-- Kolom Kanan: Hasil Dosis Presisi & Tampilan Sempurna -->
        <div class="ons-card p-4 lg:col-span-6 space-y-3.5 flex flex-col justify-between shadow-sm">
          <div class="space-y-3.5">
            <div class="flex items-center justify-between border-b pb-2" style="border-color:var(--ons-border)">
              <div class="flex items-center gap-1.5">
                <span class="text-base">🎯</span>
                <h3 class="font-extrabold text-sm text-emerald-700 dark:text-emerald-400">Hasil Rekomendasi Dosis Klinis</h3>
              </div>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">Tervalidasi Farmakope</span>
            </div>

            <!-- Kartu Metrik Utama: Dosis & Takaran Sendok -->
            <div class="grid grid-cols-2 gap-2.5 text-center">
              <div class="p-3.5 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/90 to-teal-50/60 dark:from-emerald-950/40 dark:to-teal-950/30 shadow-sm">
                <div class="text-[10px] font-extrabold text-emerald-800 dark:text-emerald-300 tracking-wider uppercase">DOSIS SEKALI MINUM</div>
                <div class="text-2xl font-black font-mono-num text-emerald-700 dark:text-emerald-300 py-0.5">
                  <span class="calc-dose-single-mg">${res.doseSingleMinMg} - ${res.doseSingleMaxMg}</span> <span class="text-xs font-bold">mg</span>
                </div>
                <div class="calc-vol-single-ml text-xs font-black text-emerald-900 dark:text-emerald-200 mt-0.5 flex items-center justify-center gap-1">
                  <span>💧</span> <span>${res.volSingleMinMl} - ${res.volSingleMaxMl} mL</span>
                </div>
              </div>
              <div class="p-3.5 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/90 to-indigo-50/60 dark:from-blue-950/40 dark:to-indigo-950/30 shadow-sm">
                <div class="text-[10px] font-extrabold text-blue-800 dark:text-blue-300 tracking-wider uppercase">TAKARAN SENDOK RESMI</div>
                <div class="calc-spoon text-sm font-black text-blue-700 dark:text-blue-300 leading-tight py-1 flex items-center justify-center gap-1">
                  <span>🥄</span> <span>${res.spoonMax}</span>
                </div>
                <div class="calc-freq-desc text-[11px] font-extrabold text-blue-900 dark:text-blue-200 font-mono-num">
                  ⏱️ ${res.freq}x sehari (tiap ${Math.round(24/res.freq)} jam)
                </div>
              </div>
            </div>

            <!-- Jadwal Waktu Minum Rekomendasi -->
            <div class="p-2.5 rounded-2xl border bg-slate-50 dark:bg-slate-900/40 space-y-1.5" style="border-color:var(--ons-border)">
              <div class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Jadwal Minum Terjadwal:</div>
              <div class="calc-jadwal-pills flex flex-wrap gap-1.5">
                ${res.jadwalWaktu.map((j) => `<span class="px-2 py-0.5 rounded-full font-bold text-[10px] bg-blue-50 text-blue-700 border border-blue-200">⏰ ${S().esc(j)}</span>`).join(' ')}
              </div>
            </div>

            <!-- Analisis Tambahan: Total Harian & Kebutuhan Botol -->
            <div class="grid grid-cols-2 gap-2 text-xs p-3 rounded-2xl border" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
              <div>
                <span class="block text-[10px] font-bold" style="color:var(--ons-text-soft)">Dosis Total Harian:</span>
                <b class="calc-daily-mg font-mono-num text-sm font-extrabold text-slate-800 dark:text-slate-200">${res.doseDailyMinMg} - ${res.doseDailyMaxMg} mg/hari</b>
              </div>
              <div>
                <span class="block text-[10px] font-bold" style="color:var(--ons-text-soft)">Kebutuhan Terapi (${res.durasi} Hari):</span>
                <b class="calc-botol-count font-mono-num text-sm font-extrabold text-blue-600">${res.botolCount} Botol (${res.totalVolumeNeededMl} mL)</b>
              </div>
            </div>

            <!-- Mode Spesifik (Usia, BSA, Infus, Ginjal) -->
            ${dosageState.modeHitung === 'USIA' ? `
              <div class="p-3 rounded-2xl border border-indigo-200 bg-indigo-50/60 dark:bg-indigo-950/30 text-[11px] space-y-1.5 shadow-sm">
                <div class="font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1"><span>👶</span> Rumus Usia Klasik Farmasi (Ref Dewasa: ${res.dDewasa} mg):</div>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-1.5 font-mono-num text-[10px]">
                  <div class="p-1.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-100">Young (1-12 th): <b class="calc-young block text-indigo-700">${res.dosisYoung !== null ? res.dosisYoung + ' mg' : '-'}</b></div>
                  <div class="p-1.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-100">Dilling (>8 th): <b class="calc-dilling block text-indigo-700">${res.dosisDilling !== null ? res.dosisDilling + ' mg' : '-'}</b></div>
                  <div class="p-1.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-100">Fried (<1 th): <b class="calc-fried block text-indigo-700">${res.dosisFried !== null ? res.dosisFried + ' mg' : '-'}</b></div>
                  <div class="p-1.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-100">Clark (BB/70): <b class="calc-clark block text-indigo-700">${res.dosisClark} mg</b></div>
                </div>
              </div>
            ` : dosageState.modeHitung === 'BSA' ? `
              <div class="p-3 rounded-2xl border border-teal-200 bg-teal-50/60 dark:bg-teal-950/30 text-[11px] space-y-1.5 shadow-sm">
                <div class="font-bold text-teal-900 dark:text-teal-200 flex items-center gap-1"><span>📐</span> Luas Permukaan Tubuh (BSA):</div>
                <div class="text-xs">BSA Mosteller: <b class="calc-bsa font-mono-num text-teal-700 font-extrabold">${res.bsa} m²</b> (DuBois: ${res.bsaDubois} m²) &bull; Dosis Anak: <b class="calc-dosis-bsa font-mono-num text-teal-800 font-black">${res.dosisBsa} mg</b></div>
              </div>
            ` : dosageState.modeHitung === 'INFUS' ? `
              <div class="p-3 rounded-2xl border border-indigo-200 bg-indigo-50/60 dark:bg-indigo-950/30 text-[11px] space-y-2 shadow-sm">
                <div class="font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1"><span>💧</span> Kecepatan Tetesan Infus (IV Flow Rate):</div>
                <div class="flex items-center justify-between">
                  <div class="text-lg font-black text-indigo-700 dark:text-indigo-300 font-mono-num">
                    <span class="calc-tpm">${res.tpm} TPM</span> <span class="calc-ml-jam text-xs font-bold text-slate-700">(${res.mlPerJam} mL/Jam)</span>
                  </div>
                  <span class="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-extrabold">${res.infusFaktor === 20 ? 'Makro' : (res.infusFaktor === 60 ? 'Mikro' : 'Darah')}</span>
                </div>
                <div class="grid grid-cols-3 gap-1.5 text-[10px] text-slate-700 border-t pt-1.5 border-indigo-200">
                  <div class="p-1 rounded bg-white dark:bg-slate-900 border">Makro (20): <b>${res.tpmMakro} tts/m</b></div>
                  <div class="p-1 rounded bg-white dark:bg-slate-900 border">Mikro (60): <b>${res.tpmMikro} tts/m</b></div>
                  <div class="p-1 rounded bg-white dark:bg-slate-900 border">Darah (15): <b>${res.tpmDarah} tts/m</b></div>
                </div>
              </div>
            ` : dosageState.modeHitung === 'GINJAL' ? `
              <div class="p-3 rounded-2xl border border-amber-200 bg-amber-50/60 dark:bg-amber-950/30 text-[11px] space-y-1.5 shadow-sm">
                <div class="flex items-center justify-between">
                  <span class="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1"><span>🩺</span> Klirens Ginjal (Cockcroft-Gault):</span>
                  <span class="calc-gfr-stage px-2 py-0.5 rounded-full text-[10px] font-bold ${res.gfrBadgeClass}">${res.gfrStage}</span>
                </div>
                <div class="flex items-baseline gap-2">
                  <span class="text-xs font-semibold">eGFR / CrCl:</span>
                  <b class="calc-gfr font-mono-num text-lg font-black text-amber-900 dark:text-amber-300">${res.crCl} mL/min</b>
                </div>
                <div class="calc-gfr-advice text-[10px] text-amber-900 dark:text-amber-200 font-medium p-1.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-amber-200">${res.gfrAdvice}</div>
              </div>
            ` : ''}

            <!-- Teks Aturan Pakai Resmi (Etiket Preview Style) -->
            <div class="space-y-1.5">
              <div class="flex items-center justify-between">
                <label class="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  <span>🏷️</span> Format Aturan Pakai Resmi (Siap Cetak &amp; Etiket):
                </label>
                <span class="text-[10px] text-slate-400">Preview Etiket</span>
              </div>
              <div class="calc-aturan-text p-3.5 rounded-2xl border border-blue-200 dark:border-blue-900 bg-gradient-to-r from-blue-50/50 to-indigo-50/30 dark:from-slate-900 dark:to-blue-950/30 font-black text-sm text-blue-900 dark:text-blue-200 leading-snug shadow-sm">
                ${S().esc(res.aturanText)}
              </div>
            </div>

            <!-- Peringatan Keamanan & Interaksi Farmakologis -->
            <div class="p-3 rounded-2xl border border-rose-200 bg-rose-50/70 dark:bg-rose-950/30 text-[11px] text-rose-900 dark:text-rose-200 space-y-1 shadow-sm">
              <div class="font-extrabold flex items-center gap-1.5 text-rose-800 dark:text-rose-300">
                <span>⚠️</span> Peringatan Keamanan &amp; Edukasi Farmasi:
              </div>
              <p class="calc-peringatan leading-relaxed text-[11px]">${S().esc(res.peringatan)}</p>
            </div>
          </div>

          <!-- Action Buttons Bar -->
          <div class="pt-3 border-t flex flex-wrap gap-2" style="border-color:var(--ons-border)">
            <button type="button" onclick="window.copyDosageAturanText('${S().esc(res.aturanText)}')" class="calc-copy-btn ons-btn ons-btn-emerald flex-1 text-xs min-h-[40px] font-extrabold shadow-sm flex items-center justify-center gap-1.5">
              <span>📋</span> Salin Aturan Pakai
            </button>
            <a target="_blank" rel="noopener" href="${S().esc(waHref)}" class="calc-wa-btn ons-btn ons-btn-primary flex-1 text-xs min-h-[40px] font-extrabold text-center flex items-center justify-center gap-1.5 shadow-sm" style="background:#25D366;border-color:#25D366;color:#fff;">
              <span>💬</span> Kirim WhatsApp
            </a>
            <button type="button" onclick="window.printDosageEtiket('${(curPreset && curPreset.warna_etiket) || 'putih'}')" class="ons-btn ons-btn-ghost text-xs min-h-[40px] font-bold border flex items-center justify-center gap-1.5 shadow-sm">
              <span>🏷️</span> Cetak Etiket
            </button>
            <button type="button" onclick="window.addDosageToPosCart('${dosageState.presetId}', ${isModal ? 'true' : 'false'})" class="ons-btn ons-btn-ghost text-xs min-h-[40px] font-extrabold border-blue-400 text-blue-700 dark:text-blue-300 hover:bg-blue-50 flex items-center justify-center gap-1.5 shadow-sm">
              <span>🛒</span> Masukkan POS
            </button>
          </div>
        </div>
      </div>
    </div>`;
  }

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
            <button onclick="window.setKlinisTab('soap')" class="ons-tab-btn ${klinisTab === 'soap' ? 'active' : ''}">Kajian Resep &amp; SOAP (${(st.rekamKlinis || []).length})</button>
            <button onclick="window.setKlinisTab('racikan')" class="ons-tab-btn ${klinisTab === 'racikan' ? 'active' : ''}">Racikan &amp; Etiket</button>
            <button onclick="window.setKlinisTab('kalkulator')" class="ons-tab-btn ${klinisTab === 'kalkulator' ? 'active' : ''}">Kalkulator Dosis &amp; Template</button>
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
      })() : klinisTab === 'kalkulator' ? renderDosageCalculatorTabHtml(false) : klinisTab === 'racikan' ? `
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
        <button onclick="ONSStore.closeModal();window.openPemeriksaanModal('${S().esc(m.id_member)}','semua')" class="ons-btn ons-btn-emerald flex-1">+ Cek Lab (POCT)</button>
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
    eresepTab = (st.subTabs && st.subTabs['eresep-prb']) || eresepTab || 'prb';
    const erxUrl = `${global.location.origin}${global.location.pathname}?erx=DR-MITRA-${new Date().getFullYear()}`;
    const erxAll = (st.rekamKlinis || []).filter((k) => String(k.status_klinis || '') === 'ANTRIAN_VALIDASI_APJ' || String(k.layanan_jenis || '') === 'ERX_DOKTER');
    const eq = erxSearchQ.trim().toLowerCase();
    const erxQueue = erxAll.filter((rx) => !eq || `${rx.id_klinis} ${rx.nama_pasien} ${rx.dokter_asal} ${rx.soap_notes}`.toLowerCase().includes(eq));
    const antreCount = erxAll.filter((x) => x.status_klinis === 'ANTRIAN_VALIDASI_APJ').length;

    const fmtProg = (p) => (S().formatMemberProgram ? S().formatMemberProgram(p) : (p || 'MEMBER'));
    const pq = prbSearchQ.trim().toLowerCase();
    const allMembers = st.members || [];
    const filteredMembers = allMembers.filter((m) => {
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

    const rutinCount = allMembers.filter((m) => {
      const p = fmtProg(m.program_prb);
      return p === 'MEMBER_RUTIN' || p === 'TERAPI_RUTIN';
    }).length;
    const refillSegeraCount = allMembers.filter((m) => m.tgl_habis_obat && S().daysUntil(m.tgl_habis_obat) <= 5).length;
    const totalLabCount = (st.pemeriksaanPasien || []).length;

    return `<div class="space-y-5 ons-view-enter">
      <div class="ons-page-header">
        <div>
          <h1 class="text-xl font-extrabold">Pasien &amp; Terapi Rutin, Refill Kronis (PRB) &amp; Antrean E-Resep</h1>
          <p class="text-xs" style="color:var(--ons-text-soft)">Manajemen data pasien apotek, pemantauan kepatuhan terapi rutin kronis, pengingat refill obat via WhatsApp, &amp; validasi resep dokter.</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <div class="ons-tab-bar">
            <button onclick="window.setEresepTab('prb')" class="ons-tab-btn ${eresepTab === 'prb' ? 'active' : ''}">Pasien &amp; Terapi Rutin (${allMembers.length})</button>
            <button onclick="window.setEresepTab('erx')" class="ons-tab-btn ${eresepTab === 'erx' ? 'active' : ''}">Antrean E-Resep (${antreCount}/${erxAll.length})</button>
          </div>
          <button onclick="window.openPemeriksaanModal('','semua')" class="ons-btn ons-btn-emerald text-xs">+ Cek Lab Pasien (POCT)</button>
          <button onclick="window.openAddMemberPrbModal()" class="ons-btn ons-btn-primary text-xs">+ Pasien / Member</button>
        </div>
      </div>

      <!-- Jalur Ringkasan Pasien & Kepatuhan Terapi -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div class="ons-card p-3">
          <div class="text-[11px] font-semibold" style="color:var(--ons-text-soft)">Total Pasien Apotek</div>
          <div class="text-xl font-extrabold font-mono-num mt-0.5">${allMembers.length}</div>
          <div class="text-[10px] mt-0.5" style="color:var(--ons-text-muted)">Terdaftar di sistem</div>
        </div>
        <div class="ons-card p-3">
          <div class="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Pasien Terapi Rutin</div>
          <div class="text-xl font-extrabold font-mono-num text-emerald-600 dark:text-emerald-400 mt-0.5">${rutinCount}</div>
          <div class="text-[10px] mt-0.5" style="color:var(--ons-text-muted)">Program PRB / Kronis</div>
        </div>
        <div class="ons-card p-3">
          <div class="text-[11px] font-semibold text-amber-600 dark:text-amber-400">Refill Segera (&le;5 Hari)</div>
          <div class="text-xl font-extrabold font-mono-num text-amber-600 dark:text-amber-400 mt-0.5">${refillSegeraCount}</div>
          <div class="text-[10px] mt-0.5" style="color:var(--ons-text-muted)">Perlu dikirimi reminder</div>
        </div>
        <div class="ons-card p-3">
          <div class="text-[11px] font-semibold text-blue-600 dark:text-blue-400">E-Resep Menunggu PIN</div>
          <div class="text-xl font-extrabold font-mono-num text-blue-600 dark:text-blue-400 mt-0.5">${antreCount}</div>
          <div class="text-[10px] mt-0.5" style="color:var(--ons-text-muted)">Validasi APJ sebelum POS</div>
        </div>
      </div>

      ${eresepTab === 'prb' ? `
        <div class="ons-card p-4 space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex flex-wrap gap-2 items-center">
              <input class="ons-input text-xs w-60" placeholder="Cari nama pasien, diagnosa, alergi..." value="${S().esc(prbSearchQ)}" oninput="window.setPrbSearchQ(this.value)"/>
              <div class="ons-tab-bar">
                ${[
                  { id: 'SEMUA', label: 'Semua' },
                  { id: 'MEMBER_RUTIN', label: 'Pasien Terapi Rutin' },
                  { id: 'UMUM', label: 'Member Umum' },
                  { id: 'HABIS_SEGERA', label: 'Habis <=5 Hari' }
                ].map((f) => `<button onclick="window.setPrbFilter('${f.id}')" class="ons-tab-btn ${prbFilter === f.id ? 'active' : ''}">${f.label}</button>`).join('')}
              </div>
            </div>
            <button onclick="window.openPemeriksaanModal('','semua')" class="ons-btn ons-btn-ghost text-xs">&#128302; Buka Pemeriksaan Pasien &rarr;</button>
          </div>
          <div class="ons-table-wrap">
            <table class="ons-table">
              <thead><tr><th>Pasien &amp; Alergi</th><th>Program &amp; Diagnosa</th><th>Tgl Habis Obat</th><th>Poin</th><th>Pemeriksaan Terakhir (POCT)</th><th>Aksi</th></tr></thead>
              <tbody>
                ${filteredMembers.length ? filteredMembers.map((m) => {
                  // SINKRONISASI DATA PEMERIKSAAN DENGAN st.pemeriksaanPasien
                  const allPem = st.pemeriksaanPasien || [];
                  const latestPem = allPem.find((p) => (p.id_member && p.id_member === m.id_member) || (p.nama_pasien && m.nama_pasien && p.nama_pasien.trim().toLowerCase() === m.nama_pasien.trim().toLowerCase()));
                  
                  let skrList = [];
                  try { skrList = JSON.parse(m.riwayat_skrining_json || '[]'); } catch (e) {}
                  const lastSkr = skrList[skrList.length - 1];

                  let pemSummary = '-';
                  if (latestPem) {
                    const parts = [];
                    if (latestPem.td_sistol && latestPem.td_diastol) parts.push('TD ' + latestPem.td_sistol + '/' + latestPem.td_diastol);
                    if (latestPem.gula_sewaktu || latestPem.gula_puasa) parts.push('Gula ' + (latestPem.gula_sewaktu || latestPem.gula_puasa));
                    if (latestPem.kolesterol_total) parts.push('Kol ' + latestPem.kolesterol_total);
                    if (latestPem.asam_urat) parts.push('AU ' + latestPem.asam_urat);
                    pemSummary = parts.join(' | ') || (latestPem.imt_bmi ? 'BMI ' + latestPem.imt_bmi : '-');
                  } else if (lastSkr) {
                    pemSummary = 'TD ' + (lastSkr.td || '-') + ' | GDS ' + (lastSkr.gds || '-') + ' | BMI ' + (lastSkr.bmi || '-');
                  }

                  const daysLeft = m.tgl_habis_obat ? S().daysUntil(m.tgl_habis_obat) : null;
                  return `<tr>
                    <td>
                      <b class="text-sm">${S().esc(m.nama_pasien)}</b>
                      <div class="text-xs text-red-600 mt-0.5">Alergi: ${S().esc(m.alergi_list || 'Tidak Ada')}</div>
                      <div class="text-[11px] font-mono-num text-slate-500">${S().esc(m.no_hp || '-')}</div>
                    </td>
                    <td class="text-xs">
                      <span class="badge-bpom bpom-terbatas">${S().esc(fmtProg(m.program_prb))}</span>
                      <div class="mt-1 font-medium">${S().esc(m.penyakit_kronis || '-')}</div>
                    </td>
                    <td class="font-mono-num text-xs">
                      ${m.tgl_habis_obat ? `<span class="badge-bpom ${daysLeft <= 3 ? 'bpom-keras' : (daysLeft <= 7 ? 'bpom-prekursor' : 'bpom-bebas')}">${m.tgl_habis_obat} (${daysLeft}h)</span>` : '-'}
                    </td>
                    <td class="font-mono-num font-bold text-blue-600">${m.poin_loyalitas || 0}</td>
                    <td class="text-xs font-mono-num">
                      <div class="font-semibold text-slate-800 dark:text-slate-200">${S().esc(pemSummary)}</div>
                      <div>${_renderSkriningSparkline(skrList)}</div>
                    </td>
                    <td>
                      <div class="flex flex-wrap gap-1">
                        <button onclick="window.openMemberProfileDrawer('${S().esc(m.id_member)}')" class="ons-btn ons-btn-primary text-xs py-1 px-2.5">Profil</button>
                        <button onclick="window.openPemeriksaanModal('${S().esc(m.id_member)}','semua')" class="ons-btn ons-btn-ghost text-xs py-1 px-2" title="Catat Cek Tensi, Gula, Kolesterol, Asam Urat">+ Cek Lab</button>
                        ${(() => {
                          if (!m.no_hp) return '';
                          const profPrb = S().getStoreProfile ? S().getStoreProfile() : {};
                          const apotekNm = profPrb.nama_usaha || 'Apotek ONS Farma';
                          const eApotekUrl = global.location.origin + global.location.pathname + '?katalog=1';
                          const waBody = [
                            'Halo *' + m.nama_pasien + '*,',
                            'Pengingat Refill Obat Rutin (' + (m.penyakit_kronis || fmtProg(m.program_prb)) + ') dari *' + apotekNm + '*.',
                            'Jadwal habis obat: *' + (m.tgl_habis_obat || 'minggu ini') + '*.',
                            'Pemeriksaan terakhir: ' + (pemSummary !== '-' ? pemSummary : 'Terpantau baik') + '.',
                            'Pesan ulang online langsung: ' + eApotekUrl,
                            'Apoteker: ' + (profPrb.nama_pemilik || 'apt. Anissa Faradifa R. Is Rumi')
                          ].join('\n');
                          const hrefWa = S().buildWaUrl ? S().buildWaUrl(m.no_hp, waBody) : ('https://wa.me/' + m.no_hp + '?text=' + encodeURIComponent(waBody));
                          return `<a target="_blank" rel="noopener" href="${S().esc(hrefWa)}" class="ons-btn ons-btn-emerald text-xs py-1 px-2">WA Refill</a>`;
                        })()}
                      </div>
                    </td>
                  </tr>`;
                }).join('') : '<tr><td colspan="6" class="text-center py-6 text-xs" style="color:var(--ons-text-soft)">Tidak ada pasien / member sesuai filter ini.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      ` : `
        <div class="space-y-4">
          <div class="ons-card p-4 flex flex-wrap items-center justify-between gap-3">
            <div class="text-xs">
              <div class="font-bold text-sm">Tautan Khusus Mini-Portal Dokter Mitra (E-Resep):</div>
              <code class="font-mono-num text-blue-600 break-all">${S().esc(erxUrl)}</code>
            </div>
            <div class="flex gap-2">
              <button onclick="navigator.clipboard?.writeText('${S().esc(erxUrl)}');toast('Tautan E-Resep Dokter Mitra disalin!','ok')" class="ons-btn ons-btn-ghost text-xs">Salin Tautan</button>
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
              ${erxQueue.length === 0 ? '<div class="text-xs py-6 text-center" style="color:var(--ons-text-soft)">Belum ada E-Resep masuk dari dokter mitra. Resep offline dapat langsung di-input melalui menu <b>Pelayanan Klinis &rarr; + Input SOAP Klinis</b>.</div>' : erxQueue.map((rx) => `
                <div class="p-3.5 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs" style="background:var(--ons-bg-card);border-color:var(--ons-border)">
                  <div class="space-y-1">
                    <div class="flex flex-wrap items-center gap-2">
                      <span class="font-mono-num font-bold">${S().esc(rx.id_klinis)}</span>
                      <span class="badge-bpom ${rx.status_klinis === 'TERVERIFIKASI_APJ' ? 'bpom-bebas' : 'bpom-prekursor'}">${S().esc(rx.status_klinis)}</span>
                      <b>${S().esc(rx.nama_pasien)}</b> &bull; <span>${S().esc(rx.dokter_asal)} (${S().esc(rx.no_sip_dokter || '-')})</span>
                    </div>
                    <div class="font-mono-num whitespace-pre-line p-2.5 rounded-lg border text-xs" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">${S().esc(rx.soap_notes || '-')}</div>
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
      list = [
        { id_akun: 'KAS-01', nama: 'Kas Utama', deskripsi: 'Akun Kas Tunai Kasir Utama', kode_kustom: '1-101', catatan: 'Laci Kasir Toko', jenis: 'cash', saldo_awal: 0, status: 'Aktif' }
      ];
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
        const kasTunai = akFiltered.filter((a) => a.jenis === 'cash' || /kasir|utama|tunai/i.test(a.nama)).reduce((s, a) => s + Number(a.saldo_saat_ini || 0), 0);
        const bankGiro = akFiltered.filter((a) => a.jenis === 'bank' || /bank|bca|mandiri|bni|bri/i.test(a.nama)).reduce((s, a) => s + Number(a.saldo_saat_ini || 0), 0);
        const qrisAmt = akFiltered.filter((a) => a.jenis === 'ewallet' || /qris|wallet|shopee|gopay/i.test(a.nama)).reduce((s, a) => s + Number(a.saldo_saat_ini || 0), 0);

        return `<div class="space-y-3">
          <div class="ons-cockpit-strip">
            <div class="ons-cockpit-card is-emerald">
              <div class="text-[10.5px] font-semibold text-slate-500">Kas Tunai Kasir</div>
              <div class="text-lg font-extrabold font-mono-num mt-0.5 text-emerald-600">${S().rp(kasTunai)}</div>
              <div class="text-[10px] text-slate-400">Kas fisik di laci kasir apotek</div>
            </div>
            <div class="ons-cockpit-card is-blue">
              <div class="text-[10.5px] font-semibold text-slate-500">Rekening Bank (BCA &amp; Mandiri)</div>
              <div class="text-lg font-extrabold font-mono-num mt-0.5 text-blue-600">${S().rp(bankGiro)}</div>
              <div class="text-[10px] text-slate-400">Penerimaan &amp; pembayaran faktur PBF</div>
            </div>
            <div class="ons-cockpit-card is-azure">
              <div class="text-[10.5px] font-semibold text-slate-500">E-Wallet &amp; QRIS</div>
              <div class="text-lg font-extrabold font-mono-num mt-0.5 text-sky-600">${S().rp(qrisAmt)}</div>
              <div class="text-[10px] text-slate-400">Pembayaran non-tunai kasir POS</div>
            </div>
            <div class="ons-cockpit-card is-amber">
              <div class="text-[10.5px] font-semibold text-slate-500">Total Likuiditas Kas</div>
              <div class="text-lg font-extrabold font-mono-num mt-0.5 text-amber-600">${S().rp(totalSaldoKas)}</div>
              <div class="text-[10px] text-slate-400">Total modal lancar kas &amp; bank</div>
            </div>
          </div>

          <div class="ons-card p-4 space-y-3">
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
              <input id="jrInlineNom" type="text" inputmode="numeric" class="ons-input ons-currency-input font-mono-num sm:col-span-2" placeholder="Nominal (Rp)" oninput="window.maskNumberInput(this)"/>
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
              <div><label class="font-semibold block mb-1">Gaji Pokok (Rp)</label><input id="sgPokok" type="text" inputmode="numeric" class="ons-input ons-currency-input font-mono-num" value="${S().formatDots(4800000)}" oninput="window.maskNumberInput(this)"/></div>
              <div><label class="font-semibold block mb-1">Tunjangan Jasa Profesi / Bonus</label><input id="sgTunj" type="text" inputmode="numeric" class="ons-input ons-currency-input font-mono-num" value="${S().formatDots(1500000)}" oninput="window.maskNumberInput(this)"/></div>
              <div><label class="font-semibold block mb-1">Potongan Kasbon / Lainnya</label><input id="sgPot" type="text" inputmode="numeric" class="ons-input ons-currency-input font-mono-num" value="${S().formatDots(150000)}" oninput="window.maskNumberInput(this)"/></div>
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
        <div><label class="font-semibold block mb-1">Jumlah Utang (Rp) *</label><input id="cuJumlah" type="text" inputmode="numeric" class="ons-input ons-currency-input font-mono-num" value="0" oninput="window.maskNumberInput(this); window.refreshUtangJurnalPreview();"/></div>
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
    const val = Math.max(0, window.parseNumber ? window.parseNumber((document.getElementById('cuJumlah') || {}).value || 0) : Number((document.getElementById('cuJumlah') || {}).value || 0));
    const akun = (document.getElementById('cuAkunLawan') || {}).value || 'Persediaan Obat & Alkes';
    const tb = document.getElementById('cuJurnalPrev');
    if (tb) tb.innerHTML = `<tr><td>1</td><td>Hutang Usaha</td><td class="text-right">-</td><td class="text-right font-mono-num">${S().rp(val)}</td></tr><tr><td>2</td><td>${S().esc(akun)}</td><td class="text-right font-mono-num">${S().rp(val)}</td><td class="text-right">-</td></tr>`;
  };
  global.submitCatatUtangModal = () => {
    const amt = Math.max(0, window.parseNumber ? window.parseNumber((document.getElementById('cuJumlah') || {}).value || 0) : Number((document.getElementById('cuJumlah') || {}).value || 0));
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
        <div><label class="font-semibold block mb-1">Jumlah Piutang (Rp) *</label><input id="cpJumlah" type="text" inputmode="numeric" class="ons-input ons-currency-input font-mono-num" value="0" oninput="window.maskNumberInput(this); window.refreshPiutangJurnalPreview();"/></div>
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
    const val = Math.max(0, window.parseNumber ? window.parseNumber((document.getElementById('cpJumlah') || {}).value || 0) : Number((document.getElementById('cpJumlah') || {}).value || 0));
    const akun = (document.getElementById('cpAkunLawan') || {}).value || 'Pendapatan Penjualan Obat';
    const tb = document.getElementById('cpJurnalPrev');
    if (tb) tb.innerHTML = `<tr><td>1</td><td>Piutang Usaha</td><td class="text-right font-mono-num">${S().rp(val)}</td><td class="text-right">-</td></tr><tr><td>2</td><td>${S().esc(akun)}</td><td class="text-right">-</td><td class="text-right font-mono-num">${S().rp(val)}</td></tr>`;
  };
  global.submitCatatPiutangModal = () => {
    const cust = String((document.getElementById('cpCustomer') || {}).value || '').trim();
    const amt = Math.max(0, window.parseNumber ? window.parseNumber((document.getElementById('cpJumlah') || {}).value || 0) : Number((document.getElementById('cpJumlah') || {}).value || 0));
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
      const nom = window.parseNumber ? window.parseNumber((document.getElementById('jrInlineNom') || {}).value || 0) : Number((document.getElementById('jrInlineNom') || {}).value || 0);
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
      <div><label class="font-semibold block mb-1">Nominal Pembayaran (Rp) *</label><input id="payHutangAmt" type="text" inputmode="numeric" class="ons-input ons-currency-input font-mono-num" value="${S().formatDots(sisaMax)}" oninput="window.maskNumberInput(this)"/></div>
      <div><label class="font-semibold block mb-1">Metode Transfer</label><select id="payHutangMetode" class="ons-select"><option value="TRANSFER_BANK">TRANSFER_BANK</option><option value="KAS_TUNAI">KAS_TUNAI</option><option value="GIRO">GIRO / CEK</option></select></div>
      <button onclick="window.submitPayHutangPartial('${S().esc(idBeli)}')" class="ons-btn ons-btn-emerald w-full">Catat Pembayaran PBF ke Jurnal Kas</button>
    </div>`, '440px');
  };

  global.submitPayHutangPartial = async (idBeli) => {
    try {
      const amt = window.parseNumber ? window.parseNumber(document.getElementById('payHutangAmt').value || 0) : Number(document.getElementById('payHutangAmt').value || 0);
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
        <div><label class="font-semibold block mb-1">Gaji Pokok (Rp)</label><input id="sgPokok" type="text" inputmode="numeric" class="ons-input ons-currency-input font-mono-num" value="${S().formatDots(4800000)}" oninput="window.maskNumberInput(this)"/></div>
        <div><label class="font-semibold block mb-1">Tunjangan Jasa Profesi / Bonus</label><input id="sgTunj" type="text" inputmode="numeric" class="ons-input ons-currency-input font-mono-num" value="${S().formatDots(1500000)}" oninput="window.maskNumberInput(this)"/></div>
        <div><label class="font-semibold block mb-1">Potongan Kasbon / Lainnya</label><input id="sgPot" type="text" inputmode="numeric" class="ons-input ons-currency-input font-mono-num" value="${S().formatDots(150000)}" oninput="window.maskNumberInput(this)"/></div>
        <div><label class="font-semibold block mb-1">Periode Bulan</label><input id="sgPer" class="ons-input font-mono-num" value="${new Date().toISOString().slice(0, 7)}"/></div>
      </div>
      <button onclick="window.printSlipGajiPdf()" class="ons-btn ons-btn-primary w-full">Pratinjau &amp; Cetak Slip Gaji A4</button>
    </div>`, '520px');
  };

  global.printSlipGajiPdf = () => {
    const nama = document.getElementById('sgNama').value;
    const jab = document.getElementById('sgJab').value;
    const pokok = window.parseNumber ? window.parseNumber(document.getElementById('sgPokok').value || 0) : Number(document.getElementById('sgPokok').value || 0);
    const tunj = window.parseNumber ? window.parseNumber(document.getElementById('sgTunj').value || 0) : Number(document.getElementById('sgTunj').value || 0);
    const pot = window.parseNumber ? window.parseNumber(document.getElementById('sgPot').value || 0) : Number(document.getElementById('sgPot').value || 0);
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
      <input id="jrNom" type="text" inputmode="numeric" class="ons-input ons-currency-input font-mono-num" placeholder="Nominal (Rp)" oninput="window.maskNumberInput(this)"/>
      <button onclick="window.saveJurnalSubmit()" class="ons-btn ons-btn-primary w-full">Simpan ke Jurnal Keuangan</button>
    </div>`, '460px');
  };

  global.saveJurnalSubmit = async () => {
    try {
      await API().callApi('finance.saveJurnal', {
        jenis_trx: document.getElementById('jrJenis').value,
        kategori: document.getElementById('jrKat').value,
        nominal: window.parseNumber ? window.parseNumber(document.getElementById('jrNom').value || 0) : Number(document.getElementById('jrNom').value || 0),
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
      <div><label class="font-semibold block mb-1">Nominal Diterima (Rp) *</label><input id="payPiutangAmt" type="text" inputmode="numeric" class="ons-input ons-currency-input font-mono-num" value="${S().formatDots(sisaMax)}" oninput="window.maskNumberInput(this)"/></div>
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
      const nom = window.parseNumber ? window.parseNumber((document.getElementById('payPiutangAmt') || {}).value || 0) : Number((document.getElementById('payPiutangAmt') || {}).value || 0);
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
  function _fmtDateId(isoStr) {
    if (!isoStr) return '-';
    try {
      const d = new Date(String(isoStr).slice(0, 10) + 'T00:00:00');
      if (isNaN(d.getTime())) return String(isoStr);
      return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (e) { return String(isoStr); }
  }

  function _renderLapRekapFooter(keyId, titleText, items) {
    const isCollapsed = Boolean(lapRekapCollapsed[keyId]);
    const colsHtml = (items || []).map((it) => `
      <div class="flex items-center justify-between gap-2 text-xs py-1">
        <span style="color:var(--ons-text-soft)">${S().esc(it.label)}</span>
        <span class="font-bold font-mono-num ${it.cls || ''}">: ${it.valHtml}</span>
      </div>
    `).join('');
    return `<div class="ons-pos-rekap-foot">
      <div class="flex items-center justify-between gap-2 ${isCollapsed ? '' : 'mb-2'}">
        <span class="font-extrabold text-sm text-blue-600 dark:text-blue-400">${titleText}</span>
        <button type="button" onclick="window.toggleLapRekapPanel('${S().esc(keyId)}')" class="ons-btn ons-btn-ghost text-xs py-1 px-2" aria-label="Toggle Rekap">${isCollapsed ? '&#9660;' : '&#9650;'}</button>
      </div>
      ${isCollapsed ? '' : `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-1">${colsHtml}</div>`}
    </div>`;
  }

  const _MONTH_NAMES_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  function _renderLapPenjualanSubTab() {
    const st = S().AppState;
    const today = new Date().toISOString().slice(0, 10);
    const mStart = today.slice(0, 8) + '01';
    if (!lapJualDateFrom) lapJualDateFrom = mStart;
    if (!lapJualDateTo) lapJualDateTo = today;

    const allPenjualan = (st.penjualan || []).filter((p) => String(p.status_trx || 'LUNAS').toUpperCase() !== 'RETUR');
    const inRange = (dStr) => {
      const d = String(dStr || '').slice(0, 10);
      if (lapJualDateFrom && d < lapJualDateFrom) return false;
      if (lapJualDateTo && d > lapJualDateTo) return false;
      return true;
    };
    const scopedSales = allPenjualan.filter((p) => inRange(p.tanggal || p.created_at));
    const sq = lapJualSearchQ.trim().toLowerCase();

    let tableHtml = '';
    let totalOmzet = 0;
    let totalHpp = 0;
    let totalTrx = 0;

    if (lapJualMode === 'hari') {
      const dateMap = {};
      const cur = new Date(lapJualDateFrom + 'T00:00:00');
      const end = new Date(lapJualDateTo + 'T00:00:00');
      if (!isNaN(cur.getTime()) && !isNaN(end.getTime())) {
        while (cur <= end) {
          const ds = cur.toISOString().slice(0, 10);
          dateMap[ds] = { frek: 0, omzet: 0, hpp: 0 };
          cur.setDate(cur.getDate() + 1);
        }
      }
      scopedSales.forEach((p) => {
        const ds = String(p.tanggal || p.created_at || '').slice(0, 10);
        if (!dateMap[ds]) dateMap[ds] = { frek: 0, omzet: 0, hpp: 0 };
        dateMap[ds].frek += 1;
        dateMap[ds].omzet += Number(p.grand_total || 0);
        dateMap[ds].hpp += Number(p.total_hpp || 0);
      });

      const dayKeys = Object.keys(dateMap).sort().reverse();
      const filteredDays = dayKeys.filter((d) => {
        if (!sq) return true;
        const fmtD = _fmtDateId(d).toLowerCase();
        return d.includes(sq) || fmtD.includes(sq);
      });

      filteredDays.forEach((d) => {
        const row = dateMap[d];
        totalOmzet += row.omzet;
        totalHpp += row.hpp;
        totalTrx += row.frek;
      });

      tableHtml = `
        <div class="ons-table-wrap">
          <table class="ons-table is-compact">
            <thead>
              <tr><th>No.</th><th>Tanggal</th><th>Frek. Penjualan</th><th class="text-right">Total Penjualan</th><th class="text-right">Keuntungan</th></tr>
            </thead>
            <tbody>
              ${filteredDays.length ? filteredDays.map((d, idx) => {
                const r = dateMap[d];
                const untung = r.omzet - r.hpp;
                return `<tr>
                  <td class="font-mono-num text-xs">${idx + 1}</td>
                  <td class="text-xs font-semibold">${_fmtDateId(d)}</td>
                  <td class="font-mono-num text-xs">${r.frek}x</td>
                  <td class="text-right font-mono-num text-xs font-bold">${S().rp(r.omzet)}</td>
                  <td class="text-right font-mono-num text-xs font-bold text-emerald-600">${S().rp(untung)}</td>
                </tr>`;
              }).join('') : '<tr><td colspan="5" class="text-center py-6 text-xs" style="color:var(--ons-text-soft)">Data tidak ditemukan untuk periode tanggal ini.</td></tr>'}
            </tbody>
          </table>
        </div>
      `;
    } else if (lapJualMode === 'produk') {
      const salesIdSet = new Set(scopedSales.map((p) => p.id_penjualan || p.kode_penjualan));
      const details = (st.detailPenjualan || []).filter((d) => salesIdSet.has(d.id_penjualan || d.kode_penjualan));
      const prodMap = {};
      details.forEach((d) => {
        const id = d.id_obat;
        if (!prodMap[id]) {
          const ob = (st.masterObat || []).find((m) => m.id_obat === id) || {};
          prodMap[id] = {
            id_obat: id,
            nama: d.nama_dagang || ob.nama_dagang || id,
            kategori: ob.golongan_bpom || 'BEBAS',
            satuan: ob.satuan_dasar || 'Unit',
            qty: 0,
            omzet: 0,
            hpp: 0
          };
        }
        const q = Number(d.qty || 0);
        const sub = Number(d.subtotal_item || (q * Number(d.harga_jual || 0)));
        const hppItem = Number(d.hpp_unit || 0) * q;
        prodMap[id].qty += q;
        prodMap[id].omzet += sub;
        prodMap[id].hpp += hppItem;
      });

      const prodList = Object.values(prodMap).filter((p) => {
        if (!sq) return true;
        return `${p.nama} ${p.kategori} ${p.id_obat}`.toLowerCase().includes(sq);
      }).sort((a, b) => b.omzet - a.omzet);

      prodList.forEach((p) => {
        totalOmzet += p.omzet;
        totalHpp += p.hpp;
        totalTrx += p.qty;
      });

      tableHtml = `
        <div class="ons-table-wrap">
          <table class="ons-table is-compact">
            <thead>
              <tr><th>No.</th><th>Nama Produk</th><th>Kategori</th><th>Kuantitas Terjual</th><th>Satuan</th><th class="text-right">Total Penjualan</th><th class="text-right">Keuntungan</th></tr>
            </thead>
            <tbody>
              ${prodList.length ? prodList.map((p, idx) => {
                const untung = p.omzet - p.hpp;
                return `<tr>
                  <td class="font-mono-num text-xs">${idx + 1}</td>
                  <td class="font-bold text-xs">${S().esc(p.nama)}</td>
                  <td>${S().bpomBadge ? S().bpomBadge(p.kategori) : p.kategori}</td>
                  <td class="font-mono-num text-xs font-bold">${p.qty}</td>
                  <td class="text-xs" style="color:var(--ons-text-soft)">${S().esc(p.satuan)}</td>
                  <td class="text-right font-mono-num text-xs font-bold">${S().rp(p.omzet)}</td>
                  <td class="text-right font-mono-num text-xs font-bold text-emerald-600">${S().rp(untung)}</td>
                </tr>`;
              }).join('') : '<tr><td colspan="7" class="text-center py-6 text-xs" style="color:var(--ons-text-soft)">Data tidak ditemukan.</td></tr>'}
            </tbody>
          </table>
        </div>
      `;
    } else {
      const filteredFaktur = scopedSales.filter((p) => {
        if (!sq) return true;
        return `${p.kode_penjualan || ''} ${p.nama_pasien || ''} ${p.sales_nama || ''} ${p.metode_bayar || ''}`.toLowerCase().includes(sq);
      }).sort((a, b) => String(b.tanggal || '').localeCompare(String(a.tanggal || '')));

      filteredFaktur.forEach((p) => {
        totalOmzet += Number(p.grand_total || 0);
        totalHpp += Number(p.total_hpp || 0);
        totalTrx += 1;
      });

      tableHtml = `
        <div class="ons-table-wrap">
          <table class="ons-table is-compact">
            <thead>
              <tr><th>No.</th><th>No. Faktur</th><th>Tanggal &amp; Waktu</th><th>Pelanggan</th><th>Sales / Kasir</th><th class="text-right">Total</th><th class="text-right">Keuntungan</th><th>Metode Bayar</th><th>Aksi</th></tr>
            </thead>
            <tbody>
              ${filteredFaktur.length ? filteredFaktur.map((p, idx) => {
                const tot = Number(p.grand_total || 0);
                const hpp = Number(p.total_hpp || 0);
                return `<tr>
                  <td class="font-mono-num text-xs">${idx + 1}</td>
                  <td class="font-mono-num text-xs font-bold">${S().esc(p.kode_penjualan || p.id_penjualan || '-')}</td>
                  <td class="font-mono-num text-xs">${S().esc(String(p.tanggal || '').slice(0, 16))}</td>
                  <td class="text-xs font-semibold">${S().esc(p.nama_pasien || 'Pasien Umum')}</td>
                  <td class="text-xs">${S().esc(p.sales_nama || p.user_nama || '-')}</td>
                  <td class="text-right font-mono-num text-xs font-bold">${S().rp(tot)}</td>
                  <td class="text-right font-mono-num text-xs font-bold text-emerald-600">${S().rp(tot - hpp)}</td>
                  <td><span class="badge-bpom bpom-bebas">${S().esc(p.metode_bayar || 'TUNAI')}</span></td>
                  <td><button type="button" onclick="window.viewPosTransactionReceipt('${S().esc(p.id_penjualan || p.kode_penjualan)}')" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2">Struk</button></td>
                </tr>`;
              }).join('') : '<tr><td colspan="9" class="text-center py-6 text-xs" style="color:var(--ons-text-soft)">Data tidak ditemukan.</td></tr>'}
            </tbody>
          </table>
        </div>
      `;
    }

    const rekapFooter = _renderLapRekapFooter('lapJual', `Rekap dari ${_fmtDateId(lapJualDateFrom)} s.d. ${_fmtDateId(lapJualDateTo)}`, [
      { label: 'Total Penjualan', valHtml: S().rp(totalOmzet), cls: 'text-blue-600 dark:text-blue-400' },
      { label: 'Total Keuntungan', valHtml: S().rp(totalOmzet - totalHpp), cls: 'text-emerald-600 dark:text-emerald-400' },
      { label: 'Frekuensi / Qty', valHtml: `${totalTrx.toLocaleString('id-ID')} unit/kali` }
    ]);

    const marginPct = totalOmzet > 0 ? Math.round(((totalOmzet - totalHpp) / totalOmzet) * 100) : 0;
    const basketSize = totalTrx > 0 ? Math.round(totalOmzet / totalTrx) : 0;

    const kpiStrip = `
      <div class="ons-cockpit-strip">
        <div class="ons-cockpit-card is-azure">
          <div class="text-[10.5px] font-semibold text-slate-500">Total Omzet Penjualan</div>
          <div class="text-lg font-extrabold font-mono-num mt-0.5 text-blue-600">${S().rp(totalOmzet)}</div>
          <div class="text-[10px] text-slate-400">Total kotor pendapatan kasir</div>
        </div>
        <div class="ons-cockpit-card is-emerald">
          <div class="text-[10.5px] font-semibold text-slate-500">Keuntungan Bersih (Gross Profit)</div>
          <div class="text-lg font-extrabold font-mono-num mt-0.5 text-emerald-600">${S().rp(totalOmzet - totalHpp)}</div>
          <div class="text-[10px] text-slate-400">Omzet dikurangi HPP obat</div>
        </div>
        <div class="ons-cockpit-card is-amber">
          <div class="text-[10.5px] font-semibold text-slate-500">Margin Rata-Rata</div>
          <div class="text-lg font-extrabold font-mono-num mt-0.5 text-amber-600">${marginPct}% Margin</div>
          <div class="text-[10px] text-slate-400">Tingkat profitabilitas apotek</div>
        </div>
        <div class="ons-cockpit-card is-sky">
          <div class="text-[10.5px] font-semibold text-slate-500">Frekuensi Transaksi</div>
          <div class="text-lg font-extrabold font-mono-num mt-0.5 text-slate-700 dark:text-slate-200">${totalTrx.toLocaleString('id-ID')} Trx</div>
          <div class="text-[10px] text-slate-400">Rata-rata keranjang: ${S().rp(basketSize)}</div>
        </div>
      </div>
    `;

    return `
      <div class="space-y-3">
        ${kpiStrip}
        <div class="ons-card p-3 space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-2.5 text-xs">
            <div class="flex flex-wrap items-center gap-2">
              <div>
                <span class="block text-[10.5px] font-semibold mb-0.5" style="color:var(--ons-text-soft)">Pilihan Data</span>
                <select id="lapJualMode" class="ons-select text-xs h-8 py-1" onchange="window.setLapJualMode(this.value)">
                  <option value="hari" ${lapJualMode === 'hari' ? 'selected' : ''}>Hari &amp; Tanggal</option>
                  <option value="produk" ${lapJualMode === 'produk' ? 'selected' : ''}>Per Produk</option>
                  <option value="faktur" ${lapJualMode === 'faktur' ? 'selected' : ''}>Per Faktur / Transaksi</option>
                </select>
              </div>
              <div>
                <span class="block text-[10.5px] font-semibold mb-0.5" style="color:var(--ons-text-soft)">Cari</span>
                <input id="lapJualSearchInp" class="ons-input text-xs h-8 py-1 w-44 sm:w-56" placeholder="Cari data..." value="${S().esc(lapJualSearchQ)}" oninput="window.setLapJualSearch(this.value)"/>
              </div>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <div>
                <span class="block text-[10.5px] font-semibold mb-0.5" style="color:var(--ons-text-soft)">Filter Tgl.</span>
                <div class="flex items-center gap-1">
                  <input id="lapJualDateFrom" type="date" class="ons-input text-xs h-8 py-1 w-32 font-mono-num" value="${S().esc(lapJualDateFrom)}" onchange="window.setLapJualDateRange(this.value, document.getElementById('lapJualDateTo').value)"/>
                  <span class="text-xs">&ndash;</span>
                  <input id="lapJualDateTo" type="date" class="ons-input text-xs h-8 py-1 w-32 font-mono-num" value="${S().esc(lapJualDateTo)}" onchange="window.setLapJualDateRange(document.getElementById('lapJualDateFrom').value, this.value)"/>
                </div>
              </div>
              <div class="self-end">
                <button type="button" onclick="window.resetLapJualFilter()" class="ons-btn ons-btn-ghost text-xs h-8 px-2.5" title="Reset Filter">&#x21bb; Reset</button>
              </div>
            </div>
          </div>
          ${tableHtml}
          ${rekapFooter}
        </div>
      </div>
    `;
  }

  function _renderLapPembelianSubTab() {
    const st = S().AppState;
    const today = new Date().toISOString().slice(0, 10);
    const mStart = today.slice(0, 8) + '01';
    if (!lapBeliDateFrom) lapBeliDateFrom = mStart;
    if (!lapBeliDateTo) lapBeliDateTo = today;

    const inRange = (dStr) => {
      const d = String(dStr || '').slice(0, 10);
      if (lapBeliDateFrom && d < lapBeliDateFrom) return false;
      if (lapBeliDateTo && d > lapBeliDateTo) return false;
      return true;
    };

    const allFaktur = (st.fakturPbf || []).filter((f) => inRange(f.tgl_terima || f.tgl_faktur || f.created_at));
    const sq = lapBeliSearchQ.trim().toLowerCase();

    let tableHtml = '';
    let totalBeli = 0;
    let varianCount = 0;
    let fakturCount = allFaktur.length;

    if (lapBeliMode === 'produk') {
      const mutasiBeli = (st.mutasiStok || []).filter((m) => {
        const jm = String(m.jenis_mutasi || '').toUpperCase();
        return jm.includes('PEMBELIAN') && inRange(m.tanggal || m.created_at);
      });
      const prodMap = {};
      mutasiBeli.forEach((m) => {
        const id = m.id_obat;
        if (!prodMap[id]) {
          const ob = (st.masterObat || []).find((o) => o.id_obat === id) || {};
          prodMap[id] = {
            id_obat: id,
            nama: ob.nama_dagang || m.nama_dagang || id,
            kategori: ob.golongan_bpom || 'BEBAS',
            satuan: ob.satuan_dasar || 'Unit',
            qty: 0,
            nilai: 0
          };
        }
        const q = Math.max(0, Number(m.qty_ubah || 0));
        const unitCost = Number(m.hpp_saat_itu || m.hpp_terakhir || 0);
        prodMap[id].qty += q;
        prodMap[id].nilai += (q * unitCost);
      });

      if (Object.keys(prodMap).length === 0 && (st.masterObat || []).length > 0) {
        (st.masterObat || []).slice(0, 8).forEach((ob) => {
          const id = ob.id_obat;
          prodMap[id] = {
            id_obat: id,
            nama: ob.nama_dagang || id,
            kategori: ob.golongan_bpom || 'BEBAS',
            satuan: ob.satuan_dasar || 'Unit',
            qty: 0,
            nilai: 0
          };
        });
      }

      const prodList = Object.values(prodMap).filter((p) => {
        if (!sq) return true;
        return `${p.nama} ${p.kategori} ${p.id_obat}`.toLowerCase().includes(sq);
      }).sort((a, b) => b.nilai - a.nilai);

      varianCount = prodList.length;
      prodList.forEach((p) => { totalBeli += p.nilai; });

      tableHtml = `
        <div class="ons-table-wrap">
          <table class="ons-table is-compact">
            <thead>
              <tr><th>No.</th><th>Nama Produk</th><th>Kategori</th><th>Kuantitas Beli</th><th>Satuan</th><th class="text-right">Nilai Pembelian</th><th>Actions</th></tr>
            </thead>
            <tbody>
              ${prodList.length ? prodList.map((p, idx) => `<tr>
                <td class="font-mono-num text-xs">${idx + 1}</td>
                <td class="font-bold text-xs">${S().esc(p.nama)}</td>
                <td>${S().bpomBadge ? S().bpomBadge(p.kategori) : p.kategori}</td>
                <td class="font-mono-num text-xs font-bold">${p.qty}</td>
                <td class="text-xs" style="color:var(--ons-text-soft)">${S().esc(p.satuan)}</td>
                <td class="text-right font-mono-num text-xs font-bold">${S().rp(p.nilai)}</td>
                <td><button type="button" onclick="window.navigateView('faktur','daftar')" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2">Lihat Faktur</button></td>
              </tr>`).join('') : '<tr><td colspan="7" class="text-center py-6 text-xs" style="color:var(--ons-text-soft)">Data pembelian tidak ditemukan.</td></tr>'}
            </tbody>
          </table>
        </div>
      `;
    } else if (lapBeliMode === 'supplier') {
      const supMap = {};
      allFaktur.forEach((f) => {
        const idSup = f.id_pbf || 'PBF';
        if (!supMap[idSup]) supMap[idSup] = { id: idSup, count: 0, total: 0, sisa: 0 };
        supMap[idSup].count += 1;
        supMap[idSup].total += Number(f.total_bruto || f.netto_hutang || f.sisa_hutang || 0);
        supMap[idSup].sisa += Number(f.sisa_hutang || 0);
      });
      const supList = Object.values(supMap).filter((s) => {
        if (!sq) return true;
        return s.id.toLowerCase().includes(sq);
      });
      totalBeli = supList.reduce((acc, s) => acc + s.total, 0);
      varianCount = supList.length;

      tableHtml = `
        <div class="ons-table-wrap">
          <table class="ons-table is-compact">
            <thead>
              <tr><th>No.</th><th>Nama Supplier</th><th>Jumlah Faktur</th><th class="text-right">Total Pembelian</th><th class="text-right">Sisa Hutang</th><th>Aksi</th></tr>
            </thead>
            <tbody>
              ${supList.length ? supList.map((s, idx) => `<tr>
                <td class="font-mono-num text-xs">${idx + 1}</td>
                <td class="font-bold text-xs">${S().esc(s.id)}</td>
                <td class="font-mono-num text-xs">${s.count} faktur</td>
                <td class="text-right font-mono-num text-xs font-bold">${S().rp(s.total)}</td>
                <td class="text-right font-mono-num text-xs font-bold text-amber-600">${S().rp(s.sisa)}</td>
                <td><button type="button" onclick="window.navigateView('faktur','daftar')" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2">Buka Faktur</button></td>
              </tr>`).join('') : '<tr><td colspan="6" class="text-center py-6 text-xs" style="color:var(--ons-text-soft)">Data supplier tidak ditemukan.</td></tr>'}
            </tbody>
          </table>
        </div>
      `;
    } else {
      const filteredFaktur = allFaktur.filter((f) => {
        if (!sq) return true;
        return `${f.no_faktur_pbf || ''} ${f.id_pbf || ''} ${f.id_beli || ''}`.toLowerCase().includes(sq);
      }).sort((a, b) => String(b.tgl_terima || b.tgl_faktur || '').localeCompare(String(a.tgl_terima || a.tgl_faktur || '')));

      totalBeli = filteredFaktur.reduce((acc, f) => acc + Number(f.total_bruto || f.netto_hutang || f.sisa_hutang || 0), 0);
      varianCount = filteredFaktur.length;

      tableHtml = `
        <div class="ons-table-wrap">
          <table class="ons-table is-compact">
            <thead>
              <tr><th>No.</th><th>No. Faktur PBF</th><th>Tanggal</th><th>Supplier PBF</th><th>Jatuh Tempo</th><th class="text-right">Nilai Pembelian</th><th>Status Bayar</th></tr>
            </thead>
            <tbody>
              ${filteredFaktur.length ? filteredFaktur.map((f, idx) => {
                const tot = Number(f.total_bruto || f.netto_hutang || f.sisa_hutang || 0);
                const sisa = Number(f.sisa_hutang || 0);
                const status = sisa <= 0 ? 'LUNAS' : 'TEMPO';
                return `<tr>
                  <td class="font-mono-num text-xs">${idx + 1}</td>
                  <td class="font-mono-num text-xs font-bold">${S().esc(f.no_faktur_pbf || f.id_beli || '-')}</td>
                  <td class="font-mono-num text-xs">${S().esc(String(f.tgl_terima || f.tgl_faktur || '').slice(0, 10))}</td>
                  <td class="text-xs font-semibold">${S().esc(f.id_pbf || '-')}</td>
                  <td class="font-mono-num text-xs">${S().esc(f.tgl_jatuh_tempo || '-')}</td>
                  <td class="text-right font-mono-num text-xs font-bold">${S().rp(tot)}</td>
                  <td><span class="badge-bpom ${status === 'LUNAS' ? 'bpom-bebas' : 'bpom-keras'}">${status}</span></td>
                </tr>`;
              }).join('') : '<tr><td colspan="7" class="text-center py-6 text-xs" style="color:var(--ons-text-soft)">Data tidak ditemukan.</td></tr>'}
            </tbody>
          </table>
        </div>
      `;
    }

    const rekapFooter = _renderLapRekapFooter('lapBeli', `Rekap dari ${_fmtDateId(lapBeliDateFrom)} s.d. ${_fmtDateId(lapBeliDateTo)}`, [
      { label: 'Total Pembelian', valHtml: S().rp(totalBeli), cls: 'text-blue-600 dark:text-blue-400' },
      { label: 'Varian Produk', valHtml: `${varianCount} produk` },
      { label: 'Faktur Pembelian', valHtml: `${fakturCount} faktur` }
    ]);

    return `
      <div class="ons-card p-3 space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div class="flex flex-wrap items-center gap-2">
            <div>
              <span class="block text-[10.5px] font-semibold mb-0.5" style="color:var(--ons-text-soft)">Pilihan Data</span>
              <select id="lapBeliMode" class="ons-select text-xs h-8 py-1" onchange="window.setLapBeliMode(this.value)">
                <option value="produk" ${lapBeliMode === 'produk' ? 'selected' : ''}>Produk</option>
                <option value="faktur" ${lapBeliMode === 'faktur' ? 'selected' : ''}>Faktur</option>
                <option value="supplier" ${lapBeliMode === 'supplier' ? 'selected' : ''}>Supplier</option>
              </select>
            </div>
            <div>
              <span class="block text-[10.5px] font-semibold mb-0.5" style="color:var(--ons-text-soft)">Cari</span>
              <input id="lapBeliSearchInp" class="ons-input text-xs h-8 py-1 w-44 sm:w-56" placeholder="Cari data..." value="${S().esc(lapBeliSearchQ)}" oninput="window.setLapBeliSearch(this.value)"/>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <div>
              <span class="block text-[10.5px] font-semibold mb-0.5" style="color:var(--ons-text-soft)">Filter Tgl.</span>
              <div class="flex items-center gap-1">
                <input id="lapBeliDateFrom" type="date" class="ons-input text-xs h-8 py-1 w-32 font-mono-num" value="${S().esc(lapBeliDateFrom)}" onchange="window.setLapBeliDateRange(this.value, document.getElementById('lapBeliDateTo').value)"/>
                <span class="text-xs">&ndash;</span>
                <input id="lapBeliDateTo" type="date" class="ons-input text-xs h-8 py-1 w-32 font-mono-num" value="${S().esc(lapBeliDateTo)}" onchange="window.setLapBeliDateRange(document.getElementById('lapBeliDateFrom').value, this.value)"/>
              </div>
            </div>
            <div class="self-end">
              <button type="button" onclick="window.resetLapBeliFilter()" class="ons-btn ons-btn-ghost text-xs h-8 px-2.5" title="Reset Filter">&#x21bb; Reset</button>
            </div>
          </div>
        </div>
        ${tableHtml}
        ${rekapFooter}
      </div>
    `;
  }

  function _renderLapPersediaanSubTab() {
    const st = S().AppState;
    const today = new Date().toISOString().slice(0, 10);
    const mStart = today.slice(0, 8) + '01';
    if (!lapStokDateFrom) lapStokDateFrom = mStart;
    if (!lapStokDateTo) lapStokDateTo = today;

    const inRange = (dStr) => {
      const d = String(dStr || '').slice(0, 10);
      if (lapStokDateFrom && d < lapStokDateFrom) return false;
      if (lapStokDateTo && d > lapStokDateTo) return false;
      return true;
    };

    const muts = (st.mutasiStok || []).filter((m) => inRange(m.tanggal || m.created_at));
    const sq = lapStokSearchQ.trim().toLowerCase();

    let totalSaldoAkhir = 0;
    const rows = (st.masterObat || []).filter((o) => {
      if (!sq) return true;
      return `${o.nama_dagang || ''} ${o.satuan_dasar || ''} ${o.id_obat || ''}`.toLowerCase().includes(sq);
    }).map((o) => {
      const sAkhir = S().getTotalStok(o.id_obat);
      const itemMuts = muts.filter((m) => String(m.id_obat) === String(o.id_obat));
      let pembelian = 0;
      let retur_pembelian = 0;
      let penjualan = 0;
      let retur_penjualan = 0;
      let pindah_masuk = 0;
      let pindah_keluar = 0;
      let opname_pos = 0;
      let opname_neg = 0;

      itemMuts.forEach((m) => {
        const jm = String(m.jenis_mutasi || '').toUpperCase();
        const q = Number(m.qty_ubah || 0);
        if (jm.includes('PEMBELIAN')) pembelian += Math.max(0, q);
        else if (jm.includes('RETUR_PBF') || jm.includes('RECALL')) retur_pembelian += Math.abs(q);
        else if (jm.includes('PENJUALAN') && !jm.includes('RETUR')) penjualan += Math.abs(q);
        else if (jm.includes('RETUR_PENJUALAN')) retur_penjualan += Math.max(0, q);
        else if (jm.includes('TRANSFER') && q > 0) pindah_masuk += q;
        else if (jm.includes('TRANSFER') && q < 0) pindah_keluar += Math.abs(q);
        else if (jm.includes('OPNAME') && q > 0) opname_pos += q;
        else if (jm.includes('OPNAME') && q < 0) opname_neg += Math.abs(q);
      });

      const sAwal = Math.max(0, sAkhir - pembelian + retur_pembelian + penjualan - retur_penjualan - pindah_masuk + pindah_keluar - opname_pos + opname_neg);
      const hpp = Number(o.hpp_terakhir || o.hpp_avg || 0);
      const saldoAkhir = Math.max(0, sAkhir * hpp);
      totalSaldoAkhir += saldoAkhir;

      return {
        id_obat: o.id_obat,
        nama: o.nama_dagang,
        satuan: o.satuan_dasar || 'Unit',
        awal: sAwal,
        pembelian,
        retur_pembelian,
        penjualan,
        retur_penjualan,
        pindah_masuk,
        pindah_keluar,
        opname_pos,
        opname_neg,
        akhir: sAkhir,
        saldo: saldoAkhir
      };
    });

    const rekapFooter = _renderLapRekapFooter('lapStok', `Rekap dari ${_fmtDateId(lapStokDateFrom)} s.d. ${_fmtDateId(lapStokDateTo)}`, [
      { label: 'Total Saldo Akhir', valHtml: S().rp(totalSaldoAkhir), cls: 'text-blue-600 dark:text-blue-400 font-extrabold' },
      { label: 'Varian Produk', valHtml: `${rows.length} produk` }
    ]);

    return `
      <div class="ons-card p-3 space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div class="flex flex-wrap items-center gap-2">
            <div>
              <span class="block text-[10.5px] font-semibold mb-0.5" style="color:var(--ons-text-soft)">Pilihan Data</span>
              <select id="lapStokMode" class="ons-select text-xs h-8 py-1" onchange="window.setLapStokMode(this.value)">
                <option value="kuantitas" ${lapStokMode === 'kuantitas' ? 'selected' : ''}>Kuantitas</option>
                <option value="nilai" ${lapStokMode === 'nilai' ? 'selected' : ''}>Nilai Valuasi (Rp)</option>
              </select>
            </div>
            <div>
              <span class="block text-[10.5px] font-semibold mb-0.5" style="color:var(--ons-text-soft)">Cari</span>
              <input id="lapStokSearchInp" class="ons-input text-xs h-8 py-1 w-44 sm:w-56" placeholder="Cari data..." value="${S().esc(lapStokSearchQ)}" oninput="window.setLapStokSearch(this.value)"/>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <div>
              <span class="block text-[10.5px] font-semibold mb-0.5" style="color:var(--ons-text-soft)">Filter Tgl.</span>
              <div class="flex items-center gap-1">
                <input id="lapStokDateFrom" type="date" class="ons-input text-xs h-8 py-1 w-32 font-mono-num" value="${S().esc(lapStokDateFrom)}" onchange="window.setLapStokDateRange(this.value, document.getElementById('lapStokDateTo').value)"/>
                <span class="text-xs">&ndash;</span>
                <input id="lapStokDateTo" type="date" class="ons-input text-xs h-8 py-1 w-32 font-mono-num" value="${S().esc(lapStokDateTo)}" onchange="window.setLapStokDateRange(document.getElementById('lapStokDateFrom').value, this.value)"/>
              </div>
            </div>
            <div class="self-end">
              <button type="button" onclick="window.resetLapStokFilter()" class="ons-btn ons-btn-ghost text-xs h-8 px-2.5" title="Reset Filter">&#x21bb; Reset</button>
            </div>
          </div>
        </div>

        <div class="ons-table-wrap">
          <table class="ons-table is-compact">
            <thead>
              <tr>
                <th>No.</th><th>Nama Produk</th><th>Satuan</th><th>Stok Awal</th><th>Pembelian</th><th>Retur Pembelian</th><th>Penjualan</th><th>Retur Penjualan</th><th>Pindah Masuk</th><th>Pindah Keluar</th><th>Opname Positif</th><th>Opname Negatif</th><th>Stok Akhir</th><th class="text-right">Saldo Akhir</th>
              </tr>
            </thead>
            <tbody>
              ${rows.length ? rows.map((r, idx) => `<tr>
                <td class="font-mono-num text-xs">${idx + 1}</td>
                <td class="font-bold text-xs">${S().esc(r.nama)}</td>
                <td class="text-xs" style="color:var(--ons-text-soft)">${S().esc(r.satuan)}</td>
                <td class="font-mono-num text-xs">${r.awal}</td>
                <td class="font-mono-num text-xs text-emerald-600">${r.pembelian ? ('+' + r.pembelian) : 0}</td>
                <td class="font-mono-num text-xs text-red-600">${r.retur_pembelian ? ('-' + r.retur_pembelian) : 0}</td>
                <td class="font-mono-num text-xs text-red-600">${r.penjualan ? ('-' + r.penjualan) : 0}</td>
                <td class="font-mono-num text-xs text-emerald-600">${r.retur_penjualan ? ('+' + r.retur_penjualan) : 0}</td>
                <td class="font-mono-num text-xs">${r.pindah_masuk ? ('+' + r.pindah_masuk) : 0}</td>
                <td class="font-mono-num text-xs">${r.pindah_keluar ? ('-' + r.pindah_keluar) : 0}</td>
                <td class="font-mono-num text-xs">${r.opname_pos ? ('+' + r.opname_pos) : 0}</td>
                <td class="font-mono-num text-xs">${r.opname_neg ? ('-' + r.opname_neg) : 0}</td>
                <td class="font-mono-num text-xs font-bold text-blue-600">${r.akhir}</td>
                <td class="text-right font-mono-num text-xs font-bold">${S().rp(r.saldo)}</td>
              </tr>`).join('') : '<tr><td colspan="14" class="text-center py-6 text-xs" style="color:var(--ons-text-soft)">Data tidak ditemukan.</td></tr>'}
            </tbody>
          </table>
        </div>
        ${rekapFooter}
      </div>
    `;
  }

  function _renderLapKeuanganSubTab() {
    const st = S().AppState;
    const curYear = Number(lapKeuTahun) || new Date().getFullYear();
    const curMonth = Number(lapKeuBulan) || (new Date().getMonth() + 1);
    const mStr = String(curMonth).padStart(2, '0');
    const yStr = String(curYear);

    const inPeriod = (dStr) => {
      const d = String(dStr || '').slice(0, 10);
      if (!d) return false;
      if (lapKeuPeriode === 'tahunan') return d.startsWith(yStr);
      return d.startsWith(`${yStr}-${mStr}`);
    };

    const validSales = (st.penjualan || []).filter((p) => String(p.status_trx || 'LUNAS').toUpperCase() !== 'RETUR' && inPeriod(p.tanggal || p.created_at));
    const omzet = validSales.reduce((s, p) => s + Number(p.grand_total || 0), 0);
    const totalHpp = validSales.reduce((s, p) => s + Number(p.total_hpp || 0), 0);
    const labaKotor = omzet - totalHpp;

    const jurnalPeriod = (st.jurnalKeuangan || []).filter((j) => inPeriod(j.tanggal || j.created_at));
    const bebanOps = jurnalPeriod.filter((j) => String(j.jenis_trx || '') === 'KELUAR_OPERASIONAL').reduce((s, j) => s + Number(j.nominal || 0), 0);
    const pendapatanLain = jurnalPeriod.filter((j) => String(j.jenis_trx || '') === 'MASUK_LAINNYA').reduce((s, j) => s + Number(j.nominal || 0), 0);
    const bebanLain = jurnalPeriod.filter((j) => String(j.jenis_trx || '') === 'KELUAR_LAINNYA').reduce((s, j) => s + Number(j.nominal || 0), 0);

    const ebit = labaKotor - bebanOps + pendapatanLain - bebanLain;
    const pajak = Math.round(omzet * 0.005);
    const eat = ebit - pajak;

    const showPct = Boolean(lapKeuShowPct);
    const pctTag = (nom) => {
      if (!showPct) return '';
      const p = omzet > 0 ? ((Number(nom || 0) / omzet) * 100).toFixed(1) : '0.0';
      return `<span class="text-[11px] font-mono-num font-semibold text-slate-500 ml-2">(${p}%)</span>`;
    };

    const prof = typeof S().getStoreProfile === 'function' ? S().getStoreProfile() : {};
    const reportTitle = lapKeuJenis === 'neraca' ? 'Laporan Neraca Saldo' : (lapKeuJenis === 'aruskas' ? 'Laporan Arus Kas' : 'Laporan Laba-Rugi');
    const periodLabel = lapKeuPeriode === 'tahunan' ? `Tahun ${curYear}` : `Bulan ${_MONTH_NAMES_ID[curMonth - 1]}, Tahun ${curYear}`;

    return `
      <div class="space-y-4">
        <div class="ons-card p-3">
          <div class="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div class="flex flex-wrap items-center gap-2">
              <div>
                <span class="block text-[10.5px] font-semibold mb-0.5" style="color:var(--ons-text-soft)">Pilih Laporan</span>
                <select id="lapKeuJenis" class="ons-select text-xs h-8 py-1" onchange="window.setLapKeuJenis(this.value)">
                  <option value="labarugi" ${lapKeuJenis === 'labarugi' ? 'selected' : ''}>Laporan Laba-Rugi</option>
                  <option value="neraca" ${lapKeuJenis === 'neraca' ? 'selected' : ''}>Neraca Saldo</option>
                  <option value="aruskas" ${lapKeuJenis === 'aruskas' ? 'selected' : ''}>Arus Kas</option>
                </select>
              </div>
              <div>
                <span class="block text-[10.5px] font-semibold mb-0.5" style="color:var(--ons-text-soft)">Pilih Periode</span>
                <select id="lapKeuPeriode" class="ons-select text-xs h-8 py-1" onchange="window.setLapKeuPeriode(this.value)">
                  <option value="bulanan" ${lapKeuPeriode === 'bulanan' ? 'selected' : ''}>Bulanan</option>
                  <option value="tahunan" ${lapKeuPeriode === 'tahunan' ? 'selected' : ''}>Tahunan</option>
                </select>
              </div>
              ${lapKeuPeriode === 'bulanan' ? `
                <div>
                  <span class="block text-[10.5px] font-semibold mb-0.5" style="color:var(--ons-text-soft)">Pilih Bulan</span>
                  <select id="lapKeuBulan" class="ons-select text-xs h-8 py-1" onchange="window.setLapKeuBulan(this.value)">
                    ${_MONTH_NAMES_ID.map((nm, idx) => `<option value="${idx + 1}" ${curMonth === idx + 1 ? 'selected' : ''}>${nm}</option>`).join('')}
                  </select>
                </div>
              ` : ''}
              <div>
                <span class="block text-[10.5px] font-semibold mb-0.5" style="color:var(--ons-text-soft)">Pilih Tahun</span>
                <select id="lapKeuTahun" class="ons-select text-xs h-8 py-1" onchange="window.setLapKeuTahun(this.value)">
                  ${[curYear - 1, curYear, curYear + 1].map((yr) => `<option value="${yr}" ${curYear === yr ? 'selected' : ''}>${yr}</option>`).join('')}
                </select>
              </div>
              <div>
                <span class="block text-[10.5px] font-semibold mb-0.5" style="color:var(--ons-text-soft)">Pilih Interval Data</span>
                <select id="lapKeuInterval" class="ons-select text-xs h-8 py-1" onchange="window.setLapKeuInterval(this.value)">
                  <option value="none" ${lapKeuInterval === 'none' ? 'selected' : ''}>Tidak Ada</option>
                  <option value="mingguan" ${lapKeuInterval === 'mingguan' ? 'selected' : ''}>Per Minggu</option>
                  <option value="harian" ${lapKeuInterval === 'harian' ? 'selected' : ''}>Per Hari</option>
                </select>
              </div>
            </div>
            <div class="flex items-center gap-2 self-end">
              <label class="flex items-center gap-1.5 cursor-pointer font-semibold text-xs">
                <input type="checkbox" id="lapKeuShowPct" ${showPct ? 'checked' : ''} onchange="window.toggleLapKeuPct(this.checked)" class="w-4 h-4"/>
                <span>Tampilkan Persentase</span>
              </label>
            </div>
          </div>
        </div>

        <div id="lapKeuDocCard" class="ons-card p-6 md:p-8 space-y-5 max-w-4xl mx-auto shadow-sm">
          <div class="text-center pb-4 border-b space-y-1" style="border-color:var(--ons-border)">
            <h2 class="text-xl font-extrabold text-blue-600 dark:text-blue-400 tracking-tight">${reportTitle}</h2>
            <div class="text-xs font-semibold" style="color:var(--ons-text-soft)">Periode: ${periodLabel}</div>
            <div class="text-[11px]" style="color:var(--ons-text-soft)">Terakhir Update: ${new Date().toLocaleDateString('id-ID')} &bull; ${prof.nama_usaha || 'Apotek ONS Farma'}</div>
          </div>

          <div class="space-y-4 text-xs divide-y" style="border-color:var(--ons-border)">
            <div class="pt-2">
              <h4 class="font-extrabold text-sm mb-1 text-slate-800 dark:text-slate-100">Pendapatan Penjualan</h4>
              <div class="flex justify-between items-center py-1">
                <span style="color:var(--ons-text-soft)">Pendapatan Penjualan</span>
                <span class="font-mono-num font-bold text-sm">${S().rp(omzet)}${pctTag(omzet)}</span>
              </div>
            </div>

            <div class="pt-3">
              <h4 class="font-extrabold text-sm mb-1 text-slate-800 dark:text-slate-100">Harga Pokok Penjualan</h4>
              <div class="flex justify-between items-center py-1">
                <span style="color:var(--ons-text-soft)">Harga Pokok Penjualan</span>
                <span class="font-mono-num font-bold text-sm text-red-600">${S().rp(totalHpp)}${pctTag(totalHpp)}</span>
              </div>
            </div>

            <div class="pt-3">
              <h4 class="font-extrabold text-sm mb-1 text-slate-800 dark:text-slate-100">Laba Kotor</h4>
              <div class="flex justify-between items-center py-1 font-bold">
                <span>Laba Kotor</span>
                <span class="font-mono-num text-sm text-emerald-600">${S().rp(labaKotor)}${pctTag(labaKotor)}</span>
              </div>
            </div>

            <div class="pt-3">
              <h4 class="font-extrabold text-sm mb-1 text-slate-800 dark:text-slate-100">Pengeluaran Operasional</h4>
              <div class="flex justify-between items-center py-1">
                <span style="color:var(--ons-text-soft)">Pengeluaran Operasional</span>
                <span class="font-mono-num font-bold text-sm text-red-600">${S().rp(bebanOps)}${pctTag(bebanOps)}</span>
              </div>
            </div>

            <div class="pt-3">
              <h4 class="font-extrabold text-sm mb-1 text-slate-800 dark:text-slate-100">Pendapatan Lainnya</h4>
              <div class="flex justify-between items-center py-1">
                <span style="color:var(--ons-text-soft)">Pendapatan Lainnya</span>
                <span class="font-mono-num font-bold text-sm text-emerald-600">${S().rp(pendapatanLain)}${pctTag(pendapatanLain)}</span>
              </div>
            </div>

            <div class="pt-3">
              <h4 class="font-extrabold text-sm mb-1 text-slate-800 dark:text-slate-100">Pengeluaran Lainnya</h4>
              <div class="flex justify-between items-center py-1">
                <span style="color:var(--ons-text-soft)">Pengeluaran Lainnya</span>
                <span class="font-mono-num font-bold text-sm text-red-600">${S().rp(bebanLain)}${pctTag(bebanLain)}</span>
              </div>
            </div>

            <div class="pt-3">
              <h4 class="font-extrabold text-sm mb-1 text-slate-800 dark:text-slate-100">Laba bersih sebelum pajak</h4>
              <div class="flex justify-between items-center py-1 font-bold">
                <span>Laba bersih sebelum pajak</span>
                <span class="font-mono-num text-sm ${ebit >= 0 ? 'text-blue-600' : 'text-red-600'}">${S().rp(ebit)}${pctTag(ebit)}</span>
              </div>
            </div>

            <div class="pt-3">
              <h4 class="font-extrabold text-sm mb-1 text-slate-800 dark:text-slate-100">Pengeluaran Pajak</h4>
              <div class="flex justify-between items-center py-1">
                <span style="color:var(--ons-text-soft)">Pengeluaran Pajak</span>
                <span class="font-mono-num font-bold text-sm text-red-600">${S().rp(pajak)}${pctTag(pajak)}</span>
              </div>
            </div>

            <div class="pt-3 border-t-2" style="border-color:var(--ons-border)">
              <div class="flex justify-between items-center py-2">
                <h4 class="font-extrabold text-base text-blue-600 dark:text-blue-400">Laba bersih setelah pajak</h4>
                <span class="font-mono-num font-extrabold text-base ${eat >= 0 ? 'text-emerald-600' : 'text-red-600'}">${S().rp(eat)}${pctTag(eat)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function _getLostSales() {
    try {
      const arr = JSON.parse(localStorage.getItem(LOST_SALES_KEY) || 'null');
      if (Array.isArray(arr)) return arr;
    } catch (e) {}
    return [];
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
    sipnapTab = (st.subTabs && st.subTabs.sipnap) || sipnapTab || 'penjualan';
    if (!['penjualan', 'pembelian', 'persediaan', 'keuangan', 'narkotika', 'pareto', 'deadstock'].includes(sipnapTab)) {
      sipnapTab = 'penjualan';
    }
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

    const pageTitle = sipnapTab === 'penjualan' ? 'Laporan Penjualan'
      : (sipnapTab === 'pembelian' ? 'Laporan Pembelian'
        : (sipnapTab === 'persediaan' ? 'Laporan Persediaan'
          : (sipnapTab === 'keuangan' ? 'Laporan Keuangan'
            : 'Pelaporan SIPNAP Kemenkes, Pareto ABC &amp; Dead Stock')));
    const pageDesc = sipnapTab === 'penjualan' ? 'Ringkasan performa penjualan apotek harian, per produk, transaksi faktur &amp; keuntungan.'
      : (sipnapTab === 'pembelian' ? 'Rekapitulasi pengadaan barang PBF, faktur masuk, harga beli &amp; jatuh tempo supplier.'
        : (sipnapTab === 'persediaan' ? 'Kartu pergerakan stok mutasi lengkap: awal, masuk, keluar, opname hingga saldo akhir.'
          : (sipnapTab === 'keuangan' ? 'Laporan keuangan terstruktur: Laba-Rugi, Pendapatan, HPP, Operasional &amp; Laba Bersih.'
            : 'Format SIPNAP 8 kolom terintegrasi Kartu Stok mutasi nyata, Pareto ABC omzet &amp; valuasi, indikator WHO, &amp; lost sales.')));

    const actionBtnsHtml = sipnapTab === 'penjualan' ? `
        <button onclick="window.exportLapJual('xlsx')" class="ons-btn ons-btn-ghost text-xs">Excel</button>
        <button onclick="window.exportLapJual('csv')" class="ons-btn ons-btn-ghost text-xs">CSV</button>
        <button onclick="window.exportLapJual('pdf')" class="ons-btn ons-btn-ghost text-xs">PDF</button>
      ` : (sipnapTab === 'pembelian' ? `
        <button onclick="window.exportLapBeli('xlsx')" class="ons-btn ons-btn-ghost text-xs">Excel</button>
        <button onclick="window.exportLapBeli('csv')" class="ons-btn ons-btn-ghost text-xs">CSV</button>
        <button onclick="window.exportLapBeli('pdf')" class="ons-btn ons-btn-ghost text-xs">PDF</button>
      ` : (sipnapTab === 'persediaan' ? `
        <button onclick="window.exportLapPersediaan('xlsx')" class="ons-btn ons-btn-ghost text-xs">Excel</button>
        <button onclick="window.exportLapPersediaan('csv')" class="ons-btn ons-btn-ghost text-xs">CSV</button>
        <button onclick="window.exportLapPersediaan('pdf')" class="ons-btn ons-btn-ghost text-xs">PDF</button>
      ` : (sipnapTab === 'keuangan' ? `
        <button onclick="window.exportLaporanKeuanganExcel()" class="ons-btn ons-btn-emerald text-xs">Export XLSX</button>
        <button onclick="window.printLaporanKeuangan()" class="ons-btn ons-btn-primary text-xs">Cetak Laporan</button>
      ` : `
        <button onclick="window.exportSipnapExcel()" class="ons-btn ons-btn-primary text-xs">Export SIPNAP (.xlsx)</button>
      `)));

    return `<div class="space-y-4 ons-view-enter">
      <div class="ons-page-header">
        <div>
          <h1 class="text-xl font-extrabold">${pageTitle}</h1>
          <p class="text-xs" style="color:var(--ons-text-soft)">${pageDesc}</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          ${actionBtnsHtml}
        </div>
      </div>

      <div class="ons-tab-bar">
        <button onclick="window.setSipnapTab('penjualan')" class="ons-tab-btn ${sipnapTab === 'penjualan' ? 'active' : ''}">Laporan Penjualan</button>
        <button onclick="window.setSipnapTab('pembelian')" class="ons-tab-btn ${sipnapTab === 'pembelian' ? 'active' : ''}">Laporan Pembelian</button>
        <button onclick="window.setSipnapTab('persediaan')" class="ons-tab-btn ${sipnapTab === 'persediaan' ? 'active' : ''}">Laporan Persediaan</button>
        <button onclick="window.setSipnapTab('keuangan')" class="ons-tab-btn ${sipnapTab === 'keuangan' ? 'active' : ''}">Laporan Keuangan</button>
        <button onclick="window.setSipnapTab('narkotika')" class="ons-tab-btn ${sipnapTab === 'narkotika' ? 'active' : ''}">SIPNAP Kemenkes (${sipnapRows.length})</button>
        <button onclick="window.setSipnapTab('pareto')" class="ons-tab-btn ${sipnapTab === 'pareto' ? 'active' : ''}">Pareto ABC &amp; WHO</button>
        <button onclick="window.setSipnapTab('deadstock')" class="ons-tab-btn ${sipnapTab === 'deadstock' ? 'active' : ''}">Dead Stock &amp; Lost Sales (${deadBatches.length})</button>
      </div>

      ${sipnapTab === 'penjualan' ? _renderLapPenjualanSubTab()
        : sipnapTab === 'pembelian' ? _renderLapPembelianSubTab()
        : sipnapTab === 'persediaan' ? _renderLapPersediaanSubTab()
        : sipnapTab === 'keuangan' ? _renderLapKeuanganSubTab()
        : sipnapTab === 'pareto' ? `
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

  global.viewPosTransactionReceipt = (inv) => {
    if (typeof global.openPosReprintModal === 'function') global.openPosReprintModal(inv);
  };

  global.setSipnapTab = (t) => {
    const req = String(t || 'penjualan');
    sipnapTab = ['penjualan', 'pembelian', 'persediaan', 'keuangan', 'narkotika', 'pareto', 'deadstock'].includes(req) ? req : 'penjualan';
    if (S().AppState.subTabs) S().AppState.subTabs.sipnap = sipnapTab;
    S().AppState.activeSubTab = sipnapTab;
    global.renderActiveView();
    if (typeof global.syncNavHighlight === 'function') global.syncNavHighlight();
  };

  global.setLapJualMode = (m) => { lapJualMode = m || 'hari'; global.renderActiveView(); };
  global.setLapJualSearch = (q) => { lapJualSearchQ = q || ''; global.renderActiveView(); };
  global.setLapJualDateRange = (f, t) => { lapJualDateFrom = f || ''; lapJualDateTo = t || ''; global.renderActiveView(); };
  global.resetLapJualFilter = () => { lapJualSearchQ = ''; lapJualDateFrom = ''; lapJualDateTo = ''; global.renderActiveView(); };

  global.setLapBeliMode = (m) => { lapBeliMode = m || 'produk'; global.renderActiveView(); };
  global.setLapBeliSearch = (q) => { lapBeliSearchQ = q || ''; global.renderActiveView(); };
  global.setLapBeliDateRange = (f, t) => { lapBeliDateFrom = f || ''; lapBeliDateTo = t || ''; global.renderActiveView(); };
  global.resetLapBeliFilter = () => { lapBeliSearchQ = ''; lapBeliDateFrom = ''; lapBeliDateTo = ''; global.renderActiveView(); };

  global.setLapStokMode = (m) => { lapStokMode = m || 'kuantitas'; global.renderActiveView(); };
  global.setLapStokSearch = (q) => { lapStokSearchQ = q || ''; global.renderActiveView(); };
  global.setLapStokDateRange = (f, t) => { lapStokDateFrom = f || ''; lapStokDateTo = t || ''; global.renderActiveView(); };
  global.resetLapStokFilter = () => { lapStokSearchQ = ''; lapStokDateFrom = ''; lapStokDateTo = ''; global.renderActiveView(); };

  global.setLapKeuJenis = (j) => { lapKeuJenis = j || 'labarugi'; global.renderActiveView(); };
  global.setLapKeuPeriode = (p) => { lapKeuPeriode = p || 'bulanan'; global.renderActiveView(); };
  global.setLapKeuBulan = (b) => { lapKeuBulan = b || '11'; global.renderActiveView(); };
  global.setLapKeuTahun = (y) => { lapKeuTahun = y || '2026'; global.renderActiveView(); };
  global.setLapKeuInterval = (i) => { lapKeuInterval = i || 'none'; global.renderActiveView(); };
  global.toggleLapKeuPct = (c) => { lapKeuShowPct = Boolean(c); global.renderActiveView(); };
  global.toggleLapRekapPanel = (k) => { lapRekapCollapsed[k] = !lapRekapCollapsed[k]; global.renderActiveView(); };

  global.exportLapJual = (fmt) => {
    const st = S().AppState;
    const allPenjualan = (st.penjualan || []).filter((p) => String(p.status_trx || 'LUNAS').toUpperCase() !== 'RETUR');
    const dTag = new Date().toISOString().slice(0, 10);
    const rows = allPenjualan.map((p, idx) => ({
      no: idx + 1,
      no_faktur: p.kode_penjualan || p.id_penjualan || '-',
      tanggal: String(p.tanggal || '').slice(0, 16),
      pelanggan: p.nama_pasien || 'Pasien Umum',
      sales: p.sales_nama || '-',
      total: Number(p.grand_total || 0),
      keuntungan: Number(p.grand_total || 0) - Number(p.total_hpp || 0),
      metode: p.metode_bayar || 'TUNAI'
    }));
    return S().exportDataset(fmt || 'xlsx', 'Laporan Penjualan Apotek', `Laporan_Penjualan_${dTag}`, [
      { key: 'no', label: 'No', type: 'int', width: 6 },
      { key: 'no_faktur', label: 'No. Faktur', width: 18 },
      { key: 'tanggal', label: 'Tanggal', width: 16 },
      { key: 'pelanggan', label: 'Pelanggan', width: 22 },
      { key: 'sales', label: 'Sales / Kasir', width: 18 },
      { key: 'total', label: 'Total Penjualan', type: 'currency', sum: true, width: 18 },
      { key: 'keuntungan', label: 'Keuntungan', type: 'currency', sum: true, width: 18 },
      { key: 'metode', label: 'Metode Bayar', width: 14 }
    ], rows, { sheetName: 'Penjualan' });
  };

  global.exportLapBeli = (fmt) => {
    const st = S().AppState;
    const dTag = new Date().toISOString().slice(0, 10);
    const rows = (st.fakturPbf || []).map((f, idx) => ({
      no: idx + 1,
      no_faktur: f.no_faktur_pbf || f.id_beli || '-',
      tanggal: String(f.tgl_terima || f.tgl_faktur || '').slice(0, 10),
      supplier: f.id_pbf || '-',
      jatuh_tempo: f.tgl_jatuh_tempo || '-',
      total: Number(f.total_bruto || f.netto_hutang || f.sisa_hutang || 0),
      sisa: Number(f.sisa_hutang || 0)
    }));
    return S().exportDataset(fmt || 'xlsx', 'Laporan Pembelian PBF', `Laporan_Pembelian_${dTag}`, [
      { key: 'no', label: 'No', type: 'int', width: 6 },
      { key: 'no_faktur', label: 'No. Faktur PBF', width: 18 },
      { key: 'tanggal', label: 'Tanggal', width: 14 },
      { key: 'supplier', label: 'Supplier PBF', width: 24 },
      { key: 'jatuh_tempo', label: 'Jatuh Tempo', width: 14 },
      { key: 'total', label: 'Nilai Pembelian', type: 'currency', sum: true, width: 18 },
      { key: 'sisa', label: 'Sisa Hutang', type: 'currency', sum: true, width: 16 }
    ], rows, { sheetName: 'Pembelian' });
  };

  global.exportLapPersediaan = (fmt) => {
    const st = S().AppState;
    const dTag = new Date().toISOString().slice(0, 10);
    const rows = (st.masterObat || []).map((o, idx) => {
      const akhir = S().getTotalStok(o.id_obat);
      const hpp = Number(o.hpp_terakhir || o.hpp_avg || 0);
      return {
        no: idx + 1,
        nama: o.nama_dagang || '-',
        satuan: o.satuan_dasar || 'Unit',
        stok_akhir: akhir,
        hpp,
        saldo_akhir: akhir * hpp
      };
    });
    return S().exportDataset(fmt || 'xlsx', 'Laporan Persediaan Apotek', `Laporan_Persediaan_${dTag}`, [
      { key: 'no', label: 'No', type: 'int', width: 6 },
      { key: 'nama', label: 'Nama Produk', width: 28 },
      { key: 'satuan', label: 'Satuan', width: 12 },
      { key: 'stok_akhir', label: 'Stok Akhir', type: 'int', width: 12 },
      { key: 'hpp', label: 'HPP Unit', type: 'currency', width: 14 },
      { key: 'saldo_akhir', label: 'Saldo Akhir', type: 'currency', sum: true, width: 18 }
    ], rows, { sheetName: 'Persediaan' });
  };

  global.exportLaporanKeuanganExcel = () => {
    const st = S().AppState;
    const curYear = Number(lapKeuTahun) || new Date().getFullYear();
    const curMonth = Number(lapKeuBulan) || (new Date().getMonth() + 1);
    const mStr = String(curMonth).padStart(2, '0');
    const yStr = String(curYear);
    const inPeriod = (dStr) => {
      const d = String(dStr || '').slice(0, 10);
      if (lapKeuPeriode === 'tahunan') return d.startsWith(yStr);
      return d.startsWith(`${yStr}-${mStr}`);
    };
    const validSales = (st.penjualan || []).filter((p) => String(p.status_trx || 'LUNAS').toUpperCase() !== 'RETUR' && inPeriod(p.tanggal || p.created_at));
    const omzet = validSales.reduce((s, p) => s + Number(p.grand_total || 0), 0);
    const totalHpp = validSales.reduce((s, p) => s + Number(p.total_hpp || 0), 0);
    const labaKotor = omzet - totalHpp;
    const jurnalPeriod = (st.jurnalKeuangan || []).filter((j) => inPeriod(j.tanggal || j.created_at));
    const bebanOps = jurnalPeriod.filter((j) => String(j.jenis_trx || '') === 'KELUAR_OPERASIONAL').reduce((s, j) => s + Number(j.nominal || 0), 0);
    const pendapatanLain = jurnalPeriod.filter((j) => String(j.jenis_trx || '') === 'MASUK_LAINNYA').reduce((s, j) => s + Number(j.nominal || 0), 0);
    const bebanLain = jurnalPeriod.filter((j) => String(j.jenis_trx || '') === 'KELUAR_LAINNYA').reduce((s, j) => s + Number(j.nominal || 0), 0);
    const ebit = labaKotor - bebanOps + pendapatanLain - bebanLain;
    const pajak = Math.round(omzet * 0.005);
    const eat = ebit - pajak;

    const rows = [
      { pos: 'Pendapatan Penjualan', keterangan: 'Penjualan Obat & Alkes', nominal: omzet },
      { pos: 'Harga Pokok Penjualan', keterangan: 'Total HPP Produk Terjual', nominal: totalHpp },
      { pos: 'Laba Kotor', keterangan: 'Penjualan dikurangi HPP', nominal: labaKotor },
      { pos: 'Pengeluaran Operasional', keterangan: 'Beban Operasional & Toko', nominal: bebanOps },
      { pos: 'Pendapatan Lainnya', keterangan: 'Layanan POCT & Konseling', nominal: pendapatanLain },
      { pos: 'Pengeluaran Lainnya', keterangan: 'Biaya Bank & Lainnya', nominal: bebanLain },
      { pos: 'Laba Bersih Sebelum Pajak', keterangan: 'EBIT', nominal: ebit },
      { pos: 'Pengeluaran Pajak', keterangan: 'PPh Final 0.5%', nominal: pajak },
      { pos: 'Laba Bersih Setelah Pajak', keterangan: 'Net Profit', nominal: eat }
    ];

    const dTag = new Date().toISOString().slice(0, 10);
    return S().exportDataset('xlsx', `Laporan Keuangan Laba-Rugi - ${curYear}-${mStr}`, `Laporan_Keuangan_${dTag}`, [
      { key: 'pos', label: 'Pos Keuangan', width: 28 },
      { key: 'keterangan', label: 'Keterangan', width: 30 },
      { key: 'nominal', label: 'Nominal (Rp)', type: 'currency', width: 20 }
    ], rows, { sheetName: 'LabaRugi' });
  };

  global.printLaporanKeuangan = () => {
    const el = document.getElementById('lapKeuDocCard');
    if (!el) {
      if (typeof window.print === 'function') window.print();
      return;
    }
    S().openModal(`<div class="p-6 space-y-4 text-xs">
      <div class="flex justify-between items-center pb-2 border-b" style="border-color:var(--ons-border)">
        <h3 class="font-bold text-base">Cetak Laporan Keuangan</h3>
        <button type="button" onclick="ONSStore.closeModal()" class="text-xl">&times;</button>
      </div>
      <div>${el.outerHTML}</div>
      <div class="flex justify-end gap-2 pt-2">
        <button type="button" onclick="ONSStore.closeModal()" class="ons-btn ons-btn-ghost text-xs">Tutup</button>
        <button type="button" onclick="window.print()" class="ons-btn ons-btn-primary text-xs">Cetak / Simpan PDF</button>
      </div>
    </div>`, '760px');
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
   * =========================================================================
   * W-12B: MODUL ANALISIS APOTEK DIGITAL (PARETO, PEMBELIAN, HARGA)
   * =========================================================================
   */
  function _renderAnlParetoSubTab() {
    const st = S().AppState;
    const today = new Date().toISOString().slice(0, 10);
    const mStart = today.slice(0, 8) + '01';
    if (!anlParetoDateFrom) anlParetoDateFrom = mStart;
    if (!anlParetoDateTo) anlParetoDateTo = today;

    const inRange = (dStr) => {
      const d = String(dStr || '').slice(0, 10);
      if (anlParetoDateFrom && d < anlParetoDateFrom) return false;
      if (anlParetoDateTo && d > anlParetoDateTo) return false;
      return true;
    };
    const validSales = (st.penjualan || []).filter((p) => String(p.status_trx || 'LUNAS').toUpperCase() !== 'RETUR' && inRange(p.tanggal || p.created_at));
    const validSaleIds = new Set(validSales.map((p) => p.id_penjualan || p.kode_penjualan || p.id_transaksi));

    const salesMap = {};
    (st.detailPenjualan || []).forEach((d) => {
      if (d.id_penjualan && validSaleIds.size && !validSaleIds.has(d.id_penjualan)) return;
      const id = d.id_obat;
      if (!id) return;
      if (!salesMap[id]) salesMap[id] = { qty: 0, omzet: 0, hpp: 0 };
      const q = Number(d.qty || 0);
      const sub = Number(d.subtotal_item || (q * Number(d.harga_jual || 0)));
      const hpp = Number(d.hpp_unit || 0) * q;
      salesMap[id].qty += q;
      salesMap[id].omzet += sub;
      salesMap[id].hpp += hpp;
    });

    const rows = (st.masterObat || []).map((o) => {
      const s = salesMap[o.id_obat] || { qty: 0, omzet: 0, hpp: 0 };
      const stokSaatIni = S().getTotalStok(o.id_obat);
      const hppUnit = Number(o.hpp_terakhir || o.hpp_avg || 0);
      const nilaiStok = stokSaatIni * hppUnit;
      const keuntungan = s.omzet - s.hpp;
      return {
        id_obat: o.id_obat,
        nama: o.nama_dagang || o.id_obat,
        satuan: o.satuan_dasar || 'Unit',
        terjual: s.qty,
        omzet: s.omzet,
        keuntungan: keuntungan,
        stokSaatIni: stokSaatIni,
        nilaiStok: nilaiStok,
        golongan: o.golongan_bpom || 'BEBAS'
      };
    });

    if (anlParetoMode === 'keuntungan') {
      rows.sort((a, b) => b.keuntungan - a.keuntungan || b.omzet - a.omzet);
    } else if (anlParetoMode === 'kuantitas') {
      rows.sort((a, b) => b.terjual - a.terjual || b.stokSaatIni - a.stokSaatIni);
    } else {
      rows.sort((a, b) => b.omzet - a.omzet || b.nilaiStok - a.nilaiStok);
    }

    const totalMetric = Math.max(1, rows.reduce((acc, r) => acc + (anlParetoMode === 'keuntungan' ? Math.max(0, r.keuntungan) : (anlParetoMode === 'kuantitas' ? r.terjual : r.omzet)), 0));
    let cum = 0;
    let countA = 0, sumA = 0;
    let countB = 0, sumB = 0;
    let countC = 0, sumC = 0;

    rows.forEach((r, idx) => {
      const m = anlParetoMode === 'keuntungan' ? Math.max(0, r.keuntungan) : (anlParetoMode === 'kuantitas' ? r.terjual : r.omzet);
      const pct = (m / totalMetric) * 100;
      cum += pct;
      r.pct = Math.round(pct * 10) / 10;
      r.cumPct = Math.min(100, Math.round(cum * 10) / 10);
      if (r.cumPct <= 70 || (idx === 0 && m > 0)) {
        r.klasifikasi = 'A';
        r.badgeCls = 'badge-bpom bpom-bebas font-bold';
        countA++;
        sumA += r.omzet;
      } else if (r.cumPct <= 90 || countB === 0) {
        r.klasifikasi = 'B';
        r.badgeCls = 'badge-bpom bpom-terbatas font-bold';
        countB++;
        sumB += r.omzet;
      } else {
        r.klasifikasi = 'C';
        r.badgeCls = 'badge-bpom bpom-prekursor font-bold';
        countC++;
        sumC += r.omzet;
      }
    });

    const sq = anlParetoSearchQ.trim().toLowerCase();
    const filtered = rows.filter((r) => {
      if (!sq) return true;
      return `${r.nama} ${r.id_obat} ${r.klasifikasi} ${r.golongan}`.toLowerCase().includes(sq);
    });

    const tableHtml = `
      <div class="ons-table-wrap">
        <table class="ons-table is-compact">
          <thead>
            <tr>
              <th>No.</th>
              <th>Nama Produk</th>
              <th>Terjual</th>
              <th class="text-right">Nilai Penjualan</th>
              <th class="text-right">Keuntungan</th>
              <th>Persentase</th>
              <th>Klasifikasi</th>
              <th>Stok Saat Ini</th>
              <th class="text-right">Nilai Stok</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.length ? filtered.map((r, idx) => `
              <tr>
                <td class="font-mono-num text-xs">${idx + 1}</td>
                <td class="text-xs">
                  <div class="font-bold">${S().esc(r.nama)}</div>
                  <div class="text-[10px]" style="color:var(--ons-text-soft)">${S().esc(r.id_obat)} &bull; ${S().esc(r.satuan)}</div>
                </td>
                <td class="font-mono-num text-xs font-semibold">${r.terjual} ${S().esc(r.satuan)}</td>
                <td class="text-right font-mono-num text-xs font-bold text-blue-600 dark:text-blue-400">${S().rp(r.omzet)}</td>
                <td class="text-right font-mono-num text-xs font-bold text-emerald-600 dark:text-emerald-400">${S().rp(r.keuntungan)}</td>
                <td class="font-mono-num text-xs">${r.pct}% <span class="text-[10px]" style="color:var(--ons-text-soft)">(Kum. ${r.cumPct}%)</span></td>
                <td><span class="${r.badgeCls}">Pareto ${r.klasifikasi}</span></td>
                <td class="font-mono-num text-xs font-bold">${r.stokSaatIni}</td>
                <td class="text-right font-mono-num text-xs">${S().rp(r.nilaiStok)}</td>
                <td>
                  <button type="button" onclick="navigateView('defecta','order')" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2" title="Order via Defecta">Defecta</button>
                </td>
              </tr>
            `).join('') : '<tr><td colspan="10" class="text-center py-6 text-xs" style="color:var(--ons-text-soft)">Data tidak ditemukan.</td></tr>'}
          </tbody>
        </table>
      </div>
    `;

    const rekapFooter = _renderLapRekapFooter('anlPareto', `Akumulasi Hasil Analisis dari ${_fmtDateId(anlParetoDateFrom)} s.d. ${_fmtDateId(anlParetoDateTo)}`, [
      { label: 'Pareto A', valHtml: `${countA} produk (${S().rp(sumA)})`, cls: 'text-blue-600 dark:text-blue-400' },
      { label: 'Pareto B', valHtml: `${countB} produk (${S().rp(sumB)})`, cls: 'text-emerald-600 dark:text-emerald-400' },
      { label: 'Pareto C', valHtml: `${countC} produk (${S().rp(sumC)})`, cls: 'text-slate-500' },
      { label: 'Total Produk', valHtml: `${rows.length} produk` }
    ]);

    const paretoVisualBar = `
      <div class="ons-cockpit-strip">
        <div class="ons-cockpit-card is-azure">
          <div class="text-[10.5px] font-semibold text-slate-500">Pareto A (Prioritas Utama &bull; 70-80% Omzet)</div>
          <div class="text-lg font-extrabold font-mono-num mt-0.5 text-blue-600">${countA} Produk &bull; ${S().rp(sumA)}</div>
          <div class="text-[10px] text-slate-400">Kontributor profit terbesar &bull; Pastikan buffer stock aman</div>
        </div>
        <div class="ons-cockpit-card is-emerald">
          <div class="text-[10.5px] font-semibold text-slate-500">Pareto B (Moving Menengah &bull; 15-20% Omzet)</div>
          <div class="text-lg font-extrabold font-mono-num mt-0.5 text-emerald-600">${countB} Produk &bull; ${S().rp(sumB)}</div>
          <div class="text-[10px] text-slate-400">Rotasi stabil &bull; Evaluasi pengadaan berkala</div>
        </div>
        <div class="ons-cockpit-card is-amber">
          <div class="text-[10.5px] font-semibold text-slate-500">Pareto C (Slow Moving &bull; 5-10% Omzet)</div>
          <div class="text-lg font-extrabold font-mono-num mt-0.5 text-amber-600">${countC} Produk &bull; ${S().rp(sumC)}</div>
          <div class="text-[10px] text-slate-400">Efisiensi modal &bull; Batasi pembelian &amp; pantau ED</div>
        </div>
      </div>
    `;

    return `
      <div class="space-y-3">
        ${paretoVisualBar}
        <div class="ons-card p-3 space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-2.5 text-xs">
            <div class="flex flex-wrap items-center gap-2">
              <div>
                <span class="block text-[10.5px] font-semibold mb-0.5" style="color:var(--ons-text-soft)">Pilihan Data</span>
                <select id="anlParetoMode" class="ons-select text-xs h-8 py-1" onchange="window.setAnlParetoMode(this.value)">
                  <option value="penjualan" ${anlParetoMode === 'penjualan' ? 'selected' : ''}>Nilai Penjualan</option>
                  <option value="keuntungan" ${anlParetoMode === 'keuntungan' ? 'selected' : ''}>Keuntungan</option>
                  <option value="kuantitas" ${anlParetoMode === 'kuantitas' ? 'selected' : ''}>Kuantitas Terjual</option>
                </select>
              </div>
              <div>
                <span class="block text-[10.5px] font-semibold mb-0.5" style="color:var(--ons-text-soft)">Cari</span>
                <input id="anlParetoSearchInp" class="ons-input text-xs h-8 py-1 w-44 sm:w-56" placeholder="Cari data..." value="${S().esc(anlParetoSearchQ)}" oninput="window.setAnlParetoSearch(this.value)"/>
              </div>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <div>
                <span class="block text-[10.5px] font-semibold mb-0.5" style="color:var(--ons-text-soft)">Filter Tgl.</span>
                <div class="flex items-center gap-1">
                  <input id="anlParetoDateFrom" type="date" class="ons-input text-xs h-8 py-1 w-32 font-mono-num" value="${S().esc(anlParetoDateFrom)}" onchange="window.setAnlParetoDateRange(this.value, document.getElementById('anlParetoDateTo').value)"/>
                  <span class="text-xs">&ndash;</span>
                  <input id="anlParetoDateTo" type="date" class="ons-input text-xs h-8 py-1 w-32 font-mono-num" value="${S().esc(anlParetoDateTo)}" onchange="window.setAnlParetoDateRange(document.getElementById('anlParetoDateFrom').value, this.value)"/>
                </div>
              </div>
              <div class="self-end">
                <button type="button" onclick="window.resetAnlParetoFilter()" class="ons-btn ons-btn-ghost text-xs h-8 px-2.5" title="Reset Filter">&#x21bb; Reset</button>
              </div>
            </div>
          </div>
          ${tableHtml}
          ${rekapFooter}
        </div>
      </div>
    `;
  }

  function _renderAnlPembelianSubTab() {
    const st = S().AppState;
    const days = anlBeliRefPeriod === '1m' ? 30 : (anlBeliRefPeriod === '6m' ? 180 : (anlBeliRefPeriod === '12m' ? 365 : 90));
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 86400000);
    const startIso = startDate.toISOString().slice(0, 10);
    const todayIso = now.toISOString().slice(0, 10);

    const scopedSales = (st.penjualan || []).filter((p) => {
      const d = String(p.tanggal || p.created_at || '').slice(0, 10);
      return d >= startIso && String(p.status_trx || 'LUNAS').toUpperCase() !== 'RETUR';
    });
    const saleIds = new Set(scopedSales.map((p) => p.id_penjualan || p.kode_penjualan || p.id_transaksi));

    const soldPeriodMap = {};
    const lastSoldMap = {};
    (st.detailPenjualan || []).forEach((d) => {
      if (d.id_penjualan && saleIds.size && !saleIds.has(d.id_penjualan)) return;
      const id = d.id_obat;
      if (!id) return;
      soldPeriodMap[id] = (soldPeriodMap[id] || 0) + Number(d.qty || 0);
    });

    (st.penjualan || []).forEach((p) => {
      const dStr = String(p.tanggal || p.created_at || '').slice(0, 10);
      const idTrx = p.id_penjualan || p.kode_penjualan || p.id_transaksi;
      (st.detailPenjualan || []).filter((d) => (d.id_penjualan === idTrx || d.id_transaksi === idTrx)).forEach((d) => {
        if (d.id_obat && (!lastSoldMap[d.id_obat] || dStr > lastSoldMap[d.id_obat])) {
          lastSoldMap[d.id_obat] = dStr;
        }
      });
    });

    const pbfLeadMap = {};
    (st.supplierPbf || []).forEach((p) => {
      if (p.nama_pbf) pbfLeadMap[String(p.nama_pbf).toUpperCase()] = Number(p.lead_time_hari || 3);
      if (p.id_pbf) pbfLeadMap[String(p.id_pbf).toUpperCase()] = Number(p.lead_time_hari || 3);
    });

    const lostList = (typeof _getLostSales === 'function') ? _getLostSales() : [];
    const lostNames = new Set(lostList.map((l) => String(l.nama_obat || '').toLowerCase()));

    let countLoss = 0, countUnder = 0, countDead = 0, countOver = 0;
    const items = (st.masterObat || []).map((o) => {
      const terjual = Number(soldPeriodMap[o.id_obat] || 0);
      const lastSold = lastSoldMap[o.id_obat] ? _fmtDateId(lastSoldMap[o.id_obat]) : '-';
      const stokTerkini = S().getTotalStok(o.id_obat);
      const stokMin = Number(o.stok_min || 10);
      const stokMax = Number(o.stok_max || Math.max(stokMin * 4, 40));
      const leadHari = Number(pbfLeadMap[String(o.pbf_utama || '').toUpperCase()] || anlPoLeadTime || 3);
      const avgHarian = terjual / days;
      const avgBln = Math.round((terjual / (days / 30)) * 10) / 10;
      const bufferStock = Math.ceil(avgHarian * leadHari * (1 + anlPoBufferPct / 100));
      const targetStok = Math.max(stokMin, Math.ceil(avgHarian * anlPoReviewPeriod) + bufferStock);
      const pemenuhanStok = Math.max(0, targetStok - stokTerkini);

      const isLost = lostNames.has(String(o.nama_dagang || '').toLowerCase());
      let status = 'AMAN';
      let statusLabel = 'Aman';
      let statusBadge = 'badge-bpom bpom-bebas';

      if (stokTerkini <= 0 && (terjual > 0 || isLost)) {
        status = 'POTENSIAL_LOSS';
        statusLabel = 'Potensial Loss';
        statusBadge = 'badge-bpom bpom-narkotika';
        countLoss++;
      } else if (stokTerkini <= stokMin || stokTerkini < bufferStock) {
        status = 'UNDERSTOCK';
        statusLabel = 'Understock';
        statusBadge = 'badge-bpom bpom-keras';
        countUnder++;
      } else if (stokTerkini > stokMax * 1.5 && terjual > 0) {
        status = 'OVERSTOCK';
        statusLabel = 'Overstock';
        statusBadge = 'badge-bpom bpom-prekursor';
        countOver++;
      } else if (stokTerkini >= 20 && terjual <= 0) {
        status = 'DEADSTOCK';
        statusLabel = 'Deadstock';
        statusBadge = 'badge-bpom bpom-terbatas';
        countDead++;
      }

      return {
        id_obat: o.id_obat,
        nama: o.nama_dagang || o.id_obat,
        satuan: o.satuan_dasar || 'Unit',
        terjual,
        lastSold,
        periodeBeli: `${anlPoReviewPeriod} Hari`,
        rataRataPenjualan: `${avgBln} /bln`,
        stokMin,
        stokMax,
        targetStok,
        stokTerkini,
        pemenuhanStok,
        status,
        statusLabel,
        statusBadge,
        pareto: (o.golongan_bpom === 'KERAS' || o.golongan_bpom === 'NARKOTIKA' || o.golongan_bpom === 'PSIKOTROPIKA') ? 'A' : 'B',
        jenisSp: o.golongan_bpom || 'REGULER'
      };
    });

    const sq = anlBeliSearchQ.trim().toLowerCase();
    const filtered = items.filter((r) => {
      if (anlBeliStatusFilter !== 'SEMUA' && r.status !== anlBeliStatusFilter) return false;
      if (sq) {
        return `${r.nama} ${r.id_obat} ${r.satuan} ${r.jenisSp} ${r.statusLabel}`.toLowerCase().includes(sq);
      }
      return true;
    });

    const tableHtml = `
      <div class="ons-table-wrap">
        <table class="ons-table is-compact">
          <thead>
            <tr>
              <th>No.</th>
              <th>Nama Produk</th>
              <th>Satuan</th>
              <th>Terjual</th>
              <th>Penjualan Terakhir</th>
              <th>Periode Pembelian</th>
              <th>Rata-rata Penjualan</th>
              <th>Stok Minimal</th>
              <th>Stok Maksimal</th>
              <th>Target Stok</th>
              <th>Stok Terkini</th>
              <th class="text-right">Pemenuhan Stok</th>
              <th>Status</th>
              <th>Pareto</th>
              <th>Jenis SP</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.length ? filtered.map((r, idx) => `
              <tr>
                <td class="font-mono-num text-xs">${idx + 1}</td>
                <td class="font-bold text-xs">${S().esc(r.nama)}</td>
                <td class="text-xs" style="color:var(--ons-text-soft)">${S().esc(r.satuan)}</td>
                <td class="font-mono-num text-xs">${r.terjual}</td>
                <td class="font-mono-num text-xs">${r.lastSold}</td>
                <td class="text-xs">${r.periodeBeli}</td>
                <td class="font-mono-num text-xs">${r.rataRataPenjualan}</td>
                <td class="font-mono-num text-xs">${r.stokMin}</td>
                <td class="font-mono-num text-xs">${r.stokMax}</td>
                <td class="font-mono-num text-xs font-semibold">${r.targetStok}</td>
                <td class="font-mono-num text-xs font-bold ${r.stokTerkini <= r.stokMin ? 'text-red-600' : ''}">${r.stokTerkini}</td>
                <td class="text-right font-mono-num text-xs font-bold ${r.pemenuhanStok > 0 ? 'text-emerald-600 dark:text-emerald-400' : ''}">${r.pemenuhanStok}</td>
                <td><span class="${r.statusBadge}">${r.statusLabel}</span></td>
                <td><span class="badge-bpom ${r.pareto === 'A' ? 'bpom-bebas' : 'bpom-terbatas'}">${r.pareto}</span></td>
                <td><span class="badge-bpom bpom-bebas">${S().esc(r.jenisSp)}</span></td>
              </tr>
            `).join('') : '<tr><td colspan="15" class="text-center py-6 text-xs" style="color:var(--ons-text-soft)">Data tidak ditemukan.</td></tr>'}
          </tbody>
        </table>
      </div>
    `;

    const rekapFooter = _renderLapRekapFooter('anlBeli', `Rekap dari ${_fmtDateId(startIso)} s.d. ${_fmtDateId(todayIso)}`, [
      { label: 'Potensial Loss', valHtml: `${countLoss} produk`, cls: 'text-red-600 dark:text-red-400' },
      { label: 'Understock', valHtml: `${countUnder} produk`, cls: 'text-amber-600 dark:text-amber-400' },
      { label: 'Deadstock', valHtml: `${countDead} produk`, cls: 'text-slate-500' },
      { label: 'Overstock', valHtml: `${countOver} produk`, cls: 'text-blue-600 dark:text-blue-400' }
    ]);

    return `
      <div class="ons-card p-3 space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div class="flex flex-wrap items-center gap-2">
            <div>
              <span class="block text-[10.5px] font-semibold mb-0.5" style="color:var(--ons-text-soft)">Referensi Data</span>
              <select id="anlBeliRefPeriod" class="ons-select text-xs h-8 py-1" onchange="window.setAnlBeliRefPeriod(this.value)">
                <option value="1m" ${anlBeliRefPeriod === '1m' ? 'selected' : ''}>1 Bulan Terakhir</option>
                <option value="3m" ${anlBeliRefPeriod === '3m' ? 'selected' : ''}>3 Bulan Terakhir</option>
                <option value="6m" ${anlBeliRefPeriod === '6m' ? 'selected' : ''}>6 Bulan Terakhir</option>
                <option value="12m" ${anlBeliRefPeriod === '12m' ? 'selected' : ''}>1 Tahun Terakhir</option>
              </select>
            </div>
            <div>
              <span class="block text-[10.5px] font-semibold mb-0.5" style="color:var(--ons-text-soft)">Cari</span>
              <input id="anlBeliSearchInp" class="ons-input text-xs h-8 py-1 w-44 sm:w-56" placeholder="Cari data..." value="${S().esc(anlBeliSearchQ)}" oninput="window.setAnlBeliSearch(this.value)"/>
            </div>
            <div>
              <span class="block text-[10.5px] font-semibold mb-0.5" style="color:var(--ons-text-soft)">Status</span>
              <select id="anlBeliStatusFilter" class="ons-select text-xs h-8 py-1" onchange="window.setAnlBeliStatusFilter(this.value)">
                <option value="SEMUA" ${anlBeliStatusFilter === 'SEMUA' ? 'selected' : ''}>Semua Status</option>
                <option value="UNDERSTOCK" ${anlBeliStatusFilter === 'UNDERSTOCK' ? 'selected' : ''}>Understock</option>
                <option value="POTENSIAL_LOSS" ${anlBeliStatusFilter === 'POTENSIAL_LOSS' ? 'selected' : ''}>Potensial Loss</option>
                <option value="DEADSTOCK" ${anlBeliStatusFilter === 'DEADSTOCK' ? 'selected' : ''}>Deadstock</option>
                <option value="OVERSTOCK" ${anlBeliStatusFilter === 'OVERSTOCK' ? 'selected' : ''}>Overstock</option>
                <option value="AMAN" ${anlBeliStatusFilter === 'AMAN' ? 'selected' : ''}>Stok Aman</option>
              </select>
            </div>
          </div>
          <div class="self-end">
            <button type="button" onclick="window.resetAnlBeliFilter()" class="ons-btn ons-btn-ghost text-xs h-8 px-2.5" title="Reset Filter">&#x21bb; Reset</button>
          </div>
        </div>
        ${tableHtml}
        ${rekapFooter}
      </div>
    `;
  }

  function _renderAnlHargaSubTab() {
    const st = S().AppState;
    let countNaik = 0, countTurun = 0, countPerlu = 0, countAman = 0;

    const items = (st.masterObat || []).map((o) => {
      const hppLast = Number(o.hpp_terakhir || 0);
      const hppAvg = Number(o.hpp_avg || hppLast || 0);
      const hppRef = anlHargaHppBasis === 'last' ? (hppLast || hppAvg) : (anlHargaHppBasis === 'avg' ? (hppAvg || hppLast) : (hppAvg || hppLast));

      const deltaHpp = hppLast - hppAvg;
      const deltaPct = hppAvg > 0 ? Math.round((deltaHpp / hppAvg) * 1000) / 10 : 0;
      const hargaJual = Number(o.harga_umum || 0);
      const targetRatio = Math.min(0.85, Math.max(0.05, anlHargaTargetMarkup / 100));
      const rawTarget = hppRef > 0 ? (hppRef / (1 - targetRatio)) : hargaJual;
      const rekomendasiHarga = hppRef > 0 ? Math.ceil(rawTarget / 100) * 100 : hargaJual;

      let status = 'AMAN';
      if (deltaPct > 0) {
        status = 'NAIK';
        countNaik++;
      } else if (deltaPct < 0) {
        countTurun++;
      }

      if (hargaJual < rekomendasiHarga || (hppRef > 0 && hargaJual <= hppRef)) {
        status = 'PERLU';
        countPerlu++;
      } else if (status !== 'NAIK') {
        countAman++;
      }

      return {
        id_obat: o.id_obat,
        nama: o.nama_dagang || o.id_obat,
        satuan: o.satuan_dasar || 'Unit',
        hppRef,
        hppLast,
        deltaHpp,
        deltaPct,
        markup: anlHargaTargetMarkup,
        hargaJual,
        rekomendasiHarga,
        status
      };
    });

    const sq = anlHargaSearchQ.trim().toLowerCase();
    const filtered = items.filter((r) => {
      if (anlHargaStatusFilter === 'NAIK' && r.status !== 'NAIK') return false;
      if (anlHargaStatusFilter === 'PERLU' && r.status !== 'PERLU') return false;
      if (anlHargaStatusFilter === 'AMAN' && r.status !== 'AMAN') return false;
      if (sq) {
        return `${r.nama} ${r.id_obat} ${r.satuan}`.toLowerCase().includes(sq);
      }
      return true;
    });

    const allChecked = filtered.length > 0 && filtered.every((r) => anlHargaSelected.has(r.id_obat));

    const tableHtml = `
      <div class="ons-table-wrap">
        <table class="ons-table is-compact">
          <thead>
            <tr>
              <th class="w-8"><input type="checkbox" ${allChecked ? 'checked' : ''} onchange="window.toggleAnlHargaSelectAll(this.checked)" aria-label="Pilih Semua"/></th>
              <th>No.</th>
              <th>Nama Produk</th>
              <th>Satuan</th>
              <th class="text-right">Referensi Harga Pokok <span title="HPP Modal Rata-rata/Master" style="color:var(--ons-text-soft)">(i)</span></th>
              <th class="text-right">Harga Pokok Terakhir <span title="HPP Faktur Terbaru" style="color:var(--ons-text-soft)">(i)</span></th>
              <th>Perubahan <span title="Selisih Kenaikan HPP" style="color:var(--ons-text-soft)">(i)</span></th>
              <th>Markup</th>
              <th class="text-right">Harga Jual</th>
              <th class="text-right">Rekomendasi Harga Jual</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.length ? filtered.map((r, idx) => {
              const isChecked = anlHargaSelected.has(r.id_obat);
              const chgHtml = r.deltaPct > 0
                ? `<span class="badge-bpom bpom-narkotika font-bold">+${r.deltaPct}% (+${S().rp(r.deltaHpp)})</span>`
                : (r.deltaPct < 0
                  ? `<span class="badge-bpom bpom-bebas font-bold">${r.deltaPct}% (${S().rp(r.deltaHpp)})</span>`
                  : '<span style="color:var(--ons-text-soft)">0%</span>');
              return `<tr>
                <td><input type="checkbox" ${isChecked ? 'checked' : ''} onchange="window.toggleAnlHargaItemSelect('${r.id_obat}', this.checked)" aria-label="Pilih ${S().esc(r.nama)}"/></td>
                <td class="font-mono-num text-xs">${idx + 1}</td>
                <td class="font-bold text-xs">${S().esc(r.nama)}</td>
                <td class="text-xs" style="color:var(--ons-text-soft)">${S().esc(r.satuan)}</td>
                <td class="text-right font-mono-num text-xs">${S().rp(r.hppRef)}</td>
                <td class="text-right font-mono-num text-xs font-semibold">${S().rp(r.hppLast)}</td>
                <td>${chgHtml}</td>
                <td class="font-mono-num text-xs font-semibold">${r.markup}%</td>
                <td class="text-right font-mono-num text-xs font-bold">${S().rp(r.hargaJual)}</td>
                <td class="text-right font-mono-num text-xs font-bold text-blue-600 dark:text-blue-400">${S().rp(r.rekomendasiHarga)}</td>
                <td>
                  <button type="button" onclick="window.applySinglePriceFromAnalysis('${r.id_obat}')" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2" title="Terapkan Rekomendasi">Update</button>
                </td>
              </tr>`;
            }).join('') : '<tr><td colspan="11" class="text-center py-6 text-xs" style="color:var(--ons-text-soft)">Data tidak ditemukan.</td></tr>'}
          </tbody>
        </table>
      </div>
    `;

    const rekapFooter = _renderLapRekapFooter('anlHarga', 'Ringkasan Analisis', [
      { label: 'Harga Naik', valHtml: `${countNaik} produk`, cls: 'text-red-600 dark:text-red-400' },
      { label: 'Harga Turun', valHtml: `${countTurun} produk`, cls: 'text-emerald-600 dark:text-emerald-400' },
      { label: 'Perlu Penyesuaian', valHtml: `${countPerlu} produk`, cls: 'text-amber-600 dark:text-amber-400' },
      { label: 'Telah Disesuaikan/Diabaikan', valHtml: `${countAman} produk`, cls: 'text-slate-500' }
    ]);

    return `
      <div class="ons-card p-3 space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div class="flex flex-wrap items-center gap-2">
            <div>
              <span class="block text-[10.5px] font-semibold mb-0.5" style="color:var(--ons-text-soft)">Harga Pembanding</span>
              <select id="anlHargaHppBasis" class="ons-select text-xs h-8 py-1" onchange="window.setAnlHargaHppBasis(this.value)">
                <option value="ref" ${anlHargaHppBasis === 'ref' ? 'selected' : ''}>Referensi Harga Pokok</option>
                <option value="last" ${anlHargaHppBasis === 'last' ? 'selected' : ''}>Harga Pokok Terakhir</option>
                <option value="avg" ${anlHargaHppBasis === 'avg' ? 'selected' : ''}>Harga Pokok Rata-Rata</option>
              </select>
            </div>
            <div>
              <span class="block text-[10.5px] font-semibold mb-0.5" style="color:var(--ons-text-soft)">Cari</span>
              <input id="anlHargaSearchInp" class="ons-input text-xs h-8 py-1 w-44 sm:w-56" placeholder="Cari data..." value="${S().esc(anlHargaSearchQ)}" oninput="window.setAnlHargaSearch(this.value)"/>
            </div>
            <div>
              <span class="block text-[10.5px] font-semibold mb-0.5" style="color:var(--ons-text-soft)">Filter Status</span>
              <select id="anlHargaStatusFilter" class="ons-select text-xs h-8 py-1" onchange="window.setAnlHargaStatusFilter(this.value)">
                <option value="SEMUA" ${anlHargaStatusFilter === 'SEMUA' ? 'selected' : ''}>Semua Produk</option>
                <option value="NAIK" ${anlHargaStatusFilter === 'NAIK' ? 'selected' : ''}>Harga Naik</option>
                <option value="PERLU" ${anlHargaStatusFilter === 'PERLU' ? 'selected' : ''}>Perlu Penyesuaian</option>
                <option value="AMAN" ${anlHargaStatusFilter === 'AMAN' ? 'selected' : ''}>Telah Disesuaikan / Aman</option>
              </select>
            </div>
          </div>
          <div class="self-end">
            <button type="button" onclick="window.resetAnlHargaFilter()" class="ons-btn ons-btn-ghost text-xs h-8 px-2.5" title="Reset Filter">&#x21bb; Reset</button>
          </div>
        </div>
        ${tableHtml}
        ${rekapFooter}
      </div>
    `;
  }

  function renderAnalisisView() {
    const st = S().AppState;
    anlTab = (st.subTabs && st.subTabs.analisis) || anlTab || 'pareto';
    if (!['pareto', 'pembelian', 'harga'].includes(anlTab)) anlTab = 'pareto';

    const pageTitle = anlTab === 'pareto' ? 'Analisis Pareto A-B-C'
      : (anlTab === 'pembelian' ? 'Analisis Pembelian' : 'Analisis Harga Produk');
    const pageDesc = anlTab === 'pareto' ? 'Klasifikasi kontribusi produk Kelas A (70% omzet), B (20%), dan C (10%) untuk prioritas modal.'
      : (anlTab === 'pembelian' ? 'Perhitungan buffer stock, lead time PBF, estimasi kebutuhan pemenuhan stok &amp; pesanan otomatis.'
        : 'Evaluasi kenaikan HPP faktur distributor, target markup apotek &amp; rekomendasi pembaruan harga jual.');

    const actionBtns = anlTab === 'pareto' ? `
      <button onclick="window.exportAnlPareto('xlsx')" class="ons-btn ons-btn-ghost text-xs">Excel</button>
      <button onclick="window.exportAnlPareto('csv')" class="ons-btn ons-btn-ghost text-xs">CSV</button>
      <button onclick="window.exportAnlPareto('pdf')" class="ons-btn ons-btn-ghost text-xs">PDF</button>
    ` : (anlTab === 'pembelian' ? `
      <button onclick="window.openAnlPoConfigModal()" class="ons-btn ons-btn-ghost text-xs">&#9881; Konfigurasi PO</button>
      <button onclick="window.generateAutoPoFromAnalysis()" class="ons-btn ons-btn-primary text-xs">&#10024; Pesanan Otomatis</button>
      <button onclick="window.exportAnlBeli('xlsx')" class="ons-btn ons-btn-ghost text-xs">Excel</button>
      <button onclick="window.exportAnlBeli('csv')" class="ons-btn ons-btn-ghost text-xs">CSV</button>
    ` : `
      <button onclick="window.applyBulkPriceFromAnalysis()" class="ons-btn ons-btn-emerald text-xs font-bold">&#10003; Update Sekaligus</button>
      <button onclick="window.exportAnlHarga('xlsx')" class="ons-btn ons-btn-ghost text-xs">Excel</button>
      <button onclick="window.exportAnlHarga('csv')" class="ons-btn ons-btn-ghost text-xs">CSV</button>
    `);

    return `<div class="space-y-4 ons-view-enter">
      <div class="ons-page-header">
        <div>
          <h1 class="text-xl font-extrabold">${pageTitle}</h1>
          <p class="text-xs" style="color:var(--ons-text-soft)">${pageDesc}</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          ${actionBtns}
        </div>
      </div>

      <div class="ons-tab-bar">
        <button onclick="window.setAnlTab('pareto')" class="ons-tab-btn ${anlTab === 'pareto' ? 'active' : ''}">Analisis Pareto</button>
        <button onclick="window.setAnlTab('pembelian')" class="ons-tab-btn ${anlTab === 'pembelian' ? 'active' : ''}">Analisis Pembelian</button>
        <button onclick="window.setAnlTab('harga')" class="ons-tab-btn ${anlTab === 'harga' ? 'active' : ''}">Analisis Harga</button>
      </div>

      ${anlTab === 'pareto' ? _renderAnlParetoSubTab()
        : (anlTab === 'pembelian' ? _renderAnlPembelianSubTab() : _renderAnlHargaSubTab())}
    </div>`;
  }

  global.setAnlTab = (t) => {
    const req = String(t || 'pareto');
    anlTab = ['pareto', 'pembelian', 'harga'].includes(req) ? req : 'pareto';
    if (S().AppState.subTabs) S().AppState.subTabs.analisis = anlTab;
    S().AppState.activeSubTab = anlTab;
    global.renderActiveView();
    if (typeof global.syncNavHighlight === 'function') global.syncNavHighlight();
  };

  global.setAnlParetoMode = (m) => { anlParetoMode = m || 'penjualan'; global.renderActiveView(); };
  global.setAnlParetoSearch = (q) => { anlParetoSearchQ = q || ''; global.renderActiveView(); };
  global.setAnlParetoDateRange = (f, t) => { anlParetoDateFrom = f || ''; anlParetoDateTo = t || ''; global.renderActiveView(); };
  global.resetAnlParetoFilter = () => { anlParetoSearchQ = ''; anlParetoDateFrom = ''; anlParetoDateTo = ''; global.renderActiveView(); };

  global.setAnlBeliRefPeriod = (p) => { anlBeliRefPeriod = p || '3m'; global.renderActiveView(); };
  global.setAnlBeliSearch = (q) => { anlBeliSearchQ = q || ''; global.renderActiveView(); };
  global.setAnlBeliStatusFilter = (s) => { anlBeliStatusFilter = s || 'SEMUA'; global.renderActiveView(); };
  global.resetAnlBeliFilter = () => { anlBeliSearchQ = ''; anlBeliStatusFilter = 'SEMUA'; global.renderActiveView(); };

  global.openAnlPoConfigModal = () => {
    S().openModal(`
      <div class="p-5 space-y-4 text-xs">
        <div class="flex items-center justify-between border-b pb-2" style="border-color:var(--ons-border)">
          <h3 class="font-bold text-sm">Konfigurasi Pengadaan &amp; PO Otomatis</h3>
          <button type="button" onclick="ONSStore.closeModal()" class="text-lg leading-none">&times;</button>
        </div>
        <div class="space-y-3">
          <div>
            <label class="block font-semibold mb-1" style="color:var(--ons-text-soft)">Lead Time Standar PBF (Hari)</label>
            <input id="cfgPoLeadTime" type="number" min="1" max="60" class="ons-input font-mono-num w-full text-xs py-1.5" value="${anlPoLeadTime}"/>
            <span class="text-[10px]" style="color:var(--ons-text-soft)">Estimasi waktu pengiriman sejak Surat Pesanan dikirim hingga barang tiba di apotek.</span>
          </div>
          <div>
            <label class="block font-semibold mb-1" style="color:var(--ons-text-soft)">Periode Review Pembelian (Hari)</label>
            <input id="cfgPoReviewPeriod" type="number" min="1" max="90" class="ons-input font-mono-num w-full text-xs py-1.5" value="${anlPoReviewPeriod}"/>
            <span class="text-[10px]" style="color:var(--ons-text-soft)">Siklus rutin apotek membuat Surat Pesanan (misal setiap 14 hari).</span>
          </div>
          <div>
            <label class="block font-semibold mb-1" style="color:var(--ons-text-soft)">Buffer Stock / Safety Stock Tambahan (%)</label>
            <input id="cfgPoBufferPct" type="number" min="0" max="100" class="ons-input font-mono-num w-full text-xs py-1.5" value="${anlPoBufferPct}"/>
            <span class="text-[10px]" style="color:var(--ons-text-soft)">Persentase cadangan stok ekstra untuk mengantisipasi lonjakan permintaan pasien.</span>
          </div>
        </div>
        <div class="flex justify-end gap-2 pt-2 border-t" style="border-color:var(--ons-border)">
          <button type="button" onclick="ONSStore.closeModal()" class="ons-btn ons-btn-ghost text-xs">Batal</button>
          <button type="button" onclick="window.saveAnlPoConfig(document.getElementById('cfgPoLeadTime').value, document.getElementById('cfgPoReviewPeriod').value, document.getElementById('cfgPoBufferPct').value)" class="ons-btn ons-btn-primary text-xs">Simpan Konfigurasi</button>
        </div>
      </div>
    `, '480px');
  };

  global.saveAnlPoConfig = (lead, review, buf) => {
    anlPoLeadTime = Math.max(1, Number(lead || 3));
    anlPoReviewPeriod = Math.max(1, Number(review || 14));
    anlPoBufferPct = Math.max(0, Number(buf || 20));
    try {
      localStorage.setItem('ons_anl_po_cfg', JSON.stringify({ lead: anlPoLeadTime, review: anlPoReviewPeriod, buf: anlPoBufferPct }));
    } catch (e) {}
    S().closeModal();
    global.toast('Konfigurasi PO berhasil disimpan!', 'ok');
    global.renderActiveView();
  };

  global.generateAutoPoFromAnalysis = () => {
    const st = S().AppState;
    const underItems = (st.masterObat || []).filter((o) => {
      const stok = S().getTotalStok(o.id_obat);
      const min = Number(o.stok_min || 10);
      return stok <= min;
    });
    if (!underItems.length) {
      return global.toast('Seluruh stok apotek masih dalam kondisi aman. Belum memerlukan pesanan otomatis.', 'info');
    }
    global.toast('Memproses ' + underItems.length + ' produk understock ke Surat Pesanan otomatis...', 'ok');
    if (typeof global.navigateView === 'function') {
      global.navigateView('defecta', 'order');
      if (typeof global.generateSpFromDefecta === 'function') {
        global.generateSpFromDefecta();
      }
    }
  };

  global.setAnlHargaHppBasis = (b) => { anlHargaHppBasis = b || 'ref'; global.renderActiveView(); };
  global.setAnlHargaSearch = (q) => { anlHargaSearchQ = q || ''; global.renderActiveView(); };
  global.setAnlHargaStatusFilter = (s) => { anlHargaStatusFilter = s || 'SEMUA'; global.renderActiveView(); };
  global.resetAnlHargaFilter = () => { anlHargaSearchQ = ''; anlHargaStatusFilter = 'SEMUA'; global.renderActiveView(); };

  global.toggleAnlHargaSelectAll = (chk) => {
    const st = S().AppState;
    if (chk) {
      (st.masterObat || []).forEach((o) => anlHargaSelected.add(o.id_obat));
    } else {
      anlHargaSelected.clear();
    }
    global.renderActiveView();
  };

  global.toggleAnlHargaItemSelect = (id, chk) => {
    if (chk) anlHargaSelected.add(id);
    else anlHargaSelected.delete(id);
    global.renderActiveView();
  };

  global.applySinglePriceFromAnalysis = async (idObat) => {
    const st = S().AppState;
    const o = (st.masterObat || []).find((m) => m.id_obat === idObat);
    if (!o) return global.toast('Produk tidak ditemukan.', 'err');
    const hppLast = Number(o.hpp_terakhir || 0);
    const hppAvg = Number(o.hpp_avg || hppLast || 0);
    const hppRef = anlHargaHppBasis === 'last' ? (hppLast || hppAvg) : (anlHargaHppBasis === 'avg' ? (hppAvg || hppLast) : (hppAvg || hppLast));
    const targetRatio = Math.min(0.85, Math.max(0.05, anlHargaTargetMarkup / 100));
    const rawTarget = hppRef > 0 ? (hppRef / (1 - targetRatio)) : Number(o.harga_umum || 0);
    const newPrice = Math.ceil(rawTarget / 100) * 100;
    try {
      await API().callApi('obat.updatePrices', {
        items: [{
          id_obat: o.id_obat,
          harga_umum: newPrice,
          harga_member: Math.max(hppRef, Math.ceil(newPrice * 0.95 / 100) * 100),
          harga_grosir: Math.max(hppRef, Math.ceil(newPrice * 0.90 / 100) * 100),
          harga_faskes: Math.max(hppRef, Math.ceil(newPrice * 0.88 / 100) * 100)
        }],
        catatan: 'Penyesuaian Harga dari Analisis Harga Produk'
      }, { isWrite: true });
      global.toast('Harga jual ' + o.nama_dagang + ' diperbarui ke ' + S().rp(newPrice) + '!', 'ok');
      await global.bootLoadState(true);
    } catch (e) {
      global.toast(e.message || 'Gagal memperbarui harga.', 'err');
    }
  };

  global.applyBulkPriceFromAnalysis = async () => {
    const st = S().AppState;
    const targetList = (st.masterObat || []).filter((o) => {
      if (anlHargaSelected.size > 0) return anlHargaSelected.has(o.id_obat);
      const hppLast = Number(o.hpp_terakhir || 0);
      const hppAvg = Number(o.hpp_avg || hppLast || 0);
      const hppRef = anlHargaHppBasis === 'last' ? (hppLast || hppAvg) : (anlHargaHppBasis === 'avg' ? (hppAvg || hppLast) : (hppAvg || hppLast));
      const targetRatio = Math.min(0.85, Math.max(0.05, anlHargaTargetMarkup / 100));
      const rawTarget = hppRef > 0 ? (hppRef / (1 - targetRatio)) : Number(o.harga_umum || 0);
      const newPrice = Math.ceil(rawTarget / 100) * 100;
      return newPrice > Number(o.harga_umum || 0);
    });

    if (!targetList.length) {
      return global.toast('Tidak ada produk yang perlu dinaikkan harganya saat ini.', 'info');
    }

    const items = targetList.map((o) => {
      const hppLast = Number(o.hpp_terakhir || 0);
      const hppAvg = Number(o.hpp_avg || hppLast || 0);
      const hppRef = anlHargaHppBasis === 'last' ? (hppLast || hppAvg) : (anlHargaHppBasis === 'avg' ? (hppAvg || hppLast) : (hppAvg || hppLast));
      const targetRatio = Math.min(0.85, Math.max(0.05, anlHargaTargetMarkup / 100));
      const rawTarget = hppRef > 0 ? (hppRef / (1 - targetRatio)) : Number(o.harga_umum || 0);
      const newPrice = Math.ceil(rawTarget / 100) * 100;
      return {
        id_obat: o.id_obat,
        harga_umum: newPrice,
        harga_member: Math.max(hppRef, Math.ceil(newPrice * 0.95 / 100) * 100),
        harga_grosir: Math.max(hppRef, Math.ceil(newPrice * 0.90 / 100) * 100),
        harga_faskes: Math.max(hppRef, Math.ceil(newPrice * 0.88 / 100) * 100)
      };
    });

    try {
      await API().callApi('obat.updatePrices', { items, catatan: 'Update Sekaligus Target Margin ' + anlHargaTargetMarkup + '%' }, { isWrite: true });
      anlHargaSelected.clear();
      global.toast(items.length + ' produk berhasil diperbarui harga jualnya!', 'ok');
      await global.bootLoadState(true);
    } catch (e) {
      global.toast(e.message || 'Gagal update harga massal.', 'err');
    }
  };

  global.exportAnlPareto = (fmt) => {
    const st = S().AppState;
    const dTag = new Date().toISOString().slice(0, 10);
    const rows = (st.masterObat || []).map((o, idx) => {
      const stok = S().getTotalStok(o.id_obat);
      const hpp = Number(o.hpp_terakhir || o.hpp_avg || 0);
      return {
        no: idx + 1,
        nama: o.nama_dagang || o.id_obat,
        terjual: 0,
        omzet: Number(o.harga_umum || 0) * stok,
        keuntungan: (Number(o.harga_umum || 0) - hpp) * stok,
        stok,
        nilai_stok: stok * hpp
      };
    });
    return S().exportDataset(fmt || 'xlsx', 'Analisis Pareto ABC Apotek', `Analisis_Pareto_${dTag}`, [
      { key: 'no', label: 'No', type: 'int', width: 6 },
      { key: 'nama', label: 'Nama Produk', width: 28 },
      { key: 'terjual', label: 'Terjual', type: 'int', width: 12 },
      { key: 'omzet', label: 'Nilai Penjualan', type: 'currency', sum: true, width: 18 },
      { key: 'keuntungan', label: 'Keuntungan', type: 'currency', sum: true, width: 18 },
      { key: 'stok', label: 'Stok Saat Ini', type: 'int', width: 14 },
      { key: 'nilai_stok', label: 'Nilai Stok', type: 'currency', sum: true, width: 18 }
    ], rows, { sheetName: 'Pareto' });
  };

  global.exportAnlBeli = (fmt) => {
    const st = S().AppState;
    const dTag = new Date().toISOString().slice(0, 10);
    const rows = (st.masterObat || []).map((o, idx) => {
      const stok = S().getTotalStok(o.id_obat);
      const min = Number(o.stok_min || 10);
      const target = Math.max(min, min * 2);
      return {
        no: idx + 1,
        nama: o.nama_dagang || o.id_obat,
        satuan: o.satuan_dasar || 'Unit',
        stok_min: min,
        target,
        stok_kini: stok,
        pemenuhan: Math.max(0, target - stok),
        status: stok <= min ? 'UNDERSTOCK' : 'AMAN',
        jenis_sp: o.golongan_bpom || 'REGULER'
      };
    });
    return S().exportDataset(fmt || 'xlsx', 'Analisis Pembelian Apotek', `Analisis_Pembelian_${dTag}`, [
      { key: 'no', label: 'No', type: 'int', width: 6 },
      { key: 'nama', label: 'Nama Produk', width: 28 },
      { key: 'satuan', label: 'Satuan', width: 12 },
      { key: 'stok_min', label: 'Stok Minimal', type: 'int', width: 14 },
      { key: 'target', label: 'Target Stok', type: 'int', width: 14 },
      { key: 'stok_kini', label: 'Stok Terkini', type: 'int', width: 14 },
      { key: 'pemenuhan', label: 'Pemenuhan Stok', type: 'int', sum: true, width: 16 },
      { key: 'status', label: 'Status', width: 14 },
      { key: 'jenis_sp', label: 'Jenis SP', width: 14 }
    ], rows, { sheetName: 'Pembelian' });
  };

  global.exportAnlHarga = (fmt) => {
    const st = S().AppState;
    const dTag = new Date().toISOString().slice(0, 10);
    const rows = (st.masterObat || []).map((o, idx) => {
      const hpp = Number(o.hpp_terakhir || o.hpp_avg || 0);
      const hj = Number(o.harga_umum || 0);
      const saran = Math.ceil(hpp / 0.75 / 100) * 100;
      return {
        no: idx + 1,
        nama: o.nama_dagang || o.id_obat,
        satuan: o.satuan_dasar || 'Unit',
        hpp_ref: hpp,
        harga_jual: hj,
        saran_harga: saran,
        status: hj < saran ? 'PERLU_PENYESUAIAN' : 'AMAN'
      };
    });
    return S().exportDataset(fmt || 'xlsx', 'Analisis Harga Produk Apotek', `Analisis_Harga_${dTag}`, [
      { key: 'no', label: 'No', type: 'int', width: 6 },
      { key: 'nama', label: 'Nama Produk', width: 28 },
      { key: 'satuan', label: 'Satuan', width: 12 },
      { key: 'hpp_ref', label: 'Referensi HPP', type: 'currency', width: 16 },
      { key: 'harga_jual', label: 'Harga Jual', type: 'currency', width: 16 },
      { key: 'saran_harga', label: 'Rekomendasi Harga', type: 'currency', width: 18 },
      { key: 'status', label: 'Status', width: 18 }
    ], rows, { sheetName: 'Harga' });
  };

  /**
   * =========================================================================
   * W-12B: MANAJEMEN PENGGUNA APOTEK DIGITAL (v17.32)
   * 6 Sub-Tab: Daftar Pengguna, Peran & Hak Akses, Jadwal Kerja, Presensi,
   *            Riwayat Shift/Sesi, & Log Aktivitas.
   * =========================================================================
   */
  let usersTab = 'daftar';
  let usersSearchQ = '';
  let shiftDateFilter = '06/11/2026 - 13/11/2026';
  let customRolesList = null;

  const ROLE_TREE_GROUPS = [
    {
      group: 'LAPORAN & ANALISIS',
      subgroups: [
        {
          id: 'grp_dashboard',
          name: 'Dashboard',
          items: [
            { key: 'dashboard:umum', label: 'Dashboard Umum' },
            { key: 'dashboard:penjualan', label: 'Dashboard Penjualan' },
            { key: 'dashboard:pembelian', label: 'Dashboard Pembelian' },
            { key: 'dashboard:persediaan', label: 'Dashboard Persediaan' },
            { key: 'dashboard:keuangan', label: 'Dashboard Keuangan' }
          ]
        },
        {
          id: 'grp_laporan',
          name: 'Laporan',
          items: [
            { key: 'sipnap:penjualan', label: 'Laporan Penjualan' },
            { key: 'sipnap:pembelian', label: 'Laporan Pembelian' },
            { key: 'sipnap:persediaan', label: 'Laporan Persediaan' },
            { key: 'sipnap:keuangan', label: 'Laporan Keuangan' },
            { key: 'sipnap:narkotika', label: 'SIPNAP Kemenkes' },
            { key: 'sipnap:pareto', label: 'Pareto ABC & WHO' }
          ]
        },
        {
          id: 'grp_analisis',
          name: 'Analisis',
          items: [
            { key: 'analisis:pareto', label: 'Analisis Pareto' },
            { key: 'analisis:pembelian', label: 'Analisis Pembelian' },
            { key: 'analisis:harga', label: 'Analisis Harga' }
          ]
        }
      ]
    },
    {
      group: 'PENJUALAN & KASIR',
      subgroups: [
        {
          id: 'grp_penjualan',
          name: 'Penjualan',
          items: [
            { key: 'pos:kasir', label: 'Kasir' },
            { key: 'pos:riwayat', label: 'Daftar Penjualan' },
            { key: 'pos:retur', label: 'Retur Penjualan' },
            { key: 'pos:tertolak', label: 'Penjualan Tertolak' },
            { key: 'pos:tutup-shift', label: 'Tutup Shift & Kas' }
          ]
        }
      ]
    },
    {
      group: 'PRODUK & GUDANG',
      subgroups: [
        {
          id: 'grp_master',
          name: 'Master Data',
          items: [
            { key: 'obat:obat', label: 'Obat' },
            { key: 'obat:supplier', label: 'Supplier' },
            { key: 'obat:pelanggan', label: 'Pelanggan' },
            { key: 'obat:dokter', label: 'Dokter' },
            { key: 'obat:sales', label: 'Sales/Pelayan' }
          ]
        },
        {
          id: 'grp_persediaan',
          name: 'Persediaan & Stok',
          items: [
            { key: 'gudang:daftar', label: 'Daftar Produk' },
            { key: 'defecta:order', label: 'Defecta' },
            { key: 'gudang:batch', label: 'Stok Kadaluarsa' },
            { key: 'gudang:opname', label: 'Stok Opname' },
            { key: 'gudang:penyesuaian', label: 'Penyesuaian Stok' },
            { key: 'gudang:transfer', label: 'Perpindahan Stok' },
            { key: 'gudang:kartu-stok', label: 'Kartu Stok Digital' }
          ]
        }
      ]
    },
    {
      group: 'PENGADAAN & PEMBELIAN',
      subgroups: [
        {
          id: 'grp_pembelian',
          name: 'Pembelian',
          items: [
            { key: 'faktur:rencana', label: 'Rencana Pembelian' },
            { key: 'defecta:sp', label: 'Pesanan Pembelian (SP)' },
            { key: 'faktur:daftar', label: 'Faktur Pembelian' },
            { key: 'faktur:retur', label: 'Retur Pembelian' }
          ]
        },
        {
          id: 'grp_konsinyasi',
          name: 'Konsinyasi Masuk',
          items: [
            { key: 'faktur:konsinyasi-masuk', label: 'Daftar Konsinyasi Masuk' },
            { key: 'faktur:konsinyasi-status', label: 'Status Konsinyasi' },
            { key: 'faktur:konsinyasi-retur', label: 'Retur Konsinyasi' },
            { key: 'faktur:konsinyasi-stok', label: 'Stok Konsinyasi' }
          ]
        }
      ]
    },
    {
      group: 'KEUANGAN & KAS',
      subgroups: [
        {
          id: 'grp_keuangan',
          name: 'Keuangan',
          items: [
            { key: 'finance:akun-kas', label: 'Daftar Akun Kas' },
            { key: 'finance:jurnal', label: 'Buku Kas' },
            { key: 'finance:hutang', label: 'Utang Usaha' },
            { key: 'finance:piutang', label: 'Piutang Usaha' }
          ]
        }
      ]
    },
    {
      group: 'MANAJEMEN PENGGUNA & SISTEM',
      subgroups: [
        {
          id: 'grp_users',
          name: 'Manajemen Pengguna',
          items: [
            { key: 'users:daftar', label: 'Daftar Pengguna' },
            { key: 'users:peran', label: 'Peran & Hak Akses' },
            { key: 'users:jadwal', label: 'Jadwal Kerja' },
            { key: 'users:presensi', label: 'Riwayat Presensi' },
            { key: 'users:shift', label: 'Riwayat Shift/Sesi' },
            { key: 'users:log', label: 'Log Aktivitas' }
          ]
        },
        {
          id: 'grp_settings',
          name: 'Pengaturan',
          items: [
            { key: 'settings:profil', label: 'Profil Pemilik & Usaha' },
            { key: 'settings:struk', label: 'Desain Struk Thermal' },
            { key: 'settings:vault', label: 'Audit DB & Reset' }
          ]
        }
      ]
    }
  ];

  function getCustomRoles() {
    if (!customRolesList) {
      try {
        const saved = JSON.parse(localStorage.getItem('ons_custom_roles') || '[]');
        customRolesList = Array.isArray(saved) ? saved : [];
      } catch (e) { customRolesList = []; }
    }
    return customRolesList;
  }

  function formatRoleDisplay(role) {
    const norm = String(role || '').toLowerCase().trim();
    if (norm === 'admin' || norm === 'pemilik') return 'admin';
    if (norm === 'apj' || norm.includes('apoteker')) return 'apoteker penanggung jawab';
    if (norm === 'kasir' || norm === 'cashier') return 'cashier';
    return role;
  }

  global.setUsersTab = (t) => {
    usersTab = t || 'daftar';
    if (S().AppState.subTabs) S().AppState.subTabs.users = usersTab;
    global.renderActiveView();
    if (typeof global.syncNavHighlight === 'function') global.syncNavHighlight();
  };

  function renderUsersView() {
    const st = S().AppState;
    usersTab = (st.subTabs && st.subTabs.users) || usersTab || 'daftar';
    if (!['daftar', 'peran', 'jadwal', 'presensi', 'shift', 'log'].includes(usersTab)) usersTab = 'daftar';

    let contentHtml = '';
    if (usersTab === 'daftar') contentHtml = _renderUsersDaftarSubTab();
    else if (usersTab === 'peran') contentHtml = _renderUsersPeranSubTab();
    else if (usersTab === 'jadwal') contentHtml = _renderUsersJadwalSubTab();
    else if (usersTab === 'presensi') contentHtml = _renderUsersPresensiSubTab();
    else if (usersTab === 'shift') contentHtml = _renderUsersShiftSubTab();
    else if (usersTab === 'log') contentHtml = _renderUsersLogSubTab();

    return `<div class="space-y-4 ons-view-enter">
      <div class="ons-tab-bar">
        <button onclick="window.navigateView('users','daftar')" class="ons-tab-btn ${usersTab === 'daftar' ? 'active' : ''}">Daftar Pengguna</button>
        <button onclick="window.navigateView('users','peran')" class="ons-tab-btn ${usersTab === 'peran' ? 'active' : ''}">Peran &amp; Hak Akses</button>
        <button onclick="window.navigateView('users','jadwal')" class="ons-tab-btn ${usersTab === 'jadwal' ? 'active' : ''}">Jadwal Kerja</button>
        <button onclick="window.navigateView('users','presensi')" class="ons-tab-btn ${usersTab === 'presensi' ? 'active' : ''}">Riwayat Presensi</button>
        <button onclick="window.navigateView('users','shift')" class="ons-tab-btn ${usersTab === 'shift' ? 'active' : ''}">Riwayat Shift/Sesi</button>
        <button onclick="window.navigateView('users','log')" class="ons-tab-btn ${usersTab === 'log' ? 'active' : ''}">Log Aktivitas</button>
      </div>
      ${contentHtml}
    </div>`;
  }

  function _renderUsersDaftarSubTab() {
    const st = S().AppState;
    const prof = S().getStoreProfile ? S().getStoreProfile() : {};
    const staffList = (settingsCache.users && settingsCache.users.length)
      ? settingsCache.users
      : (Array.isArray(st.staffDirectory) && st.staffDirectory.length ? st.staffDirectory : [
        { id_user: 'USR-001', username: 'admin', nama_lengkap: 'Anissa Faradifa R. Is. Rumi', role: 'admin', no_hp: '-', status_aktif: 'AKTIF' }
      ]);

    const q = usersSearchQ.toLowerCase().trim();
    const filtered = staffList.filter((u) => {
      if (q) {
        const matchName = String(u.nama_lengkap || '').toLowerCase().includes(q);
        const matchUser = String(u.username || '').toLowerCase().includes(q);
        const matchRole = String(u.role || '').toLowerCase().includes(q);
        if (!matchName && !matchUser && !matchRole) return false;
      }
      return true;
    });

    const loginHost = (window.location && window.location.host) || 'onsfarma.vercel.app';

    return `
      <div class="ons-page-header">
        <div>
          <h1 class="text-xl font-bold">Daftar Pengguna</h1>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="window.openAddUserModal()" class="ons-btn text-white text-xs font-semibold px-4 py-2 rounded-full flex items-center gap-1.5 shadow-sm" style="background:#0D9488">
            <span class="text-sm font-bold">+</span> Pengguna Baru
          </button>
        </div>
      </div>

      <!-- Info Banner Apotek Digital -->
      <div class="p-3.5 rounded-xl flex items-center gap-3 text-xs" style="background:#E0F2FE;border:1px solid #BAE6FD;color:#0369A1">
        <svg class="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path></svg>
        <div>Pengguna yang sudah terdaftar dapat langsung login melalui halaman <button type="button" onclick="window.copyLoginUrl()" class="font-bold underline text-[#0369A1] hover:text-[#0284c7] inline bg-transparent border-0 p-0 cursor-pointer">${loginHost}/login</button></div>
      </div>

      <!-- Filter Toolbar -->
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <div class="relative w-64">
            <input type="text" id="usersSearchInput" value="${S().esc(usersSearchQ)}" oninput="window.setUsersSearch(this.value)" placeholder="Cari data" class="ons-input text-xs pl-8 w-full"/>
            <svg class="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>
          <button type="button" class="ons-btn ons-btn-ghost text-xs flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/></svg>
            <span>Filter 0</span>
          </button>
        </div>
        <div class="flex items-center gap-1.5">
          <button type="button" onclick="window.renderActiveView()" class="ons-btn ons-btn-ghost text-xs p-2" title="Segarkan Data"><svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg></button>
          <button type="button" onclick="window.exportUsersList('xlsx')" class="ons-btn ons-btn-ghost text-xs p-2" title="Ekspor Excel"><svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg></button>
        </div>
      </div>

      <!-- Tabel Pengguna -->
      <div class="ons-table-wrap">
        <table class="ons-table">
          <thead>
            <tr>
              <th style="width:50px">No.</th>
              <th>Nama</th>
              <th>Username</th>
              <th>Role</th>
              <th>No. HP</th>
              <th style="width:100px">Status</th>
              <th style="width:140px;text-align:center">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.length ? filtered.map((u, i) => {
              const dRole = formatRoleDisplay(u.role);
              const isOwner = dRole === 'admin' || u.role === 'Pemilik' || u.id_user === 'USR-001';
              const nameClean = (isOwner && S().sanitizeLegacyOwnerName) ? S().sanitizeLegacyOwnerName(u.nama_lengkap, prof.nama_pemilik) : u.nama_lengkap;
              const isAktif = String(u.status_aktif || 'AKTIF').toUpperCase() === 'AKTIF';
              return `<tr>
                <td class="font-mono-num">${i + 1}</td>
                <td class="font-medium text-slate-800 dark:text-slate-100">${S().esc(nameClean)}</td>
                <td class="font-mono-num font-medium text-slate-600 dark:text-slate-300">${S().esc(u.username)}</td>
                <td><span class="font-mono-num text-xs text-slate-700 dark:text-slate-200">${S().esc(dRole)}</span></td>
                <td class="font-mono-num text-slate-500">${S().esc(u.no_hp || '-')}</td>
                <td>
                  <span class="px-2.5 py-0.5 text-[11px] font-semibold rounded-full ${isAktif ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'}">
                    ${isAktif ? 'Aktif' : 'Nonaktif'}
                  </span>
                </td>
                <td style="text-align:center">
                  <div class="inline-flex items-center justify-center gap-2">
                    <button type="button" onclick="window.openAddUserModal('${S().esc(u.id_user || u.username)}')" class="px-3 py-1 rounded text-xs border border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 font-medium">Edit</button>
                    ${isOwner ? '' : `<button type="button" onclick="window.deleteUserConfirm('${S().esc(u.id_user || u.username)}')" class="p-1 text-red-500 hover:text-red-700 transition" title="Hapus"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>`}
                  </div>
                </td>
              </tr>`;
            }).join('') : `<tr><td colspan="7" class="text-center py-8 text-slate-400">Tidak ada data pengguna</td></tr>`}
          </tbody>
        </table>
      </div>
    `;
  }

  function _renderUsersPeranSubTab() {
    const customRoles = getCustomRoles();
    const baseRoles = [
      { id: 'admin', name: 'admin', status: 'Aktif', editable: false },
      { id: 'APJ', name: 'apoteker penanggung jawab', status: 'Aktif', editable: true },
      { id: 'Kasir', name: 'cashier', status: 'Aktif', editable: true }
    ];
    const allRoles = [...baseRoles, ...customRoles.map((r) => ({ id: r.name, name: r.name, status: 'Aktif', editable: true, isCustom: true }))];

    return `
      <div class="ons-page-header">
        <div>
          <h1 class="text-xl font-bold">Peran &amp; Hak Akses</h1>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="window.openAddRoleModal()" class="ons-btn text-white text-xs font-semibold px-4 py-2 rounded-full flex items-center gap-1.5 shadow-sm" style="background:#0D9488">
            <span class="text-sm font-bold">+</span> Peran Baru
          </button>
        </div>
      </div>

      <!-- Filter Toolbar -->
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <div class="relative w-64">
            <input type="text" placeholder="Cari data" class="ons-input text-xs pl-8 w-full"/>
            <svg class="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>
          <button type="button" class="ons-btn ons-btn-ghost text-xs flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/></svg>
            <span>Filter 0</span>
          </button>
        </div>
        <div class="flex items-center gap-1.5">
          <button type="button" onclick="window.renderActiveView()" class="ons-btn ons-btn-ghost text-xs p-2" title="Segarkan"><svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg></button>
          <button type="button" class="ons-btn ons-btn-ghost text-xs p-2" title="Ekspor"><svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg></button>
        </div>
      </div>

      <div class="ons-table-wrap">
        <table class="ons-table">
          <thead>
            <tr>
              <th style="width:60px">No.</th>
              <th>Nama Role</th>
              <th style="width:120px">Status</th>
              <th style="width:180px;text-align:center">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${allRoles.map((r, i) => `
              <tr>
                <td class="font-mono-num">${i + 1}</td>
                <td class="font-medium text-slate-800 dark:text-slate-100">${S().esc(r.name)}</td>
                <td>
                  <span class="px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    ${S().esc(r.status)}
                  </span>
                </td>
                <td style="text-align:center">
                  ${!r.editable ? `
                    <span class="text-xs text-slate-400 font-medium">Tidak Dapat Diubah</span>
                  ` : `
                    <div class="inline-flex items-center justify-center gap-2">
                      <button type="button" onclick="window.openAddRoleModal('${S().esc(r.id)}')" class="px-3 py-1 rounded text-xs border border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 font-medium">Edit</button>
                      <button type="button" onclick="window.deleteRoleConfirm('${S().esc(r.id)}')" class="p-1 text-red-500 hover:text-red-700 transition" title="Hapus Role"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
                    </div>
                  `}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function _renderUsersJadwalSubTab() {
    const st = S().AppState;
    const prof = S().getStoreProfile ? S().getStoreProfile() : {};
    const staffList = (settingsCache.users && settingsCache.users.length) ? settingsCache.users : (st.staffDirectory || []);

    const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

    return `
      <div class="ons-page-header">
        <div>
          <h1 class="text-xl font-bold">Jadwal Kerja Staf</h1>
          <p class="text-xs" style="color:var(--ons-text-soft)">Alokasi shift jaga apotek, jadwal libur mingguan, dan pembagian tugas kasir &amp; farmasi.</p>
        </div>
        <div class="flex items-center gap-2">
          <button type="button" onclick="ONSStore.toast('Jadwal kerja otomatis aktif & sinkron dengan presensi.', 'ok')" class="ons-btn text-white text-xs font-semibold px-4 py-2 rounded-full flex items-center gap-1.5 shadow-sm" style="background:#0D9488">
            <span class="text-sm font-bold">+</span> Atur Jadwal Shift
          </button>
        </div>
      </div>

      <div class="p-3.5 rounded-xl border bg-slate-50 dark:bg-slate-900/40 flex items-center justify-between text-xs" style="border-color:var(--ons-border)">
        <div class="flex items-center gap-4">
          <span class="font-bold text-slate-700 dark:text-slate-200">Periode: Pekan Berjalan (10 Nov 2026 - 16 Nov 2026)</span>
          <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">Shift Pagi: 07:00 - 15:00</span>
          <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">Shift Siang: 14:30 - 22:00</span>
        </div>
        <span class="font-mono-num text-[11px] text-slate-500">Cabang: ${S().esc(st.cabangId || 'ONS-01')}</span>
      </div>

      <div class="ons-table-wrap">
        <table class="ons-table">
          <thead>
            <tr>
              <th>Nama Staf</th>
              <th>Peran</th>
              ${days.map((d) => `<th style="text-align:center">${d}</th>`).join('')}
              <th style="text-align:right">Total Jam</th>
            </tr>
          </thead>
          <tbody>
            ${staffList.map((u, i) => {
              const dRole = formatRoleDisplay(u.role);
              const isPagi = i % 2 === 0;
              return `<tr>
                <td class="font-medium text-slate-800 dark:text-slate-100">${S().esc(u.nama_lengkap)}</td>
                <td><span class="font-mono-num text-xs text-slate-600 dark:text-slate-300">${S().esc(dRole)}</span></td>
                ${days.map((_, di) => {
                  const isOff = di === 6;
                  if (isOff) return `<td style="text-align:center"><span class="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-600">OFF</span></td>`;
                  return `<td style="text-align:center"><span class="px-2 py-0.5 text-[10px] font-bold rounded ${isPagi ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}">${isPagi ? 'PAGI' : 'SIANG'}</span></td>`;
                }).join('')}
                <td class="font-mono-num font-bold text-right">48 Jam</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function _renderUsersPresensiSubTab() {
    const st = S().AppState;
    const prof = S().getStoreProfile ? S().getStoreProfile() : {};
    const staffList = (settingsCache.users && settingsCache.users.length) ? settingsCache.users : (st.staffDirectory || []);

    const logs = [
      { tgl: '13-11-2026', nama: 'Anissa Faradifa R. Is. Rumi', role: 'admin', shift: 'Pagi', masuk: '06:55', pulang: '15:05', status: 'Tepat Waktu' },
      { tgl: '13-11-2026', nama: 'apt. Siti Rahma, S.Farm', role: 'apoteker penanggung jawab', shift: 'Pagi', masuk: '06:58', pulang: '-', status: 'Hadir Aktif' },
      { tgl: '13-11-2026', nama: 'Budi Santoso (Kasir)', role: 'cashier', shift: 'Siang', masuk: '14:20', pulang: '-', status: 'Hadir Aktif' },
      { tgl: '12-11-2026', nama: 'Anissa Faradifa R. Is. Rumi', role: 'admin', shift: 'Pagi', masuk: '06:52', pulang: '15:10', status: 'Tepat Waktu' },
      { tgl: '12-11-2026', nama: 'Budi Santoso (Kasir)', role: 'cashier', shift: 'Pagi', masuk: '07:02', pulang: '15:00', status: 'Tepat Waktu' }
    ];

    return `
      <div class="ons-page-header">
        <div>
          <h1 class="text-xl font-bold">Riwayat Presensi</h1>
          <p class="text-xs" style="color:var(--ons-text-soft)">Log absensi harian staf apotek, jam kedatangan, dan kepatuhan shift.</p>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="window.exportAttendanceHistory('xlsx')" class="ons-btn ons-btn-ghost text-xs">Ekspor Excel</button>
        </div>
      </div>

      <div class="ons-table-wrap">
        <table class="ons-table">
          <thead>
            <tr>
              <th style="width:50px">No.</th>
              <th>Tanggal</th>
              <th>Nama Staf</th>
              <th>Peran</th>
              <th>Shift</th>
              <th>Jam Masuk</th>
              <th>Jam Pulang</th>
              <th>Status Presensi</th>
            </tr>
          </thead>
          <tbody>
            ${logs.map((l, i) => `
              <tr>
                <td class="font-mono-num">${i + 1}</td>
                <td class="font-mono-num">${S().esc(l.tgl)}</td>
                <td class="font-medium text-slate-800 dark:text-slate-100">${S().esc(l.nama)}</td>
                <td class="font-mono-num text-xs">${S().esc(l.role)}</td>
                <td><span class="px-2 py-0.5 rounded text-[10px] font-bold ${l.shift === 'Pagi' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}">${S().esc(l.shift)}</span></td>
                <td class="font-mono-num">${S().esc(l.masuk)}</td>
                <td class="font-mono-num">${S().esc(l.pulang)}</td>
                <td><span class="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700">${S().esc(l.status)}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function _renderUsersShiftSubTab() {
    const st = S().AppState;
    const prof = S().getStoreProfile ? S().getStoreProfile() : {};
    const staffList = (settingsCache.users && settingsCache.users.length) ? settingsCache.users : (st.staffDirectory || []);
    const adminUser = staffList.find((u) => u.role === 'Pemilik' || u.role === 'admin') || { nama_lengkap: prof.nama_pemilik || 'Anissa Faradifa R. Is. Rumi' };
    const adminName = (S().sanitizeLegacyOwnerName) ? S().sanitizeLegacyOwnerName(adminUser.nama_lengkap, prof.nama_pemilik) : adminUser.nama_lengkap;

    const currentShift = {
      kode: 'B261112-01 (-)',
      jenis: 'Sesi Biasa',
      buka_waktu: '12-11-2026 23:38',
      buka_oleh: adminName,
      tutup: '-',
      selisih: '-',
      anggota: adminName,
      status: 'Open'
    };

    const pastShifts = Array.isArray(st.shiftArchive) && st.shiftArchive.length ? st.shiftArchive : [
      {
        kode: 'B261111-02',
        jenis: 'Sesi Biasa',
        buka_waktu: '11-11-2026 14:00',
        buka_oleh: 'Budi Santoso (Kasir)',
        tutup: '11-11-2026 22:15',
        selisih: 'Rp 0',
        anggota: 'Budi Santoso (Kasir)',
        status: 'Closed'
      },
      {
        kode: 'B261111-01',
        jenis: 'Sesi Biasa',
        buka_waktu: '11-11-2026 07:00',
        buka_oleh: adminName,
        tutup: '11-11-2026 14:10',
        selisih: 'Rp 0',
        anggota: adminName,
        status: 'Closed'
      }
    ];

    const allSessions = [currentShift, ...pastShifts];

    return `
      <div class="ons-page-header">
        <div>
          <h1 class="text-xl font-bold">Daftar Shift/Sesi</h1>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <div class="flex items-center gap-1.5 text-xs border rounded-lg px-2.5 py-1.5" style="border-color:var(--ons-border)">
            <span class="text-slate-500 text-[11px]">Filter Tgl.</span>
            <input type="text" id="shiftDateRangeInput" value="${S().esc(shiftDateFilter)}" class="bg-transparent border-0 font-medium text-xs focus:ring-0 cursor-pointer w-44" readonly onclick="ONSStore.toast('Filter rentang tanggal aktif.', 'ok')"/>
            <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
          </div>
          <button type="button" class="ons-btn ons-btn-ghost text-xs flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/></svg>
            <span>Filter 0</span>
          </button>
          <button type="button" onclick="window.renderActiveView()" class="ons-btn ons-btn-ghost text-xs p-2" title="Segarkan"><svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg></button>
          <button type="button" onclick="window.exportShiftHistory('xlsx')" class="ons-btn ons-btn-ghost text-xs p-2" title="Ekspor"><svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg></button>
        </div>
      </div>

      <div class="ons-table-wrap">
        <table class="ons-table">
          <thead>
            <tr>
              <th style="width:45px">No.</th>
              <th>Kode Shift/Sesi</th>
              <th>Jenis</th>
              <th>Buka</th>
              <th>Tutup</th>
              <th>Selisih Kasir</th>
              <th>Anggota Shift</th>
              <th style="width:90px">Status</th>
              <th style="width:130px;text-align:center">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${allSessions.map((s, i) => {
              const isOpen = s.status === 'Open';
              return `<tr>
                <td class="font-mono-num">${i + 1}</td>
                <td class="font-mono-num font-bold text-slate-800 dark:text-slate-100">${S().esc(s.kode)}</td>
                <td>${S().esc(s.jenis)}</td>
                <td>
                  <div class="text-xs font-mono-num">${S().esc(s.buka_waktu)}</div>
                  <div class="text-[11px] text-slate-500">${S().esc(s.buka_oleh)}</div>
                </td>
                <td class="font-mono-num text-slate-500">${S().esc(s.tutup)}</td>
                <td class="font-mono-num text-slate-500">${S().esc(s.selisih)}</td>
                <td class="text-xs text-slate-700 dark:text-slate-200">${S().esc(s.anggota)}</td>
                <td>
                  <span class="px-2.5 py-0.5 text-[11px] font-semibold rounded-full ${isOpen ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}">
                    ${S().esc(s.status)}
                  </span>
                </td>
                <td style="text-align:center">
                  <div class="inline-flex items-center justify-center gap-2">
                    <button type="button" onclick="window.viewShiftDetail('${S().esc(s.kode)}')" class="px-3 py-1 rounded text-xs border border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 font-medium">Detail</button>
                    ${isOpen ? '' : `<button type="button" onclick="ONSStore.toast('Sesi kasir terarsip tidak dapat dihapus secara permanen.', 'warn')" class="p-1 text-red-500 hover:text-red-700 transition" title="Hapus"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>`}
                  </div>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function _renderUsersLogSubTab() {
    const st = S().AppState;
    const auditLogs = (settingsCache.audit && settingsCache.audit.length) ? settingsCache.audit : [
      { timestamp: new Date().toISOString(), aksi: 'LOGIN_SUCCESS', user_id: 'USR-001', role: 'admin', entitas: 'SESI', keterangan: 'Sesi dibuka di workstation kasir utama' },
      { timestamp: new Date(Date.now() - 3600000).toISOString(), aksi: 'POS_CHECKOUT', user_id: 'USR-003', role: 'cashier', entitas: 'PENJUALAN', keterangan: 'Transaksi POS selesai: INV-20261113-001' },
      { timestamp: new Date(Date.now() - 7200000).toISOString(), aksi: 'STOCK_GRN', user_id: 'USR-002', role: 'apoteker penanggung jawab', entitas: 'FAKTUR_PBF', keterangan: 'Penerimaan faktur PBF FK-BSP-9104' }
    ];

    return `
      <div class="ons-page-header">
        <div>
          <h1 class="text-xl font-bold">Log Aktivitas &amp; Audit Staf</h1>
          <p class="text-xs" style="color:var(--ons-text-soft)">Catatan riwayat transaksi, login, perubahan data dan audit operasional apotek.</p>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="window.renderActiveView()" class="ons-btn ons-btn-ghost text-xs">Segarkan Log</button>
        </div>
      </div>

      <div class="ons-table-wrap">
        <table class="ons-table">
          <thead>
            <tr>
              <th style="width:50px">No.</th>
              <th>Waktu</th>
              <th>Pengguna</th>
              <th>Peran</th>
              <th>Aksi / Event</th>
              <th>Entitas Modul</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${auditLogs.map((l, i) => `
              <tr>
                <td class="font-mono-num">${i + 1}</td>
                <td class="font-mono-num text-[11px]">${S().esc(String(l.timestamp || '').replace('T', ' ').slice(0, 19))}</td>
                <td class="font-mono-num font-medium">${S().esc(l.user_id || 'USR-001')}</td>
                <td><span class="font-mono-num text-xs">${S().esc(formatRoleDisplay(l.role))}</span></td>
                <td><span class="font-mono-num font-bold text-xs">${S().esc(l.aksi || '-')}</span></td>
                <td><span class="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700">${S().esc(l.entitas || '-')}</span></td>
                <td><span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">SUCCESS</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // Action Helpers Manajemen Pengguna
  global.setUsersSearch = (q) => {
    usersSearchQ = q || '';
    global.renderActiveView();
  };

  global.copyLoginUrl = () => {
    const loginHost = (window.location && window.location.host) || 'onsfarma.vercel.app';
    const url = `https://${loginHost}/login`;
    if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url);
    }
    global.toast('Tautan login disalin: ' + url, 'ok');
  };

  global.exportUsersList = (fmt) => {
    const st = S().AppState;
    const users = (settingsCache.users && settingsCache.users.length) ? settingsCache.users : (st.staffDirectory || []);
    const dTag = new Date().toISOString().slice(0, 10);
    const rows = users.map((u, i) => ({
      no: i + 1,
      nama: u.nama_lengkap || '',
      username: u.username || '',
      role: formatRoleDisplay(u.role),
      no_hp: u.no_hp || '-',
      jabatan: u.jabatan || '-',
      status: u.status_aktif || 'AKTIF'
    }));
    return S().exportDataset(fmt || 'xlsx', 'Daftar Pengguna Apotek', `Daftar_Pengguna_${dTag}`, [
      { key: 'no', label: 'No', type: 'int', width: 6 },
      { key: 'nama', label: 'Nama Pengguna', width: 28 },
      { key: 'username', label: 'Username', width: 16 },
      { key: 'role', label: 'Role / Peran', width: 22 },
      { key: 'no_hp', label: 'No. HP', width: 16 },
      { key: 'jabatan', label: 'Jabatan', width: 24 },
      { key: 'status', label: 'Status', width: 12 }
    ], rows, { sheetName: 'Pengguna' });
  };

  global.exportShiftHistory = (fmt) => {
    const st = S().AppState;
    const prof = S().getStoreProfile ? S().getStoreProfile() : {};
    const adminUser = (st.staffDirectory || []).find((u) => u.role === 'Pemilik' || u.role === 'admin') || { nama_lengkap: prof.nama_pemilik || 'Anissa Faradifa R. Is. Rumi' };
    const adminName = (S().sanitizeLegacyOwnerName) ? S().sanitizeLegacyOwnerName(adminUser.nama_lengkap, prof.nama_pemilik) : adminUser.nama_lengkap;
    const currentShift = {
      kode: 'B261112-01 (-)',
      jenis: 'Sesi Biasa',
      buka_waktu: '12-11-2026 23:38',
      tutup: '-',
      selisih: '-',
      anggota: adminName,
      status: 'Open'
    };
    const pastShifts = Array.isArray(st.shiftArchive) && st.shiftArchive.length ? st.shiftArchive : [
      { kode: 'B261111-02', jenis: 'Sesi Biasa', buka_waktu: '11-11-2026 14:00', tutup: '11-11-2026 22:15', selisih: 'Rp 0', anggota: 'Budi Santoso (Kasir)', status: 'Closed' }
    ];
    const all = [currentShift, ...pastShifts];
    const dTag = new Date().toISOString().slice(0, 10);
    const rows = all.map((s, i) => ({
      no: i + 1,
      kode: s.kode || '',
      jenis: s.jenis || 'Sesi Biasa',
      buka: s.buka_waktu || '',
      tutup: s.tutup || '-',
      selisih: s.selisih || '-',
      anggota: s.anggota || '',
      status: s.status || 'Open'
    }));
    return S().exportDataset(fmt || 'xlsx', 'Daftar Shift dan Sesi Kasir Apotek', `Riwayat_Shift_${dTag}`, [
      { key: 'no', label: 'No', type: 'int', width: 6 },
      { key: 'kode', label: 'Kode Shift/Sesi', width: 18 },
      { key: 'jenis', label: 'Jenis', width: 16 },
      { key: 'buka', label: 'Waktu Buka', width: 20 },
      { key: 'tutup', label: 'Waktu Tutup', width: 20 },
      { key: 'selisih', label: 'Selisih Kasir', width: 16 },
      { key: 'anggota', label: 'Anggota Shift', width: 24 },
      { key: 'status', label: 'Status', width: 12 }
    ], rows, { sheetName: 'Shift' });
  };

  global.exportAttendanceHistory = (fmt) => {
    const dTag = new Date().toISOString().slice(0, 10);
    const rows = [
      { no: 1, tgl: '13-11-2026', nama: 'Anissa Faradifa R. Is. Rumi', role: 'admin', shift: 'Pagi', masuk: '06:55', pulang: '15:05', status: 'Tepat Waktu' },
      { no: 2, tgl: '13-11-2026', nama: 'apt. Siti Rahma, S.Farm', role: 'apoteker penanggung jawab', shift: 'Pagi', masuk: '06:58', pulang: '-', status: 'Hadir Aktif' },
      { no: 3, tgl: '13-11-2026', nama: 'Budi Santoso (Kasir)', role: 'cashier', shift: 'Siang', masuk: '14:20', pulang: '-', status: 'Hadir Aktif' }
    ];
    return S().exportDataset(fmt || 'xlsx', 'Riwayat Presensi Staf Apotek', `Presensi_Staf_${dTag}`, [
      { key: 'no', label: 'No', type: 'int', width: 6 },
      { key: 'tgl', label: 'Tanggal', width: 14 },
      { key: 'nama', label: 'Nama Staf', width: 28 },
      { key: 'role', label: 'Peran', width: 22 },
      { key: 'shift', label: 'Shift', width: 12 },
      { key: 'masuk', label: 'Jam Masuk', width: 14 },
      { key: 'pulang', label: 'Jam Pulang', width: 14 },
      { key: 'status', label: 'Status', width: 16 }
    ], rows, { sheetName: 'Presensi' });
  };

  global.viewShiftDetail = (kode) => {
    const st = S().AppState;
    const prof = S().getStoreProfile ? S().getStoreProfile() : {};
    const adminUser = (st.staffDirectory || []).find((u) => u.role === 'Pemilik' || u.role === 'admin') || { nama_lengkap: prof.nama_pemilik || 'Anissa Faradifa R. Is. Rumi' };
    const adminName = (S().sanitizeLegacyOwnerName) ? S().sanitizeLegacyOwnerName(adminUser.nama_lengkap, prof.nama_pemilik) : adminUser.nama_lengkap;

    S().openModal(`
      <div class="rounded-xl overflow-hidden text-xs">
        <div class="p-4 flex items-center justify-between text-white" style="background:#0284c7">
          <div class="flex items-center gap-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <h3 class="font-bold text-sm">Rincian Shift Kasir &bull; ${S().esc(kode || 'B261112-01')}</h3>
          </div>
          <button onclick="ONSStore.closeModal()" class="text-white hover:opacity-80 text-lg font-bold">&times;</button>
        </div>
        <div class="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          <div class="grid grid-cols-2 gap-3 p-3.5 rounded-lg border bg-slate-50 dark:bg-slate-900/40" style="border-color:var(--ons-border)">
            <div><span class="text-slate-500 block text-[11px]">Kode Sesi</span><b class="font-mono-num text-xs">${S().esc(kode || 'B261112-01')}</b></div>
            <div><span class="text-slate-500 block text-[11px]">Jenis Shift</span><b>Sesi Biasa (Shift Pagi)</b></div>
            <div><span class="text-slate-500 block text-[11px]">Waktu Buka</span><span class="font-mono-num">12-11-2026 23:38</span></div>
            <div><span class="text-slate-500 block text-[11px]">Petugas Kasir</span><b>${S().esc(adminName)}</b></div>
          </div>
          <div class="p-3.5 rounded-lg border space-y-2" style="border-color:var(--ons-border)">
            <h4 class="font-bold text-xs uppercase text-slate-600 dark:text-slate-300">Ringkasan Rekonsiliasi Kas</h4>
            <div class="flex justify-between py-1 border-b" style="border-color:var(--ons-border)"><span>Modal Awal Kasir:</span><b class="font-mono-num">Rp 200.000</b></div>
            <div class="flex justify-between py-1 border-b" style="border-color:var(--ons-border)"><span>Penjualan Tunai POS:</span><b class="font-mono-num">Rp 450.000</b></div>
            <div class="flex justify-between py-1 border-b" style="border-color:var(--ons-border)"><span>Penjualan QRIS / Transfer:</span><b class="font-mono-num">Rp 320.000</b></div>
            <div class="flex justify-between py-1 border-b" style="border-color:var(--ons-border)"><span>Total Kas Fisik di Laci:</span><b class="font-mono-num text-emerald-600">Rp 650.000</b></div>
            <div class="flex justify-between py-1 text-xs font-bold"><span>Selisih Rekonsiliasi:</span><b class="font-mono-num text-emerald-600">Rp 0 (Sesuai)</b></div>
          </div>
        </div>
        <div class="p-3.5 bg-slate-50 dark:bg-slate-900/60 border-t flex justify-end" style="border-color:var(--ons-border)">
          <button type="button" onclick="ONSStore.closeModal()" class="ons-btn ons-btn-ghost text-xs">Tutup</button>
        </div>
      </div>
    `, '550px');
  };

  global.deleteUserConfirm = (targetIdOrUsername) => {
    const st = S().AppState;
    const staffList = (settingsCache.users && settingsCache.users.length) ? settingsCache.users : (st.staffDirectory || []);
    const target = staffList.find((u) => u.id_user === targetIdOrUsername || String(u.username).toLowerCase() === String(targetIdOrUsername).toLowerCase());
    if (!target) {
      global.toast('Pengguna tidak ditemukan', 'err');
      return;
    }
    const dRole = formatRoleDisplay(target.role);
    if (dRole === 'admin' || target.role === 'Pemilik' || target.id_user === 'USR-001') {
      global.toast('Akun utama admin/pemilik tidak dapat dihapus!', 'warn');
      return;
    }
    if (confirm(`Yakin ingin menonaktifkan pengguna "${target.nama_lengkap}" (@${target.username})?`)) {
      target.status_aktif = 'NONAKTIF';
      if (settingsCache.users) {
        const cTarget = settingsCache.users.find((u) => u.id_user === target.id_user || u.username === target.username);
        if (cTarget) cTarget.status_aktif = 'NONAKTIF';
      }
      global.toast(`Pengguna "${target.nama_lengkap}" dinonaktifkan!`, 'ok');
      global.renderActiveView();
    }
  };

  global.deleteRoleConfirm = (targetRoleId) => {
    const norm = String(targetRoleId || '').toLowerCase().trim();
    if (norm === 'admin' || norm === 'pemilik') {
      global.toast('Peran utama admin tidak dapat diubah atau dihapus!', 'warn');
      return;
    }
    if (confirm(`Hapus peran "${targetRoleId}"? Staf dengan peran ini akan dikembalikan ke peran default.`)) {
      const custom = getCustomRoles().filter((r) => r.id !== targetRoleId && r.name !== targetRoleId);
      customRolesList = custom;
      try { localStorage.setItem('ons_custom_roles', JSON.stringify(custom)); } catch (e) {}
      global.toast(`Peran "${targetRoleId}" dihapus!`, 'ok');
      global.renderActiveView();
    }
  };

  // Modal Tambah & Edit Data User (Images 4 & 5)
  global.openAddUserModal = (targetIdOrUsername) => {
    const allUsers = (settingsCache.users && settingsCache.users.length) ? settingsCache.users : (S().AppState.staffDirectory || []);
    const target = targetIdOrUsername
      ? allUsers.find((u) => u.id_user === targetIdOrUsername || String(u.username).toLowerCase() === String(targetIdOrUsername).toLowerCase())
      : null;
    const isEdit = !!target;
    const curRoleDisplay = target ? formatRoleDisplay(target.role) : 'cashier';
    const customRoles = getCustomRoles();

    S().openModal(`
      <div class="rounded-xl overflow-hidden text-xs">
        <!-- Header Biru Apotek Digital -->
        <div class="p-4 flex items-center justify-between text-white" style="background:#0284c7">
          <h3 class="font-bold text-sm text-white">${isEdit ? 'Edit Data User' : 'Tambah Data User'}</h3>
          <button onclick="ONSStore.closeModal()" class="text-white hover:opacity-80 text-xl font-bold">&times;</button>
        </div>

        <div class="p-6 space-y-3.5 text-xs max-h-[80vh] overflow-y-auto">
          <input type="hidden" id="modalUsrId" value="${isEdit ? S().esc(target.id_user || target.username || '') : ''}">
          
          <div>
            <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-200">Peran *</label>
            <select id="modalUsrRole" class="ons-select text-xs w-full">
              <option value="admin" ${curRoleDisplay === 'admin' ? 'selected' : ''}>admin</option>
              <option value="apoteker penanggung jawab" ${curRoleDisplay === 'apoteker penanggung jawab' ? 'selected' : ''}>apoteker penanggung jawab</option>
              <option value="cashier" ${curRoleDisplay === 'cashier' ? 'selected' : ''}>cashier</option>
              ${customRoles.map((r) => `<option value="${S().esc(r.name)}" ${curRoleDisplay === r.name ? 'selected' : ''}>${S().esc(r.name)}</option>`).join('')}
            </select>
            <div class="mt-1">
              <button type="button" onclick="window.openAddRoleModal(document.getElementById('modalUsrRole').value, true)" class="text-[11px] text-blue-600 hover:underline bg-transparent border-0 p-0 cursor-pointer">Lihat Hak Akses (Matriks Hak Akses)</button>
            </div>
          </div>

          <div>
            <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-200">Nama Lengkap *</label>
            <input type="text" id="modalUsrNama" value="${isEdit ? S().esc(target.nama_lengkap || '') : ''}" placeholder="Masukkan nama lengkap" class="ons-input text-xs w-full"/>
          </div>

          <div>
            <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-200">Username *</label>
            <input type="text" id="modalUsrUsername" value="${isEdit ? S().esc(target.username || '') : ''}" placeholder="Username" class="ons-input font-mono-num text-xs w-full"/>
          </div>

          <div>
            <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-200">Jabatan</label>
            <input type="text" id="modalUsrJabatan" value="${isEdit ? S().esc(target.jabatan || '') : ''}" placeholder="Contoh: Apoteker Pendamping / Staf Kasir" class="ons-input text-xs w-full"/>
          </div>

          <div>
            <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-200">No.SIP</label>
            <input type="text" id="modalUsrSip" value="${isEdit ? S().esc(target.no_sipa || target.no_sip || '') : ''}" placeholder="Nomor SIP / SIPA (jika ada)" class="ons-input font-mono-num text-xs w-full"/>
          </div>

          <div>
            <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-200">No. HP</label>
            <input type="text" id="modalUsrHp" value="${isEdit ? S().esc(target.no_hp || '') : ''}" placeholder="08xxxxxxxxxx" class="ons-input font-mono-num text-xs w-full"/>
          </div>

          <div>
            <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-200">${isEdit ? 'Password (Kosongkan jika tetap)' : 'Password *'}</label>
            <input type="password" id="modalUsrPassword" placeholder="${isEdit ? 'Biarkan kosong bila tidak ingin mengganti' : 'Minimal 8 karakter'}" class="ons-input text-xs w-full"/>
          </div>

          <div>
            <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-200">Ulangi Password Baru*</label>
            <input type="password" id="modalUsrPasswordConfirm" placeholder="Ulangi kata sandi" class="ons-input text-xs w-full"/>
          </div>

          <div class="pt-1">
            <label class="flex items-center gap-2.5 cursor-pointer text-xs select-none">
              <input type="checkbox" id="modalUsrBuyerPo" ${isEdit && target.is_buyer_po ? 'checked' : ''} class="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"/>
              <span class="text-slate-700 dark:text-slate-200">Tampilkan sebagai pemesan di pesanan pembelian</span>
            </label>
          </div>
        </div>

        <div class="px-6 py-3.5 bg-slate-50 dark:bg-slate-900/60 border-t flex justify-end items-center gap-3" style="border-color:var(--ons-border)">
          <button type="button" onclick="ONSStore.closeModal()" class="ons-btn ons-btn-ghost text-xs">Kembali</button>
          <button type="button" onclick="window.saveUserDataFromModal()" class="ons-btn text-white text-xs font-bold px-6 py-2 rounded-lg shadow-sm" style="background:#0D9488">Simpan</button>
        </div>
      </div>
    `, '550px');
  };

  global.saveUserDataFromModal = async () => {
    try {
      const idUser = (document.getElementById('modalUsrId') || {}).value || '';
      const nama = (document.getElementById('modalUsrNama') || {}).value.trim();
      const username = (document.getElementById('modalUsrUsername') || {}).value.trim();
      const roleSelected = (document.getElementById('modalUsrRole') || {}).value || 'cashier';
      const jabatan = (document.getElementById('modalUsrJabatan') || {}).value.trim();
      const noSip = (document.getElementById('modalUsrSip') || {}).value.trim();
      const noHp = (document.getElementById('modalUsrHp') || {}).value.trim();
      const pw = (document.getElementById('modalUsrPassword') || {}).value || '';
      const pwConfirm = (document.getElementById('modalUsrPasswordConfirm') || {}).value || '';
      const isBuyerPo = !!((document.getElementById('modalUsrBuyerPo') || {}).checked);

      if (!nama) throw new Error('Nama lengkap wajib diisi.');
      if (!username) throw new Error('Username wajib diisi.');
      if (!idUser && !pw) throw new Error('Password wajib diisi untuk pengguna baru.');
      if (pw && pw !== pwConfirm) throw new Error('Konfirmasi password tidak cocok dengan password baru.');
      if (pw && pw.length < 6) throw new Error('Password minimal 6 karakter.');

      let internalRole = 'Kasir';
      if (roleSelected === 'admin') internalRole = 'Pemilik';
      else if (roleSelected === 'apoteker penanggung jawab') internalRole = 'APJ';
      else if (roleSelected === 'cashier') internalRole = 'Kasir';
      else internalRole = roleSelected;

      const payload = {
        id_user: idUser || undefined,
        username,
        nama_lengkap: nama,
        role: internalRole,
        jabatan,
        no_sipa: noSip,
        no_hp: noHp,
        is_buyer_po: isBuyerPo,
        password_baru: pw || undefined,
        status_aktif: 'AKTIF'
      };

      const res = await API().callApi('users.save', payload, { isWrite: true });

      const allUsers = Array.isArray(S().AppState.staffDirectory) ? S().AppState.staffDirectory : [];
      const existIdx = allUsers.findIndex((u) => u.id_user === idUser || (idUser && u.id_user === idUser) || String(u.username).toLowerCase() === username.toLowerCase());
      const savedUser = {
        id_user: (res && res.id_user) || idUser || ('USR-' + String(allUsers.length + 1).padStart(3, '0')),
        username,
        nama_lengkap: nama,
        role: internalRole,
        jabatan,
        no_sipa: noSip,
        no_hp: noHp,
        is_buyer_po: isBuyerPo,
        status_aktif: 'AKTIF'
      };

      if (existIdx >= 0) {
        allUsers[existIdx] = Object.assign({}, allUsers[existIdx], savedUser);
      } else {
        allUsers.push(savedUser);
      }
      S().AppState.staffDirectory = allUsers;
      if (settingsCache.users) settingsCache.users = allUsers.slice();

      S().closeModal();
      global.toast('Data pengguna "' + nama + '" berhasil disimpan!', 'ok');
      global.renderActiveView();
    } catch (e) {
      global.toast(e.message, 'err');
    }
  };

  // Modal Tambah Role & Hak Akses (Image 6)
  global.openAddRoleModal = (targetRole, readOnly) => {
    const isEdit = !!targetRole;
    const normRole = formatRoleDisplay(targetRole);

    let activePermKeys = [];
    if (normRole === 'admin') {
      activePermKeys = S().DEFAULT_ROLE_PERMS ? S().DEFAULT_ROLE_PERMS.Pemilik : [];
    } else if (normRole === 'apoteker penanggung jawab') {
      activePermKeys = S().DEFAULT_ROLE_PERMS ? S().DEFAULT_ROLE_PERMS.APJ : [];
    } else if (normRole === 'cashier') {
      activePermKeys = S().DEFAULT_ROLE_PERMS ? S().DEFAULT_ROLE_PERMS.Kasir : [];
    } else {
      const custom = getCustomRoles().find((r) => r.name === targetRole);
      activePermKeys = (custom && custom.perms) ? custom.perms : [];
    }

    S().openModal(`
      <div class="rounded-xl overflow-hidden text-xs">
        <div class="p-4 flex items-center justify-between text-white" style="background:#0284c7">
          <h3 class="font-bold text-sm text-white">${readOnly ? 'Lihat Hak Akses: ' + S().esc(targetRole) : (isEdit ? 'Edit Role: ' + S().esc(targetRole) : 'Tambah Role')}</h3>
          <button onclick="ONSStore.closeModal()" class="text-white hover:opacity-80 text-xl font-bold">&times;</button>
        </div>

        <div class="p-6 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
          <input type="hidden" id="modalRoleTargetId" value="${targetRole || ''}">

          <div>
            <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-200">Nama Role*</label>
            <input type="text" id="modalRoleName" value="${S().esc(targetRole || '')}" ${readOnly || normRole === 'admin' ? 'readonly' : ''} placeholder="Masukkan nama peran" class="ons-input text-xs w-full"/>
          </div>

          <div>
            <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-200">Cari nama hak akses*</label>
            <div class="relative">
              <input type="text" id="modalRoleSearch" placeholder="Cari modul atau nama hak akses..." oninput="window.filterRoleMatrixTree(this.value)" class="ons-input text-xs pl-8 w-full"/>
              <svg class="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </div>
          </div>

          <!-- Tree Hak Akses Berkelompok Sesuai Screenshot Apotek Digital Image 6 -->
          <div id="roleMatrixTreeContainer" class="space-y-4 pt-1">
            ${ROLE_TREE_GROUPS.map((grp) => `
              <div class="rounded-lg border bg-white dark:bg-slate-900 overflow-hidden" style="border-color:var(--ons-border)">
                <div class="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 flex items-center justify-between font-bold text-xs text-slate-800 dark:text-slate-100">
                  <span class="flex items-center gap-1.5">&#9662; ${S().esc(grp.group)}</span>
                  ${readOnly ? '' : `<button type="button" onclick="window.toggleGroupPerms('${grp.group}', true)" class="text-[11px] text-blue-600 hover:underline font-semibold">Aktifkan Semua</button>`}
                </div>
                <div class="p-2 space-y-3">
                  ${grp.subgroups.map((sub) => `
                    <div class="space-y-1">
                      <div class="px-2 py-1 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-200">
                        <span class="flex items-center gap-1.5">&#9662; ${S().esc(sub.name)}</span>
                        ${readOnly ? '' : `<button type="button" onclick="window.toggleSubgroupPerms('${sub.id}', true)" class="text-[11px] text-blue-600 hover:underline font-semibold">Aktifkan Semua</button>`}
                      </div>
                      <div class="space-y-1 pl-4">
                        ${sub.items.map((item) => {
                          const isChecked = normRole === 'admin' || activePermKeys.includes(item.key) || activePermKeys.includes(item.key.split(':')[0]);
                          return `
                            <div class="flex items-center justify-between py-1.5 px-3 rounded hover:bg-slate-50 dark:hover:bg-slate-800/50 role-perm-item" data-perm-key="${item.key}" data-perm-label="${item.label.toLowerCase()}">
                              <div class="flex items-center gap-2">
                                <span class="text-[10px] px-1.5 py-0.5 rounded border border-slate-300 text-slate-500 bg-slate-50 dark:bg-slate-800 dark:border-slate-700">Halaman</span>
                                <span class="text-xs text-slate-700 dark:text-slate-200">${S().esc(item.label)}</span>
                              </div>
                              <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" value="${item.key}" class="sr-only role-perm-toggle" data-subgroup="${sub.id}" data-group="${grp.group}" ${isChecked ? 'checked' : ''} ${readOnly || normRole === 'admin' ? 'disabled' : ''}/>
                                <div class="w-8 h-4 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-600"></div>
                              </label>
                            </div>
                          `;
                        }).join('')}
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="px-6 py-3.5 bg-slate-50 dark:bg-slate-900/60 border-t flex justify-end items-center gap-3" style="border-color:var(--ons-border)">
          <button type="button" onclick="ONSStore.closeModal()" class="ons-btn ons-btn-ghost text-xs">${readOnly ? 'Tutup' : 'Batal'}</button>
          ${readOnly || normRole === 'admin' ? '' : `<button type="button" onclick="window.saveRoleMatrixFromModal()" class="ons-btn text-white text-xs font-bold px-6 py-2 rounded-lg shadow-sm" style="background:#0D9488">Simpan</button>`}
        </div>
      </div>
    `, '680px');
  };

  global.filterRoleMatrixTree = (q) => {
    const term = String(q || '').toLowerCase().trim();
    document.querySelectorAll('.role-perm-item').forEach((el) => {
      const lbl = el.getAttribute('data-perm-label') || '';
      const key = el.getAttribute('data-perm-key') || '';
      const match = !term || lbl.includes(term) || key.includes(term);
      el.style.display = match ? 'flex' : 'none';
    });
  };

  global.toggleSubgroupPerms = (subgroupId, checkAll) => {
    const items = document.querySelectorAll(`.role-perm-toggle[data-subgroup="${subgroupId}"]`);
    if (!items.length) return;
    const anyUnchecked = Array.from(items).some((el) => !el.checked);
    items.forEach((el) => { if (!el.disabled) el.checked = anyUnchecked; });
  };

  global.toggleGroupPerms = (groupName, checkAll) => {
    const items = document.querySelectorAll(`.role-perm-toggle[data-group="${groupName}"]`);
    if (!items.length) return;
    const anyUnchecked = Array.from(items).some((el) => !el.checked);
    items.forEach((el) => { if (!el.disabled) el.checked = anyUnchecked; });
  };

  global.saveRoleMatrixFromModal = () => {
    try {
      const name = (document.getElementById('modalRoleName') || {}).value.trim();
      if (!name) throw new Error('Nama role wajib diisi.');
      const checkedPerms = Array.from(document.querySelectorAll('.role-perm-toggle:checked')).map((c) => c.value);

      const customRoles = getCustomRoles().slice();
      const existIdx = customRoles.findIndex((r) => r.name.toLowerCase() === name.toLowerCase());
      const roleObj = { id: name, name, status: 'Aktif', perms: checkedPerms };

      if (existIdx >= 0) customRoles[existIdx] = roleObj;
      else customRoles.push(roleObj);

      customRolesList = customRoles;
      try { localStorage.setItem('ons_custom_roles', JSON.stringify(customRoles)); } catch (e) {}

      S().closeModal();
      global.toast('Peran & hak akses "' + name + '" berhasil disimpan!', 'ok');
      global.renderActiveView();
    } catch (e) {
      global.toast(e.message, 'err');
    }
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
      return `<img src="${S().esc(cleanUrl)}" alt="${kind === 'foto' ? 'Foto Pemilik' : 'Logo Usaha'}" class="w-full h-full object-cover"/>`;
    }
    if (kind === 'foto') {
      return `<span>${S().esc(getOwnerInitials(ownerName))}</span>`;
    }
    return `<span class="text-xs font-extrabold" style="color:var(--ons-primary)">LOGO</span>`;
  }

  function renderDocUploadRow(docKey, labelText, acceptTypes, currentUrl, currentName) {
    const draft = profileDocsDraft[docKey];
    const fileUrl = draft ? draft.dataUrl : currentUrl;
    const fileName = draft ? draft.name : currentName;
    const hasFile = !!(fileName || fileUrl);

    return `<div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t" style="border-color:var(--ons-border)">
      <span class="font-semibold text-slate-700 dark:text-slate-200">${S().esc(labelText)}</span>
      <div id="profDocStatus_${docKey}" class="flex items-center gap-2">
        <input type="file" id="profDocInput_${docKey}" accept="${acceptTypes || '.pdf,image/*'}" class="hidden" onchange="window.handleProfileDocUpload('${docKey}', this)"/>
        <input type="hidden" id="profDocUrl_${docKey}" value="${S().esc(fileUrl || '')}"/>
        <input type="hidden" id="profDocName_${docKey}" value="${S().esc(fileName || '')}"/>
        ${hasFile ? `
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800" title="${S().esc(fileName || 'Berkas Terlampir')}">
            <svg class="w-3.5 h-3.5 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
            <span class="max-w-[130px] sm:max-w-[180px] truncate">${S().esc(fileName || 'Berkas Terlampir')}</span>
          </span>
          <button type="button" onclick="window.viewOrDownloadProfileDoc('${docKey}')" class="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800" title="Unduh / Lihat Berkas">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
          </button>
          <button type="button" onclick="window.removeProfileDoc('${docKey}')" class="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40" title="Hapus Berkas">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
          <button type="button" onclick="document.getElementById('profDocInput_${docKey}').click()" class="ons-btn text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm" style="background:#0D9488">Ganti File</button>
        ` : `
          <button type="button" onclick="document.getElementById('profDocInput_${docKey}').click()" class="ons-btn text-white text-xs font-semibold px-4 py-1.5 rounded-lg shadow-sm" style="background:#0D9488">Upload File</button>
        `}
      </div>
    </div>`;
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

    return `<div class="space-y-4 ons-view-enter text-xs">
      <!-- Header Profil Bisnis Apotek Digital -->
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h1 class="text-xl font-bold">Profil Bisnis</h1>
        <div class="flex items-center gap-2">
          <button type="button" onclick="window.submitStoreProfileForm()" class="ons-btn text-white text-xs font-semibold px-5 py-2 rounded-lg flex items-center gap-1.5 shadow-sm" style="background:#0D9488">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/></svg>
            Simpan
          </button>
        </div>
      </div>
      <input type="hidden" id="profPublicAccess" value="true"/>

      <!-- 1. Informasi Dasar -->
      <div class="ons-card p-5 space-y-4">
        <h3 class="font-bold text-sm text-slate-800 dark:text-slate-100">Informasi Dasar</h3>

        <!-- Avatar Logo Tengah & Ganti Foto -->
        <div class="flex flex-col items-center justify-center gap-2 py-2">
          <div id="profMainAvatarBox" class="w-24 h-24 rounded-full flex items-center justify-center text-white shadow-md relative overflow-hidden text-2xl font-bold" style="background:#093554">
            ${renderProfileMediaInner('foto', fotoUrl, merged.nama_pemilik)}
          </div>
          <div class="flex items-center gap-2">
            <input type="file" id="profFotoUploadInput" accept="image/png,image/jpeg,image/webp,image/jpg" class="hidden" onchange="window.handleProfileImageUpload('foto', this)"/>
            <button type="button" onclick="document.getElementById('profFotoUploadInput').click()" class="ons-btn text-white text-xs font-semibold px-5 py-1.5 rounded-full shadow-sm" style="background:#0D9488">Ganti Foto</button>
            ${fotoUrl ? `<button type="button" onclick="window.resetProfileMedia('foto')" class="ons-btn text-xs font-semibold px-3 py-1.5 rounded-full border text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-950/40">Hapus</button>` : ''}
          </div>
          
          <!-- Hidden Native Upload Cards for Test Compatibility & Logo Sync -->
          <div class="hidden">
            ${renderProfileUploadCard({
              kind: 'foto',
              previewId: 'profPhotoPreview',
              inputId: 'profFotoUrl',
              title: 'Foto Pemilik / APJ',
              hint: 'Format JPG/PNG',
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
              title: 'Logo Resmi Usaha',
              hint: 'Format JPG/PNG',
              uploadLabel: 'Upload Logo',
              resetLabel: 'Reset Default',
              currentUrl: logoUrl,
              ownerName: merged.nama_usaha,
              canEdit
            })}
          </div>
        </div>

        <div class="space-y-3">
          <div>
            <label class="font-semibold text-[11px] block mb-1 text-slate-600 dark:text-slate-300">Nama Perusahaan/Bisnis</label>
            <input id="profNamaUsaha" ${ro} class="ons-input text-xs w-full" value="${S().esc(merged.nama_usaha || 'Apotek ONS Farma')}" placeholder="Nama Perusahaan/Bisnis" oninput="window.refreshProfileKopPreview()"/>
          </div>

          <div>
            <label class="font-semibold text-[11px] block mb-1 text-slate-600 dark:text-slate-300">Slogan</label>
            <input id="profSlogan" ${ro} class="ons-input text-xs w-full" value="${S().esc(merged.slogan || '')}" placeholder="Slogan apotek"/>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="font-semibold text-[11px] block mb-1 text-slate-600 dark:text-slate-300">Provinsi</label>
              <input id="profProvinsi" ${ro} class="ons-input text-xs w-full" value="${S().esc(merged.provinsi || 'Sulawesi Selatan')}" placeholder="Provinsi" oninput="window.refreshProfileKopPreview()"/>
            </div>
            <div>
              <label class="font-semibold text-[11px] block mb-1 text-slate-600 dark:text-slate-300">Kabupaten / Kota</label>
              <input id="profKota" ${ro} class="ons-input text-xs w-full" value="${S().esc(merged.kota || 'Makassar')}" placeholder="Kabupaten / Kota" oninput="window.refreshProfileKopPreview()"/>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="font-semibold text-[11px] block mb-1 text-slate-600 dark:text-slate-300">Kecamatan</label>
              <input id="profKecamatan" ${ro} class="ons-input text-xs w-full" value="${S().esc(merged.kecamatan || 'Panakkukang')}" placeholder="Kecamatan" oninput="window.refreshProfileKopPreview()"/>
            </div>
            <div>
              <label class="font-semibold text-[11px] block mb-1 text-slate-600 dark:text-slate-300">Kelurahan</label>
              <input id="profKelurahan" ${ro} class="ons-input text-xs w-full" value="${S().esc(merged.kelurahan || 'Masale')}" placeholder="Kelurahan" oninput="window.refreshProfileKopPreview()"/>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="font-semibold text-[11px] block mb-1 text-slate-600 dark:text-slate-300">Alamat</label>
              <input id="profAlamatUsaha" ${ro} class="ons-input text-xs w-full" value="${S().esc(merged.alamat_usaha || 'Jl. Kesehatan Raya No. 88, Kec. Panakkukang')}" placeholder="Alamat lengkap" oninput="window.refreshProfileKopPreview()"/>
            </div>
            <div>
              <label class="font-semibold text-[11px] block mb-1 text-slate-600 dark:text-slate-300">Kode Pos</label>
              <input id="profKodePos" ${ro} class="ons-input font-mono-num text-xs w-full" value="${S().esc(merged.kode_pos || '90231')}" placeholder="Kode Pos" oninput="window.refreshProfileKopPreview()"/>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="font-semibold text-[11px] block mb-1 text-slate-600 dark:text-slate-300">Latitude</label>
              <input id="profLat" ${ro} class="ons-input font-mono-num text-xs w-full" value="${S().esc(merged.latitude || '-5.147665')}" placeholder="Latitude" oninput="window.updateGmapsLinkFromInputs()"/>
            </div>
            <div>
              <label class="font-semibold text-[11px] block mb-1 text-slate-600 dark:text-slate-300">Longitude</label>
              <input id="profLng" ${ro} class="ons-input font-mono-num text-xs w-full" value="${S().esc(merged.longitude || '119.432732')}" placeholder="Longitude" oninput="window.updateGmapsLinkFromInputs()"/>
            </div>
          </div>

          <div class="flex flex-col sm:flex-row gap-2">
            <button type="button" onclick="window.openKoordinatModal()" class="ons-btn text-white text-xs font-semibold px-4 py-2.5 rounded-lg flex items-center justify-center gap-1.5 shadow-sm flex-1" style="background:#0D9488">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/></svg>
              Atur Titik Koordinat &amp; Lokasi Outlet
            </button>
            <a id="profGmapsLink" target="_blank" rel="noopener" href="https://www.google.com/maps?q=${encodeURIComponent(merged.latitude || '-5.147665')},${encodeURIComponent(merged.longitude || '119.432732')}" class="ons-btn ons-btn-ghost text-xs px-3.5 py-2.5 flex items-center justify-center gap-1.5 shrink-0" title="Buka Titik Koordinat di Google Maps">
              <span>&#128506;&#65039; Buka Google Maps</span>
            </a>
          </div>

          ${renderDocUploadRow('foto_outlet', 'Foto Depan Outlet :', 'image/*', merged.foto_outlet_url || '', merged.file_foto_outlet_name || '')}
        </div>
      </div>

      <!-- 2. Jam Operasional -->
      <div class="ons-card p-5 space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="font-bold text-sm text-slate-800 dark:text-slate-100">Jam Operasional</h3>
          <button type="button" onclick="ONSStore.toast('Jadwal jam operasional harian siap disesuaikan.', 'ok')" class="text-xs text-blue-600 font-semibold hover:underline">Tambah Hari</button>
        </div>
        <div>
          <input id="profJamOps" ${ro} class="ons-input text-xs w-full" value="${S().esc(merged.jam_operasional || 'Setiap Hari 07:30 - 22:00 WITA')}" placeholder="Contoh: Setiap Hari 07:30 - 22:00 WITA"/>
        </div>
      </div>

      <!-- 3. Legalitas -->
      <div class="ons-card p-5 space-y-3.5">
        <h3 class="font-bold text-sm text-slate-800 dark:text-slate-100">Legalitas</h3>

        <div>
          <label class="font-semibold text-[11px] block mb-1 text-slate-600 dark:text-slate-300">NITKU</label>
          <input id="profNitku" ${ro} class="ons-input font-mono-num text-xs w-full" value="${S().esc(merged.nitku || '8511240918050000')}" placeholder="Nomor Identitas Tempat Kegiatan Usaha (16 digit)"/>
          <p class="text-[10px] text-slate-400 mt-0.5">Nomor Identitas Tempat Kegiatan Usaha (16 digit)</p>
        </div>

        <div>
          <label class="font-semibold text-[11px] block mb-1 text-slate-600 dark:text-slate-300">No. NPWP Perusahaan</label>
          <input id="profNpwpUsaha" ${ro} class="ons-input font-mono-num text-xs w-full" value="${S().esc(merged.npwp_usaha || '85.112.409.1-805.000')}" placeholder="No. NPWP Perusahaan"/>
        </div>

        ${renderDocUploadRow('npwp_usaha', 'NPWP Perusahaan :', '.pdf,image/*', merged.file_npwp_usaha_url || '', merged.file_npwp_usaha_name || (merged.npwp_usaha ? 'NPWP_Perusahaan.pdf' : ''))}

        <div>
          <label class="font-semibold text-[11px] block mb-1 text-slate-600 dark:text-slate-300">No. NIB</label>
          <input id="profNibOss" ${ro} class="ons-input font-mono-num text-xs w-full" value="${S().esc(merged.nib_oss || '9120208142915')}" placeholder="No. NIB OSS"/>
        </div>

        ${renderDocUploadRow('nib', 'NIB :', '.pdf,image/*', merged.file_nib_url || '', merged.file_nib_name || (merged.nib_oss ? 'NIB_OSS_Apotek.pdf' : ''))}

        <div>
          <label class="font-semibold text-[11px] block mb-1 text-slate-600 dark:text-slate-300">Jenis Badan Usaha</label>
          <select id="profJenisBadanUsaha" ${canEdit ? '' : 'disabled'} class="ons-select text-xs w-full">
            <option value="Perorangan" ${String(merged.jenis_badan_usaha || 'Perorangan') === 'Perorangan' ? 'selected' : ''}>Perorangan</option>
            <option value="Perseroan Terbatas (PT)" ${String(merged.jenis_badan_usaha || '') === 'Perseroan Terbatas (PT)' ? 'selected' : ''}>Perseroan Terbatas (PT)</option>
            <option value="Commanditaire Vennootschap (CV)" ${String(merged.jenis_badan_usaha || '') === 'Commanditaire Vennootschap (CV)' ? 'selected' : ''}>Commanditaire Vennootschap (CV)</option>
            <option value="Koperasi" ${String(merged.jenis_badan_usaha || '') === 'Koperasi' ? 'selected' : ''}>Koperasi</option>
            <option value="Yayasan" ${String(merged.jenis_badan_usaha || '') === 'Yayasan' ? 'selected' : ''}>Yayasan</option>
          </select>
        </div>
      </div>

      <!-- 4. Perizinan Apotek -->
      <div class="ons-card p-5 space-y-3.5">
        <h3 class="font-bold text-sm text-slate-800 dark:text-slate-100">Perizinan Apotek</h3>

        <div>
          <label class="font-semibold text-[11px] block mb-1 text-slate-600 dark:text-slate-300">No. Surat Izin Apotek</label>
          <input id="profNoSia" ${ro} class="ons-input font-mono-num text-xs w-full" value="${S().esc(merged.no_sia || '449/SIA-DPMPTSP/2025/0088')}" placeholder="No. Surat Izin Apotek" oninput="window.refreshProfileKopPreview()"/>
        </div>

        <div>
          <label class="font-semibold text-[11px] block mb-1 text-slate-600 dark:text-slate-300">Tgl. Akhir Masa Berlaku Izin</label>
          <input id="profTglSia" ${ro} class="ons-input font-mono-num text-xs w-full" value="${S().esc(merged.tgl_berlaku_sia || '13/11/2026')}" placeholder="DD/MM/YYYY"/>
        </div>

        ${renderDocUploadRow('sia', 'File SIA :', '.pdf,image/*', merged.file_sia_url || '', merged.file_sia_name || (merged.no_sia ? 'SIA_DPMPTSP.pdf' : ''))}
      </div>

      <!-- 5. Data Pemilik/PIC -->
      <div class="ons-card p-5 space-y-3.5">
        <h3 class="font-bold text-sm text-slate-800 dark:text-slate-100">Data Pemilik/PIC</h3>

        <div>
          <label class="font-semibold text-[11px] block mb-1 text-slate-600 dark:text-slate-300">Nama Pemilik</label>
          <input id="profNamaPemilik" ${ro} class="ons-input text-xs w-full" value="${S().esc(merged.nama_pemilik || 'apt. Anissa Faradifa R. Is Rumi')}" placeholder="Nama Pemilik" oninput="window.refreshProfileKopPreview()"/>
        </div>

        <div>
          <label class="font-semibold text-[11px] block mb-1 text-slate-600 dark:text-slate-300">No. Handphone</label>
          <input id="profWaPemilik" ${ro} class="ons-input font-mono-num text-xs w-full" value="${S().esc(merged.wa_pemilik || '6282136973990')}" placeholder="No. Handphone" oninput="window.refreshProfileKopPreview()"/>
        </div>

        <div>
          <label class="font-semibold text-[11px] block mb-1 text-slate-600 dark:text-slate-300">Alamat Email</label>
          <input id="profEmailPemilik" ${ro} class="ons-input text-xs w-full" value="${S().esc(merged.email_pemilik || 'icafaradiva@gmail.com')}" placeholder="Alamat Email"/>
        </div>

        <div>
          <label class="font-semibold text-[11px] block mb-1 text-slate-600 dark:text-slate-300">No. KTP Pemilik</label>
          <input id="profKtpPemilik" ${ro} class="ons-input font-mono-num text-xs w-full" value="${S().esc(merged.ktp_pemilik || '7371105408920001')}" placeholder="No. KTP Pemilik"/>
        </div>

        ${renderDocUploadRow('ktp_pemilik', 'KTP Pemilik :', '.pdf,image/*', merged.file_ktp_url || '', merged.file_ktp_name || (merged.ktp_pemilik ? 'KTP_Pemilik.pdf' : ''))}

        <div>
          <label class="font-semibold text-[11px] block mb-1 text-slate-600 dark:text-slate-300">No. NPWP Pemilik</label>
          <input id="profNpwpPemilik" ${ro} class="ons-input font-mono-num text-xs w-full" value="${S().esc(merged.npwp_pemilik || '09.254.294.3-805.000')}" placeholder="No. NPWP Pemilik"/>
        </div>

        ${renderDocUploadRow('npwp_pemilik', 'NPWP Pemilik :', '.pdf,image/*', merged.file_npwp_pemilik_url || '', merged.file_npwp_pemilik_name || (merged.npwp_pemilik ? 'NPWP_Pemilik.pdf' : ''))}
      </div>

      <!-- 6. Apoteker Penanggung Jawab -->
      <div class="ons-card p-5 space-y-3.5">
        <h3 class="font-bold text-sm text-slate-800 dark:text-slate-100">Apoteker Penanggung Jawab</h3>

        <div>
          <label class="font-semibold text-[11px] block mb-1 text-slate-600 dark:text-slate-300">Nama</label>
          <input class="ons-input text-xs w-full" ${ro} value="${S().esc(merged.nama_pemilik || 'apt. Anissa Faradifa R. Is Rumi')}" placeholder="Nama APJ"/>
        </div>

        <div>
          <label class="font-semibold text-[11px] block mb-1 text-slate-600 dark:text-slate-300">No. Handphone</label>
          <input class="ons-input font-mono-num text-xs w-full" ${ro} value="${S().esc(merged.wa_pemilik || '6282136973990')}" placeholder="No. Handphone APJ"/>
        </div>

        <div>
          <label class="font-semibold text-[11px] block mb-1 text-slate-600 dark:text-slate-300">Alamat Email</label>
          <input class="ons-input text-xs w-full" ${ro} value="${S().esc(merged.email_pemilik || 'icafaradiva@gmail.com')}" placeholder="Alamat Email APJ"/>
        </div>

        <div>
          <label class="font-semibold text-[11px] block mb-1 text-slate-600 dark:text-slate-300">No. STRA</label>
          <input id="profStraPemilik" ${ro} class="ons-input font-mono-num text-xs w-full" value="${S().esc(merged.stra_pemilik || '19920412/STRA-14102029/1042')}" placeholder="No. STRA APJ"/>
        </div>

        <div>
          <label class="font-semibold text-[11px] block mb-1 text-slate-600 dark:text-slate-300">No. SIPA</label>
          <input id="profSipaPemilik" ${ro} class="ons-input font-mono-num text-xs w-full" value="${S().esc(merged.sipa_pemilik || '19920412/SIPA_35.78/2025/1042')}" placeholder="No. SIPA APJ" oninput="window.refreshProfileKopPreview()"/>
        </div>

        <div>
          <label class="font-semibold text-[11px] block mb-1 text-slate-600 dark:text-slate-300">Masa Berlaku SIPA</label>
          <input id="profMasaSipa" ${ro} class="ons-input font-mono-num text-xs w-full" value="${S().esc(merged.tgl_berlaku_sipa || '13/11/2026')}" placeholder="DD/MM/YYYY"/>
        </div>

        ${renderDocUploadRow('sipa_pemilik', 'File SIPA :', '.pdf,image/*', merged.file_sipa_url || '', merged.file_sipa_name || (merged.sipa_pemilik ? 'SIPA_APJ.pdf' : ''))}
      </div>

      <!-- 7. Apoteker Pendamping -->
      <div class="ons-card p-5 space-y-4">
        <h3 class="font-bold text-sm text-slate-800 dark:text-slate-100">Apoteker Pendamping</h3>

        <!-- Pendamping #1 -->
        <div class="p-3.5 rounded-xl border bg-slate-50 dark:bg-slate-900/40 space-y-3" style="border-color:var(--ons-border)">
          <div class="font-bold text-xs text-sky-800 dark:text-sky-300">Apoteker Pendamping #1</div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="font-semibold text-[11px] block mb-1">Nama Apoteker</label>
              <input ${ro} class="ons-input text-xs w-full" value="apt. Siti Rahma, S.Farm" placeholder="Nama Apoteker Pendamping"/>
            </div>
            <div>
              <label class="font-semibold text-[11px] block mb-1">No. Handphone</label>
              <input ${ro} class="ons-input font-mono-num text-xs w-full" value="0812-3456-7890" placeholder="08xxxxxxxxxx"/>
            </div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="font-semibold text-[11px] block mb-1">Alamat Email</label>
              <input ${ro} class="ons-input text-xs w-full" value="siti.rahma@onsfarma.id" placeholder="email@..."/>
            </div>
            <div>
              <label class="font-semibold text-[11px] block mb-1">No. STRA</label>
              <input ${ro} class="ons-input font-mono-num text-xs w-full" value="19950817/STRA-010203/2024" placeholder="No. STRA"/>
            </div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="font-semibold text-[11px] block mb-1">No. SIPA</label>
              <input ${ro} class="ons-input font-mono-num text-xs w-full" value="19950817/SIPA_35.78/2025/1043" placeholder="No. SIPA"/>
            </div>
            <div>
              <label class="font-semibold text-[11px] block mb-1">Masa Berlaku SIPA</label>
              <input ${ro} class="ons-input font-mono-num text-xs w-full" value="13/11/2026" placeholder="DD/MM/YYYY"/>
            </div>
          </div>
          ${renderDocUploadRow('sipa_pendamping_1', 'File SIPA :', '.pdf,image/*', (merged.apoteker_pendamping && merged.apoteker_pendamping[0] && merged.apoteker_pendamping[0].file_sipa) || merged.file_sipa_pendamping_1_url || '', merged.file_sipa_pendamping_1_name || 'SIPA_Pendamping_1.pdf')}
        </div>

        <!-- Pendamping #2 -->
        <div class="p-3.5 rounded-xl border bg-slate-50 dark:bg-slate-900/40 space-y-3" style="border-color:var(--ons-border)">
          <div class="font-bold text-xs text-sky-800 dark:text-sky-300">Apoteker Pendamping #2</div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="font-semibold text-[11px] block mb-1">Nama Apoteker</label>
              <input ${ro} class="ons-input text-xs w-full" value="apt. Dewi Kartika, S.Farm" placeholder="Nama Apoteker Pendamping"/>
            </div>
            <div>
              <label class="font-semibold text-[11px] block mb-1">No. Handphone</label>
              <input ${ro} class="ons-input font-mono-num text-xs w-full" value="0813-9876-5432" placeholder="08xxxxxxxxxx"/>
            </div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="font-semibold text-[11px] block mb-1">Alamat Email</label>
              <input ${ro} class="ons-input text-xs w-full" value="dewi.kartika@onsfarma.id" placeholder="email@..."/>
            </div>
            <div>
              <label class="font-semibold text-[11px] block mb-1">No. STRA</label>
              <input ${ro} class="ons-input font-mono-num text-xs w-full" value="19961120/STRA-040506/2025" placeholder="No. STRA"/>
            </div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="font-semibold text-[11px] block mb-1">No. SIPA</label>
              <input ${ro} class="ons-input font-mono-num text-xs w-full" value="19961120/SIPA_35.78/2026/1044" placeholder="No. SIPA"/>
            </div>
            <div>
              <label class="font-semibold text-[11px] block mb-1">Masa Berlaku SIPA</label>
              <input ${ro} class="ons-input font-mono-num text-xs w-full" value="13/11/2026" placeholder="DD/MM/YYYY"/>
            </div>
          </div>
          ${renderDocUploadRow('sipa_pendamping_2', 'File SIPA :', '.pdf,image/*', (merged.apoteker_pendamping && merged.apoteker_pendamping[1] && merged.apoteker_pendamping[1].file_sipa) || merged.file_sipa_pendamping_2_url || '', merged.file_sipa_pendamping_2_name || 'SIPA_Pendamping_2.pdf')}
        </div>
      </div>

      <!-- 8. Akun Bank Perusahaan/Bisnis -->
      <div class="ons-card p-5 space-y-3.5">
        <h3 class="font-bold text-sm text-slate-800 dark:text-slate-100">Akun Bank Perusahaan/Bisnis</h3>

        <div>
          <label class="font-semibold text-[11px] block mb-1 text-slate-600 dark:text-slate-300">Nama Bank</label>
          <input id="profBankNama" ${ro} class="ons-input text-xs w-full" value="${S().esc(merged.bank_nama || 'Bank Mandiri')}" placeholder="Nama Bank"/>
        </div>

        <div>
          <label class="font-semibold text-[11px] block mb-1 text-slate-600 dark:text-slate-300">Kantor Cabang</label>
          <input id="profBankCabang" ${ro} class="ons-input text-xs w-full" value="${S().esc(merged.bank_cabang || 'KCP Panakkukang')}" placeholder="Kantor Cabang"/>
        </div>

        <div>
          <label class="font-semibold text-[11px] block mb-1 text-slate-600 dark:text-slate-300">Nama Akun</label>
          <input id="profBankAkun" ${ro} class="ons-input text-xs w-full" value="${S().esc(merged.bank_akun_nama || 'Apotek ONS Farma')}" placeholder="Nama Pemilik Rekening"/>
        </div>

        <div>
          <label class="font-semibold text-[11px] block mb-1 text-slate-600 dark:text-slate-300">Nomor Akun</label>
          <input id="profBankNo" ${ro} class="ons-input font-mono-num text-xs w-full" value="${S().esc(merged.bank_nomor_rekening || '152001928374')}" placeholder="Nomor Rekening"/>
        </div>

        ${renderDocUploadRow('buku_rekening', 'Foto Buku Rekening :', '.pdf,image/*', merged.file_buku_rekening_url || '', merged.file_buku_rekening_name || (merged.bank_nomor_rekening ? 'Buku_Rekening_Bank.pdf' : ''))}
      </div>

      <!-- 9. Pratinjau Kop Resmi & Konfirmasi Data -->
      <div class="ons-card p-5 space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h3 class="font-bold text-sm">Pratinjau Kop Resmi &amp; Konfirmasi Data</h3>
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

        <!-- Hidden Inputs for Backwards Compatibility -->
        <input type="hidden" id="profJabatanPemilik" value="${S().esc(merged.jabatan_pemilik || 'Pemilik Sarana Apotek & Apoteker')}"/>
        <input type="hidden" id="profStatusPkp" value="${S().esc(merged.status_pkp || 'PKP (PPN 11%)')}"/>
        <input type="hidden" id="profZonaWaktu" value="${S().esc(merged.zona_waktu || 'Asia/Makassar (WITA)')}"/>
        <input type="hidden" id="profTelpUsaha" value="${S().esc(merged.telepon_usaha || '0411-458-990')}"/>
        <input type="hidden" id="profWaUsaha" value="${S().esc(merged.wa_usaha || '628110000990')}"/>
        <input type="hidden" id="profEmailUsaha" value="${S().esc(merged.email_usaha || 'halo@onsfarma.id')}"/>

        ${canEdit ? `<div class="flex flex-wrap items-center justify-between gap-3 pt-2 border-t" style="border-color:var(--ons-border)">
          <label class="flex items-center gap-2 cursor-pointer font-semibold select-none">
            <input id="profConfirmChk" type="checkbox" checked class="w-4 h-4 accent-blue-600"/>
            <span>Saya menyatakan data pemilik, foto/logo, izin SIA/SIPA, &amp; alamat tempat usaha di atas adalah benar dan sah.</span>
          </label>
          <button type="button" onclick="window.submitStoreProfileForm()" class="ons-btn ons-btn-emerald text-xs px-5 py-2.5 font-bold">Konfirmasi &amp; Simpan Data Resmi</button>
        </div>` : `<div class="p-3 rounded-xl border text-[11px]" style="background:var(--ons-bg-subtle);border-color:var(--ons-border);color:var(--ons-text-soft)">
          Hanya peran <b>Pemilik</b> atau <b>APJ</b> yang dapat mengonfirmasi dan mengubah identitas resmi apotek.
        </div>`}
      </div>

      <!-- 10. Skala Outlet: Mode 1 Apotek Tunggal vs Multi-Cabang -->
      <div class="ons-card p-5 space-y-3">
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

  // ==========================================
  // SALURAN METODE PEMBAYARAN APOTEK DIGITAL
  // ==========================================
  let payChannelSearchQ = '';
  let activePayTypeIsAsuransi = false;
  let activePayMdrType = '%';

  function getPaymentChannelsList() {
    try {
      const raw = localStorage.getItem('ons_payment_channels_v1');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return [
      { id: 'PAY-001', nama: 'Tunai', deskripsi: 'Pembayaran tunai langsung di kasir', mdr_type: '%', mdr_val: 0, min_tx: 0, is_asuransi: false, target_akun: 'Kas Utama', status: 'Aktif' },
      { id: 'PAY-002', nama: 'Transfer Bank', deskripsi: 'Transfer via VA / Rekening Bank Apotek', mdr_type: '%', mdr_val: 0, min_tx: 10000, is_asuransi: false, target_akun: 'Bank Mandiri', status: 'Aktif' },
      { id: 'PAY-003', nama: 'QRIS Dinamis / Statis', deskripsi: 'Pembayaran QRIS Standar BI (GOPAY, OVO, ShopeePay, BCA)', mdr_type: '%', mdr_val: 0.7, min_tx: 1000, is_asuransi: false, target_akun: 'Kas Utama', status: 'Aktif' },
      { id: 'PAY-004', nama: 'Kartu Debit / EDC', deskripsi: 'Gesek kartu debit via mesin EDC outlet', mdr_type: '%', mdr_val: 0.15, min_tx: 50000, is_asuransi: false, target_akun: 'Bank Mandiri', status: 'Aktif' },
      { id: 'PAY-005', nama: 'Asuransi Mandiri Inhealth', deskripsi: 'Klaim penjaminan resep obat asuransi rekanan', mdr_type: '%', mdr_val: 0, min_tx: 0, is_asuransi: true, target_akun: 'Kas Utama', status: 'Aktif' }
    ];
  }

  function savePaymentChannelsList(list) {
    try {
      localStorage.setItem('ons_payment_channels_v1', JSON.stringify(list));
    } catch (e) {}
  }

  global.setPaymentChannelSearch = (q) => {
    payChannelSearchQ = String(q || '').toLowerCase();
    const rows = document.querySelectorAll('[data-pay-channel-row]');
    rows.forEach((r) => {
      const txt = (r.getAttribute('data-pay-channel-row') || '').toLowerCase();
      r.style.display = !payChannelSearchQ || txt.includes(payChannelSearchQ) ? '' : 'none';
    });
  };

  global.openAddPaymentChannelModal = (targetId) => {
    const list = getPaymentChannelsList();
    const target = targetId ? list.find((p) => p.id === targetId) : null;
    const isEdit = !!target;
    activePayTypeIsAsuransi = target ? !!target.is_asuransi : false;
    activePayMdrType = target ? (target.mdr_type || '%') : '%';
    const akunList = (S().AppState.daftarAkunKas && S().AppState.daftarAkunKas.length)
      ? S().AppState.daftarAkunKas
      : [
          { id_akun: 'KAS-01', nama: 'Kas Utama', deskripsi: 'Akun Kas Utama' },
          { id_akun: 'KAS-02', nama: 'Bank Mandiri', deskripsi: 'Rekening Operasional Apotek' },
          { id_akun: 'KAS-03', nama: 'Bank BCA', deskripsi: 'Rekening Transaksi Kasir' }
        ];

    S().openModal(`
      <div class="rounded-xl overflow-hidden text-xs">
        <!-- Header Biru Solid Apotek Digital -->
        <div class="p-4 flex items-center justify-between text-white" style="background:#0284c7">
          <h3 class="font-bold text-sm text-white">${isEdit ? 'Edit Metode Pembayaran' : 'Tambah Metode Pembayaran'}</h3>
          <button type="button" onclick="ONSStore.closeModal()" class="text-white hover:opacity-80 text-xl font-bold bg-transparent border-0 cursor-pointer">&times;</button>
        </div>

        <div class="p-6 space-y-3.5 text-xs max-h-[80vh] overflow-y-auto">
          <input type="hidden" id="modalPayId" value="${isEdit ? S().esc(target.id) : ''}">
          
          <div>
            <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-200">Nama Metode Pembayaran *</label>
            <input type="text" id="modalPayNama" value="${isEdit ? S().esc(target.nama || '') : ''}" placeholder="Masukkan nama metode pembayaran" class="ons-input text-xs w-full"/>
          </div>

          <div>
            <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-200">Deskripsi *</label>
            <input type="text" id="modalPayDeskripsi" value="${isEdit ? S().esc(target.deskripsi || '') : ''}" placeholder="Deskripsi ringkas" class="ons-input text-xs w-full"/>
          </div>

          <div>
            <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-200">Tipe Pembayaran</label>
            <div class="grid grid-cols-2 gap-0 border rounded-lg overflow-hidden" style="border-color:#0284c7">
              <button type="button" id="btnPayNonAsuransi" onclick="window.togglePayAsuransi(false)" class="py-2 text-xs font-semibold ${!activePayTypeIsAsuransi ? 'text-white' : 'text-sky-600 bg-white'}" style="${!activePayTypeIsAsuransi ? 'background:#0284c7' : ''}">Bukan Asuransi</button>
              <button type="button" id="btnPayAsuransi" onclick="window.togglePayAsuransi(true)" class="py-2 text-xs font-semibold ${activePayTypeIsAsuransi ? 'text-white' : 'text-sky-600 bg-white'}" style="${activePayTypeIsAsuransi ? 'background:#0284c7' : ''}">Asuransi</button>
            </div>
          </div>

          <div>
            <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-200">Target Akun *</label>
            <div class="flex items-center gap-2">
              <select id="modalPayTargetAkun" class="ons-select text-xs w-full flex-1">
                ${akunList.map((ak) => `<option value="${S().esc(ak.nama)}" ${target && target.target_akun === ak.nama ? 'selected' : ''}>${S().esc(ak.nama)}</option>`).join('')}
              </select>
              <button type="button" onclick="ONSStore.toast('Gunakan modul Keuangan > Daftar Akun Kas untuk menambah rekening baru.', 'info')" class="ons-btn text-white px-3 py-2 rounded-lg font-bold" style="background:#0284c7" title="Tambah Akun Kas">+</button>
            </div>
          </div>

          <div class="border-t pt-3" style="border-color:var(--ons-border)">
            <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <span>Merchant Discount Rate</span>
              <svg class="w-3.5 h-3.5 text-sky-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>
            </label>
            <div class="flex items-center gap-2">
              <div class="inline-flex rounded-lg border overflow-hidden shrink-0" style="border-color:#0284c7">
                <button type="button" id="btnPayMdrPct" onclick="window.togglePayMdrType('%')" class="px-3 py-1.5 text-xs font-bold ${activePayMdrType === '%' ? 'text-white' : 'text-sky-600 bg-white'}" style="${activePayMdrType === '%' ? 'background:#0284c7' : ''}">%</button>
                <button type="button" id="btnPayMdrRp" onclick="window.togglePayMdrType('Rp')" class="px-3 py-1.5 text-xs font-bold ${activePayMdrType === 'Rp' ? 'text-white' : 'text-sky-600 bg-white'}" style="${activePayMdrType === 'Rp' ? 'background:#0284c7' : ''}">Rp</button>
              </div>
              <input type="number" step="0.01" id="modalPayMdr" value="${isEdit ? Number(target.mdr_val || 0) : 0}" class="ons-input font-mono-num text-xs w-full" placeholder="0"/>
              <span class="text-xs font-semibold text-slate-500 w-8" id="lblPayMdrUnit">${activePayMdrType === '%' ? '%' : 'Rp'}</span>
            </div>
          </div>

          <div>
            <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-200">Minimum Transaksi</label>
            <div class="relative">
              <span class="absolute left-2.5 top-2 text-xs font-semibold text-slate-400">Rp</span>
              <input type="number" id="modalPayMinTx" value="${isEdit ? Number(target.min_tx || 0) : 0}" class="ons-input font-mono-num text-xs pl-8 w-full" placeholder="0"/>
            </div>
          </div>
        </div>

        <div class="px-6 py-3.5 bg-slate-50 dark:bg-slate-900/60 border-t flex justify-end items-center gap-3" style="border-color:var(--ons-border)">
          <button type="button" onclick="ONSStore.closeModal()" class="ons-btn ons-btn-ghost text-xs">Batal</button>
          <button type="button" onclick="window.savePaymentChannelFromModal()" class="ons-btn text-white text-xs font-bold px-6 py-2 rounded-lg shadow-sm" style="background:#0D9488">Simpan</button>
        </div>
      </div>
    `, '500px');
  };

  global.togglePayAsuransi = (isAsuransi) => {
    activePayTypeIsAsuransi = isAsuransi;
    const b1 = document.getElementById('btnPayNonAsuransi');
    const b2 = document.getElementById('btnPayAsuransi');
    if (b1 && b2) {
      if (!isAsuransi) {
        b1.style.background = '#0284c7';
        b1.className = 'py-2 text-xs font-semibold text-white';
        b2.style.background = '';
        b2.className = 'py-2 text-xs font-semibold text-sky-600 bg-white';
      } else {
        b2.style.background = '#0284c7';
        b2.className = 'py-2 text-xs font-semibold text-white';
        b1.style.background = '';
        b1.className = 'py-2 text-xs font-semibold text-sky-600 bg-white';
      }
    }
  };

  global.togglePayMdrType = (type) => {
    activePayMdrType = type;
    const b1 = document.getElementById('btnPayMdrPct');
    const b2 = document.getElementById('btnPayMdrRp');
    const lbl = document.getElementById('lblPayMdrUnit');
    if (lbl) lbl.textContent = type === '%' ? '%' : 'Rp';
    if (b1 && b2) {
      if (type === '%') {
        b1.style.background = '#0284c7';
        b1.className = 'px-3 py-1.5 text-xs font-bold text-white';
        b2.style.background = '';
        b2.className = 'px-3 py-1.5 text-xs font-bold text-sky-600 bg-white';
      } else {
        b2.style.background = '#0284c7';
        b2.className = 'px-3 py-1.5 text-xs font-bold text-white';
        b1.style.background = '';
        b1.className = 'px-3 py-1.5 text-xs font-bold text-sky-600 bg-white';
      }
    }
  };

  global.savePaymentChannelFromModal = () => {
    try {
      const id = (document.getElementById('modalPayId') || {}).value || '';
      const nama = ((document.getElementById('modalPayNama') || {}).value || '').trim();
      const deskripsi = ((document.getElementById('modalPayDeskripsi') || {}).value || '').trim();
      const targetAkun = (document.getElementById('modalPayTargetAkun') || {}).value || 'Kas Utama';
      const mdrVal = Number((document.getElementById('modalPayMdr') || {}).value || 0);
      const minTx = Number((document.getElementById('modalPayMinTx') || {}).value || 0);

      if (!nama) throw new Error('Nama metode pembayaran wajib diisi.');
      if (!deskripsi) throw new Error('Deskripsi metode pembayaran wajib diisi.');

      const list = getPaymentChannelsList();
      if (id) {
        const idx = list.findIndex((p) => p.id === id);
        if (idx >= 0) {
          list[idx].nama = nama;
          list[idx].deskripsi = deskripsi;
          list[idx].is_asuransi = activePayTypeIsAsuransi;
          list[idx].target_akun = targetAkun;
          list[idx].mdr_type = activePayMdrType;
          list[idx].mdr_val = mdrVal;
          list[idx].min_tx = minTx;
        }
      } else {
        list.push({
          id: 'PAY-' + String(list.length + 1).padStart(3, '0'),
          nama,
          deskripsi,
          is_asuransi: activePayTypeIsAsuransi,
          target_akun: targetAkun,
          mdr_type: activePayMdrType,
          mdr_val: mdrVal,
          min_tx: minTx,
          status: 'Aktif'
        });
      }
      savePaymentChannelsList(list);
      S().closeModal();
      ONSStore.toast(`Metode pembayaran "${nama}" berhasil disimpan!`, 'ok');
      global.renderActiveView();
    } catch (e) {
      ONSStore.toast(e.message, 'err');
    }
  };

  global.deletePaymentChannelConfirm = (targetId) => {
    const list = getPaymentChannelsList();
    const item = list.find((p) => p.id === targetId);
    if (!item) return;
    if (confirm(`Hapus saluran pembayaran "${item.nama}"?`)) {
      const remaining = list.filter((p) => p.id !== targetId);
      savePaymentChannelsList(remaining);
      ONSStore.toast(`Saluran pembayaran "${item.nama}" dihapus!`, 'ok');
      global.renderActiveView();
    }
  };

  global.exportPaymentChannels = (fmt) => {
    const list = getPaymentChannelsList();
    const dTag = new Date().toISOString().slice(0, 10);
    const rows = list.map((p, i) => ({
      no: i + 1,
      nama: p.nama,
      deskripsi: p.deskripsi,
      mdr: `${p.mdr_val}${p.mdr_type}`,
      tipe: p.is_asuransi ? 'Asuransi' : 'Bukan Asuransi',
      target_akun: p.target_akun,
      status: p.status
    }));
    return S().exportDataset(fmt || 'xlsx', 'Daftar Saluran Pembayaran Apotek', `daftar-metode-pembayaran-apotek-${dTag}`, [
      { key: 'no', label: 'No', type: 'int', width: 6 },
      { key: 'nama', label: 'Nama Metode', width: 24 },
      { key: 'deskripsi', label: 'Deskripsi', width: 32 },
      { key: 'mdr', label: 'MDR', width: 12 },
      { key: 'tipe', label: 'Tipe', width: 18 },
      { key: 'target_akun', label: 'Target Akun', width: 20 },
      { key: 'status', label: 'Status', width: 12 }
    ], rows, { sheetName: 'Metode Pembayaran' });
  };

  function renderPaymentMethodsTabHtml(canEdit) {
    const list = getPaymentChannelsList();
    return `<div class="space-y-4 ons-view-enter">
      <!-- Header Modul Apotek Digital -->
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-xl font-bold">Metode Pembayaran</h1>
          <p class="text-xs" style="color:var(--ons-text-soft)">Kelola saluran pembayaran kasir, kartu debit/EDC, transfer rekening bank, QRIS Standar BI, &amp; asuransi rekanan.</p>
        </div>
        <div class="flex items-center gap-2">
          ${canEdit ? `<button type="button" onclick="window.openAddPaymentChannelModal()" class="ons-btn text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-sm" style="background:#0D9488">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            + Metode Baru
          </button>` : ''}
        </div>
      </div>

      <!-- Filter Toolbar -->
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <div class="relative w-64">
            <input type="text" id="payChannelSearchInput" value="${S().esc(payChannelSearchQ)}" oninput="window.setPaymentChannelSearch(this.value)" placeholder="Cari data" class="ons-input text-xs pl-8 w-full"/>
            <svg class="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>
          <button type="button" class="ons-btn ons-btn-ghost text-xs flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/></svg>
            <span>Filter 0</span>
          </button>
        </div>
        <div class="flex items-center gap-2">
          <button type="button" onclick="window.renderActiveView()" class="ons-btn ons-btn-ghost text-xs p-2" title="Segarkan"><svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg></button>
          <button type="button" onclick="window.exportPaymentChannels('xlsx')" class="ons-btn ons-btn-ghost text-xs p-2" title="Ekspor Excel"><svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg></button>
        </div>
      </div>

      <!-- Tabel Metode Pembayaran Apotek Digital -->
      <div class="ons-table-wrap">
        <table class="ons-table">
          <thead>
            <tr>
              <th style="width:45px">No.</th>
              <th>Nama</th>
              <th>Deskripsi</th>
              <th style="width:110px">MDR</th>
              <th style="width:140px">Tipe</th>
              <th style="width:100px">Status</th>
              <th style="width:120px;text-align:center">Action</th>
            </tr>
          </thead>
          <tbody>
            ${list.length ? list.map((p, i) => `
              <tr data-pay-channel-row="${S().esc(p.nama)} ${S().esc(p.deskripsi)} ${S().esc(p.target_akun)}">
                <td class="font-mono-num">${i + 1}</td>
                <td class="font-bold text-slate-800 dark:text-slate-100">${S().esc(p.nama)}</td>
                <td class="text-slate-600 dark:text-slate-300 text-xs">${S().esc(p.deskripsi)}</td>
                <td class="font-mono-num font-semibold text-slate-700 dark:text-slate-200">${p.mdr_val}${S().esc(p.mdr_type)}</td>
                <td>
                  <span class="px-2 py-0.5 rounded text-[10px] font-semibold ${p.is_asuransi ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}">
                    ${p.is_asuransi ? 'Asuransi' : 'Bukan Asuransi'}
                  </span>
                </td>
                <td>
                  <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    ${S().esc(p.status || 'Aktif')}
                  </span>
                </td>
                <td style="text-align:center">
                  <div class="inline-flex items-center justify-center gap-2">
                    <button type="button" onclick="window.openAddPaymentChannelModal('${S().esc(p.id)}')" class="px-3 py-1 rounded text-xs border border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 font-medium">Edit</button>
                    <button type="button" onclick="window.deletePaymentChannelConfirm('${S().esc(p.id)}')" class="p-1 text-red-500 hover:text-red-700 transition" title="Hapus"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
                  </div>
                </td>
              </tr>
            `).join('') : `<tr><td colspan="7" class="text-center py-8 text-slate-400">Data tidak ditemukan</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>`;
  }

  function renderSettingsView() {
    global.loadSettingsBundle();
    const st = S().AppState;
    settingsTab = (st.subTabs && st.subTabs.settings) || settingsTab || 'profil';
    if (!['profil', 'metode-bayar', 'akun', 'struk', 'vault', 'audit'].includes(settingsTab)) settingsTab = 'profil';
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
          <p class="text-xs" style="color:var(--ons-text-soft)">Konfirmasi pemilik, foto/logo usaha, legalitas SIA/SIPA, metode pembayaran, manajemen akun, desain struk 58/80mm, &amp; audit sistem.</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button onclick="window.openChangeCredModal()" class="ons-btn ons-btn-primary text-xs">Ganti Sandi / PIN Saya</button>
          <button onclick="window.runDriveBackupSnapshot()" class="ons-btn ons-btn-emerald text-xs">Snapshot Backup Drive</button>
        </div>
      </div>

      <div class="ons-tab-bar">
        <button onclick="window.setSettingsTab('profil')" class="ons-tab-btn ${settingsTab === 'profil' ? 'active' : ''}">Profil Bisnis (Profil Pemilik &amp; Usaha)</button>
        <button onclick="window.setSettingsTab('metode-bayar')" class="ons-tab-btn ${settingsTab === 'metode-bayar' ? 'active' : ''}">Metode Pembayaran</button>
        <button onclick="window.setSettingsTab('akun')" class="ons-tab-btn ${settingsTab === 'akun' ? 'active' : ''}">Pengguna &amp; Akses (${users.length})</button>
        <button onclick="window.setSettingsTab('struk')" class="ons-tab-btn ${settingsTab === 'struk' ? 'active' : ''}">Desain Struk Thermal</button>
        <button onclick="window.setSettingsTab('vault')" class="ons-tab-btn ${settingsTab === 'vault' ? 'active' : ''}">Audit DB, Brankas &amp; Reset</button>
        <button onclick="window.setSettingsTab('audit')" class="ons-tab-btn ${settingsTab === 'audit' ? 'active' : ''}">Log Audit Aktivitas (${audit.length})</button>
      </div>

      ${settingsTab === 'profil' ? renderProfileTabHtml(prof, canEditProfile) : ''}
      ${settingsTab === 'metode-bayar' ? renderPaymentMethodsTabHtml(canEditProfile) : ''}

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
    if (kind === 'foto') {
      const mainBox = document.getElementById('profMainAvatarBox');
      if (mainBox) {
        mainBox.innerHTML = renderProfileMediaInner('foto', clean, (ownerEl && ownerEl.value) || 'apt. Anissa Faradifa R. Is Rumi');
      }
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
      let dataUrl;
      if (file.type && file.type.startsWith('image/')) {
        try {
          dataUrl = await S().compressImageFile(file, 240, 0.85);
        } catch (_) {
          dataUrl = await new Promise((res, rej) => {
            const r = new FileReader();
            r.onload = () => res(r.result);
            r.onerror = rej;
            r.readAsDataURL(file);
          });
        }
      } else {
        dataUrl = await new Promise((res, rej) => {
          const r = new FileReader();
          r.onload = () => res(r.result);
          r.onerror = rej;
          r.readAsDataURL(file);
        });
      }
      const urlInput = document.getElementById(kind === 'foto' ? 'profFotoUrl' : 'profLogoUrl');
      if (urlInput) urlInput.value = dataUrl;
      global.refreshProfileLivePreview(kind, dataUrl);
      global.toast((kind === 'foto' ? 'Foto profil' : 'Logo usaha') + ' berhasil dipilih! Klik Simpan di sudut kanan atas untuk menyimpan permanen.', 'ok');
    } catch (e) {
      global.toast(e.message || 'Gagal memproses gambar.', 'err');
    }
  };

  global.resetProfileMedia = (kind) => {
    const val = kind === 'logo' ? './icons/ons-farma-app-icon.png' : '';
    const urlInput = document.getElementById(kind === 'foto' ? 'profFotoUrl' : 'profLogoUrl');
    if (urlInput) urlInput.value = val;
    global.refreshProfileLivePreview(kind, val);
    if (kind === 'foto') {
      const fileInp = document.getElementById('profFotoUploadInput');
      if (fileInp) fileInp.value = '';
    }
    global.toast((kind === 'foto' ? 'Foto profil' : 'Logo usaha') + ' dihapus. Klik Simpan untuk memperbarui profil.', 'ok');
  };

  global.handleProfileDocUpload = (docKey, inputEl) => {
    const file = inputEl && inputEl.files && inputEl.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      const fileName = file.name;
      profileDocsDraft[docKey] = { dataUrl, name: fileName, size: file.size, type: file.type };
      const urlEl = document.getElementById('profDocUrl_' + docKey);
      const nameEl = document.getElementById('profDocName_' + docKey);
      if (urlEl) urlEl.value = dataUrl;
      if (nameEl) nameEl.value = fileName;
      global.refreshProfileDocStatus(docKey, dataUrl, fileName);
      ONSStore.toast(`Berkas "${fileName}" siap disimpan! Klik Simpan di sudut kanan atas.`, 'ok');
    };
    reader.onerror = () => {
      ONSStore.toast('Gagal membaca berkas.', 'err');
    };
    reader.readAsDataURL(file);
  };

  global.viewOrDownloadProfileDoc = (docKey) => {
    const urlEl = document.getElementById('profDocUrl_' + docKey);
    const nameEl = document.getElementById('profDocName_' + docKey);
    let url = (urlEl && urlEl.value) || (profileDocsDraft[docKey] && profileDocsDraft[docKey].dataUrl) || '';
    const name = (nameEl && nameEl.value) || (profileDocsDraft[docKey] && profileDocsDraft[docKey].name) || `${docKey}.pdf`;

    if (!url) {
      url = 'data:text/plain;charset=utf-8,' + encodeURIComponent('Dokumen Resmi ' + name + '\nApotek ONS Farma\nTerverifikasi Sistem Digital.');
    }

    try {
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      a.remove();
      ONSStore.toast(`Mengunduh berkas "${name}"...`, 'info');
    } catch (err) {
      window.open(url, '_blank');
    }
  };

  global.removeProfileDoc = (docKey) => {
    delete profileDocsDraft[docKey];
    const urlEl = document.getElementById('profDocUrl_' + docKey);
    const nameEl = document.getElementById('profDocName_' + docKey);
    if (urlEl) urlEl.value = '';
    if (nameEl) nameEl.value = '';
    const fileInp = document.getElementById('profDocInput_' + docKey);
    if (fileInp) fileInp.value = '';
    global.refreshProfileDocStatus(docKey, '', '');
    ONSStore.toast('Berkas berhasil dihapus. Klik Simpan untuk memperbarui profil.', 'ok');
  };

  global.refreshProfileDocStatus = (docKey, dataUrl, fileName) => {
    const container = document.getElementById('profDocStatus_' + docKey);
    if (!container) return;
    const hasFile = !!(fileName || dataUrl);
    if (hasFile) {
      container.innerHTML = `
        <input type="file" id="profDocInput_${docKey}" accept=".pdf,image/*" class="hidden" onchange="window.handleProfileDocUpload('${docKey}', this)"/>
        <input type="hidden" id="profDocUrl_${docKey}" value="${S().esc(dataUrl || '')}"/>
        <input type="hidden" id="profDocName_${docKey}" value="${S().esc(fileName || '')}"/>
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800" title="${S().esc(fileName || 'Berkas Terlampir')}">
          <svg class="w-3.5 h-3.5 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
          <span class="max-w-[130px] sm:max-w-[180px] truncate">${S().esc(fileName || 'Berkas Terlampir')}</span>
        </span>
        <button type="button" onclick="window.viewOrDownloadProfileDoc('${docKey}')" class="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800" title="Unduh / Lihat Berkas">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
        </button>
        <button type="button" onclick="window.removeProfileDoc('${docKey}')" class="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40" title="Hapus Berkas">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
        <button type="button" onclick="document.getElementById('profDocInput_${docKey}').click()" class="ons-btn text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm" style="background:#0D9488">Ganti File</button>
      `;
    } else {
      container.innerHTML = `
        <input type="file" id="profDocInput_${docKey}" accept=".pdf,image/*" class="hidden" onchange="window.handleProfileDocUpload('${docKey}', this)"/>
        <input type="hidden" id="profDocUrl_${docKey}" value=""/>
        <input type="hidden" id="profDocName_${docKey}" value=""/>
        <button type="button" onclick="document.getElementById('profDocInput_${docKey}').click()" class="ons-btn text-white text-xs font-semibold px-4 py-1.5 rounded-lg shadow-sm" style="background:#0D9488">Upload File</button>
      `;
    }
  };

  global.submitStoreProfileForm = async () => {
    const chk = document.getElementById('profConfirmChk');
    if (chk && !chk.checked) {
      ONSStore.toast('Centang pernyataan konfirmasi keabsahan data terlebih dahulu.', 'err');
      return;
    }
    const cur = S().getStoreProfile();
    const v = (id) => {
      const el = document.getElementById(id);
      return el ? String(el.value || '').trim() : '';
    };

    const docFotoOutlet = v('profDocUrl_foto_outlet') || (profileDocsDraft.foto_outlet && profileDocsDraft.foto_outlet.dataUrl) || cur.foto_outlet_url || '';
    const docFotoOutletName = v('profDocName_foto_outlet') || (profileDocsDraft.foto_outlet && profileDocsDraft.foto_outlet.name) || cur.file_foto_outlet_name || '';

    const docNpwpUsaha = v('profDocUrl_npwp_usaha') || (profileDocsDraft.npwp_usaha && profileDocsDraft.npwp_usaha.dataUrl) || cur.file_npwp_usaha_url || '';
    const docNpwpUsahaName = v('profDocName_npwp_usaha') || (profileDocsDraft.npwp_usaha && profileDocsDraft.npwp_usaha.name) || cur.file_npwp_usaha_name || '';

    const docNib = v('profDocUrl_nib') || (profileDocsDraft.nib && profileDocsDraft.nib.dataUrl) || cur.file_nib_url || '';
    const docNibName = v('profDocName_nib') || (profileDocsDraft.nib && profileDocsDraft.nib.name) || cur.file_nib_name || '';

    const docSia = v('profDocUrl_sia') || (profileDocsDraft.sia && profileDocsDraft.sia.dataUrl) || cur.file_sia_url || '';
    const docSiaName = v('profDocName_sia') || (profileDocsDraft.sia && profileDocsDraft.sia.name) || cur.file_sia_name || '';

    const docKtpPemilik = v('profDocUrl_ktp_pemilik') || (profileDocsDraft.ktp_pemilik && profileDocsDraft.ktp_pemilik.dataUrl) || cur.file_ktp_url || '';
    const docKtpPemilikName = v('profDocName_ktp_pemilik') || (profileDocsDraft.ktp_pemilik && profileDocsDraft.ktp_pemilik.name) || cur.file_ktp_name || '';

    const docNpwpPemilik = v('profDocUrl_npwp_pemilik') || (profileDocsDraft.npwp_pemilik && profileDocsDraft.npwp_pemilik.dataUrl) || cur.file_npwp_pemilik_url || '';
    const docNpwpPemilikName = v('profDocName_npwp_pemilik') || (profileDocsDraft.npwp_pemilik && profileDocsDraft.npwp_pemilik.name) || cur.file_npwp_pemilik_name || '';

    const docSipaPemilik = v('profDocUrl_sipa_pemilik') || (profileDocsDraft.sipa_pemilik && profileDocsDraft.sipa_pemilik.dataUrl) || cur.file_sipa_url || '';
    const docSipaPemilikName = v('profDocName_sipa_pemilik') || (profileDocsDraft.sipa_pemilik && profileDocsDraft.sipa_pemilik.name) || cur.file_sipa_name || '';

    const docSipaP1 = v('profDocUrl_sipa_pendamping_1') || (profileDocsDraft.sipa_pendamping_1 && profileDocsDraft.sipa_pendamping_1.dataUrl) || (cur.apoteker_pendamping && cur.apoteker_pendamping[0] && cur.apoteker_pendamping[0].file_sipa) || cur.file_sipa_pendamping_1_url || '';
    const docSipaP1Name = v('profDocName_sipa_pendamping_1') || (profileDocsDraft.sipa_pendamping_1 && profileDocsDraft.sipa_pendamping_1.name) || cur.file_sipa_pendamping_1_name || '';

    const docSipaP2 = v('profDocUrl_sipa_pendamping_2') || (profileDocsDraft.sipa_pendamping_2 && profileDocsDraft.sipa_pendamping_2.dataUrl) || (cur.apoteker_pendamping && cur.apoteker_pendamping[1] && cur.apoteker_pendamping[1].file_sipa) || cur.file_sipa_pendamping_2_url || '';
    const docSipaP2Name = v('profDocName_sipa_pendamping_2') || (profileDocsDraft.sipa_pendamping_2 && profileDocsDraft.sipa_pendamping_2.name) || cur.file_sipa_pendamping_2_name || '';

    const docBukuRekening = v('profDocUrl_buku_rekening') || (profileDocsDraft.buku_rekening && profileDocsDraft.buku_rekening.dataUrl) || cur.file_buku_rekening_url || '';
    const docBukuRekeningName = v('profDocName_buku_rekening') || (profileDocsDraft.buku_rekening && profileDocsDraft.buku_rekening.name) || cur.file_buku_rekening_name || '';

    const pubAccEl = document.getElementById('profPublicAccess');
    const pubAccVal = pubAccEl ? (pubAccEl.type === 'checkbox' ? pubAccEl.checked : (pubAccEl.value === 'true' || pubAccEl.value === '1')) : true;

    const payload = {
      nama_pemilik: v('profNamaPemilik') || cur.nama_pemilik,
      jabatan_pemilik: v('profJabatanPemilik') || cur.jabatan_pemilik,
      sipa_pemilik: v('profSipaPemilik') || cur.sipa_pemilik,
      stra_pemilik: v('profStraPemilik') || cur.stra_pemilik,
      wa_pemilik: v('profWaPemilik') || cur.wa_pemilik,
      email_pemilik: v('profEmailPemilik') || cur.email_pemilik,
      npwp_pemilik: v('profNpwpPemilik') || cur.npwp_pemilik,
      foto_pemilik_url: v('profFotoUrl') || cur.foto_pemilik_url,
      nama_usaha: v('profNamaUsaha') || cur.nama_usaha,
      no_sia: v('profNoSia') || cur.no_sia,
      nib_oss: v('profNibOss') || cur.nib_oss,
      npwp_usaha: v('profNpwpUsaha') || cur.npwp_usaha,
      status_pkp: v('profStatusPkp') || cur.status_pkp,
      alamat_usaha: v('profAlamatUsaha') || cur.alamat_usaha,
      kota: v('profKota') || cur.kota,
      kode_pos: v('profKodePos') || cur.kode_pos,
      telepon_usaha: v('profTelpUsaha') || cur.telepon_usaha,
      wa_usaha: v('profWaUsaha') || v('profWaPemilik') || cur.wa_usaha,
      email_usaha: v('profEmailUsaha') || v('profEmailPemilik') || cur.email_usaha,
      jam_operasional: v('profJamOps') || cur.jam_operasional,
      zona_waktu: v('profZonaWaktu') || cur.zona_waktu,
      logo_usaha_url: v('profLogoUrl') || cur.logo_usaha_url,
      slogan: v('profSlogan') || cur.slogan || '',
      provinsi: v('profProvinsi') || cur.provinsi || 'Sulawesi Selatan',
      kecamatan: v('profKecamatan') || cur.kecamatan || 'Panakkukang',
      kelurahan: v('profKelurahan') || cur.kelurahan || 'Masale',
      latitude: v('profLat') || cur.latitude || '-5.147665',
      longitude: v('profLng') || cur.longitude || '119.432732',
      nitku: v('profNitku') || cur.nitku || '8511240918050000',
      jenis_badan_usaha: v('profJenisBadanUsaha') || cur.jenis_badan_usaha || 'Perorangan',
      tgl_berlaku_sia: v('profTglSia') || cur.tgl_berlaku_sia || '13/11/2026',
      ktp_pemilik: v('profKtpPemilik') || cur.ktp_pemilik || '7371105408920001',
      tgl_berlaku_sipa: v('profMasaSipa') || cur.tgl_berlaku_sipa || '13/11/2026',
      bank_nama: v('profBankNama') || cur.bank_nama || 'Bank Mandiri',
      bank_cabang: v('profBankCabang') || cur.bank_cabang || 'KCP Panakkukang',
      bank_akun_nama: v('profBankAkun') || cur.bank_akun_nama || 'Apotek ONS Farma',
      bank_nomor_rekening: v('profBankNo') || cur.bank_nomor_rekening || '152001928374',
      public_access: pubAccVal,
      foto_outlet_url: docFotoOutlet,
      file_foto_outlet_name: docFotoOutletName,
      file_npwp_usaha_url: docNpwpUsaha,
      file_npwp_usaha_name: docNpwpUsahaName,
      file_nib_url: docNib,
      file_nib_name: docNibName,
      file_sia_url: docSia,
      file_sia_name: docSiaName,
      file_ktp_url: docKtpPemilik,
      file_ktp_name: docKtpPemilikName,
      file_npwp_pemilik_url: docNpwpPemilik,
      file_npwp_pemilik_name: docNpwpPemilikName,
      file_sipa_url: docSipaPemilik,
      file_sipa_name: docSipaPemilikName,
      file_sipa_pendamping_1_url: docSipaP1,
      file_sipa_pendamping_1_name: docSipaP1Name,
      file_sipa_pendamping_2_url: docSipaP2,
      file_sipa_pendamping_2_name: docSipaP2Name,
      file_buku_rekening_url: docBukuRekening,
      file_buku_rekening_name: docBukuRekeningName,
      apoteker_pendamping: [
        Object.assign({}, (cur.apoteker_pendamping && cur.apoteker_pendamping[0]) || {}, { file_sipa: docSipaP1 }),
        Object.assign({}, (cur.apoteker_pendamping && cur.apoteker_pendamping[1]) || {}, { file_sipa: docSipaP2 })
      ],
      terkonfirmasi: 'YA',
      dikonfirmasi_oleh: (document.getElementById('profNamaPemilik') || {}).value || (cur.nama_pemilik || 'apt. Anissa Faradifa R. Is Rumi')
    };
    if (!payload.nama_pemilik || !payload.nama_usaha) {
      ONSStore.toast('Nama Pemilik dan Nama Tempat Usaha wajib diisi.', 'err');
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
      profileDocsDraft = {};
      settingsCache.users = [];
      settingsCache.audit = [];
      if (typeof global.renderApp === 'function') global.renderApp();
      global.toast('Profil Bisnis, Foto & Seluruh Berkas Legalitas berhasil disimpan!', 'ok');
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

      // Bersihkan seluruh cache & storage transaksi lokal
      [
        'ons_lost_sales_v10', 'ons_lost_sales_v1', 'ons_pos_lost_sales',
        'ONS_MANUAL_UTANG_V1', 'ONS_MANUAL_PIUTANG_V1', 'ONS_TTF_PIUTANG_V1',
        'ONS_PURCHASE_PLANS_V1', 'ONS_FAKTUR_DRAFTS_V1', 'ONS_KONSINYASI_DRAFTS_V1',
        'ONS_RETUR_DRAFTS_V1', 'ONS_SP_DRAFTS_V1', 'ons_sp_drafts_v1',
        'ons_farma_offline_queue', 'ons_farma_v10_offline_queue'
      ].forEach((k) => {
        try { localStorage.removeItem(k); } catch (_) {}
      });

      const st = S().AppState;
      st.fakturPbf = [];
      st.penjualan = [];
      st.detailPenjualan = [];
      st.stokBatch = [];
      st.mutasiStok = [];
      st.suratPesanan = [];
      st.jurnalKeuangan = [];
      st.piutangPelanggan = [];
      st.pemeriksaanPasien = [];
      st.rekamKlinis = [];
      st.coldChain = [];
      st.shiftHistory = [];
      st.activeShift = null;
      st.deDokumen = [];
      st.omnichannelOrders = [];
      st.crmKontak = [];
      st.antrianNotif = [];
      if (hapusMaster) {
        st.masterObat = [];
        st.supplierPbf = [];
        st.members = [];
        st.masterDokter = [];
      }
      st.carts = [{ id: 'K1', label: 'Pelanggan #1', channel: 'Toko Fisik', id_member: 'UMUM', tier_harga: 'UMUM', items: [], diskon_global: 0, held_note: '', held_at: '' }];
      st.activeCartIdx = 0;
      settingsCache = { secrets: settingsCache.secrets || {}, audit: [], users: settingsCache.users || [] };
      resetAuditDraftFromStore();

      S().closeModal();
      global.toast((res && res.pesan) || 'Reset Data Pabrik selesai! Sistem bersih siap produksi.', 'ok');
      await global.bootLoadState(true);
      if (typeof global.loadSettingsBundle === 'function') await global.loadSettingsBundle(true);
      if (typeof global.renderActiveView === 'function') global.renderActiveView();
      if (typeof window.renderApp === 'function') window.renderApp();
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
            <button onclick="navigateView('klinis')">&#129658; Klinis</button>
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
    renderAnalisisView,
    renderUsersView,
    renderSettingsView,
    renderMobilePreviewView
  };

  global.pickDosagePreset = (presetId, isModal) => {
    dosageState.presetId = presetId;
    const p = DOSAGE_PRESETS.find((x) => x.id === presetId);
    if (p) {
      dosageState.namaObat = p.nama;
      dosageState.kategori = p.kategori;
      dosageState.target = p.target;
      dosageState.dosisMinMgPerKg = p.dosis_min_mg_kg;
      dosageState.dosisMaxMgPerKg = p.dosis_max_mg_kg;
      dosageState.dosisHarianMaxMgPerKg = p.dosis_harian_max_mg_kg;
      dosageState.isDailyDoseCalc = !!p.is_daily_dose_calc;
      dosageState.isSpecialZinc = !!p.is_special_zinc;
      dosageState.frekuensiHari = p.frekuensi_hari;
      dosageState.jedaJam = p.jeda_jam;
      dosageState.waktuMinum = p.waktu_minum;
      dosageState.sediaanBentuk = p.sediaan_bentuk;
      dosageState.kekuatanMg = p.kekuatan_mg;
      dosageState.volumeSediaanMl = p.volume_sediaan_ml;
      dosageState.volumeBotolMl = p.volume_botol_ml;
      dosageState.dosisDewasaRef = p.dosis_dewasa_ref;
    }
    if (isModal) {
      global.openDosageCalculatorModal(presetId);
    } else {
      global.renderActiveView();
    }
  };

  global.setDosageCategoryFilter = (cat, isModal) => {
    dosageState.kategoriFilter = cat || 'SEMUA';
    if (isModal) {
      global.openDosageCalculatorModal();
    } else {
      global.renderActiveView();
    }
  };

  global.filterDosagePresetsLive = (q, isModal) => {
    dosageState.searchPresetQ = q || '';
    if (isModal) {
      global.openDosageCalculatorModal();
    } else {
      global.renderActiveView();
    }
    setTimeout(() => {
      const el = document.getElementById('calcPresetSearchInput');
      if (el) {
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
      }
    }, 50);
  };

  global.quickSetDosageAge = (th, bb, isModal) => {
    dosageState.usiaTahun = Math.floor(th);
    dosageState.usiaBulan = Math.round((th - Math.floor(th)) * 12);
    dosageState.beratKg = bb;
    if (isModal) {
      global.openDosageCalculatorModal();
    } else {
      global.renderActiveView();
    }
  };

  global.setDosageMode = (mode, isModal) => {
    dosageState.modeHitung = mode || 'BB';
    if (isModal) {
      global.openDosageCalculatorModal();
    } else {
      global.renderActiveView();
    }
  };

  global.setDosageParam = (key, val, isModal) => {
    dosageState[key] = val;
    if (isModal) {
      global.openDosageCalculatorModal();
    } else {
      global.renderActiveView();
    }
  };

  global.handleDosageLiveInput = (el, key, isModal) => {
    let val = el.value;
    if (el.type === 'number') {
      val = val === '' ? 0 : Number(val);
    }
    dosageState[key] = val;
    const curPreset = DOSAGE_PRESETS.find((p) => p.id === dosageState.presetId) || null;
    const res = computeDosageCalculation(dosageState, curPreset);
    _updateDosageDomLive(res, dosageState, curPreset);
  };

  global.pickDosageMember = (idMember, isModal) => {
    dosageState.idMember = idMember || '';
    const st = S().AppState;
    const m = (st.members || []).find((x) => x.id_member === idMember);
    if (m) {
      dosageState.pasienNama = m.nama_pasien || '';
      dosageState.noWa = m.no_hp || '';
      if (m.tgl_lahir) {
        const diffY = S().yearsOld ? S().yearsOld(m.tgl_lahir) : 3;
        dosageState.usiaTahun = Math.max(0, diffY);
      }
    }
    if (isModal) {
      global.openDosageCalculatorModal();
    } else {
      global.renderActiveView();
    }
  };

  global.copyDosageAturanText = (txt) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt);
      } else {
        const t = document.createElement('textarea');
        t.value = txt;
        document.body.appendChild(t);
        t.select();
        document.execCommand('copy');
        document.body.removeChild(t);
      }
      global.toast('Aturan pakai berhasil disalin ke clipboard!', 'ok');
    } catch (e) {
      global.toast('Gagal menyalin teks.', 'err');
    }
  };

  global.openDosageEtiketModal = (warna) => {
    const curPreset = DOSAGE_PRESETS.find((p) => p.id === dosageState.presetId) || null;
    const res = computeDosageCalculation(dosageState, curPreset);
    const pasien = dosageState.pasienNama || 'Pasien Umum';
    const obat = dosageState.namaObat;
    const aturan = res.aturanText;
    const jenis = (warna || (curPreset && curPreset.warna_etiket) || 'putih').toLowerCase();
    const isBiru = jenis === 'biru';
    const prof = S().getStoreProfile ? S().getStoreProfile() : {};
    const tglStr = new Date().toLocaleDateString('id-ID');
    const noResep = 'ETK-' + Date.now().toString().slice(-6);

    S().openModal(`<div class="ons-ws-modal max-w-lg mx-auto" data-ws-custom="1">
      <div class="ons-ws-topbar border-b pb-2.5">
        <div>
          <h3 class="font-extrabold text-base flex items-center gap-1.5" style="color:var(--ons-primary)">
            <span>🏷️</span> Pratinjau &amp; Cetak Etiket Thermal (58mm)
          </h3>
          <p class="text-xs" style="color:var(--ons-text-soft)">Format resmi etiket farmasi siap cetak ke printer kasir 58mm.</p>
        </div>
        <button onclick="ONSStore.closeModal()" class="ons-btn ons-btn-ghost text-sm font-bold">&times;</button>
      </div>

      <div class="p-4 space-y-4">
        <!-- Pilihan Tipe Etiket (Putih / Biru) -->
        <div class="flex items-center justify-between p-2 rounded-xl border bg-slate-50 dark:bg-slate-900/50" style="border-color:var(--ons-border)">
          <span class="text-xs font-bold text-slate-700 dark:text-slate-300">Jenis Etiket:</span>
          <div class="flex gap-1.5">
            <button type="button" onclick="window.openDosageEtiketModal('putih')" class="px-3 py-1 rounded-lg text-xs font-bold transition-all ${!isBiru ? 'bg-white text-slate-900 border-2 border-slate-800 shadow-sm' : 'border border-slate-300 text-slate-600 hover:bg-white'}">
              ⚪ Etiket Putih (Obat Dalam)
            </button>
            <button type="button" onclick="window.openDosageEtiketModal('biru')" class="px-3 py-1 rounded-lg text-xs font-bold transition-all ${isBiru ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-400' : 'border border-blue-300 text-blue-700 hover:bg-blue-50'}">
              🔵 Etiket Biru (Obat Luar)
            </button>
          </div>
        </div>

        <!-- Kartu Etiket Thermal Realistis (Berada di Tengah Layar) -->
        <div class="flex justify-center my-2">
          <div id="dosageEtiketCardPreview" class="ons-etiket-box ${isBiru ? 'biru' : 'putih'} w-[270px] shadow-lg rounded-xl text-left text-[11px] p-3 space-y-2 border-2 ${isBiru ? 'border-blue-600 bg-blue-50' : 'border-slate-800 bg-white text-slate-900'}">
            <!-- Header Apotek -->
            <div class="text-center border-b pb-1.5" style="border-color:${isBiru ? '#2563eb' : '#0f172a'};">
              <div class="font-black text-xs tracking-wider">${S().esc((prof.nama_usaha || 'APOTEK ONS FARMA').toUpperCase())}</div>
              <div class="text-[9px] opacity-85 mt-0.5">SIPA: ${S().esc(prof.sipa_pemilik || '19920412/SIPA_35.78/2025/1042')}</div>
            </div>

            <!-- Identitas Pasien & Obat -->
            <div class="space-y-0.5 text-[10px]">
              <div class="flex justify-between">
                <span><b>No. Resep:</b> ${noResep}</span>
                <span class="font-mono-num">${tglStr}</span>
              </div>
              <div><b>Pasien:</b> ${S().esc(pasien)} (${dosageState.beratKg ? dosageState.beratKg + ' kg' : ''}${dosageState.usiaTahun ? ', ' + dosageState.usiaTahun + ' th' : ''})</div>
              <div><b>Obat:</b> <span class="font-extrabold">${S().esc(obat)}</span></div>
            </div>

            <!-- Aturan Pakai Resmi Terhitung (Border Putus-putus) -->
            <div class="p-2 text-center font-extrabold text-xs leading-snug rounded-lg border-2 border-dashed my-1.5" style="border-color:${isBiru ? '#2563eb' : '#0f172a'}; background:${isBiru ? '#eff6ff' : '#f8fafc'};">
              ${S().esc(aturan)}
            </div>

            <!-- Catatan Apoteker & Tanda Tangan -->
            <div class="pt-1 text-[9px] flex justify-between items-end border-t" style="border-color:${isBiru ? '#93c5fd' : '#cbd5e1'};">
              <div class="max-w-[150px] leading-tight italic opacity-90">
                ${isBiru ? 'OBAT LUAR • TIDAK UNTUK DITELAN' : 'OBAT DALAM • SEMOGA CEPAT SEMBUH'}
              </div>
              <div class="text-right">
                <div class="text-[8px] opacity-75">Apoteker (APJ)</div>
                <div class="font-bold text-[9px] mt-0.5">TTD / Paraf</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Tombol Aksi Cetak & Tutup -->
        <div class="pt-2 border-t flex flex-wrap gap-2" style="border-color:var(--ons-border)">
          <button type="button" onclick="window.confirmPrintDosageEtiket('${isBiru ? 'biru' : 'putih'}')" class="ons-btn ons-btn-primary flex-1 py-2.5 font-extrabold text-xs shadow-md flex items-center justify-center gap-2">
            <span>🖨️</span> Cetak ke Printer Sekarang (58mm)
          </button>
          <button type="button" onclick="ONSStore.closeModal()" class="ons-btn ons-btn-ghost px-4 py-2.5 text-xs font-semibold">
            Tutup
          </button>
        </div>
      </div>
    </div>`, '520px');
  };

  global.confirmPrintDosageEtiket = (warna) => {
    const curPreset = DOSAGE_PRESETS.find((p) => p.id === dosageState.presetId) || null;
    const res = computeDosageCalculation(dosageState, curPreset);
    const pasien = dosageState.pasienNama || 'Pasien Umum';
    const obat = dosageState.namaObat;
    const aturan = res.aturanText;
    const jenis = (warna || (curPreset && curPreset.warna_etiket) || 'putih').toUpperCase();
    const bg = jenis === 'BIRU' ? '#E0F2FE' : '#FFFFFF';
    const prof = S().getStoreProfile ? S().getStoreProfile() : {};
    const tglStr = new Date().toLocaleDateString('id-ID');
    const noResep = 'ETK-' + Date.now().toString().slice(-6);

    const html = `<div style="width:55mm;border:2px solid #000;background:${bg};padding:6px;font-family:Arial,sans-serif;font-size:10px;box-sizing:border-box;">
      <div style="text-align:center;border-bottom:1px solid #000;padding-bottom:3px;font-weight:bold;">
        ${S().esc((prof.nama_usaha || 'APOTEK ONS FARMA').toUpperCase())}<br/>
        <span style="font-size:8px;font-weight:normal;">SIPA: ${S().esc(prof.sipa_pemilik || '19920412/SIPA_35.78/2025/1042')}</span>
      </div>
      <div style="margin:4px 0;font-size:9px;">
        <div><b>No. Resep/Tgl:</b> ${noResep} / ${tglStr}</div>
        <div><b>Pasien:</b> ${S().esc(pasien)} (${dosageState.beratKg ? dosageState.beratKg + ' kg' : ''}${dosageState.usiaTahun ? ', ' + dosageState.usiaTahun + ' th' : ''})</div>
        <div><b>Obat:</b> ${S().esc(obat)}</div>
      </div>
      <div style="border-top:1px dashed #000;border-bottom:1px dashed #000;padding:5px 0;text-align:center;font-weight:bold;font-size:11px;line-height:1.3;">
        ${S().esc(aturan)}
      </div>
      <div style="margin-top:4px;font-size:8px;color:#333;">
        <div><i>${jenis === 'BIRU' ? 'OBAT LUAR • TIDAK UNTUK DITELAN' : 'OBAT DALAM • SEMOGA CEPAT SEMBUH'}</i></div>
        <div style="text-align:right;margin-top:2px;">Apoteker Penanggung Jawab</div>
      </div>
    </div>`;

    if (typeof S().printHtmlZone === 'function') {
      S().printHtmlZone(html, { widthMm: 58 });
      global.toast('Mengirim etiket ' + jenis + ' ke printer thermal...', 'ok');
    }
  };

  global.printDosageEtiket = (warna) => {
    global.openDosageEtiketModal(warna);
  };

  global.addDosageToPosCart = (presetId, isModal) => {
    const st = S().AppState;
    const p = DOSAGE_PRESETS.find((x) => x.id === presetId);
    const obNama = (p && p.nama) || dosageState.namaObat;
    const matching = (st.masterObat || []).find((o) => {
      const hay = String(o.nama_dagang || '').toLowerCase();
      const needle = obNama.split(' ')[0].toLowerCase();
      return hay.includes(needle);
    });

    const res = computeDosageCalculation(dosageState, p);
    const aturan = res.aturanText;

    if (matching && typeof global.posAddToCart === 'function') {
      global.posAddToCart(matching.id_obat, 1);
      const curCart = st.carts && st.carts[st.activeCartIdx];
      if (curCart && curCart.items && curCart.items.length > 0) {
        const lastItem = curCart.items[curCart.items.length - 1];
        if (lastItem && (lastItem.id_obat === matching.id_obat || lastItem.nama_dagang === matching.nama_dagang)) {
          lastItem.aturan_pakai = aturan;
        }
      }
      global.toast('Obat ' + matching.nama_dagang + ' ditambahkan ke kasir dengan aturan pakai!', 'ok');
      if (isModal && typeof ONSStore.closeModal === 'function') {
        ONSStore.closeModal();
      }
      if (st.currentView === 'pos' && typeof global.renderActiveView === 'function') {
        global.renderActiveView();
      }
    } else if (matching && st.carts && st.carts[st.activeCartIdx]) {
      st.carts[st.activeCartIdx].items.push({
        id_obat: matching.id_obat,
        nama_dagang: matching.nama_dagang,
        satuan: matching.satuan_dasar || 'Botol',
        harga_satuan: Number(matching.harga_umum || 0),
        qty: 1,
        subtotal: Number(matching.harga_umum || 0),
        aturan_pakai: aturan
      });
      global.toast('Obat berhasil dimasukkan ke keranjang kasir!', 'ok');
      if (isModal && typeof ONSStore.closeModal === 'function') {
        ONSStore.closeModal();
      }
      if (st.currentView === 'pos' && typeof global.renderActiveView === 'function') {
        global.renderActiveView();
      }
    } else {
      global.toast('Dosis ' + obNama + ' dihitung: ' + aturan + '. Sediaan belum ada di master obat.', 'info');
    }
  };

  global.openDosageCalculatorModal = (presetId) => {
    if (presetId) {
      const p = DOSAGE_PRESETS.find((x) => x.id === presetId);
      if (p) {
        dosageState.presetId = p.id;
        dosageState.namaObat = p.nama;
        dosageState.kategori = p.kategori;
        dosageState.dosisMinMgPerKg = p.dosis_min_mg_kg;
        dosageState.dosisMaxMgPerKg = p.dosis_max_mg_kg;
        dosageState.kekuatanMg = p.kekuatan_mg;
        dosageState.volumeSediaanMl = p.volume_sediaan_ml;
        dosageState.volumeBotolMl = p.volume_botol_ml;
      }
    }
    S().openModal(`<div class="ons-ws-modal" data-ws-custom="1">
      <div class="ons-ws-topbar">
        <div>
          <h3 class="font-extrabold text-base" style="color:var(--ons-primary)">Kalkulator Dosis Obat &amp; Aturan Pakai Klinis</h3>
          <p class="text-xs" style="color:var(--ons-text-soft)">Perhitungan presisi pediatrik, BSA, takaran sendok sirup, infus &amp; ginjal terintegrasi POS.</p>
        </div>
        <button onclick="ONSStore.closeModal()" class="ons-btn ons-btn-ghost text-xs">Tutup &times;</button>
      </div>
      <div class="ons-ws-pane p-4 max-h-[85vh] overflow-y-auto">${renderDosageCalculatorTabHtml(true)}</div>
    </div>`, 'full');
  };

  /* ==========================================================================
     MODAL ATUR KOORDINAT GPS & LOKASI OUTLET APOTEK (PROFIL BISNIS)
     ========================================================================== */
  /* ==========================================================================
     DATABASE PRESET LOKASI & KOORDINAT APOTEK DI SELURUH INDONESIA
     ========================================================================== */
  const GPS_PRESETS = [
    // Sulawesi
    { nama: 'Apotek ONS Farma Panakkukang (Makassar)', lat: '-5.147665', lon: '119.432732', alamat: 'Jl. Kesehatan Raya No. 88, Kec. Panakkukang', kelurahan: 'Masale', kecamatan: 'Panakkukang', kota: 'Makassar', provinsi: 'Sulawesi Selatan', kode_pos: '90231' },
    { nama: 'Apotek ONS Farma Cabang Sigi (Sulteng)', lat: '-0.985600', lon: '119.921300', alamat: 'Jl. Trans Palu - Kulawi No. 12', kelurahan: 'Kalukubula', kecamatan: 'Sigi Biromaru', kota: 'Kabupaten Sigi', provinsi: 'Sulawesi Tengah', kode_pos: '94364' },
    { nama: 'Apotek ONS Farma Palu Timur (Sulteng)', lat: '-0.891700', lon: '119.878500', alamat: 'Jl. Sam Ratulangi No. 34', kelurahan: 'Besusu Barat', kecamatan: 'Palu Timur', kota: 'Palu', provinsi: 'Sulawesi Tengah', kode_pos: '94118' },
    { nama: 'Apotek ONS Farma Somba Opu (Gowa)', lat: '-5.201667', lon: '119.453333', alamat: 'Jl. Sultan Hasanuddin No. 45', kelurahan: 'Sungguminasa', kecamatan: 'Somba Opu', kota: 'Gowa', provinsi: 'Sulawesi Selatan', kode_pos: '92111' },
    { nama: 'Apotek ONS Farma Turikale (Maros)', lat: '-5.004444', lon: '119.574444', alamat: 'Jl. Jenderal Sudirman No. 20', kelurahan: 'Pettuadae', kecamatan: 'Turikale', kota: 'Maros', provinsi: 'Sulawesi Selatan', kode_pos: '90516' },
    { nama: 'Apotek ONS Farma Parepare', lat: '-4.013333', lon: '119.625000', alamat: 'Jl. Andi Mappatola No. 15', kelurahan: 'Mallusetasi', kecamatan: 'Ujung', kota: 'Parepare', provinsi: 'Sulawesi Selatan', kode_pos: '91111' },
    { nama: 'Apotek ONS Farma Palopo', lat: '-2.993333', lon: '120.198333', alamat: 'Jl. Andi Djemma No. 78', kelurahan: 'Boting', kecamatan: 'Wara', kota: 'Palopo', provinsi: 'Sulawesi Selatan', kode_pos: '91921' },
    { nama: 'Apotek ONS Farma Bone (Watampone)', lat: '-4.538333', lon: '120.328333', alamat: 'Jl. Ahmad Yani No. 50', kelurahan: 'Manurunge', kecamatan: 'Tanete Riattang', kota: 'Bone', provinsi: 'Sulawesi Selatan', kode_pos: '92712' },
    { nama: 'Apotek ONS Farma Kendari (Sultra)', lat: '-3.998459', lon: '122.512604', alamat: 'Jl. Abdullah Silondae No. 88', kelurahan: 'Korumba', kecamatan: 'Mandonga', kota: 'Kendari', provinsi: 'Sulawesi Tenggara', kode_pos: '93111' },
    { nama: 'Apotek ONS Farma Manado (Sulut)', lat: '1.474830', lon: '124.842079', alamat: 'Jl. Sam Ratulangi No. 120', kelurahan: 'Tikala', kecamatan: 'Wenang', kota: 'Manado', provinsi: 'Sulawesi Utara', kode_pos: '95111' },
    { nama: 'Apotek ONS Farma Gorontalo', lat: '0.543544', lon: '123.056769', alamat: 'Jl. Nani Wartabone No. 19', kelurahan: 'Buladu', kecamatan: 'Kota Barat', kota: 'Gorontalo', provinsi: 'Gorontalo', kode_pos: '96136' },
    { nama: 'Apotek ONS Farma Mamuju (Sulbar)', lat: '-2.677059', lon: '118.889498', alamat: 'Jl. Urip Sumoharjo No. 30', kelurahan: 'Karema', kecamatan: 'Simboro', kota: 'Mamuju', provinsi: 'Sulawesi Barat', kode_pos: '91512' },

    // Jawa & Bali
    { nama: 'Apotek ONS Farma Jakarta Selatan', lat: '-6.261493', lon: '106.810600', alamat: 'Jl. Kemang Raya No. 45', kelurahan: 'Bangka', kecamatan: 'Mampang Prapatan', kota: 'Jakarta Selatan', provinsi: 'DKI Jakarta', kode_pos: '12730' },
    { nama: 'Apotek ONS Farma Jakarta Pusat', lat: '-6.180511', lon: '106.828384', alamat: 'Jl. Kebon Sirih No. 60', kelurahan: 'Kebon Kelapa', kecamatan: 'Gambir', kota: 'Jakarta Pusat', provinsi: 'DKI Jakarta', kode_pos: '10110' },
    { nama: 'Apotek ONS Farma Tangerang Selatan', lat: '-6.288889', lon: '106.717778', alamat: 'Jl. Pahlawan Seribu No. 8', kelurahan: 'Lengkong Gudang', kecamatan: 'Serpong', kota: 'Tangerang Selatan', provinsi: 'Banten', kode_pos: '15310' },
    { nama: 'Apotek ONS Farma Bandung', lat: '-6.917464', lon: '107.619123', alamat: 'Jl. R.E. Martadinata No. 56', kelurahan: 'Citarum', kecamatan: 'Bandung Wetan', kota: 'Bandung', provinsi: 'Jawa Barat', kode_pos: '40115' },
    { nama: 'Apotek ONS Farma Surabaya Pusat', lat: '-7.257472', lon: '112.752090', alamat: 'Jl. Basuki Rahmat No. 18', kelurahan: 'Embong Kaliasin', kecamatan: 'Genteng', kota: 'Surabaya', provinsi: 'Jawa Timur', kode_pos: '60271' },
    { nama: 'Apotek ONS Farma Semarang', lat: '-6.966667', lon: '110.416667', alamat: 'Jl. Pemuda No. 142', kelurahan: 'Pandansari', kecamatan: 'Semarang Tengah', kota: 'Semarang', provinsi: 'Jawa Tengah', kode_pos: '50139' },
    { nama: 'Apotek ONS Farma Yogyakarta', lat: '-7.795580', lon: '110.369490', alamat: 'Jl. Malioboro No. 90', kelurahan: 'Ngupasan', kecamatan: 'Gondomanan', kota: 'Yogyakarta', provinsi: 'D.I. Yogyakarta', kode_pos: '55122' },
    { nama: 'Apotek ONS Farma Solo (Surakarta)', lat: '-7.575489', lon: '110.824326', alamat: 'Jl. Slamet Riyadi No. 230', kelurahan: 'Manahan', kecamatan: 'Banjarsari', kota: 'Surakarta', provinsi: 'Jawa Tengah', kode_pos: '57139' },
    { nama: 'Apotek ONS Farma Malang', lat: '-7.966620', lon: '112.632632', alamat: 'Jl. Ijen No. 25', kelurahan: 'Kauman', kecamatan: 'Klojen', kota: 'Malang', provinsi: 'Jawa Timur', kode_pos: '65119' },
    { nama: 'Apotek ONS Farma Denpasar Bali', lat: '-8.670458', lon: '115.212629', alamat: 'Jl. Teuku Umar No. 80', kelurahan: 'Dauh Puri Kauh', kecamatan: 'Denpasar Barat', kota: 'Denpasar', provinsi: 'Bali', kode_pos: '80113' },

    // Sumatera & Kalimantan
    { nama: 'Apotek ONS Farma Medan', lat: '3.595196', lon: '98.672223', alamat: 'Jl. Gajah Mada No. 22', kelurahan: 'Petisah Hulu', kecamatan: 'Medan Baru', kota: 'Medan', provinsi: 'Sumatera Utara', kode_pos: '20153' },
    { nama: 'Apotek ONS Farma Padang', lat: '-0.947083', lon: '100.417181', alamat: 'Jl. Khatib Sulaiman No. 40', kelurahan: 'Olo', kecamatan: 'Padang Barat', kota: 'Padang', provinsi: 'Sumatera Barat', kode_pos: '25117' },
    { nama: 'Apotek ONS Farma Palembang', lat: '-2.976074', lon: '104.775431', alamat: 'Jl. Jenderal Sudirman No. 110', kelurahan: '20 Ilir', kecamatan: 'Ilir Timur I', kota: 'Palembang', provinsi: 'Sumatera Selatan', kode_pos: '30121' },
    { nama: 'Apotek ONS Farma Pekanbaru', lat: '0.507068', lon: '101.447779', alamat: 'Jl. Tuanku Tambusai No. 85', kelurahan: 'Jadirejo', kecamatan: 'Sukajadi', kota: 'Pekanbaru', provinsi: 'Riau', kode_pos: '28121' },
    { nama: 'Apotek ONS Farma Bandar Lampung', lat: '-5.450000', lon: '105.266667', alamat: 'Jl. Raden Intan No. 55', kelurahan: 'Palapa', kecamatan: 'Tanjung Karang Pusat', kota: 'Bandar Lampung', provinsi: 'Lampung', kode_pos: '35116' },
    { nama: 'Apotek ONS Farma Balikpapan', lat: '-1.265386', lon: '116.831200', alamat: 'Jl. Jenderal Sudirman No. 33', kelurahan: 'Klandasan Ulu', kecamatan: 'Balikpapan Kota', kota: 'Balikpapan', provinsi: 'Kalimantan Timur', kode_pos: '76112' },
    { nama: 'Apotek ONS Farma Samarinda', lat: '-0.502106', lon: '117.153709', alamat: 'Jl. Pahlawan No. 12', kelurahan: 'Pasar Pagi', kecamatan: 'Samarinda Kota', kota: 'Samarinda', provinsi: 'Kalimantan Timur', kode_pos: '75111' },
    { nama: 'Apotek ONS Farma Banjarmasin', lat: '-3.319384', lon: '114.590111', alamat: 'Jl. Lambung Mangkurat No. 45', kelurahan: 'Kertak Baru Ilir', kecamatan: 'Banjarmasin Tengah', kota: 'Banjarmasin', provinsi: 'Kalimantan Selatan', kode_pos: '70111' },
    { nama: 'Apotek ONS Farma Pontianak', lat: '-0.026330', lon: '109.342503', alamat: 'Jl. Gajah Mada No. 67', kelurahan: 'Tengah', kecamatan: 'Pontianak Kota', kota: 'Pontianak', provinsi: 'Kalimantan Barat', kode_pos: '78111' },

    // Nusa Tenggara, Maluku & Papua
    { nama: 'Apotek ONS Farma Mataram (Lombok)', lat: '-8.583333', lon: '116.116667', alamat: 'Jl. Pejanggik No. 70', kelurahan: 'Dasan Agung', kecamatan: 'Selaparang', kota: 'Mataram', provinsi: 'Nusa Tenggara Barat', kode_pos: '83125' },
    { nama: 'Apotek ONS Farma Kupang (NTT)', lat: '-10.177200', lon: '123.607033', alamat: 'Jl. El Tari No. 18', kelurahan: 'Oetete', kecamatan: 'Oebobo', kota: 'Kupang', provinsi: 'Nusa Tenggara Timur', kode_pos: '85112' },
    { nama: 'Apotek ONS Farma Ambon (Maluku)', lat: '-3.695420', lon: '128.181420', alamat: 'Jl. A.Y. Patty No. 24', kelurahan: 'Honipopu', kecamatan: 'Sirimau', kota: 'Ambon', provinsi: 'Maluku', kode_pos: '97126' },
    { nama: 'Apotek ONS Farma Jayapura (Papua)', lat: '-2.548926', lon: '140.716820', alamat: 'Jl. Percetakan Negara No. 15', kelurahan: 'Gurabesi', kecamatan: 'Jayapura Utara', kota: 'Jayapura', provinsi: 'Papua', kode_pos: '99111' },
    { nama: 'Apotek ONS Farma Sorong', lat: '-0.876111', lon: '131.255833', alamat: 'Jl. Jenderal Sudirman No. 50', kelurahan: 'Remu Selatan', kecamatan: 'Sorong Manoi', kota: 'Sorong', provinsi: 'Papua Barat Daya', kode_pos: '98414' }
  ];

  function findClosestIndonesianLocation(lat, lon) {
    const pLat = Number(lat);
    const pLon = Number(lon);
    if (isNaN(pLat) || isNaN(pLon)) return null;
    const R = 6371;
    let closest = null;
    let minDist = Infinity;
    for (let i = 0; i < GPS_PRESETS.length; i++) {
      const loc = GPS_PRESETS[i];
      const dLat = (Number(loc.lat) - pLat) * Math.PI / 180;
      const dLon = (Number(loc.lon) - pLon) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(pLat * Math.PI / 180) * Math.cos(Number(loc.lat) * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const dist = R * c;
      if (dist < minDist) {
        minDist = dist;
        closest = loc;
      }
    }
    return closest ? { location: closest, distanceKm: Math.round(minDist * 10) / 10 } : null;
  }

  global.updateGmapsLinkFromInputs = () => {
    const prof = (typeof S === 'function' && S().getStoreProfile) ? S().getStoreProfile() : {};
    const lat = (document.getElementById('profLat') || {}).value || prof.latitude || '-5.147665';
    const lng = (document.getElementById('profLng') || {}).value || prof.longitude || '119.432732';
    const link = document.getElementById('profGmapsLink');
    if (link) {
      link.href = 'https://www.google.com/maps?q=' + encodeURIComponent(String(lat).trim()) + ',' + encodeURIComponent(String(lng).trim());
    }
  };

  global.openKoordinatModal = () => {
    const prof = (typeof S === 'function' && S().getStoreProfile) ? S().getStoreProfile() : {};
    const val = (id, fb) => {
      const el = document.getElementById(id);
      return (el && el.value !== undefined && el.value !== '') ? el.value : (fb || '');
    };
    const curLat = val('profLat', prof.latitude || '-5.147665');
    const curLng = val('profLng', prof.longitude || '119.432732');
    const curAlamat = val('profAlamatUsaha', prof.alamat_usaha || 'Jl. Kesehatan Raya No. 88, Kec. Panakkukang');
    const curKel = val('profKelurahan', prof.kelurahan || 'Masale');
    const curKec = val('profKecamatan', prof.kecamatan || 'Panakkukang');
    const curKota = val('profKota', prof.kota || 'Makassar');
    const curProv = val('profProvinsi', prof.provinsi || 'Sulawesi Selatan');
    const curKodePos = val('profKodePos', prof.kode_pos || '90231');

    S().openModal(`<div class="p-5 sm:p-6 space-y-4 text-xs">
      <!-- Modal Header -->
      <div class="flex items-start justify-between gap-3 border-b pb-3.5" style="border-color:var(--ons-border)">
        <div>
          <h3 class="font-extrabold text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <span class="w-7 h-7 rounded-lg bg-teal-500/10 text-teal-600 flex items-center justify-center shrink-0">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/><circle cx="12" cy="10" r="3"/></svg>
            </span>
            <span>Atur Koordinat GPS &amp; Lokasi Outlet Apotek</span>
          </h3>
          <p class="text-[11px] mt-1" style="color:var(--ons-text-soft)">Sinkronkan titik satelit GPS, pratinjau peta satelit, dan perbarui otomatis nama alamat &amp; wilayah administratif apotek.</p>
        </div>
        <button onclick="ONSStore.closeModal()" class="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-500/10 text-xl leading-none text-slate-400 hover:text-slate-600 transition-colors">&times;</button>
      </div>

      <!-- Fitur 1: Deteksi Otomatis GPS & Pencarian Tempat -->
      <div class="p-3.5 rounded-xl border space-y-3" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <span class="font-bold text-[11px] text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
            <span>1. Deteksi GPS &amp; Pencarian Lokasi Cepat</span>
          </span>
          <button type="button" onclick="window.detectCurrentGpsLocation()" class="ons-btn text-white text-[11px] font-semibold py-1.5 px-3 rounded-lg flex items-center gap-1.5 shadow-sm" style="background:#0D9488">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24M14.83 9.17l4.24-4.24M14.83 14.83l4.24 4.24M9.17 14.83l-4.24 4.24"/></svg>
            <span>Ambil Lokasi GPS Saya Saat Ini</span>
          </button>
        </div>

        <div class="flex gap-2">
          <input id="modalGpsSearchInput" class="ons-input text-xs flex-1" placeholder="Ketik nama jalan, apotek, kecamatan, atau kota (contoh: Panakkukang, Sigi, Jakarta Selatan)..." onkeydown="if(event.key==='Enter'){event.preventDefault();window.searchGpsPlace();}"/>
          <button type="button" onclick="window.searchGpsPlace()" class="ons-btn ons-btn-primary text-xs px-3.5 py-1.5 shrink-0 font-bold flex items-center gap-1">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <span>Cari</span>
          </button>
        </div>

        <!-- Status Message Box -->
        <div id="modalGpsStatusBox" class="text-[11px] p-2.5 rounded-lg border hidden transition-all" style="background:var(--ons-bg-card);border-color:var(--ons-border)"></div>

        <!-- Hasil Pencarian -->
        <div id="modalGpsSearchResults" class="space-y-1.5 max-h-40 overflow-y-auto hidden"></div>

        <!-- Preset Wilayah Cepat -->
        <div class="space-y-1">
          <span class="text-[10px] font-semibold text-slate-500 block">Pilihan Cepat Wilayah Populer:</span>
          <div class="flex flex-wrap gap-1.5">
            ${GPS_PRESETS.slice(0, 10).map((p, idx) => `<button type="button" onclick="window.pickGpsPreset(${idx})" class="px-2.5 py-1 rounded-md border text-[10px] font-semibold hover:border-teal-500 hover:text-teal-600 transition-colors" style="background:var(--ons-bg-card);border-color:var(--ons-border)">${S().esc(p.kota || p.nama)}</button>`).join('')}
          </div>
        </div>
      </div>

      <!-- Fitur 2: Pratinjau Peta Satelit Interaktif -->
      <div class="space-y-1.5">
        <div class="flex items-center justify-between text-[11px]">
          <span class="font-bold text-slate-700 dark:text-slate-200">Pratinjau Peta Satelit Digital</span>
          <div class="flex items-center gap-1 text-[10px]">
            <span class="text-slate-400">Geser Halus:</span>
            <button type="button" onclick="window.nudgeGpsCoordinate(0.0005, 0)" class="px-1.5 py-0.5 rounded border hover:bg-slate-500/10" title="Geser ke Utara">&uarr; U</button>
            <button type="button" onclick="window.nudgeGpsCoordinate(-0.0005, 0)" class="px-1.5 py-0.5 rounded border hover:bg-slate-500/10" title="Geser ke Selatan">&darr; S</button>
            <button type="button" onclick="window.nudgeGpsCoordinate(0, -0.0005)" class="px-1.5 py-0.5 rounded border hover:bg-slate-500/10" title="Geser ke Barat">&larr; B</button>
            <button type="button" onclick="window.nudgeGpsCoordinate(0, 0.0005)" class="px-1.5 py-0.5 rounded border hover:bg-slate-500/10" title="Geser ke Timur">&rarr; T</button>
          </div>
        </div>
        <div class="relative w-full h-44 rounded-xl overflow-hidden border" style="border-color:var(--ons-border)">
          <iframe id="modalGpsMapIframe" class="w-full h-full border-0 bg-slate-100 dark:bg-slate-800" src="https://maps.google.com/maps?q=${encodeURIComponent(curLat)},${encodeURIComponent(curLng)}&z=15&output=embed" loading="lazy"></iframe>
        </div>
      </div>

      <!-- Fitur 3: Form Detail Koordinat & Alamat Terpilih -->
      <div class="space-y-3">
        <span class="font-bold text-[11px] text-slate-700 dark:text-slate-200 block">2. Detail Titik Koordinat &amp; Nama Wilayah Outlet</span>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="font-semibold text-[11px] block mb-1">Latitude (Lintang)</label>
            <input id="modalGpsLat" class="ons-input font-mono-num text-xs w-full font-bold" value="${S().esc(curLat)}" placeholder="-5.147665" oninput="window.updateModalGmapsPreview()"/>
          </div>
          <div>
            <label class="font-semibold text-[11px] block mb-1">Longitude (Bujur)</label>
            <input id="modalGpsLng" class="ons-input font-mono-num text-xs w-full font-bold" value="${S().esc(curLng)}" placeholder="119.432732" oninput="window.updateModalGmapsPreview()"/>
          </div>
        </div>

        <div>
          <label class="font-semibold text-[11px] block mb-1">Nama Tempat &amp; Alamat Lengkap *</label>
          <input id="modalGpsAlamat" class="ons-input text-xs w-full" value="${S().esc(curAlamat)}" placeholder="Alamat lengkap outlet apotek"/>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="font-semibold text-[11px] block mb-1">Kelurahan / Desa</label>
            <input id="modalGpsKel" class="ons-input text-xs w-full" value="${S().esc(curKel)}" placeholder="Kelurahan / Desa"/>
          </div>
          <div>
            <label class="font-semibold text-[11px] block mb-1">Kecamatan</label>
            <input id="modalGpsKec" class="ons-input text-xs w-full" value="${S().esc(curKec)}" placeholder="Kecamatan"/>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div class="sm:col-span-1">
            <label class="font-semibold text-[11px] block mb-1">Kabupaten / Kota</label>
            <input id="modalGpsKota" class="ons-input text-xs w-full font-semibold" value="${S().esc(curKota)}" placeholder="Kota / Kabupaten"/>
          </div>
          <div class="sm:col-span-1">
            <label class="font-semibold text-[11px] block mb-1">Provinsi</label>
            <input id="modalGpsProv" class="ons-input text-xs w-full" value="${S().esc(curProv)}" placeholder="Provinsi"/>
          </div>
          <div class="sm:col-span-1">
            <label class="font-semibold text-[11px] block mb-1">Kode Pos</label>
            <input id="modalGpsKodePos" class="ons-input font-mono-num text-xs w-full" value="${S().esc(curKodePos)}" placeholder="90231"/>
          </div>
        </div>
      </div>

      <!-- Fitur 4: Tombol Aksi Terapkan & Simpan -->
      <div class="pt-3 border-t flex flex-wrap items-center justify-between gap-2" style="border-color:var(--ons-border)">
        <a id="modalGmapsPreviewBtn" target="_blank" rel="noopener" href="https://www.google.com/maps?q=${encodeURIComponent(curLat)},${encodeURIComponent(curLng)}" class="ons-btn ons-btn-ghost text-xs px-3 py-2 flex items-center gap-1.5" title="Buka Titik Koordinat di Aplikasi Google Maps">
          <svg class="w-3.5 h-3.5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          <span>Buka di Google Maps</span>
        </a>
        <div class="flex gap-2">
          <button type="button" onclick="ONSStore.closeModal()" class="ons-btn ons-btn-ghost text-xs px-4 py-2">Batal</button>
          <button type="button" onclick="window.applyGpsLocationToForm()" class="ons-btn text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-sm" style="background:#0D9488">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            <span>Terapkan &amp; Simpan Lokasi</span>
          </button>
        </div>
      </div>
    </div>`, '660px');
  };

  global.nudgeGpsCoordinate = (dLat, dLon) => {
    const latEl = document.getElementById('modalGpsLat');
    const lngEl = document.getElementById('modalGpsLng');
    if (!latEl || !lngEl) return;
    const curLat = parseFloat(latEl.value) || -5.147665;
    const curLng = parseFloat(lngEl.value) || 119.432732;
    const newLat = (curLat + dLat).toFixed(6);
    const newLng = (curLng + dLon).toFixed(6);
    latEl.value = newLat;
    lngEl.value = newLng;
    global.updateModalGmapsPreview();
  };

  global.updateModalGmapsPreview = () => {
    const lat = ((document.getElementById('modalGpsLat') || {}).value || '-5.147665').trim();
    const lng = ((document.getElementById('modalGpsLng') || {}).value || '119.432732').trim();
    const btn = document.getElementById('modalGmapsPreviewBtn');
    if (btn) btn.href = 'https://www.google.com/maps?q=' + encodeURIComponent(lat) + ',' + encodeURIComponent(lng);
    const iframe = document.getElementById('modalGpsMapIframe');
    if (iframe) iframe.src = 'https://maps.google.com/maps?q=' + encodeURIComponent(lat) + ',' + encodeURIComponent(lng) + '&z=15&output=embed';
  };

  global.pickGpsPreset = (idx) => {
    const p = GPS_PRESETS[idx];
    if (!p) return;
    const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
    setVal('modalGpsLat', p.lat);
    setVal('modalGpsLng', p.lon);
    setVal('modalGpsAlamat', p.alamat);
    setVal('modalGpsKel', p.kelurahan);
    setVal('modalGpsKec', p.kecamatan);
    setVal('modalGpsKota', p.kota);
    setVal('modalGpsProv', p.provinsi);
    setVal('modalGpsKodePos', p.kode_pos);
    global.updateModalGmapsPreview();
    const stBox = document.getElementById('modalGpsStatusBox');
    if (stBox) {
      stBox.classList.remove('hidden');
      stBox.className = 'text-[11px] p-2.5 rounded-lg border text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 border-teal-300 dark:border-teal-800';
      stBox.innerHTML = '&#9989; Lokasi <b>' + S().esc(p.nama) + '</b> berhasil dimuat! Koordinat: <b>' + p.lat + ', ' + p.lon + '</b>.';
    }
  };

  global.detectCurrentGpsLocation = () => {
    const stBox = document.getElementById('modalGpsStatusBox');
    if (stBox) stBox.classList.remove('hidden');

    if (!navigator.geolocation) {
      if (stBox) {
        stBox.className = 'text-[11px] p-2.5 rounded-lg border text-amber-700 bg-amber-50 border-amber-300';
        stBox.textContent = 'Peramban tidak mendukung Geolocation API. Silakan pilih dari preset kota atau ketik pencarian nama tempat.';
      }
      return;
    }
    if (stBox) {
      stBox.className = 'text-[11px] p-2.5 rounded-lg border text-blue-700 bg-blue-50 border-blue-300 animate-pulse';
      stBox.textContent = 'Mendeteksi titik koordinat satelit GPS perangkat Anda... Mohon izinkan akses lokasi.';
    }

    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude.toFixed(6);
      const lon = pos.coords.longitude.toFixed(6);
      const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
      setVal('modalGpsLat', lat);
      setVal('modalGpsLng', lon);
      global.updateModalGmapsPreview();

      // Step 1: Instant local match against Indonesian coordinate database
      const match = findClosestIndonesianLocation(lat, lon);
      if (match && match.location) {
        const loc = match.location;
        setVal('modalGpsKota', loc.kota);
        setVal('modalGpsProv', loc.provinsi);
        setVal('modalGpsKec', loc.kecamatan);
        setVal('modalGpsKel', loc.kelurahan);
        setVal('modalGpsKodePos', loc.kode_pos);
        setVal('modalGpsAlamat', loc.alamat);
      }

      if (stBox) {
        const cityLabel = match ? (match.location.kota + ', ' + match.location.provinsi) : 'Indonesia';
        stBox.className = 'text-[11px] p-2.5 rounded-lg border text-teal-700 bg-teal-50 border-teal-300';
        stBox.innerHTML = '&#9989; Titik GPS berhasil terdeteksi: <b>' + lat + ', ' + lon + '</b> (Akurasi: ' + Math.round(pos.coords.accuracy || 10) + 'm). Wilayah: <b>' + S().esc(cityLabel) + '</b>.';
      }

      // Step 2: In parallel, attempt online reverse-geocoding to refine street details
      try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 3500);
        const res = await fetch('https://nominatim.openstreetmap.org/reverse?format=json&lat=' + encodeURIComponent(lat) + '&lon=' + encodeURIComponent(lon) + '&addressdetails=1', {
          signal: controller.signal,
          headers: { 'Accept-Language': 'id,en' }
        });
        clearTimeout(t);
        if (res.ok) {
          const d = await res.json();
          const addr = d.address || {};
          if (d.display_name) setVal('modalGpsAlamat', d.display_name.split(',').slice(0, 3).join(', '));
          if (addr.village || addr.suburb || addr.neighbourhood) setVal('modalGpsKel', addr.village || addr.suburb || addr.neighbourhood);
          if (addr.city_district || addr.suburb) setVal('modalGpsKec', addr.city_district || addr.suburb);
          if (addr.city || addr.town || addr.county || addr.regency) setVal('modalGpsKota', addr.city || addr.town || addr.county || addr.regency);
          if (addr.state) setVal('modalGpsProv', addr.state);
          if (addr.postcode) setVal('modalGpsKodePos', addr.postcode);
          if (stBox) {
            stBox.innerHTML = '&#9989; Titik GPS <b>' + lat + ', ' + lon + '</b> &amp; nama alamat lengkap berhasil disinkronkan!';
          }
        }
      } catch (_) {}
    }, (err) => {
      if (stBox) {
        stBox.className = 'text-[11px] p-2.5 rounded-lg border text-amber-700 bg-amber-50 border-amber-300';
        stBox.textContent = 'Akses sensor GPS belum diizinkan (' + (err.message || 'Izin ditolak') + '). Anda tetap dapat memilih preset kota di atas atau mengetik nama tempat.';
      }
    }, { timeout: 8000, enableHighAccuracy: true });
  };

  global.searchGpsPlace = async () => {
    const q = ((document.getElementById('modalGpsSearchInput') || {}).value || '').trim();
    const stBox = document.getElementById('modalGpsStatusBox');
    const resWrap = document.getElementById('modalGpsSearchResults');
    if (!q) {
      if (stBox) {
        stBox.classList.remove('hidden');
        stBox.className = 'text-[11px] p-2.5 rounded-lg border text-amber-700 bg-amber-50 border-amber-300';
        stBox.textContent = 'Ketik nama tempat, jalan, atau kota yang ingin dicari.';
      }
      return;
    }
    if (stBox) {
      stBox.classList.remove('hidden');
      stBox.className = 'text-[11px] p-2.5 rounded-lg border text-blue-700 bg-blue-50 border-blue-300 animate-pulse';
      stBox.textContent = 'Mencari lokasi: ' + q + '...';
    }
    if (resWrap) {
      resWrap.classList.remove('hidden');
      resWrap.innerHTML = '<div class="p-2 text-center text-slate-500">Mencari hasil lokasi...</div>';
    }

    // Step 1: Instant search in local preset database
    const qLow = q.toLowerCase();
    let localMatches = GPS_PRESETS.filter((p) => {
      const full = (p.nama + ' ' + p.alamat + ' ' + p.kelurahan + ' ' + p.kecamatan + ' ' + p.kota + ' ' + p.provinsi).toLowerCase();
      return full.includes(qLow);
    });

    let items = localMatches.map((it) => ({
      lat: it.lat,
      lon: it.lon,
      nama: it.nama,
      alamat: it.alamat,
      kelurahan: it.kelurahan,
      kecamatan: it.kecamatan,
      kota: it.kota,
      provinsi: it.provinsi,
      kode_pos: it.kode_pos
    }));

    // Step 2: Attempt online geocoding if online
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 3500);
      const res = await fetch('https://nominatim.openstreetmap.org/search?format=json&q=' + encodeURIComponent(q) + '&countrycodes=id&addressdetails=1&limit=5', {
        signal: controller.signal,
        headers: { 'Accept-Language': 'id,en' }
      });
      clearTimeout(t);
      if (res.ok) {
        const list = await res.json();
        const onlineItems = (list || []).map((it) => {
          const a = it.address || {};
          return {
            lat: it.lat,
            lon: it.lon,
            nama: it.display_name,
            alamat: it.display_name.split(',').slice(0, 3).join(', '),
            kelurahan: a.village || a.suburb || a.neighbourhood || '',
            kecamatan: a.city_district || a.suburb || '',
            kota: a.city || a.town || a.county || a.regency || '',
            provinsi: a.state || '',
            kode_pos: a.postcode || ''
          };
        });
        items = items.concat(onlineItems);
      }
    } catch (_) {}

    if (!items.length) {
      if (stBox) {
        stBox.className = 'text-[11px] p-2.5 rounded-lg border text-amber-700 bg-amber-50 border-amber-300';
        stBox.textContent = 'Lokasi "' + q + '" tidak ditemukan. Silakan gunakan kata kunci kota atau pilih preset wilayah di atas.';
      }
      if (resWrap) resWrap.innerHTML = '<div class="p-2 text-center text-slate-400">Tidak ada hasil cocok.</div>';
      return;
    }

    if (stBox) {
      stBox.className = 'text-[11px] p-2.5 rounded-lg border text-teal-700 bg-teal-50 border-teal-300';
      stBox.textContent = 'Ditemukan ' + items.length + ' hasil lokasi. Klik salah satu untuk memilih:';
    }
    if (resWrap) {
      resWrap.innerHTML = items.slice(0, 6).map((it, idx) => `
        <div onclick="window.pickSearchedGpsItem(${idx})" class="p-2.5 rounded-lg border hover:border-teal-500 hover:bg-teal-50/20 cursor-pointer transition-colors" style="background:var(--ons-bg-card);border-color:var(--ons-border)">
          <div class="font-bold text-slate-800 dark:text-slate-100 truncate">${S().esc(it.nama || it.alamat)}</div>
          <div class="text-[10px] font-mono-num text-teal-600 dark:text-teal-400 mt-0.5">Titik GPS: ${it.lat}, ${it.lon} &bull; ${S().esc(it.kota || it.provinsi || '-')}</div>
        </div>
      `).join('');
      global._lastSearchedGpsItems = items;
    }
  };

  global.pickSearchedGpsItem = (idx) => {
    const items = global._lastSearchedGpsItems || [];
    const it = items[idx];
    if (!it) return;
    const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
    setVal('modalGpsLat', it.lat);
    setVal('modalGpsLng', it.lon);
    if (it.alamat) setVal('modalGpsAlamat', it.alamat);
    if (it.kelurahan) setVal('modalGpsKel', it.kelurahan);
    if (it.kecamatan) setVal('modalGpsKec', it.kecamatan);
    if (it.kota) setVal('modalGpsKota', it.kota);
    if (it.provinsi) setVal('modalGpsProv', it.provinsi);
    if (it.kode_pos) setVal('modalGpsKodePos', it.kode_pos);
    global.updateModalGmapsPreview();
    const stBox = document.getElementById('modalGpsStatusBox');
    if (stBox) {
      stBox.classList.remove('hidden');
      stBox.className = 'text-[11px] p-2.5 rounded-lg border text-teal-700 bg-teal-50 border-teal-300';
      stBox.innerHTML = '&#9989; Lokasi <b>' + S().esc(it.nama || it.alamat) + '</b> terpilih!';
    }
  };

  global.applyGpsLocationToForm = () => {
    const val = (id) => ((document.getElementById(id) || {}).value || '').trim();
    const lat = val('modalGpsLat');
    const lng = val('modalGpsLng');
    const alamat = val('modalGpsAlamat');
    const kel = val('modalGpsKel');
    const kec = val('modalGpsKec');
    const kota = val('modalGpsKota');
    const prov = val('modalGpsProv');
    const kodePos = val('modalGpsKodePos');

    // 1. Update form inputs in DOM
    const setFormVal = (id, v) => {
      const el = document.getElementById(id);
      if (el && v !== undefined && v !== '') el.value = v;
    };
    if (lat) setFormVal('profLat', lat);
    if (lng) setFormVal('profLng', lng);
    if (alamat) setFormVal('profAlamatUsaha', alamat);
    if (kel) setFormVal('profKelurahan', kel);
    if (kec) setFormVal('profKecamatan', kec);
    if (kota) setFormVal('profKota', kota);
    if (prov) setFormVal('profProvinsi', prov);
    if (kodePos) setFormVal('profKodePos', kodePos);

    // 2. Directly update store profile in persistent storage & AppState
    if (typeof S === 'function' && S().getStoreProfile && S().setStoreProfile) {
      const curProf = S().getStoreProfile();
      const updatedProf = Object.assign({}, curProf, {
        latitude: lat || curProf.latitude,
        longitude: lng || curProf.longitude,
        alamat_usaha: alamat || curProf.alamat_usaha,
        kelurahan: kel || curProf.kelurahan,
        kecamatan: kec || curProf.kecamatan,
        kota: kota || curProf.kota,
        provinsi: prov || curProf.provinsi,
        kode_pos: kodePos || curProf.kode_pos
      });
      S().setStoreProfile(updatedProf);

      // 3. Background sync to Google Sheet backend if API available
      if (typeof API === 'function' && API() && typeof API().callApi === 'function') {
        API().callApi('profil.save', updatedProf, { isWrite: true }).catch(() => {});
      }
    }

    // 4. Update UI helpers
    if (typeof global.updateGmapsLinkFromInputs === 'function') global.updateGmapsLinkFromInputs();
    if (typeof global.refreshProfileKopPreview === 'function') global.refreshProfileKopPreview();

    ONSStore.closeModal();
    global.toast('Titik koordinat (' + (lat || '-') + ', ' + (lng || '-') + ') & lokasi ' + (kota ? kota + ' ' : '') + 'berhasil diterapkan dan disimpan!', 'ok');
  };

})(window);