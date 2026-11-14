// Test: auto-heal logic v18.2.0 (faktor selalu 1000)
let passed = 0, failed = 0;

function healObat(o) {
  const hu = Number(o.harga_umum || 0);
  const hpp = Number(o.hpp_avg || 0);
  if (hu > 0 && hu <= 10 && hpp > hu * 5) {
    const fac = 1000; // Selalu 1000 — bug dari "X.000" → X
    o.harga_umum = hu * fac;
    if (Number(o.harga_member || 0) <= 10) o.harga_member = Number(o.harga_member || hu) * fac;
    if (Number(o.harga_grosir || 0) <= 10) o.harga_grosir = Number(o.harga_grosir || hu) * fac;
    if (Number(o.harga_faskes || 0) <= 10) o.harga_faskes = Number(o.harga_faskes || hu) * fac;
  }
  return o;
}

function test(label, obat, expectHargaUmum) {
  const result = healObat({ ...obat });
  if (result.harga_umum === expectHargaUmum) {
    console.log(`✅ PASS: ${label} → Rp ${result.harga_umum}`);
    passed++;
  } else {
    console.log(`❌ FAIL: ${label} → got ${result.harga_umum}, expected ${expectHargaUmum}`);
    failed++;
  }
}

// Case 1: Emturnas - harga 5, hpp 400 → heal → 5000
test('Emturnas harga 5 hpp 400', { harga_umum: 5, hpp_avg: 400, harga_member: 5 }, 5000);

// Case 2: harga 5, hpp 100 → heal → 5000
test('Obat harga 5 hpp 100', { harga_umum: 5, hpp_avg: 100 }, 5000);

// Case 3: harga 8, hpp 500 → heal → 8000 (8.000 Rp)
test('Obat harga 8 hpp 500', { harga_umum: 8, hpp_avg: 500 }, 8000);

// Case 4: harga 1000 normal, tidak di-heal
test('Normal harga 1000 hpp 400', { harga_umum: 1000, hpp_avg: 400 }, 1000);

// Case 5: harga 5000 normal, tidak di-heal
test('Normal harga 5000 hpp 400', { harga_umum: 5000, hpp_avg: 400 }, 5000);

// Case 6: harga 0 (kosong), tidak di-heal
test('Harga 0 / kosong', { harga_umum: 0, hpp_avg: 400 }, 0);

// Case 7: harga 10, hpp 60 (10 <= 10, 60 > 50) → heal → 10000
test('Harga 10 hpp 60 → heal 10000', { harga_umum: 10, hpp_avg: 60 }, 10000);

// Case 8: harga 3, hpp 3000 → heal → 3000
test('Harga 3 hpp 3000', { harga_umum: 3, hpp_avg: 3000 }, 3000);

// Case 9: harga 5, hpp 3 (tidak masuk akal heal — hpp < harga)
test('Harga 5 hpp 3 (tidak heal)', { harga_umum: 5, hpp_avg: 3 }, 5);

// Case 10: harga member, grosir, faskes juga ikut di-heal
const ob = healObat({ harga_umum: 5, hpp_avg: 400, harga_member: 5, harga_grosir: 4, harga_faskes: 3 });
const hm = ob.harga_member === 5000 && ob.harga_grosir === 4000 && ob.harga_faskes === 3000;
if (hm) { console.log('✅ PASS: Heal member/grosir/faskes ikut 1000'); passed++; }
else { console.log('❌ FAIL: Heal member/grosir/faskes gagal', ob); failed++; }

console.log(`\n${'='.repeat(40)}`);
console.log(`Total: ${passed + failed} | PASS: ${passed} | FAIL: ${failed}`);
if (failed === 0) console.log('🎉 SEMUA LULUS!');
else process.exit(1);
