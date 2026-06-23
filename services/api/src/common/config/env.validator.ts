function resolveAppUrl(config: Record<string, any>): string | undefined {
  if (config.APP_URL) return config.APP_URL;
  if (config.RAILWAY_PUBLIC_DOMAIN) return `https://${config.RAILWAY_PUBLIC_DOMAIN}`;
  return undefined;
}

export function validateEnvironment(config: Record<string, any>): string[] {
  const errorMessages: string[] = [];
  const nodeEnv = config.NODE_ENV || 'development';
  const isDev = nodeEnv === 'development' || nodeEnv === 'test' || nodeEnv === 'staging';
  const appUrl = resolveAppUrl(config);

  // Critical: DATABASE_URL always required
  if (!config.DATABASE_URL) {
    errorMessages.push('DATABASE_URL is required');
  }

  // Critical: JWT_SECRET must be set and non-empty (empty string allows token forgery)
  if (!config.JWT_SECRET || config.JWT_SECRET.trim() === '') {
    errorMessages.push('JWT_SECRET is required and must not be empty');
  }

  // Redis: validate either REDIS_URL or REDIS_HOST + REDIS_PORT
  const hasRedisUrl = !!config.REDIS_URL;
  const hasRedisHostPort = config.REDIS_HOST && config.REDIS_PORT;

  if (!hasRedisUrl && !hasRedisHostPort && !isDev) {
    console.warn(
      '[CONFIG] Redis not configured — API will start; add REDIS_URL for cache and job queues',
    );
  }

  // Email provider validation — only validate if email sending is explicitly configured
  const emailProvider = config.EMAIL_PROVIDER;
  if (emailProvider) {
    const emailProviderLower = emailProvider.toLowerCase();

    if (emailProviderLower === 'sendgrid' && !config.SENDGRID_API_KEY && !isDev) {
      errorMessages.push('SENDGRID_API_KEY is required when EMAIL_PROVIDER=sendgrid');
    }

    if (emailProviderLower === 'ses') {
      if (!config.AWS_REGION && !isDev) {
        errorMessages.push('AWS_REGION is required when EMAIL_PROVIDER=ses');
      }
      if (!config.AWS_ACCESS_KEY_ID && !isDev) {
        errorMessages.push('AWS_ACCESS_KEY_ID is required when EMAIL_PROVIDER=ses');
      }
      if (!config.AWS_SECRET_ACCESS_KEY && !isDev) {
        errorMessages.push('AWS_SECRET_ACCESS_KEY is required when EMAIL_PROVIDER=ses');
      }
    }

    if (emailProviderLower === 'smtp' && (!config.SMTP_HOST || !config.SMTP_PORT) && !isDev) {
      errorMessages.push('SMTP_HOST and SMTP_PORT are required when EMAIL_PROVIDER=smtp');
    }
  }

  // Firebase validation — only required if push notifications are explicitly enabled
  if (config.ENABLE_PUSH_NOTIFICATIONS === 'true') {
    if (
      !config.FIREBASE_PROJECT_ID ||
      !config.FIREBASE_PRIVATE_KEY ||
      !config.FIREBASE_CLIENT_EMAIL
    ) {
      errorMessages.push(
        'Firebase credentials (FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL) are required when ENABLE_PUSH_NOTIFICATIONS=true',
      );
    }
  } else if (config.FIREBASE_PROJECT_ID && (!config.FIREBASE_PRIVATE_KEY || !config.FIREBASE_CLIENT_EMAIL)) {
    errorMessages.push(
      'Partial Firebase config detected: set all three of FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL or none',
    );
  }

  // S3 validation — only required if S3 storage is explicitly enabled
  if (config.ENABLE_S3_STORAGE === 'true') {
    if (!config.AWS_S3_BUCKET || !config.AWS_S3_REGION) {
      errorMessages.push('AWS_S3_BUCKET and AWS_S3_REGION are required when ENABLE_S3_STORAGE=true');
    }
  }

  // APP_URL validation (prevent localhost fallback in production)
  if (appUrl && appUrl.includes('localhost')) {
    if (!isDev) {
      errorMessages.push('APP_URL must not contain localhost in production');
    }
  }
  if (!appUrl && !isDev) {
    errorMessages.push(
      'APP_URL is required in production (or set RAILWAY_PUBLIC_DOMAIN on Railway)',
    );
  }

  return errorMessages;
}

export function validateEnvironmentOrThrow(): void {
  const errors = validateEnvironment(process.env);

  if (errors.length > 0) {
    const errorMessage =
      'Environment validation failed:\n' +
      errors.map((e) => `  - ${e}`).join('\n');
    throw new Error(errorMessage);
  }
}
