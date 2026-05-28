import { Controller, Get, Query } from "@nestjs/common";
import { AnalyticsService } from "../../common/services/analytics.service";

@Controller("api/v1/analytics")
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get("overview")
  async getOverview(
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.analyticsService.getOverview(start, end);
  }

  @Get("funnel")
  async getFunnel(
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.analyticsService.getFunnel(start, end);
  }

  @Get("cohorts")
  async getCohorts(@Query("months") months?: string) {
    const monthsNum = months ? parseInt(months, 10) : 12;
    return this.analyticsService.getCohortAnalysis(monthsNum);
  }

  @Get("revenue")
  async getRevenue(
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.analyticsService.getRevenueMetrics(start, end);
  }
}
