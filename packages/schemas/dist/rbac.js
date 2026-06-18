"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeRole = exports.MOBILE_TAB_RULES = exports.WEB_ROUTE_RULES = exports.FEATURE_ROLE_RULES = exports.RBAC_ROLE_GROUPS = exports.MANAGER_WRITE_ROLES = exports.MANAGER_READ_ROLES = exports.MANAGER_ROLES = exports.MOBILE_ROLE_HOME = exports.ROLE_HOME = exports.ROLE_LABELS = exports.CANONICAL_PRODUCT_ROLES = exports.GESTOR_LEGACY_ALIAS = void 0;
exports.isKnownUserRole = isKnownUserRole;
exports.normalizeUserRole = normalizeUserRole;
exports.roleCanAccess = roleCanAccess;
exports.roleCanAccessFeature = roleCanAccessFeature;
exports.roleCanAccessMobileTab = roleCanAccessMobileTab;
exports.getRoleHome = getRoleHome;
exports.getMobileRoleHome = getMobileRoleHome;
exports.isGestorRole = isGestorRole;
exports.isManagerRole = isManagerRole;
const usuario_schema_1 = require("./usuario.schema");
exports.GESTOR_LEGACY_ALIAS = "GESTOR_FUNDO";
exports.CANONICAL_PRODUCT_ROLES = [
    "TOMADOR",
    "ADMIN",
    "GESTOR",
    "ENGENHEIRO",
    "COMERCIAL",
];
exports.ROLE_LABELS = {
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
exports.ROLE_HOME = {
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
exports.MOBILE_ROLE_HOME = {
    ADMIN: "/(tabs)/obras",
    GESTOR: "/(tabs)/obras",
    GESTOR_FUNDO: "/(tabs)/obras",
    ENGENHEIRO: "/(tabs)/engenheiro",
    GESTOR_OBRA: "/(tabs)/engenheiro",
    COMERCIAL: "/(tabs)/perfil",
    PARCEIRO: "/(tabs)/perfil",
    TOMADOR: "/(tabs)/obras",
    CONSTRUTOR: "/(tabs)/obras",
};
exports.MANAGER_ROLES = ["GESTOR", "ADMIN"];
exports.MANAGER_READ_ROLES = exports.MANAGER_ROLES;
exports.MANAGER_WRITE_ROLES = exports.MANAGER_ROLES;
exports.RBAC_ROLE_GROUPS = {
    admin: ["ADMIN"],
    manager: exports.MANAGER_ROLES,
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
};
exports.FEATURE_ROLE_RULES = {
    obras: exports.RBAC_ROLE_GROUPS.works,
    credito: exports.RBAC_ROLE_GROUPS.borrower,
    simulador: exports.RBAC_ROLE_GROUPS.borrower,
    score: exports.RBAC_ROLE_GROUPS.borrower,
    kyc: exports.RBAC_ROLE_GROUPS.borrower,
    notificacoes: exports.RBAC_ROLE_GROUPS.authenticated,
    engenharia: exports.RBAC_ROLE_GROUPS.engineering,
    gestor: exports.RBAC_ROLE_GROUPS.manager,
    "due-diligence": exports.RBAC_ROLE_GROUPS.manager,
    fundos: exports.RBAC_ROLE_GROUPS.manager,
    relatorios: exports.RBAC_ROLE_GROUPS.manager,
    comercial: exports.RBAC_ROLE_GROUPS.commercial,
    construtor: exports.RBAC_ROLE_GROUPS.borrower,
};
exports.WEB_ROUTE_RULES = [
    { prefix: "/dashboard/admin", roles: exports.RBAC_ROLE_GROUPS.admin },
    { prefix: "/dashboard/gestor", roles: exports.RBAC_ROLE_GROUPS.manager },
    { prefix: "/dashboard/fundos", roles: exports.RBAC_ROLE_GROUPS.manager },
    { prefix: "/dashboard/relatorios", roles: exports.RBAC_ROLE_GROUPS.manager },
    { prefix: "/dashboard/engenheiro", roles: exports.RBAC_ROLE_GROUPS.engineering },
    { prefix: "/dashboard/comercial", roles: exports.RBAC_ROLE_GROUPS.commercial },
    { prefix: "/dashboard/construtor", roles: exports.RBAC_ROLE_GROUPS.borrower },
    { prefix: "/dashboard/credito", roles: exports.RBAC_ROLE_GROUPS.borrower },
    { prefix: "/dashboard/obras", roles: exports.RBAC_ROLE_GROUPS.works },
    { prefix: "/dashboard/kyc", roles: exports.RBAC_ROLE_GROUPS.borrower },
    { prefix: "/dashboard/score", roles: exports.RBAC_ROLE_GROUPS.borrower },
    { prefix: "/dashboard/simulador", roles: exports.RBAC_ROLE_GROUPS.borrower },
    { prefix: "/dashboard/comite", roles: exports.RBAC_ROLE_GROUPS.committee },
];
exports.MOBILE_TAB_RULES = {
    engenharia: exports.RBAC_ROLE_GROUPS.engineering,
    obras: exports.RBAC_ROLE_GROUPS.works,
    credito: exports.RBAC_ROLE_GROUPS.borrower,
    perfil: exports.RBAC_ROLE_GROUPS.authenticated,
};
function isKnownUserRole(role) {
    return !!role && usuario_schema_1.TipoUsuarioEnum.options.includes(role);
}
function normalizeUserRole(role) {
    if (!role)
        return null;
    if (role === exports.GESTOR_LEGACY_ALIAS)
        return "GESTOR";
    return isKnownUserRole(role) ? role : null;
}
exports.normalizeRole = normalizeUserRole;
function roleCanAccess(role, allowedRoles) {
    const normalizedRole = normalizeUserRole(role);
    if (!normalizedRole)
        return false;
    return allowedRoles.some((allowedRole) => normalizeUserRole(allowedRole) === normalizedRole);
}
function roleCanAccessFeature(role, feature) {
    return roleCanAccess(role, exports.FEATURE_ROLE_RULES[feature]);
}
function roleCanAccessMobileTab(role, tab) {
    return roleCanAccess(role, exports.MOBILE_TAB_RULES[tab]);
}
function getRoleHome(role, fallback = "/dashboard") {
    const normalizedRole = normalizeUserRole(role);
    return normalizedRole ? exports.ROLE_HOME[normalizedRole] ?? fallback : fallback;
}
function getMobileRoleHome(role, fallback = "/(tabs)/obras") {
    const normalizedRole = normalizeUserRole(role);
    return normalizedRole ? exports.MOBILE_ROLE_HOME[normalizedRole] ?? fallback : fallback;
}
function isGestorRole(role) {
    return normalizeUserRole(role) === "GESTOR";
}
function isManagerRole(role) {
    return roleCanAccess(role, exports.MANAGER_ROLES);
}
