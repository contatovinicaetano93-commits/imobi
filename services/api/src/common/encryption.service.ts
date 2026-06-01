import { Injectable } from "@nestjs/common";
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "crypto";

@Injectable()
export class EncryptionService {
  private readonly algorithm = "aes-256-gcm";
  private readonly encryptionKey: Buffer;

  constructor() {
    const masterKey = process.env.ENCRYPTION_KEY || "";
    const isProduction = process.env.NODE_ENV === "production";

    if (!masterKey || masterKey.length < 32) {
      const message =
        "ENCRYPTION_KEY not set or too short (must be 32+ bytes, base64 encoded).\n" +
        "Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"";

      if (isProduction) {
        throw new Error(
          "CRITICAL: " + message + "\nEncryption is required in production.",
        );
      }
      console.warn(
        "WARNING: " +
          message +
          "\nSensitive data is NOT encrypted in development.",
      );
    }

    this.encryptionKey = masterKey
      ? Buffer.from(masterKey, "base64").subarray(0, 32)
      : Buffer.alloc(32, 0);
  }

  encrypt(plaintext: string): string {
    if (!plaintext) return plaintext;

    const iv = randomBytes(12);
    const cipher = createCipheriv(this.algorithm, this.encryptionKey, iv);
    let encrypted = cipher.update(plaintext, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag();

    return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
  }

  decrypt(ciphertext: string): string {
    if (!ciphertext || !ciphertext.includes(":")) return ciphertext;

    try {
      const [ivHex, authTagHex, encrypted] = ciphertext.split(":");
      const iv = Buffer.from(ivHex, "hex");
      const authTag = Buffer.from(authTagHex, "hex");

      const decipher = createDecipheriv(this.algorithm, this.encryptionKey, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, "hex", "utf8");
      decrypted += decipher.final("utf8");
      return decrypted;
    } catch (error) {
      throw new Error(
        `Decryption failed: ${error instanceof Error ? error.message : "unknown error"}. Token may be corrupted or tampered with.`,
      );
    }
  }
}
