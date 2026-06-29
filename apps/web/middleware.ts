import { NextResponse, type NextRequest } from "next/server";
import { decodeJwtPayload } from "@/lib/decode-jwt-payload";
import { ROLE_HOME, normalizeRole } from "@/lib/role-permissions";
import { resolveRequestRole } from "@/lib/resolve-request-role";
import { isMvpRouteAllowed, GUIDED_STRICT_MODE } from "@/lib/beta-mvp";
import {
  resolveLegacyRedirect,
  isCanonicalRouteAllowed,
} from "@/lib/canonical-flow";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/cadastro",
  "/esqueceu-senha",
  "/redefinir-senha",
  "/termos",
  "/privacy-policy",
  "/simulador",
  "/envie-seu-projeto",
  "/quem-somos",
  "/como-funciona",
  "/contato",
  "/api/auth",
  "/api/proxy/auth",
  "/api/proxy/credito/simular",
  "/api/proxy/propostas/checklist-template",
  "/api/proxy/health",
  "/web-api/auth",
];

const ROLE_RULES: Array<{ prefix: string; roles: string[] }> = [
  { prefix: "/dashboard/admin", roles: ["ADMIN"] },
  { prefix: "/dashboard/gestor", roles: ["GESTOR", "ADMIN"] },
  { prefix: "/dashboard/engenheiro", roles: ["ENGENHEIRO", "GESTOR_OBRA", "ADMIN"] },
  { prefix: "/dashboard/comercial", roles: ["COMERCIAL", "PARCEIRO", "ADMIN"] },
  { prefix: "/dashboard/construtor", roles: ["CONSTRUTOR", "TOMADOR", "ADMIN"] },
  { prefix: "/dashboard/credito", roles: ["CONSTRUTOR", "TOMADOR", "ADMIN"] },
  { prefix: "/dashboard/obras", roles: ["CONSTRUTOR", "TOMADOR", "ENGENHEIRO", "GESTOR_OBRA", "ADMIN"] },
  { prefix: "/dashboard/kyc", roles: ["CONSTRUTOR", "TOMADOR", "ADMIN"] },
  { prefix: "/dashboard/proposta-credito", roles: ["CONSTRUTOR", "TOMADOR", "ADMIN"] },
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

  if (pathname.startsWith("/api/proxy/propostas/checklist-template")) {
    return NextResponse.next();
  }

  if (pathname === "/api/proxy/propostas" && request.method === "POST") {
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

  const role = resolveRequestRole(request, token);

  const legacyDest = resolveLegacyRedirect(pathname);
  if (legacyDest) {
    return NextResponse.redirect(new URL(legacyDest, request.url));
  }

  // Admin opera KYC/vistorias no Centro de Comando — nunca nas filas do gestor de fundo (somente leitura).
  if (role === "ADMIN") {
    if (pathname === "/dashboard/gestor/kyc" || pathname.startsWith("/dashboard/gestor/kyc/")) {
      const dest = pathname.replace("/dashboard/gestor/kyc", "/dashboard/admin/kyc");
      return NextResponse.redirect(new URL(dest, request.url));
    }
    if (pathname === "/dashboard/gestor/etapas" || pathname.startsWith("/dashboard/gestor/etapas")) {
      return NextResponse.redirect(new URL("/dashboard/admin/vistorias", request.url));
    }
  }

  if (
    (role === "ENGENHEIRO" || role === "GESTOR_OBRA") &&
    (pathname === "/dashboard/obras/nova" || pathname.startsWith("/dashboard/obras/nova/"))
  ) {
    return NextResponse.redirect(new URL("/dashboard/engenheiro/vistoria", request.url));
  }

  const rule = ROLE_RULES.find((r) => pathname === r.prefix || pathname.startsWith(r.prefix + "/"));
  if (rule && (!role || !rule.roles.includes(role))) {
    const home = role ? (ROLE_HOME[role] ?? "/dashboard") : "/dashboard";
    return NextResponse.redirect(new URL(home, request.url));
  }

  if (role && !isMvpRouteAllowed(pathname, role)) {
    const candidate = ROLE_HOME[role] ?? "/dashboard/construtor";
    const home = isMvpRouteAllowed(candidate, role) ? candidate : "/dashboard/construtor";
    return NextResponse.redirect(new URL(home, request.url));
  }

  if (role && !isCanonicalRouteAllowed(pathname, role)) {
    const home = ROLE_HOME[role] ?? "/dashboard/construtor";
    return NextResponse.redirect(new URL(home, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
