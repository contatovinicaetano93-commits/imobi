import { Controller, Post, Body, HttpCode } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { CadastroUsuarioSchema, LoginSchema } from "@imbobi/schemas";
import { ZodPipe } from "../../common/pipes/zod.pipe";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("registrar")
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  registrar(@Body(new ZodPipe(CadastroUsuarioSchema)) body: unknown) {
    return this.auth.registrar(body as never);
  }

  @Post("login")
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  login(@Body(new ZodPipe(LoginSchema)) body: unknown) {
    return this.auth.login(body as never);
  }

  @Post("renovar")
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  renovar(@Body("refreshToken") token: string) {
    return this.auth.renovarToken(token);
  }

  @Post("logout")
  @HttpCode(204)
  logout(@Body("refreshToken") token: string) {
    return this.auth.revogarToken(token);
  }
}
