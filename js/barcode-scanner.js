/**
 * ONS FARMA DIGITAL ENTERPRISE v15.0 - Kamera Barcode/QR Scanner & Cetak Label Stiker Mandiri
 * - Hybrid 100% Gratis: Native BarcodeDetector API (Chrome/Android) + Lazy ZXing UMD Fallback (Safari/Firefox)
 * - Cetak Stiker Barcode Code128 Mandiri + Label Rak Lokasi untuk Obat Eceran & Racikan
 */
(function (global) {
  'use strict';

  const ZXING_CDN = 'https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js';
  const SUPPORTED_FORMATS = ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'qr_code'];

  let _zxingPromise = null;
  function loadZxingOnce() {
    if (global.ZXing && global.ZXing.BrowserMultiFormatReader) return Promise.resolve(global.ZXing);
    if (typeof document === 'undefined' || !document.head) {
      return Promise.reject(new Error('DOM tidak mendukung pemuatan scanner fallback.'));
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return Promise.reject(new Error('Browser ini tidak memiliki BarcodeDetector bawaan dan perangkat sedang offline.'));
    }
    if (_zxingPromise) return _zxingPromise;
    _zxingPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = ZXING_CDN;
      s.async = true;
      s.crossOrigin = 'anonymous';
      s.onload = () => resolve(global.ZXing);
      s.onerror = () => {
        _zxingPromise = null;
        reject(new Error('Gagal memuat modul scanner fallback. Gunakan input kode manual.'));
      };
      document.head.appendChild(s);
    });
    return _zxingPromise;
  }

  function playScanBeep() {
    try {
      const Ctx = global.AudioContext || global.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 1320;
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.11);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
      setTimeout(() => { try { ctx.close(); } catch (e) {} }, 220);
    } catch (e) {}
  }

  function matchProductByBarcode(rawCode, masterObat, stokBatch) {
    const code = String(rawCode || '').trim();
    if (!code) return null;
    const low = code.toLowerCase();
    const list = Array.isArray(masterObat) ? masterObat : [];
    const batches = Array.isArray(stokBatch) ? stokBatch : [];

    // 1. Cek Barcode EAN / KFA / ID / NIE pada Master Obat
    const byObat = list.find((o) =>
      [o.barcode_ean, o.kode_kfa, o.id_obat, o.nie_bpom]
        .some((v) => v && String(v).trim().toLowerCase() === low)
    );
    if (byObat) return { obat: byObat, batch: null, matchedBy: 'KODE_OBAT', code };

    // 2. Cek Nomor Batch pada Stok Batch (QR batch / botol)
    const byBatch = batches.find((b) =>
      [b.no_batch, b.id_batch].some((v) => v && String(v).trim().toLowerCase() === low)
    );
    if (byBatch) {
      const ob = list.find((o) => o.id_obat === byBatch.id_obat) || null;
      return { obat: ob, batch: byBatch, matchedBy: 'BATCH', code };
    }

    // 3. Partial fallback nama/kode
    const partial = list.find((o) =>
      String(o.barcode_ean || '').toLowerCase().includes(low) ||
      String(o.kode_kfa || '').toLowerCase().includes(low) ||
      String(o.nama_dagang || '').toLowerCase().includes(low)
    );
    if (partial) return { obat: partial, batch: null, matchedBy: 'PARTIAL', code };

    return null;
  }

  function openScannerModal(opts) {
    const cfg = Object.assign({
      title: 'Scanner Barcode / QR Obat (Kamera Gratis)',
      hint: 'Arahkan kotak obat, barcode EAN-13, kode KFA, atau QR batch ke bingkai tengah.',
      onDetect: null
    }, opts || {});
    const S = global.ONSStore;
    if (!S || typeof S.openModal !== 'function') return;

    let stopped = false;
    let stream = null;
    let rafId = null;
    let zxingControls = null;
    let torchOn = false;

    const cleanup = () => {
      stopped = true;
      if (rafId && typeof global.cancelAnimationFrame === 'function') {
        try { global.cancelAnimationFrame(rafId); } catch (e) {}
      }
      if (zxingControls && typeof zxingControls.stop === 'function') {
        try { zxingControls.stop(); } catch (e) {}
      }
      if (stream) {
        stream.getTracks().forEach((t) => { try { t.stop(); } catch (e) {} });
        stream = null;
      }
    };

    const handleDetected = (val) => {
      const clean = String(val || '').trim();
      if (!clean || stopped) return;
      cleanup();
      if (global.playFeedback) {
        global.playFeedback('scan');
      } else {
        playScanBeep();
        if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
          try { navigator.vibrate(70); } catch (e) {}
        }
      }
      S.closeModal();
      if (typeof cfg.onDetect === 'function') cfg.onDetect(clean);
    };

    global.__closeBarcodeScannerModal = () => {
      cleanup();
      S.closeModal();
    };
    global.__submitManualBarcodeFromModal = () => {
      const inp = document.getElementById('onsBarcodeManualInp');
      const v = inp ? inp.value.trim() : '';
      if (!v) {
        if (typeof global.toast === 'function') global.toast('Masukkan atau scan kode barcode terlebih dahulu.', 'warn');
        return;
      }
      handleDetected(v);
    };
    global.__toggleScannerTorch = async () => {
      if (!stream) {
        if (typeof global.toast === 'function') global.toast('Kamera belum aktif.', 'info');
        return;
      }
      const track = stream.getVideoTracks && stream.getVideoTracks()[0];
      if (!track || typeof track.applyConstraints !== 'function') {
        if (typeof global.toast === 'function') global.toast('Kamera tidak mendukung kendali senter flash.', 'info');
        return;
      }
      try {
        torchOn = !torchOn;
        await track.applyConstraints({ advanced: [{ torch: torchOn }] });
        const floatBtn = document.getElementById('onsBarcodeTorchFloatingBtn');
        const iconEl = document.getElementById('onsTorchIcon');
        const labelEl = document.getElementById('onsTorchLabel');
        const btn = document.getElementById('onsBarcodeTorchBtn');
        if (floatBtn) {
          floatBtn.classList.toggle('is-torch-on', torchOn);
        }
        if (labelEl) labelEl.textContent = torchOn ? 'Matikan' : 'Senter';
        if (btn) btn.textContent = torchOn ? 'Matikan Senter' : 'Senter / Flash';
        if (global.playFeedback) global.playFeedback('key');
      } catch (e) {
        if (typeof global.toast === 'function') global.toast('Senter flash tidak didukung perangkat/kamera ini.', 'warn');
      }
    };

    S.openModal(`<div class="p-5 space-y-3 text-xs">
      <div class="flex items-start justify-between gap-2">
        <div>
          <h3 class="font-bold text-base">${S.esc(cfg.title)}</h3>
          <p class="text-[11px]" style="color:var(--ons-text-soft)">${S.esc(cfg.hint)}</p>
        </div>
        <button type="button" onclick="window.__closeBarcodeScannerModal()" class="text-xl px-2">&times;</button>
      </div>
      <div class="relative rounded-xl overflow-hidden bg-slate-950 aspect-[4/3] flex items-center justify-center border" style="border-color:var(--ons-border)">
        <video id="onsBarcodeVideo" autoplay playsinline muted class="w-full h-full object-cover"></video>
        <!-- Floating Torch Button in Viewfinder -->
        <button type="button" id="onsBarcodeTorchFloatingBtn" onclick="window.__toggleScannerTorch()" class="absolute top-2.5 right-2.5 z-20 px-3 py-1.5 rounded-full flex items-center gap-1.5 bg-black/65 hover:bg-black/85 text-white text-xs font-bold border border-white/20 backdrop-blur shadow-md active:scale-95 transition-all" title="Nyalakan / Matikan Senter Flash">
          <span id="onsTorchIcon">🔦</span>
          <span id="onsTorchLabel">Senter</span>
        </button>
        <!-- Laser Scan Reticle with Animated Beam -->
        <div class="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div class="w-4/5 h-1/2 rounded-xl border-2 border-emerald-400/90 shadow-[0_0_0_9999px_rgba(15,23,42,0.45)] flex items-end justify-center pb-2 relative overflow-hidden">
            <div class="ons-scanner-laser-beam absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent"></div>
            <span class="px-2 py-0.5 rounded bg-emerald-600/90 text-white text-[10px] font-bold">Area Pindai Barcode / QR</span>
          </div>
        </div>
        <div id="onsBarcodeCamStatus" class="absolute top-2.5 left-2.5 right-28 text-left text-[11px] px-2.5 py-1 rounded bg-black/65 text-white truncate">Menghubungkan kamera...</div>
      </div>
      <div class="flex flex-wrap items-center gap-2 pt-1">
        <input id="onsBarcodeManualInp" class="ons-input flex-1 min-w-[180px] font-mono-num text-xs" placeholder="Atau scan USB gun / ketik kode EAN, KFA, Batch lalu Enter..." onkeydown="if(event.key==='Enter'){event.preventDefault();window.__submitManualBarcodeFromModal();}"/>
        <button type="button" id="onsBarcodeTorchBtn" onclick="window.__toggleScannerTorch()" class="ons-btn ons-btn-ghost text-xs">Senter / Flash</button>
        <button type="button" onclick="window.__submitManualBarcodeFromModal()" class="ons-btn ons-btn-primary text-xs">Gunakan Kode</button>
      </div>
    </div>`, 'full');
    if (typeof S.onModalClose === 'function') S.onModalClose(cleanup);

    setTimeout(() => {
      const inp = document.getElementById('onsBarcodeManualInp');
      if (inp) inp.focus();
    }, 60);

    const statusEl = () => document.getElementById('onsBarcodeCamStatus');
    const vidEl = () => document.getElementById('onsBarcodeVideo');

    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      if (statusEl()) statusEl().textContent = 'Kamera tidak tersedia — gunakan input USB scanner / ketik manual di bawah.';
      return;
    }

    navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    }).then(async (s) => {
      if (stopped) {
        s.getTracks().forEach((t) => { try { t.stop(); } catch (e) {} });
        return;
      }
      stream = s;
      const vid = vidEl();
      if (vid) {
        vid.srcObject = s;
        try { await vid.play(); } catch (e) {}
      }

      // Jalur 1: Native BarcodeDetector API (Chrome / Edge / Android PWA)
      if (typeof global.BarcodeDetector === 'function') {
        try {
          const detector = new global.BarcodeDetector({ formats: SUPPORTED_FORMATS });
          if (statusEl()) statusEl().textContent = 'Kamera aktif (Engine Native Cepat) — arahkan ke barcode';
          const scanLoop = async () => {
            if (stopped || !vid) return;
            if (vid.readyState >= 2) {
              try {
                const hits = await detector.detect(vid);
                if (hits && hits.length && hits[0].rawValue) {
                  handleDetected(hits[0].rawValue);
                  return;
                }
              } catch (e) {}
            }
            rafId = global.requestAnimationFrame(scanLoop);
          };
          rafId = global.requestAnimationFrame(scanLoop);
          return;
        } catch (eDet) {}
      }

      // Jalur 2: ZXing Web Fallback (Safari iOS / Firefox)
      if (statusEl()) statusEl().textContent = 'Menyiapkan scanner lintas-browser gratis...';
      try {
        const ZXing = await loadZxingOnce();
        if (stopped || !vid) return;
        const reader = new ZXing.BrowserMultiFormatReader();
        if (statusEl()) statusEl().textContent = 'Kamera aktif (ZXing) — arahkan ke barcode/QR';
        zxingControls = reader.decodeFromStream(stream, vid, (result) => {
          if (result && typeof result.getText === 'function' && result.getText()) {
            handleDetected(result.getText());
          }
        });
      } catch (zErr) {
        if (statusEl()) statusEl().textContent = (zErr && zErr.message) || 'Kamera aktif tanpa deteksi otomatis; ketik/scan manual di bawah.';
      }
    }).catch((err) => {
      if (statusEl()) statusEl().textContent = 'Izin kamera tidak aktif (' + ((err && err.message) || 'akses ditolak') + '). Gunakan ketik/USB scanner di bawah.';
    });
  }

  function renderCode128SvgString(value, maxWidth, height) {
    if (global.ONSCode128 && typeof global.ONSCode128.renderSvg === 'function') {
      return global.ONSCode128.renderSvg(value, maxWidth, height);
    }
    try {
      if (global.ONSCode128 && typeof global.ONSCode128.encode === 'function') {
        const bits = global.ONSCode128.encode(value);
        const h = Number(height || 36);
        const quiet = 8;
        const mw = 1.4;
        const margin = 3;
        const vw = (bits.length + quiet * 2) * mw + margin * 2;
        const vh = h + margin * 2;
        let rects = `<rect x="0" y="0" width="${vw}" height="${vh}" fill="#ffffff"/>`;
        let i = 0;
        while (i < bits.length) {
          if (bits[i] === '1') {
            let j = i + 1;
            while (j < bits.length && bits[j] === '1') j++;
            rects += `<rect x="${(margin + (quiet + i) * mw).toFixed(2)}" y="${margin}" width="${((j - i) * mw).toFixed(2)}" height="${h}" fill="#000000"/>`;
            i = j;
          } else {
            i++;
          }
        }
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vw.toFixed(2)} ${vh}" style="width:100%;max-width:${Number(maxWidth || 165)}px;height:${h}px;display:block;" role="img" aria-label="Barcode ${String(value).replace(/"/g, '')}">${rects}</svg>`;
      }
    } catch (e) {}
    return '';
  }

  /**
   * Modal Cetak Stiker Label Barcode & Rak Lokasi Mandiri (Code128 SVG Offline)
   */
  function openPrintBarcodeLabelsModal(itemsInput) {
    const S = global.ONSStore;
    if (!S || typeof S.openModal !== 'function') return;
    const st = S.AppState || {};
    const list = Array.isArray(itemsInput) && itemsInput.length
      ? itemsInput
      : (st.masterObat || []).slice(0, 8);
    if (!list.length) {
      if (typeof global.toast === 'function') global.toast('Belum ada data obat untuk dicetak labelnya.', 'warn');
      return;
    }

    const labelCopies = {};
    list.forEach((o) => { labelCopies[o.id_obat] = list.length === 1 ? 6 : 2; });

    const renderLabelsGrid = () => {
      const showPrice = !(document.getElementById('lblShowPrice') && !document.getElementById('lblShowPrice').checked);
      const showRak = !(document.getElementById('lblShowRak') && !document.getElementById('lblShowRak').checked);
      const prof = S.getStoreProfile ? S.getStoreProfile() : {};
      const storeShort = String(prof.nama_usaha || 'APOTEK ONS FARMA').toUpperCase().slice(0, 24);
      const cards = [];

      list.forEach((o) => {
        const copies = Math.max(0, Math.min(40, Number(labelCopies[o.id_obat] || 0)));
        const codeVal = String(o.kode_kfa || o.barcode_ean || o.id_obat || 'OBT001').trim();
        const svgBarcode = renderCode128SvgString(codeVal, 165, 36)
          || `<div style="font-family:monospace;font-weight:700;font-size:11px;border:1px solid #000;padding:3px 6px;">${S.esc(codeVal)}</div>`;
        for (let c = 0; c < copies; c++) {
          cards.push(`<div class="ons-barcode-sticker" style="border:1px dashed #64748B;border-radius:8px;padding:7px 9px;background:#FFFFFF;color:#0F172A;display:flex;flex-direction:column;justify-content:space-between;gap:3px;page-break-inside:avoid;">
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:9px;font-weight:700;color:#475569;">
              <span>${S.esc(storeShort)}</span>
              ${showRak ? `<span>${S.esc(o.rak_lokasi || 'RAK')}</span>` : ''}
            </div>
            <div style="font-size:11px;font-weight:800;line-height:1.2;color:#09202A;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${S.esc(o.nama_dagang)}</div>
            <div style="display:flex;justify-content:center;padding:2px 0;">${svgBarcode}</div>
            <div style="display:flex;justify-content:space-between;align-items:center;font-family:monospace;font-size:10px;font-weight:700;">
              <span>${S.esc(codeVal)}</span>
              ${showPrice ? `<span style="color:#0050CA;">${S.rp(o.harga_umum)}/${S.esc(o.satuan_dasar || 'Tab')}</span>` : ''}
            </div>
          </div>`);
        }
      });

      const zone = document.getElementById('onsBarcodePrintPreview');
      if (zone) {
        zone.innerHTML = cards.length
          ? `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:8px;">${cards.join('')}</div>`
          : '<div class="text-center py-6 text-xs text-slate-500">Pilih minimal 1 salinan stiker di atas.</div>';
      }
    };

    global.__setBarcodeCopyCount = (idObat, val) => {
      labelCopies[idObat] = Math.max(0, Math.min(40, Number(val || 0)));
      renderLabelsGrid();
    };
    global.__refreshBarcodeLabelsPreview = renderLabelsGrid;
    global.__printBarcodeStickersNow = () => {
      const zone = document.getElementById('onsBarcodePrintPreview');
      if (!zone) return;
      S.printHtmlZone(`<div style="padding:10px;font-family:Inter,Arial,sans-serif;">${zone.innerHTML}</div>`);
    };

    S.openModal(`<div class="p-6 space-y-4 text-xs">
      <div class="flex items-center justify-between gap-2">
        <div>
          <h3 class="font-bold text-base">Cetak Stiker Barcode Code128 &amp; Label Rak Obat</h3>
          <p class="text-[11px]" style="color:var(--ons-text-soft)">Cocok untuk obat racikan, strip eceran, konsinyasi tanpa barcode pabrik, maupun label rak penyimpanan.</p>
        </div>
        <button type="button" onclick="ONSStore.closeModal()" class="text-xl px-2">&times;</button>
      </div>
      <div class="flex flex-wrap items-center gap-4 p-3 rounded-xl border" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
        <label class="flex items-center gap-1.5 font-semibold cursor-pointer"><input id="lblShowPrice" type="checkbox" checked onchange="window.__refreshBarcodeLabelsPreview()"/> Tampilkan Harga Jual</label>
        <label class="flex items-center gap-1.5 font-semibold cursor-pointer"><input id="lblShowRak" type="checkbox" checked onchange="window.__refreshBarcodeLabelsPreview()"/> Tampilkan Kode Rak</label>
        <button type="button" onclick="window.__printBarcodeStickersNow()" class="ons-btn ons-btn-primary text-xs ml-auto">&#128424; Cetak Stiker Label</button>
      </div>
      <div class="max-h-36 overflow-y-auto border rounded-xl divide-y" style="border-color:var(--ons-border)">
        ${list.map((o) => `
          <div class="flex items-center justify-between gap-2 px-3 py-1.5">
            <div class="min-w-0">
              <div class="font-bold truncate">${S.esc(o.nama_dagang)}</div>
              <div class="text-[10px] font-mono-num" style="color:var(--ons-text-soft)">Kode: ${S.esc(o.kode_kfa || o.id_obat)} &bull; ${S.rp(o.harga_umum)}</div>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
              <span>Jml Stiker:</span>
              <input type="number" min="0" max="40" value="${labelCopies[o.id_obat]}" oninput="window.__setBarcodeCopyCount('${S.esc(o.id_obat)}', this.value)" class="ons-input font-mono-num text-center w-16 py-1 min-h-0 h-7"/>
            </div>
          </div>`).join('')}
      </div>
      <div id="onsBarcodePrintPreview" class="p-3 rounded-xl border max-h-72 overflow-y-auto" style="border-color:var(--ons-border);background:#F8FAFC"></div>
    </div>`, '760px');

    renderLabelsGrid();
  }

  
  // Global event stubs
  if (typeof global.__closeBarcodeScannerModal !== 'function') global.__closeBarcodeScannerModal = () => S.closeModal();
  if (typeof global.__toggleScannerTorch !== 'function') global.__toggleScannerTorch = () => {};
  if (typeof global.__submitManualBarcodeFromModal !== 'function') global.__submitManualBarcodeFromModal = () => {};
  if (typeof global.__refreshBarcodeLabelsPreview !== 'function') global.__refreshBarcodeLabelsPreview = () => {};
  if (typeof global.__printBarcodeStickersNow !== 'function') global.__printBarcodeStickersNow = () => {};
  if (typeof global.__setBarcodeCopyCount !== 'function') global.__setBarcodeCopyCount = () => {};

  
  global.showQuickProductScannerSheet = (obat, batch, code) => {
    if (!obat) return;
    const S = global.ONSStore;
    const stok = S.getTotalStok ? S.getTotalStok(obat.id_obat) : 0;
    const bpom = obat.golongan_bpom || 'OBAT BEBAS';
    const harga = Number(obat.harga_umum || obat.harga_jual_1 || 0);
    const rak = obat.rak_lokasi || 'Belum diatur';

    const html = `
      <div id="onsQuickProductSheet" class="p-4 sm:p-5 space-y-4 text-xs">
        <!-- Header -->
        <div class="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl shrink-0 shadow-2xs">
              💊
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-1.5 flex-wrap">
                <h3 class="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100 truncate">${S.esc(obat.nama_dagang)}</h3>
                ${S.bpomBadge ? S.bpomBadge(bpom) : `<span class="badge-bpom bpom-bebas">${S.esc(bpom)}</span>`}
              </div>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">${S.esc(obat.zat_aktif || 'Zat aktif standar')} &bull; ${S.esc(obat.bentuk_sediaan || 'Sediaan')}</p>
            </div>
          </div>
          <button type="button" onclick="ONSStore.closeModal()" class="ons-btn ons-btn-ghost w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 text-base">&times;</button>
        </div>

        <!-- Metric Badges Grid -->
        <div class="grid grid-cols-3 gap-2 text-center">
          <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
            <div class="text-[10px] text-slate-400 uppercase font-bold">Harga Jual</div>
            <div class="text-sm font-black text-blue-600 dark:text-blue-400 font-mono-num mt-0.5">${S.rp(harga)}</div>
          </div>
          <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
            <div class="text-[10px] text-slate-400 uppercase font-bold">Total Stok</div>
            <div class="text-sm font-black ${stok > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'} font-mono-num mt-0.5">${stok} ${S.esc(obat.satuan_dasar || 'Pcs')}</div>
          </div>
          <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
            <div class="text-[10px] text-slate-400 uppercase font-bold">Lokasi Rak</div>
            <div class="text-xs font-bold text-slate-700 dark:text-slate-300 truncate mt-1">${S.esc(rak)}</div>
          </div>
        </div>

        <!-- Detail Meta List -->
        <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-1.5 text-[11px]">
          <div class="flex items-center justify-between">
            <span class="text-slate-400">Barcode / KFA:</span>
            <span class="font-mono font-bold text-slate-700 dark:text-slate-300">${S.esc(obat.barcode_ean || obat.kode_kfa || code || '-')}</span>
          </div>
          ${batch ? `
          <div class="flex items-center justify-between">
            <span class="text-slate-400">Batch FEFO Aktif:</span>
            <span class="font-mono font-bold text-emerald-600 dark:text-emerald-400">${S.esc(batch.no_batch || '-')} (Exp: ${S.formatTgl ? S.formatTgl(batch.tgl_kadaluarsa) : batch.tgl_kadaluarsa})</span>
          </div>` : ''}
          ${obat.nie_bpom ? `
          <div class="flex items-center justify-between">
            <span class="text-slate-400">NIE BPOM:</span>
            <span class="font-mono text-slate-600 dark:text-slate-400">${S.esc(obat.nie_bpom)}</span>
          </div>` : ''}
        </div>

        <!-- Actions -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onclick="ONSStore.closeModal(); navigateView('pos', 'kasir'); setTimeout(() => { if(window.posAddToCart) window.posAddToCart('${S.esc(obat.id_obat)}'); }, 80);"
            class="ons-btn ons-btn-primary py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-md"
          >
            <span>🛒</span>
            <span>+ Masuk Kasir POS</span>
          </button>
          <button
            type="button"
            onclick="ONSStore.closeModal(); navigateView('obat', 'obat'); setTimeout(() => { if(window.onMasterSearch) window.onMasterSearch('${S.esc(obat.nama_dagang)}'); }, 80);"
            class="ons-btn ons-btn-ghost py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-300 dark:border-slate-700"
          >
            <span>📋</span>
            <span>Lihat di Master Stok</span>
          </button>
        </div>

        <button
          type="button"
          onclick="ONSStore.closeModal(); setTimeout(() => { window.triggerGlobalMobileScanner && window.triggerGlobalMobileScanner(); }, 80);"
          class="w-full text-center text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline pt-1"
        >
          🔄 Pindai Barcode Obat Lain
        </button>
      </div>
    `;

    S.openModal(html, { mode: 'spotlight', maxWidth: '520px' });
  };

  global.ONSBarcode = {
    showQuickProductScannerSheet: global.showQuickProductScannerSheet,
    openScannerModal,
    matchProductByBarcode,
    openPrintBarcodeLabelsModal
  };
})(window);
