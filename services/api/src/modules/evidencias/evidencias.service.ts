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
    private readonly storage: StorageService,
  ) {}

  async upload(
    usuarioId: string,
    input: UploadEvidenciaInput,
    fileBuffer: Buffer,
    mimeType: string,
  ) {
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
        `Precisão GPS insuficiente: ${input.accuracyMetros}m. Máximo permitido: ${MAX_ACCURACY_METROS}m.`,
      );
    }

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
        `Localização inválida. Você está a ${Math.round(distanciaObra)}m da obra. Máximo permitido: ${etapa.obra.raioValidacaoMetros}m.`,
      );
    }

    // Salva a key S3, não a URL pré-assinada — URLs expiram em 1h, keys são permanentes
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
      usuario.tipo !== "GESTOR_OBRA" &&
      etapa.obra.usuarioId !== usuario.id
    ) {
      throw new ForbiddenException("Acesso negado.");
    }

    const evidencias = await this.prisma.evidenciaEtapa.findMany({
      where: { etapaId },
      orderBy: { criadoEm: "desc" },
    });

    // Gera URLs pré-assinadas frescas (1h) para cada foto
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
    if (usuario.tipo !== "GESTOR_OBRA" && usuario.tipo !== "ADMIN") {
      throw new ForbiddenException(
        "Apenas gestores e administradores podem validar evidências.",
      );
    }

    // Bug fix (IDOR + state machine): fetch with select to avoid exposing extra fields,
    // then guard against invalid state transitions before performing an atomic updateMany.
    const evidencia = await this.prisma.evidenciaEtapa.findUnique({
      where: { evidenciaId },
      select: { evidenciaId: true, validada: true },
    });
    if (!evidencia) throw new NotFoundException("Evidência não encontrada.");

    // State machine: only allow the transition false → true (PENDENTE → APROVADA).
    // Reverting an already-approved evidencia could cause unjustified tranche re-releases.
    if (aprovado && evidencia.validada) {
      throw new BadRequestException("Evidência já foi validada.");
    }
    if (!aprovado && evidencia.validada) {
      throw new BadRequestException("Evidência já aprovada não pode ser revertida.");
    }

    // Atomic updateMany: the WHERE on validada:false prevents a race condition where two
    // gestors approve simultaneously — only one succeeds.
    const updated = await this.prisma.evidenciaEtapa.updateMany({
      where: { evidenciaId, validada: false },
      data: { validada: aprovado, observacao },
    });

    if (updated.count === 0) {
      throw new BadRequestException(
        "Transição de estado inválida ou evidência já processada.",
      );
    }

    return this.prisma.evidenciaEtapa.findUnique({
      where: { evidenciaId },
      select: {
        evidenciaId: true,
        etapaId: true,
        obraId: true,
        validada: true,
        observacao: true,
        criadoEm: true,
        atualizadoEm: true,
      },
    });
  }
}
