import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import fastifyMultipart from "@fastify/multipart";
import helmet from "@fastify/helmet";
import { timingSafeEqual } from "crypto";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { validateEnvironmentOrThrow, initSentry, getRedisConfig } from "./common/config";
import { QUEUE_LIBERACAO } from "./common/constants";

async function bootstrap() {
  validateEnvironmentOrThrow();
  initSentry();

  const redisConf = getRedisConfig();
  const redisOpts = {
    host: redisConf.host,
    port: redisConf.port,
    ...(redisConf.password && { password: redisConf.password }),
  };

  const fastifyOptions: any = {
    logger: process.env["NODE_ENV"] !== "production",
    trustProxy: true,
    bodyLimit: 26_214_400, // 25MB ceiling — covers 20MB KYC doc + multipart overhead
  };

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(fastifyOptions),
  );

  // Graceful shutdown: drain in-flight requests before process exit
  app.enableShutdownHooks();

  // Security headers (HSTS, X-Frame-Options, X-Content-Type-Options, etc.)
  await app.register(helmet, {
    contentSecurityPolicy: false, // API only, no HTML served
    hsts: process.env["NODE_ENV"] === "production"
      ? { maxAge: 31536000, includeSubDomains: true }
      : false,
  });

  await app.register(fastifyMultipart, { limits: { fileSize: 20 * 1024 * 1024 } }); // 20 MB — matches documentos.service DOC_MAX_BYTES

  app.useGlobalFilters(new HttpExceptionFilter());
  app.setGlobalPrefix("api/v1");

  // Bull Board — queue monitoring dashboard
  // Requires BULL_BOARD_ENABLED=true AND BULL_BOARD_TOKEN=<strong-secret>
  if (process.env["BULL_BOARD_ENABLED"] === "true") {
    const bullBoardToken = process.env["BULL_BOARD_TOKEN"];
    if (!bullBoardToken) {
      console.error("[STARTUP] Bull Board requires BULL_BOARD_TOKEN env var — dashboard disabled");
    } else {
      try {
        const { createBullBoard } = await import("@bull-board/api");
        const { BullAdapter } = await import("@bull-board/api/bullAdapter");
        const { FastifyAdapter: BullBoardAdapter } = await import("@bull-board/fastify");
        const Bull = (await import("bull")).default;
        const liberacaoQueue = new Bull(QUEUE_LIBERACAO, { redis: redisOpts });
        const boardAdapter = new BullBoardAdapter();
        const bullBoardPath = "/api/v1/admin/queues";
        boardAdapter.setBasePath(bullBoardPath);
        createBullBoard({ queues: [new BullAdapter(liberacaoQueue)], serverAdapter: boardAdapter });

        // Protect the dashboard with a timing-safe bearer token check before registering the plugin
        const fastifyInstance = app.getHttpAdapter().getInstance() as any;
        fastifyInstance.addHook("onRequest", async (req: any, reply: any) => {
          if (!req.url?.startsWith(bullBoardPath)) return;
          const auth: string = req.headers.authorization ?? "";
          if (!auth.startsWith("Bearer ")) {
            reply.status(401).header("WWW-Authenticate", 'Bearer realm="Bull Board"').send({ error: "Unauthorized" });
            return;
          }
          const tokenBuf = Buffer.from(auth.slice(7));
          const expectedBuf = Buffer.from(bullBoardToken);
          if (tokenBuf.length !== expectedBuf.length || !timingSafeEqual(tokenBuf, expectedBuf)) {
            reply.status(401).send({ error: "Unauthorized" });
            return;
          }
        });

        await app.register(boardAdapter.registerPlugin());
        console.log(`[STARTUP] Bull Board enabled at ${bullBoardPath} (bearer token required)`);
      } catch (e) {
        console.warn(`[STARTUP] Bull Board disabled: ${(e as Error).message}`);
      }
    }
  }

  if (process.env["NODE_ENV"] !== "production" || process.env["SWAGGER_ENABLED"] === "true") {
    const config = new DocumentBuilder()
      .setTitle("IMOBI API")
      .setDescription("API da plataforma imbobi — crédito para construção civil")
      .setVersion("1.0")
      .addBearerAuth({ type: "http", scheme: "bearer", bearerFormat: "JWT" }, "JWT")
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("api/docs", app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  const nodeEnv = process.env["NODE_ENV"] || "development";
  const corsOrigins = process.env["CORS_ORIGIN"]?.split(",").map((o) => o.trim()).filter(Boolean);
  const isDev = nodeEnv === "development" || nodeEnv === "test";

  if (!isDev && !corsOrigins?.length) {
    throw new Error("CORS_ORIGIN is required in production mode.");
  }

  app.enableCors({
    origin: corsOrigins?.length ? corsOrigins : (isDev ? true : ["http://localhost:3000"]),
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept", "X-Request-ID", "X-Idempotency-Key"],
    exposedHeaders: ["X-Request-ID"],
    maxAge: 86400,
    optionsSuccessStatus: 200,
  });

  const port = Number(process.env["PORT"] ?? 4000);

  console.log(`[STARTUP] Node ENV: ${nodeEnv}`);
  console.log(`[STARTUP] Port: ${port}`);
  console.log(`[STARTUP] CORS Origins: ${corsOrigins?.join(", ") || "localhost:3000"}`);

  await app.listen(port, "0.0.0.0");
  console.log(`imbobi API running on port ${port}`);
}

void bootstrap();
