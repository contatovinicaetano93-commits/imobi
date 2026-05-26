"use client";

import { useEffect, useState } from "react";

interface EtapaPendente {
  etapaId: string;
  nome: string;
  percentualObra: number;
  valorLiberacao: number;
  evidenciasCount: number;
  criadoEm: string;
  obra: {
    obraId: string;
    nome: string;
    usuario: { usuarioId: string; nome: string };
  };
}

interface ManagerStats {
  filaAprovacoes: number;
  filaKyc: number;
  creditosAtivos: number;
  obrasAtivas: number;
}

export default function ManagerPage() {
  const [stats, setStats] = useState<ManagerStats | null>(null);
  const [etapas, setEtapas] = useState<EtapaPendente[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, etapasRes] = await Promise.all([
          fetch("/api/v1/manager/dashboard", { credentials: "include" }),
          fetch("/api/v1/manager/etapas-pendentes", { credentials: "include" }),
        ]);

        if (statsRes.ok) setStats(await statsRes.json());
        if (etapasRes.ok) {
          const data = await etapasRes.json();
          setEtapas(data.etapas ?? []);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  async function handleApprove(etapaId: string) {
    try {
      const res = await fetch(`/api/v1/manager/etapas/${etapaId}/aprovar`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (res.ok) setEtapas(etapas.filter((e) => e.etapaId !== etapaId));
    } catch (error) {
      console.error("Failed to approve:", error);
    }
  }

  async function handleReject(etapaId: string) {
    const motivo = prompt("Motivo da rejeição:");
    if (!motivo) return;
    try {
      const res = await fetch(`/api/v1/manager/etapas/${etapaId}/rejeitar`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivo }),
        credentials: "include",
      });
      if (res.ok) setEtapas(etapas.filter((e) => e.etapaId !== etapaId));
    } catch (error) {
      console.error("Failed to reject:", error);
    }
  }

  if (loading) {
    return <div className="text-center py-12">Carregando...</div>;
  }

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-gray-900">Aprovações Pendentes</h2>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-orange-50 rounded-lg p-4">
            <p className="text-gray-600 text-sm">Etapas Pendentes</p>
            <p className="text-3xl font-bold text-gray-900">{stats.filaAprovacoes}</p>
          </div>
          <div className="bg-red-50 rounded-lg p-4">
            <p className="text-gray-600 text-sm">KYC Pendentes</p>
            <p className="text-3xl font-bold text-gray-900">{stats.filaKyc}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-gray-600 text-sm">Créditos Ativos</p>
            <p className="text-3xl font-bold text-gray-900">{stats.creditosAtivos}</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-gray-600 text-sm">Obras em Execução</p>
            <p className="text-3xl font-bold text-gray-900">{stats.obrasAtivas}</p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {etapas.length === 0 ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
            <p className="text-green-800 font-medium">✓ Nenhuma etapa aguardando aprovação</p>
          </div>
        ) : (
          etapas.map((etapa) => (
            <div
              key={etapa.etapaId}
              className="bg-white rounded-lg shadow p-6 flex items-center justify-between"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
                    Etapa
                  </span>
                  <p className="text-gray-900 font-semibold">{etapa.nome}</p>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Obra: <span className="font-medium">{etapa.obra.nome}</span> ·
                  Usuário: <span className="font-medium">{etapa.obra.usuario.nome}</span>
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {etapa.percentualObra}% da obra · R$ {Number(etapa.valorLiberacao).toLocaleString("pt-BR")} ·{" "}
                  {etapa.evidenciasCount} evidências
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(etapa.criadoEm).toLocaleString("pt-BR")}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleApprove(etapa.etapaId)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                >
                  ✓ Aprovar
                </button>
                <button
                  onClick={() => handleReject(etapa.etapaId)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                >
                  ✗ Rejeitar
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
