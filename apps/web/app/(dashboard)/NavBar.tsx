"use client";

import { usePathname } from "next/navigation";

type NavItem = {
  label: string;
  href: string;
  icon: string;
  roles?: string[];
};

const ALL_NAV_ITEMS: NavItem[] = [
  { label: "Início",          href: "/dashboard",                 icon: "⬡" },
  { label: "Fundos",          href: "/dashboard/fundos",          icon: "💰", roles: ["GESTOR_OBRA", "ADMIN"] },
  { label: "Minhas Obras",    href: "/dashboard/obras",           icon: "🏗", roles: ["TOMADOR", "ADMIN"] },
  { label: "Crédito",         href: "/dashboard/credito",         icon: "💳", roles: ["TOMADOR", "ADMIN"] },
  { label: "Score",           href: "/dashboard/score",           icon: "⭐", roles: ["TOMADOR", "ADMIN"] },
  { label: "Simulador",       href: "/dashboard/simulador",       icon: "📊", roles: ["TOMADOR", "PARCEIRO", "ADMIN"] },
  { label: "Painel do Gestor",href: "/dashboard/gestor",          icon: "🛡", roles: ["GESTOR_OBRA", "ADMIN"] },
  { label: "Comercial",       href: "/dashboard/comercial",       icon: "📋", roles: ["COMERCIAL", "ADMIN"] },
  { label: "Relatórios",      href: "/dashboard/relatorios",      icon: "📈" },
  { label: "Notificações",    href: "/dashboard/notificacoes",    icon: "🔔" },
  { label: "Documentos",      href: "/dashboard/kyc",             icon: "🪪", roles: ["TOMADOR", "ADMIN"] },
  { label: "Perfil",          href: "/dashboard/perfil",          icon: "👤" },
];

export function NavBar({ userTipo }: { userTipo?: string }) {
  const path = usePathname();

  const visibleItems = ALL_NAV_ITEMS.filter(
    (item) => !item.roles || !userTipo || item.roles.includes(userTipo)
  );

  return (
    <nav className="flex flex-col gap-1 flex-1">
      {visibleItems.map((item) => {
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
  );
}
