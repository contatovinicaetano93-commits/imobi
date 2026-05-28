import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../modules/prisma/prisma.service";

export interface AnalyticsOverview {
  totalSignups: number;
  totalLogins: number;
  kycUploadRate: number; // percentage of signups that uploaded KYC
  kycApprovalRate: number; // percentage of uploads that got approved
  creditRequestRate: number; // percentage of approved KYC that requested credit
  creditApprovalRate: number; // percentage of requests that got approved
  paymentsProcessed: number;
  totalCreditOriginationValue: number;
  totalCreditReleasedValue: number;
  stagesCompleted: number;
}

export interface FunnelMetrics {
  signup: number;
  kycUpload: number;
  kycApproved: number;
  creditRequested: number;
  creditApproved: number;
  paymentProcessed: number;
}

export interface CohortAnalysis {
  cohort: string; // YYYY-MM format
  signups: number;
  day7Retention: number;
  day30Retention: number;
  avgLTV: number; // Average lifetime value (total credit approved)
}

export interface RevenueMetrics {
  totalOriginationValue: number;
  totalReleasedValue: number;
  avgLoanSize: number;
  totalInterestGenerated: number;
  disbursementRate: number; // percentage of approved credit actually released
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getOverview(startDate?: Date, endDate?: Date): Promise<AnalyticsOverview> {
    const start = startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days ago
    const end = endDate || new Date();

    const [
      totalSignups,
      totalLogins,
      usersWithKyc,
      usersWithApprovedKyc,
      usersWithCreditRequest,
      usersWithApprovedCredit,
      totalCredits,
      totalLiberacoes,
      stagesCompleted,
    ] = await Promise.all([
      this.prisma.usuario.count({
        where: { criadoEm: { gte: start, lte: end } },
      }),
      this.prisma.usuario.count(), // Total logins would require audit logs
      this.prisma.kycDocumento.findMany({
        where: { criadoEm: { gte: start, lte: end } },
        distinct: ["usuarioId"],
      }),
      this.prisma.kycDocumento.findMany({
        where: {
          status: "APROVADO",
          analisadoEm: { gte: start, lte: end },
        },
        distinct: ["usuarioId"],
      }),
      this.prisma.credito.findMany({
        where: { criadoEm: { gte: start, lte: end } },
        distinct: ["usuarioId"],
      }),
      this.prisma.credito.findMany({
        where: {
          status: "APROVADO",
          dataAprovacao: { gte: start, lte: end },
        },
        distinct: ["usuarioId"],
      }),
      await this.prisma.credito.aggregate({
        where: { criadoEm: { gte: start, lte: end } },
        _sum: { valorAprovado: true },
      }),
      await this.prisma.liberacao.aggregate({
        where: { processadoEm: { gte: start, lte: end } },
        _sum: { valor: true },
      }),
      this.prisma.etapa.count({
        where: {
          status: "COMPLETA",
          atualizadoEm: { gte: start, lte: end },
        },
      }),
    ]);

    const kycUploadRate = totalSignups > 0 ? (usersWithKyc.length / totalSignups) * 100 : 0;
    const kycApprovalRate = usersWithKyc.length > 0 ? (usersWithApprovedKyc.length / usersWithKyc.length) * 100 : 0;
    const creditRequestRate = usersWithApprovedKyc.length > 0 ? (usersWithCreditRequest.length / usersWithApprovedKyc.length) * 100 : 0;
    const creditApprovalRate = usersWithCreditRequest.length > 0 ? (usersWithApprovedCredit.length / usersWithCreditRequest.length) * 100 : 0;

    return {
      totalSignups,
      totalLogins,
      kycUploadRate,
      kycApprovalRate,
      creditRequestRate,
      creditApprovalRate,
      paymentsProcessed: totalLiberacoes._count || 0,
      totalCreditOriginationValue: totalCredits._sum.valorAprovado || 0,
      totalCreditReleasedValue: totalLiberacoes._sum.valor || 0,
      stagesCompleted,
    };
  }

  async getFunnel(startDate?: Date, endDate?: Date): Promise<FunnelMetrics> {
    const start = startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();

    const [
      signup,
      kycUpload,
      kycApproved,
      creditRequested,
      creditApproved,
      paymentProcessed,
    ] = await Promise.all([
      this.prisma.usuario.count({
        where: { criadoEm: { gte: start, lte: end } },
      }),
      this.prisma.kycDocumento.count({
        where: { criadoEm: { gte: start, lte: end } },
      }),
      this.prisma.kycDocumento.count({
        where: {
          status: "APROVADO",
          analisadoEm: { gte: start, lte: end },
        },
      }),
      this.prisma.credito.count({
        where: { criadoEm: { gte: start, lte: end } },
      }),
      this.prisma.credito.count({
        where: {
          status: "APROVADO",
          dataAprovacao: { gte: start, lte: end },
        },
      }),
      this.prisma.liberacao.count({
        where: { processadoEm: { gte: start, lte: end } },
      }),
    ]);

    return {
      signup,
      kycUpload,
      kycApproved,
      creditRequested,
      creditApproved,
      paymentProcessed,
    };
  }

  async getCohortAnalysis(months: number = 12): Promise<CohortAnalysis[]> {
    const cohorts: CohortAnalysis[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const now = new Date();
      const cohortStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const cohortEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const cohortLabel = `${cohortStart.getFullYear()}-${String(cohortStart.getMonth() + 1).padStart(2, "0")}`;

      const signups = await this.prisma.usuario.count({
        where: { criadoEm: { gte: cohortStart, lte: cohortEnd } },
      });

      if (signups === 0) continue;

      // Day 7 retention: users who were active (had any transaction) within 7 days
      const day7End = new Date(cohortStart.getTime() + 7 * 24 * 60 * 60 * 1000);
      const day7Active = await this.prisma.usuario.count({
        where: {
          criadoEm: { gte: cohortStart, lte: cohortEnd },
          kycDocumentos: {
            some: { criadoEm: { lte: day7End } },
          },
        },
      });

      // Day 30 retention
      const day30End = new Date(cohortStart.getTime() + 30 * 24 * 60 * 60 * 1000);
      const day30Active = await this.prisma.usuario.count({
        where: {
          criadoEm: { gte: cohortStart, lte: cohortEnd },
          creditos: {
            some: { criadoEm: { lte: day30End } },
          },
        },
      });

      // Average LTV (total approved credit value)
      const ltv = await this.prisma.credito.aggregate({
        where: {
          usuario: { criadoEm: { gte: cohortStart, lte: cohortEnd } },
          status: "APROVADO",
        },
        _avg: { valorAprovado: true },
        _sum: { valorAprovado: true },
      });

      cohorts.push({
        cohort: cohortLabel,
        signups,
        day7Retention: (day7Active / signups) * 100,
        day30Retention: (day30Active / signups) * 100,
        avgLTV: ltv._avg.valorAprovado || 0,
      });
    }

    return cohorts;
  }

  async getRevenueMetrics(startDate?: Date, endDate?: Date): Promise<RevenueMetrics> {
    const start = startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();

    const [origination, released, allCredits] = await Promise.all([
      this.prisma.credito.aggregate({
        where: { criadoEm: { gte: start, lte: end } },
        _sum: { valorAprovado: true },
      }),
      this.prisma.liberacao.aggregate({
        where: { processadoEm: { gte: start, lte: end } },
        _sum: { valor: true },
      }),
      this.prisma.credito.findMany({
        where: { criadoEm: { gte: start, lte: end } },
      }),
    ]);

    const totalOriginationValue = origination._sum.valorAprovado || 0;
    const totalReleasedValue = released._sum.valor || 0;
    const avgLoanSize = allCredits.length > 0 ? totalOriginationValue / allCredits.length : 0;
    const totalInterestGenerated = allCredits.reduce((sum, credit) => {
      const monthlyInterest = credit.valorAprovado * credit.taxaMensal;
      const totalInterest = monthlyInterest * credit.prazoMeses;
      return sum + totalInterest;
    }, 0);
    const disbursementRate = totalOriginationValue > 0 ? (totalReleasedValue / totalOriginationValue) * 100 : 0;

    return {
      totalOriginationValue,
      totalReleasedValue,
      avgLoanSize,
      totalInterestGenerated,
      disbursementRate,
    };
  }
}
