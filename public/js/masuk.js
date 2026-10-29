(function(){
  const email=document.getElementById('email');
  const pass=document.getElementById('pass');
  const emailBox=document.getElementById('emailBox');
  const passBox=document.getElementById('passBox');
  const emailErr=document.getElementById('emailErr');
  const passErr=document.getElementById('passErr');
  const toggle=document.getElementById('togglePass');
  const eyeIcon=document.getElementById('eyeIcon');
  const backBtn=document.getElementById('backBtn');
  const daftarLink=document.getElementById('daftarLink');
  const loginBtn=document.getElementById('loginBtn');
  const rememberWrap=document.getElementById('rememberWrap');
  const rememberBox=document.getElementById('rememberBox');
  const forgotBtn=document.getElementById('forgotBtn');
  const modalResetPw=document.getElementById('modalResetPw');
  const closeModalReset=document.getElementById('closeModalReset');
  const resetEmail=document.getElementById('resetEmail');
  const resetPass=document.getElementById('resetPass');
  const resetMsg=document.getElementById('resetMsg');
  const btnSubmitReset=document.getElementById('btnSubmitReset');

  const eyeOpen='<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
  const eyeOff='<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';

  email.addEventListener('input', function(){ emailBox.classList.remove('error'); emailErr.style.display='none'; });
  pass.addEventListener('input', function(){ passBox.classList.remove('error'); passErr.style.display='none'; });

  toggle.addEventListener('click', function(){
    if(pass.type==='password'){ pass.type='text'; eyeIcon.innerHTML=eyeOpen; }
    else { pass.type='password'; eyeIcon.innerHTML=eyeOff; }
  });

  rememberWrap.addEventListener('click', function(){ rememberBox.classList.toggle('checked'); });

  backBtn.addEventListener('click', function(){ location.href='/welcome.html'; });
  daftarLink.addEventListener('click', function(){ location.href='/verifikasi.html'; });

  // Modal Lupa Kata Sandi Handlers
  if(forgotBtn && modalResetPw){
    forgotBtn.addEventListener('click', function(){
      if(email.value.trim()){
        resetEmail.value = email.value.trim();
      }
      resetMsg.style.display = 'none';
      modalResetPw.style.display = 'flex';
    });
  }

  if(closeModalReset && modalResetPw){
    closeModalReset.addEventListener('click', function(){
      modalResetPw.style.display = 'none';
    });
  }

  if(btnSubmitReset){
    btnSubmitReset.addEventListener('click', async function(){
      const rEmail = resetEmail.value.trim().toLowerCase();
      const rPass = resetPass.value;

      if(!rEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rEmail)){
        resetMsg.style.display = 'block';
        resetMsg.style.background = '#FDE8E8';
        resetMsg.style.color = '#D64545';
        resetMsg.textContent = 'Masukkan email yang valid.';
        return;
      }

      if(!rPass || rPass.length < 8){
        resetMsg.style.display = 'block';
        resetMsg.style.background = '#FDE8E8';
        resetMsg.style.color = '#D64545';
        resetMsg.textContent = 'Kata sandi baru minimal 8 karakter.';
        return;
      }

      btnSubmitReset.disabled = true;
      btnSubmitReset.textContent = 'Menyimpan...';

      try {
        const res = await fetch('/api/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: rEmail, password_baru: rPass })
        });
        const data = await res.json();

        if(!res.ok){
          resetMsg.style.display = 'block';
          resetMsg.style.background = '#FDE8E8';
          resetMsg.style.color = '#D64545';
          resetMsg.textContent = data.error || 'Gagal mengubah kata sandi.';
          btnSubmitReset.disabled = false;
          btnSubmitReset.textContent = 'Simpan Kata Sandi Baru';
          return;
        }

        resetMsg.style.display = 'block';
        resetMsg.style.background = '#DDF1EC';
        resetMsg.style.color = '#00917C';
        resetMsg.textContent = '✓ Kata sandi berhasil diubah! Silakan masuk.';

        // Isi otomatis form login
        email.value = rEmail;
        pass.value = rPass;

        setTimeout(function(){
          modalResetPw.style.display = 'none';
          btnSubmitReset.disabled = false;
          btnSubmitReset.textContent = 'Simpan Kata Sandi Baru';
        }, 1500);
      } catch (err){
        resetMsg.style.display = 'block';
        resetMsg.style.background = '#FDE8E8';
        resetMsg.style.color = '#D64545';
        resetMsg.textContent = 'Gagal menghubungi server.';
        btnSubmitReset.disabled = false;
        btnSubmitReset.textContent = 'Simpan Kata Sandi Baru';
      }
    });
  }

  loginBtn.addEventListener('click', async function(){
    let ok=true;
    const e=email.value.trim();
    if(e==='' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)){ emailBox.classList.add('error'); emailErr.style.display='block'; ok=false; }
    if(pass.value==='' || pass.value.length<8){ passBox.classList.add('error'); passErr.textContent='Password minimal 8 karakter'; passErr.style.display='block'; ok=false; }
    if(!ok) return;

    try {
      loginBtn.disabled = true;
      loginBtn.textContent = 'Memproses...';
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: e, password: pass.value })
      });
      const data = await res.json();
      if (!res.ok) {
        passBox.classList.add('error');
        passErr.textContent = data.error || 'Email atau password salah';
        passErr.style.display = 'block';
        return;
      }
      localStorage.setItem('km_token', data.token);
      location.href = '/beranda.html';
    } catch (err) {
      passBox.classList.add('error');
      passErr.textContent = 'Gagal menghubungi server';
      passErr.style.display = 'block';
    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent = 'Masuk';
    }
  });
})();
