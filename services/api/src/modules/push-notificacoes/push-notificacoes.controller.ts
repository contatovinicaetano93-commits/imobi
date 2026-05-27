import { Controller, Post, Delete, Body, UseGuards, Req } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PushNotificacoesService } from "./push-notificacoes.service";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import { z } from "zod";

const PushTokenSchema = z.object({
  token: z.string().min(10).max(500), // FCM tokens são strings longas
});

@Controller("push-notificacoes")
@UseGuards(JwtAuthGuard)
export class PushNotificacoesController {
  constructor(private readonly pushNotificacoes: PushNotificacoesService) {}

  @Post("registrar-token")
  async registrarToken(
    @Req() req: any,
    @Body(new ZodPipe(PushTokenSchema)) body: unknown
  ) {
    const validated = body as { token: string };
    await this.pushNotificacoes.registrarToken(req.user.id, validated.token);
    return { ok: true };
  }

  @Delete("desregistrar-token")
  async desregistrarToken(
    @Req() req: any,
    @Body(new ZodPipe(PushTokenSchema)) body: unknown
  ) {
    const validated = body as { token: string };
    await this.pushNotificacoes.desregistrarToken(req.user.id, validated.token);
    return { ok: true };
  }
}
