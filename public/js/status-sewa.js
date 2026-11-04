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
    backBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (typeof goBack === 'function') {
        goBack('/beranda.html');
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
      KM.ui.loading('Menyelesaikan transaksi...');
      try {
        if (currentReturnTx.id_transaksi) {
          const resp = await KM.patch('/transaksi/' + currentReturnTx.id_transaksi + '/selesai');
          if (resp && resp.poin_didapat) {
            ptsEarned = resp.poin_didapat;
          }
        }
        KM.ui.tutup();
        KM.ui.toast('Pengembalian barang berhasil');
      } catch (err) {
        KM.ui.tutup();
        KM.ui.error('Gagal Menyelesaikan Transaksi', err.message || 'Transaksi tidak dapat diselesaikan. Periksa koneksi kamu.');
        confirmReturnBtn.disabled = false;
        confirmReturnBtn.textContent = 'Konfirmasi Pengembalian';
        return;
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

  const urlParams = new URLSearchParams(window.location.search);
  const txId = urlParams.get('id_transaksi');

  // Load transaction data: prioritized by ?id_transaksi, fallback to user transactions
  let sewaTransaksi = [];
  let isOwnerViewing = false;

  if (txId) {
    try {
      const single = await KM.get('/transaksi/' + txId);
      if (single && (single.jenis_transaksi === 'sewa' || single.jenis_transaksi === 'pinjam')) {
        sewaTransaksi = [single];
      }
    } catch (_e) {}
  }

  if (sewaTransaksi.length === 0) {
    let userData = null;
    try {
      userData = await KM.get('/saya');
    } catch (_e) {
      KM.ui.error('Gagal Memuat Transaksi', 'Data transaksi sewa tidak bisa diambil. Periksa koneksi kamu atau masuk kembali.');
      return;
    }

    const rawList = [
      ...((userData && Array.isArray(userData.transaksi)) ? userData.transaksi : []),
      ...((userData && Array.isArray(userData.transaksi_penjualan)) ? userData.transaksi_penjualan : [])
    ];
    sewaTransaksi = rawList.filter(t => t.jenis_transaksi === 'sewa');
  }

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

    const isKos = Boolean(tx.is_kos || (tx.id_transaksi && String(tx.id_transaksi).startsWith('KST-')));
    const isSelesai = tx.status === 'selesai' || tx.status === 'completed';
    const isBatal = tx.status === 'batal' || tx.status === 'cancelled';
    const isAccepted = tx.status === 'accepted' || (isKos && tx.status === 'approved');
    const isPending = tx.status === 'pending';
    let statusLabel = isKos ? 'Sedang Ngekost' : 'Sedang Disewa';
    if (isSelesai) statusLabel = 'Selesai';
    else if (isBatal) statusLabel = 'Dibatalkan';
    else if (isAccepted) statusLabel = isKos ? 'Pengajuan Disetujui Pemilik' : 'Pesanan Diterima (Menunggu COD)';
    else if (isPending) statusLabel = isKos ? 'Menunggu Persetujuan Pemilik Kos' : 'Menunggu Konfirmasi Penjual';

    const fotoUrl = (typeof KM !== 'undefined' && KM.getFoto ? KM.getFoto(product?.foto || tx.foto) : (product?.foto || tx.foto)) || (isKos ? '/img/kos-damar-asri.png' : '/img/kalkulator-casio.png');
    const namaBarang = product?.nama_barang || tx.nama_barang || (isKos ? 'Sewa Kos' : 'Kalkulator Casio fx-991ID Plus');
    const hargaFormat = isKos ? `Rp${Number(tx.harga_sewa || tx.total_harga || 800000).toLocaleString('id-ID')}/bulan` : (tx.harga_sewa ? `Rp${Number(tx.harga_sewa).toLocaleString('id-ID')}/hari` : 'Rp5.000/hari');
    const totalHargaFmt = tx.total_harga ? `Rp${Number(tx.total_harga).toLocaleString('id-ID')}` : 'Rp15.000';
    const lokasiText = tx.lokasi || (product?.lokasi ? `350 m · ${product.lokasi}` : (isKos ? 'Area Kampus ITG' : '350 m · Fakultas Teknik'));
    const txIdText = String(tx.id_transaksi).startsWith('KC-') || String(tx.id_transaksi).startsWith('KST-') ? tx.id_transaksi : `KC-${tx.id_transaksi}`;
    const tglTx = tx.tanggal_transaksi || '26 Okt 2026 · 16.05';
    const periode = tx.periode_sewa || (isKos ? '1 Nov 2026 – 31 Jan 2027' : '27–30 Okt 2026');
    const batas = tx.batas_pengembalian || (isKos ? 'Akhir masa sewa' : '30 Okt · 10.00 WIB');

    const cardGroup = document.createElement('div');
    cardGroup.className = 'tx-card-group mb-6';
    cardGroup.style.display = 'flex';
    cardGroup.style.flexDirection = 'column';
    cardGroup.style.gap = '12px';
    cardGroup.style.marginBottom = '24px';

    cardGroup.innerHTML = `
      <!-- Card 1: Item Card -->
      <div class="item-card">
        <div class="item-thumb">
          <img src="${escHtml(fotoUrl)}" alt="${escHtml(namaBarang)}">
        </div>
        <div class="item-info">
          <span class="item-tag" style="${isKos ? 'background:#EDEAF7;color:#6B21A8;' : ''}">${isKos ? 'Sewa Kos' : 'Sewa'}</span>
          <div class="item-title">${escHtml(namaBarang)}</div>
          <div class="item-price">${escHtml(hargaFormat)}</div>
          <div class="item-loc">${escHtml(lokasiText)}</div>
        </div>
      </div>

      <!-- Status Badge -->
      <div class="status-badge-row">
        <span class="status-pill ${isSelesai ? 'selesai' : (isBatal ? 'batal' : 'sedang-disewa')}">
          ${escHtml(statusLabel)}
        </span>
      </div>

      <!-- Alur COD & Verifikasi Pertemuan (khusus barang) -->
      ${!isKos ? `<div class="cod-container" data-tx="${tx.id_transaksi}"></div>` : ''}

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
          <span class="detail-label">Total biaya sewa</span>
          <span class="detail-val">${escHtml(totalHargaFmt)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Metode pembayaran</span>
          <span class="detail-val" style="color:#008F83;font-weight:700">${escHtml(tx.metode_pembayaran || sessionStorage.getItem('kc_last_payment_method') || 'COD (Bayar di Tempat)')}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Serah terima</span>
          <span class="detail-val">${escHtml(tx.lokasi || sessionStorage.getItem('kc_last_location') || 'Lobi Fakultas Teknik')}</span>
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
        ${isKos ? `
          <div style="background:${tx.status === 'approved' ? '#DCFCE7' : '#FFF1DE'};color:${tx.status === 'approved' ? '#166534' : '#9A3412'};padding:10px 14px;border-radius:12px;text-align:center;font-size:12px;font-weight:700">
            ${tx.status === 'approved' ? '✓ Pengajuan Sewa Telah Disetujui Pemilik Kos' : '⏳ Pengajuan Sewa Kos Menunggu Persetujuan Pemilik'}
          </div>
        ` : (!isSelesai && !isBatal ? `
          <button class="btn-kembalikan" data-action="kembalikan">Ajukan Pengembalian</button>
        ` : `
          <button class="btn-kembalikan disabled" disabled>Transaksi Selesai</button>
        `)}
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

    const codEl = cardGroup.querySelector('.cod-container');
    if (codEl && typeof window.renderCodFlow === 'function') {
      window.renderCodFlow(codEl, tx, () => initSewa());
    }
  }
}

document.addEventListener('DOMContentLoaded', initSewa);
