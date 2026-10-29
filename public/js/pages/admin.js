import { api, nav, rp, esc, pesan } from '/js/api.js';
nav();
const msg = document.getElementById('msg'), tabel = document.getElementById('tabel');
const H = () => ({ 'x-admin-key': sessionStorage.getItem('km_admin') ?? '' });

async function muat() {
  try {
    const [daftar, mhs] = await Promise.all([
      api('/transaksi', { headers: H() }),
      api('/mahasiswa', { headers: H() })
    ]);
    tabel.hidden = false;
    tabel.innerHTML = `
      <h2>Transaksi</h2>
      <table><thead><tr><th>#</th><th>Mahasiswa</th><th>Barang</th><th>Jenis</th><th>Total</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${daftar.map((t) => `
        <tr><td>${t.id_transaksi}</td><td>${esc(t.nama_mahasiswa)}</td><td>${esc(t.nama_barang)}</td><td>${esc(t.jenis_transaksi)}</td><td>${rp(t.total_harga)}</td>
        <td><span class="badge ${esc(t.status)}">${esc(t.status)}</span></td>
        <td style="display:flex;gap:4px">${t.status === 'berjalan' ? `
          <button class="btn sm" data-selesai="${t.id_transaksi}">Selesai</button>
          <button class="btn sm ghost" data-batal="${t.id_transaksi}">Batal</button>` : '-'}</td></tr>`).join('') || '<tr><td colspan="7">Belum ada transaksi.</td></tr>'}</tbody></table>

      <h2 style="margin-top:2rem">Verifikasi Mahasiswa</h2>
      <table><thead><tr><th>#</th><th>Nama</th><th>Email</th><th>No HP</th><th>KTM</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${mhs.map((m) => `
        <tr><td>${m.id_mahasiswa}</td><td>${esc(m.nama)}</td><td>${esc(m.email)}</td><td>${esc(m.no_hp || '-')}</td><td>${esc(m.ktm || '-')}</td>
        <td><span class="badge ${esc(m.status_verifikasi)}">${esc(m.status_verifikasi)}</span></td>
        <td style="display:flex;gap:4px">
          ${m.status_verifikasi !== 'terverifikasi' ? `<button class="btn sm" data-verif="${m.id_mahasiswa}" data-status="terverifikasi">Verifikasi</button>` : ''}
          ${m.status_verifikasi !== 'ditolak' ? `<button class="btn sm ghost" data-verif="${m.id_mahasiswa}" data-status="ditolak">Tolak</button>` : ''}
        </td></tr>`).join('') || '<tr><td colspan="7">Belum ada data mahasiswa.</td></tr>'}</tbody></table>`;
    msg.textContent = '';
  } catch (e) { tabel.hidden = true; pesan(msg, e.message); }
}

document.getElementById('kunci').addEventListener('submit', (e) => {
  e.preventDefault(); sessionStorage.setItem('km_admin', e.target.k.value); muat();
});

tabel.addEventListener('click', async (e) => {
  const btnSelesai = e.target.dataset?.selesai;
  const btnBatal = e.target.dataset?.batal;
  const btnVerif = e.target.dataset?.verif;

  if (btnSelesai) {
    try {
      const r = await api('/transaksi/' + btnSelesai + '/selesai', { method: 'PATCH', headers: H() });
      pesan(msg, 'Transaksi #' + btnSelesai + ' selesai. Poin diberikan: ' + r.poin_didapat, 'ok');
      muat();
    } catch (err) { pesan(msg, err.message); }
  } else if (btnBatal) {
    if (!confirm('Batalkan transaksi ini? Barang akan kembali tersedia.')) return;
    try {
      await api('/transaksi/' + btnBatal + '/batal', { method: 'PATCH', headers: H() });
      pesan(msg, 'Transaksi #' + btnBatal + ' berhasil dibatalkan.', 'ok');
      muat();
    } catch (err) { pesan(msg, err.message); }
  } else if (btnVerif) {
    const status = e.target.dataset.status;
    try {
      await api('/mahasiswa/' + btnVerif + '/verifikasi', {
        method: 'PATCH',
        headers: H(),
        body: { status_verifikasi: status }
      });
      pesan(msg, 'Status mahasiswa #' + btnVerif + ' diubah menjadi ' + status, 'ok');
      muat();
    } catch (err) { pesan(msg, err.message); }
  }
});

if (sessionStorage.getItem('km_admin')) muat();
