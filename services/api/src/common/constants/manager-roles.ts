/**
 * Perfil único de gestão: Gestor do Fundo.
 * GESTOR_FUNDO no banco é legado — sempre normalizar para GESTOR.
 */
export const GESTOR_LEGACY_ALIAS = "GESTOR_FUNDO";

export function normalizeUserRole(tipo: string | null | undefined): string | null {
  if (!tipo) return null;
  if (tipo === GESTOR_LEGACY_ALIAS) return "GESTOR";
  return tipo;
}

export function isGestorRole(tipo: string | null | undefined): boolean {
  return normalizeUserRole(tipo) === "GESTOR";
}

export function isManagerRole(tipo: string | null | undefined): boolean {
  const role = normalizeUserRole(tipo);
  return role === "GESTOR" || role === "ADMIN";
}

/** Roles com acesso ao módulo manager (painel do gestor do fundo). */
export const MANAGER_ROLES = ["GESTOR", "ADMIN"] as const;

/** Gestor do fundo: leitura do pipe (KYC, etapas, carteira). */
export const MANAGER_READ_ROLES = MANAGER_ROLES;
/** Aprovação KYC via /manager — somente Admin. */
export const MANAGER_WRITE_ROLES = ["ADMIN"] as const;
