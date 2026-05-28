import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../modules/prisma/prisma.service";
import { Readable } from "stream";

interface ExportFilters {
  startDate?: Date;
  endDate?: Date;
  status?: string;
  kycStatus?: string;
}

@Injectable()
export class ExportService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Export users to CSV format
   */
  async exportUsersToCSV(filters?: ExportFilters): Promise<Readable> {
    const where: any = {};

    if (filters?.startDate || filters?.endDate) {
      where.criadoEm = {};
      if (filters?.startDate) where.criadoEm.gte = filters.startDate;
      if (filters?.endDate) where.criadoEm.lte = filters.endDate;
    }

    if (filters?.kycStatus) {
      where.kycStatus = filters.kycStatus;
    }

    const usuarios = await this.prisma.usuario.findMany({
      where,
      select: {
        usuarioId: true,
        nome: true,
        email: true,
        tipo: true,
        kycStatus: true,
        bloqueado: true,
        criadoEm: true,
        atualizadoEm: true,
      },
      orderBy: { criadoEm: "desc" },
    });

    return this.createCSVStream(usuarios, [
      "usuarioId",
      "nome",
      "email",
      "tipo",
      "kycStatus",
      "bloqueado",
      "criadoEm",
      "atualizadoEm",
    ]);
  }

  /**
   * Export obras to CSV format
   */
  async exportObrasToCSV(filters?: ExportFilters): Promise<Readable> {
    const where: any = {};

    if (filters?.startDate || filters?.endDate) {
      where.criadoEm = {};
      if (filters?.startDate) where.criadoEm.gte = filters.startDate;
      if (filters?.endDate) where.criadoEm.lte = filters.endDate;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    const obras = await this.prisma.obra.findMany({
      where,
      select: {
        obraId: true,
        nome: true,
        endereco: true,
        tipo: true,
        status: true,
        usuario: {
          select: {
            nome: true,
            email: true,
          },
        },
        credito: {
          select: {
            creditoId: true,
            valorAprovado: true,
          },
        },
        areaM2: true,
        criadoEm: true,
        atualizadoEm: true,
      },
      orderBy: { criadoEm: "desc" },
    });

    const formatted = obras.map((obra) => ({
      obraId: obra.obraId,
      nome: obra.nome,
      endereco: obra.endereco,
      tipo: obra.tipo || "N/A",
      status: obra.status,
      usuarioNome: obra.usuario.nome,
      usuarioEmail: obra.usuario.email,
      creditoId: obra.credito?.creditoId || "N/A",
      valorCreditoAprovado: obra.credito?.valorAprovado || 0,
      areaM2: obra.areaM2 || "N/A",
      criadoEm: obra.criadoEm,
      atualizadoEm: obra.atualizadoEm,
    }));

    return this.createCSVStream(formatted, [
      "obraId",
      "nome",
      "endereco",
      "tipo",
      "status",
      "usuarioNome",
      "usuarioEmail",
      "creditoId",
      "valorCreditoAprovado",
      "areaM2",
      "criadoEm",
      "atualizadoEm",
    ]);
  }

  /**
   * Export créditos to CSV format
   */
  async exportCreditosToCSV(filters?: ExportFilters): Promise<Readable> {
    const where: any = {};

    if (filters?.startDate || filters?.endDate) {
      where.criadoEm = {};
      if (filters?.startDate) where.criadoEm.gte = filters.startDate;
      if (filters?.endDate) where.criadoEm.lte = filters.endDate;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    const creditos = await this.prisma.credito.findMany({
      where,
      select: {
        creditoId: true,
        usuario: {
          select: {
            nome: true,
            email: true,
            cpfHash: true,
          },
        },
        valorAprovado: true,
        valorLiberado: true,
        taxaMensal: true,
        prazoMeses: true,
        status: true,
        dataAprovacao: true,
        dataVencimento: true,
        criadoEm: true,
      },
      orderBy: { criadoEm: "desc" },
    });

    const formatted = creditos.map((credito) => ({
      creditoId: credito.creditoId,
      usuarioNome: credito.usuario.nome,
      usuarioEmail: credito.usuario.email,
      usuarioCpf: credito.usuario.cpfHash,
      valorAprovado: credito.valorAprovado,
      valorLiberado: credito.valorLiberado,
      taxaMensalPercentual: (credito.taxaMensal * 100).toFixed(2),
      prazoMeses: credito.prazoMeses,
      status: credito.status,
      dataAprovacao: credito.dataAprovacao,
      dataVencimento: credito.dataVencimento || "N/A",
      criadoEm: credito.criadoEm,
    }));

    return this.createCSVStream(formatted, [
      "creditoId",
      "usuarioNome",
      "usuarioEmail",
      "usuarioCpf",
      "valorAprovado",
      "valorLiberado",
      "taxaMensalPercentual",
      "prazoMeses",
      "status",
      "dataAprovacao",
      "dataVencimento",
      "criadoEm",
    ]);
  }

  /**
   * Export evidências to CSV format
   */
  async exportEvidenciasToCSV(filters?: ExportFilters): Promise<Readable> {
    const where: any = {};

    if (filters?.startDate || filters?.endDate) {
      where.criadoEm = {};
      if (filters?.startDate) where.criadoEm.gte = filters.startDate;
      if (filters?.endDate) where.criadoEm.lte = filters.endDate;
    }

    const evidencias = await this.prisma.evidenciaEtapa.findMany({
      where,
      select: {
        evidenciaId: true,
        obra: {
          select: {
            nome: true,
            endereco: true,
          },
        },
        etapa: {
          select: {
            nome: true,
            ordem: true,
          },
        },
        latCaptura: true,
        lngCaptura: true,
        accuracyMetros: true,
        distanciaObra: true,
        validada: true,
        observacao: true,
        criadoEm: true,
      },
      orderBy: { criadoEm: "desc" },
    });

    const formatted = evidencias.map((ev) => ({
      evidenciaId: ev.evidenciaId,
      obraNome: ev.obra.nome,
      obraEndereco: ev.obra.endereco,
      etapaNome: ev.etapa.nome,
      etapaOrdem: ev.etapa.ordem,
      latCaptura: ev.latCaptura,
      lngCaptura: ev.lngCaptura,
      accuracyMetros: ev.accuracyMetros || "N/A",
      distanciaObra: ev.distanciaObra || "N/A",
      validada: ev.validada ? "Sim" : "Não",
      observacao: ev.observacao || "N/A",
      criadoEm: ev.criadoEm,
    }));

    return this.createCSVStream(formatted, [
      "evidenciaId",
      "obraNome",
      "obraEndereco",
      "etapaNome",
      "etapaOrdem",
      "latCaptura",
      "lngCaptura",
      "accuracyMetros",
      "distanciaObra",
      "validada",
      "observacao",
      "criadoEm",
    ]);
  }

  /**
   * Export KYC documents to CSV format
   */
  async exportKycDocumentosToCSV(filters?: ExportFilters): Promise<Readable> {
    const where: any = {};

    if (filters?.startDate || filters?.endDate) {
      where.criadoEm = {};
      if (filters?.startDate) where.criadoEm.gte = filters.startDate;
      if (filters?.endDate) where.criadoEm.lte = filters.endDate;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    const documents = await this.prisma.kycDocumento.findMany({
      where,
      select: {
        kycDocumentoId: true,
        usuario: {
          select: {
            nome: true,
            email: true,
            tipo: true,
          },
        },
        tipo: true,
        status: true,
        motivo_rejeicao: true,
        criadoEm: true,
        analisadoEm: true,
      },
      orderBy: { criadoEm: "desc" },
    });

    const formatted = documents.map((doc) => ({
      kycDocumentoId: doc.kycDocumentoId,
      usuarioNome: doc.usuario.nome,
      usuarioEmail: doc.usuario.email,
      usuarioTipo: doc.usuario.tipo,
      tipoDocumento: doc.tipo,
      status: doc.status,
      motivoRejeicao: doc.motivo_rejeicao || "N/A",
      criadoEm: doc.criadoEm,
      analisadoEm: doc.analisadoEm || "N/A",
    }));

    return this.createCSVStream(formatted, [
      "kycDocumentoId",
      "usuarioNome",
      "usuarioEmail",
      "usuarioTipo",
      "tipoDocumento",
      "status",
      "motivoRejeicao",
      "criadoEm",
      "analisadoEm",
    ]);
  }

  /**
   * Helper to create a readable stream from data with CSV formatting
   */
  private createCSVStream(
    data: any[],
    headers: string[]
  ): Readable {
    return new Readable({
      read() {
        if (data.length === 0) {
          // Write header
          const headerRow = headers
            .map((h) => this.escapeCSV(String(h)))
            .join(",");
          this.push(headerRow + "\n");
          this.push(null); // End stream
          data = []; // Mark as done
        } else {
          // Write rows
          const row = data.shift();
          if (row) {
            const csvRow = headers
              .map((h) => this.escapeCSV(String(row[h] || "")))
              .join(",");
            this.push(csvRow + "\n");
          }
        }
      },
      escapeCSV(value: string): string {
        if (value.includes(",") || value.includes('"') || value.includes("\n")) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      },
    });
  }
}
