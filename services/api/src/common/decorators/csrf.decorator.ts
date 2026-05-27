import { UseGuards, applyDecorators } from "@nestjs/common";
import { CsrfGuard } from "../guards/csrf.guard";

export function CsrfProtected() {
  return applyDecorators(UseGuards(CsrfGuard));
}
