import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "../prisma/prisma.service";
import { normalizeUserRole } from "../../common/constants/manager-roles";

interface JwtPayload {
  sub: string;
  role?: string;
  nome?: string;
  email?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env["JWT_SECRET"] as string,
    });
  }

  async validate(payload: JwtPayload) {
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
