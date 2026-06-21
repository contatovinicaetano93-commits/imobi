import { Injectable, UnauthorizedException, Inject } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import type { Cache } from "cache-manager";
import { PrismaService } from "../prisma/prisma.service";
import { normalizeUserRole } from "../../common/constants/manager-roles";

interface JwtPayload {
  sub: string;
  jti?: string;
  role?: string;
  nome?: string;
  email?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env["JWT_SECRET"] as string,
    });
  }

  async validate(payload: JwtPayload) {
    // Check if this token was explicitly revoked (blacklisted on logout)
    if (payload.jti) {
      const blacklisted = await this.cache.get(`blacklist:${payload.jti}`);
      if (blacklisted) throw new UnauthorizedException("Token revogado.");
    }

    const usuario = await this.prisma.usuario.findUnique({
      where: { usuarioId: payload.sub },
      select: { bloqueadoEm: true, tipo: true },
    });
    if (!usuario || usuario.bloqueadoEm) {
      throw new UnauthorizedException("Conta bloqueada pelo administrador.");
    }
    const tipo = normalizeUserRole(usuario.tipo ?? payload.role ?? null);
    return { id: payload.sub, tipo };
  }
}
