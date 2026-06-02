import { Controller, Post, Body, HttpCode, Res, BadRequestException } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { ApiOperation, ApiResponse, ApiTags, ApiBody } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { CadastroUsuarioSchema, LoginSchema } from "@imbobi/schemas";
import { ZodPipe } from "../../common/pipes/zod.pipe";

@ApiTags("Authentication")
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("registrar")
  @ApiOperation({
    summary: "Registrar novo usuário",
    description:
      "Cria uma nova conta de usuário no sistema. O refreshToken é retornado como HttpOnly cookie.",
  })
  @ApiBody({
    description: "Dados de cadastro do usuário",
    schema: {
      example: {
        nome: "João Silva",
        cpf: "12345678901",
        telefone: "11999999999",
        email: "joao@example.com",
        senha: "SecurePass123",
        tipo: "TOMADOR",
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: "Usuário criado com sucesso",
    schema: {
      example: {
        usuario: { id: "uuid", email: "joao@example.com", nome: "João Silva" },
        accessToken: "eyJhbGc...",
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Validação falhou: CPF inválido, email duplicado, etc",
  })
  @ApiResponse({
    status: 429,
    description: "Rate limit atingido (10 registros/min)",
  })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async registrar(
    @Body(new ZodPipe(CadastroUsuarioSchema)) body: unknown,
    @Res() res: any,
  ) {
    const result = await this.auth.registrar(body as never);
    this.setRefreshTokenCookie(res, result.refreshToken);
    return res.send({
      ...result.usuario,
      access_token: result.accessToken,
    });
  }

  @Post("login")
  @HttpCode(200)
  @ApiOperation({
    summary: "Login de usuário",
    description:
      "Autentica usuário com email e senha. Retorna accessToken (Bearer) e refreshToken (HttpOnly cookie).",
  })
  @ApiBody({
    description: "Credenciais de login",
    schema: {
      example: {
        email: "joao@example.com",
        senha: "SecurePass123",
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: "Login bem-sucedido",
    schema: {
      example: {
        usuario: { id: "uuid", email: "joao@example.com", nome: "João Silva" },
        accessToken: "eyJhbGc...",
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: "Credenciais inválidas ou usuário não encontrado",
  })
  @ApiResponse({
    status: 429,
    description: "Rate limit atingido (10 tentativas/min)",
  })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async login(@Body(new ZodPipe(LoginSchema)) body: unknown, @Res() res: any) {
    const result = await this.auth.login(body as never);
    this.setRefreshTokenCookie(res, result.refreshToken);
    return res.send({
      ...result.usuario,
      access_token: result.accessToken,
      refreshToken: result.refreshToken,
    });
  }

  @Post("renovar")
  @HttpCode(200)
  @ApiOperation({
    summary: "Renovar tokens",
    description:
      "Usa o refreshToken para obter um novo accessToken. refreshToken pode ser enviado no body ou como HttpOnly cookie.",
  })
  @ApiBody({
    description: "Refresh token (pode também vir do cookie)",
    schema: {
      example: {
        refreshToken: "eyJhbGc...",
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: "Novo accessToken gerado",
    schema: {
      example: {
        accessToken: "eyJhbGc...",
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: "RefreshToken inválido ou expirado",
  })
  @ApiResponse({
    status: 429,
    description: "Rate limit atingido (10 renovações/min)",
  })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async renovar(@Body("refreshToken") token: string, @Res() res: any) {
    const result = await this.auth.renovarToken(token);
    this.setRefreshTokenCookie(res, result.refreshToken);
    return res.send({ access_token: result.accessToken });
  }

  @Post("logout")
  @HttpCode(204)
  @ApiOperation({
    summary: "Logout de usuário",
    description:
      "Revoga o refreshToken e remove o cookie. O usuário não poderá renovar tokens após logout.",
  })
  @ApiBody({
    description: "Refresh token a ser revogado",
    schema: {
      example: {
        refreshToken: "eyJhbGc...",
      },
    },
  })
  @ApiResponse({
    status: 204,
    description: "Logout bem-sucedido (sem corpo de resposta)",
  })
  @ApiResponse({ status: 400, description: "RefreshToken não fornecido" })
  async logout(@Body("refreshToken") token: string, @Res() res: any) {
    if (!token) {
      throw new BadRequestException("RefreshToken é obrigatório");
    }
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
      }) ??
        res.cookie?.("refreshToken", token, {
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
