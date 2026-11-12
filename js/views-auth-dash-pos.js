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

        <!-- Panel Kanan: Form Login Staf & Portal Publik -->
        <div class="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between gap-5">
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

          <div class="pt-3 border-t flex flex-wrap items-center gap-2" style="border-color:var(--ons-border)">
            <span class="text-[11px] font-semibold mr-1" style="color:var(--ons-text-soft)">Portal Publik:</span>
            <a href="./index.html?katalog=1" class="ons-login-portal-pill">
              ${_loginIco('store', 'w-3.5 h-3.5 text-blue-600')}
              <span>Etalase E-Apotek</span>
            </a>
            <a href="./index.html?erx=DOKTER-MITRA-01" class="ons-login-portal-pill">
              ${_loginIco('rx', 'w-3.5 h-3.5 text-emerald-600')}
              <span>E-Resep Dokter</span>
            </a>
            <button type="button" onclick="window.openManualVerifyPrompt()" class="ons-login-portal-pill">
              ${_loginIco('qr', 'w-3.5 h-3.5 text-amber-600')}
              <span>Verifikasi QR Surat</span>
            </button>
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

  function renderDashboardView() {
    const st = S().AppState;
    const cabId = st.cabangId || 'ONS-01';
    const seeCost = S().canSeeFinancialCost();
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

    const validSales = (st.penjualan || []).filter((p) => String(p.status_trx || '') !== 'RETUR' && sameCabang_(p, cabId));
    const validTrxIds = new Set(validSales.map((p) => p.id_transaksi));
    const todaySales = validSales.filter((p) => toLocalYmd_(p.tanggal) === todayIso);
    const omzetHariIni = todaySales.reduce((s, p) => s + Number(p.grand_total || 0), 0);
    const omzetTotal = validSales.reduce((s, p) => s + Number(p.grand_total || 0), 0);
    const marginHariIni = seeCost ? todaySales.reduce((s, p) => s + Number(p.estimasi_margin || 0), 0) : null;
    const marginTotal = seeCost ? validSales.reduce((s, p) => s + Number(p.estimasi_margin || 0), 0) : null;
    const marginDenom = omzetHariIni > 0 ? omzetHariIni : omzetTotal;
    const marginNum = omzetHariIni > 0 ? (marginHariIni || 0) : (marginTotal || 0);
    const marginPct = seeCost && marginDenom > 0 ? Math.round((marginNum / marginDenom) * 100) : 0;

    const activeBatches = (st.stokBatch || []).filter((b) => sameCabang_(b, cabId) && String(b.status_batch || 'AKTIF') === 'AKTIF' && Number(b.qty_sisa || 0) > 0);
    const expiredBatches = activeBatches.filter((b) => S().daysUntil(b.tgl_kadaluarsa) < 0);
    const nearEdBatches = activeBatches.filter((b) => {
      const d = S().daysUntil(b.tgl_kadaluarsa);
      return d >= 0 && d <= 90;
    });
    const warningEdCount = expiredBatches.length + nearEdBatches.length;
    const defectaCount = (st.masterObat || []).filter((o) => S().getSellableStok(o.id_obat) <= Number(o.stok_min || 10)).length;

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
      .sort((a, b) => String(a.timestamp || '').localeCompare(String(b.timestamp || '')));
    const latestCold = branchCold.length ? branchCold[branchCold.length - 1] : null;
    const activeShift = st.activeShift || null;
    const totalPoinMember = validSales.reduce((a, b) => a + Number(b.poin_didapat || 0), 0);

    // Readiness Compliance Score (Checklist Audit + APJ/Kasir, ED, Defecta)
    const auditSys = S().getAuditSystem ? S().getAuditSystem() : { apj_nama: 'apt. Siti Rahma, S.Farm', kasir_nama: 'Budi Santoso (Kasir)', items: [] };
    const auditItems = Array.isArray(auditSys.items) ? auditSys.items : [];
    const auditChecked = auditItems.filter((it) => it.checked).length;
    const auditPct = auditItems.length ? Math.round((auditChecked / auditItems.length) * 100) : 100;
    const stockScore = Math.max(40, Math.min(100, 100 - warningEdCount * 4 - defectaCount * 3));
    const readiness = Math.max(55, Math.min(100, Math.round((stockScore * 0.65) + (auditPct * 0.35))));
    const dashArray = Math.round((readiness / 100) * 251.2);

    // Agregasi Penjualan Nyata 7 Hari Terakhir (Zona Waktu Lokal)
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

    // SVG smooth trend line across 7 days
    const trendCoords = omzSeries.map((val, idx) => {
      const x = 15 + idx * 45;
      const y = 44 - Math.round((Number(val || 0) / maxVal) * 34);
      return `${x},${y}`;
    }).join(' ');

    // Distribusi Metode Pembayaran & Layanan Kasir
    const payTotals = {};
    validSales.forEach((p) => {
      const mt = String(p.metode_bayar || 'TUNAI').toUpperCase();
      payTotals[mt] = (payTotals[mt] || 0) + Number(p.grand_total || 0);
    });
    const payRows = Object.keys(payTotals).map((k) => ({ name: k, total: payTotals[k] })).sort((a, b) => b.total - a.total);
    const payDenom = payRows.reduce((s, r) => s + r.total, 0) || 1;
    const payColors = { TUNAI: '#10B981', QRIS: '#0066FE', TRANSFER: '#0284C7', SPLIT: '#F59E0B', TEMPO: '#D97706' };

    // Top-5 Obat Terlaris dari transaksi LUNAS/valid (kecualikan RETUR)
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
    const canPos = S().canAccessView('pos');
    const canObat = S().canAccessView('obat');
    const canPoct = S().canAccessView('pemeriksaan');
    const canGudang = S().canAccessView('gudang');
    const canShift = S().canAccessView('tutup-shift');
    const canFin = S().canAccessView('finance');
    const canErx = S().canAccessView('eresep-prb');
    const canOnline = S().canAccessView('omnichannel');

    const vsAvgPct = avg7Hari > 0 && omzetHariIni > 0 ? Math.round(((omzetHariIni - avg7Hari) / avg7Hari) * 100) : null;
    const topMaxQty = topObatList.length ? Math.max(1, Number(topObatList[0].qty || 1)) : 1;

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
        onClick: seeCost && S().canAccessView('defecta') ? `navigateView('defecta','sp')` : (!seeCost && canObat ? `navigateView('obat','obat')` : '')
      },
      {
        title: 'Monitor Suhu (2&ndash;8&deg;C)',
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
        onClick: seeCost && S().canAccessView('defecta') ? `navigateView('defecta','order')` : (canGudang ? `navigateView('gudang','batch')` : '')
      },
      {
        label: 'Antrean Validasi E-Resep APJ',
        count: erxAntre,
        dotCls: 'bg-blue-500',
        pillCls: 'bg-blue-500/15 text-blue-600',
        onClick: canErx ? `navigateView('eresep-prb','erx')` : ''
      },
      {
        label: 'Pasien Kontrol Refill (&le;5 hari)',
        count: prbUrgentCount,
        dotCls: prbUrgentCount ? 'bg-blue-500' : 'bg-slate-400',
        pillCls: 'bg-blue-500/15 text-blue-600',
        onClick: canErx ? `navigateView('eresep-prb','prb')` : ''
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

    return `<div class="space-y-4 ons-view-enter">
      <!-- Fluid Hero Greeting Cockpit (2-Tier Non-Truncating Layout) -->
      <div class="ons-hero-welcome p-4 sm:p-6 space-y-4">
        <div class="flex items-start gap-3.5 sm:gap-4 min-w-0">
          <div class="relative shrink-0 pt-0.5">
            <img src="${S().esc(fotoPem && S().getRole() === 'Pemilik' ? fotoPem : usahaLogo)}" alt="${S().esc(usahaNama)}" class="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border-2 border-white/90 dark:border-slate-700 shadow-md object-cover bg-white"/>
            <span class="absolute -bottom-1 -right-1 w-4 h-4 rounded-full ${activeShift ? 'bg-emerald-500' : 'bg-amber-500'} border-2 border-white dark:border-slate-800" title="${activeShift ? 'Shift Kasir Terbuka' : 'Shift Belum Dibuka'}"></span>
          </div>
          <div class="flex-1 min-w-0 space-y-1.5">
            <div class="flex flex-wrap items-center gap-1.5">
              <span class="badge-bpom bpom-bebas">${S().esc(fullDateLabel)}</span>
              <span class="badge-bpom bpom-terbatas">${(S().isMultiBranchEnabled && S().isMultiBranchEnabled()) ? ('Cabang ' + S().esc(cabId)) : 'Outlet Utama'} &bull; ${S().esc(S().getRole())}</span>
              ${canShift ? `<button type="button" onclick="navigateView('pos','tutup-shift')" class="badge-bpom ${activeShift ? 'bpom-bebas' : 'bpom-prekursor'} cursor-pointer">${activeShift ? 'Shift Aktif: ' + S().esc(activeShift.kasir_nama || activeShift.id_shift || 'Buka') : 'Shift Belum Dibuka'}</button>` : ''}
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
            ${canPos ? `<button onclick="navigateView('pos','kasir')" class="ons-btn ons-btn-primary text-xs px-4 shadow-sm">Buka Kasir POS (F2)</button>` : ''}
            ${canPoct ? `<button onclick="navigateView('pemeriksaan','semua')" class="ons-btn ons-btn-ghost text-xs">Pemeriksaan Pasien</button>` : ''}
            ${canObat ? `<button onclick="navigateView('obat')" class="ons-btn ons-btn-ghost text-xs">Master Obat (${st.masterObat.length})</button>` : ''}
            <button type="button" onclick="if(window.openCommandPalette)window.openCommandPalette()" class="ons-btn ons-btn-ghost text-xs" title="Pusat Pencarian &amp; Navigasi Cepat">Cari Cepat <span class="ons-shortcut-kbd ml-1">Ctrl+K</span></button>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            ${seeCost ? `<button onclick="window.openOwnerDailyDigestModal()" class="ons-btn ons-btn-emerald text-xs" title="Kirim Ringkasan Harian ke WA Pemilik">Rekap WA Pemilik</button>` : ''}
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

      <!-- Baris Tengah: Tren 7 Hari + Agenda Prioritas + Kepatuhan BPOM -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div class="ons-card p-5 lg:col-span-5 flex flex-col justify-between gap-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 class="font-bold text-sm">Tren ${seeCost ? 'Omzet vs Laba Kotor' : 'Penjualan'} 7 Hari</h3>
              <div class="text-[11px]" style="color:var(--ons-text-soft)">Performa penjualan harian ${(S().isMultiBranchEnabled && S().isMultiBranchEnabled()) ? ('cabang ' + S().esc(cabId)) : 'outlet aktif'}</div>
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
            <span class="text-[11px] font-mono-num px-2 py-0.5 rounded-lg border" style="background:var(--ons-bg-subtle);border-color:var(--ons-border);color:var(--ons-text-soft)">${todayIso}</span>
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
            <span class="badge-bpom bpom-bebas">SIAP AUDIT</span>
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
              return `<div class="p-2.5 rounded-xl border transition hover:border-blue-500 space-y-1.5" style="border-color:var(--ons-border);background:var(--ons-bg-subtle)">
                <div class="flex items-center justify-between gap-2">
                  <div class="flex items-center gap-2.5 min-w-0">
                    <span class="w-6 h-6 rounded-full ${rankBadgeCls} font-extrabold text-[11px] flex items-center justify-center shrink-0">${idx + 1}</span>
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
                  <td><span class="badge-bpom ${badgeCls} font-mono-num">${dayTxt}</span></td>
                  <td class="font-mono-num font-bold">${b.qty_sisa}</td>
                  <td>${canPos ? `<button onclick="navigateView('pos','kasir')" class="ons-btn ons-btn-ghost text-xs py-1 px-2.5">${d < 0 ? 'Cek Recall' : 'Prioritaskan Jual'}</button>` : '-'}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>` : `<div class="py-6 text-center text-xs rounded-xl border border-dashed" style="color:var(--ons-text-soft);border-color:var(--ons-border)">Belum ada stok batch aktif${(S().isMultiBranchEnabled && S().isMultiBranchEnabled()) ? (' pada cabang ' + S().esc(cabId)) : ''}.</div>`}
      </div>
    </div>`;
  }

  /**
   * W-03: Kasir POS Next-Gen v11 (Kasir FEFO, Split Pay, Poin, Riwayat/Retur PIN & Struk Thermal)
   */
  let posSubTab = 'kasir';
  let posHistQ = '';
  let posHistFilter = 'SEMUA';
  let posHistMethod = 'SEMUA';
  let posHistPeriod = 'ALL';
  let posStockFilter = 'ALL'; // ALL | READY | LOW | NEAR_ED
  let posCatalogView = (typeof localStorage !== 'undefined' && localStorage.getItem('ons_pos_view')) || 'GRID';
  let posBeepEnabled = typeof localStorage !== 'undefined' ? (localStorage.getItem('ons_pos_beep') !== '0') : true;

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
    if (!grid) {
      global.renderActiveView();
      return;
    }
    const cart = getPosActiveCart();
    const catalog = getFilteredPosCatalog();
    grid.className = posCatalogView === 'LIST'
      ? 'space-y-2 max-h-[66vh] overflow-y-auto pr-1'
      : 'grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[66vh] overflow-y-auto pr-1';
    grid.innerHTML = renderPosCatalogCardsHtml(catalog, cart);
    const metaEl = document.getElementById('posCatalogMeta');
    if (metaEl) metaEl.textContent = `${catalog.length} dari ${(S().AppState.masterObat || []).length} item`;
    const clrBtn = document.getElementById('posSearchClearBtn');
    if (clrBtn) clrBtn.classList.toggle('hidden', !String(S().AppState.posSearchQ || '').trim());
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
    const todayIso = new Date().toISOString().slice(0, 10);
    const sevenDaysMs = Date.now() - 7 * 86400000;
    const thirtyDaysMs = Date.now() - 30 * 86400000;
    return (salesList || []).filter((p) => {
      if (posHistPeriod === 'TODAY') return String(p.tanggal || '').slice(0, 10) === todayIso;
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
        const hay = `${p.no_invoice || ''} ${p.channel || ''} ${p.metode_bayar || ''} ${p.kasir_id || ''} ${p.id_member || ''} ${mem ? mem.nama_pasien : ''} ${p.detail_split || ''} ${p.apj_override_id || ''} ${p.retur_alasan || ''} ${itemNames}`.toLowerCase();
        if (!hay.includes(hq)) return false;
      }
      return true;
    });
    return { periodRows, filtered };
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

    const rowsHtml = filteredSales.slice(0, 80).map((p) => {
      const mem = (st.members || []).find((m) => m.id_member === p.id_member);
      const ret = _extractPosReturInfo(p, st.mutasiStok);
      const items = _getPosItemsForTrx(st, p);
      const itemPreview = items.length
        ? items.slice(0, 2).map((it) => {
            const qtyRet = Number(it.qty_retur || 0);
            const qtySisa = Math.max(0, Number(it.qty || 0) - qtyRet);
            return `${S().esc(it.nama_dagang || it.id_obat)} &times;${qtyRet > 0 ? `${qtySisa}<span class="text-amber-600">(ret:${qtyRet})</span>` : Number(it.qty || 1)}`;
          }).join(', ') + (items.length > 2 ? ` <span class="font-semibold">(+${items.length - 2} obat)</span>` : '')
        : '';
      const statusUp = String(p.status_trx || 'LUNAS').toUpperCase();
      const statusCls = ret.isFullRetur ? 'bpom-keras' : (ret.isPartialRetur ? 'bpom-prekursor' : (statusUp === 'BELUM_LUNAS' ? 'bpom-prekursor' : 'bpom-bebas'));
      const statusLabel = ret.isFullRetur ? '&#8617; DIRETUR / VOID' : (ret.isPartialRetur ? '&#8617; RETUR SEBAGIAN' : (statusUp === 'BELUM_LUNAS' ? 'TEMPO / BELUM LUNAS' : 'LUNAS'));
      const metodeCls = _getPosMethodBadgeTone(p.metode_bayar);

      return `<tr class="${ret.isFullRetur ? 'ons-trx-row-retur' : ''}">
        <td class="text-xs align-top">
          <div class="flex flex-wrap items-center gap-1.5">
            <button type="button" onclick="window.openPosDetailItemsModal('${S().esc(p.no_invoice)}')" class="font-mono-num font-bold hover:underline text-left ${ret.isFullRetur ? 'text-red-700 dark:text-red-300' : 'text-blue-600 dark:text-blue-400'}">${S().esc(p.no_invoice)}</button>
            ${ret.isFullRetur ? '<span class="ons-retur-stamp">&#8617; RETUR / VOID</span>' : (ret.isPartialRetur ? '<span class="badge-bpom bpom-prekursor text-[10px]">&#8617; SEBAGIAN</span>' : '')}
          </div>
          <div class="font-mono-num text-[11px] mt-0.5" style="color:var(--ons-text-soft)">${S().formatTgl(p.tanggal, true)}</div>
          <div class="text-[10px]" style="color:var(--ons-text-soft)">Kasir: <b>${S().esc(p.kasir_id || '-')}</b> &bull; ${S().esc(p.channel || 'Toko Fisik')}</div>
        </td>
        <td class="text-xs align-top max-w-[300px]">
          <div class="font-bold">${S().esc(mem ? mem.nama_pasien : (p.id_member && p.id_member !== 'UMUM' ? p.id_member : 'Pasien Umum'))}</div>
          ${itemPreview ? `<div class="text-[11px] mt-0.5 truncate" style="color:var(--ons-text-soft)">${itemPreview}</div>` : `<div class="text-[10px] mt-0.5" style="color:var(--ons-text-soft)">Klik Rincian untuk lihat daftar obat</div>`}
          ${ret.hasReturHistory ? `<div class="ons-retur-trace-pill">
            <div class="font-bold ${ret.isFullRetur ? 'text-red-700 dark:text-red-300' : 'text-amber-700 dark:text-amber-300'}">&#8617; Otorisasi ${ret.isPartialRetur ? 'Retur Sebagian' : 'Retur'}: ${S().esc(ret.authorizer)}</div>
            <div class="text-[10px]" style="color:var(--ons-text-soft)">Alasan: <i>${S().esc(ret.alasan)}</i> &bull; <b class="text-emerald-700 dark:text-emerald-300">${ret.restoredQty > 0 ? '+' + ret.restoredQty + ' qty ' : ''}Stok FEFO dipulihkan</b></div>
          </div>` : ''}
        </td>
        <td class="text-xs align-top">
          <div class="flex flex-wrap items-center gap-1.5">
            <span class="inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-bold ${metodeCls}">${S().esc(p.metode_bayar || 'TUNAI')}</span>
            ${p.detail_split ? `<span class="text-[10px]" style="color:var(--ons-text-soft)">${S().esc(p.detail_split)}</span>` : ''}
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
    }).join('') || `<tr><td colspan="5" class="text-center py-8 text-xs">
      <div class="font-semibold mb-1">Tidak ada riwayat transaksi yang cocok dengan filter ini.</div>
      <button type="button" onclick="window.resetPosHistFilters()" class="ons-btn ons-btn-ghost text-[11px] py-1 px-3 mt-1">Reset Filter Pencarian</button>
    </td></tr>`;

    return { summaryHtml, rowsHtml };
  }

  function _syncPosHistoryDomOnly() {
    const tbody = document.getElementById('posHistoryTableBody');
    if (!tbody) {
      global.renderActiveView();
      return;
    }
    const st = S().AppState;
    const { filtered } = _getFilteredPosHistoryRows(st);
    const { summaryHtml, rowsHtml } = _renderPosHistorySummaryAndRowsHtml(st, filtered);
    tbody.innerHTML = rowsHtml;
    const sumEl = document.getElementById('posHistorySummaryLine');
    if (sumEl) sumEl.innerHTML = summaryHtml;
    const clrBtn = document.getElementById('posHistClearBtn');
    if (clrBtn) clrBtn.classList.toggle('hidden', !posHistQ.trim());
  }

  function renderPosHistoryView(st, subTabHeader) {
    const seeCost = S().canSeeFinancialCost ? S().canSeeFinancialCost() : false;
    const { periodRows, filtered: filteredSales } = _getFilteredPosHistoryRows(st);
    const { summaryHtml, rowsHtml } = _renderPosHistorySummaryAndRowsHtml(st, filteredSales);
    const ds = buildPosDailySummaryStats(st.penjualan, seeCost);
    const marginPct = ds.omzetToday > 0 ? Math.round((ds.labaToday / ds.omzetToday) * 1000) / 10 : 0;

    const allReturRows = (st.penjualan || []).filter((p) => String(p.status_trx || '').toUpperCase() === 'RETUR');
    const allReturNominal = allReturRows.reduce((s, p) => s + Number(p.grand_total || 0), 0);
    const periodLunasCount = periodRows.filter((p) => String(p.status_trx || 'LUNAS').toUpperCase() === 'LUNAS').length;
    const periodTempoCount = periodRows.filter((p) => String(p.status_trx || '').toUpperCase() === 'BELUM_LUNAS').length;
    const periodReturCount = periodRows.filter((p) => String(p.status_trx || '').toUpperCase() === 'RETUR').length;

    return `<div class="space-y-4 ons-view-enter">
      ${subTabHeader}
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
          <div>
            <h2 class="font-bold text-base">Riwayat Transaksi Kasir</h2>
            <p class="text-xs" style="color:var(--ons-text-soft)">Pantau nota penjualan, filter status lunas atau retur, cetak ulang struk thermal, &amp; proses retur/void ber-PIN APJ/Pemilik.</p>
          </div>
          <div class="flex flex-wrap items-center gap-1.5">
            ${[
              { id: 'ALL', lbl: 'Semua Waktu' },
              { id: 'TODAY', lbl: 'Hari Ini' },
              { id: '7D', lbl: '7 Hari' },
              { id: '30D', lbl: '30 Hari' }
            ].map((pr) => `<button type="button" onclick="window.setPosHistPeriod('${pr.id}')" class="ons-pos-chip ${posHistPeriod === pr.id ? 'is-active' : ''}">${pr.lbl}</button>`).join('')}
            <button type="button" onclick="window.exportPosHistoryExcel('xlsx')" class="ons-btn ons-btn-emerald text-xs ml-1">Export Excel</button>
            <button type="button" onclick="window.exportPosHistoryExcel('csv')" class="ons-btn ons-btn-ghost text-xs">CSV</button>
            <button type="button" onclick="window.exportPosHistoryExcel('pdf')" class="ons-btn ons-btn-ghost text-xs">Cetak PDF</button>
            <button type="button" onclick="bootLoadState(true)" class="ons-btn ons-btn-primary text-xs">Segarkan</button>
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex flex-wrap items-center gap-1.5">
            ${[
              { id: 'SEMUA', lbl: 'Semua Status', cnt: periodRows.length, tone: '' },
              { id: 'LUNAS', lbl: 'Lunas', cnt: periodLunasCount, tone: '' },
              { id: 'BELUM_LUNAS', lbl: 'Tempo', cnt: periodTempoCount, tone: '' },
              { id: 'RETUR', lbl: 'Retur / Void', cnt: periodReturCount, tone: 'retur' }
            ].map((sf) => {
              const active = posHistFilter === sf.id;
              const returCls = sf.tone === 'retur' && sf.cnt > 0
                ? (active ? 'border-red-600 bg-red-600 text-white' : 'border-red-500/45 text-red-700 dark:text-red-300 bg-red-500/10')
                : '';
              return `<button type="button" onclick="window.setPosHistFilter('${sf.id}')" class="ons-pos-chip ${active && !returCls ? 'is-active' : ''} ${returCls}">
                ${sf.tone === 'retur' && sf.cnt > 0 ? '&#8617; ' : ''}${sf.lbl} (<span class="font-mono-num">${sf.cnt}</span>)
              </button>`;
            }).join('')}
          </div>
          <div class="flex flex-wrap items-center gap-2 flex-1 min-w-[260px] justify-end">
            <div class="relative flex-1 min-w-[190px] max-w-sm">
              <input id="posHistSearchInp" class="ons-input text-xs pr-7" placeholder="Cari No. Invoice, Pasien, Kasir, atau Obat..." value="${S().esc(posHistQ)}" oninput="window.setPosHistQ(this.value)"/>
              <button id="posHistClearBtn" type="button" onclick="window.setPosHistQ('')" aria-label="Bersihkan pencarian" class="${posHistQ.trim() ? '' : 'hidden '}absolute right-2 top-1/2 -translate-y-1/2 text-sm px-1 font-bold" style="color:var(--ons-text-soft)">&times;</button>
            </div>
            <select aria-label="Filter metode pembayaran" class="ons-select text-xs w-40" onchange="window.setPosHistMethod(this.value)">
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

        <div id="posHistorySummaryLine">${summaryHtml}</div>

        <div class="ons-table-wrap">
          <table class="ons-table">
            <thead><tr><th>No. Invoice &amp; Waktu</th><th>Pasien, Obat &amp; Penanda</th><th>Metode &amp; Total</th><th>Status</th><th>Aksi</th></tr></thead>
            <tbody id="posHistoryTableBody">${rowsHtml}</tbody>
          </table>
        </div>
      </div>
    </div>`;
  }

  function renderPosCartPanelHtml(st, cart, member, cdss, grandTotal, subtotal, itemDiscTotal, subAfterItemDisc, estHppCart, isBelowHppCart, seeCost) {
    const totalQtyUnits = cart.items.reduce((s, it) => s + Number(it.qty || 0), 0);
    const crossSell = pickSmartCrossSellCandidate(cart, st.masterObat);

    return `<div class="ons-pos-ticket space-y-3">
      <!-- Header Tiket Antrean -->
      <div class="flex items-center justify-between gap-2 pb-2 border-b" style="border-color:var(--ons-border)">
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <span class="ons-pos-live-dot"></span>
            <h3 class="font-extrabold text-sm truncate">${S().esc(cart.label || 'Keranjang Aktif')}</h3>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono-num" style="background:var(--ons-bg-subtle);color:var(--ons-text-soft)">${cart.items.length} item &bull; ${totalQtyUnits} qty</span>
          </div>
          ${cart.held_note ? `<div class="text-[11px] text-amber-600 font-semibold truncate mt-0.5">Catatan: ${S().esc(cart.held_note)}</div>` : ''}
        </div>
        ${cart.items.length ? `<button type="button" onclick="window.openClearPosCartModal()" class="ons-btn ons-btn-ghost text-[11px] text-red-600 py-1 px-2 min-h-0 h-7 shrink-0">Kosongkan</button>` : ''}
      </div>

      <!-- Channel, Member & Tier Harga -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div>
          <label class="text-[11px] font-semibold block mb-1">Channel Penjualan</label>
          <select onchange="ONSStore.AppState.carts[ONSStore.AppState.activeCartIdx].channel=this.value" class="ons-select text-xs py-1.5 min-h-0 h-8">
            ${['Toko Fisik', 'Resep WA', 'Pasien Rutin'].map((ch) => `<option ${cart.channel === ch ? 'selected' : ''}>${ch}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="text-[11px] font-semibold block mb-1">Pasien / Member Apotek</label>
          <select onchange="window.onPosMemberChange(this.value)" class="ons-select text-xs py-1.5 min-h-0 h-8">
            <option value="UMUM" ${cart.id_member === 'UMUM' ? 'selected' : ''}>Pasien Umum</option>
            ${st.members.map((m) => `<option value="${m.id_member}" ${cart.id_member === m.id_member ? 'selected' : ''}>${S().esc(m.nama_pasien)} (${S().esc(S().formatMemberProgram ? S().formatMemberProgram(m.program_prb) : m.program_prb)})</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="text-[11px] font-semibold block mb-1">Tier Harga</label>
          <select onchange="window.setPosPriceTier(this.value)" class="ons-select text-xs py-1.5 min-h-0 h-8">
            ${[
              { id: 'UMUM', lbl: 'Eceran Umum' },
              { id: 'MEMBER', lbl: 'Member Apotek' },
              { id: 'GROSIR', lbl: 'Grosir (B2B)' },
              { id: 'FASKES', lbl: 'Faskes / Klinik' }
            ].map((t) => `<option value="${t.id}" ${(cart.tier_harga || (cart.id_member !== 'UMUM' ? 'MEMBER' : 'UMUM')) === t.id ? 'selected' : ''}>${t.lbl}</option>`).join('')}
          </select>
        </div>
      </div>

      ${member ? `<div class="p-2.5 rounded-xl border text-xs flex flex-wrap items-center justify-between gap-2" style="background:var(--ons-primary-tint);border-color:var(--ons-primary);">
        <div class="min-w-0 flex-1"><b>Alergi:</b> <span class="text-red-600 font-bold">${S().esc(member.alergi_list || 'Tidak Ada')}</span> &bull; <b>Kondisi:</b> ${S().esc(member.penyakit_kronis || '-')}</div>
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

      <!-- Daftar Item Keranjang -->
      <div class="space-y-2 ons-pos-cart-scroll border-y py-2" style="border-color:var(--ons-border)">
        ${cart.items.length ? cart.items.map((it, idx) => {
          const ob = st.masterObat.find((o) => o.id_obat === it.id_obat);
          const nearIt = S().getNearEdBatchInfo ? S().getNearEdBatchInfo(it.id_obat, 90) : { hasNearEd: false };
          const grossLine = Number(it.harga_jual || 0) * Number(it.qty || 1);
          const netLine = Math.max(0, grossLine - Number(it.diskon_item || 0));
          const hppLine = Number((ob && ob.hpp_avg) || 0) * Number(it.qty || 1) * Math.max(1, Number(it.faktor_konversi || 1));
          const itemBelowHpp = hppLine > 0 && netLine < hppLine;
          return `<div class="ons-pos-cart-item text-xs space-y-1.5">
            <div class="flex items-start justify-between gap-2">
              <div class="flex-1 min-w-0">
                <div class="font-bold leading-snug truncate">${S().esc(it.nama_dagang)} ${it.tier_applied === 'GROSIR_AUTO' ? '<span class="badge-bpom bpom-bebas text-[9px]">GROSIR OTOMATIS</span>' : ''}</div>
                <div class="text-[11px] font-mono-num" style="color:var(--ons-text-soft)">${S().rp(it.harga_jual)} / ${S().esc(it.satuan)} &times; ${it.faktor_konversi} dasar ${Number(it.diskon_item || 0) > 0 ? `<span class="text-emerald-600 font-bold">(-${S().rp(it.diskon_item)})</span>` : ''} ${itemBelowHpp ? `<span class="text-red-600 font-bold">${seeCost ? '[RUGI &lt; HPP]' : '[Perlu PIN APJ]'}</span>` : ''}</div>
              </div>
              <div class="text-right shrink-0">
                <div class="font-extrabold font-mono-num text-sm text-blue-600">${S().rp(netLine)}</div>
                ${Number(it.diskon_item || 0) > 0 ? `<div class="text-[10px] font-mono-num line-through" style="color:var(--ons-text-soft)">${S().rp(grossLine)}</div>` : ''}
              </div>
            </div>
            <div class="flex flex-wrap items-center justify-between gap-1.5">
              <div class="flex items-center gap-1.5">
                <div class="ons-pos-stepper">
                  <button type="button" onclick="window.posStepQty(${idx}, -1)" title="Kurangi qty">&minus;</button>
                  <input type="number" min="1" value="${it.qty}" onchange="window.posUpdateQty(${idx}, this.value)"/>
                  <button type="button" onclick="window.posStepQty(${idx}, 1)" title="Tambah qty">+</button>
                </div>
                <select onchange="window.posChangeUnit(${idx}, this.value)" class="ons-select text-[11px] py-1 px-1.5 min-h-0 h-8 w-20">
                  ${it.unitOptions.map((u) => `<option value="${u.label}" ${u.label === it.satuan ? 'selected' : ''}>${u.label}</option>`).join('')}
                </select>
              </div>
              <div class="flex items-center gap-1">
                <button type="button" onclick="window.openCartEtiketModal(${idx})" class="ons-btn ons-btn-ghost text-[10px] py-1 px-2 min-h-0 h-8" title="Cetak Etiket Obat Putih/Biru">Etiket</button>
                <button type="button" onclick="window.posRemoveItem(${idx})" class="ons-btn ons-btn-danger text-xs px-2 py-1 min-h-0 h-8" title="Hapus item">&times;</button>
              </div>
            </div>
            <div class="flex flex-wrap items-center gap-1.5 pt-0.5">
              <span class="text-[10px] font-semibold shrink-0" style="color:var(--ons-text-soft)">Signa:</span>
              <select onchange="window.posSetAturanPakai(${idx}, this.value);renderActiveView();" class="ons-select text-[11px] py-0.5 px-1.5 min-h-0 h-7 flex-1">
                ${['', '3 x 1 Sesudah Makan', '3 x 1 Sebelum Makan', '2 x 1 Sesudah Makan', '1 x 1 Malam Hari', '1 x 1 Pagi Hari', 'Oles Tipis 2x Sehari (Obat Luar)'].map((opt) => `<option value="${S().esc(opt)}" ${(it.aturan_pakai || '') === opt ? 'selected' : ''}>${opt || 'Standar / Sesuai Etiket'}</option>`).join('')}
              </select>
              ${['3 x 1 Sesudah Makan', '2 x 1 Sesudah Makan', '1 x 1 Malam Hari'].map((p) => `<button type="button" onclick="window.posSetAturanPakai(${idx}, '${p}');renderActiveView();" class="ons-pos-signa-chip">${p.slice(0, 5)}</button>`).join('')}
              ${nearIt.hasNearEd ? `<button type="button" onclick="window.applyNearEdDiscountToItem(${idx})" class="ons-btn ons-btn-amber text-[10px] py-0.5 px-2 min-h-0 h-7">Promo ED -${nearIt.suggestedDiscPct}%</button>` : ''}
            </div>
          </div>`;
        }).join('') : `<div class="text-center py-8 px-4 space-y-1.5">
          <div class="text-sm font-bold" style="color:var(--ons-text-main)">Keranjang Siap Melayani</div>
          <div class="text-xs" style="color:var(--ons-text-soft)">Klik kartu obat di panel kiri, tekan <span class="ons-shortcut-kbd">F2</span> lalu scan barcode, atau gunakan pencarian cepat.</div>
        </div>`}
      </div>

      ${crossSell ? `<div class="p-2.5 rounded-xl border text-[11px] flex items-center justify-between gap-2" style="border-color:var(--ons-border);background:rgba(16,185,129,0.06)">
        <div class="min-w-0">
          <div class="font-bold text-emerald-700 dark:text-emerald-300">Saran Pendamping Apoteker</div>
          <div class="truncate" style="color:var(--ons-text-soft)"><b>${S().esc(crossSell.nama_dagang)}</b> &bull; <span class="font-mono-num">${S().rp(crossSell.harga_umum)}/${S().esc(crossSell.satuan_dasar)}</span></div>
        </div>
        <button type="button" onclick="window.posAddToCart('${S().esc(crossSell.id_obat)}')" class="ons-btn ons-btn-emerald text-[11px] py-1 px-2.5 min-h-0 h-7 shrink-0">+ Tambah</button>
      </div>` : ''}

      <!-- Ringkasan Nominal & Diskon -->
      <div class="ons-pos-ledger space-y-2 text-xs">
        <div class="flex justify-between items-center">
          <span style="color:var(--ons-text-soft)">Subtotal (${cart.items.length} item &bull; ${totalQtyUnits} qty)</span>
          <span class="font-mono-num font-bold text-sm">${S().rp(subtotal)}</span>
        </div>
        ${itemDiscTotal > 0 ? `<div class="flex justify-between text-emerald-600 font-semibold">
          <span>Diskon Promo Item (Near-ED)</span>
          <span class="font-mono-num">-${S().rp(itemDiscTotal)}</span>
        </div>` : ''}
        <div class="flex flex-wrap justify-between items-center gap-1.5">
          <div class="flex items-center gap-1.5">
            <span class="font-semibold">Diskon</span>
            <button type="button" onclick="window.toggleCartDiscMode()" class="ons-quick-denom py-0.5 px-2 text-[10px]">${cart.diskon_mode === 'PCT' ? '% Persen' : 'Rp Nominal'}</button>
          </div>
          <div class="flex items-center gap-1.5">
            <input type="number" min="0" max="${cart.diskon_mode === 'PCT' ? 100 : subAfterItemDisc}" value="${cart.diskon_input || 0}" onchange="window.applyCartDiscInput(this.value)" class="ons-input font-mono-num text-right text-xs w-24 py-1 min-h-0 h-7"/>
            ${cart.diskon_mode === 'PCT' && cart.diskon_global > 0 ? `<span class="text-[11px] font-mono-num text-emerald-600 font-bold">-${S().rp(cart.diskon_global)}</span>` : ''}
          </div>
        </div>
        ${cart.items.length ? `<div class="flex flex-wrap gap-1 pt-0.5">
          <button type="button" onclick="window.applyPosDiscPreset('PCT', 0)" class="ons-quick-denom text-[10px] py-0.5 px-1.5">Reset 0</button>
          <button type="button" onclick="window.applyPosDiscPreset('PCT', 5)" class="ons-quick-denom text-[10px] py-0.5 px-1.5">Disc 5%</button>
          <button type="button" onclick="window.applyPosDiscPreset('PCT', 10)" class="ons-quick-denom text-[10px] py-0.5 px-1.5">Disc 10%</button>
          <button type="button" onclick="window.applyPosDiscPreset('RP', 5000)" class="ons-quick-denom text-[10px] py-0.5 px-1.5">-Rp 5rb</button>
          <button type="button" onclick="window.applyPosDiscPreset('RP', 10000)" class="ons-quick-denom text-[10px] py-0.5 px-1.5">-Rp 10rb</button>
        </div>` : ''}
        <div class="flex justify-between items-baseline border-t pt-2" style="border-color:var(--ons-border)">
          <span class="text-sm font-extrabold tracking-wide">TOTAL BAYAR</span>
          <span class="text-xl font-extrabold font-mono-num text-blue-600">${S().rp(grandTotal)}</span>
        </div>
        ${seeCost && cart.items.length ? `<div class="flex justify-between text-[11px] font-mono-num" style="color:var(--ons-text-soft)">
          <span>Est. Laba Kotor (vs HPP ${S().rp(estHppCart)})</span>
          <span class="${(grandTotal - estHppCart) >= 0 ? 'text-emerald-600 font-bold' : 'text-red-600 font-bold'}">${S().rp(grandTotal - estHppCart)}</span>
        </div>` : ''}
      </div>

      <!-- Tombol Pembayaran -->
      <div class="grid grid-cols-2 sm:grid-cols-5 gap-1.5 text-xs">
        <button onclick="window.openPosCheckoutModal('TUNAI', ${grandTotal})" class="ons-pos-paybtn bg-emerald-600 text-white shadow-sm">
          <span class="text-[10px] opacity-85">[F4]</span><span>Tunai</span>
        </button>
        <button onclick="window.openPosCheckoutModal('QRIS', ${grandTotal})" class="ons-pos-paybtn bg-blue-600 text-white shadow-sm">
          <span class="text-[10px] opacity-85">[F8]</span><span>QRIS BI</span>
        </button>
        <button onclick="window.openPosCheckoutModal('TRANSFER', ${grandTotal})" class="ons-pos-paybtn border" style="background:var(--ons-bg-subtle);border-color:var(--ons-border);color:var(--ons-text-main)">
          <span class="text-[10px] opacity-75">EDC</span><span>Transfer</span>
        </button>
        <button onclick="window.openPosCheckoutModal('SPLIT', ${grandTotal})" class="ons-pos-paybtn border" style="background:var(--ons-bg-subtle);border-color:var(--ons-border);color:var(--ons-text-main)">
          <span class="text-[10px] opacity-75">2 Cara</span><span>Split Pay</span>
        </button>
        <button onclick="window.openPosCheckoutModal('PIUTANG', ${grandTotal})" class="ons-pos-paybtn bg-amber-500 text-white col-span-2 sm:col-span-1 shadow-sm" title="Tempo / Piutang Pelanggan & Mitra Dokter">
          <span class="text-[10px] opacity-85">Tempo</span><span>Piutang/Tempo</span>
        </button>
      </div>
      <div class="flex flex-wrap gap-1.5 text-[10px] items-center justify-center pt-0.5" style="color:var(--ons-text-soft)">
        <span class="ons-shortcut-kbd">F2</span> Scan
        <span class="ons-shortcut-kbd">F4</span> Tunai
        <span class="ons-shortcut-kbd">F8</span> QRIS
        <span class="ons-shortcut-kbd">F9</span> Hold Antrean
        <span class="ons-shortcut-kbd">Esc</span> Tutup
      </div>
      ${cart.items.length ? `<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button onclick="window.openCartEtiketModal(0)" class="ons-btn ons-btn-ghost w-full text-xs">Cetak Etiket (${cart.items.length} Item)</button>
        <button onclick="window.openCopyResepFromPosModal()" class="ons-btn ons-btn-ghost w-full text-xs">Tebus Sebagian &amp; Copy Resep (p.c.c)</button>
      </div>` : ''}
    </div>`;
  }

  function renderPosView() {
    const st = S().AppState;
    posSubTab = (st.subTabs && st.subTabs.pos) || posSubTab || 'kasir';
    if (posSubTab === 'online') posSubTab = 'kasir';
    const cart = getPosActiveCart();
    if (!cart.diskon_mode) cart.diskon_mode = 'RP';
    if (cart.diskon_input === undefined) cart.diskon_input = Number(cart.diskon_global || 0);
    const member = st.members.find((m) => m.id_member === cart.id_member);
    const cdss = S().checkCartCdss(cart);
    const fGol = st.posFilterGol || '';

    const returCountPos = (st.penjualan || []).filter((p) => String(p.status_trx || '').toUpperCase() === 'RETUR').length;
    const subTabHeader = `
      <div class="flex flex-wrap items-center justify-between gap-2 ons-view-enter">
        <div class="ons-tab-bar">
          <button onclick="window.setPosSubTab('kasir')" class="ons-tab-btn ${posSubTab === 'kasir' ? 'active' : ''}">Kasir Aktif (${cart.items.length})</button>
          <button onclick="window.setPosSubTab('riwayat')" class="ons-tab-btn ${posSubTab === 'riwayat' ? 'active' : ''}">Riwayat Transaksi (${st.penjualan.length})${returCountPos > 0 ? ` <span class="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/15 text-red-600 dark:text-red-300">${returCountPos} Retur</span>` : ''}</button>
          ${(S().canAccessSubTab && S().canAccessSubTab('pos', 'tutup-shift')) ? `<button onclick="window.setPosSubTab('tutup-shift')" class="ons-tab-btn ${posSubTab === 'tutup-shift' ? 'active' : ''}">Tutup Shift &amp; Kas${st.activeShift ? ' <span class="ml-1 inline-block w-2 h-2 rounded-full bg-emerald-500"></span>' : ''}</button>` : ''}
        </div>
      </div>`;

    if (posSubTab === 'riwayat') {
      return renderPosHistoryView(st, subTabHeader);
    }
    if (posSubTab === 'tutup-shift' && global.ONSViewsClinicalFinanceAdmin && typeof global.ONSViewsClinicalFinanceAdmin.renderTutupShiftView === 'function') {
      return global.ONSViewsClinicalFinanceAdmin.renderTutupShiftView({ embeddedInPos: true, subTabHeader });
    }

    const catalog = getFilteredPosCatalog();
    const subtotal = cart.items.reduce((s, it) => s + Number(it.harga_jual) * Number(it.qty), 0);
    const itemDiscTotal = cart.items.reduce((s, it) => s + Number(it.diskon_item || 0), 0);
    const subAfterItemDisc = Math.max(0, subtotal - itemDiscTotal);
    if (cart.diskon_mode === 'PCT') {
      const pct = Math.min(100, Math.max(0, Number(cart.diskon_input || 0)));
      cart.diskon_global = Math.round(subAfterItemDisc * (pct / 100));
    } else {
      cart.diskon_global = Math.min(subAfterItemDisc, Math.max(0, Number(cart.diskon_input || 0)));
    }
    const grandTotal = Math.max(0, subAfterItemDisc - Number(cart.diskon_global || 0));
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

    return `<div class="space-y-3.5 ons-view-enter">
      ${subTabHeader}
      <!-- Workstation Shift & Terminal Bar -->
      <div class="ons-pos-bar px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        ${st.activeShift ? `
          <div class="flex flex-wrap items-center gap-2.5">
            <span class="ons-pos-live-dot"></span>
            <span class="badge-bpom bpom-bebas">SHIFT AKTIF</span>
            <span class="font-mono-num font-extrabold">${S().esc(st.activeShift.id_shift)}</span>
            <span style="color:var(--ons-text-soft)">Kasir: <b>${S().esc(st.activeShift.kasir_id || '-')}</b> &bull; Modal Laci: <b class="font-mono-num text-emerald-600">${S().rp(st.activeShift.modal_awal || 0)}</b></span>
            <span class="px-2 py-0.5 rounded-full font-mono-num font-bold text-[11px]" style="background:var(--ons-bg-subtle);color:var(--ons-text-main)">Shift Ini/Hari Ini: ${dailyStats.countToday} trx &bull; ${S().rp(dailyStats.omzetToday)}</span>
          </div>
          <div class="flex flex-wrap items-center gap-1.5">
            <button type="button" onclick="window.togglePosBeepSetting()" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2.5" title="Suara bip saat scan/tambah item">Suara: ${posBeepEnabled ? 'ON' : 'OFF'}</button>
            <button type="button" onclick="ONSStore.ThermalPrinter.connect()" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2.5">Printer BT</button>
            <button type="button" onclick="navigateView('pos','tutup-shift')" class="ons-btn ons-btn-primary text-xs py-1 px-3 font-semibold">Rekonsiliasi &amp; Tutup Shift &rarr;</button>
          </div>
        ` : `
          <div class="flex flex-wrap items-center gap-2">
            <span class="badge-bpom bpom-terbatas">BELUM BUKA SHIFT</span>
            <span style="color:var(--ons-text-soft)">Catat modal awal uang receh laci kasir sebelum memulai shift penjualan hari ini.</span>
          </div>
          <div class="flex flex-wrap items-center gap-1.5">
            <button type="button" onclick="window.togglePosBeepSetting()" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2.5">Suara: ${posBeepEnabled ? 'ON' : 'OFF'}</button>
            <button type="button" onclick="window.openBukaShiftModal()" class="ons-btn ons-btn-primary text-xs py-1.5 px-3">+ Buka Shift Kasir (Modal Laci)</button>
          </div>
        `}
      </div>

      <!-- Multi-Cart Queue Tabs (Hold Antrean Bernama) -->
      <div class="flex flex-wrap items-center gap-2">
        ${st.carts.map((c, idx) => {
          const tabTot = (c.items || []).reduce((s, it) => s + Math.max(0, Number(it.harga_jual || 0) * Number(it.qty || 0) - Number(it.diskon_item || 0)), 0);
          return `<div class="inline-flex items-center rounded-xl overflow-hidden border shadow-sm" style="border-color:${idx === st.activeCartIdx ? '#0066FE' : 'var(--ons-border)'}">
            <button onclick="window.switchPosCart(${idx})" class="ons-btn rounded-none border-0 text-xs ${idx === st.activeCartIdx ? 'ons-btn-primary' : 'ons-btn-ghost'}">
              <span>${S().esc(c.label)}</span>
              <span class="font-mono-num text-[11px] opacity-90">(${c.items.length})${tabTot > 0 ? ` &bull; ${S().rp(tabTot)}` : ''}</span>
              ${c.held_at ? ` <span class="text-[10px] opacity-80">[${S().esc(c.held_at)}]</span>` : ''}
            </button>
            ${st.carts.length > 1 ? `<button onclick="window.closePosCartTab(${idx})" title="Tutup tab antrean ini" class="px-2 py-1 text-xs hover:bg-red-500/20 text-red-500 font-bold">&times;</button>` : ''}
          </div>`;
        }).join('')}
        <button onclick="window.openHoldCartModal()" class="ons-btn ons-btn-ghost text-xs">+ Tahan / Hold Antrean</button>
        ${offQueue.length ? `<button onclick="window.syncPosOfflineNow()" class="ons-btn ons-btn-amber text-xs ml-auto">Sinkron ${offQueue.length} Antrean Offline</button>` : ''}
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <!-- Panel Kiri: Pencarian Cepat, Filter & Katalog FEFO -->
        <div class="lg:col-span-7 space-y-3">
          <div class="ons-card p-3 space-y-2.5">
            <div class="flex flex-wrap items-center gap-2">
              <div class="flex-1 min-w-[220px] relative">
                <input id="posSearchInput" class="ons-input pr-16" placeholder="[F2] Scan Barcode KFA/Batch / Ketik Nama Obat atau Zat Aktif..." value="${S().esc(st.posSearchQ)}" oninput="window.onPosSearch(this.value)" onkeydown="if(event.key==='Enter'){event.preventDefault();window.posAddFirstMatch();}"/>
                <button id="posSearchClearBtn" type="button" onclick="window.clearPosSearchInput()" class="${String(st.posSearchQ || '').trim() ? '' : 'hidden'} absolute right-2 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded text-xs font-bold hover:bg-red-500/15 text-red-500" title="Bersihkan pencarian">&times;</button>
              </div>
              <button type="button" onclick="window.startPosCameraScan()" class="ons-btn ons-btn-primary text-xs" title="Scan Barcode Kamera HP/Webcam (Gratis)">Scan Barcode</button>
              <button type="button" onclick="window.startPosVoiceCashier()" class="ons-btn ons-btn-ghost text-xs" title="Kasir Suara Bahasa Indonesia">Suara Kasir</button>
            </div>
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex gap-1.5 flex-wrap items-center">
                ${['', 'BEBAS', 'TERBATAS', 'KERAS', 'PREKURSOR'].map((g) => `
                  <button type="button" onclick="ONSStore.AppState.posFilterGol='${g}';window.refreshPosCatalogView();" class="ons-pos-chip ${fGol === g ? 'is-active' : ''}">${g || 'Semua BPOM'}</button>
                `).join('')}
              </div>
              <div class="flex items-center gap-1.5">
                <span id="posCatalogMeta" class="text-[11px] font-mono-num" style="color:var(--ons-text-soft)">${catalog.length} dari ${st.masterObat.length} item</span>
                <button type="button" onclick="window.togglePosCatalogViewMode()" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2.5 min-h-0 h-7" title="Ubah tampilan Kartu / Daftar Cepat">${posCatalogView === 'LIST' ? 'Tampilan Kartu' : 'Daftar Cepat'}</button>
              </div>
            </div>
            <div class="flex gap-1.5 flex-wrap items-center pt-0.5">
              ${[
                { id: 'ALL', lbl: 'Semua Stok' },
                { id: 'READY', lbl: 'Siap Jual' },
                { id: 'LOW', lbl: 'Stok Menipis' },
                { id: 'NEAR_ED', lbl: 'Hampir ED (<90h)' }
              ].map((sf) => `<button type="button" onclick="window.setPosStockFilter('${sf.id}')" class="ons-pos-chip ${posStockFilter === sf.id ? 'is-active' : ''}">${sf.lbl}</button>`).join('')}
            </div>
          </div>

          <div id="posCatalogGrid" class="${posCatalogView === 'LIST' ? 'space-y-2' : 'grid grid-cols-1 sm:grid-cols-2 gap-3'} max-h-[66vh] overflow-y-auto pr-1">
            ${renderPosCatalogCardsHtml(catalog, cart)}
          </div>
        </div>

        <!-- Panel Kanan: Keranjang Aktif, Pasien, Tier Harga, CDSS & Checkout -->
        <div class="lg:col-span-5">
          ${renderPosCartPanelHtml(st, cart, member, cdss, grandTotal, subtotal, itemDiscTotal, subAfterItemDisc, estHppCart, isBelowHppCart, seeCost)}
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
  global.setPosHistPeriod = (p) => { posHistPeriod = p || 'ALL'; global.renderActiveView(); };
  global.resetPosHistFilters = () => {
    posHistQ = '';
    posHistFilter = 'SEMUA';
    posHistMethod = 'SEMUA';
    posHistPeriod = 'ALL';
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
    const rSed = Number(obat.rasio_sedang || 10);
    const rBes = Number(obat.rasio_besar || 100);
    const baseEff1 = S().getEffectiveObatPrice ? S().getEffectiveObatPrice(obat, 1, tierMode).harga : Number(obat.harga_umum || 0);
    const baseEffSed = S().getEffectiveObatPrice ? S().getEffectiveObatPrice(obat, rSed, tierMode).harga : baseEff1;
    const baseEffBes = S().getEffectiveObatPrice ? S().getEffectiveObatPrice(obat, rBes, tierMode).harga : baseEff1;
    it.unitOptions = [
      { label: obat.satuan_dasar, faktor: 1, harga: baseEff1 },
      { label: obat.satuan_sedang || 'Strip', faktor: rSed, harga: baseEffSed * rSed },
      { label: obat.satuan_besar || 'Box', faktor: rBes, harga: baseEffBes * rBes }
    ];
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
    const sub = cart.items.reduce((s, it) => s + Number(it.harga_jual) * Number(it.qty), 0);
    const itDisc = cart.items.reduce((s, it) => s + Number(it.diskon_item || 0), 0);
    const grand = Math.max(0, sub - itDisc - Number(cart.diskon_global || 0));
    global.openPosCheckoutModal(metode || 'TUNAI', grand);
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
      cart.items = [];
      cart.diskon_global = 0;
      cart.diskon_input = 0;
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
    const it = cart.items[idx];
    const opt = it.unitOptions.find((u) => u.label === label);
    if (opt) {
      const sellStok = S().getSellableStok(it.id_obat);
      const otherBase = _cartBaseQtyForObat(cart, it.id_obat, idx);
      const nextFaktor = Math.max(1, Number(opt.faktor || 1));
      if (otherBase + (Number(it.qty || 1) * nextFaktor) > sellStok) {
        global.toast('Satuan ' + opt.label + ' melebihi stok layak jual tersedia (' + sellStok + ').', 'warn');
        global.renderActiveView();
        return;
      }
      it.satuan = opt.label;
      it.faktor_konversi = nextFaktor;
      const ob = S().AppState.masterObat.find((o) => o.id_obat === it.id_obat);
      const tierMode = cart.tier_harga || (cart.id_member !== 'UMUM' ? 'MEMBER' : 'UMUM');
      const eff = _repriceCartItem(ob, it, tierMode);
      if (eff && eff.isGrosirAuto) {
        global.toast('Tier Grosir Otomatis diterapkan untuk ' + it.nama_dagang, 'ok');
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
      channel: 'Toko Fisik',
      id_member: 'UMUM',
      tier_harga: 'UMUM',
      items: [],
      diskon_global: 0,
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
          <div><label class="font-semibold block mb-1">Tunai (Rp)</label><input id="posSplitTunai" type="number" min="0" value="${Math.floor(total / 2)}" oninput="window.syncSplitOther(${total})" class="ons-input font-mono-num"/></div>
          <div><label class="font-semibold block mb-1">QRIS / Transfer (Rp)</label><input id="posSplitNonTunai" type="number" min="0" value="${total - Math.floor(total / 2)}" oninput="window.updateSplitCheck(${total})" class="ons-input font-mono-num"/></div>
        </div>
        <div id="posSplitStatusSpan" class="text-[11px] font-bold text-emerald-600">Total Split seimbang (${S().rp(total)})</div>
      </div>` : ''}

      ${metode === 'TUNAI' ? `<div class="space-y-2.5">
        <div class="flex items-center justify-between">
          <label class="text-xs font-semibold">Uang Tunai Diterima (Rp)</label>
          <span class="text-[11px]" style="color:var(--ons-text-soft)">Tekan Enter untuk langsung terbit struk</span>
        </div>
        <input id="posTunaiBayar" type="number" min="0" class="ons-input font-mono-num text-lg font-extrabold" value="${total}" oninput="window.updatePosTunaiChange(${total})" onkeydown="if(event.key==='Enter'){event.preventDefault();document.getElementById('posModalConfirmBtn')?.click();}"/>
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
          <div><label class="font-semibold block mb-1">DP / Uang Muka Sekarang (Rp)</label><input id="posPiutangDp" type="number" min="0" value="0" oninput="window.updatePosPiutangSisa(${total})" class="ons-input font-mono-num text-xs"/></div>
          <div><label class="font-semibold block mb-1">Batas Plafon Kredit (Rp)</label><input id="posPiutangPlafon" type="number" class="ons-input font-mono-num text-xs" value="2000000"/></div>
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
    const paid = Number(inp.value || 0);
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
    if (inp) { inp.value = net; global.updatePosTunaiChange(baseTotal); }
  };

  global.setPosTunaiVal = (val, baseTotal) => {
    const inp = document.getElementById('posTunaiBayar');
    if (inp) { inp.value = val; global.updatePosTunaiChange(baseTotal); }
  };

  global.updatePosPiutangSisa = (baseTotal) => {
    const net = _getModalNetTotal(baseTotal);
    const dp = Math.min(net, Math.max(0, Number((document.getElementById('posPiutangDp') || {}).value || 0)));
    const sp = document.getElementById('posPiutangSisaSpan');
    if (sp) sp.textContent = S().rp(Math.max(0, net - dp));
  };

  global.setPosSplitHalf = (baseTotal) => {
    const net = _getModalNetTotal(baseTotal);
    const tInp = document.getElementById('posSplitTunai');
    const ntInp = document.getElementById('posSplitNonTunai');
    if (tInp) tInp.value = Math.floor(net / 2);
    if (ntInp) ntInp.value = net - Math.floor(net / 2);
    global.updateSplitCheck(baseTotal);
  };

  global.updateSplitCheck = (baseTotal) => {
    const net = _getModalNetTotal(baseTotal);
    const sT = Math.max(0, Number((document.getElementById('posSplitTunai') || {}).value || 0));
    const sN = Math.max(0, Number((document.getElementById('posSplitNonTunai') || {}).value || 0));
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
    const t = Math.max(0, Number((document.getElementById('posSplitTunai') || {}).value || 0));
    const ntInp = document.getElementById('posSplitNonTunai');
    if (ntInp) ntInp.value = Math.max(0, net - t);
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
      const sT = Number((tEl || {}).value || 0);
      const sN = Number((ntEl || {}).value || 0);
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
    const tunaiBayar = metode === 'TUNAI' ? Number(tunaiEl ? tunaiEl.value : grandTotal) : (metode === 'PIUTANG' ? 0 : grandTotal);
    if (metode === 'TUNAI' && tunaiEl && tunaiBayar < grandTotal) {
      playPosBeep('err');
      global.toast('Uang tunai diterima kurang dari total tagihan!', 'err');
      return;
    }
    const kembaliRp = metode === 'TUNAI' ? Math.max(0, tunaiBayar - grandTotal) : 0;
    const piutangNama = ((document.getElementById('posPiutangNama') || {}).value || '').trim();
    const piutangJt = ((document.getElementById('posPiutangJt') || {}).value || '').trim();
    const piutangDp = Math.min(grandTotal, Math.max(0, Number((document.getElementById('posPiutangDp') || {}).value || 0)));
    const piutangPlafon = Number((document.getElementById('posPiutangPlafon') || {}).value || 2000000);
    const piutangNote = ((document.getElementById('posPiutangNote') || {}).value || '').trim();

    if (metode === 'PIUTANG' && (!cart.id_member || cart.id_member === 'UMUM') && !piutangNama) {
      global.toast('Pembayaran Piutang/Tempo wajib memilih Member/Mitra atau mengisi Nama Penanggung Jawab!', 'err');
      return;
    }

    const itemDiscTotal = cart.items.reduce((s, it) => s + Number(it.diskon_item || 0), 0);
    const payload = {
      cabang_id: st.cabangId,
      shift_id: (st.activeShift && st.activeShift.id_shift) || 'SHF-AKTIF',
      channel: cart.channel,
      id_member: cart.id_member,
      tier_harga: cart.tier_harga || (cart.id_member !== 'UMUM' ? 'MEMBER' : 'UMUM'),
      pelanggan_nama: piutangNama || cart.pelanggan_nama || (member && member.nama_pasien) || 'Pasien Umum',
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

    try {
      let res;
      if (!navigator.onLine && !API().isDemoMode()) {
        const queued = API().pushOfflineQueue(payload);
        global.toast('Mode Offline Aktif: Transaksi tersimpan di Antrean Darurat (' + queued.offline_sync_id + ').', 'warn');
        res = { no_invoice: queued.offline_sync_id, penjualan: payload };
      } else {
        res = await API().callApi('pos.checkout', payload, { isWrite: true });
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
        CATATAN: apjOverride ? ('Diverifikasi APJ: ' + apjOverride) : 'Konsultasi obat GRATIS bersama Apoteker kami.',
        QR_URL: global.location.origin + global.location.pathname + '?nota=' + encodeURIComponent(notaNo) + '&tot=' + encodeURIComponent(String(grandTotal || 0))
      }, 58, waTarget, itemsCopy);

      cart.items = [];
      cart.diskon_global = 0;
      cart.diskon_input = 0;
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
