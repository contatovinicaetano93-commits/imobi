"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiClient } from "@imbobi/core";
import { Download, Calendar } from "lucide-react";

interface Summary {
  totalUsuarios: number;
  usuariosAtivos: number;
  kyc: {
    pendente: number;
    aprovado: number;
    rejeitado: number;
  };
  obras: {
    total: number;
    emExecucao: number;
    concluidas: number;
  };
  creditos: {
    total: number;
    valorTotalAprovado: number;
    valorTotalLiberado: number;
    ativos: number;
  };
}

interface WorksBreakdown {
  status: string;
  count: number;
  percentual: number;
}

interface CreditsBreakdown {
  status: string;
  count: number;
  valorTotal: number;
}

interface UsersBreakdown {
  kycStatus: string;
  count: number;
  percentual: number;
}

interface TimelineData {
  data: Array<{
    date: string;
    usuarios?: number;
    obras?: number;
    creditos?: number;
  }>;
}

export default function AnalyticsDashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [works, setWorks] = useState<WorksBreakdown[]>([]);
  const [credits, setCredits] = useState<CreditsBreakdown[]>([]);
  const [users, setUsers] = useState<UsersBreakdown[]>([]);
  const [timeline, setTimeline] = useState<TimelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{
    start?: string;
    end?: string;
  }>({});
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (dateRange.start) params.append("startDate", dateRange.start);
      if (dateRange.end) params.append("endDate", dateRange.end);

      const [summaryRes, worksRes, creditsRes, usersRes, timelineRes] =
        await Promise.all([
          apiClient.get(`/analytics/summary?${params}`),
          apiClient.get(`/analytics/works?${params}`),
          apiClient.get(`/analytics/credits?${params}`),
          apiClient.get(`/analytics/users?${params}`),
          apiClient.get("/analytics/timeline?days=30"),
        ]);

      setSummary(summaryRes);
      setWorks(worksRes);
      setCredits(creditsRes);
      setUsers(usersRes);
      setTimeline(timelineRes);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao carregar analytics"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (type: string) => {
    try {
      setExporting(true);

      const params = new URLSearchParams();
      if (dateRange.start) params.append("startDate", dateRange.start);
      if (dateRange.end) params.append("endDate", dateRange.end);

      const url = `/admin/export/${type}.csv?${params}`;
      window.open(url, "_blank");
    } catch (err) {
      setError("Erro ao exportar dados");
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-slate-600">Carregando analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Analytics</h1>
          <p className="text-slate-600 mt-1">Dashboard de métricas da plataforma</p>
        </div>
      </div>

      {/* Date Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Filtro de Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Data Inicial
              </label>
              <input
                type="date"
                value={dateRange.start || ""}
                onChange={(e) =>
                  setDateRange({ ...dateRange, start: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Data Final
              </label>
              <input
                type="date"
                value={dateRange.end || ""}
                onChange={(e) =>
                  setDateRange({ ...dateRange, end: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={() => setDateRange({})}
                variant="outline"
                className="w-full"
              >
                Limpar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-slate-600 text-sm font-medium mb-2">
                Total de Usuários
              </p>
              <p className="text-3xl font-bold text-blue-600">
                {summary?.totalUsuarios || 0}
              </p>
              <p className="text-xs text-slate-500 mt-2">
                {summary?.usuariosAtivos || 0} ativos
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-slate-600 text-sm font-medium mb-2">
                Créditos Aprovados
              </p>
              <p className="text-3xl font-bold text-green-600">
                {summary?.creditos.total || 0}
              </p>
              <p className="text-xs text-slate-500 mt-2">
                R$ {((summary?.creditos.valorTotalAprovado || 0) / 1000000).toFixed(1)}M
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-slate-600 text-sm font-medium mb-2">
                Obras Ativas
              </p>
              <p className="text-3xl font-bold text-orange-600">
                {summary?.obras.emExecucao || 0}
              </p>
              <p className="text-xs text-slate-500 mt-2">
                de {summary?.obras.total || 0} total
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-slate-600 text-sm font-medium mb-2">
                KYC Aprovado
              </p>
              <p className="text-3xl font-bold text-purple-600">
                {summary?.kyc.aprovado || 0}
              </p>
              <p className="text-xs text-slate-500 mt-2">
                {summary?.kyc.pendente || 0} pendentes
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Obras by Status */}
        <Card>
          <CardHeader>
            <CardTitle>Obras por Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {works.length > 0 ? (
                works.map((work) => (
                  <div
                    key={work.status}
                    className="flex justify-between items-center"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-700">
                        {work.status}
                      </p>
                      <div className="w-full bg-slate-200 rounded-full h-2 mt-1">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${work.percentual}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-sm font-semibold text-slate-900">
                        {work.count}
                      </p>
                      <p className="text-xs text-slate-500">
                        {work.percentual.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-slate-500 text-sm">Nenhum dado disponível</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Users by KYC Status */}
        <Card>
          <CardHeader>
            <CardTitle>Usuários por Status KYC</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {users.length > 0 ? (
                users.map((user) => (
                  <div key={user.kycStatus} className="flex justify-between items-center">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-700">
                        {user.kycStatus}
                      </p>
                      <div className="w-full bg-slate-200 rounded-full h-2 mt-1">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: `${user.percentual}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-sm font-semibold text-slate-900">
                        {user.count}
                      </p>
                      <p className="text-xs text-slate-500">
                        {user.percentual.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-slate-500 text-sm">Nenhum dado disponível</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Créditos Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Créditos por Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">
                    Status
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-700">
                    Quantidade
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-700">
                    Valor Total
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-700">
                    Valor Médio
                  </th>
                </tr>
              </thead>
              <tbody>
                {credits.length > 0 ? (
                  credits.map((credit) => (
                    <tr
                      key={credit.status}
                      className="border-b border-slate-100 hover:bg-slate-50"
                    >
                      <td className="py-3 px-4 font-medium text-slate-900">
                        {credit.status}
                      </td>
                      <td className="text-right py-3 px-4 text-slate-600">
                        {credit.count}
                      </td>
                      <td className="text-right py-3 px-4 text-slate-600">
                        R$ {(credit.valorTotal / 1000000).toFixed(2)}M
                      </td>
                      <td className="text-right py-3 px-4 text-slate-600">
                        R$ {(credit.count > 0 ? credit.valorTotal / credit.count : 0).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="text-center py-4 text-slate-500">
                      Nenhum dado disponível
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Export Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Exportar Dados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button
              onClick={() => handleExport("users")}
              disabled={exporting}
              className="w-full"
            >
              Exportar Usuários (CSV)
            </Button>
            <Button
              onClick={() => handleExport("obras")}
              disabled={exporting}
              className="w-full"
            >
              Exportar Obras (CSV)
            </Button>
            <Button
              onClick={() => handleExport("creditos")}
              disabled={exporting}
              className="w-full"
            >
              Exportar Créditos (CSV)
            </Button>
            <Button
              onClick={() => handleExport("evidencias")}
              disabled={exporting}
              className="w-full"
            >
              Exportar Evidências (CSV)
            </Button>
            <Button
              onClick={() => handleExport("kyc-documentos")}
              disabled={exporting}
              className="w-full"
            >
              Exportar KYC (CSV)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Timeline Chart */}
      {timeline && timeline.data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Timeline - Últimos 30 Dias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">
                  Novos Usuários
                </p>
                <div className="flex gap-1 h-40 items-end">
                  {timeline.data.map((point) => (
                    <div
                      key={point.date}
                      className="flex-1 bg-blue-200 rounded-t relative group"
                      style={{
                        height: `${Math.max((point.usuarios || 0) * 5, 2)}px`,
                      }}
                    >
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 hidden group-hover:block bg-slate-900 text-white text-xs py-1 px-2 rounded whitespace-nowrap z-10">
                        {point.usuarios || 0}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">
                  Novas Obras
                </p>
                <div className="flex gap-1 h-40 items-end">
                  {timeline.data.map((point) => (
                    <div
                      key={point.date}
                      className="flex-1 bg-orange-200 rounded-t relative group"
                      style={{
                        height: `${Math.max((point.obras || 0) * 5, 2)}px`,
                      }}
                    >
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 hidden group-hover:block bg-slate-900 text-white text-xs py-1 px-2 rounded whitespace-nowrap z-10">
                        {point.obras || 0}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">
                  Novos Créditos
                </p>
                <div className="flex gap-1 h-40 items-end">
                  {timeline.data.map((point) => (
                    <div
                      key={point.date}
                      className="flex-1 bg-green-200 rounded-t relative group"
                      style={{
                        height: `${Math.max((point.creditos || 0) * 5, 2)}px`,
                      }}
                    >
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 hidden group-hover:block bg-slate-900 text-white text-xs py-1 px-2 rounded whitespace-nowrap z-10">
                        {point.creditos || 0}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
