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

export function ManagerKPICards({ stats }: ManagerKPICardsProps) {
  const router = useRouter();

  const kpis = [
    {
      label: "Etapas Pendentes",
      value: String(stats.filaAprovacoes),
      sub: "aguardando vistoria",
      href: "/dashboard/manager/etapas"
    },
    {
      label: "KYC Pendentes",
      value: String(stats.filaKyc),
      sub: "documentos",
      href: "/dashboard/manager/kyc"
    },
    {
      label: "Créditos Ativos",
      value: String(stats.creditosAtivos),
      sub: "em andamento",
      href: undefined
    },
    {
      label: "Obras Ativas",
      value: String(stats.obrasAtivas),
      sub: "em execução",
      href: undefined
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi) => (
        <div
          key={kpi.label}
          className={`bg-white rounded-2xl p-6 border border-gray-100 shadow-sm ${kpi.href ? 'hover:shadow-md cursor-pointer transition-shadow' : ''}`}
          onClick={() => kpi.href && router.push(kpi.href)}
        >
          <p className="text-sm text-gray-500 mb-1">{kpi.label}</p>
          <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
          <p className="text-xs text-gray-400 mt-1">{kpi.sub}</p>
        </div>
      ))}
    </div>
  );
}
