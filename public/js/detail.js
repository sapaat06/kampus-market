// public/js/detail.js
// Handles item detail display, responsive photo/illustration, multi-mode transaction (Beli, Sewa, Pinjam), and checkout modal

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const ilustrasi = {
  kalkulator: `<svg viewBox="0 0 160 200" width="130" height="165" fill="none">
    <rect x="25" y="15" width="110" height="170" rx="20" fill="#263238"/>
    <rect x="40" y="30" width="80" height="42" rx="8" fill="#C2E2DD"/>
    <circle cx="52" cy="95" r="9" fill="#ECEFF1"/>
    <circle cx="80" cy="95" r="9" fill="#ECEFF1"/>
    <circle cx="108" cy="95" r="9" fill="#ECEFF1"/>
    <circle cx="52" cy="120" r="9" fill="#ECEFF1"/>
    <circle cx="80" cy="120" r="9" fill="#ECEFF1"/>
    <circle cx="108" cy="120" r="9" fill="#ECEFF1"/>
    <circle cx="52" cy="145" r="9" fill="#ECEFF1"/>
    <circle cx="80" cy="145" r="9" fill="#ECEFF1"/>
    <circle cx="108" cy="145" r="9" fill="#F28C28"/>
  </svg>`,

  buku: `<svg viewBox="0 0 160 200" width="125" height="165" fill="none">
    <rect x="35" y="20" width="90" height="160" rx="12" fill="#007A68"/>
    <rect x="45" y="45" width="60" height="8" rx="4" fill="#fff" opacity=".95"/>
    <rect x="45" y="65" width="40" height="8" rx="4" fill="#fff" opacity=".95"/>
    <rect x="45" y="85" width="60" height="8" rx="4" fill="#fff" opacity=".95"/>
  </svg>`,

  laptop: `<svg viewBox="0 0 160 200" width="140" height="110" fill="none">
    <rect x="20" y="40" width="120" height="85" rx="10" fill="#1E3A38"/>
    <rect x="28" y="48" width="104" height="69" rx="6" fill="#BFE3DA"/>
    <path d="M10 130h140a6 6 0 0 1 6 6v4H4v-4a6 6 0 0 1 6-6z" fill="#1E3A38"/>
  </svg>`,

  jaslab: `<svg viewBox="0 0 160 200" width="130" height="145" fill="none">
    <path d="M60 20v25L32 125a8 8 0 0 0 7 12h82a8 8 0 0 0 7-12L100 45V20H60z" fill="#007A68" opacity=".9"/>
    <path d="M42 110l8-22h60l8 22a8 8 0 0 1-7 12H49a8 8 0 0 1-7-12z" fill="#20B29A"/>
    <line x1="55" y1="20" x2="105" y2="20" stroke="#1E3A38" stroke-width="5" stroke-linecap="round"/>
  </svg>`,

  umum: (title) => `<svg viewBox="0 0 160 200" width="130" height="150">
    <rect x="25" y="30" width="110" height="140" rx="28" fill="#DDF1EC"/>
    <text x="80" y="115" font-size="48" fill="#007A68" text-anchor="middle" font-weight="bold">${escHtml((title || 'K').charAt(0))}</text>
  </svg>`
};

function getSvg(title) {
  const t = (title || '').toLowerCase();
  if (t.includes('kalkulator') || t.includes('casio')) return ilustrasi.kalkulator;
  if (t.includes('kalkulus') || t.includes('buku') || t.includes('diktat') || t.includes('modul')) return ilustrasi.buku;
  if (t.includes('laptop') || t.includes('komputer') || t.includes('asus')) return ilustrasi.laptop;
  if (t.includes('jas') || t.includes('lab') || t.includes('praktikum') || t.includes('kacamata')) return ilustrasi.jaslab;
  return ilustrasi.umum(title);
}

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const itemId = urlParams.get('id') || '1';

  let currentDuration = 2;
  let selectedMethod = 'qris';
  let activeCheckoutMode = 'sewa'; // 'sewa', 'beli', or 'pinjam'
  let currentItem = null;

  // Back button
  const backBtn = document.getElementById('backBtn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = '/beranda.html';
      }
    });
  }

  // Favorite button
  const favBtn = document.getElementById('favBtn');
  const toast = document.getElementById('toastMsg');
  const toastText = document.getElementById('toastText');
  let isFav = false;

  const showToast = (msg) => {
    if (!toast) return;
    toastText.textContent = msg;
    toast.style.display = 'inline-flex';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => { toast.style.display = 'none'; }, 2000);
  };

  if (favBtn) {
    favBtn.addEventListener('click', () => {
      isFav = !isFav;
      favBtn.classList.toggle('favorited', isFav);
      showToast(isFav ? 'Tersimpan ke favorit' : 'Dihapus dari favorit');
    });
  }

  // Carousel interactive switcher
  const dots = document.querySelectorAll('.carousel-dots .dot');
  dots.forEach((dot, idx) => {
    dot.addEventListener('click', () => {
      dots.forEach(d => d.classList.remove('active'));
      dot.classList.add('active');
    });
  });

  // Modal elements
  const checkoutModal = document.getElementById('checkoutModal');
  const checkoutModalTitle = document.getElementById('checkoutModalTitle');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const durasiGroup = document.getElementById('durasiGroup');
  const durasiLabel = document.getElementById('durasiLabel');
  const durasiMinus = document.getElementById('durasiMinus');
  const durasiPlus = document.getElementById('durasiPlus');
  const durasiText = document.getElementById('durasiText');
  const modalItemName = document.getElementById('modalItemName');
  const modalItemPrice = document.getElementById('modalItemPrice');
  const modalTotal = document.getElementById('modalTotal');
  const submitCheckoutBtn = document.getElementById('submitCheckoutBtn');
  const methodChips = document.querySelectorAll('#methodGroup .method-chip');

  const updateModalTotal = () => {
    if (durasiText) durasiText.textContent = `${currentDuration} Hari`;
    if (!currentItem) return;

    if (activeCheckoutMode === 'pinjam') {
      const biayaPinjam = currentItem.harga_sewa && currentItem.harga_sewa > 0 ? currentItem.harga_sewa : 0;
      if (modalTotal) {
        modalTotal.textContent = biayaPinjam > 0 
          ? `Rp${Number(biayaPinjam).toLocaleString('id-ID')} (+20 Poin)`
          : 'Gratis (+20 Green Points)';
      }
      if (modalItemPrice) {
        modalItemPrice.textContent = biayaPinjam > 0 
          ? `Rp${Number(biayaPinjam).toLocaleString('id-ID')} (Biaya Pinjam)`
          : 'Gratis · Bebas Biaya';
      }
    } else if (activeCheckoutMode === 'sewa') {
      const price = currentItem.harga_sewa || 5000;
      const total = currentDuration * price;
      if (modalTotal) modalTotal.textContent = `Rp${total.toLocaleString('id-ID')}`;
      if (modalItemPrice) modalItemPrice.textContent = `Rp${price.toLocaleString('id-ID')} / hari`;
    } else {
      const total = currentItem.harga_jual || 100000;
      if (modalTotal) modalTotal.textContent = `Rp${total.toLocaleString('id-ID')}`;
      if (modalItemPrice) modalItemPrice.textContent = `Rp${total.toLocaleString('id-ID')}`;
    }
  };

  const openCheckoutModal = async (mode) => {
    // Check login
    try {
      await KM.get('/saya');
    } catch (e) {
      if (e.status === 401) {
        alert('Silakan masuk terlebih dahulu untuk bertransaksi.');
        window.location.href = `/masuk.html?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
        return;
      }
    }

    activeCheckoutMode = mode;

    if (mode === 'pinjam') {
      const biayaPinjam = currentItem?.harga_sewa && currentItem.harga_sewa > 0 ? currentItem.harga_sewa : 0;
      if (checkoutModalTitle) {
        checkoutModalTitle.textContent = biayaPinjam > 0 ? 'Pengajuan Pinjam Barang' : 'Pengajuan Pinjam Barang (Gratis)';
      }
      if (durasiGroup) durasiGroup.style.display = 'flex';
      if (durasiLabel) durasiLabel.textContent = 'Durasi Pinjam';
      if (submitCheckoutBtn) {
        submitCheckoutBtn.textContent = biayaPinjam > 0 
          ? `Konfirmasi Pinjam (Rp${Number(biayaPinjam).toLocaleString('id-ID')})`
          : 'Kirim Pengajuan Pinjam (Gratis)';
      }
    } else if (mode === 'sewa') {
      if (checkoutModalTitle) checkoutModalTitle.textContent = 'Ajukan Sewa Barang';
      if (durasiGroup) durasiGroup.style.display = 'flex';
      if (durasiLabel) durasiLabel.textContent = 'Durasi Sewa';
      if (submitCheckoutBtn) submitCheckoutBtn.textContent = 'Kirim Pengajuan Sewa';
    } else {
      if (checkoutModalTitle) checkoutModalTitle.textContent = 'Konfirmasi Pembelian Barang';
      if (durasiGroup) durasiGroup.style.display = 'none';
      if (submitCheckoutBtn) submitCheckoutBtn.textContent = 'Konfirmasi & Beli Sekarang';
    }

    if (modalItemName && currentItem) modalItemName.textContent = currentItem.nama_barang;
    updateModalTotal();

    if (checkoutModal) checkoutModal.style.display = 'flex';
  };

  // Fetch item details
  try {
    currentItem = await KM.get(`/barang/${itemId}`);

    // Update title & basic info
    const itemTitle = document.getElementById('itemTitle');
    if (itemTitle) itemTitle.textContent = currentItem.nama_barang;

    const descBody = document.getElementById('descBody');
    if (descBody) descBody.textContent = currentItem.deskripsi || 'Kondisi barang baik, siap pakai untuk kuliah.';

    const ownerName = document.getElementById('ownerName');
    if (ownerName && currentItem.nama_penjual) ownerName.textContent = currentItem.nama_penjual;

    const statLokasi = document.getElementById('statLokasi');
    if (statLokasi) statLokasi.textContent = currentItem.lokasi || 'Fak. Teknik';

    // Hitung estimasi jarak antara lokasi pengguna dan pemilik barang
    const statJarak = document.getElementById('statJarak');
    function haversineDistance(lat1, lon1, lat2, lon2) {
      const R = 6371e3; // meter
      const toRad = (deg) => deg * Math.PI / 180;
      const φ1 = toRad(lat1), φ2 = toRad(lat2);
      const Δφ = toRad(lat2 - lat1);
      const Δλ = toRad(lon2 - lon1);
      const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    }

    function formatDistance(meters) {
      if (meters < 1000) return Math.round(meters) + ' m';
      return (meters / 1000).toFixed(1) + ' km';
    }

    async function hitungTampilkanJarak() {
      if (!statJarak) return;
      if (!currentItem.lokasi_lat || !currentItem.lokasi_lng) {
        statJarak.textContent = 'Data lokasi tidak tersedia';
        return;
      }
      // Coba ambil lokasi pengguna via geolocation browser
      if (!navigator.geolocation) {
        statJarak.textContent = 'Lokasi pengguna tidak tersedia';
        return;
      }
      try {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 5000 });
        });
        const dist = haversineDistance(
          pos.coords.latitude, pos.coords.longitude,
          Number(currentItem.lokasi_lat), Number(currentItem.lokasi_lng)
        );
        statJarak.textContent = formatDistance(dist);
      } catch (_e) {
        statJarak.textContent = 'Lokasi pengguna tidak tersedia';
      }
    }

    hitungTampilkanJarak();

    const badgeKondisi = document.getElementById('badgeKondisi');
    if (badgeKondisi && currentItem.kondisi) {
      badgeKondisi.textContent = `Kondisi ${currentItem.kondisi.charAt(0).toUpperCase() + currentItem.kondisi.slice(1)}`;
    }

    // Photo or SVG Illustration
    const heroImg = document.getElementById('heroImg');
    const heroSvgPlaceholder = document.getElementById('heroSvgPlaceholder');
    const modalThumb = document.getElementById('modalThumb');
    const carouselDots = document.getElementById('carouselDots');
    const heroPrevBtn = document.getElementById('heroPrevBtn');
    const heroNextBtn = document.getElementById('heroNextBtn');
    const heroCounter = document.getElementById('heroCounter');
    const thumbStrip = document.getElementById('thumbStrip');
    const modalPhotosCount = document.getElementById('modalPhotosCount');
    const modalGalleryRow = document.getElementById('modalGalleryRow');

    const fotos = typeof KM !== 'undefined' && KM.getFotos ? KM.getFotos(currentItem.foto) : (currentItem.foto ? [currentItem.foto] : []);

    let currentPhotoIdx = 0;
    const showPhoto = (idx) => {
      if (!fotos.length) return;
      currentPhotoIdx = idx;
      if (heroImg && fotos[idx]) heroImg.src = fotos[idx];

      if (carouselDots) {
        carouselDots.querySelectorAll('.dot').forEach((d, i) => {
          d.classList.toggle('active', i === idx);
        });
      }

      if (heroCounter) {
        heroCounter.textContent = `${idx + 1}/${fotos.length}`;
      }

      if (thumbStrip) {
        thumbStrip.querySelectorAll('.thumb-strip-item').forEach((item, i) => {
          item.classList.toggle('active', i === idx);
        });
      }
    };

    if (fotos.length > 0) {
      if (heroImg) {
        heroImg.src = fotos[0];
        heroImg.style.display = 'block';
        heroImg.onclick = () => {
          if (fotos.length > 1) showPhoto((currentPhotoIdx + 1) % fotos.length);
        };
      }
      if (heroSvgPlaceholder) heroSvgPlaceholder.style.display = 'none';
      if (modalThumb) modalThumb.innerHTML = `<img src="${escHtml(fotos[0])}" style="width:100%;height:100%;object-fit:cover;border-radius:10px">`;

      if (fotos.length > 1) {
        if (heroPrevBtn) {
          heroPrevBtn.style.display = 'flex';
          heroPrevBtn.onclick = (e) => {
            e.stopPropagation();
            showPhoto((currentPhotoIdx - 1 + fotos.length) % fotos.length);
          };
        }
        if (heroNextBtn) {
          heroNextBtn.style.display = 'flex';
          heroNextBtn.onclick = (e) => {
            e.stopPropagation();
            showPhoto((currentPhotoIdx + 1) % fotos.length);
          };
        }
        if (heroCounter) {
          heroCounter.style.display = 'block';
          heroCounter.textContent = `1/${fotos.length}`;
        }
        if (carouselDots) {
          carouselDots.innerHTML = fotos.map((_, i) => `<div class="dot ${i === 0 ? 'active' : ''}" data-index="${i}"></div>`).join('');
          carouselDots.style.display = 'flex';
          carouselDots.querySelectorAll('.dot').forEach((dot, idx) => {
            dot.addEventListener('click', (e) => {
              e.stopPropagation();
              showPhoto(idx);
            });
          });
        }
        if (thumbStrip) {
          thumbStrip.innerHTML = fotos.map((f, i) => `
            <div class="thumb-strip-item ${i === 0 ? 'active' : ''}" data-index="${i}">
              <img src="${escHtml(f)}" alt="Foto ${i + 1}">
            </div>`).join('');
          thumbStrip.style.display = 'flex';
          thumbStrip.querySelectorAll('.thumb-strip-item').forEach((item, idx) => {
            item.addEventListener('click', () => showPhoto(idx));
          });
        }

        // Setup modal gallery preview
        if (modalPhotosCount) modalPhotosCount.textContent = `${fotos.length} Foto Produk`;
        if (modalGalleryRow) {
          modalGalleryRow.innerHTML = fotos.map((f, i) => `
            <div style="width:44px;height:44px;border-radius:10px;overflow:hidden;border:1.5px solid var(--border-light);cursor:pointer;flex-shrink:0" title="Foto ${i + 1}">
              <img src="${escHtml(f)}" style="width:100%;height:100%;object-fit:cover">
            </div>`).join('');
          modalGalleryRow.style.display = 'flex';
        }
      } else {
        if (heroPrevBtn) heroPrevBtn.style.display = 'none';
        if (heroNextBtn) heroNextBtn.style.display = 'none';
        if (heroCounter) heroCounter.style.display = 'none';
        if (carouselDots) carouselDots.style.display = 'none';
        if (thumbStrip) thumbStrip.style.display = 'none';
        if (modalPhotosCount) modalPhotosCount.textContent = '1 Foto Produk';
        if (modalGalleryRow) modalGalleryRow.style.display = 'none';
      }
    } else {
      if (heroImg) heroImg.style.display = 'none';
      if (heroPrevBtn) heroPrevBtn.style.display = 'none';
      if (heroNextBtn) heroNextBtn.style.display = 'none';
      if (heroCounter) heroCounter.style.display = 'none';
      if (carouselDots) carouselDots.style.display = 'none';
      if (thumbStrip) thumbStrip.style.display = 'none';
      if (modalPhotosCount) modalPhotosCount.textContent = '';
      if (modalGalleryRow) modalGalleryRow.style.display = 'none';
      if (heroSvgPlaceholder) {
        heroSvgPlaceholder.innerHTML = getSvg(currentItem.nama_barang);
        heroSvgPlaceholder.style.display = 'flex';
      }
    }

    // Determine Modes: Pinjam, Sewa, Beli
    const descLower = (currentItem.deskripsi || '').toLowerCase();
    const titleLower = (currentItem.nama_barang || '').toLowerCase();
    const isPinjam = descLower.includes('[mode pinjam') ||
                     descLower.includes('pinjam') ||
                     titleLower.includes('pinjam') ||
                     (currentItem.harga_sewa === 1000 && !currentItem.harga_jual);

    const canSewa = !isPinjam && Boolean(currentItem.harga_sewa && currentItem.harga_sewa > 0);
    const canBeli = !isPinjam && Boolean(currentItem.harga_jual && currentItem.harga_jual > 0);

    const badgeMode = document.getElementById('badgeMode');
    const priceVal = document.getElementById('priceVal');
    const priceUnit = document.getElementById('priceUnit');
    const actionBtnContainer = document.getElementById('actionBtnContainer');

    if (isPinjam) {
      const biayaPinjam = currentItem.harga_sewa && currentItem.harga_sewa > 0 ? currentItem.harga_sewa : 0;
      if (badgeMode) {
        badgeMode.textContent = 'Pinjam';
        badgeMode.className = 'badge-chip pinjam';
      }
      if (priceVal) {
        priceVal.textContent = biayaPinjam > 0 ? `Rp${Number(biayaPinjam).toLocaleString('id-ID')}` : 'Gratis';
        priceVal.className = 'price-val pinjam';
      }
      if (priceUnit) {
        priceUnit.textContent = biayaPinjam > 0 ? '· Biaya Pinjam Komunitas' : '· Bebas Biaya (Gratis)';
      }

      if (actionBtnContainer) {
        const btnLabel = biayaPinjam > 0 ? `Ajukan Pinjam (Rp${Number(biayaPinjam).toLocaleString('id-ID')})` : 'Ajukan Pinjam (Gratis)';
        actionBtnContainer.innerHTML = `
          <button class="primary-btn" id="btnActionPinjam" type="button">
            <span>${btnLabel}</span>
          </button>`;
        document.getElementById('btnActionPinjam')?.addEventListener('click', () => openCheckoutModal('pinjam'));
      }
    } else if (canSewa && canBeli) {
      if (badgeMode) {
        badgeMode.textContent = 'Sewa & Beli';
        badgeMode.className = 'badge-chip sewa';
      }
      if (priceVal) {
        priceVal.textContent = `Rp${Number(currentItem.harga_sewa).toLocaleString('id-ID')}`;
        priceVal.className = 'price-val';
      }
      if (priceUnit) priceUnit.textContent = `/ hari · Beli Rp${Number(currentItem.harga_jual).toLocaleString('id-ID')}`;

      if (actionBtnContainer) {
        actionBtnContainer.innerHTML = `
          <button class="primary-btn orange" id="btnActionSewa" type="button">
            <span>Ajukan Sewa</span>
          </button>
          <button class="primary-btn" id="btnActionBeli" type="button">
            <span>Beli Sekarang</span>
          </button>`;
        document.getElementById('btnActionSewa')?.addEventListener('click', () => openCheckoutModal('sewa'));
        document.getElementById('btnActionBeli')?.addEventListener('click', () => openCheckoutModal('beli'));
      }
    } else if (canSewa) {
      if (badgeMode) {
        badgeMode.textContent = 'Sewa';
        badgeMode.className = 'badge-chip sewa';
      }
      if (priceVal) {
        priceVal.textContent = `Rp${Number(currentItem.harga_sewa).toLocaleString('id-ID')}`;
        priceVal.className = 'price-val';
      }
      if (priceUnit) priceUnit.textContent = '/ hari';

      if (actionBtnContainer) {
        actionBtnContainer.innerHTML = `
          <button class="primary-btn orange" id="btnActionSewa" type="button" style="width:100%">
            <span>Ajukan Sewa</span>
          </button>`;
        document.getElementById('btnActionSewa')?.addEventListener('click', () => openCheckoutModal('sewa'));
      }
    } else {
      if (badgeMode) {
        badgeMode.textContent = 'Beli';
        badgeMode.className = 'badge-chip beli';
      }
      if (priceVal) {
        priceVal.textContent = `Rp${Number(currentItem.harga_jual || 0).toLocaleString('id-ID')}`;
        priceVal.className = 'price-val beli';
      }
      if (priceUnit) priceUnit.textContent = '· Pembelian Permanen';

      if (actionBtnContainer) {
        actionBtnContainer.innerHTML = `
          <button class="primary-btn" id="btnActionBeli" type="button" style="width:100%">
            <span>Beli Sekarang</span>
          </button>`;
        document.getElementById('btnActionBeli')?.addEventListener('click', () => openCheckoutModal('beli'));
      }
    }
  } catch (err) {
    console.error('Gagal memuat barang:', err);
  }

  // Chat button navigation
  const chatBtn = document.getElementById('chatBtn');
  const ownerCard = document.getElementById('ownerCard');
  const navigateChat = () => {
    const sellerName = currentItem?.nama_penjual || 'Dimas A.';
    window.location.href = `/chat.html?seller=${encodeURIComponent(sellerName)}&item=${itemId}&title=${encodeURIComponent(currentItem?.nama_barang || 'Barang Kuliah')}`;
  };
  chatBtn?.addEventListener('click', navigateChat);
  ownerCard?.addEventListener('click', navigateChat);

  // Close modal
  closeModalBtn?.addEventListener('click', () => {
    if (checkoutModal) checkoutModal.style.display = 'none';
  });
  checkoutModal?.addEventListener('click', (e) => {
    if (e.target === checkoutModal) checkoutModal.style.display = 'none';
  });

  // Duration minus & plus
  durasiMinus?.addEventListener('click', () => {
    if (currentDuration > 1) {
      currentDuration--;
      updateModalTotal();
    }
  });
  durasiPlus?.addEventListener('click', () => {
    if (currentDuration < 30) {
      currentDuration++;
      updateModalTotal();
    }
  });

  // Payment method chips
  methodChips.forEach(chip => {
    chip.addEventListener('click', () => {
      methodChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      selectedMethod = chip.dataset.method;
    });
  });

  // Submit checkout
  const checkoutError = document.getElementById('checkoutError');

  submitCheckoutBtn?.addEventListener('click', async (e) => {
    if (e) e.preventDefault();
    if (checkoutError) checkoutError.style.display = 'none';

    submitCheckoutBtn.disabled = true;
    submitCheckoutBtn.textContent = 'Memproses Transaksi...';

    const lokasiVal = document.getElementById('lokasiTemu')?.value.trim() || (currentItem?.lokasi || 'Fakultas Teknik, ITG');

    // Safety timeout: mencegah tombol stuck selamanya jika server tidak merespons
    const safetyTimer = setTimeout(() => {
      if (submitCheckoutBtn.disabled) {
        submitCheckoutBtn.disabled = false;
        restoreButtonLabel();
        if (checkoutError) {
          checkoutError.textContent = 'Server tidak merespons. Pastikan backend berjalan (npm start) dan coba lagi.';
          checkoutError.style.display = 'block';
        }
      }
    }, 7000);

    const restoreButtonLabel = () => {
      const biayaPinjam = currentItem?.harga_sewa && currentItem.harga_sewa > 0 ? currentItem.harga_sewa : 0;
      if (activeCheckoutMode === 'pinjam') {
        submitCheckoutBtn.textContent = biayaPinjam > 0 
          ? `Konfirmasi Pinjam (Rp${Number(biayaPinjam).toLocaleString('id-ID')})`
          : 'Kirim Pengajuan Pinjam (Gratis)';
      } else if (activeCheckoutMode === 'sewa') {
        submitCheckoutBtn.textContent = 'Kirim Pengajuan Sewa';
      } else {
        submitCheckoutBtn.textContent = 'Konfirmasi & Beli Sekarang';
      }
    };

    try {
      const payload = {
        id_barang: Number(itemId),
        jenis_transaksi: activeCheckoutMode,
        durasi_sewa: activeCheckoutMode === 'beli' ? undefined : currentDuration,
        lokasi: lokasiVal,
        metode_pembayaran: selectedMethod === 'qris' ? 'QRIS' : 'Tunai'
      };

      const tx = await KM.post('/transaksi', payload);
      clearTimeout(safetyTimer);

      submitCheckoutBtn.textContent = '✓ Berhasil! Membuka Status...';

      // Route to correct status page based on transaction type
      setTimeout(() => {
        if (activeCheckoutMode === 'sewa') {
          window.location.href = `/status-sewa.html?id_transaksi=${tx.id_transaksi}`;
        } else if (activeCheckoutMode === 'beli') {
          window.location.href = `/status-beli.html?id_transaksi=${tx.id_transaksi}`;
        } else {
          window.location.href = `/status-pinjam.html?id_transaksi=${tx.id_transaksi}`;
        }
      }, 250);
    } catch (err) {
      clearTimeout(safetyTimer);
      console.error('Checkout error:', err);
      submitCheckoutBtn.disabled = false;
      restoreButtonLabel();

      const errMsg = err?.message || 'Gagal memproses transaksi. Silakan coba kembali.';
      if (checkoutError) {
        checkoutError.textContent = errMsg;
        checkoutError.style.display = 'block';
      }

      if (err.status === 401) {
        if (checkoutError) {
          checkoutError.textContent = 'Sesi Anda belum login / telah berakhir. Mengalihkan ke halaman login...';
        }
        setTimeout(() => {
          window.location.href = `/masuk.html?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
        }, 1200);
      }
    }
  });
});
