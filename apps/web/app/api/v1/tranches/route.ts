import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@imbobi/db";
import { CriarTrancheSchema } from "@imbobi/schemas";
import { requireAuth, requireRole } from "@/lib/server/auth";
import { jsonError } from "@/lib/server/errors";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    requireRole(user, ["ADMIN"]);
    const body = CriarTrancheSchema.parse(await req.json());

    const tranche = await prisma.tranche.create({
      data: { numero: body.numero, valor: body.valor, obra: { connect: { id: body.obraId } } },
    });
    return NextResponse.json(tranche);
  } catch (error) {
    return jsonError(error);
  }
}
