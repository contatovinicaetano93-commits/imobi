const path = require('path');
const fs = require('fs');
const envPath = path.join(__dirname, '.env.test');

console.log(`[Jest Setup] Loading environment from: ${envPath}`);
console.log(`[Jest Setup] File exists: ${fs.existsSync(envPath)}`);

require('dotenv').config({ path: envPath, override: false });

console.log(`[Jest Setup] DATABASE_URL: ${process.env.DATABASE_URL ? 'SET' : 'NOT SET'}`);
console.log(`[Jest Setup] REDIS_URL: ${process.env.REDIS_URL ? 'SET' : 'NOT SET'}`);
console.log(`[Jest Setup] NODE_ENV: ${process.env.NODE_ENV}`);

// Set timeout for E2E tests - longer timeout for database initialization retries
jest.setTimeout(30000);
