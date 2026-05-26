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

@Injectable()
export class EvidenciasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService
  ) {}

  async upload(
    usuarioId: string,
    input: UploadEvidenciaInput,
    fileBuffer: Buffer,
    mimeType: string
  ) {
    // 1. Valida existência da etapa
    const etapa = await this.prisma.etapaObra.findUnique({
      where: { id: input.etapaId },
      include: { obra: true },
    });
    if (!etapa) throw new NotFoundException("Etapa não encontrada.");

    // 2. Valida que o usuário é dono da obra
    if (etapa.obra.usuarioId !== usuarioId) {
      throw new ForbiddenException("Acesso negado a esta obra.");
    }

    // 3. Valida precisão do GPS
    if (input.accuracyMetros > MAX_ACCURACY_METROS) {
      throw new BadRequestException(
        `Precisão GPS insuficiente: ${input.accuracyMetros}m. Máximo permitido: ${MAX_ACCURACY_METROS}m.`
      );
    }

    // 4. Valida posição via PostGIS (fonte de verdade — defesa server-side)
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

    // 5. Calcula distância para auditoria (mesmo que fora, registra)
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

    // 6. Upload para S3
    const { url, key } = await this.storage.upload(fileBuffer, mimeType, input.etapaId);

    // 7. Persiste evidência
    return this.prisma.evidenciaEtapa.create({
      data: {
        etapaId: input.etapaId,
        usuarioId,
        fotoUrl: url,
        fotoKey: key,
        latCaptura: input.latitude,
        lngCaptura: input.longitude,
        accuracyMetros: input.accuracyMetros,
        distanciaObra,
        exifTimestamp: input.timestampCaptura ? new Date(input.timestampCaptura) : null,
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

  async validar(gestorId: string, evidenciaId: string, aprovado: boolean, observacao?: string) {
    const evidencia = await this.prisma.evidenciaEtapa.findUnique({
      where: { id: evidenciaId },
    });
    if (!evidencia) throw new NotFoundException("Evidência não encontrada.");

    return this.prisma.evidenciaEtapa.update({
      where: { id: evidenciaId },
      data: {
        validada: aprovado,
        observacao,
        rejeitadaMotivo: !aprovado ? observacao : null,
      },
    });
  }
}
