import { Controller, Get, Post, Body, Param, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { ComiteService } from "./comite.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { UsuarioAtual } from "../../common/decorators/usuario-atual.decorator";
import type { VotoDecisao } from "@prisma/client";

@ApiTags("comite")
@ApiBearerAuth()
@Controller("comite")
@UseGuards(JwtAuthGuard, RolesGuard)
export class ComiteController {
  constructor(private readonly comiteService: ComiteService) {}

  @ApiOperation({ summary: "Submeter solicitação ao comitê de crédito" })
  @Post("solicitar")
  @Roles("CONSTRUTOR", "TOMADOR")
  solicitar(
    @UsuarioAtual() user: UsuarioAtual,
    @Body() body: {
      valorSolicitado: number;
      prazoMeses: number;
      taxaMensal: number;
      finalidade: string;
      garantias?: string;
      observacoes?: string;
      obraId?: string;
      vgv?: number;
      custoObra?: number;
      ltv?: number;
    },
  ) {
    return this.comiteService.submeterSolicitacao(user.id, body);
  }

  @ApiOperation({ summary: "Listar minhas solicitações ao comitê" })
  @Get("minhas")
  @Roles("CONSTRUTOR", "TOMADOR")
  minhas(@UsuarioAtual() user: UsuarioAtual) {
    return this.comiteService.minhasSolicitacoes(user.id);
  }

  @ApiOperation({ summary: "Submeter parecer técnico (engenheiro)" })
  @Post(":comiteId/parecer")
  @Roles("ENGENHEIRO", "GESTOR_OBRA")
  parecer(
    @Param("comiteId") comiteId: string,
    @UsuarioAtual() user: UsuarioAtual,
    @Body() body: { parecerTecnico: string },
  ) {
    return this.comiteService.submeterParecer(comiteId, user.id, body.parecerTecnico);
  }

  @ApiOperation({ summary: "Votar em solicitação (admin)" })
  @Post(":comiteId/votar")
  @Roles("ADMIN")
  votar(
    @Param("comiteId") comiteId: string,
    @UsuarioAtual() user: UsuarioAtual,
    @Body() body: { voto: VotoDecisao; justificativa?: string; condicoes?: string },
  ) {
    return this.comiteService.votar(comiteId, user.id, body.voto, body.justificativa, body.condicoes);
  }

  @ApiOperation({ summary: "Listar solicitações ao comitê (admin/gestor)" })
  @Get()
  @Roles("ADMIN", "GESTOR", "ENGENHEIRO", "GESTOR_OBRA")
  listar(@Query("status") status?: string) {
    return this.comiteService.listarComites(status);
  }

  @ApiOperation({ summary: "Obter dossiê completo de solicitação" })
  @Get(":comiteId")
  @Roles("ADMIN", "GESTOR", "ENGENHEIRO", "GESTOR_OBRA")
  dossie(@Param("comiteId") comiteId: string) {
    return this.comiteService.getDossie(comiteId);
  }
}
