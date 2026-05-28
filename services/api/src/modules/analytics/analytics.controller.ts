import {
  Controller,
  Get,
  Query,
  UseGuards,
  BadRequestException,
} from "@nestjs/common";
import { AnalyticsService } from "./analytics.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN", "GESTOR_OBRA")
@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * Get summary dashboard metrics
   */
  @Get("summary")
  async getSummary(
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    if ((start && isNaN(start.getTime())) || (end && isNaN(end.getTime()))) {
      throw new BadRequestException("Datas inválidas");
    }

    return this.analyticsService.getSummary(start, end);
  }

  /**
   * Get works breakdown by status
   */
  @Get("works")
  async getWorksAnalytics(
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    return this.analyticsService.getWorksAnalytics(start, end);
  }

  /**
   * Get credits breakdown by status and value
   */
  @Get("credits")
  async getCreditsAnalytics(
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    return this.analyticsService.getCreditsAnalytics(start, end);
  }

  /**
   * Get users breakdown by KYC status
   */
  @Get("users")
  async getUsersAnalytics(
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    return this.analyticsService.getUsersAnalytics(start, end);
  }

  /**
   * Get performance metrics (average time per stage)
   */
  @Get("performance")
  async getPerformanceMetrics(
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    return this.analyticsService.getPerformanceMetrics(start, end);
  }

  /**
   * Get timeline data for charting (daily new entries)
   */
  @Get("timeline")
  async getTimelineData(
    @Query("days") days: string = "30",
    @Query("metric") metric?: string
  ) {
    const numDays = parseInt(days, 10);

    if (isNaN(numDays) || numDays < 1 || numDays > 365) {
      throw new BadRequestException("Days deve estar entre 1 e 365");
    }

    return this.analyticsService.getTimelineData(numDays, metric);
  }
}
