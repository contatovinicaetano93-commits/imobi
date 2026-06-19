import { z } from "zod";

export const TipoKycDocumentoEnum = z.enum([
  "RG",
  "CPF",
  "CNH",
  "Passaporte",
  "Comprovante de Residência",
  "Selfie",
]);

export const KycStatusDocumentoEnum = z.enum(["PENDENTE", "APROVADO", "REJEITADO"]);

export const UploadKycDocumentoSchema = z.object({
  tipo: TipoKycDocumentoEnum,
  url: z.string().url("URL inválida"),
});

export const AtualizarKycStatusSchema = z.object({
  status: KycStatusDocumentoEnum,
  observacao: z.string().max(2000).optional(),
});

export type TipoKycDocumento = z.infer<typeof TipoKycDocumentoEnum>;
export type UploadKycDocumentoInput = z.infer<typeof UploadKycDocumentoSchema>;
export type AtualizarKycStatusInput = z.infer<typeof AtualizarKycStatusSchema>;
