import OpenAI from "openai";
import { z } from "zod";
import { printNode, zodToTs } from "zod-to-ts";

function getConfig() {
  const { OPENAI_API_KEY } = process.env;

  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not defined");
  }

  return {
    OPENAI_API_KEY,
  };
}

export function getOpenAiClient(): OpenAI {
  const { OPENAI_API_KEY: apiKey } = getConfig();

  return new OpenAI({ apiKey });
}

export async function createEmbeddings(client: OpenAI, text: string[]) {
  const response = await client.embeddings.create({
    input: text,
    model: "text-embedding-3-small",
  });

  return { text, embeddings: response.data };
}

export async function createJsonCompletion<T extends z.ZodTypeAny>(
  client: OpenAI,
  desiredSchema: T,
  system: string,
  prompt: string
): Promise<z.infer<T>> {
  const { node } = zodToTs(desiredSchema);
  const schema = printNode(node);
  const system_content = `${system}\nYou output JSON matching the following schema:\n${schema}`;
  const completion = await client.chat.completions.create({
    model: "gpt-4o-2024-05-13",
    messages: [
      {
        role: "system",
        content: system_content,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    response_format: { type: "json_object" },
  });

  const content = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
  return desiredSchema.parse(content);
}
