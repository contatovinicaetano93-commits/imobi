import { Controller, Post, Body, HttpCode, UseGuards, Get } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { CsrfService } from "../csrf/csrf.service";
import { CadastroUsuarioSchema, LoginSchema } from "@imbobi/schemas";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import { Throttle } from "../../common/decorators/throttle.decorator";
import { IpThrottlerGuard } from "../../common/guards/ip-throttler.guard";
import { UserThrottlerGuard } from "../../common/guards/user-throttler.guard";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly csrf: CsrfService
  ) {}

  @Get("csrf-token")
  csrfToken() {
    const token = this.csrf.generateToken();
    return { csrfToken: token };
  }

  @Post("registrar")
  @UseGuards(IpThrottlerGuard)
  @Throttle(3, 3600000) // 3 requests per hour per IP
  async registrar(@Body(new ZodPipe(CadastroUsuarioSchema)) body: unknown) {
    const result = await this.auth.registrar(body as never);
    return { ...result, csrfToken: this.csrf.generateToken() };
  }

  @Post("login")
  @UseGuards(IpThrottlerGuard)
  @Throttle(5, 900000) // 5 requests per 15 minutes per IP
  @HttpCode(200)
  async login(@Body(new ZodPipe(LoginSchema)) body: unknown) {
    const result = await this.auth.login(body as never);
    return { ...result, csrfToken: this.csrf.generateToken() };
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
