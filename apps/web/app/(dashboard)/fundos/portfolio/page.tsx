import type { Metadata } from "next";
import { PortfolioTable } from "@/components/fundos/PortfolioTable";

export const metadata: Metadata = {
  title: "Portfolio — Dashboard de Fundos — imbobi",
};

export default function PortfolioPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Portfolio de Obras</h2>
        <p className="text-gray-600">
          Lista completa de todas as obras financiadas com detalhes de status, progresso e risco
        </p>
      </div>

      <PortfolioTable />
    </div>
  );
}
