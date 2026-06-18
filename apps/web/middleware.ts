import { NextResponse, type NextRequest } from "next/server";
import { decodeJwtPayload } from "@/lib/decode-jwt-payload";
import { WEB_ROUTE_RULES, getRoleHome, normalizeRole, roleCanAccess } from "@/lib/role-permissions";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/cadastro",
  "/esqueceu-senha",
  "/redefinir-senha",
  "/termos",
  "/privacy-policy",
  "/simulador",
  "/api/auth",
  "/api/proxy/auth",
  "/api/proxy/health",
  "/web-api/auth",
];

function decodeJwt(token: string): { role?: string; exp?: number } | null {
  const payload = decodeJwtPayload(token);
  if (!payload) return null;
  const raw = typeof payload.role === "string" ? payload.role : undefined;
  return {
    role: raw ? (normalizeRole(raw) ?? raw) : undefined,
    exp: typeof payload.exp === "number" ? payload.exp : undefined,
  };
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/proxy/auth") || pathname.startsWith("/web-api/auth")) {
    return NextResponse.next();
  }

  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
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

  const role = jwt.role ?? normalizeRole(request.cookies.get("session_role")?.value) ?? null;

  const rule = WEB_ROUTE_RULES.find((r) => pathname === r.prefix || pathname.startsWith(r.prefix + "/"));
  if (rule && !roleCanAccess(role, rule.roles)) {
    const home = getRoleHome(role, "/dashboard");
    return NextResponse.redirect(new URL(home, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
