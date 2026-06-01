import { Controller, Get, Post, Body, Param, UseGuards } from "@nestjs/common";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from "@nestjs/swagger";
import { ObrasService } from "./obras.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import {
  UsuarioAtual,
  type UsuarioAtual as IUsuario,
} from "../../common/decorators/usuario-atual.decorator";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import { CriarObraSchema } from "@imbobi/schemas";

@ApiTags("obras")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("obras")
export class ObrasController {
  constructor(private readonly obras: ObrasService) {}

  @Post()
  @ApiOperation({
    summary: "Criar obra",
    description:
      "Registra um novo projeto de construção com endereço e coordenadas GPS",
  })
  @ApiResponse({ status: 201, description: "Obra criada com sucesso" })
  @ApiResponse({ status: 400, description: "Dados inválidos" })
  criar(
    @UsuarioAtual() u: IUsuario,
    @Body(new ZodPipe(CriarObraSchema)) body: unknown,
  ) {
    return this.obras.criar(u.id, body as never);
  }

  @Get()
  listar(@UsuarioAtual() u: IUsuario) {
    return this.obras.listar(u.id);
  }

  @Get(":id")
  @ApiOperation({
    summary: "Buscar obra",
    description: "Retorna detalhes de uma obra específica",
  })
  @ApiParam({ name: "id", description: "ID da obra" })
  @ApiResponse({ status: 200, description: "Obra encontrada" })
  @ApiResponse({ status: 404, description: "Obra não encontrada" })
  buscar(@UsuarioAtual() u: IUsuario, @Param("id") id: string) {
    return this.obras.buscar(u.id, id);
  }

  @Get(":id/progresso")
  @ApiOperation({
    summary: "Progresso geral",
    description: "Retorna o progresso geral de construção de uma obra",
  })
  @ApiParam({ name: "id", description: "ID da obra" })
  @ApiResponse({ status: 200, description: "Progresso calculado" })
  progresso(@Param("id") id: string) {
    return this.obras.progressoGeral(id);
  }
}
