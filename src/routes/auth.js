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
  const no_hp = optStr(req.body?.no_hp, 'no_hp', 30);
  const ktm = optStr(req.body?.ktm, 'ktm', 30);
  const r = db.prepare(
    'INSERT INTO mahasiswa (nama,email,no_hp,password_hash,ktm) VALUES (?,?,?,?,?)'
  ).run(nama, email, no_hp, hash(password), ktm);
  const id = Number(r.lastInsertRowid);
  res.status(201).json({ id_mahasiswa: id, token: mulaiSesi(res, id) });
});

router.post('/login', limit({ name: 'login', max: 10, windowMs: 900e3 }), (req, res) => {
  const email = emailOf(req.body?.email);
  const password = req.body?.password;
  if (typeof password !== 'string') throw err(400, 'password harus teks');
  const m = db.prepare('SELECT id_mahasiswa, password_hash FROM mahasiswa WHERE email=?').get(email);
  if (!m || !verify(password, m.password_hash)) throw err(401, 'email atau password salah');
  res.json({ token: mulaiSesi(res, m.id_mahasiswa) });
});

router.post('/reset-password', limit({ name: 'reset-pw', max: 5, windowMs: 900e3 }), (req, res) => {
  const email = emailOf(req.body?.email);
  const password_baru = passwordOf(req.body?.password_baru);
  const m = db.prepare('SELECT id_mahasiswa FROM mahasiswa WHERE email=?').get(email);
  if (!m) throw err(404, 'email tidak terdaftar di sistem');

  db.prepare('UPDATE mahasiswa SET password_hash=? WHERE id_mahasiswa=?').run(hash(password_baru), m.id_mahasiswa);
  res.json({ ok: true, message: 'Kata sandi berhasil diperbarui' });
});

router.post('/logout', (_req, res) => {
  res.clearCookie('km_token', { path: '/', httpOnly: true, sameSite: 'strict', secure: SESI.secure });
  res.json({ ok: true });
});

router.get('/saya', user, (req, res) => {
  const m = db.prepare(
    'SELECT id_mahasiswa,nama,email,no_hp,ktm,status_verifikasi FROM mahasiswa WHERE id_mahasiswa=?'
  ).get(req.uid);
  if (!m) throw err(404, 'akun tidak ada');
  m.green_points = db.prepare('SELECT COALESCE(SUM(jumlah_poin),0) s FROM poin WHERE id_mahasiswa=?').get(req.uid).s;
  m.riwayat_poin = db.prepare('SELECT * FROM poin WHERE id_mahasiswa=? ORDER BY id_poin DESC').all(req.uid);
  m.transaksi = db.prepare(
    `SELECT t.*, b.nama_barang FROM transaksi t JOIN barang b USING (id_barang)
     WHERE t.id_mahasiswa=? ORDER BY t.id_transaksi DESC`
  ).all(req.uid);
  res.json(m);
});

// Mahasiswa: ajukan atau perbarui data KTM untuk verifikasi
router.post('/verifikasi', user, (req, res) => {
  const ktm = str(req.body?.ktm, 'ktm', 500);
  db.prepare("UPDATE mahasiswa SET ktm=?, status_verifikasi='pending' WHERE id_mahasiswa=?").run(ktm, req.uid);
  res.json({ ok: true, status_verifikasi: 'pending' });
});

// Admin: daftar semua mahasiswa beserta status verifikasi
router.get('/mahasiswa', admin, (_req, res) => {
  res.json(db.prepare(
    'SELECT id_mahasiswa, nama, email, no_hp, ktm, status_verifikasi, created_at FROM mahasiswa ORDER BY id_mahasiswa DESC'
  ).all());
});

// Admin: ubah status verifikasi mahasiswa (terverifikasi / ditolak / pending)
router.patch('/mahasiswa/:id/verifikasi', admin, (req, res) => {
  const id = posInt(Number(req.params.id), 'id_mahasiswa');
  const status = oneOf(req.body?.status_verifikasi ?? req.body?.status, 'status_verifikasi', ['pending', 'terverifikasi', 'ditolak']);
  const r = db.prepare('UPDATE mahasiswa SET status_verifikasi=? WHERE id_mahasiswa=?').run(status, id);
  if (r.changes === 0) throw err(404, 'mahasiswa tidak ada');
  const m = db.prepare('SELECT id_mahasiswa, nama, email, no_hp, ktm, status_verifikasi FROM mahasiswa WHERE id_mahasiswa=?').get(id);
  res.json(m);
});
