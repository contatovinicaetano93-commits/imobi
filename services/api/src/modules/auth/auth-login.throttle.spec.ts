import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, UnauthorizedException, ValidationPipe } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerModule } from "@nestjs/throttler";
import request from "supertest";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { CustomThrottlerGuard } from "../../common/guards/throttler.guard";

describe("Auth login rate limit (passo 109)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([
          { ttl: 60_000, limit: 100 },
          { ttl: 60_000, limit: 5, name: "auth" },
        ]),
      ],
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            login: jest.fn().mockRejectedValue(new UnauthorizedException("Credenciais inválidas.")),
          },
        },
        { provide: APP_GUARD, useClass: CustomThrottlerGuard },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    app.setGlobalPrefix("api/v1");
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("POST /auth/login → 429 após 5 tentativas/min no mesmo IP", async () => {
    const email = `brute-${Date.now()}@imbobi.test`;
    const statuses: number[] = [];

    for (let i = 0; i < 7; i++) {
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email, senha: "SenhaErrada@123" });
      statuses.push(res.status);
      if (res.status === 429) break;
    }

    expect(statuses).toContain(429);
  });
});
