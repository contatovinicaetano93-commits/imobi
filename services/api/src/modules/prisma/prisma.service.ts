import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

const CONNECTION_LIMIT = process.env["DATABASE_CONNECTION_LIMIT"]
  ? Number(process.env["DATABASE_CONNECTION_LIMIT"])
  : 10;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const url = process.env["DATABASE_URL"];
    super({
      datasources: url ? { db: { url: `${url}?connection_limit=${CONNECTION_LIMIT}&pool_timeout=20` } } : undefined,
      log: process.env["NODE_ENV"] === "development" ? ["warn", "error"] : ["error"],
    });
  }

  async onModuleInit() {
    // Retry logic for database connection (useful in test/CI environments)
    const maxRetries = 10;
    const retryDelayMs = 1000;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.log(
          `Attempting to connect to database (attempt ${attempt}/${maxRetries})...`
        );
        await this.$connect();
        this.logger.log("Database connection established successfully");
        return;
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(
          `Database connection attempt ${attempt} failed: ${lastError.message}`
        );

        if (attempt < maxRetries) {
          this.logger.log(
            `Retrying in ${retryDelayMs}ms...`
          );
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        }
      }
    }

    // All retries exhausted
    this.logger.error(
      `Failed to connect to database after ${maxRetries} attempts: ${lastError?.message}`
    );
    throw lastError;
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
