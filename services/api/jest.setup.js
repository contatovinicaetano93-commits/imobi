const path = require('path');
const envPath = path.join(__dirname, '.env.test');

console.log(`[Jest Setup] Loading environment from: ${envPath}`);
console.log(`[Jest Setup] File exists: ${require('fs').existsSync(envPath)}`);

require('dotenv').config({ path: envPath, override: true });

console.log(`[Jest Setup] DATABASE_URL: ${process.env.DATABASE_URL ? 'SET' : 'NOT SET'}`);
console.log(`[Jest Setup] REDIS_URL: ${process.env.REDIS_URL ? 'SET' : 'NOT SET'}`);
console.log(`[Jest Setup] NODE_ENV: ${process.env.NODE_ENV}`);
