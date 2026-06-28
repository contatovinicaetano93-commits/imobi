import { ROLE_HOME } from "@/lib/role-permissions";

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

/** Evita link para rota bloqueada no MVP (middleware redireciona e “pisca” o painel). */
export function mvpSafeHref(href: string, role: string | null): string {
  if (!BETA_MVP_MODE || !role) return href;
  const path = href.split("?")[0] ?? href;
  if (isMvpRouteAllowed(path, role)) return href;
  return ROLE_HOME[role] ?? "/dashboard";
}

/** Rotas públicas (marketing + auth) — sempre acessíveis */
export const MVP_PUBLIC_PREFIXES = [
  "/",
  "/login",
  "/cadastro",
  "/esqueceu-senha",
  "/redefinir-senha",
  "/termos",
  "/privacy-policy",
  "/simulador",
  "/envie-seu-projeto",
  "/quem-somos",
  "/como-funciona",
  "/contato",
] as const;

/** Tomador / construtor — fluxo obra → crédito */
export const MVP_TOMADOR_PREFIXES = [
  "/dashboard/construtor",
  "/dashboard/obras",
  "/dashboard/kyc",
  "/dashboard/viabilidade",
  "/dashboard/proposta-credito",
  "/dashboard/credito",
  "/dashboard/perfil",
  "/dashboard/notificacoes",
] as const;

/** Gestor — fila KYC + etapas + vistoria em obras (deep link) */
export const MVP_GESTOR_PREFIXES = [
  "/dashboard/gestor",
  "/dashboard/obras",
  "/dashboard/perfil",
  "/dashboard/notificacoes",
] as const;

const MVP_NAV_TOMADOR = new Set([
  "/dashboard/construtor",
  "/dashboard/obras",
  "/dashboard/kyc",
  "/dashboard/viabilidade",
  "/dashboard/proposta-credito",
  "/dashboard/credito",
  "/dashboard/perfil",
  "/dashboard/notificacoes",
]);

const MVP_NAV_GESTOR = new Set([
  "/dashboard/gestor",
  "/dashboard/gestor/kyc",
  "/dashboard/gestor/etapas",
  "/dashboard/perfil",
  "/dashboard/notificacoes",
]);

export function isMvpNavHref(href: string, navRole: string | null): boolean {
  if (!BETA_MVP_MODE || !navRole) return true;
  if (navRole === "TOMADOR" || navRole === "CONSTRUTOR") return MVP_NAV_TOMADOR.has(href);
  if (navRole === "GESTOR") return MVP_NAV_GESTOR.has(href);
  return true;
}

function matchesPrefix(path: string, prefixes: readonly string[]): boolean {
  return prefixes.some((p) => path === p || path.startsWith(`${p}/`));
}

export function isMvpRouteAllowed(pathname: string, role: string | null): boolean {
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
