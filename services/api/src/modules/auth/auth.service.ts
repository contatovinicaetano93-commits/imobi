import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import * as crypto from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "../email/email.service";
import type { CadastroUsuarioInput, LoginInput } from "@imbobi/schemas";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly email: EmailService,
  ) {}

  /** Cadastro público — sempre CLIENTE. Admin/Fundo/Engenheiro só via UsuariosService.criar (admin-only). */
  async registrar(input: CadastroUsuarioInput) {
    const existe = await this.prisma.usuario.findUnique({ where: { email: input.email } });
    if (existe) throw new ConflictException("E-mail já cadastrado.");

    const senhaHash = await bcrypt.hash(input.senha, 12);
    const usuario = await this.prisma.usuario.create({
      data: { nome: input.nome, email: input.email, senhaHash, role: "CLIENTE" },
      select: { id: true, nome: true, email: true, role: true },
    });

    return { usuario, ...this.gerarTokens(usuario.id, usuario.role) };
  }

  async login(input: LoginInput) {
    const usuario = await this.prisma.usuario.findUnique({ where: { email: input.email } });
    if (!usuario) throw new UnauthorizedException("Credenciais inválidas.");

    const senhaOk = await bcrypt.compare(input.senha, usuario.senhaHash);
    if (!senhaOk) throw new UnauthorizedException("Credenciais inválidas.");
    if (!usuario.ativo) throw new UnauthorizedException("Conta desativada. Contate o administrador.");

    return {
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, role: usuario.role },
      ...this.gerarTokens(usuario.id, usuario.role),
    };
  }

  async renovarToken(refreshToken: string) {
    try {
      const payload = this.jwt.verify<{ sub: string; type: string }>(refreshToken);
      if (payload.type !== "refresh") throw new Error("tipo inválido");
      const usuario = await this.prisma.usuario.findUnique({ where: { id: payload.sub } });
      if (!usuario || !usuario.ativo) throw new UnauthorizedException("Sessão inválida.");
      return this.gerarTokens(usuario.id, usuario.role);
    } catch {
      throw new UnauthorizedException("Token de atualização inválido ou expirado.");
    }
  }

  async esqueceuSenha(emailInput: string) {
    const usuario = await this.prisma.usuario.findUnique({ where: { email: emailInput } });
    if (!usuario) return { message: "Se o email estiver cadastrado, você receberá um link em breve." };

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: { resetToken: hashedToken, resetTokenExpiraEm: new Date(Date.now() + 60 * 60 * 1000) },
    });

    await this.email.recuperacaoSenhaEmail(usuario.nome, usuario.email, rawToken);
    return { message: "Se o email estiver cadastrado, você receberá um link em breve." };
  }

  async redefinirSenha(token: string, novaSenha: string) {
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const usuario = await this.prisma.usuario.findFirst({
      where: { resetToken: hashedToken, resetTokenExpiraEm: { gt: new Date() } },
    });
    if (!usuario) throw new BadRequestException("Link inválido ou expirado.");

    const senhaHash = await bcrypt.hash(novaSenha, 12);
    await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: { senhaHash, resetToken: null, resetTokenExpiraEm: null },
    });
    return { message: "Senha redefinida com sucesso." };
  }

  private gerarTokens(usuarioId: string, role: string) {
    const accessToken = this.jwt.sign({ sub: usuarioId, role }, { expiresIn: "8h" });
    const refreshToken = this.jwt.sign({ sub: usuarioId, type: "refresh" }, { expiresIn: "7d" });
    return { accessToken, refreshToken };
  }
}
