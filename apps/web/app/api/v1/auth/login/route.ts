import { NextRequest, NextResponse } from "next/server";
import * as bcrypt from "bcryptjs";
import { prisma } from "@imbobi/db";
import { LoginSchema } from "@imbobi/schemas";
import { signAccessToken, signRefreshToken } from "@/lib/server/auth";
import { ApiError, jsonError } from "@/lib/server/errors";

export async function POST(req: NextRequest) {
  try {
    const body = LoginSchema.parse(await req.json());

    const usuario = await prisma.usuario.findUnique({ where: { email: body.email } });
    if (!usuario) throw new ApiError(401, "Credenciais inválidas.");

    const senhaOk = await bcrypt.compare(body.senha, usuario.senhaHash);
    if (!senhaOk) throw new ApiError(401, "Credenciais inválidas.");
    if (!usuario.ativo) throw new ApiError(401, "Conta desativada. Contate o administrador.");

    return NextResponse.json({
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, role: usuario.role },
      accessToken: signAccessToken(usuario.id, usuario.role),
      refreshToken: signRefreshToken(usuario.id),
    });
  } catch (error) {
    return jsonError(error);
  }
}
