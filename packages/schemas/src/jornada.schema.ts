import { z } from "zod";

export const JornadaPassoIdEnum = z.enum([
  "kyc",
  "viabilidade",
  "obra",
  "credito",
  "aguardando",
  "acompanhar",
  "concluido",
  "gestor_kyc",
  "gestor_etapas",
  "gestor_ok",
]);

export const JornadaPerfilEnum = z.enum(["tomador", "gestor", "outro"]);

export const JornadaResponseSchema = z.object({
  perfil: JornadaPerfilEnum,
  passoAtual: JornadaPassoIdEnum,
  titulo: z.string(),
  descricao: z.string(),
  href: z.string(),
  concluido: z.boolean(),
  passosConcluidos: z.number().int().min(0),
  totalPassos: z.number().int().min(0),
  progressoPct: z.number().min(0).max(100),
  bloqueado: z.string().optional(),
  fila: z
    .object({
      kyc: z.number().int().min(0),
      etapas: z.number().int().min(0),
    })
    .optional(),
});

export type JornadaPassoId = z.infer<typeof JornadaPassoIdEnum>;
export type JornadaPerfil = z.infer<typeof JornadaPerfilEnum>;
export type JornadaResponse = z.infer<typeof JornadaResponseSchema>;
