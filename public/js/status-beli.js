// public/js/status-beli.js
// Handles tracking purchase (beli) lifecycle stepper: 3 steps only (NO return step), awarding Green Points upon receipt

async function initBeli() {
  const backBtn = document.getElementById('backBtn');
  const confirmReceivedBtn = document.getElementById('confirmReceivedBtn');
  const dot3 = document.getElementById('dot3');
  const line2 = document.getElementById('line2');
  const title3 = document.getElementById('title3');
  const date3 = document.getElementById('date3');
  const rewardModal = document.getElementById('rewardModal');
  const modalProfileBtn = document.getElementById('modalProfileBtn');
  const modalHomeBtn = document.getElementById('modalHomeBtn');
  const modalPtsText = document.getElementById('modalPtsText');

  const itemIcon = document.getElementById('itemIcon');
  const itemTitle = document.getElementById('itemTitle');
  const itemSub = document.getElementById('itemSub');
  const badgeStatus = document.getElementById('badgeStatus');

  const urlParams = new URLSearchParams(window.location.search);
  const txId = urlParams.get('id_transaksi');

  let activeTx = null;

  // Load real transaction details if logged in
  try {
    const me = await KM.get('/saya');
    if (me.transaksi && me.transaksi.length > 0) {
      const found = me.transaksi.find(t => String(t.id_transaksi) === String(txId));
      if (found) {
        if (found.jenis_transaksi !== 'beli') throw Object.assign(new Error('Bukan transaksi beli'), { status: 404 });
        activeTx = found;
      } else {
        activeTx = me.transaksi.find(t => t.jenis_transaksi === 'beli');
      }

      if (activeTx) {
        if (itemTitle && activeTx.nama_barang) itemTitle.textContent = activeTx.nama_barang;
        if (itemSub) {
          const hargaFmt = activeTx.total_harga ? `Rp${Number(activeTx.total_harga).toLocaleString('id-ID')}` : 'Beli';
          itemSub.textContent = `Transaksi #${activeTx.id_transaksi} · ${hargaFmt}`;
        }
        if (badgeStatus) {
          badgeStatus.textContent = activeTx.status === 'selesai' ? 'Selesai' : 'Sedang Diproses';
        }

        // Cek foto barang jika ada
        if (activeTx.id_barang) {
          try {
            const b = await KM.get('/barang/' + activeTx.id_barang);
            const fotos = typeof KM !== 'undefined' && KM.getFotos ? KM.getFotos(b?.foto) : (b?.foto ? [b.foto] : []);
            if (fotos.length > 0) {
              if (itemIcon) {
                itemIcon.innerHTML = `<img src="${fotos[0]}" alt="${b.nama_barang || ''}" style="width:100%;height:100%;object-fit:cover;border-radius:14px;">`;
              }
              const galleryCard = document.getElementById('galleryCard');
              const galleryCount = document.getElementById('galleryCount');
              const galleryList = document.getElementById('galleryList');
              if (galleryCard && galleryList) {
                if (galleryCount) galleryCount.textContent = `${fotos.length} Foto`;
                galleryList.innerHTML = fotos.map((f, idx) => `
                  <div style="width:80px;height:80px;border-radius:14px;overflow:hidden;border:1.5px solid var(--border-light);flex-shrink:0;box-shadow:0 1px 4px rgba(0,0,0,0.06)">
                    <img src="${f}" alt="Foto ${idx + 1}" style="width:100%;height:100%;object-fit:cover">
                  </div>`).join('');
                galleryCard.style.display = 'flex';
              }
            }
          } catch (_err) {}
        }

        // Jika transaksi sudah selesai
        if (activeTx.status === 'selesai') {
          if (dot3) {
            dot3.className = 'step-dot done';
            dot3.innerHTML = '<svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg>';
          }
          if (title3) {
            title3.textContent = 'Barang Diterima · Hak Milik Anda';
          }
          if (date3) {
            date3.className = 'step-date';
            date3.textContent = 'Selesai · Green Points telah ditambahkan';
          }
          if (confirmReceivedBtn) {
            confirmReceivedBtn.textContent = '✓ Transaksi Selesai';
            confirmReceivedBtn.classList.add('completed');
            confirmReceivedBtn.disabled = true;
          }
        }
      }
    }
  } catch (_e) {}

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

  // Handle confirm received action
  if (confirmReceivedBtn) {
    confirmReceivedBtn.addEventListener('click', async () => {
      confirmReceivedBtn.disabled = true;
      confirmReceivedBtn.textContent = 'Memproses...';

      let ptsEarned = 15;

      if (activeTx && activeTx.id_transaksi) {
        try {
          const resp = await KM.patch('/transaksi/' + activeTx.id_transaksi + '/selesai');
          if (resp && resp.poin_didapat) {
            ptsEarned = resp.poin_didapat;
          }
        } catch (err) {
          console.warn('Gagal memproses penyelesaian transaksi di server:', err);
        }
      }

      // Step 3 becomes completed
      if (dot3) {
        dot3.className = 'step-dot done';
        dot3.innerHTML = '<svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg>';
      }
      if (title3) {
        title3.textContent = 'Barang Berhasil Diterima';
      }
      if (date3) {
        date3.className = 'step-date active-text';
        date3.textContent = 'Hari ini · Hak milik telah berpindah';
      }

      confirmReceivedBtn.textContent = '✓ Selesai';
      confirmReceivedBtn.classList.add('completed');

      if (modalPtsText) {
        modalPtsText.textContent = `+${ptsEarned} Poin`;
      }

      // Open celebration modal
      if (rewardModal) {
        setTimeout(() => {
          rewardModal.style.display = 'flex';
        }, 300);
      }
    });
  }

  if (modalProfileBtn) {
    modalProfileBtn.addEventListener('click', () => {
      window.location.href = '/profil.html';
    });
  }

  if (modalHomeBtn) {
    modalHomeBtn.addEventListener('click', () => {
      window.location.href = '/beranda.html';
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initBeli);
} else {
  initBeli();
}
