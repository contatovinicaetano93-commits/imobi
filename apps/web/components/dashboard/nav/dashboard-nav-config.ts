import type { Route } from "next";
import {
  Home, HardHat, CreditCard, Calculator, Star, FileCheck2, Bell, User,
  Wrench, ShieldCheck, BarChart3, Banknote, Megaphone, Settings, Vote,
  LayoutDashboard, Building2, type LucideIcon,
} from "lucide-react";

export type DashboardUserRole =
  | "ADMIN"
  | "GESTOR"
  | "GESTOR_FUNDO"
  | "ENGENHEIRO"
  | "GESTOR_OBRA"
  | "TOMADOR"
  | "COMERCIAL"
  | "PARCEIRO"
  | "CONSTRUTOR"
  | null;

export type DashboardNavItem = {
  label: string;
  href: Route;
  icon: LucideIcon;
  roles: DashboardUserRole[];
  section?: string;
  funcao?: string;
  /** Shown in mobile bottom tab bar (max 5 per role). */
  mobileTab?: boolean;
};

export const DASHBOARD_NAVY = "#0C1A3D";
export const DASHBOARD_MINT = "#4ADE80";

export const DASHBOARD_NAV: DashboardNavItem[] = [
  { label: "Painel", href: "/dashboard/construtor", icon: Home, roles: ["CONSTRUTOR", "TOMADOR"], section: "geral", mobileTab: true },
  { label: "Documentos", href: "/dashboard/kyc", icon: FileCheck2, roles: ["TOMADOR", "CONSTRUTOR"], funcao: "kyc", mobileTab: true },
  { label: "Simulador", href: "/dashboard/simulador", icon: Calculator, roles: ["TOMADOR", "CONSTRUTOR"], funcao: "simulador" },
  { label: "Crédito", href: "/dashboard/credito", icon: CreditCard, roles: ["TOMADOR", "CONSTRUTOR"], funcao: "credito", mobileTab: true },
  { label: "Comitê", href: "/dashboard/comite", icon: Vote, roles: ["TOMADOR", "CONSTRUTOR"], funcao: "credito" },
  { label: "Minhas Obras", href: "/dashboard/obras", icon: HardHat, roles: ["TOMADOR", "CONSTRUTOR"], funcao: "obras", mobileTab: true },
  { label: "Score", href: "/dashboard/score", icon: Star, roles: ["TOMADOR", "CONSTRUTOR"], funcao: "score" },
  { label: "Painel do Fundo", href: "/dashboard/gestor", icon: Banknote, roles: ["GESTOR", "GESTOR_FUNDO"], section: "geral", funcao: "gestor", mobileTab: true },
  { label: "Comitês", href: "/dashboard/gestor/comite", icon: Vote, roles: ["GESTOR", "GESTOR_FUNDO"], funcao: "gestor", mobileTab: true },
  { label: "Monitorar etapas", href: "/dashboard/gestor/etapas", icon: FileCheck2, roles: ["GESTOR", "GESTOR_FUNDO"], funcao: "gestor" },
  { label: "Monitorar KYC", href: "/dashboard/gestor/kyc", icon: FileCheck2, roles: ["GESTOR", "GESTOR_FUNDO"], funcao: "kyc", mobileTab: true },
  { label: "Due Diligence", href: "/dashboard/gestor/due-diligence", icon: Building2, roles: ["GESTOR", "GESTOR_FUNDO"], funcao: "due-diligence" },
  { label: "Portfolio", href: "/dashboard/gestor/fundos", icon: Banknote, roles: ["GESTOR", "GESTOR_FUNDO"], funcao: "fundos", mobileTab: true },
  { label: "Relatórios", href: "/dashboard/relatorios", icon: BarChart3, roles: ["GESTOR", "GESTOR_FUNDO"], funcao: "relatorios" },
  { label: "Engenharia", href: "/dashboard/engenheiro", icon: Wrench, roles: ["ENGENHEIRO", "GESTOR_OBRA"], section: "geral", funcao: "engenharia", mobileTab: true },
  { label: "Pareceres", href: "/dashboard/engenheiro/comite", icon: Vote, roles: ["ENGENHEIRO", "GESTOR_OBRA"], funcao: "engenharia", mobileTab: true },
  { label: "Painel", href: "/dashboard/comercial", icon: Megaphone, roles: ["COMERCIAL", "PARCEIRO"], section: "geral", funcao: "comercial", mobileTab: true },
  { label: "Leads", href: "/dashboard/comercial/leads", icon: Star, roles: ["COMERCIAL", "PARCEIRO"], funcao: "comercial", mobileTab: true },
  { label: "Notificações", href: "/dashboard/notificacoes", icon: Bell, roles: ["TOMADOR", "GESTOR", "GESTOR_FUNDO", "ENGENHEIRO", "GESTOR_OBRA", "COMERCIAL", "PARCEIRO", "ADMIN", "CONSTRUTOR", null], funcao: "notificacoes" },
  { label: "Perfil", href: "/dashboard/perfil", icon: User, roles: ["TOMADOR", "GESTOR", "GESTOR_FUNDO", "ENGENHEIRO", "GESTOR_OBRA", "COMERCIAL", "PARCEIRO", "ADMIN", "CONSTRUTOR", null], mobileTab: true },
  { label: "Visão Geral", href: "/dashboard/admin", icon: LayoutDashboard, roles: ["ADMIN"], section: "admin", mobileTab: true },
  { label: "Pipeline", href: "/dashboard/admin/pipeline", icon: Banknote, roles: ["ADMIN"], mobileTab: true },
  { label: "Comitê", href: "/dashboard/admin/comite", icon: Vote, roles: ["ADMIN"] },
  { label: "Liberar etapas", href: "/dashboard/gestor/etapas", icon: FileCheck2, roles: ["ADMIN"] },
  { label: "KYC operacional", href: "/dashboard/gestor/kyc", icon: ShieldCheck, roles: ["ADMIN"] },
  { label: "Usuários", href: "/dashboard/admin/usuarios", icon: User, roles: ["ADMIN"], mobileTab: true },
  { label: "Configurações", href: "/dashboard/admin/configuracoes", icon: Settings, roles: ["ADMIN"] },
  { label: "Obras", href: "/dashboard/obras", icon: HardHat, roles: ["ADMIN"], section: "explorar", funcao: "obras" },
  { label: "Portfolio", href: "/dashboard/gestor/fundos", icon: Banknote, roles: ["ADMIN"], section: "explorar", funcao: "fundos" },
  { label: "Relatórios", href: "/dashboard/relatorios", icon: BarChart3, roles: ["ADMIN"], section: "explorar", funcao: "relatorios" },
];

export const NAV_SECTION_LABELS: Record<string, string> = {
  geral: "Geral",
  operacional: "Operacional",
  admin: "Admin",
  explorar: "Explorar",
};

export const ROLE_META: Record<string, { label: string; accent: string }> = {
  CONSTRUTOR: { label: "Construtor", accent: DASHBOARD_MINT },
  TOMADOR: { label: "Construtor", accent: DASHBOARD_MINT },
  GESTOR: { label: "Gestor de Fundo", accent: "#a78bfa" },
  GESTOR_FUNDO: { label: "Gestor de Fundo", accent: "#a78bfa" },
  ENGENHEIRO: { label: "Engenheiro", accent: "#fb923c" },
  GESTOR_OBRA: { label: "Engenheiro", accent: "#fb923c" },
  COMERCIAL: { label: "Comercial", accent: "#fbbf24" },
  PARCEIRO: { label: "Comercial", accent: "#fbbf24" },
  ADMIN: { label: "Admin", accent: DASHBOARD_MINT },
};

export function getNavRole(role: DashboardUserRole, path: string): DashboardUserRole {
  const base = role === "GESTOR_FUNDO" ? "GESTOR" : role;
  if (base !== "ADMIN") return base;
  const seg = path.split("/")[2] ?? "";
  if (["construtor", "credito", "kyc", "score", "simulador"].includes(seg)) return "CONSTRUTOR";
  if (seg === "comite" && !path.startsWith("/dashboard/admin")) return "CONSTRUTOR";
  if (seg === "gestor" || seg === "relatorios") return "GESTOR";
  if (seg === "engenheiro") return "ENGENHEIRO";
  if (seg === "comercial") return "COMERCIAL";
  return "ADMIN";
}

function itemMatchesNavRole(item: DashboardNavItem, navRole: DashboardUserRole): boolean {
  if (item.roles.includes(navRole)) return true;
  if (navRole === "GESTOR" && item.roles.includes("GESTOR_FUNDO")) return true;
  return false;
}

export function filterDashboardNav(
  role: DashboardUserRole,
  path: string,
  funcoesBloqueadas: string[],
): DashboardNavItem[] {
  const navRole = getNavRole(role, path);
  return DASHBOARD_NAV.filter((item) => {
    if (!itemMatchesNavRole(item, navRole)) return false;
    if (navRole !== "ADMIN" && item.funcao && funcoesBloqueadas.includes(item.funcao)) return false;
    return true;
  });
}

export function getParentPath(path: string): Route | null {
  const parts = path.split("/").filter(Boolean);
  if (parts.length <= 2) return null;
  return (`/${parts.slice(0, -1).join("/")}`) as Route;
}

export function isNavActive(path: string, href: string): boolean {
  return href === "/dashboard" ? path === href : path.startsWith(href);
}

export function getMobileTabNav(items: DashboardNavItem[]): DashboardNavItem[] {
  const tabs = items.filter((i) => i.mobileTab);
  if (tabs.length > 0) return tabs.slice(0, 5);
  return items.filter((i) => i.label !== "Notificações").slice(0, 5);
}
