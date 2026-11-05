(function(){
  const inMinPrice = document.getElementById('inMinPrice');
  const inMaxPrice = document.getElementById('inMaxPrice');
  const distChips = document.querySelectorAll('#distChipsGroup .chip-opt');
  const genderChips = document.querySelectorAll('#genderChipsGroup .chip-opt');
  const facItems = document.querySelectorAll('.fac-item');
  const btnReset = document.getElementById('btnReset');
  const btnApply = document.getElementById('btnApply');

  let kosSlider = null;
  const kosRangeContainer = document.querySelector('.range-container');
  const rangeHighlight = document.getElementById('rangeHighlight');
  const thumbLeft = document.getElementById('thumbLeft');
  const thumbRight = document.getElementById('thumbRight');

  const initSlider = window.createRangeSlider || (window.KM && window.KM.createRangeSlider);
  if (typeof initSlider === 'function' && kosRangeContainer && rangeHighlight && thumbLeft && thumbRight) {
    kosSlider = initSlider({
      container: kosRangeContainer,
      highlight: rangeHighlight,
      thumbLeft: thumbLeft,
      thumbRight: thumbRight,
      inputMin: inMinPrice,
      inputMax: inMaxPrice,
      min: 0,
      max: 3000000,
      step: 50000,
    });
    const pMin = parseInt((inMinPrice?.value || '').replace(/[^\d]/g, ''), 10) || 500000;
    const pMax = parseInt((inMaxPrice?.value || '').replace(/[^\d]/g, ''), 10) || 1000000;
    kosSlider.setValues(pMin, pMax, false);
  }

  let selectedDist = '2';
  let selectedGenders = new Set(['putra', 'putri', 'campur']);
  let selectedFacs = new Set(['wifi']);

  // Distance chips single select
  distChips.forEach(chip => {
    chip.addEventListener('click', () => {
      distChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      selectedDist = chip.dataset.dist;
    });
  });

  // Gender chips multi select
  genderChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const g = chip.dataset.gender;
      if (selectedGenders.has(g)) {
        if (selectedGenders.size > 1) {
          selectedGenders.delete(g);
          chip.classList.remove('active');
        }
      } else {
        selectedGenders.add(g);
        chip.classList.add('active');
      }
    });
  });

  // Facility checkboxes toggle
  facItems.forEach(item => {
    item.addEventListener('click', () => {
      const f = item.dataset.fac;
      const box = item.querySelector('.checkbox');
      if (selectedFacs.has(f)) {
        selectedFacs.delete(f);
        box.classList.remove('checked');
      } else {
        selectedFacs.add(f);
        box.classList.add('checked');
      }
    });
  });

  // Reset
  btnReset.addEventListener('click', () => {
    if (kosSlider) {
      kosSlider.reset();
    } else {
      inMinPrice.value = 'Rp0';
      inMaxPrice.value = 'Rp3.000.000';
    }

    distChips.forEach(c => c.classList.toggle('active', c.dataset.dist === 'all'));
    selectedDist = 'all';

    genderChips.forEach(c => c.classList.add('active'));
    selectedGenders = new Set(['putra', 'putri', 'campur']);

    facItems.forEach(item => {
      item.querySelector('.checkbox').classList.remove('checked');
    });
    selectedFacs.clear();
  });

  // Back button: kembali ke halaman asal (beranda atau kos), fallback beranda
  const fromParam = new URLSearchParams(window.location.search).get('from');
  const backTarget = fromParam === 'kos' ? '/kos.html' : '/beranda.html';
  const backBtn = document.getElementById('filterKosBackBtn');
  if (backBtn) backBtn.setAttribute('href', backTarget);
  backBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    if (typeof goBack === 'function') {
      goBack(backTarget);
    } else {
      window.location.href = backTarget;
    }
  });

  // Apply
  btnApply.addEventListener('click', () => {
    sessionStorage.setItem('fk_dist', selectedDist);
    sessionStorage.setItem('fk_min', inMinPrice.value);
    sessionStorage.setItem('fk_max', inMaxPrice.value);
    sessionStorage.setItem('fk_genders', JSON.stringify(Array.from(selectedGenders)));
    sessionStorage.setItem('fk_facs', JSON.stringify(Array.from(selectedFacs)));
    location.href = '/kos.html';
  });
})();
