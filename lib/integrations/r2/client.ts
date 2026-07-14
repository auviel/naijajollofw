import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getR2Config, type R2Config } from "@/lib/integrations/r2/config";

let cachedClient: S3Client | null = null;
let cachedConfigKey: string | null = null;

function configCacheKey(config: R2Config): string {
  return `${config.accountId}:${config.bucketName}:${config.accessKeyId}`;
}

export function getR2Client(): S3Client {
  const config = getR2Config();
  const key = configCacheKey(config);
  if (cachedClient && cachedConfigKey === key) {
    return cachedClient;
  }

  cachedClient = new S3Client({
    region: "auto",
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
  cachedConfigKey = key;
  return cachedClient;
}

export async function putR2Object(input: {
  key: string;
  body: Buffer | Uint8Array;
  contentType: string;
  cacheControl?: string;
}): Promise<void> {
  const config = getR2Config();
  const client = getR2Client();
  await client.send(
    new PutObjectCommand({
      Bucket: config.bucketName,
      Key: input.key,
      Body: input.body,
      ContentType: input.contentType,
      CacheControl:
        input.cacheControl ?? "public, max-age=31536000, immutable",
    }),
  );
}

export async function deleteR2Object(key: string): Promise<void> {
  const config = getR2Config();
  const client = getR2Client();
  await client.send(
    new DeleteObjectCommand({
      Bucket: config.bucketName,
      Key: key,
    }),
  );
}
