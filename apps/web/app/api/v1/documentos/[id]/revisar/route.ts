import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@imbobi/db";
import { RevisarDocumentoSchema } from "@imbobi/schemas";
import { requireAuth, requireRole } from "@/lib/server/auth";
import { ApiError, jsonError } from "@/lib/server/errors";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(req);
    requireRole(user, ["ADMIN"]);
    const { status } = RevisarDocumentoSchema.parse(await req.json());

    const documento = await prisma.documento.findUnique({ where: { id: params.id } });
    if (!documento) throw new ApiError(404, "Documento não encontrado.");

    const atualizado = await prisma.documento.update({ where: { id: params.id }, data: { status } });
    return NextResponse.json(atualizado);
  } catch (error) {
    return jsonError(error);
  }
}
