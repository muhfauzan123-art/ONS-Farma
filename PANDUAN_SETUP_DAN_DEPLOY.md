# Panduan Setup Backend Google Apps Script & Deploy Frontend ke GitHub Pages

Paket aplikasi **Apotek ONS Farma Enterprise v11.0 ("Apotek Digital Modern Terpadu")** menggunakan arsitektur modern **Decoupled Frontend + Pure JSON REST API** agar responsif tanpa delay iframe dan bebas masalah CORS.

---

## Bagian 1: Struktur Folder

1. **`backend-gas/`** -> Ditempelkan / di-*push* ke proyek **Google Apps Script** (berisi `appsscript.json` & **8 file `.gs`**). **JANGAN** masukkan folder ini ke repositori GitHub Pages publik.
2. **`frontend-pwa/`** -> Di-*deploy* ke **GitHub Pages** (hanya HTML, CSS, JS statis, ikon PWA, & `sw.js`). File `js/config.js` hanya menyimpan URL publik `/exec`. Etalase publik pelanggan juga tersedia otomatis lewat query `?katalog=1`.

---

## Bagian 2: Setup Backend Google Apps Script & Google Sheets

1. Buka [script.google.com](https://script.google.com) dan buat **New Project** (atau buka Google Sheet baru -> menu *Extensions* -> *Apps Script*).
2. Aktifkan visibilitas `appsscript.json` (*Project Settings* -> centang *Show "appsscript.json" manifest file in editor*), lalu salin isi `backend-gas/appsscript.json`.
3. Buat **8 file script** di editor Apps Script sesuai nama dan isi file di `backend-gas/`:
   - `01_Config_Secrets.gs`
   - `02_ScaleTurbo_Router.gs`
   - `03_POS_FEFO_Warehouse.gs`
   - `04_Procurement_Clinical_Finance.gs`
   - `05_Tagihan_Pembayaran.gs`
   - `06_DocEngine.gs`
   - `07_Migrasi_Database.gs`
   - `08_CRM_Omnichannel_Printer.gs` *(Modul v11.0: Omnichannel Delivery, WhatsApp CRM & Blast, dan Template Struk Thermal)*
4. Untuk instalasi perdana (database masih kosong), pilih fungsi **`setupAppEnvironment`** pada dropdown atas editor Apps Script, lalu klik **Run** dan berikan izin akses (Authorize).
   - Fungsi ini bersifat **idempoten**: membuat **29 sheet lengkap**, folder arsip **Google Drive**, rahasia kriptografi `SESSION_SECRET`, `HMAC_PEPPER`, `QR_SECRET`, dan `DE_HMAC_SECRET` di **Script Properties**, serta mengisi 3 akun awal (`pemilik`, `apj`, `kasir`, sandi awal `OnsFarma#2026`, PIN awal `123456`).
   - *(Upgrade dari v10 ke v11: Anda **TIDAK PERLU** menjalankan ulang `setupAppEnvironment`; 4 sheet baru v11 (`OMNICHANNEL_ORDER`, `CRM_KONTAK`, `ANTRIAN_NOTIF`, `ST_TEMPLATE`) akan dibuat otomatis secara lazy-self-healing saat pertama kali diakses!)*
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

---

## Bagian 5: Cara Revisi Aman Agar Aplikasi, URL Live & Database Sheets Tidak Rusak

Saat Anda memperbarui kode di masa mendatang (misal ke v10.1 atau menambah fitur baru), ikuti 4 aturan emas berikut agar aplikasi aktif dan data transaksi di Google Sheets tidak pernah hilang:

1. **Jangan Buat Deployment GAS Baru (Edit Deployment Lama!):**
   - Buka Editor Google Apps Script -> perbarui file `.gs` yang berubah (jangan mengubah nama tab Google Sheets).
   - Klik tombol **Deploy** -> **Manage deployments** (*Kelola deployment*) -> klik ikon **Pensil (Edit)** di kanan deployment aktif Anda -> pada bagian *Version*, pilih **New version** (*Versi baru*) -> klik **Deploy**.
   - **Penting:** URL `/exec` tetap sama persis, Script Properties tetap utuh, dan seluruh data di Google Sheets aman! Jangan jalankan `setupAppEnvironment` jika Anda tidak ingin mereset apa pun (meski idempoten, cukup deploy versi baru saja).

2. **Jangan Hapus/Timpa `frontend-pwa/js/config.js`:**
   - File `frontend-pwa/js/config.js` berisi alamat `GAS_URL` live milik Anda. Saat menyalin pembaruan folder `frontend-pwa/`, kecualikan `js/config.js` atau pastikan URL `/exec` di dalamnya tetap sesuai.

3. **Naikkan Versi `CACHE_NAME` di `frontend-pwa/sw.js`:**
   - Setiap kali mengubah tampilan HTML/CSS/JS PWA, naikkan versi string di `sw.js` (saat ini `'ons-farma-pwa-v11.0.0'`) agar HP kasir dan browser Pemilik otomatis mengunduh versi terbaru tanpa terjebak cache lama.

4. **Push Perubahan Frontend ke GitHub Pages:**
   ```bash
   cd frontend-pwa
   git status
   git add .
   git commit -m "Update Apotek ONS Farma v11.0 Apotek Digital Terpadu"
   git push origin main
   ```
