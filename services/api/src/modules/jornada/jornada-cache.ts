import type { Cache } from "cache-manager";

export const JORNADA_GESTOR_CACHE_KEY = "jornada:gestor";

export function jornadaUsuarioCacheKey(usuarioId: string): string {
  return `jornada:user:${usuarioId}`;
}

/** TTL alinhado ao cache do web client (30s). */
export const JORNADA_CACHE_TTL_MS = 30_000;

export async function invalidateJornadaCache(
  cache: Cache,
  usuarioId?: string,
): Promise<void> {
  const keys = [JORNADA_GESTOR_CACHE_KEY];
  if (usuarioId) keys.push(jornadaUsuarioCacheKey(usuarioId));
  await Promise.all(keys.map((k) => cache.del(k)));
}
