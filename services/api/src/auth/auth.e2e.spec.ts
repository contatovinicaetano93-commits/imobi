import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../app.module";
import { PrismaService } from "../modules/prisma/prisma.service";

describe("Auth E2E", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const testUser = {
    email: `test-${Date.now()}@imbobi.com`,
    password: "Senha@123",
    nome: "Test User",
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    app.setGlobalPrefix("api/v1");
    await app.init();

    prisma = moduleFixture.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.usuario.deleteMany({ where: { email: testUser.email } });
    await app.close();
  });

  it("Register → Login → Get Profile", async () => {
    // Register
    const registerRes = await request(app.getHttpServer())
      .post("/api/v1/auth/registrar")
      .send(testUser)
      .expect(201);

    expect(registerRes.body).toHaveProperty("usuarioId");
    expect(registerRes.body).toHaveProperty("email", testUser.email);

    const userId = registerRes.body.usuarioId;

    // Login
    const loginRes = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({
        email: testUser.email,
        password: testUser.password,
      })
      .expect(200);

    expect(loginRes.body).toHaveProperty("access_token");
    const token = loginRes.body.access_token;

    // Get Profile
    const profileRes = await request(app.getHttpServer())
      .get("/api/v1/usuarios/meu-perfil")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(profileRes.body).toHaveProperty("usuarioId", userId);
    expect(profileRes.body).toHaveProperty("email", testUser.email);
  });
});
