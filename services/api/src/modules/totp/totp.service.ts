import { Injectable, BadRequestException, UnauthorizedException, Logger } from "@nestjs/common";
import * as crypto from "crypto";
import * as bcrypt from "bcryptjs";
import { generateSecret, generateURI, verifySync } from "otplib";
import * as QRCode from "qrcode";
import { PrismaService } from "../prisma/prisma.service";

const ALGORITHM = "aes-256-gcm";
const BACKUP_CODE_COUNT = 8;

function getEncKey(): Buffer {
  const raw = process.env["TOTP_ENCRYPTION_KEY"];
  if (!raw || raw.length < 32) throw new Error("TOTP_ENCRYPTION_KEY must be at least 32 characters");
  // SHA-256 the key to always produce exactly 32 bytes regardless of multibyte UTF-8 characters
  return crypto.createHash("sha256").update(raw).digest();
}

function encryptSecret(secret: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncKey(), iv);
  const enc = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${enc.toString("hex")}`;
}

function decryptSecret(encrypted: string): string {
  const [ivHex, tagHex, encHex] = encrypted.split(":");
  const decipher = crypto.createDecipheriv(ALGORITHM, getEncKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return decipher.update(Buffer.from(encHex, "hex"), undefined, "utf8") + decipher.final("utf8");
}

@Injectable()
export class TotpService {
  private readonly logger = new Logger(TotpService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Passo 1: gera secret + QR code. Não ativa o TOTP ainda. */
  async configurar(usuarioId: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { usuarioId },
      select: { email: true },
    });
    if (!usuario) throw new BadRequestException("Usuário não encontrado.");

    const secret = generateSecret();
    const otpAuthUrl = generateURI({ issuer: "IMOBI SaaS", label: usuario.email, secret });
    const qrCodeUrl = await QRCode.toDataURL(otpAuthUrl);

    const encrypted = encryptSecret(secret);
    await this.prisma.usuarioTotp.upsert({
      where: { usuarioId },
      create: { usuarioId, secretCrypto: encrypted, ativo: false, backupCodes: [] },
      update: { secretCrypto: encrypted, ativo: false, backupCodes: [], ativadoEm: null },
    });

    return { otpAuthUrl, qrCodeUrl };
  }

  /** Passo 2: verifica OTP e ativa o TOTP. Retorna backup codes (exibir uma vez). */
  async ativar(usuarioId: string, otp: string): Promise<{ backupCodes: string[] }> {
    const record = await this.prisma.usuarioTotp.findUnique({ where: { usuarioId } });
    if (!record) throw new BadRequestException("Configure o TOTP antes de ativar.");
    if (record.ativo) throw new BadRequestException("TOTP já está ativo.");

    const secret = decryptSecret(record.secretCrypto);
    const result = verifySync({ token: otp, secret });
    if (!result.valid) throw new UnauthorizedException("Código OTP inválido.");

    // 8 bytes = 16 hex chars ≈ 48 bits of entropy per backup code
    const rawCodes = Array.from({ length: BACKUP_CODE_COUNT }, () =>
      crypto.randomBytes(8).toString("hex")
    );
    const hashedCodes = await Promise.all(rawCodes.map((c) => bcrypt.hash(c, 10)));

    await this.prisma.usuarioTotp.update({
      where: { usuarioId },
      data: { ativo: true, ativadoEm: new Date(), backupCodes: hashedCodes },
    });

    this.logger.log(`TOTP ativado para usuário ${usuarioId}`);
    return { backupCodes: rawCodes };
  }

  /** Verifica OTP durante o login. Aceita OTP normal ou código de backup. */
  async verificar(usuarioId: string, otp: string): Promise<boolean> {
    const record = await this.prisma.usuarioTotp.findUnique({ where: { usuarioId } });
    if (!record || !record.ativo) return true; // sem TOTP = pass-through

    const secret = decryptSecret(record.secretCrypto);
    const result = verifySync({ token: otp, secret });
    if (result.valid) return true;

    // Tenta backup code
    for (let i = 0; i < record.backupCodes.length; i++) {
      const match = await bcrypt.compare(otp, record.backupCodes[i]);
      if (match) {
        const newCodes = record.backupCodes.filter((_, idx) => idx !== i);
        await this.prisma.usuarioTotp.update({
          where: { usuarioId },
          data: { backupCodes: newCodes },
        });
        this.logger.warn(`TOTP backup code used for usuário ${usuarioId} — ${newCodes.length} remaining`);
        return true;
      }
    }
    return false;
  }

  async estaAtivo(usuarioId: string): Promise<boolean> {
    const record = await this.prisma.usuarioTotp.findUnique({
      where: { usuarioId },
      select: { ativo: true },
    });
    return record?.ativo ?? false;
  }

  async desativar(usuarioId: string, otp: string) {
    const ok = await this.verificar(usuarioId, otp);
    if (!ok) throw new UnauthorizedException("Código OTP inválido.");
    await this.prisma.usuarioTotp.update({
      where: { usuarioId },
      data: { ativo: false, backupCodes: [], ativadoEm: null },
    });
    this.logger.log(`TOTP desativado para usuário ${usuarioId}`);
    return { ok: true };
  }
}
