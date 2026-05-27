"use client";

import { useState } from "react";
import { mockPortfolioWorks } from "@/lib/fundos-mock-data";
import { formatarBRL } from "@imbobi/core";
import { RiskIndicator } from "./RiskIndicator";

export function PortfolioTable() {
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [locationFilter, setLocationFilter] = useState<string | null>(null);

  const obras = mockPortfolioWorks.filter((obra) => {
    if (statusFilter && obra.status !== statusFilter) return false;
    if (locationFilter && obra.location !== locationFilter) return false;
    return true;
  });

  const statusMap = {
    EM_EXECUCAO: { label: "Em execução", color: "bg-blue-100 text-blue-800" },
    CONCLUIDA: { label: "Concluída", color: "bg-green-100 text-green-800" },
    ATRASADA: { label: "Atrasada", color: "bg-red-100 text-red-800" },
  };

  const locations = Array.from(new Set(mockPortfolioWorks.map((o) => o.location)));
  const statuses = Array.from(new Set(mockPortfolioWorks.map((o) => o.status)));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
          <select
            value={statusFilter || ""}
            onChange={(e) => setStatusFilter(e.target.value || null)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          >
            <option value="">Todos os status</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {statusMap[status as keyof typeof statusMap].label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">Região</label>
          <select
            value={locationFilter || ""}
            onChange={(e) => setLocationFilter(e.target.value || null)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          >
            <option value="">Todas as regiões</option>
            {locations.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-200">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">ID</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                Construtor
              </th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Valor</th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Status</th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">
                Progresso
              </th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Risco</th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Região</th>
            </tr>
          </thead>
          <tbody>
            {obras.map((obra) => {
              const status = statusMap[obra.status];
              return (
                <tr
                  key={obra.id}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{obra.id}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{obra.constructor}</td>
                  <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">
                    {formatarBRL(obra.amount)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>
                      {status.label}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 justify-center">
                      <div className="h-2 w-24 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand-500"
                          style={{ width: `${obra.progress}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-gray-700 w-8 text-right">
                        {obra.progress}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <RiskIndicator score={obra.riskScore} />
                  </td>
                  <td className="px-6 py-4 text-center text-sm text-gray-700">{obra.location}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="text-sm text-gray-600">
        {obras.length} de {mockPortfolioWorks.length} obras
      </div>
    </div>
  );
}
