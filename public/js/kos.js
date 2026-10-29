const kosData = [
  {
    id: 1,
    name: 'Kos Damar Asri',
    gender: 'Putri',
    price: 850000,
    priceText: 'Rp850.000',
    dist: 350,
    distText: '350 m dari ITG',
    fac: 'Wi-Fi • KM dalam • Furnitur',
    avail: '2 kamar tersedia',
    desc: 'Kos khusus mahasiswi, lingkungan aman dan bersih, dekat minimarket dan kantin kampus. Dilengkapi kasur springbed, lemari pakaian, dan meja belajar.',
    wa: '6281234567891'
  },
  {
    id: 2,
    name: 'Kos Teras Cendekia',
    gender: 'Putra',
    price: 700000,
    priceText: 'Rp700.000',
    dist: 650,
    distText: '650 m dari ITG',
    fac: 'Wi-Fi • Parkir • Dapur',
    avail: '3 kamar tersedia',
    desc: 'Kos khusus mahasiswa dengan halaman hijau asri dan ventilasi segar. Parkir motor luas di dalam pagar tertutup, fasilitas dapur bersama lengkap.',
    wa: '6281234567892'
  },
  {
    id: 3,
    name: 'Kos Puri Mahasiswa',
    gender: 'Campur',
    price: 950000,
    priceText: 'Rp950.000',
    dist: 1200,
    distText: '1,2 km dari ITG',
    fac: 'KM dalam • Furnitur • Parkir',
    avail: '1 kamar tersedia',
    desc: 'Kos bangunan baru dengan akses gerbang 24 jam. Kamar mandi dalam dengan shower, Wi-Fi kencang cocok untuk belajar dan praktikum online.',
    wa: '6281234567893'
  }
];

let distLimit = 5000;
let priceLimit = 2000000;
let currentSort = 'near';

const qKos = document.getElementById('qKos');
const listKos = document.getElementById('listKos');
const countKos = document.getElementById('countKos');
const chipDist = document.getElementById('chipDist');
const chipPrice = document.getElementById('chipPrice');
const chipFilter = document.getElementById('chipFilter');
const sortKos = document.getElementById('sortKos');
const sortLabel = document.getElementById('sortLabel');
const modalKos = document.getElementById('modalKos');
const mKosNama = document.getElementById('mKosNama');
const mKosContent = document.getElementById('mKosContent');
const mKosClose = document.getElementById('mKosClose');

function renderKos() {
  const q = (qKos?.value || '').trim().toLowerCase();
  let items = kosData.filter(k => {
    const matchText = !q || k.name.toLowerCase().includes(q) || k.desc.toLowerCase().includes(q);
    const matchDist = k.dist <= distLimit;
    const matchPrice = k.price <= priceLimit;
    return matchText && matchDist && matchPrice;
  });

  if (currentSort === 'near') items.sort((a, b) => a.dist - b.dist);
  else if (currentSort === 'cheap') items.sort((a, b) => a.price - b.price);
  else if (currentSort === 'avail') items.sort((a, b) => parseInt(b.avail) - parseInt(a.avail));

  if (countKos) countKos.textContent = `${items.length} kos • jarak dari kampus`;

  if (items.length === 0) {
    listKos.innerHTML = `
      <div style="text-align:center;padding:30px 0;color:#7A8583">
        <svg viewBox="0 0 24 24" width="36" height="36" stroke="#7A8583" fill="none" stroke-width="1.8"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <div style="font-weight:700;color:#1E3A38;margin-top:6px">Kos tidak ditemukan</div>
        <div style="font-size:12px">Coba sesuaikan kata kunci atau filter jarak/harga.</div>
      </div>`;
    return;
  }

  listKos.innerHTML = items.map(k => `
    <div class="card-kos" data-id="${k.id}">
      <div class="thumb">
        <span class="badge-gender">${k.gender}</span>
        <svg viewBox="0 0 96 108" width="96" height="108">
          <rect width="96" height="108" fill="${k.gender==='Putri'?'#EDEAF7':(k.gender==='Putra'?'#DDF1EC':'#FFF0DB')}"/>
          <rect x="15" y="40" width="45" height="55" rx="4" fill="#00917C"/>
          <rect x="18" y="48" width="39" height="25" rx="2" fill="#fff"/>
          <rect x="65" y="32" width="20" height="63" rx="3" fill="#1E3A38"/>
          <circle cx="48" cy="24" r="5" fill="#F28C28"/>
        </svg>
      </div>
      <div class="info">
        <div class="name">${k.name}</div>
        <div class="price">${k.priceText}<span class="per">/bulan</span></div>
        <div class="dist">
          <svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          ${k.distText}
        </div>
        <div class="fac">${k.fac}</div>
        <div class="avail">${k.avail}</div>
      </div>
    </div>
  `).join('');

  document.querySelectorAll('.card-kos').forEach(card => {
    card.addEventListener('click', () => {
      const id = Number(card.dataset.id);
      const item = kosData.find(x => x.id === id);
      if (item) openDetailKos(item);
    });
  });
}

function openDetailKos(k) {
  if (!modalKos) return;
  mKosNama.textContent = k.name;
  mKosContent.innerHTML = `
    <div style="background:#F7F9F8;border-radius:14px;padding:12px;margin-top:4px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="background:#FFF0DB;color:#A65A00;font-size:11px;font-weight:700;padding:3px 10px;border-radius:999px">Kos ${k.gender}</span>
        <span style="font-size:12px;color:#7A8583">📍 ${k.distText}</span>
      </div>
      <div style="font-size:22px;font-weight:800;color:#00917C;margin-top:8px">${k.priceText} <span style="font-size:12px;color:#7A8583;font-weight:400">/bulan</span></div>
      <div style="font-size:12px;color:#00917C;font-weight:700;margin-top:4px">✓ ${k.avail}</div>
    </div>

    <div>
      <div style="font-size:13px;font-weight:700;color:#1E3A38;margin-bottom:4px">Fasilitas Kamar:</div>
      <div style="font-size:12px;color:#7A8583;line-height:1.5">${k.fac}</div>
    </div>

    <div>
      <div style="font-size:13px;font-weight:700;color:#1E3A38;margin-bottom:4px">Deskripsi Kos:</div>
      <div style="font-size:12px;color:#7A8583;line-height:1.5">${k.desc}</div>
    </div>

    <button id="btnHubungiPemilik" class="modal-btn" style="background:#00917C">
      Hubungi Pemilik Kos (WhatsApp)
    </button>
    <button id="btnSurveiKos" class="modal-btn orange">
      Jadwalkan Survei / Booking Demo
    </button>
  `;

  document.getElementById('btnHubungiPemilik')?.addEventListener('click', () => {
    alert(`Membuka kontak pemilik ${k.name} (+${k.wa})...\nPesan siap dikirim: "Halo, saya tertarik dengan kamar di ${k.name} dari KampusCircle."`);
  });

  document.getElementById('btnSurveiKos')?.addEventListener('click', () => {
    alert(`Permintaan survei untuk ${k.name} telah dikirim ke pemilik kos. Notifikasi jadwal akan dikirim ke akun Anda.`);
    modalKos.classList.remove('open');
  });

  modalKos.classList.add('open');
}

mKosClose?.addEventListener('click', () => {
  modalKos?.classList.remove('open');
});
modalKos?.addEventListener('click', (e) => {
  if (e.target === modalKos) modalKos.classList.remove('open');
});

// Search input
qKos?.addEventListener('input', renderKos);

// Chips toggling
chipDist?.addEventListener('click', () => {
  distLimit = distLimit === 2000 ? 5000 : 2000;
  chipDist.style.background = distLimit === 2000 ? '#00917C' : '#fff';
  chipDist.style.color = distLimit === 2000 ? '#fff' : '#00917C';
  renderKos();
});

chipPrice?.addEventListener('click', () => {
  priceLimit = priceLimit === 1000000 ? 2000000 : 1000000;
  chipPrice.style.background = priceLimit === 1000000 ? '#00917C' : '#fff';
  chipPrice.style.color = priceLimit === 1000000 ? '#fff' : '#00917C';
  renderKos();
});

chipFilter?.addEventListener('click', () => {
  location.href = '/filter-kos.html';
});

// Load filters from sessionStorage if set
const storedDist = sessionStorage.getItem('fk_dist');
if (storedDist) {
  distLimit = storedDist === 'all' ? 5000 : parseInt(storedDist, 10) * 1000;
  if (chipDist) chipDist.textContent = 'Jarak ≤ ' + (storedDist === 'all' ? 'Semua' : storedDist + ' km');
}

const storedMax = sessionStorage.getItem('fk_max');
if (storedMax) {
  const num = parseInt(storedMax.replace(/[^0-9]/g, ''), 10);
  if (!isNaN(num) && num > 0) {
    priceLimit = num;
    if (chipPrice) chipPrice.textContent = '≤ ' + (num >= 1000000 ? (num/1000000) + ' jt/bln' : 'Rp' + num.toLocaleString('id-ID'));
  }
}

// Sort
sortKos?.addEventListener('click', () => {
  if (currentSort === 'near') {
    currentSort = 'cheap';
    sortLabel.textContent = 'Termurah';
  } else if (currentSort === 'cheap') {
    currentSort = 'avail';
    sortLabel.textContent = 'Terbanyak';
  } else {
    currentSort = 'near';
    sortLabel.textContent = 'Terdekat';
  }
  renderKos();
});

renderKos();
