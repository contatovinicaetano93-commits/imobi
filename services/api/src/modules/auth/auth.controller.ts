import { Controller, Post, Body, HttpCode, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import {
  CadastroUsuarioSchema,
  LoginSchema,
  EsqueceuSenhaSchema,
  RedefinirSenhaSchema,
  Totp2faConfirmarSchema,
  Totp2faVerificarLoginSchema,
  Totp2faDesativarSchema,
} from "@imbobi/schemas";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { UsuarioAtual } from "../../common/decorators/usuario-atual.decorator";
import type {
  CadastroUsuarioInput,
  LoginInput,
  EsqueceuSenhaInput,
  RedefinirSenhaInput,
  Totp2faConfirmarInput,
  Totp2faVerificarLoginInput,
  Totp2faDesativarInput,
} from "@imbobi/schemas";

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

  // ── 2FA TOTP ──────────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Post("2fa/ativar")
  @HttpCode(200)
  iniciar2fa(@UsuarioAtual() usuario: UsuarioAtual) {
    return this.auth.iniciar2fa(usuario.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post("2fa/confirmar")
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  confirmar2fa(
    @UsuarioAtual() usuario: UsuarioAtual,
    @Body(new ZodPipe(Totp2faConfirmarSchema)) body: Totp2faConfirmarInput,
  ) {
    return this.auth.confirmar2fa(usuario.id, body.totpCode);
  }

  @Post("2fa/verificar")
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  verificar2faLogin(
    @Body(new ZodPipe(Totp2faVerificarLoginSchema)) body: Totp2faVerificarLoginInput,
  ) {
    return this.auth.verificar2faLogin(body.tempToken, body.totpCode);
  }

  @UseGuards(JwtAuthGuard)
  @Post("2fa/desativar")
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  desativar2fa(
    @UsuarioAtual() usuario: UsuarioAtual,
    @Body(new ZodPipe(Totp2faDesativarSchema)) body: Totp2faDesativarInput,
  ) {
    return this.auth.desativar2fa(usuario.id, body.totpCode, body.senha);
  }
}
