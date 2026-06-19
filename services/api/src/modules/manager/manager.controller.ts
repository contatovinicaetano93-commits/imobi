import { Controller, Get, Patch, Param, Query, Body, UseGuards, UseInterceptors } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { CacheInterceptor, CacheTTL } from "@nestjs/cache-manager";
import { ManagerService } from "./manager.service";
import { EtapasService } from "../etapas/etapas.service";
import { KycService } from "../kyc/kyc.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { MANAGER_ROLES } from "../../common/constants/manager-roles";
import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";

@ApiTags("manager")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...MANAGER_ROLES)
@Controller("manager")
export class ManagerController {
  constructor(
    private readonly manager: ManagerService,
    private readonly etapas: EtapasService,
    private readonly kyc: KycService,
  ) {}

  @ApiOperation({ summary: "Estatísticas do dashboard do manager" })
  @Get("dashboard")
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async dashboard(@UsuarioAtual() u: IUsuario) {
    return this.manager.obterEstatisticas();
  }

  @ApiOperation({ summary: "Carteira de obras sob gestão" })
  @Get("carteira")
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async carteira(@UsuarioAtual() u: IUsuario) {
    return this.manager.obterCarteira();
  }

  @ApiOperation({ summary: "Listar etapas pendentes de aprovação (paginado, filtrável)" })
  @Get("etapas-pendentes")
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(120)
  async listarEtapasPendentes(
    @UsuarioAtual() u: IUsuario,
    @Query("limit") limit: string = "20",
    @Query("offset") offset: string = "0",
    @Query("status") status?: "todas" | "pendente" | "aprovada" | "rejeitada",
    @Query("dataInicio") dataInicio?: string,
    @Query("dataFim") dataFim?: string,
    @Query("obraType") obraType?: string,
    @Query("priority") priority?: "todas" | "urgente" | "intermediaria" | "normal",
    @Query("searchTerm") searchTerm?: string
  ) {
    return this.manager.listarEtapasPendentes(
      Number(limit),
      Number(offset),
      { status, dataInicio, dataFim, obraType, priority, searchTerm }
    );
  }

  @ApiOperation({ summary: "Listar KYCs pendentes de revisão (paginado)" })
  @Get("kyc-pendentes")
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(120)
  async listarKycPendentes(
    @UsuarioAtual() u: IUsuario,
    @Query("limit") limit: string = "20",
    @Query("offset") offset: string = "0"
  ) {
    return this.manager.listarKycPendentes(Number(limit), Number(offset));
  }

  @ApiOperation({ summary: "Detalhes de uma etapa" })
  @Get("etapas/:id")
  async obterEtapaDetalhe(@UsuarioAtual() u: IUsuario, @Param("id") id: string) {
    return this.manager.obterEtapaDetalhe(id);
  }

  @ApiOperation({ summary: "Detalhes de um KYC" })
  @Get("kyc/:id")
  async obterKycDetalhe(@UsuarioAtual() u: IUsuario, @Param("id") id: string) {
    return this.manager.obterKycDetalhe(id);
  }

  @ApiOperation({ summary: "Aprovar etapa de obra" })
  @Patch("etapas/:id/aprovar")
  async aprovarEtapa(
    @UsuarioAtual() u: IUsuario,
    @Param("id") id: string,
    @Body("observacao") observacao?: string
  ) {
    return this.etapas.aprovar(u.id, id, observacao);
  }

  @ApiOperation({ summary: "Rejeitar etapa de obra" })
  @Patch("etapas/:id/rejeitar")
  async rejeitarEtapa(
    @UsuarioAtual() u: IUsuario,
    @Param("id") id: string,
    @Body("motivo") motivo: string
  ) {
    return this.etapas.rejeitar(u.id, id, motivo);
  }

  @ApiOperation({ summary: "Aprovar documento KYC" })
  @Patch("kyc/:id/aprovar")
  async aprovarKyc(@UsuarioAtual() u: IUsuario, @Param("id") id: string) {
    return this.kyc.aprovarDocumento(id, u.id);
  }

  @ApiOperation({ summary: "Rejeitar documento KYC" })
  @Patch("kyc/:id/rejeitar")
  async rejeitarKyc(
    @UsuarioAtual() u: IUsuario,
    @Param("id") id: string,
    @Body("motivo") motivo: string
  ) {
    return this.kyc.rejeitarDocumento(id, u.id, motivo);
  }

  @ApiOperation({ summary: "Audit log de uma etapa" })
  @Get("etapas/:id/audit-log")
  async obterEtapaAuditLog(@UsuarioAtual() u: IUsuario, @Param("id") id: string) {
    return this.manager.obterEtapaAuditLog(id);
  }

  @ApiOperation({ summary: "Audit log de um KYC" })
  @Get("kyc/:id/audit-log")
  async obterKycAuditLog(@UsuarioAtual() u: IUsuario, @Param("id") id: string) {
    return this.manager.obterKycAuditLog(id);
  }
}
