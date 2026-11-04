// Route Guard: Mahasiswa tidak boleh masuk dashboard pemilik kost
(function() {
  const currentRole = localStorage.getItem('role') || localStorage.getItem('km_role');
  if (currentRole === 'mahasiswa' || currentRole === 'pelanggan') {
    window.location.replace('beranda.html');
  }
})();

const { api, rp, esc } = window.KM;

// State
let state = {
  activeTab: 'beranda',
  properties: [],
  selectedProp: null,
};

// UI Elements
const toastEl = document.getElementById('toast-el');
const toastText = document.getElementById('toast-text');

function showToast(text, duration = 3000) {
  if (window.KM && KM.ui && KM.ui.toast) {
    KM.ui.toast(text);
    return;
  }
  if (!toastEl || !toastText) return;
  toastText.textContent = text;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), duration);
}

let currentUser = null;

async function checkAuth() {
  try {
    currentUser = await api('/saya');
    if (!currentUser) {
      window.location.href = '/masuk-kost.html';
      return false;
    }
    if (currentUser.role) {
      localStorage.setItem('role', currentUser.role);
      localStorage.setItem('km_role', currentUser.role);
    }
    if (currentUser.role === 'mahasiswa' || currentUser.role === 'pelanggan') {
      window.location.replace('beranda.html');
      return false;
    }
    if (currentUser.role !== 'pemilik_kost' && currentUser.role !== 'admin') {
      window.location.replace('beranda.html');
      return false;
    }
    return true;
  } catch (_e) {
    window.location.href = '/masuk-kost.html';
    return false;
  }
}

function renderProfile(user) {
  if (!user) return;
  const nameEl = document.getElementById('owner-display-name');
  if (nameEl) nameEl.textContent = user.nama || 'Pemilik Kost';

  const greetingEl = document.querySelector('.owner-greeting');
  if (greetingEl) greetingEl.textContent = `Selamat datang, ${user.nama || 'Pemilik Kost'}`;

  const tabAkunName = document.querySelector('#tab-akun .owner-name');
  if (tabAkunName) tabAkunName.textContent = user.nama || 'Pemilik Kost';

  const tabAkunEmail = document.querySelector('#tab-akun .owner-greeting');
  if (tabAkunEmail) {
    const ownerCode = `OWN-${String(user.id_mahasiswa || 1).padStart(3, '0')}`;
    tabAkunEmail.textContent = `${user.email || ''} · ${ownerCode}`;
  }

  if (user.foto) {
    document.querySelectorAll('.owner-avatar').forEach(img => {
      img.src = user.foto;
    });
  }
}

function updateDashboardMetrics(properties, user) {
  const totalPropEl = document.getElementById('stat-total-prop');
  const kamarTerisiEl = document.getElementById('stat-kamar-terisi');
  const kamarKosongEl = document.getElementById('stat-kamar-kosong');
  const pendapatanEl = document.getElementById('stat-pendapatan');

  const totalProp = properties.length;
  let totalKosong = 0;
  let totalTerisi = 0;
  let estimasiPendapatan = 0;

  properties.forEach(p => {
    const kosong = Number(p.kamar_tersedia) || 0;
    totalKosong += kosong;
    const total = p.total_kamar != null ? Number(p.total_kamar) : (p.jumlah_kamar != null ? Number(p.jumlah_kamar) : kosong);
    const terisi = Math.max(0, total - kosong);
    totalTerisi += terisi;
    estimasiPendapatan += terisi * (p.harga_bulan || 0);
  });

  if (totalPropEl) totalPropEl.textContent = totalProp;
  if (kamarTerisiEl) kamarTerisiEl.textContent = totalTerisi;
  if (kamarKosongEl) kamarKosongEl.textContent = totalKosong;
  if (pendapatanEl) {
    if (estimasiPendapatan >= 1000000) {
      pendapatanEl.textContent = `Rp${(estimasiPendapatan / 1000000).toFixed(1).replace('.0', '')} jt`;
    } else {
      pendapatanEl.textContent = rp(estimasiPendapatan);
    }
  }
}

// Pengajuan Sewa Kos State & Loader
let currentPengajuan = null;

// Helper untuk membersihkan overlay / backdrop modal dan SweetAlert yang tersisa
function bersihkanOverlay() {
  document.querySelectorAll('.modal-overlay:not(.open)').forEach(el => {
    el.style.display = 'none';
    el.style.pointerEvents = 'none';
  });
  document.querySelectorAll('.fullscreen-view:not(.open)').forEach(el => {
    el.style.display = 'none';
    el.style.pointerEvents = 'none';
  });
  document.querySelectorAll('.modal-overlay.open, .fullscreen-view.open').forEach(el => {
    el.style.display = 'flex';
    el.style.pointerEvents = 'auto';
  });
  // Hapus elemen backdrop/container SweetAlert yang tersisa
  document.querySelectorAll('.swal2-container').forEach(el => {
    if (!el.classList.contains('swal2-shown') || el.style.display === 'none') {
      el.remove();
    }
  });
  if (!document.querySelector('.swal2-container.swal2-shown')) {
    document.body.classList.remove('swal2-shown', 'swal2-height-auto');
  }
}

// Buka modal pengajuan sewa detail dengan data dinamis
function bukaModalPengajuanDetail(item) {
  if (!item) return;
  currentPengajuan = item;

  const modalPengajuan = document.getElementById('modal-pengajuan-sewa');
  if (!modalPengajuan) return;

  // Render detail data pemohon secara dinamis ke dalam modal
  const avatarEl = modalPengajuan.querySelector('.tenant-avatar') || document.getElementById('modal-tenant-avatar');
  if (avatarEl && item.avatar_penyewa) avatarEl.src = item.avatar_penyewa;

  const nameEl = document.getElementById('modal-tenant-name');
  if (nameEl) nameEl.textContent = item.nama_penyewa || 'Mahasiswa';

  const subEl = document.getElementById('modal-tenant-sub');
  if (subEl) subEl.textContent = `${item.email_penyewa || 'Mahasiswa Terverifikasi'} · USR-${String(item.user_id || 1).padStart(3, '0')}`;

  const kosEl = document.getElementById('modal-tenant-kos');
  if (kosEl) kosEl.textContent = `${item.nama_kos || 'Kost'} - ${item.kamar || 'Kamar'}`;

  const periodeEl = document.getElementById('modal-tenant-periode');
  if (periodeEl) periodeEl.textContent = item.periode || 'Periode sewa';

  const totalEl = document.getElementById('modal-tenant-total');
  if (totalEl) {
    const durasi = item.durasi_bulan || 3;
    const total = item.total_harga ? `Rp${Number(item.total_harga).toLocaleString('id-ID')}` : '';
    totalEl.textContent = `${durasi} bulan · ${total}`;
  }

  modalPengajuan.style.display = 'flex';
  modalPengajuan.classList.add('open');
}

// 3. Tampilkan Pesanan Masuk di Dashboard Pemilik: fetchPesananMasuk() memanggil GET /api/pesanan-masuk
export async function fetchPesananMasuk() {
  const pendingRentList = document.getElementById('pending-rent-list');
  const btnPengajuanBanner = document.getElementById('btn-pengajuan-banner');
  if (!pendingRentList) return [];

  try {
    let list = null;
    try {
      list = await api('/pesanan-masuk');
    } catch (_e1) {
      try {
        list = await api('/kos/pesanan-masuk');
      } catch (_e2) {
        try {
          list = await api('/kos/pengajuan');
        } catch (_e3) {
          list = [];
        }
      }
    }

    if (!Array.isArray(list) || list.length === 0) {
      pendingRentList.innerHTML = '';
      currentPengajuan = null;
      if (btnPengajuanBanner) btnPengajuanBanner.style.display = 'none';
      return [];
    }

    currentPengajuan = list[0];
    const count = list.length;

    // Update banner di tab properti jika ada
    if (btnPengajuanBanner) {
      btnPengajuanBanner.style.display = 'block';
      btnPengajuanBanner.textContent = `Pengajuan Sewa · ${count} baru`;
    }

    // Render data JSON yang dikembalikan ke dalam kontainer "Pengajuan sewa baru" secara dinamis
    pendingRentList.innerHTML = list.map((item, idx) => {
      const idPengajuan = item.id_pengajuan || item.id_pesanan || (idx + 1);
      const namaPenyewa = item.nama_penyewa || 'Mahasiswa';
      const namaKamar = item.kamar || 'Kamar Kos';
      const periodeTeks = item.periode ? item.periode.split('–')[0].trim() : 'Mulai segera';
      const namaKos = item.nama_kos || 'Kost Anda';
      const durasi = item.durasi_bulan ? `${item.durasi_bulan} bulan` : '';

      return `
        <div class="notice-banner-card" id="rent-card-${idPengajuan}">
          <div class="notice-header">
            <svg class="notice-icon" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
            <div>
              <div class="notice-title">Pengajuan sewa baru · ${esc(namaKos)}</div>
              <div class="notice-sub">${esc(namaPenyewa)} · ${esc(namaKamar)} ${durasi ? `(${esc(durasi)})` : ''} · Mulai ${esc(periodeTeks)}</div>
            </div>
          </div>
          <button class="btn-notice-action btn-lihat-pengajuan" data-id="${idPengajuan}">Lihat Pengajuan Sewa</button>
        </div>
      `;
    }).join('');

    // Pasang click listener pada setiap tombol "Lihat Pengajuan Sewa"
    pendingRentList.querySelectorAll('.btn-lihat-pengajuan').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = Number(btn.dataset.id);
        const selected = list.find(it => (it.id_pengajuan || it.id_pesanan) == id) || list[0];
        if (selected) {
          bukaModalPengajuanDetail(selected);
        }
      });
    });

    return list;
  } catch (err) {
    console.error('Gagal memuat pesanan masuk:', err);
    pendingRentList.innerHTML = '';
    return [];
  }
}

// Alias agar kompatibel
export const muatPengajuanSewa = fetchPesananMasuk;
if (typeof window !== 'undefined') {
  window.fetchPesananMasuk = fetchPesananMasuk;
}

// Load properties & stats
async function init() {
  const isAuth = await checkAuth();
  if (!isAuth) return;

  renderProfile(currentUser);

  try {
    const list = await api('/kos/miliku').catch(() => []);
    state.properties = Array.isArray(list) ? list : [];

    updateDashboardMetrics(state.properties, currentUser);
    renderPropertiList(currentUser);
    await fetchPesananMasuk();
  } catch (err) {
    console.error(err);
    KM.ui.error('Gagal Memuat Data', err.message || 'Tidak bisa mengambil daftar properti.');
  }
}

function renderPropertiList(user) {
  const container = document.getElementById('list-properti-container');
  if (!container) return;

  const countEl = document.getElementById('prop-counter-title');
  const ownerName = user?.nama || currentUser?.nama || 'Anda';
  if (countEl) countEl.textContent = `${state.properties.length} properti milik ${ownerName}`;

  if (state.properties.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:36px 16px;background:#FFFFFF;border:1.5px dashed #CBD5E1;border-radius:16px;margin-top:8px">
        <svg viewBox="0 0 24 24" style="width:44px;height:44px;fill:#94A3B8;margin-bottom:8px"><path d="M12 3L2 12h3v8h14v-8h3L12 3zm0 3.84L17 11v7H7v-7l5-4.16z"/></svg>
        <div style="font-size:14px;font-weight:700;color:#0F172A">Belum Ada Properti Kos</div>
        <div style="font-size:12px;color:#64748B;margin-top:4px;line-height:1.4">Anda belum memiliki kos terdaftar. Klik tombol <strong>+ Tambah Properti</strong> di atas untuk mengunggah kos pertama Anda.</div>
      </div>
    `;
    return;
  }

  container.innerHTML = state.properties.map(p => {
    let fotoSrc = '/img/kos-ananda-dago.png';
    if (p.foto) {
      try {
        const parsed = typeof p.foto === 'string' && p.foto.startsWith('[') ? JSON.parse(p.foto) : p.foto;
        if (Array.isArray(parsed) && parsed.length) fotoSrc = parsed[0];
        else if (typeof parsed === 'string') fotoSrc = parsed;
      } catch (_e) {}
    }

    const tipeBadge = p.tipe_kos ? (p.tipe_kos.charAt(0).toUpperCase() + p.tipe_kos.slice(1)) : 'Campur';
    const statusPostingan = p.status_postingan || (p.status_verifikasi === 'terverifikasi' ? 'approved' : 'pending');

    let statusHtml = '';
    if (statusPostingan === 'approved') {
      statusHtml = `
        <div style="background:#E8F8F5;border:1px solid #A7F3D0;border-radius:12px;padding:10px 12px;margin-top:6px;display:flex;gap:8px;align-items:flex-start">
          <svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:#007A68;flex-shrink:0;margin-top:2px"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
          <div style="font-size:11px;color:#065F46">
            <strong>Status publikasi: Disetujui (Tayang)</strong><br>
            Kos sudah diverifikasi oleh Admin dan tayang di pencarian mahasiswa.
          </div>
        </div>
      `;
    } else if (statusPostingan === 'rejected') {
      statusHtml = `
        <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:12px;padding:10px 12px;margin-top:6px;display:flex;gap:8px;align-items:flex-start">
          <svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:#DC2626;flex-shrink:0;margin-top:2px"><path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/></svg>
          <div style="font-size:11px;color:#991B1B">
            <strong>Status publikasi: Ditolak Admin</strong><br>
            ${esc(p.alasan_penolakan || 'Dokumen atau info properti belum memenuhi syarat.')}
          </div>
        </div>
      `;
    } else {
      statusHtml = `
        <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:12px;padding:10px 12px;margin-top:6px;display:flex;gap:8px;align-items:flex-start">
          <svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:#D97706;flex-shrink:0;margin-top:2px"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14h-2v-2h2v2zm0-4h-2V7h2v5z"/></svg>
          <div style="font-size:11px;color:#92400E">
            <strong>Status publikasi: Menunggu Persetujuan Admin</strong><br>
            Sedang direview oleh Admin sebelum tayang di halaman pencarian.
          </div>
        </div>
      `;
    }

    return `
      <div class="prop-card">
        <img src="${esc(fotoSrc)}" alt="${esc(p.nama_kos)}" class="prop-img">
        <div style="display:flex;gap:6px">
          <span class="badge-mint">${esc(tipeBadge)}</span>
          <span class="badge-mint">${p.kamar_tersedia || 0} kamar tersedia</span>
        </div>
        <div class="prop-title">${esc(p.nama_kos)}</div>
        <div class="prop-price">${rp(p.harga_bulan)} <span style="font-size:11px;font-weight:400;color:#64748B">/bulan</span></div>
        <div class="prop-sub">${esc(p.alamat)}</div>
        <div class="prop-sub">${esc(ownerName)} · ${p.kamar_tersedia || 0} kamar kosong</div>

        <div class="prop-actions">
          <button class="btn-outline-teal btn-edit-prop" data-id="${p.id_kos}">Edit</button>
          <button class="btn-solid-orange btn-detail-prop" data-id="${p.id_kos}">Detail</button>
        </div>

        ${statusHtml}
      </div>
    `;
  }).join('');
}

async function openDetailProp(id) {
  const p = state.properties.find(x => x.id_kos === Number(id)) || state.properties[0];
  if (!p) return;
  state.selectedProp = p;

  document.getElementById('detail-prop-title').textContent = p.nama_kos;
  document.getElementById('detail-prop-price').innerHTML = `${rp(p.harga_bulan)} <span style="font-size:11px;font-weight:500;color:#64748B">/bulan</span>`;
  document.getElementById('detail-prop-addr').textContent = p.alamat;

  await renderRoomManager(p.id_kos || 1);

  const viewDetail = document.getElementById('view-detail-prop');
  if (viewDetail) {
    viewDetail.style.display = 'flex';
    viewDetail.classList.add('open');
  }
}

// Kamar Helpers (Shared with kos.js via backend API & localStorage)
export function getKamarKos(idKos) {
  const key = `km_kamar_kos_${idKos || 1}`;
  const saved = localStorage.getItem(key);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (_e) {}
  }
  const defaults = [
    { no: '1', nomor_kamar: 'Kamar 1', status: 'kosong', tipe: 'Standar • 3 × 3 m' },
    { no: '2', nomor_kamar: 'Kamar 2', status: 'kosong', tipe: 'Standar • 3 × 3 m' }
  ];
  localStorage.setItem(key, JSON.stringify(defaults));
  return defaults;
}

export function saveKamarKos(idKos, rooms) {
  localStorage.setItem(`km_kamar_kos_${idKos || 1}`, JSON.stringify(rooms));
}

async function renderRoomManager(idKos) {
  const container = document.getElementById('room-list-container');
  if (!container) return;

  let rooms = [];
  try {
    const res = await api(`/kos/${idKos || 1}/kamar`);
    if (Array.isArray(res) && res.length > 0) {
      rooms = res.map(r => ({
        id: r.id,
        kos_id: r.kos_id,
        no: (r.nomor_kamar || r.nama || '').replace(/^Kamar\s*/i, ''),
        nomor_kamar: r.nomor_kamar || r.nama || `Kamar ${r.id}`,
        status: r.status || 'available',
        tipe: r.tipe || 'Standar • 3 × 3 m'
      }));
      saveKamarKos(idKos, rooms);
    }
  } catch (_e) {}

  if (rooms.length === 0) {
    rooms = getKamarKos(idKos);
  }

  const kosongCount = rooms.filter(r => r.status === 'available' || r.status === 'kosong').length;
  const terisiCount = rooms.length - kosongCount;

  const summaryEl = document.getElementById('detail-prop-room-summary');
  if (summaryEl) {
    summaryEl.innerHTML = `Total: <strong>${rooms.length} kamar</strong> · Terisi: <strong>${terisiCount} kamar</strong> · Kosong: <strong style="color:#007A68">${kosongCount} kamar</strong>`;
  }

  // Update beranda stats
  const statTerisi = document.getElementById('stat-kamar-terisi');
  const statKosong = document.getElementById('stat-kamar-kosong');
  if (statTerisi) statTerisi.textContent = terisiCount;
  if (statKosong) statKosong.textContent = kosongCount;

  container.innerHTML = rooms.map(r => {
    const isKosong = (r.status === 'available' || r.status === 'kosong');
    const labelStatus = isKosong ? 'Kosong' : (r.status === 'pending' ? 'Pending' : 'Terisi');
    return `
      <div style="background:#FFFFFF;border:1px solid #E2E8F0;border-radius:10px;padding:10px 12px;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-size:13px;font-weight:700;color:#0F172A;">${esc(r.nomor_kamar || `Kamar ${r.no}`)}</div>
          <div style="font-size:11px;color:#64748B;">${esc(r.tipe || 'Standar • 3 × 3 m')}</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:11px;font-weight:700;padding:3px 8px;border-radius:6px;background:${isKosong ? '#DCFCE7' : '#FEE2E2'};color:${isKosong ? '#166534' : '#991B1B'};">
            ${esc(labelStatus)}
          </span>
          <button type="button" class="btn-toggle-room" data-no="${esc(r.no)}" data-id="${r.id || ''}" style="background:#F1F5F9;border:1.5px solid #CBD5E1;border-radius:6px;padding:5px 10px;font-size:11px;font-weight:700;cursor:pointer;color:#0F172A;">
            Ubah ke ${isKosong ? 'Terisi' : 'Kosong'}
          </button>
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.btn-toggle-room').forEach(btn => {
    btn.addEventListener('click', async () => {
      const roomNo = btn.dataset.no;
      const targetRoom = rooms.find(x => x.no === roomNo || x.nomor_kamar === roomNo);
      if (targetRoom) {
        const isCurrentlyKosong = (targetRoom.status === 'available' || targetRoom.status === 'kosong');
        const nextStatus = isCurrentlyKosong ? 'booked' : 'available';
        targetRoom.status = nextStatus;
        if (targetRoom.id) {
          try {
            await api(`/kamar-kos/${targetRoom.id}/status`, {
              method: 'PATCH',
              body: { status: nextStatus }
            });
          } catch (_e) {}
        }
        saveKamarKos(idKos, rooms);
        showToast(`Status Kamar ${roomNo} diubah menjadi ${nextStatus === 'available' ? 'KOSONG' : 'TERISI'}`);
        await renderRoomManager(idKos);

        const prop = state.properties.find(x => x.id_kos === idKos) || state.properties[0];
        if (prop) {
          prop.kamar_tersedia = rooms.filter(x => x.status === 'available' || x.status === 'kosong').length;
          renderPropertiList();
        }
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  init();

  // 1. Bottom Nav Switching
  document.querySelectorAll('.owner-bottom-nav .nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;
      if (targetTab === 'chat') {
        window.location.href = '/chat.html';
        return;
      }

      document.querySelectorAll('.owner-bottom-nav .nav-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.activeTab = targetTab;

      ['beranda', 'properti', 'penyewa', 'akun'].forEach(t => {
        const el = document.getElementById('tab-' + t);
        if (el) el.style.display = (t === targetTab) ? 'block' : 'none';
      });
    });
  });

  // 2. Open Pengajuan Sewa Modal
  const modalPengajuan = document.getElementById('modal-pengajuan-sewa');
  const btnLihatPengajuan = document.getElementById('btn-lihat-pengajuan');
  const btnPengajuanBanner = document.getElementById('btn-pengajuan-banner');

  if (btnLihatPengajuan) {
    btnLihatPengajuan.addEventListener('click', () => {
      if (currentPengajuan) {
        bukaModalPengajuanDetail(currentPengajuan);
      } else if (modalPengajuan) {
        modalPengajuan.style.display = 'flex';
        modalPengajuan.classList.add('open');
      }
    });
  }
  if (btnPengajuanBanner) {
    btnPengajuanBanner.addEventListener('click', () => {
      if (currentPengajuan) {
        bukaModalPengajuanDetail(currentPengajuan);
      } else if (modalPengajuan) {
        modalPengajuan.style.display = 'flex';
        modalPengajuan.classList.add('open');
      }
    });
  }

  const btnTutupPengajuan = document.getElementById('btn-tutup-pengajuan');
  if (btnTutupPengajuan) {
    btnTutupPengajuan.addEventListener('click', () => {
      if (modalPengajuan) {
        modalPengajuan.classList.remove('open');
        modalPengajuan.style.display = 'none';
      }
      bersihkanOverlay();
    });
  }

  // 3. Action Terima / Tolak Sewa (Approval Pengajuan Sewa Kos)
  const btnTerimaSewa = document.getElementById('btn-terima-sewa') || document.querySelector('.btn-setujui-pesanan');
  const btnTolakSewa = document.getElementById('btn-tolak-sewa');

  async function handleApprovePesanan(orderId = 1) {
    const idToApprove = currentPengajuan ? (currentPengajuan.id_pengajuan || currentPengajuan.id_pesanan) : (orderId || 1);
    const namaPenyewa = currentPengajuan?.nama_penyewa || 'Rina Maharani';
    const kamarPenyewa = currentPengajuan?.kamar || 'Kamar A-09';
    const kosNama = currentPengajuan?.nama_kos || 'Kos Ananda Dago';
    const periodeSewa = currentPengajuan?.periode || '1 Nov 2026 – 31 Jan 2027';
    const durasiBulan = currentPengajuan?.durasi_bulan || 3;

    try {
      // 1. API Call terbungkus try...catch dengan await PUT /api/transaksi/:id/approve
      let res = null;
      try {
        res = await api(`/transaksi/${idToApprove}/approve`, { method: 'PUT' });
      } catch (_errPut) {
        try {
          res = await api(`/kos/pengajuan/${idToApprove}/terima`, { method: 'PATCH' });
        } catch (_errKos) {
          try {
            res = await api(`/pesanan-masuk/${idToApprove}/approve`, { method: 'PATCH' });
          } catch (_errPesanan) {
            res = await api(`/transaksi/${idToApprove}/terima`, { method: 'PATCH' });
          }
        }
      }

      // Tutup modal agar tidak menutupi dialog
      if (modalPengajuan) {
        modalPengajuan.classList.remove('open');
        modalPengajuan.style.display = 'none';
      }
      bersihkanOverlay();

      // 2. Munculkan SweetAlert2 sukses dan TUNGGU user mengeklik OK (await)
      if (typeof Swal !== 'undefined') {
        await Swal.fire({
          icon: 'success',
          title: 'Pesanan Disetujui',
          text: `Pengajuan sewa kos dari ${namaPenyewa} berhasil disetujui!`,
          confirmButtonText: 'OK',
          confirmButtonColor: '#008F83',
          buttonsStyling: false,
          customClass: {
            popup: 'rounded-2xl shadow-xl border-0',
            confirmButton: 'bg-[#007A68] text-white px-8 py-2.5 rounded-xl font-semibold hover:bg-emerald-700 transition-colors'
          }
        });
      } else if (KM.ui && KM.ui.sukses) {
        await KM.ui.sukses('Pesanan Disetujui', `Pengajuan sewa kos dari ${namaPenyewa} berhasil disetujui!`);
      }
      bersihkanOverlay();

      // 3. Update DOM secara dinamis TANPA reload halaman (hindari blank screen)
      const rentCard = document.getElementById(`rent-card-${idToApprove}`) || document.getElementById('rent-card-rina') || document.querySelector('.notice-banner-card');
      if (rentCard) {
        rentCard.remove();
      }

      // Target DOM Manipulation spesifik HANYA pada kontainer pending-rent-list
      const pendingRentList = document.getElementById('pending-rent-list');
      if (pendingRentList && !pendingRentList.querySelector('.notice-banner-card')) {
        pendingRentList.innerHTML = '';
      }

      // Sinkronkan ulang antrean pengajuan dari backend (WHERE status = 'pending')
      await fetchPesananMasuk();

      const btnBanner = document.getElementById('btn-pengajuan-banner');
      if (btnBanner && (!currentPengajuan)) btnBanner.style.display = 'none';

      // Tambahkan tenant aktif ke list beranda
      const listPenyewa = document.getElementById('list-penyewa-beranda');
      if (listPenyewa && !document.getElementById(`tenant-${idToApprove}`)) {
        const card = document.createElement('div');
        card.id = `tenant-${idToApprove}`;
        card.className = 'tenant-card';
        card.innerHTML = `
          <div class="tenant-card-header">
            <img src="${esc(currentPengajuan?.avatar_penyewa || '/img/avatar-rina-figma.png')}" alt="${esc(namaPenyewa)}" class="tenant-avatar">
            <div class="tenant-info">
              <div class="tenant-name">${esc(namaPenyewa)}</div>
              <div class="tenant-room">${esc(kosNama)} · ${esc(kamarPenyewa)}</div>
              <span class="badge-mint">Aktif · Lunas</span>
            </div>
          </div>
          <div style="font-size:11px;color:#64748B">
            Periode sewa: <strong style="color:#0F172A">${esc(periodeSewa)}</strong> (${durasiBulan} bulan)
          </div>
          <button class="btn-outline-teal btn-chat-tenant" data-name="${esc(namaPenyewa)}">Chat Penyewa</button>
        `;
        listPenyewa.prepend(card);
        card.querySelector('.btn-chat-tenant')?.addEventListener('click', () => {
          window.location.href = '/chat.html';
        });
      }

      // Update metrik kamar terisi dan kosong secara dinamis
      const kamarTerisiEl = document.getElementById('stat-kamar-terisi');
      const kamarKosongEl = document.getElementById('stat-kamar-kosong');
      if (kamarTerisiEl) kamarTerisiEl.textContent = (parseInt(kamarTerisiEl.textContent, 10) || 8) + 1;
      if (kamarKosongEl) kamarKosongEl.textContent = Math.max(0, (parseInt(kamarKosongEl.textContent, 10) || 2) - 1);

    } catch (error) {
      console.error("Error Approval:", error);
      if (typeof Swal !== 'undefined') {
        await Swal.fire({
          icon: 'error',
          title: 'Gagal Menyetujui Pesanan',
          text: error.message || 'Terjadi kesalahan saat menyetujui pesanan sewa.',
          confirmButtonText: 'Tutup',
          confirmButtonColor: '#DC2626'
        });
      } else if (KM.ui && KM.ui.error) {
        await KM.ui.error('Gagal Menyetujui Pesanan', error.message || 'Terjadi kesalahan sistem.');
      }
      bersihkanOverlay();
    }
  }

  if (btnTerimaSewa) {
    btnTerimaSewa.addEventListener('click', () => handleApprovePesanan(1));
  }

  if (btnTolakSewa) {
    btnTolakSewa.addEventListener('click', async () => {
      try {
        let yakin = false;
        const idToReject = currentPengajuan ? (currentPengajuan.id_pengajuan || currentPengajuan.id_pesanan) : 1;
        const namaPenyewa = currentPengajuan?.nama_penyewa || 'Rina Maharani';

        if (typeof Swal !== 'undefined') {
          const resConfirm = await Swal.fire({
            icon: 'warning',
            title: 'Tolak pengajuan sewa?',
            text: `Pengajuan dari ${namaPenyewa} akan ditolak dan tidak bisa dikembalikan.`,
            showCancelButton: true,
            confirmButtonText: 'Ya, Tolak',
            cancelButtonText: 'Batal',
            confirmButtonColor: '#DC2626',
            cancelButtonColor: '#64748B'
          });
          yakin = resConfirm.isConfirmed;
        } else if (KM.ui && KM.ui.konfirmasi) {
          yakin = await KM.ui.konfirmasi({
            judul: 'Tolak pengajuan sewa?',
            teks: `Pengajuan dari ${namaPenyewa} akan ditolak dan tidak bisa dikembalikan.`,
            teksYa: 'Ya, Tolak',
            teksBatal: 'Batal',
            danger: true,
          });
        }
        if (!yakin) return;

        try {
          await api(`/transaksi/${idToReject}/reject`, { method: 'PUT', body: { alasan: 'Ditolak oleh pemilik kos' } });
        } catch (_errPut) {
          try {
            await api(`/kos/pengajuan/${idToReject}/tolak`, { method: 'PATCH' });
          } catch (_errKos) {
            try {
              await api(`/pesanan-masuk/${idToReject}/reject`, { method: 'PATCH' });
            } catch (_errPesanan) {
              await api(`/transaksi/${idToReject}/tolak`, { method: 'PATCH' });
            }
          }
        }

        if (modalPengajuan) {
          modalPengajuan.classList.remove('open');
          modalPengajuan.style.display = 'none';
        }
        bersihkanOverlay();

        if (typeof Swal !== 'undefined') {
          await Swal.fire({
            icon: 'info',
            title: 'Pengajuan Ditolak',
            text: `Pengajuan sewa ${namaPenyewa} telah ditolak.`,
            confirmButtonText: 'OK',
            confirmButtonColor: '#008F83'
          });
        } else if (KM.ui && KM.ui.sukses) {
          await KM.ui.sukses('Pengajuan Ditolak', `Pengajuan sewa ${namaPenyewa} telah ditolak.`);
        }
        bersihkanOverlay();

        // Hapus card dari spesifik kontainer pending-rent-list
        const rentCard = document.getElementById(`rent-card-${idToReject}`) || document.getElementById('rent-card-rina') || document.querySelector('.notice-banner-card');
        if (rentCard) rentCard.remove();

        const pendingRentList = document.getElementById('pending-rent-list');
        if (pendingRentList && !pendingRentList.querySelector('.notice-banner-card')) {
          pendingRentList.innerHTML = '';
        }

        await fetchPesananMasuk();
      } catch (error) {
        console.error('Error Reject:', error);
        KM.ui.error('Gagal Menolak', error.message || 'Terjadi kesalahan sistem.');
        bersihkanOverlay();
      }
    });
  }

  // 4. Quick See All Tenants
  const btnSeeAllTenants = document.getElementById('btn-see-all-tenants');
  if (btnSeeAllTenants) {
    btnSeeAllTenants.addEventListener('click', () => {
      const tabPenyewa = document.querySelector('.owner-bottom-nav [data-tab="penyewa"]');
      if (tabPenyewa) tabPenyewa.click();
    });
  }

  // 5. Tambah Properti Modal
  const modalFormProp = document.getElementById('modal-form-properti');
  const btnTambahProp = document.getElementById('btn-tambah-properti');
  const btnTutupFormProp = document.getElementById('btn-tutup-form-prop');
  const formKost = document.getElementById('form-kost');

  // Foto properti: maksimal 5, dikompres jadi data URL + thumbnail preview.
  const inputPropFoto = document.getElementById('input-prop-foto');
  const previewPropFoto = document.getElementById('preview-prop-foto');
  const countPropFoto = document.getElementById('count-prop-foto');
  let propFotos = [];

  const kompresFoto = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1000;
        let width = img.width;
        let height = img.height;
        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height >= width && height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const renderPreviewProp = () => {
    if (!previewPropFoto) return;
    previewPropFoto.innerHTML = '';
    propFotos.forEach((src, idx) => {
      const wrap = document.createElement('div');
      wrap.style.cssText = 'position:relative;width:64px;height:64px;border-radius:10px;overflow:hidden;background:#E2E8F0';
      const img = document.createElement('img');
      img.src = src;
      img.alt = `Foto kost ${idx + 1}`;
      img.style.cssText = 'width:100%;height:100%;object-fit:cover';
      const hapus = document.createElement('button');
      hapus.type = 'button';
      hapus.textContent = '\u00d7';
      hapus.setAttribute('aria-label', `Hapus foto ${idx + 1}`);
      hapus.style.cssText = 'position:absolute;top:2px;right:2px;width:18px;height:18px;border:0;border-radius:50%;background:rgba(15,23,42,.7);color:#fff;font-size:12px;line-height:18px;cursor:pointer';
      hapus.addEventListener('click', () => {
        propFotos.splice(idx, 1);
        renderPreviewProp();
      });
      wrap.append(img, hapus);
      previewPropFoto.appendChild(wrap);
    });
    if (countPropFoto) countPropFoto.textContent = `${propFotos.length} dari 5 foto`;
  };

  if (inputPropFoto) {
    inputPropFoto.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files || []);
      const sisa = 5 - propFotos.length;
      if (files.length > sisa) {
        KM.ui.peringatan('Maksimal 5 Foto', 'Hanya 5 foto pertama yang akan dipakai.');
      }
      for (const file of files) {
        if (propFotos.length >= 5) break;
        try {
          propFotos.push(await kompresFoto(file));
        } catch (_err) {
          KM.ui.error('Foto Gagal Diproses', 'File foto tidak dapat dibaca. Coba pilih foto lain (JPG/PNG).');
        }
      }
      renderPreviewProp();
      inputPropFoto.value = '';
    });
  }

  const bukaModalTambahProp = () => {
    if (formKost) formKost.reset();
    propFotos = [];
    renderPreviewProp();
    if (modalFormProp) {
      modalFormProp.style.display = 'flex';
      modalFormProp.style.pointerEvents = 'auto';
      modalFormProp.classList.add('open');
    }
  };

  const tutupModalFormProp = () => {
    if (modalFormProp) {
      modalFormProp.classList.remove('open');
      modalFormProp.style.display = 'none';
      modalFormProp.style.pointerEvents = 'none';
    }
    if (formKost) formKost.reset();
    propFotos = [];
    renderPreviewProp();
    bersihkanOverlay();
  };

  if (btnTambahProp) {
    btnTambahProp.addEventListener('click', bukaModalTambahProp);
  }

  if (btnTutupFormProp) {
    btnTutupFormProp.addEventListener('click', (e) => {
      e.preventDefault();
      tutupModalFormProp();
    });
  }

  const btnXFormProp = document.getElementById('btn-x-form-prop');
  if (btnXFormProp) {
    btnXFormProp.addEventListener('click', (e) => {
      e.preventDefault();
      tutupModalFormProp();
    });
  }

  if (modalFormProp) {
    modalFormProp.addEventListener('click', (e) => {
      if (e.target === modalFormProp) {
        tutupModalFormProp();
      }
    });
  }

  if (formKost) {
    formKost.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nama = document.getElementById('input-prop-nama').value.trim();
      const alamat = document.getElementById('input-prop-alamat').value.trim();
      const harga = Number(document.getElementById('input-prop-harga').value);
      const fasilitas = document.getElementById('input-prop-fasilitas').value.trim();
      const kamar = Number(document.getElementById('input-prop-kamar').value) || 2;

      if (!nama || !alamat || !harga) {
        KM.ui.peringatan('Form Belum Lengkap', 'Mohon lengkapi nama properti, alamat, dan harga sewa.');
        return;
      }

      KM.ui.loading('Menyimpan properti...');
      try {
        await api('/kos', {
          method: 'POST',
          body: {
            nama_kos: nama,
            alamat: alamat,
            harga_bulan: harga,
            fasilitas: fasilitas,
            kamar_tersedia: kamar,
            jumlah_kamar: kamar,
            status_kos: 'tersedia',
            foto: propFotos.length > 0 ? JSON.stringify(propFotos) : undefined
          }
        });
        KM.ui.tutup();
        tutupModalFormProp();

        if (typeof Swal !== 'undefined') {
          await Swal.fire({
            icon: 'success',
            title: 'Berhasil Diunggah',
            text: 'Kos berhasil diunggah dan sedang menunggu persetujuan Admin sebelum tayang di pencarian.',
            confirmButtonText: 'OK',
            buttonsStyling: false,
            customClass: {
              popup: 'rounded-2xl shadow-xl border-0',
              title: 'text-xl font-bold text-gray-800',
              htmlContainer: 'text-gray-600 font-medium',
              confirmButton: 'bg-[#007A68] text-white px-8 py-2.5 rounded-xl font-semibold hover:bg-emerald-700 transition-colors'
            }
          });
        } else {
          await KM.ui.sukses('Kos Berhasil Diunggah', 'Kos berhasil diunggah dan sedang menunggu persetujuan Admin sebelum tayang di pencarian.');
        }
        bersihkanOverlay();

        init();
      } catch (err) {
        KM.ui.tutup();
        KM.ui.error('Gagal Menyimpan Properti', err.message || 'Properti tidak dapat disimpan. Periksa koneksi kamu lalu coba lagi.');
        bersihkanOverlay();
      }
    });
  }

  // 6. Delegated Clicks (Detail & Edit)
  document.addEventListener('click', (e) => {
    const btnDetail = e.target.closest('.btn-detail-prop');
    if (btnDetail) {
      openDetailProp(btnDetail.dataset.id);
      return;
    }

    const btnEdit = e.target.closest('.btn-edit-prop');
    if (btnEdit) {
      const p = state.properties.find(x => x.id_kos === Number(btnEdit.dataset.id));
      if (p) {
        document.getElementById('input-prop-nama').value = p.nama_kos;
        document.getElementById('input-prop-alamat').value = p.alamat;
        document.getElementById('input-prop-harga').value = p.harga_bulan;
        document.getElementById('input-prop-kamar').value = p.kamar_tersedia || 2;
        modalFormProp.style.display = 'flex';
        modalFormProp.style.pointerEvents = 'auto';
        modalFormProp.classList.add('open');
      }
      return;
    }

    const btnChat = e.target.closest('.btn-chat-tenant');
    if (btnChat) {
      window.location.href = '/chat.html';
      return;
    }
  });

  // 7. Close Detail Properti
  const btnCloseDetailProp = document.getElementById('btn-close-detail-prop');
  if (btnCloseDetailProp) {
    btnCloseDetailProp.addEventListener('click', () => {
      const viewDetail = document.getElementById('view-detail-prop');
      if (viewDetail) {
        viewDetail.classList.remove('open');
        viewDetail.style.display = 'none';
      }
      bersihkanOverlay();
    });
  }

  // 7b. Tambah Kamar
  const btnTambahKamar = document.getElementById('btn-tambah-kamar');
  if (btnTambahKamar) {
    btnTambahKamar.addEventListener('click', async () => {
      const idKos = state.selectedProp ? state.selectedProp.id_kos : 1;
      const rooms = getKamarKos(idKos);
      const nextNum = rooms.length + 1;
      const nextNo = nextNum < 10 ? `Kamar 0${nextNum}` : `Kamar ${nextNum}`;
      const hasil = await Swal.fire({
        title: 'Tambah Kamar Baru',
        input: 'text',
        inputValue: nextNo,
        inputLabel: 'Nomor kamar',
        inputPlaceholder: 'Contoh: Kamar 03',
        showCancelButton: true,
        confirmButtonText: 'Tambah',
        cancelButtonText: 'Batal',
        confirmButtonColor: KM.ui.TEMA.teal,
        cancelButtonColor: KM.ui.TEMA.grey,
        inputValidator: (v) => (!v || !v.trim() ? 'Nomor kamar wajib diisi.' : undefined),
      });
      const inputNo = hasil.isConfirmed ? String(hasil.value || '').trim() : '';
      if (inputNo) {
        try {
          await api(`/kos/${idKos}/kamar`, {
            method: 'POST',
            body: { nomor_kamar: inputNo, nama: inputNo }
          });
        } catch (_err) {}
        KM.ui.toast(`${inputNo} berhasil ditambahkan`);
        await renderRoomManager(idKos);
        const prop = state.properties.find(x => x.id_kos === idKos) || state.properties[0];
        if (prop) {
          const freshKamar = await api(`/kos/${idKos}/kamar`).catch(() => []);
          prop.kamar_tersedia = freshKamar.filter(x => x.status === 'available' || x.status === 'kosong').length;
          renderPropertiList();
        }
      }
    });
  }

  // 8. Mode Switcher (User / Penyewa)
  const btnSwitchMhs = document.getElementById('btn-switch-mhs');
  if (btnSwitchMhs) {
    btnSwitchMhs.addEventListener('click', () => {
      window.location.href = '/beranda.html';
    });
  }

  // 9. Logout
  const btnLogout = document.getElementById('btn-owner-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      await api('/logout', { method: 'POST' }).catch(() => {});
      window.location.href = '/masuk-kost.html';
    });
  }

  // 10. Auto-open form tambah properti jika ada parameter action=tambah-properti atau tambah=1
  const queryParams = new URLSearchParams(window.location.search);
  if (queryParams.get('action') === 'tambah-properti' || queryParams.get('tambah') === '1') {
    bukaModalTambahProp();
  }
});

// Panggil fetchPesananMasuk saat halaman selesai dimuat (onload) dan bersihkan overlay
window.addEventListener('load', () => {
  fetchPesananMasuk();
  bersihkanOverlay();
});