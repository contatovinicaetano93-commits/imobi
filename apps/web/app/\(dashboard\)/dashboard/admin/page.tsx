"use client";

import { useEffect, useState } from "react";
import { adminApi, type AdminStats } from "@/lib/api";

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.dashboard().then(setStats).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-6">Carregando...</div>;
  }

  if (!stats) {
    return <div className="p-6 text-red-600">Erro ao carregar dashboard</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Dashboard Admin</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <p className="text-gray-600 text-sm">Usuários</p>
          <p className="text-2xl font-bold text-gray-900">{stats.usuarios}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <p className="text-gray-600 text-sm">Créditos</p>
          <p className="text-2xl font-bold text-gray-900">{stats.creditos}</p>
          <p className="text-xs text-green-600">{stats.creditosAtivos} ativos</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <p className="text-gray-600 text-sm">Obras</p>
          <p className="text-2xl font-bold text-gray-900">{stats.obras}</p>
          <p className="text-xs text-blue-600">{stats.obrasAtivas} em execução</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <p className="text-gray-600 text-sm">Etapas</p>
          <p className="text-2xl font-bold text-gray-900">{stats.etapas}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <p className="text-gray-600 text-sm mb-2">Valor Total Creditado</p>
          <p className="text-3xl font-bold text-green-600">{formatBRL(stats.valorTotalCreditado)}</p>
        </div>
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <p className="text-gray-600 text-sm mb-2">Valor Total Liberado</p>
          <p className="text-3xl font-bold text-blue-600">{formatBRL(stats.valorTotalLiberado)}</p>
        </div>
      </div>
    </div>
  );
}
