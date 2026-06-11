import {
  Controller, Post, Get, Patch, Param, Body, UseGuards, Req, BadRequestException,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { FastifyRequest } from "fastify";
import { EvidenciasService } from "./evidencias.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import { UploadEvidenciaSchema, ValidarEvidenciaSchema, type ValidarEvidenciaInput } from "@imbobi/schemas";

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
    const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB — prevents OOM / excessive S3 cost
    if (buffer.length > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException("Arquivo muito grande. Tamanho máximo permitido: 10MB.");
    }

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

  // Bug fix: RolesGuard enforces role at controller layer (defence-in-depth);
  // ZodPipe validates body so "aprovado" is always a boolean, never a raw string.
  @Patch(":id/validar")
  @UseGuards(RolesGuard)
  @Roles("GESTOR_OBRA", "ADMIN")
  validar(
    @UsuarioAtual() u: IUsuario,
    @Param("id") id: string,
    @Body(new ZodPipe(ValidarEvidenciaSchema.omit({ evidenciaId: true })))
    body: Omit<ValidarEvidenciaInput, "evidenciaId">,
  ) {
    return this.evidencias.validar(u, id, body.aprovado, body.observacao);
  }
}
