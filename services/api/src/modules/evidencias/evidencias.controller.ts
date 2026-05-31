import {
  Controller, Post, Get, Patch, Param, Body, UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { EvidenciasService } from "./evidencias.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";
import type { UploadEvidenciaInput } from "@imbobi/schemas";

@ApiTags("evidencias")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("evidencias")
export class EvidenciasController {
  constructor(private readonly evidencias: EvidenciasService) {}

  @Post("upload")
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: "Upload de evidência", description: "Envia foto de progresso com GPS validation (5req/min)" })
  @ApiResponse({ status: 201, description: "Foto salva com sucesso, GPS validado" })
  @ApiResponse({ status: 400, description: "GPS fora da zona permitida (15m)" })
  async upload(
    @UsuarioAtual() u: IUsuario,
    @Body() body: any
  ) {
    const input: UploadEvidenciaInput = {
      etapaId: body.etapaId,
      latitude: Number(body.latitude),
      longitude: Number(body.longitude),
      accuracyMetros: Number(body.accuracyMetros),
      descricao: body.descricao || "",
    };

    const buffer = Buffer.from(body.imageBase64 || "", "base64");
    const mimetype = body.mimeType || "image/jpeg";

    return this.evidencias.upload(u.id, input, buffer, mimetype);
  }

  @Get("etapa/:etapaId")
  @ApiOperation({ summary: "Listar evidências", description: "Retorna todas as fotos de uma etapa" })
  @ApiParam({ name: "etapaId", description: "ID da etapa" })
  @ApiResponse({ status: 200, description: "Lista de evidências" })
  listar(@Param("etapaId") etapaId: string) {
    return this.evidencias.listarPorEtapa(etapaId);
  }

  @Patch(":id/validar")
  @ApiOperation({ summary: "Validar evidência", description: "Aprova ou rejeita uma foto de evidência" })
  @ApiParam({ name: "id", description: "ID da evidência" })
  @ApiResponse({ status: 200, description: "Evidência validada" })
  validar(
    @UsuarioAtual() u: IUsuario,
    @Param("id") id: string,
    @Body("aprovado") aprovado: boolean,
    @Body("observacao") obs?: string
  ) {
    return this.evidencias.validar(u.id, id, aprovado, obs);
  }
}
