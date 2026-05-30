import type { ReactNode } from "react";
import { DashboardNavbar } from "./_components/navbar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <DashboardNavbar />
      <div className="flex min-h-screen bg-slate-950">
        <aside className="w-64 bg-slate-900 border-r border-slate-800 hidden md:flex flex-col p-6 gap-2">
          <div className="font-bold text-2xl text-green-400 mb-8">IMOBI</div>
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-green-400 transition-colors text-sm font-medium"
            >
              {item.label}
            </a>
          ))}
        </aside>
        <main className="flex-1 p-8 overflow-auto pt-20">{children}</main>
      </div>
    </>
  );
}

const NAV_ITEMS = [
  { label: "Meu Crédito", href: "/dashboard/credito" },
  { label: "Minhas Obras", href: "/dashboard/obras" },
  { label: "Documentos", href: "/dashboard/documentos" },
  { label: "Extrato", href: "/dashboard/extrato" },
  { label: "Perfil", href: "/dashboard/perfil" },
];
