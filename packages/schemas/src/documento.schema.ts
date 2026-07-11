import { z } from "zod";

/** KYC do cliente e documentos da obra — um único modelo, `tipo` diferencia. */
export const DocumentoStatusEnum = z.enum(["PENDENTE", "APROVADO", "REJEITADO"]);
export type DocumentoStatus = z.infer<typeof DocumentoStatusEnum>;

export const EnviarDocumentoSchema = z.object({
  obraId: z.string().uuid(),
  tipo: z.string().min(2).max(60),
  url: z.string().url(),
});
export type EnviarDocumentoInput = z.infer<typeof EnviarDocumentoSchema>;

export const RevisarDocumentoSchema = z.object({
  status: z.enum(["APROVADO", "REJEITADO"]),
});
export type RevisarDocumentoInput = z.infer<typeof RevisarDocumentoSchema>;
