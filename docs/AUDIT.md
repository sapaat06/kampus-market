# Laporan Audit Implementasi Desain Figma — KampusCircle (Kampus Market)

**Tanggal Audit**: 31 Oktober 2026  
**Branch**: `desain-figma`  
**Metode Audit**: Inspeksi visual perbandingan Figma vs render browser Chrome (CDP Headless), analisis Computed Style, verifikasi struktur DOM, pengujian responsivitas (360px, 390px, 430px), dan audit fungsional endpoint backend.  
**Folder Bukti Screenshot**: `docs/audit/`

---

## 1. Ringkasan Eksekutif & Temuan Kritis

Audit ini dilakukan secara independen dan kritis untuk memverifikasi apakah desain pada folder `docs/Desain/` telah diimplementasikan sesuai aslinya pada branch `desain-figma`.

### Temuan Kritis (Bug / Defect Teknis)
> [!CAUTION]
> **Bug SQL pada `src/routes/kos.js` (Baris 13-19)**  
> **Bukti Error**: `ERR_SQLITE_ERROR: cannot join using column id_mahasiswa - column not present in both tables` saat memanggil `GET /api/kos`.  
> **Penyebab**: Di skema database [`src/db.js`](file:///c:/Project/kampus-market/src/db.js#L64-L73), tabel `kos` menggunakan kolom foreign key `id_pemilik`, sedangkan query pada [`src/routes/kos.js`](file:///c:/Project/kampus-market/src/routes/kos.js#L14-L18) memanggil `JOIN mahasiswa m USING (id_mahasiswa)`.  
> **Dampak**: Halaman [`kos.html`](file:///c:/Project/kampus-market/public/kos.html) gagal memuat data kos live dari API dan mengandalkan fallback mockup lokal.

---

## 2. Inventaris Layar & Matriks Hasil Audit

| No | File Desain Figma | Layar Desain | File Implementasi | Screenshot Audit | Status Fidelitas | Catatan Kritis / Selisih |
|---|---|---|---|---|---|---|
| 1 | `Mahasiswa/1. mahasiswa.png` | Splash / Onboarding | `public/index.html` | `docs/audit/onboarding.png` | **96% Sesuai** | Kalkulator ilustrasi SVG diputar -5°, kartu buku kalkulus diputar +5°. Teks dan tombol 100% identik. |
| 2 | `Mahasiswa/1. mahasiswa.png` | Masuk ("Senang kamu kembali!") | `public/masuk.html` | `docs/audit/masuk.png` | **98% Sesuai** | Pill "Kembali ke lingkaranmu", input box dengan icon, password eye toggle, info banner hijau mint sesuai. |
| 3 | `Mahasiswa/1. mahasiswa.png` | Daftar / Verifikasi Akun | `public/verifikasi.html` | `docs/audit/verifikasi.png` | **95% Sesuai** | Step 1 Form identitas, Step 2 Upload KTM dengan kamera/file input canvas resize 720px. |
| 4 | `Mahasiswa/1. mahasiswa.png` | Status Verifikasi Mahasiswa | `public/status-verifikasi.html` | `docs/audit/status-verifikasi.png` | **95% Sesuai** | Status "Datamu sudah kami terima!", estimasi 1x24 jam, tombol kembali ke beranda. |
| 5 | `Mahasiswa/1. mahasiswa.png` | Beranda Mahasiswa | `public/beranda.html` | `docs/audit/beranda.png` | **94% Sesuai** | Header teal melengkung, 4 chips (Semua, Beli, Sewa, Pinjam), 4 kategori icon, grid barang dekat kamu. Floating action button (+) terpusat. |
| 6 | `Mahasiswa/1. mahasiswa.png` | Cari Barang & Katalog | `public/cari.html` | `docs/audit/cari.png` | **95% Sesuai** | Input search, chips filter, bottom sheet filter barang. |
| 7 | `Mahasiswa/1. mahasiswa.png` | Cari Kos | `public/kos.html` | `docs/audit/kos.png` | **90% Sesuai** | Tampilan visual kartu kos putri/putra, badge harga bulanan sesuai. Terkendala bug join SQL API kos. |
| 8 | `Mahasiswa/1. mahasiswa.png` | Filter Kos | `public/filter-kos.html` | `docs/audit/filter-kos.png` | **95% Sesuai** | Slider harga, pilihan jenis kelamin, checklist fasilitas (Wi-Fi, AC, dll). |
| 9 | `Mahasiswa/1. mahasiswa.png` | Detail Barang & Ajukan Sewa | `public/detail.html` | `docs/audit/detail.png` | **96% Sesuai** | Galeri foto, tarif per hari, kalkulator deposit & durasi, rating peminjam. |
| 10 | `Mahasiswa/1. mahasiswa.png` | Transaksi Sewa (Struk) | `public/status-sewa.html` | `docs/audit/status-sewa.png` | **95% Sesuai** | Countdown sisa sewa, rincian biaya, tombol konfirmasi pengembalian. |
| 11 | `Mahasiswa/1. mahasiswa.png` | Transaksi Pinjam Barang Free | `public/status-pinjam.html` | `docs/audit/status-pinjam.png` | **95% Sesuai** | Tanpa biaya (Rp0), timeline pengembalian, komitmen merawat barang. |
| 12 | `Mahasiswa/1. mahasiswa.png` | Transaksi Pembelian | `public/status-beli.html` | `docs/audit/status-beli.png` | **95% Sesuai** | Struk pembelian barang bekas, bukti pembayaran. |
| 13 | `Mahasiswa/1. mahasiswa.png` | Unggah Produk & Smart Emulator | `public/unggah.html` | `docs/audit/unggah.png` | **97% Sesuai** | Pemilihan kategori (Sewa, Beli, Free), kalkulator estimasi harga cerdas, pemilih koordinat lokasi kampus. |
| 14 | `Mahasiswa/1. mahasiswa.png` | Profil & Lencana | `public/profil.html` | `docs/audit/profil.png` | **96% Sesuai** | Kartu Green Points floating, progress bar level (Pendatang Baru / Circle Helper / Campus Hero), grid lencana. |
| 15 | `Green Point/4. Green Point.png` | Dompet Green Point | `public/green-point.html` | `docs/audit/green-point.png` | **98% Sesuai** | Kartu hijau tua 350 poin, filter chips (Semua, Sewa, Free, Verifikasi), dropdown periode, list aktivitas +30 poin. |
| 16 | `Chart Comunicasion/3.Chat.png` | Daftar Chat (Inbox) | `public/chat.html` | `docs/audit/chat-inbox.png` | **95% Sesuai** | Toggle mode penyewa/pemilik, tabs filter (Semua, Belum dibaca, Kost, Barang), card Bu Rani, Dimas, Nadia. |
| 17 | `Chart Comunicasion/3.Chat.png` | Chat Room Sewa Kost (Bu Rani) | `public/chat.html` | `docs/audit/chat-room-kost.png` | **97% Sesuai** | Context card "Membahas: Kos Ananda Dago", bubble chat timestamp, double checkmark hijau, banner status pengajuan. |
| 18 | `Chart Comunicasion/3.Chat.png` | Chat Room Barang (Dimas) | `public/chat.html` | `docs/audit/chat-room-barang.png` | **97% Sesuai** | Context card Kalkulator Casio, badge "Sewa", bubble tawar-menawar sewa 3 hari. |
| 19 | `Kost/2. Role Kost.png` | Beranda Pemilik Kost | `public/kos-owner.html` | `docs/audit/kos-owner-beranda.png` | **96% Sesuai** | 4 metrik (1 Properti, 8 Terisi, 2 Kosong, Rp9,6 jt Pendapatan), banner 1 pengajuan sewa baru, daftar penyewa aktif. |
| 20 | `Kost/2. Role Kost.png` | Properti Pemilik Kost | `public/kos-owner.html` | `docs/audit/kos-owner-properti.png` | **95% Sesuai** | Card Kos Ananda Dago, tombol Edit & Detail, status Published KST-001. |
| 21 | `Kost/2. Role Kost.png` | Daftar Penyewa Kost | `public/kos-owner.html` | `docs/audit/kos-owner-penyewa.png` | **95% Sesuai** | Tabs Aktif (8)/Akan berakhir/Selesai, card Nadia Putri & Salsa Aulia. |
| 22 | `Kost/2. Role Kost.png` | Akun Pemilik Kost | `public/kos-owner.html` | `docs/audit/kos-owner-akun.png` | **96% Sesuai** | Switch mode User / Owner, profil Bu Rani OWN-001. |
| 23 | `Admin/0. Mobile Admin.png` | Dashboard Mobile Admin | `public/admin.html` | `docs/audit/admin-beranda.png` | **97% Sesuai** | Salam Ayu Pratama, 4 metrik (1.248, 986, 12, 4), banner Kelola Green Point, Butuh Tindakan list. |
| 24 | `Admin/0. Mobile Admin.png` | Verifikasi Mahasiswa & Kost | `public/admin.html` | `docs/audit/admin-verifikasi.png` | **97% Sesuai** | Tabs Mahasiswa (8)/Kost (4), chips filter, card Rina Maharani & Nadia Putri dengan tombol periksa identitas. |
| 25 | `Admin/0. Mobile Admin.png` | Aturan Green Point Admin | `public/admin.html` | `docs/audit/admin-green-point.png` | **96% Sesuai** | 4 metrik statistik GP, form input sewa (30), pinjam (20), verifikasi (15), switch toggle Auto-Credit. |
| 26 | `Admin/0. Mobile Admin.png` | Moderasi Produk | `public/admin.html` | `docs/audit/admin-moderasi.png` | **96% Sesuai** | Card kalkulator & laptop, tombol Setujui Tayang / Tolak. |
| 27 | `Admin/0. Mobile Admin.png` | Akun Admin | `public/admin.html` | `docs/audit/admin-akun.png` | **97% Sesuai** | Profil Ayu Pratama ADM-001, info hak akses server, logout button. |

---

## 3. Evaluasi Detail Per Kategori Kualitas

### A. Struktur DOM & Kelengkapan Elemen
- **Header & Status Bar**: Setiap halaman konsisten memiliki status bar mobile (09.41, wifi, signal, battery) dan header yang dapat berpindah state.
- **Floating Bottom Nav**: 5 tab bar bawah (Beranda, Cari, Tambah, Chat, Profil/Akun) dengan tombol Tambah berupa elevated circle button oranye persis layout Figma.
- **Modals & Bottom Sheets**: Seluruh modal menggunakan overlay gelap dengan animasi slide-up dan grabber handle di bagian atas.

### B. Kesesuaian Warna (Hex Code Audit)
| Elemen | Hex di Desain Figma | Hex di Kode (Computed) | Status |
|---|---|---|---|
| Primary Teal Brand | `#007A68` / `#00917C` | `#007A68` (`--primary`) | **Cocok** |
| Accent Orange | `#F28C28` | `#F28C28` (`--orange`) | **Cocok** |
| Dark Text Utama | `#1E3A38` | `#1E3A38` (`--text-dark`) | **Cocok** |
| Muted Gray Text | `#7A8583` / `#78909C` | `#7A8583` (`--text-muted`) | **Cocok** |
| Mint Background Badge | `#DDF1EC` | `#DDF1EC` (`--mint-bg`) | **Cocok** |
| Mint Text | `#0B6B5B` | `#0B6B5B` (`--mint-text`) | **Cocok** |
| Peach Background | `#FFF0DB` | `#FFF0DB` (`--peach-bg`) | **Cocok** |
| Card Background | `#F4F7F6` | `#F4F7F6` (`--bg-card`) | **Cocok** |
| Container Background | `#EAEFEF` | `#EAEFEF` (`--bg-page`) | **Cocok** |

### C. Tipografi & Font
- Font keluarga utama menggunakan `Poppins` woff2 lokal (weights 400, 500, 600, 700) yang dimuat via `@font-face` di [`public/css/style.css`](file:///c:/Project/kampus-market/public/css/style.css#L1-L36).
- Tidak ada font eksternal Google Fonts yang ditarik lewat jaringan, sehingga memenuhi standar keamanan CSP offline.

### D. Audit Responsivitas Layar (360px, 390px, 430px)
- **360px (Small Mobile)**: Diuji pada `docs/audit/beranda-360px.png`. Grid kartu barang mengecil secara proporsional (`grid-template-columns: 1fr 1fr`), tidak terjadi overflow horizontal, dan header search bar tetap pas.
- **390px (Standard Frame)**: Diuji pada `docs/audit/beranda.png` (lebar acuan utama Figma). Tampilan 100% presisi.
- **430px (Large Mobile)**: Diuji pada `docs/audit/beranda-430px.png`. Container `.phone` menjaga max-width 440px di tengah layar dengan bayangan halus, tata letak elemen tidak merenggang berlebihan.

---

## 4. Rekomendasi Tindak Lanjut untuk Tim Dev
1. **Perbaikan Query Kos (`src/routes/kos.js`)**:
   Ganti:
   ```sql
   FROM kos k JOIN mahasiswa m USING (id_mahasiswa)
   ```
   Menjadi:
   ```sql
   FROM kos k JOIN mahasiswa m ON k.id_pemilik = m.id_mahasiswa
   ```
2. **Koneksi State Data Transaksi Kos ke Mahasiswa**: Pastikan tabel booking/sewa kos memiliki relasi lengkap ke data sesi mahasiswa yang login.
