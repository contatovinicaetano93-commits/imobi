import {
  Injectable,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { PropostaCreditoStatus, TipoCreditoProposta } from "@prisma/client";
import {
  EnviarPropostaPublicaSchema,
  getChecklistItemsForTipoCredito,
  getTipoCreditoMeta,
  listarTiposCredito,
} from "@imbobi/schemas";
import type { TipoCreditoProposta as TipoCreditoPropostaSchema } from "@imbobi/schemas";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import { EmailService } from "../email/email.service";
import { DossiesService } from "../dossies/dossies.service";

const PROPOSTA_MIMES = new Set([
  "application/pdf",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);
const PROPOSTA_MAX_BYTES = 25 * 1024 * 1024;

export interface PropostaArquivoMeta {
  itemId: string;
  nome: string;
  storageKey: string;
  mimeType: string;
  tamanhoBytes: number;
}

@Injectable()
export class PropostasService {
  private readonly logger = new Logger(PropostasService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly email: EmailService,
    private readonly dossies: DossiesService,
  ) {}

  checklistTemplate(tipo: TipoCreditoPropostaSchema) {
    return {
      tipo,
      meta: getTipoCreditoMeta(tipo),
      itens: getChecklistItemsForTipoCredito(tipo),
      tiposDisponiveis: listarTiposCredito(),
    };
  }

  async listarPendentesAdmin(limit = 50) {
    return this.prisma.propostaCredito.findMany({
      where: { status: { in: [PropostaCreditoStatus.RECEBIDA, PropostaCreditoStatus.EM_ANALISE] } },
      orderBy: { criadoEm: "desc" },
      take: limit,
      select: {
        id: true,
        tipoCredito: true,
        nomeEmpreendimento: true,
        nomeContato: true,
        email: true,
        telefone: true,
        empresa: true,
        status: true,
        usuarioId: true,
        criadoEm: true,
      },
    });
  }

  /**
   * Vincula propostas públicas (mesmo e-mail) ao usuário recém-autenticado
   * e cria rascunho de dossiê quando ainda não existir.
   */
  async vincularUsuarioAoFluxo(usuarioId: string, email: string): Promise<void> {
    const propostas = await this.prisma.propostaCredito.findMany({
      where: {
        usuarioId: null,
        email: { equals: email.trim(), mode: "insensitive" },
      },
      orderBy: { criadoEm: "desc" },
    });

    if (propostas.length === 0) return;

    await this.prisma.propostaCredito.updateMany({
      where: { id: { in: propostas.map((p) => p.id) } },
      data: { usuarioId },
    });

    const maisRecente = propostas[0];
    if (!maisRecente) return;

    try {
      await this.dossies.importarPropostaPublica(usuarioId, {
        id: maisRecente.id,
        tipoCredito: maisRecente.tipoCredito,
        nomeEmpreendimento: maisRecente.nomeEmpreendimento,
        percentualFisico: maisRecente.percentualFisico,
        dataBase: maisRecente.dataBase,
        narrativa: maisRecente.narrativa,
      });
      this.logger.log(`Proposta ${maisRecente.id} vinculada ao usuário ${usuarioId}`);
    } catch (error) {
      this.logger.warn(
        `Falha ao importar proposta ${maisRecente.id} para usuário ${usuarioId}`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  async criarPublica(
    fields: Record<string, string>,
    files: Array<{ fieldname: string; buffer: Buffer; mimetype: string; filename: string }>,
  ) {
    const parsed = EnviarPropostaPublicaSchema.safeParse(fields);
    if (!parsed.success) {
      const msg = parsed.error.errors[0]?.message ?? "Dados inválidos.";
      throw new BadRequestException(msg);
    }

    const {
      tipoCredito,
      nomeEmpreendimento,
      nomeContato,
      email,
      telefone,
      empresa,
      narrativa,
      dataBase,
      percentualFisico,
    } = parsed.data;

    this.storage.assertStorageAvailable();

    const proposta = await this.prisma.propostaCredito.create({
      data: {
        tipoCredito: tipoCredito as TipoCreditoProposta,
        nomeEmpreendimento,
        nomeContato,
        email: email.trim(),
        telefone: telefone.replace(/\D/g, ""),
        empresa: empresa?.trim() || null,
        narrativa: narrativa?.trim() || null,
        dataBase: dataBase ?? null,
        percentualFisico:
          tipoCredito !== "OBRA_NOVA" && percentualFisico != null
            ? percentualFisico
            : null,
        status: PropostaCreditoStatus.RECEBIDA,
        arquivos: [],
      },
    });

    const arquivos: PropostaArquivoMeta[] = [];

    for (const file of files) {
      if (!file.buffer.length) continue;
      if (file.buffer.length > PROPOSTA_MAX_BYTES) {
        throw new BadRequestException(`Arquivo ${file.filename} excede 25 MB.`);
      }
      if (!PROPOSTA_MIMES.has(file.mimetype)) {
        throw new BadRequestException(
          `Formato não aceito em ${file.filename}. Use PDF ou Excel.`,
        );
      }

      const itemId = file.fieldname.startsWith("item_")
        ? file.fieldname.slice("item_".length)
        : file.fieldname === "ficha"
          ? "ficha_viabilidade"
          : file.fieldname;

      const { key } = await this.storage.uploadProposta(
        file.buffer,
        file.mimetype,
        proposta.id,
        itemId,
        file.filename,
      );

      arquivos.push({
        itemId,
        nome: file.filename,
        storageKey: key,
        mimeType: file.mimetype,
        tamanhoBytes: file.buffer.length,
      });
    }

    const atualizada = await this.prisma.propostaCredito.update({
      where: { id: proposta.id },
      data: { arquivos: arquivos as unknown as object },
    });

    void this.notificarEquipe(atualizada, arquivos.length);

    return {
      id: atualizada.id,
      status: atualizada.status,
      mensagem:
        "Proposta recebida. Nossa equipe analisará a documentação em até 15 dias úteis e entrará em contato.",
    };
  }

  private async notificarEquipe(
    proposta: {
      id: string;
      tipoCredito: TipoCreditoProposta;
      nomeEmpreendimento: string;
      nomeContato: string;
      email: string;
      telefone: string;
      empresa: string | null;
    },
    totalArquivos: number,
  ) {
    const destino =
      process.env["IMOBI_PROPOSTA_NOTIFY_EMAIL"] ??
      process.env["ADMIN_NOTIFY_EMAIL"] ??
      null;

    const tipoLabel = getTipoCreditoMeta(proposta.tipoCredito as TipoCreditoPropostaSchema)?.label
      ?? proposta.tipoCredito;

    const html = `
      <h2>Nova proposta de crédito — ${proposta.nomeEmpreendimento}</h2>
      <p><strong>Tipo:</strong> ${tipoLabel}</p>
      <p><strong>Contato:</strong> ${proposta.nomeContato} · ${proposta.email} · ${proposta.telefone}</p>
      ${proposta.empresa ? `<p><strong>Empresa:</strong> ${proposta.empresa}</p>` : ""}
      <p><strong>Arquivos:</strong> ${totalArquivos}</p>
      <p><strong>ID:</strong> ${proposta.id}</p>
    `;

    if (destino) {
      try {
        await this.email.enviarEmail({
          to: destino,
          subject: `[IMOBI] Nova proposta — ${proposta.nomeEmpreendimento}`,
          html,
        });
      } catch (error) {
        this.logger.error(
          `Falha ao enviar e-mail da proposta ${proposta.id}`,
          error instanceof Error ? error.stack : error,
        );
      }
    } else {
      this.logger.log(`Proposta ${proposta.id} recebida (${totalArquivos} arquivos) — IMOBI_PROPOSTA_NOTIFY_EMAIL não configurado`);
    }
  }
}
