/**
 * Environment Variable Validation
 * Runs at application startup to ensure all required and secure configs are set
 */

export function validateEnvironment(): void {
  const errors: string[] = [];

  // Critical secrets that must be set
  const jwtSecret = process.env['JWT_SECRET'];
  if (!jwtSecret) {
    errors.push('JWT_SECRET is not set');
  } else if (jwtSecret.length < 64) {
    errors.push(`JWT_SECRET must be at least 64 characters. Current length: ${jwtSecret.length}`);
  }

  const jwtRefreshSecret = process.env['JWT_REFRESH_SECRET'];
  if (!jwtRefreshSecret) {
    errors.push('JWT_REFRESH_SECRET is not set');
  } else if (jwtRefreshSecret.length < 64) {
    errors.push(`JWT_REFRESH_SECRET must be at least 64 characters. Current length: ${jwtRefreshSecret.length}`);
  }

  const encryptionSecret = process.env['ENCRYPTION_SECRET'];
  if (!encryptionSecret) {
    errors.push('ENCRYPTION_SECRET is not set');
  } else if (encryptionSecret.length < 32) {
    errors.push(`ENCRYPTION_SECRET must be at least 32 characters. Current length: ${encryptionSecret.length}`);
  }

  // Database configuration
  const databaseUrl = process.env['DATABASE_URL'];
  if (!databaseUrl) {
    errors.push('DATABASE_URL is not set');
  } else if (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
    errors.push('DATABASE_URL must be a PostgreSQL connection string (postgresql:// or postgres://)');
  }

  // Redis configuration
  const redisHost = process.env['REDIS_HOST'];
  if (!redisHost) {
    errors.push('REDIS_HOST is not set');
  }

  // CORS origin
  const corsOrigin = process.env['CORS_ORIGIN'];
  if (!corsOrigin) {
    errors.push('CORS_ORIGIN is not set');
  }

  // Node environment
  const nodeEnv = process.env['NODE_ENV'];
  if (!nodeEnv || !['development', 'staging', 'production'].includes(nodeEnv)) {
    errors.push('NODE_ENV must be set to one of: development, staging, production');
  }

  // Email configuration
  const emailSource = process.env['SENDGRID_API_KEY'] || process.env['SMTP_PASS'];
  if (!emailSource) {
    console.warn('⚠️  No email service configured (SENDGRID_API_KEY or SMTP_PASS). Emails will not be sent.');
  }

  // Firebase configuration
  const firebaseProjectId = process.env['FIREBASE_PROJECT_ID'];
  if (!firebaseProjectId) {
    console.warn('⚠️  FIREBASE_PROJECT_ID is not set. Push notifications will not work.');
  }

  // AWS S3 configuration
  const s3Bucket = process.env['S3_BUCKET'];
  if (!s3Bucket && process.env['NODE_ENV'] === 'production') {
    errors.push('S3_BUCKET must be set in production environment');
  }

  if (errors.length > 0) {
    console.error('❌ Environment validation failed:');
    errors.forEach(error => console.error(`  - ${error}`));
    process.exit(1);
  }

  console.log('✅ Environment validation passed');
}
