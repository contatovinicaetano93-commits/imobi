import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export default async function globalSetup() {
  // Load .env.test manually
  const envTestPath = path.join(__dirname, '../.env.test');
  if (fs.existsSync(envTestPath)) {
    const envContent = fs.readFileSync(envTestPath, 'utf-8');
    envContent.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        const value = valueParts.join('=').replace(/^["']|["']$/g, '');
        process.env[key] = value;
      }
    });
  }

  // Ensure test database URL is set
  if (!process.env.DATABASE_URL_TEST) {
    throw new Error('DATABASE_URL_TEST is not set in .env.test');
  }

  console.log('[E2E Setup] Resetting test database...');
  try {
    execSync('pnpm exec prisma migrate reset --force --schema prisma/schema.prisma', {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL_TEST },
    });
    console.log('[E2E Setup] Database reset successful');
  } catch (error) {
    console.error('[E2E Setup] Database reset failed:', error);
    throw error;
  }
}
