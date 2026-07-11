import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RetryPolicyService } from "../../common/resilience";
import type { CriarTrancheInput, AnexarEvidenciaInput, ValidarTrancheInput } from "@imbobi/schemas";

type Requisitante = { id: string; role: string };

@Injectable()
export class TranchesService {
  /** Liberação de valor é a operação mais crítica do sistema — retry contra blips do Neon. */
  private readonly liberacaoRetry = new RetryPolicyService({
    name: "tranche-liberacao",
    maxAttempts: 3,
    initialDelayMs: 200,
    maxDelayMs: 2000,
    multiplier: 2,
  });

  constructor(private readonly prisma: PrismaService) {}

  criar(input: CriarTrancheInput) {
    return this.prisma.tranche.create({
      data: {
        numero: input.numero,
        valor: input.valor,
        obra: { connect: { id: input.obraId } },
      },
    });
  }

  /** ADMIN/FUNDO veem tranches de qualquer obra; CLIENTE/ENGENHEIRO só da própria/atribuída. */
  async listarPorObra(obraId: string, requisitante: Requisitante) {
    await this.assertAcessoObra(obraId, requisitante);
    return this.prisma.tranche.findMany({
      where: { obraId },
      include: { evidencias: true },
      orderBy: { numero: "asc" },
    });
  }

  async anexarEvidencia(trancheId: string, requisitante: Requisitante, input: AnexarEvidenciaInput) {
    const tranche = await this.prisma.tranche.findUnique({ where: { id: trancheId } });
    if (!tranche) throw new NotFoundException("Tranche não encontrada.");
    await this.assertAcessoObra(tranche.obraId, requisitante);

    return this.prisma.evidencia.create({
      data: {
        url: input.url,
        descricao: input.descricao,
        tranche: { connect: { id: trancheId } },
      },
    });
  }

  /** Engenheiro valida a fase da obra — só se for o engenheiro atribuído a ela. */
  async validar(id: string, engenheiroId: string, input: ValidarTrancheInput) {
    const tranche = await this.prisma.tranche.findUnique({ where: { id }, include: { obra: true } });
    if (!tranche) throw new NotFoundException("Tranche não encontrada.");
    if (tranche.obra.engenheiroId !== engenheiroId) {
      throw new ForbiddenException("Você não é o engenheiro responsável por esta obra.");
    }
    if (tranche.status !== "PENDENTE") {
      throw new ForbiddenException("Só é possível validar tranches pendentes.");
    }

    return this.prisma.tranche.update({
      where: { id },
      data: {
        status: input.aprovado ? "VALIDADA_ENGENHEIRO" : "REJEITADA",
        validadoPorId: engenheiroId,
        validadoEm: new Date(),
      },
    });
  }

  /** Admin libera o valor — só após validação do engenheiro. */
  async liberar(id: string, adminId: string) {
    const tranche = await this.prisma.tranche.findUnique({ where: { id } });
    if (!tranche) throw new NotFoundException("Tranche não encontrada.");
    if (tranche.status !== "VALIDADA_ENGENHEIRO") {
      throw new ForbiddenException("Só é possível liberar tranches validadas pelo engenheiro.");
    }

    return this.liberacaoRetry.execute(() =>
      this.prisma.tranche.update({
        where: { id },
        data: { status: "LIBERADA_ADMIN", liberadoPorId: adminId, liberadoEm: new Date() },
      }),
    );
  }

  private async assertAcessoObra(obraId: string, requisitante: Requisitante) {
    if (requisitante.role === "ADMIN" || requisitante.role === "FUNDO") return;

    const obra = await this.prisma.obra.findUnique({ where: { id: obraId } });
    if (!obra) throw new NotFoundException("Obra não encontrada.");

    const dono =
      (requisitante.role === "CLIENTE" && obra.clienteId === requisitante.id) ||
      (requisitante.role === "ENGENHEIRO" && obra.engenheiroId === requisitante.id);
    if (!dono) throw new ForbiddenException("Você não tem acesso a esta obra.");
  }
}
