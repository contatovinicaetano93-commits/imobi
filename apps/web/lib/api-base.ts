/** URL base da API — fallback staging em produção/Vercel se env não estiver setada. */
const STAGING = 'https://imobi-api-staging.onrender.com';

export function getApiBaseUrl(): string {
  const fromEnv = process.env['NEXT_PUBLIC_API_URL'] ?? process.env['IMOBI_API_URL'];
  if (fromEnv?.trim()) return fromEnv.replace(/\/$/, '');

  if (process.env['VERCEL'] || process.env['NODE_ENV'] === 'production') {
    return STAGING;
  }

  return 'http://localhost:4000';
}

export function getApiV1Url(): string {
  const base = getApiBaseUrl();
  return base.endsWith('/api/v1') ? base : `${base}/api/v1`;
}
