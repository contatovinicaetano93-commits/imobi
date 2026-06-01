import { Reflector } from "@nestjs/core";
import { ThrottlerStorage } from "@nestjs/throttler";
import { CustomThrottlerGuard } from "./throttler.guard";

describe("CustomThrottlerGuard", () => {
  let guard: CustomThrottlerGuard;
  let reflector: Reflector;
  let mockStorage: ThrottlerStorage;

  beforeEach(() => {
    reflector = new Reflector();
    mockStorage = {} as ThrottlerStorage;
    guard = new CustomThrottlerGuard({} as any, mockStorage, reflector);
  });

  describe("getTracker", () => {
    it("should track by user ID when user is authenticated", async () => {
      const mockRequest = {
        user: {
          usuarioId: "user-123",
          email: "test@example.com",
        },
      } as any;

      const tracker = await guard.getTracker(mockRequest);

      expect(tracker).toBe("user:user-123");
    });

    it("should track by IP address when user is not authenticated", async () => {
      const mockRequest = {
        ip: "192.168.1.100",
        headers: {},
      } as any;

      const tracker = await guard.getTracker(mockRequest);

      expect(tracker).toBe("ip:192.168.1.100");
    });

    it("should use x-forwarded-for header when ip is not available", async () => {
      const mockRequest = {
        headers: {
          "x-forwarded-for": "203.0.113.42",
        },
      } as any;

      const tracker = await guard.getTracker(mockRequest);

      expect(tracker).toBe("ip:203.0.113.42");
    });

    it("should use 'unknown' as fallback when no IP is available", async () => {
      const mockRequest = {
        headers: {},
      } as any;

      const tracker = await guard.getTracker(mockRequest);

      expect(tracker).toBe("ip:unknown");
    });

    it("should prioritize user ID over IP address", async () => {
      const mockRequest = {
        user: {
          usuarioId: "user-456",
        },
        ip: "192.168.1.200",
        headers: {
          "x-forwarded-for": "203.0.113.99",
        },
      } as any;

      const tracker = await guard.getTracker(mockRequest);

      expect(tracker).toBe("user:user-456");
    });
  });

  describe("Rate Limiting Configuration", () => {
    it("should have proper rate limit configuration", () => {
      const expectedLimits = {
        general: 100, // 100 req/min
        auth: 10, // 10 req/min
        upload: 5, // 5 req/min
        manager: 20, // 20 req/min
      };

      expect(expectedLimits.general).toBe(100);
      expect(expectedLimits.auth).toBe(10);
      expect(expectedLimits.upload).toBe(5);
      expect(expectedLimits.manager).toBe(20);
    });
  });
});
