import { Router } from 'express';
import { db, tx } from '../db.js';
import { err, str, oneOf, posInt } from '../util.js';
import { user, admin, userOrAdmin } from '../auth.js';
import { POIN_PER_RP } from '../config.js';

export const router = Router();

// Helper untuk mengambil transaksi dan mengecek peran pembeli/penjual
async function getTxWithRoles(id, uid, isAdmin = false) {
  const t = await db.prepare(
    `SELECT t.*, b.nama_barang, b.foto, b.lokasi AS lokasi_barang, b.harga_sewa, b.harga_jual, b.id_penjual,
            m.nama AS nama_mahasiswa, m.email AS email_mahasiswa, m.no_hp AS no_hp_mahasiswa,
            p.nama AS nama_penjual, p.email AS email_penjual, p.no_hp AS no_hp_penjual
     FROM transaksi t
     JOIN barang b USING (id_barang)
     JOIN mahasiswa m ON t.id_mahasiswa = m.id_mahasiswa
     JOIN penjual p ON b.id_penjual = p.id_penjual
     WHERE t.id_transaksi=?`
  ).get(id);

  if (!t) throw err(404, 'transaksi tidak ada');

  const mUser = uid ? await db.prepare('SELECT email FROM mahasiswa WHERE id_mahasiswa=?').get(uid) : null;
  const isBuyer = Boolean(uid && t.id_mahasiswa === uid);
  const isSeller = Boolean(mUser && mUser.email === t.email_penjual);

  if (!isAdmin && !isBuyer && !isSeller) {
    throw err(403, 'Anda tidak memiliki akses ke transaksi ini');
  }

  return { t, isBuyer, isSeller, isAdmin };
}

router.post('/transaksi', user, async (req, res) => {
  const id_barang = posInt(Number(req.body?.id_barang), 'id_barang');
  const jenis = oneOf(req.body?.jenis_transaksi, 'jenis_transaksi', ['sewa', 'beli', 'pinjam']);
  const lokasi = str(req.body?.lokasi || 'Kampus', 'lokasi', 200);
  const metode = str(req.body?.metode_pembayaran || 'QRIS', 'metode_pembayaran', 40);
  if (req.body?.tanggal_mulai != null && typeof req.body.tanggal_mulai !== 'string')
    throw err(400, 'tanggal_mulai harus teks');

  const id = await tx(async () => {
    const b = await db.prepare('SELECT * FROM barang WHERE id_barang=?').get(id_barang);
    if (!b) throw err(404, 'barang tidak ada');
    // Cegah transaksi barang milik sendiri
    const penjual = await db.prepare('SELECT email FROM penjual WHERE id_penjual=?').get(b.id_penjual);
    if (penjual?.email) {
      const owner = await db.prepare('SELECT id_mahasiswa FROM mahasiswa WHERE email=?').get(penjual.email);
      if (owner && owner.id_mahasiswa === req.uid) throw err(400, 'Anda adalah pemilik barang ini. Gunakan akun mahasiswa lain untuk menyewa atau membeli.');
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

    // Generate 4 digit kode unik acak untuk pembayaran COD (Cash on Delivery)
    const isCod = /cod|cash|bayar\s*di\s*tempat|tunai/i.test(metode);
    const codPin = isCod ? String(Math.floor(1000 + Math.random() * 9000)) : null;
    const initialStatus = 'pending';

    const r = await db.prepare(
      `INSERT INTO transaksi (id_mahasiswa,id_barang,jenis_transaksi,tanggal_mulai,tanggal_selesai,durasi_sewa,total_harga,lokasi,metode_pembayaran,status,cod_pin)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`
    ).run(req.uid, id_barang, jenis, mulai, selesai, durasi, total, lokasi, metode, initialStatus, codPin);
    await db.prepare('UPDATE barang SET status=? WHERE id_barang=?').run(statusBarang, id_barang);
    return Number(r.lastInsertRowid);
  });
  res.status(201).json(await db.prepare('SELECT * FROM transaksi WHERE id_transaksi=?').get(id));
});

// Mahasiswa pembeli/penyewa, Pemilik barang, atau Admin: detail transaksi berdasarkan id
router.get('/transaksi/:id', userOrAdmin, async (req, res) => {
  const rawId = String(req.params.id);
  if (rawId.startsWith('KST-') || rawId.startsWith('kst-')) {
    const idPengajuan = Number(rawId.replace(/^kst-/i, ''));
    const pKos = await db.prepare(`
      SELECT p.*, k.foto AS foto_kos, k.alamat AS alamat_kos, k.harga_bulan,
             m.nama AS nama_pemilik, m.no_hp AS no_hp_pemilik
      FROM pengajuan_sewa_kos p
      LEFT JOIN kos k USING (id_kos)
      LEFT JOIN mahasiswa m ON p.id_pemilik = m.id_mahasiswa
      WHERE p.id_pengajuan=?
    `).get(idPengajuan);

    if (pKos) {
      const isBuyer = Boolean(req.uid && Number(pKos.user_id) === Number(req.uid));
      const isOwner = Boolean(req.uid && (Number(pKos.id_pemilik) === Number(req.uid) || Number(pKos.pemilik_id) === Number(req.uid)));
      if (!req.isAdmin && !isBuyer && !isOwner) throw err(403, 'Anda tidak memiliki akses ke transaksi ini');
      return res.json({
        id_transaksi: `KST-${pKos.id_pengajuan}`,
        id_pengajuan: pKos.id_pengajuan,
        id_kos: pKos.id_kos,
        id_barang: null,
        jenis_transaksi: 'sewa',
        nama_barang: `${pKos.nama_kos} (${pKos.kamar})`,
        foto: pKos.foto_kos || '/img/kos-damar-asri.png',
        harga_sewa: pKos.harga_bulan || Math.round(pKos.total_harga / (pKos.durasi_bulan || 1)),
        total_harga: pKos.total_harga,
        durasi_sewa: `${pKos.durasi_bulan} bulan`,
        periode_sewa: pKos.periode,
        status: pKos.status,
        lokasi: pKos.alamat_kos || 'Institut Teknologi Garut',
        tanggal_transaksi: pKos.created_at,
        nama_penjual: pKos.nama_pemilik || 'Pemilik Kos',
        no_hp_penjual: pKos.no_hp_pemilik || '08123456789',
        is_kos: true,
        is_pembeli: isBuyer,
        is_penjual: isOwner,
        is_admin: Boolean(req.isAdmin)
      });
    }
  }

  const id = posInt(Number(req.params.id), 'id_transaksi');
  const { t, isBuyer, isSeller, isAdmin } = await getTxWithRoles(id, req.uid, req.isAdmin);

  const safeTx = { ...t };
  const isCod = /cod|cash|bayar\s*di\s*tempat|tunai/i.test(safeTx.metode_pembayaran || '');

  // Pastikan jika transaksi COD belum memiliki PIN di DB, generate 4 digit acak dan simpan
  if (isCod && (!safeTx.cod_pin || String(safeTx.cod_pin).trim() === '')) {
    const generatedPin = String(Math.floor(1000 + Math.random() * 9000));
    await db.prepare('UPDATE transaksi SET cod_pin=? WHERE id_transaksi=?').run(generatedPin, id);
    safeTx.cod_pin = generatedPin;
  }

  // Keamanan PIN: Tampilkan kode ini HANYA di akun Pembeli & Admin, sembunyikan untuk Penjual
  if (isSeller && !isBuyer && !isAdmin) {
    safeTx.cod_pin = null;
  }
  safeTx.is_pembeli = isBuyer;
  safeTx.is_penjual = isSeller;
  safeTx.is_admin = Boolean(isAdmin);

  res.json(safeTx);
});

// Admin: daftar semua transaksi
router.get('/transaksi', admin, async (_req, res) => {
  res.json(await db.prepare(
    `SELECT t.*, m.nama AS nama_mahasiswa, b.nama_barang
     FROM transaksi t JOIN mahasiswa m USING (id_mahasiswa) JOIN barang b USING (id_barang)
     ORDER BY t.id_transaksi DESC`
  ).all());
});

// Penjual menerima pesanan atau Pemilik Kost menyetujui pengajuan sewa
router.all(['/transaksi/:id/approve', '/transaksi/:id/terima', '/transaksi/:id/accept'], userOrAdmin, async (req, res, next) => {
  if (req.method !== 'PUT' && req.method !== 'PATCH' && req.method !== 'POST') return next();
  const id = posInt(Number(req.params.id), 'id_transaksi');

  const isPengajuan = await db.prepare('SELECT * FROM pengajuan_sewa_kos WHERE id_pengajuan=?').get(id);
  const isPesanan = !isPengajuan ? await db.prepare('SELECT * FROM pesanan WHERE id_pesanan=?').get(id) : null;

  if (isPengajuan || isPesanan) {
    const p0 = isPengajuan || isPesanan;
    const isOwner = Boolean(req.uid && (Number(p0.id_pemilik) === Number(req.uid) || Number(p0.pemilik_id) === Number(req.uid)));
    if (!req.isAdmin && !isOwner) throw err(403, 'Hanya pemilik kos atau admin yang dapat menyetujui pengajuan ini');

    await tx(async () => {
      await db.prepare("UPDATE pengajuan_sewa_kos SET status='approved' WHERE id_pengajuan=?").run(id);
      try {
        await db.prepare("UPDATE pesanan SET status='approved' WHERE id_pesanan=?").run(id);
      } catch (e) {
        if (!(String(e?.message || e || '').toLowerCase().includes('no such table') && String(e?.message || e || '').includes('pesanan'))) throw e;
      }
      try {
        await db.prepare("UPDATE transaksi SET status='approved' WHERE id_transaksi=?").run(id);
      } catch (e) {
        if (!(String(e?.message || e || '').toLowerCase().includes('no such table') && String(e?.message || e || '').includes('transaksi'))) throw e;
      }

      // Kunci kamar spesifik di tabel kamar_kos -> 'booked'
      const p = p0;
      if (p) {
        const kosId = p.kos_id || p.id_kos;
        const kamarRaw = String(p.kamar || '').trim();
        const cleanNo = kamarRaw.replace(/^Kamar\s*/i, '').trim();
        try {
          let rKamar = await db.prepare(`
            UPDATE kamar_kos 
            SET status = 'booked' 
            WHERE kos_id = ? 
              AND (
                nomor_kamar = ? 
                OR nama = ? 
                OR nomor_kamar = ? 
                OR replace(nomor_kamar, 'Kamar ', '') = ?
                OR nomor_kamar LIKE ?
              )
          `).run(kosId, kamarRaw, kamarRaw, `Kamar ${cleanNo}`, cleanNo, `%${cleanNo}%`);

          if (rKamar.changes === 0) {
            await db.prepare(`
              UPDATE kamar_kos 
              SET status = 'booked' 
              WHERE id = (
                SELECT id FROM kamar_kos WHERE kos_id = ? AND status IN ('pending', 'available', 'kosong') LIMIT 1
              )
            `).run(kosId);
          }

          await db.prepare(`
            UPDATE kos 
            SET kamar_tersedia = (SELECT COUNT(*) FROM kamar_kos WHERE kos_id = ? AND status IN ('available', 'kosong')) 
            WHERE id_kos = ?
          `).run(kosId, kosId);
        } catch (e) {
          if (!(String(e?.message || e || '').toLowerCase().includes('no such table') && String(e?.message || e || '').includes('kamar_kos'))) throw e;
        }
      }
    });

    return res.status(200).json({
      ok: true,
      id_transaksi: id,
      status: 'approved',
      pesan: 'Pesanan sewa berhasil disetujui.'
    });
  }

  const hasil = await tx(async () => {
    const { t, isSeller, isAdmin } = await getTxWithRoles(id, req.uid, req.isAdmin);
    if (!isAdmin && !isSeller) throw err(403, 'Hanya penjual pemilik barang yang dapat menerima pesanan ini');
    if (t.status !== 'pending') throw err(400, `Pesanan tidak dalam status pending (status saat ini: ${t.status})`);

    await db.prepare("UPDATE transaksi SET status='accepted' WHERE id_transaksi=?").run(t.id_transaksi);
    return { ...t, status: 'accepted' };
  });
  res.status(200).json(hasil);
});

// Penjual menolak pesanan atau Pemilik Kost menolak pengajuan sewa
router.all(['/transaksi/:id/reject', '/transaksi/:id/tolak'], userOrAdmin, async (req, res, next) => {
  if (req.method !== 'PUT' && req.method !== 'PATCH' && req.method !== 'POST') return next();
  const id = posInt(Number(req.params.id), 'id_transaksi');
  const alasan = str(req.body?.alasan || req.body?.alasan_penolakan || 'Ditolak oleh pemilik', 'alasan', 500);

  const isPengajuan = await db.prepare('SELECT * FROM pengajuan_sewa_kos WHERE id_pengajuan=?').get(id);
  const isPesanan = !isPengajuan ? await db.prepare('SELECT * FROM pesanan WHERE id_pesanan=?').get(id) : null;

  if (isPengajuan || isPesanan) {
    const p0 = isPengajuan || isPesanan;
    const isOwner = Boolean(req.uid && (Number(p0.id_pemilik) === Number(req.uid) || Number(p0.pemilik_id) === Number(req.uid)));
    if (!req.isAdmin && !isOwner) throw err(403, 'Hanya pemilik kos atau admin yang dapat menolak pengajuan ini');

    await tx(async () => {
      await db.prepare("UPDATE pengajuan_sewa_kos SET status='rejected' WHERE id_pengajuan=?").run(id);
      try {
        await db.prepare("UPDATE pesanan SET status='rejected' WHERE id_pesanan=?").run(id);
      } catch (e) {
        if (!(String(e?.message || e || '').toLowerCase().includes('no such table') && String(e?.message || e || '').includes('pesanan'))) throw e;
      }
      try {
        await db.prepare("UPDATE transaksi SET status='rejected', alasan_batal=? WHERE id_transaksi=?").run(alasan, id);
      } catch (e) {
        if (!(String(e?.message || e || '').toLowerCase().includes('no such table') && String(e?.message || e || '').includes('transaksi'))) throw e;
      }

      // Kembalikan status kamar jadi available
      const p = p0;
      if (p) {
        const kosId = p.kos_id || p.id_kos;
        const kamarRaw = String(p.kamar || '').trim();
        const cleanNo = kamarRaw.replace(/^Kamar\s*/i, '').trim();
        try {
          let rKamar = await db.prepare(`
            UPDATE kamar_kos 
            SET status = 'available' 
            WHERE kos_id = ? 
              AND (
                nomor_kamar = ? 
                OR nama = ? 
                OR nomor_kamar = ? 
                OR replace(nomor_kamar, 'Kamar ', '') = ?
                OR nomor_kamar LIKE ?
              )
          `).run(kosId, kamarRaw, kamarRaw, `Kamar ${cleanNo}`, cleanNo, `%${cleanNo}%`);

          if (rKamar.changes === 0) {
            await db.prepare(`
              UPDATE kamar_kos 
              SET status = 'available' 
              WHERE id = (
                SELECT id FROM kamar_kos WHERE kos_id = ? AND status = 'pending' LIMIT 1
              )
            `).run(kosId);
          }

          await db.prepare(`
            UPDATE kos 
            SET kamar_tersedia = (SELECT COUNT(*) FROM kamar_kos WHERE kos_id = ? AND status IN ('available', 'kosong')) 
            WHERE id_kos = ?
          `).run(kosId, kosId);
        } catch (e) {
          if (!(String(e?.message || e || '').toLowerCase().includes('no such table') && String(e?.message || e || '').includes('kamar_kos'))) throw e;
        }
      }
    });

    return res.status(200).json({
      ok: true,
      id_transaksi: id,
      status: 'rejected',
      alasan_batal: alasan,
      pesan: 'Pengajuan sewa kos telah ditolak.'
    });
  }

  const hasil = await tx(async () => {
    const { t, isSeller, isAdmin } = await getTxWithRoles(id, req.uid, req.isAdmin);
    if (!isAdmin && !isSeller) throw err(403, 'Hanya penjual pemilik barang yang dapat menolak pesanan ini');
    if (t.status !== 'pending') throw err(400, `Pesanan tidak dalam status pending (status saat ini: ${t.status})`);

    await db.prepare("UPDATE transaksi SET status='cancelled', alasan_batal=? WHERE id_transaksi=?").run(alasan, t.id_transaksi);
    await db.prepare("UPDATE barang SET status='tersedia' WHERE id_barang=?").run(t.id_barang);
    return { ...t, status: 'cancelled', alasan_batal: alasan };
  });
  res.status(200).json(hasil);
});

// Penjual atau Admin: selesaikan transaksi dengan verifikasi 4-digit PIN COD
router.patch(['/transaksi/:id/selesai', '/transaksi/:id/complete'], userOrAdmin, async (req, res) => {
  const id = posInt(Number(req.params.id), 'id_transaksi');
  const hasil = await tx(async () => {
    const { t, isBuyer, isSeller, isAdmin } = await getTxWithRoles(id, req.uid, req.isAdmin);

    if (!isAdmin && !isSeller && !isBuyer) throw err(403, 'bukan transaksi atau barang milik Anda');
    if (t.status === 'completed' || t.status === 'selesai') throw err(409, 'transaksi sudah selesai');
    if (t.status === 'cancelled' || t.status === 'batal') throw err(409, 'transaksi sudah dibatalkan');

    // Jika COD memiliki cod_pin dan aksi dilakukan oleh penjual/user (bukan admin override), validasi PIN
    if (t.cod_pin && !isAdmin) {
      const inputPin = String(req.body?.pin || req.body?.cod_pin || '').trim();
      if (!inputPin) {
        throw err(400, 'Masukkan 4 digit kode verifikasi pertemuan (PIN) dari pembeli');
      }
      if (inputPin !== String(t.cod_pin).trim()) {
        throw err(400, 'Kode verifikasi COD salah. Pastikan Anda meminta 4 digit kode yang tertera di aplikasi pembeli.');
      }
    }

    await db.prepare("UPDATE transaksi SET status='completed' WHERE id_transaksi=?").run(t.id_transaksi);

    // Barang sewa & pinjam dikembalikan dan tersedia lagi
    if (t.jenis_transaksi === 'sewa' || t.jenis_transaksi === 'pinjam') {
      await db.prepare("UPDATE barang SET status='tersedia' WHERE id_barang=?").run(t.id_barang);
    }

    // Perhitungan Green Points
    let poin = 20;
    if (t.jenis_transaksi === 'pinjam') {
      poin = 20;
    } else if (t.jenis_transaksi === 'sewa' || t.jenis_transaksi === 'beli') {
      poin = Math.floor(t.total_harga / POIN_PER_RP);
    }

    if (poin > 0) {
      await db.prepare('INSERT INTO poin (id_mahasiswa,id_transaksi,jumlah_poin,kategori,keterangan) VALUES (?,?,?,?,?)')
        .run(t.id_mahasiswa, t.id_transaksi, poin, 'transaksi', `${t.jenis_transaksi.toUpperCase()} #${t.id_transaksi} selesai (+${poin} Green Points)`);
    }

    return { ...t, status: 'completed', poin_didapat: poin };
  });
  res.json(hasil);
});

// Pembeli, Penjual, atau Admin: batalkan transaksi berjalan / accepted / pending
router.patch(['/transaksi/:id/batal', '/transaksi/:id/cancel'], userOrAdmin, async (req, res) => {
  const id = posInt(Number(req.params.id), 'id_transaksi');
  const alasan = str(req.body?.alasan || req.body?.alasan_batal || 'Dibatalkan oleh pengguna', 'alasan', 500);
  const hasil = await tx(async () => {
    const { t, isBuyer, isSeller, isAdmin } = await getTxWithRoles(id, req.uid, req.isAdmin);

    if (!isAdmin && !isBuyer && !isSeller) throw err(403, 'bukan transaksi atau barang milik Anda');
    if (t.status === 'completed' || t.status === 'selesai') throw err(409, 'transaksi sudah selesai');
    if (t.status === 'cancelled' || t.status === 'batal') throw err(409, 'transaksi sudah dibatalkan');

    await db.prepare("UPDATE transaksi SET status='cancelled', alasan_batal=? WHERE id_transaksi=?").run(alasan, t.id_transaksi);
    await db.prepare("UPDATE barang SET status='tersedia' WHERE id_barang=?").run(t.id_barang);
    return { ...t, status: 'cancelled', alasan_batal: alasan };
  });
  res.json(hasil);
});
