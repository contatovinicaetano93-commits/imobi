import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CacheService } from "../cache/cache.service";
import { CpfEncryptionService } from "../encryption/cpf-encryption.service";
import { PhoneEncryptionService } from "../encryption/phone-encryption.service";

@Injectable()
export class UsuariosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
    private readonly cpfEncryption: CpfEncryptionService,
    private readonly phoneEncryption: PhoneEncryptionService,
  ) {}

  async buscarPerfil(usuarioId: string) {
    return this.cacheService.obterPerfilComCache(usuarioId, async () => {
      const usuario = await this.prisma.usuario.findUnique({
        where: { usuarioId },
        select: {
          usuarioId: true,
          nome: true,
          cpf: true,
          email: true,
          telefone: true,
          tipo: true,
          kycStatus: true,
          criadoEm: true,
          atualizadoEm: true,
        },
      });

      // Decrypt sensitive fields
      if (usuario) {
        try {
          usuario.cpf = this.cpfEncryption.decrypt(usuario.cpf);
          usuario.telefone = this.phoneEncryption.decrypt(usuario.telefone);
        } catch (error) {
          // Log decryption failure but don't expose to client
          console.error(`Failed to decrypt user data for ${usuarioId}:`, error);
          // Return user without decrypted fields to prevent exposure
          usuario.cpf = "[ENCRYPTED]";
          usuario.telefone = "[ENCRYPTED]";
        }
      }

      return usuario;
    });
  }

  async atualizarPerfil(usuarioId: string, data: { nome?: string; telefone?: string }) {
    // Encrypt telefone if provided
    const dataToUpdate = { ...data };
    if (data.telefone) {
      dataToUpdate.telefone = this.phoneEncryption.encrypt(data.telefone);
    }

    const resultado = await this.prisma.usuario.update({
      where: { usuarioId },
      data: { ...dataToUpdate, atualizadoEm: new Date() },
      select: {
        usuarioId: true,
        nome: true,
        cpf: true,
        email: true,
        telefone: true,
        tipo: true,
        kycStatus: true,
        criadoEm: true,
        atualizadoEm: true,
      },
    });

    // Decrypt sensitive fields
    try {
      resultado.cpf = this.cpfEncryption.decrypt(resultado.cpf);
      resultado.telefone = this.phoneEncryption.decrypt(resultado.telefone);
    } catch (error) {
      console.error(`Failed to decrypt user data for ${usuarioId}:`, error);
      resultado.cpf = "[ENCRYPTED]";
      resultado.telefone = "[ENCRYPTED]";
    }

    await this.cacheService.invalidarPerfil(usuarioId);
    return resultado;
  }
}
