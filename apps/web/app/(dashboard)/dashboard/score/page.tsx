import type { Metadata } from "next";
import {
  TrendingUp,
  Award,
  CheckCircle2,
  Clock,
  Building2,
  ShieldCheck,
  Star,
  History,
  AlertCircle,
} from "lucide-react";
import { scoreApi, type ScoreAtual, type ScoreHistorico } from "@/lib/api";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: "Score — IMOBI" };

function getNivelThresholds(nivel: string): { proximo: string; proximoScore: number } {
  const thresholds = [
    { level: "Iniciante",  proximo: "Regular",   proximoScore: 450  },
    { level: "Regular",    proximo: "Bom",        proximoScore: 650  },
    { level: "Bom",        proximo: "Excelente",  proximoScore: 800  },
    { level: "Excelente",  proximo: "Máximo",     proximoScore: 1000 },
  ];
  return thresholds.find((t) => t.level === nivel) ?? { proximo: "—", proximoScore: 1000 };
}

function getScoreColors(score: number) {
  if (score >= 800) return { bg: "bg-green-50", border: "border-green-200", badge: "bg-green-100 text-green-800 ring-1 ring-green-300", bar: "bg-[#16a34a]", text: "text-[#16a34a]", label: "Excelente" };
  if (score >= 650) return { bg: "bg-blue-50", border: "border-blue-200", badge: "bg-blue-100 text-blue-800 ring-1 ring-blue-300", bar: "bg-[#1B4FD8]", text: "text-[#1B4FD8]", label: "Bom" };
  if (score >= 450) return { bg: "bg-yellow-50", border: "border-yellow-200", badge: "bg-yellow-100 text-yellow-800 ring-1 ring-yellow-300", bar: "bg-yellow-500", text: "text-yellow-600", label: "Regular" };
  return { bg: "bg-red-50", border: "border-red-200", badge: "bg-red-100 text-red-800 ring-1 ring-red-300", bar: "bg-red-500", text: "text-red-600", label: "Iniciante" };
}

const BREAKDOWN_ITEMS = [
  { icon: Star,         label: "Base (novo cliente)",         pts: "600 pts" },
  { icon: CheckCircle2, label: "Obras concluídas no prazo",   pts: "até 200 pts" },
  { icon: TrendingUp,   label: "Taxa de conclusão média",     pts: "até 300 pts" },
  { icon: Clock,        label: "Créditos sem atrasos",        pts: "até 200 pts" },
  { icon: Building2,    label: "Tempo como cliente",          pts: "até 100 pts" },
  { icon: ShieldCheck,  label: "Documentação validada (KYC)", pts: "até 200 pts" },
];

export default async function ScorePage() {
  const [scoreAtual, historico] = await Promise.all([
    scoreApi.atual().catch(() => null as ScoreAtual | null),
    scoreApi.historico(12).catch(() => [] as ScoreHistorico[]),
  ]);

  if (!scoreAtual) {
    return (
      <div className="max-w-3xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 rounded-xl">
            <TrendingUp className="w-6 h-6 text-[#1B4FD8]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Score de Construtibilidade</h1>
            <p className="text-sm text-gray-500">Seu índice de confiança para crédito de obra</p>
          </div>
        </div>
        <div className="bg-gray-50 rounded-2xl border border-gray-100 p-12 text-center">
          <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-4" />
          <p className="font-semibold text-gray-600 mb-2">Score ainda não calculado</p>
          <p className="text-sm text-gray-400 max-w-xs mx-auto">
            Seu score será calculado após as primeiras operações na plataforma.
          </p>
          <a href="/dashboard/kyc" className="inline-block mt-6 text-sm font-semibold text-[#1B4FD8] hover:underline">
            Completar verificação de identidade →
          </a>
        </div>
        <ScoreBreakdownCard />
      </div>
    );
  }

  const { proximo, proximoScore } = getNivelThresholds(scoreAtual.nivel);
  const pontosFaltando = proximoScore - scoreAtual.score;
  const colors = getScoreColors(scoreAtual.score);
  const progressPct = Math.min(100, Math.round((scoreAtual.score / proximoScore) * 100));

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-blue-50 rounded-xl">
          <TrendingUp className="w-6 h-6 text-[#1B4FD8]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Score de Construtibilidade</h1>
          <p className="text-sm text-gray-500">Seu índice de confiança para crédito de obra</p>
        </div>
      </div>

      {/* Score Hero */}
      <div className={`rounded-2xl border ${colors.bg} ${colors.border} shadow-sm overflow-hidden`}>
        <div className="p-8">
          <div className="flex items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <Award className={`w-6 h-6 ${colors.text}`} />
                <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${colors.badge}`}>
                  {colors.label}
                </span>
              </div>
              <p className={`text-7xl font-black tracking-tighter ${colors.text} leading-none`}>
                {scoreAtual.score}
              </p>
              <p className="text-sm text-gray-500 mt-3 max-w-xs">{scoreAtual.descricao}</p>
            </div>
            <div className="hidden sm:flex flex-col items-end gap-2 shrink-0">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Nível atual</p>
              <p className={`text-3xl font-bold ${colors.text}`}>{scoreAtual.nivel}</p>
              <p className="text-xs text-gray-400 mt-1">
                Próximo: <span className="font-semibold text-gray-600">{proximo}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 bg-gray-50 rounded-xl">
            <TrendingUp className="w-4 h-4 text-gray-500" />
          </div>
          <h3 className="font-semibold text-gray-900">Progresso para {proximo}</h3>
        </div>
        <div className="flex justify-between items-center text-sm mb-3">
          <span className="text-gray-500">
            <span className={`font-bold text-lg ${colors.text}`}>{scoreAtual.score}</span>
            <span className="text-gray-400 mx-1">/</span>
            <span className="text-gray-600 font-medium">{proximoScore}</span>
          </span>
          <span className="text-xs text-gray-400 font-medium">{progressPct}% concluído</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
          <div className={`${colors.bar} h-full rounded-full transition-all duration-700`} style={{ width: `${progressPct}%` }} />
        </div>
        {pontosFaltando > 0 && (
          <p className="text-sm text-gray-500 mt-4 bg-gray-50 rounded-xl px-4 py-3">
            Faltam <span className={`font-bold ${colors.text}`}>{pontosFaltando} pontos</span>{" "}
            para alcançar o nível <span className="font-semibold text-gray-700">{proximo}</span>.
          </p>
        )}
      </div>

      <ScoreBreakdownCard />

      {/* Histórico */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-3">
          <div className="p-2 bg-gray-50 rounded-xl">
            <History className="w-4 h-4 text-gray-500" />
          </div>
          <h3 className="font-semibold text-gray-900">Histórico de Score</h3>
        </div>
        {historico.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <History className="w-8 h-8 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">Nenhum registro no histórico.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {historico.map((item: ScoreHistorico) => {
              const c = getScoreColors(item.score);
              return (
                <div key={item.id} className="flex items-center gap-4 px-6 py-4">
                  <div className={`flex items-center justify-center w-12 h-10 rounded-xl text-sm font-bold ${c.badge} shrink-0 tabular-nums`}>
                    {item.score}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">{item.motivo}</p>
                  </div>
                  <p className="text-xs text-gray-400 shrink-0 tabular-nums">
                    {new Date(item.criadoEm).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ScoreBreakdownCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-3">
        <div className="p-2 bg-gray-50 rounded-xl">
          <Star className="w-4 h-4 text-gray-500" />
        </div>
        <h3 className="font-semibold text-gray-900">Composição do Score</h3>
        <span className="ml-auto text-xs text-gray-400 font-medium">Máximo: 1.600 pts</span>
      </div>
      <div className="divide-y divide-gray-50">
        {BREAKDOWN_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="px-6 py-4 flex items-center gap-4">
              <div className="p-2 bg-gray-50 rounded-xl shrink-0">
                <Icon className="w-4 h-4 text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 font-medium truncate">{item.label}</p>
              </div>
              <span className="text-sm font-semibold text-gray-500 shrink-0 tabular-nums">{item.pts}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
