// public/js/profil.js
// Handles user profile display, live Green Points metrics from /api/saya, badge info, my items management, and logout

function escHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

document.addEventListener('DOMContentLoaded', async () => {
  const userName = document.getElementById('userName');
  const userDept = document.getElementById('userDept');
  const greenPointsVal = document.getElementById('greenPointsVal');
  const greenPointCard = document.getElementById('greenPointCard');
  const greenProgress = document.getElementById('greenProgress');
  const progressFill = document.getElementById('progressFill');
  const levelNext = document.getElementById('levelNext');
  const statDipinjamkan = document.getElementById('statDipinjamkan');
  const statDisewakan = document.getElementById('statDisewakan');
  const statDipakaiUlang = document.getElementById('statDipakaiUlang');
  const logoutBtn = document.getElementById('logoutBtn');
  const badgeCircles = document.querySelectorAll('.badge-circle');

  let currentUserFoto = null;
  let currentUserName = 'Rina Maharani';

  function getInitials(name) {
    if (!name) return 'KC';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  function renderAvatar(foto, name) {
    const avatarCircle = document.getElementById('avatarCircle');
    if (!avatarCircle) return;
    const fotoInput = document.getElementById('fotoInput');
    if (foto) {
      avatarCircle.innerHTML = `<img src="${foto}" alt="${name || 'Pengguna'}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
    } else {
      const initials = getInitials(name);
      avatarCircle.innerHTML = `<div style="width:100%;height:100%;background:#DCFCE7;color:#007A68;font-size:22px;font-weight:700;display:flex;align-items:center;justify-content:center;border-radius:50%;">${initials}</div>`;
    }
    if (fotoInput) avatarCircle.appendChild(fotoInput);
  }

  function kompresGambar(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Gagal memuat data gambar.'));
        img.onload = () => {
          const max = 720;
          const skala = Math.min(1, max / Math.max(img.width, img.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * skala);
          canvas.height = Math.round(img.height * skala);
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // Try fetching live user session data
  try {
    const data = await KM.get('/saya');
    if (data.nama && userName) {
      userName.textContent = data.nama;
      currentUserName = data.nama;
    }
    currentUserFoto = data.foto || null;
    renderAvatar(currentUserFoto, currentUserName);
    if (data.prodi && userDept) {
      userDept.textContent = `${data.prodi} · Angkatan ${data.angkatan || '2023'}`;
    }

    // Poin Hijau hanya untuk mahasiswa. Akun pemilik kost tidak boleh
    // melihat komponen ini sama sekali.
    const role = String(data.role || 'pelanggan').toLowerCase();
    const isOwner = role === 'pemilik_kost';
    const isMahasiswa = role === 'mahasiswa' || role === 'pelanggan';
    const homeTarget = isOwner ? 'kos-owner.html' : 'beranda.html';

    const navProfilHome = document.getElementById('navProfilHome');
    if (navProfilHome) {
      navProfilHome.setAttribute('href', homeTarget);
      navProfilHome.addEventListener('click', (e) => {
        e.preventDefault();
        goToHome();
      });
    }

    const navProfilPlus = document.getElementById('navProfilPlus');
    if (navProfilPlus && isOwner) {
      navProfilPlus.setAttribute('href', 'kos-owner.html?action=tambah-properti');
      navProfilPlus.setAttribute('aria-label', 'Unggah Properti Kost');
    }

    if (isOwner) {
      const secBarangSaya = document.getElementById('secBarangSaya');
      if (secBarangSaya) secBarangSaya.style.display = 'none';
    }

    if (greenPointCard) greenPointCard.hidden = !isMahasiswa;

    if (isMahasiswa && greenPointsVal) {
      const pts = Number(data.green_points || 0);
      const TARGET = 500;
      const sisa = Math.max(TARGET - pts, 0);
      const pct = Math.max(0, Math.min(Math.round((pts / TARGET) * 100), 100));

      greenPointsVal.textContent = pts.toLocaleString('id-ID');
      if (progressFill) progressFill.style.width = `${pct}%`;
      if (greenProgress) greenProgress.setAttribute('aria-valuenow', String(pts));
      if (levelNext) {
        levelNext.textContent = pts >= TARGET
          ? 'Lencana Sahabat Bumi sudah terbuka. Terus kumpulkan poin!'
          : `${sisa} poin lagi menuju lencana Sahabat Bumi`;
      }

      // Direct link to Dompet Green Point
      if (greenPointCard) {
        greenPointCard.style.cursor = 'pointer';
        greenPointCard.addEventListener('click', () => {
          window.location.href = '/green-point.html';
        });
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

      // Render real activities list with proper routing
      const activityList = document.getElementById('activityList');
      if (activityList && data.transaksi && data.transaksi.length > 0) {
        const esc = KM.esc || ((s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
        activityList.innerHTML = data.transaksi.slice(0, 5).map(t => {
          let targetUrl = `/status-pinjam.html?id_transaksi=${t.id_transaksi}`;
          if (t.jenis_transaksi === 'sewa') {
            targetUrl = `/status-sewa.html?id_transaksi=${t.id_transaksi}`;
          } else if (t.jenis_transaksi === 'beli') {
            targetUrl = `/status-beli.html?id_transaksi=${t.id_transaksi}`;
          }
          const jenisBadge = t.jenis_transaksi === 'pinjam' ? 'Pinjam' : (t.jenis_transaksi === 'sewa' ? 'Sewa' : 'Beli');
          const statusText = t.status === 'selesai' ? 'Selesai' : (t.status === 'batal' ? 'Dibatalkan' : 'Berjalan');

          // Tampilkan poin atau nominal harga
          const pt = (data.riwayat_poin || []).find(p => p.id_transaksi === t.id_transaksi);
          let ptsLabel = '';
          if (pt && pt.jumlah_poin > 0) {
            ptsLabel = `+${pt.jumlah_poin} Poin`;
          } else if (t.status === 'selesai') {
            ptsLabel = `+20 Poin`;
          } else {
            ptsLabel = t.total_harga > 0 ? `Rp${Number(t.total_harga).toLocaleString('id-ID')}` : 'Gratis';
          }

          return `
            <a href="${targetUrl}" class="act-item" style="text-decoration:none;color:inherit;cursor:pointer">
              <div class="act-dot-wrap"><div class="act-dot"></div></div>
              <div class="act-info">
                <div class="act-title">${esc(t.nama_barang || 'Barang Kampus')}</div>
                <div class="act-time">${jenisBadge} · Status: ${statusText}</div>
              </div>
              <div class="act-pts" style="font-size:12px;color:${t.status==='selesai'?'#008F83':'#F28C28'}">
                ${ptsLabel}
              </div>
            </a>
          `;
        }).join('');
      }
    }
  } catch (_e) {
    KM.ui.error('Gagal Memuat Profil', 'Data profil tidak bisa diambil. Periksa koneksi kamu atau masuk kembali.');
  }

  const avatarCircle = document.getElementById('avatarCircle');
  const fotoInput = document.getElementById('fotoInput');
  const sheetFotoProfil = document.getElementById('sheetFotoProfil');
  const btnPilihFoto = document.getElementById('btnPilihFoto');
  const txtPilihFoto = document.getElementById('txtPilihFoto');
  const btnHapusFoto = document.getElementById('btnHapusFoto');
  const btnBatalFoto = document.getElementById('btnBatalFoto');

  const bukaSheetFoto = () => {
    if (!sheetFotoProfil) return;
    if (currentUserFoto) {
      if (btnHapusFoto) btnHapusFoto.style.display = 'flex';
      if (txtPilihFoto) txtPilihFoto.textContent = 'Ganti foto';
    } else {
      if (btnHapusFoto) btnHapusFoto.style.display = 'none';
      if (txtPilihFoto) txtPilihFoto.textContent = 'Unggah foto';
    }
    sheetFotoProfil.style.display = 'flex';
  };

  const tutupSheetFoto = () => {
    if (sheetFotoProfil) sheetFotoProfil.style.display = 'none';
  };

  if (avatarCircle) {
    avatarCircle.addEventListener('click', (e) => {
      e.stopPropagation();
      bukaSheetFoto();
    });
  }

  if (btnPilihFoto && fotoInput) {
    btnPilihFoto.addEventListener('click', () => {
      tutupSheetFoto();
      fotoInput.click();
    });
  }

  if (btnHapusFoto) {
    btnHapusFoto.addEventListener('click', async () => {
      tutupSheetFoto();
      const yakin = await KM.ui.konfirmasi({
        judul: 'Hapus foto profil?',
        teks: 'Foto profil akan dihapus dan kembali ke avatar inisial.',
        teksYa: 'Hapus',
        teksBatal: 'Batal',
        danger: true,
      });
      if (!yakin) return;

      KM.ui.loading('Menghapus foto...');
      try {
        await KM.del('/profil/foto');
        currentUserFoto = null;
        renderAvatar(null, currentUserName);
        const u = KM.getUser ? KM.getUser() : null;
        if (u) {
          u.foto = null;
          if (KM.setUser) KM.setUser(u);
          else localStorage.setItem('km_user', JSON.stringify(u));
        }
        KM.ui.tutup();
        KM.ui.toast('Foto profil berhasil dihapus');
      } catch (err) {
        KM.ui.tutup();
        KM.ui.error('Gagal Menghapus Foto', err.message || 'Foto profil tidak bisa dihapus.');
      }
    });
  }

  if (btnBatalFoto) {
    btnBatalFoto.addEventListener('click', tutupSheetFoto);
  }

  if (sheetFotoProfil) {
    sheetFotoProfil.addEventListener('click', (e) => {
      if (e.target === sheetFotoProfil) tutupSheetFoto();
    });
  }

  if (fotoInput) {
    fotoInput.addEventListener('change', async () => {
      const file = fotoInput.files?.[0];
      if (!file) return;

      if (file.size > 5 * 1024 * 1024) {
        KM.ui.error('Ukuran File Terlalu Besar', 'Maksimal ukuran foto adalah 5 MB.');
        fotoInput.value = '';
        return;
      }

      KM.ui.loading('Mengompres dan mengunggah foto...');
      try {
        const compressed = await kompresGambar(file);
        const resp = await KM.patch('/profil/foto', { foto: compressed });
        currentUserFoto = resp?.foto || compressed;
        renderAvatar(currentUserFoto, currentUserName);
        const u = KM.getUser ? KM.getUser() : null;
        if (u) {
          u.foto = currentUserFoto;
          if (KM.setUser) KM.setUser(u);
          else localStorage.setItem('km_user', JSON.stringify(u));
        }
        KM.ui.tutup();
        KM.ui.toast('Foto profil berhasil diperbarui');
      } catch (e) {
        KM.ui.tutup();
        KM.ui.error('Gagal Mengunggah Foto', e.message || 'Foto profil tidak bisa disimpan. Coba lagi.');
      } finally {
        fotoInput.value = '';
      }
    });
  }
  if (logoutBtn) {
    logoutBtn.addEventListener('click', KM.logout);
  }

  // Badge interactive feedback
  badgeCircles.forEach(badge => {
    badge.addEventListener('click', () => {
      const label = badge.parentElement.querySelector('.badge-label')?.textContent || 'Lencana';
      KM.ui.info('Lencana Terbuka! 🏆', `Lencana "${label}" telah Anda buka berkat kontribusi aktif dalam berbagi barang di KampusCircle!`);
    });
  });

  // Section Kelola Barang Unggahan Saya & Up Lagi
  const myItemsList = document.getElementById('myItemsList');
  async function muatBarangSaya() {
    if (!myItemsList) return;
    try {
      const items = await KM.get('/barang-saya');

      // Tampilkan notifikasi jika baru saja mengunggah barang
      const uploadSuccessMsg = sessionStorage.getItem('kc_toast_profil');
      let bannerHtml = '';
      if (uploadSuccessMsg) {
        bannerHtml = `
          <div id="uploadSuccessBanner" style="background:#ECFDF5;border:1px solid #A7F3D0;border-radius:12px;padding:10px 14px;color:#065F46;font-size:12px;font-weight:600;display:flex;align-items:center;gap:8px;animation:fadeIn 0.3s ease;">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            <span>${escHtml(uploadSuccessMsg)}</span>
          </div>
        `;
        sessionStorage.removeItem('kc_toast_profil');
        setTimeout(() => {
          const sec = document.getElementById('secBarangSaya');
          if (sec) sec.scrollIntoView({ behavior: 'smooth' });
        }, 300);
      }

      if (!items || items.length === 0) {
        myItemsList.innerHTML = bannerHtml + `
          <div class="empty-state">
            <div class="empty-state-icon">
              <svg viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
            </div>
            <div class="empty-state-title">Belum ada barang diunggah</div>
            <div class="empty-state-desc">Kamu belum memiliki barang yang diunggah. Mulai sewakan atau jual barangmu sekarang.</div>
            <a href="/unggah.html" class="empty-state-btn">Unggah Barang Sekarang</a>
          </div>`;
        return;
      }

      myItemsList.innerHTML = bannerHtml + items.map(item => {
        const isTerjual = item.status === 'terjual';
        const isDisewa = item.status === 'disewa';
        const isDipinjam = item.status === 'dipinjam';

        let badgeBg = '#DCFCE7', badgeColor = '#166534', badgeText = '✓ Aktif di Beranda';
        let statusLink = `/detail.html?id=${item.id_barang}`;
        let statusLinkText = 'Lihat di Katalog';
        let userNotes = '';

        if (isTerjual) {
          badgeBg = '#FEE2E2';
          badgeColor = '#991B1B';
          badgeText = 'Sudah Terjual';
          statusLink = item.id_transaksi ? `/status-beli.html?id_transaksi=${item.id_transaksi}` : `/detail.html?id=${item.id_barang}`;
          statusLinkText = 'Cek Detail Penjualan';
          if (item.nama_pembeli_penyewa) {
            userNotes = `<div style="font-size:11px;color:#0F172A;margin-top:2px;">Pembeli: <b>${escHtml(item.nama_pembeli_penyewa)}</b></div>`;
          }
        } else if (isDisewa) {
          badgeBg = '#FEF3C7';
          badgeColor = '#B45309';
          badgeText = 'Sedang Disewa';
          statusLink = item.id_transaksi ? `/status-sewa.html?id_transaksi=${item.id_transaksi}` : `/detail.html?id=${item.id_barang}`;
          statusLinkText = 'Cek Status Sewa';
          if (item.nama_pembeli_penyewa) {
            userNotes = `<div style="font-size:11px;color:#0F172A;margin-top:2px;">Penyewa: <b>${escHtml(item.nama_pembeli_penyewa)}</b></div>`;
          }
        } else if (isDipinjam) {
          badgeBg = '#EDE9FE';
          badgeColor = '#6D28D9';
          badgeText = 'Sedang Dipinjam';
          statusLink = item.id_transaksi ? `/status-pinjam.html?id_transaksi=${item.id_transaksi}` : `/detail.html?id=${item.id_barang}`;
          statusLinkText = 'Cek Status Pinjam';
          if (item.nama_pembeli_penyewa) {
            userNotes = `<div style="font-size:11px;color:#0F172A;margin-top:2px;">Peminjam: <b>${escHtml(item.nama_pembeli_penyewa)}</b></div>`;
          }
        }

        const priceText = item.harga_jual ? `Rp${Number(item.harga_jual).toLocaleString('id-ID')}` : (item.harga_sewa ? `Rp${Number(item.harga_sewa).toLocaleString('id-ID')}/hari` : 'Gratis Pinjam');
        const fotoSrc = (item.foto && !item.foto.includes('AARCAAEAAEDASIAAhEBAxEB')) ? (typeof KM !== 'undefined' && KM.getFoto ? KM.getFoto(item.foto) : item.foto) : '/img/kalkulator-casio.png';

        const canUpLagi = isDisewa || isDipinjam;

        return `
          <div class="my-item-card" style="background:#FFFFFF;border:1px solid #E2E8F0;border-radius:14px;padding:12px 14px;display:flex;flex-direction:column;gap:10px;box-shadow:0 1px 3px rgba(0,0,0,0.02);">
            <div style="display:flex;align-items:flex-start;gap:12px;cursor:pointer;" onclick="window.location.href='${statusLink}'">
              <div style="width:56px;height:56px;border-radius:10px;background:#F1F5F9;overflow:hidden;flex-shrink:0;">
                <img src="${fotoSrc}" alt="${escHtml(item.nama_barang)}" style="width:100%;height:100%;object-fit:cover;">
              </div>
              <div style="flex:1;min-width:0;">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:2px;gap:6px;">
                  <span style="font-size:10px;font-weight:700;color:${badgeColor};background:${badgeBg};padding:2px 7px;border-radius:6px;">${badgeText}</span>
                  <span style="font-size:11px;font-weight:700;color:#008F83;">${priceText}</span>
                </div>
                <div style="font-size:13px;font-weight:700;color:#0F172A;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escHtml(item.nama_barang)}</div>
                <div style="font-size:11px;color:#64748B;">Lokasi: ${escHtml(item.lokasi || 'Fakultas Teknik')}</div>
                ${userNotes}
              </div>
            </div>

            <!-- Action Link Button -->
            <div style="display:flex;align-items:center;gap:8px;padding-top:4px;border-top:1px dashed #F1F5F9;">
              <a href="${statusLink}" style="flex:1;height:32px;background:#F8FAFC;border:1px solid #CBD5E1;color:#0F172A;border-radius:8px;font-size:11.5px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:5px;text-decoration:none;transition:background .15s;">
                <span>${statusLinkText}</span>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </a>
              ${canUpLagi ? `
                <button class="btn-up-lagi" data-id="${item.id_barang}" style="flex:1.2;height:32px;background:#008F83;color:#FFFFFF;border:none;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px;transition:background .15s;">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"/></svg>
                  Up Lagi ke Beranda
                </button>
              ` : ''}
            </div>
          </div>
        `;
      }).join('');

      // Add click event for "Up Lagi" buttons
      document.querySelectorAll('.btn-up-lagi').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.preventDefault();
          e.stopPropagation();
          const id = btn.dataset.id;
          btn.disabled = true;
          btn.textContent = 'Memproses Up Lagi...';
          try {
            const resp = await KM.post('/barang/' + id + '/up');
            await KM.ui.sukses('Barang Di-up Lagi', resp.pesan || 'Barang berhasil di-up lagi dan tampil kembali di beranda!');
            muatBarangSaya();
          } catch (err) {
            KM.ui.error('Gagal Up Lagi', err.message || 'Barang tidak bisa di-up. Coba lagi sebentar lagi.');
            btn.disabled = false;
            btn.textContent = 'Up Lagi ke Beranda';
          }
        });
      });
    } catch (_err) {
      myItemsList.innerHTML = `<div style="font-size:12px;color:#94A3B8;text-align:center;padding:12px;">Gagal memuat barang saya.</div>`;
      KM.ui.error('Gagal Memuat Barang', 'Daftar barang kamu tidak bisa dimuat. Periksa koneksi kamu.');
    }
  }

  muatBarangSaya();
});
