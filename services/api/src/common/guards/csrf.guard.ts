import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { CsrfService } from "../csrf.service";

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly csrf: CsrfService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    // Only validate CSRF tokens for state-changing methods
    if (!["POST", "PATCH", "DELETE", "PUT"].includes(method)) {
      return true;
    }

    // Skip CSRF for endpoints using JWT in Authorization header (stateless)
    // Only validate for endpoints that use cookies (stateful)
    const hasCookie =
      request.cookies && Object.keys(request.cookies).length > 0;
    if (!hasCookie) {
      return true;
    }

    const token = request.headers["x-csrf-token"] || request.body?.csrfToken;
    const sessionId = (request.user as any)?.id || request.ip;

    if (!token || !this.csrf.validateToken(sessionId, token)) {
      throw new ForbiddenException("Invalid CSRF token");
    }

    return true;
  }
}
