import { Controller, Get, Post, Body, Param, UseGuards, UseInterceptors } from "@nestjs/common";
import { CacheInterceptor, CacheTTL } from "@nestjs/cache-manager";
import { ObrasService } from "./obras.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import { CriarObraSchema } from "@imbobi/schemas";

@UseGuards(JwtAuthGuard)
@Controller("obras")
export class ObrasController {
  constructor(private readonly obras: ObrasService) {}

  @Post()
  criar(
    @UsuarioAtual() u: IUsuario,
    @Body(new ZodPipe(CriarObraSchema)) body: unknown
  ) {
    return this.obras.criar(u.id, body as never);
  }

  @Get()
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300) // 5 min
  listar(@UsuarioAtual() u: IUsuario) {
    return this.obras.listar(u.id);
  }

  @Get(":id")
  buscar(@UsuarioAtual() u: IUsuario, @Param("id") id: string) {
    return this.obras.buscar(u.id, id, u.tipo);
  }

  @Get(":id/progresso")
  progresso(@Param("id") id: string) {
    return this.obras.progressoGeral(id);
  }
}
