import { Router } from 'express';
import { db } from '../db.js';
import { err, str, optStr, emailOf, posInt, oneOf } from '../util.js';
import { hash, verify, makeToken, user, admin } from '../auth.js';
import { limit } from '../limit.js';

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

router.post('/register', limit({ name: 'register', max: 10, windowMs: 3600e3 }), (req, res) => {
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

  const ktm = optStr(req.body?.ktm, 'ktm', 800_000); // data URL hasil kompresi di browser
  const kampus = optStr(req.body?.kampus, 'kampus', 120);
  const role = oneOf(req.body?.role ?? 'pelanggan', 'role', ['pelanggan', 'pemilik_kost']);
  const existing = db.prepare('SELECT id_mahasiswa FROM mahasiswa WHERE LOWER(TRIM(email))=LOWER(TRIM(?))').get(email);
  if (existing) throw err(409, 'Email kampus sudah terdaftar. Silakan gunakan email lain atau langsung masuk.');
  const r = db.prepare(
    'INSERT INTO mahasiswa (nama,email,no_hp,whatsapp_number,password_hash,ktm,kampus,role,submitted_at) VALUES (?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)'
  ).run(nama, email, no_hp, whatsapp_number, hash(password), ktm, kampus, role);
  const id = Number(r.lastInsertRowid);
  res.status(201).json({ id_mahasiswa: id, token: mulaiSesi(res, id) });
});

router.post('/login', limit({ name: 'login', max: 10, windowMs: 900e3 }), (req, res) => {
  const email = emailOf(req.body?.email);
  const password = req.body?.password;
  if (typeof password !== 'string') throw err(400, 'password harus teks');
  const m = db.prepare('SELECT id_mahasiswa, password_hash, role, status_verifikasi, alasan_penolakan, is_banned FROM mahasiswa WHERE email=?').get(email);
  if (!m || !verify(password, m.password_hash)) throw err(401, 'email atau password salah');
  if (m.is_banned) throw err(403, 'Akun Anda telah diblokir oleh admin.');

  // Validasi status verifikasi pendaftaran akun
  const status = String(m.status_verifikasi || 'pending').toLowerCase().trim();

  // Tolak login jika akun masih pending
  if (status === 'pending') {
    throw err(403, 'Akun Anda sedang dalam tinjauan admin dan belum disetujui. Silakan tunggu verifikasi.');
  }

  // Tolak login jika akun ditolak oleh admin
  if (status === 'ditolak' || status === 'rejected') {
    const alasan = m.alasan_penolakan ? ` Alasan: ${m.alasan_penolakan}` : '';
    throw err(403, `Mohon maaf, pendaftaran akun Anda ditolak oleh admin.${alasan}`);
  }

  // Hanya status 'terverifikasi', 'verified', atau 'approved' yang boleh masuk
  if (status !== 'terverifikasi' && status !== 'verified' && status !== 'approved') {
    throw err(403, 'Akun Anda belum disetujui untuk masuk.');
  }

  res.json({ token: mulaiSesi(res, m.id_mahasiswa), role: m.role });
});

// P0: alur "lupa kata sandi" lama mengubah kata sandi siapa pun yang tahu
// emailnya. Dinonaktifkan sampai ada verifikasi identitas (OTP/email).
// Endpoint tetap ada supaya klien lama mendapat pesan jelas, bukan 404.
router.post('/reset-password', limit({ name: 'reset-pw', max: 5, windowMs: 900e3 }), (_req, _res) => {
  throw err(503, 'atur ulang kata sandi belum tersedia; hubungi admin kampus');
});

router.post('/logout', (_req, res) => {
  res.clearCookie('km_token', { path: '/', httpOnly: true, sameSite: 'strict', secure: SESI.secure });
  res.json({ ok: true });
});

router.get(['/saya', '/me'], user, (req, res) => {
  const m = db.prepare(
    'SELECT id_mahasiswa,nama,email,no_hp,whatsapp_number,ktm,kampus,status_verifikasi,foto,role FROM mahasiswa WHERE id_mahasiswa=?'
  ).get(req.uid);
  if (!m) throw err(404, 'akun tidak ada');
  m.green_points = db.prepare('SELECT COALESCE(SUM(jumlah_poin),0) s FROM poin WHERE id_mahasiswa=?').get(req.uid).s;
  m.riwayat_poin = db.prepare('SELECT * FROM poin WHERE id_mahasiswa=? ORDER BY id_poin DESC').all(req.uid);
  m.transaksi = db.prepare(
    `SELECT t.*, b.nama_barang FROM transaksi t JOIN barang b USING (id_barang)
     WHERE t.id_mahasiswa=? ORDER BY t.id_transaksi DESC`
  ).all(req.uid).map(txItem => {
    const isCod = /cod|cash|bayar\s*di\s*tempat|tunai/i.test(txItem.metode_pembayaran || '');
    if (isCod && (!txItem.cod_pin || String(txItem.cod_pin).trim() === '')) {
      const generatedPin = String(Math.floor(1000 + Math.random() * 9000));
      db.prepare('UPDATE transaksi SET cod_pin=? WHERE id_transaksi=?').run(generatedPin, txItem.id_transaksi);
      txItem.cod_pin = generatedPin;
    }
    return { ...txItem, is_pembeli: true };
  });
  const pRecord = db.prepare('SELECT id_penjual FROM penjual WHERE email=?').get(m.email);
  if (pRecord) {
    m.transaksi_penjualan = db.prepare(
      `SELECT t.*, b.nama_barang, m2.nama AS nama_pembeli
       FROM transaksi t
       JOIN barang b USING (id_barang)
       JOIN mahasiswa m2 ON t.id_mahasiswa = m2.id_mahasiswa
       WHERE b.id_penjual=? ORDER BY t.id_transaksi DESC`
    ).all(pRecord.id_penjual).map(txItem => ({ ...txItem, cod_pin: null, is_penjual: true }));
  } else {
    m.transaksi_penjualan = [];
  }
  res.json(m);
});

// Cek status verifikasi publik (bisa via sesi user atau query nama / email)
router.get('/status-verifikasi', (req, res) => {
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
    m = db.prepare('SELECT id_mahasiswa, nama, email, status_verifikasi, role FROM mahasiswa WHERE id_mahasiswa=?').get(uid);
  }
  if (!m && typeof req.query.email === 'string' && req.query.email.trim()) {
    m = db.prepare('SELECT id_mahasiswa, nama, email, status_verifikasi, role FROM mahasiswa WHERE LOWER(TRIM(email))=LOWER(TRIM(?))').get(req.query.email.trim());
  }
  if (!m && typeof req.query.nama === 'string' && req.query.nama.trim()) {
    m = db.prepare('SELECT id_mahasiswa, nama, email, status_verifikasi, role FROM mahasiswa WHERE LOWER(TRIM(nama))=LOWER(TRIM(?))').get(req.query.nama.trim());
  }
  if (!m) {
    return res.json({ status_verifikasi: 'pending' });
  }
  res.json(m);
});

// Mahasiswa: unggah/hapus foto profil
router.patch('/profil/foto', user, (req, res) => {
  const foto = optStr(req.body?.foto, 'foto', 800_000);
  if (!foto) db.prepare('UPDATE mahasiswa SET foto=NULL WHERE id_mahasiswa=?').run(req.uid);
  else db.prepare('UPDATE mahasiswa SET foto=? WHERE id_mahasiswa=?').run(foto, req.uid);
  res.json({ ok: true, foto: foto || null });
});
router.delete('/profil/foto', user, (req, res) => {
  db.prepare('UPDATE mahasiswa SET foto=NULL WHERE id_mahasiswa=?').run(req.uid);
  res.json({ ok: true, foto: null });
});
router.post('/verifikasi', user, (req, res) => {
  const ktm = str(req.body?.ktm, 'ktm', 500);
  db.prepare("UPDATE mahasiswa SET ktm=?, status_verifikasi='pending', submitted_at=CURRENT_TIMESTAMP WHERE id_mahasiswa=?").run(ktm, req.uid);
  res.json({ ok: true, status_verifikasi: 'pending' });
});

// Admin: daftar semua mahasiswa beserta status verifikasi
router.get('/mahasiswa', admin, (_req, res) => {
  res.json(db.prepare(
    'SELECT id_mahasiswa, nama, email, no_hp, whatsapp_number, ktm, kampus, status_verifikasi, alasan_penolakan, is_banned, submitted_at, created_at FROM mahasiswa ORDER BY id_mahasiswa DESC'
  ).all());
});

// Admin: ubah status verifikasi mahasiswa (terverifikasi / ditolak / pending)
const handleVerifikasiMahasiswa = (req, res) => {
  const id = posInt(Number(req.params.id), 'id_mahasiswa');
  let rawStatus = String(req.body?.status_verifikasi ?? req.body?.status ?? '').toLowerCase().trim();
  if (rawStatus === 'verified' || rawStatus === 'approve' || rawStatus === 'setujui' || rawStatus === 'izinkan') rawStatus = 'terverifikasi';
  if (rawStatus === 'rejected' || rawStatus === 'reject' || rawStatus === 'tolak') rawStatus = 'ditolak';
  const status = oneOf(rawStatus, 'status_verifikasi', ['pending', 'terverifikasi', 'ditolak']);
  const alasan = req.body?.alasan_penolakan || req.body?.alasan || req.body?.catatan ? String(req.body.alasan_penolakan || req.body.alasan || req.body.catatan).trim().slice(0, 500) : null;

  const r = db.prepare('UPDATE mahasiswa SET status_verifikasi=?, alasan_penolakan=? WHERE id_mahasiswa=?')
    .run(status, status === 'ditolak' ? (alasan || 'Dokumen belum memenuhi kriteria') : null, id);
  if (r.changes === 0) throw err(404, 'mahasiswa tidak ada');

  if (status === 'terverifikasi') {
    const existingPoin = db.prepare("SELECT id_poin FROM poin WHERE id_mahasiswa=? AND keterangan='Bonus Verifikasi KTM'").get(id);
    if (!existingPoin) {
      db.prepare("INSERT INTO poin (id_mahasiswa, id_transaksi, jumlah_poin, kategori, keterangan) VALUES (?, NULL, 15, 'bonus', 'Bonus Verifikasi KTM')").run(id);
    }
  }

  const m = db.prepare('SELECT id_mahasiswa, nama, email, no_hp, whatsapp_number, ktm, kampus, status_verifikasi, alasan_penolakan, is_banned, submitted_at, created_at FROM mahasiswa WHERE id_mahasiswa=?').get(id);
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
