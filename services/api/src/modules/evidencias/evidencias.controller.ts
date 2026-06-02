import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from "@nestjs/swagger";
import { EvidenciasService } from "./evidencias.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import {
  UsuarioAtual,
  type UsuarioAtual as IUsuario,
} from "../../common/decorators/usuario-atual.decorator";
import { UploadEvidenciaSchema, type UploadEvidenciaInput } from "@imbobi/schemas";

@ApiTags("evidencias")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("evidencias")
export class EvidenciasController {
  constructor(private readonly evidencias: EvidenciasService) {}

  @Post()
  upload(@UsuarioAtual() u: IUsuario, @Body() body: any) {
    try {
      const input = UploadEvidenciaSchema.parse({
        etapaId: body.etapaId,
        latitude: Number(body.latitude),
        longitude: Number(body.longitude),
        accuracyMetros: Number(body.accuracyMetros),
        timestampCaptura: body.timestampCaptura || new Date().toISOString(),
        imageBase64: body.imageBase64,
        mimeType: body.mimeType,
        descricao: body.descricao,
      });

      const buffer = Buffer.from(input.imageBase64, "base64");

      return this.evidencias.upload(u.id, input, buffer, input.mimeType);
    } catch (error: any) {
      throw new BadRequestException(error.errors?.[0]?.message || "Dados inválidos");
    }
  }

  @Get("etapa/:etapaId")
  async listar(@UsuarioAtual() u: IUsuario, @Param("etapaId") etapaId: string) {
    return this.evidencias.listarPorEtapaComValidacao(u.id, u.tipo, etapaId);
  }

  @Patch(":id/validar")
  @ApiOperation({
    summary: "Validar evidência",
    description: "Aprova ou rejeita uma foto de evidência (ADMIN/GESTOR_OBRA apenas)",
  })
  @ApiParam({ name: "id", description: "ID da evidência" })
  @ApiResponse({ status: 200, description: "Evidência validada" })
  validar(
    @UsuarioAtual() u: IUsuario,
    @Param("id") id: string,
    @Body("aprovado") aprovado: boolean,
    @Body("observacao") obs?: string,
  ) {
    if (u.tipo !== "ADMIN" && u.tipo !== "GESTOR_OBRA") {
      throw new ForbiddenException("Apenas ADMIN ou GESTOR_OBRA podem validar evidências");
    }
    return this.evidencias.validar(u.id, id, aprovado, obs);
  }
}
