import { Controller, Post, Param, Body, UseGuards, HttpCode } from "@nestjs/common";
import { VistoriaService } from "./vistoria.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import {
  AprovarVistoriaSchema,
  RejeitarVistoriaSchema,
  type AprovarVistoriaInput,
  type RejeitarVistoriaInput,
} from "@imbobi/schemas";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("vistoria")
export class VistoriaController {
  constructor(private readonly vistoria: VistoriaService) {}

  @Post(":etapaId/aprovar")
  @Roles("GESTOR_OBRA", "ADMIN")
  @HttpCode(200)
  aprovar(
    @Param("etapaId") etapaId: string,
    @UsuarioAtual() u: IUsuario,
    @Body(new ZodPipe(AprovarVistoriaSchema)) body: AprovarVistoriaInput,
  ) {
    return this.vistoria.aprovar(u.id, etapaId, body.observacoes);
  }

  @Post(":etapaId/rejeitar")
  @Roles("GESTOR_OBRA", "ADMIN")
  @HttpCode(200)
  rejeitar(
    @Param("etapaId") etapaId: string,
    @UsuarioAtual() u: IUsuario,
    @Body(new ZodPipe(RejeitarVistoriaSchema)) body: RejeitarVistoriaInput,
  ) {
    return this.vistoria.rejeitar(u.id, etapaId, body.motivo);
  }
}
