import { Controller, Get, UseGuards, UseInterceptors } from "@nestjs/common";
import { CacheInterceptor, CacheTTL } from "@nestjs/cache-manager";
import { ScoreService } from "./score.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";

@UseGuards(JwtAuthGuard)
@Controller("score")
export class ScoreController {
  constructor(private readonly score: ScoreService) {}

  @Get()
  @Get("atual")
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300) // 5 min
  async atual(@UsuarioAtual() u: IUsuario) {
    const scoreValue = await this.score.buscarScoreAtual(u.id);
    const nivel = this.score.obterNivel(scoreValue);
    return { score: scoreValue, ...nivel };
  }

  @Get("historico")
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(3600) // 1 hour
  historico(@UsuarioAtual() u: IUsuario) {
    return this.score.buscarHistorico(u.id);
  }
}
