import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { AppModule } from "./app.module";
import { CustomThrottlerGuard } from "./common/guards/throttler.guard";

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: process.env["NODE_ENV"] !== "production" })
  );

  app.useGlobalGuards(new CustomThrottlerGuard());
  app.setGlobalPrefix("api/v1");

  app.enableCors({
    origin: process.env["CORS_ORIGIN"]?.split(",") ?? ["http://localhost:3000"],
    credentials: true,
  });

  const port = Number(process.env["PORT"] ?? 4000);
  await app.listen(port, "0.0.0.0");
  console.log(`imbobi API running on port ${port}`);
}

void bootstrap();
