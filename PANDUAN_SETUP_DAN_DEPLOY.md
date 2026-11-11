# Panduan Setup Backend Google Apps Script & Deploy Frontend ke GitHub Pages

Paket aplikasi **Apotek ONS Farma Enterprise v10.0** menggunakan arsitektur modern **Decoupled Frontend + Pure JSON REST API** agar responsif tanpa delay iframe dan bebas masalah CORS.

---

## Bagian 1: Struktur Folder

1. **`backend-gas/`** -> Ditempelkan / di-*push* ke proyek **Google Apps Script** (berisi `appsscript.json` & 7 file `.gs`). **JANGAN** masukkan folder ini ke repositori GitHub Pages publik.
2. **`frontend-pwa/`** -> Di-*deploy* ke **GitHub Pages** (hanya HTML, CSS, JS statis, ikon PWA, & `sw.js`). File `js/config.js` hanya menyimpan URL publik `/exec`.

---

## Bagian 2: Setup Backend Google Apps Script & Google Sheets

1. Buka [script.google.com](https://script.google.com) dan buat **New Project** (atau buka Google Sheet baru -> menu *Extensions* -> *Apps Script*).
2. Aktifkan visibilitas `appsscript.json` (*Project Settings* -> centang *Show "appsscript.json" manifest file in editor*), lalu salin isi `backend-gas/appsscript.json`.
3. Buat 7 file script di editor Apps Script sesuai nama dan isi file di `backend-gas/`:
   - `01_Config_Secrets.gs`
   - `02_ScaleTurbo_Router.gs`
   - `03_POS_FEFO_Warehouse.gs`
   - `04_Procurement_Clinical_Finance.gs`
   - `05_Tagihan_Pembayaran.gs`
   - `06_DocEngine.gs`
   - `07_Migrasi_Database.gs`
4. Pilih fungsi **`setupAppEnvironment`** pada dropdown atas editor Apps Script, lalu klik **Run** dan berikan izin akses (Authorize).
   - Fungsi ini bersifat **idempoten** (aman dijalankan ulang): otomatis membuat **25 sheet lengkap**, folder arsip **Google Drive**, men-generate rahasia kriptografi `SESSION_SECRET`, `HMAC_PEPPER`, `QR_SECRET`, dan `DE_HMAC_SECRET` secara acak di **Script Properties**, serta mengisi 3 akun awal:
     - `pemilik` / `apj` / `kasir` (Kata sandi awal: `OnsFarma#2026`, PIN Pejabat awal: `123456`).
     - Untuk mengganti password/PIN darurat kapan saja langsung dari editor GAS: jalankan `resetAksesDarurat("pemilik", "SandiBaruKuat", "654321")`.
5. Klik **Deploy** -> **New deployment**:
   - Type: **Web app**
   - Execute as: **Me (User deploying)**
   - Who has access: **Anyone (Anyone, even anonymous)** -> klik **Deploy**.
6. Salin **Web App URL** yang berakhiran **`/exec`**.

---

## Bagian 3: Hubungkan Frontend & Deploy ke GitHub Pages via Terminal

1. Buka file `frontend-pwa/js/config.js`, ganti nilai `GAS_URL` dengan URL `/exec` dari langkah di atas:
   ```js
   GAS_URL: 'https://script.google.com/macros/s/AKfycb.../exec',
   ```
2. Pastikan Anda masuk ke folder **`frontend-pwa`** saja (bukan root atau `backend-gas`), lalu inisialisasi Git & push ke repositori GitHub:
   ```bash
   cd frontend-pwa
   git init
   git branch -M main
   git add .
   git commit -m "Deploy Apotek ONS Farma Enterprise v10.0 PWA"
   git remote add origin https://github.com/USERNAME_ANDA/ons-farma-pwa.git
   git push -u origin main
   ```
   > **Tips Keamanan PAT GitHub:** Saat terminal meminta password untuk HTTPS GitHub, gunakan **Personal Access Token (classic/fine-grained)** dengan scope `repo` — bukan password akun GitHub. Token tidak pernah disimpan ke file repo.
3. Di halaman GitHub repositori Anda: buka **Settings** -> **Pages** -> pada **Build and deployment**, pilih **Source: Deploy from a branch**, Branch **`main`** folder **`/ (root)`** -> **Save**.
4. Tunggu 1-2 menit, aplikasi siap dibuka dan diinstal menjadi **PWA Mobile & Desktop** lewat alamat `https://USERNAME_ANDA.github.io/ons-farma-pwa/`.

---

## Bagian 4: Mengatur API Key WhatsApp (Fonnte) & SATUSEHAT

Masuk ke aplikasi sebagai **Pemilik**, buka menu **Pengaturan & Migrasi**, lalu isi melalui form **Brankas Rahasia Script Properties** (`FONNTE_TOKEN`, `WA_OWNER_TARGET`, `ADMIN_EMAIL`, `SATUSEHAT_*`). Token disimpan aman di server GAS & selalu disensor di tampilan browser.
