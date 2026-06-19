import { Controller, Get, Patch, Delete, Param, Body, UseGuards, BadRequestException, HttpCode } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { EtapasService } from "./etapas.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { MANAGER_ROLES } from "../../common/constants/manager-roles";
import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";
import { z } from "zod";

const EtapaStatusSchema = z.enum(["PLANEJADA", "EM_EXECUCAO", "AGUARDANDO_VISTORIA", "REPROVADA", "CONCLUIDA"]);

@ApiTags("etapas")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("etapas")
export class EtapasController {
  constructor(private readonly etapas: EtapasService) {}

  @ApiOperation({ summary: "Listar etapas de uma obra" })
  @Get("obra/:obraId")
  listar(@Param("obraId") obraId: string, @UsuarioAtual() u: IUsuario) {
    return this.etapas.listarPorObra(obraId, u);
  }

  @ApiOperation({ summary: "Aprovar etapa (gestor/admin)" })
  @UseGuards(RolesGuard)
  @Roles(...MANAGER_ROLES)
  @Patch(":id/aprovar")
  aprovar(
    @Param("id") id: string,
    @UsuarioAtual() u: IUsuario,
    @Body("observacao") obs?: string
  ) {
    return this.etapas.aprovar(u.id, id, obs);
  }

  @ApiOperation({ summary: "Atualizar status da etapa" })
  @UseGuards(RolesGuard)
  @Roles("TOMADOR", "ENGENHEIRO", "GESTOR", "ADMIN")
  @Patch(":id/status")
  status(@Param("id") id: string, @Body("status") status: string, @UsuarioAtual() u: IUsuario) {
    const parsed = EtapaStatusSchema.safeParse(status);
    if (!parsed.success) throw new BadRequestException("Status inválido.");
    return this.etapas.atualizarStatus(id, parsed.data, u.id, u.tipo);
  }

  @ApiOperation({ summary: "Atualizar dados da etapa (gestor/admin)" })
  @UseGuards(RolesGuard)
  @Roles("GESTOR", "ADMIN")
  @Patch(":id")
  atualizar(
    @Param("id") id: string,
    @Body() body: { nome?: string; ordem?: number; percentualObra?: number; dataPlanejadaConclusao?: string },
    @UsuarioAtual() u: IUsuario
  ) {
    return this.etapas.atualizar(id, body, u.id);
  }

  @ApiOperation({ summary: "Excluir etapa planejada (admin)" })
  @UseGuards(RolesGuard)
  @Roles("ADMIN")
  @Delete(":id")
  @HttpCode(200)
  deletar(@Param("id") id: string, @UsuarioAtual() u: IUsuario) {
    return this.etapas.deletar(id, u.id);
  }
}
