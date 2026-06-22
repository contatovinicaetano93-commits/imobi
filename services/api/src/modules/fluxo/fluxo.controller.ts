import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { FluxoService } from "./fluxo.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";

@UseGuards(JwtAuthGuard)
@Controller("fluxo")
export class FluxoController {
  constructor(private readonly fluxo: FluxoService) {}

  @Get("status")
  status(@UsuarioAtual() u: IUsuario) {
    return this.fluxo.statusUsuario(u.id);
  }

  @Get("obra/:obraId")
  requisitosObra(@UsuarioAtual() u: IUsuario, @Param("obraId") obraId: string) {
    return this.fluxo.requisitosObra(obraId, u.id);
  }
}
