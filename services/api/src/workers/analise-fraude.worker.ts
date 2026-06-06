import { Processor, Process, OnQueueFailed } from "@nestjs/bull";
import { Job } from "bull";
import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../modules/prisma/prisma.service";
import { NotificacoesService } from "../modules/notificacoes/notificacoes.service";
import { ScoreService } from "../modules/score/score.service";
import { QUEUE_ANALISE_FRAUDE, type AnaliseFraudeJob } from "../common/constants";

interface SinalRisco {
  codigo: string;
  descricao: string;
  peso: number;
}

function distanciaMetros(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

@Injectable()
@Processor(QUEUE_ANALISE_FRAUDE)
export class AnaliseFraudeWorker {
  private readonly logger = new Logger(AnaliseFraudeWorker.name);

  // Peso mínimo acumulado para acionar alerta ao gestor
  private readonly LIMIAR_ALERTA = 40;

  // Score penalizado quando o peso de fraude ultrapassa o limiar crítico
  private readonly LIMIAR_PENALIDADE = 55;
  private readonly PONTOS_PENALIDADE = 40;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacoes: NotificacoesService,
    private readonly scoreService: ScoreService
  ) {}

  @Process()
  async handle(job: Job<AnaliseFraudeJob>) {
    const { evidenciaId, obraId, usuarioId, etapaId, latCaptura, lngCaptura, accuracyMetros, timestampCaptura } = job.data;

    const sinais: SinalRisco[] = [];

    const [evidencia, obra, evidenciasRecentes] = await Promise.all([
      this.prisma.evidenciaEtapa.findUnique({ where: { evidenciaId } }),
      this.prisma.obra.findUnique({ where: { obraId } }),
      this.prisma.evidenciaEtapa.count({
        where: {
          obraId,
          criadoEm: { gte: new Date(Date.now() - 60 * 60 * 1000) },
        },
      }),
    ]);

    if (!evidencia || !obra) {
      this.logger.warn(`Evidência ou obra não encontrada: ${evidenciaId}`);
      return;
    }

    // Regra 1: GPS fora do raio da obra
    const distancia = distanciaMetros(latCaptura, lngCaptura, obra.geoLatitude, obra.geoLongitude);
    if (distancia > obra.raioValidacaoMetros * 2) {
      sinais.push({
        codigo: "GPS_DISTANTE",
        descricao: `Captura a ${Math.round(distancia)}m da obra (raio permitido: ${obra.raioValidacaoMetros}m)`,
        peso: 35,
      });
    }

    // Regra 2: Precisão GPS ruim (> 20m)
    if (accuracyMetros && accuracyMetros > 20) {
      sinais.push({
        codigo: "GPS_BAIXA_PRECISAO",
        descricao: `Precisão GPS de ${accuracyMetros.toFixed(0)}m — possível localização falsificada`,
        peso: 20,
      });
    }

    // Regra 3: Taxa de submissão alta (> 5 em 1h na mesma obra)
    if (evidenciasRecentes > 5) {
      sinais.push({
        codigo: "SUBMISSAO_RAPIDA",
        descricao: `${evidenciasRecentes} evidências enviadas na última hora para a mesma obra`,
        peso: 25,
      });
    }

    // Regra 4: Horário atípico (2h–5h BRT = 5h–8h UTC)
    const horaUTC = new Date(timestampCaptura).getUTCHours();
    if (horaUTC >= 5 && horaUTC < 8) {
      sinais.push({
        codigo: "HORARIO_ATIPICO",
        descricao: `Captura realizada entre 2h e 5h (horário de Brasília)`,
        peso: 15,
      });
    }

    // Regra 5: Etapa já tinha evidências aprovadas — re-envio suspeito
    const evidenciasAprovadas = await this.prisma.evidenciaEtapa.count({
      where: { etapaId, validada: true },
    });
    if (evidenciasAprovadas >= 3) {
      sinais.push({
        codigo: "REENVIO_EXCESSIVO",
        descricao: `Etapa já possui ${evidenciasAprovadas} evidências aprovadas — envio adicional suspeito`,
        peso: 20,
      });
    }

    const pesoTotal = sinais.reduce((acc, s) => acc + s.peso, 0);

    if (sinais.length > 0) {
      this.logger.warn(
        `[FRAUDE] Evidência ${evidenciaId}: ${sinais.length} sinal(is), peso=${pesoTotal}. ${sinais.map((s) => s.codigo).join(", ")}`
      );
    }

    if (pesoTotal >= this.LIMIAR_ALERTA) {
      await this.alertarGestores(evidenciaId, obraId, obra.nome, usuarioId, sinais, pesoTotal);
    }

    // Penaliza score do usuário quando o risco é crítico
    if (pesoTotal >= this.LIMIAR_PENALIDADE) {
      const motivoSinais = sinais.map((s) => s.codigo).join(", ");
      await this.scoreService
        .penalizarFraude(usuarioId, motivoSinais, this.PONTOS_PENALIDADE)
        .catch((e) => this.logger.error(`Erro ao penalizar score: ${e}`));
    }

    this.logger.log(
      `Análise concluída: evidência ${evidenciaId}, peso=${pesoTotal}, alertado=${pesoTotal >= this.LIMIAR_ALERTA}, penalizado=${pesoTotal >= this.LIMIAR_PENALIDADE}`
    );
  }

  private async alertarGestores(
    evidenciaId: string,
    obraId: string,
    obraNome: string,
    usuarioId: string,
    sinais: SinalRisco[],
    pesoTotal: number
  ) {
    const gestores = await this.prisma.usuario.findMany({
      where: { tipo: { in: ["GESTOR_OBRA", "ADMIN"] } },
      select: { usuarioId: true },
    });

    const descricaoSinais = sinais.map((s) => `• ${s.descricao}`).join("\n");
    const titulo = `Alerta de Risco: Evidência Suspeita (score ${pesoTotal})`;
    const mensagem = `Evidência na obra "${obraNome}" gerou sinais de risco:\n${descricaoSinais}`;

    await Promise.allSettled(
      gestores.map((g) =>
        this.notificacoes.criar(
          g.usuarioId,
          "VISTORIA_PENDENTE",
          titulo,
          mensagem,
          `/dashboard/obras/${obraId}`
        )
      )
    );

    this.logger.warn(`Alerta enviado a ${gestores.length} gestor(es) — evidência ${evidenciaId}`);
  }

  @OnQueueFailed()
  onFailed(job: Job<AnaliseFraudeJob>, err: Error) {
    this.logger.error(`Análise de fraude falhou para evidência ${job.data.evidenciaId}: ${err.message}`);
  }
}
