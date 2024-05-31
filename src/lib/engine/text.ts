import OpenAI from "openai";
import { receiptScannerTransaction } from "../db/client";
import { getScannedDocuments, storeScannedDocument } from "../db/store";
import {
  getTranslateClient,
  translateText,
  translateTextWrapper,
} from "../language/translate";
import { logger } from "../logger";
import {
  analyzeDocument,
  documentAnalysisWrapper,
  getTextractClient,
} from "../ocr/textract";
import { Schema } from "../db/schema";
import {
  createEmbeddings,
  createJsonCompletion,
  getOpenAIClient,
} from "../ai/openai";
import pRetry from "p-retry";

async function resolveDocumentText(buffer: Buffer) {
  const textract = getTextractClient();

  let document;

  try {
    document = await analyzeDocument(textract, buffer);
  } catch {
    document = await documentAnalysisWrapper(textract, buffer);
  }

  return (
    document.Blocks?.map((block) => block.Text)?.filter(
      (x): x is string => typeof x === "string"
    ) ?? []
  ).join("\n");
}

export async function getDocumentText(hash: string, buffer: Buffer) {
  return receiptScannerTransaction(async (db) => {
    const documents = await getScannedDocuments(db, hash);
    if (documents.length > 0) {
      logger.debug({ hash }, "Document already scanned, using cache");
      return documents[0].text;
    }

    const document_text = await resolveDocumentText(buffer);

    await storeScannedDocument(db, {
      documentHash: hash,
      text: document_text,
    });

    logger.debug({ hash }, "Document scanned and stored");

    return document_text;
  });
}

function limitText(text: string, bytes: number) {
  const buffer = Buffer.from(text);
  if (buffer.length > bytes) {
    return buffer.subarray(0, bytes).toString("utf-8");
  }
  return text;
}

export async function resovleDocumentTranslations(text: string) {
  const client = getTranslateClient();
  try {
    return await translateText(client, text);
  } catch (error) {
    console.log(
      "Failed to translate text",
      error instanceof Error ? error.message : error
    );
    try {
      return await translateText(client, limitText(text, 10_000));
    } catch {
      // lets not get to here, this takes a few minutes to complete
      return await translateTextWrapper(client, text);
    }
  }
}

// todo: implement caching for translations
export async function getDocumentTranslations(hash: string, text: string) {
  const {
    translated: translatedText,
    sourceLanguage,
    targetLanguage,
  } = await resovleDocumentTranslations(text);

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
