// public/js/status-pinjam.js
// Handles tracking borrow lifecycle stepper, syncing with actual transactions, and awarding Green Points

async function initPinjam() {
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

  const itemIcon = document.getElementById('itemIcon');
  const itemTitle = document.getElementById('itemTitle');
  const itemSub = document.getElementById('itemSub');
  const date1 = document.getElementById('date1');
  const date2 = document.getElementById('date2');
  const date3 = document.getElementById('date3');
  const badgeTempo = document.getElementById('badgeTempo');

  function escHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function formatTgl(strDate, withTime = false) {
    if (!strDate) return '';
    const d = new Date(strDate);
    if (Number.isNaN(d.getTime())) return strDate;
    const opt = { day: 'numeric', month: 'short' };
    let res = d.toLocaleDateString('id-ID', opt);
    if (withTime) {
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      res += ` · ${hh}.${mm}`;
    }
    return res;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const txId = urlParams.get('id_transaksi');

  let activeTx = null;

  // Load real transaction details if logged in
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
        const found = allTx.find(t => String(t.id_transaksi) === String(txId));
        if (found) {
          activeTx = found;
        } else {
          activeTx = allTx.find(t => t.jenis_transaksi === 'pinjam');
        }
      }
    }

      if (activeTx) {
        if (itemTitle && activeTx.nama_barang) itemTitle.textContent = activeTx.nama_barang;
        if (itemSub) {
          const biayaFmt = activeTx.total_harga > 0 ? `Biaya: Rp${Number(activeTx.total_harga).toLocaleString('id-ID')}` : 'Gratis';
          itemSub.textContent = `Transaksi #${activeTx.id_transaksi} · ${biayaFmt}`;
        }
        if (activeTx.tanggal_transaksi) {
          if (date1) date1.textContent = formatTgl(activeTx.tanggal_transaksi, true);
          if (date2) date2.textContent = formatTgl(activeTx.tanggal_transaksi, true);
        }
        if (activeTx.tanggal_mulai && date3) {
          date3.textContent = formatTgl(activeTx.tanggal_mulai);
        }
        if (activeTx.tanggal_selesai && date4) {
          date4.textContent = `Hingga ${formatTgl(activeTx.tanggal_selesai)}`;
        }
        if (badgeTempo && activeTx.durasi_sewa) {
          badgeTempo.textContent = `Durasi ${activeTx.durasi_sewa} hari`;
        }

        // Render alur COD dan kode verifikasi pertemuan
        const codContainer = document.getElementById('codSection');
        if (codContainer && typeof window.renderCodFlow === 'function') {
          window.renderCodFlow(codContainer, activeTx, () => initPinjam());
        }

        // Cek foto barang
        if (activeTx.id_barang) {
          try {
            const b = await KM.get('/barang/' + activeTx.id_barang);
            const fotos = typeof KM !== 'undefined' && KM.getFotos ? KM.getFotos(b?.foto) : (b?.foto ? [b.foto] : []);
            if (fotos.length > 0) {
              if (itemIcon) {
                itemIcon.innerHTML = `<img src="${escHtml(fotos[0])}" alt="${escHtml(b.nama_barang || '')}" style="width:100%;height:100%;object-fit:cover;border-radius:12px">`;
              }
              const galleryCard = document.getElementById('galleryCard');
              const galleryCount = document.getElementById('galleryCount');
              const galleryList = document.getElementById('galleryList');
              if (galleryCard && galleryList) {
                if (galleryCount) galleryCount.textContent = `${fotos.length} Foto`;
                galleryList.innerHTML = fotos.map((f, idx) => `
                  <div style="width:80px;height:80px;border-radius:14px;overflow:hidden;border:1.5px solid var(--border-light);flex-shrink:0;box-shadow:0 1px 4px rgba(0,0,0,0.06)">
                    <img src="${escHtml(f)}" alt="Foto ${idx + 1}" style="width:100%;height:100%;object-fit:cover">
                  </div>`).join('');
                galleryCard.style.display = 'flex';
              }
            }
          } catch (_err) {}
        }

        // Jika transaksi sudah berstatus selesai di database
        if (activeTx.status === 'selesai') {
          if (dot4) {
            dot4.className = 'step-dot done';
            dot4.innerHTML = '<svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg>';
          }
          if (line4) line4.className = 'step-line';
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
  } catch (_e) {
    KM.ui.error('Gagal Memuat Transaksi', 'Data transaksi pinjam tidak bisa diambil. Periksa koneksi kamu.');
  }

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
  let ptsEarned = 20;
  if (returnBtn) {
    returnBtn.addEventListener('click', async () => {
      returnBtn.disabled = true;
      returnBtn.textContent = 'Memproses...';

      // Panggil backend agar status transaksi menjadi 'selesai' dan green_points bertambah di database!
      if (activeTx && activeTx.id_transaksi) {
        const yakin = await KM.ui.konfirmasi({
          judul: 'Konfirmasi pengembalian?',
          teks: 'Pastikan barang sudah kamu kembalikan ke pemilik. Transaksi akan ditandai selesai.',
          teksYa: 'Ya, Selesai',
          teksBatal: 'Batal',
        });
        if (!yakin) {
          returnBtn.disabled = false;
          returnBtn.textContent = '✓ Konfirmasi Pengembalian';
          return;
        }
        KM.ui.loading('Menyelesaikan transaksi...');
        try {
          const resp = await KM.patch('/transaksi/' + activeTx.id_transaksi + '/selesai');
          if (resp && resp.poin_didapat) ptsEarned = resp.poin_didapat;
          KM.ui.tutup();
          KM.ui.toast('Pengembalian barang berhasil');
        } catch (err) {
          KM.ui.tutup();
          returnBtn.disabled = false;
          returnBtn.textContent = '✓ Konfirmasi Pengembalian';
          KM.ui.error('Gagal Menyelesaikan Transaksi', err.message || 'Transaksi tidak dapat diselesaikan. Periksa koneksi kamu.');
          return;
        }
      }

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
        title5.textContent = 'Barang telah dikembalikan & Selesai';
      }
      if (date5) {
        date5.className = 'step-date active-text';
        date5.textContent = 'Hari ini · Selesai';
      }

      returnBtn.textContent = '✓ Pengembalian Selesai';
      returnBtn.classList.add('completed');

      // Open celebration modal
      if (rewardModal) {
        setTimeout(() => {
          const mp = rewardModal.querySelector('.modal-points');
          if (mp) mp.textContent = `+${ptsEarned} Green Points`;
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
  document.addEventListener('DOMContentLoaded', initPinjam);
} else {
  initPinjam();
}
