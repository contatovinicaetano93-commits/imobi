import { isCanonicalRouteAllowed, PUBLIC_MARKETING_PATHS } from "@/lib/canonical-flow";

/**
 * Modo beta MVP — menu reduzido (legado). Desligado no lançamento.
 * Ativar apenas para demos: NEXT_PUBLIC_BETA_MVP_MODE=true
 */
export const BETA_MVP_MODE = process.env.NEXT_PUBLIC_BETA_MVP_MODE === "true";

/**
 * Jornada passo-a-passo estrita para tomador/gestor.
 * Default: true (lançamento). Desligar: NEXT_PUBLIC_GUIDED_STRICT=false
 */
export const GUIDED_STRICT_MODE = process.env.NEXT_PUBLIC_GUIDED_STRICT !== "false";

/** Rotas públicas (marketing + auth) — sempre acessíveis */
export const MVP_PUBLIC_PREFIXES = PUBLIC_MARKETING_PATHS;

/** Tomador / construtor — fluxo obra → crédito */
export const MVP_TOMADOR_PREFIXES = [
  "/dashboard/construtor",
  "/dashboard/operacao",
  "/dashboard/obras",
  "/dashboard/kyc",
  "/dashboard/proposta-credito",
  "/dashboard/credito",
  "/dashboard/perfil",
  "/dashboard/notificacoes",
] as const;

/** Gestor — indicadores agregados (sem rotas de obra do tomador) */
export const MVP_GESTOR_PREFIXES = [
  "/dashboard/gestor",
  "/dashboard/perfil",
  "/dashboard/notificacoes",
] as const;

function matchesPrefix(path: string, prefixes: readonly string[]): boolean {
  return prefixes.some((p) => path === p || path.startsWith(`${p}/`));
}

export function isMvpRouteAllowed(pathname: string, role: string | null): boolean {
  if (!BETA_MVP_MODE && GUIDED_STRICT_MODE) {
    return isCanonicalRouteAllowed(pathname, role);
  }
  if (!BETA_MVP_MODE) return true;

  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/web-api/") ||
    matchesPrefix(pathname, MVP_PUBLIC_PREFIXES)
  ) {
    return true;
  }

  if (!pathname.startsWith("/dashboard")) return true;

  if (role === "ADMIN" || role === "ENGENHEIRO" || role === "GESTOR_OBRA") return true;
  if (role === "COMERCIAL" || role === "PARCEIRO") return true;

  if (role === "GESTOR") return matchesPrefix(pathname, MVP_GESTOR_PREFIXES);
  if (role === "TOMADOR" || role === "CONSTRUTOR") {
    return matchesPrefix(pathname, MVP_TOMADOR_PREFIXES);
  }

  return matchesPrefix(pathname, ["/dashboard/perfil", "/dashboard/notificacoes"]);
}
