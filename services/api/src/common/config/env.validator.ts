export function validateEnvironment(config: Record<string, any>): string[] {
  const errorMessages: string[] = [];
  const nodeEnv = config.NODE_ENV || 'development';
  const isDev = nodeEnv === 'development' || nodeEnv === 'test' || nodeEnv === 'staging';

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
    errorMessages.push(
      'Redis configuration missing. Either set REDIS_URL or both REDIS_HOST and REDIS_PORT',
    );
  }

  // Email: only validate credentials when a provider is explicitly set

  // Firebase and S3 are optional — missing only disables push notifications / photo uploads

  // APP_URL validation (prevent localhost fallback in production)
  const appUrl = config.APP_URL;
  if (appUrl && appUrl.includes('localhost')) {
    if (!isDev) {
      errorMessages.push('APP_URL must not contain localhost in production');
    }
  }
  if (!appUrl && !isDev) {
    errorMessages.push('APP_URL is required in production to generate correct email links');
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
