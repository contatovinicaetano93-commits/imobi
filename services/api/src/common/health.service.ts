import { Injectable, Inject } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { PrismaService } from "../modules/prisma/prisma.service";

@Injectable()
export class HealthService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async getHealth() {
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();

    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: Math.floor(uptime),
      version: process.env.npm_package_version || "1.0.0",
      memory: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024),
      },
      services: {
        database: await this.checkDatabase(),
        redis: await this.checkRedis(),
      },
    };
  }

  async getLiveness() {
    return { status: "alive", timestamp: new Date().toISOString() };
  }

  async getReadiness() {
    const [dbReady, redisReady] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    const ready = dbReady === "connected" && redisReady === "connected";
    return {
      status: ready ? "ready" : "not_ready",
      timestamp: new Date().toISOString(),
      services: { database: dbReady, redis: redisReady },
    };
  }

  private async checkDatabase(): Promise<string> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return "connected";
    } catch {
      return "disconnected";
    }
  }

  private async checkRedis(): Promise<string> {
    try {
      await this.cacheManager.set("health-check", "ok", 1000);
      const val = await this.cacheManager.get("health-check");
      return val === "ok" ? "connected" : "disconnected";
    } catch {
      return "disconnected";
    }
  }
}
