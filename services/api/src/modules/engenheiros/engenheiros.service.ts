import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { EtapasService } from "../etapas/etapas.service";
import type { EtapaObra, EtapaStatus, EvidenciaEtapa, Obra } from "@prisma/client";

export interface ObraFinanceiro {
  obraId: string;
  nome: string;
  valorTotal: number;
  valorMaterial: number;
  valorMaoDeObra: number;
  valorExecutado: number;
  progresso: number;
  etapaAtual: string;
}

@Injectable()
export class EngenheirosService {
  private static readonly VISITA_ETAPA_STATUSES: EtapaStatus[] = [
    "AGUARDANDO_VISTORIA",
    "EM_EXECUCAO",
    "CONCLUIDA",
    "REPROVADA",
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly etapas: EtapasService,
  ) {}

  async listarVisitas(_usuarioId: string) {
    // Visitas = etapas AGUARDANDO_VISTORIA ou recentemente concluídas, de obras do sistema
    // O engenheiro vê etapas que precisam de vistoria presencial
    const etapas = await this.prisma.etapaObra.findMany({
      where: {
        status: { in: EngenheirosService.VISITA_ETAPA_STATUSES },
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
      status: this.mapEtapaStatus(e.status),
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

  private mapEtapaStatus(status: EtapaStatus): string {
    if (status === "AGUARDANDO_VISTORIA") return "AGENDADA";
    if (status === "EM_EXECUCAO") return "INICIADA";
    if (status === "REPROVADA") return "REPROVADA";
    if (status === "CONCLUIDA") return "CONCLUIDA";
    return status;
  }

  private formatVisita(
    etapa: EtapaObra & {
      obra: Pick<Obra, "obraId" | "nome" | "endereco">;
      evidencias: Pick<EvidenciaEtapa, "evidenciaId" | "fotoUrl" | "validada" | "criadoEm">[];
    },
  ) {
    return {
      visitaId: etapa.etapaId,
      status: this.mapEtapaStatus(etapa.status),
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

  private async assertAcessoVisita(visitaId: string, usuarioId: string, tipo: string) {
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

    if (tipo === "ADMIN") {
      return etapa;
    }

    const visitas = await this.listarVisitas(usuarioId);
    if (!visitas.some((v) => v.visitaId === visitaId)) {
      throw new ForbiddenException("Acesso negado.");
    }

    return etapa;
  }

  async obterVisita(visitaId: string, usuarioId: string, tipo: string) {
    const etapa = await this.assertAcessoVisita(visitaId, usuarioId, tipo);
    return this.formatVisita(etapa);
  }

  async atualizarVisita(
    usuarioId: string,
    tipo: string,
    visitaId: string,
    data: { status?: string; dataAgendada?: string; observacoes?: string }
  ) {
    await this.assertAcessoVisita(visitaId, usuarioId, tipo);

    const statusMap: Record<string, string> = {
      INICIADA: "EM_EXECUCAO",
    };

    const newStatus = data.status ? statusMap[data.status] : undefined;

    if (newStatus) {
      await this.prisma.etapaObra.update({
        where: { etapaId: visitaId },
        data: { status: newStatus as EtapaStatus },
      });
    }

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

    return this.formatVisita(etapa);
  }

  async aprovarVistoria(engenheiroId: string, visitaId: string, observacao?: string) {
    return this.etapas.aprovar(engenheiroId, visitaId, observacao);
  }

  async rejeitarVistoria(engenheiroId: string, visitaId: string, motivo: string) {
    return this.etapas.rejeitar(engenheiroId, visitaId, motivo);
  }

  async financeiro(_usuarioId: string): Promise<ObraFinanceiro[]> {
    // Obras que possuem etapas em vistoria ou execução (proxy para obras com visitas do engenheiro)
    const obras = await this.prisma.obra.findMany({
      where: {
        etapas: {
          some: {
            status: { in: ["AGUARDANDO_VISTORIA", "EM_EXECUCAO", "CONCLUIDA"] },
          },
        },
      },
      include: {
        etapas: {
          select: {
            nome: true,
            valorLiberacao: true,
            status: true,
          },
        },
      },
      take: 50,
    });

    return obras.map((obra) => {
      const valorTotal = obra.etapas.reduce((sum, e) => sum + e.valorLiberacao, 0);
      const valorExecutado = obra.etapas
        .filter((e) => e.status === "CONCLUIDA")
        .reduce((sum, e) => sum + e.valorLiberacao, 0);

      const progresso = valorTotal > 0
        ? Math.round((valorExecutado / valorTotal) * 100)
        : 0;

      const etapaAtual =
        obra.etapas.find(
          (e) => e.status === "AGUARDANDO_VISTORIA" || e.status === "EM_EXECUCAO"
        )?.nome ?? "";

      return {
        obraId: obra.obraId,
        nome: obra.nome,
        valorTotal,
        valorMaterial: Math.round(valorTotal * 0.56 * 100) / 100,
        valorMaoDeObra: Math.round(valorTotal * 0.44 * 100) / 100,
        valorExecutado,
        progresso,
        etapaAtual,
      };
    });
  }

  async etapasDaObra(obraId: string) {
    const etapas = await this.prisma.etapaObra.findMany({
      where: { obraId },
      orderBy: { ordem: "asc" },
      include: {
        evidencias: {
          select: { evidenciaId: true, fotoUrl: true, validada: true, criadoEm: true },
          orderBy: { criadoEm: "desc" as const },
          take: 10,
        },
      },
    });
    return etapas.map((e) => ({
      etapaId: e.etapaId,
      nome: e.nome,
      ordem: e.ordem,
      status: e.status,
      percentualObra: e.percentualObra,
      valorLiberacao: e.valorLiberacao,
      dataConclusaoPrevista: e.dataConclusaoPrevista,
      dataConclusaoReal: e.dataConclusaoReal,
      evidencias: e.evidencias,
    }));
  }

  async licencas(): Promise<unknown[]> {
    // Tabela Licenca não existe no schema atual — retorna array vazio com segurança
    return (this.prisma as any).licenca
      ? (this.prisma as any).licenca
          .findMany({ orderBy: { criadoEm: "desc" } })
          .catch(() => [])
      : Promise.resolve([]);
  }
}
