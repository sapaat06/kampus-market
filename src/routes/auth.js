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
  const ktm = optStr(req.body?.ktm, 'ktm', 800_000); // data URL hasil kompresi di browser
  const kampus = optStr(req.body?.kampus, 'kampus', 120);
  const role = oneOf(req.body?.role ?? 'pelanggan', 'role', ['pelanggan', 'pemilik_kost']);
  const r = db.prepare(
    'INSERT INTO mahasiswa (nama,email,no_hp,password_hash,ktm,kampus,role) VALUES (?,?,?,?,?,?,?)'
  ).run(nama, email, no_hp, hash(password), ktm, kampus, role);
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

router.get('/saya', user, (req, res) => {
  const m = db.prepare(
    'SELECT id_mahasiswa,nama,email,no_hp,ktm,kampus,status_verifikasi,foto FROM mahasiswa WHERE id_mahasiswa=?'
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
  db.prepare("UPDATE mahasiswa SET ktm=?, status_verifikasi='pending' WHERE id_mahasiswa=?").run(ktm, req.uid);
  res.json({ ok: true, status_verifikasi: 'pending' });
});

// Admin: daftar semua mahasiswa beserta status verifikasi
router.get('/mahasiswa', admin, (_req, res) => {
  res.json(db.prepare(
    'SELECT id_mahasiswa, nama, email, no_hp, ktm, kampus, status_verifikasi, created_at FROM mahasiswa ORDER BY id_mahasiswa DESC'
  ).all());
});

// Admin: ubah status verifikasi mahasiswa (terverifikasi / ditolak / pending)
router.patch('/mahasiswa/:id/verifikasi', admin, (req, res) => {
  const id = posInt(Number(req.params.id), 'id_mahasiswa');
  const status = oneOf(req.body?.status_verifikasi ?? req.body?.status, 'status_verifikasi', ['pending', 'terverifikasi', 'ditolak']);
  const r = db.prepare('UPDATE mahasiswa SET status_verifikasi=? WHERE id_mahasiswa=?').run(status, id);
  if (r.changes === 0) throw err(404, 'mahasiswa tidak ada');
  const m = db.prepare('SELECT id_mahasiswa, nama, email, no_hp, ktm, kampus, status_verifikasi FROM mahasiswa WHERE id_mahasiswa=?').get(id);
  res.json(m);
});
