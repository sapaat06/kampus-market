(function(){
  const form = document.getElementById('daftarForm');
  const nameInput = document.getElementById('name');
  const campusSelect = document.getElementById('campus');
  const emailInput = document.getElementById('email');
  const emailHelp = document.getElementById('emailHelp');
  const passwordInput = document.getElementById('password');
  const password2Input = document.getElementById('password2');
  const passwordHelp = document.getElementById('passwordHelp');
  const password2Help = document.getElementById('password2Help');
  const noHpInput = document.getElementById('noHp');
  const noHpHelp = document.getElementById('noHpHelp');
  const roleSelect = document.getElementById('role');
  const uploadBox = document.getElementById('uploadBox');
  const fileInput = document.getElementById('fileInput');
  const uploadTitle = document.getElementById('uploadTitle');
  const uploadSub = document.getElementById('uploadSub');
  const uploadIconRight = document.getElementById('uploadIconRight');
  const uploadError = document.getElementById('uploadError');
  const formMsg = document.getElementById('formMsg');
  const submitBtn = document.getElementById('submitBtn');
  const backBtn = document.getElementById('backBtn');

  // Manual Campus Elements
  const btnToggleManualCampus = document.getElementById('btnToggleManualCampus');
  const selectCampusWrap = document.getElementById('selectCampusWrap');
  const manualCampusWrap = document.getElementById('manualCampusWrap');
  const campusManual = document.getElementById('campusManual');
  const btnBatalManual = document.getElementById('btnBatalManual');

  const COLOR_PRIMARY = '#007A68';
  const COLOR_MUTED = '#5F6B69';
  const COLOR_ERROR = '#D64545';
  const COLOR_BORDER = '#C5CDCB';
  const COLOR_DISABLED = '#B7D9D3';

  const eyeOpen = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
  const eyeOff = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';

  backBtn.addEventListener('click', function(e) {
    e.preventDefault();
    if (typeof goBack === 'function') {
      goBack('/welcome.html');
    } else {
      location.href = '/welcome.html';
    }
  });

  function pasangToggle(btnId, input) {
    const btn = document.getElementById(btnId);
    if (!btn || !input) return;
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      const tampil = input.type === 'text';
      input.type = tampil ? 'password' : 'text';
      btn.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + (tampil ? eyeOpen : eyeOff) + '</svg>';
      btn.setAttribute('aria-label', tampil ? 'Tampilkan kata sandi' : 'Sembunyikan kata sandi');
    });
  }
  pasangToggle('eyePassword', passwordInput);
  pasangToggle('eyePassword2', password2Input);

  const sama = () => password2Input.value !== '' && password2Input.value === passwordInput.value;

  function bukaManualKampus() {
    if (manualCampusWrap) manualCampusWrap.style.display = 'block';
    if (campusManual) campusManual.focus();
    if (btnToggleManualCampus) btnToggleManualCampus.textContent = 'Pilih dari list';
    updateKtmPreview();
    updateSubmit();
  }

  function tutupManualKampus() {
    if (manualCampusWrap) manualCampusWrap.style.display = 'none';
    if (campusManual) campusManual.value = '';
    if (campusSelect && campusSelect.value === '__manual__') {
      campusSelect.value = 'Institut Teknologi Garut';
    }
    if (btnToggleManualCampus) btnToggleManualCampus.textContent = 'Ketik manual';
    updateKtmPreview();
    updateSubmit();
  }

  btnToggleManualCampus?.addEventListener('click', function(e) {
    e.preventDefault();
    if (manualCampusWrap && manualCampusWrap.style.display !== 'none') {
      tutupManualKampus();
    } else {
      bukaManualKampus();
    }
  });

  btnBatalManual?.addEventListener('click', function(e) {
    e.preventDefault();
    tutupManualKampus();
  });

  campusManual?.addEventListener('input', function() {
    updateKtmPreview();
    updateSubmit();
  });

  function getNamaKampus() {
    const isManual = manualCampusWrap && manualCampusWrap.style.display !== 'none';
    if (isManual) {
      return campusManual ? campusManual.value.trim() : '';
    }
    return (campusSelect && campusSelect.value !== '__manual__') ? campusSelect.value : '';
  }

  function updateSubmit(){
    const nameOk = nameInput.value.trim().length > 0;
    const campusOk = getNamaKampus().length > 0;
    const emailVal = emailInput.value.trim();
    const emailOk = emailVal !== '' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal);
    const noHpVal = noHpInput ? noHpInput.value.replace(/\D/g, '') : '';
    const noHpOk = noHpVal.length >= 10;
    const passOk = passwordInput && passwordInput.value.length >= 8;
    const matchOk = password2Input && password2Input.value.length >= 8 && password2Input.value === passwordInput.value;

    const ok = nameOk && campusOk && emailOk && noHpOk && passOk && matchOk;
    submitBtn.disabled = !ok;
    submitBtn.style.background = ok ? COLOR_PRIMARY : COLOR_DISABLED;
    submitBtn.style.cursor = ok ? 'pointer' : 'not-allowed';
  }

  const nimInput = document.getElementById('nim');
  function updateKtmPreview() {
    if (!chosenFile && uploadSub) {
      const nm = nameInput.value.trim() || 'Mahasiswa Aktif';
      const ni = (nimInput ? nimInput.value.trim() : '');
      uploadSub.textContent = ni ? (nm + ' · ' + ni) : nm;
      const kName = getNamaKampus() || 'Institut Teknologi Garut';
      if (uploadTitle) uploadTitle.textContent = kName;
    }
  }

  nameInput.addEventListener('input', function(){
    nameInput.setAttribute('aria-invalid', nameInput.value.trim().length === 0 ? 'true' : 'false');
    updateKtmPreview();
    updateSubmit();
  });
  if (nimInput) {
    nimInput.addEventListener('input', updateKtmPreview);
  }
  campusSelect.addEventListener('change', function(){
    if (campusSelect.value === '__manual__') {
      bukaManualKampus();
    } else {
      if (manualCampusWrap) manualCampusWrap.style.display = 'none';
      if (btnToggleManualCampus) btnToggleManualCampus.textContent = 'Ketik manual';
      campusSelect.setAttribute('aria-invalid', campusSelect.value === '' ? 'true' : 'false');
      updateKtmPreview();
      updateSubmit();
    }
  });

  passwordInput.addEventListener('input', function() {
    const len = passwordInput.value.length;
    if (len > 0 && len < 8) {
      if (passwordHelp) {
        passwordHelp.textContent = 'Minimal 8 karakter.';
        passwordHelp.style.display = 'block';
      }
      passwordInput.style.borderColor = COLOR_ERROR;
    } else {
      if (passwordHelp) passwordHelp.style.display = 'none';
      passwordInput.style.borderColor = len >= 8 ? COLOR_PRIMARY : COLOR_BORDER;
    }

    if (password2Input.value.length > 0) {
      if (password2Input.value !== passwordInput.value) {
        if (password2Help) {
          password2Help.textContent = 'Kata sandi konfirmasi tidak cocok.';
          password2Help.style.display = 'block';
        }
        password2Input.style.borderColor = COLOR_ERROR;
      } else {
        if (password2Help) password2Help.style.display = 'none';
        password2Input.style.borderColor = COLOR_PRIMARY;
      }
    }
    updateSubmit();
  });

  password2Input.addEventListener('input', function() {
    const len = password2Input.value.length;
    if (len > 0 && password2Input.value !== passwordInput.value) {
      if (password2Help) {
        password2Help.textContent = 'Kata sandi konfirmasi tidak cocok.';
        password2Help.style.display = 'block';
      }
      password2Input.style.borderColor = COLOR_ERROR;
    } else {
      if (password2Help) password2Help.style.display = 'none';
      password2Input.style.borderColor = len >= 8 ? COLOR_PRIMARY : COLOR_BORDER;
    }
    updateSubmit();
  });

  noHpInput.addEventListener('input', function() {
    this.value = this.value.replace(/\D/g, '');
    const len = this.value.length;
    if (len > 0 && len < 10) {
      if (noHpHelp) {
        noHpHelp.textContent = 'Nomor WhatsApp minimal 10 digit angka.';
        noHpHelp.style.display = 'block';
      }
      this.style.borderColor = COLOR_ERROR;
    } else {
      if (noHpHelp) noHpHelp.style.display = 'none';
      this.style.borderColor = len >= 10 ? COLOR_PRIMARY : COLOR_BORDER;
    }
    updateSubmit();
  });

  noHpInput.addEventListener('blur', function() {
    const len = this.value.length;
    if (len > 0 && len < 10) {
      if (noHpHelp) {
        noHpHelp.textContent = 'Nomor WhatsApp minimal 10 digit angka.';
        noHpHelp.style.display = 'block';
      }
      this.style.borderColor = COLOR_ERROR;
    } else {
      if (noHpHelp) noHpHelp.style.display = 'none';
    }
    updateSubmit();
  });

  emailInput.addEventListener('input', function(){
    emailInput.style.borderColor = COLOR_PRIMARY;
    emailInput.style.borderWidth = '1.5px';
    emailHelp.style.color = COLOR_MUTED;
    emailHelp.textContent = 'Gunakan email kampus yang masih aktif.';
    emailInput.setAttribute('aria-invalid', 'false');
    updateSubmit();
  });
  emailInput.addEventListener('blur', function(){
    const v = emailInput.value.trim();
    if(v !== '' && !(v.includes('@') && v.toLowerCase().endsWith('.ac.id'))){
      emailInput.style.borderColor = COLOR_ERROR;
      emailInput.style.borderWidth = '1.5px';
      emailHelp.textContent = 'Gunakan email kampus yang berakhiran .ac.id';
      emailHelp.style.color = COLOR_ERROR;
      emailInput.setAttribute('aria-invalid', 'true');
    } else {
      emailInput.style.borderColor = COLOR_BORDER;
      emailInput.style.borderWidth = '1.5px';
      emailInput.setAttribute('aria-invalid', 'false');
    }
    updateSubmit();
  });
  emailInput.addEventListener('focus', function(){
    emailInput.style.borderColor = COLOR_PRIMARY;
    emailInput.style.borderWidth = '1.5px';
  });

  nameInput.addEventListener('focus', function(){ nameInput.style.borderColor=COLOR_PRIMARY; nameInput.style.borderWidth='1.5px';});
  nameInput.addEventListener('blur', function(){ nameInput.style.borderColor=COLOR_BORDER; nameInput.style.borderWidth='1.5px';});
  campusSelect.addEventListener('focus', function(){ campusSelect.style.borderColor=COLOR_PRIMARY; campusSelect.style.borderWidth='1.5px';});
  campusSelect.addEventListener('blur', function(){ campusSelect.style.borderColor=COLOR_BORDER; campusSelect.style.borderWidth='1.5px';});

  let chosenFile = null;

  uploadBox.addEventListener('click', function(e){
    if(e.target && e.target.id === 'removeFile'){ return; }
    fileInput.click();
  });
  document.getElementById('btnUbahFoto')?.addEventListener('click', function(){
    fileInput.click();
  });
  uploadBox.addEventListener('keydown', function(e){
    if(e.key === 'Enter' || e.key === ' '){
      e.preventDefault();
      fileInput.click();
    }
  });

  fileInput.addEventListener('change', function(){
    const f = fileInput.files[0];
    if(!f){ return; }
    if(!(f.type === 'image/png' || f.type === 'image/jpeg') || f.size > 5*1024*1024){
      uploadError.style.display = 'block';
      chosenFile = null;
      fileInput.value = '';
      updateSubmit();
      return;
    }
    uploadError.style.display = 'none';
    chosenFile = f;
    uploadTitle.textContent = f.name;
    uploadSub.textContent = (f.size/1024/1024).toFixed(1).replace('.',',') + ' MB';
    uploadIconRight.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" stroke="' + COLOR_MUTED + '" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>';
    uploadIconRight.id = 'removeFile';
    uploadIconRight.style.cursor = 'pointer';
    uploadIconRight.addEventListener('click', removeFile, {once:true});
    updateSubmit();
  });

  function removeFile(e){
    e.stopPropagation();
    chosenFile = null;
    fileInput.value = '';
    uploadTitle.textContent = 'Unggah foto KTM';
    uploadSub.textContent = 'JPG / PNG · Maks. 5 MB · opsional';
    uploadIconRight.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" stroke="' + COLOR_PRIMARY + '" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>';
    uploadIconRight.id = 'uploadIconRight';
    uploadIconRight.style.cursor = 'default';
    uploadError.style.display = 'none';
    updateSubmit();
  }

  // KTM dikirim sebagai data URL JPEG yang diperkecil di browser, supaya
  // payload tetap kecil dan admin bisa melihat fotonya langsung.
  function bacaGambar(file){
    return new Promise(function(resolve, reject){
      const reader = new FileReader();
      reader.onload = function(){ resolve(reader.result); };
      reader.onerror = function(){ reject(new Error('Gagal membaca file.')); };
      reader.readAsDataURL(file);
    });
  }

  async function kompresGambar(file){
    const dataUrl = await bacaGambar(file);
    const img = new Image();
    await new Promise(function(resolve, reject){
      img.onload = resolve;
      img.onerror = function(){ reject(new Error('Gagal membaca gambar.')); };
      img.src = dataUrl;
    });
    const max = 720;
    const skala = Math.min(1, max / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * skala);
    canvas.height = Math.round(img.height * skala);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.6);
  }

  function tampilPesan(teks){
    formMsg.textContent = teks;
    formMsg.style.display = teks ? 'block' : 'none';
    if (teks) {
      setTimeout(function(){
        formMsg.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 50);
    }
  }

  form.addEventListener('submit', async function(ev){
    ev.preventDefault();
    if (submitBtn.disabled) return;
    tampilPesan('');

    const nama = nameInput.value.trim();
    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;
    const no_hp = (noHpInput ? noHpInput.value.replace(/\D/g, '') : '').trim();
    const kampus = getNamaKampus();
    const role = roleSelect ? roleSelect.value : 'pelanggan';

    if (!nama) { tampilPesan('Nama lengkap wajib diisi.'); nameInput.focus(); return; }
    if (!kampus) {
      tampilPesan('Pilih atau ketik nama kampusmu.');
      if (manualCampusWrap && manualCampusWrap.style.display !== 'none') campusManual?.focus();
      else campusSelect?.focus();
      return;
    }
    if (no_hp.length < 10) {
      tampilPesan('Nomor WhatsApp minimal 10 digit angka.');
      if (noHpHelp) noHpHelp.style.display = 'block';
      noHpInput?.focus();
      return;
    }
    if (password.length < 8) {
      tampilPesan('Kata sandi minimal 8 karakter.');
      if (passwordHelp) passwordHelp.style.display = 'block';
      passwordInput?.focus();
      return;
    }
    if (password !== password2Input.value) {
      tampilPesan('Kata sandi dan ulangannya belum sama.');
      if (password2Help) password2Help.style.display = 'block';
      password2Input?.focus();
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Mendaftarkan...';

    try {
      let ktm = null;
      if (chosenFile) {
        submitBtn.textContent = 'Menyiapkan KTM...';
        ktm = await kompresGambar(chosenFile);
        if (ktm.length > 800000) throw new Error('Foto KTM terlalu besar setelah dikompres. Coba foto lain.');
      }

      await KM.post('/register', { nama, email, password, no_hp, whatsapp_number: no_hp, kampus, ktm, role });

      const now = new Date();
      const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
      const dateStr = now.getDate() + ' ' + months[now.getMonth()] + ' ' + now.getFullYear() + ' · ' + String(now.getHours()).padStart(2,'0') + '.' + String(now.getMinutes()).padStart(2,'0');
      sessionStorage.setItem('kc_name', nama);
      sessionStorage.setItem('kc_email', email);
      sessionStorage.setItem('kc_date', dateStr);

      await KM.ui.sukses('Pendaftaran Berhasil', 'Akun kamu berhasil dibuat. Selanjutnya verifikasi KTM akan diperiksa admin.');
      location.href = '/status-verifikasi.html';
    } catch (err) {
      let msg = err.message || 'Terjadi kesalahan saat pendaftaran.';
      if (msg.includes('data sudah ada') || msg.includes('UNIQUE') || msg.includes('sudah terdaftar')) {
        msg = 'Email kampus sudah terdaftar. Silakan gunakan email lain atau langsung masuk.';
      }
      tampilPesan(msg);
      KM.ui.error('Pendaftaran Gagal', msg);
      submitBtn.textContent = 'Kirim verifikasi';
      updateSubmit();
    }
  });

  updateSubmit();

  try {
    const vBody = document.querySelector('.verif-body');
    if (vBody) vBody.scrollTop = 0;
  } catch (_e) {}
})();