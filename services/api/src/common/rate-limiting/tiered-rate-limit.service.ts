import { Injectable } from '@nestjs/common';

export type UserTier = 'FREE' | 'PREMIUM' | 'ENTERPRISE';

export interface RateLimitConfig {
  limit: number;
  ttl: number;
  name: string;
}

@Injectable()
export class TieredRateLimitService {
  private tierConfigs: Record<UserTier, RateLimitConfig> = {
    FREE: {
      limit: 100,
      ttl: 60000, // 1 minute
      name: 'free',
    },
    PREMIUM: {
      limit: 1000,
      ttl: 60000, // 1 minute
      name: 'premium',
    },
    ENTERPRISE: {
      limit: 10000,
      ttl: 60000, // 1 minute
      name: 'enterprise',
    },
  };

  private endpointTierConfigs: Record<string, Record<UserTier, RateLimitConfig>> = {
    // Auth endpoints: stricter limits
    '/auth/registrar': {
      FREE: { limit: 10, ttl: 60000, name: 'free-auth' },
      PREMIUM: { limit: 50, ttl: 60000, name: 'premium-auth' },
      ENTERPRISE: { limit: 500, ttl: 60000, name: 'enterprise-auth' },
    },
    '/auth/login': {
      FREE: { limit: 10, ttl: 60000, name: 'free-auth' },
      PREMIUM: { limit: 50, ttl: 60000, name: 'premium-auth' },
      ENTERPRISE: { limit: 500, ttl: 60000, name: 'enterprise-auth' },
    },

    // Upload endpoints: moderate limits
    '/documentos/upload': {
      FREE: { limit: 5, ttl: 60000, name: 'free-upload' },
      PREMIUM: { limit: 50, ttl: 60000, name: 'premium-upload' },
      ENTERPRISE: { limit: 500, ttl: 60000, name: 'enterprise-upload' },
    },

    // Manager endpoints
    '/manager/': {
      FREE: { limit: 20, ttl: 60000, name: 'free-manager' },
      PREMIUM: { limit: 200, ttl: 60000, name: 'premium-manager' },
      ENTERPRISE: { limit: 2000, ttl: 60000, name: 'enterprise-manager' },
    },
  };

  getRateLimitConfig(userTier: UserTier, endpoint?: string): RateLimitConfig {
    if (endpoint) {
      const endpointConfig = this.endpointTierConfigs[endpoint];
      if (endpointConfig && endpointConfig[userTier]) {
        return endpointConfig[userTier];
      }
    }
    return this.tierConfigs[userTier];
  }

  getAllTierConfigs(): Record<UserTier, RateLimitConfig> {
    return this.tierConfigs;
  }

  getEndpointConfigs(endpoint: string): Record<UserTier, RateLimitConfig> | null {
    return this.endpointTierConfigs[endpoint] || null;
  }
}
