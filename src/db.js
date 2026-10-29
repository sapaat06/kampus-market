import { DatabaseSync } from 'node:sqlite';

export const db = new DatabaseSync(process.env.DB ?? 'app.db');

// STRICT menolak tipe data yang salah (mis. harga teks), jadi bug validasi
// tidak langsung menjadi data korup.
db.exec(`
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS mahasiswa (
  id_mahasiswa INTEGER PRIMARY KEY AUTOINCREMENT,
  nama TEXT NOT NULL, email TEXT NOT NULL COLLATE NOCASE UNIQUE, no_hp TEXT,
  password_hash TEXT NOT NULL, ktm TEXT,
  status_verifikasi TEXT NOT NULL DEFAULT 'pending' CHECK (status_verifikasi IN ('pending','terverifikasi','ditolak')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;
CREATE TABLE IF NOT EXISTS kategori (
  id_kategori INTEGER PRIMARY KEY AUTOINCREMENT,
  nama_kategori TEXT NOT NULL COLLATE NOCASE UNIQUE, deskripsi TEXT
) STRICT;
CREATE TABLE IF NOT EXISTS penjual (
  id_penjual INTEGER PRIMARY KEY AUTOINCREMENT,
  nama TEXT NOT NULL, email TEXT COLLATE NOCASE UNIQUE, no_hp TEXT
) STRICT;
CREATE TABLE IF NOT EXISTS barang (
  id_barang INTEGER PRIMARY KEY AUTOINCREMENT,
  id_kategori INTEGER NOT NULL REFERENCES kategori,
  id_penjual INTEGER NOT NULL REFERENCES penjual,
  nama_barang TEXT NOT NULL, deskripsi TEXT,
  harga_sewa INTEGER CHECK (harga_sewa > 0),  -- per hari, rupiah
  harga_jual INTEGER CHECK (harga_jual > 0),
  kondisi TEXT NOT NULL CHECK (kondisi IN ('baru','baik','cukup','rusak')),
  status TEXT NOT NULL DEFAULT 'tersedia' CHECK (status IN ('tersedia','disewa','terjual')),
  foto TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;
CREATE TABLE IF NOT EXISTS transaksi (
  id_transaksi INTEGER PRIMARY KEY AUTOINCREMENT,
  id_mahasiswa INTEGER NOT NULL REFERENCES mahasiswa,
  id_barang INTEGER NOT NULL REFERENCES barang,
  jenis_transaksi TEXT NOT NULL CHECK (jenis_transaksi IN ('sewa','beli')),
  tanggal_transaksi TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  tanggal_mulai TEXT, tanggal_selesai TEXT, durasi_sewa INTEGER,
  total_harga INTEGER NOT NULL CHECK (total_harga >= 0),
  status TEXT NOT NULL DEFAULT 'berjalan' CHECK (status IN ('berjalan','selesai','batal')),
  lokasi TEXT NOT NULL, metode_pembayaran TEXT NOT NULL
) STRICT;
CREATE TABLE IF NOT EXISTS poin (
  id_poin INTEGER PRIMARY KEY AUTOINCREMENT,
  id_mahasiswa INTEGER NOT NULL REFERENCES mahasiswa,
  id_transaksi INTEGER UNIQUE REFERENCES transaksi,
  jumlah_poin INTEGER NOT NULL, kategori TEXT NOT NULL, keterangan TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;
CREATE TABLE IF NOT EXISTS estimasi_harga (  -- "Smart Emulator" di ERD
  id_estimasi INTEGER PRIMARY KEY AUTOINCREMENT,
  id_barang INTEGER NOT NULL REFERENCES barang,
  jenis_transaksi TEXT NOT NULL, kondisi_barang TEXT NOT NULL,
  harga_rekomendasi INTEGER NOT NULL CHECK (harga_rekomendasi >= 0), faktor_kondisi REAL NOT NULL,
  tanggal_estimasi TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;
`);

// Jalankan beberapa tulis sebagai satu kesatuan: gagal di tengah = batal semua.
export const tx = (fn) => {
  db.exec('BEGIN');
  try { const r = fn(); db.exec('COMMIT'); return r; }
  catch (e) { db.exec('ROLLBACK'); throw e; }
};
