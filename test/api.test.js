process.env.DB = ':memory:';
process.env.TURSO_DATABASE_URL = ':memory:';
process.env.ADMIN_KEY = 'k';
import assert from 'node:assert/strict';
const { app } = await import('../src/server.js');
const { db } = await import('../src/db.js');
const { user } = await import('../src/auth.js');
const { limit, resetLimits } = await import('../src/limit.js');

const srv = app.listen(0);
const base = `http://localhost:${srv.address().port}`;
const call = async (method, path, body, headers = {}) => {
  const r = await fetch(base + path, {
    method, headers: { 'content-type': 'application/json', ...headers },
    body: body && JSON.stringify(body),
  });
  const ct = r.headers.get('content-type') ?? '';
  return {
    s: r.status,
    j: ct.includes('json') ? await r.json() : await r.text(),
    h: r.headers,
    cookies: r.headers.getSetCookie?.() ?? [],
  };
};
const A = { 'x-admin-key': 'k' };

// uji endpoint GET /health untuk Render
const health = await call('GET', '/health');
assert.equal(health.s, 200);
assert.equal(health.j.status, 'ok');

// frontend disajikan + header keamanan
const home = await call('GET', '/');
assert.equal(home.s, 200);
assert.match(home.j, /KampusCircle/);
assert.match(home.h.get('content-security-policy') ?? '', /script-src 'self'/);
assert.equal(home.h.get('x-content-type-options'), 'nosniff');
assert.equal(home.h.get('x-powered-by'), null);

// SweetAlert2 disajikan lokal (CSP script-src 'self'), dipakai semua halaman
const swalVendor = await call('GET', '/vendor/sweetalert2.all.min.js');
assert.equal(swalVendor.s, 200);
assert.match(swalVendor.h.get('content-type') ?? '', /javascript/);
assert.match(String(swalVendor.j), /Swal/);

// semua halaman memakai script eksternal (wajib untuk CSP script-src 'self')
for (const page of ['index', 'welcome', 'masuk', 'daftar', 'masuk-kost', 'daftar-kost', 'beranda', 'cari', 'kos', 'filter-kos', 'kos-owner', 'detail', 'chat', 'unggah', 'status-pinjam', 'profil', 'verifikasi', 'status-verifikasi', 'admin']) {
  const p = await call('GET', `/${page}.html`);
  assert.equal(p.s, 200, page);
  assert.doesNotMatch(p.j, /<script(?!\s+[^>]*src=)/i, page);
}

// master data
await call('POST', '/api/kategori', { nama_kategori: 'Elektronik' }, A);
await call('POST', '/api/kategori', { nama_kategori: 'Buku' }, A);
await call('POST', '/api/penjual', { nama: 'Toko A' }, A);
assert.equal((await call('GET', '/api/kategori')).j.length, 2);
assert.equal((await call('GET', '/api/kategori')).h.get('cache-control'), 'no-store');

// validasi barang: harga harus bilangan bulat > 0 (dulu teks/boolean lolos)
const barang = { id_kategori: 1, id_penjual: 1, nama_barang: 'Kalkulator', harga_sewa: 5000, harga_jual: 100000, kondisi: 'baik' };
assert.equal((await call('POST', '/api/barang', { ...barang, harga_sewa: 'abc' }, A)).s, 400);
assert.equal((await call('POST', '/api/barang', { ...barang, harga_sewa: true }, A)).s, 400);
assert.equal((await call('POST', '/api/barang', { ...barang, harga_sewa: 5000.5 }, A)).s, 400);
assert.equal((await call('POST', '/api/barang', { ...barang, kondisi: 'mulus' }, A)).s, 400);
const b1 = await call('POST', '/api/barang', barang, A);
assert.equal(b1.s, 201);
assert.equal((await call('POST', '/api/kategori', { nama_kategori: 'x' })).s, 403);
assert.equal((await call('GET', '/api/barang?kategori=1')).j.length, 1);
assert.equal((await call('GET', '/api/barang?kategori=2')).j.length, 0);
assert.equal((await call('GET', '/api/barang?kategori=abc')).s, 400);
assert.equal((await call('GET', '/api/barang?q=Kalkulator')).j.length, 1);
assert.equal((await call('GET', '/api/barang?q=Buku')).j.length, 0);
assert.equal((await call('GET', '/api/barang/1')).j.nama_penjual, 'Toko A');
assert.equal((await call('GET', '/api/nope')).s, 404);

// auth: validasi tipe, format email, dan normalisasi huruf besar
assert.equal((await call('POST', '/api/register', { nama: 'Budi', email: 'b@x.id', password: 'short' })).s, 400);
assert.equal((await call('POST', '/api/register', { nama: 'Budi', email: 'b@x.id', password: 12345678 })).s, 400);
assert.equal((await call('POST', '/api/register', { nama: 'Budi', email: 'bukan-email', password: 'rahasia123' })).s, 400);
assert.equal((await call('POST', '/api/register', { nama: 'Budi', email: 'b@x.id', password: 'rahasia123', whatsapp_number: '12345' })).s, 400);
const daftar = await call('POST', '/api/register', { nama: 'Budi', email: 'b@x.id', password: 'rahasia123', whatsapp_number: '081234567890', kampus: 'Institut Teknologi Garut', ktm: 'data:image/jpeg;base64,AAAA' });
assert.equal(daftar.s, 201);
assert.match(daftar.cookies[0] ?? '', /HttpOnly/i);
assert.match(daftar.cookies[0] ?? '', /SameSite=Strict/i);
assert.equal((await call('POST', '/api/register', { nama: 'Budi', email: 'b@x.id', password: 'rahasia123' })).s, 409);
assert.equal((await call('POST', '/api/register', { nama: 'Budi', email: ' B@X.ID ', password: 'rahasia123' })).s, 409);
assert.equal((await call('POST', '/api/login', { email: 'b@x.id', password: 'salah' })).s, 401);
assert.equal((await call('POST', '/api/login', { email: 'b@x.id', password: 12345678 })).s, 400);

// Uji login saat status masih pending: harus ditolak 403
const loginPending = await call('POST', '/api/login', { email: 'B@X.ID', password: 'rahasia123' });
assert.equal(loginPending.s, 403);
assert.match(loginPending.j.error, /belum disetujui|tinjauan admin/i);

// Verifikasi Budi agar akun disetujui untuk login
await db.prepare("UPDATE mahasiswa SET status_verifikasi='terverifikasi' WHERE email='b@x.id'").run();

const login = await call('POST', '/api/login', { email: 'B@X.ID', password: 'rahasia123' });
assert.equal(login.s, 200);

// P0: atur ulang kata sandi tanpa verifikasi dinonaktifkan.
// Password lama harus tetap berlaku dan tidak ada yang bisa diganti dari luar.
assert.equal((await call('POST', '/api/reset-password', { email: 'b@x.id', password_baru: 'passwordbaru123' })).s, 503);
assert.equal((await call('POST', '/api/login', { email: 'b@x.id', password: 'rahasia123' })).s, 200);
const loginBaru = await call('POST', '/api/login', { email: 'b@x.id', password: 'rahasia123' });
assert.equal(loginBaru.s, 200);
assert.match(login.cookies[0] ?? '', /HttpOnly/i);
const { token } = login.j;
const U = { authorization: `Bearer ${token}` };
const C = { cookie: login.cookies[0].split(';')[0] };
assert.equal((await call('GET', '/api/saya', null, C)).s, 200);
assert.equal((await call('GET', '/api/saya')).s, 401);
assert.equal((await call('GET', '/api/saya', null, { authorization: 'Bearer 1.9999999999999.' + 'a'.repeat(64) })).s, 401);

// token 64 karakter non-ASCII dulu memicu RangeError di timingSafeEqual
let midErr = null;
user({ get: () => 'Bearer 1.9999999999999.' + '\u00e9'.repeat(64) }, {}, (e) => { midErr = e; });
assert.equal(midErr?.status, 401);

// JSON rusak harus 400 dengan pesan yang ramah, bukan pesan parser mentah
const bad = await fetch(base + '/api/login', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: '{',
});
assert.equal(bad.status, 400);
assert.deepEqual(await bad.json(), { error: 'JSON tidak valid' });

// CSRF: origin lain ditolak, origin sendiri lolos
assert.equal((await call('POST', '/api/login', { email: 'b@x.id', password: 'rahasia123' }, { origin: 'http://evil.com' })).s, 403);
assert.equal((await call('POST', '/api/login', { email: 'b@x.id', password: 'rahasia123' }, { origin: base })).s, 200);

// logout menghapus cookie
const keluar = await call('POST', '/api/logout', null, C);
assert.equal(keluar.s, 200);
assert.match(keluar.cookies[0] ?? '', /^km_token=;/);

// estimasi: 1.000.000 x 0.8 = 800.000 (beli); sewa 2% = 16.000/hari
assert.equal((await call('POST', '/api/estimasi', { id_barang: 1, jenis_transaksi: 'beli', harga_acuan: 1000000 }, U)).j.harga_rekomendasi, 800000);
assert.equal((await call('POST', '/api/estimasi', { id_barang: 1, jenis_transaksi: 'sewa', harga_acuan: 1000000 }, U)).j.harga_rekomendasi, 16000);

// durasi ekstrem dulu membuat tanggal invalid lalu 500
assert.equal((await call('POST', '/api/transaksi', { id_barang: 1, jenis_transaksi: 'sewa', durasi_sewa: 1e15, lokasi: 'x', metode_pembayaran: 'cash' }, U)).s, 400);

// sewa 3 hari = 15.000, barang hilang dari katalog, tidak bisa disewa dua kali
const t = await call('POST', '/api/transaksi', { id_barang: 1, jenis_transaksi: 'sewa', durasi_sewa: 3, lokasi: 'Perpus', metode_pembayaran: 'cash' }, U);
assert.equal(t.s, 201);
assert.equal(t.j.total_harga, 15000);
assert.equal((await call('GET', '/api/barang')).j.length, 0);
assert.equal((await call('POST', '/api/transaksi', { id_barang: 1, jenis_transaksi: 'sewa', durasi_sewa: 1, lokasi: 'x', metode_pembayaran: 'cash' }, U)).s, 409);
assert.equal((await call('GET', '/api/transaksi')).s, 403);
assert.equal((await call('GET', '/api/transaksi', null, A)).j[0].nama_mahasiswa, 'Budi');

// selesai: barang kembali, poin = floor(15000/10000) = 1, tidak bisa selesai dua kali
assert.equal((await call('PATCH', '/api/transaksi/1/selesai', null, A)).j.poin_didapat, 1);
assert.equal((await call('PATCH', '/api/transaksi/1/selesai', null, A)).s, 409);
assert.equal((await call('GET', '/api/barang')).j.length, 1);
const me = (await call('GET', '/api/saya', null, U)).j;
assert.equal(me.green_points, 1);
assert.equal(me.kampus, 'Institut Teknologi Garut');
assert.equal(me.ktm, 'data:image/jpeg;base64,AAAA');
assert.equal(me.whatsapp_number, '081234567890');
assert.equal(me.password_hash, undefined);

// beli 100.000 = 10 poin, barang terjual permanen
await call('POST', '/api/transaksi', { id_barang: 1, jenis_transaksi: 'beli', lokasi: 'Kantin', metode_pembayaran: 'qris' }, U);
await call('PATCH', '/api/transaksi/2/selesai', null, A);
assert.equal((await call('GET', '/api/saya', null, U)).j.green_points, 11);
assert.equal((await call('GET', '/api/barang')).j.length, 0);

// pembatalan transaksi: kembalikan barang ke 'tersedia'
await call('POST', '/api/barang', { id_kategori: 1, id_penjual: 1, nama_barang: 'Kipas', harga_sewa: 3000, harga_jual: 50000, kondisi: 'baik' }, A);
const tBatal = await call('POST', '/api/transaksi', { id_barang: 2, jenis_transaksi: 'sewa', durasi_sewa: 2, lokasi: 'Kos', metode_pembayaran: 'cash' }, U);
assert.equal(tBatal.s, 201);
assert.equal((await call('GET', '/api/barang')).j.length, 0);
const resBatal = await call('PATCH', `/api/transaksi/${tBatal.j.id_transaksi}/batal`, null, U);
assert.equal(resBatal.s, 200);
assert.ok(resBatal.j.status === 'cancelled' || resBatal.j.status === 'batal');
assert.equal((await call('GET', '/api/barang')).j.length, 1);

// verifikasi mahasiswa admin
const listMhs = await call('GET', '/api/mahasiswa', null, A);
assert.equal(listMhs.s, 200);
assert.equal(listMhs.j.length >= 1, true);
assert.equal(typeof listMhs.j[0].created_at, 'string');
assert.equal(typeof listMhs.j[0].submitted_at, 'string');
const vRes = await call('PATCH', `/api/mahasiswa/${listMhs.j[0].id_mahasiswa}/verifikasi`, { status_verifikasi: 'terverifikasi' }, A);
assert.equal(vRes.s, 200);
assert.equal(vRes.j.status_verifikasi, 'terverifikasi');

// uji tolak dengan alasan penolakan
const vReject = await call('PATCH', `/api/mahasiswa/${listMhs.j[0].id_mahasiswa}/verifikasi`, { status_verifikasi: 'ditolak', alasan_penolakan: 'Foto KTM buram' }, A);
assert.equal(vReject.s, 200);
assert.equal(vReject.j.status_verifikasi, 'ditolak');
assert.equal(vReject.j.alasan_penolakan, 'Foto KTM buram');

// Uji tolak login saat status ditolak: harus ditolak 403
const loginDitolak = await call('POST', '/api/login', { email: 'b@x.id', password: 'rahasia123' });
assert.equal(loginDitolak.s, 403);
assert.match(loginDitolak.j.error, /ditolak oleh admin/i);

// Kembalikan ke terverifikasi agar tes berikutnya berjalan
await db.prepare("UPDATE mahasiswa SET status_verifikasi='terverifikasi' WHERE id_mahasiswa=?").run(listMhs.j[0].id_mahasiswa);

// uji statistik admin dinamis
const statsRes = await call('GET', '/api/admin/stats');
assert.equal(statsRes.s, 200);
assert.equal(typeof statsRes.j.total_users, 'number');
assert.equal(typeof statsRes.j.verified_users, 'number');

// uji blokir / suspend akun (banned)
const banRes = await call('PATCH', `/api/mahasiswa/${listMhs.j[0].id_mahasiswa}/ban`, { is_banned: true }, A);
assert.equal(banRes.s, 200);
assert.equal(banRes.j.mahasiswa.is_banned, 1);
const loginBanned = await call('POST', '/api/login', { email: 'b@x.id', password: 'rahasia123' });
assert.equal(loginBanned.s, 403);
assert.match(loginBanned.j.error, /diblokir/i);

// buka blokir kembali
await call('PATCH', `/api/mahasiswa/${listMhs.j[0].id_mahasiswa}/ban`, { is_banned: false }, A);
const loginUnbanned = await call('POST', '/api/login', { email: 'b@x.id', password: 'rahasia123' });
assert.equal(loginUnbanned.s, 200);

// uji laporan masuk & export data
const lapRes = await call('GET', '/api/admin/laporan', null, A);
assert.equal(lapRes.s, 200);
assert.equal(Array.isArray(lapRes.j.laporan), true);

const expRes = await call('GET', '/api/admin/export/mahasiswa', null, A);
assert.equal(expRes.s, 200);
assert.match(expRes.j, /Nama Lengkap/);

// rate limiter: request ke-(max+1) harus 429
resetLimits();
const mw = limit({ name: 'uji', max: 2, windowMs: 60_000, key: () => 'ip' });
const res = () => ({
  code: 200, headers: {},
  set(k, v) { this.headers[k.toLowerCase()] = v; return this; },
  status(c) { this.code = c; return this; },
  json(b) { this.body = b; return this; },
});
let lolos = 0;
mw({}, res(), () => lolos++);
mw({}, res(), () => lolos++);
const r3 = res();
let lolos3 = false;
mw({}, r3, () => { lolos3 = true; });
assert.equal(lolos, 2);
assert.equal(lolos3, false);
assert.equal(r3.code, 429);
assert.equal(r3.headers['retry-after'] !== undefined, true);
resetLimits();

// real chat dua arah antar user
// Buat akun user kedua (Penjual)
const mPenjual = await call('POST', '/api/register', {
  nama: 'Penjual Barang', email: 'penjual@itg.ac.id', password: 'password123', no_hp: '081299998888', kampus: 'ITG Garut'
});
assert.equal(mPenjual.s, 201);
const UPenjual = { authorization: `Bearer ${mPenjual.j.token}` };

// Buat barang milik penjual
const bRes = await call('POST', '/api/barang', {
  id_kategori: 1, nama_barang: 'Meja Lipat Kost', harga_sewa: 10000, kondisi: 'baik'
}, UPenjual);
assert.equal(bRes.s, 201);
const idBarang = bRes.j.id;

// Pembeli membuat chat room untuk barang tersebut
const roomRes = await call('POST', '/api/chat/room', {
  tipe_referensi: 'barang', id_referensi: idBarang
}, U);
assert.equal(roomRes.s, 200);
const idRoom = roomRes.j.id_room;
assert.equal(typeof idRoom, 'number');

// Pembeli mengirim pesan ke room
const sendMsg1 = await call('POST', `/api/chat/rooms/${idRoom}/messages`, {
  pesan: 'Halo kak, meja lipatnya masih ada?'
}, U);
assert.equal(sendMsg1.s, 201);
assert.equal(sendMsg1.j.pesan, 'Halo kak, meja lipatnya masih ada?');
const idMsg1 = sendMsg1.j.id_pesan;

// Penjual membuka inbox dan melihat room
const inboxPenjual = await call('GET', '/api/chat/rooms', null, UPenjual);
assert.equal(inboxPenjual.s, 200);
assert.equal(inboxPenjual.j.rooms.length >= 1, true);
const roomDiInbox = inboxPenjual.j.rooms.find(r => r.id_room === idRoom);
assert.equal(Boolean(roomDiInbox), true);
assert.equal(roomDiInbox.unread_count, 1);
assert.equal(roomDiInbox.last_message, 'Halo kak, meja lipatnya masih ada?');

// Penjual membuka room dan membaca pesan
const detailRoomPenjual = await call('GET', `/api/chat/rooms/${idRoom}`, null, UPenjual);
assert.equal(detailRoomPenjual.s, 200);
assert.equal(detailRoomPenjual.j.messages.length, 1);

// Penjual membalas pesan
const sendReply = await call('POST', `/api/chat/rooms/${idRoom}/messages`, {
  pesan: 'Masih ready kak, bisa diambil hari ini di kampus.'
}, UPenjual);
assert.equal(sendReply.s, 201);

// Pembeli melakukan polling real-time (?after=idMsg1) dan menerima balasan dari Penjual
const pollPembeli = await call('GET', `/api/chat/rooms/${idRoom}?after=${idMsg1}`, null, U);
assert.equal(pollPembeli.s, 200);
assert.equal(pollPembeli.j.messages.length, 1);
assert.equal(pollPembeli.j.messages[0].pesan, 'Masih ready kak, bisa diambil hari ini di kampus.');

// Setiap pesan membawa sender_id yang membedakan pengirim (untuk posisi bubble kanan/kiri)
assert.equal(sendMsg1.j.sender_id, daftar.j.id_mahasiswa);
assert.equal(sendReply.j.sender_id, mPenjual.j.id_mahasiswa);
assert.notEqual(sendMsg1.j.sender_id, sendReply.j.sender_id);
assert.equal(pollPembeli.j.messages[0].sender_id, mPenjual.j.id_mahasiswa);
const detailLengkap = await call('GET', `/api/chat/rooms/${idRoom}`, null, U);
assert.equal(detailLengkap.j.messages.length, 2);
assert.equal(detailLengkap.j.messages.every((m) => typeof m.sender_id === 'number'), true);
assert.equal(detailLengkap.j.messages[0].id_pengirim, detailLengkap.j.messages[0].sender_id);

// Verifikasi kompatibilitas route mounting /chat dan /auth (baik dengan maupun tanpa /api)
assert.equal((await call('GET', '/chat/rooms', null, UPenjual)).s, 200);
assert.equal((await call('GET', `/chat/rooms/${idRoom}`, null, UPenjual)).s, 200);
assert.equal((await call('POST', `/chat/rooms/${idRoom}/messages`, { pesan: 'tes chat tanpa prefix api' }, U)).s, 201);
assert.equal((await call('GET', '/auth/me', null, U)).s, 200);
assert.equal((await call('GET', '/api/auth/me', null, U)).s, 200);
assert.equal((await call('GET', '/auth/saya', null, U)).s, 200);
assert.equal((await call('GET', '/chat/rooms/999999', null, U)).s, 404);
assert.equal((await call('GET', '/api/chat/rooms/999999', null, U)).s, 404);
assert.equal((await call('GET', '/api/chat/invalid/path/here', null, U)).s, 404);

// Keamanan & privasi chat: user ketiga tidak boleh melihat/menyentuh room A-B
const mPenyusup = await call('POST', '/api/register', {
  nama: 'User Tidak Bersangkutan', email: 'penyusup@itg.ac.id', password: 'password123', no_hp: '081277776666', kampus: 'ITG Garut'
});
assert.equal(mPenyusup.s, 201);
const UPenyusup = { authorization: `Bearer ${mPenyusup.j.token}` };

// 1) Inbox hanya berisi room milik user tersebut (room A-B tidak muncul)
const inboxPenyusup = await call('GET', '/api/chat/rooms', null, UPenyusup);
assert.equal(inboxPenyusup.s, 200);
assert.equal(inboxPenyusup.j.rooms.some((r) => r.id_room === idRoom), false);

// 2) Detail room, riwayat pesan, dan kirim pesan ditolak 403
assert.equal((await call('GET', `/api/chat/rooms/${idRoom}`, null, UPenyusup)).s, 403);
assert.equal((await call('GET', `/api/chat/rooms/${idRoom}/messages`, null, UPenyusup)).s, 403);
assert.equal((await call('POST', `/api/chat/rooms/${idRoom}/messages`, { pesan: 'mencoba menyusup' }, UPenyusup)).s, 403);
assert.equal((await call('GET', `/chat/rooms/${idRoom}`, null, UPenyusup)).s, 403);

// 3) Tanpa login sama sekali tidak boleh membaca inbox / room
assert.equal((await call('GET', '/api/chat/rooms')).s, 401);
assert.equal((await call('GET', `/api/chat/rooms/${idRoom}/messages`)).s, 401);

// 4) Pesan yang tersimpan hanya dari dua peserta room
const detailFinal = await call('GET', `/api/chat/rooms/${idRoom}`, null, U);
assert.equal(detailFinal.j.messages.length >= 2, true);
assert.equal(detailFinal.j.messages.every((m) => [daftar.j.id_mahasiswa, mPenjual.j.id_mahasiswa].includes(m.sender_id)), true);

// Verifikasi Alur COD (Cash on Delivery) dengan Kode Verifikasi Pertemuan
// 1. Buat barang baru untuk COD
const bCod = await call('POST', '/api/barang', {
  id_kategori: 1, nama_barang: 'Headphone Gaming COD', harga_jual: 250000, kondisi: 'baik'
}, UPenjual);
assert.equal(bCod.s, 201);
const idBarangCod = bCod.j.id;

// 2. Pembeli checkout dengan COD
const txCodRes = await call('POST', '/api/transaksi', {
  id_barang: idBarangCod,
  jenis_transaksi: 'beli',
  lokasi: 'Kantin Pusat ITG',
  metode_pembayaran: 'COD (Bayar di Tempat)'
}, U);
assert.equal(txCodRes.s, 201);
const txCod = txCodRes.j;
assert.equal(txCod.status, 'pending');
assert.match(txCod.cod_pin, /^\d{4}$/); // Harus 4 digit angka

// 3. Pembeli melihat detail transaksi -> cod_pin terlihat
const txBuyerGet = await call('GET', `/api/transaksi/${txCod.id_transaksi}`, null, U);
assert.equal(txBuyerGet.s, 200);
assert.equal(txBuyerGet.j.cod_pin, txCod.cod_pin);
assert.equal(txBuyerGet.j.is_pembeli, true);

// 4. Penjual melihat detail transaksi -> cod_pin dirahasiakan (null)
const txSellerGet = await call('GET', `/api/transaksi/${txCod.id_transaksi}`, null, UPenjual);
assert.equal(txSellerGet.s, 200);
assert.equal(txSellerGet.j.cod_pin, null);
assert.equal(txSellerGet.j.is_penjual, true);

// 5. Penjual menerima pesanan (pending -> accepted)
const txAcceptRes = await call('PATCH', `/api/transaksi/${txCod.id_transaksi}/terima`, null, UPenjual);
assert.equal(txAcceptRes.s, 200);
assert.equal(txAcceptRes.j.status, 'accepted');

// 6. Penjual mencoba menyelesaikan dengan PIN yang salah -> harus ditolak 400
const txWrongPin = await call('PATCH', `/api/transaksi/${txCod.id_transaksi}/selesai`, { pin: '0000' }, UPenjual);
assert.equal(txWrongPin.s, 400);

// 7. Penjual menyelesaikan transaksi dengan PIN yang benar dari pembeli -> status completed
const txDoneRes = await call('PATCH', `/api/transaksi/${txCod.id_transaksi}/selesai`, { pin: txCod.cod_pin }, UPenjual);
assert.equal(txDoneRes.s, 200);
assert.equal(txDoneRes.j.status, 'completed');
assert.equal(txDoneRes.j.poin_didapat, 25); // 250.000 / 10.000 = 25 GP

// 8. Pengujian Penolakan oleh Penjual (pending -> cancelled)
const bTolak = await call('POST', '/api/barang', {
  id_kategori: 1, nama_barang: 'Kamera Mirrorless COD', harga_jual: 1500000, kondisi: 'baik'
}, UPenjual);
const txTolakOrder = await call('POST', '/api/transaksi', {
  id_barang: bTolak.j.id, jenis_transaksi: 'beli', lokasi: 'Gedung A', metode_pembayaran: 'COD'
}, U);
const rejectRes = await call('PATCH', `/api/transaksi/${txTolakOrder.j.id_transaksi}/tolak`, { alasan: 'Stok barang mendadak rusak' }, UPenjual);
assert.equal(rejectRes.s, 200);
assert.equal(rejectRes.j.status, 'cancelled');
assert.equal(rejectRes.j.alasan_batal, 'Stok barang mendadak rusak');

// 9. Pengujian Pembatalan oleh Pembeli / Penjual saat status accepted (accepted -> cancelled)
const bBatal = await call('POST', '/api/barang', {
  id_kategori: 1, nama_barang: 'Mouse Wireless COD', harga_jual: 50000, kondisi: 'baik'
}, UPenjual);
const txBatalOrder = await call('POST', '/api/transaksi', {
  id_barang: bBatal.j.id, jenis_transaksi: 'beli', lokasi: 'Gedung B', metode_pembayaran: 'COD'
}, U);
await call('PATCH', `/api/transaksi/${txBatalOrder.j.id_transaksi}/terima`, null, UPenjual); // Menjadi accepted
const cancelBuyerRes = await call('PATCH', `/api/transaksi/${txBatalOrder.j.id_transaksi}/batal`, { alasan: 'Tidak bisa datang ke lokasi pertemuan' }, U);
assert.equal(cancelBuyerRes.s, 200);
assert.equal(cancelBuyerRes.j.status, 'cancelled');
assert.equal(cancelBuyerRes.j.alasan_batal, 'Tidak bisa datang ke lokasi pertemuan');

// 10. Multi-foto: backend menyimpan JSON array dan membatasi maksimal 5 gambar
const bMulti = await call('POST', '/api/barang', {
  id_kategori: 1,
  nama_barang: 'Barang Multi Foto',
  harga_sewa: 5000,
  kondisi: 'baik',
  foto: ['/img/1.png', '/img/2.png', '/img/3.png', '/img/4.png', '/img/5.png', '/img/6.png']
}, UPenjual);
assert.equal(bMulti.s, 201);
const detailMulti = await call('GET', `/api/barang/${bMulti.j.id}`);
const fotoBarang = JSON.parse(detailMulti.j.foto);
assert.equal(Array.isArray(fotoBarang), true);
assert.equal(fotoBarang.length, 5);
assert.deepEqual(fotoBarang, ['/img/1.png', '/img/2.png', '/img/3.png', '/img/4.png', '/img/5.png']);

const mPemilik = await call('POST', '/api/register', {
  nama: 'Pemilik Kost', email: 'pemilik@itg.ac.id', password: 'password123', role: 'pemilik_kost'
});
assert.equal(mPemilik.s, 201);
assert.equal(mPemilik.j.role, 'pemilik_kost');
assert.equal(mPemilik.j.status_akun, 'pending');
assert.match(mPemilik.j.pesan, /sedang direview oleh Admin/i);

// Uji login saat status pemilik_kost masih pending
const loginPendingKost = await call('POST', '/api/login', { email: 'pemilik@itg.ac.id', password: 'password123' });
assert.equal(loginPendingKost.s, 403);
assert.equal(loginPendingKost.j.error, 'Akun Pemilik Kost Anda belum diverifikasi oleh Admin. Silakan tunggu.');

// Admin melihat daftar pemilik kost pending
const listPendingKost = await call('GET', '/api/admin/pemilik-kost/pending', null, A);
assert.equal(listPendingKost.s, 200);
assert.ok(listPendingKost.j.pemilik_kost.some(u => u.email === 'pemilik@itg.ac.id'));

// Admin menyetujui akun pemilik kost
const approveKostUser = await call('PATCH', `/api/admin/pemilik-kost/${mPemilik.j.id_mahasiswa}/approve`, null, A);
assert.equal(approveKostUser.s, 200);
assert.equal(approveKostUser.j.user.status_akun, 'approved');

// Setelah disetujui, pemilik kost dapat login
const loginSuccessKost = await call('POST', '/api/login', { email: 'pemilik@itg.ac.id', password: 'password123' });
assert.equal(loginSuccessKost.s, 200);
assert.equal(loginSuccessKost.j.role, 'pemilik_kost');

// Uji validasi intended_role di pintu login (role tidak sesuai)
const wrongDoorMhsToKost = await call('POST', '/api/login', {
  email: 'penjual@itg.ac.id',
  password: 'password123',
  intended_role: 'pemilik_kost'
});
assert.equal(wrongDoorMhsToKost.s, 403);
assert.equal(wrongDoorMhsToKost.j.error, 'Role tidak sesuai dengan pintu login');

const wrongDoorKostToMhs = await call('POST', '/api/login', {
  email: 'pemilik@itg.ac.id',
  password: 'password123',
  intended_role: 'mahasiswa'
});
assert.equal(wrongDoorKostToMhs.s, 403);
assert.equal(wrongDoorKostToMhs.j.error, 'Role tidak sesuai dengan pintu login');

const correctDoorKost = await call('POST', '/api/login', {
  email: 'pemilik@itg.ac.id',
  password: 'password123',
  intended_role: 'pemilik_kost'
});
assert.equal(correctDoorKost.s, 200);
assert.equal(correctDoorKost.j.role, 'pemilik_kost');

const UPemilik = { authorization: `Bearer ${loginSuccessKost.j.token}` };
const kosMulti = await call('POST', '/api/kos', {
  nama_kos: 'Kos Multi Foto',
  alamat: 'Jl. Kampus No. 1',
  harga_bulan: 800000,
  foto: ['/img/kos1.png', '/img/kos2.png', '/img/kos3.png', '/img/kos4.png', '/img/kos5.png', '/img/kos6.png']
}, UPemilik);
assert.equal(kosMulti.s, 201);
assert.equal(kosMulti.j.status_postingan, 'pending');
assert.match(kosMulti.j.pesan, /menunggu persetujuan Admin/i);

const detailKos = await call('GET', `/api/kos/${kosMulti.j.id}`);
const fotoKos = JSON.parse(detailKos.j.foto);
assert.equal(fotoKos.length, 5);
assert.deepEqual(fotoKos, ['/img/kos1.png', '/img/kos2.png', '/img/kos3.png', '/img/kos4.png', '/img/kos5.png']);

// Filter tipe kos (Putra, Putri, Campur, Semua)
const kPutra = await call('POST', '/api/kos', {
  nama_kos: 'Kos Garuda Putra', alamat: 'Jl. Garuda No. 1', harga_bulan: 750000, jenis_kelamin: 'putra'
}, UPemilik);
assert.equal(kPutra.s, 201);
assert.equal(kPutra.j.status_postingan, 'pending');

const kPutri = await call('POST', '/api/kos', {
  nama_kos: 'Kos Melati Putri', alamat: 'Jl. Melati No. 2', harga_bulan: 850000, tipe_kos: 'putri'
}, UPemilik);
assert.equal(kPutri.s, 201);
assert.equal(kPutri.j.status_postingan, 'pending');

// Sebelum diapprove Admin, kos berstatus pending TIDAK boleh tayang di pencarian publik
const publicBeforeApprove = await call('GET', '/api/kos?tipe=putra');
assert.equal(publicBeforeApprove.s, 200);
assert.equal(publicBeforeApprove.j.some(k => k.id_kos === kPutra.j.id), false);

// Pemilik kost tetap bisa melihat kos pending miliknya di /api/kos/miliku
const milikuRes = await call('GET', '/api/kos/miliku', null, UPemilik);
assert.equal(milikuRes.s, 200);
assert.ok(milikuRes.j.some(k => k.id_kos === kPutra.j.id));

// Admin melihat antrean postingan kos pending
const pendingKosList = await call('GET', '/api/admin/kos/pending', null, A);
assert.equal(pendingKosList.s, 200);
assert.ok(pendingKosList.j.kos.some(k => k.id_kos === kPutra.j.id));

// Admin menyetujui postingan kos kPutra, kPutri, dan kosMulti
const appKos1 = await call('PATCH', `/api/admin/kos/${kPutra.j.id}/approve`, null, A);
assert.equal(appKos1.s, 200);
assert.equal(appKos1.j.kos.status_postingan, 'approved');

const appKos2 = await call('PATCH', `/api/admin/kos/${kPutri.j.id}/approve`, null, A);
assert.equal(appKos2.s, 200);
assert.equal(appKos2.j.kos.status_postingan, 'approved');

const appKos3 = await call('PATCH', `/api/admin/kos/${kosMulti.j.id}/approve`, null, A);
assert.equal(appKos3.s, 200);
assert.equal(appKos3.j.kos.status_postingan, 'approved');

// Uji reject postingan kos
const kDitolak = await call('POST', '/api/kos', {
  nama_kos: 'Kos Fiktif Ditolak', alamat: 'Jl. Misterius No. 0', harga_bulan: 500000
}, UPemilik);
const rejKosRes = await call('PATCH', `/api/admin/kos/${kDitolak.j.id}/reject`, { alasan: 'Alamat tidak ditemukan' }, A);
assert.equal(rejKosRes.s, 200);
assert.equal(rejKosRes.j.kos.status_postingan, 'rejected');

// Pemilik kost: kelola pengajuan sewa kos dan approval
await db.prepare(`
  INSERT OR REPLACE INTO pengajuan_sewa_kos (id_pengajuan, id_kos, id_pemilik, nama_penyewa, email_penyewa, status)
  VALUES (1, 1, 1, 'Rina Maharani', 'rina@itg.ac.id', 'pending')
`).run();

const listPengajuanPending = await call('GET', '/api/kos/pengajuan', null, UPemilik);
assert.equal(listPengajuanPending.s, 200);
assert.equal(listPengajuanPending.j.length, 1);
assert.equal(listPengajuanPending.j[0].status, 'pending');

// PUT /api/transaksi/:id/approve mengeksekusi UPDATE status ke approved
const approveTxKosPut = await call('PUT', '/api/transaksi/1/approve', null, UPemilik);
assert.equal(approveTxKosPut.s, 200);
assert.equal(approveTxKosPut.j.status, 'approved');

// Setelah disetujui, query daftar antrean baru tidak me-return pesanan approved (harus kosong)
const listPengajuanSetelahApprove = await call('GET', '/api/kos/pengajuan', null, UPemilik);
assert.equal(listPengajuanSetelahApprove.s, 200);
assert.equal(listPengajuanSetelahApprove.j.length, 0);

// Pengujian tolak / reject pengajuan sewa kos
await db.prepare(`
  INSERT OR REPLACE INTO pengajuan_sewa_kos (id_pengajuan, id_kos, id_pemilik, nama_penyewa, email_penyewa, status)
  VALUES (2, 1, 1, 'Budi Santoso', 'budi@itg.ac.id', 'pending')
`).run();
const tolakTxKosPut = await call('PUT', '/api/transaksi/2/reject', { alasan: 'Kamar penuh' }, UPemilik);
assert.equal(tolakTxKosPut.s, 200);
assert.equal(tolakTxKosPut.j.status, 'rejected');

// Uji reject akun pemilik kost
const mDitolak = await call('POST', '/api/register', {
  nama: 'Akun Palsu', email: 'palsu@itg.ac.id', password: 'password123', role: 'pemilik_kost'
});
await call('PATCH', `/api/admin/users/${mDitolak.j.id_mahasiswa}/reject`, { alasan: 'KTP tidak valid' }, A);
const loginRejected = await call('POST', '/api/login', { email: 'palsu@itg.ac.id', password: 'password123' });
assert.equal(loginRejected.s, 403);
assert.match(loginRejected.j.error, /ditolak oleh admin/i);

const filterPutra = await call('GET', '/api/kos?tipe=putra');
assert.equal(filterPutra.s, 200);
assert.ok(filterPutra.j.length >= 1);
assert.ok(filterPutra.j.every(k => k.tipe_kos === 'putra' || k.jenis_kelamin === 'putra'));

const filterPutri = await call('GET', '/api/kos?tipe=putri');
assert.equal(filterPutri.s, 200);
assert.ok(filterPutri.j.length >= 1);
assert.ok(filterPutri.j.every(k => k.tipe_kos === 'putri' || k.jenis_kelamin === 'putri'));

const filterCampur = await call('GET', '/api/kos?tipe=campur');
assert.equal(filterCampur.s, 200);
assert.ok(filterCampur.j.length >= 1);
assert.ok(filterCampur.j.every(k => k.tipe_kos === 'campur' || k.jenis_kelamin === 'campur'));

const filterSemua = await call('GET', '/api/kos?tipe=semua');
assert.equal(filterSemua.s, 200);
const listTanpaFilter = await call('GET', '/api/kos');
assert.equal(listTanpaFilter.s, 200);
assert.equal(filterSemua.j.length, listTanpaFilter.j.length);

const filterGenderAlias = await call('GET', '/api/kos?gender=putra');
assert.equal(filterGenderAlias.s, 200);
assert.equal(filterGenderAlias.j.length, filterPutra.j.length);

const badGeo = await call('GET', '/api/reverse-geocode?lat=abc&lon=def');
assert.equal(badGeo.s, 400);

// ==========================================
// Uji Fitur Pengajuan Sewa & Pesanan Masuk Pemilik Kost
// ==========================================
// 1. Mahasiswa mengajukan sewa kos via POST /api/sewa dengan payload kos_id
const sewaKosReq = await call('POST', '/api/sewa', {
  kos_id: kPutra.j.id,
  kamar: 'Kamar B-01',
  durasi_bulan: 3,
  total_harga: 2250000
}, U);
assert.equal(sewaKosReq.s, 201);
assert.equal(sewaKosReq.j.status, 'pending');
assert.equal(sewaKosReq.j.kos_id, kPutra.j.id);
assert.equal(sewaKosReq.j.pemilik_id, mPemilik.j.id_mahasiswa);
assert.ok(sewaKosReq.j.user_id);

// Pastikan data tersimpan di pengajuan_sewa_kos dan pesanan
const dbOrder = await db.prepare('SELECT * FROM pengajuan_sewa_kos WHERE id_pengajuan=?').get(sewaKosReq.j.id_pengajuan);
assert.ok(dbOrder);
assert.equal(dbOrder.status, 'pending');
assert.equal(dbOrder.pemilik_id, mPemilik.j.id_mahasiswa);

// 2. Pemilik kost mengambil daftar pesanan masuk via GET /api/pesanan-masuk
const pesananMasukOwner = await call('GET', '/api/pesanan-masuk', null, UPemilik);
assert.equal(pesananMasukOwner.s, 200);
assert.ok(Array.isArray(pesananMasukOwner.j));
assert.ok(pesananMasukOwner.j.some(p => p.id_pengajuan === sewaKosReq.j.id_pengajuan));

// 3. Role guard: Mahasiswa dilarang mengakses GET /api/pesanan-masuk (403)
const pesananMasukForbiddenMhs = await call('GET', '/api/pesanan-masuk', null, U);
assert.equal(pesananMasukForbiddenMhs.s, 403);

// 4. Pemilik menyetujui pesanan sewa
const approvePesanan = await call('PATCH', `/api/kos/pengajuan/${sewaKosReq.j.id_pengajuan}/terima`, null, UPemilik);
assert.equal(approvePesanan.s, 200);
assert.equal(approvePesanan.j.status, 'approved');

// Setelah disetujui, pesanan tidak lagi muncul di antrean pending
const pesananSetelahApprove = await call('GET', '/api/pesanan-masuk', null, UPemilik);
assert.equal(pesananSetelahApprove.s, 200);
assert.ok(!pesananSetelahApprove.j.some(p => p.id_pengajuan === sewaKosReq.j.id_pengajuan));

// ==========================================
// Uji Fitur Manajemen Stok Kamar & Auto-generate (kamar_kos) (BUG 2 & BUG 3)
// ==========================================
// 1. Pemilik Kost mengunggah properti baru dengan jumlah_kamar = 3
const newKosReq = await call('POST', '/api/kos', {
  nama_kos: 'Kos Harmoni Cendekia',
  alamat: 'Jl. Sukagalih No. 45 Garut',
  harga_bulan: 750000,
  jumlah_kamar: 3,
  tipe_kos: 'campur'
}, UPemilik);
assert.equal(newKosReq.s, 201);
const newKosId = newKosReq.j.id;

// Verifikasi di backend tabel kamar_kos: otomatis membuat 3 baris ("Kamar 01", "Kamar 02", "Kamar 03") dengan status 'available'
const dbRooms = await db.prepare('SELECT * FROM kamar_kos WHERE kos_id=? ORDER BY id ASC').all(newKosId);
assert.equal(dbRooms.length, 3);
assert.equal(dbRooms[0].nomor_kamar, 'Kamar 01');
assert.equal(dbRooms[0].status, 'available');
assert.equal(dbRooms[1].nomor_kamar, 'Kamar 02');
assert.equal(dbRooms[1].status, 'available');
assert.equal(dbRooms[2].nomor_kamar, 'Kamar 03');
assert.equal(dbRooms[2].status, 'available');

// Single source of truth: kamar_tersedia dihitung dari room status available
const kosDetailBefore = await call('GET', `/api/kos/${newKosId}`);
assert.equal(kosDetailBefore.j.kamar_tersedia, 3);

// 2. Fetch list kamar via endpoint GET /api/kos/:id/kamar
const apiRooms = await call('GET', `/api/kos/${newKosId}/kamar`);
assert.equal(apiRooms.s, 200);
assert.equal(apiRooms.j.length, 3);
assert.ok(apiRooms.j.every(r => r.status === 'available'));

// 3. Mahasiswa mengajukan sewa spesifik pada "Kamar 02" -> status kamar menjadi 'pending'
const sewaKamar2 = await call('POST', '/api/sewa', {
  kos_id: newKosId,
  kamar: 'Kamar 02',
  durasi_bulan: 6,
  total_harga: 4500000
}, U);
assert.equal(sewaKamar2.s, 201);
assert.equal(sewaKamar2.j.status, 'pending');

// Verifikasi status kamar menjadi pending
const room2AfterSewa = await db.prepare("SELECT status FROM kamar_kos WHERE kos_id=? AND nomor_kamar='Kamar 02'").get(newKosId);
assert.equal(room2AfterSewa.status, 'pending');

// 4. Validasi server side (BUG 3): Coba submit sewa ulang pada kamar yang sama (Kamar 02) saat pending -> HARUS ditolak HTTP 409
const doubleBookingPending = await call('POST', '/api/sewa', {
  kos_id: newKosId,
  kamar: 'Kamar 02',
  durasi_bulan: 3,
  total_harga: 2250000
}, U);
assert.equal(doubleBookingPending.s, 409);
assert.match(doubleBookingPending.j.error, /Kamar sudah dipesan/i);

// 5. Pemilik Kost menyetujui (approve) pesanan tersebut -> status kamar menjadi 'booked'
const approveKamar2 = await call('PATCH', `/api/kos/pengajuan/${sewaKamar2.j.id_pengajuan}/terima`, null, UPemilik);
assert.equal(approveKamar2.s, 200);
assert.equal(approveKamar2.j.status, 'approved');

// 6. Verifikasi penguncian kamar di database: status menjadi 'booked'
const dbRoomsAfter = await db.prepare('SELECT * FROM kamar_kos WHERE kos_id=? ORDER BY id ASC').all(newKosId);
const room1 = dbRoomsAfter.find(r => r.nomor_kamar === 'Kamar 01');
const room2 = dbRoomsAfter.find(r => r.nomor_kamar === 'Kamar 02');
const room3 = dbRoomsAfter.find(r => r.nomor_kamar === 'Kamar 03');

assert.equal(room1.status, 'available');
assert.equal(room2.status, 'booked'); // Terkunci menjadi 'booked'
assert.equal(room3.status, 'available');

// Sisa kamar tersedia pada kos otomatis tersinkronisasi menjadi 2
const dbKosAfter = await db.prepare('SELECT kamar_tersedia FROM kos WHERE id_kos=?').get(newKosId);
assert.equal(dbKosAfter.kamar_tersedia, 2);

// 7. Coba submit sewa ulang pada kamar yang sudah 'booked' -> HARUS ditolak HTTP 409
const doubleBookingBooked = await call('POST', '/api/sewa', {
  kos_id: newKosId,
  kamar: 'Kamar 02',
  durasi_bulan: 1,
  total_harga: 750000
}, U);
assert.equal(doubleBookingBooked.s, 409);
assert.match(doubleBookingBooked.j.error, /Kamar sudah dipesan/i);

// 8. Alur tolak: Mahasiswa ajukan Kamar 01 -> Pemilik tolak -> Kamar 01 kembali available
const sewaKamar1 = await call('POST', '/api/sewa', {
  kos_id: newKosId,
  kamar: 'Kamar 01',
  durasi_bulan: 1,
  total_harga: 750000
}, U);
assert.equal(sewaKamar1.s, 201);
assert.equal((await db.prepare("SELECT status FROM kamar_kos WHERE kos_id=? AND nomor_kamar='Kamar 01'").get(newKosId)).status, 'pending');

const tolakKamar1 = await call('PATCH', `/api/kos/pengajuan/${sewaKamar1.j.id_pengajuan}/tolak`, null, UPemilik);
assert.equal(tolakKamar1.s, 200);
assert.equal((await db.prepare("SELECT status FROM kamar_kos WHERE kos_id=? AND nomor_kamar='Kamar 01'").get(newKosId)).status, 'available');

// kamar_tersedia kembali menjadi 2
const kosDetailFinal = await call('GET', `/api/kos/${newKosId}`);
assert.equal(kosDetailFinal.j.kamar_tersedia, 2);

// ==========================================
// Uji Endpoint Foto & Cloudinary (Multer memoryStorage)
// ==========================================
const fd = new FormData();
fd.append('foto', new Blob(['test-image-binary-data'], { type: 'image/png' }), 'sample.png');
const upRes = await fetch(base + '/api/upload', {
  method: 'POST',
  body: fd,
});
assert.equal(upRes.status, 200);
const upJson = await upRes.json();
assert.equal(upJson.ok, true);
assert.ok(upJson.secure_url);
assert.ok(Array.isArray(upJson.urls) && upJson.urls.length === 1);

// ==========================================
// Uji Fungsi Navigasi goBack (Fallback tanpa referrer)
// ==========================================
const apiJsRes = await call('GET', '/js/api.js');
assert.equal(apiJsRes.s, 200);
assert.match(String(apiJsRes.j), /function goBack/);

{
  const mockWindow = {
    location: { href: 'http://localhost:3000/detail.html?id=1', origin: 'http://localhost:3000' },
    history: { length: 1, back: () => { mockWindow.history.called = true; } },
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  };
  const mockDocument = {
    referrer: '',
    readyState: 'complete',
    querySelectorAll: () => [],
    addEventListener: () => {},
  };
  
  const runGoBack = new Function('window', 'document', 'localStorage', `
    ${apiJsRes.j}
    return window.goBack('/beranda.html');
  `);
  
  const target = runGoBack(mockWindow, mockDocument, mockWindow.localStorage);
  assert.equal(target, '/beranda.html', 'goBack harus fallback ke /beranda.html saat tanpa referrer');
  assert.equal(mockWindow.location.href, '/beranda.html');

  // Uji goBack dengan referrer valid
  const mockWindow2 = {
    location: { href: 'http://localhost:3000/detail.html?id=1', origin: 'http://localhost:3000' },
    history: { length: 2, back: () => { mockWindow2.history.called = true; } },
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  };
  const mockDocument2 = {
    referrer: 'http://localhost:3000/cari.html',
    readyState: 'complete',
    querySelectorAll: () => [],
    addEventListener: () => {},
  };
  const target2 = (new Function('window', 'document', 'localStorage', `
    ${apiJsRes.j}
    return window.goBack('/beranda.html');
  `))(mockWindow2, mockDocument2, mockWindow2.localStorage);
  assert.equal(target2, 'history.back');
  assert.equal(mockWindow2.history.called, true);
}

// Uji Kategori "Lainnya" (NOMOR 2)
{
  const barangLain = {
    id_penjual: 1,
    nama_barang: 'Gitar Akustik Yamaha',
    harga_sewa: 15000,
    kondisi: 'baik',
    kategori: 'lainnya',
  };

  // 1. Kategori lainnya valid
  const resValid = await call('POST', '/api/barang', { ...barangLain, kategori_lain: 'Alat Musik' }, A);
  assert.equal(resValid.s, 201, 'unggah kategori lainnya valid harus 201');
  const idBarang = resValid.j.id;

  // Cek detail barang dan pastikan kategori_lain tersimpan
  const detail = await call('GET', `/api/barang/${idBarang}`);
  assert.equal(detail.s, 200);
  assert.equal(detail.j.kategori_lain, 'Alat Musik');

  // Cek filter kategori=lainnya di katalog
  const listLainnya = await call('GET', '/api/barang?kategori=lainnya');
  assert.equal(listLainnya.s, 200);
  assert.ok(listLainnya.j.some(b => b.id_barang === idBarang), 'barang harus muncul di filter kategori=lainnya');

  // Cek pencarian kata kunci mencocokkan kategori_lain
  const listSearch = await call('GET', '/api/barang?q=Musik');
  assert.equal(listSearch.s, 200);
  assert.ok(listSearch.j.some(b => b.id_barang === idBarang), 'barang harus ditemukan dari teks kategori_lain');

  // 2. Kategori lainnya kosong (harus 400)
  const resKosong = await call('POST', '/api/barang', { ...barangLain, kategori_lain: '   ' }, A);
  assert.equal(resKosong.s, 400, 'kategori_lain kosong harus 400');

  // 3. Kategori lainnya terlalu panjang > 30 karakter (harus 400)
  const resPanjang = await call('POST', '/api/barang', { ...barangLain, kategori_lain: 'Alat Musik Sangat Panjang Sekali Lebih Dari 30 Huruf' }, A);
  assert.equal(resPanjang.s, 400, 'kategori_lain > 30 karakter harus 400');

  // 4. Kategori lainnya berisi karakter <script> (harus 400)
  const resScript = await call('POST', '/api/barang', { ...barangLain, kategori_lain: '<script>alert(1)</script>' }, A);
  assert.equal(resScript.s, 400, 'kategori_lain berisi tag script harus 400');
}

// Uji Foto Profil (NOMOR 3: Unggah, Ganti, Hapus, Izin, Keamanan)
{
  const validPngDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const validJpegDataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

  // 1. Akses endpoint hapus tanpa login -> 401
  assert.equal((await call('DELETE', '/api/profil/foto')).s, 401, 'hapus foto tanpa login harus 401');

  // 2. Unggah file bukan gambar (teks biasa/script) -> 400
  const fakeFile = await call('PATCH', '/api/profil/foto', { foto: 'data:image/png;base64,SGVsbG8gV29ybGQh' }, U);
  assert.equal(fakeFile.s, 400, 'unggah file bukan gambar harus 400');

  // 3. User A unggah foto profil valid -> 200
  const uploadRes = await call('PATCH', '/api/profil/foto', { foto: validPngDataUrl }, U);
  assert.equal(uploadRes.s, 200, 'unggah foto profil valid harus 200');
  assert.ok(uploadRes.j.foto, 'response harus menyertakan URL foto');

  const profileAfterUpload = await call('GET', '/api/saya', null, U);
  assert.equal(profileAfterUpload.s, 200);
  assert.ok(profileAfterUpload.j.foto, 'foto profil user A harus terisi');

  // 4. User A ganti foto profil -> 200
  const changeRes = await call('PATCH', '/api/profil/foto', { foto: validJpegDataUrl }, U);
  assert.equal(changeRes.s, 200, 'ganti foto profil harus 200');

  // 5. User B menghapus foto (user A tidak terpengaruh / User A tidak bisa dihapus User B)
  const delResB = await call('DELETE', '/api/profil/foto', null, UPenyusup);
  assert.equal(delResB.s, 200);

  const profileUserA = await call('GET', '/api/saya', null, U);
  assert.ok(profileUserA.j.foto, 'foto user A tidak boleh terhapus oleh aksi user B');

  // 6. User A hapus foto -> 200
  const delResA = await call('DELETE', '/api/profil/foto', null, U);
  assert.equal(delResA.s, 200, 'hapus foto user A harus 200');

  const profileAfterDelete = await call('GET', '/api/saya', null, U);
  assert.equal(profileAfterDelete.j.foto, null, 'foto profil user A harus null setelah dihapus');

  // 7. Hapus foto saat tidak ada foto -> 200 (tidak error)
  const delResNull = await call('DELETE', '/api/profil/foto', null, U);
  assert.equal(delResNull.s, 200, 'hapus foto saat null harus tetap 200');
}

// Uji Slider Rentang Dua Penanda (NOMOR 5)
{
  const mockThumbLeft = { style: {}, setAttribute: () => {}, addEventListener: () => {} };
  const mockThumbRight = { style: {}, setAttribute: () => {}, addEventListener: () => {} };
  const mockHighlight = { style: {} };
  const mockContainer = {
    getBoundingClientRect: () => ({ left: 0, width: 300 }),
    addEventListener: () => {},
  };
  const mockInMin = { value: '', addEventListener: () => {} };
  const mockInMax = { value: '', addEventListener: () => {} };

  const testSliderCode = new Function('window', 'document', 'localStorage', `
    ${apiJsRes.j}
    return window.createRangeSlider({
      container: arguments[3],
      highlight: arguments[4],
      thumbLeft: arguments[5],
      thumbRight: arguments[6],
      inputMin: arguments[7],
      inputMax: arguments[8],
      min: 0,
      max: 1000000,
      step: 5000,
    });
  `);

  const mockWindow = {
    location: { href: 'http://localhost:3000' },
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  };
  const mockDocument = { readyState: 'complete', querySelectorAll: () => [], addEventListener: () => {} };
  const slider = testSliderCode(mockWindow, mockDocument, mockWindow.localStorage, mockContainer, mockHighlight, mockThumbLeft, mockThumbRight, mockInMin, mockInMax);

  assert.ok(slider, 'slider harus berhasil diinisialisasi');
  assert.equal(slider.getMin(), 0);
  assert.equal(slider.getMax(), 1000000);

  // Set nilai valid
  slider.setValues(25000, 150000);
  assert.equal(slider.getMin(), 25000);
  assert.equal(slider.getMax(), 150000);
  assert.equal(mockThumbLeft.style.left, '2.5%');
  assert.equal(mockThumbRight.style.left, '15%');
  assert.equal(mockHighlight.style.left, '2.5%');
  assert.equal(mockHighlight.style.width, '12.5%');

  // Penanda kiri tidak boleh melewati penanda kanan
  slider.setValues(300000, 200000);
  assert.ok(slider.getMin() <= slider.getMax(), 'penanda kiri tidak boleh melebihi kanan');

  // Reset mengembalikan penanda ke ujung kiri dan kanan
  slider.reset();
  assert.equal(slider.getMin(), 0);
  assert.equal(slider.getMax(), 1000000);
  assert.equal(mockThumbLeft.style.left, '0%');
  assert.equal(mockThumbRight.style.left, '100%');
}

// Uji Edit Data Diri: Angkatan dan Prodi (NOMOR 6)
{
  const currentYear = new Date().getFullYear();

  // 1. Update dari user yang belum login -> 401
  const resNoAuth = await call('PATCH', '/api/saya/data-diri', { prodi: 'Teknik Industri', angkatan: 2024 });
  assert.equal(resNoAuth.s, 401, 'update data diri tanpa login harus 401');

  // 2. Ambil data awal user dan status_verifikasi
  const userAwal = (await call('GET', '/api/saya', null, U)).j;
  const statusVerifAwal = userAwal.status_verifikasi;
  const roleAwal = userAwal.role;

  // 3. Simpan perubahan valid -> 200
  const resValid = await call('PATCH', '/api/saya/data-diri', { prodi: 'Teknik Informatika', angkatan: currentYear - 1 }, U);
  assert.equal(resValid.s, 200, 'update data diri valid harus 200');
  assert.equal(resValid.j.prodi, 'Teknik Informatika');
  assert.equal(resValid.j.angkatan, currentYear - 1);

  // 4. Cek perubahan tersimpan dan status_verifikasi / role tidak rusak
  const userSetelahnya = (await call('GET', '/api/saya', null, U)).j;
  assert.equal(userSetelahnya.prodi, 'Teknik Informatika');
  assert.equal(userSetelahnya.angkatan, currentYear - 1);
  assert.equal(userSetelahnya.status_verifikasi, statusVerifAwal, 'status_verifikasi tidak boleh berubah');
  assert.equal(userSetelahnya.role, roleAwal, 'role tidak boleh berubah');

  // 5. Angkatan tidak valid (400)
  assert.equal((await call('PATCH', '/api/saya/data-diri', { prodi: 'Sistem Informasi', angkatan: 'bukan-angka' }, U)).s, 400, 'angkatan non-angka harus 400');
  assert.equal((await call('PATCH', '/api/saya/data-diri', { prodi: 'Sistem Informasi', angkatan: 1990 }, U)).s, 400, 'angkatan terlalu lampau harus 400');
  assert.equal((await call('PATCH', '/api/saya/data-diri', { prodi: 'Sistem Informasi', angkatan: currentYear + 5 }, U)).s, 400, 'angkatan masa depan harus 400');

  // 6. Prodi terlalu pendek (< 2 karakter) -> 400
  assert.equal((await call('PATCH', '/api/saya/data-diri', { prodi: 'A', angkatan: currentYear }, U)).s, 400, 'prodi < 2 karakter harus 400');

  // 7. Prodi terlalu panjang (> 60 karakter) -> 400
  assert.equal((await call('PATCH', '/api/saya/data-diri', { prodi: 'P'.repeat(61), angkatan: currentYear }, U)).s, 400, 'prodi > 60 karakter harus 400');

  // 8. Prodi karakter aneh / berbahaya -> 400
  assert.equal((await call('PATCH', '/api/saya/data-diri', { prodi: '<script>alert(1)</script>', angkatan: currentYear }, U)).s, 400, 'prodi berisi script harus 400');
}

srv.close();
console.log('semua cek lolos');
