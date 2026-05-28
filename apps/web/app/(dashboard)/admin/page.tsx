"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "@imbobi/core";

interface AdminStats {
  totalUsuarios: number;
  usuariosBloqueados: number;
  kycPendentes: number;
  creditosPendentes: number;
  etapasPendentes: number;
  ultimaAtualização: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get("/admin/stats");
        setStats(response);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Erro ao carregar estatísticas"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return <div className="text-center py-12">Carregando...</div>;
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        {error}
      </div>
    );
  }

  if (!stats) {
    return <div className="text-center py-12">Nenhum dado disponível</div>;
  }

  const statCards = [
    {
      title: "Total de Usuários",
      value: stats.totalUsuarios,
      bgColor: "bg-blue-50",
      textColor: "text-blue-700",
      borderColor: "border-blue-200",
    },
    {
      title: "Usuários Bloqueados",
      value: stats.usuariosBloqueados,
      bgColor: "bg-red-50",
      textColor: "text-red-700",
      borderColor: "border-red-200",
    },
    {
      title: "KYC Pendentes",
      value: stats.kycPendentes,
      bgColor: "bg-yellow-50",
      textColor: "text-yellow-700",
      borderColor: "border-yellow-200",
      link: "/admin/kyc",
    },
    {
      title: "Créditos Pendentes",
      value: stats.creditosPendentes,
      bgColor: "bg-orange-50",
      textColor: "text-orange-700",
      borderColor: "border-orange-200",
      link: "/admin/credits",
    },
    {
      title: "Etapas Aguardando",
      value: stats.etapasPendentes,
      bgColor: "bg-purple-50",
      textColor: "text-purple-700",
      borderColor: "border-purple-200",
      link: "/admin/stages",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat) => (
          <a
            key={stat.title}
            href={stat.link || "#"}
            className={`${stat.bgColor} border ${stat.borderColor} rounded-lg p-6 transition hover:shadow-lg ${stat.link ? "cursor-pointer" : ""}`}
          >
            <h3 className="text-slate-600 text-sm font-medium mb-2">
              {stat.title}
            </h3>
            <p className={`${stat.textColor} text-3xl font-bold`}>
              {stat.value}
            </p>
          </a>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a
              href="/admin/users"
              className="block p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
            >
              <h4 className="font-semibold text-slate-900">Gerenciar Usuários</h4>
              <p className="text-sm text-slate-600 mt-1">
                Bloquear, desbloquear e filtrar usuários
              </p>
            </a>
            <a
              href="/admin/kyc"
              className="block p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
            >
              <h4 className="font-semibold text-slate-900">
                Análise de KYC
              </h4>
              <p className="text-sm text-slate-600 mt-1">
                Aprovar ou rejeitar documentos em lote
              </p>
            </a>
            <a
              href="/admin/credits"
              className="block p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
            >
              <h4 className="font-semibold text-slate-900">Créditos</h4>
              <p className="text-sm text-slate-600 mt-1">
                Aprovar, rejeitar e gerenciar créditos
              </p>
            </a>
            <a
              href="/admin/stages"
              className="block p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
            >
              <h4 className="font-semibold text-slate-900">Etapas</h4>
              <p className="text-sm text-slate-600 mt-1">
                Aprovar etapas em lote
              </p>
            </a>
            <a
              href="/admin/analytics"
              className="block p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
            >
              <h4 className="font-semibold text-slate-900">Analytics</h4>
              <p className="text-sm text-slate-600 mt-1">
                Dashboard de métricas e exportação de dados
              </p>
            </a>
            <a
              href="/admin/monitoring"
              className="block p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
            >
              <h4 className="font-semibold text-slate-900">Monitoramento</h4>
              <p className="text-sm text-slate-600 mt-1">
                Acompanhar saúde do sistema
              </p>
            </a>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Último Atualização</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-600">
            {new Date(stats.ultimaAtualização).toLocaleString("pt-BR")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
