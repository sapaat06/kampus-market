(async function(){
  var n = sessionStorage.getItem('kc_name');
  var d = sessionStorage.getItem('kc_date');
  if(n){ document.getElementById('stName').textContent = n; }
  if(d){ document.getElementById('stDate').textContent = d; }

  // Sync actual account verification status from database
  try {
    const me = await KM.get('/saya');
    if (me.nama) document.getElementById('stName').textContent = me.nama;
    if (me.status_verifikasi === 'terverifikasi') {
      const pill = document.querySelector('.pill span');
      if (pill) {
        pill.textContent = '✓ Akun Terverifikasi';
        pill.parentElement.style.background = '#DDF1EC';
        pill.parentElement.style.color = '#00917C';
      }
    }
  } catch (_e) {}

  var backBtn = document.getElementById('backBtn');
  if(backBtn){
    backBtn.addEventListener('click', function(e){
      e.preventDefault();
      if(window.history.length > 1){
        window.history.back();
      } else {
        location.href = '/verifikasi.html';
      }
    });
  }
})();
