import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { Controller, Get, Patch, Post, Delete, UseGuards, Body, Res, Req, BadRequestException } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { FastifyRequest } from "fastify";
import { FastifyReply } from "fastify";
import { UsuariosService } from "./usuarios.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import {
  UpdatePreferenciasNotificacaoSchema,
  UpdatePerfilUsuarioSchema,
  ContaBancariaEmpresaSchema,
  RevogarConsentimentoSchema,
} from "@imbobi/schemas";
import type {
  UpdatePreferenciasNotificacaoInput,
  UpdatePerfilUsuarioInput,
  ContaBancariaEmpresaInput,
  RevogarConsentimentoInput,
} from "@imbobi/schemas";

@UseGuards(JwtAuthGuard)
@ApiTags("Usuários")
@ApiBearerAuth("JWT")
@Controller("usuarios")
export class UsuariosController {
  constructor(private readonly usuarios: UsuariosService) {}

  @Get("meu-perfil")
  async meuPerfil(@UsuarioAtual() u: IUsuario) {
    return this.usuarios.buscarPerfil(u.id);
  }

  @Get("me")
  async me(@UsuarioAtual() u: IUsuario) {
    return this.usuarios.buscarPerfil(u.id);
  }

  @Patch("meu-perfil")
  async atualizarPerfilLegacy(
    @UsuarioAtual() u: IUsuario,
    @Body(new ZodPipe(UpdatePerfilUsuarioSchema)) body: UpdatePerfilUsuarioInput
  ) {
    return this.usuarios.atualizarPerfil(u.id, body);
  }

  @Patch("me")
  async atualizarPerfil(
    @UsuarioAtual() u: IUsuario,
    @Body(new ZodPipe(UpdatePerfilUsuarioSchema)) body: UpdatePerfilUsuarioInput
  ) {
    return this.usuarios.atualizarPerfil(u.id, body);
  }

  @Patch("me/conta-bancaria")
  async atualizarContaBancaria(
    @UsuarioAtual() u: IUsuario,
    @Body(new ZodPipe(ContaBancariaEmpresaSchema)) body: ContaBancariaEmpresaInput
  ) {
    return this.usuarios.atualizarContaBancaria(u.id, body);
  }

  @Post("me/avatar")
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async uploadAvatar(@UsuarioAtual() u: IUsuario, @Req() req: FastifyRequest) {
    if (!req.isMultipart()) {
      throw new BadRequestException("Envio deve ser multipart/form-data.");
    }

    let fileBuffer: Buffer | null = null;
    let mimeType = "image/jpeg";

    for await (const part of req.parts()) {
      if (part.type === "file" && (part.fieldname === "avatar" || part.fieldname === "file")) {
        const chunks: Buffer[] = [];
        for await (const chunk of part.file) chunks.push(chunk);
        fileBuffer = Buffer.concat(chunks);
        mimeType = part.mimetype;
      }
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      throw new BadRequestException("Arquivo de avatar não enviado.");
    }

    return this.usuarios.uploadAvatar(u.id, fileBuffer, mimeType);
  }

  @Get("me/preferencias")
  async obterPreferencias(@UsuarioAtual() u: IUsuario) {
    return this.usuarios.obterPreferencias(u.id);
  }

  @Patch("me/preferencias")
  async salvarPreferencias(
    @UsuarioAtual() u: IUsuario,
    @Body(new ZodPipe(UpdatePreferenciasNotificacaoSchema)) body: UpdatePreferenciasNotificacaoInput
  ) {
    return this.usuarios.salvarPreferencias(u.id, body);
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
  @Throttle({ default: { limit: 3, ttl: 3600000 } })
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
  @Throttle({ default: { limit: 3, ttl: 3600000 } })
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
    @Body(new ZodPipe(RevogarConsentimentoSchema)) body: RevogarConsentimentoInput,
  ) {
    return this.usuarios.revogarConsentimento(u.id, body.tipo);
  }
}
