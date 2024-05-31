import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { sdkStreamMixin } from "@aws-sdk/util-stream-node";

export function getS3Client(): S3Client {
  return new S3Client({});
}

export function getBucketName() {
  return process.env.BUCKET_NAME ?? "receipt-scanner-analysis-bucket";
}

export async function uploadFile(client: S3Client, key: string, file: Buffer) {
  return client.send(
    new PutObjectCommand({
      Bucket: getBucketName(),
      Key: key,
      Body: file,
    })
  );
}

export async function getFileContents(
  client: S3Client,
  key: string
): Promise<string> {
  const response = await client.send(
    new GetObjectCommand({
      Bucket: getBucketName(),
      Key: key,
    })
  );
  return sdkStreamMixin(response.Body).transformToString();
}
