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
    const me = await KM.get('/saya');
    if (me && me.transaksi && me.transaksi.length > 0) {
      if (txId) {
        activeTx = me.transaksi.find(t => String(t.id_transaksi) === String(txId) && t.jenis_transaksi === 'beli');
      }
      if (!activeTx) {
        activeTx = me.transaksi.find(t => t.jenis_transaksi === 'beli');
      }
    }
  } catch (_e) {}

  if (activeTx) {
    if (itemTitle && activeTx.nama_barang) itemTitle.textContent = activeTx.nama_barang;
    const hargaFmt = activeTx.total_harga ? `Rp${Number(activeTx.total_harga).toLocaleString('id-ID')}` : 'Rp3.200.000';
    if (itemPrice) itemPrice.textContent = hargaFmt;
    if (valHarga) valHarga.textContent = hargaFmt;
    if (valTxId) valTxId.textContent = `KC-B${activeTx.id_transaksi}`;
    if (badgeStatus) badgeStatus.textContent = activeTx.status === 'selesai' ? 'Selesai / Hak Milik' : 'Sedang Diproses';
    if (activeTx.lokasi && valLokasi) valLokasi.textContent = activeTx.lokasi;

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
