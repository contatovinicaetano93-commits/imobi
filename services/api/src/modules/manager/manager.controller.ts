import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { ManagerService } from "./manager.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";

@UseGuards(JwtAuthGuard)
@Controller("manager")
export class ManagerController {
  constructor(private readonly manager: ManagerService) {}

  @Get("dashboard")
  async dashboard(@UsuarioAtual() u: IUsuario) {
    await this.manager.verificarPermissao(u.id);
    return this.manager.obterEstatisticas();
  }

  @Get("etapas-pendentes")
  async listarEtapasPendentes(
    @UsuarioAtual() u: IUsuario,
    @Query("limit") limit: string = "20",
    @Query("offset") offset: string = "0"
  ) {
    await this.manager.verificarPermissao(u.id);
    return this.manager.listarEtapasPendentes(Number(limit), Number(offset));
  }

  @Get("kyc-pendentes")
  async listarKycPendentes(
    @UsuarioAtual() u: IUsuario,
    @Query("limit") limit: string = "20",
    @Query("offset") offset: string = "0"
  ) {
    await this.manager.verificarPermissao(u.id);
    return this.manager.listarKycPendentes(Number(limit), Number(offset));
  }

  @Get("etapas/:id")
  async obterEtapaDetalhe(@UsuarioAtual() u: IUsuario, @Param("id") id: string) {
    await this.manager.verificarPermissao(u.id);
    return this.manager.obterEtapaDetalhe(id);
  }

  @Get("kyc/:id")
  async obterKycDetalhe(@UsuarioAtual() u: IUsuario, @Param("id") id: string) {
    await this.manager.verificarPermissao(u.id);
    return this.manager.obterKycDetalhe(id);
  }
}
