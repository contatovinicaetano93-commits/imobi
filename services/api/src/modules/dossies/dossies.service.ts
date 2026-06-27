import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
  Logger,
} from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import type { Cache } from "cache-manager";
import {
  DueDiligenceStatus,
  DossieChecklistItemStatus,
  DocumentoTipo,
  EstagioObraDossie,
  Prisma,
  TipoCreditoProposta,
} from "@prisma/client";
import {
  getChecklistItemsForEstagio,
  getChecklistItemsForTipoCredito,
  getEstagioMeta,
  getTipoCreditoMeta,
  listarEstagiosEntrada,
  listarTiposCredito,
  estagioFromTipoCredito,
  resolveTipoCredito,
} from "@imbobi/schemas";
import type {
  AtualizarDossieInput,
  AtualizarDossieStatusInput,
  CriarDossieInput,
  EstagioObraDossie as EstagioObraDossieSchema,
  TipoCreditoProposta as TipoCreditoPropostaSchema,
} from "@imbobi/schemas";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import { isManagerRole } from "../../common/constants/manager-roles";
import { invalidateJornadaCache } from "../jornada/jornada-cache";

const DOSSIE_INCLUDE = {
  checklistItens: { orderBy: { itemId: "asc" as const } },
  obra: {
    select: { obraId: true, nome: true, status: true },
  },
} satisfies Prisma.DueDiligenceInclude;

const DOSSIE_LIST_SELECT = {
  id: true,
  nomeEmpreendimento: true,
  estagioObra: true,
  status: true,
  percentualFisico: true,
  dataBase: true,
  obraId: true,
  criadoEm: true,
  atualizadoEm: true,
  enviadoEm: true,
} satisfies Prisma.DueDiligenceSelect;

export interface PropostaArquivoImport {
  itemId: string;
  nome: string;
  storageKey: string;
  mimeType: string;
  tamanhoBytes: number;
}

@Injectable()
export class DossiesService {
  private readonly logger = new Logger(DossiesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  checklistTemplate(query: { estagio?: EstagioObraDossieSchema; tipo?: TipoCreditoPropostaSchema }) {
    const tipo = query.tipo ?? (query.estagio ? resolveTipoCredito({ estagioObra: query.estagio }) : "OBRA_NOVA");
    const estagio = query.estagio ?? estagioFromTipoCredito(tipo);
    const meta = getTipoCreditoMeta(tipo);
    const itens = getChecklistItemsForTipoCredito(tipo);
    return {
      tipoCredito: tipo,
      estagio,
      meta,
      itens,
      tiposDisponiveis: listarTiposCredito(),
      estagiosDisponiveis: listarEstagiosEntrada(),
    };
  }

  async criar(usuarioId: string, dto: CriarDossieInput) {
    const tipoCredito = resolveTipoCredito({
      tipoCredito: dto.tipoCredito,
      estagioObra: dto.estagioObra,
    }) as TipoCreditoProposta;
    const estagioObra = (dto.estagioObra ?? estagioFromTipoCredito(tipoCredito as TipoCreditoPropostaSchema)) as EstagioObraDossie;

    if (dto.percentualFisico != null || dto.dataBase) {
      this.validarEstagioCampos(estagioObra, dto.percentualFisico, dto.dataBase, false);
    }

    if (dto.obraId) {
      await this.assertObraDoUsuario(dto.obraId, usuarioId);
    }

    const templateItens = getChecklistItemsForTipoCredito(tipoCredito as TipoCreditoPropostaSchema);

    return this.prisma.$transaction(async (tx) => {
      const payload: Record<string, unknown> = {};
      if (dto.narrativa) payload.narrativa = dto.narrativa;

      const dossie = await tx.dueDiligence.create({
        data: {
          usuarioId,
          estagioObra,
          tipoCredito,
          nomeEmpreendimento: dto.nomeEmpreendimento,
          percentualFisico: dto.percentualFisico ?? null,
          dataBase: dto.dataBase ?? null,
          obraId: dto.obraId ?? null,
          payload: payload as Prisma.InputJsonValue,
          status: DueDiligenceStatus.RASCUNHO,
          checklistItens: {
            create: templateItens.map((item) => ({
              itemId: item.itemId,
              titulo: item.titulo,
              obrigatorio: item.obrigatorio,
              status: DossieChecklistItemStatus.PENDENTE,
            })),
          },
        },
        include: DOSSIE_INCLUDE,
      });

      await this.registrarAudit(tx, dossie.id, usuarioId, "CRIADO", {
        estagioObra,
        tipoCredito,
      });

      return dossie;
    });
  }

  /** Pré-preenche dossiê a partir de proposta pública (marketing) no 1º login/cadastro. */
  async importarPropostaPublica(
    usuarioId: string,
    proposta: {
      id: string;
      tipoCredito: TipoCreditoProposta;
      nomeEmpreendimento: string;
      percentualFisico: number | null;
      dataBase: Date | null;
      narrativa: string | null;
      arquivos?: PropostaArquivoImport[];
    },
  ) {
    const existente = await this.prisma.dueDiligence.findFirst({
      where: { usuarioId },
      select: { id: true },
    });
    if (existente) return existente;

    const estagioObra = estagioFromTipoCredito(
      proposta.tipoCredito as TipoCreditoPropostaSchema,
    ) as EstagioObraDossie;
    const templateItens = getChecklistItemsForTipoCredito(
      proposta.tipoCredito as TipoCreditoPropostaSchema,
    );

    return this.prisma.$transaction(async (tx) => {
      const payload: Record<string, unknown> = {
        propostaCreditoId: proposta.id,
        importadoDePropostaPublica: true,
      };
      if (proposta.narrativa) payload.narrativa = proposta.narrativa;

      const dossie = await tx.dueDiligence.create({
        data: {
          usuarioId,
          estagioObra,
          tipoCredito: proposta.tipoCredito,
          nomeEmpreendimento: proposta.nomeEmpreendimento,
          percentualFisico: proposta.percentualFisico,
          dataBase: proposta.dataBase,
          payload: payload as Prisma.InputJsonValue,
          status: DueDiligenceStatus.RASCUNHO,
          checklistItens: {
            create: templateItens.map((item) => ({
              itemId: item.itemId,
              titulo: item.titulo,
              obrigatorio: item.obrigatorio,
              status: DossieChecklistItemStatus.PENDENTE,
            })),
          },
        },
        include: DOSSIE_INCLUDE,
      });

      await this.registrarAudit(tx, dossie.id, usuarioId, "IMPORTADO_PROPOSTA_PUBLICA", {
        propostaCreditoId: proposta.id,
        tipoCredito: proposta.tipoCredito,
      });

      if (proposta.arquivos?.length) {
        await this.copiarArquivosProposta(tx, usuarioId, dossie.id, proposta.arquivos);
      }

      await invalidateJornadaCache(this.cache, usuarioId);
      return dossie;
    });
  }

  private async copiarArquivosProposta(
    tx: Prisma.TransactionClient,
    usuarioId: string,
    dossieId: string,
    arquivos: PropostaArquivoImport[],
  ) {
    this.storage.assertStorageAvailable();

    for (const arq of arquivos) {
      try {
        const { buffer, mimeType } = await this.storage.readBuffer(arq.storageKey, arq.mimeType);
        const { key } = await this.storage.uploadDocumento(
          buffer,
          mimeType,
          usuarioId,
          undefined,
          arq.nome,
        );
        const doc = await tx.documento.create({
          data: {
            usuarioId,
            tipo: DocumentoTipo.OUTROS,
            nome: arq.nome,
            url: key,
            mimeType,
            tamanhoBytes: arq.tamanhoBytes,
            descricao: `Importado da proposta pública (${arq.itemId})`,
          },
        });
        await tx.dossieChecklistItem.updateMany({
          where: { dossieId, itemId: arq.itemId },
          data: {
            documentoId: doc.documentoId,
            status: DossieChecklistItemStatus.ENVIADO,
          },
        });
      } catch (error) {
        this.logger.warn(
          `Falha ao copiar arquivo ${arq.itemId} da proposta para dossiê ${dossieId}`,
          error instanceof Error ? error.message : error,
        );
      }
    }
  }

  async listar(usuarioId: string, role: string) {
    const where = isManagerRole(role) ? {} : { usuarioId };

    return this.prisma.dueDiligence.findMany({
      where,
      orderBy: { criadoEm: "desc" },
      select: DOSSIE_LIST_SELECT,
    });
  }

  async buscar(id: string, usuarioId: string, role: string) {
    const dossie = await this.prisma.dueDiligence.findUnique({
      where: { id },
      include: DOSSIE_INCLUDE,
    });
    if (!dossie) throw new NotFoundException("Dossiê não encontrado");
    this.assertPodeAcessar(dossie.usuarioId, usuarioId, role);
    return dossie;
  }

  async atualizar(id: string, usuarioId: string, role: string, dto: AtualizarDossieInput) {
    const dossie = await this.prisma.dueDiligence.findUnique({
      where: { id },
      include: { checklistItens: true },
    });
    if (!dossie) throw new NotFoundException("Dossiê não encontrado");
    this.assertPodeEditar(dossie, usuarioId, role);

    const estagio = dossie.estagioObra;
    if (!estagio) {
      throw new BadRequestException("Dossiê legado sem estágio — crie um novo dossiê.");
    }

    const percentual =
      dto.percentualFisico !== undefined ? dto.percentualFisico : dossie.percentualFisico;
    const dataBase = dto.dataBase !== undefined ? dto.dataBase : dossie.dataBase;
    if (dto.percentualFisico !== undefined || dto.dataBase !== undefined) {
      this.validarEstagioCampos(estagio, percentual ?? undefined, dataBase ?? undefined, false);
    }

    if (dto.obraId) {
      await this.assertObraDoUsuario(dto.obraId, dossie.usuarioId);
    }

    const data: Prisma.DueDiligenceUpdateInput = {};
    const scalarFields = [
      "nomeEmpreendimento",
      "tipologia",
      "endereco",
      "cidade",
      "uf",
      "totalUnidades",
      "areaTotal",
      "dataEntregaPrevista",
      "nomeIncorporadora",
      "cnpjIncorporadora",
      "modeloAmortizacao",
      "totalCarteira",
      "totalAReceber",
      "estruturaSocietaria",
      "percentualFisico",
      "dataBase",
    ] as const;

    for (const field of scalarFields) {
      if (dto[field] !== undefined) {
        (data as Record<string, unknown>)[field] = dto[field];
      }
    }

    if (dto.obraId !== undefined) {
      data.obra = dto.obraId ? { connect: { obraId: dto.obraId } } : { disconnect: true };
    }

    if (dto.ficha) {
      const currentPayload =
        dossie.payload && typeof dossie.payload === "object" && !Array.isArray(dossie.payload)
          ? (dossie.payload as Record<string, unknown>)
          : {};
      data.payload = { ...currentPayload, ficha: dto.ficha } as Prisma.InputJsonValue;
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.checklistItens?.length) {
        const itemIds = new Set(dossie.checklistItens.map((i) => i.itemId));
        for (const item of dto.checklistItens) {
          if (!itemIds.has(item.itemId)) {
            throw new BadRequestException(`Item de checklist inválido: ${item.itemId}`);
          }
          await tx.dossieChecklistItem.updateMany({
            where: { dossieId: id, itemId: item.itemId },
            data: {
              ...(item.status !== undefined && { status: item.status }),
              ...(item.documentoId !== undefined && { documentoId: item.documentoId }),
              ...(item.observacao !== undefined && { observacao: item.observacao }),
            },
          });
        }
      }

      const atualizado = await tx.dueDiligence.update({
        where: { id },
        data,
        include: DOSSIE_INCLUDE,
      });

      await this.registrarAudit(tx, id, usuarioId, "ATUALIZADO", {
        campos: Object.keys(dto),
      });

      return atualizado;
    });
  }

  async enviar(id: string, usuarioId: string, role: string) {
    const dossie = await this.prisma.dueDiligence.findUnique({
      where: { id },
      include: { checklistItens: true },
    });
    if (!dossie) throw new NotFoundException("Dossiê não encontrado");
    this.assertPodeEditar(dossie, usuarioId, role);

    if (!dossie.estagioObra) {
      throw new BadRequestException("Dossiê sem estágio definido.");
    }

    this.validarEstagioCampos(
      dossie.estagioObra,
      dossie.percentualFisico ?? undefined,
      dossie.dataBase ?? undefined,
      true,
    );

    const pendentes = dossie.checklistItens.filter(
      (item) =>
        item.obrigatorio &&
        item.status !== DossieChecklistItemStatus.ENVIADO &&
        item.status !== DossieChecklistItemStatus.APROVADO &&
        item.status !== DossieChecklistItemStatus.NA,
    );

    if (pendentes.length > 0) {
      throw new BadRequestException({
        message: "Checklist incompleto — itens obrigatórios pendentes",
        itensPendentes: pendentes.map((i) => ({ itemId: i.itemId, titulo: i.titulo })),
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const enviado = await tx.dueDiligence.update({
        where: { id },
        data: {
          status: DueDiligenceStatus.ENVIADO,
          enviadoEm: new Date(),
        },
        include: DOSSIE_INCLUDE,
      });

      await this.registrarAudit(tx, id, usuarioId, "ENVIADO");
      await invalidateJornadaCache(this.cache, dossie.usuarioId);
      return enviado;
    });
  }

  async atualizarStatus(id: string, adminId: string, dto: AtualizarDossieStatusInput) {
    const dossie = await this.prisma.dueDiligence.findUnique({ where: { id } });
    if (!dossie) throw new NotFoundException("Dossiê não encontrado");

    const transicoesValidas: Record<DueDiligenceStatus, DueDiligenceStatus[]> = {
      RASCUNHO: [],
      ENVIADO: ["EM_ANALISE", "REPROVADO"],
      EM_ANALISE: ["APROVADO", "REPROVADO"],
      APROVADO: [],
      REPROVADO: ["EM_ANALISE"],
    };

    const permitidos = transicoesValidas[dossie.status] ?? [];
    if (!permitidos.includes(dto.status as DueDiligenceStatus)) {
      throw new BadRequestException(
        `Transição inválida: ${dossie.status} → ${dto.status}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const atualizado = await tx.dueDiligence.update({
        where: { id },
        data: {
          status: dto.status as DueDiligenceStatus,
          observacaoAdmin: dto.observacaoAdmin ?? dossie.observacaoAdmin,
        },
        include: DOSSIE_INCLUDE,
      });

      await this.registrarAudit(tx, id, adminId, "STATUS_ALTERADO", {
        de: dossie.status,
        para: dto.status,
        observacaoAdmin: dto.observacaoAdmin,
      });

      await invalidateJornadaCache(this.cache, dossie.usuarioId);
      return atualizado;
    });
  }

  async temDossieAprovado(usuarioId: string): Promise<boolean> {
    const count = await this.prisma.dueDiligence.count({
      where: { usuarioId, status: DueDiligenceStatus.APROVADO },
    });
    return count > 0;
  }

  private assertPodeAcessar(donoId: string, usuarioId: string, role: string) {
    if (isManagerRole(role)) return;
    if (donoId !== usuarioId) throw new ForbiddenException("Acesso negado");
  }

  private assertPodeEditar(
    dossie: { usuarioId: string; status: DueDiligenceStatus },
    usuarioId: string,
    role: string,
  ) {
    if (isManagerRole(role)) {
      throw new ForbiddenException("Gestor e admin apenas visualizam — edição é do tomador");
    }
    if (dossie.usuarioId !== usuarioId) throw new ForbiddenException("Acesso negado");
    if (dossie.status !== DueDiligenceStatus.RASCUNHO) {
      throw new BadRequestException("Somente dossiês em rascunho podem ser editados");
    }
  }

  private validarEstagioCampos(
    estagio: EstagioObraDossie | EstagioObraDossieSchema,
    percentualFisico?: number | null,
    dataBase?: Date | null,
    strict = false,
  ) {
    const meta = getEstagioMeta(estagio as EstagioObraDossieSchema);
    if (!meta) throw new BadRequestException("Estágio de obra inválido");

    if (strict && !dataBase) {
      throw new BadRequestException("Data-base do dossiê é obrigatória");
    }

    if (estagio === "NOVO") {
      if (percentualFisico != null && percentualFisico > 0) {
        throw new BadRequestException("Empreendimento novo deve ter percentual físico 0%");
      }
      return;
    }

    if (strict && percentualFisico == null) {
      throw new BadRequestException("Percentual físico da obra é obrigatório para este estágio");
    }

    if (percentualFisico != null) {
      if (percentualFisico < meta.percentualObraMin || percentualFisico > meta.percentualObraMax) {
        throw new BadRequestException(
          `Percentual físico deve estar entre ${meta.percentualObraMin}% e ${meta.percentualObraMax}%`,
        );
      }
    }
  }

  private async assertObraDoUsuario(obraId: string, usuarioId: string) {
    const obra = await this.prisma.obra.findFirst({
      where: { obraId, usuarioId },
      select: { obraId: true },
    });
    if (!obra) throw new BadRequestException("Obra não encontrada ou não pertence ao usuário");
  }

  private async registrarAudit(
    tx: Prisma.TransactionClient,
    dossieId: string,
    usuarioId: string,
    acao: string,
    detalhes?: Record<string, unknown>,
  ) {
    await tx.dossieAuditLog.create({
      data: {
        dossieId,
        usuarioId,
        acao,
        detalhes: (detalhes ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  }
}
