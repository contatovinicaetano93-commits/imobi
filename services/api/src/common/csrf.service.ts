import { Injectable } from "@nestjs/common";
import { randomBytes } from "crypto";

@Injectable()
export class CsrfService {
  private tokens = new Map<string, { token: string; expiresAt: number }>();

  generateToken(sessionId: string): string {
    const token = randomBytes(32).toString("hex");
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    this.tokens.set(sessionId, { token, expiresAt });
    return token;
  }

  validateToken(sessionId: string, token: string): boolean {
    const record = this.tokens.get(sessionId);
    if (!record) return false;
    if (Date.now() > record.expiresAt) {
      this.tokens.delete(sessionId);
      return false;
    }
    return record.token === token;
  }

  invalidateToken(sessionId: string): void {
    this.tokens.delete(sessionId);
  }
}
