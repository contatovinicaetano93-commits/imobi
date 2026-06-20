import { PipeTransform, BadRequestException } from "@nestjs/common";
import type { ZodType } from "zod";

export class ZodPipe<T> implements PipeTransform {
  constructor(private readonly schema: ZodType<T, any, any>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException(
        result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`)
      );
    }
    return result.data;
  }
}
