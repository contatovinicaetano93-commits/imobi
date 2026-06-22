import { Controller, Post, Body, HttpCode, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { CadastroUsuarioSchema, LoginSchema, EsqueceuSenhaSchema, RedefinirSenhaSchema } from "@imbobi/schemas";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { UsuarioAtual } from "../../common/decorators/usuario-atual.decorator";
import type { CadastroUsuarioInput, LoginInput, EsqueceuSenhaInput, RedefinirSenhaInput } from "@imbobi/schemas";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("registrar")
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  registrar(@Body(new ZodPipe(CadastroUsuarioSchema)) body: CadastroUsuarioInput) {
    return this.auth.registrar(body);
  }

  @Post("login")
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  login(@Body(new ZodPipe(LoginSchema)) body: LoginInput) {
    return this.auth.login(body);
  }

  @Post("renovar")
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
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
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  esqueceuSenha(@Body(new ZodPipe(EsqueceuSenhaSchema)) body: EsqueceuSenhaInput) {
    return this.auth.esqueceuSenha(body.email);
  }

  @Post("redefinir-senha")
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  redefinirSenha(@Body(new ZodPipe(RedefinirSenhaSchema)) body: RedefinirSenhaInput) {
    return this.auth.redefinirSenha(body.token, body.novaSenha);
  }

  @UseGuards(JwtAuthGuard)
  @Post("mfa/setup")
  @HttpCode(200)
  setupMfa(@UsuarioAtual() u: { id: string }) {
    return this.auth.setupMfa(u.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post("mfa/ativar")
  @HttpCode(200)
  ativarMfa(@UsuarioAtual() u: { id: string }, @Body("code") code: string) {
    return this.auth.ativarMfa(u.id, code);
  }

  @Post("mfa/verificar")
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  verificarMfa(@Body() body: { mfaToken: string; code: string }) {
    return this.auth.verificarMfaLogin(body.mfaToken, body.code);
  }
}
