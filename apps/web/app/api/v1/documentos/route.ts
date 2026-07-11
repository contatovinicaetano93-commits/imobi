import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@imbobi/db";
import { EnviarDocumentoSchema } from "@imbobi/schemas";
import { requireAuth, requireRole } from "@/lib/server/auth";
import { ApiError, jsonError } from "@/lib/server/errors";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    requireRole(user, ["CLIENTE"]);
    const body = EnviarDocumentoSchema.parse(await req.json());

    const obra = await prisma.obra.findUnique({ where: { id: body.obraId } });
    if (!obra) throw new ApiError(404, "Obra não encontrada.");
    if (obra.clienteId !== user.id) throw new ApiError(403, "Esta obra não é sua.");

    const documento = await prisma.documento.create({
      data: { tipo: body.tipo, url: body.url, obra: { connect: { id: body.obraId } } },
    });
    return NextResponse.json(documento);
  } catch (error) {
    return jsonError(error);
  }
}
