const { api, nav, rp, esc, wajibLogin, pesan } = window.KM;
nav();
if (wajibLogin()) {
  const q = new URLSearchParams(location.search);
  const jenis = q.get('jenis') === 'beli' ? 'beli' : 'sewa';
  const form = document.getElementById('form'), msg = document.getElementById('msg');
  try {
    const b = await api('/barang/' + encodeURIComponent(q.get('id')));
    const harga = jenis === 'sewa' ? b.harga_sewa : b.harga_jual;
    if (b.status !== 'tersedia' || !harga) throw new Error('Barang ini tidak bisa di-' + jenis + '.');
    document.getElementById('judul').textContent = (jenis === 'sewa' ? 'Sewa ' : 'Beli ') + b.nama_barang;
    document.getElementById('info').textContent = jenis === 'sewa' ? rp(harga) + ' per hari' : rp(harga);
    document.getElementById('sewa').hidden = jenis === 'beli';
    // Tanggal lokal, bukan UTC: sebelum jam 07.00 WIB tanggal UTC masih kemarin.
    const hariIni = () => {
      const d = new Date();
      return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    };
    const durasi = () => Math.min(365, Math.max(1, Math.trunc(+form.durasi_sewa.value) || 1));
    form.tanggal_mulai.value = hariIni();
    const hitung = () => document.getElementById('total').textContent =
      rp(jenis === 'sewa' ? harga * durasi() : harga);
    form.addEventListener('input', hitung); hitung();
    form.hidden = false;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = e.submitter;
      if (btn) btn.disabled = true;
      const body = { id_barang: b.id_barang, jenis_transaksi: jenis, lokasi: form.lokasi.value, metode_pembayaran: form.metode_pembayaran.value };
      if (jenis === 'sewa') { body.durasi_sewa = durasi(); body.tanggal_mulai = form.tanggal_mulai.value; }
      try { await api('/transaksi', { method: 'POST', body }); location.href = '/profil.html'; }
      catch (err) { if (err.status === 401) return wajibLogin(); pesan(msg, err.message); if (btn) btn.disabled = false; }
    });
  } catch (e) { pesan(msg, e.message); }
}
