"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Send, XCircle } from "lucide-react";
import { DossieSubmitSchema, DOSSIE_WIZARD_TOTAL_ETAPAS } from "@imbobi/schemas";
import type { ZodIssue } from "zod";
import { dossiesApi, type DossieDetalhe } from "@/lib/api";
import {
  EMPRESA_LABELS,
  extrairEmpresa,
  extrairFicha,
  FICHA_LABELS,
  fmtBRL,
  fmtCNPJ,
  fmtNumero,
  fmtPct,
  semNulos,
  STATUS_UNIDADE_LABEL,
  TIPO_DOCUMENTO_LABEL,
  TIPO_EMPREENDIMENTO_LABEL,
  traduzMensagemZod,
  type StepProps,
} from "./dossie-utils";
import { BannerErro, Secao } from "./shared";

const NOME_ETAPA: Record<number, string> = {
  1: "Empreendimento e SPE",
  2: "Unidades",
  3: "Permutas",
  4: "Recebíveis",
  5: "Cronograma físico-financeiro",
  6: "Empresa e grupo",
  7: "Revisão e envio",
};

function montarSubmitInput(d: DossieDetalhe) {
  return {
    ficha: extrairFicha(d),
    empresa: extrairEmpresa(d),
    possuiAcordoNaoConcorrenciaPermuta: d.possuiAcordoNaoConcorrenciaPermuta ?? null,
    unidades: (d.unidades ?? []).map((u) => semNulos(u as Record<string, unknown>)),
    recebiveis: (d.recebiveis ?? []).map((r) => {
      const { dataPagamento, valorRecebido, ...resto } = r;
      return {
        ...semNulos(resto as Record<string, unknown>),
        dataPagamento: dataPagamento ?? null,
        valorRecebido: valorRecebido ?? null,
      };
    }),
    distratos: (d.distratos ?? []).map((x) => semNulos(x as Record<string, unknown>)),
    documentos: (d.documentos ?? []).map((x) => semNulos(x as Record<string, unknown>)),
    etapasConcluidas: d.etapasConcluidas ?? [],
  };
}

/** Converte um issue do DossieSubmitSchema em item amigável do checklist. */
function descreverIssue(issue: ZodIssue): { etapa: number; texto: string } {
  const raiz = String(issue.path[0] ?? "");
  let msg = traduzMensagemZod(issue.message);
  for (const [tipo, label] of Object.entries(TIPO_DOCUMENTO_LABEL)) {
    msg = msg.replace(tipo, label);
  }

  if (raiz === "ficha") {
    const campo = FICHA_LABELS[String(issue.path[1])] ?? String(issue.path[1] ?? "");
    return { etapa: 1, texto: campo ? `${campo}: ${msg}` : msg };
  }
  if (raiz === "unidades") {
    if (issue.path.length > 1 && typeof issue.path[1] === "number") {
      const campo = String(issue.path[2] ?? "");
      return { etapa: 2, texto: `Unidade ${issue.path[1] + 1}${campo ? ` (${campo})` : ""}: ${msg}` };
    }
    return { etapa: 2, texto: msg };
  }
  if (raiz === "possuiAcordoNaoConcorrenciaPermuta") return { etapa: 3, texto: msg };
  if (raiz === "recebiveis") {
    if (issue.path.length > 1 && typeof issue.path[1] === "number") {
      return { etapa: 4, texto: `Recebível ${issue.path[1] + 1}: ${msg}` };
    }
    return { etapa: 4, texto: msg };
  }
  if (raiz === "documentos") {
    if (issue.message.includes("CRONOGRAMA_FISICO_FINANCEIRO")) return { etapa: 5, texto: msg };
    if (issue.message.includes("ACORDO_PERMUTA")) return { etapa: 3, texto: msg };
    return { etapa: 6, texto: msg };
  }
  if (raiz === "empresa") {
    const campo = EMPRESA_LABELS[String(issue.path[1])] ?? String(issue.path[1] ?? "");
    return { etapa: 6, texto: campo ? `${campo}: ${msg}` : msg };
  }
  if (raiz === "distratos") return { etapa: 6, texto: msg };
  return { etapa: 0, texto: msg };
}

function LinhaResumo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex justify-between gap-4 py-1.5">
      <dt className="text-sm text-gray-500">{rotulo}</dt>
      <dd className="text-sm font-semibold text-gray-900 text-right">{valor}</dd>
    </div>
  );
}

export function StepRevisao({ dossie, readOnly, recarregar }: StepProps) {
  const [declaracao, setDeclaracao] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const resultado = useMemo(
    () => DossieSubmitSchema.safeParse(montarSubmitInput(dossie)),
    [dossie]
  );

  const pendenciasPorEtapa = useMemo(() => {
    const map = new Map<number, string[]>();
    if (!resultado.success) {
      for (const issue of resultado.error.issues) {
        const { etapa, texto } = descreverIssue(issue);
        const lista = map.get(etapa) ?? [];
        if (!lista.includes(texto)) lista.push(texto);
        map.set(etapa, lista);
      }
    }
    return map;
  }, [resultado]);

  const unidades = dossie.unidades ?? [];
  const recebiveis = dossie.recebiveis ?? [];
  const documentos = dossie.documentos ?? [];
  const m = dossie.metricas;

  const contagemStatus = unidades.reduce<Record<string, number>>((acc, u) => {
    acc[u.status] = (acc[u.status] ?? 0) + 1;
    return acc;
  }, {});

  async function enviar() {
    setErro(null);
    setEnviando(true);
    try {
      await dossiesApi.submeter(dossie.dossieId);
      await recarregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao submeter o dossiê");
    } finally {
      setEnviando(false);
    }
  }

  const podeEnviar = resultado.success && declaracao && !readOnly;

  return (
    <div className="space-y-8">
      {/* Checklist de completude (derivado do DossieSubmitSchema) */}
      <Secao titulo="Checklist de completude">
        <ul className="space-y-2">
          {Array.from({ length: DOSSIE_WIZARD_TOTAL_ETAPAS }, (_, i) => i + 1).map((etapa) => {
            const pendencias = (pendenciasPorEtapa.get(etapa) ?? []).concat(
              etapa === 7 ? pendenciasPorEtapa.get(0) ?? [] : []
            );
            const concluida = dossie.etapasConcluidas.includes(etapa);
            const ok = pendencias.length === 0 && (etapa === 7 || concluida);
            return (
              <li key={etapa} className="border border-gray-100 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2.5">
                  {ok ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                  )}
                  <p className="text-sm font-semibold text-gray-900">
                    Etapa {etapa} — {NOME_ETAPA[etapa]}
                  </p>
                  {!concluida && etapa !== 7 && (
                    <span className="text-xs text-gray-400 ml-auto">não concluída</span>
                  )}
                </div>
                {pendencias.length > 0 && (
                  <ul className="mt-2 ml-6 space-y-1">
                    {pendencias.map((p) => (
                      <li key={p} className="text-xs text-red-600">
                        {p}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </Secao>

      {/* Resumo por etapa */}
      <Secao titulo="Resumo do dossiê">
        <div className="grid md:grid-cols-2 gap-4">
          <dl className="border border-gray-100 rounded-2xl px-4 py-3 divide-y divide-gray-50">
            <LinhaResumo rotulo="Empreendimento" valor={dossie.nomeEmpreendimento || "—"} />
            <LinhaResumo rotulo="SPE" valor={dossie.speRazaoSocial || "—"} />
            <LinhaResumo rotulo="CNPJ da SPE" valor={fmtCNPJ(dossie.speCnpj)} />
            <LinhaResumo
              rotulo="Tipo"
              valor={TIPO_EMPREENDIMENTO_LABEL[dossie.tipoEmpreendimento ?? ""] ?? "—"}
            />
            <LinhaResumo
              rotulo="Cidade/UF"
              valor={dossie.cidade ? `${dossie.cidade}/${dossie.uf ?? "—"}` : "—"}
            />
            <LinhaResumo rotulo="Orçamento atual" valor={fmtBRL(dossie.orcamentoAtual)} />
            <LinhaResumo
              rotulo="Cronograma físico × financeiro"
              valor={`${fmtPct(dossie.percentualCronogramaFisico)} × ${fmtPct(dossie.percentualCronogramaFinanceiro)}`}
            />
          </dl>

          <dl className="border border-gray-100 rounded-2xl px-4 py-3 divide-y divide-gray-50">
            <LinhaResumo rotulo="Unidades" valor={fmtNumero(unidades.length)} />
            <LinhaResumo
              rotulo="Por status"
              valor={
                Object.entries(contagemStatus)
                  .map(([s, n]) => `${n} ${STATUS_UNIDADE_LABEL[s] ?? s}`)
                  .join(" · ") || "—"
              }
            />
            <LinhaResumo rotulo="VGV (calculado)" valor={fmtBRL(m?.vgv)} />
            <LinhaResumo rotulo="% vendido (calculado)" valor={fmtPct(m?.percentualVendido)} />
            <LinhaResumo rotulo="Parcelas na carteira" valor={fmtNumero(recebiveis.length)} />
            <LinhaResumo rotulo="Recebido / a receber" valor={`${fmtBRL(m?.valorRecebido)} / ${fmtBRL(m?.valorAReceber)}`} />
            <LinhaResumo
              rotulo="Acordo de não concorrência"
              valor={
                dossie.possuiAcordoNaoConcorrenciaPermuta === true
                  ? "Sim"
                  : dossie.possuiAcordoNaoConcorrenciaPermuta === false
                    ? "Não (flag de risco)"
                    : "Não se aplica / não respondido"
              }
            />
          </dl>
        </div>

        <dl className="border border-gray-100 rounded-2xl px-4 py-3 divide-y divide-gray-50">
          <LinhaResumo rotulo="Empresa controladora" valor={dossie.empresaNome || "—"} />
          <LinhaResumo rotulo="CNPJ" valor={fmtCNPJ(dossie.empresaCnpj)} />
          <LinhaResumo
            rotulo="Ano de fundação"
            valor={dossie.empresaAnoFundacao != null ? String(dossie.empresaAnoFundacao) : "—"}
          />
          <LinhaResumo rotulo="Distratos registrados" valor={fmtNumero((dossie.distratos ?? []).length)} />
          <LinhaResumo
            rotulo="Documentos anexados"
            valor={
              documentos.length === 0
                ? "—"
                : Object.entries(
                    documentos.reduce<Record<string, number>>((acc, d) => {
                      acc[d.tipo] = (acc[d.tipo] ?? 0) + 1;
                      return acc;
                    }, {})
                  )
                    .map(([t, n]) => `${n}× ${TIPO_DOCUMENTO_LABEL[t] ?? t}`)
                    .join(" · ")
            }
          />
        </dl>
      </Secao>

      {!readOnly && (
        <>
          <label className="flex items-start gap-3 bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 cursor-pointer">
            <input
              type="checkbox"
              checked={declaracao}
              onChange={(e) => setDeclaracao(e.target.checked)}
              disabled={enviando}
              className="w-4 h-4 mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              <strong>Declaração de veracidade.</strong> Declaro, sob as penas da lei, que as
              informações e os documentos apresentados neste dossiê são verdadeiros, completos
              e refletem fielmente a situação do empreendimento e da empresa na data do envio.
            </span>
          </label>

          {erro && <BannerErro>{erro}</BannerErro>}

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
            {!resultado.success && (
              <p className="text-xs text-red-500 mr-auto">
                Resolva as pendências do checklist para habilitar o envio.
              </p>
            )}
            <button
              type="button"
              onClick={() => void enviar()}
              disabled={!podeEnviar || enviando}
              className="inline-flex items-center gap-2 text-white font-semibold px-6 py-3 rounded-xl disabled:opacity-50 transition-colors text-sm hover:opacity-90"
              style={{ background: "#16a34a" }}
            >
              <Send className="w-4 h-4" />
              {enviando ? "Enviando..." : "Enviar para análise"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
