// public/js/status-pinjam.js
// Handles tracking borrow lifecycle stepper, syncing with actual transactions, and status updates

document.addEventListener('DOMContentLoaded', async () => {
  const backBtn = document.getElementById('backBtn');
  const returnBtn = document.getElementById('returnBtn');
  const dot4 = document.getElementById('dot4');
  const line4 = document.getElementById('line4');
  const dot5 = document.getElementById('dot5');
  const title5 = document.getElementById('title5');
  const date5 = document.getElementById('date5');
  const rewardModal = document.getElementById('rewardModal');
  const modalProfileBtn = document.getElementById('modalProfileBtn');
  const modalHomeBtn = document.getElementById('modalHomeBtn');

  const itemTitle = document.getElementById('itemTitle');
  const itemSub = document.getElementById('itemSub');

  const urlParams = new URLSearchParams(window.location.search);
  const txId = urlParams.get('id_transaksi');

  // Load real transaction details if logged in
  try {
    const res = await fetch('/api/saya');
    if (res.ok) {
      const me = await res.json();
      if (me.transaksi && me.transaksi.length > 0) {
        let tx = null;
        if (txId) {
          tx = me.transaksi.find(t => String(t.id_transaksi) === String(txId));
        }
        if (!tx) {
          tx = me.transaksi[0]; // Ambil transaksi terbaru
        }

        if (tx) {
          if (itemTitle && tx.nama_barang) itemTitle.textContent = tx.nama_barang;
          if (itemSub) itemSub.textContent = `Transaksi #${tx.id_transaksi} · ${tx.jenis_transaksi.toUpperCase()} (Rp${Number(tx.total_harga).toLocaleString('id-ID')})`;

          // Jika transaksi sudah berstatus selesai di database
          if (tx.status === 'selesai') {
            if (dot4) {
              dot4.className = 'step-dot done';
              dot4.innerHTML = '<svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg>';
            }
            if (dot5) {
              dot5.className = 'step-dot done';
              dot5.innerHTML = '<svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg>';
            }
            if (title5) title5.textContent = 'Sudah dikembalikan & Selesai';
            if (date5) date5.textContent = 'Transaksi Selesai · Green Points Diberikan';
            if (returnBtn) {
              returnBtn.textContent = '✓ Transaksi Selesai';
              returnBtn.classList.add('completed');
              returnBtn.disabled = true;
            }
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

  // Handle return action (Konfirmasi pengembalian oleh mahasiswa)
  if (returnBtn && !returnBtn.disabled) {
    returnBtn.addEventListener('click', () => {
      // Step 4 becomes completed
      if (dot4) {
        dot4.className = 'step-dot done';
        dot4.innerHTML = '<svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg>';
      }
      if (line4) {
        line4.className = 'step-line';
      }

      // Step 5 becomes completed
      if (dot5) {
        dot5.className = 'step-dot done';
        dot5.innerHTML = '<svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg>';
      }
      if (title5) {
        title5.className = 'step-title';
        title5.textContent = 'Menunggu verifikasi admin';
      }
      if (date5) {
        date5.className = 'step-date active-text';
        date5.textContent = 'Barang telah dikembalikan';
      }

      returnBtn.textContent = '✓ Pengembalian Diajukan';
      returnBtn.classList.add('completed');
      returnBtn.disabled = true;

      // Open celebration modal
      if (rewardModal) {
        setTimeout(() => {
          rewardModal.style.display = 'flex';
        }, 350);
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
});
