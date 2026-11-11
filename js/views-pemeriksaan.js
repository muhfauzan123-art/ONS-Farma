/**
 * ONS FARMA DIGITAL ENTERPRISE v16.2
 * Modul Menu & Sub-Menu Pemeriksaan Kesehatan Pasien (POCT):
 * - Pemeriksaan Tensi (TD Sistol/Diastol + Nadi)
 * - Pemeriksaan Gula Darah (GDS / GDP / GD2PP)
 * - Pemeriksaan Kolesterol Total
 * - Pemeriksaan Asam Urat (L/P)
 * Tersimpan ke Google Sheets / DemoEngine & dapat dikirim langsung ke WhatsApp pasien.
 */
(function (global) {
  'use strict';

  const S = () => global.ONSStore;
  const API = () => global.ONSApi;

  let searchQ = '';
  let filterMode = 'SEMUA'; // SEMUA | WASPADA | HARI_INI | BELUM_WA

  function evalPemeriksaanStatus(d) {
    const jk = String((d && d.jenis_kelamin) || 'L').toUpperCase() === 'P' ? 'P' : 'L';
    const sistol = Number((d && d.tensi_sistol) || 0);
    const diastol = Number((d && d.tensi_diastol) || 0);
    let statusTensi = '';
    if (sistol > 0 && diastol > 0) {
      if (sistol < 90 || diastol < 60) statusTensi = 'HIPOTENSI';
      else if (sistol >= 180 || diastol >= 120) statusTensi = 'KRISIS_HIPERTENSI';
      else if (sistol >= 140 || diastol >= 90) statusTensi = 'HIPERTENSI_2';
      else if (sistol >= 130 || diastol >= 80) statusTensi = 'HIPERTENSI_1';
      else if (sistol >= 120 && diastol < 80) statusTensi = 'MENINGKAT';
      else statusTensi = 'NORMAL';
    }

    const gulaJenis = String((d && d.gula_jenis) || 'GDS').toUpperCase();
    const gulaVal = Number((d && d.gula_darah) || 0);
    let statusGula = '';
    if (gulaVal > 0) {
      if (gulaVal < 70) statusGula = 'HIPOGLIKEMIA';
      else if (gulaJenis === 'GDP') {
        statusGula = gulaVal >= 126 ? 'TINGGI' : (gulaVal >= 100 ? 'WASPADA' : 'NORMAL');
      } else {
        statusGula = gulaVal >= 200 ? 'TINGGI' : (gulaVal >= 140 ? 'WASPADA' : 'NORMAL');
      }
    }

    const kolVal = Number((d && d.kolesterol_total) || 0);
    let statusKolesterol = '';
    if (kolVal > 0) {
      statusKolesterol = kolVal >= 240 ? 'TINGGI' : (kolVal >= 200 ? 'BATAS_TINGGI' : 'NORMAL');
    }

    const auVal = Number((d && d.asam_urat) || 0);
    let statusAsamUrat = '';
    if (auVal > 0) {
      const hi = jk === 'P' ? 6.0 : 7.0;
      const lo = jk === 'P' ? 2.4 : 3.4;
      statusAsamUrat = auVal > hi ? 'TINGGI' : (auVal < lo ? 'RENDAH' : 'NORMAL');
    }

    return {
      jenis_kelamin: jk,
      gula_jenis: gulaJenis,
      status_tensi: statusTensi,
      status_gula: statusGula,
      status_kolesterol: statusKolesterol,
      status_asam_urat: statusAsamUrat
    };
  }

  function metaStatusBadge(code) {
    const c = String(code || '').toUpperCase();
    const map = {
      NORMAL: { label: 'Normal', tone: 'bpom-bebas', hex: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
      MENINGKAT: { label: 'Meningkat', tone: 'bpom-terbatas', hex: 'bg-amber-50 text-amber-700 border-amber-200' },
      WASPADA: { label: 'Waspada / Pra-DM', tone: 'bpom-terbatas', hex: 'bg-amber-50 text-amber-700 border-amber-200' },
      BATAS_TINGGI: { label: 'Batas Tinggi', tone: 'bpom-terbatas', hex: 'bg-amber-50 text-amber-700 border-amber-200' },
      HIPERTENSI_1: { label: 'Hipertensi Tahap 1', tone: 'bpom-terbatas', hex: 'bg-amber-50 text-amber-700 border-amber-200' },
      HIPERTENSI_2: { label: 'Hipertensi Tahap 2', tone: 'bpom-keras', hex: 'bg-red-50 text-red-700 border-red-200' },
      KRISIS_HIPERTENSI: { label: 'Krisis Hipertensi!', tone: 'bpom-narko', hex: 'bg-red-100 text-red-800 border-red-300' },
      HIPOTENSI: { label: 'Tensi Rendah', tone: 'bpom-terbatas', hex: 'bg-sky-50 text-sky-700 border-sky-200' },
      HIPOGLIKEMIA: { label: 'Gula Rendah!', tone: 'bpom-keras', hex: 'bg-red-50 text-red-700 border-red-200' },
      TINGGI: { label: 'Tinggi / Perlu Kontrol', tone: 'bpom-keras', hex: 'bg-red-50 text-red-700 border-red-200' },
      RENDAH: { label: 'Di Bawah Normal', tone: 'bpom-terbatas', hex: 'bg-sky-50 text-sky-700 border-sky-200' }
    };
    return map[c] || { label: c || '-', tone: 'bg-slate-100 text-slate-600', hex: 'bg-slate-50 text-slate-600 border-slate-200' };
  }

  function isAbnormalRow(r) {
    const s = [r.status_tensi, r.status_gula, r.status_kolesterol, r.status_asam_urat].filter(Boolean);
    return s.some((x) => x !== 'NORMAL');
  }

  function buildPemeriksaanWaText(r) {
    const rec = r || {};
    const prof = (S().getStoreProfile && S().getStoreProfile()) || {};
    const stEval = evalPemeriksaanStatus(rec);
    const stTensi = rec.status_tensi || stEval.status_tensi;
    const stGula = rec.status_gula || stEval.status_gula;
    const stKol = rec.status_kolesterol || stEval.status_kolesterol;
    const stAu = rec.status_asam_urat || stEval.status_asam_urat;

    const lines = [
      '*HASIL PEMERIKSAAN KESEHATAN PASIEN*',
      '*' + String(prof.nama_usaha || 'APOTEK ONS FARMA').toUpperCase() + '*',
      [prof.alamat_usaha, prof.kota].filter(Boolean).join(', '),
      prof.no_sia ? ('SIA: ' + prof.no_sia) : '',
      '--------------------------------',
      'No. Cek   : *' + (rec.id_periksa || '-') + '*',
      'Tanggal   : ' + (S().formatTgl ? S().formatTgl(rec.tanggal) : String(rec.tanggal || '').slice(0, 16)),
      'Pasien    : *' + (rec.nama_pasien || '-') + '* (' + (rec.jenis_kelamin === 'P' ? 'Perempuan' : 'Laki-laki') + (rec.usia_tahun ? ', ' + rec.usia_tahun + ' th' : '') + ')',
      '--------------------------------'
    ].filter(Boolean);

    if (Number(rec.tensi_sistol || 0) > 0 && Number(rec.tensi_diastol || 0) > 0) {
      lines.push('*1. Tekanan Darah (Tensi)*');
      lines.push('   Hasil  : *' + rec.tensi_sistol + '/' + rec.tensi_diastol + ' mmHg*' + (Number(rec.nadi_bpm || 0) > 0 ? (' | Nadi: ' + rec.nadi_bpm + ' bpm') : ''));
      lines.push('   Status : ' + metaStatusBadge(stTensi).label + ' _(Normal <120/80 mmHg)_');
    }

    if (Number(rec.gula_darah || 0) > 0) {
      const gj = String(rec.gula_jenis || 'GDS').toUpperCase();
      const refGula = gj === 'GDP' ? 'Normal Puasa <100 mg/dL' : 'Normal Sewaktu <140 mg/dL';
      lines.push('*' + (lines.some((x) => x.startsWith('*1.')) ? '2' : '1') + '. Gula Darah (' + gj + ')*');
      lines.push('   Hasil  : *' + rec.gula_darah + ' mg/dL*');
      lines.push('   Status : ' + metaStatusBadge(stGula).label + ' _(' + refGula + ')_');
    }

    if (Number(rec.kolesterol_total || 0) > 0) {
      lines.push('*Kolesterol Total*');
      lines.push('   Hasil  : *' + rec.kolesterol_total + ' mg/dL*');
      lines.push('   Status : ' + metaStatusBadge(stKol).label + ' _(Normal <200 mg/dL)_');
    }

    if (Number(rec.asam_urat || 0) > 0) {
      const refAu = stEval.jenis_kelamin === 'P' ? 'Wanita Normal 2.4-6.0 mg/dL' : 'Pria Normal 3.4-7.0 mg/dL';
      lines.push('*Asam Urat*');
      lines.push('   Hasil  : *' + rec.asam_urat + ' mg/dL*');
      lines.push('   Status : ' + metaStatusBadge(stAu).label + ' _(' + refAu + ')_');
    }

    if (rec.keluhan_catatan) {
      lines.push('--------------------------------');
      lines.push('Catatan   : ' + rec.keluhan_catatan);
    }
    if (rec.saran_apoteker) {
      lines.push('Saran Apoteker : _' + rec.saran_apoteker + '_');
    }
    lines.push('--------------------------------');
    lines.push('Petugas   : ' + (rec.petugas || 'Apoteker / Tim Farmasi'));
    lines.push('_Simpan pesan ini sebagai arsip riwayat kesehatan Anda. Konsultasi obat GRATIS bersama Apoteker kami._');
    return lines.join('\n');
  }

  function buildAutoAdvice(rec) {
    const ev = evalPemeriksaanStatus(rec);
    const tips = [];
    if (ev.status_tensi && ev.status_tensi !== 'NORMAL') {
      tips.push(ev.status_tensi === 'HIPOTENSI'
        ? 'Tensi rendah: perbanyak air putih, istirahat cukup, hindari berdiri mendadak.'
        : 'Tensi di atas normal: kurangi garam & gorengan, kelola stres, rutin konsumsi obat antihipertensi jika diresepkan dokter.');
    }
    if (ev.status_gula && ev.status_gula !== 'NORMAL') {
      tips.push(ev.status_gula === 'HIPOGLIKEMIA'
        ? 'Gula darah rendah: segera konsumsi asupan manis aman & konsultasikan dosis obat diabetes.'
        : 'Gula darah meningkat: batasi gula/minuman manis & nasi putih berlebih, perbanyak serat & aktivitas fisik.');
    }
    if (ev.status_kolesterol && ev.status_kolesterol !== 'NORMAL') {
      tips.push('Kolesterol meningkat: kurangi santan, gorengan, & daging berlemak; perbanyak sayur & olahraga 30 menit/hari.');
    }
    if (ev.status_asam_urat && ev.status_asam_urat !== 'NORMAL') {
      tips.push('Asam urat di atas batas normal: batasi jeroan, emping/melinjo, kacang-kacangan & seafood; minum air putih min. 2L/hari.');
    }
    if (!tips.length) {
      return 'Seluruh parameter yang diperiksa berada dalam rentang normal. Pertahankan pola makan seimbang, hidrasi cukup & cek rutin berkala.';
    }
    return tips.join(' ');
  }

  global.setPemeriksaanTab = (t) => {
    S().AppState.subTabs.pemeriksaan = t || 'semua';
    S().AppState.activeSubTab = S().AppState.subTabs.pemeriksaan;
    if (typeof global.syncNavHighlight === 'function') global.syncNavHighlight();
    global.renderActiveView();
  };

  global.setPemeriksaanSearch = (val) => {
    searchQ = String(val || '');
    global.renderActiveView();
  };

  global.setPemeriksaanFilter = (mode) => {
    filterMode = mode || 'SEMUA';
    global.renderActiveView();
  };

  function getFilteredRecords(subTab) {
    const all = (S().AppState.pemeriksaanPasien || []).slice().sort((a, b) => String(b.tanggal || '').localeCompare(String(a.tanggal || '')));
    const q = searchQ.trim().toLowerCase();
    const todayIso = new Date().toISOString().slice(0, 10);

    return all.filter((r) => {
      if (subTab === 'tensi' && !(Number(r.tensi_sistol || 0) > 0 && Number(r.tensi_diastol || 0) > 0)) return false;
      if (subTab === 'gula' && !(Number(r.gula_darah || 0) > 0)) return false;
      if (subTab === 'kolesterol' && !(Number(r.kolesterol_total || 0) > 0)) return false;
      if (subTab === 'asam_urat' && !(Number(r.asam_urat || 0) > 0)) return false;

      if (q) {
        const hay = [r.id_periksa, r.nama_pasien, r.no_wa, r.keluhan_catatan, r.saran_apoteker, r.petugas].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }

      if (filterMode === 'WASPADA' && !isAbnormalRow(r)) return false;
      if (filterMode === 'HARI_INI' && String(r.tanggal || '').slice(0, 10) !== todayIso) return false;
      if (filterMode === 'BELUM_WA' && String(r.wa_terkirim || 'BELUM').indexOf('TERKIRIM') === 0) return false;
      return true;
    });
  }

  function renderGuidanceBanner(subTab) {
    const info = {
      tensi: {
        title: 'Panduan Referensi Tekanan Darah (AHA / Kemenkes)',
        items: [
          { lbl: 'Normal', rng: '< 120 / < 80 mmHg', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
          { lbl: 'Meningkat', rng: '120-129 / < 80 mmHg', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
          { lbl: 'Hipertensi Tahap 1', rng: '130-139 / 80-89 mmHg', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
          { lbl: 'Hipertensi Tahap 2', rng: '>= 140 / >= 90 mmHg', cls: 'bg-red-50 text-red-700 border-red-200' }
        ]
      },
      gula: {
        title: 'Panduan Referensi Gula Darah Kapiler (PERKENI)',
        items: [
          { lbl: 'GDS Normal', rng: '< 140 mg/dL', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
          { lbl: 'GDP Normal (Puasa)', rng: '70 - 99 mg/dL', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
          { lbl: 'Waspada / Pra-DM', rng: 'GDS 140-199 | GDP 100-125', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
          { lbl: 'Tinggi (Evaluasi DM)', rng: 'GDS >= 200 | GDP >= 126', cls: 'bg-red-50 text-red-700 border-red-200' }
        ]
      },
      kolesterol: {
        title: 'Panduan Referensi Kolesterol Total (NCEP ATP III)',
        items: [
          { lbl: 'Optimal / Normal', rng: '< 200 mg/dL', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
          { lbl: 'Batas Tinggi (Waspada)', rng: '200 - 239 mg/dL', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
          { lbl: 'Tinggi', rng: '>= 240 mg/dL', cls: 'bg-red-50 text-red-700 border-red-200' }
        ]
      },
      asam_urat: {
        title: 'Panduan Referensi Asam Urat Darah (WHO / Kemenkes)',
        items: [
          { lbl: 'Normal Pria (L)', rng: '3.4 - 7.0 mg/dL', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
          { lbl: 'Normal Wanita (P)', rng: '2.4 - 6.0 mg/dL', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
          { lbl: 'Hiperurisemia (Tinggi)', rng: 'L > 7.0 | P > 6.0 mg/dL', cls: 'bg-red-50 text-red-700 border-red-200' }
        ]
      }
    };
    const cfg = info[subTab];
    if (!cfg) return '';
    return `<div class="ons-card p-3.5 text-xs">
      <div class="font-bold text-slate-800 mb-2">${cfg.title}</div>
      <div class="flex flex-wrap gap-2">
        ${cfg.items.map((it) => `<div class="px-2.5 py-1.5 rounded-lg border font-medium ${it.cls}"><b>${it.lbl}:</b> <span class="font-mono-num">${it.rng}</span></div>`).join('')}
      </div>
    </div>`;
  }

  function renderParamChip(label, valText, statusCode) {
    if (!valText) return `<span class="text-[11px] opacity-40">-</span>`;
    const m = metaStatusBadge(statusCode);
    return `<div class="inline-flex flex-col gap-0.5">
      <span class="font-mono-num font-bold text-xs">${S().esc(valText)}</span>
      <span class="px-1.5 py-0.5 rounded border text-[10px] font-bold w-fit ${m.hex}">${S().esc(m.label)}</span>
    </div>`;
  }

  function renderPemeriksaanView() {
    const st = S().AppState;
    const subTab = st.subTabs.pemeriksaan || 'semua';
    const allRows = st.pemeriksaanPasien || [];
    const list = getFilteredRecords(subTab);
    const todayIso = new Date().toISOString().slice(0, 10);
    const isSupv = S().canSeeFinancialCost();

    const todayCount = allRows.filter((r) => String(r.tanggal || '').slice(0, 10) === todayIso).length;
    const tensiHigh = allRows.filter((r) => Number(r.tensi_sistol || 0) >= 130 || Number(r.tensi_diastol || 0) >= 80).length;
    const gulaHigh = allRows.filter((r) => r.status_gula && r.status_gula !== 'NORMAL').length;
    const kolHigh = allRows.filter((r) => r.status_kolesterol && r.status_kolesterol !== 'NORMAL').length;
    const auHigh = allRows.filter((r) => r.status_asam_urat && r.status_asam_urat !== 'NORMAL').length;
    const waSentCount = allRows.filter((r) => String(r.wa_terkirim || '').indexOf('TERKIRIM') === 0).length;

    const focusLabels = {
      semua: 'Paket Lengkap 4-in-1',
      tensi: 'Cek Tensi Darah',
      gula: 'Cek Gula Darah',
      kolesterol: 'Cek Kolesterol',
      asam_urat: 'Cek Asam Urat'
    };

    return `<div class="space-y-4">
      <div class="ons-card p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <h2 class="text-lg font-extrabold tracking-tight">Pemeriksaan Kesehatan Pasien (POCT)</h2>
            <span class="badge-bpom bpom-bebas">Tersimpan &bull; Kirim WA Pasien</span>
          </div>
          <p class="text-xs mt-1" style="color:var(--ons-text-soft)">Catat hasil cek Tensi Darah, Gula Darah, Kolesterol Total &amp; Asam Urat secara akurat, sinkronkan ke riwayat Member/PRB, dan kirim laporan rapi langsung ke WhatsApp pasien.</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button onclick="window.openPemeriksaanModal('','${S().esc(subTab)}')" class="ons-btn ons-btn-primary text-xs min-h-[44px]">+ Catat ${S().esc(focusLabels[subTab] || 'Pemeriksaan Baru')}</button>
          <button onclick="window.openPemeriksaanModal('','semua')" class="ons-btn ons-btn-emerald text-xs min-h-[44px]">Paket Cek 4-in-1</button>
        </div>
      </div>

      <!-- KPI Kesehatan -->
      <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <div class="ons-kpi-card">
          <div class="text-[11px] font-bold uppercase opacity-70">Total Pemeriksaan</div>
          <div class="text-2xl font-extrabold font-mono-num text-blue-600 mt-1">${allRows.length}</div>
          <div class="text-[11px] mt-1" style="color:var(--ons-text-soft)">Hari ini: <b>${todayCount}</b> pasien</div>
        </div>
        <div class="ons-kpi-card cursor-pointer" onclick="window.setPemeriksaanTab('tensi')">
          <div class="text-[11px] font-bold uppercase opacity-70">Tensi Waspada/Tinggi</div>
          <div class="text-2xl font-extrabold font-mono-num text-red-600 mt-1">${tensiHigh}</div>
          <div class="text-[11px] mt-1" style="color:var(--ons-text-soft)">TD &ge;130/80 mmHg</div>
        </div>
        <div class="ons-kpi-card cursor-pointer" onclick="window.setPemeriksaanTab('gula')">
          <div class="text-[11px] font-bold uppercase opacity-70">Gula Perlu Pantau</div>
          <div class="text-2xl font-extrabold font-mono-num text-amber-600 mt-1">${gulaHigh}</div>
          <div class="text-[11px] mt-1" style="color:var(--ons-text-soft)">GDS / GDP / 2JPP</div>
        </div>
        <div class="ons-kpi-card cursor-pointer" onclick="window.setPemeriksaanTab('kolesterol')">
          <div class="text-[11px] font-bold uppercase opacity-70">Kolesterol Tinggi</div>
          <div class="text-2xl font-extrabold font-mono-num text-amber-600 mt-1">${kolHigh}</div>
          <div class="text-[11px] mt-1" style="color:var(--ons-text-soft)">&ge;200 mg/dL</div>
        </div>
        <div class="ons-kpi-card cursor-pointer" onclick="window.setPemeriksaanTab('asam_urat')">
          <div class="text-[11px] font-bold uppercase opacity-70">Asam Urat Tinggi</div>
          <div class="text-2xl font-extrabold font-mono-num text-red-600 mt-1">${auHigh}</div>
          <div class="text-[11px] mt-1" style="color:var(--ons-text-soft)">L &gt;7.0 | P &gt;6.0 mg/dL</div>
        </div>
        <div class="ons-kpi-card">
          <div class="text-[11px] font-bold uppercase opacity-70">Terkirim ke WA</div>
          <div class="text-2xl font-extrabold font-mono-num text-emerald-600 mt-1">${waSentCount}</div>
          <div class="text-[11px] mt-1" style="color:var(--ons-text-soft)">Arsip digital pasien</div>
        </div>
      </div>

      <!-- 5 Sub-Menu Pemeriksaan Pasien -->
      <div class="ons-tab-bar" role="tablist" aria-label="Sub-Menu Pemeriksaan Kesehatan">
        <button onclick="window.setPemeriksaanTab('semua')" class="ons-tab-btn ${subTab === 'semua' ? 'active' : ''}">Semua Pemeriksaan (${allRows.length})</button>
        <button onclick="window.setPemeriksaanTab('tensi')" class="ons-tab-btn ${subTab === 'tensi' ? 'active' : ''}">Pemeriksaan Tensi (${allRows.filter((r) => Number(r.tensi_sistol || 0) > 0).length})</button>
        <button onclick="window.setPemeriksaanTab('gula')" class="ons-tab-btn ${subTab === 'gula' ? 'active' : ''}">Pemeriksaan Gula Darah (${allRows.filter((r) => Number(r.gula_darah || 0) > 0).length})</button>
        <button onclick="window.setPemeriksaanTab('kolesterol')" class="ons-tab-btn ${subTab === 'kolesterol' ? 'active' : ''}">Pemeriksaan Kolesterol (${allRows.filter((r) => Number(r.kolesterol_total || 0) > 0).length})</button>
        <button onclick="window.setPemeriksaanTab('asam_urat')" class="ons-tab-btn ${subTab === 'asam_urat' ? 'active' : ''}">Pemeriksaan Asam Urat (${allRows.filter((r) => Number(r.asam_urat || 0) > 0).length})</button>
      </div>

      ${renderGuidanceBanner(subTab)}

      <!-- Toolbar Pencarian & Filter + Tabel Riwayat -->
      <div class="ons-card p-4 space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex flex-wrap items-center gap-2 flex-1 min-w-[240px]">
            <input type="text" value="${S().esc(searchQ)}" oninput="window.setPemeriksaanSearch(this.value)" class="ons-input max-w-xs text-xs" placeholder="Cari nama pasien, No. WA, keluhan, atau kode cek..."/>
            <select onchange="window.setPemeriksaanFilter(this.value)" class="ons-select w-44 text-xs">
              <option value="SEMUA" ${filterMode === 'SEMUA' ? 'selected' : ''}>Semua Status</option>
              <option value="WASPADA" ${filterMode === 'WASPADA' ? 'selected' : ''}>Perlu Perhatian / Tinggi</option>
              <option value="HARI_INI" ${filterMode === 'HARI_INI' ? 'selected' : ''}>Pemeriksaan Hari Ini</option>
              <option value="BELUM_WA" ${filterMode === 'BELUM_WA' ? 'selected' : ''}>Belum Dikirim ke WA</option>
            </select>
          </div>
          <div class="text-xs" style="color:var(--ons-text-soft)">Menampilkan <b>${list.length}</b> catatan pemeriksaan tersimpan</div>
        </div>

        ${list.length === 0 ? `<div class="p-8 text-center rounded-xl border border-dashed space-y-3" style="border-color:var(--ons-border);background:var(--ons-bg-subtle)">
          <div class="font-bold text-sm">Belum ada catatan pemeriksaan pada kategori ini</div>
          <div class="text-xs" style="color:var(--ons-text-soft)">Klik tombol di bawah untuk mulai mencatat hasil cek Tensi, Gula Darah, Kolesterol, atau Asam Urat pasien dan kirimkan salinannya ke WhatsApp mereka.</div>
          <button onclick="window.openPemeriksaanModal('','${S().esc(subTab)}')" class="ons-btn ons-btn-primary text-xs">+ Mulai Pemeriksaan Pasien</button>
        </div>` : `<div class="ons-table-wrap">
          <table class="ons-table">
            <thead>
              <tr>
                <th>Waktu &amp; Pasien</th>
                ${(subTab === 'semua' || subTab === 'tensi') ? '<th>Tensi &amp; Nadi</th>' : ''}
                ${(subTab === 'semua' || subTab === 'gula') ? '<th>Gula Darah</th>' : ''}
                ${(subTab === 'semua' || subTab === 'kolesterol') ? '<th>Kolesterol</th>' : ''}
                ${(subTab === 'semua' || subTab === 'asam_urat') ? '<th>Asam Urat</th>' : ''}
                <th>Saran Apoteker &amp; WA</th>
                <th class="text-right">Aksi Cepat</th>
              </tr>
            </thead>
            <tbody>
              ${list.map((r) => {
                const stEv = evalPemeriksaanStatus(r);
                const hasWa = !!S().normalizeWa62(r.no_wa);
                const waSent = String(r.wa_terkirim || '').indexOf('TERKIRIM') === 0 || String(r.wa_terkirim || '').indexOf('ANTRIAN') === 0;
                const tensiTxt = (Number(r.tensi_sistol || 0) > 0 && Number(r.tensi_diastol || 0) > 0) ? (r.tensi_sistol + '/' + r.tensi_diastol + ' mmHg' + (Number(r.nadi_bpm || 0) > 0 ? ' · ' + r.nadi_bpm + ' bpm' : '')) : '';
                const gulaTxt = Number(r.gula_darah || 0) > 0 ? ((r.gula_jenis || 'GDS') + ': ' + r.gula_darah + ' mg/dL') : '';
                const kolTxt = Number(r.kolesterol_total || 0) > 0 ? (r.kolesterol_total + ' mg/dL') : '';
                const auTxt = Number(r.asam_urat || 0) > 0 ? (r.asam_urat + ' mg/dL') : '';
                return `<tr>
                  <td>
                    <div class="font-bold text-xs">${S().esc(r.nama_pasien)}</div>
                    <div class="text-[11px]" style="color:var(--ons-text-soft)">${r.jenis_kelamin === 'P' ? 'P' : 'L'}${r.usia_tahun ? (' · ' + r.usia_tahun + ' th') : ''} &bull; <span class="font-mono-num">${S().esc(r.no_wa || 'No. WA belum diisi')}</span></div>
                    <div class="text-[10px] font-mono-num opacity-75">${S().formatTgl(r.tanggal)} &bull; ${S().esc(r.id_periksa)}${r.id_member ? (' &bull; Member ' + S().esc(r.id_member)) : ''}</div>
                  </td>
                  ${(subTab === 'semua' || subTab === 'tensi') ? `<td>${renderParamChip('Tensi', tensiTxt, r.status_tensi || stEv.status_tensi)}</td>` : ''}
                  ${(subTab === 'semua' || subTab === 'gula') ? `<td>${renderParamChip('Gula', gulaTxt, r.status_gula || stEv.status_gula)}</td>` : ''}
                  ${(subTab === 'semua' || subTab === 'kolesterol') ? `<td>${renderParamChip('Kolesterol', kolTxt, r.status_kolesterol || stEv.status_kolesterol)}</td>` : ''}
                  ${(subTab === 'semua' || subTab === 'asam_urat') ? `<td>${renderParamChip('Asam Urat', auTxt, r.status_asam_urat || stEv.status_asam_urat)}</td>` : ''}
                  <td class="max-w-xs">
                    <div class="text-[11px] line-clamp-2">${S().esc(r.saran_apoteker || r.keluhan_catatan || '-')}</div>
                    <div class="mt-1 flex flex-wrap gap-1 items-center">
                      <span class="px-1.5 py-0.5 rounded text-[10px] font-bold ${waSent ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'}">${waSent ? S().esc(r.wa_terkirim) : 'Belum dikirim WA'}</span>
                      ${Number(r.biaya_cek || 0) > 0 ? `<span class="font-mono-num text-[10px] font-bold text-blue-700">${S().rp(r.biaya_cek)}</span>` : ''}
                    </div>
                  </td>
                  <td class="text-right">
                    <div class="flex flex-wrap justify-end gap-1.5">
                      <button onclick="window.kirimWaLangsungPemeriksaan('${S().esc(r.id_periksa)}')" class="ons-btn ons-btn-emerald text-[11px] py-1.5 px-2.5" ${!hasWa ? 'title="No. WA pasien belum diisi - klik untuk melengkapi / preview"' : 'title="Buka WhatsApp dengan hasil lengkap"'}>Kirim WA</button>
                      <button onclick="window.openWaPemeriksaanModal('${S().esc(r.id_periksa)}')" class="ons-btn ons-btn-ghost text-[11px] py-1.5 px-2">Pratinjau</button>
                      <button onclick="window.printPemeriksaanCard('${S().esc(r.id_periksa)}')" class="ons-btn ons-btn-ghost text-[11px] py-1.5 px-2">Cetak</button>
                      <button onclick="window.openPemeriksaanModal('${S().esc(r.id_periksa)}','${S().esc(subTab)}')" class="ons-btn ons-btn-ghost text-[11px] py-1.5 px-2">Ubah</button>
                      ${isSupv ? `<button onclick="window.deletePemeriksaanRecord('${S().esc(r.id_periksa)}')" class="ons-btn ons-btn-danger text-[11px] py-1.5 px-2">Hapus</button>` : ''}
                    </div>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>`}
      </div>
    </div>`;
  }

  function _readModalDraft() {
    const val = (id) => {
      const el = document.getElementById(id);
      return el ? String(el.value || '').trim() : '';
    };
    const numOrBlank = (id) => {
      const raw = val(id);
      if (!raw) return '';
      const n = Number(raw.replace(',', '.'));
      return Number.isFinite(n) && n > 0 ? n : '';
    };
    return {
      id_periksa: val('chkIdPeriksa'),
      id_member: val('chkMemberId'),
      nama_pasien: val('chkNamaPasien'),
      no_wa: val('chkNoWa'),
      jenis_kelamin: val('chkJk') || 'L',
      usia_tahun: numOrBlank('chkUsia'),
      tensi_sistol: numOrBlank('chkSistol'),
      tensi_diastol: numOrBlank('chkDiastol'),
      nadi_bpm: numOrBlank('chkNadi'),
      gula_jenis: val('chkGulaJenis') || 'GDS',
      gula_darah: numOrBlank('chkGulaVal'),
      kolesterol_total: numOrBlank('chkKolVal'),
      asam_urat: numOrBlank('chkAuVal'),
      keluhan_catatan: val('chkKeluhan'),
      saran_apoteker: val('chkSaran'),
      biaya_cek: Number(val('chkBiaya') || 0),
      petugas: (S().AppState.user && S().AppState.user.nama_lengkap) || 'Apoteker / Tim Farmasi',
      tanggal: new Date().toISOString()
    };
  }

  global.updatePemeriksaanPreview = () => {
    const d = _readModalDraft();
    const ev = evalPemeriksaanStatus(d);

    const setBadge = (elId, code, defaultText) => {
      const el = document.getElementById(elId);
      if (!el) return;
      if (!code) {
        el.className = 'px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500';
        el.textContent = defaultText;
        return;
      }
      const m = metaStatusBadge(code);
      el.className = 'px-2 py-0.5 rounded-full text-[11px] font-bold border ' + m.hex;
      el.textContent = m.label;
    };

    setBadge('chkBadgeTensi', ev.status_tensi, 'Belum diisi');
    setBadge('chkBadgeGula', ev.status_gula, 'Belum diisi');
    setBadge('chkBadgeKol', ev.status_kolesterol, 'Belum diisi');
    setBadge('chkBadgeAu', ev.status_asam_urat, 'Belum diisi');

    const prevBox = document.getElementById('chkWaLivePreview');
    if (prevBox) {
      prevBox.textContent = buildPemeriksaanWaText(Object.assign({}, d, ev));
    }
  };

  global.onSelectMemberPemeriksaan = (memberId) => {
    const mbr = (S().AppState.members || []).find((m) => m.id_member === memberId);
    if (!mbr) return;
    const setV = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
    setV('chkMemberId', mbr.id_member);
    setV('chkNamaPasien', mbr.nama_pasien || '');
    setV('chkNoWa', mbr.no_hp || '');
    if (mbr.tgl_lahir && /^\d{4}-\d{2}-\d{2}/.test(mbr.tgl_lahir)) {
      const age = Math.max(1, new Date().getFullYear() - Number(mbr.tgl_lahir.slice(0, 4)));
      if (age < 120) setV('chkUsia', String(age));
    }
    if (mbr.penyakit_kronis) {
      const kelEl = document.getElementById('chkKeluhan');
      if (kelEl && !kelEl.value) kelEl.value = 'Kontrol rutin: ' + mbr.penyakit_kronis;
    }
    global.updatePemeriksaanPreview();
  };

  global.applyAutoAdvicePemeriksaan = () => {
    const d = _readModalDraft();
    const saranEl = document.getElementById('chkSaran');
    if (saranEl) saranEl.value = buildAutoAdvice(d);
    global.updatePemeriksaanPreview();
    global.toast('Saran klinis otomatis diisi berdasarkan angka hasil pemeriksaan.', 'ok');
  };

  global.openPemeriksaanModal = (idPeriksa, focusParam) => {
    const rec = idPeriksa ? (S().AppState.pemeriksaanPasien || []).find((x) => x.id_periksa === idPeriksa) : null;
    const members = S().AppState.members || [];
    const focus = focusParam || 'semua';
    const ringCls = (p) => (focus === p ? 'ring-2 ring-blue-500 border-blue-400' : '');

    S().openModal(`<div class="ons-ws-modal" data-ws-custom="1">
      <div class="ons-ws-topbar">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-10 h-10 rounded-xl bg-blue-600 text-white font-extrabold flex items-center justify-center shrink-0 text-sm">+POCT</div>
          <div class="min-w-0">
            <h3 class="font-extrabold text-base truncate">${rec ? 'Perbarui Data Pemeriksaan Pasien' : 'Studio Pemeriksaan Kesehatan Pasien (4-in-1)'}</h3>
            <p class="text-xs truncate" style="color:var(--ons-text-soft)">Isi satu atau beberapa pemeriksaan sekaligus (Tensi, Gula Darah, Kolesterol, Asam Urat) lalu kirim salinan hasil ke WhatsApp pasien.</p>
          </div>
        </div>
        <button onclick="ONSStore.closeModal()" aria-label="Tutup Studio Pemeriksaan" class="ons-btn ons-btn-ghost text-sm px-3 min-h-[40px]">Tutup &times;</button>
      </div>

      <div class="ons-ws-split">
        <div class="ons-ws-pane space-y-4 text-xs">
          <input type="hidden" id="chkIdPeriksa" value="${S().esc((rec && rec.id_periksa) || '')}"/>
          <input type="hidden" id="chkMemberId" value="${S().esc((rec && rec.id_member) || '')}"/>

          <!-- Identitas Pasien -->
          <div class="ons-card p-4 space-y-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="font-bold text-sm text-blue-700">1. Identitas &amp; Nomor WhatsApp Pasien</div>
              ${members.length ? `<select onchange="window.onSelectMemberPemeriksaan(this.value)" class="ons-select w-64 text-xs">
                <option value="">-- Pilih Member / Pasien PRB (Opsional) --</option>
                ${members.map((m) => `<option value="${S().esc(m.id_member)}" ${rec && rec.id_member === m.id_member ? 'selected' : ''}>${S().esc(m.nama_pasien)} (${S().esc(m.id_member)})</option>`).join('')}
              </select>` : ''}
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div class="md:col-span-5">
                <label class="font-semibold block mb-1">Nama Lengkap Pasien *</label>
                <input id="chkNamaPasien" oninput="window.updatePemeriksaanPreview()" class="ons-input" value="${S().esc((rec && rec.nama_pasien) || '')}" placeholder="cth. Ny. Siti Aminah / Tn. Budi"/>
              </div>
              <div class="md:col-span-4">
                <label class="font-semibold block mb-1">No. WhatsApp (Untuk Kirim Hasil)</label>
                <input id="chkNoWa" oninput="window.updatePemeriksaanPreview()" class="ons-input font-mono-num" value="${S().esc((rec && rec.no_wa) || '')}" placeholder="0812xxxxxxxx / 62812..."/>
              </div>
              <div class="md:col-span-2">
                <label class="font-semibold block mb-1">Gender</label>
                <select id="chkJk" onchange="window.updatePemeriksaanPreview()" class="ons-select">
                  <option value="L" ${(!rec || rec.jenis_kelamin !== 'P') ? 'selected' : ''}>Laki-laki (L)</option>
                  <option value="P" ${(rec && rec.jenis_kelamin === 'P') ? 'selected' : ''}>Perempuan (P)</option>
                </select>
              </div>
              <div class="md:col-span-1">
                <label class="font-semibold block mb-1">Usia</label>
                <input id="chkUsia" type="number" min="1" max="120" oninput="window.updatePemeriksaanPreview()" class="ons-input font-mono-num" value="${S().esc((rec && rec.usia_tahun) || '')}" placeholder="Th"/>
              </div>
            </div>
          </div>

          <!-- 4 Panel Pemeriksaan -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <!-- Panel Tensi -->
            <div class="ons-card p-4 space-y-2.5 ${ringCls('tensi')}">
              <div class="flex items-center justify-between gap-2">
                <div class="font-bold text-sm">A. Pemeriksaan Tensi Darah</div>
                <span id="chkBadgeTensi" class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500">Belum diisi</span>
              </div>
              <div class="grid grid-cols-3 gap-2">
                <div>
                  <label class="font-semibold block mb-1 text-[11px]">Sistol (Atas)</label>
                  <input id="chkSistol" type="number" min="50" max="300" oninput="window.updatePemeriksaanPreview()" class="ons-input font-mono-num" value="${S().esc((rec && rec.tensi_sistol) || '')}" placeholder="120"/>
                </div>
                <div>
                  <label class="font-semibold block mb-1 text-[11px]">Diastol (Bawah)</label>
                  <input id="chkDiastol" type="number" min="30" max="200" oninput="window.updatePemeriksaanPreview()" class="ons-input font-mono-num" value="${S().esc((rec && rec.tensi_diastol) || '')}" placeholder="80"/>
                </div>
                <div>
                  <label class="font-semibold block mb-1 text-[11px]">Nadi (bpm)</label>
                  <input id="chkNadi" type="number" min="30" max="220" oninput="window.updatePemeriksaanPreview()" class="ons-input font-mono-num" value="${S().esc((rec && rec.nadi_bpm) || '')}" placeholder="76"/>
                </div>
              </div>
              <div class="text-[11px]" style="color:var(--ons-text-soft)">Rujukan normal: &lt;120/80 mmHg.</div>
            </div>

            <!-- Panel Gula Darah -->
            <div class="ons-card p-4 space-y-2.5 ${ringCls('gula')}">
              <div class="flex items-center justify-between gap-2">
                <div class="font-bold text-sm">B. Pemeriksaan Gula Darah</div>
                <span id="chkBadgeGula" class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500">Belum diisi</span>
              </div>
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="font-semibold block mb-1 text-[11px]">Metode / Waktu Cek</label>
                  <select id="chkGulaJenis" onchange="window.updatePemeriksaanPreview()" class="ons-select">
                    <option value="GDS" ${(!rec || rec.gula_jenis === 'GDS') ? 'selected' : ''}>Gula Sewaktu (GDS)</option>
                    <option value="GDP" ${(rec && rec.gula_jenis === 'GDP') ? 'selected' : ''}>Gula Puasa (GDP)</option>
                    <option value="GD2PP" ${(rec && rec.gula_jenis === 'GD2PP') ? 'selected' : ''}>Gula 2 Jam PP</option>
                  </select>
                </div>
                <div>
                  <label class="font-semibold block mb-1 text-[11px]">Nilai (mg/dL)</label>
                  <input id="chkGulaVal" type="number" min="20" max="800" oninput="window.updatePemeriksaanPreview()" class="ons-input font-mono-num" value="${S().esc((rec && rec.gula_darah) || '')}" placeholder="cth. 115"/>
                </div>
              </div>
              <div class="text-[11px]" style="color:var(--ons-text-soft)">Normal GDS &lt;140 mg/dL &bull; GDP Puasa 70-99 mg/dL.</div>
            </div>

            <!-- Panel Kolesterol -->
            <div class="ons-card p-4 space-y-2.5 ${ringCls('kolesterol')}">
              <div class="flex items-center justify-between gap-2">
                <div class="font-bold text-sm">C. Pemeriksaan Kolesterol Total</div>
                <span id="chkBadgeKol" class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500">Belum diisi</span>
              </div>
              <div>
                <label class="font-semibold block mb-1 text-[11px]">Kolesterol Total (mg/dL)</label>
                <input id="chkKolVal" type="number" min="50" max="600" oninput="window.updatePemeriksaanPreview()" class="ons-input font-mono-num" value="${S().esc((rec && rec.kolesterol_total) || '')}" placeholder="cth. 185"/>
              </div>
              <div class="text-[11px]" style="color:var(--ons-text-soft)">Optimal &lt;200 mg/dL &bull; Waspada 200-239 &bull; Tinggi &ge;240.</div>
            </div>

            <!-- Panel Asam Urat -->
            <div class="ons-card p-4 space-y-2.5 ${ringCls('asam_urat')}">
              <div class="flex items-center justify-between gap-2">
                <div class="font-bold text-sm">D. Pemeriksaan Asam Urat</div>
                <span id="chkBadgeAu" class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500">Belum diisi</span>
              </div>
              <div>
                <label class="font-semibold block mb-1 text-[11px]">Kadar Asam Urat (mg/dL)</label>
                <input id="chkAuVal" type="number" step="0.1" min="1" max="25" oninput="window.updatePemeriksaanPreview()" class="ons-input font-mono-num" value="${S().esc((rec && rec.asam_urat) || '')}" placeholder="cth. 6.2"/>
              </div>
              <div class="text-[11px]" style="color:var(--ons-text-soft)">Normal otomatis menyesuaikan gender: L 3.4-7.0 &bull; P 2.4-6.0 mg/dL.</div>
            </div>
          </div>

          <!-- Keluhan, Saran Apoteker & Biaya -->
          <div class="ons-card p-4 space-y-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="font-bold text-sm">2. Keluhan, Edukasi Apoteker &amp; Biaya Cek</div>
              <button type="button" onclick="window.applyAutoAdvicePemeriksaan()" class="ons-btn ons-btn-ghost text-xs py-1 px-2.5">Isi Saran Klinis Otomatis</button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div class="md:col-span-8 space-y-2">
                <div>
                  <label class="font-semibold block mb-1">Keluhan / Catatan Pasien</label>
                  <input id="chkKeluhan" oninput="window.updatePemeriksaanPreview()" class="ons-input" value="${S().esc((rec && rec.keluhan_catatan) || '')}" placeholder="cth. Pusing ringan sejak pagi / cek kontrol bulanan"/>
                </div>
                <div>
                  <label class="font-semibold block mb-1">Saran &amp; Edukasi Apoteker (Ikut terkirim di WA pasien)</label>
                  <textarea id="chkSaran" rows="2" oninput="window.updatePemeriksaanPreview()" class="ons-textarea" placeholder="Klik 'Isi Saran Klinis Otomatis' atau tulis saran edukasi obat & pola hidup...">${S().esc((rec && rec.saran_apoteker) || '')}</textarea>
                </div>
              </div>
              <div class="md:col-span-4 space-y-2">
                <label class="font-semibold block mb-1">Biaya Layanan Cek (Rp)</label>
                <input id="chkBiaya" type="number" min="0" class="ons-input font-mono-num" value="${S().esc(rec && rec.biaya_cek !== undefined ? rec.biaya_cek : 0)}"/>
                <div class="flex flex-wrap gap-1">
                  ${[0, 15000, 25000, 45000].map((amt) => `<button type="button" onclick="document.getElementById('chkBiaya').value=${amt}" class="px-2 py-1 rounded border text-[11px] font-mono-num hover:bg-blue-50" style="border-color:var(--ons-border)">${amt === 0 ? 'Gratis' : (amt / 1000 + 'rb')}</button>`).join('')}
                </div>
                <div class="text-[11px]" style="color:var(--ons-text-soft)">Jika &gt; Rp 0 pada cek baru, otomatis tercatat di Jurnal Kas Layanan Klinis.</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Panel Kanan: Live Preview WA -->
        <div class="ons-ws-side space-y-3 text-xs">
          <div class="font-bold text-sm">Pratinjau Pesan WhatsApp Pasien (Real-Time)</div>
          <p style="color:var(--ons-text-soft)">Pastikan angka sudah tepat. Setelah disimpan, Anda dapat langsung membuka WhatsApp pasien dengan laporan terformat ini.</p>
          <pre id="chkWaLivePreview" class="p-3.5 rounded-xl border whitespace-pre-wrap font-mono-num text-[11px] leading-relaxed overflow-auto max-h-[54vh]" style="background:var(--ons-bg-card);border-color:var(--ons-border)"></pre>
          <label class="flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer" style="border-color:var(--ons-border);background:var(--ons-bg-card)">
            <input id="chkQueueFonnte" type="checkbox" class="accent-blue-600 mt-0.5"/>
            <span>Antrekan juga ke <b>Fonnte WA Gateway</b> di server (opsional jika token Fonnte aktif di Brankas Rahasia).</span>
          </label>
        </div>
      </div>

      <div class="ons-ws-foot">
        <div class="text-xs" style="color:var(--ons-text-soft)">Data otomatis tersimpan ke arsip <b>PEMERIKSAAN_PASIEN</b> &amp; tersinkron jika pasien merupakan Member PRB.</div>
        <div class="flex flex-wrap gap-2">
          <button onclick="ONSStore.closeModal()" class="ons-btn ons-btn-ghost text-xs">Batal</button>
          <button onclick="window.submitPemeriksaanModal(false)" class="ons-btn ons-btn-primary text-xs">Simpan Hasil Pemeriksaan</button>
          <button onclick="window.submitPemeriksaanModal(true)" class="ons-btn ons-btn-emerald text-xs">Simpan &amp; Kirim ke WA Pasien</button>
        </div>
      </div>
    </div>`, 'full');

    setTimeout(() => {
      global.updatePemeriksaanPreview();
      const focusMap = { tensi: 'chkSistol', gula: 'chkGulaVal', kolesterol: 'chkKolVal', asam_urat: 'chkAuVal' };
      const targetId = focusMap[focus] || 'chkNamaPasien';
      const el = document.getElementById(targetId);
      if (el && !rec) el.focus();
    }, 30);
  };

  global.submitPemeriksaanModal = async (sendWaNow) => {
    const draft = _readModalDraft();
    if (!draft.nama_pasien) {
      global.toast('Nama pasien wajib diisi.', 'err');
      return;
    }
    const hasAny = (Number(draft.tensi_sistol || 0) > 0 && Number(draft.tensi_diastol || 0) > 0) ||
      Number(draft.gula_darah || 0) > 0 || Number(draft.kolesterol_total || 0) > 0 || Number(draft.asam_urat || 0) > 0;
    if (!hasAny) {
      global.toast('Isi minimal satu hasil pemeriksaan (Tensi, Gula Darah, Kolesterol, atau Asam Urat).', 'err');
      return;
    }

    if (!draft.saran_apoteker) {
      draft.saran_apoteker = buildAutoAdvice(draft);
    }

    const queueFonnte = !!document.getElementById('chkQueueFonnte')?.checked;
    const payload = Object.assign({}, draft, {
      queue_wa: queueFonnte,
      wa_pesan: queueFonnte ? buildPemeriksaanWaText(draft) : ''
    });

    try {
      const res = await API().callApi('pemeriksaan.save', payload, { isWrite: true });
      const saved = (res && res.item) || payload;
      const arr = S().AppState.pemeriksaanPasien || [];
      const idx = arr.findIndex((x) => x.id_periksa === saved.id_periksa);
      if (idx >= 0) arr[idx] = saved;
      else arr.unshift(saved);
      S().AppState.pemeriksaanPasien = arr;

      S().closeModal();
      global.toast('Hasil pemeriksaan ' + saved.nama_pasien + ' berhasil disimpan!', 'ok');
      global.renderActiveView();

      if (sendWaNow) {
        await global.kirimWaLangsungPemeriksaan(saved.id_periksa);
      }
    } catch (e) {
      global.toast(e.message || 'Gagal menyimpan hasil pemeriksaan.', 'err');
    }
  };

  global.kirimWaLangsungPemeriksaan = async (idPeriksa) => {
    const rec = (S().AppState.pemeriksaanPasien || []).find((x) => x.id_periksa === idPeriksa);
    if (!rec) return;
    const wa62 = S().normalizeWa62(rec.no_wa);
    if (!wa62) {
      global.openWaPemeriksaanModal(idPeriksa);
      global.toast('Nomor WhatsApp pasien belum terisi. Lengkapi nomor pada pratinjau berikut.', 'warn');
      return;
    }
    const text = buildPemeriksaanWaText(rec);
    const url = S().buildWaUrl(wa62, text);
    if (typeof window !== 'undefined' && window.open) {
      window.open(url, '_blank', 'noopener');
    }
    try {
      const res = await API().callApi('pemeriksaan.markWaSent', { id_periksa: idPeriksa, via: 'WA_ME' }, { isWrite: true });
      rec.wa_terkirim = (res && res.wa_terkirim) || ('TERKIRIM_WA (' + new Date().toISOString().slice(0, 16).replace('T', ' ') + ')');
      global.renderActiveView();
      global.toast('WhatsApp pasien dibuka & status pengiriman ditandai TERKIRIM.', 'ok');
    } catch (e) {
      global.toast('WhatsApp dibuka.', 'info');
    }
  };

  global.openWaPemeriksaanModal = (idPeriksa) => {
    const rec = (S().AppState.pemeriksaanPasien || []).find((x) => x.id_periksa === idPeriksa);
    if (!rec) return;
    const msg = buildPemeriksaanWaText(rec);
    const wa62 = S().normalizeWa62(rec.no_wa);

    S().openModal(`<div class="ons-ws-modal" data-ws-custom="1">
      <div class="ons-ws-topbar">
        <div>
          <h3 class="font-extrabold text-base">Kirim Hasil Pemeriksaan ke WhatsApp Pasien</h3>
          <p class="text-xs" style="color:var(--ons-text-soft)">${S().esc(rec.nama_pasien)} &bull; ${S().formatTgl(rec.tanggal)}</p>
        </div>
        <button onclick="ONSStore.closeModal()" class="ons-btn ons-btn-ghost text-xs">Tutup &times;</button>
      </div>
      <div class="ons-ws-pane space-y-3 text-xs">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="font-semibold block mb-1">Nomor WhatsApp Tujuan Pasien</label>
            <input id="waModalPhone" class="ons-input font-mono-num" value="${S().esc(wa62 || rec.no_wa || '')}" placeholder="0812xxxxxxxx / 62812..."/>
          </div>
          <div class="flex items-end gap-2">
            <button onclick="window.copyWaPemeriksaanText()" class="ons-btn ons-btn-ghost flex-1">Salin Teks Pesan</button>
            <button onclick="window.printPemeriksaanCard('${S().esc(rec.id_periksa)}')" class="ons-btn ons-btn-ghost flex-1">Cetak Kartu Hasil</button>
          </div>
        </div>
        <div>
          <label class="font-semibold block mb-1">Isi Laporan Kesehatan (Dapat diedit sebelum kirim)</label>
          <textarea id="waModalText" rows="13" class="ons-textarea font-mono-num text-[11px]">${S().esc(msg)}</textarea>
        </div>
      </div>
      <div class="ons-ws-foot">
        <div class="text-xs" style="color:var(--ons-text-soft)">Status saat ini: <b>${S().esc(rec.wa_terkirim || 'BELUM')}</b></div>
        <div class="flex flex-wrap gap-2">
          <button onclick="window.sendPemeriksaanViaFonnte('${S().esc(rec.id_periksa)}')" class="ons-btn ons-btn-primary text-xs">Kirim via Antrean Fonnte</button>
          <button onclick="window.openWaFromModal('${S().esc(rec.id_periksa)}')" class="ons-btn ons-btn-emerald text-xs">Buka WhatsApp Pasien (wa.me)</button>
        </div>
      </div>
    </div>`, 'full');
  };

  global.copyWaPemeriksaanText = async () => {
    const txt = (document.getElementById('waModalText') || {}).value || '';
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(txt);
        global.toast('Teks laporan pemeriksaan berhasil disalin!', 'ok');
      } else {
        global.toast('Blok dan salin teks langsung dari kotak pesan di atas.', 'info');
      }
    } catch (e) {
      global.toast('Salin manual dari kotak pesan di atas.', 'info');
    }
  };

  global.openWaFromModal = async (idPeriksa) => {
    const phone = (document.getElementById('waModalPhone') || {}).value || '';
    const txt = (document.getElementById('waModalText') || {}).value || '';
    const wa62 = S().normalizeWa62(phone);
    if (!wa62) {
      global.toast('Masukkan nomor WhatsApp pasien yang valid (min. 8 digit).', 'err');
      return;
    }
    window.open(S().buildWaUrl(wa62, txt), '_blank', 'noopener');
    try {
      const res = await API().callApi('pemeriksaan.markWaSent', { id_periksa: idPeriksa, via: 'WA_ME' }, { isWrite: true });
      const rec = (S().AppState.pemeriksaanPasien || []).find((x) => x.id_periksa === idPeriksa);
      if (rec) {
        rec.no_wa = wa62;
        rec.wa_terkirim = (res && res.wa_terkirim) || ('TERKIRIM_WA (' + new Date().toISOString().slice(0, 16).replace('T', ' ') + ')');
      }
      S().closeModal();
      global.renderActiveView();
      global.toast('WhatsApp pasien dibuka & riwayat pengiriman dicatat.', 'ok');
    } catch (e) {
      S().closeModal();
    }
  };

  global.sendPemeriksaanViaFonnte = async (idPeriksa) => {
    const phone = (document.getElementById('waModalPhone') || {}).value || '';
    const txt = (document.getElementById('waModalText') || {}).value || '';
    const wa62 = S().normalizeWa62(phone);
    if (!wa62) {
      global.toast('Masukkan nomor WhatsApp pasien yang valid.', 'err');
      return;
    }
    try {
      const res = await API().callApi('pemeriksaan.markWaSent', {
        id_periksa: idPeriksa, via: 'FONNTE', no_wa: wa62, wa_pesan: txt
      }, { isWrite: true });
      const rec = (S().AppState.pemeriksaanPasien || []).find((x) => x.id_periksa === idPeriksa);
      if (rec) rec.wa_terkirim = (res && res.wa_terkirim) || 'ANTRIAN_FONNTE';
      S().closeModal();
      global.renderActiveView();
      global.toast('Laporan pemeriksaan masuk antrean kirim Fonnte WA Gateway!', 'ok');
    } catch (e) {
      global.toast(e.message || 'Gagal mengantrekan WA Fonnte.', 'err');
    }
  };

  global.printPemeriksaanCard = (idPeriksa) => {
    const rec = (S().AppState.pemeriksaanPasien || []).find((x) => x.id_periksa === idPeriksa);
    if (!rec) return;
    const prof = (S().getStoreProfile && S().getStoreProfile()) || {};
    const stEv = evalPemeriksaanStatus(rec);
    const rows = [];
    if (Number(rec.tensi_sistol || 0) > 0 && Number(rec.tensi_diastol || 0) > 0) {
      rows.push({
        nama: 'Tekanan Darah (Tensi)' + (Number(rec.nadi_bpm || 0) > 0 ? ' & Nadi' : ''),
        hasil: rec.tensi_sistol + '/' + rec.tensi_diastol + ' mmHg' + (Number(rec.nadi_bpm || 0) > 0 ? (' · Nadi ' + rec.nadi_bpm + ' bpm') : ''),
        rujukan: '< 120 / < 80 mmHg',
        status: metaStatusBadge(rec.status_tensi || stEv.status_tensi).label
      });
    }
    if (Number(rec.gula_darah || 0) > 0) {
      rows.push({
        nama: 'Gula Darah (' + (rec.gula_jenis || 'GDS') + ')',
        hasil: rec.gula_darah + ' mg/dL',
        rujukan: rec.gula_jenis === 'GDP' ? '70 - 99 mg/dL (Puasa)' : '< 140 mg/dL (Sewaktu)',
        status: metaStatusBadge(rec.status_gula || stEv.status_gula).label
      });
    }
    if (Number(rec.kolesterol_total || 0) > 0) {
      rows.push({
        nama: 'Kolesterol Total',
        hasil: rec.kolesterol_total + ' mg/dL',
        rujukan: '< 200 mg/dL',
        status: metaStatusBadge(rec.status_kolesterol || stEv.status_kolesterol).label
      });
    }
    if (Number(rec.asam_urat || 0) > 0) {
      rows.push({
        nama: 'Asam Urat',
        hasil: rec.asam_urat + ' mg/dL',
        rujukan: stEv.jenis_kelamin === 'P' ? '2.4 - 6.0 mg/dL (P)' : '3.4 - 7.0 mg/dL (L)',
        status: metaStatusBadge(rec.status_asam_urat || stEv.status_asam_urat).label
      });
    }

    const html = `<div style="max-width:680px;margin:0 auto;font-family:Arial,sans-serif;color:#0F172A;border:1px solid #CBD5E1;border-radius:12px;padding:24px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #1D4ED8;padding-bottom:12px;margin-bottom:16px;">
        <div>
          <div style="font-size:18px;font-weight:800;color:#1E3A8A;">${S().esc((prof.nama_usaha || 'APOTEK ONS FARMA').toUpperCase())}</div>
          <div style="font-size:11px;color:#475569;">${S().esc([prof.alamat_usaha, prof.kota].filter(Boolean).join(', '))}</div>
          <div style="font-size:11px;color:#475569;">No. SIA: ${S().esc(prof.no_sia || '-')} &bull; WA: ${S().esc(prof.wa_usaha || '-')}</div>
        </div>
        <div style="text-align:right;font-size:11px;">
          <div style="font-weight:700;font-size:13px;color:#1D4ED8;">KARTU HASIL CEK KESEHATAN</div>
          <div>No: <b>${S().esc(rec.id_periksa)}</b></div>
          <div>${S().formatTgl(rec.tanggal)}</div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px;background:#F8FAFC;padding:10px 12px;border-radius:8px;margin-bottom:14px;">
        <div><b>Nama Pasien:</b> ${S().esc(rec.nama_pasien)}</div>
        <div><b>Gender / Usia:</b> ${rec.jenis_kelamin === 'P' ? 'Perempuan' : 'Laki-laki'}${rec.usia_tahun ? (' / ' + rec.usia_tahun + ' tahun') : ''}</div>
        <div><b>No. WhatsApp:</b> ${S().esc(rec.no_wa || '-')}</div>
        <div><b>Petugas Pemeriksa:</b> ${S().esc(rec.petugas || '-')}</div>
      </div>

      <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:14px;">
        <thead>
          <tr style="background:#EFF6FF;color:#1E3A8A;text-align:left;">
            <th style="padding:8px;border:1px solid #CBD5E1;">Parameter Pemeriksaan</th>
            <th style="padding:8px;border:1px solid #CBD5E1;">Hasil Pengukuran</th>
            <th style="padding:8px;border:1px solid #CBD5E1;">Nilai Rujukan Normal</th>
            <th style="padding:8px;border:1px solid #CBD5E1;">Interpretasi</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((row) => `<tr>
            <td style="padding:8px;border:1px solid #CBD5E1;font-weight:600;">${S().esc(row.nama)}</td>
            <td style="padding:8px;border:1px solid #CBD5E1;font-weight:700;font-family:monospace;">${S().esc(row.hasil)}</td>
            <td style="padding:8px;border:1px solid #CBD5E1;color:#475569;">${S().esc(row.rujukan)}</td>
            <td style="padding:8px;border:1px solid #CBD5E1;font-weight:700;">${S().esc(row.status)}</td>
          </tr>`).join('')}
        </tbody>
      </table>

      ${rec.keluhan_catatan ? `<div style="font-size:12px;margin-bottom:8px;"><b>Keluhan / Catatan:</b> ${S().esc(rec.keluhan_catatan)}</div>` : ''}
      ${rec.saran_apoteker ? `<div style="font-size:12px;background:#ECFDF5;border:1px solid #A7F3D0;padding:10px;border-radius:8px;margin-bottom:12px;"><b>Saran &amp; Edukasi Apoteker:</b><br/>${S().esc(rec.saran_apoteker)}</div>` : ''}

      <div style="font-size:10px;color:#64748B;text-align:center;border-top:1px dashed #CBD5E1;padding-top:8px;">
        Hasil pemeriksaan cepat (POCT) apotek sebagai skrining kesehatan awal. Konsultasikan ke dokter apabila keluhan berlanjut.
      </div>
    </div>`;

    S().printHtmlZone(html, true);
  };

  global.deletePemeriksaanRecord = async (idPeriksa) => {
    if (!confirm('Hapus data pemeriksaan ' + idPeriksa + ' dari riwayat?')) return;
    try {
      await API().callApi('pemeriksaan.delete', { id_periksa: idPeriksa }, { isWrite: true });
      S().AppState.pemeriksaanPasien = (S().AppState.pemeriksaanPasien || []).filter((x) => x.id_periksa !== idPeriksa);
      global.toast('Data pemeriksaan dihapus.', 'ok');
      global.renderActiveView();
    } catch (e) {
      global.toast(e.message || 'Gagal menghapus data pemeriksaan.', 'err');
    }
  };

  global.ONSViewsPemeriksaan = {
    renderPemeriksaanView,
    evalPemeriksaanStatus,
    buildPemeriksaanWaText,
    buildAutoAdvice
  };
})(window);
