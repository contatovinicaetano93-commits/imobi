import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@imbobi/db";
import { ValidarTrancheSchema } from "@imbobi/schemas";
import { requireAuth, requireRole } from "@/lib/server/auth";
import { ApiError, jsonError } from "@/lib/server/errors";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(req);
    requireRole(user, ["ENGENHEIRO"]);
    const body = ValidarTrancheSchema.parse(await req.json());

    const tranche = await prisma.tranche.findUnique({ where: { id: params.id }, include: { obra: true } });
    if (!tranche) throw new ApiError(404, "Tranche não encontrada.");
    if (tranche.obra.engenheiroId !== user.id) {
      throw new ApiError(403, "Você não é o engenheiro responsável por esta obra.");
    }
    if (tranche.status !== "PENDENTE") throw new ApiError(403, "Só é possível validar tranches pendentes.");

    const atualizada = await prisma.tranche.update({
      where: { id: params.id },
      data: {
        status: body.aprovado ? "VALIDADA_ENGENHEIRO" : "REJEITADA",
        validadoPorId: user.id,
        validadoEm: new Date(),
      },
    });
    return NextResponse.json(atualizada);
  } catch (error) {
    return jsonError(error);
  }
}
