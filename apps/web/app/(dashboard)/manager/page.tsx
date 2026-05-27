import type { Metadata } from "next";
import { managerApi } from "@/lib/api";
import { ManagerKPICards } from "./manager-kpi-cards";

export const metadata: Metadata = { title: "Painel do Manager — imbobi" };

export default async function ManagerDashboardPage() {
  const stats = await managerApi.dashboard().catch(() => ({
    filaAprovacoes: 0,
    filaKyc: 0,
    creditosAtivos: 0,
    obrasAtivas: 0,
  }));

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Painel do Manager</h1>

      {/* Cards KPI */}
      <ManagerKPICards stats={stats} />

      {/* Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <a
          href="/dashboard/manager/etapas"
          className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Aprovar Etapas</h3>
              <p className="text-sm text-gray-500">Revisar e aprovar etapas de obras</p>
            </div>
            <div className="text-2xl">📋</div>
          </div>
        </a>

        <a
          href="/dashboard/manager/kyc"
          className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Revisar KYC</h3>
              <p className="text-sm text-gray-500">Analisar documentos de clientes</p>
            </div>
            <div className="text-2xl">📄</div>
          </div>
        </a>
      </div>
    </div>
  );
}
