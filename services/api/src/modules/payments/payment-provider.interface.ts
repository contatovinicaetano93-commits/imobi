export interface DisbursementRequest {
  liberacaoId: string;
  creditoId: string;
  usuarioId: string;
  valor: number;
  idempotencyKey: string;
}

export interface DisbursementResult {
  success: boolean;
  externalPaymentId?: string;
  provider: string;
  failureReason?: string;
}

export interface PaymentProvider {
  readonly name: string;
  disburse(req: DisbursementRequest): Promise<DisbursementResult>;
}
