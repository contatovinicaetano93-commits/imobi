import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { normalizeUserRole } from "../constants/manager-roles";
import { ROLES_KEY } from "../decorators/roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles?.length) return true;

    const { user } = context.switchToHttp().getRequest();
    const userRole = normalizeUserRole(user?.tipo);
    const allowed = requiredRoles.some((r) => normalizeUserRole(r) === userRole);

    if (!userRole || !allowed) {
      throw new ForbiddenException("Acesso negado para este perfil.");
    }
    return true;
  }
}
