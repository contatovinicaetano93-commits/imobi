/**
 * Licenças e permissões por perfil (web).
 *
 * GESTOR — Gestor do Fundo (único gestor do projeto).
 * GESTOR_FUNDO no JWT/banco é alias legado → normalizado para GESTOR.
 */

export type AppRole =
  | 'ADMIN'
  | 'GESTOR'
  | 'ENGENHEIRO'
  | 'GESTOR_OBRA'
  | 'COMERCIAL'
  | 'PARCEIRO'
  | 'CONSTRUTOR'
  | 'TOMADOR';

/** @deprecated alias legado — use normalizeRole() */
export const GESTOR_LEGACY_ALIAS = 'GESTOR_FUNDO';

export function normalizeRole(role: string | null | undefined): AppRole | null {
  if (!role) return null;
  if (role === GESTOR_LEGACY_ALIAS) return 'GESTOR';
  return role as AppRole;
}

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  GESTOR: 'Gestor do Fundo',
  GESTOR_FUNDO: 'Gestor do Fundo',
  ENGENHEIRO: 'Engenheiro',
  GESTOR_OBRA: 'Gestor de Obra',
  COMERCIAL: 'Comercial',
  PARCEIRO: 'Parceiro',
  CONSTRUTOR: 'Construtor',
  TOMADOR: 'Tomador',
};

/** Home após login */
export const ROLE_HOME: Record<string, string> = {
  ADMIN: '/dashboard/admin',
  GESTOR: '/dashboard/gestor',
  GESTOR_FUNDO: '/dashboard/gestor',
  ENGENHEIRO: '/dashboard/engenheiro',
  GESTOR_OBRA: '/dashboard/engenheiro',
  COMERCIAL: '/dashboard/comercial',
  PARCEIRO: '/dashboard/comercial',
  TOMADOR: '/dashboard',
  CONSTRUTOR: '/dashboard/construtor',
};

export function isGestor(role: string | null | undefined): boolean {
  return normalizeRole(role) === 'GESTOR';
}
