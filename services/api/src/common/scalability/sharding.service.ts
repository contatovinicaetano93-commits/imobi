import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

export interface ShardConfig {
  shardCount: number;
  shardIndex: number;
  consistentHashRing: boolean;
}

@Injectable()
export class ShardingService {
  private readonly shardCount: number;
  private readonly shardIndex: number;
  private readonly consistentHash: boolean;

  constructor(config?: ShardConfig) {
    this.shardCount = config?.shardCount || parseInt(process.env.SHARD_COUNT || '1', 10);
    this.shardIndex = config?.shardIndex || parseInt(process.env.SHARD_INDEX || '0', 10);
    this.consistentHash = config?.consistentHashRing ?? true;

    if (this.shardIndex >= this.shardCount) {
      throw new Error(
        `Invalid shard configuration: SHARD_INDEX (${this.shardIndex}) >= SHARD_COUNT (${this.shardCount})`,
      );
    }
  }

  /**
   * Calculate shard ID for a given entity (usuarioId, obraId, etc)
   * Uses consistent hashing with MD5 for even distribution
   */
  calculateShardId(entityId: string): number {
    if (this.shardCount === 1) return 0;

    const hash = crypto.createHash('md5').update(entityId).digest();
    const hashValue = hash.readUInt32BE(0);
    return hashValue % this.shardCount;
  }

  /**
   * Check if an entity belongs to this shard
   */
  belongsToThisShard(entityId: string): boolean {
    const shardId = this.calculateShardId(entityId);
    return shardId === this.shardIndex;
  }

  /**
   * Get shard routing information
   */
  getShardInfo(entityId: string): {
    shardId: number;
    belongsToThisShard: boolean;
    database: string;
  } {
    const shardId = this.calculateShardId(entityId);
    return {
      shardId,
      belongsToThisShard: shardId === this.shardIndex,
      database: `imobi_shard_${shardId}`,
    };
  }

  /**
   * Get all shard information for this instance
   */
  getAllShards(): {
    totalShards: number;
    currentShard: number;
    databases: string[];
  } {
    return {
      totalShards: this.shardCount,
      currentShard: this.shardIndex,
      databases: Array.from({ length: this.shardCount }, (_, i) => `imobi_shard_${i}`),
    };
  }
}
