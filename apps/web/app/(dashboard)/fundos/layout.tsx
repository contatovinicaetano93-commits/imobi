import type { ReactNode } from "react";
import { redirect } from "next/navigation";

const FUNDOS_NAV = [
  { label: "Visão Geral", href: "/fundos" },
  { label: "Portfolio", href: "/fundos/portfolio" },
  { label: "Performance", href: "/fundos/performance" },
  { label: "Por Região", href: "/fundos/regions" },
  { label: "Relatórios", href: "/fundos/reports" },
];

export default function FundosLayout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-gray-200 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard de Fundos</h1>
          <p className="text-sm text-gray-500 mt-1">Monitoramento de portfolio e performance</p>
        </div>
      </div>

      <div className="flex gap-8 border-b border-gray-200 mb-8">
        {FUNDOS_NAV.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="px-4 py-3 text-sm font-medium text-gray-600 border-b-2 border-transparent hover:text-gray-900 hover:border-brand-500 transition-all"
          >
            {item.label}
          </a>
        ))}
      </div>

      <div>{children}</div>
    </div>
  );
}
