import { Controller, Get, Patch, Param, Query, Body, UseGuards, UseInterceptors } from "@nestjs/common";

import { Throttle } from "@nestjs/throttler";

import { CacheInterceptor, CacheTTL } from "@nestjs/cache-manager";

import { ManagerService } from "./manager.service";

import { KycService } from "../kyc/kyc.service";

import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";

import { RolesGuard } from "../../common/guards/roles.guard";

import { Roles } from "../../common/decorators/roles.decorator";

import { MANAGER_ROLES, MANAGER_WRITE_ROLES } from "../../common/constants/manager-roles";

import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";



@UseGuards(JwtAuthGuard, RolesGuard)

@Roles(...MANAGER_ROLES)

@Controller("manager")

export class ManagerController {

  constructor(

    private readonly manager: ManagerService,

    private readonly kyc: KycService,

  ) {}



  @Get("dashboard")

  @Throttle({ manager: { limit: 20, ttl: 60000 } })

  @UseInterceptors(CacheInterceptor)

  @CacheTTL(60)

  async dashboard(@UsuarioAtual() u: IUsuario) {

    return this.manager.obterEstatisticas();

  }



  @Get("carteira")

  @Throttle({ manager: { limit: 20, ttl: 60000 } })

  async carteira(@UsuarioAtual() u: IUsuario) {

    return this.manager.obterCarteira();

  }



  @Get("etapas-pendentes")

  @Throttle({ manager: { limit: 20, ttl: 60000 } })

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



  @Get("kyc-pendentes")

  @Throttle({ manager: { limit: 20, ttl: 60000 } })

  @UseInterceptors(CacheInterceptor)

  @CacheTTL(120)

  async listarKycPendentes(

    @UsuarioAtual() u: IUsuario,

    @Query("limit") limit: string = "20",

    @Query("offset") offset: string = "0"

  ) {

    return this.manager.listarKycPendentes(Number(limit), Number(offset));

  }



  @Get("etapas/:id")

  async obterEtapaDetalhe(@UsuarioAtual() u: IUsuario, @Param("id") id: string) {

    return this.manager.obterEtapaDetalhe(id);

  }



  @Get("kyc/:id")

  async obterKycDetalhe(@UsuarioAtual() u: IUsuario, @Param("id") id: string) {

    return this.manager.obterKycDetalhe(id);

  }



  @Patch("kyc/:id/aprovar")
  @Roles(...MANAGER_WRITE_ROLES)

  async aprovarKyc(@UsuarioAtual() u: IUsuario, @Param("id") id: string) {

    return this.kyc.aprovarDocumento(id, u.id);

  }



  @Patch("kyc/:id/rejeitar")
  @Roles(...MANAGER_WRITE_ROLES)

  async rejeitarKyc(

    @UsuarioAtual() u: IUsuario,

    @Param("id") id: string,

    @Body("motivo") motivo: string

  ) {

    return this.kyc.rejeitarDocumento(id, u.id, motivo);

  }



  @Get("etapas/:id/audit-log")

  async obterEtapaAuditLog(@UsuarioAtual() u: IUsuario, @Param("id") id: string) {

    return this.manager.obterEtapaAuditLog(id);

  }



  @Get("kyc/:id/audit-log")

  async obterKycAuditLog(@UsuarioAtual() u: IUsuario, @Param("id") id: string) {

    return this.manager.obterKycAuditLog(id);

  }

}

