import { Injectable, BadRequestException } from "@nestjs/common";
import { CanActivate, ExecutionContext } from "@nestjs/common";
import { FastifyRequest } from "fastify";

@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly CSRF_HEADER = "x-csrf-token";
  private readonly SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<FastifyRequest>();

    // Passe em métodos GET/HEAD/OPTIONS
    if (this.SAFE_METHODS.has(request.method)) {
      return true;
    }

    // Para POST/PUT/DELETE/PATCH, valide token CSRF
    const csrfToken = this.getCsrfToken(request);
    if (!csrfToken) {
      throw new BadRequestException("CSRF token is required");
    }

    // Validar token contra session (implementado no middleware)
    const sessionToken = (request as any).session?.csrfToken;
    if (csrfToken !== sessionToken) {
      throw new BadRequestException("Invalid CSRF token");
    }

    return true;
  }

  private getCsrfToken(request: FastifyRequest): string | null {
    // Busca em header primeiro (recomendado)
    const fromHeader = request.headers[this.CSRF_HEADER];
    if (fromHeader) return String(fromHeader);

    // Fallback para body (menos seguro)
    if (request.body && typeof request.body === "object") {
      const body = request.body as Record<string, unknown>;
      return (body._csrf as string) || null;
    }

    return null;
  }
}
