import {
  estagioFromTipoCredito,
  getChecklistItemsForTipoCredito,
  getTipoCreditoMeta,
  listarTiposCredito,
} from "@imbobi/schemas";
import type { ChecklistTemplateResponse, TipoCreditoProposta } from "@/lib/api";

export type TipoCreditoOpcao = {
  id: TipoCreditoProposta;
  label: string;
  descricao: string;
  checklistPdf: string;
};

/** Tipos de operação — embutidos para SSR/hidratação sem depender da API ou do bundle JSON. */
export const TIPOS_CREDITO_OPCOES: TipoCreditoOpcao[] = [
  {
    id: "OBRA_NOVA",
    label: "Empreendimento novo (pré-obra / lançamento)",
    descricao:
      "Obra ainda não iniciada ou em fase inicial. Exige DRE 3 anos e organograma do incorporador.",
    checklistPdf: "Empreendimento - Novo.pdf",
  },
  {
    id: "OBRA_EM_ANDAMENTO",
    label: "Obra em andamento",
    descricao: "Obra iniciada com medição, custos incorridos e cronograma realizado.",
    checklistPdf: "Empreendimento - Em Andamento.pdf",
  },
  {
    id: "CREDITO_PONTE",
    label: "Crédito ponte",
    descricao:
      "Obra em andamento com pacote reforçado de legalidade e garantias (incorporação, patrimônio de afetação, alienação/cessão fiduciária, aval dos sócios).",
    checklistPdf: "Empreendimento - CREDITO PONTE.pdf",
  },
];

function resolveTiposDisponiveis(): TipoCreditoOpcao[] {
  try {
    const fromSchema = listarTiposCredito().map(({ estagioObra: _estagio, ...t }) => t);
    return fromSchema.length > 0 ? fromSchema : TIPOS_CREDITO_OPCOES;
  } catch {
    return TIPOS_CREDITO_OPCOES;
  }
}

/** Checklist público — fonte local (@imbobi/schemas), sem depender da API acordar. */
export function getPropostaChecklistTemplate(tipo: TipoCreditoProposta): ChecklistTemplateResponse {
  const meta = getTipoCreditoMeta(tipo);

  return {
    tipoCredito: tipo,
    estagio: estagioFromTipoCredito(tipo),
    meta: meta
      ? {
          id: meta.id,
          label: meta.label,
          descricao: meta.descricao,
          checklistPdf: meta.checklistPdf,
          estagioObra: meta.estagioObra,
        }
      : undefined,
    itens: getChecklistItemsForTipoCredito(tipo).map(({ blocoOrdem: _ordem, ...item }) => item),
    tiposDisponiveis: resolveTiposDisponiveis(),
  };
}
