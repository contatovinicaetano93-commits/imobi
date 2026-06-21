import { Injectable, UnauthorizedException, ConflictException, BadRequestException, Inject } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import * as crypto from "crypto";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import type { Cache } from "cache-manager";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "../email/email.service";
import { TotpService } from "../totp/totp.service";
import type { CadastroUsuarioInput, LoginInput } from "@imbobi/schemas";
import { normalizeUserRole } from "../../common/constants/manager-roles";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly email: EmailService,
    private readonly totp: TotpService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async registrar(input: CadastroUsuarioInput, meta?: { ip?: string; ua?: string }) {
    const existe = await this.prisma.usuario.findFirst({
      where: { OR: [{ email: input.email }, { cpf: input.cpf }] },
    });
    if (existe) throw new ConflictException("E-mail ou CPF já cadastrado.");

    const passwordHash = await bcrypt.hash(input.senha, 12);
    const usuario = await this.prisma.usuario.create({
      data: {
        nome: input.nome,
        email: input.email,
        cpf: input.cpf,
        telefone: input.telefone,
        passwordHash,
        consentidoTermos: input.consentidoTermos,
        consentidoPrivacy: input.consentidoPrivacy,
        consentidoKyc: input.consentidoKyc,
        consentidoMarketing: input.consentidoMarketing ?? false,
        consentidoEm: new Date(),
      },
      select: {
        usuarioId: true, nome: true, email: true, tipo: true, kycStatus: true,
        funcoesBloqueadas: true, bloqueadoEm: true,
      },
    });

    return { usuario, ...await this.gerarTokens(usuario.usuarioId, usuario, meta) };
  }

  async login(input: LoginInput, meta?: { ip?: string; ua?: string }) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { email: input.email },
    });
    if (!usuario) throw new UnauthorizedException("Credenciais inválidas.");

    const senhaOk = await bcrypt.compare(input.senha, usuario.passwordHash);
    if (!senhaOk) throw new UnauthorizedException("Credenciais inválidas.");

    if (usuario.bloqueadoEm) {
      throw new UnauthorizedException("Conta bloqueada pelo administrador. Entre em contato com o suporte.");
    }

    // Se o usuário tem TOTP ativo, solicita o código antes de emitir tokens
    const totpAtivo = await this.totp.estaAtivo(usuario.usuarioId);
    if (totpAtivo) {
      if (!input.totpCode) {
        return { requiresTotp: true, usuarioId: usuario.usuarioId };
      }
      const totpOk = await this.totp.verificar(usuario.usuarioId, input.totpCode);
      if (!totpOk) throw new UnauthorizedException("Código TOTP inválido.");
    }

    return {
      usuario: {
        usuarioId: usuario.usuarioId,
        nome: usuario.nome,
        email: usuario.email,
        tipo: normalizeUserRole(usuario.tipo) ?? usuario.tipo,
      },
      ...await this.gerarTokens(usuario.usuarioId, usuario, meta),
    };
  }

  async renovarToken(refreshToken: string) {
    if (!refreshToken) throw new UnauthorizedException("Token de atualização não fornecido.");
    const sessao = await this.prisma.sessaoToken.findUnique({
      where: { refreshToken },
    });
    if (!sessao || sessao.revogadoEm || sessao.expiresAt < new Date()) {
      throw new UnauthorizedException("Sessão inválida ou expirada.");
    }
    const usuario = await this.prisma.usuario.findUnique({
      where: { usuarioId: sessao.usuarioId },
      select: { bloqueadoEm: true },
    });
    if (!usuario || usuario.bloqueadoEm) {
      throw new UnauthorizedException("Conta bloqueada pelo administrador. Entre em contato com o suporte.");
    }
    await this.prisma.sessaoToken.update({
      where: { sessionId: sessao.sessionId },
      data: { revogadoEm: new Date() },
    });
    return await this.gerarTokens(sessao.usuarioId);
  }

  async listarSessoes(usuarioId: string) {
    return this.prisma.sessaoToken.findMany({
      where: { usuarioId, revogadoEm: null, expiresAt: { gt: new Date() } },
      select: { sessionId: true, criadoEm: true, expiresAt: true, ipAddress: true, userAgent: true },
      orderBy: { criadoEm: "desc" },
      take: 20,
    });
  }

  async revogarSessao(usuarioId: string, sessionId: string) {
    const result = await this.prisma.sessaoToken.updateMany({
      where: { sessionId, usuarioId, revogadoEm: null },
      data: { revogadoEm: new Date() },
    });
    if (result.count === 0) throw new UnauthorizedException("Sessão não encontrada.");
    return { ok: true };
  }

  async revogarToken(refreshToken: string, accessToken?: string) {
    await this.prisma.sessaoToken.updateMany({
      where: { refreshToken },
      data: { revogadoEm: new Date() },
    });

    // Blacklist the access token jti so it can't be reused until natural expiry
    if (accessToken) {
      try {
        const decoded = this.jwt.decode(accessToken) as { jti?: string; exp?: number } | null;
        if (decoded?.jti && decoded?.exp) {
          const ttlMs = decoded.exp * 1000 - Date.now();
          if (ttlMs > 0) {
            await this.cache.set(`blacklist:${decoded.jti}`, '1', ttlMs);
          }
        }
      } catch { /* ignore */ }
    }
  }

  async esqueceuSenha(emailInput: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { email: emailInput },
    });

    if (!usuario) {
      return { message: "Se o email estiver cadastrado, você receberá um link em breve" };
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    await this.prisma.usuario.update({
      where: { usuarioId: usuario.usuarioId },
      data: {
        passwordResetToken: hashedToken,
        passwordResetExpires: expires,
      },
    });

    await this.email.recuperacaoSenhaEmail(usuario.nome, usuario.email, rawToken);

    return { message: "Se o email estiver cadastrado, você receberá um link em breve" };
  }

  async redefinirSenha(token: string, novaSenha: string) {
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const usuario = await this.prisma.usuario.findFirst({
      where: {
        passwordResetToken: hashedToken,
        passwordResetExpires: { gt: new Date() },
      },
    });

    if (!usuario) {
      throw new BadRequestException("Link inválido ou expirado");
    }

    const passwordHash = await bcrypt.hash(novaSenha, 12);

    await this.prisma.usuario.update({
      where: { usuarioId: usuario.usuarioId },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    return { message: "Senha redefinida com sucesso" };
  }

  private async gerarTokens(
    usuarioId: string,
    cached?: { tipo?: string; nome?: string | null; email?: string; funcoesBloqueadas?: string[]; bloqueadoEm?: Date | null },
    meta?: { ip?: string; ua?: string },
  ) {
    const usuario = cached ?? await this.prisma.usuario.findUnique({
      where: { usuarioId },
      select: { tipo: true, nome: true, email: true, funcoesBloqueadas: true, bloqueadoEm: true },
    });
    const jti = crypto.randomUUID();
    const accessToken = this.jwt.sign(
      {
        sub: usuarioId,
        jti,
        role: normalizeUserRole(usuario?.tipo ?? null),
        nome: usuario?.nome ?? null,
        email: usuario?.email ?? null,
        funcoesBloqueadas: usuario?.funcoesBloqueadas ?? [],
        bloqueado: !!usuario?.bloqueadoEm,
      },
      { expiresIn: process.env["JWT_EXPIRES_IN"] ?? "15m" }
    );
    const refreshToken = this.jwt.sign(
      { sub: usuarioId, type: "refresh" },
      { expiresIn: process.env["JWT_REFRESH_EXPIRES_IN"] ?? "7d" },
    );

    // Evict oldest sessions if user exceeds 10 concurrent active sessions
    const MAX_SESSIONS = 10;
    const activeSessions = await this.prisma.sessaoToken.findMany({
      where: { usuarioId, revogadoEm: null, expiresAt: { gt: new Date() } },
      orderBy: { criadoEm: "asc" },
      select: { sessionId: true },
    });
    if (activeSessions.length >= MAX_SESSIONS) {
      const toRevoke = activeSessions.slice(0, activeSessions.length - MAX_SESSIONS + 1);
      await this.prisma.sessaoToken.updateMany({
        where: { sessionId: { in: toRevoke.map((s) => s.sessionId) } },
        data: { revogadoEm: new Date() },
      });
    }

    await this.prisma.sessaoToken.create({
      data: {
        usuarioId,
        refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        ipAddress: meta?.ip ?? null,
        userAgent: meta?.ua ? meta.ua.slice(0, 255) : null,
      },
    });

    return { accessToken, refreshToken };
  }
}
