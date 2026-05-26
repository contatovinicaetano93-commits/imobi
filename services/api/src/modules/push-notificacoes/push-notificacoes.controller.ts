import { Controller, Post, Delete, Body, UseGuards, Req } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PushNotificacoesService } from "./push-notificacoes.service";

@Controller("push-notificacoes")
@UseGuards(JwtAuthGuard)
export class PushNotificacoesController {
  constructor(private readonly pushNotificacoes: PushNotificacoesService) {}

  @Post("registrar-token")
  async registrarToken(@Req() req: any, @Body() body: { token: string }) {
    await this.pushNotificacoes.registrarToken(req.user.id, body.token);
    return { ok: true };
  }

  @Delete("desregistrar-token")
  async desregistrarToken(@Req() req: any, @Body() body: { token: string }) {
    await this.pushNotificacoes.desregistrarToken(req.user.id, body.token);
    return { ok: true };
  }
}
