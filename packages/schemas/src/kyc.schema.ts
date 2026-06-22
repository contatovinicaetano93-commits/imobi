import { z } from "zod";

export const KycDocumentoTipoEnum = z.enum([
  "RG_FRENTE",
  "RG_VERSO",
  "SELFIE",
  "COMPROVANTE",
]);

export type KycDocumentoTipo = z.infer<typeof KycDocumentoTipoEnum>;

export const KYC_MAX_FILE_BYTES = 10 * 1024 * 1024;

export const KYC_ACCEPTED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
] as const;

export const KYC_ACCEPT_INPUT = "image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf,.pdf";

export function validateKycFile(file: File): { ok: true } | { ok: false; message: string } {
  if (file.size > KYC_MAX_FILE_BYTES) {
    return { ok: false, message: "Arquivo muito grande (máx. 10 MB)" };
  }

  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (isPdf) return { ok: true };

  const type = file.type || "";
  const mimeOk =
    KYC_ACCEPTED_MIME_TYPES.includes(type as (typeof KYC_ACCEPTED_MIME_TYPES)[number])
    || type.startsWith("image/");

  if (!mimeOk) {
    return { ok: false, message: "Formato não suportado. Use JPG, PNG, WEBP ou PDF." };
  }

  return { ok: true };
}

export const KYC_DOC_CATALOG: Array<{
  tipo: KycDocumentoTipo;
  label: string;
  desc: string;
}> = [
  { tipo: "RG_FRENTE", label: "RG — Frente", desc: "Documento de Identidade (frente)" },
  { tipo: "RG_VERSO", label: "RG — Verso", desc: "Documento de Identidade (verso)" },
  { tipo: "SELFIE", label: "Selfie c/ documento", desc: "Foto sua segurando o documento" },
  { tipo: "COMPROVANTE", label: "Comprovante de residência", desc: "Conta de luz, água ou banco" },
];
