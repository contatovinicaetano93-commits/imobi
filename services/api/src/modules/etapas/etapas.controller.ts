import { Controller, Get, Patch, Param, Body, UseGuards, ForbiddenException } from "@nestjs/common";
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
  async listar(@UsuarioAtual() u: IUsuario, @Param("obraId") obraId: string) {
    return this.etapas.listarPorObraComValidacao(u.id, u.tipo, obraId);
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
  async status(@UsuarioAtual() u: IUsuario, @Param("id") id: string, @Body("status") status: string) {
    if (u.tipo !== "ADMIN" && u.tipo !== "GESTOR_OBRA") {
      throw new ForbiddenException("Apenas ADMIN e GESTOR_OBRA podem alterar status de etapas.");
    }
    return this.etapas.atualizarStatus(id, status);
  }
}
