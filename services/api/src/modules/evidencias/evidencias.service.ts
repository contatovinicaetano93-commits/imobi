import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import { calcularDistanciaMetros } from "@imbobi/core";
import type { UploadEvidenciaInput } from "@imbobi/schemas";

const MAX_ACCURACY_METROS = 15;
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/heic', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

@Injectable()
export class EvidenciasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService
  ) {}

  private validateFile(mimeType: string, fileSize: number): void {
    if (!ALLOWED_MIME.includes(mimeType)) {
      throw new BadRequestException(
        `Invalid image format. Allowed: ${ALLOWED_MIME.join(', ')}`
      );
    }
    if (fileSize > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size exceeds 10MB limit. Got: ${(fileSize / 1024 / 1024).toFixed(2)}MB`
      );
    }
  }

  async upload(
    usuarioId: string,
    input: UploadEvidenciaInput,
    fileBuffer: Buffer,
    mimeType: string
  ) {
    this.validateFile(mimeType, fileBuffer.length);

    const etapa = await this.prisma.etapaObra.findUnique({
      where: { etapaId: input.etapaId },
      include: { obra: true },
    });
    if (!etapa) throw new NotFoundException("Etapa não encontrada.");

    if (etapa.obra.usuarioId !== usuarioId) {
      throw new ForbiddenException("Acesso negado a esta obra.");
    }

    if (input.accuracyMetros > MAX_ACCURACY_METROS) {
      throw new BadRequestException(
        `Precisão GPS insuficiente: ${input.accuracyMetros}m. Máximo permitido: ${MAX_ACCURACY_METROS}m.`
      );
    }

    // Parameterized query: Prisma $queryRaw with template literals automatically escapes parameters
    const result = await this.prisma.$queryRaw<Array<{ dentro: boolean }>>`
      SELECT ST_DWithin(
        ST_SetSRID(ST_MakePoint(${input.longitude}, ${input.latitude}), 4326)::geography,
        ST_SetSRID(ST_MakePoint(
          ${Number(etapa.obra.geoLongitude)},
          ${Number(etapa.obra.geoLatitude)}
        ), 4326)::geography,
        ${etapa.obra.raioValidacaoMetros}
      ) AS dentro
    `;
    const dentro = result[0]?.dentro ?? false;

    const distanciaObra = calcularDistanciaMetros(
      { latitude: input.latitude, longitude: input.longitude },
      {
        latitude: Number(etapa.obra.geoLatitude),
        longitude: Number(etapa.obra.geoLongitude),
      }
    );

    if (!dentro) {
      throw new ForbiddenException(
        `Localização inválida. Você está a ${Math.round(distanciaObra)}m da obra. Máximo permitido: ${etapa.obra.raioValidacaoMetros}m.`
      );
    }

    const { url } = await this.storage.upload(fileBuffer, mimeType, input.etapaId);

    return this.prisma.evidenciaEtapa.create({
      data: {
        etapaId: input.etapaId,
        obraId: etapa.obra.obraId,
        fotoUrl: url,
        latCaptura: input.latitude,
        lngCaptura: input.longitude,
        accuracyMetros: input.accuracyMetros,
        distanciaObra,
        observacao: input.descricao,
      },
    });
  }

  async listarPorEtapa(etapaId: string) {
    return this.prisma.evidenciaEtapa.findMany({
      where: { etapaId },
      orderBy: { criadoEm: "desc" },
    });
  }

  async listarPorEtapaComValidacao(usuarioId: string, usuarioTipo: string, etapaId: string) {
    const etapa = await this.prisma.etapaObra.findUnique({
      where: { etapaId },
      include: { obra: { select: { usuarioId: true } } },
    });
    if (!etapa) throw new NotFoundException("Etapa não encontrada.");

    const ehOwner = etapa.obra.usuarioId === usuarioId;
    const ehGestor = usuarioTipo === "ADMIN" || usuarioTipo === "GESTOR_OBRA";

    if (!ehOwner && !ehGestor) {
      throw new ForbiddenException("Acesso negado a esta etapa.");
    }

    return this.prisma.evidenciaEtapa.findMany({
      where: { etapaId },
      orderBy: { criadoEm: "desc" },
    });
  }

  async validar(gestorId: string, evidenciaId: string, aprovado: boolean, observacao?: string) {
    const evidencia = await this.prisma.evidenciaEtapa.findUnique({
      where: { evidenciaId },
    });
    if (!evidencia) throw new NotFoundException("Evidência não encontrada.");

    return this.prisma.evidenciaEtapa.update({
      where: { evidenciaId },
      data: {
        validada: aprovado,
        observacao,
      },
    });
  }
}
