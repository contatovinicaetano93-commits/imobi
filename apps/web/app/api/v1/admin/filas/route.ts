import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@imbobi/db";
import { requireAuth, requireRole } from "@/lib/server/auth";
import { jsonError } from "@/lib/server/errors";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    requireRole(user, ["ADMIN"]);

    const [documentosPendentes, obrasParaHomologar, tranchesParaLiberar] = await Promise.all([
      prisma.documento.count({ where: { status: "PENDENTE" } }),
      prisma.obra.count({ where: { etapa: "OBRA_CADASTRADA" } }),
      prisma.tranche.count({ where: { status: "VALIDADA_ENGENHEIRO" } }),
    ]);

    return NextResponse.json({ documentosPendentes, obrasParaHomologar, tranchesParaLiberar });
  } catch (error) {
    return jsonError(error);
  }
}
