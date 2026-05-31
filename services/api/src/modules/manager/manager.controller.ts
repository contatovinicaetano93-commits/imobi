import { Controller, Get, Patch, Post, Param, Query, Body, UseGuards, UseInterceptors, BadRequestException } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { CacheInterceptor, CacheTTL } from "@nestjs/cache-manager";
import { ManagerService } from "./manager.service";
import { EtapasService } from "../etapas/etapas.service";
import { KycService } from "../kyc/kyc.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";

@ApiTags("manager")
@ApiBearerAuth()
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
  @ApiOperation({ summary: "Dashboard de estatísticas", description: "Retorna resumo de estatísticas para o gerenciador" })
  @ApiResponse({ status: 200, description: "Estatísticas carregadas" })
  async dashboard(@UsuarioAtual() u: IUsuario) {
    await this.manager.verificarPermissao(u.id);
    return this.manager.obterEstatisticas();
  }

  @Get("etapas-pendentes")
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(120)
  @ApiOperation({ summary: "Listar etapas pendentes", description: "Lista etapas aguardando aprovação com filtros (2min cache)" })
  @ApiQuery({ name: "limit", example: "20", required: false })
  @ApiQuery({ name: "offset", example: "0", required: false })
  @ApiQuery({ name: "status", enum: ["todas", "pendente", "aprovada", "rejeitada"], required: false })
  @ApiResponse({ status: 200, description: "Lista de etapas pendentes" })
  async listarEtapasPendentes(
    @UsuarioAtual() u: IUsuario,
    @Query("limit") limit: string = "20",
    @Query("offset") offset: string = "0",
    @Query("status") status?: "todas" | "pendente" | "aprovada" | "rejeitada",
    @Query("dataInicio") dataInicio?: string,
    @Query("dataFim") dataFim?: string,
    @Query("obraType") obraType?: string,
    @Query("priority") priority?: "todas" | "urgente" | "intermediaria" | "normal"
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
      }
    );
  }

  @Get("kyc-pendentes")
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(120)
  @ApiOperation({ summary: "Listar KYC pendentes", description: "Lista documentos KYC aguardando aprovação (2min cache)" })
  @ApiQuery({ name: "limit", example: "20", required: false })
  @ApiQuery({ name: "offset", example: "0", required: false })
  @ApiResponse({ status: 200, description: "Lista de KYC pendentes" })
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
  @ApiOperation({ summary: "Aprovar etapa", description: "Aprova uma etapa de construção e libera parcela se aplicável" })
  @ApiParam({ name: "id", description: "ID da etapa" })
  @ApiResponse({ status: 200, description: "Etapa aprovada com sucesso" })
  async aprovarEtapa(
    @UsuarioAtual() u: IUsuario,
    @Param("id") id: string,
    @Body("observacao") observacao?: string
  ) {
    await this.manager.verificarPermissao(u.id);
    return this.etapas.aprovar(u.id, id, observacao);
  }

  @Patch("etapas/:id/rejeitar")
  @ApiOperation({ summary: "Rejeitar etapa", description: "Rejeita uma etapa com motivo documentado" })
  @ApiParam({ name: "id", description: "ID da etapa" })
  @ApiResponse({ status: 200, description: "Etapa rejeitada com sucesso" })
  async rejeitarEtapa(
    @UsuarioAtual() u: IUsuario,
    @Param("id") id: string,
    @Body("motivo") motivo: string
  ) {
    if (!motivo?.trim()) {
      throw new BadRequestException("Motivo da rejeição é obrigatório");
    }
    await this.manager.verificarPermissao(u.id);
    return this.etapas.rejeitar(u.id, id, motivo);
  }

  @Patch("kyc/:id/aprovar")
  @ApiOperation({ summary: "Aprovar KYC", description: "Aprova documentação KYC do usuário" })
  @ApiParam({ name: "id", description: "ID do documento KYC" })
  @ApiResponse({ status: 200, description: "KYC aprovado com sucesso" })
  async aprovarKyc(@UsuarioAtual() u: IUsuario, @Param("id") id: string) {
    await this.manager.verificarPermissao(u.id);
    return this.kyc.aprovarDocumento(id, u.id);
  }

  @Patch("kyc/:id/rejeitar")
  @ApiOperation({ summary: "Rejeitar KYC", description: "Rejeita documentação KYC solicitando reenvio" })
  @ApiParam({ name: "id", description: "ID do documento KYC" })
  @ApiResponse({ status: 200, description: "KYC rejeitado com sucesso" })
  async rejeitarKyc(
    @UsuarioAtual() u: IUsuario,
    @Param("id") id: string,
    @Body("motivo") motivo: string
  ) {
    if (!motivo?.trim()) {
      throw new BadRequestException("Motivo da rejeição é obrigatório");
    }
    await this.manager.verificarPermissao(u.id);
    return this.kyc.rejeitarDocumento(id, u.id, motivo);
  }

  @Get("etapas/:id/audit-log")
  @ApiOperation({ summary: "Audit log da etapa", description: "Retorna histórico completo de ações sobre a etapa" })
  @ApiParam({ name: "id", description: "ID da etapa" })
  @ApiResponse({ status: 200, description: "Histórico de auditoria" })
  async obterEtapaAuditLog(@UsuarioAtual() u: IUsuario, @Param("id") id: string) {
    await this.manager.verificarPermissao(u.id);
    return this.manager.obterEtapaAuditLog(id);
  }

  @Get("kyc/:id/audit-log")
  @ApiOperation({ summary: "Audit log do KYC", description: "Retorna histórico completo de ações sobre o KYC" })
  @ApiParam({ name: "id", description: "ID do documento KYC" })
  @ApiResponse({ status: 200, description: "Histórico de auditoria" })
  async obterKycAuditLog(@UsuarioAtual() u: IUsuario, @Param("id") id: string) {
    await this.manager.verificarPermissao(u.id);
    return this.manager.obterKycAuditLog(id);
  }

  @Post("etapas/batch-aprovar")
  @ApiOperation({ summary: "Aprovar múltiplas etapas", description: "Aprova em lote até 100 etapas de uma vez" })
  @ApiResponse({ status: 200, description: "Resultado do processamento em lote" })
  async batchAprovarEtapas(
    @UsuarioAtual() u: IUsuario,
    @Body() body: { ids: string[]; observacao?: string }
  ) {
    if (!body.ids || body.ids.length === 0) {
      throw new BadRequestException("Lista de IDs vazia");
    }
    if (body.ids.length > 100) {
      throw new BadRequestException("Máximo 100 etapas por vez");
    }
    await this.manager.verificarPermissao(u.id);

    const results = await Promise.allSettled(
      body.ids.map(id => this.etapas.aprovar(u.id, id, body.observacao))
    );

    const aprovadas = results.filter(r => r.status === "fulfilled").length;
    const erros = results.filter(r => r.status === "rejected").length;

    return { aprovadas, erros, total: body.ids.length };
  }

  @Post("etapas/batch-rejeitar")
  @ApiOperation({ summary: "Rejeitar múltiplas etapas", description: "Rejeita em lote até 100 etapas com motivo comum" })
  @ApiResponse({ status: 200, description: "Resultado do processamento em lote" })
  async batchRejeitarEtapas(
    @UsuarioAtual() u: IUsuario,
    @Body() body: { ids: string[]; motivo: string }
  ) {
    if (!body.ids || body.ids.length === 0) {
      throw new BadRequestException("Lista de IDs vazia");
    }
    if (body.ids.length > 100) {
      throw new BadRequestException("Máximo 100 etapas por vez");
    }
    if (!body.motivo?.trim()) {
      throw new BadRequestException("Motivo da rejeição é obrigatório");
    }
    await this.manager.verificarPermissao(u.id);

    const results = await Promise.allSettled(
      body.ids.map(id => this.etapas.rejeitar(u.id, id, body.motivo))
    );

    const rejeitadas = results.filter(r => r.status === "fulfilled").length;
    const erros = results.filter(r => r.status === "rejected").length;

    return { rejeitadas, erros, total: body.ids.length };
  }

  @Post("kyc/batch-aprovar")
  @ApiOperation({ summary: "Aprovar múltiplos KYC", description: "Aprova em lote até 100 documentos KYC" })
  @ApiResponse({ status: 200, description: "Resultado do processamento em lote" })
  async batchAprovarKyc(
    @UsuarioAtual() u: IUsuario,
    @Body() body: { ids: string[] }
  ) {
    if (!body.ids || body.ids.length === 0) {
      throw new BadRequestException("Lista de IDs vazia");
    }
    if (body.ids.length > 100) {
      throw new BadRequestException("Máximo 100 KYCs por vez");
    }
    await this.manager.verificarPermissao(u.id);

    const results = await Promise.allSettled(
      body.ids.map(id => this.kyc.aprovarDocumento(id, u.id))
    );

    const aprovados = results.filter(r => r.status === "fulfilled").length;
    const erros = results.filter(r => r.status === "rejected").length;

    return { aprovados, erros, total: body.ids.length };
  }

  @Post("kyc/batch-rejeitar")
  @ApiOperation({ summary: "Rejeitar múltiplos KYC", description: "Rejeita em lote até 100 documentos KYC com motivo comum" })
  @ApiResponse({ status: 200, description: "Resultado do processamento em lote" })
  async batchRejeitarKyc(
    @UsuarioAtual() u: IUsuario,
    @Body() body: { ids: string[]; motivo: string }
  ) {
    if (!body.ids || body.ids.length === 0) {
      throw new BadRequestException("Lista de IDs vazia");
    }
    if (body.ids.length > 100) {
      throw new BadRequestException("Máximo 100 KYCs por vez");
    }
    if (!body.motivo?.trim()) {
      throw new BadRequestException("Motivo da rejeição é obrigatório");
    }
    await this.manager.verificarPermissao(u.id);

    const results = await Promise.allSettled(
      body.ids.map(id => this.kyc.rejeitarDocumento(id, u.id, body.motivo))
    );

    const rejeitados = results.filter(r => r.status === "fulfilled").length;
    const erros = results.filter(r => r.status === "rejected").length;

    return { rejeitados, erros, total: body.ids.length };
  }
}
