import { Test, TestingModule } from "@nestjs/testing";
import { CanActivate, Injectable, INestApplication } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import fastifyMultipart from "@fastify/multipart";
import { AppModule } from "../app.module";

@Injectable()
class E2eBypassThrottlerGuard implements CanActivate {
  canActivate(): boolean {
    return true;
  }
}

export async function createE2eApp(): Promise<{
  app: NestFastifyApplication;
  module: TestingModule;
}> {
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(APP_GUARD)
    .useClass(E2eBypassThrottlerGuard)
    .compile();

  const app = moduleFixture.createNestApplication<NestFastifyApplication>(
    new FastifyAdapter({ bodyLimit: 10 * 1024 * 1024 }),
  );

  await app.register(fastifyMultipart, {
    limits: { fileSize: 10 * 1024 * 1024 },
  });

  app.setGlobalPrefix("api/v1");
  await app.init();
  await app.getHttpAdapter().getInstance().ready();

  return { app, module: moduleFixture };
}

export async function closeE2eApp(app: INestApplication): Promise<void> {
  await app.close();
}
