import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { InjectQueue } from "@nestjs/bull";
import { Queue } from "bull";
import { PrismaService } from "../prisma/prisma.service";
import { QUEUE_LIBERACAO, type LiberacaoJob } from "../../common/constants";

export interface SolicitarLiberacaoInput {
  valor: number;
  etapaId?: string;
  motivo?: string;
}

@Injectable()
export class LiberacaoService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_LIBERACAO) private readonly queue: Queue<LiberacaoJob>,
  ) {}

  async solicitar(
    creditoId: string,
    solicitanteId: string,
    input: SolicitarLiberacaoInput,
  ) {
    const { valor, etapaId, motivo } = input;

    if (valor <= 0) {
      throw new BadRequestException("Valor de liberação deve ser maior que zero.");
    }

    const credito = await this.prisma.credito.findUnique({
      where: { creditoId },
      select: {
        creditoId: true,
        usuarioId: true,
        valorAprovado: true,
        valorLiberado: true,
        status: true,
      },
    });

    if (!credito) throw new NotFoundException("Crédito não encontrado.");
    if (credito.status !== "ATIVO") {
      throw new BadRequestException(
        `Crédito não está ativo (status atual: ${credito.status}).`,
      );
    }

    const disponivel = Number(credito.valorAprovado) - Number(credito.valorLiberado);
    if (valor > disponivel + 0.01) {
      throw new BadRequestException(
        `Valor solicitado (R$${valor}) excede o saldo disponível (R$${disponivel.toFixed(2)}).`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // Advisory lock: prevents concurrent liberação requests on same credito
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`liberacao:${creditoId}`}))`;

      // Re-check ceiling inside lock
      const creditoLocked = await tx.credito.findUnique({
        where: { creditoId },
        select: { valorAprovado: true, valorLiberado: true },
      });
      const disponivelLocked =
        Number(creditoLocked!.valorAprovado) - Number(creditoLocked!.valorLiberado);
      if (valor > disponivelLocked + 0.01) {
        throw new ConflictException(
          "Saldo insuficiente após verificação concorrente. Tente novamente.",
        );
      }

      const liberacao = await tx.liberacaoParcela.create({
        data: {
          creditoId,
          etapaId: etapaId ?? null,
          valor,
          status: "PENDENTE",
          motivo: motivo ?? null,
        },
      });

      // Audit trail
      await (tx as any).auditLog.create({
        data: {
          acao: "LIBERACAO_SOLICITADA",
          entidade: "LiberacaoParcela",
          entidadeId: liberacao.liberacaoId,
          usuarioId: solicitanteId,
          metadata: { creditoId, valor, etapaId: etapaId ?? null, motivo: motivo ?? null },
        },
      });

      return liberacao;
    }).then(async (liberacao) => {
      // Enqueue outside transaction (job delivery is best-effort, outbox handles retries)
      await this.queue.add(
        {
          creditoId,
          etapaId,
          liberacaoId: liberacao.liberacaoId,
          valor,
        },
        {
          attempts: 3,
          backoff: { type: "exponential", delay: 5000 },
          removeOnComplete: { count: 1000 },
          removeOnFail: { count: 500 },
        },
      );
      return { liberacaoId: liberacao.liberacaoId, valor, status: "PENDENTE" };
    });
  }

  async listar(creditoId: string) {
    return this.prisma.liberacaoParcela.findMany({
      where: { creditoId },
      orderBy: { criadoEm: "desc" },
      take: 50,
      select: {
        liberacaoId: true,
        valor: true,
        status: true,
        motivo: true,
        processadoEm: true,
        criadoEm: true,
      },
    });
  }
}
