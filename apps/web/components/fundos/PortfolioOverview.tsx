import { KPICard } from "./KPICard";
import { formatarBRL } from "@imbobi/core";
import { mockPortfolioKPIs } from "@/lib/fundos-mock-data";

export function PortfolioOverview() {
  const kpis = [
    {
      label: "Portfolio Total",
      value: formatarBRL(mockPortfolioKPIs.totalPortfolio),
      trend: "+15% vs mês anterior",
      trendUp: true,
      color: "blue" as const,
    },
    {
      label: "Inadimplência",
      value: `${(mockPortfolioKPIs.inadimplenciaTaxa * 100).toFixed(1)}%`,
      trend: "↓ -0.3% vs mês anterior",
      trendUp: true,
      color: "green" as const,
    },
    {
      label: "ROI Realizado (YTD)",
      value: `${(mockPortfolioKPIs.roiRealizadoYTD * 100).toFixed(1)}%`,
      trend: "vs 12% target",
      trendUp: false,
      color: "orange" as const,
    },
    {
      label: "Obras Ativas",
      value: String(mockPortfolioKPIs.obrasAtivas),
      trend: "5 novas este mês",
      trendUp: true,
      color: "purple" as const,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {kpis.map((kpi) => (
        <KPICard key={kpi.label} {...kpi} />
      ))}
    </div>
  );
}
