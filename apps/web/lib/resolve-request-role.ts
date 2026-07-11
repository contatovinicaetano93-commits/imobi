import type { NextRequest } from "next/server";
import { decodeJwtPayload } from "@/lib/decode-jwt-payload";
import { normalizeRole, type AppRole } from "@/lib/role-permissions";

/** Role efetivo para middleware — JWT com fallback em session_role. */
export function resolveRequestRole(request: NextRequest, accessToken: string): AppRole | null {
  const payload = decodeJwtPayload(accessToken);
  const raw = typeof payload?.role === "string" ? payload.role : null;
  const fromJwt = normalizeRole(raw);
  if (fromJwt) return fromJwt;
  return normalizeRole(request.cookies.get("session_role")?.value);
}
