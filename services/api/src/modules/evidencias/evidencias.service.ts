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
const MIN_ACCURACY_METROS = 1;  // abaixo de 1m = GPS falso
const MAX_TIMESTAMP_DEFASAGEM_MIN = 5;

@Injectable()
export class EvidenciasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async upload(
    usuarioId: string,
    input: UploadEvidenciaInput,
    fileBuffer: Buffer,
    mimeType: string,
  ) {
    // 1. Rejeita mock location declarado pelo dispositivo (Android)
    if (input.isMockLocation === true) {
      throw new BadRequestException(
        "Localização simulada detectada. Use o GPS real do dispositivo.",
      );
    }

    // 2. Rejeita accuracy suspeita (real GPS nunca é < 1m horizontalmente)
    if (input.accuracyMetros < MIN_ACCURACY_METROS) {
      throw new BadRequestException(
        "Precisão GPS suspeita. Desative apps de localização falsa e tente novamente.",
      );
    }

    // 3. Rejeita accuracy muito ruim
    if (input.accuracyMetros > MAX_ACCURACY_METROS) {
      throw new BadRequestException(
        `Precisão GPS insuficiente: ${input.accuracyMetros}m. Máximo permitido: ${MAX_ACCURACY_METROS}m.`,
      );
    }

    // 4. Valida frescor do timestamp (foto deve ter sido tirada nos últimos 5 min)
    const capturaTime = new Date(input.timestampCaptura);
    const agora = new Date();
    const diffMin = (agora.getTime() - capturaTime.getTime()) / 60_000;
    if (diffMin > MAX_TIMESTAMP_DEFASAGEM_MIN || diffMin < -1) {
      throw new BadRequestException(
        "Timestamp inválido. A foto deve ser tirada agora — não use fotos antigas.",
      );
    }

    const etapa = await this.prisma.etapaObra.findUnique({
      where: { etapaId: input.etapaId },
      include: { obra: true },
    });
    if (!etapa) throw new NotFoundException("Etapa não encontrada.");

    if (etapa.obra.usuarioId !== usuarioId) {
      throw new ForbiddenException("Acesso negado a esta obra.");
    }

    // 5. Validação PostGIS — incontornável, usa elipsoide terrestre (geography)
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
      },
    );

    if (!dentro) {
      throw new ForbiddenException(
        `Localização inválida. Você está a ${Math.round(distanciaObra)}m da obra. Máximo: ${etapa.obra.raioValidacaoMetros}m.`,
      );
    }

    const { key } = await this.storage.upload(fileBuffer, mimeType, input.etapaId);

    return this.prisma.evidenciaEtapa.create({
      data: {
        etapaId: input.etapaId,
        obraId: etapa.obra.obraId,
        fotoUrl: key,
        latCaptura: input.latitude,
        lngCaptura: input.longitude,
        accuracyMetros: input.accuracyMetros,
        distanciaObra,
        altitude: input.altitude ?? null,
        heading: input.heading ?? null,
        speed: input.speed ?? null,
        isMockLocation: input.isMockLocation ?? false,
        timestampCaptura: capturaTime,
        observacao: input.descricao,
      },
    });
  }

  async listarPorEtapa(usuario: { id: string; tipo: string }, etapaId: string) {
    const etapa = await this.prisma.etapaObra.findUnique({
      where: { etapaId },
      include: { obra: { select: { usuarioId: true } } },
    });
    if (!etapa) throw new NotFoundException("Etapa não encontrada.");
    if (
      usuario.tipo !== "ADMIN" &&
      usuario.tipo !== "GESTOR" &&
      etapa.obra.usuarioId !== usuario.id
    ) {
      throw new ForbiddenException("Acesso negado.");
    }

    const evidencias = await this.prisma.evidenciaEtapa.findMany({
      where: { etapaId },
      orderBy: { criadoEm: "desc" },
    });

    return Promise.all(
      evidencias.map(async (e) => ({
        ...e,
        fotoUrl: await this.storage.getSignedUrl(e.fotoUrl),
      })),
    );
  }

  async validar(
    usuario: { id: string; tipo: string },
    evidenciaId: string,
    aprovado: boolean,
    observacao?: string,
  ) {
    if (usuario.tipo !== "GESTOR" && usuario.tipo !== "ADMIN") {
      throw new ForbiddenException(
        "Apenas gestores e administradores podem validar evidências.",
      );
    }

    const evidencia = await this.prisma.evidenciaEtapa.findUnique({
      where: { evidenciaId },
    });
    if (!evidencia) throw new NotFoundException("Evidência não encontrada.");

    return this.prisma.evidenciaEtapa.update({
      where: { evidenciaId },
      data: { validada: aprovado, observacao },
    });
  }
}
