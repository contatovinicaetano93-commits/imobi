import { Injectable, Inject } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import type { Cache } from "cache-manager";
import { PrismaService } from "../prisma/prisma.service";
import { NotificacoesService } from "../notificacoes/notificacoes.service";
import { invalidateJornadaCache } from "../jornada/jornada-cache";

/**
 * Encerra operação quando crédito totalmente liberado e todas etapas concluídas.
 */
@Injectable()
export class OperacaoConclusaoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacoes: NotificacoesService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async tentarConcluirCredito(creditoId: string): Promise<{ quitado: boolean }> {
    const credito = await this.prisma.credito.findUnique({
      where: { creditoId },
      include: {
        obras: { include: { etapas: { select: { status: true } } } },
      },
    });

    if (!credito || credito.status === "QUITADO") {
      return { quitado: false };
    }

    const valorAprovado = Number(credito.valorAprovado);
    const valorLiberado = Number(credito.valorLiberado);
    if (valorAprovado <= 0) return { quitado: false };

    const obra = credito.obras[0];
    if (!obra) return { quitado: false };

    const etapas = obra.etapas;
    const todasEtapasConcluidas =
      etapas.length > 0 && etapas.every((e) => e.status === "CONCLUIDA");

    const pendentePagamento = await this.prisma.liberacaoParcela.count({
      where: { creditoId, status: { in: ["PENDENTE", "AGUARDANDO_PAGAMENTO"] } },
    });

    const totalmenteLiberado = valorLiberado >= valorAprovado * 0.999;

    if (!todasEtapasConcluidas || !totalmenteLiberado || pendentePagamento > 0) {
      return { quitado: false };
    }

    await this.prisma.$transaction([
      this.prisma.credito.update({
        where: { creditoId },
        data: { status: "QUITADO" },
      }),
      this.prisma.obra.update({
        where: { obraId: obra.obraId },
        data: { status: "CONCLUIDA" },
      }),
    ]);

    await invalidateJornadaCache(this.cache, credito.usuarioId);

    await this.notificacoes.criar(
      credito.usuarioId,
      "CREDITO_APROVADO",
      "Operação quitada",
      `Parabéns! O crédito da obra "${obra.nome}" foi quitado. Você já pode iniciar uma nova operação.`,
      "/dashboard/construtor",
    );

    return { quitado: true };
  }
}
