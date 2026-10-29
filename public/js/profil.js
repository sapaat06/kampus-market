// public/js/profil.js
// Handles user profile display, live Green Points metrics from /api/saya, badge info, and logout

document.addEventListener('DOMContentLoaded', async () => {
  const userName = document.getElementById('userName');
  const userDept = document.getElementById('userDept');
  const greenPointsVal = document.getElementById('greenPointsVal');
  const progressFill = document.getElementById('progressFill');
  const levelName = document.getElementById('levelName');
  const levelNext = document.getElementById('levelNext');
  const statDipinjamkan = document.getElementById('statDipinjamkan');
  const statDisewakan = document.getElementById('statDisewakan');
  const statDipakaiUlang = document.getElementById('statDipakaiUlang');
  const logoutBtn = document.getElementById('logoutBtn');
  const badgeCircles = document.querySelectorAll('.badge-circle');

  // Try fetching live user session data
  try {
    const res = await fetch('/api/saya');
    if (res.ok) {
      const data = await res.json();
      if (data.nama && userName) {
        userName.textContent = data.nama;
      }
      if (data.email && userDept) {
        userDept.textContent = `${data.email} · ${data.status_verifikasi || 'Belum Terverifikasi'}`;
      }
      if (greenPointsVal) {
        const pts = Number(data.green_points || 0);
        greenPointsVal.textContent = pts.toLocaleString('id-ID');

        // Calculate level dynamically based on real points
        if (pts >= 1500) {
          levelName.textContent = 'Campus Hero';
          levelNext.textContent = 'Level Maksimal Tercapai!';
          progressFill.style.width = '100%';
        } else if (pts >= 500) {
          const sisa = 1500 - pts;
          levelName.textContent = 'Circle Helper';
          levelNext.textContent = `${sisa} poin lagi ke Campus Hero`;
          const pct = Math.min(Math.round((pts / 1500) * 100), 95);
          progressFill.style.width = `${pct}%`;
        } else {
          const sisa = 500 - pts;
          levelName.textContent = 'Pendatang Baru';
          levelNext.textContent = `${sisa} poin lagi ke Circle Helper`;
          const pct = Math.max(Math.min(Math.round((pts / 500) * 100), 95), 5);
          progressFill.style.width = `${pct}%`;
        }
      }

      if (data.transaksi && Array.isArray(data.transaksi)) {
        const sewaCount = data.transaksi.filter(t => t.jenis_transaksi === 'sewa').length;
        const beliCount = data.transaksi.filter(t => t.jenis_transaksi === 'beli').length;
        if (statDisewakan) statDisewakan.textContent = sewaCount;
        if (statDipakaiUlang) statDipakaiUlang.textContent = beliCount;
        if (statDipinjamkan) statDipinjamkan.textContent = '0';

        // Render real activities list
        const activityList = document.getElementById('activityList');
        if (activityList && data.transaksi.length > 0) {
          activityList.innerHTML = data.transaksi.slice(0, 5).map(t => `
            <a href="/status-pinjam.html?id_transaksi=${t.id_transaksi}" class="act-item" style="text-decoration:none;cursor:pointer">
              <div class="act-dot-wrap"><div class="act-dot"></div></div>
              <div class="act-info">
                <div class="act-title">${t.nama_barang}</div>
                <div class="act-time">${t.jenis_transaksi.toUpperCase()} · Status: ${t.status}</div>
              </div>
              <div class="act-pts" style="font-size:12px;color:${t.status==='selesai'?'#00917C':'#F28C28'}">
                Rp${Number(t.total_harga).toLocaleString('id-ID')}
              </div>
            </a>
          `).join('');
        }
      }
    }
  } catch (_e) {
    // Preserve default fallback values
  }

  // Logout handler
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await fetch('/api/logout', { method: 'POST' });
      } catch (_e) {}
      localStorage.removeItem('km_token');
      localStorage.removeItem('km_sesi');
      window.location.href = '/masuk.html';
    });
  }

  // Badge interactive feedback
  badgeCircles.forEach(badge => {
    badge.addEventListener('click', () => {
      const label = badge.parentElement.querySelector('.badge-label')?.textContent || 'Lencana';
      alert(`🏆 Lencana "${label}" telah Anda buka berkat kontribusi aktif dalam berbagi barang di KampusCircle!`);
    });
  });
});
