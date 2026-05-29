import { Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModuleOptions, ThrottlerStorage } from "@nestjs/throttler";

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  constructor(
    protected readonly options: ThrottlerModuleOptions,
    protected readonly storageService: ThrottlerStorage,
    protected readonly reflector: Reflector,
  ) {
    super(options, storageService, reflector);
  }

  async getTracker(req: Record<string, any>): Promise<string> {
    // For authenticated requests, track by user ID from JWT
    if (req.user?.usuarioId) {
      return `user:${req.user.usuarioId}`;
    }

    // For unauthenticated requests, track by IP address
    const ip = req.ip ?? req.headers?.["x-forwarded-for"] ?? "unknown";
    return `ip:${ip}`;
  }
}
