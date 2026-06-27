import checklistData from "./data/checklist-por-estagio.json";
import type { EstagioObraDossie } from "./dossie-viabilidade.schema";
import type { TipoCreditoProposta } from "./proposta-credito.schema";

export interface ChecklistTemplateItem {
  itemId: string;
  titulo: string;
  obrigatorio: boolean;
  blocoId: string;
  blocoTitulo: string;
  blocoOrdem: number;
}

export interface ChecklistTemplateEstagio {
  id: EstagioObraDossie;
  label: string;
  descricao: string;
  checklistPdf: string;
  percentualObraMin: number;
  percentualObraMax: number;
  itensReforcados?: string[];
}

export interface ChecklistTemplateTipoCredito {
  id: TipoCreditoProposta;
  label: string;
  descricao: string;
  checklistPdf: string;
  estagioObra: EstagioObraDossie;
}

type ChecklistBloco = (typeof checklistData.blocos)[number];
type ChecklistItem = ChecklistBloco["itens"][number];

export function listarEstagiosEntrada(): ChecklistTemplateEstagio[] {
  return checklistData.estagiosEntrada as ChecklistTemplateEstagio[];
}

export function listarTiposCredito(): ChecklistTemplateTipoCredito[] {
  return checklistData.tiposCredito as ChecklistTemplateTipoCredito[];
}

export function estagioFromTipoCredito(tipo: TipoCreditoProposta): EstagioObraDossie {
  const meta = listarTiposCredito().find((t) => t.id === tipo);
  return meta?.estagioObra ?? (tipo === "OBRA_NOVA" ? "NOVO" : "EM_ANDAMENTO");
}

export function getTipoCreditoMeta(tipo: TipoCreditoProposta): ChecklistTemplateTipoCredito | undefined {
  return listarTiposCredito().find((t) => t.id === tipo);
}

function pushItem(
  items: ChecklistTemplateItem[],
  bloco: ChecklistBloco,
  item: ChecklistItem,
) {
  items.push({
    itemId: item.id,
    titulo: item.titulo,
    obrigatorio: item.obrigatorio,
    blocoId: bloco.id,
    blocoTitulo: bloco.titulo,
    blocoOrdem: bloco.ordem,
  });
}

export function getChecklistItemsForTipoCredito(tipo: TipoCreditoProposta): ChecklistTemplateItem[] {
  const estagio = estagioFromTipoCredito(tipo);
  const items: ChecklistTemplateItem[] = [];

  for (const bloco of checklistData.blocos) {
    if ("somenteEstagio" in bloco && bloco.somenteEstagio && bloco.somenteEstagio !== estagio) {
      continue;
    }
    if (
      "somenteTipoCredito" in bloco &&
      bloco.somenteTipoCredito &&
      bloco.somenteTipoCredito !== tipo
    ) {
      continue;
    }

    for (const item of bloco.itens) {
      if (!item.estagios.includes(estagio)) continue;
      if (
        "tiposCredito" in item &&
        Array.isArray(item.tiposCredito) &&
        item.tiposCredito.length > 0 &&
        !item.tiposCredito.includes(tipo)
      ) {
        continue;
      }
      pushItem(items, bloco, item);
    }
  }

  return items.sort((a, b) => a.blocoOrdem - b.blocoOrdem || a.itemId.localeCompare(b.itemId));
}

export function getChecklistItemsForEstagio(estagio: EstagioObraDossie): ChecklistTemplateItem[] {
  const tipoMap: Record<EstagioObraDossie, TipoCreditoProposta> = {
    NOVO: "OBRA_NOVA",
    EM_ANDAMENTO: "OBRA_EM_ANDAMENTO",
    ENTRADA_TARDIA: "OBRA_EM_ANDAMENTO",
  };
  return getChecklistItemsForTipoCredito(tipoMap[estagio]);
}

export function getEstagioMeta(estagio: EstagioObraDossie): ChecklistTemplateEstagio | undefined {
  return listarEstagiosEntrada().find((e) => e.id === estagio);
}

export function resolveTipoCredito(input: {
  tipoCredito?: TipoCreditoProposta;
  estagioObra?: EstagioObraDossie;
}): TipoCreditoProposta {
  if (input.tipoCredito) return input.tipoCredito;
  if (input.estagioObra === "NOVO") return "OBRA_NOVA";
  return "OBRA_EM_ANDAMENTO";
}
