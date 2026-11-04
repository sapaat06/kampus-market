// public/js/cod.js
// Sistem Pembayaran COD (Cash on Delivery) dengan Kode Verifikasi Pertemuan
// Mendukung siklus status: pending -> accepted -> completed / cancelled

(() => {
  function esc(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Buat modal pembatalan sekali saja di body jika belum ada
  function ensureCancelModal() {
    let modal = document.getElementById('codCancelModal');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'codCancelModal';
    modal.style.cssText = `
      display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px); z-index: 99999; align-items: center; justify-content: center;
      padding: 16px; font-family: inherit;
    `;

    modal.innerHTML = `
      <div style="background: #FFFFFF; border-radius: 20px; max-width: 400px; width: 100%; padding: 22px; box-shadow: 0 20px 40px rgba(0,0,0,0.2); animation: popIn 0.2s ease;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
          <div style="width:36px;height:36px;border-radius:10px;background:#FEE2E2;color:#EF4444;display:flex;align-items:center;justify-content:center;font-size:18px;">⚠️</div>
          <div>
            <div style="font-size:16px;font-weight:700;color:#0F172A;" id="codCancelTitle">Batalkan Transaksi</div>
            <div style="font-size:12px;color:#64748B;">Pesanan akan dibatalkan dan barang kembali tersedia.</div>
          </div>
        </div>
        
        <div style="margin: 14px 0;">
          <label style="display:block;font-size:12px;font-weight:600;color:#334155;margin-bottom:6px;">Pilih Alasan Pembatalan:</label>
          <select id="codCancelReasonSelect" style="width:100%;height:42px;border-radius:10px;border:1.5px solid #CBD5E1;padding:0 12px;font-size:13px;background:#F8FAFC;outline:none;">
            <option value="Perubahan jadwal / tidak bisa bertemu">Perubahan jadwal / tidak bisa bertemu</option>
            <option value="Barang tidak sesuai kesepakatan">Barang tidak sesuai kesepakatan</option>
            <option value="Pihak lain tidak dapat dihubungi">Pihak lain tidak dapat dihubungi</option>
            <option value="Sudah transaksi barang lain">Sudah transaksi barang lain</option>
            <option value="__other__">Alasan lainnya...</option>
          </select>
          <textarea id="codCancelReasonCustom" placeholder="Tulis alasan pembatalan..." style="display:none;width:100%;height:70px;border-radius:10px;border:1.5px solid #CBD5E1;padding:8px 12px;font-size:12px;margin-top:8px;box-sizing:border-box;resize:none;outline:none;font-family:inherit;"></textarea>
          <div id="codCancelModalError" style="display:none;color:#DC2626;font-size:12px;font-weight:600;margin-top:6px;"></div>
        </div>

        <div style="display:flex;gap:10px;margin-top:18px;">
          <button id="codCancelCloseBtn" style="flex:1;height:42px;background:#F1F5F9;border:none;border-radius:10px;color:#475569;font-weight:600;font-size:13px;cursor:pointer;">Tutup</button>
          <button id="codCancelSubmitBtn" style="flex:1;height:42px;background:#DC2626;border:none;border-radius:10px;color:#FFFFFF;font-weight:700;font-size:13px;cursor:pointer;">Ya, Batalkan</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const sel = modal.querySelector('#codCancelReasonSelect');
    const customTxt = modal.querySelector('#codCancelReasonCustom');
    sel.addEventListener('change', () => {
      customTxt.style.display = sel.value === '__other__' ? 'block' : 'none';
      if (sel.value === '__other__') customTxt.focus();
    });

    modal.querySelector('#codCancelCloseBtn').addEventListener('click', () => {
      modal.style.display = 'none';
    });

    return modal;
  }

  function openCancelModal({ title, onSubmit }) {
    const modal = ensureCancelModal();
    const titleEl = modal.querySelector('#codCancelTitle');
    const sel = modal.querySelector('#codCancelReasonSelect');
    const customTxt = modal.querySelector('#codCancelReasonCustom');
    const errEl = modal.querySelector('#codCancelModalError');
    const submitBtn = modal.querySelector('#codCancelSubmitBtn');

    if (title && titleEl) titleEl.textContent = title;
    sel.selectedIndex = 0;
    customTxt.style.display = 'none';
    customTxt.value = '';
    errEl.style.display = 'none';
    errEl.textContent = '';
    submitBtn.disabled = false;
    submitBtn.textContent = 'Ya, Batalkan';

    modal.style.display = 'flex';

    // Handler konfirmasi
    submitBtn.onclick = async () => {
      let reason = sel.value;
      if (reason === '__other__') {
        reason = customTxt.value.trim();
        if (!reason) {
          errEl.textContent = 'Harap tuliskan alasan pembatalan.';
          errEl.style.display = 'block';
          return;
        }
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Memproses...';
      try {
        await onSubmit(reason);
        modal.style.display = 'none';
      } catch (err) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Ya, Batalkan';
        errEl.textContent = err.message || 'Gagal membatalkan transaksi';
        errEl.style.display = 'block';
        KM.ui.error('Gagal Membatalkan', err.message || 'Transaksi tidak dapat dibatalkan saat ini.');
      }
    };
  }

  // Render komponen COD
  function renderCodFlow(container, tx, onStatusChange) {
    if (!container || !tx) return;

    const isCod = /cod|cash|bayar\s*di\s*tempat|tunai/i.test(tx.metode_pembayaran || '') || Boolean(tx.cod_pin);
    const status = String(tx.status || 'pending').toLowerCase();
    const isCompleted = status === 'completed' || status === 'selesai';
    const isCancelled = status === 'cancelled' || status === 'batal';
    const isAccepted = status === 'accepted';
    const isPending = status === 'pending';
    const isBerjalan = status === 'berjalan' || status === 'sedang disewa' || status === 'dipinjam' || status === 'menunggu pertemuan';
    const isOngoing = isPending || isAccepted || isBerjalan;

    // Kotak 'Kode Verifikasi Pertemuan' HANYA TAMPIL untuk pesanan yang statusnya sedang berjalan,
    // dan disembunyikan jika statusnya sudah 'Selesai' atau dibatalkan.
    if (isCompleted || isCancelled || !isOngoing || !isCod) {
      container.innerHTML = '';
      container.style.display = 'none';
      return;
    }

    container.style.display = 'block';

    // Cek apakah pembeli atau penjual
    const isBuyer = Boolean(tx.is_pembeli);
    const isSeller = Boolean(tx.is_penjual);

    // Buat HTML sesuai kondisi
    let html = '';

    if (isSeller) {
      // 1. Tampilan Penjual
      if (isPending) {
        // Penjual: Menunggu Konfirmasi (Terima / Tolak)
        html = `
          <div style="background:#FFFBEB;border:1.5px solid #FCD34D;border-radius:16px;padding:18px 16px;margin:14px 0;box-shadow:0 2px 8px rgba(245,158,11,0.08);">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
              <div style="width:34px;height:34px;border-radius:10px;background:#FEF3C7;color:#D97706;display:flex;align-items:center;justify-content:center;font-size:17px;">📦</div>
              <div>
                <div style="font-size:13px;font-weight:700;color:#92400E;">Pesanan Baru (Menunggu Konfirmasi)</div>
                <div style="font-size:11px;color:#B45309;">Metode pembayaran: COD (Bayar di Tempat)</div>
              </div>
            </div>
            <div style="font-size:12px;color:#78350F;line-height:1.4;margin-bottom:14px;">
              Pembeli telah mengajukan pesanan COD. Silakan konfirmasi ketersediaan barang untuk menjadwalkan pertemuan.
            </div>
            <div style="display:flex;gap:10px;">
              <button id="btnTerimaPesanan" style="flex:1;height:42px;background:#008F83;border:none;border-radius:10px;color:#FFFFFF;font-weight:700;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;">
                <span>✓</span> Terima Pesanan
              </button>
              <button id="btnTolakPesanan" style="flex:1;height:42px;background:#FFFFFF;border:1.5px solid #EF4444;border-radius:10px;color:#EF4444;font-weight:700;font-size:13px;cursor:pointer;">
                Tolak Pesanan
              </button>
            </div>
          </div>
        `;
      } else {
        // Penjual: Pesanan Accepted / Berjalan, Tunggu Pertemuan & Masukkan PIN 4 Kotak
        html = `
          <div style="background:#F0FDFA;border:1.5px solid #5EEAD4;border-radius:16px;padding:20px 16px;margin:14px 0;box-shadow:0 2px 10px rgba(0,143,131,0.08);">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
              <div style="width:36px;height:36px;border-radius:10px;background:#CCFBF1;color:#0F766E;display:flex;align-items:center;justify-content:center;font-size:18px;">🤝</div>
              <div>
                <div style="font-size:14px;font-weight:700;color:#0F766E;">Verifikasi Kode Pertemuan (COD)</div>
                <div style="font-size:11px;color:#115E59;font-weight:600;">Status: Menunggu Pertemuan / COD</div>
              </div>
            </div>

            <div style="background:#FFFFFF;border:1px solid #CCFBF1;border-radius:14px;padding:16px 14px;margin-bottom:14px;text-align:center;">
              <div style="font-size:12px;font-weight:700;color:#0F172A;margin-bottom:4px;">Minta 4 Digit PIN dari Pembeli</div>
              <div style="font-size:11px;color:#64748B;line-height:1.4;margin-bottom:12px;">
                Saat bertemu, setelah barang diserahkan dan uang diterima, mintalah 4 digit kode unik yang tertera di aplikasi pembeli.
              </div>

              <!-- 4 Input Kotak PIN -->
              <div style="display:flex;justify-content:center;gap:8px;margin-bottom:8px;" id="codPinInputs">
                <input type="tel" maxlength="1" class="pin-box" data-idx="0" style="width:48px;height:54px;text-align:center;font-size:24px;font-weight:800;border:2px solid #CBD5E1;border-radius:12px;background:#F8FAFC;outline:none;color:#0F172A;">
                <input type="tel" maxlength="1" class="pin-box" data-idx="1" style="width:48px;height:54px;text-align:center;font-size:24px;font-weight:800;border:2px solid #CBD5E1;border-radius:12px;background:#F8FAFC;outline:none;color:#0F172A;">
                <input type="tel" maxlength="1" class="pin-box" data-idx="2" style="width:48px;height:54px;text-align:center;font-size:24px;font-weight:800;border:2px solid #CBD5E1;border-radius:12px;background:#F8FAFC;outline:none;color:#0F172A;">
                <input type="tel" maxlength="1" class="pin-box" data-idx="3" style="width:48px;height:54px;text-align:center;font-size:24px;font-weight:800;border:2px solid #CBD5E1;border-radius:12px;background:#F8FAFC;outline:none;color:#0F172A;">
              </div>
              <div id="codPinError" style="display:none;color:#DC2626;font-size:12px;font-weight:600;margin-top:6px;line-height:1.4;"></div>
            </div>

            <button id="btnSelesaikanTransaksi" style="width:100%;height:44px;background:#008F83;border:none;border-radius:10px;color:#FFFFFF;font-weight:700;font-size:13px;cursor:pointer;margin-bottom:8px;display:flex;align-items:center;justify-content:center;gap:6px;">
              <span>✓</span> Selesaikan Transaksi
            </button>
            <button id="btnBatalkanTransaksiPenjual" style="width:100%;height:38px;background:transparent;border:1.5px solid #EF4444;border-radius:10px;color:#EF4444;font-weight:600;font-size:12px;cursor:pointer;">
              Batalkan Transaksi
            </button>
          </div>
        `;
      }
    } else {
      // 2. Tampilan Pembeli (Buyer): Ambil PIN COD dari database
      const rawPin = tx.cod_pin ? String(tx.cod_pin).trim() : '';
      const hasValidPin = /^\d{4}$/.test(rawPin);
      const pinDigits = hasValidPin ? rawPin.split('') : ['', '', '', ''];

      let statusDesc = '';
      let statusBadge = '';
      if (isPending) {
        statusBadge = '<span style="background:#FEF3C7;color:#92400E;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;">Menunggu Konfirmasi Penjual</span>';
        statusDesc = 'Penjual sedang memeriksa ketersediaan barang. Anda dapat membatalkan pesanan jika berubah pikiran.';
      } else if (isAccepted) {
        statusBadge = '<span style="background:#CCFBF1;color:#0F766E;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;">Pesanan Diterima · Siap Bertemu</span>';
        statusDesc = 'Penjual telah menerima pesanan! Silakan bertemu di lokasi kesepakatan untuk serah terima barang.';
      } else {
        statusBadge = '<span style="background:#DCFCE7;color:#166534;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;">Sedang Berjalan · COD</span>';
        statusDesc = 'Pesanan aktif. Berikan 4 digit PIN verifikasi ini kepada penjual saat serah terima barang dan membayar.';
      }

      html = `
        <div style="background:#F0FDF4;border:1.5px solid #86EFAC;border-radius:16px;padding:20px 16px;margin:14px 0;box-shadow:0 2px 10px rgba(16,185,129,0.08);">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
            <div style="display:flex;align-items:center;gap:8px;">
              <div style="width:34px;height:34px;border-radius:10px;background:#DCFCE7;color:#16A34A;display:flex;align-items:center;justify-content:center;font-size:17px;">🔒</div>
              <div style="font-size:13px;font-weight:700;color:#0F172A;">Kode Verifikasi Pertemuan</div>
            </div>
            ${statusBadge}
          </div>

          <div style="font-size:12px;color:#334155;line-height:1.4;margin-bottom:14px;">
            ${statusDesc}
          </div>

          <div style="background:#FFFFFF;border:1.5px dashed #86EFAC;border-radius:14px;padding:16px 14px;margin-bottom:14px;text-align:center;">
            <div style="font-size:11px;color:#64748B;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:10px;">PIN Verifikasi COD Kamu</div>
            
            <!-- 4 Elemen Kotak PIN (Masing-masing angka dipisah ke dalam satu kotak) -->
            <div style="display:flex;justify-content:center;gap:10px;margin-bottom:12px;" id="buyerPinDisplay">
              <span class="cod-pin-digit" style="display:inline-flex;width:46px;height:54px;background:#F8FAFC;border:2px solid #008F83;border-radius:12px;align-items:center;justify-content:center;font-size:26px;font-weight:800;color:#008F83;box-shadow:0 2px 5px rgba(0,0,0,0.05);">${hasValidPin ? pinDigits[0] : '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#CBD5E1;"></span>'}</span>
              <span class="cod-pin-digit" style="display:inline-flex;width:46px;height:54px;background:#F8FAFC;border:2px solid #008F83;border-radius:12px;align-items:center;justify-content:center;font-size:26px;font-weight:800;color:#008F83;box-shadow:0 2px 5px rgba(0,0,0,0.05);">${hasValidPin ? pinDigits[1] : '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#CBD5E1;"></span>'}</span>
              <span class="cod-pin-digit" style="display:inline-flex;width:46px;height:54px;background:#F8FAFC;border:2px solid #008F83;border-radius:12px;align-items:center;justify-content:center;font-size:26px;font-weight:800;color:#008F83;box-shadow:0 2px 5px rgba(0,0,0,0.05);">${hasValidPin ? pinDigits[2] : '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#CBD5E1;"></span>'}</span>
              <span class="cod-pin-digit" style="display:inline-flex;width:46px;height:54px;background:#F8FAFC;border:2px solid #008F83;border-radius:12px;align-items:center;justify-content:center;font-size:26px;font-weight:800;color:#008F83;box-shadow:0 2px 5px rgba(0,0,0,0.05);">${hasValidPin ? pinDigits[3] : '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#CBD5E1;"></span>'}</span>
            </div>

            <div style="font-size:12px;color:#15803D;font-weight:600;line-height:1.4;">
              ⚠️ Berikan kode ini kepada penjual saat Anda sudah menerima barang dan membayar.
            </div>
          </div>

          ${(isPending || isAccepted) ? `
            <button id="btnBatalkanTransaksiPembeli" style="width:100%;height:38px;background:transparent;border:1.5px solid #EF4444;border-radius:10px;color:#EF4444;font-weight:600;font-size:12px;cursor:pointer;">
              Batalkan Pesanan
            </button>
          ` : ''}
        </div>
      `;
    }

    container.innerHTML = html;

    // Pasang Event Listeners

    // 1. Tombol Terima Pesanan (Penjual)
    const btnTerima = container.querySelector('#btnTerimaPesanan');
    if (btnTerima) {
      btnTerima.addEventListener('click', async () => {
        const yakin = await KM.ui.konfirmasi({
          judul: 'Terima pesanan COD?',
          teks: 'Pembeli akan diberi tahu untuk bertemu dan menyelesaikan pembayaran di tempat.',
          teksYa: 'Ya, Terima',
          teksBatal: 'Batal',
        });
        if (!yakin) return;
        btnTerima.disabled = true;
        btnTerima.textContent = 'Menerima...';
        KM.ui.loading('Menerima pesanan...');
        try {
          await KM.patch(`/transaksi/${tx.id_transaksi}/terima`);
          KM.ui.tutup();
          await KM.ui.sukses('Pesanan Diterima', 'Silakan koordinasikan waktu & lokasi pertemuan COD dengan pembeli.');
          if (typeof onStatusChange === 'function') onStatusChange();
        } catch (err) {
          KM.ui.tutup();
          btnTerima.disabled = false;
          btnTerima.textContent = 'Terima Pesanan';
          KM.ui.error('Gagal Menerima Pesanan', err.message || 'Periksa koneksi kamu lalu coba lagi.');
        }
      });
    }

    // 2. Tombol Tolak Pesanan (Penjual)
    const btnTolak = container.querySelector('#btnTolakPesanan');
    if (btnTolak) {
      btnTolak.addEventListener('click', () => {
        openCancelModal({
          title: 'Tolak Pesanan COD',
          onSubmit: async (alasan) => {
            await KM.patch(`/transaksi/${tx.id_transaksi}/tolak`, { alasan });
            await KM.ui.sukses('Pesanan Ditolak', 'Pembeli akan menerima pemberitahuan penolakan.');
            if (typeof onStatusChange === 'function') onStatusChange();
          }
        });
      });
    }

    // 3. Tombol Batalkan Transaksi (Penjual)
    const btnBatalPenjual = container.querySelector('#btnBatalkanTransaksiPenjual');
    if (btnBatalPenjual) {
      btnBatalPenjual.addEventListener('click', () => {
        openCancelModal({
          title: 'Batalkan Transaksi COD',
          onSubmit: async (alasan) => {
            await KM.patch(`/transaksi/${tx.id_transaksi}/batal`, { alasan });
            await KM.ui.sukses('Transaksi Dibatalkan', 'Pesanan COD berhasil dibatalkan dan barang kembali tersedia.');
            if (typeof onStatusChange === 'function') onStatusChange();
          }
        });
      });
    }

    // 4. Tombol Batalkan Pesanan (Pembeli)
    const btnBatalPembeli = container.querySelector('#btnBatalkanTransaksiPembeli');
    if (btnBatalPembeli) {
      btnBatalPembeli.addEventListener('click', () => {
        openCancelModal({
          title: 'Batalkan Pesanan COD',
          onSubmit: async (alasan) => {
            await KM.patch(`/transaksi/${tx.id_transaksi}/batal`, { alasan });
            await KM.ui.sukses('Pesanan Dibatalkan', 'Pesanan kamu telah berhasil dibatalkan.');
            if (typeof onStatusChange === 'function') onStatusChange();
          }
        });
      });
    }

    // 5. Input 4 Kotak PIN (Penjual)
    const pinBoxes = container.querySelectorAll('.pin-box');
    const pinErr = container.querySelector('#codPinError');
    if (pinBoxes.length === 4) {
      pinBoxes.forEach((box, idx) => {
        box.addEventListener('input', (e) => {
          const val = e.target.value.replace(/\D/g, '');
          e.target.value = val ? val[0] : '';
          if (pinErr) pinErr.style.display = 'none';

          if (val && idx < 3) {
            pinBoxes[idx + 1].focus();
          }
        });

        box.addEventListener('keydown', (e) => {
          if (e.key === 'Backspace' && !e.target.value && idx > 0) {
            pinBoxes[idx - 1].focus();
          }
        });

        // Dukung paste 4 digit angka langsung
        box.addEventListener('paste', (e) => {
          e.preventDefault();
          const pasteData = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
          if (pasteData) {
            for (let i = 0; i < 4; i++) {
              if (pasteData[i]) {
                pinBoxes[i].value = pasteData[i];
              }
            }
            const focusTarget = Math.min(pasteData.length, 3);
            pinBoxes[focusTarget].focus();
          }
        });
      });
    }

    // 6. Tombol Selesaikan Transaksi (Penjual)
    const btnSelesai = container.querySelector('#btnSelesaikanTransaksi');
    if (btnSelesai) {
      btnSelesai.addEventListener('click', async () => {
        let enteredPin = '';
        pinBoxes.forEach((b) => { enteredPin += b.value.trim(); });

        if (enteredPin.length < 4) {
          if (pinErr) {
            pinErr.textContent = 'Harap isi lengkap 4 digit PIN verifikasi dari pembeli.';
            pinErr.style.display = 'block';
          }
          KM.ui.peringatan('PIN Belum Lengkap', 'Isi 4 digit kode verifikasi dari pembeli terlebih dahulu.');
          return;
        }

        btnSelesai.disabled = true;
        btnSelesai.textContent = 'Memverifikasi...';
        if (pinErr) pinErr.style.display = 'none';
        KM.ui.loading('Memverifikasi PIN...');

        try {
          const res = await KM.patch(`/transaksi/${tx.id_transaksi}/selesai`, { pin: enteredPin });
          KM.ui.tutup();
          await KM.ui.sukses('Transaksi Selesai', 'Kode PIN cocok. Pembayaran COD telah diverifikasi.');
          if (typeof onStatusChange === 'function') onStatusChange();
        } catch (err) {
          KM.ui.tutup();
          btnSelesai.disabled = false;
          btnSelesai.textContent = 'Selesaikan Transaksi';
          if (pinErr) {
            pinErr.textContent = err.message || 'Kode verifikasi COD (PIN) salah.';
            pinErr.style.display = 'block';
          }
          KM.ui.error('PIN Tidak Cocok', err.message || 'Kode verifikasi COD (PIN) salah. Periksa kembali PIN dari pembeli.');
          // Reset pin inputs on error
          pinBoxes.forEach((b) => { b.value = ''; b.style.borderColor = '#EF4444'; });
          pinBoxes[0].focus();
        }
      });
    }
  }

  window.renderCodFlow = renderCodFlow;
})();
