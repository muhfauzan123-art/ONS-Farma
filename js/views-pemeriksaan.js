/**
 * ONS FARMA DIGITAL ENTERPRISE v16.3
 * Modul Menu & Sub-Menu Pemeriksaan Kesehatan Pasien (POCT Clinical Workstation):
 * - Pemeriksaan Tensi (TD Sistol/Diastol, MAP, Tekanan Nadi & Nadi)
 * - Pemeriksaan Gula Darah (GDS / GDP / GD2PP)
 * - Pemeriksaan Kolesterol Total
 * - Pemeriksaan Asam Urat (Menyesuaikan Gender L/P)
 * - Antropometri Opsional (BB, TB & IMT/BMI), Triage Risiko Klinis & Red-Flag Rujukan
 * - Grafik Tren Longitudinal SVG & Perbandingan Delta vs Kunjungan Sebelumnya
 * - Cetak Kartu Hasil Pasien, Cetak Rekap A4, Export Excel (.xlsx), Integrasi SOAP & Member PRB, serta Kirim WA
 */
(function (global) {
  'use strict';

  const S = () => global.ONSStore;
  const API = () => global.ONSApi;

  let searchQ = '';
  let filterMode = 'SEMUA'; // SEMUA | KRISIS | WASPADA | HARI_INI | KONTROL_DEKAT | BELUM_WA
  let modalFocusOnly = false;
  let modalFocusParam = 'semua';
  let waModalMode = 'HASIL'; // HASIL | REMINDER

  function _todayIso() {
    return new Date().toISOString().slice(0, 10);
  }

  function _addDaysIso(days) {
    const d = new Date();
    d.setDate(d.getDate() + Number(days || 0));
    return d.toISOString().slice(0, 10);
  }

  function _calcDiffDays(fromIso, toIso) {
    if (!fromIso || !toIso) return null;
    const t1 = Date.parse(String(fromIso).slice(0, 10));
    const t2 = Date.parse(String(toIso).slice(0, 10));
    if (!Number.isFinite(t1) || !Number.isFinite(t2)) return null;
    return Math.round((t2 - t1) / 86400000);
  }

  function evalPemeriksaanStatus(d) {
    const rec = d || {};
    const jk = String(rec.jenis_kelamin || 'L').toUpperCase() === 'P' ? 'P' : 'L';
    const sistol = Number(rec.tensi_sistol || 0);
    const diastol = Number(rec.tensi_diastol || 0);
    let statusTensi = '';
    if (sistol > 0 && diastol > 0) {
      if (sistol < 90 || diastol < 60) statusTensi = 'HIPOTENSI';
      else if (sistol >= 180 || diastol >= 120) statusTensi = 'KRISIS_HIPERTENSI';
      else if (sistol >= 140 || diastol >= 90) statusTensi = 'HIPERTENSI_2';
      else if (sistol >= 130 || diastol >= 80) statusTensi = 'HIPERTENSI_1';
      else if (sistol >= 120 && diastol < 80) statusTensi = 'MENINGKAT';
      else statusTensi = 'NORMAL';
    }
    const mapMmhg = (sistol > 0 && diastol > 0) ? Math.round((sistol + 2 * diastol) / 3) : '';
    const pulsePressure = (sistol > 0 && diastol > 0 && sistol > diastol) ? (sistol - diastol) : '';

    const gulaJenis = String(rec.gula_jenis || 'GDS').toUpperCase();
    const gulaVal = Number(rec.gula_darah || 0);
    let statusGula = '';
    if (gulaVal > 0) {
      if (gulaVal < 70) statusGula = 'HIPOGLIKEMIA';
      else if (gulaJenis === 'GDP') {
        statusGula = gulaVal >= 126 ? 'TINGGI' : (gulaVal >= 100 ? 'WASPADA' : 'NORMAL');
      } else {
        statusGula = gulaVal >= 200 ? 'TINGGI' : (gulaVal >= 140 ? 'WASPADA' : 'NORMAL');
      }
    }

    const kolVal = Number(rec.kolesterol_total || 0);
    let statusKolesterol = '';
    if (kolVal > 0) {
      statusKolesterol = kolVal >= 240 ? 'TINGGI' : (kolVal >= 200 ? 'BATAS_TINGGI' : 'NORMAL');
    }

    const auVal = Number(rec.asam_urat || 0);
    let statusAsamUrat = '';
    if (auVal > 0) {
      const hi = jk === 'P' ? 6.0 : 7.0;
      const lo = jk === 'P' ? 2.4 : 3.4;
      statusAsamUrat = auVal > hi ? 'TINGGI' : (auVal < lo ? 'RENDAH' : 'NORMAL');
    }

    const bb = Number(rec.berat_badan || 0);
    const tb = Number(rec.tinggi_badan || 0);
    const imtBmi = (bb > 0 && tb >= 50)
      ? Math.round((bb / Math.pow(tb / 100, 2)) * 10) / 10
      : (Number(rec.imt_bmi || 0) > 0 ? Number(rec.imt_bmi) : '');
    let statusBmi = '';
    if (imtBmi) {
      if (imtBmi < 18.5) statusBmi = 'KURUS';
      else if (imtBmi < 25) statusBmi = 'NORMAL';
      else if (imtBmi < 30) statusBmi = 'OVERWEIGHT';
      else statusBmi = 'OBESITAS';
    }

    const redFlagReasons = [];
    if (statusTensi === 'KRISIS_HIPERTENSI') {
      redFlagReasons.push('Tekanan darah >=180/120 mmHg (Krisis Hipertensi) — Rujuk segera ke dokter/IGD.');
    }
    if (sistol > 0 && sistol < 80) {
      redFlagReasons.push('Tekanan darah sistolik <80 mmHg (Hipotensi berat) — Evaluasi kondisi klinis segera.');
    }
    if (statusGula === 'HIPOGLIKEMIA') {
      redFlagReasons.push('Gula darah <70 mg/dL (Hipoglikemia) — Tangani asupan glukosa & evaluasi terapi insulin/OAD.');
    }
    if (gulaVal >= 300) {
      redFlagReasons.push('Gula darah >=300 mg/dL (Hiperglikemia berat) — Perlu evaluasi dokter segera.');
    }

    const activeStatuses = [statusTensi, statusGula, statusKolesterol, statusAsamUrat].filter(Boolean);
    const abnCount = activeStatuses.filter((s) => s !== 'NORMAL').length;
    let tingkatRisiko = 'NORMAL';
    if (redFlagReasons.length > 0) {
      tingkatRisiko = 'KRISIS_RUJUK';
    } else if (
      statusTensi === 'HIPERTENSI_2' ||
      statusGula === 'TINGGI' ||
      statusKolesterol === 'TINGGI' ||
      statusAsamUrat === 'TINGGI' ||
      abnCount >= 2
    ) {
      tingkatRisiko = 'TINGGI_KONTROL';
    } else if (abnCount >= 1) {
      tingkatRisiko = 'PANTAU';
    }

    return {
      jenis_kelamin: jk,
      gula_jenis: gulaJenis,
      status_tensi: statusTensi,
      status_gula: statusGula,
      status_kolesterol: statusKolesterol,
      status_asam_urat: statusAsamUrat,
      map_mmhg: mapMmhg,
      pulse_pressure: pulsePressure,
      imt_bmi: imtBmi,
      status_bmi: statusBmi,
      tingkat_risiko: tingkatRisiko,
      red_flag_reasons: redFlagReasons
    };
  }

  function metaStatusBadge(code) {
    const c = String(code || '').toUpperCase();
    const map = {
      NORMAL: { label: 'Normal', tone: 'bpom-bebas', hex: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' },
      MENINGKAT: { label: 'Meningkat', tone: 'bpom-terbatas', hex: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30' },
      WASPADA: { label: 'Waspada / Pra-DM', tone: 'bpom-terbatas', hex: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30' },
      BATAS_TINGGI: { label: 'Batas Tinggi', tone: 'bpom-terbatas', hex: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30' },
      HIPERTENSI_1: { label: 'Hipertensi Tahap 1', tone: 'bpom-terbatas', hex: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30' },
      HIPERTENSI_2: { label: 'Hipertensi Tahap 2', tone: 'bpom-keras', hex: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30' },
      KRISIS_HIPERTENSI: { label: 'Krisis Hipertensi!', tone: 'bpom-narko', hex: 'bg-red-600/20 text-red-700 dark:text-red-300 border-red-500/50' },
      HIPOTENSI: { label: 'Tensi Rendah', tone: 'bpom-terbatas', hex: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30' },
      HIPOGLIKEMIA: { label: 'Gula Rendah!', tone: 'bpom-keras', hex: 'bg-red-600/20 text-red-700 dark:text-red-300 border-red-500/50' },
      TINGGI: { label: 'Tinggi / Perlu Kontrol', tone: 'bpom-keras', hex: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30' },
      RENDAH: { label: 'Di Bawah Normal', tone: 'bpom-terbatas', hex: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30' },
      KURUS: { label: 'BB Kurang', tone: 'bpom-terbatas', hex: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30' },
      OVERWEIGHT: { label: 'BB Berlebih', tone: 'bpom-terbatas', hex: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30' },
      OBESITAS: { label: 'Obesitas', tone: 'bpom-keras', hex: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30' }
    };
    return map[c] || { label: c || '-', tone: 'bpom-bebas', hex: 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/25' };
  }

  function metaRiskBadge(riskCode) {
    const c = String(riskCode || 'NORMAL').toUpperCase();
    const map = {
      KRISIS_RUJUK: { label: 'URGENT / RUJUK DOKTER', cls: 'bg-red-600 text-white border-red-700' },
      TINGGI_KONTROL: { label: 'Perlu Kontrol Terapi', cls: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30' },
      PANTAU: { label: 'Pantau Gaya Hidup', cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30' },
      NORMAL: { label: 'Kondisi Stabil', cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' }
    };
    return map[c] || map.NORMAL;
  }

  function isAbnormalRow(r) {
    const s = [r.status_tensi, r.status_gula, r.status_kolesterol, r.status_asam_urat].filter(Boolean);
    return s.some((x) => x !== 'NORMAL');
  }

  function getPatientKey(r) {
    if (!r) return '';
    if (r.id_member && String(r.id_member).trim()) return 'MBR:' + String(r.id_member).trim().toUpperCase();
    const wa = S().normalizeWa62 ? S().normalizeWa62(r.no_wa) : '';
    if (wa) return 'WA:' + wa;
    const nm = String(r.nama_pasien || '').trim().toLowerCase().replace(/\s+/g, ' ');
    return nm ? ('NM:' + nm) : '';
  }

  function getPatientHistory(recOrKey) {
    const all = (S().AppState && S().AppState.pemeriksaanPasien) || [];
    const targetKey = typeof recOrKey === 'string' && /^(MBR|WA|NM):/.test(recOrKey)
      ? recOrKey
      : getPatientKey(typeof recOrKey === 'string' ? all.find((x) => x.id_periksa === recOrKey) : recOrKey);
    if (!targetKey) return [];
    return all.filter((x) => getPatientKey(x) === targetKey)
      .slice()
      .sort((a, b) => String(b.tanggal || '').localeCompare(String(a.tanggal || '')));
  }

  function getPreviousCheckup(rec) {
    if (!rec) return null;
    const hist = getPatientHistory(rec);
    if (hist.length < 2) return null;
    if (rec.id_periksa) {
      const idx = hist.findIndex((x) => x.id_periksa === rec.id_periksa);
      if (idx >= 0) return hist[idx + 1] || null;
    }
    const curDt = String(rec.tanggal || '');
    return hist.find((x) => String(x.tanggal || '') < curDt) || hist[0] || null;
  }

  function _deltaItem(curVal, prevVal, precision, ceilingForImprovement) {
    const c = Number(curVal || 0);
    const p = Number(prevVal || 0);
    if (!(c > 0 && p > 0)) return null;
    const diff = Number((c - p).toFixed(precision || 0));
    const sign = diff > 0 ? '+' : '';
    let tone = 'flat';
    if (diff !== 0) {
      const loweredFromHigh = diff < 0 && p >= ceilingForImprovement;
      const roseIntoHigh = diff > 0 && c >= ceilingForImprovement;
      tone = loweredFromHigh ? 'good' : (roseIntoHigh ? 'bad' : (diff < 0 ? 'down' : 'up'));
    }
    return { diff, text: sign + diff.toFixed(precision || 0), tone, prev: p };
  }

  function computeAllDeltas(cur, prev) {
    if (!cur || !prev) return {};
    const out = {};
    if (Number(cur.tensi_sistol || 0) > 0 && Number(cur.tensi_diastol || 0) > 0 && Number(prev.tensi_sistol || 0) > 0 && Number(prev.tensi_diastol || 0) > 0) {
      const ds = Number(cur.tensi_sistol) - Number(prev.tensi_sistol);
      const dd = Number(cur.tensi_diastol) - Number(prev.tensi_diastol);
      const loweredFromHigh = ds < 0 && Number(prev.tensi_sistol) >= 130;
      const roseIntoHigh = ds > 0 && Number(cur.tensi_sistol) >= 130;
      out.tensi = {
        ds, dd,
        text: (ds > 0 ? '+' + ds : ds) + '/' + (dd > 0 ? '+' + dd : dd),
        prevText: prev.tensi_sistol + '/' + prev.tensi_diastol,
        tone: ds === 0 && dd === 0 ? 'flat' : (loweredFromHigh ? 'good' : (roseIntoHigh ? 'bad' : 'info'))
      };
    }
    const gCeil = String(cur.gula_jenis || 'GDS').toUpperCase() === 'GDP' ? 100 : 140;
    const dg = _deltaItem(cur.gula_darah, prev.gula_darah, 0, gCeil);
    if (dg) out.gula = dg;
    const dk = _deltaItem(cur.kolesterol_total, prev.kolesterol_total, 0, 200);
    if (dk) out.kolesterol = dk;
    const auCeil = String(cur.jenis_kelamin || 'L').toUpperCase() === 'P' ? 6.0 : 7.0;
    const dau = _deltaItem(cur.asam_urat, prev.asam_urat, 1, auCeil);
    if (dau) out.asam_urat = dau;
    return out;
  }

  function renderDeltaChip(deltaObj, unit) {
    if (!deltaObj) return '';
    const clsMap = {
      good: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
      bad: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30',
      flat: 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/20',
      down: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
      up: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
      info: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30'
    };
    const arrow = deltaObj.tone === 'good' || deltaObj.tone === 'down' || (deltaObj.diff < 0 || deltaObj.ds < 0)
      ? '↓' : ((deltaObj.diff > 0 || deltaObj.ds > 0) ? '↑' : '•');
    const lbl = deltaObj.tone === 'good' ? 'Membaik' : (deltaObj.tone === 'bad' ? 'Meningkat' : 'vs lalu');
    return `<span class="px-1.5 py-0.5 rounded border text-[10px] font-mono-num font-semibold w-fit ${clsMap[deltaObj.tone] || clsMap.info}" title="Cek sebelumnya: ${S().esc(String(deltaObj.prevText || deltaObj.prev || '-'))}">${arrow} ${S().esc(deltaObj.text)}${unit ? (' ' + S().esc(unit)) : ''} (${lbl})</span>`;
  }

  function renderClinicalGaugeBar(value, normalMax, warnMax, capMax) {
    const v = Number(value || 0);
    if (!(v > 0) || !capMax) return '';
    const normPct = Math.min(85, Math.max(15, Math.round((normalMax / capMax) * 100)));
    const warnPct = Math.min(95 - normPct, Math.max(8, Math.round(((warnMax - normalMax) / capMax) * 100)));
    const redPct = Math.max(5, 100 - normPct - warnPct);
    const markerPct = Math.min(98, Math.max(2, Math.round((v / capMax) * 100)));
    return `<div class="relative pt-1 pb-0.5">
      <div class="h-1.5 w-full rounded-full overflow-hidden flex opacity-85">
        <div class="bg-emerald-500" style="width:${normPct}%"></div>
        <div class="bg-amber-500" style="width:${warnPct}%"></div>
        <div class="bg-red-500" style="width:${redPct}%"></div>
      </div>
      <div class="w-2.5 h-2.5 rounded-full border-2 border-white bg-slate-900 dark:bg-white dark:border-slate-900 shadow absolute top-0.5" style="left:calc(${markerPct}% - 5px)"></div>
    </div>`;
  }

  function buildPemeriksaanWaText(r) {
    const rec = r || {};
    const prof = (S().getStoreProfile && S().getStoreProfile()) || {};
    const stEval = evalPemeriksaanStatus(rec);
    const stTensi = rec.status_tensi || stEval.status_tensi;
    const stGula = rec.status_gula || stEval.status_gula;
    const stKol = rec.status_kolesterol || stEval.status_kolesterol;
    const stAu = rec.status_asam_urat || stEval.status_asam_urat;
    const prev = getPreviousCheckup(rec);
    const deltas = prev ? computeAllDeltas(rec, prev) : {};

    const lines = [
      '*HASIL PEMERIKSAAN KESEHATAN PASIEN*',
      '*' + String(prof.nama_usaha || 'APOTEK ONS FARMA').toUpperCase() + '*',
      [prof.alamat_usaha, prof.kota].filter(Boolean).join(', '),
      prof.no_sia ? ('SIA: ' + prof.no_sia) : '',
      '--------------------------------',
      'No. Cek   : *' + (rec.id_periksa || '-') + '*',
      'Tanggal   : ' + (S().formatTgl ? S().formatTgl(rec.tanggal) : String(rec.tanggal || '').slice(0, 16)),
      'Pasien    : *' + (rec.nama_pasien || '-') + '* (' + (rec.jenis_kelamin === 'P' ? 'Perempuan' : 'Laki-laki') + (rec.usia_tahun ? ', ' + rec.usia_tahun + ' th' : '') + ')',
      stEval.imt_bmi ? ('BB / TB   : ' + (rec.berat_badan ? rec.berat_badan + ' kg' : '-') + ' / ' + (rec.tinggi_badan ? rec.tinggi_badan + ' cm' : '-') + ' (IMT ' + stEval.imt_bmi + ' - ' + metaStatusBadge(stEval.status_bmi).label + ')') : '',
      '--------------------------------'
    ].filter(Boolean);

    let idxNum = 1;
    if (Number(rec.tensi_sistol || 0) > 0 && Number(rec.tensi_diastol || 0) > 0) {
      const tdDelta = deltas.tensi ? (' _(vs lalu ' + deltas.tensi.prevText + ': ' + deltas.tensi.text + ')_') : '';
      lines.push('*' + (idxNum++) + '. Tekanan Darah (Tensi)*');
      lines.push('   Hasil  : *' + rec.tensi_sistol + '/' + rec.tensi_diastol + ' mmHg*' + (Number(rec.nadi_bpm || 0) > 0 ? (' | Nadi: ' + rec.nadi_bpm + ' bpm') : '') + (stEval.map_mmhg ? (' | MAP: ' + stEval.map_mmhg) : '') + tdDelta);
      lines.push('   Status : ' + metaStatusBadge(stTensi).label + ' _(Normal <120/80 mmHg)_');
    }

    if (Number(rec.gula_darah || 0) > 0) {
      const gj = String(rec.gula_jenis || 'GDS').toUpperCase();
      const refGula = gj === 'GDP' ? 'Normal Puasa <100 mg/dL' : 'Normal Sewaktu <140 mg/dL';
      const gDelta = deltas.gula ? (' _(vs lalu ' + deltas.gula.prev + ': ' + deltas.gula.text + ')_') : '';
      lines.push('*' + (idxNum++) + '. Gula Darah (' + gj + ')*');
      lines.push('   Hasil  : *' + rec.gula_darah + ' mg/dL*' + gDelta);
      lines.push('   Status : ' + metaStatusBadge(stGula).label + ' _(' + refGula + ')_');
    }

    if (Number(rec.kolesterol_total || 0) > 0) {
      const kDelta = deltas.kolesterol ? (' _(vs lalu ' + deltas.kolesterol.prev + ': ' + deltas.kolesterol.text + ')_') : '';
      lines.push('*Kolesterol Total*');
      lines.push('   Hasil  : *' + rec.kolesterol_total + ' mg/dL*' + kDelta);
      lines.push('   Status : ' + metaStatusBadge(stKol).label + ' _(Normal <200 mg/dL)_');
    }

    if (Number(rec.asam_urat || 0) > 0) {
      const refAu = stEval.jenis_kelamin === 'P' ? 'Wanita Normal 2.4-6.0 mg/dL' : 'Pria Normal 3.4-7.0 mg/dL';
      const auDelta = deltas.asam_urat ? (' _(vs lalu ' + deltas.asam_urat.prev + ': ' + deltas.asam_urat.text + ')_') : '';
      lines.push('*Asam Urat*');
      lines.push('   Hasil  : *' + rec.asam_urat + ' mg/dL*' + auDelta);
      lines.push('   Status : ' + metaStatusBadge(stAu).label + ' _(' + refAu + ')_');
    }

    if (stEval.tingkat_risiko === 'KRISIS_RUJUK') {
      lines.push('--------------------------------');
      lines.push('*PERINGATAN MEDIS PENTING:* Hasil memerlukan konsultasi / pemeriksaan dokter segera.');
    }
    if (rec.riwayat_terapi) {
      lines.push('Terapi Saat Ini : ' + rec.riwayat_terapi);
    }
    if (rec.keluhan_catatan) {
      lines.push('--------------------------------');
      lines.push('Catatan   : ' + rec.keluhan_catatan);
    }
    if (rec.saran_apoteker) {
      lines.push('Saran Apoteker : _' + rec.saran_apoteker + '_');
    }
    if (rec.tgl_kontrol) {
      lines.push('*Jadwal Kontrol Ulang : ' + rec.tgl_kontrol + '*');
    }
    lines.push('--------------------------------');
    lines.push('Petugas   : ' + (rec.petugas || 'Apoteker / Tim Farmasi'));
    lines.push('_Simpan pesan ini sebagai arsip riwayat kesehatan Anda. Konsultasi obat GRATIS bersama Apoteker kami._');
    return lines.join('\n');
  }

  function buildKontrolReminderWaText(r) {
    const rec = r || {};
    const prof = (S().getStoreProfile && S().getStoreProfile()) || {};
    const tglK = rec.tgl_kontrol || _todayIso();
    return [
      '*PENGINGAT JADWAL KONTROL KESEHATAN*',
      '*' + String(prof.nama_usaha || 'APOTEK ONS FARMA').toUpperCase() + '*',
      'Halo Bpk/Ibu *' + (rec.nama_pasien || 'Pasien') + '*,',
      'Mengingatkan jadwal kontrol ulang pemeriksaan kesehatan Anda pada *' + tglK + '*.',
      '',
      'Pemeriksaan sebelumnya (' + String(rec.tanggal || '').slice(0, 10) + '):',
      (rec.tensi_sistol ? ('- Tensi: ' + rec.tensi_sistol + '/' + rec.tensi_diastol + ' mmHg') : ''),
      (rec.gula_darah ? ('- Gula Darah (' + (rec.gula_jenis || 'GDS') + '): ' + rec.gula_darah + ' mg/dL') : ''),
      (rec.kolesterol_total ? ('- Kolesterol Total: ' + rec.kolesterol_total + ' mg/dL') : ''),
      (rec.asam_urat ? ('- Asam Urat: ' + rec.asam_urat + ' mg/dL') : ''),
      '',
      'Silakan berkunjung kembali agar Apoteker kami dapat memantau perkembangan kesehatan Anda.',
      prof.wa_usaha ? ('Info & reservasi: WA ' + prof.wa_usaha) : ''
    ].filter((l) => l !== '').join('\n');
  }

  function buildAutoAdvice(rec) {
    const ev = evalPemeriksaanStatus(rec);
    const tips = [];
    if (ev.tingkat_risiko === 'KRISIS_RUJUK') {
      tips.push('[PRIORITAS RUJUK DOKTER] ' + ev.red_flag_reasons.join(' '));
    }
    if (ev.status_tensi && ev.status_tensi !== 'NORMAL') {
      if (ev.status_tensi === 'HIPOTENSI') {
        tips.push('Tensi rendah: cukupi cairan/air putih, istirahat cukup, hindari berdiri mendadak.');
      } else if (ev.status_tensi !== 'KRISIS_HIPERTENSI') {
        tips.push('Tensi di atas normal: kurangi garam & makanan gurih/gorengan, kelola stres, patuhi konsumsi obat antihipertensi dokter.');
      }
    }
    if (ev.status_gula && ev.status_gula !== 'NORMAL') {
      if (ev.status_gula === 'HIPOGLIKEMIA') {
        tips.push('Segera berikan asupan manis aman (air gula/permen) bila pasien sadar & tinjau ulang dosis obat diabetes bersama dokter.');
      } else {
        tips.push('Gula darah meningkat: batasi gula/minuman manis & karbohidrat sederhana, perbanyak serat sayur & aktivitas fisik teratur.');
      }
    }
    if (ev.status_kolesterol && ev.status_kolesterol !== 'NORMAL') {
      tips.push('Kolesterol tinggi: hindari santan kental, gorengan berulang & daging berlemak; perbanyak serat larut & olahraga 30 menit/hari.');
    }
    if (ev.status_asam_urat && ev.status_asam_urat !== 'NORMAL') {
      tips.push('Asam urat di atas batas normal: batasi jeroan, emping/melinjo, kacang-kacangan & seafood; minum air putih minimal 2L/hari.');
    }
    if (ev.status_bmi === 'OVERWEIGHT' || ev.status_bmi === 'OBESITAS') {
      tips.push('IMT (' + ev.imt_bmi + ') melebihi rentang ideal: atur porsi kalori harian & aktivitas aerobik ringan bertahap.');
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

  global.resetPemeriksaanFilter = () => {
    searchQ = '';
    filterMode = 'SEMUA';
    global.renderActiveView();
  };

  function getFilteredRecords(subTab) {
    const all = (S().AppState.pemeriksaanPasien || []).slice().sort((a, b) => String(b.tanggal || '').localeCompare(String(a.tanggal || '')));
    const q = searchQ.trim().toLowerCase();
    const todayIso = _todayIso();

    return all.filter((r) => {
      if (subTab === 'tensi' && !(Number(r.tensi_sistol || 0) > 0 && Number(r.tensi_diastol || 0) > 0)) return false;
      if (subTab === 'gula' && !(Number(r.gula_darah || 0) > 0)) return false;
      if (subTab === 'kolesterol' && !(Number(r.kolesterol_total || 0) > 0)) return false;
      if (subTab === 'asam_urat' && !(Number(r.asam_urat || 0) > 0)) return false;

      if (q) {
        const hay = [r.id_periksa, r.id_member, r.nama_pasien, r.no_wa, r.riwayat_terapi, r.keluhan_catatan, r.saran_apoteker, r.petugas].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }

      if (filterMode === 'KRISIS') {
        const ev = evalPemeriksaanStatus(r);
        if ((r.tingkat_risiko || ev.tingkat_risiko) !== 'KRISIS_RUJUK') return false;
      } else if (filterMode === 'WASPADA' && !isAbnormalRow(r)) {
        return false;
      } else if (filterMode === 'HARI_INI' && String(r.tanggal || '').slice(0, 10) !== todayIso) {
        return false;
      } else if (filterMode === 'KONTROL_DEKAT') {
        if (!r.tgl_kontrol) return false;
        const diff = _calcDiffDays(todayIso, r.tgl_kontrol);
        if (diff === null || diff > 7) return false;
      } else if (filterMode === 'BELUM_WA' && String(r.wa_terkirim || 'BELUM').indexOf('TERKIRIM') === 0) {
        return false;
      }
      return true;
    });
  }

  function renderSpecializedKpiStrip(allRows, subTab) {
    const todayIso = _todayIso();
    const todayCount = allRows.filter((r) => String(r.tanggal || '').slice(0, 10) === todayIso).length;
    const waSentCount = allRows.filter((r) => String(r.wa_terkirim || '').indexOf('TERKIRIM') === 0 || String(r.wa_terkirim || '').indexOf('ANTRIAN') === 0).length;
    const krisisCount = allRows.filter((r) => (r.tingkat_risiko || evalPemeriksaanStatus(r).tingkat_risiko) === 'KRISIS_RUJUK').length;
    const kontrolDue = allRows.filter((r) => {
      if (!r.tgl_kontrol) return false;
      const d = _calcDiffDays(todayIso, r.tgl_kontrol);
      return d !== null && d <= 7;
    }).length;

    if (subTab === 'semua') {
      const tensiHigh = allRows.filter((r) => Number(r.tensi_sistol || 0) >= 130 || Number(r.tensi_diastol || 0) >= 80).length;
      const gulaHigh = allRows.filter((r) => r.status_gula && r.status_gula !== 'NORMAL').length;
      const lipidAuHigh = allRows.filter((r) => (r.status_kolesterol && r.status_kolesterol !== 'NORMAL') || (r.status_asam_urat && r.status_asam_urat !== 'NORMAL')).length;
      return `<div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <div class="ons-kpi-card">
          <div class="text-[11px] font-bold uppercase opacity-70">Total Pemeriksaan</div>
          <div class="text-2xl font-extrabold font-mono-num text-blue-600 mt-1">${allRows.length}</div>
          <div class="text-[11px] mt-1" style="color:var(--ons-text-soft)">Hari ini: <b>${todayCount}</b> pasien</div>
        </div>
        <div class="ons-kpi-card cursor-pointer" onclick="window.setPemeriksaanFilter('KRISIS')">
          <div class="text-[11px] font-bold uppercase opacity-70">Kritis / Rujuk Dokter</div>
          <div class="text-2xl font-extrabold font-mono-num ${krisisCount > 0 ? 'text-red-600' : 'text-emerald-600'} mt-1">${krisisCount}</div>
          <div class="text-[11px] mt-1" style="color:var(--ons-text-soft)">TD &ge;180/120 / Gula &ge;300</div>
        </div>
        <div class="ons-kpi-card cursor-pointer" onclick="window.setPemeriksaanTab('tensi')">
          <div class="text-[11px] font-bold uppercase opacity-70">Tensi Waspada/Tinggi</div>
          <div class="text-2xl font-extrabold font-mono-num text-amber-600 mt-1">${tensiHigh}</div>
          <div class="text-[11px] mt-1" style="color:var(--ons-text-soft)">TD &ge;130/80 mmHg</div>
        </div>
        <div class="ons-kpi-card cursor-pointer" onclick="window.setPemeriksaanTab('gula')">
          <div class="text-[11px] font-bold uppercase opacity-70">Gula / Metabolik Pantau</div>
          <div class="text-2xl font-extrabold font-mono-num text-amber-600 mt-1">${gulaHigh} <span class="text-xs font-normal opacity-75">/ ${lipidAuHigh} Lip-AU</span></div>
          <div class="text-[11px] mt-1" style="color:var(--ons-text-soft)">GDS/GDP, Kol, Asam Urat</div>
        </div>
        <div class="ons-kpi-card cursor-pointer" onclick="window.setPemeriksaanFilter('KONTROL_DEKAT')">
          <div class="text-[11px] font-bold uppercase opacity-70">Jadwal Kontrol &le;7 Hari</div>
          <div class="text-2xl font-extrabold font-mono-num text-sky-600 mt-1">${kontrolDue}</div>
          <div class="text-[11px] mt-1" style="color:var(--ons-text-soft)">Klik untuk filter kontrol</div>
        </div>
        <div class="ons-kpi-card cursor-pointer" onclick="window.setPemeriksaanFilter('BELUM_WA')">
          <div class="text-[11px] font-bold uppercase opacity-70">Terkirim ke WA</div>
          <div class="text-2xl font-extrabold font-mono-num text-emerald-600 mt-1">${waSentCount}</div>
          <div class="text-[11px] mt-1" style="color:var(--ons-text-soft)">Arsip digital pasien</div>
        </div>
      </div>`;
    }

    const metricConfig = {
      tensi: {
        title: 'Tensi Darah',
        rows: allRows.filter((r) => Number(r.tensi_sistol || 0) > 0 && Number(r.tensi_diastol || 0) > 0),
        avgFn: (arr) => arr.length ? (Math.round(arr.reduce((s, r) => s + Number(r.tensi_sistol), 0) / arr.length) + '/' + Math.round(arr.reduce((s, r) => s + Number(r.tensi_diastol), 0) / arr.length) + ' mmHg') : '-',
        normFn: (r) => (r.status_tensi || evalPemeriksaanStatus(r).status_tensi) === 'NORMAL',
        highFn: (r) => ['HIPERTENSI_1', 'HIPERTENSI_2', 'KRISIS_HIPERTENSI'].includes(r.status_tensi || evalPemeriksaanStatus(r).status_tensi),
        maxFn: (arr) => {
          if (!arr.length) return '-';
          const top = arr.slice().sort((a, b) => Number(b.tensi_sistol) - Number(a.tensi_sistol))[0];
          return top.tensi_sistol + '/' + top.tensi_diastol;
        },
        deltaKey: 'tensi'
      },
      gula: {
        title: 'Gula Darah',
        rows: allRows.filter((r) => Number(r.gula_darah || 0) > 0),
        avgFn: (arr) => arr.length ? (Math.round(arr.reduce((s, r) => s + Number(r.gula_darah), 0) / arr.length) + ' mg/dL') : '-',
        normFn: (r) => (r.status_gula || evalPemeriksaanStatus(r).status_gula) === 'NORMAL',
        highFn: (r) => ['WASPADA', 'TINGGI', 'HIPOGLIKEMIA'].includes(r.status_gula || evalPemeriksaanStatus(r).status_gula),
        maxFn: (arr) => arr.length ? (Math.max(...arr.map((r) => Number(r.gula_darah || 0))) + ' mg/dL') : '-',
        deltaKey: 'gula'
      },
      kolesterol: {
        title: 'Kolesterol Total',
        rows: allRows.filter((r) => Number(r.kolesterol_total || 0) > 0),
        avgFn: (arr) => arr.length ? (Math.round(arr.reduce((s, r) => s + Number(r.kolesterol_total), 0) / arr.length) + ' mg/dL') : '-',
        normFn: (r) => (r.status_kolesterol || evalPemeriksaanStatus(r).status_kolesterol) === 'NORMAL',
        highFn: (r) => ['BATAS_TINGGI', 'TINGGI'].includes(r.status_kolesterol || evalPemeriksaanStatus(r).status_kolesterol),
        maxFn: (arr) => arr.length ? (Math.max(...arr.map((r) => Number(r.kolesterol_total || 0))) + ' mg/dL') : '-',
        deltaKey: 'kolesterol'
      },
      asam_urat: {
        title: 'Asam Urat',
        rows: allRows.filter((r) => Number(r.asam_urat || 0) > 0),
        avgFn: (arr) => arr.length ? ((arr.reduce((s, r) => s + Number(r.asam_urat), 0) / arr.length).toFixed(1) + ' mg/dL') : '-',
        normFn: (r) => (r.status_asam_urat || evalPemeriksaanStatus(r).status_asam_urat) === 'NORMAL',
        highFn: (r) => (r.status_asam_urat || evalPemeriksaanStatus(r).status_asam_urat) === 'TINGGI',
        maxFn: (arr) => arr.length ? (Math.max(...arr.map((r) => Number(r.asam_urat || 0))).toFixed(1) + ' mg/dL') : '-',
        deltaKey: 'asam_urat'
      }
    };

    const cfg = metricConfig[subTab] || metricConfig.tensi;
    const subRows = cfg.rows;
    const normalCnt = subRows.filter(cfg.normFn).length;
    const pctNormal = subRows.length ? Math.round((normalCnt / subRows.length) * 100) : 0;
    const highCnt = subRows.filter(cfg.highFn).length;
    const membaikCnt = subRows.filter((r) => {
      const p = getPreviousCheckup(r);
      const d = p ? computeAllDeltas(r, p)[cfg.deltaKey] : null;
      return d && d.tone === 'good';
    }).length;

    return `<div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
      <div class="ons-kpi-card">
        <div class="text-[11px] font-bold uppercase opacity-70">Total Cek ${cfg.title}</div>
        <div class="text-2xl font-extrabold font-mono-num text-blue-600 mt-1">${subRows.length}</div>
        <div class="text-[11px] mt-1" style="color:var(--ons-text-soft)">Hari ini: <b>${subRows.filter((r) => String(r.tanggal || '').slice(0, 10) === todayIso).length}</b></div>
      </div>
      <div class="ons-kpi-card">
        <div class="text-[11px] font-bold uppercase opacity-70">Rata-Rata Terukur</div>
        <div class="text-xl font-extrabold font-mono-num text-sky-600 mt-1">${cfg.avgFn(subRows)}</div>
        <div class="text-[11px] mt-1" style="color:var(--ons-text-soft)">Tertinggi: <b class="font-mono-num">${cfg.maxFn(subRows)}</b></div>
      </div>
      <div class="ons-kpi-card">
        <div class="text-[11px] font-bold uppercase opacity-70">Target Normal</div>
        <div class="text-2xl font-extrabold font-mono-num text-emerald-600 mt-1">${pctNormal}%</div>
        <div class="text-[11px] mt-1" style="color:var(--ons-text-soft)">${normalCnt} dari ${subRows.length} cek normal</div>
      </div>
      <div class="ons-kpi-card cursor-pointer" onclick="window.setPemeriksaanFilter('WASPADA')">
        <div class="text-[11px] font-bold uppercase opacity-70">Perlu Pantau / Tinggi</div>
        <div class="text-2xl font-extrabold font-mono-num text-red-600 mt-1">${highCnt}</div>
        <div class="text-[11px] mt-1" style="color:var(--ons-text-soft)">Rujuk / edukasi terapi</div>
      </div>
      <div class="ons-kpi-card">
        <div class="text-[11px] font-bold uppercase opacity-70">Membaik vs Cek Lalu</div>
        <div class="text-2xl font-extrabold font-mono-num text-emerald-600 mt-1">${membaikCnt}</div>
        <div class="text-[11px] mt-1" style="color:var(--ons-text-soft)">Pasien ulang terkontrol</div>
      </div>
      <div class="ons-kpi-card cursor-pointer" onclick="window.setPemeriksaanFilter('BELUM_WA')">
        <div class="text-[11px] font-bold uppercase opacity-70">Jadwal Kontrol &le;7H</div>
        <div class="text-2xl font-extrabold font-mono-num text-amber-600 mt-1">${kontrolDue}</div>
        <div class="text-[11px] mt-1" style="color:var(--ons-text-soft)">Terkirim WA: <b>${waSentCount}</b></div>
      </div>
    </div>`;
  }

  function renderGuidanceBanner(subTab) {
    const info = {
      tensi: {
        title: 'Panduan Referensi Tekanan Darah (AHA / Kemenkes)',
        items: [
          { lbl: 'Normal', rng: '< 120 / < 80 mmHg', cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' },
          { lbl: 'Meningkat / HT 1', rng: '120-139 / 80-89 mmHg', cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30' },
          { lbl: 'Hipertensi Tahap 2', rng: '>= 140 / >= 90 mmHg', cls: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30' },
          { lbl: 'KRISIS (Rujuk IGD)', rng: '>= 180 / >= 120 mmHg', cls: 'bg-red-600 text-white border-red-700' }
        ]
      },
      gula: {
        title: 'Panduan Referensi Gula Darah Kapiler (PERKENI)',
        items: [
          { lbl: 'GDS Normal', rng: '< 140 mg/dL', cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' },
          { lbl: 'GDP Normal (Puasa)', rng: '70 - 99 mg/dL', cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' },
          { lbl: 'Waspada / Pra-DM', rng: 'GDS 140-199 | GDP 100-125', cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30' },
          { lbl: 'Tinggi / Rujuk >=300', rng: 'GDS >= 200 | GDP >= 126', cls: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30' }
        ]
      },
      kolesterol: {
        title: 'Panduan Referensi Kolesterol Total (NCEP ATP III)',
        items: [
          { lbl: 'Optimal / Normal', rng: '< 200 mg/dL', cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' },
          { lbl: 'Batas Tinggi (Waspada)', rng: '200 - 239 mg/dL', cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30' },
          { lbl: 'Tinggi', rng: '>= 240 mg/dL', cls: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30' }
        ]
      },
      asam_urat: {
        title: 'Panduan Referensi Asam Urat Darah (WHO / Kemenkes)',
        items: [
          { lbl: 'Normal Pria (L)', rng: '3.4 - 7.0 mg/dL', cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' },
          { lbl: 'Normal Wanita (P)', rng: '2.4 - 6.0 mg/dL', cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' },
          { lbl: 'Hiperurisemia (Tinggi)', rng: 'L > 7.0 | P > 6.0 mg/dL', cls: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30' }
        ]
      }
    };
    const cfg = info[subTab];
    if (!cfg) return '';
    return `<div class="ons-card p-3.5 text-xs">
      <div class="font-bold mb-2" style="color:var(--ons-text)">${cfg.title}</div>
      <div class="flex flex-wrap gap-2">
        ${cfg.items.map((it) => `<div class="px-2.5 py-1.5 rounded-lg border font-medium ${it.cls}"><b>${it.lbl}:</b> <span class="font-mono-num">${it.rng}</span></div>`).join('')}
      </div>
    </div>`;
  }

  function renderParamChip(valText, statusCode, deltaObj, unit) {
    if (!valText) return `<span class="text-[11px] opacity-40">-</span>`;
    const m = metaStatusBadge(statusCode);
    return `<div class="inline-flex flex-col gap-0.5">
      <span class="font-mono-num font-bold text-xs">${S().esc(valText)}</span>
      <span class="px-1.5 py-0.5 rounded border text-[10px] font-bold w-fit ${m.hex}">${S().esc(m.label)}</span>
      ${deltaObj ? renderDeltaChip(deltaObj, unit) : ''}
    </div>`;
  }

  function renderPemeriksaanView() {
    const st = S().AppState;
    const subTab = st.subTabs.pemeriksaan || 'semua';
    const allRows = st.pemeriksaanPasien || [];
    const list = getFilteredRecords(subTab);
    const todayIso = _todayIso();
    const isSupv = S().canSeeFinancialCost();

    const focusLabels = {
      semua: 'Paket Lengkap 4-in-1',
      tensi: 'Cek Tensi Darah',
      gula: 'Cek Gula Darah',
      kolesterol: 'Cek Kolesterol',
      asam_urat: 'Cek Asam Urat'
    };

    const visitCountMap = {};
    allRows.forEach((row) => {
      const k = getPatientKey(row);
      if (k) visitCountMap[k] = (visitCountMap[k] || 0) + 1;
    });

    const hasActiveFilter = !!(searchQ.trim() || filterMode !== 'SEMUA');

    return `<div class="space-y-4">
      <div class="ons-card p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <h2 class="text-lg font-extrabold tracking-tight">Pemeriksaan Kesehatan Pasien (POCT)</h2>
            <span class="badge-bpom bpom-bebas">Tren Riwayat &bull; Triage Risiko &bull; Kirim WA</span>
          </div>
          <p class="text-xs mt-1" style="color:var(--ons-text-soft)">Catat cek Tensi (plus MAP), Gula Darah, Kolesterol Total &amp; Asam Urat, pantau perbandingan kunjungan sebelumnya, cetak kartu/rekap A4, &amp; kirim langsung ke WhatsApp pasien.</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button onclick="window.openPemeriksaanModal('','${S().esc(subTab)}')" class="ons-btn ons-btn-primary text-xs min-h-[42px]">+ Catat ${S().esc(focusLabels[subTab] || 'Pemeriksaan Baru')}</button>
          <button onclick="window.openPemeriksaanModal('','semua')" class="ons-btn ons-btn-emerald text-xs min-h-[42px]">Paket Cek 4-in-1</button>
          <button onclick="window.printRekapPemeriksaanA4()" class="ons-btn ons-btn-ghost text-xs min-h-[42px]">Rekap A4</button>
          <button onclick="window.exportPemeriksaanXlsx()" class="ons-btn ons-btn-ghost text-xs min-h-[42px]">Export Excel</button>
        </div>
      </div>

      ${renderSpecializedKpiStrip(allRows, subTab)}

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
            <input type="text" value="${S().esc(searchQ)}" oninput="window.setPemeriksaanSearch(this.value)" class="ons-input max-w-xs text-xs" placeholder="Cari pasien, No. WA, terapi, atau kode cek..."/>
            <select onchange="window.setPemeriksaanFilter(this.value)" class="ons-select w-52 text-xs">
              <option value="SEMUA" ${filterMode === 'SEMUA' ? 'selected' : ''}>Semua Status Pemeriksaan</option>
              <option value="KRISIS" ${filterMode === 'KRISIS' ? 'selected' : ''}>Prioritas Kritis / Rujuk Dokter</option>
              <option value="WASPADA" ${filterMode === 'WASPADA' ? 'selected' : ''}>Perlu Perhatian / Tinggi</option>
              <option value="HARI_INI" ${filterMode === 'HARI_INI' ? 'selected' : ''}>Pemeriksaan Hari Ini</option>
              <option value="KONTROL_DEKAT" ${filterMode === 'KONTROL_DEKAT' ? 'selected' : ''}>Jadwal Kontrol &le; 7 Hari / Lewat</option>
              <option value="BELUM_WA" ${filterMode === 'BELUM_WA' ? 'selected' : ''}>Belum Dikirim ke WA</option>
            </select>
            ${hasActiveFilter ? `<button onclick="window.resetPemeriksaanFilter()" class="ons-btn ons-btn-ghost text-xs py-1.5 px-2.5">Reset</button>` : ''}
          </div>
          <div class="text-xs" style="color:var(--ons-text-soft)">Menampilkan <b>${list.length}</b> catatan pemeriksaan tersimpan</div>
        </div>

        ${list.length === 0 ? `<div class="p-8 text-center rounded-xl border border-dashed space-y-3" style="border-color:var(--ons-border);background:var(--ons-bg-subtle)">
          <div class="font-bold text-sm">Belum ada catatan pemeriksaan pada kategori / filter ini</div>
          <div class="text-xs" style="color:var(--ons-text-soft)">Klik tombol di bawah untuk mencatat hasil cek Tensi, Gula Darah, Kolesterol, atau Asam Urat pasien dan kirimkan salinannya ke WhatsApp mereka.</div>
          <div class="flex flex-wrap justify-center gap-2">
            ${hasActiveFilter ? `<button onclick="window.resetPemeriksaanFilter()" class="ons-btn ons-btn-ghost text-xs">Tampilkan Semua</button>` : ''}
            <button onclick="window.openPemeriksaanModal('','${S().esc(subTab)}')" class="ons-btn ons-btn-primary text-xs">+ Mulai Pemeriksaan Pasien</button>
          </div>
        </div>` : `<div class="ons-table-wrap">
          <table class="ons-table">
            <thead>
              <tr>
                <th>Waktu, Pasien &amp; Triage</th>
                ${(subTab === 'semua' || subTab === 'tensi') ? '<th>Tensi, MAP &amp; Nadi</th>' : ''}
                ${(subTab === 'semua' || subTab === 'gula') ? '<th>Gula Darah</th>' : ''}
                ${(subTab === 'semua' || subTab === 'kolesterol') ? '<th>Kolesterol</th>' : ''}
                ${(subTab === 'semua' || subTab === 'asam_urat') ? '<th>Asam Urat</th>' : ''}
                <th>Saran, Kontrol &amp; Status WA</th>
                <th class="text-right">Aksi Klinis &amp; WA</th>
              </tr>
            </thead>
            <tbody>
              ${list.map((r) => {
                const stEv = evalPemeriksaanStatus(r);
                const risk = metaRiskBadge(r.tingkat_risiko || stEv.tingkat_risiko);
                const prev = getPreviousCheckup(r);
                const deltas = prev ? computeAllDeltas(r, prev) : {};
                const pKey = getPatientKey(r);
                const visitCnt = pKey ? (visitCountMap[pKey] || 1) : 1;
                const hasWa = !!(S().normalizeWa62 && S().normalizeWa62(r.no_wa));
                const waSent = String(r.wa_terkirim || '').indexOf('TERKIRIM') === 0 || String(r.wa_terkirim || '').indexOf('ANTRIAN') === 0;
                const tensiTxt = (Number(r.tensi_sistol || 0) > 0 && Number(r.tensi_diastol || 0) > 0)
                  ? (r.tensi_sistol + '/' + r.tensi_diastol + ' mmHg' + (Number(r.nadi_bpm || 0) > 0 ? ' · ' + r.nadi_bpm + ' bpm' : '')) : '';
                const gulaTxt = Number(r.gula_darah || 0) > 0 ? ((r.gula_jenis || 'GDS') + ': ' + r.gula_darah + ' mg/dL') : '';
                const kolTxt = Number(r.kolesterol_total || 0) > 0 ? (r.kolesterol_total + ' mg/dL') : '';
                const auTxt = Number(r.asam_urat || 0) > 0 ? (r.asam_urat + ' mg/dL') : '';
                const kontrolDays = r.tgl_kontrol ? _calcDiffDays(todayIso, r.tgl_kontrol) : null;
                const kontrolSoon = kontrolDays !== null && kontrolDays <= 7;

                return `<tr>
                  <td>
                    <div class="flex flex-wrap items-center gap-1.5">
                      <span class="font-bold text-xs">${S().esc(r.nama_pasien)}</span>
                      ${visitCnt > 1 ? `<button onclick="window.openPatientTrendDrawer('${S().esc(r.id_periksa)}')" class="px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30 text-[10px] font-bold hover:opacity-80" title="Lihat grafik & riwayat kunjungan">${visitCnt}x Cek</button>` : ''}
                    </div>
                    <div class="text-[11px]" style="color:var(--ons-text-soft)">${r.jenis_kelamin === 'P' ? 'P' : 'L'}${r.usia_tahun ? (' · ' + r.usia_tahun + ' th') : ''}${stEv.imt_bmi ? (' · IMT ' + stEv.imt_bmi) : ''} &bull; <span class="font-mono-num">${S().esc(r.no_wa || 'No. WA belum diisi')}</span></div>
                    <div class="text-[10px] font-mono-num opacity-75">${S().formatTgl(r.tanggal)} &bull; ${S().esc(r.id_periksa)}${r.id_member ? (' &bull; Member ' + S().esc(r.id_member)) : ''}</div>
                    <div class="mt-1 flex flex-wrap gap-1">
                      <span class="px-1.5 py-0.5 rounded border text-[10px] font-bold ${risk.cls}">${S().esc(risk.label)}</span>
                      ${!r.id_member ? `<button onclick="window.daftarkanMemberDariPemeriksaan('${S().esc(r.id_periksa)}')" class="px-1.5 py-0.5 rounded border text-[10px] font-semibold hover:bg-blue-500/10" style="border-color:var(--ons-border)">+ Member</button>` : ''}
                    </div>
                  </td>
                  ${(subTab === 'semua' || subTab === 'tensi') ? `<td>${renderParamChip(tensiTxt, r.status_tensi || stEv.status_tensi, deltas.tensi, 'mmHg')}${stEv.map_mmhg ? `<div class="text-[10px] font-mono-num opacity-70 mt-0.5">MAP ${stEv.map_mmhg} · PP ${stEv.pulse_pressure || '-'}</div>` : ''}</td>` : ''}
                  ${(subTab === 'semua' || subTab === 'gula') ? `<td>${renderParamChip(gulaTxt, r.status_gula || stEv.status_gula, deltas.gula, '')}</td>` : ''}
                  ${(subTab === 'semua' || subTab === 'kolesterol') ? `<td>${renderParamChip(kolTxt, r.status_kolesterol || stEv.status_kolesterol, deltas.kolesterol, '')}</td>` : ''}
                  ${(subTab === 'semua' || subTab === 'asam_urat') ? `<td>${renderParamChip(auTxt, r.status_asam_urat || stEv.status_asam_urat, deltas.asam_urat, '')}</td>` : ''}
                  <td class="max-w-xs">
                    ${r.riwayat_terapi ? `<div class="text-[10px] font-semibold text-sky-700 dark:text-sky-300 truncate">Terapi: ${S().esc(r.riwayat_terapi)}</div>` : ''}
                    <div class="text-[11px] line-clamp-2">${S().esc(r.saran_apoteker || r.keluhan_catatan || '-')}</div>
                    <div class="mt-1 flex flex-wrap gap-1 items-center">
                      <span class="px-1.5 py-0.5 rounded border text-[10px] font-bold ${waSent ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' : 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/20'}">${waSent ? S().esc(r.wa_terkirim) : 'Belum dikirim WA'}</span>
                      ${r.tgl_kontrol ? `<span class="px-1.5 py-0.5 rounded border text-[10px] font-mono-num font-bold ${kontrolSoon ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30' : 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/25'}">Kontrol: ${S().esc(r.tgl_kontrol)}</span>` : ''}
                      ${Number(r.biaya_cek || 0) > 0 ? `<span class="font-mono-num text-[10px] font-bold text-blue-600 dark:text-blue-400">${S().rp(r.biaya_cek)}</span>` : ''}
                    </div>
                  </td>
                  <td class="text-right">
                    <div class="flex flex-wrap justify-end gap-1">
                      <button onclick="window.openPatientTrendDrawer('${S().esc(r.id_periksa)}')" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2" title="Grafik Tren & Riwayat Pasien">Tren</button>
                      <button onclick="window.kirimWaLangsungPemeriksaan('${S().esc(r.id_periksa)}')" class="ons-btn ons-btn-emerald text-[11px] py-1 px-2" ${!hasWa ? 'title="Lengkapi No. WA di Pratinjau"' : 'title="Kirim laporan langsung ke WhatsApp pasien"'}>Kirim WA</button>
                      <button onclick="window.openWaPemeriksaanModal('${S().esc(r.id_periksa)}')" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2">Pratinjau</button>
                      <button onclick="window.printPemeriksaanCard('${S().esc(r.id_periksa)}')" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2">Cetak</button>
                      <button onclick="window.catatSoapDariPemeriksaan('${S().esc(r.id_periksa)}')" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2" title="Simpan ke Catatan SOAP Konseling Apoteker">SOAP</button>
                      <button onclick="window.openPemeriksaanModal('${S().esc(r.id_periksa)}','${S().esc(subTab)}')" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2">Ubah</button>
                      ${isSupv ? `<button onclick="window.deletePemeriksaanRecord('${S().esc(r.id_periksa)}')" class="ons-btn ons-btn-danger text-[11px] py-1 px-2">Hapus</button>` : ''}
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

  function buildSvgTrendChart(historyAsc, mode) {
    if (!historyAsc || !historyAsc.length) {
      return `<div class="text-[11px] opacity-60 py-4 text-center">Belum ada titik data pada parameter ini.</div>`;
    }
    const w = 460;
    const h = 114;
    const padX = 28;
    const padY = 18;
    const usableW = w - padX * 2;
    const usableH = h - padY * 2;

    let allNums = [];
    let targetVal = 0;
    let targetLabel = '';
    if (mode === 'tensi') {
      allNums = historyAsc.flatMap((x) => [Number(x.tensi_sistol || 0), Number(x.tensi_diastol || 0)]).filter((n) => n > 0);
      targetVal = 120;
      targetLabel = 'Target Sistol 120';
    } else if (mode === 'gula') {
      allNums = historyAsc.map((x) => Number(x.gula_darah || 0)).filter((n) => n > 0);
      targetVal = 140;
      targetLabel = 'Batas GDS 140';
    } else if (mode === 'kolesterol') {
      allNums = historyAsc.map((x) => Number(x.kolesterol_total || 0)).filter((n) => n > 0);
      targetVal = 200;
      targetLabel = 'Batas Normal 200';
    } else {
      allNums = historyAsc.map((x) => Number(x.asam_urat || 0)).filter((n) => n > 0);
      targetVal = 7.0;
      targetLabel = 'Batas Normal 7.0';
    }
    if (!allNums.length) {
      return `<div class="text-[11px] opacity-60 py-4 text-center">Belum ada pengukuran tercatat.</div>`;
    }

    const minV = Math.min(...allNums, targetVal) * 0.85;
    const maxV = Math.max(...allNums, targetVal) * 1.1;
    const span = Math.max(1, maxV - minV);
    const yOf = (val) => Math.round((padY + usableH - ((val - minV) / span) * usableH) * 10) / 10;
    const xOf = (idx) => historyAsc.length === 1
      ? Math.round(w / 2)
      : Math.round((padX + (idx / (historyAsc.length - 1)) * usableW) * 10) / 10;

    const refY = yOf(targetVal);
    let paths = '';
    let dots = '';

    if (mode === 'tensi') {
      const ptsSis = [];
      const ptsDia = [];
      historyAsc.forEach((item, i) => {
        const x = xOf(i);
        const sVal = Number(item.tensi_sistol || 0);
        const dVal = Number(item.tensi_diastol || 0);
        if (sVal > 0) {
          const ys = yOf(sVal);
          ptsSis.push(`${x},${ys}`);
          dots += `<circle cx="${x}" cy="${ys}" r="4" fill="#2563EB"/><text x="${x}" y="${ys - 7}" font-size="10" text-anchor="middle" fill="currentColor" font-weight="bold">${sVal}</text>`;
        }
        if (dVal > 0) {
          const yd = yOf(dVal);
          ptsDia.push(`${x},${yd}`);
          dots += `<circle cx="${x}" cy="${yd}" r="3.5" fill="#0EA5E9"/><text x="${x}" y="${yd + 12}" font-size="9" text-anchor="middle" fill="currentColor">${dVal}</text>`;
        }
        dots += `<text x="${x}" y="${h - 2}" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.65">${String(item.tanggal || '').slice(5, 10)}</text>`;
      });
      if (ptsSis.length > 1) paths += `<polyline fill="none" stroke="#2563EB" stroke-width="2.2" points="${ptsSis.join(' ')}"/>`;
      if (ptsDia.length > 1) paths += `<polyline fill="none" stroke="#0EA5E9" stroke-width="1.8" stroke-dasharray="4,2" points="${ptsDia.join(' ')}"/>`;
    } else {
      const field = mode === 'gula' ? 'gula_darah' : (mode === 'kolesterol' ? 'kolesterol_total' : 'asam_urat');
      const color = mode === 'gula' ? '#D97706' : (mode === 'kolesterol' ? '#DC2626' : '#2563EB');
      const pts = [];
      historyAsc.forEach((item, i) => {
        const val = Number(item[field] || 0);
        const x = xOf(i);
        if (val > 0) {
          const y = yOf(val);
          pts.push(`${x},${y}`);
          dots += `<circle cx="${x}" cy="${y}" r="4" fill="${color}"/><text x="${x}" y="${y - 7}" font-size="10" text-anchor="middle" fill="currentColor" font-weight="bold">${val}</text>`;
        }
        dots += `<text x="${x}" y="${h - 2}" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.65">${String(item.tanggal || '').slice(5, 10)}</text>`;
      });
      if (pts.length > 1) paths += `<polyline fill="none" stroke="${color}" stroke-width="2.2" points="${pts.join(' ')}"/>`;
    }

    return `<svg viewBox="0 0 ${w} ${h}" class="w-full h-28 overflow-visible" style="color:var(--ons-text)">
      <line x1="${padX}" y1="${refY}" x2="${w - padX}" y2="${refY}" stroke="#10B981" stroke-width="1.2" stroke-dasharray="5,4"/>
      <text x="${w - padX}" y="${Math.max(10, refY - 4)}" font-size="9" text-anchor="end" fill="#10B981">${S().esc(targetLabel)}</text>
      ${paths}
      ${dots}
    </svg>`;
  }

  global.openPatientTrendDrawer = (idOrKey) => {
    const histDesc = getPatientHistory(idOrKey);
    if (!histDesc.length) {
      global.toast('Riwayat pemeriksaan pasien tidak ditemukan.', 'warn');
      return;
    }
    const latest = histDesc[0];
    const oldest = histDesc[histDesc.length - 1];
    const histAsc = histDesc.slice().reverse();
    const ev = evalPemeriksaanStatus(latest);
    const risk = metaRiskBadge(latest.tingkat_risiko || ev.tingkat_risiko);
    const overallDeltas = histDesc.length > 1 ? computeAllDeltas(latest, histDesc[1]) : {};

    const tensiAsc = histAsc.filter((x) => Number(x.tensi_sistol || 0) > 0 && Number(x.tensi_diastol || 0) > 0);
    const gulaAsc = histAsc.filter((x) => Number(x.gula_darah || 0) > 0);
    const kolAsc = histAsc.filter((x) => Number(x.kolesterol_total || 0) > 0);
    const auAsc = histAsc.filter((x) => Number(x.asam_urat || 0) > 0);

    S().openDrawer(`<div class="p-5 space-y-4 text-xs">
      <div class="flex items-start justify-between gap-2 pb-3 border-b" style="border-color:var(--ons-border)">
        <div>
          <div class="flex flex-wrap items-center gap-1.5">
            <span class="px-2 py-0.5 rounded border text-[10px] font-bold ${risk.cls}">${S().esc(risk.label)}</span>
            <span class="badge-bpom bpom-bebas">${histDesc.length} Kunjungan</span>
            ${latest.id_member ? `<span class="badge-bpom bpom-terbatas">Member ${S().esc(latest.id_member)}</span>` : ''}
          </div>
          <h3 class="text-base font-extrabold mt-1">${S().esc(latest.nama_pasien)}</h3>
          <div class="font-mono-num text-[11px]" style="color:var(--ons-text-soft)">${latest.jenis_kelamin === 'P' ? 'Perempuan' : 'Laki-laki'}${latest.usia_tahun ? (' · ' + latest.usia_tahun + ' th') : ''} &bull; WA: ${S().esc(latest.no_wa || '-')}</div>
        </div>
        <button onclick="ONSStore.closeDrawer()" class="text-xl px-2">&times;</button>
      </div>

      ${histDesc.length > 1 ? `<div class="p-3 rounded-xl border space-y-1.5" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
        <div class="font-bold text-[11px] uppercase tracking-wide opacity-80">Perbandingan Kunjungan Terakhir vs Sebelumnya (${String(histDesc[1].tanggal || '').slice(0, 10)})</div>
        <div class="flex flex-wrap gap-2">
          ${overallDeltas.tensi ? renderDeltaChip(overallDeltas.tensi, 'mmHg Tensi') : ''}
          ${overallDeltas.gula ? renderDeltaChip(overallDeltas.gula, 'mg/dL Gula') : ''}
          ${overallDeltas.kolesterol ? renderDeltaChip(overallDeltas.kolesterol, 'mg/dL Kol') : ''}
          ${overallDeltas.asam_urat ? renderDeltaChip(overallDeltas.asam_urat, 'mg/dL AU') : ''}
        </div>
        <div class="text-[11px]" style="color:var(--ons-text-soft)">Rentang pantauan: ${S().formatTgl(oldest.tanggal)} &rarr; ${S().formatTgl(latest.tanggal)}</div>
      </div>` : ''}

      <div class="space-y-3">
        ${tensiAsc.length ? `<div class="ons-card p-3">
          <div class="flex justify-between font-bold mb-1"><span>Tren Tensi Sistol / Diastol (mmHg)</span><span class="font-mono-num text-blue-600">${latest.tensi_sistol ? (latest.tensi_sistol + '/' + latest.tensi_diastol) : '-'}</span></div>
          ${buildSvgTrendChart(tensiAsc, 'tensi')}
        </div>` : ''}
        ${gulaAsc.length ? `<div class="ons-card p-3">
          <div class="flex justify-between font-bold mb-1"><span>Tren Gula Darah (mg/dL)</span><span class="font-mono-num text-amber-600">${latest.gula_darah || '-'}</span></div>
          ${buildSvgTrendChart(gulaAsc, 'gula')}
        </div>` : ''}
        ${kolAsc.length ? `<div class="ons-card p-3">
          <div class="flex justify-between font-bold mb-1"><span>Tren Kolesterol Total (mg/dL)</span><span class="font-mono-num text-red-600">${latest.kolesterol_total || '-'}</span></div>
          ${buildSvgTrendChart(kolAsc, 'kolesterol')}
        </div>` : ''}
        ${auAsc.length ? `<div class="ons-card p-3">
          <div class="flex justify-between font-bold mb-1"><span>Tren Asam Urat (mg/dL)</span><span class="font-mono-num text-blue-600">${latest.asam_urat || '-'}</span></div>
          ${buildSvgTrendChart(auAsc, 'asam_urat')}
        </div>` : ''}
      </div>

      <div>
        <div class="font-bold mb-2">Timeline Riwayat Pemeriksaan (${histDesc.length})</div>
        <div class="space-y-2 max-h-56 overflow-y-auto pr-1">
          ${histDesc.map((h) => `<div class="p-2.5 rounded-lg border space-y-1" style="border-color:var(--ons-border);background:var(--ons-bg-card)">
            <div class="flex justify-between font-semibold">
              <span class="font-mono-num">${S().formatTgl(h.tanggal)}</span>
              <span class="font-mono-num text-[10px] opacity-75">${S().esc(h.id_periksa)}</span>
            </div>
            <div class="flex flex-wrap gap-2 font-mono-num text-[11px]">
              ${h.tensi_sistol ? `<span>TD: <b>${h.tensi_sistol}/${h.tensi_diastol}</b></span>` : ''}
              ${h.gula_darah ? `<span>${S().esc(h.gula_jenis || 'GDS')}: <b>${h.gula_darah}</b></span>` : ''}
              ${h.kolesterol_total ? `<span>Kol: <b>${h.kolesterol_total}</b></span>` : ''}
              ${h.asam_urat ? `<span>AU: <b>${h.asam_urat}</b></span>` : ''}
            </div>
            ${h.saran_apoteker ? `<div class="text-[11px]" style="color:var(--ons-text-soft)">${S().esc(h.saran_apoteker)}</div>` : ''}
          </div>`).join('')}
        </div>
      </div>

      <div class="flex flex-wrap gap-2 pt-2 border-t" style="border-color:var(--ons-border)">
        <button onclick="ONSStore.closeDrawer();window.openPemeriksaanModal('','semua','${S().esc(latest.id_periksa)}');" class="ons-btn ons-btn-primary flex-1 text-xs">+ Cek Ulang Pasien Ini</button>
        <button onclick="window.printPemeriksaanCard('${S().esc(latest.id_periksa)}')" class="ons-btn ons-btn-ghost text-xs">Cetak Terakhir</button>
        <button onclick="window.openWaPemeriksaanModal('${S().esc(latest.id_periksa)}')" class="ons-btn ons-btn-emerald text-xs">Kirim WA</button>
      </div>
    </div>`, '540px');
  };

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
    const draft = {
      id_periksa: val('chkIdPeriksa'),
      id_member: val('chkMemberId'),
      nama_pasien: val('chkNamaPasien'),
      no_wa: val('chkNoWa'),
      jenis_kelamin: val('chkJk') || 'L',
      usia_tahun: numOrBlank('chkUsia'),
      berat_badan: numOrBlank('chkBb'),
      tinggi_badan: numOrBlank('chkTb'),
      tensi_sistol: numOrBlank('chkSistol'),
      tensi_diastol: numOrBlank('chkDiastol'),
      nadi_bpm: numOrBlank('chkNadi'),
      gula_jenis: val('chkGulaJenis') || 'GDS',
      gula_darah: numOrBlank('chkGulaVal'),
      kolesterol_total: numOrBlank('chkKolVal'),
      asam_urat: numOrBlank('chkAuVal'),
      riwayat_terapi: val('chkTerapi'),
      keluhan_catatan: val('chkKeluhan'),
      saran_apoteker: val('chkSaran'),
      tgl_kontrol: val('chkTglKontrol'),
      biaya_cek: Number(val('chkBiaya') || 0),
      petugas: (S().AppState.user && S().AppState.user.nama_lengkap) || 'Apoteker / Tim Farmasi',
      tanggal: new Date().toISOString()
    };
    const ev = evalPemeriksaanStatus(draft);
    draft.imt_bmi = ev.imt_bmi;
    draft.tingkat_risiko = ev.tingkat_risiko;
    return draft;
  }

  function _findReturningBaselineBanner(draft) {
    if (!draft.nama_pasien && !draft.id_member && !draft.no_wa) return '';
    const tempRec = Object.assign({}, draft, { tanggal: '9999-12-31' });
    const hist = getPatientHistory(tempRec).filter((x) => !draft.id_periksa || x.id_periksa !== draft.id_periksa);
    if (!hist.length) return '';
    const prev = hist[0];
    return `<div class="p-2.5 rounded-xl border text-[11px] flex flex-wrap items-center justify-between gap-2" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
      <div>
        <span class="font-bold text-blue-600 dark:text-blue-400">Pasien Kunjungan Ulang (${hist.length}x tercatat):</span>
        <span>Terakhir ${String(prev.tanggal || '').slice(0, 10)}:</span>
        <span class="font-mono-num font-semibold">
          ${prev.tensi_sistol ? ('TD ' + prev.tensi_sistol + '/' + prev.tensi_diastol) : ''}
          ${prev.gula_darah ? (' · Gula ' + prev.gula_darah) : ''}
          ${prev.kolesterol_total ? (' · Kol ' + prev.kolesterol_total) : ''}
          ${prev.asam_urat ? (' · AU ' + prev.asam_urat) : ''}
        </span>
      </div>
      <button type="button" onclick="window.openPatientTrendDrawer('${S().esc(prev.id_periksa)}')" class="ons-btn ons-btn-ghost text-[10px] py-1 px-2">Lihat Grafik Tren &rarr;</button>
    </div>`;
  }

  global.updatePemeriksaanPreview = () => {
    const d = _readModalDraft();
    const ev = evalPemeriksaanStatus(d);

    const setBadge = (elId, code, defaultText) => {
      const el = document.getElementById(elId);
      if (!el) return;
      if (!code) {
        el.className = 'px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-500/10 text-slate-500';
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

    const mapEl = document.getElementById('chkTensiCalcInfo');
    if (mapEl) {
      mapEl.innerHTML = ev.map_mmhg
        ? `MAP: <b class="font-mono-num">${ev.map_mmhg} mmHg</b> &bull; Tekanan Nadi (PP): <b class="font-mono-num">${ev.pulse_pressure || '-'} mmHg</b>`
        : 'Rujukan normal: &lt;120/80 mmHg.';
    }

    const gT = document.getElementById('chkGaugeTensi');
    if (gT) gT.innerHTML = renderClinicalGaugeBar(d.tensi_sistol, 119, 139, 200);
    const gG = document.getElementById('chkGaugeGula');
    if (gG) {
      const isGdp = d.gula_jenis === 'GDP';
      gG.innerHTML = renderClinicalGaugeBar(d.gula_darah, isGdp ? 99 : 139, isGdp ? 125 : 199, 300);
    }
    const gK = document.getElementById('chkGaugeKol');
    if (gK) gK.innerHTML = renderClinicalGaugeBar(d.kolesterol_total, 199, 239, 340);
    const gA = document.getElementById('chkGaugeAu');
    if (gA) {
      const auNorm = d.jenis_kelamin === 'P' ? 6.0 : 7.0;
      gA.innerHTML = renderClinicalGaugeBar(d.asam_urat, auNorm, auNorm + 1.5, 12);
    }

    const bmiEl = document.getElementById('chkBmiLive');
    if (bmiEl) {
      bmiEl.innerHTML = ev.imt_bmi
        ? `IMT: <b class="font-mono-num">${ev.imt_bmi}</b> (${S().esc(metaStatusBadge(ev.status_bmi).label)})`
        : 'IMT otomatis';
    }

    const triageBox = document.getElementById('chkTriageLiveBox');
    if (triageBox) {
      if (ev.tingkat_risiko === 'KRISIS_RUJUK') {
        triageBox.className = 'p-3 rounded-xl border bg-red-600/15 border-red-500 text-red-700 dark:text-red-300 text-xs font-bold';
        triageBox.innerHTML = 'PERINGATAN KRITIS (RUJUK DOKTER/IGD): ' + S().esc(ev.red_flag_reasons.join(' '));
      } else if (ev.tingkat_risiko === 'TINGGI_KONTROL') {
        triageBox.className = 'p-2.5 rounded-xl border bg-amber-500/15 border-amber-500/40 text-amber-800 dark:text-amber-300 text-xs font-semibold';
        triageBox.textContent = 'Kategori Triage: Perlu Evaluasi Dokter / Kontrol Terapi. Disarankan jadwalkan kontrol ulang.';
      } else {
        triageBox.className = 'hidden';
        triageBox.textContent = '';
      }
    }

    const baseSlot = document.getElementById('chkBaselineLiveSlot');
    if (baseSlot) baseSlot.innerHTML = _findReturningBaselineBanner(d);

    const prevBox = document.getElementById('chkWaLivePreview');
    if (prevBox) {
      prevBox.textContent = buildPemeriksaanWaText(Object.assign({}, d, ev));
    }
  };

  function _fillPatientIdentity(obj) {
    const setV = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
    setV('chkMemberId', obj.id_member || '');
    setV('chkNamaPasien', obj.nama_pasien || '');
    setV('chkNoWa', obj.no_wa || obj.no_hp || '');
    if (obj.jenis_kelamin) setV('chkJk', obj.jenis_kelamin);
    if (obj.usia_tahun) setV('chkUsia', String(obj.usia_tahun));
    if (obj.berat_badan) setV('chkBb', String(obj.berat_badan));
    if (obj.tinggi_badan) setV('chkTb', String(obj.tinggi_badan));
    if (obj.riwayat_terapi) setV('chkTerapi', obj.riwayat_terapi);
  }

  global.onSelectMemberPemeriksaan = (val) => {
    if (!val) return;
    if (val.startsWith('HIST:')) {
      const idChk = val.slice(5);
      const prev = (S().AppState.pemeriksaanPasien || []).find((x) => x.id_periksa === idChk);
      if (prev) _fillPatientIdentity(prev);
      global.updatePemeriksaanPreview();
      return;
    }
    const cleanId = val.startsWith('MBR:') ? val.slice(4) : val;
    const mbr = (S().AppState.members || []).find((m) => m.id_member === cleanId);
    if (!mbr) return;
    _fillPatientIdentity({
      id_member: mbr.id_member,
      nama_pasien: mbr.nama_pasien,
      no_hp: mbr.no_hp,
      riwayat_terapi: mbr.penyakit_kronis && mbr.penyakit_kronis !== '-' ? ('PRB ' + mbr.penyakit_kronis) : ''
    });
    if (mbr.tgl_lahir && /^\d{4}-\d{2}-\d{2}/.test(mbr.tgl_lahir)) {
      const age = Math.max(1, new Date().getFullYear() - Number(mbr.tgl_lahir.slice(0, 4)));
      const uEl = document.getElementById('chkUsia');
      if (uEl && age < 120) uEl.value = String(age);
    }
    const past = getPatientHistory('MBR:' + mbr.id_member)[0];
    if (past) {
      if (past.jenis_kelamin) {
        const jkEl = document.getElementById('chkJk');
        if (jkEl) jkEl.value = past.jenis_kelamin;
      }
      if (past.berat_badan) {
        const bbEl = document.getElementById('chkBb');
        if (bbEl) bbEl.value = String(past.berat_badan);
      }
      if (past.tinggi_badan) {
        const tbEl = document.getElementById('chkTb');
        if (tbEl) tbEl.value = String(past.tinggi_badan);
      }
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
    global.toast('Saran klinis & status triage otomatis diisi sesuai angka pemeriksaan.', 'ok');
  };

  global.quickSetKontrolDays = (days) => {
    const el = document.getElementById('chkTglKontrol');
    if (el) {
      el.value = _addDaysIso(days);
      global.updatePemeriksaanPreview();
    }
  };

  global.togglePemeriksaanFocusOnly = (focusOnlyFlag) => {
    modalFocusOnly = !!focusOnlyFlag;
    const panels = ['tensi', 'gula', 'kolesterol', 'asam_urat'];
    panels.forEach((p) => {
      const card = document.getElementById('chkCard_' + p);
      if (card) {
        const hide = modalFocusOnly && modalFocusParam !== 'semua' && modalFocusParam !== p;
        card.style.display = hide ? 'none' : '';
      }
    });
    const b1 = document.getElementById('chkModeFocusBtn');
    const b2 = document.getElementById('chkModeAllBtn');
    if (b1) b1.className = 'ons-btn text-[11px] py-1 px-2.5 ' + (modalFocusOnly ? 'ons-btn-primary' : 'ons-btn-ghost');
    if (b2) b2.className = 'ons-btn text-[11px] py-1 px-2.5 ' + (!modalFocusOnly ? 'ons-btn-primary' : 'ons-btn-ghost');
  };

  function _renderParamCardHtml(key, rec, focus) {
    const ringCls = (p) => (focus === p ? 'ring-2 ring-blue-500 border-blue-400' : '');
    if (key === 'tensi') {
      return `<div id="chkCard_tensi" class="ons-card p-4 space-y-2.5 ${ringCls('tensi')}">
        <div class="flex items-center justify-between gap-2">
          <div class="font-bold text-sm">A. Pemeriksaan Tensi Darah</div>
          <span id="chkBadgeTensi" class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-500/10 text-slate-500">Belum diisi</span>
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
        <div id="chkGaugeTensi"></div>
        <div id="chkTensiCalcInfo" class="text-[11px]" style="color:var(--ons-text-soft)">Rujukan normal: &lt;120/80 mmHg.</div>
      </div>`;
    }
    if (key === 'gula') {
      return `<div id="chkCard_gula" class="ons-card p-4 space-y-2.5 ${ringCls('gula')}">
        <div class="flex items-center justify-between gap-2">
          <div class="font-bold text-sm">B. Pemeriksaan Gula Darah</div>
          <span id="chkBadgeGula" class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-500/10 text-slate-500">Belum diisi</span>
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
        <div id="chkGaugeGula"></div>
        <div class="text-[11px]" style="color:var(--ons-text-soft)">Normal GDS &lt;140 mg/dL &bull; GDP Puasa 70-99 mg/dL.</div>
      </div>`;
    }
    if (key === 'kolesterol') {
      return `<div id="chkCard_kolesterol" class="ons-card p-4 space-y-2.5 ${ringCls('kolesterol')}">
        <div class="flex items-center justify-between gap-2">
          <div class="font-bold text-sm">C. Pemeriksaan Kolesterol Total</div>
          <span id="chkBadgeKol" class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-500/10 text-slate-500">Belum diisi</span>
        </div>
        <div>
          <label class="font-semibold block mb-1 text-[11px]">Kolesterol Total (mg/dL)</label>
          <input id="chkKolVal" type="number" min="50" max="600" oninput="window.updatePemeriksaanPreview()" class="ons-input font-mono-num" value="${S().esc((rec && rec.kolesterol_total) || '')}" placeholder="cth. 185"/>
        </div>
        <div id="chkGaugeKol"></div>
        <div class="text-[11px]" style="color:var(--ons-text-soft)">Optimal &lt;200 mg/dL &bull; Waspada 200-239 &bull; Tinggi &ge;240.</div>
      </div>`;
    }
    return `<div id="chkCard_asam_urat" class="ons-card p-4 space-y-2.5 ${ringCls('asam_urat')}">
      <div class="flex items-center justify-between gap-2">
        <div class="font-bold text-sm">D. Pemeriksaan Asam Urat</div>
        <span id="chkBadgeAu" class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-500/10 text-slate-500">Belum diisi</span>
      </div>
      <div>
        <label class="font-semibold block mb-1 text-[11px]">Kadar Asam Urat (mg/dL)</label>
        <input id="chkAuVal" type="number" step="0.1" min="1" max="25" oninput="window.updatePemeriksaanPreview()" class="ons-input font-mono-num" value="${S().esc((rec && rec.asam_urat) || '')}" placeholder="cth. 6.2"/>
      </div>
      <div id="chkGaugeAu"></div>
      <div class="text-[11px]" style="color:var(--ons-text-soft)">Normal menyesuaikan gender: L 3.4-7.0 &bull; P 2.4-6.0 mg/dL.</div>
    </div>`;
  }

  global.openPemeriksaanModal = (idPeriksa, focusParam, prefillFromId) => {
    const allExams = S().AppState.pemeriksaanPasien || [];
    const rec = idPeriksa ? allExams.find((x) => x.id_periksa === idPeriksa) : null;
    const prefillRec = !rec && prefillFromId ? allExams.find((x) => x.id_periksa === prefillFromId) : null;
    const seedIdentity = rec || prefillRec || null;
    const members = S().AppState.members || [];
    const focus = focusParam || 'semua';
    modalFocusParam = focus;
    modalFocusOnly = false;

    const seenWalkin = new Set();
    const walkinPatients = [];
    allExams.forEach((x) => {
      if (x.id_member) return;
      const k = getPatientKey(x);
      if (k && !seenWalkin.has(k)) {
        seenWalkin.add(k);
        walkinPatients.push(x);
      }
    });

    const baseOrder = ['tensi', 'gula', 'kolesterol', 'asam_urat'];
    const orderedKeys = focus !== 'semua' && baseOrder.includes(focus)
      ? [focus, ...baseOrder.filter((k) => k !== focus)]
      : baseOrder;

    const focusReadable = { tensi: 'Tensi', gula: 'Gula Darah', kolesterol: 'Kolesterol', asam_urat: 'Asam Urat' };

    S().openModal(`<div class="ons-ws-modal" data-ws-custom="1">
      <div class="ons-ws-topbar">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-10 h-10 rounded-xl bg-blue-600 text-white font-extrabold flex items-center justify-center shrink-0 text-sm">+POCT</div>
          <div class="min-w-0">
            <h3 class="font-extrabold text-base truncate">${rec ? 'Perbarui Data Pemeriksaan Pasien' : 'Studio Pemeriksaan Kesehatan Pasien (4-in-1)'}</h3>
            <p class="text-xs truncate" style="color:var(--ons-text-soft)">Catat hasil cek kesehatan, deteksi otomatis red-flag &amp; tren vs cek sebelumnya, lalu kirim langsung ke WhatsApp pasien.</p>
          </div>
        </div>
        <button onclick="ONSStore.closeModal()" aria-label="Tutup Studio Pemeriksaan" class="ons-btn ons-btn-ghost text-sm px-3 min-h-[40px]">Tutup &times;</button>
      </div>

      <div class="ons-ws-split">
        <div class="ons-ws-pane space-y-4 text-xs">
          <input type="hidden" id="chkIdPeriksa" value="${S().esc((rec && rec.id_periksa) || '')}"/>
          <input type="hidden" id="chkMemberId" value="${S().esc((seedIdentity && seedIdentity.id_member) || '')}"/>

          <!-- Identitas Pasien & Antropometri -->
          <div class="ons-card p-4 space-y-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="font-bold text-sm text-blue-600 dark:text-blue-400">1. Identitas, WhatsApp &amp; Antropometri Pasien</div>
              ${(members.length || walkinPatients.length) ? `<select onchange="window.onSelectMemberPemeriksaan(this.value)" class="ons-select w-72 text-xs">
                <option value="">-- Recall Member / Pasien Terdahulu --</option>
                ${members.length ? `<optgroup label="Member &amp; Pasien PRB">
                  ${members.map((m) => `<option value="MBR:${S().esc(m.id_member)}" ${seedIdentity && seedIdentity.id_member === m.id_member ? 'selected' : ''}>${S().esc(m.nama_pasien)} (${S().esc(m.id_member)})</option>`).join('')}
                </optgroup>` : ''}
                ${walkinPatients.length ? `<optgroup label="Pasien Kunjungan Sebelumnya">
                  ${walkinPatients.map((p) => `<option value="HIST:${S().esc(p.id_periksa)}" ${seedIdentity && !seedIdentity.id_member && seedIdentity.nama_pasien === p.nama_pasien ? 'selected' : ''}>${S().esc(p.nama_pasien)} (${S().esc(p.no_wa || 'Non-WA')})</option>`).join('')}
                </optgroup>` : ''}
              </select>` : ''}
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div class="md:col-span-5">
                <label class="font-semibold block mb-1">Nama Lengkap Pasien *</label>
                <input id="chkNamaPasien" oninput="window.updatePemeriksaanPreview()" class="ons-input" value="${S().esc((seedIdentity && seedIdentity.nama_pasien) || '')}" placeholder="cth. Ny. Siti Aminah / Tn. Budi"/>
              </div>
              <div class="md:col-span-4">
                <label class="font-semibold block mb-1">No. WhatsApp (Untuk Kirim Hasil)</label>
                <input id="chkNoWa" oninput="window.updatePemeriksaanPreview()" class="ons-input font-mono-num" value="${S().esc((seedIdentity && seedIdentity.no_wa) || '')}" placeholder="0812xxxxxxxx / 62812..."/>
              </div>
              <div class="md:col-span-2">
                <label class="font-semibold block mb-1">Gender</label>
                <select id="chkJk" onchange="window.updatePemeriksaanPreview()" class="ons-select">
                  <option value="L" ${(!seedIdentity || seedIdentity.jenis_kelamin !== 'P') ? 'selected' : ''}>Laki-laki (L)</option>
                  <option value="P" ${(seedIdentity && seedIdentity.jenis_kelamin === 'P') ? 'selected' : ''}>Perempuan (P)</option>
                </select>
              </div>
              <div class="md:col-span-1">
                <label class="font-semibold block mb-1">Usia</label>
                <input id="chkUsia" type="number" min="1" max="120" oninput="window.updatePemeriksaanPreview()" class="ons-input font-mono-num" value="${S().esc((seedIdentity && seedIdentity.usia_tahun) || '')}" placeholder="Th"/>
              </div>
            </div>
            <div class="grid grid-cols-2 md:grid-cols-12 gap-3 pt-1">
              <div class="md:col-span-2">
                <label class="font-semibold block mb-1 text-[11px]">Berat Badan (kg)</label>
                <input id="chkBb" type="number" step="0.5" min="10" max="300" oninput="window.updatePemeriksaanPreview()" class="ons-input font-mono-num" value="${S().esc((seedIdentity && seedIdentity.berat_badan) || '')}" placeholder="65"/>
              </div>
              <div class="md:col-span-2">
                <label class="font-semibold block mb-1 text-[11px]">Tinggi (cm)</label>
                <input id="chkTb" type="number" min="50" max="240" oninput="window.updatePemeriksaanPreview()" class="ons-input font-mono-num" value="${S().esc((seedIdentity && seedIdentity.tinggi_badan) || '')}" placeholder="165"/>
              </div>
              <div class="md:col-span-3 flex items-end pb-2">
                <span id="chkBmiLive" class="text-[11px]" style="color:var(--ons-text-soft)">IMT otomatis</span>
              </div>
              <div class="md:col-span-5">
                <label class="font-semibold block mb-1 text-[11px]">Obat / Terapi Rutin Saat Ini (Opsional)</label>
                <input id="chkTerapi" oninput="window.updatePemeriksaanPreview()" class="ons-input" value="${S().esc((seedIdentity && seedIdentity.riwayat_terapi) || '')}" placeholder="cth. Amlodipine 10mg, Metformin 500mg"/>
              </div>
            </div>
            <div id="chkBaselineLiveSlot"></div>
          </div>

          ${focus !== 'semua' ? `<div class="flex flex-wrap items-center justify-between gap-2 px-1">
            <div class="text-xs font-semibold" style="color:var(--ons-text-soft)">Mode Input: Parameter <b>${S().esc(focusReadable[focus] || focus)}</b> ditempatkan paling atas.</div>
            <div class="flex gap-1.5">
              <button id="chkModeFocusBtn" type="button" onclick="window.togglePemeriksaanFocusOnly(true)" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2.5">Fokus ${S().esc(focusReadable[focus] || focus)} Saja</button>
              <button id="chkModeAllBtn" type="button" onclick="window.togglePemeriksaanFocusOnly(false)" class="ons-btn ons-btn-primary text-[11px] py-1 px-2.5">Tampilkan Semua 4 Parameter</button>
            </div>
          </div>` : ''}

          <div id="chkTriageLiveBox" class="hidden"></div>

          <!-- 4 Panel Pemeriksaan (Dinamis sesuai sub-tab fokus) -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            ${orderedKeys.map((k) => _renderParamCardHtml(k, rec, focus)).join('')}
          </div>

          <!-- Keluhan, Saran Apoteker, Jadwal Kontrol & Biaya -->
          <div class="ons-card p-4 space-y-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="font-bold text-sm">2. Keluhan, Edukasi Apoteker, Jadwal Kontrol &amp; Tarif</div>
              <button type="button" onclick="window.applyAutoAdvicePemeriksaan()" class="ons-btn ons-btn-ghost text-xs py-1 px-2.5">Isi Saran Klinis Otomatis</button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div class="md:col-span-7 space-y-2">
                <div>
                  <label class="font-semibold block mb-1">Keluhan / Catatan Pasien</label>
                  <input id="chkKeluhan" oninput="window.updatePemeriksaanPreview()" class="ons-input" value="${S().esc((rec && rec.keluhan_catatan) || '')}" placeholder="cth. Pusing ringan sejak pagi / cek kontrol bulanan"/>
                </div>
                <div>
                  <label class="font-semibold block mb-1">Saran &amp; Edukasi Apoteker (Ikut terkirim di WA pasien)</label>
                  <textarea id="chkSaran" rows="3" oninput="window.updatePemeriksaanPreview()" class="ons-textarea" placeholder="Klik 'Isi Saran Klinis Otomatis' atau tulis saran edukasi obat & pola hidup...">${S().esc((rec && rec.saran_apoteker) || '')}</textarea>
                </div>
              </div>
              <div class="md:col-span-5 space-y-2.5">
                <div>
                  <label class="font-semibold block mb-1">Jadwal Kontrol Ulang (Opsional)</label>
                  <div class="flex gap-1.5 items-center">
                    <input id="chkTglKontrol" type="date" onchange="window.updatePemeriksaanPreview()" class="ons-input font-mono-num flex-1" value="${S().esc((rec && rec.tgl_kontrol) || '')}"/>
                  </div>
                  <div class="flex flex-wrap gap-1 mt-1">
                    ${[7, 14, 30].map((d) => `<button type="button" onclick="window.quickSetKontrolDays(${d})" class="px-2 py-0.5 rounded border text-[10px] font-semibold hover:bg-blue-500/10" style="border-color:var(--ons-border)">+${d} Hari</button>`).join('')}
                  </div>
                </div>
                <div>
                  <label class="font-semibold block mb-1">Biaya Layanan Cek (Rp)</label>
                  <input id="chkBiaya" type="number" min="0" class="ons-input font-mono-num" value="${S().esc(rec && rec.biaya_cek !== undefined ? rec.biaya_cek : 0)}"/>
                  <div class="flex flex-wrap gap-1 mt-1">
                    ${[0, 10000, 15000, 25000, 45000].map((amt) => `<button type="button" onclick="document.getElementById('chkBiaya').value=${amt}" class="px-2 py-1 rounded border text-[10px] font-mono-num hover:bg-blue-500/10" style="border-color:var(--ons-border)">${amt === 0 ? 'Gratis' : (amt / 1000 + 'rb')}</button>`).join('')}
                  </div>
                  <div class="text-[10px] mt-1" style="color:var(--ons-text-soft)">Jika &gt; Rp 0 pada cek baru, masuk otomatis ke Jurnal Kas Layanan Klinis.</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Panel Kanan: Live Preview WA -->
        <div class="ons-ws-side space-y-3 text-xs">
          <div class="font-bold text-sm">Pratinjau Pesan WhatsApp Pasien (Real-Time)</div>
          <p style="color:var(--ons-text-soft)">Perbandingan dengan cek sebelumnya dan peringatan triage tampil otomatis pada pesan di bawah.</p>
          <pre id="chkWaLivePreview" class="p-3.5 rounded-xl border whitespace-pre-wrap font-mono-num text-[11px] leading-relaxed overflow-auto max-h-[50vh]" style="background:var(--ons-bg-card);border-color:var(--ons-border)"></pre>
          <label class="flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer" style="border-color:var(--ons-border);background:var(--ons-bg-card)">
            <input id="chkQueueFonnte" type="checkbox" class="accent-blue-600 mt-0.5"/>
            <span>Antrekan otomatis ke <b>Fonnte WA Gateway</b> server.</span>
          </label>
          <label class="flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer" style="border-color:var(--ons-border);background:var(--ons-bg-card)">
            <input id="chkSimpanSoap" type="checkbox" class="accent-blue-600 mt-0.5"/>
            <span>Catat sekaligus ke <b>Rekam Konseling SOAP Klinis</b> apotek.</span>
          </label>
        </div>
      </div>

      <div class="ons-ws-foot">
        <div class="text-xs" style="color:var(--ons-text-soft)">Data tersimpan ke arsip <b>PEMERIKSAAN_PASIEN</b> &amp; tersinkron jika pasien terdaftar sebagai Member PRB.</div>
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
      if (el && !rec && el.focus) el.focus();
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
    const alsoSoap = !!document.getElementById('chkSimpanSoap')?.checked;
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

      if (alsoSoap) {
        await global.catatSoapDariPemeriksaan(saved.id_periksa, true);
      }

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

  global.catatSoapDariPemeriksaan = async (idPeriksa, silentMode) => {
    const rec = (S().AppState.pemeriksaanPasien || []).find((x) => x.id_periksa === idPeriksa);
    if (!rec) return;
    const ev = evalPemeriksaanStatus(rec);
    const objMetrics = [
      rec.tensi_sistol ? ('TD ' + rec.tensi_sistol + '/' + rec.tensi_diastol + ' mmHg') : '',
      rec.gula_darah ? ((rec.gula_jenis || 'GDS') + ' ' + rec.gula_darah + ' mg/dL') : '',
      rec.kolesterol_total ? ('Kolesterol ' + rec.kolesterol_total + ' mg/dL') : '',
      rec.asam_urat ? ('Asam Urat ' + rec.asam_urat + ' mg/dL') : '',
      ev.imt_bmi ? ('IMT ' + ev.imt_bmi) : ''
    ].filter(Boolean).join(', ');

    try {
      const res = await API().callApi('klinis.save', {
        pasien_id: rec.id_member || rec.id_periksa,
        nama_pasien: rec.nama_pasien,
        no_wa_pasien: rec.no_wa || '',
        dokter_asal: 'Skrining POCT Apotek',
        layanan_jenis: 'KONSELING_POCT',
        cdss_warning: ev.tingkat_risiko === 'KRISIS_RUJUK' ? ev.red_flag_reasons.join('; ') : ('Risiko: ' + metaRiskBadge(ev.tingkat_risiko).label),
        soap_notes: 'S: ' + (rec.keluhan_catatan || 'Cek kesehatan rutin') + ' | O: ' + objMetrics + (rec.riwayat_terapi ? (' (Terapi: ' + rec.riwayat_terapi + ')') : '') + ' | A: ' + metaRiskBadge(ev.tingkat_risiko).label + ' | P: ' + (rec.saran_apoteker || '-') + (rec.tgl_kontrol ? (' | Kontrol: ' + rec.tgl_kontrol) : '')
      }, { isWrite: true });
      if (res && res.item && Array.isArray(S().AppState.rekamKlinis)) {
        S().AppState.rekamKlinis.unshift(res.item);
      }
      if (!silentMode) {
        global.toast('Catatan SOAP konseling dari POCT ' + rec.nama_pasien + ' tersimpan di Pelayanan Klinis!', 'ok');
      }
    } catch (e) {
      if (!silentMode) global.toast(e.message || 'Gagal mencatat SOAP klinis.', 'err');
    }
  };

  global.daftarkanMemberDariPemeriksaan = async (idPeriksa) => {
    const rec = (S().AppState.pemeriksaanPasien || []).find((x) => x.id_periksa === idPeriksa);
    if (!rec) return;
    if (rec.id_member) {
      global.toast('Pasien sudah terdaftar sebagai Member (' + rec.id_member + ').', 'info');
      return;
    }
    const notes = [];
    if (rec.status_tensi && rec.status_tensi !== 'NORMAL') notes.push('Hipertensi/Tensi');
    if (rec.status_gula && rec.status_gula !== 'NORMAL') notes.push('Pantau Gula/DM');
    if (rec.status_kolesterol && rec.status_kolesterol !== 'NORMAL') notes.push('Dislipidemia');
    if (rec.status_asam_urat && rec.status_asam_urat !== 'NORMAL') notes.push('Asam Urat');

    try {
      const mRes = await API().callApi('member.save', {
        nama_pasien: rec.nama_pasien,
        no_hp: rec.no_wa || '',
        penyakit_kronis: notes.join(', ') || '-',
        program_prb: notes.length ? 'PRB' : 'UMUM',
        tgl_reminder_berikut: rec.tgl_kontrol || '',
        poin_loyalitas: 10
      }, { isWrite: true });
      const mbr = mRes && mRes.item;
      if (mbr && mbr.id_member) {
        if (Array.isArray(S().AppState.members)) S().AppState.members.unshift(mbr);
        const updRes = await API().callApi('pemeriksaan.save', Object.assign({}, rec, { id_member: mbr.id_member, skip_jurnal: true }), { isWrite: true });
        if (updRes && updRes.item) Object.assign(rec, updRes.item);
        global.toast(rec.nama_pasien + ' didaftarkan sebagai Member (' + mbr.id_member + ') & ditautkan!', 'ok');
        global.renderActiveView();
      }
    } catch (e) {
      global.toast(e.message || 'Gagal mendaftarkan member.', 'err');
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

  global.switchWaPemeriksaanMode = (idPeriksa, mode) => {
    const rec = (S().AppState.pemeriksaanPasien || []).find((x) => x.id_periksa === idPeriksa);
    if (!rec) return;
    waModalMode = mode === 'REMINDER' ? 'REMINDER' : 'HASIL';
    const box = document.getElementById('waModalText');
    if (box) box.value = waModalMode === 'REMINDER' ? buildKontrolReminderWaText(rec) : buildPemeriksaanWaText(rec);
    const b1 = document.getElementById('waModeHasilBtn');
    const b2 = document.getElementById('waModeReminderBtn');
    if (b1) b1.className = 'ons-btn text-[11px] py-1 px-2.5 ' + (waModalMode === 'HASIL' ? 'ons-btn-primary' : 'ons-btn-ghost');
    if (b2) b2.className = 'ons-btn text-[11px] py-1 px-2.5 ' + (waModalMode === 'REMINDER' ? 'ons-btn-primary' : 'ons-btn-ghost');
  };

  global.openWaPemeriksaanModal = (idPeriksa) => {
    const rec = (S().AppState.pemeriksaanPasien || []).find((x) => x.id_periksa === idPeriksa);
    if (!rec) return;
    waModalMode = 'HASIL';
    const msg = buildPemeriksaanWaText(rec);
    const wa62 = S().normalizeWa62(rec.no_wa);

    S().openModal(`<div class="ons-ws-modal" data-ws-custom="1">
      <div class="ons-ws-topbar">
        <div>
          <h3 class="font-extrabold text-base">Kirim Hasil &amp; Pengingat ke WhatsApp Pasien</h3>
          <p class="text-xs" style="color:var(--ons-text-soft)">${S().esc(rec.nama_pasien)} &bull; ${S().formatTgl(rec.tanggal)}${rec.tgl_kontrol ? (' &bull; Kontrol: ' + S().esc(rec.tgl_kontrol)) : ''}</p>
        </div>
        <button onclick="ONSStore.closeModal()" class="ons-btn ons-btn-ghost text-xs">Tutup &times;</button>
      </div>
      <div class="ons-ws-pane space-y-3 text-xs">
        <div class="flex flex-wrap gap-2 items-center justify-between">
          <div class="flex gap-1.5">
            <button id="waModeHasilBtn" onclick="window.switchWaPemeriksaanMode('${S().esc(rec.id_periksa)}','HASIL')" class="ons-btn ons-btn-primary text-[11px] py-1 px-2.5">Laporan Hasil Lengkap</button>
            <button id="waModeReminderBtn" onclick="window.switchWaPemeriksaanMode('${S().esc(rec.id_periksa)}','REMINDER')" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2.5">Pengingat Kontrol Ulang</button>
          </div>
          <div class="flex gap-1.5">
            <button onclick="window.copyWaPemeriksaanText()" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2.5">Salin Teks</button>
            <button onclick="window.printPemeriksaanCard('${S().esc(rec.id_periksa)}')" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2.5">Cetak Kartu</button>
          </div>
        </div>
        <div>
          <label class="font-semibold block mb-1">Nomor WhatsApp Tujuan Pasien</label>
          <input id="waModalPhone" class="ons-input font-mono-num max-w-sm" value="${S().esc(wa62 || rec.no_wa || '')}" placeholder="0812xxxxxxxx / 62812..."/>
        </div>
        <div>
          <label class="font-semibold block mb-1">Isi Pesan WhatsApp (Dapat disesuaikan sebelum kirim)</label>
          <textarea id="waModalText" rows="14" class="ons-textarea font-mono-num text-[11px]">${S().esc(msg)}</textarea>
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
    const prev = getPreviousCheckup(rec);
    const deltas = prev ? computeAllDeltas(rec, prev) : {};
    const rows = [];
    if (Number(rec.tensi_sistol || 0) > 0 && Number(rec.tensi_diastol || 0) > 0) {
      rows.push({
        nama: 'Tekanan Darah (Tensi)' + (Number(rec.nadi_bpm || 0) > 0 ? ' & Nadi' : ''),
        hasil: rec.tensi_sistol + '/' + rec.tensi_diastol + ' mmHg' + (Number(rec.nadi_bpm || 0) > 0 ? (' · Nadi ' + rec.nadi_bpm + ' bpm') : '') + (stEv.map_mmhg ? (' (MAP ' + stEv.map_mmhg + ')') : ''),
        delta: deltas.tensi ? (deltas.tensi.text + ' vs ' + deltas.tensi.prevText) : '-',
        rujukan: '< 120 / < 80 mmHg',
        status: metaStatusBadge(rec.status_tensi || stEv.status_tensi).label
      });
    }
    if (Number(rec.gula_darah || 0) > 0) {
      rows.push({
        nama: 'Gula Darah (' + (rec.gula_jenis || 'GDS') + ')',
        hasil: rec.gula_darah + ' mg/dL',
        delta: deltas.gula ? (deltas.gula.text + ' vs ' + deltas.gula.prev) : '-',
        rujukan: rec.gula_jenis === 'GDP' ? '70 - 99 mg/dL (Puasa)' : '< 140 mg/dL (Sewaktu)',
        status: metaStatusBadge(rec.status_gula || stEv.status_gula).label
      });
    }
    if (Number(rec.kolesterol_total || 0) > 0) {
      rows.push({
        nama: 'Kolesterol Total',
        hasil: rec.kolesterol_total + ' mg/dL',
        delta: deltas.kolesterol ? (deltas.kolesterol.text + ' vs ' + deltas.kolesterol.prev) : '-',
        rujukan: '< 200 mg/dL',
        status: metaStatusBadge(rec.status_kolesterol || stEv.status_kolesterol).label
      });
    }
    if (Number(rec.asam_urat || 0) > 0) {
      rows.push({
        nama: 'Asam Urat',
        hasil: rec.asam_urat + ' mg/dL',
        delta: deltas.asam_urat ? (deltas.asam_urat.text + ' vs ' + deltas.asam_urat.prev) : '-',
        rujukan: stEv.jenis_kelamin === 'P' ? '2.4 - 6.0 mg/dL (P)' : '3.4 - 7.0 mg/dL (L)',
        status: metaStatusBadge(rec.status_asam_urat || stEv.status_asam_urat).label
      });
    }
    const riskLbl = metaRiskBadge(rec.tingkat_risiko || stEv.tingkat_risiko).label;

    const html = `<div style="max-width:720px;margin:0 auto;font-family:Arial,sans-serif;color:#0F172A;border:1px solid #CBD5E1;border-radius:12px;padding:24px;background:#FFFFFF;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #1D4ED8;padding-bottom:12px;margin-bottom:14px;">
        <div>
          <div style="font-size:18px;font-weight:800;color:#1E3A8A;">${S().esc((prof.nama_usaha || 'APOTEK ONS FARMA').toUpperCase())}</div>
          <div style="font-size:11px;color:#475569;">${S().esc([prof.alamat_usaha, prof.kota].filter(Boolean).join(', '))}</div>
          <div style="font-size:11px;color:#475569;">No. SIA: ${S().esc(prof.no_sia || '-')} &bull; WA: ${S().esc(prof.wa_usaha || '-')}</div>
        </div>
        <div style="text-align:right;font-size:11px;">
          <div style="font-weight:700;font-size:13px;color:#1D4ED8;">KARTU HASIL CEK KESEHATAN</div>
          <div>No: <b>${S().esc(rec.id_periksa)}</b></div>
          <div>${S().formatTgl(rec.tanggal)}</div>
          <div style="margin-top:4px;font-weight:700;color:#0F172A;">Triage: ${S().esc(riskLbl)}</div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px;background:#F8FAFC;padding:10px 12px;border-radius:8px;margin-bottom:14px;border:1px solid #E2E8F0;">
        <div><b>Nama Pasien:</b> ${S().esc(rec.nama_pasien)}</div>
        <div><b>Gender / Usia:</b> ${rec.jenis_kelamin === 'P' ? 'Perempuan' : 'Laki-laki'}${rec.usia_tahun ? (' / ' + rec.usia_tahun + ' tahun') : ''}${stEv.imt_bmi ? (' · IMT ' + stEv.imt_bmi) : ''}</div>
        <div><b>No. WhatsApp:</b> ${S().esc(rec.no_wa || '-')}</div>
        <div><b>Petugas Pemeriksa:</b> ${S().esc(rec.petugas || '-')}</div>
        ${rec.riwayat_terapi ? `<div style="grid-column:span 2;"><b>Terapi Saat Ini:</b> ${S().esc(rec.riwayat_terapi)}</div>` : ''}
      </div>

      <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:14px;">
        <thead>
          <tr style="background:#EFF6FF;color:#1E3A8A;text-align:left;">
            <th style="padding:8px;border:1px solid #CBD5E1;">Parameter</th>
            <th style="padding:8px;border:1px solid #CBD5E1;">Hasil Pengukuran</th>
            <th style="padding:8px;border:1px solid #CBD5E1;">vs Cek Lalu</th>
            <th style="padding:8px;border:1px solid #CBD5E1;">Rujukan Normal</th>
            <th style="padding:8px;border:1px solid #CBD5E1;">Interpretasi</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((row) => `<tr>
            <td style="padding:8px;border:1px solid #CBD5E1;font-weight:600;">${S().esc(row.nama)}</td>
            <td style="padding:8px;border:1px solid #CBD5E1;font-weight:700;font-family:monospace;">${S().esc(row.hasil)}</td>
            <td style="padding:8px;border:1px solid #CBD5E1;font-family:monospace;color:#334155;">${S().esc(row.delta)}</td>
            <td style="padding:8px;border:1px solid #CBD5E1;color:#475569;">${S().esc(row.rujukan)}</td>
            <td style="padding:8px;border:1px solid #CBD5E1;font-weight:700;">${S().esc(row.status)}</td>
          </tr>`).join('')}
        </tbody>
      </table>

      ${rec.keluhan_catatan ? `<div style="font-size:12px;margin-bottom:8px;"><b>Keluhan / Catatan:</b> ${S().esc(rec.keluhan_catatan)}</div>` : ''}
      ${rec.saran_apoteker ? `<div style="font-size:12px;background:#ECFDF5;border:1px solid #A7F3D0;padding:10px;border-radius:8px;margin-bottom:10px;"><b>Saran &amp; Edukasi Apoteker:</b><br/>${S().esc(rec.saran_apoteker)}</div>` : ''}
      ${rec.tgl_kontrol ? `<div style="font-size:12px;background:#EFF6FF;border:1px solid #BFDBFE;padding:8px 10px;border-radius:8px;margin-bottom:12px;"><b>Jadwal Kontrol Berikutnya:</b> ${S().esc(rec.tgl_kontrol)}</div>` : ''}

      <div style="font-size:10px;color:#64748B;text-align:center;border-top:1px dashed #CBD5E1;padding-top:8px;">
        Hasil pemeriksaan cepat (POCT) apotek sebagai skrining kesehatan awal. Konsultasikan ke dokter apabila keluhan berlanjut.
      </div>
    </div>`;

    S().printHtmlZone(html, true);
  };

  global.printRekapPemeriksaanA4 = () => {
    const subTab = (S().AppState.subTabs && S().AppState.subTabs.pemeriksaan) || 'semua';
    const list = getFilteredRecords(subTab);
    const prof = (S().getStoreProfile && S().getStoreProfile()) || {};
    const html = `<div style="width:210mm;min-height:297mm;padding:14mm;margin:0 auto;font-family:Arial,sans-serif;color:#0F172A;background:#FFFFFF;font-size:11px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #0F172A;padding-bottom:10px;margin-bottom:12px;">
        <div>
          <div style="font-size:16px;font-weight:800;">REKAP LOGBOOK PEMERIKSAAN KESEHATAN PASIEN (POCT)</div>
          <div style="font-size:12px;font-weight:700;color:#1E3A8A;">${S().esc((prof.nama_usaha || 'APOTEK ONS FARMA').toUpperCase())}</div>
          <div style="font-size:10px;color:#475569;">${S().esc([prof.alamat_usaha, prof.kota].filter(Boolean).join(', '))} &bull; SIA: ${S().esc(prof.no_sia || '-')}</div>
        </div>
        <div style="text-align:right;font-size:10px;">
          <div>Kategori: <b>${S().esc(subTab.toUpperCase())}</b></div>
          <div>Dicetak: ${S().esc(new Date().toLocaleString('id-ID'))}</div>
          <div>Total Baris: <b>${list.length} Pemeriksaan</b></div>
        </div>
      </div>

      <table style="width:100%;border-collapse:collapse;font-size:10px;">
        <thead>
          <tr style="background:#F1F5F9;text-align:left;">
            <th style="padding:6px;border:1px solid #CBD5E1;">Tanggal &amp; Kode</th>
            <th style="padding:6px;border:1px solid #CBD5E1;">Pasien (L/P)</th>
            <th style="padding:6px;border:1px solid #CBD5E1;">TD / Nadi</th>
            <th style="padding:6px;border:1px solid #CBD5E1;">Gula Darah</th>
            <th style="padding:6px;border:1px solid #CBD5E1;">Kolesterol</th>
            <th style="padding:6px;border:1px solid #CBD5E1;">Asam Urat</th>
            <th style="padding:6px;border:1px solid #CBD5E1;">Triage &amp; Kontrol</th>
          </tr>
        </thead>
        <tbody>
          ${list.map((r) => {
            const ev = evalPemeriksaanStatus(r);
            return `<tr>
              <td style="padding:5px;border:1px solid #CBD5E1;font-family:monospace;">${S().formatTgl(r.tanggal)}<br/>${S().esc(r.id_periksa)}</td>
              <td style="padding:5px;border:1px solid #CBD5E1;"><b>${S().esc(r.nama_pasien)}</b> (${r.jenis_kelamin === 'P' ? 'P' : 'L'}${r.usia_tahun ? ('/' + r.usia_tahun + 'th') : ''})<br/>WA: ${S().esc(r.no_wa || '-')}</td>
              <td style="padding:5px;border:1px solid #CBD5E1;font-family:monospace;">${r.tensi_sistol ? (r.tensi_sistol + '/' + r.tensi_diastol + ' mmHg') : '-'}</td>
              <td style="padding:5px;border:1px solid #CBD5E1;font-family:monospace;">${r.gula_darah ? ((r.gula_jenis || 'GDS') + ' ' + r.gula_darah) : '-'}</td>
              <td style="padding:5px;border:1px solid #CBD5E1;font-family:monospace;">${r.kolesterol_total ? (r.kolesterol_total + ' mg/dL') : '-'}</td>
              <td style="padding:5px;border:1px solid #CBD5E1;font-family:monospace;">${r.asam_urat ? (r.asam_urat + ' mg/dL') : '-'}</td>
              <td style="padding:5px;border:1px solid #CBD5E1;"><b>${S().esc(metaRiskBadge(r.tingkat_risiko || ev.tingkat_risiko).label)}</b>${r.tgl_kontrol ? ('<br/>Kontrol: ' + S().esc(r.tgl_kontrol)) : ''}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
    S().printHtmlZone(html, true);
  };

  global.exportPemeriksaanXlsx = () => {
    const subTab = (S().AppState.subTabs && S().AppState.subTabs.pemeriksaan) || 'semua';
    const list = getFilteredRecords(subTab);
    if (!list.length) {
      global.toast('Tidak ada data pemeriksaan untuk diekspor.', 'warn');
      return;
    }
    const headers = [
      { key: 'id_periksa', label: 'ID Pemeriksaan' },
      { key: 'tanggal', label: 'Tanggal Cek' },
      { key: 'nama_pasien', label: 'Nama Pasien' },
      { key: 'no_wa', label: 'No. WhatsApp' },
      { key: 'gender_usia', label: 'Gender / Usia' },
      { key: 'imt_bmi', label: 'IMT (BMI)' },
      { key: 'tensi', label: 'Tekanan Darah (mmHg)' },
      { key: 'status_tensi', label: 'Status Tensi' },
      { key: 'gula', label: 'Gula Darah (mg/dL)' },
      { key: 'status_gula', label: 'Status Gula' },
      { key: 'kolesterol_total', label: 'Kolesterol Total' },
      { key: 'status_kolesterol', label: 'Status Kolesterol' },
      { key: 'asam_urat', label: 'Asam Urat (mg/dL)' },
      { key: 'status_asam_urat', label: 'Status Asam Urat' },
      { key: 'tingkat_risiko', label: 'Triage Risiko' },
      { key: 'tgl_kontrol', label: 'Jadwal Kontrol' },
      { key: 'biaya_cek', label: 'Biaya Cek (Rp)' },
      { key: 'saran_apoteker', label: 'Saran Apoteker' }
    ];
    const rows = list.map((r) => {
      const ev = evalPemeriksaanStatus(r);
      return {
        id_periksa: r.id_periksa || '',
        tanggal: String(r.tanggal || '').slice(0, 16).replace('T', ' '),
        nama_pasien: r.nama_pasien || '',
        no_wa: r.no_wa || '',
        gender_usia: (r.jenis_kelamin === 'P' ? 'P' : 'L') + (r.usia_tahun ? (' / ' + r.usia_tahun + ' th') : ''),
        imt_bmi: ev.imt_bmi || '',
        tensi: r.tensi_sistol ? (r.tensi_sistol + '/' + r.tensi_diastol) : '',
        status_tensi: r.status_tensi || ev.status_tensi || '',
        gula: r.gula_darah ? ((r.gula_jenis || 'GDS') + ': ' + r.gula_darah) : '',
        status_gula: r.status_gula || ev.status_gula || '',
        kolesterol_total: Number(r.kolesterol_total || 0) || '',
        status_kolesterol: r.status_kolesterol || ev.status_kolesterol || '',
        asam_urat: Number(r.asam_urat || 0) || '',
        status_asam_urat: r.status_asam_urat || ev.status_asam_urat || '',
        tingkat_risiko: r.tingkat_risiko || ev.tingkat_risiko || 'NORMAL',
        tgl_kontrol: r.tgl_kontrol || '',
        biaya_cek: Number(r.biaya_cek || 0),
        saran_apoteker: r.saran_apoteker || ''
      };
    });
    S().exportDataset('xlsx', 'Rekap Pemeriksaan Kesehatan ONS Farma', 'Rekap_Pemeriksaan_POCT_' + subTab, headers, rows);
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
    buildKontrolReminderWaText,
    buildAutoAdvice,
    getPatientHistory,
    getPreviousCheckup,
    computeAllDeltas
  };
})(window);
