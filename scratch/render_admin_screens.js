import { spawn } from 'node:child_process';
import { app } from '../src/server.js';
import { db } from '../src/db.js';
import fs from 'node:fs';

const server = app.listen(3002, () => {
  console.log('[SERVER] Running on http://localhost:3002');
});

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const userDataDir = 'scratch/edge_admin_profile';

const edgeProc = spawn(edgePath, [
  '--headless=new',
  '--remote-debugging-port=9223',
  `--user-data-dir=${userDataDir}`,
  'about:blank'
]);

async function run() {
  await new Promise(r => setTimeout(r, 2000));
  
  const ver = await fetch('http://127.0.0.1:9223/json/list').then(r => r.json());
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

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 360,
    height: 800,
    deviceScaleFactor: 1,
    mobile: true
  });

  // 1. Navigate to admin.html (Lock screen)
  await send('Page.navigate', { url: 'http://localhost:3002/admin.html' });
  await new Promise(r => setTimeout(r, 1500));

  let shot = await send('Page.captureScreenshot');
  fs.writeFileSync('docs/desain-potong/admin/render-lock.png', Buffer.from(shot.result.data, 'base64'));
  console.log('Saved render-lock.png');

  // 2. Unlock with ADMIN_KEY
  await send('Runtime.evaluate', {
    expression: `
      sessionStorage.setItem('km_admin', '29263743a5feb78a3ce09ed0a52a65a8');
      location.reload();
    `
  });
  await new Promise(r => setTimeout(r, 1500));

  shot = await send('Page.captureScreenshot');
  fs.writeFileSync('docs/desain-potong/admin/render-beranda.png', Buffer.from(shot.result.data, 'base64'));
  console.log('Saved render-beranda.png');

  // 3. Tab Verifikasi
  await send('Runtime.evaluate', {
    expression: `document.querySelector('.admin-bottom-nav [data-tab="verifikasi"]').click();`
  });
  await new Promise(r => setTimeout(r, 500));
  shot = await send('Page.captureScreenshot');
  fs.writeFileSync('docs/desain-potong/admin/render-verifikasi.png', Buffer.from(shot.result.data, 'base64'));
  console.log('Saved render-verifikasi.png');

  // 4. Tab Green Point
  await send('Runtime.evaluate', {
    expression: `document.querySelector('.admin-bottom-nav [data-tab="greenpoint"]').click();`
  });
  await new Promise(r => setTimeout(r, 500));
  shot = await send('Page.captureScreenshot');
  fs.writeFileSync('docs/desain-potong/admin/render-greenpoint.png', Buffer.from(shot.result.data, 'base64'));
  console.log('Saved render-greenpoint.png');

  // 5. Tab Moderasi
  await send('Runtime.evaluate', {
    expression: `document.querySelector('.admin-bottom-nav [data-tab="moderasi"]').click();`
  });
  await new Promise(r => setTimeout(r, 500));
  shot = await send('Page.captureScreenshot');
  fs.writeFileSync('docs/desain-potong/admin/render-moderasi.png', Buffer.from(shot.result.data, 'base64'));
  console.log('Saved render-moderasi.png');

  // 6. Tab Akun
  await send('Runtime.evaluate', {
    expression: `document.querySelector('.admin-bottom-nav [data-tab="akun"]').click();`
  });
  await new Promise(r => setTimeout(r, 500));
  shot = await send('Page.captureScreenshot');
  fs.writeFileSync('docs/desain-potong/admin/render-akun.png', Buffer.from(shot.result.data, 'base64'));
  console.log('Saved render-akun.png');

  // 7. Open Detail Mahasiswa
  await send('Runtime.evaluate', {
    expression: `
      document.querySelector('.admin-bottom-nav [data-tab="verifikasi"]').click();
      setTimeout(() => {
        const btn = document.querySelector('.btn-open-detail-mhs');
        if (btn) btn.click();
      }, 300);
    `
  });
  await new Promise(r => setTimeout(r, 800));
  shot = await send('Page.captureScreenshot');
  fs.writeFileSync('docs/desain-potong/admin/render-detail-mhs.png', Buffer.from(shot.result.data, 'base64'));
  console.log('Saved render-detail-mhs.png');

  ws.close();
  edgeProc.kill();
  server.close();
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  edgeProc.kill();
  server.close();
  process.exit(1);
});
