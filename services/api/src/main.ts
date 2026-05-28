import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { validateEnvironmentOrThrow } from "./common/config";

async function bootstrap() {
  validateEnvironmentOrThrow();

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: process.env["NODE_ENV"] !== "production" })
  );

  // ThrottlerGuard is registered via AppModule providers
  app.useGlobalFilters(new HttpExceptionFilter());
  app.setGlobalPrefix("api/v1");

  const nodeEnv = process.env["NODE_ENV"] || "development";
  const corsOrigins = process.env["CORS_ORIGIN"]?.split(",");

  if (nodeEnv === "production" && !corsOrigins) {
    throw new Error("CORS_ORIGIN is required in production mode. Please set it as a comma-separated list of allowed origins.");
  }

  app.enableCors({
    origin: corsOrigins ?? ["http://localhost:3000"],
    credentials: true,
  });

  const port = Number(process.env["PORT"] ?? 4000);
  await app.listen(port, "0.0.0.0");
  console.log(`imbobi API running on port ${port}`);
}

void bootstrap();
