import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { Controller, Get, UseGuards, UseInterceptors } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { CacheInterceptor, CacheTTL } from "@nestjs/cache-manager";
import { ScoreService } from "./score.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";

@UseGuards(JwtAuthGuard)
@ApiTags("Score")
@ApiBearerAuth("JWT")
@Controller("score")
export class ScoreController {
  constructor(private readonly score: ScoreService) {}

  @Get("atual")
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(60)
  async atual(@UsuarioAtual() u: IUsuario) {
    const scoreValue = await this.score.buscarScoreAtual(u.id);
    const nivel = this.score.obterNivel(scoreValue);
    return { score: scoreValue, ...nivel };
  }

  @Get("historico")
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300)
  historico(@UsuarioAtual() u: IUsuario) {
    return this.score.buscarHistorico(u.id);
  }
}
