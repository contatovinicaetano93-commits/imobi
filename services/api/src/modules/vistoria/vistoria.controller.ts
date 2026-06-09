import { Controller, Post, Param, Body, UseGuards, HttpCode } from "@nestjs/common";
import { VistoriaService } from "./vistoria.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";

class AprovarDto {
  obraId?: string;
  observacoes?: string;
}

class RejeitarDto {
  motivo!: string;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("GESTOR_OBRA", "ENGENHEIRO", "ADMIN")
@Controller("vistoria")
export class VistoriaController {
  constructor(private readonly vistoria: VistoriaService) {}

  @Post(":etapaId/aprovar")
  @HttpCode(200)
  aprovar(
    @Param("etapaId") etapaId: string,
    @UsuarioAtual() u: IUsuario,
    @Body() body: AprovarDto,
  ) {
    return this.vistoria.aprovar(u.id, etapaId, body.observacoes);
  }

  @Post(":etapaId/rejeitar")
  @HttpCode(200)
  rejeitar(
    @Param("etapaId") etapaId: string,
    @UsuarioAtual() u: IUsuario,
    @Body() body: RejeitarDto,
  ) {
    return this.vistoria.rejeitar(u.id, etapaId, body.motivo ?? "Reprovado pelo gestor.");
  }
}
