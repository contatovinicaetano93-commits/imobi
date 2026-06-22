import type { DisbursementRequest, DisbursementResult, PaymentProvider } from "../payment-provider.interface";

export class StripePaymentProvider implements PaymentProvider {
  readonly name = "stripe";

  async disburse(req: DisbursementRequest): Promise<DisbursementResult> {
    const secret = process.env["STRIPE_SECRET_KEY"];
    if (!secret) {
      return { success: false, provider: this.name, failureReason: "STRIPE_SECRET_KEY não configurado" };
    }

    const params = new URLSearchParams();
    params.set("amount", String(Math.round(req.valor * 100)));
    params.set("currency", "brl");
    params.set("metadata[liberacaoId]", req.liberacaoId);
    params.set("metadata[creditoId]", req.creditoId);
    params.set("metadata[usuarioId]", req.usuarioId);

    const res = await fetch("https://api.stripe.com/v1/transfers", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Idempotency-Key": req.idempotencyKey,
      },
      body: params.toString(),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { success: false, provider: this.name, failureReason: `Stripe ${res.status}: ${text.slice(0, 200)}` };
    }

    const data = (await res.json()) as { id: string };
    return { success: true, externalPaymentId: data.id, provider: this.name };
  }
}
