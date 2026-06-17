/** Destino pós-login por perfil (middleware + dashboard raiz). */
export const ROLE_HOME: Record<string, string> = {
  ADMIN: "/dashboard/admin",
  GESTOR: "/dashboard/gestor",
  GESTOR_FUNDO: "/dashboard/gestor",
  ENGENHEIRO: "/dashboard/engenheiro",
  GESTOR_OBRA: "/dashboard/engenheiro",
  COMERCIAL: "/dashboard/comercial",
  PARCEIRO: "/dashboard/comercial",
  TOMADOR: "/dashboard",
  CONSTRUTOR: "/dashboard/construtor",
};

/**
 * Navegação completa após login — garante que cookies httpOnly
 * cheguem ao middleware (router.push soft nav falha na Vercel).
 */
export function redirectAfterLogin(role: string, next?: string | null): void {
  if (next && next.startsWith("/") && !next.startsWith("//")) {
    window.location.assign(next);
    return;
  }
  window.location.assign(ROLE_HOME[role] ?? "/dashboard");
}
