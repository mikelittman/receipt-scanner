import {
  DescribeTextTranslationJobCommand,
  StartTextTranslationJobCommand,
  StartTextTranslationJobRequest,
  TranslateClient,
  TranslateTextCommand,
  TranslateTextRequest,
} from "@aws-sdk/client-translate";
import { hashBuffer } from "../hash";
import {
  getBucketName,
  getFileContents,
  getS3Client,
  uploadFile,
} from "../storage";
import pRetry, { AbortError } from "p-retry";

export function getTranslateClient(): TranslateClient {
  return new TranslateClient({});
}

export async function translateText(client: TranslateClient, text: string) {
  const input: TranslateTextRequest = {
    SourceLanguageCode: "auto",
    TargetLanguageCode: "en",
    Text: text,
  };
  const response = await client.send(new TranslateTextCommand(input));
  const translated = response.TranslatedText ?? text;
  return {
    sourceLanguage: response.SourceLanguageCode ?? "unknown",
    targetLanguage: response.TargetLanguageCode ?? "en",
    translated,
  };
}

export async function translateTextWrapper(
  client: TranslateClient,
  text: string
) {
  const buffer = Buffer.from(text);
  const hash = hashBuffer(buffer);
  const sourceFolder = `translations/text-${hash}/raw`;
  const sourceKey = `${sourceFolder}/text.txt`;
  const destFolder = `translations/text-${hash}/output`;
  const s3Client = getS3Client();
  await uploadFile(s3Client, sourceKey, buffer);

  const translateRoleArn = process.env.TRANSLATE_ROLE_ARN;

  if (!translateRoleArn) {
    throw new Error("TRANSLATE_ROLE_ARN environment variable not set");
  }

  const bucket = getBucketName();
  const input: StartTextTranslationJobRequest = {
    SourceLanguageCode: "auto",
    TargetLanguageCodes: ["en"],
    DataAccessRoleArn: translateRoleArn,
    InputDataConfig: {
      S3Uri: `s3://${bucket}/${sourceFolder}`,
      ContentType: "text/plain",
    },
    OutputDataConfig: {
      S3Uri: `s3://${bucket}/${destFolder}`,
    },
  };

  const { JobId } = await client.send(
    new StartTextTranslationJobCommand(input)
  );

  console.info("Started translation job", { JobId });

  if (!JobId) {
    throw new Error("Failed to start text translation");
  }

  // use pRetry to check the status of the job
  return pRetry(
    async () => {
      const { TextTranslationJobProperties } = await client.send(
        new DescribeTextTranslationJobCommand({ JobId })
      );
      switch (TextTranslationJobProperties?.JobStatus) {
        case "COMPLETED":
          return {
            sourceLanguage: "unknown",
            targetLanguage: "en",
            translated: await getFileContents(s3Client, destFolder),
          };
        case "FAILED":
          throw new AbortError("Text translation failed");
        default:
          throw new Error("Text translation not completed");
      }
    },
    {
      retries: 5,
      onFailedAttempt: (error) => {
        console.error("Failed attempt", error);
      },
    }
  );
}
