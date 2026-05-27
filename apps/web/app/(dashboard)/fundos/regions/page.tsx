import type { Metadata } from "next";
import { RegionBreakdown } from "@/components/fundos/RegionBreakdown";
import { SimplePieChart } from "@/components/fundos/SimplePieChart";
import { mockRegionPerformance } from "@/lib/fundos-mock-data";

export const metadata: Metadata = {
  title: "Regiões — Dashboard de Fundos — imbobi",
};

export default function RegionsPage() {
  const regionChartData = mockRegionPerformance.map((region) => ({
    label: region.region,
    value: region.works,
    color: `hsl(${Math.random() * 360}, 70%, 60%)`,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Performance por Região</h2>
        <p className="text-gray-600">Análise de portfolio, ROI e inadimplência por região geográfica</p>
      </div>

      <RegionBreakdown />

      <SimplePieChart title="Distribuição de Obras por Região" data={regionChartData} />
    </div>
  );
}
