import OpenAI from "openai";
import { receiptScannerTransaction } from "../db/client";
import { getScannedDocuments, storeScannedDocument } from "../db/store";
import { getTranslateClient, translateText } from "../language/translate";
import { logger } from "../logger";
import { analyzeDocument, getTextractClient } from "../ocr/textract";
import { Schema } from "../db/schema";
import {
  createEmbeddings,
  createJsonCompletion,
  getOpenAIClient,
} from "../ai/openai";
import pRetry from "p-retry";

export async function getDocumentText(hash: string, buffer: Buffer) {
  return receiptScannerTransaction(async (db) => {
    const documents = await getScannedDocuments(db, hash);
    if (documents.length > 0) {
      logger.debug({ hash }, "Document already scanned, using cache");
      return documents[0].text;
    }

    const textract = getTextractClient();
    const document = await analyzeDocument(textract, buffer);

    const document_text = (
      document.Blocks?.map((block) => block.Text)?.filter(
        (x): x is string => typeof x === "string"
      ) ?? []
    ).join("\n");

    await storeScannedDocument(db, {
      documentHash: hash,
      text: document_text,
    });

    logger.debug(
      { hash, metadata: document.$metadata },
      "Document scanned and stored"
    );

    return document_text;
  });
}

// todo: implement caching for translations
export async function getDocumentTranslations(hash: string, text: string) {
  const translate = getTranslateClient();
  const {
    translated: translatedText,
    sourceLanguage,
    targetLanguage,
  } = await translateText(translate, text);

  return { translatedText, sourceLanguage, targetLanguage };
}

async function _summarizeDocument(client: OpenAI, text: string) {
  return createJsonCompletion(
    client,
    Schema.Receipt.Record,
    "Summarize the receipt document and humanize the data (eg. remove + from text).",
    text
  );
}

export async function summarizeDocument(hash: string, text: string) {
  const client = getOpenAIClient();
  return pRetry(() => _summarizeDocument(client, text), {
    retries: 3,
    onFailedAttempt: (error) => {
      logger.debug({ error }, "Failed to summarize document");
    },
  });
}

export async function generateEmbeddings<T extends string[]>(sources: T) {
  const openai = getOpenAIClient();

  const results = await Promise.allSettled(
    sources.map((text) => createEmbeddings(openai, text))
  );

  return results.map((result, i) => {
    if (result.status === "fulfilled") {
      return result.value;
    } else {
      logger.error(
        { source: sources[i], result, i },
        "Failed to create embeddings"
      );
      throw result.reason;
    }
  });
}
