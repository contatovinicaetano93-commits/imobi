import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@imbobi/db";
import type { EtapaFunil, JornadaResponse, Role } from "@imbobi/schemas";
import { requireAuth } from "@/lib/server/auth";
import { ApiError, jsonError } from "@/lib/server/errors";

const TITULOS: Record<EtapaFunil, { titulo: string; descricao: string; href: string }> = {
  KYC_PENDENTE: { titulo: "Envie seus documentos", descricao: "KYC pendente de envio.", href: "/dashboard/cliente/documentos" },
  DOSSIE_EM_ANALISE: { titulo: "Dossiê em análise", descricao: "Admin está revisando seus documentos.", href: "/dashboard/cliente" },
  APROVADO: { titulo: "Cadastre sua obra", descricao: "Dossiê aprovado — informe os dados da obra.", href: "/dashboard/cliente/obra/nova" },
  OBRA_CADASTRADA: { titulo: "Aguardando homologação", descricao: "Admin vai vincular um engenheiro.", href: "/dashboard/cliente" },
  HOMOLOGADA: { titulo: "Obra homologada", descricao: "Engenheiro vinculado — aguardando início.", href: "/dashboard/cliente/obra" },
  EM_ANDAMENTO: { titulo: "Acompanhe as tranches", descricao: "Engenheiro valida cada fase, admin libera o valor.", href: "/dashboard/cliente/obra" },
  QUITADO: { titulo: "Obra quitada", descricao: "Crédito totalmente liberado e quitado.", href: "/dashboard/cliente/obra" },
};

const ORDEM: EtapaFunil[] = [
  "KYC_PENDENTE", "DOSSIE_EM_ANALISE", "APROVADO", "OBRA_CADASTRADA", "HOMOLOGADA", "EM_ANDAMENTO", "QUITADO",
];

function montarResposta(role: Role, etapa: EtapaFunil): JornadaResponse {
  const { titulo, descricao, href } = TITULOS[etapa];
  const indice = ORDEM.indexOf(etapa);
  return {
    role,
    etapaAtual: etapa,
    titulo,
    descricao,
    href,
    concluido: etapa === "QUITADO",
    progressoPct: Math.round(((indice + 1) / ORDEM.length) * 100),
  };
}

/** Cliente pode ter várias obras — a mais urgente (mais antiga ainda não quitada) dita a jornada. */
async function paraCliente(usuarioId: string): Promise<JornadaResponse> {
  const pendente = await prisma.obra.findFirst({
    where: { clienteId: usuarioId, etapa: { not: "QUITADO" } },
    orderBy: { criadoEm: "asc" },
  });
  const obra = pendente ?? (await prisma.obra.findFirst({ where: { clienteId: usuarioId }, orderBy: { criadoEm: "desc" } }));
  return montarResposta("CLIENTE", obra?.etapa ?? "KYC_PENDENTE");
}

async function paraEngenheiro(usuarioId: string): Promise<JornadaResponse> {
  const pendentes = await prisma.tranche.count({ where: { status: "PENDENTE", obra: { engenheiroId: usuarioId } } });
  return {
    role: "ENGENHEIRO",
    titulo: pendentes > 0 ? `${pendentes} tranche(s) aguardando validação` : "Nenhuma pendência",
    descricao: "Valide fases da obra para liberar as tranches.",
    href: "/dashboard/engenheiro/vistoria",
    concluido: pendentes === 0,
    progressoPct: pendentes === 0 ? 100 : 0,
  };
}

async function paraAdmin(): Promise<JornadaResponse> {
  const pendencias = await prisma.obra.count({ where: { etapa: { in: ["KYC_PENDENTE", "DOSSIE_EM_ANALISE", "OBRA_CADASTRADA"] } } });
  return {
    role: "ADMIN",
    titulo: pendencias > 0 ? `${pendencias} obra(s) aguardando ação` : "Fila operacional limpa",
    descricao: "Centro de comando — filas de KYC, homologação e liberação.",
    href: "/dashboard/admin",
    concluido: pendencias === 0,
    progressoPct: pendencias === 0 ? 100 : 0,
  };
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    switch (user.role) {
      case "CLIENTE":
        return NextResponse.json(await paraCliente(user.id));
      case "ENGENHEIRO":
        return NextResponse.json(await paraEngenheiro(user.id));
      case "ADMIN":
        return NextResponse.json(await paraAdmin());
      default:
        throw new ApiError(403, "Papel sem jornada guiada.");
    }
  } catch (error) {
    return jsonError(error);
  }
}
