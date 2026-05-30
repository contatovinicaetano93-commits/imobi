import {
  Controller, Post, Get, Patch, Param, Body, UseGuards, UseInterceptors, UploadedFile,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-fastify/multer";
import { Throttle } from "@nestjs/throttler";
import { EvidenciasService } from "./evidencias.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";
import type { UploadEvidenciaInput } from "@imbobi/schemas";

@UseGuards(JwtAuthGuard)
@Controller("evidencias")
export class EvidenciasController {
  constructor(private readonly evidencias: EvidenciasService) {}

  @Post("upload")
  @UseInterceptors(FileInterceptor("file"))
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async upload(
    @UsuarioAtual() u: IUsuario,
    @UploadedFile() file: any,
    @Body() body: any
  ) {
    const input: UploadEvidenciaInput = {
      etapaId: body.etapaId,
      latitude: Number(body.latitude),
      longitude: Number(body.longitude),
      accuracyMetros: Number(body.accuracyMetros),
      descricao: body.descricao || "",
    };
    return this.evidencias.upload(u.id, input, file.buffer, file.mimetype);
  }

  @Get("etapa/:etapaId")
  listar(@Param("etapaId") etapaId: string) {
    return this.evidencias.listarPorEtapa(etapaId);
  }

  @Patch(":id/validar")
  validar(
    @UsuarioAtual() u: IUsuario,
    @Param("id") id: string,
    @Body("aprovado") aprovado: boolean,
    @Body("observacao") obs?: string
  ) {
    return this.evidencias.validar(u.id, id, aprovado, obs);
  }
}
