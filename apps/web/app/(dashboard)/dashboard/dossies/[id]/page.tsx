"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Check, Lock } from "lucide-react";
import { dossiesApi, type DossieDetalhe } from "@/lib/api";
import { DossieStatusBadge, BannerAviso, BannerErro } from "@/components/dossie/shared";
import { StepFicha } from "@/components/dossie/StepFicha";
import { StepUnidades } from "@/components/dossie/StepUnidades";
import { StepPermutas } from "@/components/dossie/StepPermutas";
import { StepRecebiveis } from "@/components/dossie/StepRecebiveis";
import { StepCronograma } from "@/components/dossie/StepCronograma";
import { StepEmpresa } from "@/components/dossie/StepEmpresa";
import { StepRevisao } from "@/components/dossie/StepRevisao";

const ETAPAS = [
  { numero: 1, titulo: "Empreendimento e SPE" },
  { numero: 2, titulo: "Unidades" },
  { numero: 3, titulo: "Permutas" },
  { numero: 4, titulo: "Recebíveis" },
  { numero: 5, titulo: "Cronograma" },
  { numero: 6, titulo: "Empresa e grupo" },
  { numero: 7, titulo: "Revisão e envio" },
] as const;

export default function DossieWizardPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [dossie, setDossie] = useState<DossieDetalhe | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [etapaAtiva, setEtapaAtiva] = useState(1);

  const recarregar = useCallback(async () => {
    try {
      setDossie(await dossiesApi.buscar(id));
      setErro(null);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao carregar o dossiê");
    }
  }, [id]);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  const concluirEtapa = useCallback(
    async (numero: number) => {
      await dossiesApi.concluirEtapa(id, numero);
      await recarregar();
    },
    [id, recarregar]
  );

  const readOnly = useMemo(
    () => dossie != null && dossie.status !== "RASCUNHO" && dossie.status !== "PENDENCIA",
    [dossie]
  );

  if (erro && !dossie) {
    return (
      <div className="max-w-3xl">
        <BannerErro>{erro}</BannerErro>
      </div>
    );
  }

  if (!dossie) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center text-sm text-gray-400 max-w-5xl">
        Carregando dossiê...
      </div>
    );
  }

  const concluidas = new Set(dossie.etapasConcluidas ?? []);
  const stepProps = { dossie, readOnly, recarregar, concluirEtapa };

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => router.push("/dashboard/dossies")}
          className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
          aria-label="Voltar para a lista de dossiês"
        >
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight truncate">
            {dossie.nomeEmpreendimento}
          </h1>
          <p className="text-sm text-gray-500">
            Dossiê de Crédito · {concluidas.size} de {ETAPAS.length} etapas concluídas
          </p>
        </div>
        <DossieStatusBadge status={dossie.status} />
      </div>

      {readOnly && (
        <BannerAviso>
          <span className="inline-flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" />
            Dossiê em {dossie.status === "EM_ANALISE" ? "análise" : "estado final"} — a edição
            está bloqueada. Alterações só são possíveis se o analista devolver com pendência.
          </span>
        </BannerAviso>
      )}
      {dossie.status === "PENDENCIA" && (
        <BannerAviso>
          O analista devolveu este dossiê com pendências. Corrija os itens indicados e reenvie
          na etapa de Revisão.
        </BannerAviso>
      )}
      {erro && <BannerErro>{erro}</BannerErro>}

      <nav className="bg-white rounded-2xl border border-gray-100 shadow-sm px-3 py-2 overflow-x-auto">
        <ol className="flex items-center gap-1 min-w-max">
          {ETAPAS.map((etapa, i) => {
            const ativa = etapaAtiva === etapa.numero;
            const feita = concluidas.has(etapa.numero);
            return (
              <li key={etapa.numero} className="flex items-center">
                {i > 0 && <span className="w-4 h-px bg-gray-200 mx-1" />}
                <button
                  type="button"
                  onClick={() => setEtapaAtiva(etapa.numero)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    ativa ? "text-white" : feita ? "text-green-700 hover:bg-green-50" : "text-gray-500 hover:bg-gray-50"
                  }`}
                  style={ativa ? { background: "#1B4FD8" } : undefined}
                >
                  <span
                    className={`w-5 h-5 rounded-full grid place-items-center text-[0.65rem] shrink-0 ${
                      ativa
                        ? "bg-white/20 text-white"
                        : feita
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {feita && !ativa ? <Check className="w-3 h-3" /> : etapa.numero}
                  </span>
                  {etapa.titulo}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        {etapaAtiva === 1 && <StepFicha {...stepProps} />}
        {etapaAtiva === 2 && <StepUnidades {...stepProps} />}
        {etapaAtiva === 3 && <StepPermutas {...stepProps} />}
        {etapaAtiva === 4 && <StepRecebiveis {...stepProps} />}
        {etapaAtiva === 5 && <StepCronograma {...stepProps} />}
        {etapaAtiva === 6 && <StepEmpresa {...stepProps} />}
        {etapaAtiva === 7 && <StepRevisao {...stepProps} />}
      </div>
    </div>
  );
}
