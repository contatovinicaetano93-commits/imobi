import { Controller, Post, Get, Patch, Body, Param, UseGuards, Req, BadRequestException } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { FastifyRequest } from "fastify";
import { KycService } from "./kyc.service";
import { StorageService } from "../storage/storage.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const ALLOWED_TIPOS = ["RG", "CPF", "Selfie", "ComprovanteResidencia"];

@UseGuards(JwtAuthGuard)
@Controller("kyc")
export class KycController {
  constructor(
    private readonly kyc: KycService,
    private readonly storage: StorageService,
  ) {}

  @Post("upload-arquivo")
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async uploadArquivo(@UsuarioAtual() u: IUsuario, @Req() req: FastifyRequest) {
    const part = await (req as any).file();
    if (!part) throw new BadRequestException("Arquivo obrigatório.");

    if (!ALLOWED_MIME_TYPES.includes(part.mimetype)) {
      throw new BadRequestException("Tipo de arquivo não permitido. Use JPEG, PNG, WEBP ou HEIC.");
    }

    const buffer: Buffer = await part.toBuffer();
    if (buffer.length === 0) throw new BadRequestException("Arquivo vazio.");

    const tipo = (part.fields as Record<string, any>)["tipo"]?.value;
    if (!tipo || !ALLOWED_TIPOS.includes(tipo)) {
      throw new BadRequestException(`Tipo de documento inválido. Use: ${ALLOWED_TIPOS.join(", ")}.`);
    }

    const { key } = await this.storage.upload(buffer, part.mimetype, `kyc/${u.id}`);
    return this.kyc.uploadDocumento(u.id, tipo, key);
  }

  @Post("upload")
  async uploadDocumento(
    @UsuarioAtual() u: IUsuario,
    @Body() body: { tipo: string; url: string }
  ) {
    if (!body.tipo || !ALLOWED_TIPOS.includes(body.tipo)) {
      throw new BadRequestException(`Tipo de documento inválido. Use: ${ALLOWED_TIPOS.join(", ")}.`);
    }
    if (!body.url || !body.url.startsWith("kyc/")) {
      throw new BadRequestException("URL de documento inválida.");
    }
    return this.kyc.uploadDocumento(u.id, body.tipo, body.url);
  }

  @Get("documentos")
  async listarDocumentos(@UsuarioAtual() u: IUsuario) {
    return this.kyc.listarDocumentos(u.id);
  }

  @Get("status")
  async obterStatus(@UsuarioAtual() u: IUsuario) {
    return this.kyc.obterStatus(u.id);
  }

  @UseGuards(RolesGuard)
  @Roles("GESTOR_OBRA", "ADMIN")
  @Get("pendentes")
  async listarPendentes() {
    return this.kyc.listarPendentes();
  }

  @UseGuards(RolesGuard)
  @Roles("GESTOR_OBRA", "ADMIN")
  @Patch(":id/aprovar")
  async aprovarDocumento(@UsuarioAtual() u: IUsuario, @Param("id") id: string) {
    return this.kyc.aprovarDocumento(id, u.id);
  }

  @UseGuards(RolesGuard)
  @Roles("GESTOR_OBRA", "ADMIN")
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
