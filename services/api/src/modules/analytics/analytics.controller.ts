import { Controller, Get, Query, UseGuards, Request } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { AnalyticsService } from "./analytics.service";

@Controller("api/v1/analytics")
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get("metrics")
  @UseGuards(JwtAuthGuard)
  async getMetrics(
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    return await this.analyticsService.getMetrics(start, end);
  }

  @Get("user/timeline")
  @UseGuards(JwtAuthGuard)
  async getUserTimeline(@Request() req, @Query("limit") limit: string = "50") {
    return await this.analyticsService.getUserTimeline(
      req.user.id,
      parseInt(limit),
    );
  }

  @Get("user/conversion")
  @UseGuards(JwtAuthGuard)
  async getUserConversion(@Request() req) {
    return await this.analyticsService.getUserConversion(req.user.id);
  }
}
