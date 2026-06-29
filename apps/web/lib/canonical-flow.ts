/**
 * Fluxo canônico Imobi — fonte única para nav, rotas permitidas e redirects.
 * Ver docs/FLUXO_CANONICO.md
 */

import type { LucideIcon } from "lucide-react";
import {
  Home,
  HardHat,
  CreditCard,
  FileCheck2,
  Calculator,
  MapPin,
  Vote,
  LayoutDashboard,
  Inbox,
  FileText,
  Building2,
  Banknote,
  User,
  Bell,
  BarChart3,
  TrendingUp,
} from "lucide-react";

export type CanonicalRole =
  | "TOMADOR"
  | "CONSTRUTOR"
  | "GESTOR"
  | "ENGENHEIRO"
  | "GESTOR_OBRA"
  | "ADMIN"
  | "COMERCIAL"
  | "PARCEIRO";

export type NavItemDef = {
  label: string;
  href: string;
  icon: LucideIcon;
  section?: "geral" | "operacao" | "conta";
};

/** Rotas legadas → destino canônico (bookmarks antigos) */
export const LEGACY_REDIRECTS: Record<string, string> = {
  "/dashboard": "/dashboard/construtor",
};

/** Prefixos legados (qualquer subpath) */
export const LEGACY_PREFIX_REDIRECTS: Array<{ prefix: string; to: string }> = [
  { prefix: "/dashboard/simulador", to: "/dashboard/proposta-credito" },
  { prefix: "/dashboard/score", to: "/dashboard/construtor" },
  { prefix: "/dashboard/comite", to: "/dashboard/credito/solicitar" },
  { prefix: "/dashboard/viabilidade", to: "/dashboard/proposta-credito" },
  { prefix: "/dashboard/fundos", to: "/dashboard/gestor" },
  { prefix: "/dashboard/relatorios", to: "/dashboard/admin" },
  { prefix: "/dashboard/gestor/due-diligence", to: "/dashboard/gestor" },
  { prefix: "/dashboard/gestor/carteira", to: "/dashboard/gestor" },
  { prefix: "/dashboard/gestor/comite", to: "/dashboard/gestor" },
  { prefix: "/dashboard/engenheiro/checklist", to: "/dashboard/engenheiro/vistoria" },
  { prefix: "/dashboard/engenheiro/alertas", to: "/dashboard/engenheiro/vistoria" },
];

const ACCOUNT: NavItemDef[] = [
  { label: "Notificações", href: "/dashboard/notificacoes", icon: Bell, section: "conta" },
  { label: "Perfil", href: "/dashboard/perfil", icon: User, section: "conta" },
];

export const CANONICAL_NAV: Record<string, NavItemDef[]> = {
  TOMADOR: [
    { label: "Minha jornada", href: "/dashboard/construtor", icon: Home, section: "geral" },
    { label: "Documentos (KYC)", href: "/dashboard/kyc", icon: FileCheck2, section: "operacao" },
    { label: "Viabilidade", href: "/dashboard/proposta-credito", icon: Calculator, section: "operacao" },
    { label: "Obras", href: "/dashboard/obras", icon: HardHat, section: "operacao" },
    { label: "Crédito", href: "/dashboard/credito", icon: CreditCard, section: "operacao" },
    ...ACCOUNT,
  ],
  CONSTRUTOR: [], // preenchido abaixo
  GESTOR: [
    { label: "Visão geral", href: "/dashboard/gestor", icon: BarChart3, section: "geral" },
    { label: "KPI · KYC", href: "/dashboard/gestor/kyc", icon: FileCheck2, section: "operacao" },
    { label: "KPI · Etapas", href: "/dashboard/gestor/etapas", icon: Building2, section: "operacao" },
    ...ACCOUNT,
  ],
  ENGENHEIRO: [
    { label: "Vistorias", href: "/dashboard/engenheiro/vistoria", icon: MapPin, section: "geral" },
    { label: "Obras · evidências", href: "/dashboard/obras", icon: HardHat, section: "operacao" },
    { label: "Comitê (parecer)", href: "/dashboard/engenheiro/comite", icon: Vote, section: "operacao" },
    ...ACCOUNT,
  ],
  GESTOR_OBRA: [], // alias eng
  COMERCIAL: [
    { label: "Painel comercial", href: "/dashboard/comercial", icon: Banknote, section: "geral" },
    { label: "Leads", href: "/dashboard/comercial/leads", icon: Inbox, section: "operacao" },
    { label: "Ranking", href: "/dashboard/comercial/ranking", icon: TrendingUp, section: "operacao" },
    ...ACCOUNT,
  ],
  PARCEIRO: [], // alias abaixo
  ADMIN: [
    { label: "Centro de comando", href: "/dashboard/admin", icon: LayoutDashboard, section: "geral" },
    { label: "Pipeline", href: "/dashboard/admin/pipeline", icon: Banknote, section: "operacao" },
    { label: "Propostas", href: "/dashboard/admin/propostas", icon: Inbox, section: "operacao" },
    { label: "KYC", href: "/dashboard/admin/kyc", icon: FileCheck2, section: "operacao" },
    { label: "Viabilidade", href: "/dashboard/admin/viabilidade", icon: FileText, section: "operacao" },
    { label: "Obras", href: "/dashboard/admin/obras", icon: HardHat, section: "operacao" },
    { label: "Vistorias", href: "/dashboard/admin/vistorias", icon: MapPin, section: "operacao" },
    { label: "Comitê", href: "/dashboard/admin/comite", icon: Vote, section: "operacao" },
    { label: "Usuários", href: "/dashboard/admin/usuarios", icon: User, section: "operacao" },
    ...ACCOUNT,
  ],
};

CANONICAL_NAV.CONSTRUTOR = CANONICAL_NAV.TOMADOR;
CANONICAL_NAV.GESTOR_OBRA = CANONICAL_NAV.ENGENHEIRO;
CANONICAL_NAV.PARCEIRO = CANONICAL_NAV.COMERCIAL;

/** Prefixos permitidos por perfil (middleware + nav) */
export const CANONICAL_PREFIXES: Record<string, readonly string[]> = {
  TOMADOR: [
    "/dashboard/construtor",
    "/dashboard/kyc",
    "/dashboard/proposta-credito",
    "/dashboard/obras",
    "/dashboard/credito",
    "/dashboard/perfil",
    "/dashboard/notificacoes",
  ],
  CONSTRUTOR: [],
  GESTOR: [
    "/dashboard/gestor",
    "/dashboard/perfil",
    "/dashboard/notificacoes",
  ],
  ENGENHEIRO: [
    "/dashboard/engenheiro",
    "/dashboard/obras",
    "/dashboard/perfil",
    "/dashboard/notificacoes",
  ],
  GESTOR_OBRA: [],
  ADMIN: [
    "/dashboard/admin",
    "/dashboard/obras",
    "/dashboard/perfil",
    "/dashboard/notificacoes",
  ],
  COMERCIAL: [
    "/dashboard/comercial",
    "/dashboard/perfil",
    "/dashboard/notificacoes",
  ],
  PARCEIRO: [],
};

CANONICAL_PREFIXES.CONSTRUTOR = CANONICAL_PREFIXES.TOMADOR;
CANONICAL_PREFIXES.GESTOR_OBRA = CANONICAL_PREFIXES.ENGENHEIRO;
CANONICAL_PREFIXES.PARCEIRO = CANONICAL_PREFIXES.COMERCIAL;

function matchesPrefix(path: string, prefixes: readonly string[]): boolean {
  return prefixes.some((p) => path === p || path.startsWith(`${p}/`));
}

export function getCanonicalNav(role: string | null): NavItemDef[] {
  if (!role) return ACCOUNT;
  const key = role in CANONICAL_NAV ? role : null;
  return key ? CANONICAL_NAV[key] : ACCOUNT;
}

export function resolveLegacyRedirect(pathname: string): string | null {
  if (LEGACY_REDIRECTS[pathname]) return LEGACY_REDIRECTS[pathname];
  for (const { prefix, to } of LEGACY_PREFIX_REDIRECTS) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return to;
  }
  return null;
}

/** Bloqueia rotas fora do fluxo canônico (lançamento). */
export function isCanonicalRouteAllowed(pathname: string, role: string | null): boolean {
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/web-api/") ||
    !pathname.startsWith("/dashboard")
  ) {
    return true;
  }

  const legacy = resolveLegacyRedirect(pathname);
  if (legacy) return true; // middleware redireciona antes

  if (!role) return matchesPrefix(pathname, ["/dashboard/perfil", "/dashboard/notificacoes"]);

  const prefixes = CANONICAL_PREFIXES[role];
  if (!prefixes) return false;
  return matchesPrefix(pathname, prefixes);
}

export function isCanonicalNavHref(href: string, role: string | null): boolean {
  if (!role) return true;
  const nav = getCanonicalNav(role);
  return nav.some((item) => item.href === href || href.startsWith(`${item.href}/`));
}
