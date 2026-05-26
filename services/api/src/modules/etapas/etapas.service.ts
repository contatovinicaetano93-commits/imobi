import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bull";
import { Queue } from "bull";
import { PrismaService } from "../prisma/prisma.service";
import { QUEUE_LIBERACAO, type LiberacaoJob } from "../../../workers/liberacao-parcela.worker";

@Injectable()
export class EtapasService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_LIBERACAO) private readonly liberacaoQueue: Queue<LiberacaoJob>
  ) {}

  async aprovar(gestorId: string, etapaId: string, observacao?: string) {
    const etapa = await this.prisma.etapaObra.findUnique({
      where: { id: etapaId },
      include: { obra: { include: { credito: true } } },
    });
    if (!etapa) throw new NotFoundException("Etapa não encontrada.");
    if (etapa.status !== "AGUARDANDO_VISTORIA") {
      throw new BadRequestException("Etapa não está aguardando vistoria.");
    }

    // Exige ao menos 1 evidência validada
    const evidencias = await this.prisma.evidenciaEtapa.count({
      where: { etapaId, validada: true },
    });
    if (evidencias === 0) {
      throw new BadRequestException("Etapa precisa ter ao menos uma evidência validada.");
    }

    await this.prisma.etapaObra.update({
      where: { id: etapaId },
      data: { status: "APROVADA", dataConclusaoReal: new Date() },
    });

    // Dispara liberação de parcela via fila (assíncrono)
    const credito = etapa.obra.credito;
    if (credito && credito.status === "ATIVO") {
      const valorLiberacao = Number(credito.valorAprovado) * (Number(etapa.percentualObra) / 100);
      await this.prisma.liberacaoParcela.create({
        data: { creditoId: credito.id, etapaId, valor: valorLiberacao, status: "PROCESSANDO" },
      });
      await this.liberacaoQueue.add({ creditoId: credito.id, etapaId, valor: valorLiberacao });
    }

    return { ok: true, observacao };
  }

  async atualizarStatus(etapaId: string, status: string) {
    return this.prisma.etapaObra.update({
      where: { id: etapaId },
      data: { status: status as never },
    });
  }

  async listarPorObra(obraId: string) {
    return this.prisma.etapaObra.findMany({
      where: { obraId },
      orderBy: { ordem: "asc" },
      include: {
        evidencias: {
          select: { id: true, fotoUrl: true, validada: true, criadoEm: true },
          orderBy: { criadoEm: "desc" },
          take: 5,
        },
      },
    });
  }
}
