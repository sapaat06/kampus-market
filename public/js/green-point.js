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

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Load real balance if logged in
  try {
    const data = await window.KM.get('/saya');
    if (data && data.green_points !== undefined) {
      const balanceEl = document.getElementById('gpBalanceNum');
      const subEl = document.getElementById('gpUserSubtitle');
      if (balanceEl) balanceEl.textContent = Number(data.green_points).toLocaleString('id-ID');
      const fullSubText = `${data.nama || 'Mahasiswa'} · Saldo aktif`;
      if (subEl) {
        subEl.textContent = fullSubText;
        subEl.title = fullSubText;
      }

      if (Number(data.green_points) === 0 && (!data.riwayat_poin || data.riwayat_poin.length === 0)) {
        const activeContent = document.getElementById('gpActiveContent');
        const emptyState = document.getElementById('gpEmptyState');
        if (activeContent) activeContent.style.display = 'none';
        if (emptyState) emptyState.style.display = 'flex';
      } else if (Array.isArray(data.riwayat_poin) && data.riwayat_poin.length > 0) {
        const listContainer = document.querySelector('.gp-activity-list');
        if (listContainer) {
          listContainer.innerHTML = data.riwayat_poin.map(p => {
            const isPlus = p.jumlah_poin >= 0;
            const ptsStr = `${isPlus ? '+' : ''}${p.jumlah_poin}`;
            const cat = p.kategori || 'Transaksi';
            const ket = p.keterangan || 'Aktivitas kampus ramah lingkungan';
            const dateStr = p.created_at ? new Date(p.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
            return `
              <div class="gp-act-card" data-open-detail="gp-${p.id_poin || 1}">
                <div class="gp-act-icon">
                  <svg viewBox="0 0 24 24"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/></svg>
                </div>
                <div class="gp-act-info">
                  <div class="gp-act-title" title="${esc(ket)}">${esc(ket)}</div>
                  <div class="gp-act-sub">${esc(dateStr ? dateStr + ' · ' : '')}${esc(cat)}</div>
                </div>
                <div class="gp-act-pts">${esc(ptsStr)}</div>
              </div>
            `;
          }).join('');
        }
      }
    }
  } catch (_) {
    KM.ui.error('Gagal Memuat Green Point', 'Saldo dan riwayat poin tidak bisa diambil. Periksa koneksi kamu.');
  }
});
