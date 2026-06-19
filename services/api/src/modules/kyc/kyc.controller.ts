import { Controller, Post, Get, Patch, Body, Param, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { KycService } from "./kyc.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { MANAGER_ROLES } from "../../common/constants/manager-roles";
import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";

@ApiTags("kyc")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("kyc")
export class KycController {
  constructor(private readonly kyc: KycService) {}

  @ApiOperation({ summary: "Enviar documento KYC" })
  @Post("upload")
  async uploadDocumento(
    @UsuarioAtual() u: IUsuario,
    @Body() body: { tipo: string; url: string }
  ) {
    return this.kyc.uploadDocumento(u.id, body.tipo, body.url);
  }

  @ApiOperation({ summary: "Listar documentos KYC do usuário" })
  @Get("documentos")
  async listarDocumentos(@UsuarioAtual() u: IUsuario) {
    return this.kyc.listarDocumentos(u.id);
  }

  @ApiOperation({ summary: "Obter status KYC do usuário" })
  @Get("status")
  async obterStatus(@UsuarioAtual() u: IUsuario) {
    return this.kyc.obterStatus(u.id);
  }

  @ApiOperation({ summary: "Listar documentos pendentes de análise (gestor/admin)" })
  @UseGuards(RolesGuard)
  @Roles(...MANAGER_ROLES)
  @Get("pendentes")
  async listarPendentes() {
    return this.kyc.listarPendentes();
  }

  @ApiOperation({ summary: "Aprovar documento KYC (gestor/admin)" })
  @UseGuards(RolesGuard)
  @Roles(...MANAGER_ROLES)
  @Patch(":id/aprovar")
  async aprovarDocumento(@UsuarioAtual() u: IUsuario, @Param("id") id: string) {
    return this.kyc.aprovarDocumento(id, u.id);
  }

  @ApiOperation({ summary: "Rejeitar documento KYC (gestor/admin)" })
  @UseGuards(RolesGuard)
  @Roles(...MANAGER_ROLES)
  @Patch(":id/rejeitar")
  async rejeitarDocumento(
    @UsuarioAtual() u: IUsuario,
    @Param("id") id: string,
    @Body() body: { motivo: string }
  ) {
    return this.kyc.rejeitarDocumento(id, u.id, body.motivo);
  }

  @ApiOperation({ summary: "Verificar se KYC está completo" })
  @Get("verificar")
  async verificarKycCompleto(@UsuarioAtual() u: IUsuario) {
    return this.kyc.verificarKycCompleto(u.id);
  }
}
