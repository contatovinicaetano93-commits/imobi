import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@imbobi/db";
import { requireAuth, requireRole } from "@/lib/server/auth";
import { jsonError } from "@/lib/server/errors";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    requireRole(user, ["ADMIN"]);

    const tranches = await prisma.tranche.findMany({
      where: { status: "VALIDADA_ENGENHEIRO" },
      include: { obra: { select: { id: true, nome: true, cliente: { select: { nome: true, email: true } } } } },
      orderBy: [{ obraId: "asc" }, { numero: "asc" }],
    });
    return NextResponse.json(tranches);
  } catch (error) {
    return jsonError(error);
  }
}
