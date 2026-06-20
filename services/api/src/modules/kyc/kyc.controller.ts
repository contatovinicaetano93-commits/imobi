import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { Controller, Post, Get, Patch, Body, Param, Query, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { KycService } from "./kyc.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { MANAGER_ROLES } from "../../common/constants/manager-roles";
import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import { KycUploadSchema, KycRejeitarSchema } from "@imbobi/schemas";
import type { KycUploadInput, KycRejeitarInput } from "@imbobi/schemas";

@UseGuards(JwtAuthGuard)
@ApiTags("KYC")
@ApiBearerAuth("JWT")
@Controller("kyc")
export class KycController {
  constructor(private readonly kyc: KycService) {}

  @Post("upload")
  async uploadDocumento(
    @UsuarioAtual() u: IUsuario,
    @Body(new ZodPipe(KycUploadSchema)) body: KycUploadInput,
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
  @Roles(...MANAGER_ROLES)
  @Get("pendentes")
  async listarPendentes(
    @Query("limit") limit = "50",
    @Query("offset") offset = "0",
  ) {
    return this.kyc.listarPendentes(Number(limit), Number(offset));
  }

  @UseGuards(RolesGuard)
  @Roles(...MANAGER_ROLES)
  @Patch(":id/aprovar")
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async aprovarDocumento(@UsuarioAtual() u: IUsuario, @Param("id") id: string) {
    return this.kyc.aprovarDocumento(id, u.id);
  }

  @UseGuards(RolesGuard)
  @Roles(...MANAGER_ROLES)
  @Patch(":id/rejeitar")
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async rejeitarDocumento(
    @UsuarioAtual() u: IUsuario,
    @Param("id") id: string,
    @Body(new ZodPipe(KycRejeitarSchema)) body: KycRejeitarInput,
  ) {
    return this.kyc.rejeitarDocumento(id, u.id, body.motivo);
  }

  @Get("verificar")
  async verificarKycCompleto(@UsuarioAtual() u: IUsuario) {
    return this.kyc.verificarKycCompleto(u.id);
  }
}
