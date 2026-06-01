import { Controller, Get, UseGuards } from "@nestjs/common";
import { ScoreService } from "./score.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";

@ApiTags("credito")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("score")
export class ScoreController {
  constructor(private readonly score: ScoreService) {}

  @Get("atual")
  async atual(@UsuarioAtual() u: IUsuario) {
    const scoreValue = await this.score.buscarScoreAtual(u.id);
    const nivel = this.score.obterNivel(scoreValue);
    return { score: scoreValue, ...nivel };
  }

  @Get("historico")
  historico(@UsuarioAtual() u: IUsuario) {
    return this.score.buscarHistorico(u.id);
  }
}
