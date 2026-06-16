"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import "./layout.css";
import { useEffect, useState } from "react";
import {
  Home, HardHat, CreditCard, Calculator, Star, FileCheck2, Bell, User,
  Wrench, ShieldCheck, BarChart3, Banknote, Megaphone, Settings, LogOut,
  ChevronRight, Building2, ArrowLeft, Vote, LayoutDashboard, type LucideIcon,
} from "lucide-react";

type UserRole = "ADMIN" | "GESTOR" | "ENGENHEIRO" | "GESTOR_OBRA" | "TOMADOR" | "COMERCIAL" | "PARCEIRO" | "CONSTRUTOR" | null;
type NavItem = {
  label: string; href: string; icon: LucideIcon;
  roles: UserRole[]; section?: string; funcao?: string;
};

const WA = "5511993455589";
const NAVY = "#0C1A3D";
const MINT = "#4ADE80";

const NAV: NavItem[] = [
  { label: "Início",        href: "/dashboard",                         icon: Home,        roles: [null],                             section: "geral" },
  { label: "Painel",        href: "/dashboard/construtor",              icon: Home,        roles: ["CONSTRUTOR", "TOMADOR"],          section: "geral" },
  { label: "Minhas Obras",  href: "/dashboard/obras",                   icon: HardHat,     roles: ["TOMADOR", "CONSTRUTOR"],           funcao: "obras" },
  { label: "Crédito",       href: "/dashboard/credito",                 icon: CreditCard,  roles: ["TOMADOR", "CONSTRUTOR"],           funcao: "credito" },
  { label: "Comitê",        href: "/dashboard/comite",                  icon: Vote,        roles: ["TOMADOR", "CONSTRUTOR"],           funcao: "credito" },
  { label: "Simulador",     href: "/dashboard/simulador",               icon: Calculator,  roles: ["TOMADOR", "CONSTRUTOR"],           funcao: "simulador" },
  { label: "Score",         href: "/dashboard/score",                   icon: Star,        roles: ["TOMADOR", "CONSTRUTOR"],           funcao: "score" },
  { label: "Documentos",    href: "/dashboard/kyc",                     icon: FileCheck2,  roles: ["TOMADOR", "CONSTRUTOR"],           funcao: "kyc" },
  { label: "Painel",        href: "/dashboard/gestor",                  icon: Banknote,    roles: ["GESTOR"],        section: "geral",  funcao: "gestor" },
  { label: "Comitês",       href: "/dashboard/gestor/comite",           icon: Vote,        roles: ["GESTOR"],                          funcao: "gestor" },
  { label: "Etapas",        href: "/dashboard/gestor/etapas",           icon: FileCheck2,  roles: ["GESTOR"],                          funcao: "gestor" },
  { label: "KYC",           href: "/dashboard/gestor/kyc",              icon: FileCheck2,  roles: ["GESTOR"],                          funcao: "kyc" },
  { label: "Due Diligence", href: "/dashboard/gestor/due-diligence/nova", icon: Building2, roles: ["GESTOR"],                          funcao: "due-diligence" },
  { label: "Fundos",        href: "/dashboard/fundos",                  icon: Banknote,    roles: ["GESTOR", "GESTOR_FUNDO"],          funcao: "fundos" },
  { label: "Relatórios",    href: "/dashboard/relatorios",              icon: BarChart3,   roles: ["GESTOR", "GESTOR_FUNDO"],          funcao: "relatorios" },
  { label: "Engenharia",    href: "/dashboard/engenheiro",              icon: Wrench,      roles: ["ENGENHEIRO","GESTOR_OBRA"], section: "geral", funcao: "engenharia" },
  { label: "Pareceres",     href: "/dashboard/engenheiro/comite",       icon: Vote,        roles: ["ENGENHEIRO","GESTOR_OBRA"],        funcao: "engenharia" },
  { label: "Painel",        href: "/dashboard/comercial",               icon: Megaphone,   roles: ["COMERCIAL","PARCEIRO"], section: "geral", funcao: "comercial" },
  { label: "Leads",         href: "/dashboard/comercial/leads",         icon: Star,        roles: ["COMERCIAL","PARCEIRO"],            funcao: "comercial" },
  { label: "Notificações",  href: "/dashboard/notificacoes",            icon: Bell,        roles: ["TOMADOR","GESTOR","ENGENHEIRO","GESTOR_OBRA","COMERCIAL","PARCEIRO","ADMIN","CONSTRUTOR",null], funcao: "notificacoes" },
  { label: "Perfil",        href: "/dashboard/perfil",                  icon: User,        roles: ["TOMADOR","GESTOR","ENGENHEIRO","GESTOR_OBRA","COMERCIAL","PARCEIRO","ADMIN","CONSTRUTOR",null] },
  { label: "Visão Geral",   href: "/dashboard/admin",                   icon: LayoutDashboard, roles: ["ADMIN"],     section: "admin" },
  { label: "Pipeline",      href: "/dashboard/admin/pipeline",          icon: Banknote,    roles: ["ADMIN"] },
  { label: "Comitê",        href: "/dashboard/admin/comite",            icon: Vote,        roles: ["ADMIN"] },
  { label: "Usuários",      href: "/dashboard/admin/usuarios",          icon: User,        roles: ["ADMIN"] },
  { label: "Configurações", href: "/dashboard/admin/configuracoes",     icon: Settings,    roles: ["ADMIN"] },
  { label: "Obras",         href: "/dashboard/obras",                   icon: HardHat,     roles: ["ADMIN"],                           funcao: "obras" },
  { label: "Fundos",        href: "/dashboard/fundos",                  icon: Banknote,    roles: ["ADMIN"],                           funcao: "fundos" },
  { label: "Relatórios",    href: "/dashboard/relatorios",              icon: BarChart3,   roles: ["ADMIN"],                           funcao: "relatorios" },
];

const SECTION_LABELS: Record<string, string> = { geral: "Geral", operacional: "Operacional", admin: "Admin" };

const ROLE_META: Record<string, { label: string; accent: string }> = {
  CONSTRUTOR:  { label: "Construtor",  accent: MINT },
  TOMADOR:     { label: "Construtor",  accent: MINT },
  GESTOR:       { label: "Fundo",        accent: "#a78bfa" },
  GESTOR_FUNDO: { label: "Gestor Fundo", accent: "#a78bfa" },
  ENGENHEIRO:  { label: "Engenheiro",  accent: "#fb923c" },
  GESTOR_OBRA: { label: "Engenheiro",  accent: "#fb923c" },
  COMERCIAL:   { label: "Comercial",   accent: "#fbbf24" },
  PARCEIRO:    { label: "Comercial",   accent: "#fbbf24" },
  ADMIN:       { label: "Admin",       accent: MINT },
};

// When admin is in another role's area, show that area's nav instead.
function getNavRole(role: UserRole, path: string): UserRole {
  if (role !== "ADMIN") return role;
  const seg = path.split("/")[2] ?? "";
  if (["construtor", "credito", "kyc", "score", "simulador"].includes(seg)) return "CONSTRUTOR";
  if (seg === "comite" && !path.startsWith("/dashboard/admin")) return "CONSTRUTOR";
  if (seg === "gestor") return "GESTOR";
  if (seg === "engenheiro") return "ENGENHEIRO";
  if (seg === "comercial") return "COMERCIAL";
  return "ADMIN";
}

function filterNav(role: UserRole, path: string, funcoesBloqueadas: string[]): NavItem[] {
  const navRole = getNavRole(role, path);
  return NAV.filter((item) => {
    if (!item.roles.includes(navRole)) return false;
    if (navRole !== "ADMIN" && item.funcao && funcoesBloqueadas.includes(item.funcao)) return false;
    return true;
  });
}

// Returns the parent path for a back button, or null if at root level.
function getParentPath(path: string): string | null {
  const parts = path.split("/").filter(Boolean);
  // /dashboard or /dashboard/admin — no parent to show
  if (parts.length <= 2) return null;
  return "/" + parts.slice(0, -1).join("/");
}

function Logo({ size = 26 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size,
      border: `1.5px solid ${MINT}`,
      borderRadius: 6, display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr",
      gridTemplateRows: "1fr 1fr 1fr",
      gap: 2, padding: 4, flexShrink: 0,
    }}>
      {[0,1,2,3,4,5,6,7,8].map((i) => (
        <span key={i} style={{
          background: [1,3,5,7].includes(i) ? "transparent" : MINT,
          borderRadius: 1, display: "block",
        }} />
      ))}
    </div>
  );
}

function NavSkeleton() {
  return (
    <div style={{ padding: "0 0.75rem", display: "flex", flexDirection: "column", gap: 6 }}>
      {[80, 65, 70, 60, 75, 55].map((w, i) => (
        <div key={i} style={{
          height: 32, borderRadius: 8,
          background: "rgba(255,255,255,0.07)",
          width: `${w}%`,
          animation: "pulse 1.5s ease-in-out infinite",
        }} />
      ))}
    </div>
  );
}

function renderNav(
  items: NavItem[],
  activeFn: (href: string) => boolean,
  accent: string,
  onNavigate?: () => void,
) {
  let lastSection = "";
  return items.map((item, idx) => {
    const active = activeFn(item.href);
    const showSection = item.section && item.section !== lastSection;
    if (item.section) lastSection = item.section;
    const Icon = item.icon;
    // Use index + href as key to avoid collisions when multiple roles share same href
    return (
      <div key={`${idx}-${item.href}`}>
        {showSection && (
          <p style={{
            fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.14em",
            textTransform: "uppercase", color: "rgba(255,255,255,0.28)",
            padding: "1.25rem 0.75rem 0.35rem",
            fontFamily: "'Jost', sans-serif",
          }}>
            {SECTION_LABELS[item.section!]}
          </p>
        )}
        <Link
          href={item.href as any}
          onClick={onNavigate}
          style={{
            display: "flex", alignItems: "center", gap: "0.6rem",
            padding: "0.55rem 0.75rem",
            borderRadius: 8,
            fontSize: "0.82rem",
            fontWeight: active ? 600 : 400,
            color: active ? "#ffffff" : "rgba(255,255,255,0.5)",
            background: active ? "rgba(74,222,128,0.1)" : "transparent",
            textDecoration: "none",
            transition: "all 0.12s",
            borderLeft: active ? `2px solid ${accent}` : "2px solid transparent",
            fontFamily: "'Jost', sans-serif",
            minHeight: 44,
          }}
        >
          <Icon size={13} strokeWidth={active ? 2.2 : 1.8} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</span>
          {active && <ChevronRight size={10} style={{ opacity: 0.5 }} />}
        </Link>
      </div>
    );
  });
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [role, setRole] = useState<UserRole>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [userName, setUserName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [funcoesBloqueadas, setFuncoesBloqueadas] = useState<string[]>([]);

  useEffect(() => {
    // Try sessionStorage first (5-min TTL) to skip the network call on tab switches / reloads
    try {
      const raw = sessionStorage.getItem("imobi_auth");
      if (raw) {
        const { d, ts } = JSON.parse(raw);
        if (Date.now() - ts < 15 * 60 * 1000 && d?.authenticated) {
          setRole(d.role ?? null);
          setUserName(d.nome ?? null);
          setUserEmail(d.email ?? null);
          setFuncoesBloqueadas(Array.isArray(d.funcoesBloqueadas) ? d.funcoesBloqueadas : []);
          setRoleLoading(false);
          return;
        }
      }
    } catch { /* sessionStorage unavailable */ }

    fetch("/api/auth/me")
      .then((r) => r.ok ? r.json() : null)
      .catch(() => null)
      .then((d) => {
        if (d?.authenticated) {
          try { sessionStorage.setItem("imobi_auth", JSON.stringify({ d, ts: Date.now() })); } catch { /* ignore */ }
          setRole(d.role ?? null);
          setUserName(d.nome ?? null);
          setUserEmail(d.email ?? null);
          setFuncoesBloqueadas(Array.isArray(d.funcoesBloqueadas) ? d.funcoesBloqueadas : []);
        }
        setRoleLoading(false);
      });
  }, []);

  // Close drawer on route change
  useEffect(() => { setMobileOpen(false); }, [path]);

  const visibleNav = filterNav(role, path, funcoesBloqueadas);
  const isActive = (href: string) =>
    href === "/dashboard" ? path === href : path.startsWith(href);

  const navRole = getNavRole(role, path);
  const meta = role ? ROLE_META[role] : null;
  const navMeta = navRole ? ROLE_META[navRole] : meta;
  const accent = navMeta?.accent ?? MINT;

  const initials = userName
    ? userName.split(" ").slice(0, 2).map((n: string) => n[0]).join("").toUpperCase()
    : "?";

  const parentPath = getParentPath(path);

  const userFooter = (compact = false) => (
    <div>
      {meta && (
        <div style={{
          margin: "0 0.75rem 0.5rem",
          padding: "0.3rem 0.65rem",
          borderRadius: 6,
          background: `${accent}18`,
          border: `1px solid ${accent}30`,
          display: "flex", alignItems: "center", gap: "0.4rem",
        }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: accent, flexShrink: 0 }} />
          <span style={{ fontSize: "0.72rem", fontWeight: 700, color: accent, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "'Jost', sans-serif" }}>
            {meta.label}
          </span>
        </div>
      )}
      <div style={{
        borderTop: "1px solid rgba(255,255,255,0.07)",
        padding: compact ? "0.7rem 0.85rem" : "0.8rem 0.85rem",
        display: "flex", alignItems: "center", gap: "0.55rem",
      }}>
        <div style={{
          width: compact ? 26 : 28, height: compact ? 26 : 28, borderRadius: "50%",
          background: `${accent}22`,
          border: `1.5px solid ${accent}55`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "0.65rem", fontWeight: 700, color: accent, flexShrink: 0,
          fontFamily: "'Jost', sans-serif",
        }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: "0.74rem", fontWeight: 600, color: "white", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontFamily: "'Jost', sans-serif" }}>
            {userName ?? "Usuário"}
          </p>
          <p style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.35)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontFamily: "'Jost', sans-serif" }}>
            {userEmail ?? role ?? ""}
          </p>
        </div>
        {/* Logout — padded to 44×44 touch target */}
        <button
          onClick={async () => {
            await fetch("/api/auth/session", { method: "DELETE" });
            window.location.href = "/login";
          }}
          title="Sair"
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: "rgba(255,255,255,0.28)", flexShrink: 0,
            padding: "0.75rem 0.6rem",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "color 0.15s", margin: "-0.75rem -0.6rem",
          }}
          onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
          onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.28)")}
        >
          <LogOut size={14} />
        </button>
      </div>
    </div>
  );

  const isPreviewingOtherPanel = role === "ADMIN" && navRole !== "ADMIN";

  const sidebarContent = (onNavigate?: () => void) => (
    <>
      <div style={{ padding: "1.4rem 1rem 0.6rem" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.55rem", textDecoration: "none" }}>
          <Logo size={22} />
          <span style={{
            color: "white", fontWeight: 800, fontSize: "1.1rem",
            letterSpacing: "0.04em", fontFamily: "'Barlow Condensed', sans-serif",
          }}>IMOBI</span>
        </Link>
      </div>
      {isPreviewingOtherPanel && (
        <div style={{ margin: "0 0.75rem 0.25rem", padding: "0.4rem 0.65rem", borderRadius: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <p style={{ fontSize: "0.58rem", fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 4px", fontFamily: "'Jost', sans-serif" }}>Visualizando como</p>
          <p style={{ fontSize: "0.72rem", fontWeight: 600, color: "white", margin: "0 0 6px", fontFamily: "'Jost', sans-serif" }}>{ROLE_META[navRole ?? ""]?.label ?? navRole}</p>
          <Link href="/dashboard/admin" onClick={onNavigate} style={{ fontSize: "0.65rem", fontWeight: 600, color: MINT, textDecoration: "none", display: "flex", alignItems: "center", gap: 4, fontFamily: "'Jost', sans-serif" }}>
            <ArrowLeft size={10} /> Voltar ao Admin
          </Link>
        </div>
      )}
      <nav style={{ flex: 1, padding: "0 0.4rem", overflowY: "auto" }}>
        {roleLoading ? <NavSkeleton /> : renderNav(visibleNav, isActive, accent, onNavigate)}
      </nav>
      {userFooter(!!onNavigate)}
    </>
  );

  return (
    <div className="dash-root" style={{ display: "flex", minHeight: "100vh", background: "#EEF3FF", fontFamily: "'Jost', 'Inter', system-ui, sans-serif" }}>

      {/* Sidebar desktop */}
      <aside
        className="dash-sidebar"
        style={{
          width: 216, flexShrink: 0,
          display: "none", flexDirection: "column",
          background: NAVY,
          position: "sticky", top: 0,
          height: "100vh", overflowY: "auto",
        }}
      >
        {sidebarContent()}
      </aside>

      {/* Mobile header */}
      <div
        className="dash-mhidden"
        style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
          height: 52, background: NAVY,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 1rem",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          gap: "0.5rem",
        }}
      >
        {/* Back button on sub-pages, logo on root pages */}
        {parentPath ? (
          <button
            onClick={() => router.push(parentPath as any)}
            aria-label="Voltar"
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "white", display: "flex", alignItems: "center", gap: "0.35rem",
              padding: "0.5rem 0.6rem", minHeight: 44,
              fontSize: "0.82rem", fontFamily: "'Jost', sans-serif",
              fontWeight: 600, textDecoration: "none", flexShrink: 0,
            }}
          >
            <ArrowLeft size={18} />
          </button>
        ) : (
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.5rem", textDecoration: "none", flexShrink: 0 }}>
            <Logo size={20} />
            <span style={{ color: "white", fontWeight: 800, fontSize: "1rem", letterSpacing: "0.04em", fontFamily: "'Barlow Condensed', sans-serif" }}>IMOBI</span>
          </Link>
        )}

        {/* Center: logo when on sub-page */}
        {parentPath && (
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.4rem", textDecoration: "none", flex: 1, justifyContent: "center" }}>
            <Logo size={18} />
            <span style={{ color: "white", fontWeight: 800, fontSize: "0.95rem", letterSpacing: "0.04em", fontFamily: "'Barlow Condensed', sans-serif" }}>IMOBI</span>
          </Link>
        )}

        {/* Hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Menu"
          style={{
            background: "none", border: "none", cursor: "pointer",
            width: 44, height: 44, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: 4.5, flexShrink: 0,
          }}
        >
          {[
            mobileOpen ? "rotate(45deg) translate(4.5px,4.5px)" : "none",
            "none",
            mobileOpen ? "rotate(-45deg) translate(4.5px,-4.5px)" : "none",
          ].map((transform, i) => (
            <span key={i} style={{
              display: "block", width: 20, height: 1.5,
              background: "rgba(255,255,255,0.75)", borderRadius: 2,
              transition: "all 0.2s",
              transform,
              opacity: i === 1 && mobileOpen ? 0 : 1,
            }} />
          ))}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div onClick={() => setMobileOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(12,26,61,0.6)", zIndex: 150 }} />
          <div style={{
            position: "fixed", top: 52, left: 0, bottom: 0,
            width: "min(224px, calc(100vw - 48px))",
            background: NAVY, zIndex: 200,
            overflowY: "auto", display: "flex", flexDirection: "column",
          }}>
            {sidebarContent(() => setMobileOpen(false))}
          </div>
        </>
      )}

      {/* Main */}
      <main className="dash-main" style={{ flex: 1, overflowX: "hidden" }}>
        <div style={{ height: 52 }} className="dash-spacer" />
        {children}
      </main>

      {/* WhatsApp */}
      <a
        href={`https://wa.me/${WA}?text=Olá!%20Preciso%20de%20ajuda%20com%20o%20IMOBI.`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Suporte via WhatsApp"
        style={{
          position: "fixed", bottom: 24, right: 24,
          width: 44, height: 44, borderRadius: "50%",
          backgroundColor: "#25D366", display: "flex",
          alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 16px rgba(37,211,102,0.35)",
          zIndex: 50, textDecoration: "none",
        }}
      >
        <svg viewBox="0 0 24 24" fill="white" width={22} height={22}>
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </a>

    </div>
  );
}
