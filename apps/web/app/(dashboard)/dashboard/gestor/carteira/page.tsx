"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  CreditCard,
  TrendingUp,
  Users,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { managerApi } from "@/lib/api";

type Obra = {
  id: string;
  nome: string;
  endereco: string;
  cidade: string;
  status: string;
  totalUnidades: number;
  unidadesDisp: number;
};

type Credito = {
  id: string;
  usuarioId: string;
  usuarioNome: string;
  valor: number;
  status: string;
  dataAprovacao?: string;
  dataVencimento?: string;
  valorPago: number;
};

type Portfolio = {
  totalObras: number;
  totalCreditos: number;
  valorTotalCreditos: number;
  valorPagoCreditos: number;
  obras: Obra[];
  creditos: Credito[];
};

export default function CarteiraPage() {
  const [loading, setLoading] = useState(true);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"obras" | "creditos">("obras");

  useEffect(() => {
    async function loadPortfolio() {
      try {
        setLoading(true);
        const data = await managerApi.getCarteira();
        setPortfolio(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao carregar carteira");
      } finally {
        setLoading(false);
      }
    }

    loadPortfolio();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#1B4FD8] animate-spin" />
          <p className="text-sm text-gray-500">Carregando carteira...</p>
        </div>
      </div>
    );
  }

  if (error || !portfolio) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-red-900">Erro ao carregar</h3>
          <p className="text-sm text-red-700 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  const pctPagoCreditos =
    portfolio.valorTotalCreditos > 0
      ? Math.round((portfolio.valorPagoCreditos / portfolio.valorTotalCreditos) * 100)
      : 0;
  const obrasAtivas = portfolio.obras.filter((o) => o.status !== "FINALIZADO").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Minha Carteira</h1>
        <p className="text-sm text-gray-500 mt-1">Visão completa de obras e créditos sob sua gestão</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          {
            icon: Building2,
            label: "Obras",
            value: portfolio.totalObras,
            detail: `${obrasAtivas} ativas`,
            color: "bg-blue-50 text-[#1B4FD8]",
          },
          {
            icon: CreditCard,
            label: "Créditos",
            value: portfolio.totalCreditos,
            detail: `${pctPagoCreditos}% pago`,
            color: "bg-green-50 text-[#16a34a]",
          },
          {
            icon: TrendingUp,
            label: "Valor Total",
            value: `R$ ${(portfolio.valorTotalCreditos / 1000).toFixed(1)}k`,
            detail: "em créditos",
            color: "bg-purple-50 text-purple-600",
          },
          {
            icon: Users,
            label: "Mutuários",
            value: portfolio.creditos.length,
            detail: "únicos",
            color: "bg-amber-50 text-amber-600",
          },
        ].map(({ icon: Icon, label, value, detail, color }) => (
          <div key={label} className={`${color} rounded-2xl border border-opacity-20 p-4`}>
            <div className="flex items-start justify-between mb-2">
              <Icon className="w-5 h-5" />
              <span className="text-xs font-semibold opacity-60">{label}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs opacity-60 mt-1">{detail}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 flex gap-8">
        {["obras", "creditos"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as "obras" | "creditos")}
            className={`py-3 font-semibold border-b-2 transition-colors ${
              activeTab === tab
                ? "text-[#1B4FD8] border-[#1B4FD8]"
                : "text-gray-500 border-transparent hover:text-gray-700"
            }`}
          >
            {tab === "obras" ? "Obras" : "Créditos"}
          </button>
        ))}
      </div>

      {/* Obras Tab */}
      {activeTab === "obras" && (
        <div className="space-y-3">
          {portfolio.obras.length === 0 ? (
            <div className="bg-gray-50 rounded-2xl p-12 text-center">
              <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 font-semibold">Nenhuma obra na carteira</p>
            </div>
          ) : (
            portfolio.obras.map((obra) => (
              <div
                key={obra.id}
                className="bg-white border border-gray-200 rounded-2xl p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-gray-900">{obra.nome}</h3>
                      <span
                        className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                          obra.status === "ATIVO"
                            ? "bg-green-100 text-[#16a34a]"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {obra.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-500 mb-3">
                      <MapPin className="w-4 h-4" />
                      {obra.endereco}, {obra.cidade}
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500 mb-1">Total de unidades</p>
                        <p className="font-semibold text-gray-900">{obra.totalUnidades}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 mb-1">Disponíveis</p>
                        <p className="font-semibold text-[#1B4FD8]">{obra.unidadesDisp}</p>
                      </div>
                    </div>
                  </div>
                  <a
                    href={`/dashboard/gestor/obras/${obra.id}`}
                    className="text-sm font-semibold text-[#1B4FD8] hover:underline"
                  >
                    Ver detalhes →
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Créditos Tab */}
      {activeTab === "creditos" && (
        <div className="space-y-3">
          {portfolio.creditos.length === 0 ? (
            <div className="bg-gray-50 rounded-2xl p-12 text-center">
              <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 font-semibold">Nenhum crédito na carteira</p>
            </div>
          ) : (
            portfolio.creditos.map((credito) => (
              <div
                key={credito.id}
                className="bg-white border border-gray-200 rounded-2xl p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{credito.usuarioNome}</h3>
                      <span
                        className={`text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                          credito.status === "ATIVO"
                            ? "bg-green-100 text-[#16a34a]"
                            : credito.status === "PENDENTE"
                            ? "bg-yellow-100 text-amber-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {credito.status === "ATIVO" && <CheckCircle2 className="w-3 h-3" />}
                        {credito.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">ID: {credito.id.slice(0, 8)}...</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm mb-4 pb-4 border-b border-gray-100">
                  <div>
                    <p className="text-gray-500 mb-1">Valor solicitado</p>
                    <p className="font-semibold text-gray-900">
                      R$ {(credito.valor / 1000).toFixed(1)}k
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">Valor pago</p>
                    <p className="font-semibold text-[#16a34a]">
                      R$ {(credito.valorPago / 1000).toFixed(1)}k
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">Saldo</p>
                    <p className="font-semibold text-gray-900">
                      R$ {((credito.valor - credito.valorPago) / 1000).toFixed(1)}k
                    </p>
                  </div>
                </div>

                {credito.dataAprovacao && (
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>Aprovado em: {new Date(credito.dataAprovacao).toLocaleDateString("pt-BR")}</span>
                    {credito.dataVencimento && (
                      <span>Vencimento: {new Date(credito.dataVencimento).toLocaleDateString("pt-BR")}</span>
                    )}
                  </div>
                )}

                <a
                  href={`/dashboard/credito/${credito.id}`}
                  className="mt-3 inline-block text-sm font-semibold text-[#1B4FD8] hover:underline"
                >
                  Ver extrato →
                </a>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
