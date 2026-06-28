import {
  estagioFromTipoCredito,
  getChecklistItemsForTipoCredito,
  getTipoCreditoMeta,
  listarTiposCredito,
} from "@imbobi/schemas";
import type { ChecklistTemplateResponse, TipoCreditoProposta } from "@/lib/api";

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
    tiposDisponiveis: listarTiposCredito().map(({ estagioObra: _estagio, ...t }) => t),
  };
}
