import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import { validateMime, KYC_ALLOWED_MIMES } from "../../common/utils/mime-validator.util";
import type { DocumentoTipo } from "@prisma/client";

const DOC_MAX_BYTES = 20 * 1024 * 1024;

@Injectable()
export class DocumentosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async upload(
    usuarioId: string,
    fileBuffer: Buffer,
    _mimeType: string,
    nome: string,
    tipo: string,
    obraId?: string,
    descricao?: string,
    vencimento?: string,
  ) {
    if (fileBuffer.length > DOC_MAX_BYTES) {
      throw new BadRequestException("Arquivo muito grande. Máximo 20 MB.");
    }

    let detectedMime: string;
    try {
      detectedMime = validateMime(fileBuffer, KYC_ALLOWED_MIMES);
    } catch (e: any) {
      throw new BadRequestException(e.message);
    }

    if (obraId) {
      const obra = await this.prisma.obra.findUnique({ where: { obraId } });
      if (!obra) throw new NotFoundException("Obra não encontrada.");
    }

    const { key } = await this.storage.upload(fileBuffer, detectedMime, obraId ?? usuarioId);

    return this.prisma.documento.create({
      data: {
        usuarioId,
        obraId: obraId ?? undefined,
        tipo: tipo as DocumentoTipo,
        nome,
        url: key,
        mimeType: detectedMime,
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
