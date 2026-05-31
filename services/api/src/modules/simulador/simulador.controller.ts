import { Controller, Post, Body, HttpCode } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { SimuladorService } from "./simulador.service";
import { SimuladorInputSchema } from "@imbobi/schemas";
import { ZodPipe } from "../../common/pipes/zod.pipe";

@Controller("simulador")
export class SimuladorController {
  constructor(private readonly simuladorService: SimuladorService) {}

  @Post("calcular")
  @HttpCode(200)
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  async calcular(@Body(new ZodPipe(SimuladorInputSchema)) input: unknown) {
    return this.simuladorService.calcular(input as never);
  }
}
