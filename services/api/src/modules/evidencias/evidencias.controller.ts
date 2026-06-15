import {
  Controller, Post, Get, Patch, Param, Body, UseGuards,
  BadRequestException, Req,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { FastifyRequest } from "fastify";
import { EvidenciasService } from "./evidencias.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";

@UseGuards(JwtAuthGuard)
@Controller("evidencias")
export class EvidenciasController {
  constructor(private readonly evidencias: EvidenciasService) {}

  @Post()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async upload(
    @UsuarioAtual() u: IUsuario,
    @Req() req: FastifyRequest & { parts: () => AsyncIterable<any> }
  ) {
    let fileBuffer: Buffer | null = null;
    let mimeType = "image/jpeg";
    const fields: Record<string, string> = {};

    for await (const part of req.parts()) {
      if (part.type === "file") {
        fileBuffer = await part.toBuffer();
        mimeType = part.mimetype ?? "image/jpeg";
      } else {
        fields[part.fieldname] = part.value as string;
      }
    }

    if (!fileBuffer || fileBuffer.byteLength === 0) {
      throw new BadRequestException("Arquivo de foto não enviado.");
    }

    const input = {
      etapaId: fields.etapaId ?? "",
      latitude: parseFloat(fields.latitude ?? "0"),
      longitude: parseFloat(fields.longitude ?? "0"),
      accuracyMetros: parseFloat(fields.accuracyMetros ?? "0"),
      timestampCaptura: fields.timestampCaptura ?? new Date().toISOString(),
      descricao: fields.descricao,
    };

    return this.evidencias.upload(u.id, input, fileBuffer, mimeType);
  }

  @Get("etapa/:etapaId")
  listar(@UsuarioAtual() u: IUsuario, @Param("etapaId") etapaId: string) {
    return this.evidencias.listarPorEtapa(u, etapaId);
  }

  @Patch(":id/validar")
  validar(
    @UsuarioAtual() u: IUsuario,
    @Param("id") id: string,
    @Body("aprovado") aprovado: boolean,
    @Body("observacao") obs?: string
  ) {
    return this.evidencias.validar(u, id, aprovado, obs);
  }
}
