import { Controller, Post, Body, HttpCode, UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { CadastroUsuarioSchema, LoginSchema } from "@imbobi/schemas";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import { Throttle } from "../../common/decorators/throttle.decorator";
import { IpThrottlerGuard } from "../../common/guards/ip-throttler.guard";
import { UserThrottlerGuard } from "../../common/guards/user-throttler.guard";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("registrar")
  @UseGuards(IpThrottlerGuard)
  @Throttle(3, 3600000) // 3 requests per hour per IP
  registrar(@Body(new ZodPipe(CadastroUsuarioSchema)) body: unknown) {
    return this.auth.registrar(body as never);
  }

  @Post("login")
  @UseGuards(IpThrottlerGuard)
  @Throttle(5, 900000) // 5 requests per 15 minutes per IP
  @HttpCode(200)
  login(@Body(new ZodPipe(LoginSchema)) body: unknown) {
    return this.auth.login(body as never);
  }

  @Post("renovar")
  @UseGuards(UserThrottlerGuard)
  @Throttle(10, 3600000) // 10 requests per hour per user
  @HttpCode(200)
  renovar(@Body("refreshToken") token: string) {
    return this.auth.renovarToken(token);
  }

  @Post("logout")
  @HttpCode(204)
  logout(@Body("refreshToken") token: string) {
    return this.auth.revogarToken(token);
  }
}
