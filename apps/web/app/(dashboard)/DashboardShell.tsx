"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import "./layout.css";
import { useEffect, useState } from "react";
import { normalizeRole, CLIENTE_BETA_LABEL } from "@/lib/role-permissions";
import {
  ACCOUNT_NAV_HREFS,
  ADMIN_PREVIEW_STORAGE_KEY,
  getActiveNavHref,
  getDashboardSegment,
  getNavRole,
  getPanelHome,
  getPanelFromPath,
  isAdminPreviewingPanel,
  type NavContext,
} from "@/lib/panel-navigation";
import { isMvpRouteAllowed, GUIDED_STRICT_MODE } from "@/lib/beta-mvp";
import { getCanonicalNav, isCanonicalNavHref } from "@/lib/canonical-flow";
import { JornadaGuard } from "@/components/dashboard/JornadaGuard";
import { JornadaProvider } from "@/hooks/jornada-context";
import { ToastProvider } from "@/hooks/toast-context";
import { Toaster } from "@/components/ui/toaster";
import { ImobiAssistant } from "@/components/dashboard/ImobiAssistant";
import { SkipLink } from "@/components/SkipLink";
import { MobileBottomNav } from "@/components/dashboard/MobileBottomNav";
import { buildMobileTabs } from "@/lib/mobile-nav";
import {
  LogOut, ChevronRight, ArrowLeft, X, Menu, type LucideIcon,
} from "lucide-react";

type UserRole = "ADMIN" | "GESTOR" | "ENGENHEIRO" | "GESTOR_OBRA" | "TOMADOR" | "COMERCIAL" | "PARCEIRO" | "CONSTRUTOR" | null;
type NavItem = {
  label: string; href: string; icon: LucideIcon;
  roles: UserRole[]; section?: string; funcao?: string;
};

const WA = "5511993455589";
const NAVY = "#0C1A3D";
const MINT = "#4ADE80";

const SECTION_LABELS: Record<string, string> = { geral: "Jornada", operacao: "Operação", conta: "Conta" };

function sectionLabel(section: string, navRole: UserRole | null): string {
  if (navRole === "GESTOR" && section === "geral") return "Painel";
  if (navRole === "ENGENHEIRO" && section === "geral") return "Operação";
  if (navRole === "COMERCIAL" && section === "geral") return "Comercial";
  return SECTION_LABELS[section] ?? section;
}

const ROLE_META: Record<string, { label: string; accent: string }> = {
  CONSTRUTOR:  { label: CLIENTE_BETA_LABEL, accent: MINT },
  TOMADOR:     { label: CLIENTE_BETA_LABEL, accent: MINT },
  GESTOR:      { label: "Gestor do Fundo", accent: "#a78bfa" },
  ENGENHEIRO:  { label: "Engenheiro",  accent: "#fb923c" },
  GESTOR_OBRA: { label: "Engenheiro",  accent: "#fb923c" },
  COMERCIAL:   { label: "Comercial",   accent: "#fbbf24" },
  PARCEIRO:    { label: "Comercial",   accent: "#fbbf24" },
  ADMIN:       { label: "Admin",       accent: MINT },
};

function filterNav(
  role: UserRole,
  path: string,
  navCtx?: NavContext,
): NavItem[] {
  const navRole = getNavRole(role, path, navCtx) ?? role;
  const canonical = getCanonicalNav(navRole);
  const filtered = canonical
    .filter((item) => {
      if (navRole !== "ADMIN" && item.href.includes("admin") && role !== "ADMIN") return false;
      return isCanonicalNavHref(item.href, navRole);
    })
    .map((item) => ({
      label: item.label,
      href: item.href,
      icon: item.icon,
      roles: [navRole] as UserRole[],
      section: item.section,
    }));

  if (!GUIDED_STRICT_MODE && navRole) {
    return filtered.filter((item) => isMvpRouteAllowed(item.href, navRole));
  }

  return filtered;
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
  notifCount: number,
  navRole: UserRole | null,
  onNavigate?: () => void,
) {
  let lastSection = "";
  return items.map((item, idx) => {
    const active = activeFn(item.href);
    const showSection = item.section && item.section !== lastSection;
    if (item.section) lastSection = item.section;
    const Icon = item.icon;
    const badge = item.href === "/dashboard/notificacoes" && notifCount > 0 ? notifCount : 0;
    return (
      <div key={`${idx}-${item.href}`}>
        {showSection && (
          <p style={{
            fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.14em",
            textTransform: "uppercase", color: "rgba(255,255,255,0.28)",
            padding: "1.25rem 0.75rem 0.35rem",
            fontFamily: "'Jost', sans-serif",
          }}>
            {sectionLabel(item.section!, navRole)}
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
          {badge > 0 && (
            <span style={{
              background: "#ef4444", color: "white", borderRadius: 9999,
              fontSize: "0.6rem", fontWeight: 700, lineHeight: 1,
              padding: "2px 5px", flexShrink: 0,
            }}>
              {badge > 99 ? "99+" : badge}
            </span>
          )}
          {active && !badge && <ChevronRight size={10} style={{ opacity: 0.5 }} />}
        </Link>
      </div>
    );
  });
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [role, setRole] = useState<UserRole>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [userName, setUserName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [notifCount, setNotifCount] = useState(0);
  const [adminPreview, setAdminPreview] = useState<UserRole>(null);
  const [fromAdmin, setFromAdmin] = useState(false);

  useEffect(() => {
    // Role (and therefore nav + footer) come exclusively from the live API —
    // no pre-fill from cache so we never flash the previous user's identity.
    fetch("/api/auth/me")
      .then((r) => r.ok ? r.json() : null)
      .catch(() => null)
      .then((d) => {
        if (d?.authenticated) {
          try { sessionStorage.setItem("imobi_auth", JSON.stringify({ d, ts: Date.now() })); } catch { /* ignore */ }
          setRole(normalizeRole(d.role) ?? null);
          setUserName(d.nome ?? null);
          setUserEmail(d.email ?? null);
        } else {
          try { sessionStorage.removeItem("imobi_auth"); } catch { /* ignore */ }
          window.location.replace("/login");
          return;
        }
        setRoleLoading(false);
      });
  }, []);

  // Poll unread notification count every 60s
  useEffect(() => {
    function fetchCount() {
      fetch("/api/proxy/notificacoes/contar-nao-lidas")
        .then((r) => r.ok ? r.json() : null)
        .catch(() => null)
        .then((d) => { if (typeof d?.count === "number") setNotifCount(d.count); });
    }
    fetchCount();
    const id = setInterval(fetchCount, 60_000);
    return () => clearInterval(id);
  }, []);

  // Close drawer on route change
  useEffect(() => { setMobileOpen(false); }, [path]);

  useEffect(() => {
    setFromAdmin(new URLSearchParams(window.location.search).get("from") === "admin");
  }, [path]);

  // Admin previewing engenheiro/gestor: persist sidebar ao abrir rotas compartilhadas (/obras)
  useEffect(() => {
    if (role !== "ADMIN") {
      setAdminPreview(null);
      return;
    }
    if (fromAdmin) {
      setAdminPreview(null);
      return;
    }

    const panel = getPanelFromPath(path);
    if (panel) {
      try { sessionStorage.setItem(ADMIN_PREVIEW_STORAGE_KEY, panel); } catch { /* ignore */ }
      setAdminPreview(panel as UserRole);
      return;
    }

    if (getDashboardSegment(path) === "admin") {
      try { sessionStorage.removeItem(ADMIN_PREVIEW_STORAGE_KEY); } catch { /* ignore */ }
      setAdminPreview(null);
      return;
    }

    try {
      const stored = sessionStorage.getItem(ADMIN_PREVIEW_STORAGE_KEY) as UserRole | null;
      setAdminPreview(stored);
    } catch {
      setAdminPreview(null);
    }
  }, [role, path, fromAdmin]);

  const navCtx: NavContext = { adminPreview, fromAdmin };
  const navRole = getNavRole(role, path, navCtx);
  const panelHome = getPanelHome(role, path, navCtx);
  const visibleNav = filterNav(role, path, navCtx);
  const activeHref = getActiveNavHref(path, navRole, visibleNav);
  const isActive = (href: string) => href === activeHref;
  const isPreviewingOtherPanel = isAdminPreviewingPanel(role, path, navCtx);

  const meta = role ? ROLE_META[role] : null;
  const navMeta = navRole ? ROLE_META[navRole] : meta;
  const accent = navMeta?.accent ?? MINT;

  const initials = userName
    ? userName.split(" ").slice(0, 2).map((n: string) => n[0]).join("").toUpperCase()
    : "?";

  const parentPath = getParentPath(path);

  const { tabs: mobileTabs } = buildMobileTabs(visibleNav);

  const jornadaEnabled =
    GUIDED_STRICT_MODE &&
    role != null &&
    (role === "TOMADOR" || role === "CONSTRUTOR");

  const userFooter = (compact = false) => (
    <div>
      {navMeta && (
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
            {navMeta.label}
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
            try { sessionStorage.removeItem("imobi_auth"); } catch { /* ignore */ }
            window.location.href = "/login";
          }}
          title="Sair"
          aria-label="Sair da conta"
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
      <nav style={{ flex: 1, padding: "0 0.4rem", overflowY: "auto", display: "flex", flexDirection: "column" }}>
        {roleLoading ? <NavSkeleton /> : renderNav(visibleNav, isActive, accent, notifCount, navRole, onNavigate)}
      </nav>
      {userFooter(!!onNavigate)}
    </>
  );

  return (
    <ToastProvider>
    <SkipLink />
    <JornadaProvider enabled={jornadaEnabled} scopeKey={jornadaEnabled ? (userEmail ?? role) : null}>
    <JornadaGuard role={role}>
    <div className="dash-root" style={{ fontFamily: "'Jost', 'Inter', system-ui, sans-serif" }}>

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

      <div className="dash-mobile-column">

      {/* Mobile topbar — padrão SOMA (hamburger · logo · chip usuário) */}
      <header className="dash-mhidden dash-mobile-header">
        {parentPath ? (
          <button
            onClick={() => router.push(parentPath as "/")}
            aria-label="Voltar"
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "white", display: "grid", placeItems: "center",
              width: 44, height: 44, flexShrink: 0,
            }}
          >
            <ArrowLeft size={20} />
          </button>
        ) : (
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu"
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav-drawer"
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "rgba(255,255,255,0.75)", display: "grid", placeItems: "center",
              width: 44, height: 44, flexShrink: 0,
            }}
          >
            <Menu size={22} />
          </button>
        )}

        <Link
          href={panelHome as "/"}
          style={{
            display: "flex", alignItems: "center", gap: "0.45rem",
            textDecoration: "none", flex: 1, justifyContent: "center",
          }}
        >
          <Logo size={20} />
          <span style={{
            color: "white", fontWeight: 800, fontSize: "1rem",
            letterSpacing: "0.12em", fontFamily: "'Barlow Condensed', sans-serif",
          }}>
            IMOBI
          </span>
        </Link>

        <div
          style={{
            display: "flex", alignItems: "center", gap: 6,
            borderRadius: 9999, background: `linear-gradient(135deg, ${MINT} 0%, #22C55E 100%)`,
            padding: "3px 10px 3px 3px", flexShrink: 0, maxWidth: 130,
          }}
        >
          <span style={{
            width: 28, height: 28, borderRadius: "50%", background: NAVY,
            display: "grid", placeItems: "center",
            fontSize: "0.62rem", fontWeight: 700, color: MINT,
            fontFamily: "'Jost', sans-serif",
          }}>
            {initials}
          </span>
          <div style={{ minWidth: 0, lineHeight: 1.2 }}>
            <p style={{
              margin: 0, fontSize: "0.62rem", fontWeight: 500, color: "rgba(12,26,61,0.65)",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              fontFamily: "'Jost', sans-serif",
            }}>
              {userName ?? "Usuário"}
            </p>
            <p style={{
              margin: 0, fontSize: "0.68rem", fontWeight: 700, color: NAVY,
              fontFamily: "'Jost', sans-serif",
            }}>
              {navMeta?.label ?? ""}
            </p>
          </div>
        </div>
      </header>

      {/* Main */}
      <main
        id="main-content"
        className="dash-main"
      >
        {children}
      </main>

      <MobileBottomNav
        tabs={mobileTabs}
        pathname={path}
        activeHref={activeHref ?? path}
        accent={accent}
        onOpenMenu={() => setMobileOpen(true)}
      />

      </div>

      {/* Mobile drawer — overlay fora da coluna scrollável */}
      {mobileOpen && (
        <>
          <div
            onClick={() => setMobileOpen(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(12,26,61,0.75)", zIndex: 150 }}
          />
          <aside
            id="mobile-nav-drawer"
            style={{
              position: "fixed", top: 0, left: 0, bottom: 0,
              width: "min(300px, 85vw)",
              background: NAVY, zIndex: 200,
              overflowY: "auto", display: "flex", flexDirection: "column",
              padding: "1rem 0.75rem",
            }}
          >
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: "1.25rem", padding: "0 0.25rem",
            }}>
              <Link href={panelHome as "/"} onClick={() => setMobileOpen(false)} style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
                <Logo size={22} />
                <span style={{ color: "white", fontWeight: 800, fontSize: "1.05rem", letterSpacing: "0.1em", fontFamily: "'Barlow Condensed', sans-serif" }}>IMOBI</span>
              </Link>
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Fechar menu"
                style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.5)", width: 40, height: 40, display: "grid", placeItems: "center" }}
              >
                <X size={22} />
              </button>
            </div>

            {isPreviewingOtherPanel && (
              <div style={{ margin: "0 0 0.75rem", padding: "0.5rem 0.75rem", borderRadius: 10, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <p style={{ fontSize: "0.58rem", fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 4px", fontFamily: "'Jost', sans-serif" }}>Visualizando como</p>
                <p style={{ fontSize: "0.72rem", fontWeight: 600, color: "white", margin: "0 0 6px", fontFamily: "'Jost', sans-serif" }}>{ROLE_META[navRole ?? ""]?.label ?? navRole}</p>
                <Link href="/dashboard/admin" onClick={() => setMobileOpen(false)} style={{ fontSize: "0.65rem", fontWeight: 600, color: MINT, textDecoration: "none", display: "flex", alignItems: "center", gap: 4, fontFamily: "'Jost', sans-serif" }}>
                  <ArrowLeft size={10} /> Voltar ao Admin
                </Link>
              </div>
            )}

            <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
              {roleLoading ? <NavSkeleton /> : visibleNav.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                const badge = item.href === "/dashboard/notificacoes" && notifCount > 0 ? notifCount : 0;
                return (
                  <Link
                    key={item.href}
                    href={item.href as "/"}
                    onClick={() => setMobileOpen(false)}
                    style={{
                      display: "flex", alignItems: "center", gap: "0.75rem",
                      padding: "0.75rem 0.85rem", borderRadius: 14,
                      fontSize: "0.88rem", fontWeight: active ? 600 : 500,
                      color: active ? MINT : "rgba(255,255,255,0.55)",
                      background: active ? "rgba(74,222,128,0.08)" : "transparent",
                      border: active ? `1px solid ${MINT}55` : "1px solid transparent",
                      textDecoration: "none", fontFamily: "'Jost', sans-serif",
                      minHeight: 48,
                    }}
                  >
                    <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {badge > 0 && (
                      <span style={{ background: "#ef4444", color: "white", borderRadius: 9999, fontSize: "0.6rem", fontWeight: 700, padding: "2px 6px" }}>
                        {badge > 99 ? "99+" : badge}
                      </span>
                    )}
                    <ChevronRight size={14} style={{ opacity: 0.4 }} />
                  </Link>
                );
              })}
            </nav>

            <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "0.75rem", marginTop: "0.5rem" }}>
              <button
                onClick={async () => {
                  await fetch("/api/auth/session", { method: "DELETE" });
                  try { sessionStorage.removeItem("imobi_auth"); } catch { /* ignore */ }
                  window.location.href = "/login";
                }}
                style={{
                  display: "flex", alignItems: "center", gap: "0.75rem", width: "100%",
                  padding: "0.75rem 0.85rem", borderRadius: 14, border: "none", cursor: "pointer",
                  background: "transparent", color: MINT, fontSize: "0.88rem", fontWeight: 600,
                  fontFamily: "'Jost', sans-serif", textAlign: "left",
                }}
              >
                <LogOut size={18} />
                <span style={{ flex: 1 }}>Sair da conta</span>
                <ChevronRight size={14} style={{ opacity: 0.4 }} />
              </button>
            </div>
          </aside>
        </>
      )}

      {/* Assistente IA + WhatsApp */}
      {!GUIDED_STRICT_MODE && <ImobiAssistant />}
      <a
        href={`https://wa.me/${WA}?text=Olá!%20Preciso%20de%20ajuda%20com%20o%20IMOBI.`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Suporte via WhatsApp"
        className="dash-wa-fab"
        style={{
          position: "fixed", right: 24,
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

      <Toaster />
    </div>
    </JornadaGuard>
    </JornadaProvider>
    </ToastProvider>
  );
}
