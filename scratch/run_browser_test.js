import { spawn } from 'node:child_process';
import { app } from '../src/server.js';
import { db } from '../src/db.js';

// 1. Start server on 3000
const server = app.listen(3000, () => {
  console.log('[SERVER] Running on http://localhost:3000');
});

// 2. Launch Edge with remote debugging
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const userDataDir = 'C:\\Users\\asus\\.gemini\\antigravity\\brain\\ed4359a3-163b-4044-88ff-1e48e58af63e\\scratch\\edge_profile';

const edgeProc = spawn(edgePath, [
  '--headless=new',
  '--remote-debugging-port=9222',
  `--user-data-dir=${userDataDir}`,
  'about:blank'
]);

const consoleLogs = [];
const serverErrors = [];

process.on('uncaughtException', (err) => {
  serverErrors.push(`[UNCAUGHT] ${err.stack || err.message}`);
});

async function run() {
  await new Promise(r => setTimeout(r, 2000));
  
  // Connect to Edge CDP
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
      consoleLogs.push(`[CONSOLE ${msg.params.type.toUpperCase()}] ${text}`);
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      consoleLogs.push(`[PAGE ERROR] ${msg.params.exceptionDetails.text} ${msg.params.exceptionDetails.exception?.description || ''}`);
    }
    if (msg.method === 'Network.requestWillBeSent') {
      consoleLogs.push(`[NET REQ] ${msg.params.request.method} ${msg.params.request.url}`);
    }
    if (msg.method === 'Network.responseReceived') {
      consoleLogs.push(`[NET RESP] ${msg.params.response.status} ${msg.params.response.url}`);
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
  await send('Network.enable');

  // Step 1: Login via masuk.html
  console.log('[FLOW] Step 1: Login via masuk.html...');
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
  await new Promise(r => setTimeout(r, 2000));

  // Step 2: Open unggah.html
  console.log('[FLOW] Step 2: Buka unggah.html...');
  await send('Page.navigate', { url: 'http://localhost:3000/unggah.html' });
  await new Promise(r => setTimeout(r, 1500));

  // Step 3: Pilih foto & isi form
  console.log('[FLOW] Step 3: Pilih foto & isi data barang...');
  const testBase64Png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

  const fillResult = await send('Runtime.evaluate', {
    expression: `(async () => {
      document.getElementById('namaBarang').value = 'Kalkulator Casio FX-991EX Baru';
      document.getElementById('hargaInput').value = '7500';
      document.getElementById('deskripsiInput').value = 'Barang mulus original untuk perkuliahan teknik';

      // Simulate file select
      const b64 = '${testBase64Png}';
      const bin = atob(b64);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      const file = new File([arr], 'kalkulator.png', { type: 'image/png' });

      const dt = new DataTransfer();
      dt.items.add(file);
      const photoInput = document.getElementById('photoInput');
      photoInput.files = dt.files;
      photoInput.dispatchEvent(new Event('change', { bubbles: true }));

      // Wait for image to compress and preview
      await new Promise(r => setTimeout(r, 1000));

      // Step 4: Submit form
      const submitBtn = document.getElementById('submitBtn');
      submitBtn.click();

      // Wait for API response
      await new Promise(r => setTimeout(r, 2500));
      return 'submitted_ok';
    })()`,
    awaitPromise: true
  });

  console.log('[FLOW] Submit result:', JSON.stringify(fillResult));
  await new Promise(r => setTimeout(r, 2000));

  // Step 5: Cek DB
  console.log('[FLOW] Step 5: Cek data masuk DB...');
  const latestItem = db.prepare("SELECT id_barang, nama_barang, harga_sewa, harga_jual, kondisi, status, lokasi, substr(foto, 1, 30) as foto_preview FROM barang ORDER BY id_barang DESC LIMIT 1").get();
  console.log('[DB RESULT]', latestItem);

  // Clean up
  edgeProc.kill();
  server.close();

  // Print results
  console.log('\n--- CONSOLE / SERVER ERRORS ---');
  const actualErrors = consoleLogs.filter(l => l.includes('401') || l.includes('400') || l.includes('500') || l.includes('PAGE ERROR') || l.includes('ERROR'));
  if (actualErrors.length === 0 && serverErrors.length === 0) {
    console.log('Tidak ada error.');
  } else {
    actualErrors.forEach(c => console.log(c));
    serverErrors.forEach(s => console.log(s));
  }
  process.exit(0);
}

run().catch(err => {
  console.error('[FATAL]', err);
  edgeProc.kill();
  server.close();
  process.exit(1);
});
