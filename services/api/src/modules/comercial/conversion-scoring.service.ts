import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

interface ScoringFactors {
  fonteScore: number;
  tipoObraScore: number;
  segmentoScore: number;
  engajamentoScore: number;
  historicoScore: number;
}

@Injectable()
export class ConversionScoringService {
  constructor(private prisma: PrismaService) {}

  /**
   * Calculate conversion score using 5-factor algorithm:
   * - Fonte (25%): Lead source quality
   * - TipoObra (20%): Construction type affinity
   * - Segmento (20%): Customer segment profile
   * - Engajamento (25%): Activity engagement level
   * - Historico (10%): Previous conversion history
   */
  async calcularScore(leadId: string): Promise<any> {
    const lead = await this.prisma.lead.findUnique({
      where: { leadId },
      include: {
        atividades: true,
        scoreHistorico: { take: 1, orderBy: { criadoEm: "desc" } },
        obra: true,
        usuario: true,
      },
    });

    if (!lead) return null;

    const fatores = this.extrairFatores(lead);
    const scoreFinal = this.calcularScoreFinal(fatores);
    const probabilidadeClosing = this.calcularProbabilidade(scoreFinal);
    const dataEstimadaClosing = this.estimarDataClosing(probabilidadeClosing);

    return this.prisma.conversionScore.create({
      data: {
        leadId,
        scoreFinal,
        probabilidadeClosing,
        dataEstimadaClosing,
        fonteScore: fatores.fonteScore,
        tipoObraScore: fatores.tipoObraScore,
        segmentoScore: fatores.segmentoScore,
        engajamentoScore: fatores.engajamentoScore,
        historicoScore: fatores.historicoScore,
        versaoAlgoritmo: "v1",
      },
    });
  }

  /**
   * Factor 1: FONTE (25%) - Lead source quality
   * Best: PARCEIRO (90), INDICACAO (85)
   * Good: WEBSITE (80)
   * Medium: CAMPANHA_DIGITAL (65), MARKETPLACE (70)
   * Lower: OFFLINE (60)
   */
  private calcularFonteScore(fonte: string): number {
    const scores: Record<string, number> = {
      PARCEIRO: 90,
      INDICACAO: 85,
      WEBSITE: 80,
      MARKETPLACE: 70,
      CAMPANHA_DIGITAL: 65,
      OFFLINE: 60,
    };
    return Math.max(0, Math.min(100, scores[fonte] || 60));
  }

  /**
   * Factor 2: TIPO OBRA (20%) - Construction type affinity
   * Based on company's track record and margins
   */
  private calcularTipoObraScore(tipoObra?: string): number {
    if (!tipoObra) return 70; // Default neutral score

    const scores: Record<string, number> = {
      residencial: 85,
      comercial: 80,
      industrial: 75,
      reforma: 60,
      outro: 50,
    };
    return Math.max(0, Math.min(100, scores[tipoObra.toLowerCase()] || 70));
  }

  /**
   * Factor 3: SEGMENTO (20%) - Customer segment profile
   * RETORNO customers have higher closing probability
   */
  private calcularSegmentoScore(segmento: string): number {
    const scores: Record<string, number> = {
      RETORNO: 85,
      NOVO: 70,
      CONCORRENTE: 65,
    };
    return Math.max(0, Math.min(100, scores[segmento] || 70));
  }

  /**
   * Factor 4: ENGAJAMENTO (25%) - Activity engagement level
   * More interactions = higher score
   * Decay over time if no recent activity
   */
  private calcularEngajamentoScore(
    atividades: any[],
    ultimaAtividade?: Date
  ): number {
    const atividadeCount = atividades.length;

    let baseScore = 0;
    if (atividadeCount === 0) baseScore = 20;
    else if (atividadeCount === 1) baseScore = 40;
    else if (atividadeCount === 2) baseScore = 60;
    else if (atividadeCount <= 5) baseScore = 80;
    else baseScore = 95;

    // Decay factor: penalize inactivity
    if (ultimaAtividade) {
      const diasSemAtividade = Math.floor(
        (Date.now() - ultimaAtividade.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diasSemAtividade > 30) baseScore *= 0.5; // -50%
      else if (diasSemAtividade > 14) baseScore *= 0.7; // -30%
      else if (diasSemAtividade > 7) baseScore *= 0.85; // -15%
    }

    return Math.max(0, Math.min(100, baseScore));
  }

  /**
   * Factor 5: HISTORICO (10%) - Previous conversion history
   * Based on previous lead scores or company conversion rate
   * Ceiling effect: max benefit after score > 80
   */
  private calcularHistoricoScore(ultimoScore?: number): number {
    if (!ultimoScore) return 50; // Neutral if no history

    const scoreNormalizado = Math.min(ultimoScore / 100, 1);
    const historicoScore = 50 + scoreNormalizado * 50; // Range: 50-100

    return Math.max(0, Math.min(100, historicoScore));
  }

  /**
   * Extract factors from lead data
   */
  private extrairFatores(lead: any): ScoringFactors {
    const ultimaAtividade =
      lead.atividades.length > 0
        ? new Date(
            Math.max(
              ...lead.atividades.map((a: any) => a.criadoEm.getTime())
            )
          )
        : undefined;

    return {
      fonteScore: this.calcularFonteScore(lead.fonte),
      tipoObraScore: this.calcularTipoObraScore(lead.tipoObra),
      segmentoScore: this.calcularSegmentoScore(lead.segmentoCliente),
      engajamentoScore: this.calcularEngajamentoScore(
        lead.atividades,
        ultimaAtividade
      ),
      historicoScore: this.calcularHistoricoScore(
        lead.scoreHistorico[0]?.scoreFinal
      ),
    };
  }

  /**
   * Calculate weighted final score
   * Weights: Fonte (25%) + Engajamento (25%) + Segmento (20%) + TipoObra (20%) + Historico (10%)
   */
  private calcularScoreFinal(fatores: ScoringFactors): number {
    const scoreFinal =
      fatores.fonteScore * 0.25 +
      fatores.engajamentoScore * 0.25 +
      fatores.segmentoScore * 0.2 +
      fatores.tipoObraScore * 0.2 +
      fatores.historicoScore * 0.1;

    return Math.round(scoreFinal);
  }

  /**
   * Convert score (0-100) to closing probability (0-1)
   * S-curve: slow rise initially, accelerates at 40-60, plateaus at 90+
   */
  private calcularProbabilidade(score: number): number {
    const normalizado = Math.min(score / 100, 1);
    const sigmoid = 1 / (1 + Math.exp(-5 * (normalizado - 0.5)));
    return Math.min(sigmoid * 0.95, 0.95); // Cap at 95% to avoid overconfidence
  }

  /**
   * Estimate closing date based on probability
   * High prob (>80%) → 15 days
   * Medium prob (40-80%) → 30 days
   * Low prob (<40%) → 60 days
   * Very low (<20%) → 90 days
   */
  private estimarDataClosing(probabilidade: number): Date {
    let diasEstimados = 90;

    if (probabilidade > 0.8) diasEstimados = 15;
    else if (probabilidade > 0.6) diasEstimados = 20;
    else if (probabilidade > 0.4) diasEstimados = 30;
    else if (probabilidade > 0.2) diasEstimados = 60;

    const data = new Date();
    data.setDate(data.getDate() + diasEstimados);
    return data;
  }

  /**
   * Recalculate score when new activity is added
   */
  async recalcularScoreAposAtividade(leadId: string): Promise<any> {
    return this.calcularScore(leadId);
  }
}
