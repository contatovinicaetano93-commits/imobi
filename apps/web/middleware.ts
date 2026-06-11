import { NextResponse, type NextRequest } from "next/server";

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
];

// Áreas de staff: prefixo de rota → roles autorizadas.
// Camada de UX/rota apenas — a autorização real é garantida pelos guards da API NestJS.
const ROLE_RULES: Array<{ prefix: string; roles: string[] }> = [
  { prefix: "/dashboard/admin",      roles: ["ADMIN"] },
  { prefix: "/dashboard/gestor",     roles: ["GESTOR", "ADMIN"] },
  { prefix: "/dashboard/fundos",     roles: ["GESTOR", "ADMIN"] },
  { prefix: "/dashboard/relatorios", roles: ["GESTOR", "ADMIN"] },
  { prefix: "/dashboard/engenheiro", roles: ["ENGENHEIRO", "ADMIN"] },
  { prefix: "/dashboard/comercial",  roles: ["COMERCIAL", "ADMIN"] },
];

function decodeRole(token: string): string | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(atob(base64));
    return decoded.role ?? decoded.tipo ?? null;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (isPublic) return NextResponse.next();

  const token = request.cookies.get("access_token")?.value;
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const rule = ROLE_RULES.find((r) => pathname === r.prefix || pathname.startsWith(r.prefix + "/"));
  if (rule) {
    const role = decodeRole(token);
    if (!role || !rule.roles.includes(role)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
