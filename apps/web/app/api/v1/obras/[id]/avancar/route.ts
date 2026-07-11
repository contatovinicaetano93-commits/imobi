import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@imbobi/db";
import type { EtapaFunil } from "@imbobi/schemas";
import { requireAuth, requireRole } from "@/lib/server/auth";
import { ApiError, jsonError } from "@/lib/server/errors";

const PROXIMA_ETAPA: Record<EtapaFunil, EtapaFunil | null> = {
  KYC_PENDENTE: "DOSSIE_EM_ANALISE",
  DOSSIE_EM_ANALISE: "APROVADO",
  APROVADO: "OBRA_CADASTRADA",
  OBRA_CADASTRADA: "HOMOLOGADA",
  HOMOLOGADA: "EM_ANDAMENTO",
  EM_ANDAMENTO: "QUITADO",
  QUITADO: null,
};

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(req);
    requireRole(user, ["ADMIN"]);

    const obra = await prisma.obra.findUnique({ where: { id: params.id } });
    if (!obra) throw new ApiError(404, "Obra não encontrada.");

    const proxima = PROXIMA_ETAPA[obra.etapa];
    if (!proxima) throw new ApiError(403, `Etapa "${obra.etapa}" não avança automaticamente.`);

    const atualizada = await prisma.$transaction(async (tx) => {
      const upd = await tx.obra.update({ where: { id: params.id }, data: { etapa: proxima } });
      await tx.historicoEtapa.create({ data: { obraId: params.id, etapa: proxima, usuarioId: user.id } });
      return upd;
    });

    return NextResponse.json(atualizada);
  } catch (error) {
    return jsonError(error);
  }
}
