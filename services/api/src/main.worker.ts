import { NestFactory } from "@nestjs/core";
import { Logger } from "@nestjs/common";
import { WorkerAppModule } from "./worker.app.module";
import { initSentry } from "./common/config/sentry.config";

async function bootstrap() {
  initSentry();
  const app = await NestFactory.createApplicationContext(WorkerAppModule, {
    logger: ["error", "warn", "log"],
  });
  Logger.log("BullMQ workers started (WORKER_MODE=only)", "WorkerBootstrap");
  await app.init();
}

bootstrap().catch((err) => {
  console.error("Worker bootstrap failed:", err);
  process.exit(1);
});
