import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { Controller, Get, Post, Body, Param, UseGuards, HttpCode } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { CreditoService } from "./credito.service";
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
  constructor(private readonly credito: CreditoService) {}

  @Post("simular")
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  simular(@Body(new ZodPipe(SimulacaoCreditoSchema)) body: SimulacaoCreditoInput) {
    return this.credito.simular(body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @Post("solicitar")
  @HttpCode(201)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  solicitar(
    @UsuarioAtual() u: IUsuario,
    @Body(new ZodPipe(SolicitacaoCreditoSchema)) body: SolicitacaoCreditoInput
  ) {
    return this.credito.solicitar(u.id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Get("meus")
  meus(@UsuarioAtual() u: IUsuario) {
    return this.credito.buscarPorUsuario(u.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(":id/extrato")
  extrato(@Param("id") id: string, @UsuarioAtual() u: IUsuario) {
    return this.credito.extrato(id, u.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "GESTOR", "GESTOR_FUNDO")
  @Post(":id/estornar/:liberacaoId")
  @HttpCode(200)
  estornar(
    @Param("id") creditoId: string,
    @Param("liberacaoId") liberacaoId: string,
    @Body("motivo") motivo: string,
    @UsuarioAtual() u: IUsuario,
  ) {
    return this.credito.estornar(creditoId, liberacaoId, u.id, motivo ?? "Estorno administrativo");
  }
}
