import { Controller, Get, Query } from "@nestjs/common";
import { RateLimit } from "../../common/decorators/rate-limit.decorator";

@Controller("marketplace")
export class MarketplaceController {
  @Get("search")
  @RateLimit(30, 1) /* 30 req/min */
  async search(@Query() query: Record<string, string>) {
    // Placeholder implementation
    // TODO: Implement marketplace search logic
    return {
      results: [],
      query,
    };
  }
}
