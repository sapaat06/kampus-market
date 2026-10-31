import { spawn } from 'node:child_process';
import { app } from '../src/server.js';
import { db } from '../src/db.js';

const server = app.listen(3000, () => {
  console.log('[SERVER] Running on http://localhost:3000');
});

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const userDataDir = 'C:\\Users\\asus\\.gemini\\antigravity\\brain\\ed4359a3-163b-4044-88ff-1e48e58af63e\\scratch\\edge_profile2';

const edgeProc = spawn(edgePath, [
  '--headless=new',
  '--remote-debugging-port=9222',
  `--user-data-dir=${userDataDir}`,
  'about:blank'
]);

const consoleLogs = [];

async function run() {
  await new Promise(r => setTimeout(r, 2000));
  
  const ver = await fetch('http://127.0.0.1:9222/json/list').then(r => r.json());
  const page = ver[0];
  const ws = new WebSocket(page.webSocketDebuggerUrl);

  let id = 1;
  const pending = new Map();
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
    if (msg.method === 'Runtime.consoleAPICalled') {
      const text = msg.params.args.map(a => a.value || a.description || JSON.stringify(a)).join(' ');
      consoleLogs.push(`[CONSOLE] ${text}`);
    }
  };

  const send = (method, params = {}) => new Promise((resolve) => {
    const reqId = id++;
    pending.set(reqId, resolve);
    ws.send(JSON.stringify({ id: reqId, method, params }));
  });

  await new Promise(r => ws.onopen = r);
  await send('Page.enable');
  await send('Runtime.enable');

  // Step 1: Login
  await send('Page.navigate', { url: 'http://localhost:3000/masuk.html' });
  await new Promise(r => setTimeout(r, 1500));
  await send('Runtime.evaluate', {
    expression: `(async () => {
      document.getElementById('email').value = 'demo@kampus.ac.id';
      document.getElementById('pass').value = 'password123';
      document.getElementById('loginBtn').click();
    })()`,
    awaitPromise: true
  });
  await new Promise(r => setTimeout(r, 1500));

  // Step 2: Open unggah.html
  await send('Page.navigate', { url: 'http://localhost:3000/unggah.html' });
  await new Promise(r => setTimeout(r, 1500));

  // Test 2A: Submit without photo should show toast / validation
  const testNoPhoto = await send('Runtime.evaluate', {
    expression: `(async () => {
      document.getElementById('namaBarang').value = 'Tanpa Foto';
      document.getElementById('submitBtn').click();
      await new Promise(r => setTimeout(r, 300));
      const toast = document.getElementById('toastText')?.textContent;
      return toast;
    })()`,
    awaitPromise: true
  });
  console.log('[TEST 1] Validation without photo:', JSON.stringify(testNoPhoto));

  // Test 2B: Add 3 photos
  const b64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const test3Photos = await send('Runtime.evaluate', {
    expression: `(async () => {
      document.getElementById('namaBarang').value = 'Modul Fisika Dasar 3 Foto';
      document.getElementById('hargaInput').value = '6000';

      const bin = atob('${b64}');
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);

      // Create 3 files
      const f1 = new File([arr], 'foto1.png', { type: 'image/png' });
      const f2 = new File([arr], 'foto2.png', { type: 'image/png' });
      const f3 = new File([arr], 'foto3.png', { type: 'image/png' });

      const dt = new DataTransfer();
      dt.items.add(f1);
      dt.items.add(f2);
      dt.items.add(f3);

      const photoInput = document.getElementById('photoInput');
      photoInput.files = dt.files;
      photoInput.dispatchEvent(new Event('change', { bubbles: true }));

      // Wait for canvas compression of all 3 images
      await new Promise(r => setTimeout(r, 1200));

      const previews = document.getElementById('photoPreviewList').children.length;
      const uploadBoxDisplay = getComputedStyle(document.getElementById('uploadBox')).display;

      // Click submit
      document.getElementById('submitBtn').click();
      await new Promise(r => setTimeout(r, 2000));

      return { previews, uploadBoxDisplay };
    })()`,
    awaitPromise: true
  });
  console.log('[TEST 2] 3 photos state:', test3Photos.result?.value);

  // Step 3: Check DB
  const latest = db.prepare("SELECT id_barang, nama_barang, harga_sewa, foto FROM barang ORDER BY id_barang DESC LIMIT 1").get();
  console.log('[TEST 3] Latest DB item:', {
    id_barang: latest.id_barang,
    nama_barang: latest.nama_barang,
    harga_sewa: latest.harga_sewa,
    foto_is_array: latest.foto?.startsWith('['),
    foto_count: latest.foto?.startsWith('[') ? JSON.parse(latest.foto).length : 1
  });

  edgeProc.kill();
  server.close();
  process.exit(0);
}

run().catch(e => {
  console.error(e);
  edgeProc.kill();
  server.close();
  process.exit(1);
});
