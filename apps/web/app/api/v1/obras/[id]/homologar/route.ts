import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@imbobi/db";
import { HomologarObraSchema } from "@imbobi/schemas";
import { requireAuth, requireRole } from "@/lib/server/auth";
import { ApiError, jsonError } from "@/lib/server/errors";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(req);
    requireRole(user, ["ADMIN"]);
    const { engenheiroId } = HomologarObraSchema.parse(await req.json());

    const obra = await prisma.obra.findUnique({ where: { id: params.id } });
    if (!obra) throw new ApiError(404, "Obra não encontrada.");
    if (obra.etapa !== "OBRA_CADASTRADA") {
      throw new ApiError(403, "Só é possível homologar obras em OBRA_CADASTRADA.");
    }

    const engenheiro = await prisma.usuario.findUnique({ where: { id: engenheiroId } });
    if (!engenheiro || engenheiro.role !== "ENGENHEIRO") {
      throw new ApiError(400, "engenheiroId não corresponde a um usuário com papel ENGENHEIRO.");
    }

    const atualizada = await prisma.$transaction(async (tx) => {
      const upd = await tx.obra.update({ where: { id: params.id }, data: { engenheiroId, etapa: "HOMOLOGADA" } });
      await tx.historicoEtapa.create({ data: { obraId: params.id, etapa: "HOMOLOGADA", usuarioId: user.id } });
      return upd;
    });

    return NextResponse.json(atualizada);
  } catch (error) {
    return jsonError(error);
  }
}
