// public/js/green-point.js
// Handles Green Point wallet, detail modal, and live balance from /saya

document.addEventListener('DOMContentLoaded', async () => {
  const btnBack = document.getElementById('btnBackToProfil');
  if (btnBack) {
    btnBack.addEventListener('click', () => {
      location.href = '/profil.html';
    });
  }

  document.querySelectorAll('[data-open-detail]').forEach(el => {
    el.addEventListener('click', () => {
      const modal = document.getElementById('modalGpDetail');
      if (modal) modal.style.display = 'flex';
    });
  });

  const closeDetail = document.getElementById('closeGpDetail');
  if (closeDetail) {
    closeDetail.addEventListener('click', () => {
      const modal = document.getElementById('modalGpDetail');
      if (modal) modal.style.display = 'none';
    });
  }

  const closePenghargaan = document.getElementById('btnClosePenghargaan');
  if (closePenghargaan) {
    closePenghargaan.addEventListener('click', () => {
      const modal = document.getElementById('modalPenghargaan');
      if (modal) modal.style.display = 'none';
    });
  }

  // Load real balance if logged in
  try {
    const data = await window.KM.get('/saya');
    if (data && data.green_points !== undefined) {
      const balanceEl = document.getElementById('gpBalanceNum');
      const subEl = document.getElementById('gpUserSubtitle');
      if (balanceEl) balanceEl.textContent = data.green_points;
      if (subEl) subEl.textContent = `${data.nama || 'Mahasiswa'} · Saldo aktif`;

      if (Number(data.green_points) === 0) {
        const activeContent = document.getElementById('gpActiveContent');
        const emptyState = document.getElementById('gpEmptyState');
        if (activeContent) activeContent.style.display = 'none';
        if (emptyState) emptyState.style.display = 'flex';
      }
    }
  } catch (_) {}
});
