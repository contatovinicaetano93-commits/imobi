import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { Controller, Get, Patch, Delete, Param, Query, UseGuards } from "@nestjs/common";
import { NotificacoesService } from "./notificacoes.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";

@UseGuards(JwtAuthGuard)
@ApiTags("Notificações")
@ApiBearerAuth("JWT")
@Controller("notificacoes")
export class NotificacoesController {
  constructor(private readonly notificacoes: NotificacoesService) {}

  @Get()
  async listar(
    @UsuarioAtual() u: IUsuario,
    @Query("limit") limit: string = "20",
    @Query("offset") offset: string = "0"
  ) {
    return this.notificacoes.listar(u.id, Math.max(1, parseInt(limit, 10) || 20), Math.max(0, parseInt(offset, 10) || 0));
  }

  @Get("nao-lidas")
  async listarNaoLidas(@UsuarioAtual() u: IUsuario) {
    return this.notificacoes.listarNaoLidas(u.id);
  }

  @Get("contar-nao-lidas")
  async contarNaoLidas(@UsuarioAtual() u: IUsuario) {
    const count = await this.notificacoes.contarNaoLidas(u.id);
    return { count };
  }

  @Patch("marcar-todas-lidas")
  async marcarTudasComoLidas(@UsuarioAtual() u: IUsuario) {
    await this.notificacoes.marcarTudasComoLidas(u.id);
    return { ok: true };
  }

  @Patch(":id/lida")
  async marcarComoLida(@UsuarioAtual() u: IUsuario, @Param("id") id: string) {
    return this.notificacoes.marcarComoLida(u.id, id);
  }

  @Delete(":id")
  async deletar(@UsuarioAtual() u: IUsuario, @Param("id") id: string) {
    await this.notificacoes.deletar(u.id, id);
    return { ok: true };
  }
}
