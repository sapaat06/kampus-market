process.env.DB = ':memory:';
process.env.ADMIN_KEY = 'k';
import assert from 'node:assert/strict';
const { app } = await import('../src/server.js');
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
const daftar = await call('POST', '/api/register', { nama: 'Budi', email: 'b@x.id', password: 'rahasia123' });
assert.equal(daftar.s, 201);
assert.match(daftar.cookies[0] ?? '', /HttpOnly/i);
assert.match(daftar.cookies[0] ?? '', /SameSite=Strict/i);
assert.equal((await call('POST', '/api/register', { nama: 'Budi', email: 'b@x.id', password: 'rahasia123' })).s, 409);
assert.equal((await call('POST', '/api/register', { nama: 'Budi', email: ' B@X.ID ', password: 'rahasia123' })).s, 409);
assert.equal((await call('POST', '/api/login', { email: 'b@x.id', password: 'salah' })).s, 401);
assert.equal((await call('POST', '/api/login', { email: 'b@x.id', password: 12345678 })).s, 400);

const login = await call('POST', '/api/login', { email: 'B@X.ID', password: 'rahasia123' });
assert.equal(login.s, 200);

// test reset password
assert.equal((await call('POST', '/api/reset-password', { email: 'tidakada@x.id', password_baru: 'passwordbaru123' })).s, 404);
assert.equal((await call('POST', '/api/reset-password', { email: 'b@x.id', password_baru: 'pendek' })).s, 400);
const rPass = await call('POST', '/api/reset-password', { email: 'b@x.id', password_baru: 'passwordbaru123' });
assert.equal(rPass.s, 200);
assert.equal((await call('POST', '/api/login', { email: 'b@x.id', password: 'rahasia123' })).s, 401); // password lama gugur
const loginBaru = await call('POST', '/api/login', { email: 'b@x.id', password: 'passwordbaru123' });
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
assert.equal((await call('POST', '/api/login', { email: 'b@x.id', password: 'passwordbaru123' }, { origin: 'http://evil.com' })).s, 403);
assert.equal((await call('POST', '/api/login', { email: 'b@x.id', password: 'passwordbaru123' }, { origin: base })).s, 200);

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
assert.equal(resBatal.j.status, 'batal');
assert.equal((await call('GET', '/api/barang')).j.length, 1);

// verifikasi mahasiswa admin
const listMhs = await call('GET', '/api/mahasiswa', null, A);
assert.equal(listMhs.s, 200);
assert.equal(listMhs.j.length >= 1, true);
const vRes = await call('PATCH', `/api/mahasiswa/${listMhs.j[0].id_mahasiswa}/verifikasi`, { status_verifikasi: 'terverifikasi' }, A);
assert.equal(vRes.s, 200);
assert.equal(vRes.j.status_verifikasi, 'terverifikasi');

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

srv.close();
console.log('semua cek lolos');
