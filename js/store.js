/**
 * ONS FARMA DIGITAL ENTERPRISE v10.0 - Store, RBAC Guards, CDSS Rules, EMVCo QRIS, ESC/POS & 5-Format Export
 */
(function (global) {
  'use strict';

  const DARK_KEY = 'ons_farma_v10_dark';
  const PROFILE_CACHE_KEY = 'ons_farma_v13_profile';
  const AUDIT_SYS_KEY = 'ons_farma_v164_audit_sys';
  const MULTI_BRANCH_KEY = 'ons_farma_v172_multi_cabang';
  const EXTRA_BRANCHES_KEY = 'ons_farma_v172_branches';

  function loadBranchesList() {
    try {
      const raw = JSON.parse(localStorage.getItem(EXTRA_BRANCHES_KEY) || 'null');
      if (Array.isArray(raw) && raw.length) return raw;
    } catch (e) {}
    return ['ONS-01'];
  }

  const RBAC_MODULE_CATALOG = [
    { key: 'dashboard', label: 'Beranda & Audit BPOM', group: 'Operasional' },
    { key: 'pos', label: 'Kasir POS FEFO & Riwayat', group: 'Operasional' },
    { key: 'tutup-shift', label: 'Tutup Shift & Laci Kas', group: 'Operasional' },
    { key: 'obat', label: 'Master Data (Produk, Kategori, Satuan, Rak, Gudang, Pajak)', group: 'Produk & Gudang' },
    { key: 'kontak', label: 'Buku Kontak (Supplier, Pelanggan, Dokter, Sales)', group: 'Produk & Gudang' },
    { key: 'gudang', label: 'Persediaan & Stok (Kadaluarsa, Kartu Stok, Suhu)', group: 'Produk & Gudang' },
    { key: 'gudang:opname', label: 'Stok Opname', group: 'Produk & Gudang' },
    { key: 'gudang:penyesuaian', label: 'Penyesuaian Stok', group: 'Produk & Gudang' },
    { key: 'gudang:transfer', label: 'Perpindahan Stok', group: 'Produk & Gudang' },
    { key: 'defecta', label: 'Pengadaan & Faktur PBF (Defecta/SP/GRN/Retur)', group: 'Pengadaan & PBF' },
    { key: 'faktur', label: 'Pengadaan & Faktur PBF (Defecta/SP/GRN/Retur)', group: 'Pengadaan & PBF' },
    { key: 'pemeriksaan', label: 'Pemeriksaan Pasien (POCT)', group: 'Klinis & Pasien' },
    { key: 'klinis', label: 'Pelayanan Klinis & E-Resep (SOAP/Racikan/PIO/MESO)', group: 'Klinis & Pasien' },
    { key: 'crm-wa', label: 'CRM & Broadcast WA', group: 'Klinis & Pasien' },
    { key: 'finance', label: 'Keuangan & Kas (P&L, Piutang, Hutang, Pajak)', group: 'Keuangan & Laporan' },
    { key: 'billing', label: 'Tagihan & Kwitansi QR', group: 'Keuangan & Laporan' },
    { key: 'sipnap', label: 'Laporan & SIPNAP Kemenkes', group: 'Keuangan & Laporan' },
    { key: 'analisis', label: 'Analisis (Pareto, Pembelian & Harga)', group: 'Keuangan & Laporan' },
    { key: 'users', label: 'Manajemen Pengguna (User, Peran, Presensi, Shift)', group: 'Sistem' },
    { key: 'settings', label: 'Pengaturan Apotek & Akun', group: 'Sistem' },
    { key: 'settings:audit', label: 'Edit Sistem Audit & Log Audit', group: 'Sistem' },
    { key: 'mobile-preview', label: 'Tampilan Mode HP', group: 'Sistem' }
  ];

  const ALL_PERM_KEYS = RBAC_MODULE_CATALOG.map((m) => m.key);
  const DEFAULT_ROLE_PERMS = {
    Pemilik: ALL_PERM_KEYS.slice(),
    APJ: ALL_PERM_KEYS.slice(),
    Kasir: ['dashboard', 'pos', 'gudang', 'pemeriksaan', 'billing', 'tutup-shift', 'mobile-preview', 'kontak']
  };

  function _safeB64(s) {
    try {
      if (typeof atob === 'function') return atob(s);
      if (typeof Buffer !== 'undefined') return Buffer.from(s, 'base64').toString('utf8');
    } catch (e) {}
    return '';
  }

  function _isLegacySensitive(val) {
    if (!val) return false;
    const s = String(val).toLowerCase();
    const triggers = [
      'hendra wijaya',
      _safeB64('YW5pc3Nh'),
      _safeB64('ZmFyYWRpZmE='),
      _safeB64('cnVtaQ=='),
      _safeB64('aWNhZmFyYWRpdmE='),
      _safeB64('NjI4MjEzNjk3Mzk5MA=='),
      _safeB64('MTk5MjA0MTI='),
      _safeB64('MTk5NTA4MTI='),
      _safeB64('NDQ5L1NJQQ==').toLowerCase(),
      _safeB64('OTEyMDIwODE0MjkxNQ=='),
      _safeB64('MDkuMjU0LjI5NA==')
    ].filter(Boolean);
    return triggers.some((t) => s.includes(t));
  }

  function defaultAuditSystem(cabangId) {
    return {
      cabang_id: cabangId || 'ONS-01',
      apj_user_id: 'USR-002',
      apj_nama: 'Apoteker Penanggung Jawab (APJ)',
      apj_sipa: '-',
      kasir_user_id: 'USR-003',
      kasir_nama: 'Kasir Operasional',
      catatan_audit: 'Pemeriksaan rutin CDOB & kesiapan stok harian.',
      updated_at: '',
      updated_by: 'Sistem',
      items: [
        { id: 'AUDC-1', label: 'Verifikasi Laci Narkotika', checked: true, pj_role: 'APJ', pj_nama: 'Apoteker Penanggung Jawab', keterangan: 'Terkunci ganda & kartu stok sesuai' },
        { id: 'AUDC-2', label: 'Prioritas Jual Batch FEFO', checked: true, pj_role: 'Kasir', pj_nama: 'Kasir Operasional', keterangan: 'Batch ED terdekat diprioritaskan di POS' },
        { id: 'AUDC-3', label: 'Order SP PBF Sebelum 14:00', checked: false, pj_role: 'APJ', pj_nama: 'Apoteker Penanggung Jawab', keterangan: 'Menunggu approval SP harian' }
      ]
    };
  }

  function loadCachedAuditSystem() {
    const def = defaultAuditSystem('ONS-01');
    try {
      const raw = localStorage.getItem(AUDIT_SYS_KEY);
      if (!raw) return def;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return def;
      const res = Object.assign({}, def, parsed, {
        items: Array.isArray(parsed.items) && parsed.items.length ? parsed.items : def.items
      });
      if (res.apj_sipa && _isLegacySensitive(res.apj_sipa)) res.apj_sipa = '-';
      if (_isLegacySensitive(res.apj_nama)) res.apj_nama = 'Apoteker Penanggung Jawab';
      return res;
    } catch (e) {
      return def;
    }
  }

  function defaultStoreProfile() {
    return {
      cabang_id: 'ONS-01',
      nama_pemilik: 'Apoteker Penanggung Jawab',
      jabatan_pemilik: 'Apoteker Penanggung Jawab (APJ)',
      sipa_pemilik: '',
      stra_pemilik: '',
      wa_pemilik: '',
      email_pemilik: 'admin@onsfarma.id',
      npwp_pemilik: '',
      foto_pemilik_url: '',
      nama_usaha: 'Apotek ONS Farma',
      no_sia: '',
      nib_oss: '',
      npwp_usaha: '',
      status_pkp: 'NON_PKP',
      alamat_usaha: 'Jl. Pengayoman Raya, Panakkukang',
      kota: 'Makassar',
      kode_pos: '90231',
      telepon_usaha: '',
      wa_usaha: '',
      email_usaha: 'halo@onsfarma.id',
      jam_operasional: '08:00 - 22:00 WITA',
      zona_waktu: 'Asia/Makassar (WITA)',
      slogan: '',
      provinsi: 'Sulawesi Selatan',
      kecamatan: 'Panakkukang',
      kelurahan: 'Masale',
      latitude: '-5.147665',
      longitude: '119.432732',
      foto_outlet_url: '',
      file_foto_outlet_name: '',
      nitku: '',
      jenis_badan_usaha: 'Perorangan',
      tgl_berlaku_sia: '',
      file_sia_url: '',
      file_sia_name: '',
      ktp_pemilik: '',
      file_ktp_url: '',
      file_ktp_name: '',
      file_npwp_pemilik_url: '',
      file_npwp_pemilik_name: '',
      file_npwp_usaha_url: '',
      file_npwp_usaha_name: '',
      file_nib_url: '',
      file_nib_name: '',
      tgl_berlaku_sipa: '',
      file_sipa_url: '',
      file_sipa_name: '',
      file_sipa_pendamping_1_url: '',
      file_sipa_pendamping_1_name: '',
      file_sipa_pendamping_2_url: '',
      file_sipa_pendamping_2_name: '',
      apoteker_pendamping: [],
      bank_nama: 'Bank Mandiri',
      bank_cabang: 'KCP Panakkukang',
      bank_akun_nama: 'Apotek ONS Farma',
      bank_nomor_rekening: '',
      file_buku_rekening_url: '',
      file_buku_rekening_name: '',
      public_access: true,
      logo_usaha_url: './icons/ons-farma-app-icon.png',
      terkonfirmasi: 'YA',
      dikonfirmasi_oleh: 'Apoteker Penanggung Jawab',
      dikonfirmasi_pada: '',
      updated_at: ''
    };
  }

  function sanitizeLegacyOwnerName(val, fallback) {
    const s = String(val || '').trim();
    const cleanFallback = fallback && !_isLegacySensitive(fallback) ? fallback : 'Apoteker Penanggung Jawab';
    if (!s || _isLegacySensitive(s)) return cleanFallback;
    return s;
  }

  function _normalizeProfileObject(prof) {
    const merged = Object.assign({}, defaultStoreProfile(), prof || {});
    merged.nama_pemilik = sanitizeLegacyOwnerName(merged.nama_pemilik, 'Apoteker Penanggung Jawab');
    merged.dikonfirmasi_oleh = sanitizeLegacyOwnerName(merged.dikonfirmasi_oleh, merged.nama_pemilik);
    if (_isLegacySensitive(merged.nama_pemilik)) merged.nama_pemilik = 'Apoteker Penanggung Jawab';
    if (_isLegacySensitive(merged.dikonfirmasi_oleh)) merged.dikonfirmasi_oleh = 'Apoteker Penanggung Jawab';
    if (_isLegacySensitive(merged.email_pemilik)) merged.email_pemilik = 'admin@onsfarma.id';
    if (_isLegacySensitive(merged.wa_pemilik)) merged.wa_pemilik = '';
    if (_isLegacySensitive(merged.sipa_pemilik)) merged.sipa_pemilik = '';
    if (_isLegacySensitive(merged.stra_pemilik)) merged.stra_pemilik = '';
    if (_isLegacySensitive(merged.no_sia)) merged.no_sia = '';
    if (_isLegacySensitive(merged.nib_oss)) merged.nib_oss = '';
    if (_isLegacySensitive(merged.npwp_pemilik)) merged.npwp_pemilik = '';
    if (_isLegacySensitive(merged.ktp_pemilik)) merged.ktp_pemilik = '';
    return merged;
  }

  function loadCachedProfile() {
    try {
      const raw = localStorage.getItem(PROFILE_CACHE_KEY);
      if (raw) return _normalizeProfileObject(JSON.parse(raw));
    } catch (e) {}
    return defaultStoreProfile();
  }

  const AppState = {
    activeView: 'dashboard',
    activeSubTab: '',
    subTabs: {
      dashboard: 'umum',
      pos: 'kasir',
      obat: 'obat',
      omnichannel: 'SEMUA',
      gudang: 'batch',
      defecta: 'order',
      faktur: 'daftar',
      klinis: 'soap',
      'eresep-prb': 'erx',
      pemeriksaan: 'semua',
      'crm-wa': 'kontak',
      finance: 'pnl',
      billing: 'tagihan',
      sipnap: 'narkotika',
      analisis: 'pareto',
      users: 'daftar',
      'doc-engine': 'surat',
      settings: 'profil'
    },
    booted: false,
    loading: false,
    darkMode: localStorage.getItem(DARK_KEY) === '1',
    user: null,
    cabangId: 'ONS-01',
    storeProfile: loadCachedProfile(),
    staffDirectory: [],
    rbacPermissions: {},
    auditSystem: loadCachedAuditSystem(),
    masterObat: [],
    masterKategori: [],
    masterSatuan: [],
    masterRak: [],
    masterGudang: [],
    masterKategoriPelanggan: [],
    masterPajak: [],
    stokBatch: [],
    members: [],
    supplierPbf: [],
    masterDokter: [],
    coldChain: [],
    rekamKlinis: [],
    penjualan: [],
    detailPenjualan: [],
    mutasiStok: [],
    omnichannelOrders: [],
    strukTemplates: [],
    crmKontak: [],
    antrianNotif: [],
    fakturPbf: [],
    konsinyasiSummary: { items: [], settlements: [], totals: { qty_terjual: 0, qty_sisa: 0, tagihan_belum_bayar: 0, sudah_dibayar: 0 } },
    jurnalKeuangan: [],
    suratPesanan: [],
    deDokumen: [],
    shiftHistory: [],
    activeShift: null,
    piutangPelanggan: [],
    copyResep: [],
    pemeriksaanPasien: [],
    mutasiCabang: [],
    branchStockCompare: null,
    multiCabangAktif: localStorage.getItem(MULTI_BRANCH_KEY) === '1',
    branchesList: loadBranchesList(),
    carts: [
      { id: 'K1', label: 'Pelanggan #1', channel: 'Toko Fisik', id_member: 'UMUM', tier_harga: 'UMUM', items: [], diskon_global: 0, held_note: '', held_at: '' }
    ],
    activeCartIdx: 0,
    posSearchQ: '',
    posFilterGol: '',
    deferredInstallPrompt: null
  };

  function toggleDarkMode(force) {
    AppState.darkMode = force !== undefined ? !!force : !AppState.darkMode;
    localStorage.setItem(DARK_KEY, AppState.darkMode ? '1' : '0');
    document.documentElement.classList.toggle('dark', AppState.darkMode);
    try {
      const metaTheme = document.querySelector('meta[name="theme-color"]');
      if (metaTheme) metaTheme.setAttribute('content', AppState.darkMode ? '#0A1528' : '#0050CA');
    } catch (_) {}
  }
  document.documentElement.classList.toggle('dark', AppState.darkMode);
  try {
    const _initMetaTheme = document.querySelector('meta[name="theme-color"]');
    if (_initMetaTheme) _initMetaTheme.setAttribute('content', AppState.darkMode ? '#0A1528' : '#0050CA');
  } catch (_) {}

  /**
   * Helper Universal Format Titik Pemisah Ribuan (Indonesian Currency / Number Formatting)
   * Mengubah 1000000 -> "1.000.000", aman untuk input teks, live typing, dan parsing.
   */
  function parseNumber(val) {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (val === null || val === undefined || val === '') return 0;
    const str = String(val).trim();
    const cleaned = str.replace(/\./g, '').replace(/,/g, '.').replace(/[^0-9.-]/g, '');
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
  }

  function formatNumberWithDots(val, fallback = '') {
    if (val === null || val === undefined || val === '') return fallback;
    const n = typeof val === 'number' ? val : parseNumber(val);
    if (isNaN(n)) return fallback;
    return Math.round(n).toLocaleString('id-ID');
  }

  function maskNumberInput(inputEl) {
    if (!inputEl) return;
    const oldVal = inputEl.value;
    const selStart = inputEl.selectionStart !== null ? inputEl.selectionStart : oldVal.length;
    const digitsBeforeCursor = (oldVal.slice(0, selStart).match(/\d/g) || []).length;

    const rawDigits = (oldVal.match(/\d/g) || []).join('');
    if (!rawDigits) {
      inputEl.value = '';
      inputEl.dataset.rawNumber = '0';
      return;
    }

    const numVal = parseInt(rawDigits, 10);
    const formatted = numVal.toLocaleString('id-ID');
    inputEl.value = formatted;
    inputEl.dataset.rawNumber = String(numVal);

    // Kembalikan posisi kursor secara logis agar tidak melompat ke akhir input
    let newCursor = formatted.length;
    let countedDigits = 0;
    for (let i = 0; i < formatted.length; i++) {
      if (/\d/.test(formatted[i])) {
        countedDigits++;
      }
      if (countedDigits >= digitsBeforeCursor) {
        newCursor = i + 1;
        break;
      }
    }
    try {
      inputEl.setSelectionRange(newCursor, newCursor);
    } catch (_) {}
  }

  global.parseNumber = parseNumber;
  global.parseNum = parseNumber;
  global.formatNumberWithDots = formatNumberWithDots;
  global.formatDots = formatNumberWithDots;
  global.maskNumberInput = maskNumberInput;

  if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    document.addEventListener('input', (e) => {
      const t = e.target;
      if (!t || t.tagName !== 'INPUT') return;
      if (
        t.classList.contains('ons-currency-input') ||
        t.classList.contains('ons-input-currency') ||
        t.getAttribute('data-format') === 'dots' ||
        t.getAttribute('data-type') === 'currency'
      ) {
        maskNumberInput(t);
      }
    }, true);
  }

  /**
   * Formatter Uang & Tanggal Indonesia + Escape HTML
   */
  function rp(n) {
    const num = typeof n === 'number' ? n : parseNumber(n);
    return 'Rp ' + Math.round(Number(num || 0)).toLocaleString('id-ID');
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/`/g, '&#96;');
  }

  function formatTgl(iso, withTime) {
    if (!iso) return '-';
    try {
      const raw = String(iso).trim();
      const dt = (raw.includes('T') || /\d{2}:\d{2}/.test(raw))
        ? new Date(raw)
        : (() => {
            const norm = normalizeDateIso(raw);
            return norm ? new Date(norm + 'T00:00:00') : new Date(raw);
          })();
      if (isNaN(dt.getTime())) return raw.slice(0, 10);
      if (withTime) {
        return dt.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' +
          dt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      }
      return dt.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) { return String(iso).slice(0, 10); }
  }

  /**
   * Format tampilan tanggal kadaluarsa (ED) standar Indonesia: DD-MM-YYYY (Hari-Bulan-Tahun).
   * Contoh: '2029-07-30' -> '30-07-2029'.
   */
  function formatEd(val) {
    if (!val) return '-';
    const iso = normalizeDateIso(val);
    if (!iso) return String(val).trim() || '-';
    const parts = iso.split('-');
    if (parts.length !== 3) return iso;
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }

  let _nowCache = { ts: 0, iso: '' };
  function _getNowCache() {
    const now = Date.now();
    if (!_nowCache.iso || (now - _nowCache.ts) > 10000) {
      _nowCache = { ts: now, iso: new Date(now).toISOString().slice(0, 10) };
    }
    return _nowCache;
  }

  /**
   * Normalisasi berbagai format tanggal ED/transaksi (DD-MM-YYYY, DD/MM/YYYY, MM/YYYY,
   * Excel serial date, nama bulan ID/EN, atau ISO) menjadi format ISO standar YYYY-MM-DD.
   */
  const _MONTH_NAME_MAP = {
    jan: 1, januari: 1, january: 1,
    feb: 2, februari: 2, february: 2,
    mar: 3, maret: 3, march: 3,
    apr: 4, april: 4,
    mei: 5, may: 5,
    jun: 6, juni: 6, june: 6,
    jul: 7, juli: 7, july: 7,
    agu: 8, agt: 8, agustus: 8, aug: 8, august: 8,
    sep: 9, sept: 9, september: 9,
    okt: 10, oktober: 10, oct: 10, october: 10,
    nov: 11, november: 11,
    des: 12, desember: 12, dec: 12, december: 12
  };

  function _pad2Date(n) {
    return String(n).padStart(2, '0');
  }

  function normalizeDateIso(val) {
    if (val === null || val === undefined) return '';
    if (val instanceof Date) {
      return isNaN(val.getTime()) ? '' : val.toISOString().slice(0, 10);
    }
    if (typeof val === 'number' && isFinite(val) && val > 20000 && val < 90000) {
      const dt = new Date(Math.round((val - 25569) * 86400000));
      return isNaN(dt.getTime()) ? '' : dt.toISOString().slice(0, 10);
    }
    const raw = String(val).trim();
    if (!raw || raw === '-' || raw.toLowerCase() === 'n/a' || raw.toLowerCase() === 'null') return '';
    // Excel serial numeric string
    if (/^\d{5}(\.\d+)?$/.test(raw)) {
      const num = Number(raw);
      if (num > 20000 && num < 90000) {
        const dt = new Date(Math.round((num - 25569) * 86400000));
        if (!isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
      }
    }
    // Already YYYY-MM-DD (with optional time)
    let m = raw.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (m) {
      const yr = Number(m[1]), mo = Number(m[2]), dy = Number(m[3]);
      if (yr >= 1900 && mo >= 1 && mo <= 12 && dy >= 1 && dy <= 31) {
        return `${yr}-${_pad2Date(mo)}-${_pad2Date(dy)}`;
      }
    }
    // DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY (format Indonesia standar & impor Excel)
    m = raw.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})(?:\s.*)?$/);
    if (m) {
      let dy = Number(m[1]), mo = Number(m[2]), yr = Number(m[3]);
      if (mo > 12 && dy <= 12) { const tmp = dy; dy = mo; mo = tmp; }
      if (yr >= 1900 && mo >= 1 && mo <= 12 && dy >= 1 && dy <= 31) {
        return `${yr}-${_pad2Date(mo)}-${_pad2Date(dy)}`;
      }
    }
    // DD-MM-YY or DD/MM/YY
    m = raw.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2})$/);
    if (m) {
      let dy = Number(m[1]), mo = Number(m[2]), yr = 2000 + Number(m[3]);
      if (mo > 12 && dy <= 12) { const tmp = dy; dy = mo; mo = tmp; }
      if (mo >= 1 && mo <= 12 && dy >= 1 && dy <= 31) {
        return `${yr}-${_pad2Date(mo)}-${_pad2Date(dy)}`;
      }
    }
    // MM/YYYY or MM-YYYY (ED bulan/tahun -> hari terakhir bulan tsb)
    m = raw.match(/^(\d{1,2})[-/.](\d{4})$/);
    if (m) {
      const mo = Number(m[1]), yr = Number(m[2]);
      if (yr >= 1900 && mo >= 1 && mo <= 12) {
        const lastDay = new Date(Date.UTC(yr, mo, 0)).getUTCDate();
        return `${yr}-${_pad2Date(mo)}-${_pad2Date(lastDay)}`;
      }
    }
    // YYYY-MM (ED tahun-bulan -> hari terakhir bulan tsb)
    m = raw.match(/^(\d{4})[-/.](\d{1,2})$/);
    if (m) {
      const yr = Number(m[1]), mo = Number(m[2]);
      if (yr >= 1900 && mo >= 1 && mo <= 12) {
        const lastDay = new Date(Date.UTC(yr, mo, 0)).getUTCDate();
        return `${yr}-${_pad2Date(mo)}-${_pad2Date(lastDay)}`;
      }
    }
    // DD Mon YYYY / DD-Mon-YYYY / Mon YYYY (ID or EN)
    m = raw.toLowerCase().match(/^(?:(\d{1,2})[\s\-/.]+)?([a-z]{3,9})[\s\-/.]+(\d{2,4})$/);
    if (m && _MONTH_NAME_MAP[m[2]]) {
      const mo = _MONTH_NAME_MAP[m[2]];
      const yr = m[3].length === 2 ? (2000 + Number(m[3])) : Number(m[3]);
      const dy = m[1] ? Number(m[1]) : new Date(Date.UTC(yr, mo, 0)).getUTCDate();
      if (yr >= 1900 && dy >= 1 && dy <= 31) {
        return `${yr}-${_pad2Date(mo)}-${_pad2Date(dy)}`;
      }
    }
    // Native fallback
    const parsed = new Date(raw);
    if (!isNaN(parsed.getTime()) && parsed.getFullYear() >= 1970) {
      return parsed.toISOString().slice(0, 10);
    }
    return '';
  }

  function daysUntil(dateStr) {
    if (!dateStr) return 9999;
    const iso = normalizeDateIso(dateStr);
    if (!iso) return 9999;
    const ms = new Date(iso + 'T00:00:00').getTime() - _getNowCache().ts;
    return isNaN(ms) ? 9999 : Math.ceil(ms / 86400000);
  }

  function bpomBadge(gol) {
    const g = String(gol || 'BEBAS').toUpperCase().trim();
    let cls = 'bpom-bebas';
    let label = g || 'BEBAS';
    if (g === 'KERAS') {
      cls = 'bpom-keras';
      label = 'KERAS (K)';
    } else if (g === 'TERBATAS' || g === 'BEBAS TERBATAS' || g === 'BEBAS_TERBATAS') {
      cls = 'bpom-terbatas';
      label = 'TERBATAS';
    } else if (g === 'PREKURSOR') {
      cls = 'bpom-prekursor';
      label = 'PREKURSOR';
    } else if (g === 'OOT') {
      cls = 'bpom-oot';
      label = 'OOT';
    } else if (g === 'PSIKOTROPIKA') {
      cls = 'bpom-psikotropika';
      label = 'PSIKOTROPIKA';
    } else if (g === 'NARKOTIKA') {
      cls = 'bpom-narkotika';
      label = 'NARKOTIKA';
    } else if (g === 'HERBAL' || g === 'SUPLEMEN') {
      cls = 'bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700';
      label = 'HERBAL';
    } else if (g === 'ALKES') {
      cls = 'bg-cyan-50 text-cyan-700 border border-cyan-300 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-700';
      label = 'ALKES';
    }
    return `<span class="badge-bpom ${cls}">${esc(label)}</span>`;
  }

  /**
   * RBAC Guards ketat pada frontend (sejalan dengan enforcement di backend GAS)
   */
  function getRole() {
    return (AppState.user && AppState.user.role) || 'Kasir';
  }

  function getUserPermissions(userObj) {
    const u = userObj || AppState.user;
    const role = (u && u.role) || 'Kasir';
    if (role === 'Pemilik') return ALL_PERM_KEYS.slice();
    const map = AppState.rbacPermissions || {};
    const uid = u && u.id_user ? String(u.id_user) : '';
    const uname = u && u.username ? String(u.username).toLowerCase() : '';
    const custom = (uid && Array.isArray(map[uid]) ? map[uid] : null)
      || (uname && Array.isArray(map[uname]) ? map[uname] : null)
      || (u && Array.isArray(u.hak_akses) ? u.hak_akses : null);
    if (custom && custom.length) return custom.slice();
    return (DEFAULT_ROLE_PERMS[role] || DEFAULT_ROLE_PERMS.Kasir).slice();
  }

  function canAccessView(viewId) {
    const r = getRole();
    if (r === 'Pemilik') return true;
    const perms = getUserPermissions(AppState.user);
    if (viewId === 'settings' && perms.includes('settings:audit')) return true;
    if (viewId === 'faktur' && perms.includes('defecta')) return true;
    if (viewId === 'defecta' && perms.includes('faktur')) return true;
    if (viewId === 'eresep-prb') return perms.includes('klinis') || perms.includes('obat');
    if (viewId === 'kontak') return perms.includes('kontak') || perms.includes('obat') || perms.includes('pos');
    return perms.includes(viewId);
  }

  function canAccessSubTab(viewId, subTab) {
    const r = getRole();
    if (r === 'Pemilik') return true;
    const perms = getUserPermissions(AppState.user);
    const compound = `${viewId}:${subTab}`;
    if (compound === 'pos:tutup-shift') {
      return perms.includes('pos:tutup-shift') || perms.includes('tutup-shift') || perms.includes('pos');
    }
    if (compound === 'gudang:opname' || compound === 'gudang:penyesuaian' || compound === 'gudang:transfer' || compound === 'settings:audit') {
      return perms.includes(compound);
    }
    if (compound === 'kontak:supplier' || compound === 'obat:supplier') {
      return canSeeFinancialCost() && (perms.includes('kontak') || perms.includes('obat'));
    }
    return perms.includes(viewId);
  }

  function getAuditSystem() {
    const def = defaultAuditSystem(AppState.cabangId || 'ONS-01');
    const cur = AppState.auditSystem && typeof AppState.auditSystem === 'object' ? AppState.auditSystem : def;
    const staff = Array.isArray(AppState.staffDirectory) ? AppState.staffDirectory : [];
    const apjUser = staff.find((u) => u.role === 'APJ' && String(u.status_aktif || 'AKTIF') === 'AKTIF') || staff.find((u) => u.role === 'APJ');
    const kasirUser = staff.find((u) => u.role === 'Kasir' && String(u.status_aktif || 'AKTIF') === 'AKTIF') || staff.find((u) => u.role === 'Kasir');
    const apjNama = cur.apj_nama || (apjUser && apjUser.nama_lengkap) || def.apj_nama;
    const apjSipa = cur.apj_sipa || (apjUser && apjUser.no_sipa) || def.apj_sipa;
    const kasirNama = cur.kasir_nama || (kasirUser && kasirUser.nama_lengkap) || def.kasir_nama;
    return Object.assign({}, def, cur, {
      apj_user_id: cur.apj_user_id || (apjUser && apjUser.id_user) || def.apj_user_id,
      apj_nama: apjNama,
      apj_sipa: apjSipa,
      kasir_user_id: cur.kasir_user_id || (kasirUser && kasirUser.id_user) || def.kasir_user_id,
      kasir_nama: kasirNama,
      items: Array.isArray(cur.items) && cur.items.length ? cur.items : def.items
    });
  }

  function setAuditSystem(nextObj) {
    const merged = Object.assign({}, defaultAuditSystem(AppState.cabangId || 'ONS-01'), AppState.auditSystem || {}, nextObj || {});
    AppState.auditSystem = merged;
    try { localStorage.setItem(AUDIT_SYS_KEY, JSON.stringify(merged)); } catch (e) {}
    return merged;
  }

  function canSeeFinancialCost() {
    const r = getRole();
    return r === 'Pemilik' || r === 'APJ';
  }

  function isMultiBranchEnabled() {
    if (AppState.multiCabangAktif) return true;
    const cmp = AppState.branchStockCompare;
    if (cmp && Array.isArray(cmp.branches) && cmp.branches.length > 1) return true;
    if (Array.isArray(AppState.mutasiCabang) && AppState.mutasiCabang.length > 0) return true;
    return false;
  }

  function getActiveBranches() {
    const set = new Set(['ONS-01']);
    if (isMultiBranchEnabled()) {
      const cmp = AppState.branchStockCompare;
      if (cmp && Array.isArray(cmp.branches) && cmp.branches.length) {
        cmp.branches.forEach((b) => { if (b) set.add(String(b).trim()); });
      }
      (AppState.branchesList || []).forEach((b) => { if (b) set.add(String(b).trim()); });
      if (set.size < 2) set.add('ONS-02');
    }
    return Array.from(set);
  }

  function getBranchLabel(cabId) {
    const id = String(cabId || 'ONS-01').trim() || 'ONS-01';
    const prof = getStoreProfile();
    if (id === 'ONS-01') {
      return prof.nama_usaha ? `${prof.nama_usaha} (Utama)` : 'Outlet Utama (SIA)';
    }
    return `Cabang ${id}`;
  }

  function setMultiBranchMode(enabled, branchCodes) {
    const on = !!enabled;
    AppState.multiCabangAktif = on;
    try { localStorage.setItem(MULTI_BRANCH_KEY, on ? '1' : '0'); } catch (e) {}
    if (on) {
      const nextList = Array.isArray(branchCodes) && branchCodes.length
        ? Array.from(new Set(['ONS-01'].concat(branchCodes.map((x) => String(x || '').trim()).filter(Boolean))))
        : ['ONS-01', 'ONS-02'];
      AppState.branchesList = nextList;
      try { localStorage.setItem(EXTRA_BRANCHES_KEY, JSON.stringify(nextList)); } catch (e) {}
    } else {
      AppState.branchesList = ['ONS-01'];
      AppState.cabangId = 'ONS-01';
      try { localStorage.setItem(EXTRA_BRANCHES_KEY, JSON.stringify(['ONS-01'])); } catch (e) {}
    }
    return { multi_cabang: on, branches: getActiveBranches() };
  }

  /**
   * Kalkulator Stok FEFO Total & Layak Jual (Belum Kadaluarsa) per ID Obat
   * O(1) Lookup Indexer (disegarkan otomatis per frame / mutasi data)
   */
  let _batchIdx = { arr: null, len: -1, mLen: -1, br: '', day: '', dirty: true, ts: 0, byId: new Map() };

  function invalidateStockIndex() {
    _batchIdx.dirty = true;
    _batchIdx.arr = null;
  }

  function _getBatchIndex() {
    const nc = _getNowCache();
    const arr = AppState.stokBatch || [];
    const mList = AppState.masterObat || [];
    const br = AppState.cabangId || 'ONS-01';
    if (
      !_batchIdx.dirty &&
      _batchIdx.arr === arr &&
      _batchIdx.len === arr.length &&
      _batchIdx.mLen === mList.length &&
      _batchIdx.br === br &&
      _batchIdx.day === nc.iso &&
      (Date.now() - _batchIdx.ts) <= 60
    ) {
      return _batchIdx.byId;
    }
    const map = new Map();
    for (let i = 0; i < arr.length; i++) {
      const b = arr[i];
      if (!b || !b.id_obat || String(b.status_batch || 'AKTIF') !== 'AKTIF') continue;
      if (b.cabang_id && b.cabang_id !== br) continue;
      let ent = map.get(b.id_obat);
      if (!ent) {
        ent = { totalStok: 0, sellableStok: 0, nearestEd: null, nearestSellable: null, sellableBatches: [] };
        map.set(b.id_obat, ent);
      }
      const qty = Number(b.qty_sisa || 0);
      ent.totalStok += qty;
      if (qty > 0) {
        const iso = normalizeDateIso(b.tgl_kadaluarsa);
        const cmpEd = iso || '9999-12-31';
        const curNearEd = ent.nearestEd ? (normalizeDateIso(ent.nearestEd.tgl_kadaluarsa) || '9999-12-31') : '';
        if (!ent.nearestEd || cmpEd.localeCompare(curNearEd) < 0) {
          ent.nearestEd = b;
        }
        if (!iso || iso >= nc.iso) {
          ent.sellableStok += qty;
          ent.sellableBatches.push(b);
          const curNearSell = ent.nearestSellable ? (normalizeDateIso(ent.nearestSellable.tgl_kadaluarsa) || '9999-12-31') : '';
          if (!ent.nearestSellable || cmpEd.localeCompare(curNearSell) < 0) {
            ent.nearestSellable = b;
          }
        }
      }
    }

    // Fallback: Sinkronisasi produk katalog master obat yang belum memiliki record batch terpisah (contoh impor dari Excel)
    const defaultFutureEd = new Date(Date.now() + 730 * 86400000).toISOString().slice(0, 10);
    for (let i = 0; i < mList.length; i++) {
      const o = mList[i];
      if (!o || !o.id_obat) continue;
      const mStok = Number(o.stok !== undefined ? o.stok : (o.stok_akhir !== undefined ? o.stok_akhir : (o.stok_total || 0)));
      if (mStok <= 0) continue;
      let ent = map.get(o.id_obat);
      const oEdIso = normalizeDateIso(o.tgl_kadaluarsa);
      const safeEd = (oEdIso && oEdIso >= nc.iso) ? oEdIso : defaultFutureEd;
      if (!ent) {
        const synthBatch = {
          id_batch: 'BT-INIT-' + o.id_obat,
          id_obat: o.id_obat,
          cabang_id: br,
          no_batch: o.no_batch || 'BATCH-AWAL',
          tgl_kadaluarsa: safeEd,
          qty_sisa: mStok,
          status_batch: 'AKTIF',
          hpp_beli: Number(o.hpp_avg || o.hpp_terakhir || 0)
        };
        map.set(o.id_obat, {
          totalStok: mStok,
          sellableStok: mStok,
          nearestEd: synthBatch,
          nearestSellable: synthBatch,
          sellableBatches: [synthBatch],
          isSynthetic: true
        });
      } else if (ent.totalStok <= 0) {
        const synthBatch = {
          id_batch: 'BT-INIT-' + o.id_obat,
          id_obat: o.id_obat,
          cabang_id: br,
          no_batch: o.no_batch || 'BATCH-AWAL',
          tgl_kadaluarsa: safeEd,
          qty_sisa: mStok,
          status_batch: 'AKTIF',
          hpp_beli: Number(o.hpp_avg || o.hpp_terakhir || 0)
        };
        ent.totalStok = mStok;
        ent.sellableStok = mStok;
        ent.nearestEd = synthBatch;
        ent.nearestSellable = synthBatch;
        ent.sellableBatches = [synthBatch];
        ent.isSynthetic = true;
      }
    }

    _batchIdx = { arr, len: arr.length, mLen: mList.length, br, day: nc.iso, dirty: false, ts: Date.now(), byId: map };
    return map;
  }

  function isBatchExpired(tglEd) {
    const iso = normalizeDateIso(tglEd);
    if (!iso) return false;
    return iso < _getNowCache().iso;
  }

  function _isActiveBranchBatch(b, branchOverride) {
    const br = branchOverride || AppState.cabangId || 'ONS-01';
    return !b.cabang_id || b.cabang_id === br;
  }

  function getTotalStok(idObat) {
    const ent = _getBatchIndex().get(idObat);
    return ent ? ent.totalStok : 0;
  }

  function getSellableStok(idObat) {
    const ent = _getBatchIndex().get(idObat);
    return ent ? ent.sellableStok : 0;
  }

  function getNearestEdBatch(idObat) {
    const ent = _getBatchIndex().get(idObat);
    return ent ? ent.nearestEd : null;
  }

  function getNearestSellableBatch(idObat) {
    const ent = _getBatchIndex().get(idObat);
    return ent ? ent.nearestSellable : null;
  }

  /**
   * Stok Minimal & Maksimal opsional:
   * Hanya mengembalikan angka jika diisi oleh pengguna (> 0). Jika kosong, kembalikan null
   * agar sistem tidak memaksa batas default 10 / 100.
   */
  function getStokMin(o) {
    if (!o) return null;
    const raw = (o.stok_min !== undefined && o.stok_min !== null && o.stok_min !== '')
      ? o.stok_min
      : ((o.stok_minimum !== undefined && o.stok_minimum !== null && o.stok_minimum !== '') ? o.stok_minimum : null);
    if (raw === null) return null;
    const n = Number(raw);
    return (isFinite(n) && n > 0) ? n : null;
  }

  function getStokMax(o) {
    if (!o) return null;
    const raw = (o.stok_max !== undefined && o.stok_max !== null && o.stok_max !== '') ? o.stok_max : null;
    if (raw === null) return null;
    const n = Number(raw);
    return (isFinite(n) && n > 0) ? n : null;
  }

  function isLowStock(o, stok) {
    const min = getStokMin(o);
    if (min === null) return false;
    const s = Number(stok !== undefined ? stok : getSellableStok(o && o.id_obat));
    return s > 0 && s <= min;
  }

  function isCriticalStock(o, stok) {
    const s = Number(stok !== undefined ? stok : getSellableStok(o && o.id_obat));
    if (s <= 0) return true;
    const min = getStokMin(o);
    return min !== null && s <= min;
  }

  function calcSuggestedOrderQty(o, stok) {
    const s = Math.max(0, Number(stok !== undefined ? stok : getSellableStok(o && o.id_obat)));
    const max = getStokMax(o);
    if (max !== null && max > s) return Math.max(1, max - s);
    const min = getStokMin(o);
    if (min !== null && min > s) return Math.max(1, min - s);
    return 1;
  }

  /**
   * Clinical Decision Support System (CDSS) Real-Time
   * Mengecek Alergi Pasien, DDI (Drug-Drug Interaction) & Golongan Keras/Prekursor/Narkotika
   */
  function checkCartCdss(cart) {
    const alerts = [];
    const member = AppState.members.find((m) => m.id_member === cart.id_member);
    const zatList = [];
    let needsApjPin = false;
    let betaLactamCount = 0;
    let nsaidCount = 0;

    cart.items.forEach((it) => {
      const obat = AppState.masterObat.find((o) => o.id_obat === it.id_obat);
      if (!obat) return;
      const zat = String(obat.zat_aktif || '').toLowerCase();
      zatList.push(zat);
      if (/amoxicillin|ampicillin|cefadroxil|cefixime|cefuroxime/.test(zat)) betaLactamCount++;
      if (/ibuprofen|mefenam|meloxicam|diclofenac|piroxicam|ketorolac/.test(zat)) nsaidCount++;

      const gol = String(obat.golongan_bpom || '').toUpperCase();
      if (gol === 'KERAS' || gol === 'NARKOTIKA' || gol === 'PSIKOTROPIKA' || gol === 'OOT' || gol === 'PREKURSOR') {
        needsApjPin = true;
      }

      if (member && member.alergi_list) {
        const alg = String(member.alergi_list).toLowerCase();
        if (alg.includes('penisilin') && (zat.includes('amoxicillin') || zat.includes('ampicillin'))) {
          alerts.push({ level: 'DANGER', msg: `BAHAYA ALERGI PENISILIN: Pasien ${member.nama_pasien} memiliki alergi Penisilin! Hindari ${obat.nama_dagang}. Gunakan substitusi non-beta-laktam.` });
          needsApjPin = true;
        } else if (alg.includes('penisilin') && (zat.includes('cefadroxil') || zat.includes('cefixime'))) {
          alerts.push({ level: 'WARN', msg: `REAKSI SILANG BETA-LAKTAM: Pasien ${member.nama_pasien} alergi Penisilin. Pantau tanda alergi pada pemberian Sefalosporin (${obat.nama_dagang}).` });
        }
        if (alg.includes('sulfa') && /sulfameth|cotrimox/.test(zat)) {
          alerts.push({ level: 'DANGER', msg: `BAHAYA ALERGI SULFA pada ${member.nama_pasien} untuk ${obat.nama_dagang}!` });
          needsApjPin = true;
        }
        if (/nsaid|aspirin/.test(alg) && /ibuprofen|mefenam|meloxicam|diclofenac/.test(zat)) {
          alerts.push({ level: 'DANGER', msg: `ALERGI NSAID/ASPIRIN terdeteksi pada ${member.nama_pasien} untuk ${obat.nama_dagang}!` });
          needsApjPin = true;
        }
      }

      const kondisi = member ? String(member.penyakit_kronis || '').toLowerCase() : '';
      if (kondisi) {
        if ((kondisi.includes('gastritis') || kondisi.includes('lambung') || kondisi.includes('gerd')) && /ibuprofen|mefenam|meloxicam|diclofenac/.test(zat)) {
          alerts.push({ level: 'WARN', msg: `PERINGATAN NSAID LAMBUNG: Pasien memiliki riwayat Gastritis/GERD. Wajib minum sesudah makan atau ganti ke Paracetamol.` });
        }
        if ((kondisi.includes('hipertensi') || kondisi.includes('jantung')) && zat.includes('pseudoephedrine')) {
          alerts.push({ level: 'DANGER', msg: `RISIKO KRISIS HIPERTENSI: ${obat.nama_dagang} mengandung Pseudoephedrine! Hati-hati pada pasien Hipertensi/Jantung ${member.nama_pasien}.` });
          needsApjPin = true;
        }
      }
    });

    const zatJoined = zatList.join(' | ');
    if (zatJoined.includes('warfarin') && /ibuprofen|mefenam|meloxicam|diclofenac|amoxicillin|sulfameth|ciprofloxacin/.test(zatJoined)) {
      alerts.push({ level: 'DANGER', msg: `INTERAKSI OBAT MAYOR (DDI): Warfarin + NSAID/Antibiotik meningkatkan risiko perdarahan serius (INR meningkat). Wajib verifikasi APJ!` });
      needsApjPin = true;
    }
    if (/simvastatin|atorvastatin/.test(zatJoined) && zatJoined.includes('amlodipine')) {
      alerts.push({ level: 'WARN', msg: `INTERAKSI MODERAT (FDA Limit): Amlodipine meningkatkan kadar Simvastatin. Batasi dosis Simvastatin maksimal 20 mg/hari.` });
    }
    if (/ciprofloxacin|levofloxacin|tetracycline|doxycycline/.test(zatJoined) && /antasida|aluminium|magnesium|zinc|ferro|kalsium/.test(zatJoined)) {
      alerts.push({ level: 'WARN', msg: `INTERAKSI ABSORPSI KHELASI: Beri jeda minimal 2-4 jam antara Antibiotik KuinoIon/Tetrasiklin dengan Antasida/Zat Besi/Zinc.` });
    }
    if (/captopril|lisinopril|valsartan|candesartan|ramipril/.test(zatJoined) && /ibuprofen|mefenam|meloxicam|diclofenac/.test(zatJoined)) {
      alerts.push({ level: 'WARN', msg: `INTERAKSI ANTIHIPERTENSI + NSAID: NSAID menurunkan efek ACEi/ARB & membebani fungsi ginjal pada pemakaian rutin.` });
    }
    if (betaLactamCount > 1) {
      alerts.push({ level: 'WARN', msg: `DUPLIKASI TERAPI ANTIBIOTIK: Terdapat ${betaLactamCount} jenis Beta-Laktam bersamaan di keranjang.` });
    }
    if (nsaidCount > 1) {
      alerts.push({ level: 'WARN', msg: `DUPLIKASI TERAPI NSAID: Hindari kombinasi >1 obat NSAID bersamaan (risiko perdarahan GI).` });
    }

    return { alerts, needsApjPin, member };
  }

  /**
   * Subtle Audio & Haptic Feedback Suite (v18.47.0)
   * Menggunakan Web Audio API synthesizer murni (tanpa file audio eksternal) dan navigator.vibrate
   */
  const Feedback = (() => {
    let _audioCtx = null;
    let _soundEnabled = typeof localStorage !== 'undefined' ? (localStorage.getItem('ons_feedback_sound') !== '0') : true;
    let _hapticEnabled = typeof localStorage !== 'undefined' ? (localStorage.getItem('ons_feedback_haptic') !== '0') : true;

    function getAudioCtx() {
      if (!_audioCtx) {
        const AC = global.AudioContext || global.webkitAudioContext;
        if (AC) _audioCtx = new AC();
      }
      if (_audioCtx && _audioCtx.state === 'suspended') {
        _audioCtx.resume().catch(() => {});
      }
      return _audioCtx;
    }

    function isSoundEnabled() { return _soundEnabled; }
    function isHapticEnabled() { return _hapticEnabled; }

    function setSoundEnabled(val) {
      _soundEnabled = Boolean(val);
      try { localStorage.setItem('ons_feedback_sound', _soundEnabled ? '1' : '0'); } catch (e) {}
    }

    function setHapticEnabled(val) {
      _hapticEnabled = Boolean(val);
      try { localStorage.setItem('ons_feedback_haptic', _hapticEnabled ? '1' : '0'); } catch (e) {}
    }

    function toggleSound() {
      setSoundEnabled(!_soundEnabled);
      return _soundEnabled;
    }

    function toggleHaptic() {
      setHapticEnabled(!_hapticEnabled);
      return _hapticEnabled;
    }

    function vibrate(pattern) {
      if (!_hapticEnabled) return;
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        try { navigator.vibrate(pattern); } catch (e) {}
      }
    }

    function play(event = 'click') {
      const ev = String(event || 'click').toLowerCase().trim();

      // Haptic Pattern on Mobile
      if (_hapticEnabled) {
        if (ev === 'scan') vibrate(50);
        else if (ev === 'add' || ev === 'cart') vibrate(40);
        else if (ev === 'success' || ev === 'pay' || ev === 'checkout') vibrate([40, 50, 80]);
        else if (ev === 'error' || ev === 'err' || ev === 'warn') vibrate([80, 50, 80]);
        else if (ev === 'key' || ev === 'click') vibrate(15);
      }

      // Audio Synthesis via Web Audio API
      if (!_soundEnabled) return;
      try {
        const ctx = getAudioCtx();
        if (!ctx) return;
        const now = ctx.currentTime;

        if (ev === 'scan') {
          // Crisp 880Hz (A5) barcode beep 70ms
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(880, now);
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.08);
        } else if (ev === 'add' || ev === 'cart') {
          // Soft rising chime: 523Hz (C5) -> 659Hz (E5)
          const osc1 = ctx.createOscillator();
          const gain1 = ctx.createGain();
          osc1.type = 'sine';
          osc1.frequency.setValueAtTime(523.25, now);
          gain1.gain.setValueAtTime(0.05, now);
          gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
          osc1.connect(gain1);
          gain1.connect(ctx.destination);
          osc1.start(now);
          osc1.stop(now + 0.065);

          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(659.25, now + 0.04);
          gain2.gain.setValueAtTime(0.06, now + 0.04);
          gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.start(now + 0.04);
          osc2.stop(now + 0.13);
        } else if (ev === 'success' || ev === 'pay' || ev === 'checkout') {
          // Pleasant success major triad chord: C5 (523), E5 (659), G5 (784)
          [523.25, 659.25, 783.99].forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.04);
            gain.gain.setValueAtTime(0.05, now + idx * 0.04);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + idx * 0.04);
            osc.stop(now + 0.3);
          });
        } else if (ev === 'error' || ev === 'err' || ev === 'warn') {
          // Subtle warm low thud (220Hz triangle wave)
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(220, now);
          gain.gain.setValueAtTime(0.07, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.16);
        } else if (ev === 'key' || ev === 'click') {
          // Tactile micro-click 1200Hz 15ms
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(1200, now);
          gain.gain.setValueAtTime(0.02, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.022);
        }
      } catch (e) {}
    }

    return {
      play,
      vibrate,
      isSoundEnabled,
      isHapticEnabled,
      setSoundEnabled,
      setHapticEnabled,
      toggleSound,
      toggleHaptic
    };
  })();

  global.playFeedback = Feedback.play;
  global.ONSFeedback = Feedback;

  /**
   * Progressive Toast Notification & Undo Suite (v18.46.0)
   * Dilengkapi countdown progress bar visual, auto-dismiss pausable on hover, tone gradient, dan tombol Undo instan.
   */
  function showToast(msg, type = 'info', duration = 4000, undoOpts = null) {
    if (typeof type === 'number') {
      const tmp = duration;
      duration = type;
      type = (typeof tmp === 'string') ? tmp : 'info';
    }
    if (typeof duration === 'function' || (typeof duration === 'object' && duration !== null && duration.onUndo)) {
      undoOpts = duration;
      duration = 4000;
    }

    const tNorm = String(type || 'info').toLowerCase().trim();
    const toneCls = (tNorm === 'ok' || tNorm === 'success') ? 'ons-toast-ok'
      : ((tNorm === 'err' || tNorm === 'error') ? 'ons-toast-err'
      : ((tNorm === 'warn' || tNorm === 'warning') ? 'ons-toast-warn' : 'ons-toast-info'));

    const iconSvg = (tNorm === 'ok' || tNorm === 'success')
      ? `<svg class="w-5 h-5 shrink-0 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5"/></svg>`
      : ((tNorm === 'err' || tNorm === 'error')
      ? `<svg class="w-5 h-5 shrink-0 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 6.75h.008v.008H12v-.008Z"/></svg>`
      : ((tNorm === 'warn' || tNorm === 'warning')
      ? `<svg class="w-5 h-5 shrink-0 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"/></svg>`
      : `<svg class="w-5 h-5 shrink-0 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"/></svg>`));

    let wrap = document.getElementById('onsToastPortal');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'onsToastPortal';
      document.body.appendChild(wrap);
    }

    const toast = document.createElement('div');
    toast.className = `ons-progressive-toast ${toneCls}`;

    let undoCallback = null;
    let undoLabel = 'Urungkan';
    if (typeof undoOpts === 'function') {
      undoCallback = undoOpts;
    } else if (undoOpts && typeof undoOpts.onUndo === 'function') {
      undoCallback = undoOpts.onUndo;
      if (undoOpts.undoLabel) undoLabel = undoOpts.undoLabel;
    }

    const undoButtonHtml = undoCallback ? `
      <button type="button" class="ons-toast-undo-btn shrink-0" title="Klik untuk membatalkan aksi ini">
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3"/></svg>
        ${esc(undoLabel)}
      </button>` : '';

    toast.innerHTML = `
      <div class="flex items-center gap-2.5 min-w-0 flex-1">
        ${iconSvg}
        <span class="leading-snug text-white font-medium text-xs sm:text-[13px] break-words">${esc(msg)}</span>
      </div>
      <div class="flex items-center gap-1.5 shrink-0">
        ${undoButtonHtml}
        <button type="button" class="p-1 text-white/70 hover:text-white rounded-lg transition-colors leading-none" title="Tutup notifikasi">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="ons-toast-progress-track">
        <div class="ons-toast-progress-fill" style="animation-duration:${Math.max(1000, duration)}ms;"></div>
      </div>
    `;

    const closeBtn = toast.querySelector('button[title="Tutup notifikasi"]');
    const undoBtn = toast.querySelector('.ons-toast-undo-btn');

    let dismissed = false;
    let timeoutId = null;

    const dismissToast = () => {
      if (dismissed) return;
      dismissed = true;
      if (timeoutId) clearTimeout(timeoutId);
      toast.classList.add('is-leaving');
      setTimeout(() => { if (toast.parentNode) toast.remove(); }, 260);
    };

    if (closeBtn) closeBtn.onclick = dismissToast;

    if (undoBtn && undoCallback) {
      undoBtn.onclick = (e) => {
        e.stopPropagation();
        dismissToast();
        try {
          undoCallback();
          showToast('Aksi berhasil dibatalkan.', 'ok', 2500);
        } catch (err) {
          console.error('[Undo Error]', err);
        }
      };
    }

    const startTimer = () => {
      timeoutId = setTimeout(dismissToast, duration);
    };

    toast.addEventListener('mouseenter', () => {
      if (timeoutId) clearTimeout(timeoutId);
    });

    toast.addEventListener('mouseleave', () => {
      if (!dismissed) startTimer();
    });

    wrap.appendChild(toast);
    startTimer();
    return toast;
  }
  global.toast = showToast;
  global.onsShowToast = showToast;
  global.onsShowSuccess = (m, d, u) => showToast(m, 'success', d, u);
  global.onsShowError   = (m, d, u) => showToast(m, 'error', d, u);
  global.onsShowWarning = (m, d, u) => showToast(m, 'warning', d, u);
  global.onsShowInfo    = (m, d, u) => showToast(m, 'info', d, u);

  let _modalCloseHook = null;

  function onModalClose(fn) {
    _modalCloseHook = typeof fn === 'function' ? fn : null;
  }

  /**
   * Modal Portal Root langsung di <body>
   * v16.1: Default membuka Workspace Layar Penuh (100vw x 100vh) agar form & tabel nyaman,
   * kecuali mode: 'spotlight' untuk pencarian cepat Ctrl+K.
   */
  function openModal(html, widthOrOpts = 'full') {
    closeModal();
    const isObj = typeof widthOrOpts === 'object' && widthOrOpts !== null;
    const isSpotlight = isObj && widthOrOpts.mode === 'spotlight';
    const maxWidth = isObj ? (widthOrOpts.maxWidth || '680px') : (typeof widthOrOpts === 'string' && widthOrOpts !== 'full' ? widthOrOpts : '680px');
    const back = document.createElement('div');
    back.id = 'onsModalRoot';
    if (isSpotlight) {
      back.className = 'ons-modal-backdrop is-spotlight';
      back.innerHTML = `<div class="ons-modal-box" role="dialog" aria-modal="true" style="max-width:${maxWidth};">${html}</div>`;
      back.addEventListener('click', (e) => {
        if (e.target === back) closeModal();
      });
    } else {
      const isCustom = String(html || '').includes('data-ws-custom="1"');
      back.className = 'ons-modal-backdrop is-full';
      back.innerHTML = isCustom
        ? `<div class="ons-modal-box is-full is-custom" role="dialog" aria-modal="true">${html}</div>`
        : `<div class="ons-modal-box is-full" role="dialog" aria-modal="true">
            <div class="ons-ws-topbar">
              <div class="flex items-center gap-2.5 min-w-0">
                <button type="button" onclick="ONSStore.closeModal()" class="ons-ws-back-btn">
                  <svg viewBox="0 0 24 24" class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
                  <span>Kembali</span>
                </button>
                <span class="ons-ws-pill hidden sm:inline-flex">Tampilan Penuh</span>
                <span class="text-xs font-semibold truncate hidden md:inline" style="color:var(--ons-text-soft)">Apotek ONS Farma</span>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <span class="hidden sm:inline text-[11px] font-mono-num" style="color:var(--ons-text-muted)">Tekan Esc untuk tutup</span>
                <button type="button" onclick="ONSStore.closeModal()" aria-label="Tutup Tampilan" class="ons-ws-close-btn" title="Tutup (Esc)">&times;</button>
              </div>
            </div>
            <div class="ons-ws-body">
              <div class="ons-ws-surface">${html}</div>
            </div>
          </div>`;
    }
    if (isObj && typeof widthOrOpts.onClose === 'function') {
      _modalCloseHook = widthOrOpts.onClose;
    }
    document.body.appendChild(back);
  }

  function closeModal() {
    const hook = _modalCloseHook;
    _modalCloseHook = null;
    if (typeof hook === 'function') {
      try { hook(); } catch (_) {}
    }
    const el = document.getElementById('onsModalRoot');
    if (el) el.remove();
  }

  /**
   * Slide-Over Context Drawer Kanan (v16.0: Detail Obat, Komparasi Cabang, Profil Member PRB)
   */
  function openDrawer(html, maxWidth = '560px') {
    closeDrawer();
    const back = document.createElement('div');
    back.id = 'onsDrawerRoot';
    back.className = 'ons-context-drawer-backdrop';
    back.innerHTML = `<div id="onsDrawerBody" class="ons-context-drawer-panel" role="dialog" style="max-width:${maxWidth};">${html}</div>`;
    back.addEventListener('click', (e) => {
      if (e.target === back) closeDrawer();
    });
    document.body.appendChild(back);
  }

  function closeDrawer() {
    const el = document.getElementById('onsDrawerRoot');
    if (el) el.remove();
  }

  /**
   * Normalisasi label program pelanggan agar tidak menampilkan label PRB / BPJS
   */
  /**
   * Helper Universal Status Badge Bernapas (v18.42.0)
   * Menghasilkan HTML pil status warna lembut berdenyut secara otomatis
   */
  function renderStatusBadge(status, customLabel) {
    const raw = String(status || '').trim().toUpperCase();
    const lbl = customLabel || raw.replace(/_/g, ' ');

    const isSuccess = ['LUNAS', 'AKTIF', 'SELESAI', 'SELESAI_DITERIMA', 'TERVERIFIKASI', 'TERVERIFIKASI_APJ', 'DIJUAL', 'SIAP_SERAH', 'AMAN', 'NORMAL', 'PASIEN_DATANG'].includes(raw);
    const isDanger = ['BATAL', 'VOID', 'EXPIRED', 'KADALUARSA', 'NEAR_ED', 'KRITIS', 'DEFECTA', 'JATUH_TEMPO', 'RUSAK', 'DITOLAK'].includes(raw);
    const isWarning = ['TEMPO', 'BELUM_LUNAS', 'PENDING', 'DRAFT', 'VALIDASI_APJ', 'ANTRIAN_VALIDASI_APJ', 'MENUNGGU', 'MENUNGGU_BARANG', 'SEBAGIAN', 'TERTAHAN'].includes(raw);

    let variantCls = 'ons-status-info';
    if (isSuccess) {
      variantCls = 'ons-status-success';
    } else if (isDanger) {
      variantCls = 'ons-status-danger';
    } else if (isWarning) {
      variantCls = 'ons-status-warning';
    }

    return `<span class="ons-status-badge ${variantCls}"><span>${esc(lbl)}</span></span>`;
  }

  function formatMemberProgram(raw) {
    const s = String(raw || 'UMUM').trim().toUpperCase();
    if (!s || s === 'UMUM') return 'UMUM';
    if (s.includes('PRB') || s.includes('BPJS') || s === 'MEMBER_RUTIN' || s === 'TERAPI_RUTIN' || s === 'KRONIS') {
      return 'MEMBER_RUTIN';
    }
    return s;
  }

  /**
   * Generator Wireframe Shimmer Skeleton Loading Interaktif (v18.44.0)
   * Menyajikan visualisasi wireframe presisi sesuai jenis tampilan (Dashboard, Table, POS, Struk, Form)
   */
  function renderSkeleton(type = 'dashboard') {
    const t = String(type || 'dashboard').toLowerCase().trim();

    if (t === 'dashboard') {
      return `<div class="ons-skeleton-container space-y-4">
        <div class="p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div class="flex items-center gap-3.5">
            <div class="ons-skeleton ons-skeleton-avatar"></div>
            <div class="space-y-2">
              <div class="ons-skeleton h-5 w-48 sm:w-64"></div>
              <div class="ons-skeleton h-3.5 w-36 sm:w-44"></div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <div class="ons-skeleton h-9 w-24 rounded-xl"></div>
            <div class="ons-skeleton h-9 w-28 rounded-xl"></div>
          </div>
        </div>

        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          ${[1, 2, 3, 4].map(() => `
            <div class="ons-skeleton-card space-y-3">
              <div class="flex items-center justify-between">
                <div class="ons-skeleton h-3.5 w-20"></div>
                <div class="ons-skeleton w-7 h-7 rounded-lg"></div>
              </div>
              <div class="ons-skeleton h-7 w-32"></div>
              <div class="ons-skeleton h-3 w-28"></div>
            </div>
          `).join('')}
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div class="lg:col-span-7 ons-skeleton-card space-y-4">
            <div class="flex items-center justify-between">
              <div class="ons-skeleton h-4 w-40"></div>
              <div class="ons-skeleton h-7 w-20 rounded-lg"></div>
            </div>
            <div class="space-y-3.5 pt-2">
              ${[85, 60, 45, 30].map(() => `
                <div class="space-y-1.5">
                  <div class="flex justify-between">
                    <div class="ons-skeleton h-3 w-28"></div>
                    <div class="ons-skeleton h-3 w-16"></div>
                  </div>
                  <div class="ons-skeleton h-2 w-full rounded-full"></div>
                </div>
              `).join('')}
            </div>
          </div>
          <div class="lg:col-span-5 ons-skeleton-card space-y-3">
            <div class="flex items-center justify-between">
              <div class="ons-skeleton h-4 w-36"></div>
              <div class="ons-skeleton h-7 w-16 rounded-lg"></div>
            </div>
            <div class="space-y-2 pt-2">
              ${[1, 2, 3, 4].map(() => `
                <div class="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                  <div class="space-y-1">
                    <div class="ons-skeleton h-3.5 w-36"></div>
                    <div class="ons-skeleton h-2.5 w-24"></div>
                  </div>
                  <div class="ons-skeleton h-4 w-16"></div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>`;
    }

    if (t === 'pos') {
      return `<div class="ons-skeleton-container space-y-3">
        <div class="flex flex-col sm:flex-row items-center gap-2">
          <div class="ons-skeleton h-11 flex-1 rounded-2xl w-full"></div>
          <div class="flex gap-2 w-full sm:w-auto">
            <div class="ons-skeleton h-11 w-24 rounded-xl"></div>
            <div class="ons-skeleton h-11 w-28 rounded-xl"></div>
          </div>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4">
          <div class="lg:col-span-8 space-y-3">
            <div class="flex items-center gap-2 overflow-x-auto pb-1">
              ${[1, 2, 3, 4, 5].map(() => `<div class="ons-skeleton h-8 w-20 rounded-full shrink-0"></div>`).join('')}
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
              ${[1, 2, 3, 4, 5, 6].map(() => `
                <div class="ons-skeleton-card space-y-3 p-3">
                  <div class="flex justify-between items-start">
                    <div class="space-y-1 flex-1">
                      <div class="ons-skeleton h-4 w-28"></div>
                      <div class="ons-skeleton h-3 w-20"></div>
                    </div>
                    <div class="ons-skeleton h-4 w-12 rounded-full"></div>
                  </div>
                  <div class="ons-skeleton h-2.5 w-24"></div>
                  <div class="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div class="ons-skeleton h-5 w-20"></div>
                    <div class="ons-skeleton h-7 w-12 rounded-lg"></div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
          <div class="lg:col-span-4 ons-skeleton-card space-y-4 p-4">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div class="ons-skeleton h-5 w-32"></div>
              <div class="ons-skeleton h-6 w-16 rounded-full"></div>
            </div>
            <div class="space-y-3 py-2">
              ${[1, 2, 3].map(() => `
                <div class="flex items-center justify-between">
                  <div class="space-y-1">
                    <div class="ons-skeleton h-3.5 w-28"></div>
                    <div class="ons-skeleton h-3 w-16"></div>
                  </div>
                  <div class="ons-skeleton h-7 w-20 rounded-lg"></div>
                </div>
              `).join('')}
            </div>
            <div class="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
              <div class="flex justify-between">
                <div class="ons-skeleton h-3.5 w-20"></div>
                <div class="ons-skeleton h-3.5 w-24"></div>
              </div>
              <div class="flex justify-between">
                <div class="ons-skeleton h-5 w-24"></div>
                <div class="ons-skeleton h-6 w-32"></div>
              </div>
              <div class="ons-skeleton h-12 w-full rounded-xl mt-2"></div>
            </div>
          </div>
        </div>
      </div>`;
    }

    if (t === 'struk' || t === 'nota') {
      return `<div class="ons-skeleton-container max-w-md mx-auto p-6 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl space-y-4">
        <div class="text-center space-y-2 pb-3 border-b border-dashed border-slate-300 dark:border-slate-700">
          <div class="ons-skeleton w-12 h-12 rounded-full mx-auto"></div>
          <div class="ons-skeleton h-5 w-48 mx-auto"></div>
          <div class="ons-skeleton h-3 w-36 mx-auto"></div>
          <div class="ons-skeleton h-3 w-28 mx-auto"></div>
        </div>
        <div class="space-y-2 py-2">
          ${[1, 2, 3, 4].map(() => `
            <div class="flex items-center justify-between text-xs">
              <div class="space-y-1">
                <div class="ons-skeleton h-3.5 w-32"></div>
                <div class="ons-skeleton h-2.5 w-20"></div>
              </div>
              <div class="ons-skeleton h-3.5 w-16"></div>
            </div>
          `).join('')}
        </div>
        <div class="pt-3 border-t border-dashed border-slate-300 dark:border-slate-700 space-y-2">
          <div class="flex justify-between">
            <div class="ons-skeleton h-3 w-20"></div>
            <div class="ons-skeleton h-3 w-20"></div>
          </div>
          <div class="flex justify-between">
            <div class="ons-skeleton h-5 w-24"></div>
            <div class="ons-skeleton h-5 w-28"></div>
          </div>
        </div>
        <div class="pt-4 text-center space-y-2">
          <div class="ons-skeleton w-24 h-24 mx-auto rounded-xl"></div>
          <div class="ons-skeleton h-3 w-36 mx-auto"></div>
        </div>
      </div>`;
    }

    if (t === 'form' || t === 'settings' || t === 'profil') {
      return `<div class="ons-skeleton-container space-y-4">
        <div class="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
          <div class="ons-skeleton h-8 w-24 rounded-lg"></div>
          <div class="ons-skeleton h-8 w-28 rounded-lg"></div>
          <div class="ons-skeleton h-8 w-24 rounded-lg"></div>
        </div>
        <div class="ons-skeleton-card space-y-4">
          <div class="ons-skeleton h-5 w-44"></div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${[1, 2, 3, 4, 5, 6].map(() => `
              <div class="space-y-1.5">
                <div class="ons-skeleton h-3.5 w-28"></div>
                <div class="ons-skeleton h-10 w-full rounded-xl"></div>
              </div>
            `).join('')}
          </div>
          <div class="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div class="ons-skeleton h-9 w-20 rounded-xl"></div>
            <div class="ons-skeleton h-9 w-28 rounded-xl"></div>
          </div>
        </div>
      </div>`;
    }

    // Default: Table Wireframe Skeleton (Master Obat, Gudang, Faktur, Defecta, Finance, dll)
    return `<div class="ons-skeleton-container space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="space-y-1.5">
          <div class="ons-skeleton h-6 w-48"></div>
          <div class="ons-skeleton h-3.5 w-64"></div>
        </div>
        <div class="flex items-center gap-2">
          <div class="ons-skeleton h-9 w-24 rounded-xl"></div>
          <div class="ons-skeleton h-9 w-32 rounded-xl"></div>
        </div>
      </div>

      <div class="ons-skeleton-card p-4 space-y-3">
        <div class="flex flex-col sm:flex-row items-center gap-3">
          <div class="ons-skeleton h-10 w-full sm:w-72 rounded-xl"></div>
          <div class="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
            <div class="ons-skeleton h-8 w-20 rounded-full"></div>
            <div class="ons-skeleton h-8 w-24 rounded-full"></div>
            <div class="ons-skeleton h-8 w-24 rounded-full"></div>
            <div class="ons-skeleton h-8 w-28 rounded-full"></div>
          </div>
        </div>
      </div>

      <div class="ons-skeleton-card p-0 overflow-hidden">
        <div class="p-3.5 bg-slate-100/70 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div class="ons-skeleton h-3.5 w-24"></div>
          <div class="ons-skeleton h-3.5 w-32"></div>
          <div class="ons-skeleton h-3.5 w-20 hidden md:block"></div>
          <div class="ons-skeleton h-3.5 w-28 hidden sm:block"></div>
          <div class="ons-skeleton h-3.5 w-16"></div>
        </div>
        <div class="divide-y divide-slate-100 dark:divide-slate-800 p-2 space-y-1">
          ${[1, 2, 3, 4, 5, 6].map((_, i) => `
            <div class="p-3 flex items-center justify-between gap-3">
              <div class="flex items-center gap-3 min-w-0 flex-1">
                <div class="ons-skeleton w-3 h-3 rounded"></div>
                <div class="space-y-1.5 flex-1 min-w-0">
                  <div class="ons-skeleton h-4 w-${i % 2 === 0 ? '48' : '56'} max-w-full"></div>
                  <div class="ons-skeleton h-3 w-32"></div>
                </div>
              </div>
              <div class="ons-skeleton h-5 w-20 rounded-full hidden sm:block"></div>
              <div class="space-y-1 hidden md:block min-w-[100px]">
                <div class="ons-skeleton h-3.5 w-20"></div>
                <div class="ons-skeleton h-2 w-full rounded-full"></div>
              </div>
              <div class="ons-skeleton h-4 w-20 hidden sm:block"></div>
              <div class="flex items-center gap-1.5">
                <div class="ons-skeleton h-7 w-12 rounded-lg"></div>
                <div class="ons-skeleton h-7 w-7 rounded-lg"></div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>`;
  }
  global.renderSkeleton = renderSkeleton;

  /**
   * Generator Friendly Empty States (v18.45.0)
   * Menyajikan tampilan visual ramah saat tabel / list kosong dengan ilustrasi, pesan edukatif, dan tombol aksi cepat.
   */
  function renderEmptyState(opts = {}) {
    const {
      icon = 'box',
      tone = 'blue',
      title = 'Data Tidak Ditemukan',
      desc = 'Belum ada data pada filter atau kategori yang dipilih.',
      actionLabel,
      actionOnClick,
      secondaryLabel,
      secondaryOnClick,
      colspan
    } = opts;

    const toneCls = {
      blue: 'ons-empty-icon-blue',
      emerald: 'ons-empty-icon-emerald',
      amber: 'ons-empty-icon-amber',
      slate: 'ons-empty-icon-slate'
    }[tone] || 'ons-empty-icon-blue';

    const iconSvgs = {
      search: `<svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="8"/><path stroke-linecap="round" stroke-linejoin="round" d="m21 21-4.35-4.35"/><path stroke-linecap="round" stroke-linejoin="round" d="M11 8a3 3 0 0 0-3 3"/></svg>`,
      check: `<svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z"/></svg>`,
      box: `<svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m8.25 3.75h.008v.008H12v-.008ZM3.75 7.5l2.25-3.75h12l2.25 3.75M3.75 7.5h16.5"/></svg>`,
      receipt: `<svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"/></svg>`,
      cart: `<svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"/></svg>`,
      users: `<svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"/></svg>`
    };

    const iconSvg = iconSvgs[icon] || iconSvgs.box;

    const actionHtml = actionLabel && actionOnClick ? `
      <button type="button" onclick="${esc(actionOnClick)}" class="ons-btn ons-btn-primary text-xs py-1.5 px-3.5 rounded-xl shadow-xs font-semibold">
        ${esc(actionLabel)}
      </button>` : '';

    const secHtml = secondaryLabel && secondaryOnClick ? `
      <button type="button" onclick="${esc(secondaryOnClick)}" class="ons-btn ons-btn-ghost text-xs py-1.5 px-3.5 rounded-xl font-semibold">
        ${esc(secondaryLabel)}
      </button>` : '';

    const actionsBlock = (actionHtml || secHtml) ? `<div class="ons-empty-actions mt-1">${actionHtml}${secHtml}</div>` : '';

    const inner = `
      <div class="ons-empty-state">
        <div class="ons-empty-state-icon-wrap ${toneCls}">
          ${iconSvg}
        </div>
        <div class="ons-empty-title">${esc(title)}</div>
        <div class="ons-empty-desc">${esc(desc)}</div>
        ${actionsBlock}
      </div>`;

    if (colspan) {
      return `<tr><td colspan="${colspan}" class="p-0 border-0">${inner}</td></tr>`;
    }
    return inner;
  }
  global.renderEmptyState = renderEmptyState;


  /**
   * Harga Jual Satuan Dasar & Konversi Kemasan (Umum / Bebas Tiering Pelanggan)
   */
  
  /**
   * Keyboard Shortcut Cheat Sheet Suite (v18.48.0)
   * Menyajikan panduan lengkap hotkey apotek digital dengan pencarian instan dan keycaps visual.
   */
  const SHORTCUT_REGISTRY = [
    {
      category: '⚡ Global & Navigasi Cepat',
      desc: 'Bisa digunakan dari mana saja di seluruh aplikasi ONS Farma',
      items: [
        { keys: ['Ctrl', 'K'], label: 'Command Palette', desc: 'Buka pusat pencarian cepat, navigasi fitur, dan aksi kilat' },
        { keys: ['?'], label: 'Cheat Sheet Pintasan', desc: 'Buka atau tutup dialog panduan tombol shortcut ini' },
        { keys: ['Esc'], label: 'Tutup Dialog / Modal', desc: 'Menutup dialog, popup modal, laci drawer, atau menu terbuka' },
        { keys: ['Alt', '1'], label: 'Dashboard Utama', desc: 'Navigasi langsung ke ringkasan operasional apotek' },
        { keys: ['Alt', '2'], label: 'Kasir POS', desc: 'Langsung menuju modul kasir & transaksi penjualan' },
        { keys: ['Alt', '3'], label: 'Master Data Obat', desc: 'Katalog obat, harga jual bertingkat, dan stok apotek' },
        { keys: ['Alt', '4'], label: 'Gudang & Batch FEFO', desc: 'Cek stok fisik gudang, nomor batch, dan expiry date' },
        { keys: ['Alt', '5'], label: 'Pengadaan & SP PBF', desc: 'Defecta otomatis dan surat pesanan resmi distributor' },
        { keys: ['Alt', '6'], label: 'Keuangan & Kas', desc: 'Buku kas, mutasi pendapatan, dan pengeluaran harian' },
        { keys: ['Alt', 'D'], label: 'Ganti Mode Gelap / Terang', desc: 'Beralih antara tema gelap (dark mode) dan terang' }
      ]
    },
    {
      category: '🛒 Kasir & Transaksi POS',
      desc: 'Dioptimalkan untuk kecepatan transaksi kasir dengan keyboard fisik / USB barcode gun',
      items: [
        { keys: ['F2'], label: 'Fokus Cari / Scan Barcode', desc: 'Langsung meletakkan kursor di kotak pencarian obat & scan barcode' },
        { keys: ['Enter'], label: 'Tambah Item / Konfirmasi', desc: 'Memasukkan produk terpilih ke keranjang belanja atau konfirmasi input' },
        { keys: ['F4'], label: 'Bayar Tunai (Cash)', desc: 'Buka dialog pembayaran tunai dengan tombol pecahan cepat & numpad sentuh' },
        { keys: ['F8'], label: 'Bayar Non-Tunai / QRIS', desc: 'Buka pembayaran dompet digital QRIS dinamis & transfer bank' },
        { keys: ['F9'], label: 'Tahan / Antrean (Hold Cart)', desc: 'Simpan keranjang pelanggan saat ini ke antrean tertunda atau panggil antrean' },
        { keys: ['F7'], label: 'Pelanggan Baru', desc: 'Buka form cepat tambah data pelanggan / pasien apotek' },
        { keys: ['F1'], label: 'Bantuan Kasir / Fokus Cari', desc: 'Fokus ke kotak pencarian produk atau buka panduan kasir' }
      ]
    },
    {
      category: '📋 Formulir & Interaksi Tabel',
      desc: 'Pintasan navigasi formulir isian obat, faktur, dan data master',
      items: [
        { keys: ['Tab'], label: 'Input Form Berikutnya', desc: 'Pindah fokus kursor ke kolom isian berikutnya secara berurutan' },
        { keys: ['Shift', 'Tab'], label: 'Input Form Sebelumnya', desc: 'Pindah fokus kursor mundur ke kolom isian sebelumnya' },
        { keys: ['Enter'], label: 'Submit / Simpan', desc: 'Menjalankan tombol aksi utama atau konfirmasi dialog' },
        { keys: ['Esc'], label: 'Batalkan Form', desc: 'Menutup form tanpa menyimpan perubahan' }
      ]
    }
  ];

  function renderShortcutItems(query = '') {
    const q = String(query || '').toLowerCase().trim();
    let totalMatches = 0;

    const sectionsHtml = SHORTCUT_REGISTRY.map((group) => {
      const filteredItems = group.items.filter((it) => {
        if (!q) return true;
        const inKeys = it.keys.some((k) => k.toLowerCase().includes(q));
        const inLabel = it.label.toLowerCase().includes(q);
        const inDesc = it.desc.toLowerCase().includes(q);
        const inCat = group.category.toLowerCase().includes(q);
        return inKeys || inLabel || inDesc || inCat;
      });

      if (!filteredItems.length) return '';
      totalMatches += filteredItems.length;

      const itemsHtml = filteredItems.map((it) => {
        const kbdHtml = it.keys.map((k) => `<kbd class="ons-kbd">${esc(k)}</kbd>`).join('<span class="text-xs font-bold text-slate-400 dark:text-slate-500 mx-0.5">+</span>');
        return `
          <div class="ons-shortcut-card">
            <div class="min-w-0 flex-1">
              <div class="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <span>${esc(it.label)}</span>
              </div>
              <div class="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">${esc(it.desc)}</div>
            </div>
            <div class="shrink-0 flex items-center gap-1">
              ${kbdHtml}
            </div>
          </div>
        `;
      }).join('');

      return `
        <div class="space-y-2">
          <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
            <h4 class="text-xs font-extrabold text-slate-700 dark:text-slate-300 tracking-wide flex items-center gap-1.5">
              ${esc(group.category)}
            </h4>
            <span class="text-[10px] font-medium text-slate-400 dark:text-slate-500">${filteredItems.length} pintasan</span>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
            ${itemsHtml}
          </div>
        </div>
      `;
    }).filter(Boolean).join('');

    if (!totalMatches) {
      return `
        <div class="py-8 text-center">
          <div class="text-3xl mb-2">🔍</div>
          <p class="text-xs font-semibold text-slate-600 dark:text-slate-300">Tidak ada pintasan yang cocok dengan "${esc(query)}"</p>
          <p class="text-[11px] text-slate-400 mt-1">Coba kata kunci lain seperti: pos, bayar, alt, f2, esc</p>
        </div>
      `;
    }

    return sectionsHtml;
  }

  /**
   * Sparkline Micro-Charts Generator (Batch 2 - Item 2, v18.50.0)
   * Menghasilkan visualisasi tren 7 hari berbasis SVG murni berukuran mikro (0 KB external dependency).
   * Dilengkapi kurva halus, gradien area tembus pandang, dan glowing pulse dot titik akhir.
   */
  function renderSparklineSvg(series, opts = {}) {
    const vals = Array.isArray(series) ? series.map((v) => Number(v || 0)) : [];
    if (vals.length < 2) return '';
    const w = Number(opts.width || 88);
    const h = Number(opts.height || 26);
    const padX = 4;
    const padY = 4;
    const color = String(opts.color || '#0066FE');
    const id = String(opts.id || ('spk_' + Math.random().toString(36).slice(2, 7)));
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const range = (max - min) || 1;
    const dx = (w - 2 * padX) / (vals.length - 1);

    const pts = vals.map((v, i) => {
      const x = Math.round((padX + i * dx) * 10) / 10;
      const y = Math.round((h - padY - ((v - min) / range) * (h - 2 * padY)) * 10) / 10;
      return { x, y, v };
    });

    const dLine = 'M ' + pts.map((p) => `${p.x} ${p.y}`).join(' L ');
    const dArea = `${dLine} L ${pts[pts.length - 1].x} ${h - 1} L ${pts[0].x} ${h - 1} Z`;
    const last = pts[pts.length - 1];

    return `
      <svg class="ons-sparkline" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" style="overflow:visible;" aria-hidden="true">
        <defs>
          <linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${color}" stop-opacity="0.38"/>
            <stop offset="100%" stop-color="${color}" stop-opacity="0.0"/>
          </linearGradient>
        </defs>
        <path d="${dArea}" fill="url(#${id})" stroke="none"/>
        <path d="${dLine}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="${last.x}" cy="${last.y}" r="3.2" fill="${color}" stroke="#FFFFFF" stroke-width="1.5"/>
      </svg>
    `;
  }
  global.renderSparklineSvg = renderSparklineSvg;

  function showShortcutCheatSheet() {
    if (global.playFeedback) global.playFeedback('key');

    const html = `
      <div id="onsShortcutCheatSheetModal" class="p-4 sm:p-5 space-y-4">
        <!-- Header -->
        <div class="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div class="flex items-center gap-2.5">
            <div class="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xl shrink-0 shadow-2xs">
              ⌨️
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100">Pintasan Keyboard (Shortcuts)</h3>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">Apotek Pro</span>
              </div>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Navigasi kilat & transaksi kasir apotek dengan keyboard fisik</p>
            </div>
          </div>
          <button type="button" onclick="ONSStore.closeModal(); if(window.playFeedback) window.playFeedback('key');" class="ons-btn ons-btn-ghost w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-base" title="Tutup (Esc)">&times;</button>
        </div>

        <!-- Search Bar -->
        <div class="relative">
          <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs">
            🔍
          </span>
          <input
            id="shortcutFilterInp"
            type="text"
            placeholder="Cari tombol atau fungsi (contoh: pos, bayar, alt, f2, esc)..."
            autocomplete="off"
            class="ons-input pl-8 pr-8 py-2 text-xs rounded-xl w-full"
            oninput="window.filterShortcutCheatSheet(this.value)"
          />
          <button
            type="button"
            onclick="const inp = document.getElementById('shortcutFilterInp'); if(inp){ inp.value=''; window.filterShortcutCheatSheet(''); inp.focus(); }"
            class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
            title="Bersihkan pencarian"
          >&times;</button>
        </div>

        <!-- Content List -->
        <div id="shortcutListContainer" class="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          ${renderShortcutItems('')}
        </div>

        <!-- Footer Info -->
        <div class="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-200 dark:border-slate-800">
          <span>Tips: Tekan <kbd class="ons-kbd text-[10px] min-w-5 h-5 px-1 font-bold">?</kbd> kapan saja untuk membuka panduan ini</span>
          <button type="button" onclick="ONSStore.closeModal(); if(window.playFeedback) window.playFeedback('key');" class="ons-btn ons-btn-subtle text-xs py-1 px-3 rounded-lg font-bold">Tutup</button>
        </div>
      </div>
    `;

    openModal(html, { mode: 'spotlight', maxWidth: '780px' });
    setTimeout(() => {
      const inp = document.getElementById('shortcutFilterInp');
      if (inp) inp.focus();
    }, 50);
  }

  global.filterShortcutCheatSheet = (query) => {
    const el = document.getElementById('shortcutListContainer');
    if (el) el.innerHTML = renderShortcutItems(query);
  };
  global.showShortcutCheatSheet = showShortcutCheatSheet;

  function getEffectiveObatPrice(obat, qtyBase = 1, tierMode = 'UMUM') {
    if (!obat) return { harga: 0, tierApplied: 'UMUM', isGrosirAuto: false };
    const h1 = Number(obat.harga_jual_1 !== undefined && obat.harga_jual_1 !== '' ? obat.harga_jual_1 : (obat.harga_umum || 0));
    return { harga: h1, tierApplied: 'UMUM', isGrosirAuto: false };
  }

  function getNearEdBatchInfo(idObat, thresholdDays = 90) {
    const ent = _getBatchIndex().get(idObat);
    if (!ent || !ent.sellableBatches.length) {
      return { hasNearEd: false, minDays: null, nearQty: 0, suggestedDiscPct: 0, noBatch: '' };
    }
    const maxDays = Number(thresholdDays || 90);
    const batches = ent.sellableBatches
      .map((b) => ({ batch: b, days: daysUntil(b.tgl_kadaluarsa) }))
      .filter((x) => x.days >= 0 && x.days <= maxDays)
      .sort((a, b) => a.days - b.days);
    if (!batches.length) return { hasNearEd: false, minDays: null, nearQty: 0, suggestedDiscPct: 0, noBatch: '' };
    const minDays = batches[0].days;
    const nearQty = batches.reduce((s, x) => s + Number(x.batch.qty_sisa || 0), 0);
    const pct = minDays <= 30 ? 20 : (minDays <= 60 ? 15 : 10);
    return { hasNearEd: true, minDays, nearQty, suggestedDiscPct: pct, noBatch: batches[0].batch.no_batch || '' };
  }

  /**
   * Generator Teks Kartu PIO & Jadwal Minum Obat Pasien WhatsApp (PMK 73/2016)
   */
  function buildPioScheduleWaText(pio) {
    const p = pio || {};
    const prof = getStoreProfile();
    const lines = [
      '*KARTU INFORMASI OBAT & JADWAL MINUM (PIO)*',
      '*' + (prof.nama_usaha || 'APOTEK ONS FARMA') + '*',
      'Apoteker : ' + (prof.nama_pemilik || 'Apoteker Penanggung Jawab'),
      'SIPA     : ' + (prof.sipa_pemilik || '-'),
      '--------------------------------',
      'Pasien   : *' + (p.nama_pasien || 'Pasien') + '*',
      'Tanggal  : ' + (p.tanggal || new Date().toLocaleDateString('id-ID')),
      ''
    ];
    (p.items || []).forEach((it, idx) => {
      const slots = [];
      if (it.pagi) slots.push('Pagi (' + (it.pagi_jam || '07:00') + ')');
      if (it.siang) slots.push('Siang (' + (it.siang_jam || '13:00') + ')');
      if (it.sore) slots.push('Sore (' + (it.sore_jam || '17:00') + ')');
      if (it.malam) slots.push('Malam (' + (it.malam_jam || '21:00') + ')');
      lines.push((idx + 1) + '. *' + (it.nama_obat || 'Obat') + '* (' + (it.dosis || '1 unit') + ')');
      lines.push('   Jadwal : ' + (slots.length ? slots.join(' | ') : 'Sesuai etiket'));
      if (it.timing) lines.push('   Cara   : _' + it.timing + '_');
      if (it.edukasi) lines.push('   Edukasi: ' + it.edukasi);
    });
    if (p.catatan_apoteker) {
      lines.push('');
      lines.push('Catatan Apoteker: ' + p.catatan_apoteker);
    }
    lines.push('--------------------------------');
    lines.push('_Konsultasi obat GRATIS bersama Apoteker. Semoga lekas sembuh!_');
    return lines.join('\n');
  }

  /**
   * Generator SVG QR Code Deterministik + CRC16 EMVCo QRIS Standar Bank Indonesia
   */
  function crc16Ccitt(data) {
    let crc = 0xFFFF;
    for (let i = 0; i < data.length; i++) {
      crc ^= data.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) {
        crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xFFFF : (crc << 1) & 0xFFFF;
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
  }

  function buildQrisEmvcoPayload(amount, invoice) {
    let raw = '000201010212';
    const mai = '0014ID.LINKAJA.WWW0118ID102000000000102150000000000000000303UMI';
    raw += '26' + String(mai.length).padStart(2, '0') + mai;
    raw += '520459125303360';
    if (amount > 0) {
      const aStr = String(Math.round(amount));
      raw += '54' + String(aStr.length).padStart(2, '0') + aStr;
    }
    raw += '5802ID5917APOTEK ONS FARMA6008MAKASSAR';
    if (invoice) {
      const add = '01' + String(invoice.length).padStart(2, '0') + invoice;
      raw += '62' + String(add.length).padStart(2, '0') + add;
    }
    raw += '6304';
    return raw + crc16Ccitt(raw);
  }

  function renderSvgQr(text, size = 180) {
    const dim = 25;
    let seed = 2166136261;
    for (let i = 0; i < text.length; i++) {
      seed = Math.imul(seed ^ text.charCodeAt(i), 16777619);
    }
    const cell = size / dim;
    let rects = '';
    const isFinder = (r, c) =>
      (r < 7 && c < 7) || (r < 7 && c >= dim - 7) || (r >= dim - 7 && c < 7);

    const drawFinder = (ox, oy) => {
      rects += `<rect x="${ox * cell}" y="${oy * cell}" width="${7 * cell}" height="${7 * cell}" fill="#09202A"/>`;
      rects += `<rect x="${(ox + 1) * cell}" y="${(oy + 1) * cell}" width="${5 * cell}" height="${5 * cell}" fill="#FFFFFF"/>`;
      rects += `<rect x="${(ox + 2) * cell}" y="${(oy + 2) * cell}" width="${3 * cell}" height="${3 * cell}" fill="#09202A"/>`;
    };
    drawFinder(0, 0);
    drawFinder(dim - 7, 0);
    drawFinder(0, dim - 7);

    let x = seed >>> 0;
    for (let r = 0; r < dim; r++) {
      for (let c = 0; c < dim; c++) {
        if (isFinder(r, c)) continue;
        x = (Math.imul(1664525, x) + 1013904223) >>> 0;
        if ((x & 3) < 2) {
          rects += `<rect x="${c * cell}" y="${r * cell}" width="${cell + 0.3}" height="${cell + 0.3}" fill="#09202A"/>`;
        }
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" style="background:#fff;padding:6px;border-radius:8px;border:1px solid #cbd5e1;">${rects}</svg>`;
  }

  /**
   * Universal 5-Format Export Helper (.xlsx, .doc, .csv, .json, Print/PDF)
   * Menghasilkan keluaran profesional berkop apotek resmi, auto-width, Rp currency,
   * AutoFilter, rumus SUM total, CSV aman UTF-8 BOM & cetak A4 rapi.
   */
  function _xlsxColLetter(idx) {
    let s = '';
    for (let n = idx + 1; n > 0; n = Math.floor((n - 1) / 26)) {
      s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
    }
    return s;
  }

  function _inferColType(h) {
    if (h && h.type) return h.type;
    const bag = (String((h && h.key) || '') + ' ' + String((h && h.label) || '')).toLowerCase();
    if (/\(rp\)|\bhpp\b|\bharga|\bomzet\b|\bmargin\b|subtotal|grand_total|diskon|biaya|nominal|hutang|piutang|valuasi/.test(bag)) return 'currency';
    if (/\(%\)|margin_pct|persen/.test(bag)) return 'percent';
    if (/^(qty|stok|awal|masuk|keluar|musnah|akhir|rasio|min_qty|poin)/.test(String((h && h.key) || '').toLowerCase()) || /\b(qty|stok|awal|masuk|keluar|musnah|akhir|rasio)\b/.test(String((h && h.label) || '').toLowerCase())) return 'int';
    if (/tgl|tanggal|ed_terdekat|timestamp|jatuh_tempo/.test(String((h && h.key) || '').toLowerCase())) return 'date';
    if (/status|golongan|risiko|triage/.test(String((h && h.key) || '').toLowerCase())) return 'status';
    if (/zat_aktif|catatan|saran|keterangan|alamat|komposisi/.test(String((h && h.key) || '').toLowerCase())) return 'wrap';
    return 'text';
  }

  function _resolveSemanticStyle(S, val) {
    const up = String(val || '').trim().toUpperCase();
    if (!up) return null;
    if (/^(AMAN|LUNAS|AKTIF|NORMAL|BEBAS|SELESAI|TERBIT|TERVERIFIKASI)$/.test(up)) return S.GOOD;
    if (/^(MENIPIS|TERBATAS|PREKURSOR|OOT|SEBAGIAN|WASPADA|MENUNGGU|SEDANG|MENUNGGU_VERIFIKASI)$/.test(up) || up.includes('NEAR')) return S.WARN;
    if (/^(HABIS|KRITIS|KADALUARSA|KERAS|NARKOTIKA|PSIKOTROPIKA|VOID|RETUR|BATAL|BELUM_LUNAS|BELUM_BAYAR|TINGGI|DANGER|BAHAYA)$/.test(up) || up.startsWith('RETUR')) return S.DANGER;
    return null;
  }

  function _csvSafeCell(val) {
    if (val === null || val === undefined) return '""';
    let s = String(val).replace(/\r?\n/g, ' ');
    const isNegativeNumber = /^-\d+(\.\d+)?$/.test(s.trim());
    if (!isNegativeNumber && /^[=+\-@\t\r]/.test(s)) {
      s = "'" + s;
    }
    return '"' + s.replace(/"/g, '""') + '"';
  }

  function _safeSheetTabName(rawTitle) {
    const clean = String(rawTitle || 'Laporan').replace(/[\\/?*[\]:]/g, ' ').replace(/\s+/g, ' ').trim();
    return (clean || 'Laporan').slice(0, 31);
  }

  function exportDataset(format, title, filenameBase, headers, rows, options) {
    const opts = options || {};
    const cfgExp = getStoreSettings ? getStoreSettings() : {};
    if (!canSeeFinancialCost() && cfgExp.lock_kasir_export !== false && !opts.allowKasirExport) {
      showToast('🔒 Akses Export Database dibatasi khusus Pemilik / APJ.', 'warn');
      return false;
    }
    const fmt = String(format || 'xlsx').toLowerCase() === 'excel' ? 'xlsx' : String(format || 'xlsx').toLowerCase();
    const normHeaders = (Array.isArray(headers) ? headers : []).map((h, i) => {
      if (typeof h === 'string') return { key: '__col_' + i, label: h, _rawIdx: i };
      return Object.assign({}, h);
    });
    normHeaders.forEach((h) => { h._type = _inferColType(h); });

    const srcRows = Array.isArray(rows) ? rows : [];
    const cleanRows = srcRows.map((r) => normHeaders.map((h) => {
      if (Array.isArray(r) && typeof h._rawIdx === 'number') {
        return r[h._rawIdx] !== undefined && r[h._rawIdx] !== null ? r[h._rawIdx] : '';
      }
      const v = r && h.key ? r[h.key] : '';
      return v !== undefined && v !== null ? v : '';
    }));

    const prof = getStoreProfile();
    const usahaNama = prof.nama_usaha || 'Apotek ONS Farma';
    const siaNo = prof.no_sia || '-';
    const alamatLine = [prof.alamat_usaha, prof.kota].filter(Boolean).join(', ');
    const userName = (AppState.user && AppState.user.nama_lengkap) || prof.nama_pemilik || 'Petugas Apotek';
    const stampText = new Date().toLocaleString('id-ID');
    const colCount = Math.max(1, normHeaders.length);
    const lastCol = _xlsxColLetter(colCount - 1);
    const hasSum = normHeaders.some((h) => h.sum === true) && cleanRows.length > 0;

    if (fmt === 'xlsx' && global.ONSXlsxExport) {
      const S = global.ONSXlsxExport.STYLE;
      const colWidths = normHeaders.map((h, cIdx) => {
        if (h.width) return Number(h.width);
        let maxLen = String(h.label || '').length + 3;
        const limitSample = Math.min(cleanRows.length, 150);
        for (let r = 0; r < limitSample; r++) {
          const val = cleanRows[r][cIdx];
          let strLen = String(val === null || val === undefined ? '' : val).length;
          if (h._type === 'currency' && typeof val === 'number') {
            strLen = ('Rp ' + Math.round(val).toLocaleString('id-ID')).length + 2;
          }
          if (strLen > maxLen) maxLen = strLen;
        }
        const floor = h._type === 'currency' ? 16 : (h._type === 'date' ? 13 : 11);
        const ceil = (h._type === 'wrap' || h.wrap) ? 38 : 42;
        return Math.max(floor, Math.min(ceil, maxLen + 2));
      });

      const titleFull = String(title || 'Laporan').toLowerCase().includes(usahaNama.toLowerCase())
        ? String(title || 'Laporan')
        : `${title} - ${usahaNama}`;
      const titleRow = [global.ONSXlsxExport.cell(titleFull.toUpperCase(), S.TITLE)];
      const subText = opts.subtitle
        ? `${usahaNama} | SIA: ${siaNo} | ${opts.subtitle}`
        : `${usahaNama} | SIA: ${siaNo} | Dicetak: ${stampText} | Oleh: ${userName} | Total Data: ${cleanRows.length} baris`;
      const subRow = [global.ONSXlsxExport.cell(subText, S.SUBTITLE)];
      for (let pad = 1; pad < colCount; pad++) {
        titleRow.push(global.ONSXlsxExport.cell('', S.TITLE));
        subRow.push(global.ONSXlsxExport.cell('', S.SUBTITLE));
      }

      const rowHeights = { 1: 30, 2: 22, 3: 28 };
      const dataRows = cleanRows.length ? cleanRows.map((row, rIdx) => {
        const alt = rIdx % 2 === 1;
        let maxLines = 1;
        const built = row.map((val, cIdx) => {
          const h = normHeaders[cIdx];
          const w = colWidths[cIdx] || 20;
          const isNumericVal = typeof val === 'number' && Number.isFinite(val);
          if (h._type === 'currency' && isNumericVal) {
            return global.ONSXlsxExport.cell(val, alt ? S.CURRENCY_ALT : S.CURRENCY, 'n');
          }
          if (h._type === 'percent' && isNumericVal) {
            return global.ONSXlsxExport.cell(val, alt ? S.PERCENT_ALT : S.PERCENT, 'n');
          }
          if (h._type === 'int' && isNumericVal) {
            return global.ONSXlsxExport.cell(val, alt ? S.INT_ALT : S.INT, 'n');
          }
          if (isNumericVal) {
            return global.ONSXlsxExport.cell(val, alt ? S.INT_ALT : S.INT, 'n');
          }
          if (h._type === 'status') {
            const sem = _resolveSemanticStyle(S, val);
            if (sem !== null) return global.ONSXlsxExport.cell(val, sem);
          }
          if (h._type === 'date' && (/^\d{4}-\d{2}-\d{2}$/.test(String(val || '')) || /^\d{2}-\d{2}-\d{4}$/.test(String(val || '')))) {
            const dispDate = /^\d{4}-\d{2}-\d{2}$/.test(String(val || '')) ? formatEd(val) : String(val);
            return global.ONSXlsxExport.cell(dispDate, alt ? S.DATE_ALT : S.DATE);
          }
          const txt = String(val === null || val === undefined ? '' : val);
          if (h._type === 'wrap' || h.wrap || txt.length > w - 2) {
            const lines = Math.max(1, Math.ceil(txt.length / Math.max(10, w - 3)));
            if (lines > maxLines) maxLines = Math.min(lines, 5);
            return global.ONSXlsxExport.cell(txt, alt ? S.TEXT_ALT : S.WRAP);
          }
          return global.ONSXlsxExport.cell(txt, alt ? S.TEXT_ALT : S.TEXT);
        });
        if (maxLines > 1) rowHeights[4 + rIdx] = Math.min(90, 15 + (maxLines - 1) * 14);
        return built;
      }) : [[global.ONSXlsxExport.cell(opts.emptyMessage || 'Belum ada data tersedia untuk diekspor pada tampilan ini.', S.INFO)]];

      const sheetRows = [
        titleRow,
        subRow,
        normHeaders.map((h) => global.ONSXlsxExport.cell(h.label, S.HEADER)),
        ...dataRows
      ];

      if (hasSum) {
        const firstDataExcelRow = 4;
        const lastDataExcelRow = 3 + cleanRows.length;
        const totalRowIndex = lastDataExcelRow + 1;
        rowHeights[totalRowIndex] = 24;
        const sumRow = normHeaders.map((h, cIdx) => {
          if (cIdx === 0 && !h.sum) {
            return global.ONSXlsxExport.cell(`TOTAL (${cleanRows.length} BARIS)`, S.TOTAL_TEXT);
          }
          if (h.sum) {
            const sumVal = cleanRows.reduce((acc, r) => acc + (Number(r[cIdx]) || 0), 0);
            const letter = _xlsxColLetter(cIdx);
            const styleId = h._type === 'currency' ? S.TOTAL_CURRENCY : S.TOTAL_INT;
            return global.ONSXlsxExport.cell(sumVal, styleId, 'n', `SUM(${letter}${firstDataExcelRow}:${letter}${lastDataExcelRow})`);
          }
          return global.ONSXlsxExport.cell('', S.TOTAL_TEXT);
        });
        sheetRows.push(sumRow);
      }

      const merges = [`A1:${lastCol}1`, `A2:${lastCol}2`];
      if (!cleanRows.length && colCount > 1) merges.push(`A4:${lastCol}4`);

      const primarySheet = {
        name: _safeSheetTabName(opts.sheetName || title),
        freezeRows: 3,
        widths: colWidths,
        rowHeights,
        merges,
        autoFilter: cleanRows.length ? `A3:${lastCol}${3 + cleanRows.length}` : '',
        rows: sheetRows
      };
      const allSheets = [primarySheet].concat(Array.isArray(opts.extraSheets) ? opts.extraSheets : []);
      global.ONSXlsxExport.download(allSheets, filenameBase + '.xlsx', { title, creator: usahaNama });
      showToast('File Excel (.xlsx) rapi berhasil diunduh.', 'ok');
      return;
    }

    if (fmt === 'csv') {
      const lines = [normHeaders.map((h) => _csvSafeCell(h.label)).join(',')];
      cleanRows.forEach((r) => lines.push(r.map((v) => _csvSafeCell(v)).join(',')));
      _triggerDownload(new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }), filenameBase + '.csv');
      showToast('File CSV (UTF-8 BOM) berhasil diunduh.', 'ok');
      return;
    }

    if (fmt === 'json') {
      _triggerDownload(new Blob([JSON.stringify(srcRows, null, 2)], { type: 'application/json;charset=utf-8' }), filenameBase + '.json');
      showToast('File JSON berhasil diunduh.', 'ok');
      return;
    }

    const formatHtmlVal = (val, h) => {
      if (val === null || val === undefined || val === '') return '-';
      if (typeof val === 'number' && Number.isFinite(val)) {
        if (h._type === 'currency') return rp(val);
        if (h._type === 'percent') return (Math.abs(val) > 0 && Math.abs(val) <= 2 ? (val * 100) : val).toFixed(1) + '%';
        return val.toLocaleString('id-ID');
      }
      return esc(val);
    };

    const totalFooterHtml = hasSum ? `<tfoot><tr style="background:#EAF2FF;font-weight:700;color:#0F172A;">
      ${normHeaders.map((h, cIdx) => {
        if (cIdx === 0 && !h.sum) return `<td style="padding:7px;border:1px solid #CBD5E1;">TOTAL (${cleanRows.length} BARIS)</td>`;
        if (h.sum) {
          const sumVal = cleanRows.reduce((acc, r) => acc + (Number(r[cIdx]) || 0), 0);
          return `<td style="padding:7px;border:1px solid #CBD5E1;text-align:right;font-family:monospace;">${h._type === 'currency' ? rp(sumVal) : sumVal.toLocaleString('id-ID')}</td>`;
        }
        return `<td style="padding:7px;border:1px solid #CBD5E1;"></td>`;
      }).join('')}
    </tr></tfoot>` : '';

    const htmlDoc = `<style>@page{size:A4 landscape;margin:12mm;}body{font-family:Arial,Helvetica,sans-serif;color:#0F172A;}</style>
      <div style="font-family:Arial,Helvetica,sans-serif;color:#0F172A;max-width:100%;">
        <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #09202A;padding-bottom:8px;margin-bottom:10px;">
          <div>
            <div style="font-size:15px;font-weight:800;letter-spacing:0.2px;color:#09202A;">${esc(title)}</div>
            <div style="font-size:11px;font-weight:700;color:#0050CA;margin-top:2px;">${esc(usahaNama.toUpperCase())}${alamatLine ? (' &bull; ' + esc(alamatLine)) : ''}</div>
            <div style="font-size:10px;color:#475569;">No. SIA: ${esc(siaNo)} &bull; APJ: ${esc(prof.nama_pemilik || '-')} (SIPA: ${esc(prof.sipa_pemilik || '-')})</div>
          </div>
          <div style="text-align:right;font-size:10px;color:#475569;">
            <div>Dicetak: <b>${esc(stampText)}</b></div>
            <div>Oleh: <b>${esc(userName)}</b></div>
            <div>Jumlah Data: <b>${cleanRows.length} baris</b></div>
          </div>
        </div>
        <table border="1" cellspacing="0" cellpadding="6" style="width:100%;border-collapse:collapse;font-size:10.5px;">
          <thead>
            <tr style="background:#09202A;color:#FFFFFF;">
              ${normHeaders.map((h) => {
                const isNum = h._type === 'currency' || h._type === 'int' || h._type === 'percent';
                return `<th style="padding:7px 6px;border:1px solid #334155;text-align:${isNum ? 'right' : 'left'};white-space:nowrap;">${esc(h.label)}</th>`;
              }).join('')}
            </tr>
          </thead>
          <tbody>
            ${cleanRows.length ? cleanRows.map((r, rIdx) => `<tr style="background:${rIdx % 2 ? '#F8FAFC' : '#FFFFFF'};">
              ${r.map((v, cIdx) => {
                const h = normHeaders[cIdx];
                const isNum = (h._type === 'currency' || h._type === 'int' || h._type === 'percent') && typeof v === 'number';
                return `<td style="padding:6px;border:1px solid #CBD5E1;text-align:${isNum ? 'right' : 'left'};${isNum ? 'font-family:monospace;white-space:nowrap;' : ''}">${formatHtmlVal(v, h)}</td>`;
              }).join('')}
            </tr>`).join('') : `<tr><td colspan="${colCount}" style="padding:14px;text-align:center;color:#64748B;">${esc(opts.emptyMessage || 'Belum ada data tersedia untuk ditampilkan.')}</td></tr>`}
          </tbody>
          ${totalFooterHtml}
        </table>
        <div style="margin-top:18px;display:flex;justify-content:space-between;align-items:flex-end;font-size:10px;color:#475569;">
          <div>Dokumen dihasilkan secara otomatis oleh Sistem ${esc(usahaNama)}.</div>
          <div style="text-align:center;">
            <div>${esc(prof.kota || 'Lokasi Apotek')}, ${esc(new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }))}</div>
            <div style="height:28px;"></div>
            <div style="font-weight:700;color:#0F172A;text-decoration:underline;">${esc(prof.nama_pemilik || 'Apoteker Penanggung Jawab')}</div>
            <div>SIPA: ${esc(prof.sipa_pemilik || '-')}</div>
          </div>
        </div>
      </div>`;

    if (fmt === 'doc') {
      _triggerDownload(new Blob([`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)}</title></head><body>${htmlDoc}</body></html>`], { type: 'application/msword' }), filenameBase + '.doc');
      showToast('Dokumen Word (.doc) berhasil diunduh.', 'ok');
      return;
    }

    printHtmlZone(htmlDoc);
  }

  function _triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 2000);
  }

  function printHtmlZone(arg1, arg2, arg3) {
    let htmlContent = '';
    let opts = {};
    if (typeof arg2 === 'string' && arg2.includes('<')) {
      htmlContent = arg2;
      opts = (arg3 && typeof arg3 === 'object') ? arg3 : {};
    } else if (typeof arg1 === 'string' && !arg1.includes('<') && typeof document !== 'undefined') {
      const targetEl = document.getElementById(arg1);
      htmlContent = targetEl ? targetEl.outerHTML : arg1;
      opts = (arg3 && typeof arg3 === 'object') ? arg3 : ((arg2 && typeof arg2 === 'object') ? arg2 : {});
    } else {
      htmlContent = String(arg1 || '');
      opts = (arg2 && typeof arg2 === 'object') ? arg2 : {};
    }
    if (opts && opts.widthMm) {
      htmlContent = `<style>@page{margin:4mm;}</style><div style="width:${Number(opts.widthMm)}mm;max-width:100%;margin:0 auto;">${htmlContent}</div>`;
    }
    let zone = document.getElementById('onsPrintZone');
    if (!zone) {
      zone = document.createElement('div');
      zone.id = 'onsPrintZone';
      zone.setAttribute('aria-hidden', 'true');
      document.body.appendChild(zone);
    }
    zone.removeAttribute('style');
    zone.innerHTML = htmlContent;
    if (typeof document !== 'undefined' && document.body) {
      document.body.classList.add('ons-is-printing');
    }
    const cleanup = () => {
      if (zone) zone.innerHTML = '';
      if (typeof document !== 'undefined' && document.body) {
        document.body.classList.remove('ons-is-printing');
      }
    };
    setTimeout(() => {
      if (typeof window !== 'undefined' && typeof window.print === 'function') {
        window.print();
        setTimeout(cleanup, 1200);
      }
    }, 150);
    if (typeof window !== 'undefined') {
      window.addEventListener('afterprint', cleanup, { once: true });
    }
  }

  /**
   * Thermal ESC/POS Bluetooth Connector ringan
   */
  const ThermalPrinter = {
    characteristic: null,
    deviceName: '',
    async connect() {
      if (!navigator.bluetooth) {
        showToast('Browser/perangkat tidak mendukung Web Bluetooth. Gunakan dialog Cetak Struk 58/80mm.', 'warn');
        return;
      }
      try {
        const dev = await navigator.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb'] });
        const server = await dev.gatt.connect();
        const svc = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
        const chars = await svc.getCharacteristics();
        this.characteristic = chars.find((c) => c.properties.write || c.properties.writeWithoutResponse) || chars[0];
        this.deviceName = dev.name || 'Thermal 58mm';
        showToast('Printer Bluetooth terhubung: ' + this.deviceName, 'ok');
      } catch (e) {
        showToast('Koneksi printer dibatalkan atau gagal: ' + e.message, 'warn');
      }
    },
    async printReceiptText(text) {
      if (!this.characteristic) {
        printHtmlZone(`<div style="width:58mm;font-family:monospace;font-size:11px;white-space:pre-wrap;line-height:1.35;">${esc(text)}</div>`);
        return;
      }
      const enc = new TextEncoder().encode('\x1B\x40' + text + '\n\n\n\x1D\x56\x42\x00');
      for (let i = 0; i < enc.length; i += 20) {
        await this.characteristic.writeValue(enc.slice(i, i + 20));
      }
      showToast('Struk terkirim ke printer Bluetooth!', 'ok');
    },
    async printRawBytes(bytes) {
      if (!this.characteristic) {
        await this.connect();
        if (!this.characteristic) return;
      }
      const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
      for (let i = 0; i < arr.length; i += 20) {
        await this.characteristic.writeValue(arr.slice(i, i + 20));
      }
      showToast('Perintah ESC/POS RAW terkirim ke printer Bluetooth!', 'ok');
    }
  };


  const SETTINGS_CACHE_KEY = 'ons_farma_store_settings_v1';

  function defaultStoreSettings() {
    return {
      pembukuan_pkp: false,
      sembunyikan_trx_batal: true,
      cegah_pembukuan_mundur: false,
      tgl_tutup_buku: '',
      format_no_transaksi: 'STANDAR',

      sembunyikan_saldo_kas_non_admin: true,
      sembunyikan_omzet_non_admin: false,
      sembunyikan_hpp_non_admin: true,
      cegah_ubah_harga_non_admin: true,

      allow_negative_stock: false,
      allow_neg_mutasi: false,
      allow_neg_batal: true,

      peringatan_rugi: 'KLIK_BAYAR',
      cegah_penjualan_rugi: true,
      tempo_piutang_hari: 30,
      cegah_jual_piutang_macet: true,

      auto_save_hold_server: true,
      allow_split_payment: true,
      pembulatan_kasir: 100,
      arah_pembulatan: 'TERDEKAT',
      blind_cash_count: true,
      max_active_shifts: 2,
      idle_lock_minutes: 15,
      max_kasir_discount_pct: 10,
      lock_kasir_export: true,

      pos_show_embalase: true,
      pos_show_tuslah: true,
      pos_show_diskon_faktur: true,
      pos_show_voucher: true,
      pos_show_ongkir: false,
      pos_show_biaya_lain: true,
      pos_show_add_pelanggan: true,
      pos_show_add_dokter: true,
      pos_show_sales: true,
      pos_show_kanal_jual: true,
      pos_show_resep: true,
      pos_show_piutang: true,

      min_ed_terima_bulan: 6,
      min_ed_jual_bulan: 3,

      blind_stock_opname: true,
      opname_routine_days: 14,
      opname_per_shift: false,

      wajib_foto_presensi: true,
      wajib_gps_presensi: true,
      toleransi_terlambat_menit: 15,
      zona_waktu: 'WITA'
    };
  }

  function getStoreSettings() {
    if (AppState.storeSettings) return AppState.storeSettings;
    try {
      const raw = localStorage.getItem(SETTINGS_CACHE_KEY);
      if (raw) {
        AppState.storeSettings = Object.assign({}, defaultStoreSettings(), JSON.parse(raw));
        return AppState.storeSettings;
      }
    } catch (e) {}
    AppState.storeSettings = defaultStoreSettings();
    return AppState.storeSettings;
  }

  function setStoreSettings(s) {
    const merged = Object.assign({}, defaultStoreSettings(), AppState.storeSettings || {}, s || {});
    AppState.storeSettings = merged;
    try { localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(merged)); } catch (e) {}
    return merged;
  }

  function getStoreProfile() {
    return _normalizeProfileObject(AppState.storeProfile);
  }

  function setStoreProfile(prof) {
    const merged = _normalizeProfileObject(prof);
    AppState.storeProfile = merged;
    try { localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(merged)); } catch (e) {}
    return merged;
  }

  function getProfileCompleteness(prof) {
    const p = prof || getStoreProfile();
    const checks = [
      { key: 'nama_pemilik', label: 'Nama Lengkap Pemilik', ok: !!String(p.nama_pemilik || '').trim() },
      { key: 'sipa_pemilik', label: 'No. SIPA / STRA', ok: !!String(p.sipa_pemilik || '').trim() },
      { key: 'foto_pemilik_url', label: 'Foto Profil Pemilik', ok: !!String(p.foto_pemilik_url || '').trim() },
      { key: 'nama_usaha', label: 'Nama Tempat Usaha', ok: !!String(p.nama_usaha || '').trim() },
      { key: 'logo_usaha_url', label: 'Logo Apotek', ok: !!String(p.logo_usaha_url || '').trim() },
      { key: 'no_sia', label: 'No. SIA & NIB OSS', ok: !!String(p.no_sia || '').trim() && !!String(p.nib_oss || '').trim() },
      { key: 'alamat_usaha', label: 'Alamat & Kota Usaha', ok: !!String(p.alamat_usaha || '').trim() && !!String(p.kota || '').trim() },
      { key: 'wa_usaha', label: 'Telepon / WhatsApp Resmi', ok: !!String(p.wa_usaha || p.telepon_usaha || '').trim() },
      { key: 'jam_operasional', label: 'Jam Operasional', ok: !!String(p.jam_operasional || '').trim() },
      { key: 'terkonfirmasi', label: 'Status Konfirmasi Legal', ok: String(p.terkonfirmasi || '').toUpperCase() === 'YA' }
    ];
    const done = checks.filter((c) => c.ok).length;
    return { done, total: checks.length, pct: Math.round((done / checks.length) * 100), checks };
  }

  function compressImageFile(file, maxDim = 220, quality = 0.8) {
    return new Promise((resolve, reject) => {
      if (!file) { reject(new Error('File gambar tidak dipilih.')); return; }
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
      reader.onload = () => {
        const src = String(reader.result || '');
        if (typeof Image === 'undefined' || typeof document === 'undefined' || !document.createElement) {
          resolve(src);
          return;
        }
        const img = new Image();
        img.onerror = () => resolve(src);
        img.onload = () => {
          try {
            const w = img.width || maxDim;
            const h = img.height || maxDim;
            const scale = Math.min(1, maxDim / Math.max(w, h));
            const cw = Math.max(1, Math.round(w * scale));
            const ch = Math.max(1, Math.round(h * scale));
            const canvas = document.createElement('canvas');
            canvas.width = cw;
            canvas.height = ch;
            const ctx = canvas.getContext && canvas.getContext('2d');
            if (!ctx) { resolve(src); return; }
            ctx.drawImage(img, 0, 0, cw, ch);
            const isPng = String(file.type || '').toLowerCase().includes('png');
            const mime = isPng ? 'image/png' : 'image/jpeg';
            const out = canvas.toDataURL(mime, quality);
            resolve(out.length > 38000 ? canvas.toDataURL('image/jpeg', 0.72) : out);
          } catch (err) {
            resolve(src);
          }
        };
        img.src = src;
      };
      reader.readAsDataURL(file);
    });
  }

  function normalizeWa62(raw) {
    let digits = String(raw == null ? '' : raw).replace(/[^0-9]/g, '');
    if (!digits || digits.length < 7) return '';
    if (digits.startsWith('0')) digits = '62' + digits.slice(1);
    else if (digits.startsWith('8')) digits = '62' + digits;
    return digits;
  }

  function buildWaUrl(phone, text) {
    const p62 = normalizeWa62(phone);
    const query = text ? ('?text=' + encodeURIComponent(String(text))) : '';
    return p62 ? ('https://wa.me/' + p62 + query) : ('https://wa.me/' + query);
  }

  function formatStrukWaMessage(d) {
    const s = d || {};
    const prof = getStoreProfile();
    const namaApotek = (s.NAMA_TOKO || prof.nama_usaha || 'APOTEK ONS FARMA').toUpperCase();
    const lines = [
      '🌿 *STRUK BELANJA DIGITAL RESMI*',
      '*' + namaApotek + '*'
    ];
    const almt = s.ALAMAT_TOKO || [prof.alamat_usaha, prof.kota].filter(Boolean).join(', ');
    if (almt) lines.push(almt);
    if (prof.no_sia || s.SIA_TOKO) lines.push('SIA: ' + (prof.no_sia || s.SIA_TOKO));
    const apjNama = prof.nama_pemilik || s.APJ_NAMA || '';
    const apjSipa = prof.sipa_pemilik || s.APJ_SIPA || '';
    if (apjNama && apjNama !== '-') lines.push('Apoteker: ' + apjNama + (apjSipa && apjSipa !== '-' ? (' (SIPA: ' + apjSipa + ')') : ''));
    lines.push('----------------------------------------');
    lines.push('No. Nota    : *' + (s.NOTA || '-') + '*');
    lines.push('Tanggal     : ' + (s.TANGGAL || new Date().toLocaleString('id-ID')));
    lines.push('Pelanggan   : ' + (s.PELANGGAN || 'Pasien Umum'));
    lines.push('Kasir       : ' + (s.KASIR || '-'));
    lines.push('Metode Bayar: ' + (s.METODE || 'TUNAI'));
    lines.push('----------------------------------------');
    lines.push('*RINCIAN ITEM BELANJA:*');
    (s.ITEM || []).forEach((it, idx) => {
      const qty = Number(it.QTY || it.qty || 1);
      const sat = it.SATUAN || it.satuan || 'Unit';
      const hrg = Number(it.HARGA || it.harga_jual || 0);
      const sub = Number(it.SUBTOTAL || (qty * hrg) || 0);
      const aturan = String(it.ATURAN_PAKAI || it.aturan_pakai || '').trim();
      lines.push((idx + 1) + '. ' + (it.NAMA || it.nama || 'Item'));
      lines.push('   ' + qty + ' ' + sat + ' x ' + rp(hrg) + ' = *' + rp(sub) + '*');
      if (aturan) lines.push('   _💊 Aturan pakai: ' + aturan + '_');
    });
    lines.push('----------------------------------------');
    lines.push('Subtotal    : ' + rp(s.SUBTOTAL || s.TOTAL || 0));
    if (Number(s.DISKON || 0) > 0) lines.push('Diskon      : -' + rp(s.DISKON));
    if (Number(s.PEMBULATAN || 0) !== 0) lines.push('Pembulatan  : ' + (Number(s.PEMBULATAN) > 0 ? '+' : '') + rp(s.PEMBULATAN));
    if (Number(s.PPN || 0) > 0) lines.push('PPN         : ' + rp(s.PPN));
    lines.push('*TOTAL AKHIR: ' + rp(s.TOTAL || 0) + '*');
    if (s.DIBAYAR != null) lines.push('Bayar / Uang: ' + rp(s.DIBAYAR));
    if (Number(s.KEMBALI || 0) > 0) lines.push('Kembali     : ' + rp(s.KEMBALI));
    if (Number(s.POIN || 0) > 0) lines.push('Poin Member : +' + s.POIN + ' poin');
    lines.push('----------------------------------------');
    const strukUrl = s.QR_URL || (typeof window !== 'undefined' && window.location ? (window.location.origin + window.location.pathname + '?nota=' + encodeURIComponent(s.NOTA || '') + '&tot=' + encodeURIComponent(String(s.TOTAL || 0))) : '');
    if (strukUrl) {
      lines.push('📄 *Buka Link Struk Digital Resmi (Tanpa Kertas):*');
      lines.push(strukUrl);
      lines.push('');
    }
    if (s.CATATAN) lines.push('Catatan: ' + s.CATATAN);
    lines.push('_Struk digital ini adalah bukti transaksi yang sah & resmi._');
    lines.push('_Terima kasih telah berbelanja di ' + (prof.nama_usaha || 'Apotek ONS Farma') + '. Semoga lekas sembuh!_ 🙏');
    return lines.join('\n');
  }

  /**
   * Generator Teks Rekap Harian Pemilik Apotek (100% Gratis via wa.me)
   * Mencakup: Omzet, Total Laba, Rincian Metode Bayar, Selisih Laci Shift, Obat Habis/Menipis, & Jatuh Tempo PBF
   */
  function buildOwnerDailyDigestText(dateIso, shiftObj) {
    const prof = getStoreProfile();
    const todayIso = dateIso || new Date().toISOString().slice(0, 10);
    const tglDisp = formatEd(todayIso);
    const salesToday = (AppState.penjualan || []).filter((p) => {
      const tgl = String(p.tanggal || '').slice(0, 10);
      return (!tgl || tgl === todayIso) && String(p.status_trx || '').toUpperCase() !== 'RETUR' && String(p.status_trx || '').toUpperCase() !== 'VOID';
    });
    let omzet = 0;
    let totalLaba = 0;
    let tunai = 0;
    let qris = 0;
    let transfer = 0;
    let piutangHariIni = 0;
    salesToday.forEach((p) => {
      const gt = Number(p.grand_total || 0);
      const hpp = Number(p.total_hpp || 0);
      const laba = (p.estimasi_margin !== undefined && p.estimasi_margin !== null && p.estimasi_margin !== '')
        ? Number(p.estimasi_margin)
        : (gt - hpp);
      omzet += gt;
      totalLaba += laba;
      const met = String(p.metode_bayar || 'TUNAI').toUpperCase();
      if (met === 'TUNAI') tunai += gt;
      else if (met === 'QRIS') qris += gt;
      else if (met === 'PIUTANG' || met === 'TEMPO') piutangHariIni += gt;
      else transfer += gt;
    });
    const marginPct = omzet > 0 ? Math.round((totalLaba / omzet) * 1000) / 10 : 0;

    // Obat stok habis / menipis
    const lowList = (AppState.masterObat || [])
      .map((o) => ({ o, stok: getSellableStok(o.id_obat), crit: isCriticalStock(o) }))
      .filter((x) => x.stok <= 0 || x.crit)
      .sort((a, b) => a.stok - b.stok);
    const lowTop = lowList.slice(0, 5).map((x) => `  • ${x.o.nama_dagang} (Sisa ${x.stok} ${x.o.satuan_dasar || 'unit'})`);

    // Faktur PBF jatuh tempo <= 7 hari atau lewat tempo
    const duePbf = (AppState.fakturPbf || []).filter((f) => {
      const sisa = Number(f.sisa_hutang || 0);
      const stBayar = String(f.status_bayar || '').toUpperCase();
      if (sisa <= 0 || stBayar === 'LUNAS' || stBayar === 'KONSINYASI' || stBayar === 'DIBATALKAN') return false;
      const dLeft = daysUntil(f.tgl_jatuh_tempo);
      return Number.isFinite(dLeft) && dLeft <= 7;
    }).sort((a, b) => daysUntil(a.tgl_jatuh_tempo) - daysUntil(b.tgl_jatuh_tempo));
    const duePbfTotal = duePbf.reduce((s, f) => s + Number(f.sisa_hutang || 0), 0);
    const duePbfTop = duePbf.slice(0, 4).map((f) => {
      const dL = daysUntil(f.tgl_jatuh_tempo);
      const tag = dL < 0 ? `TERLAMBAT ${Math.abs(dL)}h` : (dL === 0 ? 'HARI INI' : `H-${dL}`);
      return `  • ${f.id_pbf || 'PBF'} (${f.no_faktur_pbf || '-'}) ${rp(f.sisa_hutang)} [${tag}, JT ${formatEd(f.tgl_jatuh_tempo)}]`;
    });

    // Status shift & selisih kas laci
    const closedToday = (AppState.shiftHistory || []).filter((s) => String(s.status_shift || '').toUpperCase() !== 'TERBUKA' && String(s.tgl_tutup || '').slice(0, 10) === todayIso);
    const refShift = shiftObj || closedToday[0] || null;
    const actShift = AppState.activeShift || (AppState.shiftHistory || []).find((s) => String(s.status_shift || '').toUpperCase() === 'TERBUKA');
    let shiftLine = actShift ? ('TERBUKA (' + actShift.id_shift + ')') : 'Semua shift tertutup';
    let selisihLine = '';
    if (refShift) {
      const sel = Number(refShift.selisih_kas || 0);
      shiftLine = `Ditutup (${refShift.id_shift || '-'} • Kasir: ${refShift.kasir_id || '-'})`;
      selisihLine = 'Selisih Laci   : ' + (sel === 0 ? 'PAS / KLOP (Rp 0)' : ((sel > 0 ? 'LEBIH +' : 'KURANG -') + rp(Math.abs(sel))));
    }

    const nearEdCount = (AppState.stokBatch || []).filter((b) => String(b.status_batch || 'AKTIF') === 'AKTIF' && Number(b.qty_sisa || 0) > 0 && daysUntil(b.tgl_kadaluarsa) <= 90).length;

    const lines = [
      '*REKAP HARIAN ' + String(prof.nama_usaha || 'APOTEK ONS FARMA').toUpperCase() + '*',
      'Tanggal : ' + tglDisp + ' (' + salesToday.length + ' transaksi)',
      'Pemilik/APJ : ' + (prof.nama_pemilik || 'Apoteker Penanggung Jawab'),
      '--------------------------------',
      'Omzet Hari Ini : *' + rp(omzet) + '*',
      'Total Laba     : *' + rp(totalLaba) + '* (' + marginPct + '%)',
      '- Tunai        : ' + rp(tunai),
      '- QRIS         : ' + rp(qris),
      '- Transfer/EDC : ' + rp(transfer),
      ...(piutangHariIni > 0 ? ['- Piutang Baru : ' + rp(piutangHariIni)] : []),
      '--------------------------------',
      'Status Shift   : ' + shiftLine,
      ...(selisihLine ? [selisihLine] : []),
      'Stok Habis/Tipis: ' + lowList.length + ' produk',
      ...lowTop,
      ...(lowList.length > 5 ? ['  ... dan ' + (lowList.length - 5) + ' produk lainnya'] : []),
      'Faktur PBF <=7h: ' + duePbf.length + ' faktur (' + rp(duePbfTotal) + ')',
      ...duePbfTop,
      'Alert Near ED  : ' + nearEdCount + ' batch (<=90 hari / ED)',
      '--------------------------------',
      '_Dikirim 1-klik dari ONS Farma Digital_'
    ];
    return lines.join('\n');
  }

  const POS_ROUNDING_KEY = 'ons_farma_pos_rounding_v1';
  function getPosRoundingConfig() {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(POS_ROUNDING_KEY) : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (e) {}
    return { nominal: 100, arah: 'terdekat' };
  }

  function savePosRoundingConfig(cfg) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(POS_ROUNDING_KEY, JSON.stringify(cfg || { nominal: 100, arah: 'terdekat' }));
      }
    } catch (e) {}
  }

  function calculateRounding(amount, cfg) {
    const c = cfg || getPosRoundingConfig();
    const nom = Number(c.nominal || 1);
    if (nom <= 1) return 0;
    const arah = String(c.arah || 'terdekat').toLowerCase();
    let rounded = amount;
    if (arah === 'keatas') {
      rounded = Math.ceil(amount / nom) * nom;
    } else if (arah === 'kebawah') {
      rounded = Math.floor(amount / nom) * nom;
    } else {
      rounded = Math.round(amount / nom) * nom;
    }
    return rounded - amount;
  }

  function renderDokterDatalistHtml(listId) {
    const id = String(listId || 'onsDokterDatalist');
    const docs = (AppState.masterDokter || []).filter((d) => String(d.status_dokter || 'AKTIF').toUpperCase() !== 'NONAKTIF');
    return `<datalist id="${esc(id)}">${docs.map((d) => `<option value="${esc(d.nama_dokter)}">${esc([d.spesialisasi, d.faskes_klinik, d.no_sip].filter(Boolean).join(' • '))}</option>`).join('')}</datalist>`;
  }

  const DEFAULT_MASTER_KATEGORI = [
    { id_kategori: 'KAT-001', nama_kategori: 'Obat Bebas', status: 'Aktif' },
    { id_kategori: 'KAT-002', nama_kategori: 'Obat Bebas Terbatas', status: 'Aktif' },
    { id_kategori: 'KAT-003', nama_kategori: 'Obat Keras', status: 'Aktif' },
    { id_kategori: 'KAT-004', nama_kategori: 'Prekursor Farmasi', status: 'Aktif' },
    { id_kategori: 'KAT-005', nama_kategori: 'Obat-Obat Tertentu (OOT)', status: 'Aktif' },
    { id_kategori: 'KAT-006', nama_kategori: 'Psikotropika', status: 'Aktif' },
    { id_kategori: 'KAT-007', nama_kategori: 'Narkotika', status: 'Aktif' },
    { id_kategori: 'KAT-008', nama_kategori: 'Herbal & Fitofarmaka', status: 'Aktif' },
    { id_kategori: 'KAT-009', nama_kategori: 'Suplemen & Vitamin', status: 'Aktif' },
    { id_kategori: 'KAT-010', nama_kategori: 'Alat Kesehatan', status: 'Aktif' },
    { id_kategori: 'KAT-011', nama_kategori: 'Perlengkapan Bayi & Ibu', status: 'Aktif' },
    { id_kategori: 'KAT-012', nama_kategori: 'Produk Konsumsi & Lainnya', status: 'Aktif' }
  ];

  const DEFAULT_MASTER_SATUAN = [
    { id_satuan: 'SAT-001', nama_satuan: 'Ampul', status: 'Aktif' },
    { id_satuan: 'SAT-002', nama_satuan: 'Batang', status: 'Aktif' },
    { id_satuan: 'SAT-003', nama_satuan: 'Biji', status: 'Aktif' },
    { id_satuan: 'SAT-004', nama_satuan: 'Botol', status: 'Aktif' },
    { id_satuan: 'SAT-005', nama_satuan: 'Box', status: 'Aktif' },
    { id_satuan: 'SAT-006', nama_satuan: 'Buah', status: 'Aktif' },
    { id_satuan: 'SAT-007', nama_satuan: 'Bungkus', status: 'Aktif' },
    { id_satuan: 'SAT-008', nama_satuan: 'Butir', status: 'Aktif' },
    { id_satuan: 'SAT-009', nama_satuan: 'cc', status: 'Aktif' },
    { id_satuan: 'SAT-010', nama_satuan: 'cm', status: 'Aktif' },
    { id_satuan: 'SAT-011', nama_satuan: 'Tablet', status: 'Aktif' },
    { id_satuan: 'SAT-012', nama_satuan: 'Kapsul', status: 'Aktif' },
    { id_satuan: 'SAT-013', nama_satuan: 'Strip', status: 'Aktif' },
    { id_satuan: 'SAT-014', nama_satuan: 'Tube', status: 'Aktif' },
    { id_satuan: 'SAT-015', nama_satuan: 'Sachet', status: 'Aktif' },
    { id_satuan: 'SAT-016', nama_satuan: 'Vial', status: 'Aktif' },
    { id_satuan: 'SAT-017', nama_satuan: 'Pot', status: 'Aktif' },
    { id_satuan: 'SAT-018', nama_satuan: 'Pcs', status: 'Aktif' }
  ];

  const DEFAULT_MASTER_RAK = [
    { id_rak: 'RAK-001', nama_rak: 'Gudang Utama - Rak 1', status: 'Aktif' },
    { id_rak: 'RAK-002', nama_rak: 'Gudang Utama - Rak 2', status: 'Aktif' },
    { id_rak: 'RAK-003', nama_rak: 'Gudang Utama - Rak 3', status: 'Aktif' },
    { id_rak: 'RAK-004', nama_rak: 'Etalase Depan - Rak A (OTC)', status: 'Aktif' },
    { id_rak: 'RAK-005', nama_rak: 'Etalase Depan - Rak B (Suplemen)', status: 'Aktif' },
    { id_rak: 'RAK-006', nama_rak: 'Chiller Kulkas (2-8°C Vaksin & Insulin)', status: 'Aktif' },
    { id_rak: 'RAK-007', nama_rak: 'Lemari Narkotika & Psikotropika (Double Lock)', status: 'Aktif' }
  ];

  const DEFAULT_MASTER_GUDANG = [
    { id_gudang: 'GDG-001', nama_gudang: 'Gudang Utama', status: 'Aktif' }
  ];

  const DEFAULT_MASTER_KAT_PELANGGAN = [
    { id_kat_pelanggan: 'MKP-001', nama_kategori: 'Umum / Reguler', kode: 'REG', status: 'Aktif' },
    { id_kat_pelanggan: 'MKP-002', nama_kategori: 'Member Terapi Rutin', kode: 'RUTIN', status: 'Aktif' },
    { id_kat_pelanggan: 'MKP-003', nama_kategori: 'Pasien Klinik Mitra', kode: 'KLINIK', status: 'Aktif' },
    { id_kat_pelanggan: 'MKP-004', nama_kategori: 'Karyawan / Staf Apotek', kode: 'STAF', status: 'Aktif' },
    { id_kat_pelanggan: 'MKP-005', nama_kategori: 'VIP / Prioritas', kode: 'VIP', status: 'Aktif' }
  ];

  const DEFAULT_MASTER_PAJAK = [
    { id_pajak: 'TAX-001', nama_pajak: 'PPN', nilai_pajak: 11, status: 'Aktif' },
    { id_pajak: 'TAX-002', nama_pajak: 'Tanpa Pajak', nilai_pajak: 0, status: 'Aktif' }
  ];

  /**
   * Helper Regulasi BPOM Cerdas:
   * Mendeteksi golongan resmi BPOM (BEBAS, TERBATAS, KERAS, PREKURSOR, OOT, PSIKOTROPIKA, NARKOTIKA, HERBAL, ALKES)
   * secara akurat dari NIE BPOM, kandungan zat aktif, nama dagang, dan komposisi produk.
   */
  function autoDetectGolonganBpom(obat) {
    if (!obat) return 'BEBAS';
    const raw = String(obat.golongan_bpom || obat.jenis_sp || obat.golongan || '').toUpperCase().trim();
    const nie = String(obat.nie_bpom || '').toUpperCase().trim();

    const text = [
      obat.nama_dagang || '',
      obat.nama_produk || '',
      obat.nama || '',
      obat.zat_aktif || '',
      obat.komposisi || '',
      obat.kode_kfa || '',
      obat.kategori || ''
    ].join(' ').toLowerCase();

    // 1. Narkotika (NIE Awalan DNL/GNL atau mengandung zat narkotika)
    if (/^[DG]N[LI]/i.test(nie) || raw === 'NARKOTIKA' || /(kodein|codeine|morfin|morphine|petidin|pethidine|fentanil|fentanyl|oksikodon|oxycodone|metadon|methadone)/i.test(text)) {
      return 'NARKOTIKA';
    }

    // 2. Psikotropika (NIE Awalan DPL/GPL atau mengandung zat psikotropika)
    if (/^[DG]P[LI]/i.test(nie) || raw === 'PSIKOTROPIKA' || /(diazepam|alprazolam|lorazepam|clobazam|clonazepam|midazolam|phenobarbital|nitrazepam|zolpidem|chlordiazepoxide|estazolam)/i.test(text)) {
      return 'PSIKOTROPIKA';
    }

    // 3. Prekursor Farmasi (PerBPOM No. 24/2021)
    if (raw === 'PREKURSOR' || /(pseudoefedrin|pseudoephedrine|efedrin|ephedrine|fenilpropanolamin|phenylpropanolamine|\bppa\b|ergotamin|ergotamine|ergometrin|ergometrine|kalium\s*permanganat)/i.test(text)) {
      return 'PREKURSOR';
    }

    // 4. Obat-Obat Tertentu (OOT) (PerBPOM No. 10/2019)
    if (raw === 'OOT' || /(tramadol|triheksifenidil|trihexyphenidyl|klorpromazin|chlorpromazine|amitriptilin|amitriptyline|haloperidol|dekstrometorfan|dextromethorphan)/i.test(text)) {
      return 'OOT';
    }

    // 5. Alat Kesehatan (Alkes) & Medis (NIE AKD/AKL/PKD/PKL atau nama produk alkes)
    if (/^(AKD|AKL|PKD|PKL)/i.test(nie) || raw === 'ALKES' ||
        /(spuit|syringe|jarum|kasa|perban|plester|hansaplast|kapas|alkohol\s*70|rivanol|povidone|betadine|handscoon|sarung\s*tangan|infus\s*set|abocath|catheter|termometer|tensimeter|testpack|masker|oxygen|regulator|kantong\s*urin|urin\s*bag)/i.test(text)) {
      return 'ALKES';
    }

    // 6. Herbal, Jamu, OHT, Suplemen & Vitamin (NIE TR/TL/TI/HT/FF/SD/SI atau herbal)
    if (/^(TR|TL|TI|HT|FF|SD|SI)/i.test(nie) || raw === 'HERBAL' || raw === 'SUPLEMEN' ||
        /(tolak\s*angin|antangin|imboost|stimuno|curcuma|madu|minyak\s*telon|minyak\s*kayu\s*putih|enervon|redoxon|\bcdr\b|hemaviton|fitofarmaka|herbal|jamu)/i.test(text)) {
      return 'HERBAL';
    }

    // 7. Obat Keras (K / Lingkaran Merah: NIE DKL/GKL atau antibiotik, kardiovaskular, diabetes, dll.)
    const isNieKeras = /^[DG]K[LI]/i.test(nie);
    const isHardDrugPattern = /(amoxicillin|ampicillin|cefa|cefi|cipro|levo|azithro|erythro|cotrim|doxy|metronid|thiamfen|gentamicin|streptomycin|amikacin|clinda|acyclovir|asiklovir|valacyclovir|fluconazole|flukonazol|itraconazole|ketoconazole|griseofulvin|captopril|amlodipine|amlodipin|candesartan|valsartan|bisoprolol|propranolol|furosemide|furosemid|spironolactone|diltiazem|lisinopril|ramipril|nifedipine|metformin|glimepiride|glibenclamide|acarbose|pioglitazone|simvastatin|atorvastatin|rosuvastatin|fenofibrate|gemfibrozil|allopurinol|febuxostat|omeprazole|lansoprazole|pantoprazole|esomeprazole|sucralfate|domperidone|ondansetron|asam\s*mefenamat|diklofenak|diclofenac|meloxicam|ketorolac|piroxicam|celecoxib|dexamethasone|deksametason|prednisone|prednison|methylprednisolone|metilprednisolon|betamethasone|triamcinolone|cetirizine|setirisin|loratadine|salbutamol|terbutaline|aminophylline|budesonide)/i.test(text);

    if (isNieKeras || isHardDrugPattern || raw === 'KERAS') {
      return 'KERAS';
    }

    // 8. Obat Bebas Terbatas (Lingkaran Biru: NIE DTL/GTL atau CTM, antimo, flu, dll.)
    const isNieTerbatas = /^[DG]T[LI]/i.test(nie);
    const isTerbatasPattern = /(chlorpheniramine|\bctm\b|difenhidramin|dimenhidrinat|antimo|paramex|bodrex|komix|vicks|woods|obh|decolsin|benacol|siladex|paratusin|flucadex|hufagrip)/i.test(text);

    if (isNieTerbatas || isTerbatasPattern || raw === 'TERBATAS' || raw === 'BEBAS TERBATAS' || raw === 'BEBAS_TERBATAS') {
      return 'TERBATAS';
    }

    if (raw && ['BEBAS', 'TERBATAS', 'KERAS', 'PREKURSOR', 'OOT', 'PSIKOTROPIKA', 'NARKOTIKA', 'HERBAL', 'ALKES'].includes(raw)) {
      return raw;
    }

    return 'BEBAS';
  }
  global.autoDetectGolonganBpom = autoDetectGolonganBpom;

  /**
   * Helper Regulasi BPOM CDOB:
   * Menentukan jenis Surat Pesanan (SP) resmi untuk obat.
   * Obat Bebas/Reguler, Prekursor, OOT, Psikotropika, dan Narkotika
   * WAJIB menggunakan SP terpisah masing-masing dan tidak boleh dicampur.
   */
  function resolveObatJenisSp(obat) {
    if (!obat) return 'REGULER';
    const detected = autoDetectGolonganBpom(obat);
    if (detected === 'NARKOTIKA') return 'NARKOTIKA';
    if (detected === 'PSIKOTROPIKA') return 'PSIKOTROPIKA';
    if (detected === 'PREKURSOR') return 'PREKURSOR';
    if (detected === 'OOT') return 'OOT';
    return 'REGULER';
  }
  global.resolveObatJenisSp = resolveObatJenisSp;

  // ============================================================================
  // #2 PENGAMANAN DATA: BACKUP & RESTORE FULL 1-KLIK (.JSON)
  // ============================================================================
  const LAST_BACKUP_KEY = 'ons_farma_last_backup_v1';

  function getLastBackupInfo() {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(LAST_BACKUP_KEY) : null;
      if (!raw) return { timestamp: '', isoDate: '', label: 'Belum pernah dibackup', hoursAgo: Infinity, isOverdue: true };
      const obj = JSON.parse(raw);
      const ts = obj && obj.timestamp ? String(obj.timestamp) : '';
      const ms = ts ? new Date(ts).getTime() : NaN;
      if (isNaN(ms)) return { timestamp: '', isoDate: '', label: 'Belum pernah dibackup', hoursAgo: Infinity, isOverdue: true };
      const hoursAgo = Math.max(0, Math.round(((Date.now() - ms) / 3600000) * 10) / 10);
      return {
        timestamp: ts,
        isoDate: ts.slice(0, 10),
        filename: obj.filename || '',
        label: formatTgl(ts, true),
        hoursAgo,
        isOverdue: hoursAgo >= 24
      };
    } catch (e) {
      return { timestamp: '', isoDate: '', label: 'Belum pernah dibackup', hoursAgo: Infinity, isOverdue: true };
    }
  }

  function buildFullBackupPayload() {
    const storageDump = {};
    try {
      if (typeof localStorage !== 'undefined') {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && /^(ons_|ONS_)/.test(k)) {
            storageDump[k] = localStorage.getItem(k);
          }
        }
      }
    } catch (e) {}
    const prof = getStoreProfile();
    return {
      app: 'ONS_FARMA_DIGITAL',
      schema_version: '18.25.0',
      exported_at: new Date().toISOString(),
      apotek: prof.nama_usaha || 'Apotek ONS Farma',
      counts: {
        masterObat: (AppState.masterObat || []).length,
        stokBatch: (AppState.stokBatch || []).length,
        penjualan: (AppState.penjualan || []).length,
        fakturPbf: (AppState.fakturPbf || []).length,
        supplierPbf: (AppState.supplierPbf || []).length,
        members: (AppState.members || []).length
      },
      storage: storageDump,
      snapshot: {
        masterObat: AppState.masterObat || [],
        stokBatch: AppState.stokBatch || [],
        penjualan: AppState.penjualan || [],
        fakturPbf: AppState.fakturPbf || [],
        supplierPbf: AppState.supplierPbf || [],
        members: AppState.members || [],
        shiftHistory: AppState.shiftHistory || [],
        mutasiStok: AppState.mutasiStok || []
      }
    };
  }

  function downloadFullBackupJson() {
    const payload = buildFullBackupPayload();
    const now = new Date();
    const pad2 = (n) => String(n).padStart(2, '0');
    const stamp = `${pad2(now.getDate())}-${pad2(now.getMonth() + 1)}-${now.getFullYear()}_${pad2(now.getHours())}${pad2(now.getMinutes())}`;
    const filename = `ONS_Farma_Backup_${stamp}.json`;
    _triggerDownload(filename, JSON.stringify(payload, null, 2), 'application/json;charset=utf-8;');
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(LAST_BACKUP_KEY, JSON.stringify({ timestamp: payload.exported_at, filename }));
      }
    } catch (e) {}
    return { filename, counts: payload.counts, exported_at: payload.exported_at };
  }

  function restoreFullBackupJson(rawText) {
    let parsed;
    try {
      parsed = JSON.parse(String(rawText || ''));
    } catch (e) {
      throw new Error('File backup tidak valid (bukan format JSON yang benar).');
    }
    if (!parsed || parsed.app !== 'ONS_FARMA_DIGITAL' || !parsed.storage || typeof parsed.storage !== 'object') {
      throw new Error('File ini bukan file Backup resmi ONS Farma Digital.');
    }
    let keysRestored = 0;
    if (typeof localStorage !== 'undefined') {
      Object.keys(parsed.storage).forEach((k) => {
        if (/^(ons_|ONS_)/.test(k) && parsed.storage[k] !== null && parsed.storage[k] !== undefined) {
          localStorage.setItem(k, String(parsed.storage[k]));
          keysRestored++;
        }
      });
    }
    if (parsed.snapshot && typeof parsed.snapshot === 'object') {
      ['masterObat', 'stokBatch', 'penjualan', 'fakturPbf', 'supplierPbf', 'members', 'shiftHistory', 'mutasiStok'].forEach((k) => {
        if (Array.isArray(parsed.snapshot[k])) AppState[k] = parsed.snapshot[k];
      });
      invalidateStockIndex();
    }
    return {
      keysRestored,
      exportedAt: parsed.exported_at || '',
      apotek: parsed.apotek || 'Apotek ONS Farma',
      counts: parsed.counts || {}
    };
  }

  // ============================================================================
  // #4 RADAR ANTI-SALAH BELI & PERBANDINGAN HARGA PBF OTOMATIS
  // ============================================================================
  function getObatPurchaseBenchmark(idObat) {
    if (!idObat) return { lastBuy: null, cheapestBuy: null, highestBuy: null, pbfCount: 0, historyCount: 0 };
    const batches = (AppState.stokBatch || []).filter((b) => b && b.id_obat === idObat && Number(b.hpp_beli || b.hpp_batch || 0) > 0);
    const fakMap = new Map();
    (AppState.fakturPbf || []).forEach((f) => {
      if (f && f.no_faktur_pbf) fakMap.set(f.no_faktur_pbf, f);
    });
    const rows = batches.map((b) => {
      const f = b.no_faktur_pbf ? fakMap.get(b.no_faktur_pbf) : null;
      const hpp = Number(b.hpp_beli || b.hpp_batch || 0);
      const pbf = String(b.id_pbf || (f && (f.id_pbf || f.nama_pbf)) || '').trim() || 'PBF Umum';
      const tgl = normalizeDateIso((f && (f.tgl_terima || f.tgl_faktur)) || b.created_at || b.tgl_masuk || '') || String(b.created_at || '').slice(0, 10) || '';
      return { hpp, pbf, tgl, no_faktur: b.no_faktur_pbf || '-' };
    });

    if (!rows.length) {
      const ob = (AppState.masterObat || []).find((m) => m.id_obat === idObat);
      const refHpp = ob ? Number(ob.hpp_terakhir || ob.hpp_avg || 0) : 0;
      if (refHpp > 0) {
        const defEntry = { hpp: refHpp, pbf: (ob && ob.pbf_utama) || 'Master Obat', tgl: '', no_faktur: '-' };
        return { lastBuy: defEntry, cheapestBuy: defEntry, highestBuy: defEntry, pbfCount: 1, historyCount: 1 };
      }
      return { lastBuy: null, cheapestBuy: null, highestBuy: null, pbfCount: 0, historyCount: 0 };
    }

    const byDate = rows.slice().sort((a, b) => String(b.tgl || '').localeCompare(String(a.tgl || '')));
    const byPrice = rows.slice().sort((a, b) => a.hpp - b.hpp);
    const pbfSet = new Set(rows.map((r) => r.pbf).filter(Boolean));
    return {
      lastBuy: byDate[0],
      cheapestBuy: byPrice[0],
      highestBuy: byPrice[byPrice.length - 1],
      pbfCount: pbfSet.size,
      historyCount: rows.length
    };
  }

  // ============================================================================
  // #5 RADAR ANTI-KEBOCORAN (PENGAWASAN KHUSUS PEMILIK / APJ)
  // ============================================================================
  function getOwnerLeakageRadar(daysWindow = 1) {
    const winDays = Math.max(1, Number(daysWindow || 1));
    const cutoffIso = new Date(Date.now() - (winDays - 1) * 86400000).toISOString().slice(0, 10);
    const inWindow = (rawDate) => {
      const iso = normalizeDateIso(rawDate) || String(rawDate || '').slice(0, 10);
      if (!iso) return true;
      return iso >= cutoffIso;
    };

    const diskonRugi = [];
    const returVoid = [];
    (AppState.penjualan || []).forEach((p) => {
      if (!p || !inWindow(p.tanggal)) return;
      const status = String(p.status_trx || 'LUNAS').toUpperCase();
      const gt = Number(p.grand_total || 0);
      const disc = Number(p.diskon_total || p.diskon_rp || 0);
      const bruto = gt + disc;
      const discPct = bruto > 0 ? Math.round((disc / bruto) * 1000) / 10 : 0;
      const hpp = Number(p.total_hpp || 0);
      const laba = (p.estimasi_margin !== undefined && p.estimasi_margin !== null && p.estimasi_margin !== '')
        ? Number(p.estimasi_margin)
        : (gt - hpp);

      if (status === 'RETUR' || status === 'VOID' || status === 'RETUR_SEBAGIAN' || Number(p.qty_retur || 0) > 0) {
        returVoid.push({
          no_invoice: p.no_invoice || '-',
          tanggal: p.tanggal || '',
          kasir: p.kasir_id || '-',
          nominal: gt,
          alasan: p.retur_alasan || status
        });
      } else if (laba < 0 || discPct >= 15) {
        diskonRugi.push({
          no_invoice: p.no_invoice || '-',
          tanggal: p.tanggal || '',
          kasir: p.kasir_id || '-',
          nominal: gt,
          diskon: disc,
          discPct,
          laba,
          reason: laba < 0 ? 'Jual Rugi (< HPP)' : `Diskon Besar (${discPct}%)`
        });
      }
    });

    const stokKurangManual = [];
    (AppState.mutasiStok || []).forEach((m) => {
      if (!m || !inWindow(m.timestamp)) return;
      const qty = Number(m.qty_ubah || 0);
      const jenis = String(m.jenis_mutasi || '').toUpperCase();
      if (qty < 0 && /(OPNAME|PENYESUAIAN|ADJUST|RUSAK|HILANG|KOREKSI|MUSNAH|SELISIH)/.test(jenis)) {
        const ob = (AppState.masterObat || []).find((o) => o.id_obat === m.id_obat);
        const hpp = Number(m.hpp_beli || (ob && ob.hpp_avg) || 0);
        stokKurangManual.push({
          id_obat: m.id_obat,
          nama_dagang: m.nama_dagang || (ob && ob.nama_dagang) || m.id_obat,
          no_batch: m.no_batch || '-',
          qty_kurang: Math.abs(qty),
          nilai_hpp: Math.abs(qty) * hpp,
          jenis,
          user: m.user_id || '-',
          catatan: m.catatan || '-',
          timestamp: m.timestamp || ''
        });
      }
    });

    const selisihShift = [];
    (AppState.shiftHistory || []).forEach((sh) => {
      if (!sh || String(sh.status_shift || '').toUpperCase() === 'TERBUKA') return;
      if (!inWindow(sh.tgl_tutup || sh.tgl_buka)) return;
      const sel = Number(sh.selisih_kas || 0);
      if (Math.abs(sel) > 0) {
        selisihShift.push({
          id_shift: sh.id_shift || '-',
          kasir: sh.kasir_id || '-',
          tgl_tutup: sh.tgl_tutup || '',
          selisih: sel,
          catatan: sh.catatan_handover || '-'
        });
      }
    });

    const totalAlerts = diskonRugi.length + returVoid.length + stokKurangManual.length + selisihShift.length;
    return { totalAlerts, diskonRugi, returVoid, stokKurangManual, selisihShift, daysWindow: winDays };
  }

  // ============================================================================
  // #6 PELACAK OBAT YANG HARGANYA BERUBAH HARI INI (UNTUK LABEL RAK / SHELF TALKER)
  // ============================================================================
  const PRICE_CHANGED_LOG_KEY = 'ons_price_changed_log_v1';

  function getPriceChangedLog() {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(PRICE_CHANGED_LOG_KEY) : null;
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }

  function markObatPriceChanged(idObat, oldPrice, newPrice) {
    if (!idObat) return;
    const todayIso = new Date().toISOString().slice(0, 10);
    const log = getPriceChangedLog();
    log[idObat] = {
      id_obat: idObat,
      date: todayIso,
      old_price: Number(oldPrice || 0),
      new_price: Number(newPrice || 0),
      at: new Date().toISOString()
    };
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(PRICE_CHANGED_LOG_KEY, JSON.stringify(log));
      }
    } catch (e) {}
  }

  function getTodayChangedPriceObatIds(dateIso) {
    const targetIso = dateIso || new Date().toISOString().slice(0, 10);
    const log = getPriceChangedLog();
    return Object.keys(log).filter((id) => log[id] && log[id].date === targetIso);
  }

  global.ONSStore = {
    getLastBackupInfo,
    buildFullBackupPayload,
    downloadFullBackupJson,
    restoreFullBackupJson,
    getObatPurchaseBenchmark,
    getOwnerLeakageRadar,
    getPriceChangedLog,
    markObatPriceChanged,
    getTodayChangedPriceObatIds,
    autoDetectGolonganBpom,
    resolveObatJenisSp,
    AppState,
    defaultStoreProfile,
    DEFAULT_MASTER_KATEGORI,
    DEFAULT_MASTER_SATUAN,
    DEFAULT_MASTER_RAK,
    DEFAULT_MASTER_GUDANG,
    DEFAULT_MASTER_KAT_PELANGGAN,
    DEFAULT_MASTER_PAJAK,
    sanitizeLegacyOwnerName,
    getStoreProfile,
    setStoreProfile,
    defaultStoreSettings,
    getStoreSettings,
    setStoreSettings,
    getProfileCompleteness,
    compressImageFile,
    normalizeWa62,
    buildWaUrl,
    formatStrukWaMessage,
    buildOwnerDailyDigestText,
    toggleDarkMode,
    rp,
    parseNumber,
    parseNum: parseNumber,
    formatNumberWithDots,
    formatDots: formatNumberWithDots,
    maskNumberInput,
    renderStatusBadge,
    statusBadge: renderStatusBadge,
    renderSkeleton,
    renderEmptyState,
    showShortcutCheatSheet,
    renderShortcutItems,
    renderSparklineSvg,
    SHORTCUT_REGISTRY,
    emptyState: renderEmptyState,
    Feedback,
    playFeedback: Feedback.play,
    esc,
    formatTgl,
    daysUntil,
    bpomBadge,
    getRole,
    RBAC_MODULE_CATALOG,
    DEFAULT_ROLE_PERMS,
    getUserPermissions,
    canAccessView,
    canAccessSubTab,
    getAuditSystem,
    setAuditSystem,
    canSeeFinancialCost,
    isMultiBranchEnabled,
    getActiveBranches,
    getBranchLabel,
    setMultiBranchMode,
    isBatchExpired,
    normalizeDateIso,
    formatEd,
    invalidateStockIndex,
    getTotalStok,
    getSellableStok,
    getNearestEdBatch,
    getNearestSellableBatch,
    getStokMin,
    getStokMax,
    isLowStock,
    isCriticalStock,
    calcSuggestedOrderQty,
    checkCartCdss,
    getEffectiveObatPrice,
    getNearEdBatchInfo,
    formatMemberProgram,
    buildPioScheduleWaText,
    renderDokterDatalistHtml,
    toast: showToast,
    openModal,
    closeModal,
    onModalClose,
    openDrawer,
    closeDrawer,
    buildQrisEmvcoPayload,
    renderSvgQr,
    exportDataset,
    downloadFile: _triggerDownload,
    printHtmlZone,
    printHtml: printHtmlZone,
    ThermalPrinter,
    getPosRoundingConfig,
    savePosRoundingConfig,
    calculateRounding,
    _isLegacySensitive,
    sanitizeLegacyOwnerName
  };
})(window);


/* ============================================================
   ONS FARMA v18.31.0 — GLOBAL UX UTILITIES
   - Item #4: Konfirmasi Hapus Global
   - Item #5: Toast/Error Notification System
   - Item #7: Page Transition Helper
   - Item #8: Keyboard Shortcuts
   ============================================================ */

// ===== ITEM #4: KONFIRMASI HAPUS GLOBAL =====
window.onsConfirmDelete = function(itemName, onConfirm, onCancel) {
  const overlay = document.createElement('div');
  overlay.className = 'ons-confirm-overlay';
  overlay.innerHTML = `
    <div class="ons-confirm-box">
      <div style="text-align:center;margin-bottom:1.5rem">
        <div style="width:60px;height:60px;background:#fee2e2;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 1rem;flex-shrink:0">
          <svg width="30" height="30" fill="none" stroke="#ef4444" stroke-width="2" viewBox="0 0 24 24"><polyline points="3,6 5,6 21,6"/><path d="M19,6l-1,14a2,2,0,0,1-2,2H8a2,2,0,0,1-2-2L5,6"/><path d="M10,11v6M14,11v6"/><path d="M9,6V4a1,1,0,0,1,1-1h4a1,1,0,0,1,1,1v2"/></svg>
        </div>
        <h3 style="font-size:1.1rem;font-weight:700;margin:0 0 0.5rem;color:var(--ons-text,#1e293b)">Konfirmasi Hapus</h3>
        <p style="color:var(--ons-text-muted,#64748b);font-size:0.875rem;margin:0;line-height:1.6">
          Apakah Anda yakin ingin menghapus<br>
          <strong style="color:#ef4444">${itemName || 'data ini'}</strong>?<br>
          <span style="font-size:0.8rem;opacity:0.8">Data yang dihapus tidak dapat dikembalikan.</span>
        </p>
      </div>
      <div style="display:flex;gap:0.75rem">
        <button id="ons-confirm-cancel" style="flex:1;padding:0.65rem;border-radius:0.65rem;border:1px solid var(--ons-border,#e2e8f0);background:transparent;cursor:pointer;font-weight:600;font-size:0.875rem;color:var(--ons-text-muted,#64748b);transition:all 0.15s">Batal</button>
        <button id="ons-confirm-ok" style="flex:1;padding:0.65rem;border-radius:0.65rem;border:none;background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;cursor:pointer;font-weight:700;font-size:0.875rem;transition:all 0.15s;box-shadow:0 4px 12px rgba(239,68,68,0.35)">🗑️ Hapus</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  const cancel = () => { overlay.remove(); onCancel && onCancel(); };
  const confirm = () => { overlay.remove(); onConfirm && onConfirm(); };
  overlay.querySelector('#ons-confirm-cancel').onclick = cancel;
  overlay.querySelector('#ons-confirm-ok').onclick = confirm;
  overlay.addEventListener('click', (e) => { if (e.target === overlay) cancel(); });
  document.addEventListener('keydown', function escHandler(e) {
    if (e.key === 'Escape') { cancel(); document.removeEventListener('keydown', escHandler); }
  });
};

// Shortcut: ganti semua confirm('Hapus?') yang masih ada dengan onsConfirmDelete
window.onsConfirm = window.onsConfirmDelete; // alias

// ===== ITEM #5: TOAST NOTIFICATION SYSTEM (Unified with showToast) =====
window.onsShowToast = function(msg, type, duration, undoOpts) { return showToast(msg, type, duration, undoOpts); };
window.onsShowSuccess = function(msg, dur, undoOpts) { return showToast(msg, 'success', dur, undoOpts); };
window.onsShowError   = function(msg, dur, undoOpts) { return showToast(msg, 'error', dur, undoOpts); };
window.onsShowWarning = function(msg, dur, undoOpts) { return showToast(msg, 'warning', dur, undoOpts); };
window.onsShowInfo    = function(msg, dur, undoOpts) { return showToast(msg, 'info', dur, undoOpts); };

// ===== ITEM #7: PAGE TRANSITION HELPER =====
window.onsAnimateView = function(containerEl) {
  if (!containerEl) return;
  containerEl.classList.remove('ons-view-enter');
  void containerEl.offsetWidth; // force reflow
  containerEl.classList.add('ons-view-enter');
};

window.onsAnimateTab = function(containerEl) {
  if (!containerEl) return;
  containerEl.classList.remove('ons-tab-content-enter');
  void containerEl.offsetWidth;
  containerEl.classList.add('ons-tab-content-enter');
};

// Auto-inject animasi ke mainViewSlot saat navigasi (patch ke renderView jika ada)
(function patchViewTransition() {
  if (typeof window === 'undefined' || typeof document === 'undefined' || typeof MutationObserver === 'undefined') return;
  var mainSlot = document.getElementById('mainViewSlot') || document.getElementById('ons-main-content');
  if (!mainSlot) {
    if (document.addEventListener) {
      document.addEventListener('DOMContentLoaded', function() {
        var slot = document.getElementById('mainViewSlot') || document.getElementById('ons-main-content');
        if (slot && typeof MutationObserver !== 'undefined') {
          var obs = new MutationObserver(function() {
            slot.classList.remove('ons-view-enter');
            void slot.offsetWidth;
            slot.classList.add('ons-view-enter');
          });
          obs.observe(slot, { childList: true });
        }
      });
    }
    return;
  }
  var obs = new MutationObserver(function() {
    mainSlot.classList.remove('ons-view-enter');
    void mainSlot.offsetWidth;
    mainSlot.classList.add('ons-view-enter');
  });
  obs.observe(mainSlot, { childList: true });
})();

// ===== ITEM #8: KEYBOARD SHORTCUTS =====
(function initOnsKeyboardShortcuts() {
  if (typeof window === 'undefined' || typeof document === 'undefined' || !document.addEventListener) return;
  document.addEventListener('keydown', function(e) {
    // Jangan aktif saat mengetik di form
    var tag = (e.target && e.target.tagName) ? e.target.tagName.toUpperCase() : '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (e.target && e.target.isContentEditable) return;

    var key = e.key;

    // F2 — Fokus ke search bar
    if (key === 'F2') {
      e.preventDefault();
      var el = document.getElementById('ons-global-search')
            || document.querySelector('.ons-search-input')
            || document.querySelector('[placeholder*="Cari"]')
            || document.querySelector('[placeholder*="cari"]')
            || document.querySelector('[placeholder*="Search"]');
      if (el) { el.focus(); el.select(); window.onsShowInfo && window.onsShowInfo('🔍 Mode pencarian aktif (Esc untuk keluar)', 1500); }
    }

    // Escape — Tutup modal/dialog
    if (key === 'Escape') {
      var modal = document.querySelector('.ons-confirm-overlay');
      if (modal) { modal.remove(); return; }
      var openModal = document.querySelector('.ons-modal[style*="flex"]')
                   || document.querySelector('[id*="modal"][style*="flex"]')
                   || document.querySelector('[id*="Modal"][style*="flex"]');
      if (openModal) {
        var closeBtn = openModal.querySelector('[onclick*="close"], [onclick*="Close"], [onclick*="tutup"], .ons-modal-close, [data-dismiss]');
        if (closeBtn) closeBtn.click();
      }
    }

    // ? — Tampilkan bantuan shortcut
    if (key === '?' && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      window.onsShowInfo && window.onsShowInfo(
        '<strong>⌨️ Shortcut Keyboard:</strong><br>• <kbd style="background:#334155;color:#e2e8f0;padding:1px 5px;border-radius:3px;font-size:0.8em">F2</kbd> Fokus pencarian<br>• <kbd style="background:#334155;color:#e2e8f0;padding:1px 5px;border-radius:3px;font-size:0.8em">Esc</kbd> Tutup dialog',
        'info', 5000
      );
    }
  });

  // Tampilkan hint shortcut saat pertama buka (sekali saja)
  document.addEventListener('DOMContentLoaded', function() {
    var shown = sessionStorage.getItem('ons-shortcut-hint');
    if (!shown) {
      setTimeout(function() {
        window.onsShowInfo && window.onsShowInfo('💡 Tips: Tekan <strong>F2</strong> untuk pencarian cepat, <strong>?</strong> untuk bantuan shortcut', 'info', 5000);
        sessionStorage.setItem('ons-shortcut-hint', '1');
      }, 2500);
    }
  });
})();

// Ekspor shortcuts list (untuk referensi)
window.onsShortcuts = {
  'F2':  'Fokus pencarian cepat',
  'Esc': 'Tutup dialog / modal',
  '?':   'Tampilkan daftar shortcut'
};
