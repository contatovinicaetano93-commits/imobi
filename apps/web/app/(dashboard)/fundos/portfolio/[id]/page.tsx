import type { Metadata } from "next";
import { mockPortfolioWorks } from "@/lib/fundos-mock-data";
import { formatarBRL } from "@imbobi/core";
import { RiskIndicator } from "@/components/fundos/RiskIndicator";

interface WorkDetailPageProps {
  params: {
    id: string;
  };
}

export const metadata: Metadata = {
  title: "Detalhe da Obra — Dashboard de Fundos — imbobi",
};

export default function WorkDetailPage({ params }: WorkDetailPageProps) {
  const obra = mockPortfolioWorks.find((w) => w.id === params.id);

  if (!obra) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-gray-200 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Obra não encontrada</h2>
        <p className="text-gray-600">A obra {params.id} não existe no portfolio.</p>
        <a href="/fundos/portfolio" className="inline-block mt-4 text-brand-600 font-semibold">
          Voltar para Portfolio →
        </a>
      </div>
    );
  }

  const statusMap = {
    EM_EXECUCAO: { label: "Em execução", color: "bg-blue-100 text-blue-800" },
    CONCLUIDA: { label: "Concluída", color: "bg-green-100 text-green-800" },
    ATRASADA: { label: "Atrasada", color: "bg-red-100 text-red-800" },
  };

  const status = statusMap[obra.status];

  // Calcular juros mensais
  const jurosDeCorridoMensal = obra.amount * obra.monthlyRate;
  const diasDecorridos = 30; // aproximado
  const jurosDecorridos = jurosDeCorridoMensal * (diasDecorridos / 30);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{obra.id}</h1>
          <p className="text-gray-600 mt-1">{obra.constructor}</p>
        </div>
        <a href="/fundos/portfolio" className="text-brand-600 font-semibold">
          ← Voltar para Portfolio
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Informações Básicas</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">ID</p>
              <p className="text-lg font-semibold text-gray-900">{obra.id}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Construtor</p>
              <p className="text-lg font-semibold text-gray-900">{obra.constructor}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Localização</p>
              <p className="text-lg font-semibold text-gray-900">{obra.location}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${status.color} mt-1`}>
                {status.label}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Financeiro</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Valor da Obra</p>
              <p className="text-lg font-semibold text-gray-900">{formatarBRL(obra.amount)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Taxa Mensal</p>
              <p className="text-lg font-semibold text-gray-900">{(obra.monthlyRate * 100).toFixed(2)}% a.m.</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Juros Mensais (estimado)</p>
              <p className="text-lg font-semibold text-green-600">{formatarBRL(jurosDeCorridoMensal)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Juros Decorridos (período)</p>
              <p className="text-lg font-semibold text-gray-900">{formatarBRL(jurosDecorridos)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Progresso</h2>
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Andamento Geral</p>
              <p className="text-sm font-bold text-gray-900">{obra.progress}%</p>
            </div>
            <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-500"
                style={{ width: `${obra.progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Cronograma</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Data de Início</p>
              <p className="text-lg font-semibold text-gray-900">{obra.startDate}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Previsão de Conclusão</p>
              <p className="text-lg font-semibold text-gray-900">{obra.expectedEnd}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Avaliação de Risco</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">Score de Risco</p>
              <RiskIndicator score={obra.riskScore} />
            </div>
            <div className="text-sm text-gray-600 mt-4">
              <p>A obra está sendo acompanhada por engenheiros presenciais conforme protocolo de validação tripla.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
