// public/js/unggah.js
// Handles item upload, category/condition updates, dynamic Smart Price Estimator, and saving to backend

document.addEventListener('DOMContentLoaded', () => {
  const backBtn = document.getElementById('backBtn');
  const uploadBox = document.getElementById('uploadBox');
  const fileInput = document.getElementById('fileInput');
  const photoPreview = document.getElementById('photoPreview');
  const removePhotoBtn = document.getElementById('removePhotoBtn');
  const typeChips = document.querySelectorAll('#typeChips .type-chip');
  const smartPriceCard = document.getElementById('smartPriceCard');
  const smartPriceSub = document.getElementById('smartPriceSub');
  const smartPriceRange = document.getElementById('smartPriceRange');
  const smartPriceIdeal = document.getElementById('smartPriceIdeal');
  const hargaLabel = document.getElementById('hargaLabel');
  const hargaInput = document.getElementById('hargaInput');
  const kategoriSelect = document.getElementById('kategoriSelect');
  const kondisiSelect = document.getElementById('kondisiSelect');
  const submitBtn = document.getElementById('submitBtn');
  const toastMsg = document.getElementById('toastMsg');
  const toastText = document.getElementById('toastText');

  let currentType = 'sewa';
  let lastIdeal = 5000;
  const btnPakaiIdeal = document.getElementById('btnPakaiIdeal');

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

  // Photo upload trigger
  if (uploadBox && fileInput) {
    uploadBox.addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', () => {
      if (fileInput.files && fileInput.files[0]) {
        uploadBox.style.display = 'none';
        photoPreview.style.display = 'flex';
      }
    });
  }

  if (removePhotoBtn) {
    removePhotoBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      uploadBox.style.display = 'flex';
      photoPreview.style.display = 'none';
      if (fileInput) fileInput.value = '';
    });
  }

  // Smart Price Calculation based on Type, Category, Condition
  const updateEstimator = () => {
    const kondisi = kondisiSelect.value;
    let factor = 1.0;
    if (kondisi === 'baru') factor = 1.25;
    else if (kondisi === 'baik') factor = 1.0;
    else if (kondisi === 'cukup') factor = 0.75;
    else if (kondisi === 'rusak') factor = 0.4;

    if (currentType === 'sewa') {
      smartPriceSub.textContent = 'Rekomendasi harga sewa';
      const minP = Math.round(4000 * factor / 500) * 500;
      const maxP = Math.round(6000 * factor / 500) * 500;
      const idealP = Math.round(5000 * factor / 500) * 500;
      lastIdeal = idealP;
      smartPriceRange.textContent = `Rp${minP.toLocaleString('id-ID')} – Rp${maxP.toLocaleString('id-ID')}`;
      smartPriceIdeal.textContent = `/ hari · harga ideal Rp${idealP.toLocaleString('id-ID')}`;
      hargaLabel.textContent = 'Harga Sewa Kamu (per hari)';
      hargaInput.placeholder = `Masukkan harga sewa (misal: ${idealP})`;
      hargaInput.disabled = false;
      smartPriceCard.style.display = 'flex';
      if (btnPakaiIdeal) btnPakaiIdeal.style.display = 'inline-block';
    } else if (currentType === 'jual') {
      smartPriceSub.textContent = 'Rekomendasi harga jual';
      const minP = Math.round(150000 * factor / 5000) * 5000;
      const maxP = Math.round(190000 * factor / 5000) * 5000;
      const idealP = Math.round(170000 * factor / 5000) * 5000;
      lastIdeal = idealP;
      smartPriceRange.textContent = `Rp${minP.toLocaleString('id-ID')} – Rp${maxP.toLocaleString('id-ID')}`;
      smartPriceIdeal.textContent = `harga ideal Rp${idealP.toLocaleString('id-ID')}`;
      hargaLabel.textContent = 'Harga Jual Kamu';
      hargaInput.placeholder = `Masukkan harga jual (misal: ${idealP})`;
      hargaInput.disabled = false;
      smartPriceCard.style.display = 'flex';
      if (btnPakaiIdeal) btnPakaiIdeal.style.display = 'inline-block';
    } else if (currentType === 'pinjam') {
      smartPriceSub.textContent = 'Mode Pinjam Berbagi (Green Points)';
      smartPriceRange.textContent = 'Gratis · Bebas Biaya';
      smartPriceIdeal.textContent = 'Dapatkan +20 Green Points setelah peminjaman!';
      hargaLabel.textContent = 'Biaya Pinjam';
      hargaInput.value = '0';
      hargaInput.placeholder = 'Gratis (Rp0)';
      hargaInput.disabled = true;
      smartPriceCard.style.display = 'flex';
      if (btnPakaiIdeal) btnPakaiIdeal.style.display = 'none';
    }
  };

  if (btnPakaiIdeal) {
    btnPakaiIdeal.addEventListener('click', () => {
      hargaInput.value = lastIdeal;
    });
  }

  // Transaction mode chip selection
  typeChips.forEach(chip => {
    chip.addEventListener('click', () => {
      typeChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentType = chip.getAttribute('data-type');
      updateEstimator();
    });
  });

  if (kategoriSelect) kategoriSelect.addEventListener('change', updateEstimator);
  if (kondisiSelect) kondisiSelect.addEventListener('change', updateEstimator);

  const showToast = (msg, callback) => {
    if (!toastMsg) return;
    toastText.textContent = msg;
    toastMsg.style.display = 'inline-flex';
    setTimeout(() => {
      toastMsg.style.display = 'none';
      if (callback) callback();
    }, 1500);
  };

  // Submit form
  if (submitBtn) {
    submitBtn.addEventListener('click', async () => {
      const nama = document.getElementById('namaBarang')?.value.trim();
      if (!nama) {
        showToast('Nama barang wajib diisi');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Menerbitkan Barang...';

      let sewaVal = null;
      let jualVal = null;
      if (currentType === 'sewa') {
        const nums = hargaInput.value.replace(/[^0-9]/g, '');
        if (!nums) {
          showToast('Masukkan harga sewa barang');
          submitBtn.disabled = false;
          submitBtn.textContent = 'Tayangkan Barang';
          return;
        }
        sewaVal = Number(nums);
      } else if (currentType === 'jual') {
        const nums = hargaInput.value.replace(/[^0-9]/g, '');
        if (!nums) {
          showToast('Masukkan harga jual barang');
          submitBtn.disabled = false;
          submitBtn.textContent = 'Tayangkan Barang';
          return;
        }
        jualVal = Number(nums);
      } else {
        // Mode Pinjam: sewa simbolis 1000 atau bebas pinjam
        sewaVal = 1000;
        jualVal = null;
      }

      const deskripsiVal = document.getElementById('deskripsiInput')?.value.trim();
      const payload = {
        nama_barang: nama,
        id_kategori: Number(kategoriSelect.value) || 1,
        kondisi: kondisiSelect.value || 'baik',
        harga_sewa: sewaVal,
        harga_jual: jualVal,
        deskripsi: (currentType === 'pinjam' ? '[Mode Pinjam Komunitas] ' : '') + (deskripsiVal || 'Barang siap pakai untuk perkuliahan.')
      };

      try {
        const res = await fetch('/api/barang', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const result = await res.json();
        if (res.ok) {
          showToast('✓ Barang berhasil ditayangkan!', () => {
            window.location.href = `/detail.html?id=${result.id || 1}`;
          });
          return;
        } else {
          showToast(result.error || 'Gagal menerbitkan barang');
          submitBtn.disabled = false;
          submitBtn.textContent = 'Tayangkan Barang';
          return;
        }
      } catch (_e) {
        showToast('Gagal menghubungi server');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Tayangkan Barang';
        return;
      }
    });
  }
});
