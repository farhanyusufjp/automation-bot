# 🤖 Automation Bot

Bot otomasi pengujian web berbasis **JavaScript + Playwright** yang membaca test case dari file **Excel**, menerima konfigurasi via `.env`, dan menjalankan pengujian secara otomatis di berbagai website.

---

## 📖 Deskripsi

**Automation Bot** adalah alat pengujian otomatis yang dirancang untuk fleksibilitas tinggi. Bot ini dapat digunakan untuk menguji website apapun — baik yang dibangun dengan React, Vue, Laravel, Django, maupun framework lainnya — tanpa perlu mengubah kode. Cukup isi file Excel dengan langkah-langkah pengujian, setting URL dan kredensial di `.env`, lalu jalankan bot.

---

## ✨ Fitur

- 📊 **Membaca test case dari Excel** — Tidak perlu menulis kode, cukup isi spreadsheet
- 🌐 **Dinamis & universal** — Bisa dipakai untuk website apapun
- 🔐 **Konfigurasi via `.env`** — Username, password, dan URL tidak di-hardcode
- 📸 **Auto screenshot** — Ambil screenshot otomatis di step yang diinginkan
- 📋 **Laporan hasil lengkap** — Summary PASS/FAIL di console dan file `.log`
- 🔍 **12 jenis aksi** — navigate, fill, click, assert, wait, screenshot, dll
- 🖥️ **Mode headless/headed** — Bisa jalan tanpa tampilan browser (untuk CI/CD)

---

## 📋 Prasyarat

- **Node.js** >= 18 ([download](https://nodejs.org/))
- **npm** (sudah termasuk bersama Node.js)

---

## 🚀 Instalasi

```bash
# 1. Clone repository
git clone https://github.com/farhanyusufjp/automation-bot
cd automation-bot

# 2. Install dependencies
npm install

# 3. Install Playwright browser (Chromium)
npx playwright install chromium

# 4. Salin file konfigurasi environment
cp .env.example .env

# 5. Edit .env dengan URL dan kredensial website kamu
# (lihat bagian "Cara Setting .env" di bawah)

# 6. Generate template Excel test case
node generate-excel.js

# 7. Jalankan bot
npm start
```

---

## ⚙️ Cara Setting `.env`

Edit file `.env` sesuai dengan website yang ingin kamu uji:

```env
BASE_URL=https://your-website.com
USERNAME=your_username
PASSWORD=your_password
EXCEL_FILE=test_cases/TEST CASE - Prima Career (SAU).xlsx
HEADLESS=false
SHEET_NAME=
SLOW_MO=500
```

| Variabel      | Keterangan                                                              |
|---------------|-------------------------------------------------------------------------|
| `BASE_URL`    | URL utama website yang diuji. Digunakan untuk login otomatis.          |
| `USERNAME`    | Username untuk login.                                                   |
| `PASSWORD`    | Password untuk login.                                                   |
| `EXCEL_FILE`  | Path ke file Excel test case. Default: `test_cases/TEST CASE - Prima Career (SAU).xlsx`. |
| `HEADLESS`    | `false` = tampilkan browser, `true` = jalankan di background (untuk CI). |
| `SHEET_NAME`  | Nama sheet Excel yang ingin dibaca (kosong = sheet pertama).            |
| `SLOW_MO`     | Delay antar aksi dalam ms. Berguna untuk debug visual (default: `500`). |

---

## 📊 Format Excel yang Didukung

Bot mendukung file Excel format **Prima Career** dengan kolom berikut (tidak perlu kolom `Action` / `Selector`):

| Kolom | Header           | Keterangan                                             |
|-------|------------------|--------------------------------------------------------|
| A     | `No`             | Nomor test case: `TCE001`, `TCE002`, dst; atau angka  |
| B     | `Function`       | Nama fitur/modul (mendukung merged cells)              |
| C     | `Scenario`       | Deskripsi aksi dalam bahasa Indonesia                  |
| D     | `Expected Result`| Hasil yang diharapkan                                  |
| E     | `Actual Result`  | Dikosongkan (diisi bot nanti)                          |
| F     | `Status`         | Success/Fail — hasil existing, bisa diabaikan          |
| G     | `Notes`          | Catatan tambahan                                       |

**Aturan parsing:**
- Baris dengan `No` diawali `BRD` → **di-skip** (header grup BRD)
- Baris kosong → **di-skip**
- Baris dengan `No` diawali `TCE` atau berupa angka → **diproses**
- Kolom `Function` yang berisi merged cells ditangani otomatis

### Contoh Isi Excel

| No     | Function                                    | Scenario                        | Expected Result                  |
|--------|---------------------------------------------|---------------------------------|----------------------------------|
| BRD 28 | Employer - Menu Configuration - Job Master  | (deskripsi BRD)                 | ...                              |
| TCE001 | Configuration-Job Master-Job Title Master   | Cek valid data yang ditampilkan | Sistem menampilkan list data...  |
| TCE002 |                                             | Cek valid hasil search          | Sistem menampilkan hasil search  |
| TCE003 |                                             | Klik 'Search'                   | Sistem menampilkan hasil search  |
| TCE004 |                                             | Klik 'Reset'                    | Sistem mereset inputan keyword   |
| TCE005 |                                             | Klik 'Create New'               | Sistem menampilkan pop up        |

---

## 🧠 Cara Kerja Smart Parser

Bot secara otomatis menerjemahkan teks kolom `Scenario` menjadi aksi Playwright menggunakan **keyword matching**, sehingga tidak perlu mengisi kolom `Action` dan `Selector` secara manual.

### Tabel Keyword → Aksi

| Pola Scenario                              | Aksi Playwright                                     |
|--------------------------------------------|-----------------------------------------------------|
| `Klik 'Create New'`                        | `click_text("Create New")` + assert modal muncul   |
| `Klik 'Search'`                            | `click_text("Search")`                             |
| `Klik 'Reset'`                             | `click_text("Reset")`                              |
| `Klik 'Save'`                              | `click_text("Save")`                               |
| `Klik 'Delete' ...`                        | `click_text("Delete")`                             |
| `Klik 'Edit' ...`                          | `click_text("Edit")`                               |
| `Klik '...' pada pop up`                   | `click_text(...)` di dalam modal                   |
| `Cek valid data yang ditampilkan`          | `assert_table_has_data()`                          |
| `Cek valid hasil search`                   | `assert_element_visible(table tbody tr, ...)`      |
| `Cek validasi '...'`                       | `assert_element_visible(.validation-message, ...)`  |
| `Cek upload file tidak sesuai format`      | `assert_element_visible(.error, ...)`              |
| `Cek upload file yang sesuai`             | `assert_element_visible(.success, ...)`            |
| `Cek pengisian '...' melebihi batas input` | `assert_element_visible(.validation-message, ...)`  |
| `Buka halaman ...`                         | `navigate(url)`                                    |

Setiap test case secara otomatis diakhiri dengan **screenshot**.

### Scenario yang Ditandai MANUAL (Skip)

Scenario berikut tidak bisa diotomasi dan akan ditandai sebagai `⚠️ MANUAL`:

- `Cek fungsi drag and drop`
- `Klik 'Drag'`
- `Klik 'Zoom slider'`
- `Klik 'Flip'`
- `Klik 'Rotasi'`

---

File Excel harus memiliki sheet bernama **TestCases** dengan kolom-kolom berikut:

| Kolom         | Keterangan                                                   |
|---------------|--------------------------------------------------------------|
| `Step`        | Nomor urut langkah (angka)                                   |
| `Action`      | Nama aksi yang dijalankan (lihat daftar di bawah)            |
| `Selector`    | CSS selector elemen target (contoh: `#username`, `.btn`)     |
| `Value`       | Nilai input atau parameter aksi (contoh: teks untuk diisi)   |
| `Expected`    | Nilai yang diharapkan untuk aksi assert                      |
| `Description` | Catatan atau keterangan langkah (opsional)                   |

### Contoh Isi Excel

| Step | Action         | Selector          | Value       | Expected    | Description              |
|------|----------------|-------------------|-------------|-------------|--------------------------|
| 1    | navigate       |                   |             |             | Buka halaman login       |
| 2    | fill           | #username         | admin       |             | Isi username             |
| 3    | fill           | #password         | admin123    |             | Isi password             |
| 4    | click          | #login-btn        |             |             | Klik tombol login        |
| 5    | assert_url     |                   | /dashboard  | /dashboard  | Cek redirect dashboard   |
| 6    | assert_visible | .welcome-message  |             |             | Cek welcome message      |
| 7    | screenshot     |                   | login-success |           | Ambil screenshot         |

---

## 🎯 Daftar Actions yang Tersedia

| Action           | Selector | Value       | Expected    | Keterangan                                    |
|------------------|----------|-------------|-------------|-----------------------------------------------|
| `navigate`       | -        | URL (opsional) | -        | Navigasi ke URL. Jika kosong, pakai `BASE_URL` |
| `fill`           | ✅       | Teks input  | -           | Isi input field dengan teks                   |
| `click`          | ✅       | -           | -           | Klik elemen                                   |
| `assert_text`    | ✅       | -           | Teks ekspektasi | Cek teks elemen sesuai expected           |
| `assert_visible` | ✅       | -           | -           | Cek apakah elemen terlihat di halaman         |
| `assert_url`     | -        | URL/path    | URL/path    | Cek apakah URL sekarang mengandung string     |
| `wait`           | -        | Milidetik   | -           | Tunggu sejumlah milidetik                     |
| `screenshot`     | -        | Nama file   | -           | Simpan screenshot ke folder `screenshots/`    |
| `select`         | ✅       | Nilai option | -          | Pilih option di dropdown `<select>`           |
| `clear`          | ✅       | -           | -           | Kosongkan isi input field                     |
| `hover`          | ✅       | -           | -           | Arahkan kursor ke elemen                      |
| `press_key`      | ✅       | Nama tombol | -           | Tekan tombol keyboard (Enter, Tab, Escape, dll) |

### Contoh Selector

```
#username          → Elemen dengan id="username"
.btn-primary       → Elemen dengan class="btn-primary"
input[type=email]  → Elemen input dengan type email
button[type=submit]→ Tombol submit
form .error-msg    → Elemen .error-msg di dalam form
```

---

## 📊 Contoh Output

```
====================================
🤖 AUTOMATION BOT STARTED
====================================
📋 Total Test Cases: 7
====================================
[STEP 1] navigate → ✅ PASS
[STEP 2] fill #username → ✅ PASS
[STEP 3] fill #password → ✅ PASS
[STEP 4] click #login-btn → ✅ PASS
[STEP 5] assert_url  → ✅ PASS
[STEP 6] assert_visible .welcome-message → ✅ PASS
[STEP 7] screenshot  → ✅ PASS
====================================
📊 SUMMARY
====================================
Total  : 7
Passed : 7
Failed : 0
====================================
📁 Hasil tersimpan di test_results.log
```

---

## 💡 Tips Mencari Selector

1. **Buka website** di Chrome/Firefox
2. **Klik kanan** pada elemen yang ingin di-klik/diisi → pilih **Inspect**
3. Di panel Developer Tools, lihat atribut `id` atau `class` elemen tersebut
4. Contoh:
   - Elemen `<input id="username">` → selector: `#username`
   - Elemen `<button class="btn btn-primary">` → selector: `.btn-primary`
5. Untuk memastikan selector benar, tekan `Ctrl+F` di panel Elements dan ketik selectornya

---

## 🔧 Troubleshooting

### ❌ `Error: Cannot find module 'playwright'`
Belum install dependencies. Jalankan:
```bash
npm install
npx playwright install chromium
```

### ❌ `Gagal membaca file Excel`
File Excel belum dibuat. Jalankan terlebih dahulu:
```bash
node generate-excel.js
```

### ❌ `Error: .env file not found`
Salin file contoh konfigurasi:
```bash
cp .env.example .env
```
Lalu edit `.env` sesuai kebutuhan.

### ❌ Elemen tidak ditemukan (selector error)
- Pastikan selector sudah benar (gunakan DevTools untuk inspeksi)
- Coba tambahkan step `wait` sebelum step yang bermasalah untuk memberi waktu halaman loading
- Cek apakah elemen ada di dalam iframe (butuh penanganan khusus)

### ❌ Bot berjalan terlalu cepat
Tambahkan step `wait` di Excel:
| Step | Action | Value |
|------|--------|-------|
| X    | wait   | 2000  |

---

## 📁 Struktur Folder

```
automation-bot/
├── src/
│   ├── index.js           → Entry point utama bot
│   ├── excelReader.js     → Modul baca & parse test case dari Excel
│   └── actions.js         → Semua fungsi aksi (click, fill, assert, dll)
├── test_cases/
│   └── test_cases.xlsx    → File Excel test case (generate dengan generate-excel.js)
├── screenshots/           → Hasil screenshot (dibuat otomatis, tidak di-commit)
├── generate-excel.js      → Script untuk generate template Excel
├── .env.example           → Template environment variables
├── .gitignore
├── package.json
└── README.md
```

---

## 📄 Lisensi

MIT
