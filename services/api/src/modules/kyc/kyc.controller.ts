import { Controller, Post, Get, Patch, Body, Param, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from "@nestjs/swagger";
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
  @ApiOperation({ summary: "Documentos pendentes", description: "Lista documentos aguardando aprovação (admin)" })
  @ApiResponse({ status: 200, description: "Lista de documentos pendentes" })
  async listarPendentes() {
    return this.kyc.listarPendentes();
  }

  @Patch(":id/aprovar")
  @ApiOperation({ summary: "Aprovar documento", description: "Aprova um documento KYC específico" })
  @ApiParam({ name: "id", description: "ID do documento" })
  @ApiResponse({ status: 200, description: "Documento aprovado" })
  async aprovarDocumento(@UsuarioAtual() u: IUsuario, @Param("id") id: string) {
    return this.kyc.aprovarDocumento(id, u.id);
  }

  @Patch(":id/rejeitar")
  @ApiOperation({ summary: "Rejeitar documento", description: "Rejeita um documento solicitando reenvio" })
  @ApiParam({ name: "id", description: "ID do documento" })
  @ApiResponse({ status: 200, description: "Documento rejeitado" })
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
