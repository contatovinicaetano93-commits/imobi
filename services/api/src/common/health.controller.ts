import { Controller, Get, HttpException, HttpStatus } from "@nestjs/common";
import { HealthService } from "./health.service";

@Controller("health")
export class HealthController {
  constructor(private health: HealthService) {}

  @Get()
  async check() {
    return this.health.getHealth();
  }

  @Get("live")
  async liveness() {
    return this.health.getLiveness();
  }

  @Get("ready")
  async readiness() {
    const ready = await this.health.getReadiness();
    if (ready.status !== "ready") {
      throw new HttpException(ready, HttpStatus.SERVICE_UNAVAILABLE);
    }
    return ready;
  }
}
