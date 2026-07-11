import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import * as crypto from "crypto";

const s3 = new S3Client({ region: process.env.AWS_S3_REGION ?? process.env.AWS_REGION });
const bucket = process.env.AWS_S3_BUCKET as string;

export async function urlDeUpload(prefixo: string, contentType: string) {
  const key = `${prefixo}/${crypto.randomUUID()}`;
  const command = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType });
  const uploadUrl = await getSignedUrl(s3 as never, command, { expiresIn: 300 });
  const fileUrl = `https://${bucket}.s3.amazonaws.com/${key}`;
  return { uploadUrl, fileUrl };
}
