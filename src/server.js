import express from 'express';
import { join } from 'node:path';
import { err } from './util.js';
import { limit } from './limit.js';
import { router as auth } from './routes/auth.js';
import { router as barang } from './routes/barang.js';
import { router as transaksi } from './routes/transaksi.js';
import { router as estimasi } from './routes/estimasi.js';

export const app = express();
app.disable('x-powered-by');
const trustProxy = process.env.TRUST_PROXY;
if (trustProxy) app.set('trust proxy', trustProxy === 'true' ? true : Number(trustProxy) || trustProxy);

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'", // dipakai untuk warna thumb dan satu style di admin
  "img-src 'self' data:",
  "connect-src 'self'",
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
  res.set('permissions-policy', 'camera=(), microphone=(), geolocation=()');
  res.set('cross-origin-opener-policy', 'same-origin');
  res.set('cross-origin-resource-policy', 'same-origin');
  if (req.secure || req.get('x-forwarded-proto') === 'https')
    res.set('strict-transport-security', 'max-age=31536000; includeSubDomains');
  next();
});

app.use(express.json({ limit: '32kb' }));

app.use('/api', (_req, res, next) => { res.set('cache-control', 'no-store'); next(); });

// Tolak request lintas-origin untuk metode yang mengubah data (CSRF).
const UNSAFE = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
app.use('/api', (req, _res, next) => {
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
app.use('/api', limit({ name: 'api', max: 300, windowMs: 60e3 }));
const adminLimit = limit({ name: 'admin', max: 120, windowMs: 900e3 });
app.use('/api', (req, res, next) => req.get('x-admin-key') !== undefined ? adminLimit(req, res, next) : next());

app.use('/api', auth, barang, transaksi, estimasi);
app.use('/api', (_req, _res, next) => next(err(404, 'endpoint tidak ada')));
app.use(express.static(join(import.meta.dirname, '..', 'public')));

app.use((e, _req, res, _next) => {
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
  const port = process.env.PORT ?? 3000;
  app.listen(port, () => console.log(`Kampus Market jalan di http://localhost:${port}`));
}
