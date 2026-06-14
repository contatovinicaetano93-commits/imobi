import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards, HttpCode } from "@nestjs/common";
import { AdminService, CriarUsuarioAdminDto } from "./admin.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { UsuarioAtual } from "../../common/decorators/usuario-atual.decorator";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import { AtualizarUsuarioAdminSchema } from "@imbobi/schemas";
import type { AtualizarUsuarioAdminInput } from "@imbobi/schemas";

@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN", "GESTOR")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("overview")
  overview() {
    return this.adminService.overview();
  }

  @Get("atividades")
  atividades(@Query("limit") limit: string = "8") {
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 8, 1), 50);
    return this.adminService.atividades(parsedLimit);
  }

  @Get("usuarios")
  listarUsuarios() {
    return this.adminService.listarUsuarios();
  }

  @Post("usuarios")
  criarUsuario(@Body() body: CriarUsuarioAdminDto) {
    return this.adminService.criarUsuario(body);
  }

  @Get("obras")
  listarObras(
    @Query("limit") limit: string = "20",
    @Query("offset") offset: string = "0",
  ) {
    return this.adminService.listarObras(Number(limit), Number(offset));
  }

  @Delete("usuarios/:id")
  @HttpCode(200)
  excluirUsuario(
    @Param("id") id: string,
    @UsuarioAtual() admin: UsuarioAtual,
  ) {
    return this.adminService.excluirUsuario(id, admin.id);
  }

  @Patch("usuarios/:id")
  atualizarUsuario(
    @Param("id") id: string,
    @Body(new ZodPipe(AtualizarUsuarioAdminSchema)) body: AtualizarUsuarioAdminInput,
    @UsuarioAtual() admin: UsuarioAtual,
  ) {
    return this.adminService.atualizarUsuario(id, body, admin.id);
  }

  @Get("etapas/aguardando-validacao")
  listarEtapasAguardandoValidacao(
    @Query("limit") limit: string = "20",
    @Query("offset") offset: string = "0",
  ) {
    return this.adminService.listarEtapasAguardandoValidacao(Number(limit), Number(offset));
  }

  @Post("etapas/:etapaId/validar")
  @HttpCode(200)
  validarEtapa(
    @Param("etapaId") etapaId: string,
    @UsuarioAtual() admin: UsuarioAtual,
    @Body() body: { observacoes?: string },
  ) {
    return this.adminService.validarEtapa(admin.id, etapaId, body.observacoes);
  }

  @Post("etapas/:etapaId/rejeitar")
  @HttpCode(200)
  rejeitarEtapa(
    @Param("etapaId") etapaId: string,
    @UsuarioAtual() admin: UsuarioAtual,
    @Body() body: { motivo: string },
  ) {
    return this.adminService.rejeitarEtapaAdmin(admin.id, etapaId, body.motivo);
  }

  @Get("configuracoes")
  getConfiguracoes() {
    return this.adminService.getConfiguracoes();
  }

  @Patch("configuracoes")
  updateConfiguracoes(@Body() body: Parameters<AdminService["updateConfiguracoes"]>[0]) {
    return this.adminService.updateConfiguracoes(body);
  }

  @Get("fundos/capital")
  getCapitalFundo() {
    return this.adminService.getCapitalFundo();
  }

  @Patch("fundos/capital")
  updateCapitalFundo(@Body() body: { capitalDisponivel: number }) {
    return this.adminService.updateCapitalFundo(body.capitalDisponivel);
  }

  @Post("comite/iniciar")
  @HttpCode(201)
  iniciarComite(
    @Body() body: { solicitacaoId: string },
    @UsuarioAtual() admin: UsuarioAtual,
  ) {
    return this.adminService.iniciarComite(body.solicitacaoId, admin.id);
  }

  @Get("solicitacoes")
  listarSolicitacoes(
    @Query("status") status?: string,
    @Query("semComite") semComiteRaw?: string,
  ) {
    const semComite = semComiteRaw === "true";
    return this.adminService.listarSolicitacoes(status, semComite);
  }
}
