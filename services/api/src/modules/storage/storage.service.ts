import { Injectable } from "@nestjs/common";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

@Injectable()
export class StorageService {
  private readonly s3 = new S3Client({
    region: process.env["AWS_REGION"] ?? "us-east-1",
    credentials: {
      accessKeyId: process.env["AWS_ACCESS_KEY_ID"] ?? "",
      secretAccessKey: process.env["AWS_SECRET_ACCESS_KEY"] ?? "",
    },
  });

  private readonly bucket = process.env["S3_BUCKET"] ?? "imbobi-evidencias";

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
    return getSignedUrl(
      this.s3,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn }
    );
  }

  async getSignedUploadUrl(key: string, contentType: string, expiresIn = 3600) {
    return getSignedUrl(
      this.s3,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType,
        ServerSideEncryption: "AES256",
      }),
      { expiresIn }
    );
  }

  async delete(key: string) {
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
