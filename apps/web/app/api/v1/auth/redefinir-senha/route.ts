import { NextRequest, NextResponse } from "next/server";
import * as crypto from "crypto";
import * as bcrypt from "bcryptjs";
import { prisma } from "@imbobi/db";
import { RedefinirSenhaSchema } from "@imbobi/schemas";
import { ApiError, jsonError } from "@/lib/server/errors";

export async function POST(req: NextRequest) {
  try {
    const { token, novaSenha } = RedefinirSenhaSchema.parse(await req.json());
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const usuario = await prisma.usuario.findFirst({
      where: { resetToken: hashedToken, resetTokenExpiraEm: { gt: new Date() } },
    });
    if (!usuario) throw new ApiError(400, "Link inválido ou expirado.");

    const senhaHash = await bcrypt.hash(novaSenha, 12);
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { senhaHash, resetToken: null, resetTokenExpiraEm: null },
    });

    return NextResponse.json({ message: "Senha redefinida com sucesso." });
  } catch (error) {
    return jsonError(error);
  }
}
