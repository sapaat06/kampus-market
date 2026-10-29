import { Router } from 'express';
import { db, tx } from '../db.js';
import { err, str, oneOf, posInt } from '../util.js';
import { user, admin, userOrAdmin } from '../auth.js';
import { POIN_PER_RP } from '../config.js';

export const router = Router();

router.post('/transaksi', user, (req, res) => {
  const id_barang = posInt(req.body?.id_barang, 'id_barang');
  const jenis = oneOf(req.body?.jenis_transaksi, 'jenis_transaksi', ['sewa', 'beli']);
  const lokasi = str(req.body?.lokasi, 'lokasi', 200);
  const metode = str(req.body?.metode_pembayaran, 'metode_pembayaran', 30);
  if (req.body?.tanggal_mulai != null && typeof req.body.tanggal_mulai !== 'string')
    throw err(400, 'tanggal_mulai harus teks');

  const id = tx(() => {
    const b = db.prepare('SELECT * FROM barang WHERE id_barang=?').get(id_barang);
    if (!b) throw err(404, 'barang tidak ada');
    if (b.status !== 'tersedia') throw err(409, 'barang tidak tersedia');
    const harga = jenis === 'sewa' ? b.harga_sewa : b.harga_jual;
    if (!harga) throw err(400, `barang ini tidak untuk di-${jenis}`);
    if (!Number.isInteger(harga) || harga <= 0) throw err(409, 'harga barang tidak valid');

    let durasi = null, mulai = null, selesai = null, total = harga;
    if (jenis === 'sewa') {
      durasi = posInt(req.body?.durasi_sewa, 'durasi_sewa', 365);
      const d0 = req.body.tanggal_mulai ? new Date(req.body.tanggal_mulai) : new Date();
      if (Number.isNaN(d0.getTime())) throw err(400, 'tanggal_mulai tidak valid');
      mulai = d0.toISOString().slice(0, 10);
      const akhir = new Date(d0.getTime() + durasi * 864e5);
      if (Number.isNaN(akhir.getTime())) throw err(400, 'tanggal_mulai tidak valid');
      selesai = akhir.toISOString().slice(0, 10);
      total = harga * durasi;
    }
    if (!Number.isSafeInteger(total) || total <= 0) throw err(400, 'total tidak valid');

    const r = db.prepare(
      `INSERT INTO transaksi (id_mahasiswa,id_barang,jenis_transaksi,tanggal_mulai,tanggal_selesai,durasi_sewa,total_harga,lokasi,metode_pembayaran)
       VALUES (?,?,?,?,?,?,?,?,?)`
    ).run(req.uid, id_barang, jenis, mulai, selesai, durasi, total, lokasi, metode);
    db.prepare('UPDATE barang SET status=? WHERE id_barang=?').run(jenis === 'sewa' ? 'disewa' : 'terjual', id_barang);
    return Number(r.lastInsertRowid);
  });
  res.status(201).json(db.prepare('SELECT * FROM transaksi WHERE id_transaksi=?').get(id));
});

// Admin: daftar semua transaksi (untuk menandai selesai).
router.get('/transaksi', admin, (_req, res) => {
  res.json(db.prepare(
    `SELECT t.*, m.nama AS nama_mahasiswa, b.nama_barang
     FROM transaksi t JOIN mahasiswa m USING (id_mahasiswa) JOIN barang b USING (id_barang)
     ORDER BY t.id_transaksi DESC`
  ).all());
});

// Admin: tandai selesai. Barang sewa kembali tersedia, mahasiswa dapat Green Points.
router.patch('/transaksi/:id/selesai', admin, (req, res) => {
  const id = posInt(Number(req.params.id), 'id_transaksi');
  const hasil = tx(() => {
    const t = db.prepare('SELECT * FROM transaksi WHERE id_transaksi=?').get(id);
    if (!t) throw err(404, 'transaksi tidak ada');
    if (t.status !== 'berjalan') throw err(409, `transaksi sudah ${t.status}`);
    db.prepare("UPDATE transaksi SET status='selesai' WHERE id_transaksi=?").run(t.id_transaksi);
    if (t.jenis_transaksi === 'sewa')
      db.prepare("UPDATE barang SET status='tersedia' WHERE id_barang=?").run(t.id_barang);
    const poin = Math.floor(t.total_harga / POIN_PER_RP);
    if (poin > 0)
      db.prepare('INSERT INTO poin (id_mahasiswa,id_transaksi,jumlah_poin,kategori,keterangan) VALUES (?,?,?,?,?)')
        .run(t.id_mahasiswa, t.id_transaksi, poin, 'transaksi', `Transaksi #${t.id_transaksi} selesai`);
    return { ...t, status: 'selesai', poin_didapat: poin };
  });
  res.json(hasil);
});

// Mahasiswa atau Admin: batalkan transaksi berjalan. Barang kembali tersedia.
router.patch('/transaksi/:id/batal', userOrAdmin, (req, res) => {
  const id = posInt(Number(req.params.id), 'id_transaksi');
  const hasil = tx(() => {
    const t = db.prepare('SELECT * FROM transaksi WHERE id_transaksi=?').get(id);
    if (!t) throw err(404, 'transaksi tidak ada');
    if (!req.isAdmin && t.id_mahasiswa !== req.uid) throw err(403, 'bukan transaksi milik Anda');
    if (t.status !== 'berjalan') throw err(409, `transaksi sudah ${t.status}`);
    db.prepare("UPDATE transaksi SET status='batal' WHERE id_transaksi=?").run(t.id_transaksi);
    db.prepare("UPDATE barang SET status='tersedia' WHERE id_barang=?").run(t.id_barang);
    return { ...t, status: 'batal' };
  });
  res.json(hasil);
});
