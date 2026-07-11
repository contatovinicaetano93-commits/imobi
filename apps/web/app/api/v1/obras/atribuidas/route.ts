import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@imbobi/db";
import { requireAuth, requireRole } from "@/lib/server/auth";
import { jsonError } from "@/lib/server/errors";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    requireRole(user, ["ENGENHEIRO"]);
    const obras = await prisma.obra.findMany({ where: { engenheiroId: user.id }, orderBy: { criadoEm: "desc" } });
    return NextResponse.json(obras);
  } catch (error) {
    return jsonError(error);
  }
}
