import { Controller, Get, Patch, Post, Delete, UseGuards, Body, UseInterceptors, Res } from "@nestjs/common";
import { CacheInterceptor, CacheTTL } from "@nestjs/cache-manager";
import { Response } from "express";
import { UsuariosService } from "./usuarios.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";

@UseGuards(JwtAuthGuard)
@Controller("usuarios")
export class UsuariosController {
  constructor(private readonly usuarios: UsuariosService) {}

  @Get("meu-perfil")
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(600) // 10 min
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
  async exportarDados(@UsuarioAtual() u: IUsuario, @Res() res: Response) {
    const dados = await this.usuarios.exportarDados(u.id);
    const json = JSON.stringify(dados, null, 2);

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="dados-pessoais-${u.id}.json"`);
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
