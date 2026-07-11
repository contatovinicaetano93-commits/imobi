import { NextRequest, NextResponse } from "next/server";
import * as bcrypt from "bcryptjs";
import { prisma } from "@imbobi/db";
import { AtualizarUsuarioAdminSchema } from "@imbobi/schemas";
import { requireAuth, requireRole } from "@/lib/server/auth";
import { ApiError, jsonError } from "@/lib/server/errors";

async function obterOu404(id: string) {
  const usuario = await prisma.usuario.findUnique({
    where: { id },
    select: { id: true, nome: true, email: true, role: true, ativo: true, criadoEm: true },
  });
  if (!usuario) throw new ApiError(404, "Usuário não encontrado.");
  return usuario;
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(req);
    requireRole(user, ["ADMIN"]);
    return NextResponse.json(await obterOu404(params.id));
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(req);
    requireRole(user, ["ADMIN"]);
    await obterOu404(params.id);

    const body = AtualizarUsuarioAdminSchema.parse(await req.json());
    const data: Record<string, unknown> = {};
    if (body.nome) data.nome = body.nome;
    if (body.email) data.email = body.email;
    if (body.role) data.role = body.role;
    if (body.novaSenha) data.senhaHash = await bcrypt.hash(body.novaSenha, 12);

    const usuario = await prisma.usuario.update({
      where: { id: params.id },
      data,
      select: { id: true, nome: true, email: true, role: true, ativo: true },
    });
    return NextResponse.json(usuario);
  } catch (error) {
    return jsonError(error);
  }
}
