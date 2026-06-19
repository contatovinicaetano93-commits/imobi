import { z } from "zod";

export const TipoDocumentoEnum = z.enum([
  "CONTRATO",
  "LAUDO_TECNICO",
  "ART",
  "HABITE_SE",
  "ALVARA",
  "PLANTA",
  "MEMORIAL_DESCRITIVO",
  "OUTRO",
]);

export const UploadDocumentoSchema = z.object({
  tipo: TipoDocumentoEnum,
  url: z.string().url("URL inválida"),
  nome: z.string().min(1).max(200),
  obraId: z.string().uuid().optional(),
  creditoId: z.string().uuid().optional(),
});

export type TipoDocumento = z.infer<typeof TipoDocumentoEnum>;
export type UploadDocumentoInput = z.infer<typeof UploadDocumentoSchema>;
