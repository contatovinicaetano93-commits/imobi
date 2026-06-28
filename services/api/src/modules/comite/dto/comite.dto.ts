import { z } from "zod";

export const SolicitarComiteSchema = z.object({
  valorSolicitado: z.number().positive("Valor deve ser positivo"),
  prazoMeses: z.number().int().min(1).max(360),
  taxaMensal: z.number().min(0).max(1),
  finalidade: z.string().min(1).max(500),
  garantias: z.string().max(1000).optional(),
  observacoes: z.string().max(2000).optional(),
  obraId: z.string().uuid().optional(),
  vgv: z.number().positive().optional(),
  custoObra: z.number().positive().optional(),
  ltv: z.number().min(0).max(1).optional(),
});

export const ParecerComiteSchema = z.object({
  parecerTecnico: z.string().min(10, "Parecer deve ter ao menos 10 caracteres").max(5000),
});

export const VotarComiteSchema = z.object({
  voto: z.enum(["APROVAR", "AJUSTAR", "REPROVAR"]),
  justificativa: z.string().max(2000).optional(),
  condicoes: z.string().max(2000).optional(),
});

export const IniciarComiteSchema = z.object({
  solicitacaoId: z.string().uuid("ID da solicitação inválido"),
});

export type SolicitarComiteDto = z.infer<typeof SolicitarComiteSchema>;
export type ParecerComiteDto = z.infer<typeof ParecerComiteSchema>;
export type VotarComiteDto = z.infer<typeof VotarComiteSchema>;
export type IniciarComiteDto = z.infer<typeof IniciarComiteSchema>;
