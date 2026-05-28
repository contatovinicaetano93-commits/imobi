import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CacheService } from "../cache/cache.service";
import { StorageService } from "../storage/storage.service";
import { calcularDistanciaMetros } from "@imbobi/core";
import type { UploadEvidenciaInput } from "@imbobi/schemas";

const MAX_ACCURACY_METROS = 15;

@Injectable()
export class EvidenciasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly storage: StorageService
  ) {}

  async upload(
    usuarioId: string,
    input: UploadEvidenciaInput,
    fileBuffer: Buffer,
    mimeType: string
  ) {
    const etapa = await this.prisma.etapaObra.findUnique({
      where: { etapaId: input.etapaId },
      select: { etapaId: true, obraId: true, obra: { select: { usuarioId: true } } },
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

    const obraBounds = await this.getObraBounds(etapa.obraId);

    const result = await this.prisma.$queryRaw<Array<{ dentro: boolean }>>`
      SELECT ST_DWithin(
        ST_SetSRID(ST_MakePoint(${input.longitude}, ${input.latitude}), 4326)::geography,
        ST_SetSRID(ST_MakePoint(
          ${Number(obraBounds.geoLongitude)},
          ${Number(obraBounds.geoLatitude)}
        ), 4326)::geography,
        ${obraBounds.raioValidacaoMetros}
      ) AS dentro
    `;
    const dentro = result[0]?.dentro ?? false;

    const distanciaObra = calcularDistanciaMetros(
      { latitude: input.latitude, longitude: input.longitude },
      {
        latitude: Number(obraBounds.geoLatitude),
        longitude: Number(obraBounds.geoLongitude),
      }
    );

    if (!dentro) {
      throw new ForbiddenException(
        `Localização inválida. Você está a ${Math.round(distanciaObra)}m da obra. Máximo permitido: ${obraBounds.raioValidacaoMetros}m.`
      );
    }

    const { url } = await this.storage.upload(fileBuffer, mimeType, input.etapaId);

    return this.prisma.evidenciaEtapa.create({
      data: {
        etapaId: input.etapaId,
        obraId: etapa.obraId,
        fotoUrl: url,
        latCaptura: input.latitude,
        lngCaptura: input.longitude,
        accuracyMetros: input.accuracyMetros,
        distanciaObra,
        observacao: input.descricao,
      },
    });
  }

  private async getObraBounds(obraId: string) {
    return this.cache.obterObraBoundsComCache(obraId, async () => {
      const obra = await this.prisma.obra.findUnique({
        where: { obraId },
        select: {
          geoLatitude: true,
          geoLongitude: true,
          raioValidacaoMetros: true,
        },
      });
      if (!obra) throw new NotFoundException("Obra não encontrada.");
      return obra;
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
