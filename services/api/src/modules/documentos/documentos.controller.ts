import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import {
  Controller, Get, Post, Delete, Param, Body,
  UseGuards, UseInterceptors, UploadedFile,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
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
    const nomeArquivo = nome ?? file.originalname;
    const tipoDoc = tipo ?? "OUTROS";
    return this.svc.upload(
      user.id, file.buffer, file.mimetype,
      nomeArquivo, tipoDoc, obraId, descricao, vencimento,
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
