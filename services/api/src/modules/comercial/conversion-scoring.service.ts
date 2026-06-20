import { Injectable, NotFoundException } from '@nestjs/common';
import type { LeadActivity } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ConversionScoringService {
  constructor(private prisma: PrismaService) {}

  private calcularFonteScore(fonte: string): number {
    const fontes: Record<string, number> = {
      PARCEIRO: 90,
      INDICACAO: 85,
      WEBSITE: 80,
      OFFLINE: 70,
    };

    return Math.min(100, Math.max(0, fontes[fonte] || 60));
  }

  private calcularTipoObraScore(tipoObra?: string): number {
    if (!tipoObra) return 70;

    const tipos: Record<string, number> = {
      residencial: 85,
      comercial: 80,
      industrial: 75,
      reforma: 65,
    };

    const normalizedTipo = tipoObra.toLowerCase();
    return Math.min(100, Math.max(0, tipos[normalizedTipo] || 70));
  }

  private calcularSegmentoScore(segmento: string): number {
    const segmentos: Record<string, number> = {
      RETORNO: 85,
      NOVO: 70,
      CONCORRENTE: 65,
    };

    return Math.min(100, Math.max(0, segmentos[segmento] || 70));
  }

  private calcularEngajamentoScore(
    atividades: LeadActivity[],
    ultimaAtividade?: Date
  ): number {
    const count = atividades?.length || 0;

    let baseScore = 20;
    if (count >= 1) baseScore = 40;
    if (count >= 2) baseScore = 60;
    if (count >= 3 && count <= 5) baseScore = 80;
    if (count > 5) baseScore = 95;

    if (ultimaAtividade) {
      const diasSemAtividade = this.calcularDiasSemAtividade(ultimaAtividade);

      if (diasSemAtividade >= 30) {
        baseScore *= 0.4;
      } else if (diasSemAtividade >= 14) {
        baseScore *= 0.65;
      } else if (diasSemAtividade >= 7) {
        baseScore *= 0.7;
      }
    }

    return Math.min(100, Math.max(0, baseScore));
  }

  private calcularHistoricoScore(ultimoScore?: number): number {
    if (ultimoScore === undefined || ultimoScore === null) return 50;

    return Math.min(100, 50 + (ultimoScore * 0.5));
  }

  private calcularScoreFinal(fatores: {
    fonteScore: number;
    tipoObraScore: number;
    segmentoScore: number;
    engajamentoScore: number;
    historicoScore: number;
  }): number {
    const weighted =
      fatores.fonteScore * 0.25 +
      fatores.engajamentoScore * 0.25 +
      fatores.segmentoScore * 0.2 +
      fatores.tipoObraScore * 0.2 +
      fatores.historicoScore * 0.1;

    return Math.round(weighted);
  }

  private calcularProbabilidade(score: number): number {
    const normalized = score / 100;
    const sigmoid = 1 / (1 + Math.exp(-5 * (normalized * 2 - 1)));

    return Math.min(0.95, sigmoid);
  }

  private estimarDataClosing(probabilidade: number): Date {
    const dataEstimada = new Date();

    if (probabilidade > 0.8) {
      dataEstimada.setDate(dataEstimada.getDate() + 15);
    } else if (probabilidade > 0.6) {
      dataEstimada.setDate(dataEstimada.getDate() + 20);
    } else if (probabilidade > 0.4) {
      dataEstimada.setDate(dataEstimada.getDate() + 30);
    } else if (probabilidade > 0.2) {
      dataEstimada.setDate(dataEstimada.getDate() + 60);
    } else {
      dataEstimada.setDate(dataEstimada.getDate() + 90);
    }

    return dataEstimada;
  }

  private calcularDiasSemAtividade(ultimaAtividade: Date): number {
    const agora = new Date();
    const diffMs = agora.getTime() - ultimaAtividade.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  async calcularScore(leadId: string): Promise<{
    scoreFinal: number;
    probabilidade: number;
    dataEstimada: Date;
    fatores: {
      fonteScore: number;
      tipoObraScore: number;
      segmentoScore: number;
      engajamentoScore: number;
      historicoScore: number;
    };
  }> {
    const lead = await this.prisma.lead.findUnique({
      where: { leadId },
      include: {
        atividades: { orderBy: { criadoEm: 'desc' } },
        scoreHistorico: { take: 1, orderBy: { criadoEm: 'desc' } },
      },
    });

    if (!lead) {
      throw new NotFoundException(`Lead ${leadId} não encontrado`);
    }

    const ultimoScore = lead.scoreHistorico[0]?.scoreFinal;
    const ultimaAtividade =
      lead.atividades.length > 0 ? lead.atividades[0].criadoEm : undefined;

    const fatores = {
      fonteScore: this.calcularFonteScore(lead.fonte),
      tipoObraScore: this.calcularTipoObraScore(lead.tipoObra),
      segmentoScore: this.calcularSegmentoScore(lead.segmentoCliente),
      engajamentoScore: this.calcularEngajamentoScore(
        lead.atividades,
        ultimaAtividade
      ),
      historicoScore: this.calcularHistoricoScore(ultimoScore),
    };

    const scoreFinal = this.calcularScoreFinal(fatores);
    const probabilidade = this.calcularProbabilidade(scoreFinal);
    const dataEstimada = this.estimarDataClosing(probabilidade);

    await this.prisma.conversionScore.create({
      data: {
        leadId,
        scoreFinal,
        probabilidadeClosing: probabilidade,
        dataEstimadaClosing: dataEstimada,
        fonteScore: fatores.fonteScore,
        tipoObraScore: fatores.tipoObraScore,
        segmentoScore: fatores.segmentoScore,
        engajamentoScore: fatores.engajamentoScore,
        historicoScore: fatores.historicoScore,
      },
    });

    return {
      scoreFinal,
      probabilidade,
      dataEstimada,
      fatores,
    };
  }

  async recalcularScoreAposAtividade(leadId: string): Promise<{
    scoreFinal: number;
    probabilidade: number;
    dataEstimada: Date;
  }> {
    const resultado = await this.calcularScore(leadId);

    return {
      scoreFinal: resultado.scoreFinal,
      probabilidade: resultado.probabilidade,
      dataEstimada: resultado.dataEstimada,
    };
  }
}
