/** Decodifica payload JWT (base64url) — compatível com Edge (middleware). */
export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    let base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const pad = base64.length % 4;
    if (pad) base64 += "=".repeat(4 - pad);
    return JSON.parse(atob(base64)) as Record<string, unknown>;
  } catch {
    return null;
  }
}
