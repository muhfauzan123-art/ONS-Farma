// Test Suites: Fitur 1 (Dropdown Satuan POS) & Fitur 3 (1-Klik Defecta ke SP)
let passed = 0, failed = 0;

function assert(cond, msg) {
  if (cond) {
    console.log(`✅ PASS: ${msg}`);
    passed++;
  } else {
    console.log(`❌ FAIL: ${msg}`);
    failed++;
  }
}

// 1. TEST FITUR 1: Multi-Satuan Reprice Logic
const mockObat1 = {
  id_obat: 'OBT-001',
  nama_dagang: 'Sanmol 500mg',
  satuan_dasar: 'Tablet',
  satuan_sedang: 'Strip',
  rasio_sedang: 10,
  satuan_besar: 'Box',
  rasio_besar: 100,
  harga_umum: 500, // per tablet
  min_qty_grosir: 20
};

// Unit Options generator logic
function buildUnitOptions(obat, tierMode) {
  const baseSat = obat.satuan_dasar || 'Unit';
  const baseEff1 = Number(obat.harga_umum || 0);
  const uOpts = [];
  uOpts.push({
    label: baseSat,
    faktor: 1,
    harga: baseEff1,
    displayText: `${baseSat} (Rp ${baseEff1})`
  });

  const rSed = Number(obat.rasio_sedang || 0);
  const satSed = String(obat.satuan_sedang || '').trim();
  if (satSed && satSed !== baseSat && rSed > 1) {
    const hrgSed = baseEff1 * rSed;
    uOpts.push({
      label: satSed,
      faktor: rSed,
      harga: hrgSed,
      displayText: `${satSed} (isi ${rSed} • Rp ${hrgSed})`
    });
  }

  const rBes = Number(obat.rasio_besar || 0);
  const satBes = String(obat.satuan_besar || '').trim();
  if (satBes && satBes !== baseSat && satBes !== satSed && rBes > 1) {
    const hrgBes = baseEff1 * rBes;
    uOpts.push({
      label: satBes,
      faktor: rBes,
      harga: hrgBes,
      displayText: `${satBes} (isi ${rBes} • Rp ${hrgBes})`
    });
  }
  return uOpts;
}

const opts1 = buildUnitOptions(mockObat1, 'UMUM');
assert(opts1.length === 3, 'Obat dengan 3 tingkat satuan menghasilkan 3 unitOptions');
assert(opts1[0].label === 'Tablet' && opts1[0].harga === 500, 'Satuan dasar Tablet Rp 500');
assert(opts1[1].label === 'Strip' && opts1[1].faktor === 10 && opts1[1].harga === 5000, 'Satuan sedang Strip isi 10 Rp 5.000');
assert(opts1[2].label === 'Box' && opts1[2].faktor === 100 && opts1[2].harga === 50000, 'Satuan besar Box isi 100 Rp 50.000');

// Obat dengan 1 satuan saja (contoh Sirup)
const mockObat2 = {
  id_obat: 'OBT-002',
  nama_dagang: 'OBH Sirup 100ml',
  satuan_dasar: 'Botol',
  satuan_sedang: '',
  rasio_sedang: 0,
  satuan_besar: '',
  rasio_besar: 0,
  harga_umum: 15000
};
const opts2 = buildUnitOptions(mockObat2, 'UMUM');
assert(opts2.length === 1 && opts2[0].label === 'Botol', 'Obat tanpa satuan bertingkat hanya punya 1 opsi (Botol)');

// Stock deduction calculation check
function calculateBaseStockDeduction(qty, faktor) {
  return Number(qty) * Math.max(1, Number(faktor || 1));
}
assert(calculateBaseStockDeduction(2, 10) === 20, 'Beli 2 Strip (isi 10) memotong 20 Tablet dasar');
assert(calculateBaseStockDeduction(1, 100) === 100, 'Beli 1 Box (isi 100) memotong 100 Tablet dasar');

// 2. TEST FITUR 3: Defecta to SP Grouping Logic
const mockDefectaList = [
  { id_obat: 'O-1', nama_dagang: 'Paracetamol', pbf_utama: 'PT Kimia Farma Trading', golongan_bpom: 'BEBAS', stok_min: 10, stok_max: 100, stok_fisik: 2 },
  { id_obat: 'O-2', nama_dagang: 'Amoxicillin 500mg', pbf_utama: 'PT Kimia Farma Trading', golongan_bpom: 'KERAS', stok_min: 20, stok_max: 150, stok_fisik: 5 },
  { id_obat: 'O-3', nama_dagang: 'Rhinos SR', pbf_utama: 'PT Dexa Medica', golongan_bpom: 'PREKURSOR', stok_min: 5, stok_max: 30, stok_fisik: 0 }
];

function groupDefectaForSp(pickedItems) {
  const grouped = {};
  pickedItems.forEach(o => {
    const pbf = o.pbf_utama || 'Distributor Apotek';
    if (!grouped[pbf]) grouped[pbf] = [];
    grouped[pbf].push(o);
  });
  return grouped;
}

const groups = groupDefectaForSp(mockDefectaList);
assert(Object.keys(groups).length === 2, 'Defecta 3 obat dari 2 PBF terkelompok menjadi 2 paket SP');
assert(groups['PT Kimia Farma Trading'].length === 2, 'PT Kimia Farma Trading punya 2 obat (Paracetamol & Amoxicillin)');
assert(groups['PT Dexa Medica'].length === 1, 'PT Dexa Medica punya 1 obat (Rhinos SR)');

console.log(`\n========================================`);
console.log(`Total Test: ${passed + failed} | LULUS: ${passed} | GAGAL: ${failed}`);
if (failed === 0) {
  console.log('🎉 SEMUA TEST FITUR 1 & 3 LULUS!');
} else {
  process.exit(1);
}
