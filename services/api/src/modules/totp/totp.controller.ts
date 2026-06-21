import { Controller, Post, Body, UseGuards, HttpCode } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { TotpService } from "./totp.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { UsuarioAtual } from "../../common/decorators/usuario-atual.decorator";

@ApiTags("TOTP / 2FA")
@ApiBearerAuth("JWT")
@UseGuards(JwtAuthGuard)
@Controller("auth/totp")
export class TotpController {
  constructor(private readonly totp: TotpService) {}

  /** Passo 1: gera QR code. Deve ser exibido ao usuário para escanear. */
  @Post("configurar")
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  configurar(@UsuarioAtual("usuarioId") usuarioId: string) {
    return this.totp.configurar(usuarioId);
  }

  /** Passo 2: confirma com OTP e ativa 2FA. Retorna backup codes (exibir uma única vez). */
  @Post("ativar")
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  ativar(@UsuarioAtual("usuarioId") usuarioId: string, @Body("otp") otp: string) {
    return this.totp.ativar(usuarioId, otp);
  }

  /** Desativa o 2FA após verificar OTP ou backup code. */
  @Post("desativar")
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  desativar(@UsuarioAtual("usuarioId") usuarioId: string, @Body("otp") otp: string) {
    return this.totp.desativar(usuarioId, otp);
  }
}
