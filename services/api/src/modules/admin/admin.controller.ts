import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards, HttpCode } from "@nestjs/common";
import { AdminService, CriarUsuarioAdminDto } from "./admin.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { UsuarioAtual } from "../../common/decorators/usuario-atual.decorator";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import { AtualizarUsuarioAdminSchema } from "@imbobi/schemas";
import type { AtualizarUsuarioAdminInput } from "@imbobi/schemas";

@ApiTags("Admin")
@ApiBearerAuth("JWT")
@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

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
}
