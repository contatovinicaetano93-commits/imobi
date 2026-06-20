import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { Controller, Post, Delete, Body, UseGuards, HttpCode } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PushNotificacoesService } from "./push-notificacoes.service";
import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import { PushTokenSchema } from "@imbobi/schemas";
import type { PushTokenInput } from "@imbobi/schemas";

@ApiTags("Push Notificações")
@ApiBearerAuth("JWT")
@Controller("push-notificacoes")
@UseGuards(JwtAuthGuard)
export class PushNotificacoesController {
  constructor(private readonly pushNotificacoes: PushNotificacoesService) {}

  @Post("registrar-token")
  async registrarToken(
    @UsuarioAtual() u: IUsuario,
    @Body(new ZodPipe(PushTokenSchema)) body: PushTokenInput,
  ) {
    await this.pushNotificacoes.registrarToken(u.id, body.token);
    return { ok: true };
  }

  @Delete("desregistrar-token")
  @HttpCode(204)
  async desregistrarToken(
    @UsuarioAtual() u: IUsuario,
    @Body(new ZodPipe(PushTokenSchema)) body: PushTokenInput,
  ) {
    await this.pushNotificacoes.desregistrarToken(u.id, body.token);
  }
}
