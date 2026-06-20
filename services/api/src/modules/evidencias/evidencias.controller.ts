import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import {
  Controller, Post, Get, Patch, Param, Body, UseGuards, Req, BadRequestException,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { FastifyRequest } from "fastify";
import { EvidenciasService } from "./evidencias.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";
import { UploadEvidenciaSchema } from "@imbobi/schemas";

@ApiTags("Evidências")
@ApiBearerAuth("JWT")
@UseGuards(JwtAuthGuard)
@Controller("evidencias")
export class EvidenciasController {
  constructor(private readonly evidencias: EvidenciasService) {}

  @Post()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async upload(
    @UsuarioAtual() u: IUsuario,
    @Req() req: FastifyRequest,
  ) {
    if (!req.isMultipart()) {
      throw new BadRequestException("Envio deve ser multipart/form-data.");
    }

    let fileBuffer: Buffer | null = null;
    let mimeType = "image/jpeg";
    const fields: Record<string, string> = {};

    for await (const part of req.parts()) {
      if (part.type === "file") {
        const chunks: Buffer[] = [];
        for await (const chunk of part.file) chunks.push(chunk);
        fileBuffer = Buffer.concat(chunks);
        mimeType = part.mimetype;
      } else {
        fields[part.fieldname] = part.value as string;
      }
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      throw new BadRequestException("Arquivo de foto não enviado.");
    }

    const parsed = UploadEvidenciaSchema.safeParse({
      etapaId: fields["etapaId"],
      latitude: Number(fields["latitude"]),
      longitude: Number(fields["longitude"]),
      accuracyMetros: Number(fields["accuracyMetros"]),
      timestampCaptura: fields["timestampCaptura"],
      descricao: fields["descricao"],
    });
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Dados inválidos.");
    }

    return this.evidencias.upload(u.id, parsed.data, fileBuffer, mimeType);
  }

  @Get("etapa/:etapaId")
  listar(@UsuarioAtual() u: IUsuario, @Param("etapaId") etapaId: string) {
    return this.evidencias.listarPorEtapa(u, etapaId);
  }

  @UseGuards(RolesGuard)
  @Roles("GESTOR", "ADMIN", "ENGENHEIRO")
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
