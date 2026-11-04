import { db } from '../src/db.js';

try {
  const tSql = db.prepare("SELECT sql FROM sqlite_master WHERE name = 'transaksi'").get()?.sql || '';
  if (tSql && !tSql.includes("'approved'")) {
    console.log('Migrating transaksi table to include approved status...');
    db.exec(`
      PRAGMA foreign_keys = OFF;
      DROP TABLE IF EXISTS transaksi_migrasi;
      CREATE TABLE transaksi_migrasi (
        id_transaksi INTEGER PRIMARY KEY AUTOINCREMENT,
        id_mahasiswa INTEGER NOT NULL REFERENCES mahasiswa,
        id_barang INTEGER NOT NULL REFERENCES barang,
        jenis_transaksi TEXT NOT NULL CHECK (jenis_transaksi IN ('sewa','beli','pinjam')),
        tanggal_transaksi TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        tanggal_mulai TEXT, tanggal_selesai TEXT, durasi_sewa INTEGER,
        total_harga INTEGER NOT NULL CHECK (total_harga >= 0),
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','approved','completed','cancelled','berjalan','selesai','batal','rejected')),
        lokasi TEXT NOT NULL, metode_pembayaran TEXT NOT NULL,
        cod_pin TEXT,
        alasan_batal TEXT
      ) STRICT;
      INSERT INTO transaksi_migrasi SELECT * FROM transaksi;
      DROP TABLE transaksi;
      ALTER TABLE transaksi_migrasi RENAME TO transaksi;
      PRAGMA foreign_keys = ON;
    `);
    console.log('Migration done!');
  }

  const info = db.prepare("UPDATE transaksi SET status = 'approved' WHERE id_transaksi = 1").run();
  console.log('Update success, changes:', info.changes);
  // revert
  db.prepare("UPDATE transaksi SET status = 'selesai' WHERE id_transaksi = 1").run();
} catch (e) {
  console.log('Update failed:', e.message);
}
