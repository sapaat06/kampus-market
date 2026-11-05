import { Router } from 'express';
import { db } from '../db.js';
import { admin, user } from '../auth.js';
import { err, posInt, str, oneOf } from '../util.js';

export const router = Router();

// 1. STATISTIK ADMIN (Dinamis dari Database)
const handleGetStats = async (_req, res) => {
  const totalUsers = (await db.prepare('SELECT COUNT(*) c FROM mahasiswa').get())?.c || 0;
  const verifiedUsers = (await db.prepare("SELECT COUNT(*) c FROM mahasiswa WHERE status_verifikasi = 'terverifikasi'").get())?.c || 0;
  const pendingUsers = (await db.prepare("SELECT COUNT(*) c FROM mahasiswa WHERE status_verifikasi = 'pending'").get())?.c || 0;
  const rejectedUsers = (await db.prepare("SELECT COUNT(*) c FROM mahasiswa WHERE status_verifikasi = 'ditolak'").get())?.c || 0;
  const bannedUsers = (await db.prepare('SELECT COUNT(*) c FROM mahasiswa WHERE is_banned = 1').get())?.c || 0;

  const totalProducts = (await db.prepare('SELECT COUNT(*) c FROM barang').get())?.c || 0;
  const pendingProducts = (await db.prepare("SELECT COUNT(*) c FROM barang WHERE status_moderasi = 'pending'").get())?.c || 0;

  const totalKost = (await db.prepare('SELECT COUNT(*) c FROM kos').get())?.c || 0;
  const pendingKost = (await db.prepare("SELECT COUNT(*) c FROM kos WHERE status_verifikasi = 'pending'").get())?.c || 0;

  const totalTrans = (await db.prepare('SELECT COUNT(*) c FROM transaksi').get())?.c || 0;
  const pendingTrans = (await db.prepare("SELECT COUNT(*) c FROM transaksi WHERE status = 'berjalan'").get())?.c || 0;

  const totalGP = (await db.prepare('SELECT COALESCE(SUM(jumlah_poin), 0) s FROM poin').get())?.s || 42850;

  res.json({
    ok: true,
    total_users: totalUsers,
    verified_users: verifiedUsers,
    pending_users: pendingUsers,
    rejected_users: rejectedUsers,
    banned_users: bannedUsers,
    total_products: totalProducts,
    pending_products: pendingProducts,
    total_kost: totalKost,
    pending_kost: pendingKost,
    total_transactions: totalTrans,
    pending_transactions: pendingTrans,
    total_green_points: totalGP
  });
};

router.get(['/admin/stats', '/stats'], admin, handleGetStats);

// 2. KELOLA PENGGUNA (User Management)
const handleGetUsers = async (_req, res) => {
  const rows = await db.prepare(`
    SELECT id_mahasiswa, id_mahasiswa AS id, nama, email, no_hp, whatsapp_number,
           ktm, kampus, role, status_verifikasi, alasan_penolakan, is_banned,
           submitted_at, created_at
    FROM mahasiswa
    ORDER BY created_at DESC
  `).all();
  const users = rows.map(u => ({
    ...u,
    is_banned: Boolean(u.is_banned),
    nim: u.kampus || (`NIM-${String(u.id_mahasiswa).padStart(4, '0')}`)
  }));

  res.json({ ok: true, users, data: users });
};

router.get(['/admin/users', '/users'], admin, handleGetUsers);

// Daftar Akun Pending (khusus pemilik_kost atau semua user pending)
const handleGetPendingUsers = async (req, res) => {
  const isKostOnly = req.path.includes('pemilik-kost') || req.query.role === 'pemilik_kost';
  let sql = `
    SELECT id_mahasiswa, id_mahasiswa AS id, nama, email, no_hp, whatsapp_number,
           ktm, kampus, role, status_akun, status_verifikasi, alasan_penolakan, is_banned,
           submitted_at, created_at
    FROM mahasiswa
    WHERE (status_akun = 'pending' OR status_verifikasi = 'pending')
  `;
  if (isKostOnly) {
    sql += " AND role = 'pemilik_kost'";
  }
  sql += " ORDER BY created_at DESC";

  const rows = await db.prepare(sql).all();
  const users = rows.map(u => ({
    ...u,
    is_banned: Boolean(u.is_banned),
    nim: u.kampus || (`NIM-${String(u.id_mahasiswa).padStart(4, '0')}`)
  }));

  res.json({ ok: true, data: users, users, pemilik_kost: users });
};

router.get(['/admin/pemilik-kost/pending', '/admin/users/pending', '/pemilik-kost/pending', '/users/pending'], admin, handleGetPendingUsers);

// Approve Akun Pengguna / Pemilik Kost
const handleApproveUser = async (req, res) => {
  const id = posInt(Number(req.params.id), 'id_mahasiswa');
  const r = await db.prepare(`
    UPDATE mahasiswa
    SET status_akun = 'approved',
        status_verifikasi = 'terverifikasi',
        alasan_penolakan = NULL
    WHERE id_mahasiswa = ?
  `).run(id);
  if (r.changes === 0) throw err(404, 'Mahasiswa / Pengguna tidak ditemukan');
  const u = await db.prepare('SELECT id_mahasiswa, id_mahasiswa AS id, nama, email, role, status_akun, status_verifikasi FROM mahasiswa WHERE id_mahasiswa = ?').get(id);
  res.json({ ok: true, pesan: `Akun ${u.nama} berhasil disetujui.`, user: u, data: u });
};

// Reject Akun Pengguna / Pemilik Kost
const handleRejectUser = async (req, res) => {
  const id = posInt(Number(req.params.id), 'id_mahasiswa');
  const alasan = req.body?.alasan_penolakan || req.body?.alasan || 'Dokumen belum memenuhi kriteria pendaftaran';
  const r = await db.prepare(`
    UPDATE mahasiswa
    SET status_akun = 'rejected',
        status_verifikasi = 'ditolak',
        alasan_penolakan = ?
    WHERE id_mahasiswa = ?
  `).run(alasan, id);
  if (r.changes === 0) throw err(404, 'Mahasiswa / Pengguna tidak ditemukan');
  const u = await db.prepare('SELECT id_mahasiswa, id_mahasiswa AS id, nama, email, role, status_akun, status_verifikasi, alasan_penolakan FROM mahasiswa WHERE id_mahasiswa = ?').get(id);
  res.json({ ok: true, pesan: `Akun ${u.nama} ditolak.`, user: u, data: u });
};

router.post(['/admin/users/:id/approve', '/admin/pemilik-kost/:id/approve', '/users/:id/approve', '/pemilik-kost/:id/approve'], admin, handleApproveUser);
router.patch(['/admin/users/:id/approve', '/admin/pemilik-kost/:id/approve', '/users/:id/approve', '/pemilik-kost/:id/approve'], admin, handleApproveUser);
router.put(['/admin/users/:id/approve', '/admin/pemilik-kost/:id/approve', '/users/:id/approve', '/pemilik-kost/:id/approve'], admin, handleApproveUser);

router.post(['/admin/users/:id/reject', '/admin/pemilik-kost/:id/reject', '/users/:id/reject', '/pemilik-kost/:id/reject'], admin, handleRejectUser);
router.patch(['/admin/users/:id/reject', '/admin/pemilik-kost/:id/reject', '/users/:id/reject', '/pemilik-kost/:id/reject'], admin, handleRejectUser);
router.put(['/admin/users/:id/reject', '/admin/pemilik-kost/:id/reject', '/users/:id/reject', '/pemilik-kost/:id/reject'], admin, handleRejectUser);

// Toggle Blokir / Suspend Akun Pengguna
const handleToggleBlockUser = async (req, res) => {
  const id = posInt(Number(req.params.id), 'id_mahasiswa');
  const target = await db.prepare('SELECT id_mahasiswa, nama, email, is_banned FROM mahasiswa WHERE id_mahasiswa = ?').get(id);
  if (!target) throw err(404, 'Mahasiswa / Pengguna tidak ditemukan');

  let newBanStatus;
  if (req.body?.is_banned !== undefined) {
    newBanStatus = req.body.is_banned ? 1 : 0;
  } else {
    // Toggle jika tidak disertakan
    newBanStatus = target.is_banned ? 0 : 1;
  }

  await db.prepare('UPDATE mahasiswa SET is_banned = ? WHERE id_mahasiswa = ?').run(newBanStatus, id);
  const updated = await db.prepare('SELECT id_mahasiswa, id_mahasiswa AS id, nama, email, no_hp, whatsapp_number, kampus, role, status_verifikasi, is_banned, created_at FROM mahasiswa WHERE id_mahasiswa = ?').get(id);

  res.json({
    ok: true,
    is_banned: Boolean(newBanStatus),
    pesan: newBanStatus ? 'Pengguna berhasil diblokir.' : 'Blokir pengguna berhasil dibuka.',
    user: {
      ...updated,
      is_banned: Boolean(updated.is_banned),
      nim: updated.kampus || (`NIM-${String(updated.id_mahasiswa).padStart(4, '0')}`)
    },
    mahasiswa: updated
  });
};

router.put(['/admin/users/:id/block', '/users/:id/block'], admin, handleToggleBlockUser);
router.patch(['/admin/users/:id/block', '/users/:id/block'], admin, handleToggleBlockUser);
router.patch(['/admin/mahasiswa/:id/ban', '/mahasiswa/:id/ban'], admin, handleToggleBlockUser);

// 3. ANTREAN MODERASI PRODUK & PROPERTI KOS
const handleGetAntreanModerasi = async (_req, res) => {
  const bRows = await db.prepare(`
    SELECT b.*, p.nama AS nama_penjual, p.email AS email_penjual, p.no_hp AS hp_penjual, k.nama_kategori
    FROM barang b
    JOIN penjual p USING (id_penjual)
    JOIN kategori k USING (id_kategori)
    WHERE b.status_moderasi = 'pending'
    ORDER BY b.id_barang DESC
  `).all();
  const produkPending = bRows.map(b => ({
    ...b,
    id_item: b.id_barang,
    tipe_item: 'barang',
    nama_item: b.nama_barang,
    nama_pemilik: b.nama_penjual,
    email_pemilik: b.email_penjual,
    tipe_transaksi: b.harga_sewa ? 'sewa' : 'beli',
    harga_tampil: b.harga_sewa || b.harga_jual
  }));

  const kRows = await db.prepare(`
    SELECT k.*, m.nama AS nama_pemilik, m.email AS email_pemilik, m.no_hp AS hp_pemilik
    FROM kos k
    JOIN mahasiswa m ON k.id_pemilik = m.id_mahasiswa
    WHERE k.status_verifikasi = 'pending'
    ORDER BY k.id_kos DESC
  `).all();
  const kosPending = kRows.map(k => ({
    ...k,
    id_item: k.id_kos,
    tipe_item: 'kos',
    nama_item: k.nama_kos,
    nama_pemilik: k.nama_pemilik,
    email_pemilik: k.email_pemilik,
    tipe_transaksi: 'sewa_kos',
    harga_tampil: k.harga_bulan
  }));

  const antrean = [...produkPending, ...kosPending];

  res.json({
    ok: true,
    antrean,
    produk: produkPending,
    kos: kosPending
  });
};

router.get(['/admin/moderasi/antrean', '/admin/moderasi/pending', '/admin/listings/pending'], admin, handleGetAntreanModerasi);

// Aksi Moderasi Produk: Izinkan Tayang / Tolak
const handleModerasiBarang = async (req, res) => {
  const id = posInt(Number(req.params.id), 'id_barang');
  let rawStatus = String(req.body?.status_moderasi || req.body?.status || '').toLowerCase().trim();
  if (rawStatus === 'approve' || rawStatus === 'setujui' || rawStatus === 'izinkan') rawStatus = 'disetujui';
  if (rawStatus === 'reject' || rawStatus === 'tolak') rawStatus = 'ditolak';

  const status = oneOf(rawStatus, 'status_moderasi', ['pending', 'disetujui', 'ditolak']);
  const alasan = req.body?.alasan || req.body?.alasan_penolakan ? String(req.body.alasan || req.body.alasan_penolakan).trim().slice(0, 500) : null;

  const r = await db.prepare(`
    UPDATE barang
    SET status_moderasi = ?,
        alasan_penolakan = ?,
        status = CASE WHEN ? = 'disetujui' THEN 'tersedia' ELSE status END
    WHERE id_barang = ?
  `).run(status, status === 'ditolak' ? (alasan || 'Tidak sesuai ketentuan produk kampus') : null, status, id);

  if (r.changes === 0) throw err(404, 'Barang tidak ditemukan');

  const b = await db.prepare('SELECT * FROM barang WHERE id_barang = ?').get(id);
  res.json({ ok: true, barang: b, pesan: status === 'disetujui' ? 'Produk disetujui tayang.' : 'Produk telah ditolak.' });
};

router.put(['/admin/barang/:id/moderasi', '/barang/:id/moderasi'], admin, handleModerasiBarang);
router.patch(['/admin/barang/:id/moderasi', '/barang/:id/moderasi'], admin, handleModerasiBarang);

// Aksi Moderasi Properti Kos: Izinkan Tayang / Tolak
const handleModerasiKos = async (req, res) => {
  const id = posInt(Number(req.params.id), 'id_kos');
  let rawStatus = String(req.body?.status_verifikasi || req.body?.status_postingan || req.body?.status || '').toLowerCase().trim();
  if (rawStatus === 'approve' || rawStatus === 'setujui' || rawStatus === 'izinkan' || rawStatus === 'approved') rawStatus = 'terverifikasi';
  if (rawStatus === 'reject' || rawStatus === 'tolak' || rawStatus === 'rejected') rawStatus = 'ditolak';

  const status = oneOf(rawStatus, 'status_verifikasi', ['pending', 'terverifikasi', 'ditolak']);
  const statusPostingan = status === 'terverifikasi' ? 'approved' : (status === 'ditolak' ? 'rejected' : 'pending');
  const alasan = req.body?.alasan || req.body?.alasan_penolakan ? String(req.body.alasan || req.body.alasan_penolakan).trim().slice(0, 500) : null;

  const r = await db.prepare(`
    UPDATE kos
    SET status_verifikasi = ?,
        status_postingan = ?,
        alasan_penolakan = ?
    WHERE id_kos = ?
  `).run(status, statusPostingan, status === 'ditolak' ? (alasan || 'Dokumen properti kos belum lengkap') : null, id);

  if (r.changes === 0) throw err(404, 'Properti kos tidak ditemukan');

  const k = await db.prepare('SELECT * FROM kos WHERE id_kos = ?').get(id);
  res.json({ ok: true, kos: k, data: k, pesan: status === 'terverifikasi' ? 'Properti kos disetujui tayang.' : 'Properti kos ditolak.' });
};

router.put(['/admin/kos/:id/verifikasi', '/kos/:id/verifikasi', '/admin/kos/:id/moderasi'], admin, handleModerasiKos);
router.patch(['/admin/kos/:id/verifikasi', '/kos/:id/verifikasi', '/admin/kos/:id/moderasi'], admin, handleModerasiKos);

// Daftar Postingan Kos Pending
const handleGetPendingKos = async (_req, res) => {
  const kRows = await db.prepare(`
    SELECT k.*, m.nama AS nama_pemilik, m.email AS email_pemilik, m.no_hp AS hp_pemilik
    FROM kos k
    JOIN mahasiswa m ON k.id_pemilik = m.id_mahasiswa
    WHERE k.status_postingan = 'pending' OR k.status_verifikasi = 'pending'
    ORDER BY k.id_kos DESC
  `).all();
  const kosPending = kRows.map(k => ({
    ...k,
    id_item: k.id_kos,
    tipe_item: 'kos',
    nama_item: k.nama_kos,
    harga_tampil: k.harga_bulan
  }));
  res.json({ ok: true, data: kosPending, kos: kosPending });
};

router.get(['/admin/kos/pending', '/admin/postingan-kos/pending', '/kos/pending'], admin, handleGetPendingKos);

// Approve Postingan Kos
const handleApproveKos = async (req, res) => {
  const id = posInt(Number(req.params.id), 'id_kos');
  const r = await db.prepare(`
    UPDATE kos
    SET status_postingan = 'approved',
        status_verifikasi = 'terverifikasi',
        alasan_penolakan = NULL
    WHERE id_kos = ?
  `).run(id);
  if (r.changes === 0) throw err(404, 'Properti kos tidak ditemukan');
  const k = await db.prepare('SELECT * FROM kos WHERE id_kos = ?').get(id);
  res.json({ ok: true, pesan: 'Properti kos disetujui tayang.', kos: k, data: k });
};

// Reject Postingan Kos
const handleRejectKos = async (req, res) => {
  const id = posInt(Number(req.params.id), 'id_kos');
  const alasan = req.body?.alasan_penolakan || req.body?.alasan || 'Properti belum memenuhi ketentuan';
  const r = await db.prepare(`
    UPDATE kos
    SET status_postingan = 'rejected',
        status_verifikasi = 'ditolak',
        alasan_penolakan = ?
    WHERE id_kos = ?
  `).run(alasan, id);
  if (r.changes === 0) throw err(404, 'Properti kos tidak ditemukan');
  const k = await db.prepare('SELECT * FROM kos WHERE id_kos = ?').get(id);
  res.json({ ok: true, pesan: 'Properti kos ditolak.', kos: k, data: k });
};

router.post(['/admin/kos/:id/approve', '/admin/postingan-kos/:id/approve', '/kos/:id/approve'], admin, handleApproveKos);
router.patch(['/admin/kos/:id/approve', '/admin/postingan-kos/:id/approve', '/kos/:id/approve'], admin, handleApproveKos);
router.put(['/admin/kos/:id/approve', '/admin/postingan-kos/:id/approve', '/kos/:id/approve'], admin, handleApproveKos);

router.post(['/admin/kos/:id/reject', '/admin/postingan-kos/:id/reject', '/kos/:id/reject'], admin, handleRejectKos);
router.patch(['/admin/kos/:id/reject', '/admin/postingan-kos/:id/reject', '/kos/:id/reject'], admin, handleRejectKos);
router.put(['/admin/kos/:id/reject', '/admin/postingan-kos/:id/reject', '/kos/:id/reject'], admin, handleRejectKos);

// 4. KELOLA LAPORAN (REPORT)
// Buat laporan (oleh user atau admin)
router.post('/laporan', user, async (req, res) => {
  const tipe = oneOf(req.body?.tipe_target, 'tipe_target', ['barang', 'kos', 'user']);
  const id_target = posInt(Number(req.body?.id_target), 'id_target');
  const alasan = str(req.body?.alasan, 'alasan', 200).trim();
  const keterangan = req.body?.keterangan ? String(req.body.keterangan).trim().slice(0, 1000) : null;

  let targetAda = null;
  if (tipe === 'barang') targetAda = await db.prepare('SELECT 1 FROM barang WHERE id_barang=?').get(id_target);
  else if (tipe === 'kos') targetAda = await db.prepare('SELECT 1 FROM kos WHERE id_kos=?').get(id_target);
  else if (tipe === 'user') targetAda = await db.prepare('SELECT 1 FROM mahasiswa WHERE id_mahasiswa=?').get(id_target);
  if (!targetAda) throw err(404, 'target laporan tidak ditemukan');

  const r = await db.prepare(`
    INSERT INTO laporan (id_pelapor, tipe_target, id_target, alasan, keterangan)
    VALUES (?, ?, ?, ?, ?)
  `).run(req.uid, tipe, id_target, alasan, keterangan);

  const lap = await db.prepare('SELECT * FROM laporan WHERE id_laporan = ?').get(Number(r.lastInsertRowid));
  res.status(201).json({ ok: true, laporan: lap });
});

// Daftar Laporan Masuk untuk Admin
const handleGetLaporan = async (_req, res) => {
  const rows = await db.prepare(`
    SELECT l.*, m.nama AS nama_pelapor, m.email AS email_pelapor, m.kampus AS kampus_pelapor
    FROM laporan l
    LEFT JOIN mahasiswa m ON l.id_pelapor = m.id_mahasiswa
    ORDER BY l.id_laporan DESC
  `).all();

  // Tambahkan detail target dan terlapor
  const laporan = [];
  for (const lap of rows) {
    let target = null;
    let nama_terlapor = '-';
    let email_terlapor = '-';
    let target_judul = '-';

    if (lap.tipe_target === 'barang') {
      target = await db.prepare(`
        SELECT b.id_barang, b.nama_barang, b.status, b.foto, b.id_penjual, p.nama AS nama_penjual, p.email AS email_penjual
        FROM barang b
        LEFT JOIN penjual p ON b.id_penjual = p.id_penjual
        WHERE b.id_barang = ?
      `).get(lap.id_target);
      if (target) {
        target_judul = target.nama_barang;
        nama_terlapor = target.nama_penjual || 'Penjual';
        email_terlapor = target.email_penjual || '-';
      }
    } else if (lap.tipe_target === 'kos') {
      target = await db.prepare(`
        SELECT k.id_kos, k.nama_kos, k.alamat, k.foto, k.id_pemilik, m2.nama AS nama_pemilik, m2.email AS email_pemilik
        FROM kos k
        LEFT JOIN mahasiswa m2 ON k.id_pemilik = m2.id_mahasiswa
        WHERE k.id_kos = ?
      `).get(lap.id_target);
      if (target) {
        target_judul = target.nama_kos;
        nama_terlapor = target.nama_pemilik || 'Pemilik Kos';
        email_terlapor = target.email_pemilik || '-';
      }
    } else if (lap.tipe_target === 'user') {
      target = await db.prepare('SELECT id_mahasiswa, nama, email, is_banned, kampus FROM mahasiswa WHERE id_mahasiswa = ?').get(lap.id_target);
      if (target) {
        target_judul = target.nama;
        nama_terlapor = target.nama;
        email_terlapor = target.email;
      }
    }
    laporan.push({
      ...lap,
      target,
      target_judul,
      nama_terlapor,
      email_terlapor
    });
  }

  res.json({ ok: true, laporan, data: laporan });
};

router.get(['/admin/laporan', '/laporan', '/admin/reports'], admin, handleGetLaporan);

// Tindaklanjuti Laporan (Takedown, Blokir Akun Terlapor, Selesai/Abaikan)
const handleTindaklanjutLaporan = async (req, res) => {
  const id = posInt(Number(req.params.id), 'id_laporan');
  let rawTindakan = String(req.body?.tindakan || '').toLowerCase().trim();
  if (rawTindakan === 'block' || rawTindakan === 'blokir' || rawTindakan === 'block_user') rawTindakan = 'banned_user';
  if (rawTindakan === 'hapus' || rawTindakan === 'turunkan') rawTindakan = 'takedown';

  const tindakan = oneOf(rawTindakan, 'tindakan', ['takedown', 'banned_user', 'abaikan', 'selesai']);
  const catatan = req.body?.catatan ? String(req.body.catatan).trim().slice(0, 500) : null;

  const lap = await db.prepare('SELECT * FROM laporan WHERE id_laporan = ?').get(id);
  if (!lap) throw err(404, 'Laporan tidak ditemukan');

  // Eksekusi aksi jika takedown atau ban
  if (tindakan === 'takedown') {
    if (lap.tipe_target === 'barang') {
      await db.prepare("UPDATE barang SET status = 'terjual', status_moderasi = 'ditolak' WHERE id_barang = ?").run(lap.id_target);
    } else if (lap.tipe_target === 'kos') {
      await db.prepare("UPDATE kos SET status_kos = 'tidak_tersedia', status_verifikasi = 'ditolak' WHERE id_kos = ?").run(lap.id_target);
    }
  } else if (tindakan === 'banned_user') {
    let uidToBan = lap.id_target;
    if (lap.tipe_target === 'barang') {
      const b = await db.prepare('SELECT id_penjual FROM barang WHERE id_barang = ?').get(lap.id_target);
      const p = b && await db.prepare('SELECT email FROM penjual WHERE id_penjual = ?').get(b.id_penjual);
      const m = p && await db.prepare('SELECT id_mahasiswa FROM mahasiswa WHERE email = ?').get(p.email);
      if (m) uidToBan = m.id_mahasiswa;
    } else if (lap.tipe_target === 'kos') {
      const k = await db.prepare('SELECT id_pemilik FROM kos WHERE id_kos = ?').get(lap.id_target);
      if (k) uidToBan = k.id_pemilik;
    }
    if (uidToBan) {
      await db.prepare('UPDATE mahasiswa SET is_banned = 1 WHERE id_mahasiswa = ?').run(uidToBan);
    }
  }

  const statusBaru = (tindakan === 'abaikan' || tindakan === 'selesai') ? 'ditolak' : 'ditindaklanjuti';
  await db.prepare('UPDATE laporan SET status = ?, tindakan = ? WHERE id_laporan = ?').run(
    statusBaru,
    `${tindakan}${catatan ? ': ' + catatan : ''}`,
    id
  );

  const updatedLap = await db.prepare('SELECT * FROM laporan WHERE id_laporan = ?').get(id);
  res.json({
    ok: true,
    pesan: `Laporan #${id} berhasil diproses (${tindakan}).`,
    laporan: updatedLap
  });
};

router.post(['/admin/laporan/:id/tindaklanjut', '/admin/reports/:id/action', '/admin/laporan/:id/action'], admin, handleTindaklanjutLaporan);
router.patch(['/admin/laporan/:id/tindaklanjut', '/admin/reports/:id/action', '/admin/laporan/:id/action'], admin, handleTindaklanjutLaporan);
router.put(['/admin/laporan/:id/tindaklanjut', '/admin/reports/:id/action', '/admin/laporan/:id/action'], admin, handleTindaklanjutLaporan);

// 5. FITUR PENGATURAN GREEN POINT
// Riwayat Transaksi Green Point
const handleGetRiwayatPoin = async (_req, res) => {
  const riwayat = await db.prepare(`
    SELECT p.*, m.nama AS nama_mahasiswa, m.email AS email_mahasiswa, m.kampus
    FROM poin p
    JOIN mahasiswa m ON p.id_mahasiswa = m.id_mahasiswa
    ORDER BY p.id_poin DESC
  `).all();

  res.json({ ok: true, riwayat, data: riwayat });
};

router.get(['/admin/green-points/history', '/admin/poin/riwayat', '/poin/riwayat'], admin, handleGetRiwayatPoin);

// Penyesuaian Manual Green Point (+ / -)
const handleManualGreenPoint = async (req, res) => {
  const id_mahasiswa = posInt(Number(req.body?.id_mahasiswa || req.body?.user_id), 'id_mahasiswa');
  const rawPoin = Number(req.body?.jumlah_poin ?? req.body?.poin);
  if (!Number.isInteger(rawPoin) || rawPoin === 0) {
    throw err(400, 'Jumlah poin harus berupa angka bulat dan tidak boleh 0 (positif untuk tambah, negatif untuk kurang)');
  }

  const userTarget = await db.prepare('SELECT id_mahasiswa, nama, email FROM mahasiswa WHERE id_mahasiswa = ?').get(id_mahasiswa);
  if (!userTarget) throw err(404, 'Mahasiswa tidak ditemukan');

  const keterangan = req.body?.keterangan ? String(req.body.keterangan).trim().slice(0, 300) : (rawPoin > 0 ? 'Penyesuaian Manual Admin (+)' : 'Penyesuaian Manual Admin (-)');
  const kategori = req.body?.kategori || (rawPoin >= 0 ? 'bonus_admin' : 'penalti_admin');

  const r = await db.prepare(`
    INSERT INTO poin (id_mahasiswa, id_transaksi, jumlah_poin, kategori, keterangan)
    VALUES (?, NULL, ?, ?, ?)
  `).run(id_mahasiswa, rawPoin, kategori, keterangan);

  const totalBaru = (await db.prepare('SELECT COALESCE(SUM(jumlah_poin), 0) s FROM poin WHERE id_mahasiswa = ?').get(id_mahasiswa))?.s || 0;
  const newPoinRecord = await db.prepare('SELECT * FROM poin WHERE id_poin = ?').get(Number(r.lastInsertRowid));

  res.status(201).json({
    ok: true,
    pesan: `Berhasil ${rawPoin > 0 ? 'menambahkan' : 'mengurangi'} ${Math.abs(rawPoin)} Green Point untuk ${userTarget.nama}.`,
    poin: newPoinRecord,
    total_poin: totalBaru,
    user: userTarget
  });
};

router.post(['/admin/green-points/adjust', '/admin/poin/manual', '/poin/manual'], admin, handleManualGreenPoint);

// 6. EXPORT DATA MAHASISWA (CSV)
const handleExportMahasiswa = async (_req, res) => {
  const users = await db.prepare(`
    SELECT id_mahasiswa, nama, email, no_hp, whatsapp_number, kampus, status_verifikasi, alasan_penolakan, is_banned, created_at
    FROM mahasiswa
    ORDER BY id_mahasiswa ASC
  `).all();

  const csvEscape = (val) => {
    if (val === null || val === undefined) return '""';
    const s = String(val).replace(/"/g, '""');
    return `"${s}"`;
  };

  const headers = ['ID', 'Nama Lengkap', 'Email Kampus', 'No HP / WhatsApp', 'Kampus', 'Status Verifikasi', 'Alasan Penolakan', 'Status Akun', 'Tanggal Registrasi'];
  const lines = [headers.join(',')];

  users.forEach((u) => {
    lines.push([
      u.id_mahasiswa,
      csvEscape(u.nama),
      csvEscape(u.email),
      csvEscape(u.whatsapp_number || u.no_hp || '-'),
      csvEscape(u.kampus || '-'),
      csvEscape(u.status_verifikasi),
      csvEscape(u.alasan_penolakan || '-'),
      csvEscape(u.is_banned ? 'DIBLOKIR' : 'AKTIF'),
      csvEscape(u.created_at)
    ].join(','));
  });

  const csvContent = lines.join('\r\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="mahasiswa-export.csv"');
  res.send(csvContent);
};

router.get(['/admin/export/mahasiswa', '/export/mahasiswa'], admin, handleExportMahasiswa);
