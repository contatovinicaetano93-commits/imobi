"use client";

import { useState } from "react";
import { z } from "zod";
import { AtualizarFichaEmpreendimentoSchema } from "@imbobi/schemas";
import { dossiesApi } from "@/lib/api";
import {
  errosPorCampo,
  numeroParaInput,
  parseNumeroBR,
  type StepProps,
} from "./dossie-utils";
import { AcoesEtapa, BannerErro, BannerOk, Campo, inputCls } from "./shared";
import { DocumentoUploadSlot } from "./DocumentoUploadSlot";

const PercentuaisObrigatoriosSchema = AtualizarFichaEmpreendimentoSchema.required({
  percentualCronogramaFisico: true,
  percentualCronogramaFinanceiro: true,
});

export function StepCronograma({ dossie, readOnly, recarregar, concluirEtapa }: StepProps) {
  const [fisico, setFisico] = useState(numeroParaInput(dossie.percentualCronogramaFisico));
  const [financeiro, setFinanceiro] = useState(
    numeroParaInput(dossie.percentualCronogramaFinanceiro)
  );
  const [erros, setErros] = useState<Record<string, string>>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const docsCronograma = (dossie.documentos ?? []).filter(
    (d) => d.tipo === "CRONOGRAMA_FISICO_FINANCEIRO"
  );

  async function salvar(concluir: boolean) {
    setErroGeral(null);
    setSucesso(null);
    setErros({});

    const payload: Record<string, unknown> = {};
    const vFisico = parseNumeroBR(fisico);
    const vFinanceiro = parseNumeroBR(financeiro);
    if (vFisico !== undefined) payload["percentualCronogramaFisico"] = vFisico;
    if (vFinanceiro !== undefined) payload["percentualCronogramaFinanceiro"] = vFinanceiro;

    const schema: z.ZodTypeAny = concluir
      ? PercentuaisObrigatoriosSchema
      : AtualizarFichaEmpreendimentoSchema;
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      setErros(errosPorCampo(parsed.error));
      setErroGeral("Corrija os campos destacados antes de continuar.");
      return;
    }

    if (concluir && docsCronograma.length === 0) {
      setErroGeral(
        "Anexe o documento do cronograma físico-financeiro antes de concluir a etapa."
      );
      return;
    }

    setSalvando(true);
    try {
      await dossiesApi.atualizarFicha(dossie.dossieId, parsed.data);
      if (concluir) {
        await concluirEtapa(5);
      } else {
        await recarregar();
        setSucesso("Percentuais salvos.");
      }
    } catch (err) {
      setErroGeral(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">
        Anexe o cronograma físico-financeiro declarado (baseline) e informe os percentuais
        realizados até hoje. O baseline será conciliado posteriormente com o avanço real
        medido nas etapas de obra (evidências validadas por GPS).
      </p>

      <DocumentoUploadSlot
        dossieId={dossie.dossieId}
        tipo="CRONOGRAMA_FISICO_FINANCEIRO"
        titulo="Cronograma físico-financeiro (baseline)"
        descricaoSlot="Planilha ou PDF com o cronograma declarado do empreendimento."
        documentos={docsCronograma}
        readOnly={readOnly}
        aoAlterar={recarregar}
      />

      <div className="grid grid-cols-2 gap-4">
        <Campo
          label="% Cronograma físico realizado"
          erro={erros["percentualCronogramaFisico"]}
        >
          <input
            type="text"
            inputMode="decimal"
            value={fisico}
            onChange={(e) => setFisico(e.target.value)}
            disabled={readOnly || salvando}
            placeholder="40"
            className={inputCls}
          />
        </Campo>
        <Campo
          label="% Cronograma financeiro realizado"
          erro={erros["percentualCronogramaFinanceiro"]}
        >
          <input
            type="text"
            inputMode="decimal"
            value={financeiro}
            onChange={(e) => setFinanceiro(e.target.value)}
            disabled={readOnly || salvando}
            placeholder="38"
            className={inputCls}
          />
        </Campo>
      </div>
      <p className="text-xs text-gray-400 -mt-2">
        Estes percentuais também aparecem na seção &quot;Obras — orçamento&quot; da etapa 1
        (são os mesmos campos da ficha).
      </p>

      {erroGeral && <BannerErro>{erroGeral}</BannerErro>}
      {sucesso && <BannerOk>{sucesso}</BannerOk>}

      <AcoesEtapa
        readOnly={readOnly}
        salvando={salvando}
        concluida={dossie.etapasConcluidas.includes(5)}
        onSalvar={() => void salvar(false)}
        onConcluir={() => void salvar(true)}
      />
    </div>
  );
}
