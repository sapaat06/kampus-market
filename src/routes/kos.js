import { Router } from 'express';
import { db, tx } from '../db.js';
import { err, str, optStr, posInt, oneOf } from '../util.js';
import { user, userOrAdmin, pemilikKost } from '../auth.js';
import { upload, simpanFotosCloudinary } from '../upload.js';

export const router = Router();

const JENIS_KELAMIN = ['putra', 'putri', 'campur'];

// Batas waktu pembayaran QRIS simulasi.
const MENIT_BAYAR = 15;
const expireBaru = () => new Date(Date.now() + MENIT_BAYAR * 60_000).toISOString();

// Ubah status kamar milik satu pengajuan, lalu sinkronkan kamar_tersedia.
async function ubahKamarPengajuan(pengajuan, status) {
  const kosId = Number(pengajuan.kos_id || pengajuan.id_kos) || 1;
  const kamarRaw = String(pengajuan.kamar || '').trim();
  const cleanNo = kamarRaw.replace(/^Kamar\s*/i, '').trim();
  const hanyaPending = status === 'available' ? "AND status = 'pending'" : '';

  const r = await db.prepare(`
    UPDATE kamar_kos SET status = ?
    WHERE kos_id = ? ${hanyaPending}
      AND (nomor_kamar = ? OR nama = ? OR nomor_kamar = ? OR replace(nomor_kamar, 'Kamar ', '') = ? OR nomor_kamar LIKE ?)
  `).run(status, kosId, kamarRaw, kamarRaw, `Kamar ${cleanNo}`, cleanNo, `%${cleanNo}%`);

  if (r.changes === 0) {
    const dariStatus = status === 'booked' ? "IN ('pending', 'available', 'kosong')" : "= 'pending'";
    await db.prepare(`
      UPDATE kamar_kos SET status = ?
      WHERE id = (SELECT id FROM kamar_kos WHERE kos_id = ? AND status ${dariStatus} LIMIT 1)
    `).run(status, kosId);
  }

  await db.prepare(`
    UPDATE kos SET kamar_tersedia = (SELECT COUNT(*) FROM kamar_kos WHERE kos_id = ? AND status IN ('available', 'kosong'))
    WHERE id_kos = ?
  `).run(kosId, kosId);
}

// Cek lazy: pengajuan unpaid yang lewat expire_at jadi expired dan kamarnya dilepas.
async function kedaluwarsakanPengajuan() {
  const rows = await db.prepare(`
    SELECT * FROM pengajuan_sewa_kos
    WHERE status_bayar = 'unpaid' AND expire_at IS NOT NULL AND expire_at <= ?
  `).all(new Date().toISOString());

  for (const p of rows) {
    const r = await db.prepare(`
      UPDATE pengajuan_sewa_kos SET status_bayar = 'expired', status = 'cancelled'
      WHERE id_pengajuan = ? AND status_bayar = 'unpaid'
    `).run(p.id_pengajuan);
    if (r.changes === 0) continue;
    try { await db.prepare("UPDATE pesanan SET status='cancelled' WHERE id_pesanan=?").run(p.id_pengajuan); } catch {}
    await ubahKamarPengajuan(p, 'available');
  }
}

// Public: daftar semua kos
router.get('/kos', async (req, res) => {
  const tipe = req.query.tipe;
  const selectedTipe = tipe || req.query.gender || req.query.kategori;
  const qStr = typeof req.query.q === 'string' ? req.query.q.trim() : '';

  // Single Source of Truth: kamar_tersedia dihitung dari jumlah kamar yang available / kosong
  let sql = `SELECT k.*, 
                    CASE 
                      WHEN (SELECT COUNT(*) FROM kamar_kos WHERE kos_id = k.id_kos) > 0 
                      THEN (SELECT COUNT(*) FROM kamar_kos WHERE kos_id = k.id_kos AND status IN ('available', 'kosong'))
                      ELSE COALESCE(k.kamar_tersedia, 0)
                    END AS kamar_tersedia,
                    COALESCE(k.tipe_kos, k.jenis_kelamin) AS tipe_kos, 
                    COALESCE(k.jenis_kelamin, k.tipe_kos) AS jenis_kelamin, 
                    m.nama AS nama_pemilik
             FROM kos k LEFT JOIN mahasiswa m ON k.id_pemilik = m.id_mahasiswa`;
  const queryParams = [];
  const conditions = [];

  // HANYA menampilkan kos yang status_postingan = 'approved' (atau legacy terverifikasi)
  conditions.push("(k.status_postingan = 'approved' OR (k.status_postingan IS NULL AND k.status_verifikasi = 'terverifikasi'))");

  if (selectedTipe && selectedTipe !== 'semua') {
    conditions.push('(k.tipe_kos = ? COLLATE NOCASE OR k.jenis_kelamin = ? COLLATE NOCASE)');
    queryParams.push(selectedTipe, selectedTipe);
  }

  if (qStr !== '') {
    conditions.push('(k.nama_kos LIKE ? OR k.alamat LIKE ?)');
    queryParams.push(`%${qStr}%`, `%${qStr}%`);
  }

  if (conditions.length > 0) {
    sql += ` WHERE ${conditions.join(' AND ')}`;
  }

  sql += ` ORDER BY k.id_kos DESC`;

  res.json(await db.prepare(sql).all(...queryParams));
});

// Pemilik kost: daftar kos miliknya
router.get('/kos/miliku', user, pemilikKost, async (_req, res) => {
  // Single Source of Truth: kamar_tersedia dihitung dari kamar_kos
  res.json(await db.prepare(
    `SELECT k.*, 
            CASE 
              WHEN (SELECT COUNT(*) FROM kamar_kos WHERE kos_id = k.id_kos) > 0 
              THEN (SELECT COUNT(*) FROM kamar_kos WHERE kos_id = k.id_kos AND status IN ('available', 'kosong'))
              ELSE COALESCE(k.kamar_tersedia, 0)
            END AS kamar_tersedia,
            (SELECT COUNT(*) FROM kamar_kos WHERE kos_id = k.id_kos) AS total_kamar,
            m.nama AS nama_pemilik
     FROM kos k JOIN mahasiswa m ON k.id_pemilik = m.id_mahasiswa
     WHERE k.id_pemilik=?
     ORDER BY k.id_kos DESC`
  ).all(_req.uid));
});

// Pemilik kost: daftar pesanan masuk khusus untuk role Pemilik Kost
router.get(['/pesanan-masuk', '/kos/pesanan-masuk'], user, pemilikKost, async (req, res) => {
  const pemilik_id = Number(req.uid);

  // Query datanya menggunakan klausa: WHERE pemilik_id = ? AND status = 'pending'
  await kedaluwarsakanPengajuan();
  const list = await db.prepare(`
    SELECT p.*,
           COALESCE(p.kos_id, p.id_kos) AS kos_id,
           COALESCE(p.pemilik_id, p.id_pemilik) AS pemilik_id,
           COALESCE(p.user_id, 1) AS user_id
    FROM pengajuan_sewa_kos p
    WHERE (p.pemilik_id = ? OR p.id_pemilik = ?) AND p.status = 'pending'
    ORDER BY p.id_pengajuan DESC
  `).all(pemilik_id, pemilik_id);

  res.json(list);
});

// Pemilik kost / antrean pengajuan sewa kos baru
router.get(['/kos/pengajuan', '/kos/pengajuan/pending'], userOrAdmin, async (req, res) => {
  // Klausa query WHERE status = 'pending': jangan pernah me-return pesanan approved / selesai
  await kedaluwarsakanPengajuan();
  let list;
  if (req.isAdmin) {
    list = await db.prepare(
      `SELECT * FROM pengajuan_sewa_kos WHERE status = 'pending' ORDER BY id_pengajuan DESC`
    ).all();
  } else {
    list = await db.prepare(
      `SELECT * FROM pengajuan_sewa_kos
       WHERE status = 'pending' AND (pemilik_id = ? OR id_pemilik = ?)
       ORDER BY id_pengajuan DESC`
    ).all(req.uid, req.uid);
  }
  res.json(list);
});

// Mahasiswa / Pengguna: ajukan sewa kos baru
router.post(['/sewa', '/kos/sewa', '/kos/pengajuan'], user, async (req, res) => {
  await kedaluwarsakanPengajuan();
  const kos_id = Number(req.body?.kos_id ?? req.body?.id_kos);
  if (!kos_id || !Number.isInteger(kos_id) || kos_id <= 0) {
    throw err(400, 'kos_id wajib diisi dan valid');
  }

  const kamar = str(req.body?.kamar || 'Kamar 01', 'kamar', 50);
  const durasi_bulan = posInt(Number(req.body?.durasi_bulan || 3), 'durasi_bulan', 36);

  // Di backend, ambil pemilik_id yang terkait dengan kos_id tersebut
  const k = await db.prepare('SELECT * FROM kos WHERE id_kos=?').get(kos_id);
  if (!k) throw err(404, 'kos tidak ditemukan');

  const pemilik_id = Number(k.id_pemilik) || 1;
  const nama_kos = k.nama_kos;
  const harga_bulan = Number(k.harga_bulan) || 800000;
  const total_harga = Number(req.body?.total_harga) || (harga_bulan * durasi_bulan);

  let nama_penyewa = req.body?.nama_penyewa ? str(req.body.nama_penyewa, 'nama_penyewa', 100) : null;
  let email_penyewa = req.body?.email_penyewa ? str(req.body.email_penyewa, 'email_penyewa', 100) : null;
  let avatar_penyewa = req.body?.avatar_penyewa || '/img/avatar-rina-figma.png';

  // Ambil user_id (mahasiswa) yang mengajukan sewa (dari sesi terautentikasi)
  const user_id = Number(req.uid);
  if (!user_id) throw err(401, 'login dulu');

  const userRow = await db.prepare('SELECT nama, email, foto FROM mahasiswa WHERE id_mahasiswa=?').get(user_id);
  if (userRow) {
    nama_penyewa = userRow.nama || nama_penyewa;
    email_penyewa = userRow.email || email_penyewa;
    if (userRow.foto) avatar_penyewa = userRow.foto;
  }

  if (!nama_penyewa) nama_penyewa = 'Mahasiswa ITG';
  if (!email_penyewa) email_penyewa = 'mahasiswa@itg.ac.id';

  const dStart = new Date();
  const dEnd = new Date(dStart);
  dEnd.setMonth(dEnd.getMonth() + durasi_bulan);
  const periode = req.body?.periode || `${dStart.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} – ${dEnd.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  const expire_at = expireBaru();

  // Transaksi atomik: Validasi ketersediaan kamar, ubah status jadi pending, dan insert pesanan
  const id_pengajuan = await tx(async () => {
    const cleanKamarNo = kamar.replace(/^Kamar\s*/i, '').trim();
    const room = await db.prepare(`
      SELECT * FROM kamar_kos 
      WHERE kos_id = ? 
        AND (
          nomor_kamar = ? 
          OR nama = ? 
          OR replace(nomor_kamar, 'Kamar ', '') = ?
          OR nomor_kamar LIKE ?
        )
      LIMIT 1
    `).get(kos_id, kamar, kamar, cleanKamarNo, `%${cleanKamarNo}%`);

    if (room) {
      // Tolak jika kamar sudah tidak available
      if (room.status !== 'available' && room.status !== 'kosong') {
        throw err(409, 'Kamar sudah dipesan');
      }
      await db.prepare("UPDATE kamar_kos SET status='pending' WHERE id=?").run(room.id);
    } else {
      // Jika nomor kamar tidak match persis, cek apakah masih ada kamar available
      const anyRoom = await db.prepare("SELECT * FROM kamar_kos WHERE kos_id=? AND status IN ('available', 'kosong') LIMIT 1").get(kos_id);
      if (anyRoom) {
        await db.prepare("UPDATE kamar_kos SET status='pending' WHERE id=?").run(anyRoom.id);
      }
    }

    // Update counter kamar_tersedia pada tabel kos
    await db.prepare(`
      UPDATE kos 
      SET kamar_tersedia = (SELECT COUNT(*) FROM kamar_kos WHERE kos_id = ? AND status IN ('available', 'kosong')) 
      WHERE id_kos = ?
    `).run(kos_id, kos_id);

    // Insert ke tabel pengajuan_sewa_kos
    const stmt = db.prepare(`
      INSERT INTO pengajuan_sewa_kos (
        id_kos, id_pemilik, kos_id, pemilik_id, user_id,
        nama_penyewa, email_penyewa, avatar_penyewa,
        nama_kos, kamar, periode, durasi_bulan, total_harga, status, status_bayar, expire_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'unpaid', ?)
    `);
    const r = await stmt.run(
      kos_id, pemilik_id, kos_id, pemilik_id, user_id,
      nama_penyewa, email_penyewa, avatar_penyewa,
      nama_kos, kamar, periode, durasi_bulan, total_harga, expire_at
    );
    const insId = Number(r.lastInsertRowid);

    try {
      await db.prepare(`
        INSERT INTO pesanan (
          user_id, kos_id, pemilik_id, status,
          nama_penyewa, email_penyewa, avatar_penyewa,
          nama_kos, kamar, durasi_bulan, total_harga, periode
        ) VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        user_id, kos_id, pemilik_id,
        nama_penyewa, email_penyewa, avatar_penyewa,
        nama_kos, kamar, durasi_bulan, total_harga, periode
      );
    } catch (e) {
      if (!(String(e?.message || e || '').toLowerCase().includes('no such table') && String(e?.message || e || '').includes('pesanan'))) throw e;
    }

    return insId;
  });

  res.status(201).json({
    ok: true,
    id_pengajuan,
    id_pesanan: id_pengajuan,
    user_id,
    kos_id,
    pemilik_id,
    id_kos: kos_id,
    id_pemilik: pemilik_id,
    nama_kos,
    kamar,
    durasi_bulan,
    total_harga,
    status: 'pending',
    status_bayar: 'unpaid',
    expire_at,
    periode,
    pesan: 'Pengajuan sewa kos berhasil dikirim dan menunggu konfirmasi pemilik.'
  });
});

// Mahasiswa: simulasi pembayaran QRIS (dummy, tanpa gateway asli)
router.post('/kos/pengajuan/:id/simulasi-bayar', user, async (req, res) => {
  const id = posInt(Number(req.params.id), 'id_pengajuan');
  await kedaluwarsakanPengajuan();

  const p = await db.prepare('SELECT * FROM pengajuan_sewa_kos WHERE id_pengajuan=?').get(id);
  if (!p) throw err(404, 'pengajuan tidak ditemukan');
  if (Number(p.user_id || 1) !== Number(req.uid)) throw err(403, 'pengajuan ini bukan milik Anda');

  // Idempotent: pembayaran yang sudah lunas tetap mengembalikan status paid.
  if (p.status_bayar === 'paid') {
    return res.json({
      ok: true,
      id_pengajuan: id,
      status_bayar: 'paid',
      sudah_dibayar: true,
      total_harga: p.total_harga,
      paid_at: new Date().toISOString(),
      pesan: 'Pembayaran simulasi sudah tercatat sebelumnya.'
    });
  }

  if (p.status_bayar === 'expired' || (p.expire_at && p.expire_at <= new Date().toISOString())) {
    throw err(410, 'waktu pembayaran sudah habis');
  }
  if (p.status === 'rejected' || p.status === 'cancelled') {
    throw err(409, 'pengajuan sudah tidak aktif');
  }

  const paid_at = new Date().toISOString();
  await tx(async () => {
    const r = await db.prepare(`
      UPDATE pengajuan_sewa_kos SET status_bayar='paid'
      WHERE id_pengajuan=? AND status_bayar='unpaid'
    `).run(id);
    if (r.changes > 0) await ubahKamarPengajuan(p, 'booked');
  });

  const after = await db.prepare('SELECT status_bayar FROM pengajuan_sewa_kos WHERE id_pengajuan=?').get(id);
  res.json({
    ok: true,
    id_pengajuan: id,
    status_bayar: after?.status_bayar || 'paid',
    sudah_dibayar: false,
    total_harga: p.total_harga,
    paid_at,
    pesan: 'Pembayaran simulasi berhasil. Kamar telah dikunci.'
  });
});

// Pemilik kost: terima / setujui pengajuan sewa kos (eksekusi UPDATE ke database)
router.all(['/kos/pengajuan/:id/terima', '/kos/pengajuan/:id/approve', '/pesanan-masuk/:id/approve', '/pesanan-masuk/:id/terima'], userOrAdmin, async (req, res) => {
  const id = Number(req.params.id) || 1;

  await tx(async () => {
    // Ambil data pengajuan / pesanan untuk mengetahui kos_id dan nomor kamar yang dipesan
    const pengajuan = await db.prepare('SELECT * FROM pengajuan_sewa_kos WHERE id_pengajuan=?').get(id)
                   || await db.prepare('SELECT * FROM pesanan WHERE id_pesanan=?').get(id);

    const isOwner = Boolean(req.uid && pengajuan && (Number(pengajuan.id_pemilik) === Number(req.uid) || Number(pengajuan.pemilik_id) === Number(req.uid)));
    if (!req.isAdmin && !isOwner) throw err(403, 'Hanya pemilik kos atau admin yang dapat menyetujui pengajuan ini');

    await db.prepare("UPDATE pengajuan_sewa_kos SET status='approved' WHERE id_pengajuan=?").run(id);
    try {
      await db.prepare("UPDATE pesanan SET status='approved' WHERE id_pesanan=?").run(id);
    } catch (e) {
      if (!(String(e?.message || e || '').toLowerCase().includes('no such table') && String(e?.message || e || '').includes('pesanan'))) throw e;
    }
    try {
      await db.prepare("UPDATE transaksi SET status='approved' WHERE id_transaksi=?").run(id);
    } catch (e) {
      if (!(String(e?.message || e || '').toLowerCase().includes('no such table') && String(e?.message || e || '').includes('transaksi'))) throw e;
    }

    // Kunci kamar spesifik yang dipesan: status -> 'booked'
    if (pengajuan) {
      const kosId = pengajuan.kos_id || pengajuan.id_kos;
      const kamarRaw = String(pengajuan.kamar || '').trim();
      const cleanNo = kamarRaw.replace(/^Kamar\s*/i, '').trim();

      let rKamar = await db.prepare(`
        UPDATE kamar_kos 
        SET status = 'booked' 
        WHERE kos_id = ? 
          AND (
            nomor_kamar = ? 
            OR nama = ? 
            OR nomor_kamar = ? 
            OR replace(nomor_kamar, 'Kamar ', '') = ?
            OR nomor_kamar LIKE ?
          )
      `).run(kosId, kamarRaw, kamarRaw, `Kamar ${cleanNo}`, cleanNo, `%${cleanNo}%`);

      if (rKamar.changes === 0) {
        // Jika nomor kamar tidak match persis, kunci kamar pending pertama
        await db.prepare(`
          UPDATE kamar_kos 
          SET status = 'booked' 
          WHERE id = (
            SELECT id FROM kamar_kos WHERE kos_id = ? AND status IN ('pending', 'available', 'kosong') LIMIT 1
          )
        `).run(kosId);
      }

      // Sinkronkan sisa kamar_tersedia pada tabel kos
      await db.prepare(`
        UPDATE kos 
        SET kamar_tersedia = (SELECT COUNT(*) FROM kamar_kos WHERE kos_id = ? AND status IN ('available', 'kosong')) 
        WHERE id_kos = ?
      `).run(kosId, kosId);
    }
  });

  res.status(200).json({ ok: true, id_transaksi: id, status: 'approved', pesan: 'Pengajuan sewa kos berhasil disetujui dan kamar telah dikunci.' });
});

// Pemilik kost: tolak pengajuan sewa kos (eksekusi UPDATE ke database)
router.all(['/kos/pengajuan/:id/tolak', '/kos/pengajuan/:id/reject', '/pesanan-masuk/:id/tolak', '/pesanan-masuk/:id/reject'], userOrAdmin, async (req, res) => {
  const id = Number(req.params.id) || 1;
  const alasan = req.body?.alasan || 'Ditolak oleh pemilik kos';

  await tx(async () => {
    const pengajuan = await db.prepare('SELECT * FROM pengajuan_sewa_kos WHERE id_pengajuan=?').get(id)
                   || await db.prepare('SELECT * FROM pesanan WHERE id_pesanan=?').get(id);

    const isOwner = Boolean(req.uid && pengajuan && (Number(pengajuan.id_pemilik) === Number(req.uid) || Number(pengajuan.pemilik_id) === Number(req.uid)));
    if (!req.isAdmin && !isOwner) throw err(403, 'Hanya pemilik kos atau admin yang dapat menolak pengajuan ini');

    await db.prepare("UPDATE pengajuan_sewa_kos SET status='rejected' WHERE id_pengajuan=?").run(id);
    try {
      await db.prepare("UPDATE pesanan SET status='rejected' WHERE id_pesanan=?").run(id);
    } catch (e) {
      if (!(String(e?.message || e || '').toLowerCase().includes('no such table') && String(e?.message || e || '').includes('pesanan'))) throw e;
    }
    try {
      await db.prepare("UPDATE transaksi SET status='rejected', alasan_batal=? WHERE id_transaksi=?").run(alasan, id);
    } catch (e) {
      if (!(String(e?.message || e || '').toLowerCase().includes('no such table') && String(e?.message || e || '').includes('transaksi'))) throw e;
    }

    // Kembalikan status kamar jadi available
    if (pengajuan) {
      const kosId = pengajuan.kos_id || pengajuan.id_kos;
      const kamarRaw = String(pengajuan.kamar || '').trim();
      const cleanNo = kamarRaw.replace(/^Kamar\s*/i, '').trim();

      let rKamar = await db.prepare(`
        UPDATE kamar_kos 
        SET status = 'available' 
        WHERE kos_id = ? 
          AND (
            nomor_kamar = ? 
            OR nama = ? 
            OR nomor_kamar = ? 
            OR replace(nomor_kamar, 'Kamar ', '') = ?
            OR nomor_kamar LIKE ?
          )
      `).run(kosId, kamarRaw, kamarRaw, `Kamar ${cleanNo}`, cleanNo, `%${cleanNo}%`);

      if (rKamar.changes === 0) {
        await db.prepare(`
          UPDATE kamar_kos 
          SET status = 'available' 
          WHERE id = (
            SELECT id FROM kamar_kos WHERE kos_id = ? AND status = 'pending' LIMIT 1
          )
        `).run(kosId);
      }

      await db.prepare(`
        UPDATE kos 
        SET kamar_tersedia = (SELECT COUNT(*) FROM kamar_kos WHERE kos_id = ? AND status IN ('available', 'kosong')) 
        WHERE id_kos = ?
      `).run(kosId, kosId);
    }
  });

  res.status(200).json({ ok: true, id_transaksi: id, status: 'rejected', pesan: 'Pengajuan sewa kos telah ditolak.' });
});

// Public / Pemilik: ambil daftar kamar dari tabel kamar_kos
router.get(['/kos/:id/kamar', '/api/kos/:id/kamar', '/kamar-kos/:id'], async (req, res) => {
  const kosId = posInt(Number(req.params.id), 'id_kos');
  let rooms = await db.prepare('SELECT * FROM kamar_kos WHERE kos_id=? ORDER BY id ASC').all(kosId);
  if (rooms.length === 0) {
    rooms = await tx(async () => {
      const again = await db.prepare('SELECT * FROM kamar_kos WHERE kos_id=? ORDER BY id ASC').all(kosId);
      if (again.length > 0) return again;
      const k = await db.prepare('SELECT kamar_tersedia FROM kos WHERE id_kos=?').get(kosId);
      const n = Math.max(1, Number(k?.kamar_tersedia || 2));
      const stmtKamar = db.prepare('INSERT INTO kamar_kos (kos_id, property_id, nomor_kamar, nama, tipe, ukuran, status) VALUES (?, ?, ?, ?, ?, ?, ?)');
      for (let i = 1; i <= n; i++) {
        const roomName = `Kamar ${String(i).padStart(2, '0')}`;
        await stmtKamar.run(kosId, kosId, roomName, roomName, 'Standar', '3 × 3 m', 'available');
      }
      return await db.prepare('SELECT * FROM kamar_kos WHERE kos_id=? ORDER BY id ASC').all(kosId);
    });
  }
  res.json(rooms);
});

// Pemilik kost / Admin: tambah kamar baru ke properti
router.post(['/kos/:id/kamar', '/api/kos/:id/kamar'], userOrAdmin, async (req, res) => {
  const kosId = posInt(Number(req.params.id), 'id_kos');
  const nomorKamar = str(req.body?.nomor_kamar || req.body?.nama || 'Kamar Baru', 'nomor_kamar', 50);
  const tipe = optStr(req.body?.tipe, 'tipe', 50) || 'Standar';
  const ukuran = optStr(req.body?.ukuran, 'ukuran', 50) || '3 × 3 m';
  const status = 'available';

  const inserted = await tx(async () => {
    const k = await db.prepare('SELECT id_pemilik FROM kos WHERE id_kos=?').get(kosId);
    if (!k) throw err(404, 'kos tidak ada');
    if (!req.isAdmin && Number(k.id_pemilik) !== Number(req.uid)) throw err(403, 'bukan kos milik Anda');
    const r = await db.prepare('INSERT INTO kamar_kos (kos_id, property_id, nomor_kamar, nama, tipe, ukuran, status) VALUES (?, ?, ?, ?, ?, ?, ?)').run(kosId, kosId, nomorKamar, nomorKamar, tipe, ukuran, status);
    await db.prepare(`
      UPDATE kos 
      SET kamar_tersedia = (SELECT COUNT(*) FROM kamar_kos WHERE kos_id=? AND status IN ('available', 'kosong')) 
      WHERE id_kos=?
    `).run(kosId, kosId);
    return await db.prepare('SELECT * FROM kamar_kos WHERE id=?').get(r.lastInsertRowid);
  });
  res.status(201).json(inserted);
});

// Pemilik kost / Admin: update status kamar (available <-> booked)
router.patch(['/kamar-kos/:id/status', '/kos/kamar/:id/status'], userOrAdmin, async (req, res) => {
  const idKamar = posInt(Number(req.params.id), 'id_kamar');
  const updated = await tx(async () => {
    const targetRoom = await db.prepare('SELECT * FROM kamar_kos WHERE id=?').get(idKamar);
    if (!targetRoom) throw err(404, 'kamar tidak ditemukan');
    const k = await db.prepare('SELECT id_pemilik FROM kos WHERE id_kos=?').get(targetRoom.kos_id);
    if (!req.isAdmin && (!k || Number(k.id_pemilik) !== Number(req.uid))) throw err(403, 'bukan kos milik Anda');

    let newStatus = req.body?.status;
    if (!newStatus) {
      newStatus = (targetRoom.status === 'available' || targetRoom.status === 'kosong') ? 'booked' : 'available';
    } else {
      newStatus = oneOf(newStatus, 'status', ['available', 'booked', 'pending', 'kosong', 'terisi']);
      if (newStatus === 'kosong') newStatus = 'available';
      if (newStatus === 'terisi') newStatus = 'booked';
    }

    await db.prepare('UPDATE kamar_kos SET status=? WHERE id=?').run(newStatus, idKamar);
    // Update kamar_tersedia pada kos
    await db.prepare(`
      UPDATE kos 
      SET kamar_tersedia = (SELECT COUNT(*) FROM kamar_kos WHERE kos_id=? AND status IN ('available', 'kosong')) 
      WHERE id_kos=?
    `).run(targetRoom.kos_id, targetRoom.kos_id);
    return await db.prepare('SELECT * FROM kamar_kos WHERE id=?').get(idKamar);
  });
  res.json({ ok: true, kamar: updated });
});

// Public: detail kos
router.get('/kos/:id', async (req, res) => {
  const id = posInt(Number(req.params.id), 'id_kos');
  const k = await db.prepare(
    `SELECT k.*, 
            CASE 
              WHEN (SELECT COUNT(*) FROM kamar_kos WHERE kos_id = k.id_kos) > 0 
              THEN (SELECT COUNT(*) FROM kamar_kos WHERE kos_id = k.id_kos AND status IN ('available', 'kosong'))
              ELSE COALESCE(k.kamar_tersedia, 0)
            END AS kamar_tersedia,
            (SELECT COUNT(*) FROM kamar_kos WHERE kos_id = k.id_kos) AS total_kamar,
            m.nama AS nama_pemilik, m.email AS email_pemilik, m.no_hp AS no_hp_pemilik
     FROM kos k JOIN mahasiswa m ON k.id_pemilik = m.id_mahasiswa
     WHERE k.id_kos=?`
  ).get(id);
  if (!k) throw err(404, 'kos tidak ada');
  const rooms = await db.prepare('SELECT * FROM kamar_kos WHERE kos_id=? ORDER BY id ASC').all(id);
  res.json({ ...k, kamar: rooms });
});

// Pemilik kost: buat kos baru (mendukung upload foto Cloudinary)
router.post('/kos', user, pemilikKost, upload.array('foto', 5), async (req, res) => {
  const nama_kos = str(req.body?.nama_kos, 'nama_kos', 200);
  const deskripsi = optStr(req.body?.deskripsi, 'deskripsi', 2000);
  const alamat = str(req.body?.alamat, 'alamat', 200);
  const harga_bulan = posInt(Number(req.body?.harga_bulan), 'harga_bulan', 100_000_000);
  const fasilitas = optStr(req.body?.fasilitas, 'fasilitas', 500);
  const jenis_kelamin = oneOf(req.body?.jenis_kelamin ?? req.body?.tipe_kos ?? req.body?.tipe ?? 'campur', 'jenis_kelamin', JENIS_KELAMIN);
  const tipe_kos = jenis_kelamin;
  const kamar_tersedia = req.body?.kamar_tersedia != null 
    ? posInt(Number(req.body.kamar_tersedia), 'kamar_tersedia', 1000) 
    : (req.body?.jumlah_kamar != null ? posInt(Number(req.body.jumlah_kamar), 'jumlah_kamar', 1000) : 0);
  const status_kos = oneOf(req.body?.status_kos ?? 'tersedia', 'status_kos', ['tersedia', 'tidak_tersedia']);
  const foto = await simpanFotosCloudinary(req.body?.foto, req.files);
  const latNum = req.body?.latitude != null && req.body.latitude !== ''
    ? Number(req.body.latitude)
    : (req.body?.lokasi_lat != null && req.body.lokasi_lat !== '' ? Number(req.body.lokasi_lat) : null);
  const lngNum = req.body?.longitude != null && req.body.longitude !== ''
    ? Number(req.body.longitude)
    : (req.body?.lokasi_lng != null && req.body.lokasi_lng !== '' ? Number(req.body.lokasi_lng) : null);
  const latitude = latNum != null && !isNaN(latNum) ? latNum : null;
  const longitude = lngNum != null && !isNaN(lngNum) ? lngNum : null;
  const lokasi_lat = latitude;
  const lokasi_lng = longitude;

  const status_postingan = 'pending';
  const status_verifikasi = 'pending';

  const r = await db.prepare(
    `INSERT INTO kos (id_pemilik,nama_kos,deskripsi,alamat,harga_bulan,fasilitas,status_kos,status_verifikasi,status_postingan,jenis_kelamin,tipe_kos,kamar_tersedia,foto,latitude,longitude,lokasi_lat,lokasi_lng)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(req.uid, nama_kos, deskripsi, alamat, harga_bulan, fasilitas, status_kos, status_verifikasi, status_postingan, jenis_kelamin, tipe_kos, kamar_tersedia, foto, latitude, longitude, lokasi_lat, lokasi_lng);
  const idKos = Number(r.lastInsertRowid);

  // Perulangan (loop) di Backend saat insert properti kos baru untuk otomatis membuat N baris di tabel kamar_kos ("Kamar 01"..."Kamar 0N") dengan status available
  const stmtKamar = db.prepare('INSERT INTO kamar_kos (kos_id, property_id, nomor_kamar, nama, tipe, ukuran, status) VALUES (?, ?, ?, ?, ?, ?, ?)');
  for (let i = 1; i <= kamar_tersedia; i++) {
    const roomName = `Kamar ${String(i).padStart(2, '0')}`;
    await stmtKamar.run(idKos, idKos, roomName, roomName, 'Standar', '3 × 3 m', 'available');
  }

  res.status(201).json({
    id: idKos,
    status_postingan: 'pending',
    kamar_tersedia,
    pesan: 'Kos berhasil diunggah dan sedang menunggu persetujuan Admin sebelum tayang di pencarian.'
  });
});

// Pemilik kost: edit kos miliknya
router.patch('/kos/:id', user, pemilikKost, upload.array('foto', 5), async (req, res) => {
  const id = posInt(Number(req.params.id), 'id_kos');
  const k = await db.prepare('SELECT * FROM kos WHERE id_kos=?').get(id);
  if (!k) throw err(404, 'kos tidak ada');
  if (k.id_pemilik !== req.uid) throw err(403, 'bukan kos milik Anda');

  const updates = [];
  const values = [];
  const setField = (field, val) => {
    if (val !== undefined) { updates.push(`${field}=?`); values.push(val); }
  };

  setField('nama_kos', str(req.body?.nama_kos, 'nama_kos', 200));
  setField('deskripsi', optStr(req.body?.deskripsi, 'deskripsi', 2000));
  setField('alamat', str(req.body?.alamat, 'alamat', 200));
  setField('harga_bulan', req.body?.harga_bulan != null ? posInt(Number(req.body.harga_bulan), 'harga_bulan', 100_000_000) : undefined);
  setField('fasilitas', optStr(req.body?.fasilitas, 'fasilitas', 500));
  setField('status_kos', req.body?.status_kos != null ? oneOf(req.body.status_kos, 'status_kos', ['tersedia', 'tidak_tersedia']) : undefined);
  if (req.body?.jenis_kelamin != null || req.body?.tipe_kos != null || req.body?.tipe != null) {
    const val = oneOf(req.body?.jenis_kelamin ?? req.body?.tipe_kos ?? req.body?.tipe, 'jenis_kelamin', JENIS_KELAMIN);
    setField('jenis_kelamin', val);
    setField('tipe_kos', val);
  }
  setField('kamar_tersedia', req.body?.kamar_tersedia != null ? posInt(Number(req.body.kamar_tersedia), 'kamar_tersedia', 1000) : undefined);
  if (req.body?.foto !== undefined || (req.files && req.files.length > 0)) {
    setField('foto', await simpanFotosCloudinary(req.body?.foto, req.files));
  }

  if (req.body?.latitude !== undefined || req.body?.lokasi_lat !== undefined) {
    const lVal = req.body?.latitude ?? req.body?.lokasi_lat;
    const lNum = lVal != null && lVal !== '' ? Number(lVal) : null;
    setField('latitude', lNum);
    setField('lokasi_lat', lNum);
  }
  if (req.body?.longitude !== undefined || req.body?.lokasi_lng !== undefined) {
    const lVal = req.body?.longitude ?? req.body?.lokasi_lng;
    const lNum = lVal != null && lVal !== '' ? Number(lVal) : null;
    setField('longitude', lNum);
    setField('lokasi_lng', lNum);
  }

  if (updates.length === 0) throw err(400, 'tidak ada field yang diubah');
  values.push(id);

  await db.prepare(`UPDATE kos SET ${updates.join(', ')} WHERE id_kos=?`).run(...values);
  res.json(await db.prepare('SELECT * FROM kos WHERE id_kos=?').get(id));
});

// Pemilik kost: hapus kos miliknya
router.delete('/kos/:id', user, pemilikKost, async (req, res) => {
  const id = posInt(Number(req.params.id), 'id_kos');
  const k = await db.prepare('SELECT * FROM kos WHERE id_kos=?').get(id);
  if (!k) throw err(404, 'kos tidak ada');
  if (k.id_pemilik !== req.uid) throw err(403, 'bukan kos milik Anda');
  await db.prepare('DELETE FROM kos WHERE id_kos=?').run(id);
  res.json({ ok: true });
});
