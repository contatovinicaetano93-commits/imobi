/** 4 papéis únicos — sem aliases. */
export type AppRole = 'ADMIN' | 'CLIENTE' | 'FUNDO' | 'ENGENHEIRO';

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

export function normalizeRole(role: string | null | undefined): AppRole | null {
  if (role === 'ADMIN' || role === 'CLIENTE' || role === 'FUNDO' || role === 'ENGENHEIRO') {
    return role;
  }
  return null;
}
