/**
 * ONS FARMA DIGITAL ENTERPRISE v10.0 - Store, RBAC Guards, CDSS Rules, EMVCo QRIS, ESC/POS & 5-Format Export
 */
(function (global) {
  'use strict';

  const DARK_KEY = 'ons_farma_v10_dark';
  const PROFILE_CACHE_KEY = 'ons_farma_v13_profile';
  const AUDIT_SYS_KEY = 'ons_farma_v164_audit_sys';

  const RBAC_MODULE_CATALOG = [
    { key: 'dashboard', label: 'Beranda & Audit BPOM', group: 'Operasional' },
    { key: 'pos', label: 'Kasir POS FEFO & Riwayat', group: 'Operasional' },
    { key: 'tutup-shift', label: 'Tutup Shift & Laci Kas', group: 'Operasional' },
    { key: 'obat', label: 'Master Data Obat & Harga', group: 'Persediaan' },
    { key: 'gudang', label: 'Persediaan & Kartu Stok', group: 'Persediaan' },
    { key: 'gudang:opname', label: 'Stock Opname Fisik', group: 'Persediaan' },
    { key: 'gudang:transfer', label: 'Mutasi Antar-Cabang', group: 'Persediaan' },
    { key: 'defecta', label: 'Defecta & Surat Pesanan A4', group: 'Pembelian' },
    { key: 'faktur', label: 'Terima Faktur, Scan & Retur', group: 'Pembelian' },
    { key: 'eresep-prb', label: 'E-Resep Dokter & PRB', group: 'Klinis' },
    { key: 'pemeriksaan', label: 'Pemeriksaan Pasien (POCT)', group: 'Klinis' },
    { key: 'klinis', label: 'Pelayanan Klinis (SOAP/PIO)', group: 'Klinis' },
    { key: 'crm-wa', label: 'Pelanggan & CRM Broadcast WA', group: 'Klinis' },
    { key: 'finance', label: 'Keuangan, P&L, Piutang & Pajak', group: 'Keuangan' },
    { key: 'billing', label: 'Tagihan & Kwitansi QR', group: 'Keuangan' },
    { key: 'sipnap', label: 'Laporan SIPNAP & Pareto ABC', group: 'Keuangan' },
    { key: 'doc-engine', label: 'Dokumen Resmi QR HMAC', group: 'Keuangan' },
    { key: 'settings', label: 'Pengaturan Usaha & Akun', group: 'Sistem' },
    { key: 'settings:audit', label: 'Edit Sistem Audit & Log Audit', group: 'Sistem' },
    { key: 'mobile-preview', label: 'Tampilan Mode HP', group: 'Sistem' }
  ];

  const ALL_PERM_KEYS = RBAC_MODULE_CATALOG.map((m) => m.key);
  const DEFAULT_ROLE_PERMS = {
    Pemilik: ALL_PERM_KEYS.slice(),
    APJ: ALL_PERM_KEYS.slice(),
    Kasir: ['dashboard', 'pos', 'gudang', 'pemeriksaan', 'billing', 'tutup-shift', 'mobile-preview']
  };

  function defaultAuditSystem(cabangId) {
    return {
      cabang_id: cabangId || 'ONS-01',
      apj_user_id: 'USR-002',
      apj_nama: 'apt. Siti Rahma, S.Farm',
      apj_sipa: '19920412/SIPA_35.78/2025/1042',
      kasir_user_id: 'USR-003',
      kasir_nama: 'Budi Santoso (Kasir)',
      catatan_audit: 'Pemeriksaan rutin CDOB & kesiapan stok harian.',
      updated_at: '',
      updated_by: 'Sistem',
      items: [
        { id: 'AUDC-1', label: 'Verifikasi Laci Narkotika', checked: true, pj_role: 'APJ', pj_nama: 'apt. Siti Rahma, S.Farm', keterangan: 'Terkunci ganda & kartu stok sesuai' },
        { id: 'AUDC-2', label: 'Prioritas Jual Batch FEFO', checked: true, pj_role: 'Kasir', pj_nama: 'Budi Santoso (Kasir)', keterangan: 'Batch ED terdekat diprioritaskan di POS' },
        { id: 'AUDC-3', label: 'Order SP PBF Sebelum 14:00', checked: false, pj_role: 'APJ', pj_nama: 'apt. Siti Rahma, S.Farm', keterangan: 'Menunggu approval SP harian' }
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
      return Object.assign({}, def, parsed, {
        items: Array.isArray(parsed.items) && parsed.items.length ? parsed.items : def.items
      });
    } catch (e) {
      return def;
    }
  }

  function defaultStoreProfile() {
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
      dikonfirmasi_pada: '',
      updated_at: ''
    };
  }

  function sanitizeLegacyOwnerName(val, fallback) {
    const s = String(val || '').trim();
    if (!s || /hendra\s+wijaya/i.test(s)) return fallback || 'apt. Anissa Faradifa R. Is Rumi';
    return s;
  }

  function _normalizeProfileObject(prof) {
    const merged = Object.assign({}, defaultStoreProfile(), prof || {});
    merged.nama_pemilik = sanitizeLegacyOwnerName(merged.nama_pemilik, 'apt. Anissa Faradifa R. Is Rumi');
    merged.dikonfirmasi_oleh = sanitizeLegacyOwnerName(merged.dikonfirmasi_oleh, merged.nama_pemilik);
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
      pos: 'kasir',
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
    stokBatch: [],
    members: [],
    supplierPbf: [],
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
    branchesList: ['ONS-01', 'ONS-02', 'ONS-03'],
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
  }
  document.documentElement.classList.toggle('dark', AppState.darkMode);

  /**
   * Formatter Uang & Tanggal Indonesia + Escape HTML
   */
  function rp(n) {
    return 'Rp ' + Math.round(Number(n || 0)).toLocaleString('id-ID');
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatTgl(iso) {
    if (!iso) return '-';
    try {
      return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) { return String(iso).slice(0, 10); }
  }

  function daysUntil(dateStr) {
    if (!dateStr) return 9999;
    const ms = new Date(dateStr).getTime() - Date.now();
    return Math.ceil(ms / 86400000);
  }

  function bpomBadge(gol) {
    const g = String(gol || 'BEBAS').toUpperCase();
    const cls = g === 'KERAS' ? 'bpom-keras' : (g === 'TERBATAS' ? 'bpom-terbatas' : (g === 'PREKURSOR' || g === 'OOT' ? 'bpom-prekursor' : (g === 'NARKOTIKA' || g === 'PSIKOTROPIKA' ? 'bpom-narkotika' : 'bpom-bebas')));
    return `<span class="badge-bpom ${cls}">${esc(g)}</span>`;
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
    return perms.includes(viewId);
  }

  function canAccessSubTab(viewId, subTab) {
    const r = getRole();
    if (r === 'Pemilik') return true;
    const perms = getUserPermissions(AppState.user);
    const compound = `${viewId}:${subTab}`;
    if (compound === 'gudang:opname' || compound === 'gudang:transfer' || compound === 'settings:audit') {
      return perms.includes(compound);
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

  /**
   * Kalkulator Stok FEFO Total & Layak Jual (Belum Kadaluarsa) per ID Obat
   */
  function isBatchExpired(tglEd) {
    const iso = String(tglEd || '').slice(0, 10);
    if (!iso) return false;
    return iso < new Date().toISOString().slice(0, 10);
  }

  function _isActiveBranchBatch(b, branchOverride) {
    const br = branchOverride || AppState.cabangId || 'ONS-01';
    return !b.cabang_id || b.cabang_id === br;
  }

  function getTotalStok(idObat) {
    return AppState.stokBatch
      .filter((b) => b.id_obat === idObat && String(b.status_batch || 'AKTIF') === 'AKTIF' && _isActiveBranchBatch(b))
      .reduce((acc, b) => acc + Number(b.qty_sisa || 0), 0);
  }

  function getSellableStok(idObat) {
    return AppState.stokBatch
      .filter((b) => b.id_obat === idObat && String(b.status_batch || 'AKTIF') === 'AKTIF' && Number(b.qty_sisa || 0) > 0 && !isBatchExpired(b.tgl_kadaluarsa) && _isActiveBranchBatch(b))
      .reduce((acc, b) => acc + Number(b.qty_sisa || 0), 0);
  }

  function getNearestEdBatch(idObat) {
    return AppState.stokBatch
      .filter((b) => b.id_obat === idObat && String(b.status_batch || 'AKTIF') === 'AKTIF' && Number(b.qty_sisa || 0) > 0 && _isActiveBranchBatch(b))
      .sort((a, b) => String(a.tgl_kadaluarsa).localeCompare(String(b.tgl_kadaluarsa)))[0] || null;
  }

  function getNearestSellableBatch(idObat) {
    return AppState.stokBatch
      .filter((b) => b.id_obat === idObat && String(b.status_batch || 'AKTIF') === 'AKTIF' && Number(b.qty_sisa || 0) > 0 && !isBatchExpired(b.tgl_kadaluarsa) && _isActiveBranchBatch(b))
      .sort((a, b) => String(a.tgl_kadaluarsa).localeCompare(String(b.tgl_kadaluarsa)))[0] || null;
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
   * Toast Notification ringan & tidak menumpuk
   */
  function showToast(msg, type = 'info') {
    let wrap = document.getElementById('onsToastPortal');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'onsToastPortal';
      wrap.style.cssText = 'position:fixed;bottom:1.25rem;right:1.25rem;z-index:10050;display:flex;flex-direction:column;gap:0.5rem;max-width:380px;';
      document.body.appendChild(wrap);
    }
    const bg = type === 'ok' ? '#006C4A' : (type === 'err' ? '#DC2626' : (type === 'warn' ? '#D97706' : '#09202A'));
    const el = document.createElement('div');
    el.style.cssText = `background:${bg};color:#fff;padding:0.75rem 1rem;border-radius:0.75rem;box-shadow:0 10px 25px rgba(0,0,0,.28);font-size:0.84rem;font-weight:500;display:flex;align-items:center;justify-content:space-between;gap:0.75rem;`;
    el.innerHTML = `<span>${esc(msg)}</span><button onclick="this.parentElement.remove()" style="background:none;border:none;color:#fff;font-weight:700;cursor:pointer;font-size:1rem;">&times;</button>`;
    wrap.appendChild(el);
    setTimeout(() => { if (el.parentNode) el.remove(); }, 4200);
  }
  global.toast = showToast;

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
   * Smart Pricing Bertingkat (Umum / Member / Grosir Min-Qty / Faskes) & Promo Near-ED
   */
  function getEffectiveObatPrice(obat, qtyBase = 1, tierMode = 'UMUM') {
    if (!obat) return { harga: 0, tierApplied: 'UMUM', isGrosirAuto: false };
    const mode = String(tierMode || 'UMUM').toUpperCase();
    const hUmum = Number(obat.harga_umum || 0);
    const hMember = Number(obat.harga_member || hUmum || 0);
    const hGrosir = Number(obat.harga_grosir || hMember || hUmum || 0);
    const hFaskes = Number(obat.harga_faskes || hGrosir || hMember || hUmum || 0);
    const minGrosir = Math.max(1, Number(obat.min_qty_grosir || 10));
    const q = Math.max(1, Number(qtyBase || 1));
    if (mode === 'FASKES') {
      return { harga: hFaskes, tierApplied: 'FASKES', isGrosirAuto: false };
    }
    if (mode === 'GROSIR') {
      return { harga: hGrosir, tierApplied: 'GROSIR', isGrosirAuto: false };
    }
    const baseTarget = mode === 'MEMBER' ? hMember : hUmum;
    if (Number(obat.harga_grosir || 0) > 0 && q >= minGrosir && hGrosir > 0 && hGrosir < baseTarget) {
      return { harga: hGrosir, tierApplied: 'GROSIR_AUTO', isGrosirAuto: true };
    }
    if (mode === 'MEMBER') {
      return { harga: hMember, tierApplied: 'MEMBER', isGrosirAuto: false };
    }
    return { harga: hUmum, tierApplied: 'UMUM', isGrosirAuto: false };
  }

  function getNearEdBatchInfo(idObat, thresholdDays = 90) {
    const batches = AppState.stokBatch
      .filter((b) => b.id_obat === idObat && String(b.status_batch || 'AKTIF') === 'AKTIF' && Number(b.qty_sisa || 0) > 0 && !isBatchExpired(b.tgl_kadaluarsa) && (!b.cabang_id || b.cabang_id === AppState.cabangId))
      .map((b) => ({ batch: b, days: daysUntil(b.tgl_kadaluarsa) }))
      .filter((x) => x.days >= 0 && x.days <= Number(thresholdDays || 90))
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
      'Apoteker : ' + (prof.nama_pemilik || 'apt. Anissa Faradifa R. Is Rumi'),
      'SIPA     : ' + (prof.sipa_pemilik || '19920412/SIPA_35.78/2025/1042'),
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
   */
  function exportDataset(format, title, filenameBase, headers, rows) {
    const cleanRows = rows.map((r) => headers.map((h) => r[h.key] !== undefined ? r[h.key] : ''));
    if (format === 'xlsx' && global.ONSXlsxExport) {
      const S = global.ONSXlsxExport.STYLE;
      const sheetRows = [
        [global.ONSXlsxExport.cell(title, S.TITLE)],
        [global.ONSXlsxExport.cell('Dicetak: ' + new Date().toLocaleString('id-ID') + ' | Apotek ONS Farma Enterprise', S.SUBTITLE)],
        headers.map((h) => global.ONSXlsxExport.cell(h.label, S.HEADER)),
        ...cleanRows.map((row, idx) => row.map((val, cIdx) => {
          const isNum = typeof val === 'number';
          return global.ONSXlsxExport.cell(val, isNum ? (idx % 2 ? S.INT_ALT : S.INT) : (idx % 2 ? S.TEXT_ALT : S.TEXT));
        }))
      ];
      global.ONSXlsxExport.download([{ name: title.slice(0, 28), freezeRows: 3, widths: headers.map(() => 20), rows: sheetRows }], filenameBase + '.xlsx');
      showToast('File Excel (.xlsx) berhasil diunduh.', 'ok');
      return;
    }

    if (format === 'csv') {
      const lines = [headers.map((h) => `"${String(h.label).replace(/"/g, '""')}"`).join(',')];
      cleanRows.forEach((r) => lines.push(r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')));
      _triggerDownload(new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }), filenameBase + '.csv');
      showToast('File CSV berhasil diunduh.', 'ok');
      return;
    }

    if (format === 'json') {
      _triggerDownload(new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' }), filenameBase + '.json');
      showToast('File JSON berhasil diunduh.', 'ok');
      return;
    }

    const htmlTable = `<h2 style="margin:0 0 6px;">${esc(title)}</h2><p style="font-size:12px;color:#555;margin:0 0 12px;">Apotek ONS Farma Enterprise — ${new Date().toLocaleString('id-ID')}</p>
      <table border="1" cellspacing="0" cellpadding="6" style="width:100%;border-collapse:collapse;font-size:11px;font-family:Arial,sans-serif;">
        <thead style="background:#09202A;color:#fff;"><tr>${headers.map((h) => `<th>${esc(h.label)}</th>`).join('')}</tr></thead>
        <tbody>${cleanRows.map((r) => `<tr>${r.map((v) => `<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>`;

    if (format === 'doc') {
      _triggerDownload(new Blob([`<html><meta charset="utf-8"><body>${htmlTable}</body></html>`], { type: 'application/msword' }), filenameBase + '.doc');
      showToast('Dokumen Word (.doc) berhasil diunduh.', 'ok');
      return;
    }

    printHtmlZone(htmlTable);
  }

  function _triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 1500);
  }

  function printHtmlZone(innerHtml) {
    let zone = document.getElementById('onsPrintZone');
    if (!zone) {
      zone = document.createElement('div');
      zone.id = 'onsPrintZone';
      document.body.appendChild(zone);
    }
    zone.innerHTML = innerHtml;
    setTimeout(() => {
      if (typeof window !== 'undefined' && typeof window.print === 'function') window.print();
    }, 150);
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
    const lines = [
      '*STRUK PEMBELIAN DIGITAL*',
      '*' + (s.NAMA_TOKO || prof.nama_usaha || 'APOTEK ONS FARMA') + '*'
    ];
    const almt = s.ALAMAT_TOKO || [prof.alamat_usaha, prof.kota].filter(Boolean).join(', ');
    if (almt) lines.push(almt);
    if (prof.no_sia) lines.push('SIA: ' + prof.no_sia);
    lines.push('--------------------------------');
    lines.push('No. Nota  : *' + (s.NOTA || '-') + '*');
    lines.push('Tanggal   : ' + (s.TANGGAL || new Date().toLocaleString('id-ID')));
    lines.push('Pelanggan : ' + (s.PELANGGAN || 'Pasien Umum'));
    lines.push('Kasir     : ' + (s.KASIR || '-'));
    lines.push('--------------------------------');
    (s.ITEM || []).forEach((it, idx) => {
      const qty = Number(it.QTY || it.qty || 1);
      const sat = it.SATUAN || it.satuan || 'Unit';
      const hrg = Number(it.HARGA || it.harga_jual || 0);
      const sub = Number(it.SUBTOTAL || (qty * hrg) || 0);
      const aturan = String(it.ATURAN_PAKAI || it.aturan_pakai || '').trim();
      lines.push((idx + 1) + '. ' + (it.NAMA || it.nama || 'Item'));
      lines.push('   ' + qty + ' ' + sat + ' x ' + rp(hrg) + ' = *' + rp(sub) + '*');
      if (aturan) lines.push('   _Aturan pakai: ' + aturan + '_');
    });
    lines.push('--------------------------------');
    lines.push('Subtotal  : ' + rp(s.SUBTOTAL || s.TOTAL || 0));
    if (Number(s.DISKON || 0) > 0) lines.push('Diskon    : -' + rp(s.DISKON));
    if (Number(s.PPN || 0) > 0) lines.push('PPN       : ' + rp(s.PPN));
    lines.push('*TOTAL    : ' + rp(s.TOTAL || 0) + '*');
    lines.push('Bayar (' + (s.METODE || 'TUNAI') + ') : ' + rp(s.DIBAYAR || s.TOTAL || 0));
    if (Number(s.KEMBALI || 0) > 0) lines.push('Kembali   : ' + rp(s.KEMBALI));
    if (Number(s.POIN || 0) > 0) lines.push('Poin (+)  : +' + s.POIN + ' poin');
    lines.push('--------------------------------');
    if (s.CATATAN) lines.push('Catatan: ' + s.CATATAN);
    if (s.QR_URL) lines.push('Verifikasi Nota: ' + s.QR_URL);
    lines.push('APJ/Pemilik: ' + (prof.nama_pemilik || 'apt. Anissa Faradifa R. Is Rumi'));
    lines.push('_Terima kasih, semoga lekas sembuh!_');
    return lines.join('\n');
  }

  /**
   * Generator Teks Rekap Malam Harian Pemilik Apotek (100% Gratis via wa.me)
   */
  function buildOwnerDailyDigestText(dateIso) {
    const prof = getStoreProfile();
    const todayIso = dateIso || new Date().toISOString().slice(0, 10);
    const salesToday = (AppState.penjualan || []).filter((p) => {
      const tgl = String(p.tanggal || '').slice(0, 10);
      return (!tgl || tgl === todayIso) && String(p.status_trx || '') !== 'RETUR';
    });
    let omzet = 0;
    let margin = 0;
    let tunai = 0;
    let nonTunai = 0;
    let piutangHariIni = 0;
    salesToday.forEach((p) => {
      const gt = Number(p.grand_total || 0);
      omzet += gt;
      margin += Number(p.estimasi_margin || 0);
      const met = String(p.metode_bayar || 'TUNAI').toUpperCase();
      if (met === 'TUNAI') tunai += gt;
      else if (met === 'PIUTANG') piutangHariIni += gt;
      else nonTunai += gt;
    });
    const openPiutang = (AppState.piutangPelanggan || []).filter((pt) => String(pt.status_piutang || '').toUpperCase() !== 'LUNAS');
    const totalPiutangSisa = openPiutang.reduce((s, pt) => s + Number(pt.sisa_piutang || 0), 0);
    const defectaCount = (AppState.masterObat || []).filter((o) => getSellableStok(o.id_obat) <= Number(o.stok_minimum || 0)).length;
    const nearEdCount = (AppState.stokBatch || []).filter((b) => String(b.status_batch || 'AKTIF') === 'AKTIF' && Number(b.qty_sisa || 0) > 0 && daysUntil(b.tgl_kadaluarsa) <= 90).length;
    const actShift = AppState.activeShift || (AppState.shiftHistory || []).find((s) => String(s.status_shift || '').toUpperCase() === 'TERBUKA');

    const lines = [
      '*REKAP HARIAN ' + String(prof.nama_usaha || 'APOTEK ONS FARMA').toUpperCase() + '*',
      'Tanggal : ' + todayIso + ' (' + salesToday.length + ' nota)',
      'Pemilik/APJ : ' + (prof.nama_pemilik || 'apt. Anissa Faradifa R. Is Rumi'),
      '--------------------------------',
      'Omzet Hari Ini : ' + rp(omzet),
      'Est. Laba Kotor: ' + rp(margin),
      '- Tunai        : ' + rp(tunai),
      '- QRIS/EDC/Trf : ' + rp(nonTunai),
      '- Piutang Baru : ' + rp(piutangHariIni),
      '--------------------------------',
      'Piutang Aktif  : ' + openPiutang.length + ' nota (' + rp(totalPiutangSisa) + ')',
      'Alert Defecta  : ' + defectaCount + ' produk perlu restok',
      'Alert Near ED  : ' + nearEdCount + ' batch (<=90 hari / ED)',
      'Status Shift   : ' + (actShift ? ('TERBUKA (' + actShift.id_shift + ')') : 'Semua shift tertutup'),
      '--------------------------------',
      '_Dikirim 1-klik dari ONS Farma Digital v15.0 (Gratis Tanpa Gateway)_'
    ];
    return lines.join('\n');
  }

  global.ONSStore = {
    AppState,
    defaultStoreProfile,
    sanitizeLegacyOwnerName,
    getStoreProfile,
    setStoreProfile,
    getProfileCompleteness,
    compressImageFile,
    normalizeWa62,
    buildWaUrl,
    formatStrukWaMessage,
    buildOwnerDailyDigestText,
    toggleDarkMode,
    rp,
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
    isBatchExpired,
    getTotalStok,
    getSellableStok,
    getNearestEdBatch,
    getNearestSellableBatch,
    checkCartCdss,
    getEffectiveObatPrice,
    getNearEdBatchInfo,
    buildPioScheduleWaText,
    openModal,
    closeModal,
    onModalClose,
    openDrawer,
    closeDrawer,
    buildQrisEmvcoPayload,
    renderSvgQr,
    exportDataset,
    printHtmlZone,
    ThermalPrinter
  };
})(window);
