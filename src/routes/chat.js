import { Router } from 'express';
import multer from 'multer';
import { db, tx } from '../db.js';
import { user } from '../auth.js';
import { err, posInt } from '../util.js';
import { uploadFileToCloudinary, CHAT_FILE_MAX, CHAT_FILE_MIME } from '../upload.js';

export const router = Router();

const uploadChatFile = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: CHAT_FILE_MAX, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype || !CHAT_FILE_MIME.has(file.mimetype)) {
      return cb(Object.assign(new Error('Tipe file tidak didukung (izinkan: gambar, PDF, Word, Excel, TXT)'), { status: 400 }));
    }
    cb(null, true);
  },
});

// Setiap objek pesan dikirim dengan dua nama field: `id_pengirim` (asli DB)
// dan `sender_id` (alias eksplisit untuk frontend), supaya klien bisa memakai
// salah satunya tanpa menebak struktur data.
const denganSenderId = (m) => (m && typeof m === 'object' ? { ...m, sender_id: m.id_pengirim } : m);

function snippetPesan(m) {
  if (!m) return '';
  if (m.tipe_pesan === 'image') return '[Foto]';
  if (m.tipe_pesan === 'file') return `[Dokumen] ${m.file_name || ''}`.trim();
  return m.pesan || '';
}

// Otorisasi terpusat: room hanya boleh diakses oleh pembeli atau penjualnya.
// Dipakai oleh SEMUA endpoint detail, riwayat pesan, dan kirim pesan agar tidak
// ada endpoint yang lupa memeriksa kepemilikan room.
async function ambilRoomAman(uid, id_room) {
  const room = await db.prepare('SELECT * FROM chat_rooms WHERE id_room = ?').get(id_room);
  if (!room) throw err(404, 'Ruang chat tidak ditemukan');
  if (room.id_pembeli !== uid && room.id_penjual !== uid) {
    throw err(403, 'Akses ruang chat ditolak');
  }
  return room;
}

// Helper untuk menemukan atau membuat chat room
async function cariAtauBuatRoom(uid, body = {}, query = {}) {
  const tipe = String(body.tipe_referensi || body.tipe || query.tipe_referensi || query.tipe || (body.id_barang || query.id_barang ? 'barang' : (body.id_kos || query.id_kos ? 'kos' : 'umum'))).toLowerCase();
  const id_ref = body.id_referensi ? Number(body.id_referensi) : (body.id_barang ? Number(body.id_barang) : (body.id_kos ? Number(body.id_kos) : (body.id ? Number(body.id) : (query.id ? Number(query.id) : (query.id_referensi ? Number(query.id_referensi) : null)))));
  let id_penjual = body.id_lawan ? Number(body.id_lawan) : (body.id_penjual ? Number(body.id_penjual) : (query.id_lawan ? Number(query.id_lawan) : null));

  if (tipe === 'barang') {
    if (!id_ref) throw err(400, 'id_referensi barang diperlukan');
    const b = await db.prepare(`
      SELECT b.id_barang, b.nama_barang, p.nama AS nama_penjual, p.email, p.no_hp
      FROM barang b
      JOIN penjual p USING (id_penjual)
      WHERE b.id_barang = ?
    `).get(id_ref);
    if (!b) throw err(404, 'Barang tidak ditemukan');

    // Cari akun mahasiswa dari email penjual
    id_penjual = await tx(async () => {
      let mhsPenjual = await db.prepare('SELECT id_mahasiswa FROM mahasiswa WHERE email = ?').get(b.email);
      if (mhsPenjual) return mhsPenjual.id_mahasiswa;
      try {
        const r = await db.prepare(`
          INSERT INTO mahasiswa (nama, email, password_hash, no_hp, kampus, role)
          VALUES (?, ?, 'seed_account', ?, 'ITG Garut', 'pelanggan')
        `).run(b.nama_penjual, b.email, b.no_hp || '081234567890');
        return Number(r.lastInsertRowid);
      } catch (_e) {
        mhsPenjual = await db.prepare('SELECT id_mahasiswa FROM mahasiswa WHERE email = ?').get(b.email);
        if (mhsPenjual) return mhsPenjual.id_mahasiswa;
        throw _e;
      }
    });
  } else if (tipe === 'kos') {
    if (!id_ref) throw err(400, 'id_referensi kos diperlukan');
    const k = await db.prepare('SELECT id_kos, id_pemilik, nama_kos FROM kos WHERE id_kos = ?').get(id_ref);
    if (!k) throw err(404, 'Kos tidak ditemukan');
    id_penjual = k.id_pemilik;
  }

  if (!id_penjual) {
    throw err(400, 'ID penjual / lawan bicara tidak valid');
  }

  if (id_penjual === uid) {
    throw err(400, 'Anda adalah pemilik dari postingan ini');
  }

  // Cek apakah room sudah ada (atomik + dijaga UNIQUE index)
  const room = await tx(async () => {
    const find = () => db.prepare(`
      SELECT * FROM chat_rooms
      WHERE ((id_pembeli = ? AND id_penjual = ?) OR (id_pembeli = ? AND id_penjual = ?))
        AND tipe_referensi = ?
        AND (id_referensi = ? OR (id_referensi IS NULL AND ? IS NULL))
      LIMIT 1
    `).get(uid, id_penjual, id_penjual, uid, tipe, id_ref, id_ref);
    let r0 = await find();
    if (r0) return r0;
    try {
      const r = await db.prepare(`
        INSERT INTO chat_rooms (id_pembeli, id_penjual, tipe_referensi, id_referensi)
        VALUES (?, ?, ?, ?)
      `).run(uid, id_penjual, tipe, id_ref);
      return await db.prepare('SELECT * FROM chat_rooms WHERE id_room = ?').get(Number(r.lastInsertRowid));
    } catch (e) {
      r0 = await find();
      if (r0) return r0;
      throw e;
    }
  });

  return room;
}

// Handler untuk membuat / menemukan room
const handleCreateRoom = async (req, res) => {
  const room = await cariAtauBuatRoom(req.uid, req.body || {}, req.query || {});
  res.json({
    ok: true,
    id_room: room.id_room,
    ...room
  });
};

// 1. Endpoint Buat / Temukan Chat Room (dukung POST dan GET untuk sinkronisasi pemanggilan)
router.post(['/room', '/rooms', '/'], user, handleCreateRoom);
router.get('/room', user, handleCreateRoom);

// Handler untuk mendapatkan inbox list
const handleGetRooms = async (req, res) => {
  // Jika parameter barang/kos ada di query GET /chat?id_barang=1, cari/buat room langsung
  if (req.query?.id_barang || req.query?.id_kos || (req.query?.tipe && req.query?.id)) {
    const room = await cariAtauBuatRoom(req.uid, {}, req.query);
    return res.json({ ok: true, id_room: room.id_room, ...room });
  }

  const rows = await db.prepare(`
    SELECT r.*,
           (SELECT COALESCE(NULLIF(pesan,''), CASE WHEN tipe_pesan='image' THEN '[Foto]' WHEN tipe_pesan='file' THEN '[Dokumen] ' || COALESCE(file_name,'') ELSE '' END)
              FROM chat_messages m WHERE m.id_room = r.id_room ORDER BY m.id_pesan DESC LIMIT 1) AS last_message,
           (SELECT created_at FROM chat_messages m WHERE m.id_room = r.id_room ORDER BY m.id_pesan DESC LIMIT 1) AS last_message_time,
           (SELECT id_pengirim FROM chat_messages m WHERE m.id_room = r.id_room ORDER BY m.id_pesan DESC LIMIT 1) AS last_message_sender,
           (SELECT COUNT(*) FROM chat_messages m WHERE m.id_room = r.id_room AND m.id_pengirim != ? AND m.is_read = 0) AS unread_count
    FROM chat_rooms r
    WHERE r.id_pembeli = ? OR r.id_penjual = ?
    ORDER BY r.updated_at DESC
  `).all(req.uid, req.uid, req.uid);

  const rooms = [];
  for (const r of rows) {
    const id_lawan = r.id_pembeli === req.uid ? r.id_penjual : r.id_pembeli;
    const lawan = await db.prepare(`
      SELECT id_mahasiswa, nama, email, role, kampus, foto
      FROM mahasiswa
      WHERE id_mahasiswa = ?
    `).get(id_lawan) || { id_mahasiswa: id_lawan, nama: 'Pengguna', role: 'pelanggan' };

    let reference = null;
    if (r.tipe_referensi === 'barang' && r.id_referensi) {
      reference = await db.prepare(`
        SELECT id_barang, nama_barang, harga_sewa, harga_jual, status, foto
        FROM barang
        WHERE id_barang = ?
      `).get(r.id_referensi);
    } else if (r.tipe_referensi === 'kos' && r.id_referensi) {
      reference = await db.prepare(`
        SELECT id_kos, nama_kos, harga_bulan, status_kos, foto, alamat
        FROM kos
        WHERE id_kos = ?
      `).get(r.id_referensi);
    }

    rooms.push({
      id_room: r.id_room,
      id_pembeli: r.id_pembeli,
      id_penjual: r.id_penjual,
      tipe_referensi: r.tipe_referensi,
      id_referensi: r.id_referensi,
      created_at: r.created_at,
      updated_at: r.updated_at,
      last_message: r.last_message || null,
      last_message_time: r.last_message_time || r.created_at,
      last_message_sender: r.last_message_sender || null,
      unread_count: Number(r.unread_count || 0),
      lawan,
      reference
    });
  }

  res.json({ ok: true, rooms });
};

// 2. Daftar Inbox Chat User (semua room aktif milik req.uid)
router.get(['/rooms', '/'], user, handleGetRooms);

// Handler untuk detail chat room & pesan
const handleGetRoomDetail = async (req, res) => {
  const id_room = posInt(Number(req.params.id || req.query.id_room || req.query.room), 'id_room');
  const room = await ambilRoomAman(req.uid, id_room);

  // Tandai pesan dari lawan bicara sebagai sudah dibaca
  await db.prepare(`
    UPDATE chat_messages
    SET is_read = 1
    WHERE id_room = ? AND id_pengirim != ? AND is_read = 0
  `).run(id_room, req.uid);

  const after = req.query.after ? Number(req.query.after) : null;
  let messages = [];
  if (after && !isNaN(after)) {
    messages = await db.prepare(`
      SELECT * FROM chat_messages
      WHERE id_room = ? AND id_pesan > ?
      ORDER BY id_pesan ASC
    `).all(id_room, after);
  } else {
    messages = await db.prepare(`
      SELECT * FROM chat_messages
      WHERE id_room = ?
      ORDER BY id_pesan ASC
      LIMIT 200
    `).all(id_room);
  }

  const id_lawan = room.id_pembeli === req.uid ? room.id_penjual : room.id_pembeli;
  const lawan = await db.prepare(`
    SELECT id_mahasiswa, nama, email, role, kampus, foto
    FROM mahasiswa
    WHERE id_mahasiswa = ?
  `).get(id_lawan) || { id_mahasiswa: id_lawan, nama: 'Pengguna', role: 'pelanggan' };

  let reference = null;
  if (room.tipe_referensi === 'barang' && room.id_referensi) {
    reference = await db.prepare(`
      SELECT id_barang, nama_barang, harga_sewa, harga_jual, status, foto, lokasi
      FROM barang
      WHERE id_barang = ?
    `).get(room.id_referensi);
  } else if (room.tipe_referensi === 'kos' && room.id_referensi) {
    reference = await db.prepare(`
      SELECT id_kos, nama_kos, harga_bulan, status_kos, foto, alamat
      FROM kos
      WHERE id_kos = ?
    `).get(room.id_referensi);
  }

  res.json({
    ok: true,
    id_room: room.id_room,
    room,
    lawan,
    reference,
    messages: messages.map(denganSenderId)
  });
};

// Handler untuk pengiriman pesan
const handleSendMessage = async (req, res) => {
  const id_room = posInt(Number(req.params.id || req.body?.id_room || req.body?.room), 'id_room');
  await ambilRoomAman(req.uid, id_room);

  const body = req.body || {};
  const raw = (body.pesan ?? body.message ?? body.text ?? '');
  const text = typeof raw === 'string' ? raw.trim().slice(0, 2000) : '';

  let tipe_pesan = 'teks';
  let file_url = null, file_name = null, file_type = null, file_size = null;

  if (req.file && req.file.buffer) {
    file_type = req.file.mimetype;
    file_size = Number(req.file.size || req.file.buffer.length || 0);
    if (file_size > CHAT_FILE_MAX) throw err(400, 'Ukuran file maksimal 5 MB');
    file_name = String(req.file.originalname || 'file').slice(0, 200);
    file_url = await uploadFileToCloudinary(req.file.buffer, file_type, file_name);
    tipe_pesan = /^image\//i.test(file_type) ? 'image' : 'file';
  } else if (text) {
    // teks saja
  } else {
    throw err(400, 'Pesan atau file wajib diisi');
  }

  const message = await tx(async () => {
    const r = await db.prepare(`
      INSERT INTO chat_messages (id_room, id_pengirim, pesan, tipe_pesan, file_url, file_name, file_type, file_size)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id_room, req.uid, text || '', tipe_pesan, file_url, file_name, file_type, file_size);
    // Perbarui updated_at room agar naik ke urutan paling atas di Inbox
    await db.prepare('UPDATE chat_rooms SET updated_at = CURRENT_TIMESTAMP WHERE id_room = ?').run(id_room);
    return await db.prepare('SELECT * FROM chat_messages WHERE id_pesan = ?').get(Number(r.lastInsertRowid));
  });

  res.status(201).json(denganSenderId(message));
};

// 4. Kirim Pesan Real User ke Room
const msgUpload = (req, res, next) => uploadChatFile.single('file')(req, res, (e) => {
  if (!e) return next();
  if (e instanceof multer.MulterError) return next(err(400, e.code === 'LIMIT_FILE_SIZE' ? 'Ukuran file maksimal 5 MB' : e.message));
  return next(e.status ? e : err(400, e.message || 'Upload file gagal'));
});
router.post(['/rooms/:id/messages', '/room/:id/messages', '/:id/messages', '/messages'], user, msgUpload, handleSendMessage);

// Handler untuk riwayat pesan saja
const handleGetMessagesOnly = async (req, res) => {
  const id_room = posInt(Number(req.params.id || req.query.id_room || req.query.room), 'id_room');
  await ambilRoomAman(req.uid, id_room);

  const after = req.query.after ? Number(req.query.after) : null;
  let messages = [];
  if (after && !isNaN(after)) {
    messages = await db.prepare(`
      SELECT * FROM chat_messages
      WHERE id_room = ? AND id_pesan > ?
      ORDER BY id_pesan ASC
    `).all(id_room, after);
  } else {
    messages = await db.prepare(`
      SELECT * FROM chat_messages
      WHERE id_room = ?
      ORDER BY id_pesan ASC
      LIMIT 200
    `).all(id_room);
  }

  res.json({ ok: true, id_room, messages: messages.map(denganSenderId) });
};

// 5. Riwayat Pesan saja
router.get(['/rooms/:id/messages', '/room/:id/messages', '/:id/messages', '/messages'], user, handleGetMessagesOnly);

// 3. Detail Chat Room & Riwayat Pesan
router.get(['/rooms/:id', '/room/:id', '/:id'], user, handleGetRoomDetail);
