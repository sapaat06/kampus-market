(function(){
  const inMinPrice = document.getElementById('inMinPrice');
  const inMaxPrice = document.getElementById('inMaxPrice');
  const distChips = document.querySelectorAll('#distChipsGroup .chip-opt');
  const genderChips = document.querySelectorAll('#genderChipsGroup .chip-opt');
  const facItems = document.querySelectorAll('.fac-item');
  const btnReset = document.getElementById('btnReset');
  const btnApply = document.getElementById('btnApply');

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
    inMinPrice.value = 'Rp0';
    inMaxPrice.value = 'Rp2.000.000';

    distChips.forEach(c => c.classList.toggle('active', c.dataset.dist === 'all'));
    selectedDist = 'all';

    genderChips.forEach(c => c.classList.add('active'));
    selectedGenders = new Set(['putra', 'putri', 'campur']);

    facItems.forEach(item => {
      item.querySelector('.checkbox').classList.remove('checked');
    });
    selectedFacs.clear();
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
