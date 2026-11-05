// Idempotent migration runner – jalankan sebelum deploy:
//   TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... node migrate.js
// atau via: npm run migrate
import { initDb } from './src/db.js';

await initDb();
console.log('migrate ok');
process.exit(0);
