import { Router } from 'express';
import { db } from '../db.js';
import { err, str, optStr, posInt, oneOf } from '../util.js';
import { user, pemilikKost } from '../auth.js';

export const router = Router();

const JENIS_KELAMIN = ['putra', 'putri', 'campur'];

// Public: daftar semua kos
router.get('/kos', (_req, res) => {
  const q = typeof _req.query.q === 'string' && _req.query.q.trim() !== '' ? `%${_req.query.q.trim()}%` : null;
  res.json(db.prepare(
    `SELECT k.*, m.nama AS nama_pemilik
     FROM kos k JOIN mahasiswa m USING (id_mahasiswa)
     WHERE (? IS NULL OR k.nama_kos LIKE ? OR k.alamat LIKE ?)
     ORDER BY k.id_kos DESC`
  ).all(q, q, q));
});

// Public: detail kos
router.get('/kos/:id', (req, res) => {
  const id = posInt(Number(req.params.id), 'id_kos');
  const k = db.prepare(
    `SELECT k.*, m.nama AS nama_pemilik, m.email AS email_pemilik, m.no_hp AS no_hp_pemilik
     FROM kos k JOIN mahasiswa m USING (id_mahasiswa)
     WHERE k.id_kos=?`
  ).get(id);
  if (!k) throw err(404, 'kos tidak ada');
  res.json(k);
});

// Pemilik kost: buat kos baru
router.post('/kos', user, pemilikKost, (req, res) => {
  const nama_kos = str(req.body?.nama_kos, 'nama_kos', 200);
  const deskripsi = optStr(req.body?.deskripsi, 'deskripsi', 2000);
  const alamat = str(req.body?.alamat, 'alamat', 200);
  const harga_bulan = posInt(Number(req.body?.harga_bulan), 'harga_bulan', 100_000_000);
  const fasilitas = optStr(req.body?.fasilitas, 'fasilitas', 500);
  const jenis_kelamin = oneOf(req.body?.jenis_kelamin ?? 'campur', 'jenis_kelamin', JENIS_KELAMIN);
  const kamar_tersedia = req.body?.kamar_tersedia != null ? posInt(Number(req.body.kamar_tersedia), 'kamar_tersedia', 1000) : 0;
  const status_kos = oneOf(req.body?.status_kos ?? 'tersedia', 'status_kos', ['tersedia', 'tidak_tersedia']);
  const foto = optStr(req.body?.foto, 'foto', 2_000_000);

  const r = db.prepare(
    `INSERT INTO kos (id_pemilik,nama_kos,deskripsi,alamat,harga_bulan,fasilitas,status_kos,jenis_kelamin,kamar_tersedia,foto)
     VALUES (?,?,?,?,?,?,?,?,?,?)`
  ).run(req.uid, nama_kos, deskripsi, alamat, harga_bulan, fasilitas, status_kos, jenis_kelamin, kamar_tersedia, foto);
  res.status(201).json({ id: Number(r.lastInsertRowid) });
});

// Pemilik kost: daftar kos miliknya
router.get('/kos/miliku', user, pemilikKost, (_req, res) => {
  res.json(db.prepare(
    `SELECT k.*, m.nama AS nama_pemilik
     FROM kos k JOIN mahasiswa m USING (id_mahasiswa)
     WHERE k.id_pemilik=?
     ORDER BY k.id_kos DESC`
  ).all(_req.uid));
});

// Pemilik kost: edit kos miliknya
router.patch('/kos/:id', user, pemilikKost, (req, res) => {
  const id = posInt(Number(req.params.id), 'id_kos');
  const k = db.prepare('SELECT * FROM kos WHERE id_kos=?').get(id);
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
  setField('jenis_kelamin', req.body?.jenis_kelamin != null ? oneOf(req.body.jenis_kelamin, 'jenis_kelamin', JENIS_KELAMIN) : undefined);
  setField('kamar_tersedia', req.body?.kamar_tersedia != null ? posInt(Number(req.body.kamar_tersedia), 'kamar_tersedia', 1000) : undefined);
  setField('foto', optStr(req.body?.foto, 'foto', 2_000_000));

  if (updates.length === 0) throw err(400, 'tidak ada field yang diubah');
  values.push(id);

  db.prepare(`UPDATE kos SET ${updates.join(', ')} WHERE id_kos=?`).run(...values);
  res.json(db.prepare('SELECT * FROM kos WHERE id_kos=?').get(id));
});

// Pemilik kost: hapus kos miliknya
router.delete('/kos/:id', user, pemilikKost, (req, res) => {
  const id = posInt(Number(req.params.id), 'id_kos');
  const k = db.prepare('SELECT * FROM kos WHERE id_kos=?').get(id);
  if (!k) throw err(404, 'kos tidak ada');
  if (k.id_pemilik !== req.uid) throw err(403, 'bukan kos milik Anda');
  db.prepare('DELETE FROM kos WHERE id_kos=?').run(id);
  res.json({ ok: true });
});
