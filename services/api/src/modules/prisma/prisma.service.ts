import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    const maxRetries = 3;
    const retryDelayMs = 500;
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

    this.logger.error(
      `Failed to connect to database after ${maxRetries} attempts: ${lastError?.message}`
    );
    throw lastError;
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
