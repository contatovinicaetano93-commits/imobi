import { Injectable } from "@nestjs/common";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

/**
 * Service for AES-256-GCM encryption of sensitive data
 * Uses authenticated encryption (GCM) for integrity verification
 *
 * Fields that should be encrypted:
 * - CPF (tax ID)
 * - Phone number (telefone)
 * - Refresh tokens (refreshToken in SessaoToken)
 *
 * Note: Email is NOT encrypted because it's used for lookups
 */
@Injectable()
export class EncryptionService {
  private readonly algorithm = "aes-256-gcm";
  private readonly saltSize = 32;
  private readonly ivSize = 16;
  private readonly tagSize = 16;
  private readonly encryptionKey: Buffer;

  constructor() {
    const secret = process.env.ENCRYPTION_SECRET;
    if (!secret || secret.length < 32) {
      throw new Error(
        "ENCRYPTION_SECRET must be set in environment and be at least 32 characters"
      );
    }
    // Derive a proper key using scrypt
    this.encryptionKey = scryptSync(secret, "salt", 32);
  }

  /**
   * Encrypts data using AES-256-GCM
   * Format: salt(32) + iv(16) + ciphertext + authTag(16)
   */
  encrypt(plaintext: string): string {
    const salt = randomBytes(this.saltSize);
    const iv = randomBytes(this.ivSize);
    const cipher = createCipheriv(this.algorithm, this.encryptionKey, iv);

    let ciphertext = cipher.update(plaintext, "utf8", "hex");
    ciphertext += cipher.final("hex");

    const authTag = cipher.getAuthTag();

    // Combine all parts: salt + iv + ciphertext + authTag
    const encrypted = Buffer.concat([salt, iv, Buffer.from(ciphertext, "hex"), authTag]);
    return encrypted.toString("base64");
  }

  /**
   * Decrypts data encrypted with encrypt()
   */
  decrypt(encrypted: string): string {
    const buffer = Buffer.from(encrypted, "base64");

    // Extract parts
    const salt = buffer.subarray(0, this.saltSize);
    const iv = buffer.subarray(this.saltSize, this.saltSize + this.ivSize);
    const authTag = buffer.subarray(buffer.length - this.tagSize);
    const ciphertext = buffer.subarray(
      this.saltSize + this.ivSize,
      buffer.length - this.tagSize
    );

    const decipher = createDecipheriv(this.algorithm, this.encryptionKey, iv);
    decipher.setAuthTag(authTag);

    let plaintext = decipher.update(ciphertext);
    plaintext = Buffer.concat([plaintext, decipher.final()]);

    return plaintext.toString("utf8");
  }

  /**
   * Validates encrypted data integrity without decrypting
   * Returns true if the encrypted data is valid and authentic
   */
  isValid(encrypted: string): boolean {
    try {
      this.decrypt(encrypted);
      return true;
    } catch {
      return false;
    }
  }
}
