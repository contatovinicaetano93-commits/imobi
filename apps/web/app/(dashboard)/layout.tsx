"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const path = usePathname();

  return (
    <div className="flex min-h-screen" style={{ background: "#F0F5FF" }}>
      {/* Sidebar */}
      <aside
        className="w-64 hidden md:flex flex-col p-6 gap-1"
        style={{ background: "#1B4FD8", minHeight: "100vh" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <div
            style={{
              width: 28, height: 28, border: "2px solid rgba(255,255,255,0.6)",
              borderRadius: 6, display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gridTemplateRows: "1fr 1fr 1fr",
              gap: 2, padding: 4,
            }}
          >
            {[0,1,2,3,4,5,6,7,8].map((i) => (
              <span
                key={i}
                style={{
                  background: [1,3,5,7].includes(i) ? "transparent" : "white",
                  borderRadius: 1, display: "block",
                }}
              />
            ))}
          </div>
          <span style={{ color: "white", fontWeight: 700, fontSize: "1.1rem", letterSpacing: "-0.02em" }}>
            IMOBI
          </span>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-1 flex-1">
          {NAV_ITEMS.map((item) => {
            const active = path === item.href || (item.href !== "/dashboard" && path.startsWith(item.href));
            return (
              <a
                key={item.href}
                href={item.href}
                style={{
                  display: "flex", alignItems: "center", gap: "0.65rem",
                  padding: "0.55rem 0.85rem", borderRadius: 10,
                  fontSize: "0.83rem", fontWeight: active ? 600 : 500,
                  color: active ? "#1B4FD8" : "rgba(255,255,255,0.8)",
                  background: active ? "#22C55E" : "transparent",
                  textDecoration: "none", transition: "all 0.15s",
                }}
                onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.1)"; }}
                onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <span style={{ fontSize: "1rem" }}>{item.icon}</span>
                {item.label}
              </a>
            );
          })}
        </nav>

        {/* Footer sidebar */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: "1rem", marginTop: "0.5rem" }}>
          <a
            href="/"
            style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", textDecoration: "none" }}
          >
            ← Voltar ao site
          </a>
        </div>
      </aside>

      {/* Mobile header */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4"
        style={{ height: 56, background: "#1B4FD8" }}
      >
        <span style={{ color: "white", fontWeight: 700, fontSize: "1rem" }}>IMOBI</span>
        <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.78rem" }}>Dashboard</span>
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-auto" style={{ padding: "2rem", paddingTop: "calc(2rem)" }}>
        <div className="md:hidden" style={{ height: 56 }} />
        {children}
      </main>
    </div>
  );
}

const NAV_ITEMS = [
  { label: "Início", href: "/dashboard", icon: "⬡" },
  { label: "Minhas Obras", href: "/dashboard/obras", icon: "🏗" },
  { label: "Crédito", href: "/dashboard/credito", icon: "💳" },
  { label: "Simulador", href: "/dashboard/simulador", icon: "📊" },
  { label: "Documentos", href: "/dashboard/kyc", icon: "📋" },
  { label: "Score", href: "/dashboard/score", icon: "⭐" },
  { label: "Perfil", href: "/dashboard/perfil", icon: "👤" },
];
