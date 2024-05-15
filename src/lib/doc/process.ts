import { createHash } from "crypto";
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
import { receiptScannerTransaction } from "../db/client";
import { storeReceipt, storeReceiptEmbedding } from "../store";

export async function processDocument(buffer: Buffer) {
  const hash = createHash("sha256").update(buffer).digest("hex");

  logger.debug({ hash }, "Processing document");

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

export type ProcessDocumentState =
  | { type: "processing"; message?: string }
  | {
      type: "data";
      data: {
        entry: Schema.Receipt.Entry;
      };
    };

export async function* processDocumentIterator(
  buffer: Buffer
): AsyncGenerator<ProcessDocumentState, void, ProcessDocumentState> {
  const hash = createHash("sha256").update(buffer).digest("hex");

  logger.debug({ hash }, "Processing document");

  yield { type: "processing", message: "Analyzing..." };
  const textract = getTextractClient();
  const document = await analyzeDocument(textract, buffer);

  logger.debug(document.$metadata, "Document analyzed");

  const document_text =
    document.Blocks?.map((block) => block.Text)?.filter(
      (x): x is string => typeof x === "string"
    ) ?? [];

  yield { type: "processing", message: "Translating..." };
  const translate = getTranslateClient();
  const { translated, sourceLanguage, targetLanguage } = await translateText(
    translate,
    document_text
  );

  logger.debug({ sourceLanguage, targetLanguage }, "Document translated");

  yield { type: "processing", message: "Generating embeddings..." };
  const openai = getOpenAiClient();
  const [source, target] = await Promise.all([
    createEmbeddings(openai, document_text),
    createEmbeddings(openai, translated),
  ]);

  logger.debug(
    { count: source.embeddings.length + target.embeddings.length },
    "Embeddings created"
  );

  yield { type: "processing", message: "Summarizing..." };
  const summarizeDoc = async () =>
    createJsonCompletion(
      openai,
      Schema.Receipt.Record,
      "Summarize the receipt document and humanize the data (eg. remove + from text).",
      translated.join("\n")
    );
  const receipt = await pRetry(summarizeDoc, {
    retries: 3,
    onFailedAttempt: (error) => {
      logger.debug({ error }, "Failed to summarize document");
    },
  });

  logger.debug({ record: receipt }, "Receipt record parsed");

  const entry: Schema.Receipt.Entry = {
    documentHash: hash,
    languageCodes: [sourceLanguage, targetLanguage],
    receipt,
  };

  const source_embeddings: Schema.Receipt.Embedding = {
    documentHash: hash,
    languageCode: sourceLanguage,
    text: document_text,
    embeddings: source.embeddings,
  };

  const target_embeddings: Schema.Receipt.Embedding = {
    documentHash: hash,
    languageCode: targetLanguage,
    text: translated,
    embeddings: target.embeddings,
  };

  yield { type: "processing", message: "Storing..." };
  const dbWrites = await receiptScannerTransaction(async (db) => {
    return Promise.all([
      storeReceipt(db, entry),
      storeReceiptEmbedding(db, source_embeddings),
      storeReceiptEmbedding(db, target_embeddings),
    ]);
  });

  logger.debug({ writes: dbWrites.length }, "Receipt stored");

  yield {
    type: "data",
    data: { entry },
  };
}
