import { Controller, Post, Body, HttpCode } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { CadastroUsuarioSchema, LoginSchema } from "@imbobi/schemas";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import { RateLimit } from "../../common/decorators/rate-limit.decorator";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("registrar")
  @RateLimit(5, 1) /* 5 req/min */
  registrar(@Body(new ZodPipe(CadastroUsuarioSchema)) body: unknown) {
    return this.auth.registrar(body as never);
  }

  @Post("login")
  @HttpCode(200)
  @RateLimit(5, 1) /* 5 req/min */
  login(@Body(new ZodPipe(LoginSchema)) body: unknown) {
    return this.auth.login(body as never);
  }

  @Post("renovar")
  @HttpCode(200)
  @RateLimit(5, 1) /* 5 req/min */
  renovar(@Body("refreshToken") token: string) {
    return this.auth.renovarToken(token);
  }

  @Post("logout")
  @HttpCode(204)
  @RateLimit(5, 1) /* 5 req/min */
  logout(@Body("refreshToken") token: string) {
    return this.auth.revogarToken(token);
  }
}
