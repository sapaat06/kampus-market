# Laporan Diagnosis Tampilan Role Mahasiswa

**Tanggal**: 31 Oktober 2026  
**Branch**: `desain-figma`  
**Metode**: Audit screenshot 390px headless Edge (cache disabled), penelusuran resource DOM (`<link>`, `<style>`, `<script>`), penelusuran rute Express & redirect JavaScript.

---

## 1. Temuan Utama (Root Cause)

1. **Mayoritas Layar Tidak Memuat Tema Global (`/css/style.css`)**:
   Dari 17 file HTML role mahasiswa, sebanyak **15 halaman** sama sekali tidak memuat `<link rel="stylesheet" href="/css/style.css">`. Seluruh styling ditulis menggunakan tag `<style>` inline yang membawa style warisan (legacy) dengan font `Segoe UI` (bukan `Poppins`), variabel warna tidak seragam, dan tata letak tidak akurat dengan Figma.
2. **Duplikasi Halaman Onboarding (`index.html` vs `welcome.html`)**:
   `public/welcome.html` adalah duplikasi dari `public/index.html`. Tombol kembali pada `masuk.js` dan `verifikasi.js` masih mengarah ke `/welcome.html`, menciptakan inkonsistensi navigasi.
3. **Markup & Aset Ilustrasi Tidak Sesuai Figma**:
   Sebagai contoh, pada onboarding, desain Figma memiliki ilustrasi vektor dua mahasiswa di bangku membaca buku & kalkulator dengan logo KampusCircle resmi dan 3 kartu layanan ("Beli", "Sewa", "Pinjam"). Namun kode lama menggambarkannya dengan blok SVG kalkulator miring -5° dan buku kalkulus yang tidak ada di desain Figma.
4. **JS Template Re-rendering Lewat `innerHTML`**:
   Script seperti `beranda.js`, `cari.js`, `detail.js`, dan `profil.js` me-render ulang kartu barang dan transaksi menggunakan string template lama dengan class dan susunan yang tidak mengikuti komponen desain baru.

---

## 2. Tabel Diagnosis Layar Mahasiswa

| No | Halaman | Dilayani Dari | Gaya yang Dipakai | Urutan Resource Dimuat | Penyebab Tampilan Masih Desain Lama | Rencana Tindakan |
|---|---|---|---|---|---|---|
| 1 | `index.html` | `/` (Static) | Lama (Inline `<style>`) | `<script src="/js/api.js">` | Tidak memuat `/css/style.css`, font `Segoe UI`, ilustrasi kalkulator SVG palsu | Hubungkan `/css/style.css`, ganti markup & style sesuai Figma Splash/Onboarding |
| 2 | `welcome.html` | `/welcome.html` | Lama (Inline `<style>`) | `<script src="/js/api.js">` | Duplikat persis `index.html`, tidak sinkron | Samakan dengan `index.html` atau alihkan ke `/` |
| 3 | `masuk.html` | `/masuk.html` | Lama (Inline `<style>`) | `/js/api.js`, `/js/masuk.js` | Tidak memuat `/css/style.css`, margin, radius, banner dan tombol beda spek | Pasang `/css/style.css`, sesuaikan komponen form, banner hijau mint, dan tombol Figma |
| 4 | `verifikasi.html` | `/verifikasi.html` | Lama (Inline `<style>`) | `/js/api.js`, `/js/verifikasi.js` | Tidak memuat `/css/style.css`, form "Kenalan dulu, yuk" belum presisi | Pasang `/css/style.css`, tata letak form pendaftaran & verifikasi KTM Figma |
| 5 | `status-verifikasi.html` | `/status-verifikasi.html` | Lama (Inline `<style>`) | `/js/api.js`, `/js/status-verifikasi.js` | Tidak memuat `/css/style.css`, badge & timeline status berbeda dari Figma | Pasang `/css/style.css`, ganti ilustrasi kartu status "Datamu sudah kami terima!" |
| 6 | `beranda.html` | `/beranda.html` | Lama (Inline `<style>`) | `/js/api.js`, `/js/beranda.js` | Tidak memuat `/css/style.css`, header lengkung teal, 2 search bar, 4 kategori & bottom nav tidak presisi | Pasang `/css/style.css`, rebuild header, chips, grid barang, dan floating bottom nav |
| 7 | `cari.html` | `/cari.html` | Lama (Inline `<style>`) | `/js/api.js`, `/js/cari.js` | Tidak memuat `/css/style.css`, card list horizontal barang dan filter modal berbeda | Pasang `/css/style.css`, rebuild card horizontal, chips filter, bottom sheet filter |
| 8 | `filter-kos.html` | `/filter-kos.html` | Lama (Inline `<style>`) | `/js/api.js`, `/js/filter-kos.js` | Tidak memuat `/css/style.css`, slider range & checklist fasilitas beda token | Pasang `/css/style.css`, samakan token dan styling form filter kos |
| 9 | `kos.html` | `/kos.html` | Lama (Inline `<style>`) | `/js/api.js`, `/js/kos.js` | Tidak memuat `/css/style.css`, kartu kos dan thumbnail visual belum presisi | Pasang `/css/style.css`, implementasikan card kos dengan foto asli dan badge Figma |
| 10 | `detail.html` | `/detail.html` | Lama (Inline `<style>`) | `/js/api.js`, `/js/detail.js` | Tidak memuat `/css/style.css`, 3 mode transaksi (Sewa, Pinjam Free, Beli) dan kos tidak presisi | Pasang `/css/style.css`, buat layout detail per mode sesuai gambar Figma |
| 11 | `status-sewa.html` | `/status-sewa.html` | Lama (Inline `<style>`) | `/js/api.js`, `/js/status-sewa.js` | Tidak memuat `/css/style.css`, timeline "Perjalanan sewamu" dan countdown belum presisi | Pasang `/css/style.css`, sesuaikan kartu struk sewa, status aktif & reminder kembali |
| 12 | `status-pinjam.html` | `/status-pinjam.html` | Lama (Inline `<style>`) | `/js/api.js`, `/js/status-pinjam.js` | Tidak memuat `/css/style.css`, card pinjam gratis belum presisi | Pasang `/css/style.css`, sesuaikan status pinjam gratis & timeline |
| 13 | `status-beli.html` | `/status-beli.html` | Lama (Inline `<style>`) | `/js/api.js`, `/js/status-beli.js` | Tidak memuat `/css/style.css`, struk transaksi pembelian beda tata letak | Pasang `/css/style.css`, rebuild struk pembelian & tombol "Beli Lagi" |
| 14 | `unggah.html` | `/unggah.html` | Lama (Inline `<style>`) | `/js/api.js`, `/js/unggah.js` | Tidak memuat `/css/style.css`, tabs 3 mode unggah, estimator cerdas & peta belum presisi | Pasang `/css/style.css`, sesuaikan form unggah (Sewa, Beli, Free), smart estimator & lokasi |
| 15 | `profil.html` | `/profil.html` | Lama (Inline `<style>`) | `/js/api.js`, `/js/profil.js` | Tidak memuat `/css/style.css`, kartu Green Point, 3 metrik, lencana & list aktivitas beda | Pasang `/css/style.css`, rebuild kartu GP, progress bar lencana, 3 metrik & aktivitas |
| 16 | `chat.html` | `/chat.html` | Campuran | `/css/style.css`, `/js/api.js`, `/js/chat.js` | Inline style menimpa CSS global; context card dan bubble chat belum 100% presisi | Rapikan styling dengan token global, sesuaikan mode penyewa/kos & room chat |
| 17 | `green-point.html` | `/green-point.html` | Campuran | `/css/style.css`, `/js/api.js`, `/js/green-point.js` | Inline style override; modal sheet penghargaan & detail aktivitas belum sinkron | Rapikan modal bottom sheet, riwayat aktivitas, dan empty state dompet |
