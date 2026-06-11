import { Controller, Get, Patch, Param, Body, UseGuards } from "@nestjs/common";
import { EtapasService } from "./etapas.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import { StatusEtapaEnum } from "@imbobi/schemas";

const MANAGER_ROLES = ["GESTOR_OBRA", "ADMIN"] as const;

@UseGuards(JwtAuthGuard)
@Controller("etapas")
export class EtapasController {
  constructor(private readonly etapas: EtapasService) {}

  @Get("obra/:obraId")
  listar(@Param("obraId") obraId: string, @UsuarioAtual() u: IUsuario) {
    const isManager = (MANAGER_ROLES as readonly string[]).includes(u.tipo);
    return this.etapas.listarPorObra(obraId, u.id, isManager);
  }

  @UseGuards(RolesGuard)
  @Roles("GESTOR_OBRA", "ADMIN")
  @Patch(":id/aprovar")
  aprovar(
    @Param("id") id: string,
    @UsuarioAtual() u: IUsuario,
    @Body("observacao") obs?: string
  ) {
    return this.etapas.aprovar(u.id, id, obs);
  }

  @UseGuards(RolesGuard)
  @Roles("ADMIN")
  @Patch(":id/status")
  status(
    @Param("id") id: string,
    @Body("status", new ZodPipe(StatusEtapaEnum)) status: string
  ) {
    return this.etapas.atualizarStatus(id, status);
  }
}
