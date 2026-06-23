import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { TOMADOR_HOME, TOMADOR_LEGACY_REDIRECTS, TOMADOR_ROUTES } from "./lib/tomador-flow";

const PUBLIC_PATHS = [
  "/",
  "/simulador",
  "/login",
  "/cadastro",
  "/esqueceu-senha",
  "/redefinir-senha",
  "/termos",
  "/privacy-policy",
  "/api/auth",
  "/api/proxy/auth",
];

// Route prefix → allowed roles. Real authorization is enforced by NestJS guards.
const ROLE_RULES: Array<{ prefix: string; roles: string[] }> = [
  { prefix: "/dashboard/admin",      roles: ["ADMIN"] },
  { prefix: "/dashboard/gestor",     roles: ["GESTOR", "ADMIN"] },
  { prefix: "/dashboard/relatorios", roles: ["GESTOR", "ADMIN"] },
  { prefix: "/dashboard/engenheiro", roles: ["ENGENHEIRO", "GESTOR_OBRA", "ADMIN"] },
  { prefix: "/dashboard/comercial",  roles: ["COMERCIAL", "PARCEIRO", "ADMIN"] },
  { prefix: "/dashboard/inicio",     roles: ["CONSTRUTOR", "TOMADOR", "ADMIN"] },
  { prefix: "/dashboard/construtor", roles: ["CONSTRUTOR", "TOMADOR", "ADMIN"] },
  { prefix: "/dashboard/credito",    roles: ["CONSTRUTOR", "TOMADOR", "ADMIN"] },
  { prefix: "/dashboard/obras",      roles: ["CONSTRUTOR", "TOMADOR", "GESTOR", "ENGENHEIRO", "GESTOR_OBRA", "ADMIN"] },
  { prefix: "/dashboard/kyc",        roles: ["CONSTRUTOR", "TOMADOR", "ADMIN"] },
  { prefix: "/dashboard/score",      roles: ["CONSTRUTOR", "TOMADOR", "ADMIN"] },
  { prefix: "/dashboard/simulador",  roles: ["CONSTRUTOR", "TOMADOR", "ADMIN"] },
  { prefix: "/dashboard/comite",     roles: ["CONSTRUTOR", "TOMADOR", "GESTOR", "ENGENHEIRO", "GESTOR_OBRA", "ADMIN"] },
];

/** GESTOR_FUNDO is legacy — same persona as GESTOR (Gestor de Fundo). */
function normalizeRole(role: string | null): string | null {
  if (!role) return null;
  if (role === "GESTOR_FUNDO") return "GESTOR";
  return role;
}

async function verifyJwt(
  token: string,
  secret: string,
): Promise<{ role?: string; exp?: number } | null> {
  try {
    const key = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, key);
    return payload as { role?: string; exp?: number };
  } catch {
    return null;
  }
}

function roleHome(role: string | null): string {
  switch (role) {
    case "ADMIN":
      return "/dashboard/admin";
    case "GESTOR":
      return "/dashboard/gestor";
    case "ENGENHEIRO":
    case "GESTOR_OBRA":
      return "/dashboard/engenheiro";
    case "COMERCIAL":
    case "PARCEIRO":
      return "/dashboard/comercial";
    case "CONSTRUTOR":
    case "TOMADOR":
      return TOMADOR_HOME;
    default:
      return "/login";
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (isPublic) return NextResponse.next();

  const token = request.cookies.get("access_token")?.value;
  const refreshToken = request.cookies.get("refresh_token")?.value;

  // No token → attempt silent refresh if refresh_token exists, else login
  if (!token) {
    if (refreshToken) {
      const refreshUrl = new URL("/api/proxy/auth/refresh-redirect", request.url);
      refreshUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(refreshUrl);
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const secret = process.env["JWT_SECRET"] ?? "";
  const jwt = await verifyJwt(token, secret);

  if (!jwt || (jwt.exp && jwt.exp < Math.floor(Date.now() / 1000))) {
    if (refreshToken) {
      const refreshUrl = new URL("/api/proxy/auth/refresh-redirect", request.url);
      refreshUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(refreshUrl);
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = normalizeRole((jwt as Record<string, unknown>).role as string ?? null);

  const legacyTarget = TOMADOR_LEGACY_REDIRECTS[pathname];
  if (legacyTarget && (role === "TOMADOR" || role === "CONSTRUTOR")) {
    const url = request.nextUrl.clone();
    url.pathname = typeof legacyTarget === "string" ? legacyTarget.split("?")[0] : legacyTarget;
    return NextResponse.redirect(url);
  }

  if (pathname === "/dashboard/credito/solicitar") {
    const url = request.nextUrl.clone();
    url.pathname = TOMADOR_ROUTES.credito.split("?")[0];
    url.searchParams.set("solicitar", "1");
    const valor = request.nextUrl.searchParams.get("valor");
    const prazo = request.nextUrl.searchParams.get("prazo");
    if (valor) url.searchParams.set("valor", valor);
    if (prazo) url.searchParams.set("prazo", prazo);
    return NextResponse.redirect(url);
  }

  if (pathname === "/dashboard/credito" && (role === "TOMADOR" || role === "CONSTRUTOR")) {
    const url = request.nextUrl.clone();
    url.pathname = TOMADOR_ROUTES.creditoExtrato.split("?")[0];
    url.search = "visao=extrato";
    return NextResponse.redirect(url);
  }

  if (pathname === "/dashboard" || pathname === "/dashboard/") {
    return NextResponse.redirect(new URL(roleHome(role), request.url));
  }

  if (pathname === "/dashboard/fundos" || pathname.startsWith("/dashboard/fundos/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(/^\/dashboard\/fundos/, "/dashboard/gestor/fundos");
    return NextResponse.redirect(url);
  }

  // Role-gated routes: wrong role → back to their own dashboard root
  const rule = ROLE_RULES.find((r) => pathname === r.prefix || pathname.startsWith(r.prefix + "/"));
  if (rule && (!role || !rule.roles.includes(role))) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
