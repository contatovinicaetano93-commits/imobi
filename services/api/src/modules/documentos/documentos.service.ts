import { Injectable, ForbiddenException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import type { DocumentoTipo } from "@prisma/client";

@Injectable()
export class DocumentosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async upload(
    usuarioId: string,
    fileBuffer: Buffer,
    mimeType: string,
    nome: string,
    tipo: string,
    obraId?: string,
    descricao?: string,
    vencimento?: string,
  ) {
    if (obraId) {
      const obra = await this.prisma.obra.findUnique({ where: { obraId } });
      if (!obra) throw new NotFoundException("Obra não encontrada.");
    }

    const { key } = await this.storage.upload(fileBuffer, mimeType, obraId ?? usuarioId);

    return this.prisma.documento.create({
      data: {
        usuarioId,
        obraId: obraId ?? undefined,
        tipo: tipo as DocumentoTipo,
        nome,
        url: key,
        mimeType,
        tamanhoBytes: fileBuffer.length,
        descricao,
        vencimento: vencimento ? new Date(vencimento) : undefined,
      },
    });
  }

  async listarPorObra(obraId: string, usuarioId: string, isAdmin: boolean) {
    if (!isAdmin) {
      const obra = await this.prisma.obra.findUnique({ where: { obraId } });
      if (!obra) throw new NotFoundException("Obra não encontrada.");
      if (obra.usuarioId !== usuarioId) throw new ForbiddenException("Acesso negado.");
    }
    return this.prisma.documento.findMany({
      where: { obraId },
      orderBy: { criadoEm: "desc" },
      take: 100,
    });
  }

  async listarPorUsuario(usuarioId: string) {
    return this.prisma.documento.findMany({
      where: { usuarioId },
      orderBy: { criadoEm: "desc" },
      take: 100,
    });
  }

  async deletar(documentoId: string, usuarioId: string, isAdmin: boolean) {
    const doc = await this.prisma.documento.findUnique({ where: { documentoId } });
    if (!doc) throw new NotFoundException("Documento não encontrado.");
    if (!isAdmin && doc.usuarioId !== usuarioId) throw new ForbiddenException("Acesso negado.");
    await this.storage.delete(doc.url).catch(() => null);
    return this.prisma.documento.delete({ where: { documentoId } });
  }
}
