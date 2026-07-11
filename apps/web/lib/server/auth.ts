import jwt from "jsonwebtoken";
import type { NextRequest } from "next/server";
import { prisma } from "@imbobi/db";
import { ApiError } from "./errors";

const JWT_SECRET = process.env.JWT_SECRET as string;

export type AuthUser = { id: string; role: string };

export function signAccessToken(userId: string, role: string): string {
  return jwt.sign({ sub: userId, role }, JWT_SECRET, { expiresIn: "8h" });
}

export function signRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId, type: "refresh" }, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken<T extends object = jwt.JwtPayload>(token: string): T {
  return jwt.verify(token, JWT_SECRET) as T;
}

function extractToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  if (header?.startsWith("Bearer ")) return header.slice(7);
  return req.cookies.get("access_token")?.value ?? null;
}

/** Verifica JWT + usuário ativo. Lança 401 se inválido. */
export async function requireAuth(req: NextRequest): Promise<AuthUser> {
  const token = extractToken(req);
  if (!token) throw new ApiError(401, "Não autenticado.");

  let payload: { sub: string };
  try {
    payload = verifyToken<{ sub: string }>(token);
  } catch {
    throw new ApiError(401, "Token inválido ou expirado.");
  }

  const usuario = await prisma.usuario.findUnique({
    where: { id: payload.sub },
    select: { id: true, role: true, ativo: true },
  });
  if (!usuario || !usuario.ativo) throw new ApiError(401, "Conta desativada ou inexistente.");

  return { id: usuario.id, role: usuario.role };
}

/** Lança 403 se o papel do usuário não estiver na lista permitida. */
export function requireRole(user: AuthUser, roles: string[]): void {
  if (!roles.includes(user.role)) {
    throw new ApiError(403, "Acesso negado para este perfil.");
  }
}
