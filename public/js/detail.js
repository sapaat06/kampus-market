// public/js/detail.js
// Handles item detail display, Figma-faithful photos, Sewa / Beli / Pinjam modes, and checkout bottom sheet

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const itemId = urlParams.get('id') || '1';

  let currentDuration = 3;
  let activeCheckoutMode = 'sewa'; // 'sewa', 'beli', or 'pinjam'
  let currentItem = null;

  // Back button
  const backBtn = document.getElementById('backBtn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = '/cari.html';
      }
    });
  }

  // Modal elements
  const checkoutModal = document.getElementById('checkoutModal');
  const checkoutModalTitle = document.getElementById('checkoutModalTitle');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const durasiGroup = document.getElementById('durasiGroup');
  const durasiMinus = document.getElementById('durasiMinus');
  const durasiPlus = document.getElementById('durasiPlus');
  const durasiText = document.getElementById('durasiText');
  const modalThumb = document.getElementById('modalThumb');
  const modalBadge = document.getElementById('modalBadge');
  const modalItemName = document.getElementById('modalItemName');
  const modalItemPrice = document.getElementById('modalItemPrice');
  const modalItemLoc = document.getElementById('modalItemLoc');
  const billPriceLabel = document.getElementById('billPriceLabel');
  const billPriceVal = document.getElementById('billPriceVal');
  const billRowDeposit = document.getElementById('billRowDeposit');
  const modalTotal = document.getElementById('modalTotal');
  const submitCheckoutBtn = document.getElementById('submitCheckoutBtn');
  const checkoutError = document.getElementById('checkoutError');

  const updateModalTotal = () => {
    if (durasiText) durasiText.textContent = `${currentDuration} Hari`;
    if (!currentItem) return;

    if (activeCheckoutMode === 'sewa') {
      const pricePerDay = currentItem.harga_sewa || 5000;
      const subtotal = currentDuration * pricePerDay;
      const deposit = 50000;
      if (billPriceLabel) billPriceLabel.textContent = `Rp${pricePerDay.toLocaleString('id-ID')} × ${currentDuration} hari`;
      if (billPriceVal) billPriceVal.textContent = `Rp${subtotal.toLocaleString('id-ID')}`;
      if (billRowDeposit) billRowDeposit.style.display = 'flex';
      if (modalTotal) modalTotal.textContent = `Rp${(subtotal + deposit).toLocaleString('id-ID')}`;
    } else if (activeCheckoutMode === 'beli') {
      const price = currentItem.harga_jual || 3200000;
      if (billPriceLabel) billPriceLabel.textContent = 'Harga jual';
      if (billPriceVal) billPriceVal.textContent = `Rp${price.toLocaleString('id-ID')}`;
      if (billRowDeposit) billRowDeposit.style.display = 'none';
      if (modalTotal) modalTotal.textContent = `Rp${price.toLocaleString('id-ID')}`;
    } else {
      // pinjam
      if (billPriceLabel) billPriceLabel.textContent = 'Biaya peminjaman';
      if (billPriceVal) billPriceVal.textContent = 'Gratis';
      if (billRowDeposit) billRowDeposit.style.display = 'none';
      if (modalTotal) modalTotal.textContent = 'Gratis (+20 Poin)';
    }
  };

  const openCheckoutModal = async (mode) => {
    activeCheckoutMode = mode;

    if (mode === 'sewa') {
      if (checkoutModalTitle) checkoutModalTitle.textContent = 'Pengajuan Barang';
      if (durasiGroup) durasiGroup.style.display = 'flex';
      if (modalBadge) { modalBadge.textContent = 'Sewa'; modalBadge.style.background = '#FFF1DE'; modalBadge.style.color = '#9A3412'; }
      if (submitCheckoutBtn) submitCheckoutBtn.textContent = 'Kirim pengajuan ke Dimas';
    } else if (mode === 'beli') {
      if (checkoutModalTitle) checkoutModalTitle.textContent = 'Ringkasan Pembelian';
      if (durasiGroup) durasiGroup.style.display = 'none';
      if (modalBadge) { modalBadge.textContent = 'Beli'; modalBadge.style.background = '#DCFCE7'; modalBadge.style.color = '#166534'; }
      if (submitCheckoutBtn) submitCheckoutBtn.textContent = 'Konfirmasi Pembelian';
    } else {
      if (checkoutModalTitle) checkoutModalTitle.textContent = 'Pengajuan Pinjam Barang';
      if (durasiGroup) durasiGroup.style.display = 'flex';
      if (modalBadge) { modalBadge.textContent = 'Pinjam Free'; modalBadge.style.background = '#EDEAF7'; modalBadge.style.color = '#6D28D9'; }
      if (submitCheckoutBtn) submitCheckoutBtn.textContent = 'Kirim Pengajuan Pinjam';
    }

    if (modalItemName && currentItem) modalItemName.textContent = currentItem.nama_barang;
    if (modalItemPrice && currentItem) {
      if (mode === 'sewa') modalItemPrice.textContent = `Rp${Number(currentItem.harga_sewa || 5000).toLocaleString('id-ID')}/hari`;
      else if (mode === 'beli') modalItemPrice.textContent = `Rp${Number(currentItem.harga_jual || 3200000).toLocaleString('id-ID')}`;
      else modalItemPrice.textContent = 'Gratis';
    }

    updateModalTotal();
    if (checkoutModal) checkoutModal.classList.add('open');
  };

  // Close modal
  closeModalBtn?.addEventListener('click', () => {
    checkoutModal?.classList.remove('open');
  });
  checkoutModal?.addEventListener('click', (e) => {
    if (e.target === checkoutModal) checkoutModal.classList.remove('open');
  });

  durasiMinus?.addEventListener('click', () => {
    if (currentDuration > 1) {
      currentDuration--;
      updateModalTotal();
    }
  });
  durasiPlus?.addEventListener('click', () => {
    if (currentDuration < 14) {
      currentDuration++;
      updateModalTotal();
    }
  });

  // Submit checkout
  submitCheckoutBtn?.addEventListener('click', () => {
    if (activeCheckoutMode === 'sewa') {
      window.location.href = '/status-sewa.html';
    } else if (activeCheckoutMode === 'beli') {
      window.location.href = '/status-beli.html';
    } else {
      window.location.href = '/status-pinjam.html';
    }
  });

  // Fetch product data or mock
  const modeParam = urlParams.get('mode');
  const idParam = urlParams.get('id');

  if (modeParam === 'beli' || idParam === '3' || idParam === 'beli' || idParam === 'laptop') {
    currentItem = {
      id_barang: 3,
      nama_barang: 'Laptop Asus A416',
      harga_jual: 3200000,
      kondisi: 'baik',
      lokasi: 'Gerbang kampus',
      deskripsi: 'Laptop Asus A416 dengan prosesor Intel i3, RAM 8GB, SSD 256GB. Kondisi terawat untuk praktikum dan tugas akhir.'
    };
  } else if (modeParam === 'pinjam' || idParam === '2' || idParam === 'pinjam' || idParam === 'modul') {
    currentItem = {
      id_barang: 2,
      nama_barang: 'Modul Kalkulus 2',
      harga_sewa: 0,
      kondisi: 'baik',
      lokasi: 'Perpustakaan',
      deskripsi: 'Modul kalkulus 2 resmi program studi teknik. Lengkap catatan materi dan latihan soal praktikum.'
    };
  } else {
    try {
      currentItem = await KM.get(`/barang/${itemId}`);
    } catch (_e) {
      currentItem = {
        id_barang: 1,
        nama_barang: 'Kalkulator Casio fx-991ID Plus',
        harga_sewa: 5000,
        kondisi: 'baik',
        lokasi: 'Fakultas Teknik',
        deskripsi: 'Kalkulator saintifik lengkap untuk ujian dan praktikum teknik. Kondisi tombol prima dan responsif.'
      };
    }
  }

  // Choose photo
  let photoSrc = '/img/kalkulator-casio.png';
  const nameLower = (currentItem.nama_barang || '').toLowerCase();
  if (nameLower.includes('laptop') || nameLower.includes('asus')) {
    photoSrc = '/img/laptop-asus.png';
  } else if (nameLower.includes('kalkulus') || nameLower.includes('modul') || nameLower.includes('buku')) {
    photoSrc = '/img/modul-kalkulus.png';
  } else if (currentItem.foto) {
    const fotos = KM.getFotos ? KM.getFotos(currentItem.foto) : [currentItem.foto];
    if (fotos && fotos[0]) photoSrc = fotos[0];
  }

  const heroImg = document.getElementById('heroImg');
  if (heroImg) heroImg.src = photoSrc;

  if (modalThumb) {
    modalThumb.innerHTML = `<img src="${photoSrc}" alt="${escHtml(currentItem.nama_barang)}">`;
  }

  // Populate title & meta
  const itemTitle = document.getElementById('itemTitle');
  if (itemTitle) itemTitle.textContent = currentItem.nama_barang;

  const descBody = document.getElementById('descBody');
  if (descBody && currentItem.deskripsi) descBody.textContent = currentItem.deskripsi;

  const statLokasi = document.getElementById('statLokasi');
  if (statLokasi) statLokasi.textContent = `350 m · ${currentItem.lokasi || 'Fakultas Teknik'}`;

  if (modalItemLoc) modalItemLoc.textContent = `350 m · ${currentItem.lokasi || 'Fakultas Teknik'}`;

  // Mode detection
  const descLower = (currentItem.deskripsi || '').toLowerCase();
  const isPinjam = descLower.includes('pinjam') ||
                   nameLower.includes('pinjam') ||
                   nameLower.includes('kalkulus') ||
                   nameLower.includes('modul') ||
                   (currentItem.harga_sewa === 0 && !currentItem.harga_jual);
  const isBeli = !isPinjam && Boolean(currentItem.harga_jual && currentItem.harga_jual > 0);

  const badgeMode = document.getElementById('badgeMode');
  const priceVal = document.getElementById('priceVal');
  const noticeTitle = document.getElementById('noticeTitle');
  const noticeSub = document.getElementById('noticeSub');
  const extraMetaLbl = document.getElementById('extraMetaLbl');
  const extraMetaVal = document.getElementById('extraMetaVal');
  const actionBtnContainer = document.getElementById('actionBtnContainer');

  if (isPinjam) {
    activeCheckoutMode = 'pinjam';
    if (badgeMode) { badgeMode.textContent = 'Pinjam Free'; }
    if (priceVal) { priceVal.textContent = 'Gratis'; }
    if (noticeTitle) { noticeTitle.textContent = 'Dipinjam gratis, bukan diberikan'; }
    if (noticeSub) { noticeSub.textContent = 'Tanpa biaya dan tanpa deposit. Kembalikan maksimal 7 hari.'; }
    if (extraMetaLbl) { extraMetaLbl.textContent = 'Durasi pemakaian'; }
    if (extraMetaVal) { extraMetaVal.textContent = 'Maksimal 7 hari'; }
    if (actionBtnContainer) {
      actionBtnContainer.innerHTML = `<button class="btn-action-main" id="btnActionMain" type="button">Ajukan Pinjam</button>`;
      document.getElementById('btnActionMain')?.addEventListener('click', () => openCheckoutModal('pinjam'));
    }
  } else if (isBeli) {
    activeCheckoutMode = 'beli';
    if (badgeMode) { badgeMode.textContent = 'Beli'; }
    if (priceVal) { priceVal.textContent = `Rp${Number(currentItem.harga_jual || 3200000).toLocaleString('id-ID')}`; }
    if (noticeTitle) { noticeTitle.textContent = 'Sekali beli, jadi milikmu'; }
    if (noticeSub) { noticeSub.textContent = 'Harga jual final · tidak ada durasi sewa atau pengembalian.'; }
    if (extraMetaLbl) { extraMetaLbl.textContent = 'Spesifikasi'; }
    if (extraMetaVal) { extraMetaVal.textContent = 'Intel i3 · RAM 8 GB · SSD 256 GB'; }
    if (actionBtnContainer) {
      actionBtnContainer.innerHTML = `<button class="btn-action-main" id="btnActionMain" type="button">Beli Sekarang</button>`;
      document.getElementById('btnActionMain')?.addEventListener('click', () => openCheckoutModal('beli'));
    }
  } else {
    // Sewa
    activeCheckoutMode = 'sewa';
    if (badgeMode) { badgeMode.textContent = 'Sewa'; }
    const p = currentItem.harga_sewa || 5000;
    if (priceVal) { priceVal.textContent = `Rp${Number(p).toLocaleString('id-ID')}/hari`; }
    if (noticeTitle) { noticeTitle.textContent = 'Deposit Rp50.000'; }
    if (noticeSub) { noticeSub.textContent = 'Dikembalikan setelah kondisi barang dikonfirmasi.'; }
    if (extraMetaLbl) { extraMetaLbl.textContent = 'Durasi pemakaian'; }
    if (extraMetaVal) { extraMetaVal.textContent = 'Sesuai kebutuhan kuliah'; }
    if (actionBtnContainer) {
      actionBtnContainer.innerHTML = `<button class="btn-action-main" id="btnActionMain" type="button">Ajukan Sewa</button>`;
      document.getElementById('btnActionMain')?.addEventListener('click', () => openCheckoutModal('sewa'));
    }
  }

  // Chat navigation
  const chatBtn = document.getElementById('chatBtn');
  chatBtn?.addEventListener('click', () => {
    const seller = currentItem.nama_penjual || 'Dimas';
    window.location.href = `/chat.html?seller=${encodeURIComponent(seller)}&title=${encodeURIComponent(currentItem.nama_barang)}&sub=${encodeURIComponent(priceVal?.textContent || '')}`;
  });
});
