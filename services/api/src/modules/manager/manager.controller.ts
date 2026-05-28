import { Controller, Get, Patch, Param, Query, Body, UseGuards } from "@nestjs/common";
import { ManagerService } from "./manager.service";
import { EtapasService } from "../etapas/etapas.service";
import { KycService } from "../kyc/kyc.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import { RejeitarDocumentoSchema } from "@imbobi/schemas";
import { z } from "zod";
import { Throttle } from "../../common/decorators/throttle.decorator";
import { UserThrottlerGuard } from "../../common/guards/user-throttler.guard";

@UseGuards(JwtAuthGuard)
@Controller("manager")
export class ManagerController {
  constructor(
    private readonly manager: ManagerService,
    private readonly etapas: EtapasService,
    private readonly kyc: KycService,
  ) {}

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

  @Patch("etapas/:id/aprovar")
  @UseGuards(UserThrottlerGuard)
  @Throttle(50, 3600000) // 50 requests per hour per user (managers can be busy)
  async aprovarEtapa(
    @UsuarioAtual() u: IUsuario,
    @Param("id") id: string,
    @Body() body: { observacao?: string }
  ) {
    await this.manager.verificarPermissao(u.id);
    // Validar e sanitizar observacao
    const schema = z.object({ observacao: z.string().max(1000).optional() });
    const validated = schema.parse(body);
    return this.etapas.aprovar(u.id, id, validated.observacao);
  }

  @Patch("etapas/:id/rejeitar")
  @UseGuards(UserThrottlerGuard)
  @Throttle(50, 3600000) // 50 requests per hour per user
  async rejeitarEtapa(
    @UsuarioAtual() u: IUsuario,
    @Param("id") id: string,
    @Body(new ZodPipe(RejeitarDocumentoSchema)) body: unknown
  ) {
    await this.manager.verificarPermissao(u.id);
    const validated = body as { motivo: string };
    return this.etapas.rejeitar(u.id, id, validated.motivo);
  }

  @Patch("kyc/:id/aprovar")
  @UseGuards(UserThrottlerGuard)
  @Throttle(50, 3600000) // 50 requests per hour per user
  async aprovarKyc(@UsuarioAtual() u: IUsuario, @Param("id") id: string) {
    await this.manager.verificarPermissao(u.id);
    return this.kyc.aprovarDocumento(id, u.id);
  }

  @Patch("kyc/:id/rejeitar")
  @UseGuards(UserThrottlerGuard)
  @Throttle(50, 3600000) // 50 requests per hour per user
  async rejeitarKyc(
    @UsuarioAtual() u: IUsuario,
    @Param("id") id: string,
    @Body(new ZodPipe(RejeitarDocumentoSchema)) body: unknown
  ) {
    await this.manager.verificarPermissao(u.id);
    const validated = body as { motivo: string };
    return this.kyc.rejeitarDocumento(id, u.id, validated.motivo);
  }
}
