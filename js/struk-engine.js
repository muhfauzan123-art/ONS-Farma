/**
 * ONS FARMA DIGITAL ENTERPRISE v11.0 - Thermal Receipt, Label & ESC/POS Engine
 * Implementasi modul /gas-struk-resi-printer:
 * - Parser direktif baris: [C], [L], [R], [B], [2], [LR], [-], [=], [BOX], [QR], [BAR]
 * - Variabel {{KEY}}, modifier |rp & |kapital, serta blok berulang {{#ITEM}}...{{/ITEM}}
 * - Output multi-target: Web Preview (58mm/80mm), Browser Print, Web Bluetooth ESC/POS,
 *   RawBT Android Intent, PNG Download, WhatsApp Text, & Etiket Obat Apotek
 */
(function (global) {
  'use strict';

  const DEFAULT_STRUK_TEMPLATE = `[C][B][2]{{NAMA_TOKO}}[/B][/2]
[C]{{ALAMAT_TOKO}}
[C]WA {{WA_TOKO}} | APJ: {{APJ_SIPA}}
[=]
[LR]No Nota|{{NOTA}}
[LR]Tanggal|{{TANGGAL}}
[LR]Kasir|{{KASIR}}
[LR]Pasien|{{PELANGGAN}}
[LR]Bayar|{{METODE}} ({{CHANNEL}})
[-]
{{#ITEM}}
[B]{{NAMA}}[/B]
[LR]  {{QTY}} {{SATUAN}} x {{HARGA|rp}}|{{SUBTOTAL|rp}}
{{/ITEM}}
[-]
[LR]Subtotal|{{SUBTOTAL|rp}}
[LR]Diskon|{{DISKON|rp}}
[LR]PPN/Pajak|{{PPN|rp}}
[LR][B]TOTAL|{{TOTAL|rp}}[/B]
[LR]Dibayar|{{DIBAYAR|rp}}
[LR]Kembalian|{{KEMBALI|rp}}
[-]
[C]Poin Loyalitas Diperoleh: +{{POIN}}
[C]{{CATATAN}}
[QR]{{QR_URL}}
[BAR]{{NOTA}}
[=]
[C]Terima kasih, semoga lekas sembuh!
[C]Obat yang sudah dibeli sesuai ketentuan BPOM
[C]tidak dapat dikembalikan kecuali cacat pabrik.`;

  function rpNoPrefix(n) {
    return 'Rp ' + Number(n || 0).toLocaleString('id-ID');
  }

  function applyModifier(val, mod) {
    if (!mod) return val === undefined || val === null ? '' : String(val);
    if (mod === 'rp' || mod === 'rupiah') return rpNoPrefix(val);
    if (mod === 'kapital' || mod === 'upper') return String(val || '').toUpperCase();
    if (mod === 'angka') return Number(val || 0).toLocaleString('id-ID');
    return String(val === undefined || val === null ? '' : val);
  }

  function interpolateVars(tpl, data) {
    let out = String(tpl || DEFAULT_STRUK_TEMPLATE);

    // 1. Expand repeating blocks: {{#ITEM}}...{{/ITEM}}
    const itemBlockRx = /\{\{#ITEM\}\}([\s\S]*?)\{\{\/ITEM\}\}/g;
    out = out.replace(itemBlockRx, (_, inner) => {
      const items = Array.isArray(data && data.ITEM) ? data.ITEM : (Array.isArray(data && data.items) ? data.items : []);
      if (!items.length) return '[L](Tidak ada item)\n';
      return items.map((it) => {
        return inner.replace(/\{\{([A-Z0-9_]+)(?:\|([a-z0-9_]+))?\}\}/gi, (__, key, mod) => {
          const val = it[key] !== undefined ? it[key] : (it[key.toLowerCase()] !== undefined ? it[key.toLowerCase()] : '');
          return applyModifier(val, mod);
        }).trimEnd();
      }).join('\n');
    });

    // 2. Replace scalar placeholders {{KEY}} or {{KEY|mod}}
    out = out.replace(/\{\{([A-Z0-9_]+)(?:\|([a-z0-9_]+))?\}\}/gi, (_, key, mod) => {
      const raw = data && (data[key] !== undefined ? data[key] : data[key.toLowerCase()]);
      if (raw === undefined || raw === null) return '';
      return applyModifier(raw, mod);
    });

    return out;
  }

  function stripInlineTags(str) {
    return String(str || '').replace(/\[(\/?)(B|2)\]/gi, '');
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

    if (line === '[-]' || line === '-') return { type: 'hr', char: '-' };
    if (line === '[=]' || line === '=') return { type: 'hr', char: '=' };
    if (/^\[QR\]/i.test(line)) return { type: 'qr', value: line.replace(/^\[QR\]/i, '').trim() };
    if (/^\[BAR\]/i.test(line)) return { type: 'bar', value: line.replace(/^\[BAR\]/i, '').trim() };
    if (/^\[BOX\]/i.test(line)) return { type: 'box', value: stripInlineTags(line.replace(/^\[BOX\]/i, '').trim()) };

    if (/^\[C\]/i.test(line)) { align = 'center'; line = line.slice(3); }
    else if (/^\[R\]/i.test(line)) { align = 'right'; line = line.slice(3); }
    else if (/^\[L\]/i.test(line)) { align = 'left'; line = line.slice(3); }
    else if (/^\[LR\]/i.test(line)) {
      const rest = line.slice(4);
      if (/\[B\]/i.test(rest)) bold = true;
      if (/\[2\]/i.test(rest)) dbl = true;
      const clean = stripInlineTags(rest);
      const sepIdx = clean.indexOf('|');
      const left = sepIdx >= 0 ? clean.slice(0, sepIdx).trim() : clean;
      const right = sepIdx >= 0 ? clean.slice(sepIdx + 1).trim() : '';
      return { type: 'lr', left, right, bold, dbl };
    }

    if (/\[B\]/i.test(line)) bold = true;
    if (/\[2\]/i.test(line)) dbl = true;
    return { type: 'text', align, text: stripInlineTags(line), bold, dbl };
  }

  function renderHtml(templateText, data, lebarMm) {
    const mm = Number(lebarMm) === 80 ? 80 : 58;
    const maxWidthPx = mm === 80 ? 330 : 240;
    const cols = mm === 80 ? 46 : 32;
    const compiled = interpolateVars(templateText, data);
    const lines = compiled.split(/\r?\n/);

    const parts = [];
    for (const raw of lines) {
      const p = parseLineDirective(raw);
      if (p.type === 'hr') {
        const border = p.char === '=' ? '2px solid #0f172a' : '1px dashed #64748b';
        parts.push(`<div style="border-top:${border};margin:4px 0;"></div>`);
      } else if (p.type === 'lr') {
        const fw = p.bold ? '700' : '400';
        const fs = p.dbl ? '14px' : '11px';
        parts.push(`<div style="display:flex;justify-content:space-between;gap:8px;font-weight:${fw};font-size:${fs};line-height:1.35;"><span>${escHtml(p.left)}</span><span style="text-align:right;white-space:nowrap;">${escHtml(p.right)}</span></div>`);
      } else if (p.type === 'box') {
        parts.push(`<div style="border:1.5px solid #0f172a;padding:4px 6px;margin:4px 0;text-align:center;font-weight:700;font-size:11px;">${escHtml(p.value)}</div>`);
      } else if (p.type === 'qr') {
        if (p.value) {
          parts.push(`<div style="text-align:center;margin:6px 0;" data-qr-val="${escHtml(p.value)}">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(p.value)}" alt="QR Struk" style="width:92px;height:92px;margin:0 auto;display:block;border:1px solid #cbd5e1;padding:2px;background:#fff;">
            <div style="font-size:9px;color:#475569;margin-top:2px;">Scan Verifikasi Keaslian Struk</div>
          </div>`);
        }
      } else if (p.type === 'bar') {
        if (p.value) {
          let barSvg = '';
          if (global.ONSBarcode && typeof global.ONSBarcode.svg === 'function') {
            barSvg = global.ONSBarcode.svg(p.value, { height: 30, width: 1.3 });
          }
          parts.push(`<div style="text-align:center;margin:5px 0;">${barSvg}<div style="font-size:10px;letter-spacing:1.2px;">${escHtml(p.value)}</div></div>`);
        }
      } else {
        if (!p.text.trim()) continue;
        const fw = p.bold ? '700' : '400';
        const fs = p.dbl ? '14px' : '11px';
        parts.push(`<div style="text-align:${p.align};font-weight:${fw};font-size:${fs};line-height:1.35;word-break:break-word;">${escHtml(p.text)}</div>`);
      }
    }

    return `<div id="thermalPaperRender" data-cols="${cols}" data-mm="${mm}" style="width:${maxWidthPx}px;margin:0 auto;background:#ffffff;color:#0f172a;padding:12px 10px;border:1px dashed #cbd5e1;border-radius:6px;font-family:'JetBrains Mono','Courier New',monospace;">${parts.join('')}</div>`;
  }

  function formatPlainText(templateText, data, lebarMm) {
    const cols = Number(lebarMm) === 80 ? 46 : 32;
    const compiled = interpolateVars(templateText, data);
    const lines = compiled.split(/\r?\n/);
    const out = [];
    for (const raw of lines) {
      const p = parseLineDirective(raw);
      if (p.type === 'hr') {
        out.push((p.char === '=' ? '=' : '-').repeat(cols));
      } else if (p.type === 'lr') {
        const space = Math.max(1, cols - p.left.length - p.right.length);
        out.push(p.left + ' '.repeat(space) + p.right);
      } else if (p.type === 'box') {
        out.push('[' + p.value + ']');
      } else if (p.type === 'qr') {
        if (p.value) out.push('Verifikasi: ' + p.value);
      } else if (p.type === 'bar') {
        if (p.value) out.push('Ref: ' + p.value);
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
    const compiled = interpolateVars(templateText, data);
    const lines = compiled.split(/\r?\n/);
    const chunks = [];
    const enc = new TextEncoder();
    const pushBytes = (arr) => chunks.push(new Uint8Array(arr));
    const pushStr = (s) => chunks.push(enc.encode(String(s || '').replace(/[^\x20-\x7E\n]/g, ' ')));

    // ESC @ Init
    pushBytes([0x1B, 0x40]);

    for (const raw of lines) {
      const p = parseLineDirective(raw);
      if (p.type === 'hr') {
        pushBytes([0x1B, 0x61, 0x00, 0x1B, 0x45, 0x00, 0x1D, 0x21, 0x00]);
        pushStr((p.char === '=' ? '=' : '-').repeat(cols) + '\n');
      } else if (p.type === 'lr') {
        pushBytes([0x1B, 0x61, 0x00, 0x1B, 0x45, p.bold ? 0x01 : 0x00, 0x1D, 0x21, 0x00]);
        const sp = Math.max(1, cols - p.left.length - p.right.length);
        pushStr(p.left + ' '.repeat(sp) + p.right + '\n');
      } else if (p.type === 'qr') {
        pushBytes([0x1B, 0x61, 0x01, 0x1B, 0x45, 0x00, 0x1D, 0x21, 0x00]);
        if (p.value) pushStr('[QR] ' + p.value.slice(0, cols - 5) + '\n');
      } else if (p.type === 'bar' || p.type === 'box') {
        pushBytes([0x1B, 0x61, 0x01, 0x1B, 0x45, 0x01, 0x1D, 0x21, 0x00]);
        if (p.value) pushStr(p.value + '\n');
      } else if (p.text.trim()) {
        const alignByte = p.align === 'center' ? 0x01 : (p.align === 'right' ? 0x02 : 0x00);
        const boldByte = p.bold ? 0x01 : 0x00;
        const sizeByte = p.dbl ? 0x11 : 0x00;
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
    const cols = mm === 80 ? 46 : 32;
    const plain = formatPlainText(templateText, data, mm).split('\n');
    const lineH = 19;
    const padX = 18;
    const width = mm === 80 ? 460 : 340;
    const height = Math.max(220, plain.length * lineH + 40);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#0f172a';
    ctx.font = '13px monospace';
    plain.forEach((ln, idx) => {
      ctx.fillText(ln.slice(0, cols + 4), padX, 26 + idx * lineH);
    });
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Struk_' + ((data && data.NOTA) || Date.now()) + '.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function buildEtiketHtml(item, patientName, aturanPakai, apjInfo, labelColor) {
    const nowStr = new Date().toLocaleDateString('id-ID');
    const prof = (global.ONSStore && typeof global.ONSStore.getStoreProfile === 'function') ? global.ONSStore.getStoreProfile() : {};
    const storeName = (prof.nama_usaha || 'APOTEK ONS FARMA').toUpperCase();
    const apjText = apjInfo || [prof.nama_pemilik || 'apt. Anissa Faradifa R. Is Rumi', prof.sipa_pemilik ? ('SIPA: ' + prof.sipa_pemilik) : ''].filter(Boolean).join(' • ');
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
    interpolateVars,
    renderHtml,
    formatPlainText,
    buildEscPosBytes,
    openRawBtAndroid,
    downloadStrukPng,
    buildEtiketHtml
  };
})(window);
