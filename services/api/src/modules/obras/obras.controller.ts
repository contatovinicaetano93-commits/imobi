import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { Controller, Get, Post, Body, Param, UseGuards, HttpCode } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { ObrasService } from "./obras.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import { CriarObraSchema } from "@imbobi/schemas";
import type { CriarObraInput } from "@imbobi/schemas";

@UseGuards(JwtAuthGuard)
@ApiTags("Obras")
@ApiBearerAuth("JWT")
@Controller("obras")
export class ObrasController {
  constructor(private readonly obras: ObrasService) {}

  @Post()
  @HttpCode(201)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  criar(
    @UsuarioAtual() u: IUsuario,
    @Body(new ZodPipe(CriarObraSchema)) body: CriarObraInput
  ) {
    return this.obras.criar(u.id, body);
  }

  @Get()
  listar(@UsuarioAtual() u: IUsuario) {
    return this.obras.listar(u.id);
  }

  @Get(":id")
  buscar(@UsuarioAtual() u: IUsuario, @Param("id") id: string) {
    return this.obras.buscar(u, id);
  }

  @Get(":id/progresso")
  progresso(@UsuarioAtual() u: IUsuario, @Param("id") id: string) {
    return this.obras.progressoGeral(u, id);
  }
}
