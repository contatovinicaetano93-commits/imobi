import { z } from "zod";

export const TipoDocumentoEnum = z.enum([
  "RG",
  "CPF",
  "CNH",
  "Selfie",
  "ComprovanteRenda",
  "ComprovanteEndereco",
]);

export const StatusDocumentoEnum = z.enum([
  "PENDENTE",
  "APROVADO",
  "REJEITADO",
]);

export const UploadDocumentoKycSchema = z.object({
  tipo: TipoDocumentoEnum,
  url: z.string().url("URL do documento inválida"),
});

export const RejeitarDocumentoKycSchema = z.object({
  motivo: z
    .string()
    .min(10, "Descreva o motivo com ao menos 10 caracteres")
    .max(500),
});

export const FiltroKycSchema = z.object({
  status: StatusDocumentoEnum.optional(),
  tipo: TipoDocumentoEnum.optional(),
  usuarioId: z.string().uuid().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export type TipoDocumento = z.infer<typeof TipoDocumentoEnum>;
export type StatusDocumento = z.infer<typeof StatusDocumentoEnum>;
export type UploadDocumentoKycInput = z.infer<typeof UploadDocumentoKycSchema>;
export type RejeitarDocumentoKycInput = z.infer<typeof RejeitarDocumentoKycSchema>;
export type FiltroKycInput = z.infer<typeof FiltroKycSchema>;
