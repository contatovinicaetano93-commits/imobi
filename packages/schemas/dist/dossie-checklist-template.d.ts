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
export declare function listarEstagiosEntrada(): ChecklistTemplateEstagio[];
export declare function listarTiposCredito(): ChecklistTemplateTipoCredito[];
export declare function estagioFromTipoCredito(tipo: TipoCreditoProposta): EstagioObraDossie;
export declare function getTipoCreditoMeta(tipo: TipoCreditoProposta): ChecklistTemplateTipoCredito | undefined;
export declare function getChecklistItemsForTipoCredito(tipo: TipoCreditoProposta): ChecklistTemplateItem[];
export declare function getChecklistItemsForEstagio(estagio: EstagioObraDossie): ChecklistTemplateItem[];
export declare function getEstagioMeta(estagio: EstagioObraDossie): ChecklistTemplateEstagio | undefined;
export declare function resolveTipoCredito(input: {
    tipoCredito?: TipoCreditoProposta;
    estagioObra?: EstagioObraDossie;
}): TipoCreditoProposta;
