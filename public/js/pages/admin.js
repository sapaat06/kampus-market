const { api, rp, esc, getFoto } = window.KM;

const H = () => ({ 'x-admin-key': sessionStorage.getItem('km_admin') ?? '' });

// Global Admin State
let state = {
  stats: null,
  users: [],
  mahasiswa: [],
  transaksi: [],
  barang: [],
  kos: [],
  antrean: [],
  laporan: [],
  riwayatPoin: [],
  selectedMhs: null,
  selectedUser: null,
  selectedRejectListing: null, // { id, type, name }
  selectedLaporan: null,
  activeTab: 'beranda',
  activeVerifSubtab: 'users-all', // 'users-all', 'mhs', 'kost'
  activeUserFilter: 'all', // 'all', 'active', 'banned'
  activeVerifStatus: 'pending',
  activeModSubtab: 'antrean', // 'antrean', 'prod', 'kos'
  activeModStatus: 'pending',
  activeModKosStatus: 'pending',
  activeLapFilter: 'all', // 'all', 'menunggu', 'ditindaklanjuti', 'ditolak'
  searchUsers: '',
  searchVerif: '',
  searchMod: '',
  searchLaporan: '',
};

// DOM Elements
const viewLock = document.getElementById('view-lock');
const viewApp = document.getElementById('view-app');
const formLock = document.getElementById('form-auth-lock');
const lockMsg = document.getElementById('lock-msg');
const toastEl = document.getElementById('admin-toast');
const toastText = document.getElementById('toast-text');

// Modals
const viewDetailMhs = document.getElementById('view-detail-mhs');
const modalApproveMhs = document.getElementById('modal-approve-mhs');
const modalRejectMhs = document.getElementById('modal-reject-mhs');
const modalRejectProd = document.getElementById('modal-reject-prod');
const modalNotifSheet = document.getElementById('modal-notif-sheet');
const modalKtmZoom = document.getElementById('modal-ktm-zoom');
const modalRejectListing = document.getElementById('modal-reject-listing');
const modalAdjustGP = document.getElementById('modal-adjust-gp');
const modalActionLap = document.getElementById('modal-action-laporan');
const modalDetailUser = document.getElementById('modal-detail-user');

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

// Parse SQLite UTC or ISO string into a JavaScript Date object in local time
function parseDate(dateStr) {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return isNaN(dateStr.getTime()) ? null : dateStr;
  let s = String(dateStr).trim();
  if (!s) return null;

  if (/^\d+$/.test(s)) {
    const num = Number(s);
    const d = new Date(num > 1e11 ? num : num * 1000);
    return isNaN(d.getTime()) ? null : d;
  }

  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/.test(s)) {
    s = s.replace(' ', 'T');
    if (!s.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(s)) {
      s += 'Z';
    }
  }

  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function formatTanggalLengkap(dateInput) {
  const d = parseDate(dateInput);
  if (!d) return '-';
  try {
    const tgl = d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
    const jam = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    return `${tgl} - ${jam}`;
  } catch {
    return '-';
  }
}

function formatWaktuPengajuan(dateInput, withPrefix = true) {
  const d = parseDate(dateInput);
  const pfx = withPrefix ? 'diajukan ' : '';
  if (!d) return pfx ? pfx + '-' : '-';

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();

  if (diffMs < 0 && diffMs > -60000) {
    return pfx + 'baru saja';
  }

  const diffSec = Math.max(0, Math.floor(diffMs / 1000));
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);

  if (diffHour < 24) {
    if (diffMin < 1) {
      return pfx + 'baru saja';
    } else if (diffMin < 60) {
      return pfx + `${diffMin} menit yang lalu`;
    } else {
      return pfx + `${diffHour} jam yang lalu`;
    }
  }

  return pfx + formatTanggalLengkap(d);
}

// -------------------------------------------------------------
// LOAD ALL DATA FROM BACKEND APIS
// -------------------------------------------------------------
async function muat() {
  try {
    const elTot = document.getElementById('totalUsersCount');
    const elVer = document.getElementById('verifiedUsersCount');
    if (elTot) elTot.textContent = '...';
    if (elVer) elVer.textContent = '...';

    const [statsData, usersData, transList, antreanData, barangList, kosList, laporanData, gpData] = await Promise.all([
      api('/admin/stats', { headers: H() }).catch(() => null),
      api('/admin/users', { headers: H() }).catch(() => api('/mahasiswa', { headers: H() })),
      api('/transaksi', { headers: H() }).catch(() => []),
      api('/admin/moderasi/antrean', { headers: H() }).catch(() => ({ antrean: [], produk: [], kos: [] })),
      api('/barang').catch(() => []),
      api('/kos').catch(() => []),
      api('/admin/laporan', { headers: H() }).catch(() => ({ laporan: [] })),
      api('/admin/green-points/history', { headers: H() }).catch(() => ({ riwayat: [] }))
    ]);

    state.stats = statsData;

    // Normalisasi data pengguna
    const rawUsers = Array.isArray(usersData) ? usersData : (usersData?.users || usersData?.data || []);
    state.users = rawUsers.map(u => ({
      ...u,
      is_banned: Boolean(u.is_banned),
      nim: u.nim || u.kampus || `NIM-${String(u.id_mahasiswa || u.id).padStart(4, '0')}`
    }));
    state.mahasiswa = state.users;

    state.transaksi = Array.isArray(transList) ? transList : [];
    state.barang = Array.isArray(barangList) ? barangList : (antreanData?.produk || []);
    state.kos = Array.isArray(kosList) ? kosList : (antreanData?.kos || []);

    // Normalisasi antrean moderasi
    if (Array.isArray(antreanData?.antrean)) {
      state.antrean = antreanData.antrean;
    } else {
      const prodP = (antreanData?.produk || state.barang.filter(b => b.status_moderasi === 'pending')).map(b => ({
        ...b,
        id_item: b.id_barang,
        tipe_item: 'barang',
        nama_item: b.nama_barang,
        nama_pemilik: b.nama_penjual || 'Penjual',
        tipe_transaksi: b.harga_sewa ? 'sewa' : 'beli',
        harga_tampil: b.harga_sewa || b.harga_jual
      }));
      const kosP = (antreanData?.kos || state.kos.filter(k => k.status_verifikasi === 'pending')).map(k => ({
        ...k,
        id_item: k.id_kos,
        tipe_item: 'kos',
        nama_item: k.nama_kos,
        nama_pemilik: k.nama_pemilik || 'Pemilik Kos',
        tipe_transaksi: 'sewa_kos',
        harga_tampil: k.harga_bulan
      }));
      state.antrean = [...prodP, ...kosP];
    }

    state.laporan = Array.isArray(laporanData?.laporan) ? laporanData.laporan : (Array.isArray(laporanData) ? laporanData : []);
    state.riwayatPoin = Array.isArray(gpData?.riwayat) ? gpData.riwayat : (Array.isArray(gpData?.data) ? gpData.data : []);

    // Buka tampilan Dashboard
    if (viewLock) viewLock.style.display = 'none';
    if (viewApp) viewApp.style.display = 'flex';
    if (lockMsg) lockMsg.textContent = '';

    renderStats();
    renderBeranda();
    renderUsersTable();
    renderVerifikasi();
    renderModerasi();
    renderLaporanTable();
    renderGreenPoint();
  } catch (e) {
    if (viewLock) viewLock.style.display = 'block';
    if (viewApp) viewApp.style.display = 'none';
    if (lockMsg) lockMsg.textContent = e.message || 'Kunci admin salah atau tidak valid';
    KM.ui.error('Akses Admin Ditolak', e.message || 'Kunci admin salah atau tidak valid.');
  }
}

// -------------------------------------------------------------
// 1. STATISTIK DASHBOARD
// -------------------------------------------------------------
function renderStats() {
  const verifiedCount = state.stats?.verified_users ?? state.users.filter(m => m.status_verifikasi === 'terverifikasi').length;
  const totalCount = state.stats?.total_users ?? state.users.length;
  const pendingProd = state.stats?.pending_products ?? state.barang.filter(b => b.status_moderasi === 'pending').length;
  const pendingKos = state.stats?.pending_kost ?? state.kos.filter(k => k.status_verifikasi === 'pending').length;
  const pendingAntrean = state.antrean.length;

  const elTotSpan = document.getElementById('totalUsersCount');
  if (elTotSpan) elTotSpan.textContent = totalCount.toLocaleString('id-ID');

  const elVerSpan = document.getElementById('verifiedUsersCount');
  if (elVerSpan) elVerSpan.textContent = verifiedCount.toLocaleString('id-ID');

  const elProdSpan = document.getElementById('pendingProductsCount');
  if (elProdSpan) elProdSpan.textContent = pendingProd.toString();

  const elKosSpan = document.getElementById('pendingKostCount');
  if (elKosSpan) elKosSpan.textContent = pendingKos.toString();

  const elBadgeAntrean = document.getElementById('badge-total-antrean');
  if (elBadgeAntrean) elBadgeAntrean.textContent = `${pendingAntrean} item pending`;

  const elCountAntrean = document.getElementById('count-mod-antrean');
  if (elCountAntrean) elCountAntrean.textContent = pendingAntrean;

  // Green point stats
  const totalGP = state.stats?.total_green_points || 42850;
  const heroGP = document.getElementById('hero-total-gp');
  if (heroGP) heroGP.textContent = totalGP.toLocaleString('id-ID') + ' Green Point';

  const gpTotalEl = document.getElementById('gp-stat-total');
  if (gpTotalEl) gpTotalEl.textContent = totalGP.toLocaleString('id-ID');

  const gpTransEl = document.getElementById('gp-stat-trans');
  if (gpTransEl) gpTransEl.textContent = (state.transaksi.length || 12).toLocaleString('id-ID');

  const gpMhsEl = document.getElementById('gp-stat-mhs');
  if (gpMhsEl) gpMhsEl.textContent = verifiedCount.toLocaleString('id-ID');

  // Badges count
  const badgeUsersAll = document.getElementById('badge-count-users-all');
  if (badgeUsersAll) badgeUsersAll.textContent = state.users.length;

  const badgeMhs = document.getElementById('badge-count-mhs');
  if (badgeMhs) badgeMhs.textContent = state.users.filter(u => u.status_verifikasi === 'pending').length;

  const badgeKost = document.getElementById('badge-count-kost');
  if (badgeKost) badgeKost.textContent = state.kos.length;

  const countProdEl = document.getElementById('count-mod-prod');
  if (countProdEl) countProdEl.textContent = state.barang.length;

  const countKosEl = document.getElementById('count-mod-kos');
  if (countKosEl) countKosEl.textContent = state.kos.length;

  const countLapAll = document.getElementById('count-lap-all');
  if (countLapAll) countLapAll.textContent = state.laporan.length;

  const countLapPending = document.getElementById('count-lap-pending');
  if (countLapPending) countLapPending.textContent = state.laporan.filter(l => l.status === 'menunggu').length;
}

// -------------------------------------------------------------
// 2. BERANDA ADMIN
// -------------------------------------------------------------
function renderBeranda() {
  const container = document.getElementById('list-butuh-tindakan');
  if (!container) return;

  const pendingMhs = state.users.filter(m => m.status_verifikasi === 'pending');
  const pendingListings = state.antrean.slice(0, 2);

  let html = '';

  pendingMhs.slice(0, 2).forEach(m => {
    const rawTime = m.submitted_at || m.created_at;
    html += `
      <div class="action-card">
        <div class="action-card-header">
          <img src="/img/avatar-rina-figma.png" alt="Avatar" class="action-avatar">
          <div class="action-info">
            <div class="action-name">${esc(m.nama)}</div>
            <div class="action-sub">${esc(m.kampus || 'Institut Teknologi Garut')}</div>
          </div>
          <span class="status-badge pending">Verifikasi KTM</span>
        </div>
        <div style="font-size:10px;color:#94A3B8;margin-bottom:6px">Diajukan: <strong style="color:#0F172A" title="${esc(formatTanggalLengkap(rawTime))}">${esc(formatWaktuPengajuan(rawTime, false))}</strong></div>
        <div style="display:flex;gap:6px">
          <button class="btn-solid-teal btn-quick-verify-mhs" data-id="${m.id_mahasiswa}" style="flex:1;height:32px;font-size:11px">Verifikasi</button>
          <button class="btn-outline-red btn-quick-reject-mhs" data-id="${m.id_mahasiswa}" style="flex:1;height:32px;font-size:11px">Tolak</button>
          <button class="btn-action-outline btn-open-detail-mhs" data-id="${m.id_mahasiswa}" style="flex:1;height:32px;font-size:11px">Detail</button>
        </div>
      </div>`;
  });

  pendingListings.forEach(item => {
    html += `
      <div class="action-card">
        <div class="action-card-header">
          <img src="${esc(getFoto(item.foto) || '/img/kalkulator-casio.png')}" alt="Listing" class="action-avatar" style="border-radius:8px">
          <div class="action-info">
            <div class="action-name">${esc(item.nama_item)}</div>
            <div class="action-sub">${esc(item.nama_pemilik)} · ${rp(item.harga_tampil)}</div>
          </div>
          <span class="status-badge pending">${esc(item.tipe_transaksi)}</span>
        </div>
        <div style="display:flex;gap:6px;margin-top:6px">
          <button class="btn-solid-teal btn-approve-listing" data-type="${item.tipe_item}" data-id="${item.id_item}" style="flex:1;height:32px;font-size:11px">Izinkan Tayang</button>
          <button class="btn-outline-red btn-reject-listing-prompt" data-type="${item.tipe_item}" data-id="${item.id_item}" data-title="${esc(item.nama_item)}" style="flex:1;height:32px;font-size:11px">Tolak</button>
        </div>
      </div>`;
  });

  if (!html) {
    html = `
      <div style="background:#FFFFFF;border:1px dashed #CBD5E1;border-radius:14px;padding:24px 16px;text-align:center;color:#64748B;font-size:12px">
        Semua antrean moderasi dan verifikasi pengguna telah beres! 🎉
      </div>`;
  }

  container.innerHTML = html;
}

// -------------------------------------------------------------
// 3. FITUR 1: KELOLA PENGGUNA (USER MANAGEMENT)
// -------------------------------------------------------------
function renderUsersTable() {
  const tbody = document.getElementById('tbody-users');
  const counterLabel = document.getElementById('users-counter-label');
  if (!tbody) return;

  let filtered = [...state.users];

  // Filter status aktif vs banned
  if (state.activeUserFilter === 'active') {
    filtered = filtered.filter(u => !u.is_banned);
  } else if (state.activeUserFilter === 'banned') {
    filtered = filtered.filter(u => u.is_banned);
  }

  // Filter search
  if (state.searchUsers) {
    const q = state.searchUsers.toLowerCase();
    filtered = filtered.filter(u =>
      (u.nama && u.nama.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.nim && u.nim.toLowerCase().includes(q)) ||
      (u.whatsapp_number && u.whatsapp_number.toLowerCase().includes(q)) ||
      (u.no_hp && u.no_hp.toLowerCase().includes(q))
    );
  }

  if (counterLabel) counterLabel.textContent = `${filtered.length} pengguna terdaftar`;

  if (!filtered.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center;padding:30px 10px;color:#94A3B8;font-size:12px">
          Tidak ada data pengguna yang sesuai dengan pencarian atau filter.
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(u => {
    const isBanned = Boolean(u.is_banned);
    const wa = u.whatsapp_number || u.no_hp || '-';
    const nim = u.nim || u.kampus || '-';

    return `
      <tr style="${isBanned ? 'background:#FFF5F5' : ''}">
        <td>
          <div style="display:flex;align-items:center;gap:10px">
            <img src="/img/avatar-rina-figma.png" alt="Avatar" style="width:34px;height:34px;border-radius:50%;object-fit:cover;background:#E2E8F0;flex-shrink:0">
            <div>
              <div style="font-weight:700;color:#0F172A">${esc(u.nama)}</div>
              <div style="font-size:10px;color:#64748B">${esc(u.role || 'pelanggan')}</div>
            </div>
          </div>
        </td>
        <td>
          <div style="font-weight:600;color:#0F172A">${esc(nim)}</div>
          <div style="font-size:10px;color:#64748B">${esc(u.kampus || 'Universitas')}</div>
        </td>
        <td>
          <div style="color:#0F172A">${esc(u.email)}</div>
          <div style="font-size:11px;color:#007A68;font-weight:600">${esc(wa)}</div>
        </td>
        <td>
          ${isBanned
            ? '<span class="status-badge banned">Diblokir</span>'
            : '<span class="status-badge aktif">Aktif</span>'}
          <div style="margin-top:2px">
            <span class="status-badge ${esc(u.status_verifikasi)}">${esc(u.status_verifikasi)}</span>
          </div>
        </td>
        <td style="text-align:right">
          <div class="table-actions-cell" style="justify-content:flex-end">
            <button class="btn-table-action btn-table-view btn-view-user" data-id="${u.id_mahasiswa}">
              <svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
              Lihat Detail
            </button>
            ${isBanned ? `
              <button class="btn-table-action btn-table-unblock btn-toggle-block-user" data-id="${u.id_mahasiswa}" data-banned="true">
                <svg viewBox="0 0 24 24"><path d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h1.9c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm0 12H6V10h12v10z"/></svg>
                Buka Blokir
              </button>
            ` : `
              <button class="btn-table-action btn-table-block btn-toggle-block-user" data-id="${u.id_mahasiswa}" data-banned="false">
                <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8 0-1.85.63-3.55 1.69-4.9L16.9 18.31C15.55 19.37 13.85 20 12 20zm6.31-3.1L7.1 5.69C8.45 4.63 10.15 4 12 4c4.42 0 8 3.58 8 8 0 1.85-.63 3.55-1.69 4.9z"/></svg>
                Blokir Akun
              </button>
            `}
          </div>
        </td>
      </tr>`;
  }).join('');
}

// Modal Detail User Pop-up
function openModalDetailUser(id) {
  const u = state.users.find(x => x.id_mahasiswa === Number(id));
  if (!u) return;

  state.selectedUser = u;

  document.getElementById('modal-user-nama').textContent = u.nama;
  document.getElementById('modal-user-id').textContent = `ID: USR-${String(u.id_mahasiswa).padStart(4, '0')}`;
  document.getElementById('modal-user-nim').textContent = u.nim || u.kampus || '-';
  document.getElementById('modal-user-email').textContent = u.email;
  document.getElementById('modal-user-wa').textContent = u.whatsapp_number || u.no_hp || '-';
  document.getElementById('modal-user-kampus').textContent = u.kampus || 'Institut Teknologi Garut';
  document.getElementById('modal-user-role').textContent = u.role || 'pelanggan';

  const elVerif = document.getElementById('modal-user-verif');
  elVerif.textContent = u.status_verifikasi;
  elVerif.className = `status-badge ${u.status_verifikasi}`;

  const elBanned = document.getElementById('modal-user-banned');
  elBanned.textContent = u.is_banned ? 'DIBLOKIR' : 'AKTIF';
  elBanned.className = `status-badge ${u.is_banned ? 'banned' : 'aktif'}`;

  document.getElementById('modal-user-created').textContent = formatTanggalLengkap(u.created_at);

  const btnToggleBan = document.getElementById('btn-modal-user-toggle-ban');
  if (btnToggleBan) {
    btnToggleBan.textContent = u.is_banned ? 'Buka Blokir Akun' : 'Blokir Akun Pengguna';
    btnToggleBan.className = u.is_banned ? 'btn-solid-teal' : 'btn-outline-red';
  }

  const btnVerify = document.getElementById('btn-modal-user-verify');
  if (btnVerify) {
    btnVerify.style.display = u.status_verifikasi === 'pending' ? 'block' : 'none';
  }

  modalDetailUser?.classList.add('open');
}

// Fullscreen Detail Mahasiswa & KTM
function openDetailMahasiswa(mOrId) {
  const m = typeof mOrId === 'object' ? mOrId : state.users.find(x => x.id_mahasiswa === Number(mOrId));
  if (!m) return;

  state.selectedMhs = m;

  // Nama & Identitas
  const namaEl = document.getElementById('detail-mhs-nama');
  if (namaEl) namaEl.textContent = m.nama || '-';

  const idEl = document.getElementById('detail-mhs-id');
  if (idEl) idEl.textContent = `USR-${String(m.id_mahasiswa).padStart(4, '0')} · Akun Mahasiswa`;

  const fNamaEl = document.getElementById('detail-mhs-f-nama');
  if (fNamaEl) fNamaEl.textContent = m.nama || '-';

  const fNimEl = document.getElementById('detail-mhs-f-nim');
  if (fNimEl) fNimEl.textContent = m.nim || m.kampus || '-';

  const fKampusEl = document.getElementById('detail-mhs-f-kampus');
  if (fKampusEl) fKampusEl.textContent = m.kampus || 'Institut Teknologi Garut';

  const fEmailEl = document.getElementById('detail-mhs-f-email');
  if (fEmailEl) fEmailEl.textContent = m.email || '-';

  const fHpEl = document.getElementById('detail-mhs-f-hp');
  if (fHpEl) fHpEl.textContent = m.whatsapp_number || m.no_hp || '-';

  // Status Banner
  const banner = document.getElementById('detail-mhs-banner');
  const bannerTitle = document.getElementById('detail-mhs-banner-title');
  const bannerSub = document.getElementById('detail-mhs-banner-sub');

  if (m.status_verifikasi === 'terverifikasi') {
    if (banner) {
      banner.style.background = '#ECFDF5';
      banner.style.borderColor = '#A7F3D0';
    }
    if (bannerTitle) {
      bannerTitle.textContent = 'Akun Mahasiswa Terverifikasi';
      bannerTitle.style.color = '#065F46';
    }
    if (bannerSub) {
      bannerSub.textContent = 'Kartu Tanda Mahasiswa (KTM) telah diverifikasi dan disetujui.';
      bannerSub.style.color = '#047857';
    }
  } else if (m.status_verifikasi === 'ditolak') {
    if (banner) {
      banner.style.background = '#FEF2F2';
      banner.style.borderColor = '#FECACA';
    }
    if (bannerTitle) {
      bannerTitle.textContent = 'Pengajuan Ditolak';
      bannerTitle.style.color = '#991B1B';
    }
    if (bannerSub) {
      bannerSub.textContent = m.alasan_penolakan ? `Alasan: ${m.alasan_penolakan}` : 'Dokumen belum memenuhi kriteria validasi.';
      bannerSub.style.color = '#B91C1C';
    }
  } else {
    if (banner) {
      banner.style.background = '#FFF9EB';
      banner.style.borderColor = '#FED7AA';
    }
    if (bannerTitle) {
      bannerTitle.textContent = 'Menunggu pemeriksaan';
      bannerTitle.style.color = '#92400E';
    }
    if (bannerSub) {
      const waktu = m.submitted_at || m.created_at;
      bannerSub.textContent = waktu ? `Diajukan pada: ${formatTanggalLengkap(waktu)}` : 'Segera lakukan verifikasi berkas.';
      bannerSub.style.color = '#B45309';
    }
  }

  // Banned Alert
  const bannedAlert = document.getElementById('detail-mhs-banned-alert');
  if (bannedAlert) bannedAlert.style.display = m.is_banned ? 'flex' : 'none';

  // Alasan Alert
  const alasanAlert = document.getElementById('detail-mhs-alasan-alert');
  const alasanText = document.getElementById('detail-mhs-alasan-text');
  if (alasanAlert && alasanText) {
    if (m.status_verifikasi === 'ditolak' && m.alasan_penolakan) {
      alasanAlert.style.display = 'block';
      alasanText.textContent = m.alasan_penolakan;
    } else {
      alasanAlert.style.display = 'none';
    }
  }

  // KTM Preview Container
  const ktmContainer = document.getElementById('detail-ktm-container');
  if (ktmContainer) {
    if (m.ktm) {
      const imgSrc = getFoto(m.ktm);
      ktmContainer.innerHTML = `
        <img src="${esc(imgSrc)}" alt="KTM ${esc(m.nama)}" style="max-width:100%;max-height:220px;border-radius:6px;object-fit:contain;cursor:pointer" id="img-ktm-preview">
      `;
      document.getElementById('img-ktm-preview')?.addEventListener('click', () => {
        document.getElementById('btn-zoom-ktm')?.click();
      });
    } else {
      ktmContainer.innerHTML = `
        <div style="padding:24px 16px;text-align:center;color:#64748B">
          <div style="font-weight:700;color:#0F172A;font-size:13px">${esc(m.nama)}</div>
          <div style="font-size:11px;margin-top:2px">${esc(m.nim || m.kampus || 'Mahasiswa')} · ${esc(m.kampus || 'Institut Teknologi Garut')}</div>
          <div style="font-size:10px;color:#94A3B8;margin-top:6px">Foto KTM fisik belum diunggah</div>
        </div>
      `;
    }
  }

  // Button labels
  const btnActSetujui = document.getElementById('btn-act-setujui');
  const btnActTolak = document.getElementById('btn-act-tolak');
  const btnActBan = document.getElementById('btn-act-ban-toggle');

  if (btnActSetujui) {
    btnActSetujui.textContent = m.status_verifikasi === 'terverifikasi' ? '✓ Terverifikasi' : 'Verifikasi';
  }
  if (btnActTolak) {
    btnActTolak.textContent = m.status_verifikasi === 'ditolak' ? 'Telah Ditolak' : 'Tolak';
  }
  if (btnActBan) {
    btnActBan.textContent = m.is_banned ? 'Buka Blokir' : 'Blokir Pengguna';
  }

  viewDetailMhs?.classList.add('open');
}

// -------------------------------------------------------------
// RENDER TAB VERIFIKASI (SUBTABS: USERS, KTM, KOST)
// -------------------------------------------------------------
function renderVerifikasi() {
  const secUsers = document.getElementById('section-users-all');
  const secMhs = document.getElementById('section-verif-mhs');
  const secKost = document.getElementById('section-verif-kost');

  if (state.activeVerifSubtab === 'users-all') {
    if (secUsers) secUsers.style.display = 'block';
    if (secMhs) secMhs.style.display = 'none';
    if (secKost) secKost.style.display = 'none';
    renderUsersTable();
  } else if (state.activeVerifSubtab === 'mhs') {
    if (secUsers) secUsers.style.display = 'none';
    if (secMhs) secMhs.style.display = 'block';
    if (secKost) secKost.style.display = 'none';

    const listMhsEl = document.getElementById('list-verif-mhs');
    const counterLabel = document.getElementById('verif-counter-label');
    if (!listMhsEl) return;

    let filtered = state.users;
    if (state.activeVerifStatus) {
      filtered = filtered.filter(m => m.status_verifikasi === state.activeVerifStatus);
    }
    if (state.searchVerif) {
      const q = state.searchVerif.toLowerCase();
      filtered = filtered.filter(m =>
        (m.nama && m.nama.toLowerCase().includes(q)) ||
        (m.email && m.email.toLowerCase().includes(q)) ||
        (m.kampus && m.kampus.toLowerCase().includes(q))
      );
    }

    if (counterLabel) counterLabel.textContent = `${filtered.length} pengajuan mahasiswa`;

    if (!filtered.length) {
      listMhsEl.innerHTML = `<div style="text-align:center;padding:30px 10px;color:#94A3B8;font-size:12px">Tidak ada pengajuan mahasiswa dengan filter ini.</div>`;
      return;
    }

    listMhsEl.innerHTML = filtered.map(m => `
      <div class="action-card" style="${m.is_banned ? 'border-color:#FECACA;background:#FFF5F5' : ''}">
        <div class="action-card-header">
          <img src="/img/avatar-rina-figma.png" alt="Avatar" class="action-avatar">
          <div class="action-info">
            <div class="action-name">${esc(m.nama)}</div>
            <div class="action-sub">${esc(m.email)}</div>
          </div>
          <span class="status-badge ${esc(m.status_verifikasi)}">${esc(m.status_verifikasi)}</span>
        </div>
        <div style="font-size:11px;color:#64748B">${esc(m.kampus || 'Institut Teknologi Garut')}</div>
        <div style="font-size:10px;color:#94A3B8">Diajukan: <strong>${esc(formatWaktuPengajuan(m.submitted_at || m.created_at, false))}</strong></div>
        <div style="display:flex;gap:6px;margin-top:6px">
          ${m.status_verifikasi === 'pending' ? `
            <button class="btn-solid-teal btn-quick-verify-mhs" data-id="${m.id_mahasiswa}" style="flex:1;height:34px;font-size:11px">Verifikasi</button>
            <button class="btn-outline-red btn-quick-reject-mhs" data-id="${m.id_mahasiswa}" style="flex:1;height:34px;font-size:11px">Tolak</button>
            <button class="btn-action-outline btn-open-detail-mhs" data-id="${m.id_mahasiswa}" style="flex:1;height:34px;font-size:11px">Periksa KTM</button>
          ` : `
            <button class="btn-action-outline btn-open-detail-mhs" data-id="${m.id_mahasiswa}" style="flex:1;height:34px;font-size:11px">Periksa Identitas</button>
          `}
        </div>
      </div>
    `).join('');
  } else if (state.activeVerifSubtab === 'kost') {
    if (secUsers) secUsers.style.display = 'none';
    if (secMhs) secMhs.style.display = 'none';
    if (secKost) secKost.style.display = 'block';

    const listKostEl = document.getElementById('list-verif-kost');
    if (!listKostEl) return;

    const kostItems = state.kos.length ? state.kos : [];
    if (!kostItems.length) {
      listKostEl.innerHTML = `<div style="text-align:center;padding:30px 10px;color:#94A3B8;font-size:12px">Tidak ada data properti kos.</div>`;
      return;
    }

    listKostEl.innerHTML = kostItems.map(k => `
      <div class="kost-card">
        <img src="${esc(getFoto(k.foto) || '/img/kos-ananda-dago.png')}" alt="${esc(k.nama_kos)}" class="kost-img">
        <div class="kost-badges">
          <span class="status-badge ${k.status_verifikasi || 'pending'}">${k.status_verifikasi || 'Pending'}</span>
          <span class="status-badge" style="background:#E0F2FE;color:#0369A1">Verifikasi admin</span>
        </div>
        <div class="kost-title">${esc(k.nama_kos)}</div>
        <div class="kost-price">${rp(k.harga_bulan)} <span style="font-size:11px;font-weight:400;color:#64748B">/bulan</span></div>
        <div class="kost-loc">${esc(k.alamat || 'Area Kampus')}</div>
        <div style="font-size:11px;color:#64748B">${esc(k.nama_pemilik || 'Pemilik')} · ${k.kamar_tersedia || 1} kamar kosong</div>
        <div class="kost-actions">
          <button class="btn-solid-teal btn-approve-listing" data-type="kos" data-id="${k.id_kos}" style="flex:1;height:36px;font-size:12px">Izinkan Tayang</button>
          <button class="btn-outline-red btn-reject-listing-prompt" data-type="kos" data-id="${k.id_kos}" data-title="${esc(k.nama_kos)}" style="flex:1;height:36px;font-size:12px">Tolak</button>
        </div>
      </div>
    `).join('');
  }
}

// -------------------------------------------------------------
// 4. FITUR 2: MODERASI BARANG & KOS (LISTING MANAGEMENT)
// -------------------------------------------------------------
function renderModerasi() {
  const secAntrean = document.getElementById('section-moderasi-antrean');
  const secProd = document.getElementById('section-moderasi-prod');
  const secKos = document.getElementById('section-moderasi-kos');

  if (state.activeModSubtab === 'antrean') {
    if (secAntrean) secAntrean.style.display = 'block';
    if (secProd) secProd.style.display = 'none';
    if (secKos) secKos.style.display = 'none';
    renderModerasiAntrean();
  } else if (state.activeModSubtab === 'prod') {
    if (secAntrean) secAntrean.style.display = 'none';
    if (secProd) secProd.style.display = 'block';
    if (secKos) secKos.style.display = 'none';

    const containerProd = document.getElementById('list-moderasi-prod');
    if (!containerProd) return;

    let items = state.barang;
    if (state.activeModStatus === 'pending') items = items.filter(b => b.status_moderasi === 'pending');
    else if (state.activeModStatus === 'selesai') items = items.filter(b => b.status_moderasi === 'disetujui');
    else if (state.activeModStatus === 'batal') items = items.filter(b => b.status_moderasi === 'ditolak');

    if (state.searchMod) {
      const q = state.searchMod.toLowerCase();
      items = items.filter(b => (b.nama_barang && b.nama_barang.toLowerCase().includes(q)));
    }

    if (!items.length) {
      containerProd.innerHTML = `<div style="text-align:center;padding:30px 10px;color:#94A3B8;font-size:12px">Tidak ada produk pada antrean ini.</div>`;
      return;
    }

    containerProd.innerHTML = items.map(b => `
      <div class="action-card">
        <div style="display:flex;gap:12px;align-items:flex-start">
          <img src="${esc(getFoto(b.foto) || '/img/kalkulator-casio.png')}" alt="Barang" style="width:64px;height:64px;border-radius:10px;object-fit:cover;background:#E2E8F0;flex-shrink:0">
          <div style="flex:1">
            <span class="status-badge ${esc(b.status_moderasi)}">${esc(b.status_moderasi)}</span>
            <div style="font-size:13px;font-weight:700;color:#0F172A;margin-top:2px">${esc(b.nama_barang)}</div>
            <div style="font-size:13px;font-weight:800;color:#007A68">${rp(b.harga_sewa || b.harga_jual || 0)}</div>
            <div style="font-size:10px;color:#64748B">${esc(b.nama_penjual || 'Penjual')}</div>
          </div>
        </div>
        ${b.status_moderasi === 'ditolak' && b.alasan_penolakan ? `
          <div style="font-size:10px;color:#DC2626;background:#FEF2F2;padding:6px 8px;border-radius:6px;margin-top:4px">
            Alasan penolakan: <strong>${esc(b.alasan_penolakan)}</strong>
          </div>
        ` : ''}
        ${b.status_moderasi === 'pending' ? `
          <div style="display:flex;gap:8px;margin-top:6px">
            <button class="btn-solid-teal btn-approve-listing" data-type="barang" data-id="${b.id_barang}" style="flex:1;height:34px;font-size:11px">Izinkan Tayang</button>
            <button class="btn-outline-red btn-reject-listing-prompt" data-type="barang" data-id="${b.id_barang}" data-title="${esc(b.nama_barang)}" style="flex:1;height:34px;font-size:11px">Tolak</button>
          </div>
        ` : ''}
      </div>
    `).join('');
  } else if (state.activeModSubtab === 'kos') {
    if (secAntrean) secAntrean.style.display = 'none';
    if (secProd) secProd.style.display = 'none';
    if (secKos) secKos.style.display = 'block';

    const containerKos = document.getElementById('list-moderasi-kos');
    if (!containerKos) return;

    let items = state.kos;
    if (state.activeModKosStatus === 'pending') items = items.filter(k => (k.status_verifikasi || 'pending') === 'pending');
    else if (state.activeModKosStatus === 'selesai') items = items.filter(k => k.status_verifikasi === 'terverifikasi');
    else if (state.activeModKosStatus === 'batal') items = items.filter(k => k.status_verifikasi === 'ditolak');

    if (!items.length) {
      containerKos.innerHTML = `<div style="text-align:center;padding:30px 10px;color:#94A3B8;font-size:12px">Tidak ada listing kos pada kategori ini.</div>`;
      return;
    }

    containerKos.innerHTML = items.map(k => `
      <div class="action-card">
        <div style="display:flex;gap:12px;align-items:flex-start">
          <img src="${esc(getFoto(k.foto) || '/img/kos-ananda-dago.png')}" alt="Kos" style="width:64px;height:64px;border-radius:10px;object-fit:cover;background:#E2E8F0;flex-shrink:0">
          <div style="flex:1">
            <span class="status-badge ${esc(k.status_verifikasi)}">${esc(k.status_verifikasi)}</span>
            <div style="font-size:13px;font-weight:700;color:#0F172A;margin-top:2px">${esc(k.nama_kos)}</div>
            <div style="font-size:13px;font-weight:800;color:#007A68">${rp(k.harga_bulan)} /bulan</div>
            <div style="font-size:10px;color:#64748B">${esc(k.alamat || 'Area Kampus')}</div>
          </div>
        </div>
        ${k.status_verifikasi === 'ditolak' && k.alasan_penolakan ? `
          <div style="font-size:10px;color:#DC2626;background:#FEF2F2;padding:6px 8px;border-radius:6px;margin-top:4px">
            Alasan: <strong>${esc(k.alasan_penolakan)}</strong>
          </div>
        ` : ''}
        ${k.status_verifikasi === 'pending' ? `
          <div style="display:flex;gap:8px;margin-top:6px">
            <button class="btn-solid-teal btn-approve-listing" data-type="kos" data-id="${k.id_kos}" style="flex:1;height:34px;font-size:11px">Izinkan Tayang</button>
            <button class="btn-outline-red btn-reject-listing-prompt" data-type="kos" data-id="${k.id_kos}" data-title="${esc(k.nama_kos)}" style="flex:1;height:34px;font-size:11px">Tolak</button>
          </div>
        ` : ''}
      </div>
    `).join('');
  }
}

// TABEL ANTREAN MODERASI (BARANG & KOS PENDING)
function renderModerasiAntrean() {
  const tbody = document.getElementById('tbody-moderasi-antrean');
  if (!tbody) return;

  let items = [...state.antrean];

  if (state.searchMod) {
    const q = state.searchMod.toLowerCase();
    items = items.filter(it =>
      (it.nama_item && it.nama_item.toLowerCase().includes(q)) ||
      (it.nama_pemilik && it.nama_pemilik.toLowerCase().includes(q))
    );
  }

  if (!items.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center;padding:30px 10px;color:#94A3B8;font-size:12px">
          🎉 Tidak ada postingan barang atau kos dalam antrean moderasi!
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = items.map(item => {
    const isBarang = item.tipe_item === 'barang';
    const fallbackImg = isBarang ? '/img/kalkulator-casio.png' : '/img/kos-ananda-dago.png';
    const txLabel = item.tipe_transaksi === 'sewa_kos' ? 'Sewa Kos' : (item.tipe_transaksi === 'sewa' ? 'Sewa Barang' : 'Jual');

    return `
      <tr>
        <td>
          <img src="${esc(getFoto(item.foto) || fallbackImg)}" alt="${esc(item.nama_item)}" style="width:44px;height:44px;border-radius:8px;object-fit:cover;background:#E2E8F0;display:block">
        </td>
        <td>
          <div style="font-weight:700;color:#0F172A">${esc(item.nama_item)}</div>
          <div style="font-size:10px;color:#64748B">${isBarang ? 'Barang Kampus' : 'Properti Kos'} · ID #${item.id_item}</div>
        </td>
        <td>
          <div style="font-weight:800;color:#007A68">${rp(item.harga_tampil)}</div>
          <div style="font-size:10px;color:#64748B">${item.tipe_transaksi === 'sewa_kos' ? '/bulan' : (item.tipe_transaksi === 'sewa' ? '/hari' : 'harga pas')}</div>
        </td>
        <td>
          <span class="status-badge" style="background:#E0F2FE;color:#0369A1;font-weight:700">${txLabel}</span>
        </td>
        <td>
          <div style="font-weight:600;color:#0F172A">${esc(item.nama_pemilik || '-')}</div>
          <div style="font-size:10px;color:#64748B">${esc(item.email_pemilik || '')}</div>
        </td>
        <td style="text-align:right">
          <div class="table-actions-cell" style="justify-content:flex-end">
            <button class="btn-table-action btn-table-approve btn-approve-listing" data-type="${item.tipe_item}" data-id="${item.id_item}">
              Izinkan Tayang
            </button>
            <button class="btn-table-action btn-table-reject btn-reject-listing-prompt" data-type="${item.tipe_item}" data-id="${item.id_item}" data-title="${esc(item.nama_item)}">
              Tolak
            </button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

// -------------------------------------------------------------
// 5. FITUR 3: SISTEM PELAPORAN MASUK (REPORT MANAGEMENT)
// -------------------------------------------------------------
function renderLaporanTable() {
  const tbody = document.getElementById('tbody-laporan');
  if (!tbody) return;

  let items = [...state.laporan];

  // Filter status laporan
  if (state.activeLapFilter && state.activeLapFilter !== 'all') {
    items = items.filter(l => l.status === state.activeLapFilter);
  }

  // Filter search
  if (state.searchLaporan) {
    const q = state.searchLaporan.toLowerCase();
    items = items.filter(l =>
      (l.nama_pelapor && l.nama_pelapor.toLowerCase().includes(q)) ||
      (l.nama_terlapor && l.nama_terlapor.toLowerCase().includes(q)) ||
      (l.target_judul && l.target_judul.toLowerCase().includes(q)) ||
      (l.alasan && l.alasan.toLowerCase().includes(q)) ||
      (l.keterangan && l.keterangan.toLowerCase().includes(q))
    );
  }

  if (!items.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center;padding:30px 10px;color:#94A3B8;font-size:12px">
          Tidak ada laporan aduan masuk dengan filter ini.
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = items.map(l => {
    const isPending = l.status === 'menunggu';

    return `
      <tr style="${isPending ? 'background:#FFFDF5' : ''}">
        <td>
          <div style="font-weight:700;color:#0F172A">${esc(l.nama_pelapor || 'Mahasiswa')}</div>
          <div style="font-size:10px;color:#64748B">${esc(l.email_pelapor || '-')}</div>
          <div style="font-size:9px;color:#94A3B8;margin-top:2px">${esc(formatWaktuPengajuan(l.created_at))}</div>
        </td>
        <td>
          <div style="font-weight:700;color:#DC2626">${esc(l.nama_terlapor || 'Pengguna Terlapor')}</div>
          <div style="font-size:11px;color:#007A68;font-weight:600">${esc(l.target_judul || `${l.tipe_target} #${l.id_target}`)}</div>
          <div style="font-size:9px;color:#64748B">Tipe target: <strong>${esc(l.tipe_target)}</strong></div>
        </td>
        <td>
          <div style="font-weight:700;color:#0F172A">${esc(l.alasan)}</div>
          <div style="font-size:11px;color:#475569;margin-top:2px;line-height:1.4">${esc(l.keterangan || '-')}</div>
          ${l.tindakan ? `<div style="font-size:10px;color:#0369A1;margin-top:4px;background:#F0F9FF;padding:2px 6px;border-radius:4px;display:inline-block">Tindakan: <strong>${esc(l.tindakan)}</strong></div>` : ''}
        </td>
        <td>
          <span class="status-badge ${esc(l.status)}">${esc(l.status)}</span>
        </td>
        <td style="text-align:right">
          <div class="table-actions-cell" style="justify-content:flex-end">
            <button class="btn-table-action btn-table-takedown btn-open-action-lap" data-id="${l.id_laporan}" data-action="takedown" title="Takedown listing terkait aduan ini">
              Takedown
            </button>
            <button class="btn-table-action btn-table-block btn-open-action-lap" data-id="${l.id_laporan}" data-action="banned_user" title="Blokir pengguna terlapor">
              Blokir Terlapor
            </button>
            <button class="btn-table-action btn-table-view btn-open-action-lap" data-id="${l.id_laporan}" data-action="selesai" title="Tandai laporan selesai / abaikan">
              Selesai
            </button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

// -------------------------------------------------------------
// 6. FITUR 4: PENGATURAN GREEN POINT
// -------------------------------------------------------------
function renderGreenPoint() {
  const tbody = document.getElementById('tbody-green-point');
  if (!tbody) return;

  const items = state.riwayatPoin;
  if (!items.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center;padding:30px 10px;color:#94A3B8;font-size:12px">
          Belum ada riwayat transaksi atau penyesuaian Green Point.
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = items.map(p => {
    const isPositive = p.jumlah_poin >= 0;
    const poinColor = isPositive ? '#059669' : '#DC2626';
    const poinSign = isPositive ? '+' : '';

    return `
      <tr>
        <td>
          <div style="font-weight:700;color:#0F172A">${esc(p.nama_mahasiswa || `User #${p.id_mahasiswa}`)}</div>
          <div style="font-size:10px;color:#64748B">${esc(p.kampus || p.email_mahasiswa || '-')}</div>
        </td>
        <td>
          <span class="status-badge" style="background:#F1F5F9;color:#334155;font-weight:600">${esc(p.kategori)}</span>
        </td>
        <td>
          <strong style="color:${poinColor};font-size:13px">${poinSign}${p.jumlah_poin} GP</strong>
        </td>
        <td>
          <div style="font-size:11px;color:#334155">${esc(p.keterangan || '-')}</div>
        </td>
        <td>
          <div style="font-size:11px;color:#64748B">${esc(formatTanggalLengkap(p.created_at))}</div>
        </td>
      </tr>`;
  }).join('');
}

// Populate user dropdown on manual GP modal
function populateGPUserDropdown() {
  const select = document.getElementById('select-gp-user');
  if (!select) return;

  const users = state.users;
  select.innerHTML = '<option value="">-- Pilih Mahasiswa Terdaftar --</option>' +
    users.map(u => `
      <option value="${u.id_mahasiswa}">${esc(u.nama)} (${esc(u.nim || u.email)})</option>
    `).join('');
}

// -------------------------------------------------------------
// EXPORT DATA (CSV)
// -------------------------------------------------------------
function exportDataMahasiswa() {
  if (!state.users || !state.users.length) {
    showToast('Tidak ada data pengguna untuk diekspor.');
    return;
  }

  const csvEscape = (val) => {
    if (val === null || val === undefined) return '""';
    const s = String(val).replace(/"/g, '""');
    return `"${s}"`;
  };

  const headers = ['ID', 'Nama Lengkap', 'NIM/Identitas', 'Email Kampus', 'No HP/WhatsApp', 'Kampus', 'Status Verifikasi', 'Status Akun', 'Tanggal Registrasi'];
  const lines = [headers.join(',')];

  state.users.forEach((u) => {
    lines.push([
      u.id_mahasiswa,
      csvEscape(u.nama),
      csvEscape(u.nim || '-'),
      csvEscape(u.email),
      csvEscape(u.whatsapp_number || u.no_hp || '-'),
      csvEscape(u.kampus || '-'),
      csvEscape(u.status_verifikasi),
      csvEscape(u.is_banned ? 'DIBLOKIR' : 'AKTIF'),
      csvEscape(u.created_at)
    ].join(','));
  });

  const csvContent = '\uFEFF' + lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `users_export_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Data pengguna berhasil diekspor (.csv)!');
}

// -------------------------------------------------------------
// EVENT LISTENERS SETUP
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  // 1. Lock screen login
  if (formLock) {
    formLock.addEventListener('submit', async (e) => {
      e.preventDefault();
      const k = document.getElementById('input-kunci').value.trim();
      sessionStorage.setItem('km_admin', k);
      await muat();
    });
  }

  // 2. Auto load if session exists
  if (sessionStorage.getItem('km_admin')) {
    muat();
  }

  // 3. Bottom Nav Tabs
  document.querySelectorAll('.admin-bottom-nav .nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.admin-bottom-nav .nav-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const targetTab = btn.dataset.tab;
      state.activeTab = targetTab;

      ['beranda', 'verifikasi', 'moderasi', 'laporan', 'greenpoint', 'akun'].forEach(tab => {
        const el = document.getElementById(`tab-${tab}`);
        if (el) el.style.display = tab === targetTab ? 'block' : 'none';
      });

      if (targetTab === 'verifikasi') renderVerifikasi();
      if (targetTab === 'moderasi') renderModerasi();
      if (targetTab === 'laporan') renderLaporanTable();
      if (targetTab === 'greenpoint') renderGreenPoint();
    });
  });

  // 4. Quick Jump from Beranda
  document.getElementById('card-goto-mod-prod')?.addEventListener('click', () => {
    state.activeModSubtab = 'antrean';
    document.querySelector('.admin-bottom-nav [data-tab="moderasi"]')?.click();
  });
  document.getElementById('card-goto-mod-kos')?.addEventListener('click', () => {
    state.activeModSubtab = 'kos';
    document.querySelector('.admin-bottom-nav [data-tab="moderasi"]')?.click();
  });
  document.getElementById('btn-goto-gp')?.addEventListener('click', () => {
    document.querySelector('.admin-bottom-nav [data-tab="greenpoint"]')?.click();
  });

  // 5. Subtab Verifikasi / Kelola Pengguna
  const subtabUsersAll = document.getElementById('subtab-users-all');
  const subtabMhs = document.getElementById('subtab-mhs');
  const subtabKost = document.getElementById('subtab-kost');

  if (subtabUsersAll) {
    subtabUsersAll.addEventListener('click', () => {
      state.activeVerifSubtab = 'users-all';
      subtabUsersAll.className = 'subtab-btn active-orange';
      if (subtabMhs) subtabMhs.className = 'subtab-btn';
      if (subtabKost) subtabKost.className = 'subtab-btn';
      renderVerifikasi();
    });
  }
  if (subtabMhs) {
    subtabMhs.addEventListener('click', () => {
      state.activeVerifSubtab = 'mhs';
      if (subtabUsersAll) subtabUsersAll.className = 'subtab-btn';
      subtabMhs.className = 'subtab-btn active-orange';
      if (subtabKost) subtabKost.className = 'subtab-btn';
      renderVerifikasi();
    });
  }
  if (subtabKost) {
    subtabKost.addEventListener('click', () => {
      state.activeVerifSubtab = 'kost';
      if (subtabUsersAll) subtabUsersAll.className = 'subtab-btn';
      if (subtabMhs) subtabMhs.className = 'subtab-btn';
      subtabKost.className = 'subtab-btn active-orange';
      renderVerifikasi();
    });
  }

  // 6. Subtab Moderasi
  const subtabModAntrean = document.getElementById('subtab-mod-antrean');
  const subtabModProd = document.getElementById('subtab-mod-prod');
  const subtabModKos = document.getElementById('subtab-mod-kos');

  if (subtabModAntrean) {
    subtabModAntrean.addEventListener('click', () => {
      state.activeModSubtab = 'antrean';
      subtabModAntrean.className = 'subtab-btn active-teal';
      if (subtabModProd) subtabModProd.className = 'subtab-btn';
      if (subtabModKos) subtabModKos.className = 'subtab-btn';
      renderModerasi();
    });
  }
  if (subtabModProd) {
    subtabModProd.addEventListener('click', () => {
      state.activeModSubtab = 'prod';
      if (subtabModAntrean) subtabModAntrean.className = 'subtab-btn';
      subtabModProd.className = 'subtab-btn active-teal';
      if (subtabModKos) subtabModKos.className = 'subtab-btn';
      renderModerasi();
    });
  }
  if (subtabModKos) {
    subtabModKos.addEventListener('click', () => {
      state.activeModSubtab = 'kos';
      if (subtabModAntrean) subtabModAntrean.className = 'subtab-btn';
      if (subtabModProd) subtabModProd.className = 'subtab-btn';
      subtabModKos.className = 'subtab-btn active-teal';
      renderModerasi();
    });
  }

  // 7. Filter Chips User
  document.querySelectorAll('.chip-user-filter').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.chip-user-filter').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.activeUserFilter = chip.dataset.userFilter;
      renderUsersTable();
    });
  });

  // 8. Filter Chips Laporan
  document.querySelectorAll('.chip-lap-filter').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.chip-lap-filter').forEach(c => c.classList.remove('active-teal'));
      chip.classList.add('active-teal');
      state.activeLapFilter = chip.dataset.lapStatus;
      renderLaporanTable();
    });
  });

  // 9. Search Inputs
  document.getElementById('input-search-users')?.addEventListener('input', (e) => {
    state.searchUsers = e.target.value.trim();
    renderUsersTable();
  });
  document.getElementById('input-search-moderasi')?.addEventListener('input', (e) => {
    state.searchMod = e.target.value.trim();
    renderModerasi();
  });
  document.getElementById('input-search-laporan')?.addEventListener('input', (e) => {
    state.searchLaporan = e.target.value.trim();
    renderLaporanTable();
  });

  // 10. Export Data Button
  document.getElementById('btn-export-mhs')?.addEventListener('click', exportDataMahasiswa);

  // 11. DELEGATED CLICK HANDLERS (TABLES & CARDS)
  document.addEventListener('click', async (e) => {
    // --- USER MANAGEMENT ---
    // A. Toggle Blokir / Buka Blokir
    const btnBlock = e.target.closest('.btn-toggle-block-user');
    if (btnBlock) {
      const id = btnBlock.dataset.id;
      const targetUser = state.users.find(u => u.id_mahasiswa === Number(id));
      if (!targetUser) return;

      const willBan = !targetUser.is_banned;
      const yakin = await KM.ui.konfirmasi({
        judul: willBan ? 'Blokir pengguna ini?' : 'Buka blokir pengguna?',
        teks: willBan
          ? `Akun ${targetUser.nama} tidak akan bisa login ke aplikasi.`
          : `Akun ${targetUser.nama} akan bisa login kembali.`,
        teksYa: willBan ? 'Ya, Blokir' : 'Ya, Buka Blokir',
        teksBatal: 'Batal',
        danger: willBan,
      });
      if (!yakin) return;

      KM.ui.loading(willBan ? 'Memblokir pengguna...' : 'Membuka blokir...');
      try {
        const resp = await api(`/admin/users/${id}/block`, {
          method: 'PUT',
          headers: H(),
          body: { is_banned: willBan }
        });

        targetUser.is_banned = resp.is_banned;
        KM.ui.tutup();
        showToast(resp.pesan || (willBan ? 'Pengguna berhasil diblokir.' : 'Blokir pengguna berhasil dibuka.'));
        renderUsersTable();
        renderStats();
      } catch (err) {
        KM.ui.tutup();
        KM.ui.error('Gagal Mengubah Status Blokir', err.message || 'Coba lagi sebentar lagi.');
      }
      return;
    }

    // B. View Detail User Pop-up
    const btnView = e.target.closest('.btn-view-user');
    if (btnView) {
      openModalDetailUser(btnView.dataset.id);
      return;
    }

    // --- VERIFIKASI MAHASISWA & KTM ACTIONS ---
    // A. Quick Verify Mahasiswa
    const btnQuickVerify = e.target.closest('.btn-quick-verify-mhs');
    if (btnQuickVerify) {
      const id = Number(btnQuickVerify.dataset.id);
      const target = state.users.find(u => u.id_mahasiswa === id);
      if (!target) return;

      state.selectedMhs = target;
      modalApproveMhs?.classList.add('open');
      return;
    }

    // B. Quick Reject Mahasiswa
    const btnQuickReject = e.target.closest('.btn-quick-reject-mhs');
    if (btnQuickReject) {
      const id = Number(btnQuickReject.dataset.id);
      const target = state.users.find(u => u.id_mahasiswa === id);
      if (!target) return;

      state.selectedMhs = target;
      modalRejectMhs?.classList.add('open');
      return;
    }

    // C. Buka Detail Mahasiswa & KTM
    const btnOpenDetailMhs = e.target.closest('.btn-open-detail-mhs');
    if (btnOpenDetailMhs) {
      const id = Number(btnOpenDetailMhs.dataset.id);
      openDetailMahasiswa(id);
      return;
    }

    // --- MODERASI LISTING (BARANG & KOS) ---
    // A. Approve Listing (Izinkan Tayang)
    const btnApprove = e.target.closest('.btn-approve-listing');
    if (btnApprove) {
      const type = btnApprove.dataset.type; // 'barang' | 'kos'
      const id = btnApprove.dataset.id;

      KM.ui.loading('Menyetujui listing...');
      try {
        if (type === 'barang') {
          await api(`/admin/barang/${id}/moderasi`, {
            method: 'PUT',
            headers: H(),
            body: { status_moderasi: 'disetujui' }
          });
        } else {
          await api(`/admin/kos/${id}/verifikasi`, {
            method: 'PUT',
            headers: H(),
            body: { status_verifikasi: 'terverifikasi' }
          });
        }
        KM.ui.tutup();
        showToast('Listing berhasil disetujui dan tayang!');
        await muat();
      } catch (err) {
        KM.ui.tutup();
        KM.ui.error('Gagal Menyetujui Listing', err.message || 'Coba lagi sebentar lagi.');
      }
      return;
    }

    // B. Reject Listing Prompt (Buka Modal Alasan)
    const btnRejectPrompt = e.target.closest('.btn-reject-listing-prompt');
    if (btnRejectPrompt) {
      const type = btnRejectPrompt.dataset.type;
      const id = btnRejectPrompt.dataset.id;
      const title = btnRejectPrompt.dataset.title || 'Listing';

      state.selectedRejectListing = { type, id, title };

      const titleEl = document.getElementById('reject-listing-modal-title');
      if (titleEl) titleEl.textContent = `Tolak Listing: ${title}`;

      modalRejectListing?.classList.add('open');
      return;
    }

    // --- SISTEM PELAPORAN ---
    // A. Buka Modal Tindak Lanjut Aduan
    const btnOpenActionLap = e.target.closest('.btn-open-action-lap');
    if (btnOpenActionLap) {
      const id = btnOpenActionLap.dataset.id;
      const defaultAction = btnOpenActionLap.dataset.action; // takedown, banned_user, selesai
      const lap = state.laporan.find(l => l.id_laporan === Number(id));
      if (!lap) return;

      state.selectedLaporan = lap;

      const infoEl = document.getElementById('action-lap-info');
      if (infoEl) {
        infoEl.innerHTML = `
          <div><strong>Pelapor:</strong> ${esc(lap.nama_pelapor || 'User')} (${esc(lap.email_pelapor || '-')})</div>
          <div><strong>Terlapor:</strong> ${esc(lap.nama_terlapor || 'Penjual/Pemilik')}</div>
          <div><strong>Konten Terlapor:</strong> ${esc(lap.target_judul || `${lap.tipe_target} #${lap.id_target}`)}</div>
          <div style="margin-top:4px"><strong>Alasan Aduan:</strong> <span style="color:#DC2626">${esc(lap.alasan)}</span></div>
          <div style="font-size:10px;color:#64748B;margin-top:2px">Keterangan: ${esc(lap.keterangan || '-')}</div>
        `;
      }

      modalActionLap?.classList.add('open');
      return;
    }
  });

  // 12. Modal Reject Listing: Kirim Penolakan
  document.getElementById('btn-confirm-reject-listing')?.addEventListener('click', async () => {
    if (!state.selectedRejectListing) return;
    const { type, id } = state.selectedRejectListing;

    const radioVal = document.querySelector('input[name="listing_reject_reason"]:checked')?.value || 'Tidak sesuai ketentuan';
    const notes = document.getElementById('input-reject-listing-notes')?.value?.trim();
    const fullReason = notes ? `${radioVal}: ${notes}` : radioVal;

    KM.ui.loading('Menolak listing...');
    try {
      if (type === 'barang') {
        await api(`/admin/barang/${id}/moderasi`, {
          method: 'PUT',
          headers: H(),
          body: { status_moderasi: 'ditolak', alasan: fullReason }
        });
      } else {
        await api(`/admin/kos/${id}/verifikasi`, {
          method: 'PUT',
          headers: H(),
          body: { status_verifikasi: 'ditolak', alasan: fullReason }
        });
      }

      KM.ui.tutup();
      modalRejectListing?.classList.remove('open');
      showToast('Listing ditolak dan alasan telah disimpan di database.');
      await muat();
    } catch (err) {
      KM.ui.tutup();
      KM.ui.error('Gagal Menolak Listing', err.message || 'Coba lagi sebentar lagi.');
    }
  });

  document.getElementById('btn-cancel-reject-listing')?.addEventListener('click', () => {
    modalRejectListing?.classList.remove('open');
  });

  // 13. Modal Action Laporan Executions
  const executeLaporanAction = async (tindakan) => {
    if (!state.selectedLaporan) return;
    const id = state.selectedLaporan.id_laporan;
    const catatan = document.getElementById('input-action-lap-notes')?.value?.trim() || null;

    const labelAksi = tindakan === 'takedown'
      ? 'men-takedown konten terlapor'
      : (tindakan === 'banned_user' ? 'memblokir pengguna terlapor' : 'menyelesaikan laporan');
    const yakin = await KM.ui.konfirmasi({
      judul: 'Apakah Anda yakin?',
      teks: `Tindakan ini akan ${labelAksi}.`,
      teksYa: 'Ya, Lanjutkan',
      teksBatal: 'Batal',
      danger: tindakan !== 'selesai',
    });
    if (!yakin) return;

    KM.ui.loading('Memproses laporan...');
    try {
      const resp = await api(`/admin/laporan/${id}/action`, {
        method: 'POST',
        headers: H(),
        body: { tindakan, catatan }
      });

      KM.ui.tutup();
      modalActionLap?.classList.remove('open');
      showToast(resp.pesan || `Laporan berhasil diproses (${tindakan})!`);
      await muat();
    } catch (err) {
      KM.ui.tutup();
      KM.ui.error('Gagal Memproses Laporan', err.message || 'Coba lagi sebentar lagi.');
    }
  };

  document.getElementById('btn-action-lap-takedown')?.addEventListener('click', () => executeLaporanAction('takedown'));
  document.getElementById('btn-action-lap-ban')?.addEventListener('click', () => executeLaporanAction('banned_user'));
  document.getElementById('btn-action-lap-dismiss')?.addEventListener('click', () => executeLaporanAction('selesai'));
  document.getElementById('btn-cancel-action-lap')?.addEventListener('click', () => modalActionLap?.classList.remove('open'));

  // 14. Modal Detail User Actions
  document.getElementById('btn-modal-user-close')?.addEventListener('click', () => {
    modalDetailUser?.classList.remove('open');
  });

  document.getElementById('btn-modal-user-verify')?.addEventListener('click', () => {
    if (!state.selectedUser) return;
    state.selectedMhs = state.selectedUser;
    modalDetailUser?.classList.remove('open');
    modalApproveMhs?.classList.add('open');
  });

  document.getElementById('btn-modal-user-toggle-ban')?.addEventListener('click', async () => {
    if (!state.selectedUser) return;
    const u = state.selectedUser;
    const willBan = !u.is_banned;
    const yakin = await KM.ui.konfirmasi({
      judul: willBan ? 'Blokir pengguna ini?' : 'Buka blokir pengguna?',
      teks: willBan
        ? `Akun ${u.nama} tidak akan bisa login ke aplikasi.`
        : `Akun ${u.nama} akan bisa login kembali.`,
      teksYa: willBan ? 'Ya, Blokir' : 'Ya, Buka Blokir',
      teksBatal: 'Batal',
      danger: willBan,
    });
    if (!yakin) return;

    KM.ui.loading(willBan ? 'Memblokir pengguna...' : 'Membuka blokir...');
    try {
      const resp = await api(`/admin/users/${u.id_mahasiswa}/block`, {
        method: 'PUT',
        headers: H(),
        body: { is_banned: willBan }
      });

      u.is_banned = resp.is_banned;
      KM.ui.tutup();
      showToast(resp.pesan || 'Status pengguna berhasil diperbarui.');
      modalDetailUser?.classList.remove('open');
      renderUsersTable();
      renderStats();
    } catch (err) {
      KM.ui.tutup();
      KM.ui.error('Gagal Mengubah Status', err.message || 'Coba lagi sebentar lagi.');
    }
  });

  // 15. Modal Manual Green Point
  document.getElementById('btn-open-adjust-gp')?.addEventListener('click', () => {
    populateGPUserDropdown();
    modalAdjustGP?.classList.add('open');
  });

  document.getElementById('btn-cancel-adjust-gp')?.addEventListener('click', () => {
    modalAdjustGP?.classList.remove('open');
  });

  document.getElementById('form-adjust-gp')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const userId = Number(document.getElementById('select-gp-user')?.value);
    const direction = document.querySelector('input[name="gp_direction"]:checked')?.value || 'tambah';
    const amount = Number(document.getElementById('input-gp-amount')?.value);
    const reason = document.getElementById('input-gp-reason')?.value?.trim();

    if (!userId || !amount || amount <= 0) {
      KM.ui.peringatan('Data Belum Valid', 'Pilih mahasiswa dan masukkan jumlah poin yang valid.');
      return;
    }

    const finalPoin = direction === 'tambah' ? Math.abs(amount) : -Math.abs(amount);

    KM.ui.loading('Menyesuaikan Green Point...');
    try {
      const resp = await api('/admin/green-points/adjust', {
        method: 'POST',
        headers: H(),
        body: {
          id_mahasiswa: userId,
          jumlah_poin: finalPoin,
          keterangan: reason
        }
      });

      KM.ui.tutup();
      modalAdjustGP?.classList.remove('open');
      showToast(resp.pesan || 'Green Point berhasil disesuaikan!');
      document.getElementById('form-adjust-gp').reset();
      await muat();
    } catch (err) {
      KM.ui.tutup();
      KM.ui.error('Gagal Menyesuaikan Green Point', err.message || 'Coba lagi sebentar lagi.');
    }
  });

  // 16. Detail Mahasiswa (KTM Verification Flow)
  document.getElementById('btn-close-detail-mhs')?.addEventListener('click', () => {
    viewDetailMhs?.classList.remove('open');
  });

  // Tombol Setujui di View Detail Mahasiswa
  document.getElementById('btn-act-setujui')?.addEventListener('click', () => {
    if (!state.selectedMhs) return;
    modalApproveMhs?.classList.add('open');
  });

  // Tombol Tolak di View Detail Mahasiswa
  document.getElementById('btn-act-tolak')?.addEventListener('click', () => {
    if (!state.selectedMhs) return;
    modalRejectMhs?.classList.add('open');
  });

  // Tombol Blokir di View Detail Mahasiswa
  document.getElementById('btn-act-ban-toggle')?.addEventListener('click', async () => {
    if (!state.selectedMhs) return;
    const u = state.selectedMhs;
    const willBan = !u.is_banned;
    const yakin = await KM.ui.konfirmasi({
      judul: willBan ? 'Blokir pengguna ini?' : 'Buka blokir pengguna?',
      teks: willBan
        ? `Akun ${u.nama} tidak akan bisa login ke aplikasi.`
        : `Akun ${u.nama} akan bisa login kembali.`,
      teksYa: willBan ? 'Ya, Blokir' : 'Ya, Buka Blokir',
      teksBatal: 'Batal',
      danger: willBan,
    });
    if (!yakin) return;

    KM.ui.loading(willBan ? 'Memblokir pengguna...' : 'Membuka blokir...');
    try {
      const resp = await api(`/admin/users/${u.id_mahasiswa}/block`, {
        method: 'PUT',
        headers: H(),
        body: { is_banned: willBan }
      });
      u.is_banned = resp.is_banned;
      KM.ui.tutup();
      showToast(resp.pesan || 'Status pengguna berhasil diperbarui.');
      openDetailMahasiswa(u);
      await muat();
    } catch (err) {
      KM.ui.tutup();
      KM.ui.error('Gagal Mengubah Status', err.message || 'Coba lagi sebentar lagi.');
    }
  });

  // Modal Approve Mahasiswa (Konfirmasi Verifikasi + 15 Green Point)
  document.getElementById('btn-confirm-approve-mhs')?.addEventListener('click', async () => {
    if (!state.selectedMhs) return;
    const id = state.selectedMhs.id_mahasiswa;

    KM.ui.loading('Memverifikasi mahasiswa...');
    try {
      await api(`/mahasiswa/${id}/verifikasi`, {
        method: 'PATCH',
        headers: H(),
        body: { status_verifikasi: 'terverifikasi' }
      });

      KM.ui.tutup();
      modalApproveMhs?.classList.remove('open');
      showToast('Mahasiswa berhasil diverifikasi & +15 Green Point diberikan!');
      viewDetailMhs?.classList.remove('open');
      await muat();
    } catch (err) {
      KM.ui.tutup();
      KM.ui.error('Gagal Memverifikasi Mahasiswa', err.message || 'Coba lagi sebentar lagi.');
    }
  });

  document.getElementById('btn-cancel-approve-mhs')?.addEventListener('click', () => {
    modalApproveMhs?.classList.remove('open');
  });

  // Modal Reject Mahasiswa (Kirim Penolakan dengan Alasan)
  document.getElementById('btn-confirm-reject-mhs')?.addEventListener('click', async () => {
    if (!state.selectedMhs) return;
    const id = state.selectedMhs.id_mahasiswa;

    const radioVal = document.querySelector('input[name="reject_reason"]:checked')?.value || 'Dokumen belum memenuhi kriteria';
    const notes = document.getElementById('reject-notes')?.value?.trim();
    const fullReason = notes ? `${radioVal}: ${notes}` : radioVal;

    KM.ui.loading('Menolak pengajuan...');
    try {
      await api(`/mahasiswa/${id}/verifikasi`, {
        method: 'PATCH',
        headers: H(),
        body: { status_verifikasi: 'ditolak', alasan_penolakan: fullReason }
      });

      KM.ui.tutup();
      modalRejectMhs?.classList.remove('open');
      showToast('Pengajuan mahasiswa telah ditolak.');
      viewDetailMhs?.classList.remove('open');
      await muat();
    } catch (err) {
      KM.ui.tutup();
      KM.ui.error('Gagal Menolak Pengajuan', err.message || 'Coba lagi sebentar lagi.');
    }
  });

  document.getElementById('btn-cancel-reject-mhs')?.addEventListener('click', () => {
    modalRejectMhs?.classList.remove('open');
  });

  // Tutup modal jika backdrop diklik
  modalApproveMhs?.addEventListener('click', (e) => {
    if (e.target === modalApproveMhs) modalApproveMhs.classList.remove('open');
  });
  modalRejectMhs?.addEventListener('click', (e) => {
    if (e.target === modalRejectMhs) modalRejectMhs.classList.remove('open');
  });

  // Perbesar Dokumen KTM
  document.getElementById('btn-zoom-ktm')?.addEventListener('click', () => {
    if (!state.selectedMhs) return;
    const imgSrc = state.selectedMhs.ktm ? getFoto(state.selectedMhs.ktm) : null;
    if (!imgSrc) {
      KM.ui.info('Dokumen KTM', 'Tidak ada foto KTM yang diunggah untuk mahasiswa ini.');
      return;
    }
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        title: 'Kartu Tanda Mahasiswa (KTM)',
        imageUrl: imgSrc,
        imageAlt: 'Foto KTM',
        confirmButtonText: 'Tutup',
        buttonsStyling: false,
        customClass: {
          popup: 'rounded-2xl shadow-xl border-0',
          title: 'text-lg font-bold text-gray-800',
          confirmButton: 'bg-[#059669] text-white px-8 py-2.5 rounded-xl font-semibold hover:bg-emerald-700 transition-colors'
        }
      });
    } else {
      window.open(imgSrc, '_blank');
    }
  });

  // 17. Admin Logout
  document.getElementById('btn-admin-logout')?.addEventListener('click', async () => {
    const yakin = await KM.ui.konfirmasi({
      judul: 'Kunci panel admin?',
      teks: 'Kamu perlu memasukkan kunci admin lagi untuk membuka panel ini.',
      teksYa: 'Ya, Kunci',
      teksBatal: 'Batal',
      danger: true,
    });
    if (!yakin) return;
    sessionStorage.removeItem('km_admin');
    if (viewApp) viewApp.style.display = 'none';
    if (viewLock) viewLock.style.display = 'block';
    KM.ui.toast('Akses admin telah dikunci');
  });
});
