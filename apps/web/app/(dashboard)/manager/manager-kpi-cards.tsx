"use client";

import { useRouter } from "next/navigation";

interface ManagerKPICardsProps {
  stats: {
    filaAprovacoes: number;
    filaKyc: number;
    creditosAtivos: number;
    obrasAtivas: number;
  };
}

interface KPI {
  label: string;
  value: string;
  sub: string;
  href: "/dashboard/gestor/etapas" | "/dashboard/gestor/kyc" | null;
}

export function ManagerKPICards({ stats }: ManagerKPICardsProps) {
  const router = useRouter();

  const kpis: KPI[] = [
    {
      label: "Etapas Pendentes",
      value: String(stats.filaAprovacoes),
      sub: "aguardando vistoria",
      href: "/dashboard/gestor/etapas"
    },
    {
      label: "KYC Pendentes",
      value: String(stats.filaKyc),
      sub: "documentos",
      href: "/dashboard/gestor/kyc"
    },
    {
      label: "Créditos Ativos",
      value: String(stats.creditosAtivos),
      sub: "em andamento",
      href: null
    },
    {
      label: "Obras Ativas",
      value: String(stats.obrasAtivas),
      sub: "em execução",
      href: null
    },
  ];

  const handleClick = (href: "/dashboard/gestor/etapas" | "/dashboard/gestor/kyc" | null) => {
    if (href) {
      router.push(href);
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi) => (
        <div
          key={kpi.label}
          className={`bg-white rounded-2xl p-6 border border-gray-100 shadow-sm ${kpi.href ? 'hover:shadow-md cursor-pointer transition-shadow' : ''}`}
          onClick={() => handleClick(kpi.href)}
        >
          <p className="text-sm text-gray-500 mb-1">{kpi.label}</p>
          <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
          <p className="text-xs text-gray-400 mt-1">{kpi.sub}</p>
        </div>
      ))}
    </div>
  );
}
