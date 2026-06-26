import { Controller, Get, Patch, Param, Body, UseGuards } from "@nestjs/common";
import { EngenheirosService } from "./engenheiros.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";

@Controller("engenheiros")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ENGENHEIRO", "ADMIN")
export class EngenheirosController {
  constructor(private readonly engenheirosService: EngenheirosService) {}

  @Get("visitas")
  listarVisitas(@UsuarioAtual() user: IUsuario) {
    return this.engenheirosService.listarVisitas(user.id);
  }

  @Get("visitas/:visitaId")
  obterVisita(@UsuarioAtual() user: IUsuario, @Param("visitaId") visitaId: string) {
    return this.engenheirosService.obterVisita(visitaId, user.id, user.tipo);
  }

  @Patch("visitas/:visitaId")
  atualizarVisita(
    @UsuarioAtual() user: IUsuario,
    @Param("visitaId") visitaId: string,
    @Body() body: { status?: string; dataAgendada?: string; observacoes?: string }
  ) {
    return this.engenheirosService.atualizarVisita(user.id, user.tipo, visitaId, body);
  }

  @Patch("visitas/:visitaId/aprovar")
  aprovarVistoria(
    @UsuarioAtual() user: IUsuario,
    @Param("visitaId") visitaId: string,
    @Body("observacao") observacao?: string,
  ) {
    return this.engenheirosService.aprovarVistoria(user.id, visitaId, observacao);
  }

  @Patch("visitas/:visitaId/rejeitar")
  rejeitarVistoria(
    @UsuarioAtual() user: IUsuario,
    @Param("visitaId") visitaId: string,
    @Body("motivo") motivo: string,
  ) {
    return this.engenheirosService.rejeitarVistoria(user.id, visitaId, motivo);
  }

  @Get("financeiro")
  financeiro(@UsuarioAtual() user: IUsuario) {
    return this.engenheirosService.financeiro(user.id);
  }

  @Get("licencas")
  licencas() {
    return this.engenheirosService.licencas();
  }

  @Get("obras/:obraId/etapas")
  etapasDaObra(@Param("obraId") obraId: string) {
    return this.engenheirosService.etapasDaObra(obraId);
  }
}
