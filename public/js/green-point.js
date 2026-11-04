// public/js/green-point.js
// Handles Green Point wallet, filter chips, detail modal, and live balance from /saya

document.addEventListener('DOMContentLoaded', async () => {
  const btnBack = document.getElementById('btnBackToProfil');
  if (btnBack) {
    btnBack.addEventListener('click', (e) => {
      e.preventDefault();
      if (typeof goBack === 'function') {
        goBack('/profil.html');
      } else {
        location.href = '/profil.html';
      }
    });
  }

  // Filter chips handler
  const filterPills = document.querySelectorAll('.filter-pill-gp');
  const actCards = document.querySelectorAll('.gp-act-card');

  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');

      const filterType = pill.textContent.trim().toLowerCase();
      actCards.forEach(card => {
        const title = card.querySelector('.gp-act-title')?.textContent.toLowerCase() || '';
        if (filterType === 'semua') {
          card.style.display = 'flex';
        } else if (filterType === 'sewa') {
          card.style.display = title.includes('sewa') ? 'flex' : 'none';
        } else if (filterType === 'free') {
          card.style.display = (title.includes('pinjam') || title.includes('free')) ? 'flex' : 'none';
        } else if (filterType === 'verifikasi') {
          card.style.display = title.includes('verifikasi') ? 'flex' : 'none';
        }
      });
    });
  });

  // Open detail modal with activity details
  const modalDetail = document.getElementById('modalGpDetail');
  actCards.forEach(card => {
    card.addEventListener('click', () => {
      if (modalDetail) modalDetail.style.display = 'flex';
    });
  });

  const closeDetail = document.getElementById('closeGpDetail');
  if (closeDetail && modalDetail) {
    closeDetail.addEventListener('click', () => {
      modalDetail.style.display = 'none';
    });
  }

  // Success reward modal
  const modalPenghargaan = document.getElementById('modalPenghargaan');
  const closePenghargaan = document.getElementById('btnClosePenghargaan');
  if (closePenghargaan && modalPenghargaan) {
    closePenghargaan.addEventListener('click', () => {
      modalPenghargaan.style.display = 'none';
    });
  }

  // Close modals on clicking backdrop
  [modalDetail, modalPenghargaan].forEach(modal => {
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
      });
    }
  });

  // Load real balance if logged in
  try {
    const data = await window.KM.get('/saya');
    if (data && data.green_points !== undefined) {
      const balanceEl = document.getElementById('gpBalanceNum');
      const subEl = document.getElementById('gpUserSubtitle');
      if (balanceEl) balanceEl.textContent = Number(data.green_points).toLocaleString('id-ID');
      if (subEl) subEl.textContent = `${data.nama || 'Mahasiswa'} · Saldo aktif`;

      if (Number(data.green_points) === 0 && (!data.riwayat_poin || data.riwayat_poin.length === 0)) {
        const activeContent = document.getElementById('gpActiveContent');
        const emptyState = document.getElementById('gpEmptyState');
        if (activeContent) activeContent.style.display = 'none';
        if (emptyState) emptyState.style.display = 'flex';
      }
    }
  } catch (_) {
    KM.ui.error('Gagal Memuat Green Point', 'Saldo dan riwayat poin tidak bisa diambil. Periksa koneksi kamu.');
  }
});
