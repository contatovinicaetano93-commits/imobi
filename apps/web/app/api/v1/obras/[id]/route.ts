import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@imbobi/db";
import { requireAuth, requireRole } from "@/lib/server/auth";
import { ApiError, jsonError } from "@/lib/server/errors";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(req);
    requireRole(user, ["ADMIN", "FUNDO", "CLIENTE", "ENGENHEIRO"]);

    const obra = await prisma.obra.findUnique({
      where: { id: params.id },
      include: {
        cliente: { select: { id: true, nome: true, email: true } },
        engenheiro: { select: { id: true, nome: true, email: true } },
        documentos: true,
        tranches: { include: { evidencias: true } },
      },
    });
    if (!obra) throw new ApiError(404, "Obra não encontrada.");

    const dono =
      user.role === "ADMIN" ||
      user.role === "FUNDO" ||
      (user.role === "CLIENTE" && obra.clienteId === user.id) ||
      (user.role === "ENGENHEIRO" && obra.engenheiroId === user.id);
    if (!dono) throw new ApiError(403, "Você não tem acesso a esta obra.");

    return NextResponse.json(obra);
  } catch (error) {
    return jsonError(error);
  }
}
