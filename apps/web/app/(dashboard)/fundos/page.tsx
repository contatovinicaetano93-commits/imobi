import { PortfolioOverview } from "@/components/fundos/PortfolioOverview";
import { SimpleLineChart } from "@/components/fundos/SimpleLineChart";
import { SimpleBarChart } from "@/components/fundos/SimpleBarChart";
import {
  mockROIHistory,
  mockStatusDistribution,
  mockPortfolioWorks,
} from "@/lib/fundos-mock-data";

export default function FundosOverviewPage() {
  const ativasCount = mockPortfolioWorks.filter((o) => o.status === "EM_EXECUCAO").length;
  const concluidasCount = mockPortfolioWorks.filter((o) => o.status === "CONCLUIDA").length;
  const atrasadasCount = mockPortfolioWorks.filter((o) => o.status === "ATRASADA").length;

  const statusData = [
    { label: "Ativas", value: ativasCount, color: "#3b82f6" },
    { label: "Concluídas", value: concluidasCount, color: "#10b981" },
    { label: "Atrasadas", value: atrasadasCount, color: "#ef4444" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Visão Geral do Portfolio</h2>
        <p className="text-gray-600">Monitoramento agregado de todas as obras e investimentos</p>
      </div>

      <PortfolioOverview />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <SimpleLineChart
          title="ROI ao Longo do Tempo"
          data={mockROIHistory.map((d) => ({ month: d.month, value: d.roi }))}
          yAxisLabel="%"
        />
        <SimpleBarChart title="Portfolio por Status" data={statusData} />
      </div>
    </div>
  );
}
