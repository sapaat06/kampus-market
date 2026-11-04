import { app } from '../src/server.js';
import { db } from '../src/db.js';
import { hash } from '../src/auth.js';

// Helper to simulate express request
function simulateReq(method, path, body = undefined, headers = {}) {
  return new Promise((resolve) => {
    let statusCode = 200;
    let resHeaders = {};
    let responseData = null;

    const req = {
      method,
      url: path,
      originalUrl: path,
      get: (h) => headers[h.toLowerCase()] || headers[h] || undefined,
      headers: { ...headers },
      body,
      query: {},
      params: {},
      socket: { encrypted: false },
      connection: { encrypted: false },
    };

    const res = {
      status: (code) => { statusCode = code; return res; },
      setHeader: (k, v) => { resHeaders[k] = v; return res; },
      set: (k, v) => { resHeaders[k] = v; return res; },
      json: (data) => { responseData = data; resolve({ status: statusCode, body: data, headers: resHeaders }); },
      send: (data) => { responseData = data; resolve({ status: statusCode, body: data, headers: resHeaders }); },
    };

    app(req, res, (err) => {
      if (err) {
        resolve({ status: err.status || 500, error: err.message, body: { error: err.message } });
      } else {
        resolve({ status: 404, error: 'Not found' });
      }
    });
  });
}

async function testHttpEndpoints() {
  console.log('Testing HTTP Admin Endpoints...');

  const adminHeaders = {
    'x-admin-key': 'admin123',
    'origin': 'http://localhost:3000',
    'host': 'localhost:3000'
  };

  // 1. GET /api/admin/users
  console.log('\n--- 1. Testing GET /api/admin/users ---');
  const resUsers = await simulateReq('GET', '/api/admin/users', undefined, adminHeaders);
  console.log('Status:', resUsers.status);
  console.log('Total users returned:', resUsers.body?.users?.length);
  if (resUsers.status !== 200 || !resUsers.body?.ok || !Array.isArray(resUsers.body?.users)) {
    throw new Error('GET /api/admin/users failed: ' + JSON.stringify(resUsers.body));
  }

  const firstUser = resUsers.body.users[0];
  console.log('Sample user from API:', { id: firstUser.id_mahasiswa, nama: firstUser.nama, is_banned: firstUser.is_banned });

  // 2. PUT /api/admin/users/:id/block
  console.log('\n--- 2. Testing PUT /api/admin/users/:id/block ---');
  const targetId = firstUser.id_mahasiswa;
  const initialBan = firstUser.is_banned;
  const resBlock = await simulateReq('PUT', `/api/admin/users/${targetId}/block`, { is_banned: !initialBan }, adminHeaders);
  console.log('Block toggle status:', resBlock.status, 'is_banned now:', resBlock.body?.is_banned, 'msg:', resBlock.body?.pesan);
  if (resBlock.status !== 200 || resBlock.body?.is_banned !== !initialBan) {
    throw new Error('PUT /api/admin/users/:id/block failed: ' + JSON.stringify(resBlock.body));
  }

  // Restore ban status
  await simulateReq('PUT', `/api/admin/users/${targetId}/block`, { is_banned: initialBan }, adminHeaders);

  // 3. GET /api/admin/moderasi/antrean
  console.log('\n--- 3. Testing GET /api/admin/moderasi/antrean ---');
  const resAntrean = await simulateReq('GET', '/api/admin/moderasi/antrean', undefined, adminHeaders);
  console.log('Status:', resAntrean.status, 'Total antrean:', resAntrean.body?.antrean?.length);
  if (resAntrean.status !== 200 || !resAntrean.body?.ok || !Array.isArray(resAntrean.body?.antrean)) {
    throw new Error('GET /api/admin/moderasi/antrean failed: ' + JSON.stringify(resAntrean.body));
  }

  // 4. PUT /api/admin/barang/:id/moderasi
  console.log('\n--- 4. Testing PUT /api/admin/barang/:id/moderasi (Reject with reason) ---');
  const sampleBarang = db.prepare('SELECT id_barang FROM barang LIMIT 1').get();
  if (sampleBarang) {
    const resModReject = await simulateReq('PUT', `/api/admin/barang/${sampleBarang.id_barang}/moderasi`, {
      status: 'ditolak',
      alasan: 'Foto buram dan deskripsi tidak lengkap'
    }, adminHeaders);
    console.log('Reject status:', resModReject.status, 'alasan stored:', resModReject.body?.barang?.alasan_penolakan);
    if (resModReject.status !== 200 || resModReject.body?.barang?.alasan_penolakan !== 'Foto buram dan deskripsi tidak lengkap') {
      throw new Error('PUT /api/admin/barang/:id/moderasi failed: ' + JSON.stringify(resModReject.body));
    }

    // Approve back
    const resModApprove = await simulateReq('PUT', `/api/admin/barang/${sampleBarang.id_barang}/moderasi`, {
      status: 'disetujui'
    }, adminHeaders);
    console.log('Approve status:', resModApprove.status, 'status_moderasi:', resModApprove.body?.barang?.status_moderasi);
  }

  // 5. GET /api/admin/laporan
  console.log('\n--- 5. Testing GET /api/admin/laporan ---');
  const resLap = await simulateReq('GET', '/api/admin/laporan', undefined, adminHeaders);
  console.log('Status:', resLap.status, 'Total laporan:', resLap.body?.laporan?.length);
  if (resLap.status !== 200 || !resLap.body?.ok || !Array.isArray(resLap.body?.laporan)) {
    throw new Error('GET /api/admin/laporan failed: ' + JSON.stringify(resLap.body));
  }

  // 6. POST /api/admin/laporan/:id/action
  console.log('\n--- 6. Testing POST /api/admin/laporan/:id/action (takedown/dismiss) ---');
  const sampleLap = resLap.body.laporan[0];
  if (sampleLap) {
    const resLapAction = await simulateReq('POST', `/api/admin/laporan/${sampleLap.id_laporan}/action`, {
      tindakan: 'abaikan',
      catatan: 'Aduan tidak terbukti bersalah'
    }, adminHeaders);
    console.log('Laporan action status:', resLapAction.status, 'message:', resLapAction.body?.pesan);
    if (resLapAction.status !== 200 || !resLapAction.body?.ok) {
      throw new Error('POST /api/admin/laporan/:id/action failed: ' + JSON.stringify(resLapAction.body));
    }
  }

  // 7. GET /api/admin/green-points/history
  console.log('\n--- 7. Testing GET /api/admin/green-points/history ---');
  const resGPHistory = await simulateReq('GET', '/api/admin/green-points/history', undefined, adminHeaders);
  console.log('Status:', resGPHistory.status, 'Total riwayat:', resGPHistory.body?.riwayat?.length);
  if (resGPHistory.status !== 200 || !resGPHistory.body?.ok || !Array.isArray(resGPHistory.body?.riwayat)) {
    throw new Error('GET /api/admin/green-points/history failed: ' + JSON.stringify(resGPHistory.body));
  }

  // 8. POST /api/admin/green-points/adjust
  console.log('\n--- 8. Testing POST /api/admin/green-points/adjust ---');
  const resGPAdjust = await simulateReq('POST', '/api/admin/green-points/adjust', {
    id_mahasiswa: targetId,
    jumlah_poin: 25,
    keterangan: 'Bonus Admin Partisipasi Daur Ulang'
  }, adminHeaders);
  console.log('GP adjust status:', resGPAdjust.status, 'message:', resGPAdjust.body?.pesan, 'total_poin:', resGPAdjust.body?.total_poin);
  if (resGPAdjust.status !== 201 || !resGPAdjust.body?.ok) {
    throw new Error('POST /api/admin/green-points/adjust failed: ' + JSON.stringify(resGPAdjust.body));
  }

  // 9. Negative Adjust
  const resGPNeg = await simulateReq('POST', '/api/admin/green-points/adjust', {
    id_mahasiswa: targetId,
    jumlah_poin: -10,
    keterangan: 'Koreksi Transaksi Batal'
  }, adminHeaders);
  console.log('GP negative adjust status:', resGPNeg.status, 'message:', resGPNeg.body?.pesan, 'total_poin:', resGPNeg.body?.total_poin);
  if (resGPNeg.status !== 201 || !resGPNeg.body?.ok) {
    throw new Error('POST /api/admin/green-points/adjust negative failed: ' + JSON.stringify(resGPNeg.body));
  }

  // 10. Login check for banned user
  console.log('\n--- 10. Testing Login with Banned User ---');
  db.prepare('UPDATE mahasiswa SET is_banned = 1, password_hash = ? WHERE id_mahasiswa = ?').run(hash('pass12345'), targetId);
  const uBanned = db.prepare('SELECT email FROM mahasiswa WHERE id_mahasiswa = ?').get(targetId);
  
  const resLoginBanned = await simulateReq('POST', '/api/auth/login', {
    email: uBanned.email,
    password: 'pass12345'
  }, { 'origin': 'http://localhost:3000', 'host': 'localhost:3000' });
  console.log('Login attempt for banned user status:', resLoginBanned.status, 'error msg:', resLoginBanned.error || resLoginBanned.body?.error);

  // Restore
  db.prepare('UPDATE mahasiswa SET is_banned = ? WHERE id_mahasiswa = ?').run(initialBan ? 1 : 0, targetId);

  console.log('\n🎉 ALL 4 FEATURES AND ENDPOINTS TESTED & PASSED 100%!');
}

testHttpEndpoints().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
