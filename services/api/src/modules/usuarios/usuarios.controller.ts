import { Controller, Get, Patch, Post, Delete, UseGuards, Body, Res } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { FastifyReply } from "fastify";
import { UsuariosService } from "./usuarios.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";

@ApiTags("usuarios")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("usuarios")
export class UsuariosController {
  constructor(private readonly usuarios: UsuariosService) {}

  @ApiOperation({ summary: "Obter perfil do usuário autenticado" })
  @Get("meu-perfil")
  async meuPerfil(@UsuarioAtual() u: IUsuario) {
    return this.usuarios.buscarPerfil(u.id);
  }

  @Patch("meu-perfil")
  async atualizarPerfil(
    @UsuarioAtual() u: IUsuario,
    @Body() data: { nome?: string; telefone?: string }
  ) {
    return this.usuarios.atualizarPerfil(u.id, data);
  }

  /**
   * LGPD Article 17 - Right to Access (Meus Dados)
   * GET /api/v1/usuarios/meus-dados
   */
  @Get("meus-dados")
  async meusDados(@UsuarioAtual() u: IUsuario) {
    return this.usuarios.meusDados(u.id);
  }

  /**
   * LGPD Article 18 - Right to Data Portability
   * POST /api/v1/usuarios/exportar-dados
   * Returns JSON file download
   */
  @Post("exportar-dados")
  async exportarDados(@UsuarioAtual() u: IUsuario, @Res() res: FastifyReply) {
    const dados = await this.usuarios.exportarDados(u.id);
    const json = JSON.stringify(dados, null, 2);

    res.header("Content-Type", "application/json");
    res.header("Content-Disposition", `attachment; filename="dados-pessoais-${u.id}.json"`);
    res.send(json);
  }

  /**
   * LGPD Article 17 - Right to Deletion
   * DELETE /api/v1/usuarios/meu-perfil
   * Initiates 30-day grace period before hard delete
   */
  @Delete("meu-perfil")
  async deletarPerfil(@UsuarioAtual() u: IUsuario) {
    return this.usuarios.marcarDelecao(u.id);
  }

  /**
   * LGPD Article 8 - Right to Revoke Consent
   * PATCH /api/v1/usuarios/revogar-consentimento
   */
  @Patch("revogar-consentimento")
  async revogarConsentimento(
    @UsuarioAtual() u: IUsuario,
    @Body() { tipo }: { tipo: "MARKETING" | "NOTIFICACOES" | "TUDO" }
  ) {
    return this.usuarios.revogarConsentimento(u.id, tipo);
  }
}
