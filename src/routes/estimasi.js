import { Router } from 'express';
import { db } from '../db.js';
import { err, oneOf, posInt } from '../util.js';
import { user } from '../auth.js';
import { FAKTOR, SEWA_PER_HARI } from '../config.js';

export const router = Router();

// Smart Emulator. harga_acuan = harga barang baru di pasar.
router.post('/estimasi', user, async (req, res) => {
  const id_barang = posInt(req.body?.id_barang, 'id_barang');
  const jenis = oneOf(req.body?.jenis_transaksi, 'jenis_transaksi', ['sewa', 'beli', 'pinjam']);
  const harga_acuan = posInt(req.body?.harga_acuan, 'harga_acuan', 1_000_000_000_000);
  const b = await db.prepare('SELECT kondisi FROM barang WHERE id_barang=?').get(id_barang);
  if (!b) throw err(404, 'barang tidak ada');
  const faktor = FAKTOR[b.kondisi];
  const harga = Math.round(harga_acuan * faktor * (jenis === 'sewa' ? SEWA_PER_HARI : 1));
  if (!Number.isSafeInteger(harga) || harga < 0) throw err(400, 'harga tidak valid');
  await db.prepare(
    'INSERT INTO estimasi_harga (id_barang,jenis_transaksi,kondisi_barang,harga_rekomendasi,faktor_kondisi) VALUES (?,?,?,?,?)'
  ).run(id_barang, jenis, b.kondisi, harga, faktor);
  res.json({ harga_rekomendasi: harga, per: jenis === 'sewa' ? 'hari' : 'unit', faktor_kondisi: faktor, kondisi: b.kondisi });
});
