const { api, nav, esc, rp, thumb, pesan } = window.KM;
nav();
const grid = document.getElementById('grid'), msg = document.getElementById('msg');
let kategori = null, items = [];

const kartu = (b) => `
  <a class="card" href="/barang.html?id=${b.id_barang}">${thumb(b)}
    <div class="card-body">
      <span class="tag">${esc(b.nama_kategori)} · ${esc(b.kondisi)}</span>
      <h3>${esc(b.nama_barang)}</h3>
      <p class="price">${b.harga_sewa ? rp(b.harga_sewa) + '<small>/hari</small>' : rp(b.harga_jual)}
        ${b.harga_sewa && b.harga_jual ? '<span class="alt">atau beli ' + rp(b.harga_jual) + '</span>' : ''}</p>
    </div>
  </a>`;

const gambar = () => {
  const q = document.getElementById('q').value.toLowerCase();
  const daftar = items.filter((b) => b.nama_barang.toLowerCase().includes(q));
  grid.innerHTML = daftar.length ? daftar.map(kartu).join('') : '<p class="empty">Belum ada barang yang cocok.</p>';
};

async function muat() {
  try { items = await api('/barang' + (kategori ? '?kategori=' + kategori : '')); gambar(); }
  catch (e) { pesan(msg, e.message); }
}

try {
  const semua = [{ id_kategori: null, nama_kategori: 'Semua' }, ...(await api('/kategori'))];
  const chips = document.getElementById('chips');
  chips.innerHTML = semua.map((k) =>
    `<button class="chip" data-k="${k.id_kategori ?? ''}" aria-pressed="${k.id_kategori === null}">${esc(k.nama_kategori)}</button>`).join('');
  chips.addEventListener('click', (e) => {
    const c = e.target.closest('.chip'); if (!c) return;
    kategori = c.dataset.k || null;
    chips.querySelectorAll('.chip').forEach((x) => x.setAttribute('aria-pressed', x === c));
    muat();
  });
} catch (e) { pesan(msg, e.message); }
document.getElementById('q').addEventListener('input', gambar);
muat();
