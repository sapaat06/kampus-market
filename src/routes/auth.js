import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { db } from '../db.js';
import { err, str, optStr, emailOf, posInt, oneOf } from '../util.js';
import { hash, verify, makeToken, user, admin } from '../auth.js';
import { limit } from '../limit.js';
import { upload, uploadToCloudinary } from '../upload.js';

export const router = Router();

// Sesi disimpan di cookie httpOnly; token di JSON dipertahankan untuk klien API.
const SESI = {
  httpOnly: true,
  sameSite: 'strict',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 864e5,
  path: '/',
};

const mulaiSesi = (res, id) => {
  const token = makeToken(id);
  res.cookie('km_token', token, SESI);
  return token;
};

const passwordOf = (v) => {
  if (typeof v !== 'string') throw err(400, 'password harus teks');
  if (v.length < 8) throw err(400, 'password minimal 8 karakter');
  if (v.length > 200) throw err(400, 'password maksimal 200 karakter');
  return v;
};

router.post('/register', limit({ name: 'register', max: 10, windowMs: 3600e3 }), upload.single('ktm'), async (req, res) => {
  const nama = str(req.body?.nama, 'nama', 100);
  const email = emailOf(req.body?.email);
  const password = passwordOf(req.body?.password);

  const rawHp = String(req.body?.whatsapp_number || req.body?.no_hp || req.body?.phone || '').trim();
  let no_hp = null;
  let whatsapp_number = null;
  if (rawHp) {
    const digitsOnly = rawHp.replace(/\D/g, '');
    if (digitsOnly.length < 10) throw err(400, 'Nomor WhatsApp minimal 10 digit angka');
    no_hp = rawHp;
    whatsapp_number = rawHp;
  }

  // KTM bisa dikirim via multipart file atau data URL base64, simpan secure_url ke Cloudinary jika tersedia
  let rawKtm = req.file ? req.file.buffer : optStr(req.body?.ktm, 'ktm', 800_000);
  const ktm = rawKtm ? await uploadToCloudinary(rawKtm, req.file?.mimetype) : null;
  const kampus = optStr(req.body?.kampus, 'kampus', 120);
  const rawRole = req.body?.role ?? 'mahasiswa';
  let role = 'mahasiswa';
  if (rawRole === 'pemilik_kost' || rawRole === 'pemilik' || rawRole === 'kost') {
    role = 'pemilik_kost';
  } else if (rawRole === 'admin') {
    role = 'admin';
  } else if (rawRole === 'pelanggan') {
    role = 'pelanggan';
  } else {
    role = 'mahasiswa';
  }

  const status_akun = 'pending';
  const status_verifikasi = 'pending';

  const existing = await db.prepare('SELECT id_mahasiswa FROM mahasiswa WHERE LOWER(TRIM(email))=LOWER(TRIM(?))').get(email);
  if (existing) throw err(409, 'Email kampus sudah terdaftar. Silakan gunakan email lain atau langsung masuk.');
  const r = await db.prepare(
    'INSERT INTO mahasiswa (nama,email,no_hp,whatsapp_number,password_hash,ktm,kampus,role,status_akun,status_verifikasi,submitted_at) VALUES (?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)'
  ).run(nama, email, no_hp, whatsapp_number, hash(password), ktm, kampus, role, status_akun, status_verifikasi);
  const id = Number(r.lastInsertRowid);
  const pesan = role === 'pemilik_kost'
    ? 'Pendaftaran berhasil. Akun Anda sedang direview oleh Admin.'
    : 'Pendaftaran berhasil. Silakan verifikasi KTM Anda.';
  res.status(201).json({
    id_mahasiswa: id,
    id: id,
    role: role,
    status_akun: status_akun,
    status_verifikasi: status_verifikasi,
    token: mulaiSesi(res, id),
    pesan: pesan,
    message: pesan
  });
});

router.post('/login', limit({ name: 'login', max: process.env.NODE_ENV === 'production' ? 10 : 100, windowMs: 900e3 }), async (req, res) => {
  const email = emailOf(req.body?.email);
  const password = req.body?.password;
  if (typeof password !== 'string') throw err(400, 'password harus teks');
  const m = await db.prepare('SELECT id_mahasiswa, nama, password_hash, role, status_akun, status_verifikasi, alasan_penolakan, is_banned FROM mahasiswa WHERE LOWER(TRIM(email))=LOWER(TRIM(?))').get(email);
  if (!m || !verify(password, m.password_hash)) throw err(401, 'email atau password salah');
  if (m.is_banned) throw err(403, 'Akun Anda telah diblokir oleh admin.');

  // Validasi Keamanan Lapis Dua: intended_role dari pintu login frontend
  const intended_role = req.body?.intended_role;
  if (intended_role) {
    const userRole = m.role || 'mahasiswa';
    const isMahasiswa = userRole === 'mahasiswa' || userRole === 'pelanggan';
    const isPemilik = userRole === 'pemilik_kost';
    const isAdmin = userRole === 'admin';

    if (intended_role === 'mahasiswa' || intended_role === 'pelanggan') {
      if (!isMahasiswa && !isAdmin) {
        throw err(403, 'Role tidak sesuai dengan pintu login');
      }
    } else if (intended_role === 'pemilik_kost') {
      if (!isPemilik && !isAdmin) {
        throw err(403, 'Role tidak sesuai dengan pintu login');
      }
    } else if (intended_role === 'admin') {
      if (!isAdmin) {
        throw err(403, 'Role tidak sesuai dengan pintu login');
      }
    } else if (intended_role !== userRole && !isAdmin) {
      throw err(403, 'Role tidak sesuai dengan pintu login');
    }
  }

  // Validasi status verifikasi pendaftaran akun dan status_akun
  const statusAkun = String(m.status_akun || '').toLowerCase().trim();
  const statusVerif = String(m.status_verifikasi || '').toLowerCase().trim();

  const isApproved = statusAkun === 'approved' || statusVerif === 'terverifikasi' || statusVerif === 'verified';
  const isRejected = !isApproved && (statusAkun === 'rejected' || statusVerif === 'ditolak' || statusVerif === 'rejected');

  // Tolak login jika akun ditolak oleh admin
  if (isRejected) {
    const alasan = m.alasan_penolakan ? ` Alasan: ${m.alasan_penolakan}` : '';
    throw err(403, `Mohon maaf, pendaftaran akun Anda ditolak oleh admin.${alasan}`);
  }

  // Tolak login jika belum disetujui (masih pending)
  if (!isApproved) {
    if (m.role === 'pemilik_kost') {
      throw err(403, 'Akun Pemilik Kost Anda belum diverifikasi oleh Admin. Silakan tunggu.');
    }
    throw err(403, 'Akun Anda sedang dalam tinjauan admin dan belum disetujui. Silakan tunggu verifikasi.');
  }

  res.json({
    token: mulaiSesi(res, m.id_mahasiswa),
    role: m.role,
    status_akun: m.status_akun || 'approved',
    status_verifikasi: m.status_verifikasi,
    user: {
      id: m.id_mahasiswa,
      id_mahasiswa: m.id_mahasiswa,
      nama: m.nama,
      email: email,
      role: m.role
    }
  });
});

router.post('/reset-password', limit({ name: 'reset-pw', max: 5, windowMs: 900e3 }), (_req, _res) => {
  throw err(503, 'atur ulang kata sandi belum tersedia; hubungi admin kampus');
});

router.post('/logout', (_req, res) => {
  res.clearCookie('km_token', { path: '/', httpOnly: true, sameSite: 'strict', secure: SESI.secure });
  res.json({ ok: true });
});

router.get(['/saya', '/me'], user, async (req, res) => {
  const m = await db.prepare(
    'SELECT id_mahasiswa,nama,email,no_hp,whatsapp_number,ktm,kampus,status_verifikasi,foto,role FROM mahasiswa WHERE id_mahasiswa=?'
  ).get(req.uid);
  if (!m) throw err(404, 'akun tidak ada');
  const gpRow = await db.prepare('SELECT COALESCE(SUM(jumlah_poin),0) s FROM poin WHERE id_mahasiswa=?').get(req.uid);
  m.green_points = gpRow ? gpRow.s : 0;
  m.riwayat_poin = await db.prepare('SELECT * FROM poin WHERE id_mahasiswa=? ORDER BY id_poin DESC').all(req.uid);
  const txRows = await db.prepare(
    `SELECT t.*, b.nama_barang FROM transaksi t JOIN barang b USING (id_barang)
     WHERE t.id_mahasiswa=? ORDER BY t.id_transaksi DESC`
  ).all(req.uid);

  for (const txItem of txRows) {
    const isCod = /cod|cash|bayar\s*di\s*tempat|tunai/i.test(txItem.metode_pembayaran || '');
    if (isCod && (!txItem.cod_pin || String(txItem.cod_pin).trim() === '')) {
      const generatedPin = String(Math.floor(1000 + Math.random() * 9000));
      await db.prepare('UPDATE transaksi SET cod_pin=? WHERE id_transaksi=?').run(generatedPin, txItem.id_transaksi);
      txItem.cod_pin = generatedPin;
    }
  }
  m.transaksi = txRows.map(txItem => ({ ...txItem, is_pembeli: true }));

  const pRecord = await db.prepare('SELECT id_penjual FROM penjual WHERE email=?').get(m.email);
  if (pRecord) {
    const pRows = await db.prepare(
      `SELECT t.*, b.nama_barang, m2.nama AS nama_pembeli
       FROM transaksi t
       JOIN barang b USING (id_barang)
       JOIN mahasiswa m2 ON t.id_mahasiswa = m2.id_mahasiswa
       WHERE b.id_penjual=? ORDER BY t.id_transaksi DESC`
    ).all(pRecord.id_penjual);
    m.transaksi_penjualan = pRows.map(txItem => ({ ...txItem, cod_pin: null, is_penjual: true }));
  } else {
    m.transaksi_penjualan = [];
  }

  // Pengajuan sewa kos milik akun ini
  try {
    const kosSewas = await db.prepare(`
      SELECT p.*, k.foto AS foto_kos, k.alamat AS alamat_kos, k.harga_bulan
      FROM pengajuan_sewa_kos p
      LEFT JOIN kos k USING (id_kos)
      WHERE p.email_penyewa = ?
      ORDER BY p.id_pengajuan DESC
    `).all(m.email);
    m.pengajuan_kos = kosSewas;

    const mappedKosTxs = kosSewas.map(pk => ({
      id_transaksi: `KST-${pk.id_pengajuan}`,
      id_pengajuan: pk.id_pengajuan,
      id_kos: pk.id_kos,
      id_barang: null,
      jenis_transaksi: 'sewa',
      nama_barang: `${pk.nama_kos} (${pk.kamar})`,
      foto: pk.foto_kos || '/img/kos-damar-asri.png',
      harga_sewa: pk.harga_bulan || Math.round(pk.total_harga / (pk.durasi_bulan || 1)),
      total_harga: pk.total_harga,
      durasi_sewa: `${pk.durasi_bulan} bulan`,
      periode_sewa: pk.periode,
      status: pk.status,
      lokasi: pk.alamat_kos || 'Institut Teknologi Garut',
      tanggal_transaksi: pk.created_at,
      is_kos: true,
      is_pembeli: true
    }));
    m.transaksi = [...mappedKosTxs, ...m.transaksi];
  } catch (_e) {}

  res.json(m);
});

// Cek status verifikasi publik (bisa via sesi user atau query nama / email)
router.get('/status-verifikasi', async (req, res) => {
  let m = null;
  const bearer = (req.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  const rawCookie = req.headers?.cookie || '';
  let cookieToken = '';
  for (const part of rawCookie.split(';')) {
    const [nama, ...val] = part.trim().split('=');
    if (nama === 'km_token') cookieToken = val.join('=');
  }
  const tokenStr = bearer || cookieToken;
  const match = /^(\d{1,15})\./.exec(tokenStr);
  if (match) {
    const uid = Number(match[1]);
    m = await db.prepare('SELECT id_mahasiswa, nama, email, status_verifikasi, role FROM mahasiswa WHERE id_mahasiswa=?').get(uid);
  }
  if (!m && typeof req.query.email === 'string' && req.query.email.trim()) {
    m = await db.prepare('SELECT id_mahasiswa, nama, email, status_verifikasi, role FROM mahasiswa WHERE LOWER(TRIM(email))=LOWER(TRIM(?))').get(req.query.email.trim());
  }
  if (!m && typeof req.query.nama === 'string' && req.query.nama.trim()) {
    m = await db.prepare('SELECT id_mahasiswa, nama, email, status_verifikasi, role FROM mahasiswa WHERE LOWER(TRIM(nama))=LOWER(TRIM(?))').get(req.query.nama.trim());
  }
  if (!m) {
    return res.json({ status_verifikasi: 'pending' });
  }
  res.json(m);
});

// Validasi magic bytes file gambar (hanya jpeg, png, webp berdasarkan isi file)
function detectImageMime(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;
  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return 'image/jpeg';
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 &&
      buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A) return 'image/png';
  // WebP: RIFF....WEBP
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) return 'image/webp';
  return null;
}

// Hapus file lama dari disk dengan aman (cegah path traversal)
function hapusFileLokal(fotoPath) {
  if (!fotoPath || typeof fotoPath !== 'string') return;
  if (fotoPath.startsWith('http://') || fotoPath.startsWith('https://') || fotoPath.startsWith('data:')) return;
  try {
    const baseDir = path.resolve(process.cwd(), 'public');
    const cleanPath = path.normalize(fotoPath).replace(/^(\.\.(\/|\\|$))+/, '');
    const fullPath = path.resolve(baseDir, cleanPath.replace(/^[/\\]+/, ''));
    if (fullPath.startsWith(baseDir) && fullPath !== baseDir && fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (_e) {
    // Jangan gagal kalau file sudah tidak ada
  }
}

// Mahasiswa: unggah foto profil (mendukung multipart file atau base64)
const handleUploadFoto = async (req, res) => {
  let buffer = null;
  let mimeType = null;

  if (req.file && req.file.buffer) {
    buffer = req.file.buffer;
  } else if (req.body?.foto && typeof req.body.foto === 'string') {
    const raw = req.body.foto.trim();
    if (raw.startsWith('data:')) {
      const match = raw.match(/^data:image\/[a-zA-Z0-9+.-]+;base64,(.+)$/);
      if (!match) throw err(400, 'Format data URL tidak valid');
      buffer = Buffer.from(match[1], 'base64');
    } else {
      buffer = Buffer.from(raw, 'base64');
      if (!detectImageMime(buffer)) {
        buffer = Buffer.from(raw, 'utf8');
      }
    }
  } else {
    throw err(400, 'file foto wajib diunggah');
  }

  // Maksimal 5 MB
  if (buffer.length > 5 * 1024 * 1024) {
    throw err(400, 'Ukuran foto maksimal 5 MB');
  }

  // Validasi berdasarkan isi file (magic bytes)
  mimeType = detectImageMime(buffer);
  if (!mimeType) {
    throw err(400, 'Hanya gambar (JPEG, PNG, WebP) yang diizinkan');
  }

  // Hapus file lama jika ada agar tidak menumpuk
  const existing = await db.prepare('SELECT foto FROM mahasiswa WHERE id_mahasiswa=?').get(req.uid);
  if (existing?.foto) {
    hapusFileLokal(existing.foto);
  }

  const foto = await uploadToCloudinary(buffer, mimeType);
  await db.prepare('UPDATE mahasiswa SET foto=? WHERE id_mahasiswa=?').run(foto, req.uid);
  res.json({ ok: true, foto });
};

router.patch(['/profil/foto', '/saya/foto'], user, upload.single('foto'), handleUploadFoto);
router.post(['/profil/foto', '/saya/foto'], user, upload.single('foto'), handleUploadFoto);

// Mahasiswa: hapus foto profil milik user yang login saja
router.delete(['/profil/foto', '/saya/foto'], user, async (req, res) => {
  const existing = await db.prepare('SELECT foto FROM mahasiswa WHERE id_mahasiswa=?').get(req.uid);
  if (existing?.foto) {
    hapusFileLokal(existing.foto);
  }
  await db.prepare('UPDATE mahasiswa SET foto=NULL WHERE id_mahasiswa=?').run(req.uid);
  res.json({ ok: true, foto: null });
});

router.post('/verifikasi', user, upload.single('ktm'), async (req, res) => {
  let rawKtm = req.file ? req.file.buffer : (req.body?.ktm ? str(req.body?.ktm, 'ktm', 800_000) : null);
  if (!rawKtm) throw err(400, 'ktm wajib diunggah');
  const ktm = await uploadToCloudinary(rawKtm, req.file?.mimetype);
  await db.prepare("UPDATE mahasiswa SET ktm=?, status_verifikasi='pending', submitted_at=CURRENT_TIMESTAMP WHERE id_mahasiswa=?").run(ktm, req.uid);
  res.json({ ok: true, status_verifikasi: 'pending' });
});

// Admin: daftar semua mahasiswa beserta status verifikasi
router.get('/mahasiswa', admin, async (_req, res) => {
  res.json(await db.prepare(
    'SELECT id_mahasiswa, nama, email, no_hp, whatsapp_number, ktm, kampus, status_verifikasi, alasan_penolakan, is_banned, submitted_at, created_at FROM mahasiswa ORDER BY id_mahasiswa DESC'
  ).all());
});

// Admin: ubah status verifikasi mahasiswa (terverifikasi / ditolak / pending)
const handleVerifikasiMahasiswa = async (req, res) => {
  const id = posInt(Number(req.params.id), 'id_mahasiswa');
  let rawStatus = String(req.body?.status_verifikasi ?? req.body?.status ?? '').toLowerCase().trim();
  if (rawStatus === 'verified' || rawStatus === 'approve' || rawStatus === 'setujui' || rawStatus === 'izinkan') rawStatus = 'terverifikasi';
  if (rawStatus === 'rejected' || rawStatus === 'reject' || rawStatus === 'tolak') rawStatus = 'ditolak';
  const status = oneOf(rawStatus, 'status_verifikasi', ['pending', 'terverifikasi', 'ditolak']);
  const alasan = req.body?.alasan_penolakan || req.body?.alasan || req.body?.catatan ? String(req.body.alasan_penolakan || req.body.alasan || req.body.catatan).trim().slice(0, 500) : null;

  const statusAkun = status === 'terverifikasi' ? 'approved' : (status === 'ditolak' ? 'rejected' : 'pending');
  const r = await db.prepare('UPDATE mahasiswa SET status_verifikasi=?, status_akun=?, alasan_penolakan=? WHERE id_mahasiswa=?')
    .run(status, statusAkun, status === 'ditolak' ? (alasan || 'Dokumen belum memenuhi kriteria') : null, id);
  if (r.changes === 0) throw err(404, 'mahasiswa tidak ada');

  if (status === 'terverifikasi') {
    const existingPoin = await db.prepare("SELECT id_poin FROM poin WHERE id_mahasiswa=? AND keterangan='Bonus Verifikasi KTM'").get(id);
    if (!existingPoin) {
      await db.prepare("INSERT INTO poin (id_mahasiswa, id_transaksi, jumlah_poin, kategori, keterangan) VALUES (?, NULL, 15, 'bonus', 'Bonus Verifikasi KTM')").run(id);
    }
  }

  const m = await db.prepare('SELECT id_mahasiswa, nama, email, no_hp, whatsapp_number, ktm, kampus, status_verifikasi, alasan_penolakan, is_banned, submitted_at, created_at FROM mahasiswa WHERE id_mahasiswa=?').get(id);
  res.json({
    ok: true,
    ...m,
    mahasiswa: m,
    data: m,
    pesan: status === 'terverifikasi' ? 'Mahasiswa berhasil diverifikasi (+15 Green Point).' : 'Pengajuan mahasiswa ditolak.'
  });
};

router.patch(['/mahasiswa/:id/verifikasi', '/admin/mahasiswa/:id/verifikasi', '/admin/users/:id/verifikasi', '/users/:id/verifikasi'], admin, handleVerifikasiMahasiswa);
router.put(['/mahasiswa/:id/verifikasi', '/admin/mahasiswa/:id/verifikasi', '/admin/users/:id/verifikasi', '/users/:id/verifikasi'], admin, handleVerifikasiMahasiswa);
