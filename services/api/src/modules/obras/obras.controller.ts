import { Controller, Get, Post, Body, Param, UseGuards } from "@nestjs/common";
import { ObrasService } from "./obras.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import { CriarObraSchema } from "@imbobi/schemas";
import { Throttle } from "../../common/decorators/throttle.decorator";
import { UserThrottlerGuard } from "../../common/guards/user-throttler.guard";

@UseGuards(JwtAuthGuard)
@Controller("obras")
export class ObrasController {
  constructor(private readonly obras: ObrasService) {}

  @Post()
  @UseGuards(UserThrottlerGuard)
  @Throttle(5, 3600000) // 5 requests per hour per user
  criar(
    @UsuarioAtual() u: IUsuario,
    @Body(new ZodPipe(CriarObraSchema)) body: unknown
  ) {
    return this.obras.criar(u.id, body as never);
  }

  @Get()
  listar(@UsuarioAtual() u: IUsuario) {
    return this.obras.listar(u.id);
  }

  @Get(":id")
  buscar(@UsuarioAtual() u: IUsuario, @Param("id") id: string) {
    return this.obras.buscar(u.id, id);
  }

  @Get(":id/progresso")
  progresso(@Param("id") id: string) {
    return this.obras.progressoGeral(id);
  }
}
