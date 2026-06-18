import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  UseGuards,
  HttpCode,
} from "@nestjs/common";
import { DadosBancariosService } from "./dados-bancarios.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { UsuarioAtual } from "../../common/decorators/usuario-atual.decorator";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import { DadosBancariosSchema } from "@imbobi/schemas";
import type { DadosBancariosInput } from "@imbobi/schemas";

@Controller("dados-bancarios")
@UseGuards(JwtAuthGuard)
export class DadosBancariosController {
  constructor(private readonly service: DadosBancariosService) {}

  @Get("meus")
  buscarMeus(@UsuarioAtual() usuario: UsuarioAtual) {
    return this.service.buscarMeus(usuario.id);
  }

  @Put()
  upsert(
    @UsuarioAtual() usuario: UsuarioAtual,
    @Body(new ZodPipe(DadosBancariosSchema)) body: DadosBancariosInput,
  ) {
    return this.service.upsert(usuario.id, body);
  }

  @Delete()
  @HttpCode(200)
  excluir(@UsuarioAtual() usuario: UsuarioAtual) {
    return this.service.excluir(usuario.id);
  }
}
