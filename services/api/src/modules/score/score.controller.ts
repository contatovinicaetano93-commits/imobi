import { Controller, Get, UseGuards } from "@nestjs/common";
import { ScoreService } from "./score.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";

@UseGuards(JwtAuthGuard)
@Controller("score")
export class ScoreController {
  constructor(private readonly score: ScoreService) {}

  @Get("atual")
  atual(@UsuarioAtual() u: IUsuario) {
    return this.score.buscarScoreAtual(u.id);
  }

  @Get("historico")
  historico(@UsuarioAtual() u: IUsuario) {
    return this.score.buscarHistorico(u.id);
  }
}
