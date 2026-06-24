import { Controller, Post, Body, HttpCode, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { CadastroUsuarioSchema, LoginSchema, EsqueceuSenhaSchema, RedefinirSenhaSchema } from "@imbobi/schemas";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import type { CadastroUsuarioInput, LoginInput, EsqueceuSenhaInput, RedefinirSenhaInput } from "@imbobi/schemas";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("registrar")
  @Throttle({ auth: { limit: 10, ttl: 60000 } })
  registrar(@Body(new ZodPipe(CadastroUsuarioSchema)) body: CadastroUsuarioInput) {
    return this.auth.registrar(body);
  }

  @Post("login")
  @HttpCode(200)
  @Throttle({ auth: { limit: 5, ttl: 60000 } })
  login(@Body(new ZodPipe(LoginSchema)) body: LoginInput) {
    return this.auth.login(body);
  }

  @Post("renovar")
  @HttpCode(200)
  @Throttle({ auth: { limit: 10, ttl: 60000 } })
  renovar(@Body("refreshToken") token: string) {
    return this.auth.renovarToken(token);
  }

  @UseGuards(JwtAuthGuard)
  @Post("logout")
  @HttpCode(204)
  logout(@Body("refreshToken") token: string) {
    return this.auth.revogarToken(token);
  }

  @Post("esqueceu-senha")
  @HttpCode(200)
  @Throttle({ auth: { limit: 5, ttl: 60000 } })
  esqueceuSenha(@Body(new ZodPipe(EsqueceuSenhaSchema)) body: EsqueceuSenhaInput) {
    return this.auth.esqueceuSenha(body.email);
  }

  @Post("redefinir-senha")
  @HttpCode(200)
  @Throttle({ auth: { limit: 5, ttl: 60000 } })
  redefinirSenha(@Body(new ZodPipe(RedefinirSenhaSchema)) body: RedefinirSenhaInput) {
    return this.auth.redefinirSenha(body.token, body.novaSenha);
  }
}
