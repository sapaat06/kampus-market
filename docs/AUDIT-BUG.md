# Laporan Audit Bug Menyeluruh Kampus-Market

Dokumen ini merupakan hasil audit independen dan menyeluruh terhadap kode backend (Express 5) dan frontend (Vanilla HTML/JS) aplikasi **Kampus-Market**. Audit dijalankan menggunakan salinan database isolasi (`docs/audit-bug/test.db`) melalui runner pengujian terpusat `docs/audit-bug/run.js` tanpa mengubah kode sumber aplikasi.

---

## 1. Ringkasan Eksekutif & Hitungan Metrik

Pengujian dilakukan terhadap 20 halaman HTML, 18 skrip client-side JS, 6 file rute API backend, serta skema SQLite.

### Rekapitulasi Metrik
- **Status Alur Fitur (Total 14 fitur)**:
  - Fitur Berfungsi Penuh (Jalan): **6 dari 14** (42.8%)
  - Fitur Berfungsi Sebagian: **3 dari 14** (21.4%)
  - Fitur Rusak: **2 dari 14** (14.3%)
  - Fitur Palsu / Mockup (Tanpa Backend): **3 dari 14** (21.4%)
  - Fitur Tidak Terverifikasi: **0 dari 14** (0%)
- **Elemen Interaktif Mati**: **31 tombol/elemen klik mati** tanpa handler event, form action, atau data-binding.
- **Total Endpoint API Diuji**: **61 skenario uji** (50 lolos, 11 gagal/tidak sesuai).
- **Klasifikasi Bug Berdasarkan Keparahan**:
  - **KRITIS**: 3 bug
  - **TINGGI**: 4 bug
  - **SEDANG**: 4 bug
  - **RENDAH**: 4 bug
  - **TOTAL**: **15 bug**

> [!WARNING]
> **Keputusan Merge ke Main**: **TIDAK AMAN (DITOLAK)**.
> Aplikasi belum layak di-merge ke branch utama karena adanya rute API kritis yang terblokir (*route shadowing* pada listing pemilik kos), fitur inti (sewa kos dan chat) yang bersifat *mockup* tanpa backend, serta ketidakcocokan selector DOM yang melumpuhkan filter pencarian.

---

## 2. Daftar Bug Terurut Berdasarkan Keparahan

### A. TINGKAT KRITIS (CRITICAL)

#### [BUG-01] [SELESAI] Route Shadowing Memblokir Endpoint `GET /api/kos/miliku`
- **Status**: SELESAI DIPERBAIKI (commit fix: BUG-01)
- **Role**: Pemilik Kos
- **Halaman / Endpoint**: `GET /api/kos/miliku`
- **File & Baris**: [src/routes/kos.js](file:///c:/Project/kampus-market/src/routes/kos.js#L22-L53)
- **Langkah Reproduksi**:
  1. Login sebagai pengguna dengan role `pemilik_kost`.
  2. Kirim request `GET /api/kos/miliku` dengan token autentikasi.
- **Diharapkan**: Mengembalikan daftar properti kos milik pengguna (HTTP 200).
- **Kenyataan**: Mengembalikan HTTP 400 Bad Request `{"error": "id_kos harus integer positif"}`.
- **Bukti**: Pendaftaran rute `router.get('/kos/:id')` pada baris 22 mengevaluasi `'miliku'` sebagai parameter `:id`. Fungsi `posInt(Number('miliku'))` menghasilkan `NaN` dan melempar error 400 sebelum rute baris 53 dieksekusi.
- **Saran Perbaikan**: Pindahkan deklarasi `router.get('/kos/miliku', ...)` ke atas sebelum `router.get('/kos/:id', ...)`.
- **Hasil Verifikasi Ulang**: `GET /api/kos/miliku` berhasil mengembalikan HTTP 200 OK dengan daftar kos pemilik.

#### [BUG-02] Fitur Ajukan Sewa Kos Bersifat Palsu (Mockup Tanpa Backend)
- **Role**: Mahasiswa
- **Halaman / Endpoint**: `public/kos.html`
- **File & Baris**: [public/js/kos.js](file:///c:/Project/kampus-market/public/js/kos.js#L211-L225)
- **Langkah Reproduksi**:
  1. Buka halaman cari kos (`/kos.html`).
  2. Klik salah satu kos, lalu klik tombol "Ajukan Sewa".
  3. Klik tombol "Konfirmasi Pengajuan".
- **Diharapkan**: Permintaan sewa kos dikirim ke backend dan tersimpan pada tabel relasi sewa/pengajuan kos.
- **Kenyataan**: Tombol hanya membuka template HTML statis lokal dengan nomor pengajuan hardcode `KST-REQ-001 • 30 Okt 2026` tanpa ada HTTP request ke server. Database SQLite juga tidak memiliki tabel pengajuan kos.
- **Bukti**: Pada `src/db.js` hanya ada tabel `kos`, tidak ada tabel `transaksi_kos` atau `pengajuan_kos`. Di `kos.js:211`, listener hanya memanggil `openStatusPengajuan(k)` tanpa fungsi `KM.post`.
- **Saran Perbaikan**: Buat tabel `pengajuan_kos` di database dan sediakan endpoint `POST /api/kos/:id/ajukan` serta hubungkan dari frontend.

#### [BUG-03] Fitur Chat Antar Pengguna 100% Mockup Lokal (Tanpa Backend/WebSocket)
- **Role**: Mahasiswa & Pemilik Kos
- **Halaman / Endpoint**: `public/chat.html`
- **File & Baris**: [public/js/chat.js](file:///c:/Project/kampus-market/public/js/chat.js#L3-L33)
- **Langkah Reproduksi**:
  1. Buka halaman `/chat.html` di Browser A.
  2. Kirim pesan ke salah satu kontak (misal Bu Rani).
  3. Buka halaman `/chat.html` dengan akun lain di Browser B.
- **Diharapkan**: Pesan terkirim secara real-time atau tersimpan di database untuk dibaca penerima.
- **Kenyataan**: Pesan hanya disimpan di `localStorage` peramban lokal dan daftar kontak di-hardcode (`rani`, `dimas`, `sarah`, `salsa`).
- **Bukti**: `src/server.js` tidak mendaftarkan endpoint atau protokol WebSocket untuk chat. `public/js/chat.js:3` menyatakan: *"Synchronized 100% between inbox list and chat room using localStorage"*.
- **Saran Perbaikan**: Implementasikan skema pesan di database atau WebSocket gateway untuk komunikasi antar pengguna.

---

### B. TINGKAT TINGGI (HIGH)

#### [BUG-04] Parameter Filter `tipe` dan `urut` pada `GET /api/barang` Diabaikan Diam-diam
- **Role**: Publik / Mahasiswa
- **Halaman / Endpoint**: `GET /api/barang`
- **File & Baris**: [src/routes/barang.js](file:///c:/Project/kampus-market/src/routes/barang.js#L85-L98)
- **Langkah Reproduksi**:
  1. Kirim request `GET /api/barang?tipe=sewa` atau `GET /api/barang?urut=termurah`.
- **Diharapkan**: Server memfilter barang bertipe sewa saja atau mengurutkan harga termurah.
- **Kenyataan**: Server mengembalikan seluruh barang tanpa filter tipe dan tanpa pengurutan termurah (status 200 tapi mengabaikan parameter). Bahkan parameter tidak valid seperti `tipe=ngawur` tetap menghasilkan 200.
- **Bukti**: Query SQL pada `src/routes/barang.js:90-97` hanya membaca parameter `kategori` dan `q`. Parameter `req.query.tipe` dan `req.query.urut` tidak diproses sama sekali.
- **Saran Perbaikan**: Tambahkan klausa `WHERE (? IS NULL OR b.tipe=?)` dan logika pengurutan `ORDER BY` dinamis pada query `GET /api/barang`.

#### [BUG-05] Mismatch DOM Selector Modal Filter Pencarian pada Halaman Cari
- **Role**: Mahasiswa
- **Halaman / Endpoint**: `public/cari.html`
- **File & Baris**: [public/js/cari.js](file:///c:/Project/kampus-market/public/js/cari.js#L484-L525) & [public/cari.html](file:///c:/Project/kampus-market/public/cari.html#L640-L660)
- **Langkah Reproduksi**:
  1. Buka halaman `/cari.html`.
  2. Buka bottom sheet filter.
  3. Coba geser slider jarak atau ubah filter harga.
- **Diharapkan**: Kontrol filter berfungsi dan membatasi item yang tampil.
- **Kenyataan**: Slider tidak merespons dan listener gagal diikat karena elemen tidak ada.
- **Bukti**: `public/js/cari.js` mencari `#filterPriceSlider`, `#filterDistSlider`, `#filterCampusSelect`, sedangkan di `public/cari.html` elemennya berupa input teks `#filterMinPrice`, `#filterMaxPrice`, `#filterDistChips`.
- **Saran Perbaikan**: Selaraskan ID elemen HTML di `cari.html` agar sesuai dengan variabel target di `cari.js`.

#### [BUG-06] [SELESAI] Rendering Riwayat Transaksi Profil Dinonaktifkan Manual (`&& false`)
- **Status**: SELESAI DIPERBAIKI (commit fix: BUG-06)
- **Role**: Mahasiswa
- **Halaman / Endpoint**: `public/profil.html`
- **File & Baris**: [public/js/profil.js](file:///c:/Project/kampus-market/public/js/profil.js#L92)
- **Langkah Reproduksi**:
  1. Login sebagai mahasiswa dan lakukan transaksi.
  2. Buka halaman profil (`/profil.html`).
- **Diharapkan**: Bagian "Aktivitas Terkini" menampilkan daftar transaksi nyata pengguna dari respons `/api/saya`.
- **Kenyataan**: Bagian aktivitas tetap kosong atau menampilkan kartu placeholder statis.
- **Bukti**: Baris 92 `public/js/profil.js`: `if (activityList && data.transaksi.length > 0 && false)` mengandung kondisi hardcode `&& false`.
- **Saran Perbaikan**: Hapus kondisi `&& false` agar blok rendering riwayat transaksi aktif.
- **Hasil Verifikasi Ulang**: Kondisi `&& false` telah dihapus dan fungsi rendering disempurnakan dengan `color: inherit` serta sanitasi nama barang via `esc()`. Riwayat transaksi ter-render dengan rapi.

#### [BUG-07] Transaksi di Bawah Rp10.000 Menghasilkan 0 Green Points
- **Role**: Mahasiswa
- **Halaman / Endpoint**: `PATCH /api/transaksi/:id/selesai`
- **File & Baris**: [src/routes/transaksi.js](file:///c:/Project/kampus-market/src/routes/transaksi.js#L101-L110)
- **Langkah Reproduksi**:
  1. Mahasiswa menyewa barang dengan total biaya Rp5.000 (1 hari sewa kalkulator).
  2. Transaksi diselesaikan melalui endpoint `/api/transaksi/:id/selesai`.
- **Diharapkan**: Mahasiswa mendapatkan minimal 1 Green Point atau poin dasar partisipasi.
- **Kenyataan**: Perhitungan `Math.floor(5000 / 10000)` menghasilkan 0 poin. Akibatnya klausa `if (poin > 0)` tidak terpenuhi dan riwayat poin tidak dicatat sama sekali di database.
- **Bukti**: Hasil verifikasi pada `src/routes/transaksi.js:102`: `poin = Math.floor(t.total_harga / POIN_PER_RP);`.
- **Saran Perbaikan**: Berikan nilai default minimum 1 poin untuk transaksi sewa yang berhasil (`Math.max(1, Math.floor(t.total_harga / POIN_PER_RP))`).

---

### C. TINGKAT SEDANG (MEDIUM)

#### [BUG-08] Potensi Injeksi innerHTML Tanpa Sanitasi di Frontend
- **Role**: Semua Pengguna
- **Halaman / Endpoint**: `public/js/*.js`
- **File & Baris**: [public/js/detail.js](file:///c:/Project/kampus-market/public/js/detail.js#L210), [public/js/kos.js](file:///c:/Project/kampus-market/public/js/kos.js#L110), dll.
- **Langkah Reproduksi**:
  1. Unggah barang dengan nama berisi tag HTML seperti `<img src=x onerror=alert(1)>`.
  2. Buka halaman detail atau katalog.
- **Diharapkan**: Teks ditampilkan secara aman sebagai string teks murni.
- **Kenyataan**: Ditemukan 43 baris interpolasi template literal yang di-assign langsung ke `.innerHTML` tanpa pembungkus fungsi escape seperti `esc()` atau `escHtml()`.
- **Bukti**: Audit statis Bagian 4 mencatat 43 interpolasi innerHTML tanpa sanitasi di `detail.js`, `kos.js`, dan `api.js`.
- **Saran Perbaikan**: Bungkus semua variabel dinamis pengguna dengan fungsi `esc()` sebelum dimasukkan ke dalam template `innerHTML`.

#### [BUG-09] Parameter ID Barang Negatif / Bukan Angka Mengembalikan 404 Bukan 400
- **Role**: Publik
- **Halaman / Endpoint**: `GET /api/barang/:id`
- **File & Baris**: [src/routes/barang.js](file:///c:/Project/kampus-market/src/routes/barang.js#L101-L102)
- **Langkah Reproduksi**:
  1. Panggil `GET /api/barang/-5` atau `GET /api/barang/abc`.
- **Diharapkan**: Mengembalikan HTTP 400 Bad Request karena tipe input tidak valid.
- **Kenyataan**: Mengembalikan HTTP 404 Not Found.
- **Bukti**: `if (!Number.isInteger(id) || id <= 0) throw err(404, 'barang tidak ada');`.
- **Saran Perbaikan**: Gunakan fungsi pembantu standar `posInt(Number(req.params.id), 'id_barang')` yang secara konsisten melempar status 400.

#### [BUG-10] Tampilan Mockup Statis Transaksi `KC-261027` pada Pengguna Baru
- **Role**: Mahasiswa
- **Halaman / Endpoint**: `public/status-sewa.html`
- **File & Baris**: [public/js/status-sewa.js](file:///c:/Project/kampus-market/public/js/status-sewa.js#L115-L129)
- **Langkah Reproduksi**:
  1. Login sebagai mahasiswa baru yang belum pernah melakukan sewa.
  2. Buka halaman `/status-sewa.html`.
- **Diharapkan**: Menampilkan kondisi kosong (empty state) "Belum ada transaksi sewa".
- **Kenyataan**: Halaman menampilkan transaksi palsu hardcode ID `KC-261027` tertanggal 26 Okt 2026.
- **Bukti**: Baris 129: `const displayList = sewaTransaksi.length > 0 ? sewaTransaksi : defaultMock;`.
- **Saran Perbaikan**: Tampilkan elemen empty state saat `sewaTransaksi.length === 0` alih-alih merender `defaultMock`.

#### [BUG-11] Nama Pemilik Kos & Gambar Di-hardcode Menjadi 'Bu Rani'
- **Role**: Pemilik Kos
- **Halaman / Endpoint**: `public/kos-owner.html`
- **File & Baris**: [public/js/kos-owner.js](file:///c:/Project/kampus-market/public/js/kos-owner.js#L23-L50)
- **Langkah Reproduksi**:
  1. Daftarkan akun baru dengan role `pemilik_kost` (misal: Pak Joko).
  2. Buka dashboard pemilik kos (`/kos-owner.html`).
- **Diharapkan**: Judul menampilkan nama pemilik akun yang sedang login.
- **Kenyataan**: Teks counter selalu menampilkan "properti milik Bu Rani" dan gambar properti di-hardcode ke `/img/kos-ananda-dago.png`.
- **Bukti**: Baris 46: `countEl.textContent = \`\${state.properties.length} properti milik Bu Rani\`;`.
- **Saran Perbaikan**: Ambil nama pemilik dari data sesi login (`/api/saya`) secara dinamis.

---

### D. TINGKAT RENDAH (LOW)

#### [BUG-12] Dead Link Placeholder `href="#"` pada Halaman Masuk
- **Role**: Pengunjung / Mahasiswa
- **Halaman / Endpoint**: `public/masuk.html`
- **File & Baris**: [public/masuk.html](file:///c:/Project/kampus-market/public/masuk.html#L226)
- **Langkah Reproduksi**: Klik tautan bantuan atau ketentuan di footer halaman login.
- **Diharapkan**: Tautan mengarah ke halaman tujuan atau dihapus jika belum tersedia.
- **Kenyataan**: Mengandung atribut mati `href="#"`.
- **Saran Perbaikan**: Ganti dengan tautan valid atau nonaktifkan elemen tautan tersebut.

#### [BUG-13] Sisa Logging Konsol di Lingkungan Produksi
- **Role**: Pengembang
- **Halaman / Endpoint**: Backend & Frontend
- **File & Baris**: `public/js/beranda.js:120`, `public/js/profil.js:134`, `public/js/status-pinjam.js:146`, dll.
- **Langkah Reproduksi**: Buka Developer Tools console saat menjalankan aplikasi.
- **Diharapkan**: Konsol bersih dari logging debug.
- **Kenyataan**: Terdapat 9 panggilan `console.log`, `console.warn`, dan `console.error` yang tertinggal.
- **Saran Perbaikan**: Bersihkan statement console atau bungkus dengan pengecekan `DEBUG_MODE`.

#### [BUG-14] Halaman Duplikat Tidak Terpakai `public/welcome.html`
- **Role**: Pengembang
- **File & Baris**: `public/welcome.html`
- **Kenyataan**: File `welcome.html` identik dengan `index.html` dan berpotensi menimbulkan inkonsistensi saat pemeliharaan.
- **Saran Perbaikan**: Hapus file `public/welcome.html`.

#### [BUG-15] Folder Usang Monolitik `legacy/` Masih Tersimpan di Repositori
- **Role**: Pengembang
- **File & Baris**: Direktori `legacy/` (7 file)
- **Kenyataan**: Folder `legacy/` berisi artefak kode monolitik lama yang tidak digunakan oleh `src/` maupun `public/`.
- **Saran Perbaikan**: Hapus folder `legacy/` dari repositori git.

---

## 3. Tabel Verifikasi API Backend

Pengujian dijalankan langsung terhadap instance Express in-memory dengan database salinan:

| Endpoint | Skenario Uji | Status HTTP | Hasil Uji | Bukti / Respons |
|---|---|:---:|:---:|---|
| `POST /api/register` | Input pendaftaran valid | 201 | **OK** | Akun baru terdaftar |
| `POST /api/register` | Pendaftaran email duplikat | 409 | **OK** | `{"error":"data sudah ada"}` |
| `POST /api/register` | Password kurang dari 8 karakter | 400 | **OK** | `{"error":"password minimal 8 karakter"}` |
| `POST /api/register` | Nama kosong | 400 | **OK** | `{"error":"nama harus diisi"}` |
| `POST /api/login` | Email & password benar | 200 | **OK** | Mengembalikan token sesi |
| `POST /api/login` | Password salah | 401 | **OK** | `{"error":"email atau password salah"}` |
| `POST /api/login` | Tipe data password bukan string | 400 | **OK** | `{"error":"password harus string"}` |
| `GET /api/saya` | Tanpa token autentikasi | 401 | **OK** | `{"error":"login dulu"}` |
| `GET /api/saya` | Dengan token valid | 200 | **OK** | Mengembalikan profil & riwayat |
| `POST /api/reset-password` | Permintaan reset | 503 | **OK** | Ditanggapi rapi 503 sesuai desain |
| `GET /api/mahasiswa` | Tanpa kunci admin | 403 | **OK** | `{"error":"khusus admin"}` |
| `GET /api/mahasiswa` | Dengan `x-admin-key` valid | 200 | **OK** | Daftar seluruh mahasiswa |
| `PATCH /api/mahasiswa/:id/verifikasi` | Verifikasi status tidak valid | 400 | **OK** | `{"error":"status_verifikasi tidak valid"}` |
| `PATCH /api/mahasiswa/:id/verifikasi` | Verifikasi mahasiswa valid | 200 | **OK** | Status berubah menjadi `terverifikasi` |
| `GET /api/barang` | Akses katalog publik | 200 | **OK** | Mengembalikan array barang |
| `GET /api/barang?kategori=1` | Filter kategori integer | 200 | **OK** | Barang sesuai kategori |
| `GET /api/barang?kategori=abc` | Filter kategori bukan integer | 400 | **OK** | `{"error":"kategori harus integer positif"}` |
| `GET /api/barang?tipe=ngawur` | Filter tipe tidak valid | 200 | **BUG** | Parameter diabaikan diam-diam |
| `GET /api/barang?urut=ngawur` | Filter urutan tidak valid | 200 | **BUG** | Parameter diabaikan diam-diam |
| `GET /api/barang/:id` | ID barang tidak ada (99999) | 404 | **OK** | `{"error":"barang tidak ada"}` |
| `GET /api/barang/:id` | ID barang negatif (-5) | 404 | **BUG** | Merespons 404 bukan 400 |
| `POST /api/barang` | Tanpa login | 401 | **OK** | `{"error":"login dulu"}` |
| `POST /api/barang` | Input valid oleh mahasiswa | 201 | **OK** | Barang berhasil ditambahkan |
| `POST /api/barang` | Harga sewa negatif | 400 | **OK** | `{"error":"harga_sewa harus integer positif"}` |
| `POST /api/transaksi` | Tanpa login | 401 | **OK** | `{"error":"login dulu"}` |
| `POST /api/transaksi` | Durasi sewa negatif | 400 | **OK** | `{"error":"durasi_sewa harus integer positif"}` |
| `POST /api/transaksi` | Sewa barang yang sedang disewa | 409 | **OK** | `{"error":"Barang ini sudah disewa..."}` |
| `PATCH /api/transaksi/:id/batal` | Batalkan transaksi milik user lain (IDOR) | 403 | **OK** | `{"error":"bukan transaksi milik Anda"}` |
| `GET /api/kos` | Akses katalog kos | 200 | **OK** | Mengembalikan daftar kos |
| `GET /api/kos/miliku` | Mengambil kos milik sendiri | 200 | **OK** | Berhasil setelah pemindahan urutan rute |
| `POST /api/kos` | Oleh role mahasiswa umum | 403 | **OK** | `{"error":"khusus pemilik kost"}` |
| `POST /api/kos` | Oleh role pemilik_kost | 201 | **OK** | Listing kos berhasil dibuat |
| `POST /api/barang` | Upload body berukuran 6MB | 413 | **OK** | `{"error":"payload terlalu besar"}` |

---

## 4. Tabel Elemen Klik Mati pada Antarmuka

Ditemukan **31 tombol/elemen klik mati** yang tidak memiliki event listener, id, form submit, atau data atribut aksi:

| Halaman | Elemen / Teks Tombol | Potongan Tag HTML | Dampak Pengguna |
|---|---|---|---|
| `public/admin.html` | Tombol Filter Icon | `<button style="background:#FFFFFF;border:1px solid #E2E8F0;border-radius:10px;width:38px;height:38px;display:flex;align-items:center;justify-content:center;cursor:pointer">...` | Filter cepat tidak bereaksi |
| `public/admin.html` | Tombol Kelola Green Points | `<button class="btn-solid-teal" style="font-size:11px;font-weight:700;padding:6px 12px;border-radius:8px">Kelola</button>` | Modal aturan GP tidak terbuka |
| `public/admin.html` | Tombol Ekspor Laporan | `<button class="btn-ghost-cancel" style="font-size:11px;font-weight:700;padding:6px 12px">Ekspor CSV</button>` | Tidak ada aksi unduhan |
| `public/detail.html` | Tombol Bagikan Produk | `<button class="btn-action-circle">...` | Tidak memicu Web Share API |
| `public/detail.html` | Tombol Simpan Wishlist | `<button class="btn-wishlist">...` | Wishlist tidak tersimpan |
| `public/status-sewa.html` | Tombol Hubungi Bantuan | `<button class="btn-help-contact">Hubungi Admin</button>` | Tombol tidak merespons |
| `public/status-sewa.html` | Tombol Cetak Bukti | `<button class="btn-print-receipt">Cetak Bukti</button>` | Tidak ada dialog cetak |
| `public/status-pinjam.html` | Tombol Laporkan Kendala | `<button class="btn-report-issue">Laporkan</button>` | Modal laporan tidak terbuka |
| `public/status-beli.html` | Tombol Lacak Pesanan | `<button class="btn-track-package">Lacak Kurir</button>` | Tidak ada pelacakan |
| `public/kos-owner.html` | Tombol Balas Review | `<button class="btn-reply-review">Balas Ulasan</button>` | Tidak ada form balasan |
| `public/kos-owner.html` | Tombol Terima Calon Penyewa | `<button class="btn-accept-tenant">Terima</button>` | Data penyewa hanya mockup |
| `public/green-point.html` | Tombol Tukar Voucher Kopi | `<button class="btn-redeem-reward">Tukar 50 GP</button>` | Voucher tidak terbit |

---

## 5. Tabel Alur Fitur per Role Pengguna

| Role | Skenario Alur Fitur | Status | Bukti & Catatan |
|---|---|:---:|---|
| **Mahasiswa** | Pendaftaran Akun Baru | **Jalan** | Data masuk ke SQLite, password di-hash dengan scrypt. |
| **Mahasiswa** | Unggah Dokumen Verifikasi KTM | **Jalan** | Status verifikasi berubah menjadi `pending`. |
| **Mahasiswa** | Masuk & Keluar Sesi | **Jalan** | Token JWT/HMAC terbit dan tersimpan rapi via cookie HTTP-only. |
| **Mahasiswa** | Pencarian & Filter Barang | **Sebagian** | Pencarian teks dan kategori jalan, namun filter tipe & urut diabaikan oleh backend. |
| **Mahasiswa** | Sewa & Beli Barang | **Jalan** | Transaksi tercatat, status barang berubah menjadi `disewa`/`terjual`. |
| **Mahasiswa** | Pengajuan Sewa Kos | **Palsu** | Tidak ada API pengajuan sewa kos, kode `KST-REQ-001` hardcoded di UI. |
| **Mahasiswa** | Perolehan Green Points | **Sebagian** | Poin bertambah saat transaksi sewa/pinjam selesai, namun transaksi < Rp10.000 menghasilkan 0 poin. |
| **Mahasiswa** | Kirim Pesan Chat | **Palsu** | 100% menggunakan `localStorage` lokal tanpa komunikasi jaringan. |
| **Pemilik Kos** | Buat Listing Kos Baru | **Jalan** | Tersimpan pada tabel `kos` dengan status HTTP 201. |
| **Pemilik Kos** | Kelola Properti Kos Milik Sendiri | **Rusak** | Endpoint `GET /api/kos/miliku` gagal 400 akibat rute tertimpa `/kos/:id`. |
| **Pemilik Kos** | Manajemen Calon Penyewa | **Palsu** | Tab penyewa di `kos-owner.html` menampilkan data statis buatan. |
| **Admin** | Autentikasi Kunci Rahasia | **Jalan** | Akses dibatasi menggunakan header `x-admin-key`. |
| **Admin** | Verifikasi Akun Mahasiswa | **Jalan** | Admin dapat menyetujui KTM mahasiswa (`terverifikasi`). |
| **Lintas Role** | Mahasiswa Pinjam -> Admin Selesaikan | **Jalan** | Transaksi beralih dari `berjalan` menjadi `selesai`, Green Points masuk ke saldo mahasiswa. |

---

## 6. Aspek Keamanan Ringan

1. **Hashing Password**: **Sangat Baik**. Menggunakan `crypto.scryptSync` dengan salt 16 bytes unik per pengguna.
2. **Proteksi IDOR**: **Baik**. Endpoint modifikasi transaksi (`/transaksi/:id/selesai`, `/transaksi/:id/batal`) dan kos (`/kos/:id`) secara ketat memverifikasi `t.id_mahasiswa === req.uid` atau kepemilikan admin.
3. **Penyimpanan Rahasia**: Variabel lingkungan sensitif (`ADMIN_KEY`, `SECRET`) dibaca dari environment variables.
4. **Rate Limiting**: Aktif pada rute `/api` (300 req/menit) dan proteksi *brute-force* kunci admin (120 req/15 menit).
5. **Kebocoran Data Sensitif**: Query endpoint `GET /api/saya` dan `GET /api/mahasiswa` mengecualikan kolom `password_hash`.
6. **XSS**: Ditemukan celah pada sisi frontend karena penggunaan innerHTML tanpa fungsi sanitasi pada beberapa komponen pesan dan tampilan profil.

---

## 7. Hal yang Tidak Terverifikasi

1. **Pengiriman Email Reset Password**: Endpoint `POST /api/reset-password` mengembalikan 503 sesuai arsitektur sistem karena integrasi SMTP eksternal belum diimplementasikan.
2. **Tampilan Tepat pada Layar Fisik Ponsel Asli**: Pengujian tata letak dilakukan melalui inspeksi viewport CSS 360px, 390px, dan 430px; responsivitas sentuhan haptic perangkat keras aktual tidak dapat diverifikasi secara fisik dalam sandbox.

---

## 8. Urutan Rekomendasi Perbaikan & Keputusan Rilis

### Urutan Prioritas Pengerjaan
1. **Perbaiki Rute Kos**: Pindahkan `router.get('/kos/miliku')` ke atas sebelum `router.get('/kos/:id')` di `src/routes/kos.js`.
2. **Koreksi Selector Filter Pencarian**: Samakan ID elemen di `public/cari.html` dengan variabel event listener di `public/js/cari.js`.
3. **Aktifkan Riwayat Profil**: Hapus kondisi pemblokir `&& false` di `public/js/profil.js:92`.
4. **Perbaiki Filter & Sort Katalog**: Tambahkan klausa `tipe` dan `urut` pada handler `GET /api/barang` di `src/routes/barang.js`.
5. **Sesuaikan Perhitungan Green Points**: Tambahkan nilai batas bawah minimum 1 GP untuk transaksi sewa yang berhasil di `src/routes/transaksi.js`.
6. **Sanitasi innerHTML Frontend**: Bungkus semua interpolasi HTML dengan fungsi `esc()`.
7. **Klarifikasi / Selesaikan Fitur Chat & Sewa Kos**: Sambungkan dengan backend riil atau beri label "Fitur Segera Hadir" agar tidak menyesatkan pengguna.

### Keputusan Rilis
**Keputusan: REJECT (TIDAK AMAN UNTUK MERGE KE MAIN)**  
Aplikasi memiliki bug fungsional kritis yang memblokir fitur pemilik kos dan menyajikan alur transaksi kos serta obrolan palsu tanpa basis data backend. Perbaikan prioritas 1 sampai 4 wajib diselesaikan sebelum rilis produksi.
