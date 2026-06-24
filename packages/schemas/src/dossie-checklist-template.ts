import checklistData from "./data/checklist-por-estagio.json";
import type { EstagioObraDossie } from "./dossie-viabilidade.schema";

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

export function listarEstagiosEntrada(): ChecklistTemplateEstagio[] {
  return checklistData.estagiosEntrada as ChecklistTemplateEstagio[];
}

export function getChecklistItemsForEstagio(estagio: EstagioObraDossie): ChecklistTemplateItem[] {
  const items: ChecklistTemplateItem[] = [];

  for (const bloco of checklistData.blocos) {
    if ("somenteEstagio" in bloco && bloco.somenteEstagio && bloco.somenteEstagio !== estagio) {
      continue;
    }

    for (const item of bloco.itens) {
      if (!item.estagios.includes(estagio)) continue;

      items.push({
        itemId: item.id,
        titulo: item.titulo,
        obrigatorio: item.obrigatorio,
        blocoId: bloco.id,
        blocoTitulo: bloco.titulo,
        blocoOrdem: bloco.ordem,
      });
    }
  }

  return items.sort((a, b) => a.blocoOrdem - b.blocoOrdem || a.itemId.localeCompare(b.itemId));
}

export function getEstagioMeta(estagio: EstagioObraDossie): ChecklistTemplateEstagio | undefined {
  return listarEstagiosEntrada().find((e) => e.id === estagio);
}
