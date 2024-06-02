import { processDocumentIterator } from "@/lib/engine/process";
import { iteratorToStream } from "@/lib/stream";

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file") as File;
  const name = file.name;

  const buffer = await file.arrayBuffer();

  const processor = processDocumentIterator(name, Buffer.from(buffer));

  return new Response(iteratorToStream(processor), {
    headers: {
      "Content-Type": "application/json",
    },
  });
}
