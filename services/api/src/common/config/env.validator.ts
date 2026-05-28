export function validateEnvironment(config: Record<string, any>): string[] {
  const errorMessages: string[] = [];
  const nodeEnv = config.NODE_ENV || 'development';

  // Critical: DATABASE_URL always required
  if (!config.DATABASE_URL) {
    errorMessages.push('DATABASE_URL is required');
  }

  // Redis: validate either REDIS_URL or REDIS_HOST + REDIS_PORT
  const hasRedisUrl = !!config.REDIS_URL;
  const hasRedisHostPort = config.REDIS_HOST && config.REDIS_PORT;

  if (!hasRedisUrl && !hasRedisHostPort && nodeEnv !== 'development') {
    errorMessages.push(
      'Redis configuration missing. Either set REDIS_URL or both REDIS_HOST and REDIS_PORT',
    );
  }

  // Email provider validation
  const emailProvider = config.EMAIL_PROVIDER || 'smtp';
  const emailProviderLower = emailProvider.toLowerCase();

  if (
    emailProviderLower === 'sendgrid' &&
    !config.SENDGRID_API_KEY &&
    nodeEnv !== 'development'
  ) {
    errorMessages.push('SENDGRID_API_KEY is required when EMAIL_PROVIDER=sendgrid');
  }

  if (emailProviderLower === 'ses') {
    if (!config.AWS_REGION && nodeEnv !== 'development') {
      errorMessages.push('AWS_REGION is required when EMAIL_PROVIDER=ses');
    }
    if (!config.AWS_ACCESS_KEY_ID && nodeEnv !== 'development') {
      errorMessages.push('AWS_ACCESS_KEY_ID is required when EMAIL_PROVIDER=ses');
    }
    if (!config.AWS_SECRET_ACCESS_KEY && nodeEnv !== 'development') {
      errorMessages.push('AWS_SECRET_ACCESS_KEY is required when EMAIL_PROVIDER=ses');
    }
  }

  if (
    emailProviderLower === 'smtp' &&
    (!config.SMTP_HOST || !config.SMTP_PORT) &&
    nodeEnv !== 'development'
  ) {
    errorMessages.push('SMTP_HOST and SMTP_PORT are required when EMAIL_PROVIDER=smtp');
  }

  // Firebase validation (required for push notifications)
  if (
    !config.FIREBASE_PROJECT_ID ||
    !config.FIREBASE_PRIVATE_KEY ||
    !config.FIREBASE_CLIENT_EMAIL
  ) {
    if (nodeEnv !== 'development') {
      errorMessages.push(
        'Firebase credentials (FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL) are required in production',
      );
    }
  }

  // S3 validation (required for evidence storage)
  if (!config.AWS_S3_BUCKET || !config.AWS_S3_REGION) {
    if (nodeEnv !== 'development') {
      errorMessages.push('AWS_S3_BUCKET and AWS_S3_REGION are required in production');
    }
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
