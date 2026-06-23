import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { KycService } from "../kyc/kyc.service";
import { ManagerService } from "../manager/manager.service";
import { isManagerRole } from "../../common/constants/manager-roles";

export type JornadaPassoId =
  | "kyc"
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
  ) {}

  async obter(usuarioId: string, role: string): Promise<JornadaResponse> {
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

  async assertPodeSolicitarCredito(usuarioId: string): Promise<void> {
    const kyc = await this.kyc.obterStatus(usuarioId);
    if (kyc.status !== "APROVADO") {
      throw new BadRequestException(
        kyc.status === "ENVIADO"
          ? "Documentos em análise. Aguarde aprovação do KYC antes de solicitar crédito."
          : "Complete e envie seus documentos (KYC) antes de solicitar crédito.",
      );
    }
    const obras = await this.prisma.obra.count({ where: { usuarioId } });
    if (obras === 0) {
      throw new BadRequestException("Cadastre uma obra antes de solicitar crédito.");
    }
  }

  private async obterGestor(): Promise<JornadaResponse> {
    const stats = (await this.manager.obterEstatisticas()) as {
      filaKyc: number;
      filaAprovacoes: number;
    };
    const filaKyc = stats.filaKyc ?? 0;
    const filaEtapas = stats.filaAprovacoes ?? 0;
    const total = filaKyc + filaEtapas;

    if (filaKyc > 0) {
      return {
        perfil: "gestor",
        passoAtual: "gestor_kyc",
        titulo: "Analisar documentos KYC",
        descricao: `${filaKyc} documento(s) aguardando sua análise`,
        href: "/dashboard/gestor/kyc",
        concluido: false,
        passosConcluidos: 0,
        totalPassos: total,
        progressoPct: total === 0 ? 100 : 0,
        fila: { kyc: filaKyc, etapas: filaEtapas },
      };
    }

    if (filaEtapas > 0) {
      return {
        perfil: "gestor",
        passoAtual: "gestor_etapas",
        titulo: "Aprovar etapas da obra",
        descricao: `${filaEtapas} etapa(s) aguardando liberação`,
        href: "/dashboard/gestor/etapas",
        concluido: false,
        passosConcluidos: filaKyc > 0 ? 1 : 0,
        totalPassos: total,
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
      passosConcluidos: 1,
      totalPassos: 1,
      progressoPct: 100,
      fila: { kyc: 0, etapas: 0 },
    };
  }

  private async obterTomador(usuarioId: string): Promise<JornadaResponse> {
    const [kycStatus, obrasCount, creditos, etapasLiberadas] = await Promise.all([
      this.kyc.obterStatus(usuarioId),
      this.prisma.obra.count({ where: { usuarioId } }),
      this.prisma.credito.findMany({
        where: { usuarioId },
        include: { liberacoes: { where: { status: "CONCLUIDA" }, take: 1 } },
        orderBy: { criadoEm: "desc" },
        take: 1,
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
    const temCredito = creditos.length > 0;
    const temLiberacao = creditos.some((c) => c.liberacoes.length > 0) || etapasLiberadas > 0;

    const steps = [
      { id: "kyc" as const, done: kycAprovado },
      { id: "obra" as const, done: temObra },
      { id: "credito" as const, done: temCredito },
      { id: "aguardando" as const, done: temLiberacao },
      { id: "acompanhar" as const, done: temLiberacao && temCredito },
    ];

    const passosConcluidos = steps.filter((s) => s.done).length;
    const totalPassos = steps.length;
    const progressoPct = Math.round((passosConcluidos / totalPassos) * 100);

    if (!kycAprovado) {
      const aguardando = kycStatus.status === "ENVIADO";
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
        passosConcluidos,
        totalPassos,
        progressoPct,
        bloqueado: aguardando ? "credito" : undefined,
      };
    }

    if (!temObra) {
      return {
        perfil: "tomador",
        passoAtual: "obra",
        titulo: "Cadastrar sua obra",
        descricao: "Informe endereço, etapas e valor do projeto.",
        href: "/dashboard/obras/nova",
        concluido: false,
        passosConcluidos,
        totalPassos,
        progressoPct,
      };
    }

    if (!temCredito) {
      return {
        perfil: "tomador",
        passoAtual: "credito",
        titulo: "Solicitar crédito",
        descricao: "Simule e envie o pedido vinculado à sua obra.",
        href: "/dashboard/credito/solicitar",
        concluido: false,
        passosConcluidos,
        totalPassos,
        progressoPct,
      };
    }

    if (!temLiberacao) {
      return {
        perfil: "tomador",
        passoAtual: "aguardando",
        titulo: "Aguardando aprovação do fundo",
        descricao: "Seu pedido está com o gestor. Acompanhe por aqui.",
        href: "/dashboard/construtor",
        concluido: false,
        passosConcluidos,
        totalPassos,
        progressoPct,
      };
    }

    return {
      perfil: "tomador",
      passoAtual: "acompanhar",
      titulo: "Acompanhar liberações",
      descricao: "Veja parcelas, extrato e progresso da obra.",
      href: "/dashboard/credito",
      concluido: true,
      passosConcluidos,
      totalPassos,
      progressoPct: 100,
    };
  }
}
