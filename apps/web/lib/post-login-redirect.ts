import { ROLE_HOME } from "@/lib/role-permissions";
import { obterJornadaResiliente } from "@/lib/jornada-fetch";

export { ROLE_HOME };

/** Navegação após login — vai ao passo atual da jornada guiada. */
export async function redirectAfterLogin(role: string, next?: string | null): Promise<void> {
  if (next && next.startsWith("/") && !next.startsWith("//")) {
    setTimeout(() => window.location.assign(next), 100);
    return;
  }

  try {
    const jornada = await obterJornadaResiliente();
    setTimeout(() => window.location.assign(jornada.href), 100);
    return;
  } catch {
    // API indisponível — fallback abaixo
  }

  const dest = ROLE_HOME[role as keyof typeof ROLE_HOME] ?? "/dashboard";
  setTimeout(() => window.location.assign(dest), 100);
}
