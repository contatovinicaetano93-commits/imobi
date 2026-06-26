import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  Req,
  Res,
  BadRequestException,
} from "@nestjs/common";
import type { FastifyRequest, FastifyReply } from "fastify";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";
import { DocumentosService } from "./documentos.service";

@Controller("documentos")
@UseGuards(JwtAuthGuard)
export class DocumentosController {
  constructor(private readonly svc: DocumentosService) {}

  @Post()
  async upload(@UsuarioAtual() user: IUsuario, @Req() req: FastifyRequest) {
    if (!req.isMultipart()) {
      throw new BadRequestException("Envio deve ser multipart/form-data.");
    }

    let fileBuffer: Buffer | null = null;
    let mimeType = "application/octet-stream";
    let originalName = "documento";
    const fields: Record<string, string> = {};

    for await (const part of req.parts()) {
      if (part.type === "file") {
        const chunks: Buffer[] = [];
        for await (const chunk of part.file) chunks.push(chunk);
        fileBuffer = Buffer.concat(chunks);
        mimeType = part.mimetype;
        originalName = part.filename ?? originalName;
      } else {
        fields[part.fieldname] = part.value as string;
      }
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      throw new BadRequestException("Arquivo não enviado.");
    }

    const nomeArquivo = fields["nome"] ?? originalName;
    const tipoDoc = fields["tipo"] ?? "OUTROS";

    return this.svc.upload(
      user.id,
      fileBuffer,
      mimeType,
      nomeArquivo,
      tipoDoc,
      fields["obraId"],
      fields["descricao"],
      fields["vencimento"],
      originalName,
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

  @Get(":id/arquivo")
  async obterArquivo(
    @Param("id") id: string,
    @UsuarioAtual() user: IUsuario,
    @Res() res: FastifyReply,
  ) {
    const result = await this.svc.obterArquivo(id, user.id, user.tipo);
    if ("redirectUrl" in result) {
      return res.redirect(302, result.redirectUrl);
    }
    const { buffer, mimeType } = result;
    return res
      .header("Content-Type", mimeType ?? "application/octet-stream")
      .header("Cache-Control", "private, max-age=3600")
      .send(buffer);
  }

  @Delete(":id")
  async deletar(@Param("id") id: string, @UsuarioAtual() user: IUsuario) {
    const isAdmin = user.tipo === "ADMIN";
    return this.svc.deletar(id, user.id, isAdmin);
  }
}
