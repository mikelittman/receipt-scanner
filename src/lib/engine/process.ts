import { createHash } from "crypto";
import { Schema } from "../db/schema";
import { logger } from "../logger";
import { receiptScannerTransaction } from "../db/client";
import { storeReceipt, storeReceiptEmbedding } from "../db/store";
import { flatJson } from "../json/flat";
import {
  generateEmbeddings,
  getDocumentText,
  getDocumentTranslations,
  summarizeDocument,
} from "./text";

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
  const documentText = await getDocumentText(hash, buffer);

  logger.debug({ hash, documentText }, "Document analyzed");

  yield { type: "processing", message: "Translating..." };
  const { translatedText, sourceLanguage, targetLanguage } =
    await getDocumentTranslations(hash, documentText);

  logger.debug({ hash, sourceLanguage, targetLanguage }, "Document translated");

  yield { type: "processing", message: "Summarizing..." };
  const receipt = await summarizeDocument(hash, translatedText);
  const receiptText = flatJson(receipt);

  logger.debug({ receipt }, "Receipt summarized");

  yield { type: "processing", message: "Generating embeddings..." };
  const [source, target, summarization] = await generateEmbeddings([
    documentText,
    translatedText,
    receiptText,
  ]);

  logger.debug(
    { count: source.embeddings.length + target.embeddings.length },
    "Embeddings created"
  );

  const entry: Schema.Receipt.Entry = {
    documentHash: hash,
    languageCodes: [sourceLanguage, targetLanguage],
    receipt,
  };

  const [
    {
      embeddings: [{ embedding: sourceEmbedding }],
    },
    {
      embeddings: [{ embedding: targetEmbedding }],
    },
    {
      embeddings: [{ embedding: summarizationEmbedding }],
    },
  ] = [source, target, summarization];

  const embeddings = (
    [
      [sourceLanguage, documentText, sourceEmbedding],
      [targetLanguage, translatedText, targetEmbedding],
      [targetLanguage, receiptText, summarizationEmbedding],
    ] as const
  ).map(([languageCode, text, embedding]) => ({
    documentHash: hash,
    type: "document",
    languageCode,
    text,
    embedding,
  }));

  yield { type: "processing", message: "Storing..." };
  const dbWrites = await receiptScannerTransaction(async (db) => {
    return Promise.all([
      storeReceipt(db, entry),
      ...embeddings.map((embedding) => storeReceiptEmbedding(db, embedding)),
    ]);
  });

  logger.debug({ writes: dbWrites.length }, "Receipt stored");

  yield {
    type: "data",
    data: { entry },
  };
}
