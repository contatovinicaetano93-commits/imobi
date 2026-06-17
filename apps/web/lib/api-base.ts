/** URL base da API — staging fixo na Vercel/produção. */
export const STAGING_API_URL = 'https://imobi-api-staging.onrender.com';

function isUsableApiUrl(url: string): boolean {
  const u = url.toLowerCase();
  if (!u.startsWith('http')) return false;
  if (u.includes('localhost') || u.includes('127.0.0.1')) return false;
  if (u.includes('alagami-site') || u.includes('alagami-api')) return false;
  return true;
}

export function getApiBaseUrl(): string {
  const onVercel = Boolean(process.env['VERCEL']);
  const isProd = process.env['NODE_ENV'] === 'production';

  if (onVercel || isProd) return STAGING_API_URL;

  const fromEnv = process.env['NEXT_PUBLIC_API_URL'] ?? process.env['IMOBI_API_URL'];
  if (fromEnv?.trim() && isUsableApiUrl(fromEnv.trim())) {
    return fromEnv.trim().replace(/\/$/, '');
  }

  return 'http://localhost:4000';
}

export function getApiV1Url(): string {
  const base = getApiBaseUrl();
  return base.endsWith('/api/v1') ? base : `${base}/api/v1`;
}
