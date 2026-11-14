/**
 * ONS FARMA DIGITAL ENTERPRISE v17.9 - Thermal Receipt, Label & ESC/POS Engine
 * - Parser direktif baris: [C], [L], [R], [B], [H], [2], [LR]Kiri||Kanan, [-], [=], [BOX], [QR], [BAR], [LOGO], [FEED], [CUT], // komentar
 * - Variabel {{KEY}}, blok berulang {{#ITEM}}...{{/ITEM}}, blok kondisional {{?KEY}}...{{/KEY}},
 *   serta modifier berantai (|rp, |kosong0, |kapital, |kecil, |angka, |tgl)
 * - Auto-normalisasi alias variabel & profil apotek agar template lama maupun baru selalu tampil rapi tanpa kolom kosong
 * - Output multi-target: Live Preview 58/80mm, Browser Print, Web Bluetooth ESC/POS, RawBT Android, PNG HiDPI, & Etiket Obat
 */
(function (global) {
  'use strict';

  const DEFAULT_STRUK_TEMPLATE = `[C][B][2]{{NAMA_TOKO}}[/B][/2]
[C]{{ALAMAT_TOKO}}
{{?SIA_TOKO}}[C]SIA: {{SIA_TOKO}}
{{/SIA_TOKO}}{{?WA_TOKO}}[C]Telp/WA: {{WA_TOKO}}
{{/WA_TOKO}}[=]
[LR]No Nota||{{NOTA}}
[LR]Tanggal||{{TANGGAL}}
[LR]Kasir||{{KASIR}}
[LR]Pasien||{{PELANGGAN}}
[LR]Bayar||{{METODE}}
[-]
{{#ITEM}}
[B]{{NAMA}}[/B]
[LR]  {{QTY}} {{SATUAN}} x {{HARGA|rp}}||{{SUBTOTAL|rp}}
{{?ATURAN_PAKAI}}[L]  Aturan: {{ATURAN_PAKAI}}
{{/ATURAN_PAKAI}}{{/ITEM}}
[-]
[LR]Subtotal||{{SUBTOTAL|rp}}
{{?DISKON}}[LR]Diskon||-{{DISKON|rp}}
{{/DISKON}}{{?TUSLAH}}[LR]Jasa Racik/Tuslah||{{TUSLAH|rp}}
{{/TUSLAH}}{{?EMBALASE}}[LR]Embalase/Kemasan||{{EMBALASE|rp}}
{{/EMBALASE}}{{?PPN}}[LR]PPN/Pajak||{{PPN|rp}}
{{/PPN}}[LR][B]TOTAL BAYAR||{{TOTAL|rp}}[/B]
[LR]Dibayar||{{DIBAYAR|rp}}
{{?KEMBALI}}[LR]Kembali||{{KEMBALI|rp}}
{{/KEMBALI}}[=]
{{?POIN}}[C]Poin Loyalitas: +{{POIN}} poin
{{/POIN}}{{?CATATAN}}[C]{{CATATAN}}
{{/CATATAN}}[QR]{{QR_URL}}
[C]Terima kasih, semoga lekas sembuh!
[C]Obat sesuai ketentuan BPOM & Farmasi
[C]Konsultasi gratis bersama Apoteker kami
[CUT]`;

  const PRESET_TEMPLATE_80MM = `[LOGO]
[C][B][2]{{NAMA_TOKO}}[/B][/2]
[C]{{ALAMAT_TOKO}}
{{?SIA_TOKO}}[C]Izin SIA: {{SIA_TOKO}}
{{/SIA_TOKO}}{{?APJ_NAMA}}[C]APJ: {{APJ_NAMA}} ({{APJ_SIPA}})
{{/APJ_NAMA}}{{?WA_TOKO}}[C]WA Konsultasi Apoteker: {{WA_TOKO}}
{{/WA_TOKO}}[=]
[LR]No Nota||{{NOTA}}
[LR]Tanggal||{{TANGGAL}}
[LR]Kasir||{{KASIR}}
[LR]Pasien||{{PELANGGAN}}
[LR]Pembayaran||{{METODE}} ({{CHANNEL}})
[-]
{{#ITEM}}
[B]{{NAMA}}[/B]
[LR]  {{QTY}} {{SATUAN}} x {{HARGA|rp}}||{{SUBTOTAL|rp}}
{{?ATURAN_PAKAI}}[L]  Aturan Pakai: {{ATURAN_PAKAI}}
{{/ATURAN_PAKAI}}{{/ITEM}}
[-]
[LR]Subtotal||{{SUBTOTAL|rp}}
{{?DISKON}}[LR]Diskon||-{{DISKON|rp}}
{{/DISKON}}{{?PPN}}[LR]PPN/Pajak||{{PPN|rp}}
{{/PPN}}[LR][B][2]TOTAL BAYAR||{{TOTAL|rp}}[/2][/B]
[LR]Dibayar||{{DIBAYAR|rp}}
{{?KEMBALI}}[LR]Kembalian||{{KEMBALI|rp}}
{{/KEMBALI}}[=]
[BOX]STATUS: {{STATUS}}
{{?POIN}}[C]Poin Loyalitas Diperoleh: +{{POIN}} poin
{{/POIN}}{{?CATATAN}}[C]Catatan: {{CATATAN}}
{{/CATATAN}}[QR]{{QR_URL}}
[BAR]{{NOTA}}
[C]Terima kasih telah mempercayakan kesehatan Anda
[C]kepada Apoteker berizin {{NAMA_TOKO}}
[CUT]`;

  const PRESET_TEMPLATE_HEMAT_58MM = `[C][B]{{NAMA_TOKO}}[/B]
[C]{{ALAMAT_TOKO}}
[-]
[LR]Nota||{{NOTA}}
[LR]Tgl||{{TANGGAL}}
[LR]Kasir||{{KASIR}}
[-]
{{#ITEM}}
[L]{{NAMA}}
[LR] {{QTY}} {{SATUAN}} x {{HARGA|rp}}||{{SUBTOTAL|rp}}
{{/ITEM}}
[-]
{{?DISKON}}[LR]Diskon||-{{DISKON|rp}}
{{/DISKON}}[LR][B]TOTAL||{{TOTAL|rp}}[/B]
[LR]{{METODE}}||{{DIBAYAR|rp}}
{{?KEMBALI}}[LR]Kembali||{{KEMBALI|rp}}
{{/KEMBALI}}[=]
[C]Terima kasih, lekas sembuh!
[CUT]`;

  const TEMPLATE_PRESETS = [
    {
      id: '58_STANDAR',
      label: 'Standar Apotek 58mm',
      kode: 'STRUK_POS_58MM',
      nama: 'Struk Kasir Standar 58mm (Apotek ONS Farma)',
      lebar_mm: 58,
      template_teks: DEFAULT_STRUK_TEMPLATE
    },
    {
      id: '80_KLINIS',
      label: 'Detail Klinis & SIA 80mm',
      kode: 'STRUK_80_RESEP',
      nama: 'Struk Apotek Thermal 80mm (Detail Klinik & Barcode)',
      lebar_mm: 80,
      template_teks: PRESET_TEMPLATE_80MM
    },
    {
      id: '58_HEMAT',
      label: 'Hemat Kertas 58mm',
      kode: 'STRUK_58_HEMAT',
      nama: 'Struk Hemat Kertas 58mm (Ringkas Cepat)',
      lebar_mm: 58,
      template_teks: PRESET_TEMPLATE_HEMAT_58MM
    }
  ];

  function rpNoPrefix(n) {
    return 'Rp ' + Number(n || 0).toLocaleString('id-ID');
  }

  function formatTglMod(val) {
    if (!val) return '';
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function applySingleModifier(val, mod) {
    const m = String(mod || '').toLowerCase();
    if (!m) return val === undefined || val === null ? '' : String(val);
    if (m === 'kosong0') {
      if (val === undefined || val === null || String(val).trim() === '') return '';
      return Number(val) === 0 ? '' : val;
    }
    if (val === '' && m !== 'kapital' && m !== 'upper' && m !== 'kecil' && m !== 'lower') {
      // Biarkan string kosong yang dihasilkan modifier sebelumnya (misal |kosong0|rp)
      if (val === '') return '';
    }
    if (m === 'rp' || m === 'rupiah') return rpNoPrefix(val);
    if (m === 'kapital' || m === 'upper') return String(val || '').toUpperCase();
    if (m === 'kecil' || m === 'lower') return String(val || '').toLowerCase();
    if (m === 'angka') return Number(val || 0).toLocaleString('id-ID');
    if (m === 'tgl') return formatTglMod(val);
    return String(val === undefined || val === null ? '' : val);
  }

  function applyModifier(val, modChain) {
    if (!modChain) return val === undefined || val === null ? '' : String(val);
    const parts = String(modChain).split('|').filter(Boolean);
    let cur = val;
    for (let i = 0; i < parts.length; i++) {
      cur = applySingleModifier(cur, parts[i]);
      if (cur === '' && parts[i].toLowerCase() === 'kosong0') return '';
    }
    return cur === undefined || cur === null ? '' : String(cur);
  }

  function isTruthyCond(val) {
    if (val === undefined || val === null || val === false) return false;
    if (Array.isArray(val)) return val.length > 0;
    const s = String(val).trim();
    if (!s || s === '-' || s === '0') return false;
    if (/^-?0+(\.0+)?$/.test(s)) return false;
    return true;
  }

  function enrichStrukData(raw) {
    const src = (raw && typeof raw === 'object') ? raw : {};
    const prof = (global.ONSStore && typeof global.ONSStore.getStoreProfile === 'function')
      ? global.ONSStore.getStoreProfile()
      : {};
    const out = Object.assign({}, src);

    const namaToko = src.NAMA_TOKO || src.TOKO_NAMA || prof.nama_usaha || 'APOTEK ONS FARMA';
    const alamatToko = src.ALAMAT_TOKO || src.TOKO_ALAMAT || [prof.alamat_usaha, prof.kota].filter(Boolean).join(', ') || 'Jl. Kesehatan Raya No. 88';
    const waToko = src.WA_TOKO || src.TOKO_WA || prof.wa_usaha || prof.telepon_usaha || '';
    const siaToko = src.SIA_TOKO || prof.no_sia || '';
    const apjNama = src.APJ_NAMA || prof.nama_pemilik || '';
    const apjSipa = src.APJ_SIPA || prof.sipa_pemilik || '';
    const logoUrl = src.LOGO_URL || prof.logo_url || '';
    const qrUrl = src.QR_URL || src.URL_VERIFIKASI || '';
    const dibayar = src.DIBAYAR !== undefined ? src.DIBAYAR : (src.DITERIMA !== undefined ? src.DITERIMA : (src.TOTAL || 0));
    const ppn = src.PPN !== undefined ? src.PPN : (src.PAJAK !== undefined ? src.PAJAK : 0);

    out.NAMA_TOKO = String(namaToko).toUpperCase();
    out.TOKO_NAMA = out.NAMA_TOKO;
    out.ALAMAT_TOKO = alamatToko;
    out.TOKO_ALAMAT = alamatToko;
    out.WA_TOKO = waToko;
    out.TOKO_WA = waToko;
    out.SIA_TOKO = siaToko;
    out.APJ_NAMA = apjNama;
    out.APJ_SIPA = apjSipa;
    out.LOGO_URL = logoUrl;
    out.QR_URL = qrUrl;
    out.URL_VERIFIKASI = qrUrl;
    out.DIBAYAR = dibayar;
    out.DITERIMA = dibayar;
    out.PPN = ppn;
    out.PAJAK = ppn;
    out.NOTA = src.NOTA || '-';
    out.TANGGAL = src.TANGGAL || new Date().toLocaleString('id-ID');
    out.KASIR = src.KASIR || 'Kasir';
    out.PELANGGAN = src.PELANGGAN || 'Pasien Umum';
    out.METODE = src.METODE || 'TUNAI';
    out.CHANNEL = src.CHANNEL || 'Toko Fisik';
    out.STATUS = src.STATUS || (Number(src.KEMBALI || 0) >= 0 ? 'LUNAS' : 'TEMPO');
    out.TUSLAH = Number(src.TUSLAH !== undefined ? src.TUSLAH : (src.biaya_servis !== undefined ? src.biaya_servis : (src.tuslah !== undefined ? src.tuslah : 0)));
    out.EMBALASE = Number(src.EMBALASE !== undefined ? src.EMBALASE : (src.biaya_embalase !== undefined ? src.biaya_embalase : (src.embalase !== undefined ? src.embalase : 0)));

    const rawItems = Array.isArray(src.ITEM) ? src.ITEM : (Array.isArray(src.items) ? src.items : []);
    out.ITEM = rawItems.map((it) => {
      const qty = Number(it.QTY !== undefined ? it.QTY : (it.qty !== undefined ? it.qty : 1));
      const harga = Number(it.HARGA !== undefined ? it.HARGA : (it.harga_jual !== undefined ? it.harga_jual : (it.harga !== undefined ? it.harga : 0)));
      const sub = Number(it.SUBTOTAL !== undefined ? it.SUBTOTAL : (it.SUB !== undefined ? it.SUB : (it.subtotal_item !== undefined ? it.subtotal_item : qty * harga)));
      const nama = it.NAMA || it.nama || it.nama_dagang || 'Item';
      const satuan = it.SATUAN || it.satuan || 'Unit';
      const aturan = String(it.ATURAN_PAKAI || it.aturan_pakai || '').trim();
      return Object.assign({}, it, {
        NAMA: nama,
        nama: nama,
        QTY: qty,
        qty: qty,
        SATUAN: satuan,
        satuan: satuan,
        HARGA: harga,
        harga: harga,
        SUBTOTAL: sub,
        SUB: sub,
        ATURAN_PAKAI: aturan,
        aturan_pakai: aturan
      });
    });

    if (out.SUBTOTAL === undefined) {
      out.SUBTOTAL = out.ITEM.reduce((s, it) => s + Number(it.SUBTOTAL || 0), 0) || Number(out.TOTAL || 0);
    }
    if (out.TOTAL === undefined) {
      out.TOTAL = Math.max(0, Number(out.SUBTOTAL || 0) - Number(out.DISKON || 0) + Number(out.PPN || 0));
    }
    return out;
  }

  function lookupField(obj, key) {
    if (!obj || !key) return undefined;
    if (obj[key] !== undefined) return obj[key];
    const lo = key.toLowerCase();
    if (obj[lo] !== undefined) return obj[lo];
    const up = key.toUpperCase();
    if (obj[up] !== undefined) return obj[up];
    return undefined;
  }

  function expandConditionals(tpl, obj) {
    let cur = String(tpl || '');
    const condRx = /\{\{\?([A-Z0-9_]+)\}\}([\s\S]*?)\{\{\/\1\}\}/gi;
    // Evaluasi berulang maksimal 3 pass untuk blok kondisional bertingkat ringan
    for (let pass = 0; pass < 3; pass++) {
      const next = cur.replace(condRx, (_, key, inner) => {
        const val = lookupField(obj, key);
        return isTruthyCond(val) ? inner : '';
      });
      if (next === cur) break;
      cur = next;
    }
    return cur;
  }

  function interpolateVars(tpl, data) {
    const norm = enrichStrukData(data);
    let out = String(tpl || DEFAULT_STRUK_TEMPLATE);

    // 1. Expand repeating blocks: {{#ITEM}}...{{/ITEM}}
    const itemBlockRx = /\{\{#ITEM\}\}([\s\S]*?)\{\{\/ITEM\}\}/g;
    out = out.replace(itemBlockRx, (_, inner) => {
      const items = norm.ITEM || [];
      if (!items.length) return '[L](Tidak ada item)\n';
      return items.map((it) => {
        const expanded = expandConditionals(inner, it);
        return expanded.replace(/\{\{([A-Z0-9_]+)(?:\|([a-z0-9_|]+))?\}\}/gi, (__, key, mod) => {
          const val = lookupField(it, key);
          return applyModifier(val === undefined || val === null ? '' : val, mod);
        }).trimEnd();
      }).join('\n');
    });

    // 2. Expand top-level conditionals {{?KEY}}...{{/KEY}}
    out = expandConditionals(out, norm);

    // 3. Replace scalar placeholders {{KEY}} or {{KEY|mod1|mod2}}
    out = out.replace(/\{\{([A-Z0-9_]+)(?:\|([a-z0-9_|]+))?\}\}/gi, (_, key, mod) => {
      const raw = lookupField(norm, key);
      if (raw === undefined || raw === null) return '';
      return applyModifier(raw, mod);
    });

    return out;
  }

  function stripInlineTags(str) {
    return String(str || '').replace(/\[(\/?)(B|2|H|C|L|R)\]/gi, '');
  }

  function escHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function parseLineDirective(rawLine) {
    let line = String(rawLine || '').trimEnd();
    let align = 'left';
    let bold = false;
    let dbl = false;
    let tall = false;

    if (/^\s*\/\//.test(line)) return { type: 'comment' };
    if (/^\[CUT\]$/i.test(line.trim())) return { type: 'cut' };
    if (/^\[FEED\]$/i.test(line.trim())) return { type: 'feed' };
    if (/^\[LOGO\]/i.test(line.trim())) return { type: 'logo', value: stripInlineTags(line.trim().slice(6)).trim() };

    const trimmed = line.trim();
    if (trimmed === '[-]' || trimmed === '-') return { type: 'hr', char: '-' };
    if (trimmed === '[=]' || trimmed === '=') return { type: 'hr', char: '=' };
    if (/^\[QR\]/i.test(line)) return { type: 'qr', value: stripInlineTags(line.replace(/^\[QR\]/i, '').trim()) };
    if (/^\[BAR\]/i.test(line)) return { type: 'bar', value: stripInlineTags(line.replace(/^\[BAR\]/i, '').trim()) };
    if (/^\[BOX\]/i.test(line)) return { type: 'box', value: stripInlineTags(line.replace(/^\[BOX\]/i, '').trim()) };

    // Cek flag gaya di seluruh baris
    if (/\[B\]/i.test(line)) bold = true;
    if (/\[2\]/i.test(line)) dbl = true;
    if (/\[H\]/i.test(line)) tall = true;

    // Ekstrak perataan depan ([C], [R], [L], [LR]) — mendukung kombinasi urutan seperti [B][C] atau [LR][B]
    if (/\[LR\]/i.test(line)) {
      const rest = line.replace(/\[LR\]/gi, '');
      const clean = stripInlineTags(rest);
      const dblIdx = clean.indexOf('||');
      const sngIdx = clean.indexOf('|');
      let left = clean;
      let right = '';
      if (dblIdx >= 0) {
        left = clean.slice(0, dblIdx).trim();
        right = clean.slice(dblIdx + 2).trim();
      } else if (sngIdx >= 0) {
        left = clean.slice(0, sngIdx).trim();
        right = clean.slice(sngIdx + 1).trim();
      }
      return { type: 'lr', left, right, bold, dbl, tall };
    }

    if (/\[C\]/i.test(line)) align = 'center';
    else if (/\[R\]/i.test(line)) align = 'right';
    else if (/\[L\]/i.test(line)) align = 'left';

    return { type: 'text', align, text: stripInlineTags(line), bold, dbl, tall };
  }

  function isSafeLogoUrl(url) {
    const s = String(url || '').trim();
    return /^https?:\/\//i.test(s) || /^data:image\//i.test(s);
  }

  function renderHtml(templateText, data, lebarMm) {
    const mm = Number(lebarMm) === 80 ? 80 : 58;
    const maxWidthPx = mm === 80 ? 344 : 256;
    const cols = mm === 80 ? 46 : 32;
    const norm = enrichStrukData(data);
    const compiled = interpolateVars(templateText, norm);
    const lines = compiled.split(/\r?\n/);

    const parts = [];
    for (const raw of lines) {
      const p = parseLineDirective(raw);
      if (p.type === 'comment') continue;
      if (p.type === 'feed') {
        parts.push('<div style="height:7px;"></div>');
        continue;
      }
      if (p.type === 'cut') {
        parts.push('<div class="no-print" style="margin:9px -12px -4px;border-top:1px dashed #94a3b8;text-align:center;font-size:8.5px;color:#64748b;letter-spacing:0.06em;padding-top:4px;">&#9986; POTONG KERTAS THERMAL</div>');
        continue;
      }
      if (p.type === 'logo') {
        const srcUrl = isSafeLogoUrl(p.value) ? p.value : (isSafeLogoUrl(norm.LOGO_URL) ? norm.LOGO_URL : '');
        if (srcUrl) {
          parts.push(`<div style="text-align:center;margin:0 auto 5px;"><img src="${escHtml(srcUrl)}" alt="Logo Apotek" onerror="this.style.display='none'" style="max-height:42px;max-width:120px;margin:0 auto;display:block;object-fit:contain;filter:grayscale(100%) contrast(1.15);"/></div>`);
        }
        continue;
      }
      if (p.type === 'hr') {
        const border = p.char === '=' ? '2px solid #0f172a' : '1px dashed #64748b';
        parts.push(`<div style="border-top:${border};margin:5px 0;"></div>`);
      } else if (p.type === 'lr') {
        const fw = p.bold ? '700' : '400';
        const fs = p.dbl ? '13.5px' : (p.tall ? '12.5px' : '11px');
        parts.push(
          `<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;font-weight:${fw};font-size:${fs};line-height:1.38;">` +
          `<span style="flex:1 1 auto;min-width:0;word-break:break-word;">${escHtml(p.left)}</span>` +
          `<span style="flex:0 0 auto;max-width:62%;text-align:right;overflow-wrap:anywhere;">${escHtml(p.right)}</span>` +
          `</div>`
        );
      } else if (p.type === 'box') {
        if (p.value) {
          parts.push(`<div style="background:#0f172a;color:#ffffff;padding:3px 6px;margin:5px 0;text-align:center;font-weight:700;font-size:10.5px;letter-spacing:0.06em;border-radius:3px;">${escHtml(p.value)}</div>`);
        }
      } else if (p.type === 'qr') {
        const qrVal = p.value || norm.QR_URL || norm.URL_VERIFIKASI || '';
        if (qrVal) {
          parts.push(`<div style="text-align:center;margin:7px 0 4px;" data-qr-val="${escHtml(qrVal)}">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(qrVal)}" alt="QR Struk" onerror="this.style.display='none'" style="width:88px;height:88px;margin:0 auto;display:block;border:1px solid #cbd5e1;padding:2px;background:#fff;border-radius:3px;">
            <div style="font-size:8.5px;color:#475569;margin-top:3px;">Scan QR untuk Verifikasi Keaslian Struk</div>
          </div>`);
        }
      } else if (p.type === 'bar') {
        const barVal = p.value || norm.NOTA || '';
        if (barVal) {
          let barSvg = '';
          if (global.ONSBarcode && typeof global.ONSBarcode.svg === 'function') {
            barSvg = global.ONSBarcode.svg(barVal, { height: 28, width: 1.2 });
          }
          parts.push(`<div style="text-align:center;margin:5px 0;">${barSvg}<div style="font-size:9.5px;letter-spacing:1.2px;margin-top:2px;">${escHtml(barVal)}</div></div>`);
        }
      } else {
        if (!p.text.trim()) continue;
        const fw = p.bold ? '700' : '400';
        const fs = p.dbl ? '14px' : (p.tall ? '12.5px' : '11px');
        const ls = p.dbl ? '0.02em' : '0';
        parts.push(`<div style="text-align:${p.align};font-weight:${fw};font-size:${fs};letter-spacing:${ls};line-height:1.38;word-break:break-word;">${escHtml(p.text)}</div>`);
      }
    }

    return `<div id="thermalPaperRender" data-cols="${cols}" data-mm="${mm}" style="width:${maxWidthPx}px;max-width:100%;margin:0 auto;background:#ffffff;color:#0f172a;padding:14px 12px;border:1px solid #cbd5e1;border-top:3px solid #0050ca;border-radius:4px;box-shadow:0 10px 24px -14px rgba(15,23,42,0.28);font-family:'JetBrains Mono','Courier New',monospace;">${parts.join('')}</div>`;
  }

  function formatLrFixedLines(left, right, cols) {
    const l = String(left || '');
    const r = String(right || '');
    if (!r) return [l];
    if (l.length + 1 + r.length <= cols) {
      return [l + ' '.repeat(cols - l.length - r.length) + r];
    }
    // Jika gabungan melebihi lebar kertas thermal, bungkus rapi jadi 2 baris agar tidak terpotong di tengah kata
    const padRight = r.length < cols ? (' '.repeat(cols - r.length) + r) : r;
    return [l, padRight];
  }

  function formatPlainText(templateText, data, lebarMm) {
    const cols = Number(lebarMm) === 80 ? 46 : 32;
    const norm = enrichStrukData(data);
    const compiled = interpolateVars(templateText, norm);
    const lines = compiled.split(/\r?\n/);
    const out = [];
    for (const raw of lines) {
      const p = parseLineDirective(raw);
      if (p.type === 'comment' || p.type === 'cut' || p.type === 'logo') continue;
      if (p.type === 'feed') { out.push(''); continue; }
      if (p.type === 'hr') {
        out.push((p.char === '=' ? '=' : '-').repeat(cols));
      } else if (p.type === 'lr') {
        formatLrFixedLines(p.left, p.right, cols).forEach((ln) => out.push(ln));
      } else if (p.type === 'box') {
        if (p.value) out.push('[ ' + p.value + ' ]');
      } else if (p.type === 'qr') {
        const qv = p.value || norm.QR_URL || norm.URL_VERIFIKASI || '';
        if (qv) out.push('Verifikasi: ' + qv);
      } else if (p.type === 'bar') {
        const bv = p.value || norm.NOTA || '';
        if (bv) out.push('Ref: ' + bv);
      } else if (p.text.trim()) {
        if (p.align === 'center' && p.text.length < cols) {
          const pad = Math.floor((cols - p.text.length) / 2);
          out.push(' '.repeat(pad) + p.text);
        } else if (p.align === 'right' && p.text.length < cols) {
          out.push(' '.repeat(cols - p.text.length) + p.text);
        } else {
          out.push(p.text);
        }
      }
    }
    return out.join('\n');
  }

  function buildEscPosBytes(templateText, data, lebarMm) {
    const cols = Number(lebarMm) === 80 ? 48 : 32;
    const norm = enrichStrukData(data);
    const compiled = interpolateVars(templateText, norm);
    const lines = compiled.split(/\r?\n/);
    const chunks = [];
    const enc = new TextEncoder();
    const pushBytes = (arr) => chunks.push(new Uint8Array(arr));
    const pushStr = (s) => chunks.push(enc.encode(String(s || '').replace(/[^\x20-\x7E\n]/g, ' ')));

    // ESC @ Init
    pushBytes([0x1B, 0x40]);

    for (const raw of lines) {
      const p = parseLineDirective(raw);
      if (p.type === 'comment' || p.type === 'cut' || p.type === 'logo') continue;
      if (p.type === 'feed') {
        pushStr('\n');
        continue;
      }
      if (p.type === 'hr') {
        pushBytes([0x1B, 0x61, 0x00, 0x1B, 0x45, 0x00, 0x1D, 0x21, 0x00]);
        pushStr((p.char === '=' ? '=' : '-').repeat(cols) + '\n');
      } else if (p.type === 'lr') {
        pushBytes([0x1B, 0x61, 0x00, 0x1B, 0x45, p.bold ? 0x01 : 0x00, 0x1D, 0x21, 0x00]);
        formatLrFixedLines(p.left, p.right, cols).forEach((ln) => pushStr(ln + '\n'));
      } else if (p.type === 'qr') {
        const qv = p.value || norm.QR_URL || norm.URL_VERIFIKASI || '';
        pushBytes([0x1B, 0x61, 0x01, 0x1B, 0x45, 0x00, 0x1D, 0x21, 0x00]);
        if (qv) pushStr('[Verifikasi] ' + qv.slice(0, cols - 13) + '\n');
      } else if (p.type === 'bar' || p.type === 'box') {
        pushBytes([0x1B, 0x61, 0x01, 0x1B, 0x45, 0x01, 0x1D, 0x21, 0x00]);
        if (p.value) pushStr(p.value + '\n');
      } else if (p.text.trim()) {
        const alignByte = p.align === 'center' ? 0x01 : (p.align === 'right' ? 0x02 : 0x00);
        const boldByte = p.bold ? 0x01 : 0x00;
        const sizeByte = p.dbl ? 0x11 : (p.tall ? 0x01 : 0x00);
        pushBytes([0x1B, 0x61, alignByte, 0x1B, 0x45, boldByte, 0x1D, 0x21, sizeByte]);
        pushStr(p.text + '\n');
      }
    }

    pushBytes([0x1B, 0x61, 0x00, 0x1B, 0x45, 0x00, 0x1D, 0x21, 0x00]);
    pushStr('\n\n\n');
    pushBytes([0x1D, 0x56, 0x41, 0x10]); // Partial cut

    let totalLen = 0;
    chunks.forEach((c) => { totalLen += c.length; });
    const joined = new Uint8Array(totalLen);
    let offset = 0;
    chunks.forEach((c) => { joined.set(c, offset); offset += c.length; });
    return joined;
  }

  function openRawBtAndroid(templateText, data, lebarMm) {
    const plain = formatPlainText(templateText, data, lebarMm);
    const bytes = new TextEncoder().encode(plain + '\n\n\n');
    let bin = '';
    bytes.forEach((b) => { bin += String.fromCharCode(b); });
    const b64 = btoa(bin);
    const href = 'rawbt:base64,' + b64;
    const a = document.createElement('a');
    a.href = href;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function downloadStrukPng(templateText, data, lebarMm) {
    const mm = Number(lebarMm) === 80 ? 80 : 58;
    const norm = enrichStrukData(data);
    const compiled = interpolateVars(templateText, norm);
    const parsedLines = compiled.split(/\r?\n/).map(parseLineDirective).filter((p) => {
      if (p.type === 'comment' || p.type === 'cut' || p.type === 'logo') return false;
      if (p.type === 'text' && !p.text.trim()) return false;
      return true;
    });

    const scale = 2;
    const logicalW = mm === 80 ? 440 : 320;
    const padX = 18;
    const lineH = 20;
    const logicalH = Math.max(240, parsedLines.length * lineH + 44);
    const canvas = document.createElement('canvas');
    canvas.width = logicalW * scale;
    canvas.height = logicalH * scale;
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, logicalW, logicalH);
    ctx.fillStyle = '#0050ca';
    ctx.fillRect(0, 0, logicalW, 4);

    let y = 26;
    parsedLines.forEach((p) => {
      ctx.fillStyle = '#0f172a';
      if (p.type === 'feed') {
        y += 10;
        return;
      }
      if (p.type === 'hr') {
        ctx.save();
        ctx.strokeStyle = p.char === '=' ? '#0f172a' : '#64748b';
        ctx.lineWidth = p.char === '=' ? 1.8 : 1;
        if (p.char !== '=') ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(padX, y - 5);
        ctx.lineTo(logicalW - padX, y - 5);
        ctx.stroke();
        ctx.restore();
        y += lineH - 4;
        return;
      }
      if (p.type === 'lr') {
        ctx.font = (p.bold ? '700 ' : '400 ') + (p.dbl ? '14px' : '11.5px') + ' monospace';
        ctx.textAlign = 'left';
        ctx.fillText(p.left, padX, y);
        ctx.textAlign = 'right';
        ctx.fillText(p.right, logicalW - padX, y);
        y += lineH;
        return;
      }
      if (p.type === 'box') {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(padX, y - 13, logicalW - padX * 2, 18);
        ctx.fillStyle = '#ffffff';
        ctx.font = '700 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(p.value, logicalW / 2, y);
        y += lineH + 2;
        return;
      }
      if (p.type === 'qr') {
        const qv = p.value || norm.QR_URL || norm.URL_VERIFIKASI || '';
        if (qv) {
          ctx.font = '600 10px monospace';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#334155';
          ctx.fillText('[QR Verifikasi Nota]', logicalW / 2, y);
          y += lineH - 2;
        }
        return;
      }
      if (p.type === 'bar') {
        const bv = p.value || norm.NOTA || '';
        if (bv) {
          ctx.font = '700 11px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('Ref: ' + bv, logicalW / 2, y);
          y += lineH;
        }
        return;
      }

      const fontSize = p.dbl ? 14.5 : (p.tall ? 13 : 11.5);
      ctx.font = (p.bold ? '700 ' : '400 ') + fontSize + 'px monospace';
      if (p.align === 'center') {
        ctx.textAlign = 'center';
        ctx.fillText(p.text, logicalW / 2, y);
      } else if (p.align === 'right') {
        ctx.textAlign = 'right';
        ctx.fillText(p.text, logicalW - padX, y);
      } else {
        ctx.textAlign = 'left';
        ctx.fillText(p.text, padX, y);
      }
      y += p.dbl ? lineH + 4 : lineH;
    });

    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Struk_' + ((norm && norm.NOTA) || Date.now()) + '.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function buildEtiketHtml(item, patientName, aturanPakai, apjInfo, labelColor) {
    const nowStr = new Date().toLocaleDateString('id-ID');
    const prof = (global.ONSStore && typeof global.ONSStore.getStoreProfile === 'function') ? global.ONSStore.getStoreProfile() : {};
    const storeName = (prof.nama_usaha || 'APOTEK ONS FARMA').toUpperCase();
    const apjText = apjInfo || [prof.nama_pemilik || 'Apoteker Penanggung Jawab', prof.sipa_pemilik ? ('SIPA: ' + prof.sipa_pemilik) : ''].filter(Boolean).join(' • ');
    const rule = (item && (item.ATURAN_PAKAI || item.aturan_pakai)) || aturanPakai || '3 x 1 Sesudah Makan';
    const isLuar = String(labelColor || ((item && item.etiket_warna) || '')).toLowerCase() === 'biru' || /luar|oles|tetes|salep|krim|injeksi/i.test(rule);
    const accent = isLuar ? '#1d4ed8' : '#0f766e';
    const boxBg = isLuar ? '#eff6ff' : '#f0fdfa';
    const labelJenis = isLuar ? 'OBAT LUAR • TIDAK UNTUK DITELAN' : 'OBAT DALAM / ORAL • JANGAN MELEBIHI DOSIS';
    return `
      <div style="width:270px;border:2px solid ${accent};border-radius:8px;padding:10px;background:#fff;color:#0f172a;font-family:'Plus Jakarta Sans',sans-serif;margin:0 auto;">
        <div style="background:${accent};color:#fff;padding:5px 8px;border-radius:5px;display:flex;justify-content:space-between;align-items:center;">
          <strong style="font-size:11px;">${escHtml(storeName)}</strong>
          <span style="font-size:10px;">${escHtml(nowStr)}</span>
        </div>
        <div style="font-size:9.5px;color:#475569;margin-top:4px;border-bottom:1px solid #cbd5e1;padding-bottom:3px;">
          APJ: ${escHtml(apjText)}
        </div>
        <div style="margin-top:6px;font-size:11px;">
          <div>Pasien: <strong>${escHtml(patientName || 'Pasien Umum')}</strong></div>
          <div style="margin-top:2px;">Obat: <strong>${escHtml((item && (item.nama || item.nama_dagang || item.NAMA)) || '-')}</strong></div>
          <div>Jumlah: <strong>${escHtml(String((item && (item.qty || item.QTY)) || 1))} ${escHtml((item && (item.satuan || item.SATUAN)) || '')}</strong></div>
        </div>
        <div style="margin-top:8px;border:1.5px dashed ${accent};padding:6px;border-radius:5px;text-align:center;font-weight:800;font-size:13px;background:${boxBg};">
          ${escHtml(rule)}
        </div>
        <div style="margin-top:6px;font-size:8.5px;text-align:center;color:#dc2626;font-weight:700;">
          ${labelJenis}
        </div>
      </div>`;
  }

  global.StrukEngine = {
    DEFAULT_STRUK_TEMPLATE,
    PRESET_TEMPLATE_80MM,
    PRESET_TEMPLATE_HEMAT_58MM,
    TEMPLATE_PRESETS,
    enrichStrukData,
    interpolateVars,
    renderHtml,
    formatPlainText,
    buildEscPosBytes,
    openRawBtAndroid,
    downloadStrukPng,
    buildEtiketHtml
  };
})(window);
