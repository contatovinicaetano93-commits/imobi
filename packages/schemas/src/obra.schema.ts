import { z } from "zod";

/** Fonte única do funil — dirige nav, middleware e progresso guiado. */
export const EtapaFunilEnum = z.enum([
  "KYC_PENDENTE",
  "DOSSIE_EM_ANALISE",
  "APROVADO",
  "OBRA_CADASTRADA",
  "HOMOLOGADA",
  "EM_ANDAMENTO",
  "QUITADO",
]);
export type EtapaFunil = z.infer<typeof EtapaFunilEnum>;

export const CriarObraSchema = z.object({
  nome: z.string().min(3).max(120),
  endereco: z.string().min(3).max(200),
  valorCredito: z.number().positive(),
});
export type CriarObraInput = z.infer<typeof CriarObraSchema>;

export const HomologarObraSchema = z.object({
  engenheiroId: z.string().uuid(),
});
export type HomologarObraInput = z.infer<typeof HomologarObraSchema>;
