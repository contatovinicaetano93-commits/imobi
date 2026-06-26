import { BETA_MVP_MODE } from "@/lib/beta-mvp";
import { ROLE_HOME } from "@/lib/role-permissions";
import { obterJornadaResiliente } from "@/lib/jornada-fetch";

export { ROLE_HOME };

const GUIDED_ROLES = new Set(["TOMADOR", "CONSTRUTOR", "GESTOR", "GESTOR_FUNDO"]);

/**
 * Navegação após login — em MVP vai ao passo atual da jornada.
 */
export async function redirectAfterLogin(role: string, next?: string | null): Promise<void> {
  if (next && next.startsWith("/") && !next.startsWith("//")) {
    setTimeout(() => window.location.assign(next), 100);
    return;
  }

  if (BETA_MVP_MODE && GUIDED_ROLES.has(role)) {
    try {
      const jornada = await obterJornadaResiliente();
      setTimeout(() => window.location.assign(jornada.href), 100);
      return;
    } catch {
      // API indisponível — fallback abaixo
    }
  }

  const dest = ROLE_HOME[role] ?? "/dashboard";
  setTimeout(() => window.location.assign(dest), 100);
}
