"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useState } from "react";

const WA = "5511993455589";

const NAV_ITEMS = [
  { label: "Início", href: "/dashboard", icon: "⬡" },
  { label: "Minhas Obras", href: "/dashboard/obras", icon: "🏗" },
  { label: "Crédito", href: "/dashboard/credito", icon: "💳" },
  { label: "Simulador", href: "/dashboard/simulador", icon: "📊" },
  { label: "Score", href: "/dashboard/score", icon: "⭐" },
  { label: "Documentos KYC", href: "/dashboard/kyc", icon: "📋" },
  { label: "Notificações", href: "/dashboard/notificacoes", icon: "🔔" },
  { label: "Perfil", href: "/dashboard/perfil", icon: "👤" },
  { label: "Engenheiro", href: "/dashboard/engenheiro", icon: "🔧" },
  { label: "Painel Gestor", href: "/dashboard/gestor", icon: "🛡" },
  { label: "Relatórios", href: "/dashboard/relatorios", icon: "📈" },
  { label: "Fundos", href: "/dashboard/fundos", icon: "💰" },
];

function LogoMark({ size = 28, white = false }: { size?: number; white?: boolean }) {
  const color = white ? "rgba(255,255,255,0.9)" : "var(--blue, #1B4FD8)";
  const border = white ? "2px solid rgba(255,255,255,0.6)" : "2px solid #1B4FD8";
  return (
    <div style={{
      width: size, height: size,
      border,
      borderRadius: 6, display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr",
      gridTemplateRows: "1fr 1fr 1fr",
      gap: 2, padding: 4, flexShrink: 0,
    }}>
      {[0,1,2,3,4,5,6,7,8].map((i) => (
        <span key={i} style={{
          background: [1,3,5,7].includes(i) ? "transparent" : color,
          borderRadius: 1, display: "block",
        }} />
      ))}
    </div>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const path = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/dashboard" ? path === href : path.startsWith(href);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F0F5FF", fontFamily: "Inter, sans-serif" }}>
      {/* ── Sidebar desktop ── */}
      <aside style={{
        width: 232, flexShrink: 0,
        display: "none",
        flexDirection: "column",
        padding: "1.5rem 1rem",
        gap: 2,
        background: "#1B4FD8",
        minHeight: "100vh",
        position: "sticky",
        top: 0,
        alignSelf: "flex-start",
      }}
        className="md-sidebar"
      >
        <a href="/" style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "2rem", textDecoration: "none" }}>
          <LogoMark size={26} white />
          <span style={{ color: "white", fontWeight: 700, fontSize: "1rem", letterSpacing: "-0.02em" }}>IMOBI</span>
        </a>

        <nav style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <a
                key={item.href}
                href={item.href}
                style={{
                  display: "flex", alignItems: "center", gap: "0.6rem",
                  padding: "0.55rem 0.85rem", borderRadius: 10,
                  fontSize: "0.83rem", fontWeight: active ? 600 : 500,
                  color: active ? "#1B4FD8" : "rgba(255,255,255,0.78)",
                  background: active ? "#22C55E" : "transparent",
                  textDecoration: "none", transition: "all 0.15s",
                }}
              >
                <span style={{ fontSize: "0.95rem", lineHeight: 1 }}>{item.icon}</span>
                {item.label}
              </a>
            );
          })}
        </nav>

        <div style={{ borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: "1rem", marginTop: "0.5rem" }}>
          <a href="/" style={{ fontSize: "0.74rem", color: "rgba(255,255,255,0.45)", textDecoration: "none" }}>
            ← Voltar ao site
          </a>
        </div>
      </aside>

      {/* ── Mobile header ── */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        height: 56, background: "#1B4FD8",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 1rem",
      }}
        className="md-hidden"
      >
        <a href="/" style={{ display: "flex", alignItems: "center", gap: "0.5rem", textDecoration: "none" }}>
          <LogoMark size={22} white />
          <span style={{ color: "white", fontWeight: 700, fontSize: "0.95rem" }}>IMOBI</span>
        </a>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Menu"
          style={{ background: "none", border: "none", cursor: "pointer", color: "white", padding: "0.4rem", display: "flex", flexDirection: "column", gap: 5 }}
        >
          <span style={{ display: "block", width: 22, height: 2, background: "white", borderRadius: 2, transition: "all 0.2s", transform: mobileOpen ? "rotate(45deg) translate(5px, 5px)" : "none" }} />
          <span style={{ display: "block", width: 22, height: 2, background: "white", borderRadius: 2, transition: "all 0.2s", opacity: mobileOpen ? 0 : 1 }} />
          <span style={{ display: "block", width: 22, height: 2, background: "white", borderRadius: 2, transition: "all 0.2s", transform: mobileOpen ? "rotate(-45deg) translate(5px, -5px)" : "none" }} />
        </button>
      </div>

      {/* ── Mobile drawer ── */}
      {mobileOpen && (
        <>
          <div
            onClick={() => setMobileOpen(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 150 }}
          />
          <div style={{
            position: "fixed", top: 56, left: 0, bottom: 0, width: 240,
            background: "#1B4FD8", zIndex: 200, padding: "1rem",
            overflowY: "auto", display: "flex", flexDirection: "column", gap: 2,
          }}>
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              return (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  style={{
                    display: "flex", alignItems: "center", gap: "0.6rem",
                    padding: "0.65rem 0.9rem", borderRadius: 10,
                    fontSize: "0.88rem", fontWeight: active ? 600 : 500,
                    color: active ? "#1B4FD8" : "rgba(255,255,255,0.82)",
                    background: active ? "#22C55E" : "transparent",
                    textDecoration: "none",
                  }}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </a>
              );
            })}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: "1rem", marginTop: "auto" }}>
              <a href="/" style={{ fontSize: "0.74rem", color: "rgba(255,255,255,0.45)", textDecoration: "none" }}>
                ← Voltar ao site
              </a>
            </div>
          </div>
        </>
      )}

      {/* ── Main content ── */}
      <main style={{ flex: 1, overflow: "auto", padding: "2rem" }} className="main-content">
        <div style={{ height: 56 }} className="md-spacer" />
        {children}
      </main>

      {/* ── WhatsApp flutuante ── */}
      <a
        href={`https://wa.me/${WA}?text=Olá!%20Preciso%20de%20ajuda%20com%20o%20IMOBI.`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Fale conosco no WhatsApp"
        style={{
          position: "fixed", bottom: 24, right: 24,
          width: 48, height: 48, borderRadius: "50%",
          backgroundColor: "#25D366", display: "flex",
          alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 14px rgba(37,211,102,0.4)",
          zIndex: 50, textDecoration: "none", color: "white",
        }}
      >
        <svg viewBox="0 0 24 24" fill="white" width={24} height={24}>
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
