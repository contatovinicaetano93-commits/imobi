import { TipoUsuarioEnum, type TipoUsuario, type FuncaoPainel } from "./usuario.schema";

export const GESTOR_LEGACY_ALIAS = "GESTOR_FUNDO" as const;
export type AppRole = Exclude<TipoUsuario, typeof GESTOR_LEGACY_ALIAS>;

export const CANONICAL_PRODUCT_ROLES = [
  "TOMADOR",
  "ADMIN",
  "GESTOR",
  "ENGENHEIRO",
  "COMERCIAL",
] as const satisfies readonly TipoUsuario[];

export const ROLE_LABELS: Record<TipoUsuario, string> = {
  ADMIN: "Administrador",
  GESTOR: "Gestor do Fundo",
  GESTOR_FUNDO: "Gestor do Fundo",
  ENGENHEIRO: "Engenheiro",
  GESTOR_OBRA: "Gestor de Obra",
  COMERCIAL: "Comercial",
  PARCEIRO: "Parceiro",
  CONSTRUTOR: "Construtor",
  TOMADOR: "Tomador",
};

export const ROLE_HOME: Record<TipoUsuario, string> = {
  ADMIN: "/dashboard/admin",
  GESTOR: "/dashboard/gestor",
  GESTOR_FUNDO: "/dashboard/gestor",
  ENGENHEIRO: "/dashboard/engenheiro",
  GESTOR_OBRA: "/dashboard/engenheiro",
  COMERCIAL: "/dashboard/comercial",
  PARCEIRO: "/dashboard/comercial",
  TOMADOR: "/dashboard",
  CONSTRUTOR: "/dashboard/construtor",
};

export const MOBILE_ROLE_HOME: Record<TipoUsuario, string> = {
  ADMIN: "/(tabs)/obras",
  GESTOR: "/(tabs)/gestor",
  GESTOR_FUNDO: "/(tabs)/gestor",
  ENGENHEIRO: "/(tabs)/engenheiro",
  GESTOR_OBRA: "/(tabs)/engenheiro",
  COMERCIAL: "/(tabs)/comercial",
  PARCEIRO: "/(tabs)/comercial",
  TOMADOR: "/(tabs)/obras",
  CONSTRUTOR: "/(tabs)/obras",
};

export const MANAGER_ROLES = ["GESTOR", "ADMIN"] as const satisfies readonly TipoUsuario[];
export const MANAGER_READ_ROLES = MANAGER_ROLES;
export const MANAGER_WRITE_ROLES = MANAGER_ROLES;

export const RBAC_ROLE_GROUPS = {
  admin: ["ADMIN"],
  manager: MANAGER_ROLES,
  borrower: ["CONSTRUTOR", "TOMADOR", "ADMIN"],
  engineering: ["ENGENHEIRO", "GESTOR_OBRA", "ADMIN"],
  commercial: ["COMERCIAL", "PARCEIRO", "ADMIN"],
  works: ["CONSTRUTOR", "TOMADOR", "GESTOR", "ENGENHEIRO", "GESTOR_OBRA", "ADMIN"],
  committee: ["CONSTRUTOR", "TOMADOR", "GESTOR", "ENGENHEIRO", "GESTOR_OBRA", "ADMIN"],
  authenticated: [
    "TOMADOR",
    "GESTOR",
    "GESTOR_FUNDO",
    "ENGENHEIRO",
    "GESTOR_OBRA",
    "COMERCIAL",
    "PARCEIRO",
    "ADMIN",
    "CONSTRUTOR",
  ],
} as const satisfies Record<string, readonly TipoUsuario[]>;

export const FEATURE_ROLE_RULES: Record<FuncaoPainel, readonly TipoUsuario[]> = {
  obras: RBAC_ROLE_GROUPS.works,
  credito: RBAC_ROLE_GROUPS.borrower,
  simulador: RBAC_ROLE_GROUPS.borrower,
  score: RBAC_ROLE_GROUPS.borrower,
  kyc: RBAC_ROLE_GROUPS.borrower,
  notificacoes: RBAC_ROLE_GROUPS.authenticated,
  engenharia: RBAC_ROLE_GROUPS.engineering,
  gestor: RBAC_ROLE_GROUPS.manager,
  "due-diligence": RBAC_ROLE_GROUPS.manager,
  fundos: RBAC_ROLE_GROUPS.manager,
  relatorios: RBAC_ROLE_GROUPS.manager,
  comercial: RBAC_ROLE_GROUPS.commercial,
  construtor: RBAC_ROLE_GROUPS.borrower,
};

export const WEB_ROUTE_RULES = [
  { prefix: "/dashboard/admin", roles: RBAC_ROLE_GROUPS.admin },
  { prefix: "/dashboard/gestor", roles: RBAC_ROLE_GROUPS.manager },
  { prefix: "/dashboard/fundos", roles: RBAC_ROLE_GROUPS.manager },
  { prefix: "/dashboard/relatorios", roles: RBAC_ROLE_GROUPS.manager },
  { prefix: "/dashboard/engenheiro", roles: RBAC_ROLE_GROUPS.engineering },
  { prefix: "/dashboard/comercial", roles: RBAC_ROLE_GROUPS.commercial },
  { prefix: "/dashboard/construtor", roles: RBAC_ROLE_GROUPS.borrower },
  { prefix: "/dashboard/credito", roles: RBAC_ROLE_GROUPS.borrower },
  { prefix: "/dashboard/obras", roles: RBAC_ROLE_GROUPS.works },
  { prefix: "/dashboard/kyc", roles: RBAC_ROLE_GROUPS.borrower },
  { prefix: "/dashboard/score", roles: RBAC_ROLE_GROUPS.borrower },
  { prefix: "/dashboard/simulador", roles: RBAC_ROLE_GROUPS.borrower },
  { prefix: "/dashboard/comite", roles: RBAC_ROLE_GROUPS.committee },
] as const;

export const MOBILE_TAB_RULES = {
  gestor: RBAC_ROLE_GROUPS.manager,
  engenharia: RBAC_ROLE_GROUPS.engineering,
  comercial: RBAC_ROLE_GROUPS.commercial,
  obras: RBAC_ROLE_GROUPS.works,
  credito: RBAC_ROLE_GROUPS.borrower,
  perfil: RBAC_ROLE_GROUPS.authenticated,
} as const;

export function isKnownUserRole(role: string | null | undefined): role is TipoUsuario {
  return !!role && TipoUsuarioEnum.options.includes(role as TipoUsuario);
}

export function normalizeUserRole(role: string | null | undefined): AppRole | null {
  if (!role) return null;
  if (role === GESTOR_LEGACY_ALIAS) return "GESTOR";
  return isKnownUserRole(role) ? (role as AppRole) : null;
}

export const normalizeRole = normalizeUserRole;

export function roleCanAccess(
  role: string | null | undefined,
  allowedRoles: readonly string[],
): boolean {
  const normalizedRole = normalizeUserRole(role);
  if (!normalizedRole) return false;

  return allowedRoles.some((allowedRole) => normalizeUserRole(allowedRole) === normalizedRole);
}

export function roleCanAccessFeature(
  role: string | null | undefined,
  feature: FuncaoPainel,
): boolean {
  return roleCanAccess(role, FEATURE_ROLE_RULES[feature]);
}

export function roleCanAccessMobileTab(
  role: string | null | undefined,
  tab: keyof typeof MOBILE_TAB_RULES,
): boolean {
  return roleCanAccess(role, MOBILE_TAB_RULES[tab]);
}

export function getRoleHome(role: string | null | undefined, fallback = "/dashboard"): string {
  const normalizedRole = normalizeUserRole(role);
  return normalizedRole ? ROLE_HOME[normalizedRole] ?? fallback : fallback;
}

export function getMobileRoleHome(
  role: string | null | undefined,
  fallback = "/(tabs)/obras",
): string {
  const normalizedRole = normalizeUserRole(role);
  return normalizedRole ? MOBILE_ROLE_HOME[normalizedRole] ?? fallback : fallback;
}

export function isGestorRole(role: string | null | undefined): boolean {
  return normalizeUserRole(role) === "GESTOR";
}

export function isManagerRole(role: string | null | undefined): boolean {
  return roleCanAccess(role, MANAGER_ROLES);
}
