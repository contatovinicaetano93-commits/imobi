import type { ChecklistTemplateResponse, TipoCreditoProposta } from "@/lib/api";

export type TipoCreditoOpcao = {
  id: TipoCreditoProposta;
  label: string;
  descricao: string;
  checklistPdf: string;
};

export const TIPOS_CREDITO_OPCOES: TipoCreditoOpcao[] = [
  {
    id: "OBRA_NOVA",
    label: "Empreendimento novo (pré-obra / lançamento)",
    descricao: "Obra ainda não iniciada ou em fase inicial.",
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
    descricao: "Obra em andamento com pacote reforçado de legalidade e garantias.",
    checklistPdf: "Empreendimento - CREDITO PONTE.pdf",
  },
];

const CHECKLIST_ITENS: Record<TipoCreditoProposta, ChecklistTemplateResponse["itens"]> = {
  OBRA_NOVA: [
    { itemId: "rg", titulo: "RG/CNH", obrigatorio: true, blocoId: "docs", blocoTitulo: "Documentos" },
    { itemId: "dre", titulo: "DRE 3 anos", obrigatorio: true, blocoId: "financeiro", blocoTitulo: "Financeiro" },
  ],
  OBRA_EM_ANDAMENTO: [
    { itemId: "rg", titulo: "RG/CNH", obrigatorio: true, blocoId: "docs", blocoTitulo: "Documentos" },
    { itemId: "cronograma", titulo: "Cronograma físico-financeiro", obrigatorio: true, blocoId: "obra", blocoTitulo: "Obra" },
  ],
  CREDITO_PONTE: [
    { itemId: "rg", titulo: "RG/CNH", obrigatorio: true, blocoId: "docs", blocoTitulo: "Documentos" },
    { itemId: "garantias", titulo: "Documentação de garantias", obrigatorio: true, blocoId: "garantias", blocoTitulo: "Garantias" },
  ],
};

export function getPropostaChecklistTemplate(tipo: TipoCreditoProposta): ChecklistTemplateResponse {
  const meta = TIPOS_CREDITO_OPCOES.find((t) => t.id === tipo);
  const estagio = tipo === "OBRA_NOVA" ? "NOVO" : "EM_ANDAMENTO";
  return {
    tipoCredito: tipo,
    estagio,
    meta: meta
      ? {
          id: meta.id,
          label: meta.label,
          descricao: meta.descricao,
          checklistPdf: meta.checklistPdf,
          estagioObra: estagio,
        }
      : undefined,
    itens: CHECKLIST_ITENS[tipo] ?? [],
    tiposDisponiveis: TIPOS_CREDITO_OPCOES,
  };
}
