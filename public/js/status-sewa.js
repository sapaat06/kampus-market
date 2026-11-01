// public/js/status-sewa.js
// Status Transaksi Sewa & Pinjam (Screen 15) & Alur Pengembalian Barang (Screen 20)

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
  const returnModal = document.getElementById('returnModal');
  const closeReturnModal = document.getElementById('closeReturnModal');
  const confirmReturnBtn = document.getElementById('confirmReturnBtn');
  const rewardModal = document.getElementById('rewardModal');
  const modalPtsText = document.getElementById('modalPtsText');
  const modalProfileBtn = document.getElementById('modalProfileBtn');
  const modalHomeBtn = document.getElementById('modalHomeBtn');

  // Return modal elements
  const returnItemThumb = document.getElementById('returnItemThumb');
  const returnItemTitle = document.getElementById('returnItemTitle');
  const returnItemPrice = document.getElementById('returnItemPrice');
  const returnItemLoc = document.getElementById('returnItemLoc');
  const returnItemTag = document.getElementById('returnItemTag');
  const returnBannerSub = document.getElementById('returnBannerSub');
  const returnJadwal = document.getElementById('returnJadwal');
  const returnLokasi = document.getElementById('returnLokasi');

  let currentReturnTx = null;

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

  // Close return modal
  if (closeReturnModal && returnModal) {
    closeReturnModal.addEventListener('click', () => {
      returnModal.style.display = 'none';
    });
  }

  // Confirm return action
  if (confirmReturnBtn) {
    confirmReturnBtn.addEventListener('click', async () => {
      if (!currentReturnTx) return;
      confirmReturnBtn.disabled = true;
      confirmReturnBtn.textContent = 'Memproses...';

      let ptsEarned = 25;
      try {
        if (currentReturnTx.id_transaksi) {
          const resp = await KM.patch('/transaksi/' + currentReturnTx.id_transaksi + '/selesai');
          if (resp && resp.poin_didapat) {
            ptsEarned = resp.poin_didapat;
          }
        }
      } catch (err) {
        console.warn('Gagal memproses pengembalian:', err);
      }

      if (returnModal) returnModal.style.display = 'none';
      if (modalPtsText) modalPtsText.textContent = `+${ptsEarned} Poin`;
      if (rewardModal) rewardModal.style.display = 'flex';
      confirmReturnBtn.disabled = false;
      confirmReturnBtn.textContent = 'Konfirmasi Pengembalian';
    });
  }

  // Modal celebration buttons
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

  // Load user data
  let userData = null;
  try {
    userData = await KM.get('/saya');
  } catch (_e) {}

  const rawList = (userData && Array.isArray(userData.transaksi)) ? userData.transaksi : [];
  const sewaTransaksi = rawList.filter(t => t.jenis_transaksi === 'sewa');

  if (sewaTransaksi.length === 0) {
    if (emptyState) emptyState.style.display = 'flex';
    if (transactionList) transactionList.innerHTML = '';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';
  transactionList.innerHTML = '';

  for (const tx of sewaTransaksi) {
    let product = null;
    if (tx.id_barang) {
      try {
        product = await KM.get('/barang/' + tx.id_barang);
      } catch (_e) {}
    }

    const isSelesai = tx.status === 'selesai';
    const isBatal = tx.status === 'batal';
    const isBerjalan = tx.status === 'berjalan' || (!isSelesai && !isBatal);

    const fotoUrl = product?.foto || tx.foto || '/img/kalkulator-casio.png';
    const namaBarang = product?.nama_barang || tx.nama_barang || 'Kalkulator Casio fx-991ID Plus';
    const hargaFormat = tx.harga_sewa ? `Rp${Number(tx.harga_sewa).toLocaleString('id-ID')}/hari` : 'Rp5.000/hari';
    const totalHargaFmt = tx.total_harga ? `Rp${Number(tx.total_harga).toLocaleString('id-ID')}` : 'Rp15.000';
    const depositFmt = tx.deposit ? `Rp${Number(tx.deposit).toLocaleString('id-ID')}` : 'Rp50.000';
    const lokasiText = tx.lokasi || (product?.lokasi ? `350 m · ${product.lokasi}` : '350 m · Fakultas Teknik');
    const txIdText = String(tx.id_transaksi).startsWith('KC-') ? tx.id_transaksi : `KC-${tx.id_transaksi}`;
    const tglTx = tx.tanggal_transaksi || '26 Okt 2026 · 16.05';
    const periode = tx.periode_sewa || '27–30 Okt 2026';
    const batas = tx.batas_pengembalian || '30 Okt · 10.00 WIB';

    const cardGroup = document.createElement('div');
    cardGroup.style.display = 'flex';
    cardGroup.style.flexDirection = 'column';
    cardGroup.style.gap = '12px';

    cardGroup.innerHTML = `
      <!-- Card 1: Item Card -->
      <div class="item-card">
        <div class="item-thumb">
          <img src="${escHtml(fotoUrl)}" alt="${escHtml(namaBarang)}">
        </div>
        <div class="item-info">
          <span class="item-tag">Sewa</span>
          <div class="item-title">${escHtml(namaBarang)}</div>
          <div class="item-price">${escHtml(hargaFormat)}</div>
          <div class="item-loc">${escHtml(lokasiText)}</div>
        </div>
      </div>

      <!-- Status Badge -->
      <div class="status-badge-row">
        <span class="status-pill ${isSelesai ? 'selesai' : (isBatal ? 'batal' : 'sedang-disewa')}">
          ${isSelesai ? 'Selesai' : (isBatal ? 'Dibatalkan' : 'Sedang Disewa')}
        </span>
      </div>

      <!-- Card 2: Details / Struk -->
      <div class="details-card">
        <div class="detail-row">
          <span class="detail-label">ID transaksi</span>
          <span class="detail-val">${escHtml(txIdText)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Tanggal transaksi</span>
          <span class="detail-val">${escHtml(tglTx)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Periode sewa</span>
          <span class="detail-val">${escHtml(periode)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Batas pengembalian</span>
          <span class="detail-val">${escHtml(batas)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Biaya / deposit</span>
          <span class="detail-val">${escHtml(totalHargaFmt)} / ${escHtml(depositFmt)}</span>
        </div>
      </div>

      <!-- Card 3: Timeline -->
      <div class="timeline-card">
        <div class="timeline-title">Perjalanan sewamu</div>
        <div class="stepper">
          <div class="step-row">
            <div class="step-axis">
              <div class="step-dot done"><svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg></div>
              <div class="step-line"></div>
            </div>
            <div class="step-text">
              <div class="step-header">Menunggu Persetujuan</div>
              <div class="step-sub">26 Okt · 16.05</div>
            </div>
          </div>
          <div class="step-row">
            <div class="step-axis">
              <div class="step-dot done"><svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg></div>
              <div class="step-line ${isSelesai ? '' : 'gray'}"></div>
            </div>
            <div class="step-text">
              <div class="step-header">Dikemas</div>
              <div class="step-sub">26 Okt · 16.20</div>
            </div>
          </div>
          <div class="step-row">
            <div class="step-axis">
              <div class="step-dot ${isSelesai ? 'done' : 'active'}">
                ${isSelesai ? '<svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg>' : ''}
              </div>
              <div class="step-line ${isSelesai ? '' : 'gray'}"></div>
            </div>
            <div class="step-text">
              <div class="step-header">${isSelesai ? 'Disewa' : 'Sedang Disewa'}</div>
              <div class="step-sub">${escHtml(periode)}</div>
            </div>
          </div>
          <div class="step-row">
            <div class="step-axis">
              <div class="step-dot ${isSelesai ? 'done' : 'pending'}">
                ${isSelesai ? '<svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg>' : ''}
              </div>
            </div>
            <div class="step-text">
              <div class="step-header">${isSelesai ? 'Pengembalian Selesai' : 'Pengembalian'}</div>
              <div class="step-sub">${isSelesai ? 'Barang telah diterima pemilik' : 'Batas: 30 Okt 10.00 WIB'}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Button -->
      <div class="action-wrap">
        ${!isSelesai && !isBatal ? `
          <button class="btn-kembalikan" data-action="kembalikan">Ajukan Pengembalian</button>
        ` : `
          <button class="btn-kembalikan disabled" disabled>Transaksi Selesai</button>
        `}
      </div>
    `;

    const kembalikanBtn = cardGroup.querySelector('[data-action="kembalikan"]');
    if (kembalikanBtn) {
      kembalikanBtn.addEventListener('click', () => {
        currentReturnTx = tx;
        if (returnItemTitle) returnItemTitle.textContent = namaBarang;
        if (returnItemPrice) returnItemPrice.textContent = hargaFormat;
        if (returnItemLoc) returnItemLoc.textContent = lokasiText;
        if (returnBannerSub) returnBannerSub.textContent = `${txIdText} · Pastikan barang dan penutup lengkap.`;
        if (returnJadwal) returnJadwal.textContent = batas;
        if (returnLokasi) returnLokasi.textContent = tx.titik_bertemu || 'Lobi Fakultas Teknik';
        if (returnModal) returnModal.style.display = 'flex';
      });
    }

    transactionList.appendChild(cardGroup);
  }
}

document.addEventListener('DOMContentLoaded', initSewa);
