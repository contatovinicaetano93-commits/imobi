import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export interface ZeroTrustContext {
  userId: string;
  email: string;
  tier: 'FREE' | 'PREMIUM' | 'ENTERPRISE';
  roles: string[];
  permissions: string[];
  tenantId: string;
  ipAddress: string;
  userAgent: string;
  tokenIssuedAt: number;
  lastVerifiedAt: number;
  deviceId?: string;
}

export interface ZeroTrustPolicy {
  requireMfa: boolean;
  allowedIpRanges: string[];
  allowedDevices: string[];
  maxTokenAge: number;
  requireEncryption: boolean;
  auditAllActions: boolean;
}

/**
 * Zero-Trust Security Model
 *
 * Principles:
 * 1. Never trust, always verify (every request authenticated & authorized)
 * 2. Assume breach (encrypt everything, audit all actions)
 * 3. Least privilege (minimal permissions by default)
 * 4. Verify explicitly (require additional verification for sensitive ops)
 *
 * Implementation:
 * - JWT tokens with short expiry (15 min)
 * - Refresh tokens for session extension
 * - Request-level verification (ip, device, signature)
 * - Audit logging for all operations
 * - Multi-factor authentication for sensitive actions
 */
@Injectable()
export class ZeroTrustService {
  private readonly tokenExpiry = 900000; // 15 minutes
  private readonly refreshTokenExpiry = 604800000; // 7 days

  constructor(private jwt: JwtService) {}

  /**
   * Verify and extract context from JWT token
   */
  verifyToken(token: string): ZeroTrustContext | null {
    try {
      const decoded = this.jwt.verify(token) as ZeroTrustContext;

      // Verify token age (prevent replay attacks)
      const ageMs = Date.now() - decoded.tokenIssuedAt;
      if (ageMs > this.tokenExpiry) {
        return null; // Token expired
      }

      // Verify last verification (force re-verification periodically)
      const timeSinceVerification = Date.now() - decoded.lastVerifiedAt;
      if (timeSinceVerification > 300000) {
        // 5 minutes - require re-verification
        return null;
      }

      return decoded;
    } catch (error) {
      return null;
    }
  }

  /**
   * Issue new JWT token with zero-trust context
   */
  issueToken(context: ZeroTrustContext): string {
    return this.jwt.sign({
      ...context,
      tokenIssuedAt: Date.now(),
      lastVerifiedAt: Date.now(),
    });
  }

  /**
   * Issue refresh token (long-lived, used to get new JWT)
   */
  issueRefreshToken(userId: string): string {
    return this.jwt.sign(
      {
        userId,
        type: 'refresh',
      },
      {
        expiresIn: '7d',
        secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      },
    );
  }

  /**
   * Verify action requires additional verification
   */
  requiresAdditionalVerification(action: string, context: ZeroTrustContext): boolean {
    const sensitiveActions = [
      'delete_account',
      'transfer_funds',
      'approve_credit',
      'modify_permissions',
      'export_data',
      'change_email',
    ];

    return sensitiveActions.includes(action);
  }

  /**
   * Get zero-trust policy for tenant
   */
  getPolicy(tier: 'FREE' | 'PREMIUM' | 'ENTERPRISE'): ZeroTrustPolicy {
    switch (tier) {
      case 'ENTERPRISE':
        return {
          requireMfa: true,
          allowedIpRanges: [], // Can be configured per tenant
          allowedDevices: [],
          maxTokenAge: 300000, // 5 minutes
          requireEncryption: true,
          auditAllActions: true,
        };
      case 'PREMIUM':
        return {
          requireMfa: false,
          allowedIpRanges: [],
          allowedDevices: [],
          maxTokenAge: 900000, // 15 minutes
          requireEncryption: true,
          auditAllActions: true,
        };
      case 'FREE':
      default:
        return {
          requireMfa: false,
          allowedIpRanges: [],
          allowedDevices: [],
          maxTokenAge: 900000, // 15 minutes
          requireEncryption: false,
          auditAllActions: false,
        };
    }
  }

  /**
   * Verify request signature (prevent tampering)
   */
  verifyRequestSignature(
    body: any,
    signature: string,
    secret: string,
  ): boolean {
    const crypto = require('crypto');
    const hash = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(body))
      .digest('hex');
    return hash === signature;
  }

  /**
   * Generate request signature
   */
  generateRequestSignature(body: any, secret: string): string {
    const crypto = require('crypto');
    return crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(body))
      .digest('hex');
  }
}
