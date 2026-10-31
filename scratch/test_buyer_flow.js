import { spawn } from 'node:child_process';
import { app } from '../src/server.js';
import { db } from '../src/db.js';

const server = app.listen(3000, () => {
  console.log('[SERVER] Running on http://localhost:3000');
});

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const userDataDir = 'C:\\Users\\asus\\.gemini\\antigravity\\brain\\ed4359a3-163b-4044-88ff-1e48e58af63e\\scratch\\edge_profile3';

const edgeProc = spawn(edgePath, [
  '--headless=new',
  '--remote-debugging-port=9222',
  `--user-data-dir=${userDataDir}`,
  'about:blank'
]);

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
  await new Promise(r => setTimeout(r, 1200));
  await send('Runtime.evaluate', {
    expression: `(async () => {
      document.getElementById('email').value = 'demo@kampus.ac.id';
      document.getElementById('pass').value = 'password123';
      document.getElementById('loginBtn').click();
    })()`,
    awaitPromise: true
  });
  await new Promise(r => setTimeout(r, 1500));

  // Find item with 3 photos
  const item3Photos = db.prepare("SELECT id_barang, nama_barang, foto FROM barang WHERE foto LIKE '[%' ORDER BY id_barang DESC LIMIT 1").get();
  console.log('[TEST] Checking item with 3 photos in DB:', item3Photos.id_barang, item3Photos.nama_barang);

  // Step 2: Open detail.html as buyer
  console.log('[TEST] Step 2: Open detail.html...');
  await send('Page.navigate', { url: `http://localhost:3000/detail.html?id=${item3Photos.id_barang}` });
  await new Promise(r => setTimeout(r, 2000));

  const detailState = await send('Runtime.evaluate', {
    expression: `(() => {
      const dots = document.querySelectorAll('#carouselDots .dot').length;
      const counter = document.getElementById('heroCounter')?.textContent;
      const thumbs = document.querySelectorAll('#thumbStrip .thumb-strip-item').length;
      const heroVisible = document.getElementById('heroImg')?.style.display;
      const prevVisible = document.getElementById('heroPrevBtn')?.style.display;
      const nextVisible = document.getElementById('heroNextBtn')?.style.display;

      // Click second thumb to switch photo
      const secondThumb = document.querySelectorAll('#thumbStrip .thumb-strip-item')[1];
      if (secondThumb) secondThumb.click();

      const newCounter = document.getElementById('heroCounter')?.textContent;

      return { dots, counter, thumbs, heroVisible, prevVisible, nextVisible, newCounter };
    })()`,
    returnByValue: true
  });
  console.log('[TEST] Detail page buyer view state:', JSON.stringify(detailState.result));

  // Step 3: Check modal checkout
  const modalState = await send('Runtime.evaluate', {
    expression: `(async () => {
      // Trigger checkout modal for beli or pinjam
      const btn = document.querySelector('#actionBtnContainer button');
      if (btn) btn.click();
      await new Promise(r => setTimeout(r, 800));

      const modalOpen = document.getElementById('checkoutModal')?.style.display;
      const modalPhotos = document.getElementById('modalPhotosCount')?.textContent;
      const modalThumbs = document.querySelectorAll('#modalGalleryRow div').length;

      return { modalOpen, modalPhotos, modalThumbs };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });
  console.log('[TEST] Checkout modal buyer view state:', JSON.stringify(modalState.result));

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
