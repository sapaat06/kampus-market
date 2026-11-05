import express from 'express';
import { join } from 'node:path';
import { err } from './util.js';
import { limit } from './limit.js';
import { upload, uploadStream } from './upload.js';
import { initDb } from './db.js';
import { router as auth } from './routes/auth.js';
import { router as barang } from './routes/barang.js';
import { router as transaksi } from './routes/transaksi.js';
import { router as estimasi } from './routes/estimasi.js';
import { router as kos } from './routes/kos.js';
import { router as chat } from './routes/chat.js';
import { router as adminRouter } from './routes/admin.js';

export const app = express();
app.disable('x-powered-by');

// Reverse proxy trust untuk Render & HTTPS session cookie
app.set('trust proxy', 1);

let dbReady = null;
const ensureDb = async (_req, _res, next) => {
  try {
    if (!dbReady) dbReady = initDb();
    await dbReady;
    next();
  } catch (e) {
    dbReady = null;
    next(e);
  }
};

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'", // dipakai untuk warna thumb dan satu style di admin
  "img-src 'self' data: https:",
  "connect-src 'self' https://nominatim.openstreetmap.org",
  "frame-src 'self' https://www.openstreetmap.org https://*.openstreetmap.org https://maps.google.com https://www.google.com",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

app.use((req, res, next) => {
  res.set('content-security-policy', CSP);
  res.set('x-content-type-options', 'nosniff');
  res.set('x-frame-options', 'DENY');
  res.set('referrer-policy', 'same-origin');
  res.set('permissions-policy', 'camera=(), microphone=(), geolocation=(self)');
  res.set('cross-origin-opener-policy', 'same-origin');
  res.set('cross-origin-resource-policy', 'same-origin');
  if (req.secure || req.get('x-forwarded-proto') === 'https')
    res.set('strict-transport-security', 'max-age=31536000; includeSubDomains');
  next();
});

// Endpoint Health Check untuk Render
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use(express.json({ limit: '4mb' })); // Vercel ~4.5MB body limit; foto sudah di-resize di browser

const apiPrefixes = ['/api', '/chat', '/auth', '/admin'];

app.use(apiPrefixes, (_req, res, next) => { res.set('cache-control', 'no-store'); next(); });
app.use(apiPrefixes, ensureDb);

// Tolak request lintas-origin untuk metode yang mengubah data (CSRF).
const UNSAFE = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
app.use(apiPrefixes, (req, _res, next) => {
  if (!UNSAFE.has(req.method)) return next();
  const origin = req.get('origin');
  if (!origin) return next(); // klien CLI/API tanpa Origin
  try {
    if (new URL(origin).host !== req.get('host')) return next(err(403, 'origin tidak diizinkan'));
  } catch {
    return next(err(403, 'origin tidak valid'));
  }
  next();
});

// Batas umum per IP, lalu batas lebih ketat untuk percobaan kunci admin.
app.use(apiPrefixes, limit({ name: 'api', max: 300, windowMs: 60e3 }));
const adminLimit = limit({ name: 'admin', max: 120, windowMs: 900e3 });
app.use(['/api', '/admin'], (req, res, next) => req.get('x-admin-key') !== undefined ? adminLimit(req, res, next) : next());

// Endpoint mandiri unggah foto (Cloudinary via multer memoryStorage + upload_stream)
app.post(['/api/upload', '/upload'], upload.array('foto', 5), async (req, res, next) => {
  try {
    const files = req.files || [];
    if (!files.length && req.file) files.push(req.file);
    if (!files.length) return next(err(400, 'tidak ada file foto yang diunggah'));
    const urls = [];
    for (const f of files) {
      const url = await uploadStream(f.buffer, { mimetype: f.mimetype });
      urls.push(url);
    }
    res.json({ ok: true, urls, secure_url: urls[0], url: urls[0] });
  } catch (e) {
    next(e);
  }
});

// Mounting eksplisit untuk chat & auth router
app.use('/api/chat', chat);
app.use('/chat', chat);
app.use('/api/auth', auth);
app.use('/auth', auth);
app.use(['/sewa', '/pesanan-masuk'], kos);

// Mounting utama API
app.use('/api', auth, barang, transaksi, estimasi, kos, adminRouter);
app.use('/admin', adminRouter);
app.use(['/api', '/api/chat', '/chat', '/api/auth', '/auth', '/admin', '/sewa', '/pesanan-masuk'], (_req, _res, next) => next(err(404, 'endpoint tidak ada')));
app.use(express.static(join(import.meta.dirname, '..', 'public')));

app.use((e, _req, res, _next) => {
  if (e.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'payload terlalu besar: maksimal 4MB per file' });
  if (e.code === 'LIMIT_FILE_COUNT') return res.status(400).json({ error: 'maksimal 5 foto' });
  if (e.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON tidak valid' });
  if (e.type === 'entity.too.large') return res.status(413).json({ error: 'payload terlalu besar' });
  if (e.status) return res.status(e.status).json({ error: e.message });
  const msg = e.message ?? '';
  if (/UNIQUE/.test(msg)) return res.status(409).json({ error: 'data sudah ada' });
  if (/FOREIGN KEY|CHECK|NOT NULL|datatype mismatch|cannot store/i.test(msg))
    return res.status(400).json({ error: 'data tidak valid' });
  console.error(e);
  res.status(500).json({ error: 'kesalahan server' });
});

if (import.meta.filename === process.argv[1]) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Kampus Market jalan di http://localhost:${port}`));
}

export default app;
