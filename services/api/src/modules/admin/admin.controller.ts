import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards, HttpCode, BadRequestException, HttpStatus } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { AdminService, CriarUsuarioAdminDto } from "./admin.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { UsuarioAtual } from "../../common/decorators/usuario-atual.decorator";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import { AtualizarUsuarioAdminSchema } from "@imbobi/schemas";
import type { AtualizarUsuarioAdminInput } from "@imbobi/schemas";

@ApiTags("admin")
@ApiBearerAuth()
@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @ApiOperation({ summary: "Visão geral do admin (métricas consolidadas)" })
  @Get("overview")
  overview() {
    return this.adminService.overview();
  }

  @ApiOperation({ summary: "Métricas de crédito e KYC" })
  @Get("metricas")
  metricas() {
    return this.adminService.metricas();
  }

  @ApiOperation({ summary: "Atividades recentes da plataforma" })
  @Get("atividades")
  atividades(@Query("limit") limit: string = "8") {
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 8, 1), 50);
    return this.adminService.atividades(parsedLimit);
  }

  @ApiOperation({ summary: "Listar todos os usuários" })
  @Get("usuarios")
  listarUsuarios() {
    return this.adminService.listarUsuarios();
  }

  @ApiOperation({ summary: "Criar usuário como admin" })
  @Post("usuarios")
  criarUsuario(@Body() body: CriarUsuarioAdminDto, @UsuarioAtual() admin: UsuarioAtual) {
    return this.adminService.criarUsuario(body, admin.id);
  }

  @ApiOperation({ summary: "Listar obras (paginado)" })
  @Get("obras")
  listarObras(
    @Query("limit") limit: string = "20",
    @Query("offset") offset: string = "0",
  ) {
    return this.adminService.listarObras(Number(limit), Number(offset));
  }

  @ApiOperation({ summary: "Atualizar usuário (role, funções bloqueadas)" })
  @Patch("usuarios/:id")
  atualizarUsuario(
    @Param("id") id: string,
    @Body(new ZodPipe(AtualizarUsuarioAdminSchema)) body: AtualizarUsuarioAdminInput,
    @UsuarioAtual() admin: UsuarioAtual,
  ) {
    return this.adminService.atualizarUsuario(id, body, admin.id);
  }

  @ApiOperation({ summary: "Excluir conta de usuário" })
  @Delete("usuarios/:id")
  @HttpCode(200)
  excluirUsuario(
    @Param("id") id: string,
    @UsuarioAtual() admin: UsuarioAtual,
  ) {
    return this.adminService.excluirUsuario(id, admin.id);
  }

  @ApiOperation({ summary: "Listar audit logs (paginado, filtrável)" })
  @Get("audit-logs")
  listarAuditLogs(
    @Query("limit") limit: string = "20",
    @Query("offset") offset: string = "0",
    @Query("alvoId") alvoId?: string,
    @Query("acaoTipo") acaoTipo?: string,
  ) {
    return this.adminService.listarAuditLogs(Number(limit), Number(offset), alvoId, acaoTipo);
  }

  @ApiOperation({ summary: "Listar sessões ativas de um usuário" })
  @Get("usuarios/:id/sessoes")
  listarSessoesUsuario(@Param("id") id: string) {
    return this.adminService.listarSessoesUsuario(id);
  }

  @ApiOperation({ summary: "Bloquear conta de usuário" })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post("usuarios/:id/bloquear")
  @HttpCode(200)
  bloquearUsuario(
    @Param("id") id: string,
    @UsuarioAtual() admin: UsuarioAtual,
    @Body("motivo") motivo?: string,
  ) {
    if (id === admin.id) throw new BadRequestException("Não é possível bloquear a própria conta.");
    return this.adminService.bloquearUsuario(id, admin.id, motivo);
  }

  @ApiOperation({ summary: "Desbloquear conta de usuário" })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post("usuarios/:id/desbloquear")
  @HttpCode(200)
  desbloquearUsuario(@Param("id") id: string, @UsuarioAtual() admin: UsuarioAtual) {
    return this.adminService.desbloquearUsuario(id, admin.id);
  }

  @ApiOperation({ summary: "Monitorar status das filas BullMQ" })
  @Get("queues")
  monitorarFilas() {
    return this.adminService.monitorarFilas();
  }

  @ApiOperation({ summary: "Limpar jobs com falha de uma fila específica" })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Delete("queues/:nomeFila/failed")
  @HttpCode(HttpStatus.OK)
  limparFilaFalhas(@Param("nomeFila") nomeFila: string) {
    return this.adminService.limparFilaFalhas(nomeFila);
  }

  @ApiOperation({ summary: "Broadcast de notificação para todos os usuários" })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post("notificacoes/broadcast")
  @HttpCode(200)
  broadcastNotificacao(
    @Body("titulo") titulo: string,
    @Body("mensagem") mensagem: string,
    @Body("tipo") tipo: string,
    @Body("link") link: string | undefined,
    @UsuarioAtual() admin: UsuarioAtual,
  ) {
    return this.adminService.broadcastNotificacao(titulo, mensagem, tipo, link, admin.id);
  }
}
