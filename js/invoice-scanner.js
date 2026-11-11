/**
 * ONS FARMA DIGITAL ENTERPRISE v14.2 - Smart Invoice Scanner (100% Gratis / Zero Paid API)
 * - Pra-pemrosesan Gambar Canvas (Auto Contrast, Sharpen B/W untuk struk dot-matrix, Putar 90deg)
 * - Kamera Langsung (Rear Camera HP / Webcam Desktop) + Upload Foto / PDF Faktur
 * - PDF Digital Text Extractor (PDF.js Lazy-Load) & OCR Gratis Tesseract.js (ind+eng Lazy-Load)
 * - Parser Multi-Baris Faktur PBF CDOB (Header PBF, No Faktur, SP, TOP/JT, Diskon, PPN + Multi-Item Batch/ED/Qty/HPP)
 */
(function (global) {
  'use strict';

  const TESSERACT_CDN = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
  const PDFJS_CDN = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
  const PDFJS_WORKER_CDN = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

  const _scriptPromises = {};
  function loadExternalScriptOnce(url, globalCheckFn) {
    try {
      if (globalCheckFn && globalCheckFn()) return Promise.resolve();
      if (typeof document === 'undefined' || !document.head) {
        return Promise.reject(new Error('Lingkungan DOM tidak mendukung pemuatan modul eksternal.'));
      }
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        return Promise.reject(new Error('Perangkat sedang offline. Gunakan kolom Tempel Teks Faktur di bawah atau sambungkan internet sekali untuk mengunduh mesin OCR gratis.'));
      }
      if (_scriptPromises[url]) return _scriptPromises[url];
      _scriptPromises[url] = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = url;
        s.async = true;
        s.crossOrigin = 'anonymous';
        s.onload = () => resolve();
        s.onerror = () => {
          delete _scriptPromises[url];
          reject(new Error('Gagal mengunduh modul gratis dari CDN. Pastikan koneksi internet aktif atau tempel teks faktur secara manual.'));
        };
        document.head.appendChild(s);
      });
      return _scriptPromises[url];
    } catch (err) {
      return Promise.reject(err);
    }
  }

  function normTokens(str) {
    return String(str || '')
      .toLowerCase()
      .replace(/0/g, 'o')
      .replace(/1/g, 'i')
      .replace(/5/g, 's')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
  }

  function normRawWords(str) {
    return String(str || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
  }

  function bigrams(s) {
    const clean = String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (clean.length < 2) return clean ? [clean] : [];
    const out = [];
    for (let i = 0; i < clean.length - 1; i++) out.push(clean.slice(i, i + 2));
    return out;
  }

  function diceSim(a, b) {
    const ba = bigrams(a);
    const bb = bigrams(b);
    if (!ba.length || !bb.length) return 0;
    const map = {};
    ba.forEach((g) => { map[g] = (map[g] || 0) + 1; });
    let hit = 0;
    bb.forEach((g) => {
      if (map[g] > 0) {
        hit++;
        map[g]--;
      }
    });
    return (2 * hit) / (ba.length + bb.length);
  }

  const MONTH_MAP = {
    jan: 1, januari: 1, january: 1,
    feb: 2, peb: 2, februari: 2, february: 2,
    mar: 3, maret: 3, march: 3,
    apr: 4, april: 4,
    mei: 5, may: 5,
    jun: 6, juni: 6, june: 6,
    jul: 7, juli: 7, july: 7,
    agu: 8, ags: 8, aug: 8, agustus: 8, august: 8,
    sep: 9, sept: 9, september: 9,
    okt: 10, oct: 10, oktober: 10, october: 10,
    nov: 11, nop: 11, november: 11,
    des: 12, dec: 12, desember: 12, december: 12
  };

  function pad2(n) { return String(n).padStart(2, '0'); }
  function lastDayOfMonth(year, month1to12) {
    const d = new Date(year, month1to12, 0);
    return pad2(d.getDate());
  }

  function normalizeDateStr(rawStr) {
    const s = String(rawStr || '').trim();
    if (!s) return '';

    // 1. ISO YYYY-MM-DD or YYYY/MM/DD
    let m = s.match(/\b(20\d{2})[-\/.](\d{1,2})[-\/.](\d{1,2})\b/);
    if (m) {
      const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
      if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) return `${y}-${pad2(mo)}-${pad2(d)}`;
    }

    // 2. DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
    m = s.match(/\b(\d{1,2})[-\/.](\d{1,2})[-\/.](20\d{2})\b/);
    if (m) {
      let a = Number(m[1]), b = Number(m[2]);
      const y = Number(m[3]);
      if (b > 12 && a <= 12) { const tmp = a; a = b; b = tmp; } // fallback MM/DD/YYYY
      if (b >= 1 && b <= 12 && a >= 1 && a <= 31) return `${y}-${pad2(b)}-${pad2(a)}`;
    }

    // 3. DD/MM/YY (when ED like 30/09/28)
    m = s.match(/\b(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2})\b/);
    if (m) {
      const a = Number(m[1]), b = Number(m[2]), yy = Number(m[3]);
      const y = 2000 + yy;
      if (yy >= 24 && yy <= 45 && b >= 1 && b <= 12 && a >= 1 && a <= 31) {
        return `${y}-${pad2(b)}-${pad2(a)}`;
      }
    }

    // 4. Named months: "15 Agu 2028" or "Sep 2028"
    m = s.match(/\b(?:(\d{1,2})\s+)?([A-Za-z]{3,9})[-\s,]+(20\d{2}|\d{2})\b/);
    if (m) {
      const mo = MONTH_MAP[m[2].toLowerCase()];
      if (mo) {
        const y = m[3].length === 2 ? (2000 + Number(m[3])) : Number(m[3]);
        const d = m[1] ? pad2(Number(m[1])) : lastDayOfMonth(y, mo);
        if (y >= 2020 && y <= 2045) return `${y}-${pad2(mo)}-${d}`;
      }
    }

    // 5. MM/YYYY or MM-YYYY
    m = s.match(/\b(\d{1,2})[-\/](20\d{2})\b/);
    if (m) {
      const mo = Number(m[1]), y = Number(m[2]);
      if (mo >= 1 && mo <= 12 && y >= 2020 && y <= 2045) return `${y}-${pad2(mo)}-${lastDayOfMonth(y, mo)}`;
    }

    // 6. MM/YY (farmasi ED cetak kemasan: e.g., ED 09/28)
    m = s.match(/(?:ED|EXP|KADALUARSA)[:.\s-]*(\d{1,2})[-\/](\d{2})\b/i);
    if (m) {
      const mo = Number(m[1]), yy = Number(m[2]);
      if (mo >= 1 && mo <= 12 && yy >= 24 && yy <= 45) return `${2000 + yy}-${pad2(mo)}-${lastDayOfMonth(2000 + yy, mo)}`;
    }

    return '';
  }

  function addDaysToIso(baseIso, days) {
    const start = baseIso && /^\d{4}-\d{2}-\d{2}$/.test(baseIso)
      ? new Date(baseIso + 'T00:00:00Z')
      : new Date();
    start.setUTCDate(start.getUTCDate() + Number(days || 0));
    return start.toISOString().slice(0, 10);
  }

  function parseIdMoney(numStr) {
    let s = String(numStr || '').trim().replace(/^rp\.?\s*/i, '').replace(/,-$/, '');
    if (!s) return 0;
    // Buang desimal ,00 atau .00 di ujung
    s = s.replace(/([.,])00$/, '');
    // Format angka ribuan Indonesia: 1.450.000 atau 12.500 -> hapus titik/koma ribuan
    if (/^\d{1,3}([.,]\d{3})+$/.test(s)) {
      return Number(s.replace(/[.,]/g, '')) || 0;
    }
    // Campuran ribuan & desimal mis. 1,450,000.50 -> ambil bagian integer
    if (/^\d{1,3}(,\d{3})+\.\d{1,2}$/.test(s)) {
      return Math.round(Number(s.replace(/,/g, ''))) || 0;
    }
    if (/^\d{1,3}(\.\d{3})+,\d{1,2}$/.test(s)) {
      return Math.round(Number(s.replace(/\./g, '').replace(',', '.'))) || 0;
    }
    // Fallback hapus pemisah
    const digits = s.replace(/[^\d]/g, '');
    return digits ? Number(digits) : 0;
  }

  /**
   * Pra-pemrosesan gambar Canvas 100% gratis & offline agar hasil OCR faktur dot-matrix/foto jauh lebih tajam
   */
  function preprocessInvoiceImage(srcDataUrl, opts) {
    const o = Object.assign({ enhanceMode: 'contrast', rotateDeg: 0, maxWidth: 2200 }, opts || {});
    return new Promise((resolve, reject) => {
      if (typeof Image === 'undefined' || typeof document === 'undefined') {
        resolve({ dataUrl: srcDataUrl, width: 0, height: 0, mode: o.enhanceMode });
        return;
      }
      const img = new Image();
      img.onload = () => {
        try {
          const rot = ((Number(o.rotateDeg || 0) % 360) + 360) % 360;
          const natW = img.naturalWidth || img.width || 1200;
          const natH = img.naturalHeight || img.height || 900;

          // Upscale gambar kecil agar huruf batch & ED mudah dibaca OCR, tetap batasi maxWidth
          let scale = 1;
          if (natW < 1300) scale = Math.min(2, 1450 / Math.max(1, natW));
          else if (natW > o.maxWidth) scale = o.maxWidth / natW;

          const drawW = Math.round(natW * scale);
          const drawH = Math.round(natH * scale);
          const outW = (rot === 90 || rot === 270) ? drawH : drawW;
          const outH = (rot === 90 || rot === 270) ? drawW : drawH;

          const canvas = document.createElement('canvas');
          canvas.width = outW;
          canvas.height = outH;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, outW, outH);

          ctx.save();
          ctx.translate(outW / 2, outH / 2);
          if (rot) ctx.rotate((rot * Math.PI) / 180);
          ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
          ctx.restore();

          if (o.enhanceMode !== 'original') {
            const imgData = ctx.getImageData(0, 0, outW, outH);
            const d = imgData.data;
            const len = d.length;
            const lum = new Uint8Array(len / 4);
            const hist = new Uint32Array(256);

            for (let i = 0, p = 0; i < len; i += 4, p++) {
              const g = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
              lum[p] = g;
              hist[g]++;
            }

            // Auto percentile stretch (p3..p97) agar kertas kusam tetap putih bersih & tinta pekat
            const totalPx = lum.length;
            let lo = 0, hi = 255, acc = 0;
            for (let v = 0; v < 256; v++) {
              acc += hist[v];
              if (acc >= totalPx * 0.03) { lo = v; break; }
            }
            acc = 0;
            for (let v = 255; v >= 0; v--) {
              acc += hist[v];
              if (acc >= totalPx * 0.03) { hi = v; break; }
            }
            const span = Math.max(24, hi - lo);
            const isSharpBw = o.enhanceMode === 'sharp_bw';

            for (let i = 0, p = 0; i < len; i += 4, p++) {
              let v = ((lum[p] - lo) * 255) / span;
              if (v < 0) v = 0;
              if (v > 255) v = 255;
              // Gamma/contrast curve agar teks lebih tegas
              v = isSharpBw
                ? (v < 142 ? Math.max(0, v * 0.45) : Math.min(255, 228 + (v - 142) * 0.25))
                : Math.min(255, Math.max(0, ((v - 128) * 1.32) + 134));
              const byte = v | 0;
              d[i] = byte;
              d[i + 1] = byte;
              d[i + 2] = byte;
              d[i + 3] = 255;
            }
            ctx.putImageData(imgData, 0, 0);
          }

          resolve({
            dataUrl: canvas.toDataURL('image/png'),
            width: outW,
            height: outH,
            mode: o.enhanceMode
          });
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject(new Error('Gagal memuat gambar untuk diproses.'));
      img.src = srcDataUrl;
    });
  }

  /**
   * Ekstrak teks PDF langsung (digital PDF) atau render halaman ke PNG (PDF scan) - Gratis via PDF.js
   */
  async function extractFromPdfFile(file, onProgress) {
    const progress = typeof onProgress === 'function' ? onProgress : () => {};
    progress(5, 'Memuat mesin pembaca PDF gratis...');
    await loadExternalScriptOnce(PDFJS_CDN, () => !!global.pdfjsLib);
    const pdfjsLib = global.pdfjsLib;
    if (pdfjsLib && pdfjsLib.GlobalWorkerOptions) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_CDN;
    }

    progress(20, 'Membuka dokumen PDF faktur...');
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    const totalPages = Math.min(pdf.numPages || 1, 5);
    const textLinesAll = [];

    for (let p = 1; p <= totalPages; p++) {
      progress(20 + Math.round((p / totalPages) * 45), `Membaca teks halaman ${p}/${totalPages}...`);
      const page = await pdf.getPage(p);
      const tc = await page.getTextContent();
      const rowsByY = {};
      (tc.items || []).forEach((it) => {
        const str = String(it.str || '').trim();
        if (!str) return;
        const y = Math.round((it.transform && it.transform[5] ? it.transform[5] : 0) / 5) * 5;
        const x = it.transform && it.transform[4] ? it.transform[4] : 0;
        if (!rowsByY[y]) rowsByY[y] = [];
        rowsByY[y].push({ x, str });
      });
      // Urutkan Y dari atas ke bawah, lalu X dari kiri ke kanan
      Object.keys(rowsByY)
        .map(Number)
        .sort((a, b) => b - a)
        .forEach((y) => {
          const line = rowsByY[y]
            .sort((a, b) => a.x - b.x)
            .map((c) => c.str)
            .join('  ');
          if (line.trim()) textLinesAll.push(line.trim());
        });
    }

    const joined = textLinesAll.join('\n').trim();
    if (joined.length >= 35) {
      progress(100, `Teks digital PDF berhasil diekstrak (${totalPages} halaman)!`);
      return { source: 'PDF_TEXT', text: joined, pageImages: [] };
    }

    // PDF hasil scan kamera/mesin -> render max 2 halaman pertama ke gambar Canvas
    const pageImages = [];
    const scanPages = Math.min(pdf.numPages || 1, 2);
    for (let p = 1; p <= scanPages; p++) {
      progress(65 + Math.round((p / scanPages) * 20), `Merender halaman scan PDF ${p}/${scanPages}...`);
      const page = await pdf.getPage(p);
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      await page.render({ canvasContext: ctx, viewport }).promise;
      pageImages.push(canvas.toDataURL('image/png'));
    }
    return { source: 'PDF_IMAGE', text: '', pageImages };
  }

  /**
   * OCR Foto Faktur 100% Gratis di Browser dengan Tesseract.js v5 (ind + eng)
   */
  async function recognizeImageText(imageDataUrl, onProgress) {
    const progress = typeof onProgress === 'function' ? onProgress : () => {};
    progress(8, 'Mengunduh/menyiapkan mesin OCR gratis (Tesseract.js)...');
    await loadExternalScriptOnce(TESSERACT_CDN, () => !!(global.Tesseract && global.Tesseract.createWorker));

    const logger = (m) => {
      if (!m) return;
      const pct = Math.min(98, Math.max(12, Math.round(15 + Number(m.progress || 0) * 80)));
      const labelMap = {
        'loading tesseract core': 'Menyiapkan inti OCR...',
        'initializing tesseract': 'Menginisialisasi OCR...',
        'loading language traineddata': 'Mengunduh kamus Bahasa Indonesia & Inggris (sekali saja)...',
        'initializing api': 'Menyiapkan pengenal huruf...',
        'recognizing text': 'Membaca nomor faktur, obat, batch, ED & harga...'
      };
      progress(pct, labelMap[m.status] || `Memproses OCR (${pct}%)...`);
    };

    let worker = null;
    try {
      try {
        worker = await global.Tesseract.createWorker('ind+eng', 1, { logger });
      } catch (eInd) {
        // Fallback ringan bila bahasa ind gagal diunduh jaringan lambat
        worker = await global.Tesseract.createWorker('eng', 1, { logger });
      }
      const res = await worker.recognize(imageDataUrl);
      progress(100, 'Pembacaan foto faktur selesai!');
      return (res && res.data && res.data.text) ? res.data.text : '';
    } finally {
      if (worker && typeof worker.terminate === 'function') {
        try { await worker.terminate(); } catch (e) {}
      }
    }
  }

  /**
   * Buka Modal Kamera Live (HP / Laptop) dengan 1 Klik Jepret
   */
  function openLiveCameraCaptureModal(onCaptureDataUrl) {
    const S = global.ONSStore;
    if (!S || typeof S.openModal !== 'function') return;
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      if (typeof global.toast === 'function') {
        global.toast('Kamera live tidak tersedia di browser/konteks ini. Gunakan tombol Upload Foto / Kamera HP.', 'warn');
      }
      return;
    }

    let activeStream = null;
    const stopCam = () => {
      if (activeStream) {
        activeStream.getTracks().forEach((t) => { try { t.stop(); } catch (e) {} });
        activeStream = null;
      }
    };

    global.__closeScannerCamModal = () => {
      stopCam();
      S.closeModal();
    };

    global.__snapScannerCamPhoto = () => {
      const vid = document.getElementById('onsCamPreviewVideo');
      if (!vid || !vid.videoWidth) {
        if (typeof global.toast === 'function') global.toast('Kamera belum siap, tunggu 1 detik.', 'warn');
        return;
      }
      const cvs = document.createElement('canvas');
      cvs.width = vid.videoWidth;
      cvs.height = vid.videoHeight;
      cvs.getContext('2d').drawImage(vid, 0, 0);
      const dataUrl = cvs.toDataURL('image/jpeg', 0.92);
      stopCam();
      S.closeModal();
      if (typeof onCaptureDataUrl === 'function') onCaptureDataUrl(dataUrl, 'Kamera_Faktur_' + Date.now() + '.jpg');
    };

    S.openModal(`<div class="p-5 space-y-3 text-xs">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="font-bold text-base">Kamera Scan Faktur PBF (Gratis)</h3>
          <p class="text-[11px]" style="color:var(--ons-text-soft)">Posisikan faktur sejajar &amp; terang agar nomor batch, ED, dan harga terbaca maksimal.</p>
        </div>
        <button type="button" onclick="window.__closeScannerCamModal()" class="text-xl px-2">&times;</button>
      </div>
      <div class="relative rounded-xl overflow-hidden bg-slate-950 aspect-[4/3] flex items-center justify-center border" style="border-color:var(--ons-border)">
        <video id="onsCamPreviewVideo" autoplay playsinline muted class="w-full h-full object-contain"></video>
        <div id="onsCamStatusTxt" class="absolute bottom-2 inset-x-2 text-center text-[11px] px-2 py-1 rounded bg-black/60 text-white">Mengaktifkan kamera belakang...</div>
      </div>
      <div class="flex flex-wrap justify-between gap-2 pt-1">
        <button type="button" onclick="window.__closeScannerCamModal()" class="ons-btn ons-btn-ghost text-xs">Batal</button>
        <button type="button" onclick="window.__snapScannerCamPhoto()" class="ons-btn ons-btn-primary text-xs px-5">&#128247; Jepret &amp; Scan Faktur</button>
      </div>
    </div>`, 'full');
    if (typeof S.onModalClose === 'function') S.onModalClose(stopCam);

    navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: false
    }).then((stream) => {
      activeStream = stream;
      const vid = document.getElementById('onsCamPreviewVideo');
      const st = document.getElementById('onsCamStatusTxt');
      if (vid) vid.srcObject = stream;
      if (st) st.textContent = 'Kamera siap — ketuk "Jepret & Scan Faktur"';
    }).catch((err) => {
      const st = document.getElementById('onsCamStatusTxt');
      if (st) st.textContent = 'Kamera tidak dapat diakses: ' + (err && err.message ? err.message : 'izin ditolak');
    });
  }

  /**
   * Skor kecocokan nama obat pada baris faktur terhadap Master Obat Apotek
   */
  function matchObatInLine(lineText, masterObat) {
    if (!lineText || !Array.isArray(masterObat) || !masterObat.length) return null;
    const low = lineText.toLowerCase();
    // Abaikan baris header / footer / alamat perusahaan
    if (/^(no\.?\s*faktur|kepada|npwp|alamat|subtotal|sub\s*total|ppn|diskon|total\s*(?:harga|tagihan|bayar|netto)|terbilang|hormat\s*kami|apoteker|penerima|jatuh\s*tempo)\b/i.test(lineText.trim())) {
      return null;
    }

    const lineWords = normTokens(lineText).filter((w) => w.length >= 3);
    if (!lineWords.length) return null;

    let best = null;
    let bestScore = 0;

    for (let i = 0; i < masterObat.length; i++) {
      const ob = masterObat[i];
      const nameTokens = normTokens(ob.nama_dagang || '').filter((w) => w.length >= 3);
      const zatTokens = normTokens(ob.zat_aktif || '').filter((w) => w.length >= 4);
      if (!nameTokens.length) continue;

      let score = 0;
      let matchedPrimary = false;

      // Exact phrase check for first 2 words of nama_dagang
      const headPhrase = normRawWords(ob.nama_dagang || '').slice(0, 2).join(' ');
      if (headPhrase && headPhrase.length >= 5 && low.includes(headPhrase)) {
        score += 1.6;
        matchedPrimary = true;
      }

      // Fuzzy token matching untuk toleransi typo OCR (mis. Amoxici1lin -> Amoxicillin)
      let hitCount = 0;
      nameTokens.forEach((nt, idx) => {
        const isDose = /^\d+(?:mg|ml|mcg|g)?$/.test(nt);
        let bestTokSim = 0;
        for (let lwIdx = 0; lwIdx < lineWords.length; lwIdx++) {
          const lw = lineWords[lwIdx];
          if (lw === nt) { bestTokSim = 1; break; }
          if (!isDose && nt.length >= 5 && lw.length >= 5) {
            const sim = diceSim(nt, lw);
            if (sim > bestTokSim) bestTokSim = sim;
          }
        }
        if (bestTokSim >= 0.72) {
          hitCount++;
          score += (idx === 0 ? 1.1 : 0.65) * bestTokSim;
          if (idx === 0) matchedPrimary = true;
        }
      });

      // Fallback zat aktif hanya jika nama merek mengandung kata generik atau dosis cocok
      if (!matchedPrimary && zatTokens.length) {
        const z0 = zatTokens[0];
        if (z0.length >= 6 && lineWords.some((lw) => lw === z0 || diceSim(z0, lw) >= 0.82)) {
          score += 0.85;
        }
      }

      // Bonus KFA code exact hit
      if (ob.kode_kfa && low.includes(String(ob.kode_kfa).toLowerCase())) {
        score += 2.0;
      }

      const threshold = nameTokens.length === 1 ? 0.75 : 0.88;
      if (score >= threshold && score > bestScore) {
        bestScore = score;
        best = ob;
      }
    }

    return best ? { obat: best, score: bestScore } : null;
  }

  function matchPbfInText(rawText, supplierPbf) {
    if (!rawText || !Array.isArray(supplierPbf) || !supplierPbf.length) return null;
    const low = rawText.toLowerCase();
    const stop = { pt: 1, cv: 1, tbk: 1, ud: 1, fa: 1, cabang: 1, makassar: 1, trading: 1, distribusi: 1 };
    let bestPbf = null;
    let bestHits = 0;

    supplierPbf.forEach((p) => {
      const words = normRawWords(p.nama_pbf || '').filter((w) => w.length >= 3 && !stop[w]);
      if (!words.length) return;
      const corePhrase = words.slice(0, 2).join(' ');
      let hits = 0;
      if (corePhrase && low.includes(corePhrase)) hits += 4;
      words.forEach((w) => {
        if (new RegExp('\\b' + w + '\\b', 'i').test(rawText)) hits += 1;
      });
      // Cek inisial singkat (BSP, KFTD, EPM, AAM) bila 3+ huruf
      const initials = words.map((w) => w[0]).join('');
      if (initials.length >= 3 && new RegExp('\\b' + initials + '\\b', 'i').test(rawText)) hits += 2;
      if (hits > bestHits) {
        bestHits = hits;
        bestPbf = p;
      }
    });

    return bestHits >= 2 ? bestPbf : null;
  }

  function extractItemFields(chunkText, matchedObat, headerContext) {
    const cleanChunk = chunkText.replace(new RegExp(headerContext.noFakturEsc || '$^', 'gi'), ' ');

    // 1. Tanggal Kadaluarsa (ED)
    let tglEd = '';
    const edTagged = cleanChunk.match(/(?:ED|EXP(?:\.?\s*DATE)?|KADALUARSA|EXPIRY)\s*[:.#-]?\s*(\d{4}[-\/.]\d{1,2}[-\/.]\d{1,2}|\d{1,2}[-\/.]\d{1,2}[-\/.](?:20)?\d{2}|\d{1,2}[-\/]\d{2,4}|(?:\d{1,2}\s+)?[A-Za-z]{3,9}[-\s]+20\d{2})/i);
    if (edTagged) tglEd = normalizeDateStr(edTagged[1]);
    if (!tglEd) {
      const anyDates = cleanChunk.match(/\b(?:20\d{2}[-\/.]\d{1,2}[-\/.]\d{1,2}|\d{1,2}[-\/.]\d{1,2}[-\/.]20\d{2})\b/g) || [];
      for (let i = 0; i < anyDates.length; i++) {
        const dIso = normalizeDateStr(anyDates[i]);
        if (dIso && Number(dIso.slice(0, 4)) >= 2026) {
          tglEd = dIso;
          break;
        }
      }
    }

    // 2. Nomor Batch
    let noBatch = '';
    const batM = cleanChunk.match(/(?:NO\.?\s*BATCH|BATCH|LOT|BN|B\.N)\s*[:.#-]?\s*([A-Z0-9][A-Z0-9\-\/]{2,18})/i);
    if (batM) {
      noBatch = batM[1].toUpperCase();
    } else {
      // Cari token alfanumerik (ada huruf & angka) yang bukan kode obat KFA, bukan satuan mg/ml
      const tokens = cleanChunk.match(/\b(?=[A-Z0-9\-]{5,18}\b)(?=.*[A-Z])(?=.*\d)[A-Z0-9\-]+\b/gi) || [];
      const cand = tokens.find((t) => !/^(?:\d+(?:MG|ML|MCG|GR|BOX|TAB|KAP|STR|BTL|PCS)|KFA\d+|OBT-\d+)$/i.test(t) && !/^20\d{2}/.test(t));
      if (cand) noBatch = cand.toUpperCase();
    }

    // 3. Qty & Konversi Satuan (Box / Strip -> Satuan Dasar)
    let rawQty = 0;
    let detectedUnit = '';
    const unitRx = /(\d+(?:[.,]\d+)?)\s*(BOX|KOTAK|KTK|DUS|CARTON|STRIP|STR|BLISTER|TUBE|BOTOL|BTL|FLS|VIAL|AMPUL|SACHET|PCS|TAB(?:LET)?|KAP(?:SUL|LET)?)\b/i;
    const qtyExplicit = cleanChunk.match(/(?:QTY|JUMLAH|JML)\s*[:=]?\s*(\d+)(?:\s*([A-Za-z]+))?/i);
    const unitMatch = cleanChunk.match(unitRx);

    if (qtyExplicit) {
      rawQty = Number(qtyExplicit[1] || 0);
      detectedUnit = (qtyExplicit[2] || (unitMatch ? unitMatch[2] : '') || '').toUpperCase();
    } else if (unitMatch) {
      rawQty = Math.round(Number(String(unitMatch[1]).replace(',', '.')) || 0);
      detectedUnit = String(unitMatch[2] || '').toUpperCase();
    } else {
      // Cari angka integer qty yang wajar (1..5000) bukan bagian dari nama dosis 500mg
      const withoutDose = cleanChunk.replace(/\b\d+\s*(?:mg|ml|mcg|gr|g|%)\b/gi, ' ').replace(/\b20\d{2}[-\/.]\d{1,2}[-\/.]\d{1,2}\b/g, ' ');
      const ints = withoutDose.match(/(?:^|\s)(\d{1,4})(?=\s|$)/g) || [];
      const qCand = ints.map((x) => Number(x.trim())).find((n) => n >= 1 && n <= 2000 && (!noBatch || !noBatch.includes(String(n))));
      if (qCand) rawQty = qCand;
    }
    if (!rawQty || rawQty <= 0) rawQty = 10;

    // Hitung rasio ke satuan dasar jika faktur menyebut Box/Strip
    let multiplier = 1;
    let unitNote = matchedObat.satuan_dasar || 'Tab';
    const bigUnit = String(matchedObat.satuan_besar || '').toUpperCase();
    const midUnit = String(matchedObat.satuan_sedang || '').toUpperCase();
    const bigRatio = Number(matchedObat.rasio_besar || 1);
    const midRatio = Number(matchedObat.rasio_sedang || 1);

    if (detectedUnit) {
      if (bigRatio > 1 && (/^(BOX|KOTAK|KTK|DUS|CARTON)$/.test(detectedUnit) || (bigUnit && detectedUnit.startsWith(bigUnit.slice(0, 3))))) {
        multiplier = bigRatio;
        unitNote = `${rawQty} ${detectedUnit} -> ${rawQty * multiplier} ${matchedObat.satuan_dasar || 'Unit'}`;
      } else if (midRatio > 1 && (/^(STRIP|STR|BLISTER|PACK)$/.test(detectedUnit) || (midUnit && detectedUnit.startsWith(midUnit.slice(0, 3))))) {
        multiplier = midRatio;
        unitNote = `${rawQty} ${detectedUnit} -> ${rawQty * multiplier} ${matchedObat.satuan_dasar || 'Unit'}`;
      }
    }
    const qtyDasar = Math.max(1, rawQty * multiplier);

    // 4. Ekstrak Harga Beli / HPP per unit dasar
    // Bersihkan tanggal, batch & qty agar angka pada tanggal tidak terbaca sebagai rupiah
    let moneyScope = cleanChunk
      .replace(/\b(?:20\d{2}[-\/.]\d{1,2}[-\/.]\d{1,2}|\d{1,2}[-\/.]\d{1,2}[-\/.](?:20)?\d{2})\b/g, ' ')
      .replace(/\b\d+\s*(?:mg|ml|mcg|gr)\b/gi, ' ');
    if (noBatch) moneyScope = moneyScope.split(noBatch).join(' ');

    const moneyMatches = [];
    const moneyRx = /(?:(?:RP\.?|HRG|HARGA|@|SUBTOTAL|TOTAL|NETTO)\s*[:.]?\s*)?(\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{2})?|\d{4,9})/gi;
    let mm;
    while ((mm = moneyRx.exec(moneyScope)) !== null) {
      const val = parseIdMoney(mm[1]);
      if (val >= 100 && val <= 500000000) {
        const prefix = (mm[0] || '').toUpperCase();
        moneyMatches.push({
          val,
          isTotalTagged: /TOTAL|SUBTOTAL|NETTO/.test(prefix),
          isUnitTagged: /@|HRG|HARGA/.test(prefix)
        });
      }
    }

    let hppUnit = Number(matchedObat.hpp_terakhir || matchedObat.hpp_avg || 0);
    if (moneyMatches.length >= 2) {
      // Urutkan: biasanya kolom paling kanan adalah subtotal baris atau pair (harga_satuan, subtotal)
      const explicitTotal = moneyMatches.find((m) => m.isTotalTagged);
      const explicitUnit = moneyMatches.find((m) => m.isUnitTagged);
      if (explicitTotal) {
        hppUnit = Math.max(1, Math.round(explicitTotal.val / qtyDasar));
      } else if (explicitUnit && !explicitTotal) {
        // Cek apakah ada nilai berikutnya ~ rawQty * explicitUnit
        const pairTot = moneyMatches.find((m) => Math.abs(m.val - explicitUnit.val * rawQty) <= explicitUnit.val * 0.15 * rawQty);
        hppUnit = pairTot
          ? Math.max(1, Math.round(pairTot.val / qtyDasar))
          : Math.max(1, Math.round(explicitUnit.val / multiplier));
      } else {
        const last = moneyMatches[moneyMatches.length - 1];
        const prev = moneyMatches[moneyMatches.length - 2];
        if (Math.abs(last.val - prev.val * rawQty) <= Math.max(500, prev.val * rawQty * 0.15)) {
          hppUnit = Math.max(1, Math.round(last.val / qtyDasar));
        } else if (Math.abs(last.val - prev.val * qtyDasar) <= Math.max(500, prev.val * qtyDasar * 0.15)) {
          hppUnit = prev.val;
        } else {
          hppUnit = Math.max(1, Math.round(last.val / qtyDasar));
        }
      }
    } else if (moneyMatches.length === 1) {
      const one = moneyMatches[0];
      if (one.isUnitTagged) {
        hppUnit = Math.max(1, Math.round(one.val / multiplier));
      } else {
        // Heuristik: jika nominalnya jauh lebih besar dibanding estimasi HPP * 1.6 (atau tagged TOTAL), anggap total baris
        const refHpp = Number(matchedObat.hpp_terakhir || matchedObat.hpp_avg || 1000);
        if (one.isTotalTagged || (qtyDasar > 1 && one.val >= refHpp * Math.max(2, qtyDasar * 0.45))) {
          hppUnit = Math.max(1, Math.round(one.val / qtyDasar));
        } else {
          hppUnit = Math.max(1, Math.round(one.val / multiplier));
        }
      }
    }

    return {
      id_obat: matchedObat.id_obat,
      nama_dagang: matchedObat.nama_dagang,
      no_batch: noBatch || ('B-' + new Date().getFullYear() + '-SCAN'),
      tgl_kadaluarsa: tglEd || '2028-12-31',
      qty_dasar: qtyDasar,
      hpp_unit: Math.max(0, Math.round(hppUnit)),
      unit_note: detectedUnit && multiplier > 1 ? unitNote : ''
    };
  }

  /**
   * Parser Induk Teks Faktur PBF -> Header + Multi-Row Items + Diagnostik Keyakinan
   */
  function parseInvoiceText(rawText, masterObat, supplierPbf) {
    const text = String(rawText || '').trim();
    const obatList = Array.isArray(masterObat) ? masterObat : [];
    const pbfList = Array.isArray(supplierPbf) ? supplierPbf : [];

    const result = {
      header: {
        no_faktur_pbf: '',
        no_sp: '',
        id_pbf: '',
        tgl_faktur: '',
        tgl_jatuh_tempo: '',
        diskon_pbf: 0,
        ppn_masukan: 0,
        status_bayar: ''
      },
      items: [],
      meta: {
        detectedHeaderFields: 0,
        matchedItemsCount: 0,
        unmatchedLines: [],
        unitConversions: [],
        autoPpn11: false
      }
    };
    if (!text) return result;

    // --- A. Ekstrak Header ---
    const fakLabeled = text.match(/(?:NO\.?\s*(?:FAKTUR|INV(?:OICE)?|DOK(?:UMEN)?)|FAKTUR\s*NO\.?)\s*[:.#-]?\s*([A-Z0-9][A-Z0-9\-\/.]{3,28})/i);
    const fakPrefix = text.match(/\b((?:FK|FKT|INV|FJ|FP|FAK)[-\/][A-Z0-9\-\/]{3,24})\b/i);
    if (fakLabeled) result.header.no_faktur_pbf = fakLabeled[1].toUpperCase();
    else if (fakPrefix) result.header.no_faktur_pbf = fakPrefix[1].toUpperCase();

    const spLabeled = text.match(/(?:NO\.?\s*(?:SP|SURAT\s*PESANAN|PO)|SP\s*NO\.?)\s*[:.#-]?\s*([A-Z0-9][A-Z0-9\-\/]{3,26})/i)
      || text.match(/\b(SP[-\/][A-Z0-9\-\/]{4,24})\b/i);
    if (spLabeled) result.header.no_sp = spLabeled[1].toUpperCase();

    const pbfHit = matchPbfInText(text, pbfList);
    if (pbfHit) result.header.id_pbf = pbfHit.nama_pbf;

    const tglFakM = text.match(/(?:TGL\.?\s*FAKTUR|TANGGAL(?:\s*FAKTUR)?)\s*[:.]?\s*([^\n]{6,22})/i);
    if (tglFakM) result.header.tgl_faktur = normalizeDateStr(tglFakM[1]);

    const jtM = text.match(/(?:JATUH\s*TEMPO|TGL\.?\s*JT|DUE\s*DATE)\s*[:.]?\s*([^\n]{6,22})/i);
    if (jtM) result.header.tgl_jatuh_tempo = normalizeDateStr(jtM[1]);

    if (!result.header.tgl_jatuh_tempo) {
      const topM = text.match(/(?:T\.?O\.?P\.?|TERMIN|KREDIT|NET)\s*[:=\-]?\s*(\d{1,3})\s*H(?:ARI|R)?\b/i);
      if (topM) {
        result.header.tgl_jatuh_tempo = addDaysToIso(result.header.tgl_faktur, Number(topM[1]));
      } else if (pbfHit && Number(pbfHit.termin_hari || 0) > 0) {
        result.header.tgl_jatuh_tempo = addDaysToIso(result.header.tgl_faktur, Number(pbfHit.termin_hari));
      }
    }

    if (/(?:CAR[AE]\s*BAYAR|METODE\s*BAYAR|SYARAT\s*BAYAR|PEMBAYARAN)\s*[:.]?\s*(?:TUNAI|CASH|COD|LUNAS)\b/i.test(text) || /\bCOD\b/i.test(text)) {
      result.header.status_bayar = 'LUNAS';
    } else if (/(?:KREDIT|T\.?O\.?P\.?|TEMPO|HUTANG)/i.test(text)) {
      result.header.status_bayar = 'BELUM_LUNAS';
    }

    const discM = text.match(/(?:DISKON\s*(?:FAKTUR|PBF|TOTAL)?|POTONGAN)\s*[:.]?\s*(?:RP\.?\s*)?([\d.,]{3,})/i);
    if (discM) result.header.diskon_pbf = parseIdMoney(discM[1]);

    const ppnM = text.match(/PPN(?:\s*MASUKAN|\s*\d+%)?\s*[:.]?\s*(?:RP\.?\s*)?([\d.,]{4,})/i);
    if (ppnM) {
      result.header.ppn_masukan = parseIdMoney(ppnM[1]);
    } else if (/PPN\s*(?:11|12)\s*%/i.test(text)) {
      result.meta.autoPpn11 = true;
    }

    // --- B. Ekstrak Multi-Item Obat (Baris per Baris + Baris Lanjutan) ---
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const noFakturEsc = result.header.no_faktur_pbf
      ? result.header.no_faktur_pbf.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      : '';

    const chunks = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Abaikan baris rekap header/footer pajak
      if (/^(?:SUBTOTAL|SUB\s*TOTAL|DPP|PPN\s*\d*%?|TOTAL\s*(?:TAGIHAN|FAKTUR|NETTO|AKHIR|BAYAR)|DISKON\s*FAKTUR|TERBILANG)/i.test(line)) {
        continue;
      }
      const match = matchObatInLine(line, obatList);
      if (match) {
        let combined = line;
        // Cek maksimal 2 baris lanjutan tepat di bawahnya jika tidak menyebut obat lain (sering berisi Batch / ED)
        let look = 1;
        while (look <= 2 && i + look < lines.length) {
          const nxt = lines[i + look];
          if (/^(?:SUBTOTAL|PPN|TOTAL|DISKON|HORMAT|TERBILANG)/i.test(nxt)) break;
          if (matchObatInLine(nxt, obatList)) break;
          if (/(?:BATCH|LOT|ED|EXP|QTY|RP|\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/20\d{2})/i.test(nxt)) {
            combined += ' ' + nxt;
            i++;
            look++;
          } else {
            break;
          }
        }
        chunks.push({ text: combined, obat: match.obat });
      } else if (/\b(?:BATCH|LOT|ED|EXP)\b/i.test(line) && /\d{3,}/.test(line) && chunks.length === 0) {
        result.meta.unmatchedLines.push(line);
      }
    }

    chunks.forEach((ch) => {
      const it = extractItemFields(ch.text, ch.obat, { noFakturEsc });
      if (it.unit_note) result.meta.unitConversions.push(`${ch.obat.nama_dagang}: ${it.unit_note}`);
      result.items.push(it);
    });

    // Fallback single-line mode: jika tidak ada obat terdeteksi by name, tetapi user menempel ringkasan angka seperti format lama
    if (!result.items.length && obatList.length && (/(?:BATCH|LOT|ED|20\d{2}-\d{2}-\d{2}|QTY|RP)/i.test(text))) {
      const fallbackItem = extractItemFields(text, obatList[0], { noFakturEsc });
      result.items.push(fallbackItem);
    }

    const hdrKeys = ['no_faktur_pbf', 'no_sp', 'id_pbf', 'tgl_jatuh_tempo', 'diskon_pbf', 'ppn_masukan', 'status_bayar'];
    result.meta.detectedHeaderFields = hdrKeys.filter((k) => Boolean(result.header[k])).length;
    result.meta.matchedItemsCount = chunks.length;

    return result;
  }

  /**
   * Hasilkan teks contoh faktur realistis dari masterObat & supplierPbf aktif untuk uji 1 klik
   */
  function getSamplePbfInvoiceText(appState) {
    const st = appState || (global.ONSStore && global.ONSStore.AppState) || {};
    const pbf = (st.supplierPbf && st.supplierPbf[0] && st.supplierPbf[0].nama_pbf) || 'PT Bina San Prima';
    const o1 = (st.masterObat && st.masterObat[0]) || { nama_dagang: 'Amoxicillin 500mg', hpp_terakhir: 520, satuan_dasar: 'Kaplet' };
    const o2 = (st.masterObat && st.masterObat[1]) || { nama_dagang: 'Paracetamol 500mg', hpp_terakhir: 280, satuan_dasar: 'Tablet' };
    const p1 = Math.max(400, Number(o1.hpp_terakhir || o1.hpp_avg || 520));
    const p2 = Math.max(200, Number(o2.hpp_terakhir || o2.hpp_avg || 280));
    const sub1 = 100 * p1;
    const sub2 = 200 * p2;
    const ppn = Math.round((sub1 + sub2 - 15000) * 0.11);
    return [
      `FAKTUR PENJUALAN PBF - ${pbf}`,
      `No Faktur: FK-BSP-${new Date().getFullYear()}-8842`,
      `No SP: SP-${new Date().getFullYear()}-019`,
      `Tgl Faktur: 10/11/2026   TOP: 30 Hari`,
      `--------------------------------------------------`,
      `1. ${o1.nama_dagang}  Batch: AMX2611A  ED: 30/09/2028  Qty: 100 ${o1.satuan_dasar || 'Tab'}  @ Rp ${p1.toLocaleString('id-ID')}  Total Rp ${sub1.toLocaleString('id-ID')}`,
      `2. ${o2.nama_dagang}  Batch: PCT2608B  ED: 15/12/2028  Qty: 200 ${o2.satuan_dasar || 'Tab'}  @ Rp ${p2.toLocaleString('id-ID')}  Total Rp ${sub2.toLocaleString('id-ID')}`,
      `--------------------------------------------------`,
      `Diskon Faktur: Rp 15.000`,
      `PPN Masukan 11%: Rp ${ppn.toLocaleString('id-ID')}`
    ].join('\n');
  }

  global.ONSInvoiceScanner = {
    preprocessInvoiceImage,
    extractFromPdfFile,
    recognizeImageText,
    openLiveCameraCaptureModal,
    parseInvoiceText,
    getSamplePbfInvoiceText,
    normalizeDateStr,
    parseIdMoney
  };
})(window);
