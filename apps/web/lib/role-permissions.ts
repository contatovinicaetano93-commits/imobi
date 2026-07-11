/** 4 papéis únicos — sem aliases no JWT novo. */
export type AppRole = 'ADMIN' | 'CLIENTE' | 'FUNDO' | 'ENGENHEIRO';

/** Papéis legados ainda presentes em JWTs antigos ou UI residual. */
export type LegacyRole =
  | 'TOMADOR'
  | 'CONSTRUTOR'
  | 'GESTOR'
  | 'GESTOR_OBRA'
  | 'COMERCIAL'
  | 'PARCEIRO';

export type AnyRole = AppRole | LegacyRole;

const LEGACY_TO_CANONICAL: Record<LegacyRole, AppRole> = {
  TOMADOR: 'CLIENTE',
  CONSTRUTOR: 'CLIENTE',
  GESTOR: 'FUNDO',
  GESTOR_OBRA: 'ENGENHEIRO',
  COMERCIAL: 'ADMIN',
  PARCEIRO: 'ADMIN',
};

export const ROLE_LABELS: Record<AppRole, string> = {
  ADMIN: 'Administrador',
  CLIENTE: 'Cliente',
  FUNDO: 'Fundo',
  ENGENHEIRO: 'Engenheiro',
};

/** Home após login */
export const ROLE_HOME: Record<AppRole, string> = {
  ADMIN: '/dashboard/admin',
  CLIENTE: '/dashboard/cliente',
  FUNDO: '/dashboard/fundo',
  ENGENHEIRO: '/dashboard/engenheiro',
};

export const GUIDED_STRICT_MODE = process.env.NEXT_PUBLIC_GUIDED_STRICT === 'true';

export function normalizeRole(role: string | null | undefined): AppRole | null {
  if (role === 'ADMIN' || role === 'CLIENTE' || role === 'FUNDO' || role === 'ENGENHEIRO') {
    return role;
  }
  if (role && role in LEGACY_TO_CANONICAL) {
    return LEGACY_TO_CANONICAL[role as LegacyRole];
  }
  return null;
}

export function canCadastrarObra(role: string | null | undefined): boolean {
  return normalizeRole(role) === 'CLIENTE';
}

export function isEngenheiro(role: string | null | undefined): boolean {
  return normalizeRole(role) === 'ENGENHEIRO';
}
