function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

let data = [
  {id:1,badge:'Sewa',title:'Kalkulator Casio fx-991ID Plus',kondisi:'baik',price:'Rp5.000/hari',priceNum:5000,dist:350,distText:'350 m · Fakultas Teknik',img:'lav',svg:'<svg viewBox="0 0 88 98" width="70" height="78"><rect x="19" y="10" width="50" height="62" rx="6" fill="#1E3A38"/><rect x="23" y="14" width="42" height="12" rx="3" fill="#C9E4DC"/><text x="61" y="24" font-size="7" fill="#1E3A38" text-anchor="end" font-family="monospace">1.618</text><g fill="#fff" opacity=".9"><rect x="23" y="30" width="8" height="6" rx="1"/><rect x="33" y="30" width="8" height="6" rx="1"/><rect x="43" y="30" width="8" height="6" rx="1"/><rect x="53" y="30" width="8" height="6" rx="1" fill="#F28C28"/></g></svg>'},
  {id:2,badge:'Sewa',title:'Kalkulator Casio fx-82MS',kondisi:'baik',price:'Rp3.000/hari',priceNum:3000,dist:900,distText:'900 m · Gedung Rektorat',img:'lav',svg:'<svg viewBox="0 0 88 98" width="70" height="78"><rect x="19" y="10" width="50" height="62" rx="6" fill="#1E3A38"/><rect x="23" y="14" width="42" height="12" rx="3" fill="#C9E4DC"/><text x="61" y="24" font-size="7" fill="#1E3A38" text-anchor="end" font-family="monospace">1.618</text><g fill="#fff" opacity=".9"><rect x="23" y="30" width="8" height="6" rx="1"/><rect x="33" y="30" width="8" height="6" rx="1"/><rect x="43" y="30" width="8" height="6" rx="1"/><rect x="53" y="30" width="8" height="6" rx="1" fill="#F28C28"/></g></svg>'},
  {id:3,badge:'Beli',title:'Kalkulator Sharp EL-531',kondisi:'baik',price:'Rp85.000',priceNum:85000,dist:1200,distText:'1,2 km · Gerbang kampus',img:'lav',svg:'<svg viewBox="0 0 88 98" width="70" height="78"><rect x="19" y="10" width="50" height="62" rx="6" fill="#1E3A38"/><rect x="23" y="14" width="42" height="12" rx="3" fill="#C9E4DC"/><text x="61" y="24" font-size="7" fill="#1E3A38" text-anchor="end" font-family="monospace">1.618</text><g fill="#fff" opacity=".9"><rect x="23" y="30" width="8" height="6" rx="1"/><rect x="33" y="30" width="8" height="6" rx="1"/><rect x="43" y="30" width="8" height="6" rx="1"/><rect x="53" y="30" width="8" height="6" rx="1" fill="#F28C28"/></g></svg>'},
  {id:4,badge:'Pinjam',title:'Modul Kalkulus 2',kondisi:'baik',price:'Gratis',priceNum:0,dist:600,distText:'600 m · Perpustakaan',img:'mint',svg:'<svg viewBox="0 0 88 98" width="60" height="78"><rect x="24" y="10" width="40" height="70" rx="6" fill="#0B7A68"/><rect x="60" y="10" width="6" height="70" fill="#fff" opacity=".9"/><line x1="30" y1="20" x2="58" y2="20" stroke="#fff" stroke-width="2" opacity=".7"/><line x1="30" y1="26" x2="58" y2="26" stroke="#fff" stroke-width="2" opacity=".7"/><text x="44" y="46" font-size="9" fill="#fff" text-anchor="middle" font-weight="bold">KALKULUS</text><text x="44" y="66" font-size="22" fill="#fff" text-anchor="middle" font-weight="bold">2</text></svg>'},
  {id:5,badge:'Beli',title:'Laptop Asus A416',kondisi:'baru',price:'Rp3.200.000',priceNum:3200000,dist:800,distText:'800 m · Kantin Teknik',img:'peach',svg:'<svg viewBox="0 0 88 98" width="70" height="50"><rect x="14" y="18" width="60" height="40" rx="6" fill="#1E3A38"/><rect x="17" y="21" width="54" height="34" rx="4" fill="#BFE3DA"/><rect x="9" y="58" width="70" height="6" rx="3" fill="#1E3A38"/></svg>'},
  {id:6,badge:'Sewa',title:'Jas Lab + Kacamata',kondisi:'baik',price:'Rp8.000/hari',priceNum:8000,dist:450,distText:'450 m · Lab Kimia',img:'mint',svg:'<svg viewBox="0 0 88 98" width="70" height="60"><rect x="24" y="20" width="40" height="50" rx="6" fill="#fff" stroke="#1E3A38" stroke-width="2"/><circle cx="44" cy="26" r="3" fill="#1E3A38"/><rect x="30" y="34" width="28" height="2" fill="#1E3A38"/><rect x="30" y="40" width="28" height="2" fill="#1E3A38"/><circle cx="18" cy="44" r="12" fill="none" stroke="#00917C" stroke-width="3"/><line x1="26" y1="52" x2="32" y2="58" stroke="#00917C" stroke-width="3"/></svg>'}
];

async function syncFromApi() {
  try {
    const res = await fetch('/api/barang');
    if (res.ok) {
      const items = await res.json();
      if (Array.isArray(items) && items.length > 0) {
        const colors = ['lav', 'mint', 'peach'];
        data = items.map((b, idx) => {
          const isSewa = Boolean(b.harga_sewa);
          const priceNum = isSewa ? b.harga_sewa : b.harga_jual;
          return {
            id: b.id_barang,
            badge: isSewa ? 'Sewa' : 'Beli',
            title: b.nama_barang,
            kondisi: b.kondisi || 'baik',
            price: 'Rp' + Number(priceNum).toLocaleString('id-ID') + (isSewa ? '/hari' : ''),
            priceNum: priceNum,
            dist: 300 + (idx * 200),
            distText: (300 + (idx * 200)) + ' m · Kampus',
            img: colors[idx % colors.length],
            svg: `<svg viewBox="0 0 88 98" width="60" height="60"><rect x="14" y="14" width="60" height="60" rx="14" fill="#DDF1EC"/><text x="44" y="52" font-size="24" fill="#00917C" text-anchor="middle" font-weight="bold">${escHtml((b.nama_barang || 'K').charAt(0))}</text></svg>`
          };
        });
        render();
      }
    }
  } catch (_e) {}
}

let sortMode = 'near';
let filterActive = false;
let selectedMethod = 'sewa';
let minPriceVal = 0;
let maxPriceVal = 10000;
let maxDistVal = 1000; // in meters (1 km)
let selectedCondition = 'baik';

const q = document.getElementById('q');
const clearBtn = document.getElementById('clearBtn');
const list = document.getElementById('list');
const countText = document.getElementById('countText');
const filterModal = document.getElementById('filterModal');
const filterChip = document.getElementById('filterChip');
const closeFilterBtn = document.getElementById('closeFilterBtn');
const priceChip = document.getElementById('priceChip');
const distChip = document.getElementById('distChip');
const filterDistSlider = document.getElementById('filterDistSlider');
const filterDistText = document.getElementById('filterDistText');
const filterMinPrice = document.getElementById('filterMinPrice');
const filterMaxPrice = document.getElementById('filterMaxPrice');
const filterResetBtn = document.getElementById('filterResetBtn');
const filterApplyBtn = document.getElementById('filterApplyBtn');

function badgeClass(b) {
  if (b === 'Sewa') return 'sewa';
  if (b === 'Beli') return 'beli';
  return 'pinjam';
}

function parsePrice(str) {
  const num = parseInt(String(str).replace(/[^0-9]/g, ''), 10);
  return isNaN(num) ? 0 : num;
}

function formatKm(meters) {
  if (meters >= 1000) {
    const km = (meters / 1000).toFixed(meters % 1000 === 0 ? 0 : 1);
    return km + ' km';
  }
  return meters + ' m';
}

function updateSliderBackground(val) {
  const min = 100, max = 5000;
  const pct = Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));
  filterDistSlider.style.background = `linear-gradient(to right, #008272 0%, #008272 ${pct}%, #DDF1EC ${pct}%, #DDF1EC 100%)`;
}

function render() {
  let term = q.value.trim().toLowerCase();
  let items = data.filter(d => d.title.toLowerCase().includes(term));

  if (filterActive) {
    if (selectedMethod !== 'semua') {
      items = items.filter(d => d.badge.toLowerCase() === selectedMethod.toLowerCase());
    }
    if (maxPriceVal > 0) {
      items = items.filter(d => d.priceNum >= minPriceVal && d.priceNum <= maxPriceVal);
    }
    if (maxDistVal > 0) {
      items = items.filter(d => d.dist <= maxDistVal);
    }
    if (selectedCondition !== 'semua') {
      items = items.filter(d => (d.kondisi || 'baik') === selectedCondition);
    }
  }

  if (sortMode === 'near') items.sort((a, b) => a.dist - b.dist);
  else if (sortMode === 'cheap') items.sort((a, b) => a.priceNum - b.priceNum);
  else items = items.slice().reverse();

  countText.textContent = items.length + ' barang ditemukan';

  if (items.length === 0) {
    list.innerHTML = `
      <div class="empty">
        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <div class="t">Barang tidak ditemukan</div>
        <div class="s">Coba sesuaikan kata kunci atau filter pencarian Anda.</div>
      </div>`;
    return;
  }

  let html = '';
  items.forEach(d => {
    html += `
      <div class="result-card" data-id="${d.id}" style="cursor:pointer">
        <div class="img ${escHtml(d.img)}">${d.svg}</div>
        <div class="info">
          <div class="badge ${badgeClass(d.badge)}">${escHtml(d.badge)}</div>
          <div class="title">${escHtml(d.title)}</div>
          <div class="price">${escHtml(d.price)}</div>
          <div class="loc"><svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>${escHtml(d.distText)}</div>
        </div>
      </div>`;
  });
  html += `
    <div class="infobox">
      <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
      <p>Semua barang berasal dari mahasiswa di komunitas kampus terverifikasi.</p>
    </div>`;
  list.innerHTML = html;

  list.querySelectorAll('.result-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.id || '1';
      window.location.href = `/detail.html?id=${id}`;
    });
  });
}

// Search input
q.addEventListener('input', function() {
  clearBtn.style.display = q.value ? 'flex' : 'none';
  render();
});
clearBtn.addEventListener('click', function() {
  q.value = '';
  clearBtn.style.display = 'none';
  render();
});

// Top chips
filterChip.addEventListener('click', function() {
  filterModal.classList.add('open');
});

priceChip.addEventListener('click', function() {
  filterModal.classList.add('open');
});

distChip.addEventListener('click', function() {
  filterModal.classList.add('open');
});

// Close modal
closeFilterBtn.addEventListener('click', function() {
  filterModal.classList.remove('open');
});
filterModal.addEventListener('click', function(e) {
  if (e.target === filterModal) {
    filterModal.classList.remove('open');
  }
});

// Method chips in modal
document.querySelectorAll('#methodChips .f-chip').forEach(chip => {
  chip.addEventListener('click', function() {
    document.querySelectorAll('#methodChips .f-chip').forEach(c => c.classList.remove('active'));
    this.classList.add('active');
    selectedMethod = this.dataset.method;
  });
});

// Condition chips in modal
document.querySelectorAll('#conditionChips .f-chip').forEach(chip => {
  chip.addEventListener('click', function() {
    document.querySelectorAll('#conditionChips .f-chip').forEach(c => c.classList.remove('active'));
    this.classList.add('active');
    selectedCondition = this.dataset.cond;
  });
});

// Distance Slider
filterDistSlider.addEventListener('input', function() {
  maxDistVal = parseInt(this.value, 10);
  filterDistText.textContent = formatKm(maxDistVal);
  updateSliderBackground(maxDistVal);
});

// Reset button
filterResetBtn.addEventListener('click', function() {
  selectedMethod = 'semua';
  document.querySelectorAll('#methodChips .f-chip').forEach(c => {
    c.classList.toggle('active', c.dataset.method === 'semua');
  });

  selectedCondition = 'semua';
  document.querySelectorAll('#conditionChips .f-chip').forEach(c => {
    c.classList.toggle('active', c.dataset.cond === 'semua');
  });

  minPriceVal = 0;
  maxPriceVal = 1000000;
  filterMinPrice.value = 'Rp0';
  filterMaxPrice.value = 'Rp1.000.000';

  maxDistVal = 5000;
  filterDistSlider.value = 5000;
  filterDistText.textContent = '5 km';
  updateSliderBackground(5000);

  filterActive = false;
  priceChip.textContent = '≤ Rp100.000';
  priceChip.classList.remove('active');
  distChip.textContent = '≤ 2 km';
  distChip.classList.remove('active');

  render();
  filterModal.classList.remove('open');
});

// Apply filter button
filterApplyBtn.addEventListener('click', function() {
  minPriceVal = parsePrice(filterMinPrice.value);
  maxPriceVal = parsePrice(filterMaxPrice.value);
  maxDistVal = parseInt(filterDistSlider.value, 10);

  filterActive = true;
  priceChip.textContent = '≤ Rp' + maxPriceVal.toLocaleString('id-ID');
  priceChip.classList.add('active');
  distChip.textContent = '≤ ' + formatKm(maxDistVal);
  distChip.classList.add('active');

  render();
  filterModal.classList.remove('open');
});

// Sort Dropdown
const sortBtn = document.getElementById('sortBtn');
const sortDrop = document.getElementById('sortDrop');
sortBtn.addEventListener('click', function(e) {
  e.stopPropagation();
  sortDrop.classList.toggle('open');
});
document.addEventListener('click', function() {
  sortDrop.classList.remove('open');
});
sortDrop.querySelectorAll('.opt').forEach(function(o) {
  o.addEventListener('click', function() {
    sortMode = this.dataset.val;
    sortBtn.childNodes[0].nodeValue = this.textContent + ' ';
    sortDrop.classList.remove('open');
    render();
  });
});

// Query string check on load
const urlParams = new URLSearchParams(window.location.search);
const queryParam = urlParams.get('q');
if (queryParam && q) {
  q.value = queryParam;
}

// Initial state matching screenshot
updateSliderBackground(1000);
filterActive = true; // start with the filters shown in screenshot active
render();
syncFromApi();
clearBtn.style.display = q.value ? 'flex' : 'none';
