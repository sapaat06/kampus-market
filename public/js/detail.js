// public/js/detail.js
// Handles item detail display, interactive photo carousel, favorite toggle, and rental application modal

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const itemId = urlParams.get('id') || '1';
  let dailyPrice = 5000;
  let currentDuration = 2;
  let selectedMethod = 'qris';

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

  // Favorite button & Toast
  const favBtn = document.getElementById('favBtn');
  const toast = document.getElementById('toastMsg');
  const toastText = document.getElementById('toastText');
  let isFav = false;

  const showToast = (msg) => {
    if (!toast) return;
    toastText.textContent = msg;
    toast.style.display = 'inline-flex';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.style.display = 'none';
    }, 2000);
  };

  if (favBtn) {
    favBtn.addEventListener('click', () => {
      isFav = !isFav;
      favBtn.classList.toggle('favorited', isFav);
      showToast(isFav ? 'Tersimpan ke favorit' : 'Dihapus dari favorit');
    });
  }

  // Carousel interactive switching
  const dots = document.querySelectorAll('.carousel-dots .dot');
  const heroSvg = document.getElementById('heroSvg');
  dots.forEach((dot, idx) => {
    dot.addEventListener('click', () => {
      dots.forEach(d => d.classList.remove('active'));
      dot.classList.add('active');
      if (heroSvg) {
        heroSvg.style.transform = `scale(${1 + idx * 0.04}) rotate(${idx % 2 === 0 ? 0 : 2}deg)`;
        heroSvg.style.transition = 'transform 0.25s ease';
      }
    });
  });

  let isSewa = true;
  let itemPrice = 5000;

  // Fetch item details if available
  try {
    const res = await fetch(`/api/barang/${itemId}`);
    if (res.ok) {
      const item = await res.json();
      if (item.nama_barang) {
        const titleEl = document.getElementById('itemTitle');
        const modalItemName = document.getElementById('modalItemName');
        if (titleEl) titleEl.textContent = item.nama_barang;
        if (modalItemName) modalItemName.textContent = item.nama_barang;
      }

      isSewa = Boolean(item.harga_sewa);
      itemPrice = isSewa ? item.harga_sewa : item.harga_jual;
      dailyPrice = itemPrice;

      const priceVal = document.getElementById('priceVal');
      const modalPrice = document.getElementById('modalItemPrice');
      const actionCtaBtn = document.getElementById('actionCtaBtn');
      const sheetTitle = document.querySelector('.sheet-title');
      const durasiGroup = document.querySelector('.durasi-picker')?.closest('.field-group');

      if (priceVal) priceVal.textContent = `Rp${dailyPrice.toLocaleString('id-ID')}`;
      if (modalPrice) modalPrice.textContent = `Rp${dailyPrice.toLocaleString('id-ID')}` + (isSewa ? ' / hari' : '');

      if (!isSewa) {
        if (actionCtaBtn) actionCtaBtn.querySelector('span').textContent = 'Beli Sekarang';
        if (sheetTitle) sheetTitle.textContent = 'Beli Barang';
        if (durasiGroup) durasiGroup.style.display = 'none';
        const submitBtn = document.getElementById('submitSewaBtn');
        if (submitBtn) submitBtn.textContent = 'Konfirmasi Pembelian';
      }

      if (item.nama_penjual) {
        const ownerName = document.getElementById('ownerName');
        if (ownerName) ownerName.textContent = item.nama_penjual;
      }

      if (item.deskripsi) {
        const descBody = document.getElementById('descBody');
        if (descBody) descBody.textContent = item.deskripsi;
      }
      if (item.kondisi) {
        const badgeKondisi = document.getElementById('badgeKondisi');
        if (badgeKondisi) badgeKondisi.textContent = `Kondisi ${item.kondisi.charAt(0).toUpperCase() + item.kondisi.slice(1)}`;
      }
    }
  } catch (_e) {
    // Keep high-fidelity Figma defaults if API call fails or offline
  }

  // Chat button -> navigate to chat room with Dimas A.
  const chatBtn = document.getElementById('chatBtn');
  if (chatBtn) {
    chatBtn.addEventListener('click', () => {
      window.location.href = `/chat.html?seller=dimas&item=${itemId}`;
    });
  }

  // Owner card click
  const ownerCard = document.getElementById('ownerCard');
  if (ownerCard) {
    ownerCard.addEventListener('click', () => {
      window.location.href = `/chat.html?seller=dimas&item=${itemId}`;
    });
  }

  // Ajukan Sewa Modal
  const sewaModal = document.getElementById('sewaModal');
  const actionCtaBtn = document.getElementById('actionCtaBtn');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const durasiMinus = document.getElementById('durasiMinus');
  const durasiPlus = document.getElementById('durasiPlus');
  const durasiText = document.getElementById('durasiText');
  const modalTotal = document.getElementById('modalTotal');
  const submitSewaBtn = document.getElementById('submitSewaBtn');
  const methodChips = document.querySelectorAll('#methodGroup .method-chip');

  const updateTotal = () => {
    if (durasiText) durasiText.textContent = `${currentDuration} Hari`;
    const total = isSewa ? (currentDuration * dailyPrice) : dailyPrice;
    if (modalTotal) modalTotal.textContent = `Rp${total.toLocaleString('id-ID')}`;
  };

  if (actionCtaBtn && sewaModal) {
    actionCtaBtn.addEventListener('click', async () => {
      // Check login status first
      try {
        const check = await fetch('/api/saya');
        if (!check.ok) {
          alert('Silakan masuk terlebih dahulu untuk bertransaksi.');
          window.location.href = `/masuk.html?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
          return;
        }
      } catch (_e) {}

      sewaModal.style.display = 'flex';
      updateTotal();
    });
  }

  if (closeModalBtn && sewaModal) {
    closeModalBtn.addEventListener('click', () => {
      sewaModal.style.display = 'none';
    });
  }

  if (durasiMinus) {
    durasiMinus.addEventListener('click', () => {
      if (currentDuration > 1) {
        currentDuration--;
        updateTotal();
      }
    });
  }

  if (durasiPlus) {
    durasiPlus.addEventListener('click', () => {
      if (currentDuration < 30) {
        currentDuration++;
        updateTotal();
      }
    });
  }

  methodChips.forEach(chip => {
    chip.addEventListener('click', () => {
      methodChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      selectedMethod = chip.dataset.method;
    });
  });

  if (submitSewaBtn) {
    submitSewaBtn.addEventListener('click', async () => {
      submitSewaBtn.disabled = true;
      submitSewaBtn.textContent = 'Memproses...';

      const lokasiVal = document.getElementById('lokasiTemu')?.value.trim() || 'Fakultas Teknik, Kampus ITG';
      
      try {
        const payload = {
          id_barang: Number(itemId),
          jenis_transaksi: isSewa ? 'sewa' : 'beli',
          durasi_sewa: isSewa ? currentDuration : undefined,
          lokasi: lokasiVal,
          metode_pembayaran: selectedMethod === 'qris' ? 'QRIS' : 'Tunai'
        };

        const res = await fetch('/api/transaksi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (res.ok) {
          window.location.href = `/status-pinjam.html?id_transaksi=${data.id_transaksi || 1}`;
          return;
        } else {
          alert(data.error || 'Gagal memproses transaksi');
          submitSewaBtn.disabled = false;
          submitSewaBtn.textContent = isSewa ? 'Kirim Pengajuan Sewa' : 'Konfirmasi Pembelian';
          return;
        }
      } catch (_e) {
        alert('Gagal menghubungi server');
        submitSewaBtn.disabled = false;
        submitSewaBtn.textContent = isSewa ? 'Kirim Pengajuan Sewa' : 'Konfirmasi Pembelian';
      }
    });
  }
});
