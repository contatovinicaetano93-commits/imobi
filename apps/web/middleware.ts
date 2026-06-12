import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/", "/login", "/cadastro", "/api/auth", "/api/proxy/auth"];

type Role = "TOMADOR" | "GESTOR_OBRA" | "ADMIN" | "PARCEIRO";

// Rota padrão de cada role após login
const ROLE_HOME: Record<Role, string> = {
  TOMADOR:    "/dashboard",
  GESTOR_OBRA: "/dashboard/gestor",
  ADMIN:      "/dashboard",
  PARCEIRO:   "/dashboard/comercial",
};

// Prefixos de rota permitidos por role
const ROLE_ALLOWED: Record<Role, string[]> = {
  TOMADOR: [
    "/dashboard/obras", "/dashboard/credito", "/dashboard/score",
    "/dashboard/simulador", "/dashboard/kyc", "/dashboard/perfil",
    "/dashboard/notificacoes", "/dashboard/construtor",
  ],
  GESTOR_OBRA: [
    "/dashboard/gestor", "/dashboard/fundos", "/dashboard/engenheiro",
    "/dashboard/relatorios", "/dashboard/perfil", "/dashboard/notificacoes",
  ],
  ADMIN: ["/dashboard"],
  PARCEIRO: [
    "/dashboard/comercial", "/dashboard/perfil", "/dashboard/notificacoes",
  ],
};

function decodeRole(token: string): Role | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return json.tipo ?? null;
  } catch {
    return null;
  }
}

function isAllowed(role: Role, pathname: string): boolean {
  if (role === "ADMIN") return true;
  // Rota exata do dashboard raiz é permitida para todos autenticados
  if (pathname === "/dashboard") return true;
  const allowed = ROLE_ALLOWED[role] ?? [];
  return allowed.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/"));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  if (isPublic) return NextResponse.next();

  const token = request.cookies.get("access_token")?.value;
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = decodeRole(token);

  // Token inválido/corrompido → logout
  if (!role) {
    const res = NextResponse.redirect(new URL("/login", request.url));
    res.cookies.delete("access_token");
    res.cookies.delete("refresh_token");
    return res;
  }

  // Acesso à raiz /dashboard → redireciona para home do role
  if (pathname === "/dashboard" && role !== "TOMADOR" && role !== "ADMIN") {
    return NextResponse.redirect(new URL(ROLE_HOME[role], request.url));
  }

  // Rota não permitida para o role → redireciona para home do role
  if (!isAllowed(role, pathname)) {
    return NextResponse.redirect(new URL(ROLE_HOME[role], request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
