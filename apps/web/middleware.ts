import { NextResponse, type NextRequest } from "next/server";
import { decodeJwtPayload } from "@/lib/decode-jwt-payload";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/cadastro",
  "/esqueceu-senha",
  "/redefinir-senha",
  "/termos",
  "/privacy-policy",
  "/api/auth",
  "/api/proxy/auth",
  "/api/proxy/health",
];

// Route prefix → allowed roles. Real authorization is enforced by NestJS guards.
const ROLE_RULES: Array<{ prefix: string; roles: string[] }> = [
  { prefix: "/dashboard/admin",      roles: ["ADMIN"] },
  { prefix: "/dashboard/gestor",     roles: ["GESTOR", "GESTOR_FUNDO", "ADMIN"] },
  { prefix: "/dashboard/fundos",     roles: ["GESTOR", "GESTOR_FUNDO", "ADMIN"] },
  { prefix: "/dashboard/relatorios", roles: ["GESTOR", "GESTOR_FUNDO", "ADMIN"] },
  { prefix: "/dashboard/engenheiro", roles: ["ENGENHEIRO", "GESTOR_OBRA", "ADMIN"] },
  { prefix: "/dashboard/comercial",  roles: ["COMERCIAL", "PARCEIRO", "ADMIN"] },
  { prefix: "/dashboard/construtor", roles: ["CONSTRUTOR", "TOMADOR", "ADMIN"] },
  { prefix: "/dashboard/credito",    roles: ["CONSTRUTOR", "TOMADOR", "ADMIN"] },
  { prefix: "/dashboard/obras",      roles: ["CONSTRUTOR", "TOMADOR", "GESTOR", "ENGENHEIRO", "GESTOR_OBRA", "ADMIN"] },
  { prefix: "/dashboard/kyc",        roles: ["CONSTRUTOR", "TOMADOR", "ADMIN"] },
  { prefix: "/dashboard/score",      roles: ["CONSTRUTOR", "TOMADOR", "ADMIN"] },
  { prefix: "/dashboard/simulador",  roles: ["CONSTRUTOR", "TOMADOR", "ADMIN"] },
  { prefix: "/dashboard/comite",     roles: ["CONSTRUTOR", "TOMADOR", "GESTOR", "ENGENHEIRO", "GESTOR_OBRA", "ADMIN"] },
];

function decodeJwt(token: string): { role?: string; exp?: number } | null {
  const payload = decodeJwtPayload(token);
  if (!payload) return null;
  return {
    role: typeof payload.role === "string" ? payload.role : undefined,
    exp: typeof payload.exp === "number" ? payload.exp : undefined,
  };
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (isPublic) return NextResponse.next();

  const token = request.cookies.get("access_token")?.value;

  // No token or expired → send to login
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

  const role = jwt.role ?? null;

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
