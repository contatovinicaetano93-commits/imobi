/**
 * Fluxo canônico Imobi — fonte única para nav e rotas permitidas.
 * Ver docs/FLUXO_CANONICO.md — 4 papéis, sem aliases.
 */

import type { LucideIcon } from "lucide-react";
import { Home, FileCheck2, HardHat, LayoutDashboard, BarChart3, User, Bell } from "lucide-react";
import type { AppRole } from "./role-permissions";

export type NavItemDef = {
  label: string;
  href: string;
  icon: LucideIcon;
  section?: "geral" | "operacao" | "conta";
};

/** Rotas públicas (marketing + auth) — fonte única, sem login. */
export const PUBLIC_MARKETING_PATHS = [
  "/",
  "/login",
  "/cadastro",
  "/esqueceu-senha",
  "/redefinir-senha",
  "/termos",
  "/privacy-policy",
  "/quem-somos",
  "/como-funciona",
  "/contato",
] as const;

const ACCOUNT: NavItemDef[] = [
  { label: "Notificações", href: "/dashboard/notificacoes", icon: Bell, section: "conta" },
  { label: "Perfil", href: "/dashboard/perfil", icon: User, section: "conta" },
];

/** Nav por papel — 1 fonte, sem duplicar em prefixos separados. */
export const CANONICAL_NAV: Record<AppRole, NavItemDef[]> = {
  CLIENTE: [
    { label: "Minha jornada", href: "/dashboard/cliente", icon: Home, section: "geral" },
    { label: "Documentos", href: "/dashboard/cliente/documentos", icon: FileCheck2, section: "operacao" },
    { label: "Minha obra", href: "/dashboard/cliente/obra", icon: HardHat, section: "operacao" },
    ...ACCOUNT,
  ],
  ENGENHEIRO: [
    { label: "Minhas obras", href: "/dashboard/engenheiro", icon: HardHat, section: "geral" },
    ...ACCOUNT,
  ],
  FUNDO: [
    { label: "Dashboard", href: "/dashboard/fundo", icon: BarChart3, section: "geral" },
    ...ACCOUNT,
  ],
  ADMIN: [
    { label: "Centro de comando", href: "/dashboard/admin", icon: LayoutDashboard, section: "geral" },
    { label: "Usuários", href: "/dashboard/admin/usuarios", icon: User, section: "operacao" },
    ...ACCOUNT,
  ],
};

/** Prefixos permitidos por papel — derivados do próprio nav, sem lista duplicada. */
const EXTRA_PREFIXES: Partial<Record<AppRole, string[]>> = {
  ADMIN: ["/dashboard/admin"],
};

function buildPrefixes(role: AppRole): string[] {
  const fromNav = CANONICAL_NAV[role].map((item) => item.href);
  return [...fromNav, ...(EXTRA_PREFIXES[role] ?? [])];
}

export const CANONICAL_PREFIXES: Record<AppRole, readonly string[]> = {
  CLIENTE: buildPrefixes("CLIENTE"),
  ENGENHEIRO: buildPrefixes("ENGENHEIRO"),
  FUNDO: buildPrefixes("FUNDO"),
  ADMIN: buildPrefixes("ADMIN"),
};

function matchesPrefix(path: string, prefixes: readonly string[]): boolean {
  return prefixes.some((p) => path === p || path.startsWith(`${p}/`));
}

export function getCanonicalNav(role: AppRole | null): NavItemDef[] {
  if (!role) return ACCOUNT;
  return CANONICAL_NAV[role] ?? ACCOUNT;
}

/** Bloqueia rotas fora do fluxo canônico. */
export function isCanonicalRouteAllowed(pathname: string, role: AppRole | null): boolean {
  if (pathname.startsWith("/api/") || pathname.startsWith("/web-api/") || !pathname.startsWith("/dashboard")) {
    return true;
  }
  if (!role) return matchesPrefix(pathname, ["/dashboard/perfil", "/dashboard/notificacoes"]);
  return matchesPrefix(pathname, CANONICAL_PREFIXES[role]);
}

export function isCanonicalNavHref(href: string, role: AppRole | null): boolean {
  if (!role) return true;
  return getCanonicalNav(role).some((item) => item.href === href || href.startsWith(`${item.href}/`));
}
