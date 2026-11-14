/**
 * ONS FARMA DIGITAL ENTERPRISE v10.0 - Modul W-01 (Auth/Verify), W-02 (Command Center) & W-03 (High-Speed POS)
 */
(function (global) {
  'use strict';
  const S = () => global.ONSStore;
  const API = () => global.ONSApi;

  /**
   * Halaman Verifikasi Publik QR (#kwitansi=KW-...&sig=... atau #doc=KODE20) + Portal E-Resep Dokter (?erx=TOKEN)
   */
  function renderPublicStandaloneIfApplicable(root) {
    const hash = global.location.hash || '';
    const search = new URLSearchParams(global.location.search || '');
    const prof = S().getStoreProfile ? S().getStoreProfile() : {};
    const usahaLogo = prof.logo_usaha_url || './icons/ons-farma-app-icon.png';
    const usahaNama = prof.nama_usaha || 'Apotek ONS Farma';

    if (hash.startsWith('#kwitansi=') || hash.startsWith('#doc=')) {
      const isKw = hash.startsWith('#kwitansi=');
      const params = new URLSearchParams(hash.slice(1));
      const id = isKw ? params.get('kwitansi') : params.get('doc');
      const sig = params.get('sig') || '';
      root.innerHTML = `<div class="min-h-screen flex items-center justify-center p-4" style="background:linear-gradient(135deg,#09202A,#0F172A);">
        <div class="ons-card max-w-lg w-full p-6 text-center space-y-4">
          <img src="${S().esc(usahaLogo)}" alt="${S().esc(usahaNama)}" class="w-14 h-14 mx-auto rounded-xl shadow object-cover bg-white"/>
          <h1 class="text-xl font-bold">Verifikasi Keaslian ${isKw ? 'Kwitansi Pembayaran' : 'Dokumen Resmi Apotek'}</h1>
          <p class="text-xs font-semibold" style="color:var(--ons-text-soft)">${S().esc(usahaNama)} &bull; ${S().esc(prof.no_sia || '')}</p>
          <p class="text-sm" style="color:var(--ons-text-soft)">Memeriksa tanda tangan kriptografis HMAC-SHA256 secara langsung...</p>
          <div id="publicVerifyResult" class="p-4 rounded-xl border text-left text-sm">Memuat...</div>
          <a href="./index.html" class="ons-btn ons-btn-primary w-full">Kembali ke Aplikasi Utama</a>
        </div>
      </div>`;
      API().callApi(isKw ? 'kwitansi.verify' : 'doc.verify', isKw ? { id, sig } : { kode: id })
        .then((res) => {
          const box = document.getElementById('publicVerifyResult');
          if (!box) return;
          if (res.valid) {
            box.style.borderColor = '#10B981';
            box.innerHTML = `<div class="text-emerald-600 font-bold text-base mb-2">&#9989; TERVERIFIKASI ASLI &amp; SAH</div>
              <div class="space-y-1 font-mono-num text-xs">
                <div><b>Nomor:</b> ${S().esc(res.no_kwitansi || res.nomor_surat)}</div>
                ${res.judul ? `<div><b>Judul:</b> ${S().esc(res.judul)}</div>` : ''}
                ${res.total_terbayar ? `<div><b>Nominal:</b> ${S().rp(res.total_terbayar)}</div>` : ''}
                <div><b>Otorisasi:</b> ${S().esc(res.verifikator || res.penanda_tangan)}</div>
                <div><b>Waktu Sah:</b> ${S().esc(res.tgl_verifikasi || res.tgl_terbit)}</div>
              </div>`;
          } else {
            box.style.borderColor = '#DC2626';
            box.innerHTML = `<div class="text-red-600 font-bold text-base mb-1">&#10060; TIDAK VALID / TIDAK DITEMUKAN</div>
              <p>${S().esc(res.alasan || 'Signature tidak cocok.')}</p>`;
          }
        }).catch((e) => {
          const box = document.getElementById('publicVerifyResult');
          if (box) box.innerHTML = `<span class="text-red-600">${S().esc(e.message)}</span>`;
        });
      return true;
    }

    if (search.get('nota')) {
      const notaNo = search.get('nota');
      const totParam = Number(search.get('tot') || 0);
      const tglParam = search.get('tgl') || '';
      const waInit = S().buildWaUrl ? S().buildWaUrl(prof.wa_usaha || '628110000990', `Halo Apoteker ${usahaNama}, saya ingin konsultasi cara minum / aturan pakai obat untuk Nota ${notaNo}.`) : 'https://wa.me/';
      root.innerHTML = `<div class="min-h-screen flex items-center justify-center p-4" style="background:linear-gradient(135deg,#09202A,#0F172A);">
        <div class="ons-card max-w-lg w-full p-6 space-y-4">
          <div class="flex items-center gap-3 pb-3 border-b" style="border-color:var(--ons-border)">
            <img id="pubNotaLogo" src="${S().esc(usahaLogo)}" alt="${S().esc(usahaNama)}" class="w-12 h-12 rounded-xl border object-cover bg-white"/>
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-1.5">
                <h1 id="pubNotaApotek" class="font-extrabold text-base truncate">${S().esc(usahaNama)}</h1>
                <span class="badge-bpom bpom-bebas">RESMI BPOM</span>
              </div>
              <div id="pubNotaApj" class="text-[11px]" style="color:var(--ons-text-soft)">${S().esc(prof.nama_pemilik || 'apt. Anissa Faradifa R. Is Rumi')} &bull; SIA: ${S().esc(prof.no_sia || '-')}</div>
            </div>
          </div>
          <div class="p-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 space-y-1.5 text-xs">
            <div class="flex items-center justify-between gap-2">
              <span class="font-bold text-emerald-700 dark:text-emerald-300 text-sm">&#9989; Nota Pembelian Digital</span>
              <span class="font-mono-num font-bold text-emerald-700 dark:text-emerald-300">${S().esc(notaNo)}</span>
            </div>
            ${totParam > 0 ? `<div class="font-mono-num"><b>Total Transaksi:</b> ${S().rp(totParam)}${tglParam ? (' &bull; ' + S().esc(tglParam)) : ''}</div>` : ''}
            <div id="pubNotaDetailBox" class="pt-1 text-[11px]" style="color:var(--ons-text-soft)">Memeriksa rincian item &amp; info apotek...</div>
          </div>
          <div class="p-3 rounded-xl border text-xs space-y-1" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
            <div class="font-bold">Edukasi Penyimpanan &amp; Keamanan Obat</div>
            <p style="color:var(--ons-text-soft)">Simpan obat di tempat sejuk &amp; kering (suhu &lt;25&deg;C), terlindung dari sinar matahari langsung, dan jauhkan dari jangkauan anak-anak.</p>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <a id="pubNotaWaLink" target="_blank" rel="noopener" href="${S().esc(waInit)}" class="ons-btn ons-btn-emerald text-xs font-bold py-2.5 text-center">Tanya Apoteker (WA Gratis)</a>
            <a href="./index.html?katalog=1" class="ons-btn ons-btn-primary text-xs font-bold py-2.5 text-center">Pesan Lagi / Refill Obat</a>
          </div>
          <a href="./index.html" class="block text-center text-xs underline" style="color:var(--ons-text-soft)">Masuk ke Portal Staf Apotek</a>
        </div>
      </div>`;

      API().callApi('public.catalog', { cabang_id: 'ONS-01' }, { token: '' }).then((res) => {
        if (res && res.apotek) {
          const ap = res.apotek;
          const logoEl = document.getElementById('pubNotaLogo');
          const namEl = document.getElementById('pubNotaApotek');
          const apjEl = document.getElementById('pubNotaApj');
          const waEl = document.getElementById('pubNotaWaLink');
          if (logoEl && ap.logo_usaha_url) logoEl.src = ap.logo_usaha_url;
          if (namEl && ap.nama) namEl.textContent = ap.nama;
          if (apjEl) apjEl.textContent = (ap.nama_pemilik || 'apt. Anissa Faradifa R. Is Rumi') + (ap.no_sia ? ' • SIA: ' + ap.no_sia : '');
          if (waEl && S().buildWaUrl) {
            waEl.href = S().buildWaUrl(ap.wa_admin || prof.wa_usaha || '628110000990', `Halo Apoteker ${ap.nama || usahaNama}, saya pasien Nota ${notaNo} ingin konsultasi aturan pakai obat.`);
          }
        }
      }).catch(() => {});

      const detBox = document.getElementById('pubNotaDetailBox');
      const sess = API().getSession ? API().getSession() : null;
      const hasAuth = Boolean((sess && sess.token) || API().isDemoMode());
      if (hasAuth && detBox) {
        API().callApi('pos.details', { no_invoice: notaNo }).then((d) => {
          const items = (d && d.items) || [];
          const trx = (d && d.penjualan) || {};
          if (!items.length && !trx.no_invoice) {
            detBox.textContent = 'Struk digital terbit resmi. Tunjukkan QR atau Nomor Nota ini saat konsultasi atau penukaran retur di apotek.';
            return;
          }
          detBox.innerHTML = `
            <div class="font-semibold mb-1">Tanggal: ${S().formatTgl(trx.tanggal, true)} &bull; Total: <b>${S().rp(trx.grand_total || totParam)}</b> (${S().esc(trx.metode_bayar || 'LUNAS')})</div>
            ${items.length ? `<ul class="list-disc pl-4 space-y-0.5">${items.map((it) => `<li><b>${S().esc(it.nama_dagang || it.id_obat)}</b> (${it.qty} ${S().esc(it.satuan || '')}) — ${S().rp(it.subtotal_item || (Number(it.qty) * Number(it.harga_jual)))}</li>`).join('')}</ul>` : ''}`;
        }).catch(() => {
          if (detBox) detBox.textContent = 'Struk digital terbit resmi dari Apotek. Hubungi Apoteker via WhatsApp di bawah bila membutuhkan informasi dosis.';
        });
      } else if (detBox) {
        detBox.textContent = 'Struk digital terbit resmi. Hubungi Apoteker kami via WhatsApp gratis di bawah bila membutuhkan informasi cara minum obat.';
      }
      return true;
    }

    if (search.get('erx')) {
      const tok = search.get('erx');
      root.innerHTML = `<div class="min-h-screen flex items-center justify-center p-4" style="background:linear-gradient(135deg,#09202A,#0B1C30);">
        <div class="ons-card max-w-xl w-full p-6 space-y-4">
          <div class="flex items-center gap-3">
            <img src="${S().esc(usahaLogo)}" alt="${S().esc(usahaNama)}" class="w-11 h-11 rounded-lg object-cover bg-white border"/>
            <div>
              <h1 class="text-lg font-bold">Mini-Portal E-Resep Dokter Mitra ${S().esc(usahaNama)}</h1>
              <p class="text-xs font-mono-num" style="color:var(--ons-text-soft)">Token Sesi: ${S().esc(tok)} &bull; APJ: ${S().esc(prof.nama_pemilik || 'apt. Anissa Faradifa R. Is Rumi')}</p>
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><label class="text-xs font-semibold">Nama Dokter Pengirim</label><input id="erxDokter" list="onsDokterDatalist" class="ons-input" placeholder="dr. Andi Pratama, Sp.PD"/></div>
            ${S().renderDokterDatalistHtml ? S().renderDokterDatalistHtml('onsDokterDatalist') : ''}
            <div><label class="text-xs font-semibold">No. SIP Dokter</label><input id="erxSip" class="ons-input" placeholder="446/123/SIP-DOK"/></div>
            <div><label class="text-xs font-semibold">Nama Pasien</label><input id="erxPasien" class="ons-input" placeholder="Nama lengkap pasien"/></div>
            <div><label class="text-xs font-semibold">No. WhatsApp Pasien</label><input id="erxWa" class="ons-input" placeholder="62812xxxx"/></div>
          </div>
          <div><label class="text-xs font-semibold">Riwayat Alergi Obat</label><input id="erxAlergi" class="ons-input" value="Tidak Ada"/></div>
          <div><label class="text-xs font-semibold">Instruksi / Daftar R/ Resep</label><textarea id="erxBody" rows="4" class="ons-textarea" placeholder="R/ Amoxicillin 500mg No. X&#10;S 3 dd 1 tab pc (habiskan)"></textarea></div>
          <button onclick="window.submitDoctorErx('${S().esc(tok)}')" class="ons-btn ons-btn-primary w-full">Kirim E-Resep Langsung ke Apoteker (APJ)</button>
          <a href="./index.html" class="block text-center text-xs underline" style="color:var(--ons-text-soft)">Kembali ke Login Apotek</a>
        </div>
      </div>`;
      return true;
    }

    if (search.get('katalog')) {
      const shortUsaha = String(usahaNama || 'ONS Farma').replace(/^Apotek\s+/i, '');
      const waInitNum = String(prof.wa_usaha || '628110000990').replace(/[^0-9]/g, '');
      const waConsultInit = S().buildWaUrl ? S().buildWaUrl(waInitNum, `Halo Apoteker ${usahaNama}, saya ingin konsultasi keluhan & ketersediaan obat.`) : 'https://wa.me/';
      const waResepInit = S().buildWaUrl ? S().buildWaUrl(waInitNum, `Halo Apoteker ${usahaNama}, saya ingin menebus resep dokter. Berikut saya lampirkan foto resepnya:`) : 'https://wa.me/';

      const safeGetLs = (k, fallback) => {
        try {
          const raw = global.localStorage ? global.localStorage.getItem(k) : null;
          return raw ? JSON.parse(raw) : fallback;
        } catch (e) { return fallback; }
      };
      const safeSetLs = (k, v) => {
        try { if (global.localStorage) global.localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
      };
      const classifyKat = (o) => {
        const raw = String((o && (o.kategori || o.sub_kategori)) || '').trim();
        if (raw) return raw;
        const text = [o && o.nama_dagang, o && o.zat_aktif].join(' ').toLowerCase();
        if (/paracetamol|ibuprofen|asam mefenamat|ketoprofen|diklofenak|nyeri|demam|panadol|sanmol/.test(text)) return 'Demam & Nyeri';
        if (/ambroxol|bromhexine|guaifenesin|pseudoefedrin|batuk|flu|chlorpheniramine|ctm|cetirizine|loratadine|pilek/.test(text)) return 'Batuk, Flu & Alergi';
        if (/omeprazole|lansoprazole|antasida|ranitidine|domperidone|loperamide|maag|lambung|oralit/.test(text)) return 'Pencernaan & Maag';
        if (/vitamin|vit\s|zinc|suplemen|imun|neurobion|enervon|curcuma|calc|zat besi/.test(text)) return 'Vitamin & Imun';
        if (/amlodipine|captopril|metformin|glimepiride|simvastatin|atorvastatin|valsartan|insulin|bisoprolol/.test(text)) return 'Terapi Rutin & Kronis';
        if (/amoxicillin|cefixime|azithromycin|ciprofloxacin|antibiotik|prednison|dexamethasone/.test(text)) return 'Resep & Infeksi';
        return 'Kesehatan Umum';
      };
      const isApotekOpenNow = (hoursStr) => {
        const m = String(hoursStr || '').match(/(\d{1,2})[.:](\d{2})\s*[-–]\s*(\d{1,2})[.:](\d{2})/);
        if (!m) return true;
        const now = new Date();
        const curMin = now.getHours() * 60 + now.getMinutes();
        const openMin = Number(m[1]) * 60 + Number(m[2]);
        const closeMin = Number(m[3]) * 60 + Number(m[4]);
        if (closeMin <= openMin) return curMin >= openMin || curMin <= closeMin;
        return curMin >= openMin && curMin <= closeMin;
      };
      const openNow = isApotekOpenNow(prof.jam_operasional || '07.00 - 22.00');
      const savedCustomer = safeGetLs('ons_pub_customer_v1', { nama: '', wa: '' });
      const savedRecent = safeGetLs('ons_pub_recent_orders_v1', []);

      root.innerHTML = `<div class="min-h-screen pb-20 lg:pb-8 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        <header class="sticky top-0 z-30 border-b backdrop-blur bg-white/95 dark:bg-slate-900/95 px-4 py-3" style="border-color:var(--ons-border)">
          <div class="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-2.5 min-w-0">
              <img id="pubKatLogo" src="${S().esc(usahaLogo)}" alt="${S().esc(usahaNama)}" class="w-10 h-10 rounded-xl object-cover bg-white border shrink-0"/>
              <div class="min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <h1 id="pubKatTitle" class="font-extrabold text-base leading-tight truncate">E-Apotek Publik ${S().esc(shortUsaha)}</h1>
                  <span id="pubKatOpenBadge" class="badge-bpom ${openNow ? 'bpom-bebas' : 'bpom-terbatas'}">${openNow ? 'BUKA &bull; ONLINE OPEN' : 'PRE-ORDER WA'}</span>
                </div>
                <div id="pubKatSub" class="text-[11px] truncate" style="color:var(--ons-text-soft)">${S().esc(prof.alamat_usaha || 'Pesan Obat Asli BPOM')} &bull; SIA: ${S().esc(prof.no_sia || '-')}</div>
              </div>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <div class="relative flex items-center">
                <input id="pubKatSearch" oninput="window.filterPublicCatalog(this.value)" class="ons-input w-44 sm:w-56 text-xs pr-7" placeholder="Cari obat / vitamin / zat aktif..."/>
                <button type="button" onclick="window.clearPublicSearch()" title="Bersihkan Pencarian" aria-label="Bersihkan Pencarian" class="absolute right-1.5 text-xs px-1 opacity-60 hover:opacity-100">&times;</button>
              </div>
              <button type="button" onclick="window.openPublicTrackModal()" class="ons-btn ons-btn-ghost text-xs py-2">Lacak Pesanan${savedRecent.length ? ` <span class="ml-1 px-1.5 py-0.2 rounded-full bg-blue-600 text-white text-[10px] font-bold">${savedRecent.length}</span>` : ''}</button>
              <a id="pubKatConsultWa" target="_blank" rel="noopener" href="${S().esc(waConsultInit)}" class="ons-btn ons-btn-emerald text-xs py-2">Tanya Apoteker (WA)</a>
              <button type="button" id="pubDarkBtn" onclick="window.togglePublicDarkMode()" class="ons-btn ons-btn-ghost text-xs py-2 px-2.5" title="Ganti Tema Terang / Malam">${S().AppState.darkMode ? 'Terang' : 'Malam'}</button>
              <a href="./index.html" class="ons-btn ons-btn-ghost text-xs py-2">Login Staf</a>
            </div>
          </div>
        </header>

        <main class="max-w-6xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div class="lg:col-span-8 space-y-3">
            <!-- Hero Showcase & Layanan Apotek Digital -->
            <div class="ons-card p-4 space-y-3" style="background:linear-gradient(125deg,rgba(0,102,254,0.09),rgba(16,185,129,0.09));">
              <div class="flex flex-wrap items-start justify-between gap-2 text-xs">
                <div class="min-w-0">
                  <div id="pubKatApjLine" class="font-extrabold text-sm sm:text-base">Layanan Farmasi Digital &bull; ${S().esc(prof.nama_pemilik || 'apt. Anissa Faradifa R. Is Rumi')}</div>
                  <div id="pubKatHoursLine" class="text-[11px] mt-0.5" style="color:var(--ons-text-soft)">SIPA: ${S().esc(prof.sipa_pemilik || '-')} &bull; Jam Operasional: ${S().esc(prof.jam_operasional || 'Senin - Minggu 07.00 - 22.00 WITA')}</div>
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                  <span class="badge-bpom bpom-bebas">100% OBAT ASLI BPOM</span>
                  <button type="button" onclick="window.copyPublicStoreUrl()" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2">Salin Link</button>
                </div>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t text-[11px]" style="border-color:var(--ons-border)">
                <div class="p-2 rounded-lg border" style="background:var(--ons-bg-card);border-color:var(--ons-border)">
                  <div class="font-bold text-blue-600">1. Obat Bebas &amp; Vitamin</div>
                  <div style="color:var(--ons-text-soft)">Cek stok real-time &amp; pesan langsung tanpa antre.</div>
                </div>
                <a id="pubKatResepWaCta" target="_blank" rel="noopener" href="${S().esc(waResepInit)}" class="p-2 rounded-lg border block hover:border-emerald-500 transition-colors" style="background:var(--ons-bg-card);border-color:var(--ons-border)">
                  <div class="font-bold text-emerald-600">2. Tebus Resep Dokter &rarr;</div>
                  <div style="color:var(--ons-text-soft)">Kirim foto resep ke WhatsApp Apoteker (APJ).</div>
                </a>
                <button type="button" onclick="window.openPublicTrackModal()" class="p-2 rounded-lg border text-left hover:border-blue-500 transition-colors" style="background:var(--ons-bg-card);border-color:var(--ons-border)">
                  <div class="font-bold text-amber-600">3. Lacak Status Pesanan &rarr;</div>
                  <div style="color:var(--ons-text-soft)">Pantau penyiapan, kurir, hingga nota digital.</div>
                </button>
              </div>
            </div>

            <!-- Filter Golongan BPOM, Kategori Kebutuhan & Urutkan -->
            <div class="ons-card p-3 space-y-2.5">
              <div id="pubKatFilters" class="flex flex-wrap items-center justify-between gap-2">
                <div class="ons-tab-bar">
                  <button type="button" onclick="window.setPublicCatalogFilter('SEMUA')" data-pcat="SEMUA" class="ons-tab-btn active">Semua Produk</button>
                  <button type="button" onclick="window.setPublicCatalogFilter('TERSEDIA')" data-pcat="TERSEDIA" class="ons-tab-btn">Stok Tersedia</button>
                  <button type="button" onclick="window.setPublicCatalogFilter('BEBAS')" data-pcat="BEBAS" class="ons-tab-btn">Obat Bebas (OTC)</button>
                  <button type="button" onclick="window.setPublicCatalogFilter('TERBATAS')" data-pcat="TERBATAS" class="ons-tab-btn">Bebas Terbatas</button>
                  <button type="button" onclick="window.setPublicCatalogFilter('KERAS')" data-pcat="KERAS" class="ons-tab-btn">Obat Resep (Keras)</button>
                </div>
                <div class="flex items-center gap-2">
                  <select id="pubKatSort" onchange="window.setPublicSortMode(this.value)" aria-label="Urutkan Katalog" class="ons-select text-xs py-1">
                    <option value="REKOMENDASI">Urut: Stok Ready Dulu</option>
                    <option value="TERMURAH">Harga Termurah</option>
                    <option value="TERMAHAL">Harga Termahal</option>
                    <option value="STOK_TERBANYAK">Stok Terbanyak</option>
                    <option value="NAMA_AZ">Nama Obat (A–Z)</option>
                  </select>
                  <span id="pubKatCountLabel" class="text-xs font-mono-num shrink-0" style="color:var(--ons-text-soft)">Memuat...</span>
                </div>
              </div>
              <div id="pubKatCategoryBar" class="flex flex-wrap items-center gap-1.5 text-[11px]"></div>
            </div>

            <div id="pubKatGrid" class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">Memuat katalog obat Apotek ONS Farma...</div>
          </div>

          <div class="lg:col-span-4 space-y-3" id="pubCartSection">
            <div class="ons-card p-4 space-y-3 sticky top-20">
              <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-2">
                  <h2 class="font-extrabold text-sm">Keranjang E-Apotek</h2>
                  <span id="pubCartCountBadge" class="badge-bpom bpom-terbatas">0 Item</span>
                </div>
                <button type="button" id="pubCartClearBtn" onclick="window.clearPublicCart()" class="text-[11px] font-semibold text-red-600 hover:underline hidden">Kosongkan</button>
              </div>
              <div id="pubCartResepWarning" class="hidden p-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 text-[11px] text-amber-800 dark:text-amber-300 space-y-0.5"></div>
              <div id="pubCartList" class="space-y-1.5 text-xs max-h-52 overflow-y-auto border-y py-2" style="border-color:var(--ons-border)">Keranjang masih kosong.</div>
              <div class="space-y-1 text-xs">
                <label class="font-semibold block">Metode Penerimaan</label>
                <div class="grid grid-cols-2 gap-1.5">
                  <button type="button" id="pubDelivAmbilBtn" onclick="window.setPublicDeliveryMode('AMBIL')" class="ons-btn ons-btn-primary text-xs py-1.5">Ambil di Apotek (Rp 0)</button>
                  <button type="button" id="pubDelivKurirBtn" onclick="window.setPublicDeliveryMode('KURIR')" class="ons-btn ons-btn-ghost text-xs py-1.5">Kurir Lokal (Rp 10rb)</button>
                </div>
              </div>
              <div class="space-y-1 text-xs border-t pt-2" style="border-color:var(--ons-border)">
                <div class="flex justify-between"><span>Subtotal Obat</span><span id="pubCartSub" class="font-mono-num">Rp 0</span></div>
                <div class="flex justify-between"><span>Biaya Antar (Kurir)</span><span id="pubCartOngkir" class="font-mono-num">Rp 0</span></div>
                <div class="flex justify-between font-extrabold text-sm"><span>Total Estimasi</span><span id="pubCartTotal" class="font-mono-num text-blue-600">Rp 0</span></div>
              </div>
              <div class="space-y-2 text-xs">
                <input id="pubNama" class="ons-input" value="${S().esc(savedCustomer.nama || '')}" placeholder="Nama Penerima / Pasien *"/>
                <input id="pubWa" type="tel" class="ons-input font-mono-num" value="${S().esc(savedCustomer.wa || '')}" placeholder="No. WhatsApp Aktif (08xx) *"/>
                <textarea id="pubAlamat" rows="2" class="ons-textarea" placeholder="Alamat Pengantaran Lengkap / Keterangan Pengambilan">Ambil Langsung di Apotek</textarea>
                <input id="pubCatatan" class="ons-input" placeholder="Catatan / Keluhan / No. Resep untuk Apoteker"/>
                <button type="button" onclick="window.submitPublicStoreOrder()" class="ons-btn ons-btn-emerald w-full py-2.5 font-bold">Kirim Pesanan &amp; Lanjut WA Apoteker</button>
              </div>
              <div id="pubOrderSuccessBox" class="hidden p-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-xs space-y-2"></div>
              <div id="pubRecentOrdersBox" class="pt-2 border-t space-y-1.5 text-xs ${savedRecent.length ? '' : 'hidden'}" style="border-color:var(--ons-border)"></div>
            </div>
          </div>
        </main>

        <!-- Sticky Bottom Cart Bar untuk Layar HP (<lg) -->
        <div id="pubMobileCartBar" class="hidden lg:hidden fixed bottom-3 inset-x-3 z-40">
          <div class="rounded-2xl shadow-xl border px-3.5 py-2.5 flex items-center justify-between gap-2 text-white" style="background:linear-gradient(135deg,#0066FE,#059669);border-color:rgba(255,255,255,0.2)">
            <div class="min-w-0">
              <div id="pubMobileCartMeta" class="text-[11px] font-semibold opacity-90">0 Item di Keranjang</div>
              <div id="pubMobileCartTotal" class="font-mono-num font-extrabold text-sm">Rp 0</div>
            </div>
            <button type="button" onclick="window.scrollToPublicCart()" class="px-3 py-1.5 rounded-xl bg-white text-slate-900 font-extrabold text-xs shrink-0">Lihat Keranjang &rarr;</button>
          </div>
        </div>
      </div>`;

      global._pubCatalogItems = [];
      const restoredCart = safeGetLs('ons_pub_cart_v1', []);
      global._pubCart = Array.isArray(restoredCart) ? restoredCart.filter((x) => x && x.id_obat && Number(x.qty) > 0) : [];
      global._pubKatFilter = 'SEMUA';
      global._pubKatCategory = 'SEMUA';
      global._pubKatSort = 'REKOMENDASI';
      global._pubDeliveryMode = 'AMBIL';
      global._pubApotekMeta = {
        nama: usahaNama,
        alamat: prof.alamat_usaha || '',
        wa_admin: waInitNum || '628110000990',
        nama_pemilik: prof.nama_pemilik || 'apt. Anissa Faradifa R. Is Rumi',
        sipa_pemilik: prof.sipa_pemilik || '',
        no_sia: prof.no_sia || '',
        jam_operasional: prof.jam_operasional || ''
      };

      const renderRecentOrdersBox = () => {
        const box = document.getElementById('pubRecentOrdersBox');
        if (!box) return;
        const recs = safeGetLs('ons_pub_recent_orders_v1', []);
        if (!recs.length) {
          box.classList.add('hidden');
          box.innerHTML = '';
          return;
        }
        box.classList.remove('hidden');
        box.innerHTML = `<div class="flex items-center justify-between"><span class="font-bold text-[11px]" style="color:var(--ons-text-soft)">Riwayat Pesanan Terakhir</span><button type="button" onclick="window.openPublicTrackModal()" class="text-[11px] font-semibold text-blue-600 hover:underline">Cek Nomor Lain</button></div>` +
          recs.slice(0, 3).map((r) => `<div class="flex items-center justify-between gap-2 p-2 rounded-lg border text-[11px]" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
            <div class="min-w-0">
              <div class="font-mono-num font-bold truncate">${S().esc(r.no_order)}</div>
              <div style="color:var(--ons-text-soft)">${S().rp(r.total || 0)}</div>
            </div>
            <button type="button" onclick="window.openPublicTrackModal('${S().esc(r.no_order)}','${S().esc(r.no_wa || '')}')" class="ons-btn ons-btn-ghost text-[10px] py-1 px-2 shrink-0">Lacak</button>
          </div>`).join('');
      };

      const renderCategoryPills = () => {
        const bar = document.getElementById('pubKatCategoryBar');
        if (!bar) return;
        const counts = {};
        global._pubCatalogItems.forEach((o) => {
          const kat = classifyKat(o);
          o.kategori = kat;
          counts[kat] = (counts[kat] || 0) + 1;
        });
        const cats = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
        const curKat = global._pubKatCategory || 'SEMUA';
        bar.innerHTML = `<button type="button" onclick="window.setPublicCategoryPill('SEMUA')" class="px-2.5 py-1 rounded-full border font-semibold transition-colors ${curKat === 'SEMUA' ? 'bg-blue-600 text-white border-blue-600' : ''}" style="${curKat === 'SEMUA' ? '' : 'border-color:var(--ons-border);background:var(--ons-bg-subtle)'}">Semua Kebutuhan</button>` +
          cats.map((k) => `<button type="button" onclick="window.setPublicCategoryPill('${S().esc(k)}')" class="px-2.5 py-1 rounded-full border font-semibold transition-colors ${curKat === k ? 'bg-blue-600 text-white border-blue-600' : ''}" style="${curKat === k ? '' : 'border-color:var(--ons-border);background:var(--ons-bg-subtle)'}">${S().esc(k)} <span class="opacity-70">(${counts[k]})</span></button>`).join('');
      };

      global.togglePublicDarkMode = () => {
        const darkNow = S().toggleDarkMode();
        const btn = document.getElementById('pubDarkBtn');
        if (btn) btn.textContent = darkNow ? 'Terang' : 'Malam';
      };

      global.copyPublicStoreUrl = async () => {
        const url = global.location.origin + global.location.pathname + '?katalog=1';
        try {
          if (global.navigator && global.navigator.clipboard && global.navigator.clipboard.writeText) {
            await global.navigator.clipboard.writeText(url);
          }
          global.toast('Link Etalase Publik disalin! Siap dibagikan ke pasien.', 'ok');
        } catch (e) {
          global.toast('Link etalase: ' + url, 'info');
        }
      };

      global.clearPublicSearch = () => {
        const inp = document.getElementById('pubKatSearch');
        if (inp) { inp.value = ''; inp.focus && inp.focus(); }
        global.renderPublicCatalogGrid('');
      };

      global.scrollToPublicCart = () => {
        const sec = document.getElementById('pubCartSection');
        if (sec && typeof sec.scrollIntoView === 'function') {
          try { sec.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {}
        }
      };

      global.setPublicCatalogFilter = (cat) => {
        global._pubKatFilter = cat || 'SEMUA';
        document.querySelectorAll('#pubKatFilters [data-pcat]').forEach((btn) => {
          btn.classList.toggle('active', btn.getAttribute('data-pcat') === global._pubKatFilter);
        });
        global.renderPublicCatalogGrid((document.getElementById('pubKatSearch') || {}).value || '');
      };

      global.setPublicCategoryPill = (kat) => {
        global._pubKatCategory = kat || 'SEMUA';
        renderCategoryPills();
        global.renderPublicCatalogGrid((document.getElementById('pubKatSearch') || {}).value || '');
      };

      global.setPublicSortMode = (sortVal) => {
        global._pubKatSort = sortVal || 'REKOMENDASI';
        global.renderPublicCatalogGrid((document.getElementById('pubKatSearch') || {}).value || '');
      };

      global.setPublicDeliveryMode = (mode) => {
        global._pubDeliveryMode = mode === 'KURIR' ? 'KURIR' : 'AMBIL';
        const btnAmbil = document.getElementById('pubDelivAmbilBtn');
        const btnKurir = document.getElementById('pubDelivKurirBtn');
        const almEl = document.getElementById('pubAlamat');
        if (btnAmbil) btnAmbil.className = 'ons-btn text-xs py-1.5 ' + (global._pubDeliveryMode === 'AMBIL' ? 'ons-btn-primary' : 'ons-btn-ghost');
        if (btnKurir) btnKurir.className = 'ons-btn text-xs py-1.5 ' + (global._pubDeliveryMode === 'KURIR' ? 'ons-btn-primary' : 'ons-btn-ghost');
        if (almEl) {
          if (global._pubDeliveryMode === 'AMBIL' && !almEl.value.toLowerCase().includes('ambil')) almEl.value = 'Ambil Langsung di Apotek';
          if (global._pubDeliveryMode === 'KURIR' && almEl.value.toLowerCase().includes('ambil')) almEl.value = '';
        }
        global.renderPublicCartUi();
      };

      global.filterPublicCatalog = (q) => global.renderPublicCatalogGrid(q);

      global.renderPublicCatalogGrid = (qRaw) => {
        const q = String(qRaw || '').trim().toLowerCase();
        const cat = global._pubKatFilter || 'SEMUA';
        const katNeed = global._pubKatCategory || 'SEMUA';
        const sortMode = global._pubKatSort || 'REKOMENDASI';

        const items = global._pubCatalogItems.filter((o) => {
          const itemKat = o.kategori || classifyKat(o);
          if (q && !`${o.nama_dagang} ${o.zat_aktif} ${o.bentuk_sediaan || ''} ${itemKat}`.toLowerCase().includes(q)) return false;
          const gol = String(o.golongan_bpom || '').toUpperCase();
          if (cat === 'TERSEDIA' && Number(o.stok_tersedia || 0) <= 0) return false;
          if ((cat === 'BEBAS' || cat === 'TERBATAS' || cat === 'KERAS') && !gol.includes(cat)) return false;
          if (katNeed !== 'SEMUA' && itemKat !== katNeed) return false;
          return true;
        }).slice();

        items.sort((a, b) => {
          if (sortMode === 'TERMURAH') return Number(a.harga_umum || 0) - Number(b.harga_umum || 0);
          if (sortMode === 'TERMAHAL') return Number(b.harga_umum || 0) - Number(a.harga_umum || 0);
          if (sortMode === 'STOK_TERBANYAK') return Number(b.stok_tersedia || 0) - Number(a.stok_tersedia || 0);
          if (sortMode === 'NAMA_AZ') return String(a.nama_dagang || '').localeCompare(String(b.nama_dagang || ''));
          const avA = Number(a.stok_tersedia || 0) > 0 ? 1 : 0;
          const avB = Number(b.stok_tersedia || 0) > 0 ? 1 : 0;
          if (avA !== avB) return avB - avA;
          return String(a.nama_dagang || '').localeCompare(String(b.nama_dagang || ''));
        });

        const cntEl = document.getElementById('pubKatCountLabel');
        if (cntEl) cntEl.textContent = items.length + ' produk ditemukan';
        const g = document.getElementById('pubKatGrid');
        if (!g) return;
        const ap = global._pubApotekMeta || {};
        const cartMap = {};
        global._pubCart.forEach((c, idx) => { cartMap[c.id_obat] = { qty: c.qty, idx }; });

        g.innerHTML = items.length ? items.map((o) => {
          const askWa = S().buildWaUrl ? S().buildWaUrl(ap.wa_admin || '628110000990', `Halo Apoteker ${ap.nama || usahaNama}, saya mau tanya ketersediaan / dosis obat: ${o.nama_dagang} (${o.zat_aktif}).`) : 'https://wa.me/';
          const stok = Number(o.stok_tersedia || 0);
          const gol = String(o.golongan_bpom || 'BEBAS').toUpperCase();
          const butuhResep = Boolean(o.butuh_resep || ['KERAS', 'PREKURSOR', 'OOT', 'PSIKOTROPIKA', 'NARKOTIKA'].includes(gol));
          const katLbl = o.kategori || classifyKat(o);
          const inCart = cartMap[o.id_obat];
          const stokCls = stok > 10 ? 'text-emerald-600' : (stok > 0 ? 'text-amber-600' : 'text-red-600');
          const stokTxt = stok > 10 ? `Stok Tersedia (${stok})` : (stok > 0 ? `Sisa Terbatas (${stok})` : 'Stok Kosong — Tanya Restok');
          return `
          <div class="ons-product-card flex flex-col justify-between gap-2.5">
            <div>
              <div class="flex justify-between gap-2 items-start">
                <button type="button" onclick="window.openPublicProductModal('${S().esc(o.id_obat)}')" class="font-bold text-sm leading-snug text-left hover:text-blue-600 transition-colors">${S().esc(o.nama_dagang)}</button>
                ${S().bpomBadge(o.golongan_bpom)}
              </div>
              <div class="text-[11px] mt-1" style="color:var(--ons-text-soft)">${S().esc(o.zat_aktif)} &bull; ${S().esc(o.bentuk_sediaan)} ${o.kekuatan ? ('(' + S().esc(o.kekuatan) + ')') : ''}</div>
              <div class="flex flex-wrap items-center gap-1.5 mt-1.5">
                <span class="px-2 py-0.5 rounded-md text-[10px] font-semibold" style="background:var(--ons-bg-subtle);color:var(--ons-text-soft)">${S().esc(katLbl)}</span>
                ${butuhResep ? '<span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300">Wajib Resep Dokter (APJ)</span>' : ''}
              </div>
            </div>
            <div class="flex items-center justify-between pt-2 border-t gap-2" style="border-color:var(--ons-border)">
              <div>
                <div class="font-mono-num font-extrabold text-sm text-blue-600">${S().rp(o.harga_umum)} <span class="text-[10px] font-normal">/ ${S().esc(o.satuan_dasar)}</span></div>
                <div class="text-[10px] font-semibold ${stokCls}">${stokTxt}</div>
              </div>
              <div class="flex items-center gap-1 shrink-0">
                <button type="button" onclick="window.openPublicProductModal('${S().esc(o.id_obat)}')" class="ons-btn ons-btn-ghost text-[11px] py-1.5 px-2" title="Lihat Detail Obat &amp; Aturan Aman">Detail</button>
                ${stok <= 0
                  ? `<a target="_blank" rel="noopener" href="${S().esc(askWa)}" class="ons-btn ons-btn-emerald text-[11px] py-1.5 px-2.5">Tanya Restok</a>`
                  : (inCart
                    ? `<div class="flex items-center gap-1 rounded-lg border px-1 py-0.5" style="border-color:var(--ons-border);background:var(--ons-bg-subtle)">
                        <button type="button" onclick="window.stepPublicCartQty(${inCart.idx}, -1)" class="ons-btn ons-btn-ghost text-xs px-2 py-0.5 min-h-0 h-7">-</button>
                        <span class="font-mono-num font-bold text-xs px-1">${inCart.qty}</span>
                        <button type="button" onclick="window.stepPublicCartQty(${inCart.idx}, 1)" class="ons-btn ons-btn-primary text-xs px-2 py-0.5 min-h-0 h-7">+</button>
                      </div>`
                    : `<button type="button" onclick="window.addToPublicCart('${S().esc(o.id_obat)}')" class="ons-btn ons-btn-primary text-xs py-1.5 px-3">+ Keranjang</button>`)}
              </div>
            </div>
          </div>`;
        }).join('') : `<div class="col-span-2 ons-card p-8 text-center space-y-2">
          <div class="font-bold text-sm">Produk tidak ditemukan pada filter ini</div>
          <p class="text-xs" style="color:var(--ons-text-soft)">Coba kata kunci lain atau tanyakan ketersediaan langsung ke Apoteker kami via WhatsApp.</p>
          <div class="flex justify-center gap-2 pt-1">
            <button type="button" onclick="window.setPublicCatalogFilter('SEMUA');window.setPublicCategoryPill('SEMUA');window.clearPublicSearch();" class="ons-btn ons-btn-ghost text-xs">Reset Filter</button>
            <a target="_blank" rel="noopener" href="${S().esc(waConsultInit)}" class="ons-btn ons-btn-emerald text-xs">Tanya Apoteker (WA)</a>
          </div>
        </div>`;
      };

      global.openPublicProductModal = (idObat) => {
        const ob = global._pubCatalogItems.find((x) => x.id_obat === idObat);
        if (!ob) return;
        const ap = global._pubApotekMeta || {};
        const askWa = S().buildWaUrl ? S().buildWaUrl(ap.wa_admin || '628110000990', `Halo Apoteker ${ap.nama || usahaNama}, saya ingin tanya dosis/aturan pakai obat: ${ob.nama_dagang} (${ob.zat_aktif}).`) : 'https://wa.me/';
        const gol = String(ob.golongan_bpom || 'BEBAS').toUpperCase();
        const butuhResep = Boolean(ob.butuh_resep || ['KERAS', 'PREKURSOR', 'OOT', 'PSIKOTROPIKA', 'NARKOTIKA'].includes(gol));
        const bpomExplain = gol.includes('BEBAS') && !gol.includes('TERBATAS')
          ? 'Lingkaran Hijau (Obat Bebas) — Dapat dibeli bebas sesuai aturan pakai pada kemasan.'
          : (gol.includes('TERBATAS')
            ? 'Lingkaran Biru (Bebas Terbatas) — Perhatikan tanda peringatan pada kemasan dan dosis maksimal.'
            : 'Lingkaran Merah (Obat Keras/Resep) — Penyerahan WAJIB disertai resep dokter dan verifikasi Apoteker (APJ).');
        const stok = Number(ob.stok_tersedia || 0);
        const existing = global._pubCart.find((c) => c.id_obat === ob.id_obat);
        S().openModal(`
          <div class="p-5 sm:p-6 space-y-3 text-xs">
            <div class="flex items-start justify-between gap-2 pb-2 border-b" style="border-color:var(--ons-border)">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <h3 class="font-extrabold text-base">${S().esc(ob.nama_dagang)}</h3>
                  ${S().bpomBadge(ob.golongan_bpom)}
                </div>
                <div class="mt-0.5" style="color:var(--ons-text-soft)">${S().esc(ob.zat_aktif || '-')} &bull; ${S().esc(ob.bentuk_sediaan || 'Unit')} ${ob.kekuatan ? ('(' + S().esc(ob.kekuatan) + ')') : ''}</div>
              </div>
              <button type="button" onclick="window.ONSStore.closeModal()" aria-label="Tutup Detail Obat" class="text-xl leading-none px-1.5 opacity-70 hover:opacity-100">&times;</button>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div class="p-2.5 rounded-xl border" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
                <div style="color:var(--ons-text-soft)">Harga Publik</div>
                <div class="font-mono-num font-extrabold text-base text-blue-600">${S().rp(ob.harga_umum)} <span class="text-[11px] font-normal">/ ${S().esc(ob.satuan_dasar)}</span></div>
                ${ob.harga_strip > 0 ? `<div class="text-[10px]" style="color:var(--ons-text-soft)">Per Strip${ob.isi_per_strip ? (' (' + ob.isi_per_strip + ' ' + S().esc(ob.satuan_dasar) + ')') : ''}: ${S().rp(ob.harga_strip)}</div>` : ''}
              </div>
              <div class="p-2.5 rounded-xl border" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
                <div style="color:var(--ons-text-soft)">Ketersediaan Stok</div>
                <div class="font-mono-num font-extrabold text-base ${stok > 0 ? 'text-emerald-600' : 'text-red-600'}">${stok > 0 ? (stok + ' ' + S().esc(ob.satuan_dasar)) : 'Kosong'}</div>
                <div class="text-[10px]" style="color:var(--ons-text-soft)">Kategori: ${S().esc(ob.kategori || classifyKat(ob))}</div>
              </div>
            </div>
            <div class="p-3 rounded-xl border space-y-1 ${butuhResep ? 'border-amber-500/40 bg-amber-500/10' : ''}" style="${butuhResep ? '' : 'background:var(--ons-bg-subtle);border-color:var(--ons-border)'}">
              <div class="font-bold">Klasifikasi Keamanan BPOM</div>
              <p>${S().esc(bpomExplain)}</p>
            </div>
            <div class="p-3 rounded-xl border space-y-1" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
              <div class="font-bold">Cara Penyimpanan &amp; Keamanan</div>
              <p style="color:var(--ons-text-soft)">Simpan di tempat sejuk &amp; kering (&lt;25&deg;C), jauh dari sinar matahari langsung dan jangkauan anak-anak. Jaminan 100% asli berizin BPOM.</p>
            </div>
            <div class="flex flex-wrap items-center gap-2 pt-1">
              ${stok > 0
                ? `<button type="button" onclick="window.addToPublicCart('${S().esc(ob.id_obat)}');window.ONSStore.closeModal();" class="ons-btn ons-btn-primary flex-1 py-2.5 font-bold">${existing ? ('Tambah Lagi (' + existing.qty + ' di keranjang)') : '+ Tambah ke Keranjang'}</button>`
                : `<a target="_blank" rel="noopener" href="${S().esc(askWa)}" class="ons-btn ons-btn-emerald flex-1 py-2.5 font-bold text-center">Tanya Jadwal Restok via WA</a>`}
              <a target="_blank" rel="noopener" href="${S().esc(askWa)}" class="ons-btn ons-btn-ghost py-2.5 font-semibold">Tanya Apoteker</a>
            </div>
          </div>`, { mode: 'spotlight', maxWidth: '540px' });
      };

      global.addToPublicCart = (idObat) => {
        const ob = global._pubCatalogItems.find((x) => x.id_obat === idObat);
        if (!ob) return;
        const maxStok = Number(ob.stok_tersedia || 0);
        if (maxStok <= 0) {
          global.toast('Stok ' + ob.nama_dagang + ' sedang habis. Hubungi Apoteker via WA untuk cek restok.', 'warn');
          return;
        }
        const ex = global._pubCart.find((c) => c.id_obat === idObat);
        if (ex) {
          if (ex.qty >= maxStok) {
            global.toast(`Maksimal stok tersedia saat ini: ${maxStok} ${ob.satuan_dasar}.`, 'warn');
            return;
          }
          ex.qty++;
        } else {
          global._pubCart.push({
            id_obat: ob.id_obat,
            nama: ob.nama_dagang,
            satuan: ob.satuan_dasar,
            golongan_bpom: String(ob.golongan_bpom || 'BEBAS').toUpperCase(),
            butuh_resep: Boolean(ob.butuh_resep),
            harga: Number(ob.harga_umum || 0),
            qty: 1
          });
        }
        global.renderPublicCartUi();
      };

      global.stepPublicCartQty = (idx, delta) => {
        const c = global._pubCart[idx];
        if (!c) return;
        const ob = global._pubCatalogItems.find((x) => x.id_obat === c.id_obat);
        const maxStok = ob ? Number(ob.stok_tersedia || 0) : 9999;
        const nextQty = c.qty + delta;
        if (delta > 0 && ob && nextQty > maxStok) {
          global.toast(`Stok tersedia untuk ${c.nama} maksimal ${maxStok} ${c.satuan}.`, 'warn');
          return;
        }
        c.qty = nextQty;
        if (c.qty <= 0) global._pubCart.splice(idx, 1);
        global.renderPublicCartUi();
      };

      global.clearPublicCart = () => {
        global._pubCart = [];
        global.renderPublicCartUi();
      };

      global.renderPublicCartUi = () => {
        safeSetLs('ons_pub_cart_v1', global._pubCart);
        const list = document.getElementById('pubCartList');
        const subEl = document.getElementById('pubCartSub');
        const ongEl = document.getElementById('pubCartOngkir');
        const totEl = document.getElementById('pubCartTotal');
        const cntEl = document.getElementById('pubCartCountBadge');
        const clearBtn = document.getElementById('pubCartClearBtn');
        const rxWarn = document.getElementById('pubCartResepWarning');
        const mobBar = document.getElementById('pubMobileCartBar');
        const mobMeta = document.getElementById('pubMobileCartMeta');
        const mobTot = document.getElementById('pubMobileCartTotal');

        const subTotal = global._pubCart.reduce((s, c) => s + Number(c.harga || 0) * Number(c.qty || 0), 0);
        const ongkir = global._pubCart.length && global._pubDeliveryMode === 'KURIR' ? 10000 : 0;
        const estTotal = subTotal + ongkir;
        const itemCount = global._pubCart.reduce((s, c) => s + Number(c.qty || 0), 0);

        if (cntEl) cntEl.textContent = itemCount + ' Item';
        if (clearBtn) clearBtn.classList.toggle('hidden', global._pubCart.length === 0);

        const rxItems = global._pubCart.filter((c) => c.butuh_resep || ['KERAS', 'PREKURSOR', 'OOT', 'PSIKOTROPIKA', 'NARKOTIKA'].includes(String(c.golongan_bpom || '').toUpperCase()));
        if (rxWarn) {
          if (rxItems.length) {
            rxWarn.classList.remove('hidden');
            rxWarn.innerHTML = `<div class="font-bold">&#9888; Keranjang Memuat Obat Resep (${rxItems.length} item)</div>
              <div>Siapkan foto resep dokter (${rxItems.map((x) => S().esc(x.nama)).join(', ')}) untuk dikirim saat konfirmasi WhatsApp ke Apoteker (APJ).</div>`;
          } else {
            rxWarn.classList.add('hidden');
            rxWarn.innerHTML = '';
          }
        }

        if (list) {
          list.innerHTML = global._pubCart.length ? global._pubCart.map((c, idx) => `
            <div class="flex justify-between items-center gap-1.5 p-1.5 rounded bg-slate-500/5">
              <div class="min-w-0 flex-1">
                <div class="truncate font-semibold">${S().esc(c.nama)}</div>
                <div class="text-[10px] font-mono-num" style="color:var(--ons-text-soft)">${S().rp(c.harga)} &times; ${c.qty} = ${S().rp(c.harga * c.qty)}</div>
              </div>
              <div class="flex items-center gap-1 shrink-0">
                <button type="button" onclick="window.stepPublicCartQty(${idx}, -1)" class="ons-btn ons-btn-ghost text-xs px-2 py-0.5 min-h-0 h-7">-</button>
                <span class="font-mono-num font-bold w-5 text-center">${c.qty}</span>
                <button type="button" onclick="window.stepPublicCartQty(${idx}, 1)" class="ons-btn ons-btn-ghost text-xs px-2 py-0.5 min-h-0 h-7">+</button>
                <button type="button" onclick="window.stepPublicCartQty(${idx}, -9999)" title="Hapus Item" class="text-xs px-1.5 text-red-500 font-bold">&times;</button>
              </div>
            </div>`).join('') : 'Keranjang masih kosong. Klik "+ Keranjang" pada produk obat.';
        }
        if (subEl) subEl.textContent = S().rp(subTotal);
        if (ongEl) ongEl.textContent = S().rp(ongkir);
        if (totEl) totEl.textContent = S().rp(estTotal);

        if (mobBar) mobBar.classList.toggle('hidden', global._pubCart.length === 0);
        if (mobMeta) mobMeta.textContent = `${itemCount} Item di Keranjang (${global._pubDeliveryMode === 'KURIR' ? 'Kurir' : 'Ambil'})`;
        if (mobTot) mobTot.textContent = S().rp(estTotal);

        // Sinkronkan stepper inline di kartu grid bila sudah dirender
        if (global._pubCatalogItems && global._pubCatalogItems.length && document.getElementById('pubKatGrid')) {
          global.renderPublicCatalogGrid((document.getElementById('pubKatSearch') || {}).value || '');
        }
      };

      global.openPublicTrackModal = (prefillOrder, prefillWa) => {
        const recs = safeGetLs('ons_pub_recent_orders_v1', []);
        const cust = safeGetLs('ons_pub_customer_v1', { wa: '' });
        const defOrd = prefillOrder || (recs[0] && recs[0].no_order) || '';
        const defWa = prefillWa || (recs[0] && recs[0].no_wa) || cust.wa || '';
        S().openModal(`
          <div class="p-5 sm:p-6 space-y-3 text-xs">
            <div class="flex items-center justify-between gap-2 pb-2 border-b" style="border-color:var(--ons-border)">
              <h3 class="font-extrabold text-base">Lacak Status Pesanan E-Apotek</h3>
              <button type="button" onclick="window.ONSStore.closeModal()" aria-label="Tutup Lacak Pesanan" class="text-xl leading-none px-1.5 opacity-70 hover:opacity-100">&times;</button>
            </div>
            <p style="color:var(--ons-text-soft)">Masukkan <b>Nomor Order</b> dan <b>Nomor WhatsApp</b> (atau 4 digit terakhir) untuk melihat progres penyiapan obat oleh Apoteker.</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input id="pubTrkNoInp" class="ons-input font-mono-num uppercase" value="${S().esc(defOrd)}" placeholder="Contoh: WEB-20261112-A1B2"/>
              <input id="pubTrkWaInp" type="tel" class="ons-input font-mono-num" value="${S().esc(defWa)}" placeholder="No. WA / 4 digit akhir"/>
            </div>
            <button type="button" onclick="window.runPublicTrackOrder()" class="ons-btn ons-btn-primary w-full py-2 font-bold">Cek Status Pesanan</button>
            <div id="pubTrackResultBox" class="space-y-2"></div>
          </div>`, { mode: 'spotlight', maxWidth: '540px' });
        if (defOrd && defWa) global.runPublicTrackOrder();
      };

      global.runPublicTrackOrder = async () => {
        const noOrd = (document.getElementById('pubTrkNoInp')?.value || '').trim();
        const wa = (document.getElementById('pubTrkWaInp')?.value || '').trim();
        const box = document.getElementById('pubTrackResultBox');
        if (!box) return;
        if (!noOrd || wa.replace(/[^0-9]/g, '').length < 4) {
          box.innerHTML = `<div class="p-3 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300">Mohon isi Nomor Order dan minimal 4 digit akhir No. WhatsApp pemesan.</div>`;
          return;
        }
        box.innerHTML = `<div class="p-3 rounded-xl border text-center" style="border-color:var(--ons-border)">Memeriksa status pesanan <b>${S().esc(noOrd)}</b>...</div>`;
        const ap = global._pubApotekMeta || {};
        try {
          const res = await API().callApi('public.trackOrder', { no_order: noOrd, no_wa: wa, cabang_id: ap.cabang || 'ONS-01' }, { token: '' });
          const o = res && res.order;
          if (!o) throw new Error('Data pesanan tidak tersedia.');
          const stOrder = String(o.status_order || 'BARU').toUpperCase();
          const steps = ['BARU', 'DIPROSES', stOrder === 'DIKIRIM' ? 'DIKIRIM' : 'SIAP_AMBIL', 'SELESAI'];
          const curIdx = stOrder === 'DIBATALKAN' ? -1 : Math.max(0, steps.indexOf(stOrder === 'DIKIRIM' || stOrder === 'SIAP_AMBIL' ? steps[2] : stOrder));
          const labelMap = { BARU: 'Diterima', DIPROSES: 'Disiapkan APJ', SIAP_AMBIL: 'Siap Diambil', DIKIRIM: 'Dalam Pengantaran', SELESAI: 'Selesai', DIBATALKAN: 'Dibatalkan' };
          const askStatusWa = S().buildWaUrl ? S().buildWaUrl(ap.wa_admin || '628110000990', `Halo Apoteker ${ap.nama || usahaNama}, saya ingin menanyakan progres pesanan *${o.no_order}*.`) : 'https://wa.me/';
          box.innerHTML = `
            <div class="p-3.5 rounded-xl border space-y-3" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
              <div class="flex items-center justify-between gap-2">
                <div>
                  <div class="font-mono-num font-extrabold text-sm">${S().esc(o.no_order)}</div>
                  <div class="text-[11px]" style="color:var(--ons-text-soft)">Pemesan: ${S().esc(o.nama_masked || '-')} &bull; ${S().esc(o.kurir || '-')}</div>
                </div>
                <span class="badge-bpom ${stOrder === 'DIBATALKAN' ? 'bpom-keras' : (stOrder === 'SELESAI' ? 'bpom-bebas' : 'bpom-terbatas')}">${S().esc(labelMap[stOrder] || stOrder)}</span>
              </div>
              ${stOrder === 'DIBATALKAN' ? `<div class="p-2 rounded-lg bg-red-500/10 text-red-600 font-semibold">Pesanan ini berstatus dibatalkan. Silakan hubungi apoteker via WA untuk informasi lanjut.</div>` : `
              <div class="grid grid-cols-4 gap-1 text-center text-[10px]">
                ${steps.map((sp, i) => `<div class="p-1.5 rounded-lg border ${i <= curIdx ? 'border-emerald-500 bg-emerald-500/15 font-bold text-emerald-700 dark:text-emerald-300' : 'opacity-50'}" style="${i <= curIdx ? '' : 'border-color:var(--ons-border)'}">${S().esc(labelMap[sp] || sp)}</div>`).join('')}
              </div>`}
              ${Array.isArray(o.items_preview) && o.items_preview.length ? `<div class="space-y-0.5 text-[11px] border-t pt-2" style="border-color:var(--ons-border)">
                <div class="font-bold">Ringkasan Item (${o.item_count} qty):</div>
                ${o.items_preview.map((it) => `<div>&bull; ${S().esc(it.nama)} (${it.qty} ${S().esc(it.satuan || '')})</div>`).join('')}
              </div>` : ''}
              <div class="flex items-center justify-between pt-2 border-t font-bold" style="border-color:var(--ons-border)">
                <span>Total Estimasi</span>
                <span class="font-mono-num text-blue-600">${S().rp(o.total_estimasi || 0)}</span>
              </div>
              <div class="flex flex-wrap gap-2">
                ${o.no_invoice_pos ? `<a href="./index.html?nota=${encodeURIComponent(o.no_invoice_pos)}&tot=${Number(o.total_estimasi || 0)}" class="ons-btn ons-btn-primary flex-1 text-center py-2 font-bold">Lihat Nota Digital</a>` : ''}
                <a target="_blank" rel="noopener" href="${S().esc(askStatusWa)}" class="ons-btn ons-btn-emerald flex-1 text-center py-2 font-bold">Tanya Status via WA</a>
              </div>
            </div>`;
        } catch (err) {
          const askStatusWa = S().buildWaUrl ? S().buildWaUrl(ap.wa_admin || '628110000990', `Halo Apoteker ${ap.nama || usahaNama}, saya ingin cek status pesanan *${noOrd}*.`) : 'https://wa.me/';
          box.innerHTML = `<div class="p-3 rounded-xl border border-red-500/40 bg-red-500/10 space-y-2">
            <div class="font-semibold text-red-600">${S().esc(err.message)}</div>
            <a target="_blank" rel="noopener" href="${S().esc(askStatusWa)}" class="ons-btn ons-btn-emerald w-full text-center py-2 font-bold">Cek Manual ke WhatsApp Apoteker</a>
          </div>`;
        }
      };

      global.submitPublicStoreOrder = async () => {
        const nama = (document.getElementById('pubNama').value || '').trim();
        const wa = (document.getElementById('pubWa').value || '').trim();
        const alamatRaw = (document.getElementById('pubAlamat').value || '').trim();
        const catatanRaw = (document.getElementById('pubCatatan').value || '').trim();
        if (!nama || !wa) { global.toast('Nama & nomor WhatsApp wajib diisi.', 'warn'); return; }
        if (!global._pubCart.length) { global.toast('Pilih minimal 1 obat ke keranjang terlebih dahulu.', 'warn'); return; }
        const cartSnapshot = global._pubCart.slice();
        const totalEst = cartSnapshot.reduce((s, c) => s + Number(c.harga || 0) * Number(c.qty || 0), 0);
        const ongkir = global._pubDeliveryMode === 'KURIR' && !alamatRaw.toLowerCase().includes('ambil') ? 10000 : 0;
        const ap = global._pubApotekMeta || {};
        try {
          const res = await API().callApi('public.submitOrder', {
            cabang_id: ap.cabang || 'ONS-01',
            nama_pelanggan: nama,
            no_wa: wa,
            alamat: alamatRaw || (global._pubDeliveryMode === 'AMBIL' ? 'Ambil di Apotek' : '-'),
            catatan: catatanRaw,
            total_estimasi: totalEst,
            ongkir: ongkir,
            items_json: JSON.stringify(cartSnapshot)
          }, { isWrite: true, token: '' });
          safeSetLs('ons_pub_customer_v1', { nama, wa });
          const recs = safeGetLs('ons_pub_recent_orders_v1', []).filter((r) => r.no_order !== res.no_order);
          recs.unshift({ no_order: res.no_order, no_wa: wa, tanggal: new Date().toISOString(), total: (res.item && res.item.total_estimasi) || (totalEst + ongkir) });
          safeSetLs('ons_pub_recent_orders_v1', recs.slice(0, 5));

          const hasRx = Boolean(res.has_resep || cartSnapshot.some((c) => c.butuh_resep || ['KERAS', 'PREKURSOR', 'OOT', 'PSIKOTROPIKA', 'NARKOTIKA'].includes(String(c.golongan_bpom || '').toUpperCase())));
          const waSummary = [
            `*PESANAN E-APOTEK ${(ap.nama || usahaNama).toUpperCase()}*`,
            `No. Order : *${res.no_order}*`,
            `Nama      : ${nama}`,
            `No. WA    : ${wa}`,
            `Metode    : ${global._pubDeliveryMode === 'KURIR' ? 'Kurir Lokal' : 'Ambil di Apotek'}`,
            `Alamat    : ${alamatRaw || '-'}`,
            '--------------------------------',
            ...cartSnapshot.map((it, i) => `${i + 1}. ${it.nama} (${it.qty} ${it.satuan}) = ${S().rp(it.harga * it.qty)}`),
            '--------------------------------',
            `Subtotal Obat : ${S().rp(totalEst)}`,
            `Ongkir        : ${S().rp(ongkir)}`,
            `*Estimasi Total : ${S().rp(totalEst + ongkir)}*`,
            hasRx ? '_*Pesanan memuat Obat Keras — mohon verifikasi foto resep dokter bersama Apoteker._' : '',
            catatanRaw ? `Catatan: ${catatanRaw}` : ''
          ].filter(Boolean).join('\n');
          const waOrderUrl = S().buildWaUrl ? S().buildWaUrl(ap.wa_admin || prof.wa_usaha || '628110000990', waSummary) : 'https://wa.me/';
          const box = document.getElementById('pubOrderSuccessBox');
          if (box) {
            box.classList.remove('hidden');
            box.innerHTML = `<div class="font-bold text-emerald-700 dark:text-emerald-300">&#9989; Order ${S().esc(res.no_order)} Diterima!</div>
              <div>Tim Farmasi ${S().esc(ap.nama || usahaNama)} siap memproses. Estimasi Total: <b>${S().rp(totalEst + ongkir)}</b></div>
              ${hasRx ? '<div class="text-[11px] text-amber-700 dark:text-amber-300 font-semibold">Mohon lampirkan foto resep dokter di chat WhatsApp untuk verifikasi APJ.</div>' : ''}
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                <a target="_blank" rel="noopener" href="${S().esc(waOrderUrl)}" class="ons-btn ons-btn-emerald py-2 font-bold text-center">Kirim Rincian ke WhatsApp Apotek (Gratis)</a>
                <button type="button" onclick="window.openPublicTrackModal('${S().esc(res.no_order)}','${S().esc(wa)}')" class="ons-btn ons-btn-ghost py-2 font-bold">Lacak Status Pesanan</button>
              </div>`;
          }
          global._pubCart = [];
          global.renderPublicCartUi();
          renderRecentOrdersBox();
        } catch (e) { global.toast(e.message, 'err'); }
      };

      renderRecentOrdersBox();
      global.renderPublicCartUi();

      API().callApi('public.catalog', { cabang_id: 'ONS-01' }, { token: '' }).then((res) => {
        global._pubCatalogItems = (res && res.items) || [];
        if (res && res.apotek) {
          const ap = res.apotek;
          global._pubApotekMeta = Object.assign({}, global._pubApotekMeta, ap);
          const logoEl = document.getElementById('pubKatLogo');
          const titleEl = document.getElementById('pubKatTitle');
          const subEl = document.getElementById('pubKatSub');
          const apjEl = document.getElementById('pubKatApjLine');
          const hrsEl = document.getElementById('pubKatHoursLine');
          const openEl = document.getElementById('pubKatOpenBadge');
          const waTopEl = document.getElementById('pubKatConsultWa');
          const waRxEl = document.getElementById('pubKatResepWaCta');
          if (logoEl && ap.logo_usaha_url) logoEl.src = ap.logo_usaha_url;
          if (titleEl && ap.nama) titleEl.textContent = 'E-Apotek Publik ' + String(ap.nama).replace(/^Apotek\s+/i, '');
          if (subEl && ap.alamat) subEl.textContent = ap.alamat + (ap.no_sia ? ' • SIA: ' + ap.no_sia : '');
          if (apjEl && ap.nama_pemilik) apjEl.textContent = 'Layanan Farmasi Digital • ' + ap.nama_pemilik;
          if (hrsEl) hrsEl.textContent = (ap.sipa_pemilik ? ('SIPA: ' + ap.sipa_pemilik + ' • ') : '') + (ap.jam_operasional || 'Buka Setiap Hari');
          if (openEl) {
            const liveOpen = isApotekOpenNow(ap.jam_operasional || '07.00 - 22.00');
            openEl.className = 'badge-bpom ' + (liveOpen ? 'bpom-bebas' : 'bpom-terbatas');
            openEl.innerHTML = liveOpen ? 'BUKA &bull; ONLINE OPEN' : 'PRE-ORDER WA';
          }
          if (waTopEl && S().buildWaUrl) {
            waTopEl.href = S().buildWaUrl(ap.wa_admin || '628110000990', `Halo Apoteker ${ap.nama || usahaNama}, saya ingin konsultasi keluhan & ketersediaan obat.`);
          }
          if (waRxEl && S().buildWaUrl) {
            waRxEl.href = S().buildWaUrl(ap.wa_admin || '628110000990', `Halo Apoteker ${ap.nama || usahaNama}, saya ingin menebus resep dokter. Berikut saya lampirkan foto resepnya:`);
          }
        }
        renderCategoryPills();
        global.renderPublicCatalogGrid((document.getElementById('pubKatSearch') || {}).value || '');
      }).catch((err) => {
        const g = document.getElementById('pubKatGrid');
        if (g) g.innerHTML = `<div class="ons-card p-4 text-red-600">${S().esc(err.message)}</div>`;
      });

      return true;
    }
    return false;
  }

  global.submitDoctorErx = async function (tok) {
    try {
      const payload = {
        e_resep_token: tok,
        dokter_asal: document.getElementById('erxDokter').value,
        no_sip_dokter: document.getElementById('erxSip').value,
        nama_pasien: document.getElementById('erxPasien').value,
        no_wa_pasien: document.getElementById('erxWa').value,
        alergi_pasien: document.getElementById('erxAlergi').value,
        catatan_resep: document.getElementById('erxBody').value
      };
      const res = await API().callApi('auth.erxSubmitDoctor', payload, { isWrite: true, token: '' });
      global.toast(res.pesan || 'E-Resep terkirim!', 'ok');
    } catch (e) { global.toast(e.message, 'err'); }
  };

  /**
   * Ikon SVG Terpadu Halaman Login (2px stroke — UI/UX Pro Max)
   */
  function _loginIco(name, cls) {
    const p = {
      shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
      lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
      user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
      eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
      eyeOff: '<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/>',
      sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
      moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
      check: '<polyline points="20 6 9 17 4 12"/>',
      bolt: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
      cloud: '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>',
      building: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/>',
      clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
      arrowRight: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
      qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3z"/><path d="M20 14v3h-3"/><path d="M14 20h7"/><path d="M20 17v3"/>',
      store: '<path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/>',
      rx: '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6"/><path d="M9 15h6"/>',
      warn: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>'
    };
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="${cls || 'w-4 h-4 shrink-0'}">${p[name] || p.shield}</svg>`;
  }

  /**
   * W-01: Halaman Autentikasi & Multi-Branch Switcher Enterprise
   */
  function renderLoginView(root) {
    const demoMode = API().isDemoMode();
    const prof = S().getStoreProfile ? S().getStoreProfile() : {};
    const usahaLogo = prof.logo_usaha_url || './icons/ons-farma-app-icon.png';
    const usahaNama = prof.nama_usaha || 'APOTEK ONS FARMA';
    const pemilikNama = prof.nama_pemilik || 'apt. Anissa Faradifa R. Is Rumi';
    const nowDt = new Date();
    const hr = nowDt.getHours();
    const autoShift = (hr >= 21 || hr < 7) ? 'MALAM' : (hr >= 14 ? 'SIANG' : 'PAGI');
    const timeStr = nowDt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const dateStr = nowDt.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    const isDark = !!(S().AppState && S().AppState.darkMode);
    const gasConfigured = !!(global.ONS_CONFIG && global.ONS_CONFIG.GAS_URL && global.ONS_CONFIG.GAS_URL.indexOf('GANTI_DENGAN_ID') === -1);

    root.innerHTML = `<div class="ons-login-stage">
      <div class="ons-login-shell grid grid-cols-1 lg:grid-cols-12">
        <!-- Panel Kiri: Identitas Klinis, Jaminan Kepatuhan & Status Koneksi -->
        <div class="ons-login-hero lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between gap-6">
          <div class="space-y-5">
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-center gap-3.5 min-w-0">
                <div class="relative shrink-0">
                  <img src="${S().esc(usahaLogo)}" alt="Logo ${S().esc(usahaNama)}" class="w-14 h-14 rounded-2xl border-2 border-white/20 object-cover bg-white shadow-lg"/>
                  <span class="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#071928] flex items-center justify-center text-white">${_loginIco('check', 'w-2.5 h-2.5')}</span>
                </div>
                <div class="min-w-0">
                  <div class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-[10px] font-bold tracking-wider uppercase text-sky-200 mb-1">Portal Staf Terenkripsi</div>
                  <div class="font-extrabold text-lg sm:text-xl tracking-tight text-white truncate">${S().esc(usahaNama.toUpperCase())}</div>
                  <div class="text-xs text-sky-300 font-semibold truncate">${S().esc(pemilikNama)}</div>
                </div>
              </div>
            </div>

            <div class="space-y-2.5">
              <h2 class="text-xl sm:text-[22px] font-extrabold leading-snug tracking-tight text-white">Sistem Terpadu POS, FEFO Gudang, Layanan Klinis &amp; Keuangan</h2>
              <p class="text-xs text-slate-300 leading-relaxed">Arsitektur Terpisah Cloud PWA + Google Apps Script REST API dengan perlindungan kriptografi sesi HMAC-SHA256.</p>
            </div>

            <div class="grid grid-cols-1 gap-2 text-xs">
              <div class="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/[0.06] border border-white/10">
                <span class="text-emerald-400 shrink-0">${_loginIco('shield', 'w-4 h-4')}</span>
                <div class="min-w-0">
                  <div class="text-[11px] font-semibold text-white truncate">Izin SIA: ${S().esc(prof.no_sia || '-')}</div>
                  <div class="text-[10px] text-slate-300 truncate">${S().esc(prof.kota || 'Sigi')} &bull; SIPA: ${S().esc(prof.sipa_pemilik || prof.no_sipa || 'Aktif')}</div>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-2 text-[11px] text-slate-200">
                <div class="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10">
                  <span class="text-sky-400 shrink-0">${_loginIco('lock', 'w-3.5 h-3.5')}</span>
                  <span class="font-medium truncate">Anti Brute-Force 5x</span>
                </div>
                <div class="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10">
                  <span class="text-emerald-400 shrink-0">${_loginIco('clock', 'w-3.5 h-3.5')}</span>
                  <span class="font-medium truncate">Auto-Lock 25 Menit</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Kartu Status Koneksi & Pengalih Mode -->
          <div class="space-y-2.5">
            <div class="p-3.5 rounded-2xl bg-black/25 border border-white/12 space-y-2">
              <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-2 min-w-0">
                  <span class="w-2.5 h-2.5 rounded-full shrink-0 ${demoMode ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'}"></span>
                  <span class="text-xs font-bold uppercase tracking-wider ${demoMode ? 'text-amber-300' : 'text-emerald-300'}">${demoMode ? 'Mode Sandbox Demo' : 'Live Google Apps Script'}</span>
                </div>
                <button type="button" onclick="window.pingBackendHealth()" class="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-[11px] font-semibold text-white transition-colors shrink-0">Cek Koneksi</button>
              </div>
              <div class="text-xs text-slate-200 leading-snug flex items-center gap-2">
                <span class="${demoMode ? 'text-amber-300' : 'text-emerald-300'} shrink-0">${_loginIco(demoMode ? 'bolt' : 'cloud', 'w-4 h-4')}</span>
                <span id="loginConnDesc">${demoMode ? 'Penyimpanan lokal browser (aman untuk uji coba &amp; simulasi peran).' : (gasConfigured ? 'Terhubung langsung ke Google Sheets &amp; Drive Apotek (/exec).' : 'URL Google Apps Script belum terpasang di config.js.')}</span>
              </div>
              <div id="loginPingResult" class="text-[11px] font-mono-num text-slate-300 hidden"></div>
            </div>

            <div class="grid grid-cols-2 gap-2" role="group" aria-label="Pilih Mode Backend">
              <button type="button" onclick="window.switchBackendMode('DEMO')" class="ons-login-mode-btn ${demoMode ? 'is-active-demo' : ''}">
                ${demoMode ? _loginIco('check', 'w-3.5 h-3.5') : _loginIco('bolt', 'w-3.5 h-3.5')}
                <span>Mode Demo</span>
              </button>
              <button type="button" onclick="window.switchBackendMode('LIVE')" class="ons-login-mode-btn ${!demoMode ? 'is-active-live' : ''}">
                ${!demoMode ? _loginIco('check', 'w-3.5 h-3.5') : _loginIco('cloud', 'w-3.5 h-3.5')}
                <span>Mode Live GAS</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Panel Kanan: Form Login Staf -->
        <div class="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-center gap-5">
          <div class="space-y-5">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div class="flex items-center gap-2 text-[11px] font-semibold mb-1" style="color:var(--ons-text-soft)">
                  <span class="inline-flex items-center gap-1">${_loginIco('clock', 'w-3.5 h-3.5 text-blue-600')} ${S().esc(dateStr)} &bull; <span class="font-mono-num font-bold">${S().esc(timeStr)}</span></span>
                </div>
                <h1 class="text-xl sm:text-2xl font-extrabold tracking-tight">Masuk ke Ruang Kerja Apotek</h1>
                <p class="text-xs mt-0.5" style="color:var(--ons-text-soft)">${(S().isMultiBranchEnabled && S().isMultiBranchEnabled()) ? 'Pilih cabang apotek, shift aktif, lalu verifikasi akun Anda.' : 'Pilih shift operasional aktif, lalu verifikasi akun apotek Anda.'}</p>
              </div>
              <button type="button" onclick="ONSStore.toggleDarkMode();renderApp();" aria-label="Ganti Tema Terang atau Malam" class="ons-btn ons-btn-ghost text-xs px-3 min-h-[40px]">
                ${_loginIco(isDark ? 'sun' : 'moon', 'w-4 h-4')}
                <span>${isDark ? 'Terang' : 'Malam'}</span>
              </button>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label for="loginBranch" class="text-xs font-semibold flex items-center gap-1.5 mb-1.5" style="color:var(--ons-text-muted)">
                  ${_loginIco('building', 'w-3.5 h-3.5 text-blue-600')}
                  <span>${(S().isMultiBranchEnabled && S().isMultiBranchEnabled()) ? 'Cabang Apotek' : 'Outlet Apotek'}</span>
                </label>
                ${(() => {
                  const multi = S().isMultiBranchEnabled && S().isMultiBranchEnabled();
                  const branches = (S().getActiveBranches && S().getActiveBranches()) || ['ONS-01'];
                  if (!multi || branches.length <= 1) {
                    const outletTitle = (prof && prof.nama_usaha) ? `${prof.nama_usaha} (Utama)` : 'Apotek Utama (SIA)';
                    return `<input type="hidden" id="loginBranch" value="ONS-01"/>
                      <div class="ons-input text-[13px] font-semibold flex items-center justify-between gap-2 select-none" style="background:var(--ons-bg-subtle)">
                        <span class="truncate">${S().esc(outletTitle)}</span>
                        <span class="font-mono-num text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 shrink-0">ONS-01</span>
                      </div>`;
                  }
                  return `<select id="loginBranch" class="ons-select text-[13px] font-medium">
                    ${branches.map((bid) => `<option value="${S().esc(bid)}">${S().esc(bid)} &bull; ${S().esc(S().getBranchLabel ? S().getBranchLabel(bid) : bid)}</option>`).join('')}
                  </select>`;
                })()}
              </div>
              <div>
                <label for="loginShift" class="text-xs font-semibold flex items-center gap-1.5 mb-1.5" style="color:var(--ons-text-muted)">
                  ${_loginIco('clock', 'w-3.5 h-3.5 text-emerald-600')}
                  <span>Shift Operasional</span>
                </label>
                <select id="loginShift" class="ons-select text-[13px] font-medium">
                  <option value="PAGI" ${autoShift === 'PAGI' ? 'selected' : ''}>Shift Pagi (07:30&ndash;14:30)</option>
                  <option value="SIANG" ${autoShift === 'SIANG' ? 'selected' : ''}>Shift Siang (14:00&ndash;21:30)</option>
                  <option value="MALAM" ${autoShift === 'MALAM' ? 'selected' : ''}>Shift Malam (24 Jam)</option>
                </select>
              </div>
            </div>

            <form onsubmit="event.preventDefault();window.handleLoginSubmit();" class="space-y-3.5" autocomplete="on">
              <div>
                <label for="loginUser" class="text-xs font-semibold block mb-1.5" style="color:var(--ons-text-muted)">Username Staf</label>
                <div class="ons-login-field-wrap">
                  <span class="ons-login-field-icon">${_loginIco('user', 'w-4 h-4')}</span>
                  <input id="loginUser" name="username" autocomplete="username" oninput="window.clearLoginInlineError()" class="ons-input" placeholder="${demoMode ? 'pemilik / apj / kasir' : 'Masukkan username staf Anda'}" value="${demoMode ? 'pemilik' : ''}" required/>
                </div>
              </div>

              <div>
                <label for="loginPass" class="text-xs font-semibold block mb-1.5" style="color:var(--ons-text-muted)">Kata Sandi</label>
                <div class="ons-login-field-wrap">
                  <span class="ons-login-field-icon">${_loginIco('lock', 'w-4 h-4')}</span>
                  <input id="loginPass" name="password" type="password" autocomplete="current-password" oninput="window.clearLoginInlineError()" onkeyup="window.handleLoginCapsCheck(event)" onkeydown="window.handleLoginCapsCheck(event)" class="ons-input pr-24" placeholder="${demoMode ? 'Kosongkan atau isi bebas di Demo Sandbox' : 'Masukkan kata sandi akun Anda'}" value="" ${demoMode ? '' : 'required'}/>
                  <button type="button" onclick="window.togglePasswordFieldVis('loginPass', this)" aria-label="Tampilkan atau sembunyikan kata sandi" class="absolute right-1.5 inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[34px] rounded-lg text-[11px] font-semibold hover:bg-slate-500/10 transition-colors" style="color:var(--ons-text-soft)">
                    ${_loginIco('eye', 'w-3.5 h-3.5')}
                    <span>Lihat</span>
                  </button>
                </div>
                <div id="loginCapsWarn" class="hidden mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                  ${_loginIco('warn', 'w-3.5 h-3.5')}
                  <span>Caps Lock aktif &mdash; kata sandi membedakan huruf besar dan kecil.</span>
                </div>
              </div>

              <div id="loginInlineError" role="alert" class="hidden p-3 rounded-xl border border-red-500/35 bg-red-500/10 text-red-700 dark:text-red-300 text-xs font-semibold flex items-start gap-2">
                ${_loginIco('warn', 'w-4 h-4 mt-0.5 shrink-0')}
                <span id="loginInlineErrorText"></span>
              </div>

              <button id="loginSubmitBtn" type="submit" class="ons-btn ons-btn-primary w-full min-h-[46px] text-sm font-bold tracking-tight">
                ${_loginIco('lock', 'w-4 h-4')}
                <span>Masuk ke Ruang Kerja Apotek</span>
                ${_loginIco('arrowRight', 'w-4 h-4')}
              </button>
            </form>

            ${demoMode ? `<div class="pt-3 border-t space-y-2.5" style="border-color:var(--ons-border)">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="text-xs font-bold flex items-center gap-1.5" style="color:var(--ons-text-muted)">
                  ${_loginIco('bolt', 'w-3.5 h-3.5 text-amber-500')}
                  <span>Pintasan Masuk Cepat Mode Demo (Uji RBAC Offline)</span>
                </div>
                <button type="button" onclick="window.switchBackendMode('LIVE')" class="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline">Buka Data Asli (Live GAS) &rarr;</button>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button type="button" onclick="window.quickRoleLogin('pemilik')" class="ons-login-quick-card">
                  <span class="text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-600 dark:text-blue-400">Pemilik</span>
                  <span class="font-bold text-xs mt-0.5">Akses Penuh</span>
                  <span class="text-[10px]" style="color:var(--ons-text-soft)">Keuangan, Staf &amp; Audit</span>
                </button>
                <button type="button" onclick="window.quickRoleLogin('apj')" class="ons-login-quick-card">
                  <span class="text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">APJ Apoteker</span>
                  <span class="font-bold text-xs mt-0.5">Klinis &amp; BPOM</span>
                  <span class="text-[10px]" style="color:var(--ons-text-soft)">FEFO, E-Resep &amp; SIPNAP</span>
                </button>
                <button type="button" onclick="window.quickRoleLogin('kasir')" class="ons-login-quick-card">
                  <span class="text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400">Kasir POS</span>
                  <span class="font-bold text-xs mt-0.5">HPP Terkunci</span>
                  <span class="text-[10px]" style="color:var(--ons-text-soft)">Kasir Cepat &amp; Shift</span>
                </button>
              </div>
            </div>` : `<div class="p-3.5 rounded-2xl border space-y-2.5" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
              <div class="flex items-center justify-between gap-2">
                <div class="font-bold text-xs flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  ${_loginIco('shield', 'w-4 h-4')}
                  <span>Perisai Keamanan Produksi Aktif (Live GAS)</span>
                </div>
                <span class="badge-bpom bpom-bebas text-[10px]">TERENKRIPSI</span>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]" style="color:var(--ons-text-soft)">
                <div class="flex items-center gap-1.5">${_loginIco('check', 'w-3.5 h-3.5 text-emerald-500')}<span>Token sesi HMAC-SHA256 unik</span></div>
                <div class="flex items-center gap-1.5">${_loginIco('check', 'w-3.5 h-3.5 text-emerald-500')}<span>250x SHA-256 + Salt &amp; Pepper</span></div>
                <div class="flex items-center gap-1.5">${_loginIco('check', 'w-3.5 h-3.5 text-emerald-500')}<span>Blokir otomatis 15 mnt (5x salah)</span></div>
                <div class="flex items-center gap-1.5">${_loginIco('check', 'w-3.5 h-3.5 text-emerald-500')}<span>Wipe cache otomatis saat keluar</span></div>
              </div>
            </div>`}
          </div>
        </div>
      </div>
    </div>`;
    if (!demoMode && gasConfigured && API() && typeof API().warmUpBackend === 'function') {
      API().warmUpBackend();
    }
  }

  global.clearLoginInlineError = () => {
    const box = document.getElementById('loginInlineError');
    if (box && box.classList && typeof box.classList.add === 'function') {
      box.classList.add('hidden');
    }
  };

  global.handleLoginCapsCheck = (ev) => {
    const warn = document.getElementById('loginCapsWarn');
    if (!warn || !ev || typeof ev.getModifierState !== 'function') return;
    const isOn = !!ev.getModifierState('CapsLock');
    if (warn.classList && typeof warn.classList.toggle === 'function') {
      warn.classList.toggle('hidden', !isOn);
    }
  };

  global.pingBackendHealth = async () => {
    const resEl = document.getElementById('loginPingResult');
    if (resEl) {
      if (resEl.classList && typeof resEl.classList.remove === 'function') resEl.classList.remove('hidden');
      resEl.textContent = 'Menguji koneksi ke server backend...';
    }
    const t0 = (global.performance && typeof global.performance.now === 'function') ? global.performance.now() : Date.now();
    try {
      const pong = await API().callApi('ping', {}, { token: '' });
      const ms = Math.max(1, Math.round(((global.performance && typeof global.performance.now === 'function') ? global.performance.now() : Date.now()) - t0));
      const ver = (pong && pong.version) || 'Aktif';
      const msg = `Terhubung (${ver}) • Latensi ${ms} ms`;
      if (resEl) resEl.textContent = msg;
      global.toast('Koneksi backend berhasil: ' + msg, 'ok');
    } catch (e) {
      if (resEl) resEl.textContent = 'Gagal terhubung: ' + e.message;
      global.toast('Koneksi server gagal: ' + e.message, 'err');
    }
  };

  global.togglePasswordFieldVis = (inputId, btnEl) => {
    const inp = document.getElementById(inputId);
    if (!inp) return;
    const isPw = inp.type === 'password';
    inp.type = isPw ? 'text' : 'password';
    if (btnEl) {
      if (btnEl.innerHTML && btnEl.innerHTML.indexOf('<svg') !== -1) {
        btnEl.innerHTML = `${_loginIco(isPw ? 'eyeOff' : 'eye', 'w-3.5 h-3.5')}<span>${isPw ? 'Tutup' : 'Lihat'}</span>`;
      } else {
        btnEl.textContent = isPw ? 'Tutup' : 'Lihat';
      }
    }
  };

  global.switchBackendMode = (mode) => {
    API().setModeOverride(mode);
    if (mode === 'LIVE' && API() && typeof API().warmUpBackend === 'function') {
      API().warmUpBackend();
    }
    global.toast('Mode koneksi diubah ke: ' + (mode === 'LIVE' ? 'Live Google Apps Script' : 'Demo Sandbox'), 'info');
    global.renderApp();
  };

  global.openManualVerifyPrompt = () => {
    S().openModal(`<div class="p-6 space-y-4">
      <div class="flex items-start justify-between gap-2">
        <div>
          <h3 class="font-bold text-lg">Verifikasi Keaslian Dokumen &amp; Kwitansi</h3>
          <p class="text-xs mt-0.5" style="color:var(--ons-text-soft)">Validasi tanda tangan kriptografis HMAC-SHA256 dokumen resmi apotek.</p>
        </div>
      </div>
      <div class="space-y-3">
        <div>
          <label for="manDocKode" class="text-xs font-semibold block mb-1">Kode Verifikasi Surat / Tautan QR</label>
          <input id="manDocKode" class="ons-input font-mono-num" placeholder="Masukkan 20 karakter kode surat resmi (contoh: ONS...)"/>
        </div>
        <button type="button" onclick="const v=(document.getElementById('manDocKode').value||'').trim();if(!v){toast('Masukkan kode verifikasi terlebih dahulu.','warn');return;}window.location.hash=v.indexOf('=')!==-1?v.replace(/^#/,''):('doc='+encodeURIComponent(v));ONSStore.closeModal();renderApp();" class="ons-btn ons-btn-primary w-full">Verifikasi Dokumen Resmi</button>
      </div>
    </div>`, '460px');
  };

  global.quickRoleLogin = (username) => {
    if (!API().isDemoMode()) {
      global.toast('Pintasan masuk cepat hanya tersedia pada mode Demo Sandbox.', 'warn');
      return;
    }
    const u = document.getElementById('loginUser');
    if (u) u.value = username;
    global.handleLoginSubmit({ demoQuick: true });
  };

  global.handleLoginSubmit = async (opts) => {
    const username = document.getElementById('loginUser').value.trim();
    const password = document.getElementById('loginPass').value;
    const branch = document.getElementById('loginBranch').value;
    const shift = document.getElementById('loginShift').value;
    const setInlineErr = (msg) => {
      const box = document.getElementById('loginInlineError');
      const txt = document.getElementById('loginInlineErrorText');
      if (txt) txt.textContent = msg;
      if (box && box.classList && typeof box.classList.remove === 'function') box.classList.remove('hidden');
    };
    global.clearLoginInlineError();
    if (!username || (!password && !(opts && opts.demoQuick) && !API().isDemoMode())) {
      const m = 'Masukkan username dan kata sandi terlebih dahulu.';
      setInlineErr(m);
      global.toast(m, 'warn');
      return;
    }
    const btn = document.getElementById('loginSubmitBtn');
    const prevHtml = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `${_loginIco('clock', 'w-4 h-4')}<span>Memverifikasi Sesi &amp; Memuat Data...</span>`;
    }
    try {
      const res = await API().callApi('auth.login', { username, password: password || (API().isDemoMode() ? 'demo-sandbox' : ''), cabang_id: branch, include_boot: true }, { isWrite: true, token: '' });
      const passEl = document.getElementById('loginPass');
      if (passEl) passEl.value = '';
      API().setSession({ token: res.token, user: res.user, cabang_id: branch, shift });
      S().AppState.user = res.user;
      S().AppState.cabangId = branch;
      S().AppState.needsPasswordUpgrade = !!(res.security_notice && res.security_notice.needs_password_upgrade);
      if (shift === 'MALAM') S().toggleDarkMode(true);
      S().AppState.activeView = 'dashboard';
      if (res.boot && typeof global.applyBootPayload === 'function') {
        if (API() && typeof API().setCachedRead === 'function') {
          API().setCachedRead('boot.getState', { cabang_id: branch }, res.boot);
        }
        global.applyBootPayload(res.boot);
        S().AppState.booted = true;
        global.renderApp();
      } else {
        await global.bootLoadState(true);
      }
      global.toast('Selamat datang, ' + res.user.nama_lengkap, 'ok');
      if (S().AppState.needsPasswordUpgrade && !API().isDemoMode()) {
        setTimeout(() => global.toast('Peringatan Keamanan: Segera ganti sandi & PIN awal Anda di Pengaturan -> Akun.', 'warn'), 1200);
      }
    } catch (e) {
      setInlineErr(e.message);
      global.toast(e.message, 'err');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = prevHtml;
      }
    }
  };

  /**
   * W-02: Pusat Komando & Dashboard Eksekutif Apotek Digital
   */
  global.copyPublicApotekLink = () => {
    const url = global.location.origin + global.location.pathname + '?katalog=1';
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).catch(() => {});
    }
    global.toast('Tautan Etalase E-Apotek Publik disalin: ' + url, 'ok');
  };

  function toLocalYmd_(val) {
    const s = String(val || '').trim();
    if (s) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
      if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(s) && !s.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(s)) {
        return s.slice(0, 10);
      }
      const dt = new Date(s);
      if (!isNaN(dt.getTime())) {
        return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
      }
      return s.slice(0, 10);
    }
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  function sameCabang_(row, cabId) {
    return !row || !row.cabang_id || String(row.cabang_id) === String(cabId);
  }

  let dashSubTab = 'umum';
  let dashPeriodPreset = '30d';
  let dashCustomStart = '';
  let dashCustomEnd = '';
  let dashSalesGranularity = 'harian';
  let dashSalesNetRetur = true;
  let dashPurchaseGranularity = 'harian';
  let dashInvJenis = 'SEMUA';
  let dashInvSupplier = 'SEMUA';
  let dashKpiYear = String(new Date().getFullYear());

  const DASH_LOST_SALES_KEY = 'ons_lost_sales_v10';

  function _shiftLocalYmd(baseDt, offsetDays) {
    const dt = new Date(baseDt.getFullYear(), baseDt.getMonth(), baseDt.getDate() + offsetDays);
    return toLocalYmd_(dt);
  }

  function _getDashDateRange(nowDt) {
    const todayIso = toLocalYmd_(nowDt);
    let startYmd = todayIso;
    let endYmd = todayIso;
    let label = 'Hari Ini';
    if (dashPeriodPreset === 'today') {
      startYmd = todayIso;
      endYmd = todayIso;
      label = 'Hari Ini';
    } else if (dashPeriodPreset === '7d') {
      startYmd = _shiftLocalYmd(nowDt, -6);
      endYmd = todayIso;
      label = '7 Hari Terakhir';
    } else if (dashPeriodPreset === '30d') {
      startYmd = _shiftLocalYmd(nowDt, -29);
      endYmd = todayIso;
      label = '30 Hari Terakhir';
    } else if (dashPeriodPreset === 'month') {
      startYmd = `${nowDt.getFullYear()}-${String(nowDt.getMonth() + 1).padStart(2, '0')}-01`;
      endYmd = todayIso;
      label = 'Bulan Ini';
    } else if (dashPeriodPreset === 'year') {
      startYmd = `${nowDt.getFullYear()}-01-01`;
      endYmd = todayIso;
      label = 'Tahun Ini';
    } else if (dashPeriodPreset === 'all') {
      startYmd = '2000-01-01';
      endYmd = '2099-12-31';
      label = 'Semua Waktu';
    } else if (dashPeriodPreset === 'custom') {
      startYmd = dashCustomStart || _shiftLocalYmd(nowDt, -6);
      endYmd = dashCustomEnd || todayIso;
      if (startYmd > endYmd) {
        const tmp = startYmd;
        startYmd = endYmd;
        endYmd = tmp;
      }
      label = `${startYmd} s.d. ${endYmd}`;
    }
    return { preset: dashPeriodPreset, startYmd, endYmd, label };
  }

  function _inDashRange(dateVal, range) {
    if (!dateVal) return false;
    const ymd = toLocalYmd_(dateVal);
    return ymd >= range.startYmd && ymd <= range.endYmd;
  }

  function _getDashLostSales(range) {
    let arr = [];
    try {
      const parsed = JSON.parse(localStorage.getItem(DASH_LOST_SALES_KEY) || 'null');
      if (Array.isArray(parsed)) arr = parsed;
    } catch (e) {}
    return range ? arr.filter((ls) => !ls.tanggal || _inDashRange(ls.tanggal, range)) : arr;
  }

  function _computeDashInventoryStatus(st, cabId) {
    const activeBatches = (st.stokBatch || []).filter((b) => sameCabang_(b, cabId) && String(b.status_batch || 'AKTIF') === 'AKTIF' && Number(b.qty_sisa || 0) > 0);
    const expiredBatches = activeBatches.filter((b) => S().daysUntil(b.tgl_kadaluarsa) < 0);
    const nearEdBatches = activeBatches.filter((b) => {
      const d = S().daysUntil(b.tgl_kadaluarsa);
      return d >= 0 && d <= 90;
    });
    const lossProducts = (st.masterObat || []).filter((o) => {
      const hpp = Number(o.hpp_terakhir || o.hpp_avg || 0);
      const hj = Number(o.harga_umum || 0);
      return hpp > 0 && hj > 0 && hj <= hpp;
    });
    const zeroProducts = (st.masterObat || []).filter((o) => S().getSellableStok(o.id_obat) <= 0);
    const defectaProducts = (st.masterObat || []).filter((o) => S().getSellableStok(o.id_obat) <= Number(o.stok_min || 10));
    const currentStockVal = activeBatches.reduce((sum, b) => {
      const ob = (st.masterObat || []).find((o) => o.id_obat === b.id_obat);
      const hpp = Number(b.hpp_beli || (ob && (ob.hpp_avg || ob.hpp_terakhir)) || 0);
      return sum + (Number(b.qty_sisa || 0) * hpp);
    }, 0);
    const currentStockUnits = activeBatches.reduce((sum, b) => sum + Number(b.qty_sisa || 0), 0);
    return { activeBatches, expiredBatches, nearEdBatches, lossProducts, zeroProducts, defectaProducts, currentStockVal, currentStockUnits };
  }

  function _compactNumLabel(v) {
    const n = Number(v || 0);
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'jt';
    if (n >= 1000) return Math.round(n / 1000) + 'rb';
    return String(Math.round(n));
  }

  function _renderSvgVerticalBars(items, seriesDefs, opts) {
    const cfg = opts || {};
    const emptyMsg = cfg.emptyMsg || 'Belum ada data pada rentang waktu yang dipilih.';
    const hasAnyVal = items.some((it) => seriesDefs.some((sd) => Number(it[sd.key] || 0) > 0));
    const svgW = Math.max(360, items.length * (cfg.barSlotW || 44) + 52);
    const svgH = 185;
    const padL = 42;
    const padR = 14;
    const padT = 16;
    const padB = 34;
    const plotW = svgW - padL - padR;
    const plotH = svgH - padT - padB;
    const maxPrim = Math.max(1, ...items.map((it) => Math.max(...seriesDefs.map((sd) => Number(it[sd.key] || 0)))));
    const gridSteps = [0, 0.25, 0.5, 0.75, 1];
    const slotW = items.length ? (plotW / items.length) : plotW;
    const barCount = seriesDefs.length || 1;
    const groupW = Math.min(34, Math.max(10, slotW * 0.68));
    const singleW = Math.max(5, (groupW - (barCount - 1) * 2) / barCount);

    return `<div class="space-y-2">
      <div class="flex flex-wrap items-center justify-between gap-2 text-[11px]">
        <div class="flex flex-wrap items-center gap-3">
          ${seriesDefs.map((sd) => `<span class="inline-flex items-center gap-1.5 font-semibold"><span class="w-3 h-2.5 rounded-sm inline-block" style="background:${sd.color}"></span>${S().esc(sd.label)}</span>`).join('')}
        </div>
        ${cfg.unitHint ? `<span class="font-mono-num text-[10px]" style="color:var(--ons-text-soft)">${S().esc(cfg.unitHint)}</span>` : ''}
      </div>
      <div class="ons-dash-chart-scroll">
        <svg viewBox="0 0 ${svgW} ${svgH}" class="w-full min-w-[340px] h-44 overflow-visible" role="img" aria-label="${S().esc(cfg.ariaLabel || 'Grafik Dashboard')}">
          ${gridSteps.map((ratio) => {
            const y = padT + plotH * (1 - ratio);
            const lbl = cfg.isCurrency ? _compactNumLabel(maxPrim * ratio) : Math.round(maxPrim * ratio * 10) / 10;
            return `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${svgW - padR}" y2="${y.toFixed(1)}" stroke="var(--ons-border)" stroke-width="1" ${ratio > 0 ? 'stroke-dasharray="3 3"' : ''}/>
              <text x="${padL - 6}" y="${(y + 3).toFixed(1)}" text-anchor="end" font-size="9" fill="#64748B">${lbl}</text>`;
          }).join('')}
          ${items.map((it, idx) => {
            const cx = padL + idx * slotW + slotW / 2;
            const startX = cx - groupW / 2;
            const bars = seriesDefs.map((sd, sIdx) => {
              const raw = Number(it[sd.key] || 0);
              const h = raw > 0 ? Math.max(4, (raw / maxPrim) * plotH) : 2;
              const x = startX + sIdx * (singleW + 2);
              const y = padT + plotH - h;
              const valStr = sd.isCurrency ? S().rp(raw) : (raw + (sd.suffix || ''));
              return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${singleW.toFixed(1)}" height="${h.toFixed(1)}" rx="3" fill="${sd.color}" opacity="${raw > 0 ? '0.92' : '0.22'}"><title>${S().esc(it.label)} — ${S().esc(sd.label)}: ${S().esc(valStr)}</title></rect>`;
            }).join('');
            return `${bars}<text x="${cx.toFixed(1)}" y="${svgH - 12}" text-anchor="middle" font-size="9.5" font-weight="600" fill="#64748B">${S().esc(it.shortLabel || it.label)}</text>`;
          }).join('')}
        </svg>
      </div>
      ${!hasAnyVal ? `<div class="text-[11px] text-center py-1" style="color:var(--ons-text-soft)">${S().esc(emptyMsg)}</div>` : ''}
    </div>`;
  }

  function _renderDashFilterBar(range, extraRightHtml) {
    return `<div class="flex flex-wrap items-center justify-between gap-2.5">
      <div class="flex flex-wrap items-center gap-2">
        <select aria-label="Pilih Rentang Waktu Dashboard" onchange="window.setDashPeriodPreset(this.value)" class="ons-input text-xs py-1.5 px-3 w-auto font-semibold">
          <option value="today" ${dashPeriodPreset === 'today' ? 'selected' : ''}>Hari Ini</option>
          <option value="7d" ${dashPeriodPreset === '7d' ? 'selected' : ''}>7 Hari Terakhir</option>
          <option value="30d" ${dashPeriodPreset === '30d' ? 'selected' : ''}>30 Hari Terakhir</option>
          <option value="month" ${dashPeriodPreset === 'month' ? 'selected' : ''}>Bulan Ini</option>
          <option value="year" ${dashPeriodPreset === 'year' ? 'selected' : ''}>Tahun Ini</option>
          <option value="all" ${dashPeriodPreset === 'all' ? 'selected' : ''}>Semua Waktu</option>
          <option value="custom" ${dashPeriodPreset === 'custom' ? 'selected' : ''}>Custom Tanggal</option>
        </select>
        ${dashPeriodPreset === 'custom' ? `
          <div class="flex items-center gap-1.5 text-xs">
            <input id="dashRangeStart" type="date" value="${S().esc(range.startYmd)}" onchange="window.setDashCustomRange(this.value, (document.getElementById('dashRangeEnd')||{}).value)" class="ons-input text-xs py-1 px-2 font-mono-num"/>
            <span style="color:var(--ons-text-soft)">s.d.</span>
            <input id="dashRangeEnd" type="date" value="${S().esc(range.endYmd)}" onchange="window.setDashCustomRange((document.getElementById('dashRangeStart')||{}).value, this.value)" class="ons-input text-xs py-1 px-2 font-mono-num"/>
          </div>
        ` : `<span class="text-xs font-mono-num px-2.5 py-1 rounded-lg border" style="background:var(--ons-bg-subtle);border-color:var(--ons-border);color:var(--ons-text-soft)">${S().esc(range.startYmd)} s.d. ${S().esc(range.endYmd)}</span>`}
      </div>
      ${extraRightHtml || ''}
    </div>`;
  }

  function _renderDashStatusPersediaanSection(invStatus, seeCost, canGudang, canDefecta, canFaktur) {
    const cards = [
      {
        title: 'Berpotensi Rugi',
        headStyle: 'background:rgba(244,63,94,0.12);color:#be123c',
        badgeCls: invStatus.lossProducts.length ? 'bpom-keras' : 'bpom-bebas',
        count: invStatus.lossProducts.length,
        unit: seeCost ? 'produk (harga &le; HPP)' : 'produk perlu cek harga',
        actionLabel: 'Cek Harga &amp; HPP',
        icon: '<path d="M12 9v2m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>',
        onClick: canFaktur ? `navigateView('faktur','harga')` : (canGudang ? `navigateView('gudang','batch')` : '')
      },
      {
        title: 'Stok Habis / Kosong',
        headStyle: 'background:rgba(245,158,11,0.14);color:#b45309',
        badgeCls: invStatus.zeroProducts.length ? 'bpom-prekursor' : 'bpom-bebas',
        count: invStatus.zeroProducts.length,
        unit: 'produk stok 0',
        actionLabel: 'Order Defecta',
        icon: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="m9 12 2 2 4-4"/>',
        onClick: canDefecta ? `navigateView('faktur','defecta')` : (canGudang ? `navigateView('gudang','batch')` : '')
      },
      {
        title: 'Dekat Kadaluarsa',
        headStyle: 'background:rgba(14,165,233,0.14);color:#0369a1',
        badgeCls: invStatus.nearEdBatches.length ? 'bpom-prekursor' : 'bpom-bebas',
        count: invStatus.nearEdBatches.length,
        unit: 'batch (&le;90 hari)',
        actionLabel: 'Cek FEFO Gudang',
        icon: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
        onClick: canGudang ? `navigateView('gudang','batch')` : ''
      },
      {
        title: 'Sudah Kadaluarsa',
        headStyle: 'background:rgba(239,68,68,0.14);color:#dc2626',
        badgeCls: invStatus.expiredBatches.length ? 'bpom-keras' : 'bpom-bebas',
        count: invStatus.expiredBatches.length,
        unit: 'batch kadaluarsa',
        actionLabel: 'Karantina / Recall',
        icon: '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>',
        onClick: canGudang ? `navigateView('gudang','batch')` : ''
      }
    ];
    return `<div class="space-y-3">
      <div class="ons-dash-sec-title">
        <span class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
          <span>Status Persediaan &amp; Mitigasi Risiko</span>
        </span>
        ${canGudang ? `<button type="button" onclick="navigateView('gudang','batch')" class="ons-btn ons-btn-ghost text-xs py-1 px-2.5">Kelola Stok &amp; FEFO &rarr;</button>` : ''}
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        ${cards.map((c) => `
          <button type="button" class="ons-dash-status-card group" ${c.onClick ? `onclick="${c.onClick}"` : ''}>
            <div class="ons-dash-status-head" style="${c.headStyle}">
              <span class="flex items-center gap-1.5 min-w-0 font-bold">
                <svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${c.icon}</svg>
                <span class="truncate">${c.title}</span>
              </span>
              <span class="badge-bpom ${c.badgeCls} font-mono-num text-[10px] shrink-0">${c.count}</span>
            </div>
            <div class="ons-dash-status-body">
              <div class="text-2xl sm:text-3xl font-extrabold font-mono-num" style="color:var(--ons-text-main)">${c.count}</div>
              <div class="text-xs mt-1 leading-snug" style="color:var(--ons-text-soft)">${c.unit}</div>
              <div class="mt-3 pt-2 border-t flex items-center justify-between text-[11px] font-semibold text-blue-600 dark:text-blue-400 group-hover:underline" style="border-color:var(--ons-border)">
                <span>${c.actionLabel}</span>
                <span aria-hidden="true">&rsaquo;</span>
              </div>
            </div>
          </button>
        `).join('')}
      </div>
    </div>`;
  }

  function _getBucketKeys(range, granularity) {
    const startDt = new Date(range.startYmd + 'T00:00:00');
    const endDt = new Date(range.endYmd + 'T00:00:00');
    const diffDays = Math.max(0, Math.min(90, Math.round((endDt.getTime() - startDt.getTime()) / 86400000)));
    const list = [];
    if (granularity === 'mingguan' || diffDays > 21) {
      const weeks = Math.max(1, Math.min(12, Math.ceil((diffDays + 1) / 7)));
      for (let i = 0; i < weeks; i++) {
        const wStart = _shiftLocalYmd(endDt, -(weeks - 1 - i) * 7 - 6);
        const wEnd = _shiftLocalYmd(endDt, -(weeks - 1 - i) * 7);
        list.push({ startYmd: wStart, endYmd: wEnd, label: wStart.slice(5) + '..' + wEnd.slice(5), shortLabel: wEnd.slice(8) + '/' + wEnd.slice(5, 7) });
      }
      return list;
    }
    const totalDays = Math.max(1, Math.min(14, diffDays + 1));
    for (let i = totalDays - 1; i >= 0; i--) {
      const ymd = _shiftLocalYmd(endDt, -i);
      list.push({ startYmd: ymd, endYmd: ymd, label: ymd, shortLabel: ymd.slice(8) + '/' + ymd.slice(5, 7) });
    }
    return list;
  }

  function renderDashboardView() {
    const st = S().AppState;
    const cabId = st.cabangId || 'ONS-01';
    const seeCost = S().canSeeFinancialCost();
    const curSubRaw = (st.subTabs && st.subTabs.dashboard) || dashSubTab || 'umum';
    const allowedTabs = ['umum', 'penjualan', 'persediaan'].concat(seeCost ? ['pembelian'] : []);
    dashSubTab = allowedTabs.includes(curSubRaw) ? curSubRaw : 'umum';
    if (st.subTabs) st.subTabs.dashboard = dashSubTab;

    const prof = S().getStoreProfile ? S().getStoreProfile() : {};
    const usahaLogo = prof.logo_usaha_url || './icons/ons-farma-app-icon.png';
    const usahaNama = prof.nama_usaha || 'Apotek ONS Farma';
    const pemilikNama = prof.nama_pemilik || 'apt. Anissa Faradifa R. Is Rumi';
    const fotoPem = prof.foto_pemilik_url || '';

    const nowDt = new Date();
    const hourNow = nowDt.getHours();
    const greetText = hourNow < 11 ? 'Selamat Pagi' : (hourNow < 15 ? 'Selamat Siang' : (hourNow < 19 ? 'Selamat Sore' : 'Selamat Malam'));
    const fullDateLabel = nowDt.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const todayIso = toLocalYmd_(nowDt);
    const range = _getDashDateRange(nowDt);

    const allBranchSales = (st.penjualan || []).filter((p) => sameCabang_(p, cabId));
    const validSales = allBranchSales.filter((p) => String(p.status_trx || '') !== 'RETUR');
    const returSales = allBranchSales.filter((p) => String(p.status_trx || '').toUpperCase().includes('RETUR'));
    const validTrxIds = new Set(validSales.map((p) => p.id_transaksi));

    const canPos = S().canAccessView('pos');
    const canObat = S().canAccessView('obat');
    const canPoct = S().canAccessView('pemeriksaan');
    const canGudang = S().canAccessView('gudang');
    const canDefecta = S().canAccessView('defecta');
    const canFaktur = S().canAccessView('faktur');
    const canShift = S().canAccessView('tutup-shift');
    const canFin = S().canAccessView('finance');
    const canErx = S().canAccessView('eresep-prb');
    const canOnline = S().canAccessView('omnichannel');

    const invStatus = _computeDashInventoryStatus(st, cabId);
    const activeTabList = [
      { id: 'umum', label: 'Dashboard Umum', icon: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>' },
      { id: 'penjualan', label: 'Penjualan &amp; Omzet', icon: '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>' },
      ...(seeCost ? [{ id: 'pembelian', label: 'Pembelian &amp; PBF', icon: '<rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>' }] : []),
      { id: 'persediaan', label: 'Persediaan &amp; FEFO', icon: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>' }
    ];

    const tabBarHtml = `<div class="ons-card p-2.5 sm:p-3 flex flex-wrap items-center justify-between gap-2.5 shadow-sm border" style="border-color:var(--ons-border)">
      <div class="ons-tab-bar" role="tablist" aria-label="Sub-Menu Dashboard Apotek">
        ${activeTabList.map((tb) => `<button type="button" role="tab" aria-selected="${dashSubTab === tb.id ? 'true' : 'false'}" onclick="window.setDashboardTab('${tb.id}')" class="ons-tab-btn flex items-center gap-2 px-3 py-2 text-xs font-bold transition-all ${dashSubTab === tb.id ? 'active shadow-sm' : ''}">
          <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${tb.icon}</svg>
          <span>${tb.label}</span>
        </button>`).join('')}
      </div>
      <div class="flex flex-wrap items-center gap-2 text-xs">
        <span class="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Live Real-Time
        </span>
        ${canFin && seeCost ? `<button type="button" onclick="navigateView('finance','pnl')" class="ons-btn ons-btn-ghost text-xs flex items-center gap-1.5 py-1 px-2.5" title="Buka Laporan Laba Rugi"><span>Laba/Rugi</span><span aria-hidden="true">&rarr;</span></button>` : ''}
        <button type="button" onclick="bootLoadState(true)" class="ons-btn ons-btn-ghost text-xs flex items-center gap-1.5 py-1 px-2.5" title="Segarkan Data Terbaru">
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
          <span>Segarkan</span>
        </button>
      </div>
    </div>`;

    if (dashSubTab === 'penjualan') {
      return `<div class="space-y-4 ons-view-enter">${tabBarHtml}${renderDashboardPenjualanTab(st, cabId, seeCost, nowDt, range, validSales, returSales, canPos, canObat)}</div>`;
    }
    if (dashSubTab === 'pembelian') {
      return `<div class="space-y-4 ons-view-enter">${tabBarHtml}${renderDashboardPembelianTab(st, cabId, seeCost, nowDt, range, canDefecta, canFaktur, canFin)}</div>`;
    }
    if (dashSubTab === 'persediaan') {
      return `<div class="space-y-4 ons-view-enter">${tabBarHtml}${renderDashboardPersediaanTab(st, cabId, seeCost, nowDt, range, invStatus, canGudang, canDefecta, canFaktur)}</div>`;
    }

    // === DASHBOARD UMUM (Integrasi Kokpit Eksekutif + Analisis Toko Apotek Digital) ===
    const todaySales = validSales.filter((p) => toLocalYmd_(p.tanggal) === todayIso);
    const omzetHariIni = todaySales.reduce((s, p) => s + Number(p.grand_total || 0), 0);
    const omzetTotal = validSales.reduce((s, p) => s + Number(p.grand_total || 0), 0);
    const marginHariIni = seeCost ? todaySales.reduce((s, p) => s + Number(p.estimasi_margin || 0), 0) : null;
    const marginTotal = seeCost ? validSales.reduce((s, p) => s + Number(p.estimasi_margin || 0), 0) : null;
    const marginDenom = omzetHariIni > 0 ? omzetHariIni : omzetTotal;
    const marginNum = omzetHariIni > 0 ? (marginHariIni || 0) : (marginTotal || 0);
    const marginPct = seeCost && marginDenom > 0 ? Math.round((marginNum / marginDenom) * 100) : 0;

    const expiredBatches = invStatus.expiredBatches;
    const nearEdBatches = invStatus.nearEdBatches;
    const warningEdCount = expiredBatches.length + nearEdBatches.length;
    const defectaCount = invStatus.defectaProducts.length;
    const activeBatches = invStatus.activeBatches;

    const branchFaktur = seeCost ? (st.fakturPbf || []).filter((f) => sameCabang_(f, cabId)) : [];
    const openFaktur = branchFaktur.filter((f) => Number(f.sisa_hutang || 0) > 0);
    const apTotal = seeCost ? openFaktur.reduce((s, f) => s + Number(f.sisa_hutang || 0), 0) : 0;
    const apNearDueCount = seeCost ? openFaktur.filter((f) => f.tgl_jatuh_tempo && S().daysUntil(f.tgl_jatuh_tempo) <= 7).length : 0;

    const openPiutang = (st.piutangPelanggan || []).filter((pt) => sameCabang_(pt, cabId) && String(pt.status_piutang || '') !== 'LUNAS' && Number(pt.sisa_piutang || 0) > 0);
    const piutangTotal = openPiutang.reduce((s, pt) => s + Number(pt.sisa_piutang || 0), 0);

    const erxAntre = (st.rekamKlinis || []).filter((r) => {
      const sk = String(r.status_klinis || '').toUpperCase();
      return sameCabang_(r, cabId) && (sk.includes('ANTRIAN') || sk.includes('MENUNGGU'));
    }).length;
    const prbUrgentCount = (st.members || []).filter((m) => m.tgl_habis_obat && S().daysUntil(m.tgl_habis_obat) <= 5).length;

    const branchOnline = (st.omnichannelOrders || []).filter((o) => sameCabang_(o, cabId));
    const onlinePendingCount = branchOnline.filter((o) => ['BARU', 'DIPROSES', 'SIAP_KIRIM'].includes(String(o.status_order || '').toUpperCase())).length;

    const branchPoct = (st.pemeriksaanPasien || []).filter((px) => sameCabang_(px, cabId));
    const poctTodayCount = branchPoct.filter((px) => toLocalYmd_(px.tanggal) === todayIso).length;

    const branchSp = seeCost ? (st.suratPesanan || []).filter((sp) => sameCabang_(sp, cabId)) : [];
    const spOpenCount = seeCost ? branchSp.filter((sp) => !['SELESAI_DITERIMA', 'DITERIMA_PENUH', 'BATAL'].includes(String(sp.status_sp || '').toUpperCase())).length : 0;

    const branchCold = (st.coldChain || [])
      .filter((c) => sameCabang_(c, cabId))
      .slice()
      .sort((a, b) => (new Date(a.timestamp || 0).getTime() || 0) - (new Date(b.timestamp || 0).getTime() || 0));
    const latestCold = branchCold.length ? branchCold[branchCold.length - 1] : null;
    const activeShift = st.activeShift || null;
    const totalPoinMember = validSales.reduce((a, b) => a + Number(b.poin_didapat || 0), 0);

    const auditSys = S().getAuditSystem ? S().getAuditSystem() : { apj_nama: 'apt. Siti Rahma, S.Farm', kasir_nama: 'Budi Santoso (Kasir)', items: [] };
    const auditItems = Array.isArray(auditSys.items) ? auditSys.items : [];
    const auditChecked = auditItems.filter((it) => it.checked).length;
    const auditPct = auditItems.length ? Math.round((auditChecked / auditItems.length) * 100) : 100;
    const stockScore = Math.max(40, Math.min(100, 100 - warningEdCount * 4 - defectaCount * 3));
    const readiness = Math.max(55, Math.min(100, Math.round((stockScore * 0.65) + (auditPct * 0.35))));
    const dashArray = Math.round((readiness / 100) * 251.2);

    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const days = [];
    const omzSeries = [];
    const labaSeries = [];
    for (let offset = 6; offset >= 0; offset--) {
      const dt = new Date(nowDt.getFullYear(), nowDt.getMonth(), nowDt.getDate() - offset);
      const iso = toLocalYmd_(dt);
      days.push(offset === 0 ? 'Hari Ini' : dayNames[dt.getDay()]);
      const daySales = validSales.filter((p) => toLocalYmd_(p.tanggal) === iso);
      omzSeries.push(daySales.reduce((acc, p) => acc + Number(p.grand_total || 0), 0));
      labaSeries.push(seeCost ? daySales.reduce((acc, p) => acc + Number(p.estimasi_margin || 0), 0) : 0);
    }
    const maxVal = Math.max(...omzSeries, 100000);
    const total7Hari = omzSeries.reduce((a, b) => a + b, 0);
    const avg7Hari = Math.round(total7Hari / 7);
    const trendCoords = omzSeries.map((val, idx) => {
      const x = 15 + idx * 45;
      const y = 44 - Math.round((Number(val || 0) / maxVal) * 34);
      return `${x},${y}`;
    }).join(' ');

    const payTotals = {};
    validSales.forEach((p) => {
      const mt = String(p.metode_bayar || 'TUNAI').toUpperCase();
      payTotals[mt] = (payTotals[mt] || 0) + Number(p.grand_total || 0);
    });
    const payRows = Object.keys(payTotals).map((k) => ({ name: k, total: payTotals[k] })).sort((a, b) => b.total - a.total);
    const payDenom = payRows.reduce((s, r) => s + r.total, 0) || 1;
    const payColors = { TUNAI: '#10B981', QRIS: '#0066FE', TRANSFER: '#0284C7', SPLIT: '#F59E0B', TEMPO: '#D97706' };

    const soldMap = {};
    (st.detailPenjualan || []).forEach((d) => {
      if (d.id_transaksi && validTrxIds.size && !validTrxIds.has(d.id_transaksi)) return;
      const key = d.id_obat || d.nama_dagang;
      if (!key) return;
      if (!soldMap[key]) {
        const ob = st.masterObat.find((o) => o.id_obat === d.id_obat);
        soldMap[key] = { id_obat: d.id_obat || '', nama: d.nama_dagang || (ob && ob.nama_dagang) || key, qty: 0, omz: 0 };
      }
      soldMap[key].qty += Number(d.qty || 1);
      soldMap[key].omz += Number(d.subtotal_item || (Number(d.qty || 1) * Number(d.harga_jual || 0)));
    });
    const topObatList = Object.values(soldMap).sort((a, b) => b.qty - a.qty).slice(0, 5);
    const activeUserDisplay = (S().getRole() === 'Pemilik' ? pemilikNama : ((st.user && st.user.nama_lengkap) || pemilikNama));
    const vsAvgPct = avg7Hari > 0 && omzetHariIni > 0 ? Math.round(((omzetHariIni - avg7Hari) / avg7Hari) * 100) : null;
    const topMaxQty = topObatList.length ? Math.max(1, Number(topObatList[0].qty || 1)) : 1;

    // Ringkasan Penjualan Berbasis Rentang Waktu (Apotek Digital)
    const rangeValidSales = validSales.filter((p) => _inDashRange(p.tanggal, range));
    const rangeReturSales = returSales.filter((p) => _inDashRange(p.tanggal, range));
    const rangeSalesSum = rangeValidSales.reduce((s, p) => s + Number(p.grand_total || 0), 0);
    const rangeReturSum = rangeReturSales.reduce((s, p) => s + Number(p.grand_total || 0), 0);
    const rangeLostSales = _getDashLostSales(range);
    const rangeLostQty = rangeLostSales.reduce((s, l) => s + Number(l.qty || 1), 0);

    // Analisis Toko: Freq Jam (7 hari terakhir) & Freq Hari (4 pekan terakhir)
    const sevenDaysRange = { startYmd: _shiftLocalYmd(nowDt, -6), endYmd: todayIso };
    const sales7d = validSales.filter((p) => _inDashRange(p.tanggal, sevenDaysRange));
    const hourBuckets = [
      { label: '07-09', shortLabel: '07-09', cnt: 0, hFrom: 0, hTo: 9 },
      { label: '10-12', shortLabel: '10-12', cnt: 0, hFrom: 10, hTo: 12 },
      { label: '13-15', shortLabel: '13-15', cnt: 0, hFrom: 13, hTo: 15 },
      { label: '16-18', shortLabel: '16-18', cnt: 0, hFrom: 16, hTo: 18 },
      { label: '19-21', shortLabel: '19-21', cnt: 0, hFrom: 19, hTo: 21 },
      { label: '22+', shortLabel: '22+', cnt: 0, hFrom: 22, hTo: 23 }
    ];
    sales7d.forEach((p) => {
      const m = /T(\d{2}):/.exec(String(p.tanggal || '')) || / (\d{2}):/.exec(String(p.tanggal || ''));
      const hr = m ? Number(m[1]) : 12;
      const bk = hourBuckets.find((b) => hr >= b.hFrom && hr <= b.hTo) || hourBuckets[1];
      bk.cnt += 1;
    });

    const fourWeeksRange = { startYmd: _shiftLocalYmd(nowDt, -27), endYmd: todayIso };
    const sales4w = validSales.filter((p) => _inDashRange(p.tanggal, fourWeeksRange));
    const weekdayOrder = [1, 2, 3, 4, 5, 6, 0];
    const weekdayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const weekdayBuckets = weekdayOrder.map((wd) => ({ wd, label: weekdayNames[wd], shortLabel: weekdayNames[wd], cnt: 0 }));
    sales4w.forEach((p) => {
      const dt = new Date(toLocalYmd_(p.tanggal) + 'T12:00:00');
      const bk = weekdayBuckets.find((b) => b.wd === dt.getDay());
      if (bk) bk.cnt += 1;
    });

    // Performa KPI Karyawan per Tahun
    const yearSales = validSales.filter((p) => toLocalYmd_(p.tanggal).startsWith(String(dashKpiYear)));
    const staffMap = {};
    (st.staffDirectory || []).forEach((u) => {
      const id = String(u.id_user || u.username || u.nama_lengkap || '');
      if (id) staffMap[id] = { label: u.nama_lengkap || u.username || id, shortLabel: String(u.nama_lengkap || id).split(' ')[0].slice(0, 10), trx: 0, omz: 0 };
    });
    yearSales.forEach((p) => {
      const key = String(p.kasir_id || p.dibuat_oleh || 'Kasir');
      if (!staffMap[key]) {
        staffMap[key] = { label: key, shortLabel: key.split(' ')[0].slice(0, 10), trx: 0, omz: 0 };
      }
      staffMap[key].trx += 1;
      staffMap[key].omz += Number(p.grand_total || 0);
    });
    const kpiStaffRows = Object.values(staffMap).sort((a, b) => b.trx - a.trx || b.omz - a.omz);

    // Tipe Produk breakdown
    const bpomCounts = {};
    (st.masterObat || []).forEach((o) => {
      const g = String(o.golongan_bpom || 'BEBAS').toUpperCase();
      bpomCounts[g] = (bpomCounts[g] || 0) + 1;
    });
    const bpomSummary = Object.keys(bpomCounts).slice(0, 4).map((g) => `${g}: ${bpomCounts[g]}`).join(' • ') || 'Belum ada produk';

    const opsTiles = [
      canOnline ? {
        title: 'Pesanan E-Apotek / WA',
        value: onlinePendingCount + ' Perlu Proses',
        valCls: onlinePendingCount ? 'text-blue-600' : '',
        badge: branchOnline.length + ' total',
        badgeCls: 'bpom-terbatas',
        icoBg: 'bg-blue-500/10 text-blue-600',
        ico: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
        onClick: `navigateView('omnichannel','')`
      } : {
        title: 'Pelayanan Kasir POS',
        value: todaySales.length + ' Nota Hari Ini',
        valCls: 'text-blue-600',
        badge: validSales.length + ' total',
        badgeCls: 'bpom-terbatas',
        icoBg: 'bg-blue-500/10 text-blue-600',
        ico: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.01M10 8h8M6 12h12M6 16h6"/>',
        onClick: canPos ? `navigateView('pos','kasir')` : ''
      },
      {
        title: 'Pemeriksaan Kesehatan',
        value: poctTodayCount + ' Hari Ini',
        valCls: 'text-emerald-600',
        badge: branchPoct.length + ' riwayat',
        badgeCls: 'bpom-bebas',
        icoBg: 'bg-emerald-500/10 text-emerald-600',
        ico: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
        onClick: canPoct ? `navigateView('pemeriksaan','semua')` : ''
      },
      {
        title: seeCost ? 'Surat Pesanan PBF' : 'Katalog Produk Aktif',
        value: seeCost ? (spOpenCount + ' SP Terbuka') : (st.masterObat.length + ' Produk'),
        valCls: '',
        badge: seeCost ? (branchSp.length + ' SP') : (activeBatches.length + ' batch'),
        badgeCls: seeCost && spOpenCount ? 'bpom-prekursor' : 'bpom-bebas',
        icoBg: 'bg-amber-500/10 text-amber-600',
        ico: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
        onClick: seeCost && canDefecta ? `navigateView('faktur','sp')` : (!seeCost && canObat ? `navigateView('obat','obat')` : '')
      },
      {
        title: 'Monitor Suhu (Ruang &amp; Kulkas)',
        value: latestCold ? (Number(latestCold.suhu_celcius || 0).toFixed(1) + '&deg;C') : 'Belum Dicatat',
        valCls: latestCold ? (String(latestCold.status_alarm || 'NORMAL') !== 'NORMAL' ? 'text-red-600' : 'text-emerald-600') : 'text-amber-600',
        badge: latestCold ? S().esc(latestCold.status_alarm || 'NORMAL') : 'Catat Suhu',
        badgeCls: latestCold && String(latestCold.status_alarm || 'NORMAL') !== 'NORMAL' ? 'bpom-keras' : (latestCold ? 'bpom-bebas' : 'bpom-prekursor'),
        icoBg: latestCold && String(latestCold.status_alarm || 'NORMAL') !== 'NORMAL' ? 'bg-red-500/10 text-red-600' : 'bg-sky-500/10 text-sky-600',
        ico: '<path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0Z"/>',
        onClick: canGudang ? `navigateView('gudang','coldchain')` : ''
      }
    ];

    const priorityItems = [
      {
        label: 'Batch Kadaluarsa &amp; Near ED (&le;90h)',
        count: warningEdCount,
        dotCls: warningEdCount ? 'bg-red-500' : 'bg-emerald-500',
        pillCls: warningEdCount ? 'bg-red-500/15 text-red-600' : 'bg-slate-500/10 text-slate-500',
        onClick: canGudang ? `navigateView('gudang','batch')` : ''
      },
      {
        label: 'Item Defecta / Stok Menipis',
        count: defectaCount,
        dotCls: defectaCount ? 'bg-amber-500' : 'bg-emerald-500',
        pillCls: defectaCount ? 'bg-amber-500/15 text-amber-600' : 'bg-slate-500/10 text-slate-500',
        onClick: seeCost && canDefecta ? `navigateView('faktur','defecta')` : (canGudang ? `navigateView('gudang','batch')` : '')
      },
      {
        label: 'Antrean Validasi E-Resep APJ',
        count: erxAntre,
        dotCls: 'bg-blue-500',
        pillCls: 'bg-blue-500/15 text-blue-600',
        onClick: canErx ? `navigateView('klinis','erx')` : ''
      },
      {
        label: 'Pasien Kontrol Refill (&le;5 hari)',
        count: prbUrgentCount,
        dotCls: prbUrgentCount ? 'bg-blue-500' : 'bg-slate-400',
        pillCls: 'bg-blue-500/15 text-blue-600',
        onClick: canErx ? `navigateView('obat','pelanggan')` : ''
      }
    ];
    if (canOnline) {
      priorityItems.push({
        label: 'Pesanan E-Apotek / WA Perlu Proses',
        count: onlinePendingCount,
        dotCls: onlinePendingCount ? 'bg-emerald-500' : 'bg-slate-400',
        pillCls: 'bg-emerald-500/15 text-emerald-600',
        onClick: `navigateView('omnichannel','')`
      });
    }
    if (seeCost && canFin) {
      priorityItems.push({
        label: 'Tagihan PBF Tempo (&le;7h) &amp; Piutang',
        count: apNearDueCount + openPiutang.length,
        dotCls: (apNearDueCount + openPiutang.length) ? 'bg-amber-500' : 'bg-emerald-500',
        pillCls: 'bg-amber-500/15 text-amber-600',
        onClick: `navigateView('finance','${openPiutang.length && !apNearDueCount ? 'piutang' : 'hutang'}')`
      });
    }

    return `<div class="space-y-5 ons-view-enter">
      ${tabBarHtml}

      <!-- Fluid Hero Greeting Cockpit -->
      <div class="ons-hero-welcome p-4 sm:p-6 space-y-4 rounded-2xl shadow-sm border" style="border-color:var(--ons-border)">
        <div class="flex items-start gap-3.5 sm:gap-4 min-w-0">
          <div class="relative shrink-0 pt-0.5">
            <img src="${S().esc(fotoPem && S().getRole() === 'Pemilik' ? fotoPem : usahaLogo)}" alt="${S().esc(usahaNama)}" class="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border-2 border-white/90 dark:border-slate-700 shadow-md object-cover bg-white"/>
            <span class="absolute -bottom-1 -right-1 w-4 h-4 rounded-full ${activeShift ? 'bg-emerald-500' : 'bg-amber-500'} border-2 border-white dark:border-slate-800" title="${activeShift ? 'Shift Kasir Terbuka' : 'Shift Belum Dibuka'}"></span>
          </div>
          <div class="flex-1 min-w-0 space-y-1.5">
            <div class="flex flex-wrap items-center gap-1.5">
              <span class="badge-bpom bpom-bebas font-semibold">${S().esc(fullDateLabel)}</span>
              <span class="badge-bpom bpom-terbatas font-semibold">${(S().isMultiBranchEnabled && S().isMultiBranchEnabled()) ? ('Cabang ' + S().esc(cabId)) : 'Outlet Utama'} &bull; ${S().esc(S().getRole())}</span>
              ${canShift ? `<button type="button" onclick="navigateView('pos','tutup-shift')" class="badge-bpom ${activeShift ? 'bpom-bebas' : 'bpom-prekursor'} cursor-pointer font-semibold">${activeShift ? 'Shift Aktif: ' + S().esc(activeShift.kasir_nama || activeShift.id_shift || 'Buka') : 'Shift Belum Dibuka'}</button>` : ''}
            </div>
            <h1 class="text-lg sm:text-2xl font-extrabold tracking-tight leading-snug break-words" style="color:var(--ons-text-main)">${greetText}, ${S().esc(activeUserDisplay)}</h1>
            <div class="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs sm:text-sm leading-relaxed" style="color:var(--ons-text-soft)">
              <span class="font-semibold" style="color:var(--ons-text-main)">${S().esc(usahaNama)}</span>
              <span aria-hidden="true" class="opacity-45">&bull;</span>
              <span class="font-mono-num">SIA: ${S().esc(prof.no_sia || '-')}</span>
              <span aria-hidden="true" class="opacity-45">&bull;</span>
              <span>${S().esc(prof.jam_operasional || 'Siap Melayani')}</span>
            </div>
          </div>
        </div>
        <div class="pt-3.5 border-t flex flex-wrap items-center justify-between gap-2.5" style="border-color:var(--ons-border)">
          <div class="flex flex-wrap items-center gap-2">
            ${canPos ? `<button onclick="navigateView('pos','kasir')" class="ons-btn ons-btn-primary text-xs px-4 shadow-sm font-bold flex items-center gap-1.5"><svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.01M10 8h8M6 12h12M6 16h6"/></svg><span>Buka Kasir POS (F2)</span></button>` : ''}
            ${canPoct ? `<button onclick="navigateView('pemeriksaan','semua')" class="ons-btn ons-btn-ghost text-xs">Pemeriksaan Pasien</button>` : ''}
            ${canObat ? `<button onclick="navigateView('obat')" class="ons-btn ons-btn-ghost text-xs">Master Obat (${st.masterObat.length})</button>` : ''}
            <button type="button" onclick="if(window.openCommandPalette)window.openCommandPalette()" class="ons-btn ons-btn-ghost text-xs" title="Pusat Pencarian &amp; Navigasi Cepat">Cari Cepat <span class="ons-shortcut-kbd ml-1">Ctrl+K</span></button>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            ${seeCost ? `<button onclick="window.openOwnerDailyDigestModal()" class="ons-btn ons-btn-emerald text-xs font-semibold" title="Kirim Ringkasan Harian ke WA Pemilik">Rekap WA Pemilik</button>` : ''}
            <button onclick="bootLoadState(true)" class="ons-btn ons-btn-ghost text-xs" title="Segarkan Data Terbaru">Segarkan</button>
          </div>
        </div>
      </div>

      ${st.masterObat.length === 0 ? `<div class="ons-card p-4 border-l-4 flex flex-wrap items-center justify-between gap-3" style="border-left-color:#0066FE;background:rgba(0,102,254,0.06)">
        <div class="min-w-0">
          <div class="font-bold text-sm">Belum Ada Produk Obat di ${(S().isMultiBranchEnabled && S().isMultiBranchEnabled()) ? 'Katalog Cabang Ini' : 'Katalog Apotek Ini'}</div>
          <p class="text-xs" style="color:var(--ons-text-soft)">Tambahkan daftar obat melalui menu <b>Master Katalog Obat</b> atau catat penerimaan barang lewat <b>Faktur Masuk</b> agar transaksi POS dan pemantauan stok langsung aktif.</p>
        </div>
        ${canObat ? `<button type="button" onclick="navigateView('obat')" class="ons-btn ons-btn-primary text-xs shrink-0">Buka Master Katalog Obat &rarr;</button>` : ''}
      </div>` : ''}

      <!-- 4 Kartu KPI Utama Executive dengan Aksen Semantik & Emblim Rp -->
      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
        <div class="ons-kpi-card is-blue" ${canPos ? `onclick="navigateView('pos','riwayat')"` : ''}>
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <div class="text-xs font-semibold flex flex-wrap items-center gap-1.5" style="color:var(--ons-text-soft)">
                <span>Omzet Penjualan Hari Ini</span>
                ${vsAvgPct !== null ? `<span class="px-1.5 py-0.5 rounded-full text-[10px] font-bold font-mono-num ${vsAvgPct >= 0 ? 'bg-emerald-500/15 text-emerald-600' : 'bg-amber-500/15 text-amber-600'}">${vsAvgPct >= 0 ? '+' : ''}${vsAvgPct}% vs avg</span>` : ''}
              </div>
              <div class="text-xl xl:text-[22px] font-extrabold font-mono-num mt-1.5 text-blue-600 tracking-tight leading-tight break-words">${S().rp(omzetHariIni)}</div>
            </div>
            <span class="ons-kpi-ico bg-blue-500/10 text-blue-600 font-extrabold text-[15px] tracking-tight" aria-hidden="true">Rp</span>
          </div>
          <div class="mt-3 pt-2.5 border-t flex items-center justify-between gap-2 text-[11px]" style="border-color:var(--ons-border)">
            <span class="font-semibold truncate" style="color:var(--ons-text-soft)"><b class="text-emerald-600">${todaySales.length} nota</b> hari ini &bull; Total ${S().rp(omzetTotal)}</span>
            ${canPos ? `<span class="font-semibold text-blue-600 shrink-0">Riwayat &rarr;</span>` : ''}
          </div>
        </div>

        ${seeCost ? `<div class="ons-kpi-card is-emerald" ${canFin ? `onclick="navigateView('finance','pnl')"` : ''}>
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <div class="text-xs font-semibold" style="color:var(--ons-text-soft)">Estimasi Laba Kotor</div>
              <div class="text-xl xl:text-[22px] font-extrabold font-mono-num mt-1.5 text-emerald-600 tracking-tight leading-tight break-words">${S().rp(omzetHariIni > 0 ? marginHariIni : marginTotal)}</div>
            </div>
            <span class="ons-kpi-ico bg-emerald-500/10 text-emerald-600 font-extrabold text-[13px] tracking-tight" aria-hidden="true">${marginPct}%</span>
          </div>
          <div class="mt-3 pt-2.5 border-t flex items-center justify-between gap-2 text-[11px]" style="border-color:var(--ons-border)">
            <span class="truncate" style="color:var(--ons-text-soft)">${omzetHariIni > 0 ? 'Hari ini &bull; Akumulasi ' + S().rp(marginTotal) : 'Akumulasi tercatat (' + validSales.length + ' nota)'}</span>
            ${canFin ? `<span class="font-semibold text-emerald-600 shrink-0">Buka P&amp;L &rarr;</span>` : ''}
          </div>
        </div>` : `<div class="ons-kpi-card is-emerald" ${canPoct ? `onclick="navigateView('pemeriksaan','semua')"` : ''}>
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <div class="text-xs font-semibold" style="color:var(--ons-text-soft)">Pemeriksaan Pasien (POCT)</div>
              <div class="text-xl xl:text-[22px] font-extrabold font-mono-num mt-1.5 text-emerald-600 tracking-tight leading-tight">${poctTodayCount} Pasien</div>
            </div>
            <span class="ons-kpi-ico bg-emerald-500/10 text-emerald-600"><svg viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg></span>
          </div>
          <div class="mt-3 pt-2.5 border-t flex items-center justify-between gap-2 text-[11px]" style="border-color:var(--ons-border)">
            <span class="truncate" style="color:var(--ons-text-soft)">${branchPoct.length} riwayat &bull; ${totalPoinMember} poin member</span>
            ${canPoct ? `<span class="font-semibold text-emerald-600 shrink-0">Periksa &rarr;</span>` : ''}
          </div>
        </div>`}

        <div class="ons-kpi-card ${warningEdCount ? 'is-red' : 'is-emerald'}" ${canGudang ? `onclick="navigateView('gudang','batch')"` : ''}>
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <div class="text-xs font-semibold" style="color:var(--ons-text-soft)">Kesehatan Stok &amp; FEFO</div>
              <div class="text-2xl font-extrabold font-mono-num mt-1.5 tracking-tight ${warningEdCount ? 'text-red-600' : 'text-emerald-600'}">${warningEdCount} Batch ED</div>
            </div>
            <span class="ons-kpi-ico ${warningEdCount ? 'bg-red-500/10 text-red-600' : 'bg-emerald-500/10 text-emerald-600'}"><svg viewBox="0 0 24 24"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/></svg></span>
          </div>
          <div class="mt-3 pt-2.5 border-t flex items-center justify-between gap-2 text-[11px]" style="border-color:var(--ons-border)">
            <span class="${defectaCount ? 'text-amber-600 font-bold' : 'text-emerald-600 font-semibold'} truncate">${expiredBatches.length ? expiredBatches.length + ' kadaluarsa &bull; ' : ''}${defectaCount} item menipis</span>
            ${canGudang ? `<span class="shrink-0 font-semibold" style="color:var(--ons-text-soft)">Cek Gudang &rarr;</span>` : ''}
          </div>
        </div>

        ${seeCost ? `<div class="ons-kpi-card is-amber" ${canFin ? `onclick="navigateView('finance','hutang')"` : ''}>
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <div class="text-xs font-semibold" style="color:var(--ons-text-soft)">Hutang PBF &amp; Piutang</div>
              <div class="text-xl xl:text-[22px] font-extrabold font-mono-num mt-1.5 text-amber-600 tracking-tight leading-tight break-words">${S().rp(apTotal)}</div>
            </div>
            <span class="ons-kpi-ico bg-amber-500/10 text-amber-600"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 10h10M7 14h6"/></svg></span>
          </div>
          <div class="mt-3 pt-2.5 border-t flex items-center justify-between gap-2 text-[11px]" style="border-color:var(--ons-border)">
            <span class="truncate" style="color:var(--ons-text-soft)">${openFaktur.length} faktur (${apNearDueCount} tempo &le;7h)${piutangTotal > 0 ? ' &bull; Piutang ' + S().rp(piutangTotal) : ''}</span>
            ${canFin ? `<span class="font-semibold text-amber-600 shrink-0">Kelola AP &rarr;</span>` : ''}
          </div>
        </div>` : `<div class="ons-kpi-card is-amber" ${canShift ? `onclick="navigateView('pos','tutup-shift')"` : ''}>
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <div class="text-xs font-semibold" style="color:var(--ons-text-soft)">Status Shift &amp; Laci Kas</div>
              <div class="text-2xl font-extrabold font-mono-num mt-1.5 tracking-tight ${activeShift ? 'text-emerald-600' : 'text-amber-600'}">${activeShift ? 'Shift Buka' : 'Belum Buka'}</div>
            </div>
            <span class="ons-kpi-ico bg-amber-500/10 text-amber-600"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></span>
          </div>
          <div class="mt-3 pt-2.5 border-t flex items-center justify-between gap-2 text-[11px]" style="border-color:var(--ons-border)">
            <span class="truncate" style="color:var(--ons-text-soft)">${activeShift ? ('Modal awal ' + S().rp(activeShift.modal_awal || 0)) : 'Klik untuk buka / rekap shift'}</span>
            ${canShift ? `<span class="font-semibold text-amber-600 shrink-0">Shift Kasir &rarr;</span>` : ''}
          </div>
        </div>`}
      </div>

      <!-- SEKSI APOTEK DIGITAL 1: - Ringkasan Penjualan -->
      <div class="space-y-3">
        <div class="ons-dash-sec-title">
          <span class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>Ringkasan Penjualan Apotek</span>
          </span>
          ${_renderDashFilterBar(range, `<button type="button" onclick="window.setDashboardTab('penjualan')" class="ons-btn ons-btn-ghost text-xs py-1 px-2.5">Detail Penjualan &rarr;</button>`)}
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div class="ons-dash-stat-tile ${canPos ? 'is-clickable' : ''}" ${canPos ? `onclick="navigateView('pos','riwayat')"` : ''}>
            <span class="ons-dash-tile-ico bg-emerald-500/12 text-emerald-600 font-extrabold text-sm">Rp</span>
            <div class="min-w-0">
              <div class="text-xs font-semibold" style="color:var(--ons-text-soft)">Total Penjualan (${S().esc(range.label)})</div>
              <div class="text-lg font-extrabold font-mono-num mt-0.5">${rangeValidSales.length} nota &bull; <span class="text-emerald-600">${S().rp(rangeSalesSum)}</span></div>
            </div>
          </div>
          <div class="ons-dash-stat-tile ${canPos ? 'is-clickable' : ''}" ${canPos ? `onclick="navigateView('pos','riwayat')"` : ''}>
            <span class="ons-dash-tile-ico bg-amber-500/12 text-amber-600"><svg viewBox="0 0 24 24" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg></span>
            <div class="min-w-0">
              <div class="text-xs font-semibold" style="color:var(--ons-text-soft)">Retur Penjualan</div>
              <div class="text-lg font-extrabold font-mono-num mt-0.5 text-amber-600">${rangeReturSales.length} nota retur (${S().rp(rangeReturSum)})</div>
            </div>
          </div>
          <div class="ons-dash-stat-tile is-clickable" onclick="window.openDashLostSaleModal()">
            <span class="ons-dash-tile-ico bg-rose-500/12 text-rose-600"><svg viewBox="0 0 24 24" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m10 10 4 4m0-4-4 4"/></svg></span>
            <div class="min-w-0 flex-1">
              <div class="text-xs font-semibold flex items-center justify-between gap-1" style="color:var(--ons-text-soft)"><span>Penjualan Tertolak</span><span class="text-[10px] text-rose-600 font-bold">+ Catat</span></div>
              <div class="text-lg font-extrabold font-mono-num mt-0.5 text-rose-600">${rangeLostSales.length} kasus (${rangeLostQty} item)</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Strip Ringkas Operasional & Klinis Berikon -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        ${opsTiles.map((tl) => `
          <div class="ons-ops-tile ${tl.onClick ? 'is-clickable' : ''}" ${tl.onClick ? `onclick="${tl.onClick}"` : ''}>
            <div class="flex items-center gap-3 min-w-0">
              <span class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${tl.icoBg}">
                <svg viewBox="0 0 24 24" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">${tl.ico}</svg>
              </span>
              <div class="min-w-0">
                <div class="text-[11px] truncate" style="color:var(--ons-text-soft)">${tl.title}</div>
                <div class="font-extrabold text-sm mt-0.5 font-mono-num truncate ${tl.valCls}">${tl.value}</div>
              </div>
            </div>
            <span class="badge-bpom ${tl.badgeCls} shrink-0">${tl.badge}</span>
          </div>
        `).join('')}
      </div>

      <!-- SEKSI APOTEK DIGITAL 2: - Analisis Toko (Frekuensi Jam & Hari) -->
      <div class="space-y-3">
        <div class="ons-dash-sec-title">
          <span class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
            <span>Analisis Waktu Transaksi Toko</span>
          </span>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div class="ons-card p-5 space-y-2">
            ${_renderSvgVerticalBars(hourBuckets, [{ key: 'cnt', label: 'Freq. Penjualan 7 Hari Terakhir Berdasarkan Jam', color: '#0EA5E9', suffix: ' transaksi' }], { ariaLabel: 'Frekuensi penjualan berdasarkan jam', emptyMsg: 'Belum ada transaksi dalam 7 hari terakhir.' })}
          </div>
          <div class="ons-card p-5 space-y-2">
            ${_renderSvgVerticalBars(weekdayBuckets, [{ key: 'cnt', label: 'Freq. Penjualan 4 Pekan Terakhir Berdasarkan Hari', color: '#10B981', suffix: ' transaksi' }], { ariaLabel: 'Frekuensi penjualan berdasarkan hari', emptyMsg: 'Belum ada transaksi dalam 4 pekan terakhir.' })}
          </div>
        </div>
      </div>

      <!-- SEKSI APOTEK DIGITAL 3: - Database Apotek -->
      <div class="space-y-3">
        <div class="ons-dash-sec-title">
          <span class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
            <span>Database &amp; Ekosistem Apotek</span>
          </span>
          ${canObat ? `<button type="button" onclick="navigateView('obat','obat')" class="ons-btn ons-btn-ghost text-xs py-1 px-2.5">Kelola Master Data &rarr;</button>` : ''}
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5 lg:col-span-2">
            <div class="ons-dash-stat-tile ${canObat ? 'is-clickable' : ''}" ${canObat ? `onclick="navigateView('obat','pelanggan')"` : ''}>
              <span class="ons-dash-tile-ico bg-emerald-500/12 text-emerald-600"><svg viewBox="0 0 24 24" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/></svg></span>
              <div>
                <div class="text-xs font-semibold" style="color:var(--ons-text-soft)">Database Pelanggan</div>
                <div class="text-xl font-extrabold font-mono-num text-emerald-600">${(st.members || []).length}</div>
              </div>
            </div>
            <div class="ons-dash-stat-tile ${(canObat && seeCost) ? 'is-clickable' : ''}" ${(canObat && seeCost) ? `onclick="navigateView('obat','supplier')"` : ''}>
              <span class="ons-dash-tile-ico bg-amber-500/12 text-amber-600"><svg viewBox="0 0 24 24" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/></svg></span>
              <div>
                <div class="text-xs font-semibold" style="color:var(--ons-text-soft)">Database Supplier PBF</div>
                <div class="text-xl font-extrabold font-mono-num text-amber-600">${(st.supplierPbf || []).length}</div>
              </div>
            </div>
            <div class="ons-dash-stat-tile ${canObat ? 'is-clickable' : ''}" ${canObat ? `onclick="navigateView('obat','obat')"` : ''}>
              <span class="ons-dash-tile-ico bg-blue-500/12 text-blue-600"><svg viewBox="0 0 24 24" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg></span>
              <div>
                <div class="text-xs font-semibold" style="color:var(--ons-text-soft)">Database Produk</div>
                <div class="text-xl font-extrabold font-mono-num text-blue-600">${(st.masterObat || []).length}</div>
              </div>
            </div>
            <div class="ons-dash-stat-tile ${canObat ? 'is-clickable' : ''}" ${canObat ? `onclick="navigateView('obat','dokter')"` : ''}>
              <span class="ons-dash-tile-ico bg-rose-500/12 text-rose-600"><svg viewBox="0 0 24 24" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><path d="M12 11v4m-2-2h4"/></svg></span>
              <div>
                <div class="text-xs font-semibold" style="color:var(--ons-text-soft)">Database Dokter</div>
                <div class="text-xl font-extrabold font-mono-num text-rose-600">${(st.masterDokter || []).length}</div>
              </div>
            </div>
          </div>
          <button type="button" onclick="window.openDashTipeProdukModal()" class="ons-dash-status-card justify-start group">
            <div class="ons-dash-status-head" style="background:rgba(16,185,129,0.12);color:#047857">
              <span>Tipe Produk &amp; Golongan BPOM</span>
              <span aria-hidden="true">&rsaquo;</span>
            </div>
            <div class="p-4 text-left space-y-2 flex-1 flex flex-col justify-between">
              <div class="text-xs leading-relaxed" style="color:var(--ons-text-soft)">${S().esc(bpomSummary)}</div>
              <div class="text-[11px] font-bold text-blue-600 dark:text-blue-400 group-hover:underline">Klik untuk rincian komposisi tipe produk &rarr;</div>
            </div>
          </button>
        </div>
      </div>

      <!-- SEKSI APOTEK DIGITAL 4: - Status Persediaan -->
      ${_renderDashStatusPersediaanSection(invStatus, seeCost, canGudang, canDefecta, canFaktur)}

      <!-- Baris Tengah: Tren 7 Hari + Agenda Prioritas + Kepatuhan BPOM -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div class="ons-card p-5 lg:col-span-5 flex flex-col justify-between gap-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 class="font-bold text-sm">Tren ${seeCost ? 'Omzet vs Laba Kotor' : 'Penjualan'} 7 Hari</h3>
              <div class="text-[11px]" style="color:var(--ons-text-soft)">Performa harian ${(S().isMultiBranchEnabled && S().isMultiBranchEnabled()) ? ('cabang ' + S().esc(cabId)) : 'outlet aktif'}</div>
            </div>
            <div class="flex items-center gap-2.5 text-[10px]">
              <span class="inline-flex items-center gap-1 font-semibold"><span class="w-2.5 h-2.5 rounded-full inline-block" style="background:#0066FE"></span> Omzet</span>
              ${seeCost ? `<span class="inline-flex items-center gap-1 font-semibold"><span class="w-2.5 h-2.5 rounded-full inline-block" style="background:#10B981"></span> Laba</span>` : ''}
            </div>
          </div>
          <div class="grid grid-cols-3 gap-2 text-center">
            <div class="p-2 rounded-xl border" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
              <div class="text-[10px]" style="color:var(--ons-text-soft)">Hari Ini</div>
              <div class="font-mono-num font-extrabold text-xs text-blue-600 truncate">${S().rp(omzetHariIni)}</div>
            </div>
            <div class="p-2 rounded-xl border" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
              <div class="text-[10px]" style="color:var(--ons-text-soft)">Total 7 Hari</div>
              <div class="font-mono-num font-extrabold text-xs truncate">${S().rp(total7Hari)}</div>
            </div>
            <div class="p-2 rounded-xl border" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
              <div class="text-[10px]" style="color:var(--ons-text-soft)">Rata-rata/Hr</div>
              <div class="font-mono-num font-extrabold text-xs text-emerald-600 truncate">${S().rp(avg7Hari)}</div>
            </div>
          </div>
          <svg viewBox="0 0 300 50" class="w-full h-10 overflow-visible">
            <defs>
              <linearGradient id="onsDashSparkGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stop-color="#0284C7"/>
                <stop offset="100%" stop-color="#10B981"/>
              </linearGradient>
            </defs>
            <polyline fill="none" stroke="url(#onsDashSparkGrad)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" points="${trendCoords}"/>
          </svg>
          <div class="ons-dash-chart-grid flex items-end gap-2 h-36 pt-2 px-1 rounded-xl border-b" style="border-color:var(--ons-border)">
            ${days.map((d, i) => {
              const vOmz = Number(omzSeries[i] || 0);
              const hOmz = vOmz > 0 ? Math.max(14, Math.round((vOmz / maxVal) * 100)) : 5;
              const vLaba = seeCost ? Number(labaSeries[i] || 0) : 0;
              const hLaba = seeCost && vLaba > 0 ? Math.max(10, Math.round((vLaba / maxVal) * 100)) : 0;
              const isToday = i === days.length - 1;
              return `<div class="flex-1 flex flex-col items-center gap-1 h-full justify-end" title="${d}: Omzet ${S().rp(vOmz)}${seeCost ? ' | Laba ' + S().rp(vLaba) : ''}">
                <div class="text-[10px] font-mono-num font-semibold" style="color:${isToday ? '#0066FE' : 'var(--ons-text-soft)'}">${vOmz >= 1000000 ? (vOmz / 1000000).toFixed(1) + 'jt' : (vOmz >= 1000 ? Math.round(vOmz / 1000) + 'rb' : '0')}</div>
                <div class="w-full max-w-[36px] h-full flex items-end justify-center gap-1">
                  <div class="flex-1 rounded-t-md transition-all" style="height:${hOmz}%;background:${isToday ? 'linear-gradient(180deg,#3B82F6,#0050CA)' : '#38BDF8'};opacity:${vOmz > 0 ? (isToday ? '1' : '0.82') : '0.22'};"></div>
                  ${seeCost ? `<div class="w-2/5 rounded-t-md transition-all" style="height:${Math.max(4, hLaba)}%;background:#10B981;opacity:${vLaba > 0 ? (isToday ? '1' : '0.85') : '0.22'};"></div>` : ''}
                </div>
                <div class="text-[10px] font-bold ${isToday ? 'text-blue-600 px-1.5 py-0.5 rounded bg-blue-500/10' : ''}">${d}</div>
              </div>`;
            }).join('')}
          </div>
        </div>

        <div class="ons-card p-5 lg:col-span-4 flex flex-col justify-between space-y-3">
          <div class="flex items-center justify-between gap-2">
            <div>
              <h3 class="font-bold text-sm">Agenda Prioritas Hari Ini</h3>
              <div class="text-[11px]" style="color:var(--ons-text-soft)">Klik item untuk menindaklanjuti antrean aktif</div>
            </div>
            <span class="text-[11px] font-mono-num px-2 py-0.5 rounded-lg border font-bold" style="background:var(--ons-bg-subtle);border-color:var(--ons-border);color:var(--ons-text-soft)">${todayIso}</span>
          </div>
          <div class="space-y-2 text-xs">
            ${priorityItems.map((it) => `
              <div class="ons-priority-pill" ${it.onClick ? `onclick="${it.onClick}"` : ''}>
                <span class="flex items-center gap-2 min-w-0 font-medium">
                  <span class="w-2 h-2 rounded-full shrink-0 ${it.dotCls}"></span>
                  <span class="truncate">${it.label}</span>
                </span>
                <span class="font-bold font-mono-num px-2.5 py-0.5 rounded-full shrink-0 ${it.pillCls}">${it.count}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="ons-card p-5 lg:col-span-3 flex flex-col items-center justify-between gap-2.5">
          <div class="w-full flex items-center justify-between gap-1">
            <h3 class="font-bold text-sm">Kepatuhan BPOM</h3>
            <span class="badge-bpom bpom-bebas font-bold">SIAP AUDIT</span>
          </div>
          <svg viewBox="0 0 120 120" class="w-28 h-28 my-0.5">
            <defs>
              <linearGradient id="onsAuditRingGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#10B981"/>
                <stop offset="100%" stop-color="#0284C7"/>
              </linearGradient>
            </defs>
            <circle cx="60" cy="60" r="40" fill="none" stroke="var(--ons-border)" stroke-width="11"/>
            <circle cx="60" cy="60" r="40" fill="none" stroke="url(#onsAuditRingGrad)" stroke-width="11" stroke-linecap="round"
              stroke-dasharray="${dashArray} 251.2" transform="rotate(-90 60 60)"/>
            <text x="60" y="57" text-anchor="middle" font-size="22" font-weight="800" fill="currentColor">${readiness}%</text>
            <text x="60" y="74" text-anchor="middle" font-size="9" fill="#64748B">Skor ${auditChecked}/${auditItems.length || 3} Audit</text>
          </svg>
          <div class="w-full space-y-1.5 text-xs pt-2 border-t" style="border-color:var(--ons-border)">
            ${auditItems.slice(0, 4).map((it) => `
              <label class="flex items-start justify-between gap-2 cursor-pointer">
                <span class="flex items-start gap-2 min-w-0">
                  <input type="checkbox" ${it.checked ? 'checked' : ''} onchange="window.toggleDashAuditCheck('${S().esc(it.id)}', this.checked)" class="accent-blue-600 rounded mt-0.5 shrink-0"/>
                  <span class="leading-snug">${S().esc(it.label)}</span>
                </span>
                <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-500/10 shrink-0">${S().esc(it.pj_role || 'APJ')}</span>
              </label>
            `).join('')}
          </div>
          <div class="w-full p-2.5 rounded-xl border text-[11px] space-y-1" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
            <div class="truncate" style="color:var(--ons-text-soft)">APJ: <b style="color:var(--ons-text)">${S().esc(auditSys.apj_nama || '-')}</b></div>
            <div class="truncate" style="color:var(--ons-text-soft)">Kasir: <b style="color:var(--ons-text)">${S().esc(auditSys.kasir_nama || '-')}</b></div>
            ${S().canAccessView('settings') ? `<button type="button" onclick="navigateView('settings','audit')" class="ons-btn ons-btn-ghost w-full text-[11px] py-1 mt-1">Edit Sistem Audit, APJ &amp; Kasir &rarr;</button>` : ''}
          </div>
        </div>
      </div>

      <!-- SEKSI APOTEK DIGITAL 5: - Performa KPI Karyawan -->
      <div class="space-y-3">
        <div class="ons-dash-sec-title">
          <span class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
            <span>Performa KPI Karyawan Apotek</span>
          </span>
          <div class="flex items-center gap-2">
            <select aria-label="Pilih Tahun KPI Karyawan" onchange="window.setDashKpiYear(this.value)" class="ons-input text-xs py-1 px-2.5 w-auto font-mono-num font-bold">
              ${[nowDt.getFullYear(), nowDt.getFullYear() - 1].map((yr) => `<option value="${yr}" ${String(dashKpiYear) === String(yr) ? 'selected' : ''}>${yr}</option>`).join('')}
            </select>
            <button type="button" onclick="window.openDashUserSalesModal()" class="ons-btn ons-btn-ghost text-xs py-1 px-2.5">Rincian Per User &rsaquo;</button>
          </div>
        </div>
        <div class="ons-card p-5">
          ${kpiStaffRows.length ? _renderSvgVerticalBars(
            kpiStaffRows,
            [{ key: 'trx', label: 'Jumlah Transaksi Selesai', color: '#0066FE', suffix: ' nota' }],
            { ariaLabel: 'Grafik KPI Transaksi Karyawan', unitHint: `Tahun ${dashKpiYear} (${yearSales.length} total nota)`, barSlotW: 85, emptyMsg: 'Belum ada transaksi karyawan pada tahun ini.' }
          ) : `<div class="py-6 text-center text-xs" style="color:var(--ons-text-soft)">Belum ada data performa karyawan pada tahun ${S().esc(dashKpiYear)}.</div>`}
        </div>
      </div>

      <!-- Baris Bawah: Komposisi Pembayaran + Top Obat Terlaris -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div class="ons-card p-5 lg:col-span-6 space-y-3">
          <div class="flex items-center justify-between gap-2">
            <div>
              <h3 class="font-bold text-sm">Komposisi Metode Pembayaran Kasir</h3>
              <div class="text-[11px]" style="color:var(--ons-text-soft)">${validSales.length} transaksi tercatat &bull; Total ${S().rp(omzetTotal)}</div>
            </div>
            ${canPos ? `<button onclick="navigateView('pos','riwayat')" class="ons-btn ons-btn-ghost text-xs py-1 px-2.5">Riwayat Transaksi &rarr;</button>` : ''}
          </div>
          ${payRows.length ? `<div class="ons-pay-mix-strip">
            ${payRows.map((ch) => {
              const pctRaw = Math.max(3, Math.round((ch.total / payDenom) * 100));
              const barColor = payColors[ch.name] || '#0066FE';
              return `<div style="width:${pctRaw}%;background:${barColor}" title="${S().esc(ch.name)}: ${pctRaw}%"></div>`;
            }).join('')}
          </div>` : ''}
          <div class="space-y-3 text-xs pt-1">
            ${payRows.length ? payRows.map((ch) => {
              const pct = Math.min(100, Math.max(4, Math.round((ch.total / payDenom) * 100)));
              const barColor = payColors[ch.name] || '#0066FE';
              return `<div>
                <div class="flex justify-between font-semibold mb-1">
                  <span class="inline-flex items-center gap-1.5"><span class="w-2 h-2 rounded-full inline-block" style="background:${barColor}"></span>${S().esc(ch.name)}</span>
                  <span class="font-mono-num">${S().rp(ch.total)} (${pct}%)</span>
                </div>
                <div class="ons-stock-track"><div class="ons-stock-fill" style="width:${pct}%;background:${barColor};"></div></div>
              </div>`;
            }).join('') : '<div class="py-6 text-center rounded-xl border border-dashed" style="color:var(--ons-text-soft);border-color:var(--ons-border)">Belum ada penjualan tercatat pada periode ini.</div>'}
          </div>
        </div>
        <div class="ons-card p-5 lg:col-span-6 space-y-3">
          <div class="flex items-center justify-between gap-2">
            <div>
              <h3 class="font-bold text-sm">Top Obat Terlaris (Fast Moving)</h3>
              <div class="text-[11px]" style="color:var(--ons-text-soft)">Produk paling sering terjual dari kasir POS</div>
            </div>
            ${canObat ? `<button onclick="navigateView('obat')" class="ons-btn ons-btn-ghost text-xs py-1 px-2.5">Buka Master Obat &rarr;</button>` : ''}
          </div>
          <div class="space-y-2 text-xs">
            ${topObatList.length ? topObatList.map((item, idx) => {
              const sharePct = Math.max(10, Math.round((Number(item.qty || 0) / topMaxQty) * 100));
              const rankBadgeCls = idx === 0 ? 'bg-amber-500 text-white' : (idx < 3 ? 'bg-blue-600 text-white' : 'bg-slate-500/20 text-slate-600 dark:text-slate-300');
              const rankIcon = idx === 0 ? '🥇 #1' : (idx === 1 ? '🥈 #2' : (idx === 2 ? '🥉 #3' : '#' + (idx + 1)));
              return `<div class="p-2.5 rounded-xl border transition hover:border-blue-500 space-y-1.5" style="border-color:var(--ons-border);background:var(--ons-bg-subtle)">
                <div class="flex items-center justify-between gap-2">
                  <div class="flex items-center gap-2.5 min-w-0">
                    <span class="px-2 py-0.5 rounded-md ${rankBadgeCls} font-extrabold text-[10px] flex items-center justify-center shrink-0 font-mono-num">${rankIcon}</span>
                    <span class="font-semibold truncate">${S().esc(item.nama)}</span>
                  </div>
                  <div class="font-mono-num shrink-0 text-right">
                    <b>${item.qty}</b> unit &bull; <span class="text-blue-600 font-bold">${S().rp(item.omz)}</span>
                  </div>
                </div>
                <div class="h-1.5 rounded-full overflow-hidden" style="background:var(--ons-border)">
                  <div class="h-full rounded-full ${idx === 0 ? 'bg-amber-500' : 'bg-blue-500'}" style="width:${sharePct}%"></div>
                </div>
              </div>`;
            }).join('') : '<div class="py-6 text-center rounded-xl border border-dashed" style="color:var(--ons-text-soft);border-color:var(--ons-border)">Top produk otomatis terhitung setelah transaksi kasir berlangsung.</div>'}
          </div>
        </div>
      </div>

      <!-- Radar Kadaluarsa FEFO -->
      <div class="ons-card p-5">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <h3 class="font-bold text-sm">Radar Batch Mendekati Kadaluarsa (FEFO Terdekat)</h3>
            <p class="text-[11px]" style="color:var(--ons-text-soft)">Prioritaskan penjualan batch aktif ${(S().isMultiBranchEnabled && S().isMultiBranchEnabled()) ? ('cabang ' + S().esc(cabId)) : 'apotek'} yang paling cepat mendekati tanggal kedaluwarsa.</p>
          </div>
          <div class="flex flex-wrap items-center gap-1.5">
            <span class="badge-bpom ${expiredBatches.length ? 'bpom-keras' : 'bpom-bebas'} font-mono-num">${expiredBatches.length} Expired</span>
            <span class="badge-bpom ${nearEdBatches.length ? 'bpom-prekursor' : 'bpom-bebas'} font-mono-num">${nearEdBatches.length} Near ED (&le;90h)</span>
            ${canGudang ? `<button onclick="navigateView('gudang','batch')" class="ons-btn ons-btn-ghost text-xs ml-1">Kelola Gudang &amp; Recall &rarr;</button>` : ''}
          </div>
        </div>
        ${activeBatches.length ? `<div class="ons-table-wrap">
          <table class="ons-table">
            <thead><tr><th>Nama Obat</th><th>No. Batch</th><th>Tanggal ED</th><th>Sisa Hari</th><th>Stok Sisa</th><th>Aksi</th></tr></thead>
            <tbody>
              ${activeBatches.slice().sort((a, b) => String(a.tgl_kadaluarsa).localeCompare(String(b.tgl_kadaluarsa))).slice(0, 6).map((b) => {
                const ob = st.masterObat.find((o) => o.id_obat === b.id_obat);
                const d = S().daysUntil(b.tgl_kadaluarsa);
                const badgeCls = d <= 90 ? 'bpom-keras' : (d <= 180 ? 'bpom-prekursor' : 'bpom-bebas');
                const dayTxt = d < 0 ? ('EXPIRED (' + Math.abs(d) + 'h lalu)') : (d + ' hari');
                return `<tr>
                  <td class="font-semibold">${S().esc(ob ? ob.nama_dagang : b.id_obat)}</td>
                  <td class="font-mono-num">${S().esc(b.no_batch)}</td>
                  <td class="font-mono-num">${S().esc(b.tgl_kadaluarsa)}</td>
                  <td><span class="badge-bpom ${badgeCls} font-mono-num font-bold">${dayTxt}</span></td>
                  <td class="font-mono-num font-bold">${b.qty_sisa}</td>
                  <td>${d < 0 ? (canGudang ? `<button onclick="navigateView('gudang','batch')" class="ons-btn ons-btn-danger text-xs py-1 px-2.5">Cek Recall</button>` : '-') : (canPos ? `<button onclick="navigateView('pos','kasir')" class="ons-btn ons-btn-ghost text-xs py-1 px-2.5">Prioritaskan Jual</button>` : '-')}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>` : `<div class="py-6 text-center text-xs rounded-xl border border-dashed" style="color:var(--ons-text-soft);border-color:var(--ons-border)">Belum ada stok batch aktif${(S().isMultiBranchEnabled && S().isMultiBranchEnabled()) ? (' pada cabang ' + S().esc(cabId)) : ''}.</div>`}
      </div>
    </div>`;
  }

  function renderDashboardPenjualanTab(st, cabId, seeCost, nowDt, range, validSales, returSales, canPos, canObat) {
    const curMonthPrefix = `${nowDt.getFullYear()}-${String(nowDt.getMonth() + 1).padStart(2, '0')}`;
    const prevMonthDt = new Date(nowDt.getFullYear(), nowDt.getMonth() - 1, 1);
    const prevMonthPrefix = `${prevMonthDt.getFullYear()}-${String(prevMonthDt.getMonth() + 1).padStart(2, '0')}`;
    const curYearPrefix = `${nowDt.getFullYear()}-`;
    const prevYearPrefix = `${nowDt.getFullYear() - 1}-`;

    const calcNetMetrics = (prefix) => {
      const vList = validSales.filter((p) => toLocalYmd_(p.tanggal).startsWith(prefix));
      const rList = returSales.filter((p) => toLocalYmd_(p.tanggal).startsWith(prefix));
      const gross = vList.reduce((s, p) => s + Number(p.grand_total || 0), 0);
      const ret = rList.reduce((s, p) => s + Number(p.grand_total || 0), 0);
      const profit = vList.reduce((s, p) => s + Number(p.estimasi_margin || 0), 0);
      const retProfit = rList.reduce((s, p) => s + Number(p.estimasi_margin || 0), 0);
      return {
        sales: Math.max(0, gross - (dashSalesNetRetur ? ret : 0)),
        profit: Math.max(0, profit - (dashSalesNetRetur ? retProfit : 0)),
        trxCount: vList.length,
        retCount: rList.length
      };
    };
    const mNow = calcNetMetrics(curMonthPrefix);
    const mPrev = calcNetMetrics(prevMonthPrefix);
    const yNow = calcNetMetrics(curYearPrefix);
    const yPrev = calcNetMetrics(prevYearPrefix);

    const deltaLabel = (cur, prev, noun) => {
      if (!prev) return `${noun}: ${S().rp(0)} (${cur > 0 ? 'Naik baru' : 'Belum ada data pembanding'})`;
      const pct = Math.round(((cur - prev) / prev) * 100);
      return `${noun}: ${S().rp(prev)} (${pct >= 0 ? '+' : ''}${pct}%)`;
    };

    const momSalesPct = mPrev.sales > 0 ? Math.round(((mNow.sales - mPrev.sales) / mPrev.sales) * 100) : (mNow.sales > 0 ? 100 : 0);
    const yoySalesPct = yPrev.sales > 0 ? Math.round(((yNow.sales - yPrev.sales) / yPrev.sales) * 100) : (yNow.sales > 0 ? 100 : 0);
    const momProfitPct = mPrev.profit > 0 ? Math.round(((mNow.profit - mPrev.profit) / mPrev.profit) * 100) : (mNow.profit > 0 ? 100 : 0);
    const yoyProfitPct = yPrev.profit > 0 ? Math.round(((yNow.profit - yPrev.profit) / yPrev.profit) * 100) : (yNow.profit > 0 ? 100 : 0);

    const rValid = validSales.filter((p) => _inDashRange(p.tanggal, range));
    const rRetur = returSales.filter((p) => _inDashRange(p.tanggal, range));
    const rTotalSales = rValid.reduce((s, p) => s + Number(p.grand_total || 0), 0);
    const rTotalRetur = rRetur.reduce((s, p) => s + Number(p.grand_total || 0), 0);
    const rTotalProfit = seeCost ? rValid.reduce((s, p) => s + Number(p.estimasi_margin || 0), 0) : 0;
    const rLost = _getDashLostSales(range);
    const rLostQty = rLost.reduce((s, l) => s + Number(l.qty || 1), 0);
    const rTrxCount = rValid.length;
    const avgBasket = rTrxCount > 0 ? Math.round(rTotalSales / rTrxCount) : 0;
    const returRatio = rTotalSales > 0 ? ((rTotalRetur / rTotalSales) * 100).toFixed(1) : '0.0';
    const profitMarginPct = (seeCost && rTotalSales > 0) ? Math.round((rTotalProfit / rTotalSales) * 100) : 0;

    const buckets = _getBucketKeys(range, dashSalesGranularity).map((bk) => {
      const bSales = rValid.filter((p) => {
        const y = toLocalYmd_(p.tanggal);
        return y >= bk.startYmd && y <= bk.endYmd;
      });
      return {
        label: bk.label,
        shortLabel: bk.shortLabel,
        nilai: bSales.reduce((s, p) => s + Number(p.grand_total || 0), 0),
        laba: seeCost ? bSales.reduce((s, p) => s + Number(p.estimasi_margin || 0), 0) : 0,
        frek: bSales.length
      };
    });

    const rTrxIds = new Set(rValid.map((p) => p.id_transaksi));
    const prodMap = {};
    (st.detailPenjualan || []).forEach((d) => {
      if (d.id_transaksi && !rTrxIds.has(d.id_transaksi)) return;
      const key = d.id_obat || d.nama_dagang;
      if (!key) return;
      if (!prodMap[key]) prodMap[key] = { nama: d.nama_dagang || key, qty: 0, total: 0 };
      prodMap[key].qty += Number(d.qty || 1);
      prodMap[key].total += Number(d.subtotal_item || (Number(d.qty || 1) * Number(d.harga_jual || 0)));
    });
    const top10Produk = Object.values(prodMap).sort((a, b) => b.qty - a.qty).slice(0, 10);
    const maxProdQty = top10Produk.length ? Math.max(1, top10Produk[0].qty) : 1;

    const custMap = {};
    rValid.forEach((p) => {
      const mid = String(p.id_member || '').trim();
      const mbr = mid ? (st.members || []).find((m) => m.id_member === mid) : null;
      const nama = (mbr && mbr.nama_pasien) || (mid ? mid : 'Pelanggan Umum / Walk-in');
      const key = mid || 'UMUM';
      if (!custMap[key]) custMap[key] = { nama, nota: 0, total: 0, isMember: !!mid };
      custMap[key].nota += 1;
      custMap[key].total += Number(p.grand_total || 0);
    });
    const top10Cust = Object.values(custMap).sort((a, b) => b.total - a.total).slice(0, 10);

    return `<div class="space-y-5">
      <!-- Sub-Hero Executive Banner Penjualan -->
      <div class="ons-card p-4 sm:p-5 border-l-4 space-y-3 rounded-2xl shadow-sm" style="border-left-color:#0066FE;background:linear-gradient(135deg, rgba(0,102,254,0.06) 0%, rgba(16,185,129,0.04) 100%)">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div class="flex items-center gap-2">
              <span class="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
              </span>
              <h2 class="text-base sm:text-lg font-extrabold tracking-tight" style="color:var(--ons-text-main)">Analisis Performa Penjualan &amp; Margin Apotek</h2>
            </div>
            <p class="text-xs mt-1" style="color:var(--ons-text-soft)">Evaluasi pertumbuhan omzet, margin keuntungan kotor, rata-rata belanja kasir, dan ranking loyalitas pelanggan.</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            ${canPos ? `<button type="button" onclick="navigateView('pos','kasir')" class="ons-btn ons-btn-primary text-xs px-3.5 py-1.5 shadow-sm font-bold flex items-center gap-1.5"><svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.01M10 8h8M6 12h12M6 16h6"/></svg><span>Kasir POS (F2)</span></button>` : ''}
            <button type="button" onclick="window.openDashUserSalesModal()" class="ons-btn ons-btn-ghost text-xs py-1.5 px-3">Performa User Kasir &rsaquo;</button>
          </div>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2.5 border-t text-xs" style="border-color:var(--ons-border)">
          <div class="p-2.5 rounded-xl border" style="background:var(--ons-bg-card);border-color:var(--ons-border)">
            <div class="text-[10px] font-semibold" style="color:var(--ons-text-soft)">Rata-rata Nota (Basket Size)</div>
            <div class="text-sm sm:text-base font-extrabold font-mono-num text-blue-600 mt-0.5">${S().rp(avgBasket)}</div>
          </div>
          <div class="p-2.5 rounded-xl border" style="background:var(--ons-bg-card);border-color:var(--ons-border)">
            <div class="text-[10px] font-semibold" style="color:var(--ons-text-soft)">Transaksi Selesai</div>
            <div class="text-sm sm:text-base font-extrabold font-mono-num mt-0.5">${rTrxCount} nota</div>
          </div>
          <div class="p-2.5 rounded-xl border" style="background:var(--ons-bg-card);border-color:var(--ons-border)">
            <div class="text-[10px] font-semibold" style="color:var(--ons-text-soft)">Rasio Retur Penjualan</div>
            <div class="text-sm sm:text-base font-extrabold font-mono-num text-amber-600 mt-0.5">${returRatio}% (${rRetur.length} retur)</div>
          </div>
          <div class="p-2.5 rounded-xl border" style="background:var(--ons-bg-card);border-color:var(--ons-border)">
            <div class="text-[10px] font-semibold" style="color:var(--ons-text-soft)">${seeCost ? 'Margin Keuntungan' : 'Permintaan Tertolak'}</div>
            <div class="text-sm sm:text-base font-extrabold font-mono-num ${seeCost ? 'text-emerald-600' : 'text-rose-600'} mt-0.5">${seeCost ? (profitMarginPct + '% (' + S().rp(rTotalProfit) + ')') : (rLost.length + ' kasus')}</div>
          </div>
        </div>
      </div>

      <!-- Kartu Pertumbuhan MoM & YoY -->
      <div class="space-y-3">
        <div class="ons-dash-sec-title">
          <span class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
            <span>Pertumbuhan Penjualan &amp; Laba (MoM &amp; YoY)</span>
          </span>
          <label class="ons-dash-switch">
            <input type="checkbox" ${dashSalesNetRetur ? 'checked' : ''} onchange="window.toggleDashNetRetur(this.checked)"/>
            <span class="text-xs">Kurangi total penjualan dengan retur</span>
          </label>
        </div>

        <div class="grid grid-cols-1 ${seeCost ? 'lg:grid-cols-2' : ''} gap-4">
          <div class="ons-card p-5 space-y-3">
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-blue-500"></span>
                <div class="font-bold text-sm">Total Omzet Penjualan</div>
              </div>
              <span class="text-[11px] font-semibold" style="color:var(--ons-text-soft)">${mNow.trxCount} nota bulan ini</span>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div class="p-3.5 rounded-xl border transition hover:border-blue-500" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
                <div class="flex items-center justify-between gap-1">
                  <span class="text-xs font-semibold" style="color:var(--ons-text-soft)">Bulan Ini (${S().esc(curMonthPrefix)})</span>
                  <span class="px-1.5 py-0.5 rounded-full text-[10px] font-bold font-mono-num ${momSalesPct >= 0 ? 'bg-emerald-500/15 text-emerald-600' : 'bg-rose-500/15 text-rose-600'}">${momSalesPct >= 0 ? '+' : ''}${momSalesPct}% MoM</span>
                </div>
                <div class="text-xl font-extrabold font-mono-num text-blue-600 mt-1.5">${S().rp(mNow.sales)}</div>
                <div class="text-[11px] mt-1" style="color:var(--ons-text-soft)">${S().esc(deltaLabel(mNow.sales, mPrev.sales, 'Bulan lalu'))}</div>
              </div>
              <div class="p-3.5 rounded-xl border transition hover:border-blue-500" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
                <div class="flex items-center justify-between gap-1">
                  <span class="text-xs font-semibold" style="color:var(--ons-text-soft)">Tahun Ini (${nowDt.getFullYear()})</span>
                  <span class="px-1.5 py-0.5 rounded-full text-[10px] font-bold font-mono-num ${yoySalesPct >= 0 ? 'bg-emerald-500/15 text-emerald-600' : 'bg-rose-500/15 text-rose-600'}">${yoySalesPct >= 0 ? '+' : ''}${yoySalesPct}% YoY</span>
                </div>
                <div class="text-xl font-extrabold font-mono-num text-blue-600 mt-1.5">${S().rp(yNow.sales)}</div>
                <div class="text-[11px] mt-1" style="color:var(--ons-text-soft)">${S().esc(deltaLabel(yNow.sales, yPrev.sales, 'Tahun lalu'))}</div>
              </div>
            </div>
          </div>

          ${seeCost ? `<div class="ons-card p-5 space-y-3">
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                <div class="font-bold text-sm">Keuntungan Penjualan (Gross Profit)</div>
              </div>
              <span class="text-[11px] font-semibold text-emerald-600">Estimasi Laba Kotor</span>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div class="p-3.5 rounded-xl border transition hover:border-emerald-500" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
                <div class="flex items-center justify-between gap-1">
                  <span class="text-xs font-semibold" style="color:var(--ons-text-soft)">Bulan Ini (${S().esc(curMonthPrefix)})</span>
                  <span class="px-1.5 py-0.5 rounded-full text-[10px] font-bold font-mono-num ${momProfitPct >= 0 ? 'bg-emerald-500/15 text-emerald-600' : 'bg-rose-500/15 text-rose-600'}">${momProfitPct >= 0 ? '+' : ''}${momProfitPct}% MoM</span>
                </div>
                <div class="text-xl font-extrabold font-mono-num text-emerald-600 mt-1.5">${S().rp(mNow.profit)}</div>
                <div class="text-[11px] mt-1" style="color:var(--ons-text-soft)">${S().esc(deltaLabel(mNow.profit, mPrev.profit, 'Bulan lalu'))}</div>
              </div>
              <div class="p-3.5 rounded-xl border transition hover:border-emerald-500" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
                <div class="flex items-center justify-between gap-1">
                  <span class="text-xs font-semibold" style="color:var(--ons-text-soft)">Tahun Ini (${nowDt.getFullYear()})</span>
                  <span class="px-1.5 py-0.5 rounded-full text-[10px] font-bold font-mono-num ${yoyProfitPct >= 0 ? 'bg-emerald-500/15 text-emerald-600' : 'bg-rose-500/15 text-rose-600'}">${yoyProfitPct >= 0 ? '+' : ''}${yoyProfitPct}% YoY</span>
                </div>
                <div class="text-xl font-extrabold font-mono-num text-emerald-600 mt-1.5">${S().rp(yNow.profit)}</div>
                <div class="text-[11px] mt-1" style="color:var(--ons-text-soft)">${S().esc(deltaLabel(yNow.profit, yPrev.profit, 'Tahun lalu'))}</div>
              </div>
            </div>
          </div>` : ''}
        </div>
      </div>

      <!-- Riwayat & Tren Penjualan -->
      <div class="space-y-3">
        <div class="ons-dash-sec-title">
          <span class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>Riwayat &amp; Tren Penjualan</span>
          </span>
          ${_renderDashFilterBar(range, `<select aria-label="Granularitas Penjualan" onchange="window.setDashSalesGranularity(this.value)" class="ons-input text-xs py-1.5 px-3 w-auto font-semibold">
            <option value="harian" ${dashSalesGranularity === 'harian' ? 'selected' : ''}>Harian</option>
            <option value="mingguan" ${dashSalesGranularity === 'mingguan' ? 'selected' : ''}>Mingguan</option>
          </select>`)}
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 ${seeCost ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-3.5">
          <div class="ons-dash-stat-tile ${canPos ? 'is-clickable' : ''}" ${canPos ? `onclick="navigateView('pos','riwayat')"` : ''}>
            <span class="ons-dash-tile-ico bg-emerald-500/12 text-emerald-600 font-extrabold text-sm">Rp</span>
            <div><div class="text-xs font-semibold" style="color:var(--ons-text-soft)">Total Penjualan</div><div class="text-lg font-extrabold font-mono-num text-emerald-600">${S().rp(rTotalSales)}</div></div>
          </div>
          <div class="ons-dash-stat-tile ${canPos ? 'is-clickable' : ''}" ${canPos ? `onclick="navigateView('pos','riwayat')"` : ''}>
            <span class="ons-dash-tile-ico bg-amber-500/12 text-amber-600"><svg viewBox="0 0 24 24" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg></span>
            <div><div class="text-xs font-semibold" style="color:var(--ons-text-soft)">Retur Penjualan</div><div class="text-lg font-extrabold font-mono-num text-amber-600">${S().rp(rTotalRetur)}</div></div>
          </div>
          <div class="ons-dash-stat-tile is-clickable" onclick="window.openDashLostSaleModal()">
            <span class="ons-dash-tile-ico bg-rose-500/12 text-rose-600"><svg viewBox="0 0 24 24" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m10 10 4 4m0-4-4 4"/></svg></span>
            <div><div class="text-xs font-semibold" style="color:var(--ons-text-soft)">Penjualan Tertolak</div><div class="text-lg font-extrabold font-mono-num text-rose-600">${rLost.length} kasus (${rLostQty} item)</div></div>
          </div>
          ${seeCost ? `<div class="ons-dash-stat-tile">
            <span class="ons-dash-tile-ico bg-blue-500/12 text-blue-600"><svg viewBox="0 0 24 24" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg></span>
            <div><div class="text-xs font-semibold" style="color:var(--ons-text-soft)">Keuntungan Penjualan</div><div class="text-lg font-extrabold font-mono-num text-emerald-600">${S().rp(rTotalProfit)}</div></div>
          </div>` : ''}
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div class="ons-card p-5 lg:col-span-8">
            ${_renderSvgVerticalBars(
              buckets,
              [
                { key: 'nilai', label: 'Total Nilai Penjualan', color: '#10B981', isCurrency: true },
                ...(seeCost ? [{ key: 'laba', label: 'Keuntungan Penjualan', color: '#0066FE', isCurrency: true }] : [])
              ],
              { isCurrency: true, ariaLabel: 'Grafik Riwayat Penjualan', unitHint: `${rValid.length} transaksi pada rentang ini` }
            )}
          </div>
          <div class="ons-card p-5 lg:col-span-4 flex flex-col justify-between gap-3">
            <div>
              <div class="font-bold text-sm">Ringkasan Frekuensi &amp; Kasir</div>
              <div class="text-xs mt-1" style="color:var(--ons-text-soft)">Total <b>${rValid.length} transaksi</b> selesai pada ${S().esc(range.label)} dengan omzet <b>${S().rp(rTotalSales)}</b>.</div>
            </div>
            <div class="space-y-2">
              <button type="button" onclick="window.openDashUserSalesModal()" class="ons-btn ons-btn-ghost w-full justify-between text-xs py-2.5 px-3 border" style="border-color:var(--ons-border)">
                <span class="font-bold text-emerald-700 dark:text-emerald-300">Rincian Penjualan Per User</span>
                <span aria-hidden="true">&rsaquo;</span>
              </button>
              ${canPos ? `<button type="button" onclick="navigateView('pos','riwayat')" class="ons-btn ons-btn-primary w-full text-xs py-2 font-bold">Buka Riwayat Nota Lengkap &rarr;</button>` : ''}
            </div>
          </div>
        </div>
      </div>

      <!-- Top Produk & Pelanggan Terloyal -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div class="ons-card overflow-hidden">
          <div class="ons-dash-status-head" style="background:rgba(249,115,22,0.12);color:#c2410c">
            <span class="flex items-center gap-1.5 font-bold">
              <span>Top 10 Produk Paling Laku</span>
            </span>
            ${canObat ? `<button type="button" onclick="navigateView('obat','obat')" class="text-xs font-bold underline">Katalog &rsaquo;</button>` : ''}
          </div>
          <div class="ons-table-wrap">
            <table class="ons-table text-xs">
              <thead><tr><th>Peringkat</th><th>Nama Produk</th><th class="text-right">Terjual</th><th class="text-right">Total Nilai</th></tr></thead>
              <tbody>
                ${top10Produk.length ? top10Produk.map((p, i) => {
                  const sharePct = Math.max(10, Math.round((Number(p.qty || 0) / maxProdQty) * 100));
                  const rankIcon = i === 0 ? '🥇 #1' : (i === 1 ? '🥈 #2' : (i === 2 ? '🥉 #3' : '#' + (i + 1)));
                  const badgeCls = i === 0 ? 'bg-amber-500 text-white' : (i < 3 ? 'bg-blue-600 text-white' : 'bg-slate-500/15 text-slate-700 dark:text-slate-300');
                  return `<tr>
                    <td><span class="px-2 py-0.5 rounded font-mono-num font-extrabold text-[10px] ${badgeCls}">${rankIcon}</span></td>
                    <td class="font-semibold">
                      <div>${S().esc(p.nama)}</div>
                      <div class="h-1 rounded-full bg-slate-200 dark:bg-slate-700 mt-1 max-w-[120px] overflow-hidden">
                        <div class="h-full bg-blue-500" style="width:${sharePct}%"></div>
                      </div>
                    </td>
                    <td class="text-right font-mono-num font-bold">${p.qty} unit</td>
                    <td class="text-right font-mono-num font-extrabold text-blue-600">${S().rp(p.total)}</td>
                  </tr>`;
                }).join('') : '<tr><td colspan="4" class="text-center py-6" style="color:var(--ons-text-soft)">Data transaksi belum tersedia pada rentang ini.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>

        <div class="ons-card overflow-hidden">
          <div class="ons-dash-status-head" style="background:rgba(14,165,233,0.12);color:#0369a1">
            <span class="flex items-center gap-1.5 font-bold">
              <span>Top 10 Pelanggan Terloyal</span>
            </span>
            ${canObat ? `<button type="button" onclick="navigateView('obat','pelanggan')" class="text-xs font-bold underline">Member &rsaquo;</button>` : ''}
          </div>
          <div class="ons-table-wrap">
            <table class="ons-table text-xs">
              <thead><tr><th>No.</th><th>Nama Pelanggan</th><th>Status</th><th class="text-right">Frekuensi</th><th class="text-right">Total Belanja</th></tr></thead>
              <tbody>
                ${top10Cust.length ? top10Cust.map((c, i) => `<tr>
                  <td class="font-mono-num">${i + 1}</td>
                  <td class="font-semibold">${S().esc(c.nama)}</td>
                  <td><span class="badge-bpom ${c.isMember ? 'bpom-bebas' : 'bpom-terbatas'} font-semibold text-[10px]">${c.isMember ? 'Member' : 'Umum'}</span></td>
                  <td class="text-right font-mono-num">${c.nota} nota</td>
                  <td class="text-right font-mono-num font-extrabold text-emerald-600">${S().rp(c.total)}</td>
                </tr>`).join('') : '<tr><td colspan="5" class="text-center py-6" style="color:var(--ons-text-soft)">Data pelanggan belum tersedia pada rentang ini.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>`;
  }

  function renderDashboardPembelianTab(st, cabId, seeCost, nowDt, range, canDefecta, canFaktur, canFin) {
    if (!seeCost) {
      return `<div class="ons-card p-6 text-center space-y-2">
        <div class="font-bold text-sm">Akses Terbatas — Dashboard Pembelian</div>
        <p class="text-xs" style="color:var(--ons-text-soft)">Data nilai pembelian, SP PBF, dan hutang faktur hanya tersedia untuk Pemilik dan APJ.</p>
        <button type="button" onclick="window.setDashboardTab('umum')" class="ons-btn ons-btn-primary text-xs">Kembali ke Dashboard Umum</button>
      </div>`;
    }

    const branchSp = (st.suratPesanan || []).filter((sp) => sameCabang_(sp, cabId));
    const branchFaktur = (st.fakturPbf || []).filter((f) => sameCabang_(f, cabId));

    const rencanaPembelianRp = (st.masterObat || []).reduce((sum, o) => {
      const stok = S().getSellableStok(o.id_obat);
      const min = Number(o.stok_min || 10);
      const max = Number(o.stok_max || min * 4);
      if (stok > min) return sum;
      const qtyOrder = Math.max(1, max - Math.max(0, stok));
      return sum + qtyOrder * Number(o.hpp_terakhir || o.hpp_avg || 0);
    }, 0);

    const openSpList = branchSp.filter((sp) => !['SELESAI_DITERIMA', 'DITERIMA_PENUH', 'BATAL'].includes(String(sp.status_sp || '').toUpperCase()));
    const pesananAktifRp = openSpList.reduce((s, sp) => s + Number(sp.estimasi_total || 0), 0);

    const openFakturList = branchFaktur
      .filter((f) => Number(f.sisa_hutang || 0) > 0)
      .slice()
      .sort((a, b) => String(a.tgl_jatuh_tempo || '9999-12-31').localeCompare(String(b.tgl_jatuh_tempo || '9999-12-31')));
    const hutangPembelianRp = openFakturList.reduce((s, f) => s + Number(f.sisa_hutang || 0), 0);
    const apNearDueList = openFakturList.filter((f) => f.tgl_jatuh_tempo && S().daysUntil(f.tgl_jatuh_tempo) <= 7);
    const apNearDueCount = apNearDueList.length;

    const rSp = branchSp.filter((sp) => _inDashRange(sp.tanggal, range));
    const rFaktur = branchFaktur.filter((f) => _inDashRange(f.tgl_faktur, range) && !String(f.status_bar || '').toUpperCase().includes('RETUR'));
    const rReturFaktur = branchFaktur.filter((f) => _inDashRange(f.tgl_faktur, range) && String(f.status_bar || '').toUpperCase().includes('RETUR'));
    const rSpRp = rSp.reduce((s, sp) => s + Number(sp.estimasi_total || 0), 0);
    const rFakturRp = rFaktur.reduce((s, f) => s + Number(f.netto_hutang || f.total_bruto || 0), 0);
    const rReturRp = rReturFaktur.reduce((s, f) => s + Number(f.netto_hutang || f.total_bruto || 0), 0);

    const buckets = _getBucketKeys(range, dashPurchaseGranularity).map((bk) => {
      const fList = rFaktur.filter((f) => {
        const y = toLocalYmd_(f.tgl_faktur);
        return y >= bk.startYmd && y <= bk.endYmd;
      });
      const retList = rReturFaktur.filter((f) => {
        const y = toLocalYmd_(f.tgl_faktur);
        return y >= bk.startYmd && y <= bk.endYmd;
      });
      return {
        label: bk.label,
        shortLabel: bk.shortLabel,
        faktur: fList.reduce((s, f) => s + Number(f.netto_hutang || f.total_bruto || 0), 0),
        retur: retList.reduce((s, f) => s + Number(f.netto_hutang || f.total_bruto || 0), 0)
      };
    });

    return `<div class="space-y-5">
      <!-- Sub-Hero Executive Banner Pembelian & PBF -->
      <div class="ons-card p-4 sm:p-5 border-l-4 space-y-3 rounded-2xl shadow-sm" style="border-left-color:#0284C7;background:linear-gradient(135deg, rgba(2,132,199,0.06) 0%, rgba(217,119,6,0.04) 100%)">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div class="flex items-center gap-2">
              <span class="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center shrink-0">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
              </span>
              <h2 class="text-base sm:text-lg font-extrabold tracking-tight" style="color:var(--ons-text-main)">Pusat Kendali Pengadaan Obat &amp; Hutang PBF</h2>
            </div>
            <p class="text-xs mt-1" style="color:var(--ons-text-soft)">Kelola siklus pengadaan apotek dari rencana stok defecta, pesanan Surat Pesanan (SP) aktif, hingga jatuh tempo faktur PBF tempo.</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            ${canDefecta ? `<button type="button" onclick="navigateView('faktur','defecta')" class="ons-btn ons-btn-primary text-xs px-3.5 py-1.5 shadow-sm font-bold flex items-center gap-1.5"><svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg><span>+ Rencana Order (Defecta)</span></button>` : ''}
            ${canDefecta ? `<button type="button" onclick="navigateView('faktur','sp')" class="ons-btn ons-btn-ghost text-xs py-1.5 px-3">Buka Buku SP &rsaquo;</button>` : ''}
            ${canFin ? `<button type="button" onclick="navigateView('finance','hutang')" class="ons-btn ons-btn-ghost text-xs py-1.5 px-3">Buku Hutang PBF &rsaquo;</button>` : ''}
          </div>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2.5 border-t text-xs" style="border-color:var(--ons-border)">
          <div class="p-2.5 rounded-xl border" style="background:var(--ons-bg-card);border-color:var(--ons-border)">
            <div class="text-[10px] font-semibold" style="color:var(--ons-text-soft)">Total Komitmen Pengadaan</div>
            <div class="text-sm sm:text-base font-extrabold font-mono-num text-blue-600 mt-0.5">${S().rp(rencanaPembelianRp + pesananAktifRp + hutangPembelianRp)}</div>
          </div>
          <div class="p-2.5 rounded-xl border" style="background:var(--ons-bg-card);border-color:var(--ons-border)">
            <div class="text-[10px] font-semibold" style="color:var(--ons-text-soft)">Surat Pesanan Aktif</div>
            <div class="text-sm sm:text-base font-extrabold font-mono-num text-sky-600 mt-0.5">${openSpList.length} SP (${S().rp(pesananAktifRp)})</div>
          </div>
          <div class="p-2.5 rounded-xl border" style="background:var(--ons-bg-card);border-color:var(--ons-border)">
            <div class="text-[10px] font-semibold" style="color:var(--ons-text-soft)">Faktur Belum Lunas</div>
            <div class="text-sm sm:text-base font-extrabold font-mono-num text-amber-600 mt-0.5">${openFakturList.length} Faktur (${S().rp(hutangPembelianRp)})</div>
          </div>
          <div class="p-2.5 rounded-xl border" style="background:var(--ons-bg-card);border-color:var(--ons-border)">
            <div class="text-[10px] font-semibold" style="color:var(--ons-text-soft)">Jatuh Tempo &le;7 Hari</div>
            <div class="text-sm sm:text-base font-extrabold font-mono-num ${apNearDueCount > 0 ? 'text-rose-600' : 'text-emerald-600'} mt-0.5">${apNearDueCount} faktur ${apNearDueCount > 0 ? '⚠️' : '✓'}</div>
          </div>
        </div>
      </div>

      <!-- Kartu Status Pembelian -->
      <div class="space-y-3">
        <div class="ons-dash-sec-title">
          <span class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
            <span>Status Pengadaan &amp; Hutang Berjalan</span>
          </span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div class="ons-dash-stat-tile ${canDefecta ? 'is-clickable' : ''}" ${canDefecta ? `onclick="navigateView('faktur','defecta')"` : ''}>
            <span class="ons-dash-tile-ico bg-emerald-500/12 text-emerald-600"><svg viewBox="0 0 24 24" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/></svg></span>
            <div><div class="text-xs font-semibold" style="color:var(--ons-text-soft)">Rencana Pembelian (Defecta Buffer)</div><div class="text-lg font-extrabold font-mono-num text-emerald-600">${S().rp(rencanaPembelianRp)}</div></div>
          </div>
          <div class="ons-dash-stat-tile ${canDefecta ? 'is-clickable' : ''}" ${canDefecta ? `onclick="navigateView('faktur','sp')"` : ''}>
            <span class="ons-dash-tile-ico bg-blue-500/12 text-blue-600"><svg viewBox="0 0 24 24" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></span>
            <div><div class="text-xs font-semibold" style="color:var(--ons-text-soft)">Pesanan Aktif (${openSpList.length} SP)</div><div class="text-lg font-extrabold font-mono-num text-blue-600">${S().rp(pesananAktifRp)}</div></div>
          </div>
          <div class="ons-dash-stat-tile ${canFin ? 'is-clickable' : ''}" ${canFin ? `onclick="navigateView('finance','hutang')"` : ''}>
            <span class="ons-dash-tile-ico bg-rose-500/12 text-rose-600"><svg viewBox="0 0 24 24" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 10h10M7 14h6"/></svg></span>
            <div><div class="text-xs font-semibold" style="color:var(--ons-text-soft)">Hutang Pembelian (${openFakturList.length} Faktur)</div><div class="text-lg font-extrabold font-mono-num text-amber-600">${S().rp(hutangPembelianRp)}</div></div>
          </div>
        </div>
      </div>

      <!-- 2 Tabel Kritis Pengadaan -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div class="ons-card overflow-hidden">
          <div class="ons-dash-status-head" style="background:rgba(244,63,94,0.12);color:#be123c">
            <span class="flex items-center gap-1.5 font-bold">
              <span>Jatuh Tempo Faktur Terdekat (H-7 Warning)</span>
            </span>
            ${canFaktur ? `<button type="button" onclick="navigateView('faktur','daftar')" class="text-xs font-bold underline">Daftar Faktur &rsaquo;</button>` : ''}
          </div>
          <div class="ons-table-wrap">
            <table class="ons-table text-xs">
              <thead><tr><th>No.</th><th>Nama Supplier PBF</th><th>Jatuh Tempo</th><th>Urgensi</th><th class="text-right">Sisa Hutang</th></tr></thead>
              <tbody>
                ${openFakturList.length ? openFakturList.slice(0, 6).map((f, i) => {
                  const d = f.tgl_jatuh_tempo ? S().daysUntil(f.tgl_jatuh_tempo) : 999;
                  const badgeCls = d < 0 ? 'bpom-keras' : (d <= 3 ? 'bpom-keras' : (d <= 7 ? 'bpom-prekursor' : 'bpom-bebas'));
                  const badgeTxt = d < 0 ? ('Lewat ' + Math.abs(d) + 'h') : (d === 0 ? 'Hari Ini!' : ('H-' + d));
                  return `<tr class="cursor-pointer hover:bg-blue-500/5 transition" onclick="if(window.openFakturDetailModal)window.openFakturDetailModal('${S().esc(f.id_faktur || f.no_faktur_pbf)}')">
                    <td class="font-mono-num">${i + 1}</td>
                    <td class="font-semibold">${S().esc(f.id_pbf || f.nama_pbf || '-')}</td>
                    <td class="font-mono-num">${S().esc(f.tgl_jatuh_tempo || '-')}</td>
                    <td><span class="badge-bpom ${badgeCls} font-mono-num font-bold">${badgeTxt}</span></td>
                    <td class="text-right font-mono-num font-bold text-amber-600">${S().rp(f.sisa_hutang)}</td>
                  </tr>`;
                }).join('') : '<tr><td colspan="5" class="text-center py-6" style="color:var(--ons-text-soft)">Semua tagihan faktur PBF lunas / tidak ada hutang aktif.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>

        <div class="ons-card overflow-hidden">
          <div class="ons-dash-status-head" style="background:rgba(14,165,233,0.12);color:#0369a1">
            <span class="flex items-center gap-1.5 font-bold">
              <span>Pesanan Aktif (Surat Pesanan PBF)</span>
            </span>
            ${canDefecta ? `<button type="button" onclick="navigateView('faktur','sp')" class="text-xs font-bold underline">Surat Pesanan &rsaquo;</button>` : ''}
          </div>
          <div class="ons-table-wrap">
            <table class="ons-table text-xs">
              <thead><tr><th>No.</th><th>Nama Supplier PBF</th><th>Tgl. SP</th><th>Status</th><th class="text-right">Estimasi Nilai</th></tr></thead>
              <tbody>
                ${openSpList.length ? openSpList.slice(0, 6).map((sp, i) => `<tr class="cursor-pointer hover:bg-blue-500/5 transition" onclick="if(window.openSpA4PreviewModal)window.openSpA4PreviewModal('${S().esc(sp.id_sp)}')">
                  <td class="font-mono-num">${i + 1}</td>
                  <td class="font-semibold">${S().esc(sp.nama_pbf || sp.id_pbf || '-')}</td>
                  <td class="font-mono-num">${S().esc(sp.tanggal || '-')}</td>
                  <td><span class="badge-bpom bpom-prekursor font-bold text-[10px]">${S().esc(sp.status_sp || 'AKTIF')}</span></td>
                  <td class="text-right font-mono-num font-bold text-blue-600">${S().rp(sp.estimasi_total || 0)}</td>
                </tr>`).join('') : '<tr><td colspan="5" class="text-center py-6" style="color:var(--ons-text-soft)">Semua Surat Pesanan sudah selesai diterima / tidak ada SP aktif.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Riwayat Pembelian & Pengadaan -->
      <div class="space-y-3">
        <div class="ons-dash-sec-title">
          <span class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
            <span>Riwayat Pembelian &amp; Penerimaan Barang PBF</span>
          </span>
          ${_renderDashFilterBar(range, `<select aria-label="Granularitas Pembelian" onchange="window.setDashPurchaseGranularity(this.value)" class="ons-input text-xs py-1.5 px-3 w-auto font-semibold">
            <option value="harian" ${dashPurchaseGranularity === 'harian' ? 'selected' : ''}>Harian</option>
            <option value="mingguan" ${dashPurchaseGranularity === 'mingguan' ? 'selected' : ''}>Mingguan</option>
          </select>`)}
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div class="ons-dash-stat-tile">
            <span class="ons-dash-tile-ico bg-emerald-500/12 text-emerald-600"><svg viewBox="0 0 24 24" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/></svg></span>
            <div><div class="text-xs font-semibold" style="color:var(--ons-text-soft)">Pesanan Pembelian (${rSp.length} SP)</div><div class="text-lg font-extrabold font-mono-num text-emerald-600">${S().rp(rSpRp)}</div></div>
          </div>
          <div class="ons-dash-stat-tile">
            <span class="ons-dash-tile-ico bg-blue-500/12 text-blue-600"><svg viewBox="0 0 24 24" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2"/></svg></span>
            <div><div class="text-xs font-semibold" style="color:var(--ons-text-soft)">Faktur Pembelian (${rFaktur.length} Faktur)</div><div class="text-lg font-extrabold font-mono-num text-blue-600">${S().rp(rFakturRp)}</div></div>
          </div>
          <div class="ons-dash-stat-tile">
            <span class="ons-dash-tile-ico bg-rose-500/12 text-rose-600"><svg viewBox="0 0 24 24" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg></span>
            <div><div class="text-xs font-semibold" style="color:var(--ons-text-soft)">Retur Pembelian (${rReturFaktur.length})</div><div class="text-lg font-extrabold font-mono-num text-rose-600">${S().rp(rReturRp)}</div></div>
          </div>
        </div>
        <div class="ons-card p-5">
          ${_renderSvgVerticalBars(
            buckets,
            [
              { key: 'faktur', label: 'Faktur Pembelian Masuk', color: '#38BDF8', isCurrency: true },
              { key: 'retur', label: 'Retur Pembelian ke PBF', color: '#F43F5E', isCurrency: true }
            ],
            { isCurrency: true, ariaLabel: 'Grafik Riwayat Pembelian', unitHint: `Total penerimaan faktur ${S().rp(rFakturRp)}` }
          )}
        </div>
      </div>
    </div>`;
  }

  function renderDashboardPersediaanTab(st, cabId, seeCost, nowDt, range, invStatus, canGudang, canDefecta, canFaktur) {
    const obatById = {};
    (st.masterObat || []).forEach((o) => { obatById[o.id_obat] = o; });
    const muts = (st.mutasiStok || []).filter((m) => {
      if (!sameCabang_(m, cabId) || !_inDashRange(m.timestamp, range)) return false;
      const jm = String(m.jenis_mutasi || '').toUpperCase();
      if (dashInvJenis !== 'SEMUA' && !jm.includes(dashInvJenis)) return false;
      if (dashInvSupplier !== 'SEMUA') {
        const ob = obatById[m.id_obat];
        if (!ob || String(ob.pbf_utama || '') !== dashInvSupplier) return false;
      }
      return true;
    });

    const getMutVal = (m) => {
      const ob = obatById[m.id_obat];
      const hpp = Number((ob && (ob.hpp_avg || ob.hpp_terakhir)) || 0);
      return Math.abs(Number(m.qty_ubah || 0)) * hpp;
    };

    let penyesuaianRp = 0; let penyesuaianQty = 0;
    let mutasiLainRp = 0; let mutasiLainQty = 0;
    let terjualRp = 0; let terjualQty = 0;
    let pembelianRp = 0; let pembelianQty = 0;
    muts.forEach((m) => {
      const jm = String(m.jenis_mutasi || '').toUpperCase();
      const q = Number(m.qty_ubah || 0);
      const val = getMutVal(m);
      if (jm.includes('OPNAME') || jm.includes('PENYESUAIAN')) {
        penyesuaianQty += q;
        penyesuaianRp += (q >= 0 ? val : -val);
      } else if (jm.includes('PENJUALAN')) {
        terjualQty += Math.abs(q);
        terjualRp += val;
      } else if (jm.includes('PEMBELIAN') || jm.includes('GRN')) {
        pembelianQty += Math.abs(q);
        pembelianRp += val;
      } else {
        mutasiLainQty += q;
        mutasiLainRp += (q >= 0 ? val : -val);
      }
    });

    const persediaanAkhirRp = invStatus.currentStockVal;
    const persediaanAwalRp = Math.max(0, persediaanAkhirRp - pembelianRp + terjualRp - penyesuaianRp - mutasiLainRp);

    const buckets = _getBucketKeys(range, 'harian');
    let runningVal = persediaanAwalRp;
    let runningUnits = Math.max(0, invStatus.currentStockUnits - pembelianQty + terjualQty - penyesuaianQty - mutasiLainQty);
    const invTrendPoints = buckets.map((bk) => {
      const dayMuts = muts.filter((m) => {
        const y = toLocalYmd_(m.timestamp);
        return y >= bk.startYmd && y <= bk.endYmd;
      });
      dayMuts.forEach((m) => {
        const q = Number(m.qty_ubah || 0);
        const ob = obatById[m.id_obat];
        const hpp = Number((ob && (ob.hpp_avg || ob.hpp_terakhir)) || 0);
        runningUnits = Math.max(0, runningUnits + q);
        runningVal = Math.max(0, runningVal + (q * hpp));
      });
      return { label: bk.label, shortLabel: bk.shortLabel, val: seeCost ? runningVal : runningUnits };
    });
    if (invTrendPoints.length) {
      invTrendPoints[invTrendPoints.length - 1].val = seeCost ? persediaanAkhirRp : invStatus.currentStockUnits;
    }

    const fmtCard = (rpVal, qtyVal, prefix) => seeCost ? ((prefix || '') + S().rp(rpVal)) : `${qtyVal} unit`;

    const totalKatalog = (st.masterObat || []).length;
    const safeStockCount = Math.max(0, totalKatalog - invStatus.defectaProducts.length);
    const safeStockPct = totalKatalog > 0 ? Math.round((safeStockCount / totalKatalog) * 100) : 100;

    // Prioritas Defecta Kritis
    const defectaList = (st.masterObat || []).filter((o) => {
      const stok = S().getSellableStok(o.id_obat);
      const min = Number(o.stok_min || 10);
      return stok <= min;
    }).slice(0, 5);

    return `<div class="space-y-5">
      <!-- Sub-Hero Executive Banner Persediaan -->
      <div class="ons-card p-4 sm:p-5 border-l-4 space-y-3 rounded-2xl shadow-sm" style="border-left-color:#10B981;background:linear-gradient(135deg, rgba(16,185,129,0.06) 0%, rgba(2,132,199,0.04) 100%)">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div class="flex items-center gap-2">
              <span class="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
              </span>
              <h2 class="text-base sm:text-lg font-extrabold tracking-tight" style="color:var(--ons-text-main)">Valuasi Persediaan, Arus Mutasi &amp; Kontrol FEFO</h2>
            </div>
            <p class="text-xs mt-1" style="color:var(--ons-text-soft)">Arus pergerakan barang real-time dari saldo awal, penerimaan faktur, penjualan POS kasir, opname, hingga saldo akhir aset.</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            ${canGudang ? `<button type="button" onclick="navigateView('gudang','opname')" class="ons-btn ons-btn-primary text-xs px-3.5 py-1.5 shadow-sm font-bold flex items-center gap-1.5"><svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg><span>Stok Opname</span></button>` : ''}
            ${canGudang ? `<button type="button" onclick="navigateView('gudang','batch')" class="ons-btn ons-btn-ghost text-xs py-1.5 px-3">Batch &amp; FEFO &rsaquo;</button>` : ''}
            ${canGudang ? `<button type="button" onclick="navigateView('gudang','mutasi')" class="ons-btn ons-btn-ghost text-xs py-1.5 px-3">Buku Mutasi &rsaquo;</button>` : ''}
          </div>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2.5 border-t text-xs" style="border-color:var(--ons-border)">
          <div class="p-2.5 rounded-xl border" style="background:var(--ons-bg-card);border-color:var(--ons-border)">
            <div class="text-[10px] font-semibold" style="color:var(--ons-text-soft)">${seeCost ? 'Total Valuasi Aset (HPP)' : 'Total Stok Fisik'}</div>
            <div class="text-sm sm:text-base font-extrabold font-mono-num text-emerald-600 mt-0.5">${seeCost ? S().rp(persediaanAkhirRp) : (invStatus.currentStockUnits + ' unit')}</div>
          </div>
          <div class="p-2.5 rounded-xl border" style="background:var(--ons-bg-card);border-color:var(--ons-border)">
            <div class="text-[10px] font-semibold" style="color:var(--ons-text-soft)">Katalog Obat Terdaftar</div>
            <div class="text-sm sm:text-base font-extrabold font-mono-num mt-0.5">${totalKatalog} produk</div>
          </div>
          <div class="p-2.5 rounded-xl border" style="background:var(--ons-bg-card);border-color:var(--ons-border)">
            <div class="text-[10px] font-semibold" style="color:var(--ons-text-soft)">Ketersediaan Stok Aman</div>
            <div class="text-sm sm:text-base font-extrabold font-mono-num text-blue-600 mt-0.5">${safeStockPct}% (${safeStockCount} produk)</div>
          </div>
          <div class="p-2.5 rounded-xl border" style="background:var(--ons-bg-card);border-color:var(--ons-border)">
            <div class="text-[10px] font-semibold" style="color:var(--ons-text-soft)">Batch Aktif Terdaftar</div>
            <div class="text-sm sm:text-base font-extrabold font-mono-num text-indigo-600 mt-0.5">${invStatus.activeBatches.length} batch</div>
          </div>
        </div>
      </div>

      <!-- Arus Mutasi Persediaan (Alur Akuntansi Stok 6 Kartu) -->
      <div class="space-y-3">
        <div class="ons-dash-sec-title">
          <span class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>Arus Mutasi Stok Periode (${S().esc(range.label)})</span>
          </span>
          <div class="flex flex-wrap items-center gap-2">
            <select aria-label="Filter Jenis Mutasi" onchange="window.setDashInvFilter(this.value, '${S().esc(dashInvSupplier)}')" class="ons-input text-xs py-1.5 px-3 w-auto font-semibold">
              <option value="SEMUA" ${dashInvJenis === 'SEMUA' ? 'selected' : ''}>Semua Mutasi</option>
              <option value="PENJUALAN" ${dashInvJenis === 'PENJUALAN' ? 'selected' : ''}>Penjualan POS</option>
              <option value="PEMBELIAN" ${dashInvJenis === 'PEMBELIAN' ? 'selected' : ''}>Pembelian / GRN</option>
              <option value="OPNAME" ${dashInvJenis === 'OPNAME' ? 'selected' : ''}>Penyesuaian / Opname</option>
              <option value="RETUR" ${dashInvJenis === 'RETUR' ? 'selected' : ''}>Retur</option>
            </select>
            ${seeCost ? `<select aria-label="Filter Supplier Persediaan" onchange="window.setDashInvFilter('${S().esc(dashInvJenis)}', this.value)" class="ons-input text-xs py-1.5 px-3 w-auto font-semibold">
              <option value="SEMUA" ${dashInvSupplier === 'SEMUA' ? 'selected' : ''}>Semua Supplier</option>
              ${(st.supplierPbf || []).map((p) => `<option value="${S().esc(p.nama_pbf)}" ${dashInvSupplier === p.nama_pbf ? 'selected' : ''}>${S().esc(p.nama_pbf)}</option>`).join('')}
            </select>` : ''}
            ${_renderDashFilterBar(range)}
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          <div class="ons-dash-stat-tile flex-col items-start gap-1 p-3">
            <div class="flex items-center justify-between w-full">
              <span class="text-[10px] font-bold uppercase tracking-wider" style="color:var(--ons-text-soft)">1. Saldo Awal</span>
              <span class="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center text-xs font-bold">&bull;</span>
            </div>
            <div class="text-base font-extrabold font-mono-num mt-1">${seeCost ? S().rp(persediaanAwalRp) : (Math.max(0, invStatus.currentStockUnits - pembelianQty + terjualQty) + ' unit')}</div>
            <div class="text-[10px]" style="color:var(--ons-text-soft)">Awal rentang</div>
          </div>

          <div class="ons-dash-stat-tile flex-col items-start gap-1 p-3">
            <div class="flex items-center justify-between w-full">
              <span class="text-[10px] font-bold uppercase tracking-wider text-sky-600">(+) Pembelian</span>
              <span class="w-6 h-6 rounded-lg bg-sky-500/10 text-sky-600 flex items-center justify-center text-xs font-bold">+</span>
            </div>
            <div class="text-base font-extrabold font-mono-num text-sky-600 mt-1">${fmtCard(pembelianRp, pembelianQty)}</div>
            <div class="text-[10px]" style="color:var(--ons-text-soft)">${pembelianQty} unit masuk</div>
          </div>

          <div class="ons-dash-stat-tile flex-col items-start gap-1 p-3">
            <div class="flex items-center justify-between w-full">
              <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-600">(-) Terjual POS</span>
              <span class="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-xs font-bold">-</span>
            </div>
            <div class="text-base font-extrabold font-mono-num text-emerald-600 mt-1">${fmtCard(terjualRp, terjualQty)}</div>
            <div class="text-[10px]" style="color:var(--ons-text-soft)">${terjualQty} unit keluar</div>
          </div>

          <div class="ons-dash-stat-tile flex-col items-start gap-1 p-3">
            <div class="flex items-center justify-between w-full">
              <span class="text-[10px] font-bold uppercase tracking-wider text-amber-600">(&plusmn;) Opname</span>
              <span class="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center text-xs font-bold">&plusmn;</span>
            </div>
            <div class="text-base font-extrabold font-mono-num text-amber-600 mt-1">${fmtCard(penyesuaianRp, penyesuaianQty)}</div>
            <div class="text-[10px]" style="color:var(--ons-text-soft)">${penyesuaianQty >= 0 ? '+' : ''}${penyesuaianQty} unit selisih</div>
          </div>

          <div class="ons-dash-stat-tile flex-col items-start gap-1 p-3">
            <div class="flex items-center justify-between w-full">
              <span class="text-[10px] font-bold uppercase tracking-wider" style="color:var(--ons-text-soft)">(&plusmn;) Mutasi Lain</span>
              <span class="w-6 h-6 rounded-lg bg-slate-500/10 text-slate-600 flex items-center justify-center text-xs font-bold">&sim;</span>
            </div>
            <div class="text-base font-extrabold font-mono-num mt-1">${fmtCard(mutasiLainRp, mutasiLainQty)}</div>
            <div class="text-[10px]" style="color:var(--ons-text-soft)">${mutasiLainQty >= 0 ? '+' : ''}${mutasiLainQty} unit internal</div>
          </div>

          <div class="ons-dash-stat-tile flex-col items-start gap-1 p-3 border-blue-500/30" style="background:rgba(0,102,254,0.03)">
            <div class="flex items-center justify-between w-full">
              <span class="text-[10px] font-bold uppercase tracking-wider text-blue-600">(=) Saldo Akhir</span>
              <span class="w-6 h-6 rounded-lg bg-blue-500 text-white flex items-center justify-center text-xs font-bold">=</span>
            </div>
            <div class="text-base font-extrabold font-mono-num text-blue-600 mt-1">${seeCost ? S().rp(persediaanAkhirRp) : (invStatus.currentStockUnits + ' unit')}</div>
            <div class="text-[10px]" style="color:var(--ons-text-soft)">Valuasi stok saat ini</div>
          </div>
        </div>

        <!-- Grafik Perjalanan Nilai Persediaan -->
        <div class="ons-card p-5">
          ${_renderSvgVerticalBars(
            invTrendPoints,
            [{ key: 'val', label: seeCost ? 'Total Nilai Persediaan (HPP)' : 'Total Unit Persediaan', color: '#06B6D4', isCurrency: seeCost, suffix: seeCost ? '' : ' unit' }],
            { isCurrency: seeCost, ariaLabel: 'Grafik Nilai Persediaan', unitHint: `${invStatus.activeBatches.length} batch aktif terdata` }
          )}
        </div>
      </div>

      <!-- Status Persediaan & Mitigasi Risiko -->
      ${_renderDashStatusPersediaanSection(invStatus, seeCost, canGudang, canDefecta, canFaktur)}

      <!-- Prioritas Restock Defecta -->
      ${defectaList.length ? `<div class="ons-card overflow-hidden">
        <div class="ons-dash-status-head" style="background:rgba(245,158,11,0.12);color:#b45309">
          <span class="flex items-center gap-1.5 font-bold">
            <span>Prioritas Pengadaan Defecta (Stok &le; Batas Minimum)</span>
          </span>
          ${canDefecta ? `<button type="button" onclick="navigateView('faktur','defecta')" class="text-xs font-bold underline">Buka Buku Defecta &rsaquo;</button>` : ''}
        </div>
        <div class="ons-table-wrap">
          <table class="ons-table text-xs">
            <thead><tr><th>Nama Obat</th><th>Golongan</th><th>Stok Saat Ini</th><th>Batas Min &bull; Max</th><th>Saran Pesan</th><th>Aksi</th></tr></thead>
            <tbody>
              ${defectaList.map((o) => {
                const stok = S().getSellableStok(o.id_obat);
                const min = Number(o.stok_min || 10);
                const max = Number(o.stok_max || min * 4);
                const saran = Math.max(1, max - Math.max(0, stok));
                return `<tr>
                  <td class="font-semibold">${S().esc(o.nama_dagang)}</td>
                  <td>${S().bpomBadge(o.golongan_bpom || 'BEBAS')}</td>
                  <td><span class="badge-bpom ${stok === 0 ? 'bpom-keras' : 'bpom-prekursor'} font-mono-num font-bold">${stok} ${S().esc(o.satuan_terkecil || 'pcs')}</span></td>
                  <td class="font-mono-num">${min} &bull; ${max}</td>
                  <td class="font-mono-num font-extrabold text-blue-600">${saran} ${S().esc(o.satuan_terkecil || 'pcs')}</td>
                  <td>${canDefecta ? `<button type="button" onclick="navigateView('faktur','defecta')" class="ons-btn ons-btn-primary text-xs py-1 px-2.5 font-bold">Pesan SP &rarr;</button>` : '-'}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>` : ''}
    </div>`;
  }

    global.setDashboardTab = (t) => {
    const seeCost = S().canSeeFinancialCost();
    const allowed = ['umum', 'penjualan', 'persediaan'].concat(seeCost ? ['pembelian'] : []);
    dashSubTab = allowed.includes(t) ? t : 'umum';
    if (S().AppState.subTabs) S().AppState.subTabs.dashboard = dashSubTab;
    global.renderActiveView();
    if (typeof global.syncNavHighlight === 'function') global.syncNavHighlight();
  };
  global.setDashPeriodPreset = (p) => { dashPeriodPreset = p || '30d'; global.renderActiveView(); };
  global.setDashCustomRange = (s, e) => { dashCustomStart = s || ''; dashCustomEnd = e || ''; dashPeriodPreset = 'custom'; global.renderActiveView(); };
  global.setDashSalesGranularity = (g) => { dashSalesGranularity = g || 'harian'; global.renderActiveView(); };
  global.toggleDashNetRetur = (chk) => { dashSalesNetRetur = !!chk; global.renderActiveView(); };
  global.setDashPurchaseGranularity = (g) => { dashPurchaseGranularity = g || 'harian'; global.renderActiveView(); };
  global.setDashInvFilter = (jenis, sup) => { dashInvJenis = jenis || 'SEMUA'; dashInvSupplier = sup || 'SEMUA'; global.renderActiveView(); };
  global.setDashKpiYear = (yr) => { dashKpiYear = String(yr || new Date().getFullYear()); global.renderActiveView(); };

  global.openDashUserSalesModal = () => {
    const st = S().AppState;
    const cabId = st.cabangId || 'ONS-01';
    const seeCost = S().canSeeFinancialCost();
    const range = _getDashDateRange(new Date());
    const rValid = (st.penjualan || []).filter((p) => sameCabang_(p, cabId) && String(p.status_trx || '') !== 'RETUR' && _inDashRange(p.tanggal, range));
    const userMap = {};
    rValid.forEach((p) => {
      const id = String(p.kasir_id || p.dibuat_oleh || 'Kasir');
      const uObj = (st.staffDirectory || []).find((u) => u.id_user === id || u.username === id);
      if (!userMap[id]) userMap[id] = { nama: (uObj && uObj.nama_lengkap) || id, role: (uObj && uObj.role) || 'Kasir', nota: 0, omz: 0, laba: 0 };
      userMap[id].nota += 1;
      userMap[id].omz += Number(p.grand_total || 0);
      userMap[id].laba += Number(p.estimasi_margin || 0);
    });
    const rows = Object.values(userMap).sort((a, b) => b.omz - a.omz);
    S().openModal(`<div class="p-6 space-y-3 text-xs">
      <div class="flex justify-between items-center">
        <div>
          <h3 class="font-bold text-base">Rincian Penjualan Per User (${S().esc(range.label)})</h3>
          <div style="color:var(--ons-text-soft)">${S().esc(range.startYmd)} s.d. ${S().esc(range.endYmd)}</div>
        </div>
        <button onclick="ONSStore.closeModal()" class="text-xl">&times;</button>
      </div>
      <div class="ons-table-wrap">
        <table class="ons-table text-xs">
          <thead><tr><th>Nama Pengguna</th><th>Role</th><th class="text-right">Nota</th><th class="text-right">Total Penjualan</th>${seeCost ? '<th class="text-right">Laba</th>' : ''}</tr></thead>
          <tbody>
            ${rows.length ? rows.map((r) => `<tr>
              <td class="font-semibold">${S().esc(r.nama)}</td>
              <td><span class="badge-bpom bpom-terbatas">${S().esc(r.role)}</span></td>
              <td class="text-right font-mono-num">${r.nota}</td>
              <td class="text-right font-mono-num font-bold">${S().rp(r.omz)}</td>
              ${seeCost ? `<td class="text-right font-mono-num text-emerald-600">${S().rp(r.laba)}</td>` : ''}
            </tr>`).join('') : '<tr><td colspan="5" class="text-center py-6">Belum ada transaksi user pada rentang ini.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>`, '620px');
  };

  global.openDashTipeProdukModal = () => {
    const st = S().AppState;
    const total = Math.max(1, (st.masterObat || []).length);
    const map = {};
    (st.masterObat || []).forEach((o) => {
      const g = String(o.golongan_bpom || 'BEBAS').toUpperCase();
      map[g] = (map[g] || 0) + 1;
    });
    const rows = Object.keys(map).map((g) => ({ g, count: map[g], pct: Math.round((map[g] / total) * 100) })).sort((a, b) => b.count - a.count);
    S().openModal(`<div class="p-6 space-y-3 text-xs">
      <div class="flex justify-between items-center">
        <h3 class="font-bold text-base">Komposisi Tipe Produk &amp; Golongan BPOM</h3>
        <button onclick="ONSStore.closeModal()" class="text-xl">&times;</button>
      </div>
      <div class="space-y-2.5">
        ${rows.length ? rows.map((r) => `<div>
          <div class="flex justify-between font-semibold mb-1"><span>${S().bpomBadge(r.g)}</span><span class="font-mono-num">${r.count} produk (${r.pct}%)</span></div>
          <div class="ons-stock-track"><div class="ons-stock-fill" style="width:${r.pct}%;background:#0066FE"></div></div>
        </div>`).join('') : '<div class="text-center py-4">Belum ada produk pada Master Obat.</div>'}
      </div>
      ${S().canAccessView('obat') ? `<button type="button" onclick="ONSStore.closeModal();navigateView('obat','obat')" class="ons-btn ons-btn-primary w-full text-xs">Buka Master Data Obat &rarr;</button>` : ''}
    </div>`, '480px');
  };

  global.openDashLostSaleModal = () => {
    const arr = _getDashLostSales();
    S().openModal(`<div class="p-6 space-y-3 text-xs">
      <div class="flex justify-between items-center">
        <h3 class="font-bold text-base">Log Penjualan Tertolak (Lost Sales)</h3>
        <button onclick="ONSStore.closeModal()" class="text-xl">&times;</button>
      </div>
      <p style="color:var(--ons-text-soft)">Catat permintaan obat dari pasien yang belum tersedia / stok kosong sebagai bahan evaluasi pengadaan.</p>
      <div class="flex gap-2">
        <input id="dashLsNama" class="ons-input flex-1" placeholder="Nama obat yang dicari pasien..."/>
        <input id="dashLsQty" type="number" min="1" class="ons-input w-20 font-mono-num" value="1"/>
        <button type="button" onclick="window.submitDashLostSale()" class="ons-btn ons-btn-primary">Simpan</button>
      </div>
      <div class="space-y-1.5 max-h-56 overflow-auto">
        ${arr.slice().reverse().map((ls) => `<div class="p-2 rounded-lg border flex justify-between items-center" style="border-color:var(--ons-border)">
          <span><b>${S().esc(ls.nama_obat)}</b> (${Number(ls.qty || 1)}x)</span>
          <span class="font-mono-num" style="color:var(--ons-text-soft)">${S().esc(ls.tanggal || '-')}</span>
        </div>`).join('')}
      </div>
    </div>`, '500px');
  };

  global.submitDashLostSale = () => {
    const nama = ((document.getElementById('dashLsNama') || {}).value || '').trim();
    const qty = Math.max(1, Number((document.getElementById('dashLsQty') || {}).value || 1));
    if (!nama) return global.toast('Tulis nama obat yang dicari pasien.', 'warn');
    const arr = _getDashLostSales();
    arr.push({ tanggal: toLocalYmd_(new Date()), nama_obat: nama, qty, alasan: 'Tidak tersedia saat diminta' });
    try { localStorage.setItem(DASH_LOST_SALES_KEY, JSON.stringify(arr.slice(-50))); } catch (e) {}
    S().closeModal();
    global.toast('Penjualan tertolak dicatat!', 'ok');
    global.renderActiveView();
  };

  /**
   * W-03: Kasir POS Next-Gen v11 (Kasir FEFO, Split Pay, Poin, Riwayat/Retur PIN & Struk Thermal)
   */
  let posSubTab = 'kasir';
  let posHistQ = '';
  let posHistFilter = 'SEMUA';
  let posHistMethod = 'SEMUA';
  let posHistPeriod = 'ALL';
  let posHistStart = '';
  let posHistEnd = '';
  let posReturQ = '';
  let posReturPeriod = 'ALL';
  let posReturStart = '';
  let posReturEnd = '';
  let posTertolakQ = '';
  let posRekapExpanded = true;
  let posCatalogExpanded = true;
  let posStockFilter = 'ALL'; // ALL | READY | LOW | NEAR_ED
  let posCatalogView = (typeof localStorage !== 'undefined' && localStorage.getItem('ons_pos_view')) || 'GRID';
  let posBeepEnabled = typeof localStorage !== 'undefined' ? (localStorage.getItem('ons_pos_beep') !== '0') : true;

  function computePosCartTotals(cart) {
    if (!cart) {
      return { subtotal: 0, itemDiscTotal: 0, subAfterItemDisc: 0, diskonGlobal: 0, biayaServis: 0, biayaEmbalase: 0, ongkosKirim: 0, biayaLainnya: 0, totalBiayaTambahan: 0, grandTotal: 0 };
    }
    const subtotal = (cart.items || []).reduce((s, it) => s + Number(it.harga_jual || 0) * Number(it.qty || 0), 0);
    const itemDiscTotal = (cart.items || []).reduce((s, it) => s + Number(it.diskon_item || 0), 0);
    const subAfterItemDisc = Math.max(0, subtotal - itemDiscTotal);
    if (cart.diskon_mode === 'PCT') {
      const pct = Math.min(100, Math.max(0, Number(cart.diskon_input || 0)));
      cart.diskon_global = Math.round(subAfterItemDisc * (pct / 100));
    } else {
      cart.diskon_global = Math.min(subAfterItemDisc, Math.max(0, Number(cart.diskon_input || 0)));
    }
    const biayaServis = Math.max(0, Number(cart.biaya_servis || 0));
    const biayaEmbalase = Math.max(0, Number(cart.biaya_embalase || 0));
    const ongkosKirim = Math.max(0, Number(cart.ongkos_kirim || 0));
    const biayaLainnya = Math.max(0, Number(cart.biaya_lainnya || 0));
    const totalBiayaTambahan = biayaServis + biayaEmbalase + ongkosKirim + biayaLainnya;
    const grandTotal = Math.max(0, subAfterItemDisc - Number(cart.diskon_global || 0) + totalBiayaTambahan);
    return {
      subtotal,
      itemDiscTotal,
      subAfterItemDisc,
      diskonGlobal: Number(cart.diskon_global || 0),
      biayaServis,
      biayaEmbalase,
      ongkosKirim,
      biayaLainnya,
      totalBiayaTambahan,
      grandTotal
    };
  }

  function renderPosSearchDropdownHtml(catalog) {
    const q = String(S().AppState.posSearchQ || '').trim();
    if (!q) return '';
    const hits = (catalog || []).slice(0, 8);
    if (!hits.length) {
      return `<div class="p-3 text-xs text-center" style="color:var(--ons-text-soft)">Produk "${S().esc(q)}" tidak ditemukan &bull; <button type="button" onclick="window.setPosSubTab('tertolak')" class="text-blue-600 font-bold hover:underline">Catat ke Penjualan Tertolak &rarr;</button></div>`;
    }
    return hits.map((o) => {
      const stok = S().getSellableStok(o.id_obat);
      const nearest = S().getNearestSellableBatch(o.id_obat);
      return `<button type="button" onclick="window.posAddToCart('${S().esc(o.id_obat)}');ONSStore.AppState.posSearchQ='';renderActiveView();" class="w-full text-left px-3 py-2 flex items-center justify-between gap-2 border-b last:border-b-0 hover:bg-blue-500/10 transition" style="border-color:var(--ons-border)">
        <div class="min-w-0 flex-1">
          <div class="font-bold text-xs truncate">${S().esc(o.nama_dagang)} ${S().bpomBadge(o.golongan_bpom)}</div>
          <div class="text-[11px] truncate" style="color:var(--ons-text-soft)">${S().esc(o.zat_aktif || '-')} &bull; Rak ${S().esc(o.rak_lokasi || '-')} ${nearest ? `&bull; Batch ${S().esc(nearest.no_batch)} (ED ${nearest.tgl_kadaluarsa})` : ''}</div>
        </div>
        <div class="text-right shrink-0">
          <div class="font-mono-num font-extrabold text-xs text-blue-600">${S().rp(o.harga_umum)}/${S().esc(o.satuan_dasar)}</div>
          <div class="font-mono-num text-[10px] ${stok > 0 ? 'text-emerald-600' : 'text-red-600 font-bold'}">Stok: ${stok}</div>
        </div>
      </button>`;
    }).join('');
  }

  function playPosBeep(kind) {
    if (!posBeepEnabled) return;
    try {
      const AC = global.AudioContext || global.webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = kind === 'err' ? 'sawtooth' : 'sine';
      osc.frequency.value = kind === 'err' ? 320 : 920;
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (kind === 'err' ? 0.14 : 0.055));
      osc.start();
      osc.stop(ctx.currentTime + (kind === 'err' ? 0.15 : 0.06));
    } catch (e) {}
  }

  function getPosActiveCart() {
    const st = S().AppState;
    return st.carts[st.activeCartIdx] || st.carts[0];
  }

  function getCartItemCountsMap(cart) {
    const counts = {};
    ((cart && cart.items) || []).forEach((it) => {
      counts[it.id_obat] = (counts[it.id_obat] || 0) + Number(it.qty || 0);
    });
    return counts;
  }

  function findBatchMatchObatIds(qLower) {
    const ids = {};
    if (!qLower || qLower.length < 2) return ids;
    (S().AppState.stokBatch || []).forEach((b) => {
      if (String(b.no_batch || '').toLowerCase().includes(qLower) || String(b.id_batch || '').toLowerCase().includes(qLower)) {
        ids[b.id_obat] = true;
      }
    });
    return ids;
  }

  function getFilteredPosCatalog() {
    const st = S().AppState;
    const q = (st.posSearchQ || '').trim().toLowerCase();
    const fGol = st.posFilterGol || '';
    const batchMatchIds = findBatchMatchObatIds(q);

    const list = (st.masterObat || []).filter((o) => {
      if (fGol && String(o.golongan_bpom || '').toUpperCase() !== fGol) return false;
      if (q) {
        const hay = `${o.nama_dagang || ''} ${o.zat_aktif || ''} ${o.kode_kfa || ''} ${o.id_obat || ''} ${o.rak_lokasi || ''}`.toLowerCase();
        if (!hay.includes(q) && !batchMatchIds[o.id_obat]) return false;
      }
      const sellStok = S().getSellableStok(o.id_obat);
      if (posStockFilter === 'READY' && sellStok <= 0) return false;
      if (posStockFilter === 'LOW' && (sellStok <= 0 || sellStok > Number(o.stok_min || 10))) return false;
      if (posStockFilter === 'NEAR_ED') {
        const nearEd = S().getNearEdBatchInfo ? S().getNearEdBatchInfo(o.id_obat, 90) : { hasNearEd: false };
        if (!nearEd.hasNearEd) return false;
      }
      return true;
    });

    return list.sort((a, b) => {
      const sa = S().getSellableStok(a.id_obat) > 0 ? 1 : 0;
      const sb = S().getSellableStok(b.id_obat) > 0 ? 1 : 0;
      if (sa !== sb) return sb - sa;
      return String(a.nama_dagang || '').localeCompare(String(b.nama_dagang || ''));
    });
  }

  function renderPosCatalogCardsHtml(catalog, cart) {
    if (!catalog.length) {
      return `<div class="col-span-full p-8 text-center rounded-2xl border border-dashed space-y-2.5" style="border-color:var(--ons-border);background:var(--ons-bg-subtle)">
        <div class="text-sm font-bold">Obat tidak ditemukan pada filter saat ini</div>
        <div class="text-xs" style="color:var(--ons-text-soft)">Coba ubah kata kunci pencarian, hapus filter golongan BPOM, atau tampilkan semua status stok.</div>
        <button type="button" onclick="window.resetPosCatalogFilters()" class="ons-btn ons-btn-primary text-xs py-1.5 px-4">Reset Semua Filter Katalog</button>
      </div>`;
    }
    const tierMode = (cart && cart.tier_harga) || ((cart && cart.id_member !== 'UMUM') ? 'MEMBER' : 'UMUM');
    const inCartMap = getCartItemCountsMap(cart);
    const isList = posCatalogView === 'LIST';

    return catalog.map((o) => {
      const sellStok = S().getSellableStok(o.id_obat);
      const totalFisik = S().getTotalStok(o.id_obat);
      const expiredQty = Math.max(0, totalFisik - sellStok);
      const nearest = S().getNearestSellableBatch(o.id_obat);
      const edDays = nearest ? S().daysUntil(nearest.tgl_kadaluarsa) : null;
      const edBadgeCls = edDays === null ? '' : (edDays <= 90 ? 'text-red-600 font-bold' : (edDays <= 180 ? 'text-amber-600 font-semibold' : 'text-emerald-600'));
      const effPrice = S().getEffectiveObatPrice ? S().getEffectiveObatPrice(o, 1, tierMode) : { harga: o.harga_umum, tierApplied: 'UMUM' };
      const nearEd = S().getNearEdBatchInfo ? S().getNearEdBatchInfo(o.id_obat, 90) : { hasNearEd: false };
      const qtyInCart = inCartMap[o.id_obat] || 0;
      const isLow = sellStok > 0 && sellStok <= Number(o.stok_min || 10);
      const isEmpty = sellStok <= 0;

      if (isList) {
        return `<div onclick="window.posAddToCart('${S().esc(o.id_obat)}')" class="ons-pos-listrow ${qtyInCart ? 'is-incart' : ''} ${isEmpty ? 'opacity-70' : ''}">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="font-bold text-xs truncate">${S().esc(o.nama_dagang)}</span>
              ${S().bpomBadge(o.golongan_bpom)}
              ${qtyInCart ? `<span class="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-600 text-white">${qtyInCart}x</span>` : ''}
              ${nearEd.hasNearEd ? `<span class="badge-bpom bpom-prekursor text-[9px]">ED ${nearEd.minDays}h</span>` : ''}
            </div>
            <div class="text-[11px] truncate" style="color:var(--ons-text-soft)">${S().esc(o.zat_aktif)} &bull; Rak ${S().esc(o.rak_lokasi || '-')} &bull; ${nearest ? `Batch ${S().esc(nearest.no_batch)} (<span class="${edBadgeCls}">ED ${nearest.tgl_kadaluarsa}</span>)` : (expiredQty > 0 ? '<span class="text-red-600 font-bold">Batch ED Terblokir</span>' : '<span class="text-red-600 font-bold">Kosong</span>')}</div>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <div class="text-right">
              <div class="text-xs font-extrabold font-mono-num text-blue-600">${S().rp(effPrice.harga)}<span class="text-[10px] font-normal">/${S().esc(o.satuan_dasar)}</span></div>
              <div class="text-[10px] font-mono-num ${isLow || isEmpty ? 'text-red-600 font-bold' : 'text-emerald-600'}">Stok Jual: ${sellStok}</div>
            </div>
            ${(S().isMultiBranchEnabled && S().isMultiBranchEnabled()) ? `<button type="button" onclick="event.stopPropagation();window.openBranchCompareDrawer('${S().esc(o.id_obat)}')" class="ons-btn ons-btn-ghost text-[10px] px-2 py-1 min-h-0 h-7">Cabang</button>` : ''}
            <button type="button" onclick="event.stopPropagation();window.posAddToCart('${S().esc(o.id_obat)}')" ${isEmpty ? 'disabled' : ''} class="ons-btn ons-btn-primary text-xs px-2.5 py-1 min-h-0 h-7">+</button>
          </div>
        </div>`;
      }

      const emptyAction = (S().isMultiBranchEnabled && S().isMultiBranchEnabled())
        ? `window.openBranchCompareDrawer('${S().esc(o.id_obat)}')`
        : `window.toast('Stok habis — periksa Batch FEFO atau input Faktur PBF untuk restok.','warn')`;

      return `<div onclick="${isEmpty ? emptyAction : `window.posAddToCart('${S().esc(o.id_obat)}')`}" class="ons-pos-card gap-2 ${qtyInCart ? 'is-incart' : ''} ${isEmpty ? 'is-empty' : ''}">
        <div>
          <div class="flex items-start justify-between gap-2">
            <div class="font-bold text-sm leading-snug line-clamp-2">${S().esc(o.nama_dagang)}</div>
            <div class="shrink-0 flex flex-col items-end gap-1">
              ${S().bpomBadge(o.golongan_bpom)}
              ${qtyInCart ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-600 text-white shadow-sm">${qtyInCart} di keranjang</span>` : ''}
            </div>
          </div>
          <div class="text-[11px] mt-1 truncate" style="color:var(--ons-text-soft)">${S().esc(o.zat_aktif)} &bull; Rak <b>${S().esc(o.rak_lokasi || '-')}</b></div>
          <div class="text-[11px] font-mono-num mt-1" style="color:var(--ons-text-soft)">
            FEFO: ${nearest ? `${S().esc(nearest.no_batch)} &bull; <span class="${edBadgeCls}">ED ${nearest.tgl_kadaluarsa} (${edDays}h)</span>` : (expiredQty > 0 ? `<span class="text-red-500 font-bold">Batch ED (${expiredQty} Terblokir)</span>` : '<span class="text-red-500 font-bold">Stok Kosong</span>')}
          </div>
          <div class="flex flex-wrap gap-1 mt-1.5">
            ${nearEd.hasNearEd ? `<span class="badge-bpom bpom-prekursor text-[10px]">Promo Near-ED &le;${nearEd.minDays}h: -${nearEd.suggestedDiscPct}%</span>` : ''}
            ${isLow ? '<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300">Stok Menipis</span>' : ''}
            ${o.min_qty_grosir && o.harga_grosir ? `<span class="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-500/10 text-sky-700 dark:text-sky-300">Grosir &ge;${o.min_qty_grosir}: ${S().rp(o.harga_grosir)}</span>` : ''}
          </div>
        </div>
        <div class="flex items-center justify-between pt-2 border-t gap-2" style="border-color:var(--ons-border)">
          <div class="min-w-0">
            <div class="text-sm font-extrabold font-mono-num text-blue-600">${S().rp(effPrice.harga)} <span class="text-[10px] font-normal" style="color:var(--ons-text-soft)">/${S().esc(o.satuan_dasar)}</span></div>
            <div class="text-[11px] font-mono-num ${isLow || isEmpty ? 'text-red-600 font-bold' : 'text-emerald-600'}">Stok Jual: ${sellStok}${expiredQty > 0 ? ` <span class="text-amber-600">(+${expiredQty} ED)</span>` : ''}</div>
          </div>
          <div class="flex gap-1 shrink-0">
            ${(S().isMultiBranchEnabled && S().isMultiBranchEnabled()) ? `<button type="button" onclick="event.stopPropagation();window.openBranchCompareDrawer('${S().esc(o.id_obat)}')" class="ons-btn ons-btn-ghost text-[11px] px-2 py-1 min-h-0 h-8" title="Cek Stok Antar-Cabang">Cabang</button>` : ''}
            ${o.substitusi_ids ? `<button type="button" onclick="event.stopPropagation();window.openSubstitusiModal('${S().esc(o.id_obat)}')" class="ons-btn ons-btn-ghost text-[11px] px-2 py-1 min-h-0 h-8" title="Alternatif Substitusi">Sub</button>` : ''}
            <button type="button" onclick="event.stopPropagation();window.posAddToCart('${S().esc(o.id_obat)}')" ${isEmpty ? 'disabled' : ''} class="ons-btn ons-btn-primary text-xs px-2.5 py-1 min-h-0 h-8">+ Keranjang</button>
          </div>
        </div>
      </div>`;
    }).join('');
  }

  function syncPosCatalogDomOnly() {
    const grid = document.getElementById('posCatalogGrid');
    const ddEl = document.getElementById('posSearchDropdown');
    const cart = getPosActiveCart();
    const catalog = getFilteredPosCatalog();
    if (ddEl) {
      const hasQ = Boolean(String(S().AppState.posSearchQ || '').trim());
      ddEl.innerHTML = hasQ ? renderPosSearchDropdownHtml(catalog) : '';
      ddEl.classList.toggle('hidden', !hasQ);
    }
    const clrBtn = document.getElementById('posSearchClearBtn');
    if (clrBtn) clrBtn.classList.toggle('hidden', !String(S().AppState.posSearchQ || '').trim());
    if (!grid) {
      if (!ddEl) global.renderActiveView();
      return;
    }
    grid.className = posCatalogView === 'LIST'
      ? 'space-y-2 max-h-[42vh] overflow-y-auto pr-1'
      : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[42vh] overflow-y-auto pr-1';
    grid.innerHTML = renderPosCatalogCardsHtml(catalog, cart);
    const metaEl = document.getElementById('posCatalogMeta');
    if (metaEl) metaEl.textContent = `${catalog.length} dari ${(S().AppState.masterObat || []).length} item`;
  }

  function pickSmartCrossSellCandidate(cart, masterObat) {
    if (!cart || !cart.items.length || !Array.isArray(masterObat)) return null;
    const inCartIds = new Set(cart.items.map((it) => it.id_obat));
    const readyList = masterObat.filter((o) => !inCartIds.has(o.id_obat) && S().getSellableStok(o.id_obat) > 0);
    if (!readyList.length) return null;

    const cartNames = cart.items.map((it) => String(it.nama_dagang || '').toLowerCase()).join(' ');
    const isAbx = /amox|cefix|azithro|cipro|antibiotik/.test(cartNames);
    const isPainFever = /paracetamol|sanmol|ibuprofen|asam mefenamat|demam/.test(cartNames);
    const preferRe = isAbx
      ? /probiotik|lacto|zinc|vitamin|imboost|enervon/i
      : (isPainFever ? /vitamin|c\b|imboost|antasida|oralit|madu/i : /vitamin|probiotik|oralit|antasida|paracetamol|sanmol/i);

    const exact = readyList.find((o) => preferRe.test(`${o.nama_dagang || ''} ${o.zat_aktif || ''}`));
    if (exact) return exact;
    return readyList.find((o) => String(o.golongan_bpom || '').toUpperCase() !== 'KERAS') || readyList[0];
  }

  function buildPosDailySummaryStats(penjualan, seeCost) {
    const todayKey = new Date().toISOString().slice(0, 10);
    const activeRows = (penjualan || []).filter((p) => String(p.status_trx || '').toUpperCase() !== 'RETUR');
    const todayRows = activeRows.filter((p) => String(p.tanggal || '').slice(0, 10) === todayKey);
    const todayReturRows = (penjualan || []).filter((p) => String(p.status_trx || '').toUpperCase() === 'RETUR' && String(p.tanggal || '').slice(0, 10) === todayKey);
    const omzetToday = todayRows.reduce((s, p) => s + Number(p.grand_total || 0), 0);
    const returNominalToday = todayReturRows.reduce((s, p) => s + Number(p.grand_total || 0), 0);
    const tunaiToday = todayRows.filter((p) => String(p.metode_bayar || '').toUpperCase() === 'TUNAI').reduce((s, p) => s + Number(p.grand_total || 0), 0);
    const nonTunaiToday = Math.max(0, omzetToday - tunaiToday);
    const labaToday = seeCost ? todayRows.reduce((s, p) => s + Number(p.estimasi_margin !== undefined ? p.estimasi_margin : (Number(p.grand_total || 0) - Number(p.total_hpp || 0))), 0) : 0;
    const poinToday = todayRows.reduce((s, p) => s + Number(p.poin_didapat || 0), 0);
    return {
      countToday: todayRows.length,
      todayRetur: todayReturRows.length,
      returNominalToday,
      omzetToday,
      tunaiToday,
      nonTunaiToday,
      labaToday,
      poinToday,
      totalCount: activeRows.length
    };
  }

  /**
   * Mengambil detail penanda retur (otorisator PIN, alasan & bukti pemulihan stok) dari nota + MUTASI_STOK.
   */
  function _extractPosReturInfo(trx, mutasiStok) {
    const stUp = String((trx && trx.status_trx) || '').toUpperCase();
    const isFullRetur = stUp === 'RETUR';
    const isPartialRetur = stUp === 'RETUR_SEBAGIAN';
    const noInv = String((trx && trx.no_invoice) || '');
    const muts = (mutasiStok || []).filter((m) => String(m.jenis_mutasi || '') === 'RETUR_PENJUALAN' && String(m.referensi_id || '') === noInv);
    const hasReturHistory = isFullRetur || isPartialRetur || muts.length > 0;
    if (!hasReturHistory) return { isRetur: false, isFullRetur: false, isPartialRetur: false, hasReturHistory: false, authorizer: '', alasan: '', tglRetur: '', restoredQty: 0, restoredItemsCount: 0, muts: [] };
    const cat = String((muts[0] && muts[0].catatan) || '');
    const match = /Retur\/Void PIN \(([^)]+)\):\s*(.*)$/i.exec(cat);
    const authorizer = String(trx.apj_override_id || (match && match[1]) || 'APJ / Pemilik');
    const alasan = String(trx.retur_alasan || (match && match[2]) || cat.replace(/^Retur\/Void PIN\s*:\s*/i, '') || 'Retur/Void terotorisasi PIN').trim();
    const tglRetur = String(trx.tgl_retur || (muts[0] && muts[0].timestamp) || '');
    const restoredQty = muts.reduce((s, m) => s + Number(m.qty_ubah || 0), 0);
    return { isRetur: isFullRetur, isFullRetur, isPartialRetur, hasReturHistory, authorizer, alasan, tglRetur, restoredQty, restoredItemsCount: muts.length, muts };
  }

  function _getPosItemsForTrx(st, trx) {
    const noInv = String((trx && trx.no_invoice) || '');
    const idTrx = String((trx && trx.id_transaksi) || '');
    return (st.detailPenjualan || []).filter((d) => (noInv && String(d.no_invoice || '') === noInv) || (idTrx && String(d.id_transaksi || '') === idTrx));
  }

  function _getPosMethodBadgeTone(metode) {
    const map = {
      TUNAI: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
      QRIS: 'bg-blue-500/12 text-blue-700 dark:text-blue-300 border-blue-500/30',
      TRANSFER: 'bg-sky-500/12 text-sky-700 dark:text-sky-300 border-sky-500/30',
      SPLIT: 'bg-amber-500/12 text-amber-700 dark:text-amber-300 border-amber-500/30',
      PIUTANG: 'bg-red-500/12 text-red-700 dark:text-red-300 border-red-500/30'
    };
    return map[String(metode || 'TUNAI').toUpperCase()] || 'bg-slate-500/12 text-slate-700 dark:text-slate-300 border-slate-500/30';
  }

  function _filterPosSalesByPeriod(salesList) {
    const todayIso = toLocalYmd_(new Date());
    const sevenDaysMs = Date.now() - 7 * 86400000;
    const thirtyDaysMs = Date.now() - 30 * 86400000;
    return (salesList || []).filter((p) => {
      const ymd = toLocalYmd_(p.tanggal);
      if (posHistStart && posHistEnd) {
        return ymd >= posHistStart && ymd <= posHistEnd;
      }
      if (posHistPeriod === 'TODAY') return ymd === todayIso;
      if (posHistPeriod === '7D') return new Date(p.tanggal || 0).getTime() >= sevenDaysMs;
      if (posHistPeriod === '30D') return new Date(p.tanggal || 0).getTime() >= thirtyDaysMs;
      return true;
    });
  }

  function _getFilteredPosHistoryRows(st) {
    const hq = posHistQ.trim().toLowerCase();
    const periodRows = _filterPosSalesByPeriod(st.penjualan);
    const filtered = periodRows.filter((p) => {
      const statusUp = String(p.status_trx || 'LUNAS').toUpperCase();
      const metUp = String(p.metode_bayar || '').toUpperCase();
      if (posHistFilter === 'RETUR' && statusUp !== 'RETUR' && statusUp !== 'RETUR_SEBAGIAN') return false;
      if (posHistFilter === 'BELUM_LUNAS' && statusUp !== 'BELUM_LUNAS') return false;
      if (posHistFilter === 'LUNAS' && statusUp !== 'LUNAS') return false;
      if (posHistMethod !== 'SEMUA' && metUp !== posHistMethod) return false;
      if (hq) {
        const mem = (st.members || []).find((m) => m.id_member === p.id_member);
        const itemNames = _getPosItemsForTrx(st, p).map((it) => it.nama_dagang || it.id_obat || '').join(' ');
        const hay = `${p.no_invoice || ''} ${p.kode_eksternal || ''} ${p.channel || ''} ${p.metode_bayar || ''} ${p.kasir_id || ''} ${p.id_member || ''} ${p.pelanggan_nama || ''} ${mem ? mem.nama_pasien : ''} ${p.detail_split || ''} ${p.apj_override_id || ''} ${p.retur_alasan || ''} ${itemNames}`.toLowerCase();
        if (!hay.includes(hq)) return false;
      }
      return true;
    });
    return { periodRows, filtered };
  }

  function _formatIndoRangeCaption(rows, customStart, customEnd, periodCode) {
    const fmt = (ymd) => {
      if (!ymd) return '';
      const dt = new Date(ymd + 'T00:00:00');
      if (isNaN(dt.getTime())) return ymd;
      return dt.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    };
    const todayYmd = toLocalYmd_(new Date());
    if (customStart && customEnd) return `${fmt(customStart)} s.d. ${fmt(customEnd)}`;
    if (periodCode === 'TODAY') return `${fmt(todayYmd)} s.d. ${fmt(todayYmd)}`;
    if (periodCode === '7D') return `${fmt(_shiftLocalYmd(new Date(), -6))} s.d. ${fmt(todayYmd)}`;
    if (periodCode === '30D') return `${fmt(_shiftLocalYmd(new Date(), -29))} s.d. ${fmt(todayYmd)}`;
    const dates = (rows || []).map((r) => toLocalYmd_(r.tanggal || r.tgl_retur)).filter(Boolean).sort();
    if (!dates.length) return `${fmt(todayYmd)} s.d. ${fmt(todayYmd)}`;
    return `${fmt(dates[0])} s.d. ${fmt(dates[dates.length - 1])}`;
  }

  function _renderPosHistorySummaryAndRowsHtml(st, filteredSales) {
    const activeSubset = filteredSales.filter((p) => String(p.status_trx || '').toUpperCase() !== 'RETUR');
    const returSubset = filteredSales.filter((p) => String(p.status_trx || '').toUpperCase() === 'RETUR');
    const partialReturSubset = filteredSales.filter((p) => String(p.status_trx || '').toUpperCase() === 'RETUR_SEBAGIAN');
    const activeNominal = activeSubset.reduce((s, p) => s + Number(p.grand_total || 0), 0);
    const returNominal = returSubset.reduce((s, p) => s + Number(p.grand_total || 0), 0);

    const summaryHtml = `<div class="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl border text-[11px]" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
      <div>Menampilkan <b class="font-mono-num">${filteredSales.length}</b> transaksi${filteredSales.length > 80 ? ' (80 terbaru)' : ''}</div>
      <div class="flex flex-wrap items-center gap-3 font-mono-num">
        <span>Netto Aktif: <b class="text-emerald-600">${S().rp(activeNominal)}</b> (${activeSubset.length} nota)</span>
        ${partialReturSubset.length ? `<span class="text-amber-600 dark:text-amber-400 font-bold">Retur Sebagian: ${partialReturSubset.length} nota</span>` : ''}
        ${returSubset.length ? `<span class="text-red-600 dark:text-red-400 font-bold">Penanda Void Penuh: ${returSubset.length} nota (-${S().rp(returNominal)})</span>` : ''}
      </div>
    </div>`;

    const rowsHtml = filteredSales.slice(0, 80).map((p, idx) => {
      const mem = (st.members || []).find((m) => m.id_member === p.id_member);
      const ret = _extractPosReturInfo(p, st.mutasiStok);
      const items = _getPosItemsForTrx(st, p);
      const itemPreview = items.length
        ? items.slice(0, 2).map((it) => {
            const qtyRet = Number(it.qty_retur || 0);
            const qtySisa = Math.max(0, Number(it.qty || 0) - qtyRet);
            return `${S().esc(it.nama_dagang || it.id_obat)} &times;${qtyRet > 0 ? `${qtySisa}<span class="text-amber-600">(ret:${qtyRet})</span>` : Number(it.qty || 1)}`;
          }).join(', ') + (items.length > 2 ? ` <span class="font-semibold">(+${items.length - 2} produk)</span>` : '')
        : 'Klik Rincian untuk lihat produk';
      const statusUp = String(p.status_trx || 'LUNAS').toUpperCase();
      const statusCls = ret.isFullRetur ? 'bpom-keras' : (ret.isPartialRetur ? 'bpom-prekursor' : (statusUp === 'BELUM_LUNAS' ? 'bpom-prekursor' : 'bpom-bebas'));
      const statusLabel = ret.isFullRetur ? '&#8617; DIRETUR / VOID' : (ret.isPartialRetur ? '&#8617; RETUR SEBAGIAN' : (statusUp === 'BELUM_LUNAS' ? 'TEMPO' : 'LUNAS'));
      const metodeCls = _getPosMethodBadgeTone(p.metode_bayar);
      const customerLabel = mem ? mem.nama_pasien : (p.pelanggan_nama || (p.id_member && p.id_member !== 'UMUM' ? p.id_member : 'Pasien Umum'));

      return `<tr class="${ret.isFullRetur ? 'ons-trx-row-retur' : ''}">
        <td class="text-xs align-top font-mono-num">${idx + 1}</td>
        <td class="text-xs align-top font-mono-num whitespace-nowrap">
          <div>${S().formatTgl(p.tanggal, true)}</div>
          <div class="text-[10px]" style="color:var(--ons-text-soft)">${S().esc(p.channel || 'Offline')}</div>
        </td>
        <td class="text-xs align-top">
          <div class="flex flex-wrap items-center gap-1.5">
            <button type="button" onclick="window.openPosDetailItemsModal('${S().esc(p.no_invoice)}')" class="font-mono-num font-bold hover:underline text-left ${ret.isFullRetur ? 'text-red-700 dark:text-red-300' : 'text-blue-600 dark:text-blue-400'}">${S().esc(p.no_invoice)}</button>
            ${ret.isFullRetur ? '<span class="ons-retur-stamp">&#8617; RETUR / VOID</span>' : (ret.isPartialRetur ? '<span class="badge-bpom bpom-prekursor text-[10px]">&#8617; SEBAGIAN</span>' : '')}
          </div>
          <div class="text-[10px]" style="color:var(--ons-text-soft)">Kasir: <b>${S().esc(p.kasir_id || '-')}</b>${p.kode_eksternal ? ` &bull; Ext: ${S().esc(p.kode_eksternal)}` : ''}</div>
        </td>
        <td class="text-xs align-top">
          <div class="font-bold">${S().esc(customerLabel)}</div>
          ${p.dokter_nama ? `<div class="text-[10px]" style="color:var(--ons-text-soft)">Dr. ${S().esc(p.dokter_nama)}</div>` : ''}
        </td>
        <td class="text-xs align-top max-w-[260px]">
          <div class="text-[11px] truncate" style="color:var(--ons-text-main)">${itemPreview}</div>
          ${ret.hasReturHistory ? `<div class="ons-retur-trace-pill">
            <div class="font-bold ${ret.isFullRetur ? 'text-red-700 dark:text-red-300' : 'text-amber-700 dark:text-amber-300'}">&#8617; Otorisasi ${ret.isPartialRetur ? 'Retur Sebagian' : 'Retur'}: ${S().esc(ret.authorizer)}</div>
            <div class="text-[10px]" style="color:var(--ons-text-soft)">Alasan: <i>${S().esc(ret.alasan)}</i> &bull; <b class="text-emerald-700 dark:text-emerald-300">${ret.restoredQty > 0 ? '+' + ret.restoredQty + ' qty ' : ''}Stok FEFO dipulihkan</b></div>
          </div>` : ''}
        </td>
        <td class="text-xs align-top">
          <div class="flex flex-wrap items-center gap-1">
            <span class="inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-bold ${metodeCls}">${S().esc(p.metode_bayar || 'TUNAI')}</span>
          </div>
          ${ret.isFullRetur ? `<div class="mt-1 font-mono-num">
            <span class="text-[11px] line-through opacity-65">${S().rp(p.grand_total)}</span>
            <div class="font-extrabold text-red-600 dark:text-red-400">-${S().rp(p.grand_total)} (Dibatalkan)</div>
          </div>` : `<div class="mt-1 font-mono-num font-extrabold text-sm">${S().rp(p.grand_total)}${ret.isPartialRetur ? ' <span class="text-[10px] font-normal text-amber-600">(Netto)</span>' : ''}</div>
          ${Number(p.diskon_total || 0) > 0 ? `<div class="text-[10px] text-emerald-600 font-semibold">Disc -${S().rp(p.diskon_total)}</div>` : ''}
          ${Number(p.poin_didapat || 0) > 0 ? `<div class="text-[10px] text-amber-600 font-semibold">+${Number(p.poin_didapat)} poin</div>` : ''}`}
        </td>
        <td class="align-top">
          <span class="badge-bpom ${statusCls}">${statusLabel}</span>
          ${ret.hasReturHistory && ret.tglRetur ? `<div class="text-[10px] font-mono-num mt-1 ${ret.isFullRetur ? 'text-red-700 dark:text-red-300' : 'text-amber-700 dark:text-amber-300'}">${S().formatTgl(ret.tglRetur, true)}</div>` : ''}
        </td>
        <td class="align-top">
          <div class="flex flex-wrap gap-1.5">
            <button type="button" onclick="window.openPosDetailItemsModal('${S().esc(p.no_invoice)}')" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2.5">${ret.isFullRetur ? 'Bukti Retur' : 'Rincian Item'}</button>
            <button type="button" onclick="window.openPosReprintModal('${S().esc(p.no_invoice)}')" class="ons-btn ${ret.isFullRetur ? 'ons-btn-ghost' : 'ons-btn-primary'} text-[11px] py-1 px-2.5">${ret.isFullRetur ? 'Nota Void' : 'Struk Thermal'}</button>
            ${!ret.isFullRetur ? `<button type="button" onclick="window.openPosVoidReturnModal('${S().esc(p.no_invoice)}', ${Number(p.grand_total || 0)})" class="ons-btn ons-btn-danger text-[11px] py-1 px-2.5">Retur/Void PIN</button>` : ''}
          </div>
        </td>
      </tr>`;
    }).join('') || `<tr><td colspan="8" class="text-center py-8 text-xs">
      <div class="font-semibold mb-1">Data tidak ditemukan pada filter saat ini.</div>
      <button type="button" onclick="window.resetPosHistFilters()" class="ons-btn ons-btn-ghost text-[11px] py-1 px-3 mt-1">Reset Filter Pencarian</button>
    </td></tr>`;

    return { summaryHtml, rowsHtml, activeNominal, activeCount: activeSubset.length };
  }

  function _syncPosHistoryDomOnly() {
    const tbody = document.getElementById('posHistoryTableBody');
    if (!tbody) {
      global.renderActiveView();
      return;
    }
    const st = S().AppState;
    const { filtered } = _getFilteredPosHistoryRows(st);
    const { summaryHtml, rowsHtml, activeNominal, activeCount } = _renderPosHistorySummaryAndRowsHtml(st, filtered);
    tbody.innerHTML = rowsHtml;
    const sumEl = document.getElementById('posHistorySummaryLine');
    if (sumEl) sumEl.innerHTML = summaryHtml;
    const totEl = document.getElementById('posRekapTotalSales');
    if (totEl) totEl.textContent = S().rp(activeNominal);
    const cntEl = document.getElementById('posRekapCountSales');
    if (cntEl) cntEl.textContent = `${activeCount} transaksi`;
    const clrBtn = document.getElementById('posHistClearBtn');
    if (clrBtn) clrBtn.classList.toggle('hidden', !posHistQ.trim());
  }

  function renderPosHistoryView(st, subTabHeader) {
    const seeCost = S().canSeeFinancialCost ? S().canSeeFinancialCost() : false;
    const { periodRows, filtered: filteredSales } = _getFilteredPosHistoryRows(st);
    const { summaryHtml, rowsHtml, activeNominal, activeCount } = _renderPosHistorySummaryAndRowsHtml(st, filteredSales);
    const ds = buildPosDailySummaryStats(st.penjualan, seeCost);
    const marginPct = ds.omzetToday > 0 ? Math.round((ds.labaToday / ds.omzetToday) * 1000) / 10 : 0;

    const allReturRows = (st.penjualan || []).filter((p) => String(p.status_trx || '').toUpperCase() === 'RETUR');
    const allReturNominal = allReturRows.reduce((s, p) => s + Number(p.grand_total || 0), 0);
    const draftCount = (st.carts || []).filter((c) => (c.items && c.items.length > 0) || c.held_at).length;
    const rekapRangeTxt = _formatIndoRangeCaption(filteredSales, posHistStart, posHistEnd, posHistPeriod);

    return `<div class="space-y-3.5 ons-view-enter">
      ${subTabHeader}
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 class="text-xl font-extrabold" style="color:var(--ons-primary)">Daftar Penjualan</h2>
          <p class="text-xs" style="color:var(--ons-text-soft)">Riwayat struk penjualan, faktur tempo, draft tertunda, cetak ulang struk &amp; audit retur.</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button type="button" onclick="window.openPosDraftModal()" class="ons-btn ons-btn-emerald text-xs px-3.5 font-bold">Draft (${draftCount})</button>
          <button type="button" onclick="window.setPosSubTab('kasir')" class="ons-btn ons-btn-primary text-xs px-3.5 font-bold">+ Faktur Penjualan</button>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div class="ons-card p-3.5" style="border-top:3px solid #0066FE">
          <div class="text-[11px] font-bold uppercase tracking-wide" style="color:var(--ons-text-soft)">Transaksi Hari Ini</div>
          <div class="text-xl font-extrabold font-mono-num mt-1">${ds.countToday} <span class="text-xs font-semibold" style="color:var(--ons-text-soft)">nota aktif</span></div>
          <div class="text-[11px] mt-1" style="color:var(--ons-text-soft)">${ds.todayRetur ? `<span class="text-red-600 font-bold">&#8617; ${ds.todayRetur} retur hari ini</span> &bull; ` : ''}Total arsip: ${ds.totalCount} nota</div>
        </div>
        <div class="ons-card p-3.5" style="border-top:3px solid #059669">
          <div class="text-[11px] font-bold uppercase tracking-wide" style="color:var(--ons-text-soft)">Omzet Bersih Hari Ini</div>
          <div class="text-xl font-extrabold font-mono-num text-emerald-600 mt-1">${S().rp(ds.omzetToday)}</div>
          <div class="text-[11px] mt-1" style="color:var(--ons-text-soft)">${ds.returNominalToday > 0 ? `<span class="text-red-600 font-semibold">Dikurangi retur: -${S().rp(ds.returNominalToday)}</span>` : 'Nilai penjualan non-retur hari ini'}</div>
        </div>
        <div class="ons-card p-3.5" style="border-top:3px solid #0284C7">
          <div class="text-[11px] font-bold uppercase tracking-wide" style="color:var(--ons-text-soft)">Tunai vs Non-Tunai</div>
          <div class="text-sm font-extrabold font-mono-num mt-1 text-blue-600">${S().rp(ds.tunaiToday)} <span class="text-[11px] font-normal" style="color:var(--ons-text-soft)">Tunai</span></div>
          <div class="text-[11px] font-mono-num mt-0.5" style="color:var(--ons-text-soft)">Non-Tunai/Tempo: <b>${S().rp(ds.nonTunaiToday)}</b></div>
        </div>
        ${seeCost ? `<div class="ons-card p-3.5" style="border-top:3px solid #D97706">
          <div class="text-[11px] font-bold uppercase tracking-wide" style="color:var(--ons-text-soft)">Est. Laba Kotor Hari Ini</div>
          <div class="text-xl font-extrabold font-mono-num ${ds.labaToday >= 0 ? 'text-emerald-600' : 'text-red-600'} mt-1">${S().rp(ds.labaToday)}</div>
          <div class="text-[11px] mt-1" style="color:var(--ons-text-soft)">Margin kotor rata-rata: <b class="font-mono-num">${marginPct}%</b></div>
        </div>` : `<div class="ons-card p-3.5" style="border-top:3px solid #D97706">
          <div class="text-[11px] font-bold uppercase tracking-wide" style="color:var(--ons-text-soft)">Poin Loyalitas Terbit</div>
          <div class="text-xl font-extrabold font-mono-num text-amber-600 mt-1">+${ds.poinToday} Poin</div>
          <div class="text-[11px] mt-1" style="color:var(--ons-text-soft)">Otomatis dikreditkan ke Member Apotek</div>
        </div>`}
      </div>

      ${allReturRows.length > 0 ? `<div class="ons-retur-alert-bar text-xs">
        <div class="flex items-start gap-2.5 min-w-0 flex-1">
          <span class="ons-retur-stamp shrink-0 mt-0.5">&#8617; PENANDA RETUR</span>
          <div class="min-w-0">
            <div class="font-bold text-red-700 dark:text-red-300">Terdapat ${allReturRows.length} transaksi berstatus DIRETUR / VOID (Total nilai balik: <span class="font-mono-num">${S().rp(allReturNominal)}</span>)</div>
            <div class="text-[11px]" style="color:var(--ons-text-soft)">Setiap nota retur diberi penanda merah khusus, dikecualikan dari omzet aktif, dan stok batch telah dipulihkan otomatis ke gudang.</div>
          </div>
        </div>
        ${posHistFilter === 'RETUR'
          ? `<button type="button" onclick="window.setPosHistFilter('SEMUA')" class="ons-btn ons-btn-ghost text-xs shrink-0">Tampilkan Semua Transaksi</button>`
          : `<button type="button" onclick="window.setPosHistFilter('RETUR')" class="ons-btn ons-btn-danger text-xs shrink-0">Filter Hanya Retur (${allReturRows.length}) &rarr;</button>`}
      </div>` : ''}

      <div class="ons-card p-4 space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
            <div>
              <label class="text-[10px] font-bold block mb-0.5" style="color:var(--ons-text-soft)">Pilihan Data</label>
              <select aria-label="Pilihan Data Penjualan" class="ons-select text-xs h-9 py-1 w-44" onchange="window.setPosHistFilter(this.value)">
                ${[
                  { id: 'SEMUA', lbl: `Semua Transaksi (${periodRows.length})` },
                  { id: 'LUNAS', lbl: 'Struk Penjualan (Lunas)' },
                  { id: 'BELUM_LUNAS', lbl: 'Faktur Tempo / Belum Lunas' },
                  { id: 'RETUR', lbl: 'Retur / Void' }
                ].map((opt) => `<option value="${opt.id}" ${posHistFilter === opt.id ? 'selected' : ''}>${opt.lbl}</option>`).join('')}
              </select>
            </div>
            <div class="flex-1 min-w-[180px] max-w-xs">
              <label class="text-[10px] font-bold block mb-0.5" style="color:var(--ons-text-soft)">Cari data</label>
              <div class="relative">
                <input id="posHistSearchInp" class="ons-input text-xs h-9 py-1 pr-7" placeholder="Cari No. Struk, Pelanggan, Kasir, Obat..." value="${S().esc(posHistQ)}" oninput="window.setPosHistQ(this.value)"/>
                <button id="posHistClearBtn" type="button" onclick="window.setPosHistQ('')" aria-label="Bersihkan pencarian" class="${posHistQ.trim() ? '' : 'hidden '}absolute right-2 top-1/2 -translate-y-1/2 text-sm px-1 font-bold" style="color:var(--ons-text-soft)">&times;</button>
              </div>
            </div>
            <div>
              <label class="text-[10px] font-bold block mb-0.5" style="color:var(--ons-text-soft)">Metode</label>
              <select aria-label="Filter metode pembayaran" class="ons-select text-xs h-9 py-1 w-36" onchange="window.setPosHistMethod(this.value)">
                ${[
                  { id: 'SEMUA', lbl: 'Semua Metode' },
                  { id: 'TUNAI', lbl: 'Tunai' },
                  { id: 'QRIS', lbl: 'QRIS' },
                  { id: 'TRANSFER', lbl: 'Transfer / EDC' },
                  { id: 'SPLIT', lbl: 'Split Payment' },
                  { id: 'PIUTANG', lbl: 'Piutang / Tempo' }
                ].map((m) => `<option value="${m.id}" ${posHistMethod === m.id ? 'selected' : ''}>${m.lbl}</option>`).join('')}
              </select>
            </div>
          </div>

          <div class="flex flex-wrap items-end gap-1.5">
            <div>
              <label class="text-[10px] font-bold block mb-0.5" style="color:var(--ons-text-soft)">Filter Tgl</label>
              <div class="flex items-center gap-1">
                <input id="posHistDateStart" type="date" value="${S().esc(posHistStart)}" onchange="window.setPosHistDateRange(this.value, document.getElementById('posHistDateEnd')?.value)" class="ons-input text-xs h-9 py-1 w-32 font-mono-num"/>
                <span class="text-xs">-</span>
                <input id="posHistDateEnd" type="date" value="${S().esc(posHistEnd)}" onchange="window.setPosHistDateRange(document.getElementById('posHistDateStart')?.value, this.value)" class="ons-input text-xs h-9 py-1 w-32 font-mono-num"/>
              </div>
            </div>
            <button type="button" onclick="window.exportPosHistoryExcel('xlsx')" class="ons-btn ons-btn-emerald text-xs h-9">Export Excel</button>
            <button type="button" onclick="window.exportPosHistoryExcel('csv')" class="ons-btn ons-btn-ghost text-xs h-9">CSV</button>
            <button type="button" onclick="window.exportPosHistoryExcel('pdf')" class="ons-btn ons-btn-ghost text-xs h-9">PDF</button>
            <button type="button" onclick="bootLoadState(true)" class="ons-btn ons-btn-primary text-xs h-9">Segarkan</button>
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex flex-wrap items-center gap-1.5">
            ${[
              { id: 'ALL', lbl: 'Semua Waktu' },
              { id: 'TODAY', lbl: 'Hari Ini' },
              { id: '7D', lbl: '7 Hari' },
              { id: '30D', lbl: '30 Hari' }
            ].map((pr) => `<button type="button" onclick="window.setPosHistPeriod('${pr.id}')" class="ons-pos-chip ${!posHistStart && !posHistEnd && posHistPeriod === pr.id ? 'is-active' : ''}">${pr.lbl}</button>`).join('')}
            ${(posHistStart || posHistEnd || posHistFilter !== 'SEMUA' || posHistMethod !== 'SEMUA' || posHistQ) ? `<button type="button" onclick="window.resetPosHistFilters()" class="ons-pos-chip text-red-600 border-red-400">Reset Filter</button>` : ''}
          </div>
        </div>

        <div id="posHistorySummaryLine">${summaryHtml}</div>

        <div class="ons-table-wrap">
          <table class="ons-table">
            <thead><tr><th>No.</th><th>Tanggal</th><th>No. Struk</th><th>Pelanggan</th><th>Produk</th><th>Total Penjualan</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody id="posHistoryTableBody">${rowsHtml}</tbody>
          </table>
        </div>
      </div>

      <div class="ons-pos-rekap-foot text-xs">
        <button type="button" onclick="window.togglePosRekapFoot()" class="w-full flex items-center justify-between text-left font-extrabold text-sm" style="color:var(--ons-primary)">
          <span>Rekap dari ${S().esc(rekapRangeTxt)}</span>
          <span aria-hidden="true">${posRekapExpanded ? '&#9650;' : '&#9660;'}</span>
        </button>
        ${posRekapExpanded ? `<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 mt-2 border-t" style="border-color:var(--ons-border)">
          <div class="flex items-center justify-between gap-2">
            <span style="color:var(--ons-text-soft)">Total Penjualan</span>
            <span id="posRekapTotalSales" class="font-mono-num font-extrabold text-sm text-emerald-600">: ${S().rp(activeNominal)}</span>
          </div>
          <div class="flex items-center justify-between gap-2">
            <div>
              <div style="color:var(--ons-text-soft)">Jumlah Transaksi Penjualan</div>
              <div class="text-[10px] italic" style="color:var(--ons-text-soft)">*Tidak termasuk data retur penuh</div>
            </div>
            <span id="posRekapCountSales" class="font-mono-num font-extrabold text-sm">: ${activeCount} transaksi</span>
          </div>
        </div>
        <div class="text-[10px] italic mt-2 pt-2 border-t" style="color:var(--ons-text-soft);border-color:var(--ons-border)">*Rekap dihitung berdasarkan filter tanggal, filter data yang aktif, dan kata kunci pencarian.</div>` : ''}
      </div>
    </div>`;
  }

  function renderPosReturView(st, subTabHeader) {
    const q = posReturQ.trim().toLowerCase();
    const todayIso = toLocalYmd_(new Date());
    const returRowsAll = (st.penjualan || []).filter((p) => {
      const ret = _extractPosReturInfo(p, st.mutasiStok);
      return ret.hasReturHistory;
    });
    const filtered = returRowsAll.filter((p) => {
      const ret = _extractPosReturInfo(p, st.mutasiStok);
      const ymd = toLocalYmd_(ret.tglRetur || p.tanggal);
      if (posReturStart && posReturEnd) {
        if (ymd < posReturStart || ymd > posReturEnd) return false;
      } else if (posReturPeriod === 'TODAY' && ymd !== todayIso) {
        return false;
      } else if (posReturPeriod === '7D' && new Date(ret.tglRetur || p.tanggal || 0).getTime() < (Date.now() - 7 * 86400000)) {
        return false;
      } else if (posReturPeriod === '30D' && new Date(ret.tglRetur || p.tanggal || 0).getTime() < (Date.now() - 30 * 86400000)) {
        return false;
      }
      if (q) {
        const mem = (st.members || []).find((m) => m.id_member === p.id_member);
        const items = _getPosItemsForTrx(st, p).map((it) => it.nama_dagang || it.id_obat || '').join(' ');
        const hay = `${p.no_invoice || ''} RET-${p.no_invoice || ''} ${mem ? mem.nama_pasien : ''} ${p.pelanggan_nama || ''} ${ret.authorizer} ${ret.alasan} ${items}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const totalReturNominal = filtered.reduce((s, p) => {
      const ret = _extractPosReturInfo(p, st.mutasiStok);
      if (ret.isFullRetur) return s + Number(p.grand_total || 0);
      const items = _getPosItemsForTrx(st, p);
      const partVal = items.reduce((acc, it) => acc + (Number(it.qty_retur || 0) * Number(it.harga_jual || 0)), 0);
      return s + (partVal > 0 ? partVal : Number(p.grand_total || 0));
    }, 0);
    const rekapRangeTxt = _formatIndoRangeCaption(filtered, posReturStart, posReturEnd, posReturPeriod);

    return `<div class="space-y-3.5 ons-view-enter">
      ${subTabHeader}
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 class="text-xl font-extrabold" style="color:var(--ons-primary)">Retur Penjualan</h2>
          <p class="text-xs" style="color:var(--ons-text-soft)">Daftar transaksi retur penuh &amp; retur sebagian yang diotorisasi PIN APJ/Pemilik serta pemulihan stok batch FEFO.</p>
        </div>
        <button type="button" onclick="window.openPosPickInvoiceForReturnModal()" class="ons-btn ons-btn-danger text-xs px-3.5 font-bold">+ Proses Retur Nota</button>
      </div>

      <div class="ons-card p-4 space-y-3">
        <div class="flex flex-wrap items-end justify-between gap-2">
          <div class="flex-1 min-w-[220px] max-w-sm">
            <label class="text-[10px] font-bold block mb-0.5" style="color:var(--ons-text-soft)">Cari data</label>
            <input id="posReturSearchInp" class="ons-input text-xs h-9" placeholder="Cari No. Retur, No. Faktur Asal, Pelanggan, Obat..." value="${S().esc(posReturQ)}" oninput="window.setPosReturQ(this.value)"/>
          </div>
          <div class="flex flex-wrap items-end gap-1.5">
            <div>
              <label class="text-[10px] font-bold block mb-0.5" style="color:var(--ons-text-soft)">Filter Tgl</label>
              <div class="flex items-center gap-1">
                <input id="posReturDateStart" type="date" value="${S().esc(posReturStart)}" onchange="window.setPosReturDateRange(this.value, document.getElementById('posReturDateEnd')?.value)" class="ons-input text-xs h-9 w-32 font-mono-num"/>
                <span class="text-xs">-</span>
                <input id="posReturDateEnd" type="date" value="${S().esc(posReturEnd)}" onchange="window.setPosReturDateRange(document.getElementById('posReturDateStart')?.value, this.value)" class="ons-input text-xs h-9 w-32 font-mono-num"/>
              </div>
            </div>
            ${['ALL', 'TODAY', '7D', '30D'].map((pr) => `<button type="button" onclick="window.setPosReturPeriod('${pr}')" class="ons-pos-chip ${!posReturStart && !posReturEnd && posReturPeriod === pr ? 'is-active' : ''}">${pr === 'ALL' ? 'Semua' : (pr === 'TODAY' ? 'Hari Ini' : pr)}</button>`).join('')}
            <button type="button" onclick="window.setPosHistFilter('RETUR');window.exportPosHistoryExcel('xlsx');" class="ons-btn ons-btn-emerald text-xs h-9">Export Excel</button>
            <button type="button" onclick="bootLoadState(true)" class="ons-btn ons-btn-ghost text-xs h-9">Segarkan</button>
          </div>
        </div>

        <div class="ons-table-wrap">
          <table class="ons-table">
            <thead><tr><th>No.</th><th>Tanggal Retur</th><th>No. Retur</th><th>No. Faktur Asal</th><th>Pelanggan</th><th>Produk</th><th>Nilai Retur</th><th>Actions</th></tr></thead>
            <tbody>
              ${filtered.length ? filtered.map((p, idx) => {
                const ret = _extractPosReturInfo(p, st.mutasiStok);
                const mem = (st.members || []).find((m) => m.id_member === p.id_member);
                const items = _getPosItemsForTrx(st, p);
                const prodText = items.length ? items.map((it) => `${S().esc(it.nama_dagang || it.id_obat)} (${Number(it.qty_retur || it.qty || 1)} ${S().esc(it.satuan || '')})`).join(', ') : 'Lihat Bukti Retur';
                const retVal = ret.isFullRetur ? Number(p.grand_total || 0) : (items.reduce((acc, it) => acc + Number(it.qty_retur || 0) * Number(it.harga_jual || 0), 0) || Number(p.grand_total || 0));
                return `<tr class="ons-trx-row-retur">
                  <td class="text-xs font-mono-num">${idx + 1}</td>
                  <td class="text-xs font-mono-num whitespace-nowrap">${S().formatTgl(ret.tglRetur || p.tanggal, true)}</td>
                  <td class="text-xs font-mono-num font-bold text-red-700 dark:text-red-300">RET-${S().esc(p.no_invoice)}</td>
                  <td class="text-xs"><button type="button" onclick="window.openPosDetailItemsModal('${S().esc(p.no_invoice)}')" class="font-mono-num font-bold text-blue-600 hover:underline">${S().esc(p.no_invoice)}</button></td>
                  <td class="text-xs font-semibold">${S().esc(mem ? mem.nama_pasien : (p.pelanggan_nama || 'Pasien Umum'))}</td>
                  <td class="text-xs max-w-[260px]">
                    <div class="truncate">${prodText}</div>
                    <div class="text-[10px]" style="color:var(--ons-text-soft)">PIN: <b>${S().esc(ret.authorizer)}</b> &bull; <i>${S().esc(ret.alasan)}</i></div>
                  </td>
                  <td class="text-xs font-mono-num font-extrabold text-red-600">-${S().rp(retVal)}</td>
                  <td class="text-xs">
                    <div class="flex flex-wrap gap-1">
                      <button type="button" onclick="window.openPosDetailItemsModal('${S().esc(p.no_invoice)}')" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2">Bukti Retur</button>
                      <button type="button" onclick="window.openPosReprintModal('${S().esc(p.no_invoice)}')" class="ons-btn ons-btn-primary text-[11px] py-1 px-2">Nota Void</button>
                    </div>
                  </td>
                </tr>`;
              }).join('') : `<tr><td colspan="8" class="text-center py-8 text-xs" style="color:var(--ons-text-soft)">Data retur tidak ditemukan pada rentang ini. Klik <b>+ Proses Retur Nota</b> untuk meretur transaksi yang salah/batal.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>

      <div class="ons-pos-rekap-foot text-xs">
        <div class="font-extrabold text-sm mb-2" style="color:var(--ons-primary)">Rekap dari ${S().esc(rekapRangeTxt)}</div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t" style="border-color:var(--ons-border)">
          <div class="flex items-center justify-between gap-2">
            <span style="color:var(--ons-text-soft)">Total Retur Penjualan</span>
            <span class="font-mono-num font-extrabold text-sm text-red-600">: ${S().rp(totalReturNominal)}</span>
          </div>
          <div class="flex items-center justify-between gap-2">
            <span style="color:var(--ons-text-soft)">Jumlah Transaksi Retur</span>
            <span class="font-mono-num font-extrabold text-sm">: ${filtered.length}x</span>
          </div>
        </div>
      </div>
    </div>`;
  }

  function renderPosTertolakView(st, subTabHeader) {
    const allLost = _getDashLostSales();
    const q = posTertolakQ.trim().toLowerCase();
    const filtered = allLost.filter((ls) => {
      if (!q) return true;
      return `${ls.nama_obat || ''} ${ls.alasan || ''} ${ls.tanggal || ''}`.toLowerCase().includes(q);
    });
    const totalEstNilai = filtered.reduce((s, ls) => s + (Number(ls.qty || 1) * Number(ls.est_harga || 0)), 0);

    return `<div class="space-y-3.5 ons-view-enter">
      ${subTabHeader}
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 class="text-xl font-extrabold" style="color:var(--ons-primary)">Penjualan Tertolak (Lost Sales)</h2>
          <p class="text-xs" style="color:var(--ons-text-soft)">Catat permintaan pelanggan yang gagal dilayani karena stok habis / item belum tersedia untuk perencanaan pengadaan (Defecta).</p>
        </div>
        <div class="flex items-center gap-2 text-xs">
          <span class="px-3 py-1.5 rounded-xl border font-mono-num font-bold bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300">${filtered.length} kejadian${totalEstNilai > 0 ? ` &bull; Est. Peluang ${S().rp(totalEstNilai)}` : ''}</span>
          ${S().canAccessView('faktur') ? `<button type="button" onclick="navigateView('faktur','defecta')" class="ons-btn ons-btn-primary text-xs">Buka Defecta &rarr;</button>` : ''}
        </div>
      </div>

      <div class="ons-card p-4 space-y-3">
        <div class="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end p-3 rounded-xl border" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
          <div class="sm:col-span-4">
            <label class="text-[10px] font-bold block mb-1">Nama Obat / Produk yg Dicari *</label>
            <input id="posTertolakNama" class="ons-input text-xs h-9" placeholder="Cth: Salbutamol Nebules 2.5mg"/>
          </div>
          <div class="sm:col-span-2">
            <label class="text-[10px] font-bold block mb-1">Qty Diminta</label>
            <input id="posTertolakQty" type="number" min="1" value="1" class="ons-input text-xs h-9 font-mono-num"/>
          </div>
          <div class="sm:col-span-2">
            <label class="text-[10px] font-bold block mb-1">Est. Harga (Rp)</label>
            <input id="posTertolakHarga" type="number" min="0" value="0" class="ons-input text-xs h-9 font-mono-num" placeholder="Opsional"/>
          </div>
          <div class="sm:col-span-2">
            <label class="text-[10px] font-bold block mb-1">Alasan Tertolak</label>
            <select id="posTertolakAlasan" class="ons-select text-xs h-9">
              <option value="Stok habis sementara">Stok habis sementara</option>
              <option value="Produk belum ada di katalog">Belum ada di katalog</option>
              <option value="Harga tidak sesuai">Harga tidak sesuai</option>
              <option value="Resep kadaluarsa / butuh konfirmasi">Konfirmasi resep</option>
            </select>
          </div>
          <div class="sm:col-span-2">
            <button type="button" onclick="window.submitPosLostSaleInline()" class="ons-btn ons-btn-primary w-full h-9 text-xs font-bold">+ Catat Tertolak</button>
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-2">
          <input id="posTertolakSearch" class="ons-input text-xs h-9 max-w-xs" placeholder="Cari produk tertolak atau alasan..." value="${S().esc(posTertolakQ)}" oninput="window.setPosTertolakQ(this.value)"/>
          <span class="text-[11px]" style="color:var(--ons-text-soft)">Terhubung langsung dengan metrik Penjualan Tertolak di Dashboard.</span>
        </div>

        <div class="ons-table-wrap">
          <table class="ons-table">
            <thead><tr><th>No.</th><th>Tanggal</th><th>Nama Produk</th><th>Qty</th><th>Est. Nilai Hilang</th><th>Alasan</th><th>Aksi</th></tr></thead>
            <tbody>
              ${filtered.length ? filtered.slice().reverse().map((ls, rIdx) => {
                const origIdx = allLost.indexOf(ls);
                const estVal = Number(ls.qty || 1) * Number(ls.est_harga || 0);
                return `<tr>
                  <td class="text-xs font-mono-num">${rIdx + 1}</td>
                  <td class="text-xs font-mono-num whitespace-nowrap">${S().esc(ls.tanggal || '-')}</td>
                  <td class="text-xs font-bold">${S().esc(ls.nama_obat || '-')}</td>
                  <td class="text-xs font-mono-num font-bold">${Number(ls.qty || 1)}</td>
                  <td class="text-xs font-mono-num">${estVal > 0 ? S().rp(estVal) : '-'}</td>
                  <td class="text-xs"><span class="badge-bpom bpom-prekursor">${S().esc(ls.alasan || 'Stok habis')}</span></td>
                  <td class="text-xs">
                    <div class="flex gap-1.5">
                      ${S().canAccessView('faktur') ? `<button type="button" onclick="navigateView('faktur','defecta')" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2">Ajukan Defecta</button>` : ''}
                      <button type="button" onclick="window.deletePosLostSale(${origIdx})" class="ons-btn ons-btn-danger text-[11px] py-1 px-2">Hapus</button>
                    </div>
                  </td>
                </tr>`;
              }).join('') : `<tr><td colspan="7" class="text-center py-8 text-xs" style="color:var(--ons-text-soft)">Belum ada catatan penjualan tertolak.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    </div>`;
  }

  function renderPosCartPanelHtml(st, cart, member, totals, isBelowHppCart, estHppCart, seeCost) {
    const masterSales = (typeof global.getOnsSalesStaffList === 'function' ? global.getOnsSalesStaffList() : [])
      .map((x) => x && x.nama_sales)
      .filter(Boolean);
    const staffOpts = Array.from(new Set(
      [(st.user && st.user.nama_lengkap) || 'Kasir']
        .concat(masterSales)
        .concat((st.daftarUser || st.pegawai || []).map((u) => u.nama_lengkap || u.nama || '').filter(Boolean))
    ));
    const dokterList = st.masterDokter || [];

    return `<div class="space-y-3">
      <!-- Panel Kanan 1: Rincian Sub-total, Diskon, Biaya & Tombol Bayar/Tunda -->
      <div class="ons-pos-fee-panel ons-pos-ticket space-y-2.5 text-xs">
        <div class="ons-pos-fee-row">
          <span class="font-semibold" style="color:var(--ons-text-soft)">Sub-total</span>
          <input id="posRightSubTotalInp" readonly class="ons-input font-mono-num text-right text-xs h-8 py-1 font-bold" style="background:var(--ons-bg-subtle)" value="${totals.subtotal}"/>
        </div>

        <div class="ons-pos-fee-row">
          <div class="flex items-center gap-1.5">
            <span class="font-semibold">Diskon Faktur</span>
            <div class="ons-pos-disc-toggle">
              <button type="button" onclick="window.setCartDiscMode('PCT')" class="${cart.diskon_mode === 'PCT' ? 'is-active' : ''}">%</button>
              <button type="button" onclick="window.setCartDiscMode('RP')" class="${cart.diskon_mode !== 'PCT' ? 'is-active' : ''}">Rp</button>
            </div>
          </div>
          <div class="flex items-center gap-1">
            <input id="posRightDiscInp" type="number" min="0" max="${cart.diskon_mode === 'PCT' ? 100 : totals.subAfterItemDisc}" value="${cart.diskon_input || 0}" oninput="window.onPosFeeChange('diskon_input', this.value)" onchange="window.applyCartDiscInput(this.value)" class="ons-input font-mono-num text-right text-xs h-8 py-1"/>
            <span class="text-[11px] font-bold shrink-0">${cart.diskon_mode === 'PCT' ? '%' : 'Rp'}</span>
          </div>
        </div>

        ${cart.items.length ? `<div class="flex flex-wrap gap-1 justify-end">
          <button type="button" onclick="window.applyPosDiscPreset('PCT', 0)" class="ons-quick-denom text-[10px] py-0.5 px-1.5">Reset</button>
          <button type="button" onclick="window.applyPosDiscPreset('PCT', 5)" class="ons-quick-denom text-[10px] py-0.5 px-1.5">5%</button>
          <button type="button" onclick="window.applyPosDiscPreset('PCT', 10)" class="ons-quick-denom text-[10px] py-0.5 px-1.5">10%</button>
          <button type="button" onclick="window.applyPosDiscPreset('RP', 5000)" class="ons-quick-denom text-[10px] py-0.5 px-1.5">-5rb</button>
        </div>` : ''}

        ${totals.itemDiscTotal > 0 ? `<div class="flex justify-between text-[11px] text-emerald-600 font-semibold">
          <span>Promo Near-ED Item</span>
          <span class="font-mono-num">-${S().rp(totals.itemDiscTotal)}</span>
        </div>` : ''}

        <div class="ons-pos-fee-row">
          <span class="font-semibold" style="color:var(--ons-text-soft)">Biaya Servis</span>
          <input id="posBiayaServisInp" type="number" min="0" value="${Number(cart.biaya_servis || 0)}" oninput="window.onPosFeeChange('biaya_servis', this.value)" class="ons-input font-mono-num text-right text-xs h-8 py-1"/>
        </div>
        <div class="ons-pos-fee-row">
          <span class="font-semibold" style="color:var(--ons-text-soft)">Biaya Embalase</span>
          <input id="posBiayaEmbalaseInp" type="number" min="0" value="${Number(cart.biaya_embalase || 0)}" oninput="window.onPosFeeChange('biaya_embalase', this.value)" class="ons-input font-mono-num text-right text-xs h-8 py-1"/>
        </div>
        <div class="ons-pos-fee-row">
          <span class="font-semibold" style="color:var(--ons-text-soft)">Ongkos Kirim</span>
          <input id="posOngkosKirimInp" type="number" min="0" value="${Number(cart.ongkos_kirim || 0)}" oninput="window.onPosFeeChange('ongkos_kirim', this.value)" class="ons-input font-mono-num text-right text-xs h-8 py-1"/>
        </div>
        <div class="ons-pos-fee-row">
          <span class="font-semibold" style="color:var(--ons-text-soft)">Biaya Lainnya</span>
          <input id="posBiayaLainnyaInp" type="number" min="0" value="${Number(cart.biaya_lainnya || 0)}" oninput="window.onPosFeeChange('biaya_lainnya', this.value)" class="ons-input font-mono-num text-right text-xs h-8 py-1"/>
        </div>

        ${seeCost && cart.items.length ? `<div class="flex justify-between text-[11px] font-mono-num pt-1 border-t" style="border-color:var(--ons-border);color:var(--ons-text-soft)">
          <span>Est. Laba Kotor (HPP ${S().rp(estHppCart)})</span>
          <span id="posRightLabaSpan" class="${(totals.grandTotal - estHppCart) >= 0 ? 'text-emerald-600 font-bold' : 'text-red-600 font-bold'}">${S().rp(totals.grandTotal - estHppCart)}</span>
        </div>` : ''}

        <!-- CTA Utama: Bayar & Tunda -->
        <div class="grid grid-cols-2 gap-2 pt-1.5">
          <button id="posBayarPrimaryBtn" type="button" onclick="window.posQuickCheckoutShortcut('TUNAI')" class="ons-btn ons-btn-emerald py-2.5 text-xs font-extrabold shadow-sm justify-center">
            <span>Bayar</span>
            <span class="px-1.5 py-0.5 rounded text-[10px] bg-white/20 font-mono-num">F4</span>
          </button>
          <button id="posTundaPrimaryBtn" type="button" onclick="window.openHoldCartModal()" class="ons-btn ons-btn-primary py-2.5 text-xs font-extrabold shadow-sm justify-center">
            <span>Tunda</span>
            <span class="px-1.5 py-0.5 rounded text-[10px] bg-white/20 font-mono-num">F9</span>
          </button>
        </div>

        <!-- Pilihan Metode Bayar Cepat -->
        <div class="grid grid-cols-5 gap-1 pt-0.5">
          <button type="button" onclick="window.posQuickCheckoutShortcut('TUNAI')" class="ons-pos-chip text-[10px] justify-center py-1">Tunai</button>
          <button type="button" onclick="window.posQuickCheckoutShortcut('QRIS')" class="ons-pos-chip text-[10px] justify-center py-1" title="Shortcut [F8]">QRIS BI</button>
          <button type="button" onclick="window.posQuickCheckoutShortcut('TRANSFER')" class="ons-pos-chip text-[10px] justify-center py-1">Transfer</button>
          <button type="button" onclick="window.posQuickCheckoutShortcut('SPLIT')" class="ons-pos-chip text-[10px] justify-center py-1">Split Pay</button>
          <button type="button" onclick="window.posQuickCheckoutShortcut('PIUTANG')" class="ons-pos-chip text-[10px] justify-center py-1 text-amber-700 dark:text-amber-300">Piutang/Tempo</button>
        </div>
      </div>

      <!-- Panel Kanan 2: Pelanggan [+] & Dokter [+] -->
      <div class="ons-pos-fee-panel ons-pos-ticket space-y-2.5 text-xs">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-1.5 min-w-0">
            <span class="font-bold">Pelanggan</span>
            <span class="px-1.5 py-0.5 rounded text-[10px] font-mono-num bg-blue-600 text-white font-bold">F7</span>
          </div>
          <div class="flex items-center gap-1 flex-1 min-w-[140px]">
            <select aria-label="Pilih Pelanggan" onchange="window.onPosMemberChange(this.value)" class="ons-select text-xs h-8 py-1 flex-1">
              <option value="UMUM" ${cart.id_member === 'UMUM' ? 'selected' : ''}>Pasien Umum</option>
              ${st.members.map((m) => `<option value="${m.id_member}" ${cart.id_member === m.id_member ? 'selected' : ''}>${S().esc(m.nama_pasien)}</option>`).join('')}
            </select>
            <button type="button" onclick="window.openPosQuickAddCustomerModal()" class="ons-btn ons-btn-ghost px-2 h-8 min-h-0 text-sm font-extrabold" title="Tambah Pelanggan Baru">+</button>
          </div>
        </div>
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-1.5 min-w-0">
            <span class="font-bold">Dokter</span>
            <span class="px-1.5 py-0.5 rounded text-[10px] font-mono-num bg-blue-600 text-white font-bold">F6</span>
          </div>
          <div class="flex items-center gap-1 flex-1 min-w-[140px]">
            <select aria-label="Pilih Dokter" onchange="window.onPosDoctorChange(this.value)" class="ons-select text-xs h-8 py-1 flex-1">
              <option value="" ${!cart.dokter_nama ? 'selected' : ''}>Tanpa Dokter / OTC</option>
              ${dokterList.map((d) => {
                const nm = d.nama_dokter || d.nama || '';
                return `<option value="${S().esc(nm)}" ${cart.dokter_nama === nm ? 'selected' : ''}>${S().esc(nm)}${d.spesialisasi ? ` (${S().esc(d.spesialisasi)})` : ''}</option>`;
              }).join('')}
              ${cart.dokter_nama && !dokterList.some((d) => (d.nama_dokter || d.nama) === cart.dokter_nama) ? `<option value="${S().esc(cart.dokter_nama)}" selected>${S().esc(cart.dokter_nama)}</option>` : ''}
            </select>
            <button type="button" onclick="window.openPosQuickAddDoctorModal()" class="ons-btn ons-btn-ghost px-2 h-8 min-h-0 text-sm font-extrabold" title="Input / Tambah Dokter Resep">+</button>
          </div>
        </div>
      </div>

      <!-- Panel Kanan 3: Sales, Kanal Penjualan, Kode Eksternal, Catatan -->
      <div class="ons-pos-fee-panel space-y-2 text-xs">
        <div class="ons-pos-fee-row">
          <span class="font-semibold">Sales/Pelayan</span>
          <select aria-label="Sales atau Pelayan" onchange="ONSStore.AppState.carts[ONSStore.AppState.activeCartIdx].sales_nama=this.value" class="ons-select text-xs h-8 py-1">
            <option value="">Pilih Sales</option>
            ${staffOpts.map((nm) => `<option value="${S().esc(nm)}" ${(cart.sales_nama || '') === nm ? 'selected' : ''}>${S().esc(nm)}</option>`).join('')}
          </select>
        </div>
        <div class="ons-pos-fee-row">
          <span class="font-semibold">Kanal Penjualan</span>
          <select aria-label="Kanal Penjualan" onchange="ONSStore.AppState.carts[ONSStore.AppState.activeCartIdx].channel=this.value" class="ons-select text-xs h-8 py-1">
            ${['Offline', 'Toko Fisik', 'Resep WA', 'Pasien Rutin', 'Online / Ojol'].map((ch) => `<option value="${ch}" ${(cart.channel || 'Offline') === ch ? 'selected' : ''}>${ch}</option>`).join('')}
          </select>
        </div>
        <div class="ons-pos-fee-row">
          <span class="font-semibold">Kode Invoice Eksternal</span>
          <input class="ons-input text-xs h-8 py-1 font-mono-num" placeholder="No. Resep / Ojol" value="${S().esc(cart.kode_eksternal || '')}" oninput="ONSStore.AppState.carts[ONSStore.AppState.activeCartIdx].kode_eksternal=this.value"/>
        </div>
        <div class="ons-pos-fee-row">
          <span class="font-semibold">Catatan</span>
          <input class="ons-input text-xs h-8 py-1" placeholder="Catatan kasir..." value="${S().esc(cart.catatan || '')}" oninput="ONSStore.AppState.carts[ONSStore.AppState.activeCartIdx].catatan=this.value"/>
        </div>
      </div>
    </div>`;
  }

  function renderPosView() {
    const st = S().AppState;
    posSubTab = (st.subTabs && st.subTabs.pos) || posSubTab || 'kasir';
    if (posSubTab === 'online') posSubTab = 'kasir';
    const cart = getPosActiveCart();
    if (!cart.diskon_mode) cart.diskon_mode = 'RP';
    if (cart.diskon_input === undefined) cart.diskon_input = Number(cart.diskon_global || 0);
    if (!cart.channel) cart.channel = 'Offline';
    const member = st.members.find((m) => m.id_member === cart.id_member);
    const cdss = S().checkCartCdss(cart);
    const fGol = st.posFilterGol || '';

    const returCountPos = (st.penjualan || []).filter((p) => String(p.status_trx || '').toUpperCase().includes('RETUR')).length;
    const lostCountPos = _getDashLostSales().length;
    const subTabHeader = `
      <div class="flex flex-wrap items-center justify-between gap-2 ons-view-enter">
        <div class="ons-tab-bar" role="tablist" aria-label="Sub-Menu Penjualan">
          <button type="button" onclick="window.setPosSubTab('kasir')" class="ons-tab-btn ${posSubTab === 'kasir' ? 'active' : ''}">Kasir${cart.items.length ? ` <span class="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-600/15 text-blue-600">${cart.items.length}</span>` : ''}</button>
          <button type="button" onclick="window.setPosSubTab('riwayat')" class="ons-tab-btn ${posSubTab === 'riwayat' ? 'active' : ''}">Daftar Penjualan <span class="ml-1 text-[10px] opacity-75 font-mono-num">(${st.penjualan.length})</span></button>
          <button type="button" onclick="window.setPosSubTab('retur')" class="ons-tab-btn ${posSubTab === 'retur' ? 'active' : ''}">Retur Penjualan${returCountPos > 0 ? ` <span class="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/15 text-red-600 dark:text-red-300">${returCountPos}</span>` : ''}</button>
          <button type="button" onclick="window.setPosSubTab('tertolak')" class="ons-tab-btn ${posSubTab === 'tertolak' ? 'active' : ''}">Penjualan Tertolak${lostCountPos > 0 ? ` <span class="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300">${lostCountPos}</span>` : ''}</button>
          ${(S().canAccessSubTab && S().canAccessSubTab('pos', 'tutup-shift')) ? `<button type="button" onclick="window.setPosSubTab('tutup-shift')" class="ons-tab-btn ${posSubTab === 'tutup-shift' ? 'active' : ''}">Tutup Shift &amp; Kas${st.activeShift ? ' <span class="ml-1 inline-block w-2 h-2 rounded-full bg-emerald-500"></span>' : ''}</button>` : ''}
        </div>
      </div>`;

    if (posSubTab === 'riwayat') {
      return renderPosHistoryView(st, subTabHeader);
    }
    if (posSubTab === 'retur') {
      return renderPosReturView(st, subTabHeader);
    }
    if (posSubTab === 'tertolak') {
      return renderPosTertolakView(st, subTabHeader);
    }
    if (posSubTab === 'tutup-shift' && global.ONSViewsClinicalFinanceAdmin && typeof global.ONSViewsClinicalFinanceAdmin.renderTutupShiftView === 'function') {
      return global.ONSViewsClinicalFinanceAdmin.renderTutupShiftView({ embeddedInPos: true, subTabHeader });
    }

    const catalog = getFilteredPosCatalog();
    const totals = computePosCartTotals(cart);
    const grandTotal = totals.grandTotal;
    const seeCost = S().canSeeFinancialCost ? S().canSeeFinancialCost() : false;
    const estHppCart = cart.items.reduce((s, it) => {
      const ob = st.masterObat.find((o) => o.id_obat === it.id_obat);
      const nb = S().getNearestSellableBatch(it.id_obat);
      const hppBase = Number((nb && nb.hpp_beli) || (ob && ob.hpp_avg) || 0);
      return s + (hppBase * Number(it.qty || 1) * Math.max(1, Number(it.faktor_konversi || 1)));
    }, 0);
    const isBelowHppCart = estHppCart > 0 && grandTotal < estHppCart;
    const offQueue = API().getOfflineQueue();
    const dailyStats = buildPosDailySummaryStats(st.penjualan, seeCost);
    const crossSell = pickSmartCrossSellCandidate(cart, st.masterObat);
    const prof = S().getStoreProfile ? S().getStoreProfile() : {};
    const branchLabel = (S().getBranchLabel && S().getBranchLabel(st.cabangId || 'ONS-01')) || (st.cabangId || 'Gudang Utama');
    const todayYmd = toLocalYmd_(new Date());

    return `<div class="space-y-3 ons-view-enter">
      ${subTabHeader}

      <!-- Shift & Multi-Cart Antrean Bar -->
      <div class="ons-pos-bar px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div class="flex flex-wrap items-center gap-1.5">
          ${st.activeShift ? `
            <span class="ons-pos-live-dot"></span>
            <span class="badge-bpom bpom-bebas">SHIFT AKTIF</span>
            <span class="font-mono-num font-bold">${S().esc(st.activeShift.id_shift)}</span>
            <span class="hidden sm:inline" style="color:var(--ons-text-soft)">&bull; ${dailyStats.countToday} trx (${S().rp(dailyStats.omzetToday)})</span>
          ` : `
            <button type="button" onclick="window.openBukaShiftModal()" class="ons-btn ons-btn-primary text-[11px] py-1 px-2.5">+ Buka Shift Kasir</button>
          `}
          <span class="mx-1 opacity-30">|</span>
          ${st.carts.map((c, idx) => {
            const tabTot = (c.items || []).reduce((s, it) => s + Math.max(0, Number(it.harga_jual || 0) * Number(it.qty || 0) - Number(it.diskon_item || 0)), 0);
            return `<div class="inline-flex items-center rounded-lg overflow-hidden border" style="border-color:${idx === st.activeCartIdx ? '#0066FE' : 'var(--ons-border)'}">
              <button type="button" onclick="window.switchPosCart(${idx})" class="ons-btn rounded-none border-0 text-[11px] py-1 px-2.5 min-h-0 h-7 ${idx === st.activeCartIdx ? 'ons-btn-primary' : 'ons-btn-ghost'}">
                <span>${S().esc(c.label)}</span>
                <span class="font-mono-num opacity-90">(${c.items.length})${tabTot > 0 ? ` &bull; ${S().rp(tabTot)}` : ''}</span>
              </button>
              ${st.carts.length > 1 ? `<button type="button" onclick="window.closePosCartTab(${idx})" title="Tutup antrean" class="px-1.5 py-1 text-xs hover:bg-red-500/20 text-red-500 font-bold">&times;</button>` : ''}
            </div>`;
          }).join('')}
          <button type="button" onclick="window.openHoldCartModal()" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2 min-h-0 h-7">+ Hold Antrean</button>
        </div>
        <div class="flex flex-wrap items-center gap-1.5">
          ${offQueue.length ? `<button type="button" onclick="window.syncPosOfflineNow()" class="ons-btn ons-btn-amber text-[11px] py-1 px-2">Sinkron ${offQueue.length}</button>` : ''}
          <button type="button" onclick="window.openKasMasukModal()" class="ons-btn ons-btn-ghost text-emerald-600 dark:text-emerald-400 text-[11px] py-1 px-2 min-h-0 h-7 font-bold" title="Catat Kas Masuk Laci">+ Masuk</button>
          <button type="button" onclick="window.openKasKeluarModal()" class="ons-btn ons-btn-ghost text-rose-600 dark:text-rose-400 text-[11px] py-1 px-2 min-h-0 h-7 font-bold" title="Catat Kas Keluar Laci">- Keluar</button>
          <button type="button" onclick="ONSStore.ThermalPrinter.connect()" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2 min-h-0 h-7">Printer BT</button>
          ${(S().canAccessSubTab && S().canAccessSubTab('pos', 'tutup-shift')) ? `<button type="button" onclick="navigateView('pos','tutup-shift')" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2.5 min-h-0 h-7 font-semibold">Tutup Shift &rarr;</button>` : ''}
        </div>
      </div>

      <!-- Hero Search & Total Bar (Apotek Digital Style) -->
      <div class="ons-pos-hero-strip">
        <div class="ons-pos-dropdown flex-1 min-w-[260px]">
          <div class="ons-pos-search-pill">
            <span class="text-slate-400 text-sm" aria-hidden="true">&#128269;</span>
            <input id="posSearchInput" placeholder="[F2] Tulis nama, kode, zat aktif, atau kategori produk..." value="${S().esc(st.posSearchQ)}" oninput="window.onPosSearch(this.value)" onkeydown="if(event.key==='Enter'){event.preventDefault();window.posAddFirstMatch();}"/>
            <button id="posSearchClearBtn" type="button" onclick="window.clearPosSearchInput()" class="${String(st.posSearchQ || '').trim() ? '' : 'hidden'} px-2 py-0.5 rounded text-sm font-bold text-red-500 hover:bg-red-500/10" title="Bersihkan pencarian">&times;</button>
            <button type="button" onclick="window.startPosCameraScan()" class="ons-btn ons-btn-primary text-[11px] py-1 px-2.5 min-h-0 h-8 rounded-full" title="Scan Barcode Kamera">Scan</button>
            
          </div>
          <div id="posSearchDropdown" class="ons-pos-search-menu ${String(st.posSearchQ || '').trim() ? '' : 'hidden'}">${String(st.posSearchQ || '').trim() ? renderPosSearchDropdownHtml(catalog) : ''}</div>
        </div>
        <div class="flex items-center gap-3 ml-auto">
          <button type="button" onclick="window.openDosageCalculatorModal && window.openDosageCalculatorModal()" class="ons-pos-bar-tool" title="Kalkulator Dosis &amp; Aturan Pakai">&#129658; Hitung Dosis</button>
          <button type="button" onclick="window.openClearPosCartModal()" class="ons-pos-bar-tool" title="Kosongkan Keranjang">&#128465; Bersihkan</button>
          <div class="text-right">
            <div class="text-[10px] uppercase tracking-wider opacity-80 font-semibold">Total Tagihan</div>
            <div id="posHeroTotalDisplay" class="ons-pos-total-hero">${S().rp(grandTotal)}</div>
          </div>
        </div>
      </div>

      <!-- Area Kerja Kasir 12 Kolom -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
        <!-- Kiri (8 Kolom): Tabel Item Keranjang + Katalog Cepat FEFO -->
        <div class="lg:col-span-8 space-y-3">
          ${member ? `<div class="p-2.5 rounded-xl border text-xs flex flex-wrap items-center justify-between gap-2" style="background:var(--ons-primary-tint);border-color:var(--ons-primary);">
            <div class="min-w-0 flex-1"><b>Pasien:</b> ${S().esc(member.nama_pasien)} &bull; <b>Alergi:</b> <span class="text-red-600 font-bold">${S().esc(member.alergi_list || 'Tidak Ada')}</span> &bull; <b>Kondisi:</b> ${S().esc(member.penyakit_kronis || '-')}</div>
            <div class="flex items-center gap-1.5 shrink-0">
              <span class="font-mono-num font-bold text-blue-700">${member.poin_loyalitas} Poin</span>
              ${typeof global.openMemberProfileDrawer === 'function' ? `<button type="button" onclick="window.openMemberProfileDrawer('${S().esc(member.id_member)}')" class="ons-btn ons-btn-ghost text-[10px] py-0.5 px-2 min-h-0 h-6">Profil</button>` : ''}
            </div>
          </div>` : ''}

          ${cdss.alerts.length ? `<div class="space-y-1.5">
            ${cdss.alerts.map((al) => `<div class="p-2.5 rounded-xl text-xs font-semibold border ${al.level === 'DANGER' ? 'bg-red-500/15 border-red-500 text-red-700 dark:text-red-300' : 'bg-amber-500/15 border-amber-500 text-amber-800 dark:text-amber-300'}">${S().esc(al.msg)}</div>`).join('')}
          </div>` : ''}

          ${isBelowHppCart ? `<div class="p-2.5 rounded-xl text-xs font-bold border bg-red-500/15 border-red-500 text-red-700 dark:text-red-300">
            &#9888;&#65039; PERINGATAN ANTI-RUGI: Total jual (${S().rp(grandTotal)})${seeCost ? ` di bawah modal HPP (${S().rp(estHppCart)})` : ' di bawah batas modal minimum'}. Checkout mewajibkan PIN APJ!
          </div>` : ''}

          <!-- Tabel Item Keranjang -->
          <div class="ons-card p-3 space-y-2">
            <div class="ons-table-wrap min-h-[210px]">
              <table class="ons-table">
                <thead>
                  <tr>
                    <th class="w-10">No.</th>
                    <th>Produk</th>
                    <th>Kuantitas</th>
                    <th>Satuan</th>
                    <th>Opsi Harga</th>
                    <th class="text-right">Harga Jual</th>
                    <th class="text-right">Sub Total</th>
                    <th class="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  ${cart.items.length ? cart.items.map((it, idx) => {
                    const ob = st.masterObat.find((o) => o.id_obat === it.id_obat);
                    const nearIt = S().getNearEdBatchInfo ? S().getNearEdBatchInfo(it.id_obat, 90) : { hasNearEd: false };
                    const grossLine = Number(it.harga_jual || 0) * Number(it.qty || 1);
                    const netLine = Math.max(0, grossLine - Number(it.diskon_item || 0));
                    const hppLine = Number((ob && ob.hpp_avg) || 0) * Number(it.qty || 1) * Math.max(1, Number(it.faktor_konversi || 1));
                    const itemBelowHpp = hppLine > 0 && netLine < hppLine;
                    const itemTier = String(it.tier_applied || cart.tier_harga || 'UMUM').replace('_AUTO', '');
                    return `<tr>
                      <td class="text-xs font-mono-num align-top">${idx + 1}</td>
                      <td class="text-xs align-top min-w-[180px]">
                        <div class="font-bold leading-snug">${S().esc(it.nama_dagang)} ${it.tier_applied === 'GROSIR_AUTO' ? '<span class="badge-bpom bpom-bebas text-[9px]">GROSIR AUTO</span>' : ''}</div>
                        <div class="flex flex-wrap items-center gap-1 mt-1">
                          <select aria-label="Aturan Pakai" onchange="window.posSetAturanPakai(${idx}, this.value);renderActiveView();" class="ons-select text-[10px] py-0.5 px-1.5 min-h-0 h-6 max-w-[175px]">
                            ${['', '3 x 1 Sesudah Makan', '3 x 1 Sebelum Makan', '2 x 1 Sesudah Makan', '1 x 1 Malam Hari', '1 x 1 Pagi Hari', 'Oles Tipis 2x Sehari (Obat Luar)'].map((opt) => `<option value="${S().esc(opt)}" ${(it.aturan_pakai || '') === opt ? 'selected' : ''}>${opt || 'Signa / Etiket...'}</option>`).join('')}
                          </select>
                          <button type="button" onclick="window.openCartEtiketModal(${idx})" class="ons-pos-signa-chip">Etiket</button>
                          ${nearIt.hasNearEd ? `<button type="button" onclick="window.applyNearEdDiscountToItem(${idx})" class="ons-pos-signa-chip text-amber-700 border-amber-400">Promo ED -${nearIt.suggestedDiscPct}%</button>` : ''}
                          ${itemBelowHpp ? `<span class="text-[10px] text-red-600 font-bold">${seeCost ? '[&lt; HPP]' : '[PIN APJ]'}</span>` : ''}
                        </div>
                      </td>
                      <td class="align-top">
                        <div class="ons-pos-stepper">
                          <button type="button" onclick="window.posStepQty(${idx}, -1)" title="Kurangi qty">&minus;</button>
                          <input type="number" min="1" value="${it.qty}" onchange="window.posUpdateQty(${idx}, this.value)"/>
                          <button type="button" onclick="window.posStepQty(${idx}, 1)" title="Tambah qty">+</button>
                        </div>
                      </td>
                      <td class="align-top">
                        <select aria-label="Satuan Jual" onchange="window.posChangeUnit(${idx}, this.value)" class="ons-select text-[11px] font-bold py-1 px-1.5 min-h-0 h-8 min-w-[115px] max-w-[150px] bg-blue-50/70 dark:bg-slate-800 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-100 shadow-sm cursor-pointer" title="Klik untuk ubah satuan jual (Box/Strip/Tablet)">
                          ${(it.unitOptions || []).map((u) => `<option value="${S().esc(u.label)}" ${u.label === it.satuan ? 'selected' : ''}>${S().esc(u.displayText || u.label)}</option>`).join('')}
                        </select>
                        ${Number(it.faktor_konversi || 1) > 1 ? `<div class="text-[10px] text-blue-600 dark:text-blue-400 font-semibold mt-0.5 font-mono-num">(1 ${S().esc(it.satuan)} = ${it.faktor_konversi} ${ob ? S().esc(ob.satuan_dasar || 'unit') : 'unit'})</div>` : ''}
                      </td>
                      <td class="align-top">
                        <select aria-label="Opsi Harga" onchange="window.posChangeItemTier(${idx}, this.value)" class="ons-select text-[11px] py-1 px-1.5 min-h-0 h-8 w-28">
                          ${[
                            { id: 'UMUM', lbl: 'Reguler' },
                            { id: 'MEMBER', lbl: 'Member' },
                            { id: 'GROSIR', lbl: 'Grosir' },
                            { id: 'FASKES', lbl: 'Faskes' }
                          ].map((t) => `<option value="${t.id}" ${itemTier === t.id ? 'selected' : ''}>${t.lbl}</option>`).join('')}
                        </select>
                      </td>
                      <td class="text-right font-mono-num text-xs align-top">
                        <div>${S().rp(it.harga_jual)}</div>
                        ${Number(it.diskon_item || 0) > 0 ? `<div class="text-[10px] text-emerald-600 font-bold">-${S().rp(it.diskon_item)}</div>` : ''}
                      </td>
                      <td class="text-right font-mono-num font-extrabold text-xs text-blue-600 align-top">${S().rp(netLine)}</td>
                      <td class="align-top">
                        <button type="button" onclick="window.posRemoveItem(${idx})" class="ons-btn ons-btn-danger text-xs px-2 py-1 min-h-0 h-7" title="Hapus item">&times;</button>
                      </td>
                    </tr>`;
                  }).join('') : `<tr>
                    <td colspan="8" class="text-center py-10 text-sm" style="color:var(--ons-text-soft)">
                      <div class="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 mb-2.5">
                        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                      </div>
                      <div class="font-bold text-base mb-1" style="color:var(--ons-text-main)">Silahkan Pilih Produk</div>
                      <div class="text-xs max-w-md mx-auto mb-3">Ketik nama obat atau barcode di kolom pencarian (<span class="ons-shortcut-kbd">F2</span>), scan barcode kamera, atau klik produk pada katalog di bawah.</div>
                      <div class="flex flex-wrap items-center justify-center gap-2">
                        <button type="button" onclick="document.getElementById('posSearchInput')?.focus()" class="ons-btn ons-btn-primary text-xs py-1 px-3">Cari Produk (F2)</button>
                        <button type="button" onclick="window.startPosCameraScan()" class="ons-btn ons-btn-ghost text-xs py-1 px-3">Scan Barcode</button>
                      </div>
                    </td>
                  </tr>`}
                </tbody>
              </table>
            </div>

            ${crossSell ? `<div class="p-2.5 rounded-xl border text-[11px] flex items-center justify-between gap-2" style="border-color:var(--ons-border);background:rgba(16,185,129,0.06)">
              <div class="min-w-0">
                <span class="font-bold text-emerald-700 dark:text-emerald-300">Saran Pendamping Apoteker:</span>
                <b>${S().esc(crossSell.nama_dagang)}</b> &bull; <span class="font-mono-num">${S().rp(crossSell.harga_umum)}/${S().esc(crossSell.satuan_dasar)}</span>
              </div>
              <button type="button" onclick="window.posAddToCart('${S().esc(crossSell.id_obat)}')" class="ons-btn ons-btn-emerald text-[11px] py-1 px-2.5 min-h-0 h-7 shrink-0">+ Tambah</button>
            </div>` : ''}
          </div>

          <!-- Katalog Produk Cepat FEFO (Dapat Diciutkan) -->
          <div class="ons-card p-3 space-y-2.5">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex flex-wrap items-center gap-1.5">
                <button type="button" onclick="window.togglePosCatalogPanel()" class="font-extrabold text-xs flex items-center gap-1.5" style="color:var(--ons-primary)">
                  <span>${posCatalogExpanded ? '&#9660;' : '&#9654;'} Katalog Produk FEFO</span>
                </button>
                <span id="posCatalogMeta" class="text-[11px] font-mono-num" style="color:var(--ons-text-soft)">${catalog.length} dari ${st.masterObat.length} item</span>
              </div>
              <div class="flex flex-wrap items-center gap-1.5">
                <label class="text-[11px] font-semibold" style="color:var(--ons-text-soft)">Tier Harga:</label>
                <select aria-label="Tier Harga Global" onchange="window.setPosPriceTier(this.value)" class="ons-select text-[11px] py-0.5 px-2 min-h-0 h-7">
                  ${[
                    { id: 'UMUM', lbl: 'Opsi: Reguler' },
                    { id: 'MEMBER', lbl: 'Opsi: Member' },
                    { id: 'GROSIR', lbl: 'Opsi: Grosir' },
                    { id: 'FASKES', lbl: 'Opsi: Faskes' }
                  ].map((t) => `<option value="${t.id}" ${(cart.tier_harga || (cart.id_member !== 'UMUM' ? 'MEMBER' : 'UMUM')) === t.id ? 'selected' : ''}>${t.lbl}</option>`).join('')}
                </select>
                <button type="button" onclick="window.togglePosCatalogViewMode()" class="ons-btn ons-btn-ghost text-[11px] py-0.5 px-2.5 min-h-0 h-7">${posCatalogView === 'LIST' ? 'Tampilan Kartu' : 'Daftar Cepat'}</button>
              </div>
            </div>
            ${posCatalogExpanded ? `
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="flex gap-1.5 flex-wrap items-center">
                  ${['', 'BEBAS', 'TERBATAS', 'KERAS', 'PREKURSOR'].map((g) => `
                    <button type="button" onclick="ONSStore.AppState.posFilterGol='${g}';window.refreshPosCatalogView();" class="ons-pos-chip ${fGol === g ? 'is-active' : ''}">${g || 'Semua BPOM'}</button>
                  `).join('')}
                </div>
                <div class="flex gap-1.5 flex-wrap items-center">
                  ${[
                    { id: 'ALL', lbl: 'Semua Stok' },
                    { id: 'READY', lbl: 'Siap Jual' },
                    { id: 'LOW', lbl: 'Menipis' },
                    { id: 'NEAR_ED', lbl: 'Hampir ED' }
                  ].map((sf) => `<button type="button" onclick="window.setPosStockFilter('${sf.id}')" class="ons-pos-chip ${posStockFilter === sf.id ? 'is-active' : ''}">${sf.lbl}</button>`).join('')}
                </div>
              </div>
              <div id="posCatalogGrid" class="${posCatalogView === 'LIST' ? 'space-y-2' : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5'} max-h-[42vh] overflow-y-auto pr-1">
                ${renderPosCatalogCardsHtml(catalog, cart)}
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Kanan (4 Kolom): Panel Biaya, Bayar/Tunda, Pelanggan/Dokter, Kanal -->
        <div class="lg:col-span-4">
          ${renderPosCartPanelHtml(st, cart, member, totals, isBelowHppCart, estHppCart, seeCost)}
        </div>
      </div>

      <!-- Bottom Action & Status Strip (Apotek Digital Style) -->
      <div class="ons-pos-bottom-bar">
        <div class="flex flex-wrap items-center gap-1.5">
          <button type="button" onclick="window.openCartEtiketModal(0)" class="ons-pos-bar-tool font-bold" title="Cetak Etiket Obat Putih/Biru">&#127991; Cetak Etiket</button>
          <button type="button" onclick="window.openCopyResepFromPosModal()" class="ons-pos-bar-tool font-bold" title="Salinan Resep p.c.c">&#128221; Copy Resep</button>
          <button type="button" onclick="window.openKasMasukModal()" class="ons-pos-bar-tool font-extrabold text-emerald-300 hover:text-white" title="Catat Kas Masuk Laci (Modal Tambahan / Tukar Receh)">+ Kas Masuk</button>
          <button type="button" onclick="window.openKasKeluarModal()" class="ons-pos-bar-tool font-extrabold text-rose-300 hover:text-white" title="Catat Kas Keluar Laci (Petty Cash Operasional / Beli Plastik)">- Kas Keluar</button>
          <button type="button" onclick="window.setPosSubTab('riwayat')" class="ons-pos-bar-tool" title="Daftar Penjualan &amp; Draft">&#128203; Riwayat Penjualan</button>
          <button type="button" onclick="window.setPosSubTab('tertolak')" class="ons-pos-bar-tool text-amber-300" title="Catat Penjualan Tertolak / Lost Sales">&#9888; Obat Kosong</button>
          <span class="px-2.5 py-1 rounded-md font-extrabold text-[11px] bg-amber-400 text-slate-900">${S().esc(prof.status_pajak || 'Non-PKP')}</span>
        </div>
        <div class="flex flex-wrap items-center gap-2 ml-auto">
          <label class="flex items-center gap-1.5 text-[11px] font-semibold">
            <span>Tgl. Transaksi:</span>
            <input type="date" value="${S().esc(cart.tgl_transaksi || todayYmd)}" onchange="ONSStore.AppState.carts[ONSStore.AppState.activeCartIdx].tgl_transaksi=this.value" class="px-2 py-1 rounded text-xs font-mono-num bg-white text-slate-900 border-0"/>
          </label>
          <span class="px-2.5 py-1 rounded bg-white/15 font-bold text-xs">${S().esc(branchLabel)}</span>
        </div>
      </div>
    </div>`;
  }

  global.toggleDashAuditCheck = async (itemId, isChecked) => {
    const cur = S().getAuditSystem();
    const nextItems = (cur.items || []).map((it) => it.id === itemId ? Object.assign({}, it, { checked: !!isChecked }) : it);
    const nextSys = S().setAuditSystem(Object.assign({}, cur, { items: nextItems }));
    global.renderActiveView();
    try {
      const res = await API().callApi('audit.saveChecklist', Object.assign({}, nextSys, { sync_staff_accounts: false }), { isWrite: true });
      if (res && res.audit_system) S().setAuditSystem(res.audit_system);
      global.toast('Checklist audit CDOB diperbarui.', 'ok');
    } catch (e) {
      global.toast(e.message || 'Gagal menyimpan checklist audit.', 'err');
    }
  };

  global.setPosSubTab = (t) => {
    posSubTab = (t && t !== 'online') ? t : 'kasir';
    if (S().AppState.subTabs) S().AppState.subTabs.pos = posSubTab;
    global.renderActiveView();
    if (typeof global.syncNavHighlight === 'function') global.syncNavHighlight();
  };
  global.setPosHistQ = (v) => { posHistQ = v || ''; _syncPosHistoryDomOnly(); };
  global.setPosHistFilter = (v) => {
    const val = String(v || 'SEMUA').toUpperCase();
    if (['TUNAI', 'QRIS', 'TRANSFER', 'SPLIT', 'PIUTANG'].includes(val)) {
      posHistMethod = val;
    } else {
      posHistFilter = val;
    }
    global.renderActiveView();
  };
  global.setPosHistMethod = (m) => { posHistMethod = m || 'SEMUA'; global.renderActiveView(); };
  global.setPosHistPeriod = (p) => { posHistPeriod = p || 'ALL'; posHistStart = ''; posHistEnd = ''; global.renderActiveView(); };
  global.setPosHistDateRange = (s, e) => {
    posHistStart = s || '';
    posHistEnd = e || s || '';
    if (posHistStart && posHistEnd && posHistStart > posHistEnd) {
      const tmp = posHistStart;
      posHistStart = posHistEnd;
      posHistEnd = tmp;
    }
    global.renderActiveView();
  };
  global.resetPosHistFilters = () => {
    posHistQ = '';
    posHistFilter = 'SEMUA';
    posHistMethod = 'SEMUA';
    posHistPeriod = 'ALL';
    posHistStart = '';
    posHistEnd = '';
    global.renderActiveView();
  };
  global.togglePosRekapFoot = () => { posRekapExpanded = !posRekapExpanded; global.renderActiveView(); };
  global.togglePosCatalogPanel = () => { posCatalogExpanded = !posCatalogExpanded; global.renderActiveView(); };
  global.setPosReturQ = (v) => { posReturQ = v || ''; global.renderActiveView(); };
  global.setPosReturPeriod = (p) => { posReturPeriod = p || 'ALL'; posReturStart = ''; posReturEnd = ''; global.renderActiveView(); };
  global.setPosReturDateRange = (s, e) => {
    posReturStart = s || '';
    posReturEnd = e || s || '';
    if (posReturStart && posReturEnd && posReturStart > posReturEnd) {
      const tmp = posReturStart;
      posReturStart = posReturEnd;
      posReturEnd = tmp;
    }
    global.renderActiveView();
  };
  global.setPosTertolakQ = (v) => { posTertolakQ = v || ''; global.renderActiveView(); };

  global.submitPosLostSaleInline = () => {
    const nama = ((document.getElementById('posTertolakNama') || {}).value || '').trim();
    const qty = Math.max(1, Number((document.getElementById('posTertolakQty') || {}).value || 1));
    const estHarga = Math.max(0, Number((document.getElementById('posTertolakHarga') || {}).value || 0));
    const alasan = ((document.getElementById('posTertolakAlasan') || {}).value || 'Stok habis sementara').trim();
    if (!nama) return global.toast('Tulis nama produk yang ditanyakan pasien.', 'warn');
    const arr = _getDashLostSales();
    arr.push({ tanggal: toLocalYmd_(new Date()), nama_obat: nama, qty, est_harga: estHarga, alasan });
    try { localStorage.setItem(DASH_LOST_SALES_KEY, JSON.stringify(arr.slice(-100))); } catch (e) {}
    global.toast('Penjualan tertolak berhasil dicatat!', 'ok');
    global.renderActiveView();
  };

  global.deletePosLostSale = (idx) => {
    const arr = _getDashLostSales();
    if (idx < 0 || idx >= arr.length) return;
    arr.splice(idx, 1);
    try { localStorage.setItem(DASH_LOST_SALES_KEY, JSON.stringify(arr)); } catch (e) {}
    global.toast('Catatan penjualan tertolak dihapus.', 'info');
    global.renderActiveView();
  };

  global.quickRecordLostSale = (drugName) => {
    const clean = String(drugName || '').trim();
    if (!clean) return;
    const arr = _getDashLostSales();
    arr.push({
      tanggal: toLocalYmd_(new Date()),
      nama_obat: clean,
      qty: 1,
      est_harga: 0,
      alasan: 'Pasien menanyakan produk tapi stok apotek kosong'
    });
    try { localStorage.setItem(DASH_LOST_SALES_KEY, JSON.stringify(arr.slice(-100))); } catch (e) {}
    global.toast('Obat kosong "' + clean + '" dicatat ke Penjualan Tertolak & Defecta!', 'ok');
    global.renderActiveView();
  };

  const CASH_DRAWER_TX_KEY = 'ons_cash_drawer_tx_v1';
  function _getCashDrawerTx() {
    try {
      const raw = localStorage.getItem(CASH_DRAWER_TX_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }
  function _saveCashDrawerTx(list) {
    try {
      localStorage.setItem(CASH_DRAWER_TX_KEY, JSON.stringify((list || []).slice(-200)));
    } catch (e) {}
  }
  global._getCashDrawerTx = _getCashDrawerTx;

  global.openKasMasukModal = () => {
    S().openModal(`<div class="p-6 space-y-4 text-xs">
      <div class="flex items-center justify-between border-b pb-2.5" style="border-color:var(--ons-border)">
        <div class="flex items-center gap-2.5">
          <span class="text-emerald-500 font-extrabold text-xl">💰</span>
          <div>
            <h3 class="font-extrabold text-sm text-slate-900 dark:text-white">Catat Kas Masuk Laci (Cash In)</h3>
            <p class="text-[11px] text-slate-500">Uang tambahan ke laci kasir (tambah modal receh / tukar uang kembalian).</p>
          </div>
        </div>
        <button type="button" onclick="S().closeModal()" class="text-xl font-bold text-slate-400 hover:text-slate-600">&times;</button>
      </div>
      <div class="space-y-3">
        <div>
          <label class="font-bold block mb-1">Nominal Kas Masuk (Rp) *</label>
          <input id="kasMasukNominal" type="number" min="1000" step="1000" class="ons-input text-base font-bold font-mono-num text-emerald-600" placeholder="Cth: 100000" autofocus/>
          <div class="flex flex-wrap gap-1.5 mt-2">
            ${[20000, 50000, 100000, 200000, 500000].map(n => `<button type="button" onclick="document.getElementById('kasMasukNominal').value=${n}" class="ons-quick-denom text-[10px] py-1 px-2.5 font-mono-num font-bold">${S().rp(n)}</button>`).join('')}
          </div>
        </div>
        <div>
          <label class="font-bold block mb-1">Keterangan / Sumber Dana *</label>
          <input id="kasMasukKet" class="ons-input text-xs" placeholder="Cth: Tambah uang receh kembalian / Modal awal shift"/>
        </div>
      </div>
      <div class="flex justify-end gap-2 pt-2.5 border-t" style="border-color:var(--ons-border)">
        <button type="button" onclick="S().closeModal()" class="ons-btn ons-btn-ghost text-xs">Batal</button>
        <button type="button" onclick="window.submitKasDrawerTx('IN')" class="ons-btn ons-btn-emerald text-xs font-bold px-4">+ Simpan Kas Masuk</button>
      </div>
    </div>`, '460px');
  };

  global.openKasKeluarModal = () => {
    S().openModal(`<div class="p-6 space-y-4 text-xs">
      <div class="flex items-center justify-between border-b pb-2.5" style="border-color:var(--ons-border)">
        <div class="flex items-center gap-2.5">
          <span class="text-rose-500 font-extrabold text-xl">💸</span>
          <div>
            <h3 class="font-extrabold text-sm text-slate-900 dark:text-white">Catat Kas Keluar Laci (Petty Cash Out)</h3>
            <p class="text-[11px] text-slate-500">Pengeluaran kecil dari laci kasir (beli kantong plastik, galon air, operasional).</p>
          </div>
        </div>
        <button type="button" onclick="S().closeModal()" class="text-xl font-bold text-slate-400 hover:text-slate-600">&times;</button>
      </div>
      <div class="space-y-3">
        <div>
          <label class="font-bold block mb-1">Nominal Pengeluaran (Rp) *</label>
          <input id="kasKeluarNominal" type="number" min="500" step="500" class="ons-input text-base font-bold font-mono-num text-rose-600" placeholder="Cth: 15000" autofocus/>
          <div class="flex flex-wrap gap-1.5 mt-2">
            ${[5000, 10000, 15000, 20000, 50000].map(n => `<button type="button" onclick="document.getElementById('kasKeluarNominal').value=${n}" class="ons-quick-denom text-[10px] py-1 px-2.5 font-mono-num font-bold">${S().rp(n)}</button>`).join('')}
          </div>
        </div>
        <div>
          <label class="font-bold block mb-1">Keperluan / Keterangan Pengeluaran *</label>
          <input id="kasKeluarKet" class="ons-input text-xs" placeholder="Cth: Beli kantong kresek / Beli air galon / Uang sampah"/>
        </div>
      </div>
      <div class="flex justify-end gap-2 pt-2.5 border-t" style="border-color:var(--ons-border)">
        <button type="button" onclick="S().closeModal()" class="ons-btn ons-btn-ghost text-xs">Batal</button>
        <button type="button" onclick="window.submitKasDrawerTx('OUT')" class="ons-btn ons-btn-danger text-xs font-bold px-4">- Simpan Kas Keluar</button>
      </div>
    </div>`, '460px');
  };

  global.submitKasDrawerTx = (tipe) => {
    const isOut = tipe === 'OUT';
    const nomEl = document.getElementById(isOut ? 'kasKeluarNominal' : 'kasMasukNominal');
    const ketEl = document.getElementById(isOut ? 'kasKeluarKet' : 'kasMasukKet');
    const nominal = Math.max(0, Number((nomEl && nomEl.value) || 0));
    const ket = String((ketEl && ketEl.value) || '').trim();
    if (nominal <= 0) return global.toast('Nominal harus lebih dari Rp 0', 'warn');
    if (!ket) return global.toast('Keterangan kas wajib diisi', 'warn');

    const st = S().AppState;
    const txList = _getCashDrawerTx();
    const newTx = {
      id: 'CDT-' + Date.now().toString(36),
      tgl: new Date().toISOString(),
      tipe: isOut ? 'OUT' : 'IN',
      nominal: nominal,
      keterangan: ket,
      kasir: (st.user && st.user.nama_lengkap) || 'Kasir',
      shift_id: (st.activeShift && st.activeShift.id_shift) || 'SHF-AKTIF'
    };
    txList.push(newTx);
    _saveCashDrawerTx(txList);
    S().closeModal();
    global.toast((isOut ? 'Kas keluar Rp ' : 'Kas masuk Rp ') + nominal.toLocaleString('id-ID') + ' tersimpan di laci kasir.', 'ok');
    global.renderActiveView();
  };

  global.openPosDraftModal = () => {
    const st = S().AppState;
    const drafts = (st.carts || []).map((c, idx) => ({ c, idx })).filter((x) => (x.c.items && x.c.items.length > 0) || x.c.held_at);
    S().openModal(`<div class="p-6 space-y-3 text-xs">
      <div class="flex justify-between items-center">
        <h3 class="font-bold text-base">Daftar Draft / Antrean Tertunda (${drafts.length})</h3>
        <button onclick="ONSStore.closeModal()" class="text-xl">&times;</button>
      </div>
      <p style="color:var(--ons-text-soft)">Pilih draft keranjang yang ditunda untuk melanjutkan transaksi di Kasir.</p>
      <div class="space-y-2 max-h-72 overflow-y-auto">
        ${drafts.length ? drafts.map(({ c, idx }) => {
          const tots = computePosCartTotals(c);
          return `<div class="p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2" style="border-color:var(--ons-border);background:var(--ons-bg-subtle)">
            <div>
              <div class="font-bold text-sm">${S().esc(c.label || ('Antrean #' + (idx + 1)))} ${c.held_at ? `<span class="text-[10px] font-mono-num text-amber-600">[${S().esc(c.held_at)}]</span>` : ''}</div>
              <div class="text-[11px]" style="color:var(--ons-text-soft)">${c.items.length} item &bull; Total: <b class="font-mono-num text-blue-600">${S().rp(tots.grandTotal)}</b>${c.held_note ? ` &bull; ${S().esc(c.held_note)}` : ''}</div>
            </div>
            <div class="flex gap-1.5">
              <button type="button" onclick="window.switchPosCart(${idx});window.setPosSubTab('kasir');ONSStore.closeModal();" class="ons-btn ons-btn-primary text-[11px] py-1 px-3">Lanjutkan di Kasir</button>
              ${st.carts.length > 1 ? `<button type="button" onclick="window.closePosCartTab(${idx});window.openPosDraftModal();" class="ons-btn ons-btn-danger text-[11px] py-1 px-2">Hapus</button>` : ''}
            </div>
          </div>`;
        }).join('') : '<div class="text-center py-6" style="color:var(--ons-text-soft)">Belum ada draft antrean yang ditunda.</div>'}
      </div>
    </div>`, '520px');
  };

  global.openPosPickInvoiceForReturnModal = () => {
    const st = S().AppState;
    const candidates = (st.penjualan || []).filter((p) => String(p.status_trx || '').toUpperCase() !== 'RETUR').slice(0, 25);
    S().openModal(`<div class="p-6 space-y-3 text-xs">
      <div class="flex justify-between items-center">
        <h3 class="font-bold text-base">Pilih Nota Penjualan untuk Diretur</h3>
        <button onclick="ONSStore.closeModal()" class="text-xl">&times;</button>
      </div>
      <div class="space-y-2 max-h-72 overflow-y-auto">
        ${candidates.length ? candidates.map((p) => {
          const mem = (st.members || []).find((m) => m.id_member === p.id_member);
          return `<div class="p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2" style="border-color:var(--ons-border);background:var(--ons-bg-subtle)">
            <div>
              <div class="font-mono-num font-bold text-blue-600">${S().esc(p.no_invoice)}</div>
              <div class="text-[11px]" style="color:var(--ons-text-soft)">${S().formatTgl(p.tanggal, true)} &bull; ${S().esc(mem ? mem.nama_pasien : (p.pelanggan_nama || 'Pasien Umum'))} &bull; <b class="font-mono-num">${S().rp(p.grand_total)}</b></div>
            </div>
            <button type="button" onclick="window.openPosVoidReturnModal('${S().esc(p.no_invoice)}', ${Number(p.grand_total || 0)})" class="ons-btn ons-btn-danger text-[11px] py-1 px-3">Proses Retur &rarr;</button>
          </div>`;
        }).join('') : '<div class="text-center py-6" style="color:var(--ons-text-soft)">Tidak ada nota aktif yang tersedia untuk diretur.</div>'}
      </div>
    </div>`, '540px');
  };

  global.setCartDiscMode = (mode) => {
    const cart = getPosActiveCart();
    if (!cart) return;
    cart.diskon_mode = mode === 'PCT' ? 'PCT' : 'RP';
    cart.diskon_input = 0;
    cart.diskon_global = 0;
    global.renderActiveView();
  };

  global.onPosFeeChange = (field, rawVal) => {
    const cart = getPosActiveCart();
    if (!cart) return;
    cart[field] = Math.max(0, Number(rawVal || 0));
    const tots = computePosCartTotals(cart);
    const hero = document.getElementById('posHeroTotalDisplay');
    if (hero) hero.textContent = S().rp(tots.grandTotal);
    const subInp = document.getElementById('posRightSubTotalInp');
    if (subInp) subInp.value = tots.subtotal;
    const labaEl = document.getElementById('posRightLabaSpan');
    if (labaEl) {
      const estHppCart = (cart.items || []).reduce((s, it) => {
        const ob = (S().AppState.masterObat || []).find((o) => o.id_obat === it.id_obat);
        const nb = S().getNearestSellableBatch(it.id_obat);
        const hppBase = Number((nb && nb.hpp_beli) || (ob && ob.hpp_avg) || 0);
        return s + (hppBase * Number(it.qty || 1) * Math.max(1, Number(it.faktor_konversi || 1)));
      }, 0);
      labaEl.textContent = S().rp(tots.grandTotal - estHppCart);
      labaEl.className = (tots.grandTotal - estHppCart) >= 0 ? 'text-emerald-600 font-bold' : 'text-red-600 font-bold';
    }
  };

  global.posChangeItemTier = (idx, tierMode) => {
    const cart = getPosActiveCart();
    const it = cart && cart.items[idx];
    if (!it) return;
    const ob = (S().AppState.masterObat || []).find((o) => o.id_obat === it.id_obat);
    _repriceCartItem(ob, it, String(tierMode || 'UMUM').toUpperCase());
    global.renderActiveView();
  };

  global.onPosDoctorChange = (nama) => {
    const cart = getPosActiveCart();
    if (!cart) return;
    cart.dokter_nama = String(nama || '').trim();
  };

  global.openPosQuickAddCustomerModal = () => {
    S().openModal(`<div class="p-6 space-y-3 text-xs">
      <div class="flex justify-between items-center">
        <h3 class="font-bold text-base">Tambah Pelanggan Cepat (POS)</h3>
        <button onclick="ONSStore.closeModal()" class="text-xl">&times;</button>
      </div>
      <div><label class="font-semibold block mb-1">Nama Pasien / Pelanggan *</label><input id="posQuickCustNama" class="ons-input" placeholder="Cth: Ibu Siti Aminah"/></div>
      <div><label class="font-semibold block mb-1">No. HP / WhatsApp</label><input id="posQuickCustWa" type="tel" class="ons-input font-mono-num" placeholder="0812xxxx"/></div>
      <div><label class="font-semibold block mb-1">Riwayat Alergi Obat</label><input id="posQuickCustAlergi" class="ons-input" placeholder="Opsional: Amoksisilin / Tidak Ada"/></div>
      <button type="button" onclick="window.submitPosQuickAddCustomer()" class="ons-btn ons-btn-primary w-full py-2.5 text-xs font-bold">Simpan &amp; Pilih Pelanggan Ini</button>
    </div>`, '440px');
  };

  global.submitPosQuickAddCustomer = async () => {
    const nama = ((document.getElementById('posQuickCustNama') || {}).value || '').trim();
    const wa = ((document.getElementById('posQuickCustWa') || {}).value || '').trim();
    const alergi = ((document.getElementById('posQuickCustAlergi') || {}).value || 'Tidak Ada').trim();
    if (!nama) return global.toast('Nama pelanggan wajib diisi.', 'warn');
    try {
      const res = await API().callApi('member.save', {
        nama_pasien: nama,
        no_hp: wa,
        alergi_list: alergi,
        program_prb: 'Reguler'
      }, { isWrite: true });
      const newId = (res && res.member && res.member.id_member) || (res && res.id_member) || '';
      S().closeModal();
      await global.bootLoadState(true);
      const cart = getPosActiveCart();
      if (cart) {
        if (newId) cart.id_member = newId;
        cart.pelanggan_nama = nama;
        cart.no_wa = wa;
      }
      global.toast('Pelanggan baru ditambahkan & aktif di kasir!', 'ok');
      global.renderActiveView();
    } catch (e) {
      global.toast(e.message || 'Gagal menyimpan pelanggan.', 'err');
    }
  };

  global.openPosQuickAddDoctorModal = () => {
    S().openModal(`<div class="p-6 space-y-3 text-xs">
      <div class="flex justify-between items-center">
        <h3 class="font-bold text-base">Tambah / Pilih Dokter Penulis Resep</h3>
        <button onclick="ONSStore.closeModal()" class="text-xl">&times;</button>
      </div>
      <div><label class="font-semibold block mb-1">Nama Dokter *</label><input id="posQuickDokNama" class="ons-input" placeholder="dr. Budi Santoso, Sp.PD"/></div>
      <div><label class="font-semibold block mb-1">SIP / Faskes / Spesialisasi</label><input id="posQuickDokSpec" class="ons-input" placeholder="Penyakit Dalam / Klinik Pratama"/></div>
      <button type="button" onclick="window.submitPosQuickAddDoctor()" class="ons-btn ons-btn-primary w-full py-2.5 text-xs font-bold">Simpan &amp; Terapkan ke Kasir</button>
    </div>`, '440px');
  };

  global.submitPosQuickAddDoctor = async () => {
    const nama = ((document.getElementById('posQuickDokNama') || {}).value || '').trim();
    const spec = ((document.getElementById('posQuickDokSpec') || {}).value || '').trim();
    if (!nama) return global.toast('Nama dokter wajib diisi.', 'warn');
    try {
      await API().callApi('dokter.save', { nama_dokter: nama, spesialisasi: spec }, { isWrite: true });
    } catch (e) {}
    const st = S().AppState;
    if (Array.isArray(st.masterDokter) && !st.masterDokter.some((d) => (d.nama_dokter || d.nama) === nama)) {
      st.masterDokter.push({ id_dokter: 'DR-' + Date.now().toString().slice(-4), nama_dokter: nama, spesialisasi: spec });
    }
    const cart = getPosActiveCart();
    if (cart) cart.dokter_nama = nama;
    S().closeModal();
    global.toast('Dokter diterapkan pada transaksi kasir.', 'ok');
    global.renderActiveView();
  };

  global.exportPosHistoryExcel = (fmt) => {
    const st = S().AppState;
    const rawList = (typeof _getFilteredPosHistoryRows === 'function' ? _getFilteredPosHistoryRows(st).filtered : (st.penjualan || [])).slice();
    const rows = rawList.map((p, idx) => {
      const mem = (st.members || []).find((m) => m.id_member === p.id_member);
      const ret = _extractPosReturInfo(p, st.mutasiStok);
      const returKet = ret.isRetur
        ? `RETUR (${ret.authorizer || 'APJ'}${ret.restoredQty > 0 ? ', +' + ret.restoredQty + ' stok pulih' : ''}): ${ret.alasan || '-'}`
        : '-';
      return {
        no: idx + 1,
        no_invoice: p.no_invoice || '-',
        tanggal: S().formatTgl(p.tanggal, true),
        kasir: p.kasir_id || '-',
        pasien: mem ? mem.nama_pasien : (p.id_member || 'UMUM'),
        channel: p.channel || 'Toko Fisik',
        metode_bayar: p.metode_bayar || 'TUNAI',
        subtotal: Number(p.subtotal || 0),
        diskon_total: Number(p.diskon_total || 0),
        grand_total: Number(p.grand_total || 0),
        status_trx: ret.isRetur ? 'RETUR / VOID' : (p.status_trx || 'LUNAS'),
        retur_ket: returKet
      };
    });
    const prof = typeof S().getStoreProfile === 'function' ? S().getStoreProfile() : {};
    const apotekName = prof.nama_usaha || 'Apotek ONS Farma';
    const dStamp = new Date().toISOString().slice(0, 10);
    const mode = (!fmt || fmt === 'excel') ? 'xlsx' : fmt;
    const returCnt = rawList.filter((p) => _extractPosReturInfo(p, st.mutasiStok).isRetur).length;
    if (S().exportDataset) {
      S().exportDataset(mode, `Riwayat Transaksi POS - ${apotekName}`, `riwayat-transaksi-${dStamp}`, [
        { key: 'no', label: 'No', type: 'int', width: 6 },
        { key: 'no_invoice', label: 'No Invoice', type: 'text', width: 22 },
        { key: 'tanggal', label: 'Tanggal & Waktu', type: 'text', width: 19 },
        { key: 'kasir', label: 'Kasir', type: 'text', width: 14 },
        { key: 'pasien', label: 'Pasien / Member', type: 'wrap', width: 22 },
        { key: 'channel', label: 'Channel', type: 'text', width: 14 },
        { key: 'metode_bayar', label: 'Metode', type: 'text', width: 13 },
        { key: 'subtotal', label: 'Subtotal (Rp)', type: 'currency', sum: true, width: 16 },
        { key: 'diskon_total', label: 'Diskon (Rp)', type: 'currency', sum: true, width: 15 },
        { key: 'grand_total', label: 'Grand Total (Rp)', type: 'currency', sum: true, width: 17 },
        { key: 'status_trx', label: 'Status', type: 'status', width: 14 },
        { key: 'retur_ket', label: 'Keterangan Retur / Void', type: 'wrap', width: 32 }
      ], rows, {
        sheetName: 'Riwayat_Transaksi',
        subtitle: `Dicetak ${S().formatTgl(new Date().toISOString(), true)} | ${rows.length} transaksi (${returCnt} retur/void)`,
        emptyMessage: 'Belum ada transaksi penjualan POS yang tercatat.'
      });
    }
  };

  global.togglePosBeepSetting = () => {
    posBeepEnabled = !posBeepEnabled;
    try { localStorage.setItem('ons_pos_beep', posBeepEnabled ? '1' : '0'); } catch (e) {}
    if (posBeepEnabled) playPosBeep('ok');
    global.toast('Suara bip POS ' + (posBeepEnabled ? 'diaktifkan' : 'dimatikan') + '.', 'info');
    global.renderActiveView();
  };

  global.togglePosCatalogViewMode = () => {
    posCatalogView = posCatalogView === 'LIST' ? 'GRID' : 'LIST';
    try { localStorage.setItem('ons_pos_view', posCatalogView); } catch (e) {}
    syncPosCatalogDomOnly();
    global.renderActiveView();
  };

  global.setPosStockFilter = (f) => {
    posStockFilter = f || 'ALL';
    global.renderActiveView();
  };

  global.refreshPosCatalogView = () => {
    global.renderActiveView();
  };

  global.resetPosCatalogFilters = () => {
    S().AppState.posSearchQ = '';
    S().AppState.posFilterGol = '';
    posStockFilter = 'ALL';
    global.renderActiveView();
    const inp = document.getElementById('posSearchInput');
    if (inp) inp.focus();
  };

  global.toggleCartDiscMode = () => {
    const cart = S().AppState.carts[S().AppState.activeCartIdx];
    if (!cart) return;
    cart.diskon_mode = cart.diskon_mode === 'PCT' ? 'RP' : 'PCT';
    cart.diskon_input = 0;
    cart.diskon_global = 0;
    global.renderActiveView();
  };

  global.applyCartDiscInput = (v) => {
    const cart = S().AppState.carts[S().AppState.activeCartIdx];
    if (!cart) return;
    cart.diskon_input = Math.max(0, Number(v || 0));
    global.renderActiveView();
  };

  global.applyPosDiscPreset = (mode, val) => {
    const cart = S().AppState.carts[S().AppState.activeCartIdx];
    if (!cart) return;
    cart.diskon_mode = mode === 'PCT' ? 'PCT' : 'RP';
    cart.diskon_input = Math.max(0, Number(val || 0));
    global.renderActiveView();
  };

  global.openPosDetailItemsModal = async (noInvoice) => {
    try {
      const st = S().AppState;
      const trx = (st.penjualan || []).find((p) => p.no_invoice === noInvoice) || {};
      const mem = (st.members || []).find((m) => m.id_member === trx.id_member);
      const ret = _extractPosReturInfo(trx, st.mutasiStok);
      let items = _getPosItemsForTrx(st, trx);
      if (!items.length) {
        try {
          const res = await API().callApi('pos.details', { no_invoice: noInvoice });
          items = res.items || [];
        } catch (err) {}
      }
      const statusUp = String(trx.status_trx || 'LUNAS').toUpperCase();
      const statusBadge = ret.isFullRetur
        ? '<span class="ons-retur-stamp">&#8617; TRANSAKSI DIRETUR / VOID</span>'
        : (ret.isPartialRetur
          ? '<span class="badge-bpom bpom-prekursor">&#8617; RETUR SEBAGIAN</span>'
          : `<span class="badge-bpom ${statusUp === 'BELUM_LUNAS' ? 'bpom-prekursor' : 'bpom-bebas'}">${S().esc(statusUp)}</span>`);

      S().openModal(`<div class="p-6 space-y-4 text-xs">
        <div class="flex justify-between items-start gap-2">
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <h3 class="font-bold text-base">Rincian Transaksi ${S().esc(noInvoice)}</h3>
              ${statusBadge}
            </div>
            <div class="mt-0.5" style="color:var(--ons-text-soft)">${S().formatTgl(trx.tanggal, true)} &bull; Pasien: <b>${S().esc(mem ? mem.nama_pasien : 'Pasien Umum')}</b> &bull; Kasir: ${S().esc(trx.kasir_id || '-')} &bull; ${S().esc(trx.metode_bayar || '-')}</div>
          </div>
          <button onclick="ONSStore.closeModal()" class="text-xl px-1">&times;</button>
        </div>
        ${ret.hasReturHistory ? `<div class="p-3.5 rounded-xl border ${ret.isFullRetur ? 'border-red-500/40 bg-red-500/10' : 'border-amber-500/40 bg-amber-500/10'} border-l-4 space-y-1" style="border-left-color:${ret.isFullRetur ? '#DC2626' : '#D97706'}">
          <div class="font-extrabold ${ret.isFullRetur ? 'text-red-700 dark:text-red-300' : 'text-amber-700 dark:text-amber-300'}">&#8617; PENANDA KHUSUS: ${ret.isFullRetur ? 'TRANSAKSI INI TELAH DIRETUR / VOID PENUH' : 'TRANSAKSI INI MEMILIKI RIWAYAT RETUR SEBAGIAN'}</div>
          <div><b>Diotorisasi Oleh (PIN APJ/Pemilik):</b> ${S().esc(ret.authorizer)}${ret.tglRetur ? ` &bull; <span class="font-mono-num">${S().formatTgl(ret.tglRetur, true)}</span>` : ''}</div>
          <div><b>Alasan Retur:</b> ${S().esc(ret.alasan)}</div>
          <div><b>Status Pemulihan Stok:</b> <span class="font-semibold text-emerald-700 dark:text-emerald-300">${ret.restoredQty > 0 ? `+${ret.restoredQty} qty dari ${ret.restoredItemsCount} baris batch dikembalikan ke stok FEFO` : 'Batch stok dikembalikan & jurnal pembalik tercatat'}</span></div>
        </div>` : ''}
        <div class="ons-table-wrap">
          <table class="ons-table">
            <thead><tr><th>Nama Obat</th><th>Batch &amp; ED</th><th>Qty Aktif</th><th>Harga</th><th>Subtotal</th></tr></thead>
            <tbody>
              ${items.length ? items.map((it) => {
                const qtyOrig = Number(it.qty || 0);
                const qtyRet = Number(it.qty_retur || 0);
                const qtySisa = Math.max(0, qtyOrig - qtyRet);
                const subAktif = qtyOrig > 0 ? Math.round((qtySisa / qtyOrig) * Number(it.subtotal_item || (qtyOrig * Number(it.harga_jual || 0)))) : 0;
                return `<tr>
                  <td><div class="font-semibold">${S().esc(it.nama_dagang || it.id_obat)}</div>${it.aturan_pakai ? `<div class="text-[10px] text-emerald-600">${S().esc(it.aturan_pakai)}</div>` : ''}</td>
                  <td class="font-mono-num"><b>${S().esc(it.no_batch || it.id_batch || '-')}</b>${it.tgl_kadaluarsa ? `<div class="text-[10px]" style="color:var(--ons-text-soft)">ED ${S().esc(String(it.tgl_kadaluarsa).slice(0, 10))}</div>` : ''}</td>
                  <td class="font-mono-num">${qtyRet > 0 ? `<b>${qtySisa}</b> <span class="text-[10px] text-amber-600">(Awal ${qtyOrig}, Retur ${qtyRet})</span>` : `${qtyOrig}`} ${S().esc(it.satuan || '')}</td>
                  <td class="font-mono-num">${S().rp(it.harga_jual)}</td>
                  <td class="font-mono-num font-bold">${S().rp(subAktif)}</td>
                </tr>`;
              }).join('') : '<tr><td colspan="5" class="text-center py-4">Detail baris item belum tersedia pada log lokal.</td></tr>'}
            </tbody>
          </table>
        </div>
        <div class="flex flex-wrap justify-between items-center gap-2 pt-2 border-t font-bold" style="border-color:var(--ons-border)">
          <span>Total Nota (${S().esc(trx.status_trx || 'LUNAS')})</span>
          <span class="text-base font-mono-num ${ret.isFullRetur ? 'line-through text-red-600' : 'text-blue-600'}">${S().rp(trx.grand_total || 0)}</span>
        </div>
        <div class="flex flex-wrap gap-2 pt-1">
          <button type="button" onclick="window.openPosReprintModal('${S().esc(noInvoice)}')" class="ons-btn ons-btn-primary flex-1 text-xs">${ret.isFullRetur ? 'Cetak Nota Void (Thermal)' : 'Cetak Ulang Struk'}</button>
          ${!ret.isFullRetur ? `<button type="button" onclick="window.openPosVoidReturnModal('${S().esc(noInvoice)}', ${Number(trx.grand_total || 0)})" class="ons-btn ons-btn-danger flex-1 text-xs">Proses Retur / Void PIN</button>` : ''}
        </div>
      </div>`, '660px');
    } catch (e) { global.toast(e.message, 'err'); }
  };

  global.openCartEtiketModal = (itemIdx) => {
    const cart = S().AppState.carts[S().AppState.activeCartIdx];
    const items = (cart && cart.items) || [];
    if (!items.length) return global.toast('Keranjang masih kosong.', 'warn');
    const it = items[Number(itemIdx) || 0] || items[0];
    const member = S().AppState.members.find((m) => m.id_member === cart.id_member);
    const pasienName = (member && member.nama_pasien) || cart.pelanggan_nama || 'Pasien Umum';
    const defAturan = (it && it.aturan_pakai) || '3 x 1 Sehari (Sesudah Makan)';
    const defBiru = /luar|oles|tetes|salep|krim|injeksi/i.test(defAturan);

    const nowDt = new Date();
    const budDate = new Date(nowDt.getTime() + 30 * 86400000);
    const defBudYmd = budDate.toISOString().slice(0, 10);

    S().openModal(`<div class="p-6 space-y-4 text-xs">
      <div class="flex justify-between items-center border-b pb-2" style="border-color:var(--ons-border)">
        <div class="flex items-center gap-2">
          <span class="text-xl">🏷️</span>
          <div>
            <h3 class="font-extrabold text-base text-slate-900 dark:text-white">Cetak Etiket Aturan Pakai Obat</h3>
            <p class="text-[11px] text-slate-500">Standar BPOM: Etiket Putih (Oral/Dalam) &amp; Etiket Biru (Obat Luar) + BUD.</p>
          </div>
        </div>
        <button onclick="ONSStore.closeModal()" class="text-xl font-bold text-slate-400 hover:text-slate-600">&times;</button>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label class="font-semibold block mb-1">Pilih Item Keranjang</label>
          <select id="etItemSel" class="ons-select text-xs font-semibold" onchange="window.refreshCartEtiketBox()">
            ${items.map((x, idx) => `<option value="${S().esc(x.nama_dagang)} (${x.qty} ${S().esc(x.satuan)})" ${idx === Number(itemIdx || 0) ? 'selected' : ''}>${S().esc(x.nama_dagang)} (${x.qty} ${S().esc(x.satuan)})</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="font-semibold block mb-1">Kategori Etiket</label>
          <select id="etJenisSel" class="ons-select text-xs font-bold" onchange="window.refreshCartEtiketBox()">
            <option value="putih" ${!defBiru ? 'selected' : ''}>⚪ Etiket PUTIH — Obat Dalam / Diminum</option>
            <option value="biru" ${defBiru ? 'selected' : ''}>🔵 Etiket BIRU — Obat Luar / Topikal (Tidak Ditelan)</option>
          </select>
        </div>
        <div><label class="font-semibold block mb-1">Nama Pasien</label><input id="etPasienInp" class="ons-input text-xs font-bold" value="${S().esc(pasienName)}" oninput="window.refreshCartEtiketBox()"/></div>
        <div><label class="font-semibold block mb-1">Aturan Pakai (Signa)</label><input id="etAturanInp" class="ons-input text-xs font-bold" value="${S().esc(defAturan)}" oninput="window.refreshCartEtiketBox()"/></div>
        <div class="sm:col-span-2">
          <div class="flex flex-wrap items-center justify-between gap-1 mb-1">
            <label class="font-semibold block">Batas Kadaluarsa / Beyond Use Date (BUD) *</label>
            <div class="flex flex-wrap gap-1 text-[10px]">
              <button type="button" onclick="window.setEtiketBudPreset(7)" class="ons-quick-denom py-0.5 px-2">+7 Hari (Sirup Kering)</button>
              <button type="button" onclick="window.setEtiketBudPreset(14)" class="ons-quick-denom py-0.5 px-2">+14 Hari (Krim/Salep)</button>
              <button type="button" onclick="window.setEtiketBudPreset(30)" class="ons-quick-denom py-0.5 px-2 font-bold text-blue-600">+30 Hari (Puyer/Kapsul)</button>
            </div>
          </div>
          <input id="etBudInp" type="date" class="ons-input text-xs font-mono-num font-bold" value="${defBudYmd}" onchange="window.refreshCartEtiketBox()"/>
        </div>
      </div>
      <div id="etPreviewZone" class="ons-etiket-box ${defBiru ? 'biru' : 'putih'} space-y-1.5 text-center p-3 rounded-xl border">
        ${(() => {
          const prof = S().getStoreProfile ? S().getStoreProfile() : {};
          return `<div class="font-black text-sm tracking-wide uppercase">${S().esc(prof.nama_usaha || 'APOTEK ONS FARMA')}</div>
            <div class="text-[10px] text-slate-700 dark:text-slate-200">${S().esc(prof.nama_pemilik || 'apt. Anissa Faradifa R. Is Rumi')} &bull; SIPA: ${S().esc(prof.sipa_pemilik || '19920412/SIPA_35.78/2025/1042')}</div>`;
        })()}
        <div class="border-y border-slate-700/60 my-1 py-1 font-bold text-xs flex justify-between px-2" id="etPrevSub">
          <span>Pasien: <b>${S().esc(pasienName)}</b></span>
          <span class="font-mono-num">${new Date().toLocaleDateString('id-ID')}</span>
        </div>
        <div class="font-bold text-sm" id="etPrevObat">${S().esc(it.nama_dagang)} (${it.qty} ${S().esc(it.satuan)})</div>
        <div class="font-extrabold text-sm underline text-blue-900 dark:text-blue-100 py-0.5" id="etPrevAturan">${S().esc(defAturan)}</div>
        <div class="text-[10.5px] font-mono-num font-bold text-slate-800 dark:text-slate-100" id="etPrevBud">
          Batas Waktu Penggunaan (BUD): <span class="underline font-black text-rose-700 dark:text-rose-400">${budDate.toLocaleDateString('id-ID')}</span>
        </div>
        <div class="text-[10px] pt-1 font-extrabold tracking-wider" id="etPrevFooter">${defBiru ? '⚠️ OBAT LUAR • TIDAK UNTUK DITELAN' : 'OBAT DALAM • SEMOGA LEKAS SEMBUH'}</div>
      </div>
      <div class="flex gap-2">
        <button type="button" onclick="ONSStore.printHtmlZone('etPreviewZone', 'Etiket Obat ONS Farma')" class="ons-btn ons-btn-primary flex-1 text-xs font-bold py-2">🖨️ Cetak Etiket Ini</button>
      </div>
    </div>`, '560px');
  };

  global.setEtiketBudPreset = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + Number(days || 30));
    const ymd = d.toISOString().slice(0, 10);
    const inp = document.getElementById('etBudInp');
    if (inp) {
      inp.value = ymd;
      global.refreshCartEtiketBox();
    }
  };

  global.refreshCartEtiketBox = () => {
    const j = (document.getElementById('etJenisSel') || {}).value || 'putih';
    const box = document.getElementById('etPreviewZone');
    if (box) { box.className = 'ons-etiket-box ' + j + ' space-y-1.5 text-center p-3 rounded-xl border'; }
    const p = (document.getElementById('etPasienInp') || {}).value || 'Pasien Umum';
    const ob = (document.getElementById('etItemSel') || {}).value || '';
    const at = (document.getElementById('etAturanInp') || {}).value || '';
    const budVal = (document.getElementById('etBudInp') || {}).value || '';
    let budFmt = '-';
    if (budVal) {
      try {
        budFmt = new Date(budVal + 'T00:00:00').toLocaleDateString('id-ID');
      } catch (e) { budFmt = budVal; }
    }
    if (document.getElementById('etPrevSub')) document.getElementById('etPrevSub').innerHTML = `<span>Pasien: <b>${S().esc(p)}</b></span><span class="font-mono-num">${new Date().toLocaleDateString('id-ID')}</span>`;
    if (document.getElementById('etPrevObat')) document.getElementById('etPrevObat').textContent = ob;
    if (document.getElementById('etPrevAturan')) document.getElementById('etPrevAturan').textContent = at;
    if (document.getElementById('etPrevBud')) document.getElementById('etPrevBud').innerHTML = `Batas Waktu Penggunaan (BUD): <span class="underline font-black text-rose-700 dark:text-rose-400">${budFmt}</span>`;
    if (document.getElementById('etPrevFooter')) document.getElementById('etPrevFooter').textContent = j === 'biru' ? '⚠️ OBAT LUAR • TIDAK UNTUK DITELAN' : 'OBAT DALAM • SEMOGA LEKAS SEMBUH';
  };
  global.addPosItemById = (idObat) => {
    posSubTab = 'kasir';
    if (S().AppState.subTabs) S().AppState.subTabs.pos = 'kasir';
    global.posAddToCart(idObat);
    if (typeof global.syncNavHighlight === 'function') global.syncNavHighlight();
  };

  global.onPosSearch = (v) => {
    S().AppState.posSearchQ = v;
    syncPosCatalogDomOnly();
  };

  global.clearPosSearchInput = () => {
    S().AppState.posSearchQ = '';
    const inp = document.getElementById('posSearchInput');
    if (inp) { inp.value = ''; inp.focus(); }
    syncPosCatalogDomOnly();
  };

  global.posAddFirstMatch = () => {
    const rawQ = String(S().AppState.posSearchQ || '').trim();
    if (!rawQ) return;
    const q = rawQ.toLowerCase();
    let targetOb = null;
    if (global.ONSBarcode && typeof global.ONSBarcode.matchProductByBarcode === 'function') {
      const barHit = global.ONSBarcode.matchProductByBarcode(rawQ, S().AppState.masterObat, S().AppState.stokBatch);
      if (barHit && barHit.obat) targetOb = barHit.obat;
    }
    if (!targetOb) {
      targetOb = S().AppState.masterObat.find((o) =>
        String(o.kode_kfa || '').toLowerCase() === q ||
        String(o.id_obat || '').toLowerCase() === q ||
        String(o.nama_dagang || '').toLowerCase() === q
      );
    }
    if (!targetOb) {
      const list = getFilteredPosCatalog();
      targetOb = list.find((o) => S().getSellableStok(o.id_obat) > 0) || list[0];
    }
    if (targetOb) {
      global.posAddToCart(targetOb.id_obat);
      S().AppState.posSearchQ = '';
      global.renderActiveView();
      const inp = document.getElementById('posSearchInput');
      if (inp) inp.focus();
    } else {
      playPosBeep('err');
      global.toast('Obat/barcode "' + rawQ + '" tidak ditemukan.', 'warn');
    }
  };

  function _cartBaseQtyForObat(cart, idObat, skipIdx) {
    return (cart.items || []).reduce((sum, it, i) => {
      if (i === skipIdx || it.id_obat !== idObat) return sum;
      return sum + Number(it.qty || 0) * Math.max(1, Number(it.faktor_konversi || 1));
    }, 0);
  }

  function _repriceCartItem(obat, it, tierMode) {
    if (!obat || !it) return;
    const totalBaseQty = Number(it.qty || 1) * Math.max(1, Number(it.faktor_konversi || 1));
    const eff = S().getEffectiveObatPrice ? S().getEffectiveObatPrice(obat, totalBaseQty, tierMode) : { harga: Number(obat.harga_umum || 0), tierApplied: 'UMUM', isGrosirAuto: false };
    it.harga_jual = eff.harga * Math.max(1, Number(it.faktor_konversi || 1));
    it.tier_applied = eff.tierApplied;

    const baseSat = obat.satuan_dasar || 'Unit';
    const baseEff1 = S().getEffectiveObatPrice ? S().getEffectiveObatPrice(obat, 1, tierMode).harga : Number(obat.harga_umum || 0);
    const uOpts = [];
    uOpts.push({
      label: baseSat,
      faktor: 1,
      harga: baseEff1,
      displayText: `${baseSat} (${S().rp(baseEff1)})`
    });

    const rSed = Number(obat.rasio_sedang || 0);
    const satSed = String(obat.satuan_sedang || '').trim();
    if (satSed && satSed !== baseSat && rSed > 1) {
      const baseEffSed = S().getEffectiveObatPrice ? S().getEffectiveObatPrice(obat, rSed, tierMode).harga : baseEff1;
      const hrgSed = baseEffSed * rSed;
      uOpts.push({
        label: satSed,
        faktor: rSed,
        harga: hrgSed,
        displayText: `${satSed} (isi ${rSed} • ${S().rp(hrgSed)})`
      });
    }

    const rBes = Number(obat.rasio_besar || 0);
    const satBes = String(obat.satuan_besar || '').trim();
    if (satBes && satBes !== baseSat && satBes !== satSed && rBes > 1) {
      const baseEffBes = S().getEffectiveObatPrice ? S().getEffectiveObatPrice(obat, rBes, tierMode).harga : baseEff1;
      const hrgBes = baseEffBes * rBes;
      uOpts.push({
        label: satBes,
        faktor: rBes,
        harga: hrgBes,
        displayText: `${satBes} (isi ${rBes} • ${S().rp(hrgBes)})`
      });
    }

    it.unitOptions = uOpts;
    return eff;
  }

  global.onPosMemberChange = (memberId) => {
    const cart = S().AppState.carts[S().AppState.activeCartIdx];
    if (!cart) return;
    cart.id_member = memberId || 'UMUM';
    if (cart.tier_harga !== 'GROSIR' && cart.tier_harga !== 'FASKES') {
      cart.tier_harga = cart.id_member !== 'UMUM' ? 'MEMBER' : 'UMUM';
    }
    const mode = cart.tier_harga || 'UMUM';
    cart.items.forEach((it) => {
      const ob = S().AppState.masterObat.find((o) => o.id_obat === it.id_obat);
      _repriceCartItem(ob, it, mode);
    });
    global.renderActiveView();
  };

  global.setPosPriceTier = (tierMode) => {
    const cart = S().AppState.carts[S().AppState.activeCartIdx];
    if (!cart) return;
    cart.tier_harga = String(tierMode || 'UMUM').toUpperCase();
    cart.items.forEach((it) => {
      const ob = S().AppState.masterObat.find((o) => o.id_obat === it.id_obat);
      _repriceCartItem(ob, it, cart.tier_harga);
    });
    global.toast('Tier harga keranjang diubah ke: ' + cart.tier_harga, 'info');
    global.renderActiveView();
  };

  global.applyNearEdDiscountToItem = (idx) => {
    const cart = S().AppState.carts[S().AppState.activeCartIdx];
    const it = cart && cart.items[idx];
    if (!it) return;
    const info = S().getNearEdBatchInfo ? S().getNearEdBatchInfo(it.id_obat, 90) : { hasNearEd: false, suggestedDiscPct: 10 };
    const pct = info.suggestedDiscPct || 10;
    const gross = Number(it.harga_jual || 0) * Number(it.qty || 1);
    it.diskon_item = Math.round((gross * pct) / 100);
    global.toast('Promo Near-ED ' + pct + '% diterapkan untuk ' + it.nama_dagang + ' (-' + S().rp(it.diskon_item) + ')', 'ok');
    global.renderActiveView();
  };

  global.posQuickCheckoutShortcut = (metode) => {
    const cart = S().AppState.carts[S().AppState.activeCartIdx];
    if (!cart || !cart.items.length) {
      global.toast('Keranjang POS masih kosong.', 'warn');
      return;
    }
    const tots = computePosCartTotals(cart);
    global.openPosCheckoutModal(metode || 'TUNAI', tots.grandTotal);
  };

  global.openBranchCompareDrawer = (idObat) => {
    const st = S().AppState;
    const obat = st.masterObat.find((o) => o.id_obat === idObat);
    if (!obat) return;
    const multiOn = S().isMultiBranchEnabled ? S().isMultiBranchEnabled() : false;
    const cmp = (st.branchStockCompare && st.branchStockCompare.items) || [];
    const entry = cmp.find((x) => x.id_obat === idObat);
    const branches = (S().getActiveBranches && S().getActiveBranches()) || ['ONS-01'];
    const perCb = (entry && entry.stok_per_cabang) || {};
    if (!entry) perCb[st.cabangId || 'ONS-01'] = S().getSellableStok(idObat);
    S().openDrawer(`<div class="p-5 space-y-4 text-xs">
      <div class="flex items-start justify-between gap-2 border-b pb-3" style="border-color:var(--ons-border)">
        <div>
          <span class="badge-bpom bpom-terbatas">${multiOn ? 'MULTI-CABANG REAL-TIME' : 'STOK OUTLET AKTIF'}</span>
          <h3 class="font-extrabold text-base mt-1">${S().esc(obat.nama_dagang)}</h3>
          <div style="color:var(--ons-text-soft)">${S().esc(obat.zat_aktif)} &bull; Rak ${S().esc(obat.rak_lokasi || '-')}</div>
        </div>
        <button onclick="ONSStore.closeDrawer()" class="text-2xl px-1">&times;</button>
      </div>
      <div class="space-y-2">
        ${branches.map((br) => {
          const qty = br === (st.cabangId || 'ONS-01') ? S().getSellableStok(idObat) : Number(perCb[br] || 0);
          return `<div class="p-3 rounded-xl border flex items-center justify-between" style="border-color:var(--ons-border);background:var(--ons-bg-subtle)">
            <div>
              <div class="font-bold">${S().esc(S().getBranchLabel ? S().getBranchLabel(br) : br)} <span class="font-mono-num text-[10px]" style="color:var(--ons-text-soft)">(${S().esc(br)})</span> ${br === (st.cabangId || 'ONS-01') ? '<span class="badge-bpom bpom-bebas text-[9px] ml-1">AKTIF</span>' : ''}</div>
              <div class="text-[11px]" style="color:var(--ons-text-soft)">Stok siap jual (FEFO non-ED)</div>
            </div>
            <div class="text-base font-extrabold font-mono-num ${qty > 0 ? 'text-emerald-600' : 'text-red-500'}">${qty} ${S().esc(obat.satuan_dasar)}</div>
          </div>`;
        }).join('')}
      </div>
      <div class="flex gap-2 pt-2">
        ${multiOn
          ? `<button onclick="ONSStore.closeDrawer();navigateView('gudang','transfer');" class="ons-btn ons-btn-primary flex-1 text-xs">Buat Mutasi Antar-Cabang &rarr;</button>`
          : `<button onclick="ONSStore.closeDrawer();navigateView('gudang','batch');" class="ons-btn ons-btn-primary flex-1 text-xs">Cek Stok Batch &amp; Faktur PBF &rarr;</button>`}
        <button onclick="ONSStore.closeDrawer()" class="ons-btn ons-btn-ghost text-xs">Tutup</button>
      </div>
    </div>`, '460px');
  };

  global.posAddToCart = (idObat) => {
    const st = S().AppState;
    const obat = st.masterObat.find((o) => o.id_obat === idObat);
    if (!obat) return;
    const sellStok = S().getSellableStok(idObat);
    if (sellStok <= 0) {
      playPosBeep('err');
      global.toast('Stok layak jual ' + obat.nama_dagang + ' habis atau kadaluarsa (diblokir FEFO).', 'err');
      return;
    }
    const cart = st.carts[st.activeCartIdx];
    const usedBase = _cartBaseQtyForObat(cart, idObat, -1);
    if (usedBase + 1 > sellStok) {
      playPosBeep('err');
      global.toast('Qty keranjang melebihi stok layak jual (' + sellStok + ' ' + obat.satuan_dasar + ').', 'warn');
      return;
    }
    const tierMode = cart.tier_harga || (cart.id_member !== 'UMUM' ? 'MEMBER' : 'UMUM');
    const existing = cart.items.find((i) => i.id_obat === idObat && i.faktor_konversi === 1);
    if (existing) {
      existing.qty++;
      const effUp = _repriceCartItem(obat, existing, tierMode);
      if (effUp && effUp.isGrosirAuto) {
        global.toast('Harga Grosir Otomatis aktif (>= ' + (obat.min_qty_grosir || 10) + ' ' + obat.satuan_dasar + ')!', 'ok');
      }
    } else {
      const eff = S().getEffectiveObatPrice ? S().getEffectiveObatPrice(obat, 1, tierMode) : { harga: Number(obat.harga_umum || 0), tierApplied: tierMode };
      const itemObj = {
        id_obat: obat.id_obat,
        nama_dagang: obat.nama_dagang,
        satuan: obat.satuan_dasar,
        faktor_konversi: 1,
        harga_jual: eff.harga,
        tier_applied: eff.tierApplied,
        diskon_item: 0,
        qty: 1,
        aturan_pakai: '',
        unitOptions: []
      };
      _repriceCartItem(obat, itemObj, tierMode);
      cart.items.push(itemObj);
    }
    playPosBeep('ok');
    global.renderActiveView();
  };

  global.posStepQty = (idx, delta) => {
    const cart = getPosActiveCart();
    const it = cart && cart.items[idx];
    if (!it) return;
    const nextQ = Math.max(1, Number(it.qty || 1) + Number(delta || 0));
    global.posUpdateQty(idx, nextQ);
  };

  global.openClearPosCartModal = () => {
    const cart = getPosActiveCart();
    if (!cart || !cart.items.length) return;
    S().openModal(`<div class="p-6 space-y-3 text-xs">
      <div class="flex justify-between items-center">
        <h3 class="font-bold text-base text-red-600">Kosongkan Keranjang Antrean?</h3>
        <button onclick="ONSStore.closeModal()" class="text-xl">&times;</button>
      </div>
      <p style="color:var(--ons-text-soft)">Seluruh <b>${cart.items.length} item</b> pada antrean <b>${S().esc(cart.label)}</b> akan dihapus. Jika ingin melayani pasien lain sementara, gunakan fitur <b>Hold Antrean</b>.</p>
      <div class="flex gap-2 pt-1">
        <button type="button" onclick="ONSStore.closeModal()" class="ons-btn ons-btn-ghost flex-1">Batal</button>
        <button type="button" onclick="window.confirmClearPosCart()" class="ons-btn ons-btn-danger flex-1">Ya, Kosongkan</button>
      </div>
    </div>`, '420px');
  };

  global.confirmClearPosCart = () => {
    const cart = getPosActiveCart();
    if (cart) {
      cart._activeCheckoutId = null;
      cart.items = [];
      cart._activeCheckoutId = null;
      cart.diskon_global = 0;
      cart.diskon_input = 0;
      cart.biaya_servis = 0;
      cart.biaya_embalase = 0;
      cart.ongkos_kirim = 0;
      cart.biaya_lainnya = 0;
      cart.dokter_nama = '';
      cart.sales_nama = '';
      cart.kode_eksternal = '';
      cart.catatan = '';
    }
    S().closeModal();
    global.toast('Keranjang antrean dikosongkan.', 'info');
    global.renderActiveView();
  };

  global.posSetAturanPakai = (idx, val) => {
    const cart = S().AppState.carts[S().AppState.activeCartIdx];
    if (cart && cart.items[idx]) {
      cart.items[idx].aturan_pakai = String(val || '').trim();
    }
  };

  global.posChangeUnit = (idx, label) => {
    const cart = S().AppState.carts[S().AppState.activeCartIdx];
    const it = cart && cart.items && cart.items[idx];
    if (!it) return;
    const opt = (it.unitOptions || []).find((u) => u.label === label);
    if (opt) {
      const sellStok = S().getSellableStok(it.id_obat);
      const otherBase = _cartBaseQtyForObat(cart, it.id_obat, idx);
      const nextFaktor = Math.max(1, Number(opt.faktor || 1));
      if (otherBase + (Number(it.qty || 1) * nextFaktor) > sellStok) {
        global.toast('Satuan ' + opt.label + ' melebihi stok layak jual tersedia (' + sellStok + ' unit dasar).', 'warn');
        global.renderActiveView();
        return;
      }
      it.satuan = opt.label;
      it.faktor_konversi = nextFaktor;
      const ob = S().AppState.masterObat.find((o) => o.id_obat === it.id_obat);
      const tierMode = cart.tier_harga || (cart.id_member !== 'UMUM' ? 'MEMBER' : 'UMUM');
      const eff = _repriceCartItem(ob, it, tierMode);
      if (eff && eff.isGrosirAuto) {
        global.toast('Tier Grosir Otomatis aktif untuk ' + it.nama_dagang, 'ok');
      } else {
        global.toast('Satuan ' + it.nama_dagang + ' diubah: ' + opt.label + (nextFaktor > 1 ? ' (isi ' + nextFaktor + ')' : '') + ' • ' + S().rp(it.harga_jual), 'info');
      }
      global.renderActiveView();
    }
  };

  global.posUpdateQty = (idx, q) => {
    const cart = S().AppState.carts[S().AppState.activeCartIdx];
    const it = cart.items[idx];
    if (!it) return;
    const reqQty = Math.max(1, Number(q || 1));
    const sellStok = S().getSellableStok(it.id_obat);
    const otherBase = _cartBaseQtyForObat(cart, it.id_obat, idx);
    const faktor = Math.max(1, Number(it.faktor_konversi || 1));
    const maxItemQty = Math.max(1, Math.floor((sellStok - otherBase) / faktor));
    if ((otherBase + reqQty * faktor) > sellStok) {
      global.toast('Stok layak jual ' + it.nama_dagang + ' tidak mencukupi (maks ' + sellStok + ' satuan dasar).', 'warn');
      it.qty = maxItemQty;
    } else {
      it.qty = reqQty;
    }
    const ob = S().AppState.masterObat.find((o) => o.id_obat === it.id_obat);
    const tierMode = cart.tier_harga || (cart.id_member !== 'UMUM' ? 'MEMBER' : 'UMUM');
    const wasAuto = it.tier_applied === 'GROSIR_AUTO';
    const eff = _repriceCartItem(ob, it, tierMode);
    if (eff && eff.isGrosirAuto && !wasAuto) {
      global.toast('Harga Grosir Otomatis aktif (>= ' + ((ob && ob.min_qty_grosir) || 10) + ' ' + ((ob && ob.satuan_dasar) || 'unit') + ')!', 'ok');
    }
    global.renderActiveView();
  };

  global.posRemoveItem = (idx) => {
    S().AppState.carts[S().AppState.activeCartIdx].items.splice(idx, 1);
    global.renderActiveView();
  };

  global.switchPosCart = (idx) => {
    S().AppState.activeCartIdx = idx;
    global.renderActiveView();
  };

  global.addPosCartTab = (customLabel, heldNote) => {
    const st = S().AppState;
    const nowTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    st.carts.push({
      id: 'K' + Date.now().toString().slice(-4),
      label: customLabel || ('Pelanggan #' + (st.carts.length + 1)),
      channel: 'Offline',
      id_member: 'UMUM',
      tier_harga: 'UMUM',
      items: [],
      diskon_global: 0,
      diskon_input: 0,
      biaya_servis: 0,
      biaya_embalase: 0,
      ongkos_kirim: 0,
      biaya_lainnya: 0,
      dokter_nama: '',
      sales_nama: '',
      kode_eksternal: '',
      catatan: '',
      held_note: heldNote || '',
      held_at: customLabel ? nowTime : ''
    });
    st.activeCartIdx = st.carts.length - 1;
    global.renderActiveView();
  };

  global.openHoldCartModal = () => {
    const st = S().AppState;
    const cur = st.carts[st.activeCartIdx];
    const suggest = (cur && cur.pelanggan_nama) ? ('Parkir: ' + cur.pelanggan_nama) : ('Antrean #' + (st.carts.length + 1));
    S().openModal(`<div class="p-6 space-y-3 text-xs">
      <div class="flex justify-between items-center">
        <h3 class="font-bold text-base">Hold / Tahan Antrean Pelanggan</h3>
        <button onclick="ONSStore.closeModal()" class="text-xl">&times;</button>
      </div>
      <p style="color:var(--ons-text-soft)">Keranjang saat ini tetap tersimpan pada tab-nya. Buat tab antrean baru atau beri nama label pada antrean agar kasir mudah melayani pasien lain terlebih dahulu.</p>
      <div><label class="font-semibold block mb-1">Label Nama Antrean *</label><input id="holdCartLabelInp" class="ons-input" value="${S().esc(suggest)}" placeholder="Cth: Ibu Rina (Tunggu Racikan)"/></div>
      <div><label class="font-semibold block mb-1">Catatan Singkat</label><input id="holdCartNoteInp" class="ons-input" placeholder="Opsional: pasien cek tensi dulu / tunggu konfirmasi dokter"/></div>
      <div class="flex gap-2">
        <button onclick="window.submitHoldCurrentNameOnly()" class="ons-btn ons-btn-ghost flex-1">Tandai Antrean Aktif Ini</button>
        <button onclick="window.submitHoldNewTab()" class="ons-btn ons-btn-primary flex-1">+ Simpan &amp; Buka Antrean Baru</button>
      </div>
    </div>`, '460px');
  };

  global.submitHoldCurrentNameOnly = () => {
    const st = S().AppState;
    const cur = st.carts[st.activeCartIdx];
    const lbl = (document.getElementById('holdCartLabelInp') || {}).value || '';
    const note = (document.getElementById('holdCartNoteInp') || {}).value || '';
    if (cur && lbl.trim()) {
      cur.label = lbl.trim();
      cur.held_note = note.trim();
      cur.held_at = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    }
    S().closeModal();
    global.toast('Antrean aktif ditandai: ' + (lbl || 'Hold'), 'ok');
    global.renderActiveView();
  };

  global.submitHoldNewTab = () => {
    const lbl = (document.getElementById('holdCartLabelInp') || {}).value || '';
    const note = (document.getElementById('holdCartNoteInp') || {}).value || '';
    S().closeModal();
    global.addPosCartTab(lbl.trim(), note.trim());
    global.toast('Tab antrean baru dibuka! Antrean sebelumnya tetap aman tersimpan.', 'ok');
  };

  global.closePosCartTab = (idx) => {
    const st = S().AppState;
    if (st.carts.length <= 1) return;
    const c = st.carts[idx];
    if (c && c.items && c.items.length && !confirm('Hapus tab antrean "' + c.label + '" beserta ' + c.items.length + ' item di dalamnya?')) return;
    st.carts.splice(idx, 1);
    if (st.activeCartIdx >= st.carts.length) st.activeCartIdx = Math.max(0, st.carts.length - 1);
    global.renderActiveView();
  };

  global.openSubstitusiModal = (idObat) => {
    const o = S().AppState.masterObat.find((x) => x.id_obat === idObat);
    const subIds = String((o && o.substitusi_ids) || '').split(',').map((s) => s.trim()).filter(Boolean);
    const subs = S().AppState.masterObat.filter((x) => subIds.includes(x.id_obat));
    S().openModal(`<div class="p-6 space-y-4">
      <div class="flex justify-between items-center"><h3 class="font-bold text-base">Alternatif Substitusi Generik / Terapeutik</h3><button onclick="ONSStore.closeModal()" class="text-xl">&times;</button></div>
      <p class="text-xs" style="color:var(--ons-text-soft)">Rekomendasi pengganti aman untuk <b>${S().esc(o ? o.nama_dagang : idObat)}</b>:</p>
      <div class="space-y-2">
        ${subs.length ? subs.map((s) => `<div class="p-3 rounded-lg border flex justify-between items-center">
          <div><div class="font-bold text-sm">${S().esc(s.nama_dagang)}</div><div class="text-xs">Stok Jual: ${S().getSellableStok(s.id_obat)} | Harga: ${S().rp(s.harga_umum)}</div></div>
          <button onclick="posAddToCart('${s.id_obat}');ONSStore.closeModal();" class="ons-btn ons-btn-primary text-xs">Pilih Obat Ini</button>
        </div>`).join('') : '<div class="text-xs">Belum ada alternatif yang ditautkan pada produk ini.</div>'}
      </div>
    </div>`);
  };

  /**
   * Voice Cashier (Web Speech API Bahasa Indonesia) & Live Camera Scanner
   */
  global.startPosVoiceCashier = () => {
    const SR = global.SpeechRecognition || global.webkitSpeechRecognition;
    if (!SR) {
      global.toast('Browser ini belum mendukung Web Speech Recognition. Gunakan Chrome/Edge Android/Desktop.', 'warn');
      return;
    }
    const rec = new SR();
    rec.lang = 'id-ID';
    rec.interimResults = false;
    global.toast('Mendengarkan perintah suara kasir... Ucapkan nama obat (contoh: "Amoxicillin").', 'info');
    rec.onresult = (ev) => {
      const transcript = (ev.results[0] && ev.results[0][0].transcript) || '';
      global.toast('Suara terdeteksi: "' + transcript + '"', 'ok');
      const cleaned = transcript.toLowerCase().replace(/jual|tambah|beli|obat/g, '').trim();
      const match = S().AppState.masterObat.find((o) => o.nama_dagang.toLowerCase().includes(cleaned) || o.zat_aktif.toLowerCase().includes(cleaned));
      if (match) {
        global.posAddToCart(match.id_obat);
      } else {
        S().AppState.posSearchQ = cleaned;
        global.renderActiveView();
      }
    };
    rec.onerror = (e) => global.toast('Voice Kasir error: ' + e.error, 'err');
    rec.start();
  };

  global.startPosCameraScan = () => {
    if (global.ONSBarcode && typeof global.ONSBarcode.openScannerModal === 'function') {
      global.ONSBarcode.openScannerModal({
        title: 'Scan Barcode / QR Kemasan Obat (POS Kasir)',
        hint: 'Arahkan kamera ke barcode EAN-13 / QR NIE / label rak KFA untuk langsung masuk ke keranjang POS.',
        onDetect: (code) => {
          const hit = global.ONSBarcode.matchProductByBarcode(code, S().AppState.masterObat, S().AppState.stokBatch);
          const obHit = hit && hit.obat;
          if (obHit) {
            global.posAddToCart(obHit.id_obat);
            global.toast('Barcode terdeteksi: ' + obHit.nama_dagang + ' masuk keranjang!', 'ok');
          } else {
            S().AppState.posSearchQ = code;
            global.renderActiveView();
            global.toast('Kode "' + code + '" tidak cocok persis — ditampilkan di pencarian POS.', 'warn');
          }
        }
      });
      return;
    }
    global.toast('Modul scanner barcode belum termuat.', 'warn');
  };

  global.stopPosCameraScan = () => {
    S().closeModal();
  };

  function buildAndShowStrukModal(strukData, lebarMm, waTarget, itemsForEtiket) {
    const st = S().AppState;
    const tpls = st.strukTemplates || [];
    const targetMm = Number(lebarMm) === 80 ? 80 : 58;
    const activeTpl = tpls.find((t) => Number(t.lebar_mm || 58) === targetMm) || tpls[0];
    const tplText = (activeTpl && activeTpl.template_teks) || (targetMm === 80 && global.StrukEngine && global.StrukEngine.PRESET_TEMPLATE_80MM) || (global.StrukEngine && global.StrukEngine.DEFAULT_STRUK_TEMPLATE) || '';
    const normData = (global.StrukEngine && typeof global.StrukEngine.enrichStrukData === 'function')
      ? global.StrukEngine.enrichStrukData(strukData)
      : strukData;
    const htmlPaper = global.StrukEngine ? global.StrukEngine.renderHtml(tplText, normData, targetMm) : '<pre>Struk OK</pre>';
    const plainTxt = global.StrukEngine ? global.StrukEngine.formatPlainText(tplText, normData, targetMm) : '';
    const waText = S().formatStrukWaMessage ? S().formatStrukWaMessage(normData) : plainTxt;
    const cleanWa = String(waTarget || '').trim();
    const waHref = S().buildWaUrl ? S().buildWaUrl(cleanWa, waText) : ('https://wa.me/?text=' + encodeURIComponent(waText));
    const btConnected = !!(S().ThermalPrinter && S().ThermalPrinter.characteristic);
    const btLabel = btConnected ? ('Terhubung: ' + (S().ThermalPrinter.deviceName || 'Bluetooth')) : 'Bluetooth';
    global._lastStrukPayload = { tplText, strukData: normData, lebarMm: targetMm, plainTxt, waText, waTarget: cleanWa, itemsForEtiket: itemsForEtiket || [] };

    S().openModal(`<div class="p-5 space-y-3">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div class="text-emerald-600 font-bold text-base">&#9989; Nota ${S().esc(normData.NOTA)}</div>
          <div class="text-[11px]" style="color:var(--ons-text-soft)">Kertas Thermal ${targetMm} mm (${targetMm === 80 ? '46' : '32'} kolom) &bull; Siap cetak &amp; kirim WA</div>
        </div>
        <div class="flex items-center gap-1.5">
          <button onclick="window.switchStrukPreviewWidth(58)" class="ons-btn ${targetMm !== 80 ? 'ons-btn-primary' : 'ons-btn-ghost'} text-[11px] py-1 px-2.5">58mm</button>
          <button onclick="window.switchStrukPreviewWidth(80)" class="ons-btn ${targetMm === 80 ? 'ons-btn-primary' : 'ons-btn-ghost'} text-[11px] py-1 px-2.5">80mm</button>
          <button onclick="ONSStore.closeModal()" class="text-xl px-1.5">&times;</button>
        </div>
      </div>
      <div class="ons-struk-paper-tray max-h-[48vh] overflow-y-auto">${htmlPaper}</div>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
        <button onclick="window.printStrukWebBt()" class="ons-btn ons-btn-primary py-1.5" title="Cetak langsung via Web Bluetooth ESC/POS">${S().esc(btLabel)}</button>
        <button onclick="window.printStrukRawBt()" class="ons-btn ons-btn-ghost py-1.5">RawBT HP</button>
        <button onclick="window.printStrukBrowser()" class="ons-btn ons-btn-ghost py-1.5">Print / PDF</button>
        <button onclick="window.downloadStrukPngNow()" class="ons-btn ons-btn-ghost py-1.5">Unduh PNG</button>
      </div>
      <div class="p-3 rounded-xl border space-y-2 text-xs" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
        <div class="flex items-center justify-between gap-2">
          <span class="font-bold text-emerald-600">Kirim Struk ke WhatsApp (Manual Gratis)</span>
          <span class="text-[11px]" style="color:var(--ons-text-soft)">Buka WA tanpa token berbayar</span>
        </div>
        <div class="flex flex-wrap gap-1.5 items-center">
          <input id="strukWaTargetInput" type="tel" class="ons-input font-mono-num text-xs flex-1 min-w-[170px]" value="${S().esc(cleanWa)}" oninput="window.syncStrukWaHref(this.value)" placeholder="No. WA 08xx/628xx (kosong = pilih kontak di WA)"/>
          <button type="button" onclick="window.copyStrukWaText()" class="ons-btn ons-btn-ghost text-xs py-2 px-3">Salin Teks</button>
        </div>
        <div class="flex flex-wrap gap-1.5">
          <a id="strukWaManualBtn" target="_blank" rel="noopener" onclick="return window.launchStrukWaManual()" href="${S().esc(waHref)}" class="ons-btn ons-btn-emerald flex-1 text-xs py-2 font-bold">Kirim Struk ke WhatsApp (Gratis)</a>
          ${(itemsForEtiket && itemsForEtiket.length) ? `<button onclick="window.printAllEtiketObat()" class="ons-btn ons-btn-ghost text-xs">Cetak Etiket (${itemsForEtiket.length})</button>` : ''}
        </div>
        <details class="text-[11px]">
          <summary class="cursor-pointer font-semibold" style="color:var(--ons-text-soft)">Lihat Pratinjau Teks Pesan WA</summary>
          <pre class="mt-1.5 p-2 rounded border font-mono-num whitespace-pre-wrap text-[11px] max-h-36 overflow-auto" style="background:var(--ons-bg-card);border-color:var(--ons-border)">${S().esc(waText)}</pre>
        </details>
      </div>
      <button onclick="ONSStore.closeModal()" class="ons-btn ons-btn-ghost w-full text-xs">Tutup &amp; Siap Transaksi Berikutnya</button>
    </div>`, '560px');
  }

  global.syncStrukWaHref = (rawPhone) => {
    const p = global._lastStrukPayload;
    if (!p) return;
    p.waTarget = String(rawPhone || '').trim();
    const btn = document.getElementById('strukWaManualBtn');
    if (btn && S().buildWaUrl) {
      btn.href = S().buildWaUrl(p.waTarget, p.waText);
    }
  };
  global.launchStrukWaManual = () => {
    const inp = document.getElementById('strukWaTargetInput');
    if (inp) global.syncStrukWaHref(inp.value);
    return true;
  };
  global.copyStrukWaText = () => {
    const p = global._lastStrukPayload;
    const txt = (p && p.waText) || (p && p.plainTxt) || '';
    if (!txt) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).catch(() => {});
    }
    global.toast('Teks struk berhasil disalin! Tempel (Paste) langsung ke WhatsApp.', 'ok');
  };
  global.switchStrukPreviewWidth = (mm) => {
    const p = global._lastStrukPayload;
    if (p) buildAndShowStrukModal(p.strukData, mm, p.waTarget || '', p.itemsForEtiket);
  };
  global.printStrukWebBt = async () => {
    const p = global._lastStrukPayload;
    if (!p) return;
    if (global.StrukEngine && S().ThermalPrinter && typeof S().ThermalPrinter.printRawBytes === 'function') {
      const bytes = global.StrukEngine.buildEscPosBytes(p.tplText, p.strukData, p.lebarMm);
      await S().ThermalPrinter.printRawBytes(bytes);
    } else if (S().ThermalPrinter) {
      await S().ThermalPrinter.printReceiptText(p.plainTxt);
    }
  };
  global.printStrukRawBt = () => {
    const p = global._lastStrukPayload;
    if (p && global.StrukEngine) global.StrukEngine.openRawBtAndroid(p.tplText, p.strukData, p.lebarMm);
  };
  global.printStrukBrowser = () => {
    const p = global._lastStrukPayload;
    if (p && global.StrukEngine) {
      document.body.classList.add('printing-thermal');
      const cleanup = () => document.body.classList.remove('printing-thermal');
      if (typeof global.addEventListener === 'function') {
        global.addEventListener('afterprint', cleanup, { once: true });
      }
      S().printHtmlZone(global.StrukEngine.renderHtml(p.tplText, p.strukData, p.lebarMm), { widthMm: p.lebarMm });
      setTimeout(cleanup, 1200);
    }
  };
  global.downloadStrukPngNow = () => {
    const p = global._lastStrukPayload;
    if (p && global.StrukEngine) global.StrukEngine.downloadStrukPng(p.tplText, p.strukData, p.lebarMm);
  };
  global.printAllEtiketObat = () => {
    const p = global._lastStrukPayload;
    if (!p || !global.StrukEngine) return;
    const htmlList = p.itemsForEtiket.map((it) => `<div style="margin-bottom:14px;">${global.StrukEngine.buildEtiketHtml(it, p.strukData.PELANGGAN, it.ATURAN_PAKAI || it.aturan_pakai || 'Sesuai Anjuran Apoteker', p.strukData.APJ_SIPA)}</div>`).join('');
    S().printHtmlZone(htmlList);
  };

  global.openPosReprintModal = async (noInvoice) => {
    try {
      const res = await API().callApi('pos.details', { no_invoice: noInvoice });
      const trx = res.penjualan || {};
      const items = (res.items || []).map((it) => ({
        NAMA: it.nama_dagang || it.id_obat, QTY: it.qty, SATUAN: it.satuan || 'Tab',
        HARGA: Number(it.harga_jual || 0), SUBTOTAL: Number(it.subtotal_item || (it.qty * it.harga_jual) || 0),
        ATURAN_PAKAI: it.aturan_pakai || '',
        nama: it.nama_dagang || it.id_obat, qty: it.qty, satuan: it.satuan, aturan_pakai: it.aturan_pakai || ''
      }));
      const prof = S().getStoreProfile ? S().getStoreProfile() : {};
      const mem = (S().AppState.members || []).find((m) => m.id_member === trx.id_member);
      const strukData = {
        NAMA_TOKO: (prof.nama_usaha || 'APOTEK ONS FARMA').toUpperCase(),
        ALAMAT_TOKO: [prof.alamat_usaha, prof.kota].filter(Boolean).join(', ') || ('Outlet ' + (trx.cabang_id || S().AppState.cabangId)),
        SIA_TOKO: prof.no_sia || '',
        WA_TOKO: prof.wa_usaha || prof.telepon_usaha || '0811-0000-990',
        APJ_NAMA: prof.nama_pemilik || 'apt. Anissa Faradifa R. Is Rumi',
        APJ_SIPA: prof.sipa_pemilik || '19920412/SIPA_35.78/2025/1042',
        LOGO_URL: prof.logo_url || '',
        NOTA: trx.no_invoice,
        TANGGAL: S().formatTgl(trx.tanggal, true),
        KASIR: trx.kasir_id || 'Kasir',
        PELANGGAN: mem ? mem.nama_pasien : (trx.id_member && trx.id_member !== 'UMUM' ? trx.id_member : 'Pasien Umum'),
        METODE: trx.metode_bayar || 'TUNAI',
        CHANNEL: trx.channel || 'Toko Fisik',
        ITEM: items.length ? items : [{ NAMA: 'Transaksi POS', QTY: 1, SATUAN: 'Paket', HARGA: trx.grand_total, SUBTOTAL: trx.grand_total }],
        SUBTOTAL: trx.subtotal || trx.grand_total,
        DISKON: trx.diskon_total || 0,
        PPN: trx.pajak_ppn || 0,
        TOTAL: trx.grand_total,
        DIBAYAR: trx.grand_total,
        KEMBALI: 0,
        POIN: trx.poin_didapat || 0,
        CATATAN: trx.status_trx === 'RETUR' ? 'STATUS: TRANSAKSI DIRETUR' : 'Terima kasih!',
        QR_URL: global.location.origin + global.location.pathname + '?nota=' + encodeURIComponent(trx.no_invoice) + '&tot=' + encodeURIComponent(String(trx.grand_total || 0))
      };
      buildAndShowStrukModal(strukData, 58, (mem && mem.no_hp) || '', items);
    } catch (e) { global.toast(e.message, 'err'); }
  };

  let activeVoidItems = [];
  let activeVoidGrandTotal = 0;

  global.recalcVoidPartialRefund = () => {
    const modeEl = document.querySelector('input[name="voidMode"]:checked');
    const mode = modeEl ? modeEl.value : 'PARTIAL';
    const box = document.getElementById('voidPartialBox');
    const estEl = document.getElementById('voidEstimatedRefund');
    if (box) box.style.display = mode === 'PARTIAL' ? 'block' : 'none';
    if (!estEl) return;
    if (mode === 'FULL') {
      estEl.textContent = S().rp(activeVoidGrandTotal);
      return;
    }
    let activeOrigSub = 0;
    let selectedSub = 0;
    activeVoidItems.forEach((it) => {
      const qtyOrig = Number(it.qty || 0);
      const qtySisa = Math.max(0, qtyOrig - Number(it.qty_retur || 0));
      if (qtySisa <= 0) return;
      const lineSub = Number(it.subtotal_item || (qtyOrig * Number(it.harga_jual || 0)));
      const unitNet = qtyOrig > 0 ? (lineSub / qtyOrig) : Number(it.harga_jual || 0);
      activeOrigSub += unitNet * qtySisa;
      const inp = document.getElementById(`voidQty_${it.id_detail}`);
      const qSel = Math.max(0, Math.min(qtySisa, Math.floor(Number(inp ? inp.value : 0))));
      selectedSub += unitNet * qSel;
    });
    const est = activeOrigSub > 0 ? Math.round((selectedSub / activeOrigSub) * activeVoidGrandTotal) : 0;
    estEl.textContent = S().rp(est);
  };

  global.openPosVoidReturnModal = async (noInvoice, nominal) => {
    const st = S().AppState;
    const trx = (st.penjualan || []).find((p) => p.no_invoice === noInvoice) || { no_invoice: noInvoice, grand_total: nominal };
    activeVoidGrandTotal = Number(trx.grand_total != null ? trx.grand_total : nominal || 0);
    let items = _getPosItemsForTrx(st, trx);
    if (!items.length) {
      try {
        const res = await API().callApi('pos.details', { no_invoice: noInvoice });
        items = res.items || [];
      } catch (e) {}
    }
    activeVoidItems = items.filter((it) => Math.max(0, Number(it.qty || 0) - Number(it.qty_retur || 0)) > 0);
    const hasItemBreakdown = activeVoidItems.length > 0;
    const defaultMode = hasItemBreakdown ? 'PARTIAL' : 'FULL';

    const alasanPresets = [
      'Kesalahan input item / qty kasir',
      'Penyesuaian resep dokter / alergi pasien',
      'Pasien batal / tukar varian obat',
      'Salah metode pembayaran (Tunai / QRIS)'
    ];
    S().openModal(`<div class="p-6 space-y-3.5 text-xs">
      <div class="flex justify-between items-center"><h3 class="font-bold text-base text-red-600">&#8617; Proses Retur / Void Transaksi ${S().esc(noInvoice)}</h3><button onclick="ONSStore.closeModal()" class="text-xl px-1">&times;</button></div>
      <div class="p-3.5 rounded-xl border border-red-500/35 bg-red-500/10 space-y-1">
        <div class="flex flex-wrap justify-between items-center gap-2">
          <span class="font-bold text-red-700 dark:text-red-300">Sisa Nilai Aktif Nota: <span class="font-mono-num">${S().rp(activeVoidGrandTotal)}</span></span>
          <span class="font-bold text-red-700 dark:text-red-300">Estimasi Refund/Koreksi: <span id="voidEstimatedRefund" class="font-mono-num text-sm">${S().rp(defaultMode === 'FULL' ? activeVoidGrandTotal : 0)}</span></span>
        </div>
        <div style="color:var(--ons-text-soft)">Stok batch FEFO otomatis kembali ke gudang &amp; jurnal pembalik tercatat. Retur sebagian menandai nota sebagai <b>RETUR SEBAGIAN</b> dan mempertahankan item tersisa.</div>
      </div>
      ${hasItemBreakdown ? `<div>
        <label class="font-semibold block mb-1.5">Mode Retur</label>
        <div class="grid grid-cols-2 gap-2">
          <label class="flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer" style="border-color:var(--ons-border);background:var(--ons-bg-subtle)">
            <input type="radio" name="voidMode" value="PARTIAL" checked onchange="window.recalcVoidPartialRefund()"/>
            <div><div class="font-bold">Retur Sebagian Item</div><div class="text-[10px]" style="color:var(--ons-text-soft)">Pilih item &amp; qty tertentu saja</div></div>
          </label>
          <label class="flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer" style="border-color:var(--ons-border);background:var(--ons-bg-subtle)">
            <input type="radio" name="voidMode" value="FULL" onchange="window.recalcVoidPartialRefund()"/>
            <div><div class="font-bold text-red-600">Void Seluruh Sisa Nota</div><div class="text-[10px]" style="color:var(--ons-text-soft)">Batalkan 100% sisa nota</div></div>
          </label>
        </div>
      </div>
      <div id="voidPartialBox" class="ons-table-wrap max-h-48 overflow-y-auto">
        <table class="ons-table">
          <thead><tr><th>Obat &amp; Batch</th><th class="text-right">Sisa Aktif</th><th class="text-right">Qty Retur</th></tr></thead>
          <tbody>
            ${activeVoidItems.map((it) => {
              const sisaAktif = Math.max(0, Number(it.qty || 0) - Number(it.qty_retur || 0));
              return `<tr>
                <td><div class="font-semibold">${S().esc(it.nama_dagang || it.id_obat)}</div><div class="text-[10px] font-mono-num" style="color:var(--ons-text-soft)">Batch: ${S().esc(it.no_batch || it.id_batch || '-')} &bull; ${S().rp(it.harga_jual)}</div></td>
                <td class="text-right font-mono-num font-bold">${sisaAktif} ${S().esc(it.satuan || '')}</td>
                <td class="text-right"><input id="voidQty_${S().esc(it.id_detail)}" type="number" min="0" max="${sisaAktif}" step="1" value="0" oninput="window.recalcVoidPartialRefund()" class="ons-input font-mono-num text-xs w-20 text-right py-1"/></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>` : `<input type="radio" name="voidMode" value="FULL" checked class="hidden"/>`}
      <div>
        <label class="font-semibold block mb-1.5">Pilih Alasan Cepat atau Ketik Manual *</label>
        <div class="flex flex-wrap gap-1.5 mb-2">
          ${alasanPresets.map((pr) => `<button type="button" onclick="var el=document.getElementById('voidAlasanInp');if(el)el.value=this.textContent;" class="ons-pos-chip text-[11px]">${S().esc(pr)}</button>`).join('')}
        </div>
        <input id="voidAlasanInp" class="ons-input" value="Kesalahan input item / penyesuaian resep dokter"/>
      </div>
      <div><label class="font-semibold block mb-1">PIN Otorisasi APJ / Pemilik${API().isDemoMode() ? ' (Demo: 123456)' : ''} *</label><input id="voidPinInp" type="password" maxlength="6" autocomplete="off" class="ons-input font-mono-num font-bold tracking-widest" placeholder="Masukkan 6 digit PIN"/></div>
      <button type="button" onclick="window.submitPosVoidReturn('${S().esc(noInvoice)}')" class="ons-btn ons-btn-danger w-full py-2.5 font-bold">Otorisasi PIN &amp; Sah-kan Retur</button>
    </div>`, '580px');
  };

  global.submitPosVoidReturn = async (noInvoice) => {
    try {
      const modeEl = document.querySelector('input[name="voidMode"]:checked');
      const mode = modeEl ? modeEl.value : 'FULL';
      const payload = {
        no_invoice: noInvoice,
        alasan: (document.getElementById('voidAlasanInp') || {}).value || 'Retur PIN',
        pin_override: (document.getElementById('voidPinInp') || {}).value || ''
      };
      if (mode === 'PARTIAL' && activeVoidItems.length) {
        const returItems = [];
        activeVoidItems.forEach((it) => {
          const sisaAktif = Math.max(0, Number(it.qty || 0) - Number(it.qty_retur || 0));
          const inp = document.getElementById(`voidQty_${it.id_detail}`);
          const qSel = Math.max(0, Math.min(sisaAktif, Math.floor(Number(inp ? inp.value : 0))));
          if (qSel > 0) returItems.push({ id_detail: it.id_detail, qty: qSel });
        });
        if (!returItems.length) {
          global.toast('Pilih minimal 1 item dengan Qty Retur > 0, atau pilih mode Void Seluruh Sisa Nota.', 'warn');
          return;
        }
        payload.retur_items = returItems;
      }
      const res = await API().callApi('pos.voidReturn', payload, { isWrite: true });
      S().closeModal();
      const labelMode = res.is_partial ? 'Retur Sebagian' : 'Retur Penuh / Void';
      global.toast(`${labelMode} ${res.no_invoice} disahkan (${res.restored_qty || res.restored_items} unit stok kembali).`, 'ok');
      await global.bootLoadState(true);
    } catch (e) { global.toast(e.message, 'err'); }
  };

  global.openPosCheckoutModal = (metode, total) => {
    const cart = S().AppState.carts[S().AppState.activeCartIdx];
    if (!cart || !cart.items.length) { global.toast('Keranjang masih kosong!', 'warn'); return; }
    for (const it of cart.items) {
      const needBase = _cartBaseQtyForObat(cart, it.id_obat, -1);
      const sellStok = S().getSellableStok(it.id_obat);
      if (needBase > sellStok) {
        global.toast(`Stok layak jual ${it.nama_dagang} tidak mencukupi (tersedia ${sellStok}, butuh ${needBase}).`, 'err');
        return;
      }
    }
    const seeCost = S().canSeeFinancialCost ? S().canSeeFinancialCost() : false;
    const cdss = S().checkCartCdss(cart);
    const estHppCart = cart.items.reduce((s, it) => {
      const ob = S().AppState.masterObat.find((o) => o.id_obat === it.id_obat);
      const nb = S().getNearestSellableBatch(it.id_obat);
      const hppBase = Number((nb && nb.hpp_beli) || (ob && ob.hpp_avg) || 0);
      return s + (hppBase * Number(it.qty || 1) * Math.max(1, Number(it.faktor_konversi || 1)));
    }, 0);
    const isBelowHpp = estHppCart > 0 && total < estHppCart;
    const requiresApjAuth = Boolean(cdss.needsApjPin || isBelowHpp);
    const member = S().AppState.members.find((m) => m.id_member === cart.id_member);
    const maxRedeemPoin = member ? Math.min(Number(member.poin_loyalitas || 0), Math.floor(total / 100)) : 0;
    const invPreview = 'INV-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-POS';
    const qrisStr = S().buildQrisEmvcoPayload(total, invPreview);
    const totalQty = cart.items.reduce((s, it) => s + Number(it.qty || 0), 0);
    const roundUp = (step, v) => Math.ceil(Math.max(1, v) / step) * step;
    const smartDenoms = Array.from(new Set([
      roundUp(10000, total),
      roundUp(50000, total),
      20000, 50000, 100000, 150000, 200000
    ])).filter((v) => v >= total || v >= 50000).sort((a, b) => a - b).slice(0, 5);

    S().openModal(`<div class="p-6 space-y-4">
      <div class="flex justify-between items-start gap-2">
        <div>
          <h3 class="font-bold text-lg">Konfirmasi Pembayaran POS (${S().esc(metode)})</h3>
          <div class="text-xs" style="color:var(--ons-text-soft)">${cart.items.length} item (${totalQty} qty) &bull; ${S().esc(member ? member.nama_pasien : (cart.pelanggan_nama || 'Pasien Umum'))} &bull; ${S().esc(cart.channel || 'Toko Fisik')}</div>
        </div>
        <button onclick="ONSStore.closeModal()" class="text-xl px-1">&times;</button>
      </div>
      <div class="p-4 rounded-xl text-center border" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
        <div class="text-xs font-semibold" style="color:var(--ons-text-soft)">Total Tagihan Akhir</div>
        <div id="posModalTotalDisplay" class="text-3xl font-extrabold font-mono-num text-blue-600 mt-0.5">${S().rp(total)}</div>
        ${(() => {
          const tots = computePosCartTotals(cart);
          if (tots.totalBiayaTambahan <= 0) return '';
          const parts = [];
          if (tots.biayaServis > 0) parts.push('Servis ' + S().rp(tots.biayaServis));
          if (tots.biayaEmbalase > 0) parts.push('Embalase ' + S().rp(tots.biayaEmbalase));
          if (tots.ongkosKirim > 0) parts.push('Ongkir ' + S().rp(tots.ongkosKirim));
          if (tots.biayaLainnya > 0) parts.push('Lainnya ' + S().rp(tots.biayaLainnya));
          return `<div class="text-[11px] font-mono-num mt-1" style="color:var(--ons-text-soft)">Termasuk ${S().esc(parts.join(' • '))}</div>`;
        })()}
      </div>

      ${isBelowHpp ? `<div class="p-3 rounded-xl border border-red-500 bg-red-500/15 text-xs space-y-1 text-red-700 dark:text-red-300">
        <div class="font-extrabold">&#9888;&#65039; GUARD ANTI-RUGI: HARGA JUAL DI BAWAH HPP MODAL!</div>
        <div>Total Jual: <b class="font-mono-num">${S().rp(total)}</b>${seeCost ? ` &bull; Modal HPP: <b class="font-mono-num">${S().rp(estHppCart)}</b> (Selisih Rugi: <b class="font-mono-num">${S().rp(estHppCart - total)}</b>)` : ' &bull; Di bawah batas minimum modal'}. Wajib otorisasi PIN APJ/Pemilik.</div>
      </div>` : ''}

      ${maxRedeemPoin > 0 ? `<div class="p-3 rounded-xl border text-xs space-y-1.5" style="border-color:var(--ons-border)">
        <div class="flex justify-between items-center font-bold">
          <span>Tukar Poin Member (${S().esc(member.nama_pasien)})</span>
          <span class="text-emerald-600">Saldo: ${member.poin_loyalitas} poin</span>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <input id="posRedeemPoinInp" type="number" min="0" max="${maxRedeemPoin}" value="0" oninput="window.recalcPosModalNetTotal(${total}, '${S().esc(invPreview)}')" class="ons-input font-mono-num w-28 py-1 text-xs"/>
          <span class="flex-1" style="color:var(--ons-text-soft)">poin (1 poin = Rp 100, maks ${maxRedeemPoin})</span>
          <button type="button" onclick="document.getElementById('posRedeemPoinInp').value=${maxRedeemPoin};window.recalcPosModalNetTotal(${total}, '${S().esc(invPreview)}');" class="ons-quick-denom text-[11px]">Pakai Maks (${maxRedeemPoin})</button>
        </div>
      </div>` : ''}

      ${metode === 'QRIS' ? `<div class="text-center space-y-2 p-3 rounded-xl border" style="border-color:var(--ons-border)">
        <div id="posQrisSvgBox" class="flex justify-center">${S().renderSvgQr(qrisStr, 175)}</div>
        <div class="text-xs font-bold text-emerald-600">QRIS Dinamis EMVCo BI — Nominal Tepat <span id="posQrisAmtSpan" class="font-mono-num">${S().rp(total)}</span></div>
        <div class="text-[11px]" style="color:var(--ons-text-soft)">Minta pasien scan QR di atas melalui m-Banking / e-Wallet, lalu konfirmasi pembayaran masuk.</div>
      </div>` : ''}

      ${metode === 'TRANSFER' ? `<div class="p-3.5 rounded-xl border space-y-2.5 text-xs" style="border-color:var(--ons-border);background:var(--ons-bg-subtle)">
        <div class="font-bold">Detail Transfer Bank / Mesin EDC</div>
        <div class="flex flex-wrap gap-1.5">
          ${['Transfer BCA', 'Transfer BRI', 'Transfer Mandiri', 'Transfer BNI', 'Mesin EDC Debit/Kredit'].map((ch, i) => `
            <button type="button" onclick="document.getElementById('posTransferBank').value='${ch}';document.querySelectorAll('.ons-trf-chip').forEach((b)=>b.classList.remove('is-active'));this.classList.add('is-active');" class="ons-pos-chip ons-trf-chip ${i === 0 ? 'is-active' : ''}">${ch}</button>
          `).join('')}
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div><label class="font-semibold block mb-1">Kanal Bank / EDC</label><input id="posTransferBank" class="ons-input text-xs" value="Transfer BCA"/></div>
          <div><label class="font-semibold block mb-1">No. Referensi / Approval Code</label><input id="posTransferRef" class="ons-input font-mono-num text-xs" placeholder="Opsional: 6 digit ref / trace"/></div>
        </div>
      </div>` : ''}

      ${metode === 'SPLIT' ? `<div class="p-3.5 rounded-xl border space-y-2.5 text-xs" style="border-color:var(--ons-border)">
        <div class="flex items-center justify-between gap-2">
          <span class="font-bold">Kalkulator Pembayaran Split (Tunai + QRIS/EDC)</span>
          <button type="button" onclick="window.setPosSplitHalf(${total})" class="ons-quick-denom text-[11px]">Bagi 50:50</button>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div><label class="font-semibold block mb-1">Tunai (Rp)</label><input id="posSplitTunai" type="text" inputmode="numeric" value="${S().formatDots(Math.floor(total / 2))}" oninput="window.maskNumberInput(this); window.syncSplitOther(${total});" class="ons-input ons-currency-input font-mono-num"/></div>
          <div><label class="font-semibold block mb-1">QRIS / Transfer (Rp)</label><input id="posSplitNonTunai" type="text" inputmode="numeric" value="${S().formatDots(total - Math.floor(total / 2))}" oninput="window.maskNumberInput(this); window.updateSplitCheck(${total});" class="ons-input ons-currency-input font-mono-num"/></div>
        </div>
        <div id="posSplitStatusSpan" class="text-[11px] font-bold text-emerald-600">Total Split seimbang (${S().rp(total)})</div>
      </div>` : ''}

      ${metode === 'TUNAI' ? `<div class="space-y-2.5">
        <div class="flex items-center justify-between">
          <label class="text-xs font-semibold">Uang Tunai Diterima (Rp)</label>
          <span class="text-[11px]" style="color:var(--ons-text-soft)">Tekan Enter untuk langsung terbit struk</span>
        </div>
        <input id="posTunaiBayar" type="text" inputmode="numeric" class="ons-input ons-currency-input font-mono-num text-lg font-extrabold" value="${S().formatDots(total)}" oninput="window.maskNumberInput(this); window.updatePosTunaiChange(${total});" onkeydown="if(event.key==='Enter'){event.preventDefault();document.getElementById('posModalConfirmBtn')?.click();}"/>
        <div class="flex gap-1.5 flex-wrap">
          <button type="button" onclick="window.setPosTunaiExact(${total})" class="ons-quick-denom">Uang Pas</button>
          ${smartDenoms.map((v) => `<button type="button" onclick="window.setPosTunaiVal(${v}, ${total})" class="ons-quick-denom">${S().rp(v)}</button>`).join('')}
        </div>
        <div class="p-3 rounded-xl flex justify-between items-center font-bold border" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
          <span class="text-xs" id="posKembalianLabel">Kembalian Pelanggan:</span>
          <span id="posKembalianSpan" class="text-lg font-mono-num text-emerald-600">Rp 0</span>
        </div>
      </div>` : ''}

      ${metode === 'PIUTANG' ? `<div class="p-3.5 rounded-xl border border-amber-500/40 bg-amber-500/5 space-y-2.5 text-xs">
        <div class="flex items-center justify-between gap-2">
          <span class="font-bold text-amber-700 dark:text-amber-300">Pencatatan Piutang / Tempo Pelanggan &amp; Mitra</span>
          <div class="flex gap-1">
            ${[7, 14, 30].map((dHari) => `<button type="button" onclick="document.getElementById('posPiutangJt').value=new Date(Date.now()+${dHari}*86400000).toISOString().slice(0,10)" class="ons-quick-denom text-[10px]">+${dHari}h</button>`).join('')}
          </div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div><label class="font-semibold block mb-1">Nama Penanggung Jawab *</label><input id="posPiutangNama" class="ons-input text-xs" value="${S().esc(cart.pelanggan_nama || (member && member.nama_pasien) || '')}" placeholder="Nama pasien / klinik mitra"/></div>
          <div><label class="font-semibold block mb-1">Tgl Jatuh Tempo *</label><input id="posPiutangJt" type="date" class="ons-input font-mono-num text-xs" value="${new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)}"/></div>
          <div><label class="font-semibold block mb-1">DP / Uang Muka Sekarang (Rp)</label><input id="posPiutangDp" type="text" inputmode="numeric" value="${S().formatDots(0)}" oninput="window.maskNumberInput(this); window.updatePosPiutangSisa(${total});" class="ons-input ons-currency-input font-mono-num text-xs"/></div>
          <div><label class="font-semibold block mb-1">Batas Plafon Kredit (Rp)</label><input id="posPiutangPlafon" type="text" inputmode="numeric" class="ons-input ons-currency-input font-mono-num text-xs" value="${S().formatDots(2000000)}" oninput="window.maskNumberInput(this)"/></div>
        </div>
        <div><label class="font-semibold block mb-1">Catatan Tempo</label><input id="posPiutangNote" class="ons-input text-xs" placeholder="Tagihan akhir bulan / resep kronis"/></div>
        <div class="flex justify-between items-center font-bold pt-1">
          <span style="color:var(--ons-text-soft)">Sisa Piutang Dicatat (BELUM_LUNAS):</span>
          <span id="posPiutangSisaSpan" class="font-mono-num text-amber-600 text-sm">${S().rp(total)}</span>
        </div>
      </div>` : ''}

      ${requiresApjAuth ? `<div class="p-3 rounded-xl border border-red-500/40 bg-red-500/10 space-y-2">
        <div class="text-xs font-bold text-red-600">&#128274; OTORISASI PIN APJ DIPERLUKAN (${isBelowHpp ? 'Guard Anti-Rugi Jual < HPP' : 'Obat Keras / Narkotika / Peringatan CDSS'})</div>
        <input id="posApjPinInput" type="password" maxlength="6" autocomplete="off" class="ons-input font-mono-num" placeholder="Masukkan 6 Digit PIN APJ${API().isDemoMode() ? ' (Demo: 123456)' : ''}" onkeydown="if(event.key==='Enter'){event.preventDefault();document.getElementById('posModalConfirmBtn')?.click();}"/>
      </div>` : ''}

      <div>
        <label class="text-xs font-semibold block mb-1">Nomor WA Pembeli (Opsional — untuk Kirim Struk Gratis)</label>
        <input id="posWaStrukTarget" type="tel" class="ons-input font-mono-num text-xs" value="${S().esc(cart.no_wa || (member && member.no_hp) || '')}" placeholder="0812xxxx / 62812xxxx (atau isi setelah nota terbit)"/>
      </div>

      <button id="posModalConfirmBtn" onclick="window.executePosCheckout('${S().esc(metode)}', ${total}, ${requiresApjAuth})" class="ons-btn ons-btn-emerald w-full py-3 font-bold">${metode === 'PIUTANG' ? 'Catat Piutang Tempo, Potong FEFO &amp; Terbitkan Nota' : 'Proses Transaksi, Potong FEFO &amp; Cetak Struk'}</button>
    </div>`, '540px');
  };

  function _getModalNetTotal(baseTotal) {
    const pts = Math.max(0, Number((document.getElementById('posRedeemPoinInp') || {}).value || 0));
    return Math.max(0, Number(baseTotal || 0) - pts * 100);
  }

  global.updatePosTunaiChange = (baseTotal) => {
    const net = _getModalNetTotal(baseTotal);
    const inp = document.getElementById('posTunaiBayar');
    const lbl = document.getElementById('posKembalianLabel');
    const sp = document.getElementById('posKembalianSpan');
    if (!inp || !sp) return;
    const paid = window.parseNumber ? window.parseNumber(inp.value || 0) : Number(inp.value || 0);
    const diff = paid - net;
    if (diff < 0) {
      if (lbl) lbl.textContent = 'Uang Kurang:';
      sp.textContent = S().rp(Math.abs(diff));
      sp.className = 'text-lg font-mono-num text-red-600';
    } else {
      if (lbl) lbl.textContent = 'Kembalian Pelanggan:';
      sp.textContent = S().rp(diff);
      sp.className = 'text-lg font-mono-num text-emerald-600';
    }
  };

  global.setPosTunaiExact = (baseTotal) => {
    const net = _getModalNetTotal(baseTotal);
    const inp = document.getElementById('posTunaiBayar');
    if (inp) { inp.value = S().formatDots(net); global.updatePosTunaiChange(baseTotal); }
  };

  global.setPosTunaiVal = (val, baseTotal) => {
    const inp = document.getElementById('posTunaiBayar');
    if (inp) { inp.value = S().formatDots(val); global.updatePosTunaiChange(baseTotal); }
  };

  global.updatePosPiutangSisa = (baseTotal) => {
    const net = _getModalNetTotal(baseTotal);
    const dp = Math.min(net, Math.max(0, window.parseNumber ? window.parseNumber((document.getElementById('posPiutangDp') || {}).value || 0) : Number((document.getElementById('posPiutangDp') || {}).value || 0)));
    const sp = document.getElementById('posPiutangSisaSpan');
    if (sp) sp.textContent = S().rp(Math.max(0, net - dp));
  };

  global.setPosSplitHalf = (baseTotal) => {
    const net = _getModalNetTotal(baseTotal);
    const tInp = document.getElementById('posSplitTunai');
    const ntInp = document.getElementById('posSplitNonTunai');
    if (tInp) tInp.value = S().formatDots(Math.floor(net / 2));
    if (ntInp) ntInp.value = S().formatDots(net - Math.floor(net / 2));
    global.updateSplitCheck(baseTotal);
  };

  global.updateSplitCheck = (baseTotal) => {
    const net = _getModalNetTotal(baseTotal);
    const sT = Math.max(0, window.parseNumber ? window.parseNumber((document.getElementById('posSplitTunai') || {}).value || 0) : Number((document.getElementById('posSplitTunai') || {}).value || 0));
    const sN = Math.max(0, window.parseNumber ? window.parseNumber((document.getElementById('posSplitNonTunai') || {}).value || 0) : Number((document.getElementById('posSplitNonTunai') || {}).value || 0));
    const sp = document.getElementById('posSplitStatusSpan');
    if (!sp) return;
    const sum = sT + sN;
    if (sum === net) {
      sp.textContent = 'Total Split seimbang (' + S().rp(net) + ')';
      sp.className = 'text-[11px] font-bold text-emerald-600';
    } else if (sum < net) {
      sp.textContent = 'Kurang ' + S().rp(net - sum) + ' dari tagihan ' + S().rp(net);
      sp.className = 'text-[11px] font-bold text-red-600';
    } else {
      sp.textContent = 'Kelebihan bayar ' + S().rp(sum - net);
      sp.className = 'text-[11px] font-bold text-amber-600';
    }
  };

  global.recalcPosModalNetTotal = (baseTotal, invPreview) => {
    const net = _getModalNetTotal(baseTotal);
    const disp = document.getElementById('posModalTotalDisplay');
    if (disp) disp.textContent = S().rp(net);
    const qrisSpan = document.getElementById('posQrisAmtSpan');
    if (qrisSpan) qrisSpan.textContent = S().rp(net);
    const qrisBox = document.getElementById('posQrisSvgBox');
    if (qrisBox && S().buildQrisEmvcoPayload && S().renderSvgQr) {
      qrisBox.innerHTML = S().renderSvgQr(S().buildQrisEmvcoPayload(net, invPreview || 'INV-POS'), 175);
    }
    global.updatePosTunaiChange(baseTotal);
    global.updatePosPiutangSisa(baseTotal);
    if (document.getElementById('posSplitTunai')) global.syncSplitOther(baseTotal);
  };

  global.syncSplitOther = (baseTotal) => {
    const net = _getModalNetTotal(baseTotal);
    const t = Math.max(0, window.parseNumber ? window.parseNumber((document.getElementById('posSplitTunai') || {}).value || 0) : Number((document.getElementById('posSplitTunai') || {}).value || 0));
    const ntInp = document.getElementById('posSplitNonTunai');
    if (ntInp) ntInp.value = S().formatDots(Math.max(0, net - t));
    global.updateSplitCheck(baseTotal);
  };

  global.executePosCheckout = async (metode, baseGrandTotal, needsPin) => {
    const st = S().AppState;
    const cart = st.carts[st.activeCartIdx];
    const member = st.members.find((m) => m.id_member === cart.id_member);
    let apjOverride = '';

    if (needsPin) {
      const pinVal = (document.getElementById('posApjPinInput') || {}).value || '';
      try {
        const ver = await API().callApi('auth.verifyPin', { pin: pinVal }, { isWrite: true });
        apjOverride = ver.supervisor_nama;
      } catch (e) {
        global.toast(e.message, 'err');
        return;
      }
    }

    const redeemPoin = Math.max(0, Number((document.getElementById('posRedeemPoinInp') || {}).value || 0));
    const poinDiskonRp = redeemPoin * 100;
    const grandTotal = Math.max(0, baseGrandTotal - poinDiskonRp);
    const waTarget = ((document.getElementById('posWaStrukTarget') || {}).value || (member && member.no_hp) || '').trim();

    let detailSplit = '';
    if (metode === 'SPLIT') {
      const tEl = document.getElementById('posSplitTunai');
      const ntEl = document.getElementById('posSplitNonTunai');
      const sT = Math.max(0, window.parseNumber ? window.parseNumber((tEl || {}).value || 0) : Number((tEl || {}).value || 0));
      const sN = Math.max(0, window.parseNumber ? window.parseNumber((ntEl || {}).value || 0) : Number((ntEl || {}).value || 0));
      if (tEl && ntEl && (sT + sN) < grandTotal) {
        global.toast('Total pembayaran Split kurang dari tagihan (' + S().rp(grandTotal) + ').', 'err');
        return;
      }
      detailSplit = `Tunai ${S().rp(sT)} + QRIS/EDC ${S().rp(sN)}`;
    } else if (metode === 'TRANSFER') {
      const bank = ((document.getElementById('posTransferBank') || {}).value || '').trim();
      const ref = ((document.getElementById('posTransferRef') || {}).value || '').trim();
      detailSplit = [bank, ref ? ('Ref: ' + ref) : ''].filter(Boolean).join(' • ');
    }

    const tunaiEl = document.getElementById('posTunaiBayar');
    const tunaiBayar = metode === 'TUNAI' ? (tunaiEl ? (window.parseNumber ? window.parseNumber(tunaiEl.value) : Number(tunaiEl.value)) : grandTotal) : (metode === 'PIUTANG' ? 0 : grandTotal);
    if (metode === 'TUNAI' && tunaiEl && tunaiBayar < grandTotal) {
      playPosBeep('err');
      global.toast('Uang tunai diterima kurang dari total tagihan!', 'err');
      return;
    }
    const kembaliRp = metode === 'TUNAI' ? Math.max(0, tunaiBayar - grandTotal) : 0;
    const piutangNama = ((document.getElementById('posPiutangNama') || {}).value || '').trim();
    const piutangJt = ((document.getElementById('posPiutangJt') || {}).value || '').trim();
    const piutangDp = Math.min(grandTotal, Math.max(0, window.parseNumber ? window.parseNumber((document.getElementById('posPiutangDp') || {}).value || 0) : Number((document.getElementById('posPiutangDp') || {}).value || 0)));
    const piutangPlafon = window.parseNumber ? window.parseNumber((document.getElementById('posPiutangPlafon') || {}).value || 2000000) : Number((document.getElementById('posPiutangPlafon') || {}).value || 2000000);
    const piutangNote = ((document.getElementById('posPiutangNote') || {}).value || '').trim();

    if (metode === 'PIUTANG' && (!cart.id_member || cart.id_member === 'UMUM') && !piutangNama) {
      global.toast('Pembayaran Piutang/Tempo wajib memilih Member/Mitra atau mengisi Nama Penanggung Jawab!', 'err');
      return;
    }

    const itemDiscTotal = cart.items.reduce((s, it) => s + Number(it.diskon_item || 0), 0);
    const tots = computePosCartTotals(cart);
    const feeParts = [];
    if (tots.biayaServis > 0) feeParts.push('Servis ' + S().rp(tots.biayaServis));
    if (tots.biayaEmbalase > 0) feeParts.push('Embalase ' + S().rp(tots.biayaEmbalase));
    if (tots.ongkosKirim > 0) feeParts.push('Ongkir ' + S().rp(tots.ongkosKirim));
    if (tots.biayaLainnya > 0) feeParts.push('Lainnya ' + S().rp(tots.biayaLainnya));
    const catatanGabung = [
      cart.dokter_nama ? ('Dr. ' + cart.dokter_nama) : '',
      feeParts.length ? ('Biaya: ' + feeParts.join(', ')) : '',
      cart.catatan || ''
    ].filter(Boolean).join(' • ');

    const payload = {
      cabang_id: st.cabangId,
      shift_id: (st.activeShift && st.activeShift.id_shift) || 'SHF-AKTIF',
      channel: cart.channel,
      id_member: cart.id_member,
      tier_harga: cart.tier_harga || (cart.id_member !== 'UMUM' ? 'MEMBER' : 'UMUM'),
      pelanggan_nama: piutangNama || cart.pelanggan_nama || (member && member.nama_pasien) || 'Pasien Umum',
      dokter_nama: cart.dokter_nama || '',
      sales_nama: cart.sales_nama || '',
      kode_eksternal: cart.kode_eksternal || '',
      catatan: catatanGabung,
      biaya_servis: tots.biayaServis,
      biaya_embalase: tots.biayaEmbalase,
      ongkos_kirim: tots.ongkosKirim,
      biaya_lainnya: tots.biayaLainnya,
      id_order: cart.id_order || '',
      metode_bayar: metode,
      detail_split: detailSplit,
      redeem_poin: redeemPoin,
      subtotal: cart.items.reduce((s, it) => s + it.harga_jual * it.qty, 0),
      diskon_total: Number(cart.diskon_global || 0) + itemDiscTotal + poinDiskonRp,
      grand_total: grandTotal,
      apj_override_id: apjOverride,
      allow_below_hpp: Boolean(apjOverride),
      send_wa_to: waTarget,
      tgl_jatuh_tempo: piutangJt,
      dp_bayar: metode === 'PIUTANG' ? piutangDp : 0,
      plafon_kredit: piutangPlafon,
      catatan_piutang: piutangNote,
      items: cart.items
    };

    // Idempotency: Pin ID checkout ke sesi pembayaran modal yang stabil
    // Jika timeout dan kasir menekan tombol lagi, ID yang sama dikirim ke backend sehingga dicegah tercatat dua kali!
    if (!cart._activeCheckoutId) {
      cart._activeCheckoutId = 'POS-TX-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    }
    payload.offline_sync_id = cart._activeCheckoutId;
    payload.client_tx_id = cart._activeCheckoutId;

    try {
      let res;
      if (!navigator.onLine && !API().isDemoMode()) {
        const queued = API().pushOfflineQueue(payload);
        global.toast('Mode Offline Aktif: Transaksi tersimpan di Antrean Darurat (' + queued.offline_sync_id + ').', 'warn');
        res = { no_invoice: queued.offline_sync_id, penjualan: payload };
      } else {
        res = await API().callApi('pos.checkout', payload, { isWrite: true, requestId: cart._activeCheckoutId });
      }
      playPosBeep('ok');
      S().closeModal();
      const notaNo = res.no_invoice || (res.penjualan && res.penjualan.no_invoice) || ('INV-' + Date.now());
      const itemsCopy = cart.items.map((it) => ({
        NAMA: it.nama_dagang, QTY: it.qty, SATUAN: it.satuan,
        HARGA: it.harga_jual, SUBTOTAL: it.qty * it.harga_jual,
        ATURAN_PAKAI: it.aturan_pakai || '',
        nama: it.nama_dagang, qty: it.qty, satuan: it.satuan, aturan_pakai: it.aturan_pakai || ''
      }));

      const prof = S().getStoreProfile ? S().getStoreProfile() : {};
      buildAndShowStrukModal({
        NAMA_TOKO: (prof.nama_usaha || 'APOTEK ONS FARMA').toUpperCase(),
        ALAMAT_TOKO: [prof.alamat_usaha, prof.kota].filter(Boolean).join(', ') || 'Jl. Kesehatan Raya No. 88',
        SIA_TOKO: prof.no_sia || '',
        WA_TOKO: prof.wa_usaha || prof.telepon_usaha || '0811-0000-990',
        APJ_NAMA: prof.nama_pemilik || 'apt. Anissa Faradifa R. Is Rumi',
        APJ_SIPA: prof.sipa_pemilik || '19920412/SIPA_35.78/2025/1042',
        LOGO_URL: prof.logo_url || '',
        NOTA: notaNo,
        TANGGAL: new Date().toLocaleString('id-ID'),
        KASIR: (st.user && st.user.nama_lengkap) || 'Kasir',
        PELANGGAN: payload.pelanggan_nama,
        METODE: metode + (detailSplit ? (' (' + detailSplit + ')') : ''),
        CHANNEL: cart.channel || 'Toko Fisik',
        ITEM: itemsCopy,
        SUBTOTAL: payload.subtotal,
        DISKON: payload.diskon_total,
        PPN: 0,
        TOTAL: grandTotal,
        DIBAYAR: metode === 'PIUTANG' ? piutangDp : tunaiBayar,
        KEMBALI: kembaliRp,
        POIN: Math.floor(grandTotal / 10000),
        CATATAN: [apjOverride ? ('Diverifikasi APJ: ' + apjOverride) : '', catatanGabung || 'Konsultasi obat GRATIS bersama Apoteker kami.'].filter(Boolean).join(' • '),
        QR_URL: global.location.origin + global.location.pathname + '?nota=' + encodeURIComponent(notaNo) + '&tot=' + encodeURIComponent(String(grandTotal || 0))
      }, 58, waTarget, itemsCopy);

      cart.items = [];
      cart._activeCheckoutId = null;
      cart.diskon_global = 0;
      cart.diskon_input = 0;
      cart.biaya_servis = 0;
      cart.biaya_embalase = 0;
      cart.ongkos_kirim = 0;
      cart.biaya_lainnya = 0;
      cart.dokter_nama = '';
      cart.sales_nama = '';
      cart.kode_eksternal = '';
      cart.catatan = '';
      cart.id_order = '';
      cart.pelanggan_nama = '';
      cart.no_wa = '';
      cart.held_note = '';
      cart.held_at = '';
      await global.bootLoadState(true);
    } catch (e) {
      playPosBeep('err');
      global.toast(e.message, 'err');
    }
  };

  global.syncPosOfflineNow = async () => {
    const res = await API().flushOfflineQueue();
    global.toast(res.synced ? (res.synced + ' transaksi tersinkronkan!') : 'Tidak ada antrean / masih offline.', 'info');
    await global.bootLoadState(true);
  };

  /**
   * Buka Shift Kasir (Catat Modal Awal Laci)
   */
  global.openBukaShiftModal = () => {
    const st = S().AppState;
    S().openModal(`<div class="p-6 space-y-3 text-xs">
      <div class="flex justify-between items-center">
        <h3 class="font-bold text-base">Buka Shift Kasir (Modal Laci Awal)</h3>
        <button onclick="ONSStore.closeModal()" class="text-xl">&times;</button>
      </div>
      <div class="p-3 rounded-xl" style="background:var(--ons-bg-subtle)">
        Kasir Bertugas: <b>${S().esc((st.user && st.user.nama_lengkap) || 'Kasir')}</b> (${S().esc(S().getRole())})
      </div>
      <div>
        <label class="font-semibold block mb-1">Modal Awal Uang Laci (Rp) *</label>
        <input id="openShiftModalInp" type="number" min="0" class="ons-input font-mono-num text-base font-bold" value="300000"/>
        <div class="flex flex-wrap gap-1.5 mt-2">
          ${[200000, 300000, 500000, 1000000].map((v) => `<button type="button" onclick="document.getElementById('openShiftModalInp').value=${v}" class="ons-quick-denom">${S().rp(v)}</button>`).join('')}
        </div>
      </div>
      <div><label class="font-semibold block mb-1">Catatan Pembukaan Shift</label><input id="openShiftNoteInp" class="ons-input" value="Modal uang receh pembukaan shift pagi"/></div>
      <button onclick="window.submitBukaShift()" class="ons-btn ons-btn-emerald w-full py-2.5 text-xs">Konfirmasi Buka Shift Kasir</button>
    </div>`, '440px');
  };

  global.submitBukaShift = async () => {
    try {
      const modalAwal = Math.max(0, Number((document.getElementById('openShiftModalInp') || {}).value || 0));
      const catatan = ((document.getElementById('openShiftNoteInp') || {}).value || '').trim();
      const res = await API().callApi('shift.open', { modal_awal: modalAwal, catatan }, { isWrite: true });
      S().closeModal();
      global.toast(res.already_open ? ('Shift aktif ditemukan: ' + res.shift.id_shift) : ('Shift dibuka: ' + res.shift.id_shift), 'ok');
      await global.bootLoadState(true);
    } catch (e) { global.toast(e.message, 'err'); }
  };

  /**
   * Tebus Sebagian & Cetak Salinan Resep (Apograph / p.c.c) - PMK 73/2016
   */
  global.openCopyResepFromPosModal = () => {
    const st = S().AppState;
    const cart = st.carts[st.activeCartIdx];
    if (!cart || !cart.items.length) {
      global.toast('Masukkan item obat resep ke keranjang POS terlebih dahulu!', 'warn');
      return;
    }
    const member = st.members.find((m) => m.id_member === cart.id_member);
    const pasienDef = cart.pelanggan_nama || (member && member.nama_pasien) || '';
    const todayIso = new Date().toISOString().slice(0, 10);
    S().openModal(`<div class="p-6 space-y-3 text-xs">
      <div class="flex justify-between items-center">
        <h3 class="font-bold text-base">Tebus Sebagian &amp; Salinan Resep (p.c.c)</h3>
        <button onclick="ONSStore.closeModal()" class="text-xl">&times;</button>
      </div>
      <p style="color:var(--ons-text-soft)">Atur jumlah resep dokter vs jumlah yang ditebus sekarang. Sistem otomatis mencatat <i>det</i> / <i>nedet</i> &amp; memperbarui qty keranjang POS.</p>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div><label class="font-semibold block mb-1">Nama Pasien *</label><input id="crPasien" class="ons-input" value="${S().esc(pasienDef)}" placeholder="Nama lengkap pasien"/></div>
        <div><label class="font-semibold block mb-1">Umur / BB</label><input id="crUmur" class="ons-input" value="-" placeholder="Cth: 45 th"/></div>
        <div><label class="font-semibold block mb-1">Nama Dokter Penulis *</label><input id="crDokter" list="onsDokterDatalist" class="ons-input" value="dr. Hendri Saputra"/></div>
        ${S().renderDokterDatalistHtml ? S().renderDokterDatalistHtml('onsDokterDatalist') : ''}
        <div><label class="font-semibold block mb-1">No. Resep Asal &amp; Tgl</label><input id="crNoResep" class="ons-input font-mono-num" value="R/${todayIso.replace(/-/g, '')}/01"/></div>
      </div>
      <div class="space-y-2 max-h-60 overflow-y-auto">
        ${cart.items.map((it, idx) => {
          const defAmbil = Math.max(1, Math.floor(Number(it.qty || 1) / 2) || Number(it.qty || 1));
          return `<div class="p-2.5 rounded-xl border grid grid-cols-12 gap-2 items-center" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
            <div class="col-span-6">
              <div class="font-bold truncate">${S().esc(it.nama_dagang)}</div>
              <div class="text-[11px]" style="color:var(--ons-text-soft)">Signa: ${S().esc(it.aturan_pakai || 'Sesuai aturan pakai')}</div>
            </div>
            <div class="col-span-3">
              <label class="text-[10px] block">Qty Resep</label>
              <input id="crQtyResep_${idx}" type="number" min="1" value="${Number(it.qty || 1)}" class="ons-input font-mono-num py-1 min-h-0 h-7"/>
            </div>
            <div class="col-span-3">
              <label class="text-[10px] block">Ditebus Skrg</label>
              <input id="crQtyAmbil_${idx}" type="number" min="0" max="${Number(it.qty || 1)}" value="${defAmbil}" class="ons-input font-mono-num py-1 min-h-0 h-7"/>
            </div>
          </div>`;
        }).join('')}
      </div>
      <div class="flex items-center gap-2">
        <input type="checkbox" id="crSyncCartChk" checked/>
        <label for="crSyncCartChk">Sesuaikan otomatis Qty Keranjang POS mengikuti jumlah <b>Ditebus Sekarang</b></label>
      </div>
      <button onclick="window.submitCopyResepFromPos()" class="ons-btn ons-btn-primary w-full py-2.5 text-xs">Simpan Arsip Salinan Resep &amp; Cetak Apograph (p.c.c)</button>
    </div>`, '620px');
  };

  global.submitCopyResepFromPos = async () => {
    try {
      const st = S().AppState;
      const cart = st.carts[st.activeCartIdx];
      const namaPasien = ((document.getElementById('crPasien') || {}).value || '').trim();
      if (!namaPasien) throw new Error('Nama pasien wajib diisi!');
      const dokter = ((document.getElementById('crDokter') || {}).value || 'Dokter').trim();
      const umur = ((document.getElementById('crUmur') || {}).value || '-').trim();
      const noResep = ((document.getElementById('crNoResep') || {}).value || '').trim();
      const syncCart = !!(document.getElementById('crSyncCartChk') || {}).checked;

      const copyItems = cart.items.map((it, idx) => {
        const qResep = Math.max(1, Number((document.getElementById('crQtyResep_' + idx) || {}).value || it.qty || 1));
        const qAmbil = Math.min(qResep, Math.max(0, Number((document.getElementById('crQtyAmbil_' + idx) || {}).value || 0)));
        const qSisa = Math.max(0, qResep - qAmbil);
        const flag = qAmbil === 0 ? 'nedet' : (qSisa === 0 ? 'det orig' : ('det ' + qAmbil + ' (sisa ' + qSisa + ')'));
        if (syncCart) {
          it.qty = qAmbil > 0 ? qAmbil : it.qty;
        }
        return {
          id_obat: it.id_obat,
          nama_dagang: it.nama_dagang,
          satuan: it.satuan || 'Tab',
          qty_resep: qResep,
          qty_ambil: qAmbil,
          qty_sisa: qSisa,
          signa: it.aturan_pakai || 'Sesuai aturan pakai',
          flag
        };
      });
      if (syncCart) {
        cart.pelanggan_nama = namaPasien;
      }
      const res = await API().callApi('resep.copySave', {
        cabang_id: st.cabangId,
        no_resep_asal: noResep,
        nama_dokter: dokter,
        id_member: cart.id_member || 'UMUM',
        nama_pasien: namaPasien,
        umur_pasien: umur,
        items: copyItems,
        status_serah: copyItems.every((i) => i.qty_sisa === 0) ? 'DET_ORIG' : 'DET_SEBAGIAN'
      }, { isWrite: true });

      S().closeModal();
      global.toast('Salinan Resep (p.c.c) ' + res.item.no_salinan + ' tersimpan!', 'ok');
      await global.bootLoadState(true);
      global.printCopyResepDocument(res.item);
    } catch (e) { global.toast(e.message, 'err'); }
  };

  global.printCopyResepDocument = (crObj) => {
    if (!crObj) return;
    const prof = S().getStoreProfile ? S().getStoreProfile() : {};
    let items = [];
    try { items = typeof crObj.items_json === 'string' ? JSON.parse(crObj.items_json) : (crObj.items_json || []); } catch (e) {}
    const rowsHtml = items.map((it, idx) => `
      <div style="border-bottom:1px dashed #94A3B8;padding:8px 0;">
        <div style="display:flex;justify-content:space-between;font-weight:700;">
          <span>R/ ${idx + 1}. ${S().esc(it.nama_dagang)}</span>
          <span>No. ${it.qty_resep} (${S().esc(it.flag || ('det ' + it.qty_ambil))})</span>
        </div>
        <div style="font-size:12px;margin-top:2px;">S. ${S().esc(it.signa || '-')}</div>
      </div>`).join('');
    const html = `<div style="max-width:620px;margin:0 auto;font-family:Arial,sans-serif;color:#0F172A;padding:18px;border:2px solid #0F172A;">
      <div style="text-align:center;border-bottom:2px solid #0F172A;padding-bottom:10px;margin-bottom:12px;">
        <div style="font-size:16px;font-weight:800;">${S().esc((prof.nama_usaha || 'APOTEK ONS FARMA').toUpperCase())}</div>
        <div style="font-size:11px;">${S().esc(prof.alamat_usaha || '')} ${S().esc(prof.kota || '')} &bull; SIA: ${S().esc(prof.no_sia || '-')}</div>
        <div style="font-size:11px;">Apoteker: ${S().esc(crObj.apoteker_nama || prof.nama_pemilik || '-')} &bull; SIPA: ${S().esc(crObj.no_sipa || prof.sipa_pemilik || '-')}</div>
      </div>
      <div style="text-align:center;font-weight:800;font-size:14px;text-decoration:underline;margin-bottom:12px;">SALINAN RESEP (APOGRAPH)</div>
      <table style="width:100%;font-size:12px;margin-bottom:10px;">
        <tr><td><b>No. Salinan</b>: ${S().esc(crObj.no_salinan)}</td><td><b>Tanggal</b>: ${S().esc(crObj.tanggal)}</td></tr>
        <tr><td><b>Dari Dokter</b>: ${S().esc(crObj.nama_dokter)}</td><td><b>No. R/ Asal</b>: ${S().esc(crObj.no_resep_asal)}</td></tr>
        <tr><td><b>Untuk Pasien</b>: ${S().esc(crObj.nama_pasien)}</td><td><b>Umur</b>: ${S().esc(crObj.umur_pasien || '-')}</td></tr>
      </table>
      ${rowsHtml}
      <div style="margin-top:18px;display:flex;justify-content:space-between;align-items:flex-end;font-size:12px;">
        <div><b>p.c.c</b> (<i>Pro Copia Conform</i>)<br/><span style="font-size:11px;color:#475569;">Sesuai dengan resep asli (PMK 73/2016)</span></div>
        <div style="text-align:center;">
          <div>${S().esc(prof.kota || 'Makassar')}, ${S().esc(crObj.tanggal)}</div>
          <div style="height:36px;"></div>
          <div style="font-weight:700;text-decoration:underline;">${S().esc(crObj.apoteker_nama || prof.nama_pemilik)}</div>
          <div style="font-size:11px;">SIPA: ${S().esc(crObj.no_sipa || prof.sipa_pemilik)}</div>
        </div>
      </div>
    </div>`;
    S().printHtmlZone(html);
  };

  /**
   * Modal Kirim Rekap Malam Pemilik ke WhatsApp (100% Gratis via wa.me)
   */
  global.openOwnerDailyDigestModal = () => {
    const prof = S().getStoreProfile ? S().getStoreProfile() : {};
    const defaultWa = prof.wa_pemilik || prof.wa_usaha || '';
    const msg = S().buildOwnerDailyDigestText ? S().buildOwnerDailyDigestText() : '';
    const waHref = S().buildWaUrl ? S().buildWaUrl(defaultWa, msg) : ('https://wa.me/?text=' + encodeURIComponent(msg));
    global._lastOwnerDigestMsg = msg;
    S().openModal(`<div class="p-6 space-y-3 text-xs">
      <div class="flex justify-between items-center">
        <h3 class="font-bold text-base">Rekap Malam Harian ke WhatsApp Pemilik (100% Gratis)</h3>
        <button onclick="ONSStore.closeModal()" class="text-xl">&times;</button>
      </div>
      <p style="color:var(--ons-text-soft)">Kirim ringkasan omzet, estimasi laba kotor, breakdown metode bayar, piutang terbuka, defecta, &amp; Near-ED langsung lewat WhatsApp tanpa biaya gateway bulanan.</p>
      <div>
        <label class="font-semibold block mb-1">Nomor WA Pemilik Tujuan</label>
        <input id="ownerDigestWaInp" type="tel" class="ons-input font-mono-num" value="${S().esc(defaultWa)}" oninput="window.syncOwnerDigestHref(this.value)" placeholder="0811xxxx / 62811xxxx"/>
      </div>
      <pre class="p-3 rounded-xl border font-mono-num whitespace-pre-wrap text-[11px] max-h-60 overflow-auto" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">${S().esc(msg)}</pre>
      <div class="flex flex-wrap gap-2">
        <button type="button" onclick="window.copyOwnerDigestNow()" class="ons-btn ons-btn-ghost flex-1 text-xs">Salin Teks Laporan</button>
        <a id="ownerDigestWaBtn" target="_blank" rel="noopener" href="${S().esc(waHref)}" class="ons-btn ons-btn-emerald flex-1 text-xs font-bold">Kirim Sekarang via WhatsApp &rarr;</a>
      </div>
    </div>`, '560px');
  };

  global.syncOwnerDigestHref = (rawPhone) => {
    const btn = document.getElementById('ownerDigestWaBtn');
    if (btn && S().buildWaUrl) {
      btn.href = S().buildWaUrl(rawPhone, global._lastOwnerDigestMsg || '');
    }
  };
  global.copyOwnerDigestNow = () => {
    const txt = global._lastOwnerDigestMsg || '';
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).catch(() => {});
    }
    global.toast('Teks Rekap Malam Harian berhasil disalin ke clipboard!', 'ok');
  };

  global.ONSViewsAuthDashPos = { renderPublicStandaloneIfApplicable, renderLoginView, renderDashboardView, renderPosView };
})(window);
