import { Router } from 'express';
import { db } from '../db.js';
import { err, str, optStr, oneOf, posInt, haversineDistance } from '../util.js';
import { user, admin, userOrAdmin } from '../auth.js';
import { upload, simpanFotosCloudinary } from '../upload.js';

export const router = Router();

const KONDISI = ['baru', 'baik', 'cukup', 'rusak'];
const HARGA_MAX = 1_000_000_000; // Rp1 miliar, cukup untuk barang kampus

router.get('/kategori', async (_req, res) => {
  res.json(await db.prepare('SELECT * FROM kategori ORDER BY nama_kategori').all());
});

// Reverse geocode proxy (helper fallback untuk nominatim)
router.get('/reverse-geocode', async (req, res) => {
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lng ?? req.query.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw err(400, 'koordinat lat dan lng tidak valid');
  }
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`, {
      headers: { 'User-Agent': 'KampusMarket/1.0', 'Accept': 'application/json' }
    });
    if (!r.ok) throw new Error('Status ' + r.status);
    const data = await r.json();
    res.json(data);
  } catch (e) {
    res.status(502).json({ error: 'Gagal reverse geocode: ' + e.message });
  }
});

router.post('/kategori', admin, async (req, res) => {
  const nama = str(req.body?.nama_kategori, 'nama_kategori', 100);
  const deskripsi = optStr(req.body?.deskripsi, 'deskripsi', 500);
  const r = await db.prepare('INSERT INTO kategori (nama_kategori,deskripsi) VALUES (?,?)').run(nama, deskripsi);
  res.status(201).json({ id: Number(r.lastInsertRowid) });
});

router.post('/penjual', admin, async (req, res) => {
  const nama = str(req.body?.nama, 'nama', 100);
  const email = optStr(req.body?.email, 'email', 254);
  const no_hp = optStr(req.body?.no_hp, 'no_hp', 30);
  const r = await db.prepare('INSERT INTO penjual (nama,email,no_hp) VALUES (?,?,?)').run(nama, email, no_hp);
  res.status(201).json({ id: Number(r.lastInsertRowid) });
});

router.post('/barang', userOrAdmin, upload.array('foto', 5), async (req, res) => {
  let id_penjual = req.body?.id_penjual ? posInt(Number(req.body.id_penjual), 'id_penjual') : null;
  if (!id_penjual && req.uid) {
    const m = await db.prepare('SELECT nama, email, no_hp FROM mahasiswa WHERE id_mahasiswa=?').get(req.uid);
    let p = m ? await db.prepare('SELECT id_penjual FROM penjual WHERE email=?').get(m.email) : null;
    if (!p && m) {
      const rP = await db.prepare('INSERT INTO penjual (nama, email, no_hp) VALUES (?,?,?)').run(m.nama, m.email, m.no_hp);
      id_penjual = Number(rP.lastInsertRowid);
    } else if (p) {
      id_penjual = p.id_penjual;
    }
  }
  if (!id_penjual) id_penjual = 1;
  const id_kategori = posInt(Number(req.body?.id_kategori ?? 1), 'id_kategori');
  const nama_barang = str(req.body?.nama_barang, 'nama_barang', 200);
  const deskripsi = optStr(req.body?.deskripsi, 'deskripsi', 2000);
  let rawKondisi = req.body?.kondisi;
  if (rawKondisi === 'seperti baru' || rawKondisi === 'seperti-baru') {
    rawKondisi = 'baru';
  }
  const kondisi = oneOf(rawKondisi ?? 'baik', 'kondisi', KONDISI);

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

  // Foto hingga 5 gambar, diunggah ke Cloudinary dan disimpan sebagai JSON array URL
  const foto = await simpanFotosCloudinary(req.body?.foto, req.files);
  const lokasi = optStr(req.body?.lokasi || 'Fakultas Teknik', 'lokasi', 200);
  const latNum = req.body?.latitude != null && req.body.latitude !== ''
    ? Number(req.body.latitude)
    : (req.body?.lokasi_lat != null && req.body.lokasi_lat !== '' ? Number(req.body.lokasi_lat) : null);
  const lngNum = req.body?.longitude != null && req.body.longitude !== ''
    ? Number(req.body.longitude)
    : (req.body?.lokasi_lng != null && req.body.lokasi_lng !== '' ? Number(req.body.lokasi_lng) : null);

  const lokasi_lat = latNum != null && !isNaN(latNum) ? latNum : null;
  const lokasi_lng = lngNum != null && !isNaN(lngNum) ? lngNum : null;
  const latitude = lokasi_lat;
  const longitude = lokasi_lng;

  const r = await db.prepare(
    `INSERT INTO barang (id_kategori,id_penjual,nama_barang,deskripsi,harga_sewa,harga_jual,kondisi,foto,lokasi,lokasi_lat,lokasi_lng,latitude,longitude)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(id_kategori, id_penjual, nama_barang, deskripsi, harga_sewa, harga_jual, kondisi, foto, lokasi, lokasi_lat, lokasi_lng, latitude, longitude);
  res.status(201).json({ id: Number(r.lastInsertRowid) });
});

router.get('/barang', async (req, res) => {
  const raw = req.query.kategori;
  const k = raw == null || raw === '' ? null : posInt(Number(raw), 'kategori');
  const q = typeof req.query.q === 'string' && req.query.q.trim() !== '' ? `%${req.query.q.trim()}%` : null;

  let tipe = null;
  if (req.query.tipe != null && req.query.tipe !== '') {
    tipe = oneOf(req.query.tipe, 'tipe', ['sewa', 'beli', 'jual', 'pinjam']);
  }

  const URUT = {
    termurah: 'COALESCE(b.harga_sewa, b.harga_jual) ASC',
    termahal: 'COALESCE(b.harga_jual, b.harga_sewa) DESC',
    terbaru: 'b.id_barang DESC',
    terdekat: 'b.id_barang DESC'
  };

  let orderBy = 'b.id_barang DESC';
  if (req.query.urut != null && req.query.urut !== '') {
    if (!URUT[req.query.urut]) throw err(400, 'urut tidak valid');
    orderBy = URUT[req.query.urut];
  }

  const where = ["b.status='tersedia'"];
  const params = [];

  if (k !== null) {
    where.push('b.id_kategori = ?');
    params.push(k);
  }

  if (q !== null) {
    where.push('(b.nama_barang LIKE ? OR b.deskripsi LIKE ?)');
    params.push(q, q);
  }

  if (tipe === 'sewa') {
    where.push('(b.harga_sewa IS NOT NULL AND b.harga_sewa > 0)');
  } else if (tipe === 'beli' || tipe === 'jual') {
    where.push('(b.harga_jual IS NOT NULL AND b.harga_jual > 0)');
  } else if (tipe === 'pinjam') {
    where.push('(b.harga_sewa = 0 OR b.deskripsi LIKE ? OR b.nama_barang LIKE ?)');
    params.push('%pinjam%', '%pinjam%');
  }

  const sql = `SELECT b.*, k.nama_kategori, p.nama AS nama_penjual
     FROM barang b JOIN kategori k USING (id_kategori) JOIN penjual p USING (id_penjual)
     WHERE ${where.join(' AND ')}
     ORDER BY ${orderBy}`;

  let items = await db.prepare(sql).all(...params);

  // Kalkulasi jarak Haversine jika koordinat pengguna diberikan
  const uLat = req.query.lat != null && req.query.lat !== '' ? Number(req.query.lat) : null;
  const uLng = req.query.lng != null && req.query.lng !== '' ? Number(req.query.lng) : null;
  const maxJarak = req.query.max_jarak != null && req.query.max_jarak !== '' ? Number(req.query.max_jarak) : null;

  if (uLat != null && uLng != null && !isNaN(uLat) && !isNaN(uLng)) {
    items = items.map((b) => {
      const bLat = b.latitude ?? b.lokasi_lat;
      const bLng = b.longitude ?? b.lokasi_lng;
      const jarak_meter = haversineDistance(uLat, uLng, bLat, bLng);
      return { ...b, jarak_meter };
    });

    if (maxJarak != null && !isNaN(maxJarak) && maxJarak > 0) {
      items = items.filter((b) => b.jarak_meter != null && b.jarak_meter <= maxJarak);
    }

    if (req.query.urut === 'terdekat') {
      items.sort((a, b) => {
        if (a.jarak_meter == null && b.jarak_meter == null) return 0;
        if (a.jarak_meter == null) return 1;
        if (b.jarak_meter == null) return -1;
        return a.jarak_meter - b.jarak_meter;
      });
    }
  }

  res.json(items);
});

router.get('/barang/:id', async (req, res) => {
  const id = posInt(Number(req.params.id), 'id_barang');
  const b = await db.prepare(
    `SELECT b.*, k.nama_kategori, p.nama AS nama_penjual, p.no_hp AS no_hp_penjual
     FROM barang b JOIN kategori k USING (id_kategori) JOIN penjual p USING (id_penjual)
     WHERE b.id_barang=?`
  ).get(id);
  if (!b) throw err(404, 'barang tidak ada');
  res.json(b);
});

// Mahasiswa: daftar semua barang yang pernah diunggah oleh akun ini
router.get('/barang-saya', user, async (req, res) => {
  const m = await db.prepare('SELECT email FROM mahasiswa WHERE id_mahasiswa=?').get(req.uid);
  if (!m) throw err(404, 'akun tidak ada');
  const p = await db.prepare('SELECT id_penjual FROM penjual WHERE email=?').get(m.email);
  if (!p) return res.json([]);
  const rows = await db.prepare(
    `SELECT b.*, k.nama_kategori,
            (SELECT t.id_transaksi FROM transaksi t WHERE t.id_barang = b.id_barang ORDER BY t.id_transaksi DESC LIMIT 1) AS id_transaksi,
            (SELECT t.jenis_transaksi FROM transaksi t WHERE t.id_barang = b.id_barang ORDER BY t.id_transaksi DESC LIMIT 1) AS tx_jenis,
            (SELECT t.status FROM transaksi t WHERE t.id_barang = b.id_barang ORDER BY t.id_transaksi DESC LIMIT 1) AS tx_status,
            (SELECT m2.nama FROM transaksi t JOIN mahasiswa m2 USING (id_mahasiswa) WHERE t.id_barang = b.id_barang ORDER BY t.id_transaksi DESC LIMIT 1) AS nama_pembeli_penyewa,
            (SELECT t.metode_pembayaran FROM transaksi t WHERE t.id_barang = b.id_barang ORDER BY t.id_transaksi DESC LIMIT 1) AS tx_metode,
            (SELECT t.total_harga FROM transaksi t WHERE t.id_barang = b.id_barang ORDER BY t.id_transaksi DESC LIMIT 1) AS tx_total_harga
     FROM barang b JOIN kategori k USING (id_kategori)
     WHERE b.id_penjual=?
     ORDER BY b.id_barang DESC`
  ).all(p.id_penjual);
  res.json(rows);
});

// Mahasiswa pemilik atau Admin: aktifkan kembali ("Up Lagi") postingan barang sewa/pinjam yang sudah dikembalikan
router.post('/barang/:id/up', userOrAdmin, async (req, res) => {
  const id = posInt(Number(req.params.id), 'id_barang');
  const b = await db.prepare('SELECT b.*, p.email FROM barang b JOIN penjual p USING (id_penjual) WHERE b.id_barang=?').get(id);
  if (!b) throw err(404, 'barang tidak ada');
  if (!req.isAdmin) {
    const m = await db.prepare('SELECT email FROM mahasiswa WHERE id_mahasiswa=?').get(req.uid);
    if (!m || m.email !== b.email) throw err(403, 'bukan pemilik barang ini');
  }
  if (b.status === 'terjual') {
    throw err(400, 'barang yang sudah terjual tidak bisa di-up lagi');
  }
  await db.prepare("UPDATE barang SET status='tersedia' WHERE id_barang=?").run(id);
  res.json({ ok: true, id_barang: id, status: 'tersedia', pesan: 'Postingan barang berhasil di-up lagi dan tampil kembali di beranda!' });
});

// Mahasiswa pemilik atau Admin: ubah status barang
router.patch('/barang/:id/status', userOrAdmin, async (req, res) => {
  const id = posInt(Number(req.params.id), 'id_barang');
  const status = oneOf(req.body?.status ?? 'tersedia', 'status', ['tersedia', 'disewa', 'dipinjam', 'terjual', 'tidak_tersedia']);
  const b = await db.prepare('SELECT b.*, p.email FROM barang b JOIN penjual p USING (id_penjual) WHERE b.id_barang=?').get(id);
  if (!b) throw err(404, 'barang tidak ada');
  if (!req.isAdmin) {
    const m = await db.prepare('SELECT email FROM mahasiswa WHERE id_mahasiswa=?').get(req.uid);
    if (!m || m.email !== b.email) throw err(403, 'bukan pemilik barang ini');
  }
  await db.prepare('UPDATE barang SET status=? WHERE id_barang=?').run(status, id);
  res.json({ ok: true, id_barang: id, status });
});
