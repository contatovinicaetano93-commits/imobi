import { Injectable } from "@nestjs/common";
import { createHash } from "crypto";
import { EncryptionService } from "./encryption.service";

/**
 * CPF Encryption Service
 * Handles secure storage and lookup of CPF (Brazilian Tax ID)
 * 
 * Strategy:
 * - Stores encrypted CPF in 'cpf' field for security
 * - Stores SHA-256 hash in 'cpfHash' field for lookups (hash is one-way)
 * - Allows efficient database queries without exposing plaintext
 */
@Injectable()
export class CpfEncryptionService {
  constructor(private readonly encryption: EncryptionService) {}

  /**
   * Encrypts CPF and returns both encrypted value and hash
   * @param cpfPlaintext Raw CPF string (with or without formatting)
   * @returns Object with encrypted CPF and its hash
   */
  encryptAndHash(cpfPlaintext: string): { cpfEncrypted: string; cpfHash: string } {
    // Normalize: remove formatting
    const cpfNormalized = this.normalizeCpf(cpfPlaintext);
    
    // Encrypt the CPF
    const cpfEncrypted = this.encryption.encrypt(cpfNormalized);
    
    // Hash for lookups
    const cpfHash = this.hashCpf(cpfNormalized);
    
    return { cpfEncrypted, cpfHash };
  }

  /**
   * Decrypts a CPF from database
   * @param cpfEncrypted Encrypted CPF from database
   * @returns Decrypted CPF
   */
  decrypt(cpfEncrypted: string): string {
    return this.encryption.decrypt(cpfEncrypted);
  }

  /**
   * Validates a plaintext CPF against the stored hash
   * Useful for: password reset flows, duplicate checking, verification
   */
  validateAgainstHash(cpfPlaintext: string, cpfHash: string): boolean {
    const cpfNormalized = this.normalizeCpf(cpfPlaintext);
    const computedHash = this.hashCpf(cpfNormalized);
    return computedHash === cpfHash;
  }

  /**
   * Generates the lookup hash (SHA-256)
   * Used to create cpfHash field in database
   */
  private hashCpf(cpfNormalized: string): string {
    return createHash("sha256").update(cpfNormalized).digest("hex");
  }

  /**
   * Normalizes CPF: removes formatting
   * Examples: "123.456.789-00" → "12345678900"
   */
  private normalizeCpf(cpf: string): string {
    return cpf.replace(/\D/g, "");
  }
}
