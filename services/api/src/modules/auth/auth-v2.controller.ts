import { Controller, Post, Body, HttpCode, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { CadastroUsuarioSchema, LoginSchema, EsqueceuSenhaSchema, RedefinirSenhaSchema } from "@imbobi/schemas";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { ApiVersion } from "../../common/decorators/api-version.decorator";
import type { CadastroUsuarioInput, LoginInput, EsqueceuSenhaInput, RedefinirSenhaInput } from "@imbobi/schemas";

@Controller({ path: 'auth', version: '2' })
@ApiVersion('2')
export class AuthV2Controller {
  constructor(private readonly auth: AuthService) {}

  @Post("registrar")
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  registrar(@Body(new ZodPipe(CadastroUsuarioSchema)) body: CadastroUsuarioInput) {
    return {
      version: '2.0',
      data: this.auth.registrar(body),
      timestamp: new Date().toISOString(),
    };
  }

  @Post("login")
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  login(@Body(new ZodPipe(LoginSchema)) body: LoginInput) {
    return {
      version: '2.0',
      data: this.auth.login(body),
      timestamp: new Date().toISOString(),
    };
  }

  @Post("renovar")
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  renovar(@Body("refreshToken") token: string) {
    return {
      version: '2.0',
      data: this.auth.renovarToken(token),
      timestamp: new Date().toISOString(),
    };
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
    return {
      version: '2.0',
      data: this.auth.esqueceuSenha(body.email),
      timestamp: new Date().toISOString(),
    };
  }

  @Post("redefinir-senha")
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  redefinirSenha(@Body(new ZodPipe(RedefinirSenhaSchema)) body: RedefinirSenhaInput) {
    return {
      version: '2.0',
      data: this.auth.redefinirSenha(body.token, body.novaSenha),
      timestamp: new Date().toISOString(),
    };
  }
}
