import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConversionScoringService } from './conversion-scoring.service';

@Injectable()
export class ComercialService {
  constructor(
    private prisma: PrismaService,
    private scoringService: ConversionScoringService
  ) {}

  async criarLead(data: any) {
    const defaultStage = await this.prisma.pipelineStage.findFirst({
      where: { nome: 'PROSPECÇÃO' },
    });

    if (!defaultStage) {
      throw new Error('Pipeline stage PROSPECÇÃO not found. Run seed first.');
    }

    const lead = await this.prisma.lead.create({
      data: {
        clienteNome: data.clienteNome,
        clienteEmail: data.clienteEmail,
        clienteTelefone: data.clienteTelefone,
        clienteCpf: data.clienteCpf,
        fonte: data.fonte,
        tipoObra: data.tipoObra,
        segmentoCliente: data.segmentoCliente,
        stageId: defaultStage.stageId,
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
}
