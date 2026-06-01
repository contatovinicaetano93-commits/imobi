import { Controller, Post, Body, HttpCode } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { CadastroUsuarioSchema, LoginSchema } from "@imbobi/schemas";
import { ZodPipe } from "../../common/pipes/zod.pipe";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("registrar")
  registrar(@Body(new ZodPipe(CadastroUsuarioSchema)) body: unknown) {
    return this.auth.registrar(body as never);
  }

  @Post("login")
  @HttpCode(200)
  login(@Body(new ZodPipe(LoginSchema)) body: unknown) {
    return this.auth.login(body as never);
  }

  @Post("renovar")
  @HttpCode(200)
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
