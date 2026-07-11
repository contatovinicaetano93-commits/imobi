/** API agora vive dentro do próprio Next.js (app/api/v1) — sempre same-origin. */
export function getApiBaseUrl(): string {
  return "";
}

export function getApiV1Url(): string {
  return "/api/v1";
}

export function getApiV1Fallbacks(): string[] {
  return [getApiV1Url()];
}
