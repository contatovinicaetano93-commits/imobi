/** Gestor de fundo = visão global, somente leitura. Liberação: admin + engenheiro. */
export type AppRole =
  | "ADMIN"
  | "GESTOR"
  | "ENGENHEIRO"
  | "GESTOR_OBRA"
  | "TOMADOR"
  | "CONSTRUTOR"
  | "COMERCIAL"
  | "PARCEIRO"
  | null;

export function canLiberarEtapas(role: AppRole): boolean {
  return role === "ADMIN" || role === "ENGENHEIRO" || role === "GESTOR_OBRA";
}

export function canAprovarKyc(role: AppRole): boolean {
  return role === "ADMIN";
}

export function isGestorFundoMonitor(role: AppRole): boolean {
  return role === "GESTOR";
}

export async function fetchUserRole(): Promise<AppRole> {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem("imobi_auth");
    if (raw) {
      const { d, ts } = JSON.parse(raw) as { d?: { authenticated?: boolean; role?: string }; ts?: number };
      if (d?.authenticated && d.role && Date.now() - (ts ?? 0) < 5 * 60 * 1000) {
        return d.role as AppRole;
      }
    }
    const res = await fetch("/api/auth/me");
    if (!res.ok) return null;
    const data = (await res.json()) as { authenticated: boolean; role?: string };
    return data.authenticated ? (data.role as AppRole) : null;
  } catch {
    return null;
  }
}
