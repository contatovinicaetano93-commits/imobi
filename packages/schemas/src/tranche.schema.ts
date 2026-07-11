import { z } from "zod";

/** Gate sequencial: Engenheiro valida a fase → Admin libera o valor. */
export const TrancheStatusEnum = z.enum([
  "PENDENTE",
  "VALIDADA_ENGENHEIRO",
  "LIBERADA_ADMIN",
  "REJEITADA",
]);
export type TrancheStatus = z.infer<typeof TrancheStatusEnum>;

export const CriarTrancheSchema = z.object({
  obraId: z.string().uuid(),
  numero: z.number().int().positive(),
  valor: z.number().positive(),
});
export type CriarTrancheInput = z.infer<typeof CriarTrancheSchema>;

export const AnexarEvidenciaSchema = z.object({
  url: z.string().url(),
  descricao: z.string().max(500).optional(),
});
export type AnexarEvidenciaInput = z.infer<typeof AnexarEvidenciaSchema>;

/** Engenheiro valida a fase da obra (não libera dinheiro). */
export const ValidarTrancheSchema = z.object({
  aprovado: z.boolean(),
  observacao: z.string().max(1000).optional(),
});
export type ValidarTrancheInput = z.infer<typeof ValidarTrancheSchema>;

/** Admin libera o valor após validação do engenheiro. */
export const LiberarTrancheSchema = z.object({
  confirmacao: z.literal(true),
});
export type LiberarTrancheInput = z.infer<typeof LiberarTrancheSchema>;
