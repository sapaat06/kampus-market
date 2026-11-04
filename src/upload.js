import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';

// Cloudinary otomatis membaca process.env.CLOUDINARY_URL jika diatur.
// Konfigurasi batas foto: maksimal 5 foto, maksimal 5MB per file.
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 5,                  // Maksimal 5 foto
  },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      return cb(Object.assign(new Error('Hanya file foto (JPG, PNG, WebP) yang diizinkan'), { status: 400 }));
    }
    cb(null, true);
  },
});

/**
 * Upload single buffer to Cloudinary using upload_stream.
 * Jika CLOUDINARY_URL tidak diatur (mis. offline/tes lokal),
 * fallback ke data URL agar flow aplikasi tetap berjalan tanpa internet.
 */
export const uploadStream = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    if (!process.env.CLOUDINARY_URL) {
      const mime = options.mimetype || 'image/jpeg';
      const base64 = buffer.toString('base64');
      return resolve(`data:${mime};base64,${base64}`);
    }

    const stream = cloudinary.uploader.upload_stream(
      { folder: 'kampus-market', resource_type: 'image', ...options },
      (error, result) => {
        if (error) return reject(error);
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
      if (!process.env.CLOUDINARY_URL) return trimmed;
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
