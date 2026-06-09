import { Controller, Post, Get, Patch, Body, Param, UseGuards } from "@nestjs/common";
import { KycService } from "./kyc.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";

@UseGuards(JwtAuthGuard)
@Controller("kyc")
export class KycController {
  constructor(private readonly kyc: KycService) {}

  @Post("upload")
  async uploadDocumento(
    @UsuarioAtual() u: IUsuario,
    @Body() body: { tipo: string; url: string }
  ) {
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
