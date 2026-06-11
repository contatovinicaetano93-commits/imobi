import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from "@nestjs/common";
import { z } from "zod";
import { DossieService } from "./dossie.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import {
  UsuarioAtual,
  type UsuarioAtual as IUsuario,
} from "../../common/decorators/usuario-atual.decorator";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import {
  AtualizarFichaEmpreendimentoSchema,
  AtualizarStatusDossieSchema,
  CriarDossieSchema,
  DistratoDossieSchema,
  DocumentoDossieSchema,
  EmpresaDesenvolvedoraSchema,
  PermutaDossieSchema,
  RecebivelDossieSchema,
  UnidadeDossieSchema,
} from "@imbobi/schemas";

@UseGuards(JwtAuthGuard)
@Controller("dossies")
export class DossieController {
  constructor(private readonly dossies: DossieService) {}

  @Post()
  criar(
    @UsuarioAtual() u: IUsuario,
    @Body(new ZodPipe(CriarDossieSchema)) body: unknown
  ) {
    return this.dossies.criar(u.id, body as never);
  }

  @Get()
  listar(@UsuarioAtual() u: IUsuario) {
    return this.dossies.listar(u);
  }

  @Get(":id")
  obter(@Param("id") id: string, @UsuarioAtual() u: IUsuario) {
    return this.dossies.obterCompleto(id, u);
  }

  @Patch(":id/ficha")
  atualizarFicha(
    @Param("id") id: string,
    @UsuarioAtual() u: IUsuario,
    @Body(new ZodPipe(AtualizarFichaEmpreendimentoSchema)) body: unknown
  ) {
    return this.dossies.atualizarFicha(id, u, body as never);
  }

  @Put(":id/unidades")
  substituirUnidades(
    @Param("id") id: string,
    @UsuarioAtual() u: IUsuario,
    @Body(new ZodPipe(z.array(UnidadeDossieSchema))) body: unknown
  ) {
    return this.dossies.substituirUnidades(id, u, body as never);
  }

  @Post(":id/unidades/import")
  importarUnidades(
    @Param("id") id: string,
    @UsuarioAtual() u: IUsuario,
    @Body() body: unknown
  ) {
    return this.dossies.importarUnidades(id, u, body);
  }

  @Patch(":id/permuta")
  atualizarPermuta(
    @Param("id") id: string,
    @UsuarioAtual() u: IUsuario,
    @Body(new ZodPipe(PermutaDossieSchema)) body: unknown
  ) {
    return this.dossies.atualizarPermuta(id, u, body as never);
  }

  @Put(":id/recebiveis")
  substituirRecebiveis(
    @Param("id") id: string,
    @UsuarioAtual() u: IUsuario,
    @Body(new ZodPipe(z.array(RecebivelDossieSchema))) body: unknown
  ) {
    return this.dossies.substituirRecebiveis(id, u, body as never);
  }

  @Post(":id/recebiveis/import")
  importarRecebiveis(
    @Param("id") id: string,
    @UsuarioAtual() u: IUsuario,
    @Body() body: unknown
  ) {
    return this.dossies.importarRecebiveis(id, u, body);
  }

  @Put(":id/distratos")
  substituirDistratos(
    @Param("id") id: string,
    @UsuarioAtual() u: IUsuario,
    @Body(new ZodPipe(z.array(DistratoDossieSchema))) body: unknown
  ) {
    return this.dossies.substituirDistratos(id, u, body as never);
  }

  @Post(":id/documentos")
  registrarDocumento(
    @Param("id") id: string,
    @UsuarioAtual() u: IUsuario,
    @Body(new ZodPipe(DocumentoDossieSchema)) body: unknown
  ) {
    return this.dossies.registrarDocumento(id, u, body as never);
  }

  @Delete(":id/documentos/:docId")
  removerDocumento(
    @Param("id") id: string,
    @Param("docId") docId: string,
    @UsuarioAtual() u: IUsuario
  ) {
    return this.dossies.removerDocumento(id, u, docId);
  }

  @Patch(":id/empresa")
  atualizarEmpresa(
    @Param("id") id: string,
    @UsuarioAtual() u: IUsuario,
    @Body(new ZodPipe(EmpresaDesenvolvedoraSchema)) body: unknown
  ) {
    return this.dossies.atualizarEmpresa(id, u, body as never);
  }

  @Post(":id/etapas/:numero/concluir")
  concluirEtapa(
    @Param("id") id: string,
    @Param("numero") numero: string,
    @UsuarioAtual() u: IUsuario
  ) {
    return this.dossies.concluirEtapa(id, u, Number(numero));
  }

  @Post(":id/submeter")
  submeter(@Param("id") id: string, @UsuarioAtual() u: IUsuario) {
    return this.dossies.submeter(id, u);
  }

  @Patch(":id/status")
  @UseGuards(RolesGuard)
  @Roles("GESTOR_OBRA", "ADMIN")
  atualizarStatus(
    @Param("id") id: string,
    @UsuarioAtual() u: IUsuario,
    @Body(new ZodPipe(AtualizarStatusDossieSchema)) body: unknown
  ) {
    return this.dossies.atualizarStatus(id, u, body as never);
  }

  @Get(":id/metricas")
  metricas(@Param("id") id: string, @UsuarioAtual() u: IUsuario) {
    return this.dossies.metricas(id, u);
  }
}
