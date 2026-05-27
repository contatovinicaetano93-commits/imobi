import { z } from "zod";

export const KycTipoEnum = z.enum([
  "RG",
  "CPF",
  "CARTEIRA_MOTORISTA",
  "PASSPORT",
  "COMPROVANTE_ENDERECO",
]);

export const UploadDocumentoSchema = z.object({
  tipo: KycTipoEnum,
  url: z.string().url(),
});

export const RejeitarDocumentoSchema = z.object({
  motivo: z.string().min(10).max(1000).transform(v => v.trim()),
});

export type KycTipo = z.infer<typeof KycTipoEnum>;
export type UploadDocumentoInput = z.infer<typeof UploadDocumentoSchema>;
export type RejeitarDocumentoInput = z.infer<typeof RejeitarDocumentoSchema>;
