import { BadRequestException, Injectable } from "@nestjs/common";
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import { mkdir, writeFile, readFile, unlink } from "fs/promises";
import path from "path";

const LOCAL_PREFIX = "local:";

function extFromMime(mimeType: string, filename?: string): string {
  const map: Record<string, string> = {
    "application/pdf": "pdf",
    "application/vnd.ms-excel": "xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  if (map[mimeType]) return map[mimeType];
  const fromName = filename?.match(/\.([a-z0-9]+)$/i)?.[1];
  return fromName?.toLowerCase() ?? mimeType.split("/")[1]?.split("+")[0] ?? "bin";
}

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
    return key.startsWith(LOCAL_PREFIX) || key.startsWith("local:kyc/");
  }

  assertStorageAvailable(): void {
    if (!this.useS3() && process.env.NODE_ENV === "production") {
      throw new BadRequestException(
        "Armazenamento de arquivos indisponível. Configure ENABLE_S3_STORAGE e credenciais AWS no servidor.",
      );
    }
  }

  async uploadKycDocument(buffer: Buffer, mimeType: string, usuarioId: string, tipo: string) {
    const ext = extFromMime(mimeType);
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
      return { url: key, key };
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
    const rel = key.startsWith("local:kyc/")
      ? key.slice("local:kyc/".length)
      : key.slice(LOCAL_PREFIX.length);
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

  async upload(buffer: Buffer, mimeType: string, scopeId: string) {
    const ext = extFromMime(mimeType);

    if (this.useS3()) {
      const key = `evidencias/${scopeId}/${randomUUID()}.${ext}`;
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: mimeType,
          ServerSideEncryption: "AES256",
        }),
      );
      return { url: key, key };
    }

    const relDir = path.join("evidencias", scopeId);
    const filename = `${randomUUID()}.${ext}`;
    const absDir = path.join(this.uploadRoot, relDir);
    await mkdir(absDir, { recursive: true });
    await writeFile(path.join(absDir, filename), buffer);
    const key = `${LOCAL_PREFIX}${relDir}/${filename}`.replace(/\\/g, "/");
    return { url: key, key };
  }

  async uploadDocumento(
    buffer: Buffer,
    mimeType: string,
    usuarioId: string,
    obraId?: string,
    originalName?: string,
  ) {
    const ext = extFromMime(mimeType, originalName);
    const scope = obraId ? `obras/${obraId}` : `usuarios/${usuarioId}`;
    const filename = `${randomUUID()}.${ext}`;

    if (this.useS3()) {
      const key = `documentos/${scope}/${filename}`;
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: mimeType,
          ServerSideEncryption: "AES256",
        }),
      );
      return { url: key, key };
    }

    const relDir = path.join("documentos", scope);
    const absDir = path.join(this.uploadRoot, relDir);
    await mkdir(absDir, { recursive: true });
    await writeFile(path.join(absDir, filename), buffer);
    const key = `${LOCAL_PREFIX}${relDir}/${filename}`.replace(/\\/g, "/");
    return { url: key, key };
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
    if (this.isLocalKey(key)) {
      const rel = key.startsWith("local:kyc/")
        ? key.slice("local:kyc/".length)
        : key.slice(LOCAL_PREFIX.length);
      await unlink(path.join(this.uploadRoot, rel)).catch(() => null);
      return;
    }
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
