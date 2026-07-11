import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@imbobi/db";
import { CriarObraSchema } from "@imbobi/schemas";
import { requireAuth, requireRole } from "@/lib/server/auth";
import { jsonError } from "@/lib/server/errors";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    requireRole(user, ["CLIENTE"]);
    const body = CriarObraSchema.parse(await req.json());

    const obra = await prisma.$transaction(async (tx) => {
      const nova = await tx.obra.create({
        data: {
          nome: body.nome,
          endereco: body.endereco,
          valorCredito: body.valorCredito,
          etapa: "KYC_PENDENTE",
          cliente: { connect: { id: user.id } },
        },
      });
      await tx.historicoEtapa.create({
        data: { obraId: nova.id, etapa: "KYC_PENDENTE", usuarioId: user.id },
      });
      return nova;
    });

    return NextResponse.json(obra);
  } catch (error) {
    return jsonError(error);
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    requireRole(user, ["ADMIN", "FUNDO"]);

    const obras = await prisma.obra.findMany({
      orderBy: { criadoEm: "desc" },
      include: { cliente: { select: { nome: true, email: true } } },
    });
    return NextResponse.json(obras);
  } catch (error) {
    return jsonError(error);
  }
}
