import {
  type AnalyzeDocumentRequest,
  TextractClient,
  AnalyzeDocumentCommand,
  StartDocumentAnalysisCommand,
  StartDocumentAnalysisRequest,
  GetDocumentAnalysisCommand,
} from "@aws-sdk/client-textract";
import pRetry, { AbortError } from "p-retry";
import { getBucketName, getS3Client, uploadFile } from "../storage";
import { hashBuffer } from "../hash";

export function getTextractClient(): TextractClient {
  return new TextractClient({});
}

export async function analyzeDocument(
  client: TextractClient,
  document: Buffer
) {
  const input: AnalyzeDocumentRequest = {
    Document: {
      Bytes: document,
    },
    FeatureTypes: ["TABLES", "FORMS"],
  };
  return client.send(new AnalyzeDocumentCommand(input));
}

export async function documentAnalysisWrapper(
  client: TextractClient,
  document: Buffer
) {
  const hash = hashBuffer(document);
  const sourceKey = `raw/document-${hash}.pdf`;
  const destKey = `analysis/document-${hash}/analysis.json`;
  await uploadFile(getS3Client(), sourceKey, document);

  const bucket = getBucketName();
  const input: StartDocumentAnalysisRequest = {
    DocumentLocation: {
      S3Object: {
        Bucket: bucket,
        Name: sourceKey,
      },
    },
    FeatureTypes: ["TABLES", "FORMS"],
    OutputConfig: {
      S3Bucket: bucket,
      S3Prefix: destKey,
    },
  };

  const { JobId } = await client.send(new StartDocumentAnalysisCommand(input));
  if (!JobId) {
    throw new Error("Failed to start document analysis");
  }

  // use pRetry to check the status of the job
  return pRetry(
    async () => {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const { JobStatus, ...Result } = await client.send(
        new GetDocumentAnalysisCommand({ JobId })
      );

      if (!JobStatus) {
        throw new Error("Failed to get job status");
      }

      if (JobStatus === "SUCCEEDED") {
        return Result;
      }

      if (JobStatus === "FAILED") {
        throw new AbortError("Job failed");
      }

      throw new Error("Job not yet complete");
    },
    {
      retries: 10,
      onFailedAttempt: (error) => {
        console.error("Failed attempt", error);
      },
    }
  );
}
