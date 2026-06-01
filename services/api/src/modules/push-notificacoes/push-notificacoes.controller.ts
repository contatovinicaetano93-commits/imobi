import { Controller, Post, Delete, Body, UseGuards, Req } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PushNotificacoesService } from "./push-notificacoes.service";

@ApiTags("notificacoes")
@ApiBearerAuth()
@Controller("push-notificacoes")
@UseGuards(JwtAuthGuard)
export class PushNotificacoesController {
  constructor(private readonly pushNotificacoes: PushNotificacoesService) {}

  @Post("registrar-token")
  @ApiOperation({
    summary: "Registrar token push",
    description: "Registra token FCM para push notifications em mobile",
  })
  @ApiResponse({ status: 201, description: "Token registrado com sucesso" })
  async registrarToken(@Req() req: any, @Body() body: { token: string }) {
    await this.pushNotificacoes.registrarToken(req.user.id, body.token);
    return { ok: true };
  }

  @Delete("desregistrar-token")
  @ApiOperation({
    summary: "Desregistrar token push",
    description: "Remove token FCM do usuário",
  })
  @ApiResponse({ status: 200, description: "Token removido com sucesso" })
  async desregistrarToken(@Req() req: any, @Body() body: { token: string }) {
    await this.pushNotificacoes.desregistrarToken(req.user.id, body.token);
    return { ok: true };
  }
}
