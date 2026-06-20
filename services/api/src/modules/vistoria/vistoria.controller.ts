import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { Controller, Post, Param, Body, UseGuards, HttpCode } from "@nestjs/common";
import { VistoriaService } from "./vistoria.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import { VistoriaAprovarSchema, VistoriaRejeitarSchema } from "@imbobi/schemas";
import type { VistoriaAprovarInput, VistoriaRejeitarInput } from "@imbobi/schemas";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("GESTOR", "ENGENHEIRO", "ADMIN")
@ApiTags("Vistoria")
@ApiBearerAuth("JWT")
@Controller("vistoria")
export class VistoriaController {
  constructor(private readonly vistoria: VistoriaService) {}

  @Post(":etapaId/aprovar")
  @HttpCode(200)
  aprovar(
    @Param("etapaId") etapaId: string,
    @UsuarioAtual() u: IUsuario,
    @Body(new ZodPipe(VistoriaAprovarSchema)) body: VistoriaAprovarInput,
  ) {
    return this.vistoria.aprovar(u.id, etapaId, body.observacoes);
  }

  @Post(":etapaId/rejeitar")
  @HttpCode(200)
  rejeitar(
    @Param("etapaId") etapaId: string,
    @UsuarioAtual() u: IUsuario,
    @Body(new ZodPipe(VistoriaRejeitarSchema)) body: VistoriaRejeitarInput,
  ) {
    return this.vistoria.rejeitar(u.id, etapaId, body.motivo);
  }
}
