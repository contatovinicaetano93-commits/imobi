import { Controller, Get, Post, Patch, Param, Body, UseGuards } from "@nestjs/common";
import { DocumentosService } from "./documentos.service";
import { EnviarDocumentoSchema, RevisarDocumentoSchema } from "@imbobi/schemas";
import type { EnviarDocumentoInput, RevisarDocumentoInput } from "@imbobi/schemas";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { UsuarioAtual, type UsuarioAtual as UsuarioAtualType } from "../../common/decorators/usuario-atual.decorator";

@Controller("documentos")
@UseGuards(JwtAuthGuard, RolesGuard)
export class DocumentosController {
  constructor(private readonly documentos: DocumentosService) {}

  @Post()
  @Roles("CLIENTE")
  enviar(@UsuarioAtual() user: UsuarioAtualType, @Body(new ZodPipe(EnviarDocumentoSchema)) body: EnviarDocumentoInput) {
    return this.documentos.enviar(user.id, body);
  }

  @Get("obra/:obraId")
  @Roles("ADMIN", "CLIENTE", "FUNDO")
  listarPorObra(@Param("obraId") obraId: string, @UsuarioAtual() user: UsuarioAtualType) {
    return this.documentos.listarPorObra(obraId, user);
  }

  @Patch(":id/revisar")
  @Roles("ADMIN")
  revisar(@Param("id") id: string, @Body(new ZodPipe(RevisarDocumentoSchema)) body: RevisarDocumentoInput) {
    return this.documentos.revisar(id, body.status);
  }
}
