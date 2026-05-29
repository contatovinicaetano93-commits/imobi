import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import fs from "fs";
import path from "path";

// Setup module aliases for workspace packages before any imports
const moduleAlias = require("module-alias");
// Navigate from dist/main.js up to project root
// __dirname at runtime = /home/user/imobi/services/api/dist
// Need to go up 3 levels: dist -> api -> services -> imobi
const projectRoot = path.resolve(__dirname, "../../../");
moduleAlias.addAlias("@imbobi/schemas", path.join(projectRoot, "packages/schemas/dist"));
moduleAlias.addAlias("@imbobi/core", path.join(projectRoot, "packages/core/dist"));
moduleAlias.addAlias("@imbobi/ui", path.join(projectRoot, "packages/ui/dist"));
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { validateJwtSecret } from "./common/validators/jwt-secret.validator";

async function bootstrap() {
  validateJwtSecret();
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: process.env["NODE_ENV"] !== "production" })
  );

  // Security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        fontSrc: ["'self'"],
        connectSrc: ["'self'"],
      },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true },
  }));

  // ThrottlerGuard is registered via AppModule providers
  app.useGlobalFilters(new HttpExceptionFilter());
  app.setGlobalPrefix("api/v1");

  app.enableCors({
    origin: (process.env["CORS_ORIGIN"] ?? "http://localhost:3000").split(","),
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 3600,
  });

  // Swagger documentation (development only)
  if (process.env.NODE_ENV !== "production") {
    const config = new DocumentBuilder()
      .setTitle("imobi API")
      .setDescription("Fintech de crédito para construção civil")
      .setVersion("1.0.0")
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("docs", app, document);

    // Generate openapi.json for CI/CD
    const distDir = path.resolve(__dirname);
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, { recursive: true });
    }
    fs.writeFileSync(
      path.join(distDir, "openapi.json"),
      JSON.stringify(document, null, 2)
    );
  }

  const port = Number(process.env["PORT"] ?? 4000);
  await app.listen(port, "0.0.0.0");
  console.log(`imbobi API running on port ${port}`);
}

void bootstrap();
