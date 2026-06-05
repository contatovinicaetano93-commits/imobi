import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
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
          : "CONCLUIDA",
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
    if (!etapa) throw new NotFoundException("Visita não encontrada.");
    return {
      visitaId: etapa.etapaId,
      status: etapa.status === "AGUARDANDO_VISTORIA" ? "AGENDADA" : "CONCLUIDA",
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
    usuarioId: string,
    visitaId: string,
    data: { status?: string; dataAgendada?: string; observacoes?: string }
  ) {
    const etapa = await this.prisma.etapaObra.findUnique({
      where: { etapaId: visitaId },
    });
    if (!etapa) throw new NotFoundException("Visita não encontrada.");

    const usuario = await this.prisma.usuario.findUnique({ where: { usuarioId } });
    if (!usuario || (usuario.tipo !== "GESTOR_OBRA" && usuario.tipo !== "ADMIN")) {
      throw new ForbiddenException("Apenas gestores podem atualizar visitas.");
    }

    // Traduz status da visita de volta para status de etapa
    const statusMap: Record<string, string> = {
      INICIADA: "EM_EXECUCAO",
      CONCLUIDA: "AGUARDANDO_VISTORIA",
    };

    const newStatus = data.status ? statusMap[data.status] : undefined;

    await this.prisma.etapaObra.update({
      where: { etapaId: visitaId },
      data: { ...(newStatus ? { status: newStatus as any } : {}) },
    });

    return this.obterVisita(visitaId);
  }
}
