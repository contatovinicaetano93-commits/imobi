import { Controller, Post, Body, HttpCode, BadRequestException } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { CadastroUsuarioSchema, LoginSchema } from "@imbobi/schemas";
import { ZodPipe } from "../../common/pipes/zod.pipe";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("registrar")
  @HttpCode(201)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: "Registrar novo usuário", description: "Cria uma nova conta de usuário com email e senha" })
  @ApiResponse({ status: 201, description: "Usuário registrado com sucesso" })
  @ApiResponse({ status: 400, description: "Dados inválidos ou email já registrado" })
  registrar(@Body(new ZodPipe(CadastroUsuarioSchema)) body: unknown) {
    return this.auth.registrar(body as never);
  }

  @Post("login")
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: "Fazer login", description: "Autentica um usuário e retorna JWT tokens" })
  @ApiResponse({ status: 200, description: "Login bem-sucedido, tokens retornados" })
  @ApiResponse({ status: 401, description: "Email ou senha incorretos" })
  login(@Body(new ZodPipe(LoginSchema)) body: unknown) {
    return this.auth.login(body as never);
  }

  @Post("renovar")
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: "Renovar token de acesso", description: "Usa refresh token para gerar novo access token" })
  @ApiResponse({ status: 200, description: "Token renovado com sucesso" })
  @ApiResponse({ status: 401, description: "Refresh token inválido ou expirado" })
  renovar(@Body("refreshToken") token: string) {
    if (!token?.trim()) {
      throw new BadRequestException("refreshToken é obrigatório");
    }
    return this.auth.renovarToken(token);
  }

  @Post("logout")
  @HttpCode(204)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Fazer logout", description: "Invalida o refresh token e encerra a sessão" })
  @ApiResponse({ status: 204, description: "Logout bem-sucedido" })
  logout(@Body("refreshToken") token: string) {
    if (!token?.trim()) {
      throw new BadRequestException("refreshToken é obrigatório");
    }
    return this.auth.revogarToken(token);
  }
}
