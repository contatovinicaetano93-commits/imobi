import { Controller, Post, Delete, Get, Param, Body, HttpCode, UseGuards, Headers, Ip } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { CadastroUsuarioSchema, LoginSchema, EsqueceuSenhaSchema, RedefinirSenhaSchema } from "@imbobi/schemas";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";
import type { CadastroUsuarioInput, LoginInput, EsqueceuSenhaInput, RedefinirSenhaInput } from "@imbobi/schemas";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @ApiOperation({ summary: "Registrar novo usuário" })
  @Post("registrar")
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  registrar(
    @Body(new ZodPipe(CadastroUsuarioSchema)) body: CadastroUsuarioInput,
    @Headers("user-agent") userAgent: string,
    @Ip() ip: string,
  ) {
    return this.auth.registrar(body, { userAgent, ip });
  }

  @ApiOperation({ summary: "Autenticar usuário" })
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

  @ApiOperation({ summary: "Renovar tokens via refresh token" })
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

  @ApiBearerAuth()
  @ApiOperation({ summary: "Invalidar refresh token atual" })
  @UseGuards(JwtAuthGuard)
  @Post("logout")
  @HttpCode(204)
  logout(@Body("refreshToken") token: string) {
    return this.auth.revogarToken(token);
  }

  @ApiOperation({ summary: "Solicitar redefinição de senha" })
  @Post("esqueceu-senha")
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60000 }, hour: { limit: 10, ttl: 3600000 } })
  esqueceuSenha(@Body(new ZodPipe(EsqueceuSenhaSchema)) body: EsqueceuSenhaInput) {
    return this.auth.esqueceuSenha(body.email);
  }

  @ApiOperation({ summary: "Redefinir senha com token" })
  @Post("redefinir-senha")
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  redefinirSenha(@Body(new ZodPipe(RedefinirSenhaSchema)) body: RedefinirSenhaInput) {
    return this.auth.redefinirSenha(body.token, body.novaSenha);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: "Revogar todas as sessões ativas" })
  @UseGuards(JwtAuthGuard)
  @Delete("sessoes")
  @HttpCode(204)
  revogarTodasSessoes(@UsuarioAtual() u: IUsuario) {
    return this.auth.revogarTodasSessoes(u.id);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: "Listar sessões ativas do usuário" })
  @UseGuards(JwtAuthGuard)
  @Get("sessoes")
  listarSessoes(@UsuarioAtual() u: IUsuario) {
    return this.auth.listarSessoes(u.id);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: "Revogar uma sessão específica" })
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
