import { Controller, Get, Patch, Delete, Param, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from "@nestjs/swagger";
import { NotificacoesService } from "./notificacoes.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";

@ApiTags("notificacoes")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("notificacoes")
export class NotificacoesController {
  constructor(private readonly notificacoes: NotificacoesService) {}

  @Get()
  @ApiOperation({ summary: "Listar notificações", description: "Retorna notificações do usuário com paginação" })
  @ApiQuery({ name: "limit", example: "20", required: false })
  @ApiQuery({ name: "offset", example: "0", required: false })
  @ApiResponse({ status: 200, description: "Lista de notificações" })
  async listar(
    @UsuarioAtual() u: IUsuario,
    @Query("limit") limit: string = "20",
    @Query("offset") offset: string = "0"
  ) {
    return this.notificacoes.listar(u.id, Number(limit), Number(offset));
  }

  @Get("nao-lidas")
  @ApiOperation({ summary: "Notificações não lidas", description: "Retorna apenas notificações não lidas" })
  @ApiResponse({ status: 200, description: "Lista de notificações não lidas" })
  async listarNaoLidas(@UsuarioAtual() u: IUsuario) {
    return this.notificacoes.listarNaoLidas(u.id);
  }

  @Get("contar-nao-lidas")
  @ApiOperation({ summary: "Contar não lidas", description: "Retorna quantidade de notificações não lidas" })
  @ApiResponse({ status: 200, description: "Contagem de não lidas" })
  async contarNaoLidas(@UsuarioAtual() u: IUsuario) {
    const count = await this.notificacoes.contarNaoLidas(u.id);
    return { count };
  }

  @Patch(":id/lida")
  @ApiOperation({ summary: "Marcar como lida", description: "Marca uma notificação como lida" })
  @ApiParam({ name: "id", description: "ID da notificação" })
  @ApiResponse({ status: 200, description: "Notificação marcada como lida" })
  async marcarComoLida(@Param("id") id: string) {
    return this.notificacoes.marcarComoLida(id);
  }

  @Patch("marcar-todas-lidas")
  @ApiOperation({ summary: "Marcar todas como lidas", description: "Marca todas as notificações como lidas" })
  @ApiResponse({ status: 200, description: "Todas as notificações marcadas como lidas" })
  async marcarTudasComoLidas(@UsuarioAtual() u: IUsuario) {
    await this.notificacoes.marcarTudasComoLidas(u.id);
    return { ok: true };
  }

  @Delete(":id")
  @ApiOperation({ summary: "Deletar notificação", description: "Remove uma notificação" })
  @ApiParam({ name: "id", description: "ID da notificação" })
  @ApiResponse({ status: 200, description: "Notificação deletada" })
  async deletar(@Param("id") id: string) {
    await this.notificacoes.deletar(id);
    return { ok: true };
  }
}
