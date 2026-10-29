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
