import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { DossiesService } from "./dossies.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import {
  UsuarioAtual,
  type UsuarioAtual as IUsuario,
} from "../../common/decorators/usuario-atual.decorator";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import {
  AtualizarDossieSchema,
  AtualizarDossieStatusSchema,
  ChecklistTemplateQuerySchema,
  CriarDossieSchema,
} from "@imbobi/schemas";
import type {
  AtualizarDossieInput,
  AtualizarDossieStatusInput,
  ChecklistTemplateQuery,
  CriarDossieInput,
} from "@imbobi/schemas";

@Controller("dossies")
export class DossiesController {
  constructor(private readonly dossies: DossiesService) {}

  @UseGuards(JwtAuthGuard)
  @Get("checklist-template")
  checklistTemplate(
    @Query(new ZodPipe(ChecklistTemplateQuerySchema)) query: ChecklistTemplateQuery,
  ) {
    return this.dossies.checklistTemplate(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("TOMADOR", "CONSTRUTOR")
  @Post()
  criar(
    @UsuarioAtual() u: IUsuario,
    @Body(new ZodPipe(CriarDossieSchema)) body: CriarDossieInput,
  ) {
    return this.dossies.criar(u.id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  listar(@UsuarioAtual() u: IUsuario) {
    return this.dossies.listar(u.id, u.tipo);
  }

  @UseGuards(JwtAuthGuard)
  @Get(":id")
  buscar(@UsuarioAtual() u: IUsuario, @Param("id") id: string) {
    return this.dossies.buscar(id, u.id, u.tipo);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("TOMADOR", "CONSTRUTOR")
  @Patch(":id")
  atualizar(
    @UsuarioAtual() u: IUsuario,
    @Param("id") id: string,
    @Body(new ZodPipe(AtualizarDossieSchema)) body: AtualizarDossieInput,
  ) {
    return this.dossies.atualizar(id, u.id, u.tipo, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("TOMADOR", "CONSTRUTOR")
  @Post(":id/enviar")
  enviar(@UsuarioAtual() u: IUsuario, @Param("id") id: string) {
    return this.dossies.enviar(id, u.id, u.tipo);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @Patch(":id/status")
  atualizarStatus(
    @UsuarioAtual() u: IUsuario,
    @Param("id") id: string,
    @Body(new ZodPipe(AtualizarDossieStatusSchema)) body: AtualizarDossieStatusInput,
  ) {
    return this.dossies.atualizarStatus(id, u.id, body);
  }
}
