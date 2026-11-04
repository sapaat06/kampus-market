# AUDIT FITUR — kampus-market

- Repo: `C:\Project\kampus-market` · Branch: `desain-figma` · HEAD saat audit: `1f15f1952e0ee271c43e816b26988cd34b0bcf0f`
- Tanggal audit: 1 November 2026
- Sifat: audit bukti (bukan perbaikan). Tidak ada kode project, aset, atau database asli yang diubah. `docs/AUDIT.md` dan `docs/IMPLEMENTASI.md` tidak dipakai sebagai bukti.
- Semua angka "X dari Y" dihitung dari tabel di laporan ini; data mentah ada di `docs/audit-fitur/results/`.

---

## 1. Ringkasan & keputusan

### 1.1 Hasil per rangkaian uji

| Rangkaian | Tes | Lulus | Bermasalah | Tidak dapat diverifikasi |
|---|---|---|---|---|
| API (`run.js api`) | 95 | 87 OK | 7 BUG + 1 TIDAK AMAN | 0 |
| Klik UI 390 px (`run.js ui`) | <<<UI_TOTAL>>> | <<<UI_OK>>> | <<<UI_BAD>>> | 0 |
| Alur E2E per role (`run.js flow`) | 30 | 18 Jalan | 4 Rusak | 6 tidak ada + 2 PALSU |
| Keamanan dasar (`run.js security`) | 22 | 19 OK | 2 BUG + 1 TIDAK AMAN | 0 |
| Kualitas & tes bawaan (`run.js quality`) | 13 | 4 OK | 8 BUG | 1 (tidak ada lint) |

Angka mentah: `results/api.json`, `results/ui-clicks.json`, `results/flow.json`, `results/security.json`, `results/quality.json`.

### 1.2 Sepuluh temuan terburuk

| # | Temuan | Bukti | Dampak |
|---|---|---|---|
| 1 | **CSP `script-src 'self'` memblokir semua inline handler** (`onclick`/`onsubmit`/`onerror`) — 14 handler di 8 file HTML. Tombol "Mulai bergabung" & "Sudah punya akun? Masuk" di `index.html`/`welcome.html` tidak melakukan apa pun; tombol "Daftar sekarang" di `masuk.html`, "Ubah Foto" di `verifikasi.html`, form `daftar.html`, dan tombol kembali `cari.html` juga mati. | `results/ui-clicks.json` (index 2/2 Mati, welcome 2/2 Mati) + `ui-load-errors.json` berisi log CSP; `public/index.html:68-69`, `public/masuk.html:83`, `public/verifikasi.html:305`, `public/daftar.html:200`, `public/cari.html:523`; CSP di `src/server.js` | Pengguna baru tidak bisa masuk ke alur registrasi/verifikasi lewat UI. CTA utama aplikasi mati total. |
| 2 | **Dashboard pemilik kos tidak bisa dipakai.** `GET /api/kos/miliku` selalu 400 karena tertangkap route `/kos/:id`; `PATCH /api/kos/:id` menolak body parsial `{status_kos}`; tombol Hapus memanggil `KM.delete` yang tidak ada (TypeError). | `results/api.json` E-003/E-004/E-005/E-011; `results/flow.json` F-17/F-18; `src/routes/kos.js:22,53,75`; `public/js/kos-owner.js:71,117,142`; `public/js/api.js:126-131` | Pemilik kos tidak bisa melihat, membuka/menutup, mengedit, atau menghapus kosnya. Hanya "Tambah Kost" yang berfungsi. |
| 3 | **IDOR/impersonasi penjual:** `POST /api/barang` memakai `id_penjual` dari body, bukan dari sesi. Akun B berhasil membuat barang atas nama penjual A. | `results/api.json` B-015 (TIDAK AMAN), `results/security.json` S-20; `src/routes/barang.js:31`; cek DB: barang id 27 tersimpan `id_penjual=8` (milik A) | Listing bisa dibuat atas nama orang lain; pengecekan "tidak bisa transaksi barang milik sendiri" dapat dikelabui. |
| 4 | **Unggah ulang KTM selalu gagal:** UI mengirim data URL hingga 800.000 karakter, endpoint `POST /api/verifikasi` membatasi 500 karakter. | `results/api.json` A-014 (HTTP 400 `ktm maksimal 500 karakter`), `results/flow.json` F-03; `src/routes/auth.js:93` vs `public/js/verifikasi.js:228` | Mahasiswa yang KTM-nya ditolak tidak dapat memperbaiki berkas dari UI. |
| 5 | **Halaman `daftar.html` tidak ditautkan dan form-nya diblokir CSP** (submit inline). Satu-satunya jalan daftar adalah tautan mati di `masuk.html`. | `results/quality.json` Q-10 (tidak ada tautan), Q-01/Q-07; `public/daftar.html:200`; `results/ui-clicks.json` masuk `#daftarLink` Mati; `public/js/masuk.js:73-77` hanya menangani submit | Alur registrasi via UI tidak dapat diselesaikan tanpa mengetik URL manual. |
| 6 | **Logout tidak mematikan token.** `POST /api/logout` hanya menghapus cookie; token HMAC stateless tetap berlaku 24 jam. | `results/flow.json` F-30 (logout 200, token lama tetap 200 di `/api/saya`); `src/routes/auth.js:62-65` | Token yang sempat dicuri/tertinggal di perangkat tetap valid sampai kedaluwarsa. |
| 7 | **Enam fitur inti tidak punya backend** dan sebagian tampil sebagai mockup: chat (localStorage), moderasi produk admin, aturan/toggle Green Point, penyewa & pengajuan sewa kos, verifikasi kos, lencana. | `results/flow.json` F-20/F-21/F-23/F-24/F-26/F-27/F-29; `public/js/chat.js:3,81-96`; `public/profil.html` blok lencana; tidak ada route chat/kos-penyewa di `src/routes/` | Fitur yang terlihat di desain tidak dapat dipakai; risiko ekspektasi penguji/klien. |
| 8 | **Validasi input lemah:** `POST /api/penjual` menerima email `bukan-email-...` (201); `POST /api/register` menerima KTM string biasa (201); `POST /api/barang` menerima `foto: "javascript:alert(1)"` (201). | `results/api.json` B-004; `results/security.json` S-12, S-14; `src/routes/barang.js:24`, `src/routes/auth.js:36` | Data kotor masuk DB; foto non-gambar/URI asing tersimpan dan dirender sebagai `<img src>`. |
| 9 | **Halaman/tautan mati:** `welcome.html` duplikat identik `index.html` (SHA-256 sama) dan masih dilayani 200; nav menautkan `/estimasi.html` yang 404; `KM.delete` tidak diekspor. | `results/api.json` F-007; `results/quality.json` Q-06/Q-07/Q-09; `public/js/api.js:99,126-131`; `Get-FileHash` kedua file = `873BD5...3570F` | Navigasi membawa pengguna ke 404; dua sumber kebenaran halaman; error runtime saat hapus kos. |
| 10 | **Data tampilan palsu/statis:** profil memakai fallback 350 poin dan angka statistik statis saat data 0; daftar aktivitas dimatikan `&& false`; modal Green Point hardcode "+30 poin / 320→350"; status-sewa hardcode `KC-261027` + fallback 25 poin. | `public/js/profil.js:30,57-59,83`; `public/green-point.html:322-334`; `public/js/status-sewa.js:71,114-116`; `results/quality.json` Q-11/Q-12 | Angka yang dilihat pengguna tidak sesuai data sebenarnya (menyesatkan saat demo/uji). |

### 1.3 Keputusan: **belum aman di-merge ke `main`**

Alasan pemblokir (semua terverifikasi, bukan asumsi):

1. CTA utama dan alur registrasi mati karena CSP (temuan 1, 5).
2. Dashboard pemilik kos tidak berfungsi (temuan 2).
3. Ada celah impersonasi penjual (temuan 3, berstatus TIDAK AMAN).
4. Fitur yang dipamerkan di UI tidak punya backend (temuan 7).

Syarat minimum sebelum merge: perbaiki 1–5, tandai/hapus fitur mockup, lalu ulangi `run.js api|ui|flow|security|quality`.

---

## 2. Metode & lingkungan

### 2.1 Sandbox (tanpa menyentuh data asli)

- Database asli **tidak disentuh**. `app.db` dihitung sebelum & sesudah audit: SHA-256 `07BE7D34043C5EC5F115998A65AE04A60E8C577EBDF8F16D07BD406B96032E2B` (identik).
- Salinan DB: `docs/audit-fitur/tmp/audit.db` (+ snapshot `audit.db.orig`).
- Dua server uji dari salinan, env eksplisit (tanpa memuat `.env` asli): `DB=<salinan>`, `ADMIN_KEY=<kunci uji>`, `SECRET=<rahasia uji>`.
  - `http://localhost:3100` — rate limit aktif (uji 429).
  - `http://localhost:3101` — `RATE_LIMIT_DISABLED=1` (uji massal API/UI/flow).
- Akun uji dibuat di salinan lewat API: `audit.a`, `audit.b`, `audit.c` (mahasiswa), `audit.owner`, `audit.owner2` (role `pemilik_kost`), `audit.verif`; password uji `AuditPass123`. Email diredaksi di laporan ini.
- Admin diuji lewat header `x-admin-key`; nilai kunci tidak ditulis di laporan.

### 2.2 Alat

- Satu runner reusable: `docs/audit-fitur/run.js` dengan subperintah `api | ui | flow | security | quality`.
- UI diuji dengan **Chrome headless via CDP** (WebSocket bawaan Node 24); tidak memasang library baru. Viewport 390×844 (mobile), layout juga diukur pada 360/390/430 px.
- Klik dilakukan dengan `element.click()` pada elemen yang ditemukan dari enumerasi DOM (bukan tebakan koordinat); setiap klik didahului reload halaman dan sesi role diset ulang. Dialog `confirm/alert` otomatis ditolak dan dicatat.
- Screenshot hanya diambil untuk elemen yang tidak berstatus "Berfungsi" → `docs/audit-fitur/evidence/ui-<halaman>-<index>.png`.

### 2.3 Aturan klasifikasi

- **API**: `OK` bila respons sesuai kontrak yang diuji; `BUG` bila status/isi menyimpang; `TIDAK AMAN` bila ada dampak keamanan.
- **Klik UI**: `Berfungsi` bila ada navigasi, panggilan API sukses, modal/overlay terbuka, fokus input, toggle, atau perubahan DOM/atribut elemen; `Mati` bila tidak ada perubahan sama sekali; `Error` bila ada exception/galat API; `Salah tujuan` bila navigasi berakhir di HTTP ≥400.
- **Alur**: `Jalan`, `Rusak`, `Tidak ada` (fitur tidak diimplementasikan), `PALSU` (tampilan mockup tanpa backend).
- Metode ini tidak dapat menangkap masalah yang hanya terlihat secara visual (warna/kontras) atau lewat pembaca layar; item seperti itu ditandai **tidak terverifikasi**.

### 2.4 Batasan (jujur)

- Tidak ada pengujian di perangkat fisik, iOS/Safari, atau jaringan nyata.
- Tidak ada uji beban/performance, uji aksesibilitas dengan screen reader, atau uji pembayaran (tidak ada gateway).
- Reset password memang dinonaktifkan oleh aplikasi (503) — bukan bug yang ditemukan audit ini.
- Rate limit hanya diuji sampai 429 pada login; kuota admin tidak dikunci agar sesi audit tidak terputus.
- `npm test` dijalankan pada `DB=:memory:` (bawaan `test/api.test.js`) sehingga tidak menyentuh salinan.

---

## 3. Inventaris fitur (Bagian 1)

Sumber: `src/routes/*.js`, `src/server.js`, `src/db.js`, `public/*.html`, `public/js/*.js`. Rincian lengkap: `docs/audit-fitur/inventory.md`.

### 3.1 Endpoint API (27 route)

| # | Metode | Path | Role | Tabel utama |
|---|---|---|---|---|
| 1 | POST | `/api/register` | publik (rate limit 10/jam) | mahasiswa |
| 2 | POST | `/api/login` | publik (10/15 menit) | mahasiswa |
| 3 | POST | `/api/reset-password` | publik (5/15 menit) | — (selalu 503) |
| 4 | POST | `/api/logout` | publik | — (hapus cookie) |
| 5 | GET | `/api/saya` | user | mahasiswa, poin, transaksi, barang |
| 6 | PATCH | `/api/profil/foto` | user | mahasiswa |
| 7 | DELETE | `/api/profil/foto` | user | mahasiswa |
| 8 | POST | `/api/verifikasi` | user | mahasiswa |
| 9 | GET | `/api/mahasiswa` | admin | mahasiswa |
| 10 | PATCH | `/api/mahasiswa/:id/verifikasi` | admin | mahasiswa |
| 11 | GET | `/api/kategori` | publik | kategori |
| 12 | POST | `/api/kategori` | admin | kategori |
| 13 | POST | `/api/penjual` | admin | penjual |
| 14 | POST | `/api/barang` | user/admin | penjual (auto), barang |
| 15 | GET | `/api/barang` | publik | barang |
| 16 | GET | `/api/barang/:id` | publik | barang |
| 17 | POST | `/api/estimasi` | user | barang, estimasi_harga |
| 18 | GET | `/api/kos` | publik | kos, mahasiswa |
| 19 | GET | `/api/kos/:id` | publik | kos, mahasiswa |
| 20 | POST | `/api/kos` | role `pemilik_kost` | kos |
| 21 | GET | `/api/kos/miliku` | role `pemilik_kost` | kos — **tertutup route 19** |
| 22 | PATCH | `/api/kos/:id` | pemilik kos | kos |
| 23 | DELETE | `/api/kos/:id` | pemilik kos | kos |
| 24 | POST | `/api/transaksi` | user | barang, penjual, mahasiswa, transaksi |
| 25 | GET | `/api/transaksi` | admin | transaksi, mahasiswa, barang |
| 26 | PATCH | `/api/transaksi/:id/selesai` | pemilik/admin | transaksi, barang, poin |
| 27 | PATCH | `/api/transaksi/:id/batal` | pemilik/admin | transaksi, barang |

Tidak ada endpoint untuk: chat, moderasi produk, aturan/toggle Green Point, penyewa/pengajuan sewa kos, verifikasi kos, lencana.

### 3.2 Halaman `public/` (20 file HTML)

| Halaman | Role | JS | Catatan |
|---|---|---|---|
| `index.html` | publik | `api.js` | onboarding; 2 CTA inline `onclick` |
| `welcome.html` | publik | `api.js` | **byte-identik dengan `index.html`** |
| `masuk.html` | publik | `api.js`, `masuk.js` | login |
| `daftar.html` | publik | — | **tidak ditautkan**; form inline `onsubmit` |
| `verifikasi.html` | publik | `api.js`, `verifikasi.js` | daftar + unggah KTM |
| `beranda.html` | user | `api.js`, `beranda.js` | filter mode + kategori |
| `cari.html` | user | `api.js`, `cari.js` | pencarian + bottom sheet filter |
| `detail.html` | publik | `api.js`, `detail.js` | detail + ajukan transaksi + chat |
| `kos.html` | publik | `api.js`, `kos.js` | cari kos |
| `filter-kos.html` | user | `api.js`, `filter-kos.js` | filter kos |
| `chat.html` | user | `api.js`, `chat.js` | **mockup localStorage** |
| `unggah.html` | user | `api.js`, `unggah.js` | unggah + estimasi |
| `green-point.html` | user | `api.js`, `green-point.js` | saldo poin nyata; detail mockup |
| `profil.html` | user | `api.js`, `profil.js` | profil; lencana & aktivitas statis |
| `status-verifikasi.html` | user | `api.js`, `status-verifikasi.js` | status KTM |
| `status-beli.html` | user | `api.js`, `status-beli.js` | status beli |
| `status-sewa.html` | user | `api.js`, `status-sewa.js` | status sewa (ada hardcode) |
| `status-pinjam.html` | user | `api.js`, `status-pinjam.js` | status pinjam |
| `kos-owner.html` | `pemilik_kost` | `api.js`, `kos-owner.js` | CRUD kos |
| `admin.html` | admin | `api.js`, `js/pages/admin.js` | transaksi + verifikasi mahasiswa |

`legacy/` dan `scratch/` tidak dilayani (`express.static` hanya `public/`; `GET /legacy/index.html` → 404).

### 3.3 Peta fitur → backend

Status diambil dari hasil uji API/flow/UI (bukan dari ada-tidaknya kode). "Tidak ada" = tidak ada tabel/endpoint/UI; "PALSU" = tampilan jalan tetapi hanya data lokal/statis.

| Fitur | Status | Bukti |
|---|---|---|
| Registrasi akun (API) | Jalan | F-01, A-001/A-002 |
| Registrasi dari UI (`daftar.html`) | Tidak tercapai | Q-10, CSP `daftar.html:200`, UI klik |
| Login | Jalan | F-02, UI klik `#loginBtn` |
| Lupa kata sandi | Tidak ada | A-012 (503) + alert inline diblokir CSP |
| Verifikasi KTM saat daftar | Jalan | F-01 (KTM 300 KB tersimpan) |
| Unggah ulang KTM | Rusak | A-014, F-03 |
| Verifikasi mahasiswa oleh admin | Jalan | F-04, F-22 |
| Beranda + filter mode | Jalan | F-05, F-06 |
| Pencarian & filter lanjutan | Sebagian | Q-05 (kontrol filter lama tidak ada), sort mati |
| Detail barang + ajukan transaksi | Jalan | F-07/F-10/F-12, UI klik |
| Halaman status beli/sewa/pinjam | Jalan (data), sebagian hardcode | F-10/F-11, Q-12 |
| Unggah produk + estimasi harga | Jalan | F-14/F-15, D-001..D-006 |
| Saldo Green Point | Jalan | F-28 (API = DB) |
| Riwayat/detail Green Point | PALSU | `public/green-point.html:322-334` (+30, 320→350) |
| Profil (nama, poin, statistik) | Sebagian | aktivitas `&& false` (Q-11), fallback 350/angka statis |
| Lencana | PALSU | F-29 |
| Chat | PALSU | F-27, `chat.js` localStorage |
| Cari & detail kos | Jalan | F-16, E-001/E-006/E-007 |
| Dashboard kos milik pemilik | Rusak | F-17/F-18, E-003..E-005/E-011 |
| Tambah/edit kos | Jalan (API) | E-001, E-012 |
| Dashboard transaksi admin | Jalan | F-22 (24 transaksi, 16 mahasiswa) |
| Moderasi produk admin | Tidak ada | F-23 |
| Aturan/toggle Green Point admin | Tidak ada | F-24 |
| Penyewa & pengajuan sewa kos | Tidak ada | F-20 |
| Verifikasi kos oleh admin | Tidak ada | F-21 |
| Logout | Rusak | F-30 |

Ringkas dari 26 baris di atas: **11 Jalan, 3 Sebagian, 3 Rusak, 5 Tidak ada, 3 PALSU, 1 tidak tercapai lewat UI** (jumlah = 26). Hitungan ini berasal dari kolom Status tabel, bukan taksiran.

---

## 4. Uji API (Bagian 2)

Perintah: `node docs/audit-fitur/run.js api` → `results/api.json`. Total **95 tes**, tiap baris memuat `method`, `endpoint`, `expected`, `actual`, dan `evidence`.

| Kelompok | Tes | OK | BUG | TIDAK AMAN |
|---|---|---|---|---|
| `API/auth` | 22 | 21 | 1 | 0 |
| `API/barang` | 22 | 20 | 1 | 1 |
| `API/transaksi` | 22 | 22 | 0 | 0 |
| `API/estimasi` | 6 | 6 | 0 | 0 |
| `API/kos` | 15 | 11 | 4 | 0 |
| `API/server` | 8 | 7 | 1 | 0 |
| **Total** | **95** | **87** | **7** | **1** |

### 4.1 Temuan API

| ID | Endpoint | Harapan | Hasil | Bukti |
|---|---|---|---|---|
| A-014 | `POST /api/verifikasi` | 200 untuk KTM data URL 500 KB (UI mengizinkan s.d. 800 KB) | **400** `{"error":"ktm maksimal 500 karakter"}` | `results/api.json` A-014; `src/routes/auth.js:93` vs `public/js/verifikasi.js:228` |
| B-004 | `POST /api/penjual` | 400 untuk email tidak valid | **201** `{"id":9}` | `results/api.json` B-004; `src/routes/barang.js:24` memakai `optStr`, bukan `emailOf` |
| B-015 | `POST /api/barang` | 403/ditolak — B tidak boleh membuat barang atas nama penjual A | **201**; baris tersimpan dengan `id_penjual` milik A | `results/api.json` B-015; `src/routes/barang.js:31`; DB salinan: `barang.id_barang=27 → id_penjual=8` |
| E-003 | `GET /api/kos/miliku` | 200 + array kos milik sendiri | **400** `{"error":"id_kos harus bilangan bulat > 0"}` | `results/api.json` E-003; `src/routes/kos.js:22` menangkap `miliku` sebelum `:53` |
| E-004 | `GET /api/kos/miliku` (mahasiswa biasa) | 403 | **400** (pesan sama) | `results/api.json` E-004 |
| E-005 | `GET /api/kos/miliku` (tanpa login) | 401 | **400** (pesan sama) | `results/api.json` E-005 |
| E-011 | `PATCH /api/kos/:id` body `{status_kos}` | 200 (dipakai tombol Buka/Tutup) | **400** `{"error":"nama_kos harus teks"}` | `results/api.json` E-011; `src/routes/kos.js:75` mewajibkan `nama_kos` |
| F-007 | `GET /welcome.html` | 404 (tidak ada duplikat) | **200**, isi identik `index.html` | `results/api.json` F-007; SHA-256 kedua file sama |

Catatan: E-003/E-004/E-005 adalah **satu akar masalah** (urutan route). Bila dihitung per akar masalah, temuan API unik = **5 BUG + 1 TIDAK AMAN** (A-014, B-004, B-015, E-003/4/5, E-011, F-007).

### 4.2 Yang justru terbukti benar (contoh)

- Otorisasi transaksi: IDOR `PATCH /api/transaksi/:id/selesai` milik orang lain → 404/403 (C-012, S-22).
- Barang tidak tersedia tidak bisa ditransaksikan dua kali → 409 (C-010).
- Foto dibatasi 3 (B-014); harga negatif/teks ditolak; `posInt`/`str`/`oneOf` konsisten.
- Endpoint admin menolak user biasa (403) dan tanpa login (401) — A-015/A-016/A-019.

---

<<<SECTION5>>>

---

## 6. Alur E2E per role (Bagian 4)

Perintah: `node docs/audit-fitur/run.js flow` → `results/flow.json`. Total **30 skenario**: 18 Jalan, 4 Rusak, 6 Tidak ada, 2 PALSU.

### 6.1 Mahasiswa / publik

| ID | Skenario | Hasil | Status | Bukti |
|---|---|---|---|---|
| F-01 | Daftar dengan KTM 300 KB | 201; DB `pending`; KTM 300.023 char tersimpan | Jalan | `POST /api/register` + `SELECT mahasiswa` |
| F-02 | Login akun baru | 200 + token | Jalan | `POST /api/login` |
| F-03 | Unggah ulang KTM dari status verifikasi | 400 `ktm maksimal 500 karakter` | **Rusak** | A-014; `auth.js:93` |
| F-04 | Admin tolak lalu setujui; mahasiswa lihat status | 200/200; `/saya` & DB `terverifikasi` | Jalan | `PATCH /api/mahasiswa/:id/verifikasi` + `/saya` |
| F-05 | Beranda: semua, cari nama, filter kategori, detail | semua=33; cari=1 (cocok); kategori=25; detail=200 | Jalan | `GET /api/barang` |
| F-06 | Klik chip filter di beranda | daftar berubah | Jalan | `results/ui-clicks.json` halaman beranda |
| F-07 | Sewa 3 hari @Rp5.000 | total 15.000; selesai 2026-11-05; barang `disewa` | Jalan | `POST /api/transaksi` |
| F-08 | Deposit sewa | tidak ada field/perhitungan deposit | **Tidak ada** | skema `src/db.js:39-49`; `status-sewa.js` |
| F-09 | Selesaikan sewa | 200; poin 1 (15.000/10.000); barang `tersedia` | Jalan | `PATCH .../selesai` + `SELECT poin` |
| F-10 | Beli Rp90.000 | 201; total 90.000; barang `terjual` | Jalan | `POST /api/transaksi` |
| F-11 | Batalkan pembelian | 200; barang `tersedia` | Jalan | `PATCH .../batal` |
| F-12 | Pinjam 2 hari (harga 0) | 201; total 0; barang `dipinjam` | Jalan | `POST /api/transaksi` |
| F-13 | Selesaikan pinjam | 200; poin 20 | Jalan | `PATCH .../selesai` |
| F-14 | Estimasi acuan 1.000.000 kondisi baik | 200; 800.000; DB sama | Jalan | `POST /api/estimasi` |
| F-15 | Unggah produk 3 mode | tersimpan; foto maks 3; lokasi tersimpan | Jalan | B-012..B-014 |
| F-25 | C menyewa barang A; cek `/saya` C | transaksi muncul | Jalan | `GET /api/saya` |
| F-28 | Poin akun vs jumlah tabel poin | API 21 = DB 21 | Jalan | `/saya` + `SUM(poin)` |
| F-30 | Logout lalu pakai token lama | logout 200; token lama tetap 200 | **Rusak** | `POST /api/logout` (`auth.js:62`) |

### 6.2 Pemilik kos

| ID | Skenario | Hasil | Status | Bukti |
|---|---|---|---|---|
| F-16 | Buat kos → cari (q) → detail | 201; hasil 1; detail 200 | Jalan | `POST/GET /api/kos` |
| F-17 | Buka dashboard (`GET /api/kos/miliku`) | 400 `id_kos harus bilangan bulat > 0` | **Rusak** | `kos.js:22,53` |
| F-18 | Tutup/buka kos (PATCH status saja) | 400 `nama_kos harus teks` | **Rusak** | `kos.js:75` |
| F-19 | Hapus kos via API | 200 | Jalan | `DELETE /api/kos/:id` |
| F-20 | Kelola penyewa & pengajuan sewa | tidak ada tabel/endpoint/UI | **Tidak ada** | `src/db.js:64-73`; `kos-owner.html` |
| F-21 | Verifikasi kos oleh admin | tidak ada kolom/endpoint | **Tidak ada** | `src/routes/kos.js`; `admin.html` |
| F-26 | Penjual melihat pesanan/penyewa masuk | transaksi tidak terlihat di akun penjual; tidak ada dashboard pesanan | **Tidak ada** | `GET /api/saya` hanya transaksi sebagai penyewa |

### 6.3 Admin & lintas role

| ID | Skenario | Hasil | Status | Bukti |
|---|---|---|---|---|
| F-22 | Dashboard admin (transaksi + mahasiswa) | 200/24 dan 200/16 | Jalan | `GET /api/transaksi`, `/api/mahasiswa` |
| F-23 | Moderasi produk | tidak ada status moderasi/endpoint/UI | **Tidak ada** | `src/db.js:24-38`; `admin.html` |
| F-24 | Atur nilai/toggle Green Point | hardcode `config.js` + `transaksi.js:98-105` | **Tidak ada** | `src/config.js:8`; `admin.html` |
| F-27 | Chat antar pengguna | hanya localStorage; tidak ada route chat | **PALSU** | `public/js/chat.js:3,81-96` |
| F-29 | Lencana sesuai capaian | lencana statis, tanpa perhitungan | **PALSU** | `public/profil.html` + `profil.js` |

### 6.4 Kesimpulan alur

- Alur transaksi barang (sewa/beli/pinjam → selesai/batal → poin) **utuh dan konsisten** antara API, DB, dan aturan poin (kecuali deposit yang memang tidak ada).
- Alur kos **terputus di sisi pemilik**: data bisa dibuat lewat API, tetapi tidak bisa dikelola dari UI/dashboard.
- Enam fitur yang tampil di desain tidak memiliki backend; dua di antaranya (chat, lencana) berjalan sebagai mockup dan harus ditandai "PALSU/MOCKUP" sebelum demo.

---

## 7. Keamanan dasar (Bagian 6)

Perintah: `node docs/audit-fitur/run.js security` → `results/security.json`. Total **22 tes**: 19 OK, 2 BUG, 1 TIDAK AMAN.

| ID | Kategori | Uji | Hasil | Status | Bukti |
|---|---|---|---|---|---|
| S-01 | password | Format hash di DB | 161 char, format scrypt, tidak memuat teks password | OK | `src/auth.js:6-9` |
| S-02 | password | Panjang minimal | `short` → 400; `AuditPass123` diterima | OK | `auth.js:24-29` |
| S-03 | token | Struktur & kedaluwarsa | 3 bagian; 24 jam; tamper → 401; kedaluwarsa → 401 | OK | `auth.js:20-28` |
| S-04 | cookie | Flag cookie sesi | HttpOnly ✔, SameSite=Strict ✔, Secure hanya production | OK | `auth.js:10-16` |
| S-05 | secret | Sumber SECRET/ADMIN_KEY | dari env; fallback SECRET acak | OK | `src/config.js:3-4` |
| S-06 | header | Header keamanan | CSP, XCTO, XFO, Referrer-Policy, Permissions-Policy, COOP, CORP ada | OK | `src/server.js:29-41` |
| S-07 | CORS | Origin asing | tidak ada ACAO | OK | `GET /api/barang` + Origin asing |
| S-08 | CORS | Preflight | tidak ada ACAO | OK | `OPTIONS /api/barang` |
| S-09 | CSRF | POST Origin asing | 403 `origin tidak diizinkan` | OK | `src/server.js:48-59` |
| S-10 | rate limit | 12 login gagal | 10×401 lalu 429; `Retry-After: 900` | OK | `src/limit.js`; port 3100 |
| S-11 | rate limit | Kuota admin | 120/15 menit (tidak dikunci saat audit) | OK | `src/server.js:62-64` |
| S-12 | upload | KTM bukan gambar | **201** (string biasa diterima) | **BUG** | `auth.js:36` tidak memvalidasi MIME/data URL |
| S-13 | upload | KTM 900 KB | 400 `maksimal 800000 karakter` | OK | `auth.js:36` |
| S-14 | upload | Foto `javascript:alert(1)` | **201** (tersimpan; dirender `<img src>`) | **BUG** | `POST /api/barang`; `unggah.js` |
| S-15 | upload | Multipart/nama file | tidak ada multipart; nama file tidak dipakai | OK | `verifikasi.js:227-231` |
| S-16 | SQLi | `q`/`kategori`/`kos?q` | semua diperlakukan teks; kategori non-angka 400; tidak ada dump | OK | prepared statement `barang.js:86-90`, `kos.js:12-18` |
| S-17 | XSS | Nama barang berisi `<img onerror>` di beranda | flag 0, 0 elemen tersuntik, tampil sebagai teks | OK | `beranda.js:218-235` (`escHtml`) |
| S-18 | XSS | Detail barang XSS | flag 0, 0 elemen tersuntik | OK | `detail.js:196-201` |
| S-19 | XSS | Pesan chat berisi HTML | flag 0, tampil sebagai teks | OK | `chat.js:145-165` |
| S-20 | IDOR | Buat barang atas nama penjual lain | **201**; tersimpan atas nama penjual A | **TIDAK AMAN** | `barang.js:31`; B-015 |
| S-21 | kebocoran | `password_hash` di respons | tidak ada di `/saya` maupun `/mahasiswa` | OK | A-009/A-017 |
| S-22 | IDOR | Selesaikan transaksi orang lain | 404 | OK | C-012 |

Catatan penting:

- **CSP adalah pedang bermata dua.** Kebijakan `script-src 'self'` berhasil menahan XSS inline, tetapi juga mematikan seluruh handler inline yang menjadi tulang punggung navigasi di halaman lama (lihat Bagian 5). Perbaikan yang benar: pindahkan handler ke `public/js/*`, bukan melonggarkan CSP.
- `Secure` pada cookie hanya aktif bila `NODE_ENV=production`; server uji tidak memakai HTTPS, jadi ini bukan temuan.
- Token tidak dapat dicabut (F-30). Bila ingin logout benar-benar mematikan sesi, perlu daftar token/versi sesi di DB.
- S-12/S-14 berstatus BUG (validasi input), bukan celah eksekusi: `<img src="javascript:...">` tidak menjalankan skrip di browser modern, tetapi data non-gambar tetap masuk DB dan dapat merusak tampilan.

---

## 8. Kualitas kode & tes bawaan (Bagian 7) + rekap

Perintah: `node docs/audit-fitur/run.js quality` → `results/quality.json`, log `results/npm-test.log`. Total **13 tes**: 4 OK, 8 BUG, 1 tidak terverifikasi.

### 8.1 Tes bawaan

- `npm test` ( `node test/api.test.js` ) → exit 0, keluaran `semua cek lolos`. Lulus, tetapi:
  - Berjalan di `DB=:memory:` dan hanya menguji sebagian kontrak (login, header, beberapa endpoint).
  - **Tidak menangkap 8 bug API** yang ditemukan runner audit (A-014, B-004, B-015, E-003/4/5, E-011, F-007) — artinya cakupan tes bawaan belum menjaga regresi fitur yang diaudit.
- Tidak ada script `lint`/`format` di `package.json` → kualitas statis tidak terjaga otomatis.

### 8.2 Temuan kualitas

| ID | Uji | Hasil | Status | Bukti |
|---|---|---|---|---|
| Q-01 | `npm test` | exit 0; `semua cek lolos` | OK | `results/npm-test.log` |
| Q-02 | Script lint | tidak ada | Tidak terverifikasi | `package.json` |
| Q-03 | TODO/FIXME | tidak ada | OK | grep `src/` + `public/` |
| Q-04 | `console.log/warn/error` tertinggal | 9 baris (mis. `src/db.js:137`, `src/server.js:77,83`) | BUG | `results/quality.json` Q-04 |
| Q-05 | `getElementById` tanpa ID di HTML | 22 kandidat (slider harga/jarak, `chipMode`, `sortDrop`, dll.) | BUG | `cari.js:231-241` vs `cari.html` |
| Q-06 | Method `KM` tidak diekspor | `kos-owner.js: KM.delete` | BUG | `public/js/api.js:126-131` |
| Q-07 | Halaman identik | `index.html = welcome.html` | BUG | SHA-256 sama |
| Q-08 | Folder `legacy/` dilayani? | 404 | OK | `GET /legacy/index.html` |
| Q-09 | Tautan `/estimasi.html` | 404 (file tidak ada) | BUG | `public/js/api.js:99` |
| Q-10 | `daftar.html` ditautkan? | tidak ada tautan | BUG | grep seluruh `public/` |
| Q-11 | Aktivitas profil | `&& false` → daftar transaksi tidak pernah dirender | BUG | `public/js/profil.js:83` |
| Q-12 | Hardcode status sewa | `KC-261027`; fallback 25 poin | BUG | `public/js/status-sewa.js:71,114-116` |
| Q-13 | Dependensi | hanya `express`, dipakai | OK | `package.json` |

Temuan kualitas tambahan (dari pembacaan kode, bukan tes otomatis):

- `cari.js` memasang **dua listener** untuk `#filterApplyBtn` dan `#filterResetBtn` (baris 452/531 dan 456/501) → aksi filter dijalankan dua kali.
- `cari.js` masih memuat kontrol desain lama (slider harga/jarak, toggle verifikasi, `chipMode`, `sortDrop`) yang tidak ada di `cari.html`; sebagian besar dijaga `if`, tetapi tombol sort tidak melakukan apa pun (dropdown tidak ada).
- `profil.js` memakai fallback angka statis (`350` poin, statistik bawaan) saat data 0/kosong; `green-point.html` menyimpan modal riwayat hardcode.
- `unggah.js`/`verifikasi.js` mengompresi gambar di browser; server hanya membatasi panjang string, tidak memvalidasi isi gambar.

### 8.3 Rekap hitungan akhir

| Rangkaian | Jumlah | Rincian |
|---|---|---|
| Tes API | 95 | 87 OK · 7 BUG · 1 TIDAK AMAN |
| Klik UI 390 px | <<<UI_TOTAL>>> | <<<UI_BREAKDOWN>>> |
| Alur E2E | 30 | 18 Jalan · 4 Rusak · 6 Tidak ada · 2 PALSU |
| Keamanan | 22 | 19 OK · 2 BUG · 1 TIDAK AMAN |
| Kualitas | 13 | 4 OK · 8 BUG · 1 tidak terverifikasi |
| **Total pemeriksaan** | **<<<TOTAL_ALL>>>** | — |

- Temuan unik (setelah menggabungkan akar masalah yang sama): **<<<UNIQUE_TOTAL>>>** — terinci di tabel §5, §6, §7, §8.
- Fitur yang diuji lewat alur: **18 dari 30 skenario Jalan**; 4 Rusak; 6 tidak ada; 2 PALSU.
- Endpoint tanpa pengujian otomatis: **2 dari 27** — `PATCH /api/profil/foto` dan `DELETE /api/profil/foto` tidak dicakup runner (25 endpoint lain tersentuh minimal satu tes, termasuk endpoint yang sengaja 503).
- Halaman UI tersentuh klik: **20 dari 20** halaman + 4 halaman status berparameter.

**Kesimpulan akhir:** dari sisi API transaksi, fondasi aplikasi cukup sehat (22/22 tes transaksi OK, keamanan dasar 19/22 OK). Yang menghambat rilis adalah lapisan UI/navigasi (CSP vs handler inline), dashboard pemilik kos, satu celah impersonasi penjual, dan fitur-fitur mockup yang belum diberi label. Perbaiki empat area itu terlebih dahulu; sisanya bisa menyusul tanpa memblokir demo internal.

---

## Lampiran A — Cara mereproduksi

```powershell
cd C:\Project\kampus-market
node docs/audit-fitur/run.js api
node docs/audit-fitur/run.js ui
node docs/audit-fitur/run.js flow
node docs/audit-fitur/run.js security
node docs/audit-fitur/run.js quality
node docs/audit-fitur/summary.js
```

Server uji (dari salinan DB, bukan `app.db`):

```powershell
$env:DB='C:\Project\kampus-market\docs\audit-fitur\tmp\audit.db'
$env:ADMIN_KEY='<kunci uji>'
$env:SECRET='<rahasia uji>'
node src/server.js                      # :3100, rate limit aktif
$env:RATE_LIMIT_DISABLED='1'; $env:PORT='3101'; node src/server.js
```

## Lampiran B — Artefak bukti

| Artefak | Isi |
|---|---|
| `results/api.json` | 95 tes API (id, endpoint, expected, actual, status, evidence) |
| `results/ui-pages.json` | info tiap halaman: jumlah elemen, error console/log/exception, API 4xx/5xx |
| `results/ui-clicks.json` | satu baris per elemen yang diklik + hasil klasifikasi |
| `results/ui-load-errors.json` | halaman dengan error saat dimuat (termasuk pelanggaran CSP) |
| `results/ui-layout.json` | overflow horizontal & target sentuh <44 px pada 360/390/430 px |
| `results/flow.json` | 30 skenario E2E per role |
| `results/security.json` | 22 tes keamanan dasar |
| `results/quality.json` | 13 tes kualitas + `results/npm-test.log` |
| `evidence/ui-*.png` | screenshot elemen yang tidak berfungsi (hanya yang bermasalah) |
| `tmp/audit.db`, `tmp/audit.db.orig` | salinan database uji + snapshot awal |
