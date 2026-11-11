/**
 * ONS FARMA DIGITAL ENTERPRISE v10.0 - Local Stateful Sandbox / Demo Engine
 * Memungkinkan seluruh fitur PRD, POS FEFO, Recall, Klinis, Tagihan & Doc Engine
 * berjalan 100% interaktif di browser secara instan (<10ms) sebelum/saat GAS_URL dihubungkan,
 * sekaligus tetap menegakkan aturan RBAC & masking HPP identik dengan backend GAS.
 */
(function (global) {
  'use strict';

  const STORAGE_KEY = 'ons_farma_v10_demo_db';
  const today = new Date();
  const isoToday = today.toISOString().slice(0, 10);
  const addDays = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

  function buildSeedDb() {
    return {
      epoch: 1,
      secrets: {
        FONNTE_TOKEN: 'fnt_••••••89a',
        SATUSEHAT_CLIENT_ID: 'ss_c••••••210',
        SATUSEHAT_CLIENT_SECRET: 'ss_s••••••f7c',
        SATUSEHAT_ORG_ID: '1000••••••982',
        WA_OWNER_TARGET: '6281••••••990',
        ADMIN_EMAIL: 'owner@onsfarma.id',
        QRIS_MERCHANT_NMID: 'ID10••••••001',
        DE_VERIFY_URL_BASE: './index.html'
      },
      users: [
        { id_user: 'USR-001', username: 'pemilik', nama_lengkap: 'dr. Hendra Wijaya (Pemilik)', role: 'Pemilik', cabang_id: 'ONS-01', no_sipa: '-', masa_berlaku_sipa: '-', status_aktif: 'AKTIF' },
        { id_user: 'USR-002', username: 'apj', nama_lengkap: 'apt. Siti Rahma, S.Farm', role: 'APJ', cabang_id: 'ONS-01', no_sipa: '19920412/SIPA_35.78/2025/1042', masa_berlaku_sipa: '2029-12-31', status_aktif: 'AKTIF' },
        { id_user: 'USR-003', username: 'kasir', nama_lengkap: 'Budi Santoso (Kasir)', role: 'Kasir', cabang_id: 'ONS-01', no_sipa: '-', masa_berlaku_sipa: '-', status_aktif: 'AKTIF' }
      ],
      master_obat: [
        { id_obat: 'OBT-001', kode_kfa: '93001024', nama_dagang: 'Amoxicillin Trihydrate 500mg', zat_aktif: 'Amoxicillin', kekuatan: '500 mg', golongan_bpom: 'KERAS', bentuk_sediaan: 'Kaplet', nie_bpom: 'GKL9805024104A1', suhu_simpan: 'Suhu Ruang (15-25°C)', rak_lokasi: 'RAK-K1', satuan_dasar: 'Kaplet', satuan_sedang: 'Strip', rasio_sedang: 10, satuan_besar: 'Box', rasio_besar: 100, stok_min: 50, stok_max: 500, hpp_avg: 480, hpp_terakhir: 500, harga_umum: 900, harga_member: 800, harga_grosir: 700, pbf_utama: 'PT Bina San Prima', status_aktif: 'AKTIF', substitusi_ids: 'OBT-005' },
        { id_obat: 'OBT-002', kode_kfa: '93002110', nama_dagang: 'Paracetamol Sanmol 500mg', zat_aktif: 'Paracetamol', kekuatan: '500 mg', golongan_bpom: 'BEBAS', bentuk_sediaan: 'Tablet', nie_bpom: 'DBL7622235610A1', suhu_simpan: 'Suhu Ruang (15-25°C)', rak_lokasi: 'RAK-B1', satuan_dasar: 'Tablet', satuan_sedang: 'Strip', rasio_sedang: 4, satuan_besar: 'Box', rasio_besar: 100, stok_min: 80, stok_max: 600, hpp_avg: 320, hpp_terakhir: 340, harga_umum: 650, harga_member: 600, harga_grosir: 520, pbf_utama: 'PT Enseval Putera', status_aktif: 'AKTIF', substitusi_ids: 'OBT-006' },
        { id_obat: 'OBT-003', kode_kfa: '93004409', nama_dagang: 'Lantus SoloStar Insulin Pen', zat_aktif: 'Insulin Glargine', kekuatan: '100 IU/mL', golongan_bpom: 'KERAS', bentuk_sediaan: 'Injeksi Pen', nie_bpom: 'DKI0185200243A1', suhu_simpan: 'Cold Chain (2-8°C)', rak_lokasi: 'CHILLER-01', satuan_dasar: 'Pen', satuan_sedang: 'Box Isi 5', rasio_sedang: 5, satuan_besar: 'Karton', rasio_besar: 25, stok_min: 10, stok_max: 40, hpp_avg: 118000, hpp_terakhir: 120000, harga_umum: 148000, harga_member: 142000, harga_grosir: 136000, pbf_utama: 'PT Anugrah Argon Medika', status_aktif: 'AKTIF', substitusi_ids: '' },
        { id_obat: 'OBT-004', kode_kfa: '93007721', nama_dagang: 'Rhinos SR Kapsul Lepas Lambat', zat_aktif: 'Loratadine + Pseudoephedrine', kekuatan: '5mg/120mg', golongan_bpom: 'PREKURSOR', bentuk_sediaan: 'Kapsul SR', nie_bpom: 'DKL9905028403A1', suhu_simpan: 'Suhu Ruang (15-25°C)', rak_lokasi: 'LEMARI-PRE', satuan_dasar: 'Kapsul', satuan_sedang: 'Strip', rasio_sedang: 10, satuan_besar: 'Box', rasio_besar: 50, stok_min: 20, stok_max: 150, hpp_avg: 7800, hpp_terakhir: 8000, harga_umum: 11500, harga_member: 10800, harga_grosir: 9800, pbf_utama: 'PT Dexa Medica Dist', status_aktif: 'AKTIF', substitusi_ids: 'OBT-007' },
        { id_obat: 'OBT-005', kode_kfa: '93001089', nama_dagang: 'Cefadroxil Monohydrate 500mg', zat_aktif: 'Cefadroxil', kekuatan: '500 mg', golongan_bpom: 'KERAS', bentuk_sediaan: 'Kapsul', nie_bpom: 'GKL0105031101A1', suhu_simpan: 'Suhu Ruang (15-25°C)', rak_lokasi: 'RAK-K2', satuan_dasar: 'Kapsul', satuan_sedang: 'Strip', rasio_sedang: 10, satuan_besar: 'Box', rasio_besar: 100, stok_min: 40, stok_max: 300, hpp_avg: 1150, hpp_terakhir: 1200, harga_umum: 1950, harga_member: 1800, harga_grosir: 1650, pbf_utama: 'PT Bina San Prima', status_aktif: 'AKTIF', substitusi_ids: 'OBT-001' },
        { id_obat: 'OBT-006', kode_kfa: '93002914', nama_dagang: 'Ibuprofen Proris 400mg', zat_aktif: 'Ibuprofen', kekuatan: '400 mg', golongan_bpom: 'TERBATAS', bentuk_sediaan: 'Kaplet', nie_bpom: 'DTL9921620604B1', suhu_simpan: 'Suhu Ruang (15-25°C)', rak_lokasi: 'RAK-T1', satuan_dasar: 'Kaplet', satuan_sedang: 'Strip', rasio_sedang: 10, satuan_besar: 'Box', rasio_besar: 100, stok_min: 40, stok_max: 250, hpp_avg: 890, hpp_terakhir: 920, harga_umum: 1600, harga_member: 1450, harga_grosir: 1350, pbf_utama: 'PT Enseval Putera', status_aktif: 'AKTIF', substitusi_ids: 'OBT-002' },
        { id_obat: 'OBT-007', kode_kfa: '93005112', nama_dagang: 'Amlodipine Besylate 10mg PRB', zat_aktif: 'Amlodipine', kekuatan: '10 mg', golongan_bpom: 'KERAS', bentuk_sediaan: 'Tablet', nie_bpom: 'GKL1205046510B1', suhu_simpan: 'Suhu Ruang (15-25°C)', rak_lokasi: 'RAK-PRB', satuan_dasar: 'Tablet', satuan_sedang: 'Strip', rasio_sedang: 10, satuan_besar: 'Box', rasio_besar: 30, stok_min: 90, stok_max: 600, hpp_avg: 410, hpp_terakhir: 420, harga_umum: 850, harga_member: 750, harga_grosir: 650, pbf_utama: 'PT Kimia Farma Trading', status_aktif: 'AKTIF', substitusi_ids: '' },
        { id_obat: 'OBT-008', kode_kfa: '93009901', nama_dagang: 'Codeine Phosphate 10mg (Kimia Farma)', zat_aktif: 'Codeine', kekuatan: '10 mg', golongan_bpom: 'NARKOTIKA', bentuk_sediaan: 'Tablet', nie_bpom: 'GNL7212401810A1', suhu_simpan: 'Suhu Ruang (15-25°C)', rak_lokasi: 'LEMARI-NARKO-2KUNCI', satuan_dasar: 'Tablet', satuan_sedang: 'Botol 100', rasio_sedang: 100, satuan_besar: 'Botol 100', rasio_besar: 100, stok_min: 15, stok_max: 100, hpp_avg: 2300, hpp_terakhir: 2350, harga_umum: 4200, harga_member: 4000, harga_grosir: 3800, pbf_utama: 'PT Kimia Farma Trading', status_aktif: 'AKTIF', substitusi_ids: '' },
        { id_obat: 'OBT-009', kode_kfa: '93006210', nama_dagang: 'Warfarin Simarc-2 2mg', zat_aktif: 'Warfarin', kekuatan: '2 mg', golongan_bpom: 'KERAS', bentuk_sediaan: 'Tablet', nie_bpom: 'DKL0421011210A1', suhu_simpan: 'Suhu Ruang (15-25°C)', rak_lokasi: 'RAK-JANTUNG', satuan_dasar: 'Tablet', satuan_sedang: 'Strip', rasio_sedang: 10, satuan_besar: 'Box', rasio_besar: 100, stok_min: 15, stok_max: 100, hpp_avg: 1350, hpp_terakhir: 1400, harga_umum: 2400, harga_member: 2250, harga_grosir: 2050, pbf_utama: 'PT Fahrenheit', status_aktif: 'AKTIF', substitusi_ids: '' }
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
        { id_batch: 'BTH-111', cabang_id: 'ONS-01', id_obat: 'OBT-009', no_batch: 'WAR-2610M', tgl_kadaluarsa: addDays(310), qty_sisa: 50, qty_karantina: 0, hpp_beli: 1350, no_faktur_pbf: 'FK-FHR-0081', status_batch: 'AKTIF' }
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
        { id_klinis: 'KLN-8801', tanggal: isoToday + 'T09:15:00', cabang_id: 'ONS-01', pasien_id: 'MBR-001', nama_pasien: 'Tn. Bambang Suryono', no_wa_pasien: '6281234567801', dokter_asal: 'dr. Andi Pratama, Sp.JP', no_sip_dokter: '446/109/SIP-DOK/2024', alergi_pasien: 'Penisilin', layanan_jenis: 'SKRINING_RESEP', cdss_warning: 'Kontraindikasi Amoxicillin + Alergi Penisilin terdeteksi & telah diganti Cefadroxil/Azithromycin.', apj_pin_verified_by: 'apt. Siti Rahma, S.Farm', soap_notes: 'S: Kontrol TD rutin. O: TD 136/86 mmHg. A: Hipertensi terkontrol. P: Lanjut Amlodipine 10mg 1x1 malam, edukasi diet rendah garam.', status_klinis: 'TERVERIFIKASI_APJ' }
      ],
      penjualan: [
        { id_transaksi: 'TRX-1001', no_invoice: 'INV-' + isoToday.replace(/-/g, '') + '-001', tanggal: isoToday + 'T08:42:00', cabang_id: 'ONS-01', kasir_id: 'USR-003', channel: 'Toko Fisik', id_member: 'MBR-002', metode_bayar: 'QRIS', subtotal: 296000, diskon_total: 0, pajak_ppn: 0, grand_total: 296000, total_hpp: 236000, estimasi_margin: 60000, poin_didapat: 29, status_trx: 'LUNAS' },
        { id_transaksi: 'TRX-1002', no_invoice: 'INV-' + isoToday.replace(/-/g, '') + '-002', tanggal: isoToday + 'T10:15:00', cabang_id: 'ONS-01', kasir_id: 'USR-003', channel: 'Resep WA', id_member: 'MBR-001', metode_bayar: 'TUNAI', subtotal: 84000, diskon_total: 4000, pajak_ppn: 0, grand_total: 80000, total_hpp: 51000, estimasi_margin: 29000, poin_didapat: 8, status_trx: 'LUNAS' }
      ],
      detail_penjualan: [
        { id_detail: 'DTL-1', id_transaksi: 'TRX-1001', id_obat: 'OBT-003', id_batch: 'BTH-105', qty: 2, satuan: 'Pen', harga_jual: 148000, hpp_unit: 118000, subtotal_item: 296000 },
        { id_detail: 'DTL-2', id_transaksi: 'TRX-1002', id_obat: 'OBT-001', id_batch: 'BTH-101', qty: 30, satuan: 'Kaplet', harga_jual: 900, hpp_unit: 480, subtotal_item: 27000 }
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
        { ID: 'PEJ-02', UserId: 'USR-001', Nama: 'dr. Hendra Wijaya', Jabatan: 'Pemilik Sarana Apotek', NoSIPA: '-', Email: 'pemilik@onsfarma.id', Aktif: 'YA' }
      ],
      audit_log: [
        { id_audit: 'AUD-101', timestamp: isoToday + 'T07:55:00Z', user_id: 'USR-002', role: 'APJ', cabang_id: 'ONS-01', aksi: 'BOOT_SYSTEM_OK', entitas: 'SYSTEM', entitas_id: 'v10.0', diff_sebelum_json: '{}', diff_sesudah_json: JSON.stringify({ status: 'Kepatuhan BPOM & SATUSEHAT Siap' }), device_info: 'Desktop Chrome' }
      ],
      kw_counter: 12,
      doc_counter: 13
    };
  }

  function loadDb() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
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

  function handleAction(action, d, tokenPayload) {
    const db = loadDb();
    const role = (tokenPayload && tokenPayload.role) || 'Pemilik';
    const userNama = (tokenPayload && tokenPayload.nama) || 'Demo User';
    const userId = (tokenPayload && tokenPayload.uid) || 'USR-001';
    const nowIso = new Date().toISOString();

    if (action === 'ping') return { app: 'Apotek ONS Farma Enterprise', version: '10.0.0-DEMO', epoch: db.epoch };

    if (action === 'auth.login') {
      const u = db.users.find((x) => x.username.toLowerCase() === String(d.username || '').toLowerCase());
      if (!u) throw new Error('Username tidak ditemukan (gunakan: pemilik / apj / kasir).');
      const sesObj = {
        uid: u.id_user,
        u: u.username,
        nama: u.nama_lengkap,
        role: u.role,
        sipa: u.no_sipa,
        branch: d.cabang_id || 'ONS-01'
      };
      const fakeTok = 'DEMO.' + btoa(unescape(encodeURIComponent(JSON.stringify(sesObj))));
      return { token: fakeTok, user: Object.assign({}, u, { cabang_id: sesObj.branch }) };
    }

    if (action === 'auth.verifyPin') {
      if (String(d.pin || '') !== '123456') {
        throw new Error('PIN Otorisasi salah (Demo PIN default: 123456).');
      }
      return { verified: true, supervisor_id: 'USR-002', supervisor_nama: 'apt. Siti Rahma, S.Farm', supervisor_role: 'APJ' };
    }

    if (action === 'boot.getState') {
      return {
        user: tokenPayload,
        epoch: db.epoch,
        cabang_id: d.cabang_id || 'ONS-01',
        master_obat: db.master_obat.map((o) => maskRow(o, role)),
        stok_batch: db.stok_batch.map((b) => maskRow(b, role)),
        members: db.members,
        supplier_pbf: db.supplier_pbf,
        cold_chain: db.cold_chain,
        rekam_klinis: db.rekam_klinis.map((r) => maskRow(r, role)),
        penjualan: db.penjualan.map((p) => maskRow(p, role)),
        faktur_pbf: role !== 'Kasir' ? db.faktur_pbf : [],
        jurnal_keuangan: role !== 'Kasir' ? db.jurnal_keuangan : []
      };
    }

    if (action === 'obat.save') {
      const existingIdx = db.master_obat.findIndex((o) => o.id_obat === d.id_obat);
      const item = Object.assign({
        id_obat: d.id_obat || ('OBT-' + String(db.master_obat.length + 1).padStart(3, '0')),
        status_aktif: 'AKTIF',
        updated_at: nowIso
      }, d);
      if (existingIdx >= 0) db.master_obat[existingIdx] = Object.assign(db.master_obat[existingIdx], item);
      else db.master_obat.push(item);
      db.epoch++;
      saveDb(db);
      return { item: maskRow(item, role) };
    }

    if (action === 'pos.checkout') {
      const trxId = 'TRX-' + Math.floor(1000 + Math.random() * 9000);
      const noInv = 'INV-' + isoToday.replace(/-/g, '') + '-' + String(db.penjualan.length + 1).padStart(3, '0');
      let totalHpp = 0;
      (d.items || []).forEach((it) => {
        let rem = Number(it.qty || 1) * Number(it.faktor_konversi || 1);
        const batches = db.stok_batch.filter((b) => b.id_obat === it.id_obat && b.status_batch === 'AKTIF' && b.qty_sisa > 0)
          .sort((a, b) => String(a.tgl_kadaluarsa).localeCompare(String(b.tgl_kadaluarsa)));
        batches.forEach((b) => {
          if (rem <= 0) return;
          const cut = Math.min(rem, b.qty_sisa);
          b.qty_sisa -= cut;
          rem -= cut;
          totalHpp += cut * Number(b.hpp_beli || 0);
          db.detail_penjualan.push({ id_detail: 'DTL-' + Date.now() + Math.random(), id_transaksi: trxId, id_obat: it.id_obat, id_batch: b.id_batch, qty: cut, satuan: it.satuan });
        });
      });
      const trx = {
        id_transaksi: trxId,
        no_invoice: noInv,
        tanggal: nowIso,
        cabang_id: d.cabang_id || 'ONS-01',
        kasir_id: userId,
        channel: d.channel || 'Toko Fisik',
        id_member: d.id_member || 'UMUM',
        metode_bayar: d.metode_bayar || 'TUNAI',
        subtotal: Number(d.subtotal || d.grand_total || 0),
        diskon_total: Number(d.diskon_total || 0),
        pajak_ppn: Number(d.pajak_ppn || 0),
        grand_total: Number(d.grand_total || 0),
        total_hpp: totalHpp,
        estimasi_margin: Number(d.grand_total || 0) - totalHpp,
        poin_didapat: Math.floor(Number(d.grand_total || 0) / 10000),
        status_trx: 'LUNAS'
      };
      db.penjualan.unshift(trx);
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
      if (trx.id_member !== 'UMUM') {
        const mem = db.members.find((m) => m.id_member === trx.id_member);
        if (mem) mem.poin_loyalitas = Number(mem.poin_loyalitas || 0) + trx.poin_didapat;
      }
      db.epoch++;
      saveDb(db);
      return { penjualan: maskRow(trx, role), no_invoice: noInv };
    }

    if (action === 'stok.recallBatch') {
      const b = db.stok_batch.find((x) => x.id_batch === d.id_batch);
      if (!b) throw new Error('Batch tidak ditemukan.');
      const qtyQ = b.qty_sisa;
      b.qty_karantina += qtyQ;
      b.qty_sisa = 0;
      b.status_batch = 'KARANTINA_RECALL';
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
      (d.entries || []).forEach((ent) => {
        const b = db.stok_batch.find((x) => x.id_batch === ent.id_batch);
        if (b) b.qty_sisa = Number(ent.qty_fisik);
      });
      db.audit_log.unshift({ id_audit: 'AUD-' + Date.now(), timestamp: nowIso, user_id: userId, role, cabang_id: 'ONS-01', aksi: 'CYCLE_COUNT_OPNAME', entitas: 'STOK_BATCH', entitas_id: 'SO-' + isoToday, diff_sebelum_json: '{}', diff_sesudah_json: JSON.stringify({ jumlah: (d.entries || []).length }) });
      db.epoch++;
      saveDb(db);
      return { adjusted: (d.entries || []).length };
    }

    if (action === 'pengadaan.fakturSave') {
      const f = Object.assign({ id_beli: 'BLI-' + Date.now(), status_bayar: 'BELUM_LUNAS', status_bar: 'AKTIF' }, d);
      db.faktur_pbf.unshift(f);
      if (Array.isArray(d.items)) {
        d.items.forEach((it, i) => {
          db.stok_batch.push({ id_batch: 'BTH-' + Date.now() + i, cabang_id: 'ONS-01', id_obat: it.id_obat, no_batch: it.no_batch || 'NEW-B', tgl_kadaluarsa: it.tgl_kadaluarsa || '2028-12-31', qty_sisa: Number(it.qty_dasar || 10), qty_karantina: 0, hpp_beli: Number(it.hpp_unit || 0), no_faktur_pbf: d.no_faktur_pbf, status_batch: 'AKTIF' });
        });
      }
      db.epoch++;
      saveDb(db);
      return { item: f };
    }

    if (action === 'pengadaan.returBar') {
      const b = db.stok_batch.find((x) => x.id_batch === d.id_batch);
      if (!b) throw new Error('Batch retur tidak ditemukan.');
      const cut = Math.min(b.qty_sisa, Number(d.qty_retur || 0));
      b.qty_sisa -= cut;
      const val = cut * Number(b.hpp_beli || 0);
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

    if (action === 'shift.close') {
      if (String(d.supervisor_pin) !== '123456') throw new Error('PIN Supervisor salah (Demo: 123456).');
      const selisih = Number(d.aktual_tunai || 0) - (Number(d.modal_awal || 0) + Number(d.sistem_tunai || 0));
      const row = { id_shift: 'SHF-' + Date.now(), tgl_tutup: nowIso, kasir_id: userNama, supervisor_id: 'apt. Siti Rahma, S.Farm', aktual_tunai: Number(d.aktual_tunai || 0), selisih_kas: selisih, catatan_handover: d.catatan_handover || '', status_shift: 'DITUTUP' };
      db.audit_log.unshift({ id_audit: 'AUD-' + Date.now(), timestamp: nowIso, user_id: userId, role, cabang_id: 'ONS-01', aksi: 'SHIFT_CLOSED', entitas: 'TUKAR_SHIFT_CLOSE', entitas_id: row.id_shift, diff_sesudah_json: JSON.stringify(row) });
      saveDb(db);
      return { shift: row };
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
    if (action === 'users.list') return { items: db.users };
    if (action === 'users.save') {
      const idx = db.users.findIndex((u) => u.username.toLowerCase() === String(d.username || '').toLowerCase());
      const usr = Object.assign({ id_user: 'USR-' + String(db.users.length + 1).padStart(3, '0'), cabang_id: 'ONS-01', no_sipa: '-', masa_berlaku_sipa: '-', status_aktif: 'AKTIF' }, d);
      if (idx >= 0) db.users[idx] = Object.assign(db.users[idx], usr);
      else db.users.push(usr);
      saveDb(db);
      return { ok: true, username: usr.username };
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

    return { ok: true };
  }

  global.ONSDemoEngine = { handleAction, resetDemo: () => { localStorage.removeItem(STORAGE_KEY); return loadDb(); } };
})(window);
