import { Injectable, NotFoundException } from '@nestjs/common';
import type { CreateLeadInput, AddLeadActivityInput } from '@imbobi/schemas';
import { PrismaService } from '../prisma/prisma.service';
import { ConversionScoringService } from './conversion-scoring.service';

const DEFAULT_STAGES = [
  { nome: 'PROSPECÇÃO', ordem: 1, corHex: '#6366f1' },
  { nome: 'QUALIFICAÇÃO', ordem: 2, corHex: '#f59e0b' },
  { nome: 'PROPOSTA', ordem: 3, corHex: '#3b82f6' },
  { nome: 'NEGOCIAÇÃO', ordem: 4, corHex: '#8b5cf6' },
  { nome: 'FECHAMENTO', ordem: 5, corHex: '#10b981' },
];

const MAX_PAGE_SIZE = 100;

@Injectable()
export class ComercialService {
  constructor(
    private prisma: PrismaService,
    private scoringService: ConversionScoringService
  ) {}

  async listarStages() {
    let stages = await this.prisma.pipelineStage.findMany({
      orderBy: { ordem: 'asc' },
    });

    if (stages.length === 0) {
      // skipDuplicates makes concurrent seeding idempotent (nome/ordem are unique)
      await this.prisma.pipelineStage.createMany({
        data: DEFAULT_STAGES,
        skipDuplicates: true,
      });
      stages = await this.prisma.pipelineStage.findMany({
        orderBy: { ordem: 'asc' },
      });
    }

    return stages.map((s) => ({
      stageId: s.stageId,
      nome: s.nome,
      ordem: s.ordem,
      cor: s.corHex,
    }));
  }

  private async resolverStageInicial() {
    const stage = await this.prisma.pipelineStage.findFirst({
      orderBy: { ordem: 'asc' },
    });
    if (stage) return stage;

    return this.prisma.pipelineStage.upsert({
      where: { nome: DEFAULT_STAGES[0].nome },
      update: {},
      create: DEFAULT_STAGES[0],
    });
  }

  async criarLead(usuarioId: string, data: CreateLeadInput) {
    const stageInicial = await this.resolverStageInicial();

    const lead = await this.prisma.lead.create({
      data: {
        clienteNome: data.clienteNome,
        clienteEmail: data.clienteEmail,
        clienteTelefone: data.clienteTelefone,
        clienteCpf: data.clienteCpf,
        fonte: data.fonte as any,
        tipoObra: data.tipoObra,
        segmentoCliente: data.segmentoCliente as any,
        stageId: stageInicial.stageId,
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
    const take = Math.min(
      Math.max(Number.isFinite(limit) ? Math.trunc(limit) : 20, 1),
      MAX_PAGE_SIZE
    );
    const skip = Math.max(Number.isFinite(offset) ? Math.trunc(offset) : 0, 0);

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
        take,
        skip,
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
      page: Math.floor(skip / take) + 1,
      pageSize: take,
    };
  }

  async obterLeadDetalhe(leadId: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { leadId },
      include: {
        stage: true,
        atividades: { orderBy: { criadoEm: 'desc' } },
        scoreHistorico: { orderBy: { criadoEm: 'desc' } },
        obra: { select: { obraId: true, nome: true } },
        usuario: { select: { usuarioId: true, nome: true, email: true } },
      },
    });

    if (!lead) {
      throw new NotFoundException('Lead não encontrado.');
    }

    return {
      ...lead,
      scoreBreakdown: lead.scoreHistorico[0] || null,
    };
  }

  async calcularScoreConversao(leadId: string) {
    return this.scoringService.calcularScore(leadId);
  }

  async adicionarAtividade(leadId: string, usuarioId: string, data: AddLeadActivityInput) {
    const lead = await this.prisma.lead.findUnique({
      where: { leadId },
      select: { leadId: true },
    });
    if (!lead) {
      throw new NotFoundException('Lead não encontrado.');
    }

    const activity = await this.prisma.leadActivity.create({
      data: {
        leadId,
        usuarioId,
        tipo: data.tipo as any,
        descricao: data.descricao,
      },
    });

    const score = await this.scoringService.recalcularScoreAposAtividade(leadId);

    return { activity, updatedScore: score };
  }

  async obterDashboardStats() {
    const dataHoje = new Date();
    dataHoje.setHours(0, 0, 0, 0);

    const [totalLeads, leadsThisWeek, scoreAgg, highScoreLeads] =
      await Promise.all([
        this.prisma.lead.count(),
        this.prisma.lead.count({
          where: {
            criadoEm: {
              gte: new Date(dataHoje.getTime() - 7 * 24 * 60 * 60 * 1000),
            },
          },
        }),
        this.prisma.conversionScore.aggregate({ _avg: { scoreFinal: true } }),
        this.prisma.lead.count({
          where: {
            scoreHistorico: {
              some: { scoreFinal: { gte: 70 } },
            },
          },
        }),
      ]);

    const avgScore = Math.round(scoreAgg._avg.scoreFinal ?? 0);

    const conversionRate =
      totalLeads > 0 ? Math.round((highScoreLeads / totalLeads) * 100) : 0;

    return {
      totalLeads,
      leadsThisWeek,
      avgScore,
      conversionRate,
    };
  }
}
