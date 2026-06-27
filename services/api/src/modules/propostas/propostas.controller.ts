import { Controller, Get, Post, Query, Req, BadRequestException, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { FastifyRequest } from "fastify";
import { PropostasService } from "./propostas.service";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import { ChecklistTipoCreditoQuerySchema } from "@imbobi/schemas";
import type { ChecklistTipoCreditoQuery } from "@imbobi/schemas";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";

@Controller("propostas")
export class PropostasController {
  constructor(private readonly propostas: PropostasService) {}

  @Get("checklist-template")
  checklistTemplate(
    @Query(new ZodPipe(ChecklistTipoCreditoQuerySchema)) query: ChecklistTipoCreditoQuery,
  ) {
    return this.propostas.checklistTemplate(query.tipo);
  }

  @Post()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async enviar(@Req() req: FastifyRequest) {
    if (!req.isMultipart()) {
      throw new BadRequestException("Envio deve ser multipart/form-data.");
    }

    const fields: Record<string, string> = {};
    const files: Array<{
      fieldname: string;
      buffer: Buffer;
      mimetype: string;
      filename: string;
    }> = [];

    for await (const part of req.parts()) {
      if (part.type === "file") {
        const chunks: Buffer[] = [];
        for await (const chunk of part.file) chunks.push(chunk);
        files.push({
          fieldname: part.fieldname,
          buffer: Buffer.concat(chunks),
          mimetype: part.mimetype,
          filename: part.filename ?? "arquivo",
        });
      } else {
        fields[part.fieldname] = part.value as string;
      }
    }

    return this.propostas.criarPublica(fields, files);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @Get()
  listarPendentesAdmin() {
    return this.propostas.listarPendentesAdmin();
  }
}
