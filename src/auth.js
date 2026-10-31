import { randomBytes, scryptSync, timingSafeEqual, createHmac } from 'node:crypto';
import { ADMIN_KEY, SECRET } from './config.js';
import { db } from './db.js';
import { err } from './util.js';

export const hash = (pw) => {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(pw, salt, 64).toString('hex')}`;
};

export const verify = (pw, stored) => {
  if (typeof pw !== 'string') return false;
  const [salt, h] = String(stored).split(':');
  if (!salt || !h || h.length !== 128) return false;
  const harian = Buffer.from(h, 'hex');
  if (harian.length !== 64) return false;
  return timingSafeEqual(harian, scryptSync(pw, salt, 64));
};

const sign = (p) => createHmac('sha256', SECRET).update(p).digest('hex');

// Token = id.kadaluarsa.tandatangan (berlaku 24 jam).
const TOKEN = /^(\d{1,15})\.(\d{1,16})\.([0-9a-f]{64})$/;

export const makeToken = (id) => {
  const p = `${id}.${Date.now() + 864e5}`;
  return `${p}.${sign(p)}`;
};

const dariCookie = (req) => {
  const raw = req.headers?.cookie;
  if (!raw) return '';
  for (const bagian of raw.split(';')) {
    const [nama, ...nilai] = bagian.trim().split('=');
    if (nama === 'km_token') return nilai.join('=');
  }
  return '';
};

export const user = (req, _res, next) => {
  const bearer = (req.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  const m = TOKEN.exec(bearer || dariCookie(req));
  if (!m) return next(err(401, 'login dulu'));
  const [, id, exp, sig] = m;
  if (!timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(sign(`${id}.${exp}`), 'hex')))
    return next(err(401, 'login dulu'));
  if (Number(exp) <= Date.now()) return next(err(401, 'login dulu'));
  if (!db.prepare('SELECT 1 FROM mahasiswa WHERE id_mahasiswa=?').get(Number(id)))
    return next(err(401, 'login dulu'));
  req.uid = Number(id);
  next();
};

const sameKey = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export const admin = (req, _res, next) =>
  ADMIN_KEY && sameKey(req.get('x-admin-key') ?? '', ADMIN_KEY) ? next() : next(err(403, 'khusus admin'));

export const userOrAdmin = (req, res, next) => {
  if (ADMIN_KEY && sameKey(req.get('x-admin-key') ?? '', ADMIN_KEY)) {
    req.isAdmin = true;
    return next();
  }
  return user(req, res, next);
};

export const pemilikKost = (req, res, next) => {
  if (!req.uid) return next(err(401, 'login dulu'));
  const m = db.prepare('SELECT role FROM mahasiswa WHERE id_mahasiswa=?').get(req.uid);
  if (!m || m.role !== 'pemilik_kost') return next(err(403, 'khusus pemilik kost'));
  next();
};
