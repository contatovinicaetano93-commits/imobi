import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiParam, ApiResponse } from "@nestjs/swagger";
import { ManagerService } from "./manager.service";
import { EtapasService } from "../etapas/etapas.service";
import { KycService } from "../kyc/kyc.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { ManagerGuard } from "../../common/guards/manager.guard";
import {
  UsuarioAtual,
  type UsuarioAtual as IUsuario,
} from "../../common/decorators/usuario-atual.decorator";

@UseGuards(JwtAuthGuard, ManagerGuard)
@Controller("manager")
export class ManagerController {
  constructor(
    private readonly manager: ManagerService,
    private readonly etapas: EtapasService,
    private readonly kyc: KycService,
  ) {}

  @Get("dashboard")
  async dashboard(@UsuarioAtual() u: IUsuario) {
    return this.manager.obterEstatisticas();
  }

  @Get("etapas-pendentes")
  async listarEtapasPendentes(
    @UsuarioAtual() u: IUsuario,
    @Query("limit") limit: string = "20",
    @Query("offset") offset: string = "0",
  ) {
    return this.manager.listarEtapasPendentes(Number(limit), Number(offset));
  }

  @Get("kyc-pendentes")
  async listarKycPendentes(
    @UsuarioAtual() u: IUsuario,
    @Query("limit") limit: string = "20",
    @Query("offset") offset: string = "0",
  ) {
    return this.manager.listarKycPendentes(Number(limit), Number(offset));
  }

  @Get("etapas/:id")
  async obterEtapaDetalhe(
    @UsuarioAtual() u: IUsuario,
    @Param("id") id: string,
  ) {
    return this.manager.obterEtapaDetalhe(id);
  }

  @Get("kyc/:id")
  async obterKycDetalhe(@UsuarioAtual() u: IUsuario, @Param("id") id: string) {
    return this.manager.obterKycDetalhe(id);
  }

  @Patch("etapas/:id/aprovar")
  @ApiOperation({
    summary: "Aprovar etapa",
    description: "Aprova uma etapa de construção e libera parcela se aplicável",
  })
  @ApiParam({ name: "id", description: "ID da etapa" })
  @ApiResponse({ status: 200, description: "Etapa aprovada com sucesso" })
  async aprovarEtapa(
    @UsuarioAtual() u: IUsuario,
    @Param("id") id: string,
    @Body("observacao") observacao?: string,
  ) {
    return this.etapas.aprovar(u.id, id, observacao);
  }

  @Patch("etapas/:id/rejeitar")
  @ApiOperation({
    summary: "Rejeitar etapa",
    description: "Rejeita uma etapa com motivo documentado",
  })
  @ApiParam({ name: "id", description: "ID da etapa" })
  @ApiResponse({ status: 200, description: "Etapa rejeitada com sucesso" })
  async rejeitarEtapa(
    @UsuarioAtual() u: IUsuario,
    @Param("id") id: string,
    @Body("motivo") motivo: string,
  ) {
    return this.etapas.rejeitar(u.id, id, motivo);
  }

  @Patch("kyc/:id/aprovar")
  @ApiOperation({
    summary: "Aprovar KYC",
    description: "Aprova documentação KYC do usuário",
  })
  @ApiParam({ name: "id", description: "ID do documento KYC" })
  @ApiResponse({ status: 200, description: "KYC aprovado com sucesso" })
  async aprovarKyc(@UsuarioAtual() u: IUsuario, @Param("id") id: string) {
    return this.kyc.aprovarDocumento(id, u.id);
  }

  @Patch("kyc/:id/rejeitar")
  @ApiOperation({
    summary: "Rejeitar KYC",
    description: "Rejeita documentação KYC solicitando reenvio",
  })
  @ApiParam({ name: "id", description: "ID do documento KYC" })
  @ApiResponse({ status: 200, description: "KYC rejeitado com sucesso" })
  async rejeitarKyc(
    @UsuarioAtual() u: IUsuario,
    @Param("id") id: string,
    @Body("motivo") motivo: string,
  ) {
    return this.kyc.rejeitarDocumento(id, u.id, motivo);
  }
}
