import { Controller, Get, Post, Body, Param, UseGuards } from "@nestjs/common";
import { CreditoService } from "./credito.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import { SimulacaoCreditoSchema, SolicitacaoCreditoSchema } from "@imbobi/schemas";
import type { SimulacaoCreditoInput, SolicitacaoCreditoInput } from "@imbobi/schemas";

@Controller("credito")
export class CreditoController {
  constructor(private readonly credito: CreditoService) {}

  @Post("simular")
  simular(@Body(new ZodPipe(SimulacaoCreditoSchema)) body: SimulacaoCreditoInput) {
    return this.credito.simular(body);
  }

  @UseGuards(JwtAuthGuard)
  @Post("solicitar")
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
}
