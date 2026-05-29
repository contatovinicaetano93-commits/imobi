import { execSync } from 'child_process';

export default async function globalSetup() {
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
