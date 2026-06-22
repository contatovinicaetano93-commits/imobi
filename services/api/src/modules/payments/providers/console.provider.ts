import type { DisbursementRequest, DisbursementResult, PaymentProvider } from "../payment-provider.interface";

export class ConsolePaymentProvider implements PaymentProvider {
  readonly name = "console";

  async disburse(req: DisbursementRequest): Promise<DisbursementResult> {
    const externalPaymentId = `console_${req.idempotencyKey}`;
    return {
      success: true,
      externalPaymentId,
      provider: this.name,
    };
  }
}
