// Rate limiter in-memory, tanpa dependency. Cukup untuk satu proses Node.
const buckets = new Map();

const sweeper = setInterval(() => {
  const now = Date.now();
  for (const [k, b] of buckets) if (b.reset <= now) buckets.delete(k);
}, 60_000);
sweeper.unref?.();

export const limit = ({ name, max, windowMs, key = (req) => req.ip }) => (req, res, next) => {
  if (process.env.RATE_LIMIT_DISABLED === '1') return next();

  const id = `${name}:${key(req)}`;
  const now = Date.now();
  let b = buckets.get(id);
  if (!b || b.reset <= now) {
    b = { count: 0, reset: now + windowMs };
    buckets.set(id, b);
  }
  b.count += 1;

  const sisaDetik = Math.max(1, Math.ceil((b.reset - now) / 1000));
  res.set('RateLimit-Limit', String(max));
  res.set('RateLimit-Remaining', String(Math.max(0, max - b.count)));
  res.set('RateLimit-Reset', String(sisaDetik));

  if (b.count > max) {
    res.set('Retry-After', String(sisaDetik));
    return res.status(429).json({ error: 'terlalu banyak percobaan, coba lagi nanti' });
  }
  next();
};

// Dipakai tes agar hitungan antar-kasus tidak saling mempengaruhi.
export const resetLimits = () => buckets.clear();
