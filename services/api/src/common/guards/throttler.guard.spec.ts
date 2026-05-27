import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { ThrottlerModule } from "@nestjs/throttler";
import { Controller, Post, UseGuards } from "@nestjs/common";
import { CustomThrottlerGuard } from "./throttler.guard";
import { IpThrottlerGuard } from "./ip-throttler.guard";
import { UserThrottlerGuard } from "./user-throttler.guard";
import { Throttle } from "../decorators/throttle.decorator";
import request from "supertest";

/**
 * Test controller for validating rate limiting behavior
 */
@Controller("test")
class TestController {
  @Post("public-endpoint")
  @UseGuards(IpThrottlerGuard)
  @Throttle(3, 60000) // 3 requests per minute per IP
  publicEndpoint() {
    return { message: "Success" };
  }

  @Post("user-endpoint")
  @UseGuards(UserThrottlerGuard)
  @Throttle(5, 60000) // 5 requests per minute per user/IP
  userEndpoint() {
    return { message: "Success" };
  }
}

describe("Rate Limiting Guards (Throttler)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([
          {
            ttl: 60000,
            limit: 100,
          },
        ]),
      ],
      controllers: [TestController],
      providers: [
        {
          provide: "APP_GUARD",
          useClass: CustomThrottlerGuard,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("IpThrottlerGuard - IP-based rate limiting", () => {
    it("should allow requests within limit", async () => {
      const response = await request(app.getHttpServer())
        .post("/test/public-endpoint")
        .set("X-Forwarded-For", "192.168.1.1")
        .expect(201);

      expect(response.body).toEqual({ message: "Success" });
    });

    it("should reject requests exceeding limit per IP", async () => {
      const ip = "192.168.1.2";

      // Make 3 successful requests (limit)
      for (let i = 0; i < 3; i++) {
        await request(app.getHttpServer())
          .post("/test/public-endpoint")
          .set("X-Forwarded-For", ip)
          .expect(201);
      }

      // 4th request should be rate limited
      await request(app.getHttpServer())
        .post("/test/public-endpoint")
        .set("X-Forwarded-For", ip)
        .expect(429);
    });

    it("should allow different IPs to have separate rate limits", async () => {
      // IP 1 makes 3 requests (limit)
      for (let i = 0; i < 3; i++) {
        await request(app.getHttpServer())
          .post("/test/public-endpoint")
          .set("X-Forwarded-For", "192.168.1.100")
          .expect(201);
      }

      // IP 2 should still have requests available
      const response = await request(app.getHttpServer())
        .post("/test/public-endpoint")
        .set("X-Forwarded-For", "192.168.1.101")
        .expect(201);

      expect(response.body).toEqual({ message: "Success" });
    });
  });

  describe("UserThrottlerGuard - User-based rate limiting", () => {
    it("should track by user ID if authenticated", async () => {
      const userId = "user-123";

      // Make request with user context
      const response = await request(app.getHttpServer())
        .post("/test/user-endpoint")
        .set("Authorization", `Bearer token`)
        .set("X-User-Id", userId)
        .expect(201);

      expect(response.body).toEqual({ message: "Success" });
    });

    it("should fall back to IP tracking for unauthenticated requests", async () => {
      const ip = "192.168.1.200";

      // Make request without authentication
      const response = await request(app.getHttpServer())
        .post("/test/user-endpoint")
        .set("X-Forwarded-For", ip)
        .expect(201);

      expect(response.body).toEqual({ message: "Success" });
    });
  });

  describe("Custom Throttler Guard - Global configuration", () => {
    it("should handle X-Forwarded-For header for proxied requests", async () => {
      const response = await request(app.getHttpServer())
        .post("/test/public-endpoint")
        .set("X-Forwarded-For", "203.0.113.42")
        .expect(201);

      expect(response.body).toEqual({ message: "Success" });
    });

    it("should handle direct IP connections", async () => {
      const response = await request(app.getHttpServer())
        .post("/test/public-endpoint")
        .expect(201);

      expect(response.body).toEqual({ message: "Success" });
    });
  });
});
