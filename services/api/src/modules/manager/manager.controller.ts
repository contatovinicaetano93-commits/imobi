import { Controller, Get, Patch, Param, Query, Body, UseGuards, UseInterceptors } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { CacheInterceptor, CacheTTL } from "@nestjs/cache-manager";
import { ManagerService } from "./manager.service";
import { EtapasService } from "../etapas/etapas.service";
import { KycService } from "../kyc/kyc.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("manager")
export class ManagerController {
  constructor(
    private readonly manager: ManagerService,
    private readonly etapas: EtapasService,
    private readonly kyc: KycService,
  ) {}

  @Get("dashboard")
  @Roles("GESTOR", "ADMIN")
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async dashboard(@UsuarioAtual() u: IUsuario) {
    return this.manager.obterEstatisticas();
  }

  @Get("portfolio")
  @Roles("GESTOR", "ADMIN")
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async portfolio(@UsuarioAtual() u: IUsuario) {
    return this.manager.obterPortfolio();
  }

  @Get("etapas-pendentes")
  @Roles("GESTOR", "ADMIN")
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(120) // 2 min
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
      {
        status,
        dataInicio,
        dataFim,
        obraType,
        priority,
        searchTerm,
      }
    );
  }

  @Get("kyc-pendentes")
  @Roles("GESTOR", "ADMIN")
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(120) // 2 min
  async listarKycPendentes(
    @UsuarioAtual() u: IUsuario,
    @Query("limit") limit: string = "20",
    @Query("offset") offset: string = "0"
  ) {
    return this.manager.listarKycPendentes(Number(limit), Number(offset));
  }

  @Get("etapas/:id")
  @Roles("GESTOR", "ADMIN")
  async obterEtapaDetalhe(@UsuarioAtual() u: IUsuario, @Param("id") id: string) {
    return this.manager.obterEtapaDetalhe(id);
  }

  @Get("kyc/:id")
  @Roles("GESTOR", "ADMIN")
  async obterKycDetalhe(@UsuarioAtual() u: IUsuario, @Param("id") id: string) {
    return this.manager.obterKycDetalhe(id);
  }

  /** Liberação de etapa/crédito: engenheiro ou admin — gestor do fundo só acompanha. */
  @Patch("etapas/:id/aprovar")
  @Roles("ADMIN", "ENGENHEIRO")
  async aprovarEtapa(
    @UsuarioAtual() u: IUsuario,
    @Param("id") id: string,
    @Body("observacao") observacao?: string
  ) {
    return this.etapas.aprovar(u.id, id, observacao);
  }

  @Patch("etapas/:id/rejeitar")
  @Roles("ADMIN", "ENGENHEIRO")
  async rejeitarEtapa(
    @UsuarioAtual() u: IUsuario,
    @Param("id") id: string,
    @Body("motivo") motivo: string
  ) {
    return this.etapas.rejeitar(u.id, id, motivo);
  }

  @Patch("kyc/:id/aprovar")
  @Roles("ADMIN")
  async aprovarKyc(@UsuarioAtual() u: IUsuario, @Param("id") id: string) {
    return this.kyc.aprovarDocumento(id, u.id);
  }

  @Patch("kyc/:id/rejeitar")
  @Roles("ADMIN")
  async rejeitarKyc(
    @UsuarioAtual() u: IUsuario,
    @Param("id") id: string,
    @Body("motivo") motivo: string
  ) {
    return this.kyc.rejeitarDocumento(id, u.id, motivo);
  }

  @Get("etapas/:id/audit-log")
  @Roles("GESTOR", "ADMIN")
  async obterEtapaAuditLog(@UsuarioAtual() u: IUsuario, @Param("id") id: string) {
    return this.manager.obterEtapaAuditLog(id);
  }

  @Get("kyc/:id/audit-log")
  @Roles("GESTOR", "ADMIN")
  async obterKycAuditLog(@UsuarioAtual() u: IUsuario, @Param("id") id: string) {
    return this.manager.obterKycAuditLog(id);
  }
}
