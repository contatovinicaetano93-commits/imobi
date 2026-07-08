import type { Jornada } from "@/lib/api";
import { jornadaApi } from "@/lib/api";
import { normalizeRole } from "@/lib/role-permissions";
import { decodeJwtPayload } from "@/lib/decode-jwt-payload";
import { GUIDED_STRICT_MODE } from "@/lib/beta-mvp";
import { isJornadaPathAllowed } from "@/lib/jornada-routes";
import { promiseWithTimeout } from "@/lib/resilience";

/**
 * Gating de jornada no servidor (fecha o buraco de deep-link do JornadaGuard client-only).
 *
 * Desligado por padrão — ligar com NEXT_PUBLIC_JORNADA_SERVER_GATE=true.
 * Reusa `isJornadaPathAllowed` (mesma regra do client → equivalência garantida)
 * e falha-aberto: se a API demora/cai (cold start Render), não bloqueia a
 * navegação; o `JornadaGuard` client assume.
 */
export const JORNADA_SERVER_GATE =
  process.env.NEXT_PUBLIC_JORNADA_SERVER_GATE === "true";

/** Só o tomador/construtor têm fluxo guiado (idêntico ao JornadaGuard). */
const GUIDED_ROLES = new Set(["TOMADOR", "CONSTRUTOR"]);

/** Fail-open rápido: cold start do Render não pode travar o render. */
const GATE_TIMEOUT_MS = 2_500;

/**
 * Decisão pura (sem flag, sem IO): retorna o href de redirect ou `null` se a
 * rota pode ser exibida. Testável em isolamento.
 */
export function jornadaGateDecision(
  pathname: string | null,
  role: string | null,
  jornada: Jornada | null,
): string | null {
  if (!pathname || !pathname.startsWith("/dashboard")) return null;
  if (!role || !GUIDED_ROLES.has(role)) return null;
  if (!jornada) return null;
  if (isJornadaPathAllowed(pathname, jornada)) return null;
  return jornada.href;
}

/**
 * Enforcement server-side. Chamada no layout do grupo (dashboard).
 * No-op quando a flag está desligada ou fora do fluxo guiado.
 * Lança `NEXT_REDIRECT` (via `redirect`) quando precisa desviar — por isso a
 * chamada fica fora do try/catch do fetch.
 */
export async function enforceJornadaGate(): Promise<void> {
  if (!JORNADA_SERVER_GATE || !GUIDED_STRICT_MODE) return;

  const { headers, cookies } = await import("next/headers");

  const pathname = headers().get("x-pathname");
  if (!pathname || !pathname.startsWith("/dashboard")) return;

  const token = cookies().get("access_token")?.value;
  if (!token) return; // não autenticado — o middleware já cuida disso

  const payload = decodeJwtPayload(token);
  const rawRole = typeof payload?.role === "string" ? payload.role : undefined;
  const role = rawRole ? (normalizeRole(rawRole) ?? rawRole) : null;
  if (!role || !GUIDED_ROLES.has(role)) return;

  let jornada: Jornada | null = null;
  try {
    jornada = await promiseWithTimeout(
      jornadaApi.obter(),
      GATE_TIMEOUT_MS,
      "jornada gate timeout",
    );
  } catch {
    return; // fail-open — deixa o JornadaGuard client agir
  }

  const dest = jornadaGateDecision(pathname, role, jornada);
  if (dest && dest !== pathname) {
    const { redirect } = await import("next/navigation");
    redirect(dest);
  }
}
