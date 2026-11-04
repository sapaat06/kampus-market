function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Rumus Haversine: menghitung jarak antara dua pasang koordinat GPS (dalam meter)
function haversineDistance(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const nLat1 = Number(lat1);
  const nLon1 = Number(lon1);
  const nLat2 = Number(lat2);
  const nLon2 = Number(lon2);
  if (isNaN(nLat1) || isNaN(nLon1) || isNaN(nLat2) || isNaN(nLon2)) return null;

  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371000; // Radius rata-rata bumi dalam meter
  const dLat = toRad(nLat2 - nLat1);
  const dLon = toRad(nLon2 - nLon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(nLat1)) * Math.cos(toRad(nLat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// Format tampilan jarak secara dinamis:
// - Jarak < 1000m: satuan meter dibulatkan (contoh: "350 m · Fakultas Teknik")
// - Jarak >= 1000m: satuan km dengan 1 angka desimal (contoh: "1.4 km · Gedung Rektorat")
// - Lokasi belum diizinkan: "Jarak belum aktif · Nama Lokasi"
function formatDistanceText(meters, lokasiName) {
  const lokasi = lokasiName || 'Kampus ITG';
  if (meters == null || isNaN(meters)) {
    return `Jarak belum aktif · ${lokasi}`;
  }
  if (meters < 1000) {
    return `${Math.round(meters)} m · ${lokasi}`;
  }
  const km = (meters / 1000).toFixed(1);
  return `${km} km · ${lokasi}`;
}

// ==============================================================================
// CATATAN KEAMANAN & PROTOKOL DEV TUNNELS:
// Browser modern (Chrome, Edge, Safari, dll.) mewajibkan Secure Context (HTTPS)
// untuk mengakses API Geolocation (navigator.geolocation).
// Jika Anda menjalankan aplikasi melalui Visual Studio / VS Code Dev Tunnels
// atau jaringan remote, pastikan URL yang dibuka selalu berawalan "https://".
// Akses via HTTP biasa pada host remote akan diblokir otomatis oleh kebijakan browser.
// ==============================================================================

// Koordinat Fallback Pusat Kampus ITG (Tarogong Kidul, Garut)
const DEFAULT_CAMPUS_LAT = -7.2160;
const DEFAULT_CAMPUS_LNG = 107.9020;
const DEFAULT_CAMPUS_LOCATION = {
  lat: DEFAULT_CAMPUS_LAT,
  lng: DEFAULT_CAMPUS_LNG,
  name: 'Kampus ITG (Tarogong Kidul, Garut)',
  isFallback: true
};

// Geolocation state
let userLocation = null; // { lat, lng, name, isFallback }

// Cek apakah koordinat user sudah tersimpan sebelumnya di localStorage
const cachedLat = localStorage.getItem('userLat');
const cachedLng = localStorage.getItem('userLng');
const cachedIsFallback = localStorage.getItem('userLocIsFallback') === 'true';

if (cachedLat && cachedLng && !isNaN(Number(cachedLat)) && !isNaN(Number(cachedLng))) {
  userLocation = {
    lat: Number(cachedLat),
    lng: Number(cachedLng),
    name: cachedIsFallback ? DEFAULT_CAMPUS_LOCATION.name : 'Lokasi Terdeteksi (GPS)',
    isFallback: cachedIsFallback
  };
} else {
  // Tetapkan titik fallback pusat kampus secara otomatis agar jarak barang tidak null
  userLocation = { ...DEFAULT_CAMPUS_LOCATION };
}

// Pasang titik fallback lokasi kampus jika GPS tidak diizinkan / bermasalah
function terapkanFallbackLokasi() {
  userLocation = { ...DEFAULT_CAMPUS_LOCATION };
  localStorage.setItem('userLat', String(DEFAULT_CAMPUS_LAT));
  localStorage.setItem('userLng', String(DEFAULT_CAMPUS_LNG));
  localStorage.setItem('userLocIsFallback', 'true');

  const locBtn = document.getElementById('headerLocBtn');
  if (locBtn) {
    locBtn.classList.remove('active');
    locBtn.title = 'Titik acuan: Kampus ITG (Tarogong Kidul, Garut) · Klik untuk aktifkan GPS akurat';
  }

  recalculateDistances();
  render();
  updateFilterPreview();
  return userLocation;
}

// Popup interaktif SweetAlert2 saat izin lokasi ditolak / diblokir browser
function tampilkanPopupIzinLokasiSpesifik(err) {
  if (typeof Swal === 'undefined') {
    alert('Izin lokasi diperlukan. Menggunakan titik pusat area kampus default (Tarogong Kidul, Garut).');
    return;
  }

  // 1. Error PERMISSION_DENIED (Kode 1): User atau browser memblokir izin lokasi
  if (err && err.code === (err.PERMISSION_DENIED || 1)) {
    return Swal.fire({
      icon: 'warning',
      title: 'Akses Lokasi Dibatasi',
      html: `
        <div style="text-align: left; font-size: 13.5px; line-height: 1.6; color: #4B5563;">
          <p style="margin: 0 0 10px 0; color: #374151;">
            Browser Anda saat ini memblokir izin akses lokasi (GPS). Untuk mengaktifkannya kembali secara manual:
          </p>
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 12px 14px; margin-bottom: 12px;">
            <ol style="margin: 0; padding-left: 18px; color: #1E293B; font-size: 13px;">
              <li style="margin-bottom: 6px;">Klik ikon <strong>Gembok (🔒)</strong> atau <strong>Setelan Situs</strong> di sebelah kiri bilah URL browser.</li>
              <li style="margin-bottom: 6px;">Ubah izin <strong>Lokasi / Location</strong> menjadi <strong>Izinkan / Allow</strong>.</li>
              <li><strong>Muat ulang (refresh)</strong> halaman ini.</li>
            </ol>
          </div>
          <div style="background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 12px; padding: 10px 12px; color: #065F46; font-size: 12px; display: flex; align-items: flex-start; gap: 8px;">
            <span style="font-size: 15px; line-height: 1.2;">💡</span>
            <div>
              <strong>Fallback Aktif:</strong> Aplikasi otomatis beralih menggunakan titik pusat <strong>Kampus ITG (Tarogong Kidul, Garut)</strong> agar fitur filter dan jarak barang tetap dapat Anda gunakan.
            </div>
          </div>
        </div>
      `,
      confirmButtonText: 'Gunakan Lokasi Kampus',
      buttonsStyling: false,
      customClass: {
        popup: 'rounded-2xl shadow-xl border-0',
        title: 'text-xl font-bold text-gray-800',
        htmlContainer: 'text-gray-600 font-medium',
        confirmButton: 'bg-[#059669] text-white px-8 py-2.5 rounded-xl font-semibold hover:bg-emerald-700 transition-colors'
      }
    });
  }

  // 2. Error POSITION_UNAVAILABLE (Kode 2): Sinyal GPS tidak tersedia
  if (err && err.code === (err.POSITION_UNAVAILABLE || 2)) {
    return Swal.fire({
      icon: 'info',
      title: 'Sinyal GPS Tidak Ditemukan',
      html: `
        <div style="text-align: left; font-size: 13.5px; line-height: 1.6; color: #4B5563;">
          <p style="margin: 0 0 10px 0;">
            Informasi lokasi saat ini tidak dapat diperoleh dari perangkat Anda. Pastikan layanan GPS di perangkat Anda aktif.
          </p>
          <div style="background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 12px; padding: 10px 12px; color: #065F46; font-size: 12px;">
            💡 Titik pusat <strong>Kampus ITG (Tarogong Kidul, Garut)</strong> digunakan sebagai acuan pencarian barang.
          </div>
        </div>
      `,
      confirmButtonText: 'Lanjutkan',
      buttonsStyling: false,
      customClass: {
        popup: 'rounded-2xl shadow-xl border-0',
        title: 'text-xl font-bold text-gray-800',
        htmlContainer: 'text-gray-600 font-medium',
        confirmButton: 'bg-[#059669] text-white px-8 py-2.5 rounded-xl font-semibold hover:bg-emerald-700 transition-colors'
      }
    });
  }

  // 3. Error TIMEOUT (Kode 3): Waktu permintaan lokasi habis
  if (err && err.code === (err.TIMEOUT || 3)) {
    return Swal.fire({
      icon: 'info',
      title: 'Waktu Permintaan GPS Habis',
      html: `
        <div style="text-align: left; font-size: 13.5px; line-height: 1.6; color: #4B5563;">
          <p style="margin: 0 0 10px 0;">
            Permintaan lokasi memakan waktu terlalu lama. Kami telah mengalihkan acuan ke titik pusat <strong>Kampus ITG Garut</strong>.
          </p>
          <div style="background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 12px; padding: 10px 12px; color: #065F46; font-size: 12px;">
            💡 Anda tetap dapat menyaring dan melihat barang terdekat di sekitar area kampus.
          </div>
        </div>
      `,
      confirmButtonText: 'Lanjutkan',
      buttonsStyling: false,
      customClass: {
        popup: 'rounded-2xl shadow-xl border-0',
        title: 'text-xl font-bold text-gray-800',
        htmlContainer: 'text-gray-600 font-medium',
        confirmButton: 'bg-[#059669] text-white px-8 py-2.5 rounded-xl font-semibold hover:bg-emerald-700 transition-colors'
      }
    });
  }

  // Default error lainnya
  const pesan = (err && err.message) || 'Terjadi kendala saat membaca lokasi. Titik kampus default tetap digunakan.';
  return Swal.fire({
    icon: 'info',
    title: 'Informasi Lokasi',
    text: pesan,
    confirmButtonText: 'Mengerti',
    buttonsStyling: false,
    customClass: {
      popup: 'rounded-2xl shadow-xl border-0',
      title: 'text-xl font-bold text-gray-800',
      htmlContainer: 'text-gray-600 font-medium',
      confirmButton: 'bg-[#059669] text-white px-8 py-2.5 rounded-xl font-semibold hover:bg-emerald-700 transition-colors'
    }
  });
}

// Popup jika Dev Tunnels diakses menggunakan HTTP non-secure
function tampilkanPopupDevTunnelsHttps() {
  if (typeof Swal === 'undefined') {
    alert('Dev Tunnels mewajibkan HTTPS (https://) agar fitur Geolocation dapat diakses oleh browser.');
    return;
  }

  return Swal.fire({
    icon: 'info',
    title: 'Gunakan Protokol HTTPS',
    html: `
      <div style="text-align: left; font-size: 13.5px; line-height: 1.6; color: #4B5563;">
        <p style="margin: 0 0 10px 0;">
          Aplikasi diakses melalui <strong>Dev Tunnels / Jaringan Remote</strong> dengan protokol <code>http://</code>.
        </p>
        <div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: 12px; padding: 12px 14px; margin-bottom: 12px; color: #991B1B; font-size: 12.5px;">
          Browser modern memblokir API Geolocation (GPS) pada koneksi non-HTTPS. Harap buka URL Dev Tunnels menggunakan awalan <strong>https://</strong>.
        </div>
        <div style="background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 12px; padding: 10px 12px; color: #065F46; font-size: 12px;">
          💡 Titik pusat <strong>Kampus ITG Garut (Tarogong Kidul)</strong> tetap aktif sebagai acuan fallback default.
        </div>
      </div>
    `,
    confirmButtonText: 'Gunakan Titik Kampus',
    buttonsStyling: false,
    customClass: {
      popup: 'rounded-2xl shadow-xl border-0',
      title: 'text-xl font-bold text-gray-800',
      htmlContainer: 'text-gray-600 font-medium',
      confirmButton: 'bg-[#059669] text-white px-8 py-2.5 rounded-xl font-semibold hover:bg-emerald-700 transition-colors'
    }
  });
}

// Popup jika browser tidak mendukung fitur Geolocation
function tampilkanPopupBrowserTidakMendukung() {
  if (typeof Swal === 'undefined') {
    alert('Browser tidak mendukung Geolocation. Menggunakan lokasi default kampus.');
    return;
  }
  return Swal.fire({
    icon: 'info',
    title: 'Geolocation Tidak Didukung',
    html: `
      <div style="text-align: left; font-size: 13.5px; line-height: 1.6; color: #4B5563;">
        <p style="margin: 0 0 10px 0;">
          Browser atau perangkat kamu tidak mendukung fitur Geolocation.
        </p>
        <div style="background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 12px; padding: 10px 12px; color: #065F46; font-size: 12px;">
          💡 Titik pusat <strong>Kampus ITG Garut (Tarogong Kidul)</strong> tetap aktif sebagai acuan fallback default.
        </div>
      </div>
    `,
    confirmButtonText: 'Mengerti',
    buttonsStyling: false,
    customClass: {
      popup: 'rounded-2xl shadow-xl border-0',
      title: 'text-xl font-bold text-gray-800',
      htmlContainer: 'text-gray-600 font-medium',
      confirmButton: 'bg-[#059669] text-white px-8 py-2.5 rounded-xl font-semibold hover:bg-emerald-700 transition-colors'
    }
  });
}

// Flag untuk mencegah duplikasi pemanggilan GPS dan popup berulang
let isLocPending = false;
let hasPromptedLocation = false;

// Request GPS location dari browser dengan fallback kampus otomatis (Non-blocking & Ringan)
function requestUserLocation(showPopupOnFail = true) {
  if (isLocPending) {
    // Jika proses deteksi lokasi sedang berjalan di background, jangan buat panggilan tumpang tindih
    return Promise.resolve(userLocation);
  }

  return new Promise((resolve) => {
    // 1. Cek keamanan protokol (Dev Tunnels / Remote Context)
    // Geolocation API mewajibkan Secure Context (HTTPS). Browser memblokir jika via HTTP pada origin remote.
    const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    const isSecure = window.isSecureContext || window.location.protocol === 'https:' || isLocalhost;

    if (!isSecure) {
      console.warn('Geolocation diblokir karena halaman dibuka melalui HTTP non-localhost. Gunakan HTTPS untuk Dev Tunnels.');
      const fallback = terapkanFallbackLokasi();
      if (showPopupOnFail) {
        tampilkanPopupDevTunnelsHttps();
      }
      resolve(fallback);
      return;
    }

    // 2. Cek ketersediaan API Geolocation pada browser
    if (!navigator.geolocation) {
      console.warn('Geolocation tidak didukung oleh browser ini.');
      const fallback = terapkanFallbackLokasi();
      if (showPopupOnFail) {
        tampilkanPopupBrowserTidakMendukung();
      }
      resolve(fallback);
      return;
    }

    // 3. Panggil API Geolocation dengan opsi ringan agar tidak memicu freeze/lag pada CPU perangkat
    isLocPending = true;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        isLocPending = false;
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        userLocation = {
          lat: lat,
          lng: lng,
          name: 'Lokasi Anda (GPS Aktif)',
          isFallback: false
        };

        localStorage.setItem('userLat', String(lat));
        localStorage.setItem('userLng', String(lng));
        localStorage.setItem('userLocIsFallback', 'false');

        const locBtn = document.getElementById('headerLocBtn');
        if (locBtn) {
          locBtn.classList.add('active');
          locBtn.title = `GPS Aktif: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        }

        recalculateDistances();
        render();
        updateFilterPreview();

        if (showPopupOnFail && window.KM && KM.ui) {
          KM.ui.toast('Lokasi kamu berhasil diperbarui');
        }
        resolve(userLocation);
      },
      (err) => {
        isLocPending = false;
        console.warn('Geolocation error:', err.code, err.message);
        // Selalu terapkan fallback lokasi area kampus agar aplikasi tidak mandek
        const fallback = terapkanFallbackLokasi();

        if (showPopupOnFail) {
          tampilkanPopupIzinLokasiSpesifik(err);
        }
        resolve(fallback);
      },
      {
        enableHighAccuracy: false, // Jauh lebih cepat (<100ms) tanpa membebani browser/hardware GPS
        timeout: 4000,             // Maksimal 4 detik agar tidak menggantung UI
        maximumAge: 120000         // Gunakan cache lokasi 2 menit jika ada
      }
    );
  });
}

// Pantau perubahan izin lokasi browser secara dinamis jika didukung (misal user mengubah izin via ikon gembok)
if (typeof navigator !== 'undefined' && navigator.permissions && navigator.permissions.query) {
  try {
    navigator.permissions.query({ name: 'geolocation' }).then((status) => {
      status.onchange = () => {
        if (status.state === 'granted') {
          // Ketika user mengubah izin gembok menjadi "Izinkan", perbarui GPS secara senyap
          requestUserLocation(false);
        }
      };
    });
  } catch (_e) {
    // Abaikan jika browser tidak mendukung permissions.query geolocation
  }
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

// Initial sample items dengan koordinat nyata sekitar kampus ITG Garut (-7.2160, 107.9020)
let data = [
  {
    id: 'kalk-1',
    badge: 'Sewa',
    title: 'Kalkulator Casio fx-991ID Plus',
    kondisi: 'baik',
    price: 'Rp5.000/hari',
    priceNum: 5000,
    latitude: -7.2145,
    longitude: 107.9015,
    lokasi: 'Fakultas Teknik',
    dist: null,
    distText: 'Jarak belum aktif · Fakultas Teknik',
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
    latitude: -7.2200,
    longitude: 107.9050,
    lokasi: 'Gedung Rektorat',
    dist: null,
    distText: 'Jarak belum aktif · Gedung Rektorat',
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
    latitude: -7.2280,
    longitude: 107.9090,
    lokasi: 'Gerbang kampus',
    dist: null,
    distText: 'Jarak belum aktif · Gerbang kampus',
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
    latitude: -7.2155,
    longitude: 107.9025,
    lokasi: 'Perpustakaan',
    dist: null,
    distText: 'Jarak belum aktif · Perpustakaan',
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
    latitude: -7.2130,
    longitude: 107.9035,
    lokasi: 'Kantin Teknik',
    dist: null,
    distText: 'Jarak belum aktif · Kantin Teknik',
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
    latitude: -7.2120,
    longitude: 107.9010,
    lokasi: 'Lab Kimia',
    dist: null,
    distText: 'Jarak belum aktif · Lab Kimia',
    img: 'mint',
    campus: 'teknik',
    verified: true
  }
];

// Recalculate distance for all items based on current userLocation
function recalculateDistances() {
  data.forEach((item) => {
    const itemLat = item.latitude ?? item.lokasi_lat;
    const itemLng = item.longitude ?? item.lokasi_lng;
    const lokasiName = item.lokasi || item.campus || 'Kampus ITG';

    if (userLocation && itemLat != null && itemLng != null) {
      const meters = haversineDistance(userLocation.lat, userLocation.lng, itemLat, itemLng);
      item.dist = meters;
      item.distText = formatDistanceText(meters, lokasiName);
    } else {
      item.dist = null;
      item.distText = formatDistanceText(null, lokasiName);
    }
  });
}

// Asynchronously load real items from backend database
async function syncFromApi() {
  try {
    const queryParams = new URLSearchParams();
    if (userLocation) {
      queryParams.set('lat', String(userLocation.lat));
      queryParams.set('lng', String(userLocation.lng));
    }
    const url = `/barang${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const items = await KM.get(url);

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

        const itemLat = b.latitude ?? b.lokasi_lat ?? (-7.2160 + (idx * 0.0012));
        const itemLng = b.longitude ?? b.lokasi_lng ?? (107.9020 + (idx * 0.0012));
        const lokasiName = b.lokasi || 'Kampus ITG Garut';

        let dist = null;
        let distText = formatDistanceText(null, lokasiName);
        if (userLocation) {
          dist = haversineDistance(userLocation.lat, userLocation.lng, itemLat, itemLng);
          distText = formatDistanceText(dist, lokasiName);
        }

        return {
          id: b.id_barang,
          badge: badge,
          title: b.nama_barang,
          deskripsi: b.deskripsi,
          kategori: b.nama_kategori,
          id_kategori: b.id_kategori,
          kategori_lain: b.kategori_lain,
          kondisi: (b.kondisi || 'baik').toLowerCase(),
          price: priceStr,
          priceNum: priceNum,
          latitude: itemLat,
          longitude: itemLng,
          lokasi: lokasiName,
          dist: dist,
          distText: distText,
          img: colors[idx % colors.length],
          foto: (typeof KM !== 'undefined' && KM.getFoto ? KM.getFoto(b.foto) : b.foto) || null,
          campus: lokasiName,
          verified: true
        };
      });

      data = [...data.filter(d => !dbMapped.some(m => m.id === d.id)), ...dbMapped];
      recalculateDistances();
      updateFilterPreview();
      render();
    }
  } catch (_e) {
    // If backend is unreachable, fallback demo data is already displayed
    KM.ui.toast('Server tidak terjangkau, menampilkan data contoh', 'error');
  }
}

// Current filter state (default: tanpa filter aktif)
let sortMode = 'near';
let filterActive = false;
let selectedMode = 'all';
let minPriceVal = 0;
let maxPriceVal = 0;
let maxDistVal = 0;
let selectedCond = 'all';
let selectedKategori = '';

// DOM Elements
const q = document.getElementById('q');
const clearBtn = document.getElementById('clearBtn');
const list = document.getElementById('list');
const countText = document.getElementById('countText');
const filterModal = document.getElementById('filterModal');
const filterChip = document.getElementById('filterChip');
const filterResetBtn = document.getElementById('filterResetBtn');
const filterApplyBtn = document.getElementById('filterApplyBtn');
const filterMinPrice = document.getElementById('filterMinPrice');
const filterMaxPrice = document.getElementById('filterMaxPrice');
const filterKategori = document.getElementById('filterKategori');
const filterLokasi = document.getElementById('filterLokasi');
const filterSort = document.getElementById('filterSort');
const filterModeChips = document.getElementById('filterModeChips');
const filterDistChips = document.getElementById('filterDistChips');
const filterCondChips = document.getElementById('filterCondChips');
const chipCat = document.getElementById('chipCat');
const chipPrice = document.getElementById('chipPrice');
const chipDist = document.getElementById('chipDist');
const chipMode = document.getElementById('chipMode');
const chipCond = document.getElementById('chipCond');
const sortBtn = document.getElementById('sortBtn');
const sortLabel = document.getElementById('sortLabel');
const headerLocBtn = document.getElementById('headerLocBtn');

// Dual-Thumb Range Slider (NOMOR 5)
let priceSlider = null;
const priceRangeContainer = document.getElementById('priceRangeContainer');
const priceRangeHighlight = document.getElementById('priceRangeHighlight');
const priceThumbLeft = document.getElementById('priceThumbLeft');
const priceThumbRight = document.getElementById('priceThumbRight');

const initSlider = window.createRangeSlider || (window.KM && window.KM.createRangeSlider);
if (typeof initSlider === 'function' && priceRangeContainer && priceRangeHighlight && priceThumbLeft && priceThumbRight) {
  priceSlider = initSlider({
    container: priceRangeContainer,
    highlight: priceRangeHighlight,
    thumbLeft: priceThumbLeft,
    thumbRight: priceThumbRight,
    inputMin: filterMinPrice,
    inputMax: filterMaxPrice,
    min: 0,
    max: 1000000,
    step: 5000,
    onChange: () => {
      updateFilterPreview();
    }
  });
}

function formatKm(meters) {
  if (meters >= 1000) {
    const km = (meters / 1000).toFixed(meters % 1000 === 0 ? 0 : 1);
    return km + ' km';
  }
  return meters + ' m';
}

function parseRupiah(str) {
  if (typeof str === 'number') return str;
  if (!str) return 0;
  const num = parseInt(String(str).replace(/[^\d]/g, ''), 10);
  return isNaN(num) ? 0 : num;
}

function getActiveMode() {
  const active = document.querySelector('#filterModeChips .f-pill-opt.active');
  return active?.dataset.mode || 'all';
}

function getActiveDist() {
  const active = document.querySelector('#filterDistChips .f-pill-opt.active');
  const d = active?.dataset.dist;
  if (d === '1') return 1000;
  if (d === '2') return 2000;
  if (d === '5') return 5000;
  return 0; // all
}

function getActiveCond() {
  const active = document.querySelector('#filterCondChips .f-pill-opt.active');
  return active?.dataset.cond || 'all';
}

function hasActiveFilters() {
  return (minPriceVal > 0) ||
         (maxPriceVal > 0) ||
         (maxDistVal > 0) ||
         (selectedMode && selectedMode !== 'all' && selectedMode !== 'semua') ||
         (selectedCond && selectedCond !== 'all' && selectedCond !== 'semua') ||
         (selectedKategori && selectedKategori !== '' && selectedKategori !== 'all');
}

function updateFilterChips() {
  // Category chip
  if (chipCat) {
    if (selectedKategori && selectedKategori !== '' && selectedKategori !== 'all') {
      const catLabel = selectedKategori.toLowerCase() === 'lainnya'
        ? 'Lainnya'
        : (filterKategori?.options?.[filterKategori.selectedIndex]?.text || selectedKategori);
      chipCat.innerHTML = `${catLabel} <span class="chip-close" aria-label="Hapus filter kategori" role="button">&times;</span>`;
      chipCat.style.display = 'inline-flex';
      chipCat.classList.add('active');
    } else {
      chipCat.style.display = 'none';
      chipCat.classList.remove('active');
      chipCat.innerHTML = '';
    }
  }

  // Price chip
  if (chipPrice) {
    if (minPriceVal > 0 && maxPriceVal > 0) {
      chipPrice.innerHTML = `Rp${minPriceVal.toLocaleString('id-ID')} - Rp${maxPriceVal.toLocaleString('id-ID')} <span class="chip-close" aria-label="Hapus filter harga" role="button">&times;</span>`;
      chipPrice.style.display = 'inline-flex';
      chipPrice.classList.add('active');
    } else if (maxPriceVal > 0) {
      chipPrice.innerHTML = `≤ Rp${maxPriceVal.toLocaleString('id-ID')} <span class="chip-close" aria-label="Hapus filter harga" role="button">&times;</span>`;
      chipPrice.style.display = 'inline-flex';
      chipPrice.classList.add('active');
    } else if (minPriceVal > 0) {
      chipPrice.innerHTML = `≥ Rp${minPriceVal.toLocaleString('id-ID')} <span class="chip-close" aria-label="Hapus filter harga" role="button">&times;</span>`;
      chipPrice.style.display = 'inline-flex';
      chipPrice.classList.add('active');
    } else {
      chipPrice.style.display = 'none';
      chipPrice.classList.remove('active');
      chipPrice.innerHTML = '';
    }
  }

  // Distance chip
  if (chipDist) {
    if (maxDistVal > 0) {
      chipDist.innerHTML = `≤ ${formatKm(maxDistVal)} <span class="chip-close" aria-label="Hapus filter jarak" role="button">&times;</span>`;
      chipDist.style.display = 'inline-flex';
      chipDist.classList.add('active');
    } else {
      chipDist.style.display = 'none';
      chipDist.classList.remove('active');
      chipDist.innerHTML = '';
    }
  }

  // Mode chip
  if (chipMode) {
    if (selectedMode && selectedMode !== 'all' && selectedMode !== 'semua') {
      const modeLabel = selectedMode === 'pinjam' ? 'Pinjam Free' : (selectedMode.charAt(0).toUpperCase() + selectedMode.slice(1));
      chipMode.innerHTML = `${modeLabel} <span class="chip-close" aria-label="Hapus filter mode" role="button">&times;</span>`;
      chipMode.style.display = 'inline-flex';
      chipMode.classList.add('active');
    } else {
      chipMode.style.display = 'none';
      chipMode.classList.remove('active');
      chipMode.innerHTML = '';
    }
  }

  // Condition chip
  if (chipCond) {
    if (selectedCond && selectedCond !== 'all' && selectedCond !== 'semua') {
      const condLabel = selectedCond === 'baru' ? 'Seperti baru' : 'Kondisi: Baik';
      chipCond.innerHTML = `${condLabel} <span class="chip-close" aria-label="Hapus filter kondisi" role="button">&times;</span>`;
      chipCond.style.display = 'inline-flex';
      chipCond.classList.add('active');
    } else {
      chipCond.style.display = 'none';
      chipCond.classList.remove('active');
      chipCond.innerHTML = '';
    }
  }
}

function resetFilters() {
  selectedMode = 'all';
  minPriceVal = 0;
  maxPriceVal = 0;
  maxDistVal = 0;
  selectedCond = 'all';
  selectedKategori = '';
  filterActive = false;

  if (filterMinPrice) filterMinPrice.value = '';
  if (filterMaxPrice) filterMaxPrice.value = '';
  if (filterKategori) filterKategori.value = '';
  if (priceSlider) priceSlider.reset();
  document.querySelectorAll('#filterModeChips .f-pill-opt').forEach(c => {
    c.classList.toggle('active', c.dataset.mode === 'all');
  });
  document.querySelectorAll('#filterDistChips .f-pill-opt').forEach(c => {
    c.classList.toggle('active', c.dataset.dist === 'all');
  });
  document.querySelectorAll('#filterCondChips .f-pill-opt').forEach(c => {
    c.classList.toggle('active', c.dataset.cond === 'all');
  });

  updateFilterChips();
  updateFilterPreview();
  render();
}
window.resetFilters = resetFilters;

// Check which items match the filter state
function getFilteredItems(tempMode = selectedMode, tempMinPrice = minPriceVal, tempMaxPrice = maxPriceVal, tempDist = maxDistVal, tempCond = selectedCond, tempCat = selectedKategori) {
  let term = '';
  try {
    term = (q?.value || '').trim().toLowerCase();
  } catch (_e) {
    term = '';
  }

  return data.filter(d => {
    // Search text match (aman terhadap karakter khusus, emoji, kutip, tag html)
    try {
      const title = String(d.title || '').toLowerCase();
      const desc = String(d.deskripsi || '').toLowerCase();
      const katLain = String(d.kategori_lain || '').toLowerCase();
      const matchText = !term || title.includes(term) || desc.includes(term) || katLain.includes(term);
      if (!matchText) return false;
    } catch (_e) {
      return false;
    }

    // Category match
    if (tempCat && tempCat !== '' && tempCat !== 'all' && tempCat !== 'semua') {
      const catLower = String(tempCat).toLowerCase();
      if (catLower === 'lainnya') {
        const isItemLain = Boolean(d.kategori_lain) || String(d.id_kategori) === 'lainnya' || String(d.kategori || '').toLowerCase() === 'lainnya';
        if (!isItemLain) return false;
      } else {
        const matchesCat = String(d.id_kategori) === String(tempCat) || String(d.kategori || '').toLowerCase() === catLower;
        if (!matchesCat) return false;
      }
    }

    // Mode match
    if (tempMode && tempMode !== 'semua' && tempMode !== 'all') {
      const modeLower = String(tempMode).toLowerCase();
      const badgeLower = String(d.badge || '').toLowerCase();
      if (modeLower === 'pinjam') {
        if (!badgeLower.includes('pinjam') && !badgeLower.includes('free')) return false;
      } else if (badgeLower !== modeLower) {
        return false;
      }
    }

    // Min & Max Price match
    const price = Number(d.priceNum ?? 0);
    if (tempMinPrice > 0 && price < tempMinPrice) {
      return false;
    }
    if (tempMaxPrice > 0 && price > tempMaxPrice) {
      return false;
    }

    // Distance match
    if (tempDist > 0 && userLocation) {
      if (d.dist == null || d.dist > tempDist) {
        return false;
      }
    }

    // Condition match
    if (tempCond && tempCond !== 'semua' && tempCond !== 'all') {
      if (String(d.kondisi || '').toLowerCase() !== String(tempCond).toLowerCase()) {
        return false;
      }
    }

    return true;
  });
}

// Update the count shown on "Terapkan (X barang)" button in real-time
function updateFilterPreview() {
  const currentMode = getActiveMode();
  const currentCond = getActiveCond();
  const currentMinPrice = parseRupiah(filterMinPrice?.value);
  const currentMaxPrice = parseRupiah(filterMaxPrice?.value);
  const currentDist = getActiveDist();
  const currentCat = filterKategori?.value || '';

  const matches = getFilteredItems(currentMode, currentMinPrice, currentMaxPrice, currentDist, currentCond, currentCat);
  if (filterApplyBtn) {
    filterApplyBtn.textContent = `Terapkan (${matches.length} barang)`;
  }
}

// Render filtered cards into list
function render() {
  let items = filterActive ? getFilteredItems() : data.filter(d => {
    const term = (q?.value || '').trim().toLowerCase();
    if (!term) return true;
    const title = String(d.title || '').toLowerCase();
    const desc = String(d.deskripsi || '').toLowerCase();
    const katLain = String(d.kategori_lain || '').toLowerCase();
    return title.includes(term) || desc.includes(term) || katLain.includes(term);
  });

  // Sorting
  if (sortMode === 'near') {
    if (userLocation) {
      // Urutkan dari jarak meter terdekat ke terjauh
      items.sort((a, b) => {
        if (a.dist == null && b.dist == null) return 0;
        if (a.dist == null) return 1;
        if (b.dist == null) return -1;
        return a.dist - b.dist;
      });
    }
  } else if (sortMode === 'cheap') {
    items.sort((a, b) => a.priceNum - b.priceNum);
  } else {
    items = items.slice().reverse();
  }

  if (countText) {
    countText.textContent = `${items.length} barang ditemukan`;
  }

  if (items.length === 0) {
    const showReset = typeof hasActiveFilters === 'function' && hasActiveFilters();
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        </div>
        <div class="empty-state-title">Barang tidak ditemukan</div>
        <div class="empty-state-desc">Coba ubah kata kunci atau longgarkan filter pencarianmu.</div>
        ${showReset ? `<button type="button" class="empty-state-btn" id="resetFilterEmptyBtn">Atur ulang filter</button>` : ''}
      </div>`;
    if (showReset) {
      document.getElementById('resetFilterEmptyBtn')?.addEventListener('click', () => {
        if (typeof resetFilters === 'function') resetFilters();
      });
    }
    return;
  }

  let html = items.map(d => {
    const katDisplay = d.kategori_lain || (d.kategori && d.kategori.toLowerCase() !== 'lainnya' ? d.kategori : '');
    return `
    <div class="horizontal-item-card result-card" data-id="${d.id}" data-mode="${escHtml(d.badge.toLowerCase())}" role="button" tabindex="0" aria-label="${escHtml(d.title)}, ${escHtml(d.badge)}, ${escHtml(d.price)}">
      <div class="card-left-thumb ${escHtml(d.img)}">
        ${d.foto && !d.foto.includes('AARCAAEAAEDASIAAhEBAxEB') ? `<img src="${escHtml(d.foto)}" alt="${escHtml(d.title)}" loading="lazy">` : (d.svg || getSvg(d.title))}
      </div>
      <div class="card-right-info">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;">
          <span class="badge-tag-sm ${escHtml(d.badge.toLowerCase())}">${escHtml(d.badge)}</span>
          ${katDisplay ? `<span class="badge-tag-sm" style="background:#F1F5F9;color:#475569;font-weight:600;font-size:10px;padding:2px 8px;border-radius:10px;">${escHtml(katDisplay)}</span>` : ''}
        </div>
        <div class="card-title-text">${escHtml(d.title)}</div>
        <div class="card-price-text ${d.badge.toLowerCase() === 'sewa' ? 'orange' : ''}">${escHtml(d.price)}</div>
        <div class="card-location-row">
          <svg viewBox="0 0 24 24"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/><circle cx="12" cy="10" r="3"/></svg>
          <span>${escHtml(d.distText)}</span>
        </div>
      </div>
    </div>
  `;
  }).join('');

  html += `
    <div class="community-banner">
      <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
      <p>Semua barang berasal dari mahasiswa di komunitas kampus terverifikasi.</p>
    </div>`;

  list.innerHTML = html;

  list.querySelectorAll('.result-card').forEach(card => {
    const bukaDetail = () => {
      const id = card.dataset.id || '1';
      const mode = card.dataset.mode || 'sewa';
      window.location.href = `/detail.html?id=${id}&mode=${mode}`;
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
  // Indikator ikon lokasi di header
  if (userLocation && !userLocation.isFallback && headerLocBtn) {
    headerLocBtn.classList.add('active');
    headerLocBtn.title = 'Lokasi GPS Akurat Aktif';
  } else if (headerLocBtn) {
    headerLocBtn.classList.remove('active');
    headerLocBtn.title = 'Titik acuan: Kampus ITG (Tarogong Kidul, Garut) · Klik untuk aktifkan GPS akurat';
  }

  // 1. Tombol Pin Lokasi di Header
  if (headerLocBtn) {
    headerLocBtn.addEventListener('click', () => {
      // User secara sadar mengeklik pin lokasi -> jalankan deteksi GPS
      requestUserLocation(true);
    });
  }

  // Individual active chip click handlers: hapus filter satu per satu
  chipPrice?.addEventListener('click', () => {
    minPriceVal = 0;
    maxPriceVal = 0;
    if (filterMinPrice) filterMinPrice.value = '';
    if (filterMaxPrice) filterMaxPrice.value = '';
    if (priceSlider) priceSlider.reset();
    filterActive = hasActiveFilters();
    updateFilterChips();
    updateFilterPreview();
    render();
  });

  chipDist?.addEventListener('click', () => {
    maxDistVal = 0;
    document.querySelectorAll('#filterDistChips .f-pill-opt').forEach(c => {
      c.classList.toggle('active', c.dataset.dist === 'all');
    });
    filterActive = hasActiveFilters();
    updateFilterChips();
    updateFilterPreview();
    render();
  });

  chipMode?.addEventListener('click', () => {
    selectedMode = 'all';
    document.querySelectorAll('#filterModeChips .f-pill-opt').forEach(c => {
      c.classList.toggle('active', c.dataset.mode === 'all');
    });
    filterActive = hasActiveFilters();
    updateFilterChips();
    updateFilterPreview();
    render();
  });

  chipCond?.addEventListener('click', () => {
    selectedCond = 'all';
    document.querySelectorAll('#filterCondChips .f-pill-opt').forEach(c => {
      c.classList.toggle('active', c.dataset.cond === 'all');
    });
    filterActive = hasActiveFilters();
    updateFilterChips();
    updateFilterPreview();
    render();
  });

  // 3. Tombol Sort (Terdekat, Termurah, Terbaru) - Respon Instan (0ms delay)
  const sortOptions = [
    { val: 'near', label: 'Terdekat' },
    { val: 'cheap', label: 'Termurah' },
    { val: 'new', label: 'Terbaru' }
  ];
  let sortIdx = 0;
  sortBtn?.addEventListener('click', () => {
    sortIdx = (sortIdx + 1) % sortOptions.length;
    sortMode = sortOptions[sortIdx].val;
    if (sortLabel) sortLabel.textContent = sortOptions[sortIdx].label;
    if (filterSort) filterSort.value = sortOptions[sortIdx].label;

    if (!userLocation) {
      terapkanFallbackLokasi();
    }

    // Render urutan langsung secara instan
    render();

    // Jika user memilih sorting Terdekat dan belum ada GPS aktual, minta di background
    if (sortMode === 'near' && userLocation && userLocation.isFallback && !hasPromptedLocation) {
      hasPromptedLocation = true;
      requestUserLocation(true);
    }
  });

  // Search Input dengan Debounce 120ms agar pengetikan mulus tanpa lag
  if (q) {
    let searchDebounceTimer = null;
    const handleSearchInput = () => {
      if (clearBtn) clearBtn.style.display = (q.value || '').trim() ? 'flex' : 'none';
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
        render();
        updateFilterPreview();
      }, 120);
    };

    q.addEventListener('input', handleSearchInput);
    q.addEventListener('search', () => {
      if (clearBtn) clearBtn.style.display = (q.value || '').trim() ? 'flex' : 'none';
      render();
      updateFilterPreview();
    });
    q.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        render();
        updateFilterPreview();
      }
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

  // Open & Close modal
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
  document.getElementById('closeFilterBtn')?.addEventListener('click', closeModal);

  // Close modal on backdrop click or Escape
  filterModal?.addEventListener('click', (e) => {
    if (e.target === filterModal) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  // Mode chips in modal
  document.querySelectorAll('#filterModeChips .f-pill-opt').forEach(chip => {
    chip.addEventListener('click', function() {
      chip.parentElement.querySelectorAll('.f-pill-opt').forEach(c => c.classList.remove('active'));
      this.classList.add('active');
      updateFilterPreview();
    });
  });

  // Distance chips in modal - Respon instan tanpa lag
  document.querySelectorAll('#filterDistChips .f-pill-opt').forEach(chip => {
    chip.addEventListener('click', function() {
      chip.parentElement.querySelectorAll('.f-pill-opt').forEach(c => c.classList.remove('active'));
      this.classList.add('active');
      updateFilterPreview();
    });
  });

  // Condition chips in modal
  document.querySelectorAll('#filterCondChips .f-pill-opt').forEach(chip => {
    chip.addEventListener('click', function() {
      chip.parentElement.querySelectorAll('.f-pill-opt').forEach(c => c.classList.remove('active'));
      this.classList.add('active');
      updateFilterPreview();
    });
  });

  // Input price listeners
  filterMinPrice?.addEventListener('input', updateFilterPreview);
  filterMaxPrice?.addEventListener('input', updateFilterPreview);
  filterKategori?.addEventListener('change', updateFilterPreview);

  // Category chip remove listener
  chipCat?.addEventListener('click', (e) => {
    if (e.target && e.target.classList.contains('chip-close')) {
      selectedKategori = '';
      if (filterKategori) filterKategori.value = '';
      filterActive = hasActiveFilters();
      updateFilterChips();
      render();
    }
  });

  // Reset button in modal
  filterResetBtn?.addEventListener('click', () => {
    resetFilters();
    closeModal();
  });

  // Apply button in modal - Respon instan
  filterApplyBtn?.addEventListener('click', () => {
    selectedMode = getActiveMode();
    selectedCond = getActiveCond();
    selectedKategori = filterKategori?.value || '';
    minPriceVal = parseRupiah(filterMinPrice?.value);
    maxPriceVal = parseRupiah(filterMaxPrice?.value);
    maxDistVal = getActiveDist();
    filterActive = hasActiveFilters();

    updateFilterChips();
    render();
    closeModal();

    // Minta GPS di background jika filter jarak aktif dan belum pernah ditanyakan
    if (maxDistVal > 0 && userLocation && userLocation.isFallback && !hasPromptedLocation) {
      hasPromptedLocation = true;
      requestUserLocation(true);
    }
  });

  // Check URL query parameters
  const urlParams = new URLSearchParams(window.location.search);
  const qParam = urlParams.get('q');
  if (qParam && q) {
    q.value = qParam;
    if (clearBtn) clearBtn.style.display = 'flex';
  }

  const katParam = urlParams.get('kategori');
  if (katParam) {
    selectedKategori = katParam;
    if (filterKategori) filterKategori.value = katParam;
    filterActive = true;
  }

  const filterParam = urlParams.get('filter');
  if (filterParam === 'open' || filterParam === '1') {
    openModal();
  }

  // Back button: aturan eksplisit cari.html -> beranda.html
  document.getElementById('backBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (typeof goBack === 'function') {
      goBack('/beranda.html', { forceFallback: true });
    } else {
      window.location.href = '/beranda.html';
    }
  });

  // Android Back: hindari loop antara Cari dan Cari Kos
  window.history.pushState({ page: 'cari' }, '', window.location.href);
  window.addEventListener('popstate', () => {
    if (filterModal && filterModal.classList.contains('open')) {
      closeModal();
      window.history.pushState({ page: 'cari' }, '', window.location.href);
      return;
    }
    window.location.href = '/beranda.html';
  });

  // Initial distance calculation, chips, and render
  recalculateDistances();
  updateFilterChips();
  updateFilterPreview();
  render();
  syncFromApi();

  // Hanya periksa izin jika browser sebelumnya sudah memberikan izin (granted), agar tidak membekukan UI saat loading
  if (typeof navigator !== 'undefined' && navigator.permissions && navigator.permissions.query) {
    navigator.permissions.query({ name: 'geolocation' }).then((status) => {
      if (status.state === 'granted') {
        requestUserLocation(false);
      }
    }).catch(() => {});
  }
});
