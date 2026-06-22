import { Injectable, Logger } from "@nestjs/common";
import { CircuitBreaker } from "../../common/resilience/circuit-breaker";
import type { DisbursementRequest, DisbursementResult, PaymentProvider } from "./payment-provider.interface";
import { ConsolePaymentProvider } from "./providers/console.provider";
import { PixPaymentProvider } from "./providers/pix.provider";
import { StripePaymentProvider } from "./providers/stripe.provider";

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly provider: PaymentProvider;
  private readonly breaker: CircuitBreaker;

  constructor() {
    const env = (process.env["PAYMENT_PROVIDER"] ?? "console").toLowerCase();
    this.provider = this.resolveProvider(env);
    this.breaker = new CircuitBreaker(`payment:${this.provider.name}`);
    this.logger.log(`Payment provider: ${this.provider.name}`);
  }

  private resolveProvider(env: string): PaymentProvider {
    switch (env) {
      case "pix":
        return new PixPaymentProvider();
      case "stripe":
        return new StripePaymentProvider();
      default:
        return new ConsolePaymentProvider();
    }
  }

  async disburse(req: DisbursementRequest): Promise<DisbursementResult> {
    return this.breaker.exec(() => this.provider.disburse(req));
  }
}
