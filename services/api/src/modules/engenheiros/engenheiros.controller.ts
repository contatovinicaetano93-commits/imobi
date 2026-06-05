import { Controller, Get, Patch, Param, Body, UseGuards, Req } from "@nestjs/common";
import { EngenheirosService } from "./engenheiros.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";

@Controller("engenheiros")
@UseGuards(JwtAuthGuard)
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
}
