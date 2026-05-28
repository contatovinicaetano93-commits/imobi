import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { validateEnvironmentOrThrow, initSentry } from "./common/config";

async function bootstrap() {
  // Initialize Sentry before creating the app for error tracking
  initSentry();

  validateEnvironmentOrThrow();

  // Configure Fastify adapter with proper host handling
  const fastifyOptions: any = {
    logger: process.env["NODE_ENV"] !== "production",
    // Trust proxy headers from load balancers (Render, Vercel, AWS ALB)
    trust: ["127.0.0.1"],
    bodyLimit: 104857600, // 100MB for file uploads
  };

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(fastifyOptions)
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

  // Log deployment info for debugging
  console.log(`[STARTUP] Node ENV: ${nodeEnv}`);
  console.log(`[STARTUP] Port: ${port}`);
  console.log(`[STARTUP] CORS Origins: ${corsOrigins?.join(", ") || "localhost:3000"}`);

  await app.listen(port, "0.0.0.0");
  console.log(`imbobi API running on port ${port}`);
}

void bootstrap();
