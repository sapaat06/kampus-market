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
    backBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const prevUrl = document.referrer;
      const isSameDomain = prevUrl && prevUrl.includes(window.location.host);
      if (window.history.length > 1 && isSameDomain && !prevUrl.includes('masuk') && !prevUrl.includes('daftar')) {
        window.history.back();
      } else {
        if (typeof window.goToHome === 'function') {
          window.goToHome();
        } else {
          const userRole = localStorage.getItem('role') || localStorage.getItem('km_role');
          window.location.href = (userRole === 'pemilik_kost') ? 'kos-owner.html' : 'beranda.html';
        }
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
  const modalTotal = document.getElementById('modalTotal');
  const submitCheckoutBtn = document.getElementById('submitCheckoutBtn');
  const checkoutError = document.getElementById('checkoutError');

  // Titik temu & Metode pembayaran
  const lokasiTemuText = document.getElementById('lokasiTemuText');
  const lokasiTemuInput = document.getElementById('lokasiTemu');
  const metodeBayarGroup = document.getElementById('metodeBayarGroup');
  const optPayCOD = document.getElementById('optPayCOD');
  const optPayApp = document.getElementById('optPayApp');
  const radioCOD = document.getElementById('radioCOD');
  const radioApp = document.getElementById('radioApp');
  const billRowMetode = document.getElementById('billRowMetode');
  const billMetodeVal = document.getElementById('billMetodeVal');

  let selectedMetodeBayar = 'COD';

  function setPaymentMethod(method) {
    selectedMetodeBayar = method;
    if (method === 'COD') {
      if (optPayCOD) {
        optPayCOD.style.border = '1.5px solid #008F83';
        optPayCOD.style.background = '#F0FDF4';
      }
      if (radioCOD) {
        radioCOD.style.borderColor = '#008F83';
        radioCOD.innerHTML = '<div style="width:10px;height:10px;border-radius:50%;background:#008F83;"></div>';
      }
      if (optPayApp) {
        optPayApp.style.border = '1.5px solid #E2E8F0';
        optPayApp.style.background = '#FFFFFF';
      }
      if (radioApp) {
        radioApp.style.borderColor = '#CBD5E1';
        radioApp.innerHTML = '<div style="width:10px;height:10px;border-radius:50%;background:transparent;"></div>';
      }
      if (billMetodeVal) {
        billMetodeVal.textContent = 'COD (Bayar di Tempat)';
        billMetodeVal.style.color = '#007A68';
      }
    } else {
      if (optPayCOD) {
        optPayCOD.style.border = '1.5px solid #E2E8F0';
        optPayCOD.style.background = '#FFFFFF';
      }
      if (radioCOD) {
        radioCOD.style.borderColor = '#CBD5E1';
        radioCOD.innerHTML = '<div style="width:10px;height:10px;border-radius:50%;background:transparent;"></div>';
      }
      if (optPayApp) {
        optPayApp.style.border = '1.5px solid #008F83';
        optPayApp.style.background = '#F0F9FF';
      }
      if (radioApp) {
        radioApp.style.borderColor = '#008F83';
        radioApp.innerHTML = '<div style="width:10px;height:10px;border-radius:50%;background:#008F83;"></div>';
      }
      if (billMetodeVal) {
        billMetodeVal.textContent = 'Pembayaran di Aplikasi (QRIS)';
        billMetodeVal.style.color = '#0284C7';
      }
    }
  }

  optPayCOD?.addEventListener('click', () => setPaymentMethod('COD'));
  optPayApp?.addEventListener('click', () => setPaymentMethod('Aplikasi'));

  const updateModalTotal = () => {
    if (durasiText) durasiText.textContent = `${currentDuration} Hari`;
    if (!currentItem) return;

    if (activeCheckoutMode === 'sewa') {
      const pricePerDay = currentItem.harga_sewa || 5000;
      const subtotal = currentDuration * pricePerDay;
      if (billPriceLabel) billPriceLabel.textContent = `Rp${pricePerDay.toLocaleString('id-ID')} × ${currentDuration} hari`;
      if (billPriceVal) billPriceVal.textContent = `Rp${subtotal.toLocaleString('id-ID')}`;
      if (modalTotal) modalTotal.textContent = `Rp${subtotal.toLocaleString('id-ID')}`;
    } else if (activeCheckoutMode === 'beli') {
      const price = currentItem.harga_jual || 3200000;
      if (billPriceLabel) billPriceLabel.textContent = 'Harga jual';
      if (billPriceVal) billPriceVal.textContent = `Rp${price.toLocaleString('id-ID')}`;
      if (modalTotal) modalTotal.textContent = `Rp${price.toLocaleString('id-ID')}`;
    } else {
      // pinjam
      if (billPriceLabel) billPriceLabel.textContent = 'Biaya peminjaman';
      if (billPriceVal) billPriceVal.textContent = 'Gratis';
      if (modalTotal) modalTotal.textContent = 'Gratis (+20 Poin)';
    }
  };

  const openCheckoutModal = async (mode) => {
    activeCheckoutMode = mode;

    if (mode === 'sewa') {
      if (checkoutModalTitle) checkoutModalTitle.textContent = 'Pengajuan Sewa Barang';
      if (durasiGroup) durasiGroup.style.display = 'flex';
      if (metodeBayarGroup) metodeBayarGroup.style.display = 'flex';
      if (billRowMetode) billRowMetode.style.display = 'flex';
      if (modalBadge) { modalBadge.textContent = 'Sewa'; modalBadge.style.background = '#FFF1DE'; modalBadge.style.color = '#9A3412'; }
      if (submitCheckoutBtn) submitCheckoutBtn.textContent = 'Kirim Pengajuan Sewa';
      setPaymentMethod(selectedMetodeBayar || 'COD');
    } else if (mode === 'beli') {
      if (checkoutModalTitle) checkoutModalTitle.textContent = 'Ringkasan Pembelian';
      if (durasiGroup) durasiGroup.style.display = 'none';
      if (metodeBayarGroup) metodeBayarGroup.style.display = 'flex';
      if (billRowMetode) billRowMetode.style.display = 'flex';
      if (modalBadge) { modalBadge.textContent = 'Beli'; modalBadge.style.background = '#DCFCE7'; modalBadge.style.color = '#166534'; }
      if (submitCheckoutBtn) submitCheckoutBtn.textContent = 'Konfirmasi Pembelian';
      setPaymentMethod(selectedMetodeBayar || 'COD');
    } else {
      if (checkoutModalTitle) checkoutModalTitle.textContent = 'Pengajuan Pinjam Barang';
      if (durasiGroup) durasiGroup.style.display = 'flex';
      if (metodeBayarGroup) metodeBayarGroup.style.display = 'none';
      if (billRowMetode) billRowMetode.style.display = 'none';
      if (modalBadge) { modalBadge.textContent = 'Pinjam Free'; modalBadge.style.background = '#EDEAF7'; modalBadge.style.color = '#6D28D9'; }
      if (submitCheckoutBtn) submitCheckoutBtn.textContent = 'Kirim Pengajuan Pinjam';
    }

    // Set fixed location determined by seller
    const locStr = (currentItem && currentItem.lokasi) ? currentItem.lokasi : 'Lobi Fakultas Teknik';
    if (lokasiTemuText) lokasiTemuText.textContent = locStr;
    if (lokasiTemuInput) lokasiTemuInput.value = locStr;

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
  submitCheckoutBtn?.addEventListener('click', async () => {
    if (checkoutError) { checkoutError.style.display = 'none'; checkoutError.innerHTML = ''; }
    submitCheckoutBtn.disabled = true;
    submitCheckoutBtn.textContent = 'Memproses...';

    const lokasiTemu = (currentItem && currentItem.lokasi) ? currentItem.lokasi : 'Lobi Fakultas Teknik';
    const metodeLabel = selectedMetodeBayar === 'COD' ? 'COD (Bayar di Tempat)' : 'Pembayaran di Aplikasi (QRIS)';

    sessionStorage.setItem('kc_last_payment_method', metodeLabel);
    sessionStorage.setItem('kc_last_location', lokasiTemu);

    let createdTx = null;
    if (currentItem && currentItem.id_barang) {
      KM.ui.loading('Memproses transaksi...');
      try {
        createdTx = await KM.post('/transaksi', {
          id_barang: currentItem.id_barang,
          jenis_transaksi: activeCheckoutMode,
          durasi_sewa: activeCheckoutMode === 'beli' ? undefined : currentDuration,
          lokasi: lokasiTemu,
          metode_pembayaran: metodeLabel
        });
        KM.ui.tutup();
      } catch (err) {
        KM.ui.tutup();
        submitCheckoutBtn.disabled = false;
        if (activeCheckoutMode === 'sewa') submitCheckoutBtn.textContent = 'Kirim Pengajuan Sewa';
        else if (activeCheckoutMode === 'beli') submitCheckoutBtn.textContent = 'Konfirmasi Pembelian';
        else submitCheckoutBtn.textContent = 'Kirim Pengajuan Pinjam';

        let errMsg = err.message || 'Gagal memproses transaksi.';
        if (err.status === 401) {
          errMsg = 'Silakan <a href="/masuk.html" style="color:#008F83;font-weight:700;text-decoration:underline;">masuk ke akun kamu</a> terlebih dahulu untuk bertransaksi.';
          KM.ui.info('Masuk dulu, ya', 'Silakan masuk ke akun kamu terlebih dahulu untuk bertransaksi.');
        } else {
          KM.ui.error('Transaksi Gagal', err.message || 'Transaksi tidak dapat diproses. Periksa koneksi kamu lalu coba lagi.');
        }
        if (checkoutError) {
          checkoutError.innerHTML = errMsg;
          checkoutError.style.display = 'block';
        }
        return;
      }
    }

    if (createdTx && createdTx.id_transaksi) {
      await KM.ui.sukses('Transaksi Berhasil', 'Pesanan kamu sudah dibuat. Lanjut ke halaman status transaksi.');
    }

    const txParam = createdTx && createdTx.id_transaksi ? `?id_transaksi=${createdTx.id_transaksi}` : '';
    if (activeCheckoutMode === 'sewa') {
      window.location.href = '/status-sewa.html' + txParam;
    } else if (activeCheckoutMode === 'beli') {
      window.location.href = '/status-beli.html' + txParam;
    } else {
      window.location.href = '/status-pinjam.html' + txParam;
    }
  });

  // --- Galeri foto dinamis -------------------------------------------------
  // Semua foto dirender sebagai track scroll-snap. Dots dibuat ulang secara dinamis sesuai
  // jumlah foto dan diposisikan tepat di tengah (center).
  const heroTrack = document.getElementById('heroTrack');
  const dotsContainer = document.getElementById('dotsContainer') || document.getElementById('carouselDots');
  const carouselDots = dotsContainer;
  let fotoAktif = 0;

  function setDotsAktif(idx) {
    fotoAktif = idx;
    if (!dotsContainer) return;
    dotsContainer.querySelectorAll('.dot').forEach((dot, i) => {
      const isActive = (i === idx);
      dot.classList.toggle('active', isActive);
      if (isActive) {
        dot.setAttribute('aria-current', 'true');
        dot.style.backgroundColor = '#008F83';
      } else {
        dot.removeAttribute('aria-current');
        dot.style.backgroundColor = '#CBD5E1';
      }
    });
  }

  function renderGaleri(fotos) {
    if (!heroTrack) return;
    const foto = Array.isArray(fotos) ? fotos : (fotos ? [fotos] : []);

    heroTrack.innerHTML = foto.map((src, i) => `
      <img src="${escHtml(src)}" alt="Foto ${i + 1}" loading="${i === 0 ? 'eager' : 'lazy'}" draggable="false">
    `).join('');
    heroTrack.scrollLeft = 0;

    if (!dotsContainer) return;

    // Pastikan elemen kontainer memiliki class Tailwind flex justify-center items-center gap-1.5
    dotsContainer.className = 'carousel-dots flex justify-center items-center gap-1.5';
    dotsContainer.hidden = false;
    dotsContainer.removeAttribute('hidden');

    // Kosongkan isi kontainer titik sebelum melakukan looping data
    dotsContainer.innerHTML = '';

    // Kondisi berdasarkan jumlah gambar/foto yang diterima dari API
    if (foto.length === 1) {
      // Jika foto.length === 1: Render tepat 1 buah titik berwarna hijau (aktif).
      // Karena kontainernya sudah justify-center, titik ini akan otomatis berada di tengah.
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'dot active';
      dot.setAttribute('aria-label', 'Foto 1');
      dot.setAttribute('aria-current', 'true');
      dot.style.backgroundColor = '#008F83';
      dotsContainer.appendChild(dot);
      fotoAktif = 0;
      return;
    }

    if (foto.length > 1) {
      // Jika foto.length > 1: Lakukan perulangan (forEach atau for) untuk merender titik sebanyak jumlah foto.
      // Berikan warna hijau (aktif) pada indeks gambar yang sedang ditampilkan, dan warna abu-abu (tidak aktif) untuk sisanya.
      foto.forEach((_src, i) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        const isActive = (i === fotoAktif);
        dot.className = 'dot' + (isActive ? ' active' : '');
        dot.setAttribute('aria-label', `Lihat foto ${i + 1} dari ${foto.length}`);
        if (isActive) {
          dot.setAttribute('aria-current', 'true');
          dot.style.backgroundColor = '#008F83';
        } else {
          dot.removeAttribute('aria-current');
          dot.style.backgroundColor = '#CBD5E1';
        }
        dot.addEventListener('click', () => {
          heroTrack.scrollTo({ left: heroTrack.clientWidth * i, behavior: 'smooth' });
          setDotsAktif(i);
        });
        dotsContainer.appendChild(dot);
      });
    }
  }

  if (heroTrack && dotsContainer) {
    let rafScroll = 0;
    heroTrack.addEventListener('scroll', () => {
      if (rafScroll) return;
      rafScroll = requestAnimationFrame(() => {
        rafScroll = 0;
        const lebar = heroTrack.clientWidth || 1;
        const jumlah = dotsContainer.children.length;
        if (!jumlah) return;
        const idx = Math.max(0, Math.min(jumlah - 1, Math.round(heroTrack.scrollLeft / lebar)));
        if (idx !== fotoAktif) setDotsAktif(idx);
      });
    }, { passive: true });
  }

  // Fetch product data or mock
  const modeParam = (urlParams.get('mode') || '').toLowerCase();
  const idParam = urlParams.get('id');

  // Fallback mock jika API gagal
  try {
    currentItem = await KM.get(`/barang/${itemId}`);
  } catch (_e) {
    if (idParam === 'laptop' || modeParam === 'beli') {
      currentItem = {
        id_barang: 3,
        nama_barang: 'Laptop Asus A416',
        harga_jual: 3200000,
        harga_sewa: null,
        kondisi: 'baik',
        lokasi: 'Gerbang kampus',
        deskripsi: 'Laptop Asus A416 dengan prosesor Intel i3, RAM 8GB, SSD 256GB. Kondisi terawat untuk praktikum dan tugas akhir.'
      };
    } else if (idParam === 'modul' || modeParam === 'pinjam') {
      currentItem = {
        id_barang: 2,
        nama_barang: 'Modul Kalkulus 2',
        harga_sewa: 0,
        harga_jual: null,
        kondisi: 'baik',
        lokasi: 'Perpustakaan',
        deskripsi: 'Modul kalkulus 2 resmi program studi teknik. Lengkap catatan materi dan latihan soal praktikum.'
      };
    } else {
      currentItem = {
        id_barang: 1,
        nama_barang: 'Kalkulator Casio fx-991ID Plus',
        harga_sewa: 5000,
        harga_jual: null,
        kondisi: 'baik',
        lokasi: 'Fakultas Teknik',
        deskripsi: 'Kalkulator saintifik lengkap untuk ujian dan praktikum teknik. Kondisi tombol prima dan responsif.'
      };
    }
  }

  // Galeri: utamakan foto hasil unggahan backend; fallback ke gambar demo.
  const namaLower = (currentItem.nama_barang || '').toLowerCase();
  let fotoFallback = '/img/kalkulator-casio.png';
  if (namaLower.includes('laptop') || namaLower.includes('asus')) {
    fotoFallback = '/img/laptop-asus.png';
  } else if (namaLower.includes('kalkulus') || namaLower.includes('modul') || namaLower.includes('buku')) {
    fotoFallback = '/img/modul-kalkulus.png';
  }

  let daftarFoto = [];
  if (currentItem.foto) {
    daftarFoto = (KM.getFotos ? KM.getFotos(currentItem.foto) : [currentItem.foto])
      .filter((src) => typeof src === 'string' && src.trim() !== '');
  }
  if (daftarFoto.length === 0) daftarFoto = [fotoFallback];

  renderGaleri(daftarFoto);
  const photoSrc = daftarFoto[0];

  if (modalThumb) {
    modalThumb.innerHTML = `<img src="${escHtml(photoSrc)}" alt="${escHtml(currentItem.nama_barang)}">`;
  }

  // Populate title & meta
  const itemTitle = document.getElementById('itemTitle');
  if (itemTitle) itemTitle.textContent = currentItem.nama_barang;

  const descBody = document.getElementById('descBody');
  if (descBody && currentItem.deskripsi) descBody.textContent = currentItem.deskripsi;

  const statLokasi = document.getElementById('statLokasi');
  const locStr = currentItem.lokasi || 'Fakultas Teknik';
  if (statLokasi) statLokasi.textContent = `350 m · ${locStr}`;
  if (modalItemLoc) modalItemLoc.textContent = `350 m · ${locStr}`;
  if (lokasiTemuText) lokasiTemuText.textContent = locStr;
  if (lokasiTemuInput) lokasiTemuInput.value = locStr;

  // Mode detection synchronous with database & parameters
  const descLower = (currentItem.deskripsi || '').toLowerCase();

  const isPinjam = modeParam === 'pinjam' ||
                   descLower.includes('[mode pinjam') ||
                   descLower.includes('pinjam') ||
                   namaLower.includes('pinjam') ||
                   (Number(currentItem.harga_sewa) === 0 && (!currentItem.harga_jual || Number(currentItem.harga_jual) <= 0)) ||
                   (Number(currentItem.harga_sewa) === 1000 && !currentItem.harga_jual);

  // Penentuan tipe transaksi: Sewa, Beli, atau Pinjam
  let tipeTransaksi = 'sewa';
  if (isPinjam) {
    tipeTransaksi = 'pinjam';
  } else if (modeParam === 'beli' && currentItem.harga_jual && Number(currentItem.harga_jual) > 0) {
    tipeTransaksi = 'beli';
  } else if (modeParam === 'sewa' && currentItem.harga_sewa && Number(currentItem.harga_sewa) > 0) {
    tipeTransaksi = 'sewa';
  } else if (currentItem.harga_jual && Number(currentItem.harga_jual) > 0 && (!currentItem.harga_sewa || Number(currentItem.harga_sewa) <= 0)) {
    // Hanya ada harga jual di database
    tipeTransaksi = 'beli';
  } else if (currentItem.harga_sewa && Number(currentItem.harga_sewa) > 0 && (!currentItem.harga_jual || Number(currentItem.harga_jual) <= 0)) {
    // Hanya ada harga sewa di database
    tipeTransaksi = 'sewa';
  } else if (modeParam === 'beli') {
    tipeTransaksi = 'beli';
  } else {
    tipeTransaksi = currentItem.harga_sewa ? 'sewa' : 'beli';
  }

  // Komponen UI
  const badgeMode = document.getElementById('badgeMode');
  const badgeKondisi = document.getElementById('badgeKondisi');
  const priceVal = document.getElementById('priceVal');
  const boxHargaSewa = document.getElementById('boxHargaSewa');
  const priceValSewa = document.getElementById('priceValSewa');
  const boxHargaBeli = document.getElementById('boxHargaBeli');
  const priceValBeli = document.getElementById('priceValBeli');
  const boxHargaPinjam = document.getElementById('boxHargaPinjam');
  const priceValPinjam = document.getElementById('priceValPinjam');
  const actionBtnContainer = document.getElementById('actionBtnContainer');

  if (badgeKondisi) {
    badgeKondisi.textContent = `Kondisi ${escHtml(currentItem.kondisi ? currentItem.kondisi.charAt(0).toUpperCase() + currentItem.kondisi.slice(1) : 'Baik')}`;
  }

  // Render Tampilan Dinamis Berdasarkan Tipe Transaksi
  if (tipeTransaksi === 'sewa') {
    // 1. Tipe barang HANYA SEWA
    activeCheckoutMode = 'sewa';

    if (badgeMode) {
      badgeMode.textContent = 'Sewa';
      badgeMode.className = 'badge-chip orange';
    }

    // Tampilkan kotak harga sewa saja. Sembunyikan kotak harga beli dan pinjam.
    if (boxHargaSewa) boxHargaSewa.style.display = 'flex';
    if (boxHargaBeli) boxHargaBeli.style.display = 'none';
    if (boxHargaPinjam) boxHargaPinjam.style.display = 'none';

    const pSewa = currentItem.harga_sewa || 5000;
    const formattedSewa = `Rp${Number(pSewa).toLocaleString('id-ID')}`;
    if (priceValSewa) priceValSewa.innerHTML = `${formattedSewa}<span class="pbc-unit">/hari</span>`;
    if (priceVal) priceVal.textContent = `${formattedSewa}/hari`;

    // Di bagian bawah: Tampilkan HANYA tombol "Chat" dan "Ajukan Sewa". Hapus/sembunyikan tombol "Beli Sekarang".
    if (actionBtnContainer) {
      actionBtnContainer.innerHTML = `<button class="btn-action-main" id="btnActionMain" type="button" style="background:#F7942D;">Ajukan Sewa</button>`;
      document.getElementById('btnActionMain')?.addEventListener('click', () => openCheckoutModal('sewa'));
    }
  } else if (tipeTransaksi === 'beli') {
    // 2. Tipe barang HANYA BELI
    activeCheckoutMode = 'beli';

    if (badgeMode) {
      badgeMode.textContent = 'Beli';
      badgeMode.className = 'badge-chip mint';
    }

    // Tampilkan kotak harga beli saja. Sembunyikan kotak harga sewa dan pinjam.
    if (boxHargaBeli) boxHargaBeli.style.display = 'flex';
    if (boxHargaSewa) boxHargaSewa.style.display = 'none';
    if (boxHargaPinjam) boxHargaPinjam.style.display = 'none';

    const pJual = currentItem.harga_jual || 180000;
    const formattedJual = `Rp${Number(pJual).toLocaleString('id-ID')}`;
    if (priceValBeli) priceValBeli.textContent = formattedJual;
    if (priceVal) priceVal.textContent = formattedJual;

    // Di bagian bawah: Tampilkan HANYA tombol "Chat" dan "Beli Sekarang". Hapus/sembunyikan tombol "Ajukan Sewa".
    if (actionBtnContainer) {
      actionBtnContainer.innerHTML = `<button class="btn-action-main" id="btnActionMain" type="button" style="background:#008F83;">Beli Sekarang</button>`;
      document.getElementById('btnActionMain')?.addEventListener('click', () => openCheckoutModal('beli'));
    }
  } else {
    // 3. Tipe barang HANYA PINJAM
    activeCheckoutMode = 'pinjam';

    if (badgeMode) {
      badgeMode.textContent = 'Pinjam Free';
      badgeMode.className = 'badge-chip purple';
    }

    // Sembunyikan kotak harga beli maupun sewa. Tampilkan kotak pinjam gratis.
    if (boxHargaSewa) boxHargaSewa.style.display = 'none';
    if (boxHargaBeli) boxHargaBeli.style.display = 'none';
    if (boxHargaPinjam) boxHargaPinjam.style.display = 'flex';

    if (priceValPinjam) priceValPinjam.textContent = 'Gratis';
    if (priceVal) priceVal.textContent = 'Gratis';

    // Di bagian bawah: Tampilkan tombol "Chat" dan tombol "Ajukan Pinjam". Hapus/sembunyikan tombol Sewa & Beli.
    if (actionBtnContainer) {
      actionBtnContainer.innerHTML = `<button class="btn-action-main" id="btnActionMain" type="button" style="background:#7C3AED;">Ajukan Pinjam</button>`;
      document.getElementById('btnActionMain')?.addEventListener('click', () => openCheckoutModal('pinjam'));
    }
  }

  // Handle status ketersediaan barang (tersedia, disewa, dipinjam, terjual)
  const badgeTersedia = document.getElementById('badgeTersedia');
  const statusNoticeCard = document.getElementById('statusNoticeCard');
  const statusNoticeTitle = document.getElementById('statusNoticeTitle');
  const statusNoticeSub = document.getElementById('statusNoticeSub');
  const itemStatus = (currentItem.status || 'tersedia').toLowerCase();

  if (itemStatus !== 'tersedia') {
    if (badgeTersedia) {
      if (itemStatus === 'terjual') {
        badgeTersedia.textContent = 'Terjual';
        badgeTersedia.style.background = '#FEE2E2';
        badgeTersedia.style.color = '#DC2626';
        badgeTersedia.style.borderColor = '#FCA5A5';
      } else if (itemStatus === 'disewa') {
        badgeTersedia.textContent = 'Sedang Disewa';
        badgeTersedia.style.background = '#FEF3C7';
        badgeTersedia.style.color = '#B45309';
        badgeTersedia.style.borderColor = '#FCD34D';
      } else if (itemStatus === 'dipinjam') {
        badgeTersedia.textContent = 'Sedang Dipinjam';
        badgeTersedia.style.background = '#EDE9FE';
        badgeTersedia.style.color = '#6D28D9';
        badgeTersedia.style.borderColor = '#DDD6FE';
      } else {
        badgeTersedia.textContent = 'Tidak Tersedia';
        badgeTersedia.style.background = '#F1F5F9';
        badgeTersedia.style.color = '#64748B';
      }
    }

    if (statusNoticeCard) {
      statusNoticeCard.style.display = 'flex';
      if (itemStatus === 'terjual') {
        statusNoticeCard.classList.add('danger');
        if (statusNoticeTitle) statusNoticeTitle.textContent = 'Barang Sudah Terjual';
        if (statusNoticeSub) statusNoticeSub.textContent = 'Barang ini telah laku terjual dan tidak lagi tersedia untuk transaksi.';
      } else {
        statusNoticeCard.classList.remove('danger');
        if (statusNoticeTitle) statusNoticeTitle.textContent = 'Barang Sedang Digunakan';
        if (statusNoticeSub) statusNoticeSub.textContent = 'Barang ini sedang aktif disewa/dipinjam. Akan otomatis tersedia kembali setelah barang dikembalikan.';
      }
    }

    if (actionBtnContainer) {
      let btnLabel = 'Barang Sudah Terjual';
      if (itemStatus === 'disewa') btnLabel = 'Sedang Disewa (Tidak Tersedia)';
      else if (itemStatus === 'dipinjam') btnLabel = 'Sedang Dipinjam (Tidak Tersedia)';
      actionBtnContainer.innerHTML = `<button class="btn-action-main" style="background:#94A3B8;cursor:not-allowed;" disabled>${btnLabel}</button>`;
    }
  }

  // Chat navigation antar user
  const chatBtn = document.getElementById('chatBtn');
  chatBtn?.addEventListener('click', () => {
    const seller = currentItem?.nama_penjual || 'Penjual';
    const subPrice = priceVal?.textContent || '';
    window.location.href = `/chat.html?tipe=barang&id=${currentItem?.id_barang || itemId}&seller=${encodeURIComponent(seller)}&title=${encodeURIComponent(currentItem?.nama_barang || '')}&sub=${encodeURIComponent(subPrice)}`;
  });
});
