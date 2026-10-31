import { Router } from 'express';
import { db } from '../db.js';
import { err, str, optStr, oneOf, posInt } from '../util.js';
import { admin, userOrAdmin } from '../auth.js';

export const router = Router();

const KONDISI = ['baru', 'baik', 'cukup', 'rusak'];
const HARGA_MAX = 1_000_000_000; // Rp1 miliar, cukup untuk barang kampus

router.get('/kategori', (_req, res) => {
  res.json(db.prepare('SELECT * FROM kategori ORDER BY nama_kategori').all());
});

router.post('/kategori', admin, (req, res) => {
  const nama = str(req.body?.nama_kategori, 'nama_kategori', 100);
  const deskripsi = optStr(req.body?.deskripsi, 'deskripsi', 500);
  const r = db.prepare('INSERT INTO kategori (nama_kategori,deskripsi) VALUES (?,?)').run(nama, deskripsi);
  res.status(201).json({ id: Number(r.lastInsertRowid) });
});

router.post('/penjual', admin, (req, res) => {
  const nama = str(req.body?.nama, 'nama', 100);
  const email = optStr(req.body?.email, 'email', 254);
  const no_hp = optStr(req.body?.no_hp, 'no_hp', 30);
  const r = db.prepare('INSERT INTO penjual (nama,email,no_hp) VALUES (?,?,?)').run(nama, email, no_hp);
  res.status(201).json({ id: Number(r.lastInsertRowid) });
});

router.post('/barang', userOrAdmin, (req, res) => {
  let id_penjual = req.body?.id_penjual ? posInt(Number(req.body.id_penjual), 'id_penjual') : null;
  if (!id_penjual && req.uid) {
    const m = db.prepare('SELECT nama, email, no_hp FROM mahasiswa WHERE id_mahasiswa=?').get(req.uid);
    let p = db.prepare('SELECT id_penjual FROM penjual WHERE email=?').get(m.email);
    if (!p) {
      const rP = db.prepare('INSERT INTO penjual (nama, email, no_hp) VALUES (?,?,?)').run(m.nama, m.email, m.no_hp);
      id_penjual = Number(rP.lastInsertRowid);
    } else {
      id_penjual = p.id_penjual;
    }
  }
  if (!id_penjual) id_penjual = 1;
  const id_kategori = posInt(Number(req.body?.id_kategori ?? 1), 'id_kategori');
  const nama_barang = str(req.body?.nama_barang, 'nama_barang', 200);
  const deskripsi = optStr(req.body?.deskripsi, 'deskripsi', 2000);
  const kondisi = oneOf(req.body?.kondisi ?? 'baik', 'kondisi', KONDISI);

  let harga_sewa = null;
  if (req.body?.harga_sewa != null && req.body.harga_sewa !== '') {
    if (typeof req.body.harga_sewa === 'boolean') throw err(400, 'harga_sewa tidak valid');
    const n = Number(req.body.harga_sewa);
    if (!Number.isInteger(n) || n < 0 || n > HARGA_MAX) throw err(400, 'harga_sewa tidak valid');
    harga_sewa = n;
  }

  let harga_jual = null;
  if (req.body?.harga_jual != null && req.body.harga_jual !== '') {
    if (typeof req.body.harga_jual === 'boolean') throw err(400, 'harga_jual tidak valid');
    const n = Number(req.body.harga_jual);
    if (!Number.isInteger(n) || n < 0 || n > HARGA_MAX) throw err(400, 'harga_jual tidak valid');
    harga_jual = n;
  }

  if (harga_sewa == null && harga_jual == null && !deskripsi?.includes('Pinjam')) {
    throw err(400, 'isi harga_sewa atau harga_jual');
  }

  // Foto hingga 4MB (bisa JSON array hingga 3 foto base64 data URL)
  let rawFoto = req.body?.foto;
  if (Array.isArray(rawFoto)) {
    rawFoto = JSON.stringify(rawFoto.slice(0, 3));
  }
  const foto = optStr(rawFoto, 'foto', 4_000_000);
  const lokasi = optStr(req.body?.lokasi || 'Fakultas Teknik', 'lokasi', 200);
  const lokasi_lat = req.body?.lokasi_lat != null ? Number(req.body.lokasi_lat) : null;
  const lokasi_lng = req.body?.lokasi_lng != null ? Number(req.body.lokasi_lng) : null;

  const r = db.prepare(
    `INSERT INTO barang (id_kategori,id_penjual,nama_barang,deskripsi,harga_sewa,harga_jual,kondisi,foto,lokasi,lokasi_lat,lokasi_lng)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`
  ).run(id_kategori, id_penjual, nama_barang, deskripsi, harga_sewa, harga_jual, kondisi, foto, lokasi, lokasi_lat, lokasi_lng);
  res.status(201).json({ id: Number(r.lastInsertRowid) });
});

router.get('/barang', (req, res) => {
  const raw = req.query.kategori;
  const k = raw == null || raw === '' ? null : posInt(Number(raw), 'kategori');
  const q = typeof req.query.q === 'string' && req.query.q.trim() !== '' ? `%${req.query.q.trim()}%` : null;

  res.json(db.prepare(
    `SELECT b.*, k.nama_kategori, p.nama AS nama_penjual
     FROM barang b JOIN kategori k USING (id_kategori) JOIN penjual p USING (id_penjual)
     WHERE b.status='tersedia'
       AND (? IS NULL OR b.id_kategori=?)
       AND (? IS NULL OR (b.nama_barang LIKE ? OR b.deskripsi LIKE ?))
     ORDER BY b.id_barang DESC`
  ).all(k, k, q, q, q));
});

router.get('/barang/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw err(404, 'barang tidak ada');
  const b = db.prepare(
    `SELECT b.*, k.nama_kategori, p.nama AS nama_penjual, p.no_hp AS no_hp_penjual
     FROM barang b JOIN kategori k USING (id_kategori) JOIN penjual p USING (id_penjual)
     WHERE b.id_barang=?`
  ).get(id);
  if (!b) throw err(404, 'barang tidak ada');
  res.json(b);
});
