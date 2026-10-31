// Satu-satunya pintu ke backend. Dimuat sebagai script biasa di <head> semua
// halaman, jadi tersedia sebagai window.KM untuk script halaman (biasa maupun
// module). Saat dibungkus jadi APK, cukup set window.KM_API sebelum file ini.
window.KM = (() => {
  // Kosong di web (pakai origin sendiri). Di APK diisi URL server, misal
  // window.KM_API = 'https://api.kampusmarket.id' lewat js/config.js.
  const API = String(window.KM_API || '').replace(/\/+$/, '');

  const TOKEN_KEY = 'km_token'; // token Bearer dari /login dan /register
  const SESI_KEY = 'km_sesi'; // penanda UI bahwa pengguna sudah masuk

  const token = {
    get: () => localStorage.getItem(TOKEN_KEY) || '',
    set: (t) => localStorage.setItem(TOKEN_KEY, t),
    clear: () => localStorage.removeItem(TOKEN_KEY),
  };

  const sesi = {
    ada: () => localStorage.getItem(SESI_KEY) === '1',
    set: () => localStorage.setItem(SESI_KEY, '1'),
    // Sesi mati: penanda UI dan token dibuang bersamaan supaya tidak
    // ada kondisi "kelihatan login" padahal tokennya sudah tidak berlaku.
    clear: () => { localStorage.removeItem(SESI_KEY); token.clear(); },
  };

  // api() selalu melempar Error ber-status kalau gagal, jadi pemanggil cukup
  // pakai try/catch dan tidak perlu memeriksa res.ok sendiri.
  async function api(path, { method = 'GET', body, headers = {} } = {}) {
    const h = { ...headers };
    if (body !== undefined) h['content-type'] = 'application/json';
    const t = token.get();
    if (t) h.authorization = 'Bearer ' + t; // dipakai APK; di web cookie tetap jalan

    let r;
    try {
      r = await fetch(API + '/api' + path, {
        method,
        credentials: 'same-origin',
        headers: h,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw Object.assign(new Error('Tidak bisa menghubungi server'), { status: 0 });
    }

    const j = await r.json().catch(() => ({}));
    // /login dan /register mengembalikan token: simpan otomatis di satu tempat.
    if (r.ok && typeof j.token === 'string') { token.set(j.token); sesi.set(); }
    if (r.status === 401) sesi.clear();
    if (!r.ok) throw Object.assign(new Error(j.error ?? 'Terjadi kesalahan'), { status: r.status });
    return j;
  }

  const get = (path, opts) => api(path, opts);
  const post = (path, body, opts) => api(path, { ...opts, method: 'POST', body });
  const patch = (path, body, opts) => api(path, { ...opts, method: 'PATCH', body });
  const del = (path, opts) => api(path, { ...opts, method: 'DELETE' });

  const logout = async () => {
    try { await api('/logout', { method: 'POST' }); } catch { /* cookie mungkin sudah mati */ }
    sesi.clear();
    location.href = '/masuk.html';
  };

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const rp = (n) => {
    const v = Number(n);
    return 'Rp' + (Number.isFinite(v) ? v.toLocaleString('id-ID') : '-');
  };

  const pesan = (el, teks, jenis = 'err') => {
    el.textContent = teks;
    el.className = 'msg ' + jenis;
  };

  const thumb = (b) =>
    `<div class="thumb" style="--h:${(b.id_kategori * 53) % 360}"><span>${esc(b.nama_barang[0])}</span></div>`;

  // Halaman yang butuh login: lempar ke halaman masuk, balik lagi setelahnya.
  function wajibLogin() {
    if (!sesi.ada()) {
      location.href = '/masuk.html?next=' + encodeURIComponent(location.pathname + location.search);
      return false;
    }
    return true;
  }

  function nav() {
    const p = location.pathname;
    const a = (href, teks) => `<a href="${href}"${p === href ? ' aria-current="page"' : ''}>${teks}</a>`;
    const top = document.getElementById('top');
    if (!top) return;
    top.innerHTML = `
    <div class="wrap bar">
      <a class="logo" href="/">Kampus Market</a>
      <nav aria-label="Menu utama">
        ${a('/', 'Katalog')}${a('/estimasi.html', 'Estimasi harga')}
        ${sesi.ada() ? `${a('/profil.html', 'Profil')}<button class="btn ghost sm" id="keluar">Keluar</button>`
                     : '<a class="btn sm" href="/masuk.html">Masuk</a>'}
      </nav>
    </div>`;
    document.getElementById('keluar')?.addEventListener('click', logout);
  }

  const getFotos = (f) => {
    if (!f) return [];
    if (Array.isArray(f)) return f;
    if (typeof f === 'string') {
      const trimmed = f.trim();
      if (trimmed.startsWith('[')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) return parsed;
        } catch (_) {}
      }
      return [trimmed];
    }
    return [];
  };

  const getFoto = (f) => getFotos(f)[0] || null;

  // Nama lama dipertahankan supaya halaman lama tidak perlu diubah semua.
  return {
    api, get, post, patch, del, token, sesi, logout, esc, rp, pesan, thumb, wajibLogin, nav,
    getFotos, getFoto,
    adaSesi: sesi.ada,
    simpanSesi: sesi.set,
  };
})();
