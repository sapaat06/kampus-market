let currentUser = null;
let allItems = [];
let activeFilter = 'semua';
let activeCategory = null;

const STORAGE_KAMPUS_KEY = 'kc_kampus';

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Default SVG illustrations matching Figma 1:1
const ilustrasi = {
  kalkulator: `<svg viewBox="0 0 100 80" width="70" height="60">
    <rect x="22" y="6" width="56" height="68" rx="8" fill="#1E2A28"/>
    <rect x="28" y="12" width="44" height="15" rx="3" fill="#BFE3DA"/>
    <g fill="#fff" opacity=".95">
      <circle cx="34" cy="36" r="3"/>
      <circle cx="44" cy="36" r="3"/>
      <circle cx="54" cy="36" r="3"/>
      <circle cx="64" cy="36" r="3"/>
      <circle cx="34" cy="46" r="3"/>
      <circle cx="44" cy="46" r="3"/>
      <circle cx="54" cy="46" r="3"/>
      <circle cx="64" cy="46" r="3"/>
      <circle cx="34" cy="56" r="3"/>
      <circle cx="44" cy="56" r="3"/>
      <circle cx="54" cy="56" r="3"/>
      <circle cx="64" cy="56" r="3" fill="#F28C28"/>
    </g>
  </svg>`,

  buku: `<svg viewBox="0 0 100 80" width="65" height="70">
    <rect x="25" y="6" width="50" height="68" rx="6" fill="#007A68"/>
    <rect x="31" y="18" width="30" height="4" rx="2" fill="#fff" opacity=".9"/>
    <rect x="31" y="27" width="22" height="4" rx="2" fill="#fff" opacity=".9"/>
    <rect x="31" y="36" width="30" height="4" rx="2" fill="#fff" opacity=".9"/>
  </svg>`,

  laptop: `<svg viewBox="0 0 100 80" width="75" height="52">
    <rect x="20" y="14" width="60" height="40" rx="5" fill="#1E3A38"/>
    <rect x="24" y="17" width="52" height="34" rx="3" fill="#BFE3DA"/>
    <path d="M12 56h76a3 3 0 0 1 3 3v2H9v-2a3 3 0 0 1 3-3z" fill="#1E3A38"/>
  </svg>`,

  jaslab: `<svg viewBox="0 0 100 80" width="65" height="65">
    <path d="M42 12v14L28 60a4 4 0 0 0 3.5 6h37a4 4 0 0 0 3.5-6L58 26V12h-16z" fill="#007A68" opacity=".9"/>
    <path d="M32 54l5-12h26l5 12a4 4 0 0 1-3.5 6h-29a4 4 0 0 1-3.5-6z" fill="#20B29A"/>
    <line x1="39" y1="12" x2="61" y2="12" stroke="#1E3A38" stroke-width="3" stroke-linecap="round"/>
  </svg>`,

  umum: (title) => `<svg viewBox="0 0 100 80" width="70" height="60">
    <rect x="20" y="10" width="60" height="60" rx="16" fill="#DDF1EC"/>
    <text x="50" y="47" font-size="24" fill="#007A68" text-anchor="middle" font-weight="bold">${(title || 'K').charAt(0)}</text>
  </svg>`
};

function getSvg(title) {
  const t = (title || '').toLowerCase();
  if (t.includes('kalkulator') || t.includes('casio')) return ilustrasi.kalkulator;
  if (t.includes('kalkulus') || t.includes('buku') || t.includes('diktat') || t.includes('modul')) return ilustrasi.buku;
  if (t.includes('laptop') || t.includes('komputer') || t.includes('asus') || t.includes('lenovo')) return ilustrasi.laptop;
  if (t.includes('jas') || t.includes('lab') || t.includes('praktikum') || t.includes('kacamata')) return ilustrasi.jaslab;
  return ilustrasi.umum(title);
}

// Toast helper
export function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" stroke="#007A68" fill="none" stroke-width="2" style="flex-shrink:0"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg> <span>${escHtml(msg)}</span>`;
  t.style.display = 'flex';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.style.display = 'none'; }, 3200);
}

// Modal handling
function closeModal() {
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
}

function openModal(id) {
  closeModal();
  const m = document.getElementById(id);
  if (m) {
    m.classList.add('open');
    const firstFocusable = m.querySelector('button, input, [tabindex="0"]');
    firstFocusable?.focus();
  }
}

// Load current user profile & sync campus/location
async function muatUser() {
  try {
    currentUser = await KM.get('/saya');
    const namaDepan = (currentUser.nama || '').split(' ')[0] || 'Rina';
    const elSapaan = document.getElementById('sapaanNama');
    if (elSapaan) elSapaan.textContent = `Halo, ${namaDepan}`;

    if (currentUser.kampus) {
      const elKampus = document.getElementById('txtKampus');
      if (elKampus) elKampus.textContent = currentUser.kampus;
      localStorage.setItem(STORAGE_KAMPUS_KEY, currentUser.kampus);
    }
  } catch (e) {
    const elSapaan = document.getElementById('sapaanNama');
    if (elSapaan) {
      elSapaan.innerHTML = 'Halo, Rina <a href="/masuk.html" style="font-size:12px;color:rgba(255,255,255,0.85);text-decoration:underline;margin-left:6px;font-weight:400">Masuk</a>';
    }
    if (e && e.status !== 401) console.log('Gagal memuat profil:', e);
  }
}

// Load goods from database
async function muatBarang() {
  try {
    const dbItems = await KM.get('/barang');
    const colors = ['lav', 'mint', 'peach'];

    allItems = dbItems.map((b, idx) => {
      const descLower = (b.deskripsi || '').toLowerCase();
      const titleLower = (b.nama_barang || '').toLowerCase();

      // Deteksi mode pinjam komunitas
      const isPinjam = descLower.includes('[mode pinjam') ||
                       descLower.includes('pinjam') ||
                       titleLower.includes('pinjam') ||
                       (b.harga_sewa === 1000 && !b.harga_jual);

      const isSewa = !isPinjam && Boolean(b.harga_sewa);
      const isBeli = !isPinjam && !isSewa;

      let badge = 'Beli';
      let harga = b.harga_jual || b.harga_sewa || 0;
      let hargaText = 'Rp' + Number(harga).toLocaleString('id-ID');
      let unitText = '';

      if (isPinjam) {
        badge = 'Pinjam';
        const biaya = (b.harga_sewa && b.harga_sewa > 0) ? b.harga_sewa : 0;
        harga = biaya;
        if (biaya > 0) {
          hargaText = 'Rp' + Number(biaya).toLocaleString('id-ID');
          unitText = ' (pinjam)';
        } else {
          hargaText = 'Gratis';
          unitText = '';
        }
      } else if (isSewa) {
        badge = 'Sewa';
        harga = b.harga_sewa;
        hargaText = 'Rp' + Number(harga).toLocaleString('id-ID');
        unitText = '/hari';
      } else {
        badge = 'Beli';
        hargaText = 'Rp' + Number(harga).toLocaleString('id-ID');
        unitText = '';
      }

      return {
        id: b.id_barang,
        title: b.nama_barang,
        deskripsi: b.deskripsi || 'Kondisi barang ' + b.kondisi + ', siap pakai untuk kuliah.',
        badge: badge,
        kondisi: b.kondisi,
        harga: harga,
        hargaText: hargaText,
        unitText: unitText,
        color: colors[idx % colors.length],
        lokasi: b.lokasi || '-',
        kategori: b.id_kategori,
        namaKategori: b.nama_kategori,
        foto: (typeof KM !== 'undefined' && KM.getFoto ? KM.getFoto(b.foto) : b.foto) || null
      };
    });

    renderCards();
  } catch (e) {
    console.error('Gagal memuat barang:', e);
  }
}

// Filter and render cards into .grid
function renderCards(keyword = '') {
  const grid = document.getElementById('gridBarang');
  if (!grid) return;

  const kw = keyword.toLowerCase().trim();
  let filtered = allItems.filter(item => {
    const matchText = !kw || item.title.toLowerCase().includes(kw) || item.deskripsi.toLowerCase().includes(kw);
    const matchType = activeFilter === 'semua' || item.badge.toLowerCase() === activeFilter.toLowerCase();
    const matchCat = !activeCategory || String(item.kategori) === String(activeCategory);
    return matchText && matchType && matchCat;
  });

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:36px 12px;color:var(--text-muted)">
        <svg viewBox="0 0 24 24" width="44" height="44" stroke="var(--text-muted)" fill="none" stroke-width="1.8"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <div style="margin-top:10px;font-size:15px;font-weight:700;color:var(--text-dark)">Tidak ada barang</div>
        <div style="font-size:13px;margin-top:4px;color:var(--text-muted)">Coba pilih filter lain atau gunakan kata kunci berbeda.</div>
      </div>`;
    return;
  }

  grid.innerHTML = filtered.map(item => `
    <div class="card card-item" data-id="${item.id}" role="button" tabindex="0" style="cursor:pointer" aria-label="${escHtml(item.title)}, ${escHtml(item.badge)}, ${escHtml(item.hargaText)}">
      <div class="img ${escHtml(item.color)}">
        <div class="badge ${escHtml(item.badge.toLowerCase())}">${escHtml(item.badge)}</div>
        ${item.foto ? `<img src="${escHtml(item.foto)}" alt="${escHtml(item.title)}" loading="lazy">` : getSvg(item.title)}
      </div>
        <div class="body">
        <div class="title">${escHtml(item.title)}</div>
        <div class="price ${escHtml(item.badge.toLowerCase())}">${escHtml(item.hargaText)}<span class="unit">${escHtml(item.unitText)}</span></div>
      </div>
    </div>
  `).join('');

  // Attach click listener for detail page
  document.querySelectorAll('.card-item').forEach(c => {
    const bukaDetail = () => {
      const id = Number(c.dataset.id);
      window.location.href = `/detail.html?id=${id}`;
    };
    c.addEventListener('click', bukaDetail);
    c.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        bukaDetail();
      }
    });
  });
}

// Initial setup on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const savedKampus = localStorage.getItem(STORAGE_KAMPUS_KEY);
  if (savedKampus) {
    const elKampus = document.getElementById('txtKampus');
    if (elKampus) elKampus.textContent = savedKampus;
  }

  muatUser();
  muatBarang();

  // Search input listener
  const s2 = document.getElementById('searchBarang');
  if (s2) {
    s2.addEventListener('input', (e) => {
      renderCards(e.target.value);
    });
    s2.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.value.trim()) {
        location.href = '/cari.html?q=' + encodeURIComponent(e.target.value.trim());
      }
    });
  }

  // Filter chips (Semua, Beli, Sewa, Pinjam)
  const chips = document.querySelectorAll('#filterChips .chip');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => { c.classList.remove('active'); c.classList.add('idle'); });
      chip.classList.add('active');
      chip.classList.remove('idle');
      activeFilter = chip.textContent.trim().toLowerCase();
      renderCards(s2?.value || '');
    });
  });

  // Category buttons
  const catBoxes = document.querySelectorAll('#categoryList .cat');
  catBoxes.forEach(cat => {
    cat.addEventListener('click', () => {
      const catId = cat.dataset.cat;
      if (catId === 'kos') {
        location.href = '/kos.html';
        return;
      }

      if (activeCategory === catId) {
        activeCategory = null;
        cat.querySelector('.box').style.outline = 'none';
      } else {
        catBoxes.forEach(c => {
          const b = c.querySelector('.box');
          if (b) b.style.outline = 'none';
        });
        activeCategory = catId;
        cat.querySelector('.box').style.outline = '2.5px solid var(--primary)';
      }
      renderCards(s2?.value || '');
    });
  });

  // Close modals on backdrop click or close button
  document.querySelectorAll('.modal-close, .modal-backdrop').forEach(el => {
    el.addEventListener('click', closeModal);
  });

  // Close modals on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  // Bottom Navigation buttons
  document.getElementById('navBeranda')?.addEventListener('click', () => {
    closeModal();
    const scrollEl = document.querySelector('.scroll');
    if (scrollEl) scrollEl.scrollTo({ top: 0, behavior: 'smooth' });
  });

  const btnTambah = document.getElementById('navTambah');
  if (btnTambah) {
    btnTambah.addEventListener('click', () => {
      location.href = '/unggah.html';
    });
    btnTambah.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        location.href = '/unggah.html';
      }
    });
  }

  // Header Avatar / Notifications Button
  document.getElementById('btnNotif')?.addEventListener('click', () => {
    openModal('modalNotif');
  });

  // Campus location switcher
  document.getElementById('btnKampus')?.addEventListener('click', () => {
    openModal('modalKampus');
  });

  document.querySelectorAll('.campus-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      const txt = opt.dataset.name;
      const elKampus = document.getElementById('txtKampus');
      if (elKampus) elKampus.textContent = txt;
      localStorage.setItem(STORAGE_KAMPUS_KEY, txt);
      closeModal();
      showToast('Lokasi disetel ke: ' + txt);
    });
  });
});
