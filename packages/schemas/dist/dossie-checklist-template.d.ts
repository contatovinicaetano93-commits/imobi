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
export declare function listarEstagiosEntrada(): ChecklistTemplateEstagio[];
export declare function getChecklistItemsForEstagio(estagio: EstagioObraDossie): ChecklistTemplateItem[];
export declare function getEstagioMeta(estagio: EstagioObraDossie): ChecklistTemplateEstagio | undefined;
