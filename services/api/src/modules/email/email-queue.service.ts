import { Injectable } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bull";
import { Queue } from "bull";
import { QUEUE_EMAIL, EmailJob, EmailJobTipo } from "../../common/constants";

/**
 * Enqueues email jobs via BullMQ so sending is decoupled from the HTTP request.
 * Use this instead of EmailService for non-blocking fire-and-forget sends.
 * The EmailWorker processes these jobs and calls EmailService internally.
 */
@Injectable()
export class EmailQueueService {
  constructor(@InjectQueue(QUEUE_EMAIL) private readonly queue: Queue<EmailJob>) {}

  private enqueue(tipo: EmailJobTipo, payload: EmailJob["payload"]) {
    return this.queue.add({ tipo, payload }, { attempts: 3, backoff: { type: "exponential", delay: 5000 } });
  }

  bemVindo(nome: string, email: string) {
    return this.enqueue("BEM_VINDO", { nome, email });
  }

  etapaAprovada(nome: string, email: string, etapaNome: string, obraNome: string, valor: number) {
    return this.enqueue("ETAPA_APROVADA", { nome, email, etapaNome, obraNome, valor });
  }

  parcelaLiberada(nome: string, email: string, valor: number, obraNome: string) {
    return this.enqueue("PARCELA_LIBERADA", { nome, email, valor, obraNome });
  }

  kycAprovado(nome: string, email: string) {
    return this.enqueue("KYC_APROVADO", { nome, email });
  }

  kycRejeitado(nome: string, email: string, motivo: string) {
    return this.enqueue("KYC_REJEITADO", { nome, email, motivo });
  }

  recuperacaoSenha(nome: string, email: string, token: string) {
    return this.enqueue("RECUPERACAO_SENHA", { nome, email, token });
  }

  contaExcluida(nome: string, email: string) {
    return this.enqueue("CONTA_EXCLUIDA", { nome, email });
  }
}
