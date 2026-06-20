import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from "@nestjs/common";
import { DueDiligenceService, CriarDueDiligenceDto, AtualizarStatusDto } from "./due-diligence.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";

@UseGuards(JwtAuthGuard)
@ApiTags("Due Diligence")
@ApiBearerAuth("JWT")
@Controller("due-diligence")
export class DueDiligenceController {
  constructor(private readonly service: DueDiligenceService) {}

  @Post()
  criar(@UsuarioAtual() u: IUsuario, @Body() body: CriarDueDiligenceDto) {
    return this.service.criar(u.id, body);
  }

  @Get()
  listar(
    @UsuarioAtual() u: IUsuario,
    @Query("limit") limit = "20",
    @Query("offset") offset = "0",
  ) {
    return this.service.listar(u.id, Number(limit), Number(offset));
  }

  @Get(":id")
  buscar(@UsuarioAtual() u: IUsuario, @Param("id") id: string) {
    const isAdmin = u.tipo === "ADMIN";
    return this.service.buscar(id, u.id, isAdmin);
  }

  @UseGuards(RolesGuard)
  @Roles("ADMIN")
  @Patch(":id/status")
  atualizarStatus(@Param("id") id: string, @Body() body: AtualizarStatusDto) {
    return this.service.atualizarStatus(id, body);
  }
}
