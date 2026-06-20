import { Controller, Post, Delete, Body, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PushNotificacoesService } from "./push-notificacoes.service";
import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";

@Controller("push-notificacoes")
@UseGuards(JwtAuthGuard)
export class PushNotificacoesController {
  constructor(private readonly pushNotificacoes: PushNotificacoesService) {}

  @Post("registrar-token")
  async registrarToken(@UsuarioAtual() u: IUsuario, @Body() body: { token: string }) {
    await this.pushNotificacoes.registrarToken(u.id, body.token);
    return { ok: true };
  }

  @Delete("desregistrar-token")
  async desregistrarToken(@UsuarioAtual() u: IUsuario, @Body() body: { token: string }) {
    await this.pushNotificacoes.desregistrarToken(u.id, body.token);
    return { ok: true };
  }
}
