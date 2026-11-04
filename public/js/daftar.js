(function(){
  const form = document.getElementById('formDaftar');
  const namaInput = document.getElementById('daftarNama');
  const emailInput = document.getElementById('daftarEmail');
  const hpInput = document.getElementById('daftarNoHp');
  const passInput = document.getElementById('daftarPass');
  const pass2Input = document.getElementById('daftarPass2');
  const agreeCheck = document.getElementById('agreeCheck');
  const btnDaftar = document.getElementById('btnDaftar');

  const eye1 = document.getElementById('eyeDaftarPass');
  const eye2 = document.getElementById('eyeDaftarPass2');

  const eyeOpen = '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  const eyeOff = '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';

  if (eye1) {
    eye1.addEventListener('click', () => {
      const show = passInput.type === 'password';
      passInput.type = show ? 'text' : 'password';
      eye1.innerHTML = show ? eyeOff : eyeOpen;
    });
  }

  if (eye2) {
    eye2.addEventListener('click', () => {
      const show = pass2Input.type === 'password';
      pass2Input.type = show ? 'text' : 'password';
      eye2.innerHTML = show ? eyeOff : eyeOpen;
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const nama = namaInput.value.trim();
      const email = emailInput.value.trim();
      const no_hp = hpInput.value.trim();
      const pass = passInput.value;
      const pass2 = pass2Input.value;
      const role = document.querySelector('input[name="roleDaftar"]:checked')?.value || 'mahasiswa';

      if (!nama || !email || !pass || !pass2) {
        if (typeof Swal !== 'undefined') {
          Swal.fire({ icon: 'warning', title: 'Data Belum Lengkap', text: 'Mohon isi semua data yang diperlukan.' });
        } else {
          alert('Mohon isi semua data yang diperlukan.');
        }
        return;
      }

      if (pass !== pass2) {
        if (typeof Swal !== 'undefined') {
          Swal.fire({ icon: 'warning', title: 'Kata Sandi Tidak Cocok', text: 'Konfirmasi kata sandi harus sama dengan kata sandi.' });
        } else {
          alert('Konfirmasi kata sandi harus sama.');
        }
        return;
      }

      if (pass.length < 8) {
        if (typeof Swal !== 'undefined') {
          Swal.fire({ icon: 'warning', title: 'Kata Sandi Kurang', text: 'Kata sandi minimal 8 karakter.' });
        } else {
          alert('Kata sandi minimal 8 karakter.');
        }
        return;
      }

      if (agreeCheck && !agreeCheck.checked) {
        if (typeof Swal !== 'undefined') {
          Swal.fire({ icon: 'warning', title: 'Persetujuan Syarat', text: 'Harap setujui Syarat & Ketentuan.' });
        } else {
          alert('Harap setujui Syarat & Ketentuan.');
        }
        return;
      }

      btnDaftar.disabled = true;
      btnDaftar.textContent = 'Mendaftarkan...';

      try {
        const res = await KM.post('/register', {
          nama,
          email,
          password: pass,
          whatsapp_number: no_hp,
          role
        });

        if (role === 'pemilik_kost') {
          if (typeof Swal !== 'undefined') {
            await Swal.fire({
              icon: 'success',
              title: 'Pendaftaran Berhasil',
              text: 'Pendaftaran berhasil. Akun Anda sedang direview oleh Admin.',
              confirmButtonText: 'Ke Halaman Masuk',
              buttonsStyling: false,
              customClass: {
                popup: 'rounded-2xl shadow-xl border-0',
                title: 'text-xl font-bold text-gray-800',
                htmlContainer: 'text-gray-600 font-medium',
                confirmButton: 'bg-[#007A68] text-white px-8 py-2.5 rounded-xl font-semibold hover:bg-emerald-700 transition-colors'
              }
            });
          } else {
            alert('Pendaftaran berhasil. Akun Anda sedang direview oleh Admin.');
          }
          window.location.href = '/masuk.html';
        } else {
          if (typeof Swal !== 'undefined') {
            await Swal.fire({
              icon: 'success',
              title: 'Pendaftaran Berhasil',
              text: 'Akun Anda berhasil dibuat. Silakan lanjutkan verifikasi KTM.',
              confirmButtonText: 'Lanjutkan',
              buttonsStyling: false,
              customClass: {
                popup: 'rounded-2xl shadow-xl border-0',
                title: 'text-xl font-bold text-gray-800',
                htmlContainer: 'text-gray-600 font-medium',
                confirmButton: 'bg-[#007A68] text-white px-8 py-2.5 rounded-xl font-semibold hover:bg-emerald-700 transition-colors'
              }
            });
          }
          window.location.href = '/verifikasi.html';
        }
      } catch (err) {
        const msg = err?.message || 'Pendaftaran gagal. Periksa kembali koneksi atau data Anda.';
        if (typeof Swal !== 'undefined') {
          Swal.fire({
            icon: 'error',
            title: 'Gagal Mendaftar',
            text: msg,
            confirmButtonText: 'Tutup'
          });
        } else {
          alert(`Gagal Mendaftar: ${msg}`);
        }
      } finally {
        btnDaftar.disabled = false;
        btnDaftar.textContent = 'Daftar';
      }
    });
  }
})();
