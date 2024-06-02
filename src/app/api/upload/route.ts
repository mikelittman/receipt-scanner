import { processDocumentIterator } from "@/lib/engine/process";

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

// https://developer.mozilla.org/docs/Web/API/ReadableStream#convert_async_iterator_to_stream
function iteratorToStream<T extends AsyncGenerator>(iterator: T) {
  return new ReadableStream({
    async pull(controller) {
      const { value, done } = await iterator.next();

      if (done) {
        controller.close();
      } else {
        controller.enqueue(Buffer.from(JSON.stringify(value)));
      }
    },
  });
}
