import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  ServiceUnavailableException,
  Logger,
} from "@nestjs/common";
import { DocumentoTipo } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";

const DOCUMENTO_MIMES = new Set([
  "application/pdf",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const DOCUMENTO_TIPOS = new Set<string>(Object.values(DocumentoTipo));
const DOCUMENTO_MAX_BYTES = 25 * 1024 * 1024;

@Injectable()
export class DocumentosService {
  private readonly logger = new Logger(DocumentosService.name);

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
    originalName?: string,
  ) {
    if (!DOCUMENTO_MIMES.has(mimeType)) {
      throw new BadRequestException("Formato inválido. Use PDF, Excel (XLS/XLSX) ou imagem (JPEG, PNG, WebP).");
    }
    if (fileBuffer.length > DOCUMENTO_MAX_BYTES) {
      throw new BadRequestException("Arquivo muito grande. Máximo 25 MB.");
    }
    if (!DOCUMENTO_TIPOS.has(tipo)) {
      throw new BadRequestException("Tipo de documento inválido.");
    }

    this.storage.assertStorageAvailable();

    if (obraId) {
      const obra = await this.prisma.obra.findUnique({ where: { obraId } });
      if (!obra) throw new NotFoundException("Obra não encontrada.");
      if (obra.usuarioId !== usuarioId) {
        throw new ForbiddenException("Acesso negado a esta obra.");
      }
    }

    let key: string;
    try {
      ({ key } = await this.storage.uploadDocumento(
        fileBuffer,
        mimeType,
        usuarioId,
        obraId,
        originalName ?? nome,
      ));
    } catch (error) {
      this.logger.error("documento upload failed", {
        usuarioId,
        obraId,
        mimeType,
        error: error instanceof Error ? error.message : error,
      });
      throw new ServiceUnavailableException(
        "Não foi possível salvar o arquivo. Tente novamente em instantes.",
      );
    }

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
    });
  }

  async listarPorUsuario(usuarioId: string) {
    return this.prisma.documento.findMany({
      where: { usuarioId },
      orderBy: { criadoEm: "desc" },
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
