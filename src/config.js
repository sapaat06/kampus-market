import { randomBytes } from 'node:crypto';

export const ADMIN_KEY = process.env.ADMIN_KEY;
export const SECRET = process.env.SECRET ?? randomBytes(32).toString('hex');

// Aturan bisnis. Ubah di sini, tidak ada angka ajaib di tempat lain.
export const FAKTOR = { baru: 1, baik: 0.8, cukup: 0.6, rusak: 0.3 }; // pengali harga per kondisi
export const SEWA_PER_HARI = 0.02; // sewa per hari = 2% dari harga acuan (asumsi)
export const POIN_PER_RP = 10000;  // 1 Green Point tiap Rp10.000 transaksi selesai
