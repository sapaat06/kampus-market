// public/js/status-beli.js
// Status Transaksi Pembelian (Screen 18)

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function initBeli() {
  const backBtn = document.getElementById('backBtn');
  const beliLagiBtn = document.getElementById('beliLagiBtn');
  const itemThumb = document.getElementById('itemThumb');
  const itemTitle = document.getElementById('itemTitle');
  const itemPrice = document.getElementById('itemPrice');
  const itemLoc = document.getElementById('itemLoc');
  const badgeStatus = document.getElementById('badgeStatus');

  const valTxId = document.getElementById('valTxId');
  const valTgl = document.getElementById('valTgl');
  const valPenjual = document.getElementById('valPenjual');
  const valHarga = document.getElementById('valHarga');
  const valMetode = document.getElementById('valMetode');
  const valLokasi = document.getElementById('valLokasi');

  if (backBtn) {
    backBtn.addEventListener('click', () => {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = '/beranda.html';
      }
    });
  }

  if (beliLagiBtn) {
    beliLagiBtn.addEventListener('click', () => {
      window.location.href = '/beranda.html';
    });
  }

  const urlParams = new URLSearchParams(window.location.search);
  const txId = urlParams.get('id_transaksi');

  let activeTx = null;

  try {
    if (txId) {
      try {
        const single = await KM.get('/transaksi/' + txId);
        if (single) activeTx = single;
      } catch (_e) {}
    }

    if (!activeTx) {
      const me = await KM.get('/saya');
      const allTx = [
        ...((me && Array.isArray(me.transaksi)) ? me.transaksi : []),
        ...((me && Array.isArray(me.transaksi_penjualan)) ? me.transaksi_penjualan : [])
      ];
      if (allTx.length > 0) {
        if (txId) {
          activeTx = allTx.find(t => String(t.id_transaksi) === String(txId) && t.jenis_transaksi === 'beli');
        }
        if (!activeTx) {
          activeTx = allTx.find(t => t.jenis_transaksi === 'beli');
        }
      }
    }
  } catch (_e) {
    KM.ui.error('Gagal Memuat Transaksi', 'Data transaksi pembelian tidak bisa diambil. Periksa koneksi kamu atau masuk kembali.');
  }

  if (activeTx) {
    if (itemTitle && activeTx.nama_barang) itemTitle.textContent = activeTx.nama_barang;
    const hargaFmt = activeTx.total_harga ? `Rp${Number(activeTx.total_harga).toLocaleString('id-ID')}` : 'Rp3.200.000';
    if (itemPrice) itemPrice.textContent = hargaFmt;
    if (valHarga) valHarga.textContent = hargaFmt;
    if (valTxId) valTxId.textContent = `KC-B${activeTx.id_transaksi}`;

    // Pemetaan status transaksi yang akurat
    const st = activeTx.status || 'pending';
    let statusText = 'Sedang Diproses';
    if (st === 'completed' || st === 'selesai') statusText = 'Selesai / Hak Milik';
    else if (st === 'accepted') statusText = 'Pesanan Diterima (Siap Bertemu)';
    else if (st === 'pending') statusText = 'Menunggu Konfirmasi Penjual';
    else if (st === 'cancelled' || st === 'batal') statusText = 'Dibatalkan';
    if (badgeStatus) badgeStatus.textContent = statusText;

    if (activeTx.lokasi && valLokasi) valLokasi.textContent = activeTx.lokasi;
    const lastMetode = sessionStorage.getItem('kc_last_payment_method');
    if (valMetode) valMetode.textContent = activeTx.metode_pembayaran || lastMetode || 'COD (Bayar di Tempat)';

    // Render komponen alur COD & Kode Verifikasi Pertemuan
    const codContainer = document.getElementById('codSection');
    if (codContainer && typeof window.renderCodFlow === 'function') {
      window.renderCodFlow(codContainer, activeTx, () => initBeli());
    }

    if (activeTx.id_barang) {
      try {
        const b = await KM.get('/barang/' + activeTx.id_barang);
        if (b && b.foto && itemThumb) {
          const fotos = typeof KM !== 'undefined' && KM.getFotos ? KM.getFotos(b.foto) : [b.foto];
          if (fotos[0]) {
            itemThumb.innerHTML = `<img src="${escHtml(fotos[0])}" alt="${escHtml(b.nama_barang || '')}">`;
          }
        }
        if (b && b.nama_penjual && valPenjual) {
          valPenjual.textContent = `${b.nama_penjual} · USR-008`;
        }
      } catch (_err) {}
    }
  }
}

document.addEventListener('DOMContentLoaded', initBeli);
