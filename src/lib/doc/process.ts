import { createHash } from "crypto";
import { readFile } from "fs/promises";
import { analyzeDocument, getTextractClient } from "../ocr/textract";
import {
  createEmbeddings,
  createJsonCompletion,
  getOpenAiClient,
} from "../ai/openai";
import { Schema } from "../db/schema";
import { logger } from "../logger";
import { getTranslateClient, translateText } from "../language/translate";
import pRetry from "p-retry";

export async function processDocument(path: string) {
  const buffer = await readFile(path);
  const hash = createHash("sha256").update(buffer).digest("hex");

  logger.debug({ path, hash }, "Processing document");

  const textract = getTextractClient();
  const document = await analyzeDocument(textract, buffer);

  logger.debug(document.$metadata, "Document analyzed");

  const document_text =
    document.Blocks?.map((block) => block.Text)?.filter(
      (x): x is string => typeof x === "string"
    ) ?? [];

  const translate = getTranslateClient();
  const { translated, sourceLanguage, targetLanguage } = await translateText(
    translate,
    document_text
  );

  logger.debug({ sourceLanguage, targetLanguage }, "Document translated");

  const openai = getOpenAiClient();
  const [source, target] = await Promise.all([
    createEmbeddings(openai, document_text),
    createEmbeddings(openai, translated),
  ]);

  logger.debug(
    { count: source.embeddings.length + target.embeddings.length },
    "Embeddings created"
  );

  const summarizeDoc = async () =>
    createJsonCompletion(
      openai,
      Schema.Receipt.Record,
      "Summarize the receipt document and humanize the data (eg. remove + from text).",
      translated.join("\n")
    );
  const record = await pRetry(summarizeDoc, {
    retries: 3,
    onFailedAttempt: (error) => {
      logger.debug({ error }, "Failed to summarize document");
    },
  });

  logger.debug({ record }, "Receipt record parsed");

  const receipt: Schema.Receipt.Entry = {
    documentHash: hash,
    languageCodes: [sourceLanguage, targetLanguage],
    receipt: record,
  };

  const embeddings: Schema.Receipt.Embedding = {
    documentHash: hash,
    languageCode: sourceLanguage,
    text: document_text,
    embeddings: source.embeddings,
  };

  return { receipt, embeddings };
}
