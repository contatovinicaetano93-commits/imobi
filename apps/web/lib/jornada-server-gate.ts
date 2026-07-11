import type { Jornada } from "@/lib/api";
import { jornadaApi } from "@/lib/api";
import { normalizeRole } from "@/lib/role-permissions";
import { decodeJwtPayload } from "@/lib/decode-jwt-payload";
import { promiseWithTimeout } from "@/lib/resilience";

/**
 * Gating de jornada no servidor — fecha o buraco de deep-link do JornadaGuard client-only.
 * Regra única: fora do href atual da jornada (e não concluída) → redireciona pro passo certo.
 * Falha-aberto: API lenta/fora do ar não bloqueia a navegação.
 */
export const JORNADA_SERVER_GATE = process.env.NEXT_PUBLIC_JORNADA_SERVER_GATE === "true";

const GATE_TIMEOUT_MS = 2_500;

/** Decisão pura (sem IO): href de redirect ou `null` se a rota pode ser exibida. */
export function jornadaGateDecision(pathname: string | null, jornada: Jornada | null): string | null {
  if (!pathname || !pathname.startsWith("/dashboard")) return null;
  if (!jornada || jornada.concluido) return null;
  if (pathname === jornada.href || pathname.startsWith(`${jornada.href}/`)) return null;
  return jornada.href;
}

export async function enforceJornadaGate(): Promise<void> {
  if (!JORNADA_SERVER_GATE) return;

  const { headers, cookies } = await import("next/headers");

  const pathname = headers().get("x-pathname");
  if (!pathname || !pathname.startsWith("/dashboard")) return;

  const token = cookies().get("access_token")?.value;
  if (!token) return; // não autenticado — o middleware já cuida disso

  const payload = decodeJwtPayload(token);
  const rawRole = typeof payload?.role === "string" ? payload.role : undefined;
  if (!normalizeRole(rawRole)) return;

  let jornada: Jornada | null = null;
  try {
    jornada = await promiseWithTimeout(jornadaApi.obter(), GATE_TIMEOUT_MS, "jornada gate timeout");
  } catch {
    return; // fail-open
  }

  const dest = jornadaGateDecision(pathname, jornada);
  if (dest && dest !== pathname) {
    const { redirect } = await import("next/navigation");
    redirect(dest);
  }
}
