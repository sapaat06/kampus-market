let currentUser = null;
let allItems = [];
let activeFilter = 'semua';
let activeCategory = null;
let selectedItem = null;
let sewaDays = 1;

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Default SVG illustrations for known items
const ilustrasi = {
  kalkulator: `<svg viewBox="0 0 100 80" width="70" height="60"><rect x="10" y="5" width="50" height="62" rx="6" fill="#1E3A38"/><rect x="14" y="9" width="42" height="12" rx="3" fill="#C9E4DC"/><text x="52" y="19" font-size="7" fill="#1E3A38" text-anchor="end" font-family="monospace">1.618</text><g fill="#fff" opacity=".9"><rect x="14" y="25" width="8" height="6" rx="1"/><rect x="24" y="25" width="8" height="6" rx="1"/><rect x="34" y="25" width="8" height="6" rx="1"/><rect x="44" y="25" width="8" height="6" rx="1" fill="#F28C28"/></g></svg>`,
  buku: `<svg viewBox="0 0 100 80" width="60" height="70"><rect x="20" y="5" width="50" height="70" rx="6" fill="#0B7A68"/><rect x="66" y="5" width="6" height="70" fill="#fff" opacity=".9"/><line x1="28" y1="14" x2="58" y2="14" stroke="#fff" stroke-width="2" opacity=".7"/><line x1="28" y1="20" x2="58" y2="20" stroke="#fff" stroke-width="2" opacity=".7"/><text x="45" y="42" font-size="9" fill="#fff" text-anchor="middle" font-weight="bold">BUKU</text><text x="45" y="62" font-size="18" fill="#fff" text-anchor="middle" font-weight="bold">KULIAH</text></svg>`,
  laptop: `<svg viewBox="0 0 100 80" width="70" height="50"><rect x="15" y="12" width="70" height="45" rx="6" fill="#1E3A38"/><rect x="18" y="15" width="64" height="39" rx="4" fill="#BFE3DA"/><rect x="10" y="57" width="80" height="6" rx="3" fill="#1E3A38"/></svg>`,
  jaslab: `<svg viewBox="0 0 100 80" width="70" height="60"><rect x="25" y="15" width="50" height="55" rx="6" fill="#fff" stroke="#1E3A38" stroke-width="2"/><circle cx="50" cy="22" r="3" fill="#1E3A38"/><rect x="32" y="30" width="36" height="2" fill="#1E3A38"/><rect x="32" y="36" width="36" height="2" fill="#1E3A38"/><circle cx="20" cy="40" r="12" fill="none" stroke="#00917C" stroke-width="3"/><line x1="28" y1="48" x2="34" y2="54" stroke="#00917C" stroke-width="3"/></svg>`,
  umum: (title) => `<svg viewBox="0 0 100 80" width="70" height="60"><rect x="20" y="10" width="60" height="60" rx="14" fill="#DDF1EC"/><text x="50" y="47" font-size="24" fill="#00917C" text-anchor="middle" font-weight="bold">${(title || 'K').charAt(0)}</text></svg>`
};

function getSvg(title) {
  const t = (title || '').toLowerCase();
  if (t.includes('kalkulator') || t.includes('casio')) return ilustrasi.kalkulator;
  if (t.includes('kalkulus') || t.includes('buku') || t.includes('diktat') || t.includes('modul')) return ilustrasi.buku;
  if (t.includes('laptop') || t.includes('komputer') || t.includes('proyektor')) return ilustrasi.laptop;
  if (t.includes('jas') || t.includes('lab') || t.includes('kacamata')) return ilustrasi.jaslab;
  return ilustrasi.umum(title);
}

// Toast helper
export function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" stroke="#00917C" fill="none" stroke-width="2"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm-1 14l-4-4 1.4-1.4L11 13.2l5.6-5.6L18 9l-7 7z"/></svg> <span>${msg}</span>`;
  t.style.display = 'flex';
  setTimeout(() => { t.style.display = 'none'; }, 3200);
}

// Close any open modal
function closeModal() {
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
}

// Open specific modal
function openModal(id) {
  closeModal();
  const m = document.getElementById(id);
  if (m) m.classList.add('open');
}

// Load current user profile
async function muatUser() {
  try {
    const res = await fetch('/api/saya');
    if (res.ok) {
      currentUser = await res.json();
      const namaDepan = (currentUser.nama || '').split(' ')[0] || 'Teman';
      const elSapaan = document.getElementById('sapaanNama');
      if (elSapaan) elSapaan.textContent = `Halo, ${namaDepan}!`;
      updateProfilModal();
    } else {
      const elSapaan = document.getElementById('sapaanNama');
      if (elSapaan) elSapaan.innerHTML = 'Halo, Mahasiswa! <a href="/masuk.html" style="font-size:12px;color:#fff;text-decoration:underline;margin-left:6px">Masuk</a>';
    }
  } catch (e) {
    console.log('Belum login:', e);
  }
}

// Update profile modal content
function updateProfilModal() {
  const c = document.getElementById('profilContent');
  if (!c) return;
  if (!currentUser) {
    c.innerHTML = `
      <div style="text-align:center;padding:20px 0">
        <p style="font-size:14px;color:#7A8583;margin-bottom:14px">Anda belum masuk ke akun mahasiswa.</p>
        <button class="modal-btn" id="btnLoginSekarang">Masuk Sekarang</button>
      </div>`;
    document.getElementById('btnLoginSekarang')?.addEventListener('click', () => { location.href = '/masuk.html'; });
    return;
  }

  const txList = (currentUser.transaksi || []).map(t => `
    <div style="background:#F7F9F8;border:1px solid #E3E8E7;border-radius:12px;padding:10px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">
      <div>
        <div style="font-size:13px;font-weight:700;color:#1E3A38">${escHtml(t.nama_barang)}</div>
        <div style="font-size:11px;color:#7A8583">${escHtml(t.jenis_transaksi.toUpperCase())} · Rp${Number(t.total_harga).toLocaleString('id-ID')}</div>
      </div>
      <div style="display:flex;gap:6px;align-items:center">
        <span style="font-size:10px;font-weight:700;padding:3px 8px;border-radius:999px;background:${t.status==='berjalan'?'#FFF0DB':(t.status==='selesai'?'#DDF1EC':'#EDEAF7')};color:${t.status==='berjalan'?'#A65A00':(t.status==='selesai'?'#00917C':'#7A8583')}">${escHtml(t.status)}</span>
        ${t.status === 'berjalan' ? `<button class="btn-batal-tx" data-id="${t.id_transaksi}" style="border:none;background:#F4F7F6;color:#D64545;font-size:11px;font-weight:700;padding:4px 8px;border-radius:6px;cursor:pointer">Batal</button>` : ''}
      </div>
    </div>
  `).join('') || '<div style="font-size:12px;color:#7A8583;text-align:center;padding:10px 0">Belum ada transaksi.</div>';

  c.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;padding-bottom:12px;border-bottom:1px solid #E8ECEB">
      <div style="width:48px;height:48px;border-radius:50%;background:#00917C;color:#fff;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700">
        ${escHtml((currentUser.nama || 'M').charAt(0))}
      </div>
      <div style="flex:1">
        <div style="font-size:15px;font-weight:700;color:#1E3A38">${escHtml(currentUser.nama)}</div>
        <div style="font-size:12px;color:#7A8583">${escHtml(currentUser.email)}</div>
        <span style="display:inline-block;margin-top:4px;font-size:10px;font-weight:700;background:#DDF1EC;color:#00917C;padding:2px 8px;border-radius:999px">✓ ${escHtml(currentUser.status_verifikasi)}</span>
      </div>
    </div>
    <div style="display:flex;justify-content:space-between;background:#FFF0DB;border-radius:12px;padding:12px 14px;margin-top:6px">
      <div>
        <div style="font-size:11px;color:#A65A00;font-weight:600">Saldo Green Points</div>
        <div style="font-size:22px;font-weight:800;color:#F28C28">${currentUser.green_points || 0} <span style="font-size:12px;font-weight:600">Poin</span></div>
      </div>
      <svg viewBox="0 0 24 24" width="28" height="28" stroke="#F28C28" fill="none" stroke-width="1.8"><path d="M20 4c-8 0-14 4-14 10a6 6 0 0 0 6 6c6 0 8-6 8-16Z"/><path d="M4 21c2-5 6-8 12-10"/></svg>
    </div>
    <div style="margin-top:8px">
      <div style="font-size:13px;font-weight:700;color:#1E3A38;margin-bottom:8px">Riwayat Transaksi Saya</div>
      <div style="max-height:160px;overflow-y:auto">${txList}</div>
    </div>
    <button id="btnLogout" class="modal-btn ghost" style="color:#D64545;border:1px solid #D64545;margin-top:10px">Keluar (Logout)</button>
  `;

  document.getElementById('btnLogout')?.addEventListener('click', async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
      localStorage.removeItem('km_token');
      location.href = '/masuk.html';
    } catch {
      location.reload();
    }
  });

  document.querySelectorAll('.btn-batal-tx').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      if (!confirm('Apakah Anda yakin ingin membatalkan transaksi ini?')) return;
      try {
        const r = await fetch('/api/transaksi/' + id + '/batal', { method: 'PATCH' });
        if (r.ok) {
          showToast('Transaksi #' + id + ' berhasil dibatalkan');
          muatUser();
          muatBarang();
        } else {
          const e = await r.json();
          alert(e.error || 'Gagal membatalkan transaksi');
        }
      } catch {
        alert('Gagal menghubungi server');
      }
    });
  });
}

// Load goods from database
async function muatBarang() {
  try {
    const res = await fetch('/api/barang');
    if (res.ok) {
      const dbItems = await res.json();
      const colors = ['lav', 'mint', 'peach'];
      allItems = dbItems.map((b, idx) => {
        const isSewa = Boolean(b.harga_sewa);
        const harga = isSewa ? b.harga_sewa : b.harga_jual;
        return {
          id: b.id_barang,
          title: b.nama_barang,
          deskripsi: b.deskripsi || 'Kondisi barang ' + b.kondisi + ', siap pakai untuk kuliah.',
          badge: isSewa ? 'Sewa' : 'Beli',
          kondisi: b.kondisi,
          harga: harga,
          hargaText: 'Rp' + Number(harga).toLocaleString('id-ID'),
          unitText: isSewa ? '/hari' : '',
          color: colors[idx % colors.length],
          distText: (350 + (idx * 150)) + ' m dari kamu',
          kategori: b.id_kategori,
          namaKategori: b.nama_kategori
        };
      });
      renderCards();
    }
  } catch (e) {
    console.error('Gagal memuat barang:', e);
  }
}

// Filter and render cards into .grid
function renderCards(keyword = '') {
  const grid = document.getElementById('gridBarang');
  if (!grid) return;

  const kw = keyword.toLowerCase().trim();
  let filtered = allItems.filter(item => {
    // text search
    const matchText = !kw || item.title.toLowerCase().includes(kw) || item.deskripsi.toLowerCase().includes(kw);
    // chip filter
    const matchType = activeFilter === 'semua' || item.badge.toLowerCase() === activeFilter.toLowerCase();
    // category filter
    const matchCat = !activeCategory || String(item.kategori) === String(activeCategory);
    return matchText && matchType && matchCat;
  });

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:30px 10px;color:#7A8583">
        <svg viewBox="0 0 24 24" width="40" height="40" stroke="#7A8583" fill="none" stroke-width="1.8"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <div style="margin-top:8px;font-size:14px;font-weight:700;color:#1E3A38">Tidak ada barang</div>
        <div style="font-size:12px;margin-top:4px">Coba pilih filter lain atau kata kunci pencarian berbeda.</div>
      </div>`;
    return;
  }

  grid.innerHTML = filtered.map(item => `
    <div class="card card-item" data-id="${item.id}" style="cursor:pointer">
      <div class="img ${escHtml(item.color)}">
        <div class="badge ${escHtml(item.badge.toLowerCase())}">${escHtml(item.badge)}</div>
        ${getSvg(item.title)}
      </div>
      <div class="body">
        <div class="title">${escHtml(item.title)}</div>
        <div class="price orange">${escHtml(item.hargaText)}<span class="unit orange">${escHtml(item.unitText)}</span></div>
        <div class="dist">
          <svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          ${escHtml(item.distText)}
        </div>
      </div>
    </div>
  `).join('');

  // Attach click listener for detail
  document.querySelectorAll('.card-item').forEach(c => {
    c.addEventListener('click', () => {
      const id = Number(c.dataset.id);
      window.location.href = `/detail.html?id=${id}`;
    });
  });
}

// Open Detail & Order Modal
function openDetailModal(item) {
  sewaDays = 1;
  const c = document.getElementById('detailContent');
  if (!c) return;

  const isSewa = item.badge.toLowerCase() === 'sewa';
  c.innerHTML = `
    <div style="text-align:center;padding:10px 0;background:#F4F7F6;border-radius:18px">
      <div style="display:inline-block">${getSvg(item.title)}</div>
    </div>
    <div>
      <div style="display:flex;justify-content:space-between;align-items:baseline">
        <span class="badge ${escHtml(item.badge.toLowerCase())}">${escHtml(item.badge)}</span>
        <span style="font-size:11px;color:#7A8583">Kondisi: <b>${escHtml(item.kondisi)}</b></span>
      </div>
      <h3 style="font-size:18px;color:#1E3A38;margin-top:6px">${escHtml(item.title)}</h3>
      <p style="font-size:12px;color:#7A8583;margin-top:4px;line-height:1.4">${escHtml(item.deskripsi)}</p>
    </div>

    ${isSewa ? `
      <div>
        <label class="modal-label">Pilih Durasi Sewa:</label>
        <div style="display:flex;gap:6px" id="durasiGroup">
          <button class="chip active durasi-btn" data-days="1">1 Hari</button>
          <button class="chip idle durasi-btn" data-days="3">3 Hari</button>
          <button class="chip idle durasi-btn" data-days="7">7 Hari</button>
          <button class="chip idle durasi-btn" data-days="14">14 Hari</button>
        </div>
      </div>
    ` : ''}

    <div>
      <label class="modal-label">Lokasi Pengambilan / Serah Terima:</label>
      <select id="orderLokasi" class="modal-input">
        <option>Perpustakaan Pusat</option>
        <option>Kantin Kampus</option>
        <option>Gedung Fakultas</option>
        <option>Gerbang Utama</option>
      </select>
    </div>

    <div>
      <label class="modal-label">Metode Pembayaran:</label>
      <select id="orderMetode" class="modal-input">
        <option value="qris">QRIS (Otomatis)</option>
        <option value="cash">Tunai saat bertemu (COD)</option>
      </select>
    </div>

    <div style="background:#F7F9F8;border:1px solid #E3E8E7;border-radius:12px;padding:12px;display:flex;justify-content:space-between;align-items:center;margin-top:4px">
      <div>
        <div style="font-size:11px;color:#7A8583">Total Pembayaran</div>
        <div style="font-size:18px;font-weight:800;color:#F28C28" id="totalHargaText">${item.hargaText}</div>
      </div>
      <button id="btnProsesOrder" class="modal-btn ${isSewa ? 'orange' : ''}" style="width:auto;padding:0 20px;margin-top:0">
        ${isSewa ? 'Sewa Sekarang' : 'Beli Sekarang'}
      </button>
    </div>
  `;

  // Attach duration buttons
  if (isSewa) {
    document.querySelectorAll('.durasi-btn').forEach(b => {
      b.addEventListener('click', () => {
        document.querySelectorAll('.durasi-btn').forEach(btn => {
          btn.classList.remove('active');
          btn.classList.add('idle');
        });
        b.classList.add('active');
        b.classList.remove('idle');
        sewaDays = Number(b.dataset.days);
        const total = item.harga * sewaDays;
        document.getElementById('totalHargaText').textContent = 'Rp' + Number(total).toLocaleString('id-ID');
      });
    });
  }

  // Attach submit order button
  document.getElementById('btnProsesOrder')?.addEventListener('click', async () => {
    if (!currentUser) {
      alert('Silakan login terlebih dahulu untuk menyewa atau membeli barang.');
      location.href = '/masuk.html';
      return;
    }

    const lokasi = document.getElementById('orderLokasi')?.value || 'Perpustakaan';
    const metode = document.getElementById('orderMetode')?.value || 'qris';
    const btn = document.getElementById('btnProsesOrder');
    btn.disabled = true;
    btn.textContent = 'Memproses...';

    try {
      const res = await fetch('/api/transaksi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_barang: item.id,
          jenis_transaksi: item.badge.toLowerCase(),
          durasi_sewa: isSewa ? sewaDays : undefined,
          lokasi: lokasi,
          metode_pembayaran: metode
        })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Gagal membuat transaksi');
        btn.disabled = false;
        btn.textContent = isSewa ? 'Sewa Sekarang' : 'Beli Sekarang';
        return;
      }

      closeModal();
      showToast('Transaksi berhasil dibuat! Cek di menu Profil.');
      muatUser();
      muatBarang();
    } catch {
      alert('Gagal menghubungi server');
      btn.disabled = false;
      btn.textContent = isSewa ? 'Sewa Sekarang' : 'Beli Sekarang';
    }
  });

  openModal('modalDetail');
}

// Initial setup on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  muatUser();
  muatBarang();

  // Kos search bar & category click
  const sKos = document.getElementById('searchKos');
  if (sKos) {
    sKos.addEventListener('click', () => { location.href = '/kos.html'; });
    sKos.parentElement?.addEventListener('click', () => { location.href = '/kos.html'; });
  }
  document.getElementById('catKos')?.addEventListener('click', (e) => {
    e.stopPropagation();
    location.href = '/kos.html';
  });

  // Search input listeners
  const s1 = document.getElementById('searchKos');
  const s2 = document.getElementById('searchBarang');
  [s1, s2].forEach(input => {
    if (!input) return;
    input.addEventListener('input', (e) => {
      renderCards(e.target.value);
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.value.trim()) {
        location.href = '/cari.html?q=' + encodeURIComponent(e.target.value.trim());
      }
    });
  });

  // Filter chips (Semua, Beli, Sewa, Pinjam)
  const chips = document.querySelectorAll('#filterChips .chip');
  chips.forEach(chip => {
    chip.style.cursor = 'pointer';
    chip.addEventListener('click', () => {
      chips.forEach(c => { c.classList.remove('active'); c.classList.add('idle'); });
      chip.classList.add('active');
      chip.classList.remove('idle');
      activeFilter = chip.textContent.trim().toLowerCase();
      renderCards(s2?.value || '');
    });
  });

  // Category buttons
  const catBoxes = document.querySelectorAll('#categoryList .cat');
  catBoxes.forEach(cat => {
    cat.style.cursor = 'pointer';
    cat.addEventListener('click', () => {
      const catId = cat.dataset.cat;
      if (activeCategory === catId) {
        activeCategory = null;
        cat.querySelector('.box').style.outline = 'none';
      } else {
        catBoxes.forEach(c => c.querySelector('.box').style.outline = 'none');
        activeCategory = catId;
        cat.querySelector('.box').style.outline = '2px solid #00917C';
      }
      renderCards(s2?.value || '');
    });
  });

  // Close modals
  document.querySelectorAll('.modal-close, .modal-backdrop').forEach(el => {
    el.addEventListener('click', closeModal);
  });

  // Bottom Navigation buttons
  document.getElementById('navBeranda')?.addEventListener('click', () => {
    closeModal();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  document.getElementById('navTambah')?.addEventListener('click', () => {
    location.href = '/unggah.html';
  });

  document.getElementById('navChat')?.addEventListener('click', () => {
    location.href = '/chat.html';
  });

  document.getElementById('navProfil')?.addEventListener('click', () => {
    location.href = '/profil.html';
  });

  // Header Bell (Notifications)
  document.getElementById('btnNotif')?.addEventListener('click', () => {
    openModal('modalNotif');
  });

  // Campus location switcher
  document.getElementById('btnKampus')?.addEventListener('click', () => {
    openModal('modalKampus');
  });

  document.querySelectorAll('.campus-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      const txt = opt.dataset.name;
      document.getElementById('txtKampus').textContent = txt;
      closeModal();
      showToast('Kampus diubah ke: ' + txt);
    });
  });

  // Tambah Barang Submit
  document.getElementById('formTambahBarang')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nama = document.getElementById('tbNama').value.trim();
    const kat = Number(document.getElementById('tbKategori').value);
    const jenis = document.getElementById('tbJenis').value;
    const kondisi = document.getElementById('tbKondisi').value;
    const harga = Number(document.getElementById('tbHarga').value);
    const deskripsi = document.getElementById('tbDeskripsi').value.trim();

    if (!nama || !harga || harga <= 0) {
      alert('Mohon isi nama barang dan harga dengan benar.');
      return;
    }

    const payload = {
      nama_barang: nama,
      id_kategori: kat,
      kondisi: kondisi,
      deskripsi: deskripsi || undefined
    };
    if (jenis === 'sewa') payload.harga_sewa = harga;
    else payload.harga_jual = harga;

    try {
      const res = await fetch('/api/barang', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Gagal menambahkan barang');
        return;
      }
      closeModal();
      showToast('Barang berhasil ditambahkan ke katalog!');
      document.getElementById('formTambahBarang').reset();
      muatBarang();
    } catch {
      alert('Gagal menghubungi server');
    }
  });

  // Chat send message simulation
  document.getElementById('formChatKirim')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const inp = document.getElementById('chatInput');
    const msg = (inp?.value || '').trim();
    if (!msg) return;

    const chatBody = document.getElementById('chatMessages');
    const bubble = document.createElement('div');
    bubble.style.cssText = 'align-self:flex-end;background:#00917C;color:#fff;padding:8px 12px;border-radius:12px;font-size:12px;max-width:80%;margin-bottom:6px';
    bubble.textContent = msg;
    chatBody.appendChild(bubble);
    inp.value = '';
    chatBody.scrollTop = chatBody.scrollHeight;

    // Simulate auto reply after 1s
    setTimeout(() => {
      const reply = document.createElement('div');
      reply.style.cssText = 'align-self:flex-start;background:#F4F7F6;color:#1E3A38;padding:8px 12px;border-radius:12px;font-size:12px;max-width:80%;margin-bottom:6px';
      reply.textContent = 'Siap kak, kita ketemu di lokasi sesuai perjanjian ya!';
      chatBody.appendChild(reply);
      chatBody.scrollTop = chatBody.scrollHeight;
    }, 1000);
  });
});
