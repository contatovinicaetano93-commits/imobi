import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { Prisma, LeadFonte, LeadSegmento } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ConversionScoringService } from './conversion-scoring.service';
import type { ApiCreateLeadInput, ApiAddLeadActivityInput } from '@imbobi/schemas';

const ADMIN_ROLES = new Set(['ADMIN', 'GESTOR', 'GESTOR_FUNDO']);

interface LeadFilters {
  stageId?: string;
  fonte?: string;
  segmentoCliente?: string;
  scoreMin?: number;
  scoreMax?: number;
  searchTerm?: string;
}

@Injectable()
export class ComercialService {
  private readonly logger = new Logger(ComercialService.name);

  constructor(
    private prisma: PrismaService,
    private scoringService: ConversionScoringService
  ) {}

  async listarStages() {
    const stages = await this.prisma.pipelineStage.findMany({
      orderBy: { ordem: 'asc' },
      take: 20,
    });

    if (stages.length === 0) {
      const defaults = [
        { nome: 'PROSPECÇÃO', ordem: 1, corHex: '#6366f1' },
        { nome: 'QUALIFICAÇÃO', ordem: 2, corHex: '#f59e0b' },
        { nome: 'PROPOSTA', ordem: 3, corHex: '#3b82f6' },
        { nome: 'NEGOCIAÇÃO', ordem: 4, corHex: '#8b5cf6' },
        { nome: 'FECHAMENTO', ordem: 5, corHex: '#10b981' },
      ];

      const created = await this.prisma.$transaction(
        defaults.map((d) => this.prisma.pipelineStage.create({ data: d }))
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

  async capturaPublica(data: {
    clienteNome: string;
    clienteEmail: string;
    clienteTelefone: string;
    empresa?: string;
    cargo?: string;
    modalidade?: string;
    volume?: string;
    observacoes?: string;
  }) {
    const extras = [
      data.empresa    && `Empresa: ${data.empresa}`,
      data.cargo      && `Cargo: ${data.cargo}`,
      data.volume     && `Volume: ${data.volume}`,
      data.observacoes && `Obs: ${data.observacoes}`,
    ].filter(Boolean).join('\n') || null;

    return this.prisma.$transaction(async (tx) => {
      const stage = await tx.pipelineStage.findFirst({
        orderBy: { ordem: 'asc' },
      }) ?? await tx.pipelineStage.create({
        data: { nome: 'PROSPECÇÃO', ordem: 1, corHex: '#6366f1' },
      });

      return tx.lead.create({
        data: {
          clienteNome:     data.clienteNome,
          clienteEmail:    data.clienteEmail,
          clienteTelefone: data.clienteTelefone,
          stageId:         stage.stageId,
          fonte:           'WEBSITE',
          tipoObra:        data.modalidade ?? null,
          segmentoCliente: 'NOVO',
          condicoes:       extras,
        },
        select: { leadId: true },
      });
    });
  }

  async criarLead(usuarioId: string, data: ApiCreateLeadInput) {
    const { lead, score } = await this.prisma.$transaction(async (tx) => {
      let stageId: string;
      const defaultStage = await tx.pipelineStage.findFirst({ orderBy: { ordem: 'asc' } });
      if (defaultStage) {
        stageId = defaultStage.stageId;
      } else {
        const seeded = await tx.pipelineStage.create({
          data: { nome: 'PROSPECÇÃO', ordem: 1, corHex: '#6366f1' },
        });
        stageId = seeded.stageId;
      }

      const lead = await tx.lead.create({
        data: {
          clienteNome: data.clienteNome,
          clienteEmail: data.clienteEmail,
          clienteTelefone: data.clienteTelefone,
          clienteCpf: data.clienteCpf ?? null,
          fonte: data.fonte ?? 'WEBSITE',
          tipoObra: data.tipoObra ?? null,
          segmentoCliente: data.segmentoCliente ?? 'NOVO',
          stageId,
          usuarioId,
          atribuidoEm: new Date(),
        },
        include: { scoreHistorico: { take: 1, orderBy: { criadoEm: 'desc' } } },
      });

      const score = await this.scoringService.calcularScore(lead.leadId);
      return { lead, score };
    });

    return { ...lead, score };
  }

  async listarLeads(limit = 20, offset = 0, filters?: LeadFilters) {
    const where: Prisma.LeadWhereInput = {};

    if (filters?.stageId) where.stageId = filters.stageId;
    if (filters?.fonte) where.fonte = filters.fonte as LeadFonte;
    if (filters?.segmentoCliente) where.segmentoCliente = filters.segmentoCliente as LeadSegmento;
    if (filters?.scoreMin !== undefined || filters?.scoreMax !== undefined) {
      const minScore: number = filters.scoreMin ?? 0;
      const maxScore: number = filters.scoreMax ?? 100;
      const inRange = await this.prisma.$queryRaw<{ leadId: string }[]>`
        SELECT DISTINCT ON (cs."leadId") cs."leadId"
        FROM "ConversionScore" cs
        WHERE cs."scoreFinal" >= ${minScore}
          AND cs."scoreFinal" <= ${maxScore}
        ORDER BY cs."leadId", cs."criadoEm" DESC
      `;
      where.leadId = { in: inRange.map((r) => r.leadId) };
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

  async obterLeadDetalhe(leadId: string, usuarioId: string, userTipo: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { leadId },
      include: {
        stage: true,
        atividades: { orderBy: { criadoEm: 'desc' }, take: 20 },
        scoreHistorico: { orderBy: { criadoEm: 'desc' }, take: 1 },
        obra: { select: { obraId: true, nome: true, status: true } },
        usuario: { select: { usuarioId: true, nome: true, email: true } },
      },
    });

    if (!lead) throw new NotFoundException("Lead não encontrado.");
    if (!ADMIN_ROLES.has(userTipo) && lead.usuarioId !== usuarioId) {
      throw new ForbiddenException("Acesso negado.");
    }

    return { ...lead, scoreBreakdown: lead.scoreHistorico[0] || null };
  }

  async calcularScoreConversao(leadId: string, usuarioId: string, userTipo: string) {
    if (!ADMIN_ROLES.has(userTipo)) {
      const lead = await this.prisma.lead.findUnique({ where: { leadId }, select: { usuarioId: true } });
      if (!lead) throw new NotFoundException("Lead não encontrado.");
      if (lead.usuarioId !== usuarioId) throw new ForbiddenException("Acesso negado.");
    }
    return this.scoringService.calcularScore(leadId);
  }

  async adicionarAtividade(leadId: string, usuarioId: string, data: ApiAddLeadActivityInput) {
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

    const diasSemana = Number(process.env["COMERCIAL_LEADS_SEMANA_DIAS"] ?? "7");
    const leadsThisWeek = await this.prisma.lead.count({
      where: {
        criadoEm: {
          gte: new Date(dataHoje.getTime() - diasSemana * 24 * 60 * 60 * 1000),
        },
      },
    });

    const { _avg } = await this.prisma.conversionScore.aggregate({ _avg: { scoreFinal: true } });
    const avgScore = Math.round(_avg.scoreFinal ?? 0);

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
