// Satu-satunya pintu ke backend. Dimuat sebagai script biasa di <head> semua
// halaman, jadi tersedia sebagai window.KM untuk script halaman (biasa maupun
// module). Saat dibungkus jadi APK, cukup set window.KM_API sebelum file ini.
window.KM = (() => {
  // Kosong di web (pakai origin sendiri). Di APK diisi URL server, misal
  // window.KM_API = 'https://api.kampusmarket.id' lewat js/config.js.
  const API = String(window.KM_API || '').replace(/\/+$/, '');

  const TOKEN_KEY = 'km_token'; // token Bearer dari /login dan /register
  const SESI_KEY = 'km_sesi'; // penanda UI bahwa pengguna sudah masuk
  const ROLE_KEY = 'role';
  const KM_ROLE_KEY = 'km_role';

  const role = {
    get: () => localStorage.getItem(ROLE_KEY) || localStorage.getItem(KM_ROLE_KEY) || '',
    set: (r) => {
      if (!r) {
        localStorage.removeItem(ROLE_KEY);
        localStorage.removeItem(KM_ROLE_KEY);
      } else {
        localStorage.setItem(ROLE_KEY, r);
        localStorage.setItem(KM_ROLE_KEY, r);
      }
    },
    clear: () => {
      localStorage.removeItem(ROLE_KEY);
      localStorage.removeItem(KM_ROLE_KEY);
    },
  };

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
    clear: () => {
      localStorage.removeItem(SESI_KEY);
      token.clear();
      role.clear();
    },
  };

  // api() selalu melempar Error ber-status kalau gagal, jadi pemanggil cukup
  // pakai try/catch dan tidak perlu memeriksa res.ok sendiri.
  async function api(path, { method = 'GET', body, headers = {} } = {}) {
    const h = { ...headers };
    if (body !== undefined) h['content-type'] = 'application/json';
    const t = token.get();
    if (t) h.authorization = 'Bearer ' + t; // dipakai APK; di web cookie tetap jalan

    // Normalisasi path agar tidak ada duplikasi /api jika pemanggil menyertakan /api
    const rawPath = String(path || '').trim();
    let normalizedPath;
    if (rawPath.startsWith('/api/') || rawPath === '/api') {
      normalizedPath = rawPath;
    } else {
      normalizedPath = '/api' + (rawPath.startsWith('/') ? rawPath : '/' + rawPath);
    }
    // Karena dijalankan lewat Dev Tunnels, pastikan URL target selalu relatif
    // (misal '/api/chat/room' atau '/api/saya') saat window.KM_API kosong.
    const url = API ? (API + normalizedPath) : normalizedPath;

    let r;
    try {
      r = await fetch(url, {
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
    if (r.ok && j.role) { role.set(j.role); }
    if (r.ok && j.user && j.user.role) { role.set(j.user.role); }
    if (r.status === 401) sesi.clear();
    if (!r.ok) throw Object.assign(new Error(j.error ?? 'Terjadi kesalahan'), { status: r.status });
    return j;
  }

  const get = (path, opts) => api(path, opts);
  const post = (path, body, opts) => api(path, { ...opts, method: 'POST', body });
  const patch = (path, body, opts) => api(path, { ...opts, method: 'PATCH', body });
  const del = (path, opts) => api(path, { ...opts, method: 'DELETE' });

  const logout = async () => {
    const yakin = await ui.konfirmasi({
      judul: 'Keluar dari akun?',
      teks: 'Kamu perlu masuk kembali untuk mengakses fitur KampusCircle.',
      teksYa: 'Ya, Keluar',
      teksBatal: 'Batal',
      danger: true,
    });
    if (!yakin) return;
    ui.loading('Keluar dari akun...');
    try { await api('/logout', { method: 'POST' }); } catch { /* cookie mungkin sudah mati */ }
    sesi.clear();
    ui.tutup();
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

  // ---------------------------------------------------------------------------
  // SweetAlert2 terpusat. Semua notifikasi aplikasi memakai helper ini supaya
  // warna, tombol, dan perilakunya konsisten (teal #008F83).
  // ---------------------------------------------------------------------------
  const TEMA = {
    teal: '#008F83',
    tealDark: '#007A68',
    red: '#DC2626',
    grey: '#64748B',
    ink: '#0F172A',
  };
  const adaSwal = () => typeof window.Swal !== 'undefined';

  const ui = {
    sukses(judul, teks = '') {
      if (!adaSwal()) return Promise.resolve();
      return Swal.fire({
        icon: 'success',
        title: judul || 'Berhasil',
        text: teks,
        confirmButtonText: 'Oke',
        confirmButtonColor: TEMA.teal,
        timer: teks ? undefined : 1600,
        timerProgressBar: !teks,
      });
    },
    error(judul, teks = '') {
      if (!adaSwal()) { console.error(judul, teks); return Promise.resolve(); }
      return Swal.fire({
        icon: 'error',
        title: judul || 'Terjadi Kesalahan',
        text: teks,
        confirmButtonText: 'Tutup',
        confirmButtonColor: TEMA.teal,
      });
    },
    info(judul, teks = '') {
      if (!adaSwal()) return Promise.resolve();
      return Swal.fire({
        icon: 'info',
        title: judul,
        text: teks,
        confirmButtonText: 'Mengerti',
        confirmButtonColor: TEMA.teal,
      });
    },
    peringatan(judul, teks = '') {
      if (!adaSwal()) return Promise.resolve();
      return Swal.fire({
        icon: 'warning',
        title: judul,
        text: teks,
        confirmButtonText: 'Oke',
        confirmButtonColor: TEMA.teal,
      });
    },
    toast(judul, icon = 'success') {
      if (!adaSwal()) return Promise.resolve();
      return Swal.fire({
        toast: true,
        position: 'top-end',
        icon,
        title: judul,
        showConfirmButton: false,
        timer: 2200,
        timerProgressBar: true,
      });
    },
    async konfirmasi({
      judul = 'Apakah Anda yakin?',
      teks = '',
      teksYa = 'Ya',
      teksBatal = 'Batal',
      danger = false,
      icon = 'warning',
    } = {}) {
      if (!adaSwal()) return window.confirm(teks ? `${judul}\n\n${teks}` : judul);
      const r = await Swal.fire({
        icon,
        title: judul,
        text: teks,
        showCancelButton: true,
        confirmButtonText: teksYa,
        cancelButtonText: teksBatal,
        confirmButtonColor: danger ? TEMA.red : TEMA.teal,
        cancelButtonColor: TEMA.grey,
        reverseButtons: true,
        focusCancel: danger,
      });
      return Boolean(r.isConfirmed);
    },
    loading(judul = 'Memproses...') {
      if (!adaSwal()) return;
      Swal.fire({
        title: judul,
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => Swal.showLoading(),
      });
    },
    tutup() {
      if (adaSwal()) Swal.close();
    },
    get TEMA() { return { ...TEMA }; },
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

  function getRole() {
    return role.get();
  }

  function getHomeUrl() {
    const userRole = role.get();
    return userRole === 'pemilik_kost' ? 'kos-owner.html' : 'beranda.html';
  }

    function goBack(fallbackUrl = '/beranda.html', options = {}) {
    if (typeof fallbackUrl === 'object' && fallbackUrl !== null && options === undefined) {
      options = fallbackUrl;
      fallbackUrl = '/beranda.html';
    }
    const targetFallback = typeof fallbackUrl === 'string' && fallbackUrl ? fallbackUrl : '/beranda.html';

    if (options.forceFallback) {
      if (typeof window !== 'undefined') window.location.href = targetFallback;
      return targetFallback;
    }

    if (typeof document === 'undefined' || typeof window === 'undefined') return targetFallback;

    const ref = document.referrer;
    if (!ref) {
      window.location.href = targetFallback;
      return targetFallback;
    }

    try {
      const refUrl = new URL(ref, window.location.origin);
      const currUrl = new URL(window.location.href);

      // Referrer harus dari origin yang sama
      if (refUrl.origin !== window.location.origin) {
        window.location.href = targetFallback;
        return targetFallback;
      }

      // Referrer tidak boleh halaman yang sama
      if (refUrl.pathname === currUrl.pathname) {
        window.location.href = targetFallback;
        return targetFallback;
      }

      // Abaikan halaman jika pola cocok (misalnya filter, login, masuk, daftar, detail)
      if (options.ignorePatterns && Array.isArray(options.ignorePatterns)) {
        const refPath = refUrl.pathname.toLowerCase();
        const isIgnored = options.ignorePatterns.some((pat) => refPath.includes(pat.toLowerCase()));
        if (isIgnored) {
          window.location.href = targetFallback;
          return targetFallback;
        }
      }

      // Jika ada riwayat browser, gunakan history.back(), jika tidak arahkan langsung
      if (window.history && window.history.length > 1) {
        window.history.back();
        return 'history.back';
      } else {
        window.location.href = ref;
        return ref;
      }
    } catch {
      window.location.href = targetFallback;
      return targetFallback;
    }
  }

  function goToHome() {
    const userRole = localStorage.getItem('role') || localStorage.getItem('km_role');
    if (userRole === 'pemilik_kost') {
      window.location.href = 'kos-owner.html';
    } else {
      window.location.href = 'beranda.html';
    }
  }

  function adjustRoleBasedUI() {
    const userRole = localStorage.getItem('role') || localStorage.getItem('km_role');
    const isOwner = userRole === 'pemilik_kost';
    const homeTarget = isOwner ? 'kos-owner.html' : 'beranda.html';

    // 1. Tombol Kembali di Header dan link yang mengarah ke beranda
    const backElements = document.querySelectorAll(
      '.btn-header-back, #chatBackHome, #backBtn, a.back, a[href="/beranda.html"], a[href="beranda.html"], [data-nav="home"]'
    );
    backElements.forEach((el) => {
      if (el.tagName === 'A') {
        const href = el.getAttribute('href') || '';
        if (href.includes('beranda') || href.includes('kos-owner')) {
          el.setAttribute('href', homeTarget);
        }
      }
      el.addEventListener('click', (e) => {
        if (el.id === 'backBtn' || el.classList.contains('header-back-btn')) {
          return;
        }
        e.preventDefault();
        goToHome();
      });
    });

    // 2. Item Navigasi Bawah (Bottom Navigation Bar)
    const navItems = document.querySelectorAll('.bottom-nav-bar a, .nav a, .owner-bottom-nav a');
    navItems.forEach((link) => {
      const text = (link.textContent || '').trim().toLowerCase();
      const href = link.getAttribute('href') || '';
      if (text.includes('beranda') || href.includes('beranda') || href.includes('kos-owner')) {
        link.setAttribute('href', homeTarget);
        link.addEventListener('click', (e) => {
          e.preventDefault();
          goToHome();
        });
      }
    });

    // 3. Tombol Tambah di Bottom Navigation untuk pemilik_kost
    if (isOwner) {
      const plusButtons = document.querySelectorAll(
        '.floating-plus-btn, #chatFloatingPlus, #navProfilPlus, a[href="/unggah.html"], a[href="unggah.html"], .nav a.item.center'
      );
      plusButtons.forEach((btn) => {
        btn.setAttribute('href', 'kos-owner.html?action=tambah-properti');
        btn.setAttribute('aria-label', 'Unggah Properti Kost');
        btn.setAttribute('title', 'Tambah Properti Kost');
      });
    }
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', adjustRoleBasedUI);
    } else {
      adjustRoleBasedUI();
    }
  }

  function createEmptyStateHtml({
    icon = 'search',
    title = 'Barang tidak ditemukan',
    desc = 'Coba ubah kata kunci atau longgarkan filter pencarianmu.',
    btnText = '',
    btnHref = '',
    btnId = '',
  } = {}) {
    let iconSvg = '';
    if (icon === 'search') {
      iconSvg = '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>';
    } else if (icon === 'chat') {
      iconSvg = '<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
    } else if (icon === 'box') {
      iconSvg = '<svg viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>';
    } else if (typeof icon === 'string' && icon.includes('<svg')) {
      iconSvg = icon;
    } else {
      iconSvg = '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>';
    }

    let btnHtml = '';
    if (btnText) {
      if (btnHref) {
        btnHtml = `<a href="${esc(btnHref)}" class="empty-state-btn" ${btnId ? `id="${esc(btnId)}"` : ''}>${esc(btnText)}</a>`;
      } else {
        btnHtml = `<button type="button" class="empty-state-btn" ${btnId ? `id="${esc(btnId)}"` : ''}>${esc(btnText)}</button>`;
      }
    }

    return `
      <div class="empty-state">
        <div class="empty-state-icon">
          ${iconSvg}
        </div>
        <div class="empty-state-title">${esc(title)}</div>
        ${desc ? `<div class="empty-state-desc">${esc(desc)}</div>` : ''}
        ${btnHtml}
      </div>
    `.trim();
  }

  window.goToHome = goToHome;
  window.getHomeUrl = getHomeUrl;
  window.goBack = goBack;
  window.createEmptyStateHtml = createEmptyStateHtml;

  function createRangeSlider({
    container,
    highlight,
    thumbLeft,
    thumbRight,
    inputMin,
    inputMax,
    min = 0,
    max = 1000000,
    step = 5000,
    onChange = null,
  }) {
    if (!container || !thumbLeft || !thumbRight || !highlight) return null;

    let currentMin = min;
    let currentMax = max;

    const clamp = (val, lo, hi) => Math.max(lo, Math.min(hi, val));

    const snap = (val) => {
      const stepped = Math.round(val / step) * step;
      return clamp(stepped, min, max);
    };

    const updateVisuals = () => {
      const range = max - min;
      const leftPct = range > 0 ? ((currentMin - min) / range) * 100 : 0;
      const rightPct = range > 0 ? ((currentMax - min) / range) * 100 : 100;

      thumbLeft.style.left = `${leftPct}%`;
      thumbRight.style.left = `${rightPct}%`;

      highlight.style.left = `${leftPct}%`;
      highlight.style.width = `${rightPct - leftPct}%`;

      thumbLeft.setAttribute('aria-valuenow', currentMin);
      thumbRight.setAttribute('aria-valuenow', currentMax);
    };

    const setValues = (newMin, newMax, triggerChange = true) => {
      let sMin = snap(newMin != null ? newMin : currentMin);
      let sMax = snap(newMax != null ? newMax : currentMax);

      if (sMin > sMax) {
        if (newMin != null && newMax == null) sMin = sMax;
        else if (newMax != null && newMin == null) sMax = sMin;
        else sMin = sMax;
      }

      currentMin = sMin;
      currentMax = sMax;
      updateVisuals();

      if (inputMin) {
        inputMin.value = currentMin > 0 ? 'Rp' + Number(currentMin).toLocaleString('id-ID') : '';
      }
      if (inputMax) {
        inputMax.value = currentMax < max ? 'Rp' + Number(currentMax).toLocaleString('id-ID') : '';
      }

      if (triggerChange && typeof onChange === 'function') {
        onChange(currentMin, currentMax);
      }
    };

    const handlePointerDrag = (thumb, isLeft) => {
      thumb.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        try { thumb.setPointerCapture(e.pointerId); } catch {}

        const onPointerMove = (moveEvent) => {
          const rect = container.getBoundingClientRect();
          if (rect.width <= 0) return;
          const ratio = clamp((moveEvent.clientX - rect.left) / rect.width, 0, 1);
          const rawVal = min + ratio * (max - min);

          if (isLeft) {
            const snapped = snap(rawVal);
            if (snapped <= currentMax) {
              currentMin = snapped;
              updateVisuals();
              if (inputMin) inputMin.value = currentMin > 0 ? 'Rp' + Number(currentMin).toLocaleString('id-ID') : '';
              if (typeof onChange === 'function') onChange(currentMin, currentMax);
            }
          } else {
            const snapped = snap(rawVal);
            if (snapped >= currentMin) {
              currentMax = snapped;
              updateVisuals();
              if (inputMax) inputMax.value = currentMax < max ? 'Rp' + Number(currentMax).toLocaleString('id-ID') : '';
              if (typeof onChange === 'function') onChange(currentMin, currentMax);
            }
          }
        };

        const onPointerUp = (upEvent) => {
          try { thumb.releasePointerCapture(upEvent.pointerId); } catch {}
          thumb.removeEventListener('pointermove', onPointerMove);
          thumb.removeEventListener('pointerup', onPointerUp);
          thumb.removeEventListener('pointercancel', onPointerUp);
        };

        thumb.addEventListener('pointermove', onPointerMove);
        thumb.addEventListener('pointerup', onPointerUp);
        thumb.addEventListener('pointercancel', onPointerUp);
      });
    };

    handlePointerDrag(thumbLeft, true);
    handlePointerDrag(thumbRight, false);

    // Klik di bar/track
    container.addEventListener('pointerdown', (e) => {
      if (e.target === thumbLeft || e.target === thumbRight) return;
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0) return;
      const ratio = clamp((e.clientX - rect.left) / rect.width, 0, 1);
      const clickedVal = snap(min + ratio * (max - min));
      const distToLeft = Math.abs(clickedVal - currentMin);
      const distToRight = Math.abs(clickedVal - currentMax);

      if (distToLeft < distToRight) {
        setValues(clickedVal, currentMax, true);
      } else {
        setValues(currentMin, clickedVal, true);
      }
    });

    const parseRupiahInput = (str) => {
      if (typeof str === 'number') return str;
      const n = parseInt(String(str || '').replace(/[^\d]/g, ''), 10);
      return isNaN(n) ? 0 : n;
    };

    if (inputMin) {
      inputMin.addEventListener('input', () => {
        const raw = inputMin.value.trim();
        const num = raw ? parseRupiahInput(raw) : min;
        const valid = clamp(num, min, currentMax);
        currentMin = snap(valid);
        updateVisuals();
        if (typeof onChange === 'function') onChange(currentMin, currentMax);
      });
      inputMin.addEventListener('blur', () => {
        if (inputMin.value.trim()) {
          inputMin.value = 'Rp' + Number(currentMin).toLocaleString('id-ID');
        }
      });
    }

    if (inputMax) {
      inputMax.addEventListener('input', () => {
        const raw = inputMax.value.trim();
        const num = raw ? parseRupiahInput(raw) : max;
        const valid = clamp(num, currentMin, max);
        currentMax = snap(valid);
        updateVisuals();
        if (typeof onChange === 'function') onChange(currentMin, currentMax);
      });
      inputMax.addEventListener('blur', () => {
        if (inputMax.value.trim() && currentMax < max) {
          inputMax.value = 'Rp' + Number(currentMax).toLocaleString('id-ID');
        }
      });
    }

    const handleKey = (thumb, isLeft) => {
      thumb.addEventListener('keydown', (e) => {
        let delta = 0;
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') delta = step;
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') delta = -step;
        else if (e.key === 'PageUp') delta = step * 10;
        else if (e.key === 'PageDown') delta = -step * 10;
        else return;

        e.preventDefault();
        if (isLeft) {
          setValues(clamp(currentMin + delta, min, currentMax), currentMax, true);
        } else {
          setValues(currentMin, clamp(currentMax + delta, currentMin, max), true);
        }
      });
    };
    handleKey(thumbLeft, true);
    handleKey(thumbRight, false);

    updateVisuals();

    return {
      getMin: () => currentMin,
      getMax: () => currentMax,
      setValues,
      reset: () => setValues(min, max, true),
    };
  }

  window.createRangeSlider = createRangeSlider;

  // Nama lama dipertahankan supaya halaman lama tidak perlu diubah semua.
  return {
    api, get, post, patch, del, token, sesi, logout, esc, rp, pesan, thumb, wajibLogin, nav,
    ui,
    getFotos, getFoto,
    createEmptyStateHtml,
    createRangeSlider,
    goBack,
    adaSesi: sesi.ada,
    simpanSesi: sesi.set,
    role,
    getRole,
    getHomeUrl,
    goToHome,
    adjustRoleBasedUI,
  };
})();
