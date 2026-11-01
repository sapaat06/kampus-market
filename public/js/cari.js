function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Illustrations for goods
const ilustrasi = {
  kalkulator: `<svg viewBox="0 0 88 98" width="70" height="78">
    <rect x="18" y="10" width="52" height="68" rx="7" fill="#1E2A28"/>
    <rect x="23" y="16" width="42" height="15" rx="3" fill="#BFE3DA"/>
    <g fill="#fff" opacity=".95">
      <circle cx="28" cy="40" r="3"/>
      <circle cx="38" cy="40" r="3"/>
      <circle cx="48" cy="40" r="3"/>
      <circle cx="58" cy="40" r="3"/>
      <circle cx="28" cy="50" r="3"/>
      <circle cx="38" cy="50" r="3"/>
      <circle cx="48" cy="50" r="3"/>
      <circle cx="58" cy="50" r="3"/>
      <circle cx="28" cy="60" r="3"/>
      <circle cx="38" cy="60" r="3"/>
      <circle cx="48" cy="60" r="3"/>
      <circle cx="58" cy="60" r="3" fill="#F28C28"/>
    </g>
  </svg>`,

  buku: `<svg viewBox="0 0 88 98" width="60" height="78">
    <rect x="22" y="10" width="44" height="68" rx="6" fill="#007A68"/>
    <rect x="28" y="22" width="26" height="4" rx="2" fill="#fff" opacity=".9"/>
    <rect x="28" y="30" width="18" height="4" rx="2" fill="#fff" opacity=".9"/>
    <rect x="28" y="38" width="26" height="4" rx="2" fill="#fff" opacity=".9"/>
  </svg>`,

  laptop: `<svg viewBox="0 0 88 98" width="70" height="52">
    <rect x="16" y="22" width="56" height="38" rx="5" fill="#1E3A38"/>
    <rect x="20" y="25" width="48" height="32" rx="3" fill="#BFE3DA"/>
    <path d="M10 62h68a3 3 0 0 1 3 3v2H7v-2a3 3 0 0 1 3-3z" fill="#1E3A38"/>
  </svg>`,

  jaslab: `<svg viewBox="0 0 88 98" width="65" height="65">
    <path d="M36 18v12L24 58a4 4 0 0 0 3.5 6h37a4 4 0 0 0 3.5-6L52 30V18h-16z" fill="#007A68" opacity=".9"/>
    <path d="M28 52l4-10h24l4 10a4 4 0 0 1-3.5 6h-25a4 4 0 0 1-3.5-6z" fill="#20B29A"/>
    <line x1="33" y1="18" x2="55" y2="18" stroke="#1E3A38" stroke-width="2.5" stroke-linecap="round"/>
  </svg>`,

  umum: (title) => `<svg viewBox="0 0 88 98" width="60" height="60">
    <rect x="14" y="19" width="60" height="60" rx="14" fill="#DDF1EC"/>
    <text x="44" y="56" font-size="24" fill="#007A68" text-anchor="middle" font-weight="bold">${escHtml((title || 'K').charAt(0))}</text>
  </svg>`
};

function getSvg(title) {
  const t = (title || '').toLowerCase();
  if (t.includes('kalkulator') || t.includes('casio')) return ilustrasi.kalkulator;
  if (t.includes('kalkulus') || t.includes('buku') || t.includes('diktat') || t.includes('modul')) return ilustrasi.buku;
  if (t.includes('laptop') || t.includes('komputer') || t.includes('asus')) return ilustrasi.laptop;
  if (t.includes('jas') || t.includes('lab') || t.includes('praktikum')) return ilustrasi.jaslab;
  return ilustrasi.umum(title);
}

// Initial sample items (matching Figma prototype data)
let data = [
  {
    id: 'kalk-1',
    badge: 'Sewa',
    title: 'Kalkulator Casio fx-991ID Plus',
    kondisi: 'baik',
    price: 'Rp5.000/hari',
    priceNum: 5000,
    dist: 350,
    distText: '350 m · Fakultas Teknik',
    img: 'lav',
    campus: 'teknik',
    verified: true
  },
  {
    id: 'kalk-2',
    badge: 'Sewa',
    title: 'Kalkulator Casio fx-82MS',
    kondisi: 'baik',
    price: 'Rp3.000/hari',
    priceNum: 3000,
    dist: 900,
    distText: '900 m · Gedung Rektorat',
    img: 'lav',
    campus: 'teknik',
    verified: true
  },
  {
    id: 'kalk-3',
    badge: 'Beli',
    title: 'Kalkulator Sharp EL-531',
    kondisi: 'cukup',
    price: 'Rp85.000',
    priceNum: 85000,
    dist: 1200,
    distText: '1,2 km · Gerbang kampus',
    img: 'lav',
    campus: 'teknik',
    verified: true
  },
  {
    id: 4,
    badge: 'Pinjam',
    title: 'Modul Kalkulus 2',
    kondisi: 'baik',
    price: 'Gratis',
    priceNum: 0,
    dist: 600,
    distText: '600 m · Perpustakaan',
    img: 'mint',
    campus: 'teknik',
    verified: true
  },
  {
    id: 5,
    badge: 'Beli',
    title: 'Laptop Asus A416',
    kondisi: 'baru',
    price: 'Rp3.200.000',
    priceNum: 3200000,
    dist: 800,
    distText: '800 m · Kantin Teknik',
    img: 'peach',
    campus: 'teknik',
    verified: true
  },
  {
    id: 6,
    badge: 'Sewa',
    title: 'Jas Lab + Kacamata',
    kondisi: 'baik',
    price: 'Rp8.000/hari',
    priceNum: 8000,
    dist: 450,
    distText: '450 m · Lab Kimia',
    img: 'mint',
    campus: 'teknik',
    verified: true
  }
];

// Asynchronously load real items from backend database
async function syncFromApi() {
  try {
    const items = await KM.get('/barang');
    if (Array.isArray(items) && items.length > 0) {
      const colors = ['lav', 'mint', 'peach'];
      const dbMapped = items.map((b, idx) => {
        const descLower = (b.deskripsi || '').toLowerCase();
        const titleLower = (b.nama_barang || '').toLowerCase();

        const isPinjam = descLower.includes('[mode pinjam') ||
                         descLower.includes('pinjam') ||
                         titleLower.includes('pinjam') ||
                         (b.harga_sewa === 1000 && !b.harga_jual);

        const isSewa = !isPinjam && Boolean(b.harga_sewa);
        const isBeli = !isPinjam && !isSewa;

        let badge = 'Beli';
        let priceNum = b.harga_jual || b.harga_sewa || 0;
        let priceStr = 'Rp' + Number(priceNum).toLocaleString('id-ID');

        if (isPinjam) {
          badge = 'Pinjam';
          const biaya = (b.harga_sewa && b.harga_sewa > 0) ? b.harga_sewa : 0;
          priceNum = biaya;
          if (biaya > 0) {
            priceStr = 'Rp' + Number(biaya).toLocaleString('id-ID') + ' (pinjam)';
          } else {
            priceStr = 'Gratis';
          }
        } else if (isSewa) {
          badge = 'Sewa';
          priceNum = b.harga_sewa;
          priceStr = 'Rp' + Number(priceNum).toLocaleString('id-ID') + '/hari';
        }

        const distances = [350, 600, 1200, 800, 450, 900];
        const dist = distances[idx % distances.length];
        const distText = (dist >= 1000 ? (dist/1000).toFixed(1) + ' km' : dist + ' m') + ' · Kampus';

        return {
          id: b.id_barang,
          badge: badge,
          title: b.nama_barang,
          kondisi: (b.kondisi || 'baik').toLowerCase(),
          price: priceStr,
          priceNum: priceNum,
          dist: dist,
          distText: distText,
          img: colors[idx % colors.length],
          foto: (typeof KM !== 'undefined' && KM.getFoto ? KM.getFoto(b.foto) : b.foto) || null,
          campus: idx % 2 === 0 ? 'teknik' : 'itg',
          verified: true
        };
      });
      data = [...data.filter(d => !dbMapped.some(m => m.id === d.id)), ...dbMapped];
      updateFilterPreview();
      render();
    }
  } catch (_e) {
    // If backend is unreachable, fallback demo data is already displayed
  }
}

// Current filter state (default values matching figma7-0.png)
let sortMode = 'near';
let filterActive = true;
let selectedMode = 'semua';
let maxPriceVal = 100000;
let maxDistVal = 2000;
let selectedCond = 'all';
let selectedCampus = 'all';
let verifiedOnly = false;

// DOM Elements
const q = document.getElementById('q');
const clearBtn = document.getElementById('clearBtn');
const list = document.getElementById('list');
const countText = document.getElementById('countText');
const filterModal = document.getElementById('filterModal');
const filterChip = document.getElementById('filterChip');
const filterResetBtn = document.getElementById('filterResetBtn');
const filterApplyBtn = document.getElementById('filterApplyBtn');
const filterPriceSlider = document.getElementById('filterPriceSlider');
const filterPriceVal = document.getElementById('filterPriceVal');
const filterDistSlider = document.getElementById('filterDistSlider');
const filterDistVal = document.getElementById('filterDistVal');
const filterCampusSelect = document.getElementById('filterCampusSelect');
const filterVerifiedToggle = document.getElementById('filterVerifiedToggle');
const chipMode = document.getElementById('chipMode');
const chipPrice = document.getElementById('chipPrice');
const chipDist = document.getElementById('chipDist');
const sortBtn = document.getElementById('sortBtn');
const sortDrop = document.getElementById('sortDrop');
const sortLabel = document.getElementById('sortLabel');

function formatKm(meters) {
  if (meters >= 1000) {
    const km = (meters / 1000).toFixed(meters % 1000 === 0 ? 0 : 1);
    return km + ' km';
  }
  return meters + ' m';
}

function updateSliderBackground(slider, val, min, max) {
  const pct = Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));
  slider.style.background = `linear-gradient(to right, #007A68 0%, #007A68 ${pct}%, #DDF1EC ${pct}%, #DDF1EC 100%)`;
}

// Check which items match the filter state
function getFilteredItems(tempMode = selectedMode, tempPrice = maxPriceVal, tempDist = maxDistVal, tempCond = selectedCond, tempCampus = selectedCampus, tempVerified = verifiedOnly) {
  const term = (q?.value || '').trim().toLowerCase();

  return data.filter(d => {
    // Search text match
    const matchText = !term || d.title.toLowerCase().includes(term);
    if (!matchText) return false;

    // Mode match
    if (tempMode !== 'semua' && d.badge.toLowerCase() !== tempMode.toLowerCase()) {
      return false;
    }

    // Price match (only for Sewa/Beli when tempPrice > 0)
    if (tempMode === 'sewa' && d.priceNum > tempPrice) {
      return false;
    }

    // Distance match
    if (tempDist > 0 && d.dist > tempDist) {
      return false;
    }

    // Condition match
    if (tempCond && tempCond !== 'semua' && tempCond !== 'all' && d.kondisi !== tempCond) {
      return false;
    }

    // Campus location match
    if (tempCampus && tempCampus !== 'semua' && tempCampus !== 'all' && d.campus && d.campus !== tempCampus) {
      return false;
    }

    // Verified owner match
    if (tempVerified && !d.verified) {
      return false;
    }

    return true;
  });
}

// Update the count shown on "Terapkan (X barang)" button in real-time
function updateFilterPreview() {
  const currentMode = document.querySelector('#modeChips .f-chip.active')?.dataset.mode || 'semua';
  const currentCond = document.querySelector('#condChips .f-cond-chip.active')?.dataset.cond || 'baik';
  const currentPrice = parseInt(filterPriceSlider?.value || 15000, 10);
  const currentDist = parseInt(filterDistSlider?.value || 1000, 10);
  const currentCampus = filterCampusSelect?.value || 'teknik';
  const currentVerified = filterVerifiedToggle?.checked ?? true;

  const matches = getFilteredItems(currentMode, currentPrice, currentDist, currentCond, currentCampus, currentVerified);
  if (filterApplyBtn) {
    filterApplyBtn.textContent = `Terapkan (${matches.length} barang)`;
  }
}

// Render filtered cards into list
function render() {
  let items = filterActive ? getFilteredItems() : data.filter(d => {
    const term = (q?.value || '').trim().toLowerCase();
    return !term || d.title.toLowerCase().includes(term);
  });

  // Sorting
  if (sortMode === 'near') items.sort((a, b) => a.dist - b.dist);
  else if (sortMode === 'cheap') items.sort((a, b) => a.priceNum - b.priceNum);
  else items = items.slice().reverse();

  if (countText) {
    countText.textContent = `${items.length} barang ditemukan`;
  }

  if (items.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <div class="t">Barang tidak ditemukan</div>
        <div class="s">Coba ubah kata kunci atau longgarkan filter pencarian Anda.</div>
      </div>`;
    return;
  }

  let html = items.map(d => `
    <div class="horizontal-item-card result-card" data-id="${d.id}" role="button" tabindex="0" aria-label="${escHtml(d.title)}, ${escHtml(d.badge)}, ${escHtml(d.price)}">
      <div class="card-left-thumb ${escHtml(d.img)}">
        ${d.foto && !d.foto.includes('AARCAAEAAEDASIAAhEBAxEB') ? `<img src="${escHtml(d.foto)}" alt="${escHtml(d.title)}" loading="lazy">` : (d.svg || getSvg(d.title))}
      </div>
      <div class="card-right-info">
        <span class="badge-tag-sm ${escHtml(d.badge.toLowerCase())}">${escHtml(d.badge)}</span>
        <div class="card-title-text">${escHtml(d.title)}</div>
        <div class="card-price-text ${d.badge.toLowerCase() === 'sewa' ? 'orange' : ''}">${escHtml(d.price)}</div>
        <div class="card-location-row">
          <svg viewBox="0 0 24 24"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/><circle cx="12" cy="10" r="3"/></svg>
          <span>${escHtml(d.distText)}</span>
        </div>
      </div>
    </div>
  `).join('');

  html += `
    <div class="community-banner">
      <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
      <p>Semua barang berasal dari mahasiswa di komunitas kampus terverifikasi.</p>
    </div>`;

  list.innerHTML = html;

  list.querySelectorAll('.result-card').forEach(card => {
    const bukaDetail = () => {
      const id = card.dataset.id || '1';
      window.location.href = `/detail.html?id=${id}`;
    };
    card.addEventListener('click', bukaDetail);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        bukaDetail();
      }
    });
  });
}

// Setup Event Listeners on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  // Search Input
  if (q) {
    q.addEventListener('input', () => {
      if (clearBtn) clearBtn.style.display = q.value ? 'flex' : 'none';
      render();
      updateFilterPreview();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (q) q.value = '';
      clearBtn.style.display = 'none';
      render();
      updateFilterPreview();
    });
  }

  // Open modal from chips
  const openModal = () => {
    if (filterModal) {
      filterModal.classList.add('open');
      updateFilterPreview();
    }
  };
  const closeModal = () => {
    if (filterModal) filterModal.classList.remove('open');
  };

  filterChip?.addEventListener('click', openModal);
  chipMode?.addEventListener('click', openModal);
  chipPrice?.addEventListener('click', openModal);
  chipDist?.addEventListener('click', openModal);
  document.getElementById('closeFilterBtn')?.addEventListener('click', closeModal);

  // Close modal on backdrop click or Escape
  filterModal?.addEventListener('click', (e) => {
    if (e.target === filterModal) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  // Mode chips in modal
  document.querySelectorAll('#filterModeChips .f-pill-opt, #modeChips .f-chip').forEach(chip => {
    chip.addEventListener('click', function() {
      chip.parentElement.querySelectorAll('.f-pill-opt, .f-chip').forEach(c => c.classList.remove('active'));
      this.classList.add('active');
      selectedMode = this.dataset.mode || 'sewa';
      render();
    });
  });

  // Dist chips in modal
  document.querySelectorAll('#filterDistChips .f-pill-opt').forEach(chip => {
    chip.addEventListener('click', function() {
      chip.parentElement.querySelectorAll('.f-pill-opt').forEach(c => c.classList.remove('active'));
      this.classList.add('active');
    });
  });

  // Cond chips in modal
  document.querySelectorAll('#filterCondChips .f-pill-opt').forEach(chip => {
    chip.addEventListener('click', function() {
      chip.parentElement.querySelectorAll('.f-pill-opt').forEach(c => c.classList.remove('active'));
      this.classList.add('active');
    });
  });

  filterApplyBtn?.addEventListener('click', () => {
    closeModal();
    render();
  });
  filterResetBtn?.addEventListener('click', () => {
    closeModal();
    render();
  });

  // Condition chips in modal
  document.querySelectorAll('#condChips .f-cond-chip').forEach(chip => {
    chip.addEventListener('click', function() {
      document.querySelectorAll('#condChips .f-cond-chip').forEach(c => c.classList.remove('active'));
      this.classList.add('active');
      updateFilterPreview();
    });
  });

  // Price Slider in modal
  if (filterPriceSlider) {
    filterPriceSlider.addEventListener('input', function() {
      const val = parseInt(this.value, 10);
      if (filterPriceVal) {
        filterPriceVal.textContent = `Rp0 – Rp${val.toLocaleString('id-ID')}/hari`;
      }
      updateSliderBackground(this, val, 0, 100000);
      updateFilterPreview();
    });
    updateSliderBackground(filterPriceSlider, 15000, 0, 100000);
  }

  // Distance Slider in modal
  if (filterDistSlider) {
    filterDistSlider.addEventListener('input', function() {
      const val = parseInt(this.value, 10);
      if (filterDistVal) {
        filterDistVal.textContent = `Maks. ${formatKm(val)}`;
      }
      updateSliderBackground(this, val, 100, 5000);
      updateFilterPreview();
    });
    updateSliderBackground(filterDistSlider, 1000, 100, 5000);
  }

  // Campus Select & Verified toggle listeners
  filterCampusSelect?.addEventListener('change', updateFilterPreview);
  filterVerifiedToggle?.addEventListener('change', updateFilterPreview);

  // Reset button in modal (matching Figma Reset)
  filterResetBtn?.addEventListener('click', () => {
    selectedMode = 'semua';
    document.querySelectorAll('#modeChips .f-chip').forEach(c => {
      c.classList.toggle('active', c.dataset.mode === 'semua');
    });

    selectedCond = 'semua';
    document.querySelectorAll('#condChips .f-cond-chip').forEach(c => c.classList.remove('active'));

    maxPriceVal = 100000;
    if (filterPriceSlider) {
      filterPriceSlider.value = 100000;
      updateSliderBackground(filterPriceSlider, 100000, 0, 100000);
    }
    if (filterPriceVal) filterPriceVal.textContent = 'Semua Rentang Harga';

    maxDistVal = 5000;
    if (filterDistSlider) {
      filterDistSlider.value = 5000;
      updateSliderBackground(filterDistSlider, 5000, 100, 5000);
    }
    if (filterDistVal) filterDistVal.textContent = 'Maks. 5 km';

    if (filterCampusSelect) filterCampusSelect.value = 'all';
    if (filterVerifiedToggle) filterVerifiedToggle.checked = false;

    updateFilterPreview();
  });

  // Apply button in modal (matching Figma Terapkan (X barang))
  filterApplyBtn?.addEventListener('click', () => {
    selectedMode = document.querySelector('#modeChips .f-chip.active')?.dataset.mode || 'semua';
    selectedCond = document.querySelector('#condChips .f-cond-chip.active')?.dataset.cond || 'semua';
    maxPriceVal = parseInt(filterPriceSlider?.value || 100000, 10);
    maxDistVal = parseInt(filterDistSlider?.value || 5000, 10);
    selectedCampus = filterCampusSelect?.value || 'all';
    verifiedOnly = filterVerifiedToggle?.checked ?? false;

    filterActive = true;

    // Update quick chips
    if (chipMode) {
      chipMode.textContent = `Mode: ${selectedMode.charAt(0).toUpperCase() + selectedMode.slice(1)}`;
      chipMode.classList.toggle('active', selectedMode !== 'semua');
    }
    if (chipPrice) {
      chipPrice.textContent = `≤ Rp${maxPriceVal.toLocaleString('id-ID')}/hari`;
      chipPrice.classList.add('active');
    }
    if (chipDist) {
      chipDist.textContent = `Maks. ${formatKm(maxDistVal)}`;
      chipDist.classList.add('active');
    }

    render();
    closeModal();
  });

  // Sort dropdown
  sortBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    sortDrop?.classList.toggle('open');
  });
  document.addEventListener('click', () => {
    sortDrop?.classList.remove('open');
  });
  sortDrop?.querySelectorAll('.opt').forEach(opt => {
    opt.addEventListener('click', function() {
      sortMode = this.dataset.val;
      if (sortLabel) sortLabel.textContent = this.textContent;
      sortDrop.classList.remove('open');
      render();
    });
  });

  // Check URL query parameters
  const urlParams = new URLSearchParams(window.location.search);
  const qParam = urlParams.get('q');
  if (qParam && q) {
    q.value = qParam;
    if (clearBtn) clearBtn.style.display = 'flex';
  }

  const filterParam = urlParams.get('filter');
  if (filterParam === 'open' || filterParam === '1') {
    openModal();
  }

  // Initial render
  updateFilterPreview();
  render();
  syncFromApi();
});
