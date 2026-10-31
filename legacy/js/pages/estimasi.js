const { api, nav, rp, esc, wajibLogin, pesan } = window.KM;
nav();
if (wajibLogin()) {
  const msg = document.getElementById('msg'), hasil = document.getElementById('hasil'), form = document.getElementById('form');
  try {
    const items = await api('/barang');
    document.getElementById('barang').innerHTML = items.map((b) => `<option value="${b.id_barang}">${esc(b.nama_barang)} (${esc(b.kondisi)})</option>`).join('');
  } catch (e) { pesan(msg, e.message); }
  form.addEventListener('submit', async (e) => {
    e.preventDefault(); msg.textContent = '';
    const f = Object.fromEntries(new FormData(form));
    try {
      const r = await api('/estimasi', { method: 'POST', body: { ...f, id_barang: +f.id_barang, harga_acuan: +f.harga_acuan } });
      hasil.hidden = false;
      hasil.innerHTML = `Harga rekomendasi<br><strong>${rp(r.harga_rekomendasi)}</strong> per ${r.per}<br><small>Kondisi ${esc(r.kondisi)}, faktor ${r.faktor_kondisi}</small>`;
    } catch (err) { hasil.hidden = true; pesan(msg, err.message); }
  });
}
