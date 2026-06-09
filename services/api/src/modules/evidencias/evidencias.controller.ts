import {
  Controller, Post, Get, Patch, Param, Body, UseGuards, Req, BadRequestException,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { FastifyRequest } from "fastify";
import { EvidenciasService } from "./evidencias.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";
import { UploadEvidenciaSchema } from "@imbobi/schemas";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

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
    const part = await (req as any).file();
    if (!part) throw new BadRequestException("Arquivo obrigatório.");

    if (!ALLOWED_MIME_TYPES.includes(part.mimetype)) {
      throw new BadRequestException(
        `Tipo de arquivo não permitido. Use JPEG, PNG, WEBP ou HEIC.`
      );
    }

    const buffer: Buffer = await part.toBuffer();
    if (buffer.length === 0) throw new BadRequestException("Arquivo vazio.");

    const f = part.fields as Record<string, any>;
    const parsed = UploadEvidenciaSchema.safeParse({
      etapaId: f["etapaId"]?.value,
      latitude: parseFloat(f["latitude"]?.value),
      longitude: parseFloat(f["longitude"]?.value),
      accuracyMetros: parseFloat(f["accuracyMetros"]?.value),
      timestampCaptura: f["timestampCaptura"]?.value,
      descricao: f["descricao"]?.value,
    });
    if (!parsed.success) throw new BadRequestException(parsed.error.errors[0]?.message ?? "Dados inválidos.");

    return this.evidencias.upload(u.id, parsed.data, buffer, part.mimetype);
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
