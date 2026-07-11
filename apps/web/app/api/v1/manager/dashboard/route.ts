import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@imbobi/db";
import { requireAuth, requireRole } from "@/lib/server/auth";
import { jsonError } from "@/lib/server/errors";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    requireRole(user, ["FUNDO", "ADMIN"]);

    const [obrasPorEtapa, tranches, capitalTotal] = await Promise.all([
      prisma.obra.groupBy({ by: ["etapa"], _count: true }),
      prisma.tranche.groupBy({ by: ["status"], _count: true, _sum: { valor: true } }),
      prisma.obra.aggregate({ _sum: { valorCredito: true } }),
    ]);

    const dre = {
      capitalContratado: capitalTotal._sum.valorCredito ?? 0,
      capitalLiberado: tranches.find((t) => t.status === "LIBERADA_ADMIN")?._sum.valor ?? 0,
      capitalPendente: tranches.find((t) => t.status === "VALIDADA_ENGENHEIRO")?._sum.valor ?? 0,
    };

    return NextResponse.json({
      obrasPorEtapa: Object.fromEntries(obrasPorEtapa.map((o) => [o.etapa, o._count])),
      tranchesPorStatus: Object.fromEntries(tranches.map((t) => [t.status, t._count])),
      dre,
    });
  } catch (error) {
    return jsonError(error);
  }
}
