import { prisma } from "@imbobi/db";
import type { AuthUser } from "./auth";
import { ApiError } from "./errors";

/** ADMIN/FUNDO acessam qualquer obra; CLIENTE só a própria; ENGENHEIRO só a atribuída. */
export async function assertAcessoObra(obraId: string, user: AuthUser) {
  if (user.role === "ADMIN" || user.role === "FUNDO") return;

  const obra = await prisma.obra.findUnique({ where: { id: obraId } });
  if (!obra) throw new ApiError(404, "Obra não encontrada.");

  const dono =
    (user.role === "CLIENTE" && obra.clienteId === user.id) ||
    (user.role === "ENGENHEIRO" && obra.engenheiroId === user.id);
  if (!dono) throw new ApiError(403, "Você não tem acesso a esta obra.");
}
