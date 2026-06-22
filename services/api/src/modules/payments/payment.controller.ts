import { Controller, Get } from "@nestjs/common";
import { PaymentService } from "./payment.service";

@Controller("payments")
export class PaymentController {
  constructor(private readonly payments: PaymentService) {}

  @Get("health")
  health() {
    return { status: "ok", provider: process.env["PAYMENT_PROVIDER"] ?? "console" };
  }
}
