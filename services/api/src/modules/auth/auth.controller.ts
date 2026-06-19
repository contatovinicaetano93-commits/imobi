import { Controller, Post, Delete, Get, Param, Body, HttpCode, UseGuards, Headers, Ip } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { CadastroUsuarioSchema, LoginSchema, EsqueceuSenhaSchema, RedefinirSenhaSchema } from "@imbobi/schemas";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";
import type { CadastroUsuarioInput, LoginInput, EsqueceuSenhaInput, RedefinirSenhaInput } from "@imbobi/schemas";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("registrar")
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  registrar(
    @Body(new ZodPipe(CadastroUsuarioSchema)) body: CadastroUsuarioInput,
    @Headers("user-agent") userAgent: string,
    @Ip() ip: string,
  ) {
    return this.auth.registrar(body, { userAgent, ip });
  }

  @Post("login")
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  login(
    @Body(new ZodPipe(LoginSchema)) body: LoginInput,
    @Headers("user-agent") userAgent: string,
    @Ip() ip: string,
  ) {
    return this.auth.login(body, { userAgent, ip });
  }

  @Post("renovar")
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  renovar(
    @Body("refreshToken") token: string,
    @Headers("user-agent") userAgent: string,
    @Ip() ip: string,
  ) {
    return this.auth.renovarToken(token, { userAgent, ip });
  }

  @UseGuards(JwtAuthGuard)
  @Post("logout")
  @HttpCode(204)
  logout(@Body("refreshToken") token: string) {
    return this.auth.revogarToken(token);
  }

  @Post("esqueceu-senha")
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60000 }, hour: { limit: 10, ttl: 3600000 } })
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
  @Delete("sessoes")
  @HttpCode(204)
  revogarTodasSessoes(@UsuarioAtual() u: IUsuario) {
    return this.auth.revogarTodasSessoes(u.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get("sessoes")
  listarSessoes(@UsuarioAtual() u: IUsuario) {
    return this.auth.listarSessoes(u.id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete("sessoes/:sessionId")
  @HttpCode(204)
  revogarSessaoEspecifica(
    @UsuarioAtual() u: IUsuario,
    @Param("sessionId") sessionId: string,
  ) {
    return this.auth.revogarSessaoEspecifica(u.id, sessionId);
  }
}
