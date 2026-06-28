import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import { mkdir, writeFile, readFile, unlink } from "fs/promises";
import path from "path";
import {
  CircuitBreakerService,
  RetryPolicyService,
  withTimeout,
} from "../../common/resilience";

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
  private readonly logger = new Logger(StorageService.name);
  private readonly s3Retry = new RetryPolicyService({
    name: "s3-storage",
    maxAttempts: 3,
    initialDelayMs: 200,
    maxDelayMs: 5000,
    multiplier: 2,
  });
  private readonly s3Circuit = new CircuitBreakerService({
    name: "s3-storage",
    failureThreshold: 5,
    resetTimeout: 60_000,
    monitorInterval: 10_000,
  });
  private readonly s3TimeoutMs = Number(process.env["S3_OPERATION_TIMEOUT_MS"] ?? 30_000);

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
    if (
      !this.useS3() &&
      process.env.NODE_ENV === "production" &&
      process.env["ENABLE_S3_STORAGE"] === "true"
    ) {
      throw new BadRequestException(
        "Armazenamento de arquivos indisponível. Configure as credenciais AWS no servidor.",
      );
    }
  }

  private async executeS3<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    try {
      return await this.s3Circuit.execute(() =>
        this.s3Retry.execute(() => withTimeout(fn(), this.s3TimeoutMs)),
      );
    } catch (error) {
      this.logger.error(`S3 ${operation} failed`, {
        error: error instanceof Error ? error.message : String(error),
        circuitState: this.s3Circuit.getState(),
      });
      throw error;
    }
  }

  async uploadKycDocument(buffer: Buffer, mimeType: string, usuarioId: string, tipo: string) {
    const ext = extFromMime(mimeType);
    const safeTipo = tipo.replace(/[^A-Z_]/gi, "");

    if (this.useS3()) {
      const key = `kyc/${usuarioId}/${safeTipo}/${randomUUID()}.${ext}`;
      await this.executeS3("uploadKycDocument", () =>
        this.s3.send(
          new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: buffer,
            ContentType: mimeType,
            ServerSideEncryption: "AES256",
          }),
        ),
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

  async readBuffer(key: string, fallbackMime?: string): Promise<{ buffer: Buffer; mimeType: string }> {
    if (this.isLocalKey(key)) {
      const local = await this.readLocalFile(key);
      return { buffer: local.buffer, mimeType: fallbackMime ?? local.mimeType };
    }
    const res = await this.executeS3("readBuffer", () =>
      this.s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: key })),
    );
    const body = res.Body;
    if (!body) throw new Error("Empty object body");
    const chunks: Uint8Array[] = [];
    for await (const chunk of body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    return {
      buffer: Buffer.concat(chunks),
      mimeType: fallbackMime ?? res.ContentType ?? "application/octet-stream",
    };
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
    await this.executeS3("uploadAvatar", () =>
      this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: mimeType,
          ServerSideEncryption: "AES256",
        }),
      ),
    );
    const url = await this.getSignedUrl(key);
    return { url, key };
  }

  async upload(buffer: Buffer, mimeType: string, scopeId: string) {
    const ext = extFromMime(mimeType);

    if (this.useS3()) {
      const key = `evidencias/${scopeId}/${randomUUID()}.${ext}`;
      await this.executeS3("upload", () =>
        this.s3.send(
          new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: buffer,
            ContentType: mimeType,
            ServerSideEncryption: "AES256",
          }),
        ),
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
      await this.executeS3("uploadDocumento", () =>
        this.s3.send(
          new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: buffer,
            ContentType: mimeType,
            ServerSideEncryption: "AES256",
          }),
        ),
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

  async uploadProposta(
    buffer: Buffer,
    mimeType: string,
    propostaId: string,
    itemId: string,
    originalName?: string,
  ) {
    const ext = extFromMime(mimeType, originalName);
    const safeItem = itemId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
    const filename = `${safeItem}-${randomUUID()}.${ext}`;

    if (this.useS3()) {
      const key = `propostas/${propostaId}/${filename}`;
      await this.executeS3("uploadProposta", () =>
        this.s3.send(
          new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: buffer,
            ContentType: mimeType,
            ServerSideEncryption: "AES256",
          }),
        ),
      );
      return { url: key, key };
    }

    const relDir = path.join("propostas", propostaId);
    const absDir = path.join(this.uploadRoot, relDir);
    await mkdir(absDir, { recursive: true });
    await writeFile(path.join(absDir, filename), buffer);
    const key = `${LOCAL_PREFIX}${relDir}/${filename}`.replace(/\\/g, "/");
    return { url: key, key };
  }

  async getSignedUrl(key: string, expiresIn = 3600) {
    // AWS SDK tipos divergem entre client-s3 e s3-request-presigner no monorepo
    return this.executeS3("getSignedUrl", () =>
      getSignedUrl(
        this.s3 as never,
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
        { expiresIn },
      ),
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
    await this.executeS3("delete", () =>
      this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key })),
    );
  }
}
