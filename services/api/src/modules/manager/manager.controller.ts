import { Controller, Get, Patch, Param, Query, Body, UseGuards, Req } from "@nestjs/common";
import { ManagerService } from "./manager.service";
import { EtapasService } from "../etapas/etapas.service";
import { KycService } from "../kyc/kyc.service";
import { AuditService } from "../audit/audit.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";

@UseGuards(JwtAuthGuard)
@Controller("manager")
export class ManagerController {
  constructor(
    private readonly manager: ManagerService,
    private readonly etapas: EtapasService,
    private readonly kyc: KycService,
    private readonly audit: AuditService,
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
  async aprovarEtapa(
    @UsuarioAtual() u: IUsuario,
    @Param("id") id: string,
    @Body("observacao") observacao?: string
  ) {
    await this.manager.verificarPermissao(u.id);
    return this.etapas.aprovar(u.id, id, observacao);
  }

  @Patch("etapas/:id/rejeitar")
  async rejeitarEtapa(
    @UsuarioAtual() u: IUsuario,
    @Param("id") id: string,
    @Body("motivo") motivo: string
  ) {
    await this.manager.verificarPermissao(u.id);
    return this.etapas.rejeitar(u.id, id, motivo);
  }

  @Patch("kyc/:id/aprovar")
  async aprovarKyc(@UsuarioAtual() u: IUsuario, @Param("id") id: string) {
    await this.manager.verificarPermissao(u.id);
    return this.kyc.aprovarDocumento(id, u.id);
  }

  @Patch("kyc/:id/rejeitar")
  async rejeitarKyc(
    @UsuarioAtual() u: IUsuario,
    @Param("id") id: string,
    @Body("motivo") motivo: string
  ) {
    await this.manager.verificarPermissao(u.id);
    return this.kyc.rejeitarDocumento(id, u.id, motivo);
  }

  @Get("audit-trail")
  async auditTrail(
    @UsuarioAtual() u: IUsuario,
    @Query("limit") limit: string = "50",
    @Query("offset") offset: string = "0"
  ) {
    await this.manager.verificarPermissao(u.id);
    return this.audit.listarPorGestor(u.id, Number(limit), Number(offset));
  }

  @Get("audit-trail/:entidade/:id")
  async auditTrailPorEntidade(
    @UsuarioAtual() u: IUsuario,
    @Param("entidade") entidade: string,
    @Param("id") id: string
  ) {
    await this.manager.verificarPermissao(u.id);
    return this.audit.listarPorEntidade(entidade, id);
  }

  @Patch("etapas/batch-aprovar")
  async aprovarEtapasBatch(
    @UsuarioAtual() u: IUsuario,
    @Body("etapaIds") etapaIds: string[]
  ) {
    await this.manager.verificarPermissao(u.id);

    const resultados = [];
    for (const etapaId of etapaIds) {
      try {
        const validacao = await this.manager.validarEtapaAprovacao(etapaId);
        if (!validacao.valida) {
          resultados.push({ etapaId, sucesso: false, erro: validacao.motivo });
          continue;
        }
        const resultado = await this.etapas.aprovar(u.id, etapaId);
        resultados.push({ etapaId, sucesso: true, resultado });
      } catch (erro) {
        resultados.push({
          etapaId,
          sucesso: false,
          erro: erro instanceof Error ? erro.message : "Erro desconhecido"
        });
      }
    }

    return {
      total: etapaIds.length,
      sucesso: resultados.filter((r) => r.sucesso).length,
      erro: resultados.filter((r) => !r.sucesso).length,
      resultados,
    };
  }

  @Patch("kyc/batch-aprovar")
  async aprovarKycBatch(
    @UsuarioAtual() u: IUsuario,
    @Body("kycIds") kycIds: string[]
  ) {
    await this.manager.verificarPermissao(u.id);

    const resultados = [];
    for (const kycId of kycIds) {
      try {
        const resultado = await this.kyc.aprovarDocumento(kycId, u.id);
        resultados.push({ kycId, sucesso: true, resultado });
      } catch (erro) {
        resultados.push({
          kycId,
          sucesso: false,
          erro: erro instanceof Error ? erro.message : "Erro desconhecido"
        });
      }
    }

    return {
      total: kycIds.length,
      sucesso: resultados.filter((r) => r.sucesso).length,
      erro: resultados.filter((r) => !r.sucesso).length,
      resultados,
    };
  }
}
