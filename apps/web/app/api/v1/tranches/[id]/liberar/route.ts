import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@imbobi/db";
import { requireAuth, requireRole } from "@/lib/server/auth";
import { withRetry } from "@/lib/server/retry";
import { ApiError, jsonError } from "@/lib/server/errors";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(req);
    requireRole(user, ["ADMIN"]);

    const tranche = await prisma.tranche.findUnique({ where: { id: params.id } });
    if (!tranche) throw new ApiError(404, "Tranche não encontrada.");
    if (tranche.status !== "VALIDADA_ENGENHEIRO") {
      throw new ApiError(403, "Só é possível liberar tranches validadas pelo engenheiro.");
    }

    // Liberação de valor é a operação mais crítica — retry contra blips do Neon.
    const atualizada = await withRetry(
      () =>
        prisma.tranche.update({
          where: { id: params.id },
          data: { status: "LIBERADA_ADMIN", liberadoPorId: user.id, liberadoEm: new Date() },
        }),
      { maxAttempts: 3, initialDelayMs: 200, maxDelayMs: 2000, multiplier: 2 },
    );
    return NextResponse.json(atualizada);
  } catch (error) {
    return jsonError(error);
  }
}
