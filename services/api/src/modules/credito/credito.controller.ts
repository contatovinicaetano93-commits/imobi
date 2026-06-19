import { Controller, Get, Post, Body, Param, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { CreditoService } from "./credito.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import { SimulacaoCreditoSchema, SolicitacaoCreditoSchema } from "@imbobi/schemas";
import type { SimulacaoCreditoInput, SolicitacaoCreditoInput } from "@imbobi/schemas";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";

@ApiTags("credito")
@ApiBearerAuth()
@Controller("credito")
export class CreditoController {
  constructor(private readonly credito: CreditoService) {}

  @ApiOperation({ summary: "Simular crédito imobiliário" })
  @Throttle({ auth: { limit: 10, ttl: 60000 } })
  @Post("simular")
  simular(@Body(new ZodPipe(SimulacaoCreditoSchema)) body: SimulacaoCreditoInput) {
    return this.credito.simular(body);
  }

  @ApiOperation({ summary: "Solicitar crédito imobiliário (admin)" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @Post("solicitar")
  solicitar(
    @UsuarioAtual() u: IUsuario,
    @Body(new ZodPipe(SolicitacaoCreditoSchema)) body: SolicitacaoCreditoInput
  ) {
    return this.credito.solicitar(u.id, body);
  }

  @ApiOperation({ summary: "Listar créditos do usuário autenticado" })
  @UseGuards(JwtAuthGuard)
  @Get("meus")
  meus(@UsuarioAtual() u: IUsuario) {
    return this.credito.buscarPorUsuario(u.id);
  }

  @ApiOperation({ summary: "Obter extrato de um crédito" })
  @UseGuards(JwtAuthGuard)
  @Get(":id/extrato")
  extrato(@Param("id") id: string, @UsuarioAtual() u: IUsuario) {
    return this.credito.extrato(id, u.id);
  }
}
