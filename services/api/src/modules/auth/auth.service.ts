import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import * as crypto from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "../email/email.service";
import type { CadastroUsuarioInput, LoginInput } from "@imbobi/schemas";
import { normalizeUserRole } from "../../common/constants/manager-roles";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly email: EmailService
  ) {}

  async registrar(input: CadastroUsuarioInput) {
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

    return { usuario, ...await this.gerarTokens(usuario.usuarioId, usuario) };
  }

  async login(input: LoginInput) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { email: input.email },
    });
    if (!usuario) throw new UnauthorizedException("Credenciais inválidas.");

    const senhaOk = await bcrypt.compare(input.senha, usuario.passwordHash);
    if (!senhaOk) throw new UnauthorizedException("Credenciais inválidas.");

    if (usuario.bloqueadoEm) {
      throw new UnauthorizedException("Conta bloqueada pelo administrador. Entre em contato com o suporte.");
    }

    return {
      usuario: {
        usuarioId: usuario.usuarioId,
        nome: usuario.nome,
        email: usuario.email,
        tipo: normalizeUserRole(usuario.tipo) ?? usuario.tipo,
      },
      ...await this.gerarTokens(usuario.usuarioId, usuario),
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

  async revogarToken(refreshToken: string) {
    await this.prisma.sessaoToken.updateMany({
      where: { refreshToken },
      data: { revogadoEm: new Date() },
    });
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
  ) {
    const usuario = cached ?? await this.prisma.usuario.findUnique({
      where: { usuarioId },
      select: { tipo: true, nome: true, email: true, funcoesBloqueadas: true, bloqueadoEm: true },
    });
    const accessToken = this.jwt.sign(
      {
        sub: usuarioId,
        role: normalizeUserRole(usuario?.tipo ?? null),
        nome: usuario?.nome ?? null,
        email: usuario?.email ?? null,
        funcoesBloqueadas: usuario?.funcoesBloqueadas ?? [],
        bloqueado: !!usuario?.bloqueadoEm,
      },
      { expiresIn: "8h" }
    );
    const refreshToken = this.jwt.sign({ sub: usuarioId, type: "refresh" }, { expiresIn: "7d" });

    await this.prisma.sessaoToken.create({
      data: {
        usuarioId,
        refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken };
  }
}
