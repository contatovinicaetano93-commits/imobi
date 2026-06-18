import { type TipoUsuario, type FuncaoPainel } from "./usuario.schema";
export declare const GESTOR_LEGACY_ALIAS: "GESTOR_FUNDO";
export type AppRole = Exclude<TipoUsuario, typeof GESTOR_LEGACY_ALIAS>;
export declare const CANONICAL_PRODUCT_ROLES: readonly ["TOMADOR", "ADMIN", "GESTOR", "ENGENHEIRO", "COMERCIAL"];
export declare const ROLE_LABELS: Record<TipoUsuario, string>;
export declare const ROLE_HOME: Record<TipoUsuario, string>;
export declare const MOBILE_ROLE_HOME: Record<TipoUsuario, string>;
export declare const MANAGER_ROLES: readonly ["GESTOR", "ADMIN"];
export declare const MANAGER_READ_ROLES: readonly ["GESTOR", "ADMIN"];
export declare const MANAGER_WRITE_ROLES: readonly ["GESTOR", "ADMIN"];
export declare const RBAC_ROLE_GROUPS: {
    readonly admin: readonly ["ADMIN"];
    readonly manager: readonly ["GESTOR", "ADMIN"];
    readonly borrower: readonly ["CONSTRUTOR", "TOMADOR", "ADMIN"];
    readonly engineering: readonly ["ENGENHEIRO", "GESTOR_OBRA", "ADMIN"];
    readonly commercial: readonly ["COMERCIAL", "PARCEIRO", "ADMIN"];
    readonly works: readonly ["CONSTRUTOR", "TOMADOR", "GESTOR", "ENGENHEIRO", "GESTOR_OBRA", "ADMIN"];
    readonly committee: readonly ["CONSTRUTOR", "TOMADOR", "GESTOR", "ENGENHEIRO", "GESTOR_OBRA", "ADMIN"];
    readonly authenticated: readonly ["TOMADOR", "GESTOR", "GESTOR_FUNDO", "ENGENHEIRO", "GESTOR_OBRA", "COMERCIAL", "PARCEIRO", "ADMIN", "CONSTRUTOR"];
};
export declare const FEATURE_ROLE_RULES: Record<FuncaoPainel, readonly TipoUsuario[]>;
export declare const WEB_ROUTE_RULES: readonly [{
    readonly prefix: "/dashboard/admin";
    readonly roles: readonly ["ADMIN"];
}, {
    readonly prefix: "/dashboard/gestor";
    readonly roles: readonly ["GESTOR", "ADMIN"];
}, {
    readonly prefix: "/dashboard/fundos";
    readonly roles: readonly ["GESTOR", "ADMIN"];
}, {
    readonly prefix: "/dashboard/relatorios";
    readonly roles: readonly ["GESTOR", "ADMIN"];
}, {
    readonly prefix: "/dashboard/engenheiro";
    readonly roles: readonly ["ENGENHEIRO", "GESTOR_OBRA", "ADMIN"];
}, {
    readonly prefix: "/dashboard/comercial";
    readonly roles: readonly ["COMERCIAL", "PARCEIRO", "ADMIN"];
}, {
    readonly prefix: "/dashboard/construtor";
    readonly roles: readonly ["CONSTRUTOR", "TOMADOR", "ADMIN"];
}, {
    readonly prefix: "/dashboard/credito";
    readonly roles: readonly ["CONSTRUTOR", "TOMADOR", "ADMIN"];
}, {
    readonly prefix: "/dashboard/obras";
    readonly roles: readonly ["CONSTRUTOR", "TOMADOR", "GESTOR", "ENGENHEIRO", "GESTOR_OBRA", "ADMIN"];
}, {
    readonly prefix: "/dashboard/kyc";
    readonly roles: readonly ["CONSTRUTOR", "TOMADOR", "ADMIN"];
}, {
    readonly prefix: "/dashboard/score";
    readonly roles: readonly ["CONSTRUTOR", "TOMADOR", "ADMIN"];
}, {
    readonly prefix: "/dashboard/simulador";
    readonly roles: readonly ["CONSTRUTOR", "TOMADOR", "ADMIN"];
}, {
    readonly prefix: "/dashboard/comite";
    readonly roles: readonly ["CONSTRUTOR", "TOMADOR", "GESTOR", "ENGENHEIRO", "GESTOR_OBRA", "ADMIN"];
}];
export declare const MOBILE_TAB_RULES: {
    readonly engenharia: readonly ["ENGENHEIRO", "GESTOR_OBRA", "ADMIN"];
    readonly obras: readonly ["CONSTRUTOR", "TOMADOR", "GESTOR", "ENGENHEIRO", "GESTOR_OBRA", "ADMIN"];
    readonly credito: readonly ["CONSTRUTOR", "TOMADOR", "ADMIN"];
    readonly perfil: readonly ["TOMADOR", "GESTOR", "GESTOR_FUNDO", "ENGENHEIRO", "GESTOR_OBRA", "COMERCIAL", "PARCEIRO", "ADMIN", "CONSTRUTOR"];
};
export declare function isKnownUserRole(role: string | null | undefined): role is TipoUsuario;
export declare function normalizeUserRole(role: string | null | undefined): AppRole | null;
export declare const normalizeRole: typeof normalizeUserRole;
export declare function roleCanAccess(role: string | null | undefined, allowedRoles: readonly string[]): boolean;
export declare function roleCanAccessFeature(role: string | null | undefined, feature: FuncaoPainel): boolean;
export declare function roleCanAccessMobileTab(role: string | null | undefined, tab: keyof typeof MOBILE_TAB_RULES): boolean;
export declare function getRoleHome(role: string | null | undefined, fallback?: string): string;
export declare function getMobileRoleHome(role: string | null | undefined, fallback?: string): string;
export declare function isGestorRole(role: string | null | undefined): boolean;
export declare function isManagerRole(role: string | null | undefined): boolean;
