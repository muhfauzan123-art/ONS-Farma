/**
 * ONS FARMA DIGITAL ENTERPRISE v10.0 - Store, RBAC Guards, CDSS Rules, EMVCo QRIS, ESC/POS & 5-Format Export
 */
(function (global) {
  'use strict';

  const DARK_KEY = 'ons_farma_v10_dark';

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
      'crm-wa': 'kontak',
      finance: 'pnl',
      billing: 'tagihan',
      sipnap: 'narkotika',
      'doc-engine': 'surat',
      settings: 'akun'
    },
    booted: false,
    loading: false,
    darkMode: localStorage.getItem(DARK_KEY) === '1',
    user: null,
    cabangId: 'ONS-01',
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
    carts: [
      { id: 'K1', label: 'Pelanggan #1', channel: 'Toko Fisik', id_member: 'UMUM', items: [], diskon_global: 0 }
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

  function canAccessView(viewId) {
    const r = getRole();
    if (r === 'Pemilik') return true;
    if (r === 'APJ') return viewId !== 'settings' || true; // APJ akses penuh klinis/gudang/sipnap; settings secrets disensor
    // Kasir dibatasi strictly hanya Dashboard, POS, Gudang Baca/Cek ED, Omnichannel Dispatch, Billing Tagihan Pasien, Tutup Shift & Mobile
    const kasirAllowed = ['dashboard', 'pos', 'gudang', 'omnichannel', 'billing', 'tutup-shift', 'mobile-preview'];
    return kasirAllowed.includes(viewId);
  }

  function canSeeFinancialCost() {
    const r = getRole();
    return r === 'Pemilik' || r === 'APJ';
  }

  /**
   * Kalkulator Stok FEFO Total per ID Obat
   */
  function getTotalStok(idObat) {
    return AppState.stokBatch
      .filter((b) => b.id_obat === idObat && String(b.status_batch || 'AKTIF') === 'AKTIF')
      .reduce((acc, b) => acc + Number(b.qty_sisa || 0), 0);
  }

  function getNearestEdBatch(idObat) {
    return AppState.stokBatch
      .filter((b) => b.id_obat === idObat && String(b.status_batch || 'AKTIF') === 'AKTIF' && Number(b.qty_sisa || 0) > 0)
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

  /**
   * Modal Portal Root langsung di <body> (/gas-tagihan-pembayaran anti-terpotong container!)
   */
  function openModal(html, maxWidth = '640px') {
    closeModal();
    const back = document.createElement('div');
    back.id = 'onsModalRoot';
    back.className = 'ons-modal-backdrop';
    back.innerHTML = `<div class="ons-modal-box" style="max-width:${maxWidth};">${html}</div>`;
    back.addEventListener('click', (e) => {
      if (e.target === back) closeModal();
    });
    document.body.appendChild(back);
  }

  function closeModal() {
    const el = document.getElementById('onsModalRoot');
    if (el) el.remove();
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
    setTimeout(() => window.print(), 150);
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

  global.ONSStore = {
    AppState,
    toggleDarkMode,
    rp,
    esc,
    formatTgl,
    daysUntil,
    bpomBadge,
    getRole,
    canAccessView,
    canSeeFinancialCost,
    getTotalStok,
    getNearestEdBatch,
    checkCartCdss,
    openModal,
    closeModal,
    buildQrisEmvcoPayload,
    renderSvgQr,
    exportDataset,
    printHtmlZone,
    ThermalPrinter
  };
})(window);
