(function(){
  const nameInput = document.getElementById('name');
  const campusSelect = document.getElementById('campus');
  const emailInput = document.getElementById('email');
  const emailHelp = document.getElementById('emailHelp');
  const passwordInput = document.getElementById('password');
  const noHpInput = document.getElementById('noHp');
  const uploadBox = document.getElementById('uploadBox');
  const fileInput = document.getElementById('fileInput');
  const uploadTitle = document.getElementById('uploadTitle');
  const uploadSub = document.getElementById('uploadSub');
  const uploadIconRight = document.getElementById('uploadIconRight');
  const uploadError = document.getElementById('uploadError');
  const submitBtn = document.getElementById('submitBtn');
  const backBtn = document.getElementById('backBtn');

  if (backBtn) {
    backBtn.addEventListener('click', function(e) {
      e.preventDefault();
      if (window.history.length > 1) {
        window.history.back();
      } else {
        location.href = '/welcome.html';
      }
    });
  }

  let chosenFile = null;

  function updateSubmit(){
    const nameOk = nameInput.value.trim().length > 0;
    const campusOk = campusSelect.value !== '';
    const emailVal = emailInput.value.trim();
    const emailOk = emailVal !== '' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal);
    const passOk = passwordInput ? passwordInput.value.length >= 8 : true;
    const ok = nameOk && campusOk && emailOk && passOk;
    submitBtn.disabled = !ok;
    submitBtn.style.background = ok ? '#00917C' : '#B7D9D3';
    submitBtn.style.cursor = ok ? 'pointer' : 'not-allowed';
  }

  nameInput.addEventListener('input', updateSubmit);
  campusSelect.addEventListener('change', updateSubmit);
  if (passwordInput) passwordInput.addEventListener('input', updateSubmit);
  if (noHpInput) noHpInput.addEventListener('input', updateSubmit);
  emailInput.addEventListener('input', function(){
    const v = emailInput.value.trim();
    if(v === '' || (v.includes('@') && v.toLowerCase().endsWith('.ac.id'))){
      emailInput.style.borderColor = '#00917C';
      emailInput.style.borderWidth = '1.5px';
      emailHelp.textContent = 'Gunakan email kampus yang masih aktif.';
      emailHelp.style.color = '#7A8583';
    } else if(v !== '' && (!v.includes('@') || !v.toLowerCase().endsWith('.ac.id'))){
      // only show red if there's an @ attempt; simple: if not empty and invalid format
      if(v.length > 3){
        emailInput.style.borderColor = '#D64545';
        emailInput.style.borderWidth = '1.5px';
        emailHelp.textContent = 'Gunakan email kampus yang berakhiran .ac.id';
        emailHelp.style.color = '#D64545';
      }
    }
    updateSubmit();
  });
  emailInput.addEventListener('blur', function(){
    const v = emailInput.value.trim();
    if(v !== '' && !(v.includes('@') && v.toLowerCase().endsWith('.ac.id'))){
      emailInput.style.borderColor = '#D64545';
      emailInput.style.borderWidth = '1.5px';
      emailHelp.textContent = 'Gunakan email kampus yang berakhiran .ac.id';
      emailHelp.style.color = '#D64545';
    }
    updateSubmit();
  });
  emailInput.addEventListener('focus', function(){
    emailInput.style.borderColor = '#00917C';
    emailInput.style.borderWidth = '1.5px';
  });

  nameInput.addEventListener('focus', function(){ nameInput.style.borderColor='#00917C'; nameInput.style.borderWidth='1.5px';});
  nameInput.addEventListener('blur', function(){ nameInput.style.borderColor='#E3E8E7'; nameInput.style.borderWidth='1px';});
  campusSelect.addEventListener('focus', function(){ campusSelect.style.borderColor='#00917C'; campusSelect.style.borderWidth='1.5px';});
  campusSelect.addEventListener('blur', function(){ campusSelect.style.borderColor='#E3E8E7'; campusSelect.style.borderWidth='1px';});

  uploadBox.addEventListener('click', function(e){
    if(e.target && e.target.id === 'removeFile'){ return; }
    fileInput.click();
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
    uploadIconRight.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" stroke="#7A8583" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>';
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
    uploadSub.textContent = 'JPG / PNG · Maks. 5 MB';
    uploadIconRight.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" stroke="#00917C" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>';
    uploadIconRight.id = 'uploadIconRight';
    uploadIconRight.style.cursor = 'default';
    uploadError.style.display = 'none';
    updateSubmit();
  }

  submitBtn.addEventListener('click', async function(){
    if(submitBtn.disabled) return;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Mendaftarkan...';

    const nama = nameInput.value.trim();
    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput ? passwordInput.value : '';
    const no_hp = noHpInput ? noHpInput.value.trim() : '';
    const ktm = chosenFile ? chosenFile.name : (campusSelect.value || 'KTM');

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama, email, password, no_hp, ktm })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Pendaftaran gagal');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Kirim verifikasi';
        return;
      }

      if (data.token) {
        localStorage.setItem('km_token', data.token);
      }
      localStorage.setItem('km_sesi', '1');

      const now = new Date();
      const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
      const dateStr = now.getDate() + ' ' + months[now.getMonth()] + ' ' + now.getFullYear() + ' · ' + String(now.getHours()).padStart(2,'0') + '.' + String(now.getMinutes()).padStart(2,'0');
      sessionStorage.setItem('kc_name', nama);
      sessionStorage.setItem('kc_date', dateStr);

      location.href = '/status-verifikasi.html';
    } catch (err) {
      alert('Gagal menghubungi server');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Kirim verifikasi';
    }
  });

  updateSubmit();
})();
