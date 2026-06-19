import { z } from "zod";

export const VotoComiteEnum = z.enum(["APROVADO", "REJEITADO", "ABSTENCAO"]);

export const VotarComiteSchema = z.object({
  voto: VotoComiteEnum,
  justificativa: z.string().max(2000).optional(),
});

export const CriarComiteSchema = z.object({
  creditoId: z.string().uuid(),
  prazoVotacao: z.string().datetime().refine(
    (d) => new Date(d) > new Date(),
    "Prazo de votação deve ser no futuro",
  ),
  descricao: z.string().max(2000).optional(),
});

export type VotoComite = z.infer<typeof VotoComiteEnum>;
export type VotarComiteInput = z.infer<typeof VotarComiteSchema>;
export type CriarComiteInput = z.infer<typeof CriarComiteSchema>;
