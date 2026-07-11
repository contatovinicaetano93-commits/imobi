import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@imbobi/db";
import { requireAuth, requireRole } from "@/lib/server/auth";
import { ApiError, jsonError } from "@/lib/server/errors";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(req);
    requireRole(user, ["ADMIN"]);

    const existe = await prisma.usuario.findUnique({ where: { id: params.id } });
    if (!existe) throw new ApiError(404, "Usuário não encontrado.");

    const { ativo } = await req.json();
    const usuario = await prisma.usuario.update({
      where: { id: params.id },
      data: { ativo: Boolean(ativo) },
      select: { id: true, nome: true, ativo: true },
    });
    return NextResponse.json(usuario);
  } catch (error) {
    return jsonError(error);
  }
}
