const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Fallback data jika server / fetch tidak tersedia
const defaultKosData = [
  {
    id: 1,
    id_kos: 1,
    name: 'Kos Damar Asri',
    nama_kos: 'Kos Damar Asri',
    gender: 'Putri',
    jenis_kelamin: 'putri',
    tipe_kos: 'putri',
    price: 850000,
    harga_bulan: 850000,
    priceText: 'Rp850.000',
    dist: 350,
    distText: '350 m dari ITG',
    fac: 'Wi-Fi • KM dalam • Furnitur',
    fasilitas: 'Wi-Fi • KM dalam • Furnitur',
    avail: '2 kamar tersedia',
    kamar_tersedia: 2,
    img: '/img/kos-damar-asri.png',
    foto: '/img/kos-damar-asri.png',
    desc: 'Kos khusus mahasiswi, lingkungan aman dan bersih, dekat minimarket dan kantin kampus. Dilengkapi kasur springbed, lemari pakaian, dan meja belajar.',
    deskripsi: 'Kos khusus mahasiswi, lingkungan aman dan bersih, dekat minimarket dan kantin kampus. Dilengkapi kasur springbed, lemari pakaian, dan meja belajar.',
    wa: '6281234567891'
  },
  {
    id: 2,
    id_kos: 2,
    name: 'Kos Teras Cendekia',
    nama_kos: 'Kos Teras Cendekia',
    gender: 'Putra',
    jenis_kelamin: 'putra',
    tipe_kos: 'putra',
    price: 700000,
    harga_bulan: 700000,
    priceText: 'Rp700.000',
    dist: 650,
    distText: '650 m dari ITG',
    fac: 'Wi-Fi • Parkir • Dapur',
    fasilitas: 'Wi-Fi • Parkir • Dapur',
    avail: '3 kamar tersedia',
    kamar_tersedia: 3,
    img: '/img/kos-teras-cendekia.png',
    foto: '/img/kos-teras-cendekia.png',
    desc: 'Kos khusus mahasiswa dengan halaman hijau asri dan ventilasi segar. Parkir motor luas di dalam pagar tertutup, fasilitas dapur bersama lengkap.',
    deskripsi: 'Kos khusus mahasiswa dengan halaman hijau asri dan ventilasi segar. Parkir motor luas di dalam pagar tertutup, fasilitas dapur bersama lengkap.',
    wa: '6281234567892'
  },
  {
    id: 3,
    id_kos: 3,
    name: 'Kos Puri Mahasiswa',
    nama_kos: 'Kos Puri Mahasiswa',
    gender: 'Campur',
    jenis_kelamin: 'campur',
    tipe_kos: 'campur',
    price: 950000,
    harga_bulan: 950000,
    priceText: 'Rp950.000',
    dist: 1200,
    distText: '1,2 km dari ITG',
    fac: 'KM dalam • Furnitur • Parkir',
    fasilitas: 'KM dalam • Furnitur • Parkir',
    avail: '1 kamar tersedia',
    kamar_tersedia: 1,
    img: '/img/kos-puri-mahasiswa.png',
    foto: '/img/kos-puri-mahasiswa.png',
    desc: 'Kos bangunan baru dengan akses gerbang 24 jam. Kamar mandi dalam dengan shower, Wi-Fi kencang cocok untuk belajar dan praktikum online.',
    deskripsi: 'Kos bangunan baru dengan akses gerbang 24 jam. Kamar mandi dalam dengan shower, Wi-Fi kencang cocok untuk belajar dan praktikum online.',
    wa: '6281234567893'
  }
];

let kosData = [];
let selectedTipe = 'semua';
let distLimit = 5000;
let priceLimit = 2000000;
let currentSort = 'near';

const qKos = document.getElementById('qKos');
const kosContainer = document.getElementById('listKos') || document.getElementById('kosContainer');
const listKos = kosContainer;
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

function mapKosItem(k) {
  const id = Number(k.id_kos ?? k.id ?? 1);
  const name = k.nama_kos ?? k.name ?? 'Kos Kampus';
  const price = Number(k.harga_bulan ?? k.price ?? 800000);
  const priceText = k.priceText || ('Rp' + price.toLocaleString('id-ID'));
  const rawGender = String(k.tipe_kos ?? k.jenis_kelamin ?? k.gender ?? 'campur').toLowerCase();
  const gender = rawGender.charAt(0).toUpperCase() + rawGender.slice(1);

  let img = '/img/kos-damar-asri.png';
  if (k.foto) {
    try {
      const parsed = JSON.parse(k.foto);
      if (Array.isArray(parsed) && parsed.length > 0) img = parsed[0];
      else if (typeof k.foto === 'string' && k.foto.trim() !== '') img = k.foto;
    } catch {
      if (typeof k.foto === 'string' && k.foto.trim() !== '') img = k.foto;
    }
  } else if (k.img) {
    img = k.img;
  } else {
    if (id === 1) img = '/img/kos-damar-asri.png';
    else if (id === 2) img = '/img/kos-teras-cendekia.png';
    else if (id === 3) img = '/img/kos-puri-mahasiswa.png';
    else img = '/img/kos-ananda-dago.png';
  }

  const dist = k.dist || (id === 1 ? 350 : id === 2 ? 650 : id === 3 ? 1200 : ((id * 350) % 2000 + 300));
  const distText = k.distText || (dist >= 1000 ? `${(dist / 1000).toFixed(1).replace('.', ',')} km dari ITG` : `${dist} m dari ITG`);
  const kamarCount = k.kamar_tersedia != null ? k.kamar_tersedia : 2;
  const avail = k.avail || `${kamarCount} kamar tersedia`;
  const fac = k.fasilitas ?? k.fac ?? 'Wi-Fi • KM dalam • Furnitur';
  const desc = k.deskripsi ?? k.desc ?? 'Kos nyaman dekat kampus ITG.';
  const wa = k.no_hp ?? k.no_hp_pemilik ?? k.wa ?? '6281234567891';

  return {
    ...k,
    id,
    id_kos: id,
    name,
    nama_kos: name,
    price,
    harga_bulan: price,
    priceText,
    gender,
    jenis_kelamin: rawGender,
    tipe_kos: rawGender,
    img,
    foto: img,
    dist,
    distText,
    avail,
    kamar_tersedia: kamarCount,
    fac,
    fasilitas: fac,
    desc,
    deskripsi: desc,
    wa
  };
}

// Mengubah tampilan UI tombol filter menjadi status aktif (hijau/primary)
function updateFilterChipsUI(activeTipe) {
  const normActive = (activeTipe || 'semua').toLowerCase();
  const chipButtons = document.querySelectorAll('.chip-tipe, #chipSemua, #chipPutra, #chipPutri, #chipCampur, [data-tipe], [data-gender]');

  chipButtons.forEach(btn => {
    const t = (btn.dataset.tipe || btn.dataset.gender || btn.id.replace('chip', '') || btn.textContent || '').trim().toLowerCase();
    if (t === 'dist' || t === 'price' || t === 'filter' || btn.id === 'chipDist' || btn.id === 'chipPrice' || btn.id === 'chipFilter') {
      return;
    }
    const isActive = t === normActive || (normActive === 'semua' && (t === 'semua' || t === 'all'));

    if (isActive) {
      btn.classList.add('active');
      btn.classList.remove('white');
      btn.style.backgroundColor = '#004D40'; // Warna hijau / primary active
      btn.style.color = '#FFFFFF';
      btn.style.borderColor = '#FFFFFF';
    } else {
      btn.classList.remove('active');
      btn.classList.add('white');
      btn.style.backgroundColor = '#FFFFFF';
      btn.style.color = '#008F83';
      btn.style.borderColor = 'transparent';
    }
  });
}

// 1. Frontend (Event Listener & Fetch URL)
// Panggil ulang fungsi fetch data (loadKos) dengan menyematkan parameter ke URL
async function loadKos(tipe = selectedTipe) {
  if (tipe !== undefined && tipe !== null) {
    selectedTipe = String(tipe).toLowerCase().trim();
  }

  // 2. Frontend (Kosongkan Kontainer): Kosongkan kontainer sebelum fetch / render
  const container = document.getElementById('listKos') || document.getElementById('kosContainer');
  if (container) {
    container.innerHTML = '';
  }

  // Ubah tampilan UI tombol filter menjadi status aktif
  updateFilterChipsUI(selectedTipe);

  // Sisipkan parameter tipe ke dalam URL API. Contoh: fetch(`/api/kos?tipe=${selectedTipe}`)
  let url = '/api/kos';
  if (selectedTipe && selectedTipe !== 'semua') {
    url = `/api/kos?tipe=${encodeURIComponent(selectedTipe)}`;
  }

  const qVal = (document.getElementById('qKos')?.value || '').trim();
  if (qVal) {
    url += (url.includes('?') ? '&' : '?') + `q=${encodeURIComponent(qVal)}`;
  }

  // WAJIB: Tambahkan console.log("URL Fetch:", url); tepat sebelum fetch dieksekusi
  console.log("URL Fetch:", url);

  let isApiData = false;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    kosData = Array.isArray(data) ? data.map(mapKosItem) : [];
    isApiData = true;
  } catch (err) {
    console.error('Fetch /api/kos error:', err);
    // Fallback data lokal jika server tidak merespons
    kosData = defaultKosData
      .filter(k => selectedTipe === 'semua' || k.tipe_kos === selectedTipe || k.jenis_kelamin === selectedTipe)
      .map(mapKosItem);
    isApiData = false;
  }

  // Badge "Contoh listing" dan teks fiktif hanya tampil untuk data tiruan/fallback
  const badgeListing = document.getElementById('badgeContohListing') || document.querySelector('.badge-listing');
  const fiktifNotice = document.getElementById('fiktifNotice') || document.querySelector('.fiktif');
  if (isApiData) {
    if (badgeListing) badgeListing.style.display = 'none';
    if (fiktifNotice) fiktifNotice.style.display = 'none';
  } else {
    if (badgeListing) badgeListing.style.display = 'inline-block';
    if (fiktifNotice) fiktifNotice.style.display = 'block';
  }

  renderKos();
}

// Alias loadKos sebagai fetchKos
const fetchKos = loadKos;

// 2. Frontend (Kosongkan Kontainer dan Render Card)
function renderKos() {
  const container = document.getElementById('listKos') || document.getElementById('kosContainer');
  if (!container) return;

  // WAJIB kosongkan isi kontainer list terlebih dahulu sebelum merender elemen HTML (card)
  container.innerHTML = '';

  const q = (document.getElementById('qKos')?.value || '').trim().toLowerCase();
  let items = kosData.filter(k => {
    const matchTipe = !selectedTipe || selectedTipe === 'semua' ||
      (k.tipe_kos && k.tipe_kos.toLowerCase() === selectedTipe) ||
      (k.jenis_kelamin && k.jenis_kelamin.toLowerCase() === selectedTipe) ||
      (k.gender && k.gender.toLowerCase() === selectedTipe);
    const matchText = !q ||
      (k.name && k.name.toLowerCase().includes(q)) ||
      (k.desc && k.desc.toLowerCase().includes(q)) ||
      (k.alamat && k.alamat.toLowerCase().includes(q));
    const matchDist = (k.dist == null) || k.dist <= distLimit;
    const matchPrice = (k.price == null) || k.price <= priceLimit;
    return matchTipe && matchText && matchDist && matchPrice;
  });

  if (currentSort === 'near') items.sort((a, b) => (a.dist || 0) - (b.dist || 0));
  else if (currentSort === 'cheap') items.sort((a, b) => (a.price || 0) - (b.price || 0));
  else if (currentSort === 'avail') items.sort((a, b) => parseInt(b.avail || b.kamar_tersedia || 0) - parseInt(a.avail || a.kamar_tersedia || 0));

  if (countKos) countKos.textContent = `${items.length} kos • jarak dari kampus`;

  if (items.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        </div>
        <div class="empty-state-title">Kos tidak ditemukan</div>
        <div class="empty-state-desc">Coba sesuaikan kata kunci atau longgarkan filter pencarianmu.</div>
      </div>`;
    return;
  }

  container.innerHTML = items.map(k => `
    <div class="card-kos" data-id="${k.id}">
      <div class="thumb">
        <img src="${esc(k.img)}" alt="${esc(k.name)}">
        <span class="badge-corner">${esc(k.gender || 'Campur')}</span>
      </div>
      <div class="info">
        <div class="name">${esc(k.name)}</div>
        <div class="price">${esc(k.priceText)}<span class="per">/bulan</span></div>
        <div class="dist">
          <svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          ${esc(k.distText)}
        </div>
        <div class="fac">${esc(k.fac)}</div>
        <div class="avail">${esc(k.avail)}</div>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.card-kos').forEach(card => {
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
      <img src="${esc(k.img)}" alt="${esc(k.name)}" style="width:100%;height:100%;object-fit:cover;">
    </div>
    <div style="background:#F8FAFC;border-radius:14px;padding:12px;border:1px solid #E2E8F0">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="background:#FFF1DE;color:#9A3412;font-size:11px;font-weight:700;padding:3px 10px;border-radius:999px">Kos ${esc(k.gender)} • Terverifikasi</span>
        <span style="font-size:12px;color:#64748B">📍 ${esc(k.distText)}</span>
      </div>
      <div style="font-size:20px;font-weight:800;color:#008F83;margin-top:8px">${esc(k.priceText)} <span style="font-size:12px;color:#64748B;font-weight:400">/bulan</span></div>
      <div style="font-size:12px;color:#008F83;font-weight:700;margin-top:4px">✓ ${esc(k.avail)}</div>
    </div>

    <div>
      <div style="font-size:13px;font-weight:700;color:#0F172A;margin-bottom:4px">Fasilitas Kamar:</div>
      <div style="font-size:12px;color:#64748B;line-height:1.5">${esc(k.fac)}</div>
    </div>

    <div>
      <div style="font-size:13px;font-weight:700;color:#0F172A;margin-bottom:4px">Deskripsi Kos:</div>
      <div style="font-size:12px;color:#64748B;line-height:1.5">${esc(k.desc)}</div>
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
    window.location.href = `/chat.html?tipe=kos&id=${k.id}`;
  });

  document.getElementById('btnAjukanSewa')?.addEventListener('click', () => {
    openAjukanSewa(k);
  });

  modalKos.classList.add('open');
}

async function fetchKamarKos(idKos) {
  try {
    const res = await fetch(`/api/kos/${idKos || 1}/kamar`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.map(r => ({
          id: r.id,
          kos_id: r.kos_id,
          no: (r.nomor_kamar || r.nama || '').replace(/^Kamar\s*/i, ''),
          nomor_kamar: r.nomor_kamar || r.nama || `Kamar ${r.id}`,
          status: r.status || 'available',
          tipe: r.tipe ? `${r.tipe}${r.ukuran ? ' • ' + r.ukuran : ''}` : 'Standar • 3 × 3 m'
        }));
      }
    }
  } catch (_err) {
    console.warn('Gagal fetch data kamar dari backend, fallback ke local storage');
  }
  return getKamarKos(idKos);
}

function getKamarKos(idKos) {
  const key = `km_kamar_kos_${idKos || 1}`;
  const saved = localStorage.getItem(key);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (_e) {}
  }
  const defaults = [
    { no: '1', nomor_kamar: 'Kamar 01', status: 'available', tipe: 'Standar • 3 × 3 m' },
    { no: '2', nomor_kamar: 'Kamar 02', status: 'available', tipe: 'Standar • 3 × 3 m' }
  ];
  localStorage.setItem(key, JSON.stringify(defaults));
  return defaults;
}

const isRoomAvailable = (st) => st === 'available' || st === 'kosong';

async function openAjukanSewa(k) {
  if (!modalKos) return;
  mKosNama.textContent = 'Ajukan Sewa Kost';
  mKosContent.innerHTML = '<div style="text-align:center;padding:24px 0;color:#64748B;font-size:13px">Memuat data kamar...</div>';

  let selectedBulan = 3;
  let rooms = await fetchKamarKos(k.id || 1);
  let availableRooms = rooms.filter(r => isRoomAvailable(r.status));
  let selectedRoom = availableRooms.length > 0 ? (availableRooms[0].nomor_kamar || `Kamar ${availableRooms[0].no}`) : '';

  function renderAjukanContent() {
    mKosContent.innerHTML = `
      <div style="display:flex;align-items:center;gap:6px;cursor:pointer;margin-bottom:8px" id="btnBackToDetail">
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="#008F83" fill="none" stroke-width="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        <span style="font-size:12px;font-weight:700;color:#008F83">Kembali ke Detail Kos</span>
      </div>

      <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:14px;padding:12px;display:flex;gap:12px;align-items:center">
        <img src="${esc(k.img)}" alt="${esc(k.name)}" style="width:64px;height:64px;border-radius:10px;object-fit:cover;">
        <div style="flex:1">
          <div style="font-size:14px;font-weight:700;color:#0F172A">${esc(k.name)}</div>
          <div style="font-size:14px;font-weight:700;color:#008F83;margin-top:2px">${esc(k.priceText)} <span style="font-size:11px;color:#64748B;font-weight:400">/bulan</span></div>
          <div style="font-size:11px;color:#64748B">📍 ${esc(k.distText)}</div>
        </div>
      </div>

      <!-- Pilih Kamar (Hanya Kamar Kosong yang Bisa Dipilih) -->
      <div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <label style="font-size:12px;font-weight:700;color:#0F172A">Pilih Kamar</label>
          <span style="font-size:11px;color:#059669;font-weight:600">${availableRooms.length} kamar kosong</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px" id="kamarPilihanList">
          ${rooms.map(r => {
            const isKosong = isRoomAvailable(r.status);
            const roomLabel = r.nomor_kamar || (String(r.no).startsWith('Kamar') ? r.no : `Kamar ${r.no}`);
            const isSelected = isKosong && (selectedRoom === roomLabel || selectedRoom === r.no);
            const classes = ['kamar-select-item'];
            if (!isKosong) {
              classes.push('opacity-50', 'pointer-events-none');
            }
            return `
              <div class="${classes.join(' ')}" data-no="${esc(roomLabel)}" data-kosong="${isKosong}"
                   style="border: 1.5px solid ${isSelected ? '#008F83' : (isKosong ? '#CBD5E1' : '#E2E8F0')};
                          background: ${isSelected ? '#F0FDFA' : (isKosong ? '#FFFFFF' : '#F8FAFC')};
                          border-radius: 12px; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;
                          cursor: ${isKosong ? 'pointer' : 'not-allowed'};
                          opacity: ${isKosong ? '1' : '0.5'};
                          ${!isKosong ? 'pointer-events: none;' : ''}
                          transition: all 0.2s;">
                <div style="display:flex;align-items:center;gap:10px">
                  <div style="width:16px;height:16px;border-radius:50%;border:2px solid ${isSelected ? '#008F83' : '#CBD5E1'};background:${isSelected ? '#008F83' : 'transparent'};display:flex;align-items:center;justify-content:center;">
                    ${isSelected ? '<div style="width:6px;height:6px;border-radius:50%;background:#FFFFFF"></div>' : ''}
                  </div>
                  <div>
                    <div style="font-size: 13px; font-weight: 700; color: ${isKosong ? '#0F172A' : '#94A3B8'};">${esc(roomLabel)}</div>
                    <div style="font-size: 11px; color: ${isKosong ? '#64748B' : '#CBD5E1'};">${esc(r.tipe || 'Standar • 3 × 3 m')}</div>
                  </div>
                </div>
                <div>
                  ${isKosong 
                    ? `<span style="font-size: 11px; font-weight: 700; color: #059669; background: #DCFCE7; padding: 3px 8px; border-radius: 6px;">Kosong</span>` 
                    : `<span style="font-size: 11px; font-weight: 700; color: #EF4444; background: #FEE2E2; padding: 3px 8px; border-radius: 6px;">Terisi</span>`}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <div>
        <label style="font-size:12px;font-weight:700;color:#0F172A;display:block;margin-bottom:4px">Mulai sewa</label>
        <div style="border:1.5px solid #E2E8F0;border-radius:12px;padding:10px 14px;font-size:13px;font-weight:600;color:#0F172A">
          1 November 2026
        </div>
      </div>

      <div>
        <label style="font-size:12px;font-weight:700;color:#0F172A;display:block;margin-bottom:6px">Lama Sewa / Ngekost</label>
        <div style="display:flex;gap:6px" id="durasiChipsContainer">
          <button type="button" class="chip ${selectedBulan === 1 ? 'orange' : 'white'}" data-bulan="1" style="flex:1;justify-content:center;${selectedBulan === 1 ? '' : 'border:1.5px solid #E2E8F0;'}height:36px;font-weight:700;cursor:pointer">1 bln</button>
          <button type="button" class="chip ${selectedBulan === 3 ? 'orange' : 'white'}" data-bulan="3" style="flex:1;justify-content:center;${selectedBulan === 3 ? '' : 'border:1.5px solid #E2E8F0;'}height:36px;font-weight:700;cursor:pointer">3 bln</button>
          <button type="button" class="chip ${selectedBulan === 6 ? 'orange' : 'white'}" data-bulan="6" style="flex:1;justify-content:center;${selectedBulan === 6 ? '' : 'border:1.5px solid #E2E8F0;'}height:36px;font-weight:700;cursor:pointer">6 bln</button>
          <button type="button" class="chip ${selectedBulan === 12 ? 'orange' : 'white'}" data-bulan="12" style="flex:1;justify-content:center;${selectedBulan === 12 ? '' : 'border:1.5px solid #E2E8F0;'}height:36px;font-weight:700;cursor:pointer">1 thn</button>
        </div>
      </div>

      <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:14px;padding:12px">
        <div style="font-size:13px;font-weight:700;color:#0F172A;margin-bottom:6px">Ringkasan biaya</div>
        <div style="display:flex;justify-content:space-between;font-size:12px;color:#64748B;margin-bottom:4px">
          <span>Pilihan Kamar</span>
          <span style="font-weight:700;color:#0F172A">${esc(selectedRoom)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:12px;color:#64748B;margin-bottom:4px">
          <span>Sewa (${esc(k.priceText)} × ${selectedBulan} bulan)</span>
          <span style="font-weight:700;color:#0F172A">Rp${(k.price * selectedBulan).toLocaleString('id-ID')}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:12px;color:#64748B;margin-bottom:4px">
          <span>Deposit (jaminan)</span>
          <span style="font-weight:600;color:#059669">Rp0 (Promo)</span>
        </div>
        <div style="height:1px;background:#E2E8F0;margin:6px 0"></div>
        <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:700;color:#0F172A">
          <span>Total Pembayaran</span>
          <span style="color:#008F83">Rp${(k.price * selectedBulan).toLocaleString('id-ID')}</span>
        </div>
      </div>

      <button id="btnKonfirmasiAjukan" class="modal-btn" type="button" style="margin-top:6px" ${availableRooms.length === 0 ? 'disabled' : ''}>
        ${availableRooms.length === 0 ? 'Semua Kamar Penuh' : `Konfirmasi Pengajuan (${esc(selectedRoom)} • ${selectedBulan} Bulan)`}
      </button>
    `;

    document.getElementById('btnBackToDetail')?.addEventListener('click', () => {
      openDetailKos(k);
    });

    document.querySelectorAll('#kamarPilihanList .kamar-select-item').forEach(item => {
      item.addEventListener('click', () => {
        if (item.dataset.kosong === 'true') {
          selectedRoom = item.dataset.no;
          renderAjukanContent();
        }
      });
    });

    document.querySelectorAll('#durasiChipsContainer button').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedBulan = Number(btn.dataset.bulan);
        renderAjukanContent();
      });
    });

    document.getElementById('btnKonfirmasiAjukan')?.addEventListener('click', async () => {
      const btn = document.getElementById('btnKonfirmasiAjukan');
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Memproses Pengajuan...';
      }

      let resData = null;
      try {
        const dStart = new Date();
        const dEnd = new Date(dStart);
        dEnd.setMonth(dEnd.getMonth() + selectedBulan);
        const periodeStr = `${dStart.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} – ${dEnd.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`;

        const token = localStorage.getItem('km_token') || '';
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const payloadSewa = {
          kos_id: k.id,
          id_kos: k.id,
          kamar: selectedRoom.startsWith('Kamar') ? selectedRoom : `Kamar ${selectedRoom}`,
          durasi_bulan: selectedBulan,
          periode: periodeStr,
          total_harga: k.price * selectedBulan
        };

        // Kirim pengajuan sewa ke endpoint backend
        let resp = await fetch('/api/sewa', {
          method: 'POST',
          headers,
          body: JSON.stringify(payloadSewa)
        }).catch(() => null);

        if (!resp || !resp.ok) {
          // Tangani kasus kamar sudah dipesan (HTTP 409)
          if (resp && resp.status === 409) {
            const errData = await resp.json().catch(() => ({}));
            alert(errData.error || 'Kamar sudah dipesan!');
            // Refresh data kamar langsung dari API server
            rooms = await fetchKamarKos(k.id || 1);
            availableRooms = rooms.filter(r => isRoomAvailable(r.status));
            // Auto-reset pilihan kamar ke kamar kosong berikutnya
            selectedRoom = availableRooms.length > 0 ? (availableRooms[0].nomor_kamar || `Kamar ${availableRooms[0].no}`) : '';
            renderAjukanContent();
            return;
          }

          resp = await fetch('/api/kos/pengajuan', {
            method: 'POST',
            headers,
            body: JSON.stringify(payloadSewa)
          }).catch(() => null);

          if (resp && resp.status === 409) {
            const errData = await resp.json().catch(() => ({}));
            alert(errData.error || 'Kamar sudah dipesan!');
            rooms = await fetchKamarKos(k.id || 1);
            availableRooms = rooms.filter(r => isRoomAvailable(r.status));
            selectedRoom = availableRooms.length > 0 ? (availableRooms[0].nomor_kamar || `Kamar ${availableRooms[0].no}`) : '';
            renderAjukanContent();
            return;
          }
        }

        if (resp && resp.ok) {
          resData = await resp.json();
        } else {
          const errData = resp ? await resp.json().catch(() => ({})) : {};
          alert(errData.error || 'Gagal mengajukan sewa kos.');
          if (btn) {
            btn.disabled = false;
            btn.textContent = `Konfirmasi Pengajuan (${esc(selectedRoom)} • ${selectedBulan} Bulan)`;
          }
          return;
        }
      } catch (err) {
        console.error('Kirim pengajuan sewa kos error:', err);
        alert('Terjadi kesalahan koneksi. Silakan coba lagi.');
        if (btn) {
          btn.disabled = false;
          btn.textContent = `Konfirmasi Pengajuan (${esc(selectedRoom)} • ${selectedBulan} Bulan)`;
        }
        return;
      }

      // Update ketersediaan di kosData dan re-render
      k.kamar_tersedia = Math.max(0, (k.kamar_tersedia || 1) - 1);
      k.avail = `${k.kamar_tersedia} kamar tersedia`;
      renderKos();

      openStatusPengajuan(k, selectedBulan, selectedRoom, resData);
    });
  }

  renderAjukanContent();
}

function openStatusPengajuan(k, selectedBulan = 3, selectedRoom = 'A-02', resData = null) {
  if (!modalKos) return;
  mKosNama.textContent = 'Status Pengajuan Kost';

  const reqId = resData?.id_pengajuan ? `KST-REQ-${String(resData.id_pengajuan).padStart(3, '0')}` : 'KST-REQ-001';
  const now = new Date();
  const dateStr = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) + ' • ' + now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(':', '.');

  mKosContent.innerHTML = `
    <div style="background:#DCFCE7;border-radius:14px;padding:12px;display:flex;align-items:center;gap:10px">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#166534" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
      <div>
        <div style="font-size:13px;font-weight:700;color:#166534">Pengajuan berhasil dikirim</div>
        <div style="font-size:11px;color:#166534">${esc(reqId)} • ${esc(dateStr)}</div>
      </div>
    </div>

    <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:14px;padding:12px;display:flex;gap:12px;align-items:center">
      <img src="${esc(k.img)}" alt="${esc(k.name)}" style="width:64px;height:64px;border-radius:10px;object-fit:cover;">
      <div style="flex:1">
        <div style="font-size:14px;font-weight:700;color:#0F172A">${esc(k.name)}</div>
        <div style="font-size:14px;font-weight:700;color:#008F83;margin-top:2px">${esc(k.priceText)} <span style="font-size:11px;color:#64748B;font-weight:400">/bulan</span></div>
        <div style="font-size:11px;color:#64748B">📍 ${esc(k.distText)}</div>
      </div>
    </div>

    <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:14px;padding:12px;display:flex;flex-direction:column;gap:6px">
      <div style="display:flex;justify-content:space-between;font-size:12px">
        <span style="color:#64748B">Pilihan Kamar</span>
        <span style="font-weight:700;color:#008F83">Kamar ${esc(selectedRoom)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:12px">
        <span style="color:#64748B">Lama Ngekost</span>
        <span style="font-weight:700;color:#0F172A">${selectedBulan} Bulan</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:12px">
        <span style="color:#64748B">Total Biaya Sewa</span>
        <span style="font-weight:700;color:#008F83">Rp${(k.price * selectedBulan).toLocaleString('id-ID')}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:12px">
        <span style="color:#64748B">Periode</span>
        <span style="font-weight:600;color:#475569">Mulai 1 Nov 2026 (${selectedBulan} bln)</span>
      </div>
    </div>

    <div style="background:#FFF1DE;border-radius:12px;padding:10px 12px;font-size:12px;font-weight:600;color:#9A3412">
      ⏳ Menunggu persetujuan pemilik kos. Pengajuan sewa kost Anda telah tercatat di sistem.
    </div>

    <div style="display:flex;flex-direction:column;gap:8px;margin-top:4px">
      <a href="/status-sewa.html" id="btnLihatStatusSewa" class="modal-btn" style="text-decoration:none">
        Lihat Status Sewa &amp; Pinjam
      </a>
      <button id="btnTutupStatus" class="modal-btn outline" type="button">
        Kembali ke Cari Kos
      </button>
    </div>
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

// Event listener untuk tombol filter tipe kos (Semua, Putra, Putri, Campur)
function setupFilterListeners() {
  const tipeMap = {
    'chipSemua': 'semua',
    'chipPutra': 'putra',
    'chipPutri': 'putri',
    'chipCampur': 'campur'
  };

  Object.entries(tipeMap).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('click', () => loadKos(val));
    }
  });

  // Tipe chips dengan data attribute
  document.querySelectorAll('.chip-tipe[data-tipe], .chip-tipe[data-gender]').forEach(btn => {
    if (btn.id === 'chipDist' || btn.id === 'chipPrice' || btn.id === 'chipFilter') return;
    const t = (btn.dataset.tipe || btn.dataset.gender || '').trim().toLowerCase();
    if (t && !btn.id) {
      btn.addEventListener('click', () => loadKos(t));
    }
  });

  // Location selector interaction
  const locSelect = document.getElementById('locSelect');
  if (locSelect) {
    locSelect.addEventListener('click', () => {
      if (typeof Swal !== 'undefined') {
        Swal.fire({
          title: 'Area Kampus',
          text: 'Saat ini menampilkan kos di sekitar Institut Teknologi Garut (ITG).',
          icon: 'info',
          confirmButtonText: 'Oke, Mengerti',
          confirmButtonColor: '#008F83'
        });
      } else {
        alert('Menampilkan kos di sekitar Institut Teknologi Garut (ITG)');
      }
    });
  }

  // Handle owner role for navigation
  const userRole = localStorage.getItem('role') || localStorage.getItem('km_role');
  if (userRole === 'pemilik_kost') {
    const navTambah = document.getElementById('navTambah');
    if (navTambah) {
      navTambah.setAttribute('href', '/kos-owner.html?action=tambah-properti');
      navTambah.setAttribute('aria-label', 'Unggah Properti Kost');
    }
  }
}

// Search input
let searchTimer = null;
qKos?.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    loadKos();
  }, 250);
});

// Chips toggling jarak dan harga
chipDist?.addEventListener('click', () => {
  distLimit = distLimit === 2000 ? 5000 : 2000;
  if (distLimit === 2000) {
    chipDist.classList.add('active');
    chipDist.classList.remove('white');
    chipDist.style.backgroundColor = '#004D40';
    chipDist.style.color = '#FFFFFF';
  } else {
    chipDist.classList.remove('active');
    chipDist.classList.add('white');
    chipDist.style.backgroundColor = '#FFFFFF';
    chipDist.style.color = '#008F83';
  }
  renderKos();
});

chipPrice?.addEventListener('click', () => {
  priceLimit = priceLimit === 1000000 ? 2000000 : 1000000;
  if (priceLimit === 1000000) {
    chipPrice.classList.add('active');
    chipPrice.classList.remove('white');
    chipPrice.style.backgroundColor = '#004D40';
    chipPrice.style.color = '#FFFFFF';
  } else {
    chipPrice.classList.remove('active');
    chipPrice.classList.add('white');
    chipPrice.style.backgroundColor = '#FFFFFF';
    chipPrice.style.color = '#008F83';
  }
  renderKos();
});

chipFilter?.addEventListener('click', () => {
  location.href = '/filter-kos.html';
});

// Load filters from sessionStorage if set
const storedDist = sessionStorage.getItem('fk_dist');
if (storedDist) {
  distLimit = storedDist === 'all' ? 5000 : parseInt(storedDist, 10) * 1000;
  if (chipDist) {
    chipDist.textContent = 'Jarak ≤ ' + (storedDist === 'all' ? 'Semua' : storedDist + ' km');
    if (distLimit === 2000) {
      chipDist.classList.add('active');
      chipDist.classList.remove('white');
      chipDist.style.backgroundColor = '#004D40';
      chipDist.style.color = '#FFFFFF';
    }
  }
}

const storedMax = sessionStorage.getItem('fk_max');
if (storedMax) {
  const num = parseInt(storedMax.replace(/[^0-9]/g, ''), 10);
  if (!isNaN(num) && num > 0) {
    priceLimit = num;
    if (chipPrice) {
      chipPrice.textContent = '≤ ' + (num >= 1000000 ? (num/1000000) + ' jt/bln' : 'Rp' + num.toLocaleString('id-ID'));
      if (priceLimit <= 1000000) {
        chipPrice.classList.add('active');
        chipPrice.classList.remove('white');
        chipPrice.style.backgroundColor = '#004D40';
        chipPrice.style.color = '#FFFFFF';
      }
    }
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

// Inisialisasi awal halaman kos
function init() {
  setupFilterListeners();

  let initialTipe = 'semua';
  const urlParams = new URLSearchParams(window.location.search);
  const qTipe = urlParams.get('tipe') || urlParams.get('gender') || urlParams.get('kategori');
  if (qTipe) {
    initialTipe = qTipe.toLowerCase();
  } else {
    const storedGendersRaw = sessionStorage.getItem('fk_genders');
    if (storedGendersRaw) {
      try {
        const genders = JSON.parse(storedGendersRaw);
        if (Array.isArray(genders) && genders.length === 1) {
          initialTipe = genders[0].toLowerCase();
        }
      } catch (_e) {}
    }
  }

  const qParam = urlParams.get('q');
  if (qParam && qKos) {
    qKos.value = qParam;
  }

  // Back button: aturan eksplisit kos.html -> beranda.html
  document.getElementById('kosBackHome')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (typeof goBack === 'function') {
      goBack('/beranda.html', { forceFallback: true });
    } else {
      window.location.href = '/beranda.html';
    }
  });

  // Bottom nav Cari tab: cegah history loop dengan cari.html
  document.getElementById('navCari')?.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.replace('/cari.html');
  });

  // Android Back: dari kos.html kembali ke beranda.html
  window.history.pushState({ page: 'kos' }, '', window.location.href);
  window.addEventListener('popstate', () => {
    if (modalKos && modalKos.classList.contains('open')) {
      modalKos.classList.remove('open');
      window.history.pushState({ page: 'kos' }, '', window.location.href);
      return;
    }
    window.location.href = '/beranda.html';
  });

  loadKos(initialTipe);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
