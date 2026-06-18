import { decodeJwtPayload } from "@/lib/decode-jwt-payload";

type VerifiedJwtPayload = Record<string, unknown> & {
  exp?: number;
  role?: string;
};

function base64UrlToBytes(input: string): Uint8Array {
  let base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4;
  if (pad) base64 += "=".repeat(4 - pad);

  const binary = atob(base64);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function decodeBase64UrlJson(input: string): Record<string, unknown> | null {
  try {
    const bytes = base64UrlToBytes(input);
    return JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;

  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a[i] ^ b[i];
  }

  return diff === 0;
}

export async function verifyHs256Jwt(token: string): Promise<VerifiedJwtPayload | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  if (!encodedHeader || !encodedPayload || !encodedSignature) return null;

  const secret = process.env["JWT_SECRET"];
  if (!secret) return null;

  const header = decodeBase64UrlJson(encodedHeader);
  if (header?.alg !== "HS256") return null;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = new Uint8Array(
    await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`),
    ),
  );

  if (!timingSafeEqual(signature, base64UrlToBytes(encodedSignature))) {
    return null;
  }

  const payload = decodeJwtPayload(token);
  if (!payload) return null;

  const exp = payload.exp;
  if (typeof exp === "number" && exp < Math.floor(Date.now() / 1000)) {
    return null;
  }

  return payload as VerifiedJwtPayload;
}
