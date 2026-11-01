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
  typeChips.forEach(chip => {
    chip.addEventListener('click', () => {
      typeChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentType = chip.getAttribute('data-type');

      if (currentType === 'sewa') {
        if (pageTitle) pageTitle.textContent = 'Unggah Produk Sewa';
        if (hargaLabel) hargaLabel.textContent = 'Harga Sewa / hari';
        if (hargaInput) hargaInput.value = 'Rp7.000';
        if (btnOpenEstimator) btnOpenEstimator.style.display = 'flex';
      } else if (currentType === 'jual') {
        if (pageTitle) pageTitle.textContent = 'Unggah Produk Beli';
        if (hargaLabel) hargaLabel.textContent = 'Harga Jual';
        if (hargaInput) hargaInput.value = 'Rp3.200.000';
        if (btnOpenEstimator) btnOpenEstimator.style.display = 'none';
      } else {
        if (pageTitle) pageTitle.textContent = 'Unggah Produk Free';
        if (hargaLabel) hargaLabel.textContent = 'Biaya / Komitmen';
        if (hargaInput) hargaInput.value = 'Rp0 (Gratis)';
        if (btnOpenEstimator) btnOpenEstimator.style.display = 'none';
      }
    });
  });

  // Condition Chips
  kondisiChips.forEach(chip => {
    chip.addEventListener('click', () => {
      kondisiChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const val = chip.getAttribute('data-val');
      if (kondisiSelect) kondisiSelect.value = val;
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
      defaultSamplePhoto.style.display = uploadedFotos.length > 0 ? 'none' : 'block';
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

    const total = uploadedFotos.length > 0 ? uploadedFotos.length : 1;
    if (photoCountLabel) photoCountLabel.textContent = `${total} dari 5 foto`;
  };

  if (photoInput) {
    photoInput.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files || []);
      for (const file of files) {
        if (uploadedFotos.length >= 5) break;
        try {
          const compressed = await compressImage(file);
          uploadedFotos.push(compressed);
        } catch (_err) {}
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
      if (estProdSub) estProdSub.textContent = `${katText} - Kondisi ${konVal === 'seperti-baru' ? 'Seperti Baru' : (konVal === 'baik' ? 'Baik' : 'Cukup')}`;
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

  // Location Picker Sheet (Screen 25)
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

  if (btnGpsCurrent) {
    btnGpsCurrent.addEventListener('click', () => {
      if (locSearchInput) locSearchInput.value = 'Jl. Kampus Asri, Garut';
      if (locPreviewAddr) locPreviewAddr.textContent = 'Jl. Kampus Asri No. 8, Tarogong Kidul, Garut';
      if (lokasiLat) lokasiLat.value = '-7.2160';
      if (lokasiLng) lokasiLng.value = '107.9020';
    });
  }

  if (btnApplyLocation && locationSheet) {
    btnApplyLocation.addEventListener('click', () => {
      if (locPreviewAddr && lokasiBarang) {
        lokasiBarang.value = locPreviewAddr.textContent;
      }
      locationSheet.style.display = 'none';
    });
  }

  // Toast
  const showToast = (msg, callback) => {
    if (!toastMsg) return;
    if (toastText) toastText.textContent = msg;
    toastMsg.style.display = 'inline-flex';
    setTimeout(() => {
      toastMsg.style.display = 'none';
      if (callback) callback();
    }, 1500);
  };

  // Submit button & Screen 26
  if (submitBtn) {
    submitBtn.addEventListener('click', async () => {
      const nama = namaBarang?.value.trim();
      if (!nama) {
        showToast('Nama produk wajib diisi');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Mengirim Produk...';

      let sewaVal = null;
      let jualVal = null;
      if (currentType === 'sewa') {
        const nums = (hargaInput?.value || '').replace(/[^0-9]/g, '');
        sewaVal = nums ? Number(nums) : 7000;
      } else if (currentType === 'jual') {
        const nums = (hargaInput?.value || '').replace(/[^0-9]/g, '');
        jualVal = nums ? Number(nums) : 3200000;
      } else {
        sewaVal = 0;
      }

      const deskripsiVal = deskripsiInput?.value.trim() || 'Barang siap pakai untuk perkuliahan.';
      const lokasiVal = lokasiBarang?.value.trim() || 'Jl. Kampus Asri No. 8, Tarogong Kidul, Garut';
      const latVal = lokasiLat?.value ? parseFloat(lokasiLat.value) : undefined;
      const lngVal = lokasiLng?.value ? parseFloat(lokasiLng.value) : undefined;

      const sampleFallbackFoto = ['/img/lampu-belajar.png'];
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
        deskripsi: deskripsiVal
      };

      try {
        const result = await KM.post('/barang', payload);
        createdProductId = result?.id || 1;

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
        showToast(err.message || 'Gagal mengunggah produk');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Kirim Produk';
      }
    });
  }

  // Success overlay buttons
  if (closeSuccess && statusProdukOverlay) {
    closeSuccess.addEventListener('click', () => {
      statusProdukOverlay.style.display = 'none';
      window.location.href = `/detail.html?id=${createdProductId}`;
    });
  }
  if (btnLihatProdukSaya) {
    btnLihatProdukSaya.addEventListener('click', () => {
      window.location.href = `/detail.html?id=${createdProductId}`;
    });
  }
});
