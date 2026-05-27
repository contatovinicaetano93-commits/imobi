import { Controller, Post, Get, Patch, Body, Param, Query, UseGuards } from "@nestjs/common";
import { KycService } from "./kyc.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import { UploadDocumentoSchema, RejeitarDocumentoSchema } from "@imbobi/schemas";

@UseGuards(JwtAuthGuard)
@Controller("kyc")
export class KycController {
  constructor(private readonly kyc: KycService) {}

  @Post("upload")
  async uploadDocumento(
    @UsuarioAtual() u: IUsuario,
    @Body(new ZodPipe(UploadDocumentoSchema)) body: unknown
  ) {
    const validated = body as { tipo: string; url: string };
    return this.kyc.uploadDocumento(u.id, validated.tipo, validated.url);
  }

  @Get("documentos")
  async listarDocumentos(@UsuarioAtual() u: IUsuario) {
    return this.kyc.listarDocumentos(u.id);
  }

  @Get("status")
  async obterStatus(@UsuarioAtual() u: IUsuario) {
    return this.kyc.obterStatus(u.id);
  }

  @Get("pendentes")
  async listarPendentes() {
    return this.kyc.listarPendentes();
  }

  @Patch(":id/aprovar")
  async aprovarDocumento(@UsuarioAtual() u: IUsuario, @Param("id") id: string) {
    return this.kyc.aprovarDocumento(id, u.id);
  }

  @Patch(":id/rejeitar")
  async rejeitarDocumento(
    @UsuarioAtual() u: IUsuario,
    @Param("id") id: string,
    @Body(new ZodPipe(RejeitarDocumentoSchema)) body: unknown
  ) {
    const validated = body as { motivo: string };
    return this.kyc.rejeitarDocumento(id, u.id, validated.motivo);
  }

  @Get("verificar")
  async verificarKycCompleto(@UsuarioAtual() u: IUsuario) {
    return this.kyc.verificarKycCompleto(u.id);
  }

  @Post("presigned-url")
  async gerarPresignedUrl(
    @UsuarioAtual() u: IUsuario,
    @Query("tipo") tipo: string,
    @Query("mimeType") mimeType: string
  ) {
    return this.kyc.gerarUrlUpload(u.id, tipo, mimeType);
  }
}
