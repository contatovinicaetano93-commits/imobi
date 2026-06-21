const ALLOWED_MIMES: Record<string, { magic: number[]; offset?: number }[]> = {
  'image/jpeg': [{ magic: [0xFF, 0xD8, 0xFF] }],
  'image/png':  [{ magic: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] }],
  'image/webp': [{ magic: [0x52, 0x49, 0x46, 0x46], offset: 0 }],
  'image/heic': [{ magic: [0x66, 0x74, 0x79, 0x70], offset: 4 }],
  'application/pdf': [{ magic: [0x25, 0x50, 0x44, 0x46] }],
};

export function detectMimeType(buffer: Buffer): string | null {
  for (const [mime, signatures] of Object.entries(ALLOWED_MIMES)) {
    for (const { magic, offset = 0 } of signatures) {
      if (magic.every((byte, i) => buffer[offset + i] === byte)) {
        return mime;
      }
    }
  }
  return null;
}

export const EVIDENCE_ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic']);
export const KYC_ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'application/pdf']);

export function validateMime(buffer: Buffer, allowed: Set<string>): string {
  const detected = detectMimeType(buffer);
  if (!detected || !allowed.has(detected)) {
    throw new Error(
      `Tipo de arquivo não permitido. Detectado: ${detected ?? 'desconhecido'}. Permitidos: ${[...allowed].join(', ')}`,
    );
  }
  return detected;
}
