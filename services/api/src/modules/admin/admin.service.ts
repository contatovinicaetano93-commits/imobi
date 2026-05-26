import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotificacoesService } from "../notificacoes/notificacoes.service";
import { EmailService } from "../email/email.service";

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacoes: NotificacoesService,
    private readonly email: EmailService
  ) {}

  async obterStats() {
    const [
      totalUsuarios,
      usuariosPorTipo,
      totalObras,
      obrasPorStatus,
      totalCreditos,
      creditosPorStatus,
      kycPendentes,
      liberacoesPendentes,
    ] = await Promise.all([
      this.prisma.usuario.count(),
      this.prisma.usuario.groupBy({
        by: ["tipo"],
        _count: true,
      }),
      this.prisma.obra.count(),
      this.prisma.obra.groupBy({
        by: ["status"],
        _count: true,
      }),
      this.prisma.credito.count(),
      this.prisma.credito.groupBy({
        by: ["status"],
        _count: true,
      }),
      this.prisma.usuario.count({
        where: { kycStatus: { in: ["PENDENTE", "EM_VERIFICACAO"] } },
      }),
      this.prisma.liberacaoParcela.count({
        where: { status: "PENDENTE" },
      }),
    ]);

    return {
      usuarios: {
        total: totalUsuarios,
        porTipo: usuariosPorTipo.reduce(
          (acc, { tipo, _count }) => {
            acc[tipo] = _count;
            return acc;
          },
          {} as Record<string, number>
        ),
      },
      obras: {
        total: totalObras,
        porStatus: obrasPorStatus.reduce(
          (acc, { status, _count }) => {
            acc[status] = _count;
            return acc;
          },
          {} as Record<string, number>
        ),
      },
      creditos: {
        total: totalCreditos,
        porStatus: creditosPorStatus.reduce(
          (acc, { status, _count }) => {
            acc[status] = _count;
            return acc;
          },
          {} as Record<string, number>
        ),
      },
      kyc: {
        pendentes: kycPendentes,
      },
      liberacoes: {
        pendentes: liberacoesPendentes,
      },
    };
  }

  async listarKycPendentes(skip = 0, take = 20) {
    const documentos = await this.prisma.kycDocumento.findMany({
      where: { status: "PENDENTE" },
      include: { usuario: { select: { usuarioId: true, nome: true, email: true, cpf: true } } },
      skip,
      take,
      orderBy: { criadoEm: "asc" },
    });

    const total = await this.prisma.kycDocumento.count({
      where: { status: "PENDENTE" },
    });

    return { documentos, total, pagina: Math.floor(skip / take) + 1 };
  }

  async aprovarKyc(usuarioId: string, motivo?: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { usuarioId },
      select: { usuarioId: true, nome: true, email: true, kycStatus: true },
    });

    if (!usuario) throw new BadRequestException("Usuário não encontrado");
    if (usuario.kycStatus === "APROVADO") {
      throw new BadRequestException("KYC já foi aprovado para este usuário");
    }

    await this.prisma.$transaction(async (tx) => {
      // Atualiza status KYC do usuário
      await tx.usuario.update({
        where: { usuarioId },
        data: { kycStatus: "APROVADO", atualizadoEm: new Date() },
      });

      // Atualiza todos os documentos para APROVADO
      await tx.kycDocumento.updateMany({
        where: { usuarioId },
        data: { status: "APROVADO", analisadoEm: new Date() },
      });
    });

    // Notifica via email e in-app
    await this.email
      .kycAprovadoEmail(usuario.nome, usuario.email)
      .catch((e) => console.error("Erro ao enviar email KYC aprovado:", e));

    await this.notificacoes.criar(
      usuarioId,
      "KYC_APROVADO",
      "Verificação de Identidade Aprovada",
      "Sua verificação de identidade foi aprovada com sucesso! Agora você pode acessar todas as funcionalidades da plataforma."
    );
  }

  async rejeitarKyc(usuarioId: string, motivo: string) {
    if (!motivo || motivo.trim().length === 0) {
      throw new BadRequestException("Motivo da rejeição é obrigatório");
    }

    const usuario = await this.prisma.usuario.findUnique({
      where: { usuarioId },
      select: { usuarioId: true, nome: true, email: true, kycStatus: true },
    });

    if (!usuario) throw new BadRequestException("Usuário não encontrado");
    if (usuario.kycStatus === "REJEITADO") {
      throw new BadRequestException("KYC já foi rejeitado para este usuário");
    }

    await this.prisma.$transaction(async (tx) => {
      // Atualiza status KYC do usuário
      await tx.usuario.update({
        where: { usuarioId },
        data: { kycStatus: "REJEITADO", atualizadoEm: new Date() },
      });

      // Marca documentos como rejeitados
      await tx.kycDocumento.updateMany({
        where: { usuarioId },
        data: {
          status: "REJEITADO",
          motivo_rejeicao: motivo,
          analisadoEm: new Date(),
        },
      });
    });

    // Notifica via email e in-app
    await this.email
      .kycRejeitadoEmail(usuario.nome, usuario.email, motivo)
      .catch((e) => console.error("Erro ao enviar email KYC rejeitado:", e));

    await this.notificacoes.criar(
      usuarioId,
      "KYC_REJEITADO",
      "Verificação de Identidade Rejeitada",
      `Sua verificação de identidade foi rejeitada. Motivo: ${motivo}. Por favor, corrija os documentos e tente novamente.`
    );
  }
}
