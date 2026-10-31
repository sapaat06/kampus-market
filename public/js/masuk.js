(function(){
  const form = document.getElementById('loginForm');
  const email = document.getElementById('email');
  const pass = document.getElementById('pass');
  const emailBox = document.getElementById('emailBox');
  const passBox = document.getElementById('passBox');
  const emailErr = document.getElementById('emailErr');
  const passErr = document.getElementById('passErr');
  const toggle = document.getElementById('togglePass');
  const eyeIcon = document.getElementById('eyeIcon');
  const backBtn = document.getElementById('backBtn');
  const daftarLink = document.getElementById('daftarLink');
  const loginBtn = document.getElementById('loginBtn');
  const rememberBox = document.getElementById('rememberBox');

  const REMEMBER_KEY = 'km_email';

  const eyeOpen = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
  const eyeOff = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';

  // "Ingat saya" menyimpan email di perangkat ini, bukan memperpanjang sesi.
  const emailTersimpan = localStorage.getItem(REMEMBER_KEY);
  if (emailTersimpan) {
    email.value = emailTersimpan;
    rememberBox.checked = true;
  }

  email.addEventListener('input', function(){
    emailBox.classList.remove('error');
    email.setAttribute('aria-invalid', 'false');
    emailErr.style.display = 'none';
  });
  pass.addEventListener('input', function(){
    passBox.classList.remove('error');
    pass.setAttribute('aria-invalid', 'false');
    passErr.style.display = 'none';
  });

  toggle.addEventListener('click', function(){
    const tampil = pass.type === 'password';
    pass.type = tampil ? 'text' : 'password';
    eyeIcon.innerHTML = tampil ? eyeOpen : eyeOff;
    toggle.setAttribute('aria-label', tampil ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi');
  });

  // Back yang sama dengan halaman daftar: kembali ke halaman sebelumnya kalau ada.
  backBtn.addEventListener('click', function(){
    if (window.history.length > 1) window.history.back();
    else location.href = '/welcome.html';
  });

  form.addEventListener('submit', async function(ev){
    ev.preventDefault();
    let ok = true;
    const e = email.value.trim();
    if (e === '' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      emailBox.classList.add('error');
      email.setAttribute('aria-invalid', 'true');
      emailErr.style.display = 'block';
      ok = false;
    } else {
      email.setAttribute('aria-invalid', 'false');
    }
    if (pass.value.length < 8) {
      passBox.classList.add('error');
      pass.setAttribute('aria-invalid', 'true');
      passErr.textContent = 'Kata sandi minimal 8 karakter.';
      passErr.style.display = 'block';
      ok = false;
    } else {
      pass.setAttribute('aria-invalid', 'false');
    }
    if (!ok) return;

    loginBtn.disabled = true;
    loginBtn.textContent = 'Memproses...';
    try {
      await KM.post('/login', { email: e, password: pass.value });
      if (rememberBox.checked) localStorage.setItem(REMEMBER_KEY, e);
      else localStorage.removeItem(REMEMBER_KEY);
      location.href = '/beranda.html';
    } catch (err) {
      passBox.classList.add('error');
      pass.setAttribute('aria-invalid', 'true');
      passErr.textContent = err.message;
      passErr.style.display = 'block';
    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent = 'Masuk';
    }
  });
})();