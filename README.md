# OCTO Tap — Sistem Registrasi & Manajemen Produk Google Review NFC + QR

> **Master Brand**: OCTO — *ONE PLATFORM. MANY POSSIBILITIES. Smart business tools, connected.*  
> **Lini Produk**: **OCTO Tap**  
> **Arsitektur Backend**: Golang Clean Architecture + Domain-Driven Design (DDD)  
> **Frontend**: Next.js 14 (App Router, TypeScript, Tailwind CSS, Lucide Icons)  
> **Database**: PostgreSQL dengan Schema Migrations Engine  

---

## 📑 Daftar Isi
1. [Tentang Produk & Brand OCTO](#1-tentang-produk--brand-octo)
2. [Model Operasional: Model A (By Order) vs Model B (Cetak Stok Massal)](#2-model-operasional-model-a-vs-model-b)
3. [Arsitektur Sistem (Clean Architecture + DDD)](#3-arsitektur-sistem-clean-architecture--ddd)
4. [Alur Database Migration](#4-alur-database-migration)
5. [Panduan Instalasi & Menjalankan Sistem](#5-panduan-instalasi--menjalankan-sistem)
   - [Opsi A: Menjalankan Menggunakan Docker Compose (Rekomendasi)](#opsi-a-menjalankan-menggunakan-docker-compose-rekomendasi)
   - [Opsi B: Menjalankan Secara Manual (Local Development)](#opsi-b-menjalankan-secara-manual-local-development)
6. [Panduan Operasional End-to-End (SOP Model A & Model B)](#6-panduan-operasional-end-to-end-sop-model-a--model-b)
7. [Dokumentasi API & Postman Collection](#7-dokumentasi-api--postman-collection)
8. [Spesifikasi Fisik Kartu Akrilik (Lampiran A PRD)](#8-spesifikasi-fisik-kartu-akrilik-lampiran-a-prd)
9. [Menjalankan Pengujian Otomatis (Testing)](#9-menjalankan-pengujian-otomatis-testing)

---

## 2. Model Operasional: Model A vs Model B

OCTO Tap dirancang fleksibel untuk mendukung 2 model bisnis produksi:

### 🅰️ Model A: On-Demand / By Order (Per Bisnis)
Cocok untuk pesanan khusus klien yang sudah terdaftar sebelum proses cetak dimulai:
1. Daftarkan bisnis klien & verifikasi URL Google Review (`https://g.page/...`).
2. Terbitkan batch kartu untuk bisnis tersebut.
3. Cetak akrilik UV, encode NFC, lakukan verifikasi QC.
4. Aktifkan kartu -> Kartu siap digunakan pelanggan.

### 🅱️ Model B: Pre-Printed Mass Stock / Cetak Massal Dulu (Stok Gudang)
Cocok untuk **efisiensi biaya cetak massal (UV print & NFC encoding skala besar)** sebelum ada pembeli:
1. Terbitkan kartu stok secara massal (misal: 50, 100, atau 500 kartu) melalui tombol **"+ Cetak Stok Massal (Model B)"**.
2. Setiap kartu langsung memiliki **32-byte CSPRNG token & QR code unik**. Kartu belum terikat ke bisnis apa pun (`business_id = NULL`).
3. Cetak fisik akrilik UV dan encode chip NFC massal di vendor percetakan.
4. Lakukan QC dan simpan kartu fisik di etalase / gudang inventaris sebagai stok siap pakai.
5. Jika ada pengguna yang memindai/mengetap kartu sebelum dihubungkan, sistem akan menampilkan **Halaman Informasi Status Ramah** yang menjelaskan kartu belum diaktifkan.
6. **Saat Klien Memesan**:
   - Admin cukup mencari kartu stok fisik yang akan dikirim (misal kode `OCTO-202610-B01-0001`).
   - Klik tombol **"Hubungkan & Aktifkan"** (*Assign & Activate*).
   - Masukkan Nama Bisnis dan URL Google Review klien.
   - **Selesai!** Kartu fisik langsung **ACTIVE seketika**, dan redirect `/r/{token}` langsung membawa pelanggan ke ulasan Google tanpa perlu mencetak ulang fisik kartu!

---

## 1. Tentang Produk & Brand OCTO

**OCTO** adalah master brand untuk ekosistem perangkat dan layanan bisnis terhubung dengan karakter modern, cerdas, geometris, berpalet warna **Navy** (`#0F172A`, `#0B132B`) dan **Cyan** (`#06B6D4`, `#0891B2`).

**OCTO Tap** adalah platform yang membantu admin/penjual memproduksi, memprogram, menguji QC, dan mengelola kartu ulasan akrilik **Google Review** yang dilengkapi dengan **QR Code unik** dan **chip NFC (NTAG213)**.

### Nilai Utama & Solusi Masalah:
* **Anti-Salah Sasaran**: URL NFC dan QR pada kartu yang sama dijamin 100% identik sebelum kartu dapat diaktifkan.
* **Anti-Duplikasi Token**: Token dibuat dari 32 byte data acak melalui CSPRNG (*Cryptographically Secure Pseudo-Random Number Generator*) yang di-encode Base64 URL-safe tanpa padding (sekitar 43 karakter).
* **Fleksibilitas URL Tanpa Cetak Ulang**: Jika bisnis berpindah alamat atau tautan Google Review berubah, admin dapat memperbarui URL di dashboard tanpa mencetak ulang kartu akrilik fisik.
* **Keamanan Open Redirect**: Validasi ketat terhadap skema protokol HTTPS dan whitelist domain resmi Google (`g.page`, `maps.app.goo.gl`, `search.google.com`, dll).
* **Audit Trail Permanen**: Seluruh pembaruan URL, penerbitan kartu, dan perubahan status dicatat secara kekal (*immutable*).

---

## 2. Arsitektur Sistem (Clean Architecture + DDD)

Backend dibangun dengan memisahkan domain bisnis murni dari detail infrastruktur dan delivery layer:

```
backend/
├── cmd/
│   ├── server/          # Entry point aplikasi HTTP Server & Graceful Shutdown
│   │   └── main.go
│   └── migrate/         # CLI Database Migration Tool (up, down, status)
│       └── main.go
├── migrations/          # File migrasi SQL terurut
│   ├── 000001_create_initial_schema.up.sql
│   ├── 000001_create_initial_schema.down.sql
│   ├── 000002_seed_default_admin.up.sql
│   └── 000002_seed_default_admin.down.sql
├── internal/
│   ├── domain/          # LAPISAN DOMAIN (Inti Bisnis / DDD)
│   │   ├── entity/      # Entitas bisnis: AdminUser, Business, Card, ProductionEvent, AuditLog
│   │   ├── valueobject/ # Value Objects: CardStatus, BusinessStatus, Token (CSPRNG), CardCode, GoogleReviewURL
│   │   ├── repository/  # Interface kontrak persistensi (AdminRepo, BusinessRepo, CardRepo, dll)
│   │   └── errors/      # Domain error definitions
│   ├── usecase/         # LAPISAN APLIKASI / USE CASE
│   │   ├── auth_usecase.go
│   │   ├── business_usecase.go
│   │   ├── card_usecase.go
│   │   ├── production_usecase.go
│   │   ├── redirect_usecase.go
│   │   └── audit_usecase.go
│   ├── infrastructure/  # LAPISAN INFRASTRUKTUR & DRIVER
│   │   ├── config/      # Environment config loader
│   │   ├── database/    # Koneksi PostgreSQL & Engine Migrator
│   │   ├── repository/  # Implementasi PostgreSQL repository
│   │   ├── security/    # Bcrypt Password Hasher & JWT Token Provider
│   │   └── qrcode/      # Generator QR Code PNG & Base64
│   └── delivery/        # LAPISAN DELIVERY / PRESENTASI
│       └── http/
│           ├── handler/ # Controller REST API (Auth, Business, Card, Redirect, Audit)
│           ├── middleware/ # JWT Auth, CORS, Request Metadata
│           ├── response/ # Format standar JSON envelope response
│           └── router.go # Routing Chi router & route tree
```

### Siklus Status Kartu (*Lifecycle Pipeline*):
```
[DRAFT] -> [READY] -> [IN_PRODUCTION] -> [QC_PASSED] -> [ACTIVE] <-> [INACTIVE]
                                                             |
                                                             v
                                                         [REVOKED] (HTTP 410 Gone - Permanen)
```

---

## 3. Alur Database Migration

Sistem dilengkapi dengan **Migration Engine mandiri** yang mencatat riwayat versi migrasi pada tabel `schema_migrations`.

### Struktur File Migrasi:
* `migrations/000001_create_initial_schema.up.sql`: Membuat ekstensi UUID, tabel `admin_users`, `businesses`, `cards`, `idempotency_keys`, `production_events`, dan `audit_logs` beserta indeksnya.
* `migrations/000001_create_initial_schema.down.sql`: Rollback tabel initial schema.
* `migrations/000002_seed_default_admin.up.sql`: Menyiapkan akun default Administrator (`admin@octotap.com` / `AdminOCTO2026!`) dan data sample bisnis aktif.
* `migrations/000002_seed_default_admin.down.sql`: Rollback data seed.

### Penggunaan CLI Migrasi:
Masuk ke direktori `backend/`:

1. **Melihat Status Migrasi**:
   ```bash
   go run cmd/migrate/main.go status
   ```
2. **Menjalankan Migrasi (UP)**:
   ```bash
   go run cmd/migrate/main.go up
   ```
3. **Membatalkan Migrasi Terakhir (DOWN / Rollback)**:
   ```bash
   go run cmd/migrate/main.go down
   ```

> **Catatan**: Server backend juga memiliki fitur `AUTO_MIGRATE=true` pada file `.env`. Saat server pertama kali dijalankan, seluruh file migrasi `.up.sql` yang belum diaplikasikan akan otomatis dijalankan.

---

## 4. Panduan Instalasi & Menjalankan Sistem

### Kredensial Default Admin:
* **Email**: `admin@octotap.com`
* **Password**: `AdminOCTO2026!`

---

### Opsi A: Menjalankan Menggunakan Docker Compose (Rekomendasi)

Cukup satu perintah dari root folder:
```bash
docker-compose up -d --build
```

Layanan yang akan berjalan:
* **Frontend Web Dashboard**: `http://localhost:3000`
* **Backend REST & Public Redirect API**: `http://localhost:8080`
* **PostgreSQL Database**: `localhost:5432`

---

### Opsi B: Menjalankan Secara Manual (Local Development)

#### 1. Persiapan Database PostgreSQL
Pastikan PostgreSQL aktif, lalu buat database:
```bash
createdb octo_tap_db
```

#### 2. Menjalankan Backend Go
```bash
cd backend

# Salin konfigurasi environment
cp .env.example .env

# Jalankan migrasi database
go run cmd/migrate/main.go up

# Jalankan server API backend
go run cmd/server/main.go
```
*API akan aktif di `http://localhost:8080`*

#### 3. Menjalankan Frontend Next.js
Buka terminal baru di folder `frontend/`:
```bash
cd frontend

# Install dependensi (jika belum)
npm install

# Jalankan server Next.js mode development
npm run dev
```
*Buka browser di `http://localhost:3000`*

---

## 5. Panduan Operasional End-to-End (SOP)

Berikut alur kerja operasional produksi dari awal hingga kartu digunakan oleh pelanggan:

### Langkah 1: Login Admin
Buka `http://localhost:3000`, masukkan kredensial admin default atau klik tombol **"Gunakan Akun Default Admin"**.

### Langkah 2: Registrasi Bisnis
1. Buka tab **"Bisnis & URL"** -> Klik **"+ Tambah Bisnis Baru"**.
2. Masukkan nama bisnis (misal: *Kopi Kenangan Senopati*).
3. Masukkan target URL ulasan Google (wajib HTTPS, contoh: `https://g.page/r/CbKenanganReviewSample/review`).
4. Bisnis tersimpan dengan status awal **PENDING**.

### Langkah 3: Verifikasi URL Google Review
1. Admin memeriksa keabsahan tautan dengan mengklik link ulasan.
2. Klik tombol **"Verifikasi URL"**. Status bisnis berubah menjadi **ACTIVE**.

### Langkah 4: Penerbitan Batch Kartu (Batch Issuance)
1. Buka tab **"Inventaris Kartu"** -> Klik **"+ Terbitkan Batch Kartu"**.
2. Pilih bisnis aktif dan masukkan jumlah kartu (misal: 10 kartu).
3. Backend secara otomatis men-generate:
   - Kode inventaris terstruktur (misal: `OCTO-202610-B01-0001`).
   - Token kriptografis 32-byte CSPRNG Base64 URL-safe.
   - Batch ID (misal: `BATCH-202610-001`).
   - Request aman dari double-submission berkat proteksi **Idempotency Key**.
4. Kartu tersimpan dengan status **DRAFT**.

### Langkah 5: Generate QR Code & Export Manifest
1. Klik tombol **"Generate QR"** pada kartu. Status berpindah ke **READY**.
2. Admin dapat mengunduh gambar PNG beresolusi tinggi untuk dicetak ke akrilik UV Print.
3. Buka tab **"Produksi & QC"** -> Klik **"Export Manifest CSV"** untuk diserahkan ke vendor percetakan.

### Langkah 6: Pemrograman NFC & Verifikasi (Quality Control)
1. Buka tab **"Produksi & QC"**, pilih kartu yang sedang diproses.
2. Klik **"Tulis Tag NFC Sekarang"** (menulis NDEF URI record berisi `http://localhost:8080/r/{token}`). Status kartu menjadi **IN_PRODUCTION**.
3. Klik **"Verifikasi Kesamaan URL"**: Sistem membaca ulang chip NFC dan membandingkannya dengan URL redirect QR. Jika URL sama persis, verifikasi berhasil dicatat.
4. Klik **"Nyatakan Lolos QC (QC_PASSED)"**.

### Langkah 7: Aktivasi Kartu
1. Kembali ke tab **"Inventaris Kartu"** atau buka modal Detail Kartu.
2. Klik tombol **"Aktifkan"**.
3. *Aturan validasi sistem*: Kartu **hanya bisa diaktifkan** jika sudah berstatus **QC_PASSED** dan bisnis terkait berstatus **ACTIVE**.

### Langkah 8: Pelanggan Melakukan Tap NFC atau Scan QR
1. Pengguna/pelanggan tap ponsel atau memindai QR kartu.
2. Browser membuka endpoint publik: `GET http://localhost:8080/r/{token}`.
3. Sistem memvalidasi token, status kartu, dan bisnis:
   - **Kartu & Bisnis ACTIVE**: Sistem merespons dengan **HTTP 302 Found** dan langsung mengarahkan browser ke halaman ulasan Google.
   - **Token Tidak Dikenal / Belum Aktif**: Merespons dengan **HTTP 404 Not Found**.
   - **Kartu Dicabut (REVOKED)**: Merespons dengan **HTTP 410 Gone**.
4. *Counter* tap pada kartu otomatis bertambah secara real-time.

### Langkah 9: Penggantian URL Google Review Dinamis
Jika pihak bisnis memperbarui link Google Review mereka:
1. Buka tab **"Bisnis & URL"** -> Klik ikon **Edit** pada bisnis terkait.
2. Masukkan URL Google Review baru -> Simpan.
3. **Seluruh kartu fisik yang beredar langsung mengarah ke URL baru seketika tanpa perlu mencetak ulang akrilik!**
4. Pembaruan URL dicatat di **Audit Trail** lengkap dengan perbandingan nilai lama dan nilai baru.

### Langkah 10: Pencabutan Kartu (Revoke)
Jika kartu hilang atau dicuri:
1. Klik tombol **"Cabut Permanen (Revoke)"** pada kartu.
2. Status kartu menjadi **REVOKED**.
3. Siapa pun yang men-tap kartu tersebut selanjutnya akan menerima respons **HTTP 410 Gone** dan tidak dapat diarahkan ke bisnis mana pun. Kartu yang sudah dicabut tidak dapat diaktifkan kembali.

---

## 6. Dokumentasi API & Postman Collection

File Postman Collection dan Environment telah disediakan lengkap di direktori `postman/`:
* `postman/OCTO_Tap_API.postman_collection.json`
* `postman/OCTO_Tap_Local.postman_environment.json`

### Cara Menggunakan Postman:
1. Buka aplikasi Postman -> Klik **Import** -> Pilih kedua file di atas.
2. Pilih environment **"OCTO Tap — Local Environment"** di pojok kanan atas.
3. Jalankan request **"01. Auth / Admin Login"**. Script test akan **otomatis menyimpan token JWT** ke variabel environment `{{admin_token}}`.
4. Anda dapat langsung menjalankan seluruh request bisnis, kartu, produksi, audit, dan redirect publik tanpa perlu copy-paste token manual!

### Ringkasan Endpoint Utama:
| Kategori | Method | Endpoint | Keterangan |
| :--- | :---: | :--- | :--- |
| **Auth** | `POST` | `/api/v1/admin/auth/login` | Login admin & generate JWT |
| | `GET` | `/api/v1/admin/auth/me` | Informasi profil admin aktif |
| **Bisnis** | `POST` | `/api/v1/admin/businesses` | Registrasi bisnis baru (status PENDING) |
| | `GET` | `/api/v1/admin/businesses` | Daftar bisnis & jumlah kartu terhubung |
| | `GET` | `/api/v1/admin/businesses/{id}` | Detail bisnis spesifik |
| | `PATCH`| `/api/v1/admin/businesses/{id}` | Update nama bisnis atau URL Google Review |
| | `POST` | `/api/v1/admin/businesses/{id}/verify-url` | Verifikasi URL ulasan (status jadi ACTIVE) |
| | `POST` | `/api/v1/admin/businesses/{id}/cards` | Batch penerbitan kartu (dengan Idempotency Key) |
| | `GET` | `/api/v1/admin/businesses/{id}/manifest` | Manifest cetak kartu milik bisnis |
| **Kartu** | `GET` | `/api/v1/admin/cards` | Pencarian & filter inventaris kartu |
| | `POST` | `/api/v1/admin/cards/issue-stock` | **Model B**: Penerbitan batch stok massal tanpa bisnis |
| | `POST` | `/api/v1/admin/cards/{id}/assign-activate` | **Model B**: Hubungkan bisnis klien & aktifkan seketika |
| | `GET` | `/api/v1/admin/cards/{id}` | Detail kartu & riwayat event produksi |
| | `POST` | `/api/v1/admin/cards/{id}/generate-qr` | Generate QR Code Base64 |
| | `GET` | `/api/v1/admin/cards/{id}/qr.png` | Unduh file QR Code PNG beresolusi tinggi |
| | `POST` | `/api/v1/admin/cards/{id}/production-events`| Catat peristiwa produksi (NFC_WRITTEN, NFC_VERIFIED, QC) |
| | `POST` | `/api/v1/admin/cards/{id}/activate` | Aktivasi kartu (syarat: QC_PASSED & bisnis ACTIVE) |
| | `POST` | `/api/v1/admin/cards/{id}/deactivate` | Nonaktifkan kartu sementara (INACTIVE) |
| | `POST` | `/api/v1/admin/cards/{id}/revoke` | Cabut kartu permanen (REVOKED) |
| **Manifest**| `GET` | `/api/v1/admin/manifest` | Manifest global / per batch produksi |
| **Audit** | `GET` | `/api/v1/admin/audit-logs` | Riwayat audit log perubahan data |
| **Public**| `GET` | `/r/{token}` | Public Redirect (302 ke Google Review) |
| | `HEAD`| `/r/{token}` | Header check tanpa body |
| **Health**| `GET` | `/health` | Pemeriksaan kesehatan layanan API |

---

## 7. Spesifikasi Fisik Kartu Akrilik (Lampiran A PRD)

Desain fisik kartu telah diintegrasikan visualisasinya ke dalam dashboard admin:
* **Dimensi**: 100 × 100 mm (10 × 10 cm).
* **Material**: Akrilik bening berkualitas tinggi, ketebalan 3 mm.
* **Finishing Sudut**: Membulat (*rounded corners*) dengan radius sekitar 8 mm.
* **Cetak**: Full color UV Print tahan gores dengan palet Google Review (Biru, Merah, Kuning, Hijau) dan tipografi modern.
* **Chip NFC**: NTAG213 (13.56 MHz, NDEF URI standard) ditempatkan di sisi belakang kartu.
* **Kesesuaian Tautan**: QR Code dan chip NFC pada kartu yang sama menyimpan URL redirect yang identik (`https://domain/r/{token}`).

---

## 8. Menjalankan Pengujian Otomatis (Testing)

Untuk menjalankan seluruh unit test alur kritis:
```bash
cd backend
go test -v ./...
```

Pengujian memvalidasi:
1. **GoogleReviewURL**: Menolak skema HTTP, menolak domain tidak sah (pencegahan *open redirect*), menerima domain sah Google Maps/Review.
2. **Token Generator**: Memastikan keacakan kriptografis 32-byte CSPRNG tanpa risiko tabrakan.
3. **Card Lifecycle Rules**: Memastikan kartu tidak dapat diaktifkan sebelum lolos QC, tidak dapat diaktifkan jika bisnis belum aktif, serta kartu yang telah di-revoke tidak dapat diaktifkan kembali.
