import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';

// Cloudinary otomatis membaca process.env.CLOUDINARY_URL jika diatur.
// Konfigurasi batas foto: maksimal 5 foto, maksimal 5MB per file.
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 4 * 1024 * 1024, // 4MB per file (Vercel body limit ~4.5MB)
    files: 5,                  // Maksimal 5 foto
  },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      return cb(Object.assign(new Error('Hanya file foto (JPG, PNG, WebP) yang diizinkan'), { status: 400 }));
    }
    cb(null, true);
  },
});

// Cek apakah Cloudinary benar-benar dikonfigurasi (bukan placeholder).
// Kalau tidak valid, upload disimpan sebagai data URL agar flow lokal tetap jalan.
const CLOUDINARY_URL = process.env.CLOUDINARY_URL || '';
const CLOUDINARY_ENABLED = (() => {
  if (!CLOUDINARY_URL) return false;
  if (/KEYASLI|SECRETASLI|api_key|api_secret/i.test(CLOUDINARY_URL)) return false;
  try {
    const u = new URL(CLOUDINARY_URL);
    return u.protocol === 'cloudinary:' && Boolean(u.username && u.password && u.host);
  } catch {
    return false;
  }
})();

const toDataUrl = (buffer, mimetype = 'image/jpeg') =>
  `data:${mimetype};base64,${buffer.toString('base64')}`;

export const CHAT_FILE_MAX = 5 * 1024 * 1024; // 5MB
export const CHAT_FILE_MIME = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
]);

export const uploadFileToCloudinary = async (buffer, mimeType, originalName = 'file') => {
  const safeName = String(originalName || 'file').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
  const fallback = () => toDataUrl(buffer, mimeType);
  if (!CLOUDINARY_ENABLED) return fallback();
  return new Promise((resolve, reject) => {
    const isImage = /^image\//i.test(mimeType);
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'kampus-market/chat',
        resource_type: isImage ? 'image' : 'raw',
        public_id: `${Date.now()}_${safeName.replace(/\.[^.]+$/, '')}`,
        use_filename: false,
      },
      (error, result) => {
        if (error) {
          if (process.env.NODE_ENV !== 'production' && (error.http_code === 401 || error.http_code === 403)) {
            console.warn('[upload] Cloudinary menolak kredensial (chat file), memakai fallback data URL.');
            return resolve(fallback());
          }
          return reject(error);
        }
        resolve(result.secure_url || result.url);
      }
    );
    stream.end(buffer);
  });
};

/**
 * Upload single buffer to Cloudinary using upload_stream.
 * Jika CLOUDINARY_URL tidak diatur / masih placeholder (mis. offline/tes lokal),
 * fallback ke data URL agar flow aplikasi tetap berjalan tanpa internet.
 */
export const uploadStream = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const mime = options.mimetype || 'image/jpeg';
    const fallback = () => resolve(toDataUrl(buffer, mime));

    if (!CLOUDINARY_ENABLED) return fallback();

    const stream = cloudinary.uploader.upload_stream(
      { folder: 'kampus-market', resource_type: 'image', ...options },
      (error, result) => {
        if (error) {
          // Kredensial ditolak saat dev: jangan gagalkan upload, simpan sebagai data URL.
          if (process.env.NODE_ENV !== 'production' && (error.http_code === 401 || error.http_code === 403)) {
            console.warn('[upload] Cloudinary menolak kredensial, memakai fallback data URL.');
            return fallback();
          }
          return reject(error);
        }
        resolve(result.secure_url || result.url);
      }
    );
    stream.end(buffer);
  });
};

/**
 * Upload string (data URL base64 atau URL biasa) atau buffer ke Cloudinary.
 * Menyimpan secure_url hasil upload.
 */
export const uploadToCloudinary = async (item, mimeType = 'image/jpeg') => {
  if (!item) return null;

  if (Buffer.isBuffer(item)) {
    return await uploadStream(item, { mimetype: mimeType });
  }

  if (typeof item === 'string') {
    const trimmed = item.trim();
    if (trimmed.startsWith('data:image/')) {
      if (!CLOUDINARY_ENABLED) return trimmed;
      const match = trimmed.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
      if (match) {
        const mime = match[1];
        const buffer = Buffer.from(match[2], 'base64');
        return await uploadStream(buffer, { mimetype: mime });
      }
    }
    // Jika sudah berupa URL biasa (http://, https://, atau /img/...)
    return trimmed;
  }

  return null;
};

/**
 * Memproses input foto (bisa berupa req.files, req.file, atau data URL dari body)
 * dan mengembalikan JSON array URL string (secure_url dari Cloudinary).
 * Batas maksimal 5 foto.
 */
export const simpanFotosCloudinary = async (v, reqFiles = null, maxLen = 6_000_000) => {
  const resultUrls = [];

  // 1. Ambil dari multipart multer req.files / req.file jika ada
  if (reqFiles) {
    const files = Array.isArray(reqFiles) ? reqFiles : [reqFiles];
    for (const f of files.slice(0, 5)) {
      if (f && f.buffer) {
        const url = await uploadStream(f.buffer, { mimetype: f.mimetype });
        if (url) resultUrls.push(url);
      }
    }
  }

  // 2. Ambil dari input v (bisa array, JSON string, atau string)
  if (v != null && v !== '') {
    let list = v;
    if (typeof v === 'string' && v.trim().startsWith('[')) {
      try { list = JSON.parse(v); } catch { list = v; }
    }

    if (Array.isArray(list)) {
      for (const item of list) {
        if (resultUrls.length >= 5) break;
        if (typeof item === 'string' && item.trim()) {
          const url = await uploadToCloudinary(item);
          if (url) resultUrls.push(url);
        }
      }
    } else if (typeof list === 'string' && list.trim()) {
      if (resultUrls.length < 5) {
        const url = await uploadToCloudinary(list);
        if (url) resultUrls.push(url);
      }
    }
  }

  if (resultUrls.length === 0) return null;

  const json = JSON.stringify(resultUrls.slice(0, 5));
  if (json.length > maxLen) {
    const err = new Error(`foto maksimal ${maxLen} karakter`);
    err.status = 400;
    throw err;
  }
  return json;
};
