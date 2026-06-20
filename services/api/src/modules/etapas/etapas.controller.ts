import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { Controller, Get, Patch, Param, Body, UseGuards, HttpCode } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { EtapasService } from "./etapas.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import { EtapaAtualizarStatusSchema } from "@imbobi/schemas";
import type { EtapaAtualizarStatusInput } from "@imbobi/schemas";

@UseGuards(JwtAuthGuard)
@ApiTags("Etapas")
@ApiBearerAuth("JWT")
@Controller("etapas")
export class EtapasController {
  constructor(private readonly etapas: EtapasService) {}

  @Get("obra/:obraId")
  listar(@Param("obraId") obraId: string, @UsuarioAtual() u: IUsuario) {
    return this.etapas.listarPorObra(obraId, u.id, u.tipo);
  }

  @Get(":id")
  buscar(@Param("id") id: string, @UsuarioAtual() u: IUsuario) {
    return this.etapas.buscar(id, u.id, u.tipo);
  }

  @UseGuards(RolesGuard)
  @Roles("ENGENHEIRO", "ADMIN")
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Patch(":id/aprovar")
  aprovar(
    @Param("id") id: string,
    @UsuarioAtual() u: IUsuario,
    @Body("observacao") obs?: string
  ) {
    return this.etapas.aprovar(u.id, id, obs);
  }

  @UseGuards(RolesGuard)
  @Roles("ENGENHEIRO", "ADMIN")
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Patch(":id/rejeitar")
  rejeitar(
    @Param("id") id: string,
    @UsuarioAtual() u: IUsuario,
    @Body("motivo") motivo: string,
  ) {
    return this.etapas.rejeitar(u.id, id, motivo);
  }

  @HttpCode(200)
  @Patch(":id/status")
  status(
    @Param("id") id: string,
    @Body(new ZodPipe(EtapaAtualizarStatusSchema)) body: EtapaAtualizarStatusInput,
    @UsuarioAtual() u: IUsuario,
  ) {
    return this.etapas.atualizarStatus(id, body.status, u.id, u.tipo);
  }
}
