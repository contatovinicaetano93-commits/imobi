import { Injectable, UnauthorizedException, ConflictException, BadRequestException, Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import * as crypto from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "../email/email.service";
import type { CadastroUsuarioInput, LoginInput } from "@imbobi/schemas";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

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
      },
      select: { usuarioId: true, nome: true, email: true, tipo: true, kycStatus: true },
    });

    return { usuario, ...await this.gerarTokens(usuario.usuarioId) };
  }

  async login(input: LoginInput) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { email: input.email },
    });

    // Always run bcrypt.compare even when user doesn't exist to prevent user enumeration
    // via timing differences (constant-time response regardless of whether email is registered).
    const senhaOk = usuario
      ? await bcrypt.compare(input.senha, usuario.passwordHash)
      : await bcrypt.compare(input.senha, "$2a$12$dummyhashusedtoensureconstanttime.....invalid");

    if (!usuario || usuario.deletadoEm || !senhaOk) throw new UnauthorizedException("Credenciais inválidas.");

    return {
      usuario: { usuarioId: usuario.usuarioId, nome: usuario.nome, email: usuario.email, tipo: usuario.tipo },
      ...await this.gerarTokens(usuario.usuarioId),
    };
  }

  async renovarToken(refreshToken: string) {
    const sessao = await this.prisma.sessaoToken.findUnique({
      where: { refreshToken },
    });
    if (!sessao || sessao.revogadoEm || sessao.expiresAt < new Date()) {
      throw new UnauthorizedException("Sessão inválida ou expirada.");
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

    // Invalidate all existing sessions so any compromised sessions are revoked
    // after the user resets their password.
    await this.prisma.sessaoToken.deleteMany({
      where: { usuarioId: usuario.usuarioId },
    });

    return { message: "Senha redefinida com sucesso" };
  }

  private async gerarTokens(usuarioId: string) {
    const accessToken = this.jwt.sign({ sub: usuarioId }, { expiresIn: "15m" });
    const refreshToken = this.jwt.sign({ sub: usuarioId, type: "refresh" }, { expiresIn: "7d" });

    try {
      await this.prisma.sessaoToken.create({
        data: {
          usuarioId,
          refreshToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
    } catch (e) {
      this.logger.error(`Failed to persist session token for user ${usuarioId}: ${e}`);
    }

    return { accessToken, refreshToken };
  }
}
