import { Controller, Get, Patch, Param, Query, Body, UseGuards, UseInterceptors } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { CacheInterceptor, CacheTTL } from "@nestjs/cache-manager";
import { ManagerService } from "./manager.service";
import { EtapasService } from "../etapas/etapas.service";
import { KycService } from "../kyc/kyc.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";

@UseGuards(JwtAuthGuard)
@Controller("manager")
export class ManagerController {
  constructor(
    private readonly manager: ManagerService,
    private readonly etapas: EtapasService,
    private readonly kyc: KycService,
  ) {}

  @Get("dashboard")
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async dashboard(@UsuarioAtual() u: IUsuario) {
    await this.manager.verificarPermissao(u.id);
    return this.manager.obterEstatisticas();
  }

  @Get("etapas-pendentes")
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
    await this.manager.verificarPermissao(u.id);
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
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(120) // 2 min
  async listarKycPendentes(
    @UsuarioAtual() u: IUsuario,
    @Query("limit") limit: string = "20",
    @Query("offset") offset: string = "0"
  ) {
    await this.manager.verificarPermissao(u.id);
    return this.manager.listarKycPendentes(Number(limit), Number(offset));
  }

  @Get("etapas/:id")
  async obterEtapaDetalhe(@UsuarioAtual() u: IUsuario, @Param("id") id: string) {
    await this.manager.verificarPermissao(u.id);
    return this.manager.obterEtapaDetalhe(id);
  }

  @Get("kyc/:id")
  async obterKycDetalhe(@UsuarioAtual() u: IUsuario, @Param("id") id: string) {
    await this.manager.verificarPermissao(u.id);
    return this.manager.obterKycDetalhe(id);
  }

  @Patch("etapas/:id/aprovar")
  async aprovarEtapa(
    @UsuarioAtual() u: IUsuario,
    @Param("id") id: string,
    @Body("observacao") observacao?: string
  ) {
    await this.manager.verificarPermissao(u.id);
    return this.etapas.aprovar(u.id, id, observacao);
  }

  @Patch("etapas/:id/rejeitar")
  async rejeitarEtapa(
    @UsuarioAtual() u: IUsuario,
    @Param("id") id: string,
    @Body("motivo") motivo: string
  ) {
    await this.manager.verificarPermissao(u.id);
    return this.etapas.rejeitar(u.id, id, motivo);
  }

  @Patch("kyc/:id/aprovar")
  async aprovarKyc(@UsuarioAtual() u: IUsuario, @Param("id") id: string) {
    await this.manager.verificarPermissao(u.id);
    return this.kyc.aprovarDocumento(id, u.id);
  }

  @Patch("kyc/:id/rejeitar")
  async rejeitarKyc(
    @UsuarioAtual() u: IUsuario,
    @Param("id") id: string,
    @Body("motivo") motivo: string
  ) {
    await this.manager.verificarPermissao(u.id);
    return this.kyc.rejeitarDocumento(id, u.id, motivo);
  }

  @Get("obras")
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async listarObras(
    @UsuarioAtual() u: IUsuario,
    @Query("limit") limit: string = "20",
    @Query("offset") offset: string = "0",
    @Query("status") status?: string,
    @Query("searchTerm") searchTerm?: string
  ) {
    await this.manager.verificarPermissao(u.id);
    return this.manager.listarObras(Number(limit), Number(offset), { status, searchTerm });
  }

  @Get("usuarios")
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async listarUsuarios(
    @UsuarioAtual() u: IUsuario,
    @Query("limit") limit: string = "20",
    @Query("offset") offset: string = "0",
    @Query("searchTerm") searchTerm?: string,
    @Query("tipo") tipo?: string,
    @Query("kycStatus") kycStatus?: string
  ) {
    await this.manager.verificarPermissao(u.id);
    return this.manager.listarUsuarios(Number(limit), Number(offset), { searchTerm, tipo, kycStatus });
  }

  @Get("etapas/:id/audit-log")
  async obterEtapaAuditLog(@UsuarioAtual() u: IUsuario, @Param("id") id: string) {
    await this.manager.verificarPermissao(u.id);
    return this.manager.obterEtapaAuditLog(id);
  }

  @Get("kyc/:id/audit-log")
  async obterKycAuditLog(@UsuarioAtual() u: IUsuario, @Param("id") id: string) {
    await this.manager.verificarPermissao(u.id);
    return this.manager.obterKycAuditLog(id);
  }
}
