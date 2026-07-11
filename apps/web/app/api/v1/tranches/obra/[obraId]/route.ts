import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@imbobi/db";
import { requireAuth, requireRole } from "@/lib/server/auth";
import { assertAcessoObra } from "@/lib/server/obras";
import { jsonError } from "@/lib/server/errors";

export async function GET(req: NextRequest, { params }: { params: { obraId: string } }) {
  try {
    const user = await requireAuth(req);
    requireRole(user, ["ADMIN", "CLIENTE", "ENGENHEIRO", "FUNDO"]);
    await assertAcessoObra(params.obraId, user);

    const tranches = await prisma.tranche.findMany({
      where: { obraId: params.obraId },
      include: { evidencias: true },
      orderBy: { numero: "asc" },
    });
    return NextResponse.json(tranches);
  } catch (error) {
    return jsonError(error);
  }
}
