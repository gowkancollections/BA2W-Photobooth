import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  type PutObjectCommandInput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function getEnvOrThrow(key: string) {
  const val = process.env[key];
  if (!val) {
    throw new Error(
      `${key} tidak tersedia — pastikan R2 client hanya dipakai di server`,
    );
  }
  return val;
}

export function createR2Client() {
  const accountId = getEnvOrThrow("R2_ACCOUNT_ID");
  const accessKeyId = getEnvOrThrow("R2_ACCESS_KEY_ID");
  const secretAccessKey = getEnvOrThrow("R2_SECRET_ACCESS_KEY");
  const endpoint = getEnvOrThrow("R2_ENDPOINT");

  return new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

let singleton: S3Client | null = null;

export function getR2() {
  if (!singleton) singleton = createR2Client();
  return singleton;
}

export function getR2Bucket(): string {
  return getEnvOrThrow("R2_BUCKET_NAME");
}

export function getR2PublicUrl(): string {
  const base = process.env.R2_PUBLIC_URL;
  if (!base) return "";
  return base.replace(/\/$/, "");
}

export function r2PublicUrlFor(path: string): string {
  const base = getR2PublicUrl();
  if (!base) return "";
  const clean = path.replace(/^\//, "");
  return `${base}/${clean}`;
}

export interface PresignedPutUrlResult {
  url: string;
  key: string;
  bucket: string;
  publicUrl: string;
}

export async function generatePresignedPutUrl(
  relativeKey: string,
  contentType: string,
  expiresInSeconds: number = 600,
): Promise<PresignedPutUrlResult> {
  const r2 = getR2();
  const bucket = getR2Bucket();
  const key = relativeKey.replace(/^\//, "");

  const params: PutObjectCommandInput = {
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  };

  const command = new PutObjectCommand(params);
  const url = await getSignedUrl(r2, command, { expiresIn: expiresInSeconds });

  return {
    url,
    key,
    bucket,
    publicUrl: r2PublicUrlFor(key),
  };
}

export async function deleteR2Object(relativeKey: string): Promise<void> {
  const r2 = getR2();
  const bucket = getR2Bucket();
  const key = relativeKey.replace(/^\//, "");
  await r2.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
