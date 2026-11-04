(function(){
  const form = document.getElementById('formDaftarKost');
  const namaInput = document.getElementById('namaKost');
  const emailInput = document.getElementById('emailKost');
  const hpInput = document.getElementById('hpKost');
  const pass1Input = document.getElementById('passKost1');
  const pass2Input = document.getElementById('passKost2');
  const agreeCheck = document.getElementById('agreeCheckKost');
  const btnSubmit = document.getElementById('btnSubmitDaftarKost');
  const backBtn = document.getElementById('backToLoginKost');

  const eye1 = document.getElementById('eyePassKost1');
  const eye2 = document.getElementById('eyePassKost2');

  const eyeOpen = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
  const eyeOff = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';

  if (eye1 && pass1Input) {
    eye1.addEventListener('click', () => {
      const show = pass1Input.type === 'password';
      pass1Input.type = show ? 'text' : 'password';
      const svg = eye1.querySelector('svg');
      if (svg) svg.innerHTML = show ? eyeOff : eyeOpen;
    });
  }

  if (eye2 && pass2Input) {
    eye2.addEventListener('click', () => {
      const show = pass2Input.type === 'password';
      pass2Input.type = show ? 'text' : 'password';
      const svg = eye2.querySelector('svg');
      if (svg) svg.innerHTML = show ? eyeOff : eyeOpen;
    });
  }

  if (backBtn) {
    backBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (typeof goBack === 'function') {
        goBack('/masuk-kost.html');
      } else {
        location.href = '/masuk-kost.html';
      }
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const nama = namaInput.value.trim();
      const email = emailInput.value.trim();
      const hp = hpInput.value.trim();
      const pass1 = pass1Input.value;
      const pass2 = pass2Input.value;

      if (!nama || !email || !pass1 || !pass2) {
        if (typeof Swal !== 'undefined') {
          Swal.fire({
            icon: 'warning',
            title: 'Data Belum Lengkap',
            text: 'Harap lengkapi semua kolom pendaftaran.',
            confirmButtonColor: '#007A68'
          });
        } else {
          alert('Harap lengkapi semua kolom pendaftaran.');
        }
        return;
      }

      if (pass1 !== pass2) {
        if (typeof Swal !== 'undefined') {
          Swal.fire({
            icon: 'warning',
            title: 'Kata Sandi Tidak Cocok',
            text: 'Konfirmasi kata sandi harus sama persis dengan kata sandi.',
            confirmButtonColor: '#007A68'
          });
        } else {
          alert('Konfirmasi kata sandi harus sama.');
        }
        return;
      }

      if (pass1.length < 8) {
        if (typeof Swal !== 'undefined') {
          Swal.fire({
            icon: 'warning',
            title: 'Kata Sandi Kurang',
            text: 'Kata sandi minimal 8 karakter.',
            confirmButtonColor: '#007A68'
          });
        } else {
          alert('Kata sandi minimal 8 karakter.');
        }
        return;
      }

      if (agreeCheck && !agreeCheck.checked) {
        if (typeof Swal !== 'undefined') {
          Swal.fire({
            icon: 'warning',
            title: 'Persetujuan Ketentuan',
            text: 'Harap setujui syarat & ketentuan layanan mitra kost.',
            confirmButtonColor: '#007A68'
          });
        } else {
          alert('Harap setujui syarat & ketentuan layanan mitra kost.');
        }
        return;
      }

      btnSubmit.disabled = true;
      btnSubmit.textContent = 'Mendaftarkan akun...';

      try {
        await KM.post('/register', {
          nama,
          email,
          password: pass1,
          whatsapp_number: hp,
          role: 'pemilik_kost'
        });

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
        window.location.href = '/masuk-kost.html';
      } catch (err) {
        const msg = err?.message || 'Pendaftaran akun pemilik kost gagal.';
        if (typeof Swal !== 'undefined') {
          Swal.fire({
            icon: 'error',
            title: 'Gagal Mendaftar',
            text: msg,
            confirmButtonText: 'Tutup',
            confirmButtonColor: '#007A68'
          });
        } else {
          alert(`Gagal Mendaftar: ${msg}`);
        }
      } finally {
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Daftar sebagai Pemilik Kost';
      }
    });
  }
})();
