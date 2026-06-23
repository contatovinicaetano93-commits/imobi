import { BETA_MVP_MODE } from "@/lib/beta-mvp";
import { ROLE_HOME } from "@/lib/role-permissions";

export { ROLE_HOME };

const GUIDED_ROLES = new Set(["TOMADOR", "CONSTRUTOR", "GESTOR", "GESTOR_FUNDO"]);

/**
 * Navegação completa após login — em MVP vai direto ao passo da jornada.
 */
export async function redirectAfterLogin(role: string, next?: string | null): Promise<void> {
  if (next && next.startsWith("/") && !next.startsWith("//")) {
    setTimeout(() => window.location.assign(next), 100);
    return;
  }

  if (BETA_MVP_MODE && GUIDED_ROLES.has(role)) {
    try {
      const res = await fetch("/api/proxy/jornada", { credentials: "include" });
      if (res.ok) {
        const j = (await res.json()) as { href?: string };
        const href = j.href;
        if (href) {
          setTimeout(() => window.location.assign(href), 100);
          return;
        }
      }
    } catch {
      /* fallback abaixo */
    }
  }

  const dest = ROLE_HOME[role] ?? "/dashboard";
  setTimeout(() => window.location.assign(dest), 100);
}
