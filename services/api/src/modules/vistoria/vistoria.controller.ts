import { Controller, Get, Post, Param, Body, UseGuards, HttpCode, Query } from "@nestjs/common";
import { VistoriaService } from "./vistoria.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";

class AprovarDto {
  obraId?: string;
  observacoes?: string;
}

class RejeitarDto {
  motivo!: string;
}

class AgendarDto {
  etapaId!: string;
  dataAgendada!: string;
  observacoes?: string;
}

@ApiTags("vistoria")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("GESTOR", "ENGENHEIRO", "ADMIN")
@Controller("vistoria")
export class VistoriaController {
  constructor(private readonly vistoria: VistoriaService) {}

  @ApiOperation({ summary: "Listar etapas pendentes de vistoria" })
  @Get("pendentes")
  pendentes(@Query("limit") limit = "20", @Query("offset") offset = "0") {
    return this.vistoria.listarPendentes(Number(limit), Number(offset));
  }

  @ApiOperation({ summary: "Agendar vistoria para uma etapa" })
  @Post("agendar")
  @HttpCode(200)
  agendar(@UsuarioAtual() u: IUsuario, @Body() body: AgendarDto) {
    return this.vistoria.agendar(u.id, body.etapaId, body.dataAgendada, body.observacoes);
  }

  @ApiOperation({ summary: "Aprovar vistoria de etapa" })
  @Post(":etapaId/aprovar")
  @HttpCode(200)
  aprovar(
    @Param("etapaId") etapaId: string,
    @UsuarioAtual() u: IUsuario,
    @Body() body: AprovarDto,
  ) {
    return this.vistoria.aprovar(u.id, etapaId, body.observacoes);
  }

  @ApiOperation({ summary: "Rejeitar vistoria de etapa" })
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
