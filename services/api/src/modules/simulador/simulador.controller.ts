import { Controller, Post, Body } from "@nestjs/common";
import { SimuladorService } from "./simulador.service";
import { SimuladorInputSchema } from "@imbobi/schemas";

@Controller("simulador")
export class SimuladorController {
  constructor(private readonly simuladorService: SimuladorService) {}

  @Post("calcular")
  async calcular(@Body() input: any) {
    const validated = SimuladorInputSchema.parse(input);
    return this.simuladorService.calcular(validated);
  }
}
