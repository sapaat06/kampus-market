// public/js/kos-owner.js
// Dashboard pemilik kost: lihat daftar kost milik, tambah, edit, ubah status, hapus

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function showToast(msg, elId = 'toastMsg', bgClass = '') {
  const el = document.getElementById(elId);
  const txt = document.getElementById(elId === 'toastMsg' ? 'toastText' : 'toastErrorText');
  if (!el || !txt) return;
  txt.textContent = msg;
  el.style.display = 'flex';
  if (bgClass) el.className = 'toast ' + bgClass;
  setTimeout(() => { el.style.display = 'none'; }, 3000);
}

async function initKosOwner() {
  const backBtn = document.getElementById('backBtn');
  const emptyState = document.getElementById('emptyState');
  const kosList = document.getElementById('kosList');
  const btnAddKos = document.getElementById('btnAddKos');
  const btnAddKos2 = document.getElementById('btnAddKos2');
  const toastMsg = document.getElementById('toastMsg');

  // Back button
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      if (window.history.length > 1) window.history.back();
      else window.location.href = '/beranda.html';
    });
  }

  // Check authentication and role
  let userData = null;
  try {
    userData = await KM.get('/saya');
  } catch (e) {
    showToast('Anda belum login', 'toastMsg');
    setTimeout(() => { window.location.href = '/masuk.html'; }, 1000);
    return;
  }

  if (userData.role !== 'pemilik_kost') {
    showToast('Akses hanya untuk pemilik kost', 'toastError', 'toast');
    setTimeout(() => { window.location.href = '/beranda.html'; }, 1500);
    return;
  }

  // Add buttons
  const openAddModal = () => {
    currentKosId = null;
    document.getElementById('modalKosTitle').textContent = 'Tambah Kost';
    document.getElementById('formKos').reset();
    document.getElementById('kosStatus').value = 'tersedia';
    selectJenis('campur');
    modalKos.style.display = 'flex';
  };

  if (btnAddKos) btnAddKos.addEventListener('click', openAddModal);
  if (btnAddKos2) btnAddKos2.addEventListener('click', openAddModal);

  // Load kos list
  async function loadKos() {
    try {
      const data = await KM.get('/kos/miliku');
      renderKos(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Gagal memuat kost:', e);
      showToast('Gagal memuat data kost', 'toastError', 'toast');
    }
  }

  function renderKos(items) {
    if (!kosList) return;
    if (emptyState) emptyState.style.display = items.length === 0 ? 'flex' : 'none';
    kosList.style.display = items.length === 0 ? 'none' : 'block';

    kosList.innerHTML = items.map(k => `
      <div class="kos-card" data-id="${k.id_kos}">
        <div class="kos-thumb">
          ${k.foto ? `<img src="${escHtml(k.foto)}" alt="${escHtml(k.nama_kos)}" style="width:100%;height:100%;object-fit:cover;border-radius:12px;">`
            : `<svg viewBox="0 0 24 24"><rect x="5" y="2" width="14" height="20" rx="3"/><path d="M8 6h8M8 11h2M12 11h2M16 11h.01M8 15h2M12 15h2M16 15h.01"/></svg>`}
        </div>
        <div class="kos-info">
          <div class="kos-name">${escHtml(k.nama_kos)}</div>
          <div class="kos-addr">${escHtml(k.alamat || '-')}</div>
          <div class="kos-price">Rp${Number(k.harga_bulan || 0).toLocaleString('id-ID')}/bln</div>
        </div>
        <div class="kos-status ${k.status_kos}">${k.status_kos === 'tersedia' ? 'Tersedia' : 'Tidak Tersedia'}</div>
      </div>
      <div class="action-group">
        <button class="action-btn edit" data-id="${k.id_kos}">Edit</button>
        <button class="action-btn status" data-id="${k.id_kos}" data-status="${k.status_kos}">
          ${k.status_kos === 'tersedia' ? 'Tutup' : 'Buka'}
        </button>
        <button class="action-btn delete" data-id="${k.id_kos}">Hapus</button>
      </div>
      <hr style="border:none;border-top:1px solid var(--border-light);margin:12px 0;">
    `).join('');

    // Edit buttons
    kosList.querySelectorAll('.action-btn.edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = Number(btn.getAttribute('data-id'));
        const k = items.find(x => x.id_kos === id);
        if (k) openEditModal(k);
      });
    });

    // Status toggle buttons
    kosList.querySelectorAll('.action-btn.status').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = Number(btn.getAttribute('data-id'));
        const currentStatus = btn.getAttribute('data-status');
        const newStatus = currentStatus === 'tersedia' ? 'tidak_tersedia' : 'tersedia';
        try {
          await KM.patch('/kos/' + id, { status_kos: newStatus });
          btn.textContent = newStatus === 'tersedia' ? 'Tutup' : 'Buka';
          btn.setAttribute('data-status', newStatus);
          const card = btn.closest('.kos-card');
          const statusDiv = card.querySelector('.kos-status');
          statusDiv.className = 'kos-status ' + newStatus;
          statusDiv.textContent = newStatus === 'tersedia' ? 'Tersedia' : 'Tidak Tersedia';
          showToast('Status kost diperbarui');
        } catch (err) {
          showToast(err.message || 'Gagal mengubah status', 'toastError', 'toast');
        }
      });
    });

    // Delete buttons
    kosList.querySelectorAll('.action-btn.delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = Number(btn.getAttribute('data-id'));
        if (!confirm('Hapus kost ini? Data akan dihapus permanen.')) return;
        KM.delete('/kos/' + id)
          .then(() => { loadKos(); showToast('Kost dihapus'); })
          .catch(err => showToast(err.message || 'Gagal menghapus', 'toastError', 'toast'));
      });
    });
  }

  // Modal elements
  const modalKos = document.getElementById('modalKos');
  const modalKosClose = document.getElementById('modalKosClose');
  const formKos = document.getElementById('formKos');
  const btnSimpanKos = document.getElementById('btnSimpanKos');
  const jenisChips = document.querySelectorAll('#jenisChips .type-chip');
  let currentKosId = null;
  let selectedJenis = 'campur';

  function selectJenis(val) {
    selectedJenis = val;
    jenisChips.forEach(c => {
      c.classList.toggle('active', c.getAttribute('data-val') === val);
    });
  }

  jenisChips.forEach(chip => {
    chip.addEventListener('click', () => selectJenis(chip.getAttribute('data-val')));
  });

  if (modalKosClose) {
    modalKosClose.addEventListener('click', () => { modalKos.style.display = 'none'; });
  }
  modalKos.addEventListener('click', (e) => {
    if (e.target === modalKos) modalKos.style.display = 'none';
  });

  function openEditModal(k) {
    currentKosId = k.id_kos;
    document.getElementById('modalKosTitle').textContent = 'Edit Kost';
    document.getElementById('kosNama').value = k.nama_kos || '';
    document.getElementById('kosAlamat').value = k.alamat || '';
    document.getElementById('kosHarga').value = k.harga_bulan || '';
    document.getElementById('kosFasilitas').value = k.fasilitas || '';
    document.getElementById('kosKamar').value = k.kamar_tersedia || 0;
    document.getElementById('kosStatus').value = k.status_kos || 'tersedia';
    document.getElementById('kosDeskripsi').value = k.deskripsi || '';
    selectJenis(k.jenis_kelamin || 'campur');
    modalKos.style.display = 'flex';
  }

  // Form submit
  if (formKos) {
    formKos.addEventListener('submit', async (e) => {
      e.preventDefault();
      btnSimpanKos.disabled = true;
      btnSimpanKos.textContent = 'Menyimpan...';

      const payload = {
        nama_kos: document.getElementById('kosNama').value.trim(),
        alamat: document.getElementById('kosAlamat').value.trim(),
        harga_bulan: Number(document.getElementById('kosHarga').value),
        fasilitas: document.getElementById('kosFasilitas').value.trim() || undefined,
        jenis_kelamin: selectedJenis,
        kamar_tersedia: Number(document.getElementById('kosKamar').value) || 0,
        status_kos: document.getElementById('kosStatus').value,
        deskripsi: document.getElementById('kosDeskripsi').value.trim() || undefined,
      };

      try {
        if (currentKosId) {
          await KM.patch('/kos/' + currentKosId, payload);
          showToast('Kost diperbarui');
        } else {
          await KM.post('/kos', payload);
          showToast('Kost berhasil ditambahkan');
        }
        modalKos.style.display = 'none';
        loadKos();
      } catch (err) {
        showToast(err.message || 'Gagal menyimpan', 'toastError', 'toast');
      } finally {
        btnSimpanKos.disabled = false;
        btnSimpanKos.textContent = 'Simpan Kost';
      }
    });
  }

  loadKos();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initKosOwner);
} else {
  initKosOwner();
}
