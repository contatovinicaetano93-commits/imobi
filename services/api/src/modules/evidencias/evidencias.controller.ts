import {
  Controller, Post, Get, Patch, Param, Body, UseGuards, ForbiddenException,
} from "@nestjs/common";
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

  @Post()
  upload(
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
  async listar(@UsuarioAtual() u: IUsuario, @Param("etapaId") etapaId: string) {
    return this.evidencias.listarPorEtapaComValidacao(u.id, u.tipo, etapaId);
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
