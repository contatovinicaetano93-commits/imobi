import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@imbobi/db";
import { RefreshTokenBodySchema } from "@imbobi/schemas";
import { signAccessToken, signRefreshToken, verifyToken } from "@/lib/server/auth";
import { ApiError, jsonError } from "@/lib/server/errors";

export async function POST(req: NextRequest) {
  try {
    const { refreshToken } = RefreshTokenBodySchema.parse(await req.json());

    let payload: { sub: string; type: string };
    try {
      payload = verifyToken<{ sub: string; type: string }>(refreshToken);
    } catch {
      throw new ApiError(401, "Token de atualização inválido ou expirado.");
    }
    if (payload.type !== "refresh") throw new ApiError(401, "Token de atualização inválido ou expirado.");

    const usuario = await prisma.usuario.findUnique({ where: { id: payload.sub } });
    if (!usuario || !usuario.ativo) throw new ApiError(401, "Sessão inválida.");

    return NextResponse.json({
      accessToken: signAccessToken(usuario.id, usuario.role),
      refreshToken: signRefreshToken(usuario.id),
    });
  } catch (error) {
    return jsonError(error);
  }
}
