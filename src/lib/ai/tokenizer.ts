import { getEncoding } from "js-tiktoken";

export async function tokenizeData(query: string) {
  const enc = getEncoding("gpt2");
  return enc.encode(query);
}
