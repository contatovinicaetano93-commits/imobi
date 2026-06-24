/**
 * Licenças e permissões por perfil (web).
 *
 * GESTOR — Gestor do Fundo: acompanha pipe (KYC, etapas, carteira) em modo leitura.
 * Aprovações ficam com Admin (KYC) e Engenheiro (etapas/vistoria).
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

/** Rótulo único no MVP — TOMADOR e CONSTRUTOR são o mesmo perfil (role legado vs canônico). */
export const CLIENTE_BETA_LABEL = 'Cliente';

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  GESTOR: 'Gestor do Fundo',
  GESTOR_FUNDO: 'Gestor do Fundo',
  ENGENHEIRO: 'Engenheiro',
  GESTOR_OBRA: 'Gestor de Obra',
  COMERCIAL: 'Comercial',
  PARCEIRO: 'Parceiro',
  CONSTRUTOR: CLIENTE_BETA_LABEL,
  TOMADOR: CLIENTE_BETA_LABEL,
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
  TOMADOR: '/dashboard/construtor',
  CONSTRUTOR: '/dashboard/construtor',
};

export function isGestor(role: string | null | undefined): boolean {
  return normalizeRole(role) === 'GESTOR';
}
