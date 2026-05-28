// Initialize error tracking BEFORE any other imports (order matters!)
import { initializeNewRelic } from "./common/config/newrelic.config";
import { initSentry } from "./common/config/sentry.config";

initializeNewRelic(); // New Relic APM
initSentry(); // Sentry error tracking

import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import {
  validateProductionEnv,
  getConfigSummary,
} from "./common/config";

async function bootstrap() {
  // Validate production environment
  const envErrors = validateProductionEnv();
  if (envErrors.length > 0) {
    console.error("Environment validation errors:");
    envErrors.forEach((err) => console.error(`  - ${err}`));
    if (process.env["NODE_ENV"] === "production") {
      process.exit(1);
    }
  }

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: process.env["NODE_ENV"] !== "production" })
  );

  // Sentry error tracking middleware (must be before other middleware)
  const { Sentry } = await import("./common/config/sentry.config");
  app.use(Sentry.fastifyIntegration());

  // ThrottlerGuard is registered via AppModule providers
  app.useGlobalFilters(new HttpExceptionFilter());

  // Set global prefix with health endpoint excluded (health checks must be accessible without auth)
  app.setGlobalPrefix("api/v1", {
    exclude: ["health", "api/health"],
  });

  app.enableCors({
    origin: process.env["CORS_ORIGIN"]?.split(",") ?? ["http://localhost:3000"],
    credentials: true,
  });

  const port = Number(process.env["PORT"] ?? 4000);
  await app.listen(port, "0.0.0.0");

  console.log(`imbobi API running on port ${port}`);
  console.log("Production config:", getConfigSummary());
}

void bootstrap();
