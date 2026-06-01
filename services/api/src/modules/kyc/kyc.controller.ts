import { Controller, Post, Get, Patch, Body, Param, UseGuards, ForbiddenException } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { KycService } from "./kyc.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";

@ApiTags("kyc")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("kyc")
export class KycController {
  constructor(private readonly kyc: KycService) {}

  @Post("upload")
  @ApiOperation({ summary: "Upload de documento KYC", description: "Envia documento de identidade ou comprovante" })
  @ApiResponse({ status: 201, description: "Documento enviado com sucesso" })
  @ApiResponse({ status: 400, description: "Tipo de documento inválido" })
  async uploadDocumento(
    @UsuarioAtual() u: IUsuario,
    @Body() body: { tipo: string; url: string }
  ) {
    return this.kyc.uploadDocumento(u.id, body.tipo, body.url);
  }

  @Get("documentos")
  @ApiOperation({ summary: "Listar meus documentos", description: "Retorna documentos KYC do usuário" })
  @ApiResponse({ status: 200, description: "Lista de documentos" })
  async listarDocumentos(@UsuarioAtual() u: IUsuario) {
    return this.kyc.listarDocumentos(u.id);
  }

  @Get("status")
  @ApiOperation({ summary: "Status do KYC", description: "Retorna status atual do processo KYC" })
  @ApiResponse({ status: 200, description: "Status do KYC" })
  async obterStatus(@UsuarioAtual() u: IUsuario) {
    return this.kyc.obterStatus(u.id);
  }

  @Get("pendentes")
  async listarPendentes(@UsuarioAtual() u: IUsuario) {
    if (u.tipo !== "ADMIN" && u.tipo !== "GESTOR_OBRA") {
      throw new ForbiddenException("Acesso restrito apenas para ADMIN e GESTOR_OBRA.");
    }
    return this.kyc.listarPendentes();
  }

  @Patch(":id/aprovar")
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async aprovarDocumento(@UsuarioAtual() u: IUsuario, @Param("id") id: string) {
    return this.kyc.aprovarDocumento(id, u.id);
  }

  @Patch(":id/rejeitar")
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async rejeitarDocumento(
    @UsuarioAtual() u: IUsuario,
    @Param("id") id: string,
    @Body() body: { motivo: string }
  ) {
    return this.kyc.rejeitarDocumento(id, u.id, body.motivo);
  }

  @Get("verificar")
  @ApiOperation({ summary: "Verificar KYC completo", description: "Verifica se o KYC foi completado com sucesso" })
  @ApiResponse({ status: 200, description: "Status de conclusão do KYC" })
  async verificarKycCompleto(@UsuarioAtual() u: IUsuario) {
    return this.kyc.verificarKycCompleto(u.id);
  }
}
