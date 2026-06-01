import { Controller, Post, Body, HttpCode } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { SimuladorService } from "./simulador.service";
import { SimuladorInputSchema } from "@imbobi/schemas";
import { ZodPipe } from "../../common/pipes/zod.pipe";

@ApiTags("credito")
@Controller("simulador")
export class SimuladorController {
  constructor(private readonly simuladorService: SimuladorService) {}

  @Post("calcular")
  @HttpCode(200)
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  @ApiOperation({
    summary: "Simular crédito",
    description:
      "Calcula taxa de juros, LTV e parcelas baseado em parâmetros do projeto",
  })
  @ApiResponse({ status: 200, description: "Simulação calculada com sucesso" })
  @ApiResponse({ status: 400, description: "Parâmetros de entrada inválidos" })
  async calcular(@Body(new ZodPipe(SimuladorInputSchema)) input: unknown) {
    return this.simuladorService.calcular(input as never);
  }
}
