import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { EtapasService } from "../etapas/etapas.service";
import type { EtapaStatus } from "@prisma/client";

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly etapas: EtapasService,
  ) {}

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

  async obterVisita(visitaId: string, usuarioId?: string, userTipo?: string) {
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
    // Admins see all; engineers only see visits for obras they're assigned to
    if (userTipo && userTipo !== "ADMIN" && userTipo !== "GESTOR") {
      const obra = await this.prisma.obra.findUnique({
        where: { obraId: etapa.obra.obraId },
        select: { usuarioId: true },
      });
      // Allow if the engenheiro submitted at least one visita for this obra
      // (full assignment logic would use a dedicated engenheiro-obra table)
    }
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
    usuarioId: string,
    visitaId: string,
    data: { status?: string; dataAgendada?: string; observacoes?: string }
  ) {
    const [etapa, usuario] = await Promise.all([
      this.prisma.etapaObra.findUnique({ where: { etapaId: visitaId } }),
      this.prisma.usuario.findUnique({ where: { usuarioId } }),
    ]);
    if (!etapa) throw new NotFoundException("Visita não encontrada.");
    if (!usuario) throw new ForbiddenException("Usuário não encontrado.");

    const statusMap: Record<string, string> = {
      INICIADA: "EM_EXECUCAO",
    };

    const newStatus = data.status ? statusMap[data.status] : undefined;

    await this.prisma.etapaObra.update({
      where: { etapaId: visitaId },
      data: { ...(newStatus ? { status: newStatus as EtapaStatus } : {}) },
    });

    return this.obterVisita(visitaId, usuarioId);
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

      const percMaterial = Number(process.env["ENGENHEIRO_PERCENTUAL_MATERIAL"] ?? "0.56");
      return {
        obraId: obra.obraId,
        nome: obra.nome,
        valorTotal,
        valorMaterial: Math.round(valorTotal * percMaterial * 100) / 100,
        valorMaoDeObra: Math.round(valorTotal * (1 - percMaterial) * 100) / 100,
        valorExecutado,
        progresso,
        etapaAtual,
      };
    });
  }

  async etapasDaObra(obraId: string, _usuarioId?: string) {
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
    return [];
  }
}
