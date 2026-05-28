import { Injectable } from "@nestjs/common";
import { randomBytes } from "crypto";

@Injectable()
export class CsrfService {
  private csrfTokens = new Map<string, { token: string; expiresAt: Date }>();
  private readonly TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

  generateToken(): string {
    const token = randomBytes(32).toString("hex");
    this.csrfTokens.set(token, {
      token,
      expiresAt: new Date(Date.now() + this.TOKEN_EXPIRY_MS),
    });
    return token;
  }

  validateToken(token: string): boolean {
    const stored = this.csrfTokens.get(token);
    if (!stored) return false;

    if (stored.expiresAt < new Date()) {
      this.csrfTokens.delete(token);
      return false;
    }

    return true;
  }

  consumeToken(token: string): void {
    this.csrfTokens.delete(token);
  }

  private cleanupExpiredTokens(): void {
    const now = new Date();
    for (const [token, data] of this.csrfTokens.entries()) {
      if (data.expiresAt < now) {
        this.csrfTokens.delete(token);
      }
    }
  }
}
