import { Injectable } from "@nestjs/common";
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import { mkdir, writeFile, readFile } from "fs/promises";
import path from "path";

const LOCAL_PREFIX = "local:kyc/";

@Injectable()
export class StorageService {
  private readonly s3 = new S3Client({
    region: process.env["AWS_REGION"] ?? process.env["AWS_S3_REGION"] ?? "us-east-1",
    credentials: {
      accessKeyId: process.env["AWS_ACCESS_KEY_ID"] ?? "",
      secretAccessKey: process.env["AWS_SECRET_ACCESS_KEY"] ?? "",
    },
  });

  private readonly bucket = process.env["AWS_S3_BUCKET"] ?? "imbobi-evidencias";
  private readonly uploadRoot = path.join(process.cwd(), "uploads");

  useS3(): boolean {
    return (
      process.env.ENABLE_S3_STORAGE === "true" &&
      !!process.env.AWS_ACCESS_KEY_ID?.trim() &&
      !!process.env.AWS_S3_BUCKET?.trim()
    );
  }

  isLocalKey(key: string): boolean {
    return key.startsWith(LOCAL_PREFIX);
  }

  async uploadKycDocument(buffer: Buffer, mimeType: string, usuarioId: string, tipo: string) {
    const ext = mimeType.split("/")[1]?.split("+")[0] ?? "jpg";
    const safeTipo = tipo.replace(/[^A-Z_]/gi, "");

    if (this.useS3()) {
      const key = `kyc/${usuarioId}/${safeTipo}/${randomUUID()}.${ext}`;
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: mimeType,
          ServerSideEncryption: "AES256",
        }),
      );
      const url = await this.getSignedUrl(key);
      return { url, key };
    }

    const relDir = path.join("kyc", usuarioId, safeTipo);
    const filename = `${randomUUID()}.${ext}`;
    const absDir = path.join(this.uploadRoot, relDir);
    await mkdir(absDir, { recursive: true });
    await writeFile(path.join(absDir, filename), buffer);
    const key = `${LOCAL_PREFIX}${relDir}/${filename}`.replace(/\\/g, "/");
    return { url: key, key };
  }

  async readLocalFile(key: string): Promise<{ buffer: Buffer; mimeType: string }> {
    if (!this.isLocalKey(key)) {
      throw new Error("Not a local storage key");
    }
    const rel = key.slice(LOCAL_PREFIX.length);
    const abs = path.join(this.uploadRoot, rel);
    const buffer = await readFile(abs);
    const ext = path.extname(abs).slice(1).toLowerCase();
    const mimeType =
      ext === "pdf" ? "application/pdf" :
      ext === "png" ? "image/png" :
      ext === "webp" ? "image/webp" :
      "image/jpeg";
    return { buffer, mimeType };
  }

  async uploadAvatar(buffer: Buffer, mimeType: string, usuarioId: string) {
    const ext = mimeType.split("/")[1]?.split("+")[0] ?? "jpg";
    const key = `avatars/${usuarioId}/${randomUUID()}.${ext}`;
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        ServerSideEncryption: "AES256",
      })
    );
    const url = await this.getSignedUrl(key);
    return { url, key };
  }

  async upload(buffer: Buffer, mimeType: string, etapaId: string) {
    const key = `evidencias/${etapaId}/${randomUUID()}`;
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        ServerSideEncryption: "AES256",
      })
    );
    const url = await this.getSignedUrl(key);
    return { url, key };
  }

  async getSignedUrl(key: string, expiresIn = 3600) {
    // AWS SDK tipos divergem entre client-s3 e s3-request-presigner no monorepo
    return getSignedUrl(
      this.s3 as never,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn },
    );
  }

  async delete(key: string) {
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
