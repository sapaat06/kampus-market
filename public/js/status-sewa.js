// public/js/status-sewa.js
// Menampilkan daftar transaksi sewa milik pengguna login,
// dengan stepper status per transaksi dan Green Points saat selesai.

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function initSewa() {
  const backBtn = document.getElementById('backBtn');
  const emptyState = document.getElementById('emptyState');
  const gotoCatalog = document.getElementById('gotoCatalog');
  const transactionList = document.getElementById('transactionList');
  const scrollBody = document.getElementById('scrollBody');
  const rewardModal = document.getElementById('rewardModal');
  const modalPtsText = document.getElementById('modalPtsText');
  const modalProfileBtn = document.getElementById('modalProfileBtn');
  const modalHomeBtn = document.getElementById('modalHomeBtn');

  // Back button
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = '/beranda.html';
      }
    });
  }

  // Go to catalog
  if (gotoCatalog) {
    gotoCatalog.addEventListener('click', () => {
      window.location.href = '/beranda.html';
    });
  }

  // Modal buttons
  if (modalProfileBtn) {
    modalProfileBtn.addEventListener('click', () => {
      rewardModal.style.display = 'none';
      window.location.href = '/profil.html';
    });
  }
  if (modalHomeBtn) {
    modalHomeBtn.addEventListener('click', () => {
      rewardModal.style.display = 'none';
      window.location.href = '/beranda.html';
    });
  }

  // Load user data and rental transactions
  let userData = null;
  try {
    userData = await KM.get('/saya');
  } catch (e) {
    // Not authenticated or error; show empty state
    if (emptyState) emptyState.style.display = 'flex';
    if (transactionList) transactionList.style.display = 'none';
    return;
  }

  const transaksiList = Array.isArray(userData.transaksi) ? userData.transaksi : [];
  const sewaTransaksi = transaksiList.filter(t => t.jenis_transaksi === 'sewa');

  if (!sewaTransaksi || sewaTransaksi.length === 0) {
    if (emptyState) emptyState.style.display = 'flex';
    if (transactionList) transactionList.style.display = 'none';
    return;
  }

  // Hide empty state, show list
  if (emptyState) emptyState.style.display = 'none';
  if (transactionList) transactionList.style.display = 'block';

  // Render each sewa transaction
  transactionList.innerHTML = '';

  for (const tx of sewaTransaksi) {
    // Fetch product details for image and owner info
    let product = null;
    try {
      product = await KM.get('/barang/' + tx.id_barang);
    } catch (_e) {}

    const isSelesai = tx.status === 'selesai';
    const isBatal = tx.status === 'batal';
    const isBerjalan = tx.status === 'berjalan';

    const badgeClass = isSelesai ? 'selesai' : (isBatal ? 'batal' : 'sewa');
    const badgeText = isSelesai ? 'Selesai' : (isBatal ? 'Dibatalkan' : 'Sedang Disewa');

    const startDate = tx.tanggal_mulai ? new Date(tx.tanggal_mulai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
    const endDate = tx.tanggal_selesai ? new Date(tx.tanggal_selesai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
    const hargaText = tx.total_harga ? `Rp${Number(tx.total_harga).toLocaleString('id-ID')}` : '-';

    const fotos = typeof KM !== 'undefined' && KM.getFotos ? KM.getFotos(product?.foto) : (product?.foto ? [product.foto] : []);
    const mainFoto = fotos[0] || null;

    const card = document.createElement('div');
    card.className = 'item-card';
    card.innerHTML = `
      <div class="item-icon">
        ${mainFoto
          ? `<img src="${escHtml(mainFoto)}" alt="${escHtml(product.nama_barang || '')}" style="width:100%;height:100%;object-fit:cover;border-radius:14px;">`
          : `<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M7 8h10M7 12h10M7 16h6"/></svg>`}
      </div>
      <div class="item-info">
        <div class="item-title">${escHtml(product ? product.nama_barang : 'Barang Sewa')}</div>
        <div class="item-sub">${escHtml(product ? product.nama_penjual : 'Pemilik')} · ${startDate} s/d ${endDate}</div>
        <div class="chips-row">
          <span class="badge-chip sewa">Sewa</span>
          <span class="badge-chip ${badgeClass}">${badgeText}</span>
        </div>
      </div>
    `;

    // Gallery foto jika memiliki foto
    let galleryElem = null;
    if (fotos.length > 0) {
      galleryElem = document.createElement('div');
      galleryElem.style.cssText = 'background:#fff;border:1px solid var(--border-light);border-radius:16px;padding:12px 14px;box-shadow:0 2px 6px rgba(0,0,0,0.02);display:flex;flex-direction:column;gap:8px';
      galleryElem.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:12px;font-weight:700;color:var(--text-dark)">Foto Barang Sewa</span>
          <span style="font-size:11px;font-weight:600;color:var(--orange);background:var(--peach-bg);padding:2px 8px;border-radius:999px">${fotos.length} Foto</span>
        </div>
        <div style="display:flex;gap:8px;overflow-x:auto;scrollbar-width:none">
          ${fotos.map((f, idx) => `
            <div style="width:72px;height:72px;border-radius:12px;overflow:hidden;border:1px solid var(--border-light);flex-shrink:0">
              <img src="${escHtml(f)}" alt="Foto ${idx + 1}" style="width:100%;height:100%;object-fit:cover">
            </div>`).join('')}
        </div>
      `;
    }

    // Stepper section for this transaction
    const stepperWrapper = document.createElement('div');
    stepperWrapper.className = '';
    stepperWrapper.innerHTML = `
      <div class="sec-title">Lacak Status Sewa #${tx.id_transaksi}</div>
      <div class="stepper">
        <div class="step-item">
          <div class="step-axis">
            <div class="step-dot ${tx.status !== 'batal' ? 'done' : 'pending'}"><svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg></div>
            <div class="step-line ${tx.status === 'batal' ? 'gray' : ''}"></div>
          </div>
          <div class="step-content">
            <div class="step-title">${tx.status === 'batal' ? 'Pengajuan dibatalkan' : 'Pengajuan sewa dikirim'}</div>
            <div class="step-date">${tx.status === 'batal' ? 'Transaksi dibatalkan' : 'Hari ini · Selesai'}</div>
          </div>
        </div>
        <div class="step-item">
          <div class="step-axis">
            <div class="step-dot ${(isSelesai || isBerjalan) && !isBatal ? 'done' : 'pending'}"><svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg></div>
            <div class="step-line ${isBatal ? 'gray' : ((isSelesai || isBerjalan) ? '' : 'gray')}"></div>
          </div>
          <div class="step-content">
            <div class="step-title">${isBatal ? 'Disetujui pemilik (dibatalkan)' : 'Disetujui pemilik'}</div>
            <div class="step-date">${isBatal ? 'Pembatalan sebelum disetujui' : 'Pemilik menyetujui jadwal sewa'}</div>
          </div>
        </div>
        <div class="step-item">
          <div class="step-axis">
            <div class="step-dot ${(isSelesai || isBerjalan) && !isBatal ? 'done' : 'pending'}"><svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg></div>
            <div class="step-line ${isBatal ? 'gray' : ((isSelesai || isBerjalan) ? '' : 'gray')}"></div>
          </div>
          <div class="step-content">
            <div class="step-title">${isBatal ? 'Pembayaran & serah terima (dibatalkan)' : 'Pembayaran & Barang diserahkan'}</div>
            <div class="step-date">${isBatal ? 'Dibatalkan sebelum pengiriman' : 'COD & Serah terima di kampus'}</div>
          </div>
        </div>
        <div class="step-item">
          <div class="step-axis">
            <div class="step-dot ${isSelesai && !isBatal ? 'done' : (isBerjalan && !isBatal ? 'active' : 'pending')}" id="dot4-${tx.id_transaksi}"></div>
            <div class="step-line ${isBatal ? 'gray' : (isSelesai ? '' : (isBerjalan ? 'gray' : 'gray'))}" id="line4-${tx.id_transaksi}"></div>
          </div>
          <div class="step-content">
            <div class="step-title" id="title4-${tx.id_transaksi}">${isSelesai ? 'Selesai - Barang dikembalikan' : (isBerjalan ? 'Sedang disewa' : 'Menunggu serah terima')}</div>
            <div class="step-date ${isSelesai ? 'active-text' : (isBerjalan ? 'active-text' : 'pending-text')}" id="date4-${tx.id_transaksi}">
              ${isSelesai ? 'Barang telah dikembalikan' : (isBerjalan ? `Hingga ${endDate}` : 'Menunggu konfirmasi pemilik')}
            </div>
          </div>
        </div>
        <div class="step-item">
          <div class="step-axis">
            <div class="step-dot ${isSelesai && !isBatal ? 'done' : 'pending'}" id="dot5-${tx.id_transaksi}"></div>
          </div>
          <div class="step-content">
            <div class="step-title ${isSelesai ? '' : 'pending-text'}" id="title5-${tx.id_transaksi}">${isSelesai ? 'Barang telah dikembalikan & Selesai' : 'Barang dikembalikan & Selesai'}</div>
            <div class="step-date ${isSelesai ? '' : 'pending-text'}" id="date5-${tx.id_transaksi}">${isSelesai ? 'Selesai · Green Points telah ditambahkan' : 'Menunggu konfirmasi pengembalian'}</div>
          </div>
        </div>
      </div>

      <!-- Info -->
      <div style="margin-top:8px;font-size:12px;color:var(--text-muted);display:flex;gap:10px;flex-wrap:wrap">
        <span><strong>Total:</strong> ${hargaText}</span>
        <span><strong>Metode:</strong> ${escHtml(tx.metode_pembayaran || '-')}</span>
        <span><strong>Lokasi:</strong> ${escHtml(tx.lokasi || '-')}</span>
      </div>

      <!-- Reward -->
      ${isSelesai ? `
        <div class="reward-box">
          <div class="reward-title">+${tx.poin_didapat || 25} Green Points</div>
          <div class="reward-sub">Green Points telah ditambahkan ke akun Anda</div>
        </div>
      ` : ''}

      <!-- CTA Button -->
      ${isBerjalan ? `
        <button class="cta-btn" data-tx="${tx.id_transaksi}" data-total="${tx.total_harga || 0}">Tandai Sudah Dikembalikan</button>
      ` : isSelesai ? `
        <button class="cta-btn completed" disabled>✓ Sewa Telah Selesai</button>
      ` : `
        <button class="cta-btn" style="background:#CBD5E1" disabled>${isBatal ? 'Transaksi Dibatalkan' : 'Menunggu Konfirmasi'}</button>
      `}

      <hr style="border:none;border-top:1px solid var(--border-light);margin:16px 0;">
    `;

    transactionList.appendChild(card);
    if (galleryElem) transactionList.appendChild(galleryElem);
    transactionList.appendChild(stepperWrapper);
  }

  // Handle return buttons for each "berjalan" transaction
  transactionList.querySelectorAll('.cta-btn[data-tx]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const txId = e.target.getAttribute('data-tx');
      const totalHarga = Number(e.target.getAttribute('data-total') || 0);
      const btnEl = e.target;

      btnEl.disabled = true;
      btnEl.textContent = 'Memproses...';

      let ptsEarned = 25;
      try {
        const resp = await KM.patch('/transaksi/' + txId + '/selesai');
        if (resp && resp.poin_didapat) {
          ptsEarned = resp.poin_didapat;
        }
      } catch (err) {
        console.warn('Gagal memproses penyelesaian transaksi:', err);
        btnEl.disabled = false;
        btnEl.textContent = 'Tandai Sudah Dikembalikan';
        return;
      }

      // Update UI for this transaction
      const dot4 = document.getElementById('dot4-' + txId);
      const line4 = document.getElementById('line4-' + txId);
      const dot5 = document.getElementById('dot5-' + txId);
      const title5 = document.getElementById('title5-' + txId);
      const date5 = document.getElementById('date5-' + txId);

      if (dot4) {
        dot4.className = 'step-dot done';
        dot4.innerHTML = '<svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg>';
      }
      if (line4) line4.className = 'step-line';
      if (dot5) {
        dot5.className = 'step-dot done';
        dot5.innerHTML = '<svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg>';
      }
      if (title5) {
        title5.className = 'step-title';
        title5.textContent = 'Barang berhasil dikembalikan';
      }
      if (date5) {
        date5.className = 'step-date active-text';
        date5.textContent = 'Hari ini · Selesai';
      }

      btnEl.textContent = '✓ Pengembalian Berhasil';
      btnEl.classList.add('completed');

      if (modalPtsText) {
        modalPtsText.textContent = `+${ptsEarned} Poin`;
      }

      if (rewardModal) {
        setTimeout(() => {
          rewardModal.style.display = 'flex';
        }, 300);
      }
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSewa);
} else {
  initSewa();
}
