import { api, nav, rp, esc, wajibLogin, pesan, logout } from '/js/api.js';
nav();

async function muatProfil() {
  if (!wajibLogin()) return;
  try {
    const m = await api('/saya');
    const tgl = (s) => esc(s ? String(s).slice(0, 10) : '-');
    document.getElementById('isi').innerHTML = `
      <h1>Halo, ${esc(m.nama)}</h1>
      <p class="tag">${esc(m.email)} · verifikasi ${esc(m.status_verifikasi)}</p>
      <div class="points"><strong>${m.green_points}</strong><span>Green Points</span></div>
      <div class="cols">
        <section><h2>Transaksi</h2><ul class="list" id="daftar-transaksi">${m.transaksi.map((t) => `
          <li style="display:flex;justify-content:space-between;align-items:center">
            <div>${esc(t.nama_barang)}<small>${esc(t.jenis_transaksi)} · ${rp(t.total_harga)} · ${tgl(t.tanggal_transaksi)}</small></div>
            <div style="display:flex;gap:8px;align-items:center">
              <span class="badge ${esc(t.status)}">${esc(t.status)}</span>
              ${t.status === 'berjalan' ? `<button class="btn sm ghost" data-batal="${t.id_transaksi}">Batalkan</button>` : ''}
            </div>
          </li>`).join('') || '<li>Belum ada transaksi.</li>'}</ul></section>
        <section><h2>Riwayat poin</h2><ul class="list">${m.riwayat_poin.map((p) => `
          <li><div>${esc(p.keterangan)}<small>${tgl(p.created_at)}</small></div><b>+${p.jumlah_poin}</b></li>`).join('') || '<li>Poin muncul setelah transaksi selesai.</li>'}</ul></section>
      </div>`;

    document.getElementById('daftar-transaksi')?.addEventListener('click', async (e) => {
      const idBatal = e.target.dataset?.batal;
      if (!idBatal) return;
      if (!confirm('Apakah Anda yakin ingin membatalkan transaksi ini?')) return;
      try {
        await api('/transaksi/' + idBatal + '/batal', { method: 'PATCH' });
        muatProfil();
      } catch (err) {
        pesan(document.getElementById('msg'), err.message);
      }
    });
  } catch (e) {
    e.status === 401 ? logout() : pesan(document.getElementById('msg'), e.message);
  }
}

muatProfil();
