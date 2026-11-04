(function(){
  const form = document.getElementById('loginKostForm');
  const emailInput = document.getElementById('emailKost');
  const passInput = document.getElementById('passKost');
  const emailBox = document.getElementById('emailKostBox');
  const passBox = document.getElementById('passKostBox');
  const emailErr = document.getElementById('emailKostErr');
  const passErr = document.getElementById('passKostErr');
  const toggleBtn = document.getElementById('togglePassKost');
  const eyeIcon = document.getElementById('eyeIconKost');
  const backBtn = document.getElementById('backBtn');
  const loginBtn = document.getElementById('loginKostBtn');
  const rememberBox = document.getElementById('rememberKostBox');
  const forgotLink = document.getElementById('forgotKostLink');

  if (forgotLink) {
    forgotLink.addEventListener('click', function(ev){
      ev.preventDefault();
      if (typeof Swal !== 'undefined') {
        Swal.fire({
          icon: 'info',
          title: 'Lupa Kata Sandi?',
          text: 'Silakan hubungi administrator kampus melalui kontak support untuk reset password akun kost Anda.',
          confirmButtonText: 'Mengerti',
          confirmButtonColor: '#007A68'
        });
      } else {
        alert('Silakan hubungi administrator kampus untuk reset password akun kost Anda.');
      }
    });
  }

  const REMEMBER_KOST_KEY = 'km_kost_email';
  const eyeOpen = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
  const eyeOff = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';

  const savedEmail = localStorage.getItem(REMEMBER_KOST_KEY);
  if (savedEmail && emailInput && rememberBox) {
    emailInput.value = savedEmail;
    rememberBox.checked = true;
  }

  if (emailInput) {
    emailInput.addEventListener('input', function(){
      emailBox?.classList.remove('error');
      emailInput.setAttribute('aria-invalid', 'false');
      if (emailErr) emailErr.style.display = 'none';
    });
  }

  if (passInput) {
    passInput.addEventListener('input', function(){
      passBox?.classList.remove('error');
      passInput.setAttribute('aria-invalid', 'false');
      if (passErr) passErr.style.display = 'none';
    });
  }

  if (toggleBtn && passInput && eyeIcon) {
    toggleBtn.addEventListener('click', function(){
      const isPass = passInput.type === 'password';
      passInput.type = isPass ? 'text' : 'password';
      eyeIcon.innerHTML = isPass ? eyeOpen : eyeOff;
      toggleBtn.setAttribute('aria-label', isPass ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi');
    });
  }

  if (backBtn) {
    backBtn.addEventListener('click', function(){
      if (window.history.length > 1) window.history.back();
      else location.href = '/masuk.html';
    });
  }

  if (form) {
    form.addEventListener('submit', async function(ev){
      ev.preventDefault();
      let valid = true;
      const em = emailInput.value.trim();
      const pw = passInput.value;

      if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
        emailBox?.classList.add('error');
        emailInput.setAttribute('aria-invalid', 'true');
        if (emailErr) emailErr.style.display = 'block';
        valid = false;
      }

      if (pw.length < 8) {
        passBox?.classList.add('error');
        passInput.setAttribute('aria-invalid', 'true');
        if (passErr) {
          passErr.textContent = 'Kata sandi minimal 8 karakter.';
          passErr.style.display = 'block';
        }
        valid = false;
      }

      if (!valid) {
        if (typeof Swal !== 'undefined') {
          Swal.fire({
            icon: 'warning',
            title: 'Form Belum Lengkap',
            text: 'Periksa kembali email dan kata sandi kamu.',
            confirmButtonColor: '#007A68'
          });
        } else {
          alert('Periksa kembali email dan kata sandi kamu.');
        }
        return;
      }

      loginBtn.disabled = true;
      loginBtn.textContent = 'Memproses...';

      try {
        const user = await KM.post('/login', { email: em, password: pw, intended_role: 'pemilik_kost' });

        // 1. Validasi Ketat di Frontend (Pintu Login Pemilik Kost):
        // Jika user bukan pemilik_kost, tolak sepenuhnya dan jangan redirect ke beranda mahasiswa
        if (user.role !== 'pemilik_kost' && user.role !== 'admin') {
          // Hapus token/session yang mungkin terlanjur tersimpan
          localStorage.removeItem('token');
          localStorage.removeItem('km_token');
          localStorage.removeItem('km_sesi');
          localStorage.removeItem('role');
          localStorage.removeItem('km_role');
          if (window.KM && KM.sesi && KM.sesi.clear) KM.sesi.clear();

          // Munculkan popup error SweetAlert2
          if (typeof Swal !== 'undefined') {
            await Swal.fire({
              icon: 'error',
              title: 'Akses Ditolak',
              text: 'Email ini terdaftar sebagai Mahasiswa. Silakan gunakan halaman Login Mahasiswa.',
              confirmButtonColor: '#059669'
            });
          } else {
            alert('Email ini terdaftar sebagai Mahasiswa. Silakan gunakan halaman Login Mahasiswa.');
          }
          return; // Hentikan proses, JANGAN redirect ke beranda mahasiswa
        }

        if (rememberBox && rememberBox.checked) {
          localStorage.setItem(REMEMBER_KOST_KEY, em);
        } else {
          localStorage.removeItem(REMEMBER_KOST_KEY);
        }

        if (typeof Swal !== 'undefined') {
          await Swal.fire({
            icon: 'success',
            title: 'Berhasil Masuk',
            text: 'Selamat datang kembali di Dashboard Pemilik Kost!',
            confirmButtonText: 'Buka Dashboard',
            buttonsStyling: false,
            customClass: {
              popup: 'rounded-2xl shadow-xl border-0',
              title: 'text-xl font-bold text-gray-800',
              htmlContainer: 'text-gray-600 font-medium',
              confirmButton: 'bg-[#007A68] text-white px-8 py-2.5 rounded-xl font-semibold hover:bg-emerald-700 transition-colors'
            }
          });
        }
        location.href = '/kos-owner.html';
      } catch (err) {
        passBox?.classList.add('error');
        passInput.setAttribute('aria-invalid', 'true');
        const pesanError = err?.message || 'Email atau kata sandi salah.';
        if (passErr) {
          passErr.textContent = pesanError;
          passErr.style.display = 'block';
        }

        if (typeof Swal !== 'undefined') {
          const isPending = /tinjauan|belum disetujui|verifikasi|belum diverifikasi/i.test(pesanError);
          const isDitolak = /ditolak/i.test(pesanError);
          let judul = 'Gagal Masuk';
          let ikon = 'error';

          if (isPending) {
            judul = 'Verifikasi Admin Diperlukan';
            ikon = 'info';
          } else if (isDitolak) {
            judul = 'Pendaftaran Ditolak';
            ikon = 'warning';
          }

          Swal.fire({
            icon: ikon,
            title: judul,
            text: pesanError,
            confirmButtonText: 'Tutup',
            buttonsStyling: false,
            customClass: {
              popup: 'rounded-2xl shadow-xl border-0',
              title: 'text-xl font-bold text-gray-800',
              htmlContainer: 'text-gray-600 font-medium',
              confirmButton: 'bg-[#007A68] text-white px-8 py-2.5 rounded-xl font-semibold hover:bg-emerald-700 transition-colors'
            }
          });
        } else {
          alert(`Gagal Masuk: ${pesanError}`);
        }
      } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Masuk sebagai Pemilik Kost';
      }
    });
  }
})();
