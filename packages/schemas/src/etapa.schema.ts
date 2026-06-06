import { z } from "zod";

export const AprovarEtapaSchema = z.object({
  observacao: z.string().max(1000).optional(),
});

export const RejeitarEtapaSchema = z.object({
  motivo: z
    .string()
    .min(10, "Descreva o motivo com ao menos 10 caracteres")
    .max(1000),
});

export const AtualizarStatusEtapaSchema = z.object({
  status: z.enum([
    "PLANEJADA",
    "EM_EXECUCAO",
    "AGUARDANDO_VISTORIA",
    "REPROVADA",
    "CONCLUIDA",
  ]),
});

export const FiltroEtapaSchema = z.object({
  obraId: z.string().uuid().optional(),
  status: z
    .enum([
      "PLANEJADA",
      "EM_EXECUCAO",
      "AGUARDANDO_VISTORIA",
      "REPROVADA",
      "CONCLUIDA",
    ])
    .optional(),
});

export type AprovarEtapaInput = z.infer<typeof AprovarEtapaSchema>;
export type RejeitarEtapaInput = z.infer<typeof RejeitarEtapaSchema>;
export type AtualizarStatusEtapaInput = z.infer<typeof AtualizarStatusEtapaSchema>;
export type FiltroEtapaInput = z.infer<typeof FiltroEtapaSchema>;
