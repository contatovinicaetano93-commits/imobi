import { Injectable } from "@nestjs/common";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import * as crypto from "crypto";

@Injectable()
export class StorageService {
  private readonly s3 = new S3Client({ region: process.env["AWS_S3_REGION"] ?? process.env["AWS_REGION"] });
  private readonly bucket = process.env["AWS_S3_BUCKET"] as string;

  /** URL assinada para upload direto do cliente — evita passar o arquivo pela API. */
  async urlDeUpload(prefixo: string, contentType: string) {
    const key = `${prefixo}/${crypto.randomUUID()}`;
    const command = new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType });
    // Skew de versão entre pacotes @aws-sdk num monorepo pnpm — clientes compatíveis em runtime.
    const uploadUrl = await getSignedUrl(this.s3 as never, command, { expiresIn: 300 });
    const fileUrl = `https://${this.bucket}.s3.amazonaws.com/${key}`;
    return { uploadUrl, fileUrl };
  }
}
