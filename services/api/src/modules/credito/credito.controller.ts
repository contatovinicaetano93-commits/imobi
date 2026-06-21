import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { Controller, Get, Post, Body, Param, UseGuards, HttpCode } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { CreditoService } from "./credito.service";
import { LiberacaoService } from "./liberacao.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import { SimulacaoCreditoSchema, SolicitacaoCreditoSchema } from "@imbobi/schemas";
import type { SimulacaoCreditoInput, SolicitacaoCreditoInput } from "@imbobi/schemas";

@ApiTags("Crédito")
@ApiBearerAuth("JWT")
@Controller("credito")
export class CreditoController {
  constructor(
    private readonly credito: CreditoService,
    private readonly liberacao: LiberacaoService,
  ) {}

  @Post("simular")
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: "Simula parcelas e juros para um crédito" })
  simular(@Body(new ZodPipe(SimulacaoCreditoSchema)) body: SimulacaoCreditoInput) {
    return this.credito.simular(body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @Post("solicitar")
  @HttpCode(201)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: "Cria crédito aprovado (Admin)" })
  @ApiResponse({ status: 201, description: "Crédito criado" })
  solicitar(
    @UsuarioAtual() u: IUsuario,
    @Body(new ZodPipe(SolicitacaoCreditoSchema)) body: SolicitacaoCreditoInput,
  ) {
    return this.credito.solicitar(u.id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Get("meus")
  @ApiOperation({ summary: "Lista créditos do usuário autenticado" })
  meus(@UsuarioAtual() u: IUsuario) {
    return this.credito.buscarPorUsuario(u.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(":id/extrato")
  @ApiOperation({ summary: "Extrato de liberações do crédito" })
  extrato(@Param("id") id: string, @UsuarioAtual() u: IUsuario) {
    return this.credito.extrato(id, u.id);
  }

  /** Solicitação manual de liberação de parcela (admin/gestor) */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "GESTOR", "GESTOR_FUNDO")
  @Post(":id/liberar")
  @HttpCode(201)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: "Solicita liberação de parcela (Admin/Gestor)" })
  @ApiResponse({ status: 201, description: "Liberação agendada" })
  @ApiResponse({ status: 400, description: "Saldo insuficiente ou crédito inativo" })
  liberar(
    @Param("id") creditoId: string,
    @Body("valor") valor: number,
    @Body("etapaId") etapaId: string | undefined,
    @Body("motivo") motivo: string | undefined,
    @UsuarioAtual() u: IUsuario,
  ) {
    return this.liberacao.solicitar(creditoId, u.id, { valor, etapaId, motivo });
  }

  /** Lista liberações de um crédito */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "GESTOR", "GESTOR_FUNDO")
  @Get(":id/liberacoes")
  @ApiOperation({ summary: "Lista liberações do crédito (Admin/Gestor)" })
  liberacoes(@Param("id") creditoId: string) {
    return this.liberacao.listar(creditoId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "GESTOR", "GESTOR_FUNDO")
  @Post(":id/estornar/:liberacaoId")
  @HttpCode(200)
  @ApiOperation({ summary: "Estorna uma liberação (cria DEBITO no ledger)" })
  @ApiResponse({ status: 409, description: "Já estornado" })
  estornar(
    @Param("id") creditoId: string,
    @Param("liberacaoId") liberacaoId: string,
    @Body("motivo") motivo: string,
    @UsuarioAtual() u: IUsuario,
  ) {
    return this.credito.estornar(creditoId, liberacaoId, u.id, motivo ?? "Estorno administrativo");
  }
}
