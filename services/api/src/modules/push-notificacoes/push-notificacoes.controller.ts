import { Controller, Post, Delete, Body, UseGuards, Req } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PushNotificacoesService } from "./push-notificacoes.service";

@ApiTags("push-notificacoes")
@ApiBearerAuth()
@Controller("push-notificacoes")
@UseGuards(JwtAuthGuard)
export class PushNotificacoesController {
  constructor(private readonly pushNotificacoes: PushNotificacoesService) {}

  @ApiOperation({ summary: "Registrar token de push notification do dispositivo" })
  @Post("registrar-token")
  async registrarToken(@Req() req: any, @Body() body: { token: string }) {
    await this.pushNotificacoes.registrarToken(req.user.id, body.token);
    return { ok: true };
  }

  @ApiOperation({ summary: "Desregistrar token de push notification" })
  @Delete("desregistrar-token")
  async desregistrarToken(@Req() req: any, @Body() body: { token: string }) {
    await this.pushNotificacoes.desregistrarToken(req.user.id, body.token);
    return { ok: true };
  }
}
