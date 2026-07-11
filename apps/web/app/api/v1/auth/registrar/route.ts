import { NextRequest, NextResponse } from "next/server";
import * as bcrypt from "bcryptjs";
import { prisma } from "@imbobi/db";
import { CadastroUsuarioSchema } from "@imbobi/schemas";
import { signAccessToken, signRefreshToken } from "@/lib/server/auth";
import { ApiError, jsonError } from "@/lib/server/errors";

/** Cadastro público — sempre CLIENTE. Admin/Fundo/Engenheiro só via /usuarios (admin-only). */
export async function POST(req: NextRequest) {
  try {
    const body = CadastroUsuarioSchema.parse(await req.json());

    const existe = await prisma.usuario.findUnique({ where: { email: body.email } });
    if (existe) throw new ApiError(409, "E-mail já cadastrado.");

    const senhaHash = await bcrypt.hash(body.senha, 12);
    const usuario = await prisma.usuario.create({
      data: { nome: body.nome, email: body.email, senhaHash, role: "CLIENTE" },
      select: { id: true, nome: true, email: true, role: true },
    });

    return NextResponse.json({
      usuario,
      accessToken: signAccessToken(usuario.id, usuario.role),
      refreshToken: signRefreshToken(usuario.id),
    });
  } catch (error) {
    return jsonError(error);
  }
}
