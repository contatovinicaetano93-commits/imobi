import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@imbobi/db";
import { requireAuth, requireRole } from "@/lib/server/auth";
import { ApiError, jsonError } from "@/lib/server/errors";

export async function GET(req: NextRequest, { params }: { params: { obraId: string } }) {
  try {
    const user = await requireAuth(req);
    requireRole(user, ["ADMIN", "CLIENTE", "FUNDO"]);

    if (user.role === "CLIENTE") {
      const obra = await prisma.obra.findUnique({ where: { id: params.obraId } });
      if (!obra || obra.clienteId !== user.id) throw new ApiError(403, "Esta obra não é sua.");
    }

    const documentos = await prisma.documento.findMany({
      where: { obraId: params.obraId },
      orderBy: { criadoEm: "desc" },
    });
    return NextResponse.json(documentos);
  } catch (error) {
    return jsonError(error);
  }
}
