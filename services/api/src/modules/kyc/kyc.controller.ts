import {
  Controller, Post, Get, Patch, Body, Param, UseGuards, Req, Res, BadRequestException,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { FastifyRequest, FastifyReply } from "fastify";
import { KycService } from "./kyc.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { MANAGER_ROLES, MANAGER_WRITE_ROLES } from "../../common/constants/manager-roles";
import { isManagerRole } from "../../common/constants/manager-roles";
import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";

@UseGuards(JwtAuthGuard)
@Controller("kyc")
export class KycController {
  constructor(private readonly kyc: KycService) {}

  @Post("upload")
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async uploadDocumento(@UsuarioAtual() u: IUsuario, @Req() req: FastifyRequest) {
    if (!req.isMultipart()) {
      throw new BadRequestException(
        "Envio deve ser multipart/form-data (campos: tipo, file).",
      );
    }

    let fileBuffer: Buffer | null = null;
    let mimeType = "image/jpeg";
    const fields: Record<string, string> = {};

    for await (const part of req.parts()) {
      if (part.type === "file") {
        const chunks: Buffer[] = [];
        for await (const chunk of part.file) chunks.push(chunk);
        fileBuffer = Buffer.concat(chunks);
        mimeType = part.mimetype;
      } else {
        fields[part.fieldname] = part.value as string;
      }
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      throw new BadRequestException("Arquivo não enviado.");
    }

    const tipo = fields["tipo"]?.trim();
    if (!tipo) {
      throw new BadRequestException("Campo tipo é obrigatório.");
    }

    return this.kyc.uploadDocumentoArquivo(u.id, tipo, fileBuffer, mimeType);
  }

  @Get("documentos")
  async listarDocumentos(@UsuarioAtual() u: IUsuario) {
    return this.kyc.listarDocumentos(u.id);
  }

  @Get("documentos/:id/arquivo")
  async obterArquivo(
    @UsuarioAtual() u: IUsuario,
    @Param("id") id: string,
    @Res() res: FastifyReply,
  ) {
    const result = await this.kyc.obterArquivoDocumento(id, u.id, isManagerRole(u.tipo));
    if ("redirectUrl" in result && result.redirectUrl) {
      return res.redirect(302, result.redirectUrl);
    }
    return res
      .header("Content-Type", result.mimeType ?? "application/octet-stream")
      .header("Cache-Control", "private, max-age=3600")
      .send(result.buffer);
  }

  @Get("status")
  async obterStatus(@UsuarioAtual() u: IUsuario) {
    return this.kyc.obterStatus(u.id);
  }

  @UseGuards(RolesGuard)
  @Roles(...MANAGER_ROLES)
  @Get("pendentes")
  async listarPendentes() {
    return this.kyc.listarPendentes();
  }

  @UseGuards(RolesGuard)
  @Roles(...MANAGER_WRITE_ROLES)
  @Patch(":id/aprovar")
  async aprovarDocumento(@UsuarioAtual() u: IUsuario, @Param("id") id: string) {
    return this.kyc.aprovarDocumento(id, u.id);
  }

  @UseGuards(RolesGuard)
  @Roles(...MANAGER_WRITE_ROLES)
  @Patch(":id/rejeitar")
  async rejeitarDocumento(
    @UsuarioAtual() u: IUsuario,
    @Param("id") id: string,
    @Body() body: { motivo: string }
  ) {
    return this.kyc.rejeitarDocumento(id, u.id, body.motivo);
  }

  @Get("verificar")
  async verificarKycCompleto(@UsuarioAtual() u: IUsuario) {
    return this.kyc.verificarKycCompleto(u.id);
  }
}
