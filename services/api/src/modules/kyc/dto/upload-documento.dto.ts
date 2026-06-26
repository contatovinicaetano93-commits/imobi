import { z } from "zod";

const TIPOS_PERMITIDOS = ["RG", "CPF", "Selfie", "ComprovanteResidencia", "CNPJ", "ContratoSocial"] as const;

const DOMINIOS_PERMITIDOS = [
  "amazonaws.com",
  "r2.cloudflarestorage.com",
  "render.com",
  "supabase.co",
];

export const UploadDocumentoSchema = z.object({
  tipo: z.enum(TIPOS_PERMITIDOS, {
    errorMap: () => ({ message: `Tipo inválido. Permitidos: ${TIPOS_PERMITIDOS.join(", ")}` }),
  }),
  url: z
    .string()
    .url("URL inválida")
    .refine((url) => url.startsWith("https://"), "A URL deve usar HTTPS")
    .refine(
      (url) => {
        try {
          const { hostname } = new URL(url);
          return DOMINIOS_PERMITIDOS.some((d) => hostname.endsWith(d));
        } catch {
          return false;
        }
      },
      "URL deve apontar para um domínio de armazenamento autorizado"
    ),
});

export type UploadDocumentoDto = z.infer<typeof UploadDocumentoSchema>;
