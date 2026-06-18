/**
 * Roles oficiais do sistema:
 * TOMADOR, PARCEIRO, GESTOR, ENGENHEIRO, ADMIN.
 *
 * Aliases legados são aceitos apenas para leitura de tokens/dados antigos.
 */
const ROLE_ALIASES: Record<string, string> = {
  CONSTRUTOR: "TOMADOR",
  COMERCIAL: "PARCEIRO",
  GESTOR_OBRA: "ENGENHEIRO",
  GESTOR_FUNDO: "GESTOR",
};

export function normalizeUserRole(tipo: string | null | undefined): string | null {
  if (!tipo) return null;
  return ROLE_ALIASES[tipo] ?? tipo;
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

export const MANAGER_READ_ROLES = MANAGER_ROLES;
export const MANAGER_WRITE_ROLES = MANAGER_ROLES;
