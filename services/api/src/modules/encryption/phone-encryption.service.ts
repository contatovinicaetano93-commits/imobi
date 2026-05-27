import { Injectable } from "@nestjs/common";
import { EncryptionService } from "./encryption.service";

/**
 * Phone Number Encryption Service
 * Handles secure storage of telefone (Brazilian phone numbers)
 * 
 * Strategy:
 * - Encrypts phone numbers using AES-256-GCM
 * - Phone numbers are PII (Personally Identifiable Information)
 * - Never exposed in API responses unless explicitly requested by user
 */
@Injectable()
export class PhoneEncryptionService {
  constructor(private readonly encryption: EncryptionService) {}

  /**
   * Encrypts a phone number
   * @param phonePlaintext Raw phone number (with or without formatting)
   * @returns Encrypted phone number
   */
  encrypt(phonePlaintext: string): string {
    const phoneNormalized = this.normalizePhone(phonePlaintext);
    return this.encryption.encrypt(phoneNormalized);
  }

  /**
   * Decrypts a phone number from database
   * @param phoneEncrypted Encrypted phone from database
   * @returns Decrypted phone number in normalized format (only digits)
   */
  decrypt(phoneEncrypted: string): string {
    return this.encryption.decrypt(phoneEncrypted);
  }

  /**
   * Validates that encrypted phone is still valid (integrity check)
   * Useful for: periodic data validation, migration verification
   */
  isValid(phoneEncrypted: string): boolean {
    return this.encryption.isValid(phoneEncrypted);
  }

  /**
   * Normalizes phone: removes formatting
   * Examples: "(11) 98765-4321" → "11987654321"
   *           "11 98765-4321"  → "11987654321"
   */
  private normalizePhone(phone: string): string {
    return phone.replace(/\D/g, "");
  }
}
