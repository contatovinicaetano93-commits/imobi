import { z } from "zod";
import { TipoCreditoPropostaEnum } from "@imbobi/schemas";

export const PipelineEtapaEnum = z.enum([
  "prospeccao",
  "analise",
  "estruturacao",
  "aprovado",
  "standby",
]);

export const AtualizarPipelineEtapaSchema = z.object({
  etapa: PipelineEtapaEnum,
});

export const CriarPipelineLeadSchema = z.object({
  nomeEmpreendimento: z.string().min(3).max(255),
  nomeContato: z.string().min(2).max(120),
  email: z.string().email(),
  telefone: z.string().min(10).max(20).optional(),
  tipoCredito: TipoCreditoPropostaEnum.default("CREDITO_PONTE"),
  local: z.string().max(255).optional(),
  valorEstimado: z.number().positive().optional(),
  notas: z.string().max(5000).optional(),
  contato: z.string().max(120).optional(),
  etapa: PipelineEtapaEnum.default("prospeccao"),
});

export type PipelineEtapa = z.infer<typeof PipelineEtapaEnum>;
export type AtualizarPipelineEtapaDto = z.infer<typeof AtualizarPipelineEtapaSchema>;
export type CriarPipelineLeadDto = z.infer<typeof CriarPipelineLeadSchema>;
