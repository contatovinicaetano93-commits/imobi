import type { Metadata } from "next";
import { scoreApi, type ScoreAtual, type ScoreHistorico } from "@/lib/api";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Score de Construtibilidade — imbobi" };

function getNivelThresholds(nivel: string): { proximo: string; proximoScore: number; progresso: number } {
  const thresholds = [
    { level: "Iniciante", min: 0, max: 449, next: "Regular", nextScore: 450 },
    { level: "Regular", min: 450, max: 649, next: "Bom", nextScore: 650 },
    { level: "Bom", min: 650, max: 799, next: "Excelente", nextScore: 800 },
    { level: "Excelente", min: 800, max: 1000, next: "Máximo", nextScore: 1000 },
  ];

  const current = thresholds.find((t) => t.level === nivel);
  if (!current) return { proximo: "Desconhecido", proximoScore: 0, progresso: 0 };

  const progress = ((current.min + 1000) % 1000) - (current.min % 1000);
  const normalized = Math.round(
    ((current.min + 1000 - current.min) / (current.max - current.min)) * 100
  );

  return {
    proximo: current.next,
    proximoScore: current.nextScore,
    progresso: Math.min(100, Math.round(((current.min + 1000 - current.min) * 100) / (current.max - current.min))),
  };
}

export default async function ScorePage() {
  const [scoreAtual, historico] = await Promise.all([
    scoreApi.atual(),
    scoreApi.historico(12),
  ]);

  const { proximo, proximoScore, progresso } = getNivelThresholds(scoreAtual.nivel);
  const pontosFaltando = proximoScore - scoreAtual.score;

  return (
    <div className="max-w-3xl space-y-8">
      {/* Score Header */}
      <div className={`rounded-2xl border p-8 shadow-sm ${scoreAtual.cor === "text-green-600" ? "bg-green-50 border-green-200" : scoreAtual.cor === "text-blue-600" ? "bg-blue-50 border-blue-200" : scoreAtual.cor === "text-yellow-600" ? "bg-yellow-50 border-yellow-200" : "bg-gray-50 border-gray-200"}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 uppercase tracking-wide font-semibold mb-2">
              Score de Construtibilidade
            </p>
            <h1 className={`text-5xl font-bold ${scoreAtual.cor}`}>{scoreAtual.score}</h1>
            <p className="text-sm text-gray-600 mt-2">{scoreAtual.descricao}</p>
          </div>
          <div className="text-right">
            <div className={`text-3xl font-bold ${scoreAtual.cor} mb-2`}>
              {scoreAtual.nivel}
            </div>
            <p className="text-xs text-gray-500">
              Próximo nível: {proximo}
            </p>
          </div>
        </div>
      </div>

      {/* Progress to Next Level */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-gray-900">Progresso para {proximo}</h3>
          <span className="text-sm text-gray-500">
            {scoreAtual.score} / {proximoScore}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-brand-500 to-brand-600 h-full transition-all"
            style={{
              width: `${Math.min(100, (scoreAtual.score / proximoScore) * 100)}%`,
            }}
          />
        </div>
        <p className="text-sm text-gray-600 mt-3">
          Faltam <span className="font-semibold">{pontosFaltando} pontos</span> para alcançar o nível <span className="font-semibold">{proximo}</span>.
        </p>
      </div>

      {/* Score Components Breakdown */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4">Composição do Score</h3>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Base (novo cliente)</span>
            <span className="font-medium text-gray-900">600 pts</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Obras concluídas no prazo</span>
            <span className="font-medium text-gray-900">até 200 pts</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Taxa de conclusão média</span>
            <span className="font-medium text-gray-900">até 300 pts</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Créditos sem atrasos</span>
            <span className="font-medium text-gray-900">até 200 pts</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Tempo como cliente</span>
            <span className="font-medium text-gray-900">até 100 pts</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Documentação validada (KYC)</span>
            <span className="font-medium text-gray-900">até 200 pts</span>
          </div>
        </div>
      </div>

      {/* Historical Scores */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4">Histórico de Score</h3>
        {historico.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhum registro no histórico.</p>
        ) : (
          <div className="space-y-2">
            {historico.map((item) => (
              <div key={item.id} className="flex justify-between items-center text-sm p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{item.score}</p>
                  <p className="text-xs text-gray-500">{item.motivo}</p>
                </div>
                <p className="text-gray-500">
                  {new Date(item.criadoEm).toLocaleDateString("pt-BR")}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
