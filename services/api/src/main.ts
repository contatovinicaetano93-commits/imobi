import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import fastifyMultipart from "@fastify/multipart";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { validateEnvironmentOrThrow, initSentry } from "./common/config";
import { setupSwagger } from "./common/config/swagger.config";

async function bootstrap() {
  // Validate environment first to catch all config errors at startup
  validateEnvironmentOrThrow();

  // Then initialize optional services like Sentry
  initSentry();

  const fastifyOptions: any = {
    logger: process.env["NODE_ENV"] !== "production",
    trust: true, // Trust proxy headers from Render load balancer
    bodyLimit: 104857600, // 100MB for file uploads
  };

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(fastifyOptions)
  );

  await app.register(fastifyMultipart, { limits: { fileSize: 10 * 1024 * 1024 } }); // 10 MB

  // ThrottlerGuard is registered via AppModule providers
  app.useGlobalFilters(new HttpExceptionFilter());

  // Setup Swagger API documentation
  const nodeEnv = process.env["NODE_ENV"] || "development";
  const swaggerEnabled = process.env["SWAGGER_ENABLED"] !== "false";
  if ((nodeEnv === "development" || nodeEnv === "staging") && swaggerEnabled) {
    setupSwagger(app);
  }

  app.setGlobalPrefix("api/v1");

  const corsOrigins = process.env["CORS_ORIGIN"]?.split(",").map((o) => o.trim()).filter(Boolean);
  const isDev = nodeEnv === "development" || nodeEnv === "test";

  if (!isDev && !corsOrigins?.length) {
    throw new Error("CORS_ORIGIN is required in production mode. Please set it as a comma-separated list of allowed origins.");
  }

  app.enableCors({
    origin: corsOrigins?.length ? corsOrigins : (isDev ? true : ["http://localhost:3000"]),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    maxAge: 86400, // 24 hours preflight caching
    optionsSuccessStatus: 200,
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
