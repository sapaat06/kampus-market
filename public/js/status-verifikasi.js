(function(){
  var params = new URLSearchParams(window.location.search);
  var email = params.get('email') || sessionStorage.getItem('kc_email') || '';
  var n = params.get('nama') || sessionStorage.getItem('kc_name') || '';
  var d = sessionStorage.getItem('kc_date');

  var stName = document.getElementById('stName');
  var stDate = document.getElementById('stDate');

  if (n && stName) { stName.textContent = n; }
  else if (stName && stName.textContent.trim()) { n = stName.textContent.trim(); }

  if (d && stDate) { stDate.textContent = d; }

  var pollTimer = null;

  function terapkanStatus(data) {
    if (!data) return;
    if (data.nama && stName) stName.textContent = data.nama;

    var pill = document.getElementById('pillStatus');
    var illuBadge = document.getElementById('illuBadge');
    var hTitle = document.getElementById('headlineTitle');
    var hSub = document.getElementById('headlineSub');
    var step2Box = document.getElementById('stepPemeriksaanBox');
    var step2Sub = document.getElementById('stepPemeriksaanSub');
    var step3Box = document.getElementById('stepSiapBox');
    var step3Sub = document.getElementById('stepSiapSub');
    var btn = document.getElementById('btnKembali');

    if (data.status_verifikasi === 'terverifikasi') {
      if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }

      if (pill) {
        pill.textContent = '✓ Akun Terverifikasi';
        pill.style.background = '#DCFCE7';
        pill.style.color = '#15803D';
        pill.style.fontWeight = '700';
      }

      if (illuBadge) {
        illuBadge.style.background = '#007A68';
        illuBadge.innerHTML = '<svg viewBox="0 0 24 24" style="stroke:#fff;fill:none;stroke-width:2.5;width:20px;height:20px;"><polyline points="20 6 9 17 4 12"/></svg>';
      }

      if (hTitle) {
        hTitle.innerHTML = 'Akunmu Sudah<br>Terverifikasi!';
      }
      if (hSub) {
        hSub.textContent = 'Selamat! KTM kamu telah disetujui oleh Admin Kampus. Sekarang kamu bisa mulai transaksi, belanja, sewa, dan pinjam barang!';
      }

      if (step2Box) {
        step2Box.className = 'step-icon-box done';
        step2Box.innerHTML = '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>';
      }
      if (step2Sub) {
        step2Sub.textContent = 'Telah disetujui oleh Admin Kampus';
        step2Sub.style.color = '#007A68';
        step2Sub.style.fontWeight = '600';
      }

      if (step3Box) {
        step3Box.className = 'step-icon-box done';
        step3Box.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>';
      }
      if (step3Sub) {
        step3Sub.textContent = 'Akun aktif dan siap digunakan';
        step3Sub.style.color = '#007A68';
        step3Sub.style.fontWeight = '600';
      }

      if (btn) {
        btn.textContent = 'Mulai Jelajahi KampusCircle';
        btn.href = data.role === 'pemilik_kost' ? '/role-kost.html' : '/beranda.html';
        btn.style.background = '#007A68';
        btn.style.color = '#FFFFFF';
      }
    } else if (data.status_verifikasi === 'ditolak') {
      if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }

      if (pill) {
        pill.textContent = '✕ Pengajuan Ditolak';
        pill.style.background = '#FEE2E2';
        pill.style.color = '#B91C1C';
        pill.style.fontWeight = '700';
      }

      if (illuBadge) {
        illuBadge.style.background = '#DC2626';
        illuBadge.innerHTML = '<svg viewBox="0 0 24 24" style="stroke:#fff;fill:none;stroke-width:2.5;width:20px;height:20px;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
      }

      if (hTitle) {
        hTitle.innerHTML = 'Verifikasi Belum<br>Disetujui';
      }
      if (hSub) {
        hSub.textContent = 'Identitas KTM belum dapat diverifikasi oleh admin. Silakan periksa kembali atau unggah ulang foto KTM kamu.';
      }

      if (step2Sub) {
        step2Sub.textContent = 'Pengajuan ditolak oleh Admin Kampus';
        step2Sub.style.color = '#DC2626';
      }

      if (btn) {
        btn.textContent = 'Unggah Ulang KTM';
        btn.href = '/verifikasi.html';
        btn.style.background = '#DC2626';
        btn.style.color = '#FFFFFF';
      }
    }
  }

  async function cekStatus() {
    var query = [];
    if (email) query.push('email=' + encodeURIComponent(email));
    if (n) query.push('nama=' + encodeURIComponent(n));
    var qs = query.length ? '?' + query.join('&') : '';

    var data = null;
    var gagalTotal = false;
    try {
      data = await KM.get('/status-verifikasi' + qs);
    } catch (_e) {
      try {
        data = await KM.get('/saya');
      } catch (_e2) {
        gagalTotal = true;
      }
    }

    if (gagalTotal && !window.__kmStatusErrShown) {
      window.__kmStatusErrShown = true;
      KM.ui.toast('Gagal memeriksa status verifikasi', 'error');
    }

    if (data && data.status_verifikasi) {
      terapkanStatus(data);
    }
  }

  // Cek saat pertama kali dimuat
  cekStatus();

  // Auto-polling tiap 2.5 detik agar langsung sinkron saat admin menyetujui
  pollTimer = setInterval(cekStatus, 2500);

  // Jika user pindah tab dan kembali, langsung cek
  window.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible') {
      cekStatus();
    }
  });

  var backBtn = document.getElementById('backBtn');
  if (backBtn) {
    backBtn.addEventListener('click', function(e) {
      e.preventDefault();
      if (window.history.length > 1) {
        window.history.back();
      } else {
        location.href = '/verifikasi.html';
      }
    });
  }
})();
