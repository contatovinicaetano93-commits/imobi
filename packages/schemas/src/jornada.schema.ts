import { z } from "zod";
import { RoleEnum } from "./usuario.schema";
import { EtapaFunilEnum } from "./obra.schema";

/** Passo guiado — 1 fonte de verdade pro que cada papel vê/faz agora. */
export const JornadaResponseSchema = z.object({
  role: RoleEnum,
  etapaAtual: EtapaFunilEnum.optional(),
  titulo: z.string(),
  descricao: z.string(),
  href: z.string(),
  concluido: z.boolean(),
  progressoPct: z.number().min(0).max(100),
  bloqueado: z.string().optional(),
});
export type JornadaResponse = z.infer<typeof JornadaResponseSchema>;
