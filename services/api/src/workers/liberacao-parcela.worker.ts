import { Processor, Process, OnQueueFailed, OnQueueCompleted } from "@nestjs/bull";
import { Job } from "bull";
import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../modules/prisma/prisma.service";
import { NotificacoesService } from "../modules/notificacoes/notificacoes.service";
import { EmailService } from "../modules/email/email.service";
import { PushNotificacoesService } from "../modules/push-notificacoes/push-notificacoes.service";
import { calcularFeesTranche } from "@imbobi/core";
import { QUEUE_LIBERACAO, type LiberacaoJob } from "../common/constants";

@Injectable()
@Processor(QUEUE_LIBERACAO)
export class LiberacaoParcelaWorker {
  private readonly logger = new Logger(LiberacaoParcelaWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacoes: NotificacoesService,
    private readonly email: EmailService,
    private readonly pushNotificacoes: PushNotificacoesService,
  ) {}

  @Process()
  async handle(job: Job<LiberacaoJob>) {
    const { creditoId, liberacaoId, etapaId, valor } = job.data;

    try {
      const liberacao = await this.prisma.liberacaoParcela.findUnique({
        where: { liberacaoId },
      });
      if (!liberacao || liberacao.status !== "PENDENTE") {
        this.logger.log(`Liberação ${liberacaoId} já processada, ignorando retry`);
        return;
      }

      const credito = await this.prisma.credito.findUnique({
        where: { creditoId },
        include: { usuario: true, obras: true },
      });
      if (!credito) throw new Error(`Crédito ${creditoId} não encontrado`);

      // Verifica RI antes da primeira liberação
      const obraVinculada = credito.obras?.[0];
      const ehPrimeiraTranche = Number(credito.valorLiberado) === 0;
      if (ehPrimeiraTranche && obraVinculada && !obraVinculada.riValidado) {
        await this.prisma.liberacaoParcela.update({
          where: { liberacaoId },
          data: {
            status: "FALHA",
            processadoEm: new Date(),
            motivo: "RI não validado — valide o Registro de Imóveis antes da primeira liberação.",
          },
        });

        await this.notificacoes.criar(
          credito.usuarioId,
          "RI_PENDENTE",
          "Liberação bloqueada — RI pendente",
          `A primeira tranche de ${obraVinculada?.nome || "sua obra"} está bloqueada. O Registro de Imóveis precisa ser validado pelo gestor.`,
          `/dashboard/obras/${obraVinculada?.obraId}`,
        );
        this.logger.warn(`Liberação ${liberacaoId} bloqueada: RI não validado para obra ${obraVinculada?.obraId}`);
        return;
      }

      const { feeTranche, valorLiquido } = calcularFeesTranche(valor);

      let numeroParcela = 1;
      let processed = false;

      await this.prisma.$transaction(async (tx) => {
        const lib = await tx.liberacaoParcela.findUnique({ where: { liberacaoId } });
        if (!lib || lib.status !== "PENDENTE") return;

        // Determina o número da parcela contando as concluídas até agora
        const concluidasAnteriores = await tx.liberacaoParcela.count({
          where: { creditoId, status: "CONCLUIDA" },
        });
        numeroParcela = concluidasAnteriores + 1;

        await tx.credito.update({
          where: { creditoId },
          data: { valorLiberado: { increment: valor } },
        });

        await tx.liberacaoParcela.update({
          where: { liberacaoId },
          data: {
            status: "CONCLUIDA",
            processadoEm: new Date(),
            feeTranche,
            valorLiquido,
          },
        });

        // Busca dados bancários do usuário
        const dadosBancarios = await tx.dadosBancarios.findUnique({
          where: { usuarioId: credito.usuarioId },
        });

        const acaoStatus = dadosBancarios
          ? "AGUARDANDO_TRANSFERENCIA"
          : "AGUARDANDO_DADOS_BANCARIOS";

        await tx.acaoOperador.create({
          data: {
            liberacaoId,
            usuarioId: credito.usuarioId,
            valorBruto: valor,
            feeTranche,
            valorTransferir: valorLiquido,
            numeroParcela,
            dadosBancariosId: dadosBancarios?.dadosBancariosId ?? null,
            status: acaoStatus,
          },
        });

        processed = true;
      });

      if (!processed) return;

      const obra = credito.obras?.[0];
      const fmt = (v: number) =>
        new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

      if (Number(credito.valorLiberado) === 0) {
        // Sem dados bancários — solicitar ao usuário
        await this.notificacoes.criar(
          credito.usuarioId,
          "DADOS_BANCARIOS_SOLICITADOS",
          "Parcela aprovada! Cadastre seus dados bancários",
          `A ${numeroParcela}ª tranche de ${fmt(valor)} foi aprovada. Cadastre seus dados bancários para receber ${fmt(valorLiquido)}.`,
          "/perfil/dados-bancarios",
        );
      } else {
        await this.notificacoes.criar(
          credito.usuarioId,
          "PARCELA_LIBERADA",
          "Parcela em processamento",
          `A ${numeroParcela}ª tranche de ${fmt(valorLiquido)} (líquido) está sendo processada para ${obra?.nome || "sua obra"}.`,
          obra ? `/dashboard/obras/${obra.obraId}` : "/dashboard",
        );
      }

      this.pushNotificacoes
        .enviarPush({
          usuarioId: credito.usuarioId,
          titulo: "Tranche Aprovada!",
          mensagem: `${fmt(valorLiquido)} líquido será transferido para ${obra?.nome || "sua obra"}.`,
          tipo: "PARCELA_LIBERADA",
          dados: { creditoId, valor: String(valorLiquido) },
        })
        .catch((e) => this.logger.error(`Erro push: ${e}`));

      this.email
        .parcelaLiberadaEmail(
          credito.usuario.nome,
          credito.usuario.email,
          valorLiquido,
          obra?.nome || "sua obra",
        )
        .catch((e) => this.logger.error(`Erro email: ${e}`));

      this.logger.log(
        `Liberação ${liberacaoId} processada — bruto: R$${valor}, fee: R$${feeTranche.toFixed(2)}, líquido: R$${valorLiquido.toFixed(2)}`,
      );
    } catch (error) {
      this.logger.error(`Erro ao processar liberação: ${error}`);
      throw error;
    }
  }

  @OnQueueFailed()
  onFailed(job: Job, err: Error) {
    this.logger.error(`Job ${job.id} falhou: ${err.message}`);

    this.prisma.credito
      .findUnique({
        where: { creditoId: job.data.creditoId },
        include: { obras: true },
      })
      .then(async (credito) => {
        if (!credito) return;
        await this.prisma.liberacaoParcela.updateMany({
          where: { liberacaoId: job.data.liberacaoId, status: "PENDENTE" },
          data: { status: "FALHA", processadoEm: new Date() },
        });
        const obra = credito.obras?.[0];
        await this.notificacoes
          .criar(
            credito.usuarioId,
            "PARCELA_FALHA",
            "Erro na liberação da parcela",
            `Ocorreu um erro ao processar a liberação para ${obra?.nome || "sua obra"}. Por favor, contate o suporte.`,
            obra ? `/dashboard/obras/${obra.obraId}` : "/dashboard",
          )
          .catch((e) => this.logger.error(`Erro ao notificar falha: ${e}`));
      })
      .catch((e) => this.logger.error(`Erro ao processar falha: ${e}`));
  }

  @OnQueueCompleted()
  onCompleted(job: Job) {
    this.logger.log(`Job ${job.id} completado`);
  }
}
