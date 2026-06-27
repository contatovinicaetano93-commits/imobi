import { z } from "zod";
import { TipoCreditoPropostaEnum } from "./proposta-credito.schema";

export const EstagioObraDossieEnum = z.enum(["NOVO", "EM_ANDAMENTO", "ENTRADA_TARDIA"]);
export const DossieStatusEnum = z.enum([
  "RASCUNHO",
  "ENVIADO",
  "EM_ANALISE",
  "APROVADO",
  "REPROVADO",
]);
export const DossieChecklistItemStatusEnum = z.enum([
  "PENDENTE",
  "ENVIADO",
  "APROVADO",
  "REPROVADO",
  "NA",
]);

export const CriarDossieSchema = z.object({
  tipoCredito: TipoCreditoPropostaEnum.optional(),
  estagioObra: EstagioObraDossieEnum.optional(),
  nomeEmpreendimento: z.string().min(3, "Nome mínimo 3 caracteres").max(255),
  percentualFisico: z.number().min(0).max(100).optional(),
  dataBase: z.coerce.date().optional(),
  obraId: z.string().uuid().optional(),
  narrativa: z.string().max(5000).optional(),
}).refine(
  (data) => data.tipoCredito != null || data.estagioObra != null,
  { message: "Informe tipoCredito ou estagioObra" },
);

export const AtualizarDossieChecklistItemSchema = z.object({
  itemId: z.string().min(1).max(64),
  status: DossieChecklistItemStatusEnum.optional(),
  documentoId: z.string().uuid().nullable().optional(),
  observacao: z.string().max(2000).nullable().optional(),
});

export const AtualizarDossieSchema = z
  .object({
    nomeEmpreendimento: z.string().min(3).max(255).optional(),
    tipologia: z.string().max(100).nullable().optional(),
    endereco: z.string().max(500).nullable().optional(),
    cidade: z.string().max(120).nullable().optional(),
    uf: z.string().length(2).nullable().optional(),
    totalUnidades: z.number().int().min(0).nullable().optional(),
    areaTotal: z.number().positive().nullable().optional(),
    dataEntregaPrevista: z.coerce.date().nullable().optional(),
    nomeIncorporadora: z.string().max(255).nullable().optional(),
    cnpjIncorporadora: z.string().max(18).nullable().optional(),
    modeloAmortizacao: z.string().max(120).nullable().optional(),
    totalCarteira: z.number().nullable().optional(),
    totalAReceber: z.number().nullable().optional(),
    estruturaSocietaria: z.string().max(2000).nullable().optional(),
    percentualFisico: z.number().min(0).max(100).nullable().optional(),
    dataBase: z.coerce.date().nullable().optional(),
    obraId: z.string().uuid().nullable().optional(),
    ficha: z.record(z.unknown()).optional(),
    checklistItens: z.array(AtualizarDossieChecklistItemSchema).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Informe ao menos um campo para atualizar",
  });

export const AtualizarDossieStatusSchema = z.object({
  status: DossieStatusEnum,
  observacaoAdmin: z.string().max(2000).optional(),
});

export const ChecklistTemplateQuerySchema = z.object({
  estagio: EstagioObraDossieEnum.optional(),
  tipo: TipoCreditoPropostaEnum.optional(),
}).refine(
  (data) => data.estagio != null || data.tipo != null,
  { message: "Informe estagio ou tipo" },
);

export type EstagioObraDossie = z.infer<typeof EstagioObraDossieEnum>;
export type DossieStatus = z.infer<typeof DossieStatusEnum>;
export type DossieChecklistItemStatus = z.infer<typeof DossieChecklistItemStatusEnum>;
export type CriarDossieInput = z.infer<typeof CriarDossieSchema>;
export type AtualizarDossieInput = z.infer<typeof AtualizarDossieSchema>;
export type AtualizarDossieStatusInput = z.infer<typeof AtualizarDossieStatusSchema>;
export type ChecklistTemplateQuery = z.infer<typeof ChecklistTemplateQuerySchema>;
