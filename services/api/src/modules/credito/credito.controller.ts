import { Controller, Get, Post, Body, Param, UseGuards } from "@nestjs/common";
import { CreditoService } from "./credito.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import { SimulacaoCreditoSchema, SolicitacaoCreditoSchema } from "@imbobi/schemas";
import { Throttle } from "../../common/decorators/throttle.decorator";
import { UserThrottlerGuard } from "../../common/guards/user-throttler.guard";

@Controller("credito")
export class CreditoController {
  constructor(private readonly credito: CreditoService) {}

  @Post("simular")
  @UseGuards(UserThrottlerGuard)
  @Throttle(20, 3600000) // 20 requests per hour per user/IP
  simular(@Body(new ZodPipe(SimulacaoCreditoSchema)) body: unknown) {
    return this.credito.simular(body as never);
  }

  @UseGuards(JwtAuthGuard)
  @Post("solicitar")
  solicitar(
    @UsuarioAtual() u: IUsuario,
    @Body(new ZodPipe(SolicitacaoCreditoSchema)) body: unknown
  ) {
    return this.credito.solicitar(u.id, body as never);
  }

  @UseGuards(JwtAuthGuard)
  @Get("meus")
  meus(@UsuarioAtual() u: IUsuario) {
    return this.credito.buscarPorUsuario(u.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(":id/extrato")
  extrato(@Param("id") id: string) {
    return this.credito.extrato(id);
  }
}
