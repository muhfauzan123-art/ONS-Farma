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
            <div><label class="text-xs font-semibold">Nama Dokter Pengirim</label><input id="erxDokter" class="ons-input" placeholder="dr. Andi Pratama, Sp.PD"/></div>
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
      const waConsultInit = S().buildWaUrl ? S().buildWaUrl(prof.wa_usaha || '628110000990', `Halo Apoteker ${usahaNama}, saya ingin konsultasi keluhan & ketersediaan obat.`) : 'https://wa.me/';
      root.innerHTML = `<div class="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        <header class="sticky top-0 z-30 border-b backdrop-blur bg-white/95 dark:bg-slate-900/95 px-4 py-3" style="border-color:var(--ons-border)">
          <div class="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-2.5 min-w-0">
              <img id="pubKatLogo" src="${S().esc(usahaLogo)}" alt="${S().esc(usahaNama)}" class="w-10 h-10 rounded-xl object-cover bg-white border shrink-0"/>
              <div class="min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <h1 id="pubKatTitle" class="font-extrabold text-base leading-tight truncate">E-Apotek Publik ${S().esc(shortUsaha)}</h1>
                  <span id="pubKatOpenBadge" class="badge-bpom bpom-bebas">ONLINE OPEN</span>
                </div>
                <div id="pubKatSub" class="text-[11px] truncate" style="color:var(--ons-text-soft)">${S().esc(prof.alamat_usaha || 'Pesan Obat Asli BPOM')} &bull; SIA: ${S().esc(prof.no_sia || '-')}</div>
              </div>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <input id="pubKatSearch" oninput="window.filterPublicCatalog(this.value)" class="ons-input w-48 sm:w-56 text-xs" placeholder="Cari obat / vitamin / zat aktif..."/>
              <a id="pubKatConsultWa" target="_blank" rel="noopener" href="${S().esc(waConsultInit)}" class="ons-btn ons-btn-emerald text-xs py-2">Tanya Apoteker (WA)</a>
              <a href="./index.html" class="ons-btn ons-btn-ghost text-xs py-2">Login Staf</a>
            </div>
          </div>
        </header>
        <main class="max-w-6xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div class="lg:col-span-8 space-y-3">
            <div class="ons-card p-4 space-y-2.5" style="background:linear-gradient(125deg,rgba(0,102,254,0.08),rgba(16,185,129,0.08));">
              <div class="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div>
                  <div id="pubKatApjLine" class="font-extrabold text-sm">Layanan Farmasi Digital &bull; ${S().esc(prof.nama_pemilik || 'apt. Anissa Faradifa R. Is Rumi')}</div>
                  <div id="pubKatHoursLine" class="text-[11px]" style="color:var(--ons-text-soft)">SIPA: ${S().esc(prof.sipa_pemilik || '-')} &bull; Jam Operasional: ${S().esc(prof.jam_operasional || 'Senin - Minggu 07.00 - 22.00 WITA')}</div>
                </div>
                <span class="badge-bpom bpom-bebas">100% OBAT ASLI BPOM</span>
              </div>
              <div class="grid grid-cols-3 gap-2 pt-2 border-t text-[11px]" style="border-color:var(--ons-border)">
                <div><b>1. Pilih Obat</b> &amp; cek stok</div>
                <div><b>2. Isi Data</b> Ambil / Kurir</div>
                <div><b>3. Lanjut WA</b> Apotek Gratis</div>
              </div>
            </div>
            <div id="pubKatFilters" class="flex flex-wrap items-center justify-between gap-2">
              <div class="ons-tab-bar">
                <button type="button" onclick="window.setPublicCatalogFilter('SEMUA')" data-pcat="SEMUA" class="ons-tab-btn active">Semua Produk</button>
                <button type="button" onclick="window.setPublicCatalogFilter('BEBAS')" data-pcat="BEBAS" class="ons-tab-btn">Obat Bebas (OTC)</button>
                <button type="button" onclick="window.setPublicCatalogFilter('TERBATAS')" data-pcat="TERBATAS" class="ons-tab-btn">Bebas Terbatas</button>
                <button type="button" onclick="window.setPublicCatalogFilter('KERAS')" data-pcat="KERAS" class="ons-tab-btn">Obat Resep (Keras)</button>
                <button type="button" onclick="window.setPublicCatalogFilter('TERSEDIA')" data-pcat="TERSEDIA" class="ons-tab-btn">Stok Tersedia</button>
              </div>
              <span id="pubKatCountLabel" class="text-xs font-mono-num" style="color:var(--ons-text-soft)">Memuat...</span>
            </div>
            <div id="pubKatGrid" class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">Memuat katalog obat Apotek ONS Farma...</div>
          </div>
          <div class="lg:col-span-4">
            <div class="ons-card p-4 space-y-3 sticky top-20">
              <div class="flex items-center justify-between">
                <h2 class="font-extrabold text-sm">Keranjang E-Apotek</h2>
                <span id="pubCartCountBadge" class="badge-bpom bpom-terbatas">0 Item</span>
              </div>
              <div id="pubCartList" class="space-y-1.5 text-xs max-h-48 overflow-y-auto border-y py-2" style="border-color:var(--ons-border)">Keranjang masih kosong.</div>
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
                <input id="pubNama" class="ons-input" placeholder="Nama Penerima / Pasien *"/>
                <input id="pubWa" type="tel" class="ons-input font-mono-num" placeholder="No. WhatsApp Aktif (08xx) *"/>
                <textarea id="pubAlamat" rows="2" class="ons-textarea" placeholder="Alamat Pengantaran Lengkap / Keterangan Pengambilan">Ambil Langsung di Apotek</textarea>
                <input id="pubCatatan" class="ons-input" placeholder="Catatan / Keluhan / Keterangan Resep untuk Apoteker"/>
                <button onclick="window.submitPublicStoreOrder()" class="ons-btn ons-btn-emerald w-full py-2.5 font-bold">Kirim Pesanan &amp; Lanjut WA Apoteker</button>
              </div>
              <div id="pubOrderSuccessBox" class="hidden p-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-xs space-y-2"></div>
            </div>
          </div>
        </main>
      </div>`;

      global._pubCatalogItems = [];
      global._pubCart = [];
      global._pubKatFilter = 'SEMUA';
      global._pubDeliveryMode = 'AMBIL';
      global._pubApotekMeta = {
        nama: usahaNama,
        alamat: prof.alamat_usaha || '',
        wa_admin: (prof.wa_usaha || '628110000990').replace(/[^0-9]/g, ''),
        nama_pemilik: prof.nama_pemilik || 'apt. Anissa Faradifa R. Is Rumi',
        sipa_pemilik: prof.sipa_pemilik || '',
        no_sia: prof.no_sia || '',
        jam_operasional: prof.jam_operasional || ''
      };

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
          const waTopEl = document.getElementById('pubKatConsultWa');
          if (logoEl && ap.logo_usaha_url) logoEl.src = ap.logo_usaha_url;
          if (titleEl && ap.nama) titleEl.textContent = 'E-Apotek Publik ' + String(ap.nama).replace(/^Apotek\s+/i, '');
          if (subEl && ap.alamat) subEl.textContent = ap.alamat + (ap.no_sia ? ' • SIA: ' + ap.no_sia : '');
          if (apjEl && ap.nama_pemilik) apjEl.textContent = 'Layanan Farmasi Digital • ' + ap.nama_pemilik;
          if (hrsEl) hrsEl.textContent = (ap.sipa_pemilik ? ('SIPA: ' + ap.sipa_pemilik + ' • ') : '') + (ap.jam_operasional || 'Buka Setiap Hari');
          if (waTopEl && S().buildWaUrl) {
            waTopEl.href = S().buildWaUrl(ap.wa_admin || '628110000990', `Halo Apoteker ${ap.nama || usahaNama}, saya ingin konsultasi keluhan & ketersediaan obat.`);
          }
        }
        window.renderPublicCatalogGrid((document.getElementById('pubKatSearch') || {}).value || '');
      }).catch((err) => {
        const g = document.getElementById('pubKatGrid');
        if (g) g.innerHTML = `<div class="ons-card p-4 text-red-600">${S().esc(err.message)}</div>`;
      });

      window.setPublicCatalogFilter = (cat) => {
        global._pubKatFilter = cat || 'SEMUA';
        document.querySelectorAll('#pubKatFilters [data-pcat]').forEach((btn) => {
          btn.classList.toggle('active', btn.getAttribute('data-pcat') === global._pubKatFilter);
        });
        window.renderPublicCatalogGrid((document.getElementById('pubKatSearch') || {}).value || '');
      };
      window.setPublicDeliveryMode = (mode) => {
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
        window.renderPublicCartUi();
      };
      window.filterPublicCatalog = (q) => window.renderPublicCatalogGrid(q);
      window.renderPublicCatalogGrid = (qRaw) => {
        const q = String(qRaw || '').toLowerCase();
        const cat = global._pubKatFilter || 'SEMUA';
        const items = global._pubCatalogItems.filter((o) => {
          if (q && !`${o.nama_dagang} ${o.zat_aktif} ${o.bentuk_sediaan || ''}`.toLowerCase().includes(q)) return false;
          const gol = String(o.golongan_bpom || '').toUpperCase();
          if (cat === 'TERSEDIA' && Number(o.stok_tersedia || 0) <= 0) return false;
          if ((cat === 'BEBAS' || cat === 'TERBATAS' || cat === 'KERAS') && !gol.includes(cat)) return false;
          return true;
        });
        const cntEl = document.getElementById('pubKatCountLabel');
        if (cntEl) cntEl.textContent = items.length + ' produk ditemukan';
        const g = document.getElementById('pubKatGrid');
        if (!g) return;
        const ap = global._pubApotekMeta || {};
        g.innerHTML = items.length ? items.map((o) => {
          const askWa = S().buildWaUrl ? S().buildWaUrl(ap.wa_admin || '628110000990', `Halo Apoteker ${ap.nama || usahaNama}, saya mau tanya ketersediaan / dosis obat: ${o.nama_dagang} (${o.zat_aktif}).`) : 'https://wa.me/';
          return `
          <div class="ons-product-card flex flex-col justify-between gap-2.5">
            <div>
              <div class="flex justify-between gap-2 items-start">
                <span class="font-bold text-sm leading-snug">${S().esc(o.nama_dagang)}</span>
                ${S().bpomBadge(o.golongan_bpom)}
              </div>
              <div class="text-[11px] mt-1" style="color:var(--ons-text-soft)">${S().esc(o.zat_aktif)} &bull; ${S().esc(o.bentuk_sediaan)} ${o.kekuatan ? ('(' + S().esc(o.kekuatan) + ')') : ''}</div>
              ${String(o.golongan_bpom).toUpperCase() === 'KERAS' ? '<div class="text-[10px] text-amber-600 font-semibold mt-1">Obat Keras — Wajib verifikasi resep dokter oleh APJ</div>' : ''}
            </div>
            <div class="flex items-center justify-between pt-2 border-t gap-2" style="border-color:var(--ons-border)">
              <div>
                <div class="font-mono-num font-extrabold text-sm text-blue-600">${S().rp(o.harga_umum)} <span class="text-[10px] font-normal">/ ${S().esc(o.satuan_dasar)}</span></div>
                <div class="text-[10px] font-semibold ${o.stok_tersedia > 0 ? 'text-emerald-600' : 'text-red-600'}">${o.stok_tersedia > 0 ? 'Stok Tersedia (' + o.stok_tersedia + ')' : 'Stok Kosong'}</div>
              </div>
              <div class="flex items-center gap-1">
                <a target="_blank" rel="noopener" href="${S().esc(askWa)}" class="ons-btn ons-btn-ghost text-[11px] py-1.5 px-2" title="Tanya Apoteker via WhatsApp">Tanya</a>
                <button onclick="window.addToPublicCart('${S().esc(o.id_obat)}')" ${o.stok_tersedia <= 0 ? 'disabled' : ''} class="ons-btn ons-btn-primary text-xs py-1.5 px-3">+ Keranjang</button>
              </div>
            </div>
          </div>`;
        }).join('') : '<div class="col-span-2 text-center py-8 opacity-70">Produk tidak ditemukan.</div>';
      };

      window.addToPublicCart = (idObat) => {
        const ob = global._pubCatalogItems.find((x) => x.id_obat === idObat);
        if (!ob) return;
        const ex = global._pubCart.find((c) => c.id_obat === idObat);
        if (ex) ex.qty++;
        else global._pubCart.push({ id_obat: ob.id_obat, nama: ob.nama_dagang, satuan: ob.satuan_dasar, harga: Number(ob.harga_umum || 0), qty: 1 });
        window.renderPublicCartUi();
      };
      window.stepPublicCartQty = (idx, delta) => {
        const c = global._pubCart[idx];
        if (!c) return;
        c.qty += delta;
        if (c.qty <= 0) global._pubCart.splice(idx, 1);
        window.renderPublicCartUi();
      };
      window.renderPublicCartUi = () => {
        const list = document.getElementById('pubCartList');
        const subEl = document.getElementById('pubCartSub');
        const ongEl = document.getElementById('pubCartOngkir');
        const totEl = document.getElementById('pubCartTotal');
        const cntEl = document.getElementById('pubCartCountBadge');
        if (!list || !totEl) return;
        const subTotal = global._pubCart.reduce((s, c) => s + c.harga * c.qty, 0);
        const ongkir = global._pubCart.length && global._pubDeliveryMode === 'KURIR' ? 10000 : 0;
        const itemCount = global._pubCart.reduce((s, c) => s + Number(c.qty || 0), 0);
        if (cntEl) cntEl.textContent = itemCount + ' Item';
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
            </div>
          </div>`).join('') : 'Keranjang masih kosong. Klik "+ Keranjang" pada produk obat.';
        if (subEl) subEl.textContent = S().rp(subTotal);
        if (ongEl) ongEl.textContent = S().rp(ongkir);
        totEl.textContent = S().rp(subTotal + ongkir);
      };
      window.submitPublicStoreOrder = async () => {
        const nama = (document.getElementById('pubNama').value || '').trim();
        const wa = (document.getElementById('pubWa').value || '').trim();
        const alamatRaw = (document.getElementById('pubAlamat').value || '').trim();
        const catatanRaw = (document.getElementById('pubCatatan').value || '').trim();
        if (!nama || !wa) { global.toast('Nama & nomor WhatsApp wajib diisi.', 'warn'); return; }
        if (!global._pubCart.length) { global.toast('Pilih minimal 1 obat ke keranjang terlebih dahulu.', 'warn'); return; }
        const cartSnapshot = global._pubCart.slice();
        const totalEst = cartSnapshot.reduce((s, c) => s + c.harga * c.qty, 0);
        const ongkir = global._pubDeliveryMode === 'KURIR' && !alamatRaw.toLowerCase().includes('ambil') ? 10000 : 0;
        try {
          const res = await API().callApi('public.submitOrder', {
            nama_pelanggan: nama, no_wa: wa,
            alamat: alamatRaw || (global._pubDeliveryMode === 'AMBIL' ? 'Ambil di Apotek' : '-'),
            catatan: catatanRaw,
            total_estimasi: totalEst,
            ongkir: ongkir,
            items_json: JSON.stringify(cartSnapshot)
          }, { isWrite: true, token: '' });
          const ap = global._pubApotekMeta || {};
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
            catatanRaw ? `Catatan: ${catatanRaw}` : ''
          ].filter(Boolean).join('\n');
          const waOrderUrl = S().buildWaUrl ? S().buildWaUrl(ap.wa_admin || prof.wa_usaha || '628110000990', waSummary) : 'https://wa.me/';
          const box = document.getElementById('pubOrderSuccessBox');
          if (box) {
            box.classList.remove('hidden');
            box.innerHTML = `<div class="font-bold text-emerald-700 dark:text-emerald-300">&#9989; Order ${S().esc(res.no_order)} Diterima!</div>
              <div>Tim Farmasi ${S().esc(ap.nama || usahaNama)} siap memproses. Estimasi Total: <b>${S().rp(totalEst + ongkir)}</b></div>
              <a target="_blank" rel="noopener" href="${S().esc(waOrderUrl)}" class="ons-btn ons-btn-emerald w-full py-2 font-bold text-center">Kirim Rincian ke WhatsApp Apotek (Gratis)</a>`;
          }
          global._pubCart = [];
          window.renderPublicCartUi();
        } catch (e) { global.toast(e.message, 'err'); }
      };
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
   * W-01: Halaman Autentikasi & Multi-Branch Switcher
   */
  function renderLoginView(root) {
    const demoMode = API().isDemoMode();
    const prof = S().getStoreProfile ? S().getStoreProfile() : {};
    const usahaLogo = prof.logo_usaha_url || './icons/ons-farma-app-icon.png';
    const usahaNama = prof.nama_usaha || 'APOTEK ONS FARMA';
    const pemilikNama = prof.nama_pemilik || 'apt. Anissa Faradifa R. Is Rumi';
    root.innerHTML = `<div class="min-h-screen flex items-center justify-center p-4" style="background:radial-gradient(circle at top right,#0050CA22,transparent 50%),linear-gradient(155deg,#09202A 0%,#0F172A 100%);">
      <div class="ons-card max-w-4xl w-full grid grid-cols-1 md:grid-cols-12 overflow-hidden shadow-2xl border-slate-700/40">
        <div class="md:col-span-5 p-7 text-white flex flex-col justify-between" style="background:linear-gradient(175deg,#09202A 0%,#06171F 100%);">
          <div>
            <div class="flex items-center gap-3 mb-5">
              <img src="${S().esc(usahaLogo)}" alt="Logo" class="w-12 h-12 rounded-xl border border-white/15 object-cover bg-white"/>
              <div>
                <div class="font-bold text-lg tracking-tight">${S().esc(usahaNama.toUpperCase())}</div>
                <div class="text-xs text-sky-300 font-semibold">${S().esc(pemilikNama)}</div>
              </div>
            </div>
            <h2 class="text-xl font-bold leading-snug mb-3">Sistem Terpadu POS, FEFO Gudang, Layanan Klinis &amp; Keuangan</h2>
            <p class="text-xs text-slate-300 leading-relaxed">Arsitektur Terpisah GitHub Pages PWA + Google Apps Script REST API + Perlindungan HMAC-SHA256.</p>
            <div class="mt-3 text-[11px] text-slate-400">SIA: ${S().esc(prof.no_sia || '-')} &bull; ${S().esc(prof.kota || 'Makassar')}</div>
          </div>
          <div class="mt-6 space-y-2 text-xs">
            <div class="p-3 rounded-lg bg-white/5 border border-white/10">
              <div class="font-semibold text-emerald-300 mb-1">Status Koneksi Backend:</div>
              <div>${demoMode ? '&#9889; Mode Sandbox Lokal Interaktif (Siap Uji Coba Instan)' : '&#127760; Mode Live Google Apps Script (/exec)'}</div>
            </div>
            <div class="flex gap-2">
              <button onclick="window.switchBackendMode('DEMO')" class="ons-btn ons-btn-ghost flex-1 text-xs py-1.5" style="background:rgba(255,255,255,0.08);color:#fff;border-color:rgba(255,255,255,0.2);">Mode Demo</button>
              <button onclick="window.switchBackendMode('LIVE')" class="ons-btn ons-btn-ghost flex-1 text-xs py-1.5" style="background:rgba(255,255,255,0.08);color:#fff;border-color:rgba(255,255,255,0.2);">Mode Live GAS</button>
            </div>
          </div>
        </div>
        <div class="md:col-span-7 p-7 space-y-5">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-xl font-bold">Masuk ke Ruang Kerja Apotek</h1>
              <p class="text-xs" style="color:var(--ons-text-soft)">Pilih cabang, shift kerja, dan kredensial peran Anda.</p>
            </div>
            <button onclick="ONSStore.toggleDarkMode();renderApp();" class="ons-btn ons-btn-ghost text-xs px-3">${S().AppState.darkMode ? '&#9728;&#65039; Terang' : '&#127769; Malam'}</button>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="text-xs font-semibold block mb-1">Cabang Apotek</label>
              <select id="loginBranch" class="ons-select">
                <option value="ONS-01">ONS-01 — Pusat Utama (SIA Aktif)</option>
                <option value="ONS-02">ONS-02 — Cabang Klinik Mitra</option>
                <option value="ONS-03">ONS-03 — Gudang &amp; Distribusi</option>
              </select>
            </div>
            <div>
              <label class="text-xs font-semibold block mb-1">Shift Operasional</label>
              <select id="loginShift" class="ons-select">
                <option value="PAGI">Shift Pagi (07:30 - 14:30)</option>
                <option value="SIANG">Shift Siang (14:00 - 21:30)</option>
                <option value="MALAM">Shift Malam 24J</option>
              </select>
            </div>
          </div>

          <form onsubmit="event.preventDefault();window.handleLoginSubmit();" class="space-y-3">
            <div>
              <label class="text-xs font-semibold block mb-1">Username</label>
              <input id="loginUser" class="ons-input" placeholder="pemilik / apj / kasir" value="pemilik" required/>
            </div>
            <div>
              <label class="text-xs font-semibold block mb-1">Kata Sandi</label>
              <input id="loginPass" type="password" class="ons-input" placeholder="Masukkan kata sandi" value="OnsFarma#2026" required/>
            </div>
            <button id="loginSubmitBtn" type="submit" class="ons-btn ons-btn-primary w-full py-2.5 text-sm">Masuk &amp; Muat Sistem (Scale Turbo)</button>
          </form>

          <div class="pt-3 border-t" style="border-color:var(--ons-border)">
            <div class="text-xs font-semibold mb-2" style="color:var(--ons-text-soft)">Pintasan Masuk Cepat Uji RBAC (PIN Otorisasi Default: <code class="font-mono-num">123456</code>):</div>
            <div class="grid grid-cols-3 gap-2">
              <button type="button" onclick="window.quickRoleLogin('pemilik')" class="ons-btn ons-btn-ghost text-xs flex-col py-2 h-auto">
                <span class="font-bold text-blue-600">Pemilik</span><span class="text-[10px]">Akses Penuh</span>
              </button>
              <button type="button" onclick="window.quickRoleLogin('apj')" class="ons-btn ons-btn-ghost text-xs flex-col py-2 h-auto">
                <span class="font-bold text-emerald-600">APJ Apoteker</span><span class="text-[10px]">Klinis &amp; BPOM</span>
              </button>
              <button type="button" onclick="window.quickRoleLogin('kasir')" class="ons-btn ons-btn-ghost text-xs flex-col py-2 h-auto">
                <span class="font-bold text-amber-600">Kasir POS</span><span class="text-[10px]">HPP Terkunci</span>
              </button>
            </div>
          </div>

          <div class="flex flex-wrap gap-3 text-xs pt-1" style="color:var(--ons-text-soft)">
            <a href="./index.html?erx=DOKTER-MITRA-01" class="underline hover:text-blue-600">Buka Mini-Portal E-Resep Dokter</a>
            <span>&bull;</span>
            <button type="button" onclick="window.openManualVerifyPrompt()" class="underline hover:text-blue-600">Verifikasi QR Kwitansi / Surat</button>
          </div>
        </div>
      </div>
    </div>`;
  }

  global.switchBackendMode = (mode) => {
    API().setModeOverride(mode);
    global.toast('Mode koneksi diubah ke: ' + mode, 'info');
    global.renderApp();
  };

  global.openManualVerifyPrompt = () => {
    S().openModal(`<div class="p-6 space-y-4">
      <h3 class="font-bold text-lg">Verifikasi Publik Dokumen &amp; Kwitansi</h3>
      <div class="space-y-3">
        <div><label class="text-xs font-semibold">Kode Verifikasi Surat (20 Karakter)</label><input id="manDocKode" class="ons-input font-mono-num" value="ONS9F42A18D77B0C41E2"/></div>
        <button onclick="window.location.hash='#doc='+encodeURIComponent(document.getElementById('manDocKode').value);ONSStore.closeModal();renderApp();" class="ons-btn ons-btn-primary w-full">Verifikasi Dokumen Resmi</button>
      </div>
    </div>`, '440px');
  };

  global.quickRoleLogin = (username) => {
    const u = document.getElementById('loginUser');
    const p = document.getElementById('loginPass');
    if (u) u.value = username;
    if (p) p.value = 'OnsFarma#2026';
    global.handleLoginSubmit();
  };

  global.handleLoginSubmit = async () => {
    const username = document.getElementById('loginUser').value.trim();
    const password = document.getElementById('loginPass').value;
    const branch = document.getElementById('loginBranch').value;
    const shift = document.getElementById('loginShift').value;
    try {
      const res = await API().callApi('auth.login', { username, password, cabang_id: branch, include_boot: true }, { isWrite: true, token: '' });
      API().setSession({ token: res.token, user: res.user, cabang_id: branch, shift });
      S().AppState.user = res.user;
      S().AppState.cabangId = branch;
      if (shift === 'MALAM') S().toggleDarkMode(true);
      S().AppState.activeView = 'dashboard';
      if (res.boot && typeof global.applyBootPayload === 'function') {
        global.applyBootPayload(res.boot);
        S().AppState.booted = true;
        global.renderApp();
      } else {
        await global.bootLoadState(true);
      }
      global.toast('Selamat datang, ' + res.user.nama_lengkap, 'ok');
    } catch (e) {
      global.toast(e.message, 'err');
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

  function renderDashboardView() {
    const st = S().AppState;
    const seeCost = S().canSeeFinancialCost();
    const prof = S().getStoreProfile ? S().getStoreProfile() : {};
    const usahaLogo = prof.logo_usaha_url || './icons/ons-farma-app-icon.png';
    const usahaNama = prof.nama_usaha || 'Apotek ONS Farma';
    const pemilikNama = prof.nama_pemilik || 'apt. Anissa Faradifa R. Is Rumi';

    const todayIso = new Date().toISOString().slice(0, 10);
    const validSales = (st.penjualan || []).filter((p) => String(p.status_trx || '') !== 'RETUR');
    const omzetHari = validSales.reduce((s, p) => s + Number(p.grand_total || 0), 0);
    const marginHari = seeCost ? validSales.reduce((s, p) => s + Number(p.estimasi_margin || 0), 0) : null;
    const nearEdBatches = st.stokBatch.filter((b) => b.status_batch === 'AKTIF' && b.qty_sisa > 0 && S().daysUntil(b.tgl_kadaluarsa) <= 90);
    const defectaCount = st.masterObat.filter((o) => S().getTotalStok(o.id_obat) <= Number(o.stok_min || 10)).length;
    const apTotal = seeCost ? st.fakturPbf.reduce((s, f) => s + Number(f.sisa_hutang || 0), 0) : null;
    const latestTemp = st.coldChain.length ? st.coldChain[st.coldChain.length - 1] : null;
    const coldOk = !latestTemp || (latestTemp.suhu_celcius >= 2 && latestTemp.suhu_celcius <= 8);
    const erxAntre = (st.rekamKlinis || []).filter((r) => String(r.status_klinis || '').includes('MENUNGGU')).length;
    const omniBaru = (st.omnichannelOrders || []).filter((o) => o.status_order === 'BARU').length;
    const billPending = (st.billingPending || []).length;
    const prbUrgentCount = (st.members || []).filter((m) => m.tgl_habis_obat && S().daysUntil(m.tgl_habis_obat) <= 5).length;

    // Readiness Compliance Score (Audit, Cold-Chain, ED, Defecta)
    const readiness = Math.max(55, Math.min(100, 100 - nearEdBatches.length * 4 - defectaCount * 3 - (coldOk ? 0 : 15)));
    const dashArray = Math.round((readiness / 100) * 251.2);

    // Agregasi Penjualan Nyata 7 Hari Terakhir dari AppState.penjualan
    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const days = [];
    const omzSeries = [];
    const labaSeries = [];
    for (let offset = 6; offset >= 0; offset--) {
      const dt = new Date();
      dt.setDate(dt.getDate() - offset);
      const iso = dt.toISOString().slice(0, 10);
      days.push(offset === 0 ? 'Hari Ini' : dayNames[dt.getDay()]);
      const daySales = validSales.filter((p) => String(p.tanggal || '').slice(0, 10) === iso);
      const sumOmz = daySales.reduce((acc, p) => acc + Number(p.grand_total || 0), 0);
      const sumLaba = seeCost ? daySales.reduce((acc, p) => acc + Number(p.estimasi_margin || 0), 0) : 0;
      omzSeries.push(sumOmz);
      labaSeries.push(sumLaba);
    }
    const maxVal = Math.max(...omzSeries, 100000);
    const total7Hari = omzSeries.reduce((a, b) => a + b, 0);

    // Distribusi Channel Apotek Digital (Kasir Toko vs E-Apotek / WA / Marketplace)
    const chTotals = {};
    validSales.forEach((p) => {
      const ch = String(p.channel || 'Toko Fisik');
      chTotals[ch] = (chTotals[ch] || 0) + Number(p.grand_total || 0);
    });
    const channelRows = Object.keys(chTotals).map((k) => ({ name: k, total: chTotals[k] })).sort((a, b) => b.total - a.total);
    const chDenom = channelRows.reduce((s, r) => s + r.total, 0) || 1;

    // Top-5 Obat Terlaris dari AppState.detailPenjualan
    const soldMap = {};
    (st.detailPenjualan || []).forEach((d) => {
      const key = d.id_obat || d.nama_dagang;
      if (!key) return;
      if (!soldMap[key]) {
        const ob = st.masterObat.find((o) => o.id_obat === d.id_obat);
        soldMap[key] = { nama: d.nama_dagang || (ob && ob.nama_dagang) || key, qty: 0, omz: 0 };
      }
      soldMap[key].qty += Number(d.qty || 1);
      soldMap[key].omz += Number(d.subtotal_item || (Number(d.qty || 1) * Number(d.harga_jual || 0)));
    });
    const topObatList = Object.values(soldMap).sort((a, b) => b.qty - a.qty).slice(0, 5);

    return `<div class="space-y-5 ons-view-enter">
      <!-- Header Eksekutif Apotek Digital -->
      <div class="ons-card p-4 flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-3 min-w-0">
          <img src="${S().esc(usahaLogo)}" alt="${S().esc(usahaNama)}" class="w-12 h-12 rounded-xl border object-cover bg-white shrink-0"/>
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <h1 class="text-lg sm:text-xl font-extrabold truncate">Pusat Komando ${S().esc(usahaNama)}</h1>
              <span class="badge-bpom bpom-bebas">APOTEK DIGITAL</span>
            </div>
            <p class="text-xs truncate" style="color:var(--ons-text-soft)">Pemilik/APJ: <b>${S().esc(pemilikNama)}</b> &bull; Cabang <b>${S().esc(st.cabangId)}</b> &bull; Peran: <b>${S().esc(S().getRole())}</b></p>
          </div>
        </div>
        <div class="flex flex-wrap gap-2">
          <button onclick="navigateView('pos','kasir')" class="ons-btn ons-btn-primary text-xs">Buka Kasir POS (F2)</button>
          <button onclick="navigateView('omnichannel')" class="ons-btn ons-btn-ghost text-xs">Order Online (${omniBaru})</button>
          <button onclick="window.copyPublicApotekLink()" class="ons-btn ons-btn-ghost text-xs">Salin Link E-Apotek</button>
          <a href="?katalog=1" target="_blank" rel="noopener" class="ons-btn ons-btn-emerald text-xs">Lihat Etalase Publik</a>
          ${seeCost ? `<button onclick="navigateView('billing','tagihan')" class="ons-btn ons-btn-ghost text-xs">Tagihan</button>` : ''}
          <button onclick="bootLoadState(true)" class="ons-btn ons-btn-ghost text-xs">Segarkan</button>
        </div>
      </div>

      ${st.masterObat.length === 0 ? `<div class="ons-card p-4 border-l-4 flex flex-wrap items-center justify-between gap-3" style="border-left-color:#0066FE;background:rgba(0,102,254,0.07)">
        <div>
          <div class="font-bold text-sm">Katalog Obat Masih Kosong (Mode Live Baru Terhubung)</div>
          <p class="text-xs" style="color:var(--ons-text-soft)">Klik tombol di kanan untuk mengisi otomatis 6 obat standar BPOM/KFA, stok batch FEFO, PBF, member PRB &amp; suhu chiller ke Google Sheets, atau import dari Excel (.xlsx).</p>
        </div>
        <div class="flex flex-wrap gap-2">
          ${seeCost ? `<button onclick="window.seedStarterCatalogNow()" class="ons-btn ons-btn-primary text-xs">Isi Katalog Awal (1 Klik)</button>` : ''}
          <button onclick="navigateView('${seeCost ? 'obat' : 'pos'}')" class="ons-btn ons-btn-ghost text-xs">Kelola Katalog / Import Excel</button>
        </div>
      </div>` : ''}

      <!-- 5 Kartu KPI Utama (Deep-Linked ke Sub-Menu) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div class="ons-card p-4 cursor-pointer hover:border-blue-500 transition" onclick="navigateView('pos','riwayat')">
          <div class="text-xs font-semibold" style="color:var(--ons-text-soft)">Omzet Tercatat</div>
          <div class="text-xl font-bold font-mono-num mt-1 text-blue-600">${S().rp(omzetHari)}</div>
          <div class="text-[11px] mt-1 text-emerald-600 font-semibold">${validSales.length} nota lunas &rarr; Riwayat</div>
        </div>
        <div class="ons-card p-4 cursor-pointer hover:border-emerald-500 transition" onclick="navigateView('${seeCost ? 'finance' : 'pos'}','${seeCost ? 'pnl' : 'kasir'}')">
          <div class="text-xs font-semibold" style="color:var(--ons-text-soft)">${seeCost ? 'Estimasi Laba Kotor' : 'Poin Member Aktif'}</div>
          <div class="text-xl font-bold font-mono-num mt-1 text-emerald-600">${seeCost ? S().rp(marginHari) : (validSales.reduce((a, b) => a + Number(b.poin_didapat || 0), 0) + ' Poin')}</div>
          <div class="text-[11px] mt-1" style="color:var(--ons-text-soft)">${seeCost ? 'Lihat Laba Rugi P&L &rarr;' : 'Data HPP disembunyikan (Kasir)'}</div>
        </div>
        <div class="ons-card p-4 cursor-pointer hover:border-red-500 transition" onclick="navigateView('gudang','batch')">
          <div class="text-xs font-semibold" style="color:var(--ons-text-soft)">Radar ED &le; 90 Hari</div>
          <div class="text-xl font-bold font-mono-num mt-1 ${nearEdBatches.length ? 'text-red-600' : 'text-emerald-600'}">${nearEdBatches.length} Batch</div>
          <div class="text-[11px] mt-1" style="color:var(--ons-text-soft)">Buka Gudang Batch FEFO &rarr;</div>
        </div>
        <div class="ons-card p-4 cursor-pointer hover:border-emerald-500 transition" onclick="navigateView('gudang','coldchain')">
          <div class="text-xs font-semibold" style="color:var(--ons-text-soft)">Chiller Cold-Chain (2-8&deg;C)</div>
          <div class="text-xl font-bold font-mono-num mt-1 ${coldOk ? 'text-emerald-600' : 'text-red-600'}">${latestTemp ? latestTemp.suhu_celcius + ' °C' : '4.8 °C'}</div>
          <div class="text-[11px] mt-1 font-semibold ${coldOk ? 'text-emerald-600' : 'text-red-600'}">${coldOk ? 'NORMAL &bull; Catat Suhu &rarr;' : 'ALARM RENTANG! Cek Chiller &rarr;'}</div>
        </div>
        <div class="ons-card p-4 cursor-pointer hover:border-amber-500 transition" onclick="navigateView('${seeCost ? 'finance' : 'tutup-shift'}','${seeCost ? 'hutang' : ''}')">
          <div class="text-xs font-semibold" style="color:var(--ons-text-soft)">${seeCost ? 'Tagihan PBF Berjalan' : 'Tutup Shift Kasir'}</div>
          <div class="text-xl font-bold font-mono-num mt-1 text-amber-600">${seeCost ? S().rp(apTotal) : 'Siap Hitung'}</div>
          <div class="text-[11px] mt-1" style="color:var(--ons-text-soft)">${seeCost ? st.fakturPbf.length + ' faktur PBF &rarr;' : 'Hitung denominasi kas'}</div>
        </div>
      </div>

      <!-- Baris Tengah: Compliance Gauge + Grafik Omzet 7 Hari + Antrean Kritis -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div class="ons-card p-5 lg:col-span-4 flex flex-col items-center justify-between">
          <div class="w-full flex items-center justify-between mb-2">
            <h3 class="font-bold text-sm">Skor Kesiapan &amp; Kepatuhan BPOM</h3>
            <span class="badge-bpom bpom-bebas">AUDIT SIAP</span>
          </div>
          <svg viewBox="0 0 120 120" class="w-36 h-36 my-2">
            <circle cx="60" cy="60" r="40" fill="none" stroke="var(--ons-border)" stroke-width="11"/>
            <circle cx="60" cy="60" r="40" fill="none" stroke="#10B981" stroke-width="11" stroke-linecap="round"
              stroke-dasharray="${dashArray} 251.2" transform="rotate(-90 60 60)"/>
            <text x="60" y="57" text-anchor="middle" font-size="22" font-weight="800" fill="currentColor">${readiness}%</text>
            <text x="60" y="74" text-anchor="middle" font-size="9" fill="#64748B">Kepatuhan CDOB</text>
          </svg>
          <div class="w-full space-y-1.5 text-xs pt-2 border-t" style="border-color:var(--ons-border)">
            <label class="flex items-center gap-2"><input type="checkbox" checked class="accent-blue-600"/> Catat Suhu Kulkas Pagi 2-8&deg;C</label>
            <label class="flex items-center gap-2"><input type="checkbox" checked class="accent-blue-600"/> Verifikasi Laci Narkotika 2 Kunci</label>
            <label class="flex items-center gap-2"><input type="checkbox" class="accent-blue-600"/> Cek Defecta Order PBF Sebelum 14:00</label>
          </div>
        </div>

        <div class="ons-card p-5 lg:col-span-5 flex flex-col justify-between">
          <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <h3 class="font-bold text-sm">Tren ${seeCost ? 'Omzet vs Laba Kotor' : 'Penjualan'} 7 Hari</h3>
              <div class="text-[11px]" style="color:var(--ons-text-soft)">Agregasi Aktual Data Penjualan: <b>${S().rp(total7Hari)}</b></div>
            </div>
            <div class="flex items-center gap-2 text-[10px]">
              <span class="inline-flex items-center gap-1 font-semibold"><span class="w-2.5 h-2.5 rounded-sm inline-block" style="background:#0066FE"></span> Omzet</span>
              ${seeCost ? `<span class="inline-flex items-center gap-1 font-semibold"><span class="w-2.5 h-2.5 rounded-sm inline-block" style="background:#10B981"></span> Laba Kotor</span>` : ''}
            </div>
          </div>
          <div class="flex items-end gap-2 h-44 pt-4">
            ${days.map((d, i) => {
              const vOmz = Number(omzSeries[i] || 0);
              const hOmz = vOmz > 0 ? Math.max(12, Math.round((vOmz / maxVal) * 100)) : 4;
              const vLaba = seeCost ? Number(labaSeries[i] || 0) : 0;
              const hLaba = seeCost && vLaba > 0 ? Math.max(8, Math.round((vLaba / maxVal) * 100)) : 0;
              const isToday = i === days.length - 1;
              return `<div class="flex-1 flex flex-col items-center gap-1 h-full justify-end" title="${d}: Omzet ${S().rp(vOmz)}${seeCost ? ' | Laba ' + S().rp(vLaba) : ''}">
                <div class="text-[10px] font-mono-num" style="color:var(--ons-text-soft)">${vOmz >= 1000000 ? (vOmz / 1000000).toFixed(1) + 'jt' : (vOmz >= 1000 ? Math.round(vOmz / 1000) + 'rb' : '0')}</div>
                <div class="w-full h-full flex items-end justify-center gap-1">
                  <div class="flex-1 rounded-t-md transition-all" style="height:${hOmz}%;background:${isToday ? '#0066FE' : '#0284C7'};opacity:${vOmz > 0 ? (isToday ? '1' : '0.82') : '0.25'};"></div>
                  ${seeCost ? `<div class="w-2/5 rounded-t-md transition-all" style="height:${Math.max(4, hLaba)}%;background:#10B981;opacity:${vLaba > 0 ? (isToday ? '1' : '0.85') : '0.25'};"></div>` : ''}
                </div>
                <div class="text-[11px] font-semibold">${d}</div>
              </div>`;
            }).join('')}
          </div>
        </div>

        <div class="ons-card p-5 lg:col-span-3 flex flex-col justify-between space-y-3">
          <h3 class="font-bold text-sm">Antrean Tugas Prioritas</h3>
          <div class="space-y-2 text-xs">
            <div class="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 flex justify-between items-center cursor-pointer hover:bg-red-500/15" onclick="navigateView('gudang','batch')">
              <span>Batch Mendekati ED (&le;90h)</span>
              <span class="font-bold font-mono-num text-red-600">${nearEdBatches.length}</span>
            </div>
            <div class="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 flex justify-between items-center cursor-pointer hover:bg-amber-500/15" onclick="navigateView('${seeCost ? 'defecta' : 'gudang'}','${seeCost ? 'order' : 'batch'}')">
              <span>Item Defecta / Stok Menipis</span>
              <span class="font-bold font-mono-num text-amber-600">${defectaCount}</span>
            </div>
            <div class="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex justify-between items-center cursor-pointer hover:bg-indigo-500/15" onclick="navigateView('eresep-prb','erx')">
              <span>Antrean E-Resep Dokter</span>
              <span class="font-bold font-mono-num text-indigo-600">${erxAntre}</span>
            </div>
            <div class="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/30 flex justify-between items-center cursor-pointer hover:bg-blue-500/15" onclick="navigateView('eresep-prb','prb')">
              <span>PRB Refill Mendesak (&le;5h)</span>
              <span class="font-bold font-mono-num text-blue-600">${prbUrgentCount}</span>
            </div>
            ${seeCost ? `<div class="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex justify-between items-center cursor-pointer hover:bg-emerald-500/15" onclick="navigateView('billing','verifikasi')">
              <span>Verifikasi Bukti Bayar PRB</span>
              <span class="font-bold font-mono-num text-emerald-600">${billPending}</span>
            </div>` : ''}
          </div>
          <div class="p-3 rounded-lg border text-xs cursor-pointer" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)" onclick="navigateView('tutup-shift')">
            <div class="font-bold mb-1">Akses Cepat Handover Shift (${todayIso})</div>
            <p style="color:var(--ons-text-soft)">Pastikan stok Chiller 2-8&deg;C &amp; kas laci terhitung sebelum pergantian shift.</p>
          </div>
        </div>
      </div>

      <!-- Baris Analitik Apotek Digital: Bauran Channel + Top Obat Terlaris -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div class="ons-card p-5 lg:col-span-6 space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-sm">Bauran Channel Apotek Digital</h3>
            <button onclick="navigateView('omnichannel')" class="ons-btn ons-btn-ghost text-xs py-1 px-2.5">Kelola Omnichannel &rarr;</button>
          </div>
          <div class="space-y-2.5 text-xs">
            ${channelRows.length ? channelRows.map((ch) => {
              const pct = Math.min(100, Math.max(4, Math.round((ch.total / chDenom) * 100)));
              return `<div>
                <div class="flex justify-between font-semibold mb-1">
                  <span>${S().esc(ch.name)}</span>
                  <span class="font-mono-num">${S().rp(ch.total)} (${pct}%)</span>
                </div>
                <div class="ons-stock-track"><div class="ons-stock-fill" style="width:${pct}%;background:#0066FE;"></div></div>
              </div>`;
            }).join('') : '<div class="py-4 text-center" style="color:var(--ons-text-soft)">Belum ada penjualan tercatat pada periode ini.</div>'}
          </div>
        </div>
        <div class="ons-card p-5 lg:col-span-6 space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-sm">Top Obat Terlaris (Fast Moving)</h3>
            <button onclick="navigateView('obat')" class="ons-btn ons-btn-ghost text-xs py-1 px-2.5">Buka Master Obat &rarr;</button>
          </div>
          <div class="space-y-2 text-xs">
            ${topObatList.length ? topObatList.map((item, idx) => `
              <div class="flex items-center justify-between gap-2 p-2 rounded-lg border" style="border-color:var(--ons-border);background:var(--ons-bg-subtle)">
                <div class="flex items-center gap-2 min-w-0">
                  <span class="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">${idx + 1}</span>
                  <span class="font-semibold truncate">${S().esc(item.nama)}</span>
                </div>
                <div class="font-mono-num shrink-0 text-right">
                  <b>${item.qty}</b> unit &bull; <span class="text-blue-600 font-bold">${S().rp(item.omz)}</span>
                </div>
              </div>`).join('') : '<div class="py-4 text-center" style="color:var(--ons-text-soft)">Top produk akan otomatis terhitung setelah transaksi kasir berlangsung.</div>'}
          </div>
        </div>
      </div>

      <!-- Radar Kadaluarsa FEFO -->
      <div class="ons-card p-5">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h3 class="font-bold text-sm">Radar Batch Mendekati Kadaluarsa (FEFO Terdekat)</h3>
          <button onclick="navigateView('gudang','batch')" class="ons-btn ons-btn-ghost text-xs">Kelola Gudang &amp; Recall &rarr;</button>
        </div>
        <div class="ons-table-wrap">
          <table class="ons-table">
            <thead><tr><th>Nama Obat</th><th>No. Batch</th><th>Tanggal ED</th><th>Sisa Hari</th><th>Stok Sisa</th><th>Aksi</th></tr></thead>
            <tbody>
              ${st.stokBatch.slice().sort((a, b) => String(a.tgl_kadaluarsa).localeCompare(String(b.tgl_kadaluarsa))).slice(0, 6).map((b) => {
                const ob = st.masterObat.find((o) => o.id_obat === b.id_obat);
                const d = S().daysUntil(b.tgl_kadaluarsa);
                const cls = d <= 90 ? 'text-red-600 font-bold' : (d <= 180 ? 'text-amber-600 font-semibold' : 'text-emerald-600');
                return `<tr>
                  <td class="font-semibold">${S().esc(ob ? ob.nama_dagang : b.id_obat)}</td>
                  <td class="font-mono-num">${S().esc(b.no_batch)}</td>
                  <td class="font-mono-num">${S().esc(b.tgl_kadaluarsa)}</td>
                  <td class="font-mono-num ${cls}">${d} hari</td>
                  <td class="font-mono-num font-bold">${b.qty_sisa}</td>
                  <td><button onclick="navigateView('pos','kasir')" class="ons-btn ons-btn-ghost text-xs py-1 px-2.5">Prioritaskan Jual</button></td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>`;
  }

  global.seedStarterCatalogNow = async () => {
    try {
      const res = await API().callApi('system.seedStarterCatalog', {}, { isWrite: true });
      global.toast(res.pesan || res.message || 'Katalog awal berhasil diisi ke Google Sheets!', 'ok');
      await global.bootLoadState(true);
    } catch (e) { global.toast(e.message, 'err'); }
  };

  /**
   * W-03: Kasir POS Next-Gen v11 (Kasir FEFO, Split Pay, Poin, Riwayat/Retur PIN & Struk Thermal)
   */
  let posSubTab = 'kasir';
  let posHistQ = '';
  let posHistFilter = 'SEMUA';

  function renderPosView() {
    const st = S().AppState;
    posSubTab = (st.subTabs && st.subTabs.pos) || posSubTab || 'kasir';
    const cart = st.carts[st.activeCartIdx] || st.carts[0];
    if (!cart.diskon_mode) cart.diskon_mode = 'RP';
    if (cart.diskon_input === undefined) cart.diskon_input = Number(cart.diskon_global || 0);
    const member = st.members.find((m) => m.id_member === cart.id_member);
    const cdss = S().checkCartCdss(cart);
    const q = (st.posSearchQ || '').toLowerCase();
    const fGol = st.posFilterGol || '';
    const omniPending = (st.omnichannelOrders || []).filter((o) => o.status_order !== 'SELESAI' && o.status_order !== 'BATAL');

    const subTabHeader = `
      <div class="flex flex-wrap items-center justify-between gap-2 ons-view-enter">
        <div class="ons-tab-bar">
          <button onclick="window.setPosSubTab('kasir')" class="ons-tab-btn ${posSubTab === 'kasir' ? 'active' : ''}">Kasir Aktif (${cart.items.length})</button>
          <button onclick="window.setPosSubTab('riwayat')" class="ons-tab-btn ${posSubTab === 'riwayat' ? 'active' : ''}">Riwayat, Struk &amp; Retur PIN (${st.penjualan.length})</button>
          <button onclick="window.setPosSubTab('online')" class="ons-tab-btn ${posSubTab === 'online' ? 'active' : ''}">Order Online (${omniPending.length})</button>
        </div>
        ${cart.id_order ? `<span class="badge-bpom bpom-terbatas">Terhubung Order Online #${S().esc(cart.id_order)}</span>` : ''}
      </div>`;

    if (posSubTab === 'riwayat') {
      const hq = posHistQ.trim().toLowerCase();
      const filteredSales = (st.penjualan || []).filter((p) => {
        if (posHistFilter === 'RETUR' && p.status_trx !== 'RETUR') return false;
        if (posHistFilter !== 'SEMUA' && posHistFilter !== 'RETUR' && String(p.metode_bayar || '').toUpperCase() !== posHistFilter) return false;
        if (hq) {
          const mem = (st.members || []).find((m) => m.id_member === p.id_member);
          const hay = `${p.no_invoice} ${p.channel} ${p.metode_bayar} ${p.id_member} ${mem ? mem.nama_pasien : ''}`.toLowerCase();
          if (!hay.includes(hq)) return false;
        }
        return true;
      });
      return `<div class="space-y-4 ons-view-enter">
        ${subTabHeader}
        <div class="ons-card p-4 space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 class="font-bold text-base">Riwayat Penjualan, Rincian Item &amp; Retur/Void Ber-PIN</h2>
              <p class="text-xs" style="color:var(--ons-text-soft)">Retur/Void transaksi wajib PIN APJ/Pemilik dan otomatis mengembalikan stok FEFO + Kartu Stok.</p>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <input class="ons-input text-xs w-52" placeholder="Cari No. Invoice / Pasien..." value="${S().esc(posHistQ)}" oninput="window.setPosHistQ(this.value)"/>
              <select class="ons-select text-xs w-36" onchange="window.setPosHistFilter(this.value)">
                ${['SEMUA', 'TUNAI', 'QRIS', 'TRANSFER', 'SPLIT', 'RETUR'].map((f) => `<option value="${f}" ${posHistFilter === f ? 'selected' : ''}>${f === 'SEMUA' ? 'Semua Metode' : f}</option>`).join('')}
              </select>
              <button onclick="bootLoadState(true)" class="ons-btn ons-btn-ghost text-xs">Segarkan</button>
            </div>
          </div>
          <div class="ons-table-wrap">
            <table class="ons-table">
              <thead><tr><th>No. Invoice</th><th>Tanggal</th><th>Channel &amp; Metode</th><th>Total</th><th>Status</th><th>Aksi</th></tr></thead>
              <tbody>
                ${filteredSales.slice(0, 80).map((p) => `<tr>
                  <td class="font-mono-num font-bold text-xs">${S().esc(p.no_invoice)}</td>
                  <td class="font-mono-num text-xs">${S().formatTgl(p.tanggal, true)}</td>
                  <td class="text-xs"><b>${S().esc(p.channel || 'Toko Fisik')}</b> &bull; ${S().esc(p.metode_bayar)} ${p.detail_split ? `<span style="color:var(--ons-text-soft)">(${S().esc(p.detail_split)})</span>` : ''}</td>
                  <td class="font-mono-num font-bold">${S().rp(p.grand_total)}</td>
                  <td><span class="badge-bpom ${p.status_trx === 'RETUR' ? 'bpom-keras' : 'bpom-bebas'}">${S().esc(p.status_trx || 'LUNAS')}</span></td>
                  <td>
                    <div class="flex flex-wrap gap-1.5">
                      <button onclick="window.openPosDetailItemsModal('${S().esc(p.no_invoice)}')" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2.5">Rincian Item</button>
                      <button onclick="window.openPosReprintModal('${S().esc(p.no_invoice)}')" class="ons-btn ons-btn-primary text-[11px] py-1 px-2.5">Struk Thermal</button>
                      ${p.status_trx !== 'RETUR' ? `<button onclick="window.openPosVoidReturnModal('${S().esc(p.no_invoice)}', ${Number(p.grand_total || 0)})" class="ons-btn ons-btn-danger text-[11px] py-1 px-2.5">Retur/Void PIN</button>` : ''}
                    </div>
                  </td>
                </tr>`).join('') || '<tr><td colspan="6" class="text-center py-6 text-xs">Tidak ada riwayat transaksi yang cocok dengan filter ini.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </div>`;
    }

    if (posSubTab === 'online') {
      return `<div class="space-y-4 ons-view-enter">
        ${subTabHeader}
        <div class="ons-card p-4 space-y-3">
          <div class="flex items-center justify-between">
            <h2 class="font-bold text-base">Antrean Pesanan Online &amp; WhatsApp Siap Checkout POS</h2>
            <button onclick="navigateView('omnichannel')" class="ons-btn ons-btn-ghost text-xs">Buka Hub Omnichannel Lengkap &rarr;</button>
          </div>
          <div class="space-y-2">
            ${omniPending.length === 0 ? '<div class="text-center py-6 text-xs" style="color:var(--ons-text-soft)">Semua order online sudah diproses!</div>' : omniPending.map((o) => `
              <div class="p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2 text-xs">
                <div>
                  <div class="font-bold">${S().esc(o.no_order)} &bull; ${S().esc(o.nama_pelanggan)} <span class="badge-bpom bpom-terbatas">${S().esc(o.status_order)}</span></div>
                  <div style="color:var(--ons-text-soft)">${S().esc(o.channel)} &bull; ${S().esc(o.no_wa)} &bull; Est. ${S().rp(Number(o.total_estimasi || 0) + Number(o.ongkir || 0))}</div>
                </div>
                <button onclick="ONSViewsOmniCrm.loadOmniOrderToPos('${S().esc(o.id_order)}');window.setPosSubTab('kasir');" class="ons-btn ons-btn-emerald text-xs">Muat ke Keranjang POS &rarr;</button>
              </div>`).join('')}
          </div>
        </div>
      </div>`;
    }

    const catalog = st.masterObat.filter((o) => {
      if (fGol && String(o.golongan_bpom).toUpperCase() !== fGol) return false;
      if (q) {
        const hay = `${o.nama_dagang} ${o.zat_aktif} ${o.kode_kfa} ${o.id_obat}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const subtotal = cart.items.reduce((s, it) => s + Number(it.harga_jual) * Number(it.qty), 0);
    if (cart.diskon_mode === 'PCT') {
      const pct = Math.min(100, Math.max(0, Number(cart.diskon_input || 0)));
      cart.diskon_global = Math.round(subtotal * (pct / 100));
    } else {
      cart.diskon_global = Math.min(subtotal, Math.max(0, Number(cart.diskon_input || 0)));
    }
    const grandTotal = Math.max(0, subtotal - Number(cart.diskon_global || 0));
    const offQueue = API().getOfflineQueue();

    return `<div class="space-y-4 ons-view-enter">
      ${subTabHeader}
      <!-- Top Bar POS: Pencarian Barcode, Suara, Kamera, Multi-Keranjang & Offline Queue -->
      <div class="ons-card p-3 flex flex-wrap items-center gap-2">
        <div class="flex-1 min-w-[220px] relative">
          <input id="posSearchInput" class="ons-input pr-10" placeholder="[F2] Scan Barcode KFA / Ketik Nama Obat atau Zat Aktif..." value="${S().esc(st.posSearchQ)}" oninput="window.onPosSearch(this.value)" onkeydown="if(event.key==='Enter'){window.posAddFirstMatch();}"/>
        </div>
        <button onclick="window.startPosCameraScan()" class="ons-btn ons-btn-ghost text-xs" title="Scan Barcode Kamera">Scan Kamera</button>
        <button onclick="window.startPosVoiceCashier()" class="ons-btn ons-btn-ghost text-xs" title="Kasir Suara Bahasa Indonesia">Suara Kasir</button>
        <button onclick="ONSStore.ThermalPrinter.connect()" class="ons-btn ons-btn-ghost text-xs">Printer BT</button>
        ${offQueue.length ? `<button onclick="window.syncPosOfflineNow()" class="ons-btn ons-btn-amber text-xs">Sinkron ${offQueue.length} Antrean Offline</button>` : ''}
      </div>

      <!-- Multi-Cart Queue Tabs -->
      <div class="flex flex-wrap items-center gap-2">
        ${st.carts.map((c, idx) => `
          <button onclick="window.switchPosCart(${idx})" class="ons-btn text-xs ${idx === st.activeCartIdx ? 'ons-btn-primary' : 'ons-btn-ghost'}">
            ${S().esc(c.label)} (${c.items.length})
          </button>`).join('')}
        <button onclick="window.addPosCartTab()" class="ons-btn ons-btn-ghost text-xs">+ Tahan Antrean Baru</button>
        <div class="ml-auto flex gap-1 flex-wrap">
          ${['', 'BEBAS', 'TERBATAS', 'KERAS', 'PREKURSOR'].map((g) => `
            <button onclick="ONSStore.AppState.posFilterGol='${g}';renderActiveView();" class="ons-btn text-xs py-1 px-2.5 ${fGol === g ? 'ons-btn-primary' : 'ons-btn-ghost'}">${g || 'Semua'}</button>
          `).join('')}
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <!-- Panel Kiri: Katalog Cepat & Batch FEFO -->
        <div class="lg:col-span-7 space-y-3">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[66vh] overflow-y-auto pr-1">
            ${catalog.map((o) => {
              const totalStok = S().getTotalStok(o.id_obat);
              const nearest = S().getNearestEdBatch(o.id_obat);
              const edDays = nearest ? S().daysUntil(nearest.tgl_kadaluarsa) : null;
              const edBadgeCls = edDays === null ? '' : (edDays <= 90 ? 'text-red-600 font-bold' : (edDays <= 180 ? 'text-amber-600 font-semibold' : 'text-emerald-600'));
              const price = cart.id_member !== 'UMUM' ? o.harga_member : o.harga_umum;
              return `<div class="ons-product-card flex flex-col justify-between gap-2">
                <div>
                  <div class="flex items-start justify-between gap-2">
                    <div class="font-bold text-sm leading-tight">${S().esc(o.nama_dagang)}</div>
                    ${S().bpomBadge(o.golongan_bpom)}
                  </div>
                  <div class="text-xs mt-1" style="color:var(--ons-text-soft)">${S().esc(o.zat_aktif)} &bull; Rak ${S().esc(o.rak_lokasi || '-')}</div>
                  <div class="text-[11px] font-mono-num mt-1" style="color:var(--ons-text-soft)">
                    FEFO: ${nearest ? `${S().esc(nearest.no_batch)} &bull; <span class="${edBadgeCls}">ED ${nearest.tgl_kadaluarsa} (${edDays}h)</span>` : '<span class="text-red-500 font-bold">Stok Kosong</span>'}
                  </div>
                </div>
                <div class="flex items-center justify-between pt-2 border-t" style="border-color:var(--ons-border)">
                  <div>
                    <div class="text-sm font-bold font-mono-num text-blue-600">${S().rp(price)} <span class="text-[10px] font-normal">/${S().esc(o.satuan_dasar)}</span></div>
                    <div class="text-[11px] font-mono-num ${totalStok <= o.stok_min ? 'text-red-600 font-bold' : 'text-emerald-600'}">Stok: ${totalStok}</div>
                  </div>
                  <div class="flex gap-1">
                    ${o.substitusi_ids ? `<button onclick="window.openSubstitusiModal('${o.id_obat}')" class="ons-btn ons-btn-ghost text-[11px] px-2 py-1" title="Lihat Substitusi (Alt+S)">Sub</button>` : ''}
                    <button onclick="window.posAddToCart('${o.id_obat}')" ${totalStok <= 0 ? 'disabled' : ''} class="ons-btn ons-btn-primary text-xs px-3 py-1.5">+ Keranjang</button>
                  </div>
                </div>
              </div>`;
            }).join('')}
          </div>
        </div>

        <!-- Panel Kanan: Keranjang Aktif, Pasien, CDSS & Checkout -->
        <div class="lg:col-span-5 space-y-3">
          <div class="ons-card p-4 space-y-3">
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="text-[11px] font-semibold block mb-1">Channel Penjualan</label>
                <select onchange="ONSStore.AppState.carts[ONSStore.AppState.activeCartIdx].channel=this.value" class="ons-select text-xs">
                  ${['Toko Fisik', 'Resep WA', 'Marketplace / GrabHealth'].map((ch) => `<option ${cart.channel === ch ? 'selected' : ''}>${ch}</option>`).join('')}
                </select>
              </div>
              <div>
                <label class="text-[11px] font-semibold block mb-1">Pasien / Member PRB</label>
                <select onchange="ONSStore.AppState.carts[ONSStore.AppState.activeCartIdx].id_member=this.value;renderActiveView();" class="ons-select text-xs">
                  <option value="UMUM" ${cart.id_member === 'UMUM' ? 'selected' : ''}>Pasien Umum (Tanpa Kartu)</option>
                  ${st.members.map((m) => `<option value="${m.id_member}" ${cart.id_member === m.id_member ? 'selected' : ''}>${S().esc(m.nama_pasien)} (${S().esc(m.program_prb)})</option>`).join('')}
                </select>
              </div>
            </div>

            ${member ? `<div class="p-2.5 rounded-lg border text-xs flex flex-wrap justify-between gap-2" style="background:var(--ons-primary-tint);border-color:var(--ons-primary);">
              <div><b>Alergi:</b> <span class="text-red-600 font-bold">${S().esc(member.alergi_list)}</span> &bull; <b>Kondisi:</b> ${S().esc(member.penyakit_kronis)}</div>
              <div class="font-mono-num font-bold text-blue-700">${member.poin_loyalitas} Poin</div>
            </div>` : ''}

            <!-- Peringatan CDSS Real-Time -->
            ${cdss.alerts.length ? `<div class="space-y-1.5">
              ${cdss.alerts.map((al) => `<div class="p-2.5 rounded-lg text-xs font-semibold border ${al.level === 'DANGER' ? 'bg-red-500/15 border-red-500 text-red-700 dark:text-red-300' : 'bg-amber-500/15 border-amber-500 text-amber-800 dark:text-amber-300'}">${S().esc(al.msg)}</div>`).join('')}
            </div>` : ''}

            <!-- Daftar Item Keranjang -->
            <div class="space-y-2 max-h-64 overflow-y-auto border-y py-2" style="border-color:var(--ons-border)">
              ${cart.items.length ? cart.items.map((it, idx) => `
                <div class="text-xs p-2 rounded-lg space-y-1.5" style="background:var(--ons-bg-subtle)">
                  <div class="flex items-center justify-between gap-2">
                    <div class="flex-1 min-w-0">
                      <div class="font-bold truncate">${S().esc(it.nama_dagang)}</div>
                      <div class="text-[11px] font-mono-num" style="color:var(--ons-text-soft)">${S().rp(it.harga_jual)} / ${S().esc(it.satuan)} &times; ${it.faktor_konversi} dasar</div>
                    </div>
                    <div class="flex items-center gap-1">
                      <button onclick="window.openCartEtiketModal(${idx})" class="ons-btn ons-btn-ghost text-[10px] py-1 px-1.5 min-h-0 h-8" title="Cetak Etiket Obat Putih/Biru">Etiket</button>
                      <select onchange="window.posChangeUnit(${idx}, this.value)" class="ons-select text-[11px] py-1 px-1.5 min-h-0 h-8 w-20">
                        ${it.unitOptions.map((u) => `<option value="${u.label}" ${u.label === it.satuan ? 'selected' : ''}>${u.label}</option>`).join('')}
                      </select>
                      <input type="number" min="1" value="${it.qty}" onchange="window.posUpdateQty(${idx}, this.value)" class="ons-input font-mono-num text-center text-xs w-14 py-1 px-1 min-h-0 h-8"/>
                      <button onclick="window.posRemoveItem(${idx})" class="ons-btn ons-btn-danger text-xs px-2 py-1 min-h-0 h-8">&times;</button>
                    </div>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <span class="text-[10px] font-semibold shrink-0" style="color:var(--ons-text-soft)">Aturan Pakai:</span>
                    <select onchange="window.posSetAturanPakai(${idx}, this.value)" class="ons-select text-[11px] py-0.5 px-1.5 min-h-0 h-7 flex-1">
                      ${['', '3 x 1 Sesudah Makan', '3 x 1 Sebelum Makan', '2 x 1 Sesudah Makan', '1 x 1 Malam Hari', '1 x 1 Pagi Hari', 'Oles Tipis 2x Sehari (Obat Luar)'].map((opt) => `<option value="${S().esc(opt)}" ${(it.aturan_pakai || '') === opt ? 'selected' : ''}>${opt || 'Standar / Sesuai Etiket'}</option>`).join('')}
                    </select>
                  </div>
                </div>`).join('') : '<div class="text-center py-6 text-xs" style="color:var(--ons-text-soft)">Belum ada item. Pilih obat dari katalog di sebelah kiri atau scan barcode.</div>'}
            </div>

            <!-- Cross-Sell / Profit Booster Cerdas -->
            ${cart.items.length ? `<div class="p-2 rounded-lg border text-[11px] flex items-center justify-between gap-2" style="border-color:var(--ons-border)">
              <span>Rekomendasi Cross-sell Apoteker: <b>Vitamin C / Probiotik Pendamping</b></span>
              <button onclick="window.posAddToCart('OBT-002')" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2 min-h-0 h-7">+ Tambah</button>
            </div>` : ''}

            <div class="space-y-1.5 text-sm pt-1">
              <div class="flex justify-between"><span>Subtotal</span><span class="font-mono-num">${S().rp(subtotal)}</span></div>
              <div class="flex justify-between items-center gap-2">
                <div class="flex items-center gap-1.5 text-xs">
                  <span class="font-semibold">Diskon</span>
                  <button type="button" onclick="window.toggleCartDiscMode()" class="ons-quick-denom py-0.5 px-2 text-[10px]">${cart.diskon_mode === 'PCT' ? '% Persen' : 'Rp Nominal'}</button>
                </div>
                <div class="flex items-center gap-2">
                  <input type="number" min="0" max="${cart.diskon_mode === 'PCT' ? 100 : subtotal}" value="${cart.diskon_input || 0}" onchange="window.applyCartDiscInput(this.value)" class="ons-input font-mono-num text-right text-xs w-24 py-1 min-h-0 h-8"/>
                  ${cart.diskon_mode === 'PCT' && cart.diskon_global > 0 ? `<span class="text-[11px] font-mono-num text-emerald-600">-${S().rp(cart.diskon_global)}</span>` : ''}
                </div>
              </div>
              <div class="flex justify-between text-lg font-extrabold border-t pt-2" style="border-color:var(--ons-border)">
                <span>TOTAL BAYAR</span>
                <span class="font-mono-num text-blue-600">${S().rp(grandTotal)}</span>
              </div>
            </div>

            <!-- Tombol Pembayaran -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button onclick="window.openPosCheckoutModal('TUNAI', ${grandTotal})" class="ons-btn ons-btn-emerald text-xs">[F4] Tunai</button>
              <button onclick="window.openPosCheckoutModal('QRIS', ${grandTotal})" class="ons-btn ons-btn-primary text-xs">[F8] QRIS BI</button>
              <button onclick="window.openPosCheckoutModal('TRANSFER', ${grandTotal})" class="ons-btn ons-btn-ghost text-xs">Transfer/EDC</button>
              <button onclick="window.openPosCheckoutModal('SPLIT', ${grandTotal})" class="ons-btn ons-btn-ghost text-xs">Split Pay</button>
            </div>
            ${cart.items.length ? `<button onclick="window.openCartEtiketModal(0)" class="ons-btn ons-btn-ghost w-full text-xs">1-Klik Cetak Etiket Obat Putih/Biru (${cart.items.length} Item)</button>` : ''}
          </div>
        </div>
      </div>
    </div>`;
  }

  global.setPosSubTab = (t) => {
    posSubTab = t || 'kasir';
    if (S().AppState.subTabs) S().AppState.subTabs.pos = posSubTab;
    global.renderActiveView();
    if (typeof global.syncNavHighlight === 'function') global.syncNavHighlight();
  };
  global.setPosHistQ = (v) => { posHistQ = v || ''; global.renderActiveView(); };
  global.setPosHistFilter = (v) => { posHistFilter = v || 'SEMUA'; global.renderActiveView(); };

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

  global.openPosDetailItemsModal = async (noInvoice) => {
    try {
      const st = S().AppState;
      const trx = (st.penjualan || []).find((p) => p.no_invoice === noInvoice) || {};
      let items = (st.detailPenjualan || []).filter((d) => d.no_invoice === noInvoice);
      if (!items.length) {
        try {
          const res = await API().callApi('pos.details', { no_invoice: noInvoice });
          items = res.items || [];
        } catch (err) {}
      }
      S().openModal(`<div class="p-6 space-y-4 text-xs">
        <div class="flex justify-between items-center">
          <div>
            <h3 class="font-bold text-base">Rincian Item Nota ${S().esc(noInvoice)}</h3>
            <div style="color:var(--ons-text-soft)">${S().formatTgl(trx.tanggal, true)} &bull; ${S().esc(trx.channel || 'Toko Fisik')} &bull; ${S().esc(trx.metode_bayar || '-')}</div>
          </div>
          <button onclick="ONSStore.closeModal()" class="text-xl">&times;</button>
        </div>
        <div class="ons-table-wrap">
          <table class="ons-table">
            <thead><tr><th>Nama Obat</th><th>Batch</th><th>Qty</th><th>Harga</th><th>Subtotal</th></tr></thead>
            <tbody>
              ${items.length ? items.map((it) => `<tr>
                <td class="font-semibold">${S().esc(it.nama_dagang || it.id_obat)}</td>
                <td class="font-mono-num">${S().esc(it.id_batch || it.no_batch || '-')}</td>
                <td class="font-mono-num">${it.qty} ${S().esc(it.satuan || '')}</td>
                <td class="font-mono-num">${S().rp(it.harga_jual)}</td>
                <td class="font-mono-num font-bold">${S().rp(it.subtotal_item || (Number(it.qty) * Number(it.harga_jual)))}</td>
              </tr>`).join('') : '<tr><td colspan="5" class="text-center py-4">Detail baris item belum tersedia pada log lokal.</td></tr>'}
            </tbody>
          </table>
        </div>
        <div class="flex justify-between items-center pt-2 border-t font-bold" style="border-color:var(--ons-border)">
          <span>Total Nota (${S().esc(trx.status_trx || 'LUNAS')})</span>
          <span class="text-base font-mono-num text-blue-600">${S().rp(trx.grand_total || 0)}</span>
        </div>
      </div>`, '600px');
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
    S().openModal(`<div class="p-6 space-y-4 text-xs">
      <div class="flex justify-between items-center">
        <h3 class="font-bold text-base">Cetak Etiket Obat (Putih Oral / Biru Luar)</h3>
        <button onclick="ONSStore.closeModal()" class="text-xl">&times;</button>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="font-semibold block mb-1">Pilih Item Keranjang</label>
          <select id="etItemSel" class="ons-select text-xs" onchange="window.refreshCartEtiketBox()">
            ${items.map((x, idx) => `<option value="${S().esc(x.nama_dagang)} (${x.qty} ${S().esc(x.satuan)})" ${idx === Number(itemIdx || 0) ? 'selected' : ''}>${S().esc(x.nama_dagang)} (${x.qty} ${S().esc(x.satuan)})</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="font-semibold block mb-1">Jenis Etiket</label>
          <select id="etJenisSel" class="ons-select text-xs" onchange="window.refreshCartEtiketBox()">
            <option value="putih" ${!defBiru ? 'selected' : ''}>Etiket PUTIH — Obat Dalam / Oral</option>
            <option value="biru" ${defBiru ? 'selected' : ''}>Etiket BIRU — Obat Luar / Injeksi</option>
          </select>
        </div>
        <div><label class="font-semibold block mb-1">Nama Pasien</label><input id="etPasienInp" class="ons-input text-xs" value="${S().esc(pasienName)}" oninput="window.refreshCartEtiketBox()"/></div>
        <div><label class="font-semibold block mb-1">Aturan Pakai</label><input id="etAturanInp" class="ons-input text-xs" value="${S().esc(defAturan)}" oninput="window.refreshCartEtiketBox()"/></div>
      </div>
      <div id="etPreviewZone" class="ons-etiket-box ${defBiru ? 'biru' : 'putih'} space-y-1 text-center">
        ${(() => {
          const prof = S().getStoreProfile ? S().getStoreProfile() : {};
          return `<div class="font-extrabold text-sm tracking-wide">${S().esc((prof.nama_usaha || 'APOTEK ONS FARMA').toUpperCase())}</div>
            <div class="text-[10px]">${S().esc(prof.nama_pemilik || 'apt. Anissa Faradifa R. Is Rumi')} &bull; SIPA: ${S().esc(prof.sipa_pemilik || '19920412/SIPA_35.78/2025/1042')}</div>`;
        })()}
        <div class="border-y border-slate-800 my-1 py-1 font-bold" id="etPrevSub">${S().esc(pasienName)} &bull; ${new Date().toLocaleDateString('id-ID')}</div>
        <div class="font-bold text-sm" id="etPrevObat">${S().esc(it.nama_dagang)} (${it.qty} ${S().esc(it.satuan)})</div>
        <div class="font-extrabold text-sm underline" id="etPrevAturan">${S().esc(defAturan)}</div>
        <div class="text-[10px] pt-1 font-semibold" id="etPrevFooter">${defBiru ? 'OBAT LUAR • TIDAK UNTUK DITELAN' : 'OBAT DALAM • SEMOGA LEKAS SEMBUH'}</div>
      </div>
      <button onclick="ONSStore.printHtmlZone('etPreviewZone', 'Etiket Obat ONS Farma')" class="ons-btn ons-btn-primary w-full text-xs">Cetak Etiket Sekarang</button>
    </div>`, '540px');
  };

  global.refreshCartEtiketBox = () => {
    const j = (document.getElementById('etJenisSel') || {}).value || 'putih';
    const box = document.getElementById('etPreviewZone');
    if (box) { box.className = 'ons-etiket-box ' + j + ' space-y-1 text-center'; }
    const p = (document.getElementById('etPasienInp') || {}).value || 'Pasien Umum';
    const ob = (document.getElementById('etItemSel') || {}).value || '';
    const at = (document.getElementById('etAturanInp') || {}).value || '';
    if (document.getElementById('etPrevSub')) document.getElementById('etPrevSub').textContent = p + ' • ' + new Date().toLocaleDateString('id-ID');
    if (document.getElementById('etPrevObat')) document.getElementById('etPrevObat').textContent = ob;
    if (document.getElementById('etPrevAturan')) document.getElementById('etPrevAturan').textContent = at;
    if (document.getElementById('etPrevFooter')) document.getElementById('etPrevFooter').textContent = j === 'biru' ? 'OBAT LUAR • TIDAK UNTUK DITELAN' : 'OBAT DALAM • SEMOGA LEKAS SEMBUH';
  };
  global.addPosItemById = (idObat) => {
    posSubTab = 'kasir';
    if (S().AppState.subTabs) S().AppState.subTabs.pos = 'kasir';
    global.posAddToCart(idObat);
    if (typeof global.syncNavHighlight === 'function') global.syncNavHighlight();
  };

  global.onPosSearch = (v) => {
    S().AppState.posSearchQ = v;
    global.renderActiveView();
    const inp = document.getElementById('posSearchInput');
    if (inp) { inp.focus(); inp.setSelectionRange(v.length, v.length); }
  };

  global.posAddFirstMatch = () => {
    const q = (S().AppState.posSearchQ || '').toLowerCase();
    if (!q) return;
    const m = S().AppState.masterObat.find((o) => o.kode_kfa === q || o.id_obat.toLowerCase() === q || o.nama_dagang.toLowerCase().includes(q));
    if (m) {
      global.posAddToCart(m.id_obat);
      S().AppState.posSearchQ = '';
      global.renderActiveView();
    }
  };

  global.posAddToCart = (idObat) => {
    const st = S().AppState;
    const obat = st.masterObat.find((o) => o.id_obat === idObat);
    if (!obat) return;
    const cart = st.carts[st.activeCartIdx];
    const priceBase = cart.id_member !== 'UMUM' ? Number(obat.harga_member || obat.harga_umum) : Number(obat.harga_umum);
    const existing = cart.items.find((i) => i.id_obat === idObat && i.faktor_konversi === 1);
    if (existing) {
      existing.qty++;
    } else {
      const unitOptions = [
        { label: obat.satuan_dasar, faktor: 1, harga: priceBase },
        { label: obat.satuan_sedang || 'Strip', faktor: Number(obat.rasio_sedang || 10), harga: priceBase * Number(obat.rasio_sedang || 10) },
        { label: obat.satuan_besar || 'Box', faktor: Number(obat.rasio_besar || 100), harga: Number(obat.harga_grosir || priceBase) * Number(obat.rasio_besar || 100) }
      ];
      cart.items.push({
        id_obat: obat.id_obat,
        nama_dagang: obat.nama_dagang,
        satuan: obat.satuan_dasar,
        faktor_konversi: 1,
        harga_jual: priceBase,
        qty: 1,
        aturan_pakai: '',
        unitOptions
      });
    }
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
    const it = cart.items[idx];
    const opt = it.unitOptions.find((u) => u.label === label);
    if (opt) {
      it.satuan = opt.label;
      it.faktor_konversi = opt.faktor;
      it.harga_jual = opt.harga;
      global.renderActiveView();
    }
  };

  global.posUpdateQty = (idx, q) => {
    const cart = S().AppState.carts[S().AppState.activeCartIdx];
    cart.items[idx].qty = Math.max(1, Number(q || 1));
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

  global.addPosCartTab = () => {
    const st = S().AppState;
    st.carts.push({ id: 'K' + (st.carts.length + 1), label: 'Pelanggan #' + (st.carts.length + 1), channel: 'Toko Fisik', id_member: 'UMUM', items: [], diskon_global: 0 });
    st.activeCartIdx = st.carts.length - 1;
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
          <div><div class="font-bold text-sm">${S().esc(s.nama_dagang)}</div><div class="text-xs">Stok: ${S().getTotalStok(s.id_obat)} | Harga: ${S().rp(s.harga_umum)}</div></div>
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

  global.startPosCameraScan = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      global.toast('Kamera tidak tersedia pada browser ini.', 'warn');
      return;
    }
    S().openModal(`<div class="p-5 space-y-3 text-center">
      <div class="flex justify-between items-center"><h3 class="font-bold text-sm">Pemindai Barcode Kamera (KFA / NIE / EAN-13)</h3><button onclick="window.stopPosCameraScan()" class="text-xl">&times;</button></div>
      <video id="posCamVideo" autoplay playsinline class="w-full rounded-xl bg-black max-h-64 object-cover"></video>
      <div class="flex gap-2">
        <input id="manualScanMock" class="ons-input text-xs font-mono-num" placeholder="Atau tempel kode barcode di sini (cth: 93001024)"/>
        <button onclick="S().AppState.posSearchQ=document.getElementById('manualScanMock').value;posAddFirstMatch();stopPosCameraScan();" class="ons-btn ons-btn-primary text-xs">Proses</button>
      </div>
    </div>`, '480px');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      global._posCamStream = stream;
      const vid = document.getElementById('posCamVideo');
      if (vid) vid.srcObject = stream;
      if ('BarcodeDetector' in global) {
        const detector = new global.BarcodeDetector();
        const timer = setInterval(async () => {
          if (!global._posCamStream) { clearInterval(timer); return; }
          try {
            const codes = await detector.detect(vid);
            if (codes && codes.length) {
              S().AppState.posSearchQ = codes[0].rawValue;
              global.posAddFirstMatch();
              global.stopPosCameraScan();
            }
          } catch (e) {}
        }, 400);
      }
    } catch (e) { global.toast('Izin kamera ditolak/tidak ada perangkat: ' + e.message, 'warn'); }
  };

  global.stopPosCameraScan = () => {
    if (global._posCamStream) {
      global._posCamStream.getTracks().forEach((t) => t.stop());
      global._posCamStream = null;
    }
    S().closeModal();
  };

  function buildAndShowStrukModal(strukData, lebarMm, waTarget, itemsForEtiket) {
    const st = S().AppState;
    const tpls = st.strukTemplates || [];
    const activeTpl = tpls.find((t) => Number(t.lebar_mm || 58) === Number(lebarMm || 58)) || tpls[0];
    const tplText = (activeTpl && activeTpl.template_teks) || (global.StrukEngine && global.StrukEngine.DEFAULT_STRUK_TEMPLATE) || '';
    const htmlPaper = global.StrukEngine ? global.StrukEngine.renderHtml(tplText, strukData, lebarMm || 58) : '<pre>Struk OK</pre>';
    const plainTxt = global.StrukEngine ? global.StrukEngine.formatPlainText(tplText, strukData, lebarMm || 58) : '';
    const waText = S().formatStrukWaMessage ? S().formatStrukWaMessage(strukData) : plainTxt;
    const cleanWa = String(waTarget || '').trim();
    const waHref = S().buildWaUrl ? S().buildWaUrl(cleanWa, waText) : ('https://wa.me/?text=' + encodeURIComponent(waText));
    global._lastStrukPayload = { tplText, strukData, lebarMm: lebarMm || 58, plainTxt, waText, waTarget: cleanWa, itemsForEtiket: itemsForEtiket || [] };

    S().openModal(`<div class="p-5 space-y-3">
      <div class="flex items-center justify-between">
        <div class="text-emerald-600 font-bold text-base">&#9989; Nota ${S().esc(strukData.NOTA)}</div>
        <div class="flex gap-1.5">
          <button onclick="window.switchStrukPreviewWidth(58)" class="ons-btn ${Number(lebarMm) !== 80 ? 'ons-btn-primary' : 'ons-btn-ghost'} text-[11px] py-1 px-2">58mm</button>
          <button onclick="window.switchStrukPreviewWidth(80)" class="ons-btn ${Number(lebarMm) === 80 ? 'ons-btn-primary' : 'ons-btn-ghost'} text-[11px] py-1 px-2">80mm</button>
          <button onclick="ONSStore.closeModal()" class="text-xl px-1">&times;</button>
        </div>
      </div>
      <div class="max-h-72 overflow-y-auto py-2 rounded-xl" style="background:var(--ons-bg-subtle)">${htmlPaper}</div>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
        <button onclick="window.printStrukWebBt()" class="ons-btn ons-btn-primary py-1.5">Bluetooth</button>
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
      S().printHtmlZone(global.StrukEngine.renderHtml(p.tplText, p.strukData, p.lebarMm));
      setTimeout(() => document.body.classList.remove('printing-thermal'), 800);
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
        ALAMAT_TOKO: [prof.alamat_usaha, prof.kota].filter(Boolean).join(', ') || ('Cabang ' + (trx.cabang_id || S().AppState.cabangId)),
        WA_TOKO: prof.wa_usaha || prof.telepon_usaha || '0811-0000-990',
        APJ_SIPA: prof.sipa_pemilik || '19920412/SIPA_35.78/2025/1042',
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

  global.openPosVoidReturnModal = (noInvoice, nominal) => {
    S().openModal(`<div class="p-6 space-y-3 text-xs">
      <div class="flex justify-between items-center"><h3 class="font-bold text-base text-red-600">&#9888;&#65039; Retur / Void Transaksi ${S().esc(noInvoice)}</h3><button onclick="ONSStore.closeModal()" class="text-xl">&times;</button></div>
      <div class="p-3 rounded-lg" style="background:var(--ons-bg-subtle)">Nilai pengembalian: <b>${S().rp(nominal)}</b>. Stok batch akan dipulihkan ke gudang &amp; tercatat di Kartu Stok BPOM.</div>
      <div><label class="font-semibold block mb-1">Alasan Retur / Void *</label><input id="voidAlasanInp" class="ons-input" value="Kesalahan input item / penyesuaian resep dokter"/></div>
      <div><label class="font-semibold block mb-1">PIN Otorisasi APJ / Pemilik (Demo: 123456) *</label><input id="voidPinInp" type="password" maxlength="6" class="ons-input font-mono-num" placeholder="6 digit PIN"/></div>
      <button onclick="window.submitPosVoidReturn('${S().esc(noInvoice)}')" class="ons-btn ons-btn-danger w-full">Otorisasi PIN &amp; Eksekusi Retur</button>
    </div>`, '480px');
  };

  global.submitPosVoidReturn = async (noInvoice) => {
    try {
      const res = await API().callApi('pos.voidReturn', {
        no_invoice: noInvoice,
        alasan: (document.getElementById('voidAlasanInp') || {}).value || 'Retur PIN',
        pin_override: (document.getElementById('voidPinInp') || {}).value || ''
      }, { isWrite: true });
      S().closeModal();
      global.toast(`Retur ${res.no_invoice} disahkan (${res.restored_items} item stok kembali).`, 'ok');
      await global.bootLoadState(true);
    } catch (e) { global.toast(e.message, 'err'); }
  };

  global.openPosCheckoutModal = (metode, total) => {
    const cart = S().AppState.carts[S().AppState.activeCartIdx];
    if (!cart.items.length) { global.toast('Keranjang masih kosong!', 'warn'); return; }
    const cdss = S().checkCartCdss(cart);
    const member = S().AppState.members.find((m) => m.id_member === cart.id_member);
    const maxRedeemPoin = member ? Math.min(Number(member.poin_loyalitas || 0), Math.floor(total / 100)) : 0;
    const invPreview = 'INV-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-POS';
    const qrisStr = S().buildQrisEmvcoPayload(total, invPreview);

    S().openModal(`<div class="p-6 space-y-4">
      <div class="flex justify-between items-center">
        <h3 class="font-bold text-lg">Konfirmasi Pembayaran POS (${S().esc(metode)})</h3>
        <button onclick="ONSStore.closeModal()" class="text-xl">&times;</button>
      </div>
      <div class="p-4 rounded-xl text-center" style="background:var(--ons-bg-subtle)">
        <div class="text-xs font-semibold" style="color:var(--ons-text-soft)">Total Tagihan Awal</div>
        <div id="posModalTotalDisplay" class="text-2xl font-extrabold font-mono-num text-blue-600">${S().rp(total)}</div>
      </div>

      ${maxRedeemPoin > 0 ? `<div class="p-3 rounded-xl border text-xs space-y-1.5" style="border-color:var(--ons-border)">
        <div class="flex justify-between font-bold">
          <span>Tukar Poin Member (${S().esc(member.nama_pasien)})</span>
          <span class="text-emerald-600">Saldo: ${member.poin_loyalitas} poin</span>
        </div>
        <div class="flex items-center gap-2">
          <input id="posRedeemPoinInp" type="number" min="0" max="${maxRedeemPoin}" value="0" oninput="window.recalcPosModalNetTotal(${total})" class="ons-input font-mono-num w-28 py-1 text-xs"/>
          <span style="color:var(--ons-text-soft)">poin (1 poin = Rp 100, maks ${maxRedeemPoin})</span>
        </div>
      </div>` : ''}

      ${metode === 'QRIS' ? `<div class="text-center space-y-2">
        <div class="flex justify-center">${S().renderSvgQr(qrisStr, 175)}</div>
        <div class="text-xs font-semibold text-emerald-600">QRIS Dinamis EMVCo BI — Nominal Tepat <span id="posQrisAmtSpan">${S().rp(total)}</span></div>
      </div>` : ''}

      ${metode === 'SPLIT' ? `<div class="p-3 rounded-xl border space-y-2 text-xs" style="border-color:var(--ons-border)">
        <div class="font-bold">Kalkulator Pembayaran Split (Tunai + QRIS/EDC)</div>
        <div class="grid grid-cols-2 gap-2">
          <div><label class="font-semibold block mb-1">Tunai (Rp)</label><input id="posSplitTunai" type="number" min="0" value="${Math.floor(total / 2)}" oninput="window.syncSplitOther(${total})" class="ons-input font-mono-num"/></div>
          <div><label class="font-semibold block mb-1">QRIS / Transfer (Rp)</label><input id="posSplitNonTunai" type="number" min="0" value="${total - Math.floor(total / 2)}" class="ons-input font-mono-num"/></div>
        </div>
      </div>` : ''}

      ${metode === 'TUNAI' ? `<div class="space-y-2">
        <label class="text-xs font-semibold">Uang Tunai Diterima (Rp)</label>
        <input id="posTunaiBayar" type="number" class="ons-input font-mono-num text-base font-bold" value="${total}" oninput="document.getElementById('posKembalianSpan').textContent=ONSStore.rp(Math.max(0,Number(this.value)-${total}))"/>
        <div class="flex gap-1.5 flex-wrap">
          <button type="button" onclick="document.getElementById('posTunaiBayar').value=${total};document.getElementById('posTunaiBayar').dispatchEvent(new Event('input'));" class="ons-quick-denom">Uang Pas</button>
          ${[20000, 50000, 100000, 200000].map((v) => `<button type="button" onclick="document.getElementById('posTunaiBayar').value=${v};document.getElementById('posTunaiBayar').dispatchEvent(new Event('input'));" class="ons-quick-denom">${S().rp(v)}</button>`).join('')}
        </div>
        <div class="text-sm font-bold flex justify-between pt-1"><span>Kembalian:</span><span id="posKembalianSpan" class="font-mono-num text-emerald-600">Rp 0</span></div>
      </div>` : ''}

      ${cdss.needsApjPin ? `<div class="p-3 rounded-xl border border-red-500/40 bg-red-500/10 space-y-2">
        <div class="text-xs font-bold text-red-600">&#128274; OTORISASI PIN APJ DIPERLUKAN (Obat Keras / Narkotika / Peringatan CDSS)</div>
        <input id="posApjPinInput" type="password" maxlength="6" class="ons-input font-mono-num" placeholder="Masukkan 6 Digit PIN APJ (Demo: 123456)"/>
      </div>` : ''}

      <div>
        <label class="text-xs font-semibold block mb-1">Nomor WA Pembeli (Opsional — untuk Kirim Struk Gratis)</label>
        <input id="posWaStrukTarget" type="tel" class="ons-input font-mono-num text-xs" value="${S().esc(cart.no_wa || (member && member.no_hp) || '')}" placeholder="0812xxxx / 62812xxxx (atau isi setelah nota terbit)"/>
      </div>

      <button onclick="window.executePosCheckout('${S().esc(metode)}', ${total}, ${cdss.needsApjPin})" class="ons-btn ons-btn-emerald w-full py-2.5">Proses Transaksi, Potong FEFO &amp; Cetak Struk</button>
    </div>`, '520px');
  };

  global.recalcPosModalNetTotal = (baseTotal) => {
    const pts = Math.max(0, Number((document.getElementById('posRedeemPoinInp') || {}).value || 0));
    const net = Math.max(0, baseTotal - pts * 100);
    const disp = document.getElementById('posModalTotalDisplay');
    if (disp) disp.textContent = S().rp(net);
    const qrisSpan = document.getElementById('posQrisAmtSpan');
    if (qrisSpan) qrisSpan.textContent = S().rp(net);
  };
  global.syncSplitOther = (baseTotal) => {
    const pts = Math.max(0, Number((document.getElementById('posRedeemPoinInp') || {}).value || 0));
    const net = Math.max(0, baseTotal - pts * 100);
    const t = Math.max(0, Number((document.getElementById('posSplitTunai') || {}).value || 0));
    const ntInp = document.getElementById('posSplitNonTunai');
    if (ntInp) ntInp.value = Math.max(0, net - t);
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
      const sT = Number((document.getElementById('posSplitTunai') || {}).value || 0);
      const sN = Number((document.getElementById('posSplitNonTunai') || {}).value || 0);
      detailSplit = `Tunai ${S().rp(sT)} + QRIS/EDC ${S().rp(sN)}`;
    }
    const tunaiBayar = metode === 'TUNAI' ? Number((document.getElementById('posTunaiBayar') || {}).value || grandTotal) : grandTotal;
    const kembaliRp = metode === 'TUNAI' ? Math.max(0, tunaiBayar - grandTotal) : 0;

    const payload = {
      cabang_id: st.cabangId,
      channel: cart.channel,
      id_member: cart.id_member,
      pelanggan_nama: cart.pelanggan_nama || (member && member.nama_pasien) || 'Pasien Umum',
      id_order: cart.id_order || '',
      metode_bayar: metode,
      detail_split: detailSplit,
      redeem_poin: redeemPoin,
      subtotal: cart.items.reduce((s, it) => s + it.harga_jual * it.qty, 0),
      diskon_total: Number(cart.diskon_global || 0) + poinDiskonRp,
      grand_total: grandTotal,
      apj_override_id: apjOverride,
      send_wa_to: waTarget,
      items: cart.items
    };

    try {
      let res;
      if (!navigator.onLine && !API().isDemoMode()) {
        const queued = API().pushOfflineQueue(payload);
        global.toast('Mode Offline Aktif: Transaksi tersimpan di Antrean Darurat (' + queued.offline_sync_id + ').', 'warn');
        res = { no_invoice: queued.offline_sync_id, penjualan: payload };
      } else {
        res = await API().callApi('pos.checkout', payload, { isWrite: true });
      }
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
        ALAMAT_TOKO: [prof.alamat_usaha, prof.kota].filter(Boolean).join(', ') || ('Cabang ' + st.cabangId),
        WA_TOKO: prof.wa_usaha || prof.telepon_usaha || '0811-0000-990',
        APJ_SIPA: prof.sipa_pemilik || '19920412/SIPA_35.78/2025/1042',
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
        DIBAYAR: tunaiBayar,
        KEMBALI: kembaliRp,
        POIN: Math.floor(grandTotal / 10000),
        CATATAN: apjOverride ? ('Diverifikasi APJ: ' + apjOverride) : 'Konsultasi obat GRATIS bersama Apoteker kami.',
        QR_URL: global.location.origin + global.location.pathname + '?nota=' + encodeURIComponent(notaNo) + '&tot=' + encodeURIComponent(String(grandTotal || 0))
      }, 58, waTarget, itemsCopy);

      cart.items = [];
      cart.diskon_global = 0;
      cart.id_order = '';
      cart.pelanggan_nama = '';
      await global.bootLoadState(true);
    } catch (e) {
      global.toast(e.message, 'err');
    }
  };

  global.syncPosOfflineNow = async () => {
    const res = await API().flushOfflineQueue();
    global.toast(res.synced ? (res.synced + ' transaksi tersinkronkan!') : 'Tidak ada antrean / masih offline.', 'info');
    await global.bootLoadState(true);
  };

  global.ONSViewsAuthDashPos = { renderPublicStandaloneIfApplicable, renderLoginView, renderDashboardView, renderPosView };
})(window);
