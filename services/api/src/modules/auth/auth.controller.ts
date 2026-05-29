import { Controller, Post, Body, HttpCode, Res } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { ApiOperation, ApiResponse } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { CadastroUsuarioSchema, LoginSchema } from "@imbobi/schemas";
import { ZodPipe } from "../../common/pipes/zod.pipe";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("registrar")
  @ApiOperation({ summary: "Registrar novo usuário" })
  @ApiResponse({ status: 201, description: "Usuário criado com sucesso" })
  @ApiResponse({ status: 400, description: "Dados inválidos" })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async registrar(
    @Body(new ZodPipe(CadastroUsuarioSchema)) body: unknown,
    @Res() res: any
  ) {
    const result = await this.auth.registrar(body as never);
    this.setRefreshTokenCookie(res, result.refreshToken);
    return res.send({ usuario: result.usuario, accessToken: result.accessToken });
  }

  @Post("login")
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async login(
    @Body(new ZodPipe(LoginSchema)) body: unknown,
    @Res() res: any
  ) {
    const result = await this.auth.login(body as never);
    this.setRefreshTokenCookie(res, result.refreshToken);
    return res.send({ usuario: result.usuario, accessToken: result.accessToken });
  }

  @Post("renovar")
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async renovar(
    @Body("refreshToken") token: string,
    @Res() res: any
  ) {
    const result = await this.auth.renovarToken(token);
    this.setRefreshTokenCookie(res, result.refreshToken);
    return res.send({ accessToken: result.accessToken });
  }

  @Post("logout")
  @HttpCode(204)
  async logout(
    @Body("refreshToken") token: string,
    @Res() res: any
  ) {
    await this.auth.revogarToken(token);
    res.clearCookie?.("refreshToken");
    return res.send();
  }

  private setRefreshTokenCookie(res: any, token: string): void {
    const isProduction = process.env.NODE_ENV === "production";
    try {
      res.setCookie?.("refreshToken", token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      }) ?? res.cookie?.("refreshToken", token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
    } catch (err) {
      // Fallback: skip cookie if method doesn't exist
    }
  }
}
