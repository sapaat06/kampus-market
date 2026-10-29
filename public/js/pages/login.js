import { api, nav, simpanSesi, adaSesi, pesan } from '/js/api.js';
nav();
const msg = document.getElementById('msg');
const next = new URLSearchParams(location.search).get('next');
// Hanya izinkan path internal. Cek origin setelah URL di-resolve, supaya
// trik seperti "//evil.com" dan "/\evil.com" ikut tertolak.
const tujuan = (() => {
  if (!next) return '/';
  try {
    const u = new URL(next, location.origin);
    return u.origin === location.origin ? u.pathname + u.search + u.hash : '/';
  } catch { return '/'; }
})();
if (adaSesi()) {
  try { await api('/saya'); location.replace(tujuan); } catch { /* cookie sudah kedaluwarsa */ }
}

const tab = (daftar) => {
  document.getElementById('f-masuk').hidden = daftar;
  document.getElementById('f-daftar').hidden = !daftar;
  document.getElementById('t-masuk').setAttribute('aria-selected', !daftar);
  document.getElementById('t-daftar').setAttribute('aria-selected', daftar);
  msg.textContent = '';
};
document.getElementById('t-masuk').onclick = () => tab(false);
document.getElementById('t-daftar').onclick = () => tab(true);

for (const [id, path] of [['f-masuk', '/login'], ['f-daftar', '/register']]) {
  document.getElementById(id).addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.submitter;
    if (btn) btn.disabled = true;
    try {
      const r = await api(path, { method: 'POST', body: Object.fromEntries(new FormData(e.target)) });
      simpanSesi();
      location.href = tujuan;
    } catch (err) { pesan(msg, err.message); if (btn) btn.disabled = false; }
  });
}
