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
    const data = await KM.get('/saya');
    if (data.nama && userName) {
      userName.textContent = data.nama;
    }
    if (data.foto && document.querySelector('.avatar-circle img')) {
      document.querySelector('.avatar-circle img').src = data.foto;
    }
    if (data.prodi && userDept) {
      userDept.textContent = `${data.prodi} · Angkatan ${data.angkatan || '2023'}`;
    }
    if (greenPointsVal) {
      const pts = Number(data.green_points || 350);
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
        levelName.textContent = 'Level 2: Green Contributor';
        levelNext.textContent = `${pts}/500 Poin Menuju Level 3`;
        const pct = Math.max(Math.min(Math.round((pts / 500) * 100), 95), 15);
        progressFill.style.width = `${pct}%`;
      }
    }

    if (data.transaksi && Array.isArray(data.transaksi)) {
      const sewaCount = data.transaksi.filter(t => t.jenis_transaksi === 'sewa').length;
      const beliCount = data.transaksi.filter(t => t.jenis_transaksi === 'beli').length;
      const pinjamCount = data.transaksi.filter(t => t.jenis_transaksi === 'pinjam').length;
      if (statDisewakan && sewaCount > 0) statDisewakan.textContent = sewaCount;
      if (statDipakaiUlang && beliCount > 0) statDipakaiUlang.textContent = beliCount;
      if (statDipinjamkan && pinjamCount > 0) statDipinjamkan.textContent = pinjamCount;

      // Show owner dashboard link for pemilik_kost
      if (data.role === 'pemilik_kost') {
        const navProfil = document.querySelector('.nav .item.active');
        if (navProfil) {
          const ownerLink = document.createElement('a');
          ownerLink.href = '/kos-owner.html';
          ownerLink.className = 'item';
          ownerLink.innerHTML = `
            <div class="box">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#00917C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <path d="M3 9l18-6-18 6z"/>
              </svg>
            </div>
            <span class="lbl">Kelola Kost</span>
          `;
          navProfil.parentNode.insertBefore(ownerLink, navProfil.nextSibling);
        }
      }

      // Render real activities list with proper routing if needed
      const activityList = document.getElementById('activityList');
      if (activityList && data.transaksi.length > 0 && false) {
        activityList.innerHTML = data.transaksi.slice(0, 5).map(t => {
          let targetUrl = `/status-pinjam.html?id_transaksi=${t.id_transaksi}`;
          if (t.jenis_transaksi === 'sewa') {
            targetUrl = `/status-sewa.html?id_transaksi=${t.id_transaksi}`;
          } else if (t.jenis_transaksi === 'beli') {
            targetUrl = `/status-beli.html?id_transaksi=${t.id_transaksi}`;
          }
          const jenisBadge = t.jenis_transaksi.toUpperCase();
          const hargaLabel = t.total_harga > 0 ? `Rp${Number(t.total_harga).toLocaleString('id-ID')}` : 'Gratis';

          return `
            <a href="${targetUrl}" class="act-item" style="text-decoration:none;cursor:pointer">
              <div class="act-dot-wrap"><div class="act-dot"></div></div>
              <div class="act-info">
                <div class="act-title">${t.nama_barang || 'Barang Kampus'}</div>
                <div class="act-time">${jenisBadge} · Status: ${t.status}</div>
              </div>
              <div class="act-pts" style="font-size:12px;color:${t.status==='selesai'?'#00917C':'#F28C28'}">
                ${hargaLabel}
              </div>
            </a>
          `;
        }).join('');
      }
    }
  } catch (_e) {
    // Preserve default fallback values
  }

  const avatarCircle = document.getElementById('avatarCircle');
  const fotoInput = document.getElementById('fotoInput');
  if (avatarCircle && fotoInput) {
    avatarCircle.addEventListener('click', () => fotoInput.click());
    fotoInput.addEventListener('change', async () => {
      const file = fotoInput.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const resp = await KM.patch('/profil/foto', { foto: reader.result });
          if (resp?.foto) avatarCircle.innerHTML = `<img src="${resp.foto}" alt="foto" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
        } catch (e) { console.warn(e); }
      };
      reader.readAsDataURL(file);
    });
  }
  if (logoutBtn) {
    logoutBtn.addEventListener('click', KM.logout);
  }

  // Badge interactive feedback
  badgeCircles.forEach(badge => {
    badge.addEventListener('click', () => {
      const label = badge.parentElement.querySelector('.badge-label')?.textContent || 'Lencana';
      alert(`🏆 Lencana "${label}" telah Anda buka berkat kontribusi aktif dalam berbagi barang di KampusCircle!`);
    });
  });
});
