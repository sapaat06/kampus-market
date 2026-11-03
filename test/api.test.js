process.env.DB = ':memory:';
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
for (const page of ['index', 'welcome', 'masuk', 'beranda', 'cari', 'kos', 'filter-kos', 'detail', 'chat', 'unggah', 'status-pinjam', 'profil', 'verifikasi', 'status-verifikasi', 'admin']) {
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
db.prepare("UPDATE mahasiswa SET status_verifikasi='terverifikasi' WHERE email='b@x.id'").run();

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
db.prepare("UPDATE mahasiswa SET status_verifikasi='terverifikasi' WHERE id_mahasiswa=?").run(listMhs.j[0].id_mahasiswa);

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
const UPemilik = { authorization: `Bearer ${mPemilik.j.token}` };
const kosMulti = await call('POST', '/api/kos', {
  nama_kos: 'Kos Multi Foto',
  alamat: 'Jl. Kampus No. 1',
  harga_bulan: 800000,
  foto: ['/img/kos1.png', '/img/kos2.png', '/img/kos3.png', '/img/kos4.png', '/img/kos5.png', '/img/kos6.png']
}, UPemilik);
assert.equal(kosMulti.s, 201);
const detailKos = await call('GET', `/api/kos/${kosMulti.j.id}`);
const fotoKos = JSON.parse(detailKos.j.foto);
assert.equal(fotoKos.length, 5);
assert.deepEqual(fotoKos, ['/img/kos1.png', '/img/kos2.png', '/img/kos3.png', '/img/kos4.png', '/img/kos5.png']);

srv.close();
console.log('semua cek lolos');
