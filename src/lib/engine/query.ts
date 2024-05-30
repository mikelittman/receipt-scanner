import { z } from "zod";
import {
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
    const page = `\n\nReceipt: ${flatJson(result.receipt)}\n\n`;
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
        "You answer questions about the receipts provided. Responses preferred in markdown format. contentType is in reference to the response content encoding.",
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
