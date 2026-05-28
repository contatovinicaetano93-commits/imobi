import { Injectable, Inject } from "@nestjs/common";
import { randomBytes } from "crypto";
import { Redis } from "ioredis";

@Injectable()
export class CsrfService {
  private readonly TOKEN_EXPIRY_SECONDS = 24 * 60 * 60; // 24 hours
  private readonly CSRF_TOKEN_PREFIX = "csrf_token:";

  constructor(@Inject("REDIS") private readonly redis: Redis) {}

  async generateToken(): Promise<string> {
    const token = randomBytes(32).toString("hex");
    const key = `${this.CSRF_TOKEN_PREFIX}${token}`;

    // Store token in Redis with TTL (24 hours)
    await this.redis.setex(key, this.TOKEN_EXPIRY_SECONDS, JSON.stringify({
      token,
      createdAt: new Date().toISOString(),
    }));

    return token;
  }

  async validateToken(token: string): Promise<boolean> {
    const key = `${this.CSRF_TOKEN_PREFIX}${token}`;
    const stored = await this.redis.get(key);
    return stored !== null;
  }

  async consumeToken(token: string): Promise<void> {
    const key = `${this.CSRF_TOKEN_PREFIX}${token}`;
    await this.redis.del(key);
  }
}
