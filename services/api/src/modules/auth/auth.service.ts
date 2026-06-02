import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import { EncryptionService } from "../../common/encryption.service";
import { setUserContext } from "../../common/sentry.init";
import type { CadastroUsuarioInput, LoginInput } from "@imbobi/schemas";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly encryption: EncryptionService,
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
      select: {
        usuarioId: true,
        nome: true,
        email: true,
        tipo: true,
        kycStatus: true,
      },
    });

    return { usuario, ...this.gerarTokens(usuario.usuarioId) };
  }

  async login(input: LoginInput) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { email: input.email },
    });
    if (!usuario) throw new UnauthorizedException("Credenciais inválidas.");

    const senhaOk = await bcrypt.compare(input.senha, usuario.passwordHash);
    if (!senhaOk) throw new UnauthorizedException("Credenciais inválidas.");

    // Set Sentry user context for error tracking
    setUserContext(usuario.usuarioId, {
      email: usuario.email,
      nome: usuario.nome,
    });

    return {
      usuario: {
        usuarioId: usuario.usuarioId,
        nome: usuario.nome,
        email: usuario.email,
        tipo: usuario.tipo,
      },
      ...this.gerarTokens(usuario.usuarioId),
    };
  }

  async renovarToken(refreshToken: string) {
    let decoded: any;
    try {
      decoded = this.jwt.verify(refreshToken) as any;
    } catch (error) {
      throw new UnauthorizedException("Token inválido ou expirado.");
    }
    if (!decoded?.sub) {
      throw new UnauthorizedException("Token inválido.");
    }

    return this.prisma.$transaction(async (tx) => {
      const sessao = await tx.sessaoToken.findFirst({
        where: { usuarioId: decoded.sub },
        orderBy: { criadoEm: "desc" },
      });
      if (!sessao || sessao.revogadoEm || sessao.expiresAt < new Date()) {
        throw new UnauthorizedException("Sessão inválida ou expirada.");
      }

      let decryptedToken: string;
      try {
        decryptedToken = this.encryption.decrypt(sessao.refreshToken);
      } catch (error) {
        throw new UnauthorizedException(
          "Sessão inválida: token corrompido ou tamperado.",
        );
      }
      if (decryptedToken !== refreshToken) {
        throw new UnauthorizedException("Token não corresponde.");
      }

      await tx.sessaoToken.update({
        where: { sessionId: sessao.sessionId },
        data: { revogadoEm: new Date() },
      });

      const newAccessToken = this.jwt.sign({ sub: sessao.usuarioId }, { expiresIn: "15m" });
      const newRefreshToken = this.jwt.sign(
        { sub: sessao.usuarioId, type: "refresh" },
        { expiresIn: "7d" },
      );
      const encryptedToken = this.encryption.encrypt(newRefreshToken);

      await tx.sessaoToken.create({
        data: {
          usuarioId: sessao.usuarioId,
          refreshToken: encryptedToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      return { accessToken: newAccessToken, refreshToken: newRefreshToken };
    });
  }

  async revogarToken(refreshToken: string) {
    const decoded = this.jwt.decode(refreshToken) as any;
    if (!decoded?.sub) return;

    await this.prisma.sessaoToken.updateMany({
      where: { usuarioId: decoded.sub },
      data: { revogadoEm: new Date() },
    });
  }

  private gerarTokens(usuarioId: string) {
    const accessToken = this.jwt.sign({ sub: usuarioId }, { expiresIn: "15m" });
    const refreshToken = this.jwt.sign(
      { sub: usuarioId, type: "refresh" },
      { expiresIn: "7d" },
    );
    const encryptedToken = this.encryption.encrypt(refreshToken);

    void this.prisma.sessaoToken.create({
      data: {
        usuarioId,
        refreshToken: encryptedToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken };
  }
}
