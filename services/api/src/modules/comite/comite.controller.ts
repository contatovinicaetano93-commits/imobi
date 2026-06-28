import { Controller, Get, Post, Body, Param, Query, UseGuards } from "@nestjs/common";
import { ComiteService } from "./comite.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { UsuarioAtual } from "../../common/decorators/usuario-atual.decorator";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import { SolicitarComiteSchema, ParecerComiteSchema, VotarComiteSchema, type SolicitarComiteDto, type ParecerComiteDto, type VotarComiteDto } from "./dto/comite.dto";

@Controller("comite")
@UseGuards(JwtAuthGuard, RolesGuard)
export class ComiteController {
  constructor(private readonly comiteService: ComiteService) {}

  // ── Construtor: submeter solicitação ──────────────────────────────

  @Post("solicitar")
  @Roles("CONSTRUTOR", "TOMADOR")
  solicitar(
    @UsuarioAtual() user: UsuarioAtual,
    @Body(new ZodPipe(SolicitarComiteSchema)) body: SolicitarComiteDto,
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
    @Body(new ZodPipe(ParecerComiteSchema)) body: ParecerComiteDto,
  ) {
    return this.comiteService.submeterParecer(comiteId, user.id, body.parecerTecnico);
  }

  // ── Admin: votar ─────────────────────────────────────────────────

  @Post(":comiteId/votar")
  @Roles("ADMIN")
  votar(
    @Param("comiteId") comiteId: string,
    @UsuarioAtual() user: UsuarioAtual,
    @Body(new ZodPipe(VotarComiteSchema)) body: VotarComiteDto,
  ) {
    return this.comiteService.votar(comiteId, user.id, body.voto, body.justificativa, body.condicoes);
  }

  // ── Leitura: listar comitês (Admin + Fundo) ───────────────────────

  @Get()
  @Roles("ADMIN", "ENGENHEIRO", "GESTOR_OBRA")
  listar(@Query("status") status?: string) {
    return this.comiteService.listarComites(status);
  }

  // ── Leitura: dossiê completo ─────────────────────────────────────

  @Get(":comiteId")
  @Roles("ADMIN", "ENGENHEIRO", "GESTOR_OBRA")
  dossie(@Param("comiteId") comiteId: string) {
    return this.comiteService.getDossie(comiteId);
  }
}
