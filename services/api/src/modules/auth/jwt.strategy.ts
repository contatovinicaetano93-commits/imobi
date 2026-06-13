import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

interface JwtPayload {
  sub: string;
  role?: string;
  nome?: string;
  email?: string;
  bloqueado?: boolean;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env["JWT_SECRET"] as string,
    });
  }

  validate(payload: JwtPayload) {
    // Blocked flag is embedded in the token at login time — no DB call needed per request
    if (payload.bloqueado) throw new UnauthorizedException("Conta bloqueada pelo administrador.");
    return { id: payload.sub, tipo: payload.role ?? null };
  }
}
