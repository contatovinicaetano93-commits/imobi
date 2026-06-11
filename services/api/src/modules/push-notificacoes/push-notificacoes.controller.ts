import { BadRequestException, Controller, Delete, Post, Req, Body, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PushNotificacoesService } from "./push-notificacoes.service";

@Controller("push-notificacoes")
@UseGuards(JwtAuthGuard)
export class PushNotificacoesController {
  constructor(private readonly pushNotificacoes: PushNotificacoesService) {}

  @Post("registrar-token")
  async registrarToken(@Req() req: any, @Body() body: { token: string }) {
    if (!body.token || typeof body.token !== "string" || body.token.trim().length === 0) {
      throw new BadRequestException("token é obrigatório");
    }
    await this.pushNotificacoes.registrarToken(req.user.id, body.token.trim());
    return { ok: true };
  }

  @Delete("desregistrar-token")
  async desregistrarToken(@Req() req: any, @Body() body: { token: string }) {
    if (!body.token || typeof body.token !== "string" || body.token.trim().length === 0) {
      throw new BadRequestException("token é obrigatório");
    }
    await this.pushNotificacoes.desregistrarToken(req.user.id, body.token.trim());
    return { ok: true };
  }
}
