"use client";

import { useEffect, useState } from "react";

interface DashboardStats {
  filaAprovacoes: number;
  filaKyc: number;
  creditosAtivos: number;
  obrasAtivas: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch("/api/v1/manager/dashboard", {
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (loading) {
    return <div className="text-center py-12">Carregando...</div>;
  }

  if (!stats) {
    return <div className="text-center py-12 text-red-600">Erro ao carregar estatísticas</div>;
  }

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-gray-900">Visão Geral</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Créditos Ativos"
          value={stats.creditosAtivos}
          icon="💰"
          color="green"
        />
        <StatCard
          title="Obras em Execução"
          value={stats.obrasAtivas}
          icon="🏗️"
          color="yellow"
        />
        <StatCard
          title="Fila KYC"
          value={stats.filaKyc}
          icon="🆔"
          color="blue"
        />
        <StatCard
          title="Fila Aprovações"
          value={stats.filaAprovacoes}
          icon="✅"
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AlertCard
          title="KYC Pendente"
          count={stats.filaKyc}
          link="/admin/kyc"
          color="red"
        />
        <AlertCard
          title="Aprovações Pendentes"
          count={stats.filaAprovacoes}
          link="/admin/manager"
          color="orange"
        />
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Atividade Recente
        </h3>
        <p className="text-gray-600">Logs de atividade serão exibidos aqui</p>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
  icon: string;
  color: string;
}) {
  const colorClasses = {
    blue: "bg-blue-50",
    green: "bg-green-50",
    yellow: "bg-yellow-50",
    purple: "bg-purple-50",
  };

  return (
    <div className={`${colorClasses[color as keyof typeof colorClasses]} rounded-lg p-6`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
        </div>
        <span className="text-4xl">{icon}</span>
      </div>
    </div>
  );
}

function AlertCard({
  title,
  count,
  link,
  color,
}: {
  title: string;
  count: number;
  link: string;
  color: string;
}) {
  const colorClasses = {
    red: "border-red-200 bg-red-50",
    orange: "border-orange-200 bg-orange-50",
    blue: "border-blue-200 bg-blue-50",
  };

  return (
    <a href={link}>
      <div
        className={`${colorClasses[color as keyof typeof colorClasses]} border-2 rounded-lg p-6 hover:shadow-lg transition cursor-pointer`}
      >
        <p className="text-gray-700 font-medium">{title}</p>
        <p className="text-4xl font-bold mt-2 text-gray-900">{count}</p>
        <p className="text-sm text-gray-600 mt-4">Clique para revisar →</p>
      </div>
    </a>
  );
}
