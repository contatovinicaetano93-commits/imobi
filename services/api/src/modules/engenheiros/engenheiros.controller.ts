import { Controller, Get, Patch, Param, Body, UseGuards, Req } from "@nestjs/common";
import { EngenheirosService } from "./engenheiros.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";

@Controller("engenheiros")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ENGENHEIRO", "ADMIN")
export class EngenheirosController {
  constructor(private readonly engenheirosService: EngenheirosService) {}

  @Get("visitas")
  listarVisitas(@Req() req: any) {
    return this.engenheirosService.listarVisitas(req.user.id);
  }

  @Get("visitas/:visitaId")
  obterVisita(@Param("visitaId") visitaId: string) {
    return this.engenheirosService.obterVisita(visitaId);
  }

  @Patch("visitas/:visitaId")
  atualizarVisita(
    @Req() req: any,
    @Param("visitaId") visitaId: string,
    @Body() body: { status?: string; dataAgendada?: string; observacoes?: string }
  ) {
    return this.engenheirosService.atualizarVisita(req.user.id, visitaId, body);
  }

  @Get("financeiro")
  financeiro(@Req() req: any) {
    return this.engenheirosService.financeiro(req.user.id);
  }

  @Get("licencas")
  licencas() {
    return this.engenheirosService.licencas();
  }
}
