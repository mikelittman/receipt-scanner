import { executeQuery } from "@/lib/engine/query";
import { z } from "zod";

const QueryRequest = z.object({
  query: z.string(),
});

export async function POST(request: Request) {
  const body = await request.json();
  const { query } = QueryRequest.parse(body);

  const response = await executeQuery(query);

  return Response.json(response);
}
