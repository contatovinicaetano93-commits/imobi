import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { EnviarDocumentoInput, DocumentoStatus } from "@imbobi/schemas";

type Requisitante = { id: string; role: string };

@Injectable()
export class DocumentosService {
  constructor(private readonly prisma: PrismaService) {}

  /** CLIENTE só envia documento pra própria obra. */
  async enviar(clienteId: string, input: EnviarDocumentoInput) {
    const obra = await this.prisma.obra.findUnique({ where: { id: input.obraId } });
    if (!obra) throw new NotFoundException("Obra não encontrada.");
    if (obra.clienteId !== clienteId) throw new ForbiddenException("Esta obra não é sua.");

    return this.prisma.documento.create({
      data: { tipo: input.tipo, url: input.url, obra: { connect: { id: input.obraId } } },
    });
  }

  /** ADMIN/FUNDO veem docs de qualquer obra; CLIENTE só da própria. */
  async listarPorObra(obraId: string, requisitante: Requisitante) {
    if (requisitante.role === "CLIENTE") {
      const obra = await this.prisma.obra.findUnique({ where: { id: obraId } });
      if (!obra || obra.clienteId !== requisitante.id) {
        throw new ForbiddenException("Esta obra não é sua.");
      }
    }
    return this.prisma.documento.findMany({ where: { obraId }, orderBy: { criadoEm: "desc" } });
  }

  async revisar(id: string, status: DocumentoStatus) {
    const documento = await this.prisma.documento.findUnique({ where: { id } });
    if (!documento) throw new NotFoundException("Documento não encontrado.");
    return this.prisma.documento.update({ where: { id }, data: { status } });
  }
}
