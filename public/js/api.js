// Dipakai semua halaman: panggilan API, sesi login, helper tampilan.
// Token login disimpan di cookie httpOnly; di sini hanya penanda UI.
const FLAG = 'km_sesi';

export const adaSesi = () => localStorage.getItem(FLAG) === '1';
export const simpanSesi = () => localStorage.setItem(FLAG, '1');

export const logout = async () => {
  try { await api('/logout', { method: 'POST' }); } catch { /* cookie mungkin sudah mati */ }
  localStorage.removeItem(FLAG);
  location.href = '/';
};

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const rp = (n) => {
  const v = Number(n);
  return 'Rp' + (Number.isFinite(v) ? v.toLocaleString('id-ID') : '-');
};

export async function api(path, { method = 'GET', body, headers = {} } = {}) {
  const r = await fetch('/api' + path, {
    method,
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json', ...headers },
    body: body && JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401) localStorage.removeItem(FLAG);
  if (!r.ok) throw Object.assign(new Error(j.error ?? 'Terjadi kesalahan'), { status: r.status });
  return j;
}

// Halaman yang butuh login: lempar ke login, balik lagi setelahnya.
export function wajibLogin() {
  if (!adaSesi()) location.href = '/login.html?next=' + encodeURIComponent(location.pathname + location.search);
  return adaSesi();
}

export function pesan(el, teks, jenis = 'err') {
  el.textContent = teks;
  el.className = 'msg ' + jenis;
}

export const thumb = (b) =>
  `<div class="thumb" style="--h:${(b.id_kategori * 53) % 360}"><span>${esc(b.nama_barang[0])}</span></div>`;

export function nav() {
  const p = location.pathname;
  const a = (href, teks) => `<a href="${href}"${p === href ? ' aria-current="page"' : ''}>${teks}</a>`;
  document.getElementById('top').innerHTML = `
    <div class="wrap bar">
      <a class="logo" href="/">Kampus Market</a>
      <nav aria-label="Menu utama">
        ${a('/', 'Katalog')}${a('/estimasi.html', 'Estimasi harga')}
        ${adaSesi() ? `${a('/profil.html', 'Profil')}<button class="btn ghost sm" id="keluar">Keluar</button>`
                    : '<a class="btn sm" href="/login.html">Masuk</a>'}
      </nav>
    </div>`;
  document.getElementById('keluar')?.addEventListener('click', logout);
}
