// public/js/unggah.js
// Handles item upload, photo compression to data URL, category/condition updates, dynamic Smart Price Estimator, and saving to backend

document.addEventListener('DOMContentLoaded', () => {
  if (typeof KM !== 'undefined' && KM.wajibLogin && !KM.wajibLogin()) {
    return;
  }

  // DOM Elements
  const backBtn = document.getElementById('backBtn');
  const uploadBox = document.getElementById('uploadBox');
  const uploadText = document.getElementById('uploadText');
  const photoInput = document.getElementById('photoInput');
  const photoPreviewList = document.getElementById('photoPreviewList');
  const namaBarang = document.getElementById('namaBarang');
  const lokasiBarang = document.getElementById('lokasiBarang');
  const lokasiLat = document.getElementById('lokasiLat');
  const lokasiLng = document.getElementById('lokasiLng');
  const kategoriSelect = document.getElementById('kategoriSelect');
  const kondisiSelect = document.getElementById('kondisiSelect');
  const typeChips = document.querySelectorAll('#typeChips .type-chip');
  const smartPriceCard = document.getElementById('smartPriceCard');
  const smartPriceSub = document.getElementById('smartPriceSub');
  const btnPakaiIdeal = document.getElementById('btnPakaiIdeal');
  const smartPriceRange = document.getElementById('smartPriceRange');
  const smartPriceIdeal = document.getElementById('smartPriceIdeal');
  const hargaLabel = document.getElementById('hargaLabel');
  const hargaInput = document.getElementById('hargaInput');
  const deskripsiInput = document.getElementById('deskripsiInput');
  const submitBtn = document.getElementById('submitBtn');
  const toastMsg = document.getElementById('toastMsg');
  const toastText = document.getElementById('toastText');

  // State
  let currentType = 'sewa';
  let lastIdeal = 5000;
  const uploadedFotos = [];

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

  // Photo upload and client-side canvas compression
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

  const renderPhotoPreview = () => {
    if (!photoPreviewList) return;
    photoPreviewList.innerHTML = '';

    uploadedFotos.forEach((f, idx) => {
      const wrap = document.createElement('div');
      wrap.style.cssText = 'position:relative;width:96px;height:96px;border-radius:14px;overflow:hidden;border:1.5px solid var(--border-light);box-shadow:0 2px 6px rgba(0,0,0,0.06)';

      const img = document.createElement('img');
      img.src = f;
      img.alt = `Foto ${idx + 1}`;
      img.style.cssText = 'width:100%;height:100%;object-fit:cover';

      const btnRemove = document.createElement('button');
      btnRemove.type = 'button';
      btnRemove.innerHTML = '&times;';
      btnRemove.setAttribute('aria-label', `Hapus Foto ${idx + 1}`);
      btnRemove.style.cssText = 'position:absolute;top:4px;right:4px;width:22px;height:22px;border-radius:50%;background:rgba(30,58,56,0.8);color:#fff;border:none;cursor:pointer;font-size:15px;line-height:1;display:flex;align-items:center;justify-content:center';
      btnRemove.onclick = (e) => {
        e.stopPropagation();
        uploadedFotos.splice(idx, 1);
        renderPhotoPreview();
      };

      wrap.appendChild(img);
      wrap.appendChild(btnRemove);
      photoPreviewList.appendChild(wrap);
    });

    if (uploadBox) {
      uploadBox.style.display = uploadedFotos.length >= 3 ? 'none' : 'flex';
      if (uploadText) {
        uploadText.textContent = uploadedFotos.length === 0
          ? 'Tambah foto barang (1 – 3 foto, min. 1)'
          : `Tambah foto lagi (${uploadedFotos.length}/3)`;
      }
    }
  };

  if (uploadBox && photoInput) {
    uploadBox.addEventListener('click', () => photoInput.click());
    photoInput.addEventListener('change', async () => {
      const files = Array.from(photoInput.files || []);
      if (!files.length) return;

      if (uploadedFotos.length + files.length > 3) {
        showToast(`Maksimal 3 foto. Anda sudah memiliki ${uploadedFotos.length} foto.`);
        photoInput.value = '';
        return;
      }

      for (const file of files) {
        if (!file.type.startsWith('image/')) {
          showToast('Format berkas harus berupa gambar');
          continue;
        }
        try {
          const dataUrl = await compressImage(file);
          if (uploadedFotos.length < 3) {
            uploadedFotos.push(dataUrl);
          }
        } catch (err) {
          console.error('Gagal memproses foto:', err);
          showToast('Gagal memproses salah satu foto');
        }
      }

      photoInput.value = '';
      renderPhotoPreview();
    });
  }

  // Smart Price Calculation based on Type, Category, Condition
  const updateEstimator = () => {
    const kondisi = kondisiSelect?.value || 'baik';
    let factor = 1.0;
    if (kondisi === 'baru') factor = 1.25;
    else if (kondisi === 'baik') factor = 1.0;
    else if (kondisi === 'cukup') factor = 0.75;
    else if (kondisi === 'rusak') factor = 0.4;

    if (currentType === 'sewa') {
      if (btnPakaiIdeal) btnPakaiIdeal.textContent = 'Pakai Ideal';
      if (smartPriceSub) smartPriceSub.textContent = 'Rekomendasi harga sewa';
      const minP = Math.round((4000 * factor) / 500) * 500;
      const maxP = Math.round((6000 * factor) / 500) * 500;
      const idealP = Math.round((5000 * factor) / 500) * 500;
      lastIdeal = idealP;
      if (smartPriceRange) smartPriceRange.textContent = `Rp${minP.toLocaleString('id-ID')} – Rp${maxP.toLocaleString('id-ID')}`;
      if (smartPriceIdeal) smartPriceIdeal.textContent = `/ hari · harga ideal Rp${idealP.toLocaleString('id-ID')}`;
      if (hargaLabel) hargaLabel.textContent = 'Harga Sewa Kamu (per hari)';
      if (hargaInput) {
        hargaInput.placeholder = `Masukkan harga sewa (misal: ${idealP})`;
        hargaInput.disabled = false;
        if (!hargaInput.value || hargaInput.value === '0') hargaInput.value = idealP;
      }
      if (smartPriceCard) smartPriceCard.style.display = 'flex';
      if (btnPakaiIdeal) btnPakaiIdeal.style.display = 'inline-block';
    } else if (currentType === 'jual') {
      if (btnPakaiIdeal) btnPakaiIdeal.textContent = 'Pakai Ideal';
      if (smartPriceSub) smartPriceSub.textContent = 'Rekomendasi harga jual';
      const minP = Math.round((150000 * factor) / 5000) * 5000;
      const maxP = Math.round((190000 * factor) / 5000) * 5000;
      const idealP = Math.round((170000 * factor) / 5000) * 5000;
      lastIdeal = idealP;
      if (smartPriceRange) smartPriceRange.textContent = `Rp${minP.toLocaleString('id-ID')} – Rp${maxP.toLocaleString('id-ID')}`;
      if (smartPriceIdeal) smartPriceIdeal.textContent = `harga ideal Rp${idealP.toLocaleString('id-ID')}`;
      if (hargaLabel) hargaLabel.textContent = 'Harga Jual Kamu';
      if (hargaInput) {
        hargaInput.placeholder = `Masukkan harga jual (misal: ${idealP})`;
        hargaInput.disabled = false;
        if (!hargaInput.value || hargaInput.value === '5000' || hargaInput.value === '0') hargaInput.value = idealP;
      }
      if (smartPriceCard) smartPriceCard.style.display = 'flex';
      if (btnPakaiIdeal) btnPakaiIdeal.style.display = 'inline-block';
    } else if (currentType === 'pinjam') {
      if (btnPakaiIdeal) btnPakaiIdeal.textContent = 'Set Gratis (Rp0)';
      if (smartPriceSub) smartPriceSub.textContent = 'Mode Pinjam Berbagi (Bisa Gratis atau Biaya Ringan)';
      if (smartPriceRange) smartPriceRange.textContent = 'Rp0 – Rp5.000';
      if (smartPriceIdeal) smartPriceIdeal.textContent = 'Isi 0 jika gratis (+Green Points), atau isi biaya pinjam / pemeliharaan';
      if (hargaLabel) hargaLabel.textContent = 'Biaya Pinjam (Isi 0 jika Gratis)';
      if (hargaInput) {
        hargaInput.disabled = false;
        hargaInput.placeholder = 'Masukkan biaya pinjam (contoh: 0 atau 3000)';
        if (!hargaInput.value || hargaInput.value === '170000' || hargaInput.value === '5000') {
          hargaInput.value = '0';
        }
      }
      if (smartPriceCard) smartPriceCard.style.display = 'flex';
      if (btnPakaiIdeal) btnPakaiIdeal.style.display = 'inline-block';
    }
  };

  if (btnPakaiIdeal) {
    btnPakaiIdeal.addEventListener('click', () => {
      if (hargaInput) {
        if (currentType === 'pinjam') {
          hargaInput.value = '0';
        } else {
          hargaInput.value = lastIdeal;
        }
      }
    });
  }

  // Transaction mode chip selection
  typeChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      typeChips.forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      currentType = chip.getAttribute('data-type');
      updateEstimator();
    });
  });

  if (kategoriSelect) kategoriSelect.addEventListener('change', updateEstimator);
  if (kondisiSelect) kondisiSelect.addEventListener('change', updateEstimator);

  const showToast = (msg, callback) => {
    if (!toastMsg) return;
    if (toastText) toastText.textContent = msg;
    toastMsg.style.display = 'inline-flex';
    setTimeout(() => {
      toastMsg.style.display = 'none';
      if (callback) callback();
    }, 1500);
  };

  // Submit form
  if (submitBtn) {
    submitBtn.addEventListener('click', async () => {
      if (uploadedFotos.length < 1) {
        showToast('Wajib mengunggah minimal 1 foto barang');
        return;
      }
      if (uploadedFotos.length > 3) {
        showToast('Maksimal 3 foto barang');
        return;
      }

      const nama = namaBarang?.value.trim();
      if (!nama) {
        showToast('Nama barang wajib diisi');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Menerbitkan Barang...';

      let sewaVal = null;
      let jualVal = null;
      if (currentType === 'sewa') {
        const nums = (hargaInput?.value || '').replace(/[^0-9]/g, '');
        if (!nums) {
          showToast('Masukkan harga sewa barang');
          submitBtn.disabled = false;
          submitBtn.textContent = 'Tayangkan Barang';
          return;
        }
        sewaVal = Number(nums);
      } else if (currentType === 'jual') {
        const nums = (hargaInput?.value || '').replace(/[^0-9]/g, '');
        if (!nums) {
          showToast('Masukkan harga jual barang');
          submitBtn.disabled = false;
          submitBtn.textContent = 'Tayangkan Barang';
          return;
        }
        jualVal = Number(nums);
      } else {
        // Mode Pinjam: bisa gratis (0) atau dengan biaya pemeliharaan
        const raw = (hargaInput?.value || '').trim();
        const nums = raw.replace(/[^0-9]/g, '');
        sewaVal = nums !== '' ? Number(nums) : 0;
        jualVal = null;
      }

      const deskripsiVal = deskripsiInput?.value.trim();
      const lokasiVal = lokasiBarang?.value.trim() || 'Fakultas Teknik, ITG';
      const lokasiLatVal = lokasiLat?.value.trim() || '';
      const lokasiLngVal = lokasiLng?.value.trim() || '';

      const payload = {
        nama_barang: nama,
        id_kategori: Number(kategoriSelect?.value) || 1,
        kondisi: kondisiSelect?.value || 'baik',
        harga_sewa: sewaVal,
        harga_jual: jualVal,
        foto: JSON.stringify(uploadedFotos),
        lokasi: lokasiVal,
        lokasi_lat: lokasiLatVal !== '' ? parseFloat(lokasiLatVal) : undefined,
        lokasi_lng: lokasiLngVal !== '' ? parseFloat(lokasiLngVal) : undefined,
        deskripsi: (currentType === 'pinjam' ? '[Mode Pinjam Komunitas] ' : '') + (deskripsiVal || 'Barang siap pakai untuk perkuliahan.')
      };

      try {
        const result = await KM.post('/barang', payload);
        showToast('✓ Barang berhasil ditayangkan!', () => {
          window.location.href = `/detail.html?id=${result.id || 1}`;
        });
      } catch (e) {
        showToast(e.message || 'Gagal mengunggah barang');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Tayangkan Barang';
      }
    });
  }

  // Initial estimator setup
  updateEstimator();
});
