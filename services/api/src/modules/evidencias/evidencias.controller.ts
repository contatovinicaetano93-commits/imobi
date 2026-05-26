import {
  Controller, Post, Get, Patch, Param, Body,
  UploadedFile, UseInterceptors, UseGuards,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-fastify";
import { EvidenciasService } from "./evidencias.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { UsuarioAtual, type UsuarioAtual as IUsuario } from "../../common/decorators/usuario-atual.decorator";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import { UploadEvidenciaSchema } from "@imbobi/schemas";

@UseGuards(JwtAuthGuard)
@Controller("evidencias")
export class EvidenciasController {
  constructor(private readonly evidencias: EvidenciasService) {}

  @Post()
  @UseInterceptors(FileInterceptor("file"))
  upload(
    @UsuarioAtual() u: IUsuario,
    @UploadedFile() file: Express.Multer.File,
    @Body(new ZodPipe(UploadEvidenciaSchema)) body: unknown
  ) {
    return this.evidencias.upload(u.id, body as never, file.buffer, file.mimetype);
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
