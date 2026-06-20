import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from "@nestjs/common";
import { ComiteService } from "./comite.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { UsuarioAtual } from "../../common/decorators/usuario-atual.decorator";
import type { VotoDecisao } from "@prisma/client";

@ApiTags("Comitê")
@ApiBearerAuth("JWT")
@Controller("comite")
@UseGuards(JwtAuthGuard, RolesGuard)
export class ComiteController {
  constructor(private readonly comiteService: ComiteService) {}

  // ── Construtor: submeter solicitação ──────────────────────────────

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

  // ── Construtor: minhas solicitações ──────────────────────────────

  @Get("minhas")
  @Roles("CONSTRUTOR", "TOMADOR")
  minhas(@UsuarioAtual() user: UsuarioAtual) {
    return this.comiteService.minhasSolicitacoes(user.id);
  }

  // ── Engenheiro: submeter parecer ─────────────────────────────────

  @Post(":comiteId/parecer")
  @Roles("ENGENHEIRO", "GESTOR_OBRA")
  parecer(
    @Param("comiteId") comiteId: string,
    @UsuarioAtual() user: UsuarioAtual,
    @Body() body: { parecerTecnico: string },
  ) {
    return this.comiteService.submeterParecer(comiteId, user.id, body.parecerTecnico);
  }

  // ── Admin: votar ─────────────────────────────────────────────────

  @Post(":comiteId/votar")
  @Roles("ADMIN")
  votar(
    @Param("comiteId") comiteId: string,
    @UsuarioAtual() user: UsuarioAtual,
    @Body() body: { voto: VotoDecisao; justificativa?: string; condicoes?: string },
  ) {
    return this.comiteService.votar(comiteId, user.id, body.voto, body.justificativa, body.condicoes);
  }

  // ── Leitura: listar comitês ───────────────────────────────────────

  @Get()
  @Roles("ADMIN", "GESTOR", "GESTOR_FUNDO", "ENGENHEIRO", "GESTOR_OBRA")
  listar(@Query("status") status?: string) {
    return this.comiteService.listarComites(status);
  }

  // ── Leitura: dossiê completo ─────────────────────────────────────

  @Get(":comiteId")
  @Roles("ADMIN", "GESTOR", "GESTOR_FUNDO", "ENGENHEIRO", "GESTOR_OBRA")
  dossie(@Param("comiteId") comiteId: string) {
    return this.comiteService.getDossie(comiteId);
  }

  // ── Admin: encerrar manualmente ───────────────────────────────────

  @Patch(":comiteId/encerrar")
  @Roles("ADMIN")
  encerrar(
    @Param("comiteId") comiteId: string,
    @Body() body: { decisao: "APROVADO" | "AJUSTADO" | "REPROVADO"; motivo?: string },
  ) {
    return this.comiteService.encerrarManualmente(comiteId, body.decisao, body.motivo);
  }
}
