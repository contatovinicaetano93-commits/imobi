import { Controller, Get, Post, Body, Param, Query, UseGuards } from "@nestjs/common";
import { ComiteService } from "./comite.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { UsuarioAtual } from "../../common/decorators/usuario-atual.decorator";
import type { VotoDecisao } from "@prisma/client";

@Controller("comite")
@UseGuards(JwtAuthGuard, RolesGuard)
export class ComiteController {
  constructor(private readonly comiteService: ComiteService) {}

  // ── Construtor: submeter solicitação ──────────────────────────────

  @Post("solicitar")
  @Roles("TOMADOR")
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
  @Roles("TOMADOR")
  minhas(@UsuarioAtual() user: UsuarioAtual) {
    return this.comiteService.minhasSolicitacoes(user.id);
  }

  // ── Engenheiro: submeter parecer ─────────────────────────────────

  @Post(":comiteId/parecer")
  @Roles("ENGENHEIRO")
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

  // ── Leitura: listar comitês (Admin + Fundo) ───────────────────────

  @Get()
  @Roles("ADMIN", "GESTOR", "ENGENHEIRO")
  listar(@Query("status") status?: string) {
    return this.comiteService.listarComites(status);
  }

  // ── Leitura: dossiê completo ─────────────────────────────────────

  @Get(":comiteId")
  @Roles("ADMIN", "GESTOR", "ENGENHEIRO")
  dossie(@Param("comiteId") comiteId: string) {
    return this.comiteService.getDossie(comiteId);
  }
}
