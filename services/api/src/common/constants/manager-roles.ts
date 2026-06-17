/** Perfis com acesso ao painel do fundo / gestor. */
export const MANAGER_ROLES = ["GESTOR", "GESTOR_FUNDO", "ADMIN"] as const;

export function isManagerRole(tipo: string | null | undefined): boolean {
  return !!tipo && (MANAGER_ROLES as readonly string[]).includes(tipo);
}
