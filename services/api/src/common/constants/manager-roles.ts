/** 4 papéis únicos — sem aliases, sem normalização. */
export const MANAGER_ROLES = ["FUNDO", "ADMIN"] as const;

export function isManagerRole(role: string | null | undefined): boolean {
  return role === "FUNDO" || role === "ADMIN";
}
