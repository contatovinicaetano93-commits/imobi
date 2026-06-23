import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

export interface ReplicaConfig {
  primary: string;
  replicas: string[];
  loadBalancing: 'round-robin' | 'random' | 'least-connections';
}

/**
 * Read Replica Service
 *
 * Distributes read queries to replicas, write queries to primary.
 * Helps scale read-heavy workloads horizontally.
 *
 * Configuration (environment):
 * DATABASE_URL=postgresql://...primary...
 * DATABASE_REPLICA_URLS=postgresql://...replica1...,postgresql://...replica2...
 */
@Injectable()
export class ReadReplicaService {
  private readonly primary: string;
  private readonly replicas: string[];
  private readonly loadBalancing: string;
  private currentReplicaIndex = 0;

  constructor() {
    this.primary = process.env.DATABASE_URL || '';
    this.replicas = (process.env.DATABASE_REPLICA_URLS || '').split(',').filter(Boolean);
    this.loadBalancing = process.env.REPLICA_LOAD_BALANCING || 'round-robin';

    if (!this.primary) {
      throw new Error('DATABASE_URL not configured');
    }
  }

  /**
   * Get connection string for primary (write operations)
   */
  getPrimaryUrl(): string {
    return this.primary;
  }

  /**
   * Get connection string for read replica
   */
  getReplicaUrl(): string {
    if (this.replicas.length === 0) {
      return this.primary;
    }

    switch (this.loadBalancing) {
      case 'random':
        return this.replicas[Math.floor(Math.random() * this.replicas.length)];
      case 'least-connections':
        // In production, would track actual connection counts
        return this.replicas[0];
      case 'round-robin':
      default: {
        const replica = this.replicas[this.currentReplicaIndex];
        this.currentReplicaIndex = (this.currentReplicaIndex + 1) % this.replicas.length;
        return replica;
      }
    }
  }

  /**
   * Get info about configured replicas
   */
  getReplicaInfo(): {
    hasPrimary: boolean;
    replicaCount: number;
    loadBalancingStrategy: string;
  } {
    return {
      hasPrimary: !!this.primary,
      replicaCount: this.replicas.length,
      loadBalancingStrategy: this.loadBalancing,
    };
  }

  /**
   * Usage pattern in services:
   *
   * // For reads: Use replica connection
   * const obrasRead = new PrismaClient({
   *   datasources: { db: { url: this.readReplica.getReplicaUrl() } }
   * });
   * const obra = await obrasRead.obra.findUnique({ where: { id } });
   *
   * // For writes: Use primary connection
   * const obrasPrimary = new PrismaClient({
   *   datasources: { db: { url: this.readReplica.getPrimaryUrl() } }
   * });
   * await obrasPrimary.obra.update({ where: { id }, data: { ... } });
   */
}
