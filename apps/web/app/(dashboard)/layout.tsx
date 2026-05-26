import type { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col p-6 gap-2">
        <div className="font-bold text-2xl text-brand-700 mb-8">imbobi</div>
        {NAV_ITEMS.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-gray-600 hover:bg-brand-50 hover:text-brand-700 transition-colors text-sm font-medium"
          >
            {item.label}
          </a>
        ))}
      </aside>
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
}

const NAV_ITEMS = [
  { label: "Início", href: "/dashboard" },
  { label: "Minhas Obras", href: "/dashboard/obras" },
  { label: "Crédito", href: "/dashboard/credito" },
  { label: "Score", href: "/dashboard/score" },
  { label: "Simulador", href: "/dashboard/simulador" },
  { label: "Painel do Gestor", href: "/dashboard/gestor" },
  { label: "Relatórios", href: "/dashboard/relatorios" },
  { label: "Perfil", href: "/dashboard/perfil" },
];
