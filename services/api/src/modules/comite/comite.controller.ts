import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from "@nestjs/common";
import { ComiteService } from "./comite.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { UsuarioAtual } from "../../common/decorators/usuario-atual.decorator";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import {
  ComiteSolicitarSchema,
  ComiteParecerSchema,
  ComiteVotarSchema,
  ComiteEncerrarSchema,
} from "@imbobi/schemas";
import type {
  ComiteSolicitarInput,
  ComiteParecerInput,
  ComiteVotarInput,
  ComiteEncerrarInput,
} from "@imbobi/schemas";

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
    @Body(new ZodPipe(ComiteSolicitarSchema)) body: ComiteSolicitarInput,
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
    @Body(new ZodPipe(ComiteParecerSchema)) body: ComiteParecerInput,
  ) {
    return this.comiteService.submeterParecer(comiteId, user.id, body.parecerTecnico);
  }

  // ── Admin: votar ─────────────────────────────────────────────────

  @Post(":comiteId/votar")
  @Roles("ADMIN")
  votar(
    @Param("comiteId") comiteId: string,
    @UsuarioAtual() user: UsuarioAtual,
    @Body(new ZodPipe(ComiteVotarSchema)) body: ComiteVotarInput,
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
    @Body(new ZodPipe(ComiteEncerrarSchema)) body: ComiteEncerrarInput,
  ) {
    return this.comiteService.encerrarManualmente(comiteId, body.decisao, body.motivo);
  }
}
