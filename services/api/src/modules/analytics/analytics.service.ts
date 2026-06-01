import { Injectable, Inject } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { PrismaService } from "../prisma/prisma.service";

export interface AnalyticsEvent {
  userId: string;
  eventType:
    | "SIGNUP"
    | "LOGIN"
    | "KYC_UPLOAD"
    | "KYC_APPROVED"
    | "KYC_REJECTED"
    | "CREDIT_SIMULATED"
    | "CREDIT_APPLIED"
    | "WORK_CREATED"
    | "EVIDENCE_UPLOADED"
    | "STAGE_COMPLETED"
    | "PAYMENT_MADE";
  metadata?: Record<string, any>;
  timestamp?: Date;
}

export interface AnalyticsMetrics {
  totalSignups: number;
  totalLogins: number;
  kycApprovalRate: number;
  averageCreditSimulation: number;
  activeUsers24h: number;
  totalWorks: number;
  completedStages: number;
}

@Injectable()
export class AnalyticsService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async trackEvent(event: AnalyticsEvent): Promise<void> {
    try {
      // Store event in database
      await this.prisma.analyticsEvent.create({
        data: {
          usuarioId: event.userId,
          eventType: event.eventType,
          metadata: event.metadata,
          timestamp: event.timestamp || new Date(),
        },
      });

      // Update cache for real-time metrics
      await this.updateCachedMetrics(event.eventType);
    } catch (error) {
      // Log error but don't crash on analytics failure
      console.error("Analytics event tracking error:", error);
    }
  }

  async getMetrics(
    startDate?: Date,
    endDate?: Date,
  ): Promise<AnalyticsMetrics> {
    const now = new Date();
    const start =
      startDate || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const end = endDate || now;

    // Try to get from cache first
    const cacheKey = `analytics-metrics-${start.getTime()}-${end.getTime()}`;
    const cached = await this.cacheManager.get<AnalyticsMetrics>(cacheKey);

    if (cached) {
      return cached;
    }

    // Get fresh data from database
    const metrics: AnalyticsMetrics = {
      totalSignups: await this.countEventType("SIGNUP", start, end),
      totalLogins: await this.countEventType("LOGIN", start, end),
      kycApprovalRate: await this.calculateKycApprovalRate(start, end),
      averageCreditSimulation: await this.calculateAverageCreditSimulation(
        start,
        end,
      ),
      activeUsers24h: await this.countActiveUsers24h(),
      totalWorks: await this.countEventType("WORK_CREATED", start, end),
      completedStages: await this.countEventType("STAGE_COMPLETED", start, end),
    };

    // Cache for 5 minutes
    await this.cacheManager.set(cacheKey, metrics, 300000);

    return metrics;
  }

  async getUserTimeline(userId: string, limit: number = 50): Promise<any[]> {
    const events = await this.prisma.analyticsEvent.findMany({
      where: { usuarioId: userId },
      orderBy: { timestamp: "desc" },
      take: limit,
    });

    return events.map((e) => ({
      userId: e.usuarioId,
      eventType: e.eventType,
      metadata: e.metadata,
      timestamp: e.timestamp,
    }));
  }

  async getUserConversion(userId: string): Promise<{
    signupDate: Date | null;
    kycCompleted: boolean;
    creditApplied: boolean;
    daysToKyc: number | null;
    daysToCredit: number | null;
  }> {
    const signup = await this.prisma.analyticsEvent.findFirst({
      where: { usuarioId: userId, eventType: "SIGNUP" },
      orderBy: { timestamp: "asc" },
    });

    const kycApproved = await this.prisma.analyticsEvent.findFirst({
      where: { usuarioId: userId, eventType: "KYC_APPROVED" },
      orderBy: { timestamp: "asc" },
    });

    const creditApplied = await this.prisma.analyticsEvent.findFirst({
      where: { usuarioId: userId, eventType: "CREDIT_APPLIED" },
      orderBy: { timestamp: "asc" },
    });

    return {
      signupDate: signup?.timestamp || null,
      kycCompleted: !!kycApproved,
      creditApplied: !!creditApplied,
      daysToKyc: kycApproved
        ? Math.floor(
            (kycApproved.timestamp.getTime() -
              (signup?.timestamp.getTime() || 0)) /
              (1000 * 60 * 60 * 24),
          )
        : null,
      daysToCredit: creditApplied
        ? Math.floor(
            (creditApplied.timestamp.getTime() -
              (signup?.timestamp.getTime() || 0)) /
              (1000 * 60 * 60 * 24),
          )
        : null,
    };
  }

  private async countEventType(
    eventType: string,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    return await this.prisma.analyticsEvent.count({
      where: {
        eventType,
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
    });
  }

  private async calculateKycApprovalRate(
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    const uploaded = await this.prisma.analyticsEvent.count({
      where: {
        eventType: "KYC_UPLOAD",
        timestamp: { gte: startDate, lte: endDate },
      },
    });

    const approved = await this.prisma.analyticsEvent.count({
      where: {
        eventType: "KYC_APPROVED",
        timestamp: { gte: startDate, lte: endDate },
      },
    });

    return uploaded > 0 ? (approved / uploaded) * 100 : 0;
  }

  private async calculateAverageCreditSimulation(
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    const events = await this.prisma.analyticsEvent.findMany({
      where: {
        eventType: "CREDIT_SIMULATED",
        timestamp: { gte: startDate, lte: endDate },
      },
      select: { metadata: true },
    });

    if (events.length === 0) return 0;

    const total = events.reduce((sum, event) => {
      const amount = (event.metadata as any)?.valor || 0;
      return sum + amount;
    }, 0);

    return Math.round(total / events.length);
  }

  private async countActiveUsers24h(): Promise<number> {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const users = await this.prisma.analyticsEvent.findMany({
      where: {
        timestamp: { gte: since24h },
      },
      distinct: ["usuarioId"],
      select: { usuarioId: true },
    });

    return users.length;
  }

  private async updateCachedMetrics(eventType: string): Promise<void> {
    // Invalidate metrics cache when new event comes in
    const cacheKey = "analytics-metrics-*";
    // In a real implementation, we'd iterate through all cache keys and invalidate
    // For now, just clear the main metrics cache
    await this.cacheManager.del("analytics-metrics");
  }
}
