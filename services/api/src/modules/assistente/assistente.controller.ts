import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { assistenteChatRequestSchema } from "@imbobi/schemas";
import type { AssistenteChatRequest } from "@imbobi/schemas";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import {
  UsuarioAtual,
  type UsuarioAtual as IUsuario,
} from "../../common/decorators/usuario-atual.decorator";
import { AssistenteService } from "./assistente.service";

@UseGuards(JwtAuthGuard)
@Controller("assistente")
export class AssistenteController {
  constructor(private readonly assistente: AssistenteService) {}

  @Post("chat")
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  chat(
    @UsuarioAtual() u: IUsuario,
    @Body(new ZodPipe(assistenteChatRequestSchema)) body: AssistenteChatRequest,
  ) {
    return this.assistente.chat(body, { role: u.tipo });
  }
}
