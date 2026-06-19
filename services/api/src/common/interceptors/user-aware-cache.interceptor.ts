import { CacheInterceptor } from "@nestjs/cache-manager";
import { ExecutionContext, Injectable } from "@nestjs/common";

@Injectable()
export class UserAwareCacheInterceptor extends CacheInterceptor {
  protected trackBy(context: ExecutionContext): string | undefined {
    const base = super.trackBy(context);
    if (!base) return undefined;
    const req = context.switchToHttp().getRequest();
    const userId: string = req.user?.id ?? "anon";
    return `u:${userId}:${base}`;
  }
}
