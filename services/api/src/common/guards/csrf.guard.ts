import { Injectable, BadRequestException, Inject } from "@nestjs/common";
import { CanActivate, ExecutionContext } from "@nestjs/common";
import { FastifyRequest } from "fastify";
import { CsrfService } from "../../modules/csrf/csrf.service";

@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly CSRF_HEADER = "x-csrf-token";
  private readonly SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

  constructor(private readonly csrf: CsrfService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
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

    // Validate token against CSRF service (now async with Redis)
    const isValid = await this.csrf.validateToken(csrfToken);
    if (!isValid) {
      throw new BadRequestException("Invalid or expired CSRF token");
    }

    // Consume token (one-time use)
    await this.csrf.consumeToken(csrfToken);

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
