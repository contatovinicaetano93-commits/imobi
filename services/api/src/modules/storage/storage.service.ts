import { Injectable } from "@nestjs/common";
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

@Injectable()
export class StorageService {
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor() {
    const region = process.env["AWS_S3_REGION"] ?? process.env["AWS_REGION"] ?? "us-east-1";
    const accessKey = process.env["AWS_ACCESS_KEY_ID"];
    const secretKey = process.env["AWS_SECRET_ACCESS_KEY"];

    this.s3 = new S3Client({
      region,
      ...(accessKey && secretKey
        ? { credentials: { accessKeyId: accessKey, secretAccessKey: secretKey } }
        : {}),
    });
    this.bucket = process.env["AWS_S3_BUCKET"] ?? "imbobi-evidencias";
  }

  async upload(buffer: Buffer, mimeType: string, prefix: string) {
    const key = `evidencias/${prefix}/${randomUUID()}`;
    await this.putObject(key, buffer, mimeType);
    const url = await this.getSignedUrl(key);
    return { url, key };
  }

  async uploadKyc(buffer: Buffer, mimeType: string, usuarioId: string) {
    const key = `kyc/${usuarioId}/${randomUUID()}`;
    await this.putObject(key, buffer, mimeType);
    const url = await this.getSignedUrl(key);
    return { url, key };
  }

  private async putObject(key: string, buffer: Buffer, mimeType: string) {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        ServerSideEncryption: "AES256",
      }),
    );
  }

  async getSignedUrl(key: string, expiresIn = 3600) {
    if (key.startsWith("http://") || key.startsWith("https://")) return key;
    return getSignedUrl(
      this.s3 as Parameters<typeof getSignedUrl>[0],
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn },
    );
  }

  async delete(key: string) {
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
