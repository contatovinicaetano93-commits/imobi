import { Injectable, UnauthorizedException, ConflictException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import type { CadastroUsuarioInput, LoginInput } from "@imbobi/schemas";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService
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
    return this.gerarTokens(sessao.usuarioId);
  }

  async revogarToken(refreshToken: string) {
    await this.prisma.sessaoToken.updateMany({
      where: { refreshToken },
      data: { revogadoEm: new Date() },
    });
  }

  private async gerarTokens(usuarioId: string) {
    const accessToken = this.jwt.sign({ sub: usuarioId }, { expiresIn: "15m" });
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
