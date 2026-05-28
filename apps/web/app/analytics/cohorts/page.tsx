"use client";

import { useEffect, useState } from "react";

interface CohortAnalysis {
  cohort: string;
  signups: number;
  day7Retention: number;
  day30Retention: number;
  avgLTV: number;
}

export default function CohortsPage() {
  const [data, setData] = useState<CohortAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/v1/analytics/cohorts");
        if (!response.ok) throw new Error("Failed to fetch cohort data");
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-gray-600">Carregando cohort analysis...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-red-600">Erro: {error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Análise de Cohorts</h1>
        <p className="text-gray-600 mt-2">Retenção e LTV por coorte de usuários</p>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Cohort
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Signups
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                D7 Retention
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                D30 Retention
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Avg LTV
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.map((cohort) => (
              <tr key={cohort.cohort} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {cohort.cohort}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {cohort.signups}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-900 font-semibold">{cohort.day7Retention.toFixed(1)}%</span>
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${Math.min(cohort.day7Retention, 100)}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-900 font-semibold">{cohort.day30Retention.toFixed(1)}%</span>
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${Math.min(cohort.day30Retention, 100)}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">
                  R$ {(cohort.avgLTV / 1000).toFixed(1)}k
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.length === 0 && (
        <div className="bg-white rounded-lg shadow p-8 border border-gray-200 text-center">
          <p className="text-gray-600">Sem dados de cohort disponíveis</p>
        </div>
      )}
    </div>
  );
}
