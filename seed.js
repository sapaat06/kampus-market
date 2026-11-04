// Isi data contoh untuk demo. Aman dijalankan ulang: berhenti kalau data sudah ada.
import { db, tx } from './src/db.js';
import { hash } from './src/auth.js';

const existingKategori = await db.prepare('SELECT COUNT(*) n FROM kategori').get();
if (existingKategori && existingKategori.n > 0) {
  console.log('Data sudah ada, seed dilewati.');
  process.exit(0);
}

const kategori = [
  ['Elektronik', 'Kalkulator, power bank, proyektor'],
  ['Buku & Diktat', 'Buku kuliah dan diktat'],
  ['Perabot Kos', 'Perlengkapan kamar kos'],
  ['Alat Lab', 'Jas lab dan perlengkapan praktikum'],
  ['Olahraga & Outdoor', 'Raket, matras, tenda'],
];
const penjual = [
  ['Koperasi Mahasiswa', 'koperasi@contoh.ac.id', '081200000001'],
  ['Rina (Alumni TI)', 'rina@contoh.ac.id', '081200000002'],
  ['Toko Kos Sejahtera', 'kos@contoh.ac.id', '081200000003'],
];
// [kategori, penjual, nama, deskripsi, sewa/hari, jual, kondisi]
const barang = [
  [1, 1, 'Kalkulator Casio fx-991EX', 'Boleh dipakai ujian, baterai baru.', 5000, 180000, 'baik'],
  [1, 2, 'Power Bank 20.000 mAh', 'Dua port USB, termasuk kabel.', 4000, 120000, 'baik'],
  [1, 1, 'Proyektor Mini', 'Cocok untuk presentasi kelompok.', 35000, null, 'cukup'],
  [2, 2, 'Diktat Kalkulus 1', 'Ada coretan rumus, lengkap sampai bab 8.', 3000, 45000, 'cukup'],
  [2, 2, 'Modul Kalkulus 2', '[Mode Pinjam Komunitas] Bebas dipinjam untuk persiapan kuis & UAS.', 1000, null, 'baik'],
  [2, 2, 'Buku Algoritma dan Struktur Data', 'Edisi terbaru, masih rapi.', 4000, 85000, 'baik'],
  [3, 3, 'Kipas Angin Meja', 'Tiga kecepatan, hemat listrik.', 6000, 90000, 'baik'],
  [3, 3, 'Rak Buku Lipat', 'Baru, belum pernah dirakit.', null, 75000, 'baru'],
  [4, 1, 'Jas Lab Putih (M)', 'Sudah dicuci, ukuran M.', 5000, 60000, 'baik'],
  [4, 1, 'Kacamata Safety', 'Anti gores, bebas pakai.', 2000, 25000, 'baru'],
  [5, 2, 'Raket Badminton', 'Senar baru diganti.', 7000, 110000, 'cukup'],
  [5, 3, 'Matras Yoga', 'Tebal 8 mm.', 4000, 70000, 'baik'],
  [5, 3, 'Tenda Camping 2 Orang', 'Lengkap pasak dan flysheet.', 25000, null, 'baik'],
];

await tx(async () => {
  const k = db.prepare('INSERT INTO kategori (nama_kategori,deskripsi) VALUES (?,?)');
  const p = db.prepare('INSERT INTO penjual (nama,email,no_hp) VALUES (?,?,?)');
  const b = db.prepare('INSERT INTO barang (id_kategori,id_penjual,nama_barang,deskripsi,harga_sewa,harga_jual,kondisi) VALUES (?,?,?,?,?,?,?)');
  for (const r of kategori) await k.run(...r);
  for (const r of penjual) await p.run(...r);
  for (const r of barang) await b.run(...r);
  await db.prepare('INSERT INTO mahasiswa (nama,email,no_hp,password_hash,status_verifikasi) VALUES (?,?,?,?,?)')
    .run('Mahasiswa Demo', 'demo@kampus.ac.id', '081234567890', hash('demo12345'), 'terverifikasi');
});

console.log(`Seed selesai: ${kategori.length} kategori, ${penjual.length} penjual, ${barang.length} barang.`);
console.log('Akun demo: demo@kampus.ac.id / demo12345');
