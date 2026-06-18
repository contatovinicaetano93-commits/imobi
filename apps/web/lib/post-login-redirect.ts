import { ROLE_HOME, getRoleHome } from "@/lib/role-permissions";

export { ROLE_HOME };

/**
 * Navegação completa após login — garante que cookies httpOnly
 * cheguem ao middleware (router.push soft nav falha na Vercel).
 */
export function redirectAfterLogin(role: string, next?: string | null): void {
  const dest =
    next && next.startsWith("/") && !next.startsWith("//")
      ? next
      : getRoleHome(role, "/dashboard");
  setTimeout(() => window.location.assign(dest), 100);
}
