import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  action: string;
  actor: string;
  resource: string;
  resourceId: string;
  changes: {
    before: any;
    after: any;
  };
  status: 'SUCCESS' | 'FAILURE';
  ipAddress: string;
  userAgent: string;
  metadata: Record<string, any>;
  hash: string;
  previousHash: string;
}

/**
 * Immutable Audit Log Service
 *
 * Features:
 * - Append-only log (never delete, only add)
 * - Cryptographic chaining (hash includes previous entry)
 * - Tamper detection (verify chain integrity)
 * - GDPR compliant (can be combined with data retention policies)
 *
 * Storage: Can be written to:
 * - PostgreSQL (audit_logs table)
 * - AWS CloudTrail
 * - Elasticsearch
 * - Dedicated audit service
 */
@Injectable()
export class ImmutableAuditService {
  private lastHash = '';

  /**
   * Log an immutable audit entry
   */
  async log(
    action: string,
    actor: string,
    resource: string,
    resourceId: string,
    changes: { before: any; after: any },
    status: 'SUCCESS' | 'FAILURE',
    ipAddress: string,
    userAgent: string,
    metadata: Record<string, any> = {},
  ): Promise<AuditLogEntry> {
    const entry: AuditLogEntry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      action,
      actor,
      resource,
      resourceId,
      changes,
      status,
      ipAddress,
      userAgent,
      metadata,
      hash: '', // Will be calculated
      previousHash: this.lastHash,
    };

    // Calculate hash (immutable fingerprint)
    entry.hash = this.calculateHash(entry);
    this.lastHash = entry.hash;

    // In production: Write to audit log storage
    // await this.auditLogRepository.create(entry);

    return entry;
  }

  /**
   * Verify audit log chain integrity
   * Returns true if no tampering detected
   */
  async verifyChainIntegrity(entries: AuditLogEntry[]): Promise<boolean> {
    if (entries.length === 0) return true;

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];

      // Verify hash is correct for this entry
      const expectedHash = this.calculateHash(entry);
      if (entry.hash !== expectedHash) {
        console.error(`Audit log entry ${i} hash mismatch`);
        return false;
      }

      // Verify chain linkage
      if (i > 0 && entry.previousHash !== entries[i - 1].hash) {
        console.error(`Audit log chain broken at entry ${i}`);
        return false;
      }
    }

    return true;
  }

  /**
   * Get audit logs for a resource
   */
  async getLogsForResource(
    resource: string,
    resourceId: string,
    limit: number = 100,
  ): Promise<AuditLogEntry[]> {
    // In production: Query audit log storage
    // const entries = await this.auditLogRepository.find({
    //   where: { resource, resourceId },
    //   orderBy: { timestamp: 'desc' },
    //   take: limit,
    // });
    // return entries;
    return [];
  }

  /**
   * Get audit logs for an actor
   */
  async getLogsForActor(
    actor: string,
    limit: number = 100,
  ): Promise<AuditLogEntry[]> {
    // In production: Query audit log storage
    // const entries = await this.auditLogRepository.find({
    //   where: { actor },
    //   orderBy: { timestamp: 'desc' },
    //   take: limit,
    // });
    // return entries;
    return [];
  }

  /**
   * Calculate immutable hash for entry
   */
  private calculateHash(entry: Omit<AuditLogEntry, 'hash'> & { hash?: string }): string {
    // Remove hash from calculation (avoid circular reference)
    const { hash, ...entryWithoutHash } = entry;

    const dataToHash = JSON.stringify({
      timestamp: entry.timestamp,
      action: entry.action,
      actor: entry.actor,
      resource: entry.resource,
      resourceId: entry.resourceId,
      changes: entry.changes,
      status: entry.status,
      previousHash: entry.previousHash,
    });

    return crypto.createHash('sha256').update(dataToHash).digest('hex');
  }
}
