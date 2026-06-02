import { Injectable, Logger } from "@nestjs/common";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3 = new S3Client({
    region: process.env["AWS_REGION"] ?? "us-east-1",
    credentials: {
      accessKeyId: process.env["AWS_ACCESS_KEY_ID"] ?? "",
      secretAccessKey: process.env["AWS_SECRET_ACCESS_KEY"] ?? "",
    },
  });

  private readonly bucket = process.env["S3_BUCKET"] ?? "imbobi-evidencias";

  constructor() {
    this.logger.log(
      `Storage service initialized with bucket: ${this.bucket}`,
    );
  }

  async upload(buffer: Buffer, mimeType: string, etapaId: string) {
    const key = `evidencias/${etapaId}/${randomUUID()}`;
    try {
      this.logger.debug(
        `Uploading file to S3: etapaId=${etapaId}, size=${buffer.length} bytes, type=${mimeType}`,
      );
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
      this.logger.log(
        `File uploaded successfully: key=${key}, size=${buffer.length} bytes`,
      );
      return { url, key };
    } catch (error) {
      this.logger.error(
        `Failed to upload file to S3: etapaId=${etapaId}`,
        error,
      );
      throw error;
    }
  }

  async getSignedUrl(key: string, expiresIn = 3600) {
    return getSignedUrl(
      this.s3,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn },
    );
  }

  async delete(key: string) {
    try {
      this.logger.debug(`Deleting file from S3: key=${key}`);
      await this.s3.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      this.logger.log(`File deleted successfully: key=${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete file from S3: key=${key}`, error);
      throw error;
    }
  }
}
