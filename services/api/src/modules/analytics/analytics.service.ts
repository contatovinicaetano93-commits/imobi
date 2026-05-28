import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Cron, CronExpression } from "@nestjs/schedule";

interface SummaryMetrics {
  totalUsuarios: number;
  usuariosAtivos: number;
  kyc: {
    pendente: number;
    aprovado: number;
    rejeitado: number;
  };
  obras: {
    total: number;
    emExecucao: number;
    concluidas: number;
  };
  creditos: {
    total: number;
    valorTotalAprovado: number;
    valorTotalLiberado: number;
    ativos: number;
  };
  timestamp: Date;
}

interface WorksBreakdown {
  status: string;
  count: number;
  percentual: number;
}

interface CreditsBreakdown {
  status: string;
  count: number;
  valorTotal: number;
  valorMedio: number;
}

interface UsersBreakdown {
  kycStatus: string;
  count: number;
  percentual: number;
}

interface PerformanceMetrics {
  avgTimeKycDays: number;
  avgTimeCreditApprovalDays: number;
  avgTimeWorkCompletionDays: number;
  avgEvidencesPerStage: number;
}

interface TimelineData {
  data: Array<{
    date: string;
    usuarios?: number;
    obras?: number;
    creditos?: number;
  }>;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  private summaryCache: SummaryMetrics | null = null;
  private cacheExpiry = 0;
  private readonly CACHE_DURATION = 60 * 60 * 1000; // 1 hour

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Refresh cache periodically
   */
  @Cron(CronExpression.EVERY_HOUR)
  async refreshCache() {
    try {
      await this.getSummary();
      this.logger.debug("Analytics cache refreshed");
    } catch (error) {
      this.logger.error("Error refreshing analytics cache", error);
    }
  }

  /**
   * Get summary metrics with caching
   */
  async getSummary(startDate?: Date, endDate?: Date): Promise<SummaryMetrics> {
    const now = Date.now();

    // Return cached result if valid
    if (this.summaryCache && now < this.cacheExpiry && !startDate && !endDate) {
      return this.summaryCache;
    }

    const where = this.buildDateFilter(startDate, endDate);

    const [
      totalUsuarios,
      usuariosAtivos,
      kycPendentes,
      kycAprovados,
      kycRejeitados,
      obrasTotal,
      obrasEmExecucao,
      obrasConcluidas,
      creditosTotal,
      creditosAtivos,
    ] = await Promise.all([
      this.prisma.usuario.count(),
      this.prisma.usuario.count({ where: { bloqueado: false } }),
      this.prisma.usuario.count({ where: { ...where, kycStatus: "PENDENTE" } }),
      this.prisma.usuario.count({ where: { ...where, kycStatus: "APROVADO" } }),
      this.prisma.usuario.count({
        where: { ...where, kycStatus: "REJEITADO" },
      }),
      this.prisma.obra.count({ where }),
      this.prisma.obra.count({
        where: { ...where, status: "EM_EXECUCAO" },
      }),
      this.prisma.obra.count({ where: { ...where, status: "CONCLUIDA" } }),
      this.prisma.credito.count({ where }),
      this.prisma.credito.count({
        where: { ...where, status: "ATIVO" },
      }),
    ]);

    const creditosAgregados = await this.prisma.credito.aggregate({
      _sum: { valorAprovado: true, valorLiberado: true },
      where,
    });

    const metrics: SummaryMetrics = {
      totalUsuarios,
      usuariosAtivos,
      kyc: {
        pendente: kycPendentes,
        aprovado: kycAprovados,
        rejeitado: kycRejeitados,
      },
      obras: {
        total: obrasTotal,
        emExecucao: obrasEmExecucao,
        concluidas: obrasConcluidas,
      },
      creditos: {
        total: creditosTotal,
        valorTotalAprovado: creditosAgregados._sum.valorAprovado || 0,
        valorTotalLiberado: creditosAgregados._sum.valorLiberado || 0,
        ativos: creditosAtivos,
      },
      timestamp: new Date(),
    };

    // Cache only if no date filters
    if (!startDate && !endDate) {
      this.summaryCache = metrics;
      this.cacheExpiry = now + this.CACHE_DURATION;
    }

    return metrics;
  }

  /**
   * Get works breakdown by status
   */
  async getWorksAnalytics(
    startDate?: Date,
    endDate?: Date
  ): Promise<WorksBreakdown[]> {
    const where = this.buildDateFilter(startDate, endDate);

    const statuses = [
      "PLANEJAMENTO",
      "EM_EXECUCAO",
      "PAUSADA",
      "CONCLUIDA",
      "CANCELADA",
    ];

    const total = await this.prisma.obra.count({ where });

    const breakdown = await Promise.all(
      statuses.map(async (status) => {
        const count = await this.prisma.obra.count({
          where: { ...where, status },
        });

        return {
          status,
          count,
          percentual: total > 0 ? (count / total) * 100 : 0,
        };
      })
    );

    return breakdown.filter((b) => b.count > 0);
  }

  /**
   * Get credits breakdown by status and value
   */
  async getCreditsAnalytics(
    startDate?: Date,
    endDate?: Date
  ): Promise<CreditsBreakdown[]> {
    const where = this.buildDateFilter(startDate, endDate);

    const statuses = ["ATIVO", "SUSPENSO", "VENCIDO", "QUITADO"];

    const breakdown = await Promise.all(
      statuses.map(async (status) => {
        const creditos = await this.prisma.credito.aggregate({
          _count: true,
          _sum: { valorAprovado: true },
          where: { ...where, status },
        });

        const count = creditos._count;
        const valorTotal = creditos._sum.valorAprovado || 0;

        return {
          status,
          count,
          valorTotal,
          valorMedio: count > 0 ? valorTotal / count : 0,
        };
      })
    );

    return breakdown.filter((b) => b.count > 0);
  }

  /**
   * Get users breakdown by KYC status
   */
  async getUsersAnalytics(
    startDate?: Date,
    endDate?: Date
  ): Promise<UsersBreakdown[]> {
    const where = this.buildDateFilter(startDate, endDate);

    const statuses = ["PENDENTE", "EM_VERIFICACAO", "APROVADO", "REJEITADO"];

    const total = await this.prisma.usuario.count({ where });

    const breakdown = await Promise.all(
      statuses.map(async (status) => {
        const count = await this.prisma.usuario.count({
          where: { ...where, kycStatus: status },
        });

        return {
          kycStatus: status,
          count,
          percentual: total > 0 ? (count / total) * 100 : 0,
        };
      })
    );

    return breakdown.filter((b) => b.count > 0);
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(
    startDate?: Date,
    endDate?: Date
  ): Promise<PerformanceMetrics> {
    const where = this.buildDateFilter(startDate, endDate);

    // Average time from usuario creation to KYC approval
    const kycMetrics = await this.prisma.usuario.aggregate({
      _avg: {
        criadoEm: true,
      },
      where: { ...where, kycStatus: "APROVADO" },
    });

    // Average time from credit creation to approval
    const creditMetrics = await this.prisma.credito.aggregate({
      _avg: {
        criadoEm: true,
      },
      where: { ...where, status: { not: "ATIVO" } },
    });

    // Average time from work creation to completion
    const obraMetrics = await this.prisma.obra.aggregate({
      _avg: {
        criadoEm: true,
      },
      where: { ...where, status: "CONCLUIDA" },
    });

    // Average evidences per stage
    const evidenceMetrics = await this.prisma.etapaObra.aggregate({
      _count: {
        evidencias: true,
      },
    });

    const stagesCount = await this.prisma.etapaObra.count();

    return {
      avgTimeKycDays: this.calculateDaysDiff(kycMetrics._avg.criadoEm),
      avgTimeCreditApprovalDays: this.calculateDaysDiff(
        creditMetrics._avg.criadoEm
      ),
      avgTimeWorkCompletionDays: this.calculateDaysDiff(
        obraMetrics._avg.criadoEm
      ),
      avgEvidencesPerStage:
        stagesCount > 0 ? evidenceMetrics._count.evidencias / stagesCount : 0,
    };
  }

  /**
   * Get timeline data for charts
   */
  async getTimelineData(days: number, metric?: string): Promise<TimelineData> {
    const data: Array<{
      date: string;
      usuarios?: number;
      obras?: number;
      creditos?: number;
    }> = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];

      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);

      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const dayFilter = {
        criadoEm: { gte: dayStart, lte: dayEnd },
      };

      const dataPoint: typeof data[0] = { date: dateStr };

      if (!metric || metric === "usuarios") {
        dataPoint.usuarios = await this.prisma.usuario.count({
          where: dayFilter,
        });
      }

      if (!metric || metric === "obras") {
        dataPoint.obras = await this.prisma.obra.count({
          where: dayFilter,
        });
      }

      if (!metric || metric === "creditos") {
        dataPoint.creditos = await this.prisma.credito.count({
          where: dayFilter,
        });
      }

      data.push(dataPoint);
    }

    return { data };
  }

  /**
   * Helper to build date filter for Prisma queries
   */
  private buildDateFilter(
    startDate?: Date,
    endDate?: Date
  ): Record<string, any> {
    if (!startDate && !endDate) {
      return {};
    }

    const filter: Record<string, any> = {};

    if (startDate && endDate) {
      filter.criadoEm = {
        gte: startDate,
        lte: endDate,
      };
    } else if (startDate) {
      filter.criadoEm = { gte: startDate };
    } else if (endDate) {
      filter.criadoEm = { lte: endDate };
    }

    return filter;
  }

  /**
   * Calculate days difference
   */
  private calculateDaysDiff(avgDate: Date | null): number {
    if (!avgDate) return 0;

    const diff = new Date().getTime() - new Date(avgDate).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }
}
