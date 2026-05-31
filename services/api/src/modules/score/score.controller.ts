import { Controller, Get, UseGuards, UseInterceptors } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { CacheInterceptor, CacheTTL } from "@nestjs/cache-manager";
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
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300)
  @ApiOperation({ summary: "Score atual", description: "Retorna score de crédito e nível atual do usuário (5min cache)" })
  @ApiResponse({ status: 200, description: "Score carregado com nível" })
  async atual(@UsuarioAtual() u: IUsuario) {
    const scoreValue = await this.score.buscarScoreAtual(u.id);
    const nivel = this.score.obterNivel(scoreValue);
    return { score: scoreValue, ...nivel };
  }

  @Get("historico")
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(3600)
  @ApiOperation({ summary: "Histórico de score", description: "Retorna histórico de variações de score (1h cache)" })
  @ApiResponse({ status: 200, description: "Histórico de score" })
  historico(@UsuarioAtual() u: IUsuario) {
    return this.score.buscarHistorico(u.id);
  }
}
