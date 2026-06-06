import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ParceirosService } from "../parceiros/parceiros.service";

const CATEGORIAS = [
  { id: "fundacao", nome: "Fundação e Terraplanagem", icone: "shovel" },
  { id: "estrutura", nome: "Estrutura e Concreto", icone: "building" },
  { id: "alvenaria", nome: "Alvenaria", icone: "layers" },
  { id: "cobertura", nome: "Cobertura e Telhamento", icone: "home" },
  { id: "eletrica", nome: "Instalações Elétricas", icone: "zap" },
  { id: "hidraulica", nome: "Instalações Hidráulicas", icone: "droplets" },
  { id: "revestimento", nome: "Revestimento e Pintura", icone: "paint-bucket" },
  { id: "acabamento", nome: "Acabamento e Marcenaria", icone: "hammer" },
  { id: "materiais", nome: "Materiais de Construção", icone: "package" },
  { id: "projetos", nome: "Projetos e Engenharia", icone: "file-text" },
];

@Injectable()
export class MarketplaceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly parceiros: ParceirosService
  ) {}

  listarCategorias() {
    return CATEGORIAS;
  }

  async listarParceirosAtivos(categoriaId?: string) {
    const resultado = await this.parceiros.listar({ kycStatus: "APROVADO", limit: 50 });
    return {
      categorias: categoriaId ? CATEGORIAS.filter((c) => c.id === categoriaId) : CATEGORIAS,
      parceiros: resultado.parceiros,
      total: resultado.total,
    };
  }

  async resumo() {
    const [totalParceiros, totalObras, totalCredito] = await Promise.all([
      this.prisma.usuario.count({ where: { tipo: "PARCEIRO", kycStatus: "APROVADO" } }),
      this.prisma.obra.count({ where: { status: "EM_EXECUCAO" } }),
      this.prisma.credito.aggregate({
        where: { status: "ATIVO" },
        _sum: { valorAprovado: true },
      }),
    ]);

    return {
      parceirosAtivos: totalParceiros,
      obrasEmAndamento: totalObras,
      volumeCreditoAtivo: totalCredito._sum.valorAprovado ?? 0,
      categorias: CATEGORIAS.length,
    };
  }
}
