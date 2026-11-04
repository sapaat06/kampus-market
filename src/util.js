export const err = (status, msg) => Object.assign(new Error(msg), { status });

// Teks wajib: harus string, di-trim, tidak kosong, dan dibatasi panjangnya.
export const str = (v, name, max = 500) => {
  if (typeof v !== 'string') throw err(400, `${name} harus teks`);
  const s = v.trim();
  if (!s) throw err(400, `${name} wajib`);
  if (s.length > max) throw err(400, `${name} maksimal ${max} karakter`);
  return s;
};

export const optStr = (v, name, max = 500) =>
  v == null || v === '' ? null : str(v, name, max);

export const emailOf = (v, name = 'email') => {
  const s = str(v, name, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) throw err(400, 'email tidak valid');
  return s;
};

export const oneOf = (v, name, list) => {
  if (!list.includes(v)) throw err(400, `${name}: ${list.join(', ')}`);
  return v;
};

export const posInt = (v, name, max = Number.MAX_SAFE_INTEGER) => {
  if (!Number.isInteger(v) || v <= 0) throw err(400, `${name} harus bilangan bulat > 0`);
  if (v > max) throw err(400, `${name} maksimal ${max}`);
  return v;
};

export const MAX_FOTO = 5;

// Foto disimpan di kolom TEXT sebagai JSON array agar satu listing bisa
// menampung beberapa gambar. Menerima array, JSON array, atau satu URL lama.
export const simpanFotos = (v, max = 6_000_000) => {
  if (v == null || v === '') return null;

  let list = v;
  if (typeof v === 'string' && v.trim().startsWith('[')) {
    try { list = JSON.parse(v); } catch { list = v; }
  }

  if (!Array.isArray(list)) return optStr(v, 'foto', max);

  const bersih = list
    .filter((x) => typeof x === 'string' && x.trim() !== '')
    .map((x) => x.trim())
    .slice(0, MAX_FOTO);

  if (bersih.length === 0) return null;

  const json = JSON.stringify(bersih);
  if (json.length > max) throw err(400, `foto maksimal ${max} karakter`);
  return json;
};

// Menghitung jarak lingkaran besar dua titik GPS (dalam meter) dengan rumus Haversine
export const haversineDistance = (lat1, lon1, lat2, lon2) => {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const nLat1 = Number(lat1);
  const nLon1 = Number(lon1);
  const nLat2 = Number(lat2);
  const nLon2 = Number(lon2);
  if (isNaN(nLat1) || isNaN(nLon1) || isNaN(nLat2) || isNaN(nLon2)) return null;

  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371000; // Radius rata-rata bumi dalam meter
  const dLat = toRad(nLat2 - nLat1);
  const dLon = toRad(nLon2 - nLon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(nLat1)) * Math.cos(toRad(nLat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};

// Format tampilan jarak: <1000m (contoh "350 m · Lokasi"), >=1000m (contoh "1.4 km · Lokasi")
export const formatJarak = (meters, namaLokasi = 'Kampus') => {
  const lokasi = namaLokasi || 'Kampus';
  if (meters == null || isNaN(meters)) return `Jarak belum aktif · ${lokasi}`;
  if (meters < 1000) return `${Math.round(meters)} m · ${lokasi}`;
  const km = (meters / 1000).toFixed(1);
  return `${km} km · ${lokasi}`;
};
