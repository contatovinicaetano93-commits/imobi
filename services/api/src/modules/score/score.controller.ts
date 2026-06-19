import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ScoreService } from "./score.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";

@ApiTags("score")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("score")
export class ScoreController {
  constructor(private readonly score: ScoreService) {}

  @ApiOperation({ summary: "Obter score atual do usuário" })
  @Get("atual")
  async atual(@UsuarioAtual() u: IUsuario) {
    const scoreValue = await this.score.buscarScoreAtual(u.id);
    const nivel = this.score.obterNivel(scoreValue);
    return { score: scoreValue, ...nivel };
  }

  @ApiOperation({ summary: "Histórico de score com paginação" })
  @Get("historico")
  async historico(
    @UsuarioAtual() u: IUsuario,
    @Query("limit") limit = "12",
    @Query("page") page = "1",
  ) {
    const lim = Math.min(Math.max(Number(limit) || 12, 1), 100);
    const pg = Math.max(Number(page) || 1, 1);
    const offset = (pg - 1) * lim;
    const [data, total] = await Promise.all([
      this.score.buscarHistorico(u.id, lim, offset),
      this.score.contarHistorico(u.id),
    ]);
    return { data, total, page: pg, limit: lim };
  }
}
