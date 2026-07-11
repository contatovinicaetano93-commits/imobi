import { NextRequest, NextResponse } from "next/server";
import * as bcrypt from "bcryptjs";
import { prisma } from "@imbobi/db";
import { CriarUsuarioAdminSchema, RoleEnum } from "@imbobi/schemas";
import { requireAuth, requireRole } from "@/lib/server/auth";
import { ApiError, jsonError } from "@/lib/server/errors";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    requireRole(user, ["ADMIN"]);

    const body = CriarUsuarioAdminSchema.parse(await req.json());
    const existe = await prisma.usuario.findUnique({ where: { email: body.email } });
    if (existe) throw new ApiError(409, "E-mail já cadastrado.");

    const senhaHash = await bcrypt.hash(body.senha, 12);
    const usuario = await prisma.usuario.create({
      data: { nome: body.nome, email: body.email, senhaHash, role: body.role },
      select: { id: true, nome: true, email: true, role: true, ativo: true, criadoEm: true },
    });
    return NextResponse.json(usuario);
  } catch (error) {
    return jsonError(error);
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    requireRole(user, ["ADMIN"]);

    const roleParam = req.nextUrl.searchParams.get("role");
    const role = roleParam ? RoleEnum.parse(roleParam) : undefined;

    const usuarios = await prisma.usuario.findMany({
      where: role ? { role } : undefined,
      select: { id: true, nome: true, email: true, role: true, ativo: true, criadoEm: true },
      orderBy: { criadoEm: "desc" },
    });
    return NextResponse.json(usuarios);
  } catch (error) {
    return jsonError(error);
  }
}
