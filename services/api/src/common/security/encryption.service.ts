import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

/**
 * Encryption Service
 *
 * Provides AES-256-GCM encryption for sensitive data:
 * - PII (CPF, passports, documents)
 * - Financial data (account numbers, credit scores)
 * - Authentication data (passwords - should be hashed, not encrypted)
 *
 * Algorithm: AES-256-GCM (authenticated encryption)
 * - 256-bit key
 * - 96-bit IV (initialization vector)
 * - 128-bit authentication tag
 */
@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly encryptionKey: Buffer;

  constructor() {
    const keyString = process.env.ENCRYPTION_KEY;
    if (!keyString) {
      throw new Error('ENCRYPTION_KEY environment variable not set');
    }

    // Key should be 64 hex characters (32 bytes for AES-256)
    if (keyString.length !== 64) {
      throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
    }

    this.encryptionKey = Buffer.from(keyString, 'hex');
  }

  /**
   * Encrypt data
   * Returns: iv:authTag:encryptedData (all base64 encoded)
   */
  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(12); // 96-bit IV for GCM
    const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Format: IV:authTag:encryptedData (all hex)
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt data
   */
  decrypt(ciphertext: string): string {
    const parts = ciphertext.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid ciphertext format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Hash sensitive data (one-way, for search/matching)
   * Use for: emails, CPF, phone numbers (searchable but not readable)
   */
  hash(plaintext: string): string {
    return crypto
      .createHash('sha256')
      .update(plaintext + process.env.HASH_SALT)
      .digest('hex');
  }

  /**
   * Verify hashed data
   */
  verifyHash(plaintext: string, hash: string): boolean {
    return this.hash(plaintext) === hash;
  }

  /**
   * Generate 256-bit encryption key (for setup)
   */
  static generateKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}

/**
 * Database field encryption pattern
 *
 * For Prisma, use @db.String middleware to encrypt/decrypt transparently:
 *
 * Example schema:
 * model Usuario {
 *   id          String   @id
 *   email       String   @unique
 *   cpf         String   @db.Text  // Encrypted at rest
 *   nomeCompleto String  @db.Text  // Encrypted at rest
 * }
 *
 * Example middleware:
 * prisma.$use(async (params, next) => {
 *   if (params.model === 'Usuario' && params.action === 'create') {
 *     if (params.args.data.cpf) {
 *       params.args.data.cpf = encryptionService.encrypt(params.args.data.cpf);
 *     }
 *     if (params.args.data.nomeCompleto) {
 *       params.args.data.nomeCompleto = encryptionService.encrypt(params.args.data.nomeCompleto);
 *     }
 *   }
 *
 *   const result = await next(params);
 *
 *   if (params.model === 'Usuario' && ['findUnique', 'findFirst', 'findMany'].includes(params.action)) {
 *     if (result?.cpf) {
 *       result.cpf = encryptionService.decrypt(result.cpf);
 *     }
 *     if (result?.nomeCompleto) {
 *       result.nomeCompleto = encryptionService.decrypt(result.nomeCompleto);
 *     }
 *   }
 *
 *   return result;
 * });
 */
