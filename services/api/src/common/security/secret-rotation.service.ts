import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

export interface SecretRotationConfig {
  secretName: string;
  rotationIntervalDays: number;
  issuedAt: number;
  rotatedAt: number;
  nextRotationAt: number;
  versions: SecretVersion[];
}

export interface SecretVersion {
  version: number;
  secret: string;
  issuedAt: number;
  expiresAt: number;
  status: 'ACTIVE' | 'DEPRECATED' | 'EXPIRED';
}

/**
 * Secret Rotation Service
 *
 * Implements automated secret rotation:
 * - API keys (GitHub, AWS, Stripe, etc)
 * - Database passwords
 * - JWT secrets
 * - Encryption keys
 *
 * Strategy:
 * - Keep multiple versions (current + 1-2 previous)
 * - Rotate on schedule (configurable per secret)
 * - Verify service functionality after rotation
 * - Audit all rotation events
 */
@Injectable()
export class SecretRotationService {
  /**
   * Example: Rotate JWT secret
   *
   * New secret is generated, old secret kept for grace period
   * This allows services to update without downtime
   */
  async rotateJwtSecret(): Promise<SecretRotationConfig> {
    const config: SecretRotationConfig = {
      secretName: 'JWT_SECRET',
      rotationIntervalDays: 90,
      issuedAt: Date.now(),
      rotatedAt: Date.now(),
      nextRotationAt: Date.now() + 90 * 24 * 60 * 60 * 1000,
      versions: [
        {
          version: 1,
          secret: this.generateSecret(32),
          issuedAt: Date.now(),
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 day grace period
          status: 'ACTIVE',
        },
        // Keep previous version for grace period
        {
          version: 0,
          secret: process.env.JWT_SECRET || 'old-secret',
          issuedAt: Date.now() - 90 * 24 * 60 * 60 * 1000,
          expiresAt: Date.now(),
          status: 'DEPRECATED',
        },
      ],
    };

    // In production:
    // 1. Generate new secret
    // 2. Update secret manager (AWS Secrets Manager, HashiCorp Vault, etc)
    // 3. Verify service can still validate old tokens
    // 4. Schedule old secret removal (7 days later)
    // 5. Audit rotation event

    return config;
  }

  /**
   * Example: Rotate database password
   *
   * Database must support multiple passwords simultaneously
   * PostgreSQL: ALTER ROLE user PASSWORD 'new-password';
   */
  async rotateDatabasePassword(): Promise<SecretRotationConfig> {
    const config: SecretRotationConfig = {
      secretName: 'DATABASE_PASSWORD',
      rotationIntervalDays: 30,
      issuedAt: Date.now(),
      rotatedAt: Date.now(),
      nextRotationAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      versions: [
        {
          version: 1,
          secret: this.generateSecret(32),
          issuedAt: Date.now(),
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
          status: 'ACTIVE',
        },
      ],
    };

    // In production:
    // 1. Connect to database with admin credentials
    // 2. Add new password: ALTER ROLE db_user PASSWORD 'new-password';
    // 3. Update connection string in service
    // 4. Verify connection successful
    // 5. Remove old password after grace period

    return config;
  }

  /**
   * Example: Rotate API key (third-party service)
   */
  async rotateApiKey(service: string): Promise<SecretRotationConfig> {
    // For external services (AWS, Stripe, SendGrid, etc):
    // 1. Call service API to generate new key
    // 2. Update config/environment with new key
    // 3. Verify API calls work with new key
    // 4. Disable old key (usually has grace period)
    // 5. Monitor for failures

    const config: SecretRotationConfig = {
      secretName: `${service.toUpperCase()}_API_KEY`,
      rotationIntervalDays: 90,
      issuedAt: Date.now(),
      rotatedAt: Date.now(),
      nextRotationAt: Date.now() + 90 * 24 * 60 * 60 * 1000,
      versions: [
        {
          version: 1,
          secret: this.generateSecret(32),
          issuedAt: Date.now(),
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
          status: 'ACTIVE',
        },
      ],
    };

    return config;
  }

  /**
   * Verify secret is still valid
   */
  isSecretValid(version: SecretVersion): boolean {
    return version.status === 'ACTIVE' && version.expiresAt > Date.now();
  }

  /**
   * Get active secret version
   */
  getActiveSecret(config: SecretRotationConfig): SecretVersion | null {
    return config.versions.find((v) => v.status === 'ACTIVE') || null;
  }

  /**
   * Get all valid secrets (active + deprecated within grace period)
   */
  getValidSecrets(config: SecretRotationConfig): SecretVersion[] {
    return config.versions.filter(
      (v) => v.expiresAt > Date.now() || v.status === 'ACTIVE',
    );
  }

  /**
   * Generate cryptographically secure secret
   */
  private generateSecret(length: number): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Schedule automatic rotation
   */
  scheduleRotation(secretName: string, intervalDays: number): void {
    const intervalMs = intervalDays * 24 * 60 * 60 * 1000;
    setInterval(async () => {
      console.log(`[SECRET_ROTATION] Rotating ${secretName}`);
      try {
        switch (secretName) {
          case 'JWT_SECRET':
            await this.rotateJwtSecret();
            break;
          case 'DATABASE_PASSWORD':
            await this.rotateDatabasePassword();
            break;
          default:
            console.log(`[SECRET_ROTATION] No rotation handler for ${secretName}`);
        }
      } catch (error) {
        console.error(`[SECRET_ROTATION] Failed to rotate ${secretName}:`, error);
      }
    }, intervalMs);
  }
}
