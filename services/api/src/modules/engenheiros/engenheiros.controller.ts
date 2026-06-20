import { ApiTags } from "@nestjs/swagger";
import { Controller, Get, Patch, Param, Body, UseGuards } from "@nestjs/common";
import { EngenheirosService } from "./engenheiros.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";

@ApiTags("Engenheiros")
@Controller("engenheiros")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ENGENHEIRO", "ADMIN")
export class EngenheirosController {
  constructor(private readonly engenheirosService: EngenheirosService) {}

  @Get("visitas")
  listarVisitas(@UsuarioAtual() u: IUsuario) {
    return this.engenheirosService.listarVisitas(u.id);
  }

  @Get("visitas/:visitaId")
  obterVisita(@Param("visitaId") visitaId: string) {
    return this.engenheirosService.obterVisita(visitaId);
  }

  @Patch("visitas/:visitaId")
  atualizarVisita(
    @UsuarioAtual() u: IUsuario,
    @Param("visitaId") visitaId: string,
    @Body() body: { status?: string; dataAgendada?: string; observacoes?: string },
  ) {
    return this.engenheirosService.atualizarVisita(u.id, visitaId, body);
  }

  @Patch("visitas/:visitaId/aprovar")
  aprovarVistoria(
    @UsuarioAtual() u: IUsuario,
    @Param("visitaId") visitaId: string,
    @Body("observacao") observacao?: string,
  ) {
    return this.engenheirosService.aprovarVistoria(u.id, visitaId, observacao);
  }

  @Patch("visitas/:visitaId/rejeitar")
  rejeitarVistoria(
    @UsuarioAtual() u: IUsuario,
    @Param("visitaId") visitaId: string,
    @Body("motivo") motivo: string,
  ) {
    return this.engenheirosService.rejeitarVistoria(u.id, visitaId, motivo);
  }

  @Get("financeiro")
  financeiro(@UsuarioAtual() u: IUsuario) {
    return this.engenheirosService.financeiro(u.id);
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
