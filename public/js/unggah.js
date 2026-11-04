// public/js/unggah.js
// Handles item upload (Screens 21 to 26):
// Mode Sewa / Beli / Free, Photo upload, Estimator Harga Cerdas, Lokasi Pemilik, and Status Produk

document.addEventListener('DOMContentLoaded', () => {
  if (typeof KM !== 'undefined' && KM.wajibLogin && !KM.wajibLogin()) {
    return;
  }

  // DOM Elements
  const backBtn = document.getElementById('backBtn');
  const pageTitle = document.getElementById('pageTitle');
  const typeChips = document.querySelectorAll('#typeChips .type-chip');

  const uploadBox = document.getElementById('uploadBox');
  const uploadText = document.getElementById('uploadText');
  const photoInput = document.getElementById('photoInput');
  const photoPreviewList = document.getElementById('photoPreviewList');
  const photoCountLabel = document.getElementById('photoCountLabel');
  const btnChangePhoto = document.getElementById('btnChangePhoto');
  const defaultSamplePhoto = document.getElementById('defaultSamplePhoto');

  const namaBarang = document.getElementById('namaBarang');
  const deskripsiInput = document.getElementById('deskripsiInput');
  const kategoriSelect = document.getElementById('kategoriSelect');
  const kondisiSelect = document.getElementById('kondisiSelect');
  const kondisiChips = document.querySelectorAll('#kondisiChips .condition-chip');

  const hargaLabel = document.getElementById('hargaLabel');
  const hargaInput = document.getElementById('hargaInput');
  const lokasiBarang = document.getElementById('lokasiBarang');
  const lokasiLat = document.getElementById('lokasiLat');
  const lokasiLng = document.getElementById('lokasiLng');

  // Estimator Elements (Screen 24)
  const btnOpenEstimator = document.getElementById('btnOpenEstimator');
  const estimatorSheet = document.getElementById('estimatorSheet');
  const closeEstimator = document.getElementById('closeEstimator');
  const estProdTitle = document.getElementById('estProdTitle');
  const estProdSub = document.getElementById('estProdSub');
  const estRangeText = document.getElementById('estRangeText');
  const estChoiceInput = document.getElementById('estChoiceInput');
  const btnApplyEstPrice = document.getElementById('btnApplyEstPrice');

  // Location Elements (Screen 25)
  const btnOpenLocation = document.getElementById('btnOpenLocation');
  const locationSheet = document.getElementById('locationSheet');
  const closeLocation = document.getElementById('closeLocation');
  const locSearchInput = document.getElementById('locSearchInput');
  const locPreviewAddr = document.getElementById('locPreviewAddr');
  const btnGpsCurrent = document.getElementById('btnGpsCurrent');
  const btnApplyLocation = document.getElementById('btnApplyLocation');

  // Status Produk Success Elements (Screen 26)
  const statusProdukOverlay = document.getElementById('statusProdukOverlay');
  const closeSuccess = document.getElementById('closeSuccess');
  const succProdRef = document.getElementById('succProdRef');
  const succProdName = document.getElementById('succProdName');
  const succProdJenis = document.getElementById('succProdJenis');
  const btnLihatProdukSaya = document.getElementById('btnLihatProdukSaya');

  const submitBtn = document.getElementById('submitBtn');
  const toastMsg = document.getElementById('toastMsg');
  const toastText = document.getElementById('toastText');

  // State
  let currentType = 'sewa';
  const uploadedFotos = [];
  let createdProductId = 1;

  // Back button
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = '/beranda.html';
      }
    });
  }

  // Type / Mode Selector
  const hargaGroup = document.getElementById('hargaGroup');
  const hargaHelper = document.getElementById('hargaHelper');
  const pinjamInfoBanner = document.getElementById('pinjamInfoBanner');

  typeChips.forEach(chip => {
    chip.addEventListener('click', () => {
      typeChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentType = chip.getAttribute('data-type');

      if (currentType === 'sewa') {
        if (pageTitle) pageTitle.textContent = 'Unggah Produk Sewa';
        if (hargaGroup) hargaGroup.style.display = 'block';
        if (pinjamInfoBanner) pinjamInfoBanner.style.display = 'none';
        if (hargaLabel) hargaLabel.textContent = 'Harga Sewa per Hari (Rp)';
        if (hargaInput) {
          hargaInput.placeholder = 'Contoh: 5.000';
          if (hargaInput.value === '0') hargaInput.value = '';
        }
        if (btnOpenEstimator) btnOpenEstimator.style.display = 'inline-flex';
        if (hargaHelper) hargaHelper.textContent = 'Saran harga sewa harian untuk teman kampus.';
      } else if (currentType === 'jual') {
        if (pageTitle) pageTitle.textContent = 'Unggah Produk Jual / Beli';
        if (hargaGroup) hargaGroup.style.display = 'block';
        if (pinjamInfoBanner) pinjamInfoBanner.style.display = 'none';
        if (hargaLabel) hargaLabel.textContent = 'Harga Jual (Rp)';
        if (hargaInput) {
          hargaInput.placeholder = 'Contoh: 150.000';
          if (hargaInput.value === '0') hargaInput.value = '';
        }
        if (btnOpenEstimator) btnOpenEstimator.style.display = 'none';
        if (hargaHelper) hargaHelper.textContent = 'Harga beli permanen untuk pembeli.';
      } else {
        if (pageTitle) pageTitle.textContent = 'Unggah Produk Pinjam';
        if (hargaGroup) hargaGroup.style.display = 'none';
        if (pinjamInfoBanner) pinjamInfoBanner.style.display = 'block';
        if (hargaInput) hargaInput.value = '0';
        if (btnOpenEstimator) btnOpenEstimator.style.display = 'none';
      }
    });
  });

  // Condition Chips & Select Synchronization
  if (kondisiSelect) {
    kondisiSelect.addEventListener('change', () => {
      const currentVal = kondisiSelect.value;
      kondisiChips.forEach(c => {
        if (c.getAttribute('data-val') === currentVal) {
          c.classList.add('active');
        } else {
          c.classList.remove('active');
        }
      });
    });
  }

  kondisiChips.forEach(chip => {
    chip.addEventListener('click', () => {
      kondisiChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const val = chip.getAttribute('data-val');
      if (kondisiSelect) {
        kondisiSelect.value = val;
        kondisiSelect.dispatchEvent(new Event('change'));
      }
    });
  });

  // Photos handling
  if (uploadBox && photoInput) {
    uploadBox.addEventListener('click', () => photoInput.click());
  }
  if (btnChangePhoto && photoInput) {
    btnChangePhoto.addEventListener('click', () => photoInput.click());
  }
  if (defaultSamplePhoto && photoInput) {
    defaultSamplePhoto.addEventListener('click', () => photoInput.click());
  }

  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 800;
          if (width > height && width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const renderPreviews = () => {
    if (defaultSamplePhoto) {
      defaultSamplePhoto.style.display = 'none';
    }
    // Remove dynamic previews
    const dynamicItems = photoPreviewList.querySelectorAll('.dynamic-photo-item');
    dynamicItems.forEach(el => el.remove());

    uploadedFotos.forEach((f, idx) => {
      const box = document.createElement('div');
      box.className = 'photo-item-box dynamic-photo-item';
      box.innerHTML = `
        <img src="${f}" alt="Foto ${idx + 1}">
        <button class="photo-overlay-btn" type="button" data-del="${idx}">Hapus</button>
      `;
      box.querySelector('[data-del]').addEventListener('click', (e) => {
        e.stopPropagation();
        uploadedFotos.splice(idx, 1);
        renderPreviews();
      });
      photoPreviewList.insertBefore(box, uploadBox);
    });

    if (photoCountLabel) photoCountLabel.textContent = `${uploadedFotos.length} dari 5 foto`;
  };

  if (photoInput) {
    photoInput.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files || []);
      for (const file of files) {
        if (uploadedFotos.length >= 5) break;
        try {
          const compressed = await compressImage(file);
          uploadedFotos.push(compressed);
        } catch (_err) {
          tampilkanPopupError('File foto tidak dapat dibaca. Coba pilih foto lain (JPG/PNG).');
        }
      }
      renderPreviews();
      photoInput.value = '';
    });
  }

  // Estimator Harga Sheet (Screen 24)
  if (btnOpenEstimator && estimatorSheet) {
    btnOpenEstimator.addEventListener('click', () => {
      if (estProdTitle && namaBarang) estProdTitle.textContent = namaBarang.value || 'Lampu Belajar LED';
      const katText = kategoriSelect ? kategoriSelect.options[kategoriSelect.selectedIndex].text : 'Perlengkapan Kos';
      const konVal = kondisiSelect ? kondisiSelect.value : 'baik';
      const konLabel = (konVal === 'baru' || konVal === 'seperti-baru' || konVal === 'seperti baru')
        ? 'Seperti Baru'
        : (konVal === 'rusak' ? 'Rusak' : (konVal === 'cukup' ? 'Cukup' : 'Baik'));
      if (estProdSub) estProdSub.textContent = `${katText} - Kondisi ${konLabel}`;
      estimatorSheet.style.display = 'flex';
    });
  }

  if (closeEstimator && estimatorSheet) {
    closeEstimator.addEventListener('click', () => {
      estimatorSheet.style.display = 'none';
    });
  }

  if (btnApplyEstPrice && estimatorSheet) {
    btnApplyEstPrice.addEventListener('click', () => {
      if (estChoiceInput && hargaInput) {
        hargaInput.value = estChoiceInput.value;
      }
      estimatorSheet.style.display = 'none';
    });
  }

  // Location Picker Sheet (Screen 25) & Geolocation Penjual
  const DEFAULT_CAMPUS_LAT = -7.2160;
  const DEFAULT_CAMPUS_LNG = 107.9020;
  let realGpsCoords = null; // { lat, lng, accuracy } jika berhasil didapat dari GPS

  const ambilGpsPenjual = () => {
    const coordDesc = document.getElementById('locCoordInfo');
    const mapLink = document.getElementById('locMapLink');
    const mapLinkWrap = document.getElementById('locMapLinkWrap');

    // 1. Cek keberadaan navigator.geolocation
    if (!navigator.geolocation) {
      if (window.KM && KM.ui) KM.ui.toast('Browser ini tidak mendukung lokasi.', 'error');
      if (coordDesc) coordDesc.textContent = 'Koordinat default kampus (bukan lokasimu)';
      if (mapLinkWrap) mapLinkWrap.style.display = 'none';
      if (btnGpsCurrent) {
        btnGpsCurrent.disabled = false;
        btnGpsCurrent.textContent = 'Coba lagi';
      }
      return;
    }

    // 2. Cek secure context (HTTPS / localhost)
    const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    if (!window.isSecureContext && !isLocalhost && window.location.protocol !== 'https:') {
      if (window.KM && KM.ui) KM.ui.toast('Koneksi tidak aman (HTTPS diperlukan untuk lokasi).', 'error');
      if (coordDesc) coordDesc.textContent = 'Koordinat default kampus (bukan lokasimu)';
      if (mapLinkWrap) mapLinkWrap.style.display = 'none';
      if (btnGpsCurrent) {
        btnGpsCurrent.disabled = false;
        btnGpsCurrent.textContent = 'Coba lagi';
      }
      return;
    }

    // 3. State "Mencari lokasi..." di tombol selama menunggu & teks pencarian
    if (btnGpsCurrent) {
      btnGpsCurrent.disabled = true;
      btnGpsCurrent.textContent = 'Mencari lokasi...';
      btnGpsCurrent.style.background = '#F1F5F9';
      btnGpsCurrent.style.color = '#64748B';
    }
    if (locSearchInput) locSearchInput.value = 'Sedang mencari alamat...';
    if (locPreviewAddr) locPreviewAddr.textContent = 'Sedang mencari alamat...';

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Number(pos.coords.latitude);
        const lng = Number(pos.coords.longitude);
        const acc = Math.round(pos.coords.accuracy || 0);

        realGpsCoords = { lat, lng, accuracy: acc };

        // Simpan lat dan lng asli (angka / 6 desimal di input form)
        if (lokasiLat) lokasiLat.value = lat.toFixed(6);
        if (lokasiLng) lokasiLng.value = lng.toFixed(6);

        // 1. Integrasi Peta OpenStreetMap Embed
        const mapBox = document.getElementById('mapPreviewBox');
        let mapIframe = document.getElementById('map-preview') || document.getElementById('mapPreviewIframe');

        // Ganti elemen gambar/placeholder yang rusak dengan tag <iframe> jika belum ada
        if (mapIframe && mapIframe.tagName !== 'IFRAME') {
          const newIframe = document.createElement('iframe');
          newIframe.id = 'map-preview';
          newIframe.className = 'w-full h-full rounded-lg border-0';
          newIframe.setAttribute('scrolling', 'no');
          newIframe.setAttribute('marginheight', '0');
          newIframe.setAttribute('marginwidth', '0');
          newIframe.title = 'Pratinjau Peta Lokasi';
          mapIframe.parentNode.replaceChild(newIframe, mapIframe);
          mapIframe = newIframe;
        } else if (!mapIframe && mapBox) {
          const oldImg = mapBox.querySelector('img');
          if (oldImg) oldImg.remove();
          mapIframe = document.createElement('iframe');
          mapIframe.id = 'map-preview';
          mapIframe.className = 'w-full h-full rounded-lg border-0';
          mapIframe.setAttribute('scrolling', 'no');
          mapIframe.setAttribute('marginheight', '0');
          mapIframe.setAttribute('marginwidth', '0');
          mapIframe.title = 'Pratinjau Peta Lokasi';
          mapBox.prepend(mapIframe);
        }

        // 2. Update URL Peta Secara Dinamis dengan format OpenStreetMap embed & bbox
        if (mapIframe) {
          mapIframe.className = 'w-full h-full rounded-lg border-0';
          mapIframe.style.width = '100%';
          mapIframe.style.height = '100%';
          mapIframe.style.border = '0';
          mapIframe.style.borderRadius = '8px';
          // Menambahkan bbox (bounding box) agar peta sedikit zoom-out dan tidak terlalu sempit
          const bbox = `${lng - 0.01},${lat - 0.01},${lng + 0.01},${lat + 0.01}`;
          mapIframe.src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
        }

        // Tampilkan koordinat dan akurasi
        if (coordDesc) {
          coordDesc.textContent = `Koordinat: ${lat.toFixed(6)}, ${lng.toFixed(6)} (±${acc} m)`;
        }

        // Label tombol menjadi "Lokasi saat ini aktif"
        if (btnGpsCurrent) {
          btnGpsCurrent.disabled = false;
          btnGpsCurrent.textContent = 'Lokasi saat ini aktif';
          btnGpsCurrent.style.background = '#DCFCE7';
          btnGpsCurrent.style.color = '#166534';
        }

        // Tautan "Lihat di peta" membuka OpenStreetMap di tab baru
        if (mapLink && mapLinkWrap) {
          mapLink.href = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`;
          mapLinkWrap.style.display = 'block';
        }

        // 3. Tambahkan state "Sedang mencari alamat..." pada teks-teks tersebut saat proses fetch sedang berjalan (loading)
        const mapPreviewTag = document.getElementById('mapPreviewTag') || document.querySelector('.map-tag');
        if (locSearchInput) locSearchInput.value = 'Sedang mencari alamat...';
        if (locPreviewAddr) locPreviewAddr.textContent = 'Sedang mencari alamat...';
        if (mapPreviewTag) mapPreviewTag.textContent = 'Sedang mencari alamat...';

        // 2. Terapkan Reverse Geocoding (Ubah Koordinat ke Alamat via Nominatim OpenStreetMap)
        try {
          const endpoint = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
          let data = null;
          try {
            const res = await fetch(endpoint);
            if (res.ok) {
              data = await res.json();
            }
          } catch (_netErr) {
            // Fallback via server proxy jika direct external call dibatasi
            try {
              const resProxy = await fetch(`/api/reverse-geocode?lat=${lat}&lon=${lng}`);
              if (resProxy.ok) {
                data = await resProxy.json();
              }
            } catch (_proxyErr) {}
          }

          // Tangkap responsnya, dan ambil bagian nama jalan atau daerah (misal: data.display_name)
          if (data && (data.display_name || data.address)) {
            const addr = data.address || {};
            const namaJalan = addr.road || addr.pedestrian || addr.suburb || addr.neighbourhood || addr.village || addr.city_district || '';
            const namaDaerah = addr.city || addr.town || addr.municipality || addr.county || addr.regency || addr.state_district || '';

            let namaRingkas = '';
            if (namaJalan && namaDaerah) {
              namaRingkas = `${namaJalan}, ${namaDaerah}`;
            } else if (namaJalan) {
              namaRingkas = namaJalan;
            } else if (namaDaerah) {
              namaRingkas = namaDaerah;
            } else if (data.display_name) {
              namaRingkas = data.display_name.split(',').slice(0, 2).join(',').trim();
            }

            const alamatAsli = data.display_name || namaRingkas || 'Lokasi saat ini (Garut)';

            // 3. Hubungkan Hasil Reverse Geocoding ke UI:
            // Disisipkan sebagai isi input "Cari alamat atau area", teks penanda peta, dan alamat pratinjau tepat di bawah kotak peta
            if (locSearchInput) locSearchInput.value = alamatAsli;
            if (locPreviewAddr) locPreviewAddr.textContent = alamatAsli;
            if (mapPreviewTag) mapPreviewTag.textContent = namaRingkas || alamatAsli;
            if (lokasiBarang) lokasiBarang.value = namaRingkas || alamatAsli;

            if (window.KM && KM.ui) KM.ui.toast('Alamat dan peta berhasil diperbarui');
          } else {
            throw new Error('Alamat tidak ditemukan');
          }
        } catch (geoErr) {
          console.warn('Reverse Geocoding error:', geoErr);
          // 3. Hubungkan fallback reverse geocoding ke penanda dan alamat pratinjau di bawah kotak peta
          const fallbackAlamat = 'Lokasi saat ini (Garut)';
          if (locSearchInput) locSearchInput.value = fallbackAlamat;
          if (locPreviewAddr) locPreviewAddr.textContent = fallbackAlamat;
          if (mapPreviewTag) mapPreviewTag.textContent = fallbackAlamat;
          if (lokasiBarang && !lokasiBarang.value) {
            lokasiBarang.value = fallbackAlamat;
          }
          if (window.KM && KM.ui) KM.ui.toast('Lokasi didapatkan (peta aktif)');
        }
      },
      (err) => {
        console.warn('GPS Penjual tidak dapat diakses:', err.code, err.message);

        // JANGAN diam-diam memakai koordinat default dan menganggapnya lokasi pengguna!
        realGpsCoords = null;

        let pesanToast = 'Gagal mendeteksi lokasi.';
        if (err.code === 1) { // PERMISSION_DENIED
          pesanToast = 'Izin lokasi ditolak. Aktifkan lewat ikon di sebelah alamat, lalu coba lagi.';
        } else if (err.code === 2) { // POSITION_UNAVAILABLE
          pesanToast = 'Lokasi tidak ditemukan. Nyalakan GPS lalu coba lagi.';
        } else if (err.code === 3) { // TIMEOUT
          pesanToast = 'Mencari lokasi terlalu lama. Coba di tempat terbuka.';
        }

        if (window.KM && KM.ui) KM.ui.toast(pesanToast, 'error');

        // Tandai titik sebagai "Koordinat default kampus (bukan lokasimu)"
        if (coordDesc) {
          coordDesc.textContent = 'Koordinat default kampus (bukan lokasimu)';
        }
        if (mapLinkWrap) {
          mapLinkWrap.style.display = 'none';
        }

        // Beri tombol "Coba lagi"
        if (btnGpsCurrent) {
          btnGpsCurrent.disabled = false;
          btnGpsCurrent.textContent = 'Coba lagi';
          btnGpsCurrent.style.background = '#FEE2E2';
          btnGpsCurrent.style.color = '#991B1B';
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  };

  if (btnOpenLocation && locationSheet) {
    btnOpenLocation.addEventListener('click', () => {
      locationSheet.style.display = 'flex';
    });
  }

  if (closeLocation && locationSheet) {
    closeLocation.addEventListener('click', () => {
      locationSheet.style.display = 'none';
    });
  }

  if (locSearchInput) {
    locSearchInput.addEventListener('input', () => {
      if (locPreviewAddr) {
        locPreviewAddr.textContent = locSearchInput.value;
      }
      const mapPreviewTag = document.getElementById('mapPreviewTag') || document.querySelector('.map-tag');
      if (mapPreviewTag) {
        mapPreviewTag.textContent = locSearchInput.value;
      }
    });
  }

  if (btnGpsCurrent) {
    btnGpsCurrent.addEventListener('click', () => {
      ambilGpsPenjual();
    });
  }

  if (btnApplyLocation && locationSheet) {
    btnApplyLocation.addEventListener('click', () => {
      if (realGpsCoords) {
        if (lokasiLat) lokasiLat.value = realGpsCoords.lat.toFixed(6);
        if (lokasiLng) lokasiLng.value = realGpsCoords.lng.toFixed(6);
        if (lokasiBarang) {
          lokasiBarang.value = locSearchInput?.value || locPreviewAddr?.textContent || 'Titik dari lokasi saat ini';
        }
      } else {
        if (lokasiLat && !lokasiLat.value) lokasiLat.value = String(DEFAULT_CAMPUS_LAT);
        if (lokasiLng && !lokasiLng.value) lokasiLng.value = String(DEFAULT_CAMPUS_LNG);
        if (lokasiBarang && !lokasiBarang.value) {
          lokasiBarang.value = locPreviewAddr ? locPreviewAddr.textContent : 'Kampus ITG Garut';
        }
      }
      locationSheet.style.display = 'none';
      if (window.KM && KM.ui) KM.ui.toast('Lokasi penyerahan dipilih');
    });
  }

  // Popup Error SweetAlert2 kustom bertema Tailwind
  const tampilkanPopupError = (pesanErrorDariBackend) => {
    if (typeof Swal !== 'undefined') {
      return Swal.fire({
        icon: 'error',
        title: 'Gagal Mengunggah',
        text: pesanErrorDariBackend, // tampilkan pesan error yang rapi
        confirmButtonText: 'Tutup',
        buttonsStyling: false, // matikan style default
        customClass: {
          popup: 'rounded-2xl shadow-xl border-0',
          title: 'text-xl font-bold text-gray-800',
          htmlContainer: 'text-gray-600 font-medium',
          confirmButton: 'bg-[#059669] text-white px-8 py-2.5 rounded-xl font-semibold hover:bg-emerald-700 transition-colors'
        }
      });
    }
    alert(`Gagal Mengunggah: ${pesanErrorDariBackend}`);
  };

  // Toast (memakai SweetAlert2 agar konsisten dengan halaman lain)
  const showToast = (msg, callback) => {
    if (window.KM && KM.ui) KM.ui.toast(msg);
    else if (toastMsg) {
      if (toastText) toastText.textContent = msg;
      toastMsg.style.display = 'inline-flex';
      setTimeout(() => { toastMsg.style.display = 'none'; if (callback) callback(); }, 1500);
      return;
    }
    if (callback) callback();
  };

  // Submit button & Screen 26
  if (submitBtn) {
    submitBtn.addEventListener('click', async () => {
      const nama = namaBarang?.value.trim();
      if (!nama) {
        tampilkanPopupError('Isi nama produk terlebih dahulu sebelum mengunggah.');
        namaBarang?.focus();
        return;
      }

      let sewaVal = null;
      let jualVal = null;
      if (currentType === 'sewa') {
        const nums = (hargaInput?.value || '').replace(/[^0-9]/g, '');
        if (!nums || Number(nums) <= 0) {
          tampilkanPopupError('Masukkan harga sewa per hari (angka lebih dari 0).');
          hargaInput?.focus();
          return;
        }
        sewaVal = Number(nums);
      } else if (currentType === 'jual') {
        const nums = (hargaInput?.value || '').replace(/[^0-9]/g, '');
        if (!nums || Number(nums) <= 0) {
          tampilkanPopupError('Masukkan harga jual (angka lebih dari 0).');
          hargaInput?.focus();
          return;
        }
        jualVal = Number(nums);
      } else {
        sewaVal = 0;
      }

      const deskripsiVal = deskripsiInput?.value.trim() || 'Barang siap pakai untuk perkuliahan.';
      const finalDeskripsi = currentType === 'pinjam'
        ? (deskripsiVal.toLowerCase().includes('pinjam') ? deskripsiVal : `[Mode Pinjam] ${deskripsiVal}`)
        : deskripsiVal;

      const lokasiVal = lokasiBarang?.value.trim() || 'Kampus ITG Garut';
      const parsedLat = parseFloat(lokasiLat?.value);
      const parsedLng = parseFloat(lokasiLng?.value);
      const latVal = !isNaN(parsedLat) ? parsedLat : DEFAULT_CAMPUS_LAT;
      const lngVal = !isNaN(parsedLng) ? parsedLng : DEFAULT_CAMPUS_LNG;

      const sampleFallbackFoto = ['/img/kalkulator-casio.png'];
      const fotoPayload = uploadedFotos.length > 0 ? uploadedFotos : sampleFallbackFoto;

      const payload = {
        nama_barang: nama,
        id_kategori: Number(kategoriSelect?.value) || 1,
        kondisi: kondisiSelect?.value || 'baik',
        harga_sewa: sewaVal,
        harga_jual: jualVal,
        foto: JSON.stringify(fotoPayload),
        lokasi: lokasiVal,
        lokasi_lat: latVal,
        lokasi_lng: lngVal,
        latitude: latVal,
        longitude: lngVal,
        deskripsi: finalDeskripsi
      };

      try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Mengirim Produk...';
        KM.ui.loading('Mengunggah produk...');

        const result = await KM.post('/barang', payload);
        createdProductId = result?.id_barang || result?.id || 1;
        KM.ui.tutup();
        KM.ui.toast('Produk berhasil diunggah');

        // Show Screen 26: Status Produk
        if (succProdRef) {
          const now = new Date();
          const tgl = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
          const jam = String(now.getHours()).padStart(2, '0') + '.' + String(now.getMinutes()).padStart(2, '0');
          succProdRef.textContent = `PRO-03${createdProductId} · ${tgl} · ${jam}`;
        }
        if (succProdName) succProdName.textContent = nama;
        if (succProdJenis) {
          if (currentType === 'sewa') {
            succProdJenis.textContent = `Sewa · Rp${Number(sewaVal).toLocaleString('id-ID')}/hari`;
          } else if (currentType === 'jual') {
            succProdJenis.textContent = `Beli · Rp${Number(jualVal).toLocaleString('id-ID')}`;
          } else {
            succProdJenis.textContent = 'Pinjam Gratis';
          }
        }
        if (statusProdukOverlay) statusProdukOverlay.style.display = 'flex';
      } catch (err) {
        KM.ui.tutup();
        const pesanErrorDariBackend = err?.message || 'Produk tidak berhasil diunggah. Periksa koneksi kamu lalu coba lagi.';
        tampilkanPopupError(pesanErrorDariBackend);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Kirim Produk';
      }
    });
  }

  // Success overlay buttons - Masuk ke profil dan tampilkan barang milik saya
  if (closeSuccess && statusProdukOverlay) {
    closeSuccess.addEventListener('click', () => {
      statusProdukOverlay.style.display = 'none';
      sessionStorage.setItem('kc_toast_profil', 'Barang berhasil diunggah! Barang milik Anda telah ditampilkan di bawah.');
      window.location.href = '/profil.html#secBarangSaya';
    });
  }
  if (btnLihatProdukSaya) {
    btnLihatProdukSaya.addEventListener('click', () => {
      sessionStorage.setItem('kc_toast_profil', 'Barang berhasil diunggah! Barang milik Anda telah ditampilkan di bawah.');
      window.location.href = '/profil.html#secBarangSaya';
    });
  }
});
