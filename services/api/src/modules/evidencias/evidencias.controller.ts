import {
  Controller, Post, Get, Patch, Param, Body, UseGuards,
} from "@nestjs/common";
import { EvidenciasService } from "./evidencias.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";
import { Throttle } from "../../common/decorators/throttle.decorator";
import { UserThrottlerGuard } from "../../common/guards/user-throttler.guard";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import { UploadEvidenciaSchema, ValidarEvidenciaSchema } from "@imbobi/schemas";

@UseGuards(JwtAuthGuard)
@Controller("evidencias")
export class EvidenciasController {
  constructor(private readonly evidencias: EvidenciasService) {}

  @Post()
  @UseGuards(UserThrottlerGuard)
  @Throttle(30, 86400000) // 30 requests per day per user
  upload(
    @UsuarioAtual() u: IUsuario,
    @Body(new ZodPipe(UploadEvidenciaSchema)) body: unknown
  ) {
    return this.evidencias.upload(u.id, body as never, Buffer.alloc(0), "image/jpeg");
  }

  @Get("etapa/:etapaId")
  listar(@Param("etapaId") etapaId: string) {
    return this.evidencias.listarPorEtapa(etapaId);
  }

  @Patch(":id/validar")
  validar(
    @UsuarioAtual() u: IUsuario,
    @Param("id") id: string,
    @Body(new ZodPipe(ValidarEvidenciaSchema)) body: unknown
  ) {
    const validated = body as { evidenciaId: string; aprovado: boolean; observacao?: string };
    return this.evidencias.validar(u.id, validated.evidenciaId, validated.aprovado, validated.observacao);
  }
}
