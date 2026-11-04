import { createClient } from '@libsql/client';
import { AsyncLocalStorage } from 'node:async_hooks';

const defaultUrl = process.env.DB && process.env.DB === ':memory:'
  ? ':memory:'
  : (process.env.DB ? (process.env.DB.startsWith('file:') ? process.env.DB : `file:${process.env.DB}`) : 'file:app.db');

export const client = createClient({
  url: process.env.TURSO_DATABASE_URL || defaultUrl,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const txStorage = new AsyncLocalStorage();

const normalizeArgs = (args) => {
  if (args.length === 1 && Array.isArray(args[0])) {
    return args[0];
  }
  return args;
};

export const db = {
  client,
  prepare(sql) {
    return {
      async all(...args) {
        const executor = txStorage.getStore() || client;
        const res = await executor.execute({ sql, args: normalizeArgs(args) });
        return Array.from(res.rows);
      },
      async get(...args) {
        const executor = txStorage.getStore() || client;
        const res = await executor.execute({ sql, args: normalizeArgs(args) });
        return res.rows[0];
      },
      async run(...args) {
        const executor = txStorage.getStore() || client;
        const res = await executor.execute({ sql, args: normalizeArgs(args) });
        return {
          lastInsertRowid: res.lastInsertRowid != null ? Number(res.lastInsertRowid) : undefined,
          changes: res.rowsAffected,
          rowsAffected: res.rowsAffected,
        };
      },
    };
  },
  async exec(sql) {
    const executor = txStorage.getStore() || client;
    if (executor.executeMultiple) {
      return await executor.executeMultiple(sql);
    }
    return await executor.execute(sql);
  },
  async execute(stmt) {
    const executor = txStorage.getStore() || client;
    return await executor.execute(stmt);
  },
  async batch(stmts, mode = 'write') {
    const executor = txStorage.getStore() || client;
    return await executor.batch(stmts, mode);
  },
};

// Jalankan beberapa tulis sebagai satu transaksi atomik
export const tx = async (fn) => {
  const existingTx = txStorage.getStore();
  if (existingTx) {
    return await fn(existingTx);
  }
  const txn = await client.transaction('write');
  try {
    const r = await txStorage.run(txn, () => fn(txn));
    await txn.commit();
    return r;
  } catch (e) {
    try { await txn.rollback(); } catch {}
    throw e;
  } finally {
    try { txn.close(); } catch {}
  }
};

export async function initDb() {
  await client.executeMultiple(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS mahasiswa (
      id_mahasiswa INTEGER PRIMARY KEY AUTOINCREMENT,
      nama TEXT NOT NULL, email TEXT NOT NULL COLLATE NOCASE UNIQUE, no_hp TEXT,
      whatsapp_number TEXT,
      password_hash TEXT NOT NULL, ktm TEXT, kampus TEXT,
      foto TEXT,
      role TEXT NOT NULL DEFAULT 'mahasiswa' CHECK (role IN ('mahasiswa','pelanggan','pemilik_kost','admin')),
      status_akun TEXT NOT NULL DEFAULT 'pending' CHECK (status_akun IN ('pending','approved','rejected')),
      status_verifikasi TEXT NOT NULL DEFAULT 'pending' CHECK (status_verifikasi IN ('pending','terverifikasi','ditolak','approved','rejected')),
      alasan_penolakan TEXT,
      is_banned INTEGER NOT NULL DEFAULT 0,
      submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
      status_moderasi TEXT NOT NULL DEFAULT 'disetujui' CHECK (status_moderasi IN ('pending','disetujui','ditolak')),
      alasan_penolakan TEXT,
      foto TEXT,
      lokasi TEXT,
      lokasi_lat REAL,
      lokasi_lng REAL,
      latitude REAL,
      longitude REAL,
      kategori_lain TEXT,
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
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','approved','completed','cancelled','berjalan','selesai','batal','rejected')),
      lokasi TEXT NOT NULL, metode_pembayaran TEXT NOT NULL,
      cod_pin TEXT,
      alasan_batal TEXT
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
      status_verifikasi TEXT NOT NULL DEFAULT 'terverifikasi' CHECK (status_verifikasi IN ('pending','terverifikasi','ditolak','approved','rejected')),
      status_postingan TEXT NOT NULL DEFAULT 'pending' CHECK (status_postingan IN ('pending','approved','rejected')),
      alasan_penolakan TEXT,
      jenis_kelamin TEXT DEFAULT 'campur' CHECK (jenis_kelamin IN ('putra','putri','campur')),
      tipe_kos TEXT DEFAULT 'campur' CHECK (tipe_kos IN ('putra','putri','campur')),
      kamar_tersedia INTEGER DEFAULT 0 CHECK (kamar_tersedia >= 0),
      foto TEXT,
      latitude REAL,
      longitude REAL,
      lokasi_lat REAL,
      lokasi_lng REAL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) STRICT;
    CREATE TABLE IF NOT EXISTS pengajuan_sewa_kos (
      id_pengajuan INTEGER PRIMARY KEY AUTOINCREMENT,
      id_kos INTEGER DEFAULT 1,
      id_pemilik INTEGER DEFAULT 1,
      kos_id INTEGER DEFAULT 1,
      pemilik_id INTEGER DEFAULT 1,
      user_id INTEGER DEFAULT 1,
      nama_penyewa TEXT NOT NULL DEFAULT 'Rina Maharani',
      email_penyewa TEXT NOT NULL DEFAULT 'rina@itg.ac.id',
      avatar_penyewa TEXT DEFAULT '/img/avatar-rina-figma.png',
      nama_kos TEXT NOT NULL DEFAULT 'Kos Ananda Dago',
      kamar TEXT NOT NULL DEFAULT 'Kamar A-09',
      periode TEXT NOT NULL DEFAULT '1 Nov 2026 – 31 Jan 2027',
      durasi_bulan INTEGER NOT NULL DEFAULT 3,
      total_harga INTEGER NOT NULL DEFAULT 3600000,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','accepted','rejected','cancelled','selesai')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS pesanan (
      id_pesanan INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL DEFAULT 1,
      kos_id INTEGER NOT NULL DEFAULT 1,
      pemilik_id INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','accepted','rejected','cancelled','selesai')),
      nama_penyewa TEXT NOT NULL DEFAULT 'Rina Maharani',
      email_penyewa TEXT NOT NULL DEFAULT 'rina@itg.ac.id',
      avatar_penyewa TEXT DEFAULT '/img/avatar-rina-figma.png',
      nama_kos TEXT NOT NULL DEFAULT 'Kos Ananda Dago',
      kamar TEXT NOT NULL DEFAULT 'Kamar A-09',
      periode TEXT NOT NULL DEFAULT '1 Nov 2026 – 31 Jan 2027',
      durasi_bulan INTEGER NOT NULL DEFAULT 3,
      total_harga INTEGER NOT NULL DEFAULT 3600000,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS kamar_kos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kos_id INTEGER NOT NULL REFERENCES kos(id_kos) ON DELETE CASCADE,
      property_id INTEGER,
      nomor_kamar TEXT NOT NULL,
      nama TEXT,
      tipe TEXT DEFAULT 'Standar',
      ukuran TEXT DEFAULT '3 × 3 m',
      status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'booked', 'pending', 'kosong', 'terisi')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_kamar_kos_kos_id ON kamar_kos(kos_id);
    CREATE TABLE IF NOT EXISTS laporan (
      id_laporan INTEGER PRIMARY KEY AUTOINCREMENT,
      id_pelapor INTEGER REFERENCES mahasiswa(id_mahasiswa),
      tipe_target TEXT NOT NULL CHECK (tipe_target IN ('barang','kos','user')),
      id_target INTEGER NOT NULL,
      alasan TEXT NOT NULL,
      keterangan TEXT,
      status TEXT NOT NULL DEFAULT 'menunggu' CHECK (status IN ('menunggu','ditindaklanjuti','ditolak')),
      tindakan TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) STRICT;
    CREATE TABLE IF NOT EXISTS chat_rooms (
      id_room INTEGER PRIMARY KEY AUTOINCREMENT,
      id_pembeli INTEGER NOT NULL REFERENCES mahasiswa(id_mahasiswa),
      id_penjual INTEGER NOT NULL REFERENCES mahasiswa(id_mahasiswa),
      tipe_referensi TEXT NOT NULL CHECK (tipe_referensi IN ('barang','kos','umum')),
      id_referensi INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) STRICT;
    CREATE TABLE IF NOT EXISTS chat_messages (
      id_pesan INTEGER PRIMARY KEY AUTOINCREMENT,
      id_room INTEGER NOT NULL REFERENCES chat_rooms(id_room) ON DELETE CASCADE,
      id_pengirim INTEGER NOT NULL REFERENCES mahasiswa(id_mahasiswa),
      pesan TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) STRICT;
    CREATE INDEX IF NOT EXISTS idx_chat_rooms_users ON chat_rooms(id_pembeli, id_penjual);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages(id_room, created_at);

    CREATE VIEW IF NOT EXISTS users AS
      SELECT id_mahasiswa AS id, id_mahasiswa, nama, email, no_hp, whatsapp_number, password_hash,
             ktm, kampus, role, status_akun, status_verifikasi, alasan_penolakan, is_banned,
             submitted_at, created_at
      FROM mahasiswa;

    CREATE TRIGGER IF NOT EXISTS trigger_users_insert INSTEAD OF INSERT ON users
    BEGIN
      INSERT INTO mahasiswa (nama, email, no_hp, whatsapp_number, password_hash, ktm, kampus, role, status_akun, status_verifikasi, alasan_penolakan, is_banned, submitted_at, created_at)
      VALUES (NEW.nama, NEW.email, NEW.no_hp, NEW.whatsapp_number, NEW.password_hash, NEW.ktm, NEW.kampus, COALESCE(NEW.role, 'mahasiswa'), COALESCE(NEW.status_akun, 'pending'), COALESCE(NEW.status_verifikasi, 'pending'), NEW.alasan_penolakan, COALESCE(NEW.is_banned, 0), COALESCE(NEW.submitted_at, CURRENT_TIMESTAMP), COALESCE(NEW.created_at, CURRENT_TIMESTAMP));
    END;

    CREATE TRIGGER IF NOT EXISTS trigger_users_update INSTEAD OF UPDATE ON users
    BEGIN
      UPDATE mahasiswa SET
        nama = NEW.nama,
        email = NEW.email,
        no_hp = NEW.no_hp,
        whatsapp_number = NEW.whatsapp_number,
        password_hash = NEW.password_hash,
        ktm = NEW.ktm,
        kampus = NEW.kampus,
        role = NEW.role,
        status_akun = NEW.status_akun,
        status_verifikasi = NEW.status_verifikasi,
        alasan_penolakan = NEW.alasan_penolakan,
        is_banned = NEW.is_banned
      WHERE id_mahasiswa = OLD.id_mahasiswa OR id_mahasiswa = OLD.id;
    END;

    CREATE TRIGGER IF NOT EXISTS trigger_users_delete INSTEAD OF DELETE ON users
    BEGIN
      DELETE FROM mahasiswa WHERE id_mahasiswa = OLD.id_mahasiswa OR id_mahasiswa = OLD.id;
    END;
  `);

  // Migrasi database yang sudah ada jika kolom belum ada
  try {
    const tableInfoMahasiswa = await client.execute('PRAGMA table_info(mahasiswa)');
    const kolomMahasiswa = tableInfoMahasiswa.rows.map((k) => k.name);
    if (!kolomMahasiswa.includes('foto')) {
      try { await client.execute('ALTER TABLE mahasiswa ADD COLUMN foto TEXT'); } catch {}
    }
    if (!kolomMahasiswa.includes('whatsapp_number')) {
      try {
        await client.execute('ALTER TABLE mahasiswa ADD COLUMN whatsapp_number TEXT');
        await client.execute('UPDATE mahasiswa SET whatsapp_number = no_hp WHERE whatsapp_number IS NULL');
      } catch {}
    }
    if (!kolomMahasiswa.includes('kampus')) {
      try { await client.execute('ALTER TABLE mahasiswa ADD COLUMN kampus TEXT'); } catch {}
    }
    if (!kolomMahasiswa.includes('is_banned')) {
      try { await client.execute('ALTER TABLE mahasiswa ADD COLUMN is_banned INTEGER NOT NULL DEFAULT 0'); } catch {}
    }
    if (!kolomMahasiswa.includes('alasan_penolakan')) {
      try { await client.execute('ALTER TABLE mahasiswa ADD COLUMN alasan_penolakan TEXT'); } catch {}
    }

    const tableInfoBarang = await client.execute('PRAGMA table_info(barang)');
    const kolomBarang = tableInfoBarang.rows.map((k) => k.name);
    if (!kolomBarang.includes('status_moderasi')) {
      try { await client.execute("ALTER TABLE barang ADD COLUMN status_moderasi TEXT DEFAULT 'disetujui'"); } catch {}
    }
    if (!kolomBarang.includes('alasan_penolakan')) {
      try { await client.execute('ALTER TABLE barang ADD COLUMN alasan_penolakan TEXT'); } catch {}
    }
    if (!kolomBarang.includes('kategori_lain')) {
      try { await client.execute('ALTER TABLE barang ADD COLUMN kategori_lain TEXT'); } catch {}
    }

    const tableInfoKos = await client.execute('PRAGMA table_info(kos)');
    const kolomKos = tableInfoKos.rows.map((k) => k.name);
    if (!kolomKos.includes('status_postingan')) {
      try { await client.execute("ALTER TABLE kos ADD COLUMN status_postingan TEXT DEFAULT 'pending'"); } catch {}
    }
    if (!kolomKos.includes('alasan_penolakan')) {
      try { await client.execute('ALTER TABLE kos ADD COLUMN alasan_penolakan TEXT'); } catch {}
    }
  } catch (errMigrasi) {
    console.log('Catatan migrasi database:', errMigrasi.message);
  }
}

await initDb();
