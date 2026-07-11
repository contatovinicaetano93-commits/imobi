import { NextResponse, type NextRequest } from "next/server";
import { decodeJwtPayload } from "@/lib/decode-jwt-payload";
import { ROLE_HOME, normalizeRole } from "@/lib/role-permissions";
import { resolveRequestRole } from "@/lib/resolve-request-role";
import {
  isCanonicalRouteAllowed,
  PUBLIC_MARKETING_PATHS,
  resolveLegacyRedirect,
} from "@/lib/canonical-flow";

const PUBLIC_PATHS = [
  ...PUBLIC_MARKETING_PATHS,
  "/api/auth",
  "/api/proxy/auth",
  "/api/proxy/health",
  "/api/proxy/credito/simular",
  "/api/proxy/propostas",
  "/web-api/auth",
];

function decodeJwt(token: string): { role?: string; exp?: number } | null {
  const payload = decodeJwtPayload(token);
  if (!payload) return null;
  const raw = typeof payload.role === "string" ? payload.role : undefined;
  return {
    role: raw ? (normalizeRole(raw) ?? undefined) : undefined,
    exp: typeof payload.exp === "number" ? payload.exp : undefined,
  };
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // API embutida cuida da própria auth (requireAuth/requireRole) e devolve 401/403 em JSON,
  // não faz sentido redirecionar pra /login aqui.
  if (pathname.startsWith("/api/v1")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/proxy/auth") || pathname.startsWith("/web-api/auth")) {
    return NextResponse.next();
  }

  const legacyDest = resolveLegacyRedirect(pathname);
  if (legacyDest) {
    return NextResponse.redirect(new URL(legacyDest, request.url));
  }

  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (isPublic) return NextResponse.next();

  const token = request.cookies.get("access_token")?.value;
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const jwt = decodeJwt(token);
  if (!jwt || (jwt.exp && jwt.exp < Math.floor(Date.now() / 1000))) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = resolveRequestRole(request, token);

  if (role && !isCanonicalRouteAllowed(pathname, role)) {
    const home = ROLE_HOME[role] ?? "/dashboard";
    return NextResponse.redirect(new URL(home, request.url));
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
