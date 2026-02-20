import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

let client: S3Client | null = null;

function getClient(): S3Client {
  if (client) return client;
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("R2 credentials not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY.");
  }
  client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  return client;
}

function bucket(): string {
  return process.env.R2_BUCKET_NAME || "llm-data-csv";
}

export async function uploadToR2(key: string, body: Buffer, contentType = "text/csv"): Promise<string> {
  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
  return `r2://${key}`;
}

export async function downloadFromR2(key: string): Promise<Buffer> {
  const res = await getClient().send(
    new GetObjectCommand({
      Bucket: bucket(),
      Key: key,
    }),
  );
  const stream = res.Body;
  if (!stream) throw new Error("Empty response from R2");
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export async function deleteFromR2(key: string): Promise<void> {
  await getClient().send(
    new DeleteObjectCommand({
      Bucket: bucket(),
      Key: key,
    }),
  );
}

export function isR2Path(filePath: string): boolean {
  return filePath.startsWith("r2://");
}

export function r2KeyFromPath(filePath: string): string {
  return filePath.replace(/^r2:\/\//, "");
}
