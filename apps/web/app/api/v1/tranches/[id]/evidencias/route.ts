import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@imbobi/db";
import { AnexarEvidenciaSchema } from "@imbobi/schemas";
import { requireAuth, requireRole } from "@/lib/server/auth";
import { assertAcessoObra } from "@/lib/server/obras";
import { ApiError, jsonError } from "@/lib/server/errors";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(req);
    requireRole(user, ["ENGENHEIRO", "CLIENTE"]);
    const body = AnexarEvidenciaSchema.parse(await req.json());

    const tranche = await prisma.tranche.findUnique({ where: { id: params.id } });
    if (!tranche) throw new ApiError(404, "Tranche não encontrada.");
    await assertAcessoObra(tranche.obraId, user);

    const evidencia = await prisma.evidencia.create({
      data: { url: body.url, descricao: body.descricao, tranche: { connect: { id: params.id } } },
    });
    return NextResponse.json(evidencia);
  } catch (error) {
    return jsonError(error);
  }
}
