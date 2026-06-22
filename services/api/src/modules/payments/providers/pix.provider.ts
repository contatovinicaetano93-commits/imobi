import type { DisbursementRequest, DisbursementResult, PaymentProvider } from "../payment-provider.interface";

export class PixPaymentProvider implements PaymentProvider {
  readonly name = "pix";

  async disburse(req: DisbursementRequest): Promise<DisbursementResult> {
    const apiUrl = process.env["PIX_API_URL"];
    const apiKey = process.env["PIX_API_KEY"];

    if (!apiUrl || !apiKey) {
      return {
        success: false,
        provider: this.name,
        failureReason: "PIX_API_URL ou PIX_API_KEY não configurados",
      };
    }

    const res = await fetch(`${apiUrl}/payouts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "Idempotency-Key": req.idempotencyKey,
      },
      body: JSON.stringify({
        amount: req.valor,
        reference: req.liberacaoId,
        creditoId: req.creditoId,
        usuarioId: req.usuarioId,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        success: false,
        provider: this.name,
        failureReason: `PIX API ${res.status}: ${text.slice(0, 200)}`,
      };
    }

    const data = (await res.json()) as { id?: string; transactionId?: string };
    return {
      success: true,
      externalPaymentId: data.id ?? data.transactionId ?? req.idempotencyKey,
      provider: this.name,
    };
  }
}
