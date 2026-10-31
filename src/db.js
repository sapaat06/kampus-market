import { DatabaseSync } from 'node:sqlite';

export const db = new DatabaseSync(process.env.DB ?? 'app.db');

// STRICT menolak tipe data yang salah (mis. harga teks), jadi bug validasi
// tidak langsung menjadi data korup.
db.exec(`
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS mahasiswa (
  id_mahasiswa INTEGER PRIMARY KEY AUTOINCREMENT,
  nama TEXT NOT NULL, email TEXT NOT NULL COLLATE NOCASE UNIQUE, no_hp TEXT,
  password_hash TEXT NOT NULL, ktm TEXT, kampus TEXT,
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
  harga_sewa INTEGER CHECK (harga_sewa >= 0),
  harga_jual INTEGER CHECK (harga_jual >= 0),
  kondisi TEXT NOT NULL CHECK (kondisi IN ('baru','baik','cukup','rusak')),
  status TEXT NOT NULL DEFAULT 'tersedia' CHECK (status IN ('tersedia','disewa','terjual','dipinjam')),
  foto TEXT,
  lokasi TEXT,
  lokasi_lat REAL,
  lokasi_lng REAL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;
CREATE TABLE IF NOT EXISTS transaksi (
  id_transaksi INTEGER PRIMARY KEY AUTOINCREMENT,
  id_mahasiswa INTEGER NOT NULL REFERENCES mahasiswa,
  id_barang INTEGER NOT NULL REFERENCES barang,
  jenis_transaksi TEXT NOT NULL CHECK (jenis_transaksi IN ('sewa','beli','pinjam')),
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
CREATE TABLE IF NOT EXISTS estimasi_harga (
  id_estimasi INTEGER PRIMARY KEY AUTOINCREMENT,
  id_barang INTEGER NOT NULL REFERENCES barang,
  jenis_transaksi TEXT NOT NULL, kondisi_barang TEXT NOT NULL,
  harga_rekomendasi INTEGER NOT NULL CHECK (harga_rekomendasi >= 0), faktor_kondisi REAL NOT NULL,
  tanggal_estimasi TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;
CREATE TABLE IF NOT EXISTS kos (
  id_kos INTEGER PRIMARY KEY AUTOINCREMENT,
  id_pemilik INTEGER NOT NULL REFERENCES mahasiswa(id_mahasiswa),
  nama_kos TEXT NOT NULL, deskripsi TEXT, alamat TEXT,
  harga_bulan INTEGER NOT NULL CHECK (harga_bulan >= 0),
  fasilitas TEXT, status_kos TEXT NOT NULL DEFAULT 'tersedia' CHECK (status_kos IN ('tersedia','tidak_tersedia')),
  jenis_kelamin TEXT DEFAULT 'campur' CHECK (jenis_kelamin IN ('putra','putri','campur')),
  kamar_tersedia INTEGER DEFAULT 0 CHECK (kamar_tersedia >= 0),
  foto TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;
`);

// Migrasi database yang sudah ada jika kolom/constraints belum diperbarui
try {
  const kolomMahasiswa = db.prepare("SELECT name FROM pragma_table_info('mahasiswa')").all().map((k) => k.name);
  if (!kolomMahasiswa.includes('kampus')) db.exec('ALTER TABLE mahasiswa ADD COLUMN kampus TEXT');
  if (!kolomMahasiswa.includes('role')) db.exec('ALTER TABLE mahasiswa ADD COLUMN role TEXT DEFAULT \'pelanggan\' CHECK (role IN (\'pelanggan\',\'pemilik_kost\'))');
  if (!kolomMahasiswa.includes('foto')) db.exec('ALTER TABLE mahasiswa ADD COLUMN foto TEXT');

  const kolomBarang = db.prepare("SELECT name FROM pragma_table_info('barang')").all().map((k) => k.name);
  if (!kolomBarang.includes('lokasi')) db.exec('ALTER TABLE barang ADD COLUMN lokasi TEXT');
  if (!kolomBarang.includes('lokasi_lat')) db.exec('ALTER TABLE barang ADD COLUMN lokasi_lat REAL');
  if (!kolomBarang.includes('lokasi_lng')) db.exec('ALTER TABLE barang ADD COLUMN lokasi_lng REAL');

  const tSql = db.prepare("SELECT sql FROM sqlite_master WHERE name = 'transaksi'").get()?.sql || '';
  if (tSql && !tSql.includes('pinjam')) {
    db.exec(`
      PRAGMA foreign_keys = OFF;
      CREATE TABLE transaksi_migrasi (
        id_transaksi INTEGER PRIMARY KEY AUTOINCREMENT,
        id_mahasiswa INTEGER NOT NULL REFERENCES mahasiswa,
        id_barang INTEGER NOT NULL REFERENCES barang,
        jenis_transaksi TEXT NOT NULL CHECK (jenis_transaksi IN ('sewa','beli','pinjam')),
        tanggal_transaksi TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        tanggal_mulai TEXT, tanggal_selesai TEXT, durasi_sewa INTEGER,
        total_harga INTEGER NOT NULL CHECK (total_harga >= 0),
        status TEXT NOT NULL DEFAULT 'berjalan' CHECK (status IN ('berjalan','selesai','batal')),
        lokasi TEXT NOT NULL, metode_pembayaran TEXT NOT NULL
      ) STRICT;
      INSERT INTO transaksi_migrasi SELECT * FROM transaksi;
      DROP TABLE transaksi;
      ALTER TABLE transaksi_migrasi RENAME TO transaksi;
      PRAGMA foreign_keys = ON;
    `);
  }

  const bSql = db.prepare("SELECT sql FROM sqlite_master WHERE name = 'barang'").get()?.sql || '';
  if (bSql && (!bSql.includes('dipinjam') || bSql.includes('harga_sewa INTEGER CHECK (harga_sewa > 0)'))) {
    db.exec(`
      PRAGMA foreign_keys = OFF;
      CREATE TABLE barang_migrasi (
        id_barang INTEGER PRIMARY KEY AUTOINCREMENT,
        id_kategori INTEGER NOT NULL REFERENCES kategori,
        id_penjual INTEGER NOT NULL REFERENCES penjual,
        nama_barang TEXT NOT NULL, deskripsi TEXT,
        harga_sewa INTEGER CHECK (harga_sewa >= 0),
        harga_jual INTEGER CHECK (harga_jual >= 0),
        kondisi TEXT NOT NULL CHECK (kondisi IN ('baru','baik','cukup','rusak')),
        status TEXT NOT NULL DEFAULT 'tersedia' CHECK (status IN ('tersedia','disewa','terjual','dipinjam')),
        foto TEXT,
        lokasi TEXT,
        lokasi_lat REAL,
        lokasi_lng REAL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) STRICT;
      INSERT INTO barang_migrasi (id_barang, id_kategori, id_penjual, nama_barang, deskripsi, harga_sewa, harga_jual, kondisi, status, foto, lokasi, lokasi_lat, lokasi_lng, created_at)
      SELECT id_barang, id_kategori, id_penjual, nama_barang, deskripsi, harga_sewa, harga_jual, kondisi, status, foto, lokasi, NULL, NULL, created_at FROM barang;
      DROP TABLE barang;
      ALTER TABLE barang_migrasi RENAME TO barang;
      PRAGMA foreign_keys = ON;
    `);
  }
} catch (errMigrasi) {
  console.log('Catatan migrasi database:', errMigrasi.message);
}

// Jalankan beberapa tulis sebagai satu kesatuan: gagal di tengah = batal semua.
export const tx = (fn) => {
  db.exec('BEGIN');
  try { const r = fn(); db.exec('COMMIT'); return r; }
  catch (e) { db.exec('ROLLBACK'); throw e; }
};
