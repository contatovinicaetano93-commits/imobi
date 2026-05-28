"use client";



import { useEffect, useState } from "react";
import { creditoApi, scoreApi, obrasApi, notificacoesApi, type CreditoResumo, type ScoreAtual, type ScoreHistorico, type ObraResumo, type Notificacao } from "@/lib/api";
import { CreditSimulator } from "@/components/dashboard/CreditSimulator";
import { ScoreDynamics } from "@/components/dashboard/ScoreDynamics";
import { NotificationFeed } from "@/components/dashboard/NotificationFeed";
import Link from "next/link";

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function ConstrutorPage() {
  const [creditos, setCreditos] = useState<CreditoResumo[]>([]);
  const [scoreAtual, setScoreAtual] = useState<ScoreAtual | null>(null);
  const [scoreHistorico, setScoreHistorico] = useState<ScoreHistorico[]>([]);
  const [obras, setObras] = useState<ObraResumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      creditoApi.meus().catch(() => []),
      scoreApi.atual().catch(() => null),
      scoreApi.historico(12).catch(() => []),
      obrasApi.listar().catch(() => []),
    ])
      .then(([creditosData, scoreData, historicoData, obrasData]) => {
        setCreditos(creditosData);
        setScoreAtual(scoreData);
        setScoreHistorico(historicoData);
        setObras(obrasData);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Portal do Construtor</h1>
          <p className="text-gray-500 text-sm mt-1">Carregando...</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <p className="text-gray-500">Carregando seu painel...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Portal do Construtor</h1>
        </div>
        <div className="bg-red-50 rounded-2xl border border-red-100 p-6">
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  const creditoAtivo = creditos.find((c) => c.status === "ATIVO");
  const creditoTotal = creditos.reduce((sum, c) => sum + c.valorAprovado, 0);
  const creditoLiberado = creditos.reduce((sum, c) => sum + c.valorLiberado, 0);
  const creditoDisponivel = creditoTotal - creditoLiberado;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Portal do Construtor</h1>
        <p className="text-gray-500 text-sm mt-1">
          Acompanhe seus créditos, obras e desempenho
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-25 rounded-2xl border border-blue-200 p-6">
          <p className="text-sm text-gray-600 mb-2">Crédito Disponível</p>
          <p className="text-3xl font-bold text-blue-600">
            {brl(creditoDisponivel)}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Total: {brl(creditoTotal)}
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-25 rounded-2xl border border-green-200 p-6">
          <p className="text-sm text-gray-600 mb-2">Obras em Execução</p>
          <p className="text-3xl font-bold text-green-600">
            {obras.filter((o) => o.status === "EM_EXECUCAO").length}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            de {obras.length} obras
          </p>
        </div>

        {scoreAtual && (
          <div className={`bg-gradient-to-br rounded-2xl border p-6 ${
            scoreAtual.score >= 800
              ? "from-green-50 to-emerald-25 border-green-200"
              : scoreAtual.score >= 700
                ? "from-blue-50 to-blue-25 border-blue-200"
                : scoreAtual.score >= 600
                  ? "from-yellow-50 to-yellow-25 border-yellow-200"
                  : "from-red-50 to-red-25 border-red-200"
          }`}>
            <p className="text-sm text-gray-600 mb-2">Score de Desempenho</p>
            <p className={`text-3xl font-bold ${scoreAtual.cor}`}>
              {scoreAtual.score}
            </p>
            <p className="text-xs text-gray-500 mt-2">{scoreAtual.nivel}</p>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Left Column - Credit & Score */}
        <div className="lg:col-span-2 space-y-6 sm:space-y-8">
          {/* Credit Comparison */}
          {creditoAtivo && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                Comparativo de Crédito
              </h2>
              <CreditSimulator
                simulado={{
                  valor: creditoAtivo.valorAprovado * 0.95,
                  taxa: creditoAtivo.taxaMensal,
                  prazo: creditoAtivo.prazoMeses,
                  parcelaMensal: (creditoAtivo.valorAprovado * creditoAtivo.taxaMensal) / creditoAtivo.prazoMeses,
                }}
                aprovado={{
                  valor: creditoAtivo.valorAprovado,
                  taxa: creditoAtivo.taxaMensal,
                  prazo: creditoAtivo.prazoMeses,
                  parcelaMensal: (creditoAtivo.valorAprovado * creditoAtivo.taxaMensal) / creditoAtivo.prazoMeses,
                  liberado: creditoAtivo.valorLiberado,
                  disponivel: creditoTotal - creditoLiberado,
                }}
              />
            </div>
          )}

          {/* Score Dynamics */}
          {scoreAtual && scoreHistorico.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                Dinâmica de Score
              </h2>
              <ScoreDynamics
                historia={scoreHistorico.map((h) => ({
                  data: h.criadoEm,
                  score: h.score,
                  motivo: h.motivo,
                }))}
                scoreAtual={scoreAtual.score}
              />
            </div>
          )}
        </div>

        {/* Right Column - Notifications & Quick Links */}
        <div className="space-y-6 sm:space-y-8">
          {/* Notification Feed */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Atividades Recentes
            </h2>
            <NotificationFeed limit={8} />
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-3">
            <h3 className="font-semibold text-gray-900 mb-4">Ações Rápidas</h3>
            <Link
              href="/dashboard/obras"
              className="flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors border border-blue-200"
            >
              <span className="text-sm font-medium text-blue-900">Minhas Obras</span>
              <span className="text-xl">📋</span>
            </Link>
            <Link
              href="/dashboard/credito"
              className="flex items-center justify-between p-3 bg-green-50 hover:bg-green-100 rounded-xl transition-colors border border-green-200"
            >
              <span className="text-sm font-medium text-green-900">Extrato de Crédito</span>
              <span className="text-xl">💳</span>
            </Link>
            <Link
              href="/dashboard/score"
              className="flex items-center justify-between p-3 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors border border-purple-200"
            >
              <span className="text-sm font-medium text-purple-900">Análise de Score</span>
              <span className="text-xl">📊</span>
            </Link>
            <Link
              href="/dashboard/perfil"
              className="flex items-center justify-between p-3 bg-orange-50 hover:bg-orange-100 rounded-xl transition-colors border border-orange-200"
            >
              <span className="text-sm font-medium text-orange-900">Perfil e Dados</span>
              <span className="text-xl">👤</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Obras List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Obras em Execução</h2>
          <Link
            href="/dashboard/obras"
            className="text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            Ver todas →
          </Link>
        </div>

        {obras.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <p className="text-4xl mb-4">🏗️</p>
            <p className="text-gray-600 mb-4">Nenhuma obra registrada ainda</p>
            <Link
              href="/dashboard/obras"
              className="inline-block bg-brand-600 text-white text-sm font-semibold px-6 py-2 rounded-lg hover:bg-brand-700 transition-colors"
            >
              Iniciar uma Obra
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {obras.slice(0, 6).map((obra) => (
              <Link
                key={obra.id}
                href={`/dashboard/obras/${obra.id}`}
                className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900">{obra.nome}</h3>
                    <p className="text-sm text-gray-500 truncate">{obra.endereco || "Local não informado"}</p>
                  </div>
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full shrink-0 ${
                    obra.status === "EM_EXECUCAO"
                      ? "bg-blue-100 text-blue-700"
                      : obra.status === "CONCLUIDA"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                  }`}>
                    {obra.status === "EM_EXECUCAO" ? "Em Execução" : obra.status === "CONCLUIDA" ? "Concluída" : "Planejamento"}
                  </span>
                </div>

                {obra.progresso !== undefined && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-gray-600">Progresso</p>
                      <p className="text-xs font-bold text-gray-900">{obra.progresso}%</p>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-brand-600 h-2 rounded-full transition-all"
                        style={{ width: `${obra.progresso}%` }}
                      />
                    </div>
                  </div>
                )}

                {obra.credito && (
                  <div className="pt-4 border-t border-gray-100">
                    <p className="text-xs text-gray-500 mb-1">Crédito da Obra</p>
                    <p className="text-sm font-bold text-brand-600">
                      {brl(obra.credito.valorLiberado)} / {brl(obra.credito.valorAprovado)}
                    </p>
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
