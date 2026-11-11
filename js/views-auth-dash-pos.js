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

    if (hash.startsWith('#kwitansi=') || hash.startsWith('#doc=')) {
      const isKw = hash.startsWith('#kwitansi=');
      const params = new URLSearchParams(hash.slice(1));
      const id = isKw ? params.get('kwitansi') : params.get('doc');
      const sig = params.get('sig') || '';
      root.innerHTML = `<div class="min-h-screen flex items-center justify-center p-4" style="background:linear-gradient(135deg,#09202A,#0F172A);">
        <div class="ons-card max-w-lg w-full p-6 text-center space-y-4">
          <img src="./icons/ons-farma-app-icon.png" alt="ONS Farma" class="w-14 h-14 mx-auto rounded-xl shadow"/>
          <h1 class="text-xl font-bold">Verifikasi Keaslian ${isKw ? 'Kwitansi Pembayaran' : 'Dokumen Resmi Apotek'}</h1>
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

    if (search.get('erx')) {
      const tok = search.get('erx');
      root.innerHTML = `<div class="min-h-screen flex items-center justify-center p-4" style="background:linear-gradient(135deg,#09202A,#0B1C30);">
        <div class="ons-card max-w-xl w-full p-6 space-y-4">
          <div class="flex items-center gap-3">
            <img src="./icons/ons-farma-app-icon.png" class="w-11 h-11 rounded-lg"/>
            <div>
              <h1 class="text-lg font-bold">Mini-Portal E-Resep Dokter Mitra ONS Farma</h1>
              <p class="text-xs font-mono-num" style="color:var(--ons-text-soft)">Token Sesi: ${S().esc(tok)}</p>
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
    root.innerHTML = `<div class="min-h-screen flex items-center justify-center p-4" style="background:radial-gradient(circle at top right,#0050CA22,transparent 50%),linear-gradient(155deg,#09202A 0%,#0F172A 100%);">
      <div class="ons-card max-w-4xl w-full grid grid-cols-1 md:grid-cols-12 overflow-hidden shadow-2xl border-slate-700/40">
        <div class="md:col-span-5 p-7 text-white flex flex-col justify-between" style="background:linear-gradient(175deg,#09202A 0%,#06171F 100%);">
          <div>
            <div class="flex items-center gap-3 mb-5">
              <img src="./icons/ons-farma-app-icon.png" alt="Logo" class="w-12 h-12 rounded-xl border border-white/15"/>
              <div>
                <div class="font-bold text-lg tracking-tight">APOTEK ONS FARMA</div>
                <div class="text-xs text-sky-300 font-semibold">Clinical Royal Enterprise v10.0</div>
              </div>
            </div>
            <h2 class="text-xl font-bold leading-snug mb-3">Sistem Terpadu POS, FEFO Gudang, Layanan Klinis &amp; Keuangan</h2>
            <p class="text-xs text-slate-300 leading-relaxed">Arsitektur Terpisah GitHub Pages PWA + Google Apps Script REST API + Perlindungan HMAC-SHA256.</p>
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
      const res = await API().callApi('auth.login', { username, password, cabang_id: branch }, { isWrite: true, token: '' });
      API().setSession({ token: res.token, user: res.user, cabang_id: branch, shift });
      S().AppState.user = res.user;
      S().AppState.cabangId = branch;
      if (shift === 'MALAM') S().toggleDarkMode(true);
      S().AppState.activeView = 'dashboard';
      await global.bootLoadState(true);
      global.toast('Selamat datang, ' + res.user.nama_lengkap, 'ok');
    } catch (e) {
      global.toast(e.message, 'err');
    }
  };

  /**
   * W-02: Pusat Komando & Dashboard Eksekutif
   */
  function renderDashboardView() {
    const st = S().AppState;
    const seeCost = S().canSeeFinancialCost();

    const omzetHari = st.penjualan.reduce((s, p) => s + Number(p.grand_total || 0), 0);
    const marginHari = seeCost ? st.penjualan.reduce((s, p) => s + Number(p.estimasi_margin || 0), 0) : null;
    const nearEdBatches = st.stokBatch.filter((b) => b.status_batch === 'AKTIF' && b.qty_sisa > 0 && S().daysUntil(b.tgl_kadaluarsa) <= 90);
    const defectaCount = st.masterObat.filter((o) => S().getTotalStok(o.id_obat) <= Number(o.stok_min || 10)).length;
    const apTotal = seeCost ? st.fakturPbf.reduce((s, f) => s + Number(f.sisa_hutang || 0), 0) : null;
    const latestTemp = st.coldChain.length ? st.coldChain[st.coldChain.length - 1] : null;
    const coldOk = !latestTemp || (latestTemp.suhu_celcius >= 2 && latestTemp.suhu_celcius <= 8);

    // Readiness Compliance Score (Audit, Cold-Chain, ED, Defecta)
    const readiness = Math.max(55, Math.min(100, 100 - nearEdBatches.length * 4 - defectaCount * 3 - (coldOk ? 0 : 15)));
    const dashArray = Math.round((readiness / 100) * 251.2);

    // Grafik Batang Dual SVG 7 Hari Simulasi + Data Aktual Hari Ini (Omzet vs Laba Kotor terproteksi RBAC)
    const days = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Hari Ini'];
    const omzToday = omzetHari > 0 ? omzetHari : (st.masterObat.length ? 3800000 : 0);
    const omzSeries = [4200000, 5100000, 4850000, 6200000, 5950000, 7400000, omzToday];
    const labaToday = marginHari > 0 ? marginHari : Math.round(omzToday * 0.24);
    const labaSeries = seeCost ? omzSeries.map((v, idx) => (idx === omzSeries.length - 1 ? labaToday : Math.round(v * 0.24))) : [];
    const maxVal = Math.max(...omzSeries, 1);

    return `<div class="space-y-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-xl font-bold">Pusat Komando &amp; Kepatuhan Apotek</h1>
          <p class="text-xs" style="color:var(--ons-text-soft)">Cabang <b>${S().esc(st.cabangId)}</b> &bull; Peran aktif: <b>${S().esc(S().getRole())}</b> &bull; Pembaruan Real-time</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button onclick="navigateView('pos')" class="ons-btn ons-btn-primary text-xs">&#9889; Buka Kasir POS (F2)</button>
          ${seeCost ? `<button onclick="navigateView('billing')" class="ons-btn ons-btn-emerald text-xs">&#128179; Tagihan &amp; Kwitansi</button>` : ''}
          <button onclick="bootLoadState(true)" class="ons-btn ons-btn-ghost text-xs">&#128260; Segarkan Data</button>
        </div>
      </div>

      ${st.masterObat.length === 0 ? `<div class="ons-card p-4 border-l-4 flex flex-wrap items-center justify-between gap-3" style="border-left-color:#0066FE;background:rgba(0,102,254,0.07)">
        <div>
          <div class="font-bold text-sm">Katalog Obat Masih Kosong (Mode Live Baru Terhubung)</div>
          <p class="text-xs" style="color:var(--ons-text-soft)">Klik tombol di kanan untuk mengisi otomatis 6 obat standar BPOM/KFA, stok batch FEFO, PBF, member PRB &amp; suhu chiller ke Google Sheets, atau import dari Excel (.xlsx).</p>
        </div>
        <div class="flex flex-wrap gap-2">
          ${seeCost ? `<button onclick="window.seedStarterCatalogNow()" class="ons-btn ons-btn-primary text-xs">&#9889; Isi Katalog Awal (1 Klik)</button>` : ''}
          <button onclick="navigateView('${seeCost ? 'obat' : 'pos'}')" class="ons-btn ons-btn-ghost text-xs">Kelola Katalog / Import Excel</button>
        </div>
      </div>` : ''}

      <!-- 5 Kartu KPI Utama -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div class="ons-card p-4">
          <div class="text-xs font-semibold" style="color:var(--ons-text-soft)">Omzet Tercatat</div>
          <div class="text-xl font-bold font-mono-num mt-1 text-blue-600">${S().rp(omzetHari)}</div>
          <div class="text-[11px] mt-1 text-emerald-600 font-semibold">${st.penjualan.length} transaksi lunas</div>
        </div>
        <div class="ons-card p-4">
          <div class="text-xs font-semibold" style="color:var(--ons-text-soft)">${seeCost ? 'Estimasi Laba Kotor' : 'Poin Member Aktif'}</div>
          <div class="text-xl font-bold font-mono-num mt-1 text-emerald-600">${seeCost ? S().rp(marginHari) : (st.penjualan.reduce((a, b) => a + Number(b.poin_didapat || 0), 0) + ' Poin')}</div>
          <div class="text-[11px] mt-1" style="color:var(--ons-text-soft)">${seeCost ? 'Margin terlindungi HPP FEFO' : 'Data HPP disembunyikan (Kasir)'}</div>
        </div>
        <div class="ons-card p-4 cursor-pointer" onclick="navigateView('gudang')">
          <div class="text-xs font-semibold" style="color:var(--ons-text-soft)">Radar ED &le; 90 Hari</div>
          <div class="text-xl font-bold font-mono-num mt-1 ${nearEdBatches.length ? 'text-red-600' : 'text-emerald-600'}">${nearEdBatches.length} Batch</div>
          <div class="text-[11px] mt-1" style="color:var(--ons-text-soft)">Klik untuk lihat prioritas FEFO</div>
        </div>
        <div class="ons-card p-4 cursor-pointer" onclick="navigateView('gudang')">
          <div class="text-xs font-semibold" style="color:var(--ons-text-soft)">Chiller Cold-Chain (2-8&deg;C)</div>
          <div class="text-xl font-bold font-mono-num mt-1 ${coldOk ? 'text-emerald-600' : 'text-red-600'}">${latestTemp ? latestTemp.suhu_celcius + ' °C' : '4.8 °C'}</div>
          <div class="text-[11px] mt-1">${coldOk ? '&#9989; Stabil dalam rentang aman' : '&#9888;&#65039; Di luar batas!'}</div>
        </div>
        <div class="ons-card p-4 cursor-pointer" onclick="navigateView('${seeCost ? 'finance' : 'tutup-shift'}')">
          <div class="text-xs font-semibold" style="color:var(--ons-text-soft)">${seeCost ? 'Tagihan PBF Berjalan' : 'Tutup Shift Kasir'}</div>
          <div class="text-xl font-bold font-mono-num mt-1 text-amber-600">${seeCost ? S().rp(apTotal) : 'Siap Hitung'}</div>
          <div class="text-[11px] mt-1" style="color:var(--ons-text-soft)">${seeCost ? st.fakturPbf.length + ' faktur PBF aktif' : 'Blind cash verification'}</div>
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

        <div class="ons-card p-5 lg:col-span-5">
          <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h3 class="font-bold text-sm">Tren ${seeCost ? 'Omzet vs Laba Kotor' : 'Penjualan'} 7 Hari</h3>
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
                <div class="text-[10px] font-mono-num" style="color:var(--ons-text-soft)">${(vOmz / 1000000).toFixed(1)}jt</div>
                <div class="w-full h-full flex items-end justify-center gap-1">
                  <div class="flex-1 rounded-t-md transition-all" style="height:${hOmz}%;background:${isToday ? '#0066FE' : '#0284C7'};opacity:${isToday ? '1' : '0.8'};"></div>
                  ${seeCost ? `<div class="w-2/5 rounded-t-md transition-all" style="height:${Math.max(4, hLaba)}%;background:#10B981;opacity:${isToday ? '1' : '0.85'};"></div>` : ''}
                </div>
                <div class="text-[11px] font-semibold">${d}</div>
              </div>`;
            }).join('')}
          </div>
        </div>

        <div class="ons-card p-5 lg:col-span-3 flex flex-col justify-between space-y-3">
          <h3 class="font-bold text-sm">Antrean Tugas Prioritas</h3>
          <div class="space-y-2 text-xs">
            <div class="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 flex justify-between items-center cursor-pointer" onclick="navigateView('gudang')">
              <span>Batch mendekati ED (&le;90h)</span>
              <span class="font-bold font-mono-num text-red-600">${nearEdBatches.length}</span>
            </div>
            <div class="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 flex justify-between items-center cursor-pointer" onclick="navigateView('${seeCost ? 'defecta' : 'gudang'}')">
              <span>Item di bawah Stok Min (Defecta)</span>
              <span class="font-bold font-mono-num text-amber-600">${defectaCount}</span>
            </div>
            <div class="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/30 flex justify-between items-center cursor-pointer" onclick="navigateView('billing')">
              <span>Pasien PRB Refill H-3</span>
              <span class="font-bold font-mono-num text-blue-600">${st.members.filter((m) => m.program_prb === 'PRB_BPJS').length}</span>
            </div>
          </div>
          <div class="p-3 rounded-lg border text-xs" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
            <div class="font-bold mb-1">Catatan Handover Shift Sebelumnya:</div>
            <p style="color:var(--ons-text-soft)">"Stok Insulin Lantus sisa 18 Pen di Chiller-01. Sudah dibuatkan draf SP ke PBF Anugrah Argon Medika."</p>
          </div>
        </div>
      </div>

      <!-- Radar Kadaluarsa FEFO -->
      <div class="ons-card p-5">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h3 class="font-bold text-sm">Radar Batch Mendekati Kadaluarsa (FEFO Terdekat)</h3>
          <button onclick="navigateView('gudang')" class="ons-btn ons-btn-ghost text-xs">Kelola Gudang &amp; Recall &rarr;</button>
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
                  <td><button onclick="navigateView('pos')" class="ons-btn ons-btn-ghost text-xs py-1 px-2.5">Prioritaskan Jual</button></td>
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
   * W-03: Kasir POS Berkecepatan Tinggi (Voice, Kamera Barcode, Multi-Cart, CDSS + APJ PIN, QRIS, Thermal BT)
   */
  function renderPosView() {
    const st = S().AppState;
    const cart = st.carts[st.activeCartIdx] || st.carts[0];
    const member = st.members.find((m) => m.id_member === cart.id_member);
    const cdss = S().checkCartCdss(cart);
    const q = (st.posSearchQ || '').toLowerCase();
    const fGol = st.posFilterGol || '';

    const catalog = st.masterObat.filter((o) => {
      if (fGol && String(o.golongan_bpom).toUpperCase() !== fGol) return false;
      if (q) {
        const hay = `${o.nama_dagang} ${o.zat_aktif} ${o.kode_kfa} ${o.id_obat}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const subtotal = cart.items.reduce((s, it) => s + Number(it.harga_jual) * Number(it.qty), 0);
    const grandTotal = Math.max(0, subtotal - Number(cart.diskon_global || 0));
    const offQueue = API().getOfflineQueue();

    return `<div class="space-y-4">
      <!-- Top Bar POS: Pencarian Barcode, Suara, Kamera, Multi-Keranjang & Offline Queue -->
      <div class="ons-card p-3 flex flex-wrap items-center gap-2">
        <div class="flex-1 min-w-[220px] relative">
          <input id="posSearchInput" class="ons-input pr-10" placeholder="[F2] Scan Barcode KFA / Ketik Nama Obat atau Zat Aktif..." value="${S().esc(st.posSearchQ)}" oninput="window.onPosSearch(this.value)" onkeydown="if(event.key==='Enter'){window.posAddFirstMatch();}"/>
        </div>
        <button onclick="window.startPosCameraScan()" class="ons-btn ons-btn-ghost text-xs" title="Scan Barcode Kamera">&#128247; Scan Kamera</button>
        <button onclick="window.startPosVoiceCashier()" class="ons-btn ons-btn-ghost text-xs" title="Kasir Suara Bahasa Indonesia">&#127908; Suara Kasir</button>
        <button onclick="ONSStore.ThermalPrinter.connect()" class="ons-btn ons-btn-ghost text-xs">&#128424;&#65039; Printer BT</button>
        ${offQueue.length ? `<button onclick="window.syncPosOfflineNow()" class="ons-btn ons-btn-amber text-xs">&#9889; Sinkron ${offQueue.length} Antrean Offline</button>` : ''}
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
              const price = cart.id_member !== 'UMUM' ? o.harga_member : o.harga_umum;
              return `<div class="ons-card p-3.5 flex flex-col justify-between gap-2 hover:border-blue-500 transition">
                <div>
                  <div class="flex items-start justify-between gap-2">
                    <div class="font-bold text-sm leading-tight">${S().esc(o.nama_dagang)}</div>
                    ${S().bpomBadge(o.golongan_bpom)}
                  </div>
                  <div class="text-xs mt-1" style="color:var(--ons-text-soft)">${S().esc(o.zat_aktif)} &bull; ${S().esc(o.rak_lokasi)}</div>
                  <div class="text-[11px] font-mono-num mt-1" style="color:var(--ons-text-soft)">
                    FEFO: ${nearest ? S().esc(nearest.no_batch) + ' (ED ' + nearest.tgl_kadaluarsa + ')' : '<span class="text-red-500 font-bold">Stok Kosong</span>'}
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
            <div class="space-y-2 max-h-60 overflow-y-auto border-y py-2" style="border-color:var(--ons-border)">
              ${cart.items.length ? cart.items.map((it, idx) => `
                <div class="flex items-center justify-between gap-2 text-xs p-2 rounded-lg" style="background:var(--ons-bg-subtle)">
                  <div class="flex-1 min-w-0">
                    <div class="font-bold truncate">${S().esc(it.nama_dagang)}</div>
                    <div class="text-[11px] font-mono-num" style="color:var(--ons-text-soft)">${S().rp(it.harga_jual)} / ${S().esc(it.satuan)} &times; ${it.faktor_konversi} dasar</div>
                  </div>
                  <div class="flex items-center gap-1">
                    <select onchange="window.posChangeUnit(${idx}, this.value)" class="ons-select text-[11px] py-1 px-1.5 min-h-0 h-8 w-20">
                      ${it.unitOptions.map((u) => `<option value="${u.label}" ${u.label === it.satuan ? 'selected' : ''}>${u.label}</option>`).join('')}
                    </select>
                    <input type="number" min="1" value="${it.qty}" onchange="window.posUpdateQty(${idx}, this.value)" class="ons-input font-mono-num text-center text-xs w-14 py-1 px-1 min-h-0 h-8"/>
                    <button onclick="window.posRemoveItem(${idx})" class="ons-btn ons-btn-danger text-xs px-2 py-1 min-h-0 h-8">&times;</button>
                  </div>
                </div>`).join('') : '<div class="text-center py-6 text-xs" style="color:var(--ons-text-soft)">Belum ada item. Pilih obat dari katalog di sebelah kiri atau scan barcode.</div>'}
            </div>

            <!-- Cross-Sell / Profit Booster Cerdas -->
            ${cart.items.length ? `<div class="p-2 rounded-lg border text-[11px] flex items-center justify-between gap-2" style="border-color:var(--ons-border)">
              <span>&#128161; Rekomendasi Cross-sell Apoteker: <b>Vitamin C / Probiotik Pendamping Antibiotik</b></span>
              <button onclick="window.posAddToCart('OBT-002')" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2 min-h-0 h-7">+ Tambah</button>
            </div>` : ''}

            <div class="space-y-1.5 text-sm pt-1">
              <div class="flex justify-between"><span>Subtotal</span><span class="font-mono-num">${S().rp(subtotal)}</span></div>
              <div class="flex justify-between items-center">
                <span>Diskon Global (Rp)</span>
                <input type="number" min="0" value="${cart.diskon_global || 0}" onchange="ONSStore.AppState.carts[ONSStore.AppState.activeCartIdx].diskon_global=Number(this.value||0);renderActiveView();" class="ons-input font-mono-num text-right text-xs w-28 py-1 min-h-0 h-8"/>
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
          </div>
        </div>
      </div>
    </div>`;
  }

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
        unitOptions
      });
    }
    global.renderActiveView();
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

  global.openPosCheckoutModal = (metode, total) => {
    const cart = S().AppState.carts[S().AppState.activeCartIdx];
    if (!cart.items.length) { global.toast('Keranjang masih kosong!', 'warn'); return; }
    const cdss = S().checkCartCdss(cart);
    const invPreview = 'INV-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-POS';
    const qrisStr = S().buildQrisEmvcoPayload(total, invPreview);

    S().openModal(`<div class="p-6 space-y-4">
      <div class="flex justify-between items-center">
        <h3 class="font-bold text-lg">Konfirmasi Pembayaran POS (${S().esc(metode)})</h3>
        <button onclick="ONSStore.closeModal()" class="text-xl">&times;</button>
      </div>
      <div class="p-4 rounded-xl text-center" style="background:var(--ons-bg-subtle)">
        <div class="text-xs font-semibold" style="color:var(--ons-text-soft)">Total Tagihan</div>
        <div class="text-2xl font-extrabold font-mono-num text-blue-600">${S().rp(total)}</div>
      </div>

      ${metode === 'QRIS' ? `<div class="text-center space-y-2">
        <div class="flex justify-center">${S().renderSvgQr(qrisStr, 175)}</div>
        <div class="text-xs font-semibold text-emerald-600">QRIS Dinamis EMVCo BI — Nominal Tepat ${S().rp(total)}</div>
      </div>` : ''}

      ${metode === 'TUNAI' ? `<div class="space-y-2">
        <label class="text-xs font-semibold">Uang Tunai Diterima (Rp)</label>
        <input id="posTunaiBayar" type="number" class="ons-input font-mono-num text-base font-bold" value="${total}" oninput="document.getElementById('posKembalianSpan').textContent=ONSStore.rp(Math.max(0,Number(this.value)-${total}))"/>
        <div class="flex gap-2 flex-wrap">
          ${[total, 50000, 100000, 200000].map((v) => `<button type="button" onclick="document.getElementById('posTunaiBayar').value=${v};document.getElementById('posTunaiBayar').dispatchEvent(new Event('input'));" class="ons-btn ons-btn-ghost text-xs py-1">${S().rp(v)}</button>`).join('')}
        </div>
        <div class="text-sm font-bold flex justify-between pt-1"><span>Kembalian:</span><span id="posKembalianSpan" class="font-mono-num text-emerald-600">Rp 0</span></div>
      </div>` : ''}

      ${cdss.needsApjPin ? `<div class="p-3 rounded-xl border border-red-500/40 bg-red-500/10 space-y-2">
        <div class="text-xs font-bold text-red-600">&#128274; OTORISASI PIN APJ DIPERLUKAN (Obat Keras / Narkotika / Peringatan CDSS)</div>
        <input id="posApjPinInput" type="password" maxlength="6" class="ons-input font-mono-num" placeholder="Masukkan 6 Digit PIN APJ (Demo: 123456)"/>
      </div>` : ''}

      <div>
        <label class="text-xs font-semibold">Kirim Struk Digital WhatsApp (Opsional)</label>
        <input id="posWaStrukTarget" class="ons-input text-xs" placeholder="62812xxxx"/>
      </div>

      <button onclick="window.executePosCheckout('${S().esc(metode)}', ${total}, ${cdss.needsApjPin})" class="ons-btn ons-btn-emerald w-full py-2.5">Proses Transaksi, Potong FEFO &amp; Cetak Struk</button>
    </div>`, '500px');
  };

  global.executePosCheckout = async (metode, grandTotal, needsPin) => {
    const st = S().AppState;
    const cart = st.carts[st.activeCartIdx];
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

    const waTarget = ((document.getElementById('posWaStrukTarget') || {}).value || '').trim();
    const payload = {
      cabang_id: st.cabangId,
      channel: cart.channel,
      id_member: cart.id_member,
      metode_bayar: metode,
      subtotal: cart.items.reduce((s, it) => s + it.harga_jual * it.qty, 0),
      diskon_total: cart.diskon_global || 0,
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
      const strukText = [
        '      APOTEK ONS FARMA ENTERPRISE',
        '  Cabang: ' + st.cabangId + ' | ' + new Date().toLocaleString('id-ID'),
        '  No. Struk: ' + (res.no_invoice || (res.penjualan && res.penjualan.no_invoice)),
        '--------------------------------',
        ...cart.items.map((it) => `${it.nama_dagang.slice(0, 24)}\n  ${it.qty} ${it.satuan} x ${S().rp(it.harga_jual)} = ${S().rp(it.qty * it.harga_jual)}`),
        '--------------------------------',
        'TOTAL  : ' + S().rp(grandTotal),
        'METODE : ' + metode,
        apjOverride ? 'VERIF APJ: ' + apjOverride : '',
        'Terima kasih. Semoga lekas sembuh!'
      ].filter(Boolean).join('\n');

      S().openModal(`<div class="p-6 space-y-4 text-center">
        <div class="text-emerald-600 font-bold text-lg">&#9989; Transaksi Berhasil!</div>
        <pre class="text-left text-xs font-mono-num p-3 rounded-xl overflow-x-auto border" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">${S().esc(strukText)}</pre>
        <div class="grid grid-cols-2 gap-2">
          <button onclick="ONSStore.ThermalPrinter.printReceiptText(\`${S().esc(strukText)}\`)" class="ons-btn ons-btn-primary text-xs">&#128424;&#65039; Cetak Struk Thermal</button>
          <a target="_blank" href="https://wa.me/${encodeURIComponent(waTarget || '6281234567890')}?text=${encodeURIComponent(strukText)}" class="ons-btn ons-btn-emerald text-xs">&#128242; Kirim via WhatsApp</a>
        </div>
        <button onclick="ONSStore.closeModal()" class="ons-btn ons-btn-ghost w-full text-xs">Selesai &amp; Transaksi Berikutnya</button>
      </div>`, '460px');

      cart.items = [];
      cart.diskon_global = 0;
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
