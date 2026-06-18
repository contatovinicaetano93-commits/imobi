import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import * as crypto from "crypto";
import * as speakeasy from "speakeasy";
import * as QRCode from "qrcode";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "../email/email.service";
import type { CadastroUsuarioInput, LoginInput } from "@imbobi/schemas";

const APP_NAME = "Imobi";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly email: EmailService,
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
    if (!usuario) throw new UnauthorizedException("Credenciais inválidas.");

    const senhaOk = await bcrypt.compare(input.senha, usuario.passwordHash);
    if (!senhaOk) throw new UnauthorizedException("Credenciais inválidas.");

    if (usuario.bloqueadoEm) {
      throw new UnauthorizedException("Conta bloqueada. Entre em contato com o suporte.");
    }

    // Se 2FA ativo, retorna token temporário para o segundo passo
    if (usuario.totpAtivo && usuario.totpSecret) {
      const tempToken = this.jwt.sign(
        { sub: usuario.usuarioId, type: "2fa-pending" },
        { expiresIn: "5m" },
      );
      return {
        requires2fa: true,
        tempToken,
        usuario: { nome: usuario.nome, email: usuario.email },
      };
    }

    return {
      requires2fa: false,
      usuario: {
        usuarioId: usuario.usuarioId,
        nome: usuario.nome,
        email: usuario.email,
        tipo: usuario.tipo,
      },
      ...await this.gerarTokens(usuario.usuarioId),
    };
  }

  // ── 2FA TOTP ──────────────────────────────────────────────────────────────

  async iniciar2fa(usuarioId: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { usuarioId },
      select: { email: true, totpAtivo: true },
    });
    if (!usuario) throw new UnauthorizedException();
    if (usuario.totpAtivo) {
      throw new BadRequestException("2FA já está ativo. Desative primeiro para reconfigurar.");
    }

    const secret = speakeasy.generateSecret({
      name: `${APP_NAME} (${usuario.email})`,
      length: 20,
    });

    // Salva segredo pendente (não confirmado ainda)
    await this.prisma.usuario.update({
      where: { usuarioId },
      data: { totpPendingSecret: secret.base32 },
    });

    const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url!);

    return {
      secret: secret.base32,
      otpauthUrl: secret.otpauth_url,
      qrCodeDataUrl,
      instrucoes: "Escaneie o QR Code com Google Authenticator, Authy ou similar. Em seguida, confirme com o código gerado.",
    };
  }

  async confirmar2fa(usuarioId: string, totpCode: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { usuarioId },
      select: { totpPendingSecret: true, totpAtivo: true },
    });
    if (!usuario?.totpPendingSecret) {
      throw new BadRequestException("Nenhuma configuração de 2FA pendente. Inicie o processo novamente.");
    }

    const valido = speakeasy.totp.verify({
      secret: usuario.totpPendingSecret,
      encoding: "base32",
      token: totpCode,
      window: 1,
    });

    if (!valido) {
      throw new UnauthorizedException("Código 2FA inválido. Verifique seu app autenticador.");
    }

    await this.prisma.usuario.update({
      where: { usuarioId },
      data: {
        totpSecret: usuario.totpPendingSecret,
        totpPendingSecret: null,
        totpAtivo: true,
      },
    });

    return { ok: true, mensagem: "2FA ativado com sucesso. Guarde o código secreto em local seguro." };
  }

  async verificar2faLogin(tempToken: string, totpCode: string) {
    let payload: { sub: string; type: string };
    try {
      payload = this.jwt.verify(tempToken) as { sub: string; type: string };
    } catch {
      throw new UnauthorizedException("Token temporário inválido ou expirado.");
    }

    if (payload.type !== "2fa-pending") {
      throw new UnauthorizedException("Token inválido.");
    }

    const usuario = await this.prisma.usuario.findUnique({
      where: { usuarioId: payload.sub },
      select: { totpSecret: true, totpAtivo: true, bloqueadoEm: true, nome: true, email: true, tipo: true },
    });

    if (!usuario || !usuario.totpAtivo || !usuario.totpSecret) {
      throw new UnauthorizedException("2FA não está configurado.");
    }
    if (usuario.bloqueadoEm) {
      throw new UnauthorizedException("Conta bloqueada. Entre em contato com o suporte.");
    }

    const valido = speakeasy.totp.verify({
      secret: usuario.totpSecret,
      encoding: "base32",
      token: totpCode,
      window: 1,
    });

    if (!valido) {
      throw new UnauthorizedException("Código 2FA inválido.");
    }

    return {
      requires2fa: false,
      usuario: {
        usuarioId: payload.sub,
        nome: usuario.nome,
        email: usuario.email,
        tipo: usuario.tipo,
      },
      ...await this.gerarTokens(payload.sub),
    };
  }

  async desativar2fa(usuarioId: string, totpCode: string, senha: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { usuarioId },
      select: { totpSecret: true, totpAtivo: true, passwordHash: true },
    });

    if (!usuario?.totpAtivo || !usuario.totpSecret) {
      throw new BadRequestException("2FA não está ativo.");
    }

    const senhaOk = await bcrypt.compare(senha, usuario.passwordHash);
    if (!senhaOk) throw new UnauthorizedException("Senha incorreta.");

    const valido = speakeasy.totp.verify({
      secret: usuario.totpSecret,
      encoding: "base32",
      token: totpCode,
      window: 1,
    });
    if (!valido) throw new UnauthorizedException("Código 2FA inválido.");

    await this.prisma.usuario.update({
      where: { usuarioId },
      data: { totpSecret: null, totpPendingSecret: null, totpAtivo: false },
    });

    return { ok: true, mensagem: "2FA desativado com sucesso." };
  }

  // ── Recuperação de senha ───────────────────────────────────────────────────

  async renovarToken(refreshToken: string) {
    if (!refreshToken) throw new UnauthorizedException("Token de atualização não fornecido.");
    const sessao = await this.prisma.sessaoToken.findUnique({ where: { refreshToken } });
    if (!sessao || sessao.revogadoEm || sessao.expiresAt < new Date()) {
      throw new UnauthorizedException("Sessão inválida ou expirada.");
    }
    const usuario = await this.prisma.usuario.findUnique({
      where: { usuarioId: sessao.usuarioId },
      select: { bloqueadoEm: true },
    });
    if (!usuario || usuario.bloqueadoEm) {
      throw new UnauthorizedException("Conta bloqueada.");
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
    const usuario = await this.prisma.usuario.findUnique({ where: { email: emailInput } });
    if (!usuario) return { message: "Se o email estiver cadastrado, você receberá um link em breve" };

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    await this.prisma.usuario.update({
      where: { usuarioId: usuario.usuarioId },
      data: { passwordResetToken: hashedToken, passwordResetExpires: expires },
    });

    await this.email.recuperacaoSenhaEmail(usuario.nome, usuario.email, rawToken);
    return { message: "Se o email estiver cadastrado, você receberá um link em breve" };
  }

  async redefinirSenha(token: string, novaSenha: string) {
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const usuario = await this.prisma.usuario.findFirst({
      where: { passwordResetToken: hashedToken, passwordResetExpires: { gt: new Date() } },
    });
    if (!usuario) throw new BadRequestException("Link inválido ou expirado");

    const passwordHash = await bcrypt.hash(novaSenha, 12);
    await this.prisma.usuario.update({
      where: { usuarioId: usuario.usuarioId },
      data: { passwordHash, passwordResetToken: null, passwordResetExpires: null },
    });

    return { message: "Senha redefinida com sucesso" };
  }

  private async gerarTokens(usuarioId: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { usuarioId },
      select: { tipo: true, nome: true, email: true, funcoesBloqueadas: true, bloqueadoEm: true },
    });
    const accessToken = this.jwt.sign(
      {
        sub: usuarioId,
        role: usuario?.tipo ?? null,
        nome: usuario?.nome ?? null,
        email: usuario?.email ?? null,
        funcoesBloqueadas: usuario?.funcoesBloqueadas ?? [],
        bloqueado: !!usuario?.bloqueadoEm,
      },
      { expiresIn: "8h" },
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
