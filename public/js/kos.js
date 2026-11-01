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
    img: '/img/kos-damar-asri.png',
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
    img: '/img/kos-teras-cendekia.png',
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
    img: '/img/kos-puri-mahasiswa.png',
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

  if (!listKos) return;

  if (items.length === 0) {
    listKos.innerHTML = `
      <div style="text-align:center;padding:30px 0;color:#64748B">
        <svg viewBox="0 0 24 24" width="36" height="36" stroke="#64748B" fill="none" stroke-width="1.8"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <div style="font-weight:700;color:#0F172A;margin-top:6px">Kos tidak ditemukan</div>
        <div style="font-size:12px">Coba sesuaikan kata kunci atau filter jarak/harga.</div>
      </div>`;
    return;
  }

  listKos.innerHTML = items.map(k => `
    <div class="card-kos" data-id="${k.id}">
      <div class="thumb">
        <img src="${k.img}" alt="${k.name}">
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
    <div style="border-radius:14px;overflow:hidden;height:140px;background:#EDEAF7">
      <img src="${k.img}" alt="${k.name}" style="width:100%;height:100%;object-fit:cover;">
    </div>
    <div style="background:#F8FAFC;border-radius:14px;padding:12px;border:1px solid #E2E8F0">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="background:#FFF1DE;color:#9A3412;font-size:11px;font-weight:700;padding:3px 10px;border-radius:999px">Kos ${k.gender} • Terverifikasi</span>
        <span style="font-size:12px;color:#64748B">📍 ${k.distText}</span>
      </div>
      <div style="font-size:20px;font-weight:800;color:#008F83;margin-top:8px">${k.priceText} <span style="font-size:12px;color:#64748B;font-weight:400">/bulan</span></div>
      <div style="font-size:12px;color:#008F83;font-weight:700;margin-top:4px">✓ ${k.avail}</div>
    </div>

    <div>
      <div style="font-size:13px;font-weight:700;color:#0F172A;margin-bottom:4px">Fasilitas Kamar:</div>
      <div style="font-size:12px;color:#64748B;line-height:1.5">${k.fac}</div>
    </div>

    <div>
      <div style="font-size:13px;font-weight:700;color:#0F172A;margin-bottom:4px">Deskripsi Kos:</div>
      <div style="font-size:12px;color:#64748B;line-height:1.5">${k.desc}</div>
    </div>

    <div style="display:flex;gap:10px;margin-top:6px">
      <button id="btnChatPemilik" class="modal-btn outline" type="button">
        Chat Pemilik
      </button>
      <button id="btnAjukanSewa" class="modal-btn" type="button">
        Ajukan Sewa
      </button>
    </div>
  `;

  document.getElementById('btnChatPemilik')?.addEventListener('click', () => {
    const chatUrl = `/chat.html?seller=kos_${k.id}&nama=${encodeURIComponent('Pemilik ' + k.name)}&title=${encodeURIComponent(k.name)}&sub=${encodeURIComponent(k.priceText + '/bln')}`;
    window.location.href = chatUrl;
  });

  document.getElementById('btnAjukanSewa')?.addEventListener('click', () => {
    openAjukanSewa(k);
  });

  modalKos.classList.add('open');
}

function openAjukanSewa(k) {
  if (!modalKos) return;
  mKosNama.textContent = 'Ajukan Sewa Kost';
  mKosContent.innerHTML = `
    <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:14px;padding:12px;display:flex;gap:12px;align-items:center">
      <img src="${k.img}" alt="${k.name}" style="width:64px;height:64px;border-radius:10px;object-fit:cover;">
      <div style="flex:1">
        <div style="font-size:14px;font-weight:700;color:#0F172A">${k.name}</div>
        <div style="font-size:14px;font-weight:700;color:#008F83;margin-top:2px">${k.priceText} <span style="font-size:11px;color:#64748B;font-weight:400">/bulan</span></div>
        <div style="font-size:11px;color:#64748B">📍 ${k.distText}</div>
      </div>
    </div>

    <div>
      <label style="font-size:12px;font-weight:700;color:#0F172A;display:block;margin-bottom:4px">Pilih kamar</label>
      <div style="border:1.5px solid #E2E8F0;border-radius:12px;padding:10px 14px;font-size:13px;font-weight:600;color:#0F172A">
        A-09 • Standar • 3 × 3 m
      </div>
    </div>

    <div>
      <label style="font-size:12px;font-weight:700;color:#0F172A;display:block;margin-bottom:4px">Mulai sewa</label>
      <div style="border:1.5px solid #E2E8F0;border-radius:12px;padding:10px 14px;font-size:13px;font-weight:600;color:#0F172A">
        1 November 2026
      </div>
    </div>

    <div style="display:flex;gap:8px">
      <button type="button" class="chip white" style="flex:1;justify-content:center;border:1.5px solid #E2E8F0;height:36px">1 bulan</button>
      <button type="button" class="chip orange" style="flex:1;justify-content:center;height:36px">3 bulan</button>
      <button type="button" class="chip white" style="flex:1;justify-content:center;border:1.5px solid #E2E8F0;height:36px">6 bulan</button>
    </div>

    <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:14px;padding:12px">
      <div style="font-size:13px;font-weight:700;color:#0F172A;margin-bottom:4px">Ringkasan biaya</div>
      <div style="display:flex;justify-content:space-between;font-size:12px;color:#64748B">
        <span>${k.priceText} × 3 bulan</span>
        <span style="font-weight:700;color:#0F172A">Rp${(k.price * 3).toLocaleString('id-ID')}</span>
      </div>
    </div>

    <button id="btnKonfirmasiAjukan" class="modal-btn" type="button" style="margin-top:6px">
      Konfirmasi Pengajuan
    </button>
  `;

  document.getElementById('btnKonfirmasiAjukan')?.addEventListener('click', () => {
    openStatusPengajuan(k);
  });
}

function openStatusPengajuan(k) {
  if (!modalKos) return;
  mKosNama.textContent = 'Status Pengajuan Kost';
  mKosContent.innerHTML = `
    <div style="background:#DCFCE7;border-radius:14px;padding:12px;display:flex;align-items:center;gap:10px">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#166534" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
      <div>
        <div style="font-size:13px;font-weight:700;color:#166534">Pengajuan berhasil dikirim</div>
        <div style="font-size:11px;color:#166534">KST-REQ-001 • 30 Okt 2026 • 09.30</div>
      </div>
    </div>

    <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:14px;padding:12px;display:flex;gap:12px;align-items:center">
      <img src="${k.img}" alt="${k.name}" style="width:64px;height:64px;border-radius:10px;object-fit:cover;">
      <div style="flex:1">
        <div style="font-size:14px;font-weight:700;color:#0F172A">${k.name}</div>
        <div style="font-size:14px;font-weight:700;color:#008F83;margin-top:2px">${k.priceText} <span style="font-size:11px;color:#64748B;font-weight:400">/bulan</span></div>
        <div style="font-size:11px;color:#64748B">📍 ${k.distText}</div>
      </div>
    </div>

    <div style="background:#FFF1DE;border-radius:12px;padding:10px 12px;font-size:12px;font-weight:600;color:#9A3412">
      Menunggu persetujuan pemilik kos
    </div>

    <button id="btnTutupStatus" class="modal-btn" type="button">
      Kembali ke Cari Kos
    </button>
  `;

  document.getElementById('btnTutupStatus')?.addEventListener('click', () => {
    modalKos.classList.remove('open');
  });
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
  chipDist.style.background = distLimit === 2000 ? '#008F83' : '#FFFFFF';
  chipDist.style.color = distLimit === 2000 ? '#FFFFFF' : '#008F83';
  renderKos();
});

chipPrice?.addEventListener('click', () => {
  priceLimit = priceLimit === 1000000 ? 2000000 : 1000000;
  chipPrice.style.background = priceLimit === 1000000 ? '#008F83' : '#FFFFFF';
  chipPrice.style.color = priceLimit === 1000000 ? '#FFFFFF' : '#008F83';
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
