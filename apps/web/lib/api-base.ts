/** Staging — API canônica (ver docs/DEPLOY_STACK.md). */
export const STAGING_API_URL = 'https://imobi-api-staging.onrender.com';
/** Prod alternativa no Render (pode estar pausada). */
export const PRODUCTION_API_URL = 'https://imobi-api-efgg.onrender.com';

const API_CANDIDATES = [STAGING_API_URL, PRODUCTION_API_URL];

function isUsableApiUrl(url: string): boolean {
  const u = url.toLowerCase();
  return u.startsWith('http') && !u.includes('localhost') && !u.includes('127.0.0.1');
}

export function getApiBaseUrl(): string {
  const fromEnv = process.env['NEXT_PUBLIC_API_URL'] ?? process.env['IMOBI_API_URL'];
  if (fromEnv?.trim() && isUsableApiUrl(fromEnv.trim())) {
    return fromEnv.trim().replace(/\/$/, '');
  }

  if (process.env['VERCEL'] || process.env['NODE_ENV'] === 'production') {
    return STAGING_API_URL;
  }

  return 'http://localhost:4000';
}

export function getApiV1Url(): string {
  const base = getApiBaseUrl();
  return base.endsWith('/api/v1') ? base : `${base}/api/v1`;
}

/** URLs para retry quando a primária falha. */
export function getApiV1Fallbacks(): string[] {
  const primary = getApiV1Url();
  return [...new Set([primary, ...API_CANDIDATES.map((b) => `${b.replace(/\/$/, '')}/api/v1`)])];
}
