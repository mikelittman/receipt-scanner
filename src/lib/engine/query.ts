import { z } from "zod";
import {
  createCompletion,
  createEmbeddings,
  createJsonCompletion,
  getOpenAIClient,
} from "../ai/openai";
import { tokenizeData } from "../ai/tokenizer";
import { receiptScannerTransaction } from "../db/client";
import { queryReceiptEmbeddings } from "../db/store";
import { flatJson } from "../json/flat";
import pRetry from "p-retry";

async function generateQueryMessage(
  query: string,
  tokenBudget = 128_000
): Promise<string> {
  const openai = getOpenAIClient();
  const results = await receiptScannerTransaction(async (db) => {
    const { embeddings } = await createEmbeddings(openai, query);
    const [{ embedding }] = embeddings;
    return queryReceiptEmbeddings(db, embedding);
  });

  let prompt = [
    "Use the below receipts to answer the subsequent question. If the answer cannot be found in the receipts, please respond with 'I cannot find the answer'.",
    `\n\nQuestion: ${query}`,
  ];
  for (const result of results ?? []) {
    const page = `\n\n${flatJson({
      documentNames: result.documentNames.map((doc) => doc.name),
      ...result.receipt,
    })}\n\n`;
    const tokens = await tokenizeData([...prompt, page].join(""));
    if (tokens.length > tokenBudget) {
      break;
    }

    prompt.push(page);
  }

  return prompt.join("");
}

export const QueryResponseShape = z.object({
  response: z.string(),
  contentType: z.enum(["text/plain", "text/markdown", "text/html"]),
});

export async function executeQuery(query: string) {
  const message = await generateQueryMessage(query);

  const openai = getOpenAIClient();

  const result = await pRetry(
    () =>
      createJsonCompletion(
        openai,
        QueryResponseShape,
        "You answer questions about the receipts provided. Responses preferred in markdown format. contentType is in reference to the response content encoding, prefer markdown.",
        message
      ),
    {
      retries: 3,
      onFailedAttempt: (error) => {
        console.error(
          "Failed to execute query, attempt",
          error.attemptNumber,
          "retrying"
        );
      },
    }
  );

  return result;
}

export type ExecuteQueryState =
  | { type: "processing"; message: string }
  | { type: "delta"; delta: string; contentType: string }
  | { type: "done" };

export async function* executeQueryIterator(
  query: string
): AsyncGenerator<ExecuteQueryState, void, ExecuteQueryState> {
  yield { type: "processing", message: "Generating query message..." };
  const message = await generateQueryMessage(query);

  yield { type: "processing", message: "Executing query..." };
  const openai = getOpenAIClient();

  const prompt = `You answer questions about the receipts provided. Responses should be in markdown format.`;

  const stream = await createCompletion(openai, prompt, message);

  let sentFirstMessage = false;

  for await (const message of stream) {
    if (!sentFirstMessage) {
      sentFirstMessage = true;
      yield {
        type: "processing",
        message: "",
      };
    }

    for (const choice of message.choices) {
      if (!choice.delta.content) {
        continue;
      }

      yield {
        type: "delta",
        delta: choice.delta.content,
        contentType: "text/markdown",
      };
    }
  }

  yield { type: "done" };
}
