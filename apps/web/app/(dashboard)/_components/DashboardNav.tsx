"use client";

import { usePathname } from "next/navigation";

type Role = "TOMADOR" | "GESTOR_OBRA" | "ADMIN" | "PARCEIRO";

const NAV_BY_ROLE: Record<Role, { label: string; href: string; icon: string }[]> = {
  TOMADOR: [
    { label: "Início", href: "/dashboard", icon: "⬡" },
    { label: "Minhas Obras", href: "/dashboard/obras", icon: "🏗" },
    { label: "Crédito", href: "/dashboard/credito", icon: "💳" },
    { label: "Score", href: "/dashboard/score", icon: "⭐" },
    { label: "Simulador", href: "/dashboard/simulador", icon: "📊" },
    { label: "Documentos", href: "/dashboard/kyc", icon: "📋" },
    { label: "Notificações", href: "/dashboard/notificacoes", icon: "🔔" },
    { label: "Perfil", href: "/dashboard/perfil", icon: "👤" },
  ],
  GESTOR_OBRA: [
    { label: "Início", href: "/dashboard/gestor", icon: "⬡" },
    { label: "Painel do Gestor", href: "/dashboard/gestor", icon: "🛡" },
    { label: "Fundos", href: "/dashboard/fundos", icon: "💰" },
    { label: "Relatórios", href: "/dashboard/relatorios", icon: "📈" },
    { label: "Notificações", href: "/dashboard/notificacoes", icon: "🔔" },
    { label: "Perfil", href: "/dashboard/perfil", icon: "👤" },
  ],
  PARCEIRO: [
    { label: "Início", href: "/dashboard/comercial", icon: "⬡" },
    { label: "Comercial", href: "/dashboard/comercial", icon: "🤝" },
    { label: "Notificações", href: "/dashboard/notificacoes", icon: "🔔" },
    { label: "Perfil", href: "/dashboard/perfil", icon: "👤" },
  ],
  ADMIN: [
    { label: "Início", href: "/dashboard", icon: "⬡" },
    { label: "Fundos", href: "/dashboard/fundos", icon: "💰" },
    { label: "Minhas Obras", href: "/dashboard/obras", icon: "🏗" },
    { label: "Crédito", href: "/dashboard/credito", icon: "💳" },
    { label: "Score", href: "/dashboard/score", icon: "⭐" },
    { label: "Simulador", href: "/dashboard/simulador", icon: "📊" },
    { label: "Painel do Gestor", href: "/dashboard/gestor", icon: "🛡" },
    { label: "Relatórios", href: "/dashboard/relatorios", icon: "📈" },
    { label: "Notificações", href: "/dashboard/notificacoes", icon: "🔔" },
    { label: "Documentos", href: "/dashboard/kyc", icon: "📋" },
    { label: "Comercial", href: "/dashboard/comercial", icon: "🤝" },
    { label: "Perfil", href: "/dashboard/perfil", icon: "👤" },
  ],
};

const ROLE_LABEL: Record<Role, string> = {
  TOMADOR: "Tomador",
  GESTOR_OBRA: "Gestor de Obra",
  PARCEIRO: "Parceiro Comercial",
  ADMIN: "Administrador",
};

export function DashboardNav({ role }: { role: Role }) {
  const path = usePathname();
  const items = NAV_BY_ROLE[role] ?? NAV_BY_ROLE.TOMADOR;

  return (
    <aside
      className="w-64 hidden md:flex flex-col p-6 gap-1"
      style={{ background: "#1B4FD8", minHeight: "100vh" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 mb-6">
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

      {/* Role badge */}
      <div style={{
        background: "rgba(255,255,255,0.12)", borderRadius: 8,
        padding: "0.4rem 0.75rem", marginBottom: "1rem",
      }}>
        <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {ROLE_LABEL[role]}
        </span>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1 flex-1">
        {items.map((item) => {
          const active = path === item.href || (item.href !== "/dashboard" && item.href !== "/dashboard/gestor" && item.href !== "/dashboard/comercial" && path.startsWith(item.href));
          return (
            <a
              key={item.href + item.label}
              href={item.href}
              style={{
                display: "flex", alignItems: "center", gap: "0.65rem",
                padding: "0.55rem 0.85rem", borderRadius: 10,
                fontSize: "0.83rem", fontWeight: active ? 600 : 500,
                color: active ? "#1B4FD8" : "rgba(255,255,255,0.8)",
                background: active ? "white" : "transparent",
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
          href="/api/auth/logout"
          style={{ display: "block", fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", textDecoration: "none", marginBottom: "0.4rem" }}
        >
          Sair
        </a>
        <a
          href="/"
          style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.35)", textDecoration: "none" }}
        >
          ← Voltar ao site
        </a>
      </div>
    </aside>
  );
}
