import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { Controller, Get, Patch, Param, Body, UseGuards } from "@nestjs/common";
import { EtapasService } from "./etapas.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";

@UseGuards(JwtAuthGuard)
@ApiTags("Etapas")
@ApiBearerAuth("JWT")
@Controller("etapas")
export class EtapasController {
  constructor(private readonly etapas: EtapasService) {}

  @Get("obra/:obraId")
  listar(@Param("obraId") obraId: string) {
    return this.etapas.listarPorObra(obraId);
  }

  @Get(":id")
  buscar(@Param("id") id: string) {
    return this.etapas.buscar(id);
  }

  @UseGuards(RolesGuard)
  @Roles("ENGENHEIRO", "ADMIN")
  @Patch(":id/aprovar")
  aprovar(
    @Param("id") id: string,
    @UsuarioAtual() u: IUsuario,
    @Body("observacao") obs?: string
  ) {
    return this.etapas.aprovar(u.id, id, obs);
  }

  @UseGuards(RolesGuard)
  @Roles("ENGENHEIRO", "ADMIN")
  @Patch(":id/rejeitar")
  rejeitar(
    @Param("id") id: string,
    @UsuarioAtual() u: IUsuario,
    @Body("motivo") motivo: string,
  ) {
    return this.etapas.rejeitar(u.id, id, motivo);
  }

  @Patch(":id/status")
  status(@Param("id") id: string, @Body("status") status: string, @UsuarioAtual() u: IUsuario) {
    return this.etapas.atualizarStatus(id, status, u.id, u.tipo);
  }
}
