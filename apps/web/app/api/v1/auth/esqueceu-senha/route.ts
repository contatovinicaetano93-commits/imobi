import { NextRequest, NextResponse } from "next/server";
import * as crypto from "crypto";
import { prisma } from "@imbobi/db";
import { EsqueceuSenhaSchema } from "@imbobi/schemas";
import { recuperacaoSenhaEmail } from "@/lib/server/email";
import { jsonError } from "@/lib/server/errors";

export async function POST(req: NextRequest) {
  try {
    const { email } = EsqueceuSenhaSchema.parse(await req.json());
    const usuario = await prisma.usuario.findUnique({ where: { email } });

    if (usuario) {
      const rawToken = crypto.randomBytes(32).toString("hex");
      const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
      await prisma.usuario.update({
        where: { id: usuario.id },
        data: { resetToken: hashedToken, resetTokenExpiraEm: new Date(Date.now() + 60 * 60 * 1000) },
      });
      await recuperacaoSenhaEmail(usuario.nome, usuario.email, rawToken);
    }

    return NextResponse.json({ message: "Se o email estiver cadastrado, você receberá um link em breve." });
  } catch (error) {
    return jsonError(error);
  }
}
