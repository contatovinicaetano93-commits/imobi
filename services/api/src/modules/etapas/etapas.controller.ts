import { Controller, Get, Patch, Param, Body, UseGuards } from "@nestjs/common";
import { EtapasService } from "./etapas.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";

@UseGuards(JwtAuthGuard)
@Controller("etapas")
export class EtapasController {
  constructor(private readonly etapas: EtapasService) {}

  @Get("obra/:obraId")
  listar(@Param("obraId") obraId: string) {
    return this.etapas.listarPorObra(obraId);
  }

  @UseGuards(RolesGuard)
  @Roles("GESTOR", "ADMIN")
  @Patch(":id/aprovar")
  aprovar(
    @Param("id") id: string,
    @UsuarioAtual() u: IUsuario,
    @Body("observacao") obs?: string
  ) {
    return this.etapas.aprovar(u.id, id, obs);
  }

  @Patch(":id/status")
  status(@Param("id") id: string, @Body("status") status: string, @UsuarioAtual() u: IUsuario) {
    return this.etapas.atualizarStatus(id, status, u.id, u.tipo);
  }
}
