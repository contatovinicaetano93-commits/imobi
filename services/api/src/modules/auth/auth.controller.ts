import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { Controller, Get, Post, Delete, Body, Headers, HttpCode, Param, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { CadastroUsuarioSchema, LoginSchema, EsqueceuSenhaSchema, RedefinirSenhaSchema } from "@imbobi/schemas";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";
import type { CadastroUsuarioInput, LoginInput, EsqueceuSenhaInput, RedefinirSenhaInput } from "@imbobi/schemas";

@ApiTags("Autenticação")
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
  @ApiBearerAuth("JWT")
  @Get("sessoes")
  sessoes(@UsuarioAtual() u: IUsuario) {
    return this.auth.listarSessoes(u.id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("JWT")
  @Delete("sessoes/:sessionId")
  @HttpCode(204)
  revogarSessao(@Param("sessionId") sessionId: string, @UsuarioAtual() u: IUsuario) {
    return this.auth.revogarSessao(u.id, sessionId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("JWT")
  @Post("logout")
  @HttpCode(204)
  logout(
    @Body("refreshToken") token: string,
    @Headers("authorization") authHeader: string,
  ) {
    const accessToken = authHeader?.replace(/^Bearer\s+/i, '');
    return this.auth.revogarToken(token, accessToken);
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
}
