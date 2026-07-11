import { Injectable, Inject } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import type { Cache } from "cache-manager";
import { PrismaService } from "../prisma/prisma.service";
import type { EtapaFunil, JornadaResponse, Role } from "@imbobi/schemas";

const CACHE_TTL_MS = 30_000;

const TITULOS: Record<EtapaFunil, { titulo: string; descricao: string; href: string }> = {
  KYC_PENDENTE: { titulo: "Envie seus documentos", descricao: "KYC pendente de envio.", href: "/dashboard/cliente/documentos" },
  DOSSIE_EM_ANALISE: { titulo: "Dossiê em análise", descricao: "Admin está revisando seus documentos.", href: "/dashboard/cliente" },
  APROVADO: { titulo: "Cadastre sua obra", descricao: "Dossiê aprovado — informe os dados da obra.", href: "/dashboard/cliente/obra/nova" },
  OBRA_CADASTRADA: { titulo: "Aguardando homologação", descricao: "Admin vai vincular um engenheiro.", href: "/dashboard/cliente" },
  HOMOLOGADA: { titulo: "Obra homologada", descricao: "Engenheiro vinculado — aguardando início.", href: "/dashboard/cliente/obra" },
  EM_ANDAMENTO: { titulo: "Acompanhe as tranches", descricao: "Engenheiro valida cada fase, admin libera o valor.", href: "/dashboard/cliente/obra" },
  QUITADO: { titulo: "Obra quitada", descricao: "Crédito totalmente liberado e quitado.", href: "/dashboard/cliente/obra" },
};

const ORDEM: EtapaFunil[] = [
  "KYC_PENDENTE",
  "DOSSIE_EM_ANALISE",
  "APROVADO",
  "OBRA_CADASTRADA",
  "HOMOLOGADA",
  "EM_ANDAMENTO",
  "QUITADO",
];

@Injectable()
export class EtapasService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  /**
   * Passo guiado do CLIENTE — cliente pode ter várias obras; a que ainda não
   * terminou e está parada há mais tempo dita a jornada (a mais urgente).
   * Só olha pra obra concluída se todas já estiverem QUITADO.
   */
  async paraCliente(usuarioId: string): Promise<JornadaResponse> {
    const cacheKey = `jornada:cliente:${usuarioId}`;
    const cached = await this.cache.get<JornadaResponse>(cacheKey);
    if (cached) return cached;

    const pendente = await this.prisma.obra.findFirst({
      where: { clienteId: usuarioId, etapa: { not: "QUITADO" } },
      orderBy: { criadoEm: "asc" },
    });
    const obra =
      pendente ?? (await this.prisma.obra.findFirst({ where: { clienteId: usuarioId }, orderBy: { criadoEm: "desc" } }));

    const resposta = this.montarResposta("CLIENTE", obra?.etapa ?? "KYC_PENDENTE");
    await this.cache.set(cacheKey, resposta, CACHE_TTL_MS);
    return resposta;
  }

  /** Passo guiado do ENGENHEIRO — quantas tranches aguardam validação. */
  async paraEngenheiro(usuarioId: string): Promise<JornadaResponse> {
    const pendentes = await this.prisma.tranche.count({
      where: { status: "PENDENTE", obra: { engenheiroId: usuarioId } },
    });
    return {
      role: "ENGENHEIRO",
      titulo: pendentes > 0 ? `${pendentes} tranche(s) aguardando validação` : "Nenhuma pendência",
      descricao: "Valide fases da obra para liberar as tranches.",
      href: "/dashboard/engenheiro/vistoria",
      concluido: pendentes === 0,
      progressoPct: pendentes === 0 ? 100 : 0,
    };
  }

  /** ADMIN vê o funil operacional inteiro — filas por etapa. */
  async paraAdmin(): Promise<JornadaResponse> {
    const cacheKey = "jornada:admin";
    const cached = await this.cache.get<JornadaResponse>(cacheKey);
    if (cached) return cached;

    const pendencias = await this.prisma.obra.count({
      where: { etapa: { in: ["KYC_PENDENTE", "DOSSIE_EM_ANALISE", "OBRA_CADASTRADA"] } },
    });

    const resposta: JornadaResponse = {
      role: "ADMIN",
      titulo: pendencias > 0 ? `${pendencias} obra(s) aguardando ação` : "Fila operacional limpa",
      descricao: "Centro de comando — filas de KYC, homologação e liberação.",
      href: "/dashboard/admin",
      concluido: pendencias === 0,
      progressoPct: pendencias === 0 ? 100 : 0,
    };
    await this.cache.set(cacheKey, resposta, CACHE_TTL_MS);
    return resposta;
  }

  private montarResposta(role: Role, etapa: EtapaFunil): JornadaResponse {
    const { titulo, descricao, href } = TITULOS[etapa];
    const indice = ORDEM.indexOf(etapa);
    return {
      role,
      etapaAtual: etapa,
      titulo,
      descricao,
      href,
      concluido: etapa === "QUITADO",
      progressoPct: Math.round(((indice + 1) / ORDEM.length) * 100),
    };
  }
}
