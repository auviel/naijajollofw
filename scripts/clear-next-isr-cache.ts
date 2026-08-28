/**
 * Delete all objects in the OpenNext ISR R2 cache bucket.
 * Usage: tsx scripts/clear-next-isr-cache.ts
 */
import "dotenv/config";
import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import { getR2Config, isR2Configured } from "@/lib/integrations/r2/config";

async function main() {
  if (!isR2Configured()) {
    throw new Error("R2 is not configured.");
  }

  const { accountId, accessKeyId, secretAccessKey } = getR2Config();
  const bucket = process.env.NEXT_ISR_CACHE_BUCKET ?? "naijajollofw-next-cache";

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  let token: string | undefined;
  let deleted = 0;

  while (true) {
    const list = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        ContinuationToken: token,
      }),
    );
    const keys = (list.Contents ?? [])
      .map((object) => object.Key)
      .filter((key): key is string => Boolean(key))
      .map((Key) => ({ Key }));

    if (keys.length === 0) {
      break;
    }

    await client.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: { Objects: keys },
      }),
    );
    deleted += keys.length;

    if (!list.IsTruncated) {
      break;
    }
    token = list.NextContinuationToken;
  }

  console.log(`Deleted ${deleted} ISR cache object(s) from ${bucket}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
