/**
 * Licenças e permissões por perfil (web).
 *
 * Roles oficiais: TOMADOR, PARCEIRO, GESTOR, ENGENHEIRO, ADMIN.
 * Aliases legados são normalizados apenas para compatibilidade de leitura.
 */

export type AppRole =
  | 'ADMIN'
  | 'GESTOR'
  | 'ENGENHEIRO'
  | 'PARCEIRO'
  | 'TOMADOR';

const ROLE_ALIASES: Record<string, AppRole> = {
  CONSTRUTOR: 'TOMADOR',
  COMERCIAL: 'PARCEIRO',
  GESTOR_OBRA: 'ENGENHEIRO',
  GESTOR_FUNDO: 'GESTOR',
};

const OFFICIAL_ROLES = new Set<AppRole>(['ADMIN', 'GESTOR', 'ENGENHEIRO', 'PARCEIRO', 'TOMADOR']);

export function normalizeRole(role: string | null | undefined): AppRole | null {
  if (!role) return null;
  if (ROLE_ALIASES[role]) return ROLE_ALIASES[role];
  return OFFICIAL_ROLES.has(role as AppRole) ? (role as AppRole) : null;
}

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  GESTOR: 'Gestor do Fundo',
  ENGENHEIRO: 'Engenheiro',
  PARCEIRO: 'Parceiro',
  TOMADOR: 'Tomador',
};

/** Home após login */
export const ROLE_HOME: Record<string, string> = {
  ADMIN: '/dashboard/admin',
  GESTOR: '/dashboard/gestor',
  ENGENHEIRO: '/dashboard/engenheiro',
  PARCEIRO: '/dashboard/comercial',
  TOMADOR: '/dashboard',
};

export function isGestor(role: string | null | undefined): boolean {
  return normalizeRole(role) === 'GESTOR';
}
