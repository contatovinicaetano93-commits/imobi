import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConversionScoringService } from './conversion-scoring.service';

@Injectable()
export class ComercialService {
  constructor(
    private prisma: PrismaService,
    private scoringService: ConversionScoringService
  ) {}

  async listarStages() {
    const stages = await this.prisma.pipelineStage.findMany({
      orderBy: { ordem: 'asc' },
    });

    if (stages.length === 0) {
      const defaults = [
        { nome: 'PROSPECÇÃO', ordem: 1, corHex: '#6366f1' },
        { nome: 'QUALIFICAÇÃO', ordem: 2, corHex: '#f59e0b' },
        { nome: 'PROPOSTA', ordem: 3, corHex: '#3b82f6' },
        { nome: 'NEGOCIAÇÃO', ordem: 4, corHex: '#8b5cf6' },
        { nome: 'FECHAMENTO', ordem: 5, corHex: '#10b981' },
      ];

      const created = await Promise.all(
        defaults.map((d) =>
          this.prisma.pipelineStage.create({ data: d })
        )
      );

      return created.map((s) => ({
        stageId: s.stageId,
        nome: s.nome,
        ordem: s.ordem,
        cor: s.corHex,
      }));
    }

    return stages.map((s) => ({
      stageId: s.stageId,
      nome: s.nome,
      ordem: s.ordem,
      cor: s.corHex,
    }));
  }

  async criarLead(usuarioId: string, data: any) {
    const defaultStage = await this.prisma.pipelineStage.findFirst({
      orderBy: { ordem: 'asc' },
    });

    if (!defaultStage) {
      const seedStage = await this.prisma.pipelineStage.create({
        data: { nome: 'PROSPECÇÃO', ordem: 1, corHex: '#6366f1' },
      });

      const lead = await this.prisma.lead.create({
        data: {
          clienteNome: data.clienteNome,
          clienteEmail: data.clienteEmail,
          clienteTelefone: data.clienteTelefone,
          fonte: data.fonte,
          segmentoCliente: data.segmentoCliente,
          stageId: seedStage.stageId,
          usuarioId,
          atribuidoEm: new Date(),
        },
        include: {
          scoreHistorico: { take: 1, orderBy: { criadoEm: 'desc' } },
        },
      });

      const score = await this.scoringService.calcularScore(lead.leadId);
      return { ...lead, score };
    }

    const lead = await this.prisma.lead.create({
      data: {
        clienteNome: data.clienteNome,
        clienteEmail: data.clienteEmail,
        clienteTelefone: data.clienteTelefone,
        fonte: data.fonte,
        segmentoCliente: data.segmentoCliente,
        stageId: defaultStage.stageId,
        usuarioId,
        atribuidoEm: new Date(),
      },
      include: {
        scoreHistorico: { take: 1, orderBy: { criadoEm: 'desc' } },
      },
    });

    const score = await this.scoringService.calcularScore(lead.leadId);

    return { ...lead, score };
  }

  async listarLeads(limit = 20, offset = 0, filters?: any) {
    const where: any = {};

    if (filters?.stageId) where.stageId = filters.stageId;
    if (filters?.fonte) where.fonte = filters.fonte;
    if (filters?.segmentoCliente) where.segmentoCliente = filters.segmentoCliente;
    if (filters?.scoreMin !== undefined || filters?.scoreMax !== undefined) {
      const scoreFilter: any = {};
      if (filters.scoreMin !== undefined) scoreFilter.gte = filters.scoreMin;
      if (filters.scoreMax !== undefined) scoreFilter.lte = filters.scoreMax;
      where.scoreHistorico = { some: { scoreFinal: scoreFilter } };
    }
    if (filters?.searchTerm) {
      where.OR = [
        { clienteNome: { contains: filters.searchTerm, mode: 'insensitive' } },
        { clienteEmail: { contains: filters.searchTerm, mode: 'insensitive' } },
        { clienteTelefone: { contains: filters.searchTerm, mode: 'insensitive' } },
      ];
    }

    const [leads, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        take: limit,
        skip: offset,
        include: {
          stage: true,
          scoreHistorico: { take: 1, orderBy: { criadoEm: 'desc' } },
        },
        orderBy: { criadoEm: 'desc' },
      }),
      this.prisma.lead.count({ where }),
    ]);

    return {
      leads,
      total,
      page: Math.floor(offset / limit) + 1,
      pageSize: limit,
    };
  }

  async obterLeadDetalhe(leadId: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { leadId },
      include: {
        stage: true,
        atividades: { orderBy: { criadoEm: 'desc' } },
        scoreHistorico: { orderBy: { criadoEm: 'desc' } },
        obra: true,
        usuario: true,
      },
    });

    if (!lead) return null;

    return {
      ...lead,
      scoreBreakdown: lead.scoreHistorico[0] || null,
    };
  }

  async calcularScoreConversao(leadId: string) {
    return this.scoringService.calcularScore(leadId);
  }

  async adicionarAtividade(leadId: string, usuarioId: string, data: any) {
    const activity = await this.prisma.leadActivity.create({
      data: {
        leadId,
        usuarioId,
        tipo: data.tipo,
        descricao: data.descricao,
      },
    });

    const score = await this.scoringService.recalcularScoreAposAtividade(leadId);

    return { activity, updatedScore: score };
  }

  async obterDashboardStats() {
    const totalLeads = await this.prisma.lead.count();

    const dataHoje = new Date();
    dataHoje.setHours(0, 0, 0, 0);

    const leadsThisWeek = await this.prisma.lead.count({
      where: {
        criadoEm: {
          gte: new Date(dataHoje.getTime() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    });

    const allScores = await this.prisma.conversionScore.findMany({
      select: { scoreFinal: true },
    });

    const avgScore =
      allScores.length > 0
        ? Math.round(
            allScores.reduce((sum, s) => sum + s.scoreFinal, 0) /
              allScores.length
          )
        : 0;

    const highScoreLeads = await this.prisma.lead.count({
      where: {
        scoreHistorico: {
          some: { scoreFinal: { gte: 70 } },
        },
      },
    });

    const conversionRate =
      totalLeads > 0 ? Math.round((highScoreLeads / totalLeads) * 100) : 0;

    return {
      totalLeads,
      leadsThisWeek,
      avgScore,
      conversionRate,
    };
  }

  async obterOverview() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [leadsAtivos, totalLeads, convertidos, propostasMes, creditosAgg, creditosAno, creditosMes, creditosUltimoMes] =
      await Promise.all([
        this.prisma.lead.count({ where: { convertidoEm: null } }),
        this.prisma.lead.count(),
        this.prisma.lead.count({ where: { convertidoEm: { not: null } } }),
        this.prisma.lead.count({
          where: {
            criadoEm: { gte: startOfMonth },
            stage: { nome: { in: ['PROPOSTA', 'NEGOCIAÇÃO', 'FECHAMENTO'] } },
          },
        }),
        this.prisma.credito.aggregate({
          where: { status: 'ATIVO' },
          _sum: { valorAprovado: true },
          _count: { creditoId: true },
        }),
        this.prisma.credito.aggregate({
          where: { dataAprovacao: { gte: startOfYear } },
          _sum: { valorAprovado: true },
          _count: { creditoId: true },
        }),
        this.prisma.credito.aggregate({
          where: { dataAprovacao: { gte: startOfMonth } },
          _sum: { valorAprovado: true },
          _count: { creditoId: true },
        }),
        this.prisma.credito.aggregate({
          where: { dataAprovacao: { gte: startOfLastMonth, lte: endOfLastMonth } },
          _sum: { valorAprovado: true },
        }),
      ]);

    const taxaConversao = totalLeads > 0 ? Math.round((convertidos / totalLeads) * 100) : 0;
    const volumeCredito = creditosAgg._sum.valorAprovado ?? 0;
    const creditosAprovados = creditosAgg._count.creditoId;
    const ticketMedio = creditosAprovados > 0 ? volumeCredito / creditosAprovados : 0;

    const volumeAno = creditosAno._sum.valorAprovado ?? 0;
    const negociosAno = creditosAno._count.creditoId;

    const volumeMes = creditosMes._sum.valorAprovado ?? 0;
    const negociosFechados = creditosMes._count.creditoId;
    const volumeUltimoMes = creditosUltimoMes._sum.valorAprovado ?? 0;

    const TAXA_COMISSAO = 0.02;
    const comissaoAno = volumeAno * TAXA_COMISSAO;
    const comissaoMes = volumeMes * TAXA_COMISSAO;
    const variacaoComissao =
      volumeUltimoMes > 0 ? (volumeMes - volumeUltimoMes) / volumeUltimoMes : 0;

    return {
      leadsAtivos,
      propostasMes,
      taxaConversao,
      creditosAprovados,
      volumeCredito,
      ticketMedio,
      comissaoAno,
      negociosAno,
      volumeAno,
      mesAtual: { comissaoMes, negociosFechados, variacaoComissao },
    };
  }

  async listarPipeline(limit = 50) {
    const leads = await this.prisma.lead.findMany({
      where: { convertidoEm: null },
      take: limit,
      include: {
        stage: true,
        atividades: { take: 1, orderBy: { criadoEm: 'desc' } },
      },
      orderBy: { atualizadoEm: 'desc' },
    });

    return leads.map((lead) => ({
      leadId: lead.leadId,
      nomeCliente: lead.clienteNome,
      tipoProjeto: lead.tipoObra ?? 'Residencial',
      valorEstimado: 0,
      etapa: lead.stage?.nome ?? 'PROSPECÇÃO',
      proximaAcao: lead.atividades[0]?.descricao ?? null,
      atualizadoEm: lead.atualizadoEm.toISOString(),
    }));
  }
}
