import { ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ThrottlerGuard } from "@nestjs/throttler";
import type { ThrottlerModuleOptions, ThrottlerStorage } from "@nestjs/throttler";

const MONITORING_CONTROLLER_NAMES = new Set(["HealthController", "MetricsController"]);

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    if (process.env.NODE_ENV === "test") return true;
    if (await super.shouldSkip(context)) return true;

    if (MONITORING_CONTROLLER_NAMES.has(context.getClass()?.name ?? "")) {
      return true;
    }

    const req = context.switchToHttp().getRequest<{
      url?: string;
      raw?: { url?: string };
      routeOptions?: { url?: string };
      routerPath?: string;
    }>();
    const path = req.url ?? req.raw?.url ?? req.routeOptions?.url ?? req.routerPath ?? "";
    // Render / uptime monitors hit /health and /metrics every few seconds — never limit
    if (path.includes("/health") || path.includes("/metrics")) return true;

    return false;
  }

  async getTracker(req: Record<string, any>): Promise<string> {
    // For authenticated requests, track by user ID from JWT
    if (req.user && typeof req.user === 'object' && req.user.id) {
      return `user:${req.user.id}`;
    }

    // O guard global roda ANTES do auth guard de rota, então req.user ainda
    // não existe. Como a web chega via proxy/SSR do Vercel (poucos IPs de
    // egress compartilhados), cair no IP colocaria todos os usuários no mesmo
    // balde e estouraria o limite. Extraímos o "sub" do JWT (sem verificar
    // assinatura — serve só para o balde) para limitar por usuário.
    const sub = subFromJwt(req.headers?.authorization);
    if (sub) {
      return `user:${sub}`;
    }

    // For unauthenticated or malformed user objects, track by IP address
    const ip = req.ip ?? req.headers?.["x-forwarded-for"] ?? req.socket?.remoteAddress ?? "unknown";
    if (ip === "unknown") {
      // Fallback: use a random token to avoid rate-limit bucket collision
      return `unknown:${Math.random()}`;
    }
    return `ip:${ip}`;
  }
}

/** Lê o `sub` de um "Bearer <jwt>" sem validar assinatura (uso: chave de rate-limit). */
function subFromJwt(authorization: unknown): string | null {
  if (typeof authorization !== "string") return null;
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  const parts = match[1].split(".");
  if (parts.length < 2) return null;

  try {
    const json = Buffer.from(parts[1], "base64url").toString("utf8");
    const payload = JSON.parse(json) as { sub?: unknown };
    return typeof payload.sub === "string" && payload.sub ? payload.sub : null;
  } catch {
    return null;
  }
}
