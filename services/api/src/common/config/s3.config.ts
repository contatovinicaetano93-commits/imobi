export interface S3Config {
  bucket: string;
  region: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}

export function getS3Config(): S3Config {
  const bucket = process.env.AWS_S3_BUCKET;
  const region = process.env.AWS_S3_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const nodeEnv = process.env.NODE_ENV || 'development';

  if (!bucket || !region) {
    if (nodeEnv === 'production') {
      throw new Error('AWS_S3_BUCKET and AWS_S3_REGION are required in production');
    }

    return {
      bucket: 'local-dev-bucket',
      region: 'us-east-1',
    };
  }

  if (accessKeyId && !secretAccessKey) {
    throw new Error('AWS_SECRET_ACCESS_KEY is required when AWS_ACCESS_KEY_ID is provided');
  }

  if (!accessKeyId && secretAccessKey) {
    throw new Error('AWS_ACCESS_KEY_ID is required when AWS_SECRET_ACCESS_KEY is provided');
  }

  return {
    bucket,
    region,
    ...(accessKeyId && { accessKeyId }),
    ...(secretAccessKey && { secretAccessKey }),
  };
}

export function validateS3Config(config: S3Config): string[] {
  const errors: string[] = [];

  if (!config.bucket || typeof config.bucket !== 'string') {
    errors.push('S3 bucket is missing or invalid');
  }

  if (!config.region || typeof config.region !== 'string') {
    errors.push('S3 region is missing or invalid');
  }

  return errors;
}
