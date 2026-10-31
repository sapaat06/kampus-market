const { api, nav, esc, rp, thumb, pesan } = window.KM;
nav();
const id = new URLSearchParams(location.search).get('id');
try {
  const b = await api('/barang/' + encodeURIComponent(id));
  document.title = b.nama_barang + ' · Kampus Market';
  const bisa = b.status === 'tersedia';
  document.getElementById('isi').innerHTML = `
    <div class="detail">
      ${thumb(b)}
      <div>
        <span class="tag">${esc(b.nama_kategori)}</span>
        <h1>${esc(b.nama_barang)}</h1>
        <p>${esc(b.deskripsi ?? 'Tidak ada deskripsi.')}</p>
        <ul class="facts">
          <li>Kondisi: <b>${esc(b.kondisi)}</b></li>
          <li>Penjual: <b>${esc(b.nama_penjual)}</b></li>
          ${b.harga_sewa ? '<li>Sewa: <b>' + rp(b.harga_sewa) + ' per hari</b></li>' : ''}
          ${b.harga_jual ? '<li>Beli: <b>' + rp(b.harga_jual) + '</b></li>' : ''}
        </ul>
        <div class="actions">
          ${bisa && b.harga_sewa ? `<a class="btn" href="/transaksi.html?id=${b.id_barang}&jenis=sewa">Sewa</a>` : ''}
          ${bisa && b.harga_jual ? `<a class="btn ${b.harga_sewa ? 'ghost' : ''}" href="/transaksi.html?id=${b.id_barang}&jenis=beli">Beli</a>` : ''}
          ${bisa ? '' : '<span class="badge">Sedang ' + esc(b.status) + '</span>'}
        </div>
      </div>
    </div>`;
} catch (e) { pesan(document.getElementById('msg'), e.message); }
