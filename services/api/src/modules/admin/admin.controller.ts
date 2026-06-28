import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards, HttpCode, BadRequestException } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { AdminService } from "./admin.service";
import { ComiteService } from "../comite/comite.service";
import type { CriarUsuarioAdminDto } from "./admin.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { UsuarioAtual } from "../../common/decorators/usuario-atual.decorator";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import { AtualizarUsuarioAdminSchema } from "@imbobi/schemas";
import type { AtualizarUsuarioAdminInput } from "@imbobi/schemas";
import { CriarUsuarioAdminSchema, type CriarUsuarioAdminSchemaDto } from "./dto/criar-usuario-admin.dto";
import { IniciarComiteSchema, type IniciarComiteDto } from "../comite/dto/comite.dto";
import { PipelineService } from "./pipeline.service";
import { ConfiguracoesService } from "./configuracoes.service";
import {
  AtualizarPipelineEtapaSchema,
  CriarPipelineLeadSchema,
  type AtualizarPipelineEtapaDto,
  type CriarPipelineLeadDto,
} from "./dto/pipeline.dto";
import { ConfiguracaoSistemaSchema, type ConfiguracaoSistemaInput } from "@imbobi/schemas";
import { SKIP_ALL_THROTTLES } from "../../common/guards/throttler.constants";

@SkipThrottle(SKIP_ALL_THROTTLES)
@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly comiteService: ComiteService,
    private readonly pipelineService: PipelineService,
    private readonly configuracoesService: ConfiguracoesService,
  ) {}

  @Get("overview")
  @Roles("GESTOR", "GESTOR_FUNDO", "ADMIN")
  overview() {
    return this.adminService.overview();
  }

  @Get("metricas")
  @Roles("GESTOR", "GESTOR_FUNDO", "ADMIN")
  metricas() {
    return this.adminService.metricas();
  }

  @Get("atividades")
  atividades(@Query("limit") limit: string = "8") {
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 8, 1), 50);
    return this.adminService.atividades(parsedLimit);
  }

  @Get("filas")
  filas() {
    return this.adminService.filas();
  }

  @Get("search")
  buscar(
    @Query("q") q: string = "",
    @Query("limit") limit: string = "20",
  ) {
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
    return this.adminService.buscar(q, parsedLimit);
  }

  @Get("usuarios")
  listarUsuarios() {
    return this.adminService.listarUsuarios();
  }

  @Post("usuarios")
  criarUsuario(@Body(new ZodPipe(CriarUsuarioAdminSchema)) body: CriarUsuarioAdminSchemaDto) {
    return this.adminService.criarUsuario(body as CriarUsuarioAdminDto);
  }

  @Get("obras")
  listarObras(
    @Query("limit") limit: string = "20",
    @Query("offset") offset: string = "0",
  ) {
    return this.adminService.listarObras(Number(limit), Number(offset));
  }

  @Patch("usuarios/:id")
  atualizarUsuario(
    @Param("id") id: string,
    @Body(new ZodPipe(AtualizarUsuarioAdminSchema)) body: AtualizarUsuarioAdminInput,
    @UsuarioAtual() admin: UsuarioAtual,
  ) {
    return this.adminService.atualizarUsuario(id, body, admin.id);
  }

  @Delete("usuarios/:id")
  @HttpCode(200)
  excluirUsuario(
    @Param("id") id: string,
    @UsuarioAtual() admin: UsuarioAtual,
  ) {
    return this.adminService.excluirUsuario(id, admin.id);
  }

  @Patch("obras/:id/homologar")
  homologarObra(@Param("id") id: string, @UsuarioAtual() admin: UsuarioAtual) {
    return this.adminService.homologarObra(id, admin.id);
  }

  @Patch("obras/:id/reprovar-homologacao")
  reprovarHomologacao(
    @Param("id") id: string,
    @Body("motivo") motivo: string,
  ) {
    return this.adminService.reprovarHomologacaoObra(id, motivo ?? "Não homologada");
  }

  @Get("liberacoes/aguardando-pagamento")
  listarLiberacoesPendentes() {
    return this.adminService.listarLiberacoesAguardandoPagamento();
  }

  @Patch("liberacoes/:id/confirmar-pagamento")
  confirmarPagamento(
    @Param("id") id: string,
    @Body("referenciaPagamento") referenciaPagamento?: string,
  ) {
    return this.adminService.confirmarPagamentoLiberacao(id, referenciaPagamento);
  }

  @Get("solicitacoes")
  listarSolicitacoes(
    @Query("status") status?: string,
    @Query("semComite") semComite?: string,
  ) {
    return this.comiteService.listarSolicitacoesAdmin({
      status,
      semComite: semComite === "true",
    });
  }

  @Post("comite/iniciar")
  iniciarComite(
    @Body(new ZodPipe(IniciarComiteSchema)) body: IniciarComiteDto,
    @UsuarioAtual() admin: UsuarioAtual,
  ) {
    return this.comiteService.iniciarComite(body.solicitacaoId, admin.id);
  }

  @Get("pipeline")
  listarPipeline() {
    return this.pipelineService.listar();
  }

  @Post("pipeline/leads")
  criarPipelineLead(@Body(new ZodPipe(CriarPipelineLeadSchema)) body: CriarPipelineLeadDto) {
    return this.pipelineService.criarLead(body);
  }

  @Patch("pipeline/:fonte/:id/etapa")
  atualizarPipelineEtapa(
    @Param("fonte") fonte: string,
    @Param("id") id: string,
    @Body(new ZodPipe(AtualizarPipelineEtapaSchema)) body: AtualizarPipelineEtapaDto,
  ) {
    if (fonte !== "proposta" && fonte !== "solicitacao") {
      throw new BadRequestException("Fonte inválida.");
    }
    return this.pipelineService.atualizarEtapa(fonte, id, body.etapa);
  }

  @Delete("pipeline/:fonte/:id")
  @HttpCode(200)
  excluirPipelineItem(@Param("fonte") fonte: string, @Param("id") id: string) {
    if (fonte !== "proposta" && fonte !== "solicitacao") {
      throw new BadRequestException("Fonte inválida.");
    }
    return this.pipelineService.excluir(fonte, id);
  }

  @Get("configuracoes")
  obterConfiguracoes() {
    return this.configuracoesService.obter();
  }

  @Patch("configuracoes")
  atualizarConfiguracoes(
    @Body(new ZodPipe(ConfiguracaoSistemaSchema)) body: ConfiguracaoSistemaInput,
    @UsuarioAtual() admin: UsuarioAtual,
  ) {
    return this.configuracoesService.atualizar(body, admin.id);
  }
}
