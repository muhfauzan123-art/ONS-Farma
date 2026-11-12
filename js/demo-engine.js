/**
 * ONS FARMA DIGITAL ENTERPRISE v10.0 - Local Stateful Sandbox / Demo Engine
 * Memungkinkan seluruh fitur PRD, POS FEFO, Recall, Klinis, Tagihan & Doc Engine
 * berjalan 100% interaktif di browser secara instan (<10ms) sebelum/saat GAS_URL dihubungkan,
 * sekaligus tetap menegakkan aturan RBAC & masking HPP identik dengan backend GAS.
 */
(function (global) {
  'use strict';

  const STORAGE_KEY = 'ons_farma_v10_demo_db';
  const toLocalYmd = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  const today = new Date();
  const isoToday = toLocalYmd(today);
  const addDays = (n) => toLocalYmd(new Date(today.getFullYear(), today.getMonth(), today.getDate() + Number(n || 0)));

  function defaultProfilUsaha() {
    return {
      cabang_id: 'ONS-01',
      nama_pemilik: 'apt. Anissa Faradifa R. Is Rumi',
      jabatan_pemilik: 'Pemilik Sarana Apotek & Apoteker',
      sipa_pemilik: '19920412/SIPA_35.78/2025/1042',
      stra_pemilik: '19920412/STRA-14102029/1042',
      wa_pemilik: '0811-0000-990',
      email_pemilik: 'anissa@onsfarma.id',
      npwp_pemilik: '09.254.294.3-805.000',
      foto_pemilik_url: '',
      nama_usaha: 'Apotek ONS Farma',
      no_sia: '449/SIA-DPMPTSP/2025/0088',
      nib_oss: '9120208142915',
      npwp_usaha: '85.112.409.1-805.000',
      status_pkp: 'PKP (PPN 11%)',
      alamat_usaha: 'Jl. Kesehatan Raya No. 88, Kec. Panakkukang',
      kota: 'Makassar',
      kode_pos: '90231',
      telepon_usaha: '0411-458-990',
      wa_usaha: '628110000990',
      email_usaha: 'halo@onsfarma.id',
      jam_operasional: 'Setiap Hari 07:30 - 22:00 WITA',
      zona_waktu: 'Asia/Makassar (WITA)',
      logo_usaha_url: './icons/ons-farma-app-icon.png',
      terkonfirmasi: 'YA',
      dikonfirmasi_oleh: 'apt. Anissa Faradifa R. Is Rumi',
      dikonfirmasi_pada: isoToday,
      updated_at: isoToday + 'T08:00:00Z'
    };
  }

  function buildSeedDb() {
    return {
      epoch: 1,
      profil_usaha: defaultProfilUsaha(),
      secrets: {
        FONNTE_TOKEN: 'fnt_••••••89a',
        SATUSEHAT_CLIENT_ID: 'ss_c••••••210',
        SATUSEHAT_CLIENT_SECRET: 'ss_s••••••f7c',
        SATUSEHAT_ORG_ID: '1000••••••982',
        WA_OWNER_TARGET: '6281••••••990',
        ADMIN_EMAIL: 'anissa@onsfarma.id',
        QRIS_MERCHANT_NMID: 'ID10••••••001',
        DE_VERIFY_URL_BASE: './index.html'
      },
      users: [
        { id_user: 'USR-001', username: 'pemilik', nama_lengkap: 'apt. Anissa Faradifa R. Is Rumi', role: 'Pemilik', cabang_id: 'ONS-01', no_sipa: '19920412/SIPA_35.78/2025/1042', masa_berlaku_sipa: '2029-12-31', status_aktif: 'AKTIF' },
        { id_user: 'USR-002', username: 'apj', nama_lengkap: 'apt. Siti Rahma, S.Farm', role: 'APJ', cabang_id: 'ONS-01', no_sipa: '19920412/SIPA_35.78/2025/1042', masa_berlaku_sipa: '2029-12-31', status_aktif: 'AKTIF' },
        { id_user: 'USR-003', username: 'kasir', nama_lengkap: 'Budi Santoso (Kasir)', role: 'Kasir', cabang_id: 'ONS-01', no_sipa: '-', masa_berlaku_sipa: '-', status_aktif: 'AKTIF' }
      ],
      master_obat: [
        { id_obat: 'OBT-001', kode_kfa: '93001024', nama_dagang: 'Amoxicillin Trihydrate 500mg', zat_aktif: 'Amoxicillin', kekuatan: '500 mg', golongan_bpom: 'KERAS', bentuk_sediaan: 'Kaplet', nie_bpom: 'GKL9805024104A1', suhu_simpan: 'Suhu Ruang (15-25°C)', rak_lokasi: 'RAK-K1', satuan_dasar: 'Kaplet', satuan_sedang: 'Strip', rasio_sedang: 10, satuan_besar: 'Box', rasio_besar: 100, stok_min: 50, stok_max: 500, hpp_avg: 480, hpp_terakhir: 500, harga_umum: 900, harga_member: 800, harga_grosir: 700, min_qty_grosir: 20, harga_faskes: 650, pbf_utama: 'PT Bina San Prima', status_aktif: 'AKTIF', substitusi_ids: 'OBT-005' },
        { id_obat: 'OBT-002', kode_kfa: '93002110', nama_dagang: 'Paracetamol Sanmol 500mg', zat_aktif: 'Paracetamol', kekuatan: '500 mg', golongan_bpom: 'BEBAS', bentuk_sediaan: 'Tablet', nie_bpom: 'DBL7622235610A1', suhu_simpan: 'Suhu Ruang (15-25°C)', rak_lokasi: 'RAK-B1', satuan_dasar: 'Tablet', satuan_sedang: 'Strip', rasio_sedang: 4, satuan_besar: 'Box', rasio_besar: 100, stok_min: 80, stok_max: 600, hpp_avg: 320, hpp_terakhir: 340, harga_umum: 650, harga_member: 600, harga_grosir: 520, min_qty_grosir: 20, harga_faskes: 480, pbf_utama: 'PT Enseval Putera', status_aktif: 'AKTIF', substitusi_ids: 'OBT-006' },
        { id_obat: 'OBT-003', kode_kfa: '93004409', nama_dagang: 'Lantus SoloStar Insulin Pen', zat_aktif: 'Insulin Glargine', kekuatan: '100 IU/mL', golongan_bpom: 'KERAS', bentuk_sediaan: 'Injeksi Pen', nie_bpom: 'DKI0185200243A1', suhu_simpan: 'Cold Chain (2-8°C)', rak_lokasi: 'CHILLER-01', satuan_dasar: 'Pen', satuan_sedang: 'Box Isi 5', rasio_sedang: 5, satuan_besar: 'Karton', rasio_besar: 25, stok_min: 10, stok_max: 40, hpp_avg: 118000, hpp_terakhir: 120000, harga_umum: 148000, harga_member: 142000, harga_grosir: 136000, min_qty_grosir: 5, harga_faskes: 132000, pbf_utama: 'PT Anugrah Argon Medika', status_aktif: 'AKTIF', substitusi_ids: '' },
        { id_obat: 'OBT-004', kode_kfa: '93007721', nama_dagang: 'Rhinos SR Kapsul Lepas Lambat', zat_aktif: 'Loratadine + Pseudoephedrine', kekuatan: '5mg/120mg', golongan_bpom: 'PREKURSOR', bentuk_sediaan: 'Kapsul SR', nie_bpom: 'DKL9905028403A1', suhu_simpan: 'Suhu Ruang (15-25°C)', rak_lokasi: 'LEMARI-PRE', satuan_dasar: 'Kapsul', satuan_sedang: 'Strip', rasio_sedang: 10, satuan_besar: 'Box', rasio_besar: 50, stok_min: 20, stok_max: 150, hpp_avg: 7800, hpp_terakhir: 8000, harga_umum: 11500, harga_member: 10800, harga_grosir: 9800, min_qty_grosir: 10, harga_faskes: 9200, pbf_utama: 'PT Dexa Medica Dist', status_aktif: 'AKTIF', substitusi_ids: 'OBT-007' },
        { id_obat: 'OBT-005', kode_kfa: '93001089', nama_dagang: 'Cefadroxil Monohydrate 500mg', zat_aktif: 'Cefadroxil', kekuatan: '500 mg', golongan_bpom: 'KERAS', bentuk_sediaan: 'Kapsul', nie_bpom: 'GKL0105031101A1', suhu_simpan: 'Suhu Ruang (15-25°C)', rak_lokasi: 'RAK-K2', satuan_dasar: 'Kapsul', satuan_sedang: 'Strip', rasio_sedang: 10, satuan_besar: 'Box', rasio_besar: 100, stok_min: 40, stok_max: 300, hpp_avg: 1150, hpp_terakhir: 1200, harga_umum: 1950, harga_member: 1800, harga_grosir: 1650, min_qty_grosir: 20, harga_faskes: 1550, pbf_utama: 'PT Bina San Prima', status_aktif: 'AKTIF', substitusi_ids: 'OBT-001' },
        { id_obat: 'OBT-006', kode_kfa: '93002914', nama_dagang: 'Ibuprofen Proris 400mg', zat_aktif: 'Ibuprofen', kekuatan: '400 mg', golongan_bpom: 'TERBATAS', bentuk_sediaan: 'Kaplet', nie_bpom: 'DTL9921620604B1', suhu_simpan: 'Suhu Ruang (15-25°C)', rak_lokasi: 'RAK-T1', satuan_dasar: 'Kaplet', satuan_sedang: 'Strip', rasio_sedang: 10, satuan_besar: 'Box', rasio_besar: 100, stok_min: 40, stok_max: 250, hpp_avg: 890, hpp_terakhir: 920, harga_umum: 1600, harga_member: 1450, harga_grosir: 1350, min_qty_grosir: 20, harga_faskes: 1250, pbf_utama: 'PT Enseval Putera', status_aktif: 'AKTIF', substitusi_ids: 'OBT-002' },
        { id_obat: 'OBT-007', kode_kfa: '93005112', nama_dagang: 'Amlodipine Besylate 10mg PRB', zat_aktif: 'Amlodipine', kekuatan: '10 mg', golongan_bpom: 'KERAS', bentuk_sediaan: 'Tablet', nie_bpom: 'GKL1205046510B1', suhu_simpan: 'Suhu Ruang (15-25°C)', rak_lokasi: 'RAK-PRB', satuan_dasar: 'Tablet', satuan_sedang: 'Strip', rasio_sedang: 10, satuan_besar: 'Box', rasio_besar: 30, stok_min: 90, stok_max: 600, hpp_avg: 410, hpp_terakhir: 420, harga_umum: 850, harga_member: 750, harga_grosir: 650, min_qty_grosir: 30, harga_faskes: 600, pbf_utama: 'PT Kimia Farma Trading', status_aktif: 'AKTIF', substitusi_ids: '' },
        { id_obat: 'OBT-008', kode_kfa: '93009901', nama_dagang: 'Codeine Phosphate 10mg (Kimia Farma)', zat_aktif: 'Codeine', kekuatan: '10 mg', golongan_bpom: 'NARKOTIKA', bentuk_sediaan: 'Tablet', nie_bpom: 'GNL7212401810A1', suhu_simpan: 'Suhu Ruang (15-25°C)', rak_lokasi: 'LEMARI-NARKO-2KUNCI', satuan_dasar: 'Tablet', satuan_sedang: 'Botol 100', rasio_sedang: 100, satuan_besar: 'Botol 100', rasio_besar: 100, stok_min: 15, stok_max: 100, hpp_avg: 2300, hpp_terakhir: 2350, harga_umum: 4200, harga_member: 4000, harga_grosir: 3800, min_qty_grosir: 20, harga_faskes: 3500, pbf_utama: 'PT Kimia Farma Trading', status_aktif: 'AKTIF', substitusi_ids: '' },
        { id_obat: 'OBT-009', kode_kfa: '93006210', nama_dagang: 'Warfarin Simarc-2 2mg', zat_aktif: 'Warfarin', kekuatan: '2 mg', golongan_bpom: 'KERAS', bentuk_sediaan: 'Tablet', nie_bpom: 'DKL0421011210A1', suhu_simpan: 'Suhu Ruang (15-25°C)', rak_lokasi: 'RAK-JANTUNG', satuan_dasar: 'Tablet', satuan_sedang: 'Strip', rasio_sedang: 10, satuan_besar: 'Box', rasio_besar: 100, stok_min: 15, stok_max: 100, hpp_avg: 1350, hpp_terakhir: 1400, harga_umum: 2400, harga_member: 2250, harga_grosir: 2050, min_qty_grosir: 20, harga_faskes: 1950, pbf_utama: 'PT Fahrenheit', status_aktif: 'AKTIF', substitusi_ids: '' }
      ],
      stok_batch: [
        { id_batch: 'BTH-101', cabang_id: 'ONS-01', id_obat: 'OBT-001', no_batch: 'AMX-2601A', tgl_kadaluarsa: addDays(45), qty_sisa: 140, qty_karantina: 0, hpp_beli: 480, no_faktur_pbf: 'FK-BSP-8821', status_batch: 'AKTIF' },
        { id_batch: 'BTH-102', cabang_id: 'ONS-01', id_obat: 'OBT-001', no_batch: 'AMX-2609B', tgl_kadaluarsa: addDays(420), qty_sisa: 220, qty_karantina: 0, hpp_beli: 500, no_faktur_pbf: 'FK-BSP-9104', status_batch: 'AKTIF' },
        { id_batch: 'BTH-103', cabang_id: 'ONS-01', id_obat: 'OBT-002', no_batch: 'PCM-2512X', tgl_kadaluarsa: addDays(78), qty_sisa: 45, qty_karantina: 0, hpp_beli: 320, no_faktur_pbf: 'FK-ENS-4012', status_batch: 'AKTIF' },
        { id_batch: 'BTH-104', cabang_id: 'ONS-01', id_obat: 'OBT-002', no_batch: 'PCM-2703Y', tgl_kadaluarsa: addDays(510), qty_sisa: 260, qty_karantina: 0, hpp_beli: 340, no_faktur_pbf: 'FK-ENS-5501', status_batch: 'AKTIF' },
        { id_batch: 'BTH-105', cabang_id: 'ONS-01', id_obat: 'OBT-003', no_batch: 'INS-2604C', tgl_kadaluarsa: addDays(160), qty_sisa: 18, qty_karantina: 0, hpp_beli: 118000, no_faktur_pbf: 'FK-AAM-7710', status_batch: 'AKTIF' },
        { id_batch: 'BTH-106', cabang_id: 'ONS-01', id_obat: 'OBT-004', no_batch: 'RHN-2602P', tgl_kadaluarsa: addDays(195), qty_sisa: 14, qty_karantina: 0, hpp_beli: 7800, no_faktur_pbf: 'FK-DXA-3302', status_batch: 'AKTIF' },
        { id_batch: 'BTH-107', cabang_id: 'ONS-01', id_obat: 'OBT-005', no_batch: 'CFD-2611Z', tgl_kadaluarsa: addDays(340), qty_sisa: 160, qty_karantina: 0, hpp_beli: 1150, no_faktur_pbf: 'FK-BSP-9104', status_batch: 'AKTIF' },
        { id_batch: 'BTH-108', cabang_id: 'ONS-01', id_obat: 'OBT-006', no_batch: 'IBU-2603W', tgl_kadaluarsa: addDays(62), qty_sisa: 120, qty_karantina: 0, hpp_beli: 890, no_faktur_pbf: 'FK-ENS-5501', status_batch: 'AKTIF' },
        { id_batch: 'BTH-109', cabang_id: 'ONS-01', id_obat: 'OBT-007', no_batch: 'AML-2607N', tgl_kadaluarsa: addDays(390), qty_sisa: 65, qty_karantina: 0, hpp_beli: 410, no_faktur_pbf: 'FK-KFT-1904', status_batch: 'AKTIF' },
        { id_batch: 'BTH-110', cabang_id: 'ONS-01', id_obat: 'OBT-008', no_batch: 'COD-2608K', tgl_kadaluarsa: addDays(290), qty_sisa: 42, qty_karantina: 0, hpp_beli: 2300, no_faktur_pbf: 'FK-KFT-1904', status_batch: 'AKTIF' },
        { id_batch: 'BTH-111', cabang_id: 'ONS-01', id_obat: 'OBT-009', no_batch: 'WAR-2610M', tgl_kadaluarsa: addDays(310), qty_sisa: 50, qty_karantina: 0, hpp_beli: 1350, no_faktur_pbf: 'FK-FHR-0081', status_batch: 'AKTIF' },
        { id_batch: 'BTH-201', cabang_id: 'ONS-02', id_obat: 'OBT-004', no_batch: 'RHN-CB2-01', tgl_kadaluarsa: addDays(300), qty_sisa: 80, qty_karantina: 0, hpp_beli: 7800, no_faktur_pbf: 'FK-DXA-CB2', status_batch: 'AKTIF' },
        { id_batch: 'BTH-202', cabang_id: 'ONS-02', id_obat: 'OBT-007', no_batch: 'AML-CB2-02', tgl_kadaluarsa: addDays(400), qty_sisa: 180, qty_karantina: 0, hpp_beli: 410, no_faktur_pbf: 'FK-KFT-CB2', status_batch: 'AKTIF' },
        { id_batch: 'BTH-203', cabang_id: 'ONS-03', id_obat: 'OBT-001', no_batch: 'AMX-CB3-01', tgl_kadaluarsa: addDays(360), qty_sisa: 150, qty_karantina: 0, hpp_beli: 480, no_faktur_pbf: 'FK-BSP-CB3', status_batch: 'AKTIF' }
      ],
      members: [
        { id_member: 'MBR-001', nama_pasien: 'Tn. Bambang Suryono', no_hp: '6281234567801', tgl_lahir: '1965-04-19', alergi_list: 'Penisilin', penyakit_kronis: 'Hipertensi + Jantung', program_prb: 'PRB_BPJS', obat_rutin_ids: 'OBT-007,OBT-009', tgl_habis_obat: addDays(2), tgl_reminder_berikut: isoToday, poin_loyalitas: 245, riwayat_skrining_json: JSON.stringify([{ tgl: addDays(-30), td: '148/92', gds: 112, bmi: 26.4 }, { tgl: isoToday, td: '136/86', gds: 108, bmi: 25.9 }]) },
        { id_member: 'MBR-002', nama_pasien: 'Ny. Hj. Aminah Kusuma', no_hp: '6281234567802', tgl_lahir: '1969-11-02', alergi_list: 'Sulfa', penyakit_kronis: 'Diabetes Melitus Tipe 2', program_prb: 'PRB_BPJS', obat_rutin_ids: 'OBT-003', tgl_habis_obat: addDays(5), tgl_reminder_berikut: addDays(2), poin_loyalitas: 410, riwayat_skrining_json: JSON.stringify([{ tgl: addDays(-30), td: '130/80', gds: 194, bmi: 24.8 }, { tgl: isoToday, td: '125/80', gds: 158, bmi: 24.4 }]) },
        { id_member: 'MBR-003', nama_pasien: 'An. Raka Pratama', no_hp: '6281355509123', tgl_lahir: '2016-08-14', alergi_list: 'Tidak Ada', penyakit_kronis: 'Riwayat Gastritis / Asam Lambung', program_prb: 'UMUM', obat_rutin_ids: '', tgl_habis_obat: '', tgl_reminder_berikut: '', poin_loyalitas: 80, riwayat_skrining_json: '[]' }
      ],
      supplier_pbf: [
        { id_pbf: 'PBF-01', nama_pbf: 'PT Bina San Prima', kode_cdob: 'CDOB-3578-011', npwp_pbf: '01.302.441.2-091.000', kontak_wa: '628113400111', email_pbf: 'order@bsp.co.id', lead_time_hari: 1, termin_hari: 30, skor_sla: 96, status_pbf: 'AKTIF' },
        { id_pbf: 'PBF-02', nama_pbf: 'PT Enseval Putera Megatrading', kode_cdob: 'CDOB-3578-002', npwp_pbf: '01.300.119.8-054.000', kontak_wa: '628113400222', email_pbf: 'cs@enseval.com', lead_time_hari: 2, termin_hari: 45, skor_sla: 94, status_pbf: 'AKTIF' },
        { id_pbf: 'PBF-03', nama_pbf: 'PT Kimia Farma Trading & Dist', kode_cdob: 'CDOB-0001-KFTD', npwp_pbf: '01.001.662.1-093.000', kontak_wa: '628113400333', email_pbf: 'order@kftd.co.id', lead_time_hari: 2, termin_hari: 30, skor_sla: 98, status_pbf: 'AKTIF' },
        { id_pbf: 'PBF-04', nama_pbf: 'PT Anugrah Argon Medika (Cold Chain)', kode_cdob: 'CDOB-3578-049', npwp_pbf: '01.451.882.4-055.000', kontak_wa: '628113400444', email_pbf: 'coldchain@aam.co.id', lead_time_hari: 1, termin_hari: 30, skor_sla: 97, status_pbf: 'AKTIF' }
      ],
      faktur_pbf: [
        { id_beli: 'BLI-901', no_sp: 'SP/0012/ONS/11/2026', jenis_sp: 'REGULER', no_faktur_pbf: 'FK-BSP-9104', tgl_faktur: addDays(-18), tgl_jatuh_tempo: addDays(12), id_pbf: 'PT Bina San Prima', cabang_id: 'ONS-01', total_bruto: 4850000, diskon_pbf: 242500, ppn_masukan: 506825, netto_hutang: 5114325, sisa_hutang: 5114325, status_bayar: 'BELUM_LUNAS', status_bar: 'AKTIF' },
        { id_beli: 'BLI-902', no_sp: 'SP/0015/ONS/11/2026', jenis_sp: 'PREKURSOR', no_faktur_pbf: 'FK-AAM-7710', tgl_faktur: addDays(-25), tgl_jatuh_tempo: addDays(5), id_pbf: 'PT Anugrah Argon Medika', cabang_id: 'ONS-01', total_bruto: 3150000, diskon_pbf: 0, ppn_masukan: 346500, netto_hutang: 3496500, sisa_hutang: 3496500, status_bayar: 'JATUH_TEMPO_DEKAT', status_bar: 'AKTIF' }
      ],
      cold_chain: [
        { id_log_suhu: 'CC-01', timestamp: addDays(-2) + 'T07:30:00', cabang_id: 'ONS-01', id_kulkas: 'CHILLER-VAKSIN-01', suhu_celcius: 4.6, kelembapan: 54, status_alarm: 'NORMAL', petugas_id: 'apt. Siti Rahma, S.Farm', tindakan_korektif: '-' },
        { id_log_suhu: 'CC-02', timestamp: addDays(-1) + 'T07:30:00', cabang_id: 'ONS-01', id_kulkas: 'CHILLER-VAKSIN-01', suhu_celcius: 5.1, kelembapan: 56, status_alarm: 'NORMAL', petugas_id: 'apt. Siti Rahma, S.Farm', tindakan_korektif: '-' },
        { id_log_suhu: 'CC-03', timestamp: addDays(-1) + 'T16:15:00', cabang_id: 'ONS-01', id_kulkas: 'CHILLER-VAKSIN-01', suhu_celcius: 4.8, kelembapan: 52, status_alarm: 'NORMAL', petugas_id: 'Budi Santoso', tindakan_korektif: '-' },
        { id_log_suhu: 'CC-04', timestamp: isoToday + 'T08:00:00', cabang_id: 'ONS-01', id_kulkas: 'CHILLER-VAKSIN-01', suhu_celcius: 4.9, kelembapan: 53, status_alarm: 'NORMAL', petugas_id: 'apt. Siti Rahma, S.Farm', tindakan_korektif: '-' }
      ],
      rekam_klinis: [
        { id_klinis: 'KLN-8801', tanggal: isoToday + 'T09:15:00', cabang_id: 'ONS-01', pasien_id: 'MBR-001', nama_pasien: 'Tn. Bambang Suryono', no_wa_pasien: '6281234567801', dokter_asal: 'dr. Andi Pratama, Sp.JP', no_sip_dokter: '446/109/SIP-DOK/2024', alergi_pasien: 'Penisilin', layanan_jenis: 'SKRINING_RESEP', cdss_warning: 'Kontraindikasi Amoxicillin + Alergi Penisilin terdeteksi & telah diganti Cefadroxil/Azithromycin.', apj_pin_verified_by: 'apt. Siti Rahma, S.Farm', soap_notes: 'S: Kontrol TD rutin. O: TD 136/86 mmHg. A: Hipertensi terkontrol. P: Lanjut Amlodipine 10mg 1x1 malam, edukasi diet rendah garam.', status_klinis: 'TERVERIFIKASI_APJ' },
        { id_klinis: 'KLN-8802', tanggal: isoToday + 'T11:30:00', cabang_id: 'ONS-01', pasien_id: 'MBR-002', nama_pasien: 'Ny. Hj. Aminah Kusuma', no_wa_pasien: '6281234567802', dokter_asal: 'dr. Rina Wijaya, Sp.PD-KEMD', no_sip_dokter: '446/218/SIP-DOK/2025', alergi_pasien: 'Sulfa', layanan_jenis: 'ERX_DOKTER', cdss_warning: 'Resep Cold Chain Insulin Glargine — Cek Suhu Chiller 2-8C.', apj_pin_verified_by: '', soap_notes: 'R/ Lantus SoloStar Pen No. I (S 0-0-14 IU s.c.)\nR/ Paracetamol 500mg Tab No. X (S 3 dd 1 prn demam)', status_klinis: 'ANTRIAN_VALIDASI_APJ' }
      ],
      penjualan: [
        { id_transaksi: 'TRX-1001', no_invoice: 'INV-' + isoToday.replace(/-/g, '') + '-001', tanggal: isoToday + 'T08:42:00', cabang_id: 'ONS-01', kasir_id: 'USR-003', channel: 'Toko Fisik', id_member: 'MBR-002', metode_bayar: 'QRIS', detail_split: '', subtotal: 296000, diskon_total: 0, pajak_ppn: 0, grand_total: 296000, total_hpp: 236000, estimasi_margin: 60000, poin_didapat: 29, status_trx: 'LUNAS' },
        { id_transaksi: 'TRX-1002', no_invoice: 'INV-' + isoToday.replace(/-/g, '') + '-002', tanggal: isoToday + 'T10:15:00', cabang_id: 'ONS-01', kasir_id: 'USR-003', channel: 'Resep WA', id_member: 'MBR-001', metode_bayar: 'TUNAI', detail_split: '', subtotal: 84000, diskon_total: 4000, pajak_ppn: 0, grand_total: 80000, total_hpp: 51000, estimasi_margin: 29000, poin_didapat: 8, status_trx: 'LUNAS' }
      ],
      detail_penjualan: [
        { id_detail: 'DTL-1', id_transaksi: 'TRX-1001', no_invoice: 'INV-' + isoToday.replace(/-/g, '') + '-001', id_obat: 'OBT-003', id_batch: 'BTH-105', no_batch: 'INS-2604C', tgl_kadaluarsa: addDays(160), qty: 2, satuan: 'Pen', harga_jual: 148000, hpp_unit: 118000, diskon_item: 0, subtotal_item: 296000, aturan_pakai: '1x sehari 14 unit malam s.c.' },
        { id_detail: 'DTL-2', id_transaksi: 'TRX-1002', no_invoice: 'INV-' + isoToday.replace(/-/g, '') + '-002', id_obat: 'OBT-001', id_batch: 'BTH-101', no_batch: 'AMX-2601A', tgl_kadaluarsa: addDays(45), qty: 30, satuan: 'Kaplet', harga_jual: 900, hpp_unit: 480, diskon_item: 0, subtotal_item: 27000, aturan_pakai: '3x sehari 1 kaplet sesudah makan (habiskan)' }
      ],
      surat_pesanan: [
        {
          id_sp: 'SP-901',
          no_sp: 'SP/0012/ONS/11/2026',
          tanggal: addDays(-19),
          cabang_id: 'ONS-01',
          id_pbf: 'PBF-01',
          nama_pbf: 'PT Bina San Prima',
          golongan_sp: 'REGULER',
          items_json: JSON.stringify([{ id_obat: 'OBT-001', nama_dagang: 'Amoxicillin Trihydrate 500mg', qty: 200, satuan_dasar: 'Kaplet', hpp_terakhir: 500 }]),
          estimasi_total: 4850000,
          status_sp: 'SELESAI_DITERIMA',
          id_dokumen: 'DOC-DEMO1',
          no_faktur_pbf: 'FK-BSP-9104',
          tgl_diterima: addDays(-18),
          dibuat_oleh: 'apt. Siti Rahma, S.Farm',
          catatan: 'SP Reguler bulanan sudah diterima penuh'
        }
      ],
      shift_history: [],
      mutasi_stok: [
        { id_mutasi: 'MUT-101', timestamp: isoToday + 'T08:42:00', cabang_id: 'ONS-01', id_obat: 'OBT-003', nama_dagang: 'Lantus SoloStar Insulin Pen', id_batch: 'BTH-105', no_batch: 'INS-2604C', jenis_mutasi: 'PENJUALAN_POS', qty_ubah: -2, stok_akhir: 18, referensi_id: 'INV-' + isoToday.replace(/-/g, '') + '-001', user_id: 'USR-003', catatan: 'Penjualan POS FEFO' },
        { id_mutasi: 'MUT-102', timestamp: isoToday + 'T10:15:00', cabang_id: 'ONS-01', id_obat: 'OBT-001', nama_dagang: 'Amoxicillin Trihydrate 500mg', id_batch: 'BTH-101', no_batch: 'AMX-2601A', jenis_mutasi: 'PENJUALAN_POS', qty_ubah: -30, stok_akhir: 140, referensi_id: 'INV-' + isoToday.replace(/-/g, '') + '-002', user_id: 'USR-003', catatan: 'Penjualan Resep WA' }
      ],
      omnichannel_orders: [
        { id_order: 'ORD-901', no_order: 'ONL-' + isoToday.replace(/-/g, '') + '-01', tanggal: isoToday + 'T10:50:00', cabang_id: 'ONS-01', channel: 'E-Apotek Web', nama_pelanggan: 'Ibu Nadia Kusuma', no_wa: '6281234500112', alamat: 'Jl. Boulevard Raya No. 48, Makassar', items_json: JSON.stringify([{ id_obat: 'OBT-002', nama: 'Paracetamol Sanmol 500mg', qty: 20, satuan: 'Tablet', harga: 650 }, { id_obat: 'OBT-006', nama: 'Ibuprofen Proris 400mg', qty: 10, satuan: 'Kaplet', harga: 1600 }]), catatan: 'Antar siang sebelum jam 2, butuh struk PDF/WA', total_estimasi: 29000, ongkir: 10000, status_order: 'BARU', kurir: '', no_invoice_pos: '', petugas_id: 'Web Storefront' },
        { id_order: 'ORD-902', no_order: 'ONL-' + isoToday.replace(/-/g, '') + '-02', tanggal: isoToday + 'T11:20:00', cabang_id: 'ONS-01', channel: 'WhatsApp Apotek', nama_pelanggan: 'Tn. Hendri Wijaya', no_wa: '6281299887766', alamat: 'Perumahan Griya Sehat Blok C4', items_json: JSON.stringify([{ id_obat: 'OBT-007', nama: 'Amlodipine Besylate 10mg PRB', qty: 30, satuan: 'Tablet', harga: 850 }]), catatan: 'Pelanggan rutin PRB bulanan', total_estimasi: 25500, ongkir: 8000, status_order: 'DIKIRIM_KURIR', kurir: 'Kurir Internal (Pak Hasan)', no_invoice_pos: '', petugas_id: 'apt. Siti Rahma, S.Farm' }
      ],
      crm_kontak: [
        { id_kontak: 'CRM-001', nama: 'Tn. Bambang Suryono', no_wa_08: '081234567801', no_wa_62: '6281234567801', segmen: 'PRB_KRONIS', catatan_medis: 'Alergi: Penisilin | Hipertensi + Jantung', status_aktif: 'OPT_IN', tgl_gabung: isoToday, terakhir_dikirim: isoToday },
        { id_kontak: 'CRM-002', nama: 'Ny. Hj. Aminah Kusuma', no_wa_08: '081234567802', no_wa_62: '6281234567802', segmen: 'PRB_KRONIS', catatan_medis: 'Alergi: Sulfa | Diabetes Melitus Tipe 2', status_aktif: 'OPT_IN', tgl_gabung: isoToday, terakhir_dikirim: '' },
        { id_kontak: 'CRM-003', nama: 'Ibu Nadia Kusuma', no_wa_08: '081234500112', no_wa_62: '6281234500112', segmen: 'ONLINE', catatan_medis: 'Pembeli Etalase Web E-Apotek', status_aktif: 'OPT_IN', tgl_gabung: isoToday, terakhir_dikirim: '' }
      ],
      antrian_notif: [
        { id_notif: 'NTF-01', created_at: isoToday + 'T09:00:00', channel: 'WA', tujuan: '6281234567801', nama_penerima: 'Tn. Bambang Suryono', jenis_event: 'REMINDER_PRB', referensi_id: 'MBR-001', pesan: 'Halo Tn. Bambang Suryono, jadwal kontrol & tebus obat PRB Anda 2 hari lagi.', status: 'TERKIRIM', percobaan: 1, catatan_error: '', sent_at: isoToday + 'T09:05:00' },
        { id_notif: 'NTF-02', created_at: isoToday + 'T11:25:00', channel: 'WA', tujuan: '6281299887766', nama_penerima: 'Tn. Hendri Wijaya', jenis_event: 'OMNI_STATUS', referensi_id: 'ORD-902', pesan: 'Pesanan Anda sedang diantar oleh Kurir Internal (Pak Hasan).', status: 'ANTRI', percobaan: 0, catatan_error: '', sent_at: '' }
      ],
      st_template: [
        { id_tpl: 'TPL-58', kode: 'STRUK_58_DEFAULT', nama: 'Struk Kasir Thermal 58mm (Standar)', lebar_mm: 58, template_teks: (global.StrukEngine && global.StrukEngine.DEFAULT_STRUK_TEMPLATE) || '[C][B]{{NAMA_TOKO}}[/B]\n[LR]No|{{NOTA}}\n[LR]Total|{{TOTAL|rp}}', aktif: 'YA', updated_at: isoToday },
        { id_tpl: 'TPL-80', kode: 'STRUK_80_RESEP', nama: 'Struk Apotek Thermal 80mm (Detail Klinik)', lebar_mm: 80, template_teks: (global.StrukEngine && global.StrukEngine.DEFAULT_STRUK_TEMPLATE) || '[C][B]{{NAMA_TOKO}}[/B]\n[LR]No|{{NOTA}}\n[LR]Total|{{TOTAL|rp}}', aktif: 'YA', updated_at: isoToday }
      ],
      jurnal_keuangan: [
        { id_jurnal: 'JRN-1', tanggal: isoToday + 'T08:42:00', cabang_id: 'ONS-01', jenis_trx: 'MASUK_PENJUALAN', kategori: 'Toko Fisik', nominal: 296000, metode: 'QRIS', referensi_id: 'INV-' + isoToday.replace(/-/g, '') + '-001', periode_bulan: isoToday.slice(0, 7), status_lock: 'TERBUKA', user_id: 'USR-003' },
        { id_jurnal: 'JRN-2', tanggal: isoToday + 'T10:15:00', cabang_id: 'ONS-01', jenis_trx: 'MASUK_PENJUALAN', kategori: 'Resep WA', nominal: 80000, metode: 'TUNAI', referensi_id: 'INV-' + isoToday.replace(/-/g, '') + '-002', periode_bulan: isoToday.slice(0, 7), status_lock: 'TERBUKA', user_id: 'USR-003' },
        { id_jurnal: 'JRN-3', tanggal: isoToday + 'T11:00:00', cabang_id: 'ONS-01', jenis_trx: 'KELUAR_OPERASIONAL', kategori: 'Petty Cash - Plastik & Etiket Thermal', nominal: 125000, metode: 'TUNAI', referensi_id: 'PC-1102', periode_bulan: isoToday.slice(0, 7), status_lock: 'TERBUKA', user_id: 'USR-002' }
      ],
      tagihan: [
        { ID: 'TGH-PRB01', Periode: isoToday.slice(0, 7), ID_Pasien: 'MBR-001', Nama_Pasien: 'Tn. Bambang Suryono', HP_Pasien: '6281234567801', Program: 'PRB_BPJS', Kategori: 'HOME_PHARMACY_CARE', Deskripsi: 'Paket Home Pharmacy Care & Konseling Hipertensi', Nominal: 175000, Potongan: 25000, Netto: 150000, Terbayar: 0, Status: 'BELUM_BAYAR', JatuhTempo: addDays(3), TglTerbit: isoToday, Catatan: 'Subsidi member senior Rp 25.000', DibuatOleh: 'apt. Siti Rahma, S.Farm' },
        { ID: 'TGH-PRB02', Periode: isoToday.slice(0, 7), ID_Pasien: 'MBR-002', Nama_Pasien: 'Ny. Hj. Aminah Kusuma', HP_Pasien: '6281234567802', Program: 'PRB_BPJS', Kategori: 'RESEP_PRB_KRONIS', Deskripsi: 'Antar Paket Insulin + Jarum Pen Novofine', Nominal: 220000, Potongan: 0, Netto: 220000, Terbayar: 0, Status: 'BELUM_BAYAR', JatuhTempo: isoToday, TglTerbit: addDays(-5), Catatan: '', DibuatOleh: 'apt. Siti Rahma, S.Farm' }
      ],
      pembayaran: [],
      potongan: [
        { ID: 'POT-01', ID_Pasien: 'MBR-001', Nama_Pasien: 'Tn. Bambang Suryono', Kategori: 'SEMUA', JenisPotongan: 'SUBSIDI_LANSIA', Nilai: 25000, TipeNilai: 'NOMINAL', BerlakuDari: '2026-01', BerlakuSampai: '2026-12', Keterangan: 'Keringanan biaya antar Home Care Lansia', Aktif: 'YA' }
      ],
      reminder_log: [],
      de_templat: [
        { ID: 'TPL-SP', Kode: 'SP_BPOM_5_GOL', Nama: 'Surat Pesanan Obat 5 Golongan (BPOM)', Kategori: 'PENGADAAN', JenisFile: 'DOCS', PlaceholderJson: JSON.stringify(['NOMOR_SURAT', 'TANGGAL|tanggal', 'GOLONGAN_SP|kapital', 'NAMA_PBF', 'ALAMAT_PBF', 'NAMA_APJ', 'NO_SIPA', 'NAMA_APOTEK']), ButuhTtdPejabat: 'YA', Aktif: 'YA' },
        { ID: 'TPL-BAR', Kode: 'BAR_PBF_RETUR', Nama: 'Berita Acara Retur Barang Ke PBF (BAR-PBF)', Kategori: 'GUDANG', JenisFile: 'DOCS', PlaceholderJson: JSON.stringify(['NOMOR_SURAT', 'TANGGAL|tanggal', 'NAMA_PBF', 'NO_FAKTUR', 'TOTAL_NILAI|rupiah', 'ALASAN_RETUR', 'NAMA_APJ']), ButuhTtdPejabat: 'YA', Aktif: 'YA' },
        { ID: 'TPL-CR', Kode: 'COPY_RESEP', Nama: 'Salinan Resep (Apograph) Resmi', Kategori: 'KLINIS', JenisFile: 'DOCS', PlaceholderJson: JSON.stringify(['NOMOR_SURAT', 'TANGGAL|tanggal', 'NAMA_PASIEN', 'UMUR', 'DOKTER_PENULIS', 'TGL_RESEP', 'ISI_RESEP', 'NAMA_APJ', 'NO_SIPA']), ButuhTtdPejabat: 'YA', Aktif: 'YA' },
        { ID: 'TPL-RECALL', Kode: 'BA_RECALL_BPOM', Nama: 'Berita Acara Penarikan & Karantina Obat (Recall)', Kategori: 'REGULASI', JenisFile: 'DOCS', PlaceholderJson: JSON.stringify(['NOMOR_SURAT', 'TANGGAL|tanggal', 'NAMA_OBAT', 'NO_BATCH', 'QTY_KARANTINA', 'SUMBER_INSTRUKSI', 'NAMA_APJ', 'NO_SIPA']), ButuhTtdPejabat: 'YA', Aktif: 'YA' }
      ],
      de_dokumen: [
        { ID: 'DOC-DEMO1', ID_Templat: 'TPL-SP', KodeTemplat: 'SP_BPOM_5_GOL', NomorSurat: 'SP/0012/ONS/11/2026', Judul: 'SP Reguler — PT Bina San Prima', DataJson: JSON.stringify({ NOMOR_SURAT: 'SP/0012/ONS/11/2026', TANGGAL: isoToday, GOLONGAN_SP: 'REGULER', NAMA_PBF: 'PT Bina San Prima', ALAMAT_PBF: 'Kawasan Industri Rungkut Surabaya', NAMA_APJ: 'apt. Siti Rahma, S.Farm', NO_SIPA: '19920412/SIPA_35.78/2025/1042', NAMA_APOTEK: 'Apotek ONS Farma Enterprise' }), Status: 'TERBIT', KodeVerifikasi: 'ONS9F42A18D77B0C41E2', PenandaTangan: 'apt. Siti Rahma, S.Farm (SIPA: 19920412/SIPA_35.78/2025/1042)', TglTerbit: isoToday + 'T08:00:00Z' }
      ],
      de_pejabat: [
        { ID: 'PEJ-01', UserId: 'USR-002', Nama: 'apt. Siti Rahma, S.Farm', Jabatan: 'Apoteker Penanggung Jawab', NoSIPA: '19920412/SIPA_35.78/2025/1042', Email: 'apj@onsfarma.id', Aktif: 'YA' },
        { ID: 'PEJ-02', UserId: 'USR-001', Nama: 'apt. Anissa Faradifa R. Is Rumi', Jabatan: 'Pemilik Sarana Apotek & Apoteker', NoSIPA: '19920412/SIPA_35.78/2025/1042', Email: 'anissa@onsfarma.id', Aktif: 'YA' }
      ],
      audit_log: [
        { id_audit: 'AUD-101', timestamp: isoToday + 'T07:55:00Z', user_id: 'USR-002', role: 'APJ', cabang_id: 'ONS-01', aksi: 'BOOT_SYSTEM_OK', entitas: 'SYSTEM', entitas_id: 'v13.0', diff_sebelum_json: '{}', diff_sesudah_json: JSON.stringify({ status: 'Kepatuhan BPOM & SATUSEHAT Siap' }), device_info: 'Desktop Chrome' }
      ],
      kw_counter: 12,
      doc_counter: 13
    };
  }

  function buildOwnerPiutangSeed(isoToday) {
    return [
      { id_piutang: 'PTG-001', no_invoice: 'INV-' + isoToday.replace(/-/g, '') + '-091', tanggal_trx: isoToday + 'T09:15:00Z', tgl_jatuh_tempo: isoToday, cabang_id: 'ONS-01', id_member: 'MBR-001', nama_pelanggan: 'Klinik Pratama Sehat Sentosa', no_wa: '081244556677', total_tagihan: 650000, total_dibayar: 250000, sisa_piutang: 400000, plafon_kredit: 5000000, status_piutang: 'SEBAGIAN', dibuat_oleh: 'apt. Siti Rahma, S.Farm', catatan: 'Tagihan tempo mitra dokter 14 hari', updated_at: isoToday + 'T09:15:00Z' }
    ];
  }

  function buildPemeriksaanSeed(isoToday) {
    const yesterday = addDays(-1);
    const twoWeeksAgo = addDays(-14);
    const threeWeeksAgo = addDays(-18);
    const ctrlSoon = addDays(5);
    const ctrlNextWeek = addDays(14);
    return [
      {
        id_periksa: 'CHK-DEMO-01',
        tanggal: isoToday + 'T09:10:00',
        cabang_id: 'ONS-01',
        id_member: 'MBR-001',
        nama_pasien: 'Tn. Bambang Suryono',
        no_wa: '6281234567801',
        jenis_kelamin: 'L',
        usia_tahun: 61,
        berat_badan: 74,
        tinggi_badan: 168,
        imt_bmi: 26.2,
        tensi_sistol: 136,
        tensi_diastol: 86,
        nadi_bpm: 78,
        gula_jenis: 'GDS',
        gula_darah: 108,
        kolesterol_total: 214,
        asam_urat: 7.4,
        status_tensi: 'HIPERTENSI_1',
        status_gula: 'NORMAL',
        status_kolesterol: 'BATAS_TINGGI',
        status_asam_urat: 'TINGGI',
        tingkat_risiko: 'TINGGI_KONTROL',
        riwayat_terapi: 'Amlodipine 10 mg (1x1 malam)',
        keluhan_catatan: 'Cek rutin bulanan + kadang pegal di sendi jari kaki',
        saran_apoteker: 'Lanjutkan Amlodipine 10mg malam, kurangi garam/jeroan/melinjo, cukupi air putih 2L/hari.',
        tgl_kontrol: ctrlNextWeek,
        biaya_cek: 45000,
        petugas: 'apt. Siti Rahma, S.Farm',
        wa_terkirim: 'TERKIRIM_WA (' + isoToday + ' 09:15)',
        updated_at: isoToday + 'T09:15:00Z'
      },
      {
        id_periksa: 'CHK-DEMO-02',
        tanggal: isoToday + 'T10:30:00',
        cabang_id: 'ONS-01',
        id_member: 'MBR-002',
        nama_pasien: 'Ny. Hj. Aminah Kusuma',
        no_wa: '6281234567802',
        jenis_kelamin: 'P',
        usia_tahun: 57,
        berat_badan: 63,
        tinggi_badan: 156,
        imt_bmi: 25.9,
        tensi_sistol: 124,
        tensi_diastol: 78,
        nadi_bpm: 74,
        gula_jenis: 'GDP',
        gula_darah: 138,
        kolesterol_total: 186,
        asam_urat: 5.2,
        status_tensi: 'MENINGKAT',
        status_gula: 'TINGGI',
        status_kolesterol: 'NORMAL',
        status_asam_urat: 'NORMAL',
        tingkat_risiko: 'TINGGI_KONTROL',
        riwayat_terapi: 'Metformin 500 mg + Insulin basal malam',
        keluhan_catatan: 'Kontrol GDP pagi sebelum suntik insulin',
        saran_apoteker: 'Pertahankan dosis Insulin sesuai jadwal dokter & kurangi karbohidrat sederhana.',
        tgl_kontrol: ctrlSoon,
        biaya_cek: 35000,
        petugas: 'apt. Siti Rahma, S.Farm',
        wa_terkirim: 'BELUM',
        updated_at: isoToday + 'T10:30:00Z'
      },
      {
        id_periksa: 'CHK-DEMO-03',
        tanggal: yesterday + 'T16:20:00',
        cabang_id: 'ONS-01',
        id_member: '',
        nama_pasien: 'Ibu Kartini Wulandari',
        no_wa: '6281344559901',
        jenis_kelamin: 'P',
        usia_tahun: 49,
        berat_badan: 68,
        tinggi_badan: 159,
        imt_bmi: 26.9,
        tensi_sistol: 116,
        tensi_diastol: 76,
        nadi_bpm: 72,
        gula_jenis: 'GDS',
        gula_darah: 112,
        kolesterol_total: 248,
        asam_urat: 6.7,
        status_tensi: 'NORMAL',
        status_gula: 'NORMAL',
        status_kolesterol: 'TINGGI',
        status_asam_urat: 'TINGGI',
        tingkat_risiko: 'TINGGI_KONTROL',
        riwayat_terapi: 'Belum rutin obat kronis',
        keluhan_catatan: 'Leher terasa kaku & nyeri lutut ringan',
        saran_apoteker: 'Kolesterol & Asam Urat di atas batas normal. Disarankan konsultasi dokter & batasi makanan berlemak/purin.',
        tgl_kontrol: ctrlSoon,
        biaya_cek: 45000,
        petugas: 'Budi Santoso (Kasir)',
        wa_terkirim: 'BELUM',
        updated_at: yesterday + 'T16:20:00Z'
      },
      {
        id_periksa: 'CHK-DEMO-04',
        tanggal: twoWeeksAgo + 'T08:45:00',
        cabang_id: 'ONS-01',
        id_member: 'MBR-001',
        nama_pasien: 'Tn. Bambang Suryono',
        no_wa: '6281234567801',
        jenis_kelamin: 'L',
        usia_tahun: 61,
        berat_badan: 76,
        tinggi_badan: 168,
        imt_bmi: 26.9,
        tensi_sistol: 152,
        tensi_diastol: 96,
        nadi_bpm: 84,
        gula_jenis: 'GDS',
        gula_darah: 118,
        kolesterol_total: 232,
        asam_urat: 8.2,
        status_tensi: 'HIPERTENSI_2',
        status_gula: 'NORMAL',
        status_kolesterol: 'BATAS_TINGGI',
        status_asam_urat: 'TINGGI',
        tingkat_risiko: 'TINGGI_KONTROL',
        riwayat_terapi: 'Amlodipine 10 mg (baru mulai rutin)',
        keluhan_catatan: 'Kunjungan awal keluhan tengkuk tegang & nyeri jempol kaki',
        saran_apoteker: 'Disiplin minum Amlodipine tiap malam & pantau ulang tensi 2 minggu lagi.',
        tgl_kontrol: isoToday,
        biaya_cek: 45000,
        petugas: 'apt. Siti Rahma, S.Farm',
        wa_terkirim: 'TERKIRIM_WA (' + twoWeeksAgo + ' 08:52)',
        updated_at: twoWeeksAgo + 'T08:52:00Z'
      },
      {
        id_periksa: 'CHK-DEMO-05',
        tanggal: threeWeeksAgo + 'T09:15:00',
        cabang_id: 'ONS-01',
        id_member: 'MBR-002',
        nama_pasien: 'Ny. Hj. Aminah Kusuma',
        no_wa: '6281234567802',
        jenis_kelamin: 'P',
        usia_tahun: 57,
        berat_badan: 64,
        tinggi_badan: 156,
        imt_bmi: 26.3,
        tensi_sistol: 132,
        tensi_diastol: 84,
        nadi_bpm: 78,
        gula_jenis: 'GDP',
        gula_darah: 156,
        kolesterol_total: 208,
        asam_urat: 5.8,
        status_tensi: 'HIPERTENSI_1',
        status_gula: 'TINGGI',
        status_kolesterol: 'BATAS_TINGGI',
        status_asam_urat: 'NORMAL',
        tingkat_risiko: 'TINGGI_KONTROL',
        riwayat_terapi: 'Metformin 500 mg',
        keluhan_catatan: 'Cek GDP awal sebelum penyesuaian dosis dokter',
        saran_apoteker: 'Bawa hasil ini saat kontrol ke dokter untuk evaluasi terapi GDP.',
        tgl_kontrol: isoToday,
        biaya_cek: 35000,
        petugas: 'apt. Siti Rahma, S.Farm',
        wa_terkirim: 'TERKIRIM_WA (' + threeWeeksAgo + ' 09:20)',
        updated_at: threeWeeksAgo + 'T09:20:00Z'
      }
    ];
  }

  function buildCopyResepSeed(isoToday) {
    return [
      { id_copy: 'CR-001', no_salinan: 'CR/0001/' + isoToday.slice(5, 7) + '/' + isoToday.slice(0, 4), tanggal: isoToday, cabang_id: 'ONS-01', no_resep_asal: 'R/202611-0042', tgl_resep_asal: isoToday, nama_dokter: 'dr. Hendri Saputra, Sp.PD', id_member: 'MBR-001', nama_pasien: 'Tn. Bambang Suryono', umur_pasien: '58 th', items_json: JSON.stringify([{ nama_dagang: 'Amlodipine Besilate 5 mg', qty_resep: 30, qty_ambil: 15, qty_sisa: 15, signa: '1 x 1 tab pagi', flag: 'det 15' }]), status_serah: 'DET_15', apoteker_nama: 'apt. Siti Rahma, S.Farm', no_sipa: '19920412/SIPA_35.78/2025/1042', no_invoice_pos: '', catatan: 'Tebus sebagian 15 tablet, sisa 15 tablet' }
    ];
  }

  function ensureV11Seed(db) {
    const def = buildSeedDb();
    const isoToday = new Date().toISOString().slice(0, 10);
    let changed = false;
    ['mutasi_stok', 'omnichannel_orders', 'crm_kontak', 'antrian_notif', 'st_template', 'surat_pesanan', 'shift_history'].forEach((k) => {
      if (!Array.isArray(db[k])) { db[k] = def[k]; changed = true; }
    });
    if (!Array.isArray(db.piutang_pelanggan)) { db.piutang_pelanggan = buildOwnerPiutangSeed(isoToday); changed = true; }
    if (!Array.isArray(db.copy_resep)) { db.copy_resep = buildCopyResepSeed(isoToday); changed = true; }
    if (!Array.isArray(db.pemeriksaan_pasien)) { db.pemeriksaan_pasien = buildPemeriksaanSeed(isoToday); changed = true; }
    if (!Array.isArray(db.mutasi_cabang)) {
      db.mutasi_cabang = [{
        id_transfer: 'TRF-DEMO-01',
        no_surat_jalan: 'SJ-MUT/' + isoToday.replace(/-/g, '') + '/0001',
        tanggal_kirim: isoToday + 'T09:00:00',
        tanggal_terima: '',
        cabang_asal: 'ONS-02',
        cabang_tujuan: 'ONS-01',
        items_json: JSON.stringify([{ id_obat: 'OBT-004', nama_dagang: 'Rhinos SR Kapsul Lepas Lambat', satuan_dasar: 'Kapsul', no_batch: 'RHN-CB2-01', tgl_kadaluarsa: addDays(300), hpp_beli: 7800, qty: 20 }]),
        total_qty_dasar: 20,
        estimasi_nilai_hpp: 156000,
        status_transfer: 'DIKIRIM',
        dikirim_oleh: 'APJ Cabang ONS-02',
        diterima_oleh: '',
        catatan: 'Drop stok antrean cabang timur'
      }];
      changed = true;
    }
    if (!db.profil_usaha || typeof db.profil_usaha !== 'object') {
      db.profil_usaha = def.profil_usaha;
      changed = true;
    } else {
      if (/hendra\s+wijaya/i.test(String(db.profil_usaha.nama_pemilik || ''))) {
        db.profil_usaha.nama_pemilik = 'apt. Anissa Faradifa R. Is Rumi';
        changed = true;
      }
      if (/hendra\s+wijaya/i.test(String(db.profil_usaha.dikonfirmasi_oleh || ''))) {
        db.profil_usaha.dikonfirmasi_oleh = db.profil_usaha.nama_pemilik || 'apt. Anissa Faradifa R. Is Rumi';
        changed = true;
      }
    }
    if (Array.isArray(db.users)) {
      db.users.forEach((u) => {
        if (u.id_user === 'USR-001' && String(u.nama_lengkap || '').includes('Hendra Wijaya')) {
          u.nama_lengkap = 'apt. Anissa Faradifa R. Is Rumi';
          u.no_sipa = '19920412/SIPA_35.78/2025/1042';
          changed = true;
        }
      });
    }
    if (Array.isArray(db.de_pejabat)) {
      db.de_pejabat.forEach((p) => {
        if (p.ID === 'PEJ-02' && String(p.Nama || '').includes('Hendra Wijaya')) {
          p.Nama = 'apt. Anissa Faradifa R. Is Rumi';
          p.Jabatan = 'Pemilik Sarana Apotek & Apoteker';
          p.NoSIPA = '19920412/SIPA_35.78/2025/1042';
          p.Email = 'anissa@onsfarma.id';
          changed = true;
        }
      });
    }
    if (!db.rbac_permissions || typeof db.rbac_permissions !== 'object') {
      db.rbac_permissions = {};
      changed = true;
    }
    if (!db.audit_system || typeof db.audit_system !== 'object' || !Array.isArray(db.audit_system.items)) {
      const uApj = (db.users || []).find((u) => u.role === 'APJ') || { id_user: 'USR-002', nama_lengkap: 'apt. Siti Rahma, S.Farm', no_sipa: '19920412/SIPA_35.78/2025/1042' };
      const uKas = (db.users || []).find((u) => u.role === 'Kasir') || { id_user: 'USR-003', nama_lengkap: 'Budi Santoso (Kasir)' };
      db.audit_system = {
        cabang_id: 'ONS-01',
        apj_user_id: uApj.id_user,
        apj_nama: uApj.nama_lengkap,
        apj_sipa: uApj.no_sipa || '-',
        kasir_user_id: uKas.id_user,
        kasir_nama: uKas.nama_lengkap,
        catatan_audit: 'Pemeriksaan rutin CDOB & kesiapan stok harian.',
        updated_at: isoToday + 'T07:55:00Z',
        updated_by: uApj.nama_lengkap,
        items: [
          { id: 'AUDC-1', label: 'Verifikasi Laci Narkotika', checked: true, pj_role: 'APJ', pj_nama: uApj.nama_lengkap, keterangan: 'Terkunci ganda & kartu stok sesuai' },
          { id: 'AUDC-2', label: 'Prioritas Jual Batch FEFO', checked: true, pj_role: 'Kasir', pj_nama: uKas.nama_lengkap, keterangan: 'Batch ED terdekat diprioritaskan di POS' },
          { id: 'AUDC-3', label: 'Order SP PBF Sebelum 14:00', checked: false, pj_role: 'APJ', pj_nama: uApj.nama_lengkap, keterangan: 'Menunggu approval SP harian' }
        ]
      };
      changed = true;
    }
    if (changed) saveDb(db);
    return db;
  }

  function loadDb() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return ensureV11Seed(JSON.parse(raw));
    } catch (e) {}
    const seeded = buildSeedDb();
    saveDb(seeded);
    return seeded;
  }

  function saveDb(db) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); } catch (e) {}
  }

  function maskRow(row, role) {
    const c = Object.assign({}, row);
    if (role === 'Kasir') {
      delete c.hpp_avg;
      delete c.hpp_terakhir;
      delete c.hpp_beli;
      delete c.hpp_unit;
      delete c.total_hpp;
      delete c.estimasi_margin;
      delete c.soap_notes;
    }
    return c;
  }

  function _computeBranchCompareDemo(db, idObat) {
    const branches = ['ONS-01', 'ONS-02', 'ONS-03'];
    const brSet = new Set(branches);
    const mapByObat = {};
    (db.stok_batch || []).forEach((b) => {
      if (String(b.status_batch || 'AKTIF') !== 'AKTIF' || Number(b.qty_sisa || 0) <= 0) return;
      if (String(b.tgl_kadaluarsa || '9999-12-31').slice(0, 10) < isoToday) return;
      if (idObat && b.id_obat !== idObat) return;
      const br = b.cabang_id || 'ONS-01';
      brSet.add(br);
      if (!mapByObat[b.id_obat]) mapByObat[b.id_obat] = {};
      mapByObat[b.id_obat][br] = (mapByObat[b.id_obat][br] || 0) + Number(b.qty_sisa || 0);
    });
    const branchList = Array.from(brSet).sort();
    const target = idObat ? (db.master_obat || []).filter((o) => o.id_obat === idObat) : (db.master_obat || []);
    const items = target.map((o) => {
      const perCb = {};
      let tot = 0;
      branchList.forEach((br) => {
        const q = (mapByObat[o.id_obat] && mapByObat[o.id_obat][br]) || 0;
        perCb[br] = q;
        tot += q;
      });
      return { id_obat: o.id_obat, nama_dagang: o.nama_dagang, satuan_dasar: o.satuan_dasar || 'Unit', stok_per_cabang: perCb, total_semua_cabang: tot };
    });
    return { branches: branchList, items };
  }

  function _estimateCheckoutHppDemo(db, itemsReq, branchId) {
    const cutTmp = {};
    let estHpp = 0;
    let estBruto = 0;
    (itemsReq || []).forEach((it) => {
      const faktor = Math.max(1, Number(it.faktor_konversi || 1));
      let rem = Number(it.qty || 1) * faktor;
      const avail = (db.stok_batch || [])
        .filter((b) => (!b.cabang_id || b.cabang_id === branchId) && b.id_obat === it.id_obat && String(b.status_batch || 'AKTIF') === 'AKTIF' && Number(b.qty_sisa || 0) > 0 && String(b.tgl_kadaluarsa || '9999-12-31').slice(0, 10) >= isoToday)
        .sort((a, b) => String(a.tgl_kadaluarsa).localeCompare(String(b.tgl_kadaluarsa)));
      const unitSell = Number(it.harga_jual || 0) / faktor;
      const obat = (db.master_obat || []).find((o) => o.id_obat === it.id_obat) || {};
      avail.forEach((b) => {
        if (rem <= 0) return;
        const free = Number(b.qty_sisa || 0) - Number(cutTmp[b.id_batch] || 0);
        if (free <= 0) return;
        const cut = Math.min(rem, free);
        cutTmp[b.id_batch] = Number(cutTmp[b.id_batch] || 0) + cut;
        rem -= cut;
        estHpp += cut * Number(b.hpp_beli || obat.hpp_avg || 0);
        estBruto += Math.round(cut * unitSell);
      });
    });
    return { estHpp, estBruto };
  }

  function _computeSmartDefectaDemo(db, branchId) {
    const cut30 = addDays(-30);
    const stokMap = {};
    (db.stok_batch || []).forEach((b) => {
      if ((!b.cabang_id || b.cabang_id === branchId) && String(b.status_batch || 'AKTIF') === 'AKTIF' && String(b.tgl_kadaluarsa || '9999-12-31').slice(0, 10) >= isoToday) {
        stokMap[b.id_obat] = (stokMap[b.id_obat] || 0) + Number(b.qty_sisa || 0);
      }
    });
    const trx30 = {};
    (db.penjualan || []).forEach((p) => {
      if ((!p.cabang_id || p.cabang_id === branchId) && String(p.status_trx || '') !== 'RETUR' && String(p.tanggal || '').slice(0, 10) >= cut30) {
        if (p.id_transaksi) trx30[p.id_transaksi] = true;
        if (p.no_invoice) trx30[p.no_invoice] = true;
      }
    });
    const sold30 = {};
    (db.detail_penjualan || []).forEach((dt) => {
      if (trx30[dt.id_transaksi] || trx30[dt.no_invoice]) sold30[dt.id_obat] = (sold30[dt.id_obat] || 0) + Number(dt.qty || 0);
    });
    const pbfLead = {};
    (db.supplier_pbf || []).forEach((p) => { if (p.nama_pbf) pbfLead[String(p.nama_pbf).toLowerCase()] = Number(p.lead_time_hari || 2); });
    const items = [];
    (db.master_obat || []).forEach((o) => {
      if (String(o.status_aktif || 'AKTIF') !== 'AKTIF') return;
      const s = stokMap[o.id_obat] || 0;
      const min = Number(o.stok_min || 10);
      const max = Number(o.stok_max || 100);
      const qty30 = sold30[o.id_obat] || 0;
      const avgHarian = Math.round((qty30 > 0 ? qty30 / 30 : Math.max(0.5, min / 14)) * 100) / 100;
      const leadTime = pbfLead[String(o.pbf_utama || '').toLowerCase()] || 2;
      const rop = Math.ceil(avgHarian * (leadTime + 3));
      const dos = avgHarian > 0 ? Math.round(s / avgHarian) : 999;
      const smartQty = Math.max(1, Math.max(max, Math.ceil(avgHarian * (30 + leadTime))) - s);
      if (s <= min || s <= rop) {
        items.push({
          id_obat: o.id_obat, nama_dagang: o.nama_dagang, zat_aktif: o.zat_aktif, golongan_bpom: o.golongan_bpom || 'BEBAS',
          stok_saat_ini: s, stok_min: min, reorder_point: rop, terjual_30_hari: qty30, avg_harian: avgHarian,
          lead_time_hari: leadTime, days_of_stock: dos, rekomendasi_order: smartQty,
          satuan_dasar: o.satuan_dasar, hpp_terakhir: Number(o.hpp_terakhir || o.hpp_avg || 0), pbf_utama: o.pbf_utama || 'PBF Reguler'
        });
      }
    });
    return { items };
  }

  function handleAction(action, d, tokenPayload) {
    const db = loadDb();
    const role = (tokenPayload && tokenPayload.role) || 'Pemilik';
    const userNama = (tokenPayload && tokenPayload.nama) || 'Demo User';
    const userId = (tokenPayload && tokenPayload.uid) || 'USR-001';
    const cabang = (d && d.cabang_id) || (tokenPayload && tokenPayload.branch) || 'ONS-01';
    const nowIso = new Date().toISOString();

    if (action === 'ping') return { app: 'Apotek ONS Farma Enterprise', version: '16.0.0-DEMO', epoch: db.epoch };

    if (action === 'public.catalog') {
      const prof = db.profil_usaha || defaultProfilUsaha();
      const stockMap = {};
      db.stok_batch.filter((b) => String(b.status_batch || 'AKTIF') === 'AKTIF' && Number(b.qty_sisa || 0) > 0).forEach((b) => {
        stockMap[b.id_obat] = (stockMap[b.id_obat] || 0) + Number(b.qty_sisa || 0);
      });
      return {
        apotek: {
          nama: prof.nama_usaha || 'Apotek ONS Farma',
          cabang: prof.cabang_id || 'ONS-01',
          alamat: [prof.alamat_usaha, prof.kota, prof.kode_pos].filter(Boolean).join(', '),
          wa_admin: String(prof.wa_usaha || '628110000990').replace(/[^0-9]/g, ''),
          telepon: prof.telepon_usaha || '',
          jam_operasional: prof.jam_operasional || '',
          no_sia: prof.no_sia || '',
          nama_pemilik: prof.nama_pemilik || '',
          sipa_pemilik: prof.sipa_pemilik || '',
          logo_usaha_url: prof.logo_usaha_url || './icons/ons-farma-app-icon.png'
        },
        items: db.master_obat.filter((o) => o.status_aktif !== 'NONAKTIF').map((o) => ({
          id_obat: o.id_obat, nama_dagang: o.nama_dagang, zat_aktif: o.zat_aktif, kekuatan: o.kekuatan,
          golongan_bpom: o.golongan_bpom, bentuk_sediaan: o.bentuk_sediaan, satuan_dasar: o.satuan_dasar,
          harga_umum: Number(o.harga_umum || 0), stok_tersedia: stockMap[o.id_obat] || 0
        }))
      };
    }

    if (action === 'public.submitOrder') {
      if (!d.nama_pelanggan || !d.no_wa) throw new Error('Nama & nomor WhatsApp wajib diisi.');
      const noOrder = 'ONL-' + isoToday.replace(/-/g, '') + '-' + String(db.omnichannel_orders.length + 1).padStart(2, '0');
      const ord = {
        id_order: 'ORD-' + Date.now().toString().slice(-5),
        no_order: noOrder,
        tanggal: nowIso,
        cabang_id: d.cabang_id || 'ONS-01',
        channel: 'E-Apotek Web',
        nama_pelanggan: d.nama_pelanggan,
        no_wa: String(d.no_wa).replace(/[^0-9]/g, ''),
        alamat: d.alamat || '',
        items_json: typeof d.items_json === 'string' ? d.items_json : JSON.stringify(d.items || []),
        catatan: d.catatan || '',
        total_estimasi: Number(d.total_estimasi || 0),
        ongkir: Number(d.ongkir || 0),
        status_order: 'BARU',
        kurir: '',
        no_invoice_pos: '',
        petugas_id: 'Public Storefront'
      };
      db.omnichannel_orders.unshift(ord);
      db.epoch++;
      saveDb(db);
      return { ok: true, id_order: ord.id_order, no_order: ord.no_order, status_order: 'BARU', item: ord };
    }

    if (action === 'auth.login') {
      const u = db.users.find((x) => x.username.toLowerCase() === String(d.username || '').toLowerCase());
      if (!u) throw new Error('Username tidak ditemukan (gunakan: pemilik / apj / kasir).');
      if (String(u.status_aktif || 'AKTIF').toUpperCase() === 'NONAKTIF') {
        throw new Error('Akun sedang dinonaktifkan oleh Pemilik.');
      }
      const userPerms = (db.rbac_permissions && db.rbac_permissions[u.id_user]) || null;
      const sesObj = {
        uid: u.id_user,
        u: u.username,
        nama: u.nama_lengkap,
        role: u.role,
        sipa: u.no_sipa,
        branch: d.cabang_id || 'ONS-01'
      };
      const fakeTok = 'DEMO.' + btoa(unescape(encodeURIComponent(JSON.stringify(sesObj))));
      const out = { token: fakeTok, user: Object.assign({}, u, { cabang_id: sesObj.branch, hak_akses: userPerms }) };
      if (d.include_boot) {
        out.boot = handleAction('boot.getState', d, { uid: sesObj.uid, nama: sesObj.nama, role: sesObj.role, sipa: sesObj.sipa, branch: sesObj.branch, hak_akses: userPerms });
      }
      return out;
    }

    if (action === 'auth.verifyPin') {
      if (String(d.pin || '') !== '123456') {
        throw new Error('PIN Otorisasi salah (Demo PIN default: 123456).');
      }
      const reqU = String(d.username || '').toLowerCase();
      const spv = (reqU && (db.users || []).find((x) => (x.role === 'APJ' || x.role === 'Pemilik') && String(x.status_aktif || 'AKTIF') === 'AKTIF' && String(x.username || '').toLowerCase() === reqU))
        || (db.users || []).find((x) => x.role === 'APJ' && String(x.status_aktif || 'AKTIF') === 'AKTIF')
        || (db.users || []).find((x) => x.role === 'Pemilik' && String(x.status_aktif || 'AKTIF') === 'AKTIF')
        || { id_user: 'USR-002', nama_lengkap: 'apt. Siti Rahma, S.Farm', role: 'APJ' };
      return { verified: true, supervisor_id: spv.id_user, supervisor_nama: spv.nama_lengkap, supervisor_role: spv.role };
    }

    if (action === 'boot.getState') {
      const trxMap = {};
      (db.penjualan || []).forEach((p) => { trxMap[p.id_transaksi] = p; });
      const obatMap = {};
      (db.master_obat || []).forEach((o) => { obatMap[o.id_obat] = o; });
      const batchMap = {};
      (db.stok_batch || []).forEach((b) => { batchMap[b.id_batch] = b; });
      const enrichedDetails = (db.detail_penjualan || []).map((dt) => {
        const t = trxMap[dt.id_transaksi] || {};
        const o = obatMap[dt.id_obat] || {};
        const b = batchMap[dt.id_batch] || {};
        return Object.assign(maskRow(dt, role), {
          no_invoice: dt.no_invoice || t.no_invoice || '',
          cabang_id: dt.cabang_id || t.cabang_id || 'ONS-01',
          nama_dagang: dt.nama_dagang || o.nama_dagang || dt.id_obat,
          no_batch: dt.no_batch || b.no_batch || '-',
          tgl_kadaluarsa: dt.tgl_kadaluarsa || b.tgl_kadaluarsa || ''
        });
      });
      const activeBr = (d && d.cabang_id) || 'ONS-01';
      const permsMap = db.rbac_permissions || {};
      const uidBoot = (tokenPayload && (tokenPayload.uid || tokenPayload.id_user)) || '';
      const bootUser = Object.assign({}, tokenPayload || {}, {
        hak_akses: (uidBoot && permsMap[uidBoot]) || (tokenPayload && tokenPayload.hak_akses) || null
      });
      return {
        user: bootUser,
        epoch: db.epoch,
        cabang_id: activeBr,
        store_profile: db.profil_usaha || defaultProfilUsaha(),
        rbac_permissions: permsMap,
        staff_directory: (db.users || []).map((u) => ({
          id_user: u.id_user,
          username: u.username,
          nama_lengkap: u.nama_lengkap,
          role: u.role,
          cabang_id: u.cabang_id || 'ONS-01',
          no_sipa: u.no_sipa || '-',
          masa_berlaku_sipa: u.masa_berlaku_sipa || '-',
          status_aktif: u.status_aktif || 'AKTIF'
        })),
        audit_system: db.audit_system || null,
        master_obat: db.master_obat.map((o) => maskRow(o, role)),
        stok_batch: db.stok_batch.filter((b) => !b.cabang_id || b.cabang_id === activeBr).map((b) => maskRow(b, role)),
        members: db.members,
        supplier_pbf: db.supplier_pbf,
        cold_chain: db.cold_chain,
        rekam_klinis: db.rekam_klinis.map((r) => maskRow(r, role)),
        penjualan: db.penjualan.map((p) => maskRow(p, role)),
        detail_penjualan: enrichedDetails,
        mutasi_stok: db.mutasi_stok || [],
        omnichannel_orders: db.omnichannel_orders || [],
        struk_templates: db.st_template || [],
        faktur_pbf: role !== 'Kasir' ? db.faktur_pbf : [],
        jurnal_keuangan: role !== 'Kasir' ? db.jurnal_keuangan : [],
        surat_pesanan: role !== 'Kasir' ? (db.surat_pesanan || []) : [],
        de_dokumen: role !== 'Kasir' ? (db.de_dokumen || []) : [],
        shift_history: db.shift_history || [],
        active_shift: (db.shift_history || []).find((s) => String(s.status_shift || '').toUpperCase() === 'TERBUKA' && (!s.cabang_id || s.cabang_id === activeBr)) || null,
        piutang_pelanggan: db.piutang_pelanggan || [],
        copy_resep: db.copy_resep || [],
        pemeriksaan_pasien: db.pemeriksaan_pasien || [],
        mutasi_cabang: db.mutasi_cabang || [],
        branch_stock_compare: _computeBranchCompareDemo(db, '')
      };
    }

    if (action === 'obat.save') {
      const existingIdx = db.master_obat.findIndex((o) => o.id_obat === d.id_obat);
      const item = Object.assign({
        id_obat: d.id_obat || ('OBT-' + String(db.master_obat.length + 1).padStart(3, '0')),
        min_qty_grosir: Number(d.min_qty_grosir || 10),
        harga_faskes: Number(d.harga_faskes || d.harga_grosir || d.harga_member || 0),
        status_aktif: 'AKTIF',
        updated_at: nowIso
      }, d);
      if (existingIdx >= 0) db.master_obat[existingIdx] = Object.assign(db.master_obat[existingIdx], item);
      else db.master_obat.push(item);
      db.epoch++;
      saveDb(db);
      return { item: maskRow(item, role) };
    }

    if (action === 'obat.updatePrices') {
      if (role !== 'Pemilik' && role !== 'APJ') throw new Error('AKSES DITOLAK: Hanya Pemilik / APJ yang berhak mengubah harga.');
      const list = Array.isArray(d.items) ? d.items : (d.id_obat ? [d] : []);
      if (!list.length) throw new Error('Daftar perubahan harga obat kosong.');
      const updatedRows = [];
      list.forEach((p) => {
        if (!p || !p.id_obat) return;
        const idx = db.master_obat.findIndex((o) => o.id_obat === p.id_obat);
        if (idx < 0) return;
        const m = db.master_obat[idx];
        if (p.harga_umum !== undefined && Number(p.harga_umum) > 0) m.harga_umum = Math.round(Number(p.harga_umum));
        if (p.harga_member !== undefined && Number(p.harga_member) > 0) m.harga_member = Math.round(Number(p.harga_member));
        if (p.harga_grosir !== undefined && Number(p.harga_grosir) > 0) m.harga_grosir = Math.round(Number(p.harga_grosir));
        if (p.harga_faskes !== undefined && Number(p.harga_faskes) > 0) m.harga_faskes = Math.round(Number(p.harga_faskes));
        m.updated_at = nowIso;
        updatedRows.push({
          id_obat: m.id_obat,
          nama_dagang: m.nama_dagang,
          harga_umum: m.harga_umum,
          harga_member: m.harga_member,
          harga_grosir: m.harga_grosir,
          harga_faskes: m.harga_faskes
        });
      });
      if (!updatedRows.length) throw new Error('Produk Master Obat tidak ditemukan untuk pembaruan harga.');
      db.audit_log.unshift({
        id_audit: 'AUD-' + Date.now(),
        timestamp: nowIso,
        user_id: userId,
        role,
        cabang_id: d.cabang_id || cabang || 'ONS-01',
        aksi: 'OBAT_PRICE_ANALYSER_UPDATE',
        entitas: 'MASTER_OBAT',
        entitas_id: updatedRows.map((x) => x.id_obat).slice(0, 5).join(','),
        diff_sesudah_json: JSON.stringify({ count: updatedRows.length, reason: String(d.catatan || 'Analisa Harga & Margin') })
      });
      db.epoch++;
      saveDb(db);
      return { updated: updatedRows.length, items: updatedRows };
    }

    if (action === 'pos.checkout') {
      const itemsReq = Array.isArray(d.items) ? d.items : [];
      if (!itemsReq.length) throw new Error('Keranjang POS masih kosong.');
      const hppEstCheck = _estimateCheckoutHppDemo(db, itemsReq, cabang);
      const preNetRev = (d.grand_total !== undefined && d.grand_total !== null) ? Number(d.grand_total) : Math.max(0, hppEstCheck.estBruto - Number(d.diskon_total || 0));
      const isSupv = role === 'Pemilik' || role === 'APJ';
      if (hppEstCheck.estHpp > 0 && preNetRev < hppEstCheck.estHpp && !d.apj_override_id && !(isSupv && d.allow_below_hpp === true)) {
        throw new Error('GUARD ANTI-RUGI: Harga jual bersih (Rp ' + preNetRev + ') di bawah HPP modal (Rp ' + hppEstCheck.estHpp + '). Diperlukan otorisasi PIN APJ/Pemilik.');
      }
      const metodeBayar = String(d.metode_bayar || 'TUNAI').toUpperCase();
      const isPiutang = metodeBayar === 'PIUTANG';

      if (isPiutang) {
        const custNameKey = String(d.pelanggan_nama || '').trim().toLowerCase();
        if ((!d.id_member || d.id_member === 'UMUM') && !custNameKey) {
          throw new Error('Pembayaran Piutang / Tempo wajib memilih Member/Mitra atau mengisi Nama Pelanggan.');
        }
        const estBill = d.grand_total !== undefined ? Math.max(0, Number(d.grand_total)) : itemsReq.reduce((s, it) => s + Number(it.qty || 1) * Number(it.harga_jual || 0), 0);
        const plafon = Number(d.plafon_kredit !== undefined && d.plafon_kredit !== '' ? d.plafon_kredit : 2000000);
        const openDebt = (db.piutang_pelanggan || []).filter((p) => {
          if (String(p.status_piutang || '').toUpperCase() === 'LUNAS') return false;
          if (d.id_member && d.id_member !== 'UMUM') return String(p.id_member) === String(d.id_member);
          return custNameKey && String(p.nama_pelanggan || '').trim().toLowerCase() === custNameKey;
        }).reduce((sum, p) => sum + Math.max(0, Number(p.sisa_piutang || 0)), 0);
        if (plafon > 0 && (openDebt + estBill) > plafon && !d.apj_override_id) {
          throw new Error('Limit piutang/tempo terlampaui (Terpakai Rp ' + openDebt.toLocaleString('id-ID') + ', baru Rp ' + estBill.toLocaleString('id-ID') + ', plafon Rp ' + plafon.toLocaleString('id-ID') + '). Diperlukan otorisasi PIN APJ.');
        }
      }
      // Pra-validasi stok FEFO layak jual (hindari batch KADALUARSA)
      itemsReq.forEach((it) => {
        const qtyNeeded = Number(it.qty || 1) * Number(it.faktor_konversi || 1);
        const obat = db.master_obat.find((o) => o.id_obat === it.id_obat) || {};
        let availSellable = 0;
        let expiredQty = 0;
        db.stok_batch.forEach((b) => {
          if ((!b.cabang_id || b.cabang_id === cabang) && b.id_obat === it.id_obat && String(b.status_batch || 'AKTIF') === 'AKTIF' && Number(b.qty_sisa || 0) > 0) {
            const ed = String(b.tgl_kadaluarsa || '9999-12-31').slice(0, 10);
            if (ed < isoToday) expiredQty += Number(b.qty_sisa || 0);
            else availSellable += Number(b.qty_sisa || 0);
          }
        });
        if (availSellable < qtyNeeded) {
          throw new Error('Stok layak jual ' + (obat.nama_dagang || it.id_obat) + ' tidak mencukupi (tersedia ' + availSellable + ', butuh ' + qtyNeeded + (expiredQty > 0 ? '; ada ' + expiredQty + ' stok KADALUARSA terblokir' : '') + ').');
        }
      });

      const trxId = 'TRX-' + Math.floor(1000 + Math.random() * 9000);
      const noInv = 'INV-' + isoToday.replace(/-/g, '') + '-' + String(db.penjualan.length + 1).padStart(3, '0');
      let totalHpp = 0;
      let totalBrutoItems = 0;
      const outDetails = [];
      itemsReq.forEach((it) => {
        const faktor = Math.max(1, Number(it.faktor_konversi || 1));
        const qtyNeededBase = Number(it.qty || 1) * faktor;
        let rem = qtyNeededBase;
        const batches = db.stok_batch
          .filter((b) => (!b.cabang_id || b.cabang_id === cabang) && b.id_obat === it.id_obat && String(b.status_batch || 'AKTIF') === 'AKTIF' && Number(b.qty_sisa || 0) > 0 && String(b.tgl_kadaluarsa || '9999-12-31').slice(0, 10) >= isoToday)
          .sort((a, b) => String(a.tgl_kadaluarsa).localeCompare(String(b.tgl_kadaluarsa)));
        const obat = db.master_obat.find((o) => o.id_obat === it.id_obat) || {};
        const unitSell = Number(it.harga_jual || obat.harga_umum || 0) / faktor;
        const itemDiscTotal = Number(it.diskon_item || 0);
        batches.forEach((b) => {
          if (rem <= 0) return;
          const cut = Math.min(rem, Number(b.qty_sisa || 0));
          b.qty_sisa = Number(b.qty_sisa || 0) - cut;
          if (b.qty_sisa <= 0) { b.qty_sisa = 0; b.status_batch = 'HABIS'; }
          b.updated_at = nowIso;
          rem -= cut;
          totalHpp += cut * Number(b.hpp_beli || 0);
          const propDisc = Math.round(itemDiscTotal * (cut / qtyNeededBase));
          const brutoCut = Math.round(cut * unitSell);
          const netSub = Math.max(0, brutoCut - propDisc);
          totalBrutoItems += brutoCut;
          const detObj = {
            id_detail: 'DTL-' + Date.now() + Math.random().toString(36).slice(2, 5),
            id_transaksi: trxId,
            no_invoice: noInv,
            id_obat: it.id_obat,
            nama_dagang: obat.nama_dagang || it.id_obat,
            id_batch: b.id_batch,
            no_batch: b.no_batch || '-',
            tgl_kadaluarsa: b.tgl_kadaluarsa || '',
            qty: cut,
            satuan: obat.satuan_dasar || it.satuan,
            harga_jual: Math.round(unitSell),
            hpp_unit: Number(b.hpp_beli || 0),
            diskon_item: propDisc,
            subtotal_item: netSub,
            aturan_pakai: it.aturan_pakai || ''
          };
          db.detail_penjualan.push(detObj);
          outDetails.push(detObj);
          db.mutasi_stok.unshift({
            id_mutasi: 'MUT-' + Date.now() + Math.random().toString(36).slice(2, 5),
            timestamp: nowIso, cabang_id: cabang, id_obat: it.id_obat, nama_dagang: obat.nama_dagang || it.id_obat,
            id_batch: b.id_batch, no_batch: b.no_batch, tgl_kadaluarsa: b.tgl_kadaluarsa || '', jenis_mutasi: 'PENJUALAN_POS', qty_ubah: -cut,
            stok_akhir: b.qty_sisa, referensi_id: noInv, user_id: userId, catatan: 'Checkout POS FEFO ' + (d.channel || 'Toko Fisik')
          });
        });
      });
      const subCalc = d.subtotal !== undefined ? Number(d.subtotal) : totalBrutoItems;
      const diskonTotal = Number(d.diskon_total || 0);
      const pajakPpn = Number(d.pajak_ppn || 0);
      const grandTotal = d.grand_total !== undefined ? Math.max(0, Number(d.grand_total)) : Math.max(0, subCalc - diskonTotal + pajakPpn);
      const detailSplit = typeof d.detail_split === 'object' && d.detail_split !== null ? JSON.stringify(d.detail_split) : (d.detail_split || '');
      const trx = {
        id_transaksi: trxId,
        no_invoice: noInv,
        tanggal: nowIso,
        cabang_id: d.cabang_id || 'ONS-01',
        kasir_id: userId,
        channel: d.channel || 'Toko Fisik',
        id_member: d.id_member || 'UMUM',
        metode_bayar: d.metode_bayar || 'TUNAI',
        detail_split: detailSplit,
        subtotal: subCalc,
        diskon_total: diskonTotal,
        pajak_ppn: pajakPpn,
        grand_total: grandTotal,
        total_hpp: totalHpp,
        estimasi_margin: grandTotal - totalHpp,
        poin_didapat: Math.floor(grandTotal / 10000),
        status_trx: isPiutang ? 'BELUM_LUNAS' : 'LUNAS'
      };
      db.penjualan.unshift(trx);
      if (isPiutang) {
        if (!Array.isArray(db.piutang_pelanggan)) db.piutang_pelanggan = [];
        const dp = Math.min(grandTotal, Math.max(0, Number(d.dp_bayar || 0)));
        const sisa = Math.max(0, grandTotal - dp);
        const jtDefault = new Date(Date.now() + (Number(d.tempo_hari || 14) * 86400000)).toISOString().slice(0, 10);
        db.piutang_pelanggan.unshift({
          id_piutang: 'PTG-' + Date.now().toString().slice(-6),
          no_invoice: noInv,
          tanggal_trx: nowIso,
          tgl_jatuh_tempo: d.tgl_jatuh_tempo || jtDefault,
          cabang_id: trx.cabang_id,
          id_member: trx.id_member,
          nama_pelanggan: d.pelanggan_nama || 'Pelanggan Tempo',
          no_wa: d.send_wa_to || '',
          total_tagihan: grandTotal,
          total_dibayar: dp,
          sisa_piutang: sisa,
          plafon_kredit: Number(d.plafon_kredit !== undefined && d.plafon_kredit !== '' ? d.plafon_kredit : 2000000),
          status_piutang: sisa <= 0 ? 'LUNAS' : (dp > 0 ? 'SEBAGIAN' : 'BELUM_LUNAS'),
          dibuat_oleh: userNama,
          catatan: d.catatan_piutang || ('Tempo POS ' + noInv),
          updated_at: nowIso
        });
        if (dp > 0) {
          db.jurnal_keuangan.push({
            id_jurnal: 'JRN-' + Date.now(), tanggal: nowIso, cabang_id: trx.cabang_id,
            jenis_trx: 'MASUK_PIUTANG', kategori: 'DP Piutang POS', nominal: dp,
            metode: 'TUNAI', referensi_id: noInv, periode_bulan: nowIso.slice(0, 7),
            status_lock: 'TERBUKA', user_id: userId
          });
        }
      } else {
        db.jurnal_keuangan.push({
          id_jurnal: 'JRN-' + Date.now(),
          tanggal: nowIso,
          cabang_id: trx.cabang_id,
          jenis_trx: 'MASUK_PENJUALAN',
          kategori: trx.channel,
          nominal: trx.grand_total,
          metode: trx.metode_bayar,
          referensi_id: noInv,
          periode_bulan: nowIso.slice(0, 7),
          status_lock: 'TERBUKA',
          user_id: userId
        });
      }
      if (trx.id_member !== 'UMUM') {
        const mem = db.members.find((m) => m.id_member === trx.id_member);
        if (mem) {
          mem.poin_loyalitas = Math.max(0, Number(mem.poin_loyalitas || 0) - Number(d.redeem_poin || 0) + trx.poin_didapat);
        }
      }
      if (d.id_order) {
        const om = db.omnichannel_orders.find((o) => o.id_order === d.id_order);
        if (om) { om.status_order = 'SELESAI'; om.no_invoice_pos = noInv; }
      }
      if (d.send_wa_to) {
        db.antrian_notif.unshift({
          id_notif: 'NTF-' + Date.now().toString().slice(-5), created_at: nowIso, channel: 'WA',
          tujuan: String(d.send_wa_to).replace(/[^0-9]/g, ''), nama_penerima: d.pelanggan_nama || 'Pelanggan POS',
          jenis_event: 'STRUK_POS', referensi_id: noInv,
          pesan: 'Struk Digital Apotek ONS Farma No ' + noInv + ' Total Rp ' + Number(trx.grand_total).toLocaleString('id-ID'),
          status: 'ANTRI', percobaan: 0, catatan_error: '', sent_at: ''
        });
      }
      db.epoch++;
      saveDb(db);
      return { penjualan: maskRow(trx, role), detail: outDetails.map((dr) => maskRow(dr, role)), no_invoice: noInv };
    }

    if (action === 'stok.addBatch') {
      if (!d.id_obat || !d.no_batch || Number(d.qty_sisa || 0) <= 0 || !d.tgl_kadaluarsa) {
        throw new Error('Obat, No. Batch, Tanggal Kadaluarsa, dan Qty Awal (> 0) wajib diisi.');
      }
      const obat = db.master_obat.find((o) => o.id_obat === d.id_obat) || {};
      const qtyAdd = Number(d.qty_sisa || 0);
      const b = {
        id_batch: d.id_batch || ('BTH-' + Date.now().toString().slice(-6)),
        cabang_id: d.cabang_id || 'ONS-01',
        id_obat: d.id_obat,
        no_batch: String(d.no_batch).trim(),
        tgl_kadaluarsa: String(d.tgl_kadaluarsa).slice(0, 10),
        qty_sisa: qtyAdd,
        qty_karantina: 0,
        hpp_beli: Number(d.hpp_beli || obat.hpp_terakhir || obat.hpp_avg || 0),
        no_faktur_pbf: d.no_faktur_pbf || 'STOK-AWAL',
        status_batch: 'AKTIF',
        no_sp: d.no_sp || '-',
        updated_at: nowIso
      };
      db.stok_batch.unshift(b);
      db.mutasi_stok.unshift({
        id_mutasi: 'MUT-' + Date.now(),
        timestamp: nowIso, cabang_id: b.cabang_id, id_obat: b.id_obat, nama_dagang: obat.nama_dagang || b.id_obat,
        id_batch: b.id_batch, no_batch: b.no_batch, tgl_kadaluarsa: b.tgl_kadaluarsa,
        jenis_mutasi: d.jenis_mutasi || 'PEMBELIAN_PBF', qty_ubah: qtyAdd, stok_akhir: qtyAdd,
        referensi_id: b.no_faktur_pbf, user_id: userId, catatan: d.catatan || 'Input Batch Gudang Manual'
      });
      db.audit_log.unshift({ id_audit: 'AUD-' + Date.now(), timestamp: nowIso, user_id: userId, role, cabang_id: 'ONS-01', aksi: 'STOK_BATCH_MANUAL', entitas: 'STOK_BATCH', entitas_id: b.id_batch, diff_sesudah_json: JSON.stringify({ no_batch: b.no_batch, qty: qtyAdd }) });
      db.epoch++;
      saveDb(db);
      return { item: maskRow(b, role) };
    }

    if (action === 'stok.recallBatch') {
      const b = db.stok_batch.find((x) => x.id_batch === d.id_batch);
      if (!b) throw new Error('Batch tidak ditemukan.');
      const qtyQ = Number(b.qty_sisa || 0);
      b.qty_karantina = Number(b.qty_karantina || 0) + qtyQ;
      b.qty_sisa = 0;
      b.status_batch = 'KARANTINA_RECALL';
      b.updated_at = nowIso;
      const obat = db.master_obat.find((o) => o.id_obat === b.id_obat) || {};
      if (qtyQ > 0) {
        db.mutasi_stok.unshift({
          id_mutasi: 'MUT-' + Date.now(),
          timestamp: nowIso, cabang_id: 'ONS-01', id_obat: b.id_obat, nama_dagang: obat.nama_dagang || b.id_obat,
          id_batch: b.id_batch, no_batch: b.no_batch, tgl_kadaluarsa: b.tgl_kadaluarsa || '',
          jenis_mutasi: 'RECALL_KARANTINA', qty_ubah: -qtyQ, stok_akhir: 0,
          referensi_id: b.no_batch, user_id: userId, catatan: d.alasan || 'Recall Darurat & Karantina BPOM'
        });
      }
      const salesIds = new Set(db.detail_penjualan.filter((dt) => dt.id_batch === b.id_batch).map((dt) => dt.id_transaksi));
      const affected = db.penjualan.filter((p) => salesIds.has(p.id_transaksi)).map((p) => {
        const mem = db.members.find((m) => m.id_member === p.id_member);
        return { no_invoice: p.no_invoice, tanggal: p.tanggal, nama_pasien: mem ? mem.nama_pasien : 'Pasien Umum', no_hp: mem ? mem.no_hp : '' };
      });
      db.audit_log.unshift({ id_audit: 'AUD-' + Date.now(), timestamp: nowIso, user_id: userId, role, cabang_id: 'ONS-01', aksi: 'EMERGENCY_RECALL_BATCH', entitas: 'STOK_BATCH', entitas_id: b.id_batch, diff_sebelum_json: '{}', diff_sesudah_json: JSON.stringify({ batch: b.no_batch, karantina: qtyQ }) });
      db.epoch++;
      saveDb(db);
      return { quarantined_batch: maskRow(b, role), qty_karantina: qtyQ, affected_patients: affected };
    }

    if (action === 'coldchain.log') {
      const suhu = Number(d.suhu_celcius);
      const entry = {
        id_log_suhu: 'CC-' + Date.now(),
        timestamp: nowIso,
        cabang_id: 'ONS-01',
        id_kulkas: d.id_kulkas || 'CHILLER-VAKSIN-01',
        suhu_celcius: suhu,
        kelembapan: Number(d.kelembapan || 54),
        status_alarm: (suhu >= 2 && suhu <= 8) ? 'NORMAL' : 'ALARM_KELUAR_RENTANG',
        petugas_id: userNama,
        tindakan_korektif: d.tindakan_korektif || ((suhu >= 2 && suhu <= 8) ? '-' : 'Pengecekan termostat segera')
      };
      db.cold_chain.push(entry);
      saveDb(db);
      return { item: entry };
    }

    if (action === 'stok.opnameSave') {
      let adj = 0;
      (d.entries || []).forEach((ent) => {
        const b = db.stok_batch.find((x) => x.id_batch === ent.id_batch);
        if (b) {
          const lama = Number(b.qty_sisa || 0);
          const baru = Math.max(0, Number(ent.qty_fisik));
          const selisih = baru - lama;
          b.qty_sisa = baru;
          b.status_batch = baru > 0 ? 'AKTIF' : 'HABIS';
          b.updated_at = nowIso;
          adj++;
          if (selisih !== 0) {
            const obat = db.master_obat.find((o) => o.id_obat === b.id_obat) || {};
            db.mutasi_stok.unshift({
              id_mutasi: 'OPN-' + Date.now() + Math.random().toString(36).slice(2, 5),
              timestamp: nowIso, cabang_id: 'ONS-01', id_obat: b.id_obat, nama_dagang: obat.nama_dagang || b.id_obat,
              id_batch: b.id_batch, no_batch: b.no_batch, tgl_kadaluarsa: b.tgl_kadaluarsa || '',
              jenis_mutasi: 'OPNAME', qty_ubah: selisih, stok_akhir: baru,
              referensi_id: 'SO-' + isoToday, user_id: userId, catatan: ent.alasan || ('Stok Opname (Sistem: ' + lama + ' -> Fisik: ' + baru + ')')
            });
          }
        }
      });
      db.audit_log.unshift({ id_audit: 'AUD-' + Date.now(), timestamp: nowIso, user_id: userId, role, cabang_id: 'ONS-01', aksi: 'CYCLE_COUNT_OPNAME', entitas: 'STOK_BATCH', entitas_id: 'SO-' + isoToday, diff_sebelum_json: '{}', diff_sesudah_json: JSON.stringify({ jumlah: adj }) });
      db.epoch++;
      saveDb(db);
      return { adjusted: adj };
    }

    if (action === 'pbf.save') {
      if (!String(d.nama_pbf || '').trim()) throw new Error('Nama Supplier PBF wajib diisi.');
      const idPbf = String(d.id_pbf || '').trim() || ('PBF-' + Date.now().toString().slice(-5));
      const row = {
        id_pbf: idPbf,
        nama_pbf: String(d.nama_pbf).trim(),
        kode_cdob: d.kode_cdob || '-',
        npwp_pbf: d.npwp_pbf || '-',
        kontak_wa: d.kontak_wa || '',
        email_pbf: d.email_pbf || '',
        lead_time_hari: Math.max(1, Number(d.lead_time_hari || 3)),
        termin_hari: Math.max(0, Number(d.termin_hari !== undefined ? d.termin_hari : 30)),
        skor_sla: Math.min(100, Math.max(0, Number(d.skor_sla !== undefined ? d.skor_sla : 95))),
        status_pbf: String(d.status_pbf || 'AKTIF').toUpperCase()
      };
      const idx = db.supplier_pbf.findIndex((p) => p.id_pbf === idPbf);
      if (idx >= 0) db.supplier_pbf[idx] = Object.assign(db.supplier_pbf[idx], row);
      else db.supplier_pbf.push(row);
      db.audit_log.unshift({ id_audit: 'AUD-' + Date.now(), timestamp: nowIso, user_id: userId, role, cabang_id: 'ONS-01', aksi: idx >= 0 ? 'SUPPLIER_PBF_UPDATE' : 'SUPPLIER_PBF_CREATE', entitas: 'SUPPLIER_PBF', entitas_id: idPbf, diff_sesudah_json: JSON.stringify(row) });
      db.epoch++;
      saveDb(db);
      return { item: row };
    }

    if (action === 'sp.list') {
      return { items: (db.surat_pesanan || []).slice() };
    }

    if (action === 'sp.save') {
      const spItems = Array.isArray(d.items) ? d.items : [];
      if ((!d.id_pbf && !d.nama_pbf) || !spItems.length) {
        throw new Error('Supplier PBF dan minimal 1 item obat Surat Pesanan wajib diisi.');
      }
      const pbf = db.supplier_pbf.find((p) => p.id_pbf === d.id_pbf || String(p.nama_pbf || '').toLowerCase() === String(d.nama_pbf || '').toLowerCase());
      const idSp = d.id_sp || ('SP-' + Date.now().toString().slice(-6));
      db.doc_counter = (db.doc_counter || 13) + 1;
      const noSp = d.no_sp || ('SP/' + String(db.doc_counter).padStart(4, '0') + '/ONS/' + String(today.getMonth() + 1).padStart(2, '0') + '/' + today.getFullYear());
      const namaPbf = (pbf && pbf.nama_pbf) || d.nama_pbf || d.id_pbf;
      const golSp = String(d.golongan_sp || 'REGULER').toUpperCase();
      const estTotal = spItems.reduce((s, it) => s + (Number(it.qty || it.qty_order || 0) * Number(it.hpp_unit || it.hpp_terakhir || 0)), 0);

      let docObj = null;
      if (d.create_doc !== false) {
        docObj = {
          ID: 'DOC-' + Date.now().toString().slice(-5),
          ID_Templat: 'TPL-SP',
          KodeTemplat: d.kode_templat || 'SP_BPOM_5_GOL',
          NomorSurat: noSp,
          Judul: 'SP ' + golSp + ' — ' + namaPbf,
          DataJson: JSON.stringify({
            NOMOR_SURAT: noSp,
            TANGGAL: isoToday,
            GOLONGAN_SP: golSp,
            NAMA_PBF: namaPbf,
            DAFTAR_OBAT: spItems.map((it, idx) => (idx + 1) + '. ' + (it.nama_dagang || it.id_obat) + ' (' + (it.qty || it.qty_order || 0) + ' ' + (it.satuan_dasar || 'Unit') + ')').join('; '),
            ESTIMASI_TOTAL: estTotal
          }),
          Status: 'MENUNGGU_TTD',
          KodeVerifikasi: '',
          Pembuat: userNama,
          PenandaTangan: '',
          TglTerbit: '',
          Catatan: 'Terhubung dari Surat Pesanan ' + idSp
        };
        db.de_dokumen.unshift(docObj);
      }

      const row = {
        id_sp: idSp,
        no_sp: noSp,
        tanggal: d.tanggal || isoToday,
        cabang_id: d.cabang_id || 'ONS-01',
        id_pbf: (pbf && pbf.id_pbf) || d.id_pbf || '',
        nama_pbf: namaPbf,
        golongan_sp: golSp,
        items_json: JSON.stringify(spItems),
        estimasi_total: Math.round(estTotal),
        status_sp: d.status_sp || 'MENUNGGU_BARANG',
        id_dokumen: docObj ? docObj.ID : '',
        no_faktur_pbf: '',
        tgl_diterima: '',
        dibuat_oleh: userNama,
        catatan: d.catatan || ''
      };
      db.surat_pesanan.unshift(row);
      db.audit_log.unshift({ id_audit: 'AUD-' + Date.now(), timestamp: nowIso, user_id: userId, role, cabang_id: 'ONS-01', aksi: 'SURAT_PESANAN_CREATE', entitas: 'SURAT_PESANAN', entitas_id: idSp, diff_sesudah_json: JSON.stringify({ no_sp: noSp, pbf: namaPbf, jml_item: spItems.length }) });
      db.epoch++;
      saveDb(db);
      return { item: row, doc: docObj };
    }

    if (action === 'pengadaan.fakturSave') {
      if (!String(d.no_faktur_pbf || '').trim()) throw new Error('Nomor faktur PBF wajib diisi.');
      const netto = Number(d.netto_hutang || d.total_bruto || 0);
      const noSp = String(d.no_sp || '-').trim();
      const statusBayar = d.status_bayar || 'BELUM_LUNAS';
      const f = Object.assign({
        id_beli: 'BLI-' + Date.now(),
        no_sp: noSp,
        tgl_faktur: isoToday,
        tgl_jatuh_tempo: isoToday,
        netto_hutang: netto,
        sisa_hutang: d.sisa_hutang !== undefined ? Number(d.sisa_hutang) : (statusBayar === 'LUNAS' ? 0 : netto),
        status_bayar: statusBayar,
        status_bar: 'AKTIF'
      }, d);
      db.faktur_pbf.unshift(f);
      const items = Array.isArray(d.items) ? d.items : [];
      const hppAlerts = [];
      if (items.length) {
        // Hitung weighted average HPP & update MASTER_OBAT + Deteksi Kenaikan HPP
        const stokSebelum = {};
        db.stok_batch.forEach((b) => {
          if (String(b.status_batch || 'AKTIF') === 'AKTIF') {
            stokSebelum[b.id_obat] = (stokSebelum[b.id_obat] || 0) + Number(b.qty_sisa || 0);
          }
        });
        items.forEach((it, i) => {
          const qtyBase = Number(it.qty_dasar || it.qty || 0);
          if (qtyBase <= 0) return;
          const hppUnit = Number(it.hpp_unit || 0);
          const obat = db.master_obat.find((o) => o.id_obat === it.id_obat);
          if (obat && hppUnit > 0) {
            const oldQ = stokSebelum[it.id_obat] || 0;
            const prevRef = Number(obat.hpp_terakhir || obat.hpp_avg || 0);
            const oldAvg = Number(obat.hpp_avg || obat.hpp_terakhir || hppUnit);
            if (prevRef > 0 && hppUnit > prevRef) {
              const pct = Math.round(((hppUnit - prevRef) / prevRef) * 1000) / 10;
              hppAlerts.push({
                id_obat: it.id_obat,
                nama_dagang: obat.nama_dagang,
                old_hpp: prevRef,
                new_hpp: hppUnit,
                pct_naik: pct,
                harga_umum: Number(obat.harga_umum || 0),
                below_hpp: Number(obat.harga_umum || 0) > 0 && hppUnit >= Number(obat.harga_umum || 0)
              });
            }
            obat.hpp_terakhir = hppUnit;
            obat.hpp_avg = (oldQ + qtyBase) > 0 ? Math.round(((oldQ * oldAvg) + (qtyBase * hppUnit)) / (oldQ + qtyBase)) : hppUnit;
            obat.updated_at = nowIso;
            stokSebelum[it.id_obat] = oldQ + qtyBase;
          }
          const batchId = 'BTH-' + Date.now() + i;
          const bNew = {
            id_batch: batchId, cabang_id: d.cabang_id || cabang || 'ONS-01', id_obat: it.id_obat,
            no_batch: it.no_batch || ('NEW-' + i), tgl_kadaluarsa: it.tgl_kadaluarsa || '2028-12-31',
            qty_sisa: qtyBase, qty_karantina: 0, hpp_beli: hppUnit,
            no_faktur_pbf: d.no_faktur_pbf, status_batch: 'AKTIF', no_sp: noSp, updated_at: nowIso
          };
          db.stok_batch.push(bNew);
          db.mutasi_stok.unshift({
            id_mutasi: 'MSK-' + Date.now() + i,
            timestamp: nowIso, cabang_id: d.cabang_id || cabang || 'ONS-01', id_obat: it.id_obat, nama_dagang: (obat && obat.nama_dagang) || it.id_obat,
            id_batch: batchId, no_batch: bNew.no_batch, tgl_kadaluarsa: bNew.tgl_kadaluarsa,
            jenis_mutasi: 'PEMBELIAN_PBF', qty_ubah: qtyBase, stok_akhir: qtyBase,
            referensi_id: d.no_faktur_pbf, user_id: userId, catatan: 'Terima Faktur PBF ' + (d.id_pbf || '') + (noSp !== '-' ? ' (SP: ' + noSp + ')' : '')
          });
        });
      }
      if (d.id_sp || (noSp && noSp !== '-')) {
        const nextSpStatus = String(d.sp_status || '').toUpperCase() === 'DITERIMA_SEBAGIAN'
          ? 'DITERIMA_SEBAGIAN'
          : 'SELESAI_DITERIMA';
        (db.surat_pesanan || []).forEach((sp) => {
          if ((d.id_sp && sp.id_sp === d.id_sp) || (noSp !== '-' && sp.no_sp === noSp)) {
            sp.status_sp = nextSpStatus;
            sp.no_faktur_pbf = d.no_faktur_pbf;
            sp.tgl_diterima = f.tgl_faktur || isoToday;
          }
        });
      }
      if (f.status_bayar === 'LUNAS' && netto > 0) {
        db.jurnal_keuangan.push({
          id_jurnal: 'JRN-' + Date.now(), tanggal: nowIso, cabang_id: 'ONS-01',
          jenis_trx: 'KELUAR_PEMBELIAN_PBF', kategori: 'Pembayaran Faktur PBF Tunai/Lunas',
          nominal: netto, metode: d.metode_bayar || 'TRANSFER', referensi_id: d.no_faktur_pbf,
          periode_bulan: String(f.tgl_faktur || isoToday).slice(0, 7), status_lock: 'TERBUKA', user_id: userId
        });
      }
      db.audit_log.unshift({ id_audit: 'AUD-' + Date.now(), timestamp: nowIso, user_id: userId, role, cabang_id: d.cabang_id || cabang || 'ONS-01', aksi: 'FAKTUR_PBF_CREATE', entitas: 'PEMBELIAN_PBF', entitas_id: f.id_beli, diff_sesudah_json: JSON.stringify({ no_faktur: d.no_faktur_pbf, no_sp: noSp, netto, hpp_naik: hppAlerts.length }) });
      db.epoch++;
      saveDb(db);
      return { item: f, hpp_alerts: hppAlerts };
    }

    if (action === 'pengadaan.returBar') {
      const b = db.stok_batch.find((x) => x.id_batch === d.id_batch);
      if (!b) throw new Error('Batch retur tidak ditemukan.');
      const cut = Math.min(Number(b.qty_sisa || 0), Number(d.qty_retur || 0));
      if (cut <= 0) throw new Error('Stok batch habis atau qty retur tidak valid.');
      b.qty_sisa = Number(b.qty_sisa || 0) - cut;
      if (b.qty_sisa === 0) b.status_batch = 'RETUR_PBF';
      b.updated_at = nowIso;
      const val = cut * Number(b.hpp_beli || 0);
      const obat = db.master_obat.find((o) => o.id_obat === b.id_obat) || {};
      const noBar = d.no_bar || ('BAR-' + isoToday);
      db.mutasi_stok.unshift({
        id_mutasi: 'BAR-' + Date.now(),
        timestamp: nowIso, cabang_id: 'ONS-01', id_obat: b.id_obat, nama_dagang: obat.nama_dagang || b.id_obat,
        id_batch: b.id_batch, no_batch: b.no_batch, tgl_kadaluarsa: b.tgl_kadaluarsa || '',
        jenis_mutasi: 'RETUR_PBF', qty_ubah: -cut, stok_akhir: b.qty_sisa,
        referensi_id: noBar, user_id: userId, catatan: d.alasan || 'Retur ED/Rusak ke PBF'
      });
      if (d.id_beli || b.no_faktur_pbf) {
        const fTarget = db.faktur_pbf.find((f) => (d.id_beli && f.id_beli === d.id_beli) || (!d.id_beli && b.no_faktur_pbf && f.no_faktur_pbf === b.no_faktur_pbf));
        if (fTarget) {
          fTarget.sisa_hutang = Math.max(0, Number(fTarget.sisa_hutang || 0) - val);
          fTarget.status_bar = 'RETUR_DIBUAT';
        }
      }
      db.audit_log.unshift({ id_audit: 'AUD-' + Date.now(), timestamp: nowIso, user_id: userId, role, cabang_id: 'ONS-01', aksi: 'BAR_PBF_RETUR', entitas: 'STOK_BATCH', entitas_id: b.id_batch, diff_sesudah_json: JSON.stringify({ qty_retur: cut, potongan_hutang: val }) });
      db.epoch++;
      saveDb(db);
      return { ok: true, qty_retur: cut, nilai_potong_hutang: val };
    }

    if (action === 'klinis.save') {
      const item = Object.assign({ id_klinis: d.id_klinis || ('KLN-' + Date.now()), tanggal: nowIso, cabang_id: 'ONS-01', apj_pin_verified_by: userNama }, d);
      db.rekam_klinis.unshift(item);
      saveDb(db);
      return { item };
    }

    if (action === 'member.save') {
      const item = Object.assign({ id_member: d.id_member || ('MBR-' + Date.now().toString().slice(-4)), poin_loyalitas: 0, riwayat_skrining_json: '[]' }, d);
      const idx = db.members.findIndex((m) => m.id_member === item.id_member);
      if (idx >= 0) db.members[idx] = Object.assign(db.members[idx], item);
      else db.members.push(item);
      saveDb(db);
      return { item };
    }

    if (action === 'finance.saveJurnal') {
      const locked = db.jurnal_keuangan.some((j) => j.periode_bulan === d.periode_bulan && j.status_lock === 'TERKUNCI');
      if (locked) throw new Error('Periode sudah TERKUNCI!');
      const item = Object.assign({ id_jurnal: 'JRN-' + Date.now(), tanggal: nowIso, cabang_id: 'ONS-01', periode_bulan: nowIso.slice(0, 7), status_lock: 'TERBUKA', user_id: userId }, d);
      db.jurnal_keuangan.push(item);
      saveDb(db);
      return { item };
    }

    if (action === 'finance.lockPeriod') {
      let c = 0;
      db.jurnal_keuangan.forEach((j) => { if (j.periode_bulan === d.periode) { j.status_lock = 'TERKUNCI'; c++; } });
      saveDb(db);
      return { periode: d.periode, locked_rows: c };
    }

    if (action === 'shift.open') {
      if (!Array.isArray(db.shift_history)) db.shift_history = [];
      const openRow = db.shift_history.find((s) => String(s.status_shift || '').toUpperCase() === 'TERBUKA');
      if (openRow) return { shift: openRow, already_open: true };
      const row = {
        id_shift: 'SHF-' + Date.now().toString().slice(-6),
        cabang_id: d.cabang_id || 'ONS-01',
        tgl_buka: nowIso,
        tgl_tutup: '',
        kasir_id: d.kasir_nama || userNama,
        supervisor_id: '-',
        modal_awal: Math.max(0, Number(d.modal_awal || 0)),
        sistem_tunai: 0,
        sistem_qris: 0,
        sistem_transfer: 0,
        aktual_tunai: 0,
        selisih_kas: 0,
        catatan_handover: d.catatan || 'Buka Shift Kasir',
        status_shift: 'TERBUKA'
      };
      db.shift_history.unshift(row);
      db.audit_log.unshift({ id_audit: 'AUD-' + Date.now(), timestamp: nowIso, user_id: userId, role, cabang_id: 'ONS-01', aksi: 'SHIFT_OPENED', entitas: 'TUKAR_SHIFT_CLOSE', entitas_id: row.id_shift, diff_sesudah_json: JSON.stringify(row) });
      db.epoch++;
      saveDb(db);
      return { shift: row, already_open: false };
    }

    if (action === 'shift.close') {
      if (String(d.supervisor_pin) !== '123456') throw new Error('PIN Supervisor salah (Demo: 123456).');
      const modal = Number(d.modal_awal || 0);
      const sisTunai = Number(d.sistem_tunai || 0);
      const aktTunai = Number(d.aktual_tunai || 0);
      const selisih = aktTunai - (modal + sisTunai);
      if (!Array.isArray(db.shift_history)) db.shift_history = [];
      let row = db.shift_history.find((s) => (d.id_shift && s.id_shift === d.id_shift) || String(s.status_shift || '').toUpperCase() === 'TERBUKA');
      if (row) {
        Object.assign(row, {
          tgl_tutup: nowIso,
          supervisor_id: 'apt. Siti Rahma, S.Farm',
          modal_awal: modal,
          sistem_tunai: sisTunai,
          sistem_qris: Number(d.sistem_qris || 0),
          sistem_transfer: Number(d.sistem_transfer || 0),
          aktual_tunai: aktTunai,
          selisih_kas: selisih,
          catatan_handover: d.catatan_handover || row.catatan_handover || '',
          status_shift: 'DITUTUP'
        });
      } else {
        row = {
          id_shift: d.id_shift || ('SHF-' + Date.now()),
          cabang_id: d.cabang_id || 'ONS-01',
          tgl_buka: d.tgl_buka || nowIso,
          tgl_tutup: nowIso,
          kasir_id: userNama,
          supervisor_id: 'apt. Siti Rahma, S.Farm',
          modal_awal: modal,
          sistem_tunai: sisTunai,
          sistem_qris: Number(d.sistem_qris || 0),
          sistem_transfer: Number(d.sistem_transfer || 0),
          aktual_tunai: aktTunai,
          selisih_kas: selisih,
          catatan_handover: d.catatan_handover || '',
          status_shift: 'DITUTUP'
        };
        db.shift_history.unshift(row);
      }
      db.audit_log.unshift({ id_audit: 'AUD-' + Date.now(), timestamp: nowIso, user_id: userId, role, cabang_id: 'ONS-01', aksi: 'SHIFT_CLOSED', entitas: 'TUKAR_SHIFT_CLOSE', entitas_id: row.id_shift, diff_sesudah_json: JSON.stringify(row) });
      db.epoch++;
      saveDb(db);
      return { shift: row };
    }

    if (action === 'piutang.list') {
      return { items: (db.piutang_pelanggan || []).slice() };
    }

    if (action === 'piutang.pay') {
      const idP = String(d.id_piutang || '').trim();
      const noInv = String(d.no_invoice || '').trim();
      const nom = Number(d.nominal_bayar || 0);
      if ((!idP && !noInv) || nom <= 0) throw new Error('ID Piutang / No. Invoice dan nominal bayar (> 0) wajib diisi.');
      const target = (db.piutang_pelanggan || []).find((p) => (idP && p.id_piutang === idP) || (!idP && noInv && p.no_invoice === noInv));
      if (!target) throw new Error('Data piutang tidak ditemukan.');
      const sisa = Math.max(0, Number(target.sisa_piutang || 0));
      if (nom > sisa) throw new Error('Nominal bayar melebihi sisa piutang (' + sisa + ').');
      target.total_dibayar = Number(target.total_dibayar || 0) + nom;
      target.sisa_piutang = Math.max(0, sisa - nom);
      target.status_piutang = target.sisa_piutang <= 0 ? 'LUNAS' : 'SEBAGIAN';
      target.updated_at = nowIso;
      if (d.catatan) target.catatan = (target.catatan ? target.catatan + ' | ' : '') + d.catatan;
      db.jurnal_keuangan.push({
        id_jurnal: 'JRN-' + Date.now(), tanggal: nowIso, cabang_id: target.cabang_id || 'ONS-01',
        jenis_trx: 'MASUK_PIUTANG', kategori: 'Pelunasan Piutang ' + (target.nama_pelanggan || ''),
        nominal: nom, metode: d.metode || 'TRANSFER_BANK', referensi_id: target.no_invoice || target.id_piutang,
        periode_bulan: nowIso.slice(0, 7), status_lock: 'TERBUKA', user_id: userId
      });
      if (target.status_piutang === 'LUNAS' && target.no_invoice) {
        const inv = db.penjualan.find((p) => p.no_invoice === target.no_invoice);
        if (inv) inv.status_trx = 'LUNAS';
      }
      db.audit_log.unshift({ id_audit: 'AUD-' + Date.now(), timestamp: nowIso, user_id: userId, role, cabang_id: 'ONS-01', aksi: 'PIUTANG_PAYMENT', entitas: 'PIUTANG_PELANGGAN', entitas_id: target.id_piutang, diff_sesudah_json: JSON.stringify({ nominal: nom, sisa: target.sisa_piutang, status: target.status_piutang }) });
      db.epoch++;
      saveDb(db);
      return { item: target, nominal_bayar: nom };
    }

    if (action === 'resep.copyList') {
      return { items: (db.copy_resep || []).slice() };
    }

    if (action === 'resep.copySave') {
      const cItems = Array.isArray(d.items) ? d.items : [];
      if (!d.nama_pasien || !cItems.length) throw new Error('Nama pasien dan minimal 1 item obat wajib diisi untuk Salinan Resep (p.c.c).');
      if (!Array.isArray(db.copy_resep)) db.copy_resep = [];
      const row = {
        id_copy: d.id_copy || ('CR-' + Date.now().toString().slice(-6)),
        no_salinan: d.no_salinan || ('CR/' + String(db.copy_resep.length + 1).padStart(4, '0') + '/' + isoToday.slice(5, 7) + '/' + isoToday.slice(0, 4)),
        tanggal: d.tanggal || isoToday,
        cabang_id: d.cabang_id || 'ONS-01',
        no_resep_asal: d.no_resep_asal || ('R/' + isoToday.replace(/-/g, '')),
        tgl_resep_asal: d.tgl_resep_asal || isoToday,
        nama_dokter: d.nama_dokter || 'Dokter Penulis Resep',
        id_member: d.id_member || 'UMUM',
        nama_pasien: d.nama_pasien,
        umur_pasien: d.umur_pasien || '-',
        items_json: JSON.stringify(cItems),
        status_serah: d.status_serah || 'DET_ORIG',
        apoteker_nama: d.apoteker_nama || userNama,
        no_sipa: d.no_sipa || '19920412/SIPA_35.78/2025/1042',
        no_invoice_pos: d.no_invoice_pos || '',
        catatan: d.catatan || 'Salinan resep tebus sebagian (p.c.c)'
      };
      db.copy_resep.unshift(row);
      db.epoch++;
      saveDb(db);
      return { item: row };
    }

    if (action === 'sipnap.report') {
      const list = db.master_obat.filter((o) => ['NARKOTIKA', 'PSIKOTROPIKA', 'OOT'].includes(String(o.golongan_bpom).toUpperCase())).map((o) => {
        const s = db.stok_batch.filter((b) => b.id_obat === o.id_obat).reduce((sum, b) => sum + b.qty_sisa, 0);
        return { kode_kfa: o.kode_kfa, nama_obat: o.nama_dagang, golongan: o.golongan_bpom, satuan: o.satuan_dasar, stok_awal: s + 8, pemasukan_pbf: 0, pengeluaran_resep: 8, pemusnahan: 0, stok_akhir: s };
      });
      return { bulan: d.bulan || isoToday.slice(0, 7), rows: list };
    }

    // --- MODUL TAGIHAN & PEMBAYARAN (/gas-tagihan-pembayaran) ---
    if (action === 'billing.history') {
      return { items: db.pembayaran.map((p) => Object.assign({}, p, { Sig: p.NoKwitansi ? btoa(p.NoKwitansi).slice(0, 12).toUpperCase() : '' })) };
    }
    if (action === 'users.list') {
      const permsMap = db.rbac_permissions || {};
      return {
        items: (db.users || []).map((u) => Object.assign({}, u, { hak_akses: permsMap[u.id_user] || null })),
        rbac_permissions: permsMap,
        audit_system: db.audit_system || null
      };
    }
    if (action === 'users.save') {
      if (role !== 'Pemilik') throw new Error('AKSES DITOLAK: Hanya Pemilik yang dapat mengubah akun & hak akses.');
      const uname = String(d.username || '').trim();
      const nama = String(d.nama_lengkap || '').trim();
      if (!uname || !nama) throw new Error('Username dan nama lengkap wajib diisi.');
      const targetId = String(d.id_user || '').trim();
      let idx = targetId ? db.users.findIndex((u) => u.id_user === targetId) : -1;
      if (idx < 0) idx = db.users.findIndex((u) => u.username.toLowerCase() === uname.toLowerCase());
      const clash = db.users.find((u, i) => i !== idx && u.username.toLowerCase() === uname.toLowerCase());
      if (clash) throw new Error('Username "' + uname + '" sudah dipakai akun lain.');

      db.rbac_permissions = db.rbac_permissions || {};
      if (idx >= 0) {
        const old = Object.assign({}, db.users[idx]);
        const updatedUser = Object.assign({}, old, {
          username: uname,
          nama_lengkap: nama,
          role: d.role || old.role || 'Kasir',
          cabang_id: d.cabang_id || old.cabang_id || 'ONS-01',
          no_sipa: d.no_sipa !== undefined ? (d.no_sipa || '-') : old.no_sipa,
          masa_berlaku_sipa: d.masa_berlaku_sipa !== undefined ? (d.masa_berlaku_sipa || '-') : old.masa_berlaku_sipa,
          status_aktif: d.status_aktif || old.status_aktif || 'AKTIF'
        });
        db.users[idx] = updatedUser;
        if (Array.isArray(d.hak_akses)) {
          db.rbac_permissions[updatedUser.id_user] = d.hak_akses.slice();
        }
        if (updatedUser.role === 'APJ' || updatedUser.id_user === 'USR-002') {
          const pejApj = (db.de_pejabat || []).find((p) => p.UserId === updatedUser.id_user || p.ID === 'PEJ-01');
          if (pejApj) {
            pejApj.Nama = nama;
            pejApj.NoSIPA = updatedUser.no_sipa || '-';
            pejApj.Aktif = updatedUser.status_aktif === 'AKTIF' ? 'YA' : 'TIDAK';
          }
          if (db.audit_system && (db.audit_system.apj_user_id === updatedUser.id_user || updatedUser.id_user === 'USR-002')) {
            db.audit_system.apj_nama = nama;
            db.audit_system.apj_sipa = updatedUser.no_sipa || '-';
          }
        } else if (updatedUser.role === 'Pemilik' || updatedUser.id_user === 'USR-001') {
          const pejPem = (db.de_pejabat || []).find((p) => p.UserId === updatedUser.id_user || p.ID === 'PEJ-02');
          if (pejPem) {
            pejPem.Nama = nama;
            pejPem.NoSIPA = updatedUser.no_sipa || '-';
          }
          if (updatedUser.id_user === 'USR-001' && db.profil_usaha) {
            db.profil_usaha.nama_pemilik = nama;
          }
        }
        if (updatedUser.role === 'Kasir' && db.audit_system && (db.audit_system.kasir_user_id === updatedUser.id_user || updatedUser.id_user === 'USR-003')) {
          db.audit_system.kasir_nama = nama;
        }
        db.audit_log.unshift({
          id_audit: 'AUD-' + Date.now(), timestamp: nowIso, user_id: userId, role, cabang_id: updatedUser.cabang_id,
          aksi: 'USER_UPDATED', entitas: 'PENGGUNA_CABANG', entitas_id: updatedUser.id_user,
          diff_sebelum_json: JSON.stringify({ username: old.username, nama_lengkap: old.nama_lengkap, role: old.role }),
          diff_sesudah_json: JSON.stringify({ username: uname, nama_lengkap: nama, role: updatedUser.role, hak_akses_count: Array.isArray(d.hak_akses) ? d.hak_akses.length : 'default' })
        });
        db.epoch++;
        saveDb(db);
        return { ok: true, mode: 'UPDATED', id_user: updatedUser.id_user, username: uname, user: updatedUser, rbac_permissions: db.rbac_permissions, audit_system: db.audit_system };
      }

      if (!d.password_baru) throw new Error('Kata sandi awal wajib diisi untuk akun baru.');
      const newId = 'USR-' + String(db.users.length + 1).padStart(3, '0');
      const usr = {
        id_user: newId,
        username: uname,
        nama_lengkap: nama,
        role: d.role || 'Kasir',
        cabang_id: d.cabang_id || 'ONS-01',
        no_sipa: d.no_sipa || '-',
        masa_berlaku_sipa: d.masa_berlaku_sipa || '-',
        status_aktif: d.status_aktif || 'AKTIF'
      };
      db.users.push(usr);
      if (Array.isArray(d.hak_akses)) {
        db.rbac_permissions[newId] = d.hak_akses.slice();
      }
      db.audit_log.unshift({
        id_audit: 'AUD-' + Date.now(), timestamp: nowIso, user_id: userId, role, cabang_id: usr.cabang_id,
        aksi: 'USER_CREATED', entitas: 'PENGGUNA_CABANG', entitas_id: newId,
        diff_sesudah_json: JSON.stringify({ username: uname, nama_lengkap: nama, role: usr.role })
      });
      db.epoch++;
      saveDb(db);
      return { ok: true, mode: 'CREATED', id_user: newId, username: uname, user: usr, rbac_permissions: db.rbac_permissions, audit_system: db.audit_system };
    }
    if (action === 'users.changeCredentials') return { ok: true, pesan: 'Sandi/PIN diperbarui pada sesi lokal!' };
    if (action === 'system.seedStarterCatalog') return { ok: true, pesan: 'Data katalog awal sudah tersedia!' };
    if (action === 'obat.bulkImport') {
      (d.items || []).forEach((it, idx) => db.master_obat.push(Object.assign({ id_obat: 'OBT-IMP-' + Date.now() + idx, status_aktif: 'AKTIF' }, it)));
      db.epoch++;
      saveDb(db);
      return { inserted: (d.items || []).length, updated: 0 };
    }
    if (action === 'finance.payHutangPbf') {
      const f = db.faktur_pbf.find((x) => x.id_beli === d.id_beli);
      if (!f) throw new Error('Faktur tidak ditemukan.');
      const pay = Number(d.nominal_bayar || f.sisa_hutang || 0);
      f.sisa_hutang = Math.max(0, Number(f.sisa_hutang || 0) - pay);
      f.status_bayar = f.sisa_hutang === 0 ? 'LUNAS' : 'SEBAGIAN';
      db.jurnal_keuangan.push({ id_jurnal: 'JRN-' + Date.now(), tanggal: nowIso, cabang_id: 'ONS-01', jenis_trx: 'KELUAR_PEMBAYARAN_PBF', kategori: 'Bayar Faktur ' + f.no_faktur_pbf, nominal: pay, metode: 'TRANSFER', referensi_id: f.no_faktur_pbf, periode_bulan: nowIso.slice(0, 7), status_lock: 'TERBUKA', user_id: userId });
      saveDb(db);
      return { faktur: f };
    }
    if (action === 'billing.list') return { items: db.tagihan };
    if (action === 'billing.pending') return { items: db.pembayaran.filter((p) => p.Status === 'MENUNGGU_VERIFIKASI') };
    if (action === 'discount.list') return { items: db.potongan };
    if (action === 'discount.save') {
      const item = Object.assign({ ID: 'POT-' + Date.now().toString().slice(-4), Aktif: 'YA' }, d);
      db.potongan.push(item);
      saveDb(db);
      return { item };
    }
    if (action === 'billing.genBatch') {
      const perList = d.periodes || [isoToday.slice(0, 7)];
      let created = 0;
      perList.forEach((per) => {
        db.members.forEach((m) => {
          const dup = db.tagihan.some((t) => t.ID_Pasien === m.id_member && t.Periode === per && t.Status !== 'BATAL');
          if (dup) return;
          const nom = Number(d.nominal || 150000);
          db.tagihan.unshift({ ID: 'TGH-' + Math.random().toString(36).slice(2, 7).toUpperCase(), Periode: per, ID_Pasien: m.id_member, Nama_Pasien: m.nama_pasien, HP_Pasien: m.no_hp, Program: m.program_prb, Kategori: d.kategori || 'RESEP_PRB_KRONIS', Deskripsi: (d.deskripsi || 'Paket Terapi PRB Bulanan') + ' (' + per + ')', Nominal: nom, Potongan: 0, Netto: nom, Terbayar: 0, Status: 'BELUM_BAYAR', JatuhTempo: per + '-20', TglTerbit: isoToday, DibuatOleh: userNama });
          created++;
        });
      });
      saveDb(db);
      return { created };
    }
    if (action === 'billing.submitProof') {
      const grup = 'GRP-' + Date.now().toString().slice(-6);
      const bills = db.tagihan.filter((t) => (d.tagihan_ids || []).includes(t.ID));
      let rem = Number(d.nominal_bayar || 0);
      bills.forEach((b, idx) => {
        const sisa = Math.max(0, b.Netto - b.Terbayar);
        const alloc = idx === bills.length - 1 ? rem : Math.min(rem, sisa);
        rem -= alloc;
        db.pembayaran.unshift({ ID: 'PAY-' + Math.random().toString(36).slice(2, 7).toUpperCase(), GrupBayar: grup, ID_Tagihan: b.ID, NominalBayar: alloc, Metode: d.metode || 'TRANSFER_BANK', BuktiURL: d.bukti_url || 'demo://bukti-transfer', NoKwitansi: '', TglBayar: nowIso, Status: d.langsung_verif ? 'TERVERIFIKASI' : 'MENUNGGU_VERIFIKASI', Verifikator: d.langsung_verif ? userNama : '' });
        if (!d.langsung_verif) b.Status = 'MENUNGGU_VERIFIKASI';
      });
      saveDb(db);
      if (d.langsung_verif) return handleAction('billing.verifyPayment', { grup_bayar: grup, keputusan: 'TERIMA' }, tokenPayload);
      return { grup_bayar: grup, status: 'MENUNGGU_VERIFIKASI' };
    }
    if (action === 'billing.verifyPayment') {
      const pays = db.pembayaran.filter((p) => p.GrupBayar === d.grup_bayar);
      if (!pays.length) throw new Error('GrupBayar tidak ditemukan.');
      if (d.keputusan === 'TOLAK') {
        pays.forEach((p) => { p.Status = 'DITOLAK'; p.Verifikator = userNama; });
        saveDb(db);
        return { keputusan: 'TOLAK' };
      }
      db.kw_counter++;
      const kw = 'KW-' + today.getFullYear() + '-' + String(db.kw_counter).padStart(6, '0');
      pays.forEach((p) => {
        p.Status = 'TERVERIFIKASI';
        p.NoKwitansi = kw;
        p.Verifikator = userNama;
        p.TglVerifikasi = nowIso;
        const b = db.tagihan.find((t) => t.ID === p.ID_Tagihan);
        if (b) {
          b.Terbayar += Number(p.NominalBayar || 0);
          b.Status = b.Terbayar >= b.Netto ? 'LUNAS' : 'SEBAGIAN';
        }
      });
      saveDb(db);
      return { no_kwitansi: kw, sig: btoa(kw).slice(0, 12).toUpperCase(), keputusan: 'TERIMA' };
    }
    if (action === 'kwitansi.verify') {
      const pays = db.pembayaran.filter((p) => p.NoKwitansi === d.id && p.Status === 'TERVERIFIKASI');
      if (!pays.length) return { valid: false, no_kwitansi: d.id, alasan: 'Kwitansi tidak ditemukan atau belum lunas.' };
      return { valid: true, no_kwitansi: d.id, total_terbayar: pays.reduce((s, x) => s + x.NominalBayar, 0), tgl_verifikasi: pays[0].TglVerifikasi, verifikator: pays[0].Verifikator, metode: pays[0].Metode };
    }
    if (action === 'reminder.run') {
      const open = db.tagihan.filter((t) => t.Status === 'BELUM_BAYAR' || t.Status === 'SEBAGIAN');
      return { queued: open.length };
    }

    // --- MODUL DOC ENGINE (/gas-doc-engine) ---
    if (action === 'doc.templates') return { items: db.de_templat };
    if (action === 'doc.scanTemplate') {
      return { placeholders: ['NOMOR_SURAT', 'TANGGAL|tanggal', 'NAMA_PBF', 'TOTAL_NILAI|rupiah', 'TERBILANG|terbilang', 'NAMA_APJ', 'NO_SIPA'], blocks: ['ITEM_PESANAN'] };
    }
    if (action === 'doc.list') return { items: db.de_dokumen };
    if (action === 'doc.pejabatList') return { items: db.de_pejabat };
    if (action === 'doc.createDraft') {
      db.doc_counter++;
      const no = d.kode_templat.slice(0, 3) + '/' + String(db.doc_counter).padStart(4, '0') + '/ONS/' + String(today.getMonth() + 1).padStart(2, '0') + '/' + today.getFullYear();
      const docObj = { ID: 'DOC-' + Date.now().toString().slice(-5), ID_Templat: 'TPL', KodeTemplat: d.kode_templat, NomorSurat: no, Judul: d.judul || (d.kode_templat + ' - ' + no), DataJson: JSON.stringify(Object.assign({ NOMOR_SURAT: no, TANGGAL: isoToday }, d.data || {})), Status: 'MENUNGGU_TTD', KodeVerifikasi: '', Pembuat: userNama, PenandaTangan: '', TglTerbit: '' };
      db.de_dokumen.unshift(docObj);
      saveDb(db);
      return { item: docObj };
    }
    if (action === 'doc.signAndIssue') {
      if (String(d.pin) !== '123456') throw new Error('PIN Pejabat salah (Demo PIN: 123456).');
      const docObj = db.de_dokumen.find((x) => x.ID === d.id_dokumen);
      if (!docObj) throw new Error('Dokumen tidak ditemukan.');
      docObj.Status = 'TERBIT';
      docObj.KodeVerifikasi = ('ONS' + Math.random().toString(36).slice(2) + '98A7F').slice(0, 20).toUpperCase();
      docObj.PenandaTangan = userNama + ' (' + (tokenPayload.sipa || role) + ')';
      docObj.TglTerbit = nowIso;
      saveDb(db);
      return { ok: true, status: 'TERBIT', kode_verifikasi: docObj.KodeVerifikasi, nomor_surat: docObj.NomorSurat };
    }
    if (action === 'doc.verify') {
      const found = db.de_dokumen.find((x) => String(x.KodeVerifikasi || '').toUpperCase() === String(d.kode || '').toUpperCase() && x.Status === 'TERBIT');
      if (!found) return { valid: false, kode: d.kode, alasan: 'Kode verifikasi surat tidak ditemukan di arsip TERBIT.' };
      return { valid: true, kode: found.KodeVerifikasi, nomor_surat: found.NomorSurat, judul: found.Judul, penanda_tangan: found.PenandaTangan, tgl_terbit: found.TglTerbit };
    }

    // --- SETTINGS, AUDIT & MIGRASI ---
    if (action === 'settings.getSecretsMasked') return { secrets: db.secrets };
    if (action === 'settings.saveSecret') {
      const s = String(d.value || '');
      db.secrets[d.key] = s.length <= 8 ? '••••••' : (s.slice(0, 4) + '••••••' + s.slice(-3));
      saveDb(db);
      return { ok: true, key: d.key, masked: db.secrets[d.key] };
    }
    if (action === 'audit.list') return { items: db.audit_log };
    if (action === 'audit.getChecklist') return db.audit_system;
    if (action === 'audit.saveChecklist') {
      const cur = db.audit_system || {};
      const perms = (db.rbac_permissions && db.rbac_permissions[userId]) || [];
      const canEditMeta = role === 'Pemilik' || role === 'APJ' || perms.includes('settings:audit');
      const itemsIn = Array.isArray(d.items) ? d.items : (cur.items || []);
      const cleanItems = itemsIn.map((it, idx) => {
        const oldIt = (cur.items && cur.items[idx]) || {};
        const pjRole = String((it && it.pj_role) || oldIt.pj_role || 'APJ');
        return {
          id: String((it && it.id) || oldIt.id || ('AUDC-' + (idx + 1))),
          label: canEditMeta ? String((it && it.label) || oldIt.label || '').trim() : String(oldIt.label || (it && it.label) || '').trim(),
          checked: !!(it && it.checked),
          pj_role: pjRole,
          pj_nama: canEditMeta ? String((it && it.pj_nama) || (pjRole === 'Kasir' ? (d.kasir_nama || cur.kasir_nama) : (d.apj_nama || cur.apj_nama))).trim() : String(oldIt.pj_nama || ''),
          keterangan: String((it && it.keterangan) !== undefined ? it.keterangan : (oldIt.keterangan || '')).trim()
        };
      }).filter((x) => !!x.label);

      const apjUid = String(d.apj_user_id || cur.apj_user_id || 'USR-002').trim();
      const kasirUid = String(d.kasir_user_id || cur.kasir_user_id || 'USR-003').trim();
      const apjNama = canEditMeta && d.apj_nama !== undefined ? (String(d.apj_nama).trim() || cur.apj_nama) : cur.apj_nama;
      const apjSipa = canEditMeta && d.apj_sipa !== undefined ? (String(d.apj_sipa).trim() || cur.apj_sipa) : cur.apj_sipa;
      const kasirNama = canEditMeta && d.kasir_nama !== undefined ? (String(d.kasir_nama).trim() || cur.kasir_nama) : cur.kasir_nama;

      db.audit_system = {
        cabang_id: d.cabang_id || cabang || 'ONS-01',
        apj_user_id: apjUid,
        apj_nama: apjNama,
        apj_sipa: apjSipa,
        kasir_user_id: kasirUid,
        kasir_nama: kasirNama,
        catatan_audit: String(d.catatan_audit !== undefined ? d.catatan_audit : (cur.catatan_audit || '')).trim(),
        updated_at: nowIso,
        updated_by: userNama || userId,
        items: cleanItems
      };

      if (role === 'Pemilik' && d.sync_staff_accounts !== false) {
        const apjAcc = db.users.find((u) => u.id_user === apjUid) || db.users.find((u) => u.role === 'APJ');
        if (apjAcc && apjNama) {
          apjAcc.nama_lengkap = apjNama;
          if (apjSipa) apjAcc.no_sipa = apjSipa;
          const pej1 = (db.de_pejabat || []).find((p) => p.ID === 'PEJ-01' || p.UserId === apjAcc.id_user);
          if (pej1) {
            pej1.Nama = apjNama;
            if (apjSipa) pej1.NoSIPA = apjSipa;
          }
        }
        const kasirAcc = db.users.find((u) => u.id_user === kasirUid) || db.users.find((u) => u.role === 'Kasir');
        if (kasirAcc && kasirNama) {
          kasirAcc.nama_lengkap = kasirNama;
        }
      }

      db.audit_log.unshift({
        id_audit: 'AUD-' + Date.now(), timestamp: nowIso, user_id: userId, role, cabang_id: db.audit_system.cabang_id,
        aksi: 'AUDIT_CHECKLIST_UPDATED', entitas: 'SYSTEM_AUDIT', entitas_id: db.audit_system.cabang_id,
        diff_sebelum_json: JSON.stringify({ apj_nama: cur.apj_nama, kasir_nama: cur.kasir_nama }),
        diff_sesudah_json: JSON.stringify({ apj_nama: apjNama, kasir_nama: kasirNama, checked: cleanItems.filter((x) => x.checked).length + '/' + cleanItems.length })
      });
      db.epoch++;
      saveDb(db);
      return {
        ok: true,
        audit_system: db.audit_system,
        staff_directory: db.users.map((u) => ({
          id_user: u.id_user, username: u.username, nama_lengkap: u.nama_lengkap, role: u.role, cabang_id: u.cabang_id, no_sipa: u.no_sipa, status_aktif: u.status_aktif
        }))
      };
    }
    if (action === 'backup.driveSnapshot') return { ok: true, file_name: 'ONS_Farma_Backup_' + isoToday + '.json', file_url: '#' };
    if (action === 'migrasi.preview') {
      return {
        source_name: 'Database_Apotek_v9_Legacy (' + (d.source_id || 'SAMPLE') + ')',
        dry_run_summary: [
          { target_sheet: 'MASTER_OBAT', source_sheet: 'OBAT_LAMA', total_sumber: 342, akan_ditambah: 18, akan_diperbarui: 324, dilewati: 0 },
          { target_sheet: 'STOK_BATCH', source_sheet: 'BATCH_STOK', total_sumber: 512, akan_ditambah: 42, akan_diperbarui: 470, dilewati: 0 },
          { target_sheet: 'MEMBER_PRB_KRONIS', source_sheet: 'PASIEN_PRB', total_sumber: 129, akan_ditambah: 9, akan_diperbarui: 120, dilewati: 0 }
        ]
      };
    }
    if (action === 'migrasi.run') {
      return { ok: true, results: [{ target_sheet: 'MASTER_OBAT', inserted: 18, updated: 324 }, { target_sheet: 'STOK_BATCH', inserted: 42, updated: 470 }] };
    }

    // --- MODUL v11.0 (RETUR POS PIN, KARTU STOK, E-RX APJ, OMNICHANNEL, WA CRM & THERMAL STRUK) ---
    if (action === 'pos.details') {
      const trx = db.penjualan.find((p) => (d.no_invoice && p.no_invoice === d.no_invoice) || (d.id_transaksi && p.id_transaksi === d.id_transaksi));
      if (!trx) throw new Error('Transaksi POS tidak ditemukan.');
      const items = (db.detail_penjualan || []).filter((dt) => dt.id_transaksi === trx.id_transaksi).map((dt) => {
        const o = db.master_obat.find((x) => x.id_obat === dt.id_obat) || {};
        return Object.assign(maskRow(dt, role), { nama_dagang: o.nama_dagang || dt.id_obat, golongan_bpom: o.golongan_bpom || '' });
      });
      return { penjualan: maskRow(trx, role), items };
    }
    if (action === 'pos.voidReturn') {
      if (String(d.pin_override || '') !== '123456') throw new Error('PIN Otorisasi Retur/Void salah (Demo PIN: 123456).');
      const trx = db.penjualan.find((p) => (d.no_invoice && p.no_invoice === d.no_invoice) || (d.id_transaksi && p.id_transaksi === d.id_transaksi));
      if (!trx) throw new Error('Transaksi tidak ditemukan.');
      if (trx.status_trx === 'RETUR') throw new Error('Transaksi sudah berstatus RETUR.');
      const dets = (db.detail_penjualan || []).filter((dt) => dt.id_transaksi === trx.id_transaksi);
      dets.forEach((dt) => {
        const b = db.stok_batch.find((x) => x.id_batch === dt.id_batch);
        if (b) {
          b.qty_sisa = Number(b.qty_sisa || 0) + Number(dt.qty || 0);
          b.status_batch = 'AKTIF';
          const o = db.master_obat.find((x) => x.id_obat === dt.id_obat) || {};
          db.mutasi_stok.unshift({
            id_mutasi: 'MUT-' + Date.now() + Math.random().toString(36).slice(2, 4),
            timestamp: nowIso, cabang_id: 'ONS-01', id_obat: dt.id_obat, nama_dagang: o.nama_dagang || dt.id_obat,
            id_batch: b.id_batch, no_batch: b.no_batch, jenis_mutasi: 'RETUR_PENJUALAN', qty_ubah: Number(dt.qty || 0),
            stok_akhir: b.qty_sisa, referensi_id: trx.no_invoice, user_id: userId, catatan: 'Retur/Void PIN: ' + (d.alasan || '-')
          });
        }
      });
      trx.status_trx = 'RETUR';
      if (trx.id_member && trx.id_member !== 'UMUM' && Number(trx.poin_didapat || 0) > 0) {
        const mem = db.members.find((m) => m.id_member === trx.id_member);
        if (mem) mem.poin_loyalitas = Math.max(0, Number(mem.poin_loyalitas || 0) - Number(trx.poin_didapat || 0));
      }
      db.jurnal_keuangan.push({
        id_jurnal: 'JRN-RTR-' + Date.now(), tanggal: nowIso, cabang_id: 'ONS-01', jenis_trx: 'KELUAR_OPERASIONAL',
        kategori: 'Retur / Void POS (' + trx.no_invoice + ')', nominal: Number(trx.grand_total || 0),
        metode: trx.metode_bayar || 'TUNAI', referensi_id: trx.no_invoice, periode_bulan: nowIso.slice(0, 7), status_lock: 'TERBUKA', user_id: userId
      });
      db.audit_log.unshift({ id_audit: 'AUD-' + Date.now(), timestamp: nowIso, user_id: userId, role, cabang_id: 'ONS-01', aksi: 'POS_VOID_RETURN', entitas: 'PENJUALAN', entitas_id: trx.no_invoice, diff_sesudah_json: JSON.stringify({ alasan: d.alasan || '-', restored_items: dets.length }) });
      db.epoch++;
      saveDb(db);
      return { ok: true, no_invoice: trx.no_invoice, status_trx: 'RETUR', restored_items: dets.length, authorized_by: 'apt. Siti Rahma, S.Farm' };
    }
    if (action === 'stok.mutasiList') {
      return { items: (db.mutasi_stok || []).filter((m) => (!d.id_obat || m.id_obat === d.id_obat) && (!d.jenis_mutasi || m.jenis_mutasi === d.jenis_mutasi)) };
    }
    if (action === 'klinis.erxApprove') {
      if (String(d.pin || '') !== '123456') throw new Error('PIN APJ salah (Demo PIN: 123456).');
      const kl = db.rekam_klinis.find((x) => x.id_klinis === d.id_klinis);
      if (!kl) throw new Error('Rekam klinis tidak ditemukan.');
      kl.status_klinis = d.status_klinis || 'TERVERIFIKASI_APJ';
      kl.apj_pin_verified_by = 'apt. Siti Rahma, S.Farm (SIPA Verified)';
      if (d.catatan_apoteker) kl.soap_notes = (kl.soap_notes || '') + '\n[Verifikasi APJ] ' + d.catatan_apoteker;
      db.epoch++;
      saveDb(db);
      return { ok: true, item: kl };
    }
    if (action === 'omni.list') return { items: db.omnichannel_orders || [] };
    if (action === 'omni.save') {
      const ord = {
        id_order: 'ORD-' + Date.now().toString().slice(-5),
        no_order: 'ONL-' + isoToday.replace(/-/g, '') + '-' + String((db.omnichannel_orders || []).length + 1).padStart(2, '0'),
        tanggal: nowIso, cabang_id: 'ONS-01', channel: d.channel || 'WhatsApp Apotek', nama_pelanggan: d.nama_pelanggan,
        no_wa: String(d.no_wa || '').replace(/[^0-9]/g, ''), alamat: d.alamat || '',
        items_json: d.items_json || '[]', catatan: d.catatan || '', total_estimasi: Number(d.total_estimasi || 0),
        ongkir: Number(d.ongkir || 0), status_order: 'BARU', kurir: '', no_invoice_pos: '', petugas_id: userNama
      };
      db.omnichannel_orders.unshift(ord);
      db.epoch++;
      saveDb(db);
      return { item: ord };
    }
    if (action === 'omni.updateStatus') {
      const ord = (db.omnichannel_orders || []).find((x) => x.id_order === d.id_order);
      if (!ord) throw new Error('Order omnichannel tidak ditemukan.');
      ord.status_order = d.status_order || ord.status_order;
      if (d.kurir !== undefined) ord.kurir = d.kurir;
      if (d.no_invoice_pos) ord.no_invoice_pos = d.no_invoice_pos;
      if (d.kirim_wa) {
        db.antrian_notif.unshift({
          id_notif: 'NTF-' + Date.now().toString().slice(-5), created_at: nowIso, channel: 'WA',
          tujuan: ord.no_wa, nama_penerima: ord.nama_pelanggan, jenis_event: 'OMNI_STATUS',
          referensi_id: ord.no_order, pesan: 'Update Order ' + ord.no_order + ': ' + ord.status_order,
          status: 'ANTRI', percobaan: 0, catatan_error: '', sent_at: ''
        });
      }
      db.epoch++;
      saveDb(db);
      return { item: ord };
    }
    if (action === 'crm.list') return { items: db.crm_kontak || [] };
    if (action === 'crm.sync') {
      const seen = new Set((db.crm_kontak || []).map((c) => c.no_wa_62));
      let added = 0;
      db.members.forEach((m) => {
        const clean = String(m.no_hp || '').replace(/[^0-9]/g, '');
        const p62 = clean.startsWith('0') ? ('62' + clean.slice(1)) : clean;
        const p08 = clean.startsWith('62') ? ('0' + clean.slice(2)) : clean;
        if (p62 && !seen.has(p62)) {
          seen.add(p62);
          db.crm_kontak.push({ id_kontak: 'CRM-' + Date.now().toString().slice(-4) + added, nama: m.nama_pasien, no_wa_08: p08, no_wa_62: p62, segmen: m.program_prb === 'PRB_BPJS' ? 'PRB_KRONIS' : 'UMUM', catatan_medis: m.penyakit_kronis || '-', status_aktif: 'OPT_IN', tgl_gabung: isoToday, terakhir_dikirim: '' });
          added++;
        }
      });
      saveDb(db);
      return { synced: added, total: db.crm_kontak.length };
    }
    if (action === 'crm.save') {
      const raw = String(d.no_wa || '').replace(/[^0-9]/g, '');
      const p62 = raw.startsWith('0') ? ('62' + raw.slice(1)) : (raw.startsWith('62') ? raw : ('62' + raw));
      const p08 = '0' + p62.slice(2);
      const item = { id_kontak: 'CRM-' + Date.now().toString().slice(-5), nama: d.nama, no_wa_08: p08, no_wa_62: p62, segmen: d.segmen || 'UMUM', catatan_medis: d.catatan_medis || '', status_aktif: 'OPT_IN', tgl_gabung: isoToday, terakhir_dikirim: '' };
      db.crm_kontak.unshift(item);
      saveDb(db);
      return { item };
    }
    if (action === 'crm.toggleOptOut') {
      const c = (db.crm_kontak || []).find((x) => x.id_kontak === d.id_kontak);
      if (c) c.status_aktif = c.status_aktif === 'OPT_OUT' ? 'OPT_IN' : 'OPT_OUT';
      saveDb(db);
      return { ok: true, item: c };
    }
    if (action === 'crm.blastWa') {
      const targets = (db.crm_kontak || []).filter((c) => c.status_aktif !== 'OPT_OUT' && (!d.segmen || d.segmen === 'SEMUA' || c.segmen === d.segmen));
      targets.forEach((c, idx) => {
        db.antrian_notif.unshift({
          id_notif: 'NTF-BL-' + Date.now().toString().slice(-4) + idx, created_at: nowIso, channel: 'WA',
          tujuan: c.no_wa_62, nama_penerima: c.nama, jenis_event: 'BLAST_CRM', referensi_id: d.segmen || 'SEMUA',
          pesan: String(d.pesan || '').replace(/\{nama\}/gi, c.nama), status: 'ANTRI', percobaan: 0, catatan_error: '', sent_at: ''
        });
      });
      saveDb(db);
      return { queued: targets.length, segmen: d.segmen || 'SEMUA' };
    }
    if (action === 'notif.list') return { items: db.antrian_notif || [] };
    if (action === 'notif.processQueue') {
      let sent = 0;
      (db.antrian_notif || []).forEach((q) => {
        if (q.status === 'ANTRI') { q.status = 'TERKIRIM'; q.percobaan = Number(q.percobaan || 0) + 1; q.sent_at = nowIso; sent++; }
      });
      saveDb(db);
      return { ok: true, processed: sent, terkirim: sent, gagal: 0, mode: 'DEMO_SIMULASI' };
    }
    if (action === 'struk.templates') return { items: db.st_template || [] };
    if (action === 'struk.saveTemplate') {
      const idx = (db.st_template || []).findIndex((t) => t.kode === d.kode || t.id_tpl === d.id_tpl);
      const tpl = { id_tpl: d.id_tpl || ('TPL-' + Date.now().toString().slice(-4)), kode: d.kode || 'STRUK_CUSTOM', nama: d.nama || 'Template Custom', lebar_mm: Number(d.lebar_mm || 58), template_teks: d.template_teks || '', aktif: 'YA', updated_at: isoToday };
      if (idx >= 0) db.st_template[idx] = tpl;
      else db.st_template.push(tpl);
      saveDb(db);
      return { item: tpl };
    }

    if (action === 'profil.get') {
      return Object.assign({}, defaultProfilUsaha(), db.profil_usaha || {});
    }
    if (action === 'profil.save') {
      if (!String(d.nama_pemilik || '').trim() || !String(d.nama_usaha || '').trim()) {
        throw new Error('Nama Pemilik dan Nama Tempat Usaha wajib diisi.');
      }
      const confName = (role === 'Pemilik' || /hendra\s+wijaya/i.test(String(userNama || '')))
        ? String(d.nama_pemilik || '').trim()
        : (userNama || d.nama_pemilik);
      const next = Object.assign({}, defaultProfilUsaha(), db.profil_usaha || {}, d, {
        terkonfirmasi: (d.terkonfirmasi === false || d.terkonfirmasi === 'BELUM') ? 'BELUM' : 'YA',
        dikonfirmasi_oleh: confName,
        dikonfirmasi_pada: nowIso,
        updated_at: nowIso
      });
      db.profil_usaha = next;
      if (d.sync_akun_pemilik !== false) {
        const uPem = db.users.find((u) => u.id_user === 'USR-001' || u.username === 'pemilik');
        if (uPem) {
          uPem.nama_lengkap = next.nama_pemilik;
          if (next.sipa_pemilik) uPem.no_sipa = next.sipa_pemilik;
        }
        const pejPem = (db.de_pejabat || []).find((p) => p.ID === 'PEJ-02');
        if (pejPem) {
          pejPem.Nama = next.nama_pemilik;
          pejPem.Jabatan = next.jabatan_pemilik;
          pejPem.NoSIPA = next.sipa_pemilik || '-';
          if (next.email_pemilik) pejPem.Email = next.email_pemilik;
        }
      }
      db.audit_log.unshift({
        id_audit: 'AUD-' + Date.now(), timestamp: nowIso, user_id: userId, role, cabang_id: next.cabang_id || 'ONS-01',
        aksi: 'STORE_PROFILE_CONFIRMED', entitas: 'PROFIL_USAHA', entitas_id: next.cabang_id || 'ONS-01',
        diff_sesudah_json: JSON.stringify({ nama_pemilik: next.nama_pemilik, nama_usaha: next.nama_usaha, terkonfirmasi: next.terkonfirmasi }),
        device_info: 'Browser PWA'
      });
      db.epoch++;
      saveDb(db);
      return { ok: true, profile: next };
    }

    if (action === 'pengadaan.smartDefecta' || action === 'defecta.forecast') {
      return _computeSmartDefectaDemo(db, cabang);
    }

    if (action === 'cabang.stockCompare') {
      return _computeBranchCompareDemo(db, d.id_obat || '');
    }

    if (action === 'cabang.transferList') {
      const brFilter = d.cabang_id || '';
      const rows = (db.mutasi_cabang || []).filter((r) => !brFilter || r.cabang_asal === brFilter || r.cabang_tujuan === brFilter);
      return { items: rows, stock_compare: _computeBranchCompareDemo(db, '') };
    }

    if (action === 'cabang.transferSend') {
      const asal = String(d.cabang_asal || cabang || 'ONS-01').trim();
      const tujuan = String(d.cabang_tujuan || '').trim();
      const reqItems = Array.isArray(d.items) && d.items.length
        ? d.items
        : (d.id_obat ? [{ id_obat: d.id_obat, qty: Number(d.qty_kirim || d.qty || 1) }] : []);
      if (!tujuan || asal === tujuan) throw new Error('Cabang tujuan mutasi wajib berbeda dari cabang asal (' + asal + ').');
      if (!reqItems.length) throw new Error('Pilih minimal 1 produk untuk dikirim antar-cabang.');
      if (!Array.isArray(db.mutasi_cabang)) db.mutasi_cabang = [];
      const cutMap = {};
      const shippedLines = [];
      let totalQty = 0;
      let totalHppVal = 0;

      reqItems.forEach((reqIt) => {
        const need = Math.max(1, Number(reqIt.qty_dasar || reqIt.qty || 0));
        const obat = db.master_obat.find((o) => o.id_obat === reqIt.id_obat) || {};
        const avail = db.stok_batch
          .filter((b) => (b.cabang_id || 'ONS-01') === asal && b.id_obat === reqIt.id_obat && String(b.status_batch || 'AKTIF') === 'AKTIF' && Number(b.qty_sisa || 0) > 0 && String(b.tgl_kadaluarsa || '9999-12-31').slice(0, 10) >= isoToday)
          .sort((a, b) => String(a.tgl_kadaluarsa).localeCompare(String(b.tgl_kadaluarsa)));
        const freeTotal = avail.reduce((s, b) => s + Math.max(0, Number(b.qty_sisa || 0) - Number(cutMap[b.id_batch] || 0)), 0);
        if (freeTotal < need) {
          throw new Error('Stok cabang ' + asal + ' tidak cukup untuk mutasi ' + (obat.nama_dagang || reqIt.id_obat) + ' (tersedia ' + freeTotal + ', diminta ' + need + ').');
        }
        let rem = need;
        avail.forEach((b) => {
          if (rem <= 0) return;
          const used = Number(cutMap[b.id_batch] || 0);
          const free = Number(b.qty_sisa || 0) - used;
          if (free <= 0) return;
          const take = Math.min(rem, free);
          cutMap[b.id_batch] = used + take;
          rem -= take;
          const hppUnit = Number(b.hpp_beli || obat.hpp_avg || 0);
          totalQty += take;
          totalHppVal += take * hppUnit;
          shippedLines.push({
            id_obat: reqIt.id_obat,
            nama_dagang: obat.nama_dagang || reqIt.id_obat,
            satuan_dasar: obat.satuan_dasar || 'Unit',
            id_batch_asal: b.id_batch,
            no_batch: b.no_batch,
            tgl_kadaluarsa: b.tgl_kadaluarsa,
            hpp_beli: hppUnit,
            qty: take
          });
        });
      });

      const idTrf = 'TRF-' + Date.now().toString().slice(-6);
      const noSj = 'SJ-MUT/' + isoToday.replace(/-/g, '') + '/' + idTrf.slice(-4);
      Object.keys(cutMap).forEach((bId) => {
        const b = db.stok_batch.find((x) => x.id_batch === bId);
        if (!b) return;
        const take = cutMap[bId];
        b.qty_sisa = Math.max(0, Number(b.qty_sisa || 0) - take);
        if (b.qty_sisa <= 0) { b.qty_sisa = 0; b.status_batch = 'HABIS'; }
        b.updated_at = nowIso;
        const obat = db.master_obat.find((o) => o.id_obat === b.id_obat) || {};
        db.mutasi_stok.unshift({
          id_mutasi: 'MSK-' + Date.now() + Math.random().toString(36).slice(2, 5),
          timestamp: nowIso, cabang_id: asal, id_obat: b.id_obat, nama_dagang: obat.nama_dagang || b.id_obat,
          id_batch: b.id_batch, no_batch: b.no_batch, tgl_kadaluarsa: b.tgl_kadaluarsa || '',
          jenis_mutasi: 'TRANSFER_KELUAR_CABANG', qty_ubah: -take, stok_akhir: b.qty_sisa,
          referensi_id: noSj, user_id: userId, catatan: 'Kirim mutasi ke cabang ' + tujuan
        });
      });

      const row = {
        id_transfer: idTrf,
        no_surat_jalan: noSj,
        tanggal_kirim: nowIso,
        tanggal_terima: '',
        cabang_asal: asal,
        cabang_tujuan: tujuan,
        items_json: JSON.stringify(shippedLines),
        total_qty_dasar: totalQty,
        estimasi_nilai_hpp: Math.round(totalHppVal),
        status_transfer: 'DIKIRIM',
        dikirim_oleh: userNama,
        diterima_oleh: '',
        catatan: d.catatan || ''
      };
      db.mutasi_cabang.unshift(row);
      db.audit_log.unshift({
        id_audit: 'AUD-' + Date.now(), timestamp: nowIso, user_id: userId, role, cabang_id: asal,
        aksi: 'TRANSFER_CABANG_KIRIM', entitas: 'MUTASI_ANTAR_CABANG', entitas_id: idTrf,
        diff_sesudah_json: JSON.stringify({ no_surat_jalan: noSj, tujuan, total_qty: totalQty })
      });
      db.epoch++;
      saveDb(db);
      return { item: row };
    }

    if (action === 'cabang.transferReceive') {
      const idTrf = String(d.id_transfer || '').trim();
      if (!idTrf) throw new Error('ID transfer antar-cabang wajib diisi.');
      const trfRow = (db.mutasi_cabang || []).find((r) => r.id_transfer === idTrf);
      if (!trfRow) throw new Error('Data mutasi antar-cabang tidak ditemukan.');
      if (String(trfRow.status_transfer || '') === 'DITERIMA') {
        throw new Error('Mutasi cabang ini sudah berstatus DITERIMA sebelumnya.');
      }
      trfRow.status_transfer = 'DITERIMA';
      trfRow.tanggal_terima = nowIso;
      trfRow.diterima_oleh = userNama;
      if (d.catatan) trfRow.catatan = (trfRow.catatan ? trfRow.catatan + ' | ' : '') + d.catatan;

      let lines = [];
      try { lines = JSON.parse(trfRow.items_json || '[]'); } catch (e) {}
      let batchesAdded = 0;
      lines.forEach((ln, idx) => {
        const qty = Number(ln.qty || 0);
        if (qty <= 0) return;
        const bId = 'BTH-TRF-' + Date.now().toString().slice(-5) + idx;
        db.stok_batch.push({
          id_batch: bId,
          cabang_id: trfRow.cabang_tujuan,
          id_obat: ln.id_obat,
          no_batch: ln.no_batch || 'TRF-BATCH',
          tgl_kadaluarsa: ln.tgl_kadaluarsa || '2028-12-31',
          qty_sisa: qty,
          qty_karantina: 0,
          hpp_beli: Number(ln.hpp_beli || 0),
          no_faktur_pbf: trfRow.no_surat_jalan,
          status_batch: 'AKTIF',
          no_sp: trfRow.id_transfer,
          updated_at: nowIso
        });
        db.mutasi_stok.unshift({
          id_mutasi: 'MSK-' + Date.now() + idx,
          timestamp: nowIso, cabang_id: trfRow.cabang_tujuan, id_obat: ln.id_obat, nama_dagang: ln.nama_dagang || ln.id_obat,
          id_batch: bId, no_batch: ln.no_batch || 'TRF-BATCH', tgl_kadaluarsa: ln.tgl_kadaluarsa || '2028-12-31',
          jenis_mutasi: 'TRANSFER_MASUK_CABANG', qty_ubah: qty, stok_akhir: qty,
          referensi_id: trfRow.no_surat_jalan, user_id: userId,
          catatan: 'Terima mutasi dari cabang ' + trfRow.cabang_asal
        });
        batchesAdded++;
      });
      db.audit_log.unshift({
        id_audit: 'AUD-' + Date.now(), timestamp: nowIso, user_id: userId, role, cabang_id: trfRow.cabang_tujuan,
        aksi: 'TRANSFER_CABANG_TERIMA', entitas: 'MUTASI_ANTAR_CABANG', entitas_id: idTrf,
        diff_sesudah_json: JSON.stringify({ no_surat_jalan: trfRow.no_surat_jalan, asal: trfRow.cabang_asal, diterima: userNama })
      });
      db.epoch++;
      saveDb(db);
      return { item: trfRow, batches_added: batchesAdded };
    }

    if (action === 'pemeriksaan.list') {
      const items = (db.pemeriksaan_pasien || []).filter((r) => !cabang || cabang === 'ALL' || !r.cabang_id || r.cabang_id === cabang)
        .slice().sort((a, b) => String(b.tanggal || '').localeCompare(String(a.tanggal || '')));
      return { items };
    }

    if (action === 'pemeriksaan.save') {
      if (!d || !String(d.nama_pasien || '').trim()) {
        throw new Error('Nama pasien wajib diisi.');
      }
      const sistol = Number(d.tensi_sistol || 0);
      const diastol = Number(d.tensi_diastol || 0);
      const gulaVal = Number(d.gula_darah || 0);
      const kolVal = Number(d.kolesterol_total || 0);
      const auVal = Number(d.asam_urat || 0);
      if (!((sistol > 0 && diastol > 0) || gulaVal > 0 || kolVal > 0 || auVal > 0)) {
        throw new Error('Isi minimal satu hasil pemeriksaan (Tensi, Gula Darah, Kolesterol, atau Asam Urat).');
      }
      if (!Array.isArray(db.pemeriksaan_pasien)) db.pemeriksaan_pasien = [];
      const id = String(d.id_periksa || ('CHK-' + Date.now().toString().slice(-6)));
      const existIdx = db.pemeriksaan_pasien.findIndex((x) => x.id_periksa === id);
      const existing = existIdx >= 0 ? db.pemeriksaan_pasien[existIdx] : null;
      const jk = String(d.jenis_kelamin || (existing && existing.jenis_kelamin) || 'L').toUpperCase() === 'P' ? 'P' : 'L';
      const usia = Number(d.usia_tahun !== undefined && d.usia_tahun !== '' ? d.usia_tahun : ((existing && existing.usia_tahun) || 0));
      const isYouth = usia > 0 && usia < 20;
      const gulaJenisRaw = String(d.gula_jenis || (existing && existing.gula_jenis) || 'GDS').toUpperCase();
      const gulaJenis = (gulaJenisRaw === 'GDP' || gulaJenisRaw === 'GD2PP') ? gulaJenisRaw : 'GDS';

      let statusTensi = '';
      if (sistol > 0 && diastol > 0) {
        if (sistol < 90 || diastol < 60) statusTensi = 'HIPOTENSI';
        else if (sistol >= 180 || diastol >= 120) statusTensi = 'KRISIS_HIPERTENSI';
        else if (sistol >= 140 || diastol >= 90) statusTensi = 'HIPERTENSI_2';
        else if (sistol >= 130 || diastol >= 80) statusTensi = 'HIPERTENSI_1';
        else if (sistol >= 120 && diastol < 80) statusTensi = 'MENINGKAT';
        else statusTensi = 'NORMAL';
      }
      const nadiVal = Number(d.nadi_bpm || 0);
      let statusNadi = '';
      if (nadiVal > 0) {
        if (nadiVal < 60) statusNadi = 'BRADIKARDIA';
        else if (nadiVal > 100) statusNadi = 'TAKIKARDIA';
        else statusNadi = 'NORMAL';
      }
      let statusGula = '';
      if (gulaVal > 0) {
        if (gulaVal < 70) statusGula = 'HIPOGLIKEMIA';
        else if (gulaJenis === 'GDP') statusGula = gulaVal >= 126 ? 'TINGGI' : (gulaVal >= 100 ? 'WASPADA' : 'NORMAL');
        else statusGula = gulaVal >= 200 ? 'TINGGI' : (gulaVal >= 140 ? 'WASPADA' : 'NORMAL');
      }
      let statusKol = '';
      if (kolVal > 0) {
        const kolWarn = isYouth ? 170 : 200;
        const kolHigh = isYouth ? 200 : 240;
        statusKol = kolVal >= kolHigh ? 'TINGGI' : (kolVal >= kolWarn ? 'BATAS_TINGGI' : 'NORMAL');
      }
      let statusAu = '';
      if (auVal > 0) {
        const hi = jk === 'P' ? 6.0 : 7.0;
        const lo = jk === 'P' ? 2.4 : 3.4;
        statusAu = auVal > hi ? 'TINGGI' : (auVal < lo ? 'RENDAH' : 'NORMAL');
      }

      const bbVal = Number(d.berat_badan || (existing && existing.berat_badan) || 0);
      const tbVal = Number(d.tinggi_badan || (existing && existing.tinggi_badan) || 0);
      const imtBmi = (bbVal > 0 && tbVal >= 50) ? Math.round((bbVal / Math.pow(tbVal / 100, 2)) * 10) / 10 : '';
      let statusBmi = '';
      if (imtBmi) {
        if (imtBmi < 18.5) statusBmi = 'KURUS';
        else if (imtBmi <= 25.0) statusBmi = 'NORMAL';
        else if (imtBmi <= 27.0) statusBmi = 'OVERWEIGHT';
        else statusBmi = 'OBESITAS';
      }
      const allSt = [statusTensi, statusGula, statusKol, statusAu].filter(Boolean);
      const abnCnt = allSt.filter((s) => s !== 'NORMAL').length + (statusNadi && statusNadi !== 'NORMAL' ? 1 : 0);
      let tingkatRisiko = 'NORMAL';
      if (
        statusTensi === 'KRISIS_HIPERTENSI' ||
        (sistol > 0 && sistol < 80) ||
        (diastol > 0 && diastol < 50) ||
        (nadiVal > 0 && nadiVal < 45) ||
        nadiVal >= 130 ||
        statusGula === 'HIPOGLIKEMIA' ||
        gulaVal >= 300
      ) {
        tingkatRisiko = 'KRISIS_RUJUK';
      } else if (statusTensi === 'HIPERTENSI_2' || statusGula === 'TINGGI' || statusKol === 'TINGGI' || statusAu === 'TINGGI' || abnCnt >= 2) {
        tingkatRisiko = 'TINGGI_KONTROL';
      } else if (abnCnt >= 1) {
        tingkatRisiko = 'PANTAU';
      }

      let waNorm = String(d.no_wa || (existing && existing.no_wa) || '').replace(/[^0-9]/g, '');
      if (waNorm.startsWith('0')) waNorm = '62' + waNorm.slice(1);
      else if (waNorm.startsWith('8')) waNorm = '62' + waNorm;
      const biaya = Number(d.biaya_cek || 0);

      const row = {
        id_periksa: id,
        tanggal: d.tanggal || (existing && existing.tanggal) || nowIso,
        cabang_id: d.cabang_id || cabang || 'ONS-01',
        id_member: String(d.id_member || '').trim(),
        nama_pasien: String(d.nama_pasien).trim(),
        no_wa: waNorm || String(d.no_wa || '').trim(),
        jenis_kelamin: jk,
        usia_tahun: d.usia_tahun !== undefined && d.usia_tahun !== '' ? Number(d.usia_tahun) : '',
        berat_badan: bbVal > 0 ? bbVal : '',
        tinggi_badan: tbVal >= 50 ? tbVal : '',
        imt_bmi: imtBmi,
        tensi_sistol: (sistol > 0 && diastol > 0) ? sistol : '',
        tensi_diastol: (sistol > 0 && diastol > 0) ? diastol : '',
        nadi_bpm: Number(d.nadi_bpm || 0) > 0 ? Number(d.nadi_bpm) : '',
        gula_jenis: gulaVal > 0 ? gulaJenis : '',
        gula_darah: gulaVal > 0 ? gulaVal : '',
        kolesterol_total: kolVal > 0 ? kolVal : '',
        asam_urat: auVal > 0 ? auVal : '',
        status_tensi: statusTensi,
        status_nadi: statusNadi,
        status_gula: statusGula,
        status_kolesterol: statusKol,
        status_asam_urat: statusAu,
        status_bmi: statusBmi,
        tingkat_risiko: tingkatRisiko,
        riwayat_terapi: String(d.riwayat_terapi !== undefined ? d.riwayat_terapi : ((existing && existing.riwayat_terapi) || '')).trim(),
        keluhan_catatan: String(d.keluhan_catatan || '').trim(),
        saran_apoteker: String(d.saran_apoteker || '').trim(),
        tgl_kontrol: String(d.tgl_kontrol !== undefined ? d.tgl_kontrol : ((existing && existing.tgl_kontrol) || '')).trim().slice(0, 10),
        biaya_cek: biaya,
        petugas: d.petugas || userNama,
        wa_terkirim: d.queue_wa && waNorm ? ('ANTRIAN_FONNTE (' + nowIso.slice(0, 16).replace('T', ' ') + ')') : ((existing && existing.wa_terkirim) || 'BELUM'),
        updated_at: nowIso
      };

      if (existIdx >= 0) {
        db.pemeriksaan_pasien[existIdx] = row;
      } else {
        db.pemeriksaan_pasien.unshift(row);
        if (biaya > 0 && !d.skip_jurnal) {
          db.jurnal_keuangan.unshift({
            id_jurnal: 'JRN-' + Date.now(), tanggal: nowIso, cabang_id: row.cabang_id,
            jenis_trx: 'MASUK_LAYANAN_KLINIS', kategori: 'Pemeriksaan Kesehatan (POCT)',
            nominal: biaya, metode: d.metode_bayar || 'TUNAI', referensi_id: id,
            periode_bulan: nowIso.slice(0, 7), status_lock: 'TERBUKA', user_id: userId
          });
        }
      }

      if (row.id_member) {
        const mbr = (db.members || []).find((m) => m.id_member === row.id_member);
        if (mbr) {
          let arr = [];
          try { arr = JSON.parse(mbr.riwayat_skrining_json || '[]'); } catch (e) { arr = []; }
          if (!Array.isArray(arr)) arr = [];
          const snap = {
            tgl: String(row.tanggal).slice(0, 10),
            td: row.tensi_sistol ? (row.tensi_sistol + '/' + row.tensi_diastol) : '',
            gds: row.gula_darah || '',
            kolesterol: row.kolesterol_total || '',
            asam_urat: row.asam_urat || '',
            bmi: row.imt_bmi || '',
            risiko: row.tingkat_risiko || '',
            tgl_kontrol: row.tgl_kontrol || '',
            id_periksa: id
          };
          const sIdx = arr.findIndex((s) => s.id_periksa === id);
          if (sIdx >= 0) arr[sIdx] = snap;
          else arr.push(snap);
          mbr.riwayat_skrining_json = JSON.stringify(arr.slice(-20));
          if (row.tgl_kontrol && !mbr.tgl_reminder_berikut) mbr.tgl_reminder_berikut = row.tgl_kontrol;
        }
      }

      if (d.queue_wa && waNorm) {
        db.antrian_notif.unshift({
          id_notif: 'NTF-CHK-' + Date.now().toString().slice(-4),
          created_at: nowIso, channel: 'WA', tujuan: waNorm, nama_penerima: row.nama_pasien,
          jenis_event: 'HASIL_PEMERIKSAAN', referensi_id: id,
          pesan: String(d.wa_pesan || ('Hasil Pemeriksaan Kesehatan ' + row.nama_pasien + ' siap.')),
          status: 'ANTRI', percobaan: 0, catatan_error: '', sent_at: ''
        });
      }

      db.audit_log.unshift({
        id_audit: 'AUD-' + Date.now(), timestamp: nowIso, user_id: userId, role, cabang_id: row.cabang_id,
        aksi: 'PEMERIKSAAN_PASIEN_SAVE', entitas: 'PEMERIKSAAN_PASIEN', entitas_id: id,
        diff_sesudah_json: JSON.stringify({ nama_pasien: row.nama_pasien, td: row.tensi_sistol ? (row.tensi_sistol + '/' + row.tensi_diastol) : '', gula: row.gula_darah || '', kolesterol: row.kolesterol_total || '', asam_urat: row.asam_urat || '' })
      });
      db.epoch++;
      saveDb(db);
      return { item: row };
    }

    if (action === 'pemeriksaan.markWaSent') {
      const id = String((d && d.id_periksa) || '').trim();
      const rec = (db.pemeriksaan_pasien || []).find((x) => x.id_periksa === id);
      if (!rec) throw new Error('Data pemeriksaan tidak ditemukan: ' + id);
      const stamp = (d && d.via === 'FONNTE' ? 'TERKIRIM_FONNTE (' : 'TERKIRIM_WA (') + nowIso.slice(0, 16).replace('T', ' ') + ')';
      rec.wa_terkirim = stamp;
      rec.updated_at = nowIso;
      if (d && d.via === 'FONNTE' && d.no_wa && d.wa_pesan) {
        db.antrian_notif.unshift({
          id_notif: 'NTF-CHK-' + Date.now().toString().slice(-4),
          created_at: nowIso, channel: 'WA', tujuan: String(d.no_wa).replace(/[^0-9]/g, ''),
          nama_penerima: rec.nama_pasien, jenis_event: 'HASIL_PEMERIKSAAN', referensi_id: id,
          pesan: String(d.wa_pesan), status: 'TERKIRIM', percobaan: 1, catatan_error: '', sent_at: nowIso
        });
      }
      db.epoch++;
      saveDb(db);
      return { ok: true, id_periksa: id, wa_terkirim: stamp };
    }

    if (action === 'pemeriksaan.delete') {
      if (role !== 'Pemilik' && role !== 'APJ') throw new Error('Hanya Pemilik / APJ yang berhak menghapus data pemeriksaan.');
      const id = String((d && d.id_periksa) || '').trim();
      const idx = (db.pemeriksaan_pasien || []).findIndex((x) => x.id_periksa === id);
      if (idx < 0) throw new Error('Data pemeriksaan tidak ditemukan.');
      db.pemeriksaan_pasien.splice(idx, 1);
      db.epoch++;
      saveDb(db);
      return { ok: true, id_periksa: id };
    }

    if (action === 'system.factoryReset') {
      if (role !== 'Pemilik') throw new Error('Hanya Pemilik yang dapat melakukan Reset Data Pabrik.');
      if (d && d.demo_mode === 'restore_demo') {
        const fresh = buildSeedDb();
        fresh.profil_usaha = db.profil_usaha || defaultProfilUsaha();
        ensureV11Seed(fresh);
        fresh.audit_log.unshift({
          id_audit: 'AUD-DEMO-' + Date.now(), timestamp: nowIso, user_id: userId, role, cabang_id: cabang,
          aksi: 'RESTORE_DEMO_DATA', entitas: 'SYSTEM', entitas_id: 'DEMO',
          diff_sesudah_json: JSON.stringify({ info: 'Data contoh simulasi demo dipulihkan' })
        });
        saveDb(fresh);
        return { ok: true, demo_mode: 'restore_demo', epoch: fresh.epoch, pesan: 'Data contoh Demo Simulasi berhasil dipulihkan!' };
      }
      const conf = String((d && d.konfirmasi) || '').trim().toUpperCase();
      if (conf !== 'RESET PABRIK') throw new Error('Konfirmasi salah. Ketik tepat: RESET PABRIK');
      if (String((d && d.pin) || '') !== '123456') throw new Error('PIN Pemilik salah (PIN Demo default: 123456).');

      const hapusMaster = !(d && d.hapus_master === false);
      const opKeys = [
        'stok_batch', 'mutasi_stok', 'penjualan', 'detail_penjualan',
        'surat_pesanan', 'faktur_pbf', 'rekam_klinis', 'pemeriksaan_pasien',
        'jurnal_keuangan', 'shift_history', 'cold_chain',
        'tagihan', 'pembayaran', 'potongan', 'reminder_log',
        'de_dokumen', 'omnichannel_orders', 'crm_kontak', 'antrian_notif',
        'piutang_pelanggan', 'copy_resep', 'mutasi_cabang'
      ];
      let totalCleared = 0;
      opKeys.forEach((k) => {
        if (Array.isArray(db[k])) totalCleared += db[k].length;
        db[k] = [];
      });
      if (hapusMaster) {
        ['master_obat', 'supplier_pbf', 'members'].forEach((k) => {
          if (Array.isArray(db[k])) totalCleared += db[k].length;
          db[k] = [];
        });
      }
      db.kw_counter = 1;
      db.doc_counter = 1;
      db.audit_log = [{
        id_audit: 'AUD-RST-' + Date.now(), timestamp: nowIso, user_id: userId, role, cabang_id: cabang,
        aksi: 'FACTORY_RESET', entitas: 'SYSTEM', entitas_id: hapusMaster ? 'PRODUKSI_BERSIH_TOTAL' : 'PRODUKSI_BERSIH_TRANSAKSI',
        diff_sesudah_json: JSON.stringify({ hapus_master: hapusMaster, baris_dihapus: totalCleared })
      }];
      db.epoch = Number(db.epoch || 1) + 1;
      saveDb(db);
      return {
        ok: true,
        master_terhapus: hapusMaster,
        total_rows_cleared: totalCleared,
        epoch: db.epoch,
        pesan: 'Reset Data Pabrik selesai! ' + totalCleared + ' data uji coba dibersihkan.'
      };
    }

    return { ok: true };
  }

  global.ONSDemoEngine = { handleAction, resetDemo: () => { localStorage.removeItem(STORAGE_KEY); return loadDb(); } };
})(window);
