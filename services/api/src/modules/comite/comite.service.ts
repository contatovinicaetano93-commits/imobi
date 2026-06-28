import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import type { Cache } from "cache-manager";
import type { ComiteDecisao, ComiteStatus, SolicitacaoStatus, UsuarioTipo, VotoDecisao } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { NotificacoesService } from "../notificacoes/notificacoes.service";
import { EmailService } from "../email/email.service";
import { PushNotificacoesService } from "../push-notificacoes/push-notificacoes.service";
import { invalidateJornadaCache } from "../jornada/jornada-cache";
import { JornadaService } from "../jornada/jornada.service";
import type { SolicitarComiteDto } from "./dto/comite.dto";

const TIPOS_VOTANTE: UsuarioTipo[] = ["ADMIN", "GESTOR", "GESTOR_FUNDO"];
const TIPOS_PARECER: UsuarioTipo[] = ["ENGENHEIRO", "GESTOR_OBRA"];
const ADMIN_OPS_EMAIL =
  process.env["ADMIN_OPS_EMAIL"]?.trim() || "contato.vinicaetano93@gmail.com";

@Injectable()
export class ComiteService {
  private readonly logger = new Logger(ComiteService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacoes: NotificacoesService,
    private readonly email: EmailService,
    private readonly pushNotificacoes: PushNotificacoesService,
    private readonly jornada: JornadaService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  // ── Construtor: submeter solicitação (fica PENDENTE até admin abrir comitê) ──

  async submeterSolicitacao(usuarioId: string, body: SolicitarComiteDto) {
    await this.jornada.assertPodeSolicitarCredito(usuarioId);
    const rating = this.calcularRating(body.ltv ?? 0);

    const solicitacao = await this.prisma.solicitacaoCredito.create({
      data: {
        usuarioId,
        obraId: body.obraId ?? null,
        valorSolicitado: body.valorSolicitado,
        prazoMeses: body.prazoMeses,
        taxaMensal: body.taxaMensal,
        finalidade: body.finalidade,
        garantias: body.garantias ?? null,
        observacoes: body.observacoes ?? null,
        vgv: body.vgv ?? null,
        custoObra: body.custoObra ?? null,
        ltv: body.ltv ?? null,
        ratingCalculado: rating,
        status: "PENDENTE",
      },
      include: { usuario: { select: { nome: true, email: true } } },
    });

    const admins = await this.listarAdmins();
    const valorFmt = this.formatarBRL(solicitacao.valorSolicitado);
    for (const admin of admins) {
      await this.notificacoes.criar(
        admin.usuarioId,
        "COMITE_DECISAO",
        "Nova solicitação de crédito",
        `${solicitacao.usuario.nome} solicitou ${valorFmt} — aguardando abertura de comitê.`,
        "/dashboard/admin/comite",
      );
    }

    await invalidateJornadaCache(this.cache, usuarioId);

    return solicitacao;
  }

  // ── Admin: listar solicitações ────────────────────────────────────────────

  async listarSolicitacoesAdmin(opts?: { status?: string; semComite?: boolean }) {
    const status = opts?.status as SolicitacaoStatus | undefined;
    return this.prisma.solicitacaoCredito.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(opts?.semComite ? { comite: null } : {}),
      },
      orderBy: { criadoEm: "desc" },
      include: {
        usuario: { select: { nome: true, email: true } },
        comite: { select: { comiteId: true, status: true } },
      },
    });
  }

  // ── Admin: iniciar comitê manualmente ─────────────────────────────────────

  async iniciarComite(solicitacaoId: string, adminId: string) {
    const solicitacao = await this.prisma.solicitacaoCredito.findUnique({
      where: { solicitacaoId },
      include: { comite: true, usuario: { select: { nome: true, email: true } } },
    });
    if (!solicitacao) throw new NotFoundException("Solicitação não encontrada");
    if (solicitacao.comite) throw new BadRequestException("Esta solicitação já possui comitê aberto");
    if (solicitacao.status !== "PENDENTE") {
      throw new BadRequestException(`Solicitação não está pendente (status: ${solicitacao.status})`);
    }

    const comite = await this.prisma.comiteDigital.create({
      data: { solicitacaoId, status: "ABERTO" },
    });

    await this.prisma.solicitacaoCredito.update({
      where: { solicitacaoId },
      data: { status: "EM_COMITE" },
    });

    const valorFmt = this.formatarBRL(solicitacao.valorSolicitado);
    const titulo = `Comitê aberto: ${valorFmt}`;
    const mensagem = `Proposta de ${solicitacao.usuario.nome} — ${solicitacao.finalidade}`;

    const votantes = await this.listarVotantes();
    for (const u of votantes) {
      await this.notificacoes.criar(
        u.usuarioId,
        "COMITE_DECISAO",
        titulo,
        `${mensagem}. Aguardando parecer técnico para votação.`,
        "/dashboard/admin/comite",
      );
      this.pushNotificacoes
        .enviarPush({
          usuarioId: u.usuarioId,
          titulo,
          mensagem,
          tipo: "COMITE_DECISAO",
          dados: { comiteId: comite.comiteId },
        })
        .catch(() => {});
    }

    const engenheiros = await this.listarEngenheiros();
    for (const eng of engenheiros) {
      await this.notificacoes.criar(
        eng.usuarioId,
        "PARECER_SOLICITADO",
        "Parecer técnico solicitado",
        `${mensagem}. Emita seu parecer para liberar a votação.`,
        "/dashboard/engenheiro/comite",
      );
      this.pushNotificacoes
        .enviarPush({
          usuarioId: eng.usuarioId,
          titulo: "Parecer técnico solicitado",
          mensagem,
          tipo: "PARECER_SOLICITADO",
          dados: { comiteId: comite.comiteId },
        })
        .catch(() => {});
    }

    this.logger.log(`Comitê ${comite.comiteId} iniciado por admin ${adminId} para solicitação ${solicitacaoId}`);

    return this.getDossie(comite.comiteId);
  }

  // ── Construtor: minhas solicitações ──────────────────────────────────────

  async minhasSolicitacoes(usuarioId: string) {
    return this.prisma.solicitacaoCredito.findMany({
      where: { usuarioId },
      orderBy: { criadoEm: "desc" },
      include: {
        comite: { include: { votos: { include: { votante: { select: { nome: true, tipo: true } } } } } },
      },
    });
  }

  // ── Engenheiro: submeter parecer ─────────────────────────────────────────

  async submeterParecer(comiteId: string, engId: string, parecerTecnico: string) {
    const comite = await this.prisma.comiteDigital.findUnique({
      where: { comiteId },
      include: { solicitacao: { include: { usuario: { select: { nome: true } } } } },
    });
    if (!comite) throw new NotFoundException("Comitê não encontrado");
    if (comite.status === "ENCERRADO") throw new BadRequestException("Comitê já encerrado");
    if (comite.parecerTecnico) throw new BadRequestException("Parecer já registrado");

    const updated = await this.prisma.comiteDigital.update({
      where: { comiteId },
      data: {
        parecerTecnico,
        parecerEngId: engId,
        parecerEm: new Date(),
        status: "EM_VOTACAO",
      },
    });

    const valorFmt = this.formatarBRL(comite.solicitacao.valorSolicitado);
    const titulo = "Comitê em votação";
    const mensagem = `Parecer registrado para proposta de ${comite.solicitacao.usuario.nome} (${valorFmt}). Registre seu voto.`;

    const votantes = await this.listarVotantes();
    for (const u of votantes) {
      await this.notificacoes.criar(
        u.usuarioId,
        "COMITE_DECISAO",
        titulo,
        mensagem,
        u.tipo === "ADMIN" ? "/dashboard/admin/comite" : "/dashboard/gestor/comite",
      );
      this.pushNotificacoes
        .enviarPush({
          usuarioId: u.usuarioId,
          titulo,
          mensagem,
          tipo: "COMITE_DECISAO",
          dados: { comiteId },
        })
        .catch(() => {});
    }

    return updated;
  }

  // ── Admin / Gestor / Gestor Fundo: votar ──────────────────────────────────

  async votar(
    comiteId: string,
    votanteId: string,
    voto: VotoDecisao,
    justificativa?: string,
    condicoes?: string,
  ) {
    const votante = await this.prisma.usuario.findUnique({ where: { usuarioId: votanteId } });
    if (!votante || !TIPOS_VOTANTE.includes(votante.tipo)) {
      throw new ForbiddenException("Apenas Admin, Gestor ou Gestor Fundo podem votar no comitê");
    }

    const comite = await this.prisma.comiteDigital.findUnique({
      where: { comiteId },
      include: { votos: true },
    });
    if (!comite) throw new NotFoundException("Comitê não encontrado");
    if (comite.status === "ENCERRADO") throw new BadRequestException("Comitê já encerrado");
    if (comite.status !== "EM_VOTACAO") {
      throw new BadRequestException("Comitê ainda não está em votação — aguardando parecer técnico");
    }

    const jaVotou = comite.votos.some((v) => v.votanteId === votanteId);
    if (jaVotou) throw new BadRequestException("Você já registrou seu voto neste comitê");

    await this.prisma.votoComite.create({
      data: {
        comiteId,
        votanteId,
        voto,
        justificativa: justificativa ?? null,
        condicoes: condicoes ?? null,
      },
    });

    const todosVotos = await this.prisma.votoComite.findMany({ where: { comiteId } });
    const voterCount = await this.prisma.usuario.count({
      where: { tipo: { in: TIPOS_VOTANTE }, bloqueadoEm: null },
    });
    const quorum = Math.max(1, Math.ceil(voterCount / 2));

    if (todosVotos.length >= quorum) {
      await this.encerrarComite(comiteId, todosVotos);
    }

    return { ok: true, totalVotos: todosVotos.length, quorum };
  }

  private async encerrarComite(comiteId: string, votos: { voto: VotoDecisao }[]) {
    const contagem = { APROVAR: 0, AJUSTAR: 0, REPROVAR: 0 };
    for (const v of votos) contagem[v.voto]++;

    let decisao: ComiteDecisao = "REPROVADO";
    if (contagem.APROVAR >= contagem.AJUSTAR && contagem.APROVAR >= contagem.REPROVAR) decisao = "APROVADO";
    else if (contagem.AJUSTAR >= contagem.REPROVAR) decisao = "AJUSTADO";

    const comite = await this.prisma.comiteDigital.update({
      where: { comiteId },
      data: { status: "ENCERRADO", decisao, decisaoEm: new Date() },
      include: {
        solicitacao: {
          include: { usuario: { select: { usuarioId: true, nome: true, email: true } } },
        },
      },
    });

    const novoStatus: SolicitacaoStatus =
      decisao === "APROVADO" ? "APROVADA" : decisao === "AJUSTADO" ? "AJUSTADA" : "REPROVADA";
    await this.prisma.solicitacaoCredito.update({
      where: { solicitacaoId: comite.solicitacaoId },
      data: { status: novoStatus },
    });

    if (decisao === "APROVADO") {
      const s = comite.solicitacao;
      await this.prisma.credito.create({
        data: {
          usuarioId: s.usuarioId,
          valorAprovado: s.valorSolicitado,
          valorLiberado: 0,
          taxaMensal: s.taxaMensal,
          prazoMeses: s.prazoMeses,
          status: "ATIVO",
          dataVencimento: new Date(Date.now() + s.prazoMeses * 30 * 24 * 60 * 60 * 1000),
        },
      });
      await invalidateJornadaCache(this.cache, s.usuarioId);
    }

    await this.notificarDecisaoComite(comite, decisao);
  }

  private async notificarDecisaoComite(
    comite: {
      comiteId: string;
      solicitacao: {
        valorSolicitado: number;
        finalidade: string;
        prazoMeses: number;
        usuario: { usuarioId: string; nome: string; email: string };
      };
    },
    decisao: ComiteDecisao,
  ) {
    const cliente = comite.solicitacao.usuario;
    const valorFmt = this.formatarBRL(comite.solicitacao.valorSolicitado);
    const decisaoLabel =
      decisao === "APROVADO" ? "Aprovado" : decisao === "AJUSTADO" ? "Aprovado com ajustes" : "Reprovado";

    await this.notificacoes.criar(
      cliente.usuarioId,
      "COMITE_DECISAO",
      `Comitê encerrado: ${decisaoLabel}`,
      `Sua solicitação de ${valorFmt} foi ${decisaoLabel.toLowerCase()} pelo comitê digital.`,
      "/dashboard/comite",
    );

    this.pushNotificacoes
      .enviarPush({
        usuarioId: cliente.usuarioId,
        titulo: `Comitê: ${decisaoLabel}`,
        mensagem: `Solicitação de ${valorFmt} — ${decisaoLabel}`,
        tipo: "COMITE_DECISAO",
        dados: { comiteId: comite.comiteId, decisao },
      })
      .catch(() => {});

    this.email
      .comiteDecisaoClienteEmail({
        nome: cliente.nome,
        email: cliente.email,
        valor: comite.solicitacao.valorSolicitado,
        finalidade: comite.solicitacao.finalidade,
        prazoMeses: comite.solicitacao.prazoMeses,
        decisao,
      })
      .catch((err: Error) => this.logger.warn(`Email cliente comitê falhou: ${err.message}`));

    this.email
      .comiteDecisaoAdminEmail({
        email: ADMIN_OPS_EMAIL,
        clienteNome: cliente.nome,
        clienteEmail: cliente.email,
        valor: comite.solicitacao.valorSolicitado,
        finalidade: comite.solicitacao.finalidade,
        decisao,
        comiteId: comite.comiteId,
      })
      .catch((err: Error) => this.logger.warn(`Email admin comitê falhou: ${err.message}`));
  }

  // ── Leitura ───────────────────────────────────────────────────────────────

  async getDossie(comiteId: string) {
    const comite = await this.prisma.comiteDigital.findUnique({
      where: { comiteId },
      include: {
        solicitacao: {
          include: {
            usuario: {
              select: {
                usuarioId: true,
                nome: true,
                email: true,
                telefone: true,
                kycStatus: true,
                tipo: true,
                criadoEm: true,
              },
            },
          },
        },
        votos: { include: { votante: { select: { nome: true, tipo: true } } } },
      },
    });
    if (!comite) throw new NotFoundException("Comitê não encontrado");
    return comite;
  }

  async listarComites(filtroStatus?: string) {
    return this.prisma.comiteDigital.findMany({
      where: filtroStatus ? { status: filtroStatus as ComiteStatus } : undefined,
      orderBy: { criadoEm: "desc" },
      include: {
        solicitacao: {
          include: { usuario: { select: { nome: true, email: true } } },
        },
        votos: {
          include: { votante: { select: { nome: true, tipo: true } } },
          orderBy: { criadoEm: "asc" },
        },
      },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async listarAdmins() {
    return this.prisma.usuario.findMany({
      where: { tipo: "ADMIN", bloqueadoEm: null },
      select: { usuarioId: true, nome: true, email: true },
    });
  }

  private async listarVotantes() {
    return this.prisma.usuario.findMany({
      where: { tipo: { in: TIPOS_VOTANTE }, bloqueadoEm: null },
      select: { usuarioId: true, nome: true, email: true, tipo: true },
    });
  }

  private async listarEngenheiros() {
    return this.prisma.usuario.findMany({
      where: { tipo: { in: TIPOS_PARECER }, bloqueadoEm: null },
      select: { usuarioId: true, nome: true, email: true },
    });
  }

  private formatarBRL(valor: number) {
    return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  private calcularRating(ltv: number): string {
    if (ltv <= 50) return "A";
    if (ltv <= 65) return "B";
    if (ltv <= 75) return "C";
    return "D";
  }
}
