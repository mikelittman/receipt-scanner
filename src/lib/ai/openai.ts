import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions.mjs";
import { z } from "zod";
import { printNode, zodToTs } from "zod-to-ts";
import { zodToJsonSchema } from "zod-to-json-schema";

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
    model: "gpt-4o",
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

type Tool<T extends z.ZodTypeAny> = {
  name: string;
  schema: T;
  handler: (params: z.infer<T>) => Promise<unknown>;
};

export async function createJsonCompletionWithFunctions<
  T extends z.ZodTypeAny,
  U extends z.ZodTypeAny
>(
  client: OpenAI,
  desiredSchema: T,
  tools: Tool<U>[],
  system: string,
  prompt: string
): Promise<z.infer<T>> {
  const { node } = zodToTs(desiredSchema);
  const schema = printNode(node);

  const system_content = `${system}\nYou output JSON matching the following schema:\n${schema}`;

  const messages: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: system_content,
    },
    {
      role: "user",
      content: prompt,
    },
  ];

  let completion = await client.chat.completions.create({
    model: "gpt-4o",
    messages,
    tools: tools.map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        parameters: zodToJsonSchema(tool.schema),
      },
    })),
    response_format: { type: "json_object" },
  });

  const message = completion.choices[0]?.message;
  if (message?.tool_calls) {
    messages.push(message);
    for (const call of message.tool_calls) {
      const tool = tools.find((tool) => tool.name === call.function.name);
      if (tool) {
        const params = tool.schema.parse(JSON.parse(call.function.arguments));
        const result = await tool.handler(params);
        messages.push({
          tool_call_id: call.id,
          role: "tool",
          content: JSON.stringify(result),
        });
      }
    }

    completion = await client.chat.completions.create({
      model: "gpt-4o",
      messages,
      response_format: { type: "json_object" },
    });
  }

  const content = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
  return desiredSchema.parse(content);
}
