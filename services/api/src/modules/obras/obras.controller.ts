import { Controller, Get, Post, Body, Param, UseGuards } from "@nestjs/common";
import { ObrasService } from "./obras.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import { CriarObraSchema } from "@imbobi/schemas";
import type { CriarObraInput } from "@imbobi/schemas";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";

@ApiTags("obras")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("obras")
export class ObrasController {
  constructor(private readonly obras: ObrasService) {}

  @ApiOperation({ summary: "Criar nova obra" })
  @Post()
  criar(
    @UsuarioAtual() u: IUsuario,
    @Body(new ZodPipe(CriarObraSchema)) body: CriarObraInput
  ) {
    return this.obras.criar(u.id, body);
  }

  @ApiOperation({ summary: "Listar obras do usuário" })
  @Get()
  listar(@UsuarioAtual() u: IUsuario) {
    return this.obras.listar(u.id);
  }

  @ApiOperation({ summary: "Buscar obra por ID" })
  @Get(":id")
  buscar(@UsuarioAtual() u: IUsuario, @Param("id") id: string) {
    return this.obras.buscar(u, id);
  }

  @ApiOperation({ summary: "Consultar progresso geral da obra" })
  @Get(":id/progresso")
  progresso(@UsuarioAtual() u: IUsuario, @Param("id") id: string) {
    return this.obras.progressoGeral(u, id);
  }
}
