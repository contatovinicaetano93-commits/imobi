import { z } from "zod";

export const KycDocumentoTipoEnum = z.enum([
  "RG_FRENTE",
  "RG_VERSO",
  "SELFIE",
  "COMPROVANTE",
]);

export const KycRejeitarDocumentoSchema = z.object({
  motivo: z.string().min(3, "Informe o motivo da rejeição").max(500),
});

export type KycDocumentoTipo = z.infer<typeof KycDocumentoTipoEnum>;
export type KycRejeitarDocumentoInput = z.infer<typeof KycRejeitarDocumentoSchema>;
