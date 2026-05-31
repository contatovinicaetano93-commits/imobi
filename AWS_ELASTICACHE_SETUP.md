# AWS ElastiCache Redis Setup Guide (Phase 1C)

## Objective
Migrate from local Redis to AWS ElastiCache Redis Serverless for session management and job queuing (BullMQ).

## Prerequisites
- AWS Account (free tier eligible: 750 hours/month)
- ElastiCache full access IAM permissions
- Redis client tools (optional)

## Step-by-Step Setup

### 1. Create ElastiCache Redis via AWS Console

1. Go to **AWS ElastiCache Dashboard** → **Create cache**
2. **Cache engine**: Redis
3. **Engine version**: 7.x (latest)
4. **Design options**: Select **Serverless** (recommended for MVP)
   - Auto-scales within defined limits
   - Pay-per-request model
   - No capacity planning needed
5. **Cache name**: `imobi-redis`
6. **Subnet group**: Default (or create new)
7. **Security groups**: Allow inbound on port 6379 from:
   - Your app IP
   - Dev machine IP (for testing)
8. **Automatic backups**: Enable (daily)
9. **CloudWatch logs**: Enable (for debugging)

### 2. Post-Creation Configuration

After creation (5-10 minutes):

1. Go to **ElastiCache Clusters** → **imobi-redis**
2. Copy **Primary Endpoint** (e.g., `imobi-redis-abc123.serverless.use2.cache.amazonaws.com:6379`)
3. Test connection:

```bash
# Install redis-cli
brew install redis  # macOS
# or
apt-get install redis-tools  # Linux

# Test connection
redis-cli -h imobi-redis-abc123.serverless.use2.cache.amazonaws.com -p 6379 PING
# Expected output: PONG
```

### 3. Update Environment Variables

Add to `.env.local`:

```env
# AWS ElastiCache Redis (Serverless)
REDIS_URL=redis://imobi-redis-abc123.serverless.use2.cache.amazonaws.com:6379
REDIS_PASSWORD=<if-auth-enabled>  # Optional, only if AUTH enabled
```

For production:
```env
# Use AWS Secrets Manager for password
REDIS_PASSWORD=$(aws secretsmanager get-secret-value --secret-id imobi/redis/password --query SecretString --output text)
```

### 4. Update BullMQ Configuration

Edit `services/api/src/modules/workers/bull.config.ts`:

```typescript
import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';

@Module({
  imports: [
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      },
    }),
    // ... queue definitions
  ],
})
export class BullConfigModule {}
```

Or use connection string:
```typescript
BullModule.forRoot({
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: true,
  },
  // BullMQ will parse REDIS_URL automatically
})
```

### 5. Update NestJS Cache Module

Edit `services/api/src/modules/cache/cache.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-redis-store';

@Module({
  imports: [
    NestCacheModule.register({
      isGlobal: true,
      store: redisStore,
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      ttl: 600, // 10 minutes default
    }),
  ],
})
export class CacheModule {}
```

### 6. Test BullMQ with ElastiCache

```typescript
// src/modules/workers/test.job.ts
import { Injectable } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import { InjectQueue } from '@nestjs/bull';

@Injectable()
export class TestJobService {
  constructor(
    @InjectQueue('test-queue')
    private testQueue: Queue,
  ) {}

  async testElastiCache() {
    // Add job
    const job = await this.testQueue.add('test-job', { data: 'hello' });
    console.log(`Job added: ${job.id}`);

    // Process job
    const worker = new Worker('test-queue', async (job) => {
      console.log(`Processing job ${job.id}: ${job.data.data}`);
      return { success: true };
    }, {
      connection: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
      },
    });

    return job;
  }
}
```

### 7. Verify Redis Connection

```bash
# Test in Node.js
node -e "
const redis = require('redis');
const client = redis.createClient({
  socket: {
    host: 'imobi-redis-abc123.serverless.use2.cache.amazonaws.com',
    port: 6379,
  },
});
client.on('error', (err) => console.log('Redis Error:', err));
client.connect().then(() => {
  client.ping().then((pong) => console.log('PONG:', pong));
});
"
```

### 8. Monitor via CloudWatch

1. ElastiCache Dashboard → **Metrics** tab
2. Key metrics:
   - **EngineCPUUtilization**: Should stay <80%
   - **NetworkBytesIn/Out**: Monitor throughput
   - **Evictions**: Alert if > 0 (means memory full)
   - **CurrItems**: Track cached items count

## Cost Estimation (After Free Tier)

| Component | Monthly | Notes |
|-----------|---------|-------|
| ElastiCache Serverless | $0.25/GB-hr | ~$36 for 1GB |
| Data transfer | $0-10 | Outbound only |
| Backup storage | $0.02/GB | Data retention |
| **TOTAL** | **$36-50** | Scales with usage |

**Savings**: ~$40-50/month vs RDS alone = $90-100 total infrastructure

## Alternative: ElastiCache Provisioned

If Serverless doesn't meet needs:

| Node Type | Hourly | Monthly | Use Case |
|-----------|--------|---------|----------|
| cache.t2.micro | $0.017 | ~$12 | Development |
| cache.t3.small | $0.034 | ~$25 | Small production |
| cache.r6g.large | $0.193 | ~$140 | Large production |

Current recommendation: **Serverless** (flexibility, no over-provisioning)

## Session Management with Redis

For user session storage:

```typescript
// src/modules/auth/session.service.ts
import { Injectable } from '@nestjs/common';
import { RedisService } from './redis.service';

@Injectable()
export class SessionService {
  constructor(private redis: RedisService) {}

  async saveSession(userId: string, token: string, ttl: number = 900) {
    await this.redis.set(`session:${userId}`, token, 'EX', ttl);
  }

  async getSession(userId: string): Promise<string | null> {
    return await this.redis.get(`session:${userId}`);
  }

  async destroySession(userId: string) {
    await this.redis.del(`session:${userId}`);
  }
}
```

## Job Queue Example (liberacao-parcela)

```typescript
// services/workers/liberacao-parcela.worker.ts
import { Worker } from 'bullmq';

export function setupLiberacaoParcelaWorker() {
  const worker = new Worker(
    'liberacao-parcela',
    async (job) => {
      console.log(`Processing liberacao for parcel ${job.data.parcelaId}`);
      // Business logic here
      return { success: true, parcelaId: job.data.parcelaId };
    },
    {
      connection: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      },
    },
  );

  worker.on('completed', (job) => {
    console.log(`Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Job ${job.id} failed:`, err.message);
  });

  return worker;
}
```

## Disaster Recovery

### Backup & Restore
- **Automatic**: Daily RDB snapshots (enabled)
- **Manual**: Export snapshot via ElastiCache console
- **Restore**: Create new cluster from snapshot

### Monitoring & Alerts

```bash
# CloudWatch alarm for evictions
aws cloudwatch put-metric-alarm \
  --alarm-name imobi-redis-evictions \
  --alarm-description "Alert when Redis evictions occur" \
  --metric-name Evictions \
  --namespace AWS/ElastiCache \
  --statistic Sum \
  --period 300 \
  --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold
```

## Security Best Practices

✅ DO:
- Use VPC security groups (restrict to app only)
- Enable encryption at rest
- Enable encryption in transit (TLS)
- Rotate auth tokens quarterly
- Enable CloudWatch logs

❌ DON'T:
- Expose to public internet
- Store sensitive data (PII) unencrypted
- Use weak auth tokens
- Skip monitoring

## Migration from Local Redis

Step-by-step migration:

```bash
# 1. Start ElastiCache (this guide)
# 2. Point REDIS_URL to ElastiCache
REDIS_URL=redis://new-endpoint:6379

# 3. Run app with new connection
pnpm dev

# 4. Monitor: both queues and cache should use ElastiCache
# 5. Old local Redis can be shut down
```

## Troubleshooting

### Connection refused
```bash
# Check security group allows your IP
aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=*redis*" \
  --query 'SecurityGroups[*].[GroupId,IpPermissions]'

# Add your IP if needed
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxxxxx \
  --protocol tcp \
  --port 6379 \
  --cidr YOUR_IP/32
```

### High eviction rate
- Increase memory limit in ElastiCache settings
- Reduce TTL on cached items
- Implement LRU cache policy

### High CPU usage
- Check for slow commands (KEYS pattern)
- Optimize BullMQ job processing
- Consider upgrading node type

## Timeline & Effort

- **ElastiCache Creation**: 5-10 minutes
- **Configuration**: 20 minutes
- **App Integration**: 30 minutes
- **Testing**: 30 minutes
- **Total Phase 1C**: ~2 hours

**Current Status**: Awaiting AWS ElastiCache endpoint from user
