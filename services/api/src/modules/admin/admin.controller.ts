import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards, HttpCode } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AdminService } from "./admin.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { UsuarioAtual } from "../../common/decorators/usuario-atual.decorator";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import {
  AtualizarUsuarioAdminSchema,
  CriarUsuarioAdminSchema,
  ReprovarHomologacaoSchema,
  ConfirmarPagamentoSchema,
} from "@imbobi/schemas";
import type {
  AtualizarUsuarioAdminInput,
  CriarUsuarioAdminInput,
  ReprovarHomologacaoInput,
  ConfirmarPagamentoInput,
} from "@imbobi/schemas";

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
  listarUsuarios(
    @Query("limit") limit: string = "20",
    @Query("offset") offset: string = "0",
  ) {
    return this.adminService.listarUsuarios(Number(limit), Number(offset));
  }

  @Get("usuarios/:id")
  buscarUsuario(@Param("id") id: string) {
    return this.adminService.buscarUsuario(id);
  }

  @Post("usuarios")
  @HttpCode(201)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  criarUsuario(@Body(new ZodPipe(CriarUsuarioAdminSchema)) body: CriarUsuarioAdminInput) {
    return this.adminService.criarUsuario(body as any);
  }

  @Get("obras")
  listarObras(
    @Query("limit") limit: string = "20",
    @Query("offset") offset: string = "0",
  ) {
    return this.adminService.listarObras(Number(limit), Number(offset));
  }

  @Patch("usuarios/:id")
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  atualizarUsuario(
    @Param("id") id: string,
    @Body(new ZodPipe(AtualizarUsuarioAdminSchema)) body: AtualizarUsuarioAdminInput,
    @UsuarioAtual() admin: UsuarioAtual,
  ) {
    return this.adminService.atualizarUsuario(id, body, admin.id);
  }

  @Delete("usuarios/:id")
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  excluirUsuario(
    @Param("id") id: string,
    @UsuarioAtual() admin: UsuarioAtual,
  ) {
    return this.adminService.excluirUsuario(id, admin.id);
  }

  @Patch("obras/:id/homologar")
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  homologarObra(@Param("id") id: string, @UsuarioAtual() admin: UsuarioAtual) {
    return this.adminService.homologarObra(id, admin.id);
  }

  @Patch("obras/:id/reprovar-homologacao")
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  reprovarHomologacao(
    @Param("id") id: string,
    @Body(new ZodPipe(ReprovarHomologacaoSchema)) body: ReprovarHomologacaoInput,
  ) {
    return this.adminService.reprovarHomologacaoObra(id, (body as any).motivo ?? "Não homologada");
  }

  @Get("relatorio-financeiro")
  relatorioFinanceiro() {
    return this.adminService.relatorioFinanceiro();
  }

  @Get("liberacoes/aguardando-pagamento")
  listarLiberacoesPendentes() {
    return this.adminService.listarLiberacoesAguardandoPagamento();
  }

  @Patch("liberacoes/:id/confirmar-pagamento")
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  confirmarPagamento(
    @Param("id") id: string,
    @Body(new ZodPipe(ConfirmarPagamentoSchema)) body: ConfirmarPagamentoInput,
  ) {
    return this.adminService.confirmarPagamentoLiberacao(id, (body as any).referenciaPagamento);
  }
}
