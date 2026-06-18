import { Controller, Get, Post, Patch, Body, Param, UseGuards } from "@nestjs/common";
import { DueDiligenceService, CriarDueDiligenceDto, AtualizarStatusDto } from "./due-diligence.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";

@UseGuards(JwtAuthGuard)
@Controller("due-diligence")
export class DueDiligenceController {
  constructor(private readonly service: DueDiligenceService) {}

  @UseGuards(RolesGuard)
  @Roles("GESTOR", "ADMIN")
  @Post()
  criar(@UsuarioAtual() u: IUsuario, @Body() body: CriarDueDiligenceDto) {
    return this.service.criar(u.id, body);
  }

  @UseGuards(RolesGuard)
  @Roles("GESTOR", "ADMIN")
  @Get()
  listar(@UsuarioAtual() u: IUsuario) {
    return this.service.listar(u.id);
  }

  @UseGuards(RolesGuard)
  @Roles("GESTOR", "ADMIN")
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
