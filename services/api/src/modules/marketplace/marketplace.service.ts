import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { FornecedorTipo } from "@prisma/client";

@Injectable()
export class MarketplaceService {
  constructor(private readonly prisma: PrismaService) {}

  async listarFornecedores(filtros: {
    tipo?: FornecedorTipo;
    uf?: string;
    busca?: string;
    limit?: number;
    offset?: number;
  }) {
    const { tipo, uf, busca, limit = 20, offset = 0 } = filtros;

    const where: Record<string, unknown> = { ativo: true };
    if (tipo) where.tipo = tipo;
    if (uf) where.uf = uf.toUpperCase();
    if (busca) {
      where.OR = [
        { nome: { contains: busca, mode: "insensitive" } },
        { descricao: { contains: busca, mode: "insensitive" } },
        { cidade: { contains: busca, mode: "insensitive" } },
      ];
    }

    const [fornecedores, total] = await Promise.all([
      this.prisma.fornecedor.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: [{ avaliacaoMedia: "desc" }, { nome: "asc" }],
        select: {
          fornecedorId: true,
          nome: true,
          tipo: true,
          descricao: true,
          telefone: true,
          email: true,
          cidade: true,
          uf: true,
          avaliacaoMedia: true,
          totalAvaliacoes: true,
        },
      }),
      this.prisma.fornecedor.count({ where }),
    ]);

    return { fornecedores, total, limit, offset };
  }

  async obterFornecedor(fornecedorId: string) {
    const fornecedor = await this.prisma.fornecedor.findUnique({
      where: { fornecedorId, ativo: true },
      include: {
        avaliacoes: {
          orderBy: { criadoEm: "desc" },
          take: 10,
          select: {
            avaliacaoId: true,
            nota: true,
            comentario: true,
            criadoEm: true,
          },
        },
      },
    });
    if (!fornecedor) throw new NotFoundException("Fornecedor não encontrado");
    return fornecedor;
  }

  async avaliar(
    fornecedorId: string,
    usuarioId: string,
    nota: number,
    comentario?: string,
  ) {
    if (nota < 1 || nota > 5) throw new BadRequestException("Nota deve ser entre 1 e 5");

    const fornecedor = await this.prisma.fornecedor.findUnique({
      where: { fornecedorId, ativo: true },
    });
    if (!fornecedor) throw new NotFoundException("Fornecedor não encontrado");

    const jaAvaliou = await this.prisma.avaliacaoFornecedor.findUnique({
      where: { fornecedorId_usuarioId: { fornecedorId, usuarioId } },
    });
    if (jaAvaliou) throw new BadRequestException("Você já avaliou este fornecedor");

    await this.prisma.avaliacaoFornecedor.create({
      data: { fornecedorId, usuarioId, nota, comentario: comentario ?? null },
    });

    const [{ _avg }, totalAvaliacoes] = await Promise.all([
      this.prisma.avaliacaoFornecedor.aggregate({
        where: { fornecedorId },
        _avg: { nota: true },
      }),
      this.prisma.avaliacaoFornecedor.count({ where: { fornecedorId } }),
    ]);

    await this.prisma.fornecedor.update({
      where: { fornecedorId },
      data: {
        avaliacaoMedia: Number((_avg.nota ?? 0).toFixed(1)),
        totalAvaliacoes,
      },
    });

    return { ok: true };
  }

  async solicitarContato(fornecedorId: string, usuarioId: string) {
    const fornecedor = await this.prisma.fornecedor.findUnique({
      where: { fornecedorId, ativo: true },
      select: { nome: true, telefone: true, email: true },
    });
    if (!fornecedor) throw new NotFoundException("Fornecedor não encontrado");

    await this.prisma.notificacao.create({
      data: {
        usuarioId,
        tipo: "OBRA_CRIADA",
        titulo: "Contato solicitado",
        mensagem: `Seus dados de contato para "${fornecedor.nome}" foram disponibilizados.`,
        link: "/dashboard/marketplace",
      },
    });

    return {
      nome: fornecedor.nome,
      telefone: fornecedor.telefone,
      email: fornecedor.email,
    };
  }

  async criarFornecedor(data: {
    nome: string;
    tipo: FornecedorTipo;
    descricao?: string;
    website?: string;
    telefone?: string;
    email?: string;
    endereco?: string;
    uf?: string;
    cidade?: string;
    geoLatitude?: number;
    geoLongitude?: number;
  }) {
    return this.prisma.fornecedor.create({ data });
  }
}
