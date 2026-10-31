import { Router } from 'express';
import { db, tx } from '../db.js';
import { err, str, oneOf, posInt } from '../util.js';
import { user, admin, userOrAdmin } from '../auth.js';
import { POIN_PER_RP } from '../config.js';

export const router = Router();

router.post('/transaksi', user, (req, res) => {
  const id_barang = posInt(Number(req.body?.id_barang), 'id_barang');
  const jenis = oneOf(req.body?.jenis_transaksi, 'jenis_transaksi', ['sewa', 'beli', 'pinjam']);
  const lokasi = str(req.body?.lokasi || 'Kampus', 'lokasi', 200);
  const metode = str(req.body?.metode_pembayaran || 'QRIS', 'metode_pembayaran', 30);
  if (req.body?.tanggal_mulai != null && typeof req.body.tanggal_mulai !== 'string')
    throw err(400, 'tanggal_mulai harus teks');

  const id = tx(() => {
const b = db.prepare('SELECT * FROM barang WHERE id_barang=?').get(id_barang);
    if (!b) throw err(404, 'barang tidak ada');
    // Cegah transaksi barang milik sendiri
    const penjual = db.prepare('SELECT email FROM penjual WHERE id_penjual=?').get(b.id_penjual);
    if (penjual?.email) {
      const owner = db.prepare('SELECT id_mahasiswa FROM mahasiswa WHERE email=?').get(penjual.email);
      if (owner && owner.id_mahasiswa === req.uid) throw err(403, 'tidak bisa transaksi barang milik sendiri');
    }
    if (b.status !== 'tersedia') {
      throw err(409, 'Barang ini sudah disewa / dipinjam / terjual dan tidak tersedia');
    }

    let durasi = null, mulai = null, selesai = null, total = 0;
    let statusBarang = 'disewa';

    if (jenis === 'pinjam') {
      durasi = posInt(Number(req.body?.durasi_sewa ?? 3), 'durasi_sewa', 365);
      const d0 = req.body?.tanggal_mulai ? new Date(req.body.tanggal_mulai) : new Date();
      if (Number.isNaN(d0.getTime())) throw err(400, 'tanggal_mulai tidak valid');
      mulai = d0.toISOString().slice(0, 10);
      const akhir = new Date(d0.getTime() + durasi * 864e5);
      selesai = akhir.toISOString().slice(0, 10);
      total = (b.harga_sewa && b.harga_sewa > 0) ? Number(b.harga_sewa) : 0;
      statusBarang = 'dipinjam';
    } else if (jenis === 'sewa') {
      const harga = b.harga_sewa;
      if (!harga || harga <= 0) throw err(400, 'barang ini tidak untuk disewa');
      durasi = posInt(Number(req.body?.durasi_sewa ?? 1), 'durasi_sewa', 365);
      const d0 = req.body?.tanggal_mulai ? new Date(req.body.tanggal_mulai) : new Date();
      if (Number.isNaN(d0.getTime())) throw err(400, 'tanggal_mulai tidak valid');
      mulai = d0.toISOString().slice(0, 10);
      const akhir = new Date(d0.getTime() + durasi * 864e5);
      selesai = akhir.toISOString().slice(0, 10);
      total = harga * durasi;
      statusBarang = 'disewa';
    } else if (jenis === 'beli') {
      const harga = b.harga_jual;
      if (!harga || harga <= 0) throw err(400, 'barang ini tidak untuk dijual');
      total = harga;
      statusBarang = 'terjual';
    }

    if (!Number.isSafeInteger(total) || total < 0) throw err(400, 'total tidak valid');

    const r = db.prepare(
      `INSERT INTO transaksi (id_mahasiswa,id_barang,jenis_transaksi,tanggal_mulai,tanggal_selesai,durasi_sewa,total_harga,lokasi,metode_pembayaran)
       VALUES (?,?,?,?,?,?,?,?,?)`
    ).run(req.uid, id_barang, jenis, mulai, selesai, durasi, total, lokasi, metode);
    db.prepare('UPDATE barang SET status=? WHERE id_barang=?').run(statusBarang, id_barang);
    return Number(r.lastInsertRowid);
  });
  res.status(201).json(db.prepare('SELECT * FROM transaksi WHERE id_transaksi=?').get(id));
});

// Admin: daftar semua transaksi
router.get('/transaksi', admin, (_req, res) => {
  res.json(db.prepare(
    `SELECT t.*, m.nama AS nama_mahasiswa, b.nama_barang
     FROM transaksi t JOIN mahasiswa m USING (id_mahasiswa) JOIN barang b USING (id_barang)
     ORDER BY t.id_transaksi DESC`
  ).all());
});

// Mahasiswa pemilik atau Admin: tandai selesai. Barang sewa/pinjam kembali tersedia, mahasiswa dapat Green Points.
router.patch('/transaksi/:id/selesai', userOrAdmin, (req, res) => {
  const id = posInt(Number(req.params.id), 'id_transaksi');
  const hasil = tx(() => {
    const t = db.prepare('SELECT * FROM transaksi WHERE id_transaksi=?').get(id);
    if (!t) throw err(404, 'transaksi tidak ada');
    if (!req.isAdmin && t.id_mahasiswa !== req.uid) throw err(403, 'bukan transaksi milik Anda');
    if (t.status !== 'berjalan') throw err(409, `transaksi sudah ${t.status}`);

    db.prepare("UPDATE transaksi SET status='selesai' WHERE id_transaksi=?").run(t.id_transaksi);

    // Barang sewa & pinjam dikembalikan dan tersedia lagi
    if (t.jenis_transaksi === 'sewa' || t.jenis_transaksi === 'pinjam') {
      db.prepare("UPDATE barang SET status='tersedia' WHERE id_barang=?").run(t.id_barang);
    }

    // Perhitungan Green Points sesuai Figma & aturan komunitas
    let poin = 20;
    if (t.jenis_transaksi === 'pinjam') {
      poin = 20; // +20 Green Points (Figma figma8-1)
    } else if (t.jenis_transaksi === 'sewa') {
      poin = Math.floor(t.total_harga / POIN_PER_RP); // 1 Green Point tiap Rp10.000
    } else if (t.jenis_transaksi === 'beli') {
      poin = Math.floor(t.total_harga / POIN_PER_RP); // 1 Green Point tiap Rp10.000
    }

    if (poin > 0) {
      db.prepare('INSERT INTO poin (id_mahasiswa,id_transaksi,jumlah_poin,kategori,keterangan) VALUES (?,?,?,?,?)')
        .run(t.id_mahasiswa, t.id_transaksi, poin, 'transaksi', `${t.jenis_transaksi.toUpperCase()} #${t.id_transaksi} selesai (+${poin} Green Points)`);
    }

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
