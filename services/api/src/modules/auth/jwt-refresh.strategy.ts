import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "../prisma/prisma.service";

interface JwtRefreshPayload {
  sub: string;
  type: string;
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, "jwt-refresh") {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField("refreshToken"),
      secretOrKey: process.env["JWT_REFRESH_SECRET"] ?? "",
      ignoreExpiration: false,
    });
  }

  async validate(payload: JwtRefreshPayload) {
    if (payload.type !== "refresh") {
      throw new UnauthorizedException("Invalid token type");
    }

    const usuario = await this.prisma.usuario.findUnique({
      where: { usuarioId: payload.sub },
      select: { usuarioId: true, tipo: true },
    });
    if (!usuario) throw new UnauthorizedException();
    return { id: usuario.usuarioId, tipo: usuario.tipo };
  }
}
