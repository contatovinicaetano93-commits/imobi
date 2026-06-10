import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class EngenheirosService {
  constructor(private readonly prisma: PrismaService) {}

  async listarVisitas(usuarioId: string) {
    // Visitas = etapas AGUARDANDO_VISTORIA ou recentemente concluídas, de obras do sistema
    // O engenheiro vê etapas que precisam de vistoria presencial
    const etapas = await this.prisma.etapaObra.findMany({
      where: {
        status: { in: ["AGUARDANDO_VISTORIA", "CONCLUIDA", "REPROVADA"] },
      },
      include: {
        obra: { select: { obraId: true, nome: true, endereco: true } },
        evidencias: { where: { validada: false }, select: { evidenciaId: true } },
      },
      orderBy: { atualizadoEm: "desc" },
      take: 50,
    });

    return etapas.map((e) => ({
      visitaId: e.etapaId,
      status:
        e.status === "AGUARDANDO_VISTORIA"
          ? "AGENDADA"
          : e.status === "CONCLUIDA"
          ? "CONCLUIDA"
          : "REPROVADA",
      etapaId: e.etapaId,
      etapaNome: e.nome,
      obraId: e.obra.obraId,
      obraNome: e.obra.nome,
      dataAgendada: e.atualizadoEm.toISOString(),
      observacoes: null,
      obra: { nome: e.obra.nome, endereco: e.obra.endereco },
      criadoEm: e.criadoEm.toISOString(),
    }));
  }

  async obterVisita(visitaId: string) {
    const etapa = await this.prisma.etapaObra.findUnique({
      where: { etapaId: visitaId },
      include: {
        obra: { select: { obraId: true, nome: true, endereco: true } },
        evidencias: {
          select: { evidenciaId: true, fotoUrl: true, validada: true, criadoEm: true },
        },
      },
    });
    const VISTORIA_STATUSES = ["AGUARDANDO_VISTORIA", "EM_EXECUCAO", "CONCLUIDA", "REPROVADA"];
    if (!etapa || !VISTORIA_STATUSES.includes(etapa.status)) throw new NotFoundException("Visita não encontrada.");
    return {
      visitaId: etapa.etapaId,
      status: etapa.status === "AGUARDANDO_VISTORIA" ? "AGENDADA" : etapa.status === "REPROVADA" ? "REPROVADA" : "CONCLUIDA",
      etapaId: etapa.etapaId,
      etapaNome: etapa.nome,
      obraId: etapa.obra.obraId,
      obraNome: etapa.obra.nome,
      dataAgendada: etapa.atualizadoEm.toISOString(),
      obra: { nome: etapa.obra.nome, endereco: etapa.obra.endereco },
      criadoEm: etapa.criadoEm.toISOString(),
      evidencias: etapa.evidencias,
    };
  }

  async atualizarVisita(
    _usuarioId: string,
    visitaId: string,
    data: { status?: string; dataAgendada?: string; observacoes?: string }
  ) {
    const statusMap: Record<string, { target: string; from: string[] }> = {
      INICIADA: { target: "EM_EXECUCAO", from: ["AGUARDANDO_VISTORIA"] },
      CONCLUIDA: { target: "CONCLUIDA",   from: ["EM_EXECUCAO"] },
    };

    if (data.status) {
      const transition = statusMap[data.status];
      if (!transition) throw new BadRequestException("Status inválido.");
      const result = await this.prisma.etapaObra.updateMany({
        where: { etapaId: visitaId, status: { in: transition.from as any[] } },
        data: { status: transition.target as any },
      });
      if (result.count === 0) throw new BadRequestException("Transição de status inválida ou visita não encontrada.");
    } else {
      const exists = await this.prisma.etapaObra.findUnique({ where: { etapaId: visitaId } });
      if (!exists) throw new NotFoundException("Visita não encontrada.");
    }

    return this.obterVisita(visitaId);
  }
}
