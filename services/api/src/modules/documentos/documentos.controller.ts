import {
  Controller, Get, Post, Delete, Param, Body,
  UseGuards, UseInterceptors, UploadedFile, BadRequestException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { Throttle } from "@nestjs/throttler";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";
import { DocumentosService } from "./documentos.service";

const MIME_DOCUMENTOS_PERMITIDOS = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];
const MAX_DOCUMENTO_BYTES = 25 * 1024 * 1024; // 25 MB

@ApiTags("documentos")
@ApiBearerAuth()
@Controller("documentos")
@UseGuards(JwtAuthGuard)
export class DocumentosController {
  constructor(private readonly svc: DocumentosService) {}

  @ApiOperation({ summary: "Upload de documento (multipart/form-data)" })
  @ApiConsumes("multipart/form-data")
  @Post()
  @Throttle({ upload: { limit: 10, ttl: 60000 } })
  @UseInterceptors(FileInterceptor("file"))
  async upload(
    @UsuarioAtual() user: IUsuario,
    @UploadedFile() file: Express.Multer.File,
    @Body("obraId") obraId?: string,
    @Body("tipo") tipo?: string,
    @Body("nome") nome?: string,
    @Body("descricao") descricao?: string,
    @Body("vencimento") vencimento?: string,
  ) {
    if (!file) throw new BadRequestException("Arquivo não enviado.");
    if (!MIME_DOCUMENTOS_PERMITIDOS.includes(file.mimetype)) {
      throw new BadRequestException(
        `Tipo de arquivo não permitido: ${file.mimetype}. Use PDF, JPEG, PNG ou WebP.`,
      );
    }
    if (file.buffer.length > MAX_DOCUMENTO_BYTES) {
      throw new BadRequestException(
        `Arquivo muito grande (${Math.round(file.buffer.length / 1024 / 1024)}MB). Máximo: 25MB.`,
      );
    }

    const nomeArquivo = nome?.trim() || file.originalname;
    const tipoDoc = tipo ?? "OUTROS";
    return this.svc.upload(
      user.id, file.buffer, file.mimetype,
      nomeArquivo, tipoDoc, obraId, descricao, vencimento,
    );
  }

  @ApiOperation({ summary: "Listar documentos de uma obra" })
  @Get("obra/:obraId")
  async listarPorObra(
    @Param("obraId") obraId: string,
    @UsuarioAtual() user: IUsuario,
  ) {
    const isAdmin = user.tipo === "ADMIN";
    return this.svc.listarPorObra(obraId, user.id, isAdmin);
  }

  @ApiOperation({ summary: "Listar meus documentos" })
  @Get("meus")
  async listarMeus(@UsuarioAtual() user: IUsuario) {
    return this.svc.listarPorUsuario(user.id);
  }

  @ApiOperation({ summary: "Excluir documento por ID" })
  @Delete(":id")
  async deletar(@Param("id") id: string, @UsuarioAtual() user: IUsuario) {
    const isAdmin = user.tipo === "ADMIN";
    return this.svc.deletar(id, user.id, isAdmin);
  }
}
