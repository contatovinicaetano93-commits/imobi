import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { CriarObraInput, EtapaFunil } from "@imbobi/schemas";

/** Transições válidas do funil — única fonte de verdade. */
const PROXIMA_ETAPA: Record<EtapaFunil, EtapaFunil | null> = {
  KYC_PENDENTE: "DOSSIE_EM_ANALISE",
  DOSSIE_EM_ANALISE: "APROVADO",
  APROVADO: "OBRA_CADASTRADA",
  OBRA_CADASTRADA: "HOMOLOGADA",
  HOMOLOGADA: "EM_ANDAMENTO",
  EM_ANDAMENTO: "QUITADO",
  QUITADO: null,
};

type Requisitante = { id: string; role: string };

@Injectable()
export class ObrasService {
  constructor(private readonly prisma: PrismaService) {}

  criar(clienteId: string, input: CriarObraInput) {
    return this.prisma.$transaction(async (tx) => {
      const obra = await tx.obra.create({
        data: {
          nome: input.nome,
          endereco: input.endereco,
          valorCredito: input.valorCredito,
          etapa: "KYC_PENDENTE",
          cliente: { connect: { id: clienteId } },
        },
      });
      await tx.historicoEtapa.create({
        data: { obraId: obra.id, etapa: "KYC_PENDENTE", usuarioId: clienteId },
      });
      return obra;
    });
  }

  listarPorCliente(clienteId: string) {
    return this.prisma.obra.findMany({ where: { clienteId }, orderBy: { criadoEm: "desc" } });
  }

  listarPorEngenheiro(engenheiroId: string) {
    return this.prisma.obra.findMany({ where: { engenheiroId }, orderBy: { criadoEm: "desc" } });
  }

  listarTodas() {
    return this.prisma.obra.findMany({
      orderBy: { criadoEm: "desc" },
      include: { cliente: { select: { nome: true, email: true } } },
    });
  }

  /** ADMIN/FUNDO veem qualquer obra; CLIENTE só a própria; ENGENHEIRO só a atribuída. */
  async obter(id: string, requisitante: Requisitante) {
    const obra = await this.prisma.obra.findUnique({
      where: { id },
      include: {
        cliente: { select: { id: true, nome: true, email: true } },
        engenheiro: { select: { id: true, nome: true, email: true } },
        documentos: true,
        tranches: { include: { evidencias: true } },
      },
    });
    if (!obra) throw new NotFoundException("Obra não encontrada.");

    const dono =
      requisitante.role === "ADMIN" ||
      requisitante.role === "FUNDO" ||
      (requisitante.role === "CLIENTE" && obra.clienteId === requisitante.id) ||
      (requisitante.role === "ENGENHEIRO" && obra.engenheiroId === requisitante.id);
    if (!dono) throw new ForbiddenException("Você não tem acesso a esta obra.");

    return obra;
  }

  /** Avança a obra para a próxima etapa do funil (admin). */
  async avancar(id: string, usuarioId: string) {
    const obra = await this.prisma.obra.findUnique({ where: { id } });
    if (!obra) throw new NotFoundException("Obra não encontrada.");

    const proxima = PROXIMA_ETAPA[obra.etapa];
    if (!proxima) throw new ForbiddenException(`Etapa "${obra.etapa}" não avança automaticamente.`);

    return this.prisma.$transaction(async (tx) => {
      const atualizada = await tx.obra.update({ where: { id }, data: { etapa: proxima } });
      await tx.historicoEtapa.create({ data: { obraId: id, etapa: proxima, usuarioId } });
      return atualizada;
    });
  }

  /** Admin homologa: vincula engenheiro responsável e avança pra HOMOLOGADA. */
  async homologar(id: string, engenheiroId: string, usuarioId: string) {
    const obra = await this.prisma.obra.findUnique({ where: { id } });
    if (!obra) throw new NotFoundException("Obra não encontrada.");
    if (obra.etapa !== "OBRA_CADASTRADA") {
      throw new ForbiddenException("Só é possível homologar obras em OBRA_CADASTRADA.");
    }

    const engenheiro = await this.prisma.usuario.findUnique({ where: { id: engenheiroId } });
    if (!engenheiro || engenheiro.role !== "ENGENHEIRO") {
      throw new BadRequestException("engenheiroId não corresponde a um usuário com papel ENGENHEIRO.");
    }

    return this.prisma.$transaction(async (tx) => {
      const atualizada = await tx.obra.update({
        where: { id },
        data: { engenheiroId, etapa: "HOMOLOGADA" },
      });
      await tx.historicoEtapa.create({ data: { obraId: id, etapa: "HOMOLOGADA", usuarioId } });
      return atualizada;
    });
  }
}
