import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ConversionScoringService } from "./conversion-scoring.service";

@Injectable()
export class ComercialService {
  constructor(
    private prisma: PrismaService,
    private scoringService: ConversionScoringService
  ) {}

  async criarLead(data: any) {
    const lead = await this.prisma.lead.create({
      data: {
        clienteNome: data.clienteNome,
        clienteEmail: data.clienteEmail,
        clienteTelefone: data.clienteTelefone,
        clienteCpf: data.clienteCpf,
        fonte: data.fonte,
        tipoObra: data.tipoObra,
        segmentoCliente: data.segmentoCliente,
        stage: "PROSPECÇÃO",
      },
      include: {
        scoreHistorico: { take: 1, orderBy: { criadoEm: "desc" } },
      },
    });

    // Calculate initial conversion score
    const score = await this.scoringService.calcularScore(lead.leadId);

    return { ...lead, score };
  }

  async listarLeads(limit = 20, offset = 0, filters?: any) {
    const where: any = {};

    if (filters?.stage) where.stage = filters.stage;
    if (filters?.fonte) where.fonte = filters.fonte;
    if (filters?.segmentoCliente) where.segmentoCliente = filters.segmentoCliente;
    if (filters?.scoreMin || filters?.scoreMax) {
      where.scoreHistorico = {};
      if (filters?.scoreMin)
        where.scoreHistorico.some = { scoreFinal: { gte: filters.scoreMin } };
      if (filters?.scoreMax)
        where.scoreHistorico.some = { scoreFinal: { lte: filters.scoreMax } };
    }
    if (filters?.searchTerm) {
      where.OR = [
        { clienteNome: { contains: filters.searchTerm, mode: "insensitive" } },
        { clienteEmail: { contains: filters.searchTerm, mode: "insensitive" } },
        { clienteTelefone: { contains: filters.searchTerm, mode: "insensitive" } },
      ];
    }

    const [leads, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        take: limit,
        skip: offset,
        include: {
          scoreHistorico: { take: 1, orderBy: { criadoEm: "desc" } },
        },
        orderBy: { criadoEm: "desc" },
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
        atividades: { orderBy: { criadoEm: "desc" } },
        scoreHistorico: { orderBy: { criadoEm: "desc" } },
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
    const activity = await this.prisma.leadAtividade.create({
      data: {
        leadId,
        usuarioId,
        tipo: data.tipo,
        descricao: data.descricao,
      },
    });

    // Recalculate score after activity added
    const score = await this.scoringService.recalcularScoreAposAtividade(leadId);

    return { activity, updatedScore: score };
  }
}
