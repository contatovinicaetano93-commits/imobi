import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

const DOCS_MINIMOS_OBRA = 2;

@Injectable()
export class FluxoService {
  constructor(private readonly prisma: PrismaService) {}

  assertKycUsuarioAprovado(usuarioId: string) {
    return this.prisma.usuario.findUnique({ where: { usuarioId } }).then((u) => {
      if (!u) throw new BadRequestException("Usuário não encontrado.");
      if (u.kycStatus !== "APROVADO") {
        throw new BadRequestException(
          "Complete a verificação de identidade (KYC) antes de continuar.",
        );
      }
      return u;
    });
  }

  async requisitosObra(obraId: string, usuarioId: string) {
    const [usuario, docsCount, solicitacao] = await Promise.all([
      this.prisma.usuario.findUnique({ where: { usuarioId } }),
      this.prisma.documento.count({ where: { obraId } }),
      this.prisma.solicitacaoCredito.findFirst({
        where: {
          obraId,
          usuarioId,
          status: { in: ["APROVADA", "AJUSTADA", "EM_COMITE", "PENDENTE"] },
        },
        orderBy: { criadoEm: "desc" },
      }),
    ]);

    const kycUsuarioOk = usuario?.kycStatus === "APROVADO";
    const kycObraOk = docsCount >= DOCS_MINIMOS_OBRA;
    const comiteOk =
      solicitacao?.status === "APROVADA" || solicitacao?.status === "AJUSTADA";
    const comitePendente =
      solicitacao?.status === "EM_COMITE" || solicitacao?.status === "PENDENTE";

    return {
      obraId,
      kycUsuarioOk,
      kycObraOk,
      docsObraCount: docsCount,
      docsObraMinimo: DOCS_MINIMOS_OBRA,
      comiteOk,
      comitePendente,
      comiteStatus: solicitacao?.status ?? null,
      podeSolicitarComite: kycUsuarioOk && kycObraOk && !comiteOk && !comitePendente,
      /** Pré-requisito do construtor; liberação operacional é feita por admin ou engenheiro. */
      podeLiberarEtapas: kycUsuarioOk && comiteOk,
      rolesLiberacaoEtapas: ["ADMIN", "ENGENHEIRO"] as const,
      rolesLiberacaoKyc: ["ADMIN"] as const,
      gestorFundoSomenteLeitura: true,
    };
  }

  async statusUsuario(usuarioId: string) {
    const usuario = await this.prisma.usuario.findUnique({ where: { usuarioId } });
    if (!usuario) throw new BadRequestException("Usuário não encontrado.");

    const obras = await this.prisma.obra.findMany({
      where: { usuarioId },
      select: { obraId: true, nome: true, status: true },
      orderBy: { criadoEm: "desc" },
    });

    const obrasStatus = await Promise.all(
      obras.map(async (o) => ({
        ...o,
        ...(await this.requisitosObra(o.obraId, usuarioId)),
      })),
    );

    return {
      kycUsuarioCompleto: usuario.kycStatus === "APROVADO",
      kycUsuarioStatus: usuario.kycStatus,
      primeiraOperacao: obras.length === 0,
      obras: obrasStatus,
      gestorFundoSomenteLeitura: true,
      rolesLiberacaoEtapas: ["ADMIN", "ENGENHEIRO"] as const,
      rolesLiberacaoKyc: ["ADMIN"] as const,
    };
  }

  async assertPodeCriarObra(usuarioId: string) {
    await this.assertKycUsuarioAprovado(usuarioId);
  }

  async assertPodeSolicitarCredito(usuarioId: string) {
    await this.assertKycUsuarioAprovado(usuarioId);
  }

  async assertPodeSolicitarComite(usuarioId: string, obraId?: string) {
    await this.assertKycUsuarioAprovado(usuarioId);
    if (!obraId) return;

    const req = await this.requisitosObra(obraId, usuarioId);
    if (!req.kycObraOk) {
      throw new BadRequestException(
        `Envie ao menos ${DOCS_MINIMOS_OBRA} documentos da obra antes de solicitar comitê.`,
      );
    }
    if (req.comitePendente) {
      throw new BadRequestException("Já existe uma solicitação de comitê em andamento para esta obra.");
    }
    if (req.comiteOk) {
      throw new BadRequestException("Comitê já aprovado para esta obra.");
    }
  }
}
