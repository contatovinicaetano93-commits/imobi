import { Injectable, BadRequestException, Inject } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import type { Cache } from "cache-manager";
import { PrismaService } from "../prisma/prisma.service";
import { KycService } from "../kyc/kyc.service";
import { ManagerService } from "../manager/manager.service";
import { DossiesService } from "../dossies/dossies.service";
import { isManagerRole } from "../../common/constants/manager-roles";
import {
  JORNADA_CACHE_TTL_MS,
  JORNADA_GESTOR_CACHE_KEY,
  jornadaUsuarioCacheKey,
} from "./jornada-cache";

const TOMADOR_PASSOS = ["kyc", "viabilidade", "obra", "credito", "aguardando", "acompanhar"] as const;

function jornadaConcluida(passo: JornadaPassoId): boolean {
  return passo === "acompanhar" || passo === "concluido";
}

export type JornadaPassoId =
  | "kyc"
  | "viabilidade"
  | "obra"
  | "credito"
  | "aguardando"
  | "acompanhar"
  | "concluido"
  | "gestor_kyc"
  | "gestor_etapas"
  | "gestor_ok";

export interface JornadaResponse {
  perfil: "tomador" | "gestor" | "outro";
  passoAtual: JornadaPassoId;
  titulo: string;
  descricao: string;
  href: string;
  concluido: boolean;
  passosConcluidos: number;
  totalPassos: number;
  progressoPct: number;
  bloqueado?: string;
  fila?: { kyc: number; etapas: number };
}

@Injectable()
export class JornadaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly kyc: KycService,
    private readonly manager: ManagerService,
    private readonly dossies: DossiesService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async obter(usuarioId: string, role: string): Promise<JornadaResponse> {
    const cacheKey = isManagerRole(role)
      ? JORNADA_GESTOR_CACHE_KEY
      : jornadaUsuarioCacheKey(usuarioId);

    const cached = await this.cache.get<JornadaResponse>(cacheKey);
    if (cached) return cached;

    const result = await this.computeObter(usuarioId, role);
    await this.cache.set(cacheKey, result, JORNADA_CACHE_TTL_MS);
    return result;
  }

  private async computeObter(usuarioId: string, role: string): Promise<JornadaResponse> {
    if (isManagerRole(role)) {
      return this.obterGestor();
    }
    if (role === "TOMADOR" || role === "CONSTRUTOR") {
      return this.obterTomador(usuarioId);
    }
    return {
      perfil: "outro",
      passoAtual: "concluido",
      titulo: "Painel",
      descricao: "Acesse o menu do seu perfil.",
      href: "/dashboard",
      concluido: true,
      passosConcluidos: 0,
      totalPassos: 0,
      progressoPct: 100,
    };
  }

  async assertPodeCadastrarObra(usuarioId: string): Promise<void> {
    await this.assertKycAprovado(usuarioId);
    const dossieAprovado = await this.dossies.temDossieAprovado(usuarioId);
    if (!dossieAprovado) {
      throw new BadRequestException(
        "Complete e obtenha aprovação do dossiê de viabilidade antes de cadastrar uma obra.",
      );
    }
  }

  async assertPodeSolicitarCredito(usuarioId: string): Promise<void> {
    await this.assertKycAprovado(usuarioId);
    const dossieAprovado = await this.dossies.temDossieAprovado(usuarioId);
    if (!dossieAprovado) {
      throw new BadRequestException(
        "Obtenha aprovação do dossiê de viabilidade antes de solicitar crédito.",
      );
    }
    const obras = await this.prisma.obra.count({ where: { usuarioId } });
    if (obras === 0) {
      throw new BadRequestException("Cadastre uma obra antes de solicitar crédito.");
    }
  }

  private async assertKycAprovado(usuarioId: string): Promise<void> {
    const kyc = await this.kyc.obterStatus(usuarioId);
    if (kyc.status !== "APROVADO") {
      throw new BadRequestException(
        kyc.status === "ENVIADO"
          ? "Documentos em análise. Aguarde aprovação do KYC antes de continuar."
          : "Complete e envie seus documentos (KYC) antes de continuar.",
      );
    }
  }

  private async obterGestor(): Promise<JornadaResponse> {
    const stats = (await this.manager.obterEstatisticas()) as {
      filaKyc: number;
      filaAprovacoes: number;
    };
    const filaKyc = stats.filaKyc ?? 0;
    const filaEtapas = stats.filaAprovacoes ?? 0;
    const totalPassos = 3;

    if (filaKyc > 0) {
      return {
        perfil: "gestor",
        passoAtual: "gestor_kyc",
        titulo: "Acompanhar fila KYC",
        descricao: `${filaKyc} documento(s) na fila — visualização somente leitura`,
        href: "/dashboard/gestor/kyc",
        concluido: false,
        passosConcluidos: 0,
        totalPassos,
        progressoPct: 10,
        fila: { kyc: filaKyc, etapas: filaEtapas },
      };
    }

    if (filaEtapas > 0) {
      return {
        perfil: "gestor",
        passoAtual: "gestor_etapas",
        titulo: "Acompanhar etapas da obra",
        descricao: `${filaEtapas} etapa(s) no pipe — liberação pelo engenheiro e financeiro`,
        href: "/dashboard/gestor/etapas",
        concluido: false,
        passosConcluidos: 1,
        totalPassos,
        progressoPct: 50,
        fila: { kyc: filaKyc, etapas: filaEtapas },
      };
    }

    return {
      perfil: "gestor",
      passoAtual: "gestor_ok",
      titulo: "Fila zerada",
      descricao: "Nenhuma pendência no momento. Bom trabalho!",
      href: "/dashboard/gestor",
      concluido: true,
      passosConcluidos: totalPassos,
      totalPassos,
      progressoPct: 100,
      fila: { kyc: 0, etapas: 0 },
    };
  }

  private tomadorProgresso(passoAtual: JornadaPassoId, aguardandoAnalise = false) {
    const totalPassos = TOMADOR_PASSOS.length;
    const idx = TOMADOR_PASSOS.indexOf(passoAtual as (typeof TOMADOR_PASSOS)[number]);
    const passoIdx = idx >= 0 ? idx : 0;
    const passosConcluidos = jornadaConcluida(passoAtual)
      ? totalPassos
      : passoIdx;
    const progressoPct = jornadaConcluida(passoAtual)
      ? 100
      : aguardandoAnalise
        ? Math.round(((passoIdx + 0.5) / totalPassos) * 100)
        : Math.round((passoIdx / totalPassos) * 100);
    return { passosConcluidos, totalPassos, progressoPct, passoNumero: passoIdx + 1 };
  }

  private async obterTomador(usuarioId: string): Promise<JornadaResponse> {
    const [
      kycStatus,
      dossieAprovado,
      dossieEmAnalise,
      obrasCount,
      creditos,
      solicitacaoAberta,
      etapasLiberadas,
    ] = await Promise.all([
      this.kyc.obterStatus(usuarioId),
      this.dossies.temDossieAprovado(usuarioId),
      this.prisma.dueDiligence.findFirst({
        where: {
          usuarioId,
          status: { in: ["ENVIADO", "EM_ANALISE"] },
        },
        select: { id: true },
      }),
      this.prisma.obra.count({ where: { usuarioId } }),
      this.prisma.credito.findMany({
        where: { usuarioId },
        include: { liberacoes: { where: { status: "CONCLUIDA" }, take: 1 } },
        orderBy: { criadoEm: "desc" },
      }),
      this.prisma.solicitacaoCredito.findFirst({
        where: {
          usuarioId,
          status: { in: ["PENDENTE", "EM_COMITE"] },
        },
        select: { solicitacaoId: true },
      }),
      this.prisma.etapaObra.count({
        where: {
          obra: { usuarioId },
          status: "CONCLUIDA",
        },
      }),
    ]);

    const kycAprovado = kycStatus.status === "APROVADO";
    const temObra = obrasCount > 0;
    const creditoAtivo = creditos.find((c) => c.status === "ATIVO");
    const creditoQuitado = creditos.some((c) => c.status === "QUITADO");
    const temCreditoAtivo = Boolean(creditoAtivo);
    const temLiberacao =
      creditos.some((c) => c.liberacoes.length > 0) || etapasLiberadas > 0;

    if (creditoQuitado && !temCreditoAtivo) {
      const prog = this.tomadorProgresso("concluido");
      return {
        perfil: "tomador",
        passoAtual: "concluido",
        titulo: "Operação quitada",
        descricao:
          "Crédito quitado com sucesso. Cadastre uma nova obra ou solicite novo crédito para iniciar outra operação.",
        href: "/dashboard/construtor",
        concluido: true,
        passosConcluidos: prog.totalPassos,
        totalPassos: prog.totalPassos,
        progressoPct: 100,
      };
    }

    if (!kycAprovado) {
      const aguardando = kycStatus.status === "ENVIADO";
      const prog = this.tomadorProgresso("kyc", aguardando);
      return {
        perfil: "tomador",
        passoAtual: "kyc",
        titulo: aguardando ? "Aguardando análise dos documentos" : "Enviar documentos (KYC)",
        descricao: aguardando
          ? "Seu gestor está analisando. Você será notificado quando aprovado."
          : kycStatus.status === "REJEITADO"
            ? "Alguns documentos foram rejeitados. Reenvie para continuar."
            : "RG, comprovante e selfie para liberar o crédito.",
        href: "/dashboard/kyc",
        concluido: false,
        ...prog,
        bloqueado: aguardando ? "viabilidade" : undefined,
      };
    }

    if (!dossieAprovado) {
      const aguardando = Boolean(dossieEmAnalise);
      const prog = this.tomadorProgresso("viabilidade", aguardando);
      return {
        perfil: "tomador",
        passoAtual: "viabilidade",
        titulo: aguardando ? "Proposta em análise" : "Envie seu projeto",
        descricao: aguardando
          ? "Sua documentação está com o time IMOBI. Você será notificado quando aprovado."
          : "Checklist de documentos e Ficha do Empreendimento — etapa web antes de cadastrar a obra.",
        href: "/dashboard/proposta-credito",
        concluido: false,
        ...prog,
        bloqueado: aguardando ? "obra" : undefined,
      };
    }

    if (!temObra) {
      const prog = this.tomadorProgresso("obra");
      return {
        perfil: "tomador",
        passoAtual: "obra",
        titulo: "Cadastrar sua obra",
        descricao: "Informe endereço, etapas e valor do projeto.",
        href: "/dashboard/obras/nova",
        concluido: false,
        ...prog,
      };
    }

    if (!temCreditoAtivo) {
      if (solicitacaoAberta) {
        const prog = this.tomadorProgresso("aguardando", true);
        return {
          perfil: "tomador",
          passoAtual: "aguardando",
          titulo: "Solicitação em análise",
          descricao: "Seu pedido de crédito está com o comitê IMOBI. Você será notificado quando aprovado.",
          href: "/dashboard/construtor",
          concluido: false,
          ...prog,
        };
      }

      const prog = this.tomadorProgresso("credito");
      return {
        perfil: "tomador",
        passoAtual: "credito",
        titulo: "Solicitar crédito",
        descricao: "Solicite crédito vinculado à sua obra (comitê digital).",
        href: "/dashboard/credito/solicitar",
        concluido: false,
        ...prog,
      };
    }

    if (!temLiberacao) {
      const prog = this.tomadorProgresso("aguardando", true);
      return {
        perfil: "tomador",
        passoAtual: "aguardando",
        titulo: "Aguardando aprovação do fundo",
        descricao: "Seu pedido está com o gestor. Acompanhe por aqui.",
        href: "/dashboard/construtor",
        concluido: false,
        ...prog,
      };
    }

    const prog = this.tomadorProgresso("acompanhar");
    return {
      perfil: "tomador",
      passoAtual: "acompanhar",
      titulo: "Acompanhar liberações",
      descricao: "Veja parcelas, extrato e progresso da obra.",
      href: "/dashboard/credito",
      concluido: true,
      passosConcluidos: prog.totalPassos,
      totalPassos: prog.totalPassos,
      progressoPct: 100,
    };
  }
}
