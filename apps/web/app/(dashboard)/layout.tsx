"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Home,
  HardHat,
  CreditCard,
  Calculator,
  Star,
  FileCheck2,
  Bell,
  User,
  Wrench,
  ShieldCheck,
  BarChart3,
  Banknote,
  Megaphone,
  Settings,
  LogOut,
  ChevronRight,
  Building2,
} from "lucide-react";

type UserRole = "ADMIN" | "GESTOR" | "ENGENHEIRO" | "TOMADOR" | "COMERCIAL" | "CONSTRUTOR" | null;

type NavItem = {
  label: string;
  href: string;
  icon: React.FC<{ size?: number; strokeWidth?: number; className?: string }>;
  roles: UserRole[];
  section?: string;
};

const WA = "5511993455589";

const NAV: NavItem[] = [
  { label: "Início",        href: "/dashboard",              icon: Home,        roles: ["TOMADOR", "ADMIN", "CONSTRUTOR", null], section: "geral" },
  { label: "Minhas Obras",  href: "/dashboard/obras",        icon: HardHat,     roles: ["TOMADOR", "ADMIN", "CONSTRUTOR"] },
  { label: "Crédito",       href: "/dashboard/credito",      icon: CreditCard,  roles: ["TOMADOR", "ADMIN"] },
  { label: "Simulador",     href: "/dashboard/simulador",    icon: Calculator,  roles: ["TOMADOR", "ADMIN"] },
  { label: "Score",         href: "/dashboard/score",        icon: Star,        roles: ["TOMADOR", "ADMIN"] },
  { label: "Documentos",    href: "/dashboard/kyc",          icon: FileCheck2,  roles: ["TOMADOR", "ADMIN"] },
  { label: "Notificações",  href: "/dashboard/notificacoes", icon: Bell,        roles: ["TOMADOR", "GESTOR", "ENGENHEIRO", "COMERCIAL", "ADMIN", "CONSTRUTOR", null] },
  { label: "Perfil",        href: "/dashboard/perfil",       icon: User,        roles: ["TOMADOR", "GESTOR", "ENGENHEIRO", "COMERCIAL", "ADMIN", "CONSTRUTOR", null] },
  { label: "Vistorias",     href: "/dashboard/engenheiro",   icon: Wrench,      roles: ["ENGENHEIRO", "ADMIN"],   section: "operacional" },
  { label: "Painel Gestor", href: "/dashboard/gestor",       icon: ShieldCheck, roles: ["GESTOR", "ADMIN"] },
  { label: "Fundos",        href: "/dashboard/fundos",       icon: Banknote,    roles: ["GESTOR", "ADMIN"] },
  { label: "Relatórios",    href: "/dashboard/relatorios",   icon: BarChart3,   roles: ["GESTOR", "ADMIN"] },
  { label: "Comercial",     href: "/dashboard/comercial",    icon: Megaphone,   roles: ["COMERCIAL", "ADMIN"] },
  { label: "Construtor",    href: "/dashboard/construtor",   icon: Building2,   roles: ["CONSTRUTOR", "ADMIN"] },
  { label: "Administração", href: "/dashboard/admin",        icon: Settings,    roles: ["ADMIN"],                 section: "admin" },
];

const SECTION_LABELS: Record<string, string> = {
  geral:       "Geral",
  operacional: "Operacional",
  admin:       "Sistema",
};

function filterNav(role: UserRole): NavItem[] {
  return NAV.filter((item) => item.roles.includes(role));
}

function Logo({ size = 28, white = false }: { size?: number; white?: boolean }) {
  const fill = white ? "rgba(255,255,255,0.92)" : "#1B4FD8";
  const border = white ? "rgba(255,255,255,0.35)" : "#1B4FD8";
  return (
    <div style={{
      width: size, height: size, border: `1.5px solid ${border}`,
      borderRadius: 7, display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr",
      gridTemplateRows: "1fr 1fr 1fr",
      gap: 2.5, padding: 4.5, flexShrink: 0,
    }}>
      {[0,1,2,3,4,5,6,7,8].map((i) => (
        <span key={i} style={{
          background: [1,3,5,7].includes(i) ? "transparent" : fill,
          borderRadius: 1.5, display: "block",
        }} />
      ))}
    </div>
  );
}

function renderNav(
  items: NavItem[],
  activeFn: (href: string) => boolean,
  onNavigate?: () => void,
) {
  let lastSection = "";
  return items.map((item) => {
    const active = activeFn(item.href);
    const showSection = item.section && item.section !== lastSection;
    if (item.section) lastSection = item.section;
    const Icon = item.icon;
    return (
      <div key={item.href}>
        {showSection && (
          <p style={{
            fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.1em",
            textTransform: "uppercase", color: "rgba(255,255,255,0.35)",
            padding: "1.1rem 0.75rem 0.4rem",
          }}>
            {SECTION_LABELS[item.section!]}
          </p>
        )}
        <a
          href={item.href}
          onClick={onNavigate}
          style={{
            display: "flex", alignItems: "center", gap: "0.65rem",
            padding: "0.5rem 0.75rem",
            borderRadius: 10,
            fontSize: "0.82rem",
            fontWeight: active ? 600 : 400,
            letterSpacing: active ? "-0.01em" : "0",
            color: active ? "#ffffff" : "rgba(255,255,255,0.55)",
            background: active ? "rgba(255,255,255,0.12)" : "transparent",
            textDecoration: "none",
            transition: "all 0.12s",
            borderLeft: active ? "2.5px solid #16a34a" : "2.5px solid transparent",
            paddingLeft: active ? "0.65rem" : "0.75rem",
          }}
        >
          <Icon size={14} strokeWidth={active ? 2.2 : 1.8} />
          {item.label}
          {active && <ChevronRight size={11} style={{ marginLeft: "auto", opacity: 0.6 }} />}
        </a>
      </div>
    );
  });
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const path = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [role, setRole] = useState<UserRole>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.ok ? r.json() : null)
      .catch(() => null)
      .then((d) => {
        if (d?.authenticated) {
          setRole(d.role ?? null);
          setUserName(d.nome ?? null);
          setUserEmail(d.email ?? null);
        }
      });
  }, []);

  const visibleNav = filterNav(role);
  const isActive = (href: string) =>
    href === "/dashboard" ? path === href : path.startsWith(href);

  const initials = userName
    ? userName.split(" ").slice(0, 2).map((n: string) => n[0]).join("").toUpperCase()
    : "?";

  const userFooter = (compact = false) => (
    <div style={{
      borderTop: "1px solid rgba(255,255,255,0.1)",
      padding: compact ? "0.75rem 0.85rem" : "0.85rem 1rem",
      display: "flex", alignItems: "center", gap: "0.6rem",
    }}>
      <div style={{
        width: compact ? 26 : 28, height: compact ? 26 : 28, borderRadius: "50%",
        background: "rgba(22,163,74,0.25)",
        border: "1.5px solid rgba(22,163,74,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "0.63rem", fontWeight: 700, color: "#4ade80", flexShrink: 0,
      }}>
        {initials}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: compact ? "0.72rem" : "0.74rem", fontWeight: 600, color: "white", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {userName ?? "Usuário"}
        </p>
        <p style={{ fontSize: "0.63rem", color: "rgba(255,255,255,0.4)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {userEmail ?? role ?? ""}
        </p>
      </div>
      <button
        onClick={async () => {
          await fetch("/api/auth/session", { method: "DELETE" });
          window.location.href = "/login";
        }}
        title="Sair"
        style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.35)", flexShrink: 0, padding: 0, display: "flex" }}
      >
        <LogOut size={13} />
      </button>
    </div>
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F0F5FF", fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Sidebar desktop */}
      <aside style={{
        width: 220, flexShrink: 0,
        display: "none",
        flexDirection: "column",
        background: "#1B4FD8",
        minHeight: "100vh",
        position: "sticky", top: 0,
        alignSelf: "flex-start",
      }}
        className="md-sidebar"
      >
        <div style={{ padding: "1.5rem 1rem 0.75rem" }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: "0.55rem", textDecoration: "none" }}>
            <Logo size={24} white />
            <span style={{ color: "white", fontWeight: 700, fontSize: "0.95rem", letterSpacing: "-0.03em" }}>IMOBI</span>
          </a>
        </div>

        <nav style={{ flex: 1, padding: "0 0.5rem", overflowY: "auto" }}>
          {renderNav(visibleNav, isActive)}
        </nav>

        {userFooter()}
      </aside>

      {/* Mobile header */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        height: 52, background: "#1B4FD8",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 1rem",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}
        className="md-hidden"
      >
        <a href="/" style={{ display: "flex", alignItems: "center", gap: "0.5rem", textDecoration: "none" }}>
          <Logo size={20} white />
          <span style={{ color: "white", fontWeight: 700, fontSize: "0.9rem", letterSpacing: "-0.03em" }}>IMOBI</span>
        </a>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Menu"
          style={{ background: "none", border: "none", cursor: "pointer", padding: "0.4rem", display: "flex", flexDirection: "column", gap: 4.5 }}
        >
          <span style={{ display: "block", width: 20, height: 1.5, background: "rgba(255,255,255,0.8)", borderRadius: 2, transition: "all 0.2s", transform: mobileOpen ? "rotate(45deg) translate(4.5px,4.5px)" : "none" }} />
          <span style={{ display: "block", width: 20, height: 1.5, background: "rgba(255,255,255,0.8)", borderRadius: 2, transition: "all 0.2s", opacity: mobileOpen ? 0 : 1 }} />
          <span style={{ display: "block", width: 20, height: 1.5, background: "rgba(255,255,255,0.8)", borderRadius: 2, transition: "all 0.2s", transform: mobileOpen ? "rotate(-45deg) translate(4.5px,-4.5px)" : "none" }} />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div onClick={() => setMobileOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", zIndex: 150 }} />
          <div style={{
            position: "fixed", top: 52, left: 0, bottom: 0, width: 230,
            background: "#1B4FD8", zIndex: 200,
            overflowY: "auto", display: "flex", flexDirection: "column",
          }}>
            <nav style={{ flex: 1, padding: "0.5rem 0.5rem 0" }}>
              {renderNav(visibleNav, isActive, () => setMobileOpen(false))}
            </nav>
            {userFooter(true)}
          </div>
        </>
      )}

      {/* Main */}
      <main style={{ flex: 1, overflow: "auto", padding: "2rem" }} className="main-content">
        <div style={{ height: 52 }} className="md-spacer" />
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

      <style>{`
        @media (min-width: 768px) {
          .md-sidebar { display: flex !important; }
          .md-hidden { display: none !important; }
          .md-spacer { display: none !important; }
          .main-content { padding: 2rem !important; }
        }
      `}</style>
    </div>
  );
}
