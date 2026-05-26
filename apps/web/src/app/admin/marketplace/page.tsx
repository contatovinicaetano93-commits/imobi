"use client";

import { useEffect, useState } from "react";

interface Parceiro {
  parceiroId: string;
  nomeEmpresa: string;
  cnpj: string;
  ativo: boolean;
  avaliacaoMedia: number;
  usuario?: { nome: string };
  criadoEm: string;
}

export default function MarketplacePage() {
  const [parceiros, setParceiros] = useState<Parceiro[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/v1/marketplace/parceiros/search?limit=50", {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setParceiros(data.parceiros ?? data ?? []);
        }
      } catch (error) {
        console.error("Failed to fetch marketplace data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  async function toggleParceiro(id: string, ativo: boolean) {
    try {
      const res = await fetch(`/api/v1/marketplace/parceiros/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ativo: !ativo }),
        credentials: "include",
      });
      if (res.ok) {
        setParceiros(
          parceiros.map((p) => (p.parceiroId === id ? { ...p, ativo: !ativo } : p))
        );
      }
    } catch (error) {
      console.error("Failed to toggle parceiro:", error);
    }
  }

  if (loading) return <div className="text-center py-12">Carregando...</div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Marketplace</h2>
        <span className="text-sm text-gray-500">{parceiros.length} parceiros</span>
      </div>

      {parceiros.length === 0 ? (
        <p className="text-gray-500 text-center py-8">Nenhum parceiro cadastrado</p>
      ) : (
        <div className="space-y-4">
          {parceiros.map((p) => (
            <div
              key={p.parceiroId}
              className="bg-white rounded-lg shadow p-6 flex items-center justify-between"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-block w-2 h-2 rounded-full ${
                      p.ativo ? "bg-green-500" : "bg-gray-400"
                    }`}
                  />
                  <p className="text-gray-900 font-semibold">{p.nomeEmpresa}</p>
                  <span className="text-xs text-gray-500 font-mono">{p.cnpj}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {p.usuario?.nome && `Responsável: ${p.usuario.nome} · `}
                  Avaliação: <span className="font-medium">{Number(p.avaliacaoMedia).toFixed(1)} ★</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Desde {new Date(p.criadoEm).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <button
                onClick={() => toggleParceiro(p.parceiroId, p.ativo)}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  p.ativo
                    ? "bg-red-100 text-red-700 hover:bg-red-200"
                    : "bg-green-100 text-green-700 hover:bg-green-200"
                }`}
              >
                {p.ativo ? "Desativar" : "Ativar"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
