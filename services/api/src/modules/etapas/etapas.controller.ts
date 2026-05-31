import { Controller, Get, Patch, Param, Body, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from "@nestjs/swagger";
import { EtapasService } from "./etapas.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";

@ApiTags("etapas")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("etapas")
export class EtapasController {
  constructor(private readonly etapas: EtapasService) {}

  @Get("obra/:obraId")
  @ApiOperation({ summary: "Listar etapas da obra", description: "Retorna todas as etapas de uma obra específica" })
  @ApiParam({ name: "obraId", description: "ID da obra" })
  @ApiResponse({ status: 200, description: "Lista de etapas" })
  listar(@Param("obraId") obraId: string) {
    return this.etapas.listarPorObra(obraId);
  }

  @Patch(":id/aprovar")
  @ApiOperation({ summary: "Aprovar etapa", description: "Aprova uma etapa de construção" })
  @ApiParam({ name: "id", description: "ID da etapa" })
  @ApiResponse({ status: 200, description: "Etapa aprovada" })
  aprovar(
    @Param("id") id: string,
    @UsuarioAtual() u: IUsuario,
    @Body("observacao") obs?: string
  ) {
    return this.etapas.aprovar(u.id, id, obs);
  }

  @Patch(":id/status")
  @ApiOperation({ summary: "Atualizar status", description: "Atualiza o status de uma etapa" })
  @ApiParam({ name: "id", description: "ID da etapa" })
  @ApiResponse({ status: 200, description: "Status atualizado" })
  status(@Param("id") id: string, @Body("status") status: string) {
    return this.etapas.atualizarStatus(id, status);
  }
}
