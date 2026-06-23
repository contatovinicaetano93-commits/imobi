export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
}

export function getRedisConfig(): RedisConfig {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const redisUrl = process.env.REDIS_URL;
  const redisHost = process.env.REDIS_HOST;
  const redisPort = process.env.REDIS_PORT;

  // Priority 1: REDIS_URL (e.g., redis://default:password@host:port)
  if (redisUrl) {
    return parseRedisUrl(redisUrl.trim());
  }

  // Priority 2: REDIS_HOST and REDIS_PORT
  if (redisHost && redisPort) {
    return {
      host: redisHost.trim(),
      port: Number(redisPort),
      password: process.env.REDIS_PASSWORD?.trim(),
    };
  }

  // Fallback for development and test environments
  if (nodeEnv === 'development' || nodeEnv === 'test') {
    return {
      host: 'localhost',
      port: 6379,
    };
  }

  // Production requires explicit configuration
  throw new Error(
    'Redis configuration missing. Either set REDIS_URL or both REDIS_HOST and REDIS_PORT environment variables.',
  );
}

function parseRedisUrl(url: string): RedisConfig {
  try {
    const parsed = new URL(url);

    if (parsed.protocol !== 'redis:' && parsed.protocol !== 'rediss:') {
      throw new Error(`Invalid Redis URL protocol: ${parsed.protocol}`);
    }

    const host = parsed.hostname.trim();
    const nodeEnv = process.env.NODE_ENV || 'development';
    // Only allow port fallback in dev/test; production must be explicit
    const port = parsed.port
      ? Number(parsed.port)
      : nodeEnv === 'development' || nodeEnv === 'test'
      ? 6379
      : (() => {
          throw new Error('Redis URL must include explicit port for production (e.g., redis://host:6379)');
        })();
    const password = parsed.password || undefined;

    if (!host) {
      throw new Error('Redis URL missing hostname');
    }

    if (port < 1 || port > 65535) {
      throw new Error(`Invalid Redis port: ${port}`);
    }

    return { host, port, password };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to parse REDIS_URL: ${error.message}`);
    }
    throw error;
  }
}

export function validateRedisConfig(config: RedisConfig): string[] {
  const errors: string[] = [];

  if (!config.host || typeof config.host !== 'string') {
    errors.push('Redis host is missing or invalid');
  }

  if (typeof config.port !== 'number' || config.port < 1 || config.port > 65535) {
    errors.push(`Redis port is invalid: ${config.port}`);
  }

  return errors;
}
