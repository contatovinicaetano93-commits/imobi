import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import {
  Controller, Get, Post, Delete, Param, Body,
  UseGuards, Req, BadRequestException,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";
import { DocumentosService } from "./documentos.service";

@ApiTags("Documentos")
@ApiBearerAuth("JWT")
@Controller("documentos")
@UseGuards(JwtAuthGuard)
export class DocumentosController {
  constructor(private readonly svc: DocumentosService) {}

  @Post()
  async upload(
    @UsuarioAtual() user: IUsuario,
    @Req() req: FastifyRequest,
  ) {
    if (!req.isMultipart()) {
      throw new BadRequestException("Envio deve ser multipart/form-data.");
    }

    let fileBuffer: Buffer | null = null;
    let mimeType = "application/octet-stream";
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
      throw new BadRequestException("Arquivo não enviado.");
    }

    const nomeArquivo = fields["nome"] ?? "documento";
    const tipoDoc = fields["tipo"] ?? "OUTROS";

    return this.svc.upload(
      user.id, fileBuffer, mimeType,
      nomeArquivo, tipoDoc, fields["obraId"], fields["descricao"], fields["vencimento"],
    );
  }

  @Get("obra/:obraId")
  async listarPorObra(
    @Param("obraId") obraId: string,
    @UsuarioAtual() user: IUsuario,
  ) {
    const isAdmin = user.tipo === "ADMIN";
    return this.svc.listarPorObra(obraId, user.id, isAdmin);
  }

  @Get("meus")
  async listarMeus(@UsuarioAtual() user: IUsuario) {
    return this.svc.listarPorUsuario(user.id);
  }

  @Delete(":id")
  async deletar(@Param("id") id: string, @UsuarioAtual() user: IUsuario) {
    const isAdmin = user.tipo === "ADMIN";
    return this.svc.deletar(id, user.id, isAdmin);
  }
}
