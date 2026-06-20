import { ROLE_HOME } from "@/lib/role-permissions";

export { ROLE_HOME };

/**
 * Navegação completa após login — garante que cookies httpOnly
 * cheguem ao middleware (router.push soft nav falha na Vercel).
 */
function isSafeNext(next: string): boolean {
  if (!next.startsWith("/")) return false;
  if (next.startsWith("//")) return false;
  if (next.startsWith("/\\")) return false;
  // Block URL-encoded slashes and backslashes at position 1
  if (/^\/(%2[fF]|%5[cC])/i.test(next)) return false;
  return true;
}

export function redirectAfterLogin(role: string, next?: string | null): void {
  const dest =
    next && isSafeNext(next) ? next : ROLE_HOME[role] ?? "/dashboard";
  setTimeout(() => window.location.assign(dest), 100);
}
